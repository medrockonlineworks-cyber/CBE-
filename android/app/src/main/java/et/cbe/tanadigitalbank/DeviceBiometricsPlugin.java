package et.cbe.tanadigitalbank;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.concurrent.Executor;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "DeviceBiometrics")
public class DeviceBiometricsPlugin extends Plugin {

    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String PREFS_NAME = "cbe_biometric_keystore_prefs";
    private static final String KEY_ALIAS_PREFIX = "cbe_bio_key_";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_TAG_BITS = 128;

    private String sanitizeUserId(String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            return "default_user";
        }
        return userId.replaceAll("[^a-zA-Z0-9_\\-]", "_");
    }

    private SharedPreferences getPrefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private void deleteKeyAndBlob(Context context, String userId) {
        String safeId = sanitizeUserId(userId);
        getPrefs(context).edit()
            .remove("ct_" + safeId)
            .remove("iv_" + safeId)
            .remove("mode_" + safeId)
            .apply();

        try {
            KeyStore ks = KeyStore.getInstance(ANDROID_KEYSTORE);
            ks.load(null);
            String alias = KEY_ALIAS_PREFIX + safeId;
            if (ks.containsAlias(alias)) {
                ks.deleteEntry(alias);
            }
        } catch (Exception ignored) {
        }
    }

    private SecretKey createKey(String alias, boolean requireBiometricAuth) throws Exception {
        KeyStore ks = KeyStore.getInstance(ANDROID_KEYSTORE);
        ks.load(null);
        if (ks.containsAlias(alias)) {
            ks.deleteEntry(alias);
        }

        KeyGenerator keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);
        KeyGenParameterSpec.Builder builder = new KeyGenParameterSpec.Builder(
            alias,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setUserAuthenticationRequired(requireBiometricAuth);

        if (requireBiometricAuth && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            builder.setInvalidatedByBiometricEnrollment(true);
        }

        if (requireBiometricAuth && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            builder.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG);
        }

        keyGenerator.init(builder.build());
        return keyGenerator.generateKey();
    }

    private SecretKey getExistingKey(String alias) throws Exception {
        KeyStore ks = KeyStore.getInstance(ANDROID_KEYSTORE);
        ks.load(null);
        return (SecretKey) ks.getKey(alias, null);
    }

    @PluginMethod
    public void checkAvailability(PluginCall call) {
        FragmentActivity activity = getActivity();
        JSObject ret = new JSObject();
        ret.put("method", "fingerprint");

        if (activity == null) {
            ret.put("available", false);
            ret.put("enrolled", false);
            ret.put("hardwareStatus", "unavailable");
            ret.put("reason", "Activity unavailable.");
            call.resolve(ret);
            return;
        }

        BiometricManager bm = BiometricManager.from(activity);
        int strong = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG);
        int weak = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK);
        int status = (strong == BiometricManager.BIOMETRIC_SUCCESS) ? strong : weak;

        if (status == BiometricManager.BIOMETRIC_SUCCESS) {
            ret.put("available", true);
            ret.put("enrolled", true);
            ret.put("hardwareStatus", "available");
            ret.put("strongSupported", strong == BiometricManager.BIOMETRIC_SUCCESS);
        } else if (status == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED) {
            ret.put("available", false);
            ret.put("enrolled", false);
            ret.put("hardwareStatus", "not_enrolled");
            ret.put("reason", "No fingerprint or biometric credential is enrolled in your device settings.");
        } else if (status == BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE
                || status == BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED) {
            ret.put("available", false);
            ret.put("enrolled", false);
            ret.put("hardwareStatus", "no_hardware");
            ret.put("reason", "This device does not have biometric authentication hardware.");
        } else {
            ret.put("available", false);
            ret.put("enrolled", false);
            ret.put("hardwareStatus", "unavailable");
            ret.put("reason", "Biometric hardware is temporarily unavailable.");
        }

        call.resolve(ret);
    }

    @PluginMethod
    public void clearToken(PluginCall call) {
        FragmentActivity activity = getActivity();
        String userId = call.getString("userId", "default_user");
        if (activity != null) {
            deleteKeyAndBlob(activity, userId);
        }
        JSObject ret = new JSObject();
        ret.put("cleared", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void enrollAndStoreToken(PluginCall call) {
        final String token = call.getString("token", "");
        final String userId = sanitizeUserId(call.getString("userId", "default_user"));
        final String reason = call.getString("reason", "Authenticate to continue.");
        final FragmentActivity activity = getActivity();

        if (activity == null || token.isEmpty()) {
            JSObject ret = new JSObject();
            ret.put("verified", false);
            ret.put("errorCode", "INVALID_REQUEST");
            ret.put("error", "Missing device activity or credential token.");
            call.resolve(ret);
            return;
        }

        BiometricManager bm = BiometricManager.from(activity);
        boolean strongAvailable = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                == BiometricManager.BIOMETRIC_SUCCESS;
        boolean weakAvailable = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK)
                == BiometricManager.BIOMETRIC_SUCCESS;

        if (!strongAvailable && !weakAvailable) {
            int check = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK);
            JSObject ret = new JSObject();
            ret.put("verified", false);
            ret.put("unavailable", true);
            ret.put("errorCode", check == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED ? "NOT_ENROLLED" : "NO_HARDWARE");
            ret.put("method", "fingerprint");
            ret.put("error", check == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED
                ? "No fingerprint is enrolled in your device settings."
                : "Biometric authentication is not available on this device.");
            call.resolve(ret);
            return;
        }

        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                String alias = KEY_ALIAS_PREFIX + userId;
                SecretKey key = createKey(alias, strongAvailable);
                Cipher encryptCipher = Cipher.getInstance(TRANSFORMATION);
                encryptCipher.init(Cipher.ENCRYPT_MODE, key);

                Executor executor = ContextCompat.getMainExecutor(activity);
                BiometricPrompt prompt = new BiometricPrompt(
                    activity,
                    executor,
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                            super.onAuthenticationSucceeded(result);
                            try {
                                Cipher activeCipher = (result.getCryptoObject() != null && result.getCryptoObject().getCipher() != null)
                                    ? result.getCryptoObject().getCipher()
                                    : encryptCipher;
                                byte[] iv = activeCipher.getIV();
                                byte[] ciphertext = activeCipher.doFinal(token.getBytes(StandardCharsets.UTF_8));

                                getPrefs(activity).edit()
                                    .putString("ct_" + userId, Base64.encodeToString(ciphertext, Base64.NO_WRAP))
                                    .putString("iv_" + userId, Base64.encodeToString(iv, Base64.NO_WRAP))
                                    .putString("mode_" + userId, strongAvailable ? "strong" : "weak")
                                    .apply();

                                JSObject ret = new JSObject();
                                ret.put("verified", true);
                                ret.put("enrolled", true);
                                ret.put("method", "fingerprint");
                                call.resolve(ret);
                            } catch (Exception ex) {
                                deleteKeyAndBlob(activity, userId);
                                JSObject ret = new JSObject();
                                ret.put("verified", false);
                                ret.put("errorCode", "KEYSTORE_ERROR");
                                ret.put("method", "fingerprint");
                                ret.put("error", "Could not seal biometric credential securely.");
                                call.resolve(ret);
                            }
                        }

                        @Override
                        public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                            super.onAuthenticationError(errorCode, errString);
                            deleteKeyAndBlob(activity, userId);
                            resolveBiometricError(call, errorCode, errString);
                        }

                        @Override
                        public void onAuthenticationFailed() {
                            super.onAuthenticationFailed();
                        }
                    }
                );

                BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                    .setTitle("Unlock to use Mobile Banking")
                    .setSubtitle(reason)
                    .setDescription("Touch the fingerprint sensor")
                    .setNegativeButtonText("Cancel")
                    .setAllowedAuthenticators(strongAvailable
                        ? BiometricManager.Authenticators.BIOMETRIC_STRONG
                        : BiometricManager.Authenticators.BIOMETRIC_WEAK)
                    .build();

                if (strongAvailable) {
                    prompt.authenticate(promptInfo, new BiometricPrompt.CryptoObject(encryptCipher));
                } else {
                    prompt.authenticate(promptInfo);
                }
            } catch (Exception e) {
                deleteKeyAndBlob(activity, userId);
                JSObject ret = new JSObject();
                ret.put("verified", false);
                ret.put("unavailable", true);
                ret.put("errorCode", "KEYSTORE_ERROR");
                ret.put("method", "fingerprint");
                ret.put("error", e.getMessage() != null ? e.getMessage() : "Unable to initialize secure biometric storage.");
                call.resolve(ret);
            }
        });
    }

    @PluginMethod
    public void authenticateAndRetrieveToken(PluginCall call) {
        final String userId = sanitizeUserId(call.getString("userId", "default_user"));
        final String reason = call.getString("reason", "Authenticate to continue.");
        final boolean allowDeviceCredential = call.getBoolean("allowDeviceCredential", false);
        final FragmentActivity activity = getActivity();

        if (activity == null) {
            JSObject ret = new JSObject();
            ret.put("verified", false);
            ret.put("unavailable", true);
            ret.put("errorCode", "UNAVAILABLE");
            ret.put("method", "fingerprint");
            ret.put("error", "Activity unavailable.");
            call.resolve(ret);
            return;
        }

        SharedPreferences prefs = getPrefs(activity);
        String ctB64 = prefs.getString("ct_" + userId, null);
        String ivB64 = prefs.getString("iv_" + userId, null);
        String mode = prefs.getString("mode_" + userId, "strong");

        if (ctB64 == null || ivB64 == null) {
            JSObject ret = new JSObject();
            ret.put("verified", false);
            ret.put("errorCode", "NO_STORED_TOKEN");
            ret.put("method", "fingerprint");
            ret.put("error", "Biometric credential is not enrolled on this device. Please sign in with your PIN or password.");
            call.resolve(ret);
            return;
        }

        BiometricManager bm = BiometricManager.from(activity);
        int authMask = "strong".equals(mode)
            ? BiometricManager.Authenticators.BIOMETRIC_STRONG
            : BiometricManager.Authenticators.BIOMETRIC_WEAK;
        int canAuth = bm.canAuthenticate(authMask);
        if (canAuth != BiometricManager.BIOMETRIC_SUCCESS) {
            JSObject ret = new JSObject();
            ret.put("verified", false);
            ret.put("unavailable", true);
            ret.put("errorCode", canAuth == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED ? "NOT_ENROLLED" : "NO_HARDWARE");
            ret.put("method", "fingerprint");
            ret.put("error", canAuth == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED
                ? "No fingerprint is enrolled on this device. Please sign in with your PIN or password."
                : "Biometric hardware is not available.");
            call.resolve(ret);
            return;
        }

        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                String alias = KEY_ALIAS_PREFIX + userId;
                SecretKey key = getExistingKey(alias);
                if (key == null) {
                    deleteKeyAndBlob(activity, userId);
                    JSObject ret = new JSObject();
                    ret.put("verified", false);
                    ret.put("biometricChanged", true);
                    ret.put("errorCode", "BIOMETRIC_CHANGED");
                    ret.put("method", "fingerprint");
                    ret.put("error", "Biometric key unavailable or device biometrics changed. Please sign in with your PIN or password.");
                    call.resolve(ret);
                    return;
                }

                byte[] iv = Base64.decode(ivB64, Base64.NO_WRAP);
                byte[] ciphertext = Base64.decode(ctB64, Base64.NO_WRAP);
                Cipher decryptCipher = Cipher.getInstance(TRANSFORMATION);
                decryptCipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, iv));

                Executor executor = ContextCompat.getMainExecutor(activity);
                BiometricPrompt prompt = new BiometricPrompt(
                    activity,
                    executor,
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                            super.onAuthenticationSucceeded(result);
                            try {
                                Cipher activeCipher = (result.getCryptoObject() != null && result.getCryptoObject().getCipher() != null)
                                    ? result.getCryptoObject().getCipher()
                                    : decryptCipher;
                                byte[] plainBytes = activeCipher.doFinal(ciphertext);
                                String decryptedToken = new String(plainBytes, StandardCharsets.UTF_8);

                                JSObject ret = new JSObject();
                                ret.put("verified", true);
                                ret.put("token", decryptedToken);
                                ret.put("method", "fingerprint");
                                call.resolve(ret);
                            } catch (Exception ex) {
                                deleteKeyAndBlob(activity, userId);
                                JSObject ret = new JSObject();
                                ret.put("verified", false);
                                ret.put("biometricChanged", true);
                                ret.put("errorCode", "BIOMETRIC_CHANGED");
                                ret.put("method", "fingerprint");
                                ret.put("error", "Biometric key invalidated. Please sign in with your PIN or password.");
                                call.resolve(ret);
                            }
                        }

                        @Override
                        public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                            super.onAuthenticationError(errorCode, errString);
                            resolveBiometricError(call, errorCode, errString);
                        }

                        @Override
                        public void onAuthenticationFailed() {
                            super.onAuthenticationFailed();
                        }
                    }
                );

                BiometricPrompt.PromptInfo.Builder promptBuilder = new BiometricPrompt.PromptInfo.Builder()
                    .setTitle("Unlock to use Mobile Banking")
                    .setSubtitle(reason)
                    .setDescription("Touch the fingerprint sensor");

                if ("strong".equals(mode)) {
                    promptBuilder
                        .setNegativeButtonText("Cancel")
                        .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG);
                    prompt.authenticate(promptBuilder.build(), new BiometricPrompt.CryptoObject(decryptCipher));
                } else if (allowDeviceCredential) {
                    promptBuilder.setAllowedAuthenticators(
                        BiometricManager.Authenticators.BIOMETRIC_WEAK
                            | BiometricManager.Authenticators.DEVICE_CREDENTIAL
                    );
                    prompt.authenticate(promptBuilder.build());
                } else {
                    promptBuilder
                        .setNegativeButtonText("Cancel")
                        .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK);
                    prompt.authenticate(promptBuilder.build());
                }
            } catch (KeyPermanentlyInvalidatedException invalidated) {
                deleteKeyAndBlob(activity, userId);
                JSObject ret = new JSObject();
                ret.put("verified", false);
                ret.put("biometricChanged", true);
                ret.put("errorCode", "BIOMETRIC_CHANGED");
                ret.put("method", "fingerprint");
                ret.put("error", "Your device fingerprints changed. Please sign in with your PIN or password and re-enable biometric login.");
                call.resolve(ret);
            } catch (Exception e) {
                JSObject ret = new JSObject();
                ret.put("verified", false);
                ret.put("errorCode", "KEYSTORE_ERROR");
                ret.put("method", "fingerprint");
                ret.put("error", e.getMessage() != null ? e.getMessage() : "Biometric verification failed.");
                call.resolve(ret);
            }
        });
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        final String title = call.getString("title", "Unlock to use Mobile Banking");
        final String reason = call.getString("reason", "Authenticate to continue.");
        final String description = call.getString("description", "Touch the fingerprint sensor");
        final FragmentActivity activity = getActivity();

        if (activity == null) {
            JSObject ret = new JSObject();
            ret.put("verified", false);
            ret.put("unavailable", true);
            ret.put("errorCode", "NO_HARDWARE");
            ret.put("method", "fingerprint");
            ret.put("error", "Activity unavailable for biometric authentication.");
            call.resolve(ret);
            return;
        }

        BiometricManager biometricManager = BiometricManager.from(activity);
        int authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG
                | BiometricManager.Authenticators.BIOMETRIC_WEAK;
        int canAuth = biometricManager.canAuthenticate(authenticators);

        if (canAuth != BiometricManager.BIOMETRIC_SUCCESS) {
            JSObject ret = new JSObject();
            ret.put("verified", false);
            ret.put("unavailable", true);
            ret.put("errorCode", canAuth == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED ? "NOT_ENROLLED" : "NO_HARDWARE");
            ret.put("method", "fingerprint");
            ret.put("error", canAuth == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED
                ? "No fingerprint is enrolled on this device."
                : "Fingerprint authentication is not configured on this device.");
            call.resolve(ret);
            return;
        }

        new Handler(Looper.getMainLooper()).post(() -> {
            Executor executor = ContextCompat.getMainExecutor(activity);
            BiometricPrompt biometricPrompt = new BiometricPrompt(
                activity,
                executor,
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                        super.onAuthenticationSucceeded(result);
                        JSObject ret = new JSObject();
                        ret.put("verified", true);
                        ret.put("method", "fingerprint");
                        call.resolve(ret);
                    }

                    @Override
                    public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                        super.onAuthenticationError(errorCode, errString);
                        resolveBiometricError(call, errorCode, errString);
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        super.onAuthenticationFailed();
                    }
                }
            );

            BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setSubtitle(reason)
                .setDescription(description)
                .setNegativeButtonText("Cancel")
                .setAllowedAuthenticators(authenticators)
                .build();

            biometricPrompt.authenticate(promptInfo);
        });
    }

    private void resolveBiometricError(PluginCall call, int errorCode, @NonNull CharSequence errString) {
        boolean cancelled = errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON
                || errorCode == BiometricPrompt.ERROR_USER_CANCELED
                || errorCode == BiometricPrompt.ERROR_CANCELED;
        boolean lockout = errorCode == BiometricPrompt.ERROR_LOCKOUT
                || errorCode == BiometricPrompt.ERROR_LOCKOUT_PERMANENT;
        boolean notEnrolled = errorCode == BiometricPrompt.ERROR_NO_BIOMETRICS;
        boolean noHardware = errorCode == BiometricPrompt.ERROR_HW_NOT_PRESENT
                || errorCode == BiometricPrompt.ERROR_HW_UNAVAILABLE;

        JSObject ret = new JSObject();
        ret.put("verified", false);
        ret.put("cancelled", cancelled);
        ret.put("unavailable", notEnrolled || noHardware);
        ret.put("method", "fingerprint");

        if (cancelled) {
            ret.put("errorCode", "CANCELLED");
            ret.put("error", "Fingerprint verification was cancelled.");
        } else if (lockout) {
            ret.put("errorCode", "LOCKOUT");
            ret.put("error", "Too many failed attempts. Fingerprint sensor is locked—please use your PIN or password.");
        } else if (notEnrolled) {
            ret.put("errorCode", "NOT_ENROLLED");
            ret.put("error", "No fingerprint is enrolled on this device.");
        } else if (noHardware) {
            ret.put("errorCode", "NO_HARDWARE");
            ret.put("error", "Fingerprint hardware is unavailable.");
        } else {
            ret.put("errorCode", "AUTH_FAILED");
            ret.put("error", errString != null ? errString.toString() : "Fingerprint authentication failed.");
        }

        call.resolve(ret);
    }
}

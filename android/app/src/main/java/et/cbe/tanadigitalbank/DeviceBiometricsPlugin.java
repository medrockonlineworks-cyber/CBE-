package et.cbe.tanadigitalbank;

import android.os.Handler;
import android.os.Looper;
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
import java.util.concurrent.Executor;

@CapacitorPlugin(name = "DeviceBiometrics")
public class DeviceBiometricsPlugin extends Plugin {

    @PluginMethod
    public void authenticate(PluginCall call) {
        final String reason = call.getString("reason", "Use your fingerprint to sign in to CBE Mobile");
        final FragmentActivity activity = getActivity();

        if (activity == null) {
            JSObject ret = new JSObject();
            ret.put("verified", false);
            ret.put("unavailable", true);
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
            ret.put("method", "fingerprint");
            ret.put("error", "Fingerprint authentication is not configured on this device.");
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
                        boolean cancelled = errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON
                                || errorCode == BiometricPrompt.ERROR_USER_CANCELED
                                || errorCode == BiometricPrompt.ERROR_CANCELED;
                        JSObject ret = new JSObject();
                        ret.put("verified", false);
                        ret.put("cancelled", cancelled);
                        ret.put("method", "fingerprint");
                        ret.put("error", errString != null ? errString.toString() : "Fingerprint authentication cancelled.");
                        call.resolve(ret);
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        super.onAuthenticationFailed();
                        // System prompt handles retry feedback until verified or cancelled
                    }
                }
            );

            BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Unlock to use Mobile Banking")
                .setSubtitle(reason)
                .setNegativeButtonText("Cancel")
                .setAllowedAuthenticators(authenticators)
                .build();

            biometricPrompt.authenticate(promptInfo);
        });
    }
}

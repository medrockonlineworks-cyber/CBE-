package et.cbe.tanadigitalbank;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.CapConfig;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

/**
 * MainActivity
 * Enforces true edge-to-edge full-screen rendering on Android so the application
 * extends seamlessly under both the status bar and navigation bar, and strictly
 * isolates standalone sub-app flavors so CBE splash/UI never appears inside sub-apps.
 */
public class MainActivity extends BridgeActivity {

    public static void updateNavigationBarStyle(String hexColor, boolean isDarkBackground) {
        // Kept as a no-op compatibility hook for existing JS bridge calls;
        // navigation bar stays transparent edge-to-edge as in the original design.
    }

    private static String getFlavorBackgroundHex(String flavor) {
        if ("sms".equals(flavor)) return "#121212";
        if ("truecaller".equals(flavor)) return "#121316";
        if ("phone".equals(flavor)) return "#000000";
        return "#FFFFFF";
    }

    private String resolveFlavorForBoot() {
        String defaultFlavor = getDefaultFlavorStartView();
        if (BuildConfig.IS_STANDALONE_SUBAPP || (defaultFlavor != null && !defaultFlavor.isEmpty())) {
            return defaultFlavor != null && !defaultFlavor.isEmpty() ? defaultFlavor : "sms";
        }
        return null;
    }

    private CapConfig buildFlavorCapConfig() {
        try {
            JSONObject cfg = new JSONObject();
            try (InputStream is = getAssets().open("capacitor.config.json");
                 BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) {
                    sb.append(line).append('\n');
                }
                if (sb.length() > 0) {
                    cfg = new JSONObject(sb.toString());
                }
            } catch (Exception ignored) {
            }

            String standaloneFlavor = resolveFlavorForBoot();
            JSONObject androidObj = cfg.optJSONObject("android");
            if (androidObj == null) {
                androidObj = new JSONObject();
                cfg.put("android", androidObj);
            }
            JSONObject pluginsObj = cfg.optJSONObject("plugins");
            if (pluginsObj == null) {
                pluginsObj = new JSONObject();
                cfg.put("plugins", pluginsObj);
            }

            if (standaloneFlavor != null) {
                String bgHex = getFlavorBackgroundHex(standaloneFlavor);
                String existingUa = androidObj.optString("appendUserAgent", "").trim();
                String marker = "CBE_STANDALONE_FLAVOR/" + standaloneFlavor;
                androidObj.put("appendUserAgent", existingUa.isEmpty() ? marker : existingUa + " " + marker);
                androidObj.put("backgroundColor", bgHex);

                // Never hold a splash screen overlay or show CBE colors on standalone sub-apps
                JSONObject splashObj = pluginsObj.optJSONObject("SplashScreen");
                if (splashObj == null) {
                    splashObj = new JSONObject();
                    pluginsObj.put("SplashScreen", splashObj);
                }
                splashObj.put("launchShowDuration", 0);
                splashObj.put("launchAutoHide", true);
                splashObj.put("backgroundColor", bgHex);

                JSONObject navObj = pluginsObj.optJSONObject("NavigationBar");
                if (navObj == null) {
                    navObj = new JSONObject();
                    pluginsObj.put("NavigationBar", navObj);
                }
                navObj.put("color", bgHex);
                navObj.put("darkButtons", false);

                JSONObject notifObj = pluginsObj.optJSONObject("LocalNotifications");
                if (notifObj == null) {
                    notifObj = new JSONObject();
                    pluginsObj.put("LocalNotifications", notifObj);
                }
                if ("sms".equals(standaloneFlavor)) {
                    notifObj.put("smallIcon", "ic_stat_sms");
                    notifObj.put("iconColor", "#1A73E8");
                } else if ("truecaller".equals(standaloneFlavor)) {
                    notifObj.put("smallIcon", "ic_stat_truecaller");
                    notifObj.put("iconColor", "#0066FF");
                } else if ("phone".equals(standaloneFlavor)) {
                    notifObj.put("smallIcon", "ic_stat_phone");
                    notifObj.put("iconColor", "#16A34A");
                }
            } else {
                String existingUa = androidObj.optString("appendUserAgent", "").trim();
                StringBuilder marker = new StringBuilder("CBE_MAIN_FLAVOR/cbe");
                try {
                    android.content.Intent launchIntent = getIntent();
                    if (launchIntent != null) {
                        String extraView = launchIntent.getStringExtra(EXTRA_SUBAPP_VIEW);
                        if (extraView != null) {
                            String clean = extraView.trim().toLowerCase();
                            if ("sms".equals(clean) || "truecaller".equals(clean) || "phone".equals(clean)) {
                                marker.append(" CBE_LAUNCH_VIEW/").append(clean);
                                String bgHex = getFlavorBackgroundHex(clean);
                                androidObj.put("backgroundColor", bgHex);
                                JSONObject splashObj = pluginsObj.optJSONObject("SplashScreen");
                                if (splashObj != null) {
                                    splashObj.put("launchShowDuration", 0);
                                    splashObj.put("backgroundColor", bgHex);
                                }
                            }
                        }
                    }
                } catch (Exception ignored) {
                }
                androidObj.put("appendUserAgent", existingUa.isEmpty() ? marker.toString() : existingUa + " " + marker);
            }

            return new CapConfig(getAssets(), cfg);
        } catch (Exception ignored) {
            return null;
        }
    }

    @Override
    protected void load() {
        CapConfig customConfig = buildFlavorCapConfig();
        if (customConfig != null) {
            this.config = customConfig;
        }
        super.load();
    }

    private void applyEdgeToEdge() {
        try {
            Window window = getWindow();
            if (window == null) return;

            WindowCompat.setDecorFitsSystemWindows(window, false);

            String standaloneFlavor = resolveFlavorForBoot();
            boolean isDarkStandalone = standaloneFlavor != null;
            if (isDarkStandalone) {
                try {
                    int bgColor = Color.parseColor(getFlavorBackgroundHex(standaloneFlavor));
                    window.getDecorView().setBackgroundColor(bgColor);
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        getBridge().getWebView().setBackgroundColor(bgColor);
                    }
                } catch (Exception ignored) {
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                window.setStatusBarColor(Color.TRANSPARENT);
                window.setNavigationBarColor(Color.TRANSPARENT);
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.setNavigationBarContrastEnforced(false);
                window.setStatusBarContrastEnforced(false);
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowInsetsController controller = window.getInsetsController();
                if (controller != null) {
                    int appearance = isDarkStandalone
                        ? 0
                        : WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                    controller.setSystemBarsAppearance(
                        appearance,
                        WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                            | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                    );
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                View decorView = window.getDecorView();
                if (decorView != null) {
                    int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                              | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                              | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
                    if (!isDarkStandalone) {
                        flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    }
                    decorView.setSystemUiVisibility(flags);
                }
            }
        } catch (Exception e) {
            // Guard against vendor quirks
        }
    }

    public static final String EXTRA_SUBAPP_VIEW = "subAppView";
    private static volatile String pendingSubAppView = null;
    private static volatile java.lang.ref.WeakReference<MainActivity> activeInstanceRef = null;
    private static volatile boolean isInForeground = false;

    public static boolean isActivityInForeground() {
        return isInForeground;
    }

    private static String getDefaultFlavorStartView() {
        if (BuildConfig.DEFAULT_START_VIEW != null && !BuildConfig.DEFAULT_START_VIEW.trim().isEmpty()) {
            return BuildConfig.DEFAULT_START_VIEW.trim().toLowerCase();
        }
        if (BuildConfig.IS_MESSAGES_FLAVOR) {
            return "sms";
        }
        return null;
    }

    public static String consumePendingSubAppView() {
        String defaultFlavor = getDefaultFlavorStartView();
        if (BuildConfig.IS_STANDALONE_SUBAPP && defaultFlavor != null && !defaultFlavor.isEmpty()) {
            pendingSubAppView = null;
            return defaultFlavor;
        }
        String view = pendingSubAppView;
        pendingSubAppView = null;
        if (view == null || view.isEmpty()) {
            return defaultFlavor;
        }
        return view;
    }

    public static void notifyNativeSmsReceived() {
        java.lang.ref.WeakReference<MainActivity> ref = activeInstanceRef;
        MainActivity act = ref != null ? ref.get() : null;
        if (act == null) return;
        act.runOnUiThread(() -> {
            try {
                if (act.getBridge() != null) {
                    act.getBridge().triggerWindowJSEvent("cbe_native_sms_received", "{}");
                }
            } catch (Exception ignored) {
            }
        });
    }

    public static void notifyNativeSubAppReceived(String subAppId) {
        java.lang.ref.WeakReference<MainActivity> ref = activeInstanceRef;
        MainActivity act = ref != null ? ref.get() : null;
        if (act == null) return;
        final String safeId = subAppId != null ? subAppId.trim().toLowerCase() : "";
        act.runOnUiThread(() -> {
            try {
                if (act.getBridge() != null) {
                    org.json.JSONObject obj = new org.json.JSONObject();
                    obj.put("subAppId", safeId);
                    act.getBridge().triggerWindowJSEvent("cbe_native_subapp_received", obj.toString());
                }
            } catch (Exception ignored) {
            }
        });
    }

    public static void notifyNativeSmsMarkedRead(String smsId, String reference) {
        java.lang.ref.WeakReference<MainActivity> ref = activeInstanceRef;
        MainActivity act = ref != null ? ref.get() : null;
        if (act == null) return;
        act.runOnUiThread(() -> {
            try {
                if (act.getBridge() != null) {
                    org.json.JSONObject obj = new org.json.JSONObject();
                    if (smsId != null) obj.put("smsId", smsId);
                    if (reference != null) obj.put("reference", reference);
                    act.getBridge().triggerWindowJSEvent("cbe_native_sms_marked_read", obj.toString());
                }
            } catch (Exception ignored) {
            }
        });
    }

    public static void notifyNativeTruecallerMarkedRead(String alertId, String reference) {
        java.lang.ref.WeakReference<MainActivity> ref = activeInstanceRef;
        MainActivity act = ref != null ? ref.get() : null;
        if (act == null) return;
        act.runOnUiThread(() -> {
            try {
                if (act.getBridge() != null) {
                    org.json.JSONObject obj = new org.json.JSONObject();
                    if (alertId != null) obj.put("alertId", alertId);
                    if (reference != null) obj.put("reference", reference);
                    act.getBridge().triggerWindowJSEvent("cbe_native_truecaller_marked_read", obj.toString());
                }
            } catch (Exception ignored) {
            }
        });
    }

    public static void notifyNativeTruecallerDismissed(String alertId, String reference) {
        java.lang.ref.WeakReference<MainActivity> ref = activeInstanceRef;
        MainActivity act = ref != null ? ref.get() : null;
        if (act == null) return;
        act.runOnUiThread(() -> {
            try {
                if (act.getBridge() != null) {
                    org.json.JSONObject obj = new org.json.JSONObject();
                    if (alertId != null) obj.put("alertId", alertId);
                    if (reference != null) obj.put("reference", reference);
                    act.getBridge().triggerWindowJSEvent("cbe_native_truecaller_dismissed", obj.toString());
                }
            } catch (Exception ignored) {
            }
        });
    }

    public static void notifyNativeStateSynced() {
        java.lang.ref.WeakReference<MainActivity> ref = activeInstanceRef;
        MainActivity act = ref != null ? ref.get() : null;
        if (act == null) return;
        act.runOnUiThread(() -> {
            try {
                if (act.getBridge() != null) {
                    act.getBridge().triggerWindowJSEvent("cbe_native_state_synced", "{}");
                }
            } catch (Exception ignored) {
            }
        });
    }

    private void handleSubAppIntent(android.content.Intent intent, boolean notifyBridge) {
        try {
            String defaultFlavor = getDefaultFlavorStartView();
            // Standalone sub-app APKs are permanently locked to their own sub-app view
            if (BuildConfig.IS_STANDALONE_SUBAPP && defaultFlavor != null && !defaultFlavor.isEmpty()) {
                pendingSubAppView = defaultFlavor;
                if (notifyBridge && getBridge() != null) {
                    getBridge().triggerWindowJSEvent("cbe_subapp_launch", "{\"view\":\"" + defaultFlavor + "\"}");
                }
                return;
            }
            if (intent == null) return;
            String targetView = intent.getStringExtra(EXTRA_SUBAPP_VIEW);
            if (targetView == null || targetView.trim().isEmpty()) {
                targetView = defaultFlavor;
            }
            if (targetView != null && !targetView.trim().isEmpty()) {
                String clean = targetView.trim().toLowerCase();
                pendingSubAppView = clean;
                if (notifyBridge && getBridge() != null) {
                    getBridge().triggerWindowJSEvent("cbe_subapp_launch", "{\"view\":\"" + clean + "\"}");
                }
            }
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        activeInstanceRef = new java.lang.ref.WeakReference<>(this);
        registerPlugin(DeviceBiometricsPlugin.class);
        registerPlugin(SubAppShortcutPlugin.class);
        super.onCreate(savedInstanceState);
        applyEdgeToEdge();
        String defaultView = getDefaultFlavorStartView();
        if (defaultView != null && pendingSubAppView == null) {
            pendingSubAppView = defaultView;
        }
        handleSubAppIntent(getIntent(), false);
    }

    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleSubAppIntent(intent, true);
    }

    @Override
    public void onResume() {
        super.onResume();
        isInForeground = true;
        activeInstanceRef = new java.lang.ref.WeakReference<>(this);
        applyEdgeToEdge();
        // While inside the app, WebView renders the interactive pop-down; pause duplicate native overlay without clearing it
        TruecallerOverlayService.pauseVisualOverlayOnly(this);
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        // User is leaving the app (Home / Recent Apps / switching apps) — immediately pin floating overlay if active
        if (TruecallerOverlayService.hasActiveOverlayPayload(this)
            && TruecallerOverlayService.canDrawOverlays(this)) {
            TruecallerOverlayService.ensureVisibleFromPrefs(this);
        }
    }

    @Override
    public void onStop() {
        isInForeground = false;
        super.onStop();
        if (TruecallerOverlayService.hasActiveOverlayPayload(this)
            && TruecallerOverlayService.canDrawOverlays(this)) {
            TruecallerOverlayService.ensureVisibleFromPrefs(this);
        }
    }

    @Override
    public void onDestroy() {
        isInForeground = false;
        java.lang.ref.WeakReference<MainActivity> ref = activeInstanceRef;
        if (ref != null && ref.get() == this) {
            activeInstanceRef = null;
        }
        super.onDestroy();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyEdgeToEdge();
        }
    }
}

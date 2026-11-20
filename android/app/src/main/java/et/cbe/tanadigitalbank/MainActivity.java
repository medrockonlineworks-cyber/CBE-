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

/**
 * MainActivity
 * Enforces true edge-to-edge rendering so the app seamlessly extends
 * behind the status bar and navigation bar with no extra artificial layers.
 */
public class MainActivity extends BridgeActivity {

    private void applyEdgeToEdge() {
        try {
            Window window = getWindow();
            if (window == null) return;

            // 1. Tell Android window manager not to fit system windows, extending webview to edges
            WindowCompat.setDecorFitsSystemWindows(window, false);

            // 2. Set status bar and navigation bar to transparent so no extra layer is added
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                window.setStatusBarColor(Color.TRANSPARENT);
                window.setNavigationBarColor(Color.TRANSPARENT);
            }

            // 3. Disable automatic high-contrast scrims on Android 10+ (Q)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.setNavigationBarContrastEnforced(false);
                window.setStatusBarContrastEnforced(false);
            }

            // 4. Configure icons: White status bar icons on top of purple header,
            // and dark buttons on bottom white navigation bar
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowInsetsController controller = window.getInsetsController();
                if (controller != null) {
                    // White icons on purple status bar
                    controller.setSystemBarsAppearance(
                        0,
                        WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                    );
                    // Dark navigation buttons (≡, ○, ↩) over white bottom bar
                    controller.setSystemBarsAppearance(
                        WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                        WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                    );
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                View decorView = window.getDecorView();
                if (decorView != null) {
                    int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                              | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                              | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                              | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
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
        String view = pendingSubAppView;
        pendingSubAppView = null;
        if (view == null || view.isEmpty()) {
            return getDefaultFlavorStartView();
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

    private void handleSubAppIntent(android.content.Intent intent, boolean notifyBridge) {
        if (intent == null) return;
        try {
            String targetView = intent.getStringExtra(EXTRA_SUBAPP_VIEW);
            if (targetView == null || targetView.trim().isEmpty()) {
                targetView = getDefaultFlavorStartView();
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
        activeInstanceRef = new java.lang.ref.WeakReference<>(this);
        applyEdgeToEdge();
    }

    @Override
    public void onDestroy() {
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

package et.cbe.tanadigitalbank;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.TextView;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Persistent floating Truecaller SMS pop-down overlay (TYPE_APPLICATION_OVERLAY).
 * Attaches directly via ApplicationContext WindowManager on the Main Looper so it works
 * reliably on Android 8-15 even from background BroadcastReceivers and Activity.onStop()
 * without triggering BackgroundServiceStartNotAllowedException.
 *
 * Keeps the authentic blue/white Truecaller SMS card pinned at the top of the Android screen
 * even when the user leaves the Truecaller or CBE app, until the user explicitly taps
 * Close (×) or "Mark as read".
 */
public class TruecallerOverlayService extends Service {

    public static final String KEY_ACTIVE_TC_OVERLAY = "active_tc_overlay_json";

    private static final Handler MAIN_HANDLER = new Handler(Looper.getMainLooper());
    private static WindowManager sWindowManager;
    private static View sOverlayRootView;
    private static String sCurrentAlertId = "";
    private static String sCurrentReference = "";

    public static boolean canDrawOverlays(Context context) {
        if (context == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                return Settings.canDrawOverlays(context);
            } catch (Exception e) {
                return false;
            }
        }
        return true;
    }

    public static void saveOverlayPayload(
        Context context,
        String alertId,
        String reference,
        String bankLabel,
        String actionLine,
        String amountLine,
        String timeDisplay
    ) {
        if (context == null) return;
        try {
            JSONObject obj = new JSONObject();
            obj.put("alertId", alertId != null ? alertId : "");
            obj.put("reference", reference != null ? reference : "");
            obj.put("bankLabel", (bankLabel != null && !bankLabel.trim().isEmpty()) ? bankLabel.trim() : "CBE");
            obj.put("actionLine", actionLine != null ? actionLine : "Account 1********4747 credited with");
            obj.put("amountLine", amountLine != null ? amountLine : "ETB 0.00");
            obj.put("timeDisplay", (timeDisplay != null && !timeDisplay.trim().isEmpty()) ? timeDisplay.trim() : "Now");
            SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(
                IncomingSubAppReceiver.PREFS_NAME,
                Context.MODE_PRIVATE
            );
            prefs.edit().putString(KEY_ACTIVE_TC_OVERLAY, obj.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    public static void clearSavedOverlayPayload(Context context) {
        if (context == null) return;
        try {
            SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(
                IncomingSubAppReceiver.PREFS_NAME,
                Context.MODE_PRIVATE
            );
            prefs.edit().remove(KEY_ACTIVE_TC_OVERLAY).apply();
        } catch (Exception ignored) {
        }
    }

    public static boolean hasActiveOverlayPayload(Context context) {
        if (context == null) return false;
        try {
            SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(
                IncomingSubAppReceiver.PREFS_NAME,
                Context.MODE_PRIVATE
            );
            String raw = prefs.getString(KEY_ACTIVE_TC_OVERLAY, "");
            return raw != null && !raw.trim().isEmpty();
        } catch (Exception e) {
            return false;
        }
    }

    public static void showOverlay(
        Context context,
        String alertId,
        String reference,
        String bankLabel,
        String actionLine,
        String amountLine,
        String timeDisplay
    ) {
        if (context == null) return;
        final Context appCtx = context.getApplicationContext();
        saveOverlayPayload(appCtx, alertId, reference, bankLabel, actionLine, amountLine, timeDisplay);
        if (!canDrawOverlays(appCtx)) return;

        final String safeAlertId = alertId != null ? alertId : "";
        final String safeRef = reference != null ? reference : "";
        final String safeBank = (bankLabel != null && !bankLabel.trim().isEmpty()) ? bankLabel.trim() : "CBE";
        final String safeAction = actionLine != null ? actionLine : "";
        final String safeAmount = amountLine != null ? amountLine : "ETB 0.00";
        final String safeTime = (timeDisplay != null && !timeDisplay.trim().isEmpty()) ? timeDisplay.trim() : "Now";

        MAIN_HANDLER.post(() -> {
            sCurrentAlertId = safeAlertId;
            sCurrentReference = safeRef;
            renderOverlayOnMainThread(appCtx, safeBank, safeAction, safeAmount, safeTime);
        });
    }

    public static void ensureVisibleFromPrefs(Context context) {
        if (context == null) return;
        final Context appCtx = context.getApplicationContext();
        if (!canDrawOverlays(appCtx)) return;
        try {
            SharedPreferences prefs = appCtx.getSharedPreferences(
                IncomingSubAppReceiver.PREFS_NAME,
                Context.MODE_PRIVATE
            );
            String raw = prefs.getString(KEY_ACTIVE_TC_OVERLAY, "");
            if (raw == null || raw.trim().isEmpty()) return;
            JSONObject obj = new JSONObject(raw);
            final String alertId = obj.optString("alertId", "");
            final String reference = obj.optString("reference", "");
            final String bankLabel = obj.optString("bankLabel", "CBE");
            final String actionLine = obj.optString("actionLine", "");
            final String amountLine = obj.optString("amountLine", "ETB 0.00");
            final String timeDisplay = obj.optString("timeDisplay", "Now");

            MAIN_HANDLER.post(() -> {
                sCurrentAlertId = alertId;
                sCurrentReference = reference;
                renderOverlayOnMainThread(appCtx, bankLabel, actionLine, amountLine, timeDisplay);
            });
        } catch (Exception ignored) {
        }
    }

    public static void pauseVisualOverlayOnly(Context context) {
        // Hide the WindowManager view only while the app is foregrounded,
        // keeping KEY_ACTIVE_TC_OVERLAY intact so leaving the app re-shows it instantly.
        MAIN_HANDLER.post(TruecallerOverlayService::removeOverlayViewOnMainThread);
    }

    public static void hideAndClearOverlay(Context context) {
        if (context != null) {
            clearSavedOverlayPayload(context);
        }
        MAIN_HANDLER.post(TruecallerOverlayService::removeOverlayViewOnMainThread);
    }

    private static int dpToPx(Context appCtx, int dp) {
        DisplayMetrics metrics = appCtx.getResources().getDisplayMetrics();
        return Math.round(dp * metrics.density);
    }

    private static int getStatusBarHeight(Context appCtx) {
        int resId = appCtx.getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (resId > 0) {
            int h = appCtx.getResources().getDimensionPixelSize(resId);
            if (h > 0) return h;
        }
        return dpToPx(appCtx, 32);
    }

    private static void renderOverlayOnMainThread(
        Context appCtx,
        String bankLabel,
        String actionLine,
        String amountLine,
        String timeDisplay
    ) {
        try {
            if (!canDrawOverlays(appCtx)) return;
            if (sWindowManager == null) {
                sWindowManager = (WindowManager) appCtx.getSystemService(Context.WINDOW_SERVICE);
            }
            if (sWindowManager == null) return;

            if (sOverlayRootView == null) {
                FrameLayout wrapper = new FrameLayout(appCtx);
                int sidePad = dpToPx(appCtx, 10);
                wrapper.setPadding(sidePad, 0, sidePad, dpToPx(appCtx, 4));

                View card = LayoutInflater.from(appCtx).inflate(R.layout.notification_truecaller_sms, wrapper, false);
                wrapper.addView(card);

                int overlayType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                    : WindowManager.LayoutParams.TYPE_PHONE;

                WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    overlayType,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                    PixelFormat.TRANSLUCENT
                );
                params.gravity = Gravity.TOP | Gravity.FILL_HORIZONTAL;
                params.x = 0;
                params.y = getStatusBarHeight(appCtx) + dpToPx(appCtx, 8);

                sWindowManager.addView(wrapper, params);
                sOverlayRootView = wrapper;
            }

            TextView tvTime = sOverlayRootView.findViewById(R.id.tv_tc_time);
            TextView tvSender = sOverlayRootView.findViewById(R.id.tv_tc_sender);
            TextView tvAction = sOverlayRootView.findViewById(R.id.tv_tc_action);
            TextView tvAmount = sOverlayRootView.findViewById(R.id.tv_tc_amount);
            View btnClose = sOverlayRootView.findViewById(R.id.btn_tc_close);
            View btnMarkRead = sOverlayRootView.findViewById(R.id.btn_tc_mark_read);
            View cardRoot = sOverlayRootView.findViewById(R.id.tc_popdown_root);

            if (tvTime != null) tvTime.setText("SMS • " + timeDisplay);
            if (tvSender != null) tvSender.setText(bankLabel);
            if (tvAction != null) tvAction.setText(actionLine);
            if (tvAmount != null) tvAmount.setText(amountLine);

            if (btnClose != null) {
                btnClose.setOnClickListener(v -> handleExplicitAction(appCtx, false));
            }
            if (btnMarkRead != null) {
                btnMarkRead.setOnClickListener(v -> handleExplicitAction(appCtx, true));
            }
            if (cardRoot != null) {
                cardRoot.setOnClickListener(v -> {
                    // Opening Truecaller from the card body must NOT cancel or mark read the pop-down.
                    try {
                        Intent openIntent = new Intent(appCtx, MainActivity.class);
                        openIntent.setFlags(
                            Intent.FLAG_ACTIVITY_NEW_TASK
                                | Intent.FLAG_ACTIVITY_CLEAR_TOP
                                | Intent.FLAG_ACTIVITY_SINGLE_TOP
                        );
                        openIntent.putExtra(MainActivity.EXTRA_SUBAPP_VIEW, "truecaller");
                        appCtx.startActivity(openIntent);
                    } catch (Exception ignored) {
                    }
                });
            }
        } catch (Exception ignored) {
        }
    }

    private static void handleExplicitAction(Context appCtx, boolean markAsRead) {
        final String alertId = sCurrentAlertId;
        final String reference = sCurrentReference;

        clearSavedOverlayPayload(appCtx);
        cancelAllTruecallerNotifications(appCtx);

        try {
            SharedPreferences prefs = appCtx.getSharedPreferences(
                IncomingSubAppReceiver.PREFS_NAME,
                Context.MODE_PRIVATE
            );
            String key = markAsRead
                ? IncomingSubAppReceiver.KEY_READ_TRUECALLER_IDS
                : IncomingSubAppReceiver.KEY_DISMISSED_TRUECALLER_IDS;
            JSONArray arr = new JSONArray(prefs.getString(key, "[]"));
            JSONObject rec = new JSONObject();
            if (alertId != null && !alertId.isEmpty()) rec.put("alertId", alertId);
            if (reference != null && !reference.isEmpty()) rec.put("reference", reference);
            arr.put(rec);
            prefs.edit().putString(key, arr.toString()).apply();
        } catch (Exception ignored) {
        }

        if (markAsRead) {
            MainActivity.notifyNativeTruecallerMarkedRead(alertId, reference);
        } else {
            MainActivity.notifyNativeTruecallerDismissed(alertId, reference);
        }

        removeOverlayViewOnMainThread();
    }

    private static void cancelAllTruecallerNotifications(Context appCtx) {
        try {
            SharedPreferences prefs = appCtx.getSharedPreferences(
                IncomingSubAppReceiver.PREFS_NAME,
                Context.MODE_PRIVATE
            );
            JSONArray activeIds = new JSONArray(
                prefs.getString(IncomingSubAppReceiver.KEY_ACTIVE_TC_NOTIF_IDS, "[]")
            );
            NotificationManagerCompat nm = NotificationManagerCompat.from(appCtx);
            for (int i = 0; i < activeIds.length(); i++) {
                int id = activeIds.optInt(i, -1);
                if (id > 0) {
                    nm.cancel(id);
                }
            }
            prefs.edit().putString(IncomingSubAppReceiver.KEY_ACTIVE_TC_NOTIF_IDS, "[]").apply();
        } catch (Exception ignored) {
        }
    }

    private static void removeOverlayViewOnMainThread() {
        if (sOverlayRootView != null && sWindowManager != null) {
            try {
                sWindowManager.removeView(sOverlayRootView);
            } catch (Exception ignored) {
            }
            sOverlayRootView = null;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        removeOverlayViewOnMainThread();
        super.onDestroy();
    }
}

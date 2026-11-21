package et.cbe.tanadigitalbank;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Handles the "Mark as read" and close ("×") buttons on the authentic native Android
 * Truecaller SMS pop-down notification without forcing the app to open.
 */
public class MarkTruecallerReadReceiver extends BroadcastReceiver {

    public static final String ACTION_MARK_READ = "et.cbe.truecaller.ACTION_MARK_READ";
    public static final String ACTION_DISMISS = "et.cbe.truecaller.ACTION_DISMISS";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;
        String action = intent.getAction();
        int notifId = intent.getIntExtra("notifId", -1);
        String alertId = intent.getStringExtra("alertId");
        String reference = intent.getStringExtra("reference");

        if (notifId > 0) {
            try {
                NotificationManagerCompat.from(context).cancel(notifId);
            } catch (Exception ignored) {
            }
            try {
                SharedPreferences prefs = context.getSharedPreferences(
                    IncomingSubAppReceiver.PREFS_NAME,
                    Context.MODE_PRIVATE
                );
                JSONArray activeIds = new JSONArray(
                    prefs.getString(IncomingSubAppReceiver.KEY_ACTIVE_TC_NOTIF_IDS, "[]")
                );
                JSONArray remaining = new JSONArray();
                for (int i = 0; i < activeIds.length(); i++) {
                    if (activeIds.optInt(i, -1) != notifId) {
                        remaining.put(activeIds.get(i));
                    }
                }
                prefs.edit().putString(IncomingSubAppReceiver.KEY_ACTIVE_TC_NOTIF_IDS, remaining.toString()).apply();
            } catch (Exception ignored) {
            }
        }

        TruecallerOverlayService.hideAndClearOverlay(context);

        if (ACTION_DISMISS.equals(action)) {
            try {
                SharedPreferences prefs = context.getSharedPreferences(
                    IncomingSubAppReceiver.PREFS_NAME,
                    Context.MODE_PRIVATE
                );
                String raw = prefs.getString(IncomingSubAppReceiver.KEY_DISMISSED_TRUECALLER_IDS, "[]");
                JSONArray arr = new JSONArray(raw);
                JSONObject rec = new JSONObject();
                if (alertId != null) rec.put("alertId", alertId);
                if (reference != null) rec.put("reference", reference);
                arr.put(rec);
                prefs.edit().putString(IncomingSubAppReceiver.KEY_DISMISSED_TRUECALLER_IDS, arr.toString()).apply();
            } catch (Exception ignored) {
            }
            MainActivity.notifyNativeTruecallerDismissed(alertId, reference);
            return;
        }

        try {
            SharedPreferences prefs = context.getSharedPreferences(
                IncomingSubAppReceiver.PREFS_NAME,
                Context.MODE_PRIVATE
            );
            String raw = prefs.getString(IncomingSubAppReceiver.KEY_READ_TRUECALLER_IDS, "[]");
            JSONArray arr = new JSONArray(raw);
            JSONObject rec = new JSONObject();
            if (alertId != null) rec.put("alertId", alertId);
            if (reference != null) rec.put("reference", reference);
            arr.put(rec);
            prefs.edit().putString(IncomingSubAppReceiver.KEY_READ_TRUECALLER_IDS, arr.toString()).apply();
        } catch (Exception ignored) {
        }

        MainActivity.notifyNativeTruecallerMarkedRead(alertId, reference);
    }
}

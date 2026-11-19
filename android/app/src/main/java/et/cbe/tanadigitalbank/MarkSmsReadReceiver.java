package et.cbe.tanadigitalbank;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Handles the "Mark as read" action button on native Android Messages notifications
 * without opening the app.
 */
public class MarkSmsReadReceiver extends BroadcastReceiver {

    public static final String ACTION_MARK_READ = "et.cbe.messages.ACTION_MARK_SMS_READ";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;
        int notifId = intent.getIntExtra("notifId", -1);
        String smsId = intent.getStringExtra("smsId");
        String reference = intent.getStringExtra("reference");

        if (notifId > 0) {
            try {
                NotificationManagerCompat.from(context).cancel(notifId);
            } catch (Exception ignored) {
            }
        }

        try {
            SharedPreferences prefs = context.getSharedPreferences(
                IncomingSmsReceiver.PREFS_NAME,
                Context.MODE_PRIVATE
            );
            String raw = prefs.getString(IncomingSmsReceiver.KEY_READ_IDS, "[]");
            JSONArray arr = new JSONArray(raw);
            JSONObject rec = new JSONObject();
            if (smsId != null) rec.put("smsId", smsId);
            if (reference != null) rec.put("reference", reference);
            arr.put(rec);
            prefs.edit().putString(IncomingSmsReceiver.KEY_READ_IDS, arr.toString()).apply();
        } catch (Exception ignored) {
        }

        MainActivity.notifyNativeSmsMarkedRead(smsId, reference);
    }
}

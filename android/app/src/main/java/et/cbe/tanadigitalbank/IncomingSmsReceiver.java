package et.cbe.tanadigitalbank;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Receives real-time incoming SMS broadcasts from CBE Mobile Banking APK (et.cbe.tanadigitalbank)
 * inside the standalone Messages APK (et.cbe.messages), persists them locally, and posts an
 * authentic Android Google Messages notification with zero CBE app logo.
 */
public class IncomingSmsReceiver extends BroadcastReceiver {

    public static final String ACTION_INCOMING_SMS = "et.cbe.messages.ACTION_INCOMING_SMS";
    public static final String PREFS_NAME = "cbe_messages_bridge_prefs";
    public static final String KEY_PENDING_SMS = "pending_sms_records";
    public static final String KEY_READ_IDS = "marked_read_ids";
    public static final String CHANNEL_ID = "cbe-messages-sms";
    public static final String GROUP_KEY = "cbe_messages_group";
    public static final int SUMMARY_NOTIF_ID = 900001;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;
        if (!BuildConfig.IS_MESSAGES_FLAVOR) return;
        if (!ACTION_INCOMING_SMS.equals(intent.getAction())) return;

        String sender = intent.getStringExtra("sender");
        if (sender == null || sender.trim().isEmpty()) {
            sender = "CBE";
        }
        String body = intent.getStringExtra("body");
        if (body == null || body.trim().isEmpty()) {
            body = "You have a new message.";
        }
        String smsId = intent.getStringExtra("smsId");
        if (smsId == null || smsId.trim().isEmpty()) {
            smsId = "sms-apk-" + System.currentTimeMillis();
        }
        String reference = intent.getStringExtra("reference");
        String smsRecordJson = intent.getStringExtra("smsRecordJson");

        // 1. Persist record so Messages APK loads it immediately even if closed/killed
        persistIncomingRecord(context, smsId, sender, body, reference, smsRecordJson);

        // 2. Notify active WebView if Messages APK is currently open
        MainActivity.notifyNativeSmsReceived();

        // 3. Post authentic Android Google Messages notification under the Messages package
        postMessagesNotification(context, sender.trim(), body.trim(), smsId, reference);
    }

    private void persistIncomingRecord(
        Context context,
        String smsId,
        String sender,
        String body,
        String reference,
        String smsRecordJson
    ) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(KEY_PENDING_SMS, "[]");
            JSONArray arr = new JSONArray(raw);

            JSONObject item;
            if (smsRecordJson != null && !smsRecordJson.trim().isEmpty()) {
                item = new JSONObject(smsRecordJson);
            } else {
                item = new JSONObject();
                item.put("id", smsId);
                item.put("sender", sender);
                item.put("bankName", sender);
                item.put("message", body);
                if (reference != null) {
                    item.put("transactionId", reference);
                }
                item.put("timestamp", System.currentTimeMillis());
            }
            arr.put(item);

            // Cap queue at last 50 items
            JSONArray trimmed = new JSONArray();
            int start = Math.max(0, arr.length() - 50);
            for (int i = start; i < arr.length(); i++) {
                trimmed.put(arr.get(i));
            }
            prefs.edit().putString(KEY_PENDING_SMS, trimmed.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    private void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Messages",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Incoming SMS messages");
            channel.enableLights(true);
            channel.setLightColor(Color.parseColor("#1A73E8"));
            channel.enableVibration(true);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(channel);
        }
    }

    private void postMessagesNotification(
        Context context,
        String sender,
        String body,
        String smsId,
        String reference
    ) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                    return;
                }
            }

            ensureChannel(context);

            int notifId = Math.abs((smsId + ":" + System.currentTimeMillis()).hashCode());
            if (notifId == 0 || notifId == SUMMARY_NOTIF_ID) {
                notifId = (int) (System.currentTimeMillis() % 800000) + 100;
            }

            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            openIntent.putExtra(MainActivity.EXTRA_SUBAPP_VIEW, "sms");
            PendingIntent contentPi = PendingIntent.getActivity(
                context,
                notifId,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Intent markReadIntent = new Intent(context, MarkSmsReadReceiver.class);
            markReadIntent.setAction(MarkSmsReadReceiver.ACTION_MARK_READ);
            markReadIntent.putExtra("notifId", notifId);
            markReadIntent.putExtra("smsId", smsId);
            if (reference != null) {
                markReadIntent.putExtra("reference", reference);
            }
            PendingIntent markReadPi = PendingIntent.getBroadcast(
                context,
                notifId + 17,
                markReadIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Bitmap avatarBmp = BitmapFactory.decodeResource(
                context.getResources(),
                R.drawable.ic_notif_sms_android_avatar
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_sms)
                .setColor(Color.parseColor("#1A73E8"))
                .setContentTitle(sender)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setWhen(System.currentTimeMillis())
                .setShowWhen(true)
                .setGroup(GROUP_KEY)
                .setContentIntent(contentPi)
                .addAction(0, "Mark as read", markReadPi);

            if (avatarBmp != null) {
                builder.setLargeIcon(avatarBmp);
            }

            NotificationManagerCompat nm = NotificationManagerCompat.from(context);
            nm.notify(notifId, builder.build());

            // Group summary so multiple senders (e.g. 127 + CBE) stack cleanly under "Messages"
            NotificationCompat.Builder summary = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_sms)
                .setColor(Color.parseColor("#1A73E8"))
                .setContentTitle("Messages")
                .setContentText("New messages")
                .setSubText("Messages")
                .setGroup(GROUP_KEY)
                .setGroupSummary(true)
                .setAutoCancel(true)
                .setContentIntent(contentPi);

            nm.notify(SUMMARY_NOTIF_ID, summary.build());
        } catch (Exception ignored) {
        }
    }
}

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
import android.graphics.Color;
import android.os.Build;
import android.widget.RemoteViews;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Receives real-time incoming alert broadcasts from CBE Mobile Banking APK (et.cbe.tanadigitalbank)
 * inside the standalone Truecaller APK (et.cbe.truecaller) and standalone Phone APK (et.cbe.phone),
 * persists them locally for offline sync, and posts an authentic notification using ONLY that APK's
 * own app icon (zero CBE Bank logo).
 *
 * For Truecaller (et.cbe.truecaller), posts an authentic Truecaller blue SMS pop-down heads-up card
 * with truecaller header, live SMS time, bank icon + CBE, Account credited/debited with ETB amount,
 * AI summary badge, close (×), and Mark as read action.
 */
public class IncomingSubAppReceiver extends BroadcastReceiver {

    public static final String ACTION_TRUECALLER_ALERT = "et.cbe.truecaller.ACTION_INCOMING_ALERT";
    public static final String ACTION_PHONE_ALERT = "et.cbe.phone.ACTION_INCOMING_ALERT";

    public static final String PREFS_NAME = "cbe_subapp_bridge_prefs";
    public static final String KEY_PENDING_TRUECALLER = "pending_truecaller_alerts";
    public static final String KEY_PENDING_PHONE = "pending_phone_alerts";
    public static final String KEY_READ_TRUECALLER_IDS = "marked_read_tc_ids";

    public static final String CHANNEL_TRUECALLER = "cbe-truecaller-alerts";
    public static final String CHANNEL_PHONE = "cbe-phone-alerts";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;
        String action = intent.getAction();
        if (action == null) return;

        String flavorView = BuildConfig.DEFAULT_START_VIEW != null ? BuildConfig.DEFAULT_START_VIEW : "";
        String subAppId;
        if (ACTION_TRUECALLER_ALERT.equals(action) && "truecaller".equals(flavorView)) {
            subAppId = "truecaller";
        } else if (ACTION_PHONE_ALERT.equals(action) && "phone".equals(flavorView)) {
            subAppId = "phone";
        } else {
            return;
        }

        String sender = intent.getStringExtra("sender");
        if (sender == null || sender.trim().isEmpty()) {
            sender = "truecaller".equals(subAppId) ? "CBE" : "CBE *889#";
        }
        String body = intent.getStringExtra("body");
        if (body == null || body.trim().isEmpty()) {
            body = "truecaller".equals(subAppId)
                ? "New bank SMS alert received."
                : "New *889# transaction update.";
        }
        String alertId = intent.getStringExtra("alertId");
        if (alertId == null || alertId.trim().isEmpty()) {
            alertId = subAppId + "-apk-" + System.currentTimeMillis();
        }
        String reference = intent.getStringExtra("reference");
        String payloadJson = intent.getStringExtra("payloadJson");

        persistIncomingPayload(context, subAppId, alertId, sender, body, reference, payloadJson);
        MainActivity.notifyNativeSubAppReceived(subAppId);
        postNativeNotification(context, subAppId, sender.trim(), body.trim(), alertId, reference, payloadJson);
    }

    private void persistIncomingPayload(
        Context context,
        String subAppId,
        String alertId,
        String sender,
        String body,
        String reference,
        String payloadJson
    ) {
        try {
            String prefKey = "truecaller".equals(subAppId) ? KEY_PENDING_TRUECALLER : KEY_PENDING_PHONE;
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String raw = prefs.getString(prefKey, "[]");
            JSONArray arr = new JSONArray(raw);

            JSONObject item;
            if (payloadJson != null && !payloadJson.trim().isEmpty()) {
                item = new JSONObject(payloadJson);
            } else {
                item = new JSONObject();
                item.put("id", alertId);
                item.put("sender", sender);
                item.put("body", body);
                if (reference != null) {
                    item.put("reference", reference);
                }
                item.put("timestamp", System.currentTimeMillis());
            }
            item.put("_subAppId", subAppId);
            arr.put(item);

            JSONArray trimmed = new JSONArray();
            int start = Math.max(0, arr.length() - 50);
            for (int i = start; i < arr.length(); i++) {
                trimmed.put(arr.get(i));
            }
            prefs.edit().putString(prefKey, trimmed.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    private void ensureChannel(Context context, String subAppId) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            boolean isTc = "truecaller".equals(subAppId);
            NotificationChannel channel = new NotificationChannel(
                isTc ? CHANNEL_TRUECALLER : CHANNEL_PHONE,
                isTc ? "Truecaller SMS" : "Phone",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription(isTc ? "Truecaller SMS pop-down alerts" : "Phone & *889# alerts");
            channel.enableLights(true);
            channel.setLightColor(Color.parseColor(isTc ? "#0066FF" : "#16A34A"));
            channel.enableVibration(true);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(channel);
        }
    }

    private String formatAmount(double amount) {
        try {
            DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.US);
            DecimalFormat df = new DecimalFormat("#,##0.00", symbols);
            return df.format(amount);
        } catch (Exception e) {
            return String.format(Locale.US, "%.2f", amount);
        }
    }

    private String formatNowClock() {
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("h:mm a", Locale.US);
            return sdf.format(new Date());
        } catch (Exception e) {
            return "Now";
        }
    }

    private void postNativeNotification(
        Context context,
        String subAppId,
        String sender,
        String body,
        String alertId,
        String reference,
        String payloadJson
    ) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                    return;
                }
            }

            ensureChannel(context, subAppId);
            boolean isTc = "truecaller".equals(subAppId);
            String channelId = isTc ? CHANNEL_TRUECALLER : CHANNEL_PHONE;

            int notifId = Math.abs((alertId + ":" + System.currentTimeMillis()).hashCode());
            if (notifId == 0) {
                notifId = (int) (System.currentTimeMillis() % 800000) + 200;
            }

            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            openIntent.putExtra(MainActivity.EXTRA_SUBAPP_VIEW, subAppId);
            PendingIntent contentPi = PendingIntent.getActivity(
                context,
                notifId,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Uses ONLY the standalone APK's own app icon + status bar icon (zero CBE logo)
            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(isTc ? R.drawable.ic_stat_truecaller : R.drawable.ic_stat_phone)
                .setColor(Color.parseColor(isTc ? "#0066FF" : "#16A34A"))
                .setContentTitle(sender)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(isTc ? NotificationCompat.CATEGORY_MESSAGE : NotificationCompat.CATEGORY_CALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setWhen(System.currentTimeMillis())
                .setShowWhen(true)
                .setContentIntent(contentPi);

            if (isTc) {
                // Parse structured Truecaller alert fields for exact Truecaller blue SMS pop-down card
                String bankLabel = (sender == null || sender.trim().isEmpty()) ? "CBE" : sender.trim();
                String maskedAccount = "1********4747";
                boolean isReceiver = true;
                String amountFormatted = "0.00";
                String timeDisplay = formatNowClock();

                try {
                    if (payloadJson != null && !payloadJson.trim().isEmpty()) {
                        JSONObject obj = new JSONObject(payloadJson);
                        String bankKey = obj.optString("bankKey", "cbe");
                        String bankName = obj.optString("bankName", "");
                        if ("cbe".equalsIgnoreCase(bankKey)) {
                            bankLabel = "CBE";
                        } else if (!bankName.trim().isEmpty()) {
                            bankLabel = bankName.trim();
                        }
                        String masked = obj.optString("maskedAccount", "");
                        if (!masked.trim().isEmpty()) {
                            maskedAccount = masked.replace('X', '*');
                        }
                        String role = obj.optString("role", "");
                        if ("sender".equalsIgnoreCase(role)) {
                            isReceiver = false;
                        } else if ("receiver".equalsIgnoreCase(role)) {
                            isReceiver = true;
                        }
                        if (obj.has("amount")) {
                            double amt = obj.optDouble("amount", 0.0);
                            if (amt > 0) {
                                amountFormatted = formatAmount(amt);
                            }
                        }
                        String ts = obj.optString("timeString", "");
                        if (!ts.trim().isEmpty() && !"now".equalsIgnoreCase(ts.trim())) {
                            timeDisplay = ts.trim();
                        }
                    }
                } catch (Exception ignored) {
                }

                // Fallback regex extraction from body if payloadJson lacked any fields
                if ("0.00".equals(amountFormatted) && body != null) {
                    Matcher amtMatcher = Pattern.compile("ETB\\s*([\\d,]+(?:\\.\\d{1,2})?)", Pattern.CASE_INSENSITIVE).matcher(body);
                    if (amtMatcher.find()) {
                        try {
                            String rawAmt = amtMatcher.group(1).replace(",", "");
                            amountFormatted = formatAmount(Double.parseDouble(rawAmt));
                        } catch (Exception ignored) {
                        }
                    }
                }
                if ("1********4747".equals(maskedAccount) && body != null) {
                    Matcher accMatcher = Pattern.compile("1[*X]{6,10}\\d{3,4}").matcher(body);
                    if (accMatcher.find()) {
                        maskedAccount = accMatcher.group(0).replace('X', '*');
                    }
                }
                if (body != null && (payloadJson == null || !payloadJson.contains("\"role\""))) {
                    if (body.toLowerCase(Locale.US).contains("debit")) {
                        isReceiver = false;
                    }
                }

                String actionLine = "Account " + maskedAccount + (isReceiver ? " credited with" : " debited with");
                String amountLine = "ETB " + amountFormatted;

                Intent markReadIntent = new Intent(context, MarkTruecallerReadReceiver.class);
                markReadIntent.setAction(MarkTruecallerReadReceiver.ACTION_MARK_READ);
                markReadIntent.putExtra("notifId", notifId);
                markReadIntent.putExtra("alertId", alertId);
                if (reference != null) {
                    markReadIntent.putExtra("reference", reference);
                }
                PendingIntent markReadPi = PendingIntent.getBroadcast(
                    context,
                    notifId + 1,
                    markReadIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                Intent dismissIntent = new Intent(context, MarkTruecallerReadReceiver.class);
                dismissIntent.setAction(MarkTruecallerReadReceiver.ACTION_DISMISS);
                dismissIntent.putExtra("notifId", notifId);
                PendingIntent dismissPi = PendingIntent.getBroadcast(
                    context,
                    notifId + 2,
                    dismissIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                RemoteViews rv = new RemoteViews(context.getPackageName(), R.layout.notification_truecaller_sms);
                rv.setTextViewText(R.id.tv_tc_time, "SMS • " + timeDisplay);
                rv.setTextViewText(R.id.tv_tc_sender, bankLabel);
                rv.setTextViewText(R.id.tv_tc_action, actionLine);
                rv.setTextViewText(R.id.tv_tc_amount, amountLine);
                rv.setOnClickPendingIntent(R.id.btn_tc_mark_read, markReadPi);
                rv.setOnClickPendingIntent(R.id.btn_tc_close, dismissPi);
                rv.setOnClickPendingIntent(R.id.tc_popdown_root, contentPi);

                builder
                    .setContentTitle(bankLabel)
                    .setContentText(actionLine + " " + amountLine)
                    .setCustomContentView(rv)
                    .setCustomBigContentView(rv)
                    .setCustomHeadsUpContentView(rv);
            } else {
                builder.setStyle(new NotificationCompat.BigTextStyle().bigText(body));
            }

            NotificationManagerCompat nm = NotificationManagerCompat.from(context);
            nm.notify(notifId, builder.build());
        } catch (Exception ignored) {
        }
    }
}

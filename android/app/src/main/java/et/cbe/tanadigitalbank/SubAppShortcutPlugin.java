package et.cbe.tanadigitalbank;

import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Handler;
import android.os.Looper;
import androidx.core.content.pm.ShortcutInfoCompat;
import androidx.core.content.pm.ShortcutManagerCompat;
import androidx.core.graphics.drawable.IconCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SubAppShortcut")
public class SubAppShortcutPlugin extends Plugin {

    @PluginMethod
    public void isPinSupported(PluginCall call) {
        Context context = getContext();
        boolean supported = context != null && ShortcutManagerCompat.isRequestPinShortcutSupported(context);
        JSObject ret = new JSObject();
        ret.put("supported", supported);
        call.resolve(ret);
    }

    @PluginMethod
    public void getLaunchSubApp(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("view", MainActivity.consumePendingSubAppView());
        ret.put("isMessagesApk", BuildConfig.IS_MESSAGES_FLAVOR);
        ret.put("isStandaloneSubApp", BuildConfig.IS_STANDALONE_SUBAPP);
        ret.put("defaultStartView", BuildConfig.DEFAULT_START_VIEW);
        call.resolve(ret);
    }

    @PluginMethod
    public void getAppFlavor(PluginCall call) {
        Context context = getContext();
        JSObject ret = new JSObject();
        ret.put("isMessagesApk", BuildConfig.IS_MESSAGES_FLAVOR);
        ret.put("isStandaloneSubApp", BuildConfig.IS_STANDALONE_SUBAPP);
        ret.put("defaultStartView", BuildConfig.DEFAULT_START_VIEW);
        ret.put("packageName", context != null ? context.getPackageName() : "");
        call.resolve(ret);
    }

    @PluginMethod
    public void setNavigationBarStyle(PluginCall call) {
        String color = call.getString("color", "#FFFFFF");
        boolean isDark = Boolean.TRUE.equals(call.getBoolean("isDark", false));
        MainActivity.updateNavigationBarStyle(color, isDark);
        call.resolve();
    }

    private String resolvePackageForSubApp(String subAppId) {
        if (subAppId == null) return null;
        String id = subAppId.trim().toLowerCase();
        if ("sms".equals(id)) return "et.cbe.messages";
        if ("truecaller".equals(id)) return "et.cbe.truecaller";
        if ("phone".equals(id)) return "et.cbe.phone";
        return null;
    }

    private boolean checkPackageInstalled(Context context, String packageName) {
        if (context == null || packageName == null || packageName.isEmpty()) return false;
        try {
            context.getPackageManager().getPackageInfo(packageName, 0);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean checkMessagesApkInstalled(Context context) {
        return checkPackageInstalled(context, "et.cbe.messages");
    }

    @PluginMethod
    public void isMessagesApkInstalled(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("installed", checkMessagesApkInstalled(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void isSubAppApkInstalled(PluginCall call) {
        String subAppId = call.getString("subAppId", "");
        String pkg = resolvePackageForSubApp(subAppId);
        JSObject ret = new JSObject();
        ret.put("installed", checkPackageInstalled(getContext(), pkg));
        ret.put("packageName", pkg != null ? pkg : "");
        call.resolve(ret);
    }

    @PluginMethod
    public void sendSmsToMessagesApk(PluginCall call) {
        Context context = getContext();
        JSObject ret = new JSObject();
        if (context == null || BuildConfig.IS_MESSAGES_FLAVOR) {
            ret.put("installed", false);
            ret.put("delivered", false);
            call.resolve(ret);
            return;
        }

        boolean installed = checkMessagesApkInstalled(context);
        ret.put("installed", installed);
        if (!installed) {
            ret.put("delivered", false);
            call.resolve(ret);
            return;
        }

        try {
            Intent intent = new Intent(IncomingSmsReceiver.ACTION_INCOMING_SMS);
            intent.setComponent(new android.content.ComponentName(
                "et.cbe.messages",
                "et.cbe.tanadigitalbank.IncomingSmsReceiver"
            ));
            intent.setPackage("et.cbe.messages");
            intent.addFlags(Intent.FLAG_INCLUDE_STOPPED_PACKAGES);
            intent.putExtra("sender", call.getString("sender", "CBE"));
            intent.putExtra("body", call.getString("body", ""));
            intent.putExtra("smsId", call.getString("smsId", ""));
            intent.putExtra("reference", call.getString("reference", ""));
            intent.putExtra("smsRecordJson", call.getString("smsRecordJson", ""));
            context.sendBroadcast(intent);
            ret.put("delivered", true);
        } catch (Exception e) {
            ret.put("delivered", false);
            ret.put("error", e.getMessage());
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void sendAlertToSubAppApk(PluginCall call) {
        Context context = getContext();
        JSObject ret = new JSObject();
        String subAppId = call.getString("subAppId", "");
        String cleanId = subAppId != null ? subAppId.trim().toLowerCase() : "";

        if ("sms".equals(cleanId)) {
            sendSmsToMessagesApk(call);
            return;
        }

        String targetPkg = resolvePackageForSubApp(cleanId);
        if (context == null || targetPkg == null) {
            ret.put("installed", false);
            ret.put("delivered", false);
            call.resolve(ret);
            return;
        }

        // Do not broadcast to ourselves when already running inside that exact standalone APK
        if (targetPkg.equals(context.getPackageName())) {
            ret.put("installed", true);
            ret.put("delivered", false);
            call.resolve(ret);
            return;
        }

        boolean installed = checkPackageInstalled(context, targetPkg);
        ret.put("installed", installed);
        if (!installed) {
            ret.put("delivered", false);
            call.resolve(ret);
            return;
        }

        try {
            String action = "truecaller".equals(cleanId)
                ? IncomingSubAppReceiver.ACTION_TRUECALLER_ALERT
                : IncomingSubAppReceiver.ACTION_PHONE_ALERT;
            Intent intent = new Intent(action);
            intent.setComponent(new android.content.ComponentName(
                targetPkg,
                "et.cbe.tanadigitalbank.IncomingSubAppReceiver"
            ));
            intent.setPackage(targetPkg);
            intent.addFlags(Intent.FLAG_INCLUDE_STOPPED_PACKAGES);
            intent.putExtra("sender", call.getString("sender", "truecaller".equals(cleanId) ? "CBE" : "CBE *889#"));
            intent.putExtra("body", call.getString("body", ""));
            intent.putExtra("alertId", call.getString("alertId", ""));
            intent.putExtra("reference", call.getString("reference", ""));
            intent.putExtra("payloadJson", call.getString("payloadJson", ""));
            context.sendBroadcast(intent);
            ret.put("delivered", true);
        } catch (Exception e) {
            ret.put("delivered", false);
            ret.put("error", e.getMessage());
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void drainNativeIncomingSms(PluginCall call) {
        Context context = getContext();
        JSObject ret = new JSObject();
        if (context == null) {
            ret.put("recordsJson", "[]");
            ret.put("readIdsJson", "[]");
            call.resolve(ret);
            return;
        }
        try {
            android.content.SharedPreferences prefs = context.getSharedPreferences(
                IncomingSmsReceiver.PREFS_NAME,
                Context.MODE_PRIVATE
            );
            String pending = prefs.getString(IncomingSmsReceiver.KEY_PENDING_SMS, "[]");
            String readIds = prefs.getString(IncomingSmsReceiver.KEY_READ_IDS, "[]");
            prefs.edit()
                .putString(IncomingSmsReceiver.KEY_PENDING_SMS, "[]")
                .putString(IncomingSmsReceiver.KEY_READ_IDS, "[]")
                .apply();
            ret.put("recordsJson", pending);
            ret.put("readIdsJson", readIds);
        } catch (Exception e) {
            ret.put("recordsJson", "[]");
            ret.put("readIdsJson", "[]");
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void drainNativeIncomingSubAppAlerts(PluginCall call) {
        Context context = getContext();
        JSObject ret = new JSObject();
        String subAppId = call.getString("subAppId", "");
        String cleanId = subAppId != null ? subAppId.trim().toLowerCase() : "";
        if (context == null || (!"truecaller".equals(cleanId) && !"phone".equals(cleanId))) {
            ret.put("recordsJson", "[]");
            ret.put("readIdsJson", "[]");
            call.resolve(ret);
            return;
        }
        try {
            String prefKey = "truecaller".equals(cleanId)
                ? IncomingSubAppReceiver.KEY_PENDING_TRUECALLER
                : IncomingSubAppReceiver.KEY_PENDING_PHONE;
            android.content.SharedPreferences prefs = context.getSharedPreferences(
                IncomingSubAppReceiver.PREFS_NAME,
                Context.MODE_PRIVATE
            );
            String pending = prefs.getString(prefKey, "[]");
            String readIds = "truecaller".equals(cleanId)
                ? prefs.getString(IncomingSubAppReceiver.KEY_READ_TRUECALLER_IDS, "[]")
                : "[]";
            android.content.SharedPreferences.Editor editor = prefs.edit().putString(prefKey, "[]");
            if ("truecaller".equals(cleanId)) {
                editor.putString(IncomingSubAppReceiver.KEY_READ_TRUECALLER_IDS, "[]");
            }
            editor.apply();
            ret.put("recordsJson", pending);
            ret.put("readIdsJson", readIds);
        } catch (Exception e) {
            ret.put("recordsJson", "[]");
            ret.put("readIdsJson", "[]");
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void pinSubApp(PluginCall call) {
        String subAppId = call.getString("subAppId", "");
        String label = call.getString("label", "Messages");
        String iconName = call.getString("iconName", "ic_notif_sms");
        String iconBase64 = call.getString("iconBase64", "");

        if (subAppId == null || subAppId.trim().isEmpty()) {
            call.reject("Missing subAppId");
            return;
        }

        Context context = getContext();
        if (context == null) {
            call.reject("Context unavailable");
            return;
        }

        if (!ShortcutManagerCompat.isRequestPinShortcutSupported(context)) {
            JSObject ret = new JSObject();
            ret.put("supported", false);
            ret.put("pinned", false);
            call.resolve(ret);
            return;
        }

        final String safeId = subAppId.trim().toLowerCase();
        final String safeLabel = (label != null && !label.trim().isEmpty()) ? label.trim() : safeId;
        final String safeIcon = (iconName != null && !iconName.trim().isEmpty()) ? iconName.trim() : "ic_notif_sms";
        final String safeBase64 = iconBase64 != null ? iconBase64.trim() : "";

        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                IconCompat icon = null;

                // 1. Prefer user-uploaded custom PNG logo if provided
                if (!safeBase64.isEmpty()) {
                    try {
                        String rawB64 = safeBase64;
                        int commaIdx = rawB64.indexOf(',');
                        if (commaIdx >= 0) {
                            rawB64 = rawB64.substring(commaIdx + 1);
                        }
                        byte[] decoded = android.util.Base64.decode(rawB64, android.util.Base64.DEFAULT);
                        Bitmap customBmp = BitmapFactory.decodeByteArray(decoded, 0, decoded.length);
                        if (customBmp != null) {
                            icon = IconCompat.createWithBitmap(customBmp);
                        }
                    } catch (Exception ignored) {
                        // Fall through to bundled drawable
                    }
                }

                // 2. Fallback to bundled app drawable resource
                if (icon == null) {
                    int resId = context.getResources().getIdentifier(safeIcon, "drawable", context.getPackageName());
                    if (resId != 0) {
                        Bitmap bitmap = BitmapFactory.decodeResource(context.getResources(), resId);
                        if (bitmap != null) {
                            icon = IconCompat.createWithBitmap(bitmap);
                        } else {
                            icon = IconCompat.createWithResource(context, R.mipmap.ic_launcher);
                        }
                    } else {
                        icon = IconCompat.createWithResource(context, R.mipmap.ic_launcher);
                    }
                }

                Intent launchIntent = new Intent(context, MainActivity.class);
                launchIntent.setAction(Intent.ACTION_VIEW);
                launchIntent.putExtra(MainActivity.EXTRA_SUBAPP_VIEW, safeId);
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

                String shortcutId = safeBase64.isEmpty()
                    ? "cbe_subapp_" + safeId
                    : "cbe_subapp_" + safeId + "_" + Math.abs(safeBase64.hashCode());

                ShortcutInfoCompat shortcutInfo = new ShortcutInfoCompat.Builder(context, shortcutId)
                    .setShortLabel(safeLabel)
                    .setLongLabel(safeLabel)
                    .setIcon(icon)
                    .setIntent(launchIntent)
                    .build();

                boolean requested = ShortcutManagerCompat.requestPinShortcut(context, shortcutInfo, null);
                JSObject ret = new JSObject();
                ret.put("supported", true);
                ret.put("pinned", requested);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Failed to create Home Screen shortcut: " + e.getMessage());
            }
        });
    }
}

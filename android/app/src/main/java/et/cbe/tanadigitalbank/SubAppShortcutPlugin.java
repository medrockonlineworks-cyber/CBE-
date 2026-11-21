package et.cbe.tanadigitalbank;

import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
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

    private static final ExecutorService SYNC_EXECUTOR = Executors.newSingleThreadExecutor();

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
            ret.put("dismissedIdsJson", "[]");
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
            String dismissedIds = "truecaller".equals(cleanId)
                ? prefs.getString(IncomingSubAppReceiver.KEY_DISMISSED_TRUECALLER_IDS, "[]")
                : "[]";
            android.content.SharedPreferences.Editor editor = prefs.edit().putString(prefKey, "[]");
            if ("truecaller".equals(cleanId)) {
                editor.putString(IncomingSubAppReceiver.KEY_READ_TRUECALLER_IDS, "[]");
                editor.putString(IncomingSubAppReceiver.KEY_DISMISSED_TRUECALLER_IDS, "[]");
            }
            editor.apply();
            ret.put("recordsJson", pending);
            ret.put("readIdsJson", readIds);
            ret.put("dismissedIdsJson", dismissedIds);
        } catch (Exception e) {
            ret.put("recordsJson", "[]");
            ret.put("readIdsJson", "[]");
            ret.put("dismissedIdsJson", "[]");
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void pushNativeSyncEntries(PluginCall call) {
        final Context context = getContext();
        final String entriesJson = call.getString("entriesJson", "{}");
        final boolean seedOnly = Boolean.TRUE.equals(call.getBoolean("seedOnly", false));
        if (context == null) {
            JSObject ret = new JSObject();
            ret.put("ok", false);
            call.resolve(ret);
            return;
        }
        final Context appCtx = context.getApplicationContext();
        SYNC_EXECUTOR.execute(() -> {
            JSObject ret = new JSObject();
            try {
                org.json.JSONObject incomingMap = new org.json.JSONObject(entriesJson != null ? entriesJson : "{}");
                String batchId = appCtx.getPackageName() + "-" + System.currentTimeMillis() + "-" + Math.abs(entriesJson != null ? entriesJson.hashCode() : 0);
                final int CHUNK_SIZE = 120_000;
                boolean anyUpdated = false;

                java.util.Iterator<String> keys = incomingMap.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    if (key == null || key.isEmpty()) continue;
                    org.json.JSONObject entry = incomingMap.optJSONObject(key);
                    if (entry == null || !entry.has("value")) continue;

                    String val = entry.optString("value", "");
                    long updatedAt = entry.optLong("updatedAt", System.currentTimeMillis());
                    int totalChunks = Math.max(1, (val.length() + CHUNK_SIZE - 1) / CHUNK_SIZE);

                    for (int i = 0; i < totalChunks; i++) {
                        int start = i * CHUNK_SIZE;
                        int end = Math.min(val.length(), start + CHUNK_SIZE);
                        String chunkData = start < val.length() ? val.substring(start, end) : "";

                        Bundle chunkExtras = new Bundle();
                        chunkExtras.putString("batchId", batchId);
                        chunkExtras.putString("key", key);
                        chunkExtras.putInt("chunkIndex", i);
                        chunkExtras.putInt("totalChunks", totalChunks);
                        chunkExtras.putString("chunkData", chunkData);
                        chunkExtras.putLong("updatedAt", updatedAt);
                        chunkExtras.putBoolean("seedOnly", seedOnly);

                        Bundle chunkResp = appCtx.getContentResolver().call(
                            CbeSyncContentProvider.CONTENT_URI,
                            CbeSyncContentProvider.METHOD_PUSH_CHUNK,
                            null,
                            chunkExtras
                        );
                        if (chunkResp != null && chunkResp.getBoolean("updated", false)) {
                            anyUpdated = true;
                        }
                    }
                }

                Bundle finishExtras = new Bundle();
                finishExtras.putString("batchId", batchId);
                finishExtras.putString("sourcePackage", appCtx.getPackageName());
                Bundle finishResp = appCtx.getContentResolver().call(
                    CbeSyncContentProvider.CONTENT_URI,
                    CbeSyncContentProvider.METHOD_FINISH_BATCH,
                    null,
                    finishExtras
                );
                boolean ok = finishResp != null && finishResp.getBoolean("ok", false);
                ret.put("ok", ok);
                ret.put("updated", anyUpdated || (finishResp != null && finishResp.getBoolean("updated", false)));
            } catch (Exception e) {
                ret.put("ok", false);
                ret.put("error", e.getMessage() != null ? e.getMessage() : "Sync provider unavailable");
            }
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void pullNativeSyncEntries(PluginCall call) {
        final Context context = getContext();
        if (context == null) {
            JSObject ret = new JSObject();
            ret.put("ok", false);
            ret.put("entriesJson", "{}");
            call.resolve(ret);
            return;
        }
        final Context appCtx = context.getApplicationContext();
        SYNC_EXECUTOR.execute(() -> {
            JSObject ret = new JSObject();
            try {
                // Stream directly over ParcelFileDescriptor (zero Binder 1MB size limit!)
                try (java.io.InputStream is = appCtx.getContentResolver().openInputStream(CbeSyncContentProvider.STORE_URI)) {
                    if (is != null) {
                        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                        byte[] buf = new byte[8192];
                        int n;
                        while ((n = is.read(buf)) != -1) {
                            baos.write(buf, 0, n);
                        }
                        String entriesJson = new String(baos.toByteArray(), java.nio.charset.StandardCharsets.UTF_8);
                        if (entriesJson.trim().isEmpty()) {
                            entriesJson = "{}";
                        }
                        ret.put("ok", true);
                        ret.put("entriesJson", entriesJson);
                        call.resolve(ret);
                        return;
                    }
                } catch (Exception ignored) {
                    // Fall back to METHOD_PULL_ALL if an older CBE APK does not support openFile yet
                }

                Bundle response = appCtx.getContentResolver().call(
                    CbeSyncContentProvider.CONTENT_URI,
                    CbeSyncContentProvider.METHOD_PULL_ALL,
                    null,
                    null
                );
                boolean ok = response != null && response.getBoolean("ok", false);
                String entriesJson = response != null ? response.getString("entriesJson", "{}") : "{}";
                ret.put("ok", ok);
                ret.put("entriesJson", entriesJson != null ? entriesJson : "{}");
            } catch (Exception e) {
                ret.put("ok", false);
                ret.put("entriesJson", "{}");
                ret.put("error", e.getMessage() != null ? e.getMessage() : "Sync provider unavailable");
            }
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void canDrawOverlays(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", TruecallerOverlayService.canDrawOverlays(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        Context context = getContext();
        JSObject ret = new JSObject();
        if (context == null) {
            ret.put("opened", false);
            call.resolve(ret);
            return;
        }
        if (TruecallerOverlayService.canDrawOverlays(context)) {
            ret.put("opened", false);
            ret.put("alreadyGranted", true);
            call.resolve(ret);
            return;
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + context.getPackageName())
                );
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                ret.put("opened", true);
                call.resolve(ret);
                return;
            }
        } catch (Exception e) {
            ret.put("error", e.getMessage());
        }
        ret.put("opened", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void setActiveTruecallerOverlay(PluginCall call) {
        Context context = getContext();
        JSObject ret = new JSObject();
        if (context == null) {
            ret.put("saved", false);
            call.resolve(ret);
            return;
        }
        String alertId = call.getString("alertId", "");
        String reference = call.getString("reference", "");
        String bankLabel = call.getString("bankLabel", "CBE");
        String actionLine = call.getString("actionLine", "");
        String amountLine = call.getString("amountLine", "ETB 0.00");
        String timeDisplay = call.getString("timeDisplay", "Now");
        boolean showImmediately = Boolean.TRUE.equals(call.getBoolean("showImmediately", false));

        TruecallerOverlayService.saveOverlayPayload(
            context,
            alertId,
            reference,
            bankLabel,
            actionLine,
            amountLine,
            timeDisplay
        );

        boolean canDraw = TruecallerOverlayService.canDrawOverlays(context);
        if (canDraw && (showImmediately || !MainActivity.isActivityInForeground())) {
            TruecallerOverlayService.showOverlay(
                context,
                alertId,
                reference,
                bankLabel,
                actionLine,
                amountLine,
                timeDisplay
            );
        }

        ret.put("saved", true);
        ret.put("canDrawOverlays", canDraw);
        call.resolve(ret);
    }

    @PluginMethod
    public void hideTruecallerOverlay(PluginCall call) {
        Context context = getContext();
        if (context != null) {
            TruecallerOverlayService.hideAndClearOverlay(context);
        }
        JSObject ret = new JSObject();
        ret.put("hidden", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void clearTruecallerNotifications(PluginCall call) {
        Context context = getContext();
        if (context != null) {
            TruecallerOverlayService.hideAndClearOverlay(context);
            try {
                android.content.SharedPreferences prefs = context.getSharedPreferences(
                    IncomingSubAppReceiver.PREFS_NAME,
                    Context.MODE_PRIVATE
                );
                org.json.JSONArray activeIds = new org.json.JSONArray(
                    prefs.getString(IncomingSubAppReceiver.KEY_ACTIVE_TC_NOTIF_IDS, "[]")
                );
                androidx.core.app.NotificationManagerCompat nm =
                    androidx.core.app.NotificationManagerCompat.from(context);
                for (int i = 0; i < activeIds.length(); i++) {
                    int id = activeIds.optInt(i, -1);
                    if (id > 0) {
                        nm.cancel(id);
                    }
                }
                prefs.edit().putString(IncomingSubAppReceiver.KEY_ACTIVE_TC_NOTIF_IDS, "[]").apply();
            } catch (Exception ignored) {
            }

            // If CBE APK dismissed/marked read, also sync-clear standalone Truecaller APK's floating overlay & notification
            if (!"et.cbe.truecaller".equals(context.getPackageName())
                && checkPackageInstalled(context, "et.cbe.truecaller")) {
                try {
                    Intent clearIntent = new Intent(IncomingSubAppReceiver.ACTION_TRUECALLER_CLEAR_OVERLAY);
                    clearIntent.setComponent(new android.content.ComponentName(
                        "et.cbe.truecaller",
                        "et.cbe.tanadigitalbank.IncomingSubAppReceiver"
                    ));
                    clearIntent.setPackage("et.cbe.truecaller");
                    clearIntent.addFlags(Intent.FLAG_INCLUDE_STOPPED_PACKAGES);
                    context.sendBroadcast(clearIntent);
                } catch (Exception ignored) {
                }
            }
        }
        JSObject ret = new JSObject();
        ret.put("cleared", true);
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

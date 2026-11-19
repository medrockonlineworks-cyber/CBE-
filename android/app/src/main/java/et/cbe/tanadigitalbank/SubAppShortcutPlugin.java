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

package et.cbe.tanadigitalbank;

import android.content.ComponentName;
import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import org.json.JSONObject;

/**
 * Shared cross-APK state ContentProvider hosted strictly by the CBE Mobile Banking APK
 * (authority: et.cbe.tanadigitalbank.syncprovider).
 *
 * Allows standalone sibling APKs (Messages, Truecaller, Phone) and CBE Mobile Banking to stay
 * 100% bidirectionally synchronized offline and in real time (accounts, balances, active user,
 * transactions, SMS messages, Truecaller alerts/pop-downs, and Phone *889# history).
 */
public class CbeSyncContentProvider extends ContentProvider {

    public static final String AUTHORITY = "et.cbe.tanadigitalbank.syncprovider";
    public static final Uri CONTENT_URI = Uri.parse("content://" + AUTHORITY);
    public static final String METHOD_PULL_ALL = "pullAll";
    public static final String METHOD_PUSH_PATCH = "pushPatch";

    private static final String SYNC_PREFS_NAME = "cbe_cross_apk_sync_store_v1";

    private static final Set<String> TRUSTED_PACKAGES = new HashSet<>(Arrays.asList(
        "et.cbe.tanadigitalbank",
        "et.cbe.messages",
        "et.cbe.truecaller",
        "et.cbe.phone"
    ));

    @Override
    public boolean onCreate() {
        return true;
    }

    private boolean isCallerTrusted(Context context) {
        String callingPkg = getCallingPackage();
        if (callingPkg == null || callingPkg.isEmpty()) {
            return true;
        }
        if (context != null && callingPkg.equals(context.getPackageName())) {
            return true;
        }
        return TRUSTED_PACKAGES.contains(callingPkg);
    }

    @Override
    public Bundle call(String method, String arg, Bundle extras) {
        Context context = getContext();
        Bundle result = new Bundle();
        if (context == null || !isCallerTrusted(context)) {
            result.putBoolean("ok", false);
            return result;
        }

        SharedPreferences prefs = context.getSharedPreferences(SYNC_PREFS_NAME, Context.MODE_PRIVATE);

        if (METHOD_PULL_ALL.equals(method)) {
            try {
                JSONObject out = new JSONObject();
                Map<String, ?> all = prefs.getAll();
                if (all != null) {
                    for (Map.Entry<String, ?> entry : all.entrySet()) {
                        String key = entry.getKey();
                        Object rawVal = entry.getValue();
                        if (key == null || !(rawVal instanceof String)) continue;
                        try {
                            JSONObject item = new JSONObject((String) rawVal);
                            out.put(key, item);
                        } catch (Exception ignored) {
                        }
                    }
                }
                result.putBoolean("ok", true);
                result.putString("entriesJson", out.toString());
            } catch (Exception e) {
                result.putBoolean("ok", false);
                result.putString("entriesJson", "{}");
            }
            return result;
        }

        if (METHOD_PUSH_PATCH.equals(method)) {
            try {
                String entriesJson = extras != null ? extras.getString("entriesJson", "{}") : "{}";
                String sourcePackage = extras != null ? extras.getString("sourcePackage", "") : "";
                boolean seedOnly = extras != null && extras.getBoolean("seedOnly", false);

                if (sourcePackage == null || sourcePackage.isEmpty()) {
                    String calling = getCallingPackage();
                    sourcePackage = calling != null ? calling : context.getPackageName();
                }

                JSONObject incomingMap = new JSONObject(entriesJson != null ? entriesJson : "{}");
                SharedPreferences.Editor editor = prefs.edit();
                boolean anyWritten = false;

                Iterator<String> keys = incomingMap.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    if (key == null || key.isEmpty()) continue;
                    JSONObject incomingEntry = incomingMap.optJSONObject(key);
                    if (incomingEntry == null || !incomingEntry.has("value")) continue;

                    String incomingVal = incomingEntry.optString("value", "");
                    // Guard against oversized payloads exceeding Binder IPC limits
                    if (incomingVal.length() > 400_000) continue;

                    long incomingTs = incomingEntry.optLong("updatedAt", System.currentTimeMillis());
                    String existingRaw = prefs.getString(key, null);

                    if (existingRaw != null) {
                        if (seedOnly) {
                            continue;
                        }
                        try {
                            JSONObject existingObj = new JSONObject(existingRaw);
                            long existingTs = existingObj.optLong("updatedAt", 0L);
                            String existingVal = existingObj.optString("value", "");
                            if (incomingTs < existingTs) {
                                continue;
                            }
                            if (incomingTs == existingTs && incomingVal.equals(existingVal)) {
                                continue;
                            }
                        } catch (Exception ignored) {
                        }
                    }

                    JSONObject toStore = new JSONObject();
                    toStore.put("value", incomingVal);
                    toStore.put("updatedAt", incomingTs);
                    editor.putString(key, toStore.toString());
                    anyWritten = true;
                }

                if (anyWritten) {
                    editor.commit();
                    broadcastSyncToSiblings(context, sourcePackage);
                }

                result.putBoolean("ok", true);
                result.putBoolean("updated", anyWritten);
            } catch (Exception e) {
                result.putBoolean("ok", false);
                result.putString("error", e.getMessage());
            }
            return result;
        }

        result.putBoolean("ok", false);
        return result;
    }

    private void broadcastSyncToSiblings(Context context, String sourcePackage) {
        String myPkg = context.getPackageName();
        for (String targetPkg : TRUSTED_PACKAGES) {
            if (targetPkg.equals(sourcePackage)) {
                continue;
            }
            if (targetPkg.equals(myPkg)) {
                // Directly notify CBE's own WebView if a standalone APK pushed a change into CBE!
                MainActivity.notifyNativeStateSynced();
                continue;
            }
            try {
                context.getPackageManager().getPackageInfo(targetPkg, 0);
                Intent intent = new Intent(CbeStateSyncReceiver.ACTION_STATE_SYNCED);
                intent.setComponent(new ComponentName(
                    targetPkg,
                    "et.cbe.tanadigitalbank.CbeStateSyncReceiver"
                ));
                intent.setPackage(targetPkg);
                intent.putExtra("sourcePackage", sourcePackage);
                context.sendBroadcast(intent);
            } catch (Exception ignored) {
                // Package not installed on this device
            }
        }
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        return null;
    }

    @Override
    public String getType(Uri uri) {
        return "application/json";
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        return null;
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        return 0;
    }
}

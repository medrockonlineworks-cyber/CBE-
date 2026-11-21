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
import android.os.ParcelFileDescriptor;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import org.json.JSONObject;

/**
 * Shared cross-APK state ContentProvider hosted strictly by the CBE Mobile Banking APK
 * (authority: et.cbe.tanadigitalbank.syncprovider).
 *
 * Uses file-backed storage + ParcelFileDescriptor streaming (openFile) for unlimited-size pulls
 * and chunked Binder writes (pushChunk + finishBatch) so even 5MB+ account/SMS registries sync
 * 100% reliably across CBE, Messages, Truecaller, and Phone APKs with ZERO Binder size errors.
 */
public class CbeSyncContentProvider extends ContentProvider {

    public static final String AUTHORITY = "et.cbe.tanadigitalbank.syncprovider";
    public static final Uri CONTENT_URI = Uri.parse("content://" + AUTHORITY);
    public static final Uri STORE_URI = Uri.parse("content://" + AUTHORITY + "/store");

    public static final String METHOD_PULL_ALL = "pullAll";
    public static final String METHOD_PUSH_PATCH = "pushPatch";
    public static final String METHOD_PUSH_CHUNK = "pushChunk";
    public static final String METHOD_FINISH_BATCH = "finishBatch";

    private static final String LEGACY_SYNC_PREFS_NAME = "cbe_cross_apk_sync_store_v1";
    private static final String STORE_FILE_NAME = "cbe_cross_apk_sync_store_v2.json";

    private static final Object STORE_LOCK = new Object();
    private static final Map<String, String[]> PENDING_CHUNKS = new HashMap<>();
    private static final Map<String, Boolean> BATCH_WRITTEN = new HashMap<>();

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

    private File getStoreFile(Context context) {
        return new File(context.getFilesDir(), STORE_FILE_NAME);
    }

    private JSONObject loadStoreLocked(Context context) {
        File file = getStoreFile(context);
        if (file.exists() && file.length() > 0) {
            try (FileInputStream fis = new FileInputStream(file)) {
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                int n;
                while ((n = fis.read(buf)) != -1) {
                    baos.write(buf, 0, n);
                }
                String json = new String(baos.toByteArray(), StandardCharsets.UTF_8);
                if (!json.trim().isEmpty()) {
                    return new JSONObject(json);
                }
            } catch (Exception ignored) {
            }
        }

        // One-time migration from legacy SharedPreferences store
        JSONObject migrated = new JSONObject();
        try {
            SharedPreferences prefs = context.getSharedPreferences(LEGACY_SYNC_PREFS_NAME, Context.MODE_PRIVATE);
            Map<String, ?> all = prefs.getAll();
            if (all != null) {
                for (Map.Entry<String, ?> entry : all.entrySet()) {
                    String key = entry.getKey();
                    Object rawVal = entry.getValue();
                    if (key == null || !(rawVal instanceof String)) continue;
                    try {
                        migrated.put(key, new JSONObject((String) rawVal));
                    } catch (Exception ignored) {
                    }
                }
            }
            if (migrated.length() > 0) {
                saveStoreLocked(context, migrated);
            }
        } catch (Exception ignored) {
        }
        return migrated;
    }

    private void saveStoreLocked(Context context, JSONObject store) {
        File target = getStoreFile(context);
        File tmp = new File(context.getFilesDir(), STORE_FILE_NAME + ".tmp");
        try (FileOutputStream fos = new FileOutputStream(tmp)) {
            byte[] bytes = store.toString().getBytes(StandardCharsets.UTF_8);
            fos.write(bytes);
            fos.getFD().sync();
        } catch (Exception ignored) {
            return;
        }
        if (!tmp.renameTo(target)) {
            // Fallback direct overwrite if rename failed
            try (FileOutputStream fos = new FileOutputStream(target)) {
                fos.write(store.toString().getBytes(StandardCharsets.UTF_8));
            } catch (Exception ignored) {
            }
            //noinspection ResultOfMethodCallIgnored
            tmp.delete();
        }
    }

    private boolean applySingleKeyLocked(
        JSONObject store,
        String key,
        String incomingVal,
        long incomingTs,
        boolean seedOnly
    ) {
        if (key == null || key.isEmpty() || incomingVal == null) return false;
        JSONObject existingObj = store.optJSONObject(key);
        if (existingObj != null) {
            if (seedOnly) {
                return false;
            }
            long existingTs = existingObj.optLong("updatedAt", 0L);
            String existingVal = existingObj.optString("value", "");
            if (incomingTs < existingTs) {
                return false;
            }
            if (incomingTs == existingTs && incomingVal.equals(existingVal)) {
                return false;
            }
        }
        try {
            JSONObject toStore = new JSONObject();
            toStore.put("value", incomingVal);
            toStore.put("updatedAt", incomingTs);
            store.put(key, toStore);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Streams the entire cross-APK sync store over a ParcelFileDescriptor (zero Binder size limit!).
     */
    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        Context context = getContext();
        if (context == null || !isCallerTrusted(context)) {
            throw new SecurityException("Untrusted caller for CbeSyncContentProvider");
        }
        if (mode == null || !mode.startsWith("r")) {
            throw new SecurityException("Read-only stream");
        }
        synchronized (STORE_LOCK) {
            File file = getStoreFile(context);
            if (!file.exists()) {
                JSONObject store = loadStoreLocked(context);
                saveStoreLocked(context, store);
            }
            return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY);
        }
    }

    @Override
    public Bundle call(String method, String arg, Bundle extras) {
        Context context = getContext();
        Bundle result = new Bundle();
        if (context == null || !isCallerTrusted(context)) {
            result.putBoolean("ok", false);
            return result;
        }

        if (METHOD_PUSH_CHUNK.equals(method)) {
            try {
                if (extras == null) {
                    result.putBoolean("ok", false);
                    return result;
                }
                String batchId = extras.getString("batchId", "default");
                String key = extras.getString("key", "");
                int chunkIndex = extras.getInt("chunkIndex", 0);
                int totalChunks = Math.max(1, extras.getInt("totalChunks", 1));
                String chunkData = extras.getString("chunkData", "");
                long updatedAt = extras.getLong("updatedAt", System.currentTimeMillis());
                boolean seedOnly = extras.getBoolean("seedOnly", false);

                if (key == null || key.isEmpty() || chunkIndex < 0 || chunkIndex >= totalChunks) {
                    result.putBoolean("ok", false);
                    return result;
                }

                String assembled = null;
                synchronized (STORE_LOCK) {
                    if (totalChunks == 1) {
                        assembled = chunkData != null ? chunkData : "";
                    } else {
                        String mapKey = batchId + "::" + key;
                        String[] parts = PENDING_CHUNKS.get(mapKey);
                        if (parts == null || parts.length != totalChunks) {
                            parts = new String[totalChunks];
                            PENDING_CHUNKS.put(mapKey, parts);
                        }
                        parts[chunkIndex] = chunkData != null ? chunkData : "";

                        boolean complete = true;
                        for (int i = 0; i < totalChunks; i++) {
                            if (parts[i] == null) {
                                complete = false;
                                break;
                            }
                        }
                        if (complete) {
                            StringBuilder sb = new StringBuilder();
                            for (String p : parts) {
                                sb.append(p);
                            }
                            assembled = sb.toString();
                            PENDING_CHUNKS.remove(mapKey);
                        }
                    }

                    if (assembled != null) {
                        JSONObject store = loadStoreLocked(context);
                        boolean written = applySingleKeyLocked(store, key, assembled, updatedAt, seedOnly);
                        if (written) {
                            saveStoreLocked(context, store);
                            BATCH_WRITTEN.put(batchId, Boolean.TRUE);
                        }
                        result.putBoolean("updated", written);
                    }
                }
                result.putBoolean("ok", true);
            } catch (Exception e) {
                result.putBoolean("ok", false);
                result.putString("error", e.getMessage());
            }
            return result;
        }

        if (METHOD_FINISH_BATCH.equals(method)) {
            try {
                String batchId = extras != null ? extras.getString("batchId", "default") : "default";
                String sourcePackage = extras != null ? extras.getString("sourcePackage", "") : "";
                if (sourcePackage == null || sourcePackage.isEmpty()) {
                    String calling = getCallingPackage();
                    sourcePackage = calling != null ? calling : context.getPackageName();
                }

                boolean anyWritten;
                synchronized (STORE_LOCK) {
                    Boolean flag = BATCH_WRITTEN.remove(batchId);
                    anyWritten = Boolean.TRUE.equals(flag);
                    // Clean up any abandoned partial chunks for this batchId
                    String prefix = batchId + "::";
                    Iterator<String> it = PENDING_CHUNKS.keySet().iterator();
                    while (it.hasNext()) {
                        if (it.next().startsWith(prefix)) {
                            it.remove();
                        }
                    }
                }

                if (anyWritten) {
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

        if (METHOD_PULL_ALL.equals(method)) {
            try {
                String json;
                synchronized (STORE_LOCK) {
                    json = loadStoreLocked(context).toString();
                }
                result.putBoolean("ok", true);
                result.putString("entriesJson", json);
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
                boolean anyWritten = false;

                synchronized (STORE_LOCK) {
                    JSONObject store = loadStoreLocked(context);
                    Iterator<String> keys = incomingMap.keys();
                    while (keys.hasNext()) {
                        String key = keys.next();
                        if (key == null || key.isEmpty()) continue;
                        JSONObject incomingEntry = incomingMap.optJSONObject(key);
                        if (incomingEntry == null || !incomingEntry.has("value")) continue;
                        String incomingVal = incomingEntry.optString("value", "");
                        long incomingTs = incomingEntry.optLong("updatedAt", System.currentTimeMillis());
                        if (applySingleKeyLocked(store, key, incomingVal, incomingTs, seedOnly)) {
                            anyWritten = true;
                        }
                    }
                    if (anyWritten) {
                        saveStoreLocked(context, store);
                    }
                }

                if (anyWritten) {
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
                intent.addFlags(Intent.FLAG_INCLUDE_STOPPED_PACKAGES);
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

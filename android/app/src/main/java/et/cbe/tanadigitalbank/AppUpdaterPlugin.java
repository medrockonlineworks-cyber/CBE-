package et.cbe.tanadigitalbank;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import androidx.core.content.pm.PackageInfoCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;

/**
 * AppUpdaterPlugin
 *
 * Native Android APK update downloader, SHA-256 & signing-certificate verifier,
 * and FileProvider-based system installer launcher.
 *
 * Security invariants:
 * 1. Only downloads over HTTPS from allowlisted GitHub release domains (re-validated on every redirect).
 * 2. Stores APKs strictly inside app-private cache/updates/ with sanitized filenames and canonical path confinement.
 * 3. Refuses installation unless SHA-256 matches expectedSha256 (constant-time comparison).
 * 4. Refuses installation unless APK packageName matches the currently installed app,
 *    archive versionCode >= installed versionCode, and archive signing certificate matches
 *    the currently installed app's signing certificate.
 * 5. Never uninstalls the existing app and never bypasses Android's system installation confirmation UI.
 */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    private static final String UPDATES_SUBDIR = "updates";
    private static final int MAX_REDIRECTS = 6;
    private static final int CONNECT_TIMEOUT_MS = 15000;
    private static final int READ_TIMEOUT_MS = 30000;
    private static final long MAX_APK_SIZE_BYTES = 250L * 1024L * 1024L; // 250 MB safety cap
    private static final Pattern SAFE_APK_FILENAME = Pattern.compile("^[A-Za-z0-9._-]+\\.apk$");
    private static final Pattern SHA256_HEX = Pattern.compile("^[0-9a-fA-F]{64}$");

    private final ExecutorService downloadExecutor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean downloadInProgress = new AtomicBoolean(false);
    private final AtomicBoolean cancelRequested = new AtomicBoolean(false);

    @Override
    protected void handleOnDestroy() {
        cancelRequested.set(true);
        downloadExecutor.shutdownNow();
        super.handleOnDestroy();
    }

    @PluginMethod
    public void getInstalledAppInfo(PluginCall call) {
        try {
            Context ctx = getContext();
            PackageManager pm = ctx.getPackageManager();
            String packageName = ctx.getPackageName();
            PackageInfo pkgInfo = pm.getPackageInfo(packageName, 0);

            long versionCode = PackageInfoCompat.getLongVersionCode(pkgInfo);
            String versionName = pkgInfo.versionName != null ? pkgInfo.versionName : BuildConfig.VERSION_NAME;
            CharSequence label = pm.getApplicationLabel(pkgInfo.applicationInfo);
            String appName = label != null ? label.toString() : "App";

            String flavor = (BuildConfig.DEFAULT_START_VIEW != null && !BuildConfig.DEFAULT_START_VIEW.trim().isEmpty())
                ? BuildConfig.DEFAULT_START_VIEW.trim().toLowerCase(Locale.US)
                : "cbe";

            boolean canInstall = Build.VERSION.SDK_INT < Build.VERSION_CODES.O || pm.canRequestPackageInstalls();
            List<byte[]> installedCerts = getInstalledSigningCertDigests(ctx);
            String primaryCertHex = installedCerts.isEmpty() ? "" : bytesToHex(installedCerts.get(0));

            JSObject ret = new JSObject();
            ret.put("packageName", packageName);
            ret.put("appName", appName);
            ret.put("versionName", versionName);
            ret.put("versionCode", versionCode);
            ret.put("flavor", flavor);
            ret.put("expectedAssetName", BuildConfig.APK_ASSET_NAME);
            ret.put("githubRepo", BuildConfig.GITHUB_UPDATE_REPO);
            ret.put("signingCertSha256", primaryCertHex);
            ret.put("canRequestPackageInstalls", canInstall);
            ret.put("sdkInt", Build.VERSION.SDK_INT);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to read installed application metadata: " + e.getMessage());
        }
    }

    @PluginMethod
    public void canInstallPackages(PluginCall call) {
        try {
            Context ctx = getContext();
            boolean granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.O
                || ctx.getPackageManager().canRequestPackageInstalls();
            JSObject ret = new JSObject();
            ret.put("granted", granted);
            ret.put("sdkInt", Build.VERSION.SDK_INT);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Unable to inspect install permission: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        try {
            Context ctx = getContext();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Intent intent = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + ctx.getPackageName())
                );
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(intent);
            }
            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Unable to open Android unknown-apps permission screen: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {
        cancelRequested.set(true);
        JSObject ret = new JSObject();
        ret.put("cancelled", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void clearCachedApks(PluginCall call) {
        try {
            File updatesDir = getUpdatesDirectory(getContext());
            int deleted = cleanDirectory(updatesDir);
            JSObject ret = new JSObject();
            ret.put("deletedFiles", deleted);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Unable to clear cached update files: " + e.getMessage());
        }
    }

    @PluginMethod
    public void downloadAndVerifyApk(PluginCall call) {
        final String downloadUrl = safeTrim(call.getString("downloadUrl", ""));
        final String expectedSha256Raw = safeTrim(call.getString("expectedSha256", "")).toLowerCase(Locale.US);
        final String rawFileName = safeTrim(call.getString("fileName", ""));
        final String expectedPackageName = safeTrim(call.getString("expectedPackageName", ""));

        if (!isAllowedGitHubHttpsUrl(downloadUrl)) {
            call.reject("INVALID_URL: Update download URL must use a verified HTTPS source.");
            return;
        }

        final String expectedSha256 = expectedSha256Raw.startsWith("sha256:")
            ? expectedSha256Raw.substring("sha256:".length()).trim()
            : expectedSha256Raw;

        if (!SHA256_HEX.matcher(expectedSha256).matches()) {
            call.reject("MISSING_CHECKSUM: A valid 64-character SHA-256 checksum is required before downloading an update.");
            return;
        }

        final String safeFileName = sanitizeApkFileName(rawFileName);
        if (safeFileName == null) {
            call.reject("INVALID_FILENAME: APK filename must be a clean .apk basename.");
            return;
        }

        final Context ctx = getContext();
        final String installedPackage = ctx.getPackageName();
        if (!expectedPackageName.isEmpty() && !installedPackage.equals(expectedPackageName)) {
            call.reject("PACKAGE_MISMATCH: Update target package does not match this installed application.");
            return;
        }

        if (!downloadInProgress.compareAndSet(false, true)) {
            call.reject("DOWNLOAD_IN_PROGRESS: An update download is already running.");
            return;
        }

        cancelRequested.set(false);

        downloadExecutor.execute(() -> {
            File partFile = null;
            HttpURLConnection connection = null;
            try {
                File updatesDir = getUpdatesDirectory(ctx);
                cleanDirectory(updatesDir);

                File finalApkFile = resolveConfinedFile(updatesDir, safeFileName);
                partFile = resolveConfinedFile(updatesDir, safeFileName + ".part");

                emitProgress("connecting", 0, 0, -1);

                connection = openValidatedConnection(downloadUrl);
                int statusCode = connection.getResponseCode();
                if (statusCode < 200 || statusCode >= 300) {
                    throw new IOException("Update server responded with HTTP " + statusCode);
                }

                long contentLength = connection.getContentLengthLong();
                if (contentLength > MAX_APK_SIZE_BYTES) {
                    throw new SecurityException("APK size exceeds the maximum allowed safety limit.");
                }

                MessageDigest sha256Digest = MessageDigest.getInstance("SHA-256");
                long downloadedBytes = 0L;
                long lastEmitMs = 0L;
                int lastEmitPercent = -1;

                try (InputStream input = new BufferedInputStream(connection.getInputStream(), 32768);
                     FileOutputStream output = new FileOutputStream(partFile)) {
                    byte[] buffer = new byte[16384];
                    int read;
                    while ((read = input.read(buffer)) != -1) {
                        if (cancelRequested.get()) {
                            throw new InterruptedException("Update download was cancelled.");
                        }
                        downloadedBytes += read;
                        if (downloadedBytes > MAX_APK_SIZE_BYTES) {
                            throw new SecurityException("APK download exceeded maximum allowed size.");
                        }
                        output.write(buffer, 0, read);
                        sha256Digest.update(buffer, 0, read);

                        int percent = contentLength > 0
                            ? (int) Math.min(100L, (downloadedBytes * 100L) / contentLength)
                            : -1;
                        long now = System.currentTimeMillis();
                        if (now - lastEmitMs >= 140L || (percent >= 0 && Math.abs(percent - lastEmitPercent) >= 2)) {
                            lastEmitMs = now;
                            lastEmitPercent = percent;
                            emitProgress("downloading", Math.max(0, percent), downloadedBytes, contentLength);
                        }
                    }
                    output.flush();
                }

                emitProgress("verifying", 100, downloadedBytes, contentLength > 0 ? contentLength : downloadedBytes);

                // 1. Mandatory SHA-256 verification (constant-time byte comparison)
                byte[] actualHashBytes = sha256Digest.digest();
                byte[] expectedHashBytes = hexToBytes(expectedSha256);
                String actualSha256Hex = bytesToHex(actualHashBytes);
                if (!MessageDigest.isEqual(actualHashBytes, expectedHashBytes)) {
                    safeDelete(partFile);
                    call.reject("CHECKSUM_MISMATCH: Downloaded APK SHA-256 verification failed. Expected "
                        + expectedSha256.substring(0, 12) + "... got " + actualSha256Hex.substring(0, 12) + "...");
                    return;
                }

                // 2. Mandatory APK package ID, versionCode, and signing certificate compatibility verification
                ApkVerificationResult verification = verifyApkPackageAndSignature(ctx, partFile);
                if (!verification.valid) {
                    safeDelete(partFile);
                    call.reject(verification.errorCode + ": " + verification.errorMessage);
                    return;
                }

                // 3. Move verified APK into final confined location
                if (finalApkFile.exists()) {
                    safeDelete(finalApkFile);
                }
                if (!partFile.renameTo(finalApkFile)) {
                    copyFile(partFile, finalApkFile);
                    safeDelete(partFile);
                }
                partFile = null;

                emitProgress("verified", 100, downloadedBytes, downloadedBytes);

                JSObject result = new JSObject();
                result.put("verified", true);
                result.put("fileName", safeFileName);
                result.put("sha256", actualSha256Hex);
                result.put("packageName", verification.packageName);
                result.put("archiveVersionCode", verification.versionCode);
                result.put("archiveVersionName", verification.versionName);
                result.put("sizeBytes", downloadedBytes);
                call.resolve(result);
            } catch (InterruptedException ie) {
                safeDelete(partFile);
                call.reject("DOWNLOAD_CANCELLED: Update download cancelled.");
            } catch (Exception e) {
                safeDelete(partFile);
                call.reject("DOWNLOAD_FAILED: " + (e.getMessage() != null ? e.getMessage() : "Unable to download update."));
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
                downloadInProgress.set(false);
            }
        });
    }

    @PluginMethod
    public void installVerifiedApk(PluginCall call) {
        final String rawFileName = safeTrim(call.getString("fileName", ""));
        final String safeFileName = sanitizeApkFileName(rawFileName);
        if (safeFileName == null) {
            call.reject("INVALID_FILENAME: Cannot install an invalid APK filename.");
            return;
        }

        try {
            Context ctx = getContext();
            File updatesDir = getUpdatesDirectory(ctx);
            File apkFile = resolveConfinedFile(updatesDir, safeFileName);
            if (!apkFile.exists() || !apkFile.isFile()) {
                call.reject("APK_NOT_FOUND: Verified update file is no longer cached. Please download again.");
                return;
            }

            // Re-verify package identity and signing certificate right before launching installer
            ApkVerificationResult verification = verifyApkPackageAndSignature(ctx, apkFile);
            if (!verification.valid) {
                safeDelete(apkFile);
                call.reject(verification.errorCode + ": " + verification.errorMessage);
                return;
            }

            // On Android 8.0+ (API 26), check "Install unknown apps" permission before launching system installer
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !ctx.getPackageManager().canRequestPackageInstalls()) {
                JSObject ret = new JSObject();
                ret.put("started", false);
                ret.put("permissionRequired", true);
                call.resolve(ret);
                return;
            }

            String authority = ctx.getPackageName() + ".fileprovider";
            Uri apkUri = FileProvider.getUriForFile(ctx, authority, apkFile);

            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            ctx.startActivity(installIntent);

            JSObject ret = new JSObject();
            ret.put("started", true);
            ret.put("permissionRequired", false);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("INSTALL_LAUNCH_FAILED: " + (e.getMessage() != null ? e.getMessage() : "Could not open Android installer."));
        }
    }

    private void emitProgress(String stage, int percent, long downloadedBytes, long totalBytes) {
        JSObject data = new JSObject();
        data.put("stage", stage);
        data.put("percent", percent);
        data.put("downloadedBytes", downloadedBytes);
        data.put("totalBytes", totalBytes);
        notifyListeners("downloadProgress", data);
    }

    private HttpURLConnection openValidatedConnection(String initialUrl) throws IOException {
        String currentUrl = initialUrl;
        for (int redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
            if (!isAllowedGitHubHttpsUrl(currentUrl)) {
                throw new SecurityException("Blocked redirect to untrusted domain.");
            }
            URL url = new URL(currentUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
            conn.setReadTimeout(READ_TIMEOUT_MS);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Accept", "application/octet-stream");
            conn.setRequestProperty("User-Agent", "CBE-Android-Updater/1.0");
            conn.connect();

            int code = conn.getResponseCode();
            if (code == HttpURLConnection.HTTP_MOVED_PERM
                || code == HttpURLConnection.HTTP_MOVED_TEMP
                || code == HttpURLConnection.HTTP_SEE_OTHER
                || code == 307
                || code == 308) {
                String location = conn.getHeaderField("Location");
                conn.disconnect();
                if (location == null || location.trim().isEmpty()) {
                    throw new IOException("Redirect missing Location header.");
                }
                URL resolved = new URL(url, location.trim());
                currentUrl = resolved.toString();
                continue;
            }
            return conn;
        }
        throw new IOException("Too many redirects while downloading update.");
    }

    private static boolean isAllowedGitHubHttpsUrl(String urlStr) {
        if (urlStr == null || urlStr.trim().isEmpty()) return false;
        try {
            URL url = new URL(urlStr.trim());
            if (!"https".equalsIgnoreCase(url.getProtocol())) return false;
            String host = url.getHost();
            if (host == null || host.isEmpty()) return false;
            String lowerHost = host.toLowerCase(Locale.US);
            return "github.com".equals(lowerHost)
                || "api.github.com".equals(lowerHost)
                || "codeload.github.com".equals(lowerHost)
                || "objects.githubusercontent.com".equals(lowerHost)
                || "release-assets.githubusercontent.com".equals(lowerHost)
                || "github-releases.githubusercontent.com".equals(lowerHost)
                || lowerHost.endsWith(".githubusercontent.com");
        } catch (Exception e) {
            return false;
        }
    }

    private static String safeTrim(String raw) {
        return raw == null ? "" : raw.trim();
    }

    private static String sanitizeApkFileName(String raw) {
        if (raw == null) return null;
        String base = new File(raw.trim()).getName();
        if (!SAFE_APK_FILENAME.matcher(base).matches()) {
            return null;
        }
        if (base.contains("..") || base.startsWith(".")) {
            return null;
        }
        return base;
    }

    private static File getUpdatesDirectory(Context ctx) throws IOException {
        File dir = new File(ctx.getCacheDir(), UPDATES_SUBDIR);
        if (!dir.exists() && !dir.mkdirs()) {
            throw new IOException("Failed to create app update cache directory.");
        }
        return dir;
    }

    private static File resolveConfinedFile(File baseDir, String fileName) throws IOException {
        File candidate = new File(baseDir, fileName);
        String canonicalBase = baseDir.getCanonicalPath() + File.separator;
        String canonicalTarget = candidate.getCanonicalPath();
        if (!canonicalTarget.startsWith(canonicalBase)) {
            throw new SecurityException("Blocked path traversal outside app updates directory.");
        }
        return candidate;
    }

    private static int cleanDirectory(File dir) {
        int count = 0;
        if (dir == null || !dir.exists()) return 0;
        File[] files = dir.listFiles();
        if (files == null) return 0;
        for (File f : files) {
            if (f != null && f.isFile() && f.delete()) {
                count++;
            }
        }
        return count;
    }

    private static void safeDelete(File f) {
        if (f != null && f.exists()) {
            try {
                //noinspection ResultOfMethodCallIgnored
                f.delete();
            } catch (Exception ignored) {
            }
        }
    }

    private static void copyFile(File src, File dst) throws IOException {
        try (InputStream in = new FileInputStream(src);
             FileOutputStream out = new FileOutputStream(dst)) {
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) != -1) {
                out.write(buf, 0, n);
            }
            out.flush();
        }
    }

    private static final class ApkVerificationResult {
        final boolean valid;
        final String errorCode;
        final String errorMessage;
        final String packageName;
        final long versionCode;
        final String versionName;

        ApkVerificationResult(boolean valid, String errorCode, String errorMessage,
                              String packageName, long versionCode, String versionName) {
            this.valid = valid;
            this.errorCode = errorCode;
            this.errorMessage = errorMessage;
            this.packageName = packageName;
            this.versionCode = versionCode;
            this.versionName = versionName;
        }
    }

    @SuppressWarnings("deprecation")
    private static ApkVerificationResult verifyApkPackageAndSignature(Context ctx, File apkFile) {
        try {
            PackageManager pm = ctx.getPackageManager();
            String installedPkgName = ctx.getPackageName();
            int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? PackageManager.GET_SIGNING_CERTIFICATES
                : PackageManager.GET_SIGNATURES;

            PackageInfo installedInfo = pm.getPackageInfo(installedPkgName, flags);
            long installedVersionCode = PackageInfoCompat.getLongVersionCode(installedInfo);

            PackageInfo archiveInfo = pm.getPackageArchiveInfo(apkFile.getAbsolutePath(), flags);
            if (archiveInfo == null) {
                return new ApkVerificationResult(
                    false,
                    "INVALID_APK",
                    "Downloaded file is not a valid Android APK package.",
                    "",
                    0,
                    ""
                );
            }

            String archivePkgName = archiveInfo.packageName != null ? archiveInfo.packageName : "";
            long archiveVersionCode = PackageInfoCompat.getLongVersionCode(archiveInfo);
            String archiveVersionName = archiveInfo.versionName != null ? archiveInfo.versionName : "";

            if (!installedPkgName.equals(archivePkgName)) {
                return new ApkVerificationResult(
                    false,
                    "PACKAGE_MISMATCH",
                    "APK package ID (" + archivePkgName + ") does not match this app (" + installedPkgName + ").",
                    archivePkgName,
                    archiveVersionCode,
                    archiveVersionName
                );
            }

            if (archiveVersionCode < installedVersionCode) {
                return new ApkVerificationResult(
                    false,
                    "DOWNGRADE_BLOCKED",
                    "APK versionCode (" + archiveVersionCode + ") is older than installed version (" + installedVersionCode + ").",
                    archivePkgName,
                    archiveVersionCode,
                    archiveVersionName
                );
            }

            List<byte[]> installedCertDigests = extractSigningCertDigests(installedInfo);
            List<byte[]> archiveCertDigests = extractSigningCertDigests(archiveInfo);

            // Fallback for vendor ROM quirks where GET_SIGNING_CERTIFICATES returns null on archive files
            if (archiveCertDigests.isEmpty() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                PackageInfo legacyArchiveInfo = pm.getPackageArchiveInfo(
                    apkFile.getAbsolutePath(),
                    PackageManager.GET_SIGNATURES
                );
                archiveCertDigests = extractSigningCertDigests(legacyArchiveInfo);
            }
            if (installedCertDigests.isEmpty() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                PackageInfo legacyInstalledInfo = pm.getPackageInfo(
                    installedPkgName,
                    PackageManager.GET_SIGNATURES
                );
                installedCertDigests = extractSigningCertDigests(legacyInstalledInfo);
            }

            if (installedCertDigests.isEmpty() || archiveCertDigests.isEmpty()) {
                return new ApkVerificationResult(
                    false,
                    "SIGNATURE_MISSING",
                    "Could not extract APK signing certificates for verification.",
                    archivePkgName,
                    archiveVersionCode,
                    archiveVersionName
                );
            }

            boolean signatureCompatible = false;
            for (byte[] installedCert : installedCertDigests) {
                for (byte[] archiveCert : archiveCertDigests) {
                    if (MessageDigest.isEqual(installedCert, archiveCert)) {
                        signatureCompatible = true;
                        break;
                    }
                }
                if (signatureCompatible) break;
            }

            if (!signatureCompatible) {
                return new ApkVerificationResult(
                    false,
                    "SIGNATURE_MISMATCH",
                    "APK signing certificate does not match the installed application. Android requires the same signing key to update without losing data.",
                    archivePkgName,
                    archiveVersionCode,
                    archiveVersionName
                );
            }

            return new ApkVerificationResult(
                true,
                "",
                "",
                archivePkgName,
                archiveVersionCode,
                archiveVersionName
            );
        } catch (Exception e) {
            return new ApkVerificationResult(
                false,
                "VERIFICATION_ERROR",
                "Failed to verify APK package integrity: " + e.getMessage(),
                "",
                0,
                ""
            );
        }
    }

    @SuppressWarnings("deprecation")
    private static List<byte[]> getInstalledSigningCertDigests(Context ctx) {
        try {
            PackageManager pm = ctx.getPackageManager();
            int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? PackageManager.GET_SIGNING_CERTIFICATES
                : PackageManager.GET_SIGNATURES;
            PackageInfo info = pm.getPackageInfo(ctx.getPackageName(), flags);
            return extractSigningCertDigests(info);
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    @SuppressWarnings("deprecation")
    private static List<byte[]> extractSigningCertDigests(PackageInfo pkgInfo) throws Exception {
        List<byte[]> digests = new ArrayList<>();
        if (pkgInfo == null) return digests;

        Signature[] sigs = null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && pkgInfo.signingInfo != null) {
            SigningInfo signingInfo = pkgInfo.signingInfo;
            if (signingInfo.hasMultipleSigners()) {
                sigs = signingInfo.getApkContentsSigners();
            } else {
                sigs = signingInfo.getSigningCertificateHistory();
            }
        }
        if ((sigs == null || sigs.length == 0) && pkgInfo.signatures != null) {
            sigs = pkgInfo.signatures;
        }
        if (sigs == null) return digests;

        MessageDigest md = MessageDigest.getInstance("SHA-256");
        for (Signature sig : sigs) {
            if (sig != null) {
                byte[] certDigest = md.digest(sig.toByteArray());
                digests.add(certDigest);
                md.reset();
            }
        }
        return digests;
    }

    private static String bytesToHex(byte[] bytes) {
        if (bytes == null) return "";
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format(Locale.US, "%02x", b & 0xFF));
        }
        return sb.toString();
    }

    private static byte[] hexToBytes(String hex) {
        int len = hex.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
                + Character.digit(hex.charAt(i + 1), 16));
        }
        return data;
    }
}

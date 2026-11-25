import { Capacitor, registerPlugin, PluginListenerHandle } from '@capacitor/core';

export type UpdaterAppId = 'cbe' | 'sms' | 'truecaller' | 'phone';

export interface InstalledAppInfo {
  packageName: string;
  appName: string;
  versionName: string;
  versionCode: number;
  flavor: UpdaterAppId;
  expectedAssetName: string;
  githubRepo: string;
  signingCertSha256: string;
  canRequestPackageInstalls: boolean;
  sdkInt: number;
}

export interface DownloadProgressEvent {
  stage: 'connecting' | 'downloading' | 'verifying' | 'verified';
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
}

export interface DownloadVerifyResult {
  verified: boolean;
  fileName: string;
  sha256: string;
  packageName: string;
  archiveVersionCode: number;
  archiveVersionName: string;
  sizeBytes: number;
}

export interface InstallLaunchResult {
  started: boolean;
  permissionRequired: boolean;
}

interface AppUpdaterPluginInterface {
  getInstalledAppInfo(): Promise<InstalledAppInfo>;
  canInstallPackages(): Promise<{ granted: boolean; sdkInt: number }>;
  openInstallPermissionSettings(): Promise<{ opened: boolean }>;
  downloadAndVerifyApk(options: {
    downloadUrl: string;
    expectedSha256: string;
    fileName: string;
    expectedPackageName: string;
  }): Promise<DownloadVerifyResult>;
  installVerifiedApk(options: { fileName: string }): Promise<InstallLaunchResult>;
  cancelDownload(): Promise<{ cancelled: boolean }>;
  clearCachedApks(): Promise<{ deletedFiles: number }>;
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (event: DownloadProgressEvent) => void
  ): Promise<PluginListenerHandle>;
}

const AppUpdaterNative = registerPlugin<AppUpdaterPluginInterface>('AppUpdater');

interface AppApkMapping {
  appId: UpdaterAppId;
  displayName: string;
  packageName: string;
  preferredAssets: string[];
}

export const APP_APK_MAPPINGS: Record<string, AppApkMapping> = {
  'et.cbe.tanadigitalbank': {
    appId: 'cbe',
    displayName: 'CBE Mobile Banking',
    packageName: 'et.cbe.tanadigitalbank',
    preferredAssets: [
      'CBE-Mobile-Banking-debug.apk',
      'CBE-Mobile-Banking-release.apk',
      'CBE-Mobile-Banking.apk',
    ],
  },
  'et.cbe.messages': {
    appId: 'sms',
    displayName: 'Messages',
    packageName: 'et.cbe.messages',
    preferredAssets: [
      'Messages-SMS-debug.apk',
      'Messages-SMS-release.apk',
      'Messages-SMS.apk',
    ],
  },
  'et.cbe.phone': {
    appId: 'phone',
    displayName: 'Phone',
    packageName: 'et.cbe.phone',
    preferredAssets: [
      'Phone-debug.apk',
      'Phone-release.apk',
      'Phone.apk',
    ],
  },
  'et.cbe.truecaller': {
    appId: 'truecaller',
    displayName: 'Truecaller',
    packageName: 'et.cbe.truecaller',
    preferredAssets: [
      'Truecaller-debug.apk',
      'Truecaller-release.apk',
      'Truecaller.apk',
    ],
  },
};

export interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
  digest?: string | null;
  content_type?: string;
}

export interface GitHubReleasePayload {
  tag_name: string;
  name?: string;
  body?: string;
  published_at?: string;
  html_url?: string;
  draft?: boolean;
  prerelease?: boolean;
  assets: GitHubReleaseAsset[];
}

export interface AvailableUpdateInfo {
  appId: UpdaterAppId;
  appName: string;
  packageName: string;
  currentVersionName: string;
  currentVersionCode: number;
  latestVersionName: string;
  latestVersionCode: number | null;
  tagName: string;
  releaseTitle: string;
  releaseNotes: string;
  publishedAt: string;
  assetName: string;
  downloadUrl: string;
  assetSizeBytes: number;
  expectedSha256: string;
  releaseHtmlUrl: string;
  versionKey: string;
}

export type UpdateCheckResult =
  | { status: 'update_available'; update: AvailableUpdateInfo; installed: InstalledAppInfo }
  | { status: 'up_to_date'; installed: InstalledAppInfo; latestVersion: string }
  | { status: 'not_native'; message: string }
  | { status: 'not_configured'; installed?: InstalledAppInfo; message: string }
  | { status: 'offline'; message: string }
  | { status: 'rate_limited'; retryAfterMs: number; message: string }
  | { status: 'error'; message: string };

interface EmbeddedReleaseMetadata {
  versionCode?: number;
  versionName?: string;
  apks?: Record<
    string,
    {
      packageName?: string;
      sha256?: string;
      sizeBytes?: number;
      versionCode?: number;
      versionName?: string;
    }
  >;
}

const STORAGE_REPO_OVERRIDE = 'cbe_github_update_repo';
const STORAGE_ETAG_PREFIX = 'cbe_updater_etag_v1_';
const STORAGE_RELEASE_CACHE_PREFIX = 'cbe_updater_release_cache_v1_';
const STORAGE_RATE_LIMIT_UNTIL = 'cbe_updater_rate_limit_until_v1';
const STORAGE_LAST_CHECK_AT = 'cbe_updater_last_check_at_v1';
const STORAGE_SNOOZED_VERSION = 'cbe_updater_snoozed_v1';

const SNOOZE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours when user clicks LATER
const FETCH_TIMEOUT_MS = 12000;
const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;

function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

function isAllowedGitHubDownloadUrl(rawUrl: string): boolean {
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'github.com' ||
      host === 'api.github.com' ||
      host === 'objects.githubusercontent.com' ||
      host === 'release-assets.githubusercontent.com' ||
      host === 'github-releases.githubusercontent.com' ||
      host.endsWith('.githubusercontent.com')
    );
  } catch {
    return false;
  }
}

export function normalizeRepoSlug(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = raw
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');
  return REPO_PATTERN.test(trimmed) ? trimmed : '';
}

export function getSavedGithubRepoOverride(): string {
  try {
    return normalizeRepoSlug(localStorage.getItem(STORAGE_REPO_OVERRIDE));
  } catch {
    return '';
  }
}

export function saveGithubRepoOverride(repo: string): string {
  const clean = normalizeRepoSlug(repo);
  try {
    if (clean) {
      localStorage.setItem(STORAGE_REPO_OVERRIDE, clean);
    } else {
      localStorage.removeItem(STORAGE_REPO_OVERRIDE);
    }
  } catch {}
  return clean;
}

export function resolveGithubRepo(installed?: InstalledAppInfo | null): string {
  const override = getSavedGithubRepoOverride();
  if (override) return override;

  const nativeRepo = normalizeRepoSlug(installed?.githubRepo);
  if (nativeRepo) return nativeRepo;

  const envRepo = normalizeRepoSlug(
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_GITHUB_REPO
  );
  if (envRepo) return envRepo;

  return '';
}

function parseEmbeddedMetadata(body: string): EmbeddedReleaseMetadata | null {
  if (!body) return null;
  const match = body.match(/<!--\s*UPDATE_METADATA\s*([\s\S]*?)\s*-->/i);
  if (!match || !match[1]) return null;
  try {
    const parsed = JSON.parse(match[1].trim());
    if (parsed && typeof parsed === 'object') {
      return parsed as EmbeddedReleaseMetadata;
    }
  } catch {}
  return null;
}

function cleanReleaseNotes(body: string): string {
  if (!body) return 'Bug fixes, security enhancements, and performance improvements.';
  const stripped = body
    .replace(/<!--\s*UPDATE_METADATA[\s\S]*?-->/gi, '')
    .replace(/\r\n/g, '\n')
    .trim();
  return stripped || 'Bug fixes, security enhancements, and performance improvements.';
}

function normalizeSha256(raw: string | null | undefined): string {
  if (!raw) return '';
  const cleaned = raw.trim().replace(/^sha256:/i, '').trim().toLowerCase();
  return SHA256_PATTERN.test(cleaned) ? cleaned : '';
}

function extractSha256FromReleaseBody(body: string, assetName: string): string {
  if (!body || !assetName) return '';
  const escaped = assetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`SHA256\\s*\\(\\s*${escaped}\\s*\\)\\s*[:=]\\s*([0-9a-fA-F]{64})`, 'i'),
    new RegExp(`${escaped}\\s*[:|\\-]\\s*(?:sha256:)?([0-9a-fA-F]{64})`, 'i'),
    new RegExp(`([0-9a-fA-F]{64})\\s+\\*?${escaped}\\b`, 'i'),
  ];
  for (const re of patterns) {
    const m = body.match(re);
    if (m && m[1]) {
      const normalized = normalizeSha256(m[1]);
      if (normalized) return normalized;
    }
  }
  return '';
}

function extractVersionCode(
  release: GitHubReleasePayload,
  metadata: EmbeddedReleaseMetadata | null,
  assetName: string
): number | null {
  const perApkCode = metadata?.apks?.[assetName]?.versionCode;
  if (typeof perApkCode === 'number' && Number.isFinite(perApkCode) && perApkCode > 0) {
    return Math.floor(perApkCode);
  }
  if (typeof metadata?.versionCode === 'number' && Number.isFinite(metadata.versionCode) && metadata.versionCode > 0) {
    return Math.floor(metadata.versionCode);
  }
  const body = release.body || '';
  const bodyMatch = body.match(/versionCode\s*[:=]\s*(\d+)/i);
  if (bodyMatch && bodyMatch[1]) {
    const parsed = parseInt(bodyMatch[1], 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function extractVersionName(
  release: GitHubReleasePayload,
  metadata: EmbeddedReleaseMetadata | null,
  assetName: string
): string {
  const perApkVer = metadata?.apks?.[assetName]?.versionName;
  if (typeof perApkVer === 'string' && perApkVer.trim()) {
    return perApkVer.trim().replace(/^v/i, '');
  }
  if (typeof metadata?.versionName === 'string' && metadata.versionName.trim()) {
    return metadata.versionName.trim().replace(/^v/i, '');
  }
  const tag = (release.tag_name || '').trim();
  const tagSemver = tag.match(/v?(\d+(?:\.\d+)+)/i);
  if (tagSemver && tagSemver[1]) {
    return tagSemver[1];
  }
  const titleSemver = (release.name || '').match(/v?(\d+(?:\.\d+)+)/i);
  if (titleSemver && titleSemver[1]) {
    return titleSemver[1];
  }
  return tag.replace(/^v/i, '') || '1.0.0';
}

export function compareSemver(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map((part) => {
        const n = parseInt(part.replace(/\D/g, ''), 10);
        return Number.isFinite(n) ? n : 0;
      });
  const pa = parse(a);
  const pb = parse(b);
  const maxLen = Math.max(pa.length, pb.length);
  for (let i = 0; i < maxLen; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

function isNewerVersion(
  installedCode: number,
  installedName: string,
  latestCode: number | null,
  latestName: string
): boolean {
  if (latestCode !== null && installedCode > 0) {
    if (latestCode > installedCode) return true;
    if (latestCode < installedCode) return false;
  }
  return compareSemver(latestName, installedName) > 0;
}

function matchAssetForInstalledApp(
  assets: GitHubReleaseAsset[],
  installed: InstalledAppInfo
): { asset: GitHubReleaseAsset; displayName: string; appId: UpdaterAppId } | null {
  const mapping = APP_APK_MAPPINGS[installed.packageName];
  const candidateNames: string[] = [];

  if (installed.expectedAssetName) {
    candidateNames.push(installed.expectedAssetName);
  }
  if (mapping) {
    for (const name of mapping.preferredAssets) {
      if (!candidateNames.includes(name)) {
        candidateNames.push(name);
      }
    }
  }

  for (const preferred of candidateNames) {
    const exact = assets.find(
      (a) =>
        a &&
        typeof a.name === 'string' &&
        a.name.toLowerCase() === preferred.toLowerCase() &&
        a.name.toLowerCase().endsWith('.apk')
    );
    if (exact) {
      return {
        asset: exact,
        displayName: mapping?.displayName || installed.appName,
        appId: mapping?.appId || installed.flavor || 'cbe',
      };
    }
  }

  return null;
}

function isSnoozedVersion(versionKey: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_SNOOZED_VERSION);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { versionKey?: string; until?: number };
    return parsed.versionKey === versionKey && typeof parsed.until === 'number' && Date.now() < parsed.until;
  } catch {
    return false;
  }
}

export function dismissUpdateLater(versionKey: string): void {
  try {
    localStorage.setItem(
      STORAGE_SNOOZED_VERSION,
      JSON.stringify({ versionKey, until: Date.now() + SNOOZE_DURATION_MS })
    );
  } catch {}
}

export function clearSnoozedUpdate(): void {
  try {
    localStorage.removeItem(STORAGE_SNOOZED_VERSION);
  } catch {}
}

export function getLastUpdateCheckTimestamp(): number {
  try {
    const raw = localStorage.getItem(STORAGE_LAST_CHECK_AT);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

async function fetchLatestGitHubRelease(
  repo: string,
  ignoreCache = false
): Promise<
  | { ok: true; release: GitHubReleasePayload; fromCache: boolean }
  | { ok: false; reason: 'offline' | 'rate_limited' | 'error'; retryAfterMs?: number; message: string }
> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, reason: 'offline', message: 'No internet connection.' };
  }

  // Respect GitHub API rate-limit backoff window
  if (!ignoreCache) {
    try {
      const rateLimitUntil = parseInt(localStorage.getItem(STORAGE_RATE_LIMIT_UNTIL) || '0', 10);
      if (Number.isFinite(rateLimitUntil) && Date.now() < rateLimitUntil) {
        const retryAfterMs = rateLimitUntil - Date.now();
        return {
          ok: false,
          reason: 'rate_limited',
          retryAfterMs,
          message: 'Update server busy. Please try again shortly.',
        };
      }
    } catch {}
  }

  const etagKey = STORAGE_ETAG_PREFIX + repo;
  const cacheKey = STORAGE_RELEASE_CACHE_PREFIX + repo;
  const cachedEtag = !ignoreCache ? localStorage.getItem(etagKey) || '' : '';

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  };
  if (cachedEtag) {
    headers['If-None-Match'] = cachedEtag;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
      cache: 'no-store',
    });

    if (response.status === 304) {
      const cachedJson = localStorage.getItem(cacheKey);
      if (cachedJson) {
        const cachedRelease = JSON.parse(cachedJson) as GitHubReleasePayload;
        return { ok: true, release: cachedRelease, fromCache: true };
      }
      // Cache missing despite 304 — refetch cleanly without ETag
      localStorage.removeItem(etagKey);
      return fetchLatestGitHubRelease(repo, true);
    }

    if (response.status === 403 || response.status === 429) {
      const remaining = response.headers.get('x-ratelimit-remaining');
      const resetEpochSec = parseInt(response.headers.get('x-ratelimit-reset') || '0', 10);
      const retryAfterSec = parseInt(response.headers.get('retry-after') || '0', 10);
      if (remaining === '0' || response.status === 429) {
        const untilMs =
          resetEpochSec > 0
            ? resetEpochSec * 1000
            : Date.now() + Math.max(60, retryAfterSec || 600) * 1000;
        try {
          localStorage.setItem(STORAGE_RATE_LIMIT_UNTIL, String(untilMs));
        } catch {}
        return {
          ok: false,
          reason: 'rate_limited',
          retryAfterMs: Math.max(1000, untilMs - Date.now()),
          message: 'Update server busy. Please try again shortly.',
        };
      }
    }

    if (response.status === 404) {
      return {
        ok: false,
        reason: 'error',
        message: 'No published update now',
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        reason: 'error',
        message: 'Unable to check for updates right now. Please try again later.',
      };
    }

    const release = (await response.json()) as GitHubReleasePayload;
    const newEtag = response.headers.get('etag');
    try {
      if (newEtag) localStorage.setItem(etagKey, newEtag);
      localStorage.setItem(cacheKey, JSON.stringify(release));
      localStorage.removeItem(STORAGE_RATE_LIMIT_UNTIL);
    } catch {}

    return { ok: true, release, fromCache: false };
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      reason: 'offline',
      message: isAbort
        ? 'Update check timed out. Check your internet connection.'
        : 'Unable to reach update server. Please check your internet connection.',
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export const AppUpdateService = {
  isSupportedNativeAndroid(): boolean {
    return isNativeAndroid();
  },

  async getInstalledAppInfo(): Promise<InstalledAppInfo | null> {
    if (!isNativeAndroid()) return null;
    try {
      return await AppUpdaterNative.getInstalledAppInfo();
    } catch {
      return null;
    }
  },

  async checkForUpdate(options?: {
    manual?: boolean;
    respectSnooze?: boolean;
  }): Promise<UpdateCheckResult> {
    const manual = Boolean(options?.manual);
    const respectSnooze = options?.respectSnooze ?? !manual;

    if (!isNativeAndroid()) {
      return {
        status: 'not_native',
        message: 'Automatic APK updates are available inside the installed Android APK applications.',
      };
    }

    let installed: InstalledAppInfo;
    try {
      installed = await AppUpdaterNative.getInstalledAppInfo();
    } catch (err: unknown) {
      return {
        status: 'error',
        message: err instanceof Error ? err.message : 'Unable to read installed app version.',
      };
    }

    const repo = resolveGithubRepo(installed);
    if (!repo) {
      return {
        status: 'not_configured',
        installed,
        message: 'No published update now',
      };
    }

    const fetched = await fetchLatestGitHubRelease(repo, manual);
    if ('reason' in fetched) {
      if (fetched.reason === 'offline') {
        return { status: 'offline', message: fetched.message };
      }
      if (fetched.reason === 'rate_limited') {
        return {
          status: 'rate_limited',
          retryAfterMs: fetched.retryAfterMs || 60000,
          message: fetched.message,
        };
      }
      return { status: 'error', message: fetched.message };
    }

    try {
      localStorage.setItem(STORAGE_LAST_CHECK_AT, String(Date.now()));
    } catch {}

    const release = fetched.release;
    if (release.draft || release.prerelease || !Array.isArray(release.assets)) {
      return {
        status: 'up_to_date',
        installed,
        latestVersion: installed.versionName,
      };
    }

    const matched = matchAssetForInstalledApp(release.assets, installed);
    if (!matched) {
      return {
        status: 'error',
        message: 'No published update now',
      };
    }

    const { asset, displayName, appId } = matched;
    if (!isAllowedGitHubDownloadUrl(asset.browser_download_url)) {
      return {
        status: 'error',
        message: 'Update package source could not be verified.',
      };
    }

    const metadata = parseEmbeddedMetadata(release.body || '');
    const latestVersionCode = extractVersionCode(release, metadata, asset.name);
    const latestVersionName = extractVersionName(release, metadata, asset.name);

    const newer = isNewerVersion(
      installed.versionCode,
      installed.versionName,
      latestVersionCode,
      latestVersionName
    );

    if (!newer) {
      return {
        status: 'up_to_date',
        installed,
        latestVersion: latestVersionName,
      };
    }

    // Security requirement: resolve a mandatory 64-char SHA-256 checksum
    const expectedSha256 =
      normalizeSha256(asset.digest) ||
      normalizeSha256(metadata?.apks?.[asset.name]?.sha256) ||
      extractSha256FromReleaseBody(release.body || '', asset.name);

    if (!expectedSha256) {
      return {
        status: 'error',
        message: `Security check halted: Release ${release.tag_name} is missing a SHA-256 checksum for ${asset.name}.`,
      };
    }

    const versionKey = `${installed.packageName}:${release.tag_name}:${latestVersionCode ?? latestVersionName}`;
    if (respectSnooze && isSnoozedVersion(versionKey)) {
      return {
        status: 'up_to_date',
        installed,
        latestVersion: latestVersionName,
      };
    }

    const update: AvailableUpdateInfo = {
      appId,
      appName: displayName,
      packageName: installed.packageName,
      currentVersionName: installed.versionName,
      currentVersionCode: installed.versionCode,
      latestVersionName,
      latestVersionCode,
      tagName: release.tag_name,
      releaseTitle: (release.name || '').trim() || `Version ${latestVersionName}`,
      releaseNotes: cleanReleaseNotes(release.body || ''),
      publishedAt: release.published_at || '',
      assetName: asset.name,
      downloadUrl: asset.browser_download_url,
      assetSizeBytes: asset.size || metadata?.apks?.[asset.name]?.sizeBytes || 0,
      expectedSha256,
      releaseHtmlUrl: release.html_url || `https://github.com/${repo}/releases/latest`,
      versionKey,
    };

    return {
      status: 'update_available',
      update,
      installed,
    };
  },

  async downloadAndVerifyUpdate(
    update: AvailableUpdateInfo,
    onProgress?: (progress: DownloadProgressEvent) => void
  ): Promise<DownloadVerifyResult> {
    if (!isNativeAndroid()) {
      throw new Error('Native Android environment is required to download and install APK updates.');
    }

    let listenerHandle: PluginListenerHandle | null = null;
    try {
      if (onProgress) {
        listenerHandle = await AppUpdaterNative.addListener('downloadProgress', (ev) => {
          onProgress(ev);
        });
      }

      return await AppUpdaterNative.downloadAndVerifyApk({
        downloadUrl: update.downloadUrl,
        expectedSha256: update.expectedSha256,
        fileName: update.assetName,
        expectedPackageName: update.packageName,
      });
    } finally {
      if (listenerHandle) {
        await listenerHandle.remove().catch(() => {});
      }
    }
  },

  async launchSystemInstaller(fileName: string): Promise<InstallLaunchResult> {
    if (!isNativeAndroid()) {
      throw new Error('Native Android environment is required to install APK updates.');
    }
    return AppUpdaterNative.installVerifiedApk({ fileName });
  },

  async canInstallPackages(): Promise<boolean> {
    if (!isNativeAndroid()) return false;
    try {
      const res = await AppUpdaterNative.canInstallPackages();
      return Boolean(res.granted);
    } catch {
      return false;
    }
  },

  async openInstallPermissionSettings(): Promise<void> {
    if (!isNativeAndroid()) return;
    await AppUpdaterNative.openInstallPermissionSettings();
  },

  async cancelDownload(): Promise<void> {
    if (!isNativeAndroid()) return;
    await AppUpdaterNative.cancelDownload().catch(() => {});
  },

  async clearCachedApks(): Promise<void> {
    if (!isNativeAndroid()) return;
    await AppUpdaterNative.clearCachedApks().catch(() => {});
  },

  dismissUpdateLater,
  clearSnoozedUpdate,
  resolveGithubRepo,
  getSavedGithubRepoOverride,
  saveGithubRepoOverride,
};

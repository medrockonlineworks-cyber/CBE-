import { Capacitor } from '@capacitor/core';
import { LocalDb } from '../lib/mockData';
import { CrossAppSyncService } from './crossAppSyncService';

export type BrandAppId =
  | 'cbe'
  | 'sms'
  | 'truecaller'
  | 'phone';

export interface BrandAppMeta {
  id: BrandAppId;
  name: string;
  shortName: string;
  description: string;
  routePath: string;
  staticManifest: string;
  defaultIcon: string;
  defaultIconIos?: string;
  defaultIcon512: string;
  defaultIconMaskable?: string;
  themeColor: string;
  backgroundColor: string;
}

export const BRAND_APP_LIST: BrandAppMeta[] = [
  {
    id: 'cbe',
    name: 'CBE Mobile Banking',
    shortName: 'CBE Mobile',
    description: 'Main Commercial Bank of Ethiopia mobile app',
    routePath: '/',
    staticManifest: '/manifest.webmanifest',
    defaultIcon: '/pwa-192x192.png',
    defaultIconIos: '/apple-touch-icon.png',
    defaultIcon512: '/pwa-512x512.png',
    defaultIconMaskable: '/pwa-maskable-512x512.png',
    themeColor: '#ffffff',
    backgroundColor: '#ffffff',
  },
  {
    id: 'sms',
    name: 'Messages (SMS)',
    shortName: 'Messages',
    description: 'Google Messages & iPhone Messages bank SMS alerts',
    routePath: '/sms/',
    staticManifest: '/manifests/subapp-sms.webmanifest',
    defaultIcon: '/icons/notif-sms-android.png',
    defaultIconIos: '/icons/notif-sms-ios.png',
    defaultIcon512: '/icons/notif-sms-android-512.png',
    themeColor: '#000000',
    backgroundColor: '#ffffff',
  },
  {
    id: 'truecaller',
    name: 'Truecaller',
    shortName: 'Truecaller',
    description: 'Caller ID & Truecaller bank SMS alerts',
    routePath: '/truecaller/',
    staticManifest: '/manifests/subapp-truecaller.webmanifest',
    defaultIcon: '/icons/notif-truecaller.png',
    defaultIcon512: '/icons/notif-truecaller-512.png',
    themeColor: '#0066FF',
    backgroundColor: '#0066FF',
  },
  {
    id: 'phone',
    name: 'Phone',
    shortName: 'Phone',
    description: 'Phone & USSD (*889#) banking simulator',
    routePath: '/phone/',
    staticManifest: '/manifests/subapp-phone.webmanifest',
    defaultIcon: '/icons/notif-phone.png',
    defaultIcon512: '/icons/notif-phone-512.png',
    themeColor: '#000000',
    backgroundColor: '#000000',
  },
];

export const BRAND_APP_MAP: Record<BrandAppId, BrandAppMeta> = BRAND_APP_LIST.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<BrandAppId, BrandAppMeta>
);

export interface StoredAppLogo {
  icon180: string;
  icon192: string;
  updatedAt: number;
}

const STORAGE_KEY = 'cbe_custom_app_logos_v1';
const CACHE_NAME = 'cbe-custom-branding-cache';

function readStorageMap(): Partial<Record<BrandAppId, StoredAppLogo>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStorageMap(map: Partial<Record<BrandAppId, StoredAppLogo>>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Handle storage quota gracefully
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(parts[1] || '');
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

function renderIconToPng(
  sourceUrl: string,
  size: number,
  options: { maskable?: boolean; backgroundColor?: string } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('Canvas unavailable'));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('2D context unavailable'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const nw = img.naturalWidth || size;
        const nh = img.naturalHeight || size;

        if (options.maskable) {
          // Per PWA maskable standard: solid full-bleed background + 12% safe-zone padding on all sides
          ctx.fillStyle = options.backgroundColor || '#ffffff';
          ctx.fillRect(0, 0, size, size);
          const pad = size * 0.12;
          const target = size - pad * 2;
          const scale = Math.min(target / nw, target / nh);
          const drawW = nw * scale;
          const drawH = nh * scale;
          ctx.drawImage(img, (size - drawW) / 2, (size - drawH) / 2, drawW, drawH);
        } else {
          // Crisp full-bleed cover crop so uploaded app icons fill the rounded square cleanly without awkward borders
          ctx.fillStyle = options.backgroundColor || '#ffffff';
          ctx.fillRect(0, 0, size, size);
          const scale = Math.max(size / nw, size / nh);
          const drawW = nw * scale;
          const drawH = nh * scale;
          ctx.drawImage(img, (size - drawW) / 2, (size - drawH) / 2, drawW, drawH);
        }

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to process image'));
      }
    };
    img.onerror = () => reject(new Error('Could not read the selected image file.'));
    img.src = sourceUrl;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });
}

function buildDynamicManifestObject(appId: BrandAppId, updatedAt: number, hasCustom: boolean) {
  const spec = BRAND_APP_MAP[appId];
  const v = encodeURIComponent(String(updatedAt));
  const icons = hasCustom
    ? [
        {
          src: `/api/pwa/icon?app=${appId}&size=192&v=${v}`,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: `/api/pwa/icon?app=${appId}&size=512&v=${v}`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: `/api/pwa/icon?app=${appId}&size=maskable&v=${v}`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ]
    : [
        {
          src: spec.defaultIconIos || spec.defaultIcon,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: spec.defaultIcon512,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: spec.defaultIconMaskable || spec.defaultIcon512,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ];

  return {
    id: spec.routePath,
    name: spec.name,
    short_name: spec.shortName,
    description: spec.description,
    start_url: spec.routePath,
    scope: spec.routePath,
    display: 'standalone',
    orientation: 'portrait',
    background_color: spec.backgroundColor,
    theme_color: spec.themeColor,
    icons,
  };
}

async function cacheCustomAppAssets(
  appId: BrandAppId,
  assets: { icon180: string; icon192: string; icon512: string; iconMaskable: string; updatedAt: number }
): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const v = encodeURIComponent(String(assets.updatedAt));
    const pngHeaders = {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    };
    const manifestHeaders = {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    };

    const blob180 = dataUrlToBlob(assets.icon180);
    const blob192 = dataUrlToBlob(assets.icon192);
    const blob512 = dataUrlToBlob(assets.icon512);
    const blobMaskable = dataUrlToBlob(assets.iconMaskable);
    const manifestJson = JSON.stringify(buildDynamicManifestObject(appId, assets.updatedAt, true), null, 2);
    const manifestBlob = new Blob([manifestJson], { type: 'application/manifest+json' });

    const puts: Promise<void>[] = [
      cache.put(`/api/pwa/icon?app=${appId}&size=180`, new Response(blob180, { status: 200, headers: pngHeaders })),
      cache.put(`/api/pwa/icon?app=${appId}&size=180&v=${v}`, new Response(blob180, { status: 200, headers: pngHeaders })),
      cache.put(`/api/pwa/icon?app=${appId}&size=192`, new Response(blob192, { status: 200, headers: pngHeaders })),
      cache.put(`/api/pwa/icon?app=${appId}&size=192&v=${v}`, new Response(blob192, { status: 200, headers: pngHeaders })),
      cache.put(`/api/pwa/icon?app=${appId}&size=512`, new Response(blob512, { status: 200, headers: pngHeaders })),
      cache.put(`/api/pwa/icon?app=${appId}&size=512&v=${v}`, new Response(blob512, { status: 200, headers: pngHeaders })),
      cache.put(`/api/pwa/icon?app=${appId}&size=maskable`, new Response(blobMaskable, { status: 200, headers: pngHeaders })),
      cache.put(`/api/pwa/icon?app=${appId}&size=maskable&v=${v}`, new Response(blobMaskable, { status: 200, headers: pngHeaders })),
      cache.put(`/api/pwa/manifest?app=${appId}`, new Response(manifestBlob, { status: 200, headers: manifestHeaders })),
      cache.put(`/api/pwa/manifest?app=${appId}&v=${v}`, new Response(manifestBlob, { status: 200, headers: manifestHeaders })),
      cache.put(BRAND_APP_MAP[appId].staticManifest, new Response(manifestBlob, { status: 200, headers: manifestHeaders })),
    ];

    await Promise.all(puts);
  } catch (err) {
    console.warn('[AppLogoService] Cache write warning:', err);
  }
}

async function clearCachedAppAssets(appId: BrandAppId): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const spec = BRAND_APP_MAP[appId];
    for (const req of keys) {
      const u = new URL(req.url);
      if (
        (u.pathname === '/api/pwa/icon' && u.searchParams.get('app') === appId) ||
        (u.pathname === '/api/pwa/manifest' && u.searchParams.get('app') === appId) ||
        u.pathname === spec.staticManifest
      ) {
        await cache.delete(req);
      }
    }
  } catch {
    // Non-fatal
  }
}

export class AppLogoService {
  public static detectAppIdFromPath(pathname?: string): BrandAppId {
    const raw =
      pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
    const clean = raw.toLowerCase().replace(/^\/+|\/+$/g, '').split('/')[0];
    if (
      clean === 'sms' ||
      clean === 'truecaller' ||
      clean === 'phone'
    ) {
      return clean;
    }
    return 'cbe';
  }

  public static getAllCustomLogos(): Partial<Record<BrandAppId, StoredAppLogo>> {
    return readStorageMap();
  }

  public static getCustomLogo(appId: BrandAppId): StoredAppLogo | null {
    const map = readStorageMap();
    return map[appId] || null;
  }

  public static hasCustomLogo(appId: BrandAppId): boolean {
    return Boolean(this.getCustomLogo(appId)?.icon192);
  }

  public static getDisplayIcon(appId: BrandAppId, options?: { isIPhone?: boolean }): string {
    const custom = this.getCustomLogo(appId);
    if (custom?.icon192) {
      return custom.icon192;
    }
    const spec = BRAND_APP_MAP[appId];
    if (appId === 'sms' && options?.isIPhone && spec.defaultIconIos) {
      return spec.defaultIconIos;
    }
    return spec.defaultIcon;
  }

  public static getNotificationIconUrl(appId: BrandAppId, options?: { isIPhone?: boolean }): string {
    const custom = this.getCustomLogo(appId);
    if (custom?.updatedAt) {
      return `/api/pwa/icon?app=${appId}&size=192&v=${custom.updatedAt}`;
    }
    const spec = BRAND_APP_MAP[appId];
    if (appId === 'sms' && options?.isIPhone && spec.defaultIconIos) {
      return spec.defaultIconIos;
    }
    return spec.defaultIcon;
  }

  public static getAndroidShortcutBase64(appId: BrandAppId): string {
    const custom = this.getCustomLogo(appId);
    return custom?.icon192 || '';
  }

  /**
   * Processes an uploaded image file for the given appId, persists it to localStorage,
   * Service Worker Cache Storage, and server API (/api/pwa/app-logo), and updates DOM <head>
   * manifest & Apple Touch Icon so installing the app uses the uploaded logo.
   */
  public static async uploadCustomLogo(
    appId: BrandAppId,
    file: File
  ): Promise<{ ok: boolean; updatedAt?: number; preview?: string; error?: string }> {
    try {
      if (!file || !file.type.startsWith('image/')) {
        return { ok: false, error: 'Please select a valid image file (PNG, JPG, WebP, or SVG).' };
      }
      if (file.size > 10 * 1024 * 1024) {
        return { ok: false, error: 'Image is too large. Please pick an image under 10 MB.' };
      }

      const rawDataUrl = await readFileAsDataUrl(file);
      return await this.setCustomLogoFromDataUrl(appId, rawDataUrl);
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Unable to upload custom app logo.',
      };
    }
  }

  public static async setCustomLogoFromDataUrl(
    appId: BrandAppId,
    sourceDataUrl: string
  ): Promise<{ ok: boolean; updatedAt?: number; preview?: string; error?: string }> {
    try {
      const spec = BRAND_APP_MAP[appId];
      const bg = spec.backgroundColor || '#ffffff';

      const [icon180, icon192, icon512, iconMaskable] = await Promise.all([
        renderIconToPng(sourceDataUrl, 180, { maskable: false, backgroundColor: bg }),
        renderIconToPng(sourceDataUrl, 192, { maskable: false, backgroundColor: bg }),
        renderIconToPng(sourceDataUrl, 512, { maskable: false, backgroundColor: bg }),
        renderIconToPng(sourceDataUrl, 512, { maskable: true, backgroundColor: bg }),
      ]);

      let updatedAt = Date.now();

      // 1. Upload to backend / Vercel bridge so Chrome WebAPK & other tabs fetch the uploaded PNGs cleanly
      try {
        const baseUrl = CrossAppSyncService.getBridgeBaseUrl();
        const res = await fetch(`${baseUrl}/api/pwa/app-logo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appId,
            icon180,
            icon192,
            icon512,
            iconMaskable,
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as { ok?: boolean; updatedAt?: number };
          if (json?.updatedAt) updatedAt = json.updatedAt;
        }
      } catch {
        // Cache Storage & localStorage still guarantee immediate local install icon support
      }

      // 2. Persist compact preview in localStorage
      const map = readStorageMap();
      map[appId] = { icon180, icon192, updatedAt };
      writeStorageMap(map);

      // 3. Persist full-resolution 192/512/maskable PNGs + dynamic manifest into Cache Storage for sw-push.js
      await cacheCustomAppAssets(appId, {
        icon180,
        icon192,
        icon512,
        iconMaskable,
        updatedAt,
      });

      // 4. If main CBE app logo changed, also keep LocalDb custom bank logo synchronized
      if (appId === 'cbe') {
        LocalDb.setCustomBankLogo(icon512);
      }

      // 5. Immediately refresh <head> manifest & icons if currently viewing this app
      const currentRouteApp = this.detectAppIdFromPath();
      if (currentRouteApp === appId) {
        this.applyHeadBrandingForApp(appId);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('cbe_app_logos_updated', {
            detail: { appId, updatedAt, hasCustom: true },
          })
        );
      }

      return { ok: true, updatedAt, preview: icon192 };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Unable to save custom app logo.',
      };
    }
  }

  public static async resetCustomLogo(appId: BrandAppId): Promise<void> {
    const map = readStorageMap();
    delete map[appId];
    writeStorageMap(map);

    await clearCachedAppAssets(appId);

    try {
      const baseUrl = CrossAppSyncService.getBridgeBaseUrl();
      await fetch(`${baseUrl}/api/pwa/app-logo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, reset: true }),
      }).catch(() => {});
    } catch {}

    if (appId === 'cbe') {
      LocalDb.setCustomBankLogo('/custom-bank-logo.png');
    }

    const currentRouteApp = this.detectAppIdFromPath();
    if (currentRouteApp === appId) {
      this.applyHeadBrandingForApp(appId);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cbe_app_logos_updated', {
          detail: { appId, updatedAt: Date.now(), hasCustom: false },
        })
      );
    }
  }

  /**
   * Hydrates custom logos from server (/api/pwa/app-logos) when a freshly opened sub-app
   * or browser tab does not yet have them cached locally.
   */
  public static async hydrateFromServer(): Promise<void> {
    if (typeof window === 'undefined' || Capacitor.isNativePlatform()) return;
    try {
      const res = await fetch('/api/pwa/app-logos', { cache: 'no-store' });
      if (!res.ok) return;
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (!ct.includes('application/json')) return;
      const data = (await res.json()) as {
        ok?: boolean;
        logos?: Record<string, { hasCustom?: boolean; updatedAt?: number; icon180?: string; icon192?: string }>;
      };
      if (!data?.ok || !data.logos) return;

      const map = readStorageMap();
      let changed = false;
      for (const [id, remote] of Object.entries(data.logos)) {
        const appId = id as BrandAppId;
        if (!BRAND_APP_MAP[appId] || !remote?.icon192) continue;
        const local = map[appId];
        if (!local || Number(remote.updatedAt || 0) > Number(local.updatedAt || 0)) {
          map[appId] = {
            icon180: remote.icon180 || remote.icon192,
            icon192: remote.icon192,
            updatedAt: Number(remote.updatedAt || Date.now()),
          };
          changed = true;
        }
      }

      if (changed) {
        writeStorageMap(map);
        window.dispatchEvent(new CustomEvent('cbe_app_logos_updated', { detail: { hydrated: true } }));
      }
    } catch {
      // Non-fatal
    }
  }

  /**
   * Applies <title>, Apple Touch Icon (180x180 PNG Data URL for instant iOS Home Screen icon),
   * Favicon, and <link rel="manifest"> (pointing to /api/pwa/manifest?app=<id>&v=<ts> when customized)
   * so installing this app uses the exact uploaded custom logo.
   */
  public static applyHeadBrandingForApp(
    appId: BrandAppId,
    options?: { isIPhone?: boolean }
  ): void {
    if (typeof document === 'undefined') return;
    const spec = BRAND_APP_MAP[appId] || BRAND_APP_MAP.cbe;
    const custom = this.getCustomLogo(appId);
    const ts = custom?.updatedAt || Date.now();

    document.title = spec.name;

    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.setAttribute('content', spec.shortName);
    const appName = document.querySelector('meta[name="application-name"]');
    if (appName) appName.setAttribute('content', spec.name);
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', spec.themeColor);

    // 1. Apple Touch Icon (iOS Safari reads data:image/png;base64,... directly for Add to Home Screen!)
    const appleHref = custom?.icon180
      ? custom.icon180
      : appId === 'sms' && options?.isIPhone && spec.defaultIconIos
        ? spec.defaultIconIos
        : spec.defaultIconIos || spec.defaultIcon;

    let appleIcon = document.getElementById('app-apple-touch-icon') as HTMLLinkElement | null;
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.id = 'app-apple-touch-icon';
      appleIcon.rel = 'apple-touch-icon';
      document.head.appendChild(appleIcon);
    }
    appleIcon.setAttribute('href', appleHref);

    // Remove duplicate static apple-touch-icon links so iOS Safari never picks an older default icon
    document.querySelectorAll('link[rel="apple-touch-icon"]').forEach((el) => {
      if (el.id !== 'app-apple-touch-icon') {
        el.remove();
      }
    });

    // 2. Favicon PNG
    const favHref = custom?.icon192
      ? custom.icon192
      : appId === 'sms' && options?.isIPhone && spec.defaultIconIos
        ? spec.defaultIconIos
        : spec.defaultIcon;
    const favIcon = document.getElementById('app-favicon-png') as HTMLLinkElement | null;
    if (favIcon) {
      favIcon.setAttribute('href', favHref);
    }

    // 3. Web App Manifest (dynamic /api/pwa/manifest?app=<id>&v=<ts> ONLY when custom logo exists;
    // keep static manifest URL stable without random ?v=Date.now() so iOS Safari never invalidates start_url!)
    const manifestHref = custom?.updatedAt
      ? `/api/pwa/manifest?app=${appId}&v=${ts}`
      : spec.staticManifest;

    let manifestLink = document.getElementById('pwa-manifest-link') as HTMLLinkElement | null;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.id = 'pwa-manifest-link';
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    if (manifestLink.getAttribute('href') !== manifestHref) {
      manifestLink.setAttribute('href', manifestHref);
    }

    // Remove any duplicate manifest links injected by VitePWA
    document.querySelectorAll('link[rel="manifest"]').forEach((el) => {
      if (el.id !== 'pwa-manifest-link') {
        el.remove();
      }
    });
  }
}

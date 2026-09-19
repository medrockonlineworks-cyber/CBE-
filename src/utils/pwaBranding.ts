import { LocalDb, DEFAULT_CBE_LOGO } from '../lib/mockData';

/**
 * PWA Dynamic Branding & Icon Manager
 * Ensures the installed PWA / WebAPK / home screen shortcut uses the custom logo uploaded by the admin.
 */

export const BASE_MANIFEST = {
  id: '/',
  short_name: 'CBE Mobile Banking',
  name: 'CBE Mobile Banking',
  description: 'Official Commercial Bank of Ethiopia (CBE) Mobile Banking application with instant transfers, bill payments, and secure account management.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  display_override: ['standalone', 'minimal-ui', 'fullscreen', 'browser'],
  orientation: 'portrait-primary',
  theme_color: '#300642',
  background_color: '#0f172a',
  lang: 'en',
  dir: 'ltr',
  categories: ['finance', 'business', 'utilities'],
  prefer_related_applications: false,
  related_applications: []
};

/**
 * Renders an image or SVG onto an offscreen canvas of the given size.
 * Handles maskable padding (safe-zone padding of 12% on all sides) with authentic CBE purple background.
 */
function createSizedIconDataUrl(sourceUrl: string, size: number, maskable = false): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !sourceUrl) {
      resolve(sourceUrl);
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
          resolve(sourceUrl);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (maskable) {
          // Maskable icons require a solid background filling the entire canvas
          ctx.fillStyle = '#300642';
          ctx.fillRect(0, 0, size, size);

          // Center image in the safe zone (80% diameter)
          const padding = size * 0.12;
          const targetW = size - (padding * 2);
          const targetH = size - (padding * 2);

          const scale = Math.min(targetW / (img.naturalWidth || size), targetH / (img.naturalHeight || size));
          const drawW = (img.naturalWidth || size) * scale;
          const drawH = (img.naturalHeight || size) * scale;
          const dx = padding + (targetW - drawW) / 2;
          const dy = padding + (targetH - drawH) / 2;

          ctx.drawImage(img, dx, dy, drawW, drawH);
        } else {
          // Standard transparent / padded square icon
          ctx.clearRect(0, 0, size, size);
          
          const padding = size * 0.04;
          const targetW = size - (padding * 2);
          const targetH = size - (padding * 2);

          const scale = Math.min(targetW / (img.naturalWidth || size), targetH / (img.naturalHeight || size));
          const drawW = (img.naturalWidth || size) * scale;
          const drawH = (img.naturalHeight || size) * scale;
          const dx = padding + (targetW - drawW) / 2;
          const dy = padding + (targetH - drawH) / 2;

          ctx.drawImage(img, dx, dy, drawW, drawH);
        }

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('[PWA Branding] Canvas icon generation failed, fallback to source:', err);
        resolve(sourceUrl);
      }
    };

    img.onerror = () => {
      resolve(sourceUrl);
    };

    img.src = sourceUrl;
  });
}

/**
 * Converts a base64 Data URL to a Blob
 */
function dataUrlToBlob(dataUrl: string): Blob {
  if (dataUrl.startsWith('data:')) {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
  return new Blob([], { type: 'image/png' });
}

/**
 * Generates and applies dynamic manifest and branding icons
 */
export async function updatePwaBranding(customLogoUrl?: string | null): Promise<void> {
  const activeLogo = customLogoUrl ?? LocalDb.getCustomBankLogo() ?? DEFAULT_CBE_LOGO;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  try {
    // Generate icons at standard PWA resolutions
    const [icon192, icon512, iconMaskable] = await Promise.all([
      createSizedIconDataUrl(activeLogo, 192, false),
      createSizedIconDataUrl(activeLogo, 512, false),
      createSizedIconDataUrl(activeLogo, 512, true),
    ]);

    // 1. Update <link rel="icon">
    let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (faviconLink) {
      faviconLink.href = icon192;
    }

    // 2. Update <link rel="apple-touch-icon"> for iOS Safari & Home Screen
    let appleTouchLink = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
    if (!appleTouchLink) {
      appleTouchLink = document.createElement('link');
      appleTouchLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleTouchLink);
    }
    appleTouchLink.href = icon192;

    // 3. Update apple-touch-icon-precomposed if present
    let appleTouchPrecomposed = document.querySelector('link[rel="apple-touch-icon-precomposed"]') as HTMLLinkElement | null;
    if (!appleTouchPrecomposed) {
      appleTouchPrecomposed = document.createElement('link');
      appleTouchPrecomposed.rel = 'apple-touch-icon-precomposed';
      document.head.appendChild(appleTouchPrecomposed);
    }
    appleTouchPrecomposed.href = icon192;

    // 4. Update mask-icon if exists
    let maskIconLink = document.querySelector('link[rel="mask-icon"]') as HTMLLinkElement | null;
    if (maskIconLink) {
      maskIconLink.href = icon512;
    }

    // 5. Construct full dynamic manifest
    const dynamicManifest = {
      ...BASE_MANIFEST,
      icons: [
        {
          src: icon192,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: icon512,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: iconMaskable,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    };

    // 6. Ensure <link rel="manifest"> always points to standard HTTP path /manifest.webmanifest
    // CRITICAL: A data: or blob: URI breaks Chromium PWA installability and WebAPK generation,
    // which causes Chrome to downgrade from "Install Application" to "Create Shortcut only"!
    const manifestJsonString = JSON.stringify(dynamicManifest, null, 2);
    
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (manifestLink) {
      manifestLink.setAttribute('href', '/manifest.webmanifest');
    }

    // 7. Store in Cache Storage so HTTP requests to /manifest.webmanifest and /icons/* return the custom logo
    if ('caches' in window) {
      try {
        const blob192 = dataUrlToBlob(icon192);
        const blob512 = dataUrlToBlob(icon512);
        const blobMaskable = dataUrlToBlob(iconMaskable);
        const manifestBlob = new Blob([manifestJsonString], { type: 'application/manifest+json' });

        const targetCacheNames = ['cbe-custom-branding-cache'];
        const existingCaches = await caches.keys();
        for (const name of existingCaches) {
          if (!targetCacheNames.includes(name)) targetCacheNames.push(name);
        }

        const iconUrls192 = ['/icons/icon-192.png', '/pwa-192x192.png', '/apple-touch-icon.png', '/favicon.svg'];
        const iconUrls512 = ['/icons/icon-512.png', '/pwa-512x512.png'];
        const iconUrlsMaskable = ['/icons/icon-maskable-512.png', '/pwa-maskable-512x512.png'];

        for (const cacheName of targetCacheNames) {
          try {
            const cache = await caches.open(cacheName);
            for (const u of iconUrls192) {
              await cache.put(u, new Response(blob192, {
                status: 200,
                headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000' }
              }));
            }
            for (const u of iconUrls512) {
              await cache.put(u, new Response(blob512, {
                status: 200,
                headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000' }
              }));
            }
            for (const u of iconUrlsMaskable) {
              await cache.put(u, new Response(blobMaskable, {
                status: 200,
                headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000' }
              }));
            }
            // Put manifest
            await cache.put('/manifest.webmanifest', new Response(manifestBlob, {
              status: 200,
              headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=31536000' }
            }));
            await cache.put('/manifest.json', new Response(manifestBlob, {
              status: 200,
              headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=31536000' }
            }));
          } catch (cacheWriteErr) {
            console.warn(`[PWA Branding] Cache write note (${cacheName}):`, cacheWriteErr);
          }
        }
      } catch (cacheErr) {
        console.warn('[PWA Branding] Cache storage access note:', cacheErr);
      }
    }

    console.info('[PWA Branding] Successfully updated PWA branding with active CBE logo.');
  } catch (err) {
    console.warn('[PWA Branding] Error updating PWA branding:', err);
  }
}

/**
 * Initializes PWA dynamic manifest on app load and listens for logo change events.
 */
export function initPwaDynamicManifest(): void {
  // Initial update on app bootstrap
  updatePwaBranding();

  // Listen for admin logo updates across the application and windows
  const handleLogoUpdate = (e: Event) => {
    const customEv = e as CustomEvent<{ logo?: string | null }>;
    updatePwaBranding(customEv.detail?.logo);
  };

  window.addEventListener('cbe_logo_updated', handleLogoUpdate);
  window.addEventListener('bank_logo_updated', handleLogoUpdate);
  window.addEventListener('storage', (e) => {
    if (e.key === 'tana_custom_bank_logo') {
      updatePwaBranding();
    }
  });
}

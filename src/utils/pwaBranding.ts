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
  background_color: '#300642',
  lang: 'en',
  dir: 'ltr',
  categories: ['finance', 'business', 'utilities'],
  prefer_related_applications: false,
  related_applications: []
};

/**
 * Renders an official CBE Mobile Banking splash screen / screenshot with the active logo.
 */
function createSplashScreenshotDataUrl(sourceUrl: string, width = 540, height = 1170): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve('');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }

        // Background Gradient (Deep Official CBE Purple)
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#2a053b');
        grad.addColorStop(0.5, '#1b0326');
        grad.addColorStop(1, '#0c0112');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Ambient Gold Glow
        const rad = ctx.createRadialGradient(width / 2, height * 0.38, 10, width / 2, height * 0.38, Math.min(width, height) * 0.45);
        rad.addColorStop(0, 'rgba(222, 179, 86, 0.18)');
        rad.addColorStop(1, 'rgba(222, 179, 86, 0)');
        ctx.fillStyle = rad;
        ctx.fillRect(0, 0, width, height);

        // Active Logo in Center
        const logoTargetSize = Math.min(width * 0.45, 240);
        const scale = Math.min(logoTargetSize / (img.naturalWidth || logoTargetSize), logoTargetSize / (img.naturalHeight || logoTargetSize));
        const drawW = (img.naturalWidth || logoTargetSize) * scale;
        const drawH = (img.naturalHeight || logoTargetSize) * scale;
        const dx = (width - drawW) / 2;
        const dy = height * 0.34 - drawH / 2;

        ctx.drawImage(img, dx, dy, drawW, drawH);

        // Typography & Official Branding
        ctx.textAlign = 'center';
        
        // Amharic Official Title
        ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#deb356';
        ctx.fillText('የኢትዮጵያ ንግድ ባንክ', width / 2, dy + drawH + 68);

        // English Title
        ctx.font = '600 18px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#E2E8F0';
        ctx.fillText('Commercial Bank of Ethiopia', width / 2, dy + drawH + 102);

        // App Name
        ctx.font = '900 32px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#deb356';
        ctx.fillText('CBE Mobile Banking', width / 2, dy + drawH + 155);

        // Slogan
        ctx.font = '400 15px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#CBD5E1';
        ctx.fillText('The Bank You Can Always Rely On', width / 2, dy + drawH + 190);

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('[PWA Branding] Failed generating splash canvas:', err);
        resolve('');
      }
    };

    img.onerror = () => {
      resolve('');
    };

    img.src = sourceUrl;
  });
}

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
    // Generate icons & splash screens at standard PWA resolutions using active CBE logo
    const [icon192, icon512, iconMaskable, splashMobile, splashWide] = await Promise.all([
      createSizedIconDataUrl(activeLogo, 192, false),
      createSizedIconDataUrl(activeLogo, 512, false),
      createSizedIconDataUrl(activeLogo, 512, true),
      createSplashScreenshotDataUrl(activeLogo, 540, 1170),
      createSplashScreenshotDataUrl(activeLogo, 1280, 800),
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

    // 5. Update theme-color and tile meta tags to official CBE purple
    let themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (themeColorMeta) {
      themeColorMeta.content = '#300642';
    }
    let tileColorMeta = document.querySelector('meta[name="msapplication-TileColor"]') as HTMLMetaElement | null;
    if (tileColorMeta) {
      tileColorMeta.content = '#300642';
    }
    let tileImageMeta = document.querySelector('meta[name="msapplication-TileImage"]') as HTMLMetaElement | null;
    if (tileImageMeta) {
      tileImageMeta.content = icon512;
    }

    // 6. Construct full dynamic manifest with active logo and splash screens
    const dynamicManifest = {
      ...BASE_MANIFEST,
      background_color: '#300642',
      theme_color: '#300642',
      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/pwa-maskable-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: '/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/icons/icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ],
      screenshots: [
        {
          src: '/pwa-screenshot-mobile.png',
          sizes: '540x1170',
          type: 'image/png',
          form_factor: 'narrow',
          label: 'CBE Mobile Banking'
        },
        {
          src: '/pwa-screenshot-wide.png',
          sizes: '1280x800',
          type: 'image/png',
          form_factor: 'wide',
          label: 'CBE Mobile Banking Desktop'
        }
      ]
    };

    // 7. Ensure <link rel="manifest"> always points to standard HTTP path /manifest.webmanifest
    const manifestJsonString = JSON.stringify(dynamicManifest, null, 2);
    
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (manifestLink) {
      manifestLink.setAttribute('href', '/manifest.webmanifest');
    }

    // 8. Store in Cache Storage so HTTP requests to /manifest.webmanifest, icons, and screensplash return the custom logo
    if ('caches' in window) {
      try {
        const blob192 = dataUrlToBlob(icon192);
        const blob512 = dataUrlToBlob(icon512);
        const blobMaskable = dataUrlToBlob(iconMaskable);
        const blobSplashMobile = splashMobile ? dataUrlToBlob(splashMobile) : null;
        const blobSplashWide = splashWide ? dataUrlToBlob(splashWide) : null;
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
            if (blobSplashMobile) {
              await cache.put('/pwa-screenshot-mobile.png', new Response(blobSplashMobile, {
                status: 200,
                headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000' }
              }));
            }
            if (blobSplashWide) {
              await cache.put('/pwa-screenshot-wide.png', new Response(blobSplashWide, {
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

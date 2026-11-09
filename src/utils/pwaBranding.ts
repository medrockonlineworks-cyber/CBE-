import { LocalDb, DEFAULT_CBE_LOGO } from '../lib/mockData';

/**
 * PWA Dynamic Branding & Icon Manager
 * Ensures the installed PWA / WebAPK / home screen shortcut uses the custom logo uploaded by the admin.
 */

export const BASE_MANIFEST = {
  id: '/',
  short_name: 'CBE Mobile',
  name: 'CBE Mobile',
  description: 'Official Commercial Bank of Ethiopia (CBE) Mobile Banking application with instant transfers, bill payments, and secure account management.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  display_override: ['standalone', 'minimal-ui', 'fullscreen', 'browser'],
  orientation: 'portrait-primary',
  theme_color: '#70189F',
  background_color: '#ffffff',
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

        // Clean White Splash & Launch Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Active Logo in Center
        const logoTargetSize = Math.min(width * 0.45, 240);
        const scale = Math.min(logoTargetSize / (img.naturalWidth || logoTargetSize), logoTargetSize / (img.naturalHeight || logoTargetSize));
        const drawW = (img.naturalWidth || logoTargetSize) * scale;
        const drawH = (img.naturalHeight || logoTargetSize) * scale;
        const dx = (width - drawW) / 2;
        const dy = height * 0.38 - drawH / 2;

        ctx.drawImage(img, dx, dy, drawW, drawH);

        // Typography & Official Branding
        ctx.textAlign = 'center';
        
        // Amharic Official Title
        ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#b8860b';
        ctx.fillText('የኢትዮጵያ ንግድ ባንክ', width / 2, dy + drawH + 68);

        // English Title
        ctx.font = '600 18px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#1f2937';
        ctx.fillText('Commercial Bank of Ethiopia', width / 2, dy + drawH + 102);

        // App Name: CBE Mobile
        ctx.font = '900 32px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#70189F';
        ctx.fillText('CBE Mobile', width / 2, dy + drawH + 155);

        // Slogan
        ctx.font = '400 15px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#6b7280';
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
          // Maskable icons require a solid background: pure white
          ctx.fillStyle = '#ffffff';
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
          // Standard download icon with solid white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, size, size);
          
          const padding = size * 0.08;
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
 * Generates and applies dynamic manifest and branding icons.
 * Automatically synchronizes high-resolution PNG assets to the server disk
 * so that PWA installation, Android WebAPK, iOS Add to Home Screen, and Chrome
 * directly use the administrator's uploaded custom image.
 */
export async function updatePwaBranding(customLogoUrl?: string | null): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // Handle explicit reset to default official CBE logo
  if (customLogoUrl === null) {
    try {
      await fetch('/api/pwa/reset-icon', { method: 'POST' }).catch(() => {});
    } catch {}

    const ts = Date.now();
    const manifestLink = document.getElementById('pwa-manifest-link') as HTMLLinkElement | null || document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (manifestLink) {
      manifestLink.setAttribute('href', `/manifest.webmanifest?v=${ts}`);
    }
    const appleTouchLink = document.getElementById('app-apple-touch-icon') as HTMLLinkElement | null || document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
    if (appleTouchLink) {
      appleTouchLink.setAttribute('href', `/apple-touch-icon.png?v=${ts}`);
    }
    const faviconPng = document.getElementById('app-favicon-png') as HTMLLinkElement | null;
    if (faviconPng) {
      faviconPng.setAttribute('href', `/pwa-192x192.png?v=${ts}`);
    }

    // Clean custom caches
    if ('caches' in window) {
      try {
        await caches.delete('cbe-custom-branding-cache');
      } catch {}
    }

    window.dispatchEvent(new CustomEvent('pwa_branding_synced', { detail: { reset: true, timestamp: ts } }));
    console.info('[PWA Branding] Reset to default CBE branding completed.');
    return;
  }

  const activeLogo = customLogoUrl ?? LocalDb.getCustomBankLogo() ?? DEFAULT_CBE_LOGO;

  try {
    // Generate icons & splash screens at standard PWA resolutions using active CBE logo
    const [icon192, icon512, iconMaskable, splashMobile, splashWide] = await Promise.all([
      createSizedIconDataUrl(activeLogo, 192, false),
      createSizedIconDataUrl(activeLogo, 512, false),
      createSizedIconDataUrl(activeLogo, 512, true),
      createSplashScreenshotDataUrl(activeLogo, 540, 1170),
      createSplashScreenshotDataUrl(activeLogo, 1280, 800),
    ]);

    // Send rendered assets to server so public/pwa-512x512.png, public/pwa-192x192.png,
    // public/apple-touch-icon.png, etc. on disk are updated for native PWA installation & WebAPK
    let serverTimestamp = Date.now();
    try {
      const resp = await fetch('/api/pwa/update-icon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icon192,
          icon512,
          iconMaskable,
          appleTouchIcon: icon192,
          splashMobile,
          splashWide,
          rawLogo: activeLogo
        })
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.timestamp) serverTimestamp = json.timestamp;
      }
    } catch (apiErr) {
      console.warn('[PWA Branding] Server asset sync note:', apiErr);
    }

    const versionParam = `?v=${serverTimestamp}`;

    // 1. Update <link rel="icon">
    let faviconLink = document.getElementById('app-favicon-png') as HTMLLinkElement | null || document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (faviconLink) {
      faviconLink.type = 'image/png';
      faviconLink.href = `/pwa-192x192.png${versionParam}`;
    }

    let faviconSvgLink = document.getElementById('app-favicon-svg') as HTMLLinkElement | null;
    if (faviconSvgLink) {
      faviconSvgLink.href = `/favicon.svg${versionParam}`;
    }

    // 2. Update <link rel="apple-touch-icon"> for iOS Safari & Home Screen
    let appleTouchLink = document.getElementById('app-apple-touch-icon') as HTMLLinkElement | null || document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
    if (!appleTouchLink) {
      appleTouchLink = document.createElement('link');
      appleTouchLink.id = 'app-apple-touch-icon';
      appleTouchLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleTouchLink);
    }
    appleTouchLink.href = `/apple-touch-icon.png${versionParam}`;

    // 3. Update apple-touch-icon-precomposed if present
    let appleTouchPrecomposed = document.querySelector('link[rel="apple-touch-icon-precomposed"]') as HTMLLinkElement | null;
    if (appleTouchPrecomposed) {
      appleTouchPrecomposed.href = `/apple-touch-icon.png${versionParam}`;
    }

    // 4. Update mask-icon if exists
    let maskIconLink = document.getElementById('app-mask-icon') as HTMLLinkElement | null || document.querySelector('link[rel="mask-icon"]') as HTMLLinkElement | null;
    if (maskIconLink) {
      maskIconLink.href = `/pwa-maskable-512x512.png${versionParam}`;
    }

    // 5. Update system bars: Top Header / Status bar is CBE purple (#70189F), Bottom Navigation bar is pure white (#ffffff)
    const activeHeaderColor = '#70189F';
    const activeNavColor = '#ffffff';

    const navMetas = document.querySelectorAll('meta[name="navigation-bar-color"], meta[name="msapplication-navbutton-color"]');
    navMetas.forEach(meta => meta.setAttribute('content', activeNavColor));

    const themeMetas = document.querySelectorAll('meta[name="theme-color"]');
    themeMetas.forEach(meta => meta.setAttribute('content', activeHeaderColor));

    let tileColorMeta = document.querySelector('meta[name="msapplication-TileColor"]') as HTMLMetaElement | null;
    if (tileColorMeta) {
      tileColorMeta.content = activeHeaderColor;
    }
    let tileImageMeta = document.querySelector('meta[name="msapplication-TileImage"]') as HTMLMetaElement | null;
    if (tileImageMeta) {
      tileImageMeta.content = `/pwa-512x512.png${versionParam}`;
    }

    // 6. Construct full dynamic manifest with active logo and splash screens
    const dynamicManifest = {
      ...BASE_MANIFEST,
      background_color: '#ffffff',
      theme_color: activeHeaderColor,
      icons: [
        {
          src: `/pwa-192x192.png${versionParam}`,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: `/pwa-512x512.png${versionParam}`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: `/pwa-maskable-512x512.png${versionParam}`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: `/icons/icon-192.png${versionParam}`,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: `/icons/icon-512.png${versionParam}`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: `/icons/icon-maskable-512.png${versionParam}`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ],
      screenshots: [
        {
          src: `/pwa-screenshot-mobile.png${versionParam}`,
          sizes: '540x1170',
          type: 'image/png',
          form_factor: 'narrow',
          label: 'CBE Mobile'
        },
        {
          src: `/pwa-screenshot-wide.png${versionParam}`,
          sizes: '1280x800',
          type: 'image/png',
          form_factor: 'wide',
          label: 'CBE Mobile Desktop'
        }
      ]
    };

    // 7. Update <link rel="manifest"> with cache-busting version so browser immediately invalidates cached manifest
    const manifestJsonString = JSON.stringify(dynamicManifest, null, 2);
    
    let manifestLink = document.getElementById('pwa-manifest-link') as HTMLLinkElement | null || document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (manifestLink) {
      manifestLink.setAttribute('href', `/manifest.webmanifest${versionParam}`);
    }

    // 8. Store in Cache Storage so HTTP requests to manifest and icons return the custom logo even offline
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

        const iconUrls192 = [
          '/icons/icon-192.png',
          `/icons/icon-192.png${versionParam}`,
          '/pwa-192x192.png',
          `/pwa-192x192.png${versionParam}`,
          '/apple-touch-icon.png',
          `/apple-touch-icon.png${versionParam}`
        ];
        const iconUrls512 = [
          '/icons/icon-512.png',
          `/icons/icon-512.png${versionParam}`,
          '/pwa-512x512.png',
          `/pwa-512x512.png${versionParam}`
        ];
        const iconUrlsMaskable = [
          '/icons/icon-maskable-512.png',
          `/icons/icon-maskable-512.png${versionParam}`,
          '/pwa-maskable-512x512.png',
          `/pwa-maskable-512x512.png${versionParam}`
        ];

        for (const cacheName of targetCacheNames) {
          try {
            const cache = await caches.open(cacheName);
            for (const u of iconUrls192) {
              await cache.put(u, new Response(blob192, {
                status: 200,
                headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache, no-store, must-revalidate' }
              }));
            }
            for (const u of iconUrls512) {
              await cache.put(u, new Response(blob512, {
                status: 200,
                headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache, no-store, must-revalidate' }
              }));
            }
            for (const u of iconUrlsMaskable) {
              await cache.put(u, new Response(blobMaskable, {
                status: 200,
                headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache, no-store, must-revalidate' }
              }));
            }
            if (blobSplashMobile) {
              await cache.put('/pwa-screenshot-mobile.png', new Response(blobSplashMobile, {
                status: 200,
                headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache, no-store, must-revalidate' }
              }));
              await cache.put(`/pwa-screenshot-mobile.png${versionParam}`, new Response(blobSplashMobile, {
                status: 200,
                headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache, no-store, must-revalidate' }
              }));
            }
            if (blobSplashWide) {
              await cache.put('/pwa-screenshot-wide.png', new Response(blobSplashWide, {
                status: 200,
                headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache, no-store, must-revalidate' }
              }));
              await cache.put(`/pwa-screenshot-wide.png${versionParam}`, new Response(blobSplashWide, {
                status: 200,
                headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache, no-store, must-revalidate' }
              }));
            }
            // Put manifest
            await cache.put('/manifest.webmanifest', new Response(manifestBlob, {
              status: 200,
              headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-cache, no-store, must-revalidate' }
            }));
            await cache.put(`/manifest.webmanifest${versionParam}`, new Response(manifestBlob, {
              status: 200,
              headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-cache, no-store, must-revalidate' }
            }));
            await cache.put('/manifest.json', new Response(manifestBlob, {
              status: 200,
              headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-cache, no-store, must-revalidate' }
            }));
          } catch (cacheWriteErr) {
            console.warn(`[PWA Branding] Cache write note (${cacheName}):`, cacheWriteErr);
          }
        }
      } catch (cacheErr) {
        console.warn('[PWA Branding] Cache storage access note:', cacheErr);
      }
    }

    window.dispatchEvent(new CustomEvent('pwa_branding_synced', { 
      detail: { timestamp: serverTimestamp, logo: activeLogo } 
    }));
    console.info('[PWA Branding] Successfully updated and synced PWA branding with active CBE logo.');
  } catch (err) {
    console.warn('[PWA Branding] Error updating PWA branding:', err);
  }
}

/**
 * Initializes PWA dynamic manifest on app load and listens for logo change events.
 */
export async function initPwaDynamicManifest(): Promise<void> {
  let localLogo = LocalDb.getCustomBankLogo();

  // If not in local storage (e.g. fresh session, new device, or standalone installed app),
  // sync with server PWA status to see if administrator uploaded a custom bank logo
  if (!localLogo) {
    try {
      const res = await fetch('/api/pwa/status');
      if (res.ok) {
        const data = await res.json();
        if (data.hasCustom && data.rawLogo) {
          localLogo = data.rawLogo;
          LocalDb.setCustomBankLogo(localLogo);
        }
      }
    } catch (statusErr) {
      console.warn('[PWA Branding] Status fetch skipped:', statusErr);
    }
  }

  if (localLogo) {
    // Apply custom uploaded logo to manifest, icons, and Apple touch icon
    await updatePwaBranding(localLogo);
  } else {
    // If no custom logo uploaded, use default PWA assets
    const ts = Date.now();
    const manifestLink = document.getElementById('pwa-manifest-link') as HTMLLinkElement | null || document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (manifestLink) {
      manifestLink.setAttribute('href', `/manifest.webmanifest?v=${ts}`);
    }
    const appleTouchLink = document.getElementById('app-apple-touch-icon') as HTMLLinkElement | null || document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
    if (appleTouchLink) {
      appleTouchLink.setAttribute('href', `/apple-touch-icon.png?v=${ts}`);
    }
    const faviconPng = document.getElementById('app-favicon-png') as HTMLLinkElement | null;
    if (faviconPng) {
      faviconPng.setAttribute('href', `/pwa-192x192.png?v=${ts}`);
    }
  }

  // Listen for admin logo updates across the application and windows
  const handleLogoUpdate = (e: Event) => {
    const customEv = e as CustomEvent<{ logo?: string | null }>;
    updatePwaBranding(customEv.detail?.logo);
  };

  window.addEventListener('cbe_logo_updated', handleLogoUpdate);
  window.addEventListener('bank_logo_updated', handleLogoUpdate);
  window.addEventListener('storage', (e) => {
    if (e.key === 'tana_custom_bank_logo') {
      const newLogo = LocalDb.getCustomBankLogo();
      updatePwaBranding(newLogo);
    }
  });
}

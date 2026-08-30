import { LocalDb, DEFAULT_CBE_LOGO } from '../lib/mockData';

/**
 * PWA Dynamic Branding & Icon Manager
 * Ensures the installed PWA / WebAPK / home screen shortcut uses the custom logo uploaded by the admin.
 */

const BASE_MANIFEST = {
  short_name: 'Tana Bank',
  name: 'Tana Digital Bank - Mobile Banking',
  description: 'Commercial Bank of Ethiopia & Tana Digital Mobile Banking application with instant transfers, bill payments, and secure account management.',
  start_url: '/',
  scope: '/',
  display: 'fullscreen',
  display_override: ['fullscreen', 'standalone', 'minimal-ui', 'browser'],
  orientation: 'portrait-primary',
  theme_color: '#300642',
  background_color: '#0f172a',
  lang: 'en',
  dir: 'ltr',
  categories: ['finance', 'business', 'utilities']
};

let dynamicManifestObjectUrl: string | null = null;

/**
 * Generates and applies a dynamic Web App Manifest with the admin-uploaded logo.
 */
export function updatePwaBranding(customLogoUrl?: string | null): void {
  const activeLogo = customLogoUrl ?? LocalDb.getCustomBankLogo() ?? DEFAULT_CBE_LOGO;

  try {
    // 1. Build the updated manifest payload
    const dynamicManifest = {
      ...BASE_MANIFEST,
      icons: [
        {
          src: activeLogo,
          sizes: '192x192 512x512',
          type: activeLogo.startsWith('data:image/svg') || activeLogo.endsWith('.svg') 
            ? 'image/svg+xml' 
            : (activeLogo.startsWith('data:image/png') ? 'image/png' : 'image/png'),
          purpose: 'any'
        },
        {
          src: activeLogo,
          sizes: '512x512',
          type: activeLogo.startsWith('data:image/svg') || activeLogo.endsWith('.svg') 
            ? 'image/svg+xml' 
            : 'image/png',
          purpose: 'maskable'
        }
      ]
    };

    // 2. Revoke previous blob URL if created
    if (dynamicManifestObjectUrl) {
      URL.revokeObjectURL(dynamicManifestObjectUrl);
      dynamicManifestObjectUrl = null;
    }

    const manifestBlob = new Blob([JSON.stringify(dynamicManifest, null, 2)], {
      type: 'application/manifest+json'
    });
    dynamicManifestObjectUrl = URL.createObjectURL(manifestBlob);

    // 3. Update or insert <link rel="manifest"> in document head
    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = dynamicManifestObjectUrl;

    // 4. Update <link rel="icon">
    let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (faviconLink) {
      faviconLink.href = activeLogo;
    }

    // 5. Update <link rel="apple-touch-icon"> for iOS Safari & Home Screen
    let appleTouchLink = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
    if (!appleTouchLink) {
      appleTouchLink = document.createElement('link');
      appleTouchLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleTouchLink);
    }
    appleTouchLink.href = activeLogo;

    // 6. Update mask icon if exists
    let maskIconLink = document.querySelector('link[rel="mask-icon"]') as HTMLLinkElement | null;
    if (maskIconLink) {
      maskIconLink.href = activeLogo;
    }

    console.info('[PWA Branding] Updated manifest and icons with admin logo.');
  } catch (err) {
    console.warn('[PWA Branding] Failed to dynamically update manifest:', err);
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

import { LocalDb, DEFAULT_CBE_LOGO } from '../lib/mockData';

/**
 * PWA Dynamic Branding & Icon Manager
 * Ensures the installed PWA / WebAPK / home screen shortcut uses the custom logo uploaded by the admin.
 */

const BASE_MANIFEST = {
  id: '/',
  short_name: 'CBE Mobile Banking',
  name: 'CBE Mobile Banking',
  description: 'Commercial Bank of Ethiopia (CBE) Mobile Banking application with instant transfers, bill payments, and secure account management.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  display_override: ['standalone', 'minimal-ui', 'fullscreen', 'browser'],
  orientation: 'portrait-primary',
  theme_color: '#300642',
  background_color: '#0f172a',
  lang: 'en',
  dir: 'ltr',
  categories: ['finance', 'business', 'utilities']
};

let dynamicManifestObjectUrl: string | null = null;

/**
 * Generates and applies a dynamic Web App Manifest if a custom admin logo is set.
 */
export function updatePwaBranding(customLogoUrl?: string | null): void {
  const customLogo = customLogoUrl ?? LocalDb.getCustomBankLogo();
  
  // Ensure manifest link always points to valid static /manifest.webmanifest (never a blob: URL which breaks Chrome PWA installation)
  let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
  if (manifestLink && (!manifestLink.href.endsWith('/manifest.webmanifest') || manifestLink.href.startsWith('blob:'))) {
    manifestLink.href = '/manifest.webmanifest';
  }

  if (!customLogo) {
    return;
  }

  const activeLogo = customLogo;

  try {
    // Revoke any legacy blob URL if present
    if (dynamicManifestObjectUrl) {
      URL.revokeObjectURL(dynamicManifestObjectUrl);
      dynamicManifestObjectUrl = null;
    }

    // Update <link rel="icon">
    let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (faviconLink) {
      faviconLink.href = activeLogo;
    }

    // Update <link rel="apple-touch-icon"> for iOS Safari & Home Screen
    let appleTouchLink = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
    if (!appleTouchLink) {
      appleTouchLink = document.createElement('link');
      appleTouchLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleTouchLink);
    }
    appleTouchLink.href = activeLogo;

    // Update mask icon if exists
    let maskIconLink = document.querySelector('link[rel="mask-icon"]') as HTMLLinkElement | null;
    if (maskIconLink) {
      maskIconLink.href = activeLogo;
    }

    console.info('[PWA Branding] Updated icons with active bank logo.');
  } catch (err) {
    console.warn('[PWA Branding] Failed to update icons:', err);
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

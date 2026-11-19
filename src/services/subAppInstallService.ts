import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  SUB_APP_NOTIFICATION_META,
  SubAppNotificationId,
} from './pushNotificationService';
import { PhoneSettingsService } from './phoneSettingsService';
import { AppLogoService, BrandAppId, BRAND_APP_MAP } from './appLogoService';
import {
  getCapturedInstallPrompt,
  triggerCapturedInstallPrompt,
} from '../hooks/usePWAInstall';

interface SubAppShortcutPluginInterface {
  isPinSupported(): Promise<{ supported: boolean }>;
  getLaunchSubApp(): Promise<{ view: string | null }>;
  pinSubApp(options: {
    subAppId: string;
    label: string;
    iconName: string;
    iconBase64?: string;
  }): Promise<{ supported: boolean; pinned: boolean }>;
}

const SubAppShortcut = registerPlugin<SubAppShortcutPluginInterface>('SubAppShortcut');

const VALID_SUB_APPS: SubAppNotificationId[] = [
  'sms',
  'truecaller',
  'telebirr',
  'dashen',
  'telegram',
  'phone',
];

export interface SubAppInstallResult {
  ok: boolean;
  mode: 'android_shortcut' | 'ios_safari' | 'web_install_prompt' | 'web_route';
  message: string;
  routePath: string;
}

export class SubAppInstallService {
  public static isValidSubApp(view: unknown): view is SubAppNotificationId {
    return typeof view === 'string' && (VALID_SUB_APPS as string[]).includes(view);
  }

  public static async consumeNativeLaunchSubApp(): Promise<SubAppNotificationId | null> {
    if (!Capacitor.isNativePlatform()) return null;
    try {
      const res = await SubAppShortcut.getLaunchSubApp();
      if (res?.view && this.isValidSubApp(res.view)) {
        return res.view;
      }
    } catch {
      // Ignore if running in browser or older APK build
    }
    return null;
  }

  /**
   * Installs either the main CBE Mobile Banking PWA or any standalone sub-app
   * guaranteeing the uploaded custom logo is active in the manifest / Apple Touch Icon / Android shortcut.
   */
  public static async installAppWithCustomLogo(
    appId: BrandAppId
  ): Promise<SubAppInstallResult> {
    if (appId !== 'cbe') {
      return this.installSubAppToHomeScreen(appId);
    }

    const spec = BRAND_APP_MAP.cbe;
    const hasCustom = AppLogoService.hasCustomLogo('cbe');
    AppLogoService.applyHeadBrandingForApp('cbe');

    if (Capacitor.isNativePlatform()) {
      return {
        ok: true,
        mode: 'android_shortcut',
        routePath: '/',
        message: hasCustom
          ? 'Custom CBE logo saved! To install the standalone web version with this custom icon on Android/iOS, open cbebank.online in Chrome/Safari and tap Install App.'
          : 'CBE Mobile Banking is already installed as an Android app on this device.',
      };
    }

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isIOS =
      /iPad|iPhone|iPod/i.test(ua) ||
      (typeof navigator !== 'undefined' &&
        navigator.platform === 'MacIntel' &&
        navigator.maxTouchPoints > 1);

    if (isIOS) {
      return {
        ok: true,
        mode: 'ios_safari',
        routePath: '/',
        message: hasCustom
          ? 'Custom CBE logo is active! In Safari, tap Share (↑) → Add to Home Screen to install CBE Mobile with your uploaded logo.'
          : 'In Safari, tap Share (↑) → Add to Home Screen to install CBE Mobile Banking.',
      };
    }

    const currentApp = AppLogoService.detectAppIdFromPath();
    if (currentApp === 'cbe' && getCapturedInstallPrompt()) {
      const outcome = await triggerCapturedInstallPrompt();
      if (outcome === 'accepted') {
        return {
          ok: true,
          mode: 'web_install_prompt',
          routePath: '/',
          message: hasCustom
            ? 'CBE Mobile Banking installed with your custom uploaded logo!'
            : 'CBE Mobile Banking installed to your Home Screen!',
        };
      }
    }

    if (currentApp !== 'cbe' && typeof window !== 'undefined') {
      window.location.assign('/');
    }

    return {
      ok: true,
      mode: 'web_route',
      routePath: '/',
      message: hasCustom
        ? 'Custom CBE logo applied to manifest! Tap browser menu (⋮) → "Install app" or "Add to Home screen" to install with your uploaded logo.'
        : 'Tap browser menu (⋮) → "Install app" or "Add to Home screen" to install CBE Mobile Banking.',
    };
  }

  public static async installSubAppToHomeScreen(
    subAppId: SubAppNotificationId
  ): Promise<SubAppInstallResult> {
    const meta = SUB_APP_NOTIFICATION_META[subAppId];
    const routePath = `/${subAppId}/`;
    const isIosSms = subAppId === 'sms' && PhoneSettingsService.isIPhoneMode();
    const iconName = isIosSms ? 'ic_notif_sms_ios' : meta.largeIcon;
    const customIconBase64 = AppLogoService.getAndroidShortcutBase64(subAppId);
    const hasCustom = Boolean(customIconBase64);

    if (Capacitor.isNativePlatform()) {
      try {
        const res = await SubAppShortcut.pinSubApp({
          subAppId,
          label: meta.shortName,
          iconName,
          iconBase64: customIconBase64 || undefined,
        });
        if (res?.supported && res?.pinned) {
          return {
            ok: true,
            mode: 'android_shortcut',
            routePath,
            message: hasCustom
              ? `${meta.shortName} Home Screen shortcut requested with your uploaded custom logo! Confirm "Add" on your Android launcher.`
              : `${meta.shortName} Home Screen icon requested! Confirm "Add" on your Android launcher — it stays 100% synced with CBE Mobile Banking.`,
          };
        }
        return {
          ok: false,
          mode: 'android_shortcut',
          routePath,
          message:
            'Your Android launcher blocked pinned shortcuts. Check Home Screen shortcut permissions in Android settings.',
        };
      } catch (err) {
        return {
          ok: false,
          mode: 'android_shortcut',
          routePath,
          message:
            err instanceof Error
              ? err.message
              : 'Install the latest APK build to pin sub-app icons directly to your Android Home Screen.',
        };
      }
    }

    // Apply latest uploaded logo to <head> manifest & Apple Touch Icon immediately
    AppLogoService.applyHeadBrandingForApp(subAppId, { isIPhone: isIosSms });

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isIOS =
      /iPad|iPhone|iPod/i.test(ua) ||
      (typeof navigator !== 'undefined' &&
        navigator.platform === 'MacIntel' &&
        navigator.maxTouchPoints > 1);

    if (isIOS) {
      const fullUrl =
        typeof window !== 'undefined' ? `${window.location.origin}${routePath}` : routePath;
      const onSubAppRoute = AppLogoService.detectAppIdFromPath() === subAppId;
      if (onSubAppRoute) {
        return {
          ok: true,
          mode: 'ios_safari',
          routePath,
          message: hasCustom
            ? `Your custom ${meta.shortName} logo is ready! Tap Safari Share (↑) → Add to Home Screen to install ${meta.shortName} with your uploaded logo.`
            : `Tap Safari Share (↑) → Add to Home Screen right here to install ${meta.shortName} with its own icon.`,
        };
      }
      let copied = false;
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(fullUrl);
          copied = true;
        }
      } catch {}
      return {
        ok: true,
        mode: 'ios_safari',
        routePath,
        message: copied
          ? `Link copied (${routePath})! Open iPhone Safari, paste it, then tap Share → Add to Home Screen for ${meta.shortName} with ${hasCustom ? 'your uploaded custom logo' : 'its own icon'}.`
          : `Open ${fullUrl} in iPhone Safari, then tap Share → Add to Home Screen for ${meta.shortName}.`,
      };
    }

    // Android Chrome / Desktop browser:
    const currentApp = AppLogoService.detectAppIdFromPath();
    if (currentApp === subAppId) {
      // Already on the dedicated standalone sub-app route — trigger real browser Install App dialog if available!
      if (getCapturedInstallPrompt()) {
        const outcome = await triggerCapturedInstallPrompt();
        if (outcome === 'accepted') {
          return {
            ok: true,
            mode: 'web_install_prompt',
            routePath,
            message: hasCustom
              ? `${meta.shortName} installed with your custom uploaded logo!`
              : `${meta.shortName} installed as a standalone app!`,
          };
        }
      }
      return {
        ok: true,
        mode: 'web_route',
        routePath,
        message: hasCustom
          ? `Custom ${meta.shortName} logo is active on ${routePath}! Tap browser menu (⋮) → "Install app" to install ${meta.shortName} with your uploaded logo.`
          : `Ready on ${routePath}! Tap browser menu (⋮) → "Install app" or "Add to Home screen" to install ${meta.shortName}.`,
      };
    }

    // Full navigation to the dedicated standalone sub-app scope (/sms/, /truecaller/, etc.)
    // so Chrome loads its isolated manifest (/api/pwa/manifest?app=<id>) and scoped Service Worker cleanly!
    try {
      if (typeof window !== 'undefined') {
        const custom = AppLogoService.getCustomLogo(subAppId);
        const targetUrl = custom?.updatedAt
          ? `${routePath}?v=${custom.updatedAt}`
          : routePath;
        window.location.assign(targetUrl);
      }
    } catch {}

    return {
      ok: true,
      mode: 'web_route',
      routePath,
      message: `Opening ${routePath} with ${hasCustom ? 'your custom uploaded logo' : `${meta.shortName}'s icon`} — tap browser menu (⋮) → "Install app".`,
    };
  }
}

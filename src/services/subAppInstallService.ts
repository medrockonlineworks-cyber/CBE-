import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  SUB_APP_NOTIFICATION_META,
  SubAppNotificationId,
} from './pushNotificationService';
import { PhoneSettingsService } from './phoneSettingsService';

interface SubAppShortcutPluginInterface {
  isPinSupported(): Promise<{ supported: boolean }>;
  getLaunchSubApp(): Promise<{ view: string | null }>;
  pinSubApp(options: {
    subAppId: string;
    label: string;
    iconName: string;
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
  mode: 'android_shortcut' | 'ios_safari' | 'web_route';
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

  public static async installSubAppToHomeScreen(
    subAppId: SubAppNotificationId
  ): Promise<SubAppInstallResult> {
    const meta = SUB_APP_NOTIFICATION_META[subAppId];
    const routePath = `/${subAppId}/`;
    const isIosSms = subAppId === 'sms' && PhoneSettingsService.isIPhoneMode();
    const iconName = isIosSms ? 'ic_notif_sms_ios' : meta.largeIcon;

    if (Capacitor.isNativePlatform()) {
      try {
        const res = await SubAppShortcut.pinSubApp({
          subAppId,
          label: meta.shortName,
          iconName,
        });
        if (res?.supported && res?.pinned) {
          return {
            ok: true,
            mode: 'android_shortcut',
            routePath,
            message: `${meta.shortName} Home Screen icon requested! Confirm "Add" on your Android launcher — it stays 100% synced with CBE Mobile Banking.`,
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

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isIOS =
      /iPad|iPhone|iPod/i.test(ua) ||
      (typeof navigator !== 'undefined' &&
        navigator.platform === 'MacIntel' &&
        navigator.maxTouchPoints > 1);

    if (isIOS) {
      const fullUrl =
        typeof window !== 'undefined' ? `${window.location.origin}${routePath}` : routePath;
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
          ? `Link copied (${routePath})! Open iPhone Safari, paste it, then tap Share → Add to Home Screen for ${meta.shortName}'s own icon.`
          : `Open ${fullUrl} in iPhone Safari, then tap Share → Add to Home Screen for ${meta.shortName}'s own icon.`,
      };
    }

    // Android Chrome / Desktop browser: navigate directly to the sub-app's dedicated manifest route
    try {
      if (typeof window !== 'undefined') {
        const currentPath = (window.location.pathname || '').toLowerCase();
        if (currentPath !== routePath) {
          window.history.pushState({ view: subAppId, tab: 'home' }, '', routePath);
        }
      }
    } catch {}

    return {
      ok: true,
      mode: 'web_route',
      routePath,
      message: `Now on ${routePath} with ${meta.shortName}'s own icon! Tap your browser menu (⋮) → "Add to Home screen" or "Install app" — it stays synced with CBE Mobile Banking.`,
    };
  }
}

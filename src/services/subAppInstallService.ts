import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
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
  getLaunchSubApp(): Promise<{
    view: string | null;
    isMessagesApk?: boolean;
    isStandaloneSubApp?: boolean;
    defaultStartView?: string;
  }>;
  getAppFlavor(): Promise<{
    isMessagesApk: boolean;
    isStandaloneSubApp?: boolean;
    defaultStartView: string;
    packageName: string;
  }>;
  isMessagesApkInstalled(): Promise<{ installed: boolean }>;
  isSubAppApkInstalled(options: { subAppId: string }): Promise<{ installed: boolean; packageName?: string }>;
  sendSmsToMessagesApk(options: {
    sender: string;
    body: string;
    smsId?: string;
    reference?: string;
    smsRecordJson?: string;
  }): Promise<{ installed: boolean; delivered: boolean; error?: string }>;
  sendAlertToSubAppApk(options: {
    subAppId: string;
    sender: string;
    body: string;
    alertId?: string;
    reference?: string;
    payloadJson?: string;
  }): Promise<{ installed: boolean; delivered: boolean; error?: string }>;
  drainNativeIncomingSms(): Promise<{ recordsJson: string; readIdsJson: string }>;
  drainNativeIncomingSubAppAlerts(options: { subAppId: string }): Promise<{
    recordsJson: string;
    readIdsJson?: string;
    dismissedIdsJson?: string;
  }>;
  clearTruecallerNotifications(): Promise<{ cleared: boolean }>;
  canDrawOverlays(): Promise<{ granted: boolean }>;
  requestOverlayPermission(): Promise<{ opened: boolean; alreadyGranted?: boolean; error?: string }>;
  setActiveTruecallerOverlay(options: {
    alertId: string;
    reference?: string;
    bankLabel: string;
    actionLine: string;
    amountLine: string;
    timeDisplay: string;
    showImmediately?: boolean;
  }): Promise<{ saved: boolean; canDrawOverlays?: boolean }>;
  hideTruecallerOverlay(): Promise<{ hidden: boolean }>;
  pushNativeSyncEntries(options: {
    entriesJson: string;
    seedOnly?: boolean;
  }): Promise<{ ok: boolean; updated?: boolean; error?: string }>;
  pullNativeSyncEntries(): Promise<{ ok: boolean; entriesJson: string; error?: string }>;
  pinSubApp(options: {
    subAppId: string;
    label: string;
    iconName: string;
    iconBase64?: string;
  }): Promise<{ supported: boolean; pinned: boolean }>;
  setNavigationBarStyle(options: { color: string; isDark: boolean }): Promise<void>;
}

const SubAppShortcut = registerPlugin<SubAppShortcutPluginInterface>('SubAppShortcut');

const VALID_SUB_APPS: SubAppNotificationId[] = [
  'sms',
  'truecaller',
  'phone',
];

export interface SubAppInstallResult {
  ok: boolean;
  mode: 'android_shortcut' | 'ios_safari' | 'web_install_prompt' | 'web_route';
  message: string;
  routePath: string;
}

export class SubAppInstallService {
  private static cachedIsMessagesApk: boolean | null = null;
  private static cachedStandaloneFlavor: SubAppNotificationId | '' | null = null;

  public static isValidSubApp(view: unknown): view is SubAppNotificationId {
    return typeof view === 'string' && (VALID_SUB_APPS as string[]).includes(view);
  }

  public static setNativeNavigationBarStyle(color: string, isDark: boolean): void {
    if (!Capacitor.isNativePlatform()) return;
    try {
      SubAppShortcut.setNavigationBarStyle({ color, isDark }).catch(() => {});
    } catch {
      // Safe non-blocking
    }
  }

  public static async getStandaloneSubAppFlavor(): Promise<SubAppNotificationId | null> {
    if (!Capacitor.isNativePlatform()) return null;
    if (this.cachedStandaloneFlavor !== null) {
      return this.cachedStandaloneFlavor || null;
    }
    try {
      const res = await SubAppShortcut.getAppFlavor();
      this.cachedIsMessagesApk = Boolean(res?.isMessagesApk);
      const view = (res?.defaultStartView || '').trim().toLowerCase();
      if (this.isValidSubApp(view)) {
        this.cachedStandaloneFlavor = view;
        return view;
      }
      if (res?.isMessagesApk) {
        this.cachedStandaloneFlavor = 'sms';
        return 'sms';
      }
      this.cachedStandaloneFlavor = '';
      return null;
    } catch {
      this.cachedStandaloneFlavor = '';
      return null;
    }
  }

  public static async isStandaloneMessagesApk(): Promise<boolean> {
    const flavor = await this.getStandaloneSubAppFlavor();
    return flavor === 'sms';
  }

  public static async isMessagesApkInstalled(): Promise<boolean> {
    return this.isSubAppApkInstalled('sms');
  }

  public static async isSubAppApkInstalled(subAppId: SubAppNotificationId): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      if (subAppId === 'sms') {
        const res = await SubAppShortcut.isMessagesApkInstalled();
        return Boolean(res?.installed);
      }
      const res = await SubAppShortcut.isSubAppApkInstalled({ subAppId });
      return Boolean(res?.installed);
    } catch {
      return false;
    }
  }

  public static async sendSmsToMessagesApk(params: {
    sender: string;
    body: string;
    smsId?: string;
    reference?: string;
    smsRecord?: Record<string, unknown>;
  }): Promise<{ installed: boolean; delivered: boolean }> {
    if (!Capacitor.isNativePlatform()) {
      return { installed: false, delivered: false };
    }
    try {
      const res = await SubAppShortcut.sendSmsToMessagesApk({
        sender: params.sender,
        body: params.body,
        smsId: params.smsId || '',
        reference: params.reference || '',
        smsRecordJson: params.smsRecord ? JSON.stringify(params.smsRecord) : '',
      });
      return {
        installed: Boolean(res?.installed),
        delivered: Boolean(res?.delivered),
      };
    } catch {
      return { installed: false, delivered: false };
    }
  }

  public static async sendAlertToSubAppApk(params: {
    subAppId: 'sms' | 'truecaller' | 'phone';
    sender: string;
    body: string;
    alertId?: string;
    reference?: string;
    payloadRecord?: Record<string, unknown>;
  }): Promise<{ installed: boolean; delivered: boolean }> {
    if (!Capacitor.isNativePlatform()) {
      return { installed: false, delivered: false };
    }
    if (params.subAppId === 'sms') {
      return this.sendSmsToMessagesApk({
        sender: params.sender,
        body: params.body,
        smsId: params.alertId,
        reference: params.reference,
        smsRecord: params.payloadRecord,
      });
    }
    try {
      const res = await SubAppShortcut.sendAlertToSubAppApk({
        subAppId: params.subAppId,
        sender: params.sender,
        body: params.body,
        alertId: params.alertId || '',
        reference: params.reference || '',
        payloadJson: params.payloadRecord ? JSON.stringify(params.payloadRecord) : '',
      });
      return {
        installed: Boolean(res?.installed),
        delivered: Boolean(res?.delivered),
      };
    } catch {
      return { installed: false, delivered: false };
    }
  }

  public static async drainNativeIncomingSms(): Promise<{
    records: Array<Record<string, unknown>>;
    readIds: Array<{ smsId?: string; reference?: string }>;
  }> {
    if (!Capacitor.isNativePlatform()) {
      return { records: [], readIds: [] };
    }
    try {
      const res = await SubAppShortcut.drainNativeIncomingSms();
      const parsedRecords = res?.recordsJson ? JSON.parse(res.recordsJson) : [];
      const parsedReads = res?.readIdsJson ? JSON.parse(res.readIdsJson) : [];
      return {
        records: Array.isArray(parsedRecords) ? parsedRecords : [],
        readIds: Array.isArray(parsedReads) ? parsedReads : [],
      };
    } catch {
      return { records: [], readIds: [] };
    }
  }

  public static async drainNativeIncomingSubAppAlerts(
    subAppId: 'truecaller' | 'phone'
  ): Promise<Array<Record<string, unknown>>> {
    const res = await this.drainNativeSubAppBridge(subAppId);
    return res.records;
  }

  public static async drainNativeSubAppBridge(
    subAppId: 'truecaller' | 'phone'
  ): Promise<{
    records: Array<Record<string, unknown>>;
    readIds: Array<{ alertId?: string; reference?: string }>;
    dismissedIds: Array<{ alertId?: string; reference?: string }>;
  }> {
    if (!Capacitor.isNativePlatform()) {
      return { records: [], readIds: [], dismissedIds: [] };
    }
    try {
      const res = await SubAppShortcut.drainNativeIncomingSubAppAlerts({ subAppId });
      const parsed = res?.recordsJson ? JSON.parse(res.recordsJson) : [];
      const parsedReads = res?.readIdsJson ? JSON.parse(res.readIdsJson) : [];
      const parsedDismissed = res?.dismissedIdsJson ? JSON.parse(res.dismissedIdsJson) : [];
      return {
        records: Array.isArray(parsed) ? parsed : [],
        readIds: Array.isArray(parsedReads) ? parsedReads : [],
        dismissedIds: Array.isArray(parsedDismissed) ? parsedDismissed : [],
      };
    } catch {
      return { records: [], readIds: [], dismissedIds: [] };
    }
  }

  public static async canDrawOverlays(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return true;
    try {
      const res = await SubAppShortcut.canDrawOverlays();
      return Boolean(res?.granted);
    } catch {
      return false;
    }
  }

  public static async requestOverlayPermission(): Promise<{ opened: boolean; alreadyGranted?: boolean }> {
    if (!Capacitor.isNativePlatform()) {
      return { opened: false, alreadyGranted: true };
    }
    try {
      const res = await SubAppShortcut.requestOverlayPermission();
      return {
        opened: Boolean(res?.opened),
        alreadyGranted: Boolean(res?.alreadyGranted),
      };
    } catch {
      return { opened: false };
    }
  }

  public static async setActiveTruecallerOverlay(params: {
    alertId: string;
    reference?: string;
    bankLabel: string;
    actionLine: string;
    amountLine: string;
    timeDisplay: string;
    showImmediately?: boolean;
  }): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await SubAppShortcut.setActiveTruecallerOverlay({
        alertId: params.alertId,
        reference: params.reference || '',
        bankLabel: params.bankLabel || 'CBE',
        actionLine: params.actionLine,
        amountLine: params.amountLine,
        timeDisplay: params.timeDisplay || 'Now',
        showImmediately: Boolean(params.showImmediately),
      });
    } catch {
      // Safe fallback on older APKs
    }
  }

  public static async hideNativeTruecallerOverlay(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await SubAppShortcut.hideTruecallerOverlay();
    } catch {
      // Safe fallback on older APKs
    }
  }

  public static async pushNativeSyncEntries(
    entries: Record<string, { value: string; updatedAt: number }>,
    options?: { seedOnly?: boolean }
  ): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const res = await SubAppShortcut.pushNativeSyncEntries({
        entriesJson: JSON.stringify(entries),
        seedOnly: Boolean(options?.seedOnly),
      });
      return Boolean(res?.ok);
    } catch {
      return false;
    }
  }

  public static async pullNativeSyncEntries(): Promise<
    Record<string, { value: string; updatedAt: number }> | null
  > {
    if (!Capacitor.isNativePlatform()) return null;
    try {
      const res = await SubAppShortcut.pullNativeSyncEntries();
      if (!res?.ok || !res.entriesJson) return null;
      const parsed = JSON.parse(res.entriesJson);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  public static async clearNativeTruecallerNotifications(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await SubAppShortcut.hideTruecallerOverlay();
    } catch {
      // Safe fallback on older APKs
    }
    try {
      await SubAppShortcut.clearTruecallerNotifications();
    } catch {
      // Safe fallback on older APKs
    }
    try {
      const delivered = await LocalNotifications.getDeliveredNotifications();
      const tcNotifs = (delivered?.notifications || []).filter(
        (n) => (n?.extra as Record<string, unknown> | undefined)?.view === 'truecaller'
      );
      if (tcNotifs.length > 0) {
        await LocalNotifications.removeDeliveredNotifications({
          notifications: tcNotifs,
        });
      }
    } catch {
      // Non-fatal
    }
  }

  public static async consumeNativeLaunchSubApp(): Promise<SubAppNotificationId | null> {
    if (!Capacitor.isNativePlatform()) return null;
    try {
      const res = await SubAppShortcut.getLaunchSubApp();
      if (typeof res?.isMessagesApk === 'boolean') {
        this.cachedIsMessagesApk = res.isMessagesApk;
      }
      const flavorView = (res?.defaultStartView || '').trim().toLowerCase();
      if (this.isValidSubApp(flavorView)) {
        this.cachedStandaloneFlavor = flavorView;
      }
      if (res?.view && this.isValidSubApp(res.view)) {
        return res.view;
      }
      if (this.isValidSubApp(flavorView)) {
        return flavorView;
      }
      if (res?.isMessagesApk) {
        return 'sms';
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

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isIOS =
      /iPad|iPhone|iPod/i.test(ua) ||
      (typeof navigator !== 'undefined' &&
        navigator.platform === 'MacIntel' &&
        navigator.maxTouchPoints > 1);

    const bootedSubApp =
      typeof window !== 'undefined'
        ? (window as unknown as { __CBE_LOCKED_SUBAPP__?: string }).__CBE_LOCKED_SUBAPP__
        : undefined;
    const isDirectlyLoadedSubApp =
      bootedSubApp === subAppId && AppLogoService.detectAppIdFromPath() === subAppId;

    // Only mutate <head> manifest/icon when we are ALREADY directly booted on this sub-app's standalone HTML
    if (isDirectlyLoadedSubApp) {
      AppLogoService.applyHeadBrandingForApp(subAppId, { isIPhone: isIosSms });
    }

    if (isIOS) {
      const fullUrl =
        typeof window !== 'undefined' ? `${window.location.origin}${routePath}` : routePath;
      if (isDirectlyLoadedSubApp) {
        return {
          ok: true,
          mode: 'ios_safari',
          routePath,
          message: hasCustom
            ? `Your custom ${meta.shortName} logo is ready! Tap Safari Share (↑) → Add to Home Screen to install ${meta.shortName} with your uploaded logo.`
            : `Tap Safari Share (↑) → Add to Home Screen right here to install ${meta.shortName} with its own icon.`,
        };
      }
      // If inside Safari browser (not standalone CBE PWA), navigate directly to the dedicated standalone HTML
      // so Safari loads /phone/index.html with start_url="/phone/" before Add to Home Screen!
      const isStandalonePwa =
        typeof window !== 'undefined' &&
        (window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as unknown as { standalone?: boolean }).standalone === true);
      if (!isStandalonePwa && typeof window !== 'undefined') {
        window.location.assign(routePath);
        return {
          ok: true,
          mode: 'ios_safari',
          routePath,
          message: `Opening standalone ${meta.shortName} (${routePath}) — tap Safari Share (↑) → Add to Home Screen.`,
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
          ? `Link copied (${routePath})! Open iPhone Safari, paste it, then tap Share → Add to Home Screen so ${meta.shortName} opens directly without CBE.`
          : `Open ${fullUrl} in iPhone Safari, then tap Share → Add to Home Screen so ${meta.shortName} opens directly without CBE.`,
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

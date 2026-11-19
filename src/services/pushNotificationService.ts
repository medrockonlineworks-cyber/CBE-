import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Transaction, UserProfile } from '../types';
import { AuthSessionService } from './authSessionService';
import { PhoneSettingsService } from './phoneSettingsService';
import { CrossAppSyncService } from './crossAppSyncService';

export type PrivacyMode = 'detailed' | 'private';

export type NotificationCategory =
  | 'money_received'
  | 'money_sent'
  | 'cash_deposit'
  | 'cash_withdrawal'
  | 'transaction_failed'
  | 'security_alert'
  | 'security_update'
  | 'account_update';

export interface NotificationPreferences {
  userId: string;
  enabled: boolean;
  transactionNotifications: boolean;
  depositNotifications: boolean;
  withdrawalNotifications: boolean;
  transferNotifications: boolean;
  securityNotifications: boolean;
  privacyMode: PrivacyMode;
  updatedAt?: string;
}

export interface SubscribedDeviceInfo {
  id: string;
  deviceLabel: string;
  platform: 'ios' | 'android' | 'desktop';
  isCurrentDevice: boolean;
  updatedAt: string;
  lastSuccessAt?: string;
}

export interface NotificationStatusResponse {
  ok: boolean;
  mode?: 'webpush' | 'local';
  vapidPublicKey?: string;
  subscribed: boolean;
  hasAnySubscription: boolean;
  deviceCount: number;
  devices: SubscribedDeviceInfo[];
  preferences: NotificationPreferences;
}

export interface PlatformPushCapabilities {
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  isInIframe: boolean;
  isSecureContext: boolean;
  isPushSupported: boolean;
  isLocalSwSupported: boolean;
  requiresIosHomeScreenInstall: boolean;
  permission: NotificationPermission | 'unsupported';
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  userId: '',
  enabled: true,
  transactionNotifications: true,
  depositNotifications: true,
  withdrawalNotifications: true,
  transferNotifications: true,
  securityNotifications: true,
  privacyMode: 'detailed',
};

export type SubAppNotificationId =
  | 'sms'
  | 'truecaller'
  | 'telebirr'
  | 'dashen'
  | 'telegram'
  | 'phone';

export interface SubAppPushConfig {
  enabled: boolean;
  showPreview: boolean;
  updatedAt?: string;
}

export type SubAppPushPreferencesMap = Record<SubAppNotificationId, SubAppPushConfig>;

export interface SubAppNotificationMeta {
  id: SubAppNotificationId;
  name: string;
  shortName: string;
  description: string;
  channelId: string;
  channelName: string;
  color: string;
  url: string;
  defaultSender: string;
  smallIcon: string;
  largeIcon: string;
  webIcon: string;
}

export const SUB_APP_NOTIFICATION_META: Record<SubAppNotificationId, SubAppNotificationMeta> = {
  sms: {
    id: 'sms',
    name: 'SMS Simulator',
    shortName: 'Messages',
    description: 'Google Messages & iPhone Messages bank debit/credit SMS alerts',
    channelId: 'cbe-subapp-sms',
    channelName: 'Messages',
    color: '#1a73e8',
    url: '/?view=sms',
    defaultSender: 'CBE',
    smallIcon: 'ic_stat_sms',
    largeIcon: 'ic_notif_sms',
    webIcon: '/icons/notif-sms.png',
  },
  truecaller: {
    id: 'truecaller',
    name: 'Truecaller SMS Simulator',
    shortName: 'Truecaller',
    description: 'Real device heads-up notifications for Truecaller pop-down bank alerts',
    channelId: 'cbe-subapp-truecaller',
    channelName: 'Truecaller',
    color: '#0066FF',
    url: '/?view=truecaller',
    defaultSender: 'Truecaller • CBE',
    smallIcon: 'ic_stat_truecaller',
    largeIcon: 'ic_notif_truecaller',
    webIcon: '/icons/notif-truecaller.png',
  },
  telebirr: {
    id: 'telebirr',
    name: 'Telebirr Super App',
    shortName: 'telebirr',
    description: 'Mobile wallet deposits, P2P transfers & bank transfer alerts',
    channelId: 'cbe-subapp-telebirr',
    channelName: 'telebirr',
    color: '#5cb82e',
    url: '/?view=telebirr',
    defaultSender: 'telebirr',
    smallIcon: 'ic_stat_telebirr',
    largeIcon: 'ic_notif_telebirr',
    webIcon: '/icons/notif-telebirr.png',
  },
  dashen: {
    id: 'dashen',
    name: 'Dashen Bank Super App',
    shortName: 'DashenBank',
    description: 'Dashen account credits, outgoing transfers & IPS alerts',
    channelId: 'cbe-subapp-dashen',
    channelName: 'DashenBank',
    color: '#1e3a8a',
    url: '/?view=dashen',
    defaultSender: 'DashenBank',
    smallIcon: 'ic_stat_dashen',
    largeIcon: 'ic_notif_dashen',
    webIcon: '/icons/notif-dashen.png',
  },
  telegram: {
    id: 'telegram',
    name: 'Telegram Chat Simulator',
    shortName: 'Telegram',
    description: 'Incoming simulated chat messages & payment receipt alerts',
    channelId: 'cbe-subapp-telegram',
    channelName: 'Telegram',
    color: '#229ED9',
    url: '/?view=telegram',
    defaultSender: 'Telegram',
    smallIcon: 'ic_stat_telegram',
    largeIcon: 'ic_notif_telegram',
    webIcon: '/icons/notif-telegram.png',
  },
  phone: {
    id: 'phone',
    name: 'Phone & USSD (*889#)',
    shortName: 'Phone',
    description: 'Completed USSD banking transfers & airtime confirmations',
    channelId: 'cbe-subapp-phone',
    channelName: 'Phone & USSD',
    color: '#26d367',
    url: '/?view=phone',
    defaultSender: 'CBE *889#',
    smallIcon: 'ic_stat_phone',
    largeIcon: 'ic_notif_phone',
    webIcon: '/icons/notif-phone.png',
  },
};

export const SUB_APP_NOTIFICATION_LIST: SubAppNotificationMeta[] = [
  SUB_APP_NOTIFICATION_META.sms,
  SUB_APP_NOTIFICATION_META.truecaller,
  SUB_APP_NOTIFICATION_META.telebirr,
  SUB_APP_NOTIFICATION_META.dashen,
  SUB_APP_NOTIFICATION_META.telegram,
  SUB_APP_NOTIFICATION_META.phone,
];

const DEFAULT_SUB_APP_PREFS: SubAppPushPreferencesMap = {
  sms: { enabled: true, showPreview: true },
  truecaller: { enabled: true, showPreview: true },
  telebirr: { enabled: true, showPreview: true },
  dashen: { enabled: true, showPreview: true },
  telegram: { enabled: true, showPreview: true },
  phone: { enabled: true, showPreview: true },
};

const LOCAL_PREFS_PREFIX = 'cbe_push_local_prefs_';
const LOCAL_ENABLED_PREFIX = 'cbe_push_local_enabled_';
const SUB_APP_PREFS_KEY = 'cbe_subapp_push_prefs_v1';

class BackendUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackendUnavailableError';
  }
}

function cleanVapidKeyString(raw: string): string {
  let cleaned = (raw || '').trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned.replace(/\s+/g, '');
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const normalized = cleanVapidKeyString(base64String);
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(normalized)) {
    throw new Error('Server returned a malformed VAPID public key.');
  }
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  const base64 = (normalized + padding).replace(/-/g, '+').replace(/_/g, '/');
  let rawData: string;
  try {
    rawData = window.atob(base64);
  } catch {
    throw new Error('Unable to decode server VAPID public key.');
  }
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  if (outputArray.length !== 65 || outputArray[0] !== 0x04) {
    throw new Error('Server VAPID_PUBLIC_KEY is not a valid 65-byte P-256 uncompressed public key.');
  }
  return outputArray;
}

async function safeParseJson<T = Record<string, unknown>>(res: Response, endpointLabel: string): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  const contentType = (res.headers.get('content-type') || '').toLowerCase();

  if (res.status === 404 && !contentType.includes('application/json')) {
    throw new BackendUnavailableError(
      `Backend push server unavailable (${endpointLabel}, HTTP 404).`
    );
  }

  if (trimmed.startsWith('<') || contentType.includes('text/html')) {
    throw new BackendUnavailableError(
      `Backend push API (${endpointLabel}) returned HTML instead of JSON.`
    );
  }

  if (!trimmed) {
    return {} as T;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new BackendUnavailableError(`Invalid JSON from notification API (${endpointLabel}).`);
  }
}

function formatEtbAmount(amount: number): string {
  return `ETB ${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function isTransactionCategory(category: NotificationCategory | 'test'): boolean {
  return (
    category === 'money_received' ||
    category === 'money_sent' ||
    category === 'cash_deposit' ||
    category === 'cash_withdrawal' ||
    category === 'transaction_failed'
  );
}

function isCategoryAllowed(prefs: NotificationPreferences, category: NotificationCategory): boolean {
  if (!prefs.enabled) return false;
  switch (category) {
    case 'money_received':
    case 'money_sent':
      return prefs.transactionNotifications && prefs.transferNotifications;
    case 'cash_deposit':
      return prefs.transactionNotifications && prefs.depositNotifications;
    case 'cash_withdrawal':
      return prefs.transactionNotifications && prefs.withdrawalNotifications;
    case 'transaction_failed':
      return prefs.transactionNotifications;
    case 'security_alert':
    case 'security_update':
    case 'account_update':
      return prefs.securityNotifications;
    default:
      return true;
  }
}

function buildLocalNotificationPayload(params: {
  category: NotificationCategory | 'test';
  amount?: number;
  txId?: string;
  reference?: string;
  privacyMode: PrivacyMode;
}): {
  appName: string;
  title: string;
  body: string;
  icon: string;
  badge: string;
  timestamp: number;
  category: NotificationCategory | 'test';
  tag: string;
  url: string;
  txId?: string;
  reference?: string;
} {
  const formattedAmount =
    typeof params.amount === 'number' && Number.isFinite(params.amount) && params.amount > 0
      ? formatEtbAmount(params.amount)
      : undefined;

  const isPrivateTx =
    params.privacyMode === 'private' &&
    (params.category === 'test' || isTransactionCategory(params.category));

  let title = 'CBE Mobil';
  let body = 'You have a new banking notification.';
  let url = params.txId ? `/?tx=${encodeURIComponent(params.txId)}` : '/';

  if (isPrivateTx) {
    title = 'CBE Mobil';
    body = 'You have a new account transaction.';
  } else {
    switch (params.category) {
      case 'money_received':
        title = 'Money Received';
        body = formattedAmount
          ? `You have received ${formattedAmount} successfully.`
          : 'You have received funds in your account successfully.';
        break;
      case 'money_sent':
        title = 'Transfer Successful';
        body = formattedAmount
          ? `Your transfer of ${formattedAmount} has been completed successfully.`
          : 'Your transfer has been completed successfully.';
        break;
      case 'cash_deposit':
        title = 'Cash Deposit';
        body = formattedAmount
          ? `A deposit of ${formattedAmount} has been credited to your account.`
          : 'A cash deposit has been credited to your account.';
        break;
      case 'cash_withdrawal':
        title = 'Withdrawal Successful';
        body = formattedAmount
          ? `Your withdrawal of ${formattedAmount} has been processed successfully.`
          : 'Your withdrawal has been processed successfully.';
        break;
      case 'transaction_failed':
        title = 'Transaction Failed';
        body = 'Your transaction could not be completed. Please check your transaction history.';
        url = params.txId ? `/?tx=${encodeURIComponent(params.txId)}` : '/?tab=history';
        break;
      case 'security_alert':
        title = 'Security Alert';
        body = 'A new device has accessed your account.';
        url = '/?tab=profile';
        break;
      case 'security_update':
        title = 'Security Update';
        body = 'Your account security information has been updated.';
        url = '/?tab=profile';
        break;
      case 'account_update':
        title = 'Account Update';
        body = 'Your banking account information has been updated successfully.';
        url = '/?tab=profile';
        break;
      case 'test':
      default:
        title = 'CBE Mobil Alerts Active';
        body = 'Lock Screen & Notification Center alerts are configured on this device.';
        url = '/?tab=profile';
        break;
    }
  }

  return {
    appName: 'CBE Mobil',
    title,
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    timestamp: Date.now(),
    category: params.category,
    tag: params.txId ? `cbe-tx-${params.txId}` : `cbe-${params.category}-${Date.now()}`,
    url,
    txId: params.txId,
    reference: params.reference,
  };
}

export class PushNotificationService {
  private static backendToken: string | null = null;
  private static backendTokenExpiresAt = 0;
  private static backendTokenUserId: string | null = null;
  private static sessionPromise: Promise<string | null> | null = null;
  private static swListenerAttached = false;
  private static nativeListenerAttached = false;
  private static createdNativeChannels = new Set<string>();
  private static nativePermissionCache: NotificationPermission | null = null;

  private static mapNativeDisplayPermission(display?: string): NotificationPermission {
    if (display === 'granted') return 'granted';
    if (display === 'denied') return 'denied';
    return 'default';
  }

  public static async syncNativePermissionStatus(): Promise<NotificationPermission> {
    if (!Capacitor.isNativePlatform()) {
      return typeof window !== 'undefined' && 'Notification' in window
        ? Notification.permission
        : 'default';
    }
    try {
      const status = await LocalNotifications.checkPermissions();
      const mapped = this.mapNativeDisplayPermission(status?.display);
      this.nativePermissionCache = mapped;
      return mapped;
    } catch {
      return this.nativePermissionCache ?? 'default';
    }
  }

  private static async ensureNativeChannel(
    channelId: string = 'cbe-banking-alerts',
    channelName: string = 'CBE Banking Alerts',
    lightColor: string = '#70189F',
    description: string = 'Lock screen and notification center banking alerts'
  ): Promise<void> {
    if (!Capacitor.isNativePlatform() || this.createdNativeChannels.has(channelId)) return;
    try {
      if (Capacitor.getPlatform() === 'android') {
        await LocalNotifications.createChannel({
          id: channelId,
          name: channelName,
          description,
          importance: 5,
          visibility: 1,
          vibration: true,
          lights: true,
          lightColor,
        });
      }
      this.createdNativeChannels.add(channelId);
    } catch (err) {
      console.warn('[PushNotificationService] Failed to create notification channel:', err);
    }
  }

  public static getSubAppPreferences(): SubAppPushPreferencesMap {
    const fallback: SubAppPushPreferencesMap = {
      sms: { ...DEFAULT_SUB_APP_PREFS.sms },
      truecaller: { ...DEFAULT_SUB_APP_PREFS.truecaller },
      telebirr: { ...DEFAULT_SUB_APP_PREFS.telebirr },
      dashen: { ...DEFAULT_SUB_APP_PREFS.dashen },
      telegram: { ...DEFAULT_SUB_APP_PREFS.telegram },
      phone: { ...DEFAULT_SUB_APP_PREFS.phone },
    };
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = localStorage.getItem(SUB_APP_PREFS_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Partial<SubAppPushPreferencesMap>;
      (Object.keys(fallback) as SubAppNotificationId[]).forEach((key) => {
        if (parsed && parsed[key] && typeof parsed[key] === 'object') {
          fallback[key] = { ...fallback[key], ...parsed[key] };
        }
      });
      return fallback;
    } catch {
      return fallback;
    }
  }

  public static updateSubAppPreference(
    subAppId: SubAppNotificationId,
    patch: Partial<SubAppPushConfig>
  ): SubAppPushPreferencesMap {
    const current = this.getSubAppPreferences();
    const next: SubAppPushPreferencesMap = {
      ...current,
      [subAppId]: {
        ...current[subAppId],
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SUB_APP_PREFS_KEY, JSON.stringify(next));
        window.dispatchEvent(
          new CustomEvent('cbe_subapp_push_prefs_updated', { detail: { subAppId, prefs: next } })
        );
      } catch {
        // ignore storage errors
      }
    }
    return next;
  }

  private static resolveActiveUserForPush(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    try {
      const storedUsersRaw = localStorage.getItem('tana_users');
      const users: UserProfile[] = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
      const activeId = localStorage.getItem('tana_active_user_id');
      return users.find((u) => u.id === activeId) || users[0] || null;
    } catch {
      return null;
    }
  }

  private static getLocalPreferences(userId: string): NotificationPreferences {
    const fallback: NotificationPreferences = {
      ...DEFAULT_PREFERENCES,
      userId,
    };
    if (typeof window === 'undefined' || !userId) return fallback;
    try {
      const raw = localStorage.getItem(`${LOCAL_PREFS_PREFIX}${userId}`);
      if (!raw) return fallback;
      return { ...fallback, ...JSON.parse(raw), userId };
    } catch {
      return fallback;
    }
  }

  private static saveLocalPreferences(
    userId: string,
    patch: Partial<NotificationPreferences>
  ): NotificationPreferences {
    const current = this.getLocalPreferences(userId);
    const next: NotificationPreferences = {
      ...current,
      ...patch,
      userId,
      updatedAt: new Date().toISOString(),
    };
    if (typeof window !== 'undefined' && userId) {
      try {
        localStorage.setItem(`${LOCAL_PREFS_PREFIX}${userId}`, JSON.stringify(next));
      } catch {
        // Ignore quota errors
      }
    }
    return next;
  }

  private static isLocalEnabled(userId: string): boolean {
    if (typeof window === 'undefined' || !userId) return false;
    try {
      return localStorage.getItem(`${LOCAL_ENABLED_PREFIX}${userId}`) === '1';
    } catch {
      return false;
    }
  }

  private static setLocalEnabled(userId: string, enabled: boolean): void {
    if (typeof window === 'undefined' || !userId) return;
    try {
      if (enabled) {
        localStorage.setItem(`${LOCAL_ENABLED_PREFIX}${userId}`, '1');
      } else {
        localStorage.removeItem(`${LOCAL_ENABLED_PREFIX}${userId}`);
      }
    } catch {
      // Ignore storage errors
    }
  }

  public static getPlatformCapabilities(): PlatformPushCapabilities {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        isIOS: false,
        isAndroid: false,
        isStandalone: false,
        isInIframe: false,
        isSecureContext: false,
        isPushSupported: false,
        isLocalSwSupported: false,
        requiresIosHomeScreenInstall: false,
        permission: 'unsupported',
      };
    }

    const ua = navigator.userAgent || '';
    const isNative = Capacitor.isNativePlatform();
    const nativePlatform = isNative ? Capacitor.getPlatform() : '';
    const isIOS =
      nativePlatform === 'ios' ||
      /iPhone|iPad|iPod/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = nativePlatform === 'android' || /Android/i.test(ua);
    const isStandalone =
      isNative ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    const isInIframe = isNative
      ? false
      : (() => {
          try {
            return window.self !== window.top;
          } catch {
            return true;
          }
        })();

    const hasSW = 'serviceWorker' in navigator;
    const hasNotification = 'Notification' in window;
    const hasPushManager = 'PushManager' in window;
    const isLocalSwSupported = isNative || (hasSW && hasNotification);
    const isPushSupported = !isNative && hasSW && hasNotification && hasPushManager;
    const permission: NotificationPermission | 'unsupported' = isNative
      ? (this.nativePermissionCache ?? 'default')
      : hasNotification
        ? Notification.permission
        : 'unsupported';

    return {
      isIOS,
      isAndroid,
      isStandalone,
      isInIframe,
      isSecureContext: isNative ? true : Boolean(window.isSecureContext),
      isPushSupported,
      isLocalSwSupported,
      requiresIosHomeScreenInstall: !isNative && isIOS && !isStandalone,
      permission,
    };
  }

  public static clearSession(): void {
    this.backendToken = null;
    this.backendTokenExpiresAt = 0;
    this.backendTokenUserId = null;
    this.sessionPromise = null;
  }

  public static async establishBackendSession(
    user: UserProfile,
    options?: { notifyNewDevice?: boolean }
  ): Promise<{ token: string | null; isNewDevice?: boolean }> {
    try {
      const deviceId = AuthSessionService.getDeviceId();
      const deviceLabel = AuthSessionService.getDeviceLabel();
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          accountNumber: user.accountNumber,
          role: user.role,
          deviceId,
          deviceLabel,
          notifyNewDevice: options?.notifyNewDevice ?? false,
        }),
      });

      if (!res.ok) {
        return { token: null };
      }

      const data = await safeParseJson<{ ok?: boolean; token?: string; expiresAt?: number; isNewDevice?: boolean }>(
        res,
        '/api/auth/session'
      );
      if (data?.ok && typeof data.token === 'string') {
        this.backendToken = data.token;
        this.backendTokenExpiresAt = Number(data.expiresAt || Date.now() + 3600_000);
        this.backendTokenUserId = user.id;
        return { token: data.token, isNewDevice: Boolean(data.isNewDevice) };
      }
      return { token: null };
    } catch {
      return { token: null };
    }
  }

  public static async ensureBackendSession(user?: UserProfile | null): Promise<string | null> {
    if (!user?.id) return null;

    if (
      this.backendToken &&
      this.backendTokenUserId === user.id &&
      Date.now() < this.backendTokenExpiresAt - 15_000
    ) {
      return this.backendToken;
    }

    if (this.sessionPromise) {
      return this.sessionPromise;
    }

    this.sessionPromise = this.establishBackendSession(user, { notifyNewDevice: false })
      .then((res) => res.token)
      .finally(() => {
        this.sessionPromise = null;
      });

    return this.sessionPromise;
  }

  private static async authedFetch(
    user: UserProfile,
    url: string,
    init: RequestInit = {}
  ): Promise<Response> {
    let token = await this.ensureBackendSession(user);
    if (!token) {
      throw new BackendUnavailableError('Unable to reach notification backend server.');
    }

    const doRequest = (bearer: string) =>
      fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers || {}),
          Authorization: `Bearer ${bearer}`,
        },
      });

    let res = await doRequest(token);
    if (res.status === 401) {
      this.clearSession();
      token = await this.ensureBackendSession(user);
      if (token) {
        res = await doRequest(token);
      }
    }
    return res;
  }

  private static async getActiveServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      throw new Error('Service Worker is not supported on this browser.');
    }

    let reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
    }

    const readyPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise<ServiceWorkerRegistration>((_, reject) =>
      setTimeout(() => reject(new Error('Service Worker activation timed out.')), 6000)
    );

    return Promise.race([readyPromise, timeoutPromise]);
  }

  private static async showLocalServiceWorkerNotification(
    payload: ReturnType<typeof buildLocalNotificationPayload> & {
      channelId?: string;
      channelName?: string;
      iconColor?: string;
      smallIcon?: string;
      largeIcon?: string;
      subAppView?: SubAppNotificationId;
    }
  ): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        const perm =
          this.nativePermissionCache ?? (await this.syncNativePermissionStatus());
        if (perm !== 'granted') {
          return false;
        }
        const channelId = payload.channelId || 'cbe-banking-alerts';
        const channelName = payload.channelName || 'CBE Banking Alerts';
        const iconColor = payload.iconColor || '#70189F';
        const smallIcon = payload.smallIcon || 'ic_stat_cbe';
        const largeIcon = payload.largeIcon || 'ic_notif_cbe';
        await this.ensureNativeChannel(channelId, channelName, iconColor);
        const notifId =
          ((Date.now() % 1_000_000_000) + Math.floor(Math.random() * 1000)) | 0;
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.max(1, notifId),
              title: payload.title,
              body: payload.body,
              largeBody: payload.body,
              summaryText: payload.appName || channelName,
              channelId,
              smallIcon,
              largeIcon,
              iconColor,
              autoCancel: true,
              extra: {
                url: payload.url,
                view: payload.subAppView || null,
                txId: payload.txId || null,
                reference: payload.reference || null,
                category: payload.category,
              },
            },
          ],
        });
        return true;
      }

      if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
        return false;
      }

      const options = {
        body: payload.body,
        icon: payload.icon,
        badge: payload.badge,
        tag: payload.tag,
        renotify: true,
        silent: false,
        vibrate: [200, 100, 200],
        requireInteraction: false,
        timestamp: payload.timestamp,
        data: {
          url: payload.url,
          view: payload.subAppView || null,
          txId: payload.txId || null,
          reference: payload.reference || null,
          category: payload.category,
        },
      } as NotificationOptions & {
        renotify?: boolean;
        vibrate?: number[];
        timestamp?: number;
      };

      if ('serviceWorker' in navigator) {
        const reg = await this.getActiveServiceWorkerRegistration();
        await reg.showNotification(payload.title, options);
        return true;
      }

      new Notification(payload.title, options);
      return true;
    } catch (err) {
      console.warn('[PushNotificationService] Local notification display failed:', err);
      return false;
    }
  }

  public static attachServiceWorkerListeners(getActiveUser: () => UserProfile | null): void {
    if (Capacitor.isNativePlatform()) {
      if (!this.nativeListenerAttached) {
        this.nativeListenerAttached = true;
        void LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
          const extra = event?.notification?.extra as Record<string, unknown> | undefined;
          if (!extra) return;
          window.dispatchEvent(
            new CustomEvent('cbe_push_deep_link', {
              detail: {
                url: (typeof extra.url === 'string' && extra.url) || '/',
                view: typeof extra.view === 'string' ? extra.view : null,
                txId: extra.txId || null,
                reference: extra.reference || null,
                category: extra.category || null,
              },
            })
          );
        }).catch(() => {});
      }
      return;
    }

    if (this.swListenerAttached || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    this.swListenerAttached = true;

    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'CBE_NOTIFICATION_CLICK') {
        window.dispatchEvent(
          new CustomEvent('cbe_push_deep_link', {
            detail: {
              url: data.url || '/',
              view: data.view || null,
              txId: data.txId || null,
              reference: data.reference || null,
              category: data.category || null,
            },
          })
        );
      } else if (data.type === 'CBE_PUSH_SUBSCRIPTION_CHANGED' && data.subscription) {
        const user = getActiveUser();
        if (user) {
          void this.sendSubscriptionToServer(user, data.subscription);
        }
      }
    });
  }

  private static async sendSubscriptionToServer(
    user: UserProfile,
    subscriptionJson: PushSubscriptionJSON
  ): Promise<{ ok: boolean; deviceCount?: number; preferences?: NotificationPreferences; error?: string }> {
    const caps = this.getPlatformCapabilities();
    const platform = caps.isIOS ? 'ios' : caps.isAndroid ? 'android' : 'desktop';
    const deviceLabel = AuthSessionService.getDeviceLabel();

    const res = await this.authedFetch(user, '/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        subscription: subscriptionJson,
        platform,
        deviceLabel,
        accountNumber: user.accountNumber,
      }),
    });

    const data = await safeParseJson<{
      ok?: boolean;
      error?: string;
      deviceCount?: number;
      preferences?: NotificationPreferences;
    }>(res, '/api/notifications/subscribe');
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error || 'Subscription failed.' };
    }

    if (data.preferences) {
      this.saveLocalPreferences(user.id, data.preferences);
    }

    return {
      ok: true,
      deviceCount: data.deviceCount,
      preferences: data.preferences,
    };
  }

  /**
   * Must ONLY be called from an explicit user click/tap handler (required by iOS 16.4+ Safari).
   */
  public static async enableNotifications(user: UserProfile): Promise<{
    ok: boolean;
    mode?: 'webpush' | 'local';
    message?: string;
    deviceCount?: number;
    preferences?: NotificationPreferences;
  }> {
    const caps = this.getPlatformCapabilities();

    if (Capacitor.isNativePlatform()) {
      try {
        const req = await LocalNotifications.requestPermissions();
        const permission = this.mapNativeDisplayPermission(req?.display);
        this.nativePermissionCache = permission;
        if (permission !== 'granted') {
          return {
            ok: false,
            message:
              permission === 'denied'
                ? 'Notification permission was blocked. Please allow notifications for CBE Mobile Banking in Android App Settings.'
                : 'Notification permission was dismissed.',
          };
        }
        await this.ensureNativeChannel();
        this.setLocalEnabled(user.id, true);
        const localPrefs = this.saveLocalPreferences(user.id, { enabled: true });
        return {
          ok: true,
          mode: 'local',
          message:
            'Native Android notifications enabled! Lock Screen & Notification Center alerts are active.',
          deviceCount: 1,
          preferences: localPrefs,
        };
      } catch (err) {
        return {
          ok: false,
          message: err instanceof Error ? err.message : 'Unable to enable native notifications.',
        };
      }
    }

    if (caps.requiresIosHomeScreenInstall) {
      return {
        ok: false,
        message:
          'On iPhone, first tap Share → Add to Home Screen in Safari, then open CBE Mobil from your Home Screen and tap Enable Notifications.',
      };
    }

    if (!caps.isSecureContext) {
      return {
        ok: false,
        message: 'Notifications require HTTPS (or localhost).',
      };
    }

    if (!caps.isLocalSwSupported) {
      return {
        ok: false,
        message: 'Notifications and Service Workers are not supported in this browser.',
      };
    }

    // Request permission ONLY upon user tap
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        ok: false,
        message:
          permission === 'denied'
            ? 'Notification permission was blocked. Please allow notifications in your device or browser Settings.'
            : 'Notification permission was dismissed.',
      };
    }

    try {
      const reg = await this.getActiveServiceWorkerRegistration();

      // Always mark local device notifications enabled once permission + SW are ready
      this.setLocalEnabled(user.id, true);
      const localPrefs = this.saveLocalPreferences(user.id, { enabled: true });

      // Attempt full-stack Express + VAPID Web Push subscription
      try {
        if (!caps.isPushSupported) {
          throw new BackendUnavailableError('PushManager unavailable; using local SW notifications.');
        }

        const keyRes = await fetch('/api/notifications/vapid-public-key', { cache: 'no-store' });
        const keyData = await safeParseJson<{ ok?: boolean; publicKey?: string; error?: string }>(
          keyRes,
          '/api/notifications/vapid-public-key'
        );
        if (!keyRes.ok || !keyData?.publicKey) {
          throw new BackendUnavailableError(keyData?.error || 'Server VAPID public key is unavailable.');
        }

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          const appServerKey = urlBase64ToUint8Array(keyData.publicKey);
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: appServerKey.buffer as ArrayBuffer,
          });
        }

        const saved = await this.sendSubscriptionToServer(user, sub.toJSON());
        if (!saved.ok) {
          throw new BackendUnavailableError(saved.error || 'Could not register with notification server.');
        }

        return {
          ok: true,
          mode: 'webpush',
          message: 'Push notifications enabled for Lock Screen and Notification Center.',
          deviceCount: saved.deviceCount,
          preferences: saved.preferences || localPrefs,
        };
      } catch (backendErr) {
        // Static preview or local-only mode without Express server: activate Local PWA Service Worker alerts
        if (backendErr instanceof BackendUnavailableError || backendErr instanceof TypeError) {
          return {
            ok: true,
            mode: 'local',
            message:
              'Notifications enabled in Local Device PWA mode! Lock Screen & Notification Center alerts will appear for banking actions on this device.',
            deviceCount: 1,
            preferences: localPrefs,
          };
        }
        throw backendErr;
      }
    } catch (err) {
      console.error('[PushNotificationService] enableNotifications error:', err);
      const rawMsg = err instanceof Error ? err.message : String(err || '');
      return {
        ok: false,
        message: rawMsg || 'Unable to enable notifications on this device.',
      };
    }
  }

  public static async disableNotifications(user: UserProfile): Promise<{
    ok: boolean;
    message?: string;
    deviceCount?: number;
  }> {
    this.setLocalEnabled(user.id, false);
    this.saveLocalPreferences(user.id, { enabled: false });

    if (Capacitor.isNativePlatform()) {
      return {
        ok: true,
        deviceCount: 0,
        message: 'Notifications disabled for this device.',
      };
    }

    try {
      let endpoint: string | undefined;
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration('/');
        const sub = await reg?.pushManager?.getSubscription();
        if (sub) {
          endpoint = sub.endpoint;
          await sub.unsubscribe().catch(() => false);
        }
      }

      try {
        const res = await this.authedFetch(user, '/api/notifications/unsubscribe', {
          method: 'POST',
          body: JSON.stringify({ endpoint }),
        });
        const data = await safeParseJson<{ ok?: boolean; deviceCount?: number }>(
          res,
          '/api/notifications/unsubscribe'
        );
        return {
          ok: true,
          deviceCount: data?.deviceCount ?? 0,
          message: 'Push notifications disabled for this device.',
        };
      } catch {
        return {
          ok: true,
          deviceCount: 0,
          message: 'Notifications disabled for this device.',
        };
      }
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to disable notifications.',
      };
    }
  }

  /**
   * Silently syncs an ALREADY-granted subscription (never calls requestPermission on load).
   */
  public static async syncExistingSubscription(user: UserProfile): Promise<void> {
    try {
      const caps = this.getPlatformCapabilities();
      if (!caps.isPushSupported || caps.permission !== 'granted') return;

      const token = await this.ensureBackendSession(user);
      if (!token) return;
      const reg = await navigator.serviceWorker.getRegistration('/');
      const sub = await reg?.pushManager?.getSubscription();
      if (sub) {
        await this.sendSubscriptionToServer(user, sub.toJSON());
      }
    } catch {
      // Non-blocking background sync
    }
  }

  public static async getStatus(user: UserProfile): Promise<NotificationStatusResponse> {
    if (Capacitor.isNativePlatform()) {
      await this.syncNativePermissionStatus();
    }
    const caps = this.getPlatformCapabilities();
    const localPrefs = this.getLocalPreferences(user.id);
    const localActive = caps.permission === 'granted' && this.isLocalEnabled(user.id);
    const platform: 'ios' | 'android' | 'desktop' = caps.isIOS
      ? 'ios'
      : caps.isAndroid
        ? 'android'
        : 'desktop';

    if (Capacitor.isNativePlatform()) {
      return {
        ok: true,
        mode: 'local',
        subscribed: localActive,
        hasAnySubscription: localActive,
        deviceCount: localActive ? 1 : 0,
        devices: localActive
          ? [
              {
                id: 'native_android_device',
                deviceLabel: `${AuthSessionService.getDeviceLabel()} (Android App)`,
                platform,
                isCurrentDevice: true,
                updatedAt: localPrefs.updatedAt || new Date().toISOString(),
              },
            ]
          : [],
        preferences: localPrefs,
      };
    }

    try {
      let currentEndpoint = '';
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration('/');
        const sub = await reg?.pushManager?.getSubscription();
        if (sub) currentEndpoint = sub.endpoint;
      }

      const url = currentEndpoint
        ? `/api/notifications/status?endpoint=${encodeURIComponent(currentEndpoint)}`
        : '/api/notifications/status';

      const res = await this.authedFetch(user, url, { method: 'GET' });
      const data = await safeParseJson<NotificationStatusResponse>(res, '/api/notifications/status');
      if (res.ok && data?.ok) {
        if (data.preferences) {
          this.saveLocalPreferences(user.id, data.preferences);
        }
        return { ...data, mode: 'webpush' };
      }
    } catch {
      // Fallback seamlessly to local PWA status when static preview or offline
    }

    return {
      ok: true,
      mode: 'local',
      subscribed: localActive,
      hasAnySubscription: localActive,
      deviceCount: localActive ? 1 : 0,
      devices: localActive
        ? [
            {
              id: 'local_pwa_device',
              deviceLabel: `${AuthSessionService.getDeviceLabel()} (Local PWA)`,
              platform,
              isCurrentDevice: true,
              updatedAt: localPrefs.updatedAt || new Date().toISOString(),
            },
          ]
        : [],
      preferences: localPrefs,
    };
  }

  public static async updatePreferences(
    user: UserProfile,
    patch: Partial<Omit<NotificationPreferences, 'userId' | 'updatedAt'>>
  ): Promise<{ ok: boolean; preferences?: NotificationPreferences; error?: string }> {
    const updatedLocal = this.saveLocalPreferences(user.id, patch);

    if (Capacitor.isNativePlatform()) {
      return { ok: true, preferences: updatedLocal };
    }

    try {
      const res = await this.authedFetch(user, '/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      const data = await safeParseJson<{ ok?: boolean; preferences?: NotificationPreferences; error?: string }>(
        res,
        '/api/notifications/preferences'
      );
      if (res.ok && data?.ok && data.preferences) {
        this.saveLocalPreferences(user.id, data.preferences);
        return { ok: true, preferences: data.preferences };
      }
    } catch {
      // Local fallback already persisted above
    }

    return { ok: true, preferences: updatedLocal };
  }

  public static async sendTestNotification(
    user: UserProfile,
    sampleCategory?: NotificationCategory | 'test',
    amount?: number
  ): Promise<{ ok: boolean; message?: string; error?: string }> {
    if (!Capacitor.isNativePlatform()) {
      try {
        const res = await this.authedFetch(user, '/api/notifications/test', {
          method: 'POST',
          body: JSON.stringify({ sampleCategory, amount }),
        });
        const data = await safeParseJson<{ ok?: boolean; sent?: number; message?: string; error?: string }>(
          res,
          '/api/notifications/test'
        );
        if (res.ok && data?.ok && (data.sent ?? 0) > 0) {
          return { ok: true, message: data.message };
        }
      } catch {
        // Fall back cleanly to local Service Worker notification
      }
    } else {
      await this.syncNativePermissionStatus();
    }

    const caps = this.getPlatformCapabilities();
    if (caps.permission !== 'granted' || !this.isLocalEnabled(user.id)) {
      return {
        ok: false,
        error: 'Please tap Enable Notifications first so this device grants permission.',
      };
    }

    const prefs = this.getLocalPreferences(user.id);
    const payload = buildLocalNotificationPayload({
      category: sampleCategory || 'test',
      amount: amount ?? 2500,
      privacyMode: prefs.privacyMode,
    });

    const shown = await this.showLocalServiceWorkerNotification(payload);
    if (!shown) {
      return {
        ok: false,
        error: 'Could not trigger notification on this device. Check notification permissions.',
      };
    }

    return {
      ok: true,
      message: 'Test banking notification shown on your device!',
    };
  }

  public static async notifyVerifiedTransaction(
    tx: Transaction & { overrideType?: 'deposit' | 'withdrawal' },
    actorUser?: UserProfile | null
  ): Promise<void> {
    let backendDelivered = false;
    let resolvedUser: UserProfile | undefined;

    try {
      const storedUsersRaw = typeof window !== 'undefined' ? localStorage.getItem('tana_users') : null;
      const users: UserProfile[] = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
      const activeUserId =
        actorUser?.id ||
        (typeof window !== 'undefined' ? localStorage.getItem('tana_active_user_id') : null) ||
        tx.senderId ||
        tx.recipientId;

      resolvedUser = actorUser || users.find((u) => u.id === activeUserId) || users[0];
      if (!resolvedUser) return;

      const lowerDesc = (tx.description || '').toLowerCase();
      let mappedType: 'transfer' | 'send' | 'receive' | 'deposit' | 'withdrawal' | 'bill' | 'airtime' =
        tx.overrideType || tx.type;

      if (!tx.overrideType) {
        if (lowerDesc.includes('deposit') || tx.senderName === 'Deposit' || tx.senderName === 'Cash Deposit') {
          mappedType = 'deposit';
        } else if (lowerDesc.includes('withdraw') || lowerDesc.includes('cashout') || lowerDesc.includes('atm')) {
          mappedType = 'withdrawal';
        }
      }

      if (!Capacitor.isNativePlatform()) {
        try {
          const res = await this.authedFetch(resolvedUser, '/api/notifications/send-transaction', {
            method: 'POST',
            body: JSON.stringify({
              id: tx.id,
              reference: tx.reference || tx.id,
              type: mappedType,
              status: tx.status === 'failed' ? 'failed' : 'success',
              amount: tx.amount,
              fee: tx.fee,
              currency: 'ETB',
              senderId: tx.senderId,
              senderAccount: tx.senderAccount,
              senderName: tx.senderName,
              recipientId: tx.recipientId,
              recipientAccount: tx.recipientAccount,
              recipientName: tx.recipientName,
              description: tx.description,
              createdAt: tx.createdAt,
            }),
          });
          const json = await safeParseJson<{
            ok?: boolean;
            dispatches?: Array<{ sent?: number }>;
          }>(res, '/api/notifications/send-transaction');
          if (res.ok && json?.ok && Array.isArray(json.dispatches)) {
            backendDelivered = json.dispatches.some((d) => (d.sent || 0) > 0);
          }
        } catch {
          backendDelivered = false;
        }
      }

      const permissionGranted = Capacitor.isNativePlatform()
        ? (await this.syncNativePermissionStatus()) === 'granted'
        : typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted';

      // If backend push didn't deliver (or running in native Capacitor APK), trigger device notification
      if (
        !backendDelivered &&
        permissionGranted &&
        this.isLocalEnabled(resolvedUser.id)
      ) {
        const prefs = this.getLocalPreferences(resolvedUser.id);
        let category: NotificationCategory = 'money_sent';
        if (tx.status === 'failed') {
          category = 'transaction_failed';
        } else if (mappedType === 'deposit') {
          category = 'cash_deposit';
        } else if (mappedType === 'withdrawal') {
          category = 'cash_withdrawal';
        } else if (
          mappedType === 'receive' ||
          (tx.recipientId === resolvedUser.id && tx.senderId !== resolvedUser.id)
        ) {
          category = 'money_received';
        }

        if (isCategoryAllowed(prefs, category)) {
          const payload = buildLocalNotificationPayload({
            category,
            amount: tx.amount,
            txId: tx.id,
            reference: tx.reference,
            privacyMode: prefs.privacyMode,
          });
          await this.showLocalServiceWorkerNotification(payload);
        }
      }
    } catch {
      // Non-blocking
    }
  }

  public static async notifySecurityEvent(
    user: UserProfile,
    category: 'security_alert' | 'security_update' | 'account_update'
  ): Promise<void> {
    let backendDelivered = false;
    if (!Capacitor.isNativePlatform()) {
      try {
        const res = await this.authedFetch(user, '/api/notifications/security-event', {
          method: 'POST',
          body: JSON.stringify({ category }),
        });
        const json = await safeParseJson<{ ok?: boolean; sent?: number }>(
          res,
          '/api/notifications/security-event'
        );
        if (res.ok && json?.ok && (json.sent || 0) > 0) {
          backendDelivered = true;
        }
      } catch {
        backendDelivered = false;
      }
    }

    const permissionGranted = Capacitor.isNativePlatform()
      ? (await this.syncNativePermissionStatus()) === 'granted'
      : typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted';

    if (
      !backendDelivered &&
      permissionGranted &&
      this.isLocalEnabled(user.id)
    ) {
      const prefs = this.getLocalPreferences(user.id);
      if (isCategoryAllowed(prefs, category)) {
        const payload = buildLocalNotificationPayload({
          category,
          privacyMode: prefs.privacyMode,
        });
        await this.showLocalServiceWorkerNotification(payload);
      }
    }
  }

  private static detectCurrentSubAppFromPath(): SubAppNotificationId | null {
    if (typeof window === 'undefined') return null;
    const norm = window.location.pathname.toLowerCase().replace(/\/+$/, '');
    const map: Record<string, SubAppNotificationId> = {
      '/sms': 'sms',
      '/truecaller': 'truecaller',
      '/telebirr': 'telebirr',
      '/dashen': 'dashen',
      '/telegram': 'telegram',
      '/phone': 'phone',
    };
    return map[norm] || null;
  }

  private static async getSubAppServiceWorkerRegistration(
    subAppId: SubAppNotificationId
  ): Promise<ServiceWorkerRegistration> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      throw new Error('Service Worker is not supported on this browser.');
    }

    const subScope = `/${subAppId}/`;
    const subSwScript = `/${subAppId}/sw-push.js`;
    const isInsideSubApp = this.detectCurrentSubAppFromPath() === subAppId;

    if (isInsideSubApp) {
      try {
        let reg = await navigator.serviceWorker.getRegistration(subScope);
        if (!reg) {
          reg = await navigator.serviceWorker.register(subSwScript, { scope: subScope });
        }
        if (reg.active) return reg;
        const waited = await Promise.race([
          new Promise<ServiceWorkerRegistration>((resolve) => {
            const worker = reg!.installing || reg!.waiting;
            if (!worker) {
              resolve(reg!);
              return;
            }
            worker.addEventListener('statechange', () => {
              if (worker.state === 'activated' || reg!.active) {
                resolve(reg!);
              }
            });
          }),
          new Promise<ServiceWorkerRegistration>((resolve) => setTimeout(() => resolve(reg!), 3500)),
        ]);
        if (waited.active) return waited;
      } catch (err) {
        console.warn(`[PushNotificationService] Scoped SW registration fallback for ${subAppId}:`, err);
      }
    }

    return this.getActiveServiceWorkerRegistration();
  }

  private static uint8ArrayEquals(a: Uint8Array | null, b: Uint8Array | null): boolean {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  /**
   * Registers the current installed sub-app (e.g. standalone iPhone Messages /sms/)
   * with the /api/subapp/subscribe bridge so CBE Mobile can send real APNs/FCM pushes
   * directly to this sub-app with its own icon & name.
   */
  public static async subscribeSubAppWebPush(
    subAppId: SubAppNotificationId
  ): Promise<{ ok: boolean; deviceCount?: number; error?: string }> {
    if (Capacitor.isNativePlatform()) {
      return { ok: true, deviceCount: 1 };
    }
    const caps = this.getPlatformCapabilities();
    if (!caps.isPushSupported || caps.permission !== 'granted') {
      return { ok: false, error: 'Web Push permission not granted yet.' };
    }

    try {
      const keyRes = await fetch('/api/subapp/vapid-key', { cache: 'no-store' });
      const keyData = await safeParseJson<{ ok?: boolean; publicKey?: string; error?: string }>(
        keyRes,
        '/api/subapp/vapid-key'
      );
      if (!keyRes.ok || !keyData?.publicKey) {
        return { ok: false, error: keyData?.error || 'VAPID public key unavailable.' };
      }

      const appServerKey = urlBase64ToUint8Array(keyData.publicKey);
      const reg = await this.getSubAppServiceWorkerRegistration(subAppId);

      let sub = await reg.pushManager.getSubscription();
      if (sub) {
        const existingKeyBuf = sub.options?.applicationServerKey;
        const existingKey = existingKeyBuf ? new Uint8Array(existingKeyBuf) : null;
        if (existingKey && !this.uint8ArrayEquals(existingKey, appServerKey)) {
          await sub.unsubscribe().catch(() => false);
          sub = null;
        }
      }

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey.buffer as ArrayBuffer,
        });
      }

      const platform: 'ios' | 'android' | 'desktop' = caps.isIOS
        ? 'ios'
        : caps.isAndroid
          ? 'android'
          : 'desktop';

      const res = await fetch('/api/subapp/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucketKey: CrossAppSyncService.getBucketKey(),
          subAppId,
          platform,
          subscription: sub.toJSON(),
        }),
      });

      const data = await safeParseJson<{ ok?: boolean; deviceCount?: number; error?: string }>(
        res,
        '/api/subapp/subscribe'
      );
      if (!res.ok || !data?.ok) {
        return { ok: false, error: data?.error || 'Failed to register sub-app push channel.' };
      }

      return { ok: true, deviceCount: data.deviceCount ?? 1 };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Unable to subscribe sub-app push.',
      };
    }
  }

  /**
   * Silently refreshes a standalone sub-app's Web Push subscription on open (never prompts).
   */
  public static async syncSubAppPushSubscriptionSilently(
    subAppId: SubAppNotificationId
  ): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) return;
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      await this.subscribeSubAppWebPush(subAppId);
    } catch {
      // Non-fatal background sync
    }
  }

  private static async dispatchRemoteSubAppPush(params: {
    subAppId: SubAppNotificationId;
    appName: string;
    title: string;
    body: string;
    icon: string;
    badge: string;
    url: string;
    tag: string;
    reference?: string;
  }): Promise<{ ok: boolean; delivered: number; total: number }> {
    if (Capacitor.isNativePlatform() || typeof window === 'undefined') {
      return { ok: false, delivered: 0, total: 0 };
    }
    try {
      const res = await fetch('/api/subapp/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucketKey: CrossAppSyncService.getBucketKey(),
          ...params,
        }),
      });
      const data = await safeParseJson<{
        ok?: boolean;
        delivered?: number;
        total?: number;
      }>(res, '/api/subapp/push');
      if (!res.ok || !data?.ok) {
        return { ok: false, delivered: 0, total: 0 };
      }
      return {
        ok: true,
        delivered: Number(data.delivered || 0),
        total: Number(data.total || 0),
      };
    } catch {
      return { ok: false, delivered: 0, total: 0 };
    }
  }

  private static appendSyncedTestSms(sender: string, body: string): void {
    if (typeof window === 'undefined') return;
    try {
      const STORAGE_MESSAGES_KEY = 'bank_sms_messages_v6';
      const raw = localStorage.getItem(STORAGE_MESSAGES_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const messages = Array.isArray(list) ? list : [];

      const activeAcc = localStorage.getItem('bank_sms_active_account') || '1000419524747';
      const txId = `FT${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const nowIso = new Date().toISOString();

      messages.push({
        id: `sms-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        transactionId: txId,
        accountNumber: activeAcc,
        accountName: 'Leykun Jemaneh Ylma',
        role: 'receiver',
        bankName: sender || 'CBE',
        sender: sender || 'CBE',
        recipient: 'Leykun Jemaneh Ylma',
        type: 'receive',
        amount: 2500,
        balance: 20950.5,
        message: body,
        timestamp: nowIso,
        read: false,
        forAllUsers: true,
      });

      localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages));
      window.dispatchEvent(new CustomEvent('sms-updated'));
    } catch (err) {
      console.warn('[PushNotificationService] Failed to append test SMS:', err);
    }
  }

  /**
   * Enable push notifications directly from any sub-application (SMS Simulator, Truecaller, Telebirr, Dashen, Telegram, Phone/USSD).
   */
  public static async enableSubAppNotifications(
    subAppId: SubAppNotificationId,
    userOverride?: UserProfile | null
  ): Promise<{ ok: boolean; message?: string }> {
    const meta = SUB_APP_NOTIFICATION_META[subAppId];
    const user = userOverride || this.resolveActiveUserForPush();

    if (Capacitor.isNativePlatform()) {
      try {
        const req = await LocalNotifications.requestPermissions();
        const permission = this.mapNativeDisplayPermission(req?.display);
        this.nativePermissionCache = permission;
        if (permission !== 'granted') {
          return {
            ok: false,
            message:
              permission === 'denied'
                ? 'Notification permission was blocked. Please allow notifications for CBE Mobile Banking in Android App Settings.'
                : 'Notification permission was dismissed.',
          };
        }
        await this.ensureNativeChannel(meta.channelId, meta.channelName, meta.color, meta.description);
        if (user?.id) {
          this.setLocalEnabled(user.id, true);
          this.saveLocalPreferences(user.id, { enabled: true });
        }
        this.updateSubAppPreference(subAppId, { enabled: true });
        return {
          ok: true,
          message: `${meta.name} push notifications enabled on your Android device!`,
        };
      } catch (err) {
        return {
          ok: false,
          message: err instanceof Error ? err.message : 'Unable to enable notifications.',
        };
      }
    }

    const caps = this.getPlatformCapabilities();
    if (caps.requiresIosHomeScreenInstall) {
      return {
        ok: false,
        message: `On iPhone, first open ${meta.shortName} from your Home Screen (Safari Share → Add to Home Screen), then tap Allow Notifications.`,
      };
    }

    if (!caps.isLocalSwSupported) {
      return {
        ok: false,
        message: 'Notifications are not supported in this browser.',
      };
    }

    // Request permission directly from the user tap (required by iOS 16.4+)
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        ok: false,
        message:
          permission === 'denied'
            ? `Notification permission was blocked. Enable notifications for ${meta.shortName} in iPhone Settings.`
            : 'Notification permission was not granted.',
      };
    }

    this.updateSubAppPreference(subAppId, { enabled: true });
    if (user?.id) {
      this.setLocalEnabled(user.id, true);
      this.saveLocalPreferences(user.id, { enabled: true });
    }

    // Register this standalone sub-app with real APNs/FCM Web Push so CBE Mobile can push straight to it
    const subRes = await this.subscribeSubAppWebPush(subAppId);
    if (subRes.ok) {
      return {
        ok: true,
        message: `${meta.shortName} push notifications enabled & synced with CBE Mobile!`,
      };
    }

    return {
      ok: true,
      message: `${meta.shortName} notifications enabled on this device!`,
    };
  }

  /**
   * Dispatch a real native Android (Capacitor LocalNotifications), cross-app APNs/FCM Web Push
   * to the standalone installed sub-app, or local PWA Service Worker notification.
   */
  public static async notifySubApp(params: {
    subAppId: SubAppNotificationId;
    title: string;
    body: string;
    privateBody?: string;
    reference?: string;
    tag?: string;
    forceEvenIfMuted?: boolean;
  }): Promise<boolean> {
    try {
      const meta = SUB_APP_NOTIFICATION_META[params.subAppId];
      if (!meta) return false;

      const subPrefs = this.getSubAppPreferences()[params.subAppId];
      if (!params.forceEvenIfMuted && !subPrefs?.enabled) {
        return false;
      }

      const activeUser = this.resolveActiveUserForPush();
      const userPrefs = activeUser ? this.getLocalPreferences(activeUser.id) : DEFAULT_PREFERENCES;
      const isPrivate = userPrefs.privacyMode === 'private' || !subPrefs.showPreview;

      const finalTitle = (params.title || meta.defaultSender).trim();
      const cleanBody = (params.body || '').replace(/\s+/g, ' ').trim();
      const finalBody = isPrivate
        ? params.privateBody || `You have a new ${meta.shortName} notification.`
        : cleanBody.length > 220
          ? `${cleanBody.slice(0, 217)}...`
          : cleanBody;

      const isIosSmsMode =
        params.subAppId === 'sms' &&
        typeof window !== 'undefined' &&
        PhoneSettingsService.isIPhoneMode();

      const resolvedWebIcon = isIosSmsMode ? '/icons/notif-sms-ios.png' : meta.webIcon;
      const resolvedLargeIcon = isIosSmsMode ? 'ic_notif_sms_ios' : meta.largeIcon;
      const resolvedColor = isIosSmsMode ? '#16C64F' : meta.color;
      const resolvedTag = params.tag || `cbe-subapp-${params.subAppId}-${Date.now()}`;
      const resolvedUrl = `/${params.subAppId}/`;

      // 1. On web/iOS PWA: flush synced state & dispatch real APNs/FCM Web Push to the installed standalone sub-app
      if (!Capacitor.isNativePlatform()) {
        await CrossAppSyncService.pushChangedNow();
        const remote = await this.dispatchRemoteSubAppPush({
          subAppId: params.subAppId,
          appName: meta.shortName,
          title: finalTitle,
          body: finalBody,
          icon: resolvedWebIcon,
          badge: resolvedWebIcon,
          url: resolvedUrl,
          tag: resolvedTag,
          reference: params.reference,
        });

        // If delivered directly to the installed standalone sub-app (e.g. Messages) while triggered
        // from CBE Mobile, skip firing a duplicate CBE-logo local notification!
        if (remote.delivered > 0 && this.detectCurrentSubAppFromPath() !== params.subAppId) {
          return true;
        }
      }

      // 2. Native Android APK or local fallback
      const permissionGranted = Capacitor.isNativePlatform()
        ? (await this.syncNativePermissionStatus()) === 'granted'
        : typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted';

      if (!permissionGranted) {
        return false;
      }

      return await this.showLocalServiceWorkerNotification({
        appName: meta.shortName,
        title: finalTitle,
        body: finalBody,
        icon: resolvedWebIcon,
        badge: resolvedWebIcon,
        timestamp: Date.now(),
        category: 'test',
        tag: resolvedTag,
        url: resolvedUrl,
        reference: params.reference,
        channelId: meta.channelId,
        channelName: meta.channelName,
        iconColor: resolvedColor,
        smallIcon: meta.smallIcon,
        largeIcon: resolvedLargeIcon,
        subAppView: params.subAppId,
      });
    } catch (err) {
      console.warn('[PushNotificationService] notifySubApp failed:', err);
      return false;
    }
  }

  /**
   * Send a realistic test push notification for a specific sub-application.
   * When triggered from CBE Mobile, also writes & syncs a real CBE test SMS and delivers via
   * APNs/FCM directly to the standalone installed sub-app if subscribed.
   */
  public static async sendSubAppTestNotification(
    subAppId: SubAppNotificationId,
    custom?: { title?: string; body?: string }
  ): Promise<{ ok: boolean; message?: string; error?: string }> {
    const meta = SUB_APP_NOTIFICATION_META[subAppId];
    if (Capacitor.isNativePlatform()) {
      await this.syncNativePermissionStatus();
    }
    const caps = this.getPlatformCapabilities();

    const samples: Record<SubAppNotificationId, { title: string; body: string; privateBody: string }> = {
      sms: {
        title: 'CBE',
        body: 'Dear Leykun Jemaneh Ylma You have received ETB 2,500.00 from account 1*********8925 to your account 1*********4747. Current balance ETB 20,950.50. Thanks for Banking with CBE.',
        privateBody: 'New CBE SMS message received.',
      },
      truecaller: {
        title: 'Truecaller • CBE',
        body: 'Account 1********4747 credited with ETB 4,500.00 • Available Balance: ETB 22,950.50',
        privateBody: 'New Truecaller bank SMS alert.',
      },
      telebirr: {
        title: 'telebirr',
        body: 'You have received ETB 1,250.00 via telebirr. Your current telebirr balance is ETB 43,115.79.',
        privateBody: 'New telebirr wallet transaction.',
      },
      dashen: {
        title: 'DashenBank',
        body: "Dear LEYKUN, your account '5502******011' has been credited with ETB 5,000.00. Current Balance: ETB 23,720.00.",
        privateBody: 'New Dashen Bank account alert.',
      },
      telegram: {
        title: 'Telegram • CBE Payment',
        body: 'Payment receipt & SMS deposit confirmation for ETB 3,000.00 received.',
        privateBody: 'New message in Telegram Simulator.',
      },
      phone: {
        title: 'CBE *889# USSD',
        body: 'Your *889# transfer of ETB 500.00 has been processed successfully.',
        privateBody: 'New CBE *889# USSD alert.',
      },
    };

    const sample = samples[subAppId];
    const finalTitle = custom?.title?.trim() || sample.title;
    const finalBody = custom?.body?.trim() || sample.body;

    // For SMS Simulator tests, also add the message to the CBE SMS inbox & push sync state
    if (subAppId === 'sms') {
      this.appendSyncedTestSms(finalTitle, finalBody);
      await CrossAppSyncService.pushChangedNow([
        'bank_sms_messages_v6',
        'bank_sms_accounts_v6',
        'bank_sms_active_account',
      ]);
    }

    const isIosSmsMode =
      subAppId === 'sms' &&
      typeof window !== 'undefined' &&
      PhoneSettingsService.isIPhoneMode();
    const resolvedWebIcon = isIosSmsMode ? '/icons/notif-sms-ios.png' : meta.webIcon;
    const tag = `cbe-subapp-test-${subAppId}-${Date.now()}`;

    // Try real cross-app APNs/FCM push to the standalone installed sub-app first
    if (!Capacitor.isNativePlatform()) {
      const remote = await this.dispatchRemoteSubAppPush({
        subAppId,
        appName: meta.shortName,
        title: finalTitle,
        body: finalBody,
        icon: resolvedWebIcon,
        badge: resolvedWebIcon,
        url: `/${subAppId}/`,
        tag,
      });

      if (remote.delivered > 0) {
        return {
          ok: true,
          message: `Delivered to your installed ${meta.shortName} app! Notification will appear with ${meta.shortName}'s icon.`,
        };
      }
    }

    // Fallback to local / native Android notification
    if (caps.permission !== 'granted') {
      return {
        ok: false,
        error: caps.isIOS
          ? `Open your installed ${meta.shortName} app from your Home Screen and tap Allow Notifications once so CBE Mobile can push alerts directly to ${meta.shortName}.`
          : 'Please tap Enable Notifications first so this device grants notification permission.',
      };
    }

    const shown = await this.showLocalServiceWorkerNotification({
      appName: meta.shortName,
      title: finalTitle,
      body: finalBody,
      icon: resolvedWebIcon,
      badge: resolvedWebIcon,
      timestamp: Date.now(),
      category: 'test',
      tag,
      url: `/${subAppId}/`,
      channelId: meta.channelId,
      channelName: meta.channelName,
      iconColor: isIosSmsMode ? '#16C64F' : meta.color,
      smallIcon: meta.smallIcon,
      largeIcon: isIosSmsMode ? 'ic_notif_sms_ios' : meta.largeIcon,
      subAppView: subAppId,
    });

    if (!shown) {
      return {
        ok: false,
        error: `Could not trigger ${meta.name} notification. Check device notification permissions.`,
      };
    }

    if (caps.isIOS && !Capacitor.isNativePlatform() && this.detectCurrentSubAppFromPath() !== subAppId) {
      return {
        ok: true,
        message: `Synced! Open your installed ${meta.shortName} app and tap Allow Notifications once so future alerts drop down with ${meta.shortName}'s own icon.`,
      };
    }

    return {
      ok: true,
      message: `${meta.name} notification sent to your Lock Screen & Notification Center!`,
    };
  }
}

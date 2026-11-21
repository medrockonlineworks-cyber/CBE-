import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Transaction, UserProfile } from '../types';
import { AuthSessionService } from './authSessionService';
import { PhoneSettingsService } from './phoneSettingsService';
import { CrossAppSyncService } from './crossAppSyncService';
import { AppLogoService } from './appLogoService';
import { SubAppInstallService } from './subAppInstallService';

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
const LOCAL_ENABLED_DEVICE_KEY = 'cbe_push_local_enabled_device';
const PENDING_RECEIVER_BANK_NOTIFS_KEY = 'cbe_pending_receiver_bank_notifs_v1';
const SUB_APP_PREFS_KEY = 'cbe_subapp_push_prefs_v1';

interface PendingReceiverBankNotification {
  id: string;
  reference: string;
  recipientAccount: string;
  recipientId?: string;
  recipientName?: string;
  senderName?: string;
  amount: number;
  createdAt: string;
}

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
  senderName?: string;
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
      case 'money_received': {
        title = 'Money Received';
        const cleanSender = (params.senderName || '')
          .replace(/\s*\(Admin\)/gi, '')
          .replace(/\s*\(\d{4,}\)/g, '')
          .trim();
        body = formattedAmount
          ? cleanSender
            ? `You have received ${formattedAmount} from ${cleanSender} successfully.`
            : `You have received ${formattedAmount} successfully.`
          : 'You have received funds in your account successfully.';
        break;
      }
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

  const cbeAppIcon = AppLogoService.getNotificationIconUrl('cbe') || '/pwa-192x192.png';

  return {
    appName: 'CBE Mobile Banking',
    title,
    body,
    icon: cbeAppIcon,
    badge: cbeAppIcon,
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
  private static nativeActionTypesRegistered = false;
  private static nativePermissionCache: NotificationPermission | null = null;
  private static lastSubAppMaintainAt: Record<string, number> = {};

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
      const explicit = localStorage.getItem(`${LOCAL_ENABLED_PREFIX}${userId}`);
      if (explicit === '1') return true;
      if (explicit === '0') return false;
      if (localStorage.getItem(LOCAL_ENABLED_DEVICE_KEY) === '1') return true;
      // Inherit device-level enabled state when user switches to another account on the same device
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOCAL_ENABLED_PREFIX) && localStorage.getItem(key) === '1') {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private static setLocalEnabled(userId: string, enabled: boolean): void {
    if (typeof window === 'undefined' || !userId) return;
    try {
      if (enabled) {
        localStorage.setItem(`${LOCAL_ENABLED_PREFIX}${userId}`, '1');
        localStorage.setItem(LOCAL_ENABLED_DEVICE_KEY, '1');
      } else {
        localStorage.setItem(`${LOCAL_ENABLED_PREFIX}${userId}`, '0');
      }
    } catch {
      // Ignore storage errors
    }
  }

  private static readPendingReceiverBankNotifications(): PendingReceiverBankNotification[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(PENDING_RECEIVER_BANK_NOTIFS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private static savePendingReceiverBankNotifications(items: PendingReceiverBankNotification[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(PENDING_RECEIVER_BANK_NOTIFS_KEY, JSON.stringify(items.slice(-30)));
    } catch {
      // Ignore storage errors
    }
  }

  public static enqueuePendingReceiverBankNotification(
    tx: Transaction & { overrideType?: 'deposit' | 'withdrawal' }
  ): void {
    if (typeof window === 'undefined' || !tx || tx.status !== 'success') return;
    const recipientAcc = String(tx.recipientAccount || '').replace(/\D/g, '');
    const senderAcc = String(tx.senderAccount || '').replace(/\D/g, '');
    if (!recipientAcc || recipientAcc === senderAcc) return;
    if (tx.type === 'receive' || tx.overrideType === 'deposit' || tx.overrideType === 'withdrawal') {
      return;
    }

    const list = this.readPendingReceiverBankNotifications();
    const exists = list.some(
      (item) => item && item.id === tx.id && item.recipientAccount === recipientAcc
    );
    if (exists) return;

    list.push({
      id: tx.id,
      reference: tx.reference || tx.id,
      recipientAccount: recipientAcc,
      recipientId: tx.recipientId,
      recipientName: tx.recipientName,
      senderName: tx.senderName,
      amount: tx.amount,
      createdAt: tx.createdAt || new Date().toISOString(),
    });
    this.savePendingReceiverBankNotifications(list);
  }

  /**
   * Delivers queued CBE Mobile Banking "Money Received" notifications when the user
   * switches to the receiver's account (from either CBE Bank app or SMS app).
   */
  public static async deliverPendingReceiverNotificationsForAccount(
    accountNumber: string,
    targetUser?: UserProfile | null
  ): Promise<number> {
    if (typeof window === 'undefined') return 0;
    const cleanAcc = String(accountNumber || targetUser?.accountNumber || '').replace(/\D/g, '');
    if (!cleanAcc) return 0;

    const allPending = this.readPendingReceiverBankNotifications();
    if (allPending.length === 0) return 0;

    const matching: PendingReceiverBankNotification[] = [];
    const remaining: PendingReceiverBankNotification[] = [];

    for (const item of allPending) {
      if (!item) continue;
      const accMatch = item.recipientAccount === cleanAcc;
      const idMatch = Boolean(targetUser?.id && item.recipientId && item.recipientId === targetUser.id);
      if (accMatch || idMatch) {
        matching.push(item);
      } else {
        remaining.push(item);
      }
    }

    if (matching.length === 0) return 0;

    // Drain atomically before async dispatch to prevent duplicate notifications
    this.savePendingReceiverBankNotifications(remaining);

    try {
      const permissionGranted = Capacitor.isNativePlatform()
        ? (await this.syncNativePermissionStatus()) === 'granted'
        : 'Notification' in window && Notification.permission === 'granted';

      if (!permissionGranted) return 0;

      const resolvedUser = targetUser || this.resolveActiveUserForPush();
      const userId = resolvedUser?.id || `acc_${cleanAcc}`;
      if (!this.isLocalEnabled(userId) && !Capacitor.isNativePlatform()) {
        return 0;
      }

      const prefs = this.getLocalPreferences(userId);
      if (!isCategoryAllowed(prefs, 'money_received')) {
        return 0;
      }

      let delivered = 0;
      for (const item of matching) {
        const payload = buildLocalNotificationPayload({
          category: 'money_received',
          amount: item.amount,
          txId: item.id,
          reference: item.reference,
          senderName: item.senderName,
          privacyMode: prefs.privacyMode,
        });
        payload.tag = `cbe-rx-${item.id}-${cleanAcc}`;
        const shown = await this.showLocalServiceWorkerNotification(payload);
        if (shown) delivered += 1;
      }
      return delivered;
    } catch {
      return 0;
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

  private static async ensureNativeSmsActionType(): Promise<void> {
    if (!Capacitor.isNativePlatform() || this.nativeActionTypesRegistered) return;
    try {
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: 'SMS_MARK_READ',
            actions: [
              {
                id: 'mark_read',
                title: 'Mark as read',
                foreground: false,
              },
            ],
          },
          {
            id: 'TRUECALLER_SMS_ACTIONS',
            actions: [
              {
                id: 'tc_mark_read',
                title: 'Mark as read',
                foreground: false,
              },
              {
                id: 'tc_dismiss',
                title: 'Cancel',
                foreground: false,
              },
            ],
          },
        ],
      });
      this.nativeActionTypesRegistered = true;
    } catch (err) {
      console.warn('[PushNotificationService] Failed to register notification action types:', err);
    }
  }

  private static markSmsReadLocally(params: {
    smsId?: string | null;
    reference?: string | null;
    tag?: string | null;
  }): void {
    if (typeof window === 'undefined') return;
    try {
      const STORAGE_KEY = 'bank_sms_messages_v6';
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return;

      let changed = false;
      const updated = list.map((msg: any) => {
        if (!msg || typeof msg !== 'object' || msg.read) return msg;
        const idMatch = params.smsId && msg.id === params.smsId;
        const refMatch = params.reference && msg.transactionId === params.reference;
        const tagMatch = params.tag && params.tag === `cbe-sms-${msg.id}`;
        if (idMatch || refMatch || tagMatch) {
          changed = true;
          return { ...msg, read: true };
        }
        return msg;
      });

      if (changed) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('sms-updated'));
      }
    } catch {
      // Non-fatal
    }
  }

  private static async showLocalServiceWorkerNotification(
    payload: ReturnType<typeof buildLocalNotificationPayload> & {
      channelId?: string;
      channelName?: string;
      iconColor?: string;
      smallIcon?: string;
      largeIcon?: string;
      subAppView?: SubAppNotificationId;
      smsId?: string;
    }
  ): Promise<boolean> {
    try {
      const isAndroidSms =
        payload.subAppView === 'sms' &&
        (typeof window === 'undefined' || !PhoneSettingsService.isIPhoneMode());

      if (Capacitor.isNativePlatform()) {
        const perm =
          this.nativePermissionCache ?? (await this.syncNativePermissionStatus());
        if (perm !== 'granted') {
          return false;
        }
        const channelId = payload.channelId || 'cbe-banking-alerts';
        const channelName = payload.channelName || 'CBE Banking Alerts';
        const iconColor = isAndroidSms ? '#1A73E8' : payload.iconColor || '#70189F';
        const smallIcon = payload.smallIcon || 'ic_stat_cbe';
        // For main CBE Mobile Banking notifications, omit largeIcon so Android displays ONLY the app icon
        // (no second duplicate/mismatched icon on the right side of the heads-up banner or notification rows).
        const largeIcon = payload.subAppView
          ? isAndroidSms
            ? 'ic_notif_sms_android_avatar'
            : payload.largeIcon
          : undefined;
        const isTruecaller = payload.subAppView === 'truecaller';
        await this.ensureNativeChannel(channelId, channelName, iconColor);
        if (isAndroidSms || isTruecaller) {
          await this.ensureNativeSmsActionType();
        }
        const notifId =
          ((Date.now() % 1_000_000_000) + Math.floor(Math.random() * 1000)) | 0;
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.max(1, notifId),
              title: payload.title,
              body: payload.body,
              largeBody: payload.body,
              summaryText: isAndroidSms
                ? 'Messages'
                : payload.subAppView
                  ? payload.appName || channelName
                  : undefined,
              channelId,
              smallIcon,
              ...(largeIcon ? { largeIcon } : {}),
              iconColor,
              group: isAndroidSms ? 'cbe_messages_group' : undefined,
              actionTypeId: isAndroidSms
                ? 'SMS_MARK_READ'
                : isTruecaller
                  ? 'TRUECALLER_SMS_ACTIONS'
                  : undefined,
              ongoing: isTruecaller,
              autoCancel: !isTruecaller,
              extra: {
                url: payload.url,
                view: payload.subAppView || null,
                txId: payload.txId || null,
                smsId: payload.smsId || null,
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

      const caps = this.getPlatformCapabilities();
      const useAndroidSmsStyle = isAndroidSms && (caps.isAndroid || !caps.isIOS);
      const isTruecallerWeb = payload.subAppView === 'truecaller';

      const options = {
        body: payload.body,
        icon: useAndroidSmsStyle ? '/icons/notif-sms-android-avatar.png' : payload.icon,
        badge: useAndroidSmsStyle ? '/icons/badge-sms-android.png' : payload.badge,
        tag: payload.tag,
        renotify: true,
        silent: false,
        vibrate: [200, 100, 200],
        requireInteraction: isTruecallerWeb,
        timestamp: payload.timestamp,
        ...(isTruecallerWeb
          ? {
              actions: [
                { action: 'tc_mark_read', title: 'Mark as read' },
                { action: 'tc_dismiss', title: 'Cancel' },
              ],
            }
          : useAndroidSmsStyle
            ? { actions: [{ action: 'mark_read', title: 'Mark as read' }] }
            : {}),
        data: {
          url: payload.url,
          view: payload.subAppView || null,
          txId: payload.txId || null,
          smsId: payload.smsId || null,
          reference: payload.reference || null,
          category: payload.category,
        },
      } as NotificationOptions & {
        renotify?: boolean;
        vibrate?: number[];
        timestamp?: number;
        actions?: Array<{ action: string; title: string }>;
      };

      if ('serviceWorker' in navigator) {
        const reg =
          payload.subAppView && this.detectCurrentSubAppFromPath() === payload.subAppView
            ? await this.getSubAppServiceWorkerRegistration(payload.subAppView)
            : await this.getActiveServiceWorkerRegistration();
        try {
          await reg.showNotification(payload.title, options);
        } catch {
          delete options.actions;
          await reg.showNotification(payload.title, options);
        }
        return true;
      }

      delete options.actions;
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
        void this.ensureNativeSmsActionType();
        void LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
          const extra = event?.notification?.extra as Record<string, unknown> | undefined;
          if (event?.actionId === 'mark_read') {
            this.markSmsReadLocally({
              smsId: typeof extra?.smsId === 'string' ? extra.smsId : null,
              reference: typeof extra?.reference === 'string' ? extra.reference : null,
            });
            return;
          }
          if (event?.actionId === 'tc_mark_read' || event?.actionId === 'tc_dismiss') {
            const notifId = event?.notification?.id;
            if (typeof notifId === 'number') {
              void LocalNotifications.removeDeliveredNotifications({
                notifications: [{ id: notifId } as any],
              }).catch(() => {});
            }
            const alertId =
              (typeof extra?.smsId === 'string' && extra.smsId) ||
              (typeof extra?.reference === 'string' && extra.reference) ||
              null;
            window.dispatchEvent(
              new CustomEvent(
                event.actionId === 'tc_mark_read'
                  ? 'cbe_native_truecaller_marked_read'
                  : 'cbe_native_truecaller_dismissed',
                {
                  detail: {
                    alertId,
                    reference: typeof extra?.reference === 'string' ? extra.reference : null,
                  },
                }
              )
            );
            return;
          }
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

      if (data.type === 'CBE_MARK_SMS_READ') {
        this.markSmsReadLocally({
          smsId: typeof data.smsId === 'string' ? data.smsId : null,
          reference: typeof data.reference === 'string' ? data.reference : null,
          tag: typeof data.tag === 'string' ? data.tag : null,
        });
      } else if (data.type === 'CBE_MARK_TRUECALLER_READ') {
        window.dispatchEvent(
          new CustomEvent('cbe_native_truecaller_marked_read', {
            detail: {
              alertId: typeof data.alertId === 'string' ? data.alertId : null,
              reference: typeof data.reference === 'string' ? data.reference : null,
            },
          })
        );
      } else if (data.type === 'CBE_DISMISS_TRUECALLER') {
        window.dispatchEvent(
          new CustomEvent('cbe_native_truecaller_dismissed', {
            detail: {
              alertId: typeof data.alertId === 'string' ? data.alertId : null,
              reference: typeof data.reference === 'string' ? data.reference : null,
            },
          })
        );
      } else if (data.type === 'CBE_NOTIFICATION_CLICK') {
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
        if (typeof data.subAppId === 'string' && data.subAppId) {
          CrossAppSyncService.refreshPairedLinkSubscription(data.subAppId, data.subscription);
        }
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

      // Always queue the receiver's incoming credit alert so switching to the receiver account
      // delivers their "Money Received" CBE Bank notification automatically.
      this.enqueuePendingReceiverBankNotification(tx);

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
            senderName: tx.senderName,
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
    subAppId: SubAppNotificationId,
    options?: { forceRenew?: boolean }
  ): Promise<{
    ok: boolean;
    deviceCount?: number;
    subscription?: PushSubscriptionJSON;
    connectionKey?: string;
    error?: string;
  }> {
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
        return { ok: false, error: keyData?.error || 'VAPID public key unavailable on server.' };
      }

      const appServerKey = urlBase64ToUint8Array(keyData.publicKey);
      const reg = await this.getSubAppServiceWorkerRegistration(subAppId);

      let sub = await reg.pushManager.getSubscription();
      if (sub) {
        const existingKeyBuf = sub.options?.applicationServerKey;
        const existingKey = existingKeyBuf ? new Uint8Array(existingKeyBuf) : null;
        const keyMismatch = existingKey && !this.uint8ArrayEquals(existingKey, appServerKey);
        if (options?.forceRenew || keyMismatch) {
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

      const subJson = sub.toJSON();
      const pairId = CrossAppSyncService.getOrCreatePermanentPairId(subAppId);
      const connectionKey = CrossAppSyncService.encodeConnectionKey(subAppId, subJson, pairId);

      // Keep same-origin paired link up-to-date automatically if this origin already has a link for subAppId
      const existingSameOrigin = CrossAppSyncService.getPairedSubAppLinks(subAppId);
      if (existingSameOrigin.length > 0 && subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
        CrossAppSyncService.refreshPairedLinkSubscription(subAppId, subJson);
      }

      const platform: 'ios' | 'android' | 'desktop' = caps.isIOS
        ? 'ios'
        : caps.isAndroid
          ? 'android'
          : 'desktop';

      // Register under the permanent pairId so CBE Mobile always reaches the latest rotated token
      // without the user ever having to regenerate or re-paste their Connection Key!
      let deviceCount = 1;
      try {
        const res = await fetch('/api/subapp/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucketKey: pairId,
            subAppId,
            platform,
            replaceExisting: Boolean(options?.forceRenew),
            subscription: subJson,
          }),
        });
        const data = await safeParseJson<{ ok?: boolean; deviceCount?: number }>(
          res,
          '/api/subapp/subscribe'
        );
        if (res.ok && data?.ok && typeof data.deviceCount === 'number') {
          deviceCount = data.deviceCount;
        }
      } catch {
        // Fallback subscription inside Connection Key still works statelessly
      }

      return { ok: true, deviceCount, subscription: subJson, connectionKey };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Unable to subscribe sub-app push.',
      };
    }
  }

  /**
   * Generates a Special Connection Key (CBELINK-...) for this installed standalone sub-app.
   * Pasting this key once into CBE Mobile links both apps directly via Apple APNs / FCM
   * with zero external database required.
   */
  public static async getOrCreateSubAppConnectionKey(
    subAppId: SubAppNotificationId,
    options?: { forceRenew?: boolean }
  ): Promise<{ ok: boolean; connectionKey?: string; error?: string }> {
    const meta = SUB_APP_NOTIFICATION_META[subAppId];
    if (Capacitor.isNativePlatform()) {
      return {
        ok: false,
        error: 'Native Android APK already shares local storage directly — no pairing key needed.',
      };
    }

    const caps = this.getPlatformCapabilities();
    if (caps.requiresIosHomeScreenInstall) {
      return {
        ok: false,
        error: `First open ${meta.shortName} from your iPhone Home Screen (Share → Add to Home Screen), then generate the key there.`,
      };
    }

    if (caps.permission !== 'granted') {
      const enabled = await this.enableSubAppNotifications(subAppId);
      if (!enabled.ok) {
        return { ok: false, error: enabled.message || 'Please allow notifications first.' };
      }
    }

    const subRes = await this.subscribeSubAppWebPush(subAppId, options);
    if (!subRes.ok || !subRes.connectionKey) {
      return {
        ok: false,
        error: subRes.error || 'Could not generate Connection Key. Make sure the site is deployed with VAPID keys.',
      };
    }

    return { ok: true, connectionKey: subRes.connectionKey };
  }

  /**
   * Automatically maintains a standalone sub-app's permanent Connection Key on open/focus.
   * Checks /api/subapp/status?bucketKey=<pairId>&subAppId=<subAppId>; if Chrome/iOS rotated or
   * invalidated the previous endpoint (renewalNeeded === true or count === 0), silently mints a
   * fresh subscription and registers it under the exact same permanent pairId — no re-pasting needed!
   */
  public static async autoMaintainSubAppSubscription(
    subAppId: SubAppNotificationId,
    options?: { forceCheck?: boolean }
  ): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) return;
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      const now = Date.now();
      const last = this.lastSubAppMaintainAt[subAppId] || 0;
      if (!options?.forceCheck && now - last < 15_000) return;
      this.lastSubAppMaintainAt[subAppId] = now;

      const pairId = CrossAppSyncService.getOrCreatePermanentPairId(subAppId);
      let forceRenew = false;
      let needsSync = false;

      try {
        const res = await fetch(
          `/api/subapp/status?bucketKey=${encodeURIComponent(pairId)}&subAppId=${encodeURIComponent(subAppId)}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await safeParseJson<{
            ok?: boolean;
            counts?: Record<string, number>;
            renewalNeeded?: boolean;
          }>(res, '/api/subapp/status');
          if (data?.renewalNeeded) {
            forceRenew = true;
            needsSync = true;
          } else if ((data?.counts?.[subAppId] ?? 0) === 0) {
            needsSync = true;
          }
        }
      } catch {
        needsSync = true;
      }

      if (needsSync || forceRenew) {
        await this.subscribeSubAppWebPush(subAppId, { forceRenew });
      } else {
        // Still make sure the active local browser subscription is synced under pairId
        await this.subscribeSubAppWebPush(subAppId, { forceRenew: false });
      }
    } catch {
      // Non-fatal background maintenance
    }
  }

  /**
   * Silently refreshes a standalone sub-app's Web Push subscription on open (never prompts).
   */
  public static async syncSubAppPushSubscriptionSilently(
    subAppId: SubAppNotificationId
  ): Promise<void> {
    await this.autoMaintainSubAppSubscription(subAppId, { forceCheck: true });
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
    smsRecord?: Record<string, unknown>;
    payloadRecord?: Record<string, unknown>;
    overrideDirectSubscriptions?: PushSubscriptionJSON[];
    overrideBucketKey?: string;
  }): Promise<{
    ok: boolean;
    delivered: number;
    total: number;
    queued?: boolean;
    renewalRequested?: boolean;
    errorCodes?: number[];
    expiredEndpoints?: string[];
    error?: string;
  }> {
    if (typeof window === 'undefined') {
      return { ok: false, delivered: 0, total: 0 };
    }
    const { overrideDirectSubscriptions, overrideBucketKey, ...pushPayload } = params;
    const pairedLinks = CrossAppSyncService.getPairedSubAppLinks(params.subAppId);
    const directSubscriptions =
      overrideDirectSubscriptions && overrideDirectSubscriptions.length > 0
        ? overrideDirectSubscriptions
        : pairedLinks.map((l) => l.subscription);

    const isInsideThisSubApp =
      !Capacitor.isNativePlatform() && this.detectCurrentSubAppFromPath() === params.subAppId;

    const targetBucketKey =
      overrideBucketKey ||
      pairedLinks[0]?.pairId ||
      pairedLinks[0]?.bucketKey ||
      (isInsideThisSubApp
        ? CrossAppSyncService.getOrCreatePermanentPairId(params.subAppId)
        : CrossAppSyncService.getBucketKey());

    // Inside Native Android APK, only dispatch remote push if the user linked a standalone sub-app via Special Connection Key
    if (Capacitor.isNativePlatform() && directSubscriptions.length === 0) {
      return { ok: false, delivered: 0, total: 0 };
    }

    try {
      const baseUrl = CrossAppSyncService.getBridgeBaseUrl(params.subAppId);
      const res = await fetch(`${baseUrl}/api/subapp/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucketKey: targetBucketKey,
          directSubscriptions,
          ...pushPayload,
        }),
      });
      const data = await safeParseJson<{
        ok?: boolean;
        delivered?: number;
        total?: number;
        queued?: boolean;
        renewalRequested?: boolean;
        latestSubscription?: {
          endpoint: string;
          expirationTime: number | null;
          keys: { p256dh: string; auth: string };
        } | null;
        errorCodes?: number[];
        expiredEndpoints?: string[];
        error?: string;
      }>(res, '/api/subapp/push');
      if (!res.ok || !data?.ok) {
        return {
          ok: false,
          delivered: 0,
          total: directSubscriptions.length,
          error: data?.error || `HTTP ${res.status}`,
        };
      }

      const delivered = Number(data.delivered || 0);
      // Silently upgrade cached fallback subscription if server delivered via a freshly rotated endpoint
      if (delivered > 0 && data.latestSubscription) {
        CrossAppSyncService.refreshPairedLinkSubscription(params.subAppId, data.latestSubscription);
      }

      return {
        ok: true,
        delivered,
        total: Number(data.total || 0),
        queued: Boolean(data.queued),
        renewalRequested: Boolean(data.renewalRequested),
        errorCodes: Array.isArray(data.errorCodes) ? data.errorCodes : [],
        expiredEndpoints: Array.isArray(data.expiredEndpoints) ? data.expiredEndpoints : [],
      };
    } catch (err) {
      return {
        ok: false,
        delivered: 0,
        total: directSubscriptions.length,
        error: err instanceof Error ? err.message : 'Network error',
      };
    }
  }

  private static appendSyncedTestSms(sender: string, body: string): Record<string, unknown> | undefined {
    if (typeof window === 'undefined') return undefined;
    try {
      const STORAGE_MESSAGES_KEY = 'bank_sms_messages_v6';
      const raw = localStorage.getItem(STORAGE_MESSAGES_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const messages = Array.isArray(list) ? list : [];

      const activeAcc = localStorage.getItem('bank_sms_active_account') || '1000419524747';
      const txId = `FT${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const nowIso = new Date().toISOString();

      const record = {
        id: `sms-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        transactionId: txId,
        accountNumber: activeAcc,
        accountName: 'Leykun Jemaneh Ylma',
        role: 'receiver' as const,
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
      };

      messages.push(record);
      localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages));
      window.dispatchEvent(new CustomEvent('sms-updated'));
      return record;
    } catch (err) {
      console.warn('[PushNotificationService] Failed to append test SMS:', err);
      return undefined;
    }
  }

  /**
   * Enable push notifications directly from any sub-application (SMS Simulator, Truecaller, Telebirr, Dashen, Telegram, Phone/USSD).
   */
  public static async enableSubAppNotifications(
    subAppId: SubAppNotificationId,
    userOverride?: UserProfile | null
  ): Promise<{ ok: boolean; message?: string; connectionKey?: string }> {
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
        connectionKey: subRes.connectionKey,
        message: `${meta.shortName} push notifications enabled! Copy the Connection Key below into CBE Mobile to link both apps permanently.`,
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
    smsRecord?: Record<string, unknown>;
    payloadRecord?: Record<string, unknown>;
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
      const maxBodyLen = params.subAppId === 'sms' || params.subAppId === 'truecaller' ? 650 : 280;
      const finalBody = isPrivate
        ? params.privateBody || `You have a new ${meta.shortName} notification.`
        : cleanBody.length > maxBodyLen
          ? `${cleanBody.slice(0, maxBodyLen - 3)}...`
          : cleanBody;

      const isIosSmsMode =
        params.subAppId === 'sms' &&
        typeof window !== 'undefined' &&
        PhoneSettingsService.isIPhoneMode();

      const isAndroidSms = params.subAppId === 'sms' && !isIosSmsMode;
      const resolvedWebIcon = isAndroidSms
        ? '/icons/notif-sms-android-avatar.png'
        : AppLogoService.getNotificationIconUrl(params.subAppId, {
            isIPhone: isIosSmsMode,
          });
      const resolvedWebBadge = isAndroidSms
        ? '/icons/badge-sms-android.png'
        : resolvedWebIcon;
      const standaloneFlavor = Capacitor.isNativePlatform()
        ? await SubAppInstallService.getStandaloneSubAppFlavor()
        : null;
      const isOwnStandaloneAppIconOnly =
        standaloneFlavor === 'truecaller' || standaloneFlavor === 'phone';
      const resolvedLargeIcon = isOwnStandaloneAppIconOnly
        ? undefined
        : isIosSmsMode
          ? 'ic_notif_sms_ios'
          : isAndroidSms
            ? 'ic_notif_sms_android_avatar'
            : meta.largeIcon;
      const resolvedColor = isIosSmsMode ? '#16C64F' : meta.color;
      const resolvedTag = params.tag || `cbe-subapp-${params.subAppId}-${Date.now()}`;
      const resolvedUrl = `/${params.subAppId}/`;
      const smsId =
        typeof params.smsRecord?.id === 'string'
          ? params.smsRecord.id
          : typeof params.payloadRecord?.id === 'string'
            ? params.payloadRecord.id
            : undefined;

      // 0. If running inside Native Android APK and standalone Messages/Truecaller/Phone APK is installed,
      // deliver directly via Android explicit package broadcast (instant, offline, own app icon only, never expires!)
      if (
        Capacitor.isNativePlatform() &&
        (params.subAppId === 'sms' || params.subAppId === 'truecaller' || params.subAppId === 'phone')
      ) {
        const directApk = await SubAppInstallService.sendAlertToSubAppApk({
          subAppId: params.subAppId,
          sender: finalTitle,
          body: finalBody,
          alertId: smsId,
          reference: params.reference,
          payloadRecord: params.payloadRecord || params.smsRecord,
        });
        if (directApk.delivered) {
          return true;
        }
      }

      // 1. Always attempt real FCM/APNs Web Push to a linked standalone sub-app (works from BOTH Web/iOS AND Native Android CBE APK!)
      const hasLinkedSubApp = CrossAppSyncService.getPairedSubAppLinks(params.subAppId).length > 0;
      if (!Capacitor.isNativePlatform() || hasLinkedSubApp) {
        await CrossAppSyncService.pushChangedNow();
        const remote = await this.dispatchRemoteSubAppPush({
          subAppId: params.subAppId,
          appName: meta.shortName,
          title: finalTitle,
          body: finalBody,
          icon: resolvedWebIcon,
          badge: resolvedWebBadge,
          url: resolvedUrl,
          tag: resolvedTag,
          reference: params.reference,
          smsRecord: params.smsRecord,
          payloadRecord: params.payloadRecord,
        });

        // If delivered directly to the installed standalone sub-app (e.g. Messages/Truecaller/Phone),
        // skip posting a local CBE-logo notification so ONLY the standalone app notifies!
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
        badge: resolvedWebBadge,
        timestamp: Date.now(),
        category: 'test',
        tag: resolvedTag,
        url: resolvedUrl,
        reference: params.reference,
        smsId,
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
   * APNs/FCM directly to the standalone installed sub-app using its paired Connection Key.
   */
  public static async sendSubAppTestNotification(
    subAppId: SubAppNotificationId,
    custom?: { title?: string; body?: string }
  ): Promise<{ ok: boolean; message?: string; error?: string; connectionKey?: string }> {
    const meta = SUB_APP_NOTIFICATION_META[subAppId];
    if (Capacitor.isNativePlatform()) {
      await this.syncNativePermissionStatus();
    }
    const caps = this.getPlatformCapabilities();
    const activeUser = this.resolveActiveUserForPush();
    const activeHolderName = (activeUser?.name || 'Leykun Jemaneh Yilma').trim();
    const activeFirstName = activeHolderName.split(/\s+/)[0] || 'Customer';
    const activeAccNum = (activeUser?.accountNumber || '1000419524747').replace(/\D/g, '');
    const activeMaskedAcc =
      activeAccNum.length >= 4
        ? `${activeAccNum[0]}********${activeAccNum.slice(-4)}`
        : '1********4747';

    const samples: Record<SubAppNotificationId, { title: string; body: string; privateBody: string }> = {
      sms: {
        title: 'CBE',
        body: `Dear ${activeHolderName} You have received ETB 2,500.00 from account 1********8925 to your account ${activeMaskedAcc}. Your current balance is ETB 20,950.50. Thanks for Banking with CBE. https://mbreciept.cbe.com.et/v2-hfHCxO9rowo1cCxRHglp  for feedback: https://forms.gle/kGNGQpG3mQCCk3iD6`,
        privateBody: 'New CBE SMS message received.',
      },
      truecaller: {
        title: 'CBE',
        body: `Dear ${activeHolderName} Account ${activeMaskedAcc} credited with ETB 4,500.00 • Available Balance: ETB 22,950.50`,
        privateBody: 'New Truecaller bank SMS alert.',
      },
      telebirr: {
        title: 'telebirr',
        body: 'You have received ETB 1,250.00 via telebirr. Your current telebirr balance is ETB 43,115.79.',
        privateBody: 'New telebirr wallet transaction.',
      },
      dashen: {
        title: 'DashenBank',
        body: `Dear ${activeFirstName.toUpperCase()}, your account '5502******011' has been credited with ETB 5,000.00. Current Balance: ETB 23,720.00.`,
        privateBody: 'New Dashen Bank account alert.',
      },
      telegram: {
        title: 'Telegram • CBE Payment',
        body: 'Payment receipt & SMS deposit confirmation for ETB 3,000.00 received.',
        privateBody: 'New message in Telegram Simulator.',
      },
      phone: {
        title: 'CBE *889#',
        body: `${activeHolderName}: Your *889# transfer of ETB 500.00 has been processed successfully.`,
        privateBody: 'New CBE *889# USSD alert.',
      },
    };

    const sample = samples[subAppId];
    const finalTitle = custom?.title?.trim() || sample.title;
    const finalBody = custom?.body?.trim() || sample.body;

    // For SMS & Truecaller Simulator tests, also persist a real synced record & push sync state immediately
    let smsRecord: Record<string, unknown> | undefined;
    let payloadRecord: Record<string, unknown> | undefined;
    if (subAppId === 'sms') {
      smsRecord = this.appendSyncedTestSms(finalTitle, finalBody);
      payloadRecord = smsRecord;
      await CrossAppSyncService.pushChangedNow([
        'bank_sms_messages_v6',
        'bank_sms_accounts_v6',
        'bank_sms_active_account',
      ]);
    } else if (subAppId === 'truecaller') {
      const nowTime = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const tcAlertId = `tc-test-${Date.now()}`;
      const tcRecord: Record<string, unknown> = {
        id: tcAlertId,
        accountId: localStorage.getItem('tc_sim_active_account_id') || 'acc-cbe-leykun',
        bankKey: 'cbe',
        bankName: finalTitle || 'CBE',
        role: 'receiver',
        amount: 4500,
        maskedAccount: activeMaskedAcc,
        fullAccount: activeAccNum || '1000419524747',
        holderName: activeHolderName,
        counterpartyName: 'CBE Mobile',
        balanceAfter: (activeUser?.balance || 18450.5) + 4500,
        timeString: nowTime,
        timestamp: new Date().toISOString(),
        summaryText: `Account ${activeMaskedAcc} credited with ETB 4,500.00.`,
        txId: `FT${Math.floor(10000000 + Math.random() * 89999999)}`,
        fullSmsText: finalBody,
        read: false,
        backgroundApp: 'messages',
      };
      payloadRecord = tcRecord;
      try {
        const raw = localStorage.getItem('tc_sim_alerts_v2');
        const list = raw ? JSON.parse(raw) : [];
        if (Array.isArray(list)) {
          localStorage.setItem('tc_sim_alerts_v2', JSON.stringify([tcRecord, ...list]));
        }
        window.dispatchEvent(new CustomEvent('tc_alerts_updated', { detail: { alert: tcRecord } }));
        window.dispatchEvent(new CustomEvent('tc_live_popdown', { detail: { alert: tcRecord } }));
      } catch {}
      await CrossAppSyncService.pushChangedNow([
        'tc_sim_alerts_v2',
        'tc_sim_accounts_v2',
        'tc_sim_active_account_id',
      ]);
    }

    const isIosSmsMode =
      subAppId === 'sms' &&
      typeof window !== 'undefined' &&
      PhoneSettingsService.isIPhoneMode();
    const isAndroidSms = subAppId === 'sms' && !isIosSmsMode;
    const resolvedWebIcon = isAndroidSms
      ? '/icons/notif-sms-android-avatar.png'
      : AppLogoService.getNotificationIconUrl(subAppId, {
          isIPhone: isIosSmsMode,
        });
    const resolvedWebBadge = isAndroidSms
      ? '/icons/badge-sms-android.png'
      : resolvedWebIcon;
    const smsId =
      typeof smsRecord?.id === 'string'
        ? smsRecord.id
        : typeof payloadRecord?.id === 'string'
          ? payloadRecord.id
          : undefined;
    const tag = `cbe-subapp-test-${subAppId}-${Date.now()}`;
    const isInsideThisSubApp = !Capacitor.isNativePlatform() && this.detectCurrentSubAppFromPath() === subAppId;

    // 0. If running inside Native Android CBE Mobile APK and standalone Messages/Truecaller/Phone APK is installed,
    // deliver directly via Android explicit package broadcast!
    if (
      Capacitor.isNativePlatform() &&
      (subAppId === 'sms' || subAppId === 'truecaller' || subAppId === 'phone')
    ) {
      const directApk = await SubAppInstallService.sendAlertToSubAppApk({
        subAppId,
        sender: finalTitle,
        body: finalBody,
        alertId: smsId,
        payloadRecord: payloadRecord || smsRecord,
      });
      if (directApk.delivered) {
        return {
          ok: true,
          message: `Delivered directly to your installed ${meta.shortName} APK! Authentic notification shown with its own app icon and zero CBE logo.`,
        };
      }
    }

    // Try real cross-app FCM/APNs push to the standalone installed sub-app first (works on Web, iOS, AND Native Android APK!)
    const hasLinkedSubApp = CrossAppSyncService.getPairedSubAppLinks(subAppId).length > 0;
    if (!Capacitor.isNativePlatform() || hasLinkedSubApp) {
      const pushReq = {
        subAppId,
        appName: meta.shortName,
        title: finalTitle,
        body: finalBody,
        icon: resolvedWebIcon,
        badge: resolvedWebBadge,
        url: `/${subAppId}/`,
        tag,
        smsRecord,
        payloadRecord,
      };
      const remote = await this.dispatchRemoteSubAppPush(pushReq);

      if (remote.delivered > 0) {
        return {
          ok: true,
          message: `Delivered directly to your installed ${meta.shortName} app! Notification will drop down from ${meta.shortName} (no CBE logo) and sync into the inbox.`,
        };
      }

      if (remote.total > 0 && remote.errorCodes && remote.errorCodes.length > 0) {
        const failedCode = remote.errorCodes[0];
        const isRotatedSub = failedCode === 410 || failedCode === 404 || failedCode === 403;

        // Auto-heal silently under the SAME permanent pairId when inside the standalone sub-app!
        if (isInsideThisSubApp && isRotatedSub) {
          const renewed = await this.subscribeSubAppWebPush(subAppId, { forceRenew: true });
          if (renewed.ok && renewed.subscription) {
            const retry = await this.dispatchRemoteSubAppPush({
              ...pushReq,
              tag: `cbe-subapp-test-${subAppId}-${Date.now()}`,
              overrideDirectSubscriptions: [renewed.subscription],
              overrideBucketKey: CrossAppSyncService.getOrCreatePermanentPairId(subAppId),
            });
            if (retry.delivered > 0) {
              return {
                ok: true,
                connectionKey: renewed.connectionKey,
                message: `Background push channel refreshed automatically & test push delivered! Your permanent Connection Key stays connected — no need to re-paste it in CBE Mobile.`,
              };
            }
          }
        }

        if (!isInsideThisSubApp && (remote.queued || isRotatedSub)) {
          return {
            ok: true,
            message: `Your permanent ${meta.shortName} Connection Key stays active — this message was queued for ${meta.shortName}. Open your installed ${meta.shortName} app once so your browser auto-refreshes its background push channel (no need to paste a new key).`,
          };
        }

        return {
          ok: false,
          error: `Your browser rotated its push channel (code ${failedCode}). Tap "Refresh Channel" below to renew it automatically under your same permanent key.`,
        };
      }
    }

    // Fallback to local / native Android notification
    if (caps.permission !== 'granted') {
      return {
        ok: false,
        error: caps.isIOS
          ? `Not linked yet: open your installed ${meta.shortName} app → tap the Bell icon → Copy Connection Key → paste it in CBE Settings above.`
          : 'Please tap Enable Notifications first so this device grants notification permission.',
      };
    }

    const shown = await this.showLocalServiceWorkerNotification({
      appName: meta.shortName,
      title: finalTitle,
      body: finalBody,
      icon: resolvedWebIcon,
      badge: resolvedWebBadge,
      timestamp: Date.now(),
      category: 'test',
      tag,
      url: `/${subAppId}/`,
      smsId,
      channelId: meta.channelId,
      channelName: meta.channelName,
      iconColor: isIosSmsMode ? '#16C64F' : meta.color,
      smallIcon: meta.smallIcon,
      largeIcon: isIosSmsMode
        ? 'ic_notif_sms_ios'
        : isAndroidSms
          ? 'ic_notif_sms_android_avatar'
          : meta.largeIcon,
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
        message: `Local preview sent. To deliver straight to your installed ${meta.shortName} app with its green icon, copy the Special Connection Key from ${meta.shortName} and paste it in the Connect box above.`,
      };
    }

    return {
      ok: true,
      message: `${meta.name} notification sent to your Lock Screen & Notification Center!`,
    };
  }
}

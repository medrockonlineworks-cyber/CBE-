import type { Transaction, UserProfile } from '../types';
import { AuthSessionService } from './authSessionService';

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

const LOCAL_PREFS_PREFIX = 'cbe_push_local_prefs_';
const LOCAL_ENABLED_PREFIX = 'cbe_push_local_enabled_';

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
    const isIOS =
      /iPhone|iPad|iPod/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    const isInIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

    const hasSW = 'serviceWorker' in navigator;
    const hasNotification = 'Notification' in window;
    const hasPushManager = 'PushManager' in window;
    const isLocalSwSupported = hasSW && hasNotification;
    const isPushSupported = hasSW && hasNotification && hasPushManager;
    const permission: NotificationPermission | 'unsupported' = hasNotification
      ? Notification.permission
      : 'unsupported';

    return {
      isIOS,
      isAndroid,
      isStandalone,
      isInIframe,
      isSecureContext: Boolean(window.isSecureContext),
      isPushSupported,
      isLocalSwSupported,
      requiresIosHomeScreenInstall: isIOS && !isStandalone,
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
    payload: ReturnType<typeof buildLocalNotificationPayload>
  ): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
        return false;
      }

      const options: NotificationOptions = {
        body: payload.body,
        icon: payload.icon,
        badge: payload.badge,
        tag: payload.tag,
        data: {
          url: payload.url,
          txId: payload.txId || null,
          reference: payload.reference || null,
          category: payload.category,
        },
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
    const caps = this.getPlatformCapabilities();
    const localPrefs = this.getLocalPreferences(user.id);
    const localActive = caps.permission === 'granted' && this.isLocalEnabled(user.id);
    const platform: 'ios' | 'android' | 'desktop' = caps.isIOS
      ? 'ios'
      : caps.isAndroid
        ? 'android'
        : 'desktop';

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

      // If backend push didn't deliver (e.g., static preview / local PWA mode), trigger local Service Worker alert
      if (
        !backendDelivered &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
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

    if (
      !backendDelivered &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted' &&
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
}

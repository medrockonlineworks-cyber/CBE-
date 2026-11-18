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

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export class PushNotificationService {
  private static backendToken: string | null = null;
  private static backendTokenExpiresAt = 0;
  private static backendTokenUserId: string | null = null;
  private static sessionPromise: Promise<string | null> | null = null;
  private static swListenerAttached = false;

  public static getPlatformCapabilities(): PlatformPushCapabilities {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        isIOS: false,
        isAndroid: false,
        isStandalone: false,
        isInIframe: false,
        isSecureContext: false,
        isPushSupported: false,
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

      const data = await res.json();
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
      throw new Error('Unable to authenticate with notification server.');
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

    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error || 'Subscription failed.' };
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
        message: 'Push notifications require HTTPS (or localhost). Open this app over HTTPS.',
      };
    }

    if (!caps.isPushSupported) {
      return {
        ok: false,
        message: 'Web Push notifications are not supported in this browser.',
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
      const keyRes = await fetch('/api/notifications/vapid-public-key');
      const keyData = await keyRes.json();
      if (!keyRes.ok || !keyData?.publicKey) {
        return { ok: false, message: 'Server VAPID public key is unavailable.' };
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
        return { ok: false, message: saved.error || 'Could not register device with notification server.' };
      }

      return {
        ok: true,
        message: 'Push notifications enabled for Lock Screen and Notification Center.',
        deviceCount: saved.deviceCount,
        preferences: saved.preferences,
      };
    } catch (err) {
      console.error('[PushNotificationService] enableNotifications error:', err);
      return {
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : 'Unable to subscribe this device for push notifications.',
      };
    }
  }

  public static async disableNotifications(user: UserProfile): Promise<{
    ok: boolean;
    message?: string;
    deviceCount?: number;
  }> {
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

      const res = await this.authedFetch(user, '/api/notifications/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint }),
      });
      const data = await res.json();
      return {
        ok: Boolean(res.ok && data?.ok),
        deviceCount: data?.deviceCount ?? 0,
        message: 'Push notifications disabled for this device.',
      };
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

      await this.ensureBackendSession(user);
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
    let currentEndpoint = '';
    try {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration('/');
        const sub = await reg?.pushManager?.getSubscription();
        if (sub) currentEndpoint = sub.endpoint;
      }
    } catch {}

    const url = currentEndpoint
      ? `/api/notifications/status?endpoint=${encodeURIComponent(currentEndpoint)}`
      : '/api/notifications/status';

    const res = await this.authedFetch(user, url, { method: 'GET' });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        subscribed: false,
        hasAnySubscription: false,
        deviceCount: 0,
        devices: [],
        preferences: { ...DEFAULT_PREFERENCES, userId: user.id },
      };
    }
    return data as NotificationStatusResponse;
  }

  public static async updatePreferences(
    user: UserProfile,
    patch: Partial<Omit<NotificationPreferences, 'userId' | 'updatedAt'>>
  ): Promise<{ ok: boolean; preferences?: NotificationPreferences; error?: string }> {
    try {
      const res = await this.authedFetch(user, '/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      return {
        ok: Boolean(res.ok && data?.ok),
        preferences: data?.preferences,
        error: data?.error,
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to save preferences.',
      };
    }
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
      const data = await res.json();
      return {
        ok: Boolean(res.ok && data?.ok),
        message: data?.message,
        error: data?.error,
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to send test notification.',
      };
    }
  }

  public static async notifyVerifiedTransaction(
    tx: Transaction & { overrideType?: 'deposit' | 'withdrawal' },
    actorUser?: UserProfile | null
  ): Promise<void> {
    try {
      const storedUsersRaw = typeof window !== 'undefined' ? localStorage.getItem('tana_users') : null;
      const users: UserProfile[] = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
      const activeUserId =
        actorUser?.id ||
        (typeof window !== 'undefined' ? localStorage.getItem('tana_active_user_id') : null) ||
        tx.senderId ||
        tx.recipientId;

      const resolvedUser =
        actorUser ||
        users.find((u) => u.id === activeUserId) ||
        users[0];

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

      await this.authedFetch(resolvedUser, '/api/notifications/send-transaction', {
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
    } catch {
      // Non-blocking so offline mode still completes transactions cleanly
    }
  }

  public static async notifySecurityEvent(
    user: UserProfile,
    category: 'security_alert' | 'security_update' | 'account_update'
  ): Promise<void> {
    try {
      await this.authedFetch(user, '/api/notifications/security-event', {
        method: 'POST',
        body: JSON.stringify({ category }),
      });
    } catch {
      // Non-blocking
    }
  }
}

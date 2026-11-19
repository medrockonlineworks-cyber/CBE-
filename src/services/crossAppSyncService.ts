import { Capacitor } from '@capacitor/core';

/**
 * CrossAppSyncService
 * Keeps CBE Mobile Banking and installed sub-apps (Messages/SMS, Truecaller, Telebirr,
 * Dashen Bank, Telegram, Phone) synchronized across:
 * 1. Same-origin tabs/PWAs via BroadcastChannel + localStorage events
 * 2. Isolated iPhone (iOS) Home Screen PWAs via lightweight /api/sync/state server sync
 * Note: Native Android APK pinned shortcuts already share one WebView storage directly offline!
 */

const SYNCED_STORAGE_KEYS = [
  'bank_sms_messages_v6',
  'bank_sms_accounts_v6',
  'bank_sms_active_account',
  'truecaller_alerts_v1',
  'truecaller_accounts_v1',
  'dashen_bank_account_v1',
  'dashen_bank_transactions_v1',
  'telebirr_app_state_v2',
  'telegram_simulator_chats_v5',
  'tana_transactions',
  'tana_users',
] as const;

const META_TIMESTAMPS_KEY = 'cbe_crossapp_sync_ts_v1';
const BROADCAST_CHANNEL_NAME = 'cbe_cross_app_sync_v1';

interface SyncEntry {
  value: string;
  updatedAt: number;
}

class CrossAppSyncEngine {
  private initialized = false;
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private isApplyingRemote = false;
  private lastHashes: Record<string, string> = {};
  private channel: BroadcastChannel | null = null;

  private getTimestamps(): Record<string, number> {
    try {
      const raw = localStorage.getItem(META_TIMESTAMPS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveTimestamps(map: Record<string, number>): void {
    try {
      localStorage.setItem(META_TIMESTAMPS_KEY, JSON.stringify(map));
    } catch {}
  }

  private resolveSyncBucketKey(): string {
    try {
      const userId = localStorage.getItem('tana_active_user_id');
      if (userId) return `u_${userId}`;
    } catch {}
    return 'default_device';
  }

  private snapshotChangedKeys(): Record<string, SyncEntry> {
    const timestamps = this.getTimestamps();
    const changed: Record<string, SyncEntry> = {};
    const now = Date.now();
    let tsUpdated = false;

    for (const key of SYNCED_STORAGE_KEYS) {
      try {
        const val = localStorage.getItem(key);
        if (val === null) continue;
        const hash = `${val.length}:${val.slice(0, 64)}:${val.slice(-64)}`;
        if (this.lastHashes[key] !== hash) {
          this.lastHashes[key] = hash;
          timestamps[key] = now;
          tsUpdated = true;
          changed[key] = { value: val, updatedAt: now };
        }
      } catch {}
    }

    if (tsUpdated) {
      this.saveTimestamps(timestamps);
    }
    return changed;
  }

  private captureInitialHashes(): void {
    for (const key of SYNCED_STORAGE_KEYS) {
      try {
        const val = localStorage.getItem(key);
        if (val !== null) {
          this.lastHashes[key] = `${val.length}:${val.slice(0, 64)}:${val.slice(-64)}`;
        }
      } catch {}
    }
  }

  private applyRemoteEntries(entries: Record<string, SyncEntry>): boolean {
    if (!entries || typeof entries !== 'object') return false;
    const localTs = this.getTimestamps();
    let anyApplied = false;
    let smsUpdated = false;

    this.isApplyingRemote = true;
    try {
      for (const key of SYNCED_STORAGE_KEYS) {
        const remote = entries[key];
        if (!remote || typeof remote.value !== 'string') continue;
        const remoteUpdatedAt = Number(remote.updatedAt || 0);
        const currentLocalTs = Number(localTs[key] || 0);
        const currentVal = localStorage.getItem(key);

        if (remote.value !== currentVal && (remoteUpdatedAt > currentLocalTs || currentVal === null)) {
          localStorage.setItem(key, remote.value);
          localTs[key] = remoteUpdatedAt || Date.now();
          this.lastHashes[key] = `${remote.value.length}:${remote.value.slice(0, 64)}:${remote.value.slice(-64)}`;
          anyApplied = true;
          if (key.startsWith('bank_sms_')) smsUpdated = true;
        }
      }

      if (anyApplied) {
        this.saveTimestamps(localTs);
        window.dispatchEvent(new CustomEvent('cbe_crossapp_synced'));
        if (smsUpdated) {
          window.dispatchEvent(new CustomEvent('sms-created'));
        }
      }
    } catch {
      // Non-fatal
    } finally {
      this.isApplyingRemote = false;
    }

    return anyApplied;
  }

  public async pullNow(): Promise<void> {
    if (typeof window === 'undefined' || Capacitor.isNativePlatform()) return;
    try {
      const bucketKey = this.resolveSyncBucketKey();
      const res = await fetch(`/api/sync/state?key=${encodeURIComponent(bucketKey)}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (!ct.includes('application/json')) return;
      const data = await res.json();
      if (data?.ok && data?.entries) {
        this.applyRemoteEntries(data.entries);
      }
    } catch {
      // Offline or static host — silently ignore
    }
  }

  public schedulePush(): void {
    if (typeof window === 'undefined' || this.isApplyingRemote) return;
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      void this.pushChangedNow();
    }, 350);
  }

  public async pushChangedNow(): Promise<void> {
    if (typeof window === 'undefined' || this.isApplyingRemote) return;
    const changed = this.snapshotChangedKeys();
    if (Object.keys(changed).length === 0) return;

    try {
      this.channel?.postMessage({ type: 'SYNC_PATCH', entries: changed });
    } catch {}

    if (Capacitor.isNativePlatform()) return;

    try {
      const bucketKey = this.resolveSyncBucketKey();
      await fetch('/api/sync/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: bucketKey, entries: changed }),
      });
    } catch {
      // Offline — keep local state safely
    }
  }

  public start(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;
    this.captureInitialHashes();

    if ('BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.channel.onmessage = (ev) => {
          if (ev.data?.type === 'SYNC_PATCH' && ev.data?.entries) {
            this.applyRemoteEntries(ev.data.entries);
          }
        };
      } catch {
        this.channel = null;
      }
    }

    const triggerPush = () => this.schedulePush();
    window.addEventListener('sms-created', triggerPush);
    window.addEventListener('tana_data_updated', triggerPush);
    window.addEventListener('dashen_data_updated', triggerPush);
    window.addEventListener('telebirr_data_updated', triggerPush);
    window.addEventListener('truecaller_updated', triggerPush);
    window.addEventListener('storage', () => {
      this.captureInitialHashes();
      window.dispatchEvent(new CustomEvent('cbe_crossapp_synced'));
    });

    const onReturnForeground = () => {
      if (document.visibilityState === 'visible') {
        void this.pullNow();
      }
    };
    window.addEventListener('focus', () => void this.pullNow());
    document.addEventListener('visibilitychange', onReturnForeground);

    // Initial pull for standalone iOS Home Screen PWAs
    if (!Capacitor.isNativePlatform()) {
      void this.pullNow();
    }
  }
}

export const CrossAppSyncService = new CrossAppSyncEngine();

import { Capacitor } from '@capacitor/core';

/**
 * CrossAppSyncService
 * Keeps CBE Mobile Banking and installed standalone sub-apps (Messages/SMS, Truecaller,
 * Telebirr, Dashen Bank, Telegram, Phone) synchronized across:
 * 1. Same-origin tabs/PWAs via BroadcastChannel + localStorage events
 * 2. Isolated iPhone (iOS 16.4+) Home Screen PWAs via /api/sync/state bridge
 * Note: Native Android APK pinned shortcuts share one WebView storage directly offline.
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
const CUSTOM_BUCKET_KEY = 'cbe_crossapp_sync_bucket_v1';
const DEFAULT_SHARED_BUCKET = 'cbe_primary_sync';
const BROADCAST_CHANNEL_NAME = 'cbe_cross_app_sync_v1';

interface SyncEntry {
  value: string;
  updatedAt: number;
}

class CrossAppSyncEngine {
  private initialized = false;
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private isApplyingRemote = false;
  private lastHashes: Record<string, string> = {};
  private channel: BroadcastChannel | null = null;

  public getBucketKey(): string {
    try {
      const custom = localStorage.getItem(CUSTOM_BUCKET_KEY);
      if (custom && custom.trim().length >= 3) {
        return custom.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 64) || DEFAULT_SHARED_BUCKET;
      }
    } catch {}
    return DEFAULT_SHARED_BUCKET;
  }

  private isStandaloneSubAppPath(): boolean {
    if (typeof window === 'undefined') return false;
    const norm = window.location.pathname.toLowerCase().replace(/\/+$/, '');
    return ['/sms', '/truecaller', '/telebirr', '/dashen', '/telegram', '/phone'].includes(norm);
  }

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

  private computeHash(val: string): string {
    return `${val.length}:${val.slice(0, 80)}:${val.slice(-80)}`;
  }

  private snapshotChangedKeys(forceKeys?: readonly string[]): Record<string, SyncEntry> {
    const timestamps = this.getTimestamps();
    const changed: Record<string, SyncEntry> = {};
    const now = Date.now();
    let tsUpdated = false;
    const forceSet = forceKeys ? new Set(forceKeys) : null;

    for (const key of SYNCED_STORAGE_KEYS) {
      try {
        const val = localStorage.getItem(key);
        if (val === null) continue;
        const hash = this.computeHash(val);
        if (this.lastHashes[key] !== hash || (forceSet && forceSet.has(key))) {
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
          this.lastHashes[key] = this.computeHash(val);
        }
      } catch {}
    }
  }

  private applyRemoteEntries(entries: Record<string, SyncEntry>): boolean {
    if (!entries || typeof entries !== 'object') return false;
    const localTs = this.getTimestamps();
    let anyApplied = false;
    let smsUpdated = false;
    let truecallerUpdated = false;
    let dashenUpdated = false;
    let telebirrUpdated = false;
    let tanaUpdated = false;

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
          this.lastHashes[key] = this.computeHash(remote.value);
          anyApplied = true;
          if (key.startsWith('bank_sms_')) smsUpdated = true;
          if (key.startsWith('truecaller_')) truecallerUpdated = true;
          if (key.startsWith('dashen_')) dashenUpdated = true;
          if (key.startsWith('telebirr_')) telebirrUpdated = true;
          if (key.startsWith('tana_')) tanaUpdated = true;
        }
      }

      if (anyApplied) {
        this.saveTimestamps(localTs);
        window.dispatchEvent(new CustomEvent('cbe_crossapp_synced'));
        if (smsUpdated) {
          window.dispatchEvent(new CustomEvent('sms-updated'));
          window.dispatchEvent(new CustomEvent('sms-accounts-updated'));
        }
        if (truecallerUpdated) {
          window.dispatchEvent(new CustomEvent('truecaller_updated'));
        }
        if (dashenUpdated) {
          window.dispatchEvent(new CustomEvent('dashen_data_updated'));
        }
        if (telebirrUpdated) {
          window.dispatchEvent(new CustomEvent('telebirr_data_updated'));
        }
        if (tanaUpdated) {
          window.dispatchEvent(new CustomEvent('tana_data_updated'));
        }
      }
    } catch {
      // Non-fatal
    } finally {
      this.isApplyingRemote = false;
    }

    return anyApplied;
  }

  public async pullNow(): Promise<boolean> {
    if (typeof window === 'undefined' || Capacitor.isNativePlatform()) return false;
    try {
      const bucketKey = this.getBucketKey();
      const res = await fetch(`/api/sync/state?key=${encodeURIComponent(bucketKey)}`, {
        cache: 'no-store',
      });
      if (!res.ok) return false;
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (!ct.includes('application/json')) return false;
      const data = await res.json();
      if (data?.ok && data?.entries) {
        return this.applyRemoteEntries(data.entries);
      }
      return false;
    } catch {
      return false;
    }
  }

  public schedulePush(): void {
    if (typeof window === 'undefined' || this.isApplyingRemote) return;
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      void this.pushChangedNow();
    }, 250);
  }

  public async pushChangedNow(forceKeys?: readonly string[]): Promise<boolean> {
    if (typeof window === 'undefined' || this.isApplyingRemote) return false;
    const changed = this.snapshotChangedKeys(forceKeys);
    if (Object.keys(changed).length === 0) return false;

    try {
      this.channel?.postMessage({ type: 'SYNC_PATCH', entries: changed });
    } catch {}

    if (Capacitor.isNativePlatform()) return true;

    try {
      const bucketKey = this.getBucketKey();
      const res = await fetch('/api/sync/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: bucketKey, entries: changed }),
      });
      return res.ok;
    } catch {
      return false;
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

    // Listen to Service Worker push arrival broadcasts to pull synced messages instantly
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'CBE_SUBAPP_PUSH_RECEIVED') {
          void this.pullNow();
        }
      });
    }

    const triggerPush = () => this.schedulePush();
    window.addEventListener('sms-created', triggerPush);
    window.addEventListener('sms-updated', triggerPush);
    window.addEventListener('tana_data_updated', triggerPush);
    window.addEventListener('dashen_data_updated', triggerPush);
    window.addEventListener('telebirr_data_updated', triggerPush);
    window.addEventListener('truecaller_updated', triggerPush);
    window.addEventListener('storage', () => {
      this.captureInitialHashes();
      window.dispatchEvent(new CustomEvent('cbe_crossapp_synced'));
      window.dispatchEvent(new CustomEvent('sms-updated'));
    });

    const onReturnForeground = () => {
      if (document.visibilityState === 'visible') {
        void this.pullNow();
      }
    };
    window.addEventListener('focus', () => void this.pullNow());
    document.addEventListener('visibilitychange', onReturnForeground);

    if (!Capacitor.isNativePlatform()) {
      void this.pullNow();
      // Gently poll while a standalone sub-app is visibly open so messages appear without refresh
      if (this.isStandaloneSubAppPath()) {
        this.pollTimer = setInterval(() => {
          if (document.visibilityState === 'visible') {
            void this.pullNow();
          }
        }, 6000);
      }
    }
  }
}

export const CrossAppSyncService = new CrossAppSyncEngine();

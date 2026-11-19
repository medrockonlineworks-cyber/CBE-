import { Capacitor } from '@capacitor/core';

/**
 * CrossAppSyncService
 * Keeps CBE Mobile Banking and installed standalone sub-apps (Messages/SMS, Truecaller,
 * Telebirr, Dashen Bank, Telegram, Phone) synchronized across:
 * 1. Direct APNs/FCM Web Push Connection Keys (CBELINK-...) + Service Worker IndexedDB inbox
 *    (100% stateless across Vercel cold starts — works even when Messages is completely closed!)
 * 2. Same-origin tabs/PWAs via BroadcastChannel + localStorage events
 * 3. Server state sync via /api/sync/state bridge
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
const PAIRED_LINKS_STORAGE_KEY = 'cbe_paired_subapp_links_v1';
const DEFAULT_SHARED_BUCKET = 'cbe_primary_sync';
const BROADCAST_CHANNEL_NAME = 'cbe_cross_app_sync_v1';

const SW_INBOX_DB_NAME = 'cbe_subapp_inbox_db';
const SW_INBOX_STORE_NAME = 'incoming_items';
const SW_META_DB_NAME = 'cbe_subapp_meta_db';
const SW_META_STORE_NAME = 'meta';
const PERMANENT_PAIR_ID_PREFIX = 'cbe_permanent_pair_id_';
const PENDING_QUEUE_SEEN_TS_PREFIX = 'cbe_pending_queue_seen_ts_';

interface SyncEntry {
  value: string;
  updatedAt: number;
}

export interface DirectPushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PairedSubAppLink {
  subAppId: string;
  pairId?: string;
  bucketKey: string;
  bridgeOrigin?: string;
  subscription: DirectPushSubscription;
  pairedAt: number;
  label?: string;
}

const DEFAULT_PUBLIC_BRIDGE_ORIGIN = 'https://www.cbebank.online';

export interface CompactSmsPushRecord {
  id: string;
  transactionId?: string;
  accountNumber: string;
  accountName?: string;
  role?: 'sender' | 'receiver';
  bankName: string;
  sender: string;
  recipient?: string;
  type?: string;
  amount?: number;
  balance?: number;
  message: string;
  timestamp: string;
  forAllUsers?: boolean;
}

const VALID_SUB_APPS = new Set([
  'sms',
  'truecaller',
  'telebirr',
  'dashen',
  'telegram',
  'phone',
]);

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64url: string): string {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64url.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
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

  public setBucketKey(rawKey: string): string {
    const clean = String(rawKey || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, 64) || DEFAULT_SHARED_BUCKET;
    try {
      localStorage.setItem(CUSTOM_BUCKET_KEY, clean);
      window.dispatchEvent(new CustomEvent('cbe_paired_links_updated'));
    } catch {}
    return clean;
  }

  public getBridgeBaseUrl(subAppId?: string): string {
    if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
      return '';
    }
    const links = this.getPairedSubAppLinks(subAppId);
    const withOrigin = links.find((l) => l.bridgeOrigin && l.bridgeOrigin.startsWith('https://'));
    if (withOrigin?.bridgeOrigin) {
      return withOrigin.bridgeOrigin.replace(/\/+$/, '');
    }
    const allLinks = this.getPairedSubAppLinks();
    const anyOrigin = allLinks.find((l) => l.bridgeOrigin && l.bridgeOrigin.startsWith('https://'));
    if (anyOrigin?.bridgeOrigin) {
      return anyOrigin.bridgeOrigin.replace(/\/+$/, '');
    }
    return DEFAULT_PUBLIC_BRIDGE_ORIGIN;
  }

  private writeSwMeta(key: string, value: string): void {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return;
    try {
      const req = window.indexedDB.open(SW_META_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(SW_META_STORE_NAME)) {
          db.createObjectStore(SW_META_STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        try {
          if (!db.objectStoreNames.contains(SW_META_STORE_NAME)) {
            db.close();
            return;
          }
          const tx = db.transaction(SW_META_STORE_NAME, 'readwrite');
          tx.objectStore(SW_META_STORE_NAME).put({ key, value, updatedAt: Date.now() });
          tx.oncomplete = () => {
            try {
              db.close();
            } catch {}
          };
          tx.onerror = () => {
            try {
              db.close();
            } catch {}
          };
        } catch {
          try {
            db.close();
          } catch {}
        }
      };
    } catch {
      // Non-fatal IndexedDB mirror
    }
  }

  /**
   * Returns a stable, non-expiring permanent pairId for a standalone sub-app (e.g. pair_sms_xxxxxxxxxxxx).
   * Mirrored into IndexedDB (cbe_subapp_meta_db) so sw-push.js can auto-renew rotated FCM/APNs endpoints
   * under the exact same permanent key even while the app is closed.
   */
  public getOrCreatePermanentPairId(subAppId: string): string {
    const cleanSubApp = String(subAppId || 'sms').toLowerCase().replace(/[^a-z0-9]/g, '') || 'sms';
    const storageKey = `${PERMANENT_PAIR_ID_PREFIX}${cleanSubApp}`;
    let pairId = '';
    if (typeof window !== 'undefined') {
      try {
        const existing = localStorage.getItem(storageKey);
        if (existing && /^pair_[a-z0-9_-]{6,56}$/i.test(existing.trim())) {
          pairId = existing.trim().toLowerCase();
        }
      } catch {}
    }
    if (!pairId) {
      let rand = '';
      try {
        if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
          const bytes = new Uint8Array(8);
          crypto.getRandomValues(bytes);
          rand = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
        }
      } catch {}
      if (!rand) {
        rand = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      }
      pairId = `pair_${cleanSubApp}_${rand.slice(0, 16)}`.slice(0, 60);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, pairId);
        } catch {}
      }
    }
    this.writeSwMeta(`pair_${cleanSubApp}`, pairId);
    return pairId;
  }

  /**
   * Generates a compact Permanent Connection Key (CBELINK-<SUBAPP>-<token>) encoding
   * a permanent non-expiring pairId + fallback APNs/FCM push subscription + bridge origin.
   */
  public encodeConnectionKey(
    subAppId: string,
    subscription: PushSubscriptionJSON | DirectPushSubscription,
    pairIdOverride?: string
  ): string {
    const cleanSubApp = String(subAppId || 'sms').toLowerCase();
    const permanentPairId = pairIdOverride || this.getOrCreatePermanentPairId(cleanSubApp);
    const origin =
      typeof window !== 'undefined' &&
      window.location.origin.startsWith('https://') &&
      !window.location.hostname.includes('localhost')
        ? window.location.origin
        : DEFAULT_PUBLIC_BRIDGE_ORIGIN;
    const payload = {
      v: 2,
      a: cleanSubApp,
      i: permanentPairId,
      b: permanentPairId,
      o: origin,
      e: subscription.endpoint || '',
      p: subscription.keys?.p256dh || '',
      t: subscription.keys?.auth || '',
    };
    const encoded = toBase64Url(JSON.stringify(payload));
    return `CBELINK-${cleanSubApp.toUpperCase()}-${encoded}`;
  }

  /**
   * Parses a pasted Special Connection Key (CBELINK-...) back into a verified DirectPushSubscription.
   */
  public parseConnectionKey(rawInput: string): {
    ok: boolean;
    link?: PairedSubAppLink;
    error?: string;
  } {
    const trimmed = String(rawInput || '').trim().replace(/\s+/g, '');
    if (!trimmed) {
      return { ok: false, error: 'Please paste a Special Connection Key from your installed sub-app.' };
    }

    const match = /^CBELINK-([A-Z]+)-([A-Za-z0-9_-]+)$/i.exec(trimmed);
    if (!match) {
      return {
        ok: false,
        error: 'Invalid key format. Copy the CBELINK-... key directly from the installed Messages/sub-app.',
      };
    }

    try {
      const jsonStr = fromBase64Url(match[2]);
      const data = JSON.parse(jsonStr) as {
        v?: number;
        a?: string;
        i?: string;
        b?: string;
        o?: string;
        e?: string;
        p?: string;
        t?: string;
      };

      const subAppId = String(data.a || match[1]).toLowerCase();
      if (!VALID_SUB_APPS.has(subAppId)) {
        return { ok: false, error: 'Unrecognized sub-application in connection key.' };
      }
      if (
        typeof data.e !== 'string' ||
        !data.e.startsWith('https://') ||
        typeof data.p !== 'string' ||
        data.p.length < 16 ||
        typeof data.t !== 'string' ||
        data.t.length < 8
      ) {
        return { ok: false, error: 'Connection key is missing valid push credentials. Copy a fresh key from the sub-app.' };
      }

      const bridgeOrigin =
        typeof data.o === 'string' && data.o.startsWith('https://')
          ? data.o.replace(/\/+$/, '')
          : DEFAULT_PUBLIC_BRIDGE_ORIGIN;

      const resolvedPairId =
        (typeof data.i === 'string' && data.i.trim()) ||
        (typeof data.b === 'string' && data.b.trim()) ||
        this.getBucketKey();

      return {
        ok: true,
        link: {
          subAppId,
          pairId: resolvedPairId,
          bucketKey: resolvedPairId,
          bridgeOrigin,
          subscription: {
            endpoint: data.e,
            expirationTime: null,
            keys: {
              p256dh: data.p,
              auth: data.t,
            },
          },
          pairedAt: Date.now(),
        },
      };
    } catch {
      return {
        ok: false,
        error: 'Could not read connection key. Make sure you copied the complete CBELINK-... key.',
      };
    }
  }

  public getPairedSubAppLinks(subAppId?: string): PairedSubAppLink[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(PAIRED_LINKS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const valid = parsed.filter(
        (item: any) =>
          item &&
          typeof item.subAppId === 'string' &&
          item.subscription?.endpoint &&
          item.subscription?.keys?.p256dh &&
          item.subscription?.keys?.auth
      ) as PairedSubAppLink[];
      return subAppId ? valid.filter((item) => item.subAppId === subAppId) : valid;
    } catch {
      return [];
    }
  }

  public savePairedSubAppLink(link: PairedSubAppLink): PairedSubAppLink[] {
    // Replace previous links for this subAppId so stale/expired 410 tokens are never left behind
    const others = this.getPairedSubAppLinks().filter((item) => item.subAppId !== link.subAppId);
    const next = [...others, link];
    try {
      localStorage.setItem(PAIRED_LINKS_STORAGE_KEY, JSON.stringify(next));
      if (link.bucketKey && link.bucketKey !== this.getBucketKey()) {
        localStorage.setItem(CUSTOM_BUCKET_KEY, link.bucketKey);
      }
      window.dispatchEvent(new CustomEvent('cbe_paired_links_updated'));
    } catch {}
    return next;
  }

  /**
   * Silently updates the cached fallback subscription of an existing permanent Connection Key
   * when the server or Service Worker reports a freshly rotated FCM/APNs endpoint.
   * Never deletes or expires the user's paired link.
   */
  public refreshPairedLinkSubscription(
    subAppId: string,
    newSub: DirectPushSubscription | PushSubscriptionJSON
  ): void {
    if (
      !newSub?.endpoint ||
      typeof newSub.endpoint !== 'string' ||
      !newSub.keys?.p256dh ||
      !newSub.keys?.auth
    ) {
      return;
    }
    const current = this.getPairedSubAppLinks();
    let changed = false;
    const next = current.map((item) => {
      if (item.subAppId !== subAppId) return item;
      if (
        item.subscription.endpoint === newSub.endpoint &&
        item.subscription.keys.p256dh === newSub.keys?.p256dh &&
        item.subscription.keys.auth === newSub.keys?.auth
      ) {
        return item;
      }
      changed = true;
      return {
        ...item,
        subscription: {
          endpoint: newSub.endpoint!,
          expirationTime: typeof newSub.expirationTime === 'number' ? newSub.expirationTime : null,
          keys: {
            p256dh: newSub.keys!.p256dh!,
            auth: newSub.keys!.auth!,
          },
        },
      };
    });
    if (changed) {
      try {
        localStorage.setItem(PAIRED_LINKS_STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('cbe_paired_links_updated'));
      } catch {}
    }
  }

  /**
   * Retained for backward compatibility; permanent Connection Keys are NEVER pruned/expired on 410.
   */
  public pruneExpiredEndpoints(_endpoints: string[]): PairedSubAppLink[] {
    return this.getPairedSubAppLinks();
  }

  public removePairedSubAppLink(subAppId: string): PairedSubAppLink[] {
    const next = this.getPairedSubAppLinks().filter((item) => item.subAppId !== subAppId);
    try {
      localStorage.setItem(PAIRED_LINKS_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('cbe_paired_links_updated'));
    } catch {}
    return next;
  }

  /**
   * Appends a single incoming SMS record (delivered via APNs push payload or SW IndexedDB)
   * into localStorage bank_sms_messages_v6 without duplicating existing records.
   */
  public applyIncomingPushPayload(payload: any): boolean {
    if (typeof window === 'undefined' || !payload || typeof payload !== 'object') return false;
    const smsRec = payload.smsRecord as CompactSmsPushRecord | undefined;
    const isSmsView = payload.view === 'sms' || Boolean(smsRec);
    if (!isSmsView) return false;

    try {
      const STORAGE_KEY = 'bank_sms_messages_v6';
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed) ? parsed : [];

      const activeAcc =
        smsRec?.accountNumber ||
        localStorage.getItem('bank_sms_active_account') ||
        '1000419524747';
      const msgId =
        smsRec?.id ||
        payload.tag ||
        `sms-push-${payload.timestamp || Date.now()}`;
      const txId = smsRec?.transactionId || payload.reference;
      const msgText = smsRec?.message || payload.body || '';
      if (!msgText) return false;

      const alreadyExists = list.some(
        (m: any) =>
          m?.id === msgId ||
          (txId && m?.transactionId === txId && m?.message === msgText)
      );
      if (alreadyExists) return false;

      const newEntry = {
        id: msgId,
        transactionId: txId,
        accountNumber: activeAcc,
        accountName: smsRec?.accountName || 'Leykun Jemaneh Ylma',
        role: smsRec?.role || 'receiver',
        bankName: smsRec?.bankName || smsRec?.sender || payload.title || 'CBE',
        sender: smsRec?.sender || payload.title || 'CBE',
        recipient: smsRec?.recipient || 'Leykun Jemaneh Ylma',
        type: smsRec?.type || 'receive',
        amount: typeof smsRec?.amount === 'number' ? smsRec.amount : undefined,
        balance: typeof smsRec?.balance === 'number' ? smsRec.balance : undefined,
        message: msgText,
        timestamp: smsRec?.timestamp || new Date(payload.timestamp || Date.now()).toISOString(),
        read: false,
        forAllUsers: true,
      };

      this.isApplyingRemote = true;
      try {
        list.push(newEntry);
        const serialized = JSON.stringify(list);
        localStorage.setItem(STORAGE_KEY, serialized);
        this.lastHashes[STORAGE_KEY] = this.computeHash(serialized);
      } finally {
        this.isApplyingRemote = false;
      }

      window.dispatchEvent(new CustomEvent('sms-updated'));
      window.dispatchEvent(new CustomEvent('sms-accounts-updated'));
      window.dispatchEvent(new CustomEvent('cbe_crossapp_synced'));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Drains any incoming APNs push messages persisted by sw-push.js into IndexedDB
   * while this standalone Home Screen app was closed or backgrounded.
   */
  public async drainServiceWorkerInbox(): Promise<boolean> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return false;

    return new Promise<boolean>((resolve) => {
      try {
        const req = window.indexedDB.open(SW_INBOX_DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(SW_INBOX_STORE_NAME)) {
            db.createObjectStore(SW_INBOX_STORE_NAME, { keyPath: 'id' });
          }
        };
        req.onerror = () => resolve(false);
        req.onsuccess = () => {
          const db = req.result;
          try {
            if (!db.objectStoreNames.contains(SW_INBOX_STORE_NAME)) {
              db.close();
              resolve(false);
              return;
            }
            const tx = db.transaction(SW_INBOX_STORE_NAME, 'readwrite');
            const store = tx.objectStore(SW_INBOX_STORE_NAME);
            const getAllReq = store.getAll();
            getAllReq.onsuccess = () => {
              const items = Array.isArray(getAllReq.result) ? getAllReq.result : [];
              let appliedAny = false;
              items.sort((a: any, b: any) => Number(a?.receivedAt || 0) - Number(b?.receivedAt || 0));
              for (const item of items) {
                if (item?.payload && this.applyIncomingPushPayload(item.payload)) {
                  appliedAny = true;
                }
                if (item?.id) {
                  try {
                    store.delete(item.id);
                  } catch {}
                }
              }
              tx.oncomplete = () => {
                try {
                  db.close();
                } catch {}
                resolve(appliedAny);
              };
              tx.onerror = () => {
                try {
                  db.close();
                } catch {}
                resolve(appliedAny);
              };
            };
            getAllReq.onerror = () => {
              try {
                db.close();
              } catch {}
              resolve(false);
            };
          } catch {
            try {
              db.close();
            } catch {}
            resolve(false);
          }
        };
      } catch {
        resolve(false);
      }
    });
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

  private detectSubAppSlugFromPath(): string | null {
    if (typeof window === 'undefined') return null;
    const slug = window.location.pathname.toLowerCase().replace(/^\/+|\/+$/g, '').split('/')[0];
    return slug && VALID_SUB_APPS.has(slug) ? slug : null;
  }

  private drainPendingQueueEntry(entries: Record<string, SyncEntry>, pairId: string): boolean {
    const queueEntry = entries['cbe_pending_push_queue'];
    if (!queueEntry || typeof queueEntry.value !== 'string') return false;
    try {
      const items = JSON.parse(queueEntry.value);
      if (!Array.isArray(items) || items.length === 0) return false;
      const seenKey = `${PENDING_QUEUE_SEEN_TS_PREFIX}${pairId}`;
      const lastSeenTs = Number(localStorage.getItem(seenKey) || '0');
      let maxTs = lastSeenTs;
      let appliedAny = false;
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const ts = Number((item as any).timestamp || 0);
        if (ts > lastSeenTs || lastSeenTs === 0) {
          if (this.applyIncomingPushPayload(item)) {
            appliedAny = true;
          }
          if (ts > maxTs) maxTs = ts;
        }
      }
      if (maxTs > lastSeenTs) {
        try {
          localStorage.setItem(seenKey, String(maxTs));
        } catch {}
      }
      return appliedAny;
    } catch {
      return false;
    }
  }

  public async pullNow(): Promise<boolean> {
    if (typeof window === 'undefined' || Capacitor.isNativePlatform()) return false;
    let appliedAny = await this.drainServiceWorkerInbox();

    const keysToPull = new Set<string>([this.getBucketKey()]);
    const subSlug = this.detectSubAppSlugFromPath();
    let permanentPairId = '';
    if (subSlug) {
      permanentPairId = this.getOrCreatePermanentPairId(subSlug);
      keysToPull.add(permanentPairId);
    }

    for (const key of keysToPull) {
      try {
        const res = await fetch(`/api/sync/state?key=${encodeURIComponent(key)}`, {
          cache: 'no-store',
        });
        if (!res.ok) continue;
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (!ct.includes('application/json')) continue;
        const data = await res.json();
        if (data?.ok && data?.entries) {
          if (this.applyRemoteEntries(data.entries)) {
            appliedAny = true;
          }
          if (this.drainPendingQueueEntry(data.entries, permanentPairId || key)) {
            appliedAny = true;
          }
        }
      } catch {
        // Non-fatal
      }
    }

    return appliedAny;
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

    // When running inside a native Android APK with paired standalone sub-apps, still push sync state to bridgeOrigin
    const pairedLinks = this.getPairedSubAppLinks();
    if (Capacitor.isNativePlatform() && pairedLinks.length === 0) return true;

    const targetKeys = new Set<string>([this.getBucketKey()]);
    for (const link of pairedLinks) {
      if (link.pairId) targetKeys.add(link.pairId);
      if (link.bucketKey) targetKeys.add(link.bucketKey);
    }
    const subSlug = this.detectSubAppSlugFromPath();
    if (subSlug) {
      targetKeys.add(this.getOrCreatePermanentPairId(subSlug));
    }

    let anyOk = false;
    const baseUrl = this.getBridgeBaseUrl();
    await Promise.all(
      Array.from(targetKeys).map(async (bucketKey) => {
        try {
          const res = await fetch(`${baseUrl}/api/sync/state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: bucketKey, entries: changed }),
          });
          if (res.ok) anyOk = true;
        } catch {
          // Non-fatal
        }
      })
    );
    return anyOk;
  }

  public start(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;
    this.captureInitialHashes();

    // Auto-register the dedicated scoped push Service Worker when visiting any standalone sub-app route
    // so Android Chrome offers full standalone WebAPK installation ("Install app") immediately
    if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator && this.isStandaloneSubAppPath()) {
      const slug = window.location.pathname.toLowerCase().replace(/^\/+|\/+$/g, '').split('/')[0];
      if (slug && VALID_SUB_APPS.has(slug)) {
        void navigator.serviceWorker
          .register(`/${slug}/sw-push.js`, { scope: `/${slug}/` })
          .catch(() => {});
      }
    }

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

    // Apply incoming APNs push payloads immediately & drain SW IndexedDB inbox
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'CBE_SUBAPP_PUSH_RECEIVED') {
          if (event.data.payload) {
            this.applyIncomingPushPayload(event.data.payload);
          }
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

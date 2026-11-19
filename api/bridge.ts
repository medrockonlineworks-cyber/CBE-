import fs from 'node:fs';
import path from 'node:path';
import { generateVAPIDKeys, sendNotification, setVapidDetails } from 'web-push';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
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

interface BridgeStoreData {
  syncBuckets: Record<string, SyncBucket>;
  subAppSubscriptions: Record<string, SubAppPushSubscriptionRecord[]>;
  vapid?: {
    publicKey: string;
    privateKey: string;
    subject: string;
  };
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
        vapid: parsed.vapid,
      };
      return memoryStore;
    }
  } catch {
    // Fallback
  }
  memoryStore = { syncBuckets: {}, subAppSubscriptions: {} };
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
      const list = [...(store.subAppSubscriptions[bucketKey] || [])].filter(
        (item) => !(item.subAppId === subAppId && item.endpoint === sub.endpoint)
      );
      list.push({
        subAppId,
        endpoint: sub.endpoint,
        expirationTime: sub.expirationTime,
        keys: sub.keys,
        platform,
        updatedAt: Date.now(),
      });
      store.subAppSubscriptions[bucketKey] = list.slice(-MAX_SUBS_PER_BUCKET);
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
      const store = await loadStore(true);
      const list = store.subAppSubscriptions[bucketKey] || [];
      const counts: Record<string, number> = {};
      for (const id of VALID_SUB_APPS) {
        counts[id] = list.filter((item) => item.subAppId === id).length;
      }
      const vapid = await resolveVapidPair();
      res.status(200).json({
        ok: true,
        bucketKey,
        counts,
        vapidSource: vapid.source,
        persistentStore: Boolean(getKvConfig()),
      });
      return;
    }

    // 6. POST Push to Sub-App (supports stateless directSubscriptions from Special Connection Key + server-stored subs!)
    if (method === 'POST' && pathname === '/api/subapp/push') {
      const bucketKey = sanitizeBucketKey(body.bucketKey || body.key);
      const subAppId = String(body.subAppId || '').trim().toLowerCase();
      if (!VALID_SUB_APPS.has(subAppId)) {
        res.status(400).json({ ok: false, error: 'Invalid subAppId.' });
        return;
      }

      const store = await loadStore(true);
      const storedAll = store.subAppSubscriptions[bucketKey] || [];
      const storedTargets = storedAll.filter((item) => item.subAppId === subAppId);
      const directTargets = extractValidSubscriptions(body.directSubscriptions);

      const mergedByEndpoint = new Map<
        string,
        { endpoint: string; expirationTime: number | null; keys: { p256dh: string; auth: string } }
      >();
      for (const t of storedTargets) {
        mergedByEndpoint.set(t.endpoint, {
          endpoint: t.endpoint,
          expirationTime: t.expirationTime,
          keys: t.keys,
        });
      }
      for (const t of directTargets) {
        mergedByEndpoint.set(t.endpoint, t);
      }

      const targets = Array.from(mergedByEndpoint.values());
      if (targets.length === 0) {
        res.status(200).json({
          ok: true,
          delivered: 0,
          total: 0,
          failed: 0,
          reason: 'no_subapp_subscription',
        });
        return;
      }

      const vapid = await resolveVapidPair();
      setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

      const smsRecord =
        body.smsRecord && typeof body.smsRecord === 'object' ? body.smsRecord : undefined;

      const payloadObj: Record<string, unknown> = {
        appName: String(body.appName || subAppId),
        title: String(body.title || 'CBE').slice(0, 120),
        body: String(body.body || 'You have a new message.').slice(0, 260),
        icon: typeof body.icon === 'string' ? body.icon : `/icons/notif-${subAppId}.png`,
        badge: typeof body.badge === 'string' ? body.badge : `/icons/notif-${subAppId}.png`,
        url: typeof body.url === 'string' ? body.url : `/${subAppId}/`,
        tag: typeof body.tag === 'string' ? body.tag : `cbe-subapp-${subAppId}-${Date.now()}`,
        reference: typeof body.reference === 'string' ? body.reference : undefined,
        category: typeof body.category === 'string' ? body.category : 'subapp',
        view: subAppId,
        timestamp: Date.now(),
      };
      if (smsRecord) {
        payloadObj.smsRecord = smsRecord;
      }
      const payloadJson = JSON.stringify(payloadObj);

      let delivered = 0;
      let failed = 0;
      const expiredEndpoints = new Set<string>();
      const errorCodes: number[] = [];

      await Promise.all(
        targets.map(async (target) => {
          try {
            await sendNotification(target, payloadJson, { TTL: 180, urgency: 'high' });
            delivered += 1;
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

      if (expiredEndpoints.size > 0 && storedTargets.length > 0) {
        store.subAppSubscriptions[bucketKey] = storedAll.filter(
          (item) => !(item.subAppId === subAppId && expiredEndpoints.has(item.endpoint))
        );
        await saveStore(store);
      }

      res.status(200).json({
        ok: true,
        delivered,
        total: targets.length,
        failed,
        errorCodes,
        expiredEndpoints: Array.from(expiredEndpoints),
        vapidSource: vapid.source,
      });
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

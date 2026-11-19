import fs from 'node:fs';
import path from 'node:path';
import { generateVAPIDKeys, sendNotification, setVapidDetails } from 'web-push';

export interface SyncEntry {
  value: string;
  updatedAt: number;
}

export type SyncBucket = Record<string, SyncEntry>;

export interface SubAppPushSubscriptionRecord {
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

const IS_VERCEL = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const LOCAL_STORE_FILE = IS_VERCEL
  ? '/tmp/cbe-subapp-bridge.json'
  : path.resolve(process.cwd(), 'data', 'cbe-subapp-bridge.json');
const EXPRESS_VAPID_FILE = path.resolve(process.cwd(), 'data', 'vapid-keys.json');

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
    // Fallback to clean store
  }
  memoryStore = {
    syncBuckets: {},
    subAppSubscriptions: {},
  };
  return memoryStore;
}

function writeLocalStore(store: BridgeStoreData): void {
  memoryStore = store;
  try {
    const dir = path.dirname(LOCAL_STORE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(store), 'utf-8');
  } catch {
    // Non-fatal in read-only runtimes
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
  source: 'env' | 'kv' | 'disk' | 'ephemeral';
}> {
  const envPub = cleanEnvVal(process.env.VAPID_PUBLIC_KEY);
  const envPriv = cleanEnvVal(process.env.VAPID_PRIVATE_KEY);
  const envSubj = cleanEnvVal(process.env.VAPID_SUBJECT) || 'mailto:notifications@cbemobile.app';

  if (isValidVapidPublic(envPub) && isValidVapidPrivate(envPriv)) {
    return { publicKey: envPub, privateKey: envPriv, subject: envSubj, source: 'env' };
  }

  // On Express/Node server, reuse data/vapid-keys.json if it exists
  if (!IS_VERCEL && fs.existsSync(EXPRESS_VAPID_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(EXPRESS_VAPID_FILE, 'utf-8')) as {
        publicKey?: string;
        privateKey?: string;
        subject?: string;
      };
      if (raw.publicKey && raw.privateKey && isValidVapidPublic(raw.publicKey) && isValidVapidPrivate(raw.privateKey)) {
        return {
          publicKey: raw.publicKey,
          privateKey: raw.privateKey,
          subject: raw.subject || envSubj,
          source: 'disk',
        };
      }
    } catch {
      // Continue
    }
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
      source: getKvConfig() ? 'kv' : IS_VERCEL ? 'ephemeral' : 'disk',
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
    source: getKvConfig() ? 'kv' : IS_VERCEL ? 'ephemeral' : 'disk',
  };
}

export function sanitizeBucketKey(raw: unknown): string {
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

export interface BridgeResponse {
  status: number;
  body: Record<string, unknown>;
}

export async function handleBridgeAction(params: {
  pathname: string;
  method: string;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
}): Promise<BridgeResponse> {
  const pathname = (params.pathname || '').split('?')[0].replace(/\/+$/, '');
  const method = (params.method || 'GET').toUpperCase();
  const query = params.query || {};
  const body = params.body && typeof params.body === 'object' ? params.body : {};

  // 1. GET VAPID Public Key
  if (
    method === 'GET' &&
    (pathname === '/api/subapp/vapid-key' || pathname === '/api/notifications/vapid-public-key')
  ) {
    const vapid = await resolveVapidPair();
    return {
      status: 200,
      body: {
        ok: true,
        publicKey: vapid.publicKey,
        vapidSource: vapid.source,
        persistentStore: Boolean(getKvConfig() || !IS_VERCEL),
      },
    };
  }

  // 2. GET Sync State
  if (method === 'GET' && pathname === '/api/sync/state') {
    const bucketKey = sanitizeBucketKey(query.key);
    const store = await loadStore(true);
    const bucket = store.syncBuckets[bucketKey] || {};
    return {
      status: 200,
      body: {
        ok: true,
        key: bucketKey,
        entries: bucket,
        serverTime: Date.now(),
      },
    };
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

    return {
      status: 200,
      body: {
        ok: true,
        key: bucketKey,
        entries: bucket,
        serverTime: Date.now(),
      },
    };
  }

  // 4. POST Subscribe a standalone sub-app (e.g. Messages /sms/) to Web Push (APNs / FCM)
  if (method === 'POST' && pathname === '/api/subapp/subscribe') {
    const bucketKey = sanitizeBucketKey(body.bucketKey || body.key);
    const subAppId = String(body.subAppId || '').trim().toLowerCase();
    if (!VALID_SUB_APPS.has(subAppId)) {
      return { status: 400, body: { ok: false, error: 'Invalid subAppId.' } };
    }

    const sub = body.subscription as
      | {
          endpoint?: string;
          expirationTime?: number | null;
          keys?: { p256dh?: string; auth?: string };
        }
      | undefined;

    if (!sub || !isValidEndpoint(sub.endpoint)) {
      return { status: 400, body: { ok: false, error: 'Valid HTTPS push subscription endpoint is required.' } };
    }
    const p256dh = sub.keys?.p256dh;
    const auth = sub.keys?.auth;
    if (typeof p256dh !== 'string' || p256dh.length < 16 || typeof auth !== 'string' || auth.length < 8) {
      return { status: 400, body: { ok: false, error: 'Valid push subscription keys are required.' } };
    }

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
      expirationTime:
        typeof sub.expirationTime === 'number' || sub.expirationTime === null
          ? sub.expirationTime
          : null,
      keys: { p256dh, auth },
      platform,
      updatedAt: Date.now(),
    });

    store.subAppSubscriptions[bucketKey] = list.slice(-MAX_SUBS_PER_BUCKET);
    await saveStore(store);

    const countForSubApp = store.subAppSubscriptions[bucketKey].filter(
      (item) => item.subAppId === subAppId
    ).length;

    return {
      status: 200,
      body: {
        ok: true,
        bucketKey,
        subAppId,
        deviceCount: countForSubApp,
      },
    };
  }

  // 5. GET Sub-App Subscription Status
  if (method === 'GET' && pathname === '/api/subapp/status') {
    const bucketKey = sanitizeBucketKey(query.bucketKey || query.key);
    const store = await loadStore(true);
    const list = store.subAppSubscriptions[bucketKey] || [];
    const counts: Record<string, number> = {};
    for (const id of VALID_SUB_APPS) {
      counts[id] = list.filter((item) => item.subAppId === id).length;
    }
    return {
      status: 200,
      body: {
        ok: true,
        bucketKey,
        counts,
        persistentStore: Boolean(getKvConfig() || !IS_VERCEL),
      },
    };
  }

  // 6. POST Send Real Web Push (APNs / FCM) to a Sub-App's Standalone Installed App
  if (method === 'POST' && pathname === '/api/subapp/push') {
    const bucketKey = sanitizeBucketKey(body.bucketKey || body.key);
    const subAppId = String(body.subAppId || '').trim().toLowerCase();
    if (!VALID_SUB_APPS.has(subAppId)) {
      return { status: 400, body: { ok: false, error: 'Invalid subAppId.' } };
    }

    const store = await loadStore(true);
    const allSubs = store.subAppSubscriptions[bucketKey] || [];
    const storedTargets = allSubs.filter((item) => item.subAppId === subAppId);

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
    if (Array.isArray(body.directSubscriptions)) {
      for (const rawItem of body.directSubscriptions.slice(0, 12)) {
        if (!rawItem || typeof rawItem !== 'object') continue;
        const item = rawItem as {
          endpoint?: unknown;
          expirationTime?: unknown;
          keys?: { p256dh?: unknown; auth?: unknown };
        };
        if (
          isValidEndpoint(item.endpoint) &&
          typeof item.keys?.p256dh === 'string' &&
          item.keys.p256dh.length >= 16 &&
          typeof item.keys?.auth === 'string' &&
          item.keys.auth.length >= 8
        ) {
          mergedByEndpoint.set(item.endpoint, {
            endpoint: item.endpoint,
            expirationTime: typeof item.expirationTime === 'number' ? item.expirationTime : null,
            keys: { p256dh: item.keys.p256dh, auth: item.keys.auth },
          });
        }
      }
    }

    const targets = Array.from(mergedByEndpoint.values());
    if (targets.length === 0) {
      return {
        status: 200,
        body: {
          ok: true,
          delivered: 0,
          total: 0,
          failed: 0,
          reason: 'no_subapp_subscription',
        },
      };
    }

    const vapid = await resolveVapidPair();
    setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

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
    if (body.smsRecord && typeof body.smsRecord === 'object') {
      payloadObj.smsRecord = body.smsRecord;
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
      store.subAppSubscriptions[bucketKey] = allSubs.filter(
        (item) => !(item.subAppId === subAppId && expiredEndpoints.has(item.endpoint))
      );
      await saveStore(store);
    }

    return {
      status: 200,
      body: {
        ok: true,
        delivered,
        total: targets.length,
        failed,
        errorCodes,
        expiredEndpoints: Array.from(expiredEndpoints),
        vapidSource: vapid.source,
      },
    };
  }

  return {
    status: 404,
    body: { ok: false, error: `Unknown bridge route: ${pathname}` },
  };
}

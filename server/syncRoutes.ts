import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

interface SyncEntry {
  value: string;
  updatedAt: number;
}

type SyncBucket = Record<string, SyncEntry>;

const SYNC_STORE_FILE = path.resolve(process.cwd(), '.cbe-crossapp-sync.json');
const MAX_KEYS_PER_BUCKET = 25;
const MAX_BUCKETS = 50;

let storeCache: Record<string, SyncBucket> | null = null;

function sanitizeKey(raw: unknown): string {
  const str = String(raw || 'default').trim().toLowerCase();
  const clean = str.replace(/[^a-z0-9_-]/g, '').slice(0, 64);
  return clean || 'default';
}

function loadStore(): Record<string, SyncBucket> {
  if (storeCache) return storeCache;
  try {
    if (fs.existsSync(SYNC_STORE_FILE)) {
      const raw = fs.readFileSync(SYNC_STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        storeCache = parsed as Record<string, SyncBucket>;
        return storeCache;
      }
    }
  } catch {
    // Fallback to clean memory store
  }
  storeCache = {};
  return storeCache;
}

function saveStore(store: Record<string, SyncBucket>): void {
  storeCache = store;
  try {
    const keys = Object.keys(store);
    if (keys.length > MAX_BUCKETS) {
      for (const oldKey of keys.slice(0, keys.length - MAX_BUCKETS)) {
        delete store[oldKey];
      }
    }
    fs.writeFileSync(SYNC_STORE_FILE, JSON.stringify(store), 'utf-8');
  } catch {
    // Non-fatal in read-only runtimes; memory cache still works
  }
}

export function createSyncRouter(): express.Router {
  const router = express.Router();

  router.get('/api/sync/state', (req, res) => {
    const bucketKey = sanitizeKey(req.query.key);
    const store = loadStore();
    const bucket = store[bucketKey] || {};
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      key: bucketKey,
      entries: bucket,
      serverTime: Date.now(),
    });
  });

  router.post('/api/sync/state', (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const bucketKey = sanitizeKey(body.key);
    const incomingEntries =
      body.entries && typeof body.entries === 'object' ? body.entries : {};

    const store = loadStore();
    const bucket: SyncBucket = { ...(store[bucketKey] || {}) };

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

    store[bucketKey] = bucket;
    saveStore(store);

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      key: bucketKey,
      entries: bucket,
      serverTime: Date.now(),
    });
  });

  return router;
}

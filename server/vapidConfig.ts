import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { generateVAPIDKeys, setVapidDetails } from 'web-push';

interface PersistedVapidKeys {
  publicKey: string;
  privateKey: string;
  subject: string;
  createdAt: string;
}

interface PersistedSecrets {
  authTokenSecret: string;
  adminSecret: string;
  createdAt: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const VAPID_FILE = path.join(DATA_DIR, 'vapid-keys.json');
const SECRETS_FILE = path.join(DATA_DIR, 'server-secrets.json');

let initialized = false;
let cachedVapidPublic = '';
let cachedVapidPrivate = '';
let cachedVapidSubject = 'mailto:notifications@cbemobile.app';
let cachedAuthSecret = '';
let cachedAdminSecret = '';

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
}

function writeJsonSecure(filePath: string, data: unknown): void {
  ensureDataDir();
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmpPath, filePath);
}

function cleanEnvVal(val?: string): string {
  if (!val) return '';
  let trimmed = val.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function isPlaceholder(val?: string): boolean {
  const trimmed = cleanEnvVal(val);
  return !trimmed || trimmed.startsWith('MY_') || trimmed.startsWith('YOUR_') || trimmed.startsWith('REPLACE_');
}

function isValidVapidPublicKey(key: string): boolean {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(key)) return false;
  try {
    const buf = Buffer.from(key, 'base64url');
    return buf.length === 65 && buf[0] === 0x04;
  } catch {
    return false;
  }
}

function isValidVapidPrivateKey(key: string): boolean {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(key)) return false;
  try {
    const buf = Buffer.from(key, 'base64url');
    return buf.length === 32;
  } catch {
    return false;
  }
}

function normalizeVapidSubject(raw?: string): string {
  const cleaned = cleanEnvVal(raw);
  if (!cleaned || isPlaceholder(cleaned)) return 'mailto:notifications@cbemobile.app';
  if (cleaned.startsWith('mailto:') && cleaned.includes('@')) return cleaned;
  if (cleaned.startsWith('https://')) {
    try {
      const parsed = new URL(cleaned);
      if (parsed.protocol === 'https:' && parsed.hostname && parsed.hostname !== 'localhost') {
        return cleaned;
      }
    } catch {
      // Fallback below
    }
  }
  console.warn('[WebPush] Invalid VAPID_SUBJECT format; falling back to mailto:notifications@cbemobile.app');
  return 'mailto:notifications@cbemobile.app';
}

export function initVapidAndSecrets(): void {
  if (initialized) return;
  ensureDataDir();

  // 1. Load or generate VAPID keys
  const envPublic = cleanEnvVal(process.env.VAPID_PUBLIC_KEY);
  const envPrivate = cleanEnvVal(process.env.VAPID_PRIVATE_KEY);
  const envSubject = process.env.VAPID_SUBJECT;

  cachedVapidSubject = normalizeVapidSubject(envSubject);

  if (
    !isPlaceholder(envPublic) &&
    !isPlaceholder(envPrivate) &&
    isValidVapidPublicKey(envPublic) &&
    isValidVapidPrivateKey(envPrivate)
  ) {
    cachedVapidPublic = envPublic;
    cachedVapidPrivate = envPrivate;
  } else {
    if (!isPlaceholder(envPublic) || !isPlaceholder(envPrivate)) {
      console.warn('[WebPush] Environment VAPID keys are invalid/malformed; falling back to stored/generated VAPID keys.');
    }
    if (fs.existsSync(VAPID_FILE)) {
      try {
        const raw = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8')) as PersistedVapidKeys;
        const pub = cleanEnvVal(raw.publicKey);
        const priv = cleanEnvVal(raw.privateKey);
        if (isValidVapidPublicKey(pub) && isValidVapidPrivateKey(priv)) {
          cachedVapidPublic = pub;
          cachedVapidPrivate = priv;
          if (raw.subject && isPlaceholder(envSubject)) {
            cachedVapidSubject = normalizeVapidSubject(raw.subject);
          }
        }
      } catch {
        // Regenerate below if corrupted
      }
    }
  }

  if (!cachedVapidPublic || !cachedVapidPrivate) {
    const generated = generateVAPIDKeys();
    cachedVapidPublic = generated.publicKey;
    cachedVapidPrivate = generated.privateKey;
    const record: PersistedVapidKeys = {
      publicKey: cachedVapidPublic,
      privateKey: cachedVapidPrivate,
      subject: cachedVapidSubject,
      createdAt: new Date().toISOString(),
    };
    writeJsonSecure(VAPID_FILE, record);
    console.log('[WebPush] Generated and persisted new VAPID keypair in data/vapid-keys.json');
  }

  try {
    setVapidDetails(cachedVapidSubject, cachedVapidPublic, cachedVapidPrivate);
  } catch (err) {
    console.warn('[WebPush] Failed to apply VAPID details, regenerating keypair:', err);
    const generated = generateVAPIDKeys();
    cachedVapidPublic = generated.publicKey;
    cachedVapidPrivate = generated.privateKey;
    cachedVapidSubject = 'mailto:notifications@cbemobile.app';
    writeJsonSecure(VAPID_FILE, {
      publicKey: cachedVapidPublic,
      privateKey: cachedVapidPrivate,
      subject: cachedVapidSubject,
      createdAt: new Date().toISOString(),
    });
    setVapidDetails(cachedVapidSubject, cachedVapidPublic, cachedVapidPrivate);
  }

  // 2. Load or generate server-side HMAC & admin secrets
  const envAuthSecret = process.env.AUTH_TOKEN_SECRET;
  const envAdminSecret = process.env.NOTIFICATION_ADMIN_SECRET;

  let persistedSecrets: PersistedSecrets | null = null;
  if (fs.existsSync(SECRETS_FILE)) {
    try {
      persistedSecrets = JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf8')) as PersistedSecrets;
    } catch {
      persistedSecrets = null;
    }
  }

  cachedAuthSecret = !isPlaceholder(envAuthSecret)
    ? envAuthSecret!.trim()
    : persistedSecrets?.authTokenSecret || crypto.randomBytes(32).toString('hex');

  cachedAdminSecret = !isPlaceholder(envAdminSecret)
    ? envAdminSecret!.trim()
    : persistedSecrets?.adminSecret || crypto.randomBytes(32).toString('hex');

  if (
    !persistedSecrets ||
    persistedSecrets.authTokenSecret !== cachedAuthSecret ||
    persistedSecrets.adminSecret !== cachedAdminSecret
  ) {
    writeJsonSecure(SECRETS_FILE, {
      authTokenSecret: cachedAuthSecret,
      adminSecret: cachedAdminSecret,
      createdAt: persistedSecrets?.createdAt || new Date().toISOString(),
    });
  }

  initialized = true;
}

export function getPublicVapidKey(): string {
  initVapidAndSecrets();
  return cachedVapidPublic;
}

export function getAuthTokenSecret(): string {
  initVapidAndSecrets();
  return cachedAuthSecret;
}

export function getNotificationAdminSecret(): string {
  initVapidAndSecrets();
  return cachedAdminSecret;
}

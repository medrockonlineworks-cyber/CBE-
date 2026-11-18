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

function isPlaceholder(val?: string): boolean {
  if (!val) return true;
  const trimmed = val.trim();
  return !trimmed || trimmed.startsWith('MY_') || trimmed.startsWith('YOUR_') || trimmed.startsWith('REPLACE_');
}

export function initVapidAndSecrets(): void {
  if (initialized) return;
  ensureDataDir();

  // 1. Load or generate VAPID keys
  const envPublic = process.env.VAPID_PUBLIC_KEY;
  const envPrivate = process.env.VAPID_PRIVATE_KEY;
  const envSubject = process.env.VAPID_SUBJECT;

  if (!isPlaceholder(envSubject)) {
    cachedVapidSubject = envSubject!.trim();
  }

  if (!isPlaceholder(envPublic) && !isPlaceholder(envPrivate)) {
    cachedVapidPublic = envPublic!.trim();
    cachedVapidPrivate = envPrivate!.trim();
  } else if (fs.existsSync(VAPID_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8')) as PersistedVapidKeys;
      if (raw.publicKey && raw.privateKey) {
        cachedVapidPublic = raw.publicKey;
        cachedVapidPrivate = raw.privateKey;
        if (raw.subject && isPlaceholder(envSubject)) {
          cachedVapidSubject = raw.subject;
        }
      }
    } catch {
      // Regenerate below if corrupted
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

  setVapidDetails(cachedVapidSubject, cachedVapidPublic, cachedVapidPrivate);

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

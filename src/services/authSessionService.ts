/**
 * AuthSessionService (100% On-Device Local Storage & IndexedDB Vault)
 * - Runs completely offline/on-device (Web, PWA, Android APK, iOS IPA) without external servers or .env variables.
 * - Holds short-lived HMAC-SHA256 JWT access tokens strictly in memory (never in localStorage).
 * - Persists PBKDF2-salted PIN/password hashes & device session records in IndexedDB (`cbe_secure_auth_vault_v1`).
 * - Default login PIN: 852121 (overridable via in-app Security Settings).
 * - Encrypts rotating refresh tokens via AES-256-GCM using either:
 *   1. Hardware-sealed biometric DEK (iOS Keychain .biometryCurrentSet / Android Keystore CryptoObject), OR
 *   2. Non-extractable WebCrypto CryptoKey persisted in IndexedDB (browser/PWA).
 * - Enforces refresh-token rotation & reuse/replay detection (`REUSE_DETECTED`).
 */

export const DEFAULT_LOGIN_PIN = '852121';
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface ActiveDeviceSession {
  sessionId: string;
  deviceLabel: string;
  biometricEnabled: boolean;
  biometricMethod: 'faceid' | 'fingerprint' | 'none';
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface AuthApiResult {
  ok: boolean;
  errorCode?: string;
  message?: string;
  userId?: string;
  email?: string;
  sessionId?: string;
  accessToken?: string;
  expiresAt?: number;
  refreshToken?: string;
}

interface LocalUserCredentialRecord {
  userId: string;
  email: string;
  pinHash?: string;
  passwordHash?: string;
  updatedAt: number;
}

interface LocalSessionRecord {
  sessionId: string;
  familyId: string;
  userId: string;
  email: string;
  deviceId: string;
  deviceLabel: string;
  biometricEnabled: boolean;
  biometricMethod: 'faceid' | 'fingerprint' | 'none';
  refreshTokenHash: string;
  previousTokenHash: string | null;
  createdAt: number;
  lastUsedAt: number;
  expiresAt: number;
  revokedAt: number | null;
  revokeReason: string | null;
}

interface AccessTokenClaims {
  sub: string;
  email: string;
  sid: string;
  did: string;
  method: string;
  iat: number;
  exp: number;
}

const DEVICE_ID_STORAGE_KEY = 'cbe_device_uid_v1';
const IDB_NAME = 'cbe_secure_auth_vault_v1';
const IDB_VERSION = 2;
const IDB_KEY_STORE = 'crypto_keys';
const IDB_TOKEN_STORE = 'sealed_tokens';
const IDB_CRED_STORE = 'credentials';
const IDB_SESSION_STORE = 'sessions';

// Fallback in-memory mirrors if IndexedDB is unavailable in restricted contexts
const memoryCredStore = new Map<string, LocalUserCredentialRecord>();
const memorySessionStore = new Map<string, LocalSessionRecord>();

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'local-device';
  try {
    const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing && existing.length >= 8) return existing;
    const created =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `dev_${crypto.randomUUID()}`
        : `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return 'dev_ephemeral';
  }
}

function detectDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Mobile Device';
  const ua = navigator.userAgent || '';
  if (/iPhone/i.test(ua)) return 'iPhone (iOS)';
  if (/iPad/i.test(ua)) return 'iPad (iOS)';
  if (/Android/i.test(ua)) return 'Android Device';
  if (/Mac/i.test(ua)) return 'macOS Device';
  if (/Windows/i.test(ua)) return 'Windows Device';
  return 'Mobile Banking Device';
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function stringToBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlToString(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const bytes = base64ToBytes(padded);
  return new TextDecoder().decode(bytes);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function randomToken(prefix: string, byteLen = 36): string {
  const buf = new Uint8Array(byteLen);
  crypto.getRandomValues(buf);
  return `${prefix}${bytesToBase64Url(buf)}`;
}

function randomId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return bytesToHex(new Uint8Array(digest));
  }
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < value.length; i++) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ (ch + i), 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

async function hashSecretValue(secret: string, saltHex?: string): Promise<string> {
  const saltBytes = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const usedSaltHex = saltHex || bytesToHex(saltBytes);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const derived = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes.buffer as ArrayBuffer,
        iterations: 100000,
        hash: 'SHA-256',
      },
      baseKey,
      256
    );
    return `pbkdf2:${usedSaltHex}:${bytesToHex(new Uint8Array(derived))}`;
  }

  const fallback = await sha256Hex(`${usedSaltHex}:${secret}`);
  return `sha:${usedSaltHex}:${fallback}`;
}

async function verifySecretValue(secret: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 3) return false;
  const [alg, saltHex, expectedHex] = parts;
  if (alg === 'pbkdf2' && typeof crypto !== 'undefined' && crypto.subtle) {
    const candidate = await hashSecretValue(secret, saltHex);
    const actualHex = candidate.split(':')[2] || '';
    if (actualHex.length !== expectedHex.length) return false;
    let diff = 0;
    for (let i = 0; i < actualHex.length; i++) {
      diff |= actualHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
    }
    return diff === 0;
  }
  const fallback = await sha256Hex(`${saltHex}:${secret}`);
  return fallback === expectedHex;
}

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_KEY_STORE)) {
        db.createObjectStore(IDB_KEY_STORE);
      }
      if (!db.objectStoreNames.contains(IDB_TOKEN_STORE)) {
        db.createObjectStore(IDB_TOKEN_STORE);
      }
      if (!db.objectStoreNames.contains(IDB_CRED_STORE)) {
        db.createObjectStore(IDB_CRED_STORE);
      }
      if (!db.objectStoreNames.contains(IDB_SESSION_STORE)) {
        db.createObjectStore(IDB_SESSION_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open secure IndexedDB vault'));
  });
}

async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  try {
    const db = await openVaultDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    if (storeName === IDB_CRED_STORE) return (memoryCredStore.get(key) as T) ?? null;
    if (storeName === IDB_SESSION_STORE) return (memorySessionStore.get(key) as T) ?? null;
    return null;
  }
}

async function idbGetAll<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openVaultDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    if (storeName === IDB_SESSION_STORE) return Array.from(memorySessionStore.values()) as T[];
    if (storeName === IDB_CRED_STORE) return Array.from(memoryCredStore.values()) as T[];
    return [];
  }
}

async function idbPut(storeName: string, key: string, value: unknown): Promise<void> {
  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    if (storeName === IDB_CRED_STORE) memoryCredStore.set(key, value as LocalUserCredentialRecord);
    if (storeName === IDB_SESSION_STORE) memorySessionStore.set(key, value as LocalSessionRecord);
  }
}

async function idbDelete(storeName: string, key: string): Promise<void> {
  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    if (storeName === IDB_CRED_STORE) memoryCredStore.delete(key);
    if (storeName === IDB_SESSION_STORE) memorySessionStore.delete(key);
  }
}

async function getOrCreateWebCryptoKey(userId: string): Promise<CryptoKey> {
  const keyId = `web_kek_${userId}`;
  const existing = await idbGet<CryptoKey>(IDB_KEY_STORE, keyId);
  if (existing) return existing;

  const generated = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt']
  );
  await idbPut(IDB_KEY_STORE, keyId, generated);
  return generated;
}

async function getOrCreateDeviceHmacKey(): Promise<CryptoKey | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  const keyId = 'device_hmac_signing_key';
  const existing = await idbGet<CryptoKey>(IDB_KEY_STORE, keyId);
  if (existing) return existing;

  const generated = await crypto.subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256' },
    false, // non-extractable
    ['sign', 'verify']
  );
  await idbPut(IDB_KEY_STORE, keyId, generated);
  return generated;
}

async function issueSignedAccessToken(claims: Omit<AccessTokenClaims, 'iat' | 'exp'>): Promise<{
  accessToken: string;
  expiresAt: number;
}> {
  const nowMs = Date.now();
  const iat = Math.floor(nowMs / 1000);
  const exp = Math.floor((nowMs + ACCESS_TOKEN_TTL_MS) / 1000);
  const fullClaims: AccessTokenClaims = { ...claims, iat, exp };

  const header = stringToBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = stringToBase64Url(JSON.stringify(fullClaims));
  const unsigned = `${header}.${payload}`;

  const hmacKey = await getOrCreateDeviceHmacKey();
  if (hmacKey && crypto.subtle) {
    const sigBuf = await crypto.subtle.sign(
      'HMAC',
      hmacKey,
      new TextEncoder().encode(unsigned)
    );
    const sig = bytesToBase64Url(new Uint8Array(sigBuf));
    return { accessToken: `${unsigned}.${sig}`, expiresAt: exp * 1000 };
  }

  const fallbackSig = await sha256Hex(`cbe_local_sig:${unsigned}`);
  return { accessToken: `${unsigned}.${fallbackSig}`, expiresAt: exp * 1000 };
}

async function verifyLocalAccessToken(token: string): Promise<{
  valid: boolean;
  claims?: AccessTokenClaims;
  session?: LocalSessionRecord;
}> {
  if (!token) return { valid: false };
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false };
  const [header, payload, sig] = parts;
  const unsigned = `${header}.${payload}`;

  try {
    const hmacKey = await getOrCreateDeviceHmacKey();
    if (hmacKey && crypto.subtle) {
      const padded = sig.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((sig.length + 3) % 4);
      const sigBytes = base64ToBytes(padded);
      const ok = await crypto.subtle.verify(
        'HMAC',
        hmacKey,
        sigBytes.buffer as ArrayBuffer,
        new TextEncoder().encode(unsigned)
      );
      if (!ok) return { valid: false };
    } else {
      const expected = await sha256Hex(`cbe_local_sig:${unsigned}`);
      if (sig !== expected) return { valid: false };
    }

    const claims = JSON.parse(base64UrlToString(payload)) as AccessTokenClaims;
    if (!claims.exp || claims.exp * 1000 <= Date.now()) {
      return { valid: false };
    }

    const session = await idbGet<LocalSessionRecord>(IDB_SESSION_STORE, claims.sid);
    if (!session || session.revokedAt !== null || session.expiresAt <= Date.now()) {
      return { valid: false };
    }

    return { valid: true, claims, session };
  } catch {
    return { valid: false };
  }
}

async function importRawDekKey(dekBase64: string): Promise<CryptoKey> {
  const rawBytes = base64ToBytes(dekBase64);
  return crypto.subtle.importKey(
    'raw',
    rawBytes.buffer as ArrayBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export class AuthSessionService {
  // Access token & active session live strictly in memory (never in localStorage/AsyncStorage)
  private static accessToken: string | null = null;
  private static accessTokenExpiresAt = 0;
  private static activeSessionId: string | null = null;
  private static activeUserId: string | null = null;
  private static sessionRefreshToken: string | null = null;

  public static getDeviceId(): string {
    return getOrCreateDeviceId();
  }

  public static getDeviceLabel(): string {
    return detectDeviceLabel();
  }

  public static getAccessToken(): string | null {
    if (!this.accessToken) return null;
    if (Date.now() >= this.accessTokenExpiresAt - 5000) {
      return null;
    }
    return this.accessToken;
  }

  public static getActiveSessionId(): string | null {
    return this.activeSessionId;
  }

  public static getSessionRefreshToken(): string | null {
    return this.sessionRefreshToken;
  }

  public static generateHardwareDekBase64(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return bytesToBase64(bytes);
  }

  public static async sealRefreshTokenWithKey(
    userId: string,
    refreshToken: string,
    hardwareDekBase64?: string
  ): Promise<void> {
    if (typeof window === 'undefined' || !crypto?.subtle) {
      throw new Error('WebCrypto is unavailable for secure token sealing.');
    }
    const cryptoKey = hardwareDekBase64
      ? await importRawDekKey(hardwareDekBase64)
      : await getOrCreateWebCryptoKey(userId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(refreshToken);
    const cipherBuf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      cryptoKey,
      encoded.buffer as ArrayBuffer
    );

    await idbPut(IDB_TOKEN_STORE, `rt_${userId}`, {
      iv: bytesToBase64(iv),
      ct: bytesToBase64(new Uint8Array(cipherBuf)),
      mode: hardwareDekBase64 ? 'hardware_dek' : 'web_non_extractable',
      updatedAt: Date.now(),
    });
  }

  public static async unsealRefreshTokenWithKey(
    userId: string,
    hardwareDekBase64?: string
  ): Promise<string | null> {
    if (typeof window === 'undefined' || !crypto?.subtle) return null;
    try {
      const record = await idbGet<{ iv: string; ct: string; mode: string }>(IDB_TOKEN_STORE, `rt_${userId}`);
      if (!record?.iv || !record?.ct) return null;

      const cryptoKey = hardwareDekBase64
        ? await importRawDekKey(hardwareDekBase64)
        : await idbGet<CryptoKey>(IDB_KEY_STORE, `web_kek_${userId}`);

      if (!cryptoKey) return null;

      const iv = base64ToBytes(record.iv);
      const ct = base64ToBytes(record.ct);
      const plainBuf = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
        cryptoKey,
        ct.buffer as ArrayBuffer
      );
      return new TextDecoder().decode(plainBuf);
    } catch {
      return null;
    }
  }

  public static async hasSealedRefreshToken(userId: string): Promise<boolean> {
    try {
      const record = await idbGet<{ iv: string; ct: string }>(IDB_TOKEN_STORE, `rt_${userId}`);
      return Boolean(record?.iv && record?.ct);
    } catch {
      return false;
    }
  }

  public static async clearSealedTokens(userId: string): Promise<void> {
    try {
      await idbDelete(IDB_TOKEN_STORE, `rt_${userId}`);
      await idbDelete(IDB_KEY_STORE, `web_kek_${userId}`);
    } catch {
      // Non-blocking
    }
  }

  private static setInMemorySession(params: {
    userId: string;
    sessionId: string;
    accessToken: string;
    expiresAt: number;
    refreshToken?: string;
  }): void {
    this.activeUserId = params.userId;
    this.activeSessionId = params.sessionId;
    this.accessToken = params.accessToken;
    this.accessTokenExpiresAt = params.expiresAt;
    if (params.refreshToken) {
      this.sessionRefreshToken = params.refreshToken;
    }
  }

  public static clearInMemorySession(): void {
    this.accessToken = null;
    this.accessTokenExpiresAt = 0;
    this.activeSessionId = null;
    this.activeUserId = null;
    this.sessionRefreshToken = null;
  }

  public static async loginWithCredentials(params: {
    userId: string;
    email: string;
    authType: 'pin' | 'password';
    secret: string;
  }): Promise<AuthApiResult> {
    const cleanSecret = (params.secret || '').trim();
    if (!cleanSecret) {
      return { ok: false, errorCode: 'MISSING_CREDENTIAL', message: 'Credential is required.' };
    }

    let cred = await idbGet<LocalUserCredentialRecord>(IDB_CRED_STORE, params.userId);
    if (!cred) {
      cred = {
        userId: params.userId,
        email: params.email,
        updatedAt: Date.now(),
      };
    }

    if (params.authType === 'pin') {
      if (cleanSecret.length < 4 || cleanSecret.length > 6 || !/^\d+$/.test(cleanSecret)) {
        return { ok: false, errorCode: 'INVALID_FORMAT', message: 'PIN must be 4 to 6 digits.' };
      }
      if (!cred.pinHash) {
        cred.pinHash = await hashSecretValue(DEFAULT_LOGIN_PIN);
        cred.updatedAt = Date.now();
        await idbPut(IDB_CRED_STORE, params.userId, cred);
      }
      const matches = await verifySecretValue(cleanSecret, cred.pinHash);
      if (!matches) {
        return { ok: false, errorCode: 'INVALID_PIN', message: 'Incorrect PIN. Please try again.' };
      }
    } else {
      if (cleanSecret.length < 6) {
        return { ok: false, errorCode: 'INVALID_FORMAT', message: 'Password must be at least 6 characters.' };
      }
      if (!cred.passwordHash) {
        cred.passwordHash = await hashSecretValue(cleanSecret);
        cred.updatedAt = Date.now();
        await idbPut(IDB_CRED_STORE, params.userId, cred);
      } else {
        const matches = await verifySecretValue(cleanSecret, cred.passwordHash);
        if (!matches) {
          return { ok: false, errorCode: 'INVALID_PASSWORD', message: 'Incorrect password. Please try again.' };
        }
      }
    }

    const sessionId = randomId('sid');
    const familyId = randomId('fam');
    const refreshToken = randomToken('cbe_rt_');
    const deviceId = this.getDeviceId();
    const deviceLabel = this.getDeviceLabel();
    const now = Date.now();

    const session: LocalSessionRecord = {
      sessionId,
      familyId,
      userId: params.userId,
      email: params.email,
      deviceId,
      deviceLabel,
      biometricEnabled: false,
      biometricMethod: 'none',
      refreshTokenHash: await sha256Hex(`cbe_rt_v1:${refreshToken}`),
      previousTokenHash: null,
      createdAt: now,
      lastUsedAt: now,
      expiresAt: now + REFRESH_TOKEN_TTL_MS,
      revokedAt: null,
      revokeReason: null,
    };

    await idbPut(IDB_SESSION_STORE, sessionId, session);

    const access = await issueSignedAccessToken({
      sub: params.userId,
      email: params.email,
      sid: sessionId,
      did: deviceId,
      method: params.authType,
    });

    this.setInMemorySession({
      userId: params.userId,
      sessionId,
      accessToken: access.accessToken,
      expiresAt: access.expiresAt,
      refreshToken,
    });

    return {
      ok: true,
      userId: params.userId,
      email: params.email,
      sessionId,
      accessToken: access.accessToken,
      expiresAt: access.expiresAt,
      refreshToken,
    };
  }

  public static async requestBiometricEnrollmentToken(
    biometricMethod: 'faceid' | 'fingerprint'
  ): Promise<AuthApiResult> {
    const token = await this.ensureValidAccessToken();
    if (!token) {
      return {
        ok: false,
        errorCode: 'SESSION_EXPIRED',
        message: 'Please sign in with your PIN or password before enabling biometric login.',
      };
    }

    const verification = await verifyLocalAccessToken(token);
    if (!verification.valid || !verification.session) {
      return {
        ok: false,
        errorCode: 'SESSION_REVOKED',
        message: 'Session expired. Please sign in with your PIN or password.',
      };
    }

    const session = verification.session;
    const newRefreshToken = randomToken('cbe_rt_');
    session.previousTokenHash = session.refreshTokenHash;
    session.refreshTokenHash = await sha256Hex(`cbe_rt_v1:${newRefreshToken}`);
    session.biometricEnabled = true;
    session.biometricMethod = biometricMethod;
    session.lastUsedAt = Date.now();
    await idbPut(IDB_SESSION_STORE, session.sessionId, session);

    const access = await issueSignedAccessToken({
      sub: session.userId,
      email: session.email,
      sid: session.sessionId,
      did: session.deviceId,
      method: biometricMethod,
    });

    this.setInMemorySession({
      userId: session.userId,
      sessionId: session.sessionId,
      accessToken: access.accessToken,
      expiresAt: access.expiresAt,
      refreshToken: newRefreshToken,
    });

    return {
      ok: true,
      userId: session.userId,
      email: session.email,
      sessionId: session.sessionId,
      accessToken: access.accessToken,
      expiresAt: access.expiresAt,
      refreshToken: newRefreshToken,
    };
  }

  public static async refreshAndVerifyBiometricSession(refreshToken: string): Promise<AuthApiResult> {
    const rawToken = (refreshToken || '').trim();
    if (!rawToken) {
      this.clearInMemorySession();
      return { ok: false, errorCode: 'MISSING_TOKEN', message: 'Missing refresh credential.' };
    }

    const incomingHash = await sha256Hex(`cbe_rt_v1:${rawToken}`);
    const sessions = await idbGetAll<LocalSessionRecord>(IDB_SESSION_STORE);

    const matched = sessions.find((s) => s.refreshTokenHash === incomingHash);
    if (!matched) {
      const replayed = sessions.find((s) => s.previousTokenHash === incomingHash);
      if (replayed) {
        const now = Date.now();
        for (const s of sessions) {
          if (s.familyId === replayed.familyId && s.revokedAt === null) {
            s.revokedAt = now;
            s.revokeReason = 'Refresh token reuse detected';
            await idbPut(IDB_SESSION_STORE, s.sessionId, s);
          }
        }
        this.clearInMemorySession();
        return {
          ok: false,
          errorCode: 'REUSE_DETECTED',
          message: 'Security notice: This session was invalidated due to token reuse. Please sign in with your PIN or password.',
        };
      }

      this.clearInMemorySession();
      return {
        ok: false,
        errorCode: 'SESSION_REVOKED',
        message: 'Your biometric session is no longer valid. Please sign in with your PIN or password.',
      };
    }

    if (matched.revokedAt !== null) {
      this.clearInMemorySession();
      return {
        ok: false,
        errorCode: 'SESSION_REVOKED',
        message: 'This session was logged out or revoked. Please sign in with your PIN or password.',
      };
    }

    if (matched.expiresAt <= Date.now()) {
      matched.revokedAt = Date.now();
      matched.revokeReason = 'Refresh token expired';
      await idbPut(IDB_SESSION_STORE, matched.sessionId, matched);
      this.clearInMemorySession();
      return {
        ok: false,
        errorCode: 'TOKEN_EXPIRED',
        message: 'Your biometric session has expired. Please sign in with your PIN or password.',
      };
    }

    if (matched.deviceId !== this.getDeviceId()) {
      this.clearInMemorySession();
      return {
        ok: false,
        errorCode: 'SESSION_REVOKED',
        message: 'Device mismatch detected. Please re-authenticate with your PIN or password.',
      };
    }

    // Rotate refresh token locally in IndexedDB
    const nextRefreshToken = randomToken('cbe_rt_');
    matched.previousTokenHash = matched.refreshTokenHash;
    matched.refreshTokenHash = await sha256Hex(`cbe_rt_v1:${nextRefreshToken}`);
    matched.lastUsedAt = Date.now();
    await idbPut(IDB_SESSION_STORE, matched.sessionId, matched);

    const access = await issueSignedAccessToken({
      sub: matched.userId,
      email: matched.email,
      sid: matched.sessionId,
      did: matched.deviceId,
      method: matched.biometricMethod !== 'none' ? matched.biometricMethod : 'refresh',
    });

    this.setInMemorySession({
      userId: matched.userId,
      sessionId: matched.sessionId,
      accessToken: access.accessToken,
      expiresAt: access.expiresAt,
      refreshToken: nextRefreshToken,
    });

    return {
      ok: true,
      userId: matched.userId,
      email: matched.email,
      sessionId: matched.sessionId,
      accessToken: access.accessToken,
      expiresAt: access.expiresAt,
      refreshToken: nextRefreshToken,
    };
  }

  public static async ensureValidAccessToken(): Promise<string | null> {
    const current = this.getAccessToken();
    if (current) return current;

    if (this.sessionRefreshToken) {
      const refreshed = await this.refreshAndVerifyBiometricSession(this.sessionRefreshToken);
      if (refreshed.ok && refreshed.accessToken) {
        return refreshed.accessToken;
      }
    }
    return null;
  }

  public static async disableBiometricsOnBackend(): Promise<boolean> {
    const token = await this.ensureValidAccessToken();
    if (!token) return false;
    const verification = await verifyLocalAccessToken(token);
    if (!verification.valid || !verification.session) return false;

    const session = verification.session;
    const rotated = randomToken('cbe_rt_');
    session.biometricEnabled = false;
    session.biometricMethod = 'none';
    session.previousTokenHash = null;
    session.refreshTokenHash = await sha256Hex(`cbe_rt_v1:${rotated}`);
    session.lastUsedAt = Date.now();
    await idbPut(IDB_SESSION_STORE, session.sessionId, session);
    return true;
  }

  public static async updateSecurityCredentialOnBackend(params: {
    type: 'pin' | 'password';
    newSecret: string;
    currentSecret?: string;
  }): Promise<{ ok: boolean; message?: string }> {
    const token = await this.ensureValidAccessToken();
    if (!token) {
      return {
        ok: false,
        message: 'Active session required. Please re-authenticate before changing security settings.',
      };
    }

    const verification = await verifyLocalAccessToken(token);
    if (!verification.valid || !verification.claims) {
      return {
        ok: false,
        message: 'Session expired. Please re-authenticate.',
      };
    }

    const userId = verification.claims.sub;
    const cleanNew = (params.newSecret || '').trim();
    let cred = await idbGet<LocalUserCredentialRecord>(IDB_CRED_STORE, userId);
    if (!cred) {
      cred = {
        userId,
        email: verification.claims.email,
        updatedAt: Date.now(),
      };
    }

    if (params.type === 'pin') {
      if (cleanNew.length < 4 || cleanNew.length > 6 || !/^\d+$/.test(cleanNew)) {
        return { ok: false, message: 'PIN must be 4 to 6 digits.' };
      }
      if (!cred.pinHash) {
        cred.pinHash = await hashSecretValue(DEFAULT_LOGIN_PIN);
      }
      const curMatch =
        params.currentSecret &&
        (await verifySecretValue(params.currentSecret.trim(), cred.pinHash));
      if (!curMatch) {
        return { ok: false, message: 'Current PIN is incorrect.' };
      }
      cred.pinHash = await hashSecretValue(cleanNew);
    } else {
      if (cleanNew.length < 6) {
        return { ok: false, message: 'Password must be at least 6 characters.' };
      }
      if (cred.passwordHash) {
        const curMatch =
          params.currentSecret &&
          (await verifySecretValue(params.currentSecret.trim(), cred.passwordHash));
        if (!curMatch) {
          return { ok: false, message: 'Current password is incorrect.' };
        }
      }
      cred.passwordHash = await hashSecretValue(cleanNew);
    }

    cred.updatedAt = Date.now();
    await idbPut(IDB_CRED_STORE, userId, cred);
    return { ok: true };
  }

  public static async listActiveSessions(): Promise<{
    ok: boolean;
    sessions: ActiveDeviceSession[];
    message?: string;
  }> {
    const token = await this.ensureValidAccessToken();
    if (!token) {
      return { ok: false, sessions: [], message: 'Active session expired.' };
    }

    const verification = await verifyLocalAccessToken(token);
    if (!verification.valid || !verification.claims) {
      return { ok: false, sessions: [], message: 'Active session expired.' };
    }

    const allSessions = await idbGetAll<LocalSessionRecord>(IDB_SESSION_STORE);
    const active = allSessions
      .filter(
        (s) =>
          s.userId === verification.claims!.sub &&
          s.revokedAt === null &&
          s.expiresAt > Date.now()
      )
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .map((s) => ({
        sessionId: s.sessionId,
        deviceLabel: s.deviceLabel,
        biometricEnabled: s.biometricEnabled,
        biometricMethod: s.biometricMethod,
        createdAt: new Date(s.createdAt).toISOString(),
        lastUsedAt: new Date(s.lastUsedAt).toISOString(),
        expiresAt: new Date(s.expiresAt).toISOString(),
        isCurrent: s.sessionId === verification.claims!.sid,
      }));

    return { ok: true, sessions: active };
  }

  public static async revokeSession(options: {
    targetSessionId?: string;
    revokeOthers?: boolean;
  }): Promise<{ ok: boolean; revokedCount?: number }> {
    const token = await this.ensureValidAccessToken();
    if (!token) return { ok: false };

    const verification = await verifyLocalAccessToken(token);
    if (!verification.valid || !verification.claims) return { ok: false };

    const allSessions = await idbGetAll<LocalSessionRecord>(IDB_SESSION_STORE);
    const now = Date.now();

    if (options.revokeOthers) {
      let count = 0;
      for (const s of allSessions) {
        if (
          s.userId === verification.claims.sub &&
          s.sessionId !== verification.claims.sid &&
          s.revokedAt === null
        ) {
          s.revokedAt = now;
          s.revokeReason = 'Revoked by user from device settings';
          await idbPut(IDB_SESSION_STORE, s.sessionId, s);
          count++;
        }
      }
      return { ok: true, revokedCount: count };
    }

    if (options.targetSessionId) {
      const target = await idbGet<LocalSessionRecord>(IDB_SESSION_STORE, options.targetSessionId);
      if (target && target.userId === verification.claims.sub && target.revokedAt === null) {
        target.revokedAt = now;
        target.revokeReason = 'Revoked from device settings';
        await idbPut(IDB_SESSION_STORE, target.sessionId, target);
      }
      return { ok: true };
    }

    return { ok: false };
  }

  public static async logoutFromBackend(userId?: string): Promise<void> {
    const sid = this.activeSessionId;
    const refresh = this.sessionRefreshToken;
    this.clearInMemorySession();

    if (userId) {
      await this.clearSealedTokens(userId);
    }

    if (sid) {
      const session = await idbGet<LocalSessionRecord>(IDB_SESSION_STORE, sid);
      if (session && session.revokedAt === null) {
        session.revokedAt = Date.now();
        session.revokeReason = 'User logged out';
        await idbPut(IDB_SESSION_STORE, sid, session);
      }
    }

    if (refresh) {
      const hash = await sha256Hex(`cbe_rt_v1:${refresh.trim()}`);
      const sessions = await idbGetAll<LocalSessionRecord>(IDB_SESSION_STORE);
      for (const s of sessions) {
        if ((s.refreshTokenHash === hash || s.previousTokenHash === hash) && s.revokedAt === null) {
          s.revokedAt = Date.now();
          s.revokeReason = 'User logged out';
          await idbPut(IDB_SESSION_STORE, s.sessionId, s);
        }
      }
    }
  }
}

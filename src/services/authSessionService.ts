/**
 * AuthSessionService
 * - Holds short-lived access tokens strictly in memory (never in localStorage/AsyncStorage).
 * - Encrypts rotating refresh tokens via AES-256-GCM using either:
 *   1. Hardware-sealed biometric DEK (from iOS Keychain .biometryCurrentSet / Android Keystore CryptoObject), OR
 *   2. Non-extractable WebCrypto CryptoKey persisted in IndexedDB (browser/PWA fallback).
 * - Communicates with /api/auth/* for session creation, refresh-token rotation, revocation, and credential updates.
 */

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

const DEVICE_ID_STORAGE_KEY = 'cbe_device_uid_v1';
const IDB_NAME = 'cbe_secure_auth_vault_v1';
const IDB_KEY_STORE = 'crypto_keys';
const IDB_TOKEN_STORE = 'sealed_tokens';

function getApiBaseUrl(): string {
  const envBase = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL;
  if (envBase && envBase.trim().length > 0) {
    return envBase.trim().replace(/\/+$/, '');
  }
  return '';
}

function resolveApiUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
}

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server-device';
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
  if (/Mac/i.test(ua)) return 'macOS Browser';
  if (/Windows/i.test(ua)) return 'Windows Browser';
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

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_KEY_STORE)) {
        db.createObjectStore(IDB_KEY_STORE);
      }
      if (!db.objectStoreNames.contains(IDB_TOKEN_STORE)) {
        db.createObjectStore(IDB_TOKEN_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open secure IndexedDB vault'));
  });
}

async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(storeName: string, key: string, value: unknown): Promise<void> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
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
  // Ephemeral in-memory refresh token only while authenticated in current session (for logout revocation)
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
    try {
      const response = await fetch(resolveApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: params.userId,
          email: params.email,
          authType: params.authType,
          secret: params.secret,
          deviceId: this.getDeviceId(),
          deviceLabel: this.getDeviceLabel(),
        }),
      });
      const data = (await response.json()) as AuthApiResult;
      if (!response.ok || !data.ok || !data.accessToken || !data.sessionId) {
        return {
          ok: false,
          errorCode: data.errorCode || 'LOGIN_FAILED',
          message: data.message || 'Authentication failed.',
        };
      }

      this.setInMemorySession({
        userId: params.userId,
        sessionId: data.sessionId,
        accessToken: data.accessToken,
        expiresAt: data.expiresAt || Date.now() + 15 * 60 * 1000,
        refreshToken: data.refreshToken,
      });

      return data;
    } catch {
      return {
        ok: false,
        errorCode: 'NETWORK_ERROR',
        message: 'Unable to reach authentication server. Please check your connection and try again.',
      };
    }
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

    try {
      const response = await fetch(resolveApiUrl('/api/auth/biometric/enroll'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ biometricMethod }),
      });
      const data = (await response.json()) as AuthApiResult;
      if (!response.ok || !data.ok || !data.refreshToken) {
        return {
          ok: false,
          errorCode: data.errorCode || 'ENROLL_FAILED',
          message: data.message || 'Unable to register biometric session on server.',
        };
      }

      if (data.accessToken && data.expiresAt && this.activeUserId && this.activeSessionId) {
        this.setInMemorySession({
          userId: this.activeUserId,
          sessionId: this.activeSessionId,
          accessToken: data.accessToken,
          expiresAt: data.expiresAt,
          refreshToken: data.refreshToken,
        });
      }

      return data;
    } catch {
      return {
        ok: false,
        errorCode: 'NETWORK_ERROR',
        message: 'Network error while enabling biometric login.',
      };
    }
  }

  public static async refreshAndVerifyBiometricSession(refreshToken: string): Promise<AuthApiResult> {
    try {
      const response = await fetch(resolveApiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken,
          deviceId: this.getDeviceId(),
        }),
      });
      const data = (await response.json()) as AuthApiResult;
      if (!response.ok || !data.ok || !data.accessToken || !data.sessionId || !data.userId) {
        this.clearInMemorySession();
        return {
          ok: false,
          errorCode: data.errorCode || 'SESSION_REVOKED',
          message: data.message || 'Your biometric session expired or was revoked. Please sign in with your PIN or password.',
        };
      }

      this.setInMemorySession({
        userId: data.userId,
        sessionId: data.sessionId,
        accessToken: data.accessToken,
        expiresAt: data.expiresAt || Date.now() + 15 * 60 * 1000,
        refreshToken: data.refreshToken,
      });

      return data;
    } catch {
      return {
        ok: false,
        errorCode: 'NETWORK_ERROR',
        message: 'Unable to verify session with server. Check your internet connection or use password login.',
      };
    }
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
    try {
      const res = await fetch(resolveApiUrl('/api/auth/biometric/disable'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      return res.ok;
    } catch {
      return false;
    }
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

    try {
      const res = await fetch(resolveApiUrl('/api/auth/security/update'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      return { ok: Boolean(res.ok && data.ok), message: data.message };
    } catch {
      return { ok: false, message: 'Network error while updating security credentials.' };
    }
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

    try {
      const res = await fetch(resolveApiUrl('/api/auth/sessions'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { ok?: boolean; sessions?: ActiveDeviceSession[]; message?: string };
      return {
        ok: Boolean(res.ok && data.ok),
        sessions: data.sessions || [],
        message: data.message,
      };
    } catch {
      return { ok: false, sessions: [], message: 'Unable to load active sessions.' };
    }
  }

  public static async revokeSession(options: {
    targetSessionId?: string;
    revokeOthers?: boolean;
  }): Promise<{ ok: boolean; revokedCount?: number }> {
    const token = await this.ensureValidAccessToken();
    if (!token) return { ok: false };

    try {
      const res = await fetch(resolveApiUrl('/api/auth/sessions/revoke'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(options),
      });
      const data = (await res.json()) as { ok?: boolean; revokedCount?: number };
      return { ok: Boolean(res.ok && data.ok), revokedCount: data.revokedCount };
    } catch {
      return { ok: false };
    }
  }

  public static async logoutFromBackend(userId?: string): Promise<void> {
    const bearer = this.accessToken;
    const refresh = this.sessionRefreshToken;
    this.clearInMemorySession();

    if (userId) {
      await this.clearSealedTokens(userId);
    }

    try {
      await fetch(resolveApiUrl('/api/auth/logout'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        },
        body: JSON.stringify({ refreshToken: refresh || undefined }),
      });
    } catch {
      // Clear local credentials even if network is offline
    }
  }
}

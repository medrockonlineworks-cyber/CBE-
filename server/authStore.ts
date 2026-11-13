import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface ServerSessionRecord {
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

export interface ServerUserCredential {
  userId: string;
  email: string;
  pinHash?: string;
  passwordHash?: string;
  updatedAt: number;
}

export interface AccessTokenClaims {
  sub: string;
  email: string;
  sid: string;
  did: string;
  method: string;
  iat: number;
  exp: number;
}

interface PersistedAuthState {
  sessions: Record<string, ServerSessionRecord>;
  credentials: Record<string, ServerUserCredential>;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STATE_FILE = path.resolve(DATA_DIR, 'auth-state.json');
const SECRET_FILE = path.resolve(DATA_DIR, 'auth-secret.key');

const ACCESS_TOKEN_TTL_SEC = 15 * 60; // 15 minutes short-lived access token
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days rotating refresh token

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
}

function loadOrCreateSigningSecret(): string {
  if (process.env.AUTH_TOKEN_SECRET && process.env.AUTH_TOKEN_SECRET.length >= 32) {
    return process.env.AUTH_TOKEN_SECRET;
  }
  ensureDataDir();
  if (fs.existsSync(SECRET_FILE)) {
    const existing = fs.readFileSync(SECRET_FILE, 'utf8').trim();
    if (existing.length >= 32) return existing;
  }
  const generated = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600 });
  return generated;
}

const SIGNING_SECRET = loadOrCreateSigningSecret();

function hashOpaqueToken(token: string): string {
  return crypto.createHash('sha256').update(`cbe_rt_v1:${token}`).digest('hex');
}

function hashSecretValue(secret: string, saltHex?: string): string {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(secret, salt, 32).toString('hex');
  return `${salt}:${derived}`;
}

function verifySecretValue(secret: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const actualBuf = crypto.scryptSync(secret, salt, 32);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(value: string): Buffer {
  const pad = '='.repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

class AuthStore {
  private state: PersistedAuthState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): PersistedAuthState {
    try {
      ensureDataDir();
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf8');
        const parsed = JSON.parse(raw) as PersistedAuthState;
        return {
          sessions: parsed.sessions || {},
          credentials: parsed.credentials || {},
        };
      }
    } catch {
      // Initialize clean state if corrupted
    }
    return { sessions: {}, credentials: {} };
  }

  private persist(): void {
    try {
      ensureDataDir();
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2), { mode: 0o600 });
    } catch {
      // Non-blocking fallback to in-memory
    }
  }

  public issueAccessToken(claims: Omit<AccessTokenClaims, 'iat' | 'exp'>): {
    accessToken: string;
    expiresInSec: number;
    expiresAt: number;
  } {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + ACCESS_TOKEN_TTL_SEC;
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = base64UrlEncode(JSON.stringify({ ...claims, iat, exp }));
    const signature = base64UrlEncode(
      crypto.createHmac('sha256', SIGNING_SECRET).update(`${header}.${payload}`).digest()
    );
    return {
      accessToken: `${header}.${payload}.${signature}`,
      expiresInSec: ACCESS_TOKEN_TTL_SEC,
      expiresAt: exp * 1000,
    };
  }

  public verifyAccessToken(token: string): {
    valid: boolean;
    code?: 'INVALID_TOKEN' | 'TOKEN_EXPIRED' | 'SESSION_REVOKED';
    claims?: AccessTokenClaims;
    session?: ServerSessionRecord;
  } {
    if (!token || typeof token !== 'string') {
      return { valid: false, code: 'INVALID_TOKEN' };
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, code: 'INVALID_TOKEN' };
    }
    const [header, payload, sig] = parts;
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', SIGNING_SECRET).update(`${header}.${payload}`).digest()
    );
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false, code: 'INVALID_TOKEN' };
    }

    let claims: AccessTokenClaims;
    try {
      claims = JSON.parse(base64UrlDecode(payload).toString('utf8')) as AccessTokenClaims;
    } catch {
      return { valid: false, code: 'INVALID_TOKEN' };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (!claims.exp || claims.exp <= nowSec) {
      return { valid: false, code: 'TOKEN_EXPIRED' };
    }

    const session = this.state.sessions[claims.sid];
    if (!session || session.revokedAt !== null || session.expiresAt <= Date.now()) {
      return { valid: false, code: 'SESSION_REVOKED' };
    }

    return { valid: true, claims, session };
  }

  public authenticateUserLogin(params: {
    userId: string;
    email: string;
    authType: 'pin' | 'password';
    secret: string;
    deviceId: string;
    deviceLabel: string;
  }): {
    ok: boolean;
    errorCode?: string;
    message?: string;
    accessToken?: string;
    expiresInSec?: number;
    expiresAt?: number;
    refreshToken?: string;
    sessionId?: string;
  } {
    const { userId, email, authType, secret, deviceId, deviceLabel } = params;
    const cleanSecret = (secret || '').trim();
    if (!cleanSecret) {
      return { ok: false, errorCode: 'MISSING_CREDENTIAL', message: 'Credential is required.' };
    }

    let cred = this.state.credentials[userId];
    if (!cred) {
      cred = {
        userId,
        email,
        updatedAt: Date.now(),
      };
      this.state.credentials[userId] = cred;
    }

    if (authType === 'pin') {
      if (cleanSecret.length < 4 || cleanSecret.length > 6 || !/^\d+$/.test(cleanSecret)) {
        return { ok: false, errorCode: 'INVALID_FORMAT', message: 'PIN must be 4 to 6 digits.' };
      }
      if (!cred.pinHash) {
        // First-time in-app PIN enrollment
        cred.pinHash = hashSecretValue(cleanSecret);
        cred.updatedAt = Date.now();
      } else if (!verifySecretValue(cleanSecret, cred.pinHash)) {
        return { ok: false, errorCode: 'INVALID_PIN', message: 'Incorrect PIN. Please try again.' };
      }
    } else {
      if (cleanSecret.length < 6) {
        return { ok: false, errorCode: 'INVALID_FORMAT', message: 'Password must be at least 6 characters.' };
      }
      if (!cred.passwordHash) {
        // First-time password registration for recovery
        cred.passwordHash = hashSecretValue(cleanSecret);
        cred.updatedAt = Date.now();
      } else if (!verifySecretValue(cleanSecret, cred.passwordHash)) {
        return { ok: false, errorCode: 'INVALID_PASSWORD', message: 'Incorrect password. Please try again.' };
      }
    }

    const sessionId = `sid_${crypto.randomUUID()}`;
    const familyId = `fam_${crypto.randomUUID()}`;
    const refreshToken = `cbe_rt_${crypto.randomBytes(36).toString('base64url')}`;
    const now = Date.now();

    const session: ServerSessionRecord = {
      sessionId,
      familyId,
      userId,
      email,
      deviceId,
      deviceLabel,
      biometricEnabled: false,
      biometricMethod: 'none',
      refreshTokenHash: hashOpaqueToken(refreshToken),
      previousTokenHash: null,
      createdAt: now,
      lastUsedAt: now,
      expiresAt: now + REFRESH_TOKEN_TTL_MS,
      revokedAt: null,
      revokeReason: null,
    };

    this.state.sessions[sessionId] = session;
    this.persist();

    const access = this.issueAccessToken({
      sub: userId,
      email,
      sid: sessionId,
      did: deviceId,
      method: authType,
    });

    return {
      ok: true,
      accessToken: access.accessToken,
      expiresInSec: access.expiresInSec,
      expiresAt: access.expiresAt,
      refreshToken,
      sessionId,
    };
  }

  public enrollBiometrics(params: {
    sessionId: string;
    biometricMethod: 'faceid' | 'fingerprint';
  }): {
    ok: boolean;
    errorCode?: string;
    message?: string;
    refreshToken?: string;
    accessToken?: string;
    expiresAt?: number;
  } {
    const session = this.state.sessions[params.sessionId];
    if (!session || session.revokedAt !== null || session.expiresAt <= Date.now()) {
      return { ok: false, errorCode: 'SESSION_REVOKED', message: 'Session is expired or revoked.' };
    }

    // Rotate refresh token when binding to biometric hardware storage
    const newRefreshToken = `cbe_rt_${crypto.randomBytes(36).toString('base64url')}`;
    session.previousTokenHash = session.refreshTokenHash;
    session.refreshTokenHash = hashOpaqueToken(newRefreshToken);
    session.biometricEnabled = true;
    session.biometricMethod = params.biometricMethod;
    session.lastUsedAt = Date.now();
    this.persist();

    const access = this.issueAccessToken({
      sub: session.userId,
      email: session.email,
      sid: session.sessionId,
      did: session.deviceId,
      method: params.biometricMethod,
    });

    return {
      ok: true,
      refreshToken: newRefreshToken,
      accessToken: access.accessToken,
      expiresAt: access.expiresAt,
    };
  }

  public rotateRefreshToken(params: {
    refreshToken: string;
    deviceId?: string;
  }): {
    ok: boolean;
    errorCode?: 'MISSING_TOKEN' | 'TOKEN_EXPIRED' | 'SESSION_REVOKED' | 'REUSE_DETECTED' | 'BIOMETRIC_DISABLED';
    message?: string;
    userId?: string;
    email?: string;
    sessionId?: string;
    accessToken?: string;
    expiresInSec?: number;
    expiresAt?: number;
    refreshToken?: string;
  } {
    const rawToken = (params.refreshToken || '').trim();
    if (!rawToken) {
      return { ok: false, errorCode: 'MISSING_TOKEN', message: 'Missing refresh credential.' };
    }

    const incomingHash = hashOpaqueToken(rawToken);
    const sessions = Object.values(this.state.sessions);

    // Check active match first
    const matched = sessions.find((s) => s.refreshTokenHash === incomingHash);
    if (!matched) {
      // Check if an already-rotated token is being replayed -> revoke entire family
      const replayed = sessions.find((s) => s.previousTokenHash === incomingHash);
      if (replayed) {
        this.revokeFamily(replayed.familyId, 'Refresh token reuse detected');
        return {
          ok: false,
          errorCode: 'REUSE_DETECTED',
          message: 'Security notice: This session was invalidated due to token reuse. Please sign in with your PIN or password.',
        };
      }
      return {
        ok: false,
        errorCode: 'SESSION_REVOKED',
        message: 'Your session is no longer valid. Please sign in with your PIN or password.',
      };
    }

    if (matched.revokedAt !== null) {
      return {
        ok: false,
        errorCode: 'SESSION_REVOKED',
        message: 'This session was logged out or revoked. Please sign in with your PIN or password.',
      };
    }

    if (matched.expiresAt <= Date.now()) {
      matched.revokedAt = Date.now();
      matched.revokeReason = 'Refresh token expired';
      this.persist();
      return {
        ok: false,
        errorCode: 'TOKEN_EXPIRED',
        message: 'Your biometric session has expired. Please sign in with your PIN or password.',
      };
    }

    if (params.deviceId && matched.deviceId !== params.deviceId) {
      return {
        ok: false,
        errorCode: 'SESSION_REVOKED',
        message: 'Device mismatch detected. Please re-authenticate with your PIN or password.',
      };
    }

    // Rotate refresh token cleanly
    const nextRefreshToken = `cbe_rt_${crypto.randomBytes(36).toString('base64url')}`;
    matched.previousTokenHash = matched.refreshTokenHash;
    matched.refreshTokenHash = hashOpaqueToken(nextRefreshToken);
    matched.lastUsedAt = Date.now();
    this.persist();

    const access = this.issueAccessToken({
      sub: matched.userId,
      email: matched.email,
      sid: matched.sessionId,
      did: matched.deviceId,
      method: matched.biometricMethod !== 'none' ? matched.biometricMethod : 'refresh',
    });

    return {
      ok: true,
      userId: matched.userId,
      email: matched.email,
      sessionId: matched.sessionId,
      accessToken: access.accessToken,
      expiresInSec: access.expiresInSec,
      expiresAt: access.expiresAt,
      refreshToken: nextRefreshToken,
    };
  }

  public disableBiometrics(sessionId: string): { ok: boolean } {
    const session = this.state.sessions[sessionId];
    if (session) {
      session.biometricEnabled = false;
      session.biometricMethod = 'none';
      // Rotate refresh token so any previously sealed biometric copy is invalidated
      const rotated = `cbe_rt_${crypto.randomBytes(36).toString('base64url')}`;
      session.previousTokenHash = null;
      session.refreshTokenHash = hashOpaqueToken(rotated);
      session.lastUsedAt = Date.now();
      this.persist();
    }
    return { ok: true };
  }

  public revokeSession(sessionId: string, reason = 'User logout', ownerUserId?: string): { ok: boolean } {
    const session = this.state.sessions[sessionId];
    if (session && (!ownerUserId || session.userId === ownerUserId) && session.revokedAt === null) {
      session.revokedAt = Date.now();
      session.revokeReason = reason;
      this.persist();
    }
    return { ok: true };
  }

  public revokeByRefreshToken(refreshToken: string, reason = 'User logout'): void {
    const hash = hashOpaqueToken(refreshToken.trim());
    for (const session of Object.values(this.state.sessions)) {
      if (session.refreshTokenHash === hash || session.previousTokenHash === hash) {
        session.revokedAt = Date.now();
        session.revokeReason = reason;
      }
    }
    this.persist();
  }

  public revokeOtherSessions(userId: string, keepSessionId: string): number {
    let count = 0;
    const now = Date.now();
    for (const session of Object.values(this.state.sessions)) {
      if (session.userId === userId && session.sessionId !== keepSessionId && session.revokedAt === null) {
        session.revokedAt = now;
        session.revokeReason = 'Revoked by user from another device';
        count++;
      }
    }
    if (count > 0) this.persist();
    return count;
  }

  private revokeFamily(familyId: string, reason: string): void {
    const now = Date.now();
    for (const session of Object.values(this.state.sessions)) {
      if (session.familyId === familyId && session.revokedAt === null) {
        session.revokedAt = now;
        session.revokeReason = reason;
      }
    }
    this.persist();
  }

  public listUserSessions(userId: string, currentSessionId: string) {
    return Object.values(this.state.sessions)
      .filter((s) => s.userId === userId && s.revokedAt === null && s.expiresAt > Date.now())
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .map((s) => ({
        sessionId: s.sessionId,
        deviceLabel: s.deviceLabel,
        biometricEnabled: s.biometricEnabled,
        biometricMethod: s.biometricMethod,
        createdAt: new Date(s.createdAt).toISOString(),
        lastUsedAt: new Date(s.lastUsedAt).toISOString(),
        expiresAt: new Date(s.expiresAt).toISOString(),
        isCurrent: s.sessionId === currentSessionId,
      }));
  }

  public updateUserCredential(params: {
    userId: string;
    email: string;
    type: 'pin' | 'password';
    currentSecret?: string;
    newSecret: string;
  }): { ok: boolean; errorCode?: string; message?: string } {
    const { userId, email, type, currentSecret, newSecret } = params;
    const cleanNew = (newSecret || '').trim();
    let cred = this.state.credentials[userId];
    if (!cred) {
      cred = { userId, email, updatedAt: Date.now() };
      this.state.credentials[userId] = cred;
    }

    if (type === 'pin') {
      if (cleanNew.length < 4 || cleanNew.length > 6 || !/^\d+$/.test(cleanNew)) {
        return { ok: false, errorCode: 'INVALID_FORMAT', message: 'PIN must be 4 to 6 digits.' };
      }
      if (cred.pinHash) {
        if (!currentSecret || !verifySecretValue(currentSecret.trim(), cred.pinHash)) {
          return { ok: false, errorCode: 'INVALID_CURRENT', message: 'Current PIN is incorrect.' };
        }
      }
      cred.pinHash = hashSecretValue(cleanNew);
    } else {
      if (cleanNew.length < 6) {
        return { ok: false, errorCode: 'INVALID_FORMAT', message: 'Password must be at least 6 characters.' };
      }
      if (cred.passwordHash) {
        if (!currentSecret || !verifySecretValue(currentSecret.trim(), cred.passwordHash)) {
          return { ok: false, errorCode: 'INVALID_CURRENT', message: 'Current password is incorrect.' };
        }
      }
      cred.passwordHash = hashSecretValue(cleanNew);
    }

    cred.updatedAt = Date.now();
    this.persist();
    return { ok: true };
  }

  public getCredentialFlags(userId: string): { hasPin: boolean; hasPassword: boolean } {
    const cred = this.state.credentials[userId];
    return {
      hasPin: Boolean(cred?.pinHash),
      hasPassword: Boolean(cred?.passwordHash),
    };
  }
}

export const authStore = new AuthStore();

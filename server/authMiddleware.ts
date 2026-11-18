import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { getAuthTokenSecret, getNotificationAdminSecret } from './vapidConfig.ts';
import type { SessionUserPayload } from './types.ts';

export interface AuthenticatedRequest extends Request {
  authUser?: SessionUserPayload;
}

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function safeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function issueServerToken(params: {
  userId: string;
  email?: string;
  accountNumber?: string;
  role?: 'user' | 'admin';
  deviceId: string;
}): { token: string; expiresAt: number; sessionId: string } {
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + TOKEN_TTL_SECONDS;
  const sessionId = `srv_sid_${crypto.randomUUID()}`;

  const payload: SessionUserPayload = {
    userId: params.userId,
    email: params.email,
    accountNumber: params.accountNumber,
    role: params.role === 'admin' ? 'admin' : 'user',
    deviceId: params.deviceId,
    sessionId,
    iat: nowSec,
    exp: expSec,
  };

  const headerB64 = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const unsigned = `${headerB64}.${payloadB64}`;

  const signature = base64UrlEncode(
    crypto.createHmac('sha256', getAuthTokenSecret()).update(unsigned).digest()
  );

  return {
    token: `${unsigned}.${signature}`,
    expiresAt: expSec * 1000,
    sessionId,
  };
}

export function verifyServerToken(token: string): SessionUserPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;
    const unsigned = `${headerB64}.${payloadB64}`;
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', getAuthTokenSecret()).update(unsigned).digest()
    );

    if (!safeEqualStrings(signatureB64, expectedSig)) {
      return null;
    }

    const claims = JSON.parse(base64UrlDecode(payloadB64)) as SessionUserPayload;
    if (!claims?.userId || !claims?.exp || claims.exp * 1000 <= Date.now()) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ ok: false, error: 'Authentication token required.' });
    return;
  }

  const token = authHeader.slice(7).trim();
  const claims = verifyServerToken(token);
  if (!claims) {
    res.status(401).json({ ok: false, error: 'Invalid or expired authentication token.' });
    return;
  }

  req.authUser = claims;
  next();
}

export function requireAdminOrSecret(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const headerSecret = typeof req.headers['x-admin-secret'] === 'string'
    ? req.headers['x-admin-secret'].trim()
    : '';
  const adminSecret = getNotificationAdminSecret();

  if (headerSecret && safeEqualStrings(headerSecret, adminSecret)) {
    next();
    return;
  }

  if (req.authUser?.role === 'admin') {
    next();
    return;
  }

  res.status(403).json({
    ok: false,
    error: 'Forbidden: Administrative privileges or valid admin secret required.',
  });
}

const rateBuckets = new Map<string, number[]>();

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const clientKey = req.authUser?.userId || req.ip || 'unknown';
    const bucketKey = `${options.keyPrefix}:${clientKey}`;
    const cutoff = now - options.windowMs;

    const existing = rateBuckets.get(bucketKey) || [];
    const active = existing.filter((ts) => ts > cutoff);

    if (active.length >= options.maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((active[0] + options.windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        ok: false,
        error: 'Too many notification requests. Please wait before retrying.',
        retryAfterSeconds: retryAfterSec,
      });
      return;
    }

    active.push(now);
    rateBuckets.set(bucketKey, active);

    // Occasional cleanup to bound memory
    if (rateBuckets.size > 5000) {
      for (const [k, list] of rateBuckets.entries()) {
        if (!list.length || list[list.length - 1] <= cutoff) {
          rateBuckets.delete(k);
        }
      }
    }

    next();
  };
}

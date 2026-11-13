import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { authStore, type AccessTokenClaims, type ServerSessionRecord } from './server/authStore.ts';

interface AuthenticatedRequest extends express.Request {
  authClaims?: AccessTokenClaims;
  authSession?: ServerSessionRecord;
}

function requireAuth(
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
): void {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  const verification = authStore.verifyAccessToken(token);
  if (!verification.valid || !verification.claims || !verification.session) {
    const code = verification.code || 'UNAUTHORIZED';
    res.status(401).json({
      ok: false,
      errorCode: code,
      message:
        code === 'TOKEN_EXPIRED'
          ? 'Access token expired.'
          : code === 'SESSION_REVOKED'
            ? 'Session expired or revoked. Please sign in again.'
            : 'Authentication required.',
    });
    return;
  }

  req.authClaims = verification.claims;
  req.authSession = verification.session;
  next();
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // CORS support for native Capacitor Android/iOS origins
  app.use('/api', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // 1. Standard credential login (PIN or Password) -> issues short-lived access token + rotating refresh token
  app.post('/api/auth/login', (req, res) => {
    const { userId, email, authType, secret, deviceId, deviceLabel } = req.body || {};
    if (!userId || !secret) {
      res.status(400).json({
        ok: false,
        errorCode: 'BAD_REQUEST',
        message: 'User identifier and credential are required.',
      });
      return;
    }

    const result = authStore.authenticateUserLogin({
      userId: String(userId),
      email: String(email || 'customer@cbe.et'),
      authType: authType === 'password' ? 'password' : 'pin',
      secret: String(secret),
      deviceId: String(deviceId || 'default-device'),
      deviceLabel: String(deviceLabel || 'Mobile Device'),
    });

    if (!result.ok) {
      res.status(401).json(result);
      return;
    }

    res.json(result);
  });

  // 2. Refresh & rotate tokens after native OS biometric unlock
  app.post('/api/auth/refresh', (req, res) => {
    const { refreshToken, deviceId } = req.body || {};
    const result = authStore.rotateRefreshToken({
      refreshToken: String(refreshToken || ''),
      deviceId: deviceId ? String(deviceId) : undefined,
    });

    if (!result.ok) {
      res.status(401).json(result);
      return;
    }

    res.json(result);
  });

  // 3. Enroll biometric login on an authenticated session (returns fresh device-bound refresh token)
  app.post('/api/auth/biometric/enroll', requireAuth, (req: AuthenticatedRequest, res) => {
    const biometricMethod = req.body?.biometricMethod === 'faceid' ? 'faceid' : 'fingerprint';
    const result = authStore.enrollBiometrics({
      sessionId: req.authClaims!.sid,
      biometricMethod,
    });

    if (!result.ok) {
      res.status(401).json(result);
      return;
    }

    res.json(result);
  });

  // 4. Disable biometric login & invalidate previously sealed biometric refresh token
  app.post('/api/auth/biometric/disable', requireAuth, (req: AuthenticatedRequest, res) => {
    const result = authStore.disableBiometrics(req.authClaims!.sid);
    res.json(result);
  });

  // 5. Verify active session (protected endpoint check)
  app.get('/api/auth/verify', requireAuth, (req: AuthenticatedRequest, res) => {
    const flags = authStore.getCredentialFlags(req.authClaims!.sub);
    res.json({
      ok: true,
      userId: req.authClaims!.sub,
      sessionId: req.authClaims!.sid,
      expiresAt: req.authClaims!.exp * 1000,
      hasPin: flags.hasPin,
      hasPassword: flags.hasPassword,
    });
  });

  // 6. List active sessions/devices (protected)
  app.get('/api/auth/sessions', requireAuth, (req: AuthenticatedRequest, res) => {
    const sessions = authStore.listUserSessions(req.authClaims!.sub, req.authClaims!.sid);
    res.json({ ok: true, sessions });
  });

  // 7. Revoke a specific session or all other sessions (protected)
  app.post('/api/auth/sessions/revoke', requireAuth, (req: AuthenticatedRequest, res) => {
    const { targetSessionId, revokeOthers } = req.body || {};
    if (revokeOthers) {
      const revokedCount = authStore.revokeOtherSessions(req.authClaims!.sub, req.authClaims!.sid);
      res.json({ ok: true, revokedCount });
      return;
    }
    if (targetSessionId) {
      authStore.revokeSession(String(targetSessionId), 'Revoked from device settings', req.authClaims!.sub);
      res.json({ ok: true });
      return;
    }
    res.status(400).json({ ok: false, message: 'Specify targetSessionId or revokeOthers.' });
  });

  // 8. Update in-app/server PIN or Password hash (protected)
  app.post('/api/auth/security/update', requireAuth, (req: AuthenticatedRequest, res) => {
    const { type, currentSecret, newSecret } = req.body || {};
    const result = authStore.updateUserCredential({
      userId: req.authClaims!.sub,
      email: req.authClaims!.email,
      type: type === 'password' ? 'password' : 'pin',
      currentSecret: currentSecret ? String(currentSecret) : undefined,
      newSecret: String(newSecret || ''),
    });

    if (!result.ok) {
      res.status(400).json(result);
      return;
    }

    res.json({ ok: true });
  });

  // 9. Logout & revoke session server-side
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const { refreshToken } = req.body || {};

    if (bearer) {
      const check = authStore.verifyAccessToken(bearer);
      if (check.claims?.sid) {
        authStore.revokeSession(check.claims.sid, 'User logged out');
      }
    }
    if (refreshToken) {
      authStore.revokeByRefreshToken(String(refreshToken), 'User logged out');
    }

    res.json({ ok: true });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

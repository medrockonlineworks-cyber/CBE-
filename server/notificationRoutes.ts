import express from 'express';
import {
  type AuthenticatedRequest,
  createRateLimiter,
  issueServerToken,
  requireAdminOrSecret,
  requireAuth,
} from './authMiddleware.ts';
import {
  getAllSubscriptions,
  getPreferences,
  getSubscriptionsForUser,
  registerOrCheckDevice,
  removeSubscriptionByEndpoint,
  removeSubscriptionsForDeviceOrUser,
  savePreferences,
  upsertSubscription,
} from './jsonStore.ts';
import {
  sendUserNotification,
  verifyAndDispatchTransactionNotifications,
} from './notificationService.ts';
import { getPublicVapidKey } from './vapidConfig.ts';
import type { DevicePlatform, NotificationCategory } from './types.ts';

const VALID_CATEGORIES = new Set<NotificationCategory>([
  'money_received',
  'money_sent',
  'cash_deposit',
  'cash_withdrawal',
  'transaction_failed',
  'security_alert',
  'security_update',
  'account_update',
]);

const VALID_TX_TYPES = new Set([
  'transfer',
  'send',
  'receive',
  'deposit',
  'withdrawal',
  'bill',
  'airtime',
]);

function detectPlatform(rawPlatform: unknown, userAgent: string): DevicePlatform {
  if (rawPlatform === 'ios' || rawPlatform === 'android' || rawPlatform === 'desktop') {
    return rawPlatform;
  }
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return 'desktop';
}

function isValidPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== 'string') return false;
  const trimmed = endpoint.trim();
  if (trimmed.length < 16 || trimmed.length > 2048) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function createNotificationRouter(): express.Router {
  const router = express.Router();

  const authRateLimit = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 40,
    keyPrefix: 'auth_session',
  });

  const apiRateLimit = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 90,
    keyPrefix: 'notif_api',
  });

  const strictSendRateLimit = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
    keyPrefix: 'notif_send',
  });

  // 1. Issue signed backend API session token & check new-device access
  router.post('/api/auth/session', authRateLimit, async (req, res) => {
    try {
      const { userId, email, accountNumber, role, deviceId, deviceLabel, notifyNewDevice } = req.body || {};

      if (typeof userId !== 'string' || userId.trim().length < 2 || userId.trim().length > 100) {
        res.status(400).json({ ok: false, error: 'Valid userId is required.' });
        return;
      }

      const cleanUserId = userId.trim();
      const cleanDeviceId =
        typeof deviceId === 'string' && deviceId.trim().length >= 4
          ? deviceId.trim().slice(0, 128)
          : 'dev_default';
      const cleanDeviceLabel =
        typeof deviceLabel === 'string' && deviceLabel.trim()
          ? deviceLabel.trim().slice(0, 80)
          : 'Mobile Browser';
      const cleanEmail = typeof email === 'string' ? email.trim().slice(0, 160) : undefined;
      const cleanAccount =
        typeof accountNumber === 'string' ? accountNumber.replace(/\D/g, '').slice(0, 20) : undefined;
      const resolvedRole =
        role === 'admin' || cleanEmail === 'leykunjemaneh3@gmail.com' ? 'admin' : 'user';

      const deviceStatus = registerOrCheckDevice(cleanUserId, cleanDeviceId, cleanDeviceLabel);
      const issued = issueServerToken({
        userId: cleanUserId,
        email: cleanEmail,
        accountNumber: cleanAccount,
        role: resolvedRole,
        deviceId: cleanDeviceId,
      });

      // Notify existing registered devices if a genuinely new device signed in
      if (notifyNewDevice !== false && deviceStatus.isNewDevice && deviceStatus.hasPriorDevices) {
        void sendUserNotification({
          userId: cleanUserId,
          accountNumber: cleanAccount,
          category: 'security_alert',
        }).catch((err) => console.warn('[WebPush] New device alert skipped:', err));
      }

      res.json({
        ok: true,
        token: issued.token,
        expiresAt: issued.expiresAt,
        sessionId: issued.sessionId,
        isNewDevice: deviceStatus.isNewDevice,
      });
    } catch (err) {
      console.error('[AuthSession] Error:', err);
      res.status(500).json({ ok: false, error: 'Failed to establish backend notification session.' });
    }
  });

  // 2. Public VAPID Key endpoint (only public key, never private key)
  router.get('/api/notifications/vapid-public-key', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, publicKey: getPublicVapidKey() });
  });

  // 3. Subscribe device to Web Push
  router.post(
    '/api/notifications/subscribe',
    requireAuth,
    apiRateLimit,
    (req: AuthenticatedRequest, res) => {
      try {
        const authUser = req.authUser!;
        const { subscription, deviceLabel, platform, accountNumber } = req.body || {};

        if (!subscription || !isValidPushEndpoint(subscription.endpoint)) {
          res.status(400).json({ ok: false, error: 'Valid HTTPS push subscription endpoint is required.' });
          return;
        }

        const p256dh = subscription?.keys?.p256dh;
        const auth = subscription?.keys?.auth;
        if (typeof p256dh !== 'string' || p256dh.length < 16 || typeof auth !== 'string' || auth.length < 8) {
          res.status(400).json({ ok: false, error: 'Valid Web Push subscription keys (p256dh, auth) are required.' });
          return;
        }

        const userAgent = String(req.headers['user-agent'] || '');
        const resolvedPlatform = detectPlatform(platform, userAgent);
        const resolvedLabel =
          typeof deviceLabel === 'string' && deviceLabel.trim()
            ? deviceLabel.trim().slice(0, 80)
            : resolvedPlatform === 'ios'
              ? 'iPhone PWA'
              : resolvedPlatform === 'android'
                ? 'Android PWA'
                : 'Desktop Browser';

        const result = upsertSubscription({
          userId: authUser.userId,
          accountNumber:
            typeof accountNumber === 'string' && accountNumber.trim()
              ? accountNumber.replace(/\D/g, '')
              : authUser.accountNumber,
          deviceId: authUser.deviceId,
          deviceLabel: resolvedLabel,
          platform: resolvedPlatform,
          userAgent: userAgent.slice(0, 240),
          subscription: {
            endpoint: subscription.endpoint,
            expirationTime:
              typeof subscription.expirationTime === 'number' || subscription.expirationTime === null
                ? subscription.expirationTime
                : null,
            keys: { p256dh, auth },
          },
        });

        // Ensure notifications master flag is enabled upon explicit subscription
        const prefs = savePreferences(authUser.userId, { enabled: true });
        const userSubs = getSubscriptionsForUser(authUser.userId, authUser.accountNumber);

        res.status(result.created ? 201 : 200).json({
          ok: true,
          created: result.created,
          subscriptionId: result.subscription.id,
          deviceCount: userSubs.length,
          preferences: prefs,
        });
      } catch (err) {
        console.error('[WebPush] Subscribe error:', err);
        res.status(500).json({ ok: false, error: 'Failed to store device push subscription.' });
      }
    }
  );

  // 4. Unsubscribe device from Web Push
  router.post(
    '/api/notifications/unsubscribe',
    requireAuth,
    apiRateLimit,
    (req: AuthenticatedRequest, res) => {
      try {
        const authUser = req.authUser!;
        const { endpoint, allDevices } = req.body || {};
        let removed = 0;

        if (allDevices === true) {
          removed = removeSubscriptionsForDeviceOrUser(authUser.userId);
        } else if (typeof endpoint === 'string' && endpoint.trim()) {
          removed = removeSubscriptionByEndpoint(endpoint, authUser.userId);
        } else {
          removed = removeSubscriptionsForDeviceOrUser(authUser.userId, authUser.deviceId);
        }

        const remaining = getSubscriptionsForUser(authUser.userId, authUser.accountNumber);
        const prefs =
          remaining.length === 0
            ? savePreferences(authUser.userId, { enabled: false })
            : getPreferences(authUser.userId);

        res.json({
          ok: true,
          removed,
          deviceCount: remaining.length,
          preferences: prefs,
        });
      } catch (err) {
        console.error('[WebPush] Unsubscribe error:', err);
        res.status(500).json({ ok: false, error: 'Failed to remove push subscription.' });
      }
    }
  );

  // 5. Get user's notification status, subscribed devices & preferences
  router.get(
    '/api/notifications/status',
    requireAuth,
    apiRateLimit,
    (req: AuthenticatedRequest, res) => {
      res.setHeader('Cache-Control', 'no-store');
      const authUser = req.authUser!;
      const endpointQuery = typeof req.query.endpoint === 'string' ? req.query.endpoint.trim() : '';
      const subs = getSubscriptionsForUser(authUser.userId, authUser.accountNumber);
      const prefs = getPreferences(authUser.userId);

      const endpointMatched = endpointQuery
        ? subs.some((s) => s.endpoint === endpointQuery)
        : subs.some((s) => s.deviceId === authUser.deviceId);

      res.json({
        ok: true,
        vapidPublicKey: getPublicVapidKey(),
        subscribed: subs.length > 0 && endpointMatched,
        hasAnySubscription: subs.length > 0,
        deviceCount: subs.length,
        devices: subs.map((s) => ({
          id: s.id,
          deviceLabel: s.deviceLabel,
          platform: s.platform,
          isCurrentDevice: endpointQuery ? s.endpoint === endpointQuery : s.deviceId === authUser.deviceId,
          updatedAt: s.updatedAt,
          lastSuccessAt: s.lastSuccessAt,
        })),
        preferences: prefs,
      });
    }
  );

  // 6. Update notification category & lock-screen privacy preferences
  router.put(
    '/api/notifications/preferences',
    requireAuth,
    apiRateLimit,
    (req: AuthenticatedRequest, res) => {
      try {
        const authUser = req.authUser!;
        const body = req.body || {};
        const patch: Record<string, unknown> = {};

        const booleanKeys = [
          'enabled',
          'transactionNotifications',
          'depositNotifications',
          'withdrawalNotifications',
          'transferNotifications',
          'securityNotifications',
        ] as const;

        for (const key of booleanKeys) {
          if (typeof body[key] === 'boolean') {
            patch[key] = body[key];
          }
        }

        if (body.privacyMode === 'detailed' || body.privacyMode === 'private') {
          patch.privacyMode = body.privacyMode;
        }

        const updated = savePreferences(authUser.userId, patch);
        res.json({ ok: true, preferences: updated });
      } catch (err) {
        console.error('[WebPush] Preferences update error:', err);
        res.status(500).json({ ok: false, error: 'Failed to save notification preferences.' });
      }
    }
  );

  // 7. Send Test Notification to authenticated user's devices
  router.post(
    '/api/notifications/test',
    requireAuth,
    strictSendRateLimit,
    async (req: AuthenticatedRequest, res) => {
      try {
        const authUser = req.authUser!;
        const { sampleCategory, amount } = req.body || {};
        const category = VALID_CATEGORIES.has(sampleCategory) ? sampleCategory : 'test';
        const numericAmount =
          typeof amount === 'number' && Number.isFinite(amount) && amount > 0 ? amount : 2500;

        const result = await sendUserNotification({
          userId: authUser.userId,
          accountNumber: authUser.accountNumber,
          category,
          amount: numericAmount,
          bypassCategoryToggle: true,
        });

        if (result.skippedReason && result.sent === 0) {
          res.status(400).json({
            ok: false,
            error: 'No active push subscription found on this device. Tap Enable Notifications first.',
            ...result,
          });
          return;
        }

        res.json({
          ok: result.sent > 0,
          ...result,
          message:
            result.sent > 0
              ? `Test notification sent to ${result.sent} device(s).`
              : 'Notification could not be delivered to registered endpoints.',
        });
      } catch (err) {
        console.error('[WebPush] Test notification error:', err);
        res.status(500).json({ ok: false, error: 'Failed to dispatch test notification.' });
      }
    }
  );

  // 8. Admin / Protected Notification Send endpoint
  router.post(
    '/api/notifications/send',
    requireAuth,
    requireAdminOrSecret,
    strictSendRateLimit,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { targetUserId, accountNumber, category, amount, txId, reference, title, message } =
          req.body || {};

        if (!VALID_CATEGORIES.has(category)) {
          res.status(400).json({ ok: false, error: 'Invalid banking notification category.' });
          return;
        }

        if (amount !== undefined && (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0)) {
          res.status(400).json({ ok: false, error: 'Amount must be a positive number.' });
          return;
        }

        if (targetUserId === '*') {
          const allSubs = getAllSubscriptions();
          const uniqueUsers = Array.from(new Set(allSubs.map((s) => s.userId)));
          let totalSent = 0;
          let totalFailed = 0;
          let totalExpired = 0;

          for (const uid of uniqueUsers) {
            const r = await sendUserNotification({
              userId: uid,
              category,
              amount,
              txId,
              reference,
              customTitle: title,
              customMessage: message,
            });
            totalSent += r.sent;
            totalFailed += r.failed;
            totalExpired += r.removedExpired;
          }

          res.json({
            ok: true,
            broadcastUsers: uniqueUsers.length,
            sent: totalSent,
            failed: totalFailed,
            removedExpired: totalExpired,
          });
          return;
        }

        if (typeof targetUserId !== 'string' || !targetUserId.trim()) {
          res.status(400).json({ ok: false, error: 'targetUserId is required.' });
          return;
        }

        const result = await sendUserNotification({
          userId: targetUserId.trim(),
          accountNumber: typeof accountNumber === 'string' ? accountNumber : undefined,
          category,
          amount,
          txId,
          reference,
          customTitle: title,
          customMessage: message,
        });

        res.json({ ok: true, ...result });
      } catch (err) {
        console.error('[WebPush] Admin send error:', err);
        res.status(500).json({ ok: false, error: 'Failed to send notification.' });
      }
    }
  );

  // 9. Verified Banking Transaction Notification Endpoint
  router.post(
    '/api/notifications/send-transaction',
    requireAuth,
    strictSendRateLimit,
    async (req: AuthenticatedRequest, res) => {
      try {
        const authUser = req.authUser!;
        const tx = req.body || {};

        if (typeof tx.id !== 'string' || tx.id.trim().length < 4) {
          res.status(400).json({ ok: false, error: 'Verified transaction ID is required.' });
          return;
        }

        if (!VALID_TX_TYPES.has(tx.type)) {
          res.status(400).json({ ok: false, error: 'Invalid transaction type.' });
          return;
        }

        if (tx.status !== 'success' && tx.status !== 'failed') {
          res.status(400).json({ ok: false, error: 'Transaction status must be success or failed.' });
          return;
        }

        const numericAmount = Number(tx.amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 1_000_000_000) {
          res.status(400).json({ ok: false, error: 'Transaction amount must be a valid positive number.' });
          return;
        }

        // Verify caller owns the transaction (sender, recipient, or admin)
        const isOwner =
          tx.senderId === authUser.userId ||
          tx.recipientId === authUser.userId ||
          (authUser.accountNumber &&
            (tx.senderAccount?.replace(/\D/g, '') === authUser.accountNumber ||
              tx.recipientAccount?.replace(/\D/g, '') === authUser.accountNumber)) ||
          authUser.role === 'admin';

        if (!isOwner) {
          res.status(403).json({
            ok: false,
            error: 'Unauthorized: transaction does not belong to authenticated account.',
          });
          return;
        }

        const result = await verifyAndDispatchTransactionNotifications({
          id: tx.id.trim(),
          reference: typeof tx.reference === 'string' && tx.reference.trim() ? tx.reference.trim() : tx.id.trim(),
          type: tx.type,
          status: tx.status,
          amount: numericAmount,
          fee: Number(tx.fee || 0),
          currency: typeof tx.currency === 'string' ? tx.currency : 'ETB',
          senderId: typeof tx.senderId === 'string' ? tx.senderId : undefined,
          senderAccount: typeof tx.senderAccount === 'string' ? tx.senderAccount : undefined,
          senderName: typeof tx.senderName === 'string' ? tx.senderName : undefined,
          recipientId: typeof tx.recipientId === 'string' ? tx.recipientId : undefined,
          recipientAccount: typeof tx.recipientAccount === 'string' ? tx.recipientAccount : undefined,
          recipientName: typeof tx.recipientName === 'string' ? tx.recipientName : undefined,
          description: typeof tx.description === 'string' ? tx.description : undefined,
          createdAt: typeof tx.createdAt === 'string' ? tx.createdAt : new Date().toISOString(),
        });

        res.json({ ok: true, ...result });
      } catch (err) {
        console.error('[WebPush] Send-transaction error:', err);
        res.status(500).json({ ok: false, error: 'Failed to verify and dispatch transaction notifications.' });
      }
    }
  );

  // 10. Authenticated Security / Account Event Notification endpoint
  router.post(
    '/api/notifications/security-event',
    requireAuth,
    strictSendRateLimit,
    async (req: AuthenticatedRequest, res) => {
      try {
        const authUser = req.authUser!;
        const { category } = req.body || {};

        if (category !== 'security_alert' && category !== 'security_update' && category !== 'account_update') {
          res.status(400).json({ ok: false, error: 'Invalid security or account event category.' });
          return;
        }

        const result = await sendUserNotification({
          userId: authUser.userId,
          accountNumber: authUser.accountNumber,
          category,
        });

        res.json({ ok: true, ...result });
      } catch (err) {
        console.error('[WebPush] Security event error:', err);
        res.status(500).json({ ok: false, error: 'Failed to dispatch security notification.' });
      }
    }
  );

  return router;
}

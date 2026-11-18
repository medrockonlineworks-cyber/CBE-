import { sendNotification } from 'web-push';
import { initVapidAndSecrets } from './vapidConfig.ts';
import {
  appendNotificationAudit,
  getPreferences,
  getSubscriptionsForUser,
  markSubscriptionSuccess,
  markTransactionDispatched,
  recordVerifiedTransaction,
  removeExpiredEndpoints,
} from './jsonStore.ts';
import type {
  NotificationCategory,
  NotificationPreferences,
  PrivacyMode,
  StoredSubscription,
} from './types.ts';

const APP_DISPLAY_NAME = 'CBE Mobil';
const APP_ICON_URL = '/pwa-192x192.png';
const APP_BADGE_URL = '/pwa-192x192.png';

export function formatEtbAmount(amount: number): string {
  return `ETB ${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function sanitizeText(raw?: string): string {
  if (!raw) return '';
  // Redact any accidental credential/OTP/PIN tokens
  return raw
    .replace(/\b(pin|otp|password|passcode|cvv|secret)\s*[:=]?\s*\S+/gi, '[REDACTED]')
    .trim()
    .slice(0, 220);
}

function isCategoryAllowed(
  prefs: NotificationPreferences,
  category: NotificationCategory
): boolean {
  if (!prefs.enabled) return false;

  switch (category) {
    case 'money_received':
    case 'money_sent':
      return prefs.transactionNotifications && prefs.transferNotifications;
    case 'cash_deposit':
      return prefs.transactionNotifications && prefs.depositNotifications;
    case 'cash_withdrawal':
      return prefs.transactionNotifications && prefs.withdrawalNotifications;
    case 'transaction_failed':
      return prefs.transactionNotifications;
    case 'security_alert':
    case 'security_update':
    case 'account_update':
      return prefs.securityNotifications;
    default:
      return true;
  }
}

function isTransactionCategory(category: NotificationCategory): boolean {
  return (
    category === 'money_received' ||
    category === 'money_sent' ||
    category === 'cash_deposit' ||
    category === 'cash_withdrawal' ||
    category === 'transaction_failed'
  );
}

export interface BuiltNotificationPayload {
  appName: string;
  title: string;
  body: string;
  icon: string;
  badge: string;
  timestamp: number;
  category: NotificationCategory | 'test';
  tag: string;
  url: string;
  txId?: string;
  reference?: string;
  amountFormatted?: string;
  privacyMode: PrivacyMode;
}

export function buildNotificationContent(params: {
  category: NotificationCategory | 'test';
  amount?: number;
  txId?: string;
  reference?: string;
  privacyMode: PrivacyMode;
  customTitle?: string;
  customMessage?: string;
}): BuiltNotificationPayload {
  const formattedAmount =
    typeof params.amount === 'number' && Number.isFinite(params.amount) && params.amount > 0
      ? formatEtbAmount(params.amount)
      : undefined;

  const isPrivateTx =
    params.privacyMode === 'private' &&
    (params.category === 'test' || isTransactionCategory(params.category));

  let title = APP_DISPLAY_NAME;
  let body = 'You have a new banking notification.';
  let url = '/';

  if (params.txId) {
    url = `/?tx=${encodeURIComponent(params.txId)}`;
  }

  if (isPrivateTx) {
    title = APP_DISPLAY_NAME;
    body = 'You have a new account transaction.';
  } else {
    switch (params.category) {
      case 'money_received':
        title = 'Money Received';
        body = formattedAmount
          ? `You have received ${formattedAmount} successfully.`
          : 'You have received funds in your account successfully.';
        break;
      case 'money_sent':
        title = 'Transfer Successful';
        body = formattedAmount
          ? `Your transfer of ${formattedAmount} has been completed successfully.`
          : 'Your transfer has been completed successfully.';
        break;
      case 'cash_deposit':
        title = 'Cash Deposit';
        body = formattedAmount
          ? `A deposit of ${formattedAmount} has been credited to your account.`
          : 'A cash deposit has been credited to your account.';
        break;
      case 'cash_withdrawal':
        title = 'Withdrawal Successful';
        body = formattedAmount
          ? `Your withdrawal of ${formattedAmount} has been processed successfully.`
          : 'Your withdrawal has been processed successfully.';
        break;
      case 'transaction_failed':
        title = 'Transaction Failed';
        body = 'Your transaction could not be completed. Please check your transaction history.';
        url = params.txId ? `/?tx=${encodeURIComponent(params.txId)}` : '/?tab=history';
        break;
      case 'security_alert':
        title = 'Security Alert';
        body = 'A new device has accessed your account.';
        url = '/?tab=profile';
        break;
      case 'security_update':
        title = 'Security Update';
        body = 'Your account security information has been updated.';
        url = '/?tab=profile';
        break;
      case 'account_update':
        title = 'Account Update';
        body = 'Your banking account information has been updated successfully.';
        url = '/?tab=profile';
        break;
      case 'test':
        title = sanitizeText(params.customTitle) || 'CBE Mobil Alerts Active';
        body =
          sanitizeText(params.customMessage) ||
          'Native Lock Screen & Notification Center alerts are configured on this device.';
        url = '/?tab=profile';
        break;
    }
  }

  // Never include sensitive credentials in payload
  return {
    appName: APP_DISPLAY_NAME,
    title: sanitizeText(title),
    body: sanitizeText(body),
    icon: APP_ICON_URL,
    badge: APP_BADGE_URL,
    timestamp: Date.now(),
    category: params.category,
    tag: params.txId ? `cbe-tx-${params.txId}` : `cbe-${params.category}-${Date.now()}`,
    url,
    txId: params.txId,
    reference: params.reference,
    amountFormatted: isPrivateTx ? undefined : formattedAmount,
    privacyMode: params.privacyMode,
  };
}

export async function dispatchToSubscriptions(
  subscriptions: StoredSubscription[],
  payload: BuiltNotificationPayload
): Promise<{ sent: number; failed: number; removedExpired: number }> {
  initVapidAndSecrets();

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, removedExpired: 0 };
  }

  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await sendNotification(
          {
            endpoint: sub.endpoint,
            expirationTime: sub.expirationTime,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          JSON.stringify(payload),
          {
            TTL: 86400,
            urgency: 'high',
          }
        );
        sent++;
        markSubscriptionSuccess(sub.endpoint);
      } catch (err: unknown) {
        failed++;
        const statusCode =
          typeof err === 'object' && err !== null && 'statusCode' in err
            ? Number((err as { statusCode?: number }).statusCode)
            : 0;
        const body =
          typeof err === 'object' && err !== null && 'body' in err
            ? String((err as { body?: string }).body || '')
            : '';

        if (
          statusCode === 404 ||
          statusCode === 410 ||
          body.includes('Unregistered') ||
          body.includes('BadDeviceToken') ||
          body.includes('Expired')
        ) {
          expiredEndpoints.push(sub.endpoint);
        } else {
          console.warn(
            `[WebPush] Delivery error (${statusCode || 'unknown'}) for ${sub.platform} endpoint:`,
            body || (err instanceof Error ? err.message : String(err))
          );
        }
      }
    })
  );

  const removedExpired = removeExpiredEndpoints(expiredEndpoints);
  return { sent, failed, removedExpired };
}

export async function sendUserNotification(params: {
  userId: string;
  accountNumber?: string;
  category: NotificationCategory | 'test';
  amount?: number;
  txId?: string;
  reference?: string;
  customTitle?: string;
  customMessage?: string;
  bypassCategoryToggle?: boolean;
}): Promise<{
  sent: number;
  failed: number;
  removedExpired: number;
  skippedReason?: string;
}> {
  const prefs = getPreferences(params.userId);

  if (params.category !== 'test' && !params.bypassCategoryToggle) {
    if (!isCategoryAllowed(prefs, params.category)) {
      return {
        sent: 0,
        failed: 0,
        removedExpired: 0,
        skippedReason: `Disabled by user preference (${params.category})`,
      };
    }
  }

  const subscriptions = getSubscriptionsForUser(params.userId, params.accountNumber);
  if (subscriptions.length === 0) {
    return {
      sent: 0,
      failed: 0,
      removedExpired: 0,
      skippedReason: 'No active push subscriptions for target user',
    };
  }

  const payload = buildNotificationContent({
    category: params.category,
    amount: params.amount,
    txId: params.txId,
    reference: params.reference,
    privacyMode: prefs.privacyMode,
    customTitle: params.customTitle,
    customMessage: params.customMessage,
  });

  const result = await dispatchToSubscriptions(subscriptions, payload);

  appendNotificationAudit({
    category: params.category,
    targetUserId: params.userId,
    txId: params.txId,
    privacyMode: prefs.privacyMode,
    deliveredCount: result.sent,
    failedCount: result.failed,
    removedExpiredCount: result.removedExpired,
  });

  return result;
}

export async function verifyAndDispatchTransactionNotifications(txInput: {
  id: string;
  reference: string;
  type: 'transfer' | 'send' | 'receive' | 'deposit' | 'withdrawal' | 'bill' | 'airtime';
  status: 'success' | 'failed';
  amount: number;
  fee?: number;
  currency?: string;
  senderId?: string;
  senderAccount?: string;
  senderName?: string;
  recipientId?: string;
  recipientAccount?: string;
  recipientName?: string;
  description?: string;
  createdAt?: string;
}): Promise<{
  verified: boolean;
  alreadyDispatched?: boolean;
  dispatches: Array<{
    role: 'sender' | 'recipient';
    userId: string;
    category: NotificationCategory;
    sent: number;
    failed: number;
    removedExpired: number;
    skippedReason?: string;
  }>;
}> {
  // 1. Validate & commit/verify on trusted server store before dispatching any notification
  const { record, alreadyDispatched } = recordVerifiedTransaction({
    id: txInput.id,
    reference: txInput.reference || txInput.id,
    type: txInput.type,
    status: txInput.status,
    amount: Number(txInput.amount),
    fee: Number(txInput.fee || 0),
    currency: txInput.currency || 'ETB',
    senderId: txInput.senderId,
    senderAccount: txInput.senderAccount,
    senderName: sanitizeText(txInput.senderName),
    recipientId: txInput.recipientId,
    recipientAccount: txInput.recipientAccount,
    recipientName: sanitizeText(txInput.recipientName),
    description: sanitizeText(txInput.description),
    createdAt: txInput.createdAt || new Date().toISOString(),
  });

  if (alreadyDispatched) {
    return { verified: true, alreadyDispatched: true, dispatches: [] };
  }

  const dispatches: Array<{
    role: 'sender' | 'recipient';
    userId: string;
    category: NotificationCategory;
    sent: number;
    failed: number;
    removedExpired: number;
    skippedReason?: string;
  }> = [];

  // 2. If transaction failed, notify initiator only
  if (record.status === 'failed') {
    const targetUserId = record.senderId || record.recipientId;
    if (targetUserId) {
      const res = await sendUserNotification({
        userId: targetUserId,
        accountNumber: record.senderAccount || record.recipientAccount,
        category: 'transaction_failed',
        amount: record.amount,
        txId: record.id,
        reference: record.reference,
      });
      dispatches.push({
        role: 'sender',
        userId: targetUserId,
        category: 'transaction_failed',
        ...res,
      });
    }
    markTransactionDispatched(record.id);
    return { verified: true, dispatches };
  }

  // 3. Confirmed successful transaction notifications
  if (record.type === 'deposit' || record.type === 'receive') {
    const receiverId = record.recipientId || record.senderId;
    if (receiverId) {
      const category: NotificationCategory =
        record.type === 'deposit' ? 'cash_deposit' : 'money_received';
      const res = await sendUserNotification({
        userId: receiverId,
        accountNumber: record.recipientAccount || record.senderAccount,
        category,
        amount: record.amount,
        txId: record.id,
        reference: record.reference,
      });
      dispatches.push({
        role: 'recipient',
        userId: receiverId,
        category,
        ...res,
      });
    }
  } else if (record.type === 'withdrawal') {
    const ownerId = record.senderId || record.recipientId;
    if (ownerId) {
      const res = await sendUserNotification({
        userId: ownerId,
        accountNumber: record.senderAccount,
        category: 'cash_withdrawal',
        amount: record.amount,
        txId: record.id,
        reference: record.reference,
      });
      dispatches.push({
        role: 'sender',
        userId: ownerId,
        category: 'cash_withdrawal',
        ...res,
      });
    }
  } else {
    // transfer | send | bill | airtime
    if (record.senderId) {
      const senderRes = await sendUserNotification({
        userId: record.senderId,
        accountNumber: record.senderAccount,
        category: 'money_sent',
        amount: record.amount,
        txId: record.id,
        reference: record.reference,
      });
      dispatches.push({
        role: 'sender',
        userId: record.senderId,
        category: 'money_sent',
        ...senderRes,
      });
    }

    // Also notify recipient account holder if registered & distinct from sender
    const hasRecipientTarget = Boolean(record.recipientId || record.recipientAccount);
    const sameUser =
      Boolean(record.recipientId) &&
      Boolean(record.senderId) &&
      record.recipientId === record.senderId &&
      record.recipientAccount === record.senderAccount;

    if (hasRecipientTarget && !sameUser) {
      const recUserId = record.recipientId || `acct_${record.recipientAccount}`;
      const recRes = await sendUserNotification({
        userId: recUserId,
        accountNumber: record.recipientAccount,
        category: 'money_received',
        amount: record.amount,
        txId: record.id,
        reference: record.reference,
      });
      dispatches.push({
        role: 'recipient',
        userId: recUserId,
        category: 'money_received',
        ...recRes,
      });
    }
  }

  markTransactionDispatched(record.id);
  return { verified: true, dispatches };
}

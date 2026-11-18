export type NotificationCategory =
  | 'money_received'
  | 'money_sent'
  | 'cash_deposit'
  | 'cash_withdrawal'
  | 'transaction_failed'
  | 'security_alert'
  | 'security_update'
  | 'account_update';

export type PrivacyMode = 'detailed' | 'private';

export type DevicePlatform = 'ios' | 'android' | 'desktop';

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface IncomingPushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: PushSubscriptionKeys;
}

export interface StoredSubscription {
  id: string;
  userId: string;
  accountNumber?: string;
  deviceId: string;
  deviceLabel: string;
  platform: DevicePlatform;
  endpoint: string;
  expirationTime: number | null;
  keys: PushSubscriptionKeys;
  userAgent: string;
  createdAt: string;
  updatedAt: string;
  lastSuccessAt?: string;
}

export interface NotificationPreferences {
  userId: string;
  enabled: boolean;
  transactionNotifications: boolean;
  depositNotifications: boolean;
  withdrawalNotifications: boolean;
  transferNotifications: boolean;
  securityNotifications: boolean;
  privacyMode: PrivacyMode;
  updatedAt: string;
}

export interface VerifiedTransactionRecord {
  id: string;
  reference: string;
  type: 'transfer' | 'send' | 'receive' | 'deposit' | 'withdrawal' | 'bill' | 'airtime';
  status: 'success' | 'failed';
  amount: number;
  fee: number;
  currency: string;
  senderId?: string;
  senderAccount?: string;
  senderName?: string;
  recipientId?: string;
  recipientAccount?: string;
  recipientName?: string;
  description?: string;
  createdAt: string;
  recordedAt: string;
  verifiedByServer: boolean;
  notificationsDispatched: boolean;
}

export interface KnownDeviceRecord {
  userId: string;
  deviceId: string;
  deviceLabel: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface NotificationAuditEntry {
  id: string;
  category: NotificationCategory | 'test';
  targetUserId: string;
  txId?: string;
  privacyMode: PrivacyMode;
  deliveredCount: number;
  failedCount: number;
  removedExpiredCount: number;
  createdAt: string;
}

export interface SessionUserPayload {
  userId: string;
  email?: string;
  accountNumber?: string;
  role: 'user' | 'admin';
  deviceId: string;
  sessionId: string;
  iat: number;
  exp: number;
}

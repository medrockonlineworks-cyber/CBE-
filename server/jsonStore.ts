import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  DevicePlatform,
  IncomingPushSubscription,
  KnownDeviceRecord,
  NotificationAuditEntry,
  NotificationPreferences,
  StoredSubscription,
  VerifiedTransactionRecord,
} from './types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'push-subscriptions.json');
const PREFERENCES_FILE = path.join(DATA_DIR, 'push-preferences.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'verified-transactions.json');
const DEVICES_FILE = path.join(DATA_DIR, 'known-devices.json');
const AUDIT_FILE = path.join(DATA_DIR, 'notification-audit.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
}

function readJsonArray<T>(filePath: string): T[] {
  ensureDataDir();
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeJsonAtomic(filePath: string, data: unknown): void {
  ensureDataDir();
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmpPath, filePath);
}

function cleanAccountDigits(val?: string): string {
  return (val || '').replace(/\D/g, '');
}

export function getAllSubscriptions(): StoredSubscription[] {
  return readJsonArray<StoredSubscription>(SUBSCRIPTIONS_FILE);
}

export function getSubscriptionsForUser(userId: string, accountNumber?: string): StoredSubscription[] {
  const all = getAllSubscriptions();
  const targetAcc = cleanAccountDigits(accountNumber);
  const seenEndpoints = new Set<string>();
  const matched: StoredSubscription[] = [];

  for (const sub of all) {
    const matchesUser = sub.userId === userId;
    const matchesAccount = Boolean(targetAcc) && cleanAccountDigits(sub.accountNumber) === targetAcc;
    if ((matchesUser || matchesAccount) && !seenEndpoints.has(sub.endpoint)) {
      seenEndpoints.add(sub.endpoint);
      matched.push(sub);
    }
  }
  return matched;
}

export function upsertSubscription(params: {
  userId: string;
  accountNumber?: string;
  deviceId: string;
  deviceLabel: string;
  platform: DevicePlatform;
  userAgent: string;
  subscription: IncomingPushSubscription;
}): { subscription: StoredSubscription; created: boolean } {
  const all = getAllSubscriptions();
  const now = new Date().toISOString();
  const endpoint = params.subscription.endpoint.trim();

  // Prevent duplicates by endpoint (one push endpoint corresponds to one browser profile/install)
  const existingIdx = all.findIndex((s) => s.endpoint === endpoint);

  if (existingIdx !== -1) {
    const updated: StoredSubscription = {
      ...all[existingIdx],
      userId: params.userId,
      accountNumber: params.accountNumber || all[existingIdx].accountNumber,
      deviceId: params.deviceId || all[existingIdx].deviceId,
      deviceLabel: params.deviceLabel || all[existingIdx].deviceLabel,
      platform: params.platform || all[existingIdx].platform,
      expirationTime:
        params.subscription.expirationTime !== undefined
          ? params.subscription.expirationTime
          : all[existingIdx].expirationTime,
      keys: {
        p256dh: params.subscription.keys.p256dh,
        auth: params.subscription.keys.auth,
      },
      userAgent: params.userAgent || all[existingIdx].userAgent,
      updatedAt: now,
    };
    all[existingIdx] = updated;
    writeJsonAtomic(SUBSCRIPTIONS_FILE, all);
    return { subscription: updated, created: false };
  }

  const createdSub: StoredSubscription = {
    id: `sub_${crypto.randomUUID()}`,
    userId: params.userId,
    accountNumber: params.accountNumber,
    deviceId: params.deviceId,
    deviceLabel: params.deviceLabel,
    platform: params.platform,
    endpoint,
    expirationTime: params.subscription.expirationTime ?? null,
    keys: {
      p256dh: params.subscription.keys.p256dh,
      auth: params.subscription.keys.auth,
    },
    userAgent: params.userAgent,
    createdAt: now,
    updatedAt: now,
  };

  all.push(createdSub);
  writeJsonAtomic(SUBSCRIPTIONS_FILE, all);
  return { subscription: createdSub, created: true };
}

export function removeSubscriptionByEndpoint(endpoint: string, userId?: string): number {
  const all = getAllSubscriptions();
  const trimmed = endpoint.trim();
  const filtered = all.filter((s) => {
    if (s.endpoint !== trimmed) return true;
    if (userId && s.userId !== userId) return true;
    return false;
  });
  const removed = all.length - filtered.length;
  if (removed > 0) {
    writeJsonAtomic(SUBSCRIPTIONS_FILE, filtered);
  }
  return removed;
}

export function removeSubscriptionsForDeviceOrUser(userId: string, deviceId?: string): number {
  const all = getAllSubscriptions();
  const filtered = all.filter((s) => {
    if (s.userId !== userId) return true;
    if (deviceId && s.deviceId !== deviceId) return true;
    return false;
  });
  const removed = all.length - filtered.length;
  if (removed > 0) {
    writeJsonAtomic(SUBSCRIPTIONS_FILE, filtered);
  }
  return removed;
}

export function removeExpiredEndpoints(endpoints: string[]): number {
  if (!endpoints.length) return 0;
  const expiredSet = new Set(endpoints);
  const all = getAllSubscriptions();
  const filtered = all.filter((s) => !expiredSet.has(s.endpoint));
  const removed = all.length - filtered.length;
  if (removed > 0) {
    writeJsonAtomic(SUBSCRIPTIONS_FILE, filtered);
  }
  return removed;
}

export function markSubscriptionSuccess(endpoint: string): void {
  const all = getAllSubscriptions();
  const idx = all.findIndex((s) => s.endpoint === endpoint);
  if (idx !== -1) {
    all[idx].lastSuccessAt = new Date().toISOString();
    writeJsonAtomic(SUBSCRIPTIONS_FILE, all);
  }
}

export function getDefaultPreferences(userId: string): NotificationPreferences {
  return {
    userId,
    enabled: true,
    transactionNotifications: true,
    depositNotifications: true,
    withdrawalNotifications: true,
    transferNotifications: true,
    securityNotifications: true,
    privacyMode: 'detailed',
    updatedAt: new Date().toISOString(),
  };
}

export function getPreferences(userId: string): NotificationPreferences {
  const all = readJsonArray<NotificationPreferences>(PREFERENCES_FILE);
  const found = all.find((p) => p.userId === userId);
  return found || getDefaultPreferences(userId);
}

export function savePreferences(
  userId: string,
  patch: Partial<Omit<NotificationPreferences, 'userId' | 'updatedAt'>>
): NotificationPreferences {
  const all = readJsonArray<NotificationPreferences>(PREFERENCES_FILE);
  const idx = all.findIndex((p) => p.userId === userId);
  const base = idx !== -1 ? all[idx] : getDefaultPreferences(userId);
  const updated: NotificationPreferences = {
    ...base,
    ...patch,
    userId,
    privacyMode: patch.privacyMode === 'private' ? 'private' : patch.privacyMode === 'detailed' ? 'detailed' : base.privacyMode,
    updatedAt: new Date().toISOString(),
  };

  if (idx !== -1) {
    all[idx] = updated;
  } else {
    all.push(updated);
  }
  writeJsonAtomic(PREFERENCES_FILE, all);
  return updated;
}

export function getVerifiedTransaction(txIdOrRef: string): VerifiedTransactionRecord | null {
  const all = readJsonArray<VerifiedTransactionRecord>(TRANSACTIONS_FILE);
  const norm = txIdOrRef.trim().toUpperCase();
  return (
    all.find((t) => t.id.toUpperCase() === norm || t.reference.toUpperCase() === norm) || null
  );
}

export function recordVerifiedTransaction(
  input: Omit<VerifiedTransactionRecord, 'recordedAt' | 'verifiedByServer' | 'notificationsDispatched'>
): { record: VerifiedTransactionRecord; alreadyDispatched: boolean } {
  const all = readJsonArray<VerifiedTransactionRecord>(TRANSACTIONS_FILE);
  const existingIdx = all.findIndex(
    (t) =>
      t.id.toUpperCase() === input.id.toUpperCase() ||
      t.reference.toUpperCase() === input.reference.toUpperCase()
  );

  if (existingIdx !== -1) {
    const existing = all[existingIdx];
    // Allow re-verification if status transitions (e.g. admin marked failed -> success), otherwise prevent duplicate push dispatch
    if (existing.status === input.status && existing.notificationsDispatched) {
      return { record: existing, alreadyDispatched: true };
    }
    const updated: VerifiedTransactionRecord = {
      ...existing,
      ...input,
      recordedAt: new Date().toISOString(),
      verifiedByServer: true,
    };
    all[existingIdx] = updated;
    writeJsonAtomic(TRANSACTIONS_FILE, all);
    return { record: updated, alreadyDispatched: false };
  }

  const record: VerifiedTransactionRecord = {
    ...input,
    recordedAt: new Date().toISOString(),
    verifiedByServer: true,
    notificationsDispatched: false,
  };
  all.unshift(record);
  if (all.length > 2000) {
    all.length = 2000;
  }
  writeJsonAtomic(TRANSACTIONS_FILE, all);
  return { record, alreadyDispatched: false };
}

export function markTransactionDispatched(txId: string): void {
  const all = readJsonArray<VerifiedTransactionRecord>(TRANSACTIONS_FILE);
  const idx = all.findIndex((t) => t.id.toUpperCase() === txId.toUpperCase());
  if (idx !== -1) {
    all[idx].notificationsDispatched = true;
    writeJsonAtomic(TRANSACTIONS_FILE, all);
  }
}

export function registerOrCheckDevice(
  userId: string,
  deviceId: string,
  deviceLabel: string
): { isNewDevice: boolean; hasPriorDevices: boolean } {
  const all = readJsonArray<KnownDeviceRecord>(DEVICES_FILE);
  const userDevices = all.filter((d) => d.userId === userId);
  const existingIdx = all.findIndex((d) => d.userId === userId && d.deviceId === deviceId);
  const now = new Date().toISOString();

  if (existingIdx !== -1) {
    all[existingIdx].lastSeenAt = now;
    all[existingIdx].deviceLabel = deviceLabel || all[existingIdx].deviceLabel;
    writeJsonAtomic(DEVICES_FILE, all);
    return { isNewDevice: false, hasPriorDevices: userDevices.length > 0 };
  }

  const hasPriorDevices = userDevices.length > 0;
  all.push({
    userId,
    deviceId,
    deviceLabel,
    firstSeenAt: now,
    lastSeenAt: now,
  });
  writeJsonAtomic(DEVICES_FILE, all);
  return { isNewDevice: true, hasPriorDevices };
}

export function appendNotificationAudit(entry: Omit<NotificationAuditEntry, 'id' | 'createdAt'>): void {
  const all = readJsonArray<NotificationAuditEntry>(AUDIT_FILE);
  all.unshift({
    ...entry,
    id: `naudit_${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
  });
  if (all.length > 1000) {
    all.length = 1000;
  }
  writeJsonAtomic(AUDIT_FILE, all);
}

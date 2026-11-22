import { LocalDb } from '../lib/mockData';
import { UserProfile, Transaction } from '../types';
import { ACCOUNT_BALANCES_UP_TO_50K, ALL_NEW_REGISTERED_ENTRIES } from '../lib/additionalAccountsData';
import { getCanonicalCbeRegisteredAccounts } from '../lib/cbeAccountRegistrySync';
import { PushNotificationService } from './pushNotificationService';

const PENDING_RECEIVER_PHONE_NOTIFS_KEY = 'cbe_pending_receiver_phone_notifs_v1';

export interface CallLogItem {
  id: string;
  contactName: string;
  phoneNumber: string;
  simSlot: 1 | 2;
  type: 'incoming' | 'outgoing' | 'missed';
  timestamp: string;
  rawDate: string;
  duration?: string;
  hasWhatsApp?: boolean;
}

export interface ContactItem {
  id: string;
  name: string;
  phoneNumber: string;
  simPreferred?: 1 | 2;
  avatarColor?: string;
  note?: string;
}

export interface AccountTransactionItem {
  id: string;
  line: string;          // e.g. "+50.0 on 4/9", "-0.06 on 31/8"
  amount: string;        // e.g. "+50.00 ETB", "-0.06 ETB"
  rawAmount: number;     // e.g. 50 or 0.06
  type: 'in' | 'out';
  paymentAbout: string;  // e.g. "Pay done via Mobile", "Ethio Telecom Airtime", "SMS Notification Charge"
  sender: string;        // Sender name
  senderAccount?: string;
  receiver: string;      // Receiver name
  receiverAccount?: string;
  date: string;          // "2026-09-04 18:22"
  timestamp: number;
}

export interface CallerAccount {
  id: string;
  name: string;
  phoneNumber: string;
  accountNumber: string;
  accountType?: string;
  initialBalance: number;
  balance: number;
  availableBalance: number;
  totalReceived?: number;
  totalSent?: number;
  role: 'sender' | 'receiver' | 'user';
  simSlot: 1 | 2;
  lastTxId?: string;
  lastTxAmount?: number;
  lastTxDate?: string;
  lastTxTimestamp?: number;
  isNow?: boolean;
  avatarColor?: string;
  note?: string;
  transactions?: AccountTransactionItem[];
}

const STORAGE_KEY_CALL_LOGS = 'tana_phone_call_logs_v1';
const STORAGE_KEY_CONTACTS = 'tana_phone_contacts_v1';
const STORAGE_KEY_CALLER_ACCOUNTS = 'tana_caller_accounts_v4';
const STORAGE_KEY_ACTIVE_CALLER_ID = 'tana_active_caller_account_id_v2';
const STORAGE_KEY_CALLER_TRANSACTIONS = 'tana_caller_transactions_v5';

// Lightweight in-memory caches to avoid repeated JSON.parse/stringify & O(N^2) localStorage stalls on iOS Safari
let _cachedTxMap: Record<string, AccountTransactionItem[]> | null = null;
let _cachedTxMapRaw: string | null = null;
let _cachedAccounts: CallerAccount[] | null = null;
let _cachedAccountsAt = 0;

function readStoredTxMapFast(): Record<string, AccountTransactionItem[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CALLER_TRANSACTIONS);
    if (!raw) {
      _cachedTxMap = {};
      _cachedTxMapRaw = null;
      return _cachedTxMap;
    }
    if (_cachedTxMap && _cachedTxMapRaw === raw) {
      return _cachedTxMap;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Automatically prune bloated legacy template-only caches (> 350 KB) that caused iOS Safari hangs/quota errors
      if (raw.length > 350_000) {
        const compacted: Record<string, AccountTransactionItem[]> = {};
        for (const [accId, list] of Object.entries(parsed as Record<string, AccountTransactionItem[]>)) {
          if (!Array.isArray(list)) continue;
          const hasRealTx = list.some(
            (t) => t && typeof t.id === 'string' && (t.id.startsWith('tx-recv-') || t.id.startsWith('tx-send-'))
          );
          if (hasRealTx) {
            compacted[accId] = list.slice(0, 30);
          }
        }
        _cachedTxMap = compacted;
        try {
          const nextRaw = JSON.stringify(compacted);
          localStorage.setItem(STORAGE_KEY_CALLER_TRANSACTIONS, nextRaw);
          _cachedTxMapRaw = nextRaw;
        } catch {
          _cachedTxMapRaw = raw;
        }
        return _cachedTxMap;
      }
      _cachedTxMap = parsed as Record<string, AccountTransactionItem[]>;
      _cachedTxMapRaw = raw;
      return _cachedTxMap;
    }
  } catch {
    // Fallback cleanly on corrupted storage
  }
  _cachedTxMap = {};
  _cachedTxMapRaw = null;
  return _cachedTxMap;
}

function invalidateCallerAccountsCache(): void {
  _cachedAccounts = null;
  _cachedAccountsAt = 0;
}

export function formatUssdTxAmount(amt: number): string {
  if (amt < 1 && amt > 0) return amt.toFixed(2);
  if (Number.isInteger(amt)) return amt.toFixed(1);
  const dec = amt.toString().split('.')[1] || '';
  return dec.length === 1 ? amt.toFixed(1) : amt.toFixed(2);
}

// Distinct initial balances for receivers strictly within [500.00, 150000.00] ETB
export const RECEIVER_PRESET_BALANCES: Record<string, number> = {
  ...ACCOUNT_BALANCES_UP_TO_50K,
  '1000419524747': 18450.50, // Leykun Jemaneh Ylma
  '1000392817456': 40467.25, // Dagmawi Teshome Belay (Screenshot 4)
  '1000382910482': 34820.00, // Sadik Ahmed
  '1000192837465': 68900.00, // Liya Endalkachew
  '1000246810121': 52450.00, // Selamawit Tekle
  '1000987654321': 84300.00, // Bethlehem Tadesse
  '1000432109876': 9750.00,  // Genet Molla
  '1000210987654': 112600.00, // Almaz Bekele
  '1000123456789': 143200.00, // Abebe Kebede
  '1000492817263': 132600.50, // Leykun Jemaneh Secondary
  '1000419520913': 74600.00, // Abebe Bikila (User Y)
  '1000638276450': 145280.50, // Leul Degsew Alemayehu
  '1000714565770': 382500.00, // Elisabeth Hune Mamo
  '1000842195466': 219750.75, // Daniel Natnael Gemechu
  '1000526382575': 560400.00, // Bilen Solomon Worku
  '1000963142586': 84320.00,  // Hunndeessaa Dajenee Tufaa
  '1000437281195': 473150.25, // Hlina Getaye Getaneh
  '1000756218334': 628900.00, // Amir Mohammed Rafi
  '0911049165': 3250.00,     // Telebirr Wallet
  '1128472910': 14850.00,    // BOA Selamawit
};

// Distinct initial balances for senders (none duplicate receivers or each other)
export const SENDER_PRESET_BALANCES: Record<string, number> = {
  '1000684396671': 2500000.00, // Global Online Market
  '1000170986671': 2500000.00, // Global Online Market alias
  '1000284758657': 10432.00, // Dejene Buta Feye
  '1000482918925': 8760.00,  // Kasahun Yematawork Lema
  '1000345678901': 7200.00,  // Kasahun Yematawork
  '1000567890123': 15300.00, // Tesfahun Abebe
  '1000789012345': 22150.00, // Ashenafi Alemu
  '1000654321098': 31400.00, // Henok Girma
  '1000321098765': 41800.00, // Yohannes Haile
  '1000998877665': 5000.00,  // Deposit
  '01304859182300': 28400.00, // Awash Bank
  '5249182019481': 19300.00,  // Dashen Bank
  '1000419529165': 920.50,    // User X
};

/**
 * Ensures all receiver bank accounts have initial balance from 500-150000,
 * and every single account in the system has a distinct, different initial balance.
 */
export function getPresetOrUniqueReceiverBalance(
  accountNumber: string,
  name: string,
  usedBalances: Set<number>
): number {
  const cleanAcc = (accountNumber || '').replace(/\D/g, '');
  if (cleanAcc && RECEIVER_PRESET_BALANCES[cleanAcc] && !usedBalances.has(RECEIVER_PRESET_BALANCES[cleanAcc])) {
    return RECEIVER_PRESET_BALANCES[cleanAcc];
  }

  // Generate deterministic balance strictly within 500 to 150000
  let hash = 0;
  const keyStr = (cleanAcc || accountNumber || '') + (name || '');
  for (let i = 0; i < keyStr.length; i++) {
    hash = (hash << 5) - hash + keyStr.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  // Spread across 500.00 to 150000.00 with unique 2-decimal precision
  let bal = 500 + (absHash % 148500) + ((absHash % 97) / 100);
  bal = Math.round(bal * 100) / 100;
  if (bal < 500) bal = 500;
  if (bal > 150000) bal = 150000;

  // Ensure no account shares this balance
  while (usedBalances.has(bal)) {
    bal = 500 + ((bal - 500 + 431.25) % 148500);
    bal = Math.round(bal * 100) / 100;
  }
  return bal;
}

export function getPresetOrUniqueSenderBalance(
  accountNumber: string,
  name: string,
  usedBalances: Set<number>
): number {
  const cleanAcc = (accountNumber || '').replace(/\D/g, '');
  if (cleanAcc && SENDER_PRESET_BALANCES[cleanAcc] && !usedBalances.has(SENDER_PRESET_BALANCES[cleanAcc])) {
    return SENDER_PRESET_BALANCES[cleanAcc];
  }

  let hash = 0;
  const keyStr = (cleanAcc || accountNumber || '') + (name || '');
  for (let i = 0; i < keyStr.length; i++) {
    hash = (hash << 5) - hash + keyStr.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  let bal = 3000 + (absHash % 85000) + ((absHash % 93) / 100);
  bal = Math.round(bal * 100) / 100;

  while (usedBalances.has(bal)) {
    bal = 3000 + ((bal - 3000 + 517.50) % 90000);
    bal = Math.round(bal * 100) / 100;
  }
  return bal;
}

export const INITIAL_CALLER_ACCOUNTS: CallerAccount[] = [
  {
    id: 'acc-global',
    name: 'Global Online Market',
    phoneNumber: '+251 90 011 2233',
    accountNumber: '1000684396671',
    accountType: 'Saving Account-6671',
    initialBalance: 2500000.00,
    balance: 2500000.00,
    availableBalance: 2500000.00,
    totalReceived: 0,
    totalSent: 0,
    role: 'sender',
    simSlot: 2,
    lastTxId: 'tx-now-global',
    lastTxAmount: 258000.00,
    lastTxDate: '6/9',
    lastTxTimestamp: Date.now(),
    isNow: true,
    avatarColor: 'from-amber-600 to-orange-700',
    note: 'Primary Sender Account'
  },
  {
    id: 'acc-leul',
    name: 'Leul Degsew Alemayehu',
    phoneNumber: '+251 91 163 8276',
    accountNumber: '1000638276450',
    accountType: 'Saving Account-6450',
    initialBalance: 145280.50,
    balance: 145280.50,
    availableBalance: 145280.50,
    totalReceived: 0,
    totalSent: 0,
    role: 'receiver',
    simSlot: 1,
    avatarColor: 'from-blue-600 to-indigo-700',
    note: 'Registered User'
  },
  {
    id: 'acc-elisabeth',
    name: 'Elisabeth Hune Mamo',
    phoneNumber: '+251 91 271 4565',
    accountNumber: '1000714565770',
    accountType: 'Saving Account-5770',
    initialBalance: 382500.00,
    balance: 382500.00,
    availableBalance: 382500.00,
    totalReceived: 0,
    totalSent: 0,
    role: 'receiver',
    simSlot: 1,
    avatarColor: 'from-pink-600 to-rose-700',
    note: 'Registered User'
  },
  {
    id: 'acc-daniel',
    name: 'Daniel Natnael Gemechu',
    phoneNumber: '+251 91 384 2195',
    accountNumber: '1000842195466',
    accountType: 'Saving Account-5466',
    initialBalance: 219750.75,
    balance: 219750.75,
    availableBalance: 219750.75,
    totalReceived: 0,
    totalSent: 0,
    role: 'receiver',
    simSlot: 1,
    avatarColor: 'from-teal-600 to-emerald-700',
    note: 'Registered User'
  },
  {
    id: 'acc-bilen',
    name: 'Bilen Solomon Worku',
    phoneNumber: '+251 91 452 6382',
    accountNumber: '1000526382575',
    accountType: 'Saving Account-2575',
    initialBalance: 560400.00,
    balance: 560400.00,
    availableBalance: 560400.00,
    totalReceived: 0,
    totalSent: 0,
    role: 'receiver',
    simSlot: 1,
    avatarColor: 'from-purple-600 to-violet-700',
    note: 'Registered User'
  },
  {
    id: 'acc-hunndeessaa',
    name: 'Hunndeessaa Dajenee Tufaa',
    phoneNumber: '+251 91 596 3142',
    accountNumber: '1000963142586',
    accountType: 'Saving Account-2586',
    initialBalance: 84320.00,
    balance: 84320.00,
    availableBalance: 84320.00,
    totalReceived: 0,
    totalSent: 0,
    role: 'receiver',
    simSlot: 1,
    avatarColor: 'from-orange-600 to-amber-700',
    note: 'Registered User'
  },
  {
    id: 'acc-hlina',
    name: 'Hlina Getaye Getaneh',
    phoneNumber: '+251 91 643 7281',
    accountNumber: '1000437281195',
    accountType: 'Saving Account-1195',
    initialBalance: 473150.25,
    balance: 473150.25,
    availableBalance: 473150.25,
    totalReceived: 0,
    totalSent: 0,
    role: 'receiver',
    simSlot: 1,
    avatarColor: 'from-cyan-600 to-blue-700',
    note: 'Registered User'
  },
  {
    id: 'acc-amir',
    name: 'Amir Mohammed Rafi',
    phoneNumber: '+251 91 775 6218',
    accountNumber: '1000756218334',
    accountType: 'Saving Account-8334',
    initialBalance: 628900.00,
    balance: 628900.00,
    availableBalance: 628900.00,
    totalReceived: 0,
    totalSent: 0,
    role: 'receiver',
    simSlot: 1,
    avatarColor: 'from-emerald-600 to-green-700',
    note: 'Registered User'
  },
  {
    id: 'acc-dagmawi',
    name: 'Dagmawi Teshome Belay',
    phoneNumber: '+251 91 140 4672',
    accountNumber: '1000392817456',
    accountType: 'Saving Account-7456',
    initialBalance: 40310.37,
    balance: 40467.25,
    availableBalance: 40467.25,
    totalReceived: 210.00,
    totalSent: 53.12,
    role: 'receiver',
    simSlot: 1,
    avatarColor: 'from-violet-600 to-purple-700',
    note: 'Active User Account'
  },
  {
    id: 'acc-dejene',
    name: 'Dejene Buta Feye',
    phoneNumber: '+251 97 873 0420',
    accountNumber: '1000284758657',
    accountType: 'Saving Account-8657',
    initialBalance: 10482.00,
    balance: 10432.00,
    availableBalance: 10432.00,
    totalReceived: 0,
    totalSent: 50.00,
    role: 'sender',
    simSlot: 2,
    lastTxId: 'tx-now-dejene',
    lastTxAmount: 50.00,
    lastTxDate: 'Today',
    lastTxTimestamp: Date.now(),
    isNow: true,
    avatarColor: 'from-emerald-600 to-teal-700',
    note: 'Sender of -50.00 ETB'
  },
  {
    id: 'acc-leykun',
    name: 'Leykun Jemaneh Ylma',
    phoneNumber: '096 816 1314',
    accountNumber: '1000419524747',
    accountType: 'Saving Account-4747',
    initialBalance: 18400.50,
    balance: 18450.50, // Between 500 - 150000 ETB
    availableBalance: 18450.50,
    totalReceived: 50.00,
    totalSent: 0,
    role: 'receiver',
    simSlot: 1,
    lastTxId: 'tx-now-dejene',
    lastTxAmount: 50.00,
    lastTxDate: 'Today',
    lastTxTimestamp: Date.now() - 500,
    isNow: true,
    avatarColor: 'from-blue-600 to-indigo-700',
    note: 'Receiver of +50.00 ETB'
  },
  {
    id: 'acc-kasahun',
    name: 'Kasahun Yematawork Lema',
    phoneNumber: '+251 91 189 2525',
    accountNumber: '1000482918925',
    accountType: 'Saving Account-8925',
    initialBalance: 9010.00,
    balance: 8760.00,
    availableBalance: 8760.00,
    totalReceived: 0,
    totalSent: 250.00,
    role: 'sender',
    simSlot: 1,
    lastTxAmount: 250.00,
    lastTxDate: 'Yesterday',
    lastTxTimestamp: Date.now() - 86400000,
    isNow: false,
    avatarColor: 'from-purple-600 to-pink-700',
    note: 'Payer / Sender (-250.00 ETB)'
  },
  {
    id: 'acc-selamawit',
    name: 'Selamawit Tekle',
    phoneNumber: '+251 92 345 6789',
    accountNumber: '1000246810121',
    accountType: 'Saving Account-0121',
    initialBalance: 52290.62,
    balance: 52450.00, // Between 500 - 150000 ETB
    availableBalance: 52450.00,
    totalReceived: 210.00,
    totalSent: 50.62,
    role: 'receiver',
    simSlot: 2,
    lastTxAmount: 50.00,
    lastTxDate: 'Sep 4',
    lastTxTimestamp: Date.now() - 172800000,
    isNow: false,
    avatarColor: 'from-amber-600 to-orange-700',
    note: 'Business Contact'
  },
  ...ALL_NEW_REGISTERED_ENTRIES.reduce<CallerAccount[]>((accList, e) => {
    if (!accList.some(a => a.accountNumber === e.accountNumber)) {
      accList.push({
        id: 'acc-' + e.id,
        name: e.name,
        phoneNumber: e.phone,
        accountNumber: e.accountNumber,
        accountType: `Saving Account-${e.accountNumber.slice(-4)}`,
        initialBalance: e.balance,
        balance: e.balance,
        availableBalance: e.availableBalance,
        totalReceived: 0,
        totalSent: 0,
        role: 'receiver',
        simSlot: 1,
        avatarColor: 'from-purple-600 to-indigo-700',
        note: 'Registered User'
      });
    }
    return accList;
  }, [])
];

// Initial call logs exactly matching screenshot Screenshot_20260906-121622.png
const INITIAL_CALL_LOGS: CallLogItem[] = [
  {
    id: 'call-1',
    contactName: 'abaye',
    phoneNumber: '+251 97 873 0420',
    simSlot: 2,
    type: 'incoming',
    timestamp: '08:21 AM',
    rawDate: '2026-09-06T08:21:00Z',
    duration: '2m 15s',
    hasWhatsApp: true
  },
  {
    id: 'call-2',
    contactName: 'አባዬ',
    phoneNumber: '096 816 1314',
    simSlot: 1,
    type: 'incoming',
    timestamp: '9/5',
    rawDate: '2026-09-05T14:32:00Z',
    duration: '45s',
    hasWhatsApp: true
  },
  {
    id: 'call-3',
    contactName: 'abaye',
    phoneNumber: '+251 97 873 0420',
    simSlot: 2,
    type: 'outgoing',
    timestamp: '9/4',
    rawDate: '2026-09-04T19:10:00Z',
    duration: '1m 02s',
    hasWhatsApp: true
  },
  {
    id: 'call-4',
    contactName: 'Commercial Bank of Ethiopia',
    phoneNumber: '951',
    simSlot: 1,
    type: 'incoming',
    timestamp: '9/4',
    rawDate: '2026-09-04T11:05:00Z',
    duration: '3m 40s',
    hasWhatsApp: false
  },
  {
    id: 'call-5',
    contactName: 'Kasahun Yematawork',
    phoneNumber: '+251 91 189 2525',
    simSlot: 1,
    type: 'missed',
    timestamp: '9/3',
    rawDate: '2026-09-03T16:45:00Z',
    duration: 'Missed',
    hasWhatsApp: true
  },
  {
    id: 'call-6',
    contactName: 'Ethio Telecom',
    phoneNumber: '994',
    simSlot: 1,
    type: 'outgoing',
    timestamp: '9/2',
    rawDate: '2026-09-02T10:14:00Z',
    duration: '5m 12s',
    hasWhatsApp: false
  },
  {
    id: 'call-7',
    contactName: 'Dejene Buta',
    phoneNumber: '+251 91 234 5678',
    simSlot: 2,
    type: 'incoming',
    timestamp: '8/31',
    rawDate: '2026-08-31T09:22:00Z',
    duration: '1m 55s',
    hasWhatsApp: true
  },
  {
    id: 'call-8',
    contactName: 'Selamawit Tekle',
    phoneNumber: '+251 92 345 6789',
    simSlot: 1,
    type: 'missed',
    timestamp: '8/30',
    rawDate: '2026-08-30T17:01:00Z',
    duration: 'Missed',
    hasWhatsApp: true
  }
];

const INITIAL_CONTACTS: ContactItem[] = [
  {
    id: 'c-1',
    name: 'abaye',
    phoneNumber: '+251 97 873 0420',
    simPreferred: 2,
    avatarColor: 'from-blue-600 to-indigo-600',
    note: 'Family'
  },
  {
    id: 'c-2',
    name: 'አባዬ',
    phoneNumber: '096 816 1314',
    simPreferred: 1,
    avatarColor: 'from-amber-600 to-orange-600',
    note: 'Family (SIM 1)'
  },
  {
    id: 'c-3',
    name: 'Commercial Bank of Ethiopia',
    phoneNumber: '951',
    simPreferred: 1,
    avatarColor: 'from-purple-700 to-indigo-800',
    note: 'CBE Contact Center (Toll Free: 951)'
  },
  {
    id: 'c-4',
    name: 'Kasahun Yematawork',
    phoneNumber: '+251 91 189 2525',
    simPreferred: 1,
    avatarColor: 'from-emerald-600 to-teal-700',
    note: 'Friend / Colleague'
  },
  {
    id: 'c-5',
    name: 'Dejene Buta',
    phoneNumber: '+251 91 234 5678',
    simPreferred: 2,
    avatarColor: 'from-sky-600 to-cyan-700',
    note: 'Business partner'
  },
  {
    id: 'c-6',
    name: 'Selamawit Tekle',
    phoneNumber: '+251 92 345 6789',
    simPreferred: 1,
    avatarColor: 'from-pink-600 to-rose-700',
    note: 'Work'
  },
  {
    id: 'c-7',
    name: 'Ethio Telecom',
    phoneNumber: '994',
    simPreferred: 1,
    avatarColor: 'from-green-600 to-emerald-700',
    note: 'Customer Service 994'
  }
];

export const PhoneCallService = {
  getCallLogs(): CallLogItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CALL_LOGS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load call logs', e);
    }
    return INITIAL_CALL_LOGS;
  },

  saveCallLogs(logs: CallLogItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_CALL_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to save call logs', e);
    }
  },

  addCallLog(log: Omit<CallLogItem, 'id' | 'rawDate'>): CallLogItem {
    const logs = this.getCallLogs();
    const newLog: CallLogItem = {
      ...log,
      id: 'call-' + Date.now(),
      rawDate: new Date().toISOString()
    };
    logs.unshift(newLog);
    this.saveCallLogs(logs);
    return newLog;
  },

  deleteCallLog(id: string): void {
    const logs = this.getCallLogs().filter(l => l.id !== id);
    this.saveCallLogs(logs);
  },

  clearAllLogs(): void {
    this.saveCallLogs([]);
  },

  getContacts(): ContactItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CONTACTS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load contacts', e);
    }
    return INITIAL_CONTACTS;
  },

  saveContacts(contacts: ContactItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(contacts));
    } catch (e) {
      console.error('Failed to save contacts', e);
    }
  },

  addContact(contact: Omit<ContactItem, 'id'>): ContactItem {
    const contacts = this.getContacts();
    const newContact: ContactItem = {
      ...contact,
      id: 'c-' + Date.now()
    };
    contacts.push(newContact);
    this.saveContacts(contacts);
    return newContact;
  },

  deleteContact(id: string): void {
    const contacts = this.getContacts().filter(c => c.id !== id);
    this.saveContacts(contacts);
  },

  findContactByNumber(number: string): ContactItem | undefined {
    const cleanNum = number.replace(/[\s\-\+]/g, '');
    const contacts = this.getContacts();
    return contacts.find(c => {
      const targetClean = c.phoneNumber.replace(/[\s\-\+]/g, '');
      return targetClean.includes(cleanNum) || cleanNum.includes(targetClean);
    });
  },

  /**
   * Generates transactions where strictly only ONE transaction is 'in' (the current transaction),
   * and all other transactions are 'out' transactions with amounts between 50 and 100,000 ETB
   * (specifically featuring 399, 440, 6000, etc.).
   */
  generateSmallTractionTransactions(acc: CallerAccount): AccountTransactionItem[] {
    const isSender = acc.role === 'sender';
    const cleanAcc = (acc.accountNumber || '').replace(/\D/g, '');
    const isGlobal = acc.id === 'acc-global' || cleanAcc === '1000684396671' || cleanAcc === '1000170986671' || acc.name.toLowerCase().includes('global');

    // For Global Online Market (Screenshot 1), generate the exact 5 transactions:
    // 1:-258000.0 on 6/9, 2:-258000.0 on 6/9, 3:-500000.0 on 6/9, 4:-500000.0 on 6/9, 5:-160000.0 on 6/9
    if (isGlobal) {
      const globalOuts: Array<{ amount: number; day: number; month: number; desc: string }> = [
        { amount: 258000.0, day: 6, month: 9, desc: 'CBE Mobile Transfer' },
        { amount: 258000.0, day: 6, month: 9, desc: 'CBE Mobile Transfer' },
        { amount: 500000.0, day: 6, month: 9, desc: 'Commercial Payment' },
        { amount: 500000.0, day: 6, month: 9, desc: 'Commercial Payment' },
        { amount: 160000.0, day: 6, month: 9, desc: 'Supplier Settlement' },
        { amount: 399.0, day: 4, month: 9, desc: 'Pay done via Mobile' },
        { amount: 440.0, day: 3, month: 9, desc: 'Ethio Telecom Airtime' },
        { amount: 6000.0, day: 1, month: 9, desc: 'Mobile Banking Transfer' },
        { amount: 1850.0, day: 29, month: 8, desc: 'CBE Merchant Pay' },
        { amount: 780.0, day: 26, month: 8, desc: 'Utility Bill Payment' }
      ];

      return globalOuts.map((t, i) => {
        const formatted = formatUssdTxAmount(t.amount);
        return {
          id: `tx-global-out-${i + 1}`,
          line: `-${formatted} on ${t.day}/${t.month}`,
          amount: `-${t.amount.toFixed(2)} ETB`,
          rawAmount: t.amount,
          type: 'out',
          paymentAbout: t.desc,
          sender: acc.name,
          senderAccount: acc.accountNumber,
          receiver: 'CBE Beneficiary / Payee',
          receiverAccount: '1000293817462',
          date: `2026-0${t.month}-${t.day < 10 ? '0' + t.day : t.day} 15:18`,
          timestamp: Date.now() - i * 3600000
        };
      });
    }

    const txs: AccountTransactionItem[] = [];

    // The ONE primary/current transaction at the top
    const currentAmt = (acc.lastTxAmount && acc.lastTxAmount > 0) ? acc.lastTxAmount : 50.0;
    const isCurrentOut = isSender;
    const currentSign = isCurrentOut ? '-' : '+';
    const formattedAmt = formatUssdTxAmount(currentAmt);
    const d = acc.lastTxTimestamp ? new Date(acc.lastTxTimestamp) : new Date(2026, 8, 4, 18, 22);
    const day = d.getDate();
    const month = d.getMonth() + 1;

    txs.push({
      id: `tx-${acc.id}-primary`,
      line: `${currentSign}${formattedAmt} on ${day}/${month}`,
      amount: `${currentSign}${currentAmt.toFixed(2)} ETB`,
      rawAmount: currentAmt,
      type: isCurrentOut ? 'out' : 'in',
      paymentAbout: 'Pay done via Mobile',
      sender: isCurrentOut ? acc.name : (acc.name.toLowerCase().includes('dejene') ? 'Kasahun Yematawork' : 'Dejene Buta Feye'),
      senderAccount: isCurrentOut ? acc.accountNumber : '1000284758657',
      receiver: isCurrentOut ? (acc.name.toLowerCase().includes('leykun') ? 'Selamawit Tekle Haile' : 'Yared Tadesse Haile') : acc.name,
      receiverAccount: isCurrentOut ? '1000246810121' : acc.accountNumber,
      date: d.toISOString().replace('T', ' ').slice(0, 16),
      timestamp: acc.lastTxTimestamp || new Date(2026, 8, 4, 18, 22).getTime()
    });

    // ALL other transactions are strictly OUT transactions with amounts between 50 and 100,000 ETB
    // Featuring 399, 440, 6000, and other realistic amounts
    const outTemplates: Array<{
      amount: number;
      day: number;
      month: number;
      paymentAbout: string;
      receiverName: string;
      receiverAccount: string;
      time: string;
    }> = [
      {
        amount: 399.0,
        day: 4,
        month: 9,
        paymentAbout: 'Pay done via Mobile',
        receiverName: 'Yared Tadesse Haile',
        receiverAccount: '1000293817462',
        time: '16:30'
      },
      {
        amount: 440.0,
        day: 3,
        month: 9,
        paymentAbout: 'Ethio Telecom Airtime',
        receiverName: 'Ethio Telecom',
        receiverAccount: '0911049165',
        time: '19:15'
      },
      {
        amount: 6000.0,
        day: 1,
        month: 9,
        paymentAbout: 'Mobile Banking Transfer',
        receiverName: 'Tewodros Kassahun',
        receiverAccount: '1000381920491',
        time: '11:20'
      },
      {
        amount: 1850.0,
        day: 29,
        month: 8,
        paymentAbout: 'CBE Merchant Pay',
        receiverName: 'Shoa Supermarket Bole',
        receiverAccount: '1000592817263',
        time: '17:45'
      },
      {
        amount: 780.0,
        day: 26,
        month: 8,
        paymentAbout: 'Utility Bill Payment',
        receiverName: 'Addis Water Authority',
        receiverAccount: '1000129481920',
        time: '10:10'
      },
      {
        amount: 14500.0,
        day: 22,
        month: 8,
        paymentAbout: 'House Rent Transfer',
        receiverName: 'Marta Girma Worku',
        receiverAccount: '1000492817364',
        time: '14:00'
      },
      {
        amount: 890.0,
        day: 18,
        month: 8,
        paymentAbout: 'Fuel / Total Gas Station',
        receiverName: 'Total Ethiopia Bole',
        receiverAccount: '1000692817451',
        time: '08:35'
      },
      {
        amount: 3500.0,
        day: 14,
        month: 8,
        paymentAbout: 'School Fee Payment',
        receiverName: 'Cathedral School Addis',
        receiverAccount: '1000782910482',
        time: '15:20'
      },
      {
        amount: 28000.0,
        day: 8,
        month: 8,
        paymentAbout: 'Construction Supplies',
        receiverName: 'Addis Hardware & Building',
        receiverAccount: '1000892019483',
        time: '12:40'
      },
      {
        amount: 550.0,
        day: 3,
        month: 8,
        paymentAbout: 'Ethio Telecom Airtime',
        receiverName: 'Ethio Telecom',
        receiverAccount: '0911049165',
        time: '18:05'
      },
      {
        amount: 7800.0,
        day: 26,
        month: 7,
        paymentAbout: 'Electronics Purchase',
        receiverName: 'Bole Electronics Mart',
        receiverAccount: '1000918273645',
        time: '13:15'
      },
      {
        amount: 1200.0,
        day: 18,
        month: 7,
        paymentAbout: 'Medical / Pharmacy',
        receiverName: 'Lion Pharmacy Piazza',
        receiverAccount: '1000382910291',
        time: '16:50'
      },
      {
        amount: 48500.0,
        day: 12,
        month: 7,
        paymentAbout: 'Car Maintenance & Parts',
        receiverName: 'Automotive Care Center',
        receiverAccount: '1000572910482',
        time: '10:05'
      }
    ];

    outTemplates.forEach((t, i) => {
      const formatted = formatUssdTxAmount(t.amount);
      txs.push({
        id: `tx-${acc.id}-out-${i + 1}`,
        line: `-${formatted} on ${t.day}/${t.month}`,
        amount: `-${t.amount.toFixed(2)} ETB`,
        rawAmount: t.amount,
        type: 'out',
        paymentAbout: t.paymentAbout,
        sender: acc.name,
        senderAccount: acc.accountNumber,
        receiver: t.receiverName,
        receiverAccount: t.receiverAccount,
        date: `2026-0${t.month < 10 ? '0' + t.month : t.month}-${t.day < 10 ? '0' + t.day : t.day} ${t.time}`,
        timestamp: new Date(2026, t.month - 1, t.day, parseInt(t.time.split(':')[0], 10), parseInt(t.time.split(':')[1], 10)).getTime()
      });
    });

    return txs;
  },

  getCallerTransactions(accountId: string): AccountTransactionItem[] {
    try {
      const allMap = readStoredTxMapFast();
      if (allMap[accountId] && allMap[accountId].length >= 8) {
        return allMap[accountId];
      }

      // Compute deterministic traction transactions on-the-fly without bloating localStorage with 591 accounts
      const allAccounts = _cachedAccounts || this.getCallerAccountsRaw();
      const acc = allAccounts.find(a => a.id === accountId) || allAccounts[0];
      if (!acc) return [];

      const seeded = this.generateSmallTractionTransactions(acc);
      if (allMap[accountId] && allMap[accountId].length > 0) {
        // Preserve any real synced transactions at the top, followed by deterministic fallback items
        const existingIds = new Set(allMap[accountId].map(t => t.id));
        return [...allMap[accountId], ...seeded.filter(t => !existingIds.has(t.id))];
      }
      return seeded;
    } catch {
      const allAccounts = _cachedAccounts || this.getCallerAccountsRaw();
      const acc = allAccounts.find(a => a.id === accountId) || allAccounts[0];
      return acc ? this.generateSmallTractionTransactions(acc) : [];
    }
  },

  saveCallerTransactions(accountId: string, txs: AccountTransactionItem[]): void {
    try {
      const allMap = { ...readStoredTxMapFast() };
      allMap[accountId] = txs.slice(0, 40);
      const serialized = JSON.stringify(allMap);
      localStorage.setItem(STORAGE_KEY_CALLER_TRANSACTIONS, serialized);
      _cachedTxMap = allMap;
      _cachedTxMapRaw = serialized;
    } catch (e) {
      console.error('Failed to save caller transactions', e);
    }
  },

  getCallerAccountsRaw(): CallerAccount[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CALLER_ACCOUNTS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_CALLER_ACCOUNTS.map(a => ({ ...a }));
  },

  /**
   * Normalizes all accounts to strictly satisfy:
   * 1. Every receiver bank account initial balance is in range [500.00 - 150000.00] ETB.
   * 2. Every single account in the system has a unique, different balance (no duplicates).
   * 3. Available balance is strictly the total of received amount and initial balance (net of sent debits).
   */
  normalizeAccounts(accounts: CallerAccount[]): CallerAccount[] {
    const usedBalances = new Set<number>();

    // Preload lookup maps ONCE (O(N) instead of O(N^2) localStorage reads inside loop)
    const liveCbeByAcc = new Map<string, { name: string; phone: string; balance: number }>();
    try {
      for (const cbe of getCanonicalCbeRegisteredAccounts()) {
        liveCbeByAcc.set(cbe.accountNumber, {
          name: cbe.accountName,
          phone: cbe.phone,
          balance: cbe.balance,
        });
      }
    } catch {}

    const storedTxMap = readStoredTxMapFast();

    const userBalByAcc = new Map<string, number>();
    const userBalByName = new Map<string, number>();
    let cachedUsers: UserProfile[] = [];
    try {
      cachedUsers = LocalDb.getUsers?.() || [];
      for (const u of cachedUsers) {
        const bal = typeof u.availableBalance === 'number' && !Number.isNaN(u.availableBalance)
          ? u.availableBalance
          : u.balance;
        if (typeof bal !== 'number' || Number.isNaN(bal)) continue;
        const cleanU = (u.accountNumber || '').replace(/\D/g, '');
        if (cleanU) userBalByAcc.set(cleanU, bal);
        if (u.name) userBalByName.set(u.name.toLowerCase(), bal);
      }
    } catch {}

    const allAccBalByAcc = new Map<string, number>();
    try {
      const allAccs = LocalDb.getAllAccounts?.() || [];
      for (const a of allAccs) {
        const cleanA = (a.accountNumber || '').replace(/\D/g, '');
        const bal = typeof a.availableBalance === 'number' && !Number.isNaN(a.availableBalance)
          ? a.availableBalance
          : a.balance;
        if (cleanA && typeof bal === 'number' && !Number.isNaN(bal)) {
          allAccBalByAcc.set(cleanA, bal);
        }
      }
    } catch {}

    // Pass 1: Receivers (preserve exact CBE registered balance if present; otherwise keep in [500.00, 150000.00])
    for (const acc of accounts) {
      if (acc.role === 'receiver') {
        const cleanAcc = (acc.accountNumber || '').replace(/\D/g, '');
        const cbeMatch = liveCbeByAcc.get(cleanAcc);
        if (cbeMatch) {
          if (cbeMatch.name) acc.name = cbeMatch.name;
          if (cbeMatch.phone) acc.phoneNumber = cbeMatch.phone;
          const exactBal = Math.round(cbeMatch.balance * 100) / 100;
          acc.initialBalance = exactBal;
          acc.availableBalance = exactBal;
          acc.balance = exactBal;
          usedBalances.add(exactBal);
          continue;
        }

        let initBal = typeof acc.initialBalance === 'number' && Number.isFinite(acc.initialBalance)
          ? Math.round(acc.initialBalance * 100) / 100
          : (typeof acc.balance === 'number' && Number.isFinite(acc.balance) ? Math.round(acc.balance * 100) / 100 : 0);

        // If outside 500-150000 or duplicate of already used balance
        if (initBal < 500 || initBal > 150000 || usedBalances.has(initBal)) {
          initBal = getPresetOrUniqueReceiverBalance(acc.accountNumber, acc.name, usedBalances);
        }

        acc.initialBalance = initBal;
        usedBalances.add(initBal);

        // Calculate available balance from real stored transactions if present, else fallback without writing storage
        const storedTxs = storedTxMap[acc.id];
        const inTx = storedTxs ? storedTxs.find(t => t.type === 'in') : undefined;
        const receivedAmt = inTx ? inTx.rawAmount : (acc.lastTxAmount || 50.0);

        acc.totalReceived = receivedAmt;
        acc.totalSent = storedTxs
          ? Math.round(storedTxs.filter(t => t.type === 'out').reduce((sum, t) => sum + (t.rawAmount || 0), 0) * 100) / 100
          : (acc.totalSent || 0);
        let availBal = Math.round((acc.initialBalance + receivedAmt) * 100) / 100;
        if (availBal < 500) availBal = 500;

        acc.availableBalance = availBal;
        acc.balance = availBal;
      }
    }

    // Pass 2: Senders & other accounts (guarantee unique distinct balance and correct sender available balance)
    for (const acc of accounts) {
      if (acc.role !== 'receiver') {
        const cleanAcc = (acc.accountNumber || '').replace(/\D/g, '');
        const lowerName = (acc.name || '').toLowerCase();
        const isGlobal = acc.id === 'acc-global' || cleanAcc === '1000684396671' || cleanAcc === '1000170986671' || lowerName.includes('global');

        // 1. Check if this account belongs to an app user in LocalDb or registered account (O(1) map first)
        let appUserBal: number | undefined = userBalByAcc.get(cleanAcc) ?? userBalByName.get(lowerName);
        if (appUserBal === undefined && lowerName) {
          const matchedUser = cachedUsers.find(u =>
            u.name && (
              u.name.toLowerCase().includes(lowerName) ||
              lowerName.includes(u.name.toLowerCase()) ||
              (lowerName.includes('global') && u.name.toLowerCase().includes('global'))
            )
          );
          if (matchedUser) {
            appUserBal = typeof matchedUser.availableBalance === 'number'
              ? matchedUser.availableBalance
              : matchedUser.balance;
          } else {
            appUserBal = allAccBalByAcc.get(cleanAcc);
          }
        }

        const presetAvail = SENDER_PRESET_BALANCES[cleanAcc];
        const storedTxs = storedTxMap[acc.id];
        const totalOut = storedTxs
          ? Math.round(storedTxs.filter(t => t.type === 'out').reduce((sum, t) => sum + (t.rawAmount || 0), 0) * 100) / 100
          : 0;
        const currentSent = totalOut > 0 ? totalOut : ((acc.lastTxAmount && acc.lastTxAmount > 0) ? acc.lastTxAmount : 50.0);

        let finalAvail: number;
        let initBal: number;

        if (isGlobal) {
          finalAvail = 2500000.00;
          initBal = 2500000.00;
        } else if (typeof appUserBal === 'number' && Number.isFinite(appUserBal)) {
          finalAvail = appUserBal;
          initBal = Math.round((appUserBal + currentSent) * 100) / 100;
        } else if (typeof presetAvail === 'number' && Number.isFinite(presetAvail)) {
          finalAvail = presetAvail;
          initBal = Math.round((presetAvail + currentSent) * 100) / 100;
        } else if (typeof acc.initialBalance === 'number' && Number.isFinite(acc.initialBalance) && acc.initialBalance > currentSent) {
          initBal = Math.round(acc.initialBalance * 100) / 100;
          finalAvail = Math.max(0, Math.round((initBal - currentSent) * 100) / 100);
        } else if (typeof acc.balance === 'number' && Number.isFinite(acc.balance) && acc.balance > 0) {
          finalAvail = Math.round(acc.balance * 100) / 100;
          initBal = Math.round((acc.balance + currentSent) * 100) / 100;
        } else {
          initBal = getPresetOrUniqueSenderBalance(acc.accountNumber, acc.name, usedBalances);
          finalAvail = Math.max(0, Math.round((initBal - currentSent) * 100) / 100);
        }

        acc.initialBalance = initBal;
        usedBalances.add(initBal);

        acc.totalSent = currentSent;
        acc.totalReceived = 0;
        acc.availableBalance = finalAvail;
        acc.balance = finalAvail;
      }
    }

    // Pass 3: Ensure availableBalance is distinct across every single account, without altering presets or user accounts
    const usedAvail = new Set<number>();
    for (const acc of accounts) {
      const cleanAcc = (acc.accountNumber || '').replace(/\D/g, '');
      const isProtected = Boolean(
        cleanAcc === '1000170986671' ||
        (acc.name || '').toLowerCase().includes('global') ||
        SENDER_PRESET_BALANCES[cleanAcc] ||
        RECEIVER_PRESET_BALANCES[cleanAcc] ||
        liveCbeByAcc.has(cleanAcc)
      );

      let b = Number.isFinite(acc.availableBalance) ? acc.availableBalance : 500;
      if (!isProtected) {
        let guard = 0;
        while (usedAvail.has(b) && guard < 2000) {
          b = Math.round((b + 0.25) * 100) / 100;
          guard++;
        }
      }
      acc.availableBalance = b;
      acc.balance = b;
      usedAvail.add(b);
    }

    return accounts;
  },

  mergeCanonicalCbeAccounts(list: CallerAccount[]): CallerAccount[] {
    const merged = [...list];
    const byCleanAcc = new Map<string, CallerAccount>();
    for (const a of merged) {
      const clean = (a.accountNumber || '').replace(/\D/g, '');
      if (clean && !byCleanAcc.has(clean)) {
        byCleanAcc.set(clean, a);
      }
    }
    try {
      for (const e of ALL_NEW_REGISTERED_ENTRIES) {
        const clean = (e.accountNumber || '').replace(/\D/g, '');
        if (!clean || byCleanAcc.has(clean)) continue;
        const entry: CallerAccount = {
          id: 'acc-cbe-' + clean,
          name: e.name,
          phoneNumber: e.phone || '+251911000000',
          accountNumber: clean,
          accountType: `Saving Account-${clean.slice(-4)}`,
          initialBalance: e.balance,
          balance: e.balance,
          availableBalance: e.balance,
          totalReceived: 0,
          totalSent: 0,
          role: 'receiver',
          simSlot: 1,
          avatarColor: 'from-purple-600 to-indigo-700',
          note: 'CBE Registered Account',
        };
        merged.push(entry);
        byCleanAcc.set(clean, entry);
      }
    } catch {}
    try {
      const canonicalCbe = getCanonicalCbeRegisteredAccounts();
      for (const cbeAcc of canonicalCbe) {
        const clean = cbeAcc.accountNumber;
        if (!clean) continue;
        const existing = byCleanAcc.get(clean);
        if (existing) {
          if (cbeAcc.accountName) existing.name = cbeAcc.accountName;
          if (cbeAcc.phone) existing.phoneNumber = cbeAcc.phone;
          existing.balance = cbeAcc.balance;
          existing.availableBalance = cbeAcc.balance;
        } else {
          const entry: CallerAccount = {
            id: 'acc-cbe-' + clean,
            name: cbeAcc.accountName,
            phoneNumber: cbeAcc.phone || '+251911000000',
            accountNumber: clean,
            accountType: `Saving Account-${clean.slice(-4)}`,
            initialBalance: cbeAcc.balance,
            balance: cbeAcc.balance,
            availableBalance: cbeAcc.balance,
            totalReceived: 0,
            totalSent: 0,
            role: 'sender',
            simSlot: 1,
            avatarColor: 'from-purple-600 to-indigo-700',
            note: 'CBE Registered Account',
          };
          merged.push(entry);
          byCleanAcc.set(clean, entry);
        }
      }
    } catch {}
    return merged;
  },

  getCallerAccounts(options?: { bypassCache?: boolean }): CallerAccount[] {
    const now = Date.now();
    if (!options?.bypassCache && _cachedAccounts && now - _cachedAccountsAt < 1500) {
      return _cachedAccounts;
    }

    try {
      const data = localStorage.getItem(STORAGE_KEY_CALLER_ACCOUNTS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Automatically register & update ALL CBE registered accounts in Phone *889#
          const withCbe = this.mergeCanonicalCbeAccounts(parsed);
          const sanitized = this.normalizeAccounts(withCbe);

          // Ensure recent transactions are sorted to the top
          sanitized.sort((a: CallerAccount, b: CallerAccount) => {
            if (a.isNow && !b.isNow) return -1;
            if (!a.isNow && b.isNow) return 1;
            const tA = a.lastTxTimestamp || 0;
            const tB = b.lastTxTimestamp || 0;
            if (tA !== tB) return tB - tA;
            if (a.lastTxAmount && !b.lastTxAmount) return -1;
            if (!a.lastTxAmount && b.lastTxAmount) return 1;
            return 0;
          });

          _cachedAccounts = sanitized;
          _cachedAccountsAt = now;

          // Only persist back when count changed or first load to avoid unnecessary storage writes
          if (sanitized.length !== parsed.length) {
            try {
              localStorage.setItem(STORAGE_KEY_CALLER_ACCOUNTS, JSON.stringify(sanitized));
            } catch {}
          }

          return sanitized;
        }
      }
    } catch (e) {
      console.error('Failed to load caller accounts', e);
    }
    const fresh = this.normalizeAccounts(
      this.mergeCanonicalCbeAccounts(INITIAL_CALLER_ACCOUNTS.map(a => ({ ...a })))
    );
    _cachedAccounts = fresh;
    _cachedAccountsAt = now;
    try {
      localStorage.setItem(STORAGE_KEY_CALLER_ACCOUNTS, JSON.stringify(fresh));
    } catch {}
    return fresh;
  },

  saveCallerAccounts(accounts: CallerAccount[], options?: { alreadyNormalized?: boolean }): void {
    try {
      const normalized = options?.alreadyNormalized ? accounts : this.normalizeAccounts(accounts);
      _cachedAccounts = normalized;
      _cachedAccountsAt = Date.now();
      try {
        localStorage.setItem(STORAGE_KEY_CALLER_ACCOUNTS, JSON.stringify(normalized));
      } catch {
        // Non-fatal if iOS Safari storage quota is tight
      }
      window.dispatchEvent(new CustomEvent('caller_accounts_updated', { detail: { accounts: normalized } }));
    } catch (e) {
      console.error('Failed to save caller accounts', e);
    }
  },

  getActiveCallerAccountId(): string {
    try {
      const id = localStorage.getItem(STORAGE_KEY_ACTIVE_CALLER_ID);
      if (id) return id;
    } catch {}
    return 'acc-global';
  },

  setActiveCallerAccountId(id: string): void {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_CALLER_ID, id);
      window.dispatchEvent(new CustomEvent('caller_account_changed', { detail: { activeId: id } }));
    } catch (e) {
      console.error('Failed to set active caller account', e);
    }
  },

  getActiveCallerAccount(): CallerAccount {
    const accounts = this.getCallerAccounts();
    const activeId = this.getActiveCallerAccountId();
    const found = accounts.find(a => a.id === activeId);
    return found || accounts.find(a => a.id === 'acc-global') || accounts[0] || INITIAL_CALLER_ACCOUNTS[0];
  },

  // Called automatically whenever any transaction is executed in CBE Banking
  syncTransactionToCallerApp(tx: Transaction, options?: { notify?: boolean }): void {
    const accounts = this.getCallerAccounts();
    const txTimestamp = tx.createdAt ? new Date(tx.createdAt).getTime() : Date.now();
    const dateStr = new Date(txTimestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric' });
    const timeStr = new Date(txTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Reset previous isNow flags so only the newest transaction has isNow=true
    for (const acc of accounts) {
      acc.isNow = false;
    }

    // 1. Resolve Sender
    const senderName = (tx.senderName || 'Sender').trim();
    const senderAccount = tx.senderAccount || '1000284758657';
    let senderPhone = '+251 91 189 2525';
    if (senderName.toLowerCase().includes('dejene')) {
      senderPhone = '+251 97 873 0420'; // abaye from screenshot
    } else if (senderName.toLowerCase().includes('leykun')) {
      senderPhone = '096 816 1314';
    } else if (senderName.toLowerCase().includes('kasahun')) {
      senderPhone = '+251 91 189 2525';
    } else if (senderName.toLowerCase().includes('selam')) {
      senderPhone = '+251 92 345 6789';
    } else {
      senderPhone = '+251 9' + Math.floor(10000000 + Math.random() * 90000000);
    }

    // 2. Resolve Receiver
    const recipientName = (tx.recipientName || 'Receiver').trim();
    const recipientAccount = tx.recipientAccount || '1000419524747';
    let recipientPhone = '096 816 1314';
    if (recipientName.toLowerCase().includes('dejene')) {
      recipientPhone = '+251 97 873 0420';
    } else if (recipientName.toLowerCase().includes('leykun')) {
      recipientPhone = '096 816 1314';
    } else if (recipientName.toLowerCase().includes('kasahun')) {
      recipientPhone = '+251 91 189 2525';
    } else if (recipientName.toLowerCase().includes('selam')) {
      recipientPhone = '+251 92 345 6789';
    } else {
      recipientPhone = '+251 9' + Math.floor(10000000 + Math.random() * 90000000);
    }

    const currentBalances = new Set<number>(accounts.map(a => a.balance));

    // Find or add Sender
    let senderAcc = accounts.find(
      a => a.accountNumber === senderAccount || a.name.toLowerCase() === senderName.toLowerCase()
    );
    if (!senderAcc) {
      const initialBal = getPresetOrUniqueSenderBalance(senderAccount, senderName, currentBalances);
      const avail = Math.max(0, Math.round((initialBal - tx.amount) * 100) / 100);
      senderAcc = {
        id: 'acc-' + Math.random().toString(36).substring(2, 9),
        name: senderName,
        phoneNumber: senderPhone,
        accountNumber: senderAccount,
        accountType: 'Saving Account-' + senderAccount.slice(-4),
        initialBalance: initialBal,
        balance: avail,
        availableBalance: avail,
        totalSent: tx.amount,
        totalReceived: 0,
        role: 'sender',
        simSlot: 2,
        lastTxId: tx.id,
        lastTxAmount: tx.amount,
        lastTxDate: dateStr,
        lastTxTimestamp: txTimestamp,
        isNow: true,
        avatarColor: 'from-amber-600 to-orange-700',
        note: `CBE Transaction Sender (${tx.amount} ETB)`
      };
      accounts.unshift(senderAcc);
    } else {
      senderAcc.lastTxId = tx.id;
      senderAcc.lastTxAmount = tx.amount;
      senderAcc.lastTxDate = dateStr;
      senderAcc.lastTxTimestamp = txTimestamp;
      senderAcc.isNow = true;
      senderAcc.totalSent = (senderAcc.totalSent || 0) + tx.amount;
      const baseInit = senderAcc.initialBalance || senderAcc.balance || 10482.00;
      senderAcc.availableBalance = Math.max(0, Math.round((baseInit - senderAcc.totalSent) * 100) / 100);
      senderAcc.balance = senderAcc.availableBalance;
    }

    // Find or add Receiver
    let receiverAcc = accounts.find(
      a => a.accountNumber === recipientAccount || a.name.toLowerCase() === recipientName.toLowerCase()
    );
    if (!receiverAcc) {
      // Receiver initial balance strictly between 500 and 150000 ETB
      const initialBal = getPresetOrUniqueReceiverBalance(recipientAccount, recipientName, currentBalances);
      receiverAcc = {
        id: 'acc-' + Math.random().toString(36).substring(2, 9),
        name: recipientName,
        phoneNumber: recipientPhone,
        accountNumber: recipientAccount,
        accountType: 'Saving Account-' + recipientAccount.slice(-4),
        initialBalance: initialBal,
        balance: initialBal,
        availableBalance: initialBal,
        role: 'receiver',
        simSlot: 1,
        lastTxId: tx.id,
        lastTxAmount: tx.amount,
        lastTxDate: dateStr,
        lastTxTimestamp: txTimestamp,
        isNow: true,
        avatarColor: 'from-blue-600 to-indigo-700',
        note: `CBE Transaction Receiver (${tx.amount} ETB)`
      };
      accounts.unshift(receiverAcc);
    } else {
      receiverAcc.lastTxId = tx.id;
      receiverAcc.lastTxAmount = tx.amount;
      receiverAcc.lastTxDate = dateStr;
      receiverAcc.lastTxTimestamp = txTimestamp;
      receiverAcc.isNow = true;
    }

    // Add in transaction to Receiver account
    const d = new Date(txTimestamp);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const isoDateStr = d.toISOString().replace('T', ' ').slice(0, 16);
    const formattedAmt = formatUssdTxAmount(tx.amount);

    const inTxItem: AccountTransactionItem = {
      id: `tx-recv-${tx.id || Date.now()}`,
      line: `+${formattedAmt} on ${day}/${month}`,
      amount: `+${tx.amount.toFixed(2)} ETB`,
      rawAmount: tx.amount,
      type: 'in',
      paymentAbout: tx.description || 'Pay done via Mobile',
      sender: senderAcc.name,
      senderAccount: senderAcc.accountNumber,
      receiver: receiverAcc.name,
      receiverAccount: receiverAcc.accountNumber,
      date: isoDateStr,
      timestamp: txTimestamp
    };
    const receiverTxs = this.getCallerTransactions(receiverAcc.id);
    if (!receiverTxs.some(t => t.id === inTxItem.id)) {
      receiverTxs.unshift(inTxItem);
      this.saveCallerTransactions(receiverAcc.id, receiverTxs);
    }

    // Add out transaction to Sender account
    const outTxItem: AccountTransactionItem = {
      id: `tx-send-${tx.id || Date.now()}`,
      line: `-${formattedAmt} on ${day}/${month}`,
      amount: `-${tx.amount.toFixed(2)} ETB`,
      rawAmount: tx.amount,
      type: 'out',
      paymentAbout: tx.description || 'Pay done via Mobile',
      sender: senderAcc.name,
      senderAccount: senderAcc.accountNumber,
      receiver: receiverAcc.name,
      receiverAccount: receiverAcc.accountNumber,
      date: isoDateStr,
      timestamp: txTimestamp
    };
    const senderTxs = this.getCallerTransactions(senderAcc.id);
    if (!senderTxs.some(t => t.id === outTxItem.id)) {
      senderTxs.unshift(outTxItem);
      this.saveCallerTransactions(senderAcc.id, senderTxs);
    }

    // Normalize ONCE and save cleanly without redundant re-normalization
    this.normalizeAccounts(accounts);

    // Sort accounts so that recent transactions are always at the top
    accounts.sort((a, b) => {
      if (a.isNow && !b.isNow) return -1;
      if (!a.isNow && b.isNow) return 1;
      const tA = a.lastTxTimestamp || 0;
      const tB = b.lastTxTimestamp || 0;
      if (tA !== tB) return tB - tA;
      if (a.lastTxAmount && !b.lastTxAmount) return -1;
      if (!a.lastTxAmount && b.lastTxAmount) return 1;
      return 0;
    });

    this.saveCallerAccounts(accounts, { alreadyNormalized: true });

    // Add a call interaction between sender and receiver in the call logs
    // Both can call each other!
    this.addCallLog({
      contactName: senderAcc.name,
      phoneNumber: senderAcc.phoneNumber,
      simSlot: 2,
      type: 'incoming',
      timestamp: timeStr,
      duration: '1m 20s',
      hasWhatsApp: true
    });

    // Also register them in Contacts
    const contacts = this.getContacts();
    if (!contacts.some(c => c.name === senderAcc!.name)) {
      this.addContact({
        name: senderAcc.name,
        phoneNumber: senderAcc.phoneNumber,
        simPreferred: 2,
        avatarColor: senderAcc.avatarColor,
        note: `Sender: ${senderAcc.accountNumber}`
      });
    }
    if (!contacts.some(c => c.name === receiverAcc!.name)) {
      this.addContact({
        name: receiverAcc.name,
        phoneNumber: receiverAcc.phoneNumber,
        simPreferred: 1,
        avatarColor: receiverAcc.avatarColor,
        note: `Receiver: ${receiverAcc.accountNumber}`
      });
    }

    // Fire immediate Phone *889# notification for sender and queue receiver's alert for account switch!
    if (options?.notify !== false) {
      try {
        const formattedAmtNotif = Number(tx.amount || 0).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const senderBody = `${senderAcc.name}: *889# debit of ETB ${formattedAmtNotif} to ${receiverAcc.name}. Available Balance: ETB ${(senderAcc.availableBalance ?? senderAcc.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
        const receiverBody = `${receiverAcc.name}: You received ETB ${formattedAmtNotif} from ${senderAcc.name}. Available Balance: ETB ${(receiverAcc.availableBalance ?? receiverAcc.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;

        const isReceiveTx = tx.type === 'receive';
        void PushNotificationService.notifySubApp({
          subAppId: 'phone',
          title: 'CBE *889#',
          body: isReceiveTx ? receiverBody : senderBody,
          privateBody: 'New CBE *889# USSD transaction update.',
          reference: tx.reference || tx.id,
          tag: `cbe-phone-${tx.id || Date.now()}`,
          payloadRecord: {
            id: `phone-tx-${tx.id || Date.now()}`,
            senderAccount: senderAcc.accountNumber,
            senderName: senderAcc.name,
            receiverAccount: receiverAcc.accountNumber,
            receiverName: receiverAcc.name,
            amount: tx.amount,
            reference: tx.reference || tx.id,
            body: isReceiveTx ? receiverBody : senderBody,
            timestamp: txTimestamp,
          },
        });

        const cleanSenderAcc = (senderAcc.accountNumber || '').replace(/\D/g, '');
        const cleanRecipAcc = (receiverAcc.accountNumber || '').replace(/\D/g, '');
        if (!isReceiveTx && cleanRecipAcc && cleanRecipAcc !== cleanSenderAcc) {
          this.enqueuePendingReceiverAlert(cleanRecipAcc, {
            id: `phone-recv-${tx.id || Date.now()}`,
            title: 'CBE *889#',
            body: receiverBody,
            reference: tx.reference || tx.id,
            amount: tx.amount,
            senderName: senderAcc.name,
            senderAccount: senderAcc.accountNumber,
            receiverName: receiverAcc.name,
            receiverAccount: receiverAcc.accountNumber,
            timestamp: txTimestamp,
          });
        }
      } catch {}
    }
  },

  setActiveCallerByAccountNumber(accountNumber: string): CallerAccount | null {
    const clean = (accountNumber || '').replace(/\D/g, '');
    if (!clean) return null;
    const accounts = this.getCallerAccounts();
    const match = accounts.find(a => (a.accountNumber || '').replace(/\D/g, '') === clean);
    if (match) {
      this.setActiveCallerAccountId(match.id);
      return match;
    }
    return null;
  },

  enqueuePendingReceiverAlert(
    accountNumber: string,
    payload: {
      id: string;
      title: string;
      body: string;
      reference?: string;
      amount?: number;
      senderName?: string;
      senderAccount?: string;
      receiverName?: string;
      receiverAccount?: string;
      timestamp?: number;
    }
  ): void {
    const cleanAcc = (accountNumber || '').replace(/\D/g, '');
    if (!cleanAcc) return;
    try {
      const raw = localStorage.getItem(PENDING_RECEIVER_PHONE_NOTIFS_KEY);
      const list: Array<{ accountNumber: string; payload: typeof payload; createdAt: number }> = raw
        ? JSON.parse(raw)
        : [];
      const deduped = list.filter(item => item?.payload?.id !== payload.id);
      deduped.push({ accountNumber: cleanAcc, payload, createdAt: Date.now() });
      localStorage.setItem(PENDING_RECEIVER_PHONE_NOTIFS_KEY, JSON.stringify(deduped.slice(-40)));
    } catch {}
  },

  deliverPendingReceiverAlerts(accountNumber: string): number {
    const cleanAcc = (accountNumber || '').replace(/\D/g, '');
    if (!cleanAcc) return 0;
    try {
      const raw = localStorage.getItem(PENDING_RECEIVER_PHONE_NOTIFS_KEY);
      if (!raw) return 0;
      const list: Array<{ accountNumber: string; payload: any; createdAt: number }> = JSON.parse(raw);
      if (!Array.isArray(list) || list.length === 0) return 0;

      const matching = list.filter(item => (item?.accountNumber || '').replace(/\D/g, '') === cleanAcc);
      if (matching.length === 0) return 0;

      const remaining = list.filter(item => (item?.accountNumber || '').replace(/\D/g, '') !== cleanAcc);
      localStorage.setItem(PENDING_RECEIVER_PHONE_NOTIFS_KEY, JSON.stringify(remaining));

      for (const item of matching) {
        const p = item.payload;
        if (!p) continue;
        void PushNotificationService.notifySubApp({
          subAppId: 'phone',
          title: p.title || 'CBE *889#',
          body: p.body || 'New *889# credit received.',
          privateBody: 'New CBE *889# USSD credit alert.',
          reference: p.reference,
          tag: `cbe-phone-recv-${p.id}`,
          payloadRecord: p,
        });
      }
      return matching.length;
    } catch {
      return 0;
    }
  },

  applyNativeIncomingAlert(raw: Record<string, unknown>): void {
    try {
      if (!raw || typeof raw !== 'object') return;
      const amount = typeof raw.amount === 'number' ? raw.amount : 0;
      const senderAccount = typeof raw.senderAccount === 'string' ? raw.senderAccount : '';
      const receiverAccount = typeof raw.receiverAccount === 'string' ? raw.receiverAccount : '';
      if (amount > 0 && (senderAccount || receiverAccount)) {
        const tx: Transaction = {
          id: typeof raw.id === 'string' ? raw.id : `phone-native-${Date.now()}`,
          type: 'transfer',
          senderName: typeof raw.senderName === 'string' ? raw.senderName : 'Sender',
          senderAccount: senderAccount || '1000284758657',
          recipientName: typeof raw.receiverName === 'string' ? raw.receiverName : 'Receiver',
          recipientAccount: receiverAccount || '1000419524747',
          recipientBank: 'Commercial Bank of Ethiopia',
          amount,
          fee: 0,
          description: 'Pay done via Mobile',
          reference: typeof raw.reference === 'string' ? raw.reference : undefined,
          status: 'success',
          createdAt: new Date(typeof raw.timestamp === 'number' ? raw.timestamp : Date.now()).toISOString(),
        };
        this.syncTransactionToCallerApp(tx, { notify: false });
      }
    } catch {}
  },

  // Scan all past transactions and ensure all senders and receivers have caller accounts (fast single-pass batch)
  syncAllTransactionsToCallerAccounts(txs?: Transaction[]): void {
    const raw = txs || LocalDb.getTransactions();
    if (!raw || raw.length === 0) return;
    invalidateCallerAccountsCache();
    const list = [...raw];
    // Sort oldest first so that the latest transaction is synced last and gets isNow=true and highest timestamp
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Skip already-synced transactions so opening Phone is instantaneous
    const txMap = readStoredTxMapFast();
    const alreadySyncedTxIds = new Set<string>();
    for (const items of Object.values(txMap)) {
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (item?.id?.startsWith('tx-recv-')) alreadySyncedTxIds.add(item.id.slice('tx-recv-'.length));
        if (item?.id?.startsWith('tx-send-')) alreadySyncedTxIds.add(item.id.slice('tx-send-'.length));
      }
    }

    const pending = list.filter(tx => tx?.id && !alreadySyncedTxIds.has(tx.id));
    if (pending.length === 0) {
      // Just ensure accounts cache is fresh
      this.getCallerAccounts();
      return;
    }

    for (const tx of pending) {
      this.syncTransactionToCallerApp(tx, { notify: false });
    }
  }
};

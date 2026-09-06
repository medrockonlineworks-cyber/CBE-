import { LocalDb } from '../lib/mockData';
import { UserProfile, Transaction } from '../types';

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
const STORAGE_KEY_CALLER_ACCOUNTS = 'tana_caller_accounts_v2';
const STORAGE_KEY_ACTIVE_CALLER_ID = 'tana_active_caller_account_id_v1';
const STORAGE_KEY_CALLER_TRANSACTIONS = 'tana_caller_transactions_v4';

export function formatUssdTxAmount(amt: number): string {
  if (amt < 1 && amt > 0) return amt.toFixed(2);
  if (Number.isInteger(amt)) return amt.toFixed(1);
  const dec = amt.toString().split('.')[1] || '';
  return dec.length === 1 ? amt.toFixed(1) : amt.toFixed(2);
}

// Distinct initial balances for receivers strictly within [500.00, 150000.00] ETB
export const RECEIVER_PRESET_BALANCES: Record<string, number> = {
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
  '0911049165': 3250.00,     // Telebirr Wallet
  '1128472910': 14850.00,    // BOA Selamawit
};

// Distinct initial balances for senders (none duplicate receivers or each other)
export const SENDER_PRESET_BALANCES: Record<string, number> = {
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
  }
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
      receiver: isCurrentOut ? 'Leykun Jemaneh Ylma' : acc.name,
      receiverAccount: isCurrentOut ? '1000419524747' : acc.accountNumber,
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
      const stored = localStorage.getItem(STORAGE_KEY_CALLER_TRANSACTIONS);
      let allMap: Record<string, AccountTransactionItem[]> = {};
      if (stored) {
        allMap = JSON.parse(stored);
      }
      if (allMap[accountId] && allMap[accountId].length >= 8) {
        return allMap[accountId];
      }

      // Need to seed or top-up traction
      const allAccounts = this.getCallerAccountsRaw();
      const acc = allAccounts.find(a => a.id === accountId) || allAccounts[0];
      if (!acc) return [];

      const seeded = this.generateSmallTractionTransactions(acc);
      allMap[accountId] = seeded;
      try {
        localStorage.setItem(STORAGE_KEY_CALLER_TRANSACTIONS, JSON.stringify(allMap));
      } catch {}
      return seeded;
    } catch {
      const allAccounts = this.getCallerAccountsRaw();
      const acc = allAccounts.find(a => a.id === accountId) || allAccounts[0];
      return acc ? this.generateSmallTractionTransactions(acc) : [];
    }
  },

  saveCallerTransactions(accountId: string, txs: AccountTransactionItem[]): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CALLER_TRANSACTIONS);
      let allMap: Record<string, AccountTransactionItem[]> = {};
      if (stored) {
        allMap = JSON.parse(stored);
      }
      allMap[accountId] = txs;
      localStorage.setItem(STORAGE_KEY_CALLER_TRANSACTIONS, JSON.stringify(allMap));
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
    return [...INITIAL_CALLER_ACCOUNTS];
  },

  /**
   * Normalizes all accounts to strictly satisfy:
   * 1. Every receiver bank account initial balance is in range [500.00 - 150000.00] ETB.
   * 2. Every single account in the system has a unique, different balance (no duplicates).
   * 3. Available balance is strictly the total of received amount and initial balance (net of sent debits).
   */
  normalizeAccounts(accounts: CallerAccount[]): CallerAccount[] {
    const usedBalances = new Set<number>();

    // Pass 1: Receivers (guarantee initial balance is in [500.00, 150000.00] and unique)
    for (const acc of accounts) {
      if (acc.role === 'receiver') {
        let initBal = typeof acc.initialBalance === 'number' && !isNaN(acc.initialBalance) 
          ? Math.round(acc.initialBalance * 100) / 100 
          : (typeof acc.balance === 'number' && !isNaN(acc.balance) ? Math.round(acc.balance * 100) / 100 : 0);

        // If outside 500-150000 or duplicate of already used balance
        if (initBal < 500 || initBal > 150000 || usedBalances.has(initBal)) {
          initBal = getPresetOrUniqueReceiverBalance(acc.accountNumber, acc.name, usedBalances);
        }

        acc.initialBalance = initBal;
        usedBalances.add(initBal);

        // Calculate available balance: strictly the total of the received amount and initial balance
        const txs = this.getCallerTransactions(acc.id);
        const inTx = txs.find(t => t.type === 'in');
        const receivedAmt = inTx ? inTx.rawAmount : (acc.lastTxAmount || 50.0);

        acc.totalReceived = receivedAmt;
        acc.totalSent = Math.round(txs.filter(t => t.type === 'out').reduce((sum, t) => sum + t.rawAmount, 0) * 100) / 100;
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
        const currentSent = (acc.lastTxAmount && acc.lastTxAmount > 0) ? acc.lastTxAmount : 50.0;
        const presetAvail = SENDER_PRESET_BALANCES[cleanAcc];

        let initBal: number;
        if (presetAvail) {
          // If preset available balance exists (e.g. 10,432.00 ETB), initial balance is preset + currentSent (10,482.00 ETB)
          initBal = Math.round((presetAvail + currentSent) * 100) / 100;
        } else if (typeof acc.initialBalance === 'number' && !isNaN(acc.initialBalance) && acc.initialBalance > currentSent) {
          initBal = Math.round(acc.initialBalance * 100) / 100;
        } else if (typeof acc.balance === 'number' && !isNaN(acc.balance) && acc.balance > 0) {
          initBal = Math.round((acc.balance + currentSent) * 100) / 100;
        } else {
          initBal = getPresetOrUniqueSenderBalance(acc.accountNumber, acc.name, usedBalances);
        }

        while (usedBalances.has(initBal)) {
          initBal = Math.round((initBal + 173.25) * 100) / 100;
        }

        acc.initialBalance = initBal;
        usedBalances.add(initBal);

        acc.totalSent = currentSent;
        acc.totalReceived = 0;

        // Correct sender available balance: strictly initial balance minus the current sent amount
        let availBal = Math.max(0, Math.round((acc.initialBalance - currentSent) * 100) / 100);
        if (availBal <= 0) availBal = 100;

        acc.availableBalance = availBal;
        acc.balance = availBal;
      }
    }

    // Pass 3: Ensure availableBalance is distinct across every single account
    const usedAvail = new Set<number>();
    for (const acc of accounts) {
      let b = acc.availableBalance;
      while (usedAvail.has(b)) {
        b = Math.round((b + 0.25) * 100) / 100;
      }
      acc.availableBalance = b;
      acc.balance = b;
      usedAvail.add(b);
    }

    return accounts;
  },

  getCallerAccounts(): CallerAccount[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CALLER_ACCOUNTS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize existing accounts to guarantee all receivers have 500-150000 and all accounts are distinct
          const sanitized = this.normalizeAccounts(parsed);

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

          // Resave sanitized version so localStorage stays clean
          try {
            localStorage.setItem(STORAGE_KEY_CALLER_ACCOUNTS, JSON.stringify(sanitized));
          } catch {}

          return sanitized;
        }
      }
    } catch (e) {
      console.error('Failed to load caller accounts', e);
    }
    const fresh = this.normalizeAccounts([...INITIAL_CALLER_ACCOUNTS]);
    this.saveCallerAccounts(fresh);
    return fresh;
  },

  saveCallerAccounts(accounts: CallerAccount[]): void {
    try {
      const normalized = this.normalizeAccounts(accounts);
      localStorage.setItem(STORAGE_KEY_CALLER_ACCOUNTS, JSON.stringify(normalized));
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
    return 'acc-dejene';
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
    return found || accounts[0] || INITIAL_CALLER_ACCOUNTS[0];
  },

  // Called automatically whenever any transaction is executed in CBE Banking
  syncTransactionToCallerApp(tx: Transaction): void {
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
      senderAcc = {
        id: 'acc-' + Math.random().toString(36).substring(2, 9),
        name: senderName,
        phoneNumber: senderPhone,
        accountNumber: senderAccount,
        accountType: 'Saving Account-' + senderAccount.slice(-4),
        initialBalance: initialBal,
        balance: initialBal,
        availableBalance: initialBal,
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

    // Normalize and ensure all accounts have different balances, receivers are 500-150000,
    // and available balance is total of received amount and initial balance
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

    this.saveCallerAccounts(accounts);

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
  },

  // Scan all past transactions and ensure all senders and receivers have caller accounts
  syncAllTransactionsToCallerAccounts(txs?: Transaction[]): void {
    const raw = txs || LocalDb.getTransactions();
    if (!raw || raw.length === 0) return;
    const list = [...raw];
    // Sort oldest first so that the latest transaction is synced last and gets isNow=true and highest timestamp
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const tx of list) {
      this.syncTransactionToCallerApp(tx);
    }
  }
};

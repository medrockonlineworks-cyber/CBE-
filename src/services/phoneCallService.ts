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

export interface CallerAccount {
  id: string;
  name: string;
  phoneNumber: string;
  accountNumber: string;
  accountType?: string;
  balance: number;
  availableBalance: number;
  role: 'sender' | 'receiver' | 'user';
  simSlot: 1 | 2;
  lastTxId?: string;
  lastTxAmount?: number;
  lastTxDate?: string;
  avatarColor?: string;
  note?: string;
}

const STORAGE_KEY_CALL_LOGS = 'tana_phone_call_logs_v1';
const STORAGE_KEY_CONTACTS = 'tana_phone_contacts_v1';
const STORAGE_KEY_CALLER_ACCOUNTS = 'tana_caller_accounts_v1';
const STORAGE_KEY_ACTIVE_CALLER_ID = 'tana_active_caller_account_id_v1';

export const INITIAL_CALLER_ACCOUNTS: CallerAccount[] = [
  {
    id: 'acc-leykun',
    name: 'Leykun Jemaneh Ylma',
    phoneNumber: '096 816 1314',
    accountNumber: '1000419524747',
    accountType: 'Saving Account-4747',
    balance: 348.54,
    availableBalance: 348.54,
    role: 'receiver',
    simSlot: 1,
    avatarColor: 'from-blue-600 to-indigo-700',
    note: 'CBE Mobile Banking (Receiver)'
  },
  {
    id: 'acc-dejene',
    name: 'Dejene Buta Feye',
    phoneNumber: '+251 97 873 0420',
    accountNumber: '1000284758657',
    accountType: 'Saving Account-8657',
    balance: 12450.00,
    availableBalance: 12450.00,
    role: 'sender',
    simSlot: 2,
    avatarColor: 'from-emerald-600 to-teal-700',
    note: 'Sender of +50.00 ETB (abaye)'
  },
  {
    id: 'acc-kasahun',
    name: 'Kasahun Yematawork Lema',
    phoneNumber: '+251 91 189 2525',
    accountNumber: '1000482918925',
    accountType: 'Saving Account-8925',
    balance: 8760.00,
    availableBalance: 8760.00,
    role: 'sender',
    simSlot: 1,
    avatarColor: 'from-purple-600 to-pink-700',
    note: 'Payer / Sender'
  },
  {
    id: 'acc-selamawit',
    name: 'Selamawit Tekle',
    phoneNumber: '+251 92 345 6789',
    accountNumber: '1000246810121',
    accountType: 'Saving Account-0121',
    balance: 25430.00,
    availableBalance: 25430.00,
    role: 'sender',
    simSlot: 2,
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

  getCallerAccounts(): CallerAccount[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CALLER_ACCOUNTS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load caller accounts', e);
    }
    return INITIAL_CALLER_ACCOUNTS;
  },

  saveCallerAccounts(accounts: CallerAccount[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_CALLER_ACCOUNTS, JSON.stringify(accounts));
      window.dispatchEvent(new CustomEvent('caller_accounts_updated', { detail: { accounts } }));
    } catch (e) {
      console.error('Failed to save caller accounts', e);
    }
  },

  getActiveCallerAccountId(): string {
    try {
      const id = localStorage.getItem(STORAGE_KEY_ACTIVE_CALLER_ID);
      if (id) return id;
    } catch {}
    return 'acc-leykun';
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
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric' });
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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

    // Find or add Sender
    let senderAcc = accounts.find(
      a => a.accountNumber === senderAccount || a.name.toLowerCase() === senderName.toLowerCase()
    );
    if (!senderAcc) {
      senderAcc = {
        id: 'acc-' + Math.random().toString(36).substring(2, 9),
        name: senderName,
        phoneNumber: senderPhone,
        accountNumber: senderAccount,
        accountType: 'Saving Account-' + senderAccount.slice(-4),
        balance: Math.max(0, 10000 - tx.amount),
        availableBalance: Math.max(0, 10000 - tx.amount),
        role: 'sender',
        simSlot: 2,
        lastTxId: tx.id,
        lastTxAmount: tx.amount,
        lastTxDate: dateStr,
        avatarColor: 'from-amber-600 to-orange-700',
        note: `CBE Transaction Sender (${tx.amount} ETB)`
      };
      accounts.push(senderAcc);
    } else {
      senderAcc.lastTxId = tx.id;
      senderAcc.lastTxAmount = tx.amount;
      senderAcc.lastTxDate = dateStr;
      senderAcc.balance = Math.max(0, senderAcc.balance - tx.amount);
      senderAcc.availableBalance = senderAcc.balance;
    }

    // Find or add Receiver
    let receiverAcc = accounts.find(
      a => a.accountNumber === recipientAccount || a.name.toLowerCase() === recipientName.toLowerCase()
    );
    if (!receiverAcc) {
      receiverAcc = {
        id: 'acc-' + Math.random().toString(36).substring(2, 9),
        name: recipientName,
        phoneNumber: recipientPhone,
        accountNumber: recipientAccount,
        accountType: 'Saving Account-' + recipientAccount.slice(-4),
        balance: 348.54 + tx.amount,
        availableBalance: 348.54 + tx.amount,
        role: 'receiver',
        simSlot: 1,
        lastTxId: tx.id,
        lastTxAmount: tx.amount,
        lastTxDate: dateStr,
        avatarColor: 'from-blue-600 to-indigo-700',
        note: `CBE Transaction Receiver (${tx.amount} ETB)`
      };
      accounts.push(receiverAcc);
    } else {
      receiverAcc.lastTxId = tx.id;
      receiverAcc.lastTxAmount = tx.amount;
      receiverAcc.lastTxDate = dateStr;
      receiverAcc.balance = receiverAcc.balance + tx.amount;
      receiverAcc.availableBalance = receiverAcc.balance;
    }

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
    const list = txs || LocalDb.getTransactions();
    if (!list || list.length === 0) return;
    for (const tx of list) {
      this.syncTransactionToCallerApp(tx);
    }
  }
};

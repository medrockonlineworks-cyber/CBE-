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

const STORAGE_KEY_CALL_LOGS = 'tana_phone_call_logs_v1';
const STORAGE_KEY_CONTACTS = 'tana_phone_contacts_v1';

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
  }
};

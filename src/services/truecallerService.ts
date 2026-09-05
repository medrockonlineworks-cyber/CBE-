import { TruecallerBankAccount, TruecallerAlert, TruecallerRole, TruecallerBankKey } from '../types/truecaller';

const STORAGE_TC_ACCOUNTS_KEY = 'tc_sim_accounts_v1';
const STORAGE_TC_ALERTS_KEY = 'tc_sim_alerts_v1';
const STORAGE_TC_ACTIVE_ACC_KEY = 'tc_sim_active_account_id';

export const BANK_PRESETS: { key: TruecallerBankKey; name: string; shortName: string; color: string; defaultPrefix: string; accLength: number }[] = [
  { key: 'cbe', name: 'Cbe Bank', shortName: 'CBE', color: '#5e1887', defaultPrefix: '1000', accLength: 13 },
  { key: 'telebirr', name: 'telebirr', shortName: 'Telebirr', color: '#0085ca', defaultPrefix: '09', accLength: 10 },
  { key: 'abyssinia', name: 'Abyssinia Bank', shortName: 'BOA', color: '#f59e0b', defaultPrefix: '112', accLength: 10 },
  { key: 'awash', name: 'Awash Bank', shortName: 'Awash', color: '#ea580c', defaultPrefix: '013', accLength: 14 },
  { key: 'dashen', name: 'Dashen Bank', shortName: 'Dashen', color: '#1e3a8a', defaultPrefix: '524', accLength: 13 },
  { key: 'oromia', name: 'Oromia Bank', shortName: 'Oromia', color: '#b91c1c', defaultPrefix: '142', accLength: 11 },
  { key: 'coop', name: 'Coop Bank', shortName: 'Coop', color: '#0284c7', defaultPrefix: '102', accLength: 11 },
  { key: 'hibret', name: 'Hibret Bank', shortName: 'Hibret', color: '#4338ca', defaultPrefix: '110', accLength: 11 },
  { key: 'nib', name: 'Nib Bank', shortName: 'Nib', color: '#0d9488', defaultPrefix: '700', accLength: 10 },
  { key: 'wegagen', name: 'Wegagen Bank', shortName: 'Wegagen', color: '#d97706', defaultPrefix: '081', accLength: 12 },
  { key: 'zemen', name: 'Zemen Bank', shortName: 'Zemen', color: '#dc2626', defaultPrefix: '201', accLength: 12 },
  { key: 'custom', name: 'Other Bank', shortName: 'Custom', color: '#4b5563', defaultPrefix: '100', accLength: 10 },
];

export function maskTruecallerAccount(acc: string): string {
  const clean = (acc || '').replace(/\s+/g, '');
  if (clean.length <= 5) return clean || '1XXXXXXXX9165';
  const first = clean.charAt(0);
  const last = clean.slice(-4);
  // Truecaller style matches user reference IMG_20260905_115947_509.jpg: "1XXXXXXXX9165" (first char + 8 X's + last 4 chars)
  return `${first}${'X'.repeat(8)}${last}`;
}

export function formatCurrentTimeString(): string {
  const d = new Date();
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
}

const DEFAULT_ACCOUNTS: TruecallerBankAccount[] = [
  {
    id: 'tc-acc-cbe-1',
    bankKey: 'cbe',
    bankName: 'Cbe Bank',
    accountNumber: '1000419529165',
    maskedAccount: '1XXXXXXXX9165',
    holderName: 'Leykun Jemaneh Ylma',
    accountType: 'Savings Account',
    phone: '+251 91 104 9165',
    balance: 5420.50,
  },
  {
    id: 'tc-acc-cbe-2',
    bankKey: 'cbe',
    bankName: 'Cbe Bank',
    accountNumber: '1000419524747',
    maskedAccount: '1XXXXXXXX4747',
    holderName: 'Leykun Jemaneh Ylma',
    accountType: 'Checking Account',
    phone: '+251 91 104 4747',
    balance: 1805.47,
  },
  {
    id: 'tc-acc-telebirr',
    bankKey: 'telebirr',
    bankName: 'telebirr',
    accountNumber: '0911049165',
    maskedAccount: '0XXXXXXXX9165',
    holderName: 'Leykun Jemaneh',
    accountType: 'Mobile Wallet',
    phone: '+251 91 104 9165',
    balance: 3250.00,
  },
  {
    id: 'tc-acc-boa',
    bankKey: 'abyssinia',
    bankName: 'Abyssinia Bank',
    accountNumber: '1128472910',
    maskedAccount: '1XXXXXXXX2910',
    holderName: 'Selamawit Tekle Haile',
    accountType: 'Salary Account',
    phone: '+251 92 345 6789',
    balance: 14850.00,
  },
  {
    id: 'tc-acc-awash',
    bankKey: 'awash',
    bankName: 'Awash Bank',
    accountNumber: '01304859182300',
    maskedAccount: '0XXXXXXXX2300',
    holderName: 'Kasahun Yematawork',
    accountType: 'Business Account',
    phone: '+251 93 456 7890',
    balance: 28400.00,
  },
  {
    id: 'tc-acc-dashen',
    bankKey: 'dashen',
    bankName: 'Dashen Bank',
    accountNumber: '5249182019481',
    maskedAccount: '5XXXXXXXX9481',
    holderName: 'Dawit Haile',
    accountType: 'Personal Savings',
    phone: '+251 94 567 8901',
    balance: 19300.00,
  },
];

const DEFAULT_ALERTS: TruecallerAlert[] = [
  {
    id: 'tc-alert-seed-1',
    accountId: 'tc-acc-cbe-1',
    bankKey: 'cbe',
    bankName: 'Cbe Bank',
    role: 'receiver',
    amount: 450.00,
    maskedAccount: '1XXXXXXXX9165',
    fullAccount: '1000419529165',
    holderName: 'Leykun Jemaneh Ylma',
    counterpartyName: 'Abebe Bikila',
    balanceAfter: 5420.50,
    timeString: '11:58 AM',
    timestamp: new Date().toISOString(),
    summaryText: 'Account 1XXXXXXXX9165 credited with ETB 450.00.',
    txId: 'FT25104MK9165',
    read: false,
  },
  {
    id: 'tc-alert-seed-2',
    accountId: 'tc-acc-cbe-2',
    bankKey: 'cbe',
    bankName: 'Cbe Bank',
    role: 'sender',
    amount: 250.00,
    maskedAccount: '1XXXXXXXX4747',
    fullAccount: '1000419524747',
    holderName: 'Leykun Jemaneh Ylma',
    counterpartyName: 'Ethio Telecom Airtime',
    balanceAfter: 1555.47,
    timeString: '10:30 AM',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    summaryText: 'Account 1XXXXXXXX4747 debited with ETB 250.00.',
    txId: 'FT25104MK4747',
    read: true,
  },
  {
    id: 'tc-alert-seed-3',
    accountId: 'tc-acc-telebirr',
    bankKey: 'telebirr',
    bankName: 'telebirr',
    role: 'receiver',
    amount: 1200.00,
    maskedAccount: '0XXXXXXXX9165',
    fullAccount: '0911049165',
    holderName: 'Leykun Jemaneh',
    counterpartyName: 'Yared Negash',
    balanceAfter: 3250.00,
    timeString: '09:15 AM',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    summaryText: 'Account 0XXXXXXXX9165 credited with ETB 1,200.00.',
    txId: 'TB94829104',
    read: true,
  },
];

export const TruecallerService = {
  getAccounts(): TruecallerBankAccount[] {
    try {
      const stored = localStorage.getItem(STORAGE_TC_ACCOUNTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load Truecaller accounts', e);
    }
    this.saveAccounts(DEFAULT_ACCOUNTS);
    return DEFAULT_ACCOUNTS;
  },

  saveAccounts(accounts: TruecallerBankAccount[]): void {
    try {
      localStorage.setItem(STORAGE_TC_ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error('Failed to save Truecaller accounts', e);
    }
  },

  createAccount(account: Omit<TruecallerBankAccount, 'id' | 'maskedAccount'>): TruecallerBankAccount {
    const accounts = this.getAccounts();
    const masked = maskTruecallerAccount(account.accountNumber);
    const newAcc: TruecallerBankAccount = {
      ...account,
      id: `tc-acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      maskedAccount: masked,
      isCustom: true,
    };
    const updated = [newAcc, ...accounts];
    this.saveAccounts(updated);
    this.setActiveAccountId(newAcc.id);
    return newAcc;
  },

  deleteAccount(id: string): void {
    const accounts = this.getAccounts().filter(a => a.id !== id);
    this.saveAccounts(accounts);
    if (this.getActiveAccountId() === id) {
      this.setActiveAccountId(accounts[0]?.id || '');
    }
  },

  getActiveAccountId(): string {
    try {
      const saved = localStorage.getItem(STORAGE_TC_ACTIVE_ACC_KEY);
      if (saved) return saved;
    } catch {}
    const accounts = this.getAccounts();
    return accounts[0]?.id || '';
  },

  setActiveAccountId(id: string): void {
    try {
      localStorage.setItem(STORAGE_TC_ACTIVE_ACC_KEY, id);
    } catch {}
  },

  getAlerts(): TruecallerAlert[] {
    try {
      const stored = localStorage.getItem(STORAGE_TC_ALERTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load Truecaller alerts', e);
    }
    this.saveAlerts(DEFAULT_ALERTS);
    return DEFAULT_ALERTS;
  },

  saveAlerts(alerts: TruecallerAlert[]): void {
    try {
      localStorage.setItem(STORAGE_TC_ALERTS_KEY, JSON.stringify(alerts));
    } catch (e) {
      console.error('Failed to save Truecaller alerts', e);
    }
  },

  createAlert(params: {
    account: TruecallerBankAccount;
    role: TruecallerRole;
    amount: number;
    timeString?: string;
    counterpartyName?: string;
    txId?: string;
  }): TruecallerAlert {
    const { account, role, amount, counterpartyName, txId } = params;
    const timeStr = params.timeString || formatCurrentTimeString();
    const maskedAcc = account.maskedAccount || maskTruecallerAccount(account.accountNumber);
    const formattedAmount = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    // Exactly matches user image: "Account 1XXXXXXXX9165 credited with ETB 450.00." or debited
    const actionWord = role === 'receiver' ? 'credited with' : 'debited with';
    const summary = `Account ${maskedAcc} ${actionWord} ETB ${formattedAmount}.`;

    const generatedTxId = txId || `FT${Math.floor(10000000 + Math.random() * 90000000)}`;

    const newAlert: TruecallerAlert = {
      id: `tc-alert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      accountId: account.id,
      bankKey: account.bankKey,
      bankName: account.bankName,
      role,
      amount,
      maskedAccount: maskedAcc,
      fullAccount: account.accountNumber,
      holderName: account.holderName,
      counterpartyName: counterpartyName || (role === 'receiver' ? 'Abebe Bikila' : 'Retail Merchant'),
      balanceAfter: (account.balance || 2500) + (role === 'receiver' ? amount : -amount),
      timeString: timeStr,
      timestamp: new Date().toISOString(),
      summaryText: summary,
      txId: generatedTxId,
      read: false,
    };

    const alerts = this.getAlerts();
    const updated = [newAlert, ...alerts];
    this.saveAlerts(updated);
    return newAlert;
  },

  markAlertAsRead(id: string): void {
    const alerts = this.getAlerts().map(a => a.id === id ? { ...a, read: true } : a);
    this.saveAlerts(alerts);
  },

  markAllAsRead(): void {
    const alerts = this.getAlerts().map(a => ({ ...a, read: true }));
    this.saveAlerts(alerts);
  },

  deleteAlert(id: string): void {
    const alerts = this.getAlerts().filter(a => a.id !== id);
    this.saveAlerts(alerts);
  },

  getUnreadCount(): number {
    return this.getAlerts().filter(a => !a.read).length;
  }
};

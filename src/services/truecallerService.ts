import { 
  TruecallerBankAccount, 
  TruecallerAlert, 
  TruecallerRole, 
  TruecallerBankKey,
  TruecallerBackgroundApp
} from '../types/truecaller';
import { Transaction } from '../types';

const STORAGE_TC_ACCOUNTS_KEY = 'tc_sim_accounts_v2';
const STORAGE_TC_ALERTS_KEY = 'tc_sim_alerts_v2';
const STORAGE_TC_ACTIVE_ACC_KEY = 'tc_sim_active_account_id';

export const BANK_PRESETS: { key: TruecallerBankKey; name: string; shortName: string; color: string; defaultPrefix: string; accLength: number; defaultApp: TruecallerBackgroundApp }[] = [
  { key: 'cbe', name: 'CBE', shortName: 'CBE', color: '#5e1887', defaultPrefix: '1000', accLength: 13, defaultApp: 'tiktok' },
  { key: 'telebirr', name: 'telebirr', shortName: 'Telebirr', color: '#0085ca', defaultPrefix: '09', accLength: 10, defaultApp: 'telegram' },
  { key: 'abyssinia', name: 'Abyssinia Bank', shortName: 'BOA', color: '#f59e0b', defaultPrefix: '112', accLength: 10, defaultApp: 'youtube' },
  { key: 'awash', name: 'Awash Bank', shortName: 'Awash', color: '#ea580c', defaultPrefix: '013', accLength: 14, defaultApp: 'instagram' },
  { key: 'dashen', name: 'Dashen Bank', shortName: 'Dashen', color: '#1e3a8a', defaultPrefix: '524', accLength: 13, defaultApp: 'tiktok' },
  { key: 'oromia', name: 'Oromia Bank', shortName: 'Oromia', color: '#b91c1c', defaultPrefix: '142', accLength: 11, defaultApp: 'telegram' },
  { key: 'coop', name: 'Coop Bank', shortName: 'Coop', color: '#0284c7', defaultPrefix: '102', accLength: 11, defaultApp: 'youtube' },
  { key: 'hibret', name: 'Hibret Bank', shortName: 'Hibret', color: '#4338ca', defaultPrefix: '110', accLength: 11, defaultApp: 'instagram' },
  { key: 'nib', name: 'Nib Bank', shortName: 'Nib', color: '#0d9488', defaultPrefix: '700', accLength: 10, defaultApp: 'tiktok' },
  { key: 'wegagen', name: 'Wegagen Bank', shortName: 'Wegagen', color: '#d97706', defaultPrefix: '081', accLength: 12, defaultApp: 'telegram' },
  { key: 'zemen', name: 'Zemen Bank', shortName: 'Zemen', color: '#dc2626', defaultPrefix: '201', accLength: 12, defaultApp: 'youtube' },
  { key: 'custom', name: 'Other Bank', shortName: 'Custom', color: '#4b5563', defaultPrefix: '100', accLength: 10, defaultApp: 'tiktok' },
];

export function getBankKeyFromName(nameOrKey?: string): TruecallerBankKey {
  if (!nameOrKey) return 'cbe';
  const lower = nameOrKey.toLowerCase();
  if (lower.includes('telebirr') || lower.includes('ethio telecom')) return 'telebirr';
  if (lower.includes('abyssinia') || lower.includes('boa')) return 'abyssinia';
  if (lower.includes('awash')) return 'awash';
  if (lower.includes('dashen')) return 'dashen';
  if (lower.includes('oromia')) return 'oromia';
  if (lower.includes('coop')) return 'coop';
  if (lower.includes('hibret')) return 'hibret';
  if (lower.includes('nib')) return 'nib';
  if (lower.includes('wegagen')) return 'wegagen';
  if (lower.includes('zemen')) return 'zemen';
  if (lower.includes('cbe') || lower.includes('commercial')) return 'cbe';
  return 'custom';
}

export function getDefaultBackgroundApp(bankKey: TruecallerBankKey): TruecallerBackgroundApp {
  const match = BANK_PRESETS.find(p => p.key === bankKey);
  return match?.defaultApp || 'tiktok';
}

export function maskTruecallerAccount(acc: string): string {
  const clean = (acc || '').replace(/\s+/g, '');
  if (!clean) return '1********0913';
  const withStars = clean.replace(/X/g, '*');
  if (withStars.includes('*')) return withStars;
  if (clean.length <= 5) return clean;
  const first = clean.charAt(0);
  const last = clean.slice(-4);
  // Truecaller style matches reference photo IMG_20260905_131647_440.jpg: "1********0913"
  return `${first}${'*'.repeat(8)}${last}`;
}

export function formatCurrentTimeString(): string {
  const d = new Date();
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
}

export function formatTimeFromIso(isoString?: string): string {
  if (!isoString) return formatCurrentTimeString();
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return formatCurrentTimeString();
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  } catch {
    return formatCurrentTimeString();
  }
}

const DEFAULT_ACCOUNTS: TruecallerBankAccount[] = [
  {
    id: 'tc-acc-cbe-leykun',
    bankKey: 'cbe',
    bankName: 'CBE',
    accountNumber: '1000419524747',
    maskedAccount: '1*********4747',
    holderName: 'Leykun Jemaneh Ylma',
    accountType: 'Savings Account',
    phone: '+251 91 104 4747',
    balance: 298.54,
    backgroundApp: 'tiktok',
    lastTransactionAt: '2026-09-07T12:54:00Z'
  },
  {
    id: 'tc-acc-cbe-user-x',
    bankKey: 'cbe',
    bankName: 'CBE',
    accountNumber: '1000419529165',
    maskedAccount: '1*********9165',
    holderName: 'User X (Leykun Jemaneh)',
    accountType: 'Savings Account',
    phone: '+251 91 104 9165',
    balance: 5420.50,
    backgroundApp: 'tiktok',
    lastTransactionAt: '2026-09-05T11:58:00Z'
  },
  {
    id: 'tc-acc-cbe-user-y',
    bankKey: 'cbe',
    bankName: 'CBE',
    accountNumber: '1000419520913',
    maskedAccount: '1*********0913',
    holderName: 'User Y (Abebe Bikila)',
    accountType: 'Savings Account',
    phone: '+251 92 104 0913',
    balance: 74600.00,
    backgroundApp: 'tiktok',
    lastTransactionAt: '2026-09-05T14:35:00Z'
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
    backgroundApp: 'telegram',
    lastTransactionAt: '2026-09-05T10:45:00Z'
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
    backgroundApp: 'youtube',
    lastTransactionAt: '2026-09-05T09:30:00Z'
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
    backgroundApp: 'instagram',
    lastTransactionAt: '2026-09-05T08:15:00Z'
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
    backgroundApp: 'tiktok',
    lastTransactionAt: '2026-09-04T16:20:00Z'
  },
];

const DEFAULT_ALERTS: TruecallerAlert[] = [
  {
    id: 'tc-alert-seed-receive-50-cbe',
    accountId: 'tc-acc-cbe-leykun',
    bankKey: 'cbe',
    bankName: 'CBE',
    role: 'receiver',
    amount: 50.00,
    maskedAccount: '1*********4747',
    fullAccount: '1000419524747',
    holderName: 'Leykun Jemaneh Ylma',
    counterpartyName: 'Kasahun Yematawork Lema',
    counterpartyAccount: '1000482918925',
    balanceAfter: 1805.47,
    timeString: '6:51 PM',
    timestamp: '2026-08-21T18:51:00Z',
    summaryText: 'Account 1*********4747 credited with ETB 50.00.',
    txId: 'v2-hfHCxGwmcij7q3ExbiWb',
    fullSmsText: `Dear Leykun Jemaneh Ylma You have received ETB 50.00 from account 1*********8925 (Kasahun Yematawork Lema) to your account 1*********4747. Your current balance is ETB1,805.47. Thanks for Banking with CBE.\nhttps://mreciept.cbe.com.et/v2-hfHCxGwmcij7q3ExbiWb for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`,
    read: false,
    backgroundApp: 'tiktok',
  },
  {
    id: 'tc-alert-seed-debit-20-cbe',
    accountId: 'tc-acc-cbe-leykun',
    bankKey: 'cbe',
    bankName: 'CBE',
    role: 'sender',
    amount: 20.00,
    maskedAccount: '1*********4747',
    fullAccount: '1000419524747',
    holderName: 'Leykun Jemaneh Ylma',
    counterpartyName: 'Service & Disaster Recovery',
    counterpartyAccount: '1000419520913',
    balanceAfter: 298.54,
    timeString: '12:54 PM',
    timestamp: '2026-09-05T12:54:00Z',
    summaryText: 'Account 1*********4747 debited with ETB 20.00.',
    txId: 'v2-hfHCxGKNY8V0W9qoyCPX',
    fullSmsText: `Dear Leykun Jemaneh Ylma A debit transaction of ETB 20.0. has occurred on your account 1*********4747. Service charge of ETB 0.00 and VAT(15%) of 0.0 and Disaster Recovery(5%) of 0.00 with total of ETB20.00 .Your current balance is ETB298.54. Thanks for Banking with CBE.\nhttps://mreciept.cbe.com.et/v2-hfHCxGKNY8V0W9qoyCPX for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`,
    read: false,
    backgroundApp: 'tiktok',
  },
  {
    id: 'tc-alert-seed-credit-ref-cbe',
    accountId: 'tc-acc-cbe-leykun',
    bankKey: 'cbe',
    bankName: 'CBE',
    role: 'receiver',
    amount: 50.00,
    maskedAccount: '1*********4747',
    fullAccount: '1000419524747',
    holderName: 'Leykun',
    counterpartyName: 'Dejene Buta',
    counterpartyAccount: '1000419520842',
    balanceAfter: 348.54,
    timeString: '4:41 PM',
    timestamp: '2026-09-05T16:41:01Z',
    summaryText: 'Account 1*********4747 credited with ETB 50.00.',
    txId: 'FT26248KLR82',
    fullSmsText: `Dear Leykun your Account 1*********4747 has been Credited with ETB 50.00 from Dejene Buta, on 05/09/2026 at 16:41:01 with Ref No FT26248KLR82 Your Current Balance is ETB 348.54. Thank you for Banking with CBE!\nhttps://apps.cbe.com.et:100/?id=FT26248KLR8219524747`,
    read: false,
    backgroundApp: 'tiktok',
  },
  {
    id: 'tc-alert-seed-receive-4500',
    accountId: 'tc-acc-cbe-user-y',
    bankKey: 'cbe',
    bankName: 'CBE',
    role: 'receiver',
    amount: 4500.00,
    maskedAccount: '1*********0913',
    fullAccount: '1000419520913',
    holderName: 'User Y (Abebe Bikila)',
    counterpartyName: 'User X (Leykun Jemaneh)',
    counterpartyAccount: '1000419529165',
    balanceAfter: 79100.00,
    timeString: 'Now',
    timestamp: new Date().toISOString(),
    summaryText: 'Account 1*********0913 credited with ETB 4,500.00.',
    txId: 'FT264500RC913',
    fullSmsText: `Dear User Y (Abebe Bikila) You have received ETB 4,500.00 from account 1*********9165 (User X) to your account 1*********0913. Your current balance is ETB79,100.00. Thanks for Banking with CBE.\nhttps://mreciept.cbe.com.et/v2-hfHCxG4500RC913 for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`,
    read: false,
    backgroundApp: 'tiktok',
  },
  {
    id: 'tc-alert-seed-send-4500',
    accountId: 'tc-acc-cbe-user-x',
    bankKey: 'cbe',
    bankName: 'CBE',
    role: 'sender',
    amount: 4500.00,
    maskedAccount: '1*********9165',
    fullAccount: '1000419529165',
    holderName: 'User X (Leykun Jemaneh)',
    counterpartyName: 'User Y (Abebe Bikila)',
    counterpartyAccount: '1000419520913',
    balanceAfter: 920.50,
    timeString: 'Now',
    timestamp: new Date().toISOString(),
    summaryText: 'Account 1*********9165 debited with ETB 4,500.00.',
    txId: 'FT264500SD165',
    fullSmsText: `Dear User X (Leykun Jemaneh) A debit transaction of ETB 4500.0. has occurred on your account 1*********9165. Service charge of ETB 0.00 and VAT(15%) of 0.0 and Disaster Recovery(5%) of 0.00 with total of ETB4500.00 .Your current balance is ETB920.50. Thanks for Banking with CBE.\nhttps://mreciept.cbe.com.et/v2-hfHCxG4500SD165 for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`,
    read: false,
    backgroundApp: 'tiktok',
  },
  {
    id: 'tc-alert-seed-1',
    accountId: 'tc-acc-cbe-user-x',
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
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    summaryText: 'Account 1XXXXXXXX9165 credited with ETB 450.00.',
    txId: 'FT25104MK9165',
    read: false,
    backgroundApp: 'tiktok',
  },
  {
    id: 'tc-alert-seed-2',
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
    timeString: '10:45 AM',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    summaryText: 'Account 0XXXXXXXX9165 credited with ETB 1,200.00.',
    txId: 'TB94829104',
    read: true,
    backgroundApp: 'telegram',
  },
  {
    id: 'tc-alert-seed-3',
    accountId: 'tc-acc-boa',
    bankKey: 'abyssinia',
    bankName: 'Abyssinia Bank',
    role: 'receiver',
    amount: 2500.00,
    maskedAccount: '1XXXXXXXX2910',
    fullAccount: '1128472910',
    holderName: 'Selamawit Tekle Haile',
    counterpartyName: 'Addis Tech Solutions',
    balanceAfter: 14850.00,
    timeString: '09:30 AM',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    summaryText: 'Account 1XXXXXXXX2910 credited with ETB 2,500.00.',
    txId: 'BOA8472910',
    read: true,
    backgroundApp: 'youtube',
  },
  {
    id: 'tc-alert-seed-4',
    accountId: 'tc-acc-awash',
    bankKey: 'awash',
    bankName: 'Awash Bank',
    role: 'sender',
    amount: 3400.00,
    maskedAccount: '0XXXXXXXX2300',
    fullAccount: '01304859182300',
    holderName: 'Kasahun Yematawork',
    counterpartyName: 'Bole Plaza Electronics',
    balanceAfter: 28400.00,
    timeString: '08:15 AM',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    summaryText: 'Account 0XXXXXXXX2300 debited with ETB 3,400.00.',
    txId: 'AW84920412',
    read: true,
    backgroundApp: 'instagram',
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
    
    // Find account in registry to get actual current/previous balance
    const accounts = this.getAccounts();
    const targetIdx = accounts.findIndex(a => a.id === account.id || a.accountNumber === account.accountNumber);
    const prevBalance = targetIdx !== -1 ? (accounts[targetIdx].balance ?? 0) : (account.balance ?? 0);
    
    // Exact user requirement: "When user receive the available balance is the previous balance plus the the current received balance."
    const newBalance = role === 'receiver'
      ? prevBalance + amount
      : Math.max(0, prevBalance - amount);

    // Update and persist the account balance
    let allAccounts = accounts.map(a => ({ ...a, isNow: false }));
    if (targetIdx !== -1) {
      allAccounts[targetIdx].balance = newBalance;
      allAccounts[targetIdx].lastTransactionAt = new Date().toISOString();
      allAccounts[targetIdx].isNow = true;
      this.saveAccounts(allAccounts);
    } else {
      const newAcc: TruecallerBankAccount = {
        ...account,
        balance: newBalance,
        lastTransactionAt: new Date().toISOString(),
        isNow: true
      };
      this.saveAccounts([newAcc, ...allAccounts]);
    }

    const actionWord = role === 'receiver' ? 'credited with' : 'debited with';
    const summary = `Account ${maskedAcc} ${actionWord} ETB ${formattedAmount}.`;
    const generatedTxId = txId || `FT${Math.floor(10000000 + Math.random() * 90000000)}`;
    const formattedNewBal = newBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const fullSms = role === 'receiver'
      ? `Dear ${account.holderName},\nYour Account ${account.accountNumber} has been Credited with ETB ${formattedAmount} on ${timeStr}${counterpartyName ? ` by ${counterpartyName}` : ''}.\nAvailable Balance is ETB ${formattedNewBal}.\nTxn Ref: ${generatedTxId}.\nThank you for banking with ${account.bankName}.\nhttps://cbe.com.et/mbreceipt/${generatedTxId}`
      : `Dear ${account.holderName},\nA debit transaction of ETB ${formattedAmount} has occurred on your Account ${account.accountNumber} on ${timeStr}${counterpartyName ? ` to ${counterpartyName}` : ''}.\nAvailable Balance: ETB ${formattedNewBal}.\nTxn Ref: ${generatedTxId}.\nThank you for banking with ${account.bankName}.`;

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
      balanceAfter: newBalance,
      timeString: timeStr,
      timestamp: new Date().toISOString(),
      summaryText: summary,
      txId: generatedTxId,
      fullSmsText: fullSms,
      read: false,
      backgroundApp: account.backgroundApp || getDefaultBackgroundApp(account.bankKey),
    };

    const alerts = this.getAlerts();
    const updated = [newAlert, ...alerts];
    this.saveAlerts(updated);
    window.dispatchEvent(new CustomEvent('tc_alerts_updated', { detail: { alert: newAlert, account } }));
    return newAlert;
  },

  syncTransactionToTruecaller(tx: Transaction, userBalance?: number): TruecallerAlert {
    const bankKey = getBankKeyFromName(tx.recipientBank || 'cbe');
    const preset = BANK_PRESETS.find(p => p.key === bankKey) || BANK_PRESETS[0];

    const senderAccNum = tx.senderAccount || '1000419529165';
    const senderHolder = tx.senderName || 'User X (Leykun Jemaneh)';
    const recipientAccNum = tx.recipientAccount || '1000419520913';
    const recipientHolder = tx.recipientName || 'User Y (Abebe Bikila)';

    const txRef = tx.id || `FT${Math.floor(10000000 + Math.random() * 90000000)}`;
    const existingAlerts = this.getAlerts();

    // Guard against duplicate sync re-adding amounts to balance on reload
    const alreadySynced = existingAlerts.some(a => a.txId === `${txRef}-SD` || a.txId === `${txRef}-RC` || a.txId === txRef);
    if (alreadySynced) {
      const match = existingAlerts.find(a => (tx.type === 'receive' ? a.txId === `${txRef}-RC` : a.txId === `${txRef}-SD`) || a.txId === txRef);
      if (match) return match;
    }

    const accounts = this.getAccounts();
    let updatedAccounts = [...accounts];

    // 1. AUTOMATICALLY FIND OR CREATE SENDER ACCOUNT (User X)
    let senderAcc = updatedAccounts.find(a => a.accountNumber === senderAccNum);
    const senderPrevBal = senderAcc ? (senderAcc.balance ?? 5000) : (userBalance ?? 5000);
    const senderNewBal = (tx.type !== 'receive' && userBalance !== undefined)
      ? userBalance
      : Math.max(0, senderPrevBal - (tx.totalDebited ?? tx.amount));

    if (senderAcc) {
      senderAcc = {
        ...senderAcc,
        lastTransactionAt: tx.createdAt || new Date().toISOString(),
        balance: senderNewBal,
      };
      updatedAccounts = [senderAcc, ...updatedAccounts.filter(a => a.id !== senderAcc!.id)];
    } else {
      senderAcc = {
        id: `tc-acc-sender-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        bankKey,
        bankName: preset.name,
        accountNumber: senderAccNum,
        maskedAccount: maskTruecallerAccount(senderAccNum),
        holderName: senderHolder,
        accountType: 'Savings Account',
        balance: senderNewBal,
        backgroundApp: getDefaultBackgroundApp(bankKey),
        lastTransactionAt: tx.createdAt || new Date().toISOString(),
      };
      updatedAccounts = [senderAcc, ...updatedAccounts];
    }

    // 2. AUTOMATICALLY FIND OR CREATE RECEIVER ACCOUNT (User Y)
    // Rule: "When user receive the available balance is the previous balance plus the the current received balance."
    let recipientAcc = updatedAccounts.find(a => a.accountNumber === recipientAccNum);
    const recipientPrevBal = recipientAcc ? (recipientAcc.balance ?? 244600.00) : (tx.type === 'receive' && userBalance !== undefined ? Math.max(0, userBalance - tx.amount) : 244600.00);
    const recipientNewBal = (tx.type === 'receive' && userBalance !== undefined)
      ? userBalance
      : recipientPrevBal + tx.amount;

    if (recipientAcc) {
      recipientAcc = {
        ...recipientAcc,
        lastTransactionAt: tx.createdAt || new Date().toISOString(),
        balance: recipientNewBal,
      };
      updatedAccounts = [recipientAcc, ...updatedAccounts.filter(a => a.id !== recipientAcc!.id)];
    } else {
      recipientAcc = {
        id: `tc-acc-receiver-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        bankKey,
        bankName: preset.name,
        accountNumber: recipientAccNum,
        maskedAccount: maskTruecallerAccount(recipientAccNum),
        holderName: recipientHolder,
        accountType: 'Savings Account',
        balance: recipientNewBal,
        backgroundApp: getDefaultBackgroundApp(bankKey),
        lastTransactionAt: tx.createdAt || new Date().toISOString(),
      };
      updatedAccounts = [recipientAcc, ...updatedAccounts];
    }

    updatedAccounts = updatedAccounts.map(a => ({
      ...a,
      isNow: a.id === senderAcc.id
    }));
    this.saveAccounts(updatedAccounts);
    this.setActiveAccountId(senderAcc.id);

    const formattedAmount = tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedSenderBal = senderNewBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedRecipBal = recipientNewBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const timeStr = 'Now';

    // 3. CREATE SENDER ALERT (Debited ETB [amount])
    const maskedSender = senderAcc.maskedAccount || maskTruecallerAccount(senderAcc.accountNumber);
    const sendSummary = `Account ${maskedSender} debited with ETB ${formattedAmount}.`;
    const sendAlert: TruecallerAlert = {
      id: `tc-alert-send-${txRef}`,
      accountId: senderAcc.id,
      bankKey,
      bankName: preset.name,
      role: 'sender',
      amount: tx.amount,
      maskedAccount: maskedSender,
      fullAccount: senderAcc.accountNumber,
      holderName: senderHolder,
      counterpartyName: recipientHolder,
      counterpartyAccount: recipientAcc.accountNumber,
      balanceAfter: senderNewBal,
      timeString: timeStr,
      timestamp: tx.createdAt || new Date().toISOString(),
      summaryText: sendSummary,
      txId: `${txRef}-SD`,
      fullSmsText: bankKey === 'cbe' 
        ? `Dear ${senderHolder.replace(/\s*\(Admin\)/i, '').replace(/\s*\(User [XY]\)/i, '').trim() || 'Leykun Jemaneh Ylma'} A debit transaction of ETB ${tx.amount % 1 === 0 ? `${tx.amount.toFixed(1)}.` : `${tx.amount.toFixed(2)}.`} has occurred on your account ${maskedSender}. Service charge of ETB 0.00 and VAT(15%) of 0.0 and Disaster Recovery(5%) of 0.00 with total of ETB${tx.amount.toFixed(2)} .Your current balance is ETB${formattedSenderBal}. Thanks for Banking with CBE.\nhttps://mreciept.cbe.com.et/v2-hfHCxG${txRef.replace(/[^a-zA-Z0-9]/g, '').slice(-12) || 'KNY8V0W9qoyCPX'} for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`
        : `Dear ${senderHolder},\nA debit transaction of ETB ${formattedAmount} has occurred on your Account ${senderAcc.accountNumber} on ${timeStr} to ${recipientHolder}.\nAvailable Balance: ETB ${formattedSenderBal}.\nTxn Ref: ${txRef}.\nThank you for banking with ${preset.name}.`,
      read: false,
      backgroundApp: senderAcc.backgroundApp || getDefaultBackgroundApp(bankKey),
    };

    // 4. CREATE RECEIVER ALERT (Credited ETB [amount])
    const maskedRecipient = recipientAcc.maskedAccount || maskTruecallerAccount(recipientAcc.accountNumber);
    const receiveSummary = `Account ${maskedRecipient} credited with ETB ${formattedAmount}.`;
    const receiveAlert: TruecallerAlert = {
      id: `tc-alert-receive-${txRef}`,
      accountId: recipientAcc.id,
      bankKey,
      bankName: preset.name,
      role: 'receiver',
      amount: tx.amount,
      maskedAccount: maskedRecipient,
      fullAccount: recipientAcc.accountNumber,
      holderName: recipientHolder,
      counterpartyName: senderHolder,
      counterpartyAccount: senderAcc.accountNumber,
      balanceAfter: recipientNewBal,
      timeString: timeStr,
      timestamp: tx.createdAt || new Date().toISOString(),
      summaryText: receiveSummary,
      txId: `${txRef}-RC`,
      fullSmsText: bankKey === 'cbe'
        ? `Dear ${recipientHolder.replace(/\s*\(Admin\)/i, '').replace(/\s*\(User [XY]\)/i, '').trim() || 'Leykun Jemaneh Ylma'} You have received ETB ${formattedAmount} from account ${maskedSender} (${senderHolder.replace(/\s*\(Admin\)/i, '').replace(/\s*\(User [XY]\)/i, '').trim() || 'Kasahun Yematawork Lema'}) to your account ${maskedRecipient}. Your current balance is ETB${formattedRecipBal}. Thanks for Banking with CBE.\nhttps://mreciept.cbe.com.et/v2-hfHCxG${txRef.replace(/[^a-zA-Z0-9]/g, '').slice(-12) || 'wmcij7q3ExbiWb'} for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`
        : `Dear ${recipientHolder},\nYour Account ${recipientAcc.accountNumber} has been Credited with ETB ${formattedAmount} on ${timeStr} by ${senderHolder}.\nAvailable Balance is ETB ${formattedRecipBal}.\nTxn Ref: ${txRef}.\nThank you for banking with ${preset.name}.\nhttps://cbe.com.et/mbreceipt/${txRef}`,
      read: false,
      backgroundApp: recipientAcc.backgroundApp || getDefaultBackgroundApp(bankKey),
    };

    const filteredAlerts = existingAlerts.filter(a => a.txId !== sendAlert.txId && a.txId !== receiveAlert.txId);
    // Put both at the top
    const updatedAlerts = [receiveAlert, sendAlert, ...filteredAlerts];
    this.saveAlerts(updatedAlerts);

    window.dispatchEvent(new CustomEvent('tc_alerts_updated', { detail: { alert: receiveAlert, sendAlert, account: senderAcc } }));
    return tx.type === 'receive' ? receiveAlert : sendAlert;
  },

  // Direct helper: Simulate a transfer between User X and User Y:
  simulateUserTransfer(params: {
    senderName?: string;
    senderAccount?: string;
    recipientName?: string;
    recipientAccount?: string;
    amount: number;
    bankKey?: TruecallerBankKey;
    timeString?: string;
  }): { sendAlert: TruecallerAlert; receiveAlert: TruecallerAlert; senderAccount: TruecallerBankAccount; receiverAccount: TruecallerBankAccount } {
    const {
      senderName = 'User X (Leykun Jemaneh)',
      senderAccount = '1000419529165',
      recipientName = 'User Y (Abebe Bikila)',
      recipientAccount = '1000419520913',
      amount = 4500,
      bankKey = 'cbe',
      timeString = 'Now'
    } = params;

    const preset = BANK_PRESETS.find(p => p.key === bankKey) || BANK_PRESETS[0];
    const accounts = this.getAccounts();
    let updatedAccounts = [...accounts];

    // 1. Sender account
    let senderAcc = updatedAccounts.find(a => a.accountNumber === senderAccount);
    const senderPrev = senderAcc ? (senderAcc.balance ?? 5420.50) : 5420.50;
    const senderNew = Math.max(0, senderPrev - amount);

    if (!senderAcc) {
      senderAcc = {
        id: `tc-acc-sender-${Date.now()}`,
        bankKey,
        bankName: preset.name,
        accountNumber: senderAccount,
        maskedAccount: maskTruecallerAccount(senderAccount),
        holderName: senderName,
        accountType: 'Savings Account',
        balance: senderNew,
        backgroundApp: getDefaultBackgroundApp(bankKey),
        lastTransactionAt: new Date().toISOString()
      };
      updatedAccounts = [senderAcc, ...updatedAccounts];
    } else {
      senderAcc = { ...senderAcc, balance: senderNew, lastTransactionAt: new Date().toISOString() };
      updatedAccounts = [senderAcc, ...updatedAccounts.filter(a => a.id !== senderAcc!.id)];
    }

    // 2. Receiver account - "When user receive the available balance is the previous balance plus the the current received balance."
    let recipientAcc = updatedAccounts.find(a => a.accountNumber === recipientAccount);
    const recipientPrev = recipientAcc ? (recipientAcc.balance ?? 244600.00) : 244600.00;
    const recipientNew = recipientPrev + amount;

    if (!recipientAcc) {
      recipientAcc = {
        id: `tc-acc-receiver-${Date.now()}`,
        bankKey,
        bankName: preset.name,
        accountNumber: recipientAccount,
        maskedAccount: maskTruecallerAccount(recipientAccount),
        holderName: recipientName,
        accountType: 'Savings Account',
        balance: recipientNew,
        backgroundApp: getDefaultBackgroundApp(bankKey),
        lastTransactionAt: new Date().toISOString()
      };
      updatedAccounts = [recipientAcc, ...updatedAccounts];
    } else {
      recipientAcc = { ...recipientAcc, balance: recipientNew, lastTransactionAt: new Date().toISOString() };
      updatedAccounts = [recipientAcc, ...updatedAccounts.filter(a => a.id !== recipientAcc!.id)];
    }

    updatedAccounts = updatedAccounts.map(a => ({
      ...a,
      isNow: a.id === recipientAcc!.id
    }));
    this.saveAccounts(updatedAccounts);

    const formattedAmount = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedSenderBal = senderNew.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedRecipBal = recipientNew.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const txRef = `FT26${Math.floor(1000000 + Math.random() * 9000000)}`;

    const maskedSender = senderAcc.maskedAccount || maskTruecallerAccount(senderAccount);
    const maskedRecipient = recipientAcc.maskedAccount || maskTruecallerAccount(recipientAccount);

    // Send Alert (Debited)
    const sendAlert: TruecallerAlert = {
      id: `tc-alert-send-${Date.now()}`,
      accountId: senderAcc.id,
      bankKey,
      bankName: preset.name,
      role: 'sender',
      amount,
      maskedAccount: maskedSender,
      fullAccount: senderAccount,
      holderName: senderName,
      counterpartyName: recipientName,
      counterpartyAccount: recipientAccount,
      balanceAfter: senderNew,
      timeString,
      timestamp: new Date().toISOString(),
      summaryText: `Account ${maskedSender} debited with ETB ${formattedAmount}.`,
      txId: `${txRef}-SD`,
      fullSmsText: bankKey === 'cbe'
        ? `Dear ${senderName.replace(/\s*\(Admin\)/i, '').replace(/\s*\(User [XY]\)/i, '').trim() || 'Leykun Jemaneh Ylma'} A debit transaction of ETB ${amount % 1 === 0 ? `${amount.toFixed(1)}.` : `${amount.toFixed(2)}.`} has occurred on your account ${maskedSender}. Service charge of ETB 0.00 and VAT(15%) of 0.0 and Disaster Recovery(5%) of 0.00 with total of ETB${amount.toFixed(2)} .Your current balance is ETB${formattedSenderBal}. Thanks for Banking with CBE.\nhttps://mreciept.cbe.com.et/v2-hfHCxG${txRef.replace(/[^a-zA-Z0-9]/g, '').slice(-12) || 'KNY8V0W9qoyCPX'} for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`
        : `Dear ${senderName},\nA debit transaction of ETB ${formattedAmount} has occurred on your Account ${senderAccount} on ${timeString} to ${recipientName}.\nAvailable Balance: ETB ${formattedSenderBal}.\nTxn Ref: ${txRef}.\nThank you for banking with ${preset.name}.`,
      read: false,
      backgroundApp: senderAcc.backgroundApp || getDefaultBackgroundApp(bankKey),
    };

    // Receive Alert (Credited)
    const receiveAlert: TruecallerAlert = {
      id: `tc-alert-receive-${Date.now()}`,
      accountId: recipientAcc.id,
      bankKey,
      bankName: preset.name,
      role: 'receiver',
      amount,
      maskedAccount: maskedRecipient,
      fullAccount: recipientAccount,
      holderName: recipientName,
      counterpartyName: senderName,
      counterpartyAccount: senderAccount,
      balanceAfter: recipientNew,
      timeString,
      timestamp: new Date().toISOString(),
      summaryText: `Account ${maskedRecipient} credited with ETB ${formattedAmount}.`,
      txId: `${txRef}-RC`,
      fullSmsText: bankKey === 'cbe'
        ? `Dear ${recipientName.replace(/\s*\(Admin\)/i, '').replace(/\s*\(User [XY]\)/i, '').trim() || 'Leykun Jemaneh Ylma'} You have received ETB ${formattedAmount} from account ${maskedSender} (${senderName.replace(/\s*\(Admin\)/i, '').replace(/\s*\(User [XY]\)/i, '').trim() || 'Kasahun Yematawork Lema'}) to your account ${maskedRecipient}. Your current balance is ETB${formattedRecipBal}. Thanks for Banking with CBE.\nhttps://mreciept.cbe.com.et/v2-hfHCxG${txRef.replace(/[^a-zA-Z0-9]/g, '').slice(-12) || 'wmcij7q3ExbiWb'} for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`
        : `Dear ${recipientName},\nYour Account ${recipientAccount} has been Credited with ETB ${formattedAmount} on ${timeString} by ${senderName}.\nAvailable Balance is ETB ${formattedRecipBal}.\nTxn Ref: ${txRef}.\nThank you for banking with ${preset.name}.\nhttps://cbe.com.et/mbreceipt/${txRef}`,
      read: false,
      backgroundApp: recipientAcc.backgroundApp || getDefaultBackgroundApp(bankKey),
    };

    const existingAlerts = this.getAlerts();
    const updatedAlerts = [receiveAlert, sendAlert, ...existingAlerts];
    this.saveAlerts(updatedAlerts);

    window.dispatchEvent(new CustomEvent('tc_alerts_updated', { detail: { alert: receiveAlert, sendAlert, senderAccount: senderAcc, receiverAccount: recipientAcc } }));
    return { sendAlert, receiveAlert, senderAccount: senderAcc, receiverAccount: recipientAcc };
  },

  syncAllExistingTransactions(transactions: Transaction[]): void {
    if (!transactions || transactions.length === 0) return;
    // Process from oldest to newest so newest ends up at the very top
    const chronological = [...transactions].reverse();
    for (const tx of chronological) {
      this.syncTransactionToTruecaller(tx);
    }
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

import { 
  UserProfile, 
  Transaction, 
  Beneficiary, 
  BillPayment, 
  AirtimePurchase, 
  SystemNotification, 
  AuditLog,
  TransactionType
} from '../types';
import { calculateCbeFee } from './cbeTariff';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 11).toUpperCase();

// Default values to seed if localStorage is empty
const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user_1',
    name: 'Abebe Kebede',
    phone: '+251911223344',
    email: 'abebe@example.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-01-10T10:30:00Z',
    accountNumber: '1000123456789',
    balance: 10000000000.00,
    availableBalance: 10000000000.00,
    biometricEnabled: true
  },
  {
    id: 'user_admin',
    name: 'Leykun Jemaneh (Admin)',
    phone: '+251900112233',
    email: 'leykunjemaneh3@gmail.com', // Bootstrapped admin
    role: 'admin',
    status: 'active',
    createdAt: '2026-01-01T08:00:00Z',
    accountNumber: '1000999999999',
    balance: 10000000000.00,
    availableBalance: 10000000000.00,
    biometricEnabled: false
  },
  {
    id: 'user_2',
    name: 'Selamawit Tekle',
    phone: '+251912345678',
    email: 'selam@example.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-03-15T14:20:00Z',
    accountNumber: '1000246810121',
    balance: 10000000000.00,
    availableBalance: 10000000000.00,
    biometricEnabled: false
  }
];

const now = Date.now();
const hour = 3600 * 1000;
const day = 24 * hour;

export function generateCbeTxId(): string {
  const yearShort = new Date().getFullYear().toString().slice(-2); // e.g. "26"
  // 4 random digits (0000 - 9999)
  const rand4 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  // 2 random uppercase letters (A-Z)
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const char1 = letters[Math.floor(Math.random() * letters.length)];
  const char2 = letters[Math.floor(Math.random() * letters.length)];
  // 2 random digits (00 - 99)
  const rand2 = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  
  return `FT${yearShort}${rand4}${char1}${char2}${rand2}`;
}

export function formatTo12CharTxId(rawId?: string): string {
  if (!rawId) return generateCbeTxId();
  const cleaned = rawId.trim().toUpperCase();
  if (/^FT\d{6}[A-Z]{2}\d{2}$/.test(cleaned) || (cleaned.startsWith('FT') && cleaned.length === 12)) {
    return cleaned;
  }
  // Generate deterministic 12-char ID from raw string hash
  let hash = 0;
  for (let i = 0; i < cleaned.length; i++) {
    hash = (hash << 5) - hash + cleaned.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  const yearShort = new Date().getFullYear().toString().slice(-2);
  const digits4 = (absHash % 10000).toString().padStart(4, '0');
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const l1 = letters[Math.floor((absHash / 13) % 26)];
  const l2 = letters[Math.floor((absHash / 37) % 26)];
  const d2 = (Math.floor(absHash / 7) % 100).toString().padStart(2, '0');
  return `FT${yearShort}${digits4}${l1}${l2}${d2}`;
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'FT268923AB01',
    type: 'receive',
    recipientId: 'user_1',
    recipientName: 'Abebe Kebede',
    recipientAccount: '1000123456789',
    recipientBank: 'Tana Digital Bank',
    senderName: 'Selamawit Tekle',
    senderAccount: '1000246810121',
    amount: 1500.00,
    fee: 0.00,
    description: 'Rent reimbursement - Demo',
    status: 'success',
    reference: 'REF-SEL-58902',
    createdAt: new Date(now - 3 * hour).toISOString()
  },
  {
    id: 'FT261049CD42',
    type: 'transfer',
    senderId: 'user_1',
    senderName: 'Abebe Kebede',
    senderAccount: '1000123456789',
    recipientName: 'Kidus Yohannes',
    recipientAccount: '013204958100',
    recipientBank: 'Awash International Bank',
    amount: 4500.00,
    fee: 15.00,
    description: 'School fees payment - Demo',
    status: 'success',
    reference: 'REF-AW-09412',
    createdAt: new Date(now - 1 * day - 4 * hour).toISOString()
  },
  {
    id: 'FT263948EF15',
    type: 'bill',
    senderId: 'user_1',
    senderName: 'Abebe Kebede',
    senderAccount: '1000123456789',
    recipientName: 'Ethio Telecom',
    recipientAccount: 'B-894102',
    recipientBank: 'Ethio Telecom',
    amount: 350.00,
    fee: 2.00,
    description: 'Monthly Fiber Internet Bill - Demo',
    status: 'success',
    reference: 'REF-ET-39485',
    createdAt: new Date(now - 3 * day).toISOString()
  },
  {
    id: 'FT264918GH77',
    type: 'airtime',
    senderId: 'user_1',
    senderName: 'Abebe Kebede',
    senderAccount: '1000123456789',
    recipientName: 'Safaricom Airtime',
    recipientAccount: '+251711223344',
    recipientBank: 'Safaricom Ethiopia',
    amount: 100.00,
    fee: 0.00,
    description: 'Airtime Recharge - Demo',
    status: 'success',
    reference: 'REF-SAF-49182',
    createdAt: new Date(now - 5 * day).toISOString()
  }
];

const INITIAL_BENEFICIARIES: Beneficiary[] = [
  {
    id: 'ben_1',
    userId: 'user_1',
    name: 'Selamawit Tekle',
    accountNumber: '1000246810121',
    bankName: 'Tana Digital Bank',
    phone: '+251912345678'
  },
  {
    id: 'ben_2',
    userId: 'user_1',
    name: 'Desta Kassahun',
    accountNumber: '0234059681',
    bankName: 'Dashen Bank',
    phone: '+251911998877'
  },
  {
    id: 'ben_3',
    userId: 'user_1',
    name: 'Kidus Yohannes',
    accountNumber: '013204958100',
    bankName: 'Awash International Bank',
    phone: '+251922334455'
  }
];

const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'not_1',
    userId: 'user_1',
    title: 'Welcome to Tana Bank!',
    body: 'Thank you for choosing Tana Digital Bank. Experience seamless, secure, and modern financial freedom.',
    isRead: false,
    type: 'info',
    createdAt: '2026-07-15T08:00:00Z'
  },
  {
    id: 'not_2',
    userId: 'user_1',
    title: 'Salary Deposited',
    body: 'Your monthly salary has been successfully credited to your account.',
    isRead: false,
    type: 'success',
    createdAt: '2026-07-17T09:15:00Z'
  }
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log_1',
    userId: 'user_admin',
    userEmail: 'leykunjemaneh3@gmail.com',
    action: 'SYSTEM_BOOTSTRAP',
    details: 'Tana Digital Bank simulated node bootstrapped with administrator account leykunjemaneh3@gmail.com.',
    createdAt: '2026-07-18T10:00:00Z'
  }
];

// LocalStorage load/save helpers
const loadData = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  return JSON.parse(data);
};

const saveData = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Self-contained, zero-network, reliable CBE Golden Emblem SVG data URI
export const DEFAULT_CBE_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F9E79F"/>
      <stop offset="35%" stop-color="#D4AC0D"/>
      <stop offset="70%" stop-color="#B7950B"/>
      <stop offset="100%" stop-color="#7D6608"/>
    </linearGradient>
    <linearGradient id="g2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#B9770E"/>
      <stop offset="50%" stop-color="#F5B041"/>
      <stop offset="100%" stop-color="#FAD7A0"/>
    </linearGradient>
    <radialGradient id="sh" cx="35%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#FFF9C4" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="#D4AF37" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#8C6239" stop-opacity="0.1"/>
    </radialGradient>
  </defs>
  <!-- Radiating Spiral Waves -->
  <g stroke="#C69214" stroke-width="1.3" stroke-linecap="round" fill="none" opacity="0.85">
    <path d="M60 22 C40 22, 16 35, 12 55 C8 75, 26 95, 52 98 C78 101, 104 88, 108 65 C112 42, 90 28, 68 28 C46 28, 30 42, 28 58 C26 74, 40 86, 58 87 C76 88, 90 78, 92 64 C94 50, 82 40, 68 40"/>
    <path d="M56 16 C32 17, 10 32, 6 56 C2 80, 22 102, 50 106 C78 110, 108 96, 114 70 C120 44, 98 22, 72 22" opacity="0.6"/>
    <path d="M64 26 C44 26, 22 38, 18 58 C14 78, 30 96, 56 99 C82 102, 102 88, 105 68" opacity="0.5"/>
    <path d="M50 30 C34 32, 22 44, 20 58 C18 72, 30 84, 48 87" opacity="0.7"/>
  </g>
  <!-- Coin Body -->
  <circle cx="68" cy="62" r="38" fill="url(#g1)" stroke="#7D6608" stroke-width="1.5"/>
  <circle cx="68" cy="62" r="34" fill="url(#g2)" stroke="#F9E79F" stroke-width="1"/>
  <circle cx="68" cy="62" r="34" fill="url(#sh)"/>
  <circle cx="68" cy="62" r="31" fill="none" stroke="#7D6608" stroke-width="1" stroke-dasharray="2 2" opacity="0.7"/>
  <circle cx="68" cy="62" r="26" fill="#FAD7A0" stroke="#935116" stroke-width="1.2"/>
  <!-- CBE Monogram -->
  <g fill="#7E5109" transform="translate(48, 44) scale(0.65)">
    <path d="M30 4 C15 4, 4 15, 4 30 C4 45, 15 56, 30 56 C45 56, 56 45, 56 30 C56 15, 45 4, 30 4 Z M30 10 C41 10, 50 19, 50 30 C50 41, 41 50, 30 50 C19 50, 10 41, 10 30 C10 19, 19 10, 30 10 Z"/>
    <rect x="26" y="16" width="8" height="28" rx="2" fill="#6E2C00"/>
    <path d="M18 24 Q30 15 42 24 L42 28 Q30 19 18 28 Z" fill="#6E2C00"/>
    <circle cx="30" cy="22" r="3.5" fill="#FAD7A0"/>
    <rect x="18" y="40" width="24" height="4" rx="1" fill="#6E2C00"/>
  </g>
</svg>
`)}`;

export class LocalDb {
  static getUsers(): UserProfile[] {
    let users = loadData<UserProfile[]>('tana_users', INITIAL_USERS);
    
    // Ensure leykunjemaneh3@gmail.com is guaranteed admin access
    const adminIndex = users.findIndex(u => u.email.toLowerCase() === 'leykunjemaneh3@gmail.com');
    if (adminIndex !== -1) {
      if (users[adminIndex].role !== 'admin') {
        users[adminIndex].role = 'admin';
        users[adminIndex].status = 'active';
        saveData('tana_users', users);
      }
    } else {
      // Add Leykun Jemaneh as admin if not present
      const adminUser: UserProfile = {
        id: 'user_admin',
        name: 'Leykun Jemaneh (Admin)',
        phone: '+251900112233',
        email: 'leykunjemaneh3@gmail.com',
        role: 'admin',
        status: 'active',
        createdAt: '2026-01-01T08:00:00Z',
        accountNumber: '1000999999999',
        accountType: 'wadiah',
        balance: 10000000000.00,
        availableBalance: 10000000000.00,
        biometricEnabled: true
      };
      users.push(adminUser);
      saveData('tana_users', users);
    }

    const balanceKey = 'tana_balance_10billion_applied';
    if (!localStorage.getItem(balanceKey)) {
      users = users.map(u => ({
        ...u,
        balance: 10000000000.00,
        availableBalance: 10000000000.00
      }));
      saveData('tana_users', users);
      localStorage.setItem(balanceKey, 'true');
    }
    return users;
  }

  static setUsers(users: UserProfile[]): void {
    saveData('tana_users', users);
  }

  static getTransactions(): Transaction[] {
    const txs = loadData<Transaction[]>('tana_transactions', INITIAL_TRANSACTIONS);
    return txs.map(t => ({
      ...t,
      id: formatTo12CharTxId(t.id)
    }));
  }

  static setTransactions(txs: Transaction[]): void {
    saveData('tana_transactions', txs);
  }

  static getBeneficiaries(userId: string): Beneficiary[] {
    const list = loadData<Beneficiary[]>('tana_beneficiaries', INITIAL_BENEFICIARIES);
    return list.filter(b => b.userId === userId);
  }

  static addBeneficiary(ben: Omit<Beneficiary, 'id'>): Beneficiary {
    const list = loadData<Beneficiary[]>('tana_beneficiaries', INITIAL_BENEFICIARIES);
    const newBen = { ...ben, id: 'ben_' + generateId() };
    list.push(newBen);
    saveData('tana_beneficiaries', list);
    return newBen;
  }

  static getNotifications(userId: string): SystemNotification[] {
    const list = loadData<SystemNotification[]>('tana_notifications', INITIAL_NOTIFICATIONS);
    return list.filter(n => n.userId === userId).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }

  static addNotification(userId: string, title: string, body: string, type: 'info' | 'success' | 'warning' | 'alert' = 'info'): void {
    const list = loadData<SystemNotification[]>('tana_notifications', INITIAL_NOTIFICATIONS);
    const newNot = {
      id: 'not_' + generateId(),
      userId,
      title,
      body,
      isRead: false,
      type,
      createdAt: new Date().toISOString()
    };
    list.push(newNot);
    saveData('tana_notifications', list);
  }

  static markNotificationsAsRead(userId: string): void {
    const list = loadData<SystemNotification[]>('tana_notifications', INITIAL_NOTIFICATIONS);
    const updated = list.map(n => n.userId === userId ? { ...n, isRead: true } : n);
    saveData('tana_notifications', updated);
  }

  static getAuditLogs(): AuditLog[] {
    return loadData('tana_audit_logs', INITIAL_AUDIT_LOGS).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }

  static addAuditLog(userId: string, email: string, action: string, details: string): void {
    const list = loadData<AuditLog[]>('tana_audit_logs', INITIAL_AUDIT_LOGS);
    const newLog: AuditLog = {
      id: 'log_' + generateId(),
      userId,
      userEmail: email,
      action,
      details,
      createdAt: new Date().toISOString()
    };
    list.push(newLog);
    saveData('tana_audit_logs', list);
  }

  // Business operations
  static createTransaction(
    type: TransactionType,
    userId: string,
    amount: number,
    fee: number,
    recipientName: string,
    recipientAccount: string,
    recipientBank: string,
    description: string,
    isOwnAccount: boolean = false
  ): Transaction {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) throw new Error('User not found');
    const user = users[userIndex];

    // Compute standard CBE Tariff, 15% VAT, and 5% Disaster Recovery
    const cbeFees = calculateCbeFee(amount, type, isOwnAccount);
    const serviceCharge = fee > 0 ? fee : cbeFees.serviceCharge;
    const vat = Number((serviceCharge * 0.15).toFixed(2));
    const disasterRecovery = Number((serviceCharge * 0.05).toFixed(2));
    const totalAdditionalFees = Number((serviceCharge + vat + disasterRecovery).toFixed(2));
    const totalCost = Number((amount + totalAdditionalFees).toFixed(2));

    if (user.balance < totalCost && type !== 'receive') {
      throw new Error(`Insufficient balance. Transaction requires ETB ${totalCost.toLocaleString()} including CBE Service Charge (ETB ${serviceCharge.toFixed(2)}), 15% VAT (ETB ${vat.toFixed(2)}), and 5% Disaster Recovery (ETB ${disasterRecovery.toFixed(2)}).`);
    }

    // Deduct/Credit balance
    if (type !== 'receive') {
      user.balance = Number((user.balance - totalCost).toFixed(2));
      user.availableBalance = user.balance;
    } else {
      user.balance = Number((user.balance + amount).toFixed(2));
      user.availableBalance = user.balance;
    }

    users[userIndex] = user;
    this.setUsers(users);

    // Realistic CBE Transaction ID format: 12 characters exactly (e.g. FT263211VK07)
    const cbeTxId = generateCbeTxId();

    // Create the transaction
    const txs = this.getTransactions();
    const newTx: Transaction = {
      id: cbeTxId,
      type,
      senderId: type !== 'receive' ? userId : undefined,
      senderName: type !== 'receive' ? user.name : recipientName,
      senderAccount: type !== 'receive' ? user.accountNumber : recipientAccount,
      recipientId: type === 'receive' ? userId : undefined,
      recipientName,
      recipientAccount,
      recipientBank,
      amount,
      fee: totalAdditionalFees,
      serviceCharge,
      vat,
      disasterRecovery,
      totalDebited: totalCost,
      description: description || 'Mobile Banking Transfer',
      status: 'success',
      reference: 'REF-' + generateId(),
      createdAt: new Date().toISOString()
    };

    txs.push(newTx);
    this.setTransactions(txs);

    // Add notification
    const directionWord = type === 'receive' ? 'credited' : 'debited';
    const bodyText = `Your account has been ${directionWord} with ETB ${amount.toLocaleString()}. Total debited: ETB ${totalCost.toLocaleString()} (Ref: ${newTx.id})`;
    this.addNotification(userId, `Transaction Alert`, bodyText, type === 'receive' ? 'success' : 'info');

    // Add audit log
    this.addAuditLog(userId, user.email, `TX_CREATE_${type.toUpperCase()}`, `Processed transaction of ETB ${amount} to ${recipientName} (ID: ${cbeTxId}). Total debited with CBE Tariff/VAT: ETB ${totalCost}.`);

    return newTx;
  }

  // Admin operations
  static adminChangeTransactionStatus(txId: string, status: 'success' | 'failed' | 'pending'): void {
    const txs = this.getTransactions();
    const index = txs.findIndex(t => t.id === txId);
    if (index !== -1) {
      txs[index].status = status;
      this.setTransactions(txs);
      this.addAuditLog('user_admin', 'leykunjemaneh3@gmail.com', 'ADMIN_TX_UPDATE', `Admin updated status of transaction ${txId} to ${status}.`);
    }
  }

  static adminAdjustUserBalance(userId: string, newBalance: number): void {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      const oldBalance = users[index].balance;
      users[index].balance = Number(newBalance.toFixed(2));
      users[index].availableBalance = users[index].balance;
      this.setUsers(users);
      this.addAuditLog('user_admin', 'leykunjemaneh3@gmail.com', 'ADMIN_BALANCE_ADJUST', `Admin adjusted balance for ${users[index].name} (ID: ${userId}) from ETB ${oldBalance} to ETB ${newBalance}.`);
      this.addNotification(userId, 'Account Adjustment', `Admin adjusted your account balance to ETB ${newBalance.toLocaleString()}.`, 'warning');
    }
  }

  static adminChangeUserStatus(userId: string, status: 'active' | 'suspended'): void {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index].status = status;
      this.setUsers(users);
      this.addAuditLog('user_admin', 'leykunjemaneh3@gmail.com', 'ADMIN_USER_STATUS', `Admin changed user status for ${users[index].name} to ${status}.`);
    }
  }

  static updateUserProfile(
    userId: string, 
    updates: { 
      name?: string; 
      accountNumber?: string; 
      email?: string; 
      phone?: string; 
      accountType?: 'savings' | 'checking' | 'wadiah' | 'cbe_birr';
      balance?: number;
    }
  ): UserProfile | null {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) return null;

    const oldUser = { ...users[index] };
    const updatedUser: UserProfile = {
      ...users[index],
      ...updates
    };

    if (updates.balance !== undefined) {
      updatedUser.availableBalance = updates.balance;
    }

    users[index] = updatedUser;
    this.setUsers(users);

    // If name or account number changed, update historical transactions to reflect the updated identity
    if (updates.name || updates.accountNumber) {
      const txs = this.getTransactions();
      let txsChanged = false;
      for (const tx of txs) {
        if (tx.senderId === userId) {
          if (updates.name) tx.senderName = updates.name;
          if (updates.accountNumber) tx.senderAccount = updates.accountNumber;
          txsChanged = true;
        }
        if (tx.recipientId === userId) {
          if (updates.name) tx.recipientName = updates.name;
          if (updates.accountNumber) tx.recipientAccount = updates.accountNumber;
          txsChanged = true;
        }
      }
      if (txsChanged) {
        this.setTransactions(txs);
      }
    }

    this.addAuditLog(
      userId, 
      updatedUser.email, 
      'USER_PROFILE_UPDATE', 
      `Profile updated: Name was "${oldUser.name}" -> "${updatedUser.name}", Account was "${oldUser.accountNumber}" -> "${updatedUser.accountNumber}".`
    );

    this.addNotification(
      userId, 
      'Account Profile Updated', 
      `Your profile details have been saved: ${updatedUser.name} (A/C: ${updatedUser.accountNumber}).`, 
      'info'
    );

    window.dispatchEvent(new CustomEvent('cbe_user_updated', { detail: { user: updatedUser } }));
    return updatedUser;
  }

  static getCustomBankLogo(): string | null {
    try {
      const val = localStorage.getItem('tana_custom_bank_logo');
      return (val && val.trim().length > 0) ? val : null;
    } catch {
      return null;
    }
  }

  static setCustomBankLogo(logo: string | null): void {
    try {
      if (!logo || logo.trim().length === 0) {
        localStorage.removeItem('tana_custom_bank_logo');
      } else {
        localStorage.setItem('tana_custom_bank_logo', logo);
      }
    } catch (err) {
      console.warn('[LocalDb] Failed writing custom logo to localStorage:', err);
    }
    
    // Broadcast across windows and local components
    window.dispatchEvent(new CustomEvent('cbe_logo_updated', { detail: { logo } }));
  }
}

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

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'TX892341A',
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
    id: 'TX104928C',
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
    id: 'TX394857F',
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
    id: 'TX491823B',
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

export const DEFAULT_CBE_LOGO = 'https://ethiopianlogos.com/logos/commercial_bank_of_ethiopia/commercial_bank_of_ethiopia.png';

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
    return loadData('tana_transactions', INITIAL_TRANSACTIONS);
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

    // Realistic CBE Transaction ID format: FT + YY + 6 digits + letters
    const currentYearShort = new Date().getFullYear().toString().slice(-2);
    const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
    const randomLetter1 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const randomLetter2 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const cbeTxId = `FT${currentYearShort}${randomDigits}${randomLetter1}17${randomLetter2}`;

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

  static getCustomBankLogo(): string | null {
    return localStorage.getItem('tana_custom_bank_logo');
  }

  static setCustomBankLogo(logo: string | null): void {
    if (logo === null) {
      localStorage.removeItem('tana_custom_bank_logo');
    } else {
      localStorage.setItem('tana_custom_bank_logo', logo);
    }
    window.dispatchEvent(new Event('cbe_logo_updated'));
  }

  static getCustomQrCode(): string | null {
    return localStorage.getItem('tana_custom_qr_code');
  }

  static setCustomQrCode(qr: string | null): void {
    if (qr === null) {
      localStorage.removeItem('tana_custom_qr_code');
    } else {
      localStorage.setItem('tana_custom_qr_code', qr);
    }
    window.dispatchEvent(new Event('cbe_qr_updated'));
  }
}

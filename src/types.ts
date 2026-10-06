export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended';

export type BankAccountType = 'savings' | 'checking' | 'wadiah' | 'cbe_birr' | 'fixed_deposit' | 'youth_savings' | 'women_special';

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  accountNumber: string;
  accountType?: 'savings' | 'checking' | 'wadiah' | 'cbe_birr';
  balance: number;
  availableBalance?: number;
  currency?: string;
  pinHash?: string;
  biometricEnabled?: boolean;
}

export interface BankAccount {
  id: string;
  userId: string;
  accountName: string;
  accountNumber: string;
  accountType: BankAccountType;
  balance: number;
  availableBalance: number;
  status: 'active' | 'frozen';
  currency: 'ETB' | string;
  isPrimary?: boolean;
  createdAt: string;
}

export interface RegisteredAccountInfo {
  accountNumber: string;
  accountName: string;
  bankName: string;
  userId?: string;
  phone?: string;
  isVerified: boolean;
  accountType?: string;
  balance?: number;
}

export type TransactionType = 'send' | 'receive' | 'transfer' | 'bill' | 'airtime';
export type TransactionStatus = 'pending' | 'success' | 'failed';

export interface Transaction {
  id: string;
  type: TransactionType;
  senderId?: string;
  senderName?: string;
  senderAccount?: string;
  recipientId?: string;
  recipientName: string;
  recipientAccount: string;
  recipientBank: string;
  amount: number;
  fee: number;
  serviceCharge?: number;
  vat?: number;
  disasterRecovery?: number;
  totalDebited?: number;
  description: string;
  status: TransactionStatus;
  reference: string;
  createdAt: string;
  category?: string;
}

export interface Beneficiary {
  id: string;
  userId: string;
  name: string;
  accountNumber: string;
  bankName: string;
  phone?: string;
}

export interface BillPayment {
  id: string;
  userId: string;
  category: 'electricity' | 'water' | 'internet' | 'telecom' | 'tv' | 'other';
  companyName: string;
  customerId: string;
  amount: number;
  fee: number;
  status: TransactionStatus;
  reference: string;
  createdAt: string;
}

export interface AirtimePurchase {
  id: string;
  userId: string;
  network: 'Ethio Telecom' | 'Safaricom';
  phone: string;
  amount: number;
  packageType: 'airtime' | 'data';
  packageDetails?: string; // e.g. "Weekly 5GB Unlimited"
  status: TransactionStatus;
  reference: string;
  createdAt: string;
}

export interface SystemNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  isRead: boolean;
  type: 'info' | 'success' | 'warning' | 'alert';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  createdAt: string;
}

export * from './types/sms';

import { 
  UserProfile, 
  Transaction, 
  Beneficiary, 
  BillPayment, 
  AirtimePurchase, 
  SystemNotification, 
  AuditLog,
  TransactionType,
  BankAccount,
  BankAccountType,
  RegisteredAccountInfo
} from '../types';
import QRCode from 'qrcode';
import { calculateCbeFee } from './cbeTariff';
import { firebaseService } from '../services/firebaseService';
import { SmsService } from '../services/smsService';
import { TruecallerService } from '../services/truecallerService';
import { PhoneCallService } from '../services/phoneCallService';
import { DashenBankService } from '../services/dashenBankService';
import { 
  ADDITIONAL_DIRECTORY_ACCOUNTS, 
  ADDITIONAL_USERS_SEED, 
  ADDITIONAL_BANK_ACCOUNTS 
} from './additionalAccountsData';
import {
  BULK_DIRECTORY_ACCOUNTS,
  BULK_USERS_SEED,
  BULK_BANK_ACCOUNTS
} from './bulkRegisteredAccounts';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 11).toUpperCase();

// Default values to seed if localStorage is empty
const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user_1',
    name: 'Leykun Jemaneh Ylma',
    phone: '+251900112233',
    email: 'leykunjemaneh3@gmail.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-01-10T10:30:00Z',
    accountNumber: '1000419524747',
    balance: 18450.50,
    availableBalance: 18450.50,
    biometricEnabled: true
  },
  {
    id: 'user_admin',
    name: 'Leykun Jemaneh Ylma (Admin)',
    phone: '+251900112233',
    email: 'leykunjemaneh3@gmail.com', // Bootstrapped admin
    role: 'admin',
    status: 'active',
    createdAt: '2026-01-01T08:00:00Z',
    accountNumber: '1000419524747',
    balance: 18450.50,
    availableBalance: 18450.50,
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
    balance: 52450.00,
    availableBalance: 52450.00,
    biometricEnabled: false
  },
  {
    id: 'user_global_market',
    name: 'Global Online Market',
    phone: '+251911684396',
    email: 'globalonlinemarket@cbe.com.et',
    role: 'admin',
    status: 'active',
    createdAt: '2026-01-01T08:00:00Z',
    accountNumber: '1000684396671',
    balance: 2500000.00,
    availableBalance: 2500000.00,
    biometricEnabled: true
  },
  {
    id: 'user_leul_degsew',
    name: 'Leul Degsew Alemayehu',
    phone: '+251911638276',
    email: 'leul.degsew@gmail.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-01-15T09:00:00Z',
    accountNumber: '1000638276450',
    balance: 145280.50,
    availableBalance: 145280.50,
    biometricEnabled: true
  },
  {
    id: 'user_elisabeth_hune',
    name: 'Elisabeth Hune Mamo',
    phone: '+251912714565',
    email: 'elisabeth.hune@gmail.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-01-20T10:15:00Z',
    accountNumber: '1000714565770',
    balance: 382500.00,
    availableBalance: 382500.00,
    biometricEnabled: true
  },
  {
    id: 'user_daniel_natnael',
    name: 'Daniel Natnael Gemechu',
    phone: '+251913842195',
    email: 'daniel.natnael@gmail.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-02-01T11:30:00Z',
    accountNumber: '1000842195466',
    balance: 219750.75,
    availableBalance: 219750.75,
    biometricEnabled: true
  },
  {
    id: 'user_bilen_solomon',
    name: 'Bilen Solomon Worku',
    phone: '+251914526382',
    email: 'bilen.solomon@gmail.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-02-12T14:45:00Z',
    accountNumber: '1000526382575',
    balance: 560400.00,
    availableBalance: 560400.00,
    biometricEnabled: true
  },
  {
    id: 'user_hunndeessaa_dajenee',
    name: 'Hunndeessaa Dajenee Tufaa',
    phone: '+251915963142',
    email: 'hunndeessaa.dajenee@gmail.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-02-25T16:20:00Z',
    accountNumber: '1000963142586',
    balance: 84320.00,
    availableBalance: 84320.00,
    biometricEnabled: true
  },
  {
    id: 'user_hlina_getaye',
    name: 'Hlina Getaye Getaneh',
    phone: '+251916437281',
    email: 'hlina.getaye@gmail.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-03-02T08:30:00Z',
    accountNumber: '1000437281195',
    balance: 473150.25,
    availableBalance: 473150.25,
    biometricEnabled: true
  },
  {
    id: 'user_amir_mohammed',
    name: 'Amir Mohammed Rafi',
    phone: '+251917756218',
    email: 'amir.mohammed@gmail.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-03-08T12:00:00Z',
    accountNumber: '1000756218334',
    balance: 628900.00,
    availableBalance: 628900.00,
    biometricEnabled: true
  }
];

export const INITIAL_ACCOUNTS: BankAccount[] = [
  {
    id: 'acc_global_market',
    userId: 'user_global_market',
    accountName: 'Global Online Market Enterprise Account',
    accountNumber: '1000684396671',
    accountType: 'savings',
    balance: 2500000.00,
    availableBalance: 2500000.00,
    status: 'active',
    currency: 'ETB',
    isPrimary: true,
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'acc_leul_main',
    userId: 'user_leul_degsew',
    accountName: 'Primary Savings Account',
    accountNumber: '1000638276450',
    accountType: 'savings',
    balance: 145280.50,
    availableBalance: 145280.50,
    status: 'active',
    currency: 'ETB',
    isPrimary: true,
    createdAt: '2026-01-15T09:00:00Z'
  },
  {
    id: 'acc_elisabeth_main',
    userId: 'user_elisabeth_hune',
    accountName: 'Primary Savings Account',
    accountNumber: '1000714565770',
    accountType: 'savings',
    balance: 382500.00,
    availableBalance: 382500.00,
    status: 'active',
    currency: 'ETB',
    isPrimary: true,
    createdAt: '2026-01-20T10:15:00Z'
  },
  {
    id: 'acc_daniel_main',
    userId: 'user_daniel_natnael',
    accountName: 'Primary Savings Account',
    accountNumber: '1000842195466',
    accountType: 'savings',
    balance: 219750.75,
    availableBalance: 219750.75,
    status: 'active',
    currency: 'ETB',
    isPrimary: true,
    createdAt: '2026-02-01T11:30:00Z'
  },
  {
    id: 'acc_bilen_main',
    userId: 'user_bilen_solomon',
    accountName: 'Primary Savings Account',
    accountNumber: '1000526382575',
    accountType: 'savings',
    balance: 560400.00,
    availableBalance: 560400.00,
    status: 'active',
    currency: 'ETB',
    isPrimary: true,
    createdAt: '2026-02-12T14:45:00Z'
  },
  {
    id: 'acc_hunndeessaa_main',
    userId: 'user_hunndeessaa_dajenee',
    accountName: 'Primary Savings Account',
    accountNumber: '1000963142586',
    accountType: 'savings',
    balance: 84320.00,
    availableBalance: 84320.00,
    status: 'active',
    currency: 'ETB',
    isPrimary: true,
    createdAt: '2026-02-25T16:20:00Z'
  },
  {
    id: 'acc_hlina_main',
    userId: 'user_hlina_getaye',
    accountName: 'Primary Savings Account',
    accountNumber: '1000437281195',
    accountType: 'savings',
    balance: 473150.25,
    availableBalance: 473150.25,
    status: 'active',
    currency: 'ETB',
    isPrimary: true,
    createdAt: '2026-03-02T08:30:00Z'
  },
  {
    id: 'acc_amir_main',
    userId: 'user_amir_mohammed',
    accountName: 'Primary Savings Account',
    accountNumber: '1000756218334',
    accountType: 'savings',
    balance: 628900.00,
    availableBalance: 628900.00,
    status: 'active',
    currency: 'ETB',
    isPrimary: true,
    createdAt: '2026-03-08T12:00:00Z'
  },
  {
    id: 'acc_admin_main',
    userId: 'user_admin',
    accountName: 'Main Savings Account',
    accountNumber: '1000999999999',
    accountType: 'savings',
    balance: 150000.00,
    availableBalance: 150000.00,
    status: 'active',
    currency: 'ETB',
    isPrimary: false,
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'acc_admin_wadiah',
    userId: 'user_admin',
    accountName: 'Wadiah Interest-Free Savings',
    accountNumber: '1000888888888',
    accountType: 'wadiah',
    balance: 250000.00,
    availableBalance: 250000.00,
    status: 'active',
    currency: 'ETB',
    isPrimary: false,
    createdAt: '2026-02-10T11:00:00Z'
  },
  {
    id: 'acc_admin_cbebirr',
    userId: 'user_admin',
    accountName: 'CBE Birr Digital Wallet',
    accountNumber: '1000777777777',
    accountType: 'cbe_birr',
    balance: 45000.00,
    availableBalance: 45000.00,
    status: 'active',
    currency: 'ETB',
    isPrimary: false,
    createdAt: '2026-03-01T14:30:00Z'
  },
  {
    id: 'acc_user1_main',
    userId: 'user_1',
    accountName: 'Main Savings Account',
    accountNumber: '1000123456789',
    accountType: 'savings',
    balance: 2500000.00,
    availableBalance: 2500000.00,
    status: 'active',
    currency: 'ETB',
    isPrimary: false,
    createdAt: '2026-01-10T10:30:00Z'
  },
  {
    id: 'acc_user1_biz',
    userId: 'user_1',
    accountName: 'Business Checking Account',
    accountNumber: '1000112233445',
    accountType: 'checking',
    balance: 850000.00,
    availableBalance: 850000.00,
    status: 'active',
    currency: 'ETB',
    isPrimary: false,
    createdAt: '2026-02-15T09:00:00Z'
  },
  {
    id: 'acc_user2_main',
    userId: 'user_2',
    accountName: 'Primary Savings Account',
    accountNumber: '1000246810121',
    accountType: 'savings',
    balance: 52450.00,
    availableBalance: 52450.00,
    status: 'active',
    currency: 'ETB',
    isPrimary: true,
    createdAt: '2026-03-15T14:20:00Z'
  },
  {
    id: 'acc_leykun_4747',
    userId: 'user_admin',
    accountName: 'Leykun CBE Account',
    accountNumber: '1000419524747',
    accountType: 'savings',
    balance: 18450.50,
    availableBalance: 18450.50,
    status: 'active',
    currency: 'ETB',
    isPrimary: true,
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'acc_user1_leykun_4747',
    userId: 'user_1',
    accountName: 'Leykun CBE Account',
    accountNumber: '1000419524747',
    accountType: 'savings',
    balance: 18450.50,
    availableBalance: 18450.50,
    status: 'active',
    currency: 'ETB',
    isPrimary: true,
    createdAt: '2026-01-01T08:00:00Z'
  }
];

export const TOP_10_BILLION_ACCOUNT_NUMBERS: string[] = [];

export const VERIFIED_DIRECTORY_ACCOUNTS: RegisteredAccountInfo[] = [
  {
    accountNumber: '1000419524747',
    accountName: 'Leykun Jemaneh Ylma',
    bankName: 'Commercial Bank of Ethiopia',
    userId: 'user_admin',
    phone: '+251900112233',
    isVerified: true,
    accountType: 'Savings Account',
    balance: 18450.50
  },
  {
    accountNumber: '1000638276450',
    accountName: 'Leul Degsew Alemayehu',
    bankName: 'Commercial Bank of Ethiopia',
    userId: 'user_leul_degsew',
    phone: '+251911638276',
    isVerified: true,
    accountType: 'Savings Account',
    balance: 145280.50
  },
  {
    accountNumber: '1000684396671',
    accountName: 'Global Online Market',
    bankName: 'Commercial Bank of Ethiopia',
    userId: 'user_global_market',
    phone: '+251911684396',
    isVerified: true,
    accountType: 'Enterprise Account',
    balance: 2500000.00
  },
  {
    accountNumber: '1000999999999',
    accountName: 'Leykun Jemaneh',
    bankName: 'Commercial Bank of Ethiopia',
    userId: 'user_admin',
    phone: '+251900112233',
    isVerified: true,
    accountType: 'Wadiah Savings',
    balance: 150000.00
  },
  {
    accountNumber: '5502877108011',
    accountName: 'Leykun Jemaneh Yilma',
    bankName: 'Dashen Bank',
    userId: 'user_admin',
    phone: '+251900112233',
    isVerified: true,
    accountType: 'Dashen Savings Account',
    balance: 95000.00
  },
  {
    accountNumber: '1000246810121',
    accountName: 'Selamawit Tekle Haile',
    bankName: 'Commercial Bank of Ethiopia',
    userId: 'user_2',
    phone: '+251912345678',
    isVerified: true,
    accountType: 'Savings Account',
    balance: 52450.00
  },
  {
    accountNumber: '1000123456789',
    accountName: 'Abebe Kebede Wolde',
    bankName: 'Commercial Bank of Ethiopia',
    userId: 'user_1',
    phone: '+251911223344',
    isVerified: true,
    accountType: 'Savings Account',
    balance: 143200.00
  },
  {
    accountNumber: '1000714565770',
    accountName: 'Elisabeth Hune Mamo',
    bankName: 'Commercial Bank of Ethiopia',
    userId: 'user_elisabeth_hune',
    phone: '+251912714565',
    isVerified: true,
    accountType: 'Savings Account',
    balance: 382500.00
  },
  {
    accountNumber: '1000842195466',
    accountName: 'Daniel Natnael Gemechu',
    bankName: 'Commercial Bank of Ethiopia',
    userId: 'user_daniel_natnael',
    phone: '+251913842195',
    isVerified: true,
    accountType: 'Savings Account',
    balance: 219750.75
  },
  {
    accountNumber: '1000526382575',
    accountName: 'Bilen Solomon Worku',
    bankName: 'Commercial Bank of Ethiopia',
    userId: 'user_bilen_solomon',
    phone: '+251914526382',
    isVerified: true,
    accountType: 'Savings Account',
    balance: 560400.00
  },
  {
    accountNumber: '1000963142586',
    accountName: 'Hunndeessaa Dajenee Tufaa',
    bankName: 'Commercial Bank of Ethiopia',
    userId: 'user_hunndeessaa_dajenee',
    phone: '+251915963142',
    isVerified: true,
    accountType: 'Savings Account',
    balance: 84320.00
  },
  {
    accountNumber: '1000437281195',
    accountName: 'Hlina Getaye Getaneh',
    bankName: 'Commercial Bank of Ethiopia',
    userId: 'user_hlina_getaye',
    phone: '+251916437281',
    isVerified: true,
    accountType: 'Savings Account',
    balance: 473150.25
  },
  {
    accountNumber: '1000756218334',
    accountName: 'Amir Mohammed Rafi',
    bankName: 'Commercial Bank of Ethiopia',
    userId: 'user_amir_mohammed',
    phone: '+251917756218',
    isVerified: true,
    accountType: 'Savings Account',
    balance: 628900.00
  },
  {
    accountNumber: '1000345678901',
    accountName: 'Kasahun Yematawork Desta',
    bankName: 'Commercial Bank of Ethiopia',
    phone: '+251911998877',
    isVerified: true,
    accountType: 'Savings Account',
    balance: 7200.00
  },
  {
    accountNumber: '1000567890123',
    accountName: 'Tesfahun Abebe Girma',
    bankName: 'Commercial Bank of Ethiopia',
    phone: '+251912233445',
    isVerified: true,
    accountType: 'Savings Account',
    balance: 15300.00
  },
  {
    accountNumber: '1000789012345',
    accountName: 'Ashenafi Alemu Mengistu',
    bankName: 'Commercial Bank of Ethiopia',
    phone: '+251913344556',
    isVerified: true,
    accountType: 'Checking Account',
    balance: 22150.00
  },
  {
    accountNumber: '1000888888888',
    accountName: 'Leykun Jemaneh (Wadiah)',
    bankName: 'Commercial Bank of Ethiopia',
    userId: 'user_admin',
    isVerified: true,
    accountType: 'Wadiah Interest-Free',
    balance: 250000.00
  },
  {
    accountNumber: '1000777777777',
    accountName: 'Leykun Jemaneh (CBE Birr)',
    bankName: 'Commercial Bank of Ethiopia',
    userId: 'user_admin',
    isVerified: true,
    accountType: 'CBE Birr Wallet',
    balance: 45000.00
  },
  {
    accountNumber: '1000987654321',
    accountName: 'Bethlehem Tadesse Zewdu',
    bankName: 'Commercial Bank of Ethiopia',
    phone: '+251914455667',
    isVerified: true,
    accountType: 'Women Special Savings'
  },
  {
    accountNumber: '1000654321098',
    accountName: 'Henok Girma Worku',
    bankName: 'Commercial Bank of Ethiopia',
    phone: '+251915566778',
    isVerified: true,
    accountType: 'Savings Account'
  },
  {
    accountNumber: '1000432109876',
    accountName: 'Genet Molla Negash',
    bankName: 'Commercial Bank of Ethiopia',
    phone: '+251916677889',
    isVerified: true,
    accountType: 'Youth Savings'
  },
  {
    accountNumber: '1000321098765',
    accountName: 'Yohannes Haile Fikre',
    bankName: 'Commercial Bank of Ethiopia',
    phone: '+251917788990',
    isVerified: true,
    accountType: 'Savings Account'
  },
  {
    accountNumber: '1000210987654',
    accountName: 'Almaz Bekele Tafese',
    bankName: 'Commercial Bank of Ethiopia',
    phone: '+251918899001',
    isVerified: true,
    accountType: 'Savings Account'
  },
  ...ADDITIONAL_DIRECTORY_ACCOUNTS,
  ...BULK_DIRECTORY_ACCOUNTS
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
    id: 'FT262451AA99',
    type: 'transfer',
    senderId: 'user_1',
    senderName: 'Leykun Jemaneh',
    senderAccount: '1000284758657',
    recipientName: 'Leykun Jemaneh',
    recipientAccount: '1000492817263',
    recipientBank: 'Commercial Bank of Ethiopia',
    amount: 280550.00,
    fee: 0.00,
    description: 'CBE Account to Account Transfer',
    status: 'success',
    reference: 'REF-LEY-24519',
    category: 'ACCOUNT TO ACCOUNT',
    createdAt: '2026-09-01T14:56:00.000Z'
  },
  {
    id: 'FT262438BB88',
    type: 'transfer',
    senderId: 'user_1',
    senderName: 'Leykun Jemaneh',
    senderAccount: '1000284758657',
    recipientName: 'Sadik Ahmed',
    recipientAccount: '1000382910482',
    recipientBank: 'Commercial Bank of Ethiopia',
    amount: 125069.00,
    fee: 0.00,
    description: 'CBE Account to Account Transfer',
    status: 'success',
    reference: 'REF-SAD-24388',
    category: 'ACCOUNT TO ACCOUNT',
    createdAt: '2026-08-30T20:20:00.000Z'
  },
  {
    id: 'FT262432CC77',
    type: 'transfer',
    senderId: 'user_1',
    senderName: 'Leykun Jemaneh',
    senderAccount: '1000284758657',
    recipientName: 'Liya Endalkachew',
    recipientAccount: '1000192837465',
    recipientBank: 'Commercial Bank of Ethiopia',
    amount: 225000.00,
    fee: 0.00,
    description: 'CBE Account to Account Transfer',
    status: 'success',
    reference: 'REF-LIY-24327',
    category: 'ACCOUNT TO ACCOUNT',
    createdAt: '2026-08-30T16:51:00.000Z'
  },
  {
    id: 'FT262429AA81',
    type: 'receive',
    recipientId: 'user_1',
    recipientName: 'Leykun Jemaneh',
    recipientAccount: '1000284758657',
    recipientBank: 'Commercial Bank of Ethiopia',
    senderName: 'Deposit',
    senderAccount: '1000998877665',
    amount: 2000.00,
    fee: 0.00,
    description: 'Cash Deposit at Branch / ATM',
    status: 'success',
    reference: 'REF-DEP-24291',
    category: 'MOBILE MONEY TXN',
    createdAt: '2026-08-29T00:00:00.000Z'
  },
  {
    id: 'FT262331BC12',
    type: 'receive',
    recipientId: 'user_1',
    recipientName: 'Leykun Jemaneh',
    recipientAccount: '1000284758657',
    recipientBank: 'Commercial Bank of Ethiopia',
    senderName: 'Kasahun Yematawork',
    senderAccount: '1000345678901',
    amount: 50.00,
    fee: 0.00,
    description: 'CBE Mobile Transfer',
    status: 'success',
    reference: 'REF-KAS-23312',
    category: 'ACCOUNT TO ACCOUNT',
    createdAt: '2026-08-21T18:55:00.000Z'
  },
  {
    id: 'FT262294DE99',
    type: 'receive',
    recipientId: 'user_1',
    recipientName: 'Leykun Jemaneh',
    recipientAccount: '1000284758657',
    recipientBank: 'Commercial Bank of Ethiopia',
    senderName: 'Tesfahun Abebe',
    senderAccount: '1000567890123',
    amount: 50.00,
    fee: 0.00,
    description: 'Project Milestones Settlement',
    status: 'success',
    reference: 'REF-TES-22949',
    category: 'ACCOUNT TO ACCOUNT',
    createdAt: '2026-08-20T15:55:00.000Z'
  },
  {
    id: 'FT262241FG44',
    type: 'receive',
    recipientId: 'user_1',
    recipientName: 'Leykun Jemaneh',
    recipientAccount: '1000284758657',
    recipientBank: 'Commercial Bank of Ethiopia',
    senderName: 'Ashenafi Alemu',
    senderAccount: '1000789012345',
    amount: 10832.00,
    fee: 0.00,
    description: 'CBE Account to Account Transfer',
    status: 'success',
    reference: 'REF-ASH-22414',
    category: 'ACCOUNT TO ACCOUNT',
    createdAt: '2026-08-05T11:26:00.000Z'
  },
  {
    id: 'FT262198HJ33',
    type: 'airtime',
    senderId: 'user_1',
    senderName: 'Leykun Jemaneh',
    senderAccount: '1000284758657',
    recipientName: 'Ethio Telecom Airtime',
    recipientAccount: '+251911223344',
    recipientBank: 'Ethio Telecom',
    amount: 50.00,
    fee: 0.00,
    description: 'Airtime Purchase - Top Up',
    status: 'success',
    reference: 'REF-ETH-21983',
    category: 'AIRTIME PURCHASE',
    createdAt: '2026-08-02T09:30:00.000Z'
  },
  {
    id: 'FT262045KL22',
    type: 'bill',
    senderId: 'user_1',
    senderName: 'Leykun Jemaneh',
    senderAccount: '1000284758657',
    recipientName: 'DSTV Subscription',
    recipientAccount: 'B-DSTV-894102',
    recipientBank: 'MultiChoice Ethiopia',
    amount: 950.00,
    fee: 3.50,
    description: 'Monthly Entertainment Package',
    status: 'success',
    reference: 'REF-DSTV-20452',
    category: 'UTILITY PAYMENT',
    createdAt: '2026-07-28T16:10:00.000Z'
  },
  {
    id: 'FT261988MN11',
    type: 'transfer',
    senderId: 'user_1',
    senderName: 'Leykun Jemaneh',
    senderAccount: '1000284758657',
    recipientName: 'Selamawit Tekle',
    recipientAccount: '1000246810121',
    recipientBank: 'Commercial Bank of Ethiopia',
    amount: 1500.00,
    fee: 10.00,
    description: 'Family Support Transfer',
    status: 'success',
    reference: 'REF-SEL-19881',
    category: 'ACCOUNT TO ACCOUNT',
    createdAt: '2026-07-25T14:00:00.000Z'
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

// Official CBE Golden Emblem SVG (kept for vector reference if needed)
export const CBE_OFFICIAL_EMBLEM_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
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

// Primary Bank Logo: points directly to the recently uploaded PNG logo
export const DEFAULT_CBE_LOGO = '/custom-bank-logo.png';

export type StampWeight = 'light' | 'normal' | 'medium' | 'bold' | 'heavy';

export interface StampPosition {
  xPercent: number; // default 48%
  yPercent: number; // default 52%
}

// Authentic Official CBE Circular Purple Rubber Stamp SVG Data URI matching IMG_20260905_105826_969.png
export function getOfficialCbeStampSvg(weight: StampWeight = 'normal'): string {
  const mul = weight === 'light' ? 0.75 : weight === 'medium' ? 1.25 : weight === 'bold' ? 1.6 : weight === 'heavy' ? 2.05 : 1.0;
  
  const outerStroke = (4.2 * mul).toFixed(1);
  const secondStroke = (2.0 * mul).toFixed(1);
  const textUpperStroke = (0.8 * mul).toFixed(1);
  const textLowerStroke = (0.6 * mul).toFixed(1);
  const innerRingStroke = (3.2 * mul).toFixed(1);
  const lineStroke = (1.4 * mul).toFixed(1);
  const hatchStroke = (1.2 * mul).toFixed(1);
  const medallionStroke = (2.5 * mul).toFixed(1);

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" fill="none">
  <defs>
    <path id="cbeUpper" d="M 29.5,120 A 90.5,90.5 0 0,1 210.5,120" />
    <path id="cbeLower" d="M 29.5,120 A 90.5,90.5 0 0,0 210.5,120" />
    <pattern id="hatch" width="3.2" height="3.2" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="3.2" stroke="#5e1887" stroke-width="${hatchStroke}" />
    </pattern>
  </defs>
  <circle cx="120" cy="120" r="114" stroke="#5e1887" stroke-width="${outerStroke}" stroke-dasharray="140 2 95 1.5 130 2" stroke-linecap="round" />
  <circle cx="120" cy="120" r="107.5" stroke="#5e1887" stroke-width="${secondStroke}" opacity="0.95" />
  <text fill="#5e1887" stroke="#5e1887" stroke-width="${textUpperStroke}" paint-order="stroke fill" font-size="16.5" font-weight="900" letter-spacing="2.8px" font-family="system-ui, sans-serif">
    <textPath href="#cbeUpper" startOffset="50%" text-anchor="middle">የኢትዮጵያ ንግድ ባንክ</textPath>
  </text>
  <text fill="#5e1887" stroke="#5e1887" stroke-width="${textLowerStroke}" paint-order="stroke fill" font-size="12.5" font-weight="900" letter-spacing="1.2px" font-family="system-ui, sans-serif">
    <textPath href="#cbeLower" startOffset="50%" text-anchor="middle">Commercial Bank of Ethiopia * 9.1.6</textPath>
  </text>
  <circle cx="120" cy="120" r="76" stroke="#5e1887" stroke-width="${innerRingStroke}" />
  <path d="M 68 100 C 72 68, 114 56, 148 64 C 176 72, 184 104, 178 136 C 166 166, 126 178, 92 168 C 66 156, 62 126, 68 100 Z" fill="url(#hatch)" opacity="0.45" />
  <g stroke="#5e1887" stroke-width="${lineStroke}" opacity="0.95">
    <path d="M 68 96 C 72 74, 86 58, 114 56 L 122 56" fill="none" stroke-width="${(2.0 * mul).toFixed(1)}" />
    <line x1="108" y1="105" x2="68" y2="96" />
    <line x1="110" y1="102" x2="72" y2="86" />
    <line x1="112" y1="99" x2="78" y2="76" />
    <line x1="114" y1="96" x2="86" y2="68" />
    <line x1="116" y1="93" x2="96" y2="61" />
    <line x1="118" y1="90" x2="108" y2="57" />
    <line x1="120" y1="88" x2="120" y2="56" />
    <path d="M 72 92 C 80 82, 92 72, 110 68" fill="none" stroke-width="${(1.1 * mul).toFixed(1)}" />
    <path d="M 80 96 C 88 86, 100 78, 116 75" fill="none" stroke-width="${(1.1 * mul).toFixed(1)}" />
    <path d="M 90 101 C 96 93, 106 85, 120 82" fill="none" stroke-width="${(1.1 * mul).toFixed(1)}" />
  </g>
  <g stroke="#5e1887" fill="none" opacity="0.95">
    <path d="M 124 76 C 152 64, 184 82, 188 110 C 192 134, 178 154, 154 162" stroke-width="${(2.0 * mul).toFixed(1)}" />
    <path d="M 122 82 C 148 71, 176 88, 180 112 C 183 131, 171 149, 150 156" stroke-width="${(1.7 * mul).toFixed(1)}" />
    <path d="M 120 88 C 144 78, 168 93, 172 114 C 175 129, 164 144, 146 150" stroke-width="${(1.5 * mul).toFixed(1)}" />
    <path d="M 118 94 C 138 85, 160 98, 164 116 C 167 127, 158 139, 142 144" stroke-width="${(1.4 * mul).toFixed(1)}" />
    <path d="M 116 100 C 132 92, 152 103, 156 118 C 158 126, 152 134, 138 138" stroke-width="${(1.3 * mul).toFixed(1)}" />
    <path d="M 114 106 C 128 99, 144 108, 148 120 C 150 126, 145 130, 134 133" stroke-width="${(1.2 * mul).toFixed(1)}" />
    <path d="M 112 112 C 122 106, 136 113, 140 122 C 141 126, 138 128, 130 129" stroke-width="${(1.1 * mul).toFixed(1)}" />
  </g>
  <!-- Central Medallion: Solid Purple Background with White CBE Symbol -->
  <g transform="translate(120, 116) rotate(-26)">
    <ellipse cx="0" cy="0" rx="25" ry="18" fill="#5e1887" stroke="#5e1887" stroke-width="${medallionStroke}" />
    <ellipse cx="0" cy="0" rx="22" ry="15" fill="none" stroke="#ffffff" stroke-width="${(1.2 * mul).toFixed(1)}" opacity="0.85" />
    <g fill="#ffffff" transform="scale(0.92)">
      <rect x="-2.5" y="-10" width="5" height="20" rx="1.5" />
      <path d="M -2.5 -8.5 C -13 -8.5, -13 8.5, -2.5 8.5 L -2.5 4.8 C -8.5 4.8, -8.5 -4.8, -2.5 -4.8 Z" />
      <path d="M 2.5 -8.5 C 10.5 -8.5, 10.5 -0.5, 2.5 -0.5 Z" />
      <path d="M 2.5 -6.2 C 6.8 -6.2, 6.8 -2.8, 2.5 -2.8 Z" fill="#5e1887" />
      <path d="M 2.5 -0.5 C 11.5 -0.5, 11.5 8.5, 2.5 8.5 Z" />
      <path d="M 2.5 1.8 C 7.5 1.8, 7.5 6.2, 2.5 6.2 Z" fill="#5e1887" />
      <polygon points="0,-3 3,0 0,3 -3,0" fill="#5e1887" />
    </g>
  </g>
</svg>
`)}`;
}

export const OFFICIAL_CBE_STAMP_LOGO = getOfficialCbeStampSvg('normal');

/**
 * Rasterizes an SVG string or data URI into a crystal-clear PNG data URI
 * to ensure 100% faithful CBE purple color (#5e1887) rendering in html2canvas and PDF engines.
 */
export function rasterizeSvgToPng(svgDataUrl: string, size = 640): Promise<string> {
  return new Promise((resolve) => {
    if (!svgDataUrl || !svgDataUrl.startsWith('data:image/svg')) {
      resolve(svgDataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(svgDataUrl);
          return;
        }
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        const pngUrl = canvas.toDataURL('image/png');
        resolve(pngUrl);
      } catch {
        resolve(svgDataUrl);
      }
    };
    img.onerror = () => resolve(svgDataUrl);
    img.src = svgDataUrl;
  });
}

// Authentic CBE Receipt QR Code Template (matching reference IMG_20260916_103244_278.png)
export const OFFICIAL_CBE_QR_PRESET = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 31 31" shape-rendering="crispEdges">
  <path fill="#ffffff" d="M0 0h31v31H0z"/>
  <path stroke="#000000" d="M1 1.5h7m4 0h1m1 0h2m1 0h1m2 0h1m2 0h7M1 2.5h1m5 0h1m1 0h1m1 0h2m2 0h2m1 0h4m1 0h1m5 0h1M1 3.5h1m1 0h3m1 0h1m6 0h2m1 0h1m1 0h1m3 0h1m1 0h3m1 0h1M1 4.5h1m1 0h3m1 0h1m3 0h1m2 0h2m1 0h1m2 0h1m2 0h1m1 0h3m1 0h1M1 5.5h1m1 0h3m1 0h1m1 0h3m1 0h1m1 0h6m2 0h1m1 0h3m1 0h1M1 6.5h1m5 0h1m5 0h2m1 0h1m2 0h2m2 0h1m5 0h1M1 7.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M10 8.5h2m1 0h4m1 0h2m1 0h1M1 9.5h1m1 0h1m1 0h1m1 0h1m2 0h1m4 0h4m1 0h2m3 0h1m2 0h1M6 10.5h1m2 0h4m2 0h2m1 0h2m2 0h3m1 0h1m2 0h1M1 11.5h5m1 0h2m2 0h1m2 0h1m3 0h1m3 0h1m1 0h1m2 0h3M5 12.5h1m4 0h2m1 0h1m3 0h2m1 0h5m3 0h1M1 13.5h2m2 0h1m1 0h2m2 0h3m3 0h8m1 0h1m1 0h2M1 14.5h1m1 0h4m2 0h2m1 0h3m1 0h3m2 0h3m2 0h1m2 0h1M4 15.5h5m2 0h1m3 0h3m1 0h1m3 0h1m1 0h2m1 0h2M3 16.5h1m4 0h1m4 0h6m2 0h1m1 0h2m1 0h1m1 0h1M3 17.5h2m2 0h3m1 0h2m2 0h1m1 0h2m1 0h5m1 0h1m1 0h2M2 18.5h1m3 0h1m2 0h3m1 0h1m1 0h2m4 0h3m2 0h2m1 0h1M1 19.5h1m1 0h2m1 0h3m1 0h5m1 0h1m1 0h1m4 0h1m1 0h1m2 0h2M2 20.5h2m1 0h2m2 0h1m1 0h2m3 0h2m1 0h1m2 0h3m1 0h1m1 0h1M1 21.5h1m1 0h5m2 0h1m2 0h1m2 0h2m1 0h1m1 0h5M9 22.5h6m4 0h3m3 0h1m1 0h3M1 23.5h7m3 0h1m1 0h1m1 0h1m1 0h2m1 0h2m1 0h1m1 0h2m1 0h2M1 24.5h1m5 0h1m2 0h1m2 0h5m3 0h1m3 0h2M1 25.5h1m1 0h3m1 0h1m1 0h1m2 0h1m2 0h1m1 0h3m1 0h5M1 26.5h1m1 0h3m1 0h1m3 0h1m3 0h4m1 0h2m3 0h1m1 0h1M1 27.5h1m1 0h3m1 0h1m1 0h2m2 0h1m3 0h4m3 0h3m2 0h1M1 28.5h1m5 0h1m3 0h1m2 0h1m1 0h6m6 0h1M1 29.5h7m1 0h2m1 0h2m3 0h2m2 0h3m1 0h1m2 0h2"/>
</svg>
`)}`;

/**
 * Authentic CBE Transaction QR Code Generator
 * Generates distinct, scannable, Version 3 (29x29 matrix) QR codes for different transactions
 * matching the authentic CBE Mobile Banking receipt reference (IMG_20260916_103244_278.png).
 */
export function getAuthenticCbeQrSvg(txId: string): string {
  const normalizedId = formatTo12CharTxId(txId);
  const payload = `https://apps.cbe.com.et/v/${normalizedId}`;
  let qr;
  try {
    qr = QRCode.create(payload, { version: 3, errorCorrectionLevel: 'M' });
  } catch {
    qr = QRCode.create(payload, { errorCorrectionLevel: 'M' });
  }
  const size = qr.modules.size;
  const margin = 1;
  const totalSize = size + margin * 2;
  
  let pathD = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (qr.modules.get(r, c)) {
        let width = 1;
        while (c + 1 < size && qr.modules.get(r, c + 1)) {
          width++;
          c++;
        }
        pathD += `M${(c - width + 1) + margin} ${r + margin + 0.5}h${width}`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges"><path fill="#ffffff" d="M0 0h${totalSize}v${totalSize}H0z"/><path stroke="#000000" stroke-width="1" d="${pathD}"/></svg>`;
}

export function getAuthenticCbeQrSvgDataUri(txId: string): string {
  const svg = getAuthenticCbeQrSvg(txId);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getAuthenticCbeQrMatrix(txId: string): boolean[][] {
  const normalizedId = formatTo12CharTxId(txId);
  const payload = `https://apps.cbe.com.et/v/${normalizedId}`;
  let qr;
  try {
    qr = QRCode.create(payload, { version: 3, errorCorrectionLevel: 'M' });
  } catch {
    qr = QRCode.create(payload, { errorCorrectionLevel: 'M' });
  }
  const size = qr.modules.size;
  const matrix: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      row.push(Boolean(qr.modules.get(r, c)));
    }
    matrix.push(row);
  }
  return matrix;
}

export async function getAuthenticCbeQrPngDataUrl(txId: string, width: number = 450): Promise<string> {
  const normalizedId = formatTo12CharTxId(txId);
  const payload = `https://apps.cbe.com.et/v/${normalizedId}`;
  try {
    return await QRCode.toDataURL(payload, {
      width,
      margin: 1,
      version: 3,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' }
    });
  } catch {
    return await QRCode.toDataURL(payload, {
      width,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' }
    });
  }
}

// Official CBE Purple Brand Logo with crisp white CBE Symbol
export const OFFICIAL_CBE_PURPLE_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <!-- Outer Purple Base Disc -->
  <circle cx="80" cy="80" r="76" fill="#5E1887" />
  <circle cx="80" cy="80" r="71" stroke="#FFFFFF" stroke-width="2.5" opacity="0.9" />
  <!-- Radiating Decorative Crest Rays -->
  <g stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.35">
    <path d="M72 26 C48 26, 22 40, 18 64 C14 88, 34 110, 64 114 C94 118, 124 102, 128 76 C132 50, 108 34, 82 34" />
    <path d="M68 20 C40 21, 16 37, 12 63 C8 89, 30 114, 62 118 C94 122, 128 106, 134 76" />
    <path d="M76 30 C54 30, 32 44, 28 66 C24 88, 42 108, 68 111 C94 114, 118 100, 122 78" />
  </g>
  <!-- Central CBE Symbol in Pure White -->
  <g fill="#FFFFFF" transform="translate(42, 36) scale(0.95)">
    <!-- Outer Vault Arch Enclosure -->
    <path d="M40 4 C20 4, 4 20, 4 40 C4 60, 20 76, 40 76 C60 76, 76 60, 76 40 C76 20, 60 4, 40 4 Z M40 11 C56 11, 69 24, 69 40 C69 56, 56 69, 40 69 C24 69, 11 56, 11 40 C11 24, 24 11, 40 11 Z" />
    <!-- Monument Pillar -->
    <rect x="35" y="19" width="10" height="38" rx="2.5" />
    <!-- Crown Arch / Upper Wing -->
    <path d="M22 31 Q40 18 58 31 L58 37 Q40 24 22 37 Z" />
    <!-- Center Medallion Inner Accent -->
    <circle cx="40" cy="28" r="4.5" fill="#5E1887" />
    <circle cx="40" cy="28" r="2.2" fill="#FFFFFF" />
    <!-- Base Pedestal -->
    <rect x="22" y="54" width="36" height="5.5" rx="1.5" />
  </g>
  <!-- Official Commercial Bank of Ethiopia Text Arc / Label -->
  <text x="80" y="145" fill="#FFFFFF" font-size="7.2" font-weight="900" text-anchor="middle" letter-spacing="1.2px" font-family="system-ui, sans-serif">COMMERCIAL BANK OF ETHIOPIA</text>
</svg>
`)}`;

export const REGISTERED_ACCOUNTS_SEED: UserProfile[] = [
  {
    id: 'user_1',
    name: 'Leykun Jemaneh Ylma',
    phone: '+251900112233',
    email: 'leykunjemaneh3@gmail.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-01-10T10:30:00Z',
    accountNumber: '1000419524747',
    balance: 18450.50,
    availableBalance: 18450.50,
    biometricEnabled: true
  },
  {
    id: 'user_leul_degsew',
    name: 'Leul Degsew Alemayehu',
    phone: '+251911638276',
    email: 'leul.degsew@gmail.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-01-15T09:00:00Z',
    accountNumber: '1000638276450',
    balance: 145280.50,
    availableBalance: 145280.50,
    biometricEnabled: true
  },
  {
    id: 'user_global_market',
    name: 'Global Online Market',
    phone: '+251911684396',
    email: 'globalonlinemarket@cbe.com.et',
    role: 'admin',
    status: 'active',
    createdAt: '2026-01-01T08:00:00Z',
    accountNumber: '1000684396671',
    balance: 2500000.00,
    availableBalance: 2500000.00,
    biometricEnabled: true
  },
  {
    id: 'user_elisabeth_hune',
    name: 'Elisabeth Hune Mamo',
    phone: '+251912714565',
    email: 'elisabeth.hune@gmail.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-01-20T10:15:00Z',
    accountNumber: '1000714565770',
    balance: 382500.00,
    availableBalance: 382500.00,
    biometricEnabled: true
  },
  {
    id: 'user_daniel_natnael',
    name: 'Daniel Natnael Gemechu',
    phone: '+251913842195',
    email: 'daniel.natnael@gmail.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-02-01T11:30:00Z',
    accountNumber: '1000842195466',
    balance: 219750.75,
    availableBalance: 219750.75,
    biometricEnabled: true
  },
  {
    id: 'user_bilen_solomon',
    name: 'Bilen Solomon Worku',
    phone: '+251914526382',
    email: 'bilen.solomon@gmail.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-02-12T14:45:00Z',
    accountNumber: '1000526382575',
    balance: 560400.00,
    availableBalance: 560400.00,
    biometricEnabled: true
  },
  {
    id: 'user_hunndeessaa_dajenee',
    name: 'Hunndeessaa Dajenee Tufaa',
    phone: '+251915963142',
    email: 'hunndeessaa.dajenee@gmail.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-02-25T16:20:00Z',
    accountNumber: '1000963142586',
    balance: 84320.00,
    availableBalance: 84320.00,
    biometricEnabled: true
  },
  {
    id: 'user_hlina_getaye',
    name: 'Hlina Getaye Getaneh',
    phone: '+251916437281',
    email: 'hlina.getaye@gmail.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-03-02T08:30:00Z',
    accountNumber: '1000437281195',
    balance: 473150.25,
    availableBalance: 473150.25,
    biometricEnabled: true
  },
  {
    id: 'user_amir_mohammed',
    name: 'Amir Mohammed Rafi',
    phone: '+251917756218',
    email: 'amir.mohammed@gmail.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-03-08T12:00:00Z',
    accountNumber: '1000756218334',
    balance: 628900.00,
    availableBalance: 628900.00,
    biometricEnabled: true
  },
  {
    id: 'user_2',
    name: 'Selamawit Tekle Haile',
    phone: '+251912345678',
    email: 'selam@example.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-03-15T14:20:00Z',
    accountNumber: '1000246810121',
    balance: 52450.00,
    availableBalance: 52450.00,
    biometricEnabled: false
  },
  {
    id: 'user_kasahun',
    name: 'Kasahun Yematawork Desta',
    phone: '+251911998877',
    email: 'kasahun@cbe.com.et',
    role: 'user',
    status: 'active',
    createdAt: '2026-01-10T10:00:00Z',
    accountNumber: '1000345678901',
    balance: 7200.00,
    availableBalance: 7200.00,
    biometricEnabled: true
  },
  {
    id: 'user_tesfahun',
    name: 'Tesfahun Abebe Girma',
    phone: '+251912233445',
    email: 'tesfahun@cbe.com.et',
    role: 'user',
    status: 'active',
    createdAt: '2026-01-12T11:00:00Z',
    accountNumber: '1000567890123',
    balance: 15300.00,
    availableBalance: 15300.00,
    biometricEnabled: true
  },
  {
    id: 'user_ashenafi',
    name: 'Ashenafi Alemu Mengistu',
    phone: '+251913344556',
    email: 'ashenafi@cbe.com.et',
    role: 'user',
    status: 'active',
    createdAt: '2026-01-14T12:00:00Z',
    accountNumber: '1000789012345',
    balance: 22150.00,
    availableBalance: 22150.00,
    biometricEnabled: true
  }
];

let _cachedUsers: UserProfile[] | null = null;

export class LocalDb {
  static getUsers(): UserProfile[] {
    if (_cachedUsers && _cachedUsers.length > 0) {
      return _cachedUsers;
    }
    let users = loadData<UserProfile[]>('tana_users', INITIAL_USERS);
    let modified = false;

    // Ensure Leykun Jemaneh Ylma has primary account 1000419524747 and restore original balance
    const u1 = users.find(u => u.id === 'user_1');
    if (u1) {
      if (u1.accountNumber !== '1000419524747' || u1.name !== 'Leykun Jemaneh Ylma') {
        u1.accountNumber = '1000419524747';
        u1.name = 'Leykun Jemaneh Ylma';
        u1.email = 'leykunjemaneh3@gmail.com';
        modified = true;
      }
      if (u1.balance === undefined || u1.balance === null || isNaN(u1.balance) || u1.balance >= 1000000000) {
        u1.balance = 18450.50;
        u1.availableBalance = 18450.50;
        modified = true;
      }
    }
    
    // Ensure leykunjemaneh3@gmail.com is guaranteed admin access with original balance
    const adminIndex = users.findIndex(u => u.email.toLowerCase() === 'leykunjemaneh3@gmail.com');
    if (adminIndex !== -1) {
      if (users[adminIndex].role !== 'admin' || users[adminIndex].accountNumber !== '1000419524747') {
        users[adminIndex].role = 'admin';
        users[adminIndex].status = 'active';
        users[adminIndex].accountNumber = '1000419524747';
        modified = true;
      }
      if (users[adminIndex].balance === undefined || users[adminIndex].balance === null || isNaN(users[adminIndex].balance) || users[adminIndex].balance >= 1000000000) {
        users[adminIndex].balance = 18450.50;
        users[adminIndex].availableBalance = 18450.50;
        modified = true;
      }
    } else {
      // Add Leykun Jemaneh as admin if not present
      const adminUser: UserProfile = {
        id: 'user_admin',
        name: 'Leykun Jemaneh Ylma (Admin)',
        phone: '+251900112233',
        email: 'leykunjemaneh3@gmail.com',
        role: 'admin',
        status: 'active',
        createdAt: '2026-01-01T08:00:00Z',
        accountNumber: '1000419524747',
        accountType: 'wadiah',
        balance: 18450.50,
        availableBalance: 18450.50,
        biometricEnabled: true
      };
      users.push(adminUser);
      modified = true;
    }

    // Ensure all requested accounts exist in users list
    for (const seed of REGISTERED_ACCOUNTS_SEED) {
      const idx = users.findIndex(u => 
        u.accountNumber === seed.accountNumber || 
        u.id === seed.id || 
        u.name.toLowerCase() === seed.name.toLowerCase()
      );
      if (idx !== -1) {
        let changed = false;
        if (users[idx].balance === undefined || users[idx].balance === null || isNaN(users[idx].balance)) {
          users[idx].balance = seed.balance;
          users[idx].availableBalance = seed.availableBalance;
          changed = true;
        }
        if (users[idx].accountNumber !== seed.accountNumber) {
          users[idx].accountNumber = seed.accountNumber;
          changed = true;
        }
        if (changed) modified = true;
      } else {
        users.push({ ...seed });
        modified = true;
      }
    }

    // Ensure all 124 additional registered accounts exist in users list
    for (const seed of ADDITIONAL_USERS_SEED) {
      const idx = users.findIndex(u => u.id === seed.id || (u.accountNumber === seed.accountNumber && u.name.toLowerCase() === seed.name.toLowerCase()));
      if (idx !== -1) {
        let changed = false;
        if (users[idx].balance === undefined || users[idx].balance === null || isNaN(users[idx].balance)) {
          users[idx].balance = seed.balance;
          users[idx].availableBalance = seed.availableBalance;
          changed = true;
        }
        if (users[idx].accountNumber !== seed.accountNumber) {
          users[idx].accountNumber = seed.accountNumber;
          changed = true;
        }
        if (changed) modified = true;
      } else {
        users.push({ ...seed });
        modified = true;
      }
    }

    // Ensure all 377 bulk registered accounts exist in users list
    for (const seed of BULK_USERS_SEED) {
      const idx = users.findIndex(u => u.id === seed.id || (u.accountNumber === seed.accountNumber && u.name.toLowerCase() === seed.name.toLowerCase()));
      if (idx !== -1) {
        let changed = false;
        if (users[idx].balance === undefined || users[idx].balance === null || isNaN(users[idx].balance)) {
          users[idx].balance = seed.balance;
          users[idx].availableBalance = seed.availableBalance;
          changed = true;
        }
        if (users[idx].accountNumber !== seed.accountNumber) {
          users[idx].accountNumber = seed.accountNumber;
          changed = true;
        }
        if (changed) modified = true;
      } else {
        users.push({ ...seed });
        modified = true;
      }
    }

    // Ensure any custom registered directory accounts exist as user profiles
    try {
      const customAccounts = loadData<RegisteredAccountInfo[]>('tana_custom_directory_accounts', []);
      for (const cust of customAccounts) {
        const cleanNum = (cust.accountNumber || '').replace(/\D/g, '');
        if (cleanNum) {
          const exists = users.some(u => (u.accountNumber || '').replace(/\D/g, '') === cleanNum);
          if (!exists) {
            users.push({
              id: cust.userId || 'user_' + cleanNum,
              name: cust.accountName,
              accountNumber: cleanNum,
              phone: cust.phone || '+251911000000',
              email: `${cust.accountName.toLowerCase().replace(/\s+/g, '')}@cbe.et`,
              balance: cust.balance ?? 25000,
              availableBalance: cust.balance ?? 25000,
              currency: 'ETB',
              role: 'user',
              status: 'active',
              createdAt: new Date().toISOString()
            });
            modified = true;
          }
        }
      }
    } catch {}

    if (modified) {
      saveData('tana_users', users);
    }
    _cachedUsers = users;
    return users;
  }

  static setUsers(users: UserProfile[]): void {
    _cachedUsers = users;
    saveData('tana_users', users);
  }

  static getTransactions(): Transaction[] {
    const v2Key = 'tana_tx_v4_applied';
    let txs: Transaction[];
    if (!localStorage.getItem(v2Key)) {
      txs = INITIAL_TRANSACTIONS;
      saveData('tana_transactions', txs);
      localStorage.setItem(v2Key, 'true');
    } else {
      txs = loadData<Transaction[]>('tana_transactions', INITIAL_TRANSACTIONS);
    }
    return txs.map(t => {
        const standardId = formatTo12CharTxId(t.id || t.reference);
        return {
          ...t,
          id: standardId,
          reference: standardId
        };
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (isNaN(timeA) || isNaN(timeB)) {
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        }
        return timeB - timeA;
      });
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

  static getAllAccounts(): BankAccount[] {
    const accounts = loadData<BankAccount[]>('tana_accounts', INITIAL_ACCOUNTS);
    let modified = false;

    // Ensure account 1000419524747 exists, is primary, and has sufficient funds
    const acc4747 = accounts.find(a => a.accountNumber === '1000419524747');
    if (!acc4747) {
      accounts.unshift({
        id: 'acc_leykun_4747',
        userId: 'user_1',
        accountName: 'Leykun CBE Account',
        accountNumber: '1000419524747',
        accountType: 'savings',
        balance: 18450.50,
        availableBalance: 18450.50,
        status: 'active',
        currency: 'ETB',
        isPrimary: true,
        createdAt: '2026-01-01T08:00:00Z'
      });
      modified = true;
    } else {
      if (acc4747.balance === undefined || acc4747.balance === null || isNaN(acc4747.balance) || acc4747.balance >= 1000000000) {
        acc4747.balance = 18450.50;
        acc4747.availableBalance = 18450.50;
        modified = true;
      }
      if (!acc4747.isPrimary) {
        acc4747.isPrimary = true;
        modified = true;
      }
    }

    // Ensure all requested accounts exist in BankAccount registry
    for (const seed of REGISTERED_ACCOUNTS_SEED) {
      const existingAcc = accounts.find(a => a.accountNumber === seed.accountNumber);
      if (!existingAcc) {
        accounts.push({
          id: 'acc_' + seed.id,
          userId: seed.id,
          accountName: seed.name + (seed.id === 'user_global_market' ? ' Enterprise Account' : ' Savings Account'),
          accountNumber: seed.accountNumber,
          accountType: 'savings',
          balance: seed.balance,
          availableBalance: seed.availableBalance ?? seed.balance,
          status: 'active',
          currency: 'ETB',
          isPrimary: seed.accountNumber === '1000419524747',
          createdAt: seed.createdAt
        });
        modified = true;
      } else {
        if (existingAcc.balance === undefined || existingAcc.balance === null || isNaN(existingAcc.balance)) {
          existingAcc.balance = seed.balance;
          existingAcc.availableBalance = seed.availableBalance ?? seed.balance;
          modified = true;
        }
      }
    }

    // Ensure all unique additional accounts exist in BankAccount registry
    for (const seed of ADDITIONAL_BANK_ACCOUNTS) {
      const existingAcc = accounts.find(a => a.accountNumber === seed.accountNumber);
      if (!existingAcc) {
        accounts.push({ ...seed });
        modified = true;
      } else {
        if (existingAcc.balance === undefined || existingAcc.balance === null || isNaN(existingAcc.balance)) {
          existingAcc.balance = seed.balance;
          existingAcc.availableBalance = seed.availableBalance;
          modified = true;
        }
      }
    }

    // Ensure all unique bulk registered accounts exist in BankAccount registry
    for (const seed of BULK_BANK_ACCOUNTS) {
      const existingAcc = accounts.find(a => a.accountNumber === seed.accountNumber);
      if (!existingAcc) {
        accounts.push({ ...seed });
        modified = true;
      } else {
        if (existingAcc.balance === undefined || existingAcc.balance === null || isNaN(existingAcc.balance)) {
          existingAcc.balance = seed.balance;
          existingAcc.availableBalance = seed.availableBalance;
          modified = true;
        }
      }
    }

    if (modified) {
      saveData('tana_accounts', accounts);
    }
    return accounts;
  }

  static setAccounts(accounts: BankAccount[]): void {
    saveData('tana_accounts', accounts);
    window.dispatchEvent(new CustomEvent('cbe_accounts_updated', { detail: { accounts } }));
  }

  static getUserAccounts(userId: string): BankAccount[] {
    let accounts = this.getAllAccounts().filter(a => a.userId === userId);
    if (accounts.length === 0) {
      // Find user to seed initial account
      const user = this.getUsers().find(u => u.id === userId);
      const initialAcc: BankAccount = {
        id: 'acc_' + generateId(),
        userId,
        accountName: 'Primary Saving Account',
        accountNumber: user?.accountNumber || '1000' + Math.floor(100000000 + Math.random() * 900000000),
        accountType: (user?.accountType as BankAccountType) || 'savings',
        balance: user?.balance || 25000.00,
        availableBalance: user?.balance || 25000.00,
        status: 'active',
        currency: 'ETB',
        isPrimary: true,
        createdAt: new Date().toISOString()
      };
      
      const allAccs = this.getAllAccounts();
      allAccs.push(initialAcc);
      this.setAccounts(allAccs);
      accounts = [initialAcc];
    }
    return accounts;
  }

  static createAccount(
    userId: string,
    data: {
      accountName: string;
      accountType: BankAccountType;
      initialBalance?: number;
      customAccountNumber?: string;
      isPrimary?: boolean;
    }
  ): BankAccount {
    const allAccs = this.getAllAccounts();
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);

    // Generate guaranteed 13-digit CBE account starting with 1000
    let cleanAccNum = (data.customAccountNumber || '').replace(/\D/g, '');
    if (cleanAccNum.length !== 13) {
      const rand9 = Math.floor(100000000 + Math.random() * 900000000).toString();
      cleanAccNum = `1000${rand9}`;
    }

    const initBal = Math.max(0, Number(data.initialBalance || 0));
    
    // If setting as primary, demote other accounts of this user
    if (data.isPrimary) {
      allAccs.forEach(a => {
        if (a.userId === userId) a.isPrimary = false;
      });
    }

    const newAcc: BankAccount = {
      id: 'acc_' + generateId(),
      userId,
      accountName: data.accountName.trim() || 'CBE Account',
      accountNumber: cleanAccNum,
      accountType: data.accountType || 'savings',
      balance: initBal,
      availableBalance: initBal,
      status: 'active',
      currency: 'ETB',
      isPrimary: data.isPrimary || (allAccs.filter(a => a.userId === userId).length === 0),
      createdAt: new Date().toISOString()
    };

    allAccs.push(newAcc);
    this.setAccounts(allAccs);

    this.addAuditLog(
      userId,
      user?.email || 'user@example.com',
      'ACCOUNT_CREATED',
      `Created new ${newAcc.accountType} account "${newAcc.accountName}" (A/C: ${newAcc.accountNumber}) with initial deposit ETB ${initBal.toLocaleString()}.`
    );

    this.addNotification(
      userId,
      'New Account Created',
      `Your new ${newAcc.accountName} (${newAcc.accountNumber}) is active with ETB ${initBal.toLocaleString()}.`,
      'success'
    );

    return newAcc;
  }

  static updateAccount(accountId: string, updates: Partial<BankAccount>): BankAccount | null {
    const allAccs = this.getAllAccounts();
    const idx = allAccs.findIndex(a => a.id === accountId);
    if (idx === -1) return null;

    const updated = { ...allAccs[idx], ...updates };
    allAccs[idx] = updated;
    this.setAccounts(allAccs);
    return updated;
  }

  static deleteAccount(accountId: string): boolean {
    const allAccs = this.getAllAccounts();
    const acc = allAccs.find(a => a.id === accountId);
    if (!acc || acc.isPrimary) return false; // cannot delete primary account

    const filtered = allAccs.filter(a => a.id !== accountId);
    this.setAccounts(filtered);
    return true;
  }

  static transferBetweenOwnAccounts(
    userId: string,
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    remark?: string
  ): { tx: Transaction; fromAccount: BankAccount; toAccount: BankAccount } {
    if (fromAccountId === toAccountId) {
      throw new Error('Source and destination accounts must be different.');
    }
    if (amount <= 0) {
      throw new Error('Transfer amount must be greater than zero.');
    }

    const allAccs = this.getAllAccounts();
    const fromIdx = allAccs.findIndex(a => a.id === fromAccountId && a.userId === userId);
    const toIdx = allAccs.findIndex(a => a.id === toAccountId && a.userId === userId);

    if (fromIdx === -1) throw new Error('Source account not found.');
    if (toIdx === -1) throw new Error('Destination account not found.');

    const fromAcc = allAccs[fromIdx];
    const toAcc = allAccs[toIdx];

    if (fromAcc.balance < amount) {
      throw new Error(`Insufficient funds in ${fromAcc.accountName}. Available: ETB ${fromAcc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`);
    }

    // Process internal own-account transfer (Zero CBE Tariff fee for own account)
    fromAcc.balance = Number((fromAcc.balance - amount).toFixed(2));
    fromAcc.availableBalance = fromAcc.balance;

    toAcc.balance = Number((toAcc.balance + amount).toFixed(2));
    toAcc.availableBalance = toAcc.balance;

    allAccs[fromIdx] = fromAcc;
    allAccs[toIdx] = toAcc;
    this.setAccounts(allAccs);

    // Sync primary user balance if either account is primary
    const users = this.getUsers();
    const uIdx = users.findIndex(u => u.id === userId);
    if (uIdx !== -1) {
      const user = users[uIdx];
      if (fromAcc.isPrimary) {
        user.balance = fromAcc.balance;
        user.availableBalance = fromAcc.balance;
      } else if (toAcc.isPrimary) {
        user.balance = toAcc.balance;
        user.availableBalance = toAcc.balance;
      }
      users[uIdx] = user;
      this.setUsers(users);
      firebaseService.syncUserProfile(user).catch(() => {});
    }

    // Create transaction record
    const cbeTxId = generateCbeTxId();
    const txs = this.getTransactions();
    const tx: Transaction = {
      id: cbeTxId,
      type: 'transfer',
      senderId: userId,
      senderName: `${fromAcc.accountName} (${fromAcc.accountNumber.slice(-4)})`,
      senderAccount: fromAcc.accountNumber,
      recipientId: userId,
      recipientName: `${toAcc.accountName} (${toAcc.accountNumber.slice(-4)})`,
      recipientAccount: toAcc.accountNumber,
      recipientBank: 'Commercial Bank of Ethiopia',
      amount,
      fee: 0,
      serviceCharge: 0,
      vat: 0,
      disasterRecovery: 0,
      totalDebited: amount,
      description: remark?.trim() || `Internal transfer: ${fromAcc.accountName} ➔ ${toAcc.accountName}`,
      status: 'success',
      reference: cbeTxId,
      createdAt: new Date().toISOString()
    };

    txs.unshift(tx);
    this.setTransactions(txs);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cbe_balance_updated', {
        detail: {
          userId,
          newBalance: users[uIdx]?.balance,
          transaction: tx,
          user: users[uIdx]
        }
      }));
      window.dispatchEvent(new CustomEvent('cbe_transaction_completed', {
        detail: {
          transaction: tx,
          balance: users[uIdx]?.balance,
          user: users[uIdx]
        }
      }));
    }

    this.addNotification(
      userId,
      'Internal Transfer Completed',
      `Transferred ETB ${amount.toLocaleString()} from ${fromAcc.accountName} to ${toAcc.accountName}. (Ref: ${tx.id})`,
      'success'
    );

    this.addAuditLog(
      userId,
      users[uIdx]?.email || 'user@example.com',
      'OWN_ACCOUNT_TRANSFER',
      `Transferred ETB ${amount} between own accounts (${fromAcc.accountNumber} -> ${toAcc.accountNumber}). Ref: ${cbeTxId}.`
    );

    firebaseService.syncTransaction(tx).catch(() => {});

    // Automatically generate simulated SMS for successful internal transfer
    try {
      SmsService.createSmsFromTransaction(tx, fromAcc.balance, fromAcc.id, toAcc.balance);
    } catch (smsErr) {
      console.error('[SmsService] Non-blocking own account transfer SMS error:', smsErr);
    }

    // Automatically sync to Truecaller SMS simulator
    try {
      TruecallerService.syncTransactionToTruecaller(tx, fromAcc.balance);
    } catch (tcErr) {
      console.error('[TruecallerService] Non-blocking own account transfer Truecaller alert error:', tcErr);
    }

    // Automatically create/sync account in Phone Call & USSD application
    try {
      PhoneCallService.syncTransactionToCallerApp(tx);
    } catch (callErr) {
      console.error('[PhoneCallService] Non-blocking caller account sync error:', callErr);
    }

    return { tx, fromAccount: fromAcc, toAccount: toAcc };
  }

  // Universal Registered Accounts Directory & Smart Search
  static getAllRegisteredAccounts(): RegisteredAccountInfo[] {
    const list: RegisteredAccountInfo[] = [...VERIFIED_DIRECTORY_ACCOUNTS];
    const seenAccs = new Set<string>(list.map(a => a.accountNumber));

    // Add custom/external registered directory accounts
    const customList = loadData<RegisteredAccountInfo[]>('tana_custom_directory_accounts', []);
    customList.forEach(c => {
      if (c.accountNumber && !seenAccs.has(c.accountNumber)) {
        list.push(c);
        seenAccs.add(c.accountNumber);
      }
    });

    // Add all registered users
    const users = this.getUsers();
    users.forEach(u => {
      if (u.accountNumber && !seenAccs.has(u.accountNumber)) {
        list.push({
          accountNumber: u.accountNumber,
          accountName: u.name,
          bankName: 'Commercial Bank of Ethiopia',
          userId: u.id,
          phone: u.phone,
          isVerified: true,
          accountType: u.accountType === 'wadiah' ? 'Wadiah Interest-Free' : 'Saving Account',
          balance: u.balance
        });
        seenAccs.add(u.accountNumber);
      }
    });

    // Add all user bank accounts
    const allAccs = this.getAllAccounts();
    allAccs.forEach(a => {
      if (a.accountNumber && !seenAccs.has(a.accountNumber)) {
        const owner = users.find(u => u.id === a.userId);
        list.push({
          accountNumber: a.accountNumber,
          accountName: owner ? `${owner.name} (${a.accountName})` : a.accountName,
          bankName: 'Commercial Bank of Ethiopia',
          userId: a.userId,
          phone: owner?.phone,
          isVerified: true,
          accountType: a.accountType === 'wadiah' ? 'Wadiah Interest-Free' : a.accountType === 'cbe_birr' ? 'CBE Birr Wallet' : 'Saving Account',
          balance: a.balance
        });
        seenAccs.add(a.accountNumber);
      }
    });

    // Attach latest live balances to all accounts in list
    const accMap = new Map(allAccs.map(a => [a.accountNumber, a]));
    const userMap = new Map(users.map(u => [u.accountNumber, u]));

    list.forEach(item => {
      if (TOP_10_BILLION_ACCOUNT_NUMBERS.includes(item.accountNumber)) {
        const liveAcc = accMap.get(item.accountNumber);
        const liveUser = userMap.get(item.accountNumber);
        item.balance = liveAcc ? liveAcc.balance : (liveUser ? liveUser.balance : 18450.50);
      } else if (item.balance === undefined) {
        if (accMap.has(item.accountNumber)) {
          item.balance = accMap.get(item.accountNumber)!.balance;
        } else if (userMap.has(item.accountNumber)) {
          item.balance = userMap.get(item.accountNumber)!.balance;
        } else {
          item.balance = 25000.00;
        }
      }
    });

    return list;
  }

  static searchRegisteredAccounts(queryStr: string): RegisteredAccountInfo[] {
    if (!queryStr || !queryStr.trim()) {
      return this.getAllRegisteredAccounts().slice(0, 8);
    }
    const term = queryStr.trim().toLowerCase();
    const cleanDigits = queryStr.replace(/\D/g, '');
    const all = this.getAllRegisteredAccounts();

    return all.filter(item => {
      const matchName = item.accountName.toLowerCase().includes(term);
      const matchAcc = cleanDigits.length > 0 && item.accountNumber.includes(cleanDigits);
      const matchPhone = item.phone && cleanDigits.length > 3 && item.phone.includes(cleanDigits);
      return matchName || matchAcc || matchPhone;
    });
  }

  static findRegisteredAccount(queryStr: string): RegisteredAccountInfo | null {
    if (!queryStr || !queryStr.trim()) return null;
    const cleanDigits = queryStr.replace(/\D/g, '');
    const all = this.getAllRegisteredAccounts();

    // Exact account number match
    if (cleanDigits.length >= 10) {
      const byAcc = all.find(a => a.accountNumber === cleanDigits || a.accountNumber.endsWith(cleanDigits));
      if (byAcc) return byAcc;
    }

    // Exact or close name match
    const term = queryStr.trim().toLowerCase();
    const byName = all.find(a => a.accountName.toLowerCase() === term || a.accountName.toLowerCase().startsWith(term));
    if (byName) return byName;

    return null;
  }

  static registerNewAccount(account: RegisteredAccountInfo): void {
    const list = loadData<RegisteredAccountInfo[]>('tana_custom_directory_accounts', []);
    const existingIndex = list.findIndex(a => a.accountNumber === account.accountNumber);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...account };
    } else {
      list.unshift(account);
    }
    saveData('tana_custom_directory_accounts', list);
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
    firebaseService.syncAuditLog(newLog).catch(() => {});
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
    isOwnAccount: boolean = false,
    fromAccountId?: string
  ): Transaction {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) throw new Error('User not found');
    const user = users[userIndex];

    const allAccs = this.getAllAccounts();
    const userAccs = allAccs.filter(a => a.userId === userId);
    let fromAcc = fromAccountId ? allAccs.find(a => a.id === fromAccountId && a.userId === userId) : (userAccs.find(a => a.isPrimary) || userAccs[0]);

    // Compute standard CBE Tariff, 15% VAT, and 5% Disaster Recovery
    const cbeFees = calculateCbeFee(amount, type, isOwnAccount);
    const serviceCharge = fee > 0 ? fee : cbeFees.serviceCharge;
    const vat = Number((serviceCharge * 0.15).toFixed(2));
    const disasterRecovery = Number((serviceCharge * 0.05).toFixed(2));
    const totalAdditionalFees = Number((serviceCharge + vat + disasterRecovery).toFixed(2));
    const totalCost = Number((amount + totalAdditionalFees).toFixed(2));

    const currentBal = fromAcc ? fromAcc.balance : user.balance;
    if (currentBal < totalCost && type !== 'receive') {
      throw new Error(`Insufficient balance in ${fromAcc?.accountName || 'account'}. Transaction requires ETB ${totalCost.toLocaleString()} including CBE Service Charge (ETB ${serviceCharge.toFixed(2)}), 15% VAT (ETB ${vat.toFixed(2)}), and 5% Disaster Recovery (ETB ${disasterRecovery.toFixed(2)}).`);
    }

    // Deduct/Credit sender balance
    if (type !== 'receive') {
      if (fromAcc) {
        fromAcc.balance = Number((fromAcc.balance - totalCost).toFixed(2));
        fromAcc.availableBalance = fromAcc.balance;
        const accIdx = allAccs.findIndex(a => a.id === fromAcc!.id);
        if (accIdx !== -1) allAccs[accIdx] = fromAcc;
        this.setAccounts(allAccs);
        
        // Ensure user balance is always updated to reflect deduction
        if (fromAcc.isPrimary || fromAcc.accountNumber === user.accountNumber || !userAccs.some(a => a.isPrimary)) {
          user.balance = fromAcc.balance;
          user.availableBalance = fromAcc.balance;
        } else {
          user.balance = Number((user.balance - totalCost).toFixed(2));
          user.availableBalance = user.balance;
        }
      } else {
        user.balance = Number((user.balance - totalCost).toFixed(2));
        user.availableBalance = user.balance;
      }
    } else {
      if (fromAcc) {
        fromAcc.balance = Number((fromAcc.balance + amount).toFixed(2));
        fromAcc.availableBalance = fromAcc.balance;
        const accIdx = allAccs.findIndex(a => a.id === fromAcc!.id);
        if (accIdx !== -1) allAccs[accIdx] = fromAcc;
        this.setAccounts(allAccs);
        
        if (fromAcc.isPrimary || fromAcc.accountNumber === user.accountNumber || !userAccs.some(a => a.isPrimary)) {
          user.balance = fromAcc.balance;
          user.availableBalance = fromAcc.balance;
        } else {
          user.balance = Number((user.balance + amount).toFixed(2));
          user.availableBalance = user.balance;
        }
      } else {
        user.balance = Number((user.balance + amount).toFixed(2));
        user.availableBalance = user.balance;
      }
    }

    users[userIndex] = user;
    this.setUsers(users);

    // If recipient is a registered account in our system, credit them in real-time
    const cleanRecipAcc = (recipientAccount || '').replace(/\D/g, '');
    let matchedRecipAcc = allAccs.find(a => a.accountNumber.replace(/\D/g, '') === cleanRecipAcc);
    let matchedRecipUser = users.find(u => (u.accountNumber && u.accountNumber.replace(/\D/g, '') === cleanRecipAcc) || (matchedRecipAcc && u.id === matchedRecipAcc.userId));
    let recipientFinalBal: number | undefined = undefined;

    if (type !== 'receive' && cleanRecipAcc) {
      // 1. Credit matching account in allAccs if present
      if (matchedRecipAcc) {
        matchedRecipAcc.balance = Number((matchedRecipAcc.balance + amount).toFixed(2));
        matchedRecipAcc.availableBalance = matchedRecipAcc.balance;
        const recAccIdx = allAccs.findIndex(a => a.id === matchedRecipAcc!.id);
        if (recAccIdx !== -1) allAccs[recAccIdx] = matchedRecipAcc;
        this.setAccounts(allAccs);
        recipientFinalBal = matchedRecipAcc.balance;
      }

      // 2. Credit matching user profile in users
      if (matchedRecipUser) {
        matchedRecipUser.balance = Number((matchedRecipUser.balance + amount).toFixed(2));
        matchedRecipUser.availableBalance = matchedRecipUser.balance;
        const recUserIdx = users.findIndex(u => u.id === matchedRecipUser!.id);
        if (recUserIdx !== -1) {
          users[recUserIdx] = matchedRecipUser;
          this.setUsers(users);
        }
        recipientFinalBal = matchedRecipUser.balance;
        firebaseService.syncUserProfile(matchedRecipUser).catch(() => {});
        this.addNotification(
          matchedRecipUser.id,
          'Account Credited',
          `Received ETB ${amount.toLocaleString()} from ${user.name}. (A/C: ${cleanRecipAcc})`,
          'success'
        );
      }

      // 3. If in custom directory accounts, credit there too
      try {
        const customList = loadData<RegisteredAccountInfo[]>('tana_custom_directory_accounts', []);
        const cIdx = customList.findIndex(c => c.accountNumber && c.accountNumber.replace(/\D/g, '') === cleanRecipAcc);
        if (cIdx !== -1) {
          customList[cIdx].balance = Number(((customList[cIdx].balance ?? 25000) + amount).toFixed(2));
          saveData('tana_custom_directory_accounts', customList);
          if (recipientFinalBal === undefined) {
            recipientFinalBal = customList[cIdx].balance;
          }
        }
      } catch {}

      // 4. Directly update and sync recipient balance in SmsService and TruecallerService
      if (recipientFinalBal !== undefined) {
        try {
          SmsService.syncBalance(cleanRecipAcc, recipientFinalBal);
          TruecallerService.syncBalance(cleanRecipAcc, recipientFinalBal);
        } catch {}
      }
    }

    // Realistic CBE Transaction ID format: 12 characters exactly (e.g. FT263211VK07)
    const cbeTxId = generateCbeTxId();

    // Create the transaction
    const txs = this.getTransactions();
    const newTx: Transaction = {
      id: cbeTxId,
      type,
      senderId: type !== 'receive' ? userId : undefined,
      senderName: type !== 'receive' ? user.name : recipientName,
      senderAccount: type !== 'receive' ? (fromAcc?.accountNumber || user.accountNumber) : recipientAccount,
      recipientId: type === 'receive' ? userId : (matchedRecipUser?.id || matchedRecipAcc?.userId),
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
      reference: cbeTxId,
      createdAt: new Date().toISOString()
    };

    txs.unshift(newTx);
    this.setTransactions(txs);

    const senderFinalBal = fromAcc ? fromAcc.balance : user.balance;
    const senderCleanAcc = (fromAcc?.accountNumber || user.accountNumber).replace(/\D/g, '');

    // Synchronize sender live balance in SmsService & TruecallerService
    try {
      SmsService.syncBalance(senderCleanAcc, senderFinalBal);
      TruecallerService.syncBalance(senderCleanAcc, senderFinalBal);
    } catch {}

    // Broadcast instant balance update event to all UI cards and listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cbe_balance_updated', {
        detail: {
          userId: user.id,
          accountNumber: user.accountNumber,
          newBalance: user.balance,
          transaction: newTx,
          user
        }
      }));
      window.dispatchEvent(new CustomEvent('cbe_transaction_completed', {
        detail: {
          transaction: newTx,
          balance: user.balance,
          user
        }
      }));
    }

    // Add notification
    const directionWord = type === 'receive' ? 'credited' : 'debited';
    const bodyText = `Your account has been ${directionWord} with ETB ${amount.toLocaleString()}. Total debited: ETB ${totalCost.toLocaleString()} (Ref: ${newTx.id})`;
    this.addNotification(userId, `Transaction Alert`, bodyText, type === 'receive' ? 'success' : 'info');

    // Add audit log
    this.addAuditLog(userId, user.email, `TX_CREATE_${type.toUpperCase()}`, `Processed transaction of ETB ${amount} to ${recipientName} (ID: ${cbeTxId}). Total debited with CBE Tariff/VAT: ETB ${totalCost}.`);

    // Sync transaction and updated user balance to Firebase Firestore
    firebaseService.syncTransaction(newTx).catch(() => {});
    firebaseService.syncUserProfile(user).catch(() => {});

    // Automatically generate simulated SMS for successful banking transaction
    try {
      SmsService.createSmsFromTransaction(newTx, senderFinalBal, fromAcc?.id, recipientFinalBal ?? matchedRecipAcc?.balance);
    } catch (smsErr) {
      console.error('[SmsService] Failed to auto-generate transaction SMS:', smsErr);
    }

    // Automatically create/update account and alert in Truecaller SMS simulator
    try {
      TruecallerService.syncTransactionToTruecaller(newTx, senderFinalBal, recipientFinalBal ?? matchedRecipAcc?.balance);
    } catch (tcErr) {
      console.error('[TruecallerService] Failed to auto-generate Truecaller alert:', tcErr);
    }

    // Automatically create/update caller accounts in Phone Call & USSD application
    try {
      PhoneCallService.syncTransactionToCallerApp(newTx);
    } catch (callErr) {
      console.error('[PhoneCallService] Non-blocking caller account sync error:', callErr);
    }

    // Automatically credit & register inside Dashen Bank if recipient is Dashen or account 550...
    try {
      const isDashen = (newTx.recipientBank && newTx.recipientBank.toLowerCase().includes('dashen')) ||
                       (newTx.recipientAccount && newTx.recipientAccount.replace(/\D/g, '').startsWith('550')) ||
                       (newTx.recipientAccount && newTx.recipientAccount.replace(/\D/g, '') === '5502877108011');
      if (isDashen && type !== 'receive') {
        DashenBankService.receiveIncomingTransfer({
          amount: newTx.amount,
          senderName: newTx.senderName || user.name,
          senderAccount: newTx.senderAccount || user.accountNumber,
          senderBank: 'Commercial Bank of Ethiopia',
          reference: newTx.reference || newTx.id,
          description: newTx.description
        });
      }
    } catch (dashErr) {
      console.error('[DashenBankService] Non-blocking Dashen sync error:', dashErr);
    }

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

    // Synchronize primary BankAccount in all accounts list
    const accounts = this.getAllAccounts();
    const primaryAccIndex = accounts.findIndex(a => a.userId === userId && a.isPrimary) !== -1 
      ? accounts.findIndex(a => a.userId === userId && a.isPrimary)
      : accounts.findIndex(a => a.accountNumber === oldUser.accountNumber || a.userId === userId);
    
    if (primaryAccIndex !== -1) {
      if (updates.name) accounts[primaryAccIndex].accountName = `${updates.name} Savings Account`;
      if (updates.accountNumber) accounts[primaryAccIndex].accountNumber = updates.accountNumber;
      if (updates.balance !== undefined) {
        accounts[primaryAccIndex].balance = updates.balance;
        accounts[primaryAccIndex].availableBalance = updates.balance;
      }
      this.setAccounts(accounts);
    }

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
    firebaseService.syncUserProfile(updatedUser).catch(() => {});
    return updatedUser;
  }

  static getCustomBankLogo(): string | null {
    try {
      const val = localStorage.getItem('tana_custom_bank_logo');
      if (val && val.trim().length > 0) return val;
      const val2 = localStorage.getItem('cbe_custom_bank_logo');
      if (val2 && val2.trim().length > 0) return val2;
      const val3 = localStorage.getItem('custom_bank_logo');
      if (val3 && val3.trim().length > 0) return val3;
    } catch {
      // ignore
    }
    return '/custom-bank-logo.png';
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
    window.dispatchEvent(new CustomEvent('cbe_logo_updated', { detail: { logo: logo || '/custom-bank-logo.png' } }));
  }

  static getCustomPdfLogo(): string | null {
    try {
      const val = localStorage.getItem('cbe_custom_pdf_logo');
      if (val && val.trim().length > 0) return val;
    } catch {
      // ignore
    }
    return LocalDb.getCustomBankLogo() || '/custom-bank-logo.png';
  }

  static setCustomPdfLogo(logo: string | null): void {
    try {
      if (!logo || logo.trim().length === 0) {
        localStorage.removeItem('cbe_custom_pdf_logo');
      } else {
        localStorage.setItem('cbe_custom_pdf_logo', logo);
      }
    } catch (err) {
      console.warn('[LocalDb] Failed writing custom pdf logo to localStorage:', err);
    }
    window.dispatchEvent(new CustomEvent('cbe_pdf_logo_updated', { detail: { logo } }));
  }

  static getCustomBankStamp(): string | null {
    try {
      const val = localStorage.getItem('tana_custom_bank_stamp');
      return (val && val.trim().length > 0) ? val : null;
    } catch {
      return null;
    }
  }

  static setCustomBankStamp(stamp: string | null): void {
    try {
      if (!stamp || stamp.trim().length === 0) {
        localStorage.removeItem('tana_custom_bank_stamp');
      } else {
        localStorage.setItem('tana_custom_bank_stamp', stamp);
      }
    } catch (err) {
      console.warn('[LocalDb] Failed writing custom stamp to localStorage:', err);
    }
    
    // Broadcast across windows and local components
    window.dispatchEvent(new CustomEvent('cbe_stamp_updated', { detail: { stamp } }));
  }

  static getWebStampSize(): number {
    try {
      const val = localStorage.getItem('tana_web_bank_stamp_size') || localStorage.getItem('tana_bank_stamp_size');
      if (val) {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed >= 160 && parsed <= 500) {
          return parsed;
        }
      }
    } catch {}
    return 330; // Default size
  }

  static setWebStampSize(size: number): void {
    try {
      localStorage.setItem('tana_web_bank_stamp_size', String(size));
      localStorage.setItem('tana_bank_stamp_size', String(size));
    } catch (err) {
      console.warn('[LocalDb] Failed writing web stamp size to localStorage:', err);
    }
    window.dispatchEvent(new CustomEvent('cbe_web_stamp_size_updated', { detail: { size } }));
    window.dispatchEvent(new CustomEvent('cbe_stamp_size_updated', { detail: { size } }));
  }

  static getPdfStampSize(): number {
    try {
      const val = localStorage.getItem('tana_pdf_bank_stamp_size');
      if (val) {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed >= 160 && parsed <= 500) {
          return parsed;
        }
      }
    } catch {}
    return 330; // Default PDF size
  }

  static setPdfStampSize(size: number): void {
    try {
      localStorage.setItem('tana_pdf_bank_stamp_size', String(size));
    } catch (err) {
      console.warn('[LocalDb] Failed writing pdf stamp size to localStorage:', err);
    }
    window.dispatchEvent(new CustomEvent('cbe_pdf_stamp_size_updated', { detail: { size } }));
  }

  static getBankStampSize(): number {
    return this.getWebStampSize();
  }

  static setBankStampSize(size: number): void {
    this.setWebStampSize(size);
  }

  static getBankStampWidth(): number {
    return this.getWebStampSize();
  }

  static setBankStampWidth(width: number): void {
    this.setWebStampSize(width);
  }

  static getCustomQrCode(): string | null {
    try {
      const val = localStorage.getItem('tana_custom_qr_code');
      // The preset template represents the dynamic CBE reference; ignore static preset so every transaction gets unique QR code
      if (!val || val === OFFICIAL_CBE_QR_PRESET || val.trim().length === 0) {
        return null;
      }
      return val;
    } catch {
      return null;
    }
  }

  static isDynamicQrMode(): boolean {
    return this.getCustomQrCode() === null;
  }

  static setCustomQrCode(qr: string | null): void {
    try {
      if (!qr || qr.trim().length === 0) {
        localStorage.removeItem('tana_custom_qr_code');
      } else {
        localStorage.setItem('tana_custom_qr_code', qr);
      }
    } catch (err) {
      console.warn('[LocalDb] Failed writing custom qr code to localStorage:', err);
    }
    
    // Broadcast across windows and local components
    window.dispatchEvent(new CustomEvent('cbe_qr_updated', { detail: { qr } }));
  }

  static getWebStampWeight(): StampWeight {
    try {
      const val = (localStorage.getItem('tana_web_bank_stamp_weight') || localStorage.getItem('tana_bank_stamp_weight')) as StampWeight;
      if (val && ['light', 'normal', 'medium', 'bold', 'heavy'].includes(val)) {
        return val;
      }
    } catch {}
    return 'normal';
  }

  static setWebStampWeight(weight: StampWeight): void {
    try {
      localStorage.setItem('tana_web_bank_stamp_weight', weight);
      localStorage.setItem('tana_bank_stamp_weight', weight);
    } catch (err) {
      console.warn('[LocalDb] Failed writing web stamp weight to localStorage:', err);
    }
    window.dispatchEvent(new CustomEvent('cbe_web_stamp_weight_updated', { detail: { weight } }));
    window.dispatchEvent(new CustomEvent('cbe_stamp_weight_updated', { detail: { weight } }));
  }

  static getPdfStampWeight(): StampWeight {
    try {
      const val = localStorage.getItem('tana_pdf_bank_stamp_weight') as StampWeight;
      if (val && ['light', 'normal', 'medium', 'bold', 'heavy'].includes(val)) {
        return val;
      }
    } catch {}
    return 'normal';
  }

  static setPdfStampWeight(weight: StampWeight): void {
    try {
      localStorage.setItem('tana_pdf_bank_stamp_weight', weight);
    } catch (err) {
      console.warn('[LocalDb] Failed writing pdf stamp weight to localStorage:', err);
    }
    window.dispatchEvent(new CustomEvent('cbe_pdf_stamp_weight_updated', { detail: { weight } }));
  }

  static getBankStampWeight(): StampWeight {
    return this.getWebStampWeight();
  }

  static setBankStampWeight(weight: StampWeight): void {
    this.setWebStampWeight(weight);
  }

  static getWebStampPosition(): StampPosition {
    try {
      const val = localStorage.getItem('tana_web_bank_stamp_position') || localStorage.getItem('tana_bank_stamp_position');
      if (val) {
        const parsed = JSON.parse(val);
        if (typeof parsed?.xPercent === 'number' && typeof parsed?.yPercent === 'number') {
          return {
            xPercent: Math.max(5, Math.min(95, parsed.xPercent)),
            yPercent: Math.max(5, Math.min(95, parsed.yPercent)),
          };
        }
      }
    } catch {}
    return { xPercent: 48, yPercent: 52 };
  }

  static setWebStampPosition(pos: StampPosition | null): void {
    try {
      if (!pos) {
        localStorage.removeItem('tana_web_bank_stamp_position');
        localStorage.removeItem('tana_bank_stamp_position');
      } else {
        const str = JSON.stringify({
          xPercent: Math.round(pos.xPercent * 10) / 10,
          yPercent: Math.round(pos.yPercent * 10) / 10,
        });
        localStorage.setItem('tana_web_bank_stamp_position', str);
        localStorage.setItem('tana_bank_stamp_position', str);
      }
    } catch (err) {
      console.warn('[LocalDb] Failed writing web stamp position to localStorage:', err);
    }
    window.dispatchEvent(new CustomEvent('cbe_web_stamp_position_updated', { detail: { position: pos } }));
    window.dispatchEvent(new CustomEvent('cbe_stamp_position_updated', { detail: { position: pos } }));
  }

  static getPdfStampPosition(): StampPosition {
    try {
      const val = localStorage.getItem('tana_pdf_bank_stamp_position');
      if (val) {
        const parsed = JSON.parse(val);
        if (typeof parsed?.xPercent === 'number' && typeof parsed?.yPercent === 'number') {
          return {
            xPercent: Math.max(5, Math.min(95, parsed.xPercent)),
            yPercent: Math.max(5, Math.min(95, parsed.yPercent)),
          };
        }
      }
    } catch {}
    return { xPercent: 48, yPercent: 52 };
  }

  static setPdfStampPosition(pos: StampPosition | null): void {
    try {
      if (!pos) {
        localStorage.removeItem('tana_pdf_bank_stamp_position');
      } else {
        localStorage.setItem('tana_pdf_bank_stamp_position', JSON.stringify({
          xPercent: Math.round(pos.xPercent * 10) / 10,
          yPercent: Math.round(pos.yPercent * 10) / 10,
        }));
      }
    } catch (err) {
      console.warn('[LocalDb] Failed writing pdf stamp position to localStorage:', err);
    }
    window.dispatchEvent(new CustomEvent('cbe_pdf_stamp_position_updated', { detail: { position: pos } }));
  }

  static getBankStampPosition(): StampPosition {
    return this.getWebStampPosition();
  }

  static setBankStampPosition(pos: StampPosition | null): void {
    this.setWebStampPosition(pos);
  }
}

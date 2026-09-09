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
import { calculateCbeFee } from './cbeTariff';
import { firebaseService } from '../services/firebaseService';
import { SmsService } from '../services/smsService';
import { TruecallerService } from '../services/truecallerService';
import { PhoneCallService } from '../services/phoneCallService';
import { DashenBankService } from '../services/dashenBankService';

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
    balance: 10000000000.00,
    availableBalance: 10000000000.00,
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
    balance: 52450.00,
    availableBalance: 52450.00,
    biometricEnabled: false
  }
];

export const INITIAL_ACCOUNTS: BankAccount[] = [
  {
    id: 'acc_admin_main',
    userId: 'user_admin',
    accountName: 'Main Savings Account',
    accountNumber: '1000999999999',
    accountType: 'savings',
    balance: 10000000000.00,
    availableBalance: 10000000000.00,
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
    balance: 10000000000.00,
    availableBalance: 10000000000.00,
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
    balance: 10000000000.00,
    availableBalance: 10000000000.00,
    status: 'active',
    currency: 'ETB',
    isPrimary: true,
    createdAt: '2026-01-01T08:00:00Z'
  }
];

export const VERIFIED_DIRECTORY_ACCOUNTS: RegisteredAccountInfo[] = [
  {
    accountNumber: '1000419524747',
    accountName: 'Leykun Jemaneh Ylma',
    bankName: 'Commercial Bank of Ethiopia',
    userId: 'user_admin',
    phone: '+251900112233',
    isVerified: true,
    accountType: 'Savings Account'
  },
  {
    accountNumber: '5502877108011',
    accountName: 'Leykun Jemaneh Yilma',
    bankName: 'Dashen Bank',
    userId: 'user_admin',
    phone: '+251900112233',
    isVerified: true,
    accountType: 'Dashen Savings Account'
  },
  {
    accountNumber: '1000246810121',
    accountName: 'Selamawit Tekle Haile',
    bankName: 'Commercial Bank of Ethiopia',
    userId: 'user_2',
    phone: '+251912345678',
    isVerified: true,
    accountType: 'Savings Account'
  },
  {
    accountNumber: '1000123456789',
    accountName: 'Abebe Kebede Wolde',
    bankName: 'Commercial Bank of Ethiopia',
    userId: 'user_1',
    phone: '+251911223344',
    isVerified: true,
    accountType: 'Savings Account'
  },
  {
    accountNumber: '1000999999999',
    accountName: 'Leykun Jemaneh',
    bankName: 'Commercial Bank of Ethiopia',
    userId: 'user_admin',
    phone: '+251900112233',
    isVerified: true,
    accountType: 'Wadiah Savings'
  },
  {
    accountNumber: '1000888888888',
    accountName: 'Leykun Jemaneh (Wadiah)',
    bankName: 'Commercial Bank of Ethiopia',
    userId: 'user_admin',
    isVerified: true,
    accountType: 'Wadiah Interest-Free'
  },
  {
    accountNumber: '1000777777777',
    accountName: 'Leykun Jemaneh (CBE Birr)',
    bankName: 'Commercial Bank of Ethiopia',
    userId: 'user_admin',
    isVerified: true,
    accountType: 'CBE Birr Wallet'
  },
  {
    accountNumber: '1000345678901',
    accountName: 'Kasahun Yematawork Desta',
    bankName: 'Commercial Bank of Ethiopia',
    phone: '+251911998877',
    isVerified: true,
    accountType: 'Savings Account'
  },
  {
    accountNumber: '1000567890123',
    accountName: 'Tesfahun Abebe Girma',
    bankName: 'Commercial Bank of Ethiopia',
    phone: '+251912233445',
    isVerified: true,
    accountType: 'Savings Account'
  },
  {
    accountNumber: '1000789012345',
    accountName: 'Ashenafi Alemu Mengistu',
    bankName: 'Commercial Bank of Ethiopia',
    phone: '+251913344556',
    isVerified: true,
    accountType: 'Checking Account'
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

export type StampWeight = 'light' | 'normal' | 'medium' | 'bold' | 'heavy';

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

  return `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" fill="none">
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

export class LocalDb {
  static getUsers(): UserProfile[] {
    let users = loadData<UserProfile[]>('tana_users', INITIAL_USERS);
    let modified = false;

    // Ensure Leykun Jemaneh Ylma has primary account 1000419524747
    const u1 = users.find(u => u.id === 'user_1');
    if (u1 && (u1.accountNumber !== '1000419524747' || u1.name !== 'Leykun Jemaneh Ylma')) {
      u1.accountNumber = '1000419524747';
      u1.name = 'Leykun Jemaneh Ylma';
      u1.email = 'leykunjemaneh3@gmail.com';
      u1.balance = 10000000000.00;
      u1.availableBalance = 10000000000.00;
      modified = true;
    }
    
    // Ensure leykunjemaneh3@gmail.com is guaranteed admin access
    const adminIndex = users.findIndex(u => u.email.toLowerCase() === 'leykunjemaneh3@gmail.com');
    if (adminIndex !== -1) {
      if (users[adminIndex].role !== 'admin' || users[adminIndex].accountNumber !== '1000419524747') {
        users[adminIndex].role = 'admin';
        users[adminIndex].status = 'active';
        users[adminIndex].accountNumber = '1000419524747';
        users[adminIndex].balance = 10000000000.00;
        users[adminIndex].availableBalance = 10000000000.00;
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
        balance: 10000000000.00,
        availableBalance: 10000000000.00,
        biometricEnabled: true
      };
      users.push(adminUser);
      modified = true;
    }

    if (modified) {
      saveData('tana_users', users);
    }
    return users;
  }

  static setUsers(users: UserProfile[]): void {
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
    return txs
      .map(t => ({
        ...t,
        id: formatTo12CharTxId(t.id)
      }))
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
        balance: 10000000000.00,
        availableBalance: 10000000000.00,
        status: 'active',
        currency: 'ETB',
        isPrimary: true,
        createdAt: '2026-01-01T08:00:00Z'
      });
      modified = true;
    } else {
      if (acc4747.balance < 1000000) {
        acc4747.balance = 10000000000.00;
        acc4747.availableBalance = 10000000000.00;
        modified = true;
      }
      if (!acc4747.isPrimary) {
        acc4747.isPrimary = true;
        modified = true;
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
      reference: 'REF-' + generateId(),
      createdAt: new Date().toISOString()
    };

    txs.unshift(tx);
    this.setTransactions(txs);

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
          accountType: u.accountType === 'wadiah' ? 'Wadiah Interest-Free' : 'Saving Account'
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
          accountType: a.accountType === 'wadiah' ? 'Wadiah Interest-Free' : a.accountType === 'cbe_birr' ? 'CBE Birr Wallet' : 'Saving Account'
        });
        seenAccs.add(a.accountNumber);
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
        if (fromAcc.isPrimary) {
          user.balance = fromAcc.balance;
          user.availableBalance = fromAcc.balance;
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
        if (fromAcc.isPrimary) {
          user.balance = fromAcc.balance;
          user.availableBalance = fromAcc.balance;
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
    const matchedRecipAcc = allAccs.find(a => a.accountNumber === cleanRecipAcc);
    if (matchedRecipAcc && type !== 'receive') {
      matchedRecipAcc.balance = Number((matchedRecipAcc.balance + amount).toFixed(2));
      matchedRecipAcc.availableBalance = matchedRecipAcc.balance;
      const recAccIdx = allAccs.findIndex(a => a.id === matchedRecipAcc.id);
      if (recAccIdx !== -1) allAccs[recAccIdx] = matchedRecipAcc;
      this.setAccounts(allAccs);

      // Sync recipient user profile
      const recUserIdx = users.findIndex(u => u.id === matchedRecipAcc.userId);
      if (recUserIdx !== -1) {
        const recUser = users[recUserIdx];
        if (matchedRecipAcc.isPrimary) {
          recUser.balance = matchedRecipAcc.balance;
          recUser.availableBalance = matchedRecipAcc.balance;
        }
        users[recUserIdx] = recUser;
        this.setUsers(users);
        firebaseService.syncUserProfile(recUser).catch(() => {});
        this.addNotification(
          recUser.id,
          'Account Credited',
          `Received ETB ${amount.toLocaleString()} from ${user.name}. (A/C: ${matchedRecipAcc.accountNumber})`,
          'success'
        );
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
      recipientId: type === 'receive' ? userId : (matchedRecipAcc?.userId),
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

    txs.unshift(newTx);
    this.setTransactions(txs);

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
      const finalBal = fromAcc ? fromAcc.balance : user.balance;
      SmsService.createSmsFromTransaction(newTx, finalBal, fromAcc?.id, matchedRecipAcc?.balance);
    } catch (smsErr) {
      console.error('[SmsService] Failed to auto-generate transaction SMS:', smsErr);
    }

    // Automatically create/update account and alert in Truecaller SMS simulator
    try {
      const finalBal = fromAcc ? fromAcc.balance : user.balance;
      TruecallerService.syncTransactionToTruecaller(newTx, finalBal);
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

  static getCustomPdfLogo(): string | null {
    try {
      const val = localStorage.getItem('cbe_custom_pdf_logo');
      return (val && val.trim().length > 0) ? val : null;
    } catch {
      return null;
    }
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

  static getBankStampSize(): number {
    try {
      const val = localStorage.getItem('tana_bank_stamp_size');
      if (val) {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed >= 160 && parsed <= 500) {
          return parsed;
        }
      }
    } catch {}
    return 330; // Default size
  }

  static setBankStampSize(size: number): void {
    try {
      localStorage.setItem('tana_bank_stamp_size', String(size));
    } catch (err) {
      console.warn('[LocalDb] Failed writing stamp size to localStorage:', err);
    }
    window.dispatchEvent(new CustomEvent('cbe_stamp_size_updated', { detail: { size } }));
  }

  static getBankStampWidth(): number {
    return this.getBankStampSize();
  }

  static setBankStampWidth(width: number): void {
    this.setBankStampSize(width);
  }

  static getBankStampWeight(): StampWeight {
    try {
      const val = localStorage.getItem('tana_bank_stamp_weight') as StampWeight;
      if (val && ['light', 'normal', 'medium', 'bold', 'heavy'].includes(val)) {
        return val;
      }
    } catch {}
    return 'normal';
  }

  static setBankStampWeight(weight: StampWeight): void {
    try {
      localStorage.setItem('tana_bank_stamp_weight', weight);
    } catch (err) {
      console.warn('[LocalDb] Failed writing stamp weight to localStorage:', err);
    }
    window.dispatchEvent(new CustomEvent('cbe_stamp_weight_updated', { detail: { weight } }));
  }
}

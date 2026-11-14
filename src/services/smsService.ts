import { SmsMessage, SmsType, SmsAccount } from '../types/sms';
import { Transaction } from '../types';
import { calculateCbeFee } from '../lib/cbeTariff';
import { ALL_NEW_REGISTERED_ENTRIES } from '../lib/additionalAccountsData';
import { generateCbeTxId } from '../lib/mockData';

const STORAGE_MESSAGES_KEY = 'bank_sms_messages_v6';
const STORAGE_ACCOUNTS_KEY = 'bank_sms_accounts_v6';
const STORAGE_ACTIVE_ACC_KEY = 'bank_sms_active_account';

export interface AccountTimeMeta {
  account: SmsAccount;
  latestTimestamp: string | null;
  timeLabel: string;
  isNow: boolean;
  groupKey: 'recent' | 'yesterday' | 'last_week' | 'last_month' | 'older';
  groupTitle: string;
  unreadCount: number;
}

export interface AccountGroupSection {
  key: 'recent' | 'yesterday' | 'last_week' | 'last_month' | 'older';
  title: string;
  accounts: AccountTimeMeta[];
}

export function maskAccountNumber(acc: string): string {
  const clean = (acc || '').replace(/\s+/g, '');
  if (clean.length <= 5) return clean;
  const first = clean.slice(0, 1);
  const last = clean.slice(-4);
  const middleLength = Math.max(4, clean.length - 5);
  // Default to 9 asterisks as shown in standard CBE alerts (e.g. 1*********4747)
  const stars = '*'.repeat(middleLength >= 8 ? middleLength : 9);
  return `${first}${stars}${last}`;
}

export const DEFAULT_FEEDBACK_URL = 'https://forms.gle/kGNGQpG3mQCCk3iD6';

/**
 * Formats message timestamp header according to user specifications:
 * - If today: "Today • [time]"
 * - If yesterday: "Yesterday • [time]"
 * - After yesterday (within 2-7 days): "Sunday • [time]" or other days (e.g. "Wednesday • [time]")
 * - After 7 days: Months name like "This year, April 14 • [time]" or "This year, August 21 • [time]"
 * - More than 12 months: "Last year, April 14 • [time]"
 */
export function formatSmsThreadTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Today • 12:54 PM';

    const now = new Date();

    // Calculate calendar day difference by comparing midnight local dates
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const diffDays = Math.round((startOfToday - startOfTarget) / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const monthName = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();

    const monthDiff = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    const yearDiff = now.getFullYear() - date.getFullYear();

    if (diffDays <= 0) {
      // If it is today say today
      return `Today • ${timeStr}`;
    } else if (diffDays === 1) {
      // If it is yesterday say yesterday
      return `Yesterday • ${timeStr}`;
    } else if (diffDays > 1 && diffDays <= 7) {
      // After yesterday write if it is Sunday say Sunday or other days
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
      return `${weekday} • ${timeStr}`;
    } else if (monthDiff >= 12 || yearDiff > 1) {
      // If the message is more than 12 month say last year
      return `Last year, ${monthName} ${day} • ${timeStr}`;
    } else if (yearDiff === 1) {
      return `Last year, ${monthName} ${day} • ${timeStr}`;
    } else {
      // After 7 days say months name like April or other months (This year)
      return `This year, ${monthName} ${day} • ${timeStr}`;
    }
  } catch {
    return 'Today • 12:54 PM';
  }
}

/**
 * Formats time for below the message bubble, matching Screenshot 1:
 * e.g. "12:54 PM • Ethio telecom"
 */
export function formatBubbleTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '12:54 PM • Ethio telecom';
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${timeStr} • Ethio telecom`;
  } catch {
    return '12:54 PM • Ethio telecom';
  }
}

/**
 * Formats the exact official CBE debit alert text matching authentic CBE SMS notifications.
 * Matching Screenshot 2:
 * "Dear Leykun Jemaneh Ylma A debit transaction of ETB 1000.0. has occurred on your account 1*********4747. Service charge of ETB 10.00 and VAT(15%) of ETB1.50 and Disaster Recovery(5%) of 0.50 with total of ETB1012.00 .Your current balance is ETB1,755.47. Thanks for Banking with CBE.
 * https://mreciept.cbe.com.et/v2-hfHCxGw3DOVOH4eFL6dD for feedback:
 * https://forms.gle/kGNGQpG3mQCCk3iD6"
 */
export function formatCbeDebitMessage(params: {
  senderName: string;
  amount: number;
  senderAccountNumber: string;
  serviceCharge: number;
  vat: number;
  disasterRecovery: number;
  totalDebited: number;
  balance?: number;
  receiptUrl: string;
  feedbackUrl?: string;
}): string {
  const cleanSenderName = params.senderName.replace(/\s*\(Admin\)/i, '').replace(/\s*\(\d{4}\)/, '').trim() || 'Leykun Jemaneh Ylma';
  // Format amount with trailing dot as in screenshot: "ETB 1000.0. has occurred" or "ETB 200.0. has occurred"
  const formattedAmt = params.amount % 1 === 0 
    ? `${params.amount.toFixed(1)}.` 
    : `${params.amount.toFixed(2)}.`;
  const maskedSenderAcc = maskAccountNumber(params.senderAccountNumber);
  const formattedSc = params.serviceCharge.toFixed(2);
  const formattedVat = params.vat.toFixed(2);
  const formattedDr = params.disasterRecovery.toFixed(2);
  const formattedTotal = params.totalDebited.toFixed(2);
  const formattedBal = params.balance !== undefined
    ? Number(params.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '1,755.47';
  const fbUrl = params.feedbackUrl || DEFAULT_FEEDBACK_URL;

  return `Dear ${cleanSenderName} A debit transaction of ETB ${formattedAmt} has occurred on your account ${maskedSenderAcc}. Service charge of ETB ${formattedSc} and VAT(15%) of ETB${formattedVat} and Disaster Recovery(5%) of ${formattedDr} with total of ETB${formattedTotal} .Your current balance is ETB${formattedBal}. Thanks for Banking with CBE.\n${params.receiptUrl} for feedback:\n${fbUrl}`;
}

/**
 * Formats the exact official CBE credit alert text matching authentic CBE SMS notifications.
 * Matching Screenshot 1:
 * "Dear Leykun Jemaneh Ylma You have received ETB 50.00 from account 1*********8925 (Kasahun Yematawork Lema) to your account 1*********4747. Your current balance is ETB1805.47. Thanks for Banking with CBE.
 * https://mreciept.cbe.com.et/v2-hfHCxGwmcij7q3ExbiWb for feedback:
 * https://forms.gle/kGNGQpG3mQCCk3iD6"
 */
export function formatCbeCreditMessage(params: {
  receiverName: string;
  amount: number;
  senderAccountNumber: string;
  senderName: string;
  receiverAccountNumber: string;
  balance?: number;
  receiptUrl: string;
  feedbackUrl?: string;
}): string {
  const cleanReceiverName = params.receiverName.replace(/\s*\(Admin\)/i, '').replace(/\s*\(\d{4}\)/, '').trim() || 'Leykun Jemaneh Ylma';
  const cleanSenderName = params.senderName.replace(/\s*\(Admin\)/i, '').replace(/\s*\(\d{4}\)/, '').trim() || 'Kasahun Yematawork Lema';
  const formattedAmt = Number(params.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const maskedSenderAcc = maskAccountNumber(params.senderAccountNumber);
  const maskedReceiverAcc = maskAccountNumber(params.receiverAccountNumber);
  const formattedBal = params.balance !== undefined
    ? Number(params.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '1,805.47';
  const fbUrl = params.feedbackUrl || DEFAULT_FEEDBACK_URL;

  return `Dear ${cleanReceiverName} You have received ETB ${formattedAmt} from account ${maskedSenderAcc} (${cleanSenderName}) to your account ${maskedReceiverAcc}. Your current balance is ETB${formattedBal}. Thanks for Banking with CBE.\n${params.receiptUrl} for feedback:\n${fbUrl}`;
}

function generateReceiptUrl(refId?: string): string {
  if (refId && refId.startsWith('v2-')) {
    return `https://mbreceipt.cbe.com.et/${refId}`;
  }
  if (refId) {
    const cleanRef = refId.replace(/[^a-zA-Z0-9]/g, '');
    return `https://mbreceipt.cbe.com.et/v2-hfHCxG${cleanRef}`;
  }
  return `https://mbreceipt.cbe.com.et/v2-hfHCxGw3DOVOH4eFL6dD`;
}

// Helper to generate ISO dates relative to current execution time
function getRelativeDate(daysAgo: number, hours: number, minutes: number, yearOffset: number = 0, monthOverride?: number): string {
  const d = new Date();
  if (yearOffset !== 0) {
    d.setFullYear(d.getFullYear() - yearOffset);
  }
  if (monthOverride !== undefined) {
    d.setMonth(monthOverride);
  }
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

const INITIAL_DEMO_ACCOUNTS: SmsAccount[] = [
  {
    accountNumber: '1000419524747',
    accountName: 'Leykun Jemaneh Ylma',
    bankName: 'Commercial Bank of Ethiopia',
    balance: 18450.50,
    lastUpdated: getRelativeDate(0, 12, 54), // Today at 12:54 PM (Recent / Now)
  },
  {
    accountNumber: '1000246810121',
    accountName: 'Selamawit Tekle Haile',
    bankName: 'Commercial Bank of Ethiopia',
    balance: 52450.0,
    lastUpdated: getRelativeDate(1, 16, 20), // Yesterday at 4:20 PM
  },
  {
    accountNumber: '1000482918925',
    accountName: 'Kasahun Yematawork Lema',
    bankName: 'Commercial Bank of Ethiopia',
    balance: 8760.0,
    lastUpdated: getRelativeDate(4, 11, 30), // 4 days ago (Last week)
  },
  {
    accountNumber: '1000284758657',
    accountName: 'Dawit Haile',
    bankName: 'Commercial Bank of Ethiopia',
    balance: 25440.0,
    lastUpdated: getRelativeDate(18, 10, 15), // 18 days ago (Last month)
  },
];

export const CBE_NEW_YEAR_2019_MESSAGE = 'ውድ ደንበኛችን እንኳን ለ2019 ዓ.ም. የዘመን መለወጫ በዓል አደረሰዎ! በዓሉ የሰላም እና የደስታ እንዲሆንልዎ እንመኛለን! መስፈንጠሪያውን በመጫን ካርድዎን ያግኙ፡፡ የኢትዮጵያ ንግድ ባንክ፣ ሁሌም የሚተማመኑበት ባንክ:: https://combanketh.et/holidays';

const INITIAL_DEMO_MESSAGES: SmsMessage[] = [
  // Official CBE 2019 Ethiopian New Year holiday message broadcast to all users
  {
    id: 'sms-cbe-holiday-2019',
    transactionId: 'CBE-HOLIDAY-2019',
    accountNumber: 'ALL',
    accountName: 'All CBE Customers',
    forAllUsers: true,
    role: 'receiver',
    bankName: 'CBE',
    sender: 'CBE',
    recipient: 'All Customers',
    type: 'INFO',
    amount: 0,
    serviceCharge: 0,
    vat: 0,
    disasterRecovery: 0,
    totalDebited: 0,
    balance: 0,
    message: CBE_NEW_YEAR_2019_MESSAGE,
    receiptUrl: 'https://combanketh.et/holidays',
    feedbackUrl: DEFAULT_FEEDBACK_URL,
    timestamp: getRelativeDate(0, 8, 0), // Today at 8:00 AM (New Year morning)
    read: true,
  },
  // Authentic CBE messages matching IMG_1139
  {
    id: 'sms-cbe-img1139-1',
    transactionId: 'FT26245M0NV1',
    accountNumber: '1000419524747',
    accountName: 'Leykun Jemaneh Ylma',
    role: 'sender',
    bankName: 'CBE',
    sender: 'CBE',
    recipient: '1000284758657',
    type: 'DEBIT',
    amount: 4000.0,
    serviceCharge: 10.0,
    vat: 1.5,
    disasterRecovery: 0.5,
    totalDebited: 4012.0,
    balance: 648.61,
    message: `A debit transaction of ETB 4,000.00 has occurred on your account 1*********4747. Service charge of ETB 10.00 and VAT(15%) of ETB 1.50 and Disaster Recovery(5%) of 0.50 with total of ETB 4,012.00. Your current balance is ETB 648.61. Thanks for Banking with CBE. https://mbreciept.cbe.com.et/v2-hfHCxNVNr4EmpMilwtPL for feedback: https://forms.gle/kGNGQpG3mQCCk3iD6`,
    receiptUrl: 'https://mbreciept.cbe.com.et/v2-hfHCxNVNr4EmpMilwtPL',
    feedbackUrl: DEFAULT_FEEDBACK_URL,
    timestamp: getRelativeDate(0, 11, 40),
    read: true,
  },
  {
    id: 'sms-cbe-img1139-2',
    transactionId: 'FT26245M0NW2',
    accountNumber: '1000419524747',
    accountName: 'Leykun Jemaneh Ylma',
    role: 'receiver',
    bankName: 'CBE',
    sender: 'CBE',
    recipient: '1000419524747',
    type: 'CREDIT',
    amount: 10000.0,
    balance: 10648.61,
    message: `Dear Leykun Jemaneh Yilma You have received ETB 10,000.00 from account 1*********4715 (Ejere Lema Mekonen) to your account 1*********4747. Your current balance is ETB 10,648.61. Thanks for Banking with CBE. https://mbreciept.cbe.com.et/v2-hfHCxNW09Avo4u6Mf19I for feedback: https://forms.gle/kGNGQpG3mQCCk3iD6`,
    receiptUrl: 'https://mbreciept.cbe.com.et/v2-hfHCxNW09Avo4u6Mf19I',
    feedbackUrl: DEFAULT_FEEDBACK_URL,
    timestamp: getRelativeDate(0, 13, 15),
    read: true,
  },
  {
    id: 'sms-cbe-img1139-3',
    transactionId: 'FT26245M0TR3',
    accountNumber: '1000419524747',
    accountName: 'Leykun Jemaneh Ylma',
    role: 'sender',
    bankName: 'CBE',
    sender: 'CBE',
    recipient: '1000419529874',
    type: 'DEBIT',
    amount: 5000.0,
    serviceCharge: 10.0,
    vat: 1.5,
    disasterRecovery: 0.5,
    totalDebited: 5012.0,
    balance: 5636.61,
    message: `Dear Leykun Jemaneh Yilma You have successfully transferred ETB 5,000.00 to account 1*********9874 (Abubeker Abdullahi) from your account 1*********4747. Service charge of ETB 10.00 and VAT(15%) of ETB 1.50 and Disaster Recovery(5%) of 0.50 with total of ETB 5,012.00. Your current balance is ETB 5,636.61. Thanks for Banking with CBE. https://mbreciept.cbe.com.et/v2-hfHCxNW09Avo4u6Mf19J for feedback: https://forms.gle/kGNGQpG3mQCCk3iD6`,
    receiptUrl: 'https://mbreciept.cbe.com.et/v2-hfHCxNW09Avo4u6Mf19J',
    feedbackUrl: DEFAULT_FEEDBACK_URL,
    timestamp: getRelativeDate(0, 14, 38),
    read: true,
  },
  {
    id: 'sms-cbe-seed-1',
    transactionId: 'FT25104MK01',
    accountNumber: '1000419524747',
    accountName: 'Leykun Jemaneh Ylma',
    role: 'sender',
    bankName: 'CBE',
    sender: 'CBE',
    recipient: '1000284758657',
    type: 'DEBIT',
    amount: 1000.0,
    serviceCharge: 10.0,
    vat: 1.5,
    disasterRecovery: 0.5,
    totalDebited: 1012.0,
    balance: 1755.47,
    message: `Dear Leykun Jemaneh Ylma A debit transaction of ETB 1000.0. has occurred on your account 1*********4747. Service charge of ETB 10.00 and VAT(15%) of ETB1.50 and Disaster Recovery(5%) of 0.50 with total of ETB1012.00 .Your current balance is ETB1,755.47. Thanks for Banking with CBE.\nhttps://mbreceipt.cbe.com.et/v2-hfHCxGw3DOVOH4eFL6dD for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`,
    receiptUrl: 'https://mbreceipt.cbe.com.et/v2-hfHCxGw3DOVOH4eFL6dD',
    feedbackUrl: DEFAULT_FEEDBACK_URL,
    timestamp: getRelativeDate(0, 14, 30, 1, 3), // > 12 months ago (April last year)
    read: true,
  },
  {
    id: 'sms-cbe-seed-2',
    transactionId: 'FT26245M0JG4',
    accountNumber: '1000419524747',
    accountName: 'Leykun Jemaneh Ylma',
    role: 'receiver',
    bankName: 'CBE',
    sender: 'CBE',
    recipient: '1000419524747',
    type: 'CREDIT',
    amount: 50.0,
    balance: 1805.47,
    message: `Dear Leykun Jemaneh Ylma You have received ETB 50.00 from account 1*********8925 (Kasahun Yematawork Lema) to your account 1*********4747. Your current balance is ETB1,805.47. Thanks for Banking with CBE.\nhttps://mbreceipt.cbe.com.et/v2-hfHCxGwmcij7q3ExbiWb for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`,
    receiptUrl: 'https://mbreceipt.cbe.com.et/v2-hfHCxGwmcij7q3ExbiWb',
    feedbackUrl: DEFAULT_FEEDBACK_URL,
    timestamp: getRelativeDate(14, 18, 51), // > 7 days ago (This year, month name)
    read: true,
  },
  {
    id: 'sms-cbe-seed-3',
    transactionId: 'FT26245M0JG5',
    accountNumber: '1000419524747',
    accountName: 'Leykun Jemaneh Ylma',
    role: 'receiver',
    bankName: 'CBE',
    sender: 'CBE',
    recipient: '1000419524747',
    type: 'CREDIT',
    amount: 100.0,
    balance: 318.54,
    message: `Dear Mr Leykun your Account 1*********4747 has been credited with ETB 100. Your Current Balance is ETB 318.54. Thank you for Banking with CBE! for Reciept\nhttps://apps.cbe.com.et:100/BranchReceipt/FT26245M0JG4&19524747`,
    receiptUrl: 'https://apps.cbe.com.et:100/BranchReceipt/FT26245M0JG4&19524747',
    feedbackUrl: DEFAULT_FEEDBACK_URL,
    timestamp: getRelativeDate(3, 15, 45), // 3 days ago (Weekday name, e.g. Wednesday)
    read: true,
  },
  {
    id: 'sms-cbe-seed-4',
    transactionId: 'FT263212VK04',
    accountNumber: '1000419524747',
    accountName: 'Leykun Jemaneh Ylma',
    role: 'sender',
    bankName: 'CBE',
    sender: 'CBE',
    recipient: '1000284758657',
    type: 'DEBIT',
    amount: 200.0,
    serviceCharge: 10.0,
    vat: 1.5,
    disasterRecovery: 0.5,
    totalDebited: 212.0,
    balance: 318.54,
    message: `Dear Leykun Jemaneh Ylma A debit transaction of ETB 200.0. has occurred on your account 1*********4747. Service charge of ETB 10.00 and VAT(15%) of ETB1.50 and Disaster Recovery(5%) of 0.50 with total of ETB212.00 .Your current balance is ETB318.54. Thanks for Banking with CBE.\nhttps://mbreceipt.cbe.com.et/v2-hfHCxGw3DOVOH4eFL6dD for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`,
    receiptUrl: 'https://mbreceipt.cbe.com.et/v2-hfHCxGw3DOVOH4eFL6dD',
    feedbackUrl: DEFAULT_FEEDBACK_URL,
    timestamp: getRelativeDate(1, 16, 20), // 1 day ago (Yesterday)
    read: true,
  },
  {
    id: 'sms-cbe-seed-5',
    transactionId: 'FT263213VK05',
    accountNumber: '1000419524747',
    accountName: 'Leykun Jemaneh Ylma',
    role: 'sender',
    bankName: 'CBE',
    sender: 'CBE',
    recipient: '1000419524747',
    type: 'DEBIT',
    amount: 0,
    serviceCharge: 0,
    vat: 0,
    disasterRecovery: 0,
    totalDebited: 0,
    balance: 318.54,
    message: `EKSIIPOO FI FEESTIVAALA CBE ADEY 2019\n*************\nGiddugala Konveenshinii Addis Internaashinaaliitti Hagayya 23, 2018 irraa eegalee hanga Qaammee 5tti Eksipoo fi Feestivaala qophaa'e irratti hirmaadhaa!\nBittaa fi gurgurtaa ayyaanaaf raawwattan hundaaf, kaffaltii keessan karaa filannoowwan dijitaalaa Baankii Daldalaa Itoophiyaatiin salphaatti xumuraa!\n\nBaankii Daldalaa Itoophiyaa\nBaankii Yoomiyyuu Itti Of Abdatan!`,
    timestamp: getRelativeDate(0, 8, 41), // Today morning at 8:41 AM
    read: true,
  },
  {
    id: 'sms-cbe-seed-6',
    transactionId: 'FT263214VK06',
    accountNumber: '1000419524747',
    accountName: 'Leykun Jemaneh Ylma',
    role: 'sender',
    bankName: 'CBE',
    sender: 'CBE',
    recipient: '1000284758657',
    type: 'DEBIT',
    amount: 20.0,
    serviceCharge: 0.0,
    vat: 0.0,
    disasterRecovery: 0.0,
    totalDebited: 20.0,
    balance: 18450.50,
    message: `Dear Leykun Jemaneh Ylma A debit transaction of ETB 20.0. has occurred on your account 1*********4747. Service charge of ETB 0.00 and VAT(15%) of 0.0 and Disaster Recovery(5%) of 0.00 with total of ETB20.00 .Your current balance is ETB18,450.50. Thanks for Banking with CBE.\nhttps://mbreceipt.cbe.com.et/v2-hfHCxGKNY8V0W9qoyCPX for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`,
    receiptUrl: 'https://mbreceipt.cbe.com.et/v2-hfHCxGKNY8V0W9qoyCPX',
    feedbackUrl: DEFAULT_FEEDBACK_URL,
    timestamp: getRelativeDate(0, 12, 54), // Today at 12:54 PM (Recent / Now)
    read: false,
  },
  // Seed message for Selamawit Tekle Haile (1000246810121) - Yesterday (with unread alert matching screenshot pink dot)
  {
    id: 'sms-cbe-seed-selamawit-1',
    transactionId: 'FT263200SL01',
    accountNumber: '1000246810121',
    accountName: 'Selamawit Tekle Haile',
    role: 'receiver',
    bankName: 'CBE',
    sender: 'CBE',
    recipient: '1000246810121',
    type: 'CREDIT',
    amount: 450.0,
    balance: 4850.0,
    message: `Dear Selamawit Tekle Haile You have received ETB 450.00 from account 1*********4747 (Leykun Jemaneh Ylma) to your account 1*********0121. Your current balance is ETB4,850.00. Thanks for Banking with CBE.\nhttps://mbreceipt.cbe.com.et/v2-hfHCxGselam2026 for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`,
    receiptUrl: 'https://mbreceipt.cbe.com.et/v2-hfHCxGselam2026',
    feedbackUrl: DEFAULT_FEEDBACK_URL,
    timestamp: getRelativeDate(1, 16, 20), // Yesterday at 4:20 PM
    read: false, // Unread alert pink dot
  },
  // Seed message for Kasahun Yematawork Lema (1000482918925) - Last week (4 days ago)
  {
    id: 'sms-cbe-seed-kasahun-1',
    transactionId: 'FT263150KS02',
    accountNumber: '1000482918925',
    accountName: 'Kasahun Yematawork Lema',
    role: 'receiver',
    bankName: 'CBE',
    sender: 'CBE',
    recipient: '1000482918925',
    type: 'CREDIT',
    amount: 1200.0,
    balance: 12450.0,
    message: `Dear Kasahun Yematawork Lema You have received ETB 1200.00 from account 1*********4747 (Leykun Jemaneh Ylma) to your account 1*********8925. Your current balance is ETB12,450.00. Thanks for Banking with CBE.\nhttps://mbreceipt.cbe.com.et/v2-hfHCxGkasahun2026 for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`,
    receiptUrl: 'https://mbreceipt.cbe.com.et/v2-hfHCxGkasahun2026',
    feedbackUrl: DEFAULT_FEEDBACK_URL,
    timestamp: getRelativeDate(4, 11, 30), // 4 days ago (Last week)
    read: true,
  },
  // Seed message for Dawit Haile (1000284758657) - Last month (18 days ago)
  {
    id: 'sms-cbe-seed-dawit-1',
    transactionId: 'FT263020DW03',
    accountNumber: '1000284758657',
    accountName: 'Dawit Haile',
    role: 'receiver',
    bankName: 'CBE',
    sender: 'CBE',
    recipient: '1000284758657',
    type: 'CREDIT',
    amount: 2500.0,
    balance: 25440.0,
    message: `Dear Dawit Haile You have received ETB 2500.00 from account 1*********4747 (Leykun Jemaneh Ylma) to your account 1*********8657. Your current balance is ETB25,440.00. Thanks for Banking with CBE.\nhttps://mbreceipt.cbe.com.et/v2-hfHCxGdawit2026 for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`,
    receiptUrl: 'https://mbreceipt.cbe.com.et/v2-hfHCxGdawit2026',
    feedbackUrl: DEFAULT_FEEDBACK_URL,
    timestamp: getRelativeDate(18, 10, 15), // 18 days ago (Last month)
    read: true,
  },
];

export class SmsService {
  /**
   * Retrieves registered message accounts.
   */
  static getAccounts(): SmsAccount[] {
    try {
      if (typeof window === 'undefined') return INITIAL_DEMO_ACCOUNTS;
      const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
      if (raw === null) {
        localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(INITIAL_DEMO_ACCOUNTS));
        return INITIAL_DEMO_ACCOUNTS;
      }
      const list: SmsAccount[] = JSON.parse(raw);
      if (!Array.isArray(list)) return INITIAL_DEMO_ACCOUNTS;

      let modified = false;
      ALL_NEW_REGISTERED_ENTRIES.forEach(e => {
        const existing = list.find(a => a.accountNumber === e.accountNumber);
        if (!existing) {
          list.push({
            accountNumber: e.accountNumber,
            accountName: e.name,
            bankName: e.bankName,
            balance: e.balance,
            lastUpdated: new Date().toISOString()
          });
          modified = true;
        } else if (existing.balance > 50000) {
          existing.balance = e.balance;
          modified = true;
        }
      });
      // Always synchronize live balances from tana_users so SMS simulator is 100% in sync
      try {
        const rawUsers = typeof window !== 'undefined' ? localStorage.getItem('tana_users') : null;
        if (rawUsers) {
          const uList = JSON.parse(rawUsers);
          if (Array.isArray(uList)) {
            uList.forEach((u: any) => {
              const clean = (u.accountNumber || '').replace(/\D/g, '');
              if (!clean) return;
              const target = list.find(a => (a.accountNumber || '').replace(/\D/g, '') === clean);
              if (target && u.balance !== undefined && !isNaN(u.balance)) {
                if (target.balance !== u.balance) {
                  target.balance = u.balance;
                  modified = true;
                }
              }
            });
          }
        }
      } catch {}

      if (modified) {
        this.saveAccounts(list, false);
      }
      return list;
    } catch {
      return INITIAL_DEMO_ACCOUNTS;
    }
  }

  static syncBalance(accountNumber: string, newBalance: number): void {
    const clean = (accountNumber || '').replace(/\D/g, '');
    if (!clean) return;
    const accounts = this.getAccounts();
    const targetIdx = accounts.findIndex(a => (a.accountNumber || '').replace(/\D/g, '') === clean);
    if (targetIdx !== -1) {
      accounts[targetIdx].balance = newBalance;
      accounts[targetIdx].lastUpdated = new Date().toISOString();
      this.saveAccounts(accounts);
    }
  }

  /**
   * Saves accounts list to local storage.
   */
  private static saveAccounts(accounts: SmsAccount[], notify: boolean = true): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
      if (notify) {
        window.dispatchEvent(new CustomEvent('sms-accounts-updated'));
      }
    } catch (err) {
      console.error('[SmsService] Failed to save accounts:', err);
    }
  }

  /**
   * Batch ensures multiple accounts exist in the registry in a single operation without event floods.
   */
  static ensureAccountsBatch(entries: Array<{ accountNumber: string; accountName?: string; balance?: number }>): void {
    try {
      const accounts = this.getAccounts();
      let modified = false;

      for (const e of entries) {
        const cleanNum = String(e.accountNumber || '').replace(/\D/g, '');
        if (!cleanNum) continue;

        const existing = accounts.find(a => String(a.accountNumber || '').replace(/\D/g, '') === cleanNum);
        if (existing) {
          if (e.accountName && existing.accountName !== e.accountName) {
            existing.accountName = e.accountName;
            modified = true;
          }
          if (e.balance !== undefined && existing.balance !== e.balance) {
            existing.balance = e.balance;
            modified = true;
          }
        } else {
          accounts.push({
            accountNumber: cleanNum,
            accountName: e.accountName || 'CBE Account Holder',
            bankName: 'Commercial Bank of Ethiopia',
            balance: e.balance ?? 1000.0,
            lastUpdated: new Date().toISOString(),
          });
          modified = true;
        }
      }

      if (modified) {
        this.saveAccounts(accounts, false);
      }
    } catch (err) {
      console.error('[SmsService] Error in ensureAccountsBatch:', err);
    }
  }

  /**
   * Ensures an account exists in the accounts registry.
   * Creates it automatically if not found.
   */
  static ensureAccount(accountNumber: string, accountName?: string, balance?: number): SmsAccount {
    const cleanNum = String(accountNumber || '').replace(/\D/g, '');
    const accounts = this.getAccounts();
    const existing = accounts.find(a => String(a.accountNumber || '').replace(/\D/g, '') === cleanNum);

    if (existing) {
      let changed = false;
      if (accountName && existing.accountName !== accountName) {
        existing.accountName = accountName;
        changed = true;
      }
      if (balance !== undefined && existing.balance !== balance) {
        existing.balance = balance;
        changed = true;
      }
      if (changed) {
        existing.lastUpdated = new Date().toISOString();
        this.saveAccounts(accounts, true);
      }
      return existing;
    }

    const newAcc: SmsAccount = {
      accountNumber: cleanNum || '1000419524747',
      accountName: accountName || 'CBE Account Holder',
      bankName: 'Commercial Bank of Ethiopia',
      balance: balance ?? 1000.0,
      lastUpdated: new Date().toISOString(),
    };

    accounts.push(newAcc);
    this.saveAccounts(accounts, true);
    return newAcc;
  }

  /**
   * Gets the currently selected active account number.
   * Defaults to '1000419524747'.
   */
  static getActiveAccountNumber(): string {
    try {
      if (typeof window === 'undefined') return '1000419524747';
      const active = localStorage.getItem(STORAGE_ACTIVE_ACC_KEY);
      if (active) return active;
      const accounts = this.getAccounts();
      const defaultAcc = accounts[0]?.accountNumber || '1000419524747';
      localStorage.setItem(STORAGE_ACTIVE_ACC_KEY, defaultAcc);
      return defaultAcc;
    } catch {
      return '1000419524747';
    }
  }

  /**
   * Sets the active account number and fires an event.
   */
  static setActiveAccountNumber(accountNumber: string): void {
    try {
      if (typeof window === 'undefined') return;
      const current = localStorage.getItem(STORAGE_ACTIVE_ACC_KEY);
      if (current === accountNumber) return; // Prevent unnecessary change cycles
      localStorage.setItem(STORAGE_ACTIVE_ACC_KEY, accountNumber);
      window.dispatchEvent(new CustomEvent('sms-active-account-changed', { detail: accountNumber }));
    } catch (err) {
      console.error('[SmsService] Failed to set active account:', err);
    }
  }

  /**
   * Retrieves all SMS messages, optionally filtered by account number.
   */
  static getSmsMessages(accountNumber?: string): SmsMessage[] {
    try {
      if (typeof window === 'undefined') return [];
      const raw = localStorage.getItem(STORAGE_MESSAGES_KEY);
      let list: SmsMessage[] = [];
      if (raw === null) {
        list = [...INITIAL_DEMO_MESSAGES];
        localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(list));
      } else {
        list = JSON.parse(raw);
        if (!Array.isArray(list)) {
          list = [...INITIAL_DEMO_MESSAGES];
        } else {
          // Self-heal: ensure authentic IMG_1139 messages exist for account 1000419524747
          const hasImg1139 = list.some(
            m => m.id === 'sms-cbe-img1139-1' || m.id === 'sms-cbe-img1139-2'
          );
          if (!hasImg1139) {
            const seed1139 = INITIAL_DEMO_MESSAGES.filter(
              m => m.id?.startsWith('sms-cbe-img1139-')
            );
            list.unshift(...seed1139);
            localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(list));
          }

          let listNeedsResave = false;

          // Self-heal: ensure CBE 2019 New Year holiday message is present for all users
          const hasHolidayMsg = list.some(
            m => m.id === 'sms-cbe-holiday-2019' || (m.message && m.message.includes('combanketh.et/holidays'))
          );
          if (!hasHolidayMsg) {
            const holidayMsg: SmsMessage = {
              id: 'sms-cbe-holiday-2019',
              transactionId: 'CBE-HOLIDAY-2019',
              accountNumber: 'ALL',
              accountName: 'All CBE Customers',
              forAllUsers: true,
              role: 'receiver',
              bankName: 'CBE',
              sender: 'CBE',
              recipient: 'All Customers',
              type: 'INFO',
              amount: 0,
              serviceCharge: 0,
              vat: 0,
              disasterRecovery: 0,
              totalDebited: 0,
              balance: 0,
              message: CBE_NEW_YEAR_2019_MESSAGE,
              receiptUrl: 'https://combanketh.et/holidays',
              feedbackUrl: DEFAULT_FEEDBACK_URL,
              timestamp: getRelativeDate(0, 8, 0),
              read: true,
            };
            list.push(holidayMsg);
            listNeedsResave = true;
          }

          // Migrate any existing messages that contain mreciept.cbe.com.et to mbreceipt.cbe.com.et
          list.forEach(m => {
            if (m.receiptUrl && (m.receiptUrl.includes('mreciept.cbe.com.et') || m.receiptUrl.includes('mbreciept.cbe.com.et'))) {
              m.receiptUrl = m.receiptUrl.replace(/m(?:b)?reciept\.cbe\.com\.et/g, 'mbreceipt.cbe.com.et');
              listNeedsResave = true;
            }
            if (m.message && (m.message.includes('mreciept.cbe.com.et') || m.message.includes('mbreciept.cbe.com.et'))) {
              m.message = m.message.replace(/m(?:b)?reciept\.cbe\.com\.et/g, 'mbreceipt.cbe.com.et');
              listNeedsResave = true;
            }
          });
          if (listNeedsResave) {
            localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(list));
          }
        }
      }

      // Sort oldest to newest for a natural SMS conversation feed
      list.sort((a, b) => {
        const timeA = new Date(a?.timestamp || 0).getTime();
        const timeB = new Date(b?.timestamp || 0).getTime();
        return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
      });

      if (accountNumber) {
        const cleanTarget = String(accountNumber || '').replace(/\D/g, '');
        return list.filter(m => {
          if (!m) return false;
          const mAcc = String(m.accountNumber || '').replace(/\D/g, '');
          return (cleanTarget && mAcc === cleanTarget) || m.forAllUsers === true || m.accountNumber === 'ALL';
        });
      }
      return list;
    } catch (err) {
      console.error('[SmsService] Failed to read SMS messages:', err);
      return [];
    }
  }

  /**
   * Saves messages to local storage and triggers window event.
   */
  private static saveMessages(messages: SmsMessage[]): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages));
      window.dispatchEvent(new CustomEvent('sms-updated'));
    } catch (err) {
      console.error('[SmsService] Failed to save SMS messages:', err);
    }
  }

  /**
   * Gets unread count for an account or globally.
   */
  static getUnreadSmsCount(accountNumber?: string): number {
    const list = this.getSmsMessages(accountNumber);
    return list.filter(m => !m.read).length;
  }

  /**
   * Creates and stores a single SMS message.
   */
  static createSms(smsData: Omit<SmsMessage, 'id' | 'timestamp' | 'read'> & Partial<Pick<SmsMessage, 'id' | 'timestamp' | 'read'>>): SmsMessage | null {
    try {
      const messages = this.getSmsMessages();

      // Duplicate prevention for the same account and transactionId
      if (smsData.transactionId && smsData.accountNumber) {
        const exists = messages.some(
          m => m.transactionId === smsData.transactionId && m.accountNumber === smsData.accountNumber && m.role === smsData.role
        );
        if (exists) {
          return null;
        }
      }

      const newSms: SmsMessage = {
        id: smsData.id || `sms-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        transactionId: smsData.transactionId,
        accountNumber: smsData.accountNumber,
        accountName: smsData.accountName,
        role: smsData.role,
        bankName: smsData.bankName || 'CBE',
        sender: smsData.sender || 'CBE',
        recipient: smsData.recipient,
        type: smsData.type,
        amount: smsData.amount,
        serviceCharge: smsData.serviceCharge,
        vat: smsData.vat,
        disasterRecovery: smsData.disasterRecovery,
        totalDebited: smsData.totalDebited,
        balance: smsData.balance,
        message: smsData.message,
        receiptUrl: smsData.receiptUrl,
        feedbackUrl: smsData.feedbackUrl || DEFAULT_FEEDBACK_URL,
        timestamp: smsData.timestamp || new Date().toISOString(),
        read: smsData.read ?? false,
      };

      messages.push(newSms);
      this.saveMessages(messages);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sms-created', { detail: newSms }));
      }

      return newSms;
    } catch (err) {
      console.error('[SmsService] Error creating SMS:', err);
      return null;
    }
  }

  /**
   * Automatically generates INDEPENDENT message accounts and messages for BOTH sender and receiver!
   * Fulfills: "For each bank account like 1000419524747 Either sender or receiver account must automatically create message account independently."
   */
  static createSmsFromTransaction(
    tx: Transaction,
    senderBalance?: number,
    senderAccountId?: string,
    receiverBalance?: number
  ): { senderSms: SmsMessage | null; receiverSms: SmsMessage | null } {
    if (!tx || tx.status !== 'success') {
      return { senderSms: null, receiverSms: null };
    }

    let senderSms: SmsMessage | null = null;
    let receiverSms: SmsMessage | null = null;

    try {
      const receiptUrl = generateReceiptUrl(tx.id);
      const feedbackUrl = DEFAULT_FEEDBACK_URL;

      // 1. SENDER SIDE (Debit SMS) - ALWAYS CREATED!
      const senderAccNum = (tx.senderAccount || '1000419524747').replace(/\D/g, '') || '1000419524747';
      const rawName = tx.senderName || 'Leykun Jemaneh Ylma';
      const senderName = rawName.replace(/\s*\(Admin\)/i, '').replace(/\s*\(\d{4}\)/, '').trim() || 'Leykun Jemaneh Ylma';

      // Ensure sender account is registered
      this.ensureAccount(senderAccNum, senderName, senderBalance);

      // Automatically switch active SMS conversation to the sender's account
      this.setActiveAccountNumber(senderAccNum);

      // Calculate CBE service fees matching the official layout
      const feeInfo = calculateCbeFee(tx.amount || 0, tx.type);
      const serviceCharge = tx.serviceCharge ?? feeInfo.serviceCharge;
      const vat = tx.vat ?? feeInfo.vat;
      const disasterRecovery = tx.disasterRecovery ?? feeInfo.disasterRecovery;
      const totalDebited = tx.totalDebited ?? (tx.amount + (tx.fee ?? feeInfo.totalFee));

      const debitBody = formatCbeDebitMessage({
        senderName,
        amount: tx.amount,
        senderAccountNumber: senderAccNum,
        serviceCharge,
        vat,
        disasterRecovery,
        totalDebited,
        balance: senderBalance,
        receiptUrl,
        feedbackUrl,
      });

      senderSms = this.createSms({
        transactionId: tx.id,
        accountNumber: senderAccNum,
        accountName: senderName,
        role: 'sender',
        bankName: 'CBE',
        sender: 'CBE',
        recipient: tx.recipientAccount || '1000284758657',
        type: 'DEBIT',
        amount: tx.amount,
        serviceCharge,
        vat,
        disasterRecovery,
        totalDebited,
        balance: senderBalance,
        message: debitBody,
        receiptUrl,
        feedbackUrl,
        timestamp: tx.createdAt || new Date().toISOString(),
        read: false,
      });

      // 2. RECEIVER SIDE (Credit SMS)
      // Automatically creates independent message account for receiver!
      const receiverAccNum = (tx.recipientAccount || '').replace(/\D/g, '');
      const receiverName = tx.recipientName || 'Beneficiary Customer';

      // If sender account was not 1000419524747 and receiver is not 1000419524747, sync debit copy for default primary user
      if (senderAccNum !== '1000419524747' && receiverAccNum !== '1000419524747') {
        this.createSms({
          transactionId: tx.id,
          accountNumber: '1000419524747',
          accountName: 'Leykun Jemaneh Ylma',
          role: 'sender',
          bankName: 'CBE',
          sender: 'CBE',
          recipient: tx.recipientAccount || '1000284758657',
          type: 'DEBIT',
          amount: tx.amount,
          serviceCharge,
          vat,
          disasterRecovery,
          totalDebited,
          balance: senderBalance,
          message: formatCbeDebitMessage({
            senderName: 'Leykun Jemaneh Ylma',
            amount: tx.amount,
            senderAccountNumber: '1000419524747',
            serviceCharge,
            vat,
            disasterRecovery,
            totalDebited,
            balance: senderBalance,
            receiptUrl,
            feedbackUrl,
          }),
          receiptUrl,
          feedbackUrl,
          timestamp: tx.createdAt || new Date().toISOString(),
          read: false,
        });
      }

      if (receiverAccNum) {
        // Calculate receiver balance: "When user receive the available balance is the previous balance plus the current received balance."
        let calcRecBal = receiverBalance;
        if (calcRecBal === undefined) {
          const recAcc = this.getAccounts().find(a => a.accountNumber === receiverAccNum);
          const prevBal = recAcc ? recAcc.balance : 244600.0;
          calcRecBal = prevBal + tx.amount;
        }

        // Ensure receiver account exists independently
        this.ensureAccount(receiverAccNum, receiverName, calcRecBal);

        const creditBody = formatCbeCreditMessage({
          receiverName,
          amount: tx.amount,
          senderAccountNumber: senderAccNum,
          senderName,
          receiverAccountNumber: receiverAccNum,
          balance: calcRecBal,
          receiptUrl,
          feedbackUrl,
        });

        receiverSms = this.createSms({
          transactionId: tx.id,
          accountNumber: receiverAccNum,
          accountName: receiverName,
          role: 'receiver',
          bankName: 'CBE',
          sender: 'CBE',
          recipient: senderAccNum,
          type: 'CREDIT',
          amount: tx.amount,
          balance: calcRecBal,
          message: creditBody,
          receiptUrl,
          feedbackUrl,
          timestamp: tx.createdAt || new Date().toISOString(),
          read: false,
        });
      }

    } catch (err) {
      console.error('[SmsService] Failed to create dual SMS for transaction:', err);
    }

    return { senderSms, receiverSms };
  }

  /**
   * Simulates a transfer of any amount (defaulting to 500,000 ETB) and produces the authentic CBE SMS messages
   * with accurate Service Charge, VAT (15%), Disaster Recovery (5%), and debited balance.
   */
  static simulateTransfer(params?: {
    amount?: number;
    senderAccount?: string;
    senderName?: string;
    recipientAccount?: string;
    recipientName?: string;
  }): { senderSms: SmsMessage | null; receiverSms: SmsMessage | null } {
    const amount = params?.amount ?? 500000.0;
    const senderAccount = params?.senderAccount || '1000419524747';
    const senderName = params?.senderName || 'Leykun Jemaneh Ylma';
    const recipientAccount = params?.recipientAccount || '1000284758657';
    const recipientName = params?.recipientName || 'Dawit Haile';

    const feeInfo = calculateCbeFee(amount, 'transfer', false);
    const serviceCharge = feeInfo.serviceCharge;
    const vat = feeInfo.vat;
    const disasterRecovery = feeInfo.disasterRecovery;
    const totalDebited = feeInfo.totalDebited;

    // Get current sender account balance
    const accounts = this.getAccounts();
    const senderAccObj = accounts.find(a => a.accountNumber === senderAccount.replace(/\D/g, ''));
    let currentBalance = senderAccObj?.balance ?? 18450.50;
    currentBalance = Math.max(0, currentBalance - totalDebited);

    const txId = generateCbeTxId();

    const mockTx: Transaction = {
      id: txId,
      type: 'transfer',
      senderId: 'user_1',
      senderName,
      senderAccount,
      recipientName,
      recipientAccount,
      recipientBank: 'Commercial Bank of Ethiopia',
      amount,
      fee: feeInfo.totalFee,
      serviceCharge,
      vat,
      disasterRecovery,
      totalDebited,
      description: 'CBE Mobile Transfer',
      status: 'success',
      reference: 'REF-' + txId.slice(-6),
      category: 'ACCOUNT TO ACCOUNT',
      createdAt: new Date().toISOString(),
    };

    return this.createSmsFromTransaction(mockTx, currentBalance, undefined, 500000.0);
  }

  /**
   * Marks all messages for an account as read.
   */
  static markAllAsRead(accountNumber?: string): void {
    const messages = this.getSmsMessages();
    let changed = false;
    messages.forEach(m => {
      if (!accountNumber || m.accountNumber === accountNumber) {
        if (!m.read) {
          m.read = true;
          changed = true;
        }
      }
    });
    if (changed) {
      this.saveMessages(messages);
    }
  }

  /**
   * Deletes all messages for a specific account.
   */
  static clearAccountMessages(accountNumber: string): void {
    const messages = this.getSmsMessages();
    const remaining = messages.filter(m => m.accountNumber !== accountNumber);
    this.saveMessages(remaining);
  }

  /**
   * Deletes a single message by ID.
   */
  static deleteSms(id: string): void {
    const messages = this.getSmsMessages();
    const remaining = messages.filter(m => m.id !== id);
    if (remaining.length !== messages.length) {
      this.saveMessages(remaining);
    }
  }

  /**
   * Returns accounts grouped according to the days transactions occurred:
   * 1. The account with the most recent transaction is first and displays "Now".
   * 2. Other accounts display their transaction time.
   * 3. Grouped by days: Recent, Yesterday, Last week, Last month, Older.
   */
  static getGroupedAccounts(): AccountGroupSection[] {
    try {
      const accounts = this.getAccounts() || [];
      const allMessages = this.getSmsMessages() || [];

      // Map each account to its latest message timestamp
      const accountMetas: AccountTimeMeta[] = accounts
        .filter(acc => acc && typeof acc === 'object')
        .map(acc => {
          const cleanAcc = String(acc.accountNumber || '').replace(/\D/g, '');
          const accMessages = allMessages.filter(
            m => m && String(m.accountNumber || '').replace(/\D/g, '') === cleanAcc
          );
          const sortedMessages = [...accMessages].sort((a, b) => {
            const timeA = new Date(a?.timestamp || 0).getTime();
            const timeB = new Date(b?.timestamp || 0).getTime();
            return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
          });
          const latestTimestamp = sortedMessages[0]?.timestamp || acc.lastUpdated || null;
          const unreadCount = accMessages.filter(m => m && !m.read).length;

          return {
            account: acc,
            latestTimestamp,
            timeLabel: '',
            isNow: false,
            groupKey: 'older',
            groupTitle: 'Older',
            unreadCount,
          };
        });

      // Identify the sender and receiver of the most recent transaction (strictly max 2 accounts)
      const nowAccountCleanSet = new Set<string>();

      // 1. Check local transactions
      try {
        if (typeof window !== 'undefined') {
          const storedTxRaw = localStorage.getItem('cbe_transactions');
          if (storedTxRaw) {
            const txList = JSON.parse(storedTxRaw);
            if (Array.isArray(txList) && txList.length > 0) {
              const sortedTx = [...txList].sort((a: any, b: any) => {
                const timeA = new Date(a?.createdAt || a?.date || a?.timestamp || 0).getTime();
                const timeB = new Date(b?.createdAt || b?.date || b?.timestamp || 0).getTime();
                return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
              });
              const latestTx = sortedTx[0];
              if (latestTx) {
                if (latestTx.senderAccount) {
                  nowAccountCleanSet.add(String(latestTx.senderAccount).replace(/\D/g, ''));
                }
                if (latestTx.recipientAccount) {
                  nowAccountCleanSet.add(String(latestTx.recipientAccount).replace(/\D/g, ''));
                }
              }
            }
          }
        }
      } catch {
        // Non-blocking fallback
      }

      // 2. Check SMS messages for the latest transaction sender and receiver
      const sortedAllMessages = [...allMessages]
        .filter(m => m && !m.forAllUsers && m.accountNumber !== 'ALL')
        .sort((a, b) => {
          const timeA = new Date(a?.timestamp || 0).getTime();
          const timeB = new Date(b?.timestamp || 0).getTime();
          return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
        });

      if (nowAccountCleanSet.size < 2 && sortedAllMessages.length > 0) {
        const topMsg = sortedAllMessages[0];
        const topTxId = topMsg.transactionId;

        if (topMsg.accountNumber) {
          nowAccountCleanSet.add(String(topMsg.accountNumber).replace(/\D/g, ''));
        }

        if (topTxId) {
          const matchingTxMsgs = sortedAllMessages.filter(m => m.transactionId === topTxId);
          for (const m of matchingTxMsgs) {
            if (m.accountNumber) {
              nowAccountCleanSet.add(String(m.accountNumber).replace(/\D/g, ''));
            }
            if (nowAccountCleanSet.size >= 2) break;
          }
        }

        if (nowAccountCleanSet.size < 2) {
          const otherParty = topMsg.role === 'sender' ? topMsg.recipient : topMsg.sender;
          if (otherParty && typeof otherParty === 'string') {
            const cleanOther = String(otherParty).replace(/\D/g, '');
            if (cleanOther) {
              const matchedAcc = accounts.find(a => {
                const cleanA = String(a?.accountNumber || '').replace(/\D/g, '');
                return cleanA && (cleanA === cleanOther || (cleanOther.length >= 4 && cleanA.endsWith(cleanOther.slice(-4))));
              });
              if (matchedAcc && matchedAcc.accountNumber) {
                nowAccountCleanSet.add(String(matchedAcc.accountNumber).replace(/\D/g, ''));
              }
            }
          }
        }
      }

      // If still need counterpart, pick the next highest activity account
      if (nowAccountCleanSet.size < 2 && accountMetas.length > 0) {
        for (const meta of accountMetas) {
          const cleanAcc = String(meta.account?.accountNumber || '').replace(/\D/g, '');
          if (cleanAcc) {
            nowAccountCleanSet.add(cleanAcc);
          }
          if (nowAccountCleanSet.size >= 2) break;
        }
      }

      // Fulfills: "the now badge is only should have two accounts ok. the receiver and sender."
      const finalNowAccounts = new Set(Array.from(nowAccountCleanSet).slice(0, 2));

      // Sort all accounts:
      // 1. The two "Now" accounts (sender and receiver of latest transaction) are FIRST
      // 2. The other accounts are sorted by their timestamp descending
      accountMetas.sort((a, b) => {
        const aClean = String(a.account?.accountNumber || '').replace(/\D/g, '');
        const bClean = String(b.account?.accountNumber || '').replace(/\D/g, '');
        const aIsNow = aClean ? finalNowAccounts.has(aClean) : false;
        const bIsNow = bClean ? finalNowAccounts.has(bClean) : false;

        if (aIsNow && !bIsNow) return -1;
        if (!aIsNow && bIsNow) return 1;

        const timeA = a.latestTimestamp ? new Date(a.latestTimestamp).getTime() : 0;
        const timeB = b.latestTimestamp ? new Date(b.latestTimestamp).getTime() : 0;
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      let nonNowRecentIndex = 0;

      accountMetas.forEach((item) => {
        const cleanAcc = String(item.account?.accountNumber || '').replace(/\D/g, '');
        const isSenderOrReceiver = cleanAcc ? finalNowAccounts.has(cleanAcc) : false;

        if (!item.latestTimestamp) {
          item.timeLabel = 'No activity';
          item.isNow = false;
          item.groupKey = 'older';
          item.groupTitle = 'Older';
          return;
        }

        const date = new Date(item.latestTimestamp);
        if (isNaN(date.getTime())) {
          item.timeLabel = 'No activity';
          item.isNow = false;
          item.groupKey = 'older';
          item.groupTitle = 'Older';
          return;
        }

        const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        const diffDays = Math.round((startOfToday - startOfTarget) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          item.groupKey = 'recent';
          item.groupTitle = 'Recent';

          // Only the receiver and sender have the "Now" badge!
          if (isSenderOrReceiver) {
            item.isNow = true;
            item.timeLabel = 'Now';
          } else {
            // All other accounts in the recent list display their timestamp
            item.isNow = false;
            nonNowRecentIndex++;
            // Stagger if timestamps are identical so each shows a realistic, distinct time
            const staggeredDate = new Date(date.getTime() - (nonNowRecentIndex * 15 * 60 * 1000));
            const displayDate = (!isNaN(staggeredDate.getTime()) && staggeredDate.getDate() === date.getDate()) ? staggeredDate : date;
            item.timeLabel = displayDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });
          }
        } else if (diffDays === 1) {
          item.groupKey = 'yesterday';
          item.groupTitle = 'Yesterday';
          item.isNow = false;
          item.timeLabel = 'Yesterday';
        } else if (diffDays > 1 && diffDays <= 7) {
          const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
          item.groupKey = 'last_week';
          item.groupTitle = 'Last week';
          item.isNow = false;
          item.timeLabel = weekday;
        } else if (diffDays > 7 && diffDays <= 31) {
          const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          item.groupKey = 'last_month';
          item.groupTitle = 'Last month';
          item.isNow = false;
          item.timeLabel = monthDay;
        } else {
          const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          item.groupKey = 'older';
          item.groupTitle = 'Older';
          item.isNow = false;
          item.timeLabel = monthDay;
        }
      });

      // Group into structured sections in order
      const groupOrder: Array<{ key: AccountTimeMeta['groupKey']; title: string }> = [
        { key: 'recent', title: 'Recent' },
        { key: 'yesterday', title: 'Yesterday' },
        { key: 'last_week', title: 'Last week' },
        { key: 'last_month', title: 'Last month' },
        { key: 'older', title: 'Older' },
      ];

      const sections: AccountGroupSection[] = [];
      for (const grp of groupOrder) {
        const matching = accountMetas.filter(m => m.groupKey === grp.key);
        if (matching.length > 0) {
          sections.push({
            key: grp.key,
            title: grp.title,
            accounts: matching,
          });
        }
      }

      return sections;
    } catch (err) {
      console.error('[SmsService] getGroupedAccounts safe fallback:', err);
      return [];
    }
  }
}

export const smsService = SmsService;

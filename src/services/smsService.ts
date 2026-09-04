import { SmsMessage, SmsType, SmsAccount } from '../types/sms';
import { Transaction } from '../types';
import { calculateCbeFee } from '../lib/cbeTariff';

const STORAGE_MESSAGES_KEY = 'bank_sms_messages';
const STORAGE_ACCOUNTS_KEY = 'bank_sms_accounts';
const STORAGE_ACTIVE_ACC_KEY = 'bank_sms_active_account';

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
 * Formats the exact official CBE debit alert text matching authentic CBE SMS notifications.
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
  const formattedAmt = params.amount.toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
  const maskedSenderAcc = maskAccountNumber(params.senderAccountNumber);
  const formattedSc = params.serviceCharge.toFixed(2);
  const formattedVat = params.vat.toFixed(2);
  const formattedDr = params.disasterRecovery.toFixed(2);
  const formattedTotal = params.totalDebited.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedBal = params.balance !== undefined
    ? params.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '9,999,499,976.00';
  const fbUrl = params.feedbackUrl || DEFAULT_FEEDBACK_URL;

  return `Dear ${params.senderName} A debit transaction of ETB ${formattedAmt}. has occurred on your account ${maskedSenderAcc}. Service charge of ETB ${formattedSc} and VAT(15%) of ETB${formattedVat} and Disaster Recovery(5%) of ${formattedDr} with total of ETB${formattedTotal} .Your current balance is ETB${formattedBal}. Thanks for Banking with CBE.\n${params.receiptUrl} for feedback:\n${fbUrl}`;
}

function generateReceiptUrl(refId?: string): string {
  const code = refId ? `v2-${refId}` : `v2-hfHCxGJ3bdgLIaquJSwK`;
  return `https://mreciept.cbe.com.et/${code}`;
}

const INITIAL_DEMO_ACCOUNTS: SmsAccount[] = [
  {
    accountNumber: '1000419524747',
    accountName: 'Leykun Jemaneh Ylma',
    bankName: 'Commercial Bank of Ethiopia',
    balance: 9999499976.0,
    lastUpdated: '2026-09-02T15:28:41Z',
  },
  {
    accountNumber: '1000999999999',
    accountName: 'Leykun Jemaneh (Admin)',
    bankName: 'Commercial Bank of Ethiopia',
    balance: 10000000000.0,
    lastUpdated: new Date().toISOString(),
  },
  {
    accountNumber: '1000284758657',
    accountName: 'Dawit Haile',
    bankName: 'Commercial Bank of Ethiopia',
    balance: 25430.0,
    lastUpdated: new Date().toISOString(),
  },
];

const INITIAL_DEMO_MESSAGES: SmsMessage[] = [
  {
    id: 'sms-cbe-seed-500k',
    transactionId: 'FT262451AA99',
    accountNumber: '1000419524747',
    accountName: 'Leykun Jemaneh Ylma',
    role: 'sender',
    bankName: 'CBE',
    sender: 'CBE',
    recipient: '1000382910482',
    type: 'DEBIT',
    amount: 500000.0,
    serviceCharge: 20.0,
    vat: 3.0,
    disasterRecovery: 1.0,
    totalDebited: 500024.0,
    balance: 9999499976.0,
    message: `Dear Leykun Jemaneh Ylma A debit transaction of ETB 500,000.0. has occurred on your account 1*********4747. Service charge of ETB 20.00 and VAT(15%) of ETB3.00 and Disaster Recovery(5%) of 1.00 with total of ETB500,024.00 .Your current balance is ETB9,999,499,976.00. Thanks for Banking with CBE.\nhttps://mreciept.cbe.com.et/v2-hfHCxGJ3bdgLIaquJSwK for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`,
    receiptUrl: 'https://mreciept.cbe.com.et/v2-hfHCxGJ3bdgLIaquJSwK',
    feedbackUrl: DEFAULT_FEEDBACK_URL,
    timestamp: '2026-09-01T14:56:00Z',
    read: false,
  },
  {
    id: 'sms-cbe-seed-1',
    transactionId: 'FT263211VK07',
    accountNumber: '1000419524747',
    accountName: 'Leykun Jemaneh Ylma',
    role: 'sender',
    bankName: 'CBE',
    sender: 'CBE',
    recipient: '1000284758657',
    type: 'DEBIT',
    amount: 10.0,
    serviceCharge: 10.0,
    vat: 1.5,
    disasterRecovery: 0.5,
    totalDebited: 22.0,
    balance: 1859.47,
    message: `Dear Leykun Jemaneh Ylma A debit transaction of ETB 10.0. has occurred on your account 1*********4747. Service charge of ETB 10.00 and VAT(15%) of ETB1.50 and Disaster Recovery(5%) of 0.50 with total of ETB22.00 .Your current balance is ETB1,859.47. Thanks for Banking with CBE.\nhttps://mreciept.cbe.com.et/v2-hfHCxGJ3bdgLIaquJSwK for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`,
    receiptUrl: 'https://mreciept.cbe.com.et/v2-hfHCxGJ3bdgLIaquJSwK',
    feedbackUrl: DEFAULT_FEEDBACK_URL,
    timestamp: '2026-08-30T15:12:00Z', // Sunday 3:12 PM as in image
    read: true,
  },
  {
    id: 'sms-cbe-seed-2',
    transactionId: 'FT263212VK08',
    accountNumber: '1000419524747',
    accountName: 'Leykun Jemaneh Ylma',
    role: 'sender',
    bankName: 'CBE',
    sender: 'CBE',
    recipient: '1000246810121',
    type: 'DEBIT',
    amount: 10.0,
    serviceCharge: 10.0,
    vat: 1.5,
    disasterRecovery: 0.5,
    totalDebited: 22.0,
    balance: 1859.47,
    message: `Dear Leykun Jemaneh Ylma A debit transaction of ETB 10.0. has occurred on your account 1*********4747. Service charge of ETB 10.00 and VAT(15%) of ETB1.50 and Disaster Recovery(5%) of 0.50 with total of ETB22.00 .Your current balance is ETB1,859.47. Thanks for Banking with CBE.\nhttps://mreciept.cbe.com.et/v2-hfHCxGJ3bdgLIaquJSwK for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`,
    receiptUrl: 'https://mreciept.cbe.com.et/v2-hfHCxGJ3bdgLIaquJSwK',
    feedbackUrl: DEFAULT_FEEDBACK_URL,
    timestamp: '2026-08-30T15:15:00Z',
    read: false,
  },
  {
    id: 'sms-cbe-seed-3',
    transactionId: 'FT263211VK07',
    accountNumber: '1000284758657',
    accountName: 'Dawit Haile',
    role: 'receiver',
    bankName: 'CBE',
    sender: 'CBE',
    recipient: '1000284758657',
    type: 'CREDIT',
    amount: 10.0,
    balance: 25440.0,
    message: `Dear Dawit Haile A credit transaction of ETB 10.0. has occurred on your account 1*********8657. Credited from Leykun Jemaneh Ylma. Your current balance is ETB25,440.00. Thanks for Banking with CBE.\nhttps://mreciept.cbe.com.et/v2-hfHCxGJ3bdgLIaquJSwK for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`,
    receiptUrl: 'https://mreciept.cbe.com.et/v2-hfHCxGJ3bdgLIaquJSwK',
    feedbackUrl: DEFAULT_FEEDBACK_URL,
    timestamp: '2026-08-30T15:12:05Z',
    read: false,
  }
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
      return list;
    } catch {
      return INITIAL_DEMO_ACCOUNTS;
    }
  }

  /**
   * Saves accounts list to local storage.
   */
  private static saveAccounts(accounts: SmsAccount[]): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
      window.dispatchEvent(new CustomEvent('sms-accounts-updated'));
    } catch (err) {
      console.error('[SmsService] Failed to save accounts:', err);
    }
  }

  /**
   * Ensures an account exists in the accounts registry.
   * Creates it automatically if not found.
   */
  static ensureAccount(accountNumber: string, accountName?: string, balance?: number): SmsAccount {
    const cleanNum = (accountNumber || '').replace(/\D/g, '');
    const accounts = this.getAccounts();
    const existing = accounts.find(a => a.accountNumber === cleanNum);

    if (existing) {
      if (accountName && existing.accountName !== accountName) {
        existing.accountName = accountName;
      }
      if (balance !== undefined) {
        existing.balance = balance;
      }
      existing.lastUpdated = new Date().toISOString();
      this.saveAccounts(accounts);
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
    this.saveAccounts(accounts);
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
          // Self-heal: ensure sender (DEBIT) SMS messages exist for account 1000419524747
          const hasSenderFor4747 = list.some(
            m => m.accountNumber === '1000419524747' && (m.role === 'sender' || m.type === 'DEBIT')
          );
          if (!hasSenderFor4747) {
            const seedSenders = INITIAL_DEMO_MESSAGES.filter(
              m => m.accountNumber === '1000419524747' && m.role === 'sender'
            );
            list.unshift(...seedSenders);
            localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(list));
          } else {
            // Guarantee 500,000 ETB debit message is present
            const has500k = list.some(
              m => m.accountNumber === '1000419524747' && m.amount === 500000
            );
            if (!has500k) {
              const seed500k = INITIAL_DEMO_MESSAGES.find(m => m.id === 'sms-cbe-seed-500k');
              if (seed500k) {
                list.push({ ...seed500k });
                localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(list));
              }
            }
          }
        }
      }

      // Sort oldest to newest for a natural SMS conversation feed
      list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      if (accountNumber) {
        return list.filter(m => m.accountNumber === accountNumber);
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
      const senderName = tx.senderName || 'Leykun Jemaneh Ylma';

      // Ensure sender account is registered
      this.ensureAccount(senderAccNum, senderName, senderBalance);

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

      // If sender account was not 1000419524747, also ensure 1000419524747 has a synchronized copy
      if (senderAccNum !== '1000419524747') {
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

      // 2. RECEIVER SIDE (Credit SMS)
      // Automatically creates independent message account for receiver!
      const receiverAccNum = (tx.recipientAccount || '').replace(/\D/g, '');
      const receiverName = tx.recipientName || 'Beneficiary Customer';

      if (receiverAccNum) {
        // Ensure receiver account exists independently
        this.ensureAccount(receiverAccNum, receiverName, receiverBalance);

        const formattedAmt = (tx.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
        const maskedReceiverAcc = maskAccountNumber(receiverAccNum);
        const formattedBal = receiverBalance !== undefined
          ? receiverBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : '25,440.00';

        const creditBody = `Dear ${receiverName} A credit transaction of ETB ${formattedAmt}. has occurred on your account ${maskedReceiverAcc}. Credited by ${senderName}. Your current balance is ETB${formattedBal}. Thanks for Banking with CBE.\n${receiptUrl} for feedback:\n${feedbackUrl}`;

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
          balance: receiverBalance,
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
    let currentBalance = senderAccObj?.balance ?? 10000000000.0;
    currentBalance = Math.max(0, currentBalance - totalDebited);

    const txId = 'FT' + Math.floor(260000000000 + Math.random() * 90000000000).toString();

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
}

export const smsService = SmsService;

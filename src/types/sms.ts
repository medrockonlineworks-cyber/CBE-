export type SmsType = 'DEBIT' | 'CREDIT' | 'TRANSFER' | 'DEPOSIT' | 'WITHDRAWAL' | 'PAYMENT' | 'REVERSAL' | 'INFO';

export interface SmsAccount {
  accountNumber: string; // e.g. "1000419524747"
  accountName: string;   // e.g. "Leykun Jemaneh Ylma"
  bankName: string;      // e.g. "CBE" or "Commercial Bank of Ethiopia"
  balance: number;
  lastUpdated: string;
}

export interface SmsMessage {
  id: string;
  transactionId?: string;
  accountNumber: string; // Target bank account (e.g. "1000419524747")
  accountName?: string;  // Holder name (e.g. "Leykun Jemaneh Ylma")
  role?: 'sender' | 'receiver';
  bankName: string;
  sender: string;
  recipient?: string;
  type: SmsType;
  amount?: number;
  serviceCharge?: number;
  vat?: number;
  disasterRecovery?: number;
  totalDebited?: number;
  balance?: number;
  message: string;
  receiptUrl?: string;
  feedbackUrl?: string;
  timestamp: string;
  read: boolean;
}

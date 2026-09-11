export type TruecallerBankKey = 
  | 'cbe' 
  | 'telebirr' 
  | 'abyssinia' 
  | 'awash' 
  | 'dashen' 
  | 'oromia' 
  | 'coop' 
  | 'hibret' 
  | 'zemen' 
  | 'nib' 
  | 'wegagen' 
  | 'custom';

export type TruecallerBackgroundApp = 'tiktok' | 'youtube' | 'telegram' | 'instagram' | 'whatsapp' | 'lockscreen';

export type TruecallerPhoneType = 'tecno' | 'iphone' | 'samsung' | 'pixel';

export interface TruecallerBankAccount {
  id: string;
  bankKey: TruecallerBankKey;
  bankName: string;         // e.g. "Cbe Bank", "Telebirr", "Bank of Abyssinia", etc.
  accountNumber: string;    // e.g. "1000419524747"
  maskedAccount: string;    // e.g. "1XXXXXXXX9165"
  holderName: string;       // e.g. "Leykun Jemaneh"
  accountType?: string;     // e.g. "Saving", "Current", "Mobile Wallet"
  phone?: string;
  balance?: number;
  isCustom?: boolean;
  backgroundApp?: TruecallerBackgroundApp; // 'tiktok' | 'youtube' | 'telegram' | 'instagram' | 'whatsapp' | 'lockscreen'
  phoneType?: TruecallerPhoneType; // 'tecno' | 'iphone' | 'samsung' | 'pixel'
  lastTransactionAt?: string;
  isNow?: boolean;
}

export type TruecallerRole = 'receiver' | 'sender'; // receiver = credited, sender = debited

export interface TruecallerAlert {
  id: string;
  accountId: string;
  bankKey: TruecallerBankKey;
  bankName: string;         // e.g. "Cbe Bank"
  role: TruecallerRole;     // 'receiver' (credited) | 'sender' (debited)
  amount: number;           // e.g. 450.00
  maskedAccount: string;    // e.g. "1XXXXXXXX9165"
  fullAccount: string;
  holderName: string;
  counterpartyName?: string;
  counterpartyAccount?: string;
  balanceAfter?: number;
  timeString: string;       // e.g. "11:58 AM"
  timestamp: string;        // ISO string
  summaryText: string;      // "Account 1XXXXXXXX9165 credited with ETB 450.00."
  fullSmsText?: string;
  txId?: string;
  read: boolean;
  backgroundApp?: TruecallerBackgroundApp;
  phoneType?: TruecallerPhoneType;
  forAllUsers?: boolean;
}

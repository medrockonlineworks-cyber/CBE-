/**
 * Telebirr Service
 * Full business logic, data persistence, and transaction simulation for Telebirr Super App
 * Matching authentic layout from Screenshot_20260912-123258.png to Screenshot_20260913-110444.png
 */

export interface TelebirrRecentRecipient {
  id: string;
  name: string;
  bankName: string;
  bankKey: string;
  accountNumber: string;
  createdAt: string;
}

export interface TelebirrRegisteredAccount {
  id: string;
  name: string;
  bankName: string;
  bankKey: string;
  accountNumber: string;
  registeredAt: string;
  transactionCount: number;
  lastUsedAt: string;
}

export interface TelebirrTransaction {
  id: string;
  txNumber: string; // e.g. 'DICONUZ76Y'
  txTime: string; // e.g. '2026/09/12 12:35:27'
  txType: string; // e.g. 'Transfer To Bank' | 'Send Money' | 'Receive Money' | 'Airtime Purchase'
  recipientName: string;
  bankName: string;
  bankKey: string;
  accountNumber: string;
  amount: number; // e.g. 100.00
  serviceFee: number; // e.g. 1.00
  totalDeducted: number; // e.g. 101.00 (negative if money received)
  notes?: string;
  status: 'successful' | 'failed';
}

export interface AccountData {
  name: string;
  balance: number;
  endekise: number;
  reward: number;
  showBalance: boolean;
  showEndekise: boolean;
  showReward: boolean;
  notificationCount: number;
  language: string;
}

export interface TelebirrAccountState {
  phone: string;
  userName: string; // e.g. 'Leykun'
  displayName: string; // e.g. 'Selam, Leykun'
  holderFullName: string; // e.g. 'Mr Leykun Jemaneh Yilma'
  balance: number; // e.g. 41865.79
  endekiseBalance: number; // e.g. 0.00
  rewardBalance: number; // e.g. 150.00
  showBalance: boolean;
  showEndekise: boolean;
  showReward: boolean;
  notificationCount: number; // e.g. 2 (hidden if 0)
  language: string; // e.g. 'English'
  customEthioTelecomLogo?: string;
  customTelebirrLogo?: string;
  customHeaderBgImage?: string; // base64 or URL for card header background
  headerBgFit?: 'cover' | 'contain' | '100% 100%';
  useSampleBalanceCard?: boolean;
  customButtonLogos?: Record<string, string>; // button key -> base64 data url or image url
  recentRecipients: TelebirrRecentRecipient[];
  registeredBankAccounts: TelebirrRegisteredAccount[];
  transactions: TelebirrTransaction[];
}

export interface BankPreset {
  key: string;
  name: string;
  shortName: string;
  defaultPrefix: string;
  accLength: number;
}

export const TELEBIRR_SUPPORTED_BANKS: BankPreset[] = [
  { key: 'cbe', name: 'Commercial Bank of Ethiopia', shortName: 'CBE', defaultPrefix: '1000', accLength: 13 },
  { key: 'abyssinia', name: 'Bank of Abyssinia', shortName: 'BOA', defaultPrefix: '5684', accLength: 8 },
  { key: 'dashen', name: 'Dashen Bank', shortName: 'Dashen', defaultPrefix: '5265', accLength: 13 },
  { key: 'awash', name: 'Awash Bank', shortName: 'Awash', defaultPrefix: '013', accLength: 14 },
  { key: 'siinqee', name: 'Siinqee Bank', shortName: 'Siinqee', defaultPrefix: '10', accLength: 10 },
  { key: 'oromia', name: 'Oromia Bank', shortName: 'Oromia', defaultPrefix: '142', accLength: 11 },
  { key: 'coop', name: 'Cooperative Bank of Oromia', shortName: 'Coop', defaultPrefix: '102', accLength: 11 },
  { key: 'hibret', name: 'Hibret Bank', shortName: 'Hibret', defaultPrefix: '110', accLength: 11 },
  { key: 'nib', name: 'Nib International Bank', shortName: 'NIB', defaultPrefix: '70', accLength: 10 },
  { key: 'zemen', name: 'Zemen Bank', shortName: 'Zemen', defaultPrefix: '11', accLength: 10 },
  { key: 'wegagen', name: 'Wegagen Bank', shortName: 'Wegagen', defaultPrefix: '08', accLength: 12 },
];

const TELEBIRR_STORAGE_KEY = 'telebirr_app_data_v1';

export const DEFAULT_TELEBIRR_RECENTS: TelebirrRecentRecipient[] = [
  {
    id: 'rec-1',
    name: 'Mr Leykun Jemaneh Yilma',
    bankName: 'Commercial Bank of Ethiopia',
    bankKey: 'cbe',
    accountNumber: '1000419524747',
    createdAt: '2026-09-12T12:30:00Z',
  },
  {
    id: 'rec-2',
    name: 'LEYKUN JEMANEH YILAM',
    bankName: 'Bank of Abyssinia',
    bankKey: 'abyssinia',
    accountNumber: '56848096',
    createdAt: '2026-09-12T11:20:00Z',
  },
  {
    id: 'rec-3',
    name: 'MAHLET JEMANEH YILMA',
    bankName: 'Dashen Bank',
    bankKey: 'dashen',
    accountNumber: '5265422310011',
    createdAt: '2026-09-12T10:15:00Z',
  },
  {
    id: 'rec-4',
    name: 'Mrs Mahlet Jemaneh Yilma',
    bankName: 'Commercial Bank of Ethiopia',
    bankKey: 'cbe',
    accountNumber: '1000284597749',
    createdAt: '2026-09-11T16:00:00Z',
  },
  {
    id: 'rec-5',
    name: 'HAWASA D/MIHRETK/GEBRIEL GED/S',
    bankName: 'Commercial Bank of Ethiopia',
    bankKey: 'cbe',
    accountNumber: '1000097245437',
    createdAt: '2026-09-11T14:30:00Z',
  },
  {
    id: 'rec-6',
    name: 'Mrs Meseret Kiros Kebede',
    bankName: 'Commercial Bank of Ethiopia',
    bankKey: 'cbe',
    accountNumber: '1000184758291',
    createdAt: '2026-09-10T09:40:00Z',
  },
];

export const DEFAULT_TELEBIRR_REGISTERED_ACCOUNTS: TelebirrRegisteredAccount[] = [
  {
    id: 'reg-1',
    name: 'Mr Leykun Jemaneh Yilma',
    bankName: 'Commercial Bank of Ethiopia',
    bankKey: 'cbe',
    accountNumber: '1000419524747',
    registeredAt: '2026/09/10 12:30:00',
    transactionCount: 4,
    lastUsedAt: '2026/09/12 12:35:27',
  },
  {
    id: 'reg-2',
    name: 'LEYKUN JEMANEH YILAM',
    bankName: 'Bank of Abyssinia',
    bankKey: 'abyssinia',
    accountNumber: '56848096',
    registeredAt: '2026/09/11 11:20:00',
    transactionCount: 2,
    lastUsedAt: '2026/09/12 11:20:00',
  },
  {
    id: 'reg-3',
    name: 'MAHLET JEMANEH YILMA',
    bankName: 'Dashen Bank',
    bankKey: 'dashen',
    accountNumber: '5265422310011',
    registeredAt: '2026/09/11 10:15:00',
    transactionCount: 3,
    lastUsedAt: '2026/09/12 10:15:00',
  },
  {
    id: 'reg-4',
    name: 'Mrs Mahlet Jemaneh Yilma',
    bankName: 'Commercial Bank of Ethiopia',
    bankKey: 'cbe',
    accountNumber: '1000284597749',
    registeredAt: '2026/09/11 16:00:00',
    transactionCount: 1,
    lastUsedAt: '2026/09/11 16:00:00',
  },
  {
    id: 'reg-5',
    name: 'HAWASA D/MIHRETK/GEBRIEL GED/S',
    bankName: 'Commercial Bank of Ethiopia',
    bankKey: 'cbe',
    accountNumber: '1000097245437',
    registeredAt: '2026/09/11 14:30:00',
    transactionCount: 1,
    lastUsedAt: '2026/09/11 14:30:00',
  },
  {
    id: 'reg-6',
    name: 'Mrs Meseret Kiros Kebede',
    bankName: 'Commercial Bank of Ethiopia',
    bankKey: 'cbe',
    accountNumber: '1000184758291',
    registeredAt: '2026/09/10 09:40:00',
    transactionCount: 1,
    lastUsedAt: '2026/09/10 09:40:00',
  },
];

export const INITIAL_TELEBIRR_STATE: TelebirrAccountState = {
  phone: '0911048011',
  userName: 'Leykun',
  displayName: 'Selam, Leykun',
  holderFullName: 'Mr Leykun Jemaneh Yilma',
  balance: 41865.79,
  endekiseBalance: 0.00,
  rewardBalance: 150.00,
  showBalance: true,
  showEndekise: false,
  showReward: false,
  notificationCount: 2,
  language: 'English',
  customButtonLogos: {},
  recentRecipients: DEFAULT_TELEBIRR_RECENTS,
  registeredBankAccounts: DEFAULT_TELEBIRR_REGISTERED_ACCOUNTS,
  transactions: [
    {
      id: 'tx-init-1',
      txNumber: 'DICONUZ76Y',
      txTime: '2026/09/12 12:35:27',
      txType: 'Transfer To Bank',
      recipientName: 'Mr Leykun Jemaneh Yilma',
      bankName: 'Commercial Bank of Ethiopia',
      bankKey: 'cbe',
      accountNumber: '1000419524747',
      amount: 100.00,
      serviceFee: 1.00,
      totalDeducted: 101.00,
      notes: '',
      status: 'successful',
    }
  ],
};

export class TelebirrService {
  private static listeners: Set<(state: TelebirrAccountState) => void> = new Set();

  /**
   * Subscribe to account state updates across components
   */
  static subscribe(listener: (state: TelebirrAccountState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notify(state: TelebirrAccountState): void {
    this.listeners.forEach((fn) => {
      try {
        fn(state);
      } catch (err) {
        console.error('[TelebirrService] Listener error:', err);
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('telebirr_account_updated', { detail: state }));
    }
  }

  /**
   * Fetch current account state with full defensive fallback normalization
   */
  static getState(): TelebirrAccountState {
    try {
      const raw = localStorage.getItem(TELEBIRR_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);

        // Purge any stale customHeaderBgImage screenshot that causes text doubling
        if (parsed.customHeaderBgImage) {
          delete parsed.customHeaderBgImage;
          delete parsed.useSampleBalanceCard;
          delete parsed.headerBgFit;
          try {
            localStorage.setItem(TELEBIRR_STORAGE_KEY, JSON.stringify(parsed));
          } catch {}
        }
        
        // Ensure balance is always a valid finite number
        const safeBalance = typeof parsed.balance === 'number' && !isNaN(parsed.balance)
          ? parsed.balance
          : (parseFloat(parsed.balance) || 41865.79);
          
        const safeEndekise = typeof parsed.endekiseBalance === 'number' && !isNaN(parsed.endekiseBalance)
          ? parsed.endekiseBalance
          : (parseFloat(parsed.endekiseBalance) || 0.00);

        const safeReward = typeof parsed.rewardBalance === 'number' && !isNaN(parsed.rewardBalance)
          ? parsed.rewardBalance
          : (parseFloat(parsed.rewardBalance) || 150.00);

        const safeRecents = Array.isArray(parsed.recentRecipients) && parsed.recentRecipients.length > 0
          ? parsed.recentRecipients
          : DEFAULT_TELEBIRR_RECENTS;

        const safeRegistered = Array.isArray(parsed.registeredBankAccounts) && parsed.registeredBankAccounts.length > 0
          ? parsed.registeredBankAccounts
          : DEFAULT_TELEBIRR_REGISTERED_ACCOUNTS;

        const safeUserName = parsed.userName 
          || (parsed.displayName ? parsed.displayName.replace(/^Selam,\s*/, '') : 'Leykun');
        const safeDisplayName = parsed.displayName 
          || `Selam, ${safeUserName}`;
        const safeNotifCount = typeof parsed.notificationCount === 'number' && !isNaN(parsed.notificationCount)
          ? Math.max(0, parsed.notificationCount)
          : 2;
        const safeLang = parsed.language || 'English';

        return {
          ...INITIAL_TELEBIRR_STATE,
          ...parsed,
          userName: safeUserName,
          displayName: safeDisplayName,
          balance: safeBalance,
          endekiseBalance: safeEndekise,
          rewardBalance: safeReward,
          showBalance: parsed.showBalance !== undefined ? Boolean(parsed.showBalance) : true,
          showEndekise: parsed.showEndekise !== undefined ? Boolean(parsed.showEndekise) : false,
          showReward: parsed.showReward !== undefined ? Boolean(parsed.showReward) : false,
          notificationCount: safeNotifCount,
          language: safeLang,
          customButtonLogos: parsed.customButtonLogos || {},
          recentRecipients: safeRecents,
          registeredBankAccounts: safeRegistered,
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : INITIAL_TELEBIRR_STATE.transactions,
        };
      }
    } catch (e) {
      console.error('[TelebirrService] Failed to load state:', e);
    }
    return { ...INITIAL_TELEBIRR_STATE, customButtonLogos: {} };
  }

  /**
   * Get single source of truth AccountData representation
   */
  static getAccountData(): AccountData {
    const s = this.getState();
    return {
      name: s.userName || 'Leykun',
      balance: s.balance,
      endekise: s.endekiseBalance,
      reward: s.rewardBalance,
      showBalance: s.showBalance,
      showEndekise: s.showEndekise,
      showReward: s.showReward,
      notificationCount: s.notificationCount,
      language: s.language,
    };
  }

  /**
   * Save account state and dispatch reactive updates
   */
  static saveState(state: TelebirrAccountState): void {
    try {
      localStorage.setItem(TELEBIRR_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('[TelebirrService] Failed to save state:', e);
    }
    this.notify(state);
  }

  /**
   * Set user name and auto-update greeting
   */
  static setName(name: string): void {
    const s = this.getState();
    const cleanName = name.trim() || 'Leykun';
    s.userName = cleanName;
    s.displayName = `Selam, ${cleanName}`;
    this.saveState(s);
  }

  /**
   * Set main balance directly
   */
  static setBalance(balance: number): void {
    const s = this.getState();
    s.balance = typeof balance === 'number' && !isNaN(balance) ? Math.max(0, balance) : 0;
    this.saveState(s);
  }

  /**
   * Set Endekise balance directly
   */
  static setEndekise(amount: number): void {
    const s = this.getState();
    s.endekiseBalance = typeof amount === 'number' && !isNaN(amount) ? Math.max(0, amount) : 0;
    this.saveState(s);
  }

  /**
   * Set Reward balance directly
   */
  static setReward(amount: number): void {
    const s = this.getState();
    s.rewardBalance = typeof amount === 'number' && !isNaN(amount) ? Math.max(0, amount) : 0;
    this.saveState(s);
  }

  /**
   * Set notification count
   */
  static setNotificationCount(count: number): void {
    const s = this.getState();
    s.notificationCount = Math.max(0, Math.floor(count || 0));
    this.saveState(s);
  }

  /**
   * Set language
   */
  static setLanguage(language: string): void {
    const s = this.getState();
    s.language = language;
    this.saveState(s);
  }

  /**
   * Update partial account data (single source of truth helper)
   */
  static updateAccountData(partial: Partial<AccountData>): void {
    const s = this.getState();
    if (partial.name !== undefined) {
      s.userName = partial.name.trim();
      s.displayName = `Selam, ${partial.name.trim()}`;
    }
    if (partial.balance !== undefined) s.balance = Math.max(0, partial.balance);
    if (partial.endekise !== undefined) s.endekiseBalance = Math.max(0, partial.endekise);
    if (partial.reward !== undefined) s.rewardBalance = Math.max(0, partial.reward);
    if (partial.showBalance !== undefined) s.showBalance = partial.showBalance;
    if (partial.showEndekise !== undefined) s.showEndekise = partial.showEndekise;
    if (partial.showReward !== undefined) s.showReward = partial.showReward;
    if (partial.notificationCount !== undefined) s.notificationCount = Math.max(0, partial.notificationCount);
    if (partial.language !== undefined) s.language = partial.language;
    this.saveState(s);
  }

  /**
   * Toggle visibility of main balance
   */
  static toggleBalanceVisibility(): boolean {
    const s = this.getState();
    s.showBalance = !s.showBalance;
    this.saveState(s);
    return s.showBalance;
  }

  /**
   * Toggle Endekise balance
   */
  static toggleEndekiseVisibility(): boolean {
    const s = this.getState();
    s.showEndekise = !s.showEndekise;
    this.saveState(s);
    return s.showEndekise;
  }

  /**
   * Toggle Reward balance
   */
  static toggleRewardVisibility(): boolean {
    const s = this.getState();
    s.showReward = !s.showReward;
    this.saveState(s);
    return s.showReward;
  }

  /**
   * Clear all recent recipients
   */
  static clearRecents(): void {
    const s = this.getState();
    s.recentRecipients = [];
    this.saveState(s);
  }

  /**
   * Set or update custom logos for Ethio Telecom and Telebirr
   */
  static setCustomLogos(logos: { ethioTelecomLogo?: string | null; telebirrLogo?: string | null }): void {
    const s = this.getState();
    if (logos.ethioTelecomLogo !== undefined) {
      s.customEthioTelecomLogo = logos.ethioTelecomLogo === null ? undefined : logos.ethioTelecomLogo;
    }
    if (logos.telebirrLogo !== undefined) {
      s.customTelebirrLogo = logos.telebirrLogo === null ? undefined : logos.telebirrLogo;
    }
    this.saveState(s);
  }

  /**
   * Reset logos to default built-in SVG branding
   */
  static resetLogos(): void {
    const s = this.getState();
    delete s.customEthioTelecomLogo;
    delete s.customTelebirrLogo;
    this.saveState(s);
  }

  /**
   * Set or remove custom header background image
   */
  static setHeaderBgImage(image: string | null, fit?: 'cover' | 'contain' | '100% 100%'): void {
    const s = this.getState();
    if (image === null) {
      delete s.customHeaderBgImage;
      delete s.useSampleBalanceCard;
    } else {
      s.customHeaderBgImage = image;
      s.useSampleBalanceCard = true; // Auto-activate on upload
      if (fit) s.headerBgFit = fit;
    }
    this.saveState(s);
  }

  /**
   * Set background scaling fit
   */
  static setHeaderBgFit(fit: 'cover' | 'contain' | '100% 100%'): void {
    const s = this.getState();
    s.headerBgFit = fit;
    this.saveState(s);
  }

  /**
   * Toggle using sample balance card on home card
   */
  static setUseSampleCard(use: boolean): void {
    const s = this.getState();
    s.useSampleBalanceCard = use;
    this.saveState(s);
  }

  /**
   * Reset header background image to official SVG wave
   */
  static resetHeaderBgImage(): void {
    const s = this.getState();
    delete s.customHeaderBgImage;
    delete s.useSampleBalanceCard;
    delete s.headerBgFit;
    this.saveState(s);
  }

  /**
   * Set or remove custom logo for a specific service button
   */
  static setCustomButtonLogo(buttonKey: string, logo: string | null): void {
    const s = this.getState();
    if (!s.customButtonLogos) s.customButtonLogos = {};
    if (logo === null) {
      delete s.customButtonLogos[buttonKey];
    } else {
      s.customButtonLogos[buttonKey] = logo;
    }
    this.saveState(s);
  }

  /**
   * Reset all custom button logos back to default icons
   */
  static resetAllButtonLogos(): void {
    const s = this.getState();
    s.customButtonLogos = {};
    this.saveState(s);
  }

  /**
   * Update display name and holder name
   */
  static updateDisplayName(displayName: string, holderFullName?: string): void {
    const s = this.getState();
    const clean = displayName.trim();
    if (clean.toLowerCase().startsWith('selam,')) {
      const extracted = clean.replace(/^selam,\s*/i, '').trim();
      s.userName = extracted || 'Leykun';
      s.displayName = clean;
    } else {
      s.userName = clean || 'Leykun';
      s.displayName = `Selam, ${clean || 'Leykun'}`;
    }
    if (holderFullName) s.holderFullName = holderFullName;
    this.saveState(s);
  }

  /**
   * Update balances
   */
  static updateBalances(balances: { balance?: number; endekiseBalance?: number; rewardBalance?: number }): void {
    const s = this.getState();
    if (balances.balance !== undefined) s.balance = balances.balance;
    if (balances.endekiseBalance !== undefined) s.endekiseBalance = balances.endekiseBalance;
    if (balances.rewardBalance !== undefined) s.rewardBalance = balances.rewardBalance;
    this.saveState(s);
  }

  /**
   * Generate an authentic telebirr transaction reference (e.g. DICONUZ76Y)
   */
  static generateTxNumber(): string {
    const alphanum = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = 'DI';
    for (let i = 0; i < 8; i++) {
      res += alphanum.charAt(Math.floor(Math.random() * alphanum.length));
    }
    return res;
  }

  /**
   * Format current time as Telebirr standard: 2026/09/13 11:04:44
   */
  static formatCurrentTime(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }

  /**
   * Register a bank account inside Profile Account list
   */
  static registerBankAccount(account: {
    name: string;
    bankName: string;
    bankKey: string;
    accountNumber: string;
  }): TelebirrRegisteredAccount {
    const state = this.getState();
    const timeFormatted = this.formatCurrentTime();

    const existingIndex = state.registeredBankAccounts.findIndex(
      (a) => a.accountNumber === account.accountNumber || (a.name.toLowerCase() === account.name.toLowerCase() && a.bankKey === account.bankKey)
    );

    let regAcc: TelebirrRegisteredAccount;

    if (existingIndex !== -1) {
      regAcc = state.registeredBankAccounts[existingIndex];
      regAcc.transactionCount = (regAcc.transactionCount || 1) + 1;
      regAcc.lastUsedAt = timeFormatted;
      regAcc.name = account.name || regAcc.name;
      regAcc.bankName = account.bankName || regAcc.bankName;
      // Move to top
      state.registeredBankAccounts.splice(existingIndex, 1);
      state.registeredBankAccounts.unshift(regAcc);
    } else {
      regAcc = {
        id: `reg-${Date.now()}`,
        name: account.name,
        bankName: account.bankName,
        bankKey: account.bankKey,
        accountNumber: account.accountNumber,
        registeredAt: timeFormatted,
        transactionCount: 1,
        lastUsedAt: timeFormatted,
      };
      state.registeredBankAccounts.unshift(regAcc);
    }

    this.saveState(state);
    return regAcc;
  }

  /**
   * Remove a registered account from Profile Account list
   */
  static removeRegisteredAccount(id: string): void {
    const state = this.getState();
    state.registeredBankAccounts = state.registeredBankAccounts.filter((a) => a.id !== id);
    this.saveState(state);
  }

  /**
   * Execute transfer to bank
   * MANDATORY REQUIREMENT: Registers account inside profile account list for each transaction made in Banking
   */
  static executeTransfer(params: {
    recipientName: string;
    bankName: string;
    bankKey: string;
    accountNumber: string;
    amount: number;
    notes?: string;
  }): TelebirrTransaction {
    const state = this.getState();
    const serviceFee = 1.00; // Telebirr standard tariff for transfer to bank
    const totalDeducted = params.amount + serviceFee;

    // Deduct balance
    state.balance = Math.max(0, state.balance - totalDeducted);

    const timeFormatted = this.formatCurrentTime();

    const newTx: TelebirrTransaction = {
      id: `tb-tx-${Date.now()}`,
      txNumber: this.generateTxNumber(),
      txTime: timeFormatted,
      txType: 'Transfer To Bank',
      recipientName: params.recipientName || 'Mr Leykun Jemaneh Yilma',
      bankName: params.bankName || 'Commercial Bank of Ethiopia',
      bankKey: params.bankKey || 'cbe',
      accountNumber: params.accountNumber || '1000419524747',
      amount: params.amount,
      serviceFee,
      totalDeducted,
      notes: params.notes || '',
      status: 'successful',
    };

    // 1. Add to recent recipients if not already first
    const existingRecIndex = state.recentRecipients.findIndex((r) => r.accountNumber === params.accountNumber);
    if (existingRecIndex !== -1) {
      state.recentRecipients.splice(existingRecIndex, 1);
    }
    state.recentRecipients.unshift({
      id: `rec-${Date.now()}`,
      name: params.recipientName,
      bankName: params.bankName,
      bankKey: params.bankKey,
      accountNumber: params.accountNumber,
      createdAt: new Date().toISOString(),
    });

    // 2. USER MANDATE: For each Transaction made in Banking, register account inside profile account list
    const existingRegIndex = state.registeredBankAccounts.findIndex(
      (a) => a.accountNumber === params.accountNumber || (a.name.toLowerCase() === params.recipientName.toLowerCase() && a.bankKey === params.bankKey)
    );

    if (existingRegIndex !== -1) {
      const regAcc = state.registeredBankAccounts[existingRegIndex];
      regAcc.transactionCount = (regAcc.transactionCount || 1) + 1;
      regAcc.lastUsedAt = timeFormatted;
      regAcc.name = params.recipientName;
      regAcc.bankName = params.bankName;
      state.registeredBankAccounts.splice(existingRegIndex, 1);
      state.registeredBankAccounts.unshift(regAcc);
    } else {
      state.registeredBankAccounts.unshift({
        id: `reg-${Date.now()}`,
        name: params.recipientName,
        bankName: params.bankName,
        bankKey: params.bankKey,
        accountNumber: params.accountNumber,
        registeredAt: timeFormatted,
        transactionCount: 1,
        lastUsedAt: timeFormatted,
      });
    }

    state.transactions = [newTx, ...state.transactions];
    this.saveState(state);

    return newTx;
  }

  /**
   * Receive money into Telebirr
   * Increases balance, records transaction, and optionally registers bank account if deposited from bank
   */
  static receiveMoney(params: {
    senderName: string;
    amount: number;
    sourceBank?: string;
    bankKey?: string;
    senderAccount?: string;
    depositMethod?: string;
    notes?: string;
  }): { tx: TelebirrTransaction; newBalance: number } {
    const state = this.getState();
    const timeFormatted = this.formatCurrentTime();

    state.balance += params.amount;

    const newTx: TelebirrTransaction = {
      id: `tb-tx-${Date.now()}`,
      txNumber: this.generateTxNumber(),
      txTime: timeFormatted,
      txType: params.sourceBank ? 'Deposit from Bank' : 'Receive Money',
      recipientName: state.displayName || 'Selam, Leykun',
      bankName: params.sourceBank || params.depositMethod || 'Telebirr P2P',
      bankKey: params.bankKey || 'telebirr',
      accountNumber: params.senderAccount || params.senderName,
      amount: params.amount,
      serviceFee: 0.00,
      totalDeducted: -params.amount, // negative signifies credit
      notes: params.notes || `Received from ${params.senderName}`,
      status: 'successful',
    };

    // If money received from bank with an account, register it into profile accounts
    if (params.sourceBank && params.senderAccount) {
      const existingRegIndex = state.registeredBankAccounts.findIndex(
        (a) => a.accountNumber === params.senderAccount
      );
      if (existingRegIndex !== -1) {
        state.registeredBankAccounts[existingRegIndex].transactionCount += 1;
        state.registeredBankAccounts[existingRegIndex].lastUsedAt = timeFormatted;
      } else {
        state.registeredBankAccounts.unshift({
          id: `reg-${Date.now()}`,
          name: params.senderName,
          bankName: params.sourceBank,
          bankKey: params.bankKey || 'cbe',
          accountNumber: params.senderAccount,
          registeredAt: timeFormatted,
          transactionCount: 1,
          lastUsedAt: timeFormatted,
        });
      }
    }

    state.transactions = [newTx, ...state.transactions];
    this.saveState(state);

    return { tx: newTx, newBalance: state.balance };
  }

  /**
   * Send money to a Telebirr mobile recipient
   * Decreases balance, records transaction
   */
  static sendMoneyToMobile(params: {
    recipientPhone: string;
    recipientName: string;
    amount: number;
    notes?: string;
  }): { tx: TelebirrTransaction; newBalance: number } {
    const state = this.getState();
    const timeFormatted = this.formatCurrentTime();

    state.balance = Math.max(0, state.balance - params.amount);

    const newTx: TelebirrTransaction = {
      id: `tb-tx-${Date.now()}`,
      txNumber: this.generateTxNumber(),
      txTime: timeFormatted,
      txType: 'Send Money',
      recipientName: params.recipientName,
      bankName: 'Telebirr Mobile',
      bankKey: 'telebirr',
      accountNumber: params.recipientPhone,
      amount: params.amount,
      serviceFee: 0.00,
      totalDeducted: params.amount,
      notes: params.notes || '',
      status: 'successful',
    };

    state.transactions = [newTx, ...state.transactions];
    this.saveState(state);

    return { tx: newTx, newBalance: state.balance };
  }

  /**
   * Reset state to defaults
   */
  static resetToDefault(): TelebirrAccountState {
    this.saveState(INITIAL_TELEBIRR_STATE);
    return INITIAL_TELEBIRR_STATE;
  }
}

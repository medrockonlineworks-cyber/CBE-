// Dashen Bank Super App Service & State Engine
// Manages Dashen account balance, transactions, inter-bank transfers, and registered accounts.
import { PushNotificationService } from './pushNotificationService';

export interface DashenTransaction {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  type: 'debit' | 'credit';
  channel: 'super_app' | 'all_channels';
  date: string; // e.g. "16/7/2026"
  timestamp: number;
  recipientAccount?: string;
  recipientName?: string;
  senderAccount?: string;
  senderName?: string;
  reference?: string;
  bankName?: string;
}

export interface DashenAccount {
  accountNumber: string;
  accountName: string;
  accountType: string;
  balance: number;
  currency: string;
  isPrimary: boolean;
  branchName: string;
}

export interface DashenRegisteredAccount {
  accountNumber: string;
  accountName: string;
  bankName: string;
  phone?: string;
  addedAt: string;
  source: 'cbe_incoming' | 'manual' | 'transfer';
}

const DASHEN_ACCOUNT_STORAGE_KEY = 'tana_dashen_account_data';
const DASHEN_TRANSACTIONS_STORAGE_KEY = 'tana_dashen_transactions_data';
const DASHEN_REGISTERED_ACCOUNTS_STORAGE_KEY = 'tana_dashen_registered_accounts_data';
const DASHEN_NOTIFICATIONS_STORAGE_KEY = 'tana_dashen_notifications_data';
const DASHEN_CUSTOM_LOGO_STORAGE_KEY = 'tana_dashen_custom_logo';
const DASHEN_CUSTOM_BG_STORAGE_KEY = 'tana_dashen_custom_bg';

// Initial state matching exact screenshots (Screenshot_20260909-123028, 123057, 123108)
const INITIAL_DASHEN_ACCOUNT: DashenAccount = {
  accountNumber: '5502877108011',
  accountName: 'Leykun Jemaneh Yilma',
  accountType: 'Amana Savings Account',
  balance: 778.18, // Matches exact balance in Screenshot_20260909-123028.png
  currency: 'ETB',
  isPrimary: true,
  branchName: 'Addis Ababa Central Branch'
};

// Initial transactions matching Screenshots 123057 and 123108
const INITIAL_DASHEN_TRANSACTIONS: DashenTransaction[] = [
  // All Channels transactions (Screenshot_20260909-123108)
  {
    id: 'tx_dash_1',
    title: 'Cost Of Dashen Branded Card',
    subtitle: 'Card Application Joining Fee',
    amount: 70.00,
    type: 'debit',
    channel: 'all_channels',
    date: '16/7/2026',
    timestamp: new Date('2026-07-16T10:00:00Z').getTime(),
    reference: 'REF-DCARD-70'
  },
  {
    id: 'tx_dash_2',
    title: 'Tell Birr Supper App. Payble',
    subtitle: 'Telebirr Transfer',
    amount: 6.00,
    type: 'debit',
    channel: 'all_channels',
    date: '14/7/2026',
    timestamp: new Date('2026-07-14T14:30:00Z').getTime(),
    reference: 'REF-TBIRR-6'
  },
  {
    id: 'tx_dash_3',
    title: 'Tell Birr Supper App. Payble',
    subtitle: 'Telebirr Transfer',
    amount: 3000.00,
    type: 'debit',
    channel: 'all_channels',
    date: '14/7/2026',
    timestamp: new Date('2026-07-14T14:28:00Z').getTime(),
    reference: 'REF-TBIRR-3000'
  },
  {
    id: 'tx_dash_4',
    title: 'Ips Incoming With Product Code Iiot',
    subtitle: 'Mscwt##Cbetetaa ##Transferring My Fun...',
    amount: 100.00,
    type: 'credit',
    channel: 'all_channels',
    date: '10/7/2026',
    timestamp: new Date('2026-07-10T11:15:00Z').getTime(),
    reference: 'REF-IPS-100',
    senderName: 'Leykun Jemaneh Ylma',
    senderAccount: '1000419524747',
    bankName: 'Commercial Bank of Ethiopia'
  },
  {
    id: 'tx_dash_5',
    title: 'Telebirr Receivable Account For Cash-...',
    subtitle: 'Ref No:Dg33i79ma7| Sender Name:Leykun J...',
    amount: 180.00,
    type: 'credit',
    channel: 'all_channels',
    date: '03/7/2026',
    timestamp: new Date('2026-07-03T09:40:00Z').getTime(),
    reference: 'REF-TBIRR-180',
    senderName: 'Leykun Jemaneh'
  },

  // Super App transactions (Screenshot_20260909-123057)
  {
    id: 'tx_dash_sa_1',
    title: 'Leykun Jemaneh Yilma',
    subtitle: 'Telebirr Transfer',
    amount: 3006.00,
    type: 'debit',
    channel: 'super_app',
    date: '14/7/2026',
    timestamp: new Date('2026-07-14T14:32:00Z').getTime(),
    reference: 'REF-SA-3006'
  },
  {
    id: 'tx_dash_sa_2',
    title: 'Leykun Jemaneh Yilma',
    subtitle: 'Card Issuance Fee',
    amount: 575.00,
    type: 'debit',
    channel: 'super_app',
    date: '10/6/2026',
    timestamp: new Date('2026-06-10T16:20:00Z').getTime(),
    reference: 'REF-SA-575'
  }
];

// Initial registered accounts known to Dashen Bank
const INITIAL_REGISTERED_ACCOUNTS: DashenRegisteredAccount[] = [
  {
    accountNumber: '1000419524747',
    accountName: 'Leykun Jemaneh Ylma',
    bankName: 'Commercial Bank of Ethiopia',
    phone: '+251900112233',
    addedAt: '2026-07-10',
    source: 'cbe_incoming'
  },
  {
    accountNumber: '5501988223311',
    accountName: 'Selamawit Tekle',
    bankName: 'Dashen Bank',
    phone: '+251912345678',
    addedAt: '2026-07-01',
    source: 'manual'
  },
  {
    accountNumber: '5503445566778',
    accountName: 'Abebe Kebede',
    bankName: 'Dashen Bank',
    phone: '+251911223344',
    addedAt: '2026-06-15',
    source: 'manual'
  }
];

export class DashenBankService {
  /**
   * Get the current Dashen Account data
   */
  static getAccount(): DashenAccount {
    try {
      const stored = localStorage.getItem(DASHEN_ACCOUNT_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    this.saveAccount(INITIAL_DASHEN_ACCOUNT);
    return INITIAL_DASHEN_ACCOUNT;
  }

  /**
   * Save the Dashen Account data
   */
  static saveAccount(acc: DashenAccount): void {
    try {
      localStorage.setItem(DASHEN_ACCOUNT_STORAGE_KEY, JSON.stringify(acc));
      this.dispatchUpdate();
    } catch (e) {
      console.error('[DashenBankService] Failed to save account:', e);
    }
  }

  /**
   * Get all transactions
   */
  static getTransactions(): DashenTransaction[] {
    try {
      const stored = localStorage.getItem(DASHEN_TRANSACTIONS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    this.saveTransactions(INITIAL_DASHEN_TRANSACTIONS);
    return INITIAL_DASHEN_TRANSACTIONS;
  }

  /**
   * Save transactions
   */
  static saveTransactions(txs: DashenTransaction[]): void {
    try {
      localStorage.setItem(DASHEN_TRANSACTIONS_STORAGE_KEY, JSON.stringify(txs));
      this.dispatchUpdate();
    } catch (e) {
      console.error('[DashenBankService] Failed to save transactions:', e);
    }
  }

  /**
   * Get registered accounts
   */
  static getRegisteredAccounts(): DashenRegisteredAccount[] {
    try {
      const stored = localStorage.getItem(DASHEN_REGISTERED_ACCOUNTS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    this.saveRegisteredAccounts(INITIAL_REGISTERED_ACCOUNTS);
    return INITIAL_REGISTERED_ACCOUNTS;
  }

  /**
   * Save registered accounts
   */
  static saveRegisteredAccounts(accs: DashenRegisteredAccount[]): void {
    try {
      localStorage.setItem(DASHEN_REGISTERED_ACCOUNTS_STORAGE_KEY, JSON.stringify(accs));
      this.dispatchUpdate();
    } catch (e) {
      console.error('[DashenBankService] Failed to save registered accounts:', e);
    }
  }

  /**
   * Register or update an external account inside Dashen Bank
   */
  static registerAccount(
    accountNumber: string,
    accountName: string,
    bankName: string = 'Commercial Bank of Ethiopia',
    phone?: string,
    source: 'cbe_incoming' | 'manual' | 'transfer' = 'cbe_incoming'
  ): void {
    const cleanNum = accountNumber.replace(/\D/g, '');
    if (!cleanNum) return;

    const current = this.getRegisteredAccounts();
    const existingIndex = current.findIndex(a => a.accountNumber === cleanNum);

    const accountItem: DashenRegisteredAccount = {
      accountNumber: cleanNum,
      accountName,
      bankName,
      phone,
      addedAt: new Date().toISOString().split('T')[0],
      source
    };

    if (existingIndex >= 0) {
      current[existingIndex] = { ...current[existingIndex], ...accountItem };
    } else {
      current.unshift(accountItem);
    }

    this.saveRegisteredAccounts(current);
  }

  /**
   * Receive an incoming transfer from CBE, Telebirr, or Other Bank
   * This handles the core user requirement:
   * "When we transfer using other Bank and send to CBE to Dashin Bank the account will register inside this one Bank."
   */
  static receiveIncomingTransfer(params: {
    amount: number;
    senderName: string;
    senderAccount: string;
    senderBank?: string;
    reference?: string;
    description?: string;
  }): DashenTransaction {
    const { amount, senderName, senderAccount, senderBank = 'Commercial Bank of Ethiopia', reference, description } = params;

    // 1. Credit Dashen account balance
    const account = this.getAccount();
    account.balance = Number((account.balance + amount).toFixed(2));
    this.saveAccount(account);

    // 2. Automatically register sender account inside Dashen Bank!
    this.registerAccount(senderAccount, senderName, senderBank, undefined, 'cbe_incoming');

    // 3. Format today's date matching the screenshots (e.g. "10/7/2026")
    const now = new Date();
    const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    // 4. Create new transaction with the exact formatting seen in Dashen Bank screenshots
    const txId = 'tx_dash_' + Date.now();
    const cleanSubtitle = description 
      ? `Mscwt##${description.slice(0, 8)} ##Transferring My Fun...` 
      : `Mscwt##Cbetetaa ##Transferring My Fun...`;

    const newTx: DashenTransaction = {
      id: txId,
      title: 'Ips Incoming With Product Code Iiot', // Exact title from Screenshot_20260909-123108
      subtitle: cleanSubtitle,
      amount,
      type: 'credit',
      channel: 'all_channels', // Appears in All Channels
      date: formattedDate,
      timestamp: Date.now(),
      senderAccount,
      senderName,
      bankName: senderBank,
      reference: reference || `REF-IPS-${Date.now().toString().slice(-6)}`
    };

    const currentTxs = this.getTransactions();
    currentTxs.unshift(newTx);
    this.saveTransactions(currentTxs);

    // 5. Add notification
    const notifBody = `ETB ${amount.toFixed(2)} received from ${senderName} (${senderBank}). Ref: ${newTx.reference}`;
    this.addNotification({
      title: 'Transfer Received',
      body: notifBody,
      time: 'Just now'
    });

    void PushNotificationService.notifySubApp({
      subAppId: 'dashen',
      title: 'DashenBank • Transfer Received',
      body: notifBody,
      privateBody: 'You have received a new Dashen Bank transfer.',
      reference: newTx.reference,
      tag: `cbe-dashen-${newTx.id}`,
    });

    return newTx;
  }

  /**
   * Execute an outgoing transfer from Dashen Bank
   */
  static transferToAccount(params: {
    recipientAccount: string;
    recipientName: string;
    amount: number;
    remark?: string;
    recipientBank?: string; // 'Dashen Bank' or 'Commercial Bank of Ethiopia', etc.
  }): { success: boolean; tx?: DashenTransaction; error?: string } {
    const { recipientAccount, recipientName, amount, remark, recipientBank = 'Dashen Bank' } = params;

    const account = this.getAccount();
    const fee = 0.00; // Free or minimal transfer fee
    const totalDeduct = amount + fee;

    if (account.balance < totalDeduct) {
      return {
        success: false,
        error: `Insufficient Dashen balance. You have ETB ${account.balance.toFixed(2)}, required ETB ${totalDeduct.toFixed(2)}.`
      };
    }

    // Deduct balance
    account.balance = Number((account.balance - totalDeduct).toFixed(2));
    this.saveAccount(account);

    // Register recipient account inside Dashen Bank
    this.registerAccount(recipientAccount, recipientName, recipientBank, undefined, 'transfer');

    // Date
    const now = new Date();
    const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    // Create transaction (shows in both Super App and All Channels)
    const isToDashen = recipientBank === 'Dashen Bank' || recipientAccount.startsWith('550');
    const title = isToDashen ? recipientName : `Transfer To ${recipientBank}`;
    const subtitle = isToDashen ? 'Dashen Account Transfer' : (remark || 'Inter-Bank Transfer');

    const newTx: DashenTransaction = {
      id: 'tx_dash_' + Date.now(),
      title,
      subtitle,
      amount,
      type: 'debit',
      channel: 'super_app',
      date: formattedDate,
      timestamp: Date.now(),
      recipientAccount,
      recipientName,
      bankName: recipientBank,
      reference: `REF-DASH-${Date.now().toString().slice(-6)}`
    };

    const txs = this.getTransactions();
    txs.unshift(newTx);
    this.saveTransactions(txs);

    // Notification
    const sentBody = `ETB ${amount.toFixed(2)} transferred to ${recipientName} (${recipientAccount}).`;
    this.addNotification({
      title: 'Transfer Sent',
      body: sentBody,
      time: 'Just now'
    });

    void PushNotificationService.notifySubApp({
      subAppId: 'dashen',
      title: 'DashenBank • Transfer Sent',
      body: sentBody,
      privateBody: 'A Dashen Bank transfer was completed.',
      reference: newTx.reference,
      tag: `cbe-dashen-${newTx.id}`,
    });

    return { success: true, tx: newTx };
  }

  /**
   * Reset Dashen account & transactions to initial prototype state
   */
  static resetToDefault(): void {
    localStorage.removeItem(DASHEN_ACCOUNT_STORAGE_KEY);
    localStorage.removeItem(DASHEN_TRANSACTIONS_STORAGE_KEY);
    localStorage.removeItem(DASHEN_REGISTERED_ACCOUNTS_STORAGE_KEY);
    localStorage.removeItem(DASHEN_NOTIFICATIONS_STORAGE_KEY);
    this.dispatchUpdate();
  }

  /**
   * Notifications
   */
  static getNotifications(): { id: string; title: string; body: string; time: string; read: boolean }[] {
    try {
      const stored = localStorage.getItem(DASHEN_NOTIFICATIONS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: 'notif_1',
        title: 'Welcome to Dashen Super App',
        body: 'Experience modern banking, e-commerce, and fast digital transfers with Dashen Bank.',
        time: '2h ago',
        read: false
      },
      {
        id: 'notif_2',
        title: 'Security Alert',
        body: 'New biometric login verified on your device.',
        time: '1d ago',
        read: false
      }
    ];
  }

  static addNotification(notif: { title: string; body: string; time: string }): void {
    const list = this.getNotifications();
    list.unshift({
      id: 'notif_' + Date.now(),
      title: notif.title,
      body: notif.body,
      time: notif.time,
      read: false
    });
    try {
      localStorage.setItem(DASHEN_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
      this.dispatchUpdate();
    } catch {}
  }

  static markNotificationsRead(): void {
    const list = this.getNotifications().map(n => ({ ...n, read: true }));
    try {
      localStorage.setItem(DASHEN_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
      this.dispatchUpdate();
    } catch {}
  }

  /**
   * Custom Logo Management
   */
  static getCustomLogo(): string | null {
    try {
      return localStorage.getItem(DASHEN_CUSTOM_LOGO_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  static saveCustomLogo(logoDataUrl: string | null): void {
    try {
      if (logoDataUrl) {
        localStorage.setItem(DASHEN_CUSTOM_LOGO_STORAGE_KEY, logoDataUrl);
      } else {
        localStorage.removeItem(DASHEN_CUSTOM_LOGO_STORAGE_KEY);
      }
      this.dispatchUpdate();
    } catch (e) {
      console.error('Error saving Dashen custom logo:', e);
    }
  }

  static resetCustomLogo(): void {
    this.saveCustomLogo(null);
  }

  /**
   * Custom Background Image Management
   */
  static getCustomBgImage(): string | null {
    try {
      return localStorage.getItem(DASHEN_CUSTOM_BG_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  static saveCustomBgImage(bgDataUrl: string | null): void {
    try {
      if (bgDataUrl) {
        localStorage.setItem(DASHEN_CUSTOM_BG_STORAGE_KEY, bgDataUrl);
      } else {
        localStorage.removeItem(DASHEN_CUSTOM_BG_STORAGE_KEY);
      }
      this.dispatchUpdate();
    } catch (e) {
      console.error('Error saving Dashen custom background image:', e);
    }
  }

  static resetCustomBgImage(): void {
    this.saveCustomBgImage(null);
  }

  private static dispatchUpdate(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tana_dashen_updated'));
    }
  }
}

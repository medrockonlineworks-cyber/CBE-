import React, { createContext, useContext, useState, useEffect } from 'react';
import { TelebirrTransaction, TelebirrRecentRecipient, DEFAULT_TELEBIRR_RECENTS } from '../services/telebirrService';

export type SubView = 
  | 'home' 
  | '/send' 
  | '/transfer-to-bank' 
  | '/payment' 
  | '/apps' 
  | '/engage' 
  | '/account' 
  | '/transactions' 
  | '/qr-scanner';

export interface WalletContextType {
  balance: number;
  endekiseBalance: number;
  rewardBalance: number;
  isBalanceVisible: boolean;
  isEndekiseVisible: boolean;
  isRewardVisible: boolean;
  toggleMainBalance: () => void;
  toggleEndekiseBalance: () => void;
  toggleRewardBalance: () => void;
  setBalance: (amount: number) => void;
  setEndekiseBalance: (amount: number) => void;
  setRewardBalance: (amount: number) => void;
  language: 'en' | 'am';
  setLanguage: (lang: 'en' | 'am') => void;
  toggleLanguage: () => void;
  notificationCount: number;
  setNotificationCount: (count: number) => void;
  activeSubView: SubView;
  setActiveSubView: (view: SubView) => void;
  transactions: TelebirrTransaction[];
  addTransaction: (tx: Omit<TelebirrTransaction, 'id' | 'txNumber' | 'txTime'>) => TelebirrTransaction;
  selectedTransaction: TelebirrTransaction | null;
  setSelectedTransaction: (tx: TelebirrTransaction | null) => void;
  recentRecipients: TelebirrRecentRecipient[];
  addRecentRecipient: (rec: Omit<TelebirrRecentRecipient, 'id' | 'createdAt'>) => void;
  clearRecentRecipients: () => void;
  userName: string;
  setUserName: (name: string) => void;
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  customEthioLogo: string;
  setCustomEthioLogo: (url: string) => void;
  customTelebirrLogo: string;
  setCustomTelebirrLogo: (url: string) => void;
  customHeaderBgImage: string;
  setCustomHeaderBgImage: (url: string) => void;
  customButtonLogos: Record<string, string>;
  setCustomButtonLogo: (key: string, url: string) => void;
  isTelePlayOpen: boolean;
  setIsTelePlayOpen: (open: boolean) => void;
  resetAllData: () => void;
}

const STORAGE_KEY = 'telebirr_superapp_wallet_v2';

const INITIAL_TRANSACTIONS: TelebirrTransaction[] = [
  {
    id: 'tx-1',
    txNumber: 'DICONUZ76Y',
    txTime: '2026/09/25 15:42:19',
    txType: 'Transfer To Bank',
    recipientName: 'Mr Leykun Jemaneh Yilma',
    bankName: 'Commercial Bank of Ethiopia',
    bankKey: 'cbe',
    accountNumber: '1000419524747',
    amount: 100.00,
    serviceFee: 1.00,
    totalDeducted: 101.00,
    notes: 'Telebirr bank transfer',
    status: 'successful'
  },
  {
    id: 'tx-2',
    txNumber: 'DIC9741PL8',
    txTime: '2026/09/24 11:20:05',
    txType: 'Send Money',
    recipientName: 'Leykun Jemaneh',
    bankName: 'Telebirr P2P',
    bankKey: 'telebirr',
    accountNumber: '0926193920',
    amount: 250.00,
    serviceFee: 0.00,
    totalDeducted: 250.00,
    notes: 'Lunch reimbursement',
    status: 'successful'
  },
  {
    id: 'tx-3',
    txNumber: 'DIC4820LK2',
    txTime: '2026/09/23 09:15:44',
    txType: 'Buy Airtime',
    recipientName: 'Ethio Telecom Topup',
    bankName: 'Ethio Telecom',
    bankKey: 'ethio',
    accountNumber: '0926193920',
    amount: 50.00,
    serviceFee: 0.00,
    totalDeducted: 50.00,
    notes: 'Airtime 50 Birr Bundle',
    status: 'successful'
  },
  {
    id: 'tx-4',
    txNumber: 'DIC1948QW1',
    txTime: '2026/09/22 17:33:10',
    txType: 'Pay Merchant',
    recipientName: 'Zemen GEBEYA Supermarket',
    bankName: 'Telebirr Merchant',
    bankKey: 'merchant',
    accountNumber: '998412',
    amount: 620.50,
    serviceFee: 0.00,
    totalDeducted: 620.50,
    notes: 'Groceries payment',
    status: 'successful'
  },
  {
    id: 'tx-5',
    txNumber: 'DIC8834MN9',
    txTime: '2026/09/21 14:05:22',
    txType: 'Transfer To Bank',
    recipientName: 'LEYKUN JEMANEH YILAM',
    bankName: 'Bank of Abyssinia',
    bankKey: 'abyssinia',
    accountNumber: '56848096',
    amount: 500.00,
    serviceFee: 2.00,
    totalDeducted: 502.00,
    notes: 'Savings deposit',
    status: 'successful'
  }
];

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Saved state loader
  const loadSaved = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch {}
    return null;
  };

  const saved = loadSaved();

  // Balance states: specifications explicitly state 1,930.26 and 0.00
  const [balance, setBalance] = useState<number>(() => saved?.balance ?? 1930.26);
  const [endekiseBalance, setEndekiseBalance] = useState<number>(() => saved?.endekiseBalance ?? 1930.26);
  const [rewardBalance, setRewardBalance] = useState<number>(() => saved?.rewardBalance ?? 0.00);

  // Hidden state: default hidden as per Screenshot 1, with Endekise visible
  const [isBalanceVisible, setIsBalanceVisible] = useState<boolean>(() => saved?.isBalanceVisible ?? false);
  const [isEndekiseVisible, setIsEndekiseVisible] = useState<boolean>(() => saved?.isEndekiseVisible ?? true);
  const [isRewardVisible, setIsRewardVisible] = useState<boolean>(() => saved?.isRewardVisible ?? false);

  const [language, setLanguage] = useState<'en' | 'am'>(() => saved?.language ?? 'en');
  const [notificationCount, setNotificationCount] = useState<number>(() => saved?.notificationCount ?? 2);
  const [activeSubView, setActiveSubView] = useState<SubView>('home');
  const [transactions, setTransactions] = useState<TelebirrTransaction[]>(() => saved?.transactions ?? INITIAL_TRANSACTIONS);
  const [selectedTransaction, setSelectedTransaction] = useState<TelebirrTransaction | null>(null);
  const [recentRecipients, setRecentRecipients] = useState<TelebirrRecentRecipient[]>(() => saved?.recentRecipients ?? DEFAULT_TELEBIRR_RECENTS);
  
  const [userName, setUserName] = useState<string>(() => saved?.userName ?? 'Leykun');
  const [phoneNumber, setPhoneNumber] = useState<string>(() => saved?.phoneNumber ?? '0926193920');

  // Custom logos and graphics
  const [customEthioLogo, setCustomEthioLogo] = useState<string>(() => saved?.customEthioLogo ?? '');
  const [customTelebirrLogo, setCustomTelebirrLogo] = useState<string>(() => saved?.customTelebirrLogo ?? '');
  const [customHeaderBgImage, setCustomHeaderBgImage] = useState<string>(() => saved?.customHeaderBgImage ?? '');
  const [customButtonLogos, setCustomButtonLogos] = useState<Record<string, string>>(() => saved?.customButtonLogos ?? {});
  
  const [isTelePlayOpen, setIsTelePlayOpen] = useState<boolean>(false);

  // Auto save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        balance,
        endekiseBalance,
        rewardBalance,
        isBalanceVisible,
        isEndekiseVisible,
        isRewardVisible,
        language,
        notificationCount,
        transactions,
        recentRecipients,
        userName,
        phoneNumber,
        customEthioLogo,
        customTelebirrLogo,
        customHeaderBgImage,
        customButtonLogos
      }));
    } catch {}
  }, [
    balance,
    endekiseBalance,
    rewardBalance,
    isBalanceVisible,
    isEndekiseVisible,
    isRewardVisible,
    language,
    notificationCount,
    transactions,
    recentRecipients,
    userName,
    phoneNumber,
    customEthioLogo,
    customTelebirrLogo,
    customHeaderBgImage,
    customButtonLogos
  ]);

  // Synchronized main balance eye toggle
  const toggleMainBalance = () => {
    const nextState = !isBalanceVisible;
    setIsBalanceVisible(nextState);
    // Toggling main balance eye synchronizes all sub-balances
    setIsEndekiseVisible(nextState);
    setIsRewardVisible(nextState);
  };

  const toggleEndekiseBalance = () => {
    setIsEndekiseVisible(prev => !prev);
  };

  const toggleRewardBalance = () => {
    setIsRewardVisible(prev => !prev);
  };

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'am' : 'en'));
  };

  const addTransaction = (txData: Omit<TelebirrTransaction, 'id' | 'txNumber' | 'txTime'>) => {
    const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let randomCode = '';
    for (let i = 0; i < 8; i++) {
      randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const txNumber = `DIC${randomCode}`;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const txTime = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const newTx: TelebirrTransaction = {
      id: `tx-${Date.now()}`,
      txNumber,
      txTime,
      ...txData
    };

    setTransactions(prev => [newTx, ...prev]);

    // Deduct amount
    if (txData.status === 'successful') {
      setBalance(prev => Math.max(0, Number((prev - txData.totalDeducted).toFixed(2))));
    }

    return newTx;
  };

  const addRecentRecipient = (rec: Omit<TelebirrRecentRecipient, 'id' | 'createdAt'>) => {
    const newRec: TelebirrRecentRecipient = {
      id: `rec-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...rec
    };
    setRecentRecipients(prev => [newRec, ...prev.filter(r => r.accountNumber !== rec.accountNumber)].slice(0, 15));
  };

  const clearRecentRecipients = () => {
    setRecentRecipients([]);
  };

  const setCustomButtonLogo = (key: string, url: string) => {
    setCustomButtonLogos(prev => ({ ...prev, [key]: url }));
  };

  const resetAllData = () => {
    setBalance(1930.26);
    setEndekiseBalance(1930.26);
    setRewardBalance(0.00);
    setIsBalanceVisible(false);
    setIsEndekiseVisible(false);
    setIsRewardVisible(false);
    setUserName('Leykun');
    setPhoneNumber('0926193920');
    setTransactions(INITIAL_TRANSACTIONS);
    setRecentRecipients(DEFAULT_TELEBIRR_RECENTS);
    setCustomEthioLogo('');
    setCustomTelebirrLogo('');
    setCustomHeaderBgImage('');
    setCustomButtonLogos({});
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <WalletContext.Provider
      value={{
        balance,
        endekiseBalance,
        rewardBalance,
        isBalanceVisible,
        isEndekiseVisible,
        isRewardVisible,
        toggleMainBalance,
        toggleEndekiseBalance,
        toggleRewardBalance,
        setBalance,
        setEndekiseBalance,
        setRewardBalance,
        language,
        setLanguage,
        toggleLanguage,
        notificationCount,
        setNotificationCount,
        activeSubView,
        setActiveSubView,
        transactions,
        addTransaction,
        selectedTransaction,
        setSelectedTransaction,
        recentRecipients,
        addRecentRecipient,
        clearRecentRecipients,
        userName,
        setUserName,
        phoneNumber,
        setPhoneNumber,
        customEthioLogo,
        setCustomEthioLogo,
        customTelebirrLogo,
        setCustomTelebirrLogo,
        customHeaderBgImage,
        setCustomHeaderBgImage,
        customButtonLogos,
        setCustomButtonLogo,
        isTelePlayOpen,
        setIsTelePlayOpen,
        resetAllData
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

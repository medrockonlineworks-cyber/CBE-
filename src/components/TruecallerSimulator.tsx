import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, 
  X, 
  Sparkles, 
  Building2, 
  Plus, 
  Smartphone, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Copy, 
  ExternalLink,
  ChevronDown, 
  Check, 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  Music, 
  Play, 
  Send, 
  Paperclip, 
  Smile, 
  Mic, 
  Search, 
  MoreVertical, 
  Bell, 
  Home as HomeIcon, 
  User, 
  CheckCheck, 
  ThumbsUp, 
  ThumbsDown, 
  Download, 
  Tv, 
  ChevronRight, 
  CheckCircle2, 
  RotateCcw,
  Wifi,
  Battery,
  Phone,
  Video,
  PhoneCall,
  MessageSquare,
  Landmark,
  ShieldCheck,
  CreditCard,
  Sun,
  Moon,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { 
  TruecallerBankAccount, 
  TruecallerAlert, 
  TruecallerRole, 
  TruecallerBankKey,
  TruecallerBackgroundApp,
  TruecallerPhoneType
} from '../types/truecaller';
import { 
  TruecallerService, 
  BANK_PRESETS, 
  maskTruecallerAccount, 
  formatCurrentTimeString,
  getDefaultBackgroundApp
} from '../services/truecallerService';
import { LocalDb } from '../lib/mockData';
import { Transaction } from '../types';

interface TruecallerSimulatorProps {
  onBack: () => void;
}

// Synthesize pleasant SMS arrival alert chime using browser Web Audio API
function playTruecallerChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // Note 1 (587.33 Hz - D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Note 2 (880 Hz - A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.08);
    gain2.gain.setValueAtTime(0.18, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.42);
  } catch {
    // Audio context may fail if blocked by browser policy until interaction
  }
}

// Conversation thread item for Google Messages Inbox (matching user's screenshot)
interface GoogleMessagesThreadItem {
  id: string;
  sender: string;
  bankKey?: TruecallerBankKey;
  avatarColor: string;
  snippet: string;
  timeLabel: string;
  unreadCount: number;
  isBank?: boolean;
}

// Seeded threads matching user's uploaded Screenshot_20260904-132804.png
const DEFAULT_INBOX_THREADS: GoogleMessagesThreadItem[] = [
  {
    id: '131',
    sender: '131',
    avatarColor: '#00a8cc',
    snippet: 'Dear customer, Your airtime top-up has given you 2 Silver c...',
    timeLabel: '22 min',
    unreadCount: 2,
  },
  {
    id: 'ethio-tel',
    sender: 'ethio tel',
    avatarColor: '#9333ea',
    snippet: 'አድማስ ዲጂታል ሎተሪ በ51ኛው ዙር የሽልማት መጠኑን ወደ 5 ሚሊዮን ብ...',
    timeLabel: '22 min',
    unreadCount: 4,
  },
  {
    id: 'CBE',
    sender: 'CBE',
    bankKey: 'cbe',
    avatarColor: '#8e24aa',
    snippet: 'Dear Leykun Jemaneh Ylma A ...',
    timeLabel: '32 min',
    unreadCount: 1,
    isBank: true,
  },
  {
    id: '251994',
    sender: '251994',
    avatarColor: '#eab308',
    snippet: 'Dear Customer, Your prepaid account has bee...',
    timeLabel: '32 min',
    unreadCount: 1,
  },
  {
    id: 'safaricom',
    sender: 'Safaricom',
    avatarColor: '#f97316',
    snippet: 'አስደሳች ዜና!...',
    timeLabel: '8:25 AM',
    unreadCount: 0,
  },
  {
    id: 'mpesa-info',
    sender: 'MPESA Info',
    avatarColor: '#16a34a',
    snippet: 'ውድ Yeshiwalem በብሔራዊ ባንክ መመሪያ መሰረት እባክዎ የሂ...',
    timeLabel: '7:38 AM',
    unreadCount: 6,
  },
  {
    id: 'BOA',
    sender: 'BOA',
    bankKey: 'abyssinia',
    avatarColor: '#ea580c',
    snippet: 'ዓለም አቀፍ ግብይቶችን በቀላሉ ያድርጉ!...',
    timeLabel: 'Yesterday',
    unreadCount: 0,
    isBank: true,
  },
  {
    id: 'bunna-bank',
    sender: 'Bunna Bank',
    bankKey: 'custom',
    avatarColor: '#db2777',
    snippet: 'ውድ ደንበኞቻችን...',
    timeLabel: 'Thu',
    unreadCount: 0,
    isBank: true,
  },
  {
    id: 'telebirr',
    sender: 'telebirr',
    bankKey: 'telebirr',
    avatarColor: '#0085ca',
    snippet: 'ውድ ደንበኛችን የቴሌብር ሂሳብዎ...',
    timeLabel: 'Aug 28',
    unreadCount: 0,
    isBank: true,
  }
];

export default function TruecallerSimulator({ onBack }: TruecallerSimulatorProps) {
  // Navigation View State:
  // 'inbox' = Google Messages list matching screenshot
  // 'bank_thread' = Transaction list for clicked bank (e.g. CBE)
  // 'takeover' = Full screen phone takeover with Truecaller pop-down
  const [view, setView] = useState<'inbox' | 'bank_thread' | 'takeover'>('inbox');
  
  // Selected bank for thread view
  const [activeBankKey, setActiveBankKey] = useState<TruecallerBankKey>('cbe');
  const [activeBankSenderName, setActiveBankSenderName] = useState<string>('CBE');

  // Search in Google Messages inbox
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Bank transactions & Truecaller alerts
  const [accounts, setAccounts] = useState<TruecallerBankAccount[]>(() => TruecallerService.getAccounts());
  const [alerts, setAlerts] = useState<TruecallerAlert[]>(() => TruecallerService.getAlerts());
  const [rawAppTransactions, setRawAppTransactions] = useState<Transaction[]>(() => {
    try {
      return LocalDb.getTransactions();
    } catch {
      return [];
    }
  });

  // Modal: Choose Phone Screen & Phone Type
  const [showPickerModal, setShowPickerModal] = useState<boolean>(false);
  const [selectedTxForPicker, setSelectedTxForPicker] = useState<{
    id?: string;
    amount: number;
    accountNumber: string;
    maskedAccount: string;
    holderName: string;
    role: TruecallerRole;
    bankName: string;
    bankKey: TruecallerBankKey;
    timeString: string;
    timestamp?: string;
    counterpartyName?: string;
    balanceAfter?: number;
    txId?: string;
    fullMessageText?: string;
    isNow?: boolean;
  } | null>(null);

  // Picker selection states
  const [selectedPhoneScreen, setSelectedPhoneScreen] = useState<TruecallerBackgroundApp>('tiktok');
  const [selectedPhoneType, setSelectedPhoneType] = useState<TruecallerPhoneType>('tecno');
  const [pickerRole, setPickerRole] = useState<TruecallerRole>('receiver');
  const [pickerAmount, setPickerAmount] = useState<string>('450.00');

  // Takeover & Popdown Alert State (Default initialized to match reference photo IMG_20260905_131647_440.jpg)
  const [currentAlert, setCurrentAlert] = useState<TruecallerAlert | null>(() => ({
    id: 'tc-alert-seed-featured',
    accountId: 'tc-acc-cbe',
    bankKey: 'cbe',
    bankName: 'CBE',
    role: 'receiver',
    amount: 244600.00,
    maskedAccount: '1********0913',
    fullAccount: '1000419520913',
    holderName: 'Leykun Jemaneh Ylma',
    counterpartyName: 'Commercial Bank of Ethiopia',
    balanceAfter: 289450.75,
    timeString: '2:35 PM',
    timestamp: new Date().toISOString(),
    summaryText: 'Account 1********0913 credited with ETB 244600.00.',
    txId: 'FT26248MK0913',
    read: false,
    backgroundApp: 'tiktok',
    phoneType: 'tecno',
  }));
  const [isPopdownVisible, setIsPopdownVisible] = useState<boolean>(true);
  const [isPopdownAnimating, setIsPopdownAnimating] = useState<boolean>(false);
  const [showAiBreakdown, setShowAiBreakdown] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick simulate transaction modal
  const [showQuickSimModal, setShowQuickSimModal] = useState<boolean>(false);
  const [simRole, setSimRole] = useState<TruecallerRole>('receiver');
  const [simAmount, setSimAmount] = useState<string>('450.00');
  const [simAccNumber, setSimAccNumber] = useState<string>('1000419529165');
  const [simHolderName, setSimHolderName] = useState<string>('Leykun Jemaneh Ylma');
  const [simCounterparty, setSimCounterparty] = useState<string>('Abebe Bikila');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync with banking transactions on mount
  useEffect(() => {
    try {
      const existingTxs = LocalDb.getTransactions();
      setRawAppTransactions(existingTxs);
      if (existingTxs && existingTxs.length > 0) {
        TruecallerService.syncAllExistingTransactions(existingTxs);
      }
      setAccounts(TruecallerService.getAccounts());
      setAlerts(TruecallerService.getAlerts());
    } catch (e) {
      console.error('Failed to sync on mount:', e);
    }
  }, []);

  // Listen for external transaction updates
  useEffect(() => {
    const handleUpdate = () => {
      setAccounts(TruecallerService.getAccounts());
      setAlerts(TruecallerService.getAlerts());
      try {
        setRawAppTransactions(LocalDb.getTransactions());
      } catch {}
    };
    window.addEventListener('tc_alerts_updated', handleUpdate);
    window.addEventListener('sms-created', handleUpdate);
    window.addEventListener('sms-updated', handleUpdate);
    return () => {
      window.removeEventListener('tc_alerts_updated', handleUpdate);
      window.removeEventListener('sms-created', handleUpdate);
      window.removeEventListener('sms-updated', handleUpdate);
    };
  }, []);

  // Toast notification banner
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Trigger Pop-down alert with animation and audio
  const triggerPopdownAlert = (alert: TruecallerAlert) => {
    setCurrentAlert(alert);
    setIsPopdownVisible(true);
    setIsPopdownAnimating(true);
    if (soundEnabled) {
      playTruecallerChime();
    }
    setTimeout(() => {
      setIsPopdownAnimating(false);
    }, 500);
  };

  // Bank Info for active bank thread
  const activeBankPreset = useMemo(() => {
    return BANK_PRESETS.find(p => p.key === activeBankKey) || BANK_PRESETS[0];
  }, [activeBankKey]);

  // Compiled transaction messages for the selected bank (e.g. CBE)
  const bankTransactions = useMemo(() => {
    // 1. From TruecallerAlerts matching this bank
    const matchingAlerts = alerts.filter(a => a.bankKey === activeBankKey);

    // 2. Realistic seeded official CBE transactions matching user screenshots
    const seededCbeList = [
      {
        id: 'tx-cbe-seed-featured',
        amount: 244600.00,
        accountNumber: '1000419520913',
        maskedAccount: '1********0913',
        holderName: 'Leykun Jemaneh Ylma',
        role: 'receiver' as TruecallerRole,
        bankName: 'CBE',
        bankKey: 'cbe' as TruecallerBankKey,
        timeString: '2:35 PM',
        timestamp: new Date().toISOString(),
        counterpartyName: 'Commercial Bank of Ethiopia',
        balanceAfter: 289450.75,
        txId: 'FT26248MK0913',
        fullMessageText: `Dear Leykun Jemaneh Ylma,\nYour Account 1000419520913 has been Credited with ETB 244,600.00 on 05/09/2026 02:35 PM.\nAvailable Balance is ETB 289,450.75.\nTxn Ref: FT26248MK0913.\nThank you for banking with CBE.\nhttps://cbe.com.et/mbreceipt/FT26248MK0913`
      },
      {
        id: 'tx-cbe-seed-debit-current',
        amount: 90000000.00,
        accountNumber: '1000419529165',
        maskedAccount: '1********9165',
        holderName: 'Leykun Jemaneh Ylma',
        role: 'sender' as TruecallerRole,
        bankName: 'CBE',
        bankKey: 'cbe' as TruecallerBankKey,
        timeString: '1:18 PM',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        counterpartyName: 'Commercial Bank of Ethiopia',
        balanceAfter: 9897531463.00,
        txId: 'FT269446FP77',
        fullMessageText: `Dear Leykun Jemaneh Ylma,\nA debit transaction of ETB 90000000.00 has occurred on your Account 1000419529165 on 1:18 PM.\nAvailable Balance: ETB 9897531463.00.\nTxn Ref: FT269446FP77.\nThank you for banking with Cbe Bank.`
      },
      {
        id: 'tx-cbe-seed-1',
        amount: 450.00,
        accountNumber: '1000419529165',
        maskedAccount: '1********9165',
        holderName: 'Leykun Jemaneh Ylma',
        role: 'receiver' as TruecallerRole,
        bankName: 'CBE',
        bankKey: 'cbe' as TruecallerBankKey,
        timeString: '11:58 AM',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        counterpartyName: 'Abebe Bikila',
        balanceAfter: 5420.50,
        txId: 'FT25104MK9165',
        fullMessageText: `Dear Leykun Jemaneh Ylma,\nYour Account 1000419529165 has been Credited with ETB 450.00 on 05/09/2026 11:58 AM by Abebe Bikila.\nAvailable Balance is ETB 5,420.50.\nTxn Ref: FT25104MK9165.\nThank you for banking with CBE.\nhttps://cbe.com.et/mbreceipt/FT25104MK9165`
      },
      {
        id: 'tx-cbe-seed-2',
        amount: 250.00,
        accountNumber: '1000419524747',
        maskedAccount: '1********4747',
        holderName: 'Leykun Jemaneh Ylma',
        role: 'sender' as TruecallerRole,
        bankName: 'Commercial Bank of Ethiopia',
        bankKey: 'cbe' as TruecallerBankKey,
        timeString: '10:20 AM',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        counterpartyName: 'Ethio Telecom Airtime',
        balanceAfter: 1555.47,
        txId: 'FT250918491',
        fullMessageText: `Dear Leykun Jemaneh Ylma,\nA debit transaction of ETB 250.00 has occurred on your Account 1000419524747 on 05/09/2026 10:20 AM.\nReason: Airtime Top-Up.\nAvailable Balance: ETB 1,555.47.\nTxn Ref: FT250918491.\nThank you for banking with CBE.`
      },
      {
        id: 'tx-cbe-seed-3',
        amount: 1200.00,
        accountNumber: '1000419529165',
        maskedAccount: '1********9165',
        holderName: 'Leykun Jemaneh Ylma',
        role: 'receiver' as TruecallerRole,
        bankName: 'Commercial Bank of Ethiopia',
        bankKey: 'cbe' as TruecallerBankKey,
        timeString: 'Yesterday',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        counterpartyName: 'Selamawit Tekle',
        balanceAfter: 4970.50,
        txId: 'FT2489104MK',
        fullMessageText: `Dear Leykun Jemaneh Ylma,\nYour Account 1000419529165 has been Credited with ETB 1,200.00 on 04/09/2026 04:15 PM by Selamawit Tekle.\nAvailable Balance is ETB 4,970.50.\nTxn Ref: FT2489104MK.\nThank you for banking with CBE.`
      }
    ];

    // Combine matching alerts
    const alertItems = matchingAlerts.map(a => ({
      id: a.id,
      amount: a.amount,
      accountNumber: a.fullAccount || '1000419529165',
      maskedAccount: a.maskedAccount || maskTruecallerAccount(a.fullAccount || '1000419529165'),
      holderName: a.holderName || 'Leykun Jemaneh Ylma',
      role: a.role,
      bankName: a.bankName,
      bankKey: a.bankKey,
      timeString: a.timeString || 'Now',
      timestamp: a.timestamp,
      counterpartyName: a.counterpartyName,
      balanceAfter: a.balanceAfter,
      txId: a.txId,
      fullMessageText: a.fullSmsText || (
        a.role === 'receiver'
          ? `Dear ${a.holderName || 'Leykun Jemaneh Ylma'},\nYour Account ${a.fullAccount || '1000419520913'} has been Credited with ETB ${a.amount.toFixed(2)} on ${a.timeString || 'Now'}${a.counterpartyName ? ` by ${a.counterpartyName}` : ''}.\nAvailable Balance is ETB ${(a.balanceAfter || 289450.75).toFixed(2)}.\nTxn Ref: ${a.txId || 'FT26248MK0913'}.\nThank you for banking with ${a.bankName}.`
          : `Dear ${a.holderName || 'Leykun Jemaneh Ylma'},\nA debit transaction of ETB ${a.amount.toFixed(2)} has occurred on your Account ${a.fullAccount || '1000419529165'} on ${a.timeString || 'Now'}.\nAvailable Balance: ETB ${(a.balanceAfter || 9897531463.00).toFixed(2)}.\nTxn Ref: ${a.txId || 'FT269446FP77'}.\nThank you for banking with ${a.bankName}.`
      )
    }));

    // Combine all and deduplicate by txId
    const allItems = [...alertItems];
    for (const seed of seededCbeList) {
      if (!allItems.some(c => c.txId === seed.txId)) {
        allItems.push(seed);
      }
    }

    // Identify current RECEIVE (credit) and current SEND (debit) transactions to place at the top with "Now" badge
    const topCredit = allItems.find(item => item.role === 'receiver') || seededCbeList[0];
    const topDebit = allItems.find(item => item.role === 'sender') || seededCbeList[1];

    const currentTopList: (typeof seededCbeList[0] & { isNow: boolean })[] = [
      { ...topCredit, isNow: true },
      { ...topDebit, isNow: true }
    ];

    // Filter out top items from remaining list so there are no duplicates
    const remainingItems = allItems
      .filter(item => item.id !== topCredit.id && item.id !== topDebit.id && item.txId !== topCredit.txId && item.txId !== topDebit.txId)
      .map(item => ({ ...item, isNow: false }));

    return [...currentTopList, ...remainingItems];
  }, [activeBankKey, alerts]);

  // Click on a thread in Google Messages Inbox
  const handleSelectThread = (thread: GoogleMessagesThreadItem) => {
    if (thread.isBank && thread.bankKey) {
      setActiveBankKey(thread.bankKey);
      setActiveBankSenderName(thread.sender);
      setView('bank_thread');
    } else if (thread.id === 'CBE') {
      setActiveBankKey('cbe');
      setActiveBankSenderName('CBE');
      setView('bank_thread');
    } else {
      // For other banks/threads, let user explore transactions for that bank
      const matchedKey = thread.id.toLowerCase().includes('tele') ? 'telebirr' : (thread.id.toLowerCase().includes('boa') ? 'abyssinia' : 'cbe');
      setActiveBankKey(matchedKey);
      setActiveBankSenderName(thread.sender);
      setView('bank_thread');
    }
  };

  // Click on a transaction bank account in the transaction list:
  // "when we click the transaction bank account it will make us choose the phone screen and phone type"
  const handleOpenPickerForTx = (tx: {
    id?: string;
    amount: number;
    accountNumber: string;
    maskedAccount: string;
    holderName: string;
    role: TruecallerRole;
    bankName: string;
    bankKey: TruecallerBankKey;
    timeString: string;
    timestamp?: string;
    counterpartyName?: string;
    balanceAfter?: number;
    txId?: string;
    fullMessageText?: string;
    isNow?: boolean;
  }) => {
    setSelectedTxForPicker(tx);
    setPickerAmount(tx.amount.toFixed(2));
    setPickerRole(tx.role);
    // Pre-select phone screen based on bank preset
    setSelectedPhoneScreen(getDefaultBackgroundApp(tx.bankKey));
    // Default phone type to tecno (matching user screenshot)
    setSelectedPhoneType('tecno');
    setShowPickerModal(true);
  };

  // Submit the picker modal:
  // "Then we submit it will show the message popdown like same future of Truecaller"
  const handleSubmitPicker = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTxForPicker) return;

    const amt = parseFloat(pickerAmount) || selectedTxForPicker.amount;
    const formattedAmount = amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const masked = selectedTxForPicker.maskedAccount || maskTruecallerAccount(selectedTxForPicker.accountNumber);
    const actionWord = pickerRole === 'receiver' ? 'credited with' : 'debited with';
    const summary = `Account ${masked} ${actionWord} ETB ${formattedAmount}.`;

    const alertToLaunch: TruecallerAlert = {
      id: `tc-alert-launch-${Date.now()}`,
      accountId: `tc-acc-${selectedTxForPicker.bankKey}`,
      bankKey: selectedTxForPicker.bankKey,
      bankName: selectedTxForPicker.bankName,
      role: pickerRole,
      amount: amt,
      maskedAccount: masked,
      fullAccount: selectedTxForPicker.accountNumber,
      holderName: selectedTxForPicker.holderName,
      counterpartyName: selectedTxForPicker.counterpartyName || (pickerRole === 'receiver' ? 'Abebe Bikila' : 'Retail Merchant'),
      balanceAfter: selectedTxForPicker.balanceAfter,
      timeString: formatCurrentTimeString(),
      timestamp: new Date().toISOString(),
      summaryText: summary,
      txId: selectedTxForPicker.txId || `FT${Math.floor(10000000 + Math.random() * 90000000)}`,
      read: false,
      backgroundApp: selectedPhoneScreen,
      phoneType: selectedPhoneType,
    };

    setShowPickerModal(false);
    setView('takeover');
    triggerPopdownAlert(alertToLaunch);
  };

  // Quick simulate transaction submit
  const handleQuickSimulateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(simAmount);
    if (isNaN(amt) || amt <= 0) return;

    const preset = BANK_PRESETS.find(p => p.key === activeBankKey) || BANK_PRESETS[0];
    const newAcc: TruecallerBankAccount = {
      id: `tc-acc-${activeBankKey}-${Date.now()}`,
      bankKey: activeBankKey,
      bankName: preset.name,
      accountNumber: simAccNumber.trim() || '1000419529165',
      maskedAccount: maskTruecallerAccount(simAccNumber.trim() || '1000419529165'),
      holderName: simHolderName.trim() || 'Leykun Jemaneh Ylma',
      accountType: 'Savings Account',
      balance: 5420.50,
      backgroundApp: getDefaultBackgroundApp(activeBankKey),
      lastTransactionAt: new Date().toISOString()
    };

    const newAlert = TruecallerService.createAlert({
      account: newAcc,
      role: simRole,
      amount: amt,
      counterpartyName: simCounterparty.trim() || (simRole === 'receiver' ? 'Abebe Bikila' : 'Supermarket Payment'),
    });

    setShowQuickSimModal(false);
    showToast(`Transaction of ETB ${amt.toFixed(2)} simulated for ${preset.name}!`);

    // Automatically open picker for this newly simulated transaction
    handleOpenPickerForTx({
      id: newAlert.id,
      amount: newAlert.amount,
      accountNumber: newAcc.accountNumber,
      maskedAccount: newAlert.maskedAccount,
      holderName: newAcc.holderName,
      role: newAlert.role,
      bankName: newAcc.bankName,
      bankKey: newAcc.bankKey,
      timeString: newAlert.timeString,
      timestamp: newAlert.timestamp,
      counterpartyName: newAlert.counterpartyName,
      balanceAfter: newAlert.balanceAfter,
      txId: newAlert.txId,
      fullMessageText: newAlert.summaryText
    });
  };

  // Mark alert read
  const handleMarkAsRead = () => {
    if (currentAlert) {
      TruecallerService.markAlertAsRead(currentAlert.id);
      setCurrentAlert(prev => prev ? { ...prev, read: true } : null);
      showToast('Marked as read');
    }
  };

  // Retrigger popdown alert
  const handleRetriggerAlert = () => {
    if (currentAlert) {
      triggerPopdownAlert(currentAlert);
    }
  };

  // Filtered threads for inbox search
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return DEFAULT_INBOX_THREADS;
    const q = searchQuery.toLowerCase();
    return DEFAULT_INBOX_THREADS.filter(t => 
      t.sender.toLowerCase().includes(q) || 
      t.snippet.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // =========================================================================
  // 1. BACKGROUND SCREENS (TikTok, YouTube, Telegram, Instagram, WhatsApp, LockScreen)
  // =========================================================================

  // 1. TIKTOK SCREEN
  const renderTikTokScreen = () => {
    return (
      <div className="absolute inset-0 bg-neutral-950 flex flex-col overflow-hidden text-white select-none">
        {/* Fullscreen Video Simulation with Rich Atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/60 via-slate-950/40 to-black pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-fuchsia-600/20 blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-cyan-600/20 blur-3xl"></div>
        </div>

        {/* Top Header: LIVE, Following, For You tabs */}
        <div className="pt-2 px-4 pb-2 flex items-center justify-between text-sm font-semibold z-10">
          <div className="flex items-center space-x-1 bg-black/40 px-2 py-0.5 rounded-full text-xs font-bold text-red-400 border border-red-500/30">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping mr-1"></span>
            LIVE
          </div>

          <div className="flex items-center space-x-4 text-sm font-bold">
            <span className="text-white/60 hover:text-white cursor-pointer transition">Following</span>
            <div className="relative cursor-pointer">
              <span className="text-white font-extrabold text-base">For You</span>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-white rounded-full"></div>
            </div>
          </div>

          <Search className="w-5 h-5 text-white cursor-pointer hover:scale-110 transition" />
        </div>

        {/* Center/Bottom Feed Content & Right Floating Actions */}
        <div className="flex-1 flex items-end justify-between p-4 z-10 pb-16">
          {/* Left: User Info & Caption */}
          <div className="max-w-[70%] space-y-2">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-white drop-shadow-md">@habesha_trending</span>
              <span className="text-xs bg-red-500 text-white px-1.5 py-0.2 rounded font-semibold">+ Follow</span>
            </div>
            <p className="text-xs text-white/95 leading-relaxed drop-shadow-sm font-medium">
              Addis Ababa digital payment speeds are wild in 2026 🇪🇹🚀 CBE birr transfer confirmation pop-up test!
            </p>
            <div className="flex items-center space-x-1.5 text-xs text-white/90 bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-full w-fit">
              <Music className="w-3.5 h-3.5 animate-spin" />
              <span className="truncate max-w-[160px]">Teddy Afro • Ethiopia Soundtrack (Remix)</span>
            </div>
          </div>

          {/* Right Floating Action Column */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-11 h-11 rounded-full border-2 border-white bg-gradient-to-tr from-amber-400 to-pink-500 flex items-center justify-center font-bold text-xs text-white shadow-lg">
                HA
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-black">
                +
              </div>
            </div>

            <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-red-500">
                <Heart className="w-6 h-6 fill-red-500" />
              </div>
              <span className="text-[11px] font-bold mt-1 text-white">84.2K</span>
            </div>

            <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
                <MessageCircle className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold mt-1 text-white">1,420</span>
            </div>

            <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-amber-300">
                <Bookmark className="w-6 h-6 fill-amber-300" />
              </div>
              <span className="text-[11px] font-bold mt-1 text-white">4,819</span>
            </div>

            <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
                <Share2 className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold mt-1 text-white">924</span>
            </div>

            {/* Spinning Music Disc */}
            <div className="w-10 h-10 rounded-full bg-black border-2 border-neutral-700 flex items-center justify-center animate-spin">
              <div className="w-4 h-4 rounded-full bg-fuchsia-500 border border-white"></div>
            </div>
          </div>
        </div>

        {/* TikTok Bottom Bar */}
        <div className="bg-black/90 backdrop-blur-md border-t border-neutral-800 px-6 py-2 flex items-center justify-between text-xs z-10">
          <div className="flex flex-col items-center text-white font-bold">
            <HomeIcon className="w-5 h-5" />
            <span className="text-[10px]">Home</span>
          </div>
          <div className="flex flex-col items-center text-white/50">
            <User className="w-5 h-5" />
            <span className="text-[10px]">Friends</span>
          </div>
          <div className="w-10 h-7 rounded-lg bg-gradient-to-r from-cyan-400 via-white to-pink-500 p-0.5 flex items-center justify-center cursor-pointer hover:scale-105 transition">
            <div className="w-full h-full bg-black rounded-[6px] flex items-center justify-center font-bold text-white text-base">
              +
            </div>
          </div>
          <div className="flex flex-col items-center text-white/50">
            <MessageCircle className="w-5 h-5" />
            <span className="text-[10px]">Inbox</span>
          </div>
          <div className="flex flex-col items-center text-white/50">
            <User className="w-5 h-5" />
            <span className="text-[10px]">Profile</span>
          </div>
        </div>
      </div>
    );
  };

  // 2. TELEGRAM SCREEN
  const renderTelegramScreen = () => {
    return (
      <div className="absolute inset-0 bg-[#0e1621] flex flex-col overflow-hidden text-white select-none">
        {/* Telegram Header */}
        <div className="bg-[#17212b] px-3 py-2 flex items-center justify-between border-b border-slate-800 z-10 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-sm shadow-md">
              AF
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm text-white">Addis Financial Hub</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2481cc]" />
              </div>
              <span className="text-[11px] text-slate-400">184,200 subscribers</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-slate-400">
            <Search className="w-5 h-5 cursor-pointer hover:text-white" />
            <MoreVertical className="w-5 h-5 cursor-pointer hover:text-white" />
          </div>
        </div>

        {/* Telegram Messages Stream */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#0e1621]">
          {/* Bulletin Card */}
          <div className="bg-[#182533] p-3.5 rounded-2xl border border-slate-800/80 shadow-md space-y-2 max-w-[90%]">
            <div className="flex items-center space-x-2 text-xs font-bold text-[#2481cc]">
              <span>📢 Official CBE & NBE Update</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              Commercial Bank of Ethiopia reminds all customers that digital banking services are fully synced with instant notification protocols. Keep your PIN and credentials strictly confidential.
            </p>
            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
              <span>👁 42.8K</span>
              <div className="flex items-center space-x-1">
                <span>11:42 AM</span>
                <CheckCheck className="w-3.5 h-3.5 text-[#2481cc]" />
              </div>
            </div>
          </div>

          <div className="bg-[#2b5278] ml-auto p-3 rounded-2xl shadow-md text-xs text-white max-w-[80%] space-y-1">
            <p>Did anyone get the instant Truecaller pop-down alert on their device?</p>
            <div className="flex items-center justify-end space-x-1 text-[10px] text-blue-200 pt-0.5">
              <span>11:50 AM</span>
              <CheckCheck className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Telegram Footer */}
        <div className="bg-[#17212b] p-2.5 flex items-center space-x-2 border-t border-slate-800 z-10">
          <Paperclip className="w-5 h-5 text-slate-400 cursor-pointer hover:text-white ml-1" />
          <div className="flex-1 bg-[#242f3d] rounded-full px-4 py-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Broadcast a message...</span>
            <Smile className="w-4 h-4 text-slate-400 cursor-pointer hover:text-white" />
          </div>
          <div className="w-8 h-8 rounded-full bg-[#2481cc] flex items-center justify-center text-white cursor-pointer shadow-md">
            <Mic className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  };

  // 3. YOUTUBE SCREEN
  const renderYouTubeScreen = () => {
    return (
      <div className="absolute inset-0 bg-[#0f0f0f] flex flex-col overflow-hidden text-white select-none">
        {/* YouTube Header */}
        <div className="bg-[#0f0f0f] px-3 py-2 flex items-center justify-between border-b border-neutral-800 z-10">
          <div className="flex items-center space-x-1.5">
            <div className="bg-[#ff0000] w-7 h-5 rounded-md flex items-center justify-center shadow-md">
              <Play className="w-3 h-3 text-white fill-white ml-0.5" />
            </div>
            <span className="font-extrabold text-base tracking-tighter text-white">YouTube</span>
          </div>
          <div className="flex items-center space-x-3 text-white">
            <Tv className="w-5 h-5 cursor-pointer" />
            <Search className="w-5 h-5 cursor-pointer" />
            <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
              L
            </div>
          </div>
        </div>

        {/* Video Player */}
        <div className="w-full aspect-video bg-neutral-900 relative flex items-center justify-center overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-950 via-slate-900 to-amber-950 opacity-80"></div>
          <div className="z-10 flex flex-col items-center space-y-1.5">
            <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Play className="w-6 h-6 text-white fill-white ml-0.5" />
            </div>
            <span className="text-xs font-bold text-white/90 bg-black/50 px-2 py-0.5 rounded">
              Ethiopian Digital Banking Documentary
            </span>
          </div>
          {/* Red scrubber bar */}
          <div className="absolute bottom-0 inset-x-0 h-1 bg-neutral-700">
            <div className="h-full w-2/5 bg-[#ff0000]"></div>
          </div>
        </div>

        {/* Video Info & Feed */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#0f0f0f]">
          <h1 className="font-bold text-sm text-white leading-snug">
            CBE Digital Banking in 2026: Fast Transfers & Instant Mobile Alerts
          </h1>
          <div className="flex items-center space-x-2 text-xs text-neutral-400">
            <span>240K views</span>
            <span>•</span>
            <span>1 day ago</span>
            <span>•</span>
            <span className="text-blue-400 font-semibold">#Ethiopia #Banking</span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-neutral-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center font-bold text-xs text-white">
                ET
              </div>
              <div>
                <span className="font-bold text-xs text-white block">Ethio Fintech Guide</span>
                <span className="text-[10px] text-neutral-400">580K subscribers</span>
              </div>
            </div>
            <button className="bg-white text-black font-bold text-xs px-3 py-1.5 rounded-full hover:bg-neutral-200">
              Subscribe
            </button>
          </div>

          {/* Action pills */}
          <div className="flex items-center space-x-2 overflow-x-auto py-1 scrollbar-none text-xs font-semibold">
            <div className="flex items-center bg-neutral-800 rounded-full px-3 py-1.5 space-x-1.5">
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>48K</span>
              <span className="text-neutral-500">|</span>
              <ThumbsDown className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center bg-neutral-800 rounded-full px-3 py-1.5 space-x-1.5">
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </div>
            <div className="flex items-center bg-neutral-800 rounded-full px-3 py-1.5 space-x-1.5">
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </div>
          </div>
        </div>

        {/* YouTube Bottom Bar */}
        <div className="bg-[#0f0f0f] border-t border-neutral-800 px-6 py-2 flex items-center justify-between text-xs text-neutral-400 z-10">
          <div className="flex flex-col items-center text-white">
            <HomeIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold">Home</span>
          </div>
          <div className="flex flex-col items-center">
            <Tv className="w-5 h-5" />
            <span className="text-[10px]">Shorts</span>
          </div>
          <div className="w-8 h-8 rounded-full border border-neutral-400 flex items-center justify-center">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col items-center">
            <Bookmark className="w-5 h-5" />
            <span className="text-[10px]">Subscriptions</span>
          </div>
          <div className="flex flex-col items-center">
            <User className="w-5 h-5" />
            <span className="text-[10px]">You</span>
          </div>
        </div>
      </div>
    );
  };

  // 4. INSTAGRAM SCREEN
  const renderInstagramScreen = () => {
    return (
      <div className="absolute inset-0 bg-black flex flex-col overflow-hidden text-white select-none">
        {/* Instagram Header */}
        <div className="bg-black px-4 py-2 flex items-center justify-between border-b border-neutral-900 z-10">
          <span className="font-serif italic font-bold text-xl tracking-tight text-white">
            Instagram
          </span>
          <div className="flex items-center space-x-4">
            <Heart className="w-6 h-6 cursor-pointer" />
            <MessageCircle className="w-6 h-6 cursor-pointer" />
          </div>
        </div>

        {/* Instagram Stories & Post */}
        <div className="flex-1 overflow-y-auto bg-black">
          {/* Stories Tray */}
          <div className="p-3 flex items-center space-x-3.5 overflow-x-auto border-b border-neutral-900 scrollbar-none">
            {[
              { name: 'Your story', color: 'border-neutral-700', isSelf: true },
              { name: 'cbe_official', color: 'border-pink-500' },
              { name: 'ethiotelecom', color: 'border-amber-500' },
              { name: 'addislife', color: 'border-purple-500' },
            ].map((s, idx) => (
              <div key={idx} className="flex flex-col items-center space-y-1 flex-shrink-0 cursor-pointer">
                <div className={`w-14 h-14 rounded-full p-0.5 border-2 ${s.color}`}>
                  <div className="w-full h-full rounded-full bg-neutral-800 flex items-center justify-center font-bold text-xs">
                    {s.name.slice(0, 2).toUpperCase()}
                  </div>
                </div>
                <span className="text-[10px] text-neutral-400 truncate max-w-[60px]">{s.name}</span>
              </div>
            ))}
          </div>

          {/* Photo Post */}
          <div className="py-2">
            <div className="px-3 py-2 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center font-bold text-xs text-white">
                  CBE
                </div>
                <div>
                  <span className="font-bold text-xs block">cbe_official</span>
                  <span className="text-[10px] text-neutral-400">Addis Ababa, Ethiopia</span>
                </div>
              </div>
              <MoreVertical className="w-4 h-4 text-neutral-400" />
            </div>

            {/* Simulated Post Image */}
            <div className="w-full aspect-square bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-900 relative flex items-center justify-center p-6 text-center">
              <div className="space-y-2">
                <Building2 className="w-16 h-16 text-purple-300 mx-auto opacity-80" />
                <h3 className="font-extrabold text-base text-white">Commercial Bank of Ethiopia</h3>
                <p className="text-xs text-purple-200">The Bank You Always Rely On</p>
              </div>
            </div>

            {/* Post Actions */}
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Heart className="w-6 h-6 text-red-500 fill-red-500 cursor-pointer" />
                  <MessageCircle className="w-6 h-6 cursor-pointer" />
                  <Send className="w-6 h-6 cursor-pointer" />
                </div>
                <Bookmark className="w-6 h-6 cursor-pointer" />
              </div>
              <p className="text-xs font-bold">12,490 likes</p>
              <p className="text-xs text-neutral-300">
                <span className="font-bold mr-1.5 text-white">cbe_official</span>
                Instant notification updates powered by Truecaller SMS simulation.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 5. WHATSAPP SCREEN
  const renderWhatsAppScreen = () => {
    return (
      <div className="absolute inset-0 bg-[#0b141a] flex flex-col overflow-hidden text-white select-none">
        {/* WhatsApp Header */}
        <div className="bg-[#202c33] px-3 py-2.5 flex items-center justify-between border-b border-neutral-800 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-sm text-white">
              AB
            </div>
            <div>
              <span className="font-bold text-sm text-white block">Abebe Bikila</span>
              <span className="text-[11px] text-emerald-400">online</span>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-neutral-300">
            <Video className="w-5 h-5 cursor-pointer" />
            <PhoneCall className="w-5 h-5 cursor-pointer" />
            <MoreVertical className="w-5 h-5 cursor-pointer" />
          </div>
        </div>

        {/* WhatsApp Messages Feed */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#0b141a]">
          <div className="bg-[#202c33] p-3 rounded-2xl text-xs text-white max-w-[80%] rounded-tl-xs space-y-1">
            <p>Hey Leykun, just transferred ETB 450.00 to your CBE account for the project materials.</p>
            <span className="text-[10px] text-neutral-400 text-right block">11:57 AM</span>
          </div>

          <div className="bg-[#005c4b] ml-auto p-3 rounded-2xl text-xs text-white max-w-[80%] rounded-tr-xs space-y-1 shadow-sm">
            <p>Thanks Abebe! Just saw the Truecaller pop-down notification arrive right now.</p>
            <div className="flex items-center justify-end space-x-1 text-[10px] text-emerald-200">
              <span>11:58 AM</span>
              <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
            </div>
          </div>
        </div>

        {/* WhatsApp Footer Input */}
        <div className="bg-[#202c33] p-2 flex items-center space-x-2 z-10">
          <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2 flex items-center space-x-2 text-xs text-neutral-300">
            <Smile className="w-4 h-4 text-neutral-400 cursor-pointer" />
            <span className="text-neutral-400 flex-1">Message</span>
            <Paperclip className="w-4 h-4 text-neutral-400 cursor-pointer" />
          </div>
          <div className="w-9 h-9 rounded-full bg-[#00a884] flex items-center justify-center text-white cursor-pointer shadow-md">
            <Mic className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  };

  // 6. PHONE LOCK SCREEN
  const renderLockScreen = () => {
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950 flex flex-col items-center justify-between p-6 text-white select-none">
        {/* Clock & Date Widget */}
        <div className="mt-12 text-center space-y-1">
          <span className="text-6xl font-extralight tracking-tight font-sans">
            {currentAlert?.timeString?.split(' ')[0] || '1:28'}
          </span>
          <p className="text-xs text-purple-200 font-medium">Friday, September 4</p>
        </div>

        {/* Subtle Lock Graphic */}
        <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/70">
          <ShieldCheck className="w-4 h-4" />
        </div>

        {/* Bottom Flashlight & Camera circles */}
        <div className="w-full flex items-center justify-between px-4 pb-4">
          <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white cursor-pointer hover:bg-white/25 transition">
            <span className="text-xs">🔦</span>
          </div>
          <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white cursor-pointer hover:bg-white/25 transition">
            <span className="text-xs">📷</span>
          </div>
        </div>
      </div>
    );
  };

  // Render selected background screen
  const renderBackgroundScreen = (app: TruecallerBackgroundApp) => {
    switch (app) {
      case 'tiktok': return renderTikTokScreen();
      case 'telegram': return renderTelegramScreen();
      case 'youtube': return renderYouTubeScreen();
      case 'instagram': return renderInstagramScreen();
      case 'whatsapp': return renderWhatsAppScreen();
      case 'lockscreen': return renderLockScreen();
      default: return renderTikTokScreen();
    }
  };

  // =========================================================================
  // 2. PHONE TYPE STATUS BARS & HARDWARE FRAMES
  // =========================================================================
  const renderPhoneHeader = (type: TruecallerPhoneType, alertTimeString?: string) => {
    // Synchronize status bar clock with the popout message timestamp (default 2:35 matching screenshot)
    const timeMatch = alertTimeString ? alertTimeString.replace(/\s*(AM|PM)/i, '').trim() : '2:35';
    const displayTime = timeMatch || '2:35';

    switch (type) {
      case 'iphone':
        return (
          <div className="w-full pt-2 pb-1.5 px-6 flex items-center justify-between text-xs font-semibold text-white z-40 relative bg-black/70 backdrop-blur-md">
            <span>{displayTime}</span>
            {/* Dynamic Island pill */}
            <div className="w-24 h-6 rounded-full bg-black border border-white/10 flex items-center justify-between px-2.5 shadow-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-700"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500/80"></div>
            </div>
            <div className="flex items-center space-x-1.5 text-[11px]">
              <span className="text-[10px] font-bold">5G</span>
              <Wifi className="w-3.5 h-3.5" />
              <div className="w-4.5 h-2.5 border border-white/90 rounded-xs p-0.5 flex items-center">
                <div className="h-full w-4/5 bg-white rounded-2xs"></div>
              </div>
            </div>
          </div>
        );

      case 'samsung':
        return (
          <div className="w-full pt-2 pb-1.5 px-5 flex items-center justify-between text-xs font-medium text-white z-40 relative bg-black/60 backdrop-blur-md">
            <span>{displayTime}</span>
            {/* Center camera pinhole */}
            <div className="w-3 h-3 rounded-full bg-black border border-neutral-800"></div>
            <div className="flex items-center space-x-2 text-[11px]">
              <span className="text-[10px] font-bold bg-white/20 px-1 rounded">5G</span>
              <Wifi className="w-3.5 h-3.5" />
              <div className="flex items-center space-x-0.5">
                <Battery className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold">85%</span>
              </div>
            </div>
          </div>
        );

      case 'pixel':
        return (
          <div className="w-full pt-2 pb-1.5 px-5 flex items-center justify-between text-xs text-white z-40 relative bg-black/60 backdrop-blur-md">
            <span className="font-bold">{displayTime}</span>
            {/* Center camera */}
            <div className="w-3.5 h-3.5 rounded-full bg-black border border-neutral-700"></div>
            <div className="flex items-center space-x-2 text-[11px]">
              <Wifi className="w-3.5 h-3.5" />
              <Battery className="w-4 h-4" />
            </div>
          </div>
        );

      case 'tecno':
      default:
        // EXACT match to user's uploaded IMG_20260905_131647_440.jpg
        return (
          <div className="w-full px-4 pt-2.5 pb-2 flex items-center justify-between text-xs text-white z-40 relative bg-gradient-to-b from-[#092233] to-[#0c2a3e] select-none">
            {/* Left side: Time + ⊕ + Snapchat + Chat bubble + Facebook (f) + dot */}
            <div className="flex items-center space-x-2">
              <span className="font-bold text-[14px] tracking-tight text-white">{displayTime}</span>
              
              {/* Enclosed plus ⊕ */}
              <svg className="w-3.5 h-3.5 fill-none stroke-current opacity-95 text-white" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" strokeWidth="2.2" />
                <path d="M12 7.5v9M7.5 12h9" strokeWidth="2.2" strokeLinecap="round" />
              </svg>

              {/* Snapchat ghost icon */}
              <svg className="w-3.5 h-3.5 fill-current opacity-95 text-white" viewBox="0 0 24 24">
                <path d="M12 2C8.8 2 6.5 4.3 6.5 7.8c0 1.1.2 2.3.1 3.4-.2 1.3-1 1.8-1.5 2-.4.1-.5.5-.3.7.4.5 1.2.8 2 .8.3 0 .6-.1.9-.2.3.9 1.2 1.6 2.2 1.7-.7.3-1.8.7-1.5 1.6.2.6 1.2.5 2 .3.5-.1 1-.2 1.3.3.3.4.7.4.9 0 .3-.5.8-.4 1.3-.3.8.2 1.8.3 2-.3.3-.9-.8-1.3-1.5-1.6 1-.1 1.9-.8 2.2-1.7.3.1.6.2.9.2.8 0 1.6-.3 2-.8.2-.2.1-.6-.3-.7-.5-.2-1.3-.7-1.5-2-.1-1.1.1-2.3.1-3.4C17.5 4.3 15.2 2 12 2z"/>
              </svg>

              {/* Speech bubble with 3 dots */}
              <svg className="w-3.5 h-3.5 fill-current opacity-95 text-white" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 11.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
              </svg>

              {/* Facebook (f) */}
              <svg className="w-3.5 h-3.5 fill-current opacity-95 text-white" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 4.99 3.66 9.12 8.44 9.88v-6.99H7.9v-2.89h2.54V9.8c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.77l-.44 2.89h-2.33v6.99C18.34 21.12 22 16.99 22 12c0-5.52-4.48-10-10-10z"/>
              </svg>

              {/* Dot */}
              <span className="text-[11px] opacity-90 leading-none text-white">•</span>
            </div>

            {/* Right side: Headphone, Alarm clock, Speed, Cellular signal, 4G, Battery */}
            <div className="flex items-center space-x-2 text-[11px] text-white">
              {/* Headphone icon */}
              <svg className="w-3.5 h-3.5 fill-current opacity-95 text-white" viewBox="0 0 24 24">
                <path d="M12 3a9 9 0 0 0-9 9v7a3 3 0 0 0 3 3h1a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5v-2a7 7 0 0 1 14 0v2h-2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1a3 3 0 0 0 3-3v-7a9 9 0 0 0-9-9z"/>
              </svg>

              {/* Alarm clock icon */}
              <svg className="w-3.5 h-3.5 fill-none stroke-current opacity-95 text-white" viewBox="0 0 24 24">
                <circle cx="12" cy="13" r="7.5" strokeWidth="2" />
                <path d="M12 9.5v3.5l2.5 1.5" strokeWidth="2" strokeLinecap="round" />
                <path d="M5 4L2.5 6.5M19 4l2.5 2.5" strokeWidth="2" strokeLinecap="round" />
              </svg>

              {/* Speed: 27.3 on top, KB/S below */}
              <div className="flex flex-col items-end leading-none font-mono text-[8.5px] font-bold text-white">
                <span className="text-[9px] leading-tight">27.3</span>
                <span className="text-[7.5px] leading-tight tracking-tighter opacity-90">KB/S</span>
              </div>

              {/* Cellular signal: 4 vertical bars with 4 dots below */}
              <div className="flex flex-col items-center justify-center space-y-0.5">
                <div className="flex items-end space-x-0.5 h-2.5">
                  <div className="w-0.5 h-1 bg-white rounded-2xs"></div>
                  <div className="w-0.5 h-1.5 bg-white rounded-2xs"></div>
                  <div className="w-0.5 h-2 bg-white rounded-2xs"></div>
                  <div className="w-0.5 h-2.5 bg-white rounded-2xs"></div>
                </div>
                <div className="flex space-x-0.5">
                  <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                  <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                  <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                  <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                </div>
              </div>

              {/* 4G */}
              <span className="font-bold text-[11px] text-white">4G</span>

              {/* Battery pill capsule with 69 inside */}
              <div className="w-6 h-3.5 border border-white/95 rounded-[4px] bg-black/40 flex items-center justify-center">
                <span className="text-[9px] font-extrabold text-white leading-none">69</span>
              </div>
            </div>
          </div>
        );
    }
  };

  // Bottom hardware navigation bar matching phone type
  const renderPhoneFooter = (type: TruecallerPhoneType) => {
    switch (type) {
      case 'iphone':
        return (
          <div className="w-full py-2 bg-black/80 flex items-center justify-center z-40">
            <div className="w-32 h-1 bg-white/80 rounded-full"></div>
          </div>
        );
      case 'samsung':
      case 'pixel':
        return (
          <div className="w-full py-1.5 bg-black/80 flex items-center justify-center z-40">
            <div className="w-24 h-1 bg-white/60 rounded-full"></div>
          </div>
        );
      case 'tecno':
      default:
        // Android 3-button bar matching screenshot: ≡, ○, ⊃
        return (
          <div className="w-full py-2 px-14 flex items-center justify-between text-white/50 text-base font-light z-40 bg-black/90 border-t border-neutral-900">
            <span className="hover:text-white cursor-pointer text-lg">≡</span>
            <span className="hover:text-white cursor-pointer text-lg">○</span>
            <span className="hover:text-white cursor-pointer text-lg">⊃</span>
          </div>
        );
    }
  };

  // =========================================================================
  // 3. MODAL: "when we click the transaction bank account it will make us choose the phone screen and phone type"
  // =========================================================================
  const renderPickerModal = () => {
    if (!showPickerModal || !selectedTxForPicker) return null;

    const phoneScreens: { id: TruecallerBackgroundApp; name: string; icon: string; desc: string; previewBadge: string }[] = [
      { id: 'tiktok', name: 'TikTok', icon: '🎵', desc: 'Video feed, floating actions, music audio', previewBadge: 'Video Feed' },
      { id: 'youtube', name: 'YouTube', icon: '▶️', desc: 'Video player with red scrubber & recommended videos', previewBadge: 'Video Player' },
      { id: 'telegram', name: 'Telegram', icon: '✈️', desc: 'Addis Financial channel & bulletin feed', previewBadge: 'Chat App' },
      { id: 'instagram', name: 'Instagram', icon: '📷', desc: 'Stories tray, photo stream, comments', previewBadge: 'Feed & Stories' },
      { id: 'whatsapp', name: 'WhatsApp', icon: '💬', desc: 'Active chat conversation with voice note', previewBadge: 'Messenger' },
      { id: 'lockscreen', name: 'Lock Screen', icon: '📱', desc: 'Clean phone wallpaper with clock widget', previewBadge: 'Lock Screen' },
    ];

    const phoneTypes: { id: TruecallerPhoneType; name: string; icon: string; desc: string }[] = [
      { id: 'tecno', name: 'Tecno / Android', icon: '📲', desc: 'Matches your phone (1:28, 19.2 KB/s, battery 68)' },
      { id: 'iphone', name: 'iPhone 16 Pro', icon: '🍏', desc: 'Dynamic Island, iOS status bar, rounded sleek edges' },
      { id: 'samsung', name: 'Samsung Galaxy S24', icon: '🌌', desc: 'One UI status bar, punch hole camera, thin bezel' },
      { id: 'pixel', name: 'Google Pixel 9', icon: '🔘', desc: 'Material You status icons & pill navigation bar' },
    ];

    const previewAmt = parseFloat(pickerAmount || '450').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const previewAccount = maskTruecallerAccount(selectedTxForPicker.accountNumber);

    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
        <div className="w-full max-w-lg bg-[#1a1b1f] border-2 border-neutral-700 rounded-3xl overflow-hidden shadow-2xl text-white my-auto max-h-[94vh] flex flex-col">
          
          {/* Modal Header */}
          <div className="bg-[#0066FF] px-5 py-3.5 flex items-center justify-between text-white flex-shrink-0">
            <div className="flex items-center space-x-2">
              <span className="font-black text-base lowercase tracking-tight">truecaller</span>
              <span className="text-white/40">•</span>
              <span className="text-xs font-bold uppercase tracking-wider">Choose Phone Screen &amp; Phone Type</span>
            </div>
            <button 
              type="button"
              onClick={() => setShowPickerModal(false)}
              className="p-1 rounded-full hover:bg-white/20 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1 divide-y divide-neutral-800">
            
            {/* Selected Transaction Summary Banner */}
            <div className="bg-neutral-900/95 border border-neutral-800 rounded-2xl p-3.5 flex items-center justify-between shadow-inner">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#0066FF] flex items-center justify-center font-bold text-xs text-white shadow-sm flex-shrink-0">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm text-white">
                      ETB {previewAmt}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase ${
                      pickerRole === 'receiver' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {pickerRole === 'receiver' ? 'Credited' : 'Debited'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400">
                    A/C: {selectedTxForPicker.accountNumber} ({previewAccount})
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPickerRole(pickerRole === 'receiver' ? 'sender' : 'receiver')}
                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-cyan-400 border border-neutral-700 transition cursor-pointer"
              >
                Switch to {pickerRole === 'receiver' ? 'Debited' : 'Credited'}
              </button>
            </div>

            {/* STEP 1: CHOOSE PHONE SCREEN (BACKGROUND APP) */}
            <div className="pt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-blue-400 flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 inline-flex items-center justify-center text-[11px]">1</span>
                  <span>Choose Phone Screen</span>
                </label>
                <span className="text-[11px] text-neutral-400">Opening app in background</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {phoneScreens.map(scr => {
                  const isSelected = selectedPhoneScreen === scr.id;
                  return (
                    <button
                      key={scr.id}
                      type="button"
                      onClick={() => setSelectedPhoneScreen(scr.id)}
                      className={`p-3 rounded-2xl border-2 text-left cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-[#0066FF]/20 border-[#0066FF] text-white shadow-lg ring-2 ring-[#0066FF]/40' 
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-850'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 w-full">
                        <span className="text-2xl">{scr.icon}</span>
                        {isSelected ? (
                          <div className="w-4 h-4 rounded-full bg-[#0066FF] flex items-center justify-center text-white text-[10px]">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <span className="text-[9px] font-semibold text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">
                            {scr.previewBadge}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-white">{scr.name}</h4>
                        <p className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">{scr.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 2: CHOOSE PHONE TYPE */}
            <div className="pt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-blue-400 flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 inline-flex items-center justify-center text-[11px]">2</span>
                  <span>Choose Phone Type</span>
                </label>
                <span className="text-[11px] text-neutral-400">Device model &amp; status bar</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {phoneTypes.map(p => {
                  const isSelected = selectedPhoneType === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPhoneType(p.id)}
                      className={`p-3 rounded-2xl border-2 text-left cursor-pointer transition-all duration-150 flex items-center space-x-3 ${
                        isSelected 
                          ? 'bg-[#0066FF]/20 border-[#0066FF] text-white shadow-lg ring-2 ring-[#0066FF]/40' 
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-850'
                      }`}
                    >
                      <span className="text-2xl flex-shrink-0">{p.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-white truncate">{p.name}</h4>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-[#0066FF] flex items-center justify-center text-white text-[10px] flex-shrink-0">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-400 mt-0.5 leading-tight">{p.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 3: VISUAL STATUS BAR & TRUECALLER POP-DOWN COMPATIBILITY PREVIEW */}
            <div className="pt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-blue-400 flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 inline-flex items-center justify-center text-[11px]">3</span>
                  <span>Status Bar & Pop-Out Message Compatibility</span>
                </label>
                <span className="text-[11px] text-neutral-400">Live preview</span>
              </div>

              {/* Mini Phone Frame with Status Bar on Top and Pop-Out Message below matching IMG_20260905_131647_440.jpg */}
              <div className="rounded-[26px] overflow-hidden bg-black/90 border border-neutral-700 shadow-2xl">
                {/* Live Status Bar of chosen phone type */}
                {renderPhoneHeader(selectedPhoneType, selectedTxForPicker.timeString || '2:35 PM')}

                {/* Pop-Out Alert Card placed right underneath status bar */}
                <div className="p-3 bg-gradient-to-b from-neutral-950 via-neutral-900 to-black">
                  <div className="rounded-[24px] overflow-hidden bg-[#0066FF] p-[3.5px] shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
                    {/* Royal Blue Top Bar */}
                    <div className="bg-[#0066FF] px-4 pt-2.5 pb-2 flex items-center justify-between text-white select-none">
                      <span className="font-extrabold text-[17px] tracking-tight lowercase text-white">
                        truecaller
                      </span>

                      <div className="text-[13px] text-white/95 font-medium tracking-wide">
                        SMS • {selectedTxForPicker.timeString || '2:35 PM'}
                      </div>

                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white">
                        <X className="w-4 h-4 text-white stroke-[2.5]" />
                      </div>
                    </div>

                    {/* White Body Card Inset with Curved Corners */}
                    <div className="bg-white rounded-[21px] overflow-hidden text-slate-900">
                      <div className="p-4 pt-3.5 space-y-2.5">
                        {/* Bank Avatar & Name Header */}
                        <div className="flex items-center space-x-2.5">
                          <div className="w-9 h-9 rounded-full bg-[#dbe8ff] text-[#0066FF] flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-[#1e293b]" />
                          </div>
                          <div>
                            <h2 className="font-extrabold text-[17px] text-slate-900 tracking-tight leading-none">
                              {selectedTxForPicker.bankKey === 'cbe' ? 'CBE' : selectedTxForPicker.bankName}
                            </h2>
                          </div>
                        </div>

                        {/* Main Transaction Message Text */}
                        <div className="text-[16px] leading-[1.35] text-slate-900 font-bold tracking-tight pt-0.5">
                          Account {previewAccount} {pickerRole === 'receiver' ? 'credited with ETB' : 'debited with ETB'}
                          <div className="font-extrabold text-slate-950 text-[21px] tracking-tight mt-0.5">
                            {previewAmt}.
                          </div>
                        </div>

                        {/* AI Summary Tag */}
                        <div className="inline-flex items-center space-x-1.5 text-slate-500 text-[13.5px] font-medium pt-0.5">
                          <Sparkles className="w-4 h-4 text-[#0066FF] fill-[#0066FF]" />
                          <span className="font-medium text-slate-600">Al summary</span>
                        </div>
                      </div>

                      {/* Bottom Soft Blue Action Strip matching reference image */}
                      <div className="bg-[#ebf3fe] px-4 py-2.5 text-center border-t border-[#d8e5fa]/70 rounded-b-[21px]">
                        <span className="w-full text-center font-bold text-[16px] text-[#0066FF] block">
                          Mark as read
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Modal Footer Submit Button */}
          <div className="p-4 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowPickerModal(false)}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>

            {/* "Then we submit it will show the message popdown like same future of Truecaller" */}
            <button
              type="button"
              onClick={() => handleSubmitPicker()}
              className="px-6 py-2.5 rounded-full bg-[#0066FF] hover:bg-blue-600 active:scale-95 text-white font-extrabold text-sm shadow-xl transition cursor-pointer flex items-center space-x-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>Submit &amp; Pop Down Alert ⚡</span>
            </button>
          </div>

        </div>
      </div>
    );
  };

  // =========================================================================
  // 3. MAIN INTERFACE: GOOGLE MESSAGES INBOX (Matches Screenshot_20260904-132804.png)
  // =========================================================================
  if (view === 'inbox') {
    return (
      <div className="min-h-screen bg-[#121316] text-white flex flex-col font-sans select-none relative">
        
        {/* Android Native Status Bar (Exact match to user's screenshot) */}
        <div className="w-full px-5 pt-2.5 pb-1 flex items-center justify-between text-xs text-neutral-300">
          <div className="flex items-center space-x-1.5 font-medium tracking-tight">
            <span>1:28</span>
            <svg className="w-3.5 h-3.5 fill-current opacity-85" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </div>

          <div className="flex items-center space-x-2.5 text-[11px]">
            <span className="text-[11px] opacity-80">ᛒ</span>
            <span className="font-mono text-[10px] opacity-85">19.2 KB/s</span>
            <span className="font-semibold text-[10.5px]">H+</span>
            <span className="font-semibold text-[10.5px]">3G</span>
            <Wifi className="w-3.5 h-3.5" />
            <div className="flex items-center space-x-0.5">
              <div className="w-6 h-3.5 border border-white/80 rounded-xs p-0.5 flex items-center justify-center">
                <span className="text-[9.5px] font-bold leading-none">68</span>
              </div>
            </div>
          </div>
        </div>

        {/* Google Messages Top App Bar */}
        <header className="px-4 pt-3 pb-2 flex items-center justify-between sticky top-0 z-30 bg-[#121316]">
          {!isSearching ? (
            <>
              <div className="flex items-center space-x-2">
                <h1 className="text-[22px] sm:text-[24px] font-medium tracking-normal text-white">
                  Google Messages
                </h1>
              </div>

              <div className="flex items-center space-x-3">
                {/* Search Icon */}
                <button 
                  type="button"
                  onClick={() => setIsSearching(true)}
                  className="p-2 rounded-full hover:bg-neutral-800 text-neutral-200 transition-colors"
                  title="Search conversations"
                >
                  <Search className="w-5 h-5" />
                </button>

                {/* User Profile Avatar with Cyan Ring matching screenshot */}
                <button
                  type="button"
                  onClick={onBack}
                  className="relative flex items-center justify-center p-[2px] rounded-full border-2 border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  title="Back to Banking App"
                >
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                    L
                  </div>
                </button>
              </div>
            </>
          ) : (
            /* Inline Search Mode */
            <div className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-full bg-neutral-800/90 text-white">
              <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search images, videos & more"
                autoFocus
                className="bg-transparent border-none outline-none w-full text-sm placeholder-neutral-400"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="p-1">
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
              )}
              <button 
                type="button"
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery('');
                }}
                className="text-xs font-semibold text-blue-400 px-2 py-1"
              >
                Cancel
              </button>
            </div>
          )}
        </header>

        {/* Informative Header / Back to Banking Bar */}
        <div className="px-4 py-1.5 bg-neutral-900/60 border-b border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <span>Click <strong>CBE</strong> below to see transaction history &amp; pop-down</span>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-cyan-400 hover:text-cyan-300 font-semibold text-[11px] flex items-center space-x-1"
          >
            <span>Return to App</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Conversation Threads List */}
        <div className="flex-1 overflow-y-auto pb-24 divide-y divide-transparent">
          {filteredThreads.map(thread => {
            const isCbeThread = thread.id === 'CBE';
            return (
              <div
                key={thread.id}
                onClick={() => handleSelectThread(thread)}
                className={`w-full px-4 py-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                  isCbeThread 
                    ? 'hover:bg-purple-950/30 active:bg-purple-900/40 bg-purple-950/10' 
                    : 'hover:bg-neutral-800/50 active:bg-neutral-800/80'
                }`}
              >
                {/* Left Column: Silhouette Avatar & Sender details */}
                <div className="flex items-center space-x-3.5 min-w-0 pr-3 flex-1">
                  {/* Contact Silhouette Avatar with Solid Background Color */}
                  <div 
                    className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm overflow-hidden"
                    style={{ backgroundColor: thread.avatarColor }}
                  >
                    <div className="w-7 h-7 flex items-center justify-center">
                      <User className="w-6 h-6 text-white fill-white" />
                    </div>
                  </div>

                  {/* Sender Title and Snippet text */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <h2 className="text-[15.5px] font-semibold truncate text-neutral-100">
                        {thread.sender}
                      </h2>
                      {isCbeThread && (
                        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white uppercase tracking-wider">
                          Bank CBE • Tap to Open
                        </span>
                      )}
                    </div>
                    <p className={`text-[13.5px] truncate mt-0.5 leading-snug ${
                      thread.unreadCount > 0 ? 'text-neutral-200 font-medium' : 'text-neutral-400'
                    }`}>
                      {thread.snippet}
                    </p>
                  </div>
                </div>

                {/* Right Column: Time and Unread Blue Badge */}
                <div className="flex flex-col items-end flex-shrink-0 space-y-1.5 pl-2">
                  <span className={`text-[12px] font-normal ${
                    thread.unreadCount > 0 ? 'text-blue-400 font-medium' : 'text-neutral-400'
                  }`}>
                    {thread.timeLabel}
                  </span>

                  {thread.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#1a73e8] text-white text-[11px] font-semibold flex items-center justify-center shadow-sm">
                      {thread.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Action Buttons: Start Chat + Gemini sparkle */}
        <div className="fixed bottom-14 right-5 flex flex-col items-end space-y-3 z-30">
          {/* Gemini sparkle floating button matching screenshot */}
          <div className="w-11 h-11 rounded-full bg-neutral-800/90 text-cyan-400 border border-neutral-700 flex items-center justify-center shadow-xl cursor-pointer hover:bg-neutral-700 transition">
            <Sparkles className="w-5 h-5" />
          </div>

          {/* Start Chat Blue Pill Button */}
          <div 
            onClick={() => {
              setActiveBankKey('cbe');
              setActiveBankSenderName('CBE');
              setView('bank_thread');
            }}
            className="px-5 py-3 rounded-full bg-[#1a73e8] hover:bg-[#1558b0] active:scale-95 text-white font-semibold text-sm flex items-center space-x-2.5 shadow-2xl cursor-pointer transition"
          >
            <MessageSquare className="w-4 h-4 fill-white" />
            <span>Start chat</span>
          </div>
        </div>

        {/* Bottom Android System Navigation Bar matching screenshot (≡, ○, ⊃) */}
        <div className="w-full py-2 px-14 flex items-center justify-between text-neutral-500 text-lg font-light bg-[#121316] border-t border-neutral-800/80 sticky bottom-0 z-20">
          <span className="hover:text-white cursor-pointer">≡</span>
          <span className="hover:text-white cursor-pointer">○</span>
          <button 
            type="button" 
            onClick={onBack}
            className="hover:text-white cursor-pointer focus:outline-none"
            title="Return to Banking App"
          >
            ⊃
          </button>
        </div>

        {/* Modal: Choose Phone Screen & Phone Type */}
        {renderPickerModal()}

      </div>
    );
  }

  // =========================================================================
  // 2. BANK CBE TRANSACTION STREAM: "click the Bank CBE and open we can see the list transaction made"
  // =========================================================================
  if (view === 'bank_thread') {
    return (
      <div className="min-h-screen bg-[#121212] text-[#e3e3e3] flex flex-col font-sans select-none relative">
        
        {/* Android Status Bar */}
        <div className="w-full px-4 pt-1.5 pb-1 flex items-center justify-between text-xs text-neutral-400 bg-[#121212]">
          <div className="flex items-center space-x-1.5 font-medium tracking-tight text-white">
            <span>1:28</span>
            <svg className="w-3.5 h-3.5 fill-current opacity-85" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </div>
          <div className="flex items-center space-x-2 text-[11px]">
            <span className="font-mono text-[10px]">19.2 KB/s</span>
            <span className="font-bold text-[10px]">H+</span>
            <span className="font-bold text-[10px]">3G</span>
            <div className="w-6 h-3.5 border border-white/80 rounded-xs p-0.5 flex items-center justify-center">
              <span className="text-[9.5px] font-bold leading-none text-white">68</span>
            </div>
          </div>
        </div>

        {/* Bank Thread App Bar */}
        <header className="w-full bg-[#121212] border-b border-neutral-900/80 text-white px-2 py-2 flex items-center justify-between sticky top-0 z-30 shadow-md">
          <div className="flex items-center space-x-3">
            {/* Back Button returning to Google Messages inbox */}
            <button
              type="button"
              onClick={() => setView('inbox')}
              className="p-2 rounded-full hover:bg-neutral-800 text-white transition-colors active:scale-95 cursor-pointer"
              title="Back to Google Messages Inbox"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            {/* Bank Avatar */}
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ backgroundColor: activeBankPreset.color || '#8e24aa' }}
            >
              <User className="w-6 h-6 text-white" />
            </div>

            {/* Bank Title & Shortcode */}
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="text-[19px] font-medium tracking-wide leading-none text-white">
                  {activeBankSenderName}
                </h1>
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Commercial Bank of Ethiopia • 889
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 text-neutral-300">
            <button
              type="button"
              onClick={() => setShowQuickSimModal(true)}
              className="px-2.5 py-1 bg-purple-700 hover:bg-purple-600 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition cursor-pointer shadow-sm"
              title="Simulate New Transaction"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Simulate Tx</span>
            </button>
            <button 
              type="button"
              onClick={() => setView('inbox')}
              className="p-2 rounded-full hover:bg-neutral-800 text-neutral-300"
              title="Options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Call to action instruction banner */}
        <div className="bg-gradient-to-r from-blue-900/60 via-purple-900/50 to-blue-900/60 border-b border-blue-500/30 px-4 py-2.5 flex items-center justify-between text-xs text-blue-100">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0 animate-pulse" />
            <span>
              <strong>Step 2:</strong> Click any transaction below to choose <strong>Phone Screen &amp; Phone Type</strong> to show Truecaller pop-down!
            </span>
          </div>
        </div>

        {/* Transaction Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
          {bankTransactions.length === 0 ? (
            <div className="text-center py-16 text-neutral-500 text-sm">
              No transactions found for {activeBankSenderName}.
            </div>
          ) : (
            bankTransactions.map(tx => {
              const isCredit = tx.role === 'receiver';
              return (
                <div
                  key={tx.id}
                  onClick={() => handleOpenPickerForTx(tx)}
                  className={`w-full max-w-md mx-auto bg-[#1f2023] hover:bg-[#25282d] border-2 ${
                    tx.isNow 
                      ? 'border-[#0066FF]/60 shadow-[0_4px_25px_rgba(0,102,255,0.18)]' 
                      : 'border-neutral-800'
                  } hover:border-[#0066FF] rounded-2xl p-4 transition-all duration-150 cursor-pointer shadow-lg group relative active:scale-[0.99]`}
                >
                  {/* Card Header: Credit/Debit status, Now Badge & Time */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide flex items-center space-x-1 ${
                        isCredit 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {isCredit ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                        <span>{isCredit ? 'Credited' : 'Debited'}</span>
                      </span>

                      {/* Prominent "Now" Badge */}
                      {tx.isNow && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#0066FF] text-white shadow-sm flex items-center space-x-1 border border-blue-400/50 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-200 mr-0.5" />
                          <span>Now</span>
                        </span>
                      )}

                      <span className="text-xs font-mono font-bold text-neutral-200">
                        ETB {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-xs text-neutral-400 font-medium">
                      {tx.isNow ? (
                        <span className="text-cyan-400 font-semibold text-[11.5px] flex items-center space-x-1">
                          <span>Now</span>
                          <span className="text-neutral-500">•</span>
                          <span className="text-neutral-300 font-normal">{tx.timeString}</span>
                        </span>
                      ) : (
                        <span>{tx.timeString}</span>
                      )}
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="text-[13.5px] leading-relaxed text-neutral-200 whitespace-pre-line font-normal">
                    {tx.fullMessageText}
                  </div>

                  {/* Interactive Footer Button: Choose Phone Screen & Phone Type */}
                  <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs text-neutral-400">
                      <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                      <span className="font-mono text-[11px] text-purple-300 font-semibold">
                        {tx.accountNumber}
                      </span>
                    </div>

                    {/* Prominent Action Button: Launch Picker */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPickerForTx(tx);
                      }}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#0066FF] hover:bg-blue-600 active:scale-95 text-white text-xs font-bold shadow-md transition cursor-pointer"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Choose Phone &amp; Pop Down ⚡</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Bar with simulate quick button & back */}
        <div className="p-3 bg-[#17181a] border-t border-neutral-800 flex items-center justify-between sticky bottom-0 z-20">
          <button
            type="button"
            onClick={() => setView('inbox')}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition flex items-center space-x-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Google Messages Inbox</span>
          </button>

          <button
            type="button"
            onClick={() => setShowQuickSimModal(true)}
            className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Simulate Custom Tx</span>
          </button>
        </div>

        {/* Modal: Quick Simulate Custom Transaction */}
        {showQuickSimModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#1f2023] border border-neutral-700 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center font-bold text-xs text-white">
                    CBE
                  </div>
                  <h3 className="font-extrabold text-sm text-white">Simulate CBE Transaction</h3>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowQuickSimModal(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleQuickSimulateSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="text-neutral-400 font-semibold mb-1 block">Transaction Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSimRole('receiver')}
                      className={`py-2 rounded-xl font-bold transition flex items-center justify-center space-x-1.5 ${
                        simRole === 'receiver' 
                          ? 'bg-emerald-600 text-white shadow-md' 
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      }`}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                      <span>Credited (Receive)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimRole('sender')}
                      className={`py-2 rounded-xl font-bold transition flex items-center justify-center space-x-1.5 ${
                        simRole === 'sender' 
                          ? 'bg-rose-600 text-white shadow-md' 
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      }`}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span>Debited (Send)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-neutral-400 font-semibold mb-1 block">Amount (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={simAmount}
                    onChange={(e) => setSimAmount(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-neutral-400 font-semibold mb-1 block">CBE Account Number</label>
                  <input
                    type="text"
                    value={simAccNumber}
                    onChange={(e) => setSimAccNumber(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-neutral-400 font-semibold mb-1 block">Sender / Counterparty Name</label>
                  <input
                    type="text"
                    value={simCounterparty}
                    onChange={(e) => setSimCounterparty(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 active:scale-95 text-white font-extrabold text-xs shadow-lg transition cursor-pointer"
                  >
                    Create &amp; Choose Phone Screen ⚡
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Choose Phone Screen & Phone Type */}
        {renderPickerModal()}

      </div>
    );
  }

  // =========================================================================
  // 4. FULL SCREEN PHONE TAKEOVER WITH TRUECALLER POP-DOWN ALERT:
  // "Then we submit it will show the message popdown like same future of Truecaller"
  // =========================================================================
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden select-none font-sans">
      
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed top-12 z-50 bg-white text-slate-900 font-bold px-4 py-2 rounded-full shadow-2xl text-xs flex items-center space-x-2 border border-blue-500 animate-in fade-in slide-in-from-top-3 duration-150">
          <CheckCircle2 className="w-4 h-4 text-[#0066FF]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* PHONE DEVICE FRAME CONTAINER */}
      <div className="relative w-full h-full max-w-[440px] max-h-[920px] bg-black sm:rounded-[38px] overflow-hidden sm:border-[5px] sm:border-neutral-800 shadow-[0_25px_70px_rgba(0,0,0,0.8)] flex flex-col">
        
        {/* Selected Phone Hardware Status Bar */}
        {renderPhoneHeader(selectedPhoneType, currentAlert?.timeString)}

        {/* Selected Phone Screen (TikTok, YouTube, Telegram, Instagram, WhatsApp, LockScreen) */}
        <div className="relative w-full flex-1 overflow-hidden">
          {renderBackgroundScreen(selectedPhoneScreen)}

          {/* =============================================================== */}
          {/* TRUECALLER SMS NOTIFICATION POP-DOWN OVERLAY                    */}
          {/* Zero vertical gap with status bar, matching IMG_20260905_131647_440.jpg */}
          {/* =============================================================== */}
          {isPopdownVisible && currentAlert && (
            <div 
              className={`absolute top-0 inset-x-0 z-50 px-2 sm:px-2.5 pointer-events-auto transition-all duration-300 transform ${
                isPopdownAnimating 
                  ? '-translate-y-full opacity-0 scale-95' 
                  : 'translate-y-0 opacity-100 scale-100'
              }`}
            >
              <div 
                className="w-full rounded-[24px] overflow-hidden bg-[#0066FF] p-[3px] shadow-[0_20px_60px_rgba(0,0,0,0.85)] border border-[#0066FF] transition-all"
              >
                {/* Signature Royal Blue Truecaller Header Bar */}
                <div className="bg-[#0066FF] px-3.5 pt-2 pb-1.5 flex items-center justify-between text-white select-none">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-[16.5px] tracking-tight lowercase text-white">
                      truecaller
                    </span>
                  </div>

                  <div className="text-[13px] text-white/95 font-medium tracking-wide">
                    SMS • {currentAlert.timeString}
                  </div>

                  {/* Close 'X' Button */}
                  <button 
                    type="button"
                    onClick={() => setIsPopdownVisible(false)}
                    className="w-6 h-6 rounded-full hover:bg-white/20 active:scale-90 transition flex items-center justify-center cursor-pointer text-white"
                    title="Dismiss alert"
                  >
                    <X className="w-4 h-4 text-white stroke-[2.5]" />
                  </button>
                </div>

                {/* White Inset Body Card with curved corners matching reference photo IMG_20260905_131647_440.jpg */}
                <div className="bg-white rounded-[21px] overflow-hidden text-slate-900">
                  
                  {/* Top content area with avatar, text, and AI summary */}
                  <div className="px-4 pt-3.5 pb-3 space-y-2.5">
                    {/* Bank Avatar & Name Header */}
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#dbe8ff] text-[#0066FF] flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-[#2c3e50]" />
                      </div>
                      <div>
                        <h2 className="font-extrabold text-[17.5px] text-slate-900 tracking-tight leading-none">
                          {currentAlert.bankKey === 'cbe' ? 'CBE' : currentAlert.bankName}
                        </h2>
                      </div>
                    </div>

                    {/* Main Transaction Message Text (Matches exact layout in reference photo IMG_20260905_131647_440.jpg) */}
                    <div className="text-[15.5px] sm:text-[16px] leading-snug text-slate-900 font-bold tracking-tight pt-0.5">
                      Account {(currentAlert.maskedAccount || '1********0913').replace(/X/g, '*')} {currentAlert.role === 'receiver' ? 'credited with ETB' : 'debited with ETB'}
                      <div className="font-extrabold text-slate-950 text-[22px] sm:text-[23px] tracking-tight mt-0.5 leading-none">
                        {currentAlert.amount.toFixed(2)}.
                      </div>
                    </div>

                    {/* AI Summary Tag matching reference photo IMG_20260905_131647_440.jpg */}
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={() => setShowAiBreakdown(!showAiBreakdown)}
                        className="inline-flex items-center space-x-1.5 text-slate-600 hover:text-[#0066FF] text-[14px] font-medium transition cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-[#0066FF] fill-[#0066FF]" />
                        <span className="font-medium text-slate-600">AI summary</span>
                      </button>

                      {/* Expandable AI Breakdown Details */}
                      {showAiBreakdown && (
                        <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-700 animate-in fade-in duration-150">
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">Full Account:</span>
                            <span className="font-bold font-mono text-slate-800">{currentAlert.fullAccount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">Holder Name:</span>
                            <span className="font-bold text-slate-800">{currentAlert.holderName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">Counterparty:</span>
                            <span className="font-bold text-slate-800">{currentAlert.counterpartyName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">Reference ID:</span>
                            <span className="font-bold font-mono text-slate-800">{currentAlert.txId}</span>
                          </div>
                          {currentAlert.balanceAfter !== undefined && (
                            <div className="flex justify-between border-t border-slate-200 pt-1.5">
                              <span className="text-slate-400 font-medium">Balance After:</span>
                              <span className="font-bold text-emerald-700">
                                ETB {currentAlert.balanceAfter.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Soft Blue Action Strip matching reference image IMG_20260905_131647_440.jpg */}
                  <div className="bg-[#ebf3fe] px-4 py-3 text-center border-t border-[#d8e5fa]/60 rounded-b-[21px]">
                    <button
                      type="button"
                      onClick={handleMarkAsRead}
                      className={`w-full py-0.5 text-center font-bold text-[17px] transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                        currentAlert.read 
                          ? 'text-emerald-600' 
                          : 'text-[#0066FF] hover:text-[#0052cc] active:scale-98'
                      }`}
                    >
                      {currentAlert.read ? (
                        <>
                          <CheckCheck className="w-4 h-4" />
                          <span>Read</span>
                        </>
                      ) : (
                        <span>Mark as read</span>
                      )}
                    </button>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* ONE-LINE GRID CONTROLS: Back, Reload / Simulate Again, Choose  */}
          {/* Sits behind the popdown message (z-20 layer vs popdown z-50)   */}
          {/* =============================================================== */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 px-3 sm:px-4 flex items-center justify-center pointer-events-auto select-none">
            <div className="grid grid-cols-3 gap-2 w-full max-w-[400px] p-2 bg-neutral-950/85 backdrop-blur-md rounded-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
              {/* 1. Back Button */}
              <button
                type="button"
                onClick={() => setView('bank_thread')}
                className="flex items-center justify-center space-x-1.5 py-2.5 px-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition active:scale-95 border border-white/10 cursor-pointer"
                title="Back to CBE Transactions"
              >
                <ArrowLeft className="w-4 h-4 text-neutral-300 flex-shrink-0" />
                <span className="truncate">Back</span>
              </button>

              {/* 2. Reloading or Simulate Again Button */}
              <button
                type="button"
                onClick={handleRetriggerAlert}
                className="flex items-center justify-center space-x-1.5 py-2.5 px-2 rounded-xl bg-[#0066FF] hover:bg-blue-600 text-white text-xs font-extrabold transition active:scale-95 shadow-lg border border-blue-400/40 cursor-pointer"
                title="Simulate or Reload Truecaller Pop-down Alert"
              >
                <RefreshCw className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Simulate Again</span>
              </button>

              {/* 3. Choose Button */}
              <button
                type="button"
                onClick={() => {
                  if (currentAlert) {
                    handleOpenPickerForTx({
                      id: currentAlert.id,
                      amount: currentAlert.amount,
                      accountNumber: currentAlert.fullAccount,
                      maskedAccount: currentAlert.maskedAccount,
                      holderName: currentAlert.holderName,
                      role: currentAlert.role,
                      bankName: currentAlert.bankName,
                      bankKey: currentAlert.bankKey,
                      timeString: currentAlert.timeString,
                      timestamp: currentAlert.timestamp,
                      counterpartyName: currentAlert.counterpartyName,
                      balanceAfter: currentAlert.balanceAfter,
                      txId: currentAlert.txId,
                      fullMessageText: currentAlert.summaryText,
                    });
                  } else {
                    setShowPickerModal(true);
                  }
                }}
                className="flex items-center justify-center space-x-1.5 py-2.5 px-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-300 text-xs font-bold transition active:scale-95 border border-amber-400/35 cursor-pointer"
                title="Choose Phone Model, Background Screen, or Bank Transaction"
              >
                <Smartphone className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="truncate">Choose</span>
              </button>
            </div>
          </div>

        </div>

        {/* Selected Phone Hardware Navigation Bar */}
        {renderPhoneFooter(selectedPhoneType)}

      </div>

      {/* Render the Picker Modal if triggered */}
      {renderPickerModal()}

    </div>
  );
}

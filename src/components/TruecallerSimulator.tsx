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
  ChevronLeft,
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
  ArrowUp,
  Users,
  ShieldAlert,
  Info,
  Shield,
  CheckCircle,
  Settings,
  Sliders,
  Inbox,
  Filter,
  Clock,
  Type,
  Eye,
  ShoppingBag,
  QrCode,
  Palette,
  BellRing
} from 'lucide-react';
import { CbeWebReceiptModal } from './CbeWebReceiptModal';
import { CbeHolidayCardModal } from './CbeHolidayCardModal';
import { openWebReceiptInRealBrowser } from '../services/webReceiptBrowserService';
import { 
  TruecallerBankAccount, 
  TruecallerAlert, 
  TruecallerRole, 
  TruecallerBankKey,
  TruecallerBackgroundApp,
  TruecallerPhoneType,
  PopdownFontFamily,
  PopdownFontSize,
  TruecallerBaseTheme,
  TruecallerColorAccent,
  TruecallerThemeConfig
} from '../types/truecaller';
import PhoneSettingsModal from './PhoneSettingsModal';
import SubAppPushModal from './SubAppPushModal';
import { PhoneSettingsService, PhoneModelType } from '../services/phoneSettingsService';
import { PushNotificationService } from '../services/pushNotificationService';
import { 
  TruecallerService, 
  BANK_PRESETS, 
  TRUECALLER_ACCENT_PRESETS,
  TRUECALLER_BASE_THEMES,
  maskTruecallerAccount, 
  formatCurrentTimeString,
  formatTimeFromIso,
  getDefaultBackgroundApp
} from '../services/truecallerService';
import { LocalDb } from '../lib/mockData';
import { Transaction } from '../types';
import { SystemBarsService } from '../services/systemBarsService';
import { SmsService } from '../services/smsService';
import { PhoneCallService } from '../services/phoneCallService';
import { GoogleMessagesService } from '../services/googleMessagesData';

interface TruecallerSimulatorProps {
  onBack: () => void;
}

export const POPDOWN_FONTS: { id: PopdownFontFamily; name: string; style: string; badge: string; desc: string }[] = [
  { id: 'system', name: 'System UI', style: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', badge: 'Default', desc: 'Standard mobile OS font' },
  { id: 'inter', name: 'Inter Clean', style: '"Inter", sans-serif', badge: 'Modern', desc: 'High-legibility sans-serif' },
  { id: 'mono', name: 'JetBrains Mono', style: '"JetBrains Mono", monospace', badge: 'Tech', desc: 'Digital banking monospace' },
  { id: 'space', name: 'Space Grotesk', style: '"Space Grotesk", sans-serif', badge: 'Geometric', desc: 'Modern geometric display' },
  { id: 'nunito', name: 'Nunito Rounded', style: '"Nunito", system-ui, sans-serif', badge: 'Soft', desc: 'Friendly rounded numerals' },
  { id: 'oswald', name: 'Oswald Condensed', style: '"Oswald", "Arial Narrow", sans-serif', badge: 'Impact', desc: 'High-contrast condensed digits' },
  { id: 'serif', name: 'Classic Serif', style: 'Georgia, Cambria, "Times New Roman", serif', badge: 'Classic', desc: 'Formal banking elegance' },
];

export const POPDOWN_SIZES: { id: PopdownFontSize; name: string; accountPx: number; amountPx: number; label: string }[] = [
  { id: 'sm', name: 'Small', accountPx: 14, amountPx: 19, label: 'Compact (19px)' },
  { id: 'md', name: 'Normal', accountPx: 15.5, amountPx: 22, label: 'Standard (22px)' },
  { id: 'lg', name: 'Large', accountPx: 17.5, amountPx: 25, label: 'Prominent (25px)' },
  { id: 'xl', name: 'Extra Large', accountPx: 19.5, amountPx: 29, label: 'Bold (29px)' },
];

// Synthesize pleasant SMS arrival alert chime using browser Web Audio API
function updateSmsAvailableBalance(messageText: string, balance: number): string {
  if (!messageText) return messageText;
  const formattedBal = balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  // Your current balance is ETB...
  if (/Your current balance is ETB\s*[\d,]+(\.\d+)?/i.test(messageText)) {
    return messageText.replace(/Your current balance is ETB\s*[\d,]+(\.\d+)?/i, `Your current balance is ETB${formattedBal}`);
  }
  // Your Current Balance is ETB ...
  if (/Your Current Balance is ETB\s*[\d,]+(\.\d+)?/i.test(messageText)) {
    return messageText.replace(/Your Current Balance is ETB\s*[\d,]+(\.\d+)?/i, `Your Current Balance is ETB ${formattedBal}`);
  }
  // Available Balance is ETB ...
  if (/Available Balance\s+is\s+ETB\s*[\d,]+(\.\d+)?/i.test(messageText)) {
    return messageText.replace(/Available Balance\s+is\s+ETB\s*[\d,]+(\.\d+)?/i, `Available Balance is ETB ${formattedBal}`);
  }
  // Available Balance: ETB ...
  if (/Available Balance\s*:\s*ETB\s*[\d,]+(\.\d+)?/i.test(messageText)) {
    return messageText.replace(/Available Balance\s*:\s*ETB\s*[\d,]+(\.\d+)?/i, `Available Balance: ETB ${formattedBal}`);
  }
  return messageText;
}

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
  const [view, setView] = useState<'inbox' | 'bank_thread' | 'takeover'>('bank_thread');
  
  // Selected bank for thread view
  const [activeBankKey, setActiveBankKey] = useState<TruecallerBankKey>('cbe');
  const [activeBankSenderName, setActiveBankSenderName] = useState<string>('Cbe Bank');

  // 3-Dot Dropdown Menu & Registered Account Management
  const [showThreeDotMenu, setShowThreeDotMenu] = useState<boolean>(false);
  const [threeDotTab, setThreeDotTab] = useState<'accounts' | 'settings' | 'simulate' | 'profile'>('accounts');
  const [inboxFilterMode, setInboxFilterMode] = useState<'all' | 'inbox'>('all');
  const [statusClockMode, setStatusClockMode] = useState<'11:54' | 'live'>('11:54');
  const [batteryPercent, setBatteryPercent] = useState<number>(68);
  const [selectedSimSlot, setSelectedSimSlot] = useState<number>(2);
  const [showSpamBadge, setShowSpamBadge] = useState<boolean>(true);
  const [recentTxOnTop, setRecentTxOnTop] = useState<boolean>(true);
  const [enableSoundHaptics, setEnableSoundHaptics] = useState<boolean>(true);
  const [showPhoneSettingsModal, setShowPhoneSettingsModal] = useState<boolean>(false);
  const [showPushSettingsModal, setShowPushSettingsModal] = useState<boolean>(false);

  const [showAddAccountModal, setShowAddAccountModal] = useState<boolean>(false);
  const [newAccountHolder, setNewAccountHolder] = useState<string>('Leykun Jemaneh Ylma');
  const [newAccountNumber, setNewAccountNumber] = useState<string>('1000419524747');
  const [newAccountBalance, setNewAccountBalance] = useState<string>('298.54');
  const [newAccountRole, setNewAccountRole] = useState<TruecallerRole>('sender');
  const [receiptModalTx, setReceiptModalTx] = useState<any>(null);
  const [showHolidayCardModal, setShowHolidayCardModal] = useState<boolean>(false);
  const [useLiveClock, setUseLiveClock] = useState<boolean>(false);
  const [bubbleActionTx, setBubbleActionTx] = useState<any>(null);
  const [isIPhone, setIsIPhone] = useState<boolean>(() => PhoneSettingsService.isIPhoneMode());

  useEffect(() => {
    return PhoneSettingsService.subscribe(() => {
      const isIos = PhoneSettingsService.isIPhoneMode();
      setIsIPhone(isIos);
      if (isIos) {
        setSelectedPhoneType('iphone');
      }
    });
  }, []);

  // Truecaller Color Theme & Base Appearance Settings
  const [themeConfig, setThemeConfigState] = useState<TruecallerThemeConfig>(() => TruecallerService.getThemeConfig());
  const currentAccent = useMemo(() => TruecallerService.getAccent(themeConfig.accentId), [themeConfig.accentId]);
  const currentBaseTheme = useMemo(() => TruecallerService.getBaseTheme(themeConfig.base), [themeConfig.base]);
  const isLightMode = themeConfig.base === 'light';
  const isMidnightMode = themeConfig.base === 'midnight';
  const isAmoledMode = themeConfig.base === 'amoled';

  const handleUpdateAccent = (accentId: string) => {
    const updated = TruecallerService.setThemeConfig({ accentId });
    setThemeConfigState(updated);
    SystemBarsService.syncForView('truecaller', { isIPhone, subView: view });
    showToast(`Color theme set to ${TruecallerService.getAccent(accentId).name}`);
  };

  const handleUpdateBaseTheme = (base: TruecallerBaseTheme) => {
    const updated = TruecallerService.setThemeConfig({ base });
    setThemeConfigState(updated);
    SystemBarsService.syncForView('truecaller', { isIPhone, subView: view });
    showToast(`Appearance set to ${TruecallerService.getBaseTheme(base).name}`);
  };

  // Ensure native device status bar and navigation bar follow the Truecaller theme
  useEffect(() => {
    SystemBarsService.syncForView('truecaller', { isIPhone, subView: view });
  }, [isIPhone, view, themeConfig.base]);

  // Popdown Typography Settings (Font Family & Text Size)
  const [popdownFontFamily, setPopdownFontFamily] = useState<PopdownFontFamily>(() => {
    try {
      return (localStorage.getItem('tc_popdown_font') as PopdownFontFamily) || 'system';
    } catch {
      return 'system';
    }
  });
  const [popdownFontSize, setPopdownFontSize] = useState<PopdownFontSize>(() => {
    try {
      return (localStorage.getItem('tc_popdown_size') as PopdownFontSize) || 'md';
    } catch {
      return 'md';
    }
  });
  const [popdownScale, setPopdownScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('tc_popdown_scale');
      return saved ? Math.min(150, Math.max(80, parseInt(saved, 10))) : 100;
    } catch {
      return 100;
    }
  });
  const [showTypographyDrawer, setShowTypographyDrawer] = useState<boolean>(false);

  const handleUpdateFont = (font: PopdownFontFamily) => {
    setPopdownFontFamily(font);
    try {
      localStorage.setItem('tc_popdown_font', font);
    } catch {}
  };

  const handleUpdateSize = (size: PopdownFontSize) => {
    setPopdownFontSize(size);
    try {
      localStorage.setItem('tc_popdown_size', size);
    } catch {}
  };

  const handleUpdateScale = (scale: number) => {
    setPopdownScale(scale);
    try {
      localStorage.setItem('tc_popdown_scale', scale.toString());
    } catch {}
  };

  const activeFont = useMemo(() => {
    return POPDOWN_FONTS.find(f => f.id === popdownFontFamily) || POPDOWN_FONTS[0];
  }, [popdownFontFamily]);

  const activeSize = useMemo(() => {
    return POPDOWN_SIZES.find(s => s.id === popdownFontSize) || POPDOWN_SIZES[1];
  }, [popdownFontSize]);

  const scaleFactor = popdownScale / 100;
  const computedAccountFontSize = `${(activeSize.accountPx * scaleFactor).toFixed(1)}px`;
  const computedAmountFontSize = `${(activeSize.amountPx * scaleFactor).toFixed(1)}px`;

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

  // Active selected account for thread and messages
  const [activeAccountId, setActiveAccountId] = useState<string>(() => {
    return TruecallerService.getActiveAccountId();
  });
  const [accountSearchQuery, setAccountSearchQuery] = useState<string>('');

  // Active selected account object (defaults to first CBE account or first account)
  const activeAccount = useMemo(() => {
    if (activeAccountId) {
      const found = accounts.find(a => a.id === activeAccountId);
      if (found) return found;
    }
    const cbeAcc = accounts.find(a => a.bankKey === 'cbe') || accounts[0];
    return cbeAcc || null;
  }, [accounts, activeAccountId]);

  // Bank specific accounts list (e.g. CBE accounts)
  const bankSpecificAccounts = useMemo(() => {
    const matching = accounts.filter(a => a.bankKey === activeBankKey);
    return matching.length > 0 ? matching : accounts;
  }, [accounts, activeBankKey]);

  // Determine which account has the current / newest message:
  // USER RULE: "And in true callers app sms now badge is only the recent transaction ok the old message must not have now badge"
  const currentMessageAccountId = useMemo(() => {
    // Check newest alert for active bank strictly by timestamp
    const bankAlerts = alerts.filter(a => a.bankKey === activeBankKey);
    const candidateAlerts = bankAlerts.length > 0 ? bankAlerts : alerts;
    if (candidateAlerts.length > 0) {
      const sortedAlerts = [...candidateAlerts].sort((a, b) => {
        const tA = new Date(a.timestamp).getTime() || 0;
        const tB = new Date(b.timestamp).getTime() || 0;
        return tB - tA;
      });
      const topAlert = sortedAlerts[0];
      // Only grant Now badge if the top alert is recent (created within active session / last 24 hours)
      const topAlertTime = new Date(topAlert.timestamp).getTime() || 0;
      const isRecent = (Date.now() - topAlertTime) < 24 * 60 * 60 * 1000;
      if (isRecent) {
        const matched = accounts.find(acc => 
          acc.id === topAlert.accountId ||
          acc.accountNumber === topAlert.fullAccount ||
          acc.accountNumber === topAlert.maskedAccount
        );
        if (matched) return matched.id;
        if (topAlert.accountId) return topAlert.accountId;
      }
    }

    // Check if an account explicitly has recent transaction with isNow
    const explicitNowAcc = accounts.find(a => a.isNow && a.bankKey === activeBankKey);
    if (explicitNowAcc) return explicitNowAcc.id;

    // Do NOT fall back to arbitrary first account or old accounts!
    return null;
  }, [alerts, accounts, activeBankKey]);

  // Identify both latest transaction Receiver & Sender from live tana_transactions + Truecaller alerts
  const latestTxRoleMap = useMemo(() => {
    const map = new Map<string, 'sender' | 'receiver'>();
    try {
      const rawTx = typeof window !== 'undefined'
        ? localStorage.getItem('tana_transactions') || localStorage.getItem('cbe_transactions')
        : null;
      if (rawTx) {
        const parsed = JSON.parse(rawTx);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sorted = [...parsed].sort((a: any, b: any) => {
            const ta = new Date(a?.createdAt || a?.date || a?.timestamp || 0).getTime();
            const tb = new Date(b?.createdAt || b?.date || b?.timestamp || 0).getTime();
            return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
          });
          const top = sorted[0];
          if (top) {
            const rClean = String(top.recipientAccount || '').replace(/\D/g, '');
            const sClean = String(top.senderAccount || '').replace(/\D/g, '');
            if (rClean) map.set(rClean, 'receiver');
            if (sClean && sClean !== rClean) map.set(sClean, 'sender');
          }
        }
      }
    } catch {}

    if (map.size < 2 && alerts.length > 0) {
      const bankAlerts = alerts.filter(a => a.bankKey === activeBankKey);
      for (const a of bankAlerts) {
        const clean = String(a.fullAccount || '').replace(/\D/g, '');
        if (clean && !map.has(clean)) {
          map.set(clean, a.role === 'sender' ? 'sender' : 'receiver');
        }
        if (map.size >= 2) break;
      }
    }
    return map;
  }, [alerts, accounts, activeBankKey]);

  // Search filtered accounts list with both latest Receiver & Sender pinned at top:
  const filteredAccounts = useMemo(() => {
    let list = bankSpecificAccounts;
    if (accountSearchQuery.trim()) {
      const q = accountSearchQuery.toLowerCase().trim();
      list = list.filter(a => 
        a.holderName.toLowerCase().includes(q) ||
        a.accountNumber.includes(q) ||
        (a.maskedAccount && a.maskedAccount.includes(q))
      );
    }

    return [...list].sort((a, b) => {
      if (recentTxOnTop) {
        const aClean = String(a.accountNumber || '').replace(/\D/g, '');
        const bClean = String(b.accountNumber || '').replace(/\D/g, '');
        const aRole = latestTxRoleMap.get(aClean);
        const bRole = latestTxRoleMap.get(bClean);
        if (aRole && !bRole) return -1;
        if (!aRole && bRole) return 1;
        if (aRole && bRole && aRole !== bRole) {
          return aRole === 'receiver' ? -1 : 1;
        }
        if (currentMessageAccountId) {
          const aIsCurrent = a.id === currentMessageAccountId;
          const bIsCurrent = b.id === currentMessageAccountId;
          if (aIsCurrent && !bIsCurrent) return -1;
          if (!aIsCurrent && bIsCurrent) return 1;
        }
      }
      const timeA = a.lastTransactionAt ? new Date(a.lastTransactionAt).getTime() : 0;
      const timeB = b.lastTransactionAt ? new Date(b.lastTransactionAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [bankSpecificAccounts, accountSearchQuery, currentMessageAccountId, recentTxOnTop, latestTxRoleMap]);

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
  const [selectedPhoneType, setSelectedPhoneType] = useState<TruecallerPhoneType>(() => PhoneSettingsService.isIPhoneMode() ? 'iphone' : 'tecno');
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
    phoneType: PhoneSettingsService.isIPhoneMode() ? 'iphone' : 'tecno',
  }));
  const [isPopdownVisible, setIsPopdownVisible] = useState<boolean>(true);
  const [isPopdownAnimating, setIsPopdownAnimating] = useState<boolean>(false);
  const [showAiBreakdown, setShowAiBreakdown] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick simulate transaction modal
  const [showQuickSimModal, setShowQuickSimModal] = useState<boolean>(false);
  const [simMode, setSimMode] = useState<'transfer' | 'single'>('transfer');
  const [simSenderName, setSimSenderName] = useState<string>('User X (Leykun Jemaneh)');
  const [simSenderAccount, setSimSenderAccount] = useState<string>('1000419529165');
  const [simReceiverName, setSimReceiverName] = useState<string>('User Y (Abebe Bikila)');
  const [simReceiverAccount, setSimReceiverAccount] = useState<string>('1000419520913');
  const [simAmount, setSimAmount] = useState<string>('4500.00');
  const [simRole, setSimRole] = useState<TruecallerRole>('receiver');
  const [simAccNumber, setSimAccNumber] = useState<string>('1000419529165');
  const [simHolderName, setSimHolderName] = useState<string>('Leykun Jemaneh Ylma');
  const [simCounterparty, setSimCounterparty] = useState<string>('Abebe Bikila');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);

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

  // Listen for external transaction & account-switch updates
  useEffect(() => {
    const handleUpdate = () => {
      setAccounts(TruecallerService.getAccounts());
      setAlerts(TruecallerService.getAlerts());
      try {
        setRawAppTransactions(LocalDb.getTransactions());
      } catch {}
    };
    const handleExternalAccountSwitch = (e: Event) => {
      const detail = (e as CustomEvent<{ user?: { accountNumber?: string }; account?: { id?: string; accountNumber?: string } }>).detail;
      const accNum = detail?.user?.accountNumber || detail?.account?.accountNumber;
      if (accNum) {
        const matched = TruecallerService.setActiveAccountByNumber(accNum);
        if (matched) {
          setActiveAccountId(matched.id);
          setSimSenderAccount(matched.accountNumber);
          setSimSenderName(matched.holderName);
        }
      }
      handleUpdate();
    };
    window.addEventListener('tc_alerts_updated', handleUpdate);
    window.addEventListener('truecaller_updated', handleUpdate);
    window.addEventListener('tc_popdown_dismissed', handleUpdate);
    window.addEventListener('tc_account_changed', handleExternalAccountSwitch);
    window.addEventListener('cbe_account_switched', handleExternalAccountSwitch);
    window.addEventListener('cbe_crossapp_synced', handleUpdate);
    window.addEventListener('cbe_balance_updated', handleUpdate);
    window.addEventListener('cbe_transaction_completed', handleUpdate);
    window.addEventListener('sms-created', handleUpdate);
    window.addEventListener('sms-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('tc_alerts_updated', handleUpdate);
      window.removeEventListener('truecaller_updated', handleUpdate);
      window.removeEventListener('tc_popdown_dismissed', handleUpdate);
      window.removeEventListener('tc_account_changed', handleExternalAccountSwitch);
      window.removeEventListener('cbe_account_switched', handleExternalAccountSwitch);
      window.removeEventListener('cbe_crossapp_synced', handleUpdate);
      window.removeEventListener('cbe_balance_updated', handleUpdate);
      window.removeEventListener('cbe_transaction_completed', handleUpdate);
      window.removeEventListener('sms-created', handleUpdate);
      window.removeEventListener('sms-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Handle mobile navigation bar Back button
  useEffect(() => {
    const handlePhoneBack = () => {
      if (showPickerModal) {
        setShowPickerModal(false);
      } else if (isPopdownVisible) {
        setIsPopdownVisible(false);
      } else if (view === 'bank_thread') {
        setView('inbox');
      } else {
        onBack();
      }
    };
    window.addEventListener('cbe_phone_back', handlePhoneBack);
    return () => window.removeEventListener('cbe_phone_back', handlePhoneBack);
  }, [view, showPickerModal, isPopdownVisible, onBack]);

  // Toast notification banner
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Trigger Pop-down alert with animation, audio, and real device Push Notification
  const triggerPopdownAlert = (alert: TruecallerAlert) => {
    setCurrentAlert(alert);
    setIsPopdownVisible(true);
    setIsPopdownAnimating(true);
    if (soundEnabled) {
      playTruecallerChime();
    }
    const formattedAmt = Number(alert.amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const direction = alert.role === 'receiver' ? 'credited with' : 'debited with';
    const fallbackBody = `Account ${alert.maskedAccount || alert.fullAccount || ''} ${direction} ETB ${formattedAmt}.`;
    void PushNotificationService.notifySubApp({
      subAppId: 'truecaller',
      title: `${alert.bankName || 'CBE'} • Truecaller`,
      body: alert.fullSmsText || alert.summaryText || fallbackBody,
      privateBody: 'New Truecaller bank SMS alert.',
      reference: alert.txId,
      tag: `cbe-tc-${alert.id}`,
    });
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
    // 1. From TruecallerAlerts matching this bank AND strictly matching the selected account
    const matchingAlerts = alerts.filter(a => {
      if (a.bankKey !== activeBankKey) return false;
      if (!activeAccount) return true;
      return (
        a.accountId === activeAccount.id ||
        (a.fullAccount && a.fullAccount === activeAccount.accountNumber) ||
        (a.maskedAccount && activeAccount.maskedAccount && a.maskedAccount === activeAccount.maskedAccount) ||
        a.fullAccount === 'ALL' ||
        (a as any).forAllUsers === true
      );
    });

    // 2. Realistic seeded official CBE transactions customized strictly to the selected account
    const curHolderName = activeAccount?.holderName || 'Leykun Jemaneh Ylma';
    const curFirstName = curHolderName.split(' ')[0] || 'Leykun';
    const curAccount = activeAccount?.accountNumber || '1000419524747';
    const curMasked = activeAccount?.maskedAccount || maskTruecallerAccount(curAccount);
    const curBalance = activeAccount ? activeAccount.balance : 298.54;
    const curBranchSuffix = curAccount.length >= 8 ? curAccount.slice(-8) : curAccount;
    const curCreditBalance = curBalance + 50.00;

    const seededCbeList = [
      {
        id: `tx-cbe-receive-kasahun-${curAccount}`,
        amount: 50.00,
        accountNumber: curAccount,
        maskedAccount: curMasked,
        holderName: curHolderName,
        role: 'receiver' as TruecallerRole,
        bankName: 'CBE',
        bankKey: 'cbe' as TruecallerBankKey,
        timeString: '6:51 PM',
        dateLabel: 'Friday, 21 Aug',
        timestamp: '2026-08-21T18:51:00Z',
        counterpartyName: 'Kasahun Yematawork Lema',
        counterpartyAccount: '1000482918925',
        balanceAfter: 1805.47,
        txId: 'v2-hfHCxGwmcij7q3ExbiWb',
        simSlot: 2,
        isSpam: true,
        receiptUrl: 'https://mbreceipt.cbe.com.et/v2-hfHCxGwmcij7q3ExbiWb',
        feedbackUrl: 'https://forms.gle/kGNGQpG3mQCCk3iD6',
        fullMessageText: `Dear ${curHolderName} You have received ETB 50.00 from account 1*********8925 (Kasahun Yematawork Lema) to your account ${curMasked}. Your current balance is ETB1,805.47. Thanks for Banking with CBE.\nhttps://mbreceipt.cbe.com.et/v2-hfHCxGwmcij7q3ExbiWb for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`
      },
      {
        id: `tx-cbe-promo-${curAccount}`,
        amount: 0,
        accountNumber: curAccount,
        maskedAccount: curMasked,
        holderName: curHolderName,
        role: 'receiver' as TruecallerRole,
        bankName: 'CBE',
        bankKey: 'cbe' as TruecallerBankKey,
        timeString: '8:41 AM',
        dateLabel: 'Monday, 24 Aug',
        timestamp: '2026-08-24T08:41:00Z',
        counterpartyName: 'Commercial Bank of Ethiopia',
        balanceAfter: curBalance,
        txId: 'CBE-PROMO-841',
        simSlot: 2,
        isSpam: false,
        fullMessageText: `EKSIPOO FI FEESTIVAALA CBE ADEY 2019\n*************\nGiddugala Konveenshinii Addis Internaashinaaliitti Hagayya 23, 2018 irraa eegalee hanga Qaammee 5tti Eksipoo fi Feestivaala qophaa’e irratti hirmaadhaa!\nBittaa fi gurgurtaa ayyaanaaf raawwattan hundaaf, kaffaltii keessan karaa filannoowwan dijitaalaa Baankii Daldalaa Itoophiyaatiin salphaatti xumuraa!\n\nBaankii Daldalaa Itoophiyaa\nBaankii Yoomiyyuu Itti Of\nAbdatan!`
      },
      {
        id: `tx-cbe-holiday-2019-${curAccount}`,
        amount: 0,
        accountNumber: curAccount,
        maskedAccount: curMasked,
        holderName: curHolderName,
        role: 'receiver' as TruecallerRole,
        bankName: 'CBE',
        bankKey: 'cbe' as TruecallerBankKey,
        timeString: '8:00 AM',
        dateLabel: 'Friday, 11 Sep',
        timestamp: '2026-09-11T08:00:00Z',
        counterpartyName: 'Commercial Bank of Ethiopia',
        balanceAfter: curBalance,
        txId: 'CBE-HOLIDAY-2019',
        simSlot: 2,
        isSpam: false,
        receiptUrl: 'https://combanketh.et/holidays',
        fullMessageText: 'ውድ ደንበኛችን እንኳን ለ2019 ዓ.ም. የዘመን መለወጫ በዓል አደረሰዎ! በዓሉ የሰላም እና የደስታ እንዲሆንልዎ እንመኛለን! መስፈንጠሪያውን በመጫን ካርድዎን ያግኙ፡፡ የኢትዮጵያ ንግድ ባንክ፣ ሁሌም የሚተማመኑበት ባንክ:: https://combanketh.et/holidays'
      },
      {
        id: `tx-cbe-debit-${curAccount}`,
        amount: 20.00,
        accountNumber: curAccount,
        maskedAccount: curMasked,
        holderName: curHolderName,
        role: 'sender' as TruecallerRole,
        bankName: 'CBE',
        bankKey: 'cbe' as TruecallerBankKey,
        timeString: '12:54 PM',
        timestamp: '2026-09-05T12:54:00Z',
        counterpartyName: 'Service & Disaster Recovery',
        balanceAfter: curBalance,
        txId: 'v2-hfHCxGKNY8V0W9qoyCPX',
        simSlot: 2,
        isSpam: true,
        receiptUrl: 'https://mbreceipt.cbe.com.et/v2-hfHCxGKNY8V0W9qoyCPX',
        feedbackUrl: 'https://forms.gle/kGNGQpG3mQCCk3iD6',
        fullMessageText: `Dear ${curHolderName} A debit transaction of ETB 20.0. has occurred on your account ${curMasked}. Service charge of ETB 0.00 and VAT(15%) of 0.0 and Disaster Recovery(5%) of 0.00 with total of ETB20.00 .Your current balance is ETB${curBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}. Thanks for Banking with CBE.\nhttps://mbreceipt.cbe.com.et/v2-hfHCxGKNY8V0W9qoyCPX for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`
      },
      {
        id: `tx-cbe-credit-${curAccount}`,
        amount: 50.00,
        accountNumber: curAccount,
        maskedAccount: curMasked,
        holderName: curFirstName,
        role: 'receiver' as TruecallerRole,
        bankName: 'CBE',
        bankKey: 'cbe' as TruecallerBankKey,
        timeString: '4:41 PM',
        dateLabel: 'Saturday, 05 Sep',
        timestamp: '2026-09-05T16:41:01Z',
        counterpartyName: 'Dejene Buta',
        balanceAfter: curCreditBalance,
        txId: 'FT26248KLR82',
        simSlot: 2,
        isSpam: true,
        receiptUrl: 'https://mbreceipt.cbe.com.et/v2-hfHCxGFT26248KLR82',
        feedbackUrl: 'https://forms.gle/kGNGQpG3mQCCk3iD6',
        fullMessageText: `Dear ${curFirstName} You have received ETB 50.00 from account 1*********8925 (Dejene Buta) to your account ${curMasked}. Your current balance is ETB${curCreditBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}. Thanks for Banking with CBE.\nhttps://mbreceipt.cbe.com.et/v2-hfHCxGFT26248KLR82 for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`
      }
    ];

    // Deduplicate matchingAlerts by txId/id
    const uniqueAlertsMap = new Map<string, TruecallerAlert>();
    for (const a of matchingAlerts) {
      if (a.txId) {
        uniqueAlertsMap.set(a.txId, a);
      } else {
        uniqueAlertsMap.set(a.id, a);
      }
    }
    const dedupedAlerts = Array.from(uniqueAlertsMap.values());

    // Sort chronologically (oldest first) to ensure mathematically progressive balance:
    // "When user receive the available balance is the previous balance plus the the current received balance."
    const sortedAlerts = [...dedupedAlerts].sort((a, b) => {
      const tA = new Date(a.timestamp).getTime() || 0;
      const tB = new Date(b.timestamp).getTime() || 0;
      return tA - tB;
    });

    // Calculate baseline balance prior to these alerts
    let netAlertsDelta = 0;
    for (const a of sortedAlerts) {
      if (a.role === 'receiver') {
        netAlertsDelta += a.amount;
      } else {
        netAlertsDelta -= a.amount;
      }
    }

    const currentFinalBalance = activeAccount ? activeAccount.balance : 8879100.00;
    let runningBalance = Math.max(0, currentFinalBalance - netAlertsDelta);

    if (sortedAlerts.length > 0) {
      const first = sortedAlerts[0];
      if (first.balanceAfter !== undefined && first.balanceAfter > 0) {
        const derivedStart = first.role === 'receiver' 
          ? Math.max(0, first.balanceAfter - first.amount) 
          : first.balanceAfter + first.amount;
        if (derivedStart > 0 && Math.abs(derivedStart - runningBalance) > 1) {
          runningBalance = derivedStart;
        }
      }
    }

    // Now compute progressive available balance for every alert strictly following the user's rule:
    const calculatedAlertItems = sortedAlerts.map(a => {
      const prevBal = runningBalance;
      if (a.role === 'receiver') {
        // EXACT DIRECTIVE: "When user receive the available balance is the previous balance plus the the current received balance."
        runningBalance = prevBal + a.amount;
      } else {
        runningBalance = Math.max(0, prevBal - a.amount);
      }
      const calculatedBalanceAfter = runningBalance;
      const formattedCalcBal = calculatedBalanceAfter.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      let fullMsg = a.fullSmsText;
      if (!fullMsg) {
        const isCbe = a.bankKey === 'cbe' || (a.bankName && a.bankName.toLowerCase().includes('cbe')) || activeBankKey === 'cbe';
        if (a.role === 'receiver') {
          if (isCbe) {
            const formattedAmt = a.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const senderAccMasked = a.counterpartyAccount ? maskTruecallerAccount(a.counterpartyAccount) : '1*********8925';
            const senderName = a.counterpartyName || 'Kasahun Yematawork Lema';
            const rCode = (a.txId || 'wmcij7q3ExbiWb').replace(/[^a-zA-Z0-9]/g, '').slice(-12);
            fullMsg = `Dear ${a.holderName || curHolderName} You have received ETB ${formattedAmt} from account ${senderAccMasked} (${senderName}) to your account ${curMasked}. Your current balance is ETB${formattedCalcBal}. Thanks for Banking with CBE.\nhttps://mbreceipt.cbe.com.et/v2-hfHCxG${rCode} for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`;
          } else {
            fullMsg = `Dear ${a.holderName || curHolderName},\nYour Account ${a.fullAccount || curAccount} has been Credited with ETB ${a.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} on ${a.timeString || 'Now'}${a.counterpartyName ? ` by ${a.counterpartyName}` : ''}.\nAvailable Balance is ETB ${formattedCalcBal}.\nTxn Ref: ${a.txId || 'FT26248MK0913'}.\nThank you for banking with ${a.bankName || 'CBE'}.\nhttps://mbreceipt.cbe.com.et/v2-hfHCxG${a.txId || 'FT26248MK0913'}`;
          }
        } else {
          if (isCbe) {
            const amtStr = a.amount % 1 === 0 ? `${a.amount.toFixed(1)}.` : `${a.amount.toFixed(2)}.`;
            const totStr = a.amount.toFixed(2);
            const rCode = (a.txId || 'KNY8V0W9qoyCPX').replace(/[^a-zA-Z0-9]/g, '').slice(-12);
            fullMsg = `Dear ${a.holderName || curHolderName} A debit transaction of ETB ${amtStr} has occurred on your account ${curMasked}. Service charge of ETB 0.00 and VAT(15%) of 0.0 and Disaster Recovery(5%) of 0.00 with total of ETB${totStr} .Your current balance is ETB${formattedCalcBal}. Thanks for Banking with CBE.\nhttps://mbreceipt.cbe.com.et/v2-hfHCxG${rCode} for feedback:\nhttps://forms.gle/kGNGQpG3mQCCk3iD6`;
          } else {
            fullMsg = `Dear ${a.holderName || curHolderName},\nA debit transaction of ETB ${a.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} has occurred on your Account ${a.fullAccount || curAccount} on ${a.timeString || 'Now'}${a.counterpartyName ? ` to ${a.counterpartyName}` : ''}.\nAvailable Balance: ETB ${formattedCalcBal}.\nTxn Ref: ${a.txId || 'FT269446FP77'}.\nThank you for banking with ${a.bankName || 'CBE'}.`;
          }
        }
      } else {
        // Dynamically ensure the SMS message text reflects the mathematically accurate available balance
        fullMsg = updateSmsAvailableBalance(fullMsg, calculatedBalanceAfter);
      }

      const receiptRef = (a.txId || 'FT26248MK0913').replace(/[^a-zA-Z0-9]/g, '');

      return {
        id: a.id,
        amount: a.amount,
        accountNumber: a.fullAccount || curAccount,
        maskedAccount: a.maskedAccount || maskTruecallerAccount(a.fullAccount || curAccount),
        holderName: a.holderName || curHolderName,
        role: a.role,
        bankName: a.bankName,
        bankKey: a.bankKey,
        timeString: a.timeString || 'Now',
        timestamp: a.timestamp,
        counterpartyName: a.counterpartyName,
        balanceAfter: calculatedBalanceAfter,
        txId: a.txId,
        simSlot: 2,
        isSpam: true,
        receiptUrl: `https://mbreceipt.cbe.com.et/v2-hfHCxG${receiptRef}`,
        fullMessageText: fullMsg
      };
    });

    // Combine calculatedAlertItems and seededCbeList (avoiding duplicate transaction IDs)
    const combinedMap = new Map<string, any>();
    // First, add all alerts for this account (reversed: newest alerts first)
    for (const item of [...calculatedAlertItems].reverse()) {
      const key = item.txId || item.id;
      if (!combinedMap.has(key)) {
        combinedMap.set(key, item);
      }
    }
    // Also include seeded authentic CBE transactions (reversed: newest seeds first)
    for (const seed of [...seededCbeList].reverse()) {
      const key = seed.txId || seed.id;
      if (!combinedMap.has(key)) {
        combinedMap.set(key, seed);
      }
    }

    let allItems = Array.from(combinedMap.values());

    // Sort items:
    // IMPORTANT USER DIRECTIVE:
    // "In the Truecaller sms the now badge and the the current message topfirst rule only applies in side the account list not the message ok"
    // Messages in the SMS thread are ALWAYS ordered chronologically (oldest at top -> newest at bottom).
    // The top-first rule and the "Now" badge do NOT apply to messages.
    allItems.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime() || 0;
      const timeB = new Date(b.timestamp).getTime() || 0;
      return timeA - timeB;
    });

    // Filter if user clicked "View only Inbox"
    if (inboxFilterMode === 'inbox') {
      allItems = allItems.filter(item => item.amount > 0);
    }

    // Format timeString so only the most recent transaction shows 'Now' (if within recent window)
    // and older messages strictly display their formatted time (e.g. 12:54 PM) never 'Now'
    const totalCount = allItems.length;
    return allItems.map((item, idx) => {
      const isNewestItem = idx === totalCount - 1;
      let displayTime = item.timeString;
      if (!isNewestItem && (displayTime === 'Now' || displayTime?.toLowerCase?.().includes('now'))) {
        displayTime = formatTimeFromIso(item.timestamp);
      }
      return {
        ...item,
        timeString: displayTime,
        simSlot: selectedSimSlot || item.simSlot || 2,
        isNow: isNewestItem && (item.timeString === 'Now' || item.timeString?.toLowerCase?.().includes('now'))
      };
    });
  }, [activeBankKey, alerts, activeAccount, inboxFilterMode, selectedSimSlot]);

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

    if (simMode === 'transfer') {
      const result = TruecallerService.simulateUserTransfer({
        senderName: simSenderName.trim() || 'User X (Leykun Jemaneh)',
        senderAccount: simSenderAccount.trim() || '1000419529165',
        recipientName: simReceiverName.trim() || 'User Y (Abebe Bikila)',
        recipientAccount: simReceiverAccount.trim() || '1000419520913',
        amount: amt,
        bankKey: activeBankKey,
        timeString: 'Now'
      });

      setAccounts(TruecallerService.getAccounts());
      setAlerts(TruecallerService.getAlerts());
      setShowQuickSimModal(false);
      showToast(`Transfer of ETB ${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })} created: User X (Send) & User Y (Receive) accounts added to Truecaller SMS!`);

      // Automatically open picker for this newly simulated transaction (focusing on receive/credited alert)
      handleOpenPickerForTx({
        id: result.receiveAlert.id,
        amount: result.receiveAlert.amount,
        accountNumber: result.receiverAccount.accountNumber,
        maskedAccount: result.receiveAlert.maskedAccount,
        holderName: result.receiverAccount.holderName,
        role: result.receiveAlert.role,
        bankName: result.receiverAccount.bankName,
        bankKey: result.receiverAccount.bankKey,
        timeString: result.receiveAlert.timeString,
        timestamp: result.receiveAlert.timestamp,
        counterpartyName: result.receiveAlert.counterpartyName,
        balanceAfter: result.receiveAlert.balanceAfter,
        txId: result.receiveAlert.txId,
        fullMessageText: result.receiveAlert.summaryText,
        isNow: true,
      });
      return;
    }

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

    setAccounts(TruecallerService.getAccounts());
    setAlerts(TruecallerService.getAlerts());
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
      fullMessageText: newAlert.summaryText,
      isNow: true,
    });
  };

  // Mark alert read
  const handleMarkAsRead = () => {
    if (currentAlert) {
      TruecallerService.markAlertAsRead(currentAlert.id);
      setCurrentAlert(prev => prev ? { ...prev, read: true } : null);
      showToast('Marked as read');
      setTimeout(() => {
        setIsPopdownVisible(false);
      }, 600);
    }
  };

  // Retrigger popdown alert
  const handleRetriggerAlert = () => {
    if (currentAlert) {
      triggerPopdownAlert(currentAlert);
    }
  };

  // Active Google Account profile synchronized to the currently selected account
  const activeGoogleProfile = useMemo(() => {
    return GoogleMessagesService.buildGoogleAccountProfile({
      accountNumber: activeAccount?.accountNumber || '1000419524747',
      accountName: activeAccount?.holderName || 'Leykun Jemaneh Ylma',
    });
  }, [activeAccount?.holderName, activeAccount?.accountNumber]);

  const activeHolderFullName = activeAccount?.holderName || 'Leykun Jemaneh Ylma';
  const activeHolderFirstName = activeHolderFullName.trim().split(/\s+/)[0] || 'Customer';

  // Filtered threads for inbox search — all pre-simulated texts personalized to active account name
  const filteredThreads = useMemo(() => {
    const personalizedThreads = DEFAULT_INBOX_THREADS.map(t => {
      if (t.id === 'CBE') {
        return {
          ...t,
          snippet: `Dear ${activeHolderFullName} A ...`,
        };
      }
      if (t.id === '251994') {
        return {
          ...t,
          snippet: `Dear ${activeHolderFirstName}, Your prepaid account has bee...`,
        };
      }
      if (t.id === 'safaricom') {
        return {
          ...t,
          snippet: `ውድ ${activeHolderFirstName}፣ አስደሳች ዜና!...`,
        };
      }
      if (t.id === 'mpesa-info') {
        return {
          ...t,
          snippet: `ውድ ${activeHolderFirstName} በብሔራዊ ባንክ መመሪያ መሰረት እባክዎ የሂ...`,
        };
      }
      if (t.id === 'BOA') {
        return {
          ...t,
          snippet: `ውድ ${activeHolderFirstName}፣ ዓለም አቀፍ ግብይቶችን በቀላሉ ያድርጉ!...`,
        };
      }
      if (t.id === 'bunna-bank') {
        return {
          ...t,
          snippet: `ውድ ${activeHolderFirstName}፣ የቡና ባንክ ዲጂታል አገልግሎት...`,
        };
      }
      if (t.id === 'telebirr') {
        return {
          ...t,
          snippet: `ውድ ${activeHolderFirstName}፣ የቴሌብር ሂሳብዎ...`,
        };
      }
      if (t.id === 'ethio-tel') {
        return {
          ...t,
          snippet: `ውድ ${activeHolderFirstName}፣ አድማስ ዲጂታል ሎተሪ በ51ኛው ዙር...`,
        };
      }
      return t;
    });
    if (!searchQuery.trim()) return personalizedThreads;
    const q = searchQuery.toLowerCase();
    return personalizedThreads.filter(t => 
      t.sender.toLowerCase().includes(q) || 
      t.snippet.toLowerCase().includes(q)
    );
  }, [searchQuery, activeHolderFullName, activeHolderFirstName]);

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
            <p>Hey {activeHolderFirstName}, just transferred ETB 450.00 to your CBE account for the project materials.</p>
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

  // 7. DASHEN BANK SCREEN (Matching Screenshot_20260911-174046.png and 174056.png)
  const renderDashenScreen = () => {
    return (
      <div className="absolute inset-0 bg-[#050c18] flex flex-col overflow-hidden text-white select-none font-sans">
        {/* Mountain Faceted Gradient Backdrop */}
        <div 
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 120% 80% at 50% 18%, #133f84 0%, #0c2a5c 42%, #051433 70%, #030816 100%)'
          }}
        />

        {/* Top Header Bar */}
        <div className="relative px-4 pt-3 pb-2 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#003882] to-[#0066FF] border border-white/25 flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-white tracking-tight leading-tight">Hello {activeHolderFirstName}</h2>
              <p className="text-[10.5px] text-neutral-300 font-medium">Welcome Back!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-neutral-300">
              <RefreshCw className="w-3.5 h-3.5" />
            </div>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-neutral-300 relative">
              <Bell className="w-3.5 h-3.5" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">2</span>
            </div>
          </div>
        </div>

        {/* Dashen Content Body */}
        <div className="relative flex-1 overflow-y-auto px-4 py-1 space-y-3 z-10 scrollbar-none">
          {/* Active holder name & Balance */}
          <div className="text-center pt-0.5 pb-1 space-y-0.5">
            <p className="text-[13px] font-semibold text-neutral-200">{activeHolderFullName}</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-[26px] font-extrabold text-white tracking-tight">
                778.18 ETB
              </span>
              <Eye className="w-4 h-4 text-neutral-300" />
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[12px] text-neutral-300 font-mono">
              <span>5502877108011</span>
              <Copy className="w-3 h-3 text-neutral-400" />
            </div>
            <div className="pt-0.5 flex justify-center">
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-semibold text-white">
                Accounts <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* 8 Quick Action Buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'Transfer To Dashen', icon: '✈️' },
              { label: 'Transfer by Phone', icon: '📱' },
              { label: 'Transfer To Other Banks', icon: '🏛️' },
              { label: 'Transfer To Wallets', icon: '💳' },
              { label: 'My Cards', icon: '💳' },
              { label: 'Mobile Top-up', icon: '⚡' },
              { label: 'Utility Payments', icon: '📄' },
              { label: 'See More', icon: '•••' },
            ].map((btn, i) => (
              <div key={i} className="p-1.5 rounded-2xl bg-white/[0.08] border border-white/[0.18] flex flex-col items-center justify-between text-center min-h-[66px]">
                <span className="text-sm">{btn.icon}</span>
                <span className="text-[9px] font-medium text-white leading-tight">{btn.label}</span>
              </div>
            ))}
          </div>

          {/* E-Commerce Banner */}
          <div className="bg-[#101c34]/90 border border-[#1e335b] rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">E-commerce</h3>
                <p className="text-[9.5px] text-neutral-300">Explore our list of merchants.</p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
          </div>
        </div>

        {/* Dashen Bottom Bar */}
        <div className="w-full bg-[#050c18] border-t border-[#131d2e] px-2 py-1.5 flex items-center justify-around z-20 text-[8.5px] text-neutral-400">
          <div className="flex flex-col items-center text-white"><HomeIcon className="w-3.5 h-3.5" /><span>Home</span></div>
          <div className="flex flex-col items-center"><Smartphone className="w-3.5 h-3.5" /><span>Apps</span></div>
          <div className="flex flex-col items-center"><ShoppingBag className="w-3.5 h-3.5" /><span>E-Comm...</span></div>
          <div className="flex flex-col items-center"><Copy className="w-3.5 h-3.5" /><span>Transact...</span></div>
          <div className="flex flex-col items-center"><User className="w-3.5 h-3.5" /><span>Profile</span></div>
        </div>
      </div>
    );
  };

  // 8. TELEBIRR SUPER APP SCREEN (Matching official Telebirr interface)
  const renderTelebirrScreen = () => {
    return (
      <div className="absolute inset-0 bg-[#f4f7fa] flex flex-col overflow-hidden text-neutral-800 select-none font-sans">
        {/* Top Header Row with vibrant Telebirr Blue */}
        <div className="bg-[#0070bc] px-4 pt-3 pb-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-black text-[#5cb82e] text-xs shadow-sm">
                t
              </div>
              <div>
                <p className="text-[13px] font-bold tracking-tight">Telebirr Super App</p>
                <p className="text-[10px] text-sky-200">{activeHolderFullName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                <Bell className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                <Search className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          </div>

          {/* Balance card */}
          <div className="mt-3 p-3 bg-white rounded-2xl text-neutral-800 shadow-md border border-neutral-100 flex items-center justify-between">
            <div>
              <p className="text-[10.5px] font-medium text-neutral-400">Available Balance</p>
              <p className="text-xl font-black text-neutral-900 tracking-tight">41,865.79 <span className="text-xs font-bold text-neutral-500">ETB</span></p>
            </div>
            <div className="px-2.5 py-1 bg-lime-100 text-lime-800 rounded-full text-[10px] font-bold">
              Active
            </div>
          </div>
        </div>

        {/* Quick Grid actions */}
        <div className="p-4 grid grid-cols-4 gap-2.5 text-center">
          {[
            { label: 'Deposit', bg: 'bg-blue-50 text-blue-600', icon: '📥' },
            { label: 'Send Money', bg: 'bg-emerald-50 text-emerald-600', icon: '💸' },
            { label: 'Buy Airtime', bg: 'bg-amber-50 text-amber-600', icon: '📶' },
            { label: 'Receive', bg: 'bg-purple-50 text-purple-600', icon: '📱' },
          ].map((item, idx) => (
            <div key={idx} className="p-2.5 rounded-2xl bg-white border border-neutral-100 shadow-xs flex flex-col items-center">
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px] font-bold text-neutral-700 mt-1">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Mini Apps / Banner */}
        <div className="px-4 flex-1 overflow-hidden">
          <div className="p-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl shadow-sm space-y-1">
            <p className="text-xs font-bold">Transfer to Any Bank</p>
            <p className="text-[10px] text-emerald-100">Send money directly to CBE, Dashen &amp; Awash instantly.</p>
          </div>
        </div>

        {/* Bottom Tab Bar */}
        <div className="w-full bg-white border-t border-neutral-200 px-4 py-2 flex items-center justify-around text-[9px] font-bold text-neutral-500">
          <div className="flex flex-col items-center text-[#0070bc]"><HomeIcon className="w-4 h-4" /><span>Home</span></div>
          <div className="flex flex-col items-center"><Building2 className="w-4 h-4" /><span>Finance</span></div>
          <div className="flex flex-col items-center"><QrCode className="w-4 h-4 text-[#5cb82e]" /><span>Pay</span></div>
          <div className="flex flex-col items-center"><Smartphone className="w-4 h-4" /><span>Services</span></div>
          <div className="flex flex-col items-center"><User className="w-4 h-4" /><span>Me</span></div>
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
      case 'dashen': return renderDashenScreen();
      case 'telebirr': return renderTelebirrScreen();
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

  // Bottom hardware navigation bar matching phone type (Edge-to-edge uses device native navigation)
  const renderPhoneFooter = (type: TruecallerPhoneType) => {
    switch (type) {
      case 'iphone':
        return null; // Device native edge-to-edge bar is used
      case 'samsung':
      case 'pixel':
        return null; // Device native gesture navigation is used
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
      { id: 'dashen', name: 'Dashen Bank', icon: '🏛️', desc: 'Dashen Super App with 778.18 ETB & 3-Click E-commerce', previewBadge: 'Dashen App' },
      { id: 'telebirr', name: 'Telebirr App', icon: '📱', desc: 'Telebirr Super App with 41,865.79 ETB & Send Money', previewBadge: 'Telebirr' },
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
                      onClick={() => {
                        setSelectedPhoneType(p.id);
                        try {
                          PhoneSettingsService.applyPreset(p.id as PhoneModelType);
                        } catch {}
                      }}
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

            {/* STEP 3: CHOOSE TEXT FONT & ADJUST SIZE */}
            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-blue-400 flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 inline-flex items-center justify-center text-[11px]">3</span>
                  <span>Text Font &amp; Size</span>
                </label>
                <span className="text-[11px] text-neutral-400">{activeFont.name} • {activeSize.name} ({popdownScale}%)</span>
              </div>

              {/* Font Family Selection */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-neutral-300 block">Choose Font Family</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {POPDOWN_FONTS.map(f => {
                    const isSelected = popdownFontFamily === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleUpdateFont(f.id)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#0066FF]/25 border-[#0066FF] text-white shadow-md ring-2 ring-[#0066FF]/40'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-850'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-[10px] font-bold uppercase text-neutral-400 truncate">{f.name}</span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono flex-shrink-0">{f.badge}</span>
                        </div>
                        <div 
                          className="text-sm font-extrabold text-white tracking-tight truncate"
                          style={{ fontFamily: f.style }}
                        >
                          ETB 459.00
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Text Size Presets & Scale Slider */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-300">Text Size Preset</span>
                  <span className="text-[11px] text-[#0066FF] font-semibold">{activeSize.label}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {POPDOWN_SIZES.map(s => {
                    const isSelected = popdownFontSize === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleUpdateSize(s.id)}
                        className={`py-2 px-1 rounded-xl text-center font-bold text-xs transition cursor-pointer border ${
                          isSelected
                            ? 'bg-[#0066FF] text-white border-blue-400 shadow-md'
                            : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>

                {/* Fine-Tuning Scale Slider */}
                <div className="flex items-center space-x-3 bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800">
                  <span className="text-[10.5px] font-semibold text-neutral-400 flex-shrink-0">Fine-tune Scale:</span>
                  <input
                    type="range"
                    min="80"
                    max="140"
                    step="5"
                    value={popdownScale}
                    onChange={(e) => handleUpdateScale(parseInt(e.target.value, 10))}
                    className="flex-1 accent-[#0066FF] cursor-pointer h-1.5"
                  />
                  <span className="text-[11px] font-mono font-bold text-white w-10 text-right flex-shrink-0">{popdownScale}%</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateScale(100)}
                    className="text-[10px] px-2 py-1 rounded bg-neutral-800 text-neutral-300 hover:text-white flex-shrink-0 transition"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* STEP 4: VISUAL STATUS BAR & TRUECALLER POP-DOWN COMPATIBILITY PREVIEW */}
            <div className="pt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-blue-400 flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 inline-flex items-center justify-center text-[11px]">4</span>
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
                        <div 
                          className="leading-[1.35] text-slate-900 font-bold tracking-tight pt-0.5"
                          style={{
                            fontFamily: activeFont.style,
                            fontSize: computedAccountFontSize,
                          }}
                        >
                          Account {previewAccount} {pickerRole === 'receiver' ? 'credited with' : 'debited with'}
                          <div 
                            className="font-extrabold text-slate-950 tracking-tight mt-0.5 whitespace-nowrap"
                            style={{
                              fontFamily: activeFont.style,
                              fontSize: computedAmountFontSize,
                            }}
                          >
                            <span className="whitespace-nowrap inline-block">
                              ETB {previewAmt}
                            </span>
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
    // -------------------------------------------------------------
    // TRUECALLER FOR IPHONE (iOS Native Navigation & Design System)
    // -------------------------------------------------------------
    if (isIPhone) {
      return (
        <div className="h-full w-full flex-1 bg-black text-white flex flex-col font-sans select-none relative overflow-hidden">
          {/* iOS Top Navigation Bar for Truecaller */}
          <header className="sticky top-0 z-30 px-4 pt-[max(env(safe-area-inset-top,0px),10px)] pb-2 backdrop-blur-xl bg-black/90 border-b border-[#38383A]">
            <div className="flex items-center justify-between h-11">
              <div className="w-8" />

              {/* Center Truecaller Brand */}
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-[#0066FF] flex items-center justify-center text-white shadow-xs">
                  <Phone className="w-3.5 h-3.5 fill-white" />
                </div>
                <span className="font-bold text-[17px] tracking-tight">
                  Truecaller
                </span>
                <ShieldCheck className="w-4 h-4 text-[#0066FF] fill-[#0066FF] text-black" />
              </div>

              {/* Right: Quick Pop-down Alert trigger */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPhoneType('iphone');
                  handleRetriggerAlert();
                }}
                className="text-[#007AFF] hover:opacity-80 text-[15px] font-medium cursor-pointer flex items-center gap-1"
                title="Test Popdown Alert"
              >
                <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Alert</span>
              </button>
            </div>

            {/* iOS Truecaller Title & Status */}
            <div className="pt-1 pb-1.5 flex items-center justify-between">
              <h1 className="text-[28px] font-bold tracking-tight leading-none text-white">
                Messages
              </h1>
              <span className="text-[12px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Caller ID Active
              </span>
            </div>

            {/* iOS Rounded Search Bar */}
            <div className="pt-1 pb-1">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1C1C1E] text-white">
                <Search className="w-4 h-4 text-[#8E8E93]" />
                <input
                  type="text"
                  placeholder="Search SMS, banks, senders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-[14px] outline-none flex-1 placeholder:text-[#8E8E93]"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-[#8E8E93] hover:text-white cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* iOS Segmented Control */}
            <div className="mt-1.5 p-0.5 bg-[#1C1C1E] rounded-lg flex items-center text-xs font-semibold">
              <button
                type="button"
                className="flex-1 py-1 text-center bg-[#636366] text-white rounded-md shadow-xs transition cursor-pointer"
              >
                Banking &amp; SMS
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveBankKey('cbe');
                  setActiveBankSenderName('CBE');
                  setView('bank_thread');
                }}
                className="flex-1 py-1 text-center text-[#8E8E93] hover:text-white transition cursor-pointer"
              >
                CBE Thread
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedPhoneType('iphone');
                  handleRetriggerAlert();
                }}
                className="flex-1 py-1 text-center text-[#007AFF] hover:opacity-80 transition cursor-pointer"
              >
                Pop-down ⚡
              </button>
            </div>
          </header>

          {/* iOS Conversation List */}
          <div className="flex-1 overflow-y-auto px-4 divide-y divide-[#38383A]/60 pb-20">
            {filteredThreads.map(thread => {
              const isCbe = thread.id === 'CBE';
              return (
                <div
                  key={thread.id}
                  onClick={() => handleSelectThread(thread)}
                  className={`py-3 flex items-center gap-3.5 cursor-pointer active:bg-neutral-900 transition-colors group ${
                    isCbe ? 'bg-[#70189F]/10 rounded-2xl px-2 my-1 border border-purple-500/20' : ''
                  }`}
                >
                  <div 
                    className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-xs"
                    style={{ backgroundColor: isCbe ? '#70189F' : thread.avatarColor }}
                  >
                    {isCbe ? 'CBE' : (thread.sender.charAt(0).toUpperCase())}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-[16px] truncate text-white">
                          {thread.sender}
                        </span>
                        {isCbe && (
                          <span className="px-1.5 py-0.2 bg-[#007AFF] text-white text-[9.5px] font-bold rounded-full">
                            VERIFIED
                          </span>
                        )}
                      </div>
                      <span className="text-[12px] text-[#8E8E93] shrink-0">
                        {thread.timeLabel}
                      </span>
                    </div>

                    <p className="text-[13.5px] text-[#8E8E93] truncate leading-snug">
                      {thread.snippet}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-[#8E8E93]/60 shrink-0" />
                </div>
              );
            })}
          </div>

          {/* Floating Test Alert Action */}
          <div className="fixed bottom-3 right-4 z-30">
            <button
              type="button"
              onClick={() => {
                setSelectedPhoneType('iphone');
                handleRetriggerAlert();
              }}
              className="px-5 py-3 rounded-full bg-[#007AFF] hover:bg-blue-600 active:scale-95 text-white font-bold text-sm flex items-center gap-2 shadow-2xl cursor-pointer transition border border-white/20"
            >
              <Smartphone className="w-4 h-4" />
              <span>Simulate Pop-down ⚡</span>
            </button>
          </div>

          {/* Modal: Choose Phone Screen & Phone Type */}
          {renderPickerModal()}
        </div>
      );
    }

    // -------------------------------------------------------------
    // -------------------------------------------------------------
    // TRUECALLER FOR ANDROID (Clean edge-to-edge layout without fake bars)
    // -------------------------------------------------------------
    const inboxContainerBg = isLightMode
      ? 'bg-[#F8F9FA] text-slate-900'
      : isAmoledMode
      ? 'bg-black text-white'
      : isMidnightMode
      ? 'bg-[#0a1128] text-white'
      : 'bg-[#121316] text-white';

    const inboxHeaderBg = isLightMode
      ? 'bg-white/95 border-b border-slate-200/80 backdrop-blur-md'
      : isAmoledMode
      ? 'bg-black/95 border-b border-neutral-900/60 backdrop-blur-md'
      : isMidnightMode
      ? 'bg-[#0a1128]/95 border-b border-blue-950/40 backdrop-blur-md'
      : 'bg-[#121316]/95 border-b border-neutral-800/40 backdrop-blur-md';

    return (
      <div className={`h-full w-full flex-1 ${inboxContainerBg} flex flex-col font-sans select-none relative overflow-hidden`}>
        {/* Google Messages Top App Bar with safe-area spacing */}
        <header className={`px-4 pt-[max(env(safe-area-inset-top,0px),10px)] pb-2 flex items-center justify-between sticky top-0 z-30 ${inboxHeaderBg}`}>
          {!isSearching ? (
            <>
              <div className="flex items-center space-x-2">
                <h1 className={`text-[22px] sm:text-[24px] font-medium tracking-normal ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                  Messages
                </h1>
              </div>

              <div className="flex items-center space-x-3">
                {/* Search Icon */}
                <button 
                  type="button"
                  onClick={() => setIsSearching(true)}
                  className={`p-2 rounded-full transition-colors cursor-pointer ${
                    isLightMode ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-neutral-800 text-neutral-200'
                  }`}
                  title="Search conversations"
                >
                  <Search className="w-5 h-5" />
                </button>

                {/* Dynamic Google Account Avatar synchronized with active account */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveBankKey('cbe');
                    setView('bank_thread');
                    setShowThreeDotMenu(true);
                  }}
                  title={`${activeGoogleProfile.fullName} (${activeGoogleProfile.email})`}
                  className="relative flex items-center justify-center p-[2px] rounded-full border-2 select-none cursor-pointer active:scale-95 transition"
                  style={{ borderColor: currentAccent.primary }}
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm"
                    style={{ backgroundColor: activeGoogleProfile.avatarColor || currentAccent.primary }}
                  >
                    {activeGoogleProfile.initial}
                  </div>
                </button>
              </div>
            </>
          ) : (
            /* Inline Search Mode */
            <div className={`w-full flex items-center space-x-2 px-3 py-1.5 rounded-full ${
              isLightMode ? 'bg-slate-200/80 text-slate-900' : 'bg-neutral-800/90 text-white'
            }`}>
              <Search className={`w-4 h-4 flex-shrink-0 ${isLightMode ? 'text-slate-500' : 'text-neutral-400'}`} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search images, videos & more"
                autoFocus
                className={`bg-transparent border-none outline-none w-full text-sm ${
                  isLightMode ? 'placeholder-slate-500 text-slate-900' : 'placeholder-neutral-400 text-white'
                }`}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="p-1 cursor-pointer">
                  <X className={`w-4 h-4 ${isLightMode ? 'text-slate-500' : 'text-neutral-400'}`} />
                </button>
              )}
              <button 
                type="button"
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery('');
                }}
                className="text-xs font-semibold px-2 py-1 cursor-pointer"
                style={{ color: currentAccent.primary }}
              >
                Cancel
              </button>
            </div>
          )}
        </header>


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
                    ? isLightMode
                      ? 'hover:bg-purple-50 active:bg-purple-100 bg-purple-50/60'
                      : 'hover:bg-purple-950/30 active:bg-purple-900/40 bg-purple-950/10' 
                    : isLightMode
                    ? 'hover:bg-slate-100/70 active:bg-slate-200/60'
                    : 'hover:bg-neutral-800/50 active:bg-neutral-800/80'
                }`}
              >
                {/* Left Column: Silhouette Avatar & Sender details */}
                <div className="flex items-center space-x-3.5 min-w-0 pr-3 flex-1">
                  <div 
                    className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm overflow-hidden"
                    style={{ backgroundColor: thread.avatarColor }}
                  >
                    <div className="w-7 h-7 flex items-center justify-center">
                      <User className="w-6 h-6 text-white fill-white" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <h2 className={`text-[15.5px] font-semibold truncate ${
                        isLightMode ? 'text-slate-900' : 'text-neutral-100'
                      }`}>
                        {thread.sender}
                      </h2>
                    </div>
                    <p className={`text-[13.5px] truncate mt-0.5 leading-snug ${
                      thread.unreadCount > 0 
                        ? isLightMode ? 'text-slate-800 font-semibold' : 'text-neutral-200 font-medium'
                        : isLightMode ? 'text-slate-500' : 'text-neutral-400'
                    }`}>
                      {thread.snippet}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end flex-shrink-0 space-y-1.5 pl-2">
                  <span className={`text-[12px] font-normal ${
                    thread.unreadCount > 0 
                      ? isLightMode ? 'text-blue-600 font-semibold' : 'text-blue-400 font-medium'
                      : isLightMode ? 'text-slate-400' : 'text-neutral-400'
                  }`}>
                    {thread.timeLabel}
                  </span>

                  {thread.unreadCount > 0 && (
                    <span 
                      className="w-5 h-5 rounded-full text-white text-[11px] font-semibold flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: currentAccent.primary }}
                    >
                      {thread.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Action Buttons: Start Chat + Gemini sparkle */}
        <div className="fixed bottom-3 right-5 flex flex-col items-end space-y-3 z-30">
          <div className={`w-11 h-11 rounded-full border flex items-center justify-center shadow-xl cursor-pointer transition ${
            isLightMode 
              ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' 
              : 'bg-neutral-800/90 text-cyan-400 border-neutral-700 hover:bg-neutral-700'
          }`}>
            <Sparkles className="w-5 h-5" style={{ color: currentAccent.primary }} />
          </div>

          <div 
            onClick={() => {
              setActiveBankKey('cbe');
              setActiveBankSenderName('CBE');
              setView('bank_thread');
            }}
            className="px-5 py-3 rounded-full active:scale-95 text-white font-semibold text-sm flex items-center space-x-2.5 shadow-2xl cursor-pointer transition"
            style={{ backgroundColor: currentAccent.primary }}
          >
            <MessageSquare className="w-4 h-4 fill-white" />
            <span>Start chat</span>
          </div>
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
    const threadBg = isLightMode 
      ? 'bg-[#f8fafc] text-slate-900' 
      : (isMidnightMode 
        ? 'bg-[#0a1128] text-white' 
        : (isAmoledMode ? 'bg-black text-white' : 'bg-[#121316] text-white'));

    const threadHeaderBg = isLightMode
      ? 'bg-white border-b border-slate-200 text-slate-900'
      : (isMidnightMode
        ? 'bg-[#0a1128] border-b border-blue-900/30 text-white'
        : (isAmoledMode ? 'bg-black border-b border-neutral-900 text-white' : 'bg-[#121316] border-b border-neutral-900 text-white'));

    return (
      <div className={`h-full w-full flex-1 ${threadBg} flex flex-col font-sans select-none relative overflow-y-auto`}>
        
        {/* Toast popup */}
        {toastMessage && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#1e293b] text-white font-medium px-4 py-2 rounded-full shadow-2xl text-xs flex items-center space-x-2 border border-blue-500/50 animate-in fade-in slide-in-from-top-3 duration-150">
            <CheckCircle2 className="w-4 h-4 text-[#0066FF]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Bank Thread App Bar matching screenshot */}
        <header className={`w-full ${threadHeaderBg} px-3 py-2 flex items-center justify-between sticky top-0 z-30 pt-[max(env(safe-area-inset-top,0px),8px)]`}>
          <div className="flex items-center space-x-3">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => {
                setView('inbox');
              }}
              className={`p-1 rounded-full transition-colors active:scale-95 cursor-pointer flex items-center gap-1 ${
                isLightMode ? 'hover:bg-slate-100 text-slate-900' : 'hover:bg-neutral-900 text-white'
              }`}
              title="Back to Messages"
            >
              {isIPhone ? (
                <div className="text-[17px] font-normal flex items-center gap-0.5" style={{ color: currentAccent.primary }}>
                  <ChevronLeft className="w-5 h-5 -ml-1 stroke-[2.5]" />
                  <span>Messages</span>
                </div>
              ) : (
                <ArrowLeft className={`w-6 h-6 ${isLightMode ? 'text-slate-900' : 'text-white'}`} />
              )}
            </button>

            {/* Bank Avatar: Dark Navy Circle with Bank Facade Columns Pediment Icon */}
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border"
              style={{ 
                backgroundColor: isLightMode ? currentAccent.lightBg : '#18263b',
                borderColor: `${currentAccent.primary}40`
              }}
            >
              <svg className="w-5 h-5 fill-current" style={{ color: isLightMode ? currentAccent.primary : '#ffffff' }} viewBox="0 0 24 24">
                <path d="M12 2L2 7h20L12 2z"/>
                <rect x="3" y="8" width="18" height="2"/>
                <rect x="4" y="11" width="2.5" height="7"/>
                <rect x="8.5" y="11" width="2.5" height="7"/>
                <rect x="13" y="11" width="2.5" height="7"/>
                <rect x="17.5" y="11" width="2.5" height="7"/>
                <rect x="2" y="19" width="20" height="3"/>
              </svg>
            </div>

            {/* Bank Title & Mobile Banking Label - Clean header without account name or number */}
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className={`text-[17px] font-bold tracking-normal leading-tight ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                  CBE
                </h1>
                {currentAccent.isGold && (
                  <span className="text-[9px] bg-amber-400/20 text-amber-500 px-1.5 py-0.2 rounded-full font-bold flex items-center gap-0.5">
                    <span>👑</span>
                    <span>VIP</span>
                  </span>
                )}
              </div>
              <p className={`text-[12px] leading-tight ${isLightMode ? 'text-slate-500' : 'text-[#8e9aa8]'}`}>
                (Mobile Banking)
              </p>
            </div>
          </div>

          {/* 3-Dot Options Button with notification dot in theme accent */}
          <div className="flex items-center space-x-1">
            <button 
              type="button"
              onClick={() => setShowThreeDotMenu(true)}
              className={`relative p-2 rounded-full cursor-pointer transition-colors active:scale-95 ${
                isLightMode ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-neutral-900 text-white'
              }`}
              title="Options & Registered Accounts"
            >
              <MoreVertical className="w-6 h-6" />
              {/* Notification badge dot in active theme accent */}
              <span 
                className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full ring-2 ring-black"
                style={{ backgroundColor: currentAccent.primary }}
              />
            </button>
          </div>
        </header>

        {/* Transaction Messages Stream: Exact charcoal bubbles, links, shield spam badges, and SIM indicators */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-44">
          {bankTransactions.length === 0 ? (
            <div className="text-center py-20 text-neutral-500 text-sm">
              No transactions found for {activeBankSenderName}.
            </div>
          ) : (
            bankTransactions.map((tx) => {
              return (
                <React.Fragment key={tx.id}>
                  {/* Date separator chip (e.g. Friday, 04 Sep or Saturday, 05 Sep) */}
                  {tx.dateLabel && (
                    <div className="flex justify-center my-3">
                      <span className="px-3.5 py-1 bg-[#323741] text-neutral-200 text-[11px] font-medium rounded-full shadow-xs">
                        {tx.dateLabel}
                      </span>
                    </div>
                  )}

                  <div className="w-full max-w-[430px] mx-auto">
                    {/* Charcoal SMS Message Bubble matching screenshot */}
                    <div 
                      onClick={() => setBubbleActionTx(tx)}
                      className="bg-[#20232a] hover:bg-[#252932] active:scale-[0.99] rounded-[18px] px-4 py-3.5 text-white shadow-md transition cursor-pointer border border-[#2d313b]/70 overflow-hidden break-words [overflow-wrap:anywhere]"
                    >
                      {/* Formatted message text with clickable receipt links */}
                      <div className="text-[13.5px] leading-[1.45] text-white whitespace-pre-line font-normal break-words">
                        {(() => {
                          const urlRegex = /(https?:\/\/[^\s]+)/g;
                          const parts = (tx.fullMessageText || '').split(urlRegex);
                          return parts.map((part, i) => {
                            if (part.match(urlRegex)) {
                              const isHoliday = part.includes('combanketh.et/holidays');
                              const isReceipt = !isHoliday && part.includes('cbe.com.et') && (part.includes('mreciept') || part.includes('mbreceipt') || part.includes('BranchReceipt') || part.includes('?id='));
                              return (
                                <span
                                  key={i}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isHoliday) {
                                      setShowHolidayCardModal(true);
                                    } else if (isReceipt) {
                                      const txPayload = {
                                        id: tx.txId || 'FT26248KLR82',
                                        type: (tx.role === 'receiver' ? 'receive' : 'transfer') as 'receive' | 'transfer',
                                        amount: tx.amount || 50.00,
                                        fee: 0,
                                        recipientName: tx.role === 'receiver' ? (tx.holderName || activeHolderFullName) : (tx.counterpartyName || 'Dejene Buta'),
                                        recipientAccount: tx.role === 'receiver' ? (tx.accountNumber || activeAccount?.accountNumber || '1000419524747') : '1000419520913',
                                        recipientBank: 'Commercial Bank of Ethiopia',
                                        senderName: tx.role === 'receiver' ? (tx.counterpartyName || 'Dejene Buta') : (tx.holderName || activeHolderFullName),
                                        senderAccount: tx.role === 'receiver' ? '1000419520842' : (tx.accountNumber || activeAccount?.accountNumber || '1000419524747'),
                                        reference: tx.txId || 'FT26248KLR82',
                                        createdAt: tx.timestamp || '2026-09-05T16:41:01Z',
                                        status: 'success' as const,
                                        description: tx.role === 'receiver' ? 'Credit Transfer' : 'Debit Transaction'
                                      };
                                      if (!openWebReceiptInRealBrowser({ transaction: txPayload })) {
                                        setReceiptModalTx(txPayload);
                                      }
                                    } else {
                                      showToast('Opening external link');
                                    }
                                  }}
                                  className="text-[#38bdf8] underline hover:text-blue-300 cursor-pointer break-all font-medium inline"
                                  title={isHoliday ? 'Click to view CBE 2019 Holiday Card' : (isReceipt ? 'Click to view CBE Web Receipt' : 'Open link')}
                                >
                                  {part}
                                </span>
                              );
                            }
                            return <span key={i}>{part}</span>;
                          });
                        })()}
                      </div>
                    </div>

                    {/* Sub-caption under bubble matching screenshot (Shield icon + Spam • SMS [2] • Time) */}
                    <div className="flex items-center space-x-1.5 mt-1 text-[11px] text-neutral-400 pl-1 select-none">
                      {tx.isSpam && showSpamBadge && (
                        <>
                          <Shield className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                          <span>Spam</span>
                          <span className="text-neutral-500">•</span>
                        </>
                      )}
                      <span className="text-neutral-400 flex items-center">
                        SMS
                        <span className="inline-flex items-center justify-center min-w-[13px] h-[13px] px-0.5 border border-neutral-500 rounded-[3px] text-[8.5px] font-bold text-neutral-200 ml-1">
                          {tx.simSlot || selectedSimSlot || 2}
                        </span>
                      </span>
                      <span className="text-neutral-500">•</span>
                      <span>{tx.timeString}</span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Floating Scroll Down Arrow Button from screenshot */}
        <button
          type="button"
          onClick={() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="fixed right-4 bottom-32 z-20 w-11 h-11 rounded-full bg-[#182638] hover:bg-[#22334c] active:scale-95 border border-blue-900/30 text-[#38bdf8] flex items-center justify-center shadow-2xl transition cursor-pointer"
          title="Scroll down"
        >
          <ChevronDown className="w-5 h-5 text-[#38bdf8]" />
        </button>

        {/* Floating Action Controls & Bottom Bar matching screenshots */}
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/95 to-transparent pt-3 flex flex-col items-center pointer-events-none">
          {/* Action Pills: Report & View Profile matching screenshots */}
          <div className="flex items-center justify-center space-x-3 mb-2.5 pointer-events-auto">
            <button
              type="button"
              onClick={() => showToast('Reported to spam database')}
              className="px-5 py-1.5 rounded-full bg-[#161920] border border-neutral-700/80 hover:border-red-500/50 text-white text-[12.5px] font-medium flex items-center space-x-2 shadow-lg active:scale-95 transition cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-[#ef4444]" />
              <span>Report</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setThreeDotTab('profile');
                setShowThreeDotMenu(true);
              }}
              className="px-5 py-1.5 rounded-full bg-[#161920] border border-neutral-700/80 hover:border-blue-500/50 text-white text-[12.5px] font-medium flex items-center space-x-2 shadow-lg active:scale-95 transition cursor-pointer"
            >
              <Info className="w-4 h-4 text-[#38bdf8]" />
              <span>View profile</span>
            </button>
          </div>

          {/* Non-replyable sender footer message */}
          <div className="w-full bg-black text-center text-[12px] text-[#8e9aa8] pt-1 pb-[1px] select-none pointer-events-auto">
            Replying is not supported by this sender
          </div>
        </div>

        {/* =================================================================== */}
        {/* 3-DOT MENU: REGISTERED ACCOUNT LIST & SIMULATION CONTROLS          */}
        {/* "make the register account list inside 3 Dot"                       */}
        {/* =================================================================== */}
        {showThreeDotMenu && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setShowThreeDotMenu(false)}
          >
            <div 
              className="w-full max-w-md bg-[#17191e] border border-neutral-700/80 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto text-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Verified CBE Profile info */}
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#18263b] flex items-center justify-center border border-blue-500/30">
                    <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24">
                      <path d="M12 2L2 7h20L12 2z"/>
                      <rect x="3" y="8" width="18" height="2"/>
                      <rect x="4" y="11" width="2.5" height="7"/>
                      <rect x="8.5" y="11" width="2.5" height="7"/>
                      <rect x="13" y="11" width="2.5" height="7"/>
                      <rect x="17.5" y="11" width="2.5" height="7"/>
                      <rect x="2" y="19" width="20" height="3"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center space-x-1.5">
                      <span>Cbe Bank</span>
                      <CheckCircle className="w-4 h-4 text-blue-400 fill-blue-400/20" />
                    </h3>
                    <p className="text-[11px] text-neutral-400">Verified Business • SMS &amp; Mobile Banking</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowThreeDotMenu(false)}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* TAB BAR INSIDE 3-DOT MENU: Accounts | Settings | Simulate | Profile */}
              <div className="flex rounded-2xl bg-neutral-900/90 p-1 border border-neutral-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setThreeDotTab('accounts')}
                  className={`flex-1 py-1.5 px-2 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                    threeDotTab === 'accounts'
                      ? 'text-white shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  style={threeDotTab === 'accounts' ? { backgroundColor: currentAccent.primary } : undefined}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Accounts</span>
                </button>

                <button
                  type="button"
                  onClick={() => setThreeDotTab('settings')}
                  className={`flex-1 py-1.5 px-2 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                    threeDotTab === 'settings'
                      ? 'text-white shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  style={threeDotTab === 'settings' ? { backgroundColor: currentAccent.primary } : undefined}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => setThreeDotTab('simulate')}
                  className={`flex-1 py-1.5 px-2 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                    threeDotTab === 'simulate'
                      ? 'text-white shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  style={threeDotTab === 'simulate' ? { backgroundColor: currentAccent.primary } : undefined}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Simulate</span>
                </button>

                <button
                  type="button"
                  onClick={() => setThreeDotTab('profile')}
                  className={`flex-1 py-1.5 px-2 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                    threeDotTab === 'profile'
                      ? 'text-white shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  style={threeDotTab === 'profile' ? { backgroundColor: currentAccent.primary } : undefined}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Profile</span>
                </button>
              </div>

              {/* TAB 1: REGISTERED ACCOUNTS */}
              {threeDotTab === 'accounts' && (
                <div className="space-y-3 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center space-x-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#0066FF]" />
                      <span>Registered CBE Accounts ({filteredAccounts.length})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowThreeDotMenu(false);
                        setShowAddAccountModal(true);
                      }}
                      className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1 cursor-pointer bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add New</span>
                    </button>
                  </div>

                  {/* Search bar when browsing accounts */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
                    <input
                      type="text"
                      value={accountSearchQuery}
                      onChange={(e) => setAccountSearchQuery(e.target.value)}
                      placeholder="Search accounts by name or number..."
                      className="w-full pl-8 pr-7 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                    />
                    {accountSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setAccountSearchQuery('')}
                        className="absolute right-2.5 top-2 text-neutral-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Account Cards List with Select & Filter */}
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {filteredAccounts.map(acc => {
                      const isSelected = activeAccount?.id === acc.id || activeAccountId === acc.id;
                      const accClean = String(acc.accountNumber || '').replace(/\D/g, '');
                      const nowRole = latestTxRoleMap.get(accClean) || null;
                      const isNowAccount = Boolean(nowRole) || acc.id === currentMessageAccountId;
                      return (
                        <div 
                          key={acc.id}
                          onClick={() => {
                            setActiveAccountId(acc.id);
                            TruecallerService.setActiveAccountId(acc.id);
                            setSimSenderAccount(acc.accountNumber);
                            setSimSenderName(acc.holderName);

                            // Sync across CBE Bank, Messages SMS, and Phone apps + deliver waiting receiver notifications!
                            let matchedUser = null;
                            try {
                              SmsService.setActiveAccountNumber(acc.accountNumber);
                              PhoneCallService.setActiveCallerByAccountNumber(acc.accountNumber);
                              const cleanNum = (acc.accountNumber || '').replace(/\D/g, '');
                              const users = LocalDb.getUsers();
                              const match = users.find(u => (u.accountNumber || '').replace(/\D/g, '') === cleanNum);
                              if (match) {
                                matchedUser = match;
                                localStorage.setItem('tana_active_user_id', match.id);
                                window.dispatchEvent(new CustomEvent('cbe_account_switched', { detail: { user: match } }));
                                window.dispatchEvent(new CustomEvent('cbe_balance_updated', { detail: { user: match, balance: match.balance } }));
                              }
                            } catch {}

                            try {
                              void PushNotificationService.deliverPendingReceiverNotificationsForAccount(acc.accountNumber, matchedUser);
                              SmsService.deliverPendingReceiverSmsNotifications(acc.accountNumber);
                              TruecallerService.deliverPendingReceiverAlerts(acc.accountNumber);
                              PhoneCallService.deliverPendingReceiverAlerts(acc.accountNumber);
                            } catch {}

                            showToast(`Selected account: ${acc.holderName}`);
                          }}
                          className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between group ${
                            isSelected
                              ? 'bg-[#121927] border-[#0066FF] ring-1 ring-[#0066FF]/60 shadow-lg'
                              : isNowAccount
                              ? 'bg-[#0f172a]/95 border-blue-500/50 hover:bg-neutral-800/80 ring-1 ring-blue-500/30'
                              : 'bg-neutral-900/90 border-neutral-800 hover:border-blue-500/40 hover:bg-neutral-800/80'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span className={`text-xs font-bold ${isSelected || isNowAccount ? 'text-white' : 'text-neutral-200 group-hover:text-white'}`}>
                                {acc.holderName}
                              </span>
                              {/* Explicit "Now • Receiver" / "Now • Sender" badge for latest 2 transaction accounts */}
                              {isNowAccount && (
                                <span className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-sm border whitespace-nowrap ${
                                  nowRole === 'receiver'
                                    ? 'bg-emerald-600/90 text-white border-emerald-400/50'
                                    : 'bg-[#0066FF] text-white border-blue-400/40'
                                }`}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-0.5" />
                                  <span>{nowRole === 'receiver' ? 'Now • Receiver' : nowRole === 'sender' ? 'Now • Sender' : 'Now'}</span>
                                </span>
                              )}
                              {isSelected ? (
                                <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-[#0066FF] text-white flex items-center space-x-1 shadow-sm">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  <span>Active</span>
                                </span>
                              ) : (
                                <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700 group-hover:border-blue-400 group-hover:text-white transition">
                                  Select
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-[11px] text-neutral-300">
                              {acc.accountNumber}
                            </p>
                            <p className="font-sans text-[10px] text-neutral-400">
                              ({acc.maskedAccount || maskTruecallerAccount(acc.accountNumber)})
                            </p>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <div className="text-xs font-mono font-bold text-[#e879f9] flex items-baseline space-x-1">
                              <span className="text-[10px] font-semibold">ETB</span>
                              <span>{acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="text-[10px] text-neutral-500">Balance</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-neutral-400 text-center">
                    Simulating transfers updates sender debit &amp; receiver credit accounts instantly.
                  </p>
                </div>
              )}

              {/* TAB 2: SETTINGS */}
              {threeDotTab === 'settings' && (
                <div className="space-y-3 animate-in fade-in duration-100 text-xs">
                  {/* COLOR THEME & APPEARANCE SYSTEM */}
                  <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3.5 shadow-lg">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-white font-bold text-xs">
                        <Palette className="w-4 h-4" style={{ color: currentAccent.primary }} />
                        <span>Truecaller Color Theme</span>
                      </div>
                      <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs flex items-center gap-1"
                        style={{ 
                          backgroundColor: `${currentAccent.primary}20`,
                          borderColor: `${currentAccent.primary}50`,
                          color: currentAccent.primary
                        }}
                      >
                        {currentAccent.isGold && <span>👑</span>}
                        <span>{currentAccent.name}</span>
                        <span>•</span>
                        <span>{currentBaseTheme.name}</span>
                      </span>
                    </div>

                    {/* Base Theme Modes: Dark Slate, AMOLED Black, Midnight Navy, Clean Light */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                          Base Appearance Mode
                        </span>
                        <span className="text-[10.5px] text-neutral-400 font-medium">
                          {currentBaseTheme.desc}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {TRUECALLER_BASE_THEMES.map(b => {
                          const isSelected = themeConfig.base === b.id;
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => handleUpdateBaseTheme(b.id)}
                              className={`p-2 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'ring-2 shadow-md text-white'
                                  : 'bg-neutral-850 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                              }`}
                              style={isSelected ? { 
                                borderColor: currentAccent.primary, 
                                backgroundColor: `${currentAccent.primary}18`
                              } : undefined}
                            >
                              <div className="flex items-center justify-between">
                                <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: b.bg }} />
                                {isSelected && (
                                  <Check className="w-3 h-3" style={{ color: currentAccent.primary }} />
                                )}
                              </div>
                              <div className="mt-1">
                                <div className="text-[11px] font-bold truncate">{b.name}</div>
                                <div className="text-[9.5px] text-neutral-400 truncate">{b.desc}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Color Accent Themes: 8 Swatches */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                          Theme Accent Colors
                        </span>
                        <span className="text-[10px] font-mono font-bold" style={{ color: currentAccent.primary }}>
                          {currentAccent.primary}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {TRUECALLER_ACCENT_PRESETS.map(acc => {
                          const isSelected = themeConfig.accentId === acc.id;
                          return (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => handleUpdateAccent(acc.id)}
                              className={`p-2 rounded-xl border text-left transition cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-neutral-800 border-white/50 text-white shadow-md ring-2'
                                  : 'bg-neutral-850 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                              }`}
                              style={isSelected ? { 
                                borderColor: acc.primary
                              } : undefined}
                            >
                              {/* Swatch circle with gradient & glow */}
                              <div className="flex items-center justify-between mb-1.5">
                                <div 
                                  className="w-5 h-5 rounded-full shadow-sm flex items-center justify-center border border-white/30"
                                  style={{ 
                                    background: `linear-gradient(135deg, ${acc.gradientFrom}, ${acc.gradientTo})`,
                                    boxShadow: `0 0 10px ${acc.glow}`
                                  }}
                                >
                                  {acc.isGold && <span className="text-[9px]">👑</span>}
                                </div>
                                <span 
                                  className="text-[9px] font-bold px-1.5 py-0.2 rounded-full"
                                  style={{ backgroundColor: `${acc.primary}25`, color: acc.primary }}
                                >
                                  {acc.badgeText}
                                </span>
                              </div>

                              <div className="text-[11px] font-bold text-white truncate flex items-center gap-1">
                                {acc.name}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Live Popdown Preview Card in Selected Color Theme */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                        Live Preview (Popdown &amp; Badges)
                      </span>
                      <div 
                        className="rounded-2xl p-[2.5px] shadow-lg transition-all"
                        style={{ backgroundColor: currentAccent.primary }}
                      >
                        {/* Top Banner with Theme Gradient */}
                        <div 
                          className="px-3 py-1.5 rounded-t-[14px] flex items-center justify-between text-white select-none"
                          style={{ background: `linear-gradient(135deg, ${currentAccent.gradientFrom}, ${currentAccent.gradientTo})` }}
                        >
                          <div className="flex items-center space-x-1.5">
                            <span className="font-extrabold text-[13px] tracking-tight lowercase">
                              truecaller
                            </span>
                            {currentAccent.isGold && (
                              <span className="bg-amber-300/30 text-amber-200 text-[8.5px] px-1.5 py-0.2 rounded font-black uppercase tracking-wider">
                                GOLD
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-white/90 font-medium">SMS • 11:58 AM</span>
                          <X className="w-3 h-3 text-white/80" />
                        </div>

                        {/* White/Dark body inset */}
                        <div className="bg-white rounded-b-[14px] p-2.5 text-slate-900">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: currentAccent.lightBg, color: currentAccent.primary }}
                            >
                              <Building2 className="w-3.5 h-3.5" style={{ color: currentAccent.primary }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-extrabold text-[12px] text-slate-900 leading-tight">
                                CBE (Commercial Bank)
                              </div>
                              <div className="text-[11px] font-bold text-slate-800 truncate">
                                Account 1********0913 credited with <span style={{ color: currentAccent.primary }}>ETB 4,500.00</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-full text-white font-bold text-[10px] shadow-xs flex-shrink-0 cursor-pointer"
                              style={{ backgroundColor: currentAccent.primary }}
                            >
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reset Button */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateAccent('classic_blue');
                          handleUpdateBaseTheme('dark');
                          showToast('Reset to Truecaller Classic Blue and Dark mode');
                        }}
                        className="text-[10px] text-neutral-400 hover:text-white px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 transition cursor-pointer flex items-center space-x-1"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Reset Theme Defaults</span>
                      </button>
                    </div>
                  </div>

                  {/* Phone Model & Status Bar Global Customizer */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-neutral-900 border border-blue-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-white font-bold text-xs">
                        <Smartphone className="w-4 h-4 text-[#0066FF]" />
                        <span>Phone Model &amp; Status Bar</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowThreeDotMenu(false);
                          setShowPhoneSettingsModal(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#0066FF] hover:bg-blue-600 text-white font-bold text-[11px] transition shadow-xs flex items-center space-x-1 cursor-pointer"
                      >
                        <Sliders className="w-3 h-3" />
                        <span>Customize</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      Switch between Tecno (HiOS), Samsung One UI, iPhone 16 Pro, Google Pixel, and Xiaomi. Updates status bar icons, battery style, time, and navigation controls across all views!
                    </p>
                  </div>

                  {/* Popdown Message Typography (Font & Size) */}
                  <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-white font-bold text-xs">
                        <Type className="w-4 h-4 text-[#0066FF]" />
                        <span>Popdown Typography (Font &amp; Size)</span>
                      </div>
                      <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                        {activeFont.name} • {activeSize.name}
                      </span>
                    </div>

                    {/* Font selector */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Choose Font</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {POPDOWN_FONTS.map(f => {
                          const isSelected = popdownFontFamily === f.id;
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => handleUpdateFont(f.id)}
                              className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                                isSelected
                                  ? 'bg-[#0066FF]/25 border-[#0066FF] text-white ring-1 ring-[#0066FF]'
                                  : 'bg-neutral-850 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                              }`}
                            >
                              <div className="text-[10.5px] font-bold truncate">{f.name}</div>
                              <div className="text-[11px] font-semibold opacity-90 truncate mt-0.5" style={{ fontFamily: f.style }}>
                                ETB 459.00
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Size selector */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Text Size Preset</span>
                        <span className="text-[10.5px] text-[#0066FF] font-mono">{activeSize.label} ({popdownScale}%)</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {POPDOWN_SIZES.map(s => {
                          const isSelected = popdownFontSize === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => handleUpdateSize(s.id)}
                              className={`py-1.5 px-1 rounded-xl text-center font-bold text-[11px] transition cursor-pointer border ${
                                isSelected
                                  ? 'bg-[#0066FF] text-white border-blue-400 shadow-sm'
                                  : 'bg-neutral-850 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                              }`}
                            >
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                      {/* Scale slider */}
                      <div className="flex items-center space-x-2 pt-1">
                        <span className="text-[10px] text-neutral-400">Scale:</span>
                        <input
                          type="range"
                          min="80"
                          max="140"
                          step="5"
                          value={popdownScale}
                          onChange={(e) => handleUpdateScale(parseInt(e.target.value, 10))}
                          className="flex-1 accent-[#0066FF] cursor-pointer h-1.5"
                        />
                        <span className="text-[11px] font-mono font-bold text-white w-9 text-right">{popdownScale}%</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateScale(100)}
                          className="text-[9.5px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 hover:text-white"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* Live Preview snippet */}
                    <div className="p-2.5 rounded-xl bg-white text-slate-900 border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Popdown Live Sample</div>
                      <div style={{ fontFamily: activeFont.style, fontSize: computedAccountFontSize }} className="font-bold text-slate-900 leading-tight">
                        Account 1********0913 credited with
                      </div>
                      <div style={{ fontFamily: activeFont.style, fontSize: computedAmountFontSize }} className="font-extrabold text-slate-950 whitespace-nowrap mt-0.5">
                        ETB 459.00
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3">
                    <span className="font-bold text-neutral-200 uppercase text-[11px] tracking-wider block">
                      Truecaller SMS Preferences
                    </span>

                    {/* Real Device Push Notifications */}
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-800 gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <BellRing className="w-3.5 h-3.5 text-[#0087FF] shrink-0" />
                          <span>Real Device Push Notifications</span>
                        </div>
                        <div className="text-[10.5px] text-neutral-400">
                          Native Android APK &amp; Lock Screen pop-down alerts
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowThreeDotMenu(false);
                          setShowPushSettingsModal(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#0066FF] hover:bg-blue-500 text-white text-[11px] font-bold shrink-0 cursor-pointer transition"
                      >
                        Configure
                      </button>
                    </div>

                    {/* Clock Mode Setting */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">Status Bar Clock</div>
                        <div className="text-[10.5px] text-neutral-400">Screenshot clock (11:54) or live device time</div>
                      </div>
                      <div className="flex rounded-lg bg-neutral-800 p-0.5 border border-neutral-700">
                        <button
                          type="button"
                          onClick={() => setStatusClockMode('11:54')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                            statusClockMode === '11:54' ? 'bg-[#0066FF] text-white' : 'text-neutral-400'
                          }`}
                        >
                          11:54
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusClockMode('live')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                            statusClockMode === 'live' ? 'bg-[#0066FF] text-white' : 'text-neutral-400'
                          }`}
                        >
                          Live
                        </button>
                      </div>
                    </div>

                    {/* SIM Slot Setting */}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                      <div>
                        <div className="font-semibold text-white">Default SIM Slot</div>
                        <div className="text-[10.5px] text-neutral-400">Shown in message footer (SMS 1 or SMS 2)</div>
                      </div>
                      <div className="flex rounded-lg bg-neutral-800 p-0.5 border border-neutral-700">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSimSlot(1);
                            showToast('SIM Slot set to SMS 1');
                          }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                            selectedSimSlot === 1 ? 'bg-[#0066FF] text-white' : 'text-neutral-400'
                          }`}
                        >
                          SIM 1
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSimSlot(2);
                            showToast('SIM Slot set to SMS 2');
                          }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                            selectedSimSlot === 2 ? 'bg-[#0066FF] text-white' : 'text-neutral-400'
                          }`}
                        >
                          SIM 2
                        </button>
                      </div>
                    </div>

                    {/* Battery percentage setting */}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                      <div>
                        <div className="font-semibold text-white">Status Bar Battery Level</div>
                        <div className="text-[10.5px] text-neutral-400">Current display: {batteryPercent}%</div>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        {[32, 68, 85, 100].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => {
                              setBatteryPercent(pct);
                              showToast(`Battery set to ${pct}%`);
                            }}
                            className={`px-2 py-1 rounded-md font-mono text-[10.5px] font-bold ${
                              batteryPercent === pct ? 'bg-[#0066FF] text-white' : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Account List: Current Message On Top Toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                      <div>
                        <div className="font-semibold text-white">Account List: Current Message On Top</div>
                        <div className="text-[10.5px] text-neutral-400">Puts current message account at top with "Now" badge in accounts list</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRecentTxOnTop(!recentTxOnTop);
                          showToast(!recentTxOnTop ? 'Current message account on top with Now badge enabled' : 'Top-first account sorting disabled');
                        }}
                        className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                          recentTxOnTop ? 'bg-[#0066FF] justify-end' : 'bg-neutral-700 justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                      </button>
                    </div>

                    {/* Spam Shield Indicator Toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                      <div>
                        <div className="font-semibold text-white">Show Spam Shield Caption</div>
                        <div className="text-[10.5px] text-neutral-400">Truecaller spam categorization under bubbles</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSpamBadge(!showSpamBadge)}
                        className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                          showSpamBadge ? 'bg-[#0066FF] justify-end' : 'bg-neutral-700 justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                      </button>
                    </div>

                    {/* Inbox Filter setting */}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                      <div>
                        <div className="font-semibold text-white">Message Stream Filter</div>
                        <div className="text-[10.5px] text-neutral-400">Toggle between All Messages &amp; Financial Inbox only</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = inboxFilterMode === 'all' ? 'inbox' : 'all';
                          setInboxFilterMode(next);
                          showToast(next === 'inbox' ? 'Filtered to Financial Inbox only' : 'Showing all messages');
                        }}
                        className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-blue-400 font-semibold"
                      >
                        {inboxFilterMode === 'all' ? 'Show All' : 'Only Inbox'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SIMULATE TRANSACTIONS */}
              {threeDotTab === 'simulate' && (
                <div className="space-y-3 animate-in fade-in duration-100 text-xs">
                  {/* Quick User X -> User Y transfer */}
                  <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-800/50 space-y-2.5">
                    <div className="flex items-center space-x-2 text-purple-300 font-bold">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>User X → User Y Direct Transfer</span>
                    </div>
                    <p className="text-[11px] text-purple-200/80 leading-relaxed">
                      Simulate sending <strong>ETB 4,500.00</strong> from <strong>User X</strong> (1000419529165) to <strong>User Y</strong> (1000419520913). Both accounts update their balances and the receiver account appears at top of Accounts list with <strong>Now</strong> badge!
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        TruecallerService.simulateUserTransfer({
                          senderName: 'User X (Leykun Jemaneh)',
                          senderAccount: '1000419529165',
                          recipientName: 'User Y (Abebe Bikila)',
                          recipientAccount: '1000419520913',
                          amount: 4500,
                          bankKey: 'cbe'
                        });
                        setAccounts(TruecallerService.getAccounts());
                        setAlerts(TruecallerService.getAlerts());
                        setShowThreeDotMenu(false);
                        showToast('Transfer of ETB 4,500 created! Receiver account on top with Now badge.');
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-purple-700 hover:bg-purple-600 active:scale-95 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <Users className="w-4 h-4" />
                      <span>Execute 4,500 ETB Transfer ⚡</span>
                    </button>
                  </div>

                  {/* Custom Amount Generator */}
                  <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-2">
                    <span className="font-bold text-neutral-200 uppercase text-[11px] tracking-wider block">
                      Quick Preset Simulations
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          TruecallerService.simulateUserTransfer({
                            senderName: 'Dejene Buta',
                            senderAccount: '1000419520842',
                            recipientName: 'Leykun Jemaneh Ylma',
                            recipientAccount: '1000419524747',
                            amount: 50.00,
                            bankKey: 'cbe'
                          });
                          setAccounts(TruecallerService.getAccounts());
                          setAlerts(TruecallerService.getAlerts());
                          setShowThreeDotMenu(false);
                          showToast('Simulated ETB 50.00 credit! Leykun account on top with Now badge.');
                        }}
                        className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-emerald-400 font-bold text-[11px] text-center transition"
                      >
                        + ETB 50.00 (Credit)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          TruecallerService.simulateUserTransfer({
                            senderName: 'Leykun Jemaneh Ylma',
                            senderAccount: '1000419524747',
                            recipientName: 'Retail Merchant',
                            recipientAccount: '1000419520913',
                            amount: 20.00,
                            bankKey: 'cbe'
                          });
                          setAccounts(TruecallerService.getAccounts());
                          setAlerts(TruecallerService.getAlerts());
                          setShowThreeDotMenu(false);
                          showToast('Simulated ETB 20.00 debit! Leykun account on top with Now badge.');
                        }}
                        className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-rose-400 font-bold text-[11px] text-center transition"
                      >
                        - ETB 20.00 (Debit)
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowThreeDotMenu(false);
                        setShowQuickSimModal(true);
                      }}
                      className="w-full py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-bold text-xs border border-blue-500/30 flex items-center justify-center space-x-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Open Full Custom Generator</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: PROFILE */}
              {threeDotTab === 'profile' && (
                <div className="space-y-3 animate-in fade-in duration-100 text-xs">
                  <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-[#18263b] flex items-center justify-center border border-blue-500/40">
                        <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 24 24">
                          <path d="M12 2L2 7h20L12 2z"/>
                          <rect x="3" y="8" width="18" height="2"/>
                          <rect x="4" y="11" width="2.5" height="7"/>
                          <rect x="8.5" y="11" width="2.5" height="7"/>
                          <rect x="13" y="11" width="2.5" height="7"/>
                          <rect x="17.5" y="11" width="2.5" height="7"/>
                          <rect x="2" y="19" width="20" height="3"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white flex items-center space-x-1.5">
                          <span>Cbe Bank</span>
                          <CheckCircle className="w-4 h-4 text-blue-400 fill-blue-400/20" />
                        </h4>
                        <p className="text-[11px] text-neutral-400">Commercial Bank of Ethiopia</p>
                        <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                          Verified Business Profile
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-800 space-y-2 text-[11.5px]">
                      <div className="flex justify-between py-1 border-b border-neutral-800/60">
                        <span className="text-neutral-400">SMS Shortcode</span>
                        <span className="font-mono font-bold text-white">889 (Cbe Bank)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-800/60">
                        <span className="text-neutral-400">Category</span>
                        <span className="text-white">Banking &amp; Financial Services</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-neutral-800/60">
                        <span className="text-neutral-400">Official Portal</span>
                        <a href="https://mbreceipt.cbe.com.et" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                          mbreceipt.cbe.com.et
                        </a>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-neutral-400">Spam Score</span>
                        <span className="text-emerald-400 font-bold">0.02% (Extremely Low)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => showToast('Reported to spam database')}
                      className="flex-1 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold text-xs border border-rose-500/30 flex items-center justify-center space-x-1"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      <span>Report Bank</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => showToast('Profile details verified with Truecaller business directory')}
                      className="flex-1 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-bold text-xs border border-blue-500/30 flex items-center justify-center space-x-1"
                    >
                      <Check className="w-3.5 h-3.5 text-blue-400" />
                      <span>Verified</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Modal: Add New Registered CBE Account */}
        {showAddAccountModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-[#1a1c22] border border-neutral-700 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h3 className="font-bold text-sm text-white">Register CBE Account</h3>
                <button 
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const cleanAcc = newAccountNumber.replace(/\s+/g, '');
                const parsedBalance = parseFloat(newAccountBalance) || 0;
                
                const created = TruecallerService.createAccount({
                  bankKey: 'cbe',
                  bankName: 'Cbe Bank',
                  accountNumber: cleanAcc,
                  holderName: newAccountHolder,
                  accountType: newAccountRole === 'sender' ? 'Sender (User X)' : 'Receiver (User Y)',
                  phone: '+251 91 104 4747',
                  balance: parsedBalance,
                  backgroundApp: 'tiktok',
                  lastTransactionAt: new Date().toISOString()
                });

                setAccounts(TruecallerService.getAccounts());
                setShowAddAccountModal(false);
                setShowThreeDotMenu(true);
                showToast(`Account ${created.maskedAccount} added to Registered Accounts list!`);
              }} className="space-y-3 text-xs">
                <div>
                  <label className="text-neutral-400 block mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    value={newAccountHolder}
                    onChange={(e) => setNewAccountHolder(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-white font-medium focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">CBE Account Number</label>
                  <input
                    type="text"
                    value={newAccountNumber}
                    onChange={(e) => setNewAccountNumber(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">Initial Balance (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAccountBalance}
                    onChange={(e) => setNewAccountBalance(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">Role Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewAccountRole('sender')}
                      className={`py-2 rounded-xl font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                        newAccountRole === 'sender'
                          ? 'bg-rose-600 text-white shadow'
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      }`}
                    >
                      <ArrowUp className="w-3 h-3" />
                      <span>Sender (Debit)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAccountRole('receiver')}
                      className={`py-2 rounded-xl font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                        newAccountRole === 'receiver'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      }`}
                    >
                      <ArrowDown className="w-3 h-3" />
                      <span>Receiver (Credit)</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs shadow transition cursor-pointer"
                  >
                    Save &amp; Register Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Bubble Tapped Action Sheet */}
        {bubbleActionTx && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setBubbleActionTx(null)}
          >
            <div 
              className="w-full max-w-sm bg-[#1a1c22] border border-neutral-700 rounded-3xl p-5 shadow-2xl space-y-3.5 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <div>
                  <h3 className="font-bold text-sm text-white">Transaction Actions</h3>
                  <p className="text-[11px] text-neutral-400 font-mono">{bubbleActionTx.txId || 'FT26248KLR82'}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setBubbleActionTx(null)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs font-bold">
                {/* 1. Launch Phone Screen & Truecaller Pop-Down */}
                <button
                  type="button"
                  onClick={() => {
                    const tx = bubbleActionTx;
                    setBubbleActionTx(null);
                    handleOpenPickerForTx(tx);
                  }}
                  className="w-full p-3 rounded-2xl bg-[#0066FF] hover:bg-blue-600 active:scale-95 text-white transition flex items-center justify-between shadow-lg cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4" />
                    <span>Choose Phone &amp; Pop Down ⚡</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* 2. Open CBE Web Receipt */}
                <button
                  type="button"
                  onClick={() => {
                    const tx = bubbleActionTx;
                    setBubbleActionTx(null);
                    const txPayload = {
                      id: tx.txId || 'FT26248KLR82',
                      type: (tx.role === 'receiver' ? 'receive' : 'transfer') as 'receive' | 'transfer',
                      amount: tx.amount || 50.00,
                      fee: 0,
                      recipientName: tx.role === 'receiver' ? (tx.holderName || activeHolderFullName) : (tx.counterpartyName || 'Retail Merchant'),
                      recipientAccount: tx.role === 'receiver' ? (tx.accountNumber || activeAccount?.accountNumber || '1000419524747') : '1000419520913',
                      recipientBank: 'Commercial Bank of Ethiopia',
                      senderName: tx.role === 'receiver' ? (tx.counterpartyName || 'Dejene Buta') : (tx.holderName || activeHolderFullName),
                      senderAccount: tx.role === 'receiver' ? '1000419520842' : (tx.accountNumber || activeAccount?.accountNumber || '1000419524747'),
                      reference: tx.txId || 'FT26248KLR82',
                      createdAt: tx.timestamp || '2026-09-05T16:41:01Z',
                      status: 'success' as const,
                      description: tx.role === 'receiver' ? 'Credit Transfer' : 'Debit Transaction'
                    };
                    if (!openWebReceiptInRealBrowser({ transaction: txPayload })) {
                      setReceiptModalTx(txPayload);
                    }
                  }}
                  className="w-full p-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-200 transition flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-purple-400" />
                    <span>Open Official CBE Web Receipt</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-neutral-400" />
                </button>

                {/* 3. Copy SMS Message */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      navigator.clipboard.writeText(bubbleActionTx.fullMessageText || '');
                      showToast('SMS message copied to clipboard!');
                    } catch {
                      showToast('Copied to clipboard');
                    }
                    setBubbleActionTx(null);
                  }}
                  className="w-full p-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-200 transition flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Copy className="w-4 h-4 text-neutral-400" />
                    <span>Copy SMS Text</span>
                  </div>
                  <Check className="w-4 h-4 text-neutral-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: CBE Web Receipt Modal */}
        {receiptModalTx && (
          <CbeWebReceiptModal
            transaction={receiptModalTx}
            onClose={() => setReceiptModalTx(null)}
          />
        )}

        {/* Modal: CBE 2019 Holiday Greeting Card Modal */}
        {showHolidayCardModal && (
          <CbeHolidayCardModal
            onClose={() => setShowHolidayCardModal(false)}
          />
        )}

        {/* Modal: Quick Simulate Custom Transaction */}
        {showQuickSimModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#1f2023] border border-neutral-700 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center font-bold text-xs text-white">
                    CBE
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Simulate CBE Transaction</h3>
                    <p className="text-[10.5px] text-neutral-400">Auto-creates accounts &amp; alerts in Truecaller SMS</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowQuickSimModal(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Selector Tabs */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-900 rounded-xl border border-neutral-800 text-xs">
                <button
                  type="button"
                  onClick={() => setSimMode('transfer')}
                  className={`py-1.5 rounded-lg font-bold transition flex items-center justify-center space-x-1 ${
                    simMode === 'transfer'
                      ? 'bg-purple-700 text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Transfer (X → Y 4500)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSimMode('single')}
                  className={`py-1.5 rounded-lg font-bold transition flex items-center justify-center space-x-1 ${
                    simMode === 'single'
                      ? 'bg-purple-700 text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Single Alert</span>
                </button>
              </div>

              <form onSubmit={handleQuickSimulateSubmit} className="space-y-3 text-xs">
                {simMode === 'transfer' ? (
                  <>
                    <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/40 text-[11px] text-purple-200 leading-relaxed">
                      💡 <strong>Bidirectional Sync:</strong> Automatically creates <strong>both Sender (User X)</strong> and <strong>Receiver (User Y)</strong> accounts inside Truecaller SMS. Both the debit alert and credit alert will sync, and the account with the current message appears at the top of the Accounts list with the <strong>Now</strong> badge.
                    </div>

                    <div>
                      <label className="text-neutral-400 font-semibold mb-1 block">Transfer Amount (ETB)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={simAmount}
                        onChange={(e) => setSimAmount(e.target.value)}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:border-purple-500 focus:outline-none"
                        required
                      />
                    </div>

                    {/* Sender Section */}
                    <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/30 space-y-2">
                      <span className="text-rose-400 font-bold uppercase tracking-wider text-[10px] block">
                        Sender (User X) • Will be Debited &amp; Added to Truecaller Accounts
                      </span>
                      <div>
                        <label className="text-neutral-400 text-[10.5px] block mb-0.5">Sender Name</label>
                        <input
                          type="text"
                          value={simSenderName}
                          onChange={(e) => setSimSenderName(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-purple-500 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 text-[10.5px] block mb-0.5">Sender CBE Account</label>
                        <input
                          type="text"
                          value={simSenderAccount}
                          onChange={(e) => setSimSenderAccount(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-purple-500 focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    {/* Receiver Section */}
                    <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-900/30 space-y-2">
                      <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] block">
                        Receiver (User Y) • Will be Credited &amp; Added to Truecaller Accounts
                      </span>
                      <div>
                        <label className="text-neutral-400 text-[10.5px] block mb-0.5">Receiver Name</label>
                        <input
                          type="text"
                          value={simReceiverName}
                          onChange={(e) => setSimReceiverName(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-purple-500 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 text-[10.5px] block mb-0.5">Receiver CBE Account</label>
                        <input
                          type="text"
                          value={simReceiverAccount}
                          onChange={(e) => setSimReceiverAccount(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-purple-500 focus:outline-none"
                          required
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 active:scale-95 text-white font-extrabold text-xs shadow-lg transition cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <span>
                      {simMode === 'transfer' 
                        ? 'Simulate Transfer (Create Both Accounts & 4,500 Alerts) ⚡' 
                        : 'Create & Choose Phone Screen ⚡'}
                    </span>
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
    <div className="fixed inset-0 z-50 bg-black flex flex-col w-full h-full overflow-hidden select-none font-sans">
      
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-white text-slate-900 font-bold px-4 py-2 rounded-full shadow-2xl text-xs flex items-center space-x-2 border border-blue-500 animate-in fade-in slide-in-from-top-3 duration-150">
          <CheckCircle2 className="w-4 h-4 text-[#0066FF]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* FULL SCREEN EDGE-TO-EDGE CONTAINER */}
      <div className="relative w-full h-full bg-black overflow-hidden flex flex-col">
        
        {/* Selected Phone Screen (TikTok, YouTube, Telegram, Instagram, WhatsApp, LockScreen) */}
        <div className="relative w-full flex-1 overflow-hidden">
          {renderBackgroundScreen(selectedPhoneScreen)}

          {/* =============================================================== */}
          {/* TRUECALLER SMS NOTIFICATION POP-DOWN OVERLAY                    */}
          {/* Zero vertical gap with status bar, matching IMG_20260905_131647_440.jpg */}
          {/* =============================================================== */}
          {isPopdownVisible && currentAlert && (
            <div 
              onTouchStart={(e) => {
                touchStartY.current = e.touches[0].clientY;
              }}
              onTouchEnd={(e) => {
                const diff = touchStartY.current - e.changedTouches[0].clientY;
                if (diff > 45) {
                  setIsPopdownVisible(false);
                }
              }}
              className={`absolute top-0 inset-x-0 z-50 px-2 sm:px-2.5 pointer-events-auto transition-all duration-300 transform ${
                isPopdownAnimating 
                  ? '-translate-y-full opacity-0 scale-95' 
                  : 'translate-y-0 opacity-100 scale-100'
              }`}
            >
              <div 
                className="w-full rounded-[26px] overflow-hidden p-[6px] shadow-[0_18px_46px_rgba(0,45,130,0.45)] transition-all"
                style={{ backgroundColor: currentAccent.primary }}
              >
                {/* Signature Truecaller Header Bar */}
                <div 
                  className="px-3.5 pt-2 pb-2.5 flex items-center justify-between text-white select-none"
                  style={{ background: `linear-gradient(135deg, ${currentAccent.gradientFrom}, ${currentAccent.gradientTo})` }}
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-[18px] tracking-[-0.03em] lowercase leading-none text-white">
                      truecaller
                    </span>
                    {currentAccent.isGold && (
                      <span className="bg-amber-300/30 text-amber-200 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-0.5">
                        <span>👑</span>
                        <span>GOLD</span>
                      </span>
                    )}
                  </div>

                  <div className="text-[14.5px] text-white/95 font-medium tracking-normal leading-none">
                    SMS • {currentAlert.timeString && currentAlert.timeString.toLowerCase() !== 'now'
                      ? currentAlert.timeString
                      : new Date(currentAlert.timestamp || Date.now()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </div>

                  {/* Close 'X' Button */}
                  <button 
                    type="button"
                    onClick={() => setIsPopdownVisible(false)}
                    className="w-7 h-7 -mr-1 rounded-full hover:bg-white/20 active:scale-90 transition flex items-center justify-center cursor-pointer text-white"
                    title="Dismiss alert"
                  >
                    <X className="w-[19px] h-[19px] text-white stroke-[2.3]" />
                  </button>
                </div>

                {/* White Inset Body Card with curved corners matching authentic Truecaller popdown */}
                <div className="bg-white rounded-[20px] overflow-hidden text-[#111827]">
                  
                  {/* Top content area with avatar, text, and AI summary */}
                  <div className="px-4 pt-4 pb-3.5 space-y-3">
                    {/* Bank Avatar & Name Header */}
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: currentAccent.lightBg || '#E5EEFA', color: currentAccent.primary }}
                      >
                        <Building2 className="w-[22px] h-[22px] text-[#1F2937] stroke-[2]" />
                      </div>
                      <div>
                        <h2 className="font-bold text-[19.5px] text-[#111827] tracking-[-0.015em] leading-none">
                          {currentAlert.bankKey === 'cbe' ? 'CBE' : currentAlert.bankName}
                        </h2>
                      </div>
                    </div>

                    {/* Main Transaction Message Text */}
                    <div 
                      className="leading-snug text-[#111827] font-bold tracking-[-0.01em] pt-0.5"
                      style={{
                        fontFamily: activeFont.style,
                        fontSize: computedAccountFontSize,
                      }}
                    >
                      Account {(currentAlert.maskedAccount || '1********0913').replace(/X/g, '*')} {currentAlert.role === 'receiver' ? 'credited with' : 'debited with'}
                      <div 
                        className="font-extrabold text-[#0B0F19] tracking-[-0.025em] mt-0.5 leading-[1.15] whitespace-nowrap"
                        style={{
                          fontFamily: activeFont.style,
                          fontSize: computedAmountFontSize,
                        }}
                      >
                        <span className="whitespace-nowrap inline-block">
                          ETB {currentAlert.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* AI Summary Tag */}
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={() => setShowAiBreakdown(!showAiBreakdown)}
                        className="inline-flex items-center space-x-2 text-[#4B5563] hover:opacity-80 text-[15px] font-normal transition cursor-pointer"
                        style={{ color: showAiBreakdown ? currentAccent.primary : undefined }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0" aria-hidden="true">
                          <path d="M11 2L13.2 8.8L20 11L13.2 13.2L11 20L8.8 13.2L2 11L8.8 8.8L11 2Z" fill={currentAccent.primary} />
                          <path d="M18.5 3L19.4 5.6L22 6.5L19.4 7.4L18.5 10L17.6 7.4L15 6.5L17.6 5.6L18.5 3Z" fill={currentAccent.primary} />
                          <circle cx="5.5" cy="18.5" r="1.5" fill={currentAccent.primary} />
                        </svg>
                        <span className="text-[#4B5563]">AI summary</span>
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
                              <span className="font-bold text-emerald-700 whitespace-nowrap">
                                ETB {currentAlert.balanceAfter.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Strip */}
                  <div 
                    className="px-4 py-3.5 text-center border-t border-[#E5E7EB] bg-[#F5F8FC] rounded-b-[20px]"
                  >
                    <button
                      type="button"
                      onClick={handleMarkAsRead}
                      className="w-full py-0.5 text-center font-bold text-[17.5px] tracking-[-0.01em] transition cursor-pointer flex items-center justify-center space-x-1.5 active:scale-98"
                      style={!currentAlert.read ? { color: currentAccent.primary } : undefined}
                    >
                      {currentAlert.read ? (
                        <>
                          <CheckCheck className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-600">Read</span>
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
          {/* Sits at the top directly behind the popdown message.           */}
          {/* MUST NOT BE SEEN while the popdown message is displayed.       */}
          {/* =============================================================== */}
          <div 
            className={`absolute inset-x-0 top-2.5 z-20 px-3 sm:px-4 flex items-center justify-center select-none transition-all duration-200 ${
              isPopdownVisible 
                ? 'opacity-0 pointer-events-none invisible' 
                : 'opacity-100 pointer-events-auto visible'
            }`}
          >
            <div className="grid grid-cols-4 gap-1.5 w-full max-w-[420px] p-2 bg-neutral-950/85 backdrop-blur-md rounded-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
              {/* 1. Back Button */}
              <button
                type="button"
                onClick={() => setView('bank_thread')}
                className="flex items-center justify-center space-x-1 py-2.5 px-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition active:scale-95 border border-white/10 cursor-pointer"
                title="Back to Message Thread"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-neutral-300 flex-shrink-0" />
                <span className="truncate">Back</span>
              </button>

              {/* 2. Reloading or Simulate Again Button */}
              <button
                type="button"
                onClick={handleRetriggerAlert}
                className="flex items-center justify-center space-x-1 py-2.5 px-1.5 rounded-xl bg-[#0066FF] hover:bg-blue-600 text-white text-[11px] font-extrabold transition active:scale-95 shadow-lg border border-blue-400/40 cursor-pointer"
                title="Simulate or Reload Truecaller Pop-down Alert"
              >
                <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">Simulate</span>
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
                className="flex items-center justify-center space-x-1 py-2.5 px-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-300 text-[11px] font-bold transition active:scale-95 border border-amber-400/35 cursor-pointer"
                title="Choose Phone Model, Background Screen, or Bank Transaction"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="truncate">Choose</span>
              </button>

              {/* 4. Font & Size Button */}
              <button
                type="button"
                onClick={() => setShowTypographyDrawer(!showTypographyDrawer)}
                className="flex items-center justify-center space-x-1 py-2.5 px-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-cyan-300 text-[11px] font-bold transition active:scale-95 border border-cyan-400/35 cursor-pointer"
                title="Customize Popdown Font Family & Text Size"
              >
                <Type className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span className="truncate">Font/Size</span>
              </button>
            </div>
          </div>

          {/* Floating Font & Text Size Quick Tuner Button */}
          <div className="absolute bottom-5 right-3.5 z-40 pointer-events-auto">
            <button
              type="button"
              onClick={() => setShowTypographyDrawer(!showTypographyDrawer)}
              className="flex items-center space-x-1.5 py-2 px-3 rounded-full bg-neutral-950/90 hover:bg-neutral-900 text-white border border-white/20 shadow-2xl backdrop-blur-md text-[11.5px] font-bold transition active:scale-95 cursor-pointer"
              title="Adjust Popdown Font and Size"
            >
              <Type className="w-3.5 h-3.5 text-blue-400" />
              <span>Font &amp; Size</span>
            </button>
          </div>

          {/* Popdown Typography Customizer Sheet (Available directly while watching the popdown alert) */}
          {showTypographyDrawer && (
            <div className="absolute inset-x-2.5 bottom-16 z-50 p-3.5 bg-neutral-950/95 backdrop-blur-xl rounded-2xl border border-blue-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-150">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <div className="flex items-center space-x-2 text-white font-bold text-xs">
                  <Type className="w-4 h-4 text-[#0066FF]" />
                  <span>Popdown Font &amp; Text Size</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTypographyDrawer(false)}
                  className="w-6 h-6 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Font Family selection */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Choose Font</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-[140px] overflow-y-auto">
                  {POPDOWN_FONTS.map(f => {
                    const isSelected = popdownFontFamily === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleUpdateFont(f.id)}
                        className={`p-1.5 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#0066FF] border-blue-400 text-white shadow-sm'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div className="text-[10px] font-bold truncate">{f.name}</div>
                        <div className="text-[11px] font-semibold opacity-90 truncate" style={{ fontFamily: f.style }}>
                          ETB 459.00
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Text Size Presets & Slider */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Text Size</span>
                  <span className="text-[10.5px] text-[#0066FF] font-mono">{activeSize.label} ({popdownScale}%)</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {POPDOWN_SIZES.map(s => {
                    const isSelected = popdownFontSize === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleUpdateSize(s.id)}
                        className={`py-1.5 px-1 rounded-xl text-center font-bold text-[11px] transition cursor-pointer border ${
                          isSelected
                            ? 'bg-[#0066FF] text-white border-blue-400 shadow-sm'
                            : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>

                {/* Scale slider */}
                <div className="flex items-center space-x-2 pt-1">
                  <span className="text-[10px] text-neutral-400">Scale:</span>
                  <input
                    type="range"
                    min="80"
                    max="140"
                    step="5"
                    value={popdownScale}
                    onChange={(e) => handleUpdateScale(parseInt(e.target.value, 10))}
                    className="flex-1 accent-[#0066FF] cursor-pointer h-1.5"
                  />
                  <span className="text-[11px] font-mono font-bold text-white w-9 text-right">{popdownScale}%</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateScale(100)}
                    className="text-[9.5px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 hover:text-white"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Render the Picker Modal if triggered */}
      {renderPickerModal()}

      {/* Global Phone Type & Status Bar Settings Modal */}
      <PhoneSettingsModal 
        isOpen={showPhoneSettingsModal} 
        onClose={() => setShowPhoneSettingsModal(false)} 
      />

      {/* Truecaller Push Notifications Settings Modal */}
      <SubAppPushModal
        isOpen={showPushSettingsModal}
        onClose={() => setShowPushSettingsModal(false)}
        subAppId="truecaller"
        isDarkMode={!isLightMode}
      />

    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../components/Header';
import AccountCard from '../components/AccountCard';
import QuickActions from '../components/QuickActions';
import ServiceGrid from '../components/ServiceGrid';
import QRButton from '../components/QRButton';
import BottomNavigation, { NavTabId } from '../components/BottomNavigation';
import TransactionDetailModal from '../components/TransactionDetailModal';
import { CardsIcon, CopyIcon, RefreshIcon } from '../components/CbeCustomIcons';
import { 
  X, 
  Check, 
  Copy, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowDown,
  ArrowUp,
  CreditCard, 
  ShieldCheck, 
  Scan, 
  QrCode,
  Building,
  Phone,
  Receipt,
  RotateCw,
  Search,
  Sparkles,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Smartphone,
  PhoneCall,
  Users
} from 'lucide-react';
import { UserProfile, Transaction, RegisteredAccountInfo } from '../types';
import { LocalDb } from '../lib/mockData';
import { RegisteredAccountsModal } from '../components/RegisteredAccountsModal';
import { SmsService } from '../services/smsService';
import { TruecallerService } from '../services/truecallerService';

interface HomeProps {
  currentUser?: UserProfile | null;
  onUpdateCurrentUser?: (user: UserProfile) => void;
  initialNavTab?: 'home' | 'history';
  onNavigateToTab?: (tab: 'home' | 'transfer' | 'payments' | 'history' | 'profile', subTab?: string) => void;
  onSelectTransaction?: (tx: Transaction) => void;
  onOpenAdmin?: () => void;
  onOpenSmsSimulator?: () => void;
  onOpenTruecallerSimulator?: () => void;
  onOpenPhoneApp?: () => void;
  onOpenDashenApp?: () => void;
  onOpenTelebirrApp?: () => void;
  onOpenTelegramSimulator?: () => void;
}

export const Home: React.FC<HomeProps> = ({
  currentUser: propUser,
  onUpdateCurrentUser,
  initialNavTab = 'home',
  onNavigateToTab,
  onSelectTransaction,
  onOpenAdmin,
  onOpenSmsSimulator,
  onOpenTruecallerSimulator,
  onOpenPhoneApp,
  onOpenDashenApp,
  onOpenTelebirrApp,
  onOpenTelegramSimulator,
}) => {
  // Active user state to reflect balance and account changes in real time
  const [activeUser, setActiveUser] = useState<UserProfile>(() => {
    if (propUser) return propUser;
    try {
      const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('tana_active_user_id') : null;
      if (savedUserId) {
        const users = LocalDb.getUsers();
        const match = users.find(u => u.id === savedUserId);
        if (match) return match;
      }
    } catch {}
    return {
      id: 'user_1',
      name: 'Leykun Jemaneh Ylma',
      email: 'leykunjemaneh3@gmail.com',
      phone: '+251900112233',
      accountNumber: '1000419524747',
      accountType: 'wadiah',
      balance: 18450.50,
      availableBalance: 18450.50,
      currency: 'ETB',
      role: 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
  });

  useEffect(() => {
    if (propUser) {
      setActiveUser(propUser);
    }
  }, [propUser?.id, propUser?.balance, propUser?.accountNumber, propUser?.name]);

  const [activeNavTab, setActiveNavTab] = useState<NavTabId>(initialNavTab);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState('01 Jul 2026 • 10:14 AM');
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);

  // Pull-To-Refresh States
  const [pullDistance, setPullDistance] = useState(0);
  const [pullState, setPullState] = useState<'idle' | 'pulling' | 'threshold' | 'refreshing' | 'success'>('idle');
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const touchStartYRef = useRef(0);
  const touchStartXRef = useRef(0);
  const canPullRef = useRef(false);
  const thresholdHapticRef = useRef(false);
  const isMouseDownRef = useRef(false);
  const mouseStartYRef = useRef(0);

  const PULL_THRESHOLD = 60;
  const MAX_PULL = 90;

  // Transaction history filter state
  const [historyFilter, setHistoryFilter] = useState<'all' | 'debited' | 'credited'>('all');
  const [isHistorySearchOpen, setIsHistorySearchOpen] = useState(false);
  const [historySearchText, setHistorySearchText] = useState('');
  const [selectedDetailTx, setSelectedDetailTx] = useState<Transaction | null>(null);

  // Active Interactive Modal state
  const [activeModal, setActiveModal] = useState<
    'qr' | 'search' | 'menu' | 'cashout' | 'ministatement' | 'cards' | 'billshare' | 'schedules' | 'cbe-transfer' | 'receive' | 'airtime' | 'other-transfers' | 'cbebirr' | 'bills-utilities' | 'banking' | 'government-services' | 'pay-merchant' | 'travel' | 'shopping' | 'entertainment' | 'tax-payment' | null
  >(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [qrScanSuccess, setQrScanSuccess] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [showRegisteredAccountsModal, setShowRegisteredAccountsModal] = useState(false);

  useEffect(() => {
    setActiveNavTab(initialNavTab);
  }, [initialNavTab]);

  const updateTime = useCallback(() => {
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = now.getDate().toString().padStart(2, '0');
    const mon = months[now.getMonth()];
    const yr = now.getFullYear();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hourStr = hours.toString().padStart(2, '0');
    setCurrentDateTime(`${day} ${mon} ${yr} • ${hourStr}:${minutes} ${ampm}`);
  }, []);

  const loadTransactions = useCallback(() => {
    const txs = LocalDb.getTransactions();
    setAllTransactions(txs);
    setRecentTransactions(txs.slice(0, 6));
  }, []);

  const handleSwitchRegisteredAccount = (account: RegisteredAccountInfo) => {
    setShowRegisteredAccountsModal(false);
    const users = LocalDb.getUsers();
    const cleanNum = account.accountNumber.replace(/\D/g, '');
    let target = users.find(u => (u.accountNumber && u.accountNumber.replace(/\D/g, '') === cleanNum));
    if (!target) {
      target = {
        id: account.userId || 'user_' + Math.random().toString(36).substring(2, 9),
        name: account.accountName,
        accountNumber: account.accountNumber,
        phone: account.phone || '+251911000000',
        email: `${account.accountName.toLowerCase().replace(/\s+/g, '')}@cbe.et`,
        balance: account.balance ?? 25000,
        availableBalance: account.balance ?? 25000,
        currency: 'ETB',
        role: 'user',
        status: 'active',
        createdAt: new Date().toISOString()
      };
      users.push(target);
      LocalDb.setUsers(users);
    }
    localStorage.setItem('tana_active_user_id', target.id);
    setActiveUser({ ...target });
    onUpdateCurrentUser?.(target);
    loadTransactions();
    try {
      SmsService.ensureAccount(target.accountNumber, target.name, target.balance);
      SmsService.setActiveAccountNumber(target.accountNumber);
      TruecallerService.syncBalance(target.accountNumber, target.balance);
      TruecallerService.setActiveAccountNumber(target.accountNumber);
      window.dispatchEvent(new CustomEvent('cbe_account_switched', { detail: { user: target } }));
      window.dispatchEvent(new CustomEvent('cbe_balance_updated', { detail: { user: target, balance: target.balance } }));
    } catch {}
  };

  // Sync balance and transactions anytime any transaction is made
  useEffect(() => {
    const handleSync = (e: any) => {
      const activeId = (typeof window !== 'undefined' ? localStorage.getItem('tana_active_user_id') : null) || e?.detail?.user?.id || 'user_1';
      const users = LocalDb.getUsers();
      const freshUser = users.find(u => u.id === activeId) || (e?.detail?.user ? e.detail.user : null);
      if (freshUser) {
        setActiveUser({ ...freshUser });
      }
      loadTransactions();
    };

    const handleAccountSwitched = (e: any) => {
      if (e?.detail?.user) {
        setActiveUser({ ...e.detail.user });
      } else {
        const activeId = typeof window !== 'undefined' ? localStorage.getItem('tana_active_user_id') : null;
        if (activeId) {
          const users = LocalDb.getUsers();
          const match = users.find(u => u.id === activeId);
          if (match) setActiveUser({ ...match });
        }
      }
      loadTransactions();
    };

    window.addEventListener('cbe_balance_updated' as any, handleSync);
    window.addEventListener('cbe_transaction_completed' as any, handleSync);
    window.addEventListener('cbe_accounts_updated' as any, handleSync);
    window.addEventListener('cbe_account_switched' as any, handleAccountSwitched);
    return () => {
      window.removeEventListener('cbe_balance_updated' as any, handleSync);
      window.removeEventListener('cbe_transaction_completed' as any, handleSync);
      window.removeEventListener('cbe_accounts_updated' as any, handleSync);
      window.removeEventListener('cbe_account_switched' as any, handleAccountSwitched);
    };
  }, [loadTransactions]);

  useEffect(() => {
    setCustomLogoUrl(LocalDb.getCustomBankLogo());
    loadTransactions();

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [loadTransactions, updateTime]);

  // Pull-to-refresh execution
  const triggerPullRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPullState('refreshing');
    setPullDistance(48);

    // 1. Fetch freshest user data from LocalDb
    const users = LocalDb.getUsers();
    const freshUser = users.find(u => u.id === activeUser.id || u.accountNumber === activeUser.accountNumber) || activeUser;
    
    // 2. Refresh transactions & update statuses
    const txs = LocalDb.getTransactions();
    
    // 3. Update live clock
    updateTime();

    // Natural delay so user perceives the refresh animation smoothly
    await new Promise(r => setTimeout(r, 650));

    setActiveUser({ ...freshUser });
    setAllTransactions(txs);
    setRecentTransactions(txs.slice(0, 6));
    onUpdateCurrentUser?.(freshUser);

    // Notify other components if needed
    window.dispatchEvent(new CustomEvent('cbe_balance_refreshed', { detail: { balance: freshUser.balance } }));

    // Show success feedback
    setPullState('success');
    await new Promise(r => setTimeout(r, 600));

    // Smooth return to resting state
    setPullDistance(0);
    setIsRefreshing(false);
    setPullState('idle');
    thresholdHapticRef.current = false;
  }, [activeUser, onUpdateCurrentUser, updateTime]);

  const handleRefresh = useCallback(() => {
    triggerPullRefresh();
  }, [triggerPullRefresh]);

  // Touch handlers for pull to refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    if (pullState === 'refreshing' || pullState === 'success') return;
    if (e.touches.length === 1) {
      const mainEl = mainScrollRef.current;
      const atTop = !mainEl || mainEl.scrollTop <= 0;
      if (atTop) {
        touchStartYRef.current = e.touches[0].clientY;
        touchStartXRef.current = e.touches[0].clientX;
        canPullRef.current = true;
        thresholdHapticRef.current = false;
      } else {
        canPullRef.current = false;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!canPullRef.current || pullState === 'refreshing' || pullState === 'success') return;
    const mainEl = mainScrollRef.current;
    if (mainEl && mainEl.scrollTop > 0) {
      canPullRef.current = false;
      setPullDistance(0);
      setPullState('idle');
      return;
    }

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - touchStartYRef.current;
    const deltaX = Math.abs(currentX - touchStartXRef.current);

    if (deltaY > 0 && deltaY > deltaX) {
      const distance = Math.min(MAX_PULL, Math.pow(deltaY, 0.85) * 1.8);
      setPullDistance(distance);

      if (distance >= PULL_THRESHOLD) {
        setPullState('threshold');
        if (!thresholdHapticRef.current) {
          thresholdHapticRef.current = true;
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(12); } catch {}
          }
        }
      } else {
        setPullState('pulling');
        thresholdHapticRef.current = false;
      }
    } else if (deltaY < 0) {
      setPullDistance(0);
      setPullState('idle');
    }
  };

  const handleTouchEnd = () => {
    if (!canPullRef.current || pullState === 'refreshing' || pullState === 'success') return;
    canPullRef.current = false;

    if (pullDistance >= PULL_THRESHOLD) {
      triggerPullRefresh();
    } else {
      setPullDistance(0);
      setPullState('idle');
    }
  };

  // Mouse handlers for desktop preview
  const handleMouseDown = (e: React.MouseEvent) => {
    if (pullState === 'refreshing' || pullState === 'success') return;
    const mainEl = mainScrollRef.current;
    if (!mainEl || mainEl.scrollTop <= 0) {
      isMouseDownRef.current = true;
      mouseStartYRef.current = e.clientY;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current || pullState === 'refreshing' || pullState === 'success') return;
    const deltaY = e.clientY - mouseStartYRef.current;
    if (deltaY > 5) {
      const distance = Math.min(MAX_PULL, Math.pow(deltaY, 0.85) * 1.8);
      setPullDistance(distance);
      setPullState(distance >= PULL_THRESHOLD ? 'threshold' : 'pulling');
    }
  };

  const handleMouseUp = () => {
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    if (pullDistance >= PULL_THRESHOLD) {
      triggerPullRefresh();
    } else {
      setPullDistance(0);
      setPullState('idle');
    }
  };

  // Listen to Phone Navigation Bar Back and Home actions
  useEffect(() => {
    const handlePhoneBack = (e: any) => {
      if (activeModal) {
        setActiveModal(null);
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        return;
      }
      if (selectedDetailTx) {
        setSelectedDetailTx(null);
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        return;
      }
      if (isHistorySearchOpen) {
        setIsHistorySearchOpen(false);
        setHistorySearchText('');
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        return;
      }
      if (activeNavTab !== 'home') {
        setActiveNavTab('home');
        onNavigateToTab?.('home');
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        return;
      }
    };

    const handlePhoneHome = () => {
      setActiveModal(null);
      setSelectedDetailTx(null);
      setIsHistorySearchOpen(false);
      setActiveNavTab('home');
      onNavigateToTab?.('home');
    };

    window.addEventListener('cbe_phone_back', handlePhoneBack);
    window.addEventListener('cbe_phone_home', handlePhoneHome);
    return () => {
      window.removeEventListener('cbe_phone_back', handlePhoneBack);
      window.removeEventListener('cbe_phone_home', handlePhoneHome);
    };
  }, [activeModal, selectedDetailTx, isHistorySearchOpen, activeNavTab, onNavigateToTab]);

  // Nav handler for bottom bar
  const handleNavTabChange = (tab: NavTabId) => {
    if (tab === 'home') {
      setActiveNavTab('home');
      onNavigateToTab?.('home');
    } else if (tab === 'history' || tab === 'transactions') {
      setActiveNavTab('history');
      onNavigateToTab?.('history');
    } else if (tab === 'transfer') {
      onNavigateToTab?.('transfer');
    } else if (tab === 'payments') {
      onNavigateToTab?.('payments');
    } else if (tab === 'profile' || tab === 'settings') {
      onNavigateToTab?.('profile');
    }
  };

  // Service grid handler
  const handleServiceSelect = (serviceId: string) => {
    if (serviceId === 'cbe-transfer' && onNavigateToTab) {
      onNavigateToTab('transfer', 'transfer');
    } else if (serviceId === 'bills-utilities' && onNavigateToTab) {
      onNavigateToTab('payments');
    } else if (serviceId === 'airtime' && onNavigateToTab) {
      onNavigateToTab('transfer', 'airtime');
    } else {
      setActiveModal(serviceId as any);
    }
  };

  // Quick action handler
  const handleQuickAction = (actionId: 'ministatement' | 'cashout' | 'billshare' | 'cards' | 'schedules') => {
    setActiveModal(actionId as any);
  };

  // Format date helper for CBE transaction history
  const formatCbeHistoryDate = (isoOrStr: string): string => {
    try {
      const d = new Date(isoOrStr);
      if (isNaN(d.getTime())) return isoOrStr;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = d.getDate().toString().padStart(2, '0');
      const mon = months[d.getMonth()];
      const yr = d.getFullYear().toString().slice(-2);
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${day}-${mon}-${yr} ${hours}:${minutes} ${ampm}`;
    } catch {
      return isoOrStr;
    }
  };

  // Category helper
  const getCbeCategory = (tx: Transaction): string => {
    if (tx.category) return tx.category;
    if (tx.type === 'airtime') return 'AIRTIME PURCHASE';
    if (tx.type === 'bill') return 'UTILITY PAYMENT';
    if (tx.senderName === 'Deposit' || tx.description?.toLowerCase().includes('deposit')) return 'MOBILE MONEY TXN';
    return 'ACCOUNT TO ACCOUNT';
  };

  // Filtered transactions for the History view: ONLY from the selected or active bank account
  const filteredHistoryTransactions = allTransactions.filter((tx) => {
    // 1. Must belong to the selected or active bank account
    const cleanUserAcc = (activeUser.accountNumber || '').replace(/\D/g, '');
    const cleanSenderAcc = (tx.senderAccount || '').replace(/\D/g, '');
    const cleanRecipAcc = (tx.recipientAccount || '').replace(/\D/g, '');

    const isSender = (cleanSenderAcc && cleanSenderAcc === cleanUserAcc) || (tx.senderId && tx.senderId === activeUser.id);
    const isRecipient = (cleanRecipAcc && cleanRecipAcc === cleanUserAcc) || (tx.recipientId && tx.recipientId === activeUser.id);

    // Support legacy seed transactions for primary user (user_1 / user_admin)
    const isPrimaryUser = activeUser.id === 'user_1' || activeUser.id === 'user_admin' || cleanUserAcc === '1000419524747' || cleanUserAcc === '1000284758657';
    const isLegacyPrimaryTx = isPrimaryUser && (cleanSenderAcc === '1000284758657' || cleanRecipAcc === '1000284758657' || tx.senderId === 'user_1' || tx.recipientId === 'user_1');

    if (!isSender && !isRecipient && !isLegacyPrimaryTx) {
      return false;
    }

    // 2. Direction calculation for this active account:
    // If active account received the transfer: CREDIT!
    // If active account sent the transfer: DEBIT!
    const isCredit = (isRecipient && !isSender) ? true : (tx.type === 'receive' || tx.senderName === 'Deposit');
    if (historyFilter === 'debited' && isCredit) return false;
    if (historyFilter === 'credited' && !isCredit) return false;

    // 3. Search query filter
    if (historySearchText.trim()) {
      const query = historySearchText.toLowerCase();
      const matchName = (tx.recipientName || '').toLowerCase().includes(query) || (tx.senderName || '').toLowerCase().includes(query);
      const matchRef = (tx.reference || tx.id || '').toLowerCase().includes(query);
      const matchDesc = (tx.description || '').toLowerCase().includes(query);
      const matchAcc = (tx.recipientAccount || tx.senderAccount || '').toLowerCase().includes(query);
      if (!matchName && !matchRef && !matchDesc && !matchAcc) return false;
    }
    return true;
  });

  // Extract first name for greeting
  const firstName = activeUser.name.split(' ')[0] || 'Leykun';

  return (
    <div 
      className="h-full w-full bg-[#F7F7F7] font-sans relative flex flex-col overflow-hidden text-gray-900 select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* PULL-TO-REFRESH FLOATING PILL INDICATOR */}
      <div 
        className="w-full flex justify-center pointer-events-none transition-all duration-200 ease-out z-50 absolute left-0 right-0 px-4"
        style={{
          top: '12px',
          transform: `translateY(${pullState === 'refreshing' ? 36 : Math.min(pullDistance, 50)}px)`,
          opacity: pullDistance > 6 || pullState === 'refreshing' || pullState === 'success' ? 1 : 0
        }}
      >
        <div className="bg-[#18191c]/95 text-white px-4 py-2 rounded-full shadow-2xl border border-white/20 backdrop-blur-md flex items-center gap-2.5 text-xs font-semibold">
          {pullState === 'refreshing' ? (
            <>
              <RefreshIcon size={16} className="text-[#deb356] animate-spin" />
              <span className="text-[#deb356] tracking-tight">Refreshing wallet balance &amp; status...</span>
            </>
          ) : pullState === 'success' ? (
            <>
              <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
              <span className="text-emerald-400 tracking-tight">Wallet balance &amp; status updated!</span>
            </>
          ) : pullState === 'threshold' ? (
            <>
              <div className="w-4 h-4 text-[#deb356] rotate-180 transition-transform duration-150">
                <RefreshIcon size={16} />
              </div>
              <span className="text-white font-bold tracking-tight">Release to refresh</span>
            </>
          ) : (
            <>
              <div 
                className="w-4 h-4 text-white/80 transition-transform duration-75"
                style={{ transform: `rotate(${Math.min(180, (pullDistance / PULL_THRESHOLD) * 180)}deg)` }}
              >
                <RefreshIcon size={16} />
              </div>
              <span className="text-white/80 tracking-tight">Pull down to refresh</span>
            </>
          )}
        </div>
      </div>
      
      {/* ========================================================
          STATIC / UNSCROLLABLE TOP SECTION (Above Yellow Line)
          Includes Purple Hero Background, Top Header, Black Account Card, and Gold Line
          ======================================================== */}
      <div 
        className="flex-shrink-0 w-full relative z-20 select-none transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${Math.min(pullDistance * 0.35, 24)}px)`
        }}
      >
        {/* HERO BACKGROUND WITH SMOOTH CURVED WAVE TRANSITION */}
        <div 
          className={`hero-background absolute top-0 left-0 right-0 pointer-events-none z-0 overflow-hidden transition-all duration-200 ${
            activeNavTab === 'history' 
              ? 'h-[140px] sm:h-[150px]' 
              : 'h-[280px] sm:h-[300px]'
          }`}
          style={{
            background: 'linear-gradient(135deg, #70189F 0%, #8420AE 55%, #8E29B9 100%)',
          }}
        >
          {/* Soft Ambient Glow Elements */}
          <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute top-20 -right-20 w-80 h-80 rounded-full bg-[#8E29B9]/30 blur-3xl pointer-events-none" />

          {/* SVG Smooth Curved Transition Wave (Purple to #F7F7F7 Page Background) for Home View */}
          {activeNavTab !== 'history' && (
            <svg
              className="hero-curve absolute bottom-0 left-0 w-full h-[140px] sm:h-[160px] text-[#F7F7F7]"
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
              fill="currentColor"
            >
              {/* Preserves the organic curve on the left while leveling into a clean straight horizontal line on the right */}
              <path d="M 0,192 C 140,150 260,155 380,180 C 500,205 600,230 740,220 C 880,210 980,160 1100,160 L 1440,160 L 1440,320 L 0,320 Z" />
            </svg>
          )}
        </div>

        {/* 1. TOP HEADER (Inside Purple Hero Section) */}
        <div className="relative z-10 flex flex-col w-full">
          <Header
            userName={firstName}
            onOpenMenu={() => setActiveModal('menu')}
            onRefresh={handleRefresh}
            onOpenSearch={() => setActiveModal('search')}
            onOpenProfile={() => onNavigateToTab?.('profile')}
            selectedLanguage={selectedLanguage}
            onChangeLanguage={(lang) => setSelectedLanguage(lang)}
            isRefreshing={isRefreshing}
            showProfileIcon={activeNavTab !== 'history'}
          />

          {/* 2. WHITE CONTAINER WITH SYMMETRICAL TOP CURVES ON BOTH SIDES IN TRANSACTION VIEW */}
          <div className={`w-full transition-all duration-200 ${
            activeNavTab === 'history'
              ? 'bg-[#F7F7F7] rounded-t-[28px] sm:rounded-t-[32px] pt-3 sm:pt-3.5 shadow-[-0_-2px_10px_rgba(0,0,0,0.03)] mt-2'
              : 'mt-2 sm:mt-3'
          }`}>
            {/* BLACK ACCOUNT CARD (Floating & Overlapping Curve) */}
            <div className="w-full">
              <AccountCard
                bankName="Commercial Bank of Ethiopia"
                slogan="The bank you can always rely on!"
                balance={activeUser.balance}
                currency={activeUser.currency || 'ETB'}
                accountType={activeUser.accountType === 'checking' ? 'Current Account' : activeUser.accountType === 'cbe_birr' ? 'CBE Birr Wallet' : 'Saving Account'}
                accountNumber={activeUser.accountNumber}
                dateTimeString={currentDateTime}
                showBalanceDefault={false}
                customLogoUrl={customLogoUrl}
              />
            </div>

            {/* 3. STATIC GOLD / YELLOW INDICATOR (Line on Home, Circular Dot on Transactions) */}
            <div 
              className="w-full flex justify-center items-center pt-1.5 pb-2 relative z-20 cursor-pointer active:scale-95 transition-transform"
              onClick={() => setShowRegisteredAccountsModal(true)}
              title="Click to switch registered account"
            >
              <div 
                id="static-gold-indicator-line"
                className={`bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#deb356] rounded-full shadow-[0_1px_2px_rgba(212,175,55,0.3)] transition-all duration-300 ${
                  activeNavTab === 'history'
                    ? 'w-2.5 h-2.5 rounded-full'
                    : 'w-7 h-2 rounded-full'
                }`} 
                title="CBE Section Indicator - Click to switch registered account"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          SCROLLABLE CONTENT AREA (From Yellow Line Downwards)
          ======================================================== */}
      <main ref={mainScrollRef as any} className="flex-1 min-h-0 overflow-y-auto overscroll-contain overflow-x-hidden scrollbar-none relative z-10 w-full pb-6 sm:pb-8">
        {/* DYNAMIC CONTENT UNDER CARD BASED ON ACTIVE TAB */}
        {activeNavTab === 'history' ? (
          /* ========================================================
             TRANSACTION HISTORY SECTION (Matching Exact CBE Layout from Screenshot)
             ======================================================== */
          <div className="w-full max-w-md mx-auto min-h-[460px] pb-8 flex flex-col animate-in fade-in duration-200">
            {/* Sticky Filter Tabs & Search Icon Row with perfectly equal spacing across all 4 items */}
            <div className="sticky top-0 z-20 bg-[#F7F7F7] w-full px-2 sm:px-3 pt-3.5 pb-2 border-b border-gray-200/40">
              <div className="grid grid-cols-4 items-center">
                {/* 1. All */}
                <button
                  id="tab-history-all"
                  type="button"
                  onClick={() => setHistoryFilter('all')}
                  className="flex flex-col items-center justify-center cursor-pointer group focus:outline-none select-none w-full"
                >
                  <span className={`text-[13.5px] transition-colors ${
                    historyFilter === 'all'
                      ? 'text-[#70189f] font-bold'
                      : 'text-[#64748b] font-medium hover:text-[#70189f]'
                  }`}>
                    All
                  </span>
                  {historyFilter === 'all' ? (
                    <div className="w-7 h-[3px] bg-[#70189f] rounded-full mt-1 animate-in fade-in duration-150" />
                  ) : (
                    <div className="w-7 h-[3px] bg-transparent mt-1" />
                  )}
                </button>

                {/* 2. Debited */}
                <button
                  id="tab-history-debited"
                  type="button"
                  onClick={() => setHistoryFilter('debited')}
                  className="flex flex-col items-center justify-center cursor-pointer group focus:outline-none select-none w-full"
                >
                  <span className={`text-[13.5px] transition-colors ${
                    historyFilter === 'debited'
                      ? 'text-[#70189f] font-bold'
                      : 'text-[#64748b] font-medium hover:text-[#70189f]'
                  }`}>
                    Debited
                  </span>
                  {historyFilter === 'debited' ? (
                    <div className="w-14 h-[3px] bg-[#70189f] rounded-full mt-1 animate-in fade-in duration-150" />
                  ) : (
                    <div className="w-14 h-[3px] bg-transparent mt-1" />
                  )}
                </button>

                {/* 3. Credited */}
                <button
                  id="tab-history-credited"
                  type="button"
                  onClick={() => setHistoryFilter('credited')}
                  className="flex flex-col items-center justify-center cursor-pointer group focus:outline-none select-none w-full"
                >
                  <span className={`text-[13.5px] transition-colors ${
                    historyFilter === 'credited'
                      ? 'text-[#70189f] font-bold'
                      : 'text-[#64748b] font-medium hover:text-[#70189f]'
                  }`}>
                    Credited
                  </span>
                  {historyFilter === 'credited' ? (
                    <div className="w-14 h-[3px] bg-[#70189f] rounded-full mt-1 animate-in fade-in duration-150" />
                  ) : (
                    <div className="w-14 h-[3px] bg-transparent mt-1" />
                  )}
                </button>

                {/* 4. Search Icon */}
                <div className="flex flex-col items-center justify-center w-full">
                  <button
                    id="btn-history-search-toggle"
                    type="button"
                    aria-label="Toggle Search"
                    onClick={() => setIsHistorySearchOpen(!isHistorySearchOpen)}
                    className={`p-1.5 rounded-full transition-colors cursor-pointer select-none focus:outline-none ${
                      isHistorySearchOpen ? 'bg-purple-100 text-[#70189f]' : 'text-[#70189f] hover:bg-purple-50'
                    }`}
                  >
                    <Search className="w-4.5 h-4.5 stroke-[2.4]" />
                  </button>
                  {/* Invisible spacer to maintain identical vertical rhythm with the tab indicator underlines */}
                  <div className="h-[3px] mt-1" />
                </div>
              </div>
            </div>

            {/* Optional Search bar */}
            {isHistorySearchOpen && (
              <div className="px-4 mt-2.5 mb-2 relative animate-in fade-in slide-in-from-top-1 duration-150">
                <input
                  type="text"
                  placeholder="Search by name, account, or ref..."
                  value={historySearchText}
                  onChange={(e) => setHistorySearchText(e.target.value)}
                  autoFocus
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#70189f] shadow-xs"
                />
                {historySearchText && (
                  <button
                    type="button"
                    onClick={() => setHistorySearchText('')}
                    className="absolute right-6 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Discrete Transaction Cards List */}
            <div className="px-4 pt-2.5 flex flex-col space-y-2.5">
              {filteredHistoryTransactions.length === 0 ? (
                <div className="py-14 text-center text-xs text-gray-400 bg-white rounded-2xl border border-gray-100 p-6 shadow-xs">
                  No transactions found.
                </div>
              ) : (
                filteredHistoryTransactions.map((tx) => {
                  const cleanUserAcc = (activeUser.accountNumber || '').replace(/\D/g, '');
                  const cleanRecipAcc = (tx.recipientAccount || '').replace(/\D/g, '');
                  const cleanSenderAcc = (tx.senderAccount || '').replace(/\D/g, '');

                  const isSender = (cleanSenderAcc && cleanSenderAcc === cleanUserAcc) || (tx.senderId && tx.senderId === activeUser.id);
                  const isRecipient = (cleanRecipAcc && cleanRecipAcc === cleanUserAcc) || (tx.recipientId && tx.recipientId === activeUser.id);
                  const isCredit = (isRecipient && !isSender) ? true : (tx.type === 'receive' || tx.senderName === 'Deposit');

                  const displayName = isCredit 
                    ? (tx.senderName || 'Deposit') 
                    : (tx.recipientName || 'CBE Transfer');
                  const categoryTag = getCbeCategory(tx);
                  const formattedDate = formatCbeHistoryDate(tx.createdAt);

                  return (
                    <div
                      key={tx.id}
                      id={`tx-item-${tx.id}`}
                      onClick={() => setSelectedDetailTx(tx)}
                      className="bg-white rounded-2xl p-2.5 sm:p-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)] border border-gray-100/90 flex items-center justify-between hover:border-purple-200 active:scale-[0.99] transition-all cursor-pointer select-none group"
                    >
                      {/* Left: Direction Circular Badge + Title + Timestamp */}
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 mr-2">
                        {/* Directional Circular Icon (Green arrow down for credit, Red arrow up for debit) */}
                        <div className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isCredit ? 'bg-[#e8f7ee] text-[#16a34a]' : 'bg-[#feecee] text-[#ef4444]'
                        }`}>
                          {isCredit ? (
                            <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                          ) : (
                            <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                          )}
                        </div>

                        {/* Title and Date */}
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-[#2d0938] text-[11px] sm:text-[11.5px] leading-snug truncate group-hover:text-[#70189f] transition-colors">
                            {displayName}
                          </span>
                          <span className="text-[9px] sm:text-[9.5px] text-gray-400 font-normal leading-tight mt-0.5">
                            {formattedDate}
                          </span>
                        </div>
                      </div>

                      {/* Right: Amount + Category Pill Badge */}
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className={`text-[11px] sm:text-[11.5px] font-bold tracking-tight text-right ${
                          isCredit ? 'text-[#16a34a]' : 'text-gray-900'
                        }`}>
                          {isCredit ? '+' : '-'}{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                        </span>

                        <span className="bg-[#f5eef8] text-[#70189f] px-1.5 py-0.5 rounded-full text-[7.5px] sm:text-[8px] font-bold uppercase tracking-wider mt-0.5 text-right inline-block whitespace-nowrap">
                          {categoryTag}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* ========================================================
             HOME MAIN SERVICE BUTTONS & QUICK ACTIONS
             ======================================================== */
          <>
            {/* 3. FOUR CIRCULAR QUICK ACTION BUTTONS */}
            <QuickActions onActionClick={handleQuickAction} />

            {/* 4. MAIN TWO-COLUMN SERVICE GRID */}
            <ServiceGrid onServiceSelect={handleServiceSelect} />
          </>
        )}
      </main>

      {/* ========================================================
          5. FIXED BOTTOM NAVIGATION BAR (Scan QR floating + Home, Transaction, Setting)
          ======================================================== */}
      <BottomNavigation
        activeTab={activeNavTab}
        onChangeTab={handleNavTabChange}
        onOpenScanQr={() => setActiveModal('qr')}
        showScanQr={activeNavTab === 'home' && !selectedDetailTx && !activeModal}
      />

      {/* ========================================================
          INTERACTIVE DEMO MODALS
          ======================================================== */}

      {/* QR SCANNER & GENERATOR MODAL */}
      {activeModal === 'qr' && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#711A9F] flex items-center justify-center mx-auto mb-3">
                <Scan className="w-7 h-7 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">CBE QR Scanner</h3>
              <p className="text-xs text-gray-500 mt-1">Scan any CBE Merchant or Person QR code to pay instantly.</p>
            </div>

            {/* Simulated Camera Viewfinder */}
            <div className="mt-4 w-full h-52 bg-slate-950 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center border-2 border-[#711A9F]">
              <div className="absolute inset-4 border-2 border-dashed border-white/60 rounded-xl pointer-events-none" />
              <div className="w-full h-0.5 bg-purple-400 absolute top-1/2 animate-pulse" />
              
              <p className="text-[11px] text-white/80 z-10 px-4 text-center">
                Point camera at CBE QR Code
              </p>

              <button
                onClick={() => {
                  setQrScanSuccess(true);
                  setTimeout(() => {
                    setQrScanSuccess(false);
                    setActiveModal(null);
                    onNavigateToTab?.('transfer', 'transfer');
                  }, 1200);
                }}
                className="mt-3 bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-1.5 px-4 rounded-xl backdrop-blur-sm border border-white/30 transition cursor-pointer"
              >
                {qrScanSuccess ? 'QR Recognized!' : 'Simulate Scan'}
              </button>
            </div>

            {/* My QR Code Tab */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#711A9F]" />
                <span className="font-semibold">My Account: {activeUser.accountNumber.slice(-4)}</span>
              </div>
              <button 
                onClick={() => setActiveModal('receive')} 
                className="text-[#711A9F] font-bold hover:underline cursor-pointer"
              >
                Show My QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH MODAL */}
      {activeModal === 'search' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center p-4 pt-12 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#711A9F]" />
                <span>Search Banking Services</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 relative">
              <input
                type="text"
                placeholder="Search registered accounts, transfer, bill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-2.5 pl-4 pr-10 text-xs font-semibold focus:outline-none focus:border-[#711A9F] focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Quick Shortcuts</p>
              {[
                { name: 'Send Money to CBE Account', tab: 'transfer', sub: 'send' },
                { name: 'Pay Ethio Telecom / Internet', tab: 'payments', sub: '' },
                { name: 'View Mini Statement', modal: 'ministatement' },
                { name: 'CBE Birr Wallet Transfer', tab: 'transfer', sub: 'transfer' },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveModal(null);
                    if (item.tab) onNavigateToTab?.(item.tab as any, item.sub);
                    else if (item.modal) setActiveModal(item.modal as any);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-purple-50 text-left text-xs font-semibold text-gray-800 flex items-center justify-between transition cursor-pointer"
                >
                  <span>{item.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* APP MENU MODAL */}
      {activeModal === 'menu' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-[#711A9F]">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">CBE Digital Portal</h3>
                  <p className="text-[11px] text-gray-500">Commercial Bank of Ethiopia</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  setActiveModal(null);
                  onNavigateToTab?.('history');
                }}
                className="p-3 bg-gray-50 hover:bg-purple-50 rounded-2xl text-left transition cursor-pointer"
              >
                <Receipt className="w-5 h-5 text-[#711A9F] mb-1.5" />
                <p className="text-xs font-bold text-gray-900">Statements</p>
                <p className="text-[10px] text-gray-500">Account logs</p>
              </button>

              <button
                onClick={() => {
                  setActiveModal(null);
                  setActiveModal('cards');
                }}
                className="p-3 bg-gray-50 hover:bg-purple-50 rounded-2xl text-left transition cursor-pointer"
              >
                <CardsIcon size={20} className="text-[#711A9F] mb-1.5" />
                <p className="text-xs font-bold text-gray-900">My Cards</p>
                <p className="text-[10px] text-gray-500">Debit &amp; ATM</p>
              </button>

              <button
                onClick={() => {
                  setActiveModal(null);
                  onNavigateToTab?.('profile');
                }}
                className="p-3 bg-gray-50 hover:bg-purple-50 rounded-2xl text-left transition cursor-pointer"
              >
                <ShieldCheck className="w-5 h-5 text-[#711A9F] mb-1.5" />
                <p className="text-xs font-bold text-gray-900">Security</p>
                <p className="text-[10px] text-gray-500">PIN &amp; Profile</p>
              </button>

              <button
                onClick={() => {
                  setActiveModal(null);
                  if (onOpenSmsSimulator) {
                    onOpenSmsSimulator();
                  } else {
                    onNavigateToTab?.('profile');
                  }
                }}
                className="p-3 bg-purple-50 hover:bg-purple-100/80 rounded-2xl text-left transition cursor-pointer border border-purple-100"
              >
                <MessageSquare className="w-5 h-5 text-[#711A9F] mb-1.5" />
                <p className="text-xs font-bold text-purple-950">SMS Simulator</p>
                <p className="text-[10px] text-purple-700">CBE Alert Messages</p>
              </button>

              <button
                onClick={() => {
                  setActiveModal(null);
                  if (onOpenTruecallerSimulator) {
                    onOpenTruecallerSimulator();
                  } else {
                    onNavigateToTab?.('profile');
                  }
                }}
                className="p-3 bg-blue-50 hover:bg-blue-100/80 rounded-2xl text-left transition cursor-pointer border border-blue-100"
              >
                <Smartphone className="w-5 h-5 text-[#0066FF] mb-1.5" />
                <p className="text-xs font-bold text-blue-950">Truecaller Alert</p>
                <p className="text-[10px] text-blue-700">Screen Takeover</p>
              </button>

              <button
                onClick={() => {
                  setActiveModal(null);
                  if (onOpenPhoneApp) {
                    onOpenPhoneApp();
                  } else {
                    onNavigateToTab?.('profile');
                  }
                }}
                className="p-3 bg-emerald-50 hover:bg-emerald-100/80 rounded-2xl text-left transition cursor-pointer border border-emerald-100"
              >
                <PhoneCall className="w-5 h-5 text-emerald-600 mb-1.5" />
                <p className="text-xs font-bold text-emerald-950">Phone &amp; USSD</p>
                <p className="text-[10px] text-emerald-700">*889# Mobile Banking</p>
              </button>

              <button
                onClick={() => {
                  setActiveModal(null);
                  if (onOpenDashenApp) {
                    onOpenDashenApp();
                  } else {
                    try {
                      window.history.pushState({ view: 'dashen' }, '', '/dashen');
                      window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'dashen' } }));
                    } catch {}
                  }
                }}
                className="p-3 bg-blue-50 hover:bg-blue-100/80 rounded-2xl text-left transition cursor-pointer border border-blue-200"
              >
                <div className="w-5 h-5 bg-[#0c1e3f] rounded-lg text-white flex flex-col items-center justify-center mb-1.5">
                  <span className="text-[6px] font-bold">ዳሽን</span>
                </div>
                <p className="text-xs font-bold text-blue-950">Dashen Bank</p>
                <p className="text-[10px] text-blue-700">Super App &amp; Transfer</p>
              </button>

              <button
                onClick={() => {
                  setActiveModal(null);
                  if (onOpenTelebirrApp) {
                    onOpenTelebirrApp();
                  } else {
                    try {
                      window.history.pushState({ view: 'telebirr' }, '', '/telebirr');
                      window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'telebirr' } }));
                    } catch {}
                  }
                }}
                className="p-3 bg-lime-50 hover:bg-lime-100/80 rounded-2xl text-left transition cursor-pointer border border-lime-200"
              >
                <div className="w-5 h-5 bg-gradient-to-br from-[#5cb82e] to-[#0085ca] rounded-lg text-white flex flex-col items-center justify-center mb-1.5 shadow-xs">
                  <span className="text-[7px] font-black">t</span>
                </div>
                <p className="text-xs font-bold text-lime-950">Telebirr App</p>
                <p className="text-[10px] text-lime-700">Transfer &amp; 41,865 ETB</p>
              </button>

              <button
                onClick={() => {
                  setActiveModal(null);
                  if (onOpenTelegramSimulator) {
                    onOpenTelegramSimulator();
                  } else {
                    try {
                      window.history.pushState({ view: 'telegram' }, '', '/telegram');
                      window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'telegram' } }));
                    } catch {}
                  }
                }}
                className="p-3 bg-sky-50 hover:bg-sky-100/80 rounded-2xl text-left transition cursor-pointer border border-sky-200"
              >
                <div className="w-5 h-5 bg-[#229ED9] rounded-lg text-white flex items-center justify-center mb-1.5 shadow-xs">
                  <MessageSquare className="w-3 h-3 text-white" />
                </div>
                <p className="text-xs font-bold text-sky-950">Telegram Simulator</p>
                <p className="text-[10px] text-sky-700">Mockup Chat Designer</p>
              </button>

              {onOpenAdmin && (
                <button
                  onClick={() => {
                    setActiveModal(null);
                    onOpenAdmin();
                  }}
                  className="p-3 bg-amber-50 hover:bg-amber-100/80 rounded-2xl text-left transition cursor-pointer border border-amber-200"
                >
                  <Sparkles className="w-5 h-5 text-amber-600 mb-1.5" />
                  <p className="text-xs font-bold text-amber-900">Admin Hub</p>
                  <p className="text-[10px] text-amber-700">Manage Branding</p>
                </button>
              )}

              <button
                onClick={() => {
                  setActiveModal(null);
                  setShowRegisteredAccountsModal(true);
                }}
                className="p-3 bg-purple-50 hover:bg-purple-100/80 rounded-2xl text-left transition cursor-pointer border border-purple-200 col-span-2 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[#70189F] text-amber-300 rounded-xl">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-purple-950">Switch Active Account</p>
                    <p className="text-[10px] text-purple-700">Switch to any registered account &amp; view its transactions</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-900" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MINI STATEMENT MODAL */}
      {activeModal === 'ministatement' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">Mini Statement</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-2.5 border-b border-gray-100 text-xs flex justify-between items-center text-gray-600">
              <span>A/C: {activeUser.accountNumber}</span>
              <span className="font-bold text-[#711A9F]">{activeUser.balance.toLocaleString()} ETB</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 my-2">
              {recentTransactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">No recent transactions recorded.</div>
              ) : (
                recentTransactions.map((tx, index) => (
                  <div 
                    key={tx.id} 
                    onClick={() => {
                      setActiveModal(null);
                      setSelectedDetailTx(tx);
                    }}
                    className="py-2.5 px-1 flex items-center justify-between hover:bg-gray-50 rounded-xl transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        tx.senderId === activeUser.id ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {tx.senderId === activeUser.id ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          {index < 2 && (
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full bg-purple-100 text-[#711A9F] border border-purple-200">
                              Recent
                            </span>
                          )}
                          <p className="text-xs font-bold text-gray-900 truncate max-w-[140px]">{tx.recipientName || 'CBE Transfer'}</p>
                        </div>
                        <p className="text-[10px] text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-extrabold ${tx.senderId === activeUser.id ? 'text-red-600' : 'text-emerald-600'}`}>
                        {tx.senderId === activeUser.id ? '-' : '+'}{tx.amount.toLocaleString()} ETB
                      </p>
                      <p className="text-[9px] text-gray-400 uppercase font-mono">{(tx.reference || tx.id).slice(-6)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => {
                setActiveModal(null);
                onNavigateToTab?.('history');
              }}
              className="w-full bg-[#711A9F] text-white text-xs font-bold py-2.5 rounded-xl hover:bg-[#8A24B6] transition mt-2 cursor-pointer"
            >
              View Full Statement History
            </button>
          </div>
        </div>
      )}

      {/* CASH OUT MODAL */}
      {activeModal === 'cashout' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">Cash Out Service</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100">
                <p className="text-xs font-bold text-[#711A9F]">1. ATM Cardless Withdrawal</p>
                <p className="text-[11px] text-gray-600 mt-1">Generate a secure 6-digit OTP code to withdraw cash directly at any CBE ATM.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="text-xs font-bold text-gray-800">2. CBE Agent Branch Cash Out</p>
                <p className="text-[11px] text-gray-600 mt-1">Withdraw cash at authorized Commercial Bank of Ethiopia agents nationwide.</p>
              </div>
              <button
                onClick={() => {
                  alert('Generated ATM Cardless Code: 839201 (Valid for 15 minutes)');
                  setActiveModal(null);
                }}
                className="w-full bg-[#711A9F] text-white text-xs font-bold py-2.5 rounded-xl hover:bg-[#8A24B6] transition cursor-pointer"
              >
                Generate ATM OTP Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CARDS MODAL */}
      {activeModal === 'cards' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">My CBE Debit Cards</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 p-5 rounded-2xl bg-gradient-to-tr from-slate-900 to-purple-950 text-white shadow-lg relative overflow-hidden">
              <div className="flex justify-between items-center text-xs font-mono text-purple-200">
                <span>CBE Gold Card</span>
                <span>DEBIT</span>
              </div>
              <p className="text-base font-mono tracking-widest my-4">•••• •••• •••• 8657</p>
              <div className="flex justify-between items-end text-[11px]">
                <div>
                  <span className="text-gray-400 text-[9px] block">CARD HOLDER</span>
                  <span className="font-bold uppercase">{activeUser.name}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[9px] block">EXPIRES</span>
                  <span className="font-bold">08/29</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => alert('Card status: Active. Daily ATM limit: 10,000 ETB')}
                className="flex-1 bg-gray-100 text-gray-800 text-xs font-bold py-2.5 rounded-xl hover:bg-gray-200 transition cursor-pointer"
              >
                Manage Limits
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 bg-[#711A9F] text-white text-xs font-bold py-2.5 rounded-xl hover:bg-[#8A24B6] transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BILL SHARE MODAL */}
      {activeModal === 'billshare' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">CBE Bill Share</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <p className="text-xs text-gray-600">Split group expenses, dinner bills, or rent with your contacts easily.</p>
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <label className="text-[11px] font-bold text-gray-500 block mb-1">Total Amount (ETB)</label>
                <input
                  type="number"
                  placeholder="e.g. 1500"
                  defaultValue="1200"
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>
              <button
                onClick={() => {
                  alert('Bill share link generated and copied!');
                  setActiveModal(null);
                }}
                className="w-full bg-[#711A9F] text-white text-xs font-bold py-2.5 rounded-xl hover:bg-[#8A24B6] transition cursor-pointer"
              >
                Create Split Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULES MODAL */}
      {activeModal === 'schedules' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-sm text-gray-900">Scheduled Payments</h3>
                <p className="text-[11px] text-gray-500">Automated recurring transfers & standing orders</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 my-3">
              {[
                { title: 'Monthly House Rent', recipient: 'Kasahun Yematawork (1000345678901)', amount: '15,000.00 ETB', freq: 'Monthly on 1st', active: true },
                { title: 'Fiber Internet Fee', recipient: 'Ethio Telecom (B-894102)', amount: '1,200.00 ETB', freq: 'Monthly on 25th', active: true },
                { title: 'Water & Utility Bill', recipient: 'Addis Ababa Water Board', amount: '450.00 ETB', freq: 'Monthly on 15th', active: true }
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-900">{item.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{item.recipient}</p>
                    <span className="text-[9px] bg-purple-100 text-[#70189F] font-extrabold px-1.5 py-0.5 rounded-md mt-1 inline-block">
                      {item.freq}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-gray-900">{item.amount}</p>
                    <span className="text-[9px] text-emerald-600 font-bold">Active</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                alert('Scheduled payment creator opened.');
                setActiveModal(null);
                onNavigateToTab?.('transfer', 'send');
              }}
              className="w-full bg-[#711A9F] text-white text-xs font-bold py-2.5 rounded-xl hover:bg-[#8A24B6] transition cursor-pointer"
            >
              + Create New Scheduled Payment
            </button>
          </div>
        </div>
      )}

      {/* RECEIVE QR & ACCOUNT MODAL */}
      {activeModal === 'receive' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl relative text-center">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">Receive Money</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="my-4 p-4 bg-purple-50 rounded-2xl border border-purple-100 inline-block">
              {/* QR Code Placeholder Graphic */}
              <div className="w-44 h-44 bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs mx-auto flex items-center justify-center">
                <QrCode className="w-36 h-36 text-[#711A9F]" />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-900">{activeUser.name}</p>
              <p className="text-xs font-mono text-[#711A9F] font-bold">A/C: {activeUser.accountNumber}</p>
              <p className="text-[11px] text-gray-400">Commercial Bank of Ethiopia</p>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(activeUser.accountNumber);
                alert('Account number copied to clipboard!');
              }}
              className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <CopyIcon size={16} />
              <span>Copy Account Details</span>
            </button>
          </div>
        </div>
      )}

      {/* CBE BIRR MODAL */}
      {activeModal === 'cbebirr' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">CBEBirr Wallet</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-800">Linked CBEBirr Mobile</p>
                  <p className="text-xs font-mono text-[#711A9F] font-bold">{activeUser.phone || '+251 91 123 4567'}</p>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">Linked</span>
              </div>
              <button
                onClick={() => {
                  setActiveModal(null);
                  onNavigateToTab?.('transfer', 'transfer');
                }}
                className="w-full bg-[#711A9F] text-white text-xs font-bold py-2.5 rounded-xl hover:bg-[#8A24B6] transition cursor-pointer"
              >
                Transfer to CBEBirr Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTHER TRANSFERS MODAL */}
      {activeModal === 'other-transfers' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">Other Bank Transfers</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {['Awash Bank', 'Dashen Bank', 'Bank of Abyssinia', 'Telebirr', 'Nib International Bank'].map((b, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveModal(null);
                    onNavigateToTab?.('transfer', 'send');
                  }}
                  className="w-full p-2.5 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 text-left text-xs font-bold text-gray-800 flex items-center justify-between transition cursor-pointer"
                >
                  <span>{b}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BANKING MODAL */}
      {activeModal === 'banking' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">Banking Services</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {['Cheque Book Request', 'Standing Orders', 'Account Statement (PDF)', 'Overdraft & Credit Inquiry', 'Fixed Time Deposit'].map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    alert(`${item} service selected. Connecting to CBE Core Banking...`);
                    setActiveModal(null);
                  }}
                  className="w-full p-2.5 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 text-left text-xs font-bold text-gray-800 flex items-center justify-between transition cursor-pointer"
                >
                  <span>{item}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GOVERNMENT SERVICES MODAL */}
      {activeModal === 'government-services' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">Government Services</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {['Immigration & Passport (INVEA)', 'Fayda National ID Payment', 'Traffic Penalty & Fine Pay', 'Trade License Renewal', 'Land Administration & Lease'].map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    alert(`${item} payment portal ready.`);
                    setActiveModal(null);
                  }}
                  className="w-full p-2.5 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 text-left text-xs font-bold text-gray-800 flex items-center justify-between transition cursor-pointer"
                >
                  <span>{item}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PAY TO MERCHANT MODAL */}
      {activeModal === 'pay-merchant' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">Pay to Merchant</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">Merchant Till / Code</label>
                <input
                  type="text"
                  placeholder="Enter 6-digit Merchant ID"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-900 outline-none focus:border-[#711A9F]"
                />
              </div>
              <button
                onClick={() => {
                  setActiveModal(null);
                  onNavigateToTab?.('transfer', 'send');
                }}
                className="w-full bg-[#711A9F] text-white text-xs font-bold py-2.5 rounded-xl hover:bg-[#8A24B6] transition cursor-pointer"
              >
                Proceed to Pay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRAVEL MODAL */}
      {activeModal === 'travel' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">Travel & Transport</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {['Ethiopian Airlines Tickets', 'Selam Bus / Abay Bus', 'Ride & Feres Transport', 'Fuel & Gas Station Pay', 'Light Rail Transit'].map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    alert(`Selected ${item}`);
                    setActiveModal(null);
                  }}
                  className="w-full p-2.5 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 text-left text-xs font-bold text-gray-800 flex items-center justify-between transition cursor-pointer"
                >
                  <span>{item}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SHOPPING MODAL */}
      {activeModal === 'shopping' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">Shopping & Retail</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {['Supermarkets & Groceries', 'Electronics & Appliances', 'Fashion & Apparel', 'Pharmacies & Health', 'Online Marketplaces'].map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    alert(`Opening ${item} payment directory...`);
                    setActiveModal(null);
                  }}
                  className="w-full p-2.5 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 text-left text-xs font-bold text-gray-800 flex items-center justify-between transition cursor-pointer"
                >
                  <span>{item}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ENTERTAINMENT MODAL */}
      {activeModal === 'entertainment' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">Entertainment</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {['DSTV Ethiopia Subscription', 'Canal+ Ethiopia Package', 'Cinema & Movie Tickets', 'Events & Concert Tickets', 'Streaming & Gaming'].map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    alert(`Selected ${item}`);
                    setActiveModal(null);
                  }}
                  className="w-full p-2.5 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 text-left text-xs font-bold text-gray-800 flex items-center justify-between transition cursor-pointer"
                >
                  <span>{item}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAX PAYMENT MODAL */}
      {activeModal === 'tax-payment' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">Tax Payment (Ministry of Revenues)</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {['Ministry of Revenues (e-Tax Payment)', 'Customs Duty & ERCA', 'City Government Tax (Addis Ababa)', 'Withholding Tax (WHT)', 'Business Income Tax'].map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    alert(`Ready to pay for ${item}`);
                    setActiveModal(null);
                  }}
                  className="w-full p-2.5 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 text-left text-xs font-bold text-gray-800 flex items-center justify-between transition cursor-pointer"
                >
                  <span>{item}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION DETAIL MODAL (Matching Authentic CBE Layout from reference) */}
      {selectedDetailTx && (
        <TransactionDetailModal
          transaction={selectedDetailTx}
          onClose={() => setSelectedDetailTx(null)}
          onViewReceipt={(tx) => {
            setSelectedDetailTx(null);
            onSelectTransaction?.(tx);
          }}
          currentUserId={activeUser.id}
          currentUserAccount={activeUser.accountNumber}
        />
      )}

      {/* REGISTERED ACCOUNTS DIRECTORY & ACCOUNT SWITCHER MODAL */}
      <RegisteredAccountsModal
        isOpen={showRegisteredAccountsModal}
        onClose={() => setShowRegisteredAccountsModal(false)}
        onSelect={handleSwitchRegisteredAccount}
        currentSelectedAccount={activeUser.accountNumber}
        title="Switch Registered Account"
      />

    </div>
  );
};

export default Home;

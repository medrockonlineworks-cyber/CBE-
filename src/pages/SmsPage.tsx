import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, 
  MoreVertical, 
  User, 
  ArrowDown, 
  Check, 
  Landmark, 
  CreditCard, 
  Trash2, 
  CheckCheck, 
  Plus, 
  ExternalLink,
  Wifi,
  Battery,
  ShieldCheck,
  X,
  Sun,
  Moon,
  Smartphone,
  Clock,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { SmsMessage, SmsAccount } from '../types/sms';
import PhoneSettingsModal from '../components/PhoneSettingsModal';
import { 
  SmsService, 
  maskAccountNumber, 
  formatSmsThreadTime, 
  formatBubbleTime,
  AccountGroupSection,
  AccountTimeMeta
} from '../services/smsService';
import { LocalDb } from '../lib/mockData';
import GoogleMessagesInbox from '../components/GoogleMessagesInbox';
import GoogleMessagesThread from '../components/GoogleMessagesThread';
import AppleMessagesInbox from '../components/AppleMessagesInbox';
import AppleMessagesThread from '../components/AppleMessagesThread';
import { PhoneSettingsService } from '../services/phoneSettingsService';
import { MessageThread } from '../types/messages';
import { GoogleMessagesService } from '../services/googleMessagesData';
import { CbeWebReceiptModal } from '../components/CbeWebReceiptModal';
import { CbeHolidayCardModal } from '../components/CbeHolidayCardModal';

interface SmsPageProps {
  onBack: () => void;
  accountId?: string;
}

export default function SmsPage({ onBack, accountId: initialAccountId }: SmsPageProps) {
  // Navigation View State: 'inbox' (Google Messages list) | 'cbe' | 'generic_thread'
  const [pageView, setPageView] = useState<'inbox' | 'cbe' | 'generic_thread'>('inbox');
  const [selectedGenericThread, setSelectedGenericThread] = useState<MessageThread | null>(null);
  const [threads, setThreads] = useState<MessageThread[]>(() => GoogleMessagesService.getThreads());

  const refreshThreads = () => {
    setThreads(GoogleMessagesService.getThreads());
  };

  // Accounts and active account state
  const [accounts, setAccounts] = useState<SmsAccount[]>(() => SmsService.getAccounts());
  const [activeAccountNum, setActiveAccountNum] = useState<string>(() => {
    return initialAccountId || SmsService.getActiveAccountNumber();
  });

  const [messages, setMessages] = useState<SmsMessage[]>(() => {
    const acc = initialAccountId || SmsService.getActiveAccountNumber();
    return SmsService.getSmsMessages(acc);
  });
  const [showPhoneSettingsModal, setShowPhoneSettingsModal] = useState<boolean>(false);
  const [isIPhone, setIsIPhone] = useState<boolean>(() => PhoneSettingsService.isIPhoneMode());

  useEffect(() => {
    return PhoneSettingsService.subscribe(() => {
      setIsIPhone(PhoneSettingsService.isIPhoneMode());
    });
  }, []);

  // Theme State (Persisted in localStorage, defaults to dark)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('sms_theme');
      return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  const isDarkMode = theme === 'dark';

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('sms_theme', nextTheme);
    } catch {
      // ignore
    }
  };

  // UI States
  const [showMenu, setShowMenu] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState<SmsMessage | null>(null);
  const [showHolidayCardModal, setShowHolidayCardModal] = useState<boolean>(false);
  const [customAccInput, setCustomAccInput] = useState('');
  const [customNameInput, setCustomNameInput] = useState('');
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [recentFirst, setRecentFirst] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeAccountNumRef = useRef(activeAccountNum);
  useEffect(() => {
    activeAccountNumRef.current = activeAccountNum;
  }, [activeAccountNum]);

  // Sync with available banking accounts in LocalDb
  const refreshAccounts = useCallback(() => {
    try {
      const registered = LocalDb.getAllRegisteredAccounts();
      if (Array.isArray(registered)) {
        const batch = registered
          .filter(r => r && r.accountNumber)
          .map(r => ({
            accountNumber: r.accountNumber,
            accountName: r.accountName,
            balance: r.balance
          }));
        SmsService.ensureAccountsBatch(batch);
      }
    } catch {
      // Non-blocking fallback
    }
    const updatedAccs = SmsService.getAccounts();
    setAccounts(updatedAccs || []);
  }, []);

  // Reload current account's messages
  const reloadMessages = useCallback((accountNum: string) => {
    if (!accountNum) return;
    const msgs = SmsService.getSmsMessages(accountNum);
    setMessages(msgs || []);
  }, []);

  // Listen to SMS updates, account changes, and transactions
  useEffect(() => {
    if (initialAccountId && initialAccountId !== activeAccountNum) {
      setActiveAccountNum(initialAccountId);
      SmsService.setActiveAccountNumber(initialAccountId);
      reloadMessages(initialAccountId);
    }
  }, [initialAccountId, activeAccountNum, reloadMessages]);

  // Selection and chat handlers for Google Messages
  const handleSelectThread = (thread: MessageThread) => {
    if (!thread) return;
    if (thread.isCbe || thread.id === 'CBE' || thread.sender === 'CBE') {
      setPageView('cbe');
    } else {
      setSelectedGenericThread(thread);
      setPageView('generic_thread');
    }
  };

  const handleStartChat = (recipient: string, message: string) => {
    const newThread = GoogleMessagesService.startNewThread(recipient, message);
    refreshThreads();
    setSelectedGenericThread(newThread);
    setPageView('generic_thread');
  };

  // Mount-only event listener registration
  useEffect(() => {
    refreshAccounts();
    reloadMessages(activeAccountNumRef.current);
    refreshThreads();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleSmsUpdated = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        reloadMessages(activeAccountNumRef.current);
        setAccounts(SmsService.getAccounts() || []);
        refreshThreads();
      }, 50);
    };

    const handleActiveAccChanged = (e: CustomEvent<string>) => {
      if (e.detail && e.detail !== activeAccountNumRef.current) {
        setActiveAccountNum(e.detail);
        reloadMessages(e.detail);
        refreshThreads();
      }
    };

    window.addEventListener('sms-updated', handleSmsUpdated);
    window.addEventListener('sms-created', handleSmsUpdated);
    window.addEventListener('sms-accounts-updated', handleSmsUpdated);
    window.addEventListener('sms-active-account-changed', handleActiveAccChanged as EventListener);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('sms-updated', handleSmsUpdated);
      window.removeEventListener('sms-created', handleSmsUpdated);
      window.removeEventListener('sms-accounts-updated', handleSmsUpdated);
      window.removeEventListener('sms-active-account-changed', handleActiveAccChanged as EventListener);
    };
  }, [refreshAccounts, reloadMessages]);

  // Support mobile navigation bar Back button
  useEffect(() => {
    const handlePhoneBack = () => {
      if (showReceiptModal) {
        setShowReceiptModal(null);
      } else if (showHolidayCardModal) {
        setShowHolidayCardModal(false);
      } else if (showAccountModal) {
        setShowAccountModal(false);
      } else if (pageView !== 'inbox') {
        refreshThreads();
        setPageView('inbox');
      } else {
        onBack();
      }
    };
    window.addEventListener('cbe_phone_back', handlePhoneBack);
    return () => window.removeEventListener('cbe_phone_back', handlePhoneBack);
  }, [pageView, showReceiptModal, showHolidayCardModal, showAccountModal, onBack]);

  // Current active account details
  const activeAccount = useMemo(() => {
    return (accounts || []).find(a => a && a.accountNumber === activeAccountNum) || {
      accountNumber: activeAccountNum || '1000419524747',
      accountName: 'Leykun Jemaneh Ylma',
      bankName: 'Commercial Bank of Ethiopia',
      balance: 1859.47,
      lastUpdated: new Date().toISOString()
    };
  }, [accounts, activeAccountNum]);

  // Group accounts according to transaction days: Recent (with Now for latest), Yesterday, Last week, Last month
  const groupedSections = useMemo(() => {
    return SmsService.getGroupedAccounts();
  }, [accounts, messages]);

  // Switch active account
  const handleSelectAccount = (accNum: string) => {
    SmsService.setActiveAccountNumber(accNum);
    setActiveAccountNum(accNum);
    reloadMessages(accNum);
    setShowMenu(false);
    setShowAccountModal(false);

    try {
      const cleanNum = accNum.replace(/\D/g, '');
      const users = LocalDb.getUsers();
      const match = users.find(u => (u.accountNumber || '').replace(/\D/g, '') === cleanNum);
      if (match) {
        localStorage.setItem('tana_active_user_id', match.id);
        window.dispatchEvent(new CustomEvent('cbe_account_switched', { detail: { user: match } }));
        window.dispatchEvent(new CustomEvent('cbe_balance_updated', { detail: { user: match, balance: match.balance } }));
      }
    } catch {}
  };

  // Add custom account
  const handleAddCustomAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = customAccInput.replace(/\D/g, '');
    if (!cleanNum || cleanNum.length < 5) return;

    const newAcc = SmsService.ensureAccount(
      cleanNum, 
      customNameInput.trim() || `Account ${cleanNum.slice(-4)}`,
      1000.00
    );
    refreshAccounts();
    handleSelectAccount(newAcc.accountNumber);
    setCustomAccInput('');
    setCustomNameInput('');
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 100;
    setShowScrollBottom(isFarFromBottom);
  };

  // Mark all messages as read
  const handleMarkAllAsRead = () => {
    SmsService.markAllAsRead(activeAccountNum);
    reloadMessages(activeAccountNum);
    setShowMenu(false);
  };

  // Clear messages for this account
  const handleClearAccountMessages = () => {
    if (confirm(`Clear all messages for account ${activeAccountNum}?`)) {
      SmsService.clearAccountMessages(activeAccountNum);
      reloadMessages(activeAccountNum);
      setShowMenu(false);
    }
  };

  // Format message text with active links matching screenshot
  const renderMessageContent = (msg: SmsMessage) => {
    const text = msg?.message || '';
    if (!text) return null;
    // URL regex to make links clickable
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return (
      <div className={`whitespace-pre-line text-[14px] leading-relaxed ${isDarkMode ? 'text-[#e8eaed]' : 'text-[#1f2328]'} font-normal break-words`}>
        {parts.map((part, index) => {
          if (part.match(urlRegex)) {
            const isHoliday = part.includes('combanketh.et/holidays');
            const isReceipt = !isHoliday && (part.includes('mbreceipt') || part.includes('receipt') || part.includes('mreciept') || part.includes('cbe.com.et'));
            return (
              <a
                key={index}
                href={part}
                target="_blank"
                rel="noreferrer noopener"
                onClick={(e) => {
                  if (isHoliday) {
                    e.preventDefault();
                    setShowHolidayCardModal(true);
                  } else if (isReceipt) {
                    e.preventDefault();
                    setShowReceiptModal(msg);
                  }
                }}
                className={`${isDarkMode ? 'text-sky-400 hover:text-sky-300' : 'text-sky-600 hover:text-sky-700 font-medium'} underline font-normal break-all inline`}
              >
                {part}
              </a>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  };

  // Partition messages around unread line
  const unreadIndex = useMemo(() => {
    return (messages || []).findIndex(m => m && !m.read);
  }, [messages]);

  // Sort messages: newest first if recentFirst is true (so recent transaction appears at top)
  const sortedMessages = useMemo(() => {
    const valid = (messages || []).filter(Boolean);
    return valid.sort((a, b) => {
      const timeA = a?.timestamp ? new Date(a.timestamp).getTime() || 0 : 0;
      const timeB = b?.timestamp ? new Date(b.timestamp).getTime() || 0 : 0;
      return recentFirst ? timeB - timeA : timeA - timeB;
    });
  }, [messages, recentFirst]);

  // Apple Messages for iPhone Mobile
  if (isIPhone) {
    if (pageView === 'inbox') {
      return (
        <AppleMessagesInbox
          threads={threads}
          onSelectThread={handleSelectThread}
          onOpenCbeThread={() => setPageView('cbe')}
          onBackToApp={onBack}
          isDarkMode={isDarkMode}
        />
      );
    }

    if (pageView === 'cbe') {
      const currentAcc: SmsAccount = (accounts || []).find(a => a && a.accountNumber === activeAccountNum) || (accounts && accounts[0]) || {
        accountNumber: '1000419524747',
        accountName: 'Leykun Jemaneh Ylma',
        bankName: 'Commercial Bank of Ethiopia',
        currency: 'ETB',
        balance: 25430.00,
        lastUpdated: new Date().toISOString(),
      };

      return (
        <>
          <AppleMessagesThread
            messages={messages}
            accounts={accounts}
            activeAccount={currentAcc}
            onSelectAccount={(acc) => {
              setActiveAccountNum(acc.accountNumber);
              setMessages(SmsService.getSmsMessages(acc.accountNumber));
            }}
            onBack={() => {
              refreshThreads();
              setPageView('inbox');
            }}
            onBackToApp={onBack}
            onClearMessages={() => {
              SmsService.clearAccountMessages(activeAccountNum);
              setMessages([]);
            }}
            onOpenWebReceipt={(msg) => setShowReceiptModal(msg)}
            onOpenHolidayCard={() => setShowHolidayCardModal(true)}
            isDarkMode={isDarkMode}
          />
          {showReceiptModal && (
            <CbeWebReceiptModal 
              smsMessage={showReceiptModal} 
              onClose={() => setShowReceiptModal(null)} 
            />
          )}
          {showHolidayCardModal && (
            <CbeHolidayCardModal 
              onClose={() => setShowHolidayCardModal(false)} 
            />
          )}
        </>
      );
    }

    if (pageView === 'generic_thread' && selectedGenericThread) {
      return (
        <AppleMessagesThread
          messages={[]}
          thread={selectedGenericThread}
          onBack={() => {
            refreshThreads();
            setPageView('inbox');
          }}
          onBackToApp={onBack}
          onSendMessage={(txt) => {
            GoogleMessagesService.sendMessage(selectedGenericThread.id, txt);
            refreshThreads();
            const updated = GoogleMessagesService.getThreads().find(t => t.id === selectedGenericThread.id);
            if (updated) setSelectedGenericThread(updated);
          }}
          isDarkMode={isDarkMode}
        />
      );
    }
  }

  // Main Google Messages Inbox View (Matches Android screenshot)
  if (pageView === 'inbox') {
    return (
      <GoogleMessagesInbox
        threads={threads}
        onSelectThread={handleSelectThread}
        onBackToApp={onBack}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onStartChat={handleStartChat}
        onRefresh={refreshThreads}
      />
    );
  }

  // Non-CBE Message Thread (e.g. 131, ethio tel, Safaricom, etc.)
  if (pageView === 'generic_thread' && selectedGenericThread) {
    return (
      <GoogleMessagesThread
        thread={selectedGenericThread}
        onBack={() => {
          refreshThreads();
          setPageView('inbox');
        }}
        isDarkMode={isDarkMode}
        onThreadUpdated={refreshThreads}
      />
    );
  }

  return (
    <div className={`h-full min-h-[100dvh] h-[100dvh] w-full ${isDarkMode ? 'bg-[#121212] text-[#e3e3e3]' : 'bg-[#f4f5f7] text-[#1f2328]'} flex flex-col font-sans select-text antialiased transition-colors duration-150 overflow-hidden`}>
      
      {/* 2. Google Messages CBE Header Bar (Matching screenshot) */}
      <header className={`w-full ${isDarkMode ? 'bg-[#121212] border-neutral-900/80 text-white' : 'bg-white border-neutral-200 text-neutral-900 shadow-sm'} border-b px-2 pt-[max(env(safe-area-inset-top,0px),8px)] pb-2 flex items-center justify-between relative z-40`}>
        <div className="flex items-center space-x-3">
          {/* Back button returning to Google Messages inbox */}
          <button
            id="btn-sms-back"
            onClick={() => {
              refreshThreads();
              setPageView('inbox');
            }}
            className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-neutral-800 text-white' : 'hover:bg-neutral-100 text-neutral-800'} transition-colors active:scale-95`}
            title="Back to Messages"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          {/* Purple CBE Avatar with white silhouette */}
          <div className="w-10 h-10 rounded-full bg-[#8e24aa] flex items-center justify-center flex-shrink-0 shadow-sm">
            <User className="w-6 h-6 text-white" />
          </div>

          {/* Contact Name - CBE text only, no account number */}
          <h1 className={`text-[20px] font-medium tracking-wide leading-none select-none ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
            CBE
          </h1>
        </div>

        {/* 3-Dot Menu Button with pink indicator dot */}
        <div className="relative">
          <button
            id="btn-sms-three-dot"
            onClick={() => setShowMenu(!showMenu)}
            className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-neutral-800 text-white' : 'hover:bg-neutral-100 text-neutral-800'} relative transition-colors active:scale-95`}
            title="Options & Bank Accounts"
          >
            <MoreVertical className={`w-6 h-6 ${isDarkMode ? 'text-neutral-200' : 'text-neutral-700'}`} />
            {/* Small pink dot like in user screenshot */}
            <span className={`absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-400 ring-2 ${isDarkMode ? 'ring-[#121212]' : 'ring-white'}`}></span>
          </button>

          {/* 3-Dot Dropdown Menu (Accounts Option is prominently inside) */}
          {showMenu && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40 bg-black/40" 
                onClick={() => setShowMenu(false)} 
              />
              
              <div className={`absolute right-0 mt-2 w-80 sm:w-84 ${isDarkMode ? 'bg-[#1f2023] border-neutral-800 text-neutral-200' : 'bg-white border-neutral-200 text-neutral-800 shadow-2xl'} border rounded-2xl shadow-2xl z-50 py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-100`}>
                
                {/* 🌟 Toggle Theme Option inside 3-dot */}
                <button
                  id="btn-sms-toggle-theme"
                  onClick={handleToggleTheme}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors border-b ${
                    isDarkMode 
                      ? 'border-neutral-800/80 text-neutral-200 hover:bg-neutral-800/70' 
                      : 'border-neutral-100 text-neutral-800 hover:bg-neutral-50'
                  }`}
                  title="Toggle Light/Dark Theme"
                >
                  <div className="flex items-center space-x-2.5">
                    {isDarkMode ? (
                      <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Moon className="w-4 h-4 text-indigo-500" />
                    )}
                    <span className="font-medium">Toggle theme</span>
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                    isDarkMode
                      ? 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                      : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                  }`}>
                    {isDarkMode ? 'Dark' : 'Light'}
                  </span>
                </button>

                {/* 📱 Phone & Status Bar Settings Option inside 3-dot */}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowPhoneSettingsModal(true);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors border-b ${
                    isDarkMode 
                      ? 'border-neutral-800/80 text-neutral-200 hover:bg-neutral-800/70' 
                      : 'border-neutral-100 text-neutral-800 hover:bg-neutral-50'
                  }`}
                  title="Change Phone Type and Status Bar Style"
                >
                  <div className="flex items-center space-x-2.5">
                    <Smartphone className="w-4 h-4 text-blue-400" />
                    <span className="font-medium">Phone &amp; Status Bar</span>
                  </div>
                  <span className="text-xs text-blue-400 font-semibold flex items-center gap-1">
                    <span>Customize</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>

                {/* Truecaller Simulator Option inside 3-dot */}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    try {
                      window.history.pushState({ view: 'truecaller' }, '', '/truecaller');
                      window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'truecaller' } }));
                    } catch {}
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors border-b ${
                    isDarkMode 
                      ? 'border-neutral-800/80 text-neutral-200 hover:bg-neutral-800/70' 
                      : 'border-neutral-100 text-neutral-800 hover:bg-neutral-50'
                  }`}
                  title="Open Truecaller SMS Simulator"
                >
                  <div className="flex items-center space-x-2.5">
                    <Smartphone className="w-4 h-4 text-[#0066FF]" />
                    <span className="font-medium">Truecaller Pop-down Simulator</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#0066FF] text-white">
                    Pop-down
                  </span>
                </button>

                {/* Toggle Recent Messages on Top */}
                <button
                  onClick={() => {
                    setRecentFirst(!recentFirst);
                    setShowMenu(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-xs flex items-center justify-between transition-colors border-b ${
                    isDarkMode 
                      ? 'border-neutral-800/80 text-neutral-200 hover:bg-neutral-800/70' 
                      : 'border-neutral-100 text-neutral-800 hover:bg-neutral-50'
                  }`}
                  title="Toggle Recent Transactions on Top"
                >
                  <div className="flex items-center space-x-2.5">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span className="font-medium">Recent Messages On Top</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    recentFirst ? 'bg-purple-600 text-white' : (isDarkMode ? 'bg-neutral-800 text-neutral-400' : 'bg-neutral-200 text-neutral-600')
                  }`}>
                    {recentFirst ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Menu Header / Section Label */}
                <div className={`px-4 py-2 border-b ${isDarkMode ? 'border-neutral-800' : 'border-neutral-100'} flex items-center justify-between`}>
                  <div className={`flex items-center space-x-2 text-xs font-semibold ${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'} uppercase tracking-wider`}>
                    <Landmark className="w-3.5 h-3.5 text-purple-400" />
                    <span>Bank Accounts</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowAccountModal(true);
                    }}
                    className="text-xs text-purple-500 hover:text-purple-600 font-medium flex items-center space-x-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Switch/Add</span>
                  </button>
                </div>

                {/* Account list options grouped by transaction day (Recent, Yesterday, Last week, Last month) */}
                <div className="max-h-64 overflow-y-auto py-0.5">
                  {groupedSections.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-neutral-500 text-center">No accounts found</div>
                  ) : (
                    groupedSections.map(section => (
                      <div key={section.key} className="py-0.5">
                        {/* Group Header */}
                        <div className={`px-4 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          isDarkMode 
                            ? 'text-neutral-400 bg-neutral-900/60 border-y border-neutral-800/80' 
                            : 'text-neutral-500 bg-neutral-100/80 border-y border-neutral-200/80'
                        } flex items-center justify-between select-none`}>
                          <span>{section.title}</span>
                          <span className="text-[9.5px] opacity-75 font-normal">
                            {section.accounts.length} {section.accounts.length === 1 ? 'account' : 'accounts'}
                          </span>
                        </div>

                        {/* Accounts in this group */}
                        <div>
                          {section.accounts.map(meta => {
                            const isSelected = meta.account.accountNumber === activeAccountNum;
                            return (
                              <button
                                key={meta.account.accountNumber}
                                onClick={() => handleSelectAccount(meta.account.accountNumber)}
                                className={`w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors ${
                                  isSelected 
                                    ? (isDarkMode ? 'bg-purple-950/30 text-white font-medium' : 'bg-purple-50 text-purple-950 font-medium')
                                    : (isDarkMode ? 'text-neutral-300 hover:bg-neutral-800/80' : 'text-neutral-700 hover:bg-neutral-50')
                                }`}
                              >
                                <div className="flex items-center space-x-2.5 truncate min-w-0 pr-2">
                                  <CreditCard className={`w-4 h-4 flex-shrink-0 ${
                                    isSelected ? 'text-purple-400' : (isDarkMode ? 'text-neutral-500' : 'text-neutral-400')
                                  }`} />
                                  <div className="truncate">
                                    <div className="flex items-center space-x-1.5">
                                      <p className="text-sm font-mono truncate">{meta.account.accountNumber}</p>
                                    </div>
                                    <p className={`text-[11px] truncate ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                      {meta.account.accountName}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2 flex-shrink-0 ml-1">
                                  {/* "Now" badge (restricted strictly to receiver and sender) or formatted transaction time */}
                                  {meta.isNow ? (
                                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-purple-900/50 text-purple-300 border border-purple-700/40 tracking-tight">
                                      Now
                                    </span>
                                  ) : (
                                    <span className={`text-[11px] font-medium ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                      {meta.timeLabel}
                                    </span>
                                  )}

                                  {/* Pink unread notification dot matching user's screenshot */}
                                  {meta.unreadCount > 0 && (
                                    <span 
                                      className="w-2.5 h-2.5 rounded-full bg-[#f43f5e] flex-shrink-0" 
                                      title={`${meta.unreadCount} unread`}
                                    />
                                  )}

                                  {isSelected && (
                                    <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className={`border-t ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'} my-1`}></div>

                {/* Secondary Actions */}
                <button
                  onClick={handleMarkAllAsRead}
                  className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-2.5 transition-colors ${
                    isDarkMode ? 'text-neutral-300 hover:bg-neutral-800' : 'text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <CheckCheck className={`w-4 h-4 ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`} />
                  <span>Mark all as read</span>
                </button>

                <button
                  onClick={handleClearAccountMessages}
                  className={`w-full px-4 py-2 text-left text-sm text-red-500 flex items-center space-x-2.5 transition-colors ${
                    isDarkMode ? 'hover:bg-neutral-800' : 'hover:bg-red-50'
                  }`}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <span>Clear conversation</span>
                </button>

                <div className={`px-4 py-2 border-t text-[11px] ${
                  isDarkMode 
                    ? 'bg-neutral-900/50 border-neutral-800 text-neutral-400' 
                    : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                }`}>
                  <span>Current: {maskAccountNumber(activeAccount.accountNumber)}</span>
                  <span className="float-right font-mono text-purple-600 font-medium">
                    ETB {activeAccount.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

              </div>
            </>
          )}
        </div>
      </header>

      {/* 3. Conversation Message Stream (Styled exactly like the Google Messages screenshot) */}
      <main 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5 max-w-xl mx-auto w-full relative"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500 text-center space-y-2">
            <Landmark className="w-12 h-12 stroke-[1.5] text-neutral-500" />
            <p className={`text-sm font-medium ${isDarkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>No banking messages yet for this account.</p>
            <p className="text-xs text-neutral-500 max-w-xs">
              Perform any transfer or deposit in the bank app to automatically generate CBE debit and credit SMS alerts.
            </p>
          </div>
        ) : (
          <>
            {/* Message bubbles sequence: recent transactions appear at top */}
            {sortedMessages.map((msg, index) => {
              const isUnreadBoundary = unreadIndex !== -1 && index === unreadIndex;
              const prevMsg = index > 0 ? sortedMessages[index - 1] : null;
              const showDateHeader = !prevMsg || (() => {
                const d1 = new Date(prevMsg.timestamp).toDateString();
                const d2 = new Date(msg.timestamp).toDateString();
                return d1 !== d2;
              })();

              return (
                <React.Fragment key={msg.id}>
                  {showDateHeader && !isUnreadBoundary && (
                    <div className="text-center my-2">
                      <span className={`text-[12px] ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'} font-normal`}>
                        {formatSmsThreadTime(msg.timestamp)}
                      </span>
                    </div>
                  )}

                  {/* Unread Divider Bar (Matching Screenshot with "Unread" line followed by timestamp) */}
                  {isUnreadBoundary && (
                    <div className="my-2.5">
                      <div className="flex items-center px-2 select-none">
                        <div className={`h-[1px] ${isDarkMode ? 'bg-[#3c4043]' : 'bg-neutral-300'} flex-1`}></div>
                        <span className={`px-3 text-xs ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'} font-normal tracking-wide`}>
                          Unread
                        </span>
                        <div className={`h-[1px] ${isDarkMode ? 'bg-[#3c4043]' : 'bg-neutral-300'} flex-1`}></div>
                      </div>
                      <div className="text-center mt-1.5">
                        <span className={`text-[12px] ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'} font-normal`}>
                          {formatSmsThreadTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Message Bubble Container (Exact Google Messages bubble style) */}
                  <div className="flex flex-col items-start w-full mb-2.5">
                    <div 
                      className={`max-w-[92%] ${
                        isDarkMode 
                          ? 'bg-[#212226] text-[#e8eaed] border-neutral-800/40 shadow-sm' 
                          : 'bg-white text-[#1f2328] border-neutral-200/90 shadow-sm'
                      } rounded-2xl rounded-tl-sm px-4 py-3 border relative group`}
                    >
                      {/* Render text with hyperlinks */}
                      {renderMessageContent(msg)}
                    </div>
                    {/* Timestamp & Carrier label below bubble ("12:54 PM • Ethio telecom") */}
                    <span className={`text-[11px] ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'} mt-1 pl-1 select-none`}>
                      {formatBubbleTime(msg.timestamp)}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Floating Scroll to Bottom Button (Round down-arrow button as in screenshot) */}
      {showScrollBottom && (
        <div className="sticky bottom-16 flex justify-center pointer-events-none pb-2 z-30">
          <button
            onClick={scrollToBottom}
            className={`pointer-events-auto w-10 h-10 rounded-full ${
              isDarkMode 
                ? 'bg-[#202124] border-neutral-700 text-white hover:bg-neutral-800 shadow-xl' 
                : 'bg-white border-neutral-300 text-neutral-800 hover:bg-neutral-100 shadow-lg'
            } border flex items-center justify-center transition-all active:scale-90`}
            title="Scroll to latest"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 4. Bottom Banner: Exact text from screenshot */}
      <footer className={`w-full ${
        isDarkMode ? 'bg-[#161719] border-neutral-800/80 text-neutral-300' : 'bg-white border-neutral-200 text-neutral-600'
      } border-t px-4 py-2.5 z-30 shrink-0`}>
        <div className="max-w-xl mx-auto flex items-center justify-center text-center">
          <p className={`text-[12.5px] ${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'} font-normal`}>
            Sender can't accept replies. Contact them directly.{' '}
            <a 
              href="https://www.combanketh.et" 
              target="_blank" 
              rel="noreferrer noopener"
              className={`${isDarkMode ? 'text-neutral-300 hover:text-white' : 'text-neutral-700 hover:text-neutral-900'} underline transition-colors`}
            >
              Learn more
            </a>
          </p>
        </div>
      </footer>



      {/* 6. Switch / Add Account Modal (from 3-Dot menu) */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`${isDarkMode ? 'bg-[#1e1f23] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'} border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl`}>
            
            <div className={`px-5 py-4 border-b ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'} flex items-center justify-between`}>
              <div className="flex items-center space-x-2">
                <Landmark className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-lg">Bank Message Accounts</h3>
              </div>
              <button
                onClick={() => setShowAccountModal(false)}
                className={`p-1 rounded-full ${isDarkMode ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                Each sender or receiver account has its own independent message thread. Select an account to view its messages or add a new account number.
              </p>

              {/* Accounts List grouped by transaction days */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {groupedSections.length === 0 ? (
                  <div className="py-4 text-center text-xs text-neutral-500">No accounts found</div>
                ) : (
                  groupedSections.map(section => (
                    <div key={section.key} className="space-y-1.5">
                      <div className={`px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ${
                        isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
                      } flex items-center justify-between`}>
                        <span>{section.title}</span>
                        <span className="text-[10px] font-normal opacity-70">
                          {section.accounts.length} {section.accounts.length === 1 ? 'account' : 'accounts'}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {section.accounts.map(meta => {
                          const isSelected = meta.account.accountNumber === activeAccountNum;
                          return (
                            <div
                              key={meta.account.accountNumber}
                              onClick={() => handleSelectAccount(meta.account.accountNumber)}
                              className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                isSelected 
                                  ? (isDarkMode ? 'border-purple-500 bg-purple-950/20 text-white' : 'border-purple-500 bg-purple-50 text-purple-950')
                                  : (isDarkMode ? 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 text-neutral-300' : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50 text-neutral-800')
                              }`}
                            >
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono font-semibold text-sm">{meta.account.accountNumber}</span>
                                  {isSelected && (
                                    <span className={`text-[10px] ${isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-200 text-purple-800'} px-1.5 py-0.5 rounded-full font-medium`}>
                                      Active
                                    </span>
                                  )}
                                  {meta.isNow ? (
                                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-purple-900/50 text-purple-300 border border-purple-700/40">
                                      Now
                                    </span>
                                  ) : (
                                    <span className={`text-[10.5px] ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                      {meta.timeLabel}
                                    </span>
                                  )}
                                </div>
                                <p className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'} mt-0.5`}>
                                  {meta.account.accountName}
                                </p>
                              </div>

                              <div className="text-right flex flex-col items-end">
                                <p className="text-xs font-mono text-purple-600 font-semibold">
                                  ETB {meta.account.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                                <div className="flex items-center space-x-1.5 mt-0.5">
                                  {meta.unreadCount > 0 && (
                                    <span className="w-2 h-2 rounded-full bg-[#f43f5e]" title={`${meta.unreadCount} unread`} />
                                  )}
                                  <span className="text-[10px] text-neutral-400">
                                    {meta?.account?.accountNumber ? (SmsService.getSmsMessages(meta.account.accountNumber) || []).length : 0} messages
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add / Switch by Account Number */}
              <form onSubmit={handleAddCustomAccount} className={`pt-3 border-t ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'} space-y-3`}>
                <h4 className={`text-xs font-semibold ${isDarkMode ? 'text-neutral-300' : 'text-neutral-700'} uppercase tracking-wider`}>
                  Open or Add Account Number
                </h4>
                <div>
                  <label className={`block text-[11px] ${isDarkMode ? 'text-neutral-400' : 'text-neutral-600'} mb-1`}>Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 1000419524747"
                    value={customAccInput}
                    onChange={(e) => setCustomAccInput(e.target.value)}
                    className={`w-full ${isDarkMode ? 'bg-[#141416] border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-300 text-neutral-900'} border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-purple-500`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] ${isDarkMode ? 'text-neutral-400' : 'text-neutral-600'} mb-1`}>Account Holder Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Leykun Jemaneh Ylma"
                    value={customNameInput}
                    onChange={(e) => setCustomNameInput(e.target.value)}
                    className={`w-full ${isDarkMode ? 'bg-[#141416] border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-300 text-neutral-900'} border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!customAccInput.trim()}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors flex items-center justify-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Open Account Messages</span>
                </button>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* 7. Official CBE Receipt Modal (when clicking mbreceipt link) */}
      {showReceiptModal && (
        <CbeWebReceiptModal 
          smsMessage={showReceiptModal} 
          onClose={() => setShowReceiptModal(null)} 
        />
      )}

      {/* Official CBE Holiday Greeting Card Modal */}
      {showHolidayCardModal && (
        <CbeHolidayCardModal
          onClose={() => setShowHolidayCardModal(false)}
        />
      )}

      {/* 8. Global Phone Type & Status Bar Settings Modal */}
      <PhoneSettingsModal 
        isOpen={showPhoneSettingsModal} 
        onClose={() => setShowPhoneSettingsModal(false)} 
      />

    </div>
  );
}

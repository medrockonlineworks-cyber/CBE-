import React, { useState, useEffect } from 'react';
import { UserProfile, Transaction, SystemNotification } from '../types';
import { LocalDb, DEFAULT_CBE_LOGO } from '../lib/mockData';
import { CbeLogo as CbeGoldenLogo } from './CbeLogo';
import { BillShareIcon, CardsIcon, MiniStatementIcon, CopyIcon, RefreshIcon } from './CbeCustomIcons';
import { 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  RotateCw, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  ArrowUpRight, 
  FileText, 
  CreditCard, 
  GitFork, 
  Send, 
  CheckCircle2, 
  Phone, 
  ArrowLeftRight, 
  Wallet, 
  Receipt as ReceiptIcon,
  X,
  QrCode,
  Download,
  Building,
  Landmark,
  ShieldCheck,
  Globe,
  Grid,
  Settings,
  ShieldAlert,
  Sliders,
  UserCheck,
  LogOut,
  Sparkles
} from 'lucide-react';

interface DashboardProps {
  currentUser: UserProfile;
  onNavigateToTab: (tab: 'home' | 'transfer' | 'payments' | 'history' | 'profile', subTab?: string) => void;
  onSelectTransaction: (tx: Transaction) => void;
  onLogout: () => void;
  onOpenAdmin?: () => void;
}

export default function Dashboard({ currentUser, onNavigateToTab, onSelectTransaction, onLogout, onOpenAdmin }: DashboardProps) {
  const [showBalance, setShowBalance] = useState<boolean>(() => {
    const saved = localStorage.getItem('tana_show_balance');
    return saved !== 'false';
  });
  
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [customBankLogo, setCustomBankLogo] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [showLangModal, setShowLangModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showAppLauncher, setShowAppLauncher] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
  
  const isAdmin = currentUser.role === 'admin' || currentUser.email === 'leykunjemaneh3@gmail.com';

  // Interactive feature modals
  const [activeModal, setActiveModal] = useState<'cashout' | 'ministatement' | 'cards' | 'billshare' | 'cbebirr' | 'receive' | null>(null);
  
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    setCustomBankLogo(LocalDb.getCustomBankLogo());
    loadTransactions();

    // Live clock timer for true current date and time
    const clockTimer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    const handleLogoUpdate = () => {
      setCustomBankLogo(LocalDb.getCustomBankLogo());
    };
    window.addEventListener('cbe_logo_updated', handleLogoUpdate);
    return () => {
      clearInterval(clockTimer);
      window.removeEventListener('cbe_logo_updated', handleLogoUpdate);
    };
  }, [currentUser]);

  const loadTransactions = () => {
    const txs = LocalDb.getTransactions();
    const filteredTxs = txs.filter(t => 
      t.senderId === currentUser.id || t.recipientId === currentUser.id || t.senderAccount === currentUser.accountNumber || t.recipientAccount === currentUser.accountNumber
    );
    setRecentTransactions(
      filteredTxs.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (isNaN(timeA) || isNaN(timeB)) {
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        }
        return timeB - timeA;
      })
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentDateTime(new Date());
    loadTransactions();
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  const toggleBalance = () => {
    setShowBalance(prev => {
      localStorage.setItem('tana_show_balance', String(!prev));
      return !prev;
    });
  };

  const copyAccountNum = () => {
    navigator.clipboard.writeText(currentUser.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Masked / Unmasked Account helper controlled by eye toggle
  const formatCardAccount = () => {
    const acc = currentUser.accountNumber || '100012348657';
    const accountTypeName = currentUser.accountType === 'checking' 
      ? 'Current Account' 
      : (currentUser.accountType === 'cbe_birr' 
        ? 'CBEBirr Wallet' 
        : 'Saving Account 1');
    if (!showBalance) {
      const last4 = acc.slice(-4);
      return `${accountTypeName} **** ${last4}`;
    }
    return `${accountTypeName} ${acc}`;
  };

  // Live formatted current date and time string in CBE format (e.g., 28 Aug 2026 • 07:58 AM)
  const formatCardDateTime = (d: Date) => {
    const day = d.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hourStr = hours.toString().padStart(2, '0');
    return `${day} ${month} ${year} • ${hourStr}:${minutes}:${seconds} ${ampm}`;
  };

  // Filtered search items
  const filteredTxs = recentTransactions.filter(t => 
    (t.recipientName && t.recipientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.id && t.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div id="cbe-dashboard-screen" className="max-w-md w-full h-full mx-auto bg-[#f6f7fb] relative font-sans flex flex-col overflow-hidden select-none">
      
      {/* 1. TOP CBE VIVID ROYAL PURPLE HEADER CONTAINER (STATIC / UNSCROLLABLE) */}
      <header className="bg-[#70189F] text-white pt-5 pb-10 px-4 relative shadow-md flex-shrink-0 z-20 touch-none overscroll-none select-none">
        
        {/* Top App Bar Row */}
        <div className="flex items-center justify-between gap-2">
          
          {/* Left: Grid/Apps 4-circle Icon + User Greeting */}
          <div className="flex items-center gap-2.5">
            <button 
              id="btn-app-launcher"
              onClick={() => setShowAppLauncher(true)}
              className="w-9 h-9 rounded-2xl bg-white/20 hover:bg-white/30 border border-white/25 flex items-center justify-center active:scale-95 transition cursor-pointer shadow-xs"
              title="App Launcher (Services & Admin)"
            >
              <div className="grid grid-cols-2 gap-[3px] p-0.5">
                <div className="w-1.5 h-1.5 rounded-[1px] bg-white shadow-xs" />
                <div className="w-1.5 h-1.5 rounded-[1px] bg-white shadow-xs" />
                <div className="w-1.5 h-1.5 rounded-[1px] bg-white shadow-xs" />
                <div className="w-1.5 h-1.5 rounded-[1px] bg-white shadow-xs" />
              </div>
            </button>

            <div>
              <p className="text-[11px] text-white/80 font-normal leading-none">Hello,</p>
              <h2 className="text-base font-extrabold text-white tracking-tight leading-tight mt-0.5">
                {currentUser.name.split(' ')[0] || 'Abdurahman'}
              </h2>
            </div>
          </div>

          {/* Right: Language Pill + Refresh + Search */}
          <div className="flex items-center gap-2">
            
            {/* Language Selector Pill */}
            <button 
              onClick={() => setShowLangModal(true)}
              className="bg-white/20 hover:bg-white/30 border border-white/25 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 text-white transition cursor-pointer backdrop-blur-xs"
            >
              <span>{selectedLanguage}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-90" />
            </button>

            {/* Refresh Button */}
            <button 
              onClick={handleRefresh}
              className={`w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 border border-white/25 flex items-center justify-center text-white transition cursor-pointer backdrop-blur-xs ${refreshing ? 'animate-spin' : ''}`}
              title="Refresh Balance"
            >
              <RefreshIcon size={19} />
            </button>

            {/* Search Button */}
            <button 
              onClick={() => setShowSearchModal(true)}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 border border-white/25 flex items-center justify-center text-white transition cursor-pointer backdrop-blur-xs"
              title="Search Transactions & Services"
            >
              <Search className="w-4 h-4 stroke-[2.4]" />
            </button>

          </div>
        </div>

        {/* 2. THE FLOATING DARK CBE ACCOUNT CARD */}
        <div className="mt-4 relative z-10">
          <div className="bg-[#18191c] rounded-3xl p-5 shadow-2xl text-white relative overflow-hidden border border-white/10">
            
            {/* Subtle Textured Background Grid / World Map Aesthetic */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />
            <div className="absolute -right-12 -bottom-12 w-44 h-44 bg-[#deb356]/10 rounded-full blur-2xl pointer-events-none" />

            {/* Card Header: Emblem + Commercial Bank of Ethiopia (in ONE single line) */}
            <div className="flex items-center gap-3 relative z-10 min-w-0">
              <CbeGoldenLogo className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0" src={customBankLogo} />
              <div className="min-w-0 flex-1">
                <h3 className="font-sans text-[#F5C249] font-bold text-[15.5px] sm:text-[17px] tracking-[-0.01em] leading-tight whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
                  Commercial Bank of Ethiopia
                </h3>
                <p className="font-mono text-[#EDE49E] text-[11px] sm:text-[11.5px] font-medium tracking-[0.015em] leading-snug mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                  The bank you can always rely on!
                </p>
              </div>
            </div>

            {/* Card Center: Balance & Eye Toggle */}
            <div className="my-5 sm:my-6 flex justify-between items-center relative z-10">
              <div className="flex items-baseline gap-2">
                {showBalance ? (
                  <span className="font-sans text-[23px] sm:text-[25px] font-extrabold tracking-tight text-white leading-none">
                    {currentUser.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                ) : (
                  <span className="font-mono text-[24px] sm:text-[26px] font-extrabold tracking-[0.11em] text-white leading-none">
                    ******
                  </span>
                )}
                <span className="font-sans text-[15px] sm:text-[16px] font-bold text-white tracking-normal leading-none">ETB</span>
              </div>

              <button 
                id="btn-toggle-balance"
                onClick={toggleBalance}
                className="p-1.5 text-[#B8BAC0] hover:text-white transition cursor-pointer"
                title={showBalance ? "Hide Balance & Account" : "Show Balance & Account"}
              >
                {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>

            {/* Card Bottom: Account Type & Masked/Unmasked Number with Copy Button */}
            <div className="flex justify-between items-center text-[13.5px] sm:text-[14.5px] text-[#EDE49E] relative z-10 font-mono">
              <span className="font-medium tracking-[0.03em] text-[#EDE49E]">
                {formatCardAccount()}
              </span>
              <button 
                onClick={copyAccountNum}
                className="hover:text-white text-[#C8CACF] p-1 transition cursor-pointer flex items-center gap-1"
                title="Copy Account Number"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <CopyIcon size={17} />}
              </button>
            </div>

            {/* Card Timestamp: True live current date & time */}
            <div className="mt-3.5 text-center font-sans text-[11.5px] sm:text-[12px] font-medium text-[#9CA3AF] tracking-[0.01em]">
              {formatCardDateTime(currentDateTime)}
            </div>

          </div>

          {/* Carousel Indicator Dots */}
          <div className="flex justify-center items-center gap-1.5 mt-3">
            <div className="w-7 h-2 bg-[#deb356] rounded-full" />
            <div className="w-2 h-2 bg-[#deb356]/70 rounded-full" />
            <div className="w-2 h-2 bg-[#deb356]/70 rounded-full" />
          </div>

        </div>

      </header>

      {/* 3. MAIN WHITE CURVED SHEET (SCROLLABLE INDEPENDENTLY) */}
      <main className="bg-[#f6f7fb] -mt-8 rounded-t-[36px] pt-6 px-4 pb-32 shadow-md relative z-20 space-y-5 flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-none">
        
        {/* ROW 1: 4 Circular Quick Action Buttons */}
        <div className="flex items-start justify-between gap-1 px-1">
          
          {/* 1. Cash Out */}
          <button 
            onClick={() => setActiveModal('cashout')}
            className="flex flex-col items-center flex-1 group cursor-pointer"
          >
            <div className="w-13 h-13 rounded-full bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-center text-[#70189F] transition group-hover:scale-105 group-active:scale-95">
              <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-extrabold text-[#70189F] mt-2 text-center leading-tight">
              Cash Out
            </span>
          </button>

          {/* 2. Mini Statement */}
          <button 
            onClick={() => setActiveModal('ministatement')}
            className="flex flex-col items-center flex-1 group cursor-pointer"
          >
            <div className="w-13 h-13 rounded-full bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-center text-[#70189F] transition group-hover:scale-105 group-active:scale-95">
              <MiniStatementIcon size={24} color="#70189F" />
            </div>
            <span className="text-[11px] font-extrabold text-[#70189F] mt-2 text-center leading-tight">
              Mini Statement
            </span>
          </button>

          {/* 3. Cards */}
          <button 
            onClick={() => setActiveModal('cards')}
            className="flex flex-col items-center flex-1 group cursor-pointer"
          >
            <div className="w-13 h-13 rounded-full bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-center text-[#70189F] transition group-hover:scale-105 group-active:scale-95">
              <CardsIcon size={24} color="#70189F" />
            </div>
            <span className="text-[11px] font-extrabold text-[#70189F] mt-2 text-center leading-tight">
              Cards
            </span>
          </button>

          {/* 4. Bill Share */}
          <button 
            onClick={() => setActiveModal('billshare')}
            className="flex flex-col items-center flex-1 group cursor-pointer"
          >
            <div className="w-13 h-13 rounded-full bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-center text-[#70189F] transition group-hover:scale-105 group-active:scale-95">
              <BillShareIcon size={24} color="#70189F" />
            </div>
            <span className="text-[11px] font-extrabold text-[#70189F] mt-2 text-center leading-tight">
              Bill Share
            </span>
          </button>

          {/* Small Arrow Carousel Button */}
          <button 
            onClick={() => onNavigateToTab('transfer')}
            className="w-7 h-7 mt-3 rounded-full bg-white border border-gray-200 shadow-xs flex items-center justify-center text-gray-400 hover:text-[#70189F] transition cursor-pointer"
            title="More actions"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>

        </div>

        {/* ROW 2 & 3: MAIN 2-COLUMN FEATURE ACTION CARDS */}
        <div className="grid grid-cols-2 gap-3.5">
          
          {/* Card 1: CBE Transfer */}
          <button 
            id="action-cbe-transfer"
            onClick={() => onNavigateToTab('transfer', 'transfer')}
            className="bg-white hover:bg-purple-50/30 p-4 rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center gap-3 transition text-left cursor-pointer active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-full bg-[#fde8e8] flex items-center justify-center text-[#e02424] flex-shrink-0">
              <ArrowUpRight className="w-6 h-6 stroke-[2.8]" />
            </div>
            <div>
              <h4 className="font-extrabold text-[14px] text-gray-900 leading-tight">CBE Transfer</h4>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Send Money</p>
            </div>
          </button>

          {/* Card 2: Receive */}
          <button 
            id="action-receive"
            onClick={() => setActiveModal('receive')}
            className="bg-white hover:bg-purple-50/30 p-4 rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center gap-3 transition text-left cursor-pointer active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-full bg-[#def7ec] flex items-center justify-center text-[#0e9f6e] flex-shrink-0">
              <Check className="w-6 h-6 stroke-[2.8]" />
            </div>
            <div>
              <h4 className="font-extrabold text-[14px] text-gray-900 leading-tight">Receive</h4>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Get Paid</p>
            </div>
          </button>

          {/* Card 3: Airtime */}
          <button 
            id="action-airtime"
            onClick={() => onNavigateToTab('transfer', 'airtime')}
            className="bg-white hover:bg-purple-50/30 p-4 rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center text-center transition cursor-pointer active:scale-[0.98] py-5"
          >
            <Phone className="w-7 h-7 text-[#70189F] fill-[#70189F]" />
            <h4 className="font-extrabold text-[14px] text-gray-900 mt-2">Airtime</h4>
          </button>

          {/* Card 4: Other Transfers */}
          <button 
            id="action-other-transfers"
            onClick={() => onNavigateToTab('transfer', 'send')}
            className="bg-white hover:bg-purple-50/30 p-4 rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center text-center transition cursor-pointer active:scale-[0.98] py-5"
          >
            <ArrowLeftRight className="w-7 h-7 text-[#70189F] stroke-[2.5]" />
            <h4 className="font-extrabold text-[14px] text-gray-900 mt-2">Other Transfers</h4>
          </button>

          {/* Card 5: CBEBirr */}
          <button 
            id="action-cbebirr"
            onClick={() => setActiveModal('cbebirr')}
            className="bg-white hover:bg-purple-50/30 p-4 rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center text-center transition cursor-pointer active:scale-[0.98] py-5"
          >
            <Wallet className="w-7 h-7 text-[#70189F] stroke-[2.5]" />
            <h4 className="font-extrabold text-[14px] text-gray-900 mt-2">CBEBirr</h4>
          </button>

          {/* Card 6: Bills & Utilities */}
          <button 
            id="action-bills-utilities"
            onClick={() => onNavigateToTab('payments')}
            className="bg-white hover:bg-purple-50/30 p-4 rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center text-center transition cursor-pointer active:scale-[0.98] py-5"
          >
            <ReceiptIcon className="w-7 h-7 text-[#70189F] stroke-[2.5]" />
            <h4 className="font-extrabold text-[14px] text-gray-900 mt-2">Bills &amp; Utilities</h4>
          </button>

        </div>

      </main>

      {/* ========================================================================= */}
      {/* INTERACTIVE MODALS FOR REPRODUCING CBE MOBILE BANKING COMPLETE EXPERIENCE */}
      {/* ========================================================================= */}

      {/* 1. Language Modal */}
      {showLangModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xs w-full p-5 space-y-3 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#70189F]" />
                <span>Select Language</span>
              </h3>
              <button onClick={() => setShowLangModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              {[
                { code: 'English', label: 'English' },
                { code: 'አማርኛ', label: 'Amharic (አማርኛ)' },
                { code: 'Afaan Oromoo', label: 'Afaan Oromoo' },
                { code: 'ትግርኛ', label: 'Tigrinya (ትግርኛ)' },
                { code: 'Somali', label: 'Somali' }
              ].map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setSelectedLanguage(lang.code);
                    setShowLangModal(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs flex justify-between items-center transition ${
                    selectedLanguage === lang.code ? 'bg-[#70189F] text-white' : 'hover:bg-purple-50 text-gray-700'
                  }`}
                >
                  <span>{lang.label}</span>
                  {selectedLanguage === lang.code && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start justify-center p-4 pt-16 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5">
              <Search className="w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Search transactions, ref or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs w-full outline-none font-medium"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredTxs.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No matching records found.</p>
              ) : (
                filteredTxs.map(tx => (
                  <button
                    key={tx.id}
                    onClick={() => {
                      setShowSearchModal(false);
                      onSelectTransaction(tx);
                    }}
                    className="w-full text-left p-2.5 hover:bg-purple-50 rounded-xl flex justify-between items-center border border-gray-100 transition"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-800">{tx.recipientName}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{tx.id} • {new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs font-bold font-mono text-[#70189F]">
                      ETB {tx.amount.toLocaleString()}
                    </span>
                  </button>
                ))
              )}
            </div>

            <button 
              onClick={() => setShowSearchModal(false)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 3. Mini Statement Modal */}
      {activeModal === 'ministatement' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#70189F]" />
                <h3 className="font-extrabold text-sm text-gray-900">Mini Statement</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-purple-50 p-3 rounded-2xl flex justify-between items-center text-xs">
              <div>
                <p className="text-purple-700 font-medium">Account</p>
                <p className="font-mono font-bold text-[#70189F]">{currentUser.accountNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-purple-700 font-medium">Available Balance</p>
                <p className="font-mono font-black text-[#70189F]">ETB {currentUser.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {recentTransactions.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No recent transactions recorded.</p>
              ) : (
                recentTransactions.slice(0, 5).map((tx, index) => (
                  <button
                    key={tx.id}
                    onClick={() => {
                      setActiveModal(null);
                      onSelectTransaction(tx);
                    }}
                    className="w-full text-left p-2.5 bg-gray-50 hover:bg-purple-50/50 rounded-xl flex justify-between items-center transition border border-gray-100"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        {index < 2 && (
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full bg-purple-100 text-[#70189F] border border-purple-200">
                            Recent
                          </span>
                        )}
                        <p className="text-xs font-bold text-gray-900">{tx.recipientName}</p>
                      </div>
                      <p className="text-[10px] text-gray-400 font-mono">{tx.id} • {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold font-mono text-gray-900">
                        ETB {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="block text-[9px] text-emerald-600 font-bold uppercase">{tx.status}</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            <button 
              onClick={() => {
                setActiveModal(null);
                onNavigateToTab('history');
              }}
              className="w-full bg-[#70189F] text-white py-2.5 rounded-xl font-bold text-xs hover:bg-[#530d66] transition cursor-pointer"
            >
              View Full Statement History
            </button>
          </div>
        </div>
      )}

      {/* 4. Receive QR Modal */}
      {activeModal === 'receive' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-extrabold text-sm text-gray-900">Receive Money / QR</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-purple-50/60 rounded-2xl flex flex-col items-center">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-purple-100">
                <QrCode className="w-36 h-36 text-[#70189F]" />
              </div>
              <p className="font-extrabold text-sm text-gray-900 mt-3">{currentUser.name}</p>
              <p className="text-xs font-mono font-bold text-[#70189F] mt-0.5">{currentUser.accountNumber}</p>
              <span className="text-[10px] text-gray-500 mt-1 whitespace-nowrap">Commercial Bank of Ethiopia (CBE)</span>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={copyAccountNum}
                className="flex-1 bg-purple-50 text-[#70189F] hover:bg-purple-100 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <CopyIcon size={16} color="#70189F" />}
                <span>{copied ? 'Copied' : 'Copy Account'}</span>
              </button>
              <button 
                onClick={() => setActiveModal(null)}
                className="flex-1 bg-[#70189F] text-white hover:bg-[#530d66] py-2.5 rounded-xl font-bold text-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Cash Out Modal */}
      {activeModal === 'cashout' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-[#70189F]" />
                <span>Cash Out Options</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <button 
                onClick={() => {
                  setActiveModal(null);
                  onNavigateToTab('transfer', 'send');
                }}
                className="w-full p-3.5 bg-gray-50 hover:bg-purple-50 rounded-2xl flex items-center gap-3 transition text-left border border-gray-100"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#70189F] flex items-center justify-center">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-gray-900">ATM Cardless Withdrawal</h4>
                  <p className="text-[10px] text-gray-500">Generate 6-digit withdrawal code for any CBE ATM</p>
                </div>
              </button>

              <button 
                onClick={() => {
                  setActiveModal(null);
                  onNavigateToTab('transfer', 'send');
                }}
                className="w-full p-3.5 bg-gray-50 hover:bg-purple-50 rounded-2xl flex items-center gap-3 transition text-left border border-gray-100"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#70189F] flex items-center justify-center">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-gray-900">CBE Agent Cash Out</h4>
                  <p className="text-[10px] text-gray-500">Withdraw cash at authorized CBE agent location</p>
                </div>
              </button>
            </div>

            <button 
              onClick={() => setActiveModal(null)}
              className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 6. Cards Modal */}
      {activeModal === 'cards' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#70189F]" />
                <span>My CBE Cards</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-gradient-to-tr from-[#1b1c20] to-[#2c2d33] p-4 rounded-2xl text-white space-y-3 shadow-md">
              <div className="flex justify-between items-center">
                <CbeGoldenLogo className="w-6 h-6" src={customBankLogo} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Debit Card</span>
              </div>
              <div className="py-2">
                <p className="font-mono tracking-widest text-sm font-bold">5399 •••• •••• 8657</p>
                <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                  <span>EXP: 08/29</span>
                  <span>CVV: •••</span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/10 text-xs">
                <span className="font-bold">{currentUser.name}</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>
              </div>
            </div>

            <button 
              onClick={() => setActiveModal(null)}
              className="w-full bg-[#70189F] text-white py-2.5 rounded-xl font-bold text-xs hover:bg-[#530d66]"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 7. Bill Share / CBEBirr Modal */}
      {(activeModal === 'billshare' || activeModal === 'cbebirr') && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-extrabold text-sm text-gray-900">
                {activeModal === 'billshare' ? 'Bill Share with Contacts' : 'CBEBirr Wallet Integration'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              {activeModal === 'billshare' 
                ? 'Split dinner, rent or utility bills directly with family and friends on CBE mobile banking.'
                : 'Instantly transfer funds between your Commercial Bank of Ethiopia checking/savings account and your linked CBEBirr mobile wallet.'
              }
            </p>

            <button 
              onClick={() => {
                setActiveModal(null);
                onNavigateToTab('transfer', 'send');
              }}
              className="w-full bg-[#70189F] text-white py-2.5 rounded-xl font-bold text-xs hover:bg-[#530d66]"
            >
              Continue to Transfer
            </button>
          </div>
        </div>
      )}

      {/* 8. App Launcher (4-Dot Menu) Drawer Modal */}
      {showAppLauncher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-slide-up border border-gray-100">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#70189F] flex items-center justify-center text-white shadow-xs">
                  <div className="grid grid-cols-2 gap-1 p-0.5">
                    <div className="w-1.5 h-1.5 bg-white rounded-xs" />
                    <div className="w-1.5 h-1.5 bg-white rounded-xs" />
                    <div className="w-1.5 h-1.5 bg-white rounded-xs" />
                    <div className="w-1.5 h-1.5 bg-white rounded-xs" />
                  </div>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 leading-tight">App Launcher</h3>
                  <p className="text-[10px] text-gray-500 font-medium">Quick Access &amp; System Tools</p>
                </div>
              </div>
              
              <button 
                id="btn-close-app-launcher"
                onClick={() => setShowAppLauncher(false)} 
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Menu Items Grid */}
            <div className="space-y-2 pt-1">
              
              {/* 1. App Settings & Profile */}
              <button
                id="launcher-btn-settings"
                onClick={() => {
                  setShowAppLauncher(false);
                  onNavigateToTab('profile');
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 hover:bg-purple-50/70 border border-gray-100 transition group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#70189F] flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 group-hover:text-[#70189F] transition">Settings &amp; Preferences</h4>
                    <p className="text-[11px] text-gray-500">Device security, language, theme &amp; branding</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#70189F] group-hover:translate-x-0.5 transition" />
              </button>

              {/* 2. Admin Council (Only for Administrators or Leykun) */}
              {isAdmin && (
                <button
                  id="launcher-btn-admin"
                  onClick={() => {
                    setShowAppLauncher(false);
                    if (onOpenAdmin) {
                      onOpenAdmin();
                    } else {
                      onNavigateToTab('profile');
                    }
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/10 hover:from-amber-500/20 hover:to-purple-500/20 border border-amber-300/40 transition group cursor-pointer text-left shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                      <ShieldAlert className="w-5 h-5 text-slate-950" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-extrabold text-amber-950">Admin Council</h4>
                        <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                          Master Control
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-900/80">User management, audit logs, balances &amp; logo control</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-800 group-hover:translate-x-0.5 transition" />
                </button>
              )}

              {/* 3. All Transfer & Bank Services */}
              <button
                id="launcher-btn-services"
                onClick={() => {
                  setShowAppLauncher(false);
                  onNavigateToTab('transfer');
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 hover:bg-purple-50/70 border border-gray-100 transition group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 group-hover:text-emerald-800 transition">Banking &amp; Transfers</h4>
                    <p className="text-[11px] text-gray-500">Send money, other bank transfers, bill payments &amp; airtime</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition" />
              </button>

              {/* 4. Transactions & Statement History */}
              <button
                id="launcher-btn-history"
                onClick={() => {
                  setShowAppLauncher(false);
                  onNavigateToTab('history');
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 hover:bg-purple-50/70 border border-gray-100 transition group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 group-hover:text-blue-800 transition">History &amp; Statements</h4>
                    <p className="text-[11px] text-gray-500">Review official CBE transfer receipts and past logs</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition" />
              </button>

            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-medium">Logged in as {currentUser.email}</span>
              <button
                id="launcher-btn-logout"
                onClick={() => {
                  setShowAppLauncher(false);
                  onLogout();
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 p-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

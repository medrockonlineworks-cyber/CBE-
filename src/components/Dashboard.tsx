import React, { useState, useEffect } from 'react';
import { UserProfile, Transaction, SystemNotification } from '../types';
import { LocalDb, DEFAULT_CBE_LOGO } from '../lib/mockData';
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
  ArrowLeft
} from 'lucide-react';

interface DashboardProps {
  currentUser: UserProfile;
  onNavigateToTab: (tab: 'home' | 'transfer' | 'payments' | 'history' | 'profile', subTab?: string) => void;
  onSelectTransaction: (tx: Transaction) => void;
  onLogout: () => void;
}

// Custom CBE Golden Circular Logo Vector
const CbeGoldenLogo = ({ className = "w-8 h-8", src }: { className?: string; src?: string | null }) => (
  <img 
    src={src || DEFAULT_CBE_LOGO} 
    alt="Commercial Bank of Ethiopia" 
    className={`${className} object-contain`} 
    referrerPolicy="no-referrer"
  />
);

export default function Dashboard({ currentUser, onNavigateToTab, onSelectTransaction, onLogout }: DashboardProps) {
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
    setRecentTransactions(filteredTxs.sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
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
    const accountTypeName = currentUser.accountType === 'checking' ? 'Current Account' : (currentUser.accountType === 'cbe_birr' ? 'CBEBirr Wallet' : 'Wadiah Staff Sa 1');
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
    <div id="cbe-dashboard-screen" className="max-w-md mx-auto bg-gray-50 min-h-screen pb-24 relative font-sans select-none">
      
      {/* 1. TOP CBE PURPLE HEADER CONTAINER */}
      <header className="bg-[#61167e] text-white pt-6 pb-20 px-4 relative shadow-md">
        
        {/* Top App Bar Row */}
        <div className="flex items-center justify-between gap-2">
          
          {/* Left: Back Arrow + Grid/Apps Icon + User Greeting */}
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => onNavigateToTab('profile')}
              className="p-1 text-white hover:text-purple-200 transition cursor-pointer"
              title="Menu"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>

            <button 
              onClick={() => onNavigateToTab('transfer')}
              className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center hover:bg-white/25 transition cursor-pointer border border-white/20"
              title="All Services"
            >
              <div className="grid grid-cols-2 gap-0.5">
                <div className="w-1.5 h-1.5 bg-white rounded-xs" />
                <div className="w-1.5 h-1.5 bg-white rounded-xs" />
                <div className="w-1.5 h-1.5 bg-white rounded-xs" />
                <div className="w-1.5 h-1.5 bg-white rounded-xs" />
              </div>
            </button>

            <div>
              <p className="text-[11px] text-purple-200/90 font-medium leading-none">Hello,</p>
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
              className="bg-white/15 hover:bg-white/25 border border-white/20 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 text-white transition cursor-pointer"
            >
              <span>{selectedLanguage}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>

            {/* Refresh Button */}
            <button 
              onClick={handleRefresh}
              className={`w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition cursor-pointer ${refreshing ? 'animate-spin' : ''}`}
              title="Refresh Balance"
            >
              <RotateCw className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Search Button */}
            <button 
              onClick={() => setShowSearchModal(true)}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition cursor-pointer"
              title="Search Transactions & Services"
            >
              <Search className="w-4 h-4 stroke-[2.5]" />
            </button>

          </div>
        </div>

        {/* 2. THE FLOATING DARK CBE ACCOUNT CARD */}
        <div className="mt-4 relative z-10">
          <div className="bg-[#18191c] rounded-3xl p-5 shadow-2xl text-white relative overflow-hidden border border-white/10">
            
            {/* Subtle Textured Background Grid */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />
            <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Card Header: Emblem + Commercial Bank of Ethiopia (in ONE single line) */}
            <div className="flex items-center gap-2.5 relative z-10 min-w-0">
              <CbeGoldenLogo className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0" src={customBankLogo} />
              <div className="min-w-0 flex-1">
                <h3 className="text-[#deb356] font-extrabold text-xs sm:text-sm tracking-wide leading-none whitespace-nowrap overflow-hidden text-ellipsis">
                  Commercial Bank of Ethiopia
                </h3>
                <p className="text-[#deb356]/80 text-[9px] sm:text-[10px] font-medium tracking-tight mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                  The bank you can always rely on!
                </p>
              </div>
            </div>

            {/* Card Center: Balance & Eye Toggle */}
            <div className="my-5 flex justify-between items-center relative z-10">
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-extrabold tracking-wider font-mono text-white">
                  {showBalance ? currentUser.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '******'}
                </span>
                <span className="text-sm font-bold text-gray-300 font-mono">ETB</span>
              </div>

              <button 
                id="btn-toggle-balance"
                onClick={toggleBalance}
                className="p-1.5 text-gray-400 hover:text-white transition cursor-pointer"
                title={showBalance ? "Hide Balance & Account" : "Show Balance & Account"}
              >
                {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>

            {/* Card Bottom: Account Type & Masked/Unmasked Number with Copy Button */}
            <div className="flex justify-between items-center text-xs text-gray-300 relative z-10 font-mono">
              <span className="font-semibold tracking-wide text-gray-200">
                {formatCardAccount()}
              </span>
              <button 
                onClick={copyAccountNum}
                className="hover:text-amber-400 text-gray-400 p-1 transition cursor-pointer flex items-center gap-1"
                title="Copy Account Number"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Card Timestamp: True live current date & time */}
            <div className="mt-3 text-center text-[10px] text-gray-400/90 font-mono tracking-wide">
              {formatCardDateTime(currentDateTime)}
            </div>

          </div>

          {/* Carousel Indicator Dots */}
          <div className="flex justify-center items-center gap-1.5 mt-3">
            <div className="w-6 h-1.5 bg-[#deb356] rounded-full" />
            <div className="w-1.5 h-1.5 bg-purple-300/40 rounded-full" />
            <div className="w-1.5 h-1.5 bg-purple-300/40 rounded-full" />
          </div>

        </div>

      </header>

      {/* 3. MAIN WHITE CURVED SHEET */}
      <main className="bg-[#f8f9fc] -mt-10 rounded-t-[32px] pt-6 px-4 pb-12 shadow-md relative z-20 space-y-6">
        
        {/* ROW 1: 4 Circular Quick Action Buttons */}
        <div className="flex items-start justify-between gap-1 px-1">
          
          {/* 1. Cash Out */}
          <button 
            onClick={() => setActiveModal('cashout')}
            className="flex flex-col items-center flex-1 group cursor-pointer"
          >
            <div className="w-13 h-13 rounded-full bg-white border border-[#61167e]/30 shadow-xs flex items-center justify-center text-[#61167e] transition group-hover:scale-105 group-active:scale-95 group-hover:border-[#61167e]">
              <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-bold text-[#61167e] mt-2 text-center leading-tight">
              Cash Out
            </span>
          </button>

          {/* 2. Mini Statement */}
          <button 
            onClick={() => setActiveModal('ministatement')}
            className="flex flex-col items-center flex-1 group cursor-pointer"
          >
            <div className="w-13 h-13 rounded-full bg-white border border-[#61167e]/30 shadow-xs flex items-center justify-center text-[#61167e] transition group-hover:scale-105 group-active:scale-95 group-hover:border-[#61167e]">
              <FileText className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-bold text-[#61167e] mt-2 text-center leading-tight">
              Mini Satement
            </span>
          </button>

          {/* 3. Cards */}
          <button 
            onClick={() => setActiveModal('cards')}
            className="flex flex-col items-center flex-1 group cursor-pointer"
          >
            <div className="w-13 h-13 rounded-full bg-white border border-[#61167e]/30 shadow-xs flex items-center justify-center text-[#61167e] transition group-hover:scale-105 group-active:scale-95 group-hover:border-[#61167e]">
              <CreditCard className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-bold text-[#61167e] mt-2 text-center leading-tight">
              Cards
            </span>
          </button>

          {/* 4. Bill Share */}
          <button 
            onClick={() => setActiveModal('billshare')}
            className="flex flex-col items-center flex-1 group cursor-pointer"
          >
            <div className="w-13 h-13 rounded-full bg-white border border-[#61167e]/30 shadow-xs flex items-center justify-center text-[#61167e] transition group-hover:scale-105 group-active:scale-95 group-hover:border-[#61167e]">
              <GitFork className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-bold text-[#61167e] mt-2 text-center leading-tight">
              Bill Share
            </span>
          </button>

          {/* Small Arrow Carousel Button */}
          <button 
            onClick={() => onNavigateToTab('transfer')}
            className="w-7 h-7 mt-3 rounded-full bg-white border border-gray-200 shadow-xs flex items-center justify-center text-gray-400 hover:text-[#61167e] transition cursor-pointer"
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
            className="bg-white hover:bg-purple-50/30 p-4 rounded-2xl border border-gray-100/90 shadow-sm flex items-center gap-3 transition text-left cursor-pointer active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 flex-shrink-0">
              <ArrowUpRight className="w-6 h-6 stroke-[2.8]" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-gray-900 leading-tight">CBE Transfer</h4>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Send Money</p>
            </div>
          </button>

          {/* Card 2: Receive */}
          <button 
            id="action-receive"
            onClick={() => setActiveModal('receive')}
            className="bg-white hover:bg-purple-50/30 p-4 rounded-2xl border border-gray-100/90 shadow-sm flex items-center gap-3 transition text-left cursor-pointer active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-gray-900 leading-tight">Receive</h4>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Get Paid</p>
            </div>
          </button>

          {/* Card 3: Airtime */}
          <button 
            id="action-airtime"
            onClick={() => onNavigateToTab('transfer', 'airtime')}
            className="bg-white hover:bg-purple-50/30 p-4 rounded-2xl border border-gray-100/90 shadow-sm flex flex-col items-center justify-center text-center transition cursor-pointer active:scale-[0.98] py-5"
          >
            <Phone className="w-7 h-7 text-[#61167e] fill-[#61167e]" />
            <h4 className="font-extrabold text-sm text-gray-900 mt-2">Airtime</h4>
          </button>

          {/* Card 4: Other Transfers */}
          <button 
            id="action-other-transfers"
            onClick={() => onNavigateToTab('transfer', 'send')}
            className="bg-white hover:bg-purple-50/30 p-4 rounded-2xl border border-gray-100/90 shadow-sm flex flex-col items-center justify-center text-center transition cursor-pointer active:scale-[0.98] py-5"
          >
            <ArrowLeftRight className="w-7 h-7 text-[#61167e] stroke-[2.5]" />
            <h4 className="font-extrabold text-sm text-gray-900 mt-2">Other Transfers</h4>
          </button>

          {/* Card 5: CBEBirr */}
          <button 
            id="action-cbebirr"
            onClick={() => setActiveModal('cbebirr')}
            className="bg-white hover:bg-purple-50/30 p-4 rounded-2xl border border-gray-100/90 shadow-sm flex flex-col items-center justify-center text-center transition cursor-pointer active:scale-[0.98] py-5"
          >
            <Wallet className="w-7 h-7 text-[#61167e] stroke-[2.5]" />
            <h4 className="font-extrabold text-sm text-gray-900 mt-2">CBEBirr</h4>
          </button>

          {/* Card 6: Bills & Utilities */}
          <button 
            id="action-bills-utilities"
            onClick={() => onNavigateToTab('payments')}
            className="bg-white hover:bg-purple-50/30 p-4 rounded-2xl border border-gray-100/90 shadow-sm flex flex-col items-center justify-center text-center transition cursor-pointer active:scale-[0.98] py-5"
          >
            <ReceiptIcon className="w-7 h-7 text-[#61167e] stroke-[2.5]" />
            <h4 className="font-extrabold text-sm text-gray-900 mt-2">Bills &amp; Utilities</h4>
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
                <Globe className="w-4 h-4 text-[#61167e]" />
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
                    selectedLanguage === lang.code ? 'bg-[#61167e] text-white' : 'hover:bg-purple-50 text-gray-700'
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
                    <span className="text-xs font-bold font-mono text-[#61167e]">
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
                <FileText className="w-5 h-5 text-[#61167e]" />
                <h3 className="font-extrabold text-sm text-gray-900">Mini Statement</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-purple-50 p-3 rounded-2xl flex justify-between items-center text-xs">
              <div>
                <p className="text-purple-700 font-medium">Account</p>
                <p className="font-mono font-bold text-[#61167e]">{currentUser.accountNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-purple-700 font-medium">Available Balance</p>
                <p className="font-mono font-black text-[#61167e]">ETB {currentUser.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {recentTransactions.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No recent transactions recorded.</p>
              ) : (
                recentTransactions.slice(0, 5).map(tx => (
                  <button
                    key={tx.id}
                    onClick={() => {
                      setActiveModal(null);
                      onSelectTransaction(tx);
                    }}
                    className="w-full text-left p-2.5 bg-gray-50 hover:bg-purple-50/50 rounded-xl flex justify-between items-center transition border border-gray-100"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-900">{tx.recipientName}</p>
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
              className="w-full bg-[#61167e] text-white py-2.5 rounded-xl font-bold text-xs hover:bg-[#52106b] transition cursor-pointer"
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
                <QrCode className="w-36 h-36 text-[#61167e]" />
              </div>
              <p className="font-extrabold text-sm text-gray-900 mt-3">{currentUser.name}</p>
              <p className="text-xs font-mono font-bold text-[#61167e] mt-0.5">{currentUser.accountNumber}</p>
              <span className="text-[10px] text-gray-500 mt-1 whitespace-nowrap">Commercial Bank of Ethiopia (CBE)</span>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={copyAccountNum}
                className="flex-1 bg-purple-50 text-[#61167e] hover:bg-purple-100 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Account'}</span>
              </button>
              <button 
                onClick={() => setActiveModal(null)}
                className="flex-1 bg-[#61167e] text-white hover:bg-[#52106b] py-2.5 rounded-xl font-bold text-xs transition"
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
                <ArrowUpRight className="w-5 h-5 text-[#61167e]" />
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
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#61167e] flex items-center justify-center">
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
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#61167e] flex items-center justify-center">
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
                <CreditCard className="w-5 h-5 text-[#61167e]" />
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
              className="w-full bg-[#61167e] text-white py-2.5 rounded-xl font-bold text-xs hover:bg-[#52106b]"
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
              className="w-full bg-[#61167e] text-white py-2.5 rounded-xl font-bold text-xs hover:bg-[#52106b]"
            >
              Continue to Transfer
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

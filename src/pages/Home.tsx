import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import AccountCard from '../components/AccountCard';
import QuickActions from '../components/QuickActions';
import ServiceGrid from '../components/ServiceGrid';
import QRButton from '../components/QRButton';
import BottomNavigation, { NavTabId } from '../components/BottomNavigation';
import { 
  X, 
  Check, 
  Copy, 
  ArrowUpRight, 
  ArrowDownLeft, 
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
  ExternalLink
} from 'lucide-react';
import { UserProfile, Transaction } from '../types';
import { LocalDb } from '../lib/mockData';

interface HomeProps {
  currentUser?: UserProfile | null;
  onNavigateToTab?: (tab: 'home' | 'transfer' | 'payments' | 'history' | 'profile', subTab?: string) => void;
  onSelectTransaction?: (tx: Transaction) => void;
  onOpenAdmin?: () => void;
}

export const Home: React.FC<HomeProps> = ({
  currentUser: propUser,
  onNavigateToTab,
  onSelectTransaction,
  onOpenAdmin,
}) => {
  // Fallback demo user if none passed in
  const currentUser: UserProfile = propUser || {
    id: 'demo-user-1',
    name: 'Abdurahman',
    email: 'abdurahman@cbe.et',
    phone: '+251911234567',
    accountNumber: '1000284758657',
    accountType: 'wadiah',
    balance: 25430.00,
    availableBalance: 25430.00,
    currency: 'ETB',
    role: 'user',
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  const [activeNavTab, setActiveNavTab] = useState<NavTabId>('home');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState('01 Jul 2026 • 10:14 AM');
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);

  // Active Interactive Modal state
  const [activeModal, setActiveModal] = useState<
    'qr' | 'search' | 'menu' | 'cashout' | 'ministatement' | 'cards' | 'billshare' | 'cbe-transfer' | 'receive' | 'airtime' | 'other-transfers' | 'cbebirr' | 'bills-utilities' | 'banking' | 'government-services' | 'pay-merchant' | 'travel' | 'shopping' | 'entertainment' | 'tax-payment' | null
  >(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [qrScanSuccess, setQrScanSuccess] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    setCustomLogoUrl(LocalDb.getCustomBankLogo());
    loadTransactions();

    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      };
      setCurrentDateTime(now.toLocaleDateString('en-GB', options).replace(',', ' •'));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadTransactions = () => {
    const txs = LocalDb.getTransactions();
    setRecentTransactions(txs.slice(0, 6));
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadTransactions();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 650);
  };

  // Nav handler for 5-element bottom bar
  const handleNavTabChange = (tab: NavTabId) => {
    setActiveNavTab(tab);
    if (tab === 'home') {
      setActiveNavTab('home');
    } else if (tab === 'transfer') {
      onNavigateToTab?.('transfer');
    } else if (tab === 'payments') {
      onNavigateToTab?.('payments');
    } else if (tab === 'history') {
      onNavigateToTab?.('history');
    } else if (tab === 'profile') {
      onNavigateToTab?.('profile');
    }
  };

  // Service grid handler
  const handleServiceSelect = (serviceId: string) => {
    if (serviceId === 'cbe-transfer' && onNavigateToTab) {
      onNavigateToTab('transfer', 'send');
    } else if (serviceId === 'bills-utilities' && onNavigateToTab) {
      onNavigateToTab('payments');
    } else if (serviceId === 'airtime' && onNavigateToTab) {
      onNavigateToTab('transfer', 'airtime');
    } else {
      setActiveModal(serviceId as any);
    }
  };

  // Quick action handler
  const handleQuickAction = (actionId: 'cashout' | 'ministatement' | 'cards' | 'billshare') => {
    setActiveModal(actionId);
  };

  // Extract first name for greeting
  const firstName = currentUser.name.split(' ')[0] || 'Abdurahman';

  return (
    <div className="min-h-full w-full bg-[#F7F7F7] font-sans relative flex flex-col justify-between overflow-x-hidden text-gray-900 pb-28 select-none">
      
      {/* ========================================================
          HERO BACKGROUND WITH SMOOTH CURVED WAVE TRANSITION
          Layer 0: Purple Gradient Container
          Layer 1: Smooth SVG Wave curving down and into white
          Layer 2: Content Area (White background)
          Layer 10: Black Account Card floating over the transition
          ======================================================== */}
      <div 
        className="hero-background absolute top-0 left-0 right-0 h-[280px] sm:h-[300px] pointer-events-none z-0 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #70189F 0%, #8420AE 55%, #8E29B9 100%)',
        }}
      >
        {/* Soft Ambient Glow Elements */}
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute top-20 -right-20 w-80 h-80 rounded-full bg-[#8E29B9]/30 blur-3xl pointer-events-none" />

        {/* SVG Smooth Curved Transition Wave (Purple to #F7F7F7 Page Background) */}
        <svg
          className="hero-curve absolute bottom-0 left-0 w-full h-[140px] sm:h-[160px] text-[#F7F7F7]"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          fill="currentColor"
        >
          {/* Asymmetric organic wave sloping gently from left to right as in the reference */}
          <path d="M0,192L48,181.3C96,171,192,149,288,160C384,171,480,213,576,224C672,235,768,213,864,186.7C960,160,1056,128,1152,122.7C1248,117,1344,139,1392,149.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
      </div>

      {/* ========================================================
          MAIN SCREEN CONTENT
          ======================================================== */}
      <div className="relative z-10 flex flex-col w-full">
        {/* 1. TOP HEADER (Inside Purple Hero Section) */}
        <Header
          userName={firstName}
          onOpenMenu={() => setActiveModal('menu')}
          onRefresh={handleRefresh}
          onOpenSearch={() => setActiveModal('search')}
          selectedLanguage={selectedLanguage}
          onChangeLanguage={(lang) => setSelectedLanguage(lang)}
          isRefreshing={isRefreshing}
        />

        {/* 2. BLACK ACCOUNT CARD (Floating & Overlapping Curve) */}
        <main className="w-full mt-2 sm:mt-3 flex flex-col">
          <AccountCard
            bankName="Commercial Bank of Ethiopia"
            slogan="The bank you can always rely on!"
            balance={currentUser.balance}
            currency={currentUser.currency || 'ETB'}
            accountType="Saving Account"
            accountNumber={currentUser.accountNumber}
            dateTimeString={currentDateTime}
            showBalanceDefault={false}
            customLogoUrl={customLogoUrl}
          />

          {/* 3. FOUR CIRCULAR QUICK ACTION BUTTONS */}
          <QuickActions onActionClick={handleQuickAction} />

          {/* 4. MAIN TWO-COLUMN SERVICE GRID */}
          <ServiceGrid onServiceSelect={handleServiceSelect} />
        </main>
      </div>

      {/* ========================================================
          5. FIXED BOTTOM NAVIGATION BAR (Scan QR floating + Home, Transaction, Setting)
          ======================================================== */}
      <BottomNavigation
        activeTab={activeNavTab}
        onChangeTab={handleNavTabChange}
        onOpenScanQr={() => setActiveModal('qr')}
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
                    onNavigateToTab?.('transfer', 'send');
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
                <span className="font-semibold">My Account: {currentUser.accountNumber.slice(-4)}</span>
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
                placeholder="Search transfer, bill, account..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-2.5 pl-4 pr-10 text-xs font-semibold focus:outline-none focus:border-[#711A9F] focus:bg-white"
              />
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
                <CreditCard className="w-5 h-5 text-[#711A9F] mb-1.5" />
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
              <span>A/C: {currentUser.accountNumber}</span>
              <span className="font-bold text-[#711A9F]">{currentUser.balance.toLocaleString()} ETB</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 my-2">
              {recentTransactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">No recent transactions recorded.</div>
              ) : (
                recentTransactions.map((tx) => (
                  <div 
                    key={tx.id} 
                    onClick={() => {
                      setActiveModal(null);
                      onSelectTransaction?.(tx);
                    }}
                    className="py-2.5 px-1 flex items-center justify-between hover:bg-gray-50 rounded-xl transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        tx.senderId === currentUser.id ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {tx.senderId === currentUser.id ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 truncate max-w-[140px]">{tx.recipientName || 'CBE Transfer'}</p>
                        <p className="text-[10px] text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-extrabold ${tx.senderId === currentUser.id ? 'text-red-600' : 'text-emerald-600'}`}>
                        {tx.senderId === currentUser.id ? '-' : '+'}{tx.amount.toLocaleString()} ETB
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
                  <span className="font-bold uppercase">{currentUser.name}</span>
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
              <p className="text-sm font-bold text-gray-900">{currentUser.name}</p>
              <p className="text-xs font-mono text-[#711A9F] font-bold">A/C: {currentUser.accountNumber}</p>
              <p className="text-[11px] text-gray-400">Commercial Bank of Ethiopia</p>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(currentUser.accountNumber);
                alert('Account number copied to clipboard!');
              }}
              className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
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
                  <p className="text-xs font-mono text-[#711A9F] font-bold">{currentUser.phone || '+251 91 123 4567'}</p>
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

    </div>
  );
};

export default Home;

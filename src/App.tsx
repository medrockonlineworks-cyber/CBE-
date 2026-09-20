import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, Transaction } from './types';
import { LocalDb } from './lib/mockData';
import Auth from './components/Auth';
import Home from './pages/Home';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Payments from './components/Payments';
import History from './components/History';
import Profile from './components/Profile';
import Receipt from './components/Receipt';
import AdminPanel from './components/AdminPanel';
import SmsPage from './pages/SmsPage';
import TruecallerSimulator from './components/TruecallerSimulator';
import PhoneCallApp from './components/PhoneCallApp';
import DashenBankApp from './components/DashenBankApp';
import TelebirrApp from './components/TelebirrApp';
import TelegramSimulatorApp from './components/telegram/TelegramSimulatorApp';
import { PhoneCallService } from './services/phoneCallService';
import { SmsService } from './services/smsService';
import Navigation, { TabType } from './components/Navigation';
import OfflineBanner from './components/OfflineBanner';
import PhoneStatusBar from './components/PhoneStatusBar';
import PhoneSettingsModal from './components/PhoneSettingsModal';

export default function App() {
  // Authentication & View Session States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const users = LocalDb.getUsers();
      const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('tana_active_user_id') : null;
      if (savedUserId) {
        const match = users.find(u => u.id === savedUserId);
        if (match && match.status !== 'suspended') return match;
      }
      return users[0] || null;
    } catch {
      return null;
    }
  });
  const [activeView, setActiveView] = useState<'auth' | 'main' | 'receipt' | 'admin' | 'sms' | 'truecaller' | 'phone' | 'dashen' | 'telebirr' | 'telegram'>(() => {
    if (typeof window !== 'undefined') {
      const path = (window.location.pathname || '').toLowerCase();
      const search = new URLSearchParams(window.location.search);
      const appParam = (search.get('app') || search.get('view') || '').toLowerCase();
      const hash = (window.location.hash || '').toLowerCase();

      if (path === '/sms' || appParam === 'sms' || hash === '#sms' || hash === '#/sms') return 'sms';
      if (path === '/truecaller' || appParam === 'truecaller' || hash === '#truecaller' || hash === '#/truecaller') return 'truecaller';
      if (path === '/phone' || appParam === 'phone' || hash === '#phone' || hash === '#/phone') return 'phone';
      if (path === '/dashen' || appParam === 'dashen' || hash === '#dashen' || hash === '#/dashen') return 'dashen';
      if (path === '/telebirr' || appParam === 'telebirr' || hash === '#telebirr' || hash === '#/telebirr') return 'telebirr';
      if (path === '/telegram' || appParam === 'telegram' || hash === '#telegram' || hash === '#/telegram') return 'telegram';
      if (path === '/admin' || appParam === 'admin' || hash === '#admin') return 'admin';

      // Restore last active app from localStorage
      try {
        const savedView = localStorage.getItem('tana_active_view');
        if (savedView && ['main', 'dashen', 'telebirr', 'sms', 'truecaller', 'phone', 'admin', 'telegram'].includes(savedView)) {
          return savedView as any;
        }
      } catch {
        // Ignore storage errors
      }
    }
    return 'telegram';
  });
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [returnTab, setReturnTab] = useState<TabType>('home');
  const [isPhoneSettingsOpen, setIsPhoneSettingsOpen] = useState<boolean>(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [initialTxTab, setInitialTxTab] = useState<'send' | 'transfer' | 'merchant' | 'receive' | 'airtime'>('send');
  const [smsActiveAccountId, setSmsActiveAccountId] = useState<string | undefined>(undefined);

  // Track navigation state to manage Android / browser history correctly
  const navHistoryRef = useRef<{ view: string; tab: string }[]>([]);

  // Navigation pusher that keeps browser history in sync with Android back-button
  const navigateTo = useCallback((view: 'auth' | 'main' | 'receipt' | 'admin' | 'sms' | 'truecaller' | 'phone' | 'dashen' | 'telebirr' | 'telegram', tab: TabType = activeTab) => {
    if (activeView === 'main') {
      setReturnTab(activeTab);
    }
    setActiveView(view);
    setActiveTab(tab);
    
    try {
      localStorage.setItem('tana_active_view', view);
      localStorage.setItem('tana_active_tab', tab);
      const stateObj = { view, tab };
      const targetPath = view === 'sms' 
        ? '/sms' 
        : (view === 'truecaller' 
          ? '/truecaller' 
          : (view === 'phone' 
            ? '/phone' 
            : (view === 'dashen' 
              ? '/dashen' 
              : (view === 'telebirr'
                ? '/telebirr'
                : (view === 'telegram'
                  ? '/telegram'
                  : (['/sms', '/truecaller', '/phone', '/dashen', '/telebirr', '/telegram'].includes(window.location.pathname) ? '/' : window.location.pathname))))));
      window.history.pushState(stateObj, '', targetPath);
      navHistoryRef.current.push(stateObj);
    } catch {
      // Ignore if history state fails in sandboxed iframe
    }
  }, [activeTab]);

  // Android Back Navigation handler
  useEffect(() => {
    // Push initial entry
    try {
      const initialPath = window.location.pathname;
      window.history.replaceState({ view: activeView, tab: activeTab }, '', initialPath);
    } catch {}

    const handlePopState = (e: PopStateEvent) => {
      // If user was on SMS, Truecaller, Phone, Dashen, Telebirr or Telegram view
      if (activeView === 'sms' || activeView === 'truecaller' || activeView === 'phone' || activeView === 'dashen' || activeView === 'telebirr' || activeView === 'telegram') {
        setActiveView('main');
        setActiveTab('profile');
      } else if (activeView === 'receipt') {
        setActiveView('main');
      } else if (activeView === 'admin') {
        setActiveView('main');
        setActiveTab('profile');
      } else if (activeView === 'main' && activeTab !== 'home') {
        setActiveTab('home');
      } else if (e.state && e.state.view) {
        setActiveView(e.state.view);
        if (e.state.tab) setActiveTab(e.state.tab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeView, activeTab]);

  // Try auto restoring session on mount
  useEffect(() => {
    const savedUserId = localStorage.getItem('tana_active_user_id');
    if (savedUserId) {
      const users = LocalDb.getUsers();
      const match = users.find(u => u.id === savedUserId);
      if (match) {
        if (match.status === 'suspended') {
          localStorage.removeItem('tana_active_user_id');
          alert('Your account is currently suspended.');
        } else {
          setCurrentUser(match);
          setActiveView('main');
        }
      }
    }
  }, []);

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('tana_active_user_id', user.id);
    navigateTo('main', 'home');
  };

  const handleLogout = () => {
    if (currentUser) {
      LocalDb.addAuditLog(currentUser.id, currentUser.email, 'USER_LOGOUT', 'User logged out and destroyed local authentication session.');
    }
    setCurrentUser(null);
    localStorage.removeItem('tana_active_user_id');
    localStorage.removeItem('tana_pending_user_id');
    navigateTo('auth', 'home');
  };

  const handleUpdateUserProfile = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
  };

  const handleSelectTransaction = (tx: Transaction) => {
    setSelectedTransaction(tx);
    navigateTo('receipt', activeTab);
  };

  // Callback after completing any Send, Transfer, Bill or Airtime payment
  const handleTransactionComplete = (tx: Transaction) => {
    setSelectedTransaction(tx);
    const cleanSender = tx.senderAccount ? tx.senderAccount.replace(/\D/g, '') : '1000419524747';
    setSmsActiveAccountId(cleanSender);
    navigateTo('receipt', activeTab);
    
    // Refresh current user balance from database
    if (currentUser) {
      const users = LocalDb.getUsers();
      const match = users.find(u => u.id === currentUser.id);
      if (match) {
        setCurrentUser(match);
      }
    }

    // Ensure simulated SMS is generated (idempotent duplicate prevention in SmsService)
    try {
      SmsService.createSmsFromTransaction(tx, currentUser?.balance);
    } catch (smsErr) {
      console.error('[SmsService] Non-blocking completion SMS error:', smsErr);
    }

    // Ensure PhoneCallService syncs caller accounts so recent transaction is at the top with Now badge
    try {
      PhoneCallService.syncTransactionToCallerApp(tx);
    } catch (callErr) {
      console.error('[PhoneCallService] Non-blocking caller account sync error:', callErr);
    }
  };

  // View Router Render Picker
  const renderTabContent = () => {
    const activeUser = currentUser || {
      id: 'demo-user-1',
      name: 'Abdurahman',
      email: 'abdurahman@cbe.et',
      phone: '+251911234567',
      accountNumber: '1000284758657',
      accountType: 'wadiah' as const,
      balance: 25430.00,
      availableBalance: 25430.00,
      currency: 'ETB',
      role: 'user' as const,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    switch (activeTab) {
      case 'home':
        return (
          <Home 
            currentUser={activeUser}
            onNavigateToTab={(tab, subTab) => {
              setActiveTab(tab);
              if (tab === 'transfer' && subTab) {
                setInitialTxTab(subTab as any);
              }
              try {
                window.history.pushState({ view: 'main', tab }, '', window.location.pathname);
              } catch {}
            }}
            onSelectTransaction={handleSelectTransaction}
            onOpenAdmin={() => navigateTo('admin', 'home')}
            onOpenSmsSimulator={() => navigateTo('sms', 'home')}
            onOpenTruecallerSimulator={() => navigateTo('truecaller', 'home')}
            onOpenPhoneApp={() => navigateTo('phone', 'home')}
            onOpenDashenApp={() => navigateTo('dashen', 'home')}
            onOpenTelebirrApp={() => navigateTo('telebirr', 'home')}
            onOpenTelegramSimulator={() => navigateTo('telegram', 'home')}
          />
        );
      case 'transfer':
        return (
          <Transactions 
            currentUser={activeUser}
            onTransactionComplete={handleTransactionComplete}
            onSelectTransaction={handleSelectTransaction}
            onBack={() => setActiveTab('home')}
            initialTab={initialTxTab}
          />
        );
      case 'payments':
        return (
          <Payments 
            currentUser={activeUser}
            onPaymentComplete={handleTransactionComplete}
          />
        );
      case 'history':
        return (
          <Home 
            currentUser={activeUser}
            initialNavTab="history"
            onNavigateToTab={(tab, subTab) => {
              setActiveTab(tab);
              if (tab === 'transfer' && subTab) {
                setInitialTxTab(subTab as any);
              }
              try {
                window.history.pushState({ view: 'main', tab }, '', window.location.pathname);
              } catch {}
            }}
            onSelectTransaction={handleSelectTransaction}
            onOpenAdmin={() => navigateTo('admin', 'history')}
            onOpenSmsSimulator={() => navigateTo('sms', 'history')}
            onOpenTruecallerSimulator={() => navigateTo('truecaller', 'history')}
            onOpenPhoneApp={() => navigateTo('phone', 'history')}
            onOpenDashenApp={() => navigateTo('dashen', 'history')}
            onOpenTelebirrApp={() => navigateTo('telebirr', 'history')}
            onOpenTelegramSimulator={() => navigateTo('telegram', 'history')}
          />
        );
      case 'profile':
        return (
          <Profile 
            currentUser={activeUser}
            onLogout={handleLogout}
            onUpdateUser={handleUpdateUserProfile}
            onOpenAdmin={() => navigateTo('admin', 'profile')}
            onOpenSmsSimulator={() => navigateTo('sms', 'profile')}
            onOpenTruecallerSimulator={() => navigateTo('truecaller', 'profile')}
            onOpenPhoneApp={() => navigateTo('phone', 'profile')}
            onOpenDashenApp={() => navigateTo('dashen', 'profile')}
            onOpenTelebirrApp={() => navigateTo('telebirr', 'profile')}
            onOpenTelegramApp={() => navigateTo('telegram', 'profile')}
          />
        );
      default:
        return (
          <Home 
            currentUser={activeUser}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onOpenSmsSimulator={() => navigateTo('sms', 'home')}
            onOpenTruecallerSimulator={() => navigateTo('truecaller', 'home')}
            onOpenPhoneApp={() => navigateTo('phone', 'home')}
            onOpenDashenApp={() => navigateTo('dashen', 'home')}
            onOpenTelebirrApp={() => navigateTo('telebirr', 'home')}
            onOpenTelegramSimulator={() => navigateTo('telegram', 'home')}
          />
        );
    }
  };

  return (
    <div id="app-root-wrapper" className="h-[100dvh] max-h-[100dvh] w-full bg-slate-950 flex flex-col items-center justify-center p-0 md:p-6 font-sans overflow-hidden antialiased select-none">
      
      {/* Background Ambient Gradients for Desktop */}
      <div className="hidden md:block absolute -left-20 top-20 w-80 h-80 bg-purple-700/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="hidden md:block absolute -right-20 bottom-20 w-96 h-96 bg-amber-400/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Quick App Switcher Dock: Instant 1-Click Access to Ethiopian Banking & Telecom Apps */}
      <nav aria-label="Apps Switcher" className="hidden md:flex items-center gap-1.5 mb-2.5 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-full shadow-lg z-40 backdrop-blur-md">
        <button
          onClick={() => navigateTo('main', 'home')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeView === 'main' ? 'bg-[#70189F] text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          CBE Birr
        </button>
        <button
          onClick={() => navigateTo('telebirr')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeView === 'telebirr' ? 'bg-[#6cb81f] text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-lime-200" />
          Telebirr
        </button>
        <button
          onClick={() => navigateTo('telegram')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeView === 'telegram' ? 'bg-[#229ED9] text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-sky-300" />
          Telegram
        </button>
        <button
          onClick={() => navigateTo('dashen')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeView === 'dashen' ? 'bg-[#004b87] text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-sky-300" />
          Dashen Amole
        </button>
        <button
          onClick={() => navigateTo('sms')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeView === 'sms' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          SMS & Alerts
        </button>
        <button
          onClick={() => navigateTo('phone')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeView === 'phone' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          Phone (*889#)
        </button>
        <button
          onClick={() => navigateTo('truecaller')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeView === 'truecaller' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          Truecaller
        </button>
      </nav>


      {/* Main Responsive Android-Ready App Canvas */}
      <div 
        id="app-main-canvas"
        className="w-full max-w-md bg-gray-50 h-[100dvh] max-h-[100dvh] md:h-[840px] md:max-h-[880px] md:rounded-3xl md:shadow-2xl relative flex flex-col overflow-hidden border-0 md:border md:border-slate-800/60 pt-safe pb-safe"
      >
        {/* Real-time Offline Warning Banner */}
        <OfflineBanner />

        {/* Dynamic View Panel Router */}
        <main className={`flex-1 flex flex-col scrollbar-none ${
          activeView === 'admin'
            ? 'h-full overflow-y-auto overflow-x-hidden bg-slate-900 w-full max-w-full min-w-0'
            : activeView === 'sms' 
            ? 'h-full overflow-hidden bg-[#121212]' 
            : activeView === 'truecaller'
              ? 'h-full overflow-hidden bg-slate-950'
              : activeView === 'phone'
                ? 'h-full overflow-hidden bg-black'
                : activeView === 'dashen'
                  ? 'h-full overflow-hidden bg-[#040b18]'
                  : activeView === 'telebirr'
                    ? 'h-full overflow-hidden bg-white'
                    : activeView === 'telegram'
                      ? 'h-full overflow-hidden bg-slate-900'
                      : activeTab === 'home' || activeTab === 'history' 
                      ? 'overflow-hidden h-full' 
                      : 'overflow-y-auto bg-gray-50'
        }`}>
          
          {activeView === 'auth' && (
            <Auth onLoginSuccess={handleLoginSuccess} />
          )}

          {activeView === 'main' && (
            <div className={`flex-1 flex flex-col relative ${activeTab === 'home' || activeTab === 'history' ? 'h-full overflow-hidden' : 'pb-28'}`}>
              {renderTabContent()}
              
              {/* Floating bottom navigation for secondary sub-tabs */}
              {activeTab !== 'home' && activeTab !== 'history' && (
                <Navigation 
                  activeTab={activeTab}
                  onChangeTab={(tab) => {
                    setActiveTab(tab);
                    try {
                      window.history.pushState({ view: 'main', tab }, '', window.location.pathname);
                    } catch {}
                    // Quick refresh of session model when tab changes
                    if (currentUser) {
                      const users = LocalDb.getUsers();
                      const match = users.find(u => u.id === currentUser.id);
                      if (match) {
                        setCurrentUser(match);
                      }
                    }
                  }}
                  currentUser={currentUser || undefined}
                  onOpenAdmin={() => navigateTo('admin', 'profile')}
                  showScanQr={false}
                />
              )}
            </div>
          )}

          {activeView === 'receipt' && selectedTransaction && (
            <Receipt 
              transaction={selectedTransaction}
              onBack={() => {
                setActiveView('main');
              }}
            />
          )}

          {activeView === 'admin' && currentUser && (
            <AdminPanel 
              currentUser={currentUser}
              onBack={() => {
                // Refresh profile data just in case admin updated their parameters
                const users = LocalDb.getUsers();
                const match = users.find(u => u.id === currentUser.id);
                if (match) {
                  setCurrentUser(match);
                }
                setActiveView('main');
                setActiveTab('profile');
              }}
            />
          )}

          {activeView === 'sms' && (
            <SmsPage 
              accountId={smsActiveAccountId}
              onBack={() => {
                navigateTo('main', returnTab);
              }}
            />
          )}

          {activeView === 'truecaller' && (
            <TruecallerSimulator 
              onBack={() => {
                navigateTo('main', returnTab);
              }}
            />
          )}

          {activeView === 'phone' && (
            <PhoneCallApp 
              currentUser={currentUser}
              onBack={() => {
                navigateTo('main', returnTab);
              }}
            />
          )}

          {activeView === 'dashen' && (
            <DashenBankApp 
              currentUser={currentUser}
              onBack={() => {
                navigateTo('main', returnTab);
              }}
              onOpenTelebirr={() => {
                navigateTo('telebirr', returnTab);
              }}
            />
          )}

          {activeView === 'telebirr' && (
            <TelebirrApp 
              currentUser={currentUser}
              onBack={() => {
                navigateTo('main', returnTab);
              }}
              onOpenDashen={() => {
                navigateTo('dashen', returnTab);
              }}
              onOpenCbe={() => {
                navigateTo('main', 'home');
              }}
              onOpenSms={() => {
                navigateTo('sms', returnTab);
              }}
              onOpenTelegram={() => {
                navigateTo('telegram', returnTab);
              }}
            />
          )}

          {activeView === 'telegram' && (
            <TelegramSimulatorApp 
              onBack={() => {
                navigateTo('telebirr', returnTab);
              }}
              onOpenTelebirr={() => {
                navigateTo('telebirr', returnTab);
              }}
              onOpenCbe={() => {
                navigateTo('main', 'home');
              }}
              onOpenDashen={() => {
                navigateTo('dashen', returnTab);
              }}
            />
          )}

        </main>
      </div>

      {/* Unified Phone Model & Status Bar Settings Modal */}
      {isPhoneSettingsOpen && (
        <PhoneSettingsModal 
          isOpen={isPhoneSettingsOpen}
          onClose={() => setIsPhoneSettingsOpen(false)}
        />
      )}
    </div>
  );
}


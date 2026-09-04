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
import { SmsService } from './services/smsService';
import Navigation, { TabType } from './components/Navigation';
import OfflineBanner from './components/OfflineBanner';
import AppInstallPrompt from './components/AppInstallPrompt';

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
  const [activeView, setActiveView] = useState<'auth' | 'main' | 'receipt' | 'admin' | 'sms'>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/sms') {
      return 'sms';
    }
    return 'main';
  });
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [initialTxTab, setInitialTxTab] = useState<'send' | 'transfer' | 'merchant' | 'receive' | 'airtime'>('send');
  const [smsActiveAccountId, setSmsActiveAccountId] = useState<string | undefined>(undefined);

  // Track navigation state to manage Android / browser history correctly
  const navHistoryRef = useRef<{ view: string; tab: string }[]>([]);

  // Navigation pusher that keeps browser history in sync with Android back-button
  const navigateTo = useCallback((view: 'auth' | 'main' | 'receipt' | 'admin' | 'sms', tab: TabType = activeTab) => {
    setActiveView(view);
    setActiveTab(tab);
    
    try {
      const stateObj = { view, tab };
      const targetPath = view === 'sms' ? '/sms' : (window.location.pathname === '/sms' ? '/' : window.location.pathname);
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
      // If user was on SMS view or URL is not /sms anymore
      if (activeView === 'sms') {
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
            onOpenAdmin={() => navigateTo('admin', 'profile')}
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
            onOpenAdmin={() => navigateTo('admin', 'profile')}
            onOpenSmsSimulator={() => navigateTo('sms', 'profile')}
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
          />
        );
      default:
        return (
          <Home 
            currentUser={activeUser}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onOpenSmsSimulator={() => navigateTo('sms', 'profile')}
          />
        );
    }
  };

  return (
    <div id="app-root-wrapper" className="h-[100dvh] max-h-[100dvh] w-full bg-slate-950 flex flex-col items-center justify-center p-0 md:p-6 font-sans overflow-hidden antialiased select-none">
      
      {/* Background Ambient Gradients for Desktop */}
      <div className="hidden md:block absolute -left-20 top-20 w-80 h-80 bg-purple-700/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="hidden md:block absolute -right-20 bottom-20 w-96 h-96 bg-amber-400/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Responsive Android-Ready App Canvas */}
      <div 
        id="app-main-canvas"
        className="w-full max-w-md bg-gray-50 h-[100dvh] max-h-[100dvh] md:h-[840px] md:max-h-[880px] md:rounded-3xl md:shadow-2xl relative flex flex-col overflow-hidden border-0 md:border md:border-slate-800/60 pt-safe pb-safe"
      >
        {/* Real-time Offline Warning Banner */}
        <OfflineBanner />

        {/* Dynamic View Panel Router */}
        <main className={`flex-1 flex flex-col scrollbar-none ${
          activeView === 'sms' 
            ? 'h-full overflow-hidden bg-[#121212]' 
            : activeTab === 'home' || activeTab === 'history' 
              ? 'overflow-hidden h-full' 
              : 'overflow-y-auto bg-gray-50'
        }`}>
          
          {activeView === 'auth' && (
            <Auth onLoginSuccess={handleLoginSuccess} />
          )}

          {activeView === 'main' && (
            <div className={`flex-1 flex flex-col relative ${activeTab === 'home' || activeTab === 'history' ? 'h-full overflow-hidden' : 'pb-28'}`}>
              {/* Optional Top PWA Banner when installable */}
              <AppInstallPrompt mode="banner" />

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
                navigateTo('main', 'profile');
              }}
            />
          )}

        </main>
      </div>
    </div>
  );
}


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, Transaction } from './types';
import { LocalDb } from './lib/mockData';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Payments from './components/Payments';
import History from './components/History';
import Profile from './components/Profile';
import Receipt from './components/Receipt';
import AdminPanel from './components/AdminPanel';
import Navigation, { TabType } from './components/Navigation';
import OfflineBanner from './components/OfflineBanner';
import AppInstallPrompt from './components/AppInstallPrompt';

export default function App() {
  // Authentication & View Session States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<'auth' | 'main' | 'receipt' | 'admin'>('auth');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [initialTxTab, setInitialTxTab] = useState<'send' | 'transfer' | 'merchant' | 'receive' | 'airtime'>('send');

  // Track navigation state to manage Android / browser history correctly
  const navHistoryRef = useRef<{ view: string; tab: string }[]>([]);

  // Navigation pusher that keeps browser history in sync with Android back-button
  const navigateTo = useCallback((view: 'auth' | 'main' | 'receipt' | 'admin', tab: TabType = activeTab) => {
    setActiveView(view);
    setActiveTab(tab);
    
    try {
      const stateObj = { view, tab };
      window.history.pushState(stateObj, '', window.location.pathname);
      navHistoryRef.current.push(stateObj);
    } catch {
      // Ignore if history state fails in sandboxed iframe
    }
  }, [activeTab]);

  // Android Back Navigation handler
  useEffect(() => {
    // Push initial entry
    try {
      window.history.replaceState({ view: activeView, tab: activeTab }, '', window.location.pathname);
    } catch {}

    const handlePopState = (e: PopStateEvent) => {
      // If user pressed back button
      if (activeView === 'receipt') {
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
    navigateTo('receipt', activeTab);
    
    // Refresh current user balance from database
    if (currentUser) {
      const users = LocalDb.getUsers();
      const match = users.find(u => u.id === currentUser.id);
      if (match) {
        setCurrentUser(match);
      }
    }
  };

  // View Router Render Picker
  const renderTabContent = () => {
    if (!currentUser) return null;
    switch (activeTab) {
      case 'home':
        return (
          <Dashboard 
            currentUser={currentUser}
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
            onLogout={handleLogout}
            onOpenAdmin={() => navigateTo('admin', 'profile')}
          />
        );
      case 'transfer':
        return (
          <Transactions 
            currentUser={currentUser}
            onTransactionComplete={handleTransactionComplete}
            initialTab={initialTxTab}
          />
        );
      case 'payments':
        return (
          <Payments 
            currentUser={currentUser}
            onPaymentComplete={handleTransactionComplete}
          />
        );
      case 'history':
        return (
          <History 
            currentUser={currentUser}
            onSelectTransaction={handleSelectTransaction}
          />
        );
      case 'profile':
        return (
          <Profile 
            currentUser={currentUser}
            onLogout={handleLogout}
            onUpdateUser={handleUpdateUserProfile}
            onOpenAdmin={() => navigateTo('admin', 'profile')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div id="app-root-wrapper" className="min-h-[100dvh] w-full bg-slate-950 flex flex-col items-center justify-center p-0 md:p-6 font-sans overflow-x-hidden antialiased select-none">
      
      {/* Background Ambient Gradients for Desktop */}
      <div className="hidden md:block absolute -left-20 top-20 w-80 h-80 bg-purple-700/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="hidden md:block absolute -right-20 bottom-20 w-96 h-96 bg-amber-400/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Responsive Android-Ready App Canvas */}
      <div 
        id="app-main-canvas"
        className="w-full max-w-md bg-gray-50 min-h-[100dvh] md:min-h-[780px] md:max-h-[880px] md:rounded-3xl md:shadow-2xl relative flex flex-col overflow-hidden border-0 md:border md:border-slate-800/60 pt-safe pb-safe"
      >
        {/* Real-time Offline Warning Banner */}
        <OfflineBanner />

        {/* Dynamic View Panel Router */}
        <main className="flex-1 overflow-y-auto bg-gray-50 flex flex-col scrollbar-none">
          
          {activeView === 'auth' && (
            <Auth onLoginSuccess={handleLoginSuccess} />
          )}

          {activeView === 'main' && currentUser && (
            <div className="flex-1 flex flex-col relative pb-28">
              {/* Optional Top PWA Banner when installable */}
              <AppInstallPrompt mode="banner" />

              {renderTabContent()}
              
              {/* Floating bottom navigation */}
              <Navigation 
                activeTab={activeTab}
                onChangeTab={(tab) => {
                  setActiveTab(tab);
                  try {
                    window.history.pushState({ view: 'main', tab }, '', window.location.pathname);
                  } catch {}
                  // Quick refresh of session model when tab changes
                  const users = LocalDb.getUsers();
                  const match = users.find(u => u.id === currentUser.id);
                  if (match) {
                    setCurrentUser(match);
                  }
                }}
                currentUser={currentUser}
                onOpenAdmin={() => navigateTo('admin', 'profile')}
              />
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

        </main>
      </div>
    </div>
  );
}


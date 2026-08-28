import React, { useState, useEffect } from 'react';
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

export default function App() {
  // Authentication & View Session States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<'auth' | 'main' | 'receipt' | 'admin'>('auth');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [initialTxTab, setInitialTxTab] = useState<'send' | 'transfer' | 'merchant' | 'receive' | 'airtime'>('send');

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
    setActiveView('main');
    setActiveTab('home');
  };

  const handleLogout = () => {
    if (currentUser) {
      LocalDb.addAuditLog(currentUser.id, currentUser.email, 'USER_LOGOUT', 'User logged out and destroyed local authentication session.');
    }
    setCurrentUser(null);
    localStorage.removeItem('tana_active_user_id');
    localStorage.removeItem('tana_pending_user_id');
    setActiveView('auth');
    setActiveTab('home');
  };

  const handleUpdateUserProfile = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
  };

  const handleSelectTransaction = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setActiveView('receipt');
  };

  // Callback after completing any Send, Transfer, Bill or Airtime payment
  const handleTransactionComplete = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setActiveView('receipt');
    
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
            }}
            onSelectTransaction={handleSelectTransaction}
            onLogout={handleLogout}
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
            onOpenAdmin={() => setActiveView('admin')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div id="app-root-wrapper" className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-0 md:p-6 font-sans overflow-x-hidden antialiased select-none">
      
      {/* Background Accent Gradients */}
      <div className="hidden md:block absolute -left-20 top-20 w-80 h-80 bg-emerald-700/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="hidden md:block absolute -right-20 bottom-20 w-96 h-96 bg-amber-400/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Responsive App Container */}
      <div 
        id="app-main-canvas"
        className="w-full max-w-md bg-gray-50 min-h-screen md:min-h-[780px] md:max-h-[880px] md:rounded-3xl md:shadow-2xl relative flex flex-col overflow-hidden border border-slate-800/40"
      >
        {/* Dynamic View Panel Router */}
        <main className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">
          
          {activeView === 'auth' && (
            <Auth onLoginSuccess={handleLoginSuccess} />
          )}

          {activeView === 'main' && currentUser && (
            <div className="flex-1 flex flex-col relative pb-20">
              {renderTabContent()}
              
              {/* Floating bottom navigation */}
              <Navigation 
                activeTab={activeTab}
                onChangeTab={(tab) => {
                  setActiveTab(tab);
                  // Quick refresh of session model when tab changes
                  const users = LocalDb.getUsers();
                  const match = users.find(u => u.id === currentUser.id);
                  if (match) {
                    setCurrentUser(match);
                  }
                }}
                currentUser={currentUser}
                onOpenAdmin={() => setActiveView('admin')}
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

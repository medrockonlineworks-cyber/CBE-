import React, { useState, useEffect, useRef } from 'react';
import { LocalDb } from '../lib/mockData';
import { UserProfile } from '../types';
import { CbeLogo } from './CbeLogo';
import { AppsGridIcon } from './CbeCustomIcons';
import { 
  Bell, 
  ChevronDown, 
  Lock, 
  Fingerprint, 
  ArrowRight, 
  Delete, 
  Check, 
  X, 
  UserCheck, 
  Users, 
  Plus, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';

interface AuthProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export default function Auth({ onLoginSuccess }: AuthProps) {
  const [pin, setPin] = useState<string>('');
  const [showError, setShowError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('This field is required');
  const [showKeypad, setShowKeypad] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'አማርኛ'>('English');
  const [showLangMenu, setShowLangMenu] = useState<boolean>(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState<boolean>(false);
  const [showNotificationToast, setShowNotificationToast] = useState<boolean>(false);
  const [isBiometricScanning, setIsBiometricScanning] = useState<boolean>(false);

  // Active account selection
  const [usersList, setUsersList] = useState<UserProfile[]>(() => LocalDb.getUsers());
  const [selectedUser, setSelectedUser] = useState<UserProfile>(() => {
    const list = LocalDb.getUsers();
    const savedId = typeof window !== 'undefined' ? localStorage.getItem('tana_active_user_id') : null;
    if (savedId) {
      const match = list.find(u => u.id === savedId);
      if (match) return match;
    }
    return list[0] || {
      id: 'user_1',
      name: 'Leykun Jemaneh Ylma',
      accountNumber: '1000419524747',
      phone: '+251900112233',
      email: 'leykunjemaneh3@gmail.com',
      role: 'user',
      status: 'active',
      balance: 18450.50,
      availableBalance: 18450.50,
      createdAt: new Date().toISOString()
    };
  });

  // Keep user list fresh
  useEffect(() => {
    const handleUpdate = () => {
      setUsersList(LocalDb.getUsers());
    };
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('cbe_account_switched', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('cbe_account_switched', handleUpdate);
    };
  }, []);

  // Handle typing from physical keyboard when auth screen is mounted
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showAccountSwitcher) return;
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        setShowError(false);
        setPin(prev => (prev.length < 6 ? prev + e.key : prev));
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setShowError(false);
        setPin(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleLoginAttempt();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, selectedUser, showAccountSwitcher]);

  const handleKeypadPress = (digit: string) => {
    setShowError(false);
    if (pin.length < 6) {
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setShowError(false);
    setPin(prev => prev.slice(0, -1));
  };

  const handleLoginAttempt = () => {
    if (!pin || pin.trim().length === 0) {
      setShowError(true);
      setErrorMessage('This field is required');
      return;
    }

    // Accepts standard Ethiopian CBE PIN (e.g. 4 or 6 digits)
    if (pin.length < 4) {
      setShowError(true);
      setErrorMessage('PIN must be at least 4 digits');
      return;
    }

    // Complete login
    LocalDb.addAuditLog(selectedUser.id, selectedUser.email, 'USER_LOGIN', `User ${selectedUser.name} logged in via PIN authentication.`);
    localStorage.setItem('tana_active_user_id', selectedUser.id);
    onLoginSuccess(selectedUser);
  };

  const handleBiometricsLogin = () => {
    setIsBiometricScanning(true);
    setShowError(false);

    // Simulate authentic biometric fingerprint scan response
    setTimeout(() => {
      setIsBiometricScanning(false);
      LocalDb.addAuditLog(selectedUser.id, selectedUser.email, 'BIOMETRIC_LOGIN', `User ${selectedUser.name} logged in via CBE Biometrics (Fingerprint).`);
      localStorage.setItem('tana_active_user_id', selectedUser.id);
      onLoginSuccess(selectedUser);
    }, 700);
  };

  const handleSelectAccount = (user: UserProfile) => {
    setSelectedUser(user);
    localStorage.setItem('tana_active_user_id', user.id);
    setShowAccountSwitcher(false);
    setShowError(false);
    setPin('');
  };

  return (
    <div className="min-h-screen h-full w-full bg-white text-neutral-900 flex flex-col justify-between relative overflow-hidden select-none font-sans">
      
      {/* Notification Toast Modal */}
      {showNotificationToast && (
        <div 
          onClick={() => setShowNotificationToast(false)}
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-start justify-center pt-16 px-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-2xl border border-neutral-100 flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-purple-100 text-[#70189F] flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-neutral-900">Notifications</h4>
              <p className="text-xs text-neutral-600 mt-0.5">Welcome to Commercial Bank of Ethiopia. No urgent security notices.</p>
            </div>
            <button 
              onClick={() => setShowNotificationToast(false)}
              className="text-neutral-400 hover:text-neutral-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Account Switcher Drawer */}
      {showAccountSwitcher && (
        <div 
          onClick={() => setShowAccountSwitcher(false)}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex flex-col justify-end items-center animate-in fade-in duration-200"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-t-3xl p-6 shadow-2xl border-t border-neutral-200 max-h-[85vh] flex flex-col"
          >
            <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto mb-4" />
            
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#70189F]" />
                <h3 className="font-bold text-base text-neutral-900">Switch CBE Account</h3>
              </div>
              <button 
                onClick={() => setShowAccountSwitcher(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-neutral-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto py-3 space-y-2 flex-1">
              {usersList.map((u) => {
                const isCurrent = u.id === selectedUser.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleSelectAccount(u)}
                    className={`w-full p-3.5 rounded-2xl flex items-center justify-between transition cursor-pointer text-left border ${
                      isCurrent 
                        ? 'bg-purple-50 border-[#70189F]/40 shadow-xs' 
                        : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        isCurrent ? 'bg-[#70189F] text-amber-300' : 'bg-neutral-200 text-neutral-700'
                      }`}>
                        {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-sm text-neutral-900 truncate">{u.name}</p>
                          {u.role === 'admin' && (
                            <span className="text-[10px] bg-amber-400 text-purple-950 font-bold px-1.5 py-0.2 rounded shrink-0">Admin</span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 font-mono mt-0.5">A/C: {u.accountNumber}</p>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="w-6 h-6 rounded-full bg-[#70189F] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                // Instantly generate and switch to a new test account
                const newAccNum = '1000' + Math.floor(100000000 + Math.random() * 900000000).toString();
                const newUser: UserProfile = {
                  id: 'user_' + Math.random().toString(36).substring(2, 8),
                  name: 'New CBE Customer',
                  accountNumber: newAccNum,
                  accountType: 'savings',
                  phone: '+251912345678',
                  email: 'customer@cbe.et',
                  role: 'user',
                  status: 'active',
                  balance: 25000.00,
                  availableBalance: 25000.00,
                  createdAt: new Date().toISOString()
                };
                const updated = [...usersList, newUser];
                LocalDb.setUsers(updated);
                setUsersList(updated);
                handleSelectAccount(newUser);
              }}
              className="mt-3 w-full py-3 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Test Account</span>
            </button>
          </div>
        </div>
      )}

      {/* TOP BAR: Bell Icon (Left) — Language Pill (Center) — Apps Grid Icon (Right) */}
      <div className="pt-4 px-6 max-w-md mx-auto w-full flex items-center justify-between relative z-20">
        
        {/* Left: Notification Bell in light circular pill button */}
        <button
          id="btn-auth-notification"
          aria-label="Notifications"
          onClick={() => setShowNotificationToast(true)}
          className="w-11 h-11 rounded-full bg-[#f4f5f7] hover:bg-[#eaecef] active:scale-95 flex items-center justify-center text-neutral-700 transition cursor-pointer shadow-xs"
        >
          <Bell className="w-5 h-5 text-neutral-600 stroke-[1.8]" />
        </button>

        {/* Center: Language selector pill: English ⌵ */}
        <div className="relative">
          <button
            id="btn-auth-language"
            aria-label="Select Language"
            onClick={() => setShowLangMenu(prev => !prev)}
            className="px-4 py-2 rounded-full bg-[#f4f5f7] hover:bg-[#eaecef] active:scale-95 text-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <span>{selectedLanguage}</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-600" />
          </button>

          {showLangMenu && (
            <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 bg-white border border-neutral-200 shadow-xl rounded-2xl p-1.5 w-32 z-30 animate-in fade-in">
              <button
                onClick={() => { setSelectedLanguage('English'); setShowLangMenu(false); }}
                className={`w-full px-3 py-2 text-xs font-semibold rounded-xl text-left flex items-center justify-between cursor-pointer ${
                  selectedLanguage === 'English' ? 'bg-purple-50 text-[#70189F]' : 'hover:bg-neutral-100 text-neutral-700'
                }`}
              >
                <span>English</span>
                {selectedLanguage === 'English' && <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => { setSelectedLanguage('አማርኛ'); setShowLangMenu(false); }}
                className={`w-full px-3 py-2 text-xs font-semibold rounded-xl text-left flex items-center justify-between cursor-pointer ${
                  selectedLanguage === 'አማርኛ' ? 'bg-purple-50 text-[#70189F]' : 'hover:bg-neutral-100 text-neutral-700'
                }`}
              >
                <span>አማርኛ</span>
                {selectedLanguage === 'አማርኛ' && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Right: 4-square Apps Grid button in light circular pill */}
        <button
          id="btn-auth-apps-menu"
          aria-label="Select Account or Services"
          onClick={() => setShowAccountSwitcher(true)}
          className="w-11 h-11 rounded-full bg-[#f4f5f7] hover:bg-[#eaecef] active:scale-95 flex items-center justify-center text-neutral-700 transition cursor-pointer shadow-xs"
          title="Switch Account"
        >
          <AppsGridIcon size={20} className="text-neutral-700" strokeWidth={2.2} />
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full my-auto py-4">
        
        {/* Brand Emblem & Headers (Exact replica of Image 1) */}
        <div className="flex flex-col items-center text-center">
          
          {/* Golden Spiral Emblem */}
          <div className="w-20 h-20 flex items-center justify-center mb-3">
            <CbeLogo className="w-20 h-20 object-contain drop-shadow-sm" />
          </div>

          {/* Amharic Header in Golden Bronze */}
          <h2 className="text-[#c58c2b] font-bold text-lg sm:text-xl tracking-normal">
            የኢትዮጵያ ንግድ ባንክ
          </h2>

          {/* English Header in Spaced Charcoal */}
          <h1 className="text-neutral-800 font-bold text-[11px] sm:text-[12px] tracking-[0.2em] uppercase mt-1">
            COMMERCIAL BANK OF ETHIOPIA
          </h1>

          {/* Hairline Divider */}
          <div className="w-40 h-[1px] bg-neutral-200 mt-4 mb-4" />

          {/* Welcome back Subtitle */}
          <p className="text-neutral-400 font-normal text-base">
            Welcome back
          </p>
        </div>

        {/* PIN INPUT FIELD (Exact styling from Image 1 & 2) */}
        <div className="mt-6 mb-2">
          <div
            id="cbe-pin-input-box"
            onClick={() => setShowKeypad(true)}
            className={`w-full rounded-2xl bg-white border py-4 px-4 flex items-center gap-3 transition-all cursor-pointer shadow-xs ${
              showError 
                ? 'border-[#e0564c] bg-[#fffaf9]' 
                : showKeypad 
                  ? 'border-[#c58c2b] ring-2 ring-[#c58c2b]/20' 
                  : 'border-neutral-300 hover:border-neutral-400'
            }`}
          >
            {/* Golden Padlock Icon */}
            <Lock className="w-5 h-5 text-[#c58c2b] shrink-0" fill="#c58c2b" />

            {/* PIN characters or placeholder */}
            <div className="flex-1 flex items-center text-neutral-800 text-base font-medium min-h-[24px]">
              {pin.length === 0 ? (
                <div className="flex items-center text-neutral-400 tracking-normal font-normal">
                  <span className="w-0.5 h-5 bg-neutral-400 animate-pulse mr-1" />
                  <span>PIN</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {Array.from({ length: pin.length }).map((_, i) => (
                    <span 
                      key={i} 
                      className="w-2.5 h-2.5 rounded-full bg-neutral-800 inline-block" 
                    />
                  ))}
                  {showKeypad && <span className="w-0.5 h-5 bg-neutral-400 animate-pulse ml-0.5" />}
                </div>
              )}
            </div>

            {/* Clear PIN button when digits exist */}
            {pin.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPin('');
                  setShowError(false);
                }}
                className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Error Message: "This field is required" (Exact replica from Image 1) */}
          {showError && (
            <p className="text-[#e0564c] text-xs font-medium mt-1.5 pl-2 animate-in fade-in">
              {errorMessage}
            </p>
          )}
        </div>

        {/* BIOMETRICS & LOGIN BUTTON AREA (When Keypad is hidden or compact) */}
        {!showKeypad && (
          <div className="mt-8 flex flex-col items-center">
            
            {/* Circular Purple Biometrics Button */}
            <button
              id="btn-use-biometrics"
              type="button"
              aria-label="Use Biometrics"
              onClick={handleBiometricsLogin}
              disabled={isBiometricScanning}
              className={`w-14 h-14 rounded-full bg-[#70189F] hover:bg-[#5e1385] active:scale-95 text-white flex items-center justify-center shadow-md transition-all cursor-pointer relative ${
                isBiometricScanning ? 'animate-pulse ring-4 ring-purple-300' : ''
              }`}
            >
              <Fingerprint className="w-7 h-7 text-white" />
            </button>

            {/* "USE BIOMETRICS" text */}
            <button
              type="button"
              onClick={handleBiometricsLogin}
              className="text-neutral-800 text-[11px] font-bold tracking-wider uppercase mt-2.5 cursor-pointer hover:text-[#70189F] transition"
            >
              {isBiometricScanning ? 'Scanning Fingerprint...' : 'USE BIOMETRICS'}
            </button>

            {/* Wide Golden/Bronze "Login ->" Button */}
            <div className="w-full mt-10">
              <button
                id="btn-cbe-login"
                type="button"
                onClick={handleLoginAttempt}
                className="w-full py-4 rounded-2xl bg-[#c58c2b] hover:bg-[#b87f22] active:bg-[#a9731b] text-white font-bold text-base shadow-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <span>Login</span>
                <ArrowRight className="w-5 h-5 stroke-[2.2]" />
              </button>
            </div>
          </div>
        )}

        {/* NUMERIC KEYPAD (Exact replica of Image 2) */}
        {showKeypad && (
          <div className="mt-4 pt-2 border-t border-neutral-100 flex flex-col animate-in slide-in-from-bottom-6 duration-200">
            
            {/* Grab handle to collapse keypad */}
            <button 
              type="button"
              onClick={() => setShowKeypad(false)}
              className="w-12 h-1 bg-neutral-300 hover:bg-neutral-400 rounded-full mx-auto mb-3 cursor-pointer"
              title="Close Keypad"
            />

            {/* 3x4 Numeric Keypad Grid */}
            <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto w-full">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  className="h-14 rounded-xl bg-[#f4f5f7] hover:bg-[#eaecef] active:bg-[#dfe2e6] text-neutral-800 text-2xl font-normal flex items-center justify-center transition shadow-xs cursor-pointer select-none"
                >
                  {digit}
                </button>
              ))}

              {/* Backspace Key */}
              <button
                type="button"
                aria-label="Backspace"
                onClick={handleBackspace}
                className="h-14 rounded-xl bg-[#f4f5f7] hover:bg-[#eaecef] active:bg-[#dfe2e6] text-red-500 flex items-center justify-center transition shadow-xs cursor-pointer select-none"
              >
                <Delete className="w-6 h-6 stroke-[1.8]" />
              </button>

              {/* 0 Key */}
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-14 rounded-xl bg-[#f4f5f7] hover:bg-[#eaecef] active:bg-[#dfe2e6] text-neutral-800 text-2xl font-normal flex items-center justify-center transition shadow-xs cursor-pointer select-none"
              >
                0
              </button>

              {/* Submit Checkmark Key */}
              <button
                type="button"
                aria-label="Submit PIN"
                onClick={handleLoginAttempt}
                className="h-14 rounded-xl bg-[#f4f5f7] hover:bg-purple-100 active:bg-purple-200 text-[#70189F] flex items-center justify-center transition shadow-xs cursor-pointer select-none"
              >
                <Check className="w-6 h-6 stroke-[2.2]" />
              </button>
            </div>

            {/* Bottom Actions when keypad is visible: Use Biometrics or Login Button */}
            <div className="flex items-center justify-between gap-3 mt-4 pt-2">
              <button
                type="button"
                onClick={handleBiometricsLogin}
                className="flex items-center gap-1.5 text-xs font-bold text-[#70189F] hover:underline cursor-pointer py-1"
              >
                <Fingerprint className="w-4 h-4" />
                <span>Use Biometrics</span>
              </button>
              
              <button
                type="button"
                onClick={handleLoginAttempt}
                className="px-5 py-2.5 rounded-xl bg-[#c58c2b] hover:bg-[#b87f22] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* FOOTER: © Commercial Bank of Ethiopia (Exact from Image 1) */}
      <div className="pb-6 pt-2 text-center text-neutral-400 text-xs font-normal relative z-10">
        &copy; Commercial Bank of Ethiopia
      </div>

    </div>
  );
}

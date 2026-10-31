import React, { useState, useEffect } from 'react';
import { LocalDb } from '../lib/mockData';
import { UserProfile } from '../types';
import { CbeLogo } from './CbeLogo';
import { 
  Bell, 
  ChevronDown, 
  Check, 
  X, 
  Users, 
  Plus
} from 'lucide-react';

interface AuthProps {
  onLoginSuccess: (user: UserProfile) => void;
}

/**
 * Authentic CBE Fingerprint Biometric Icon
 * Exact vector replication of the concentric biometric ridges from Commercial Bank of Ethiopia
 */
export function CbeFingerprintIcon({ 
  size = 28, 
  strokeColor = '#ffffff', 
  strokeWidth = 1.9,
  className = ''
}: { 
  size?: number; 
  strokeColor?: string; 
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke={strokeColor} 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      {/* Innermost vertical core loop */}
      <path d="M12 11.2a1.8 1.8 0 0 0-1.8 1.8v2.4" />
      <path d="M12 11.2a1.8 1.8 0 0 1 1.8 1.8v1.6" />
      
      {/* Second concentric arch */}
      <path d="M8.7 15.8v-2.8a3.3 3.3 0 0 1 6.6 0v3.2" />
      
      {/* Third concentric arch */}
      <path d="M6.8 17.2v-4.2a5.2 5.2 0 0 1 10.4 0v2.6" />
      
      {/* Fourth concentric arch */}
      <path d="M5 16.5v-3.5a7 7 0 0 1 14 0v2" />
      
      {/* Outermost upper crest arch */}
      <path d="M3.5 15v-2a8.5 8.5 0 0 1 17 0v1" />
      
      {/* Bottom whorl curve */}
      <path d="M13.6 18c-.4.9-1 1.6-1.8 2" />
    </svg>
  );
}

export default function Auth({ onLoginSuccess }: AuthProps) {
  const [pin, setPin] = useState<string>('');
  // Show error by default or on submit (matching reference photo which has 'This field is required' shown)
  const [showError, setShowError] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('This field is required');
  // showKeypad: Keyboard is ONLY activated when PIN input method is tapped
  const [showKeypad, setShowKeypad] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'አማርኛ'>('English');
  const [showLangMenu, setShowLangMenu] = useState<boolean>(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState<boolean>(false);
  const [showNotificationToast, setShowNotificationToast] = useState<boolean>(false);
  const [isBiometricScanning, setIsBiometricScanning] = useState<boolean>(false);

  // Detect iOS / iPhone device (physical device, Safari, or iPhone preset)
  // Ensures top bar icons (Bell, English, Grid) are never covered by iPhone notch/status bar
  const [isIOSDevice, setIsIOSDevice] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent || '';
    const isApple = /iPhone|iPad|iPod/.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const savedSettings = localStorage.getItem('tana_phone_settings_v1');
    const isIPhonePreset = savedSettings ? savedSettings.includes('"iphone"') : false;
    return isApple || isIPhonePreset;
  });

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

  // Keep user list fresh, sync phone model settings, and set white device status bar
  useEffect(() => {
    const handleUpdate = () => {
      setUsersList(LocalDb.getUsers());
    };
    const handleSettingsChange = () => {
      const ua = window.navigator.userAgent || '';
      const isApple = /iPhone|iPad|iPod/.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
      const savedSettings = localStorage.getItem('tana_phone_settings_v1');
      const isIPhonePreset = savedSettings ? savedSettings.includes('"iphone"') : false;
      setIsIOSDevice(isApple || isIPhonePreset);
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('cbe_account_switched', handleUpdate);
    window.addEventListener('tana_phone_settings_changed', handleSettingsChange);

    // Ensure device status bar uses CBE app purple (#70189F) and navigation bar is pure white (#ffffff)
    const applyBarColors = () => {
      const themeMetas = document.querySelectorAll('meta[name="theme-color"], meta[name="msapplication-navbutton-color"]');
      themeMetas.forEach(m => m.setAttribute('content', '#70189F'));
      const navMetas = document.querySelectorAll('meta[name="navigation-bar-color"]');
      navMetas.forEach(m => m.setAttribute('content', '#ffffff'));
      document.documentElement.style.backgroundColor = '#ffffff';
      document.body.style.backgroundColor = '#ffffff';

      let colorSchemeMeta = document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null;
      if (!colorSchemeMeta) {
        colorSchemeMeta = document.createElement('meta');
        colorSchemeMeta.name = 'color-scheme';
        document.head.appendChild(colorSchemeMeta);
      }
      colorSchemeMeta.content = 'light';
    };

    applyBarColors();
    const t1 = setTimeout(applyBarColors, 50);
    const t2 = setTimeout(applyBarColors, 300);
    const t3 = setTimeout(applyBarColors, 800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('cbe_account_switched', handleUpdate);
      window.removeEventListener('tana_phone_settings_changed', handleSettingsChange);
      const themeMetas = document.querySelectorAll('meta[name="theme-color"], meta[name="msapplication-navbutton-color"]');
      themeMetas.forEach(m => m.setAttribute('content', '#70189F'));
      const navMetas = document.querySelectorAll('meta[name="navigation-bar-color"]');
      navMetas.forEach(m => m.setAttribute('content', '#ffffff'));
      document.documentElement.style.backgroundColor = '#ffffff';
      document.body.style.backgroundColor = '#ffffff';
    };
  }, []);

  // Handle typing from physical keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showAccountSwitcher) return;
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        setShowError(false);
        setPin(prev => (prev.length < 6 ? prev + e.key : prev));
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setPin(prev => {
          const nextVal = prev.slice(0, -1);
          if (nextVal.length === 0) {
            setShowError(true);
            setErrorMessage('This field is required');
          }
          return nextVal;
        });
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
    setPin(prev => {
      const nextVal = prev.slice(0, -1);
      if (nextVal.length === 0) {
        setShowError(true);
        setErrorMessage('This field is required');
      }
      return nextVal;
    });
  };

  const handleLoginAttempt = () => {
    if (!pin || pin.trim().length === 0) {
      setShowError(true);
      setErrorMessage('This field is required');
      return;
    }

    if (pin.length < 4) {
      setShowError(true);
      setErrorMessage('PIN must be at least 4 digits');
      return;
    }

    LocalDb.addAuditLog(selectedUser.id, selectedUser.email, 'USER_LOGIN', `User ${selectedUser.name} logged in via PIN authentication.`);
    localStorage.setItem('tana_active_user_id', selectedUser.id);
    onLoginSuccess(selectedUser);
  };

  const handleBiometricsLogin = () => {
    setIsBiometricScanning(true);
    setShowError(false);

    setTimeout(() => {
      setIsBiometricScanning(false);
      LocalDb.addAuditLog(selectedUser.id, selectedUser.email, 'BIOMETRIC_LOGIN', `User ${selectedUser.name} logged in via CBE Biometrics (Fingerprint).`);
      localStorage.setItem('tana_active_user_id', selectedUser.id);
      onLoginSuccess(selectedUser);
    }, 600);
  };

  const handleSelectAccount = (user: UserProfile) => {
    setSelectedUser(user);
    localStorage.setItem('tana_active_user_id', user.id);
    setShowAccountSwitcher(false);
    setShowError(true);
    setErrorMessage('This field is required');
    setPin('');
  };

  return (
    <div className="h-full min-h-[100dvh] w-full bg-white text-neutral-900 flex flex-col justify-between relative overflow-hidden select-none font-sans">
      
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

      {/* TOP BAR: Exact matching Image 1 & 2 */}
      {/* Left: Outline Bell | Center: English ⌵ | Right: 4-square Solid Grid Button */}
      {/* Safe-area padding ensures top icons are never hidden beneath iPhone notch, status bar clock, or Dynamic Island */}
      <div 
        style={{
          paddingTop: isIOSDevice 
            ? 'max(calc(env(safe-area-inset-top, 0px) + 14px), 54px)' 
            : 'max(calc(env(safe-area-inset-top, 0px) + 14px), 24px)'
        }}
        className="px-6 max-w-md mx-auto w-full flex items-center justify-between relative z-30 shrink-0"
      >
        
        {/* Left: Bell Outline Icon in light circular pill button */}
        <button
          id="btn-auth-notification"
          aria-label="Notifications"
          onClick={() => setShowNotificationToast(true)}
          className="w-11 h-11 rounded-full bg-[#f4f5f7] hover:bg-[#eaecef] active:scale-95 flex items-center justify-center text-[#4B5563] transition cursor-pointer shadow-xs"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        {/* Center: Language selector pill: English ⌵ */}
        <div className="relative">
          <button
            id="btn-auth-language"
            aria-label="Select Language"
            onClick={() => setShowLangMenu(prev => !prev)}
            className="px-4 py-2 rounded-full bg-[#f4f5f7] hover:bg-[#eaecef] active:scale-95 text-[#1f2937] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <span>{selectedLanguage}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
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

        {/* Right: 4-square Solid Apps Grid button (Exact 2x2 solid rounded squares from Image 1 & 2) */}
        <button
          id="btn-auth-apps-menu"
          aria-label="Select Account or Services"
          onClick={() => setShowAccountSwitcher(true)}
          className="w-11 h-11 rounded-full bg-[#f4f5f7] hover:bg-[#eaecef] active:scale-95 flex items-center justify-center text-[#4B5563] transition cursor-pointer shadow-xs"
          title="Switch Account"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1.6" fill="#4B5563" />
            <rect x="10" y="2.5" width="5.5" height="5.5" rx="1.6" fill="#4B5563" />
            <rect x="2.5" y="10" width="5.5" height="5.5" rx="1.6" fill="#4B5563" />
            <rect x="10" y="10" width="5.5" height="5.5" rx="1.6" fill="#4B5563" />
          </svg>
        </button>
      </div>

      {/* TOP BRANDING & PIN AREA */}
      <div className={`px-6 max-w-md mx-auto w-full flex flex-col justify-center ${showKeypad ? 'pt-2 pb-1' : 'py-4 flex-1 my-auto'}`}>
        
        {/* Brand Emblem & Headers (Exact replica of Image 1 & 2) */}
        <div className="flex flex-col items-center text-center">
          
          {/* Golden Spiral Emblem */}
          <div className="w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center mb-2.5">
            <CbeLogo className="w-18 h-18 sm:w-20 sm:h-20 object-contain drop-shadow-xs" />
          </div>

          {/* Amharic Header in Golden Bronze (Authentic Ethiopic typography) */}
          <h2 className="text-[#c09349] font-semibold text-[20px] sm:text-[21px] tracking-normal leading-tight font-['Noto_Serif_Ethiopic','Noto_Sans_Ethiopic',serif]">
            የኢትዮጵያ ንግድ ባንክ
          </h2>

          {/* English Header in Spaced Charcoal */}
          <h1 className="text-[#374151] font-semibold text-[10.5px] sm:text-[11px] tracking-[0.24em] uppercase mt-1 font-sans">
            COMMERCIAL BANK OF ETHIOPIA
          </h1>

          {/* Hairline Divider */}
          <div className="w-32 h-[1px] bg-neutral-200/90 mt-3.5 mb-3.5" />

          {/* Welcome back Subtitle */}
          <p className="text-[#8e8e93] font-normal text-[15.5px] font-sans">
            Welcome back
          </p>
        </div>

        {/* PIN INPUT FIELD (Exact replica of Image 1 & 2) */}
        <div className="mt-5 mb-1">
          <div
            id="cbe-pin-input-box"
            onClick={() => setShowKeypad(true)}
            className={`w-full rounded-[18px] bg-white border py-3.5 px-4 flex items-center gap-3 transition-all cursor-pointer shadow-xs ${
              showError 
                ? 'border-[#e05347] border-[1.5px] bg-[#fffcfc]' 
                : showKeypad 
                  ? 'border-[#c58c2b] ring-2 ring-[#c58c2b]/20' 
                  : 'border-neutral-300 hover:border-neutral-400'
            }`}
          >
            {/* Golden Padlock Icon with Arched Shackle (Exact replica of Image 1 & 2) */}
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path 
                d="M7 10V7a5 5 0 0 1 10 0v3" 
                stroke="#d49a37" 
                strokeWidth="2.2" 
                strokeLinecap="round" 
              />
              <rect 
                x="4.5" 
                y="10" 
                width="15" 
                height="11" 
                rx="2.5" 
                fill="#d49a37" 
              />
              <circle cx="12" cy="14.5" r="1.2" fill="#ffffff" />
              <path d="M12 15.5v2" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
            </svg>

            {/* PIN characters or placeholder with Red Cursor |PIN */}
            <div className="flex-1 flex items-center text-neutral-800 text-[15px] font-normal min-h-[24px]">
              {pin.length === 0 ? (
                <div className="flex items-center text-[#9ca3af] tracking-normal font-normal">
                  {/* Red/coral cursor right between lock and PIN (Exact replica of Image 2) */}
                  <span className="w-[1.5px] h-5 bg-[#e05347] animate-pulse mr-1.5" />
                  <span className="tracking-wide">PIN</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {Array.from({ length: pin.length }).map((_, i) => (
                    <span 
                      key={i} 
                      className="w-2.5 h-2.5 rounded-full bg-neutral-800 inline-block" 
                    />
                  ))}
                  <span className="w-[1.5px] h-5 bg-[#e05347] animate-pulse ml-0.5" />
                </div>
              )}
            </div>

            {/* Clear button when digits are typed */}
            {pin.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPin('');
                  setShowError(true);
                  setErrorMessage('This field is required');
                }}
                className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Error Message: "This field is required" (CENTERED, exact replica of Image 1 & 2) */}
          {showError && (
            <p className="text-[#e05347] text-[12px] font-normal mt-2 text-center animate-in fade-in">
              {errorMessage}
            </p>
          )}
        </div>

      </div>

      {/* VIEW A: BIOMETRICS & LOGIN BUTTON (When Keypad is collapsed - Image 1) */}
      {!showKeypad && (
        <div className="px-6 max-w-md mx-auto w-full flex-1 flex flex-col justify-between pb-6 animate-in fade-in duration-150">
          
          {/* Center Biometrics Container */}
          <div className="flex flex-col items-center mt-6">
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
              {/* White Authentic CBE Biometric Fingerprint Icon matching reference photo */}
              <CbeFingerprintIcon size={32} strokeColor="#ffffff" strokeWidth={1.9} />
            </button>

            {/* "USE BIOMETRICS" text */}
            <button
              type="button"
              onClick={handleBiometricsLogin}
              className="text-[#1f2937] text-[11px] font-bold tracking-[0.16em] uppercase mt-3 cursor-pointer hover:text-[#70189F] transition font-sans"
            >
              {isBiometricScanning ? 'Scanning Fingerprint...' : 'USE BIOMETRICS'}
            </button>
          </div>

          {/* Bottom Actions: Login Button + Footer */}
          <div className="w-full mt-auto">
            {/* Wide Golden/Bronze "Login ->" Button (Exact replica of Image 1 & 2) */}
            <button
              id="btn-cbe-login"
              type="button"
              onClick={handleLoginAttempt}
              className="w-full py-3.5 rounded-[18px] bg-[#c58c2b] hover:bg-[#b87f22] active:bg-[#a9731b] text-white font-semibold text-[16px] shadow-sm transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99] font-sans"
            >
              <span className="text-[16px] font-semibold">Login</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>

            {/* FOOTER: © Commercial Bank of Ethiopia (Exact replica of Image 1 & 2) */}
            <div 
              style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 8px), 16px)' }}
              className="pt-8 text-center text-[#9ca3af] text-[11.5px] font-normal font-sans"
            >
              &copy; Commercial Bank of Ethiopia
            </div>
          </div>
        </div>
      )}

      {/* VIEW B: ON-SCREEN NUMERIC KEYPAD (Exact replica of Image 2) */}
      {showKeypad && (
        <div 
          style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 24px)' }}
          className="w-full max-w-md mx-auto bg-[#f8f9fa] rounded-t-[32px] shadow-[0_-4px_24px_rgba(0,0,0,0.04)] border-t border-neutral-100/80 px-6 pt-3 shrink-0 animate-in slide-in-from-bottom-8 duration-200"
        >
          
          {/* Subtle grab handle bar at top center (Exact replica of Image 2) */}
          <div 
            onClick={() => setShowKeypad(false)}
            className="w-12 h-1 bg-[#d1d5db] hover:bg-neutral-400 rounded-full mx-auto mb-3.5 cursor-pointer transition"
            title="Tap to switch to Biometrics & Login button"
          />

          {/* 3x4 Numeric Keypad Grid (Exact replica of Image 2) */}
          <div className="grid grid-cols-3 gap-2.5 w-full">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className="h-[58px] rounded-2xl bg-[#f3f4f6] hover:bg-[#eaecef] active:bg-[#dfe2e6] text-[#1e232a] text-[26px] font-normal flex items-center justify-center transition shadow-xs cursor-pointer select-none"
              >
                {digit}
              </button>
            ))}

            {/* Backspace Key: Red/Coral outline box with an X inside (Exact replica of Image 2) */}
            <button
              type="button"
              aria-label="Backspace"
              onClick={handleBackspace}
              className="h-[58px] rounded-2xl bg-[#f3f4f6] hover:bg-[#eaecef] active:bg-[#dfe2e6] text-[#e05347] flex items-center justify-center transition shadow-xs cursor-pointer select-none"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#e05347" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                <line x1="18" y1="9" x2="12" y2="15" />
                <line x1="12" y1="9" x2="18" y2="15" />
              </svg>
            </button>

            {/* 0 Key */}
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="h-[58px] rounded-2xl bg-[#f3f4f6] hover:bg-[#eaecef] active:bg-[#dfe2e6] text-[#1e232a] text-[26px] font-normal flex items-center justify-center transition shadow-xs cursor-pointer select-none"
            >
              0
            </button>

            {/* Submit Checkmark Key: Soft Lavender/Purple Checkmark (Exact replica of Image 2) */}
            <button
              type="button"
              aria-label="Submit PIN"
              onClick={handleLoginAttempt}
              className="h-[58px] rounded-2xl bg-[#f3f4f6] hover:bg-purple-50 active:bg-purple-100 flex items-center justify-center transition shadow-xs cursor-pointer select-none"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b4a2db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          </div>

          {/* Quick toggle to Biometrics / Login view */}
          <div className="flex items-center justify-between pt-3 mt-1 px-1">
            <button
              type="button"
              onClick={handleBiometricsLogin}
              className="flex items-center gap-1.5 text-xs font-bold text-[#70189F] hover:underline cursor-pointer"
            >
              <CbeFingerprintIcon size={18} strokeColor="#70189F" strokeWidth={2.0} />
              <span>Use Biometrics</span>
            </button>

            <button
              type="button"
              onClick={() => setShowKeypad(false)}
              className="text-xs text-[#8e8e93] hover:text-neutral-900 font-medium cursor-pointer"
            >
              Hide Keypad ⌵
            </button>
          </div>

        </div>
      )}

    </div>
  );
}

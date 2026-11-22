import React, { useState, useEffect } from 'react';
import { LocalDb } from '../lib/mockData';
import { UserProfile } from '../types';
import { SystemBarsService } from '../services/systemBarsService';
import { PhoneSettingsService } from '../services/phoneSettingsService';
import { BiometricAuthService, BiometricMethod } from '../services/biometricAuthService';
import { AuthSessionService } from '../services/authSessionService';
import { PushNotificationService } from '../services/pushNotificationService';
import { CbeLogo } from './CbeLogo';
import { 
  Bell, 
  Check, 
  X, 
  Users, 
  Plus,
  Loader2
} from 'lucide-react';

interface AuthProps {
  onLoginSuccess: (user: UserProfile, method?: 'biometric' | 'credentials') => void;
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

/**
 * Authentic Apple Face ID Vector Icon (used on iPhone / iOS devices)
 */
export function CbeFaceIdIcon({
  size = 28,
  strokeColor = '#ffffff',
  strokeWidth = 1.9,
  className = '',
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
      {/* Rounded corner frame brackets */}
      <path d="M4 8.2V6.2A2.2 2.2 0 0 1 6.2 4h2" />
      <path d="M15.8 4h2A2.2 2.2 0 0 1 20 6.2v2" />
      <path d="M4 15.8v2A2.2 2.2 0 0 0 6.2 20h2" />
      <path d="M15.8 20h2A2.2 2.2 0 0 0 20 17.8v-2" />
      {/* Eyes */}
      <path d="M9 9.2v1.6" />
      <path d="M15 9.2v1.6" />
      {/* Nose */}
      <path d="M12 9.2v3.3a1 1 0 0 1-1 1h-.5" />
      {/* Smile */}
      <path d="M8.8 15.8a4.3 4.3 0 0 0 6.4 0" />
    </svg>
  );
}

export default function Auth({ onLoginSuccess }: AuthProps) {
  const [pin, setPin] = useState<string>('');
  // Default first screen is biometric view (never auto-activates biometrics); PIN screen opens only when clicking "Use PIN"
  const [loginMode, setLoginMode] = useState<'biometric' | 'pin'>('biometric');
  const [showError, setShowError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('This field is required');
  // showKeypad: NEVER active automatically; keypad opens ONLY when user taps the PIN field
  const [showKeypad, setShowKeypad] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'አማርኛ'>('English');
  const [showLangMenu, setShowLangMenu] = useState<boolean>(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState<boolean>(false);
  const [showNotificationToast, setShowNotificationToast] = useState<boolean>(false);
  const [isBiometricScanning, setIsBiometricScanning] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [biometricPopupPhase, setBiometricPopupPhase] = useState<
    null | 'authenticating' | 'authenticated'
  >(null);
  const [iframeBlockedNotice, setIframeBlockedNotice] = useState<BiometricMethod | null>(null);

  const [biometricMethod, setBiometricMethod] = useState<BiometricMethod>(() =>
    BiometricAuthService.getBiometricMethod()
  );
  const [customBiometricIcon, setCustomBiometricIcon] = useState<string | null>(() =>
    LocalDb.getCustomBiometricIcon()
  );

  const renderBiometricGlyph = (
    size: number,
    strokeColor: string,
    strokeWidth = 1.9,
    imgSize?: number
  ) => {
    if (customBiometricIcon) {
      const boxSize = imgSize ?? size;
      return (
        <img
          src={customBiometricIcon}
          alt="Biometric"
          style={{ width: boxSize, height: boxSize }}
          className="object-contain pointer-events-none select-none"
        />
      );
    }
    return biometricMethod === 'faceid' ? (
      <CbeFaceIdIcon size={size} strokeColor={strokeColor} strokeWidth={strokeWidth} />
    ) : (
      <CbeFingerprintIcon size={size} strokeColor={strokeColor} strokeWidth={strokeWidth} />
    );
  };

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
      setCustomBiometricIcon(LocalDb.getCustomBiometricIcon());
    };
    const handleBiometricIconUpdate = () => {
      setCustomBiometricIcon(LocalDb.getCustomBiometricIcon());
    };
    const handleSettingsChange = () => {
      setBiometricMethod(BiometricAuthService.getBiometricMethod());
    };

    const unsubPhoneSettings = PhoneSettingsService.subscribe(() => {
      setBiometricMethod(BiometricAuthService.getBiometricMethod());
    });

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('cbe_account_switched', handleUpdate);
    window.addEventListener('cbe_biometric_icon_updated', handleBiometricIconUpdate);
    window.addEventListener('tana_phone_settings_changed', handleSettingsChange);

    // For Login page: status bar and navigation bar must both be pure white (#ffffff)
    const applyBarColors = () => {
      SystemBarsService.applyAllWhiteBars();
    };

    applyBarColors();
    const t1 = setTimeout(applyBarColors, 50);
    const t2 = setTimeout(applyBarColors, 300);
    const t3 = setTimeout(applyBarColors, 800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      unsubPhoneSettings();
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('cbe_account_switched', handleUpdate);
      window.removeEventListener('cbe_biometric_icon_updated', handleBiometricIconUpdate);
      window.removeEventListener('tana_phone_settings_changed', handleSettingsChange);
      SystemBarsService.applyDualSystemBars();
    };
  }, []);

  // Handle typing from physical keyboard ONLY after user clicks the PIN box (loginMode === 'pin' && showKeypad === true)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showAccountSwitcher || loginMode !== 'pin' || !showKeypad) return;
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
        void handleLoginAttempt();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowKeypad(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, selectedUser, showAccountSwitcher, loginMode, showKeypad]);

  // Note: Biometrics and PIN NEVER auto-activate on launch — user must explicitly click PIN or USE BIOMETRICS.

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

  const handleLoginAttempt = async () => {
    if (isAuthLoading) return;

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

    setIsAuthLoading(true);
    setShowError(false);

    const authRes = await AuthSessionService.loginWithCredentials({
      userId: selectedUser.id,
      email: selectedUser.email,
      authType: 'pin',
      secret: pin,
    });

    setIsAuthLoading(false);

    if (!authRes.ok) {
      setShowError(true);
      setErrorMessage(authRes.message || 'Authentication failed. Please try again.');
      setPin('');
      return;
    }

    await BiometricAuthService.saveAppPin(selectedUser.id, pin);

    LocalDb.addAuditLog(
      selectedUser.id,
      selectedUser.email,
      'USER_LOGIN',
      `User ${selectedUser.name} signed in via verified pin session.`
    );
    localStorage.setItem('tana_active_user_id', selectedUser.id);
    void PushNotificationService.establishBackendSession(selectedUser, { notifyNewDevice: true }).then(() =>
      PushNotificationService.syncExistingSubscription(selectedUser)
    );
    onLoginSuccess(selectedUser, 'credentials');
  };

  const handleBiometricsLogin = async () => {
    if (isBiometricScanning || biometricPopupPhase || isAuthLoading) return;
    setIsBiometricScanning(true);
    setShowError(false);

    const isEnrolled = BiometricAuthService.isBiometricEnrolledForUser(selectedUser.id);
    if (isEnrolled) {
      setBiometricPopupPhase('authenticating');
      await new Promise<void>((resolve) =>
        typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame(() => resolve())
          : setTimeout(resolve, 16)
      );
    }

    const result = await BiometricAuthService.authenticateWithDevice(selectedUser);

    if (result.status === 'success') {
      const methodLabel = result.method === 'faceid' ? 'Face ID' : 'Fingerprint';
      LocalDb.addAuditLog(
        selectedUser.id,
        selectedUser.email,
        'BIOMETRIC_LOGIN',
        `User ${selectedUser.name} unlocked session via device ${methodLabel} & local vault rotation.`
      );
      localStorage.setItem('tana_active_user_id', selectedUser.id);

      setBiometricPopupPhase('authenticated');
      await new Promise((resolve) => setTimeout(resolve, 450));
      setBiometricPopupPhase(null);
      setIsBiometricScanning(false);
      void PushNotificationService.establishBackendSession(selectedUser, { notifyNewDevice: true }).then(() =>
        PushNotificationService.syncExistingSubscription(selectedUser)
      );
      onLoginSuccess(selectedUser, 'biometric');
      return;
    }

    setBiometricPopupPhase(null);
    setIsBiometricScanning(false);

    if (result.status === 'iframe_blocked') {
      setIframeBlockedNotice(result.method);
      return;
    }

    if (
      result.status === 'biometric_changed' ||
      result.status === 'session_expired' ||
      result.status === 'not_enabled'
    ) {
      const users = LocalDb.getUsers();
      const idx = users.findIndex((u) => u.id === selectedUser.id);
      if (idx !== -1) {
        users[idx].biometricEnabled = false;
        LocalDb.setUsers(users);
      }
    }

    // Keep account locked and allow retry or PIN/password login
    setShowError(true);
    setErrorMessage(
      result.message ||
        `${BiometricAuthService.getDeviceBiometricName(result.method)} verification failed.`
    );
  };

  const handleSelectAccount = (user: UserProfile) => {
    setSelectedUser(user);
    localStorage.setItem('tana_active_user_id', user.id);
    setShowAccountSwitcher(false);
    setShowError(false);
    setErrorMessage('This field is required');
    setPin('');
  };

  const handleOpenPinMode = () => {
    setShowError(false);
    setErrorMessage('This field is required');
    setLoginMode('pin');
    // Keep keypad closed until user explicitly clicks the PIN input box
    setShowKeypad(false);
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
      {/* Safe-area padding positions top icons just below the iPhone notch / Dynamic Island */}
      <div 
        style={{
          paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 4px), 10px)'
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

      {/* TOP BRANDING & CONDITIONAL PIN INPUT AREA */}
      <div
        onClick={() => {
          if (loginMode === 'pin' && showKeypad) setShowKeypad(false);
        }}
        className={`px-7 max-w-md mx-auto w-full flex flex-col justify-center ${
          loginMode === 'pin' && showKeypad
            ? 'pt-3 pb-2 flex-1'
            : 'pt-8 sm:pt-10 pb-2'
        }`}
      >
        
        {/* Brand Emblem & Headers */}
        <div className="flex flex-col items-center text-center">
          
          {/* Golden Spiral Emblem */}
          <div className="w-20 h-20 sm:w-[86px] sm:h-[86px] flex items-center justify-center mb-3">
            <CbeLogo className="w-20 h-20 sm:w-[86px] sm:h-[86px] object-contain drop-shadow-xs" />
          </div>

          {/* Amharic Header in Golden Bronze */}
          <h2 className="text-[#b8863b] font-semibold text-[21px] sm:text-[22px] tracking-normal leading-tight font-['Noto_Serif_Ethiopic','Noto_Sans_Ethiopic',serif]">
            የኢትዮጵያ ንግድ ባንክ
          </h2>

          {/* English Header in Spaced Charcoal */}
          <h1 className="text-[#3d4148] font-semibold text-[11px] sm:text-[11.5px] tracking-[0.22em] uppercase mt-1.5 font-sans">
            COMMERCIAL BANK OF ETHIOPIA
          </h1>

          {/* Hairline Divider */}
          <div className="w-36 h-[1px] bg-neutral-200/80 mt-5 mb-5" />

          {/* Welcome back Subtitle ONLY (No "Authenticate to continue.") */}
          <p className="text-[#6b7280] font-normal text-[17px] font-sans">
            Welcome back
          </p>
        </div>

        {/* PIN INPUT BOX: Shown ONLY after clicking "Use PIN" */}
        {loginMode === 'pin' && (
          <div className="mt-7 mb-1 animate-in fade-in duration-150">
            <div
              id="cbe-pin-input-box"
              role="button"
              tabIndex={0}
              aria-label="Enter PIN"
              onClick={(e) => {
                e.stopPropagation();
                setShowError(false);
                setShowKeypad(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowError(false);
                  setShowKeypad(true);
                }
              }}
              className={`w-full h-[58px] rounded-[14px] px-4.5 flex items-center gap-3.5 transition-all cursor-pointer ${
                showError
                  ? 'bg-white border-[1.5px] border-[#e05347] shadow-xs'
                  : showKeypad
                    ? 'bg-white border-[1.5px] border-[#7A1FA2] shadow-[0_2px_10px_rgba(122,31,162,0.06)]'
                    : 'bg-[#f4f5f7] border border-transparent shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:bg-[#eff0f3]'
              }`}
            >
              {/* Golden Padlock Icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path 
                  d="M7 10V7a5 5 0 0 1 10 0v3" 
                  stroke="#cf9334" 
                  strokeWidth="2.3" 
                  strokeLinecap="round" 
                />
                <rect 
                  x="4.5" 
                  y="10" 
                  width="15" 
                  height="11" 
                  rx="2.5" 
                  fill="#cf9334" 
                />
                <circle cx="12" cy="15.2" r="1.3" fill="#ffffff" />
              </svg>

              {/* PIN characters or placeholder (Purple cursor ONLY when PIN box is active/clicked) */}
              <div className="flex-1 flex items-center text-neutral-800 text-[15px] font-normal min-h-[24px]">
                {pin.length === 0 ? (
                  <div className="flex items-center text-[#9ca3af] tracking-normal font-normal">
                    {showKeypad && (
                      <span className="w-[1.5px] h-[22px] bg-[#7A1FA2] animate-pulse mr-[1px]" />
                    )}
                    <span className="tracking-wide text-[15px]">PIN</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-[5px]">
                    {Array.from({ length: pin.length }).map((_, i) => (
                      <span 
                        key={i} 
                        className="w-[6px] h-[6px] rounded-full bg-[#1f2937] inline-block" 
                      />
                    ))}
                    {showKeypad && (
                      <span className="w-[1.5px] h-[22px] bg-[#7A1FA2] animate-pulse ml-0.5" />
                    )}
                  </div>
                )}
              </div>
            </div>

            {showError && (
              <p className="text-[#e05347] text-[12px] font-normal mt-2 text-center animate-in fade-in">
                {errorMessage}
              </p>
            )}
          </div>
        )}

      </div>

      {/* FIRST SCREEN (Default on open): Biometric circle + USE BIOMETRICS + underlined Use PIN + Footer */}
      {loginMode === 'biometric' && (
        <div className="px-7 max-w-md mx-auto w-full flex-1 flex flex-col justify-between pb-4 animate-in fade-in duration-150">
          
          {/* Lower-Center Biometric Button + USE BIOMETRICS + Use PIN (never auto-activates) */}
          <div className="flex-1 flex flex-col items-center justify-end pb-14 sm:pb-16">
            {/* Circular Purple Biometrics Button with crisp outer lavender halo ring */}
            <button
              id="btn-use-biometrics"
              type="button"
              aria-label="Use Biometrics"
              onClick={handleBiometricsLogin}
              disabled={isBiometricScanning}
              className={`w-[88px] h-[88px] rounded-full p-[5px] bg-white border border-[#7A1FA2]/25 shadow-[0_3px_16px_rgba(122,31,162,0.16)] flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                isBiometricScanning ? 'animate-pulse ring-4 ring-purple-300/60' : 'hover:border-[#7A1FA2]/45'
              }`}
            >
              <span className="w-full h-full rounded-full bg-[#6F1A9C] hover:bg-[#5f1587] flex items-center justify-center text-white shadow-inner transition-colors overflow-hidden">
                {renderBiometricGlyph(biometricMethod === 'faceid' ? 34 : 36, '#ffffff', 1.85, 40)}
              </span>
            </button>

            {/* "USE BIOMETRICS" label */}
            <button
              type="button"
              onClick={handleBiometricsLogin}
              disabled={isBiometricScanning}
              className="text-[#5c616b] text-[11px] font-semibold tracking-[0.18em] uppercase mt-4 cursor-pointer hover:text-[#6F1A9C] transition font-sans disabled:opacity-70"
            >
              USE BIOMETRICS
            </button>

            {/* Underlined "Use PIN" link -> opens the PIN login screen */}
            <button
              id="btn-use-pin"
              type="button"
              onClick={handleOpenPinMode}
              className="text-[#4b5059] hover:text-[#1f2937] text-[14px] font-medium underline underline-offset-[4px] decoration-[#6b7280]/75 mt-5 cursor-pointer transition font-sans"
            >
              Use PIN
            </button>

            {showError && (
              <p className="text-[#e05347] text-[12px] font-normal mt-4 text-center max-w-xs animate-in fade-in">
                {errorMessage}
              </p>
            )}
          </div>

          {/* FOOTER: © Commercial Bank of Ethiopia */}
          <div className="pt-2 pb-[max(env(safe-area-inset-bottom,0px),14px)] text-center text-[#6b7280] text-[12px] font-normal font-sans">
            &copy; Commercial Bank of Ethiopia
          </div>
        </div>
      )}

      {/* SECOND SCREEN (After clicking "Use PIN", keypad idle): Biometrics circle + USE BIOMETRICS + Golden Login button + Footer */}
      {loginMode === 'pin' && !showKeypad && (
        <div className="px-7 max-w-md mx-auto w-full flex-1 flex flex-col justify-between pb-4 animate-in fade-in duration-150">
          
          {/* Centered Purple Biometrics Button + USE BIOMETRICS (user must click explicitly) */}
          <div className="flex-1 flex flex-col items-center justify-center py-4">
            <button
              id="btn-use-biometrics"
              type="button"
              aria-label="Use Biometrics"
              onClick={handleBiometricsLogin}
              disabled={isBiometricScanning}
              className={`w-[60px] h-[60px] rounded-full bg-[#7A1FA2] hover:bg-[#6a198f] active:scale-95 text-white flex items-center justify-center shadow-[0_4px_14px_rgba(122,31,162,0.28)] transition-all cursor-pointer overflow-hidden ${
                isBiometricScanning ? 'animate-pulse ring-4 ring-purple-300/60' : ''
              }`}
            >
              {renderBiometricGlyph(biometricMethod === 'faceid' ? 28 : 30, '#ffffff', 1.85, 32)}
            </button>

            <button
              type="button"
              onClick={handleBiometricsLogin}
              disabled={isBiometricScanning}
              className="text-[#1f2937] text-[11px] font-bold tracking-[0.16em] uppercase mt-3.5 cursor-pointer hover:text-[#7A1FA2] transition font-sans disabled:opacity-70"
            >
              USE BIOMETRICS
            </button>
          </div>

          {/* Bottom Actions: Golden Login Button + Copyright Footer */}
          <div className="w-full mt-auto">
            <button
              id="btn-cbe-login"
              type="button"
              disabled={isAuthLoading}
              onClick={handleLoginAttempt}
              className="w-full h-[52px] rounded-[14px] bg-[#b67b35] hover:bg-[#a66e2d] active:bg-[#966126] text-white font-semibold text-[16px] shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] font-sans disabled:opacity-70"
            >
              {isAuthLoading ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  <span className="text-[16px] font-semibold">Verifying...</span>
                </>
              ) : (
                <>
                  <span className="text-[16px] font-semibold">Login</span>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="13 6 19 12 13 18" />
                  </svg>
                </>
              )}
            </button>

            {/* FOOTER: © Commercial Bank of Ethiopia */}
            <div className="pt-5 pb-[max(env(safe-area-inset-bottom,0px),14px)] text-center text-[#6b7280] text-[12.5px] font-normal font-sans">
              &copy; Commercial Bank of Ethiopia
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM NUMERIC KEYPAD SHEET (Exact match to Photos 2 & 3 — opens ONLY when PIN box is clicked) */}
      {loginMode === 'pin' && showKeypad && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md mx-auto bg-[#f9f9fb] rounded-t-[26px] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] border-t border-neutral-100 px-4 pt-3 pb-[max(env(safe-area-inset-bottom,0px),22px)] shrink-0 animate-in slide-in-from-bottom-8 duration-200"
        >
          {/* Subtle grab handle bar at top center (tap to dismiss keypad) */}
          <button
            type="button"
            aria-label="Hide keypad"
            onClick={() => setShowKeypad(false)}
            className="w-full flex justify-center pb-3.5 pt-0.5 cursor-pointer"
          >
            <span className="w-10 h-[3.5px] bg-[#d8dade] rounded-full block" />
          </button>

          {/* 3x4 Numeric Keypad Grid (Exact match to Photos 2 & 3) */}
          <div className="grid grid-cols-3 gap-2.5 w-full">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className="h-[54px] sm:h-[58px] rounded-[12px] bg-[#f1f2f5] hover:bg-[#e8eaef] active:bg-[#dfe2e8] text-[#1f2937] text-[22px] font-medium flex items-center justify-center transition cursor-pointer select-none"
              >
                {digit}
              </button>
            ))}

            {/* Backspace Key: Red outline delete box with X inside */}
            <button
              type="button"
              aria-label="Backspace"
              onClick={handleBackspace}
              className="h-[54px] sm:h-[58px] rounded-[12px] bg-[#f1f2f5] hover:bg-[#e8eaef] active:bg-[#dfe2e8] text-[#d64545] flex items-center justify-center transition cursor-pointer select-none"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d64545" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 5H9l-6 7 6 7h12a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 21 5z" />
                <line x1="17.5" y1="9.5" x2="12.5" y2="14.5" />
                <line x1="12.5" y1="9.5" x2="17.5" y2="14.5" />
              </svg>
            </button>

            {/* 0 Key */}
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="h-[54px] sm:h-[58px] rounded-[12px] bg-[#f1f2f5] hover:bg-[#e8eaef] active:bg-[#dfe2e8] text-[#1f2937] text-[22px] font-medium flex items-center justify-center transition cursor-pointer select-none"
            >
              0
            </button>

            {/* Submit Checkmark Key: Muted gray/lavender when < 4 digits (Photo 2), solid CBE Purple with white check when filled (Photo 3) */}
            <button
              type="button"
              aria-label="Submit PIN"
              disabled={isAuthLoading}
              onClick={handleLoginAttempt}
              className={`h-[54px] sm:h-[58px] rounded-[12px] flex items-center justify-center transition-all duration-150 cursor-pointer select-none ${
                pin.length >= 4
                  ? 'bg-[#6E1B9E] hover:bg-[#5e1687] active:bg-[#4f1273] shadow-sm'
                  : 'bg-[#f1f2f5] hover:bg-[#eceaf2] active:bg-[#e5e1ee]'
              }`}
            >
              {isAuthLoading ? (
                <Loader2 className={`w-5 h-5 animate-spin ${pin.length >= 4 ? 'text-white' : 'text-[#6E1B9E]'}`} />
              ) : (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={pin.length >= 4 ? '#ffffff' : '#c7bdd6'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Centered Biometric Pop-Out Card (Android Fingerprint & iPhone Face ID) */}
      {biometricPopupPhase && (
        <div
          className={`fixed inset-0 z-50 bg-black/35 flex items-center justify-center px-6 pointer-events-none animate-in fade-in duration-150 ${
            biometricPopupPhase === 'authenticated'
              ? ''
              : biometricMethod === 'faceid'
                ? 'pt-10 sm:pt-8'
                : 'pb-32 sm:pb-24'
          }`}
        >
          <div className="w-[80%] max-w-[296px] min-h-[184px] rounded-[24px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.24)] px-6 py-7 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-150">
            {biometricPopupPhase === 'authenticated' ? (
              <>
                <div className="w-[70px] h-[70px] rounded-full bg-[#22c55e] flex items-center justify-center shadow-sm animate-in zoom-in-75 duration-200">
                  <Check className="w-10 h-10 text-white stroke-[3]" />
                </div>
                <p className="text-[#22c55e] text-[15.5px] font-medium mt-4 tracking-normal">
                  Authenticated!
                </p>
              </>
            ) : (
              <>
                <div className="relative w-[84px] h-[84px] flex items-center justify-center">
                  <svg
                    className="absolute inset-0 w-full h-full animate-spin"
                    style={{ animationDuration: '1.05s' }}
                    viewBox="0 0 84 84"
                    fill="none"
                  >
                    <circle
                      cx="42"
                      cy="42"
                      r="38"
                      stroke="#dc2626"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                      strokeDasharray="166 240"
                    />
                  </svg>
                  {renderBiometricGlyph(biometricMethod === 'faceid' ? 42 : 44, '#70189F', 2.0, 46)}
                </div>
                <p className="text-[#4b5563] text-[15px] font-medium mt-4 tracking-normal">
                  Authenticating...
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Notice when preview iframe blocks native OS WebAuthn (Face ID / Fingerprint) */}
      {iframeBlockedNotice && (
        <div
          onClick={() => setIframeBlockedNotice(null)}
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] flex items-center justify-center px-5 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-neutral-100 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-purple-100 text-[#70189F] flex items-center justify-center mx-auto mb-3 overflow-hidden">
              {renderBiometricGlyph(iframeBlockedNotice === 'faceid' ? 28 : 30, '#70189F', 2, 32)}
            </div>
            <h3 className="text-base font-bold text-neutral-900">
              Open Directly for Device {iframeBlockedNotice === 'faceid' ? 'Face ID' : 'Fingerprint'}
            </h3>
            <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
              Your browser blocks native device {iframeBlockedNotice === 'faceid' ? 'Face ID' : 'Fingerprint'} inside an embedded preview frame. Open the app directly in {iframeBlockedNotice === 'faceid' ? 'Safari' : 'Chrome'} or install it to use real device biometrics.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <a
                href={typeof window !== 'undefined' ? window.location.href : '/'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIframeBlockedNotice(null)}
                className="w-full py-2.5 rounded-2xl bg-[#70189F] hover:bg-[#5e1385] text-white font-semibold text-xs transition flex items-center justify-center"
              >
                Open in {iframeBlockedNotice === 'faceid' ? 'Safari' : 'Browser'}
              </a>
              <button
                type="button"
                onClick={() => {
                  setIframeBlockedNotice(null);
                  handleOpenPinMode();
                }}
                className="w-full py-2.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-xs transition cursor-pointer"
              >
                Enter PIN Instead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Solid White Device Navigation Bar Safe-Area Strip extending to the bottom edge */}
      <div 
        className="fixed bottom-0 inset-x-0 h-[max(env(safe-area-inset-bottom,0px),0px)] bg-white pointer-events-none z-30" 
      />

    </div>
  );
}

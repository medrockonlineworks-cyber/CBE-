import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalDb } from '../lib/mockData';
import { UserProfile } from '../types';
import { SystemBarsService } from '../services/systemBarsService';
import { PhoneSettingsService } from '../services/phoneSettingsService';
import { BiometricAuthService, BiometricMethod } from '../services/biometricAuthService';
import { AuthSessionService } from '../services/authSessionService';
import { CbeLogo } from './CbeLogo';
import { 
  Bell, 
  Check, 
  X, 
  Users, 
  Plus,
  Loader2,
  Lock
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
  const [accountPassword, setAccountPassword] = useState<string>('');
  const [credentialType, setCredentialType] = useState<'pin' | 'password'>('pin');
  const [loginMode, setLoginMode] = useState<'biometric' | 'pin'>('biometric');
  const [showError, setShowError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('This field is required');
  // showKeypad: Keyboard is ONLY activated when PIN input method is tapped
  const [showKeypad, setShowKeypad] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'አማርኛ'>('English');
  const [showLangMenu, setShowLangMenu] = useState<boolean>(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState<boolean>(false);
  const [showNotificationToast, setShowNotificationToast] = useState<boolean>(false);
  const [isBiometricScanning, setIsBiometricScanning] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [androidFingerprintPhase, setAndroidFingerprintPhase] = useState<
    null | 'scanning' | 'authenticating' | 'authenticated'
  >(null);
  const [iframeBlockedNotice, setIframeBlockedNotice] = useState<BiometricMethod | null>(null);
  const autoPromptedRef = useRef<boolean>(false);

  // Detect iOS / iPhone device (physical iPhone/iPad OR iPhone phone model preset)
  // On iPhone -> Face ID + notch safe area; on Android -> Fingerprint
  const [isIOSDevice, setIsIOSDevice] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return PhoneSettingsService.isIPhoneDevice() || PhoneSettingsService.isIPhoneMode();
  });

  const [biometricMethod, setBiometricMethod] = useState<BiometricMethod>(() =>
    BiometricAuthService.getBiometricMethod()
  );

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
      setIsIOSDevice(PhoneSettingsService.isIPhoneDevice() || PhoneSettingsService.isIPhoneMode());
      setBiometricMethod(BiometricAuthService.getBiometricMethod());
    };

    const unsubPhoneSettings = PhoneSettingsService.subscribe(() => {
      setIsIOSDevice(PhoneSettingsService.isIPhoneDevice() || PhoneSettingsService.isIPhoneMode());
      setBiometricMethod(BiometricAuthService.getBiometricMethod());
    });

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('cbe_account_switched', handleUpdate);
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
      window.removeEventListener('tana_phone_settings_changed', handleSettingsChange);
      SystemBarsService.applyDualSystemBars();
    };
  }, []);

  // Handle typing from physical keyboard when in PIN mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showAccountSwitcher || loginMode !== 'pin' || credentialType !== 'pin') return;
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
        void handleLoginAttempt();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, selectedUser, showAccountSwitcher, loginMode, credentialType]);

  // STEP 2 & 3: On native mobile app launch, auto-trigger OS biometric prompt if previously enabled for this account
  useEffect(() => {
    if (autoPromptedRef.current) return;
    if (
      typeof window !== 'undefined' &&
      Capacitor.isNativePlatform() &&
      BiometricAuthService.isBiometricEnrolledForUser(selectedUser.id)
    ) {
      autoPromptedRef.current = true;
      const timer = setTimeout(() => {
        void handleBiometricsLogin();
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [selectedUser.id]);

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

  const handleLoginAttempt = async () => {
    if (isAuthLoading) return;

    if (credentialType === 'password') {
      if (!accountPassword || accountPassword.trim().length < 6) {
        setShowError(true);
        setErrorMessage('Password must be at least 6 characters');
        return;
      }
    } else {
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
    }

    setIsAuthLoading(true);
    setShowError(false);

    const secret = credentialType === 'password' ? accountPassword : pin;
    const authRes = await AuthSessionService.loginWithCredentials({
      userId: selectedUser.id,
      email: selectedUser.email,
      authType: credentialType,
      secret,
    });

    setIsAuthLoading(false);

    if (!authRes.ok) {
      setShowError(true);
      setErrorMessage(authRes.message || 'Authentication failed. Please try again.');
      if (credentialType === 'pin') setPin('');
      else setAccountPassword('');
      return;
    }

    if (credentialType === 'pin') {
      await BiometricAuthService.saveAppPin(selectedUser.id, pin);
    } else {
      await BiometricAuthService.saveAppPassword(selectedUser.id, accountPassword);
    }

    LocalDb.addAuditLog(
      selectedUser.id,
      selectedUser.email,
      'USER_LOGIN',
      `User ${selectedUser.name} signed in via verified ${credentialType} session.`
    );
    localStorage.setItem('tana_active_user_id', selectedUser.id);
    onLoginSuccess(selectedUser, 'credentials');
  };

  const handleBiometricsLogin = async () => {
    if (isBiometricScanning || androidFingerprintPhase || isAuthLoading) return;
    setIsBiometricScanning(true);
    setShowError(false);

    const isNativePlatform = Capacitor.isNativePlatform();
    let authTimer: ReturnType<typeof setTimeout> | null = null;
    if (
      !isNativePlatform &&
      biometricMethod === 'fingerprint' &&
      BiometricAuthService.isBiometricEnrolledForUser(selectedUser.id)
    ) {
      setAndroidFingerprintPhase('scanning');
      authTimer = setTimeout(() => {
        setAndroidFingerprintPhase((prev) => (prev === 'scanning' ? 'authenticating' : prev));
      }, 1100);
    }

    const result = await BiometricAuthService.authenticateWithDevice(selectedUser);
    if (authTimer) clearTimeout(authTimer);

    if (result.status === 'success') {
      const methodLabel = result.method === 'faceid' ? 'Face ID' : 'Fingerprint';
      LocalDb.addAuditLog(
        selectedUser.id,
        selectedUser.email,
        'BIOMETRIC_LOGIN',
        `User ${selectedUser.name} unlocked session via device ${methodLabel} & backend token rotation.`
      );
      localStorage.setItem('tana_active_user_id', selectedUser.id);

      if (!isNativePlatform && result.method === 'fingerprint') {
        setAndroidFingerprintPhase('authenticating');
        await new Promise((resolve) => setTimeout(resolve, 260));
        setAndroidFingerprintPhase('authenticated');
        await new Promise((resolve) => setTimeout(resolve, 600));
        setAndroidFingerprintPhase(null);
      }

      setIsBiometricScanning(false);
      onLoginSuccess(selectedUser, 'biometric');
      return;
    }

    setAndroidFingerprintPhase(null);
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
    setAccountPassword('');
  };

  const handleOpenPinMode = () => {
    setShowError(false);
    setErrorMessage('This field is required');
    setCredentialType('pin');
    setLoginMode('pin');
    setShowKeypad(true);
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

      {/* TOP BRANDING & CONDITIONAL PIN INPUT AREA */}
      <div
        className={`px-6 max-w-md mx-auto w-full flex flex-col justify-center ${
          loginMode === 'pin' && showKeypad
            ? 'pt-2 pb-1'
            : loginMode === 'pin'
              ? 'py-4 flex-1 my-auto'
              : 'pt-8 sm:pt-10 pb-2'
        }`}
      >
        
        {/* Brand Emblem & Headers */}
        <div className="flex flex-col items-center text-center">
          
          {/* Golden Spiral Emblem */}
          <div className="w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center mb-3">
            <CbeLogo className="w-18 h-18 sm:w-20 sm:h-20 object-contain drop-shadow-xs" />
          </div>

          {/* Amharic Header in Golden Bronze (Authentic Ethiopic typography) */}
          <h2 className="text-[#c09349] font-semibold text-[20px] sm:text-[21px] tracking-normal leading-tight font-['Noto_Serif_Ethiopic','Noto_Sans_Ethiopic',serif]">
            የኢትዮጵያ ንግድ ባንክ
          </h2>

          {/* English Header in Spaced Charcoal */}
          <h1 className="text-[#374151] font-semibold text-[10.5px] sm:text-[11px] tracking-[0.24em] uppercase mt-1.5 font-sans">
            COMMERCIAL BANK OF ETHIOPIA
          </h1>

          {/* Hairline Divider */}
          <div className="w-40 h-[1px] bg-neutral-200/90 mt-4 mb-4" />

          {/* Welcome back Subtitle */}
          <p className="text-[#6b7280] font-normal text-[16px] font-sans">
            Welcome back
          </p>
          <p className="text-[#9ca3af] font-normal text-[12px] font-sans mt-0.5">
            Authenticate to continue.
          </p>
        </div>

        {/* PIN OR PASSWORD RECOVERY INPUT FIELD: Shown ONLY after clicking "Use PIN" */}
        {loginMode === 'pin' && (
          <div className="mt-5 mb-1 animate-in fade-in duration-150">
            {credentialType === 'pin' ? (
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
                {/* Golden Padlock Icon with Arched Shackle */}
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
            ) : (
              <div className="w-full rounded-[18px] bg-white border border-neutral-300 focus-within:border-[#c58c2b] focus-within:ring-2 focus-within:ring-[#c58c2b]/20 py-3 px-4 flex items-center gap-3 shadow-xs">
                <Lock className="w-4.5 h-4.5 text-[#d49a37] shrink-0" />
                <input
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-form-type="other"
                  placeholder="Account Password (min 6 chars)"
                  value={accountPassword}
                  onChange={(e) => {
                    setShowError(false);
                    setAccountPassword(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleLoginAttempt();
                    }
                  }}
                  className="flex-1 text-[14px] text-neutral-800 bg-transparent focus:outline-none [-webkit-text-security:disc]"
                />
                {accountPassword.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAccountPassword('')}
                    className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-end mt-2 px-1">
              <button
                type="button"
                onClick={() => {
                  setShowError(false);
                  if (credentialType === 'pin') {
                    setCredentialType('password');
                    setShowKeypad(false);
                  } else {
                    setCredentialType('pin');
                    setShowKeypad(true);
                  }
                }}
                className="text-[11.5px] font-medium text-[#70189F] hover:underline cursor-pointer"
              >
                {credentialType === 'pin' ? 'Use Password Login' : 'Use PIN Keypad'}
              </button>
            </div>

            {showError && (
              <p className="text-[#e05347] text-[12px] font-normal mt-1.5 text-center animate-in fade-in">
                {errorMessage}
              </p>
            )}
          </div>
        )}

      </div>

      {/* DEFAULT VIEW: BIOMETRIC LOGIN SCREEN (Exact match to IMG_1247_9b2d1afc.jpeg) */}
      {loginMode === 'biometric' && (
        <div className="px-6 max-w-md mx-auto w-full flex-1 flex flex-col justify-between pb-6 animate-in fade-in duration-150">
          
          {/* Centered Biometric Halo Button + USE BIOMETRICS + Use PIN */}
          <div className="flex-1 flex flex-col items-center justify-center pb-6">
            {/* Circular Purple Biometrics Button with soft lavender halo & white inner ring */}
            <button
              id="btn-use-biometrics"
              type="button"
              aria-label="Use Biometrics"
              onClick={handleBiometricsLogin}
              disabled={isBiometricScanning}
              className={`w-[84px] h-[84px] rounded-full bg-[#841ca6]/18 p-[5px] flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                isBiometricScanning ? 'animate-pulse ring-4 ring-purple-300/60' : 'hover:bg-[#841ca6]/24'
              }`}
            >
              <span className="w-full h-full rounded-full bg-[#841ca6] hover:bg-[#731693] border-[2px] border-white flex items-center justify-center text-white shadow-sm transition-colors">
                {biometricMethod === 'faceid' ? (
                  <CbeFaceIdIcon size={35} strokeColor="#ffffff" strokeWidth={1.9} />
                ) : (
                  <CbeFingerprintIcon size={37} strokeColor="#ffffff" strokeWidth={1.9} />
                )}
              </span>
            </button>

            {/* "USE BIOMETRICS" text */}
            <button
              type="button"
              onClick={handleBiometricsLogin}
              disabled={isBiometricScanning}
              className="text-[#6b7280] text-[11.5px] font-semibold tracking-[0.18em] uppercase mt-4 cursor-pointer hover:text-[#70189F] transition font-sans disabled:opacity-70"
            >
              USE BIOMETRICS
            </button>

            {/* Underlined "Use PIN" link -> reveals PIN input method */}
            <button
              id="btn-use-pin"
              type="button"
              onClick={handleOpenPinMode}
              className="text-[#6b7280] hover:text-[#1f2937] text-[14px] font-medium underline underline-offset-[4px] decoration-[#6b7280]/75 mt-5 cursor-pointer transition font-sans"
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
          <div 
            style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 8px), 16px)' }}
            className="text-center text-[#737882] text-[12px] font-normal font-sans"
          >
            &copy; Commercial Bank of Ethiopia
          </div>
        </div>
      )}

      {/* PIN MODE (Keypad collapsed): Login button + Use Biometrics switch */}
      {loginMode === 'pin' && !showKeypad && (
        <div className="px-6 max-w-md mx-auto w-full flex-1 flex flex-col justify-between pb-6 animate-in fade-in duration-150">
          
          {/* Center Biometrics Switch */}
          <div className="flex flex-col items-center mt-6">
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
              {biometricMethod === 'faceid' ? (
                <CbeFaceIdIcon size={30} strokeColor="#ffffff" strokeWidth={1.9} />
              ) : (
                <CbeFingerprintIcon size={32} strokeColor="#ffffff" strokeWidth={1.9} />
              )}
            </button>

            <button
              type="button"
              onClick={handleBiometricsLogin}
              disabled={isBiometricScanning}
              className="text-[#1f2937] text-[11px] font-bold tracking-[0.16em] uppercase mt-3 cursor-pointer hover:text-[#70189F] transition font-sans disabled:opacity-70"
            >
              USE BIOMETRICS
            </button>

            <button
              type="button"
              onClick={() => {
                setShowError(false);
                setShowKeypad(false);
                setLoginMode('biometric');
              }}
              className="text-[#6b7280] hover:text-[#1f2937] text-xs font-medium underline underline-offset-4 mt-3 cursor-pointer font-sans"
            >
              Back to Biometrics
            </button>
          </div>

          {/* Bottom Actions: Login Button + Footer */}
          <div className="w-full mt-auto">
            {/* Wide Golden/Bronze "Login ->" Button (Exact replica of Image 1 & 2) */}
            <button
              id="btn-cbe-login"
              type="button"
              disabled={isAuthLoading}
              onClick={handleLoginAttempt}
              className="w-full py-3.5 rounded-[18px] bg-[#c58c2b] hover:bg-[#b87f22] active:bg-[#a9731b] text-white font-semibold text-[16px] shadow-sm transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99] font-sans disabled:opacity-70"
            >
              {isAuthLoading ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  <span className="text-[16px] font-semibold">Verifying...</span>
                </>
              ) : (
                <>
                  <span className="text-[16px] font-semibold">Login</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
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

      {/* VIEW B: ON-SCREEN NUMERIC KEYPAD (Shown in PIN mode when keypad is open) */}
      {loginMode === 'pin' && showKeypad && (
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
              disabled={isBiometricScanning}
              className="flex items-center gap-1.5 text-xs font-bold text-[#70189F] hover:underline cursor-pointer disabled:opacity-70"
            >
              {biometricMethod === 'faceid' ? (
                <CbeFaceIdIcon size={18} strokeColor="#70189F" strokeWidth={2.0} />
              ) : (
                <CbeFingerprintIcon size={18} strokeColor="#70189F" strokeWidth={2.0} />
              )}
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

      {/* Android Centered Fingerprint Verification Card (mirrors 6935559364592253295_62743a59.mp4) */}
      {androidFingerprintPhase && (
        <div
          className={`fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6 pointer-events-none animate-in fade-in duration-150 ${
            androidFingerprintPhase === 'authenticated' ? '' : 'pb-28 sm:pb-24'
          }`}
        >
          <div className="w-[86%] max-w-[318px] min-h-[168px] rounded-[24px] bg-white shadow-[0_18px_48px_rgba(0,0,0,0.28)] px-6 py-7 flex flex-col items-center justify-center text-center">
            {androidFingerprintPhase === 'authenticated' ? (
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
                <div className="relative w-[82px] h-[82px] flex items-center justify-center">
                  <svg
                    className="absolute inset-0 w-full h-full animate-spin"
                    style={{ animationDuration: '1.1s' }}
                    viewBox="0 0 84 84"
                    fill="none"
                  >
                    <circle
                      cx="42"
                      cy="42"
                      r="38"
                      stroke="#dc2626"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeDasharray="112 130"
                    />
                  </svg>
                  <CbeFingerprintIcon size={46} strokeColor="#7c22a8" strokeWidth={2.0} />
                </div>
                {androidFingerprintPhase === 'authenticating' && (
                  <p className="text-[#6b7280] text-[14.5px] font-medium mt-3.5 animate-in fade-in duration-150">
                    Authenticating...
                  </p>
                )}
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
            <div className="w-14 h-14 rounded-full bg-purple-100 text-[#70189F] flex items-center justify-center mx-auto mb-3">
              {iframeBlockedNotice === 'faceid' ? (
                <CbeFaceIdIcon size={28} strokeColor="#70189F" strokeWidth={2} />
              ) : (
                <CbeFingerprintIcon size={30} strokeColor="#70189F" strokeWidth={2} />
              )}
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

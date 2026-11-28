import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile } from '../types';
import { LocalDb, DEFAULT_CBE_LOGO, previewCbeTxId, sanitizeStartingTxPrefix, getDefaultStartingTxPrefix } from '../lib/mockData';
import { SmsService } from '../services/smsService';
import { TruecallerService } from '../services/truecallerService';
import { BiometricAuthService, BiometricAvailability } from '../services/biometricAuthService';
import { AuthSessionService, ActiveDeviceSession } from '../services/authSessionService';
import { CbeLogo } from './CbeLogo';
import { compressImageFile } from '../lib/imageUtils';
import { CbeFingerprintIcon, CbeFaceIdIcon } from './Auth';
import { 
  User, 
  Lock, 
  KeyRound, 
  Fingerprint, 
  Languages, 
  HelpCircle, 
  FileText, 
  LogOut, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Bell, 
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Image as ImageIcon,
  Upload,
  Sparkles,
  Edit3,
  CreditCard,
  Shuffle,
  Users,
  UserPlus,
  Save,
  X,
  MessageSquare,
  Smartphone,
  PhoneCall,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  MonitorSmartphone,
  Hash,
  Download
} from 'lucide-react';
import BankLogoModal from './BankLogoModal';
import AppInstallPrompt from './AppInstallPrompt';
import NotificationSettingsCard from './NotificationSettingsCard';
import { PushNotificationService } from '../services/pushNotificationService';
import { AppUpdateService, InstalledAppInfo } from '../services/appUpdateService';
import EthiopianNameAutocomplete, { EthiopianThreePartNameInput } from './EthiopianNameAutocomplete';

interface ProfileProps {
  currentUser: UserProfile;
  onLogout: () => void;
  onUpdateUser: (user: UserProfile) => void;
  onOpenAdmin: () => void;
  onBack?: () => void;
  onOpenSmsSimulator?: () => void;
  onOpenTruecallerSimulator?: () => void;
  onOpenPhoneApp?: () => void;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'am', label: 'Amharic (አማርኛ)' },
  { code: 'or', label: 'Oromo (Afaan Oromoo)' },
  { code: 'ti', label: 'Tigrinya (ትግርኛ)' }
];

export default function Profile({ 
  currentUser, 
  onLogout, 
  onUpdateUser, 
  onOpenAdmin, 
  onBack,
  onOpenSmsSimulator, 
  onOpenTruecallerSimulator, 
  onOpenPhoneApp,
}: ProfileProps) {
  const [activeLang, setActiveLang] = useState('en');
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [customBankLogo, setCustomBankLogo] = useState<string | null>(() => LocalDb.getCustomBankLogo());
  const [unreadSmsCount, setUnreadSmsCount] = useState<number>(() => SmsService.getUnreadSmsCount());

  useEffect(() => {
    const handleSmsCountUpdate = () => {
      setUnreadSmsCount(SmsService.getUnreadSmsCount());
    };
    window.addEventListener('sms-created', handleSmsCountUpdate);
    window.addEventListener('sms-updated', handleSmsCountUpdate);
    return () => {
      window.removeEventListener('sms-created', handleSmsCountUpdate);
      window.removeEventListener('sms-updated', handleSmsCountUpdate);
    };
  }, []);
  
  const isAdmin = currentUser.role === 'admin' || currentUser.email === 'leykunjemaneh3@gmail.com';
  
  // Settings toggles
  const [biometrics, setBiometrics] = useState(() =>
    BiometricAuthService.isBiometricEnrolledForUser(currentUser.id)
  );
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [customBiometricIcon, setCustomBiometricIcon] = useState<string | null>(() =>
    LocalDb.getCustomBiometricIcon()
  );
  const [isUploadingBiometricIcon, setIsUploadingBiometricIcon] = useState(false);
  const [availabilityInfo, setAvailabilityInfo] = useState<BiometricAvailability | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [emailStatements, setEmailStatements] = useState(false);

  useEffect(() => {
    const syncBiometricIcon = () => {
      setCustomBiometricIcon(LocalDb.getCustomBiometricIcon());
    };
    window.addEventListener('cbe_biometric_icon_updated', syncBiometricIcon);
    window.addEventListener('storage', syncBiometricIcon);
    return () => {
      window.removeEventListener('cbe_biometric_icon_updated', syncBiometricIcon);
      window.removeEventListener('storage', syncBiometricIcon);
    };
  }, []);

  // Active backend device sessions
  const [activeSessions, setActiveSessions] = useState<ActiveDeviceSession[]>([]);
  const [showSessionsPanel, setShowSessionsPanel] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Starting Transaction ID Code customization
  const [savedTxPrefix, setSavedTxPrefix] = useState<string>(() => LocalDb.getStartingTxPrefix());
  const [txPrefixInput, setTxPrefixInput] = useState<string>(() => LocalDb.getStartingTxPrefix());
  const buildDistinctTxSamples = (prefixVal: string): [string, string] => {
    const first = previewCbeTxId(prefixVal);
    let second = previewCbeTxId(prefixVal);
    for (let i = 0; i < 8 && second === first; i++) {
      second = previewCbeTxId(prefixVal);
    }
    return [first, second];
  };
  const [txPreviewSamples, setTxPreviewSamples] = useState<[string, string]>(() =>
    buildDistinctTxSamples(LocalDb.getStartingTxPrefix())
  );

  useEffect(() => {
    const handlePrefixUpdated = () => {
      const currentSaved = LocalDb.getStartingTxPrefix();
      setSavedTxPrefix(currentSaved);
      setTxPrefixInput(currentSaved);
      setTxPreviewSamples(buildDistinctTxSamples(currentSaved));
    };
    window.addEventListener('cbe_tx_prefix_updated', handlePrefixUpdated);
    return () => window.removeEventListener('cbe_tx_prefix_updated', handlePrefixUpdated);
  }, []);

  // Security Settings Re-Authentication Gate
  const [securityUnlockedUntil, setSecurityUnlockedUntil] = useState<number>(0);
  const [showSecurityAuthGate, setShowSecurityAuthGate] = useState(false);
  const [securityAuthMode, setSecurityAuthMode] = useState<'pin' | 'password'>('pin');
  const [securityAuthSecret, setSecurityAuthSecret] = useState('');
  const [securityAuthError, setSecurityAuthError] = useState('');
  const [securityAuthLoading, setSecurityAuthLoading] = useState(false);
  const [pendingSecurityAction, setPendingSecurityAction] = useState<(() => Promise<void> | void) | null>(null);

  // Edit Profile / Account Form States
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editAccount, setEditAccount] = useState(currentUser.accountNumber);
  const [editBalance, setEditBalance] = useState(() => (currentUser.balance ?? 18450.50).toFixed(2));
  const [editPhone, setEditPhone] = useState(currentUser.phone);
  const [editEmail, setEditEmail] = useState(currentUser.email);
  const [editAccountType, setEditAccountType] = useState<UserProfile['accountType']>(currentUser.accountType || 'savings');

  useEffect(() => {
    setEditName(currentUser.name);
    setEditAccount(currentUser.accountNumber);
    setEditBalance((currentUser.balance ?? 18450.50).toFixed(2));
    setEditPhone(currentUser.phone);
    setEditEmail(currentUser.email);
    setEditAccountType(currentUser.accountType || 'savings');
    setBiometrics(BiometricAuthService.isBiometricEnrolledForUser(currentUser.id));
  }, [currentUser]);

  // Account Switcher / Multi-Account Registration Modal
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [accountsSearchTerm, setAccountsSearchTerm] = useState('');
  const [showNewAccountForm, setShowNewAccountForm] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccNumber, setNewAccNumber] = useState(() => '1000' + Math.floor(100000000 + Math.random() * 900000000).toString());
  const [newAccPhone, setNewAccPhone] = useState('+2519');
  const [newAccEmail, setNewAccEmail] = useState('');
  const [newAccType, setNewAccType] = useState<'savings' | 'checking' | 'wadiah' | 'cbe_birr'>('savings');
  const [newAccInitialBalance, setNewAccInitialBalance] = useState('25000.00');

  // Fast memoized registered users list for instant switching
  const allRegisteredUsers = useMemo(() => {
    return LocalDb.getUsers();
  }, [showAccountsModal]);

  // Forms
  const [showPinForm, setShowPinForm] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');

  const [showPassForm, setShowPassForm] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');

  const [showTerms, setShowTerms] = useState(false);
  const [legalModalMode, setLegalModalMode] = useState<'terms' | 'privacy'>('terms');

  // Authentic CBE Settings view (default) vs Full Existing Settings view (opened by tapping "Settings" at top)
  const [showLegacySettings, setShowLegacySettings] = useState(false);
  const [activePreferenceSheet, setActivePreferenceSheet] = useState<
    null | 'language' | 'account' | 'notifications' | 'services' | 'biometrics' | 'pin' | 'passphrase' | 'logout'
  >(null);
  const [fastTransferConfirm, setFastTransferConfirm] = useState(true);
  const [showQuickBalanceOnHome, setShowQuickBalanceOnHome] = useState(true);

  // App Update Check States
  const [installedAppInfo, setInstalledAppInfo] = useState<InstalledAppInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatusNote, setUpdateStatusNote] = useState<string>('');

  useEffect(() => {
    let active = true;
    AppUpdateService.getInstalledAppInfo().then((info) => {
      if (active && info) setInstalledAppInfo(info);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleManualUpdateCheck = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    setUpdateStatusNote('');
    const result = await AppUpdateService.checkForUpdate({ manual: true, respectSnooze: false });
    setCheckingUpdate(false);

    if (result.status === 'update_available') {
      setUpdateStatusNote(`New version v${result.update.latestVersionName} available`);
      window.dispatchEvent(
        new CustomEvent('cbe_open_app_update_modal', { detail: { update: result.update } })
      );
      return;
    }
    if (result.status === 'up_to_date') {
      setUpdateStatusNote(`Up to date (v${result.installed.versionName})`);
      return;
    }
    setUpdateStatusNote(result.message);
  };

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle hardware / phone back event: close any open sub-modals or navigate back to Home
  useEffect(() => {
    const handlePhoneBack = (e: any) => {
      if (showEditProfileModal) {
        setShowEditProfileModal(false);
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        return;
      }
      if (showAccountsModal) {
        setShowAccountsModal(false);
        setShowNewAccountForm(false);
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        return;
      }
      if (showPinForm) {
        setShowPinForm(false);
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        return;
      }
      if (showPassForm) {
        setShowPassForm(false);
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        return;
      }
      if (showTerms) {
        setShowTerms(false);
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        return;
      }
      if (showSecurityAuthGate) {
        setShowSecurityAuthGate(false);
        setPendingSecurityAction(null);
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        return;
      }
      if (showLogoModal) {
        setShowLogoModal(false);
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        return;
      }
      if (activePreferenceSheet) {
        setActivePreferenceSheet(null);
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        return;
      }
      if (showLegacySettings) {
        setShowLegacySettings(false);
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        return;
      }
      if (onBack) {
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        onBack();
      }
    };

    window.addEventListener('cbe_phone_back', handlePhoneBack);
    return () => {
      window.removeEventListener('cbe_phone_back', handlePhoneBack);
    };
  }, [
    showEditProfileModal,
    showAccountsModal,
    showPinForm,
    showPassForm,
    showTerms,
    showSecurityAuthGate,
    showLogoModal,
    activePreferenceSheet,
    showLegacySettings,
    onBack,
  ]);

  const generateRandomCbeAccount = () => {
    return '1000' + Math.floor(100000000 + Math.random() * 900000000).toString();
  };

  const handleOpenEditProfile = () => {
    setEditName(currentUser.name);
    setEditAccount(currentUser.accountNumber);
    setEditBalance((currentUser.balance ?? 18450.50).toFixed(2));
    setEditPhone(currentUser.phone);
    setEditEmail(currentUser.email);
    setEditAccountType(currentUser.accountType || 'savings');
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!editName.trim()) {
      setErrorMsg('Full Name cannot be empty.');
      return;
    }
    const cleanEditAcc = editAccount.replace(/\D/g, '');
    if (cleanEditAcc.length !== 13) {
      setErrorMsg(`Bank account number must be exactly 13 digits (currently ${cleanEditAcc.length} digits). CBE account numbers cannot be less than or greater than 13 digits.`);
      return;
    }

    const parsedBal = parseFloat(editBalance.replace(/,/g, ''));
    if (isNaN(parsedBal) || parsedBal < 0) {
      setErrorMsg('Please enter a valid non-negative account balance.');
      return;
    }

    const updated = LocalDb.updateUserProfile(currentUser.id, {
      name: editName.trim(),
      accountNumber: cleanEditAcc,
      phone: editPhone.trim(),
      email: editEmail.trim(),
      accountType: editAccountType,
      balance: Math.round(parsedBal * 100) / 100
    });

    if (updated) {
      onUpdateUser(updated);
      setSuccessMsg('Account details and balance updated successfully!');
      setShowEditProfileModal(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg('Failed to update user profile.');
    }
  };

  const handleSwitchAccount = (targetUser: UserProfile) => {
    // 1. Immediately close modal and switch active session
    setShowAccountsModal(false);
    if (targetUser.id === currentUser.id) return;

    localStorage.setItem('tana_active_user_id', targetUser.id);
    setEditName(targetUser.name);
    setEditAccount(targetUser.accountNumber);
    setEditBalance((targetUser.balance ?? 18450.50).toFixed(2));
    setEditPhone(targetUser.phone);
    setEditEmail(targetUser.email);
    setEditAccountType(targetUser.accountType || 'savings');
    onUpdateUser(targetUser);

    setSuccessMsg(`Switched to: ${targetUser.name}`);
    setTimeout(() => setSuccessMsg(''), 2500);

    // 2. Non-blocking asynchronous sync so UI switches instantaneously without stutter
    setTimeout(() => {
      try {
        SmsService.ensureAccount(targetUser.accountNumber, targetUser.name, targetUser.balance);
        SmsService.setActiveAccountNumber(targetUser.accountNumber);
        TruecallerService.syncBalance(targetUser.accountNumber, targetUser.balance);
        TruecallerService.setActiveAccountNumber(targetUser.accountNumber);
        window.dispatchEvent(new CustomEvent('cbe_account_switched', { detail: { user: targetUser } }));
        window.dispatchEvent(new CustomEvent('cbe_balance_updated', { detail: { user: targetUser, balance: targetUser.balance } }));
        LocalDb.addAuditLog(targetUser.id, targetUser.email, 'USER_SWITCH_ACCOUNT', `Switched active session from ${currentUser.name} to ${targetUser.name} (A/C: ${targetUser.accountNumber}).`);
      } catch {}
    }, 0);
  };

  const handleRegisterNewAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newAccName.trim()) {
      setErrorMsg('Account holder name is required.');
      return;
    }
    const cleanNewAcc = newAccNumber.replace(/\D/g, '');
    if (cleanNewAcc.length !== 13) {
      setErrorMsg(`Account number must be exactly 13 digits (entered ${cleanNewAcc.length} digits).`);
      return;
    }

    const users = LocalDb.getUsers();
    const formattedPhone = newAccPhone.trim().startsWith('+251') 
      ? newAccPhone.trim() 
      : '+251' + newAccPhone.trim().replace(/^0/, '');

    const parsedBalance = parseFloat(newAccInitialBalance) || 25000.00;

    const newUser: UserProfile = {
      id: 'user_' + Math.random().toString(36).substring(2, 9),
      name: newAccName.trim(),
      phone: formattedPhone || '+2519' + Math.floor(10000000 + Math.random() * 90000000).toString(),
      email: newAccEmail.trim() || `${newAccName.toLowerCase().replace(/\s+/g, '')}@tana.demo`,
      role: 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
      accountNumber: cleanNewAcc,
      accountType: newAccType,
      balance: parsedBalance,
      availableBalance: parsedBalance,
      biometricEnabled: false
    };

    users.push(newUser);
    LocalDb.setUsers(users);

    LocalDb.addAuditLog(newUser.id, newUser.email, 'USER_REGISTER_EXTRA', `Registered new account ${newUser.name} with A/C ${newUser.accountNumber}.`);
    LocalDb.addNotification(newUser.id, 'Welcome to Tana Digital Bank!', `Account created with balance ETB ${parsedBalance.toLocaleString()}.`, 'success');

    // Switch to newly created account
    localStorage.setItem('tana_active_user_id', newUser.id);
    onUpdateUser(newUser);
    setShowNewAccountForm(false);
    setShowAccountsModal(false);
    setSuccessMsg(`New account for "${newUser.name}" (A/C: ${newUser.accountNumber}) created and activated!`);
    setTimeout(() => setSuccessMsg(''), 5000);

    try {
      SmsService.ensureAccount(newUser.accountNumber, newUser.name, newUser.balance);
      SmsService.setActiveAccountNumber(newUser.accountNumber);
      TruecallerService.syncBalance(newUser.accountNumber, newUser.balance);
      TruecallerService.setActiveAccountNumber(newUser.accountNumber);
      window.dispatchEvent(new CustomEvent('cbe_account_switched', { detail: { user: newUser } }));
      window.dispatchEvent(new CustomEvent('cbe_balance_updated', { detail: { user: newUser, balance: newUser.balance } }));
    } catch {}
  };

  const syncUserBiometricFlag = (enabled: boolean) => {
    setBiometrics(enabled);
    const updated = { ...currentUser, biometricEnabled: enabled };
    onUpdateUser(updated);

    const users = LocalDb.getUsers();
    const idx = users.findIndex((u) => u.id === currentUser.id);
    if (idx !== -1) {
      users[idx].biometricEnabled = enabled;
      LocalDb.setUsers(users);
    }
  };

  const requireSecurityAuth = async (action: () => Promise<void> | void) => {
    const hasToken = Boolean(await AuthSessionService.ensureValidAccessToken());
    if (Date.now() < securityUnlockedUntil && hasToken) {
      await action();
      return;
    }
    setPendingSecurityAction(() => action);
    setSecurityAuthSecret('');
    setSecurityAuthError('');
    setSecurityAuthMode('pin');
    setShowSecurityAuthGate(true);
  };

  const handleVerifySecurityGateWithCredentials = async () => {
    if (securityAuthLoading) return;
    if (!securityAuthSecret.trim()) {
      setSecurityAuthError(
        securityAuthMode === 'pin' ? 'Please enter your current PIN.' : 'Please enter your account password.'
      );
      return;
    }

    setSecurityAuthLoading(true);
    setSecurityAuthError('');

    const res = await AuthSessionService.loginWithCredentials({
      userId: currentUser.id,
      email: currentUser.email,
      authType: securityAuthMode,
      secret: securityAuthSecret.trim(),
    });

    setSecurityAuthLoading(false);

    if (!res.ok) {
      setSecurityAuthError(res.message || 'Verification failed.');
      return;
    }

    setSecurityUnlockedUntil(Date.now() + 2 * 60 * 1000);
    setShowSecurityAuthGate(false);
    setSecurityAuthSecret('');
    const actionToRun = pendingSecurityAction;
    setPendingSecurityAction(null);
    if (actionToRun) {
      await actionToRun();
    }
  };

  const handleVerifySecurityGateWithBiometrics = async () => {
    if (securityAuthLoading) return;
    setSecurityAuthLoading(true);
    setSecurityAuthError('');

    const res = await BiometricAuthService.authenticateWithDevice(currentUser);
    setSecurityAuthLoading(false);

    if (res.status !== 'success') {
      setSecurityAuthError(res.message || 'Biometric verification failed. Please use your PIN or password.');
      return;
    }

    setSecurityUnlockedUntil(Date.now() + 2 * 60 * 1000);
    setShowSecurityAuthGate(false);
    const actionToRun = pendingSecurityAction;
    setPendingSecurityAction(null);
    if (actionToRun) {
      await actionToRun();
    }
  };

  const performEnableBiometrics = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setBiometricBusy(true);
    const methodLabel = BiometricAuthService.getDeviceBiometricName();

    const res = await BiometricAuthService.enableBiometricLogin(currentUser);
    setBiometricBusy(false);

    if (res.status === 'success') {
      syncUserBiometricFlag(true);
      const label = BiometricAuthService.getDeviceBiometricName(res.method);
      LocalDb.addNotification(
        currentUser.id,
        'Biometric Login Enabled',
        `${label} login has been activated for your account.`,
        'success'
      );
      LocalDb.addAuditLog(
        currentUser.id,
        currentUser.email,
        'BIOMETRIC_ENABLED',
        `User enabled ${label} authentication with hardware-backed session token.`
      );
      setSuccessMsg(`${label} login activated successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      return;
    }

    syncUserBiometricFlag(BiometricAuthService.isBiometricEnrolledForUser(currentUser.id));
    setErrorMsg(res.message || `Unable to enable ${methodLabel} login on this device.`);
  };

  const performDisableBiometrics = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setBiometricBusy(true);
    const methodLabel = BiometricAuthService.getDeviceBiometricName();

    await BiometricAuthService.disableBiometricLogin(currentUser.id);
    setBiometricBusy(false);
    syncUserBiometricFlag(false);

    LocalDb.addNotification(
      currentUser.id,
      'Biometric Settings Updated',
      `${methodLabel} verification has been disabled and cleared from secure storage.`,
      'info'
    );
    LocalDb.addAuditLog(
      currentUser.id,
      currentUser.email,
      'BIOMETRIC_DISABLED',
      `User disabled ${methodLabel} authentication and cleared sealed refresh credentials.`
    );
    setSuccessMsg(`${methodLabel} login disabled and secure credentials cleared.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleToggleBiometrics = async () => {
    if (biometricBusy) return;
    const nextVal = !biometrics;
    await requireSecurityAuth(async () => {
      if (nextVal) {
        await performEnableBiometrics();
      } else {
        await performDisableBiometrics();
      }
    });
  };

  const handleCheckBiometricAvailability = async () => {
    setCheckingAvailability(true);
    setErrorMsg('');
    const info = await BiometricAuthService.checkAvailability();
    setAvailabilityInfo(info);
    setCheckingAvailability(false);
  };

  const handleBiometricIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    setSuccessMsg('');
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, SVG, or WebP).');
      return;
    }

    try {
      setIsUploadingBiometricIcon(true);
      const optimized = await compressImageFile(file, 320, 0.92);
      const saved = LocalDb.setCustomBiometricIcon(optimized);
      if (!saved) {
        setErrorMsg('Image is too large for browser storage. Please choose a smaller image.');
        return;
      }
      setCustomBiometricIcon(optimized);
      LocalDb.addAuditLog(
        currentUser.id,
        currentUser.email,
        'UPDATE_BIOMETRIC_ICON',
        'User uploaded a custom biometric icon image in Settings.'
      );
      setSuccessMsg('Biometric icon updated! It is now active on the login screen.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Biometric icon upload failed:', err);
      setErrorMsg('Failed to process biometric icon image. Please try another file.');
    } finally {
      setIsUploadingBiometricIcon(false);
    }
  };

  const handleResetBiometricIcon = () => {
    setErrorMsg('');
    setSuccessMsg('');
    LocalDb.setCustomBiometricIcon(null);
    setCustomBiometricIcon(null);
    LocalDb.addAuditLog(
      currentUser.id,
      currentUser.email,
      'RESET_BIOMETRIC_ICON',
      'User reset biometric icon back to the default icon.'
    );
    setSuccessMsg('Biometric icon reset to default.');
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const handleLoadActiveSessions = async () => {
    setLoadingSessions(true);
    setErrorMsg('');
    const res = await AuthSessionService.listActiveSessions();
    setLoadingSessions(false);
    if (!res.ok) {
      setErrorMsg(res.message || 'Please re-authenticate to inspect active device sessions.');
      return;
    }
    setActiveSessions(res.sessions);
    setShowSessionsPanel(true);
  };

  const handleRevokeSession = async (targetSessionId?: string, revokeOthers = false) => {
    await requireSecurityAuth(async () => {
      setLoadingSessions(true);
      const res = await AuthSessionService.revokeSession({
        targetSessionId,
        revokeOthers,
      });
      setLoadingSessions(false);

      if (!res.ok) {
        setErrorMsg('Unable to revoke session. Please verify your session.');
        return;
      }

      if (targetSessionId && targetSessionId === AuthSessionService.getActiveSessionId()) {
        onLogout();
        return;
      }

      setSuccessMsg(
        revokeOthers
          ? `Revoked ${res.revokedCount ?? 0} other active session(s).`
          : 'Device session revoked.'
      );
      setTimeout(() => setSuccessMsg(''), 3500);
      await handleLoadActiveSessions();
    });
  };

  const handlePinChange = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (BiometricAuthService.hasAppPin(currentUser.id)) {
      if (!oldPin) {
        setErrorMsg('Please enter your current in-app PIN.');
        return;
      }
      const oldMatches = await BiometricAuthService.verifyAppPin(currentUser.id, oldPin);
      if (!oldMatches) {
        setErrorMsg('Current PIN does not match our in-app security record.');
        return;
      }
    }

    if (newPin.length < 4 || newPin.length > 6) {
      setErrorMsg('New security PIN must be 4 to 6 digits.');
      return;
    }

    const backendRes = await AuthSessionService.updateSecurityCredentialOnBackend({
      type: 'pin',
      newSecret: newPin,
      currentSecret: oldPin || undefined,
    });
    if (!backendRes.ok) {
      setErrorMsg(backendRes.message || 'Unable to update PIN in device security vault.');
      return;
    }

    await BiometricAuthService.saveAppPin(currentUser.id, newPin);
    LocalDb.addAuditLog(currentUser.id, currentUser.email, 'USER_PIN_CHANGE', 'User updated their in-app device authorization PIN.');
    void PushNotificationService.notifySecurityEvent(currentUser, 'security_update');
    setSuccessMsg('Your security PIN was updated securely!');
    setOldPin('');
    setNewPin('');
    setTimeout(() => {
      setShowPinForm(false);
      setActivePreferenceSheet((prev) => (prev === 'pin' ? null : prev));
    }, 1800);
  };

  const handlePasswordChange = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (BiometricAuthService.hasAppPassword(currentUser.id)) {
      if (!oldPass) {
        setErrorMsg('Please enter your current in-app password.');
        return;
      }
      const oldMatches = await BiometricAuthService.verifyAppPassword(currentUser.id, oldPass);
      if (!oldMatches) {
        setErrorMsg('Current password does not match our in-app security record.');
        return;
      }
    }

    if (newPass.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }

    const backendRes = await AuthSessionService.updateSecurityCredentialOnBackend({
      type: 'password',
      newSecret: newPass,
      currentSecret: oldPass || undefined,
    });
    if (!backendRes.ok) {
      setErrorMsg(backendRes.message || 'Unable to update password in device security vault.');
      return;
    }

    await BiometricAuthService.saveAppPassword(currentUser.id, newPass);
    LocalDb.addAuditLog(currentUser.id, currentUser.email, 'USER_PASS_CHANGE', 'User updated their in-app device access password.');
    void PushNotificationService.notifySecurityEvent(currentUser, 'security_update');
    setSuccessMsg('Security password updated securely!');
    setOldPass('');
    setNewPass('');
    setTimeout(() => {
      setShowPassForm(false);
      setActivePreferenceSheet((prev) => (prev === 'passphrase' ? null : prev));
    }, 1800);
  };

  const handleLangChange = (code: string) => {
    setActiveLang(code);
    let welcome = 'Language preference updated!';
    if (code === 'am') welcome = 'የቋንቋ ምርጫዎ ተስተካክሏል!';
    if (code === 'or') welcome = 'Filannoon afaan keessanii sirreeffameera!';
    if (code === 'ti') welcome = 'ምርጫ ቋንቋኹም ተስተካኪሉ ኣሎ!';
    
    LocalDb.addNotification(currentUser.id, 'Language Altered', welcome, 'info');
    setSuccessMsg(welcome);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const activeLanguageShortLabel = useMemo(() => {
    if (activeLang === 'am') return 'Amharic';
    if (activeLang === 'or') return 'Oromo';
    if (activeLang === 'ti') return 'Tigrinya';
    return 'English';
  }, [activeLang]);

  return (
    <div
      id="profile-screen"
      className={
        showLegacySettings
          ? 'w-full h-full overflow-y-auto overscroll-contain bg-gray-50 pb-36 font-sans select-none'
          : 'w-full h-full flex flex-col overflow-hidden bg-[#70189F] font-sans select-none'
      }
    >
      {!showLegacySettings ? (
        <>
          {/* Authentic CBE Settings Top Header Bar */}
          <div className="shrink-0 bg-[#70189F] text-white px-4 pt-[max(env(safe-area-inset-top,0px),12px)] pb-4 flex items-center gap-4">
            <button
              id="btn-cbe-settings-back"
              type="button"
              aria-label="Back"
              onClick={() => {
                if (onBack) onBack();
                else window.history.back();
              }}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition flex items-center justify-center text-white cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.2] -ml-0.5" />
            </button>
            <button
              id="btn-open-full-settings"
              type="button"
              onClick={() => setShowLegacySettings(true)}
              className="text-[20px] font-bold text-white tracking-[-0.01em] leading-none active:opacity-75 transition cursor-pointer text-left"
            >
              Settings
            </button>
          </div>

          {/* Rounded Light-Gray Sheet Body */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-[#F6F6F8] rounded-t-[26px] px-4 pt-5 pb-32">
            <div className="max-w-md mx-auto">
              {errorMsg && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-800 text-xs py-2.5 px-3.5 rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs py-2.5 px-3.5 rounded-2xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* PREFERENCES */}
              <h2 className="text-[12.5px] font-semibold uppercase tracking-[0.07em] text-[#752599] px-1 mb-2.5">
                PREFERENCES
              </h2>
              <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(16,16,24,0.03)] overflow-hidden divide-y divide-[#F3F3F6]">
                {/* Language */}
                <button
                  id="cbe-setting-language"
                  type="button"
                  onClick={() => setActivePreferenceSheet('language')}
                  className="w-full px-4 py-4 flex items-center gap-4 text-left hover:bg-[#FAFAFC] active:bg-[#F3EEF7] transition-colors cursor-pointer"
                >
                  <div className="w-[42px] h-[42px] rounded-[12px] bg-[#F5F2F8] flex items-center justify-center shrink-0">
                    <svg className="w-[21px] h-[21px] text-[#752599]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9.5" />
                      <path d="M2.8 12h18.4" />
                      <path d="M4.5 7.5h15" />
                      <path d="M4.5 16.5h15" />
                      <ellipse cx="12" cy="12" rx="4.2" ry="9.5" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15.5px] font-medium text-[#222226] leading-snug">Language</p>
                    <p className="text-[13px] font-normal text-[#94949C] mt-0.5 leading-tight">{activeLanguageShortLabel}</p>
                  </div>
                  <ChevronRight className="w-[17px] h-[17px] text-[#C8C8D0] shrink-0 stroke-[1.9]" />
                </button>

                {/* Account Preferences */}
                <button
                  id="cbe-setting-account-preferences"
                  type="button"
                  onClick={() => setActivePreferenceSheet('account')}
                  className="w-full px-4 py-4 flex items-center gap-4 text-left hover:bg-[#FAFAFC] active:bg-[#F3EEF7] transition-colors cursor-pointer"
                >
                  <div className="w-[42px] h-[42px] rounded-[12px] bg-[#F5F2F8] flex items-center justify-center shrink-0">
                    <svg className="w-[21px] h-[21px] text-[#752599]" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9.5" cy="7.5" r="3.6" />
                      <path d="M3 18.8c0-3.2 2.9-5.3 6.5-5.3 1.4 0 2.7.3 3.7.9-.3.7-.5 1.5-.5 2.3 0 .8.2 1.5.5 2.1H3z" />
                      <path d="M18.3 13.8l.4-1.1h1.2l.4 1.1c.3.1.6.2.8.4l1.1-.4.6 1-.8.9c.1.3.1.6 0 .9l.8.9-.6 1-1.1-.4c-.2.2-.5.3-.8.4l-.4 1.1h-1.2l-.4-1.1c-.3-.1-.6-.2-.8-.4l-1.1.4-.6-1 .8-.9c-.1-.3-.1-.6 0-.9l-.8-.9.6-1 1.1.4c.2-.2.5-.3.8-.4zm1 3.7a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15.5px] font-medium text-[#222226] leading-snug">Account Preferences</p>
                  </div>
                  <ChevronRight className="w-[17px] h-[17px] text-[#C8C8D0] shrink-0 stroke-[1.9]" />
                </button>

                {/* Notification Preferences */}
                <button
                  id="cbe-setting-notification-preferences"
                  type="button"
                  onClick={() => setActivePreferenceSheet('notifications')}
                  className="w-full px-4 py-4 flex items-center gap-4 text-left hover:bg-[#FAFAFC] active:bg-[#F3EEF7] transition-colors cursor-pointer"
                >
                  <div className="w-[42px] h-[42px] rounded-[12px] bg-[#F5F2F8] flex items-center justify-center shrink-0">
                    <svg className="w-[21px] h-[21px] text-[#752599]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.2a1.1 1.1 0 0 1 1.1 1.1v.45a5.2 5.2 0 0 1 4.1 5.08v3.97l1.2 1.35a.7.7 0 0 1-.52 1.16H6.12a.7.7 0 0 1-.52-1.16l1.2-1.35v-3.97a5.2 5.2 0 0 1 4.1-5.08V5.3A1.1 1.1 0 0 1 12 4.2z" />
                      <path d="M10.1 18.4a2 2 0 0 0 3.8 0h-3.8z" />
                      <path d="M4.2 8.2a.8.8 0 0 1 1.13.05c-.85 1.15-.85 2.85 0 4a.8.8 0 1 1-1.25 1c-1.33-1.67-1.33-4.33 0-6a.8.8 0 0 1 .12-.05z" opacity="0.85" />
                      <path d="M19.8 8.2a.8.8 0 0 0-1.13.05c.85 1.15.85 2.85 0 4a.8.8 0 1 0 1.25 1c1.33-1.67 1.33-4.33 0-6a.8.8 0 0 0-.12-.05z" opacity="0.85" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15.5px] font-medium text-[#222226] leading-snug">Notification Preferences</p>
                  </div>
                  <ChevronRight className="w-[17px] h-[17px] text-[#C8C8D0] shrink-0 stroke-[1.9]" />
                </button>

                {/* Service Preferences */}
                <button
                  id="cbe-setting-service-preferences"
                  type="button"
                  onClick={() => setActivePreferenceSheet('services')}
                  className="w-full px-4 py-4 flex items-center gap-4 text-left hover:bg-[#FAFAFC] active:bg-[#F3EEF7] transition-colors cursor-pointer"
                >
                  <div className="w-[42px] h-[42px] rounded-[12px] bg-[#F5F2F8] flex items-center justify-center shrink-0">
                    <svg className="w-[20px] h-[20px] text-[#752599]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
                      <line x1="4" y1="6.5" x2="20" y2="6.5" />
                      <line x1="9" y1="4.2" x2="9" y2="8.8" />
                      <line x1="4" y1="12" x2="20" y2="12" />
                      <line x1="15.5" y1="9.7" x2="15.5" y2="14.3" />
                      <line x1="4" y1="17.5" x2="20" y2="17.5" />
                      <line x1="10.5" y1="15.2" x2="10.5" y2="19.8" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15.5px] font-medium text-[#222226] leading-snug">Service Preferences</p>
                  </div>
                  <ChevronRight className="w-[17px] h-[17px] text-[#C8C8D0] shrink-0 stroke-[1.9]" />
                </button>
              </div>

              {/* SECURITY SETTINGS */}
              <h2 className="text-[12.5px] font-semibold uppercase tracking-[0.07em] text-[#752599] px-1 mt-6 mb-2.5">
                SECURITY SETTINGS
              </h2>
              <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(16,16,24,0.03)] overflow-hidden divide-y divide-[#F3F3F6]">
                {/* Biometric Login */}
                <button
                  id="cbe-setting-biometric-login"
                  type="button"
                  onClick={() => setActivePreferenceSheet('biometrics')}
                  className="w-full px-4 py-4 flex items-center gap-4 text-left hover:bg-[#FAFAFC] active:bg-[#F3EEF7] transition-colors cursor-pointer"
                >
                  <div className="w-[42px] h-[42px] rounded-[12px] bg-[#F5F2F8] flex items-center justify-center shrink-0">
                    <Fingerprint className="w-[21px] h-[21px] text-[#752599] stroke-[1.7]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15.5px] font-medium text-[#222226] leading-snug">Biometric Login</p>
                  </div>
                  <ChevronRight className="w-[17px] h-[17px] text-[#C8C8D0] shrink-0 stroke-[1.9]" />
                </button>

                {/* Change PIN */}
                <button
                  id="cbe-setting-change-pin"
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setSuccessMsg('');
                    setOldPin('');
                    setNewPin('');
                    void requireSecurityAuth(() => setActivePreferenceSheet('pin'));
                  }}
                  className="w-full px-4 py-4 flex items-center gap-4 text-left hover:bg-[#FAFAFC] active:bg-[#F3EEF7] transition-colors cursor-pointer"
                >
                  <div className="w-[42px] h-[42px] rounded-[12px] bg-[#F5F2F8] flex items-center justify-center shrink-0">
                    <svg className="w-[21px] h-[21px] text-[#752599]" viewBox="0 0 24 24" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M7.5 8a4 4 0 1 0 3.74 5.4h4.26v2.1a1 1 0 1 0 2 0v-2.1h1v2.6a1 1 0 1 0 2 0v-2.6h.5a1 1 0 1 0 0-2h-9.76A4 4 0 0 0 7.5 8zm0 2.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15.5px] font-medium text-[#222226] leading-snug">Change PIN</p>
                  </div>
                  <ChevronRight className="w-[17px] h-[17px] text-[#C8C8D0] shrink-0 stroke-[1.9]" />
                </button>

                {/* Change Passphrase */}
                <button
                  id="cbe-setting-change-passphrase"
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setSuccessMsg('');
                    setOldPass('');
                    setNewPass('');
                    void requireSecurityAuth(() => setActivePreferenceSheet('passphrase'));
                  }}
                  className="w-full px-4 py-4 flex items-center gap-4 text-left hover:bg-[#FAFAFC] active:bg-[#F3EEF7] transition-colors cursor-pointer"
                >
                  <div className="w-[42px] h-[42px] rounded-[12px] bg-[#F5F2F8] flex items-center justify-center shrink-0">
                    <svg className="w-[20px] h-[20px] text-[#752599]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
                      <path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" />
                      <circle cx="12" cy="15.2" r="1.2" fill="currentColor" stroke="none" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15.5px] font-medium text-[#222226] leading-snug">Change Passphrase</p>
                  </div>
                  <ChevronRight className="w-[17px] h-[17px] text-[#C8C8D0] shrink-0 stroke-[1.9]" />
                </button>
              </div>

              {/* ACCOUNT ACTIONS */}
              <h2 className="text-[12.5px] font-semibold uppercase tracking-[0.07em] text-[#752599] px-1 mt-6 mb-2.5">
                ACCOUNT ACTIONS
              </h2>
              <div className="bg-white rounded-[20px] shadow-[0_1px_3px_rgba(16,16,24,0.03)] overflow-hidden">
                <button
                  id="cbe-setting-logout"
                  type="button"
                  onClick={() => setActivePreferenceSheet('logout')}
                  className="w-full px-4 py-4 flex items-center gap-4 text-left hover:bg-[#FFF8F8] active:bg-[#FDF0F0] transition-colors cursor-pointer"
                >
                  <div className="w-[42px] h-[42px] rounded-[12px] bg-[#FDF1F1] flex items-center justify-center shrink-0">
                    <svg className="w-[20px] h-[20px] text-[#D84035]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.5 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h4" />
                      <path d="M15 8.5L19 12l-4 3.5" />
                      <line x1="9.5" y1="12" x2="18.5" y2="12" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15.5px] font-medium text-[#D84035] leading-snug">Log out</p>
                  </div>
                  <ChevronRight className="w-[17px] h-[17px] text-[#C8C8D0] shrink-0 stroke-[1.9]" />
                </button>
              </div>

              {/* Footer Version & Legal Links */}
              <div className="mt-9 pb-4 text-center">
                <p className="text-[13.5px] text-[#9898A0] font-normal">Version: 6.1.0</p>
                <div className="mt-3 flex items-center justify-center gap-3 text-[13.5px] font-semibold text-[#752599]">
                  <button
                    type="button"
                    onClick={() => {
                      setLegalModalMode('privacy');
                      setShowTerms(true);
                    }}
                    className="hover:opacity-75 active:opacity-60 transition cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                  <span aria-hidden="true" className="text-[#C7B4D4] text-[10px]">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setLegalModalMode('terms');
                      setShowTerms(true);
                    }}
                    className="hover:opacity-75 active:opacity-60 transition cursor-pointer"
                  >
                    Terms and Tarrifs
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Existing Full Settings Top Header Bar (accessed by clicking "Settings" text at top) */}
          <div className="sticky top-0 z-30 bg-[#70189F] text-white px-4 pt-[max(env(safe-area-inset-top,0px),10px)] pb-3 flex items-center justify-between shadow-xs">
            <button
              type="button"
              onClick={() => {
                if (onBack) onBack();
                else window.history.back();
              }}
              className="flex items-center gap-0.5 text-white hover:text-purple-200 active:opacity-70 transition text-[15px] font-normal cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 -ml-1.5 stroke-[2.5]" />
              <span>Home</span>
            </button>
            <button
              id="btn-back-to-cbe-settings"
              type="button"
              onClick={() => setShowLegacySettings(false)}
              className="font-bold text-base text-white active:opacity-75 transition cursor-pointer"
              title="Back to CBE Settings"
            >
              Settings
            </button>
            <div className="w-12 flex justify-end">
              {isAdmin && (
                <button
                  onClick={onOpenAdmin}
                  className="text-xs bg-amber-400 text-purple-950 px-2 py-0.5 rounded-full font-bold hover:bg-amber-300 transition cursor-pointer"
                  title="Admin Panel"
                >
                  Admin
                </button>
              )}
            </div>
          </div>

          <div className="max-w-md mx-auto min-h-full">
        {/* Profile Header */}
        <div className="bg-[#70189F] text-white px-5 pt-5 pb-8 rounded-b-[2rem] shadow-md text-center space-y-3 relative">
        <div className="w-20 h-20 rounded-full bg-white/15 border-2 border-[#deb356] mx-auto flex items-center justify-center font-black text-[#deb356] text-3xl shadow-lg relative">
          {currentUser.name.split(' ').map(n => n[0]).join('')}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#70189F] border border-white/20 rounded-full flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-purple-200" />
          </div>
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-white">{currentUser.name}</h2>
          <p className="text-xs text-purple-200 font-mono mt-0.5">A/C: {currentUser.accountNumber}</p>
          <p className="text-[10px] text-purple-300/80 font-mono">{currentUser.email}</p>
        </div>

        {/* Header Action Badges */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            id="btn-open-edit-profile-header"
            onClick={handleOpenEditProfile}
            className="bg-white/15 hover:bg-white/25 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 border border-amber-400/30 cursor-pointer shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-300" />
            <span>Edit Name &amp; A/C</span>
          </button>
          <button
            id="btn-open-accounts-modal"
            onClick={() => setShowAccountsModal(true)}
            className="bg-amber-400 hover:bg-amber-300 text-purple-950 text-xs font-extrabold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Accounts</span>
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6">

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-800 text-xs py-2.5 px-3.5 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs py-2.5 px-3.5 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. Account Details & Edit Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-50 text-[#70189F] rounded-xl">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">Account &amp; Personal Info</h3>
                <p className="text-[11px] text-gray-500">Edit your name or banking account number</p>
              </div>
            </div>
            <button
              id="btn-edit-profile-action"
              onClick={handleOpenEditProfile}
              className="bg-[#70189F] hover:bg-[#7e1c97] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          <div className="bg-gray-50/80 rounded-2xl p-3.5 border border-gray-100 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">Account Name</span>
              <span className="font-bold text-gray-800">{currentUser.name}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">CBE Account No.</span>
              <span className="font-mono font-bold text-purple-900 bg-purple-100/60 px-2 py-0.5 rounded-md">{currentUser.accountNumber}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">Account Type</span>
              <span className="capitalize font-semibold text-gray-700">{currentUser.accountType || 'CBE Savings'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">Registered Phone</span>
              <span className="font-mono text-gray-700">{currentUser.phone}</span>
            </div>
          </div>
        </div>

        {/* 2. Multi-Account Management & Switcher Card */}
        <div className="bg-gradient-to-r from-amber-50 to-purple-50 rounded-3xl p-5 shadow-sm border border-amber-200/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-400/20 text-purple-950 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-purple-950 uppercase tracking-wider">Multi-Account Hub</h4>
                <p className="text-[11px] text-purple-900/70">Register or switch to another CBE account</p>
              </div>
            </div>
            <button
              id="btn-register-another-account"
              onClick={() => {
                setShowNewAccountForm(true);
                setShowAccountsModal(true);
              }}
              className="bg-amber-400 hover:bg-amber-300 text-purple-950 text-xs font-extrabold px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ New Account</span>
            </button>
          </div>
          
          <button
            id="btn-view-all-accounts"
            onClick={() => {
              setShowNewAccountForm(false);
              setShowAccountsModal(true);
            }}
            className="w-full bg-white hover:bg-gray-50 text-[#70189F] text-xs font-bold py-2.5 px-3 rounded-2xl border border-purple-150 transition flex items-center justify-between cursor-pointer"
          >
            <span>View All Registered Accounts ({allRegisteredUsers.length})</span>
            <ChevronRight className="w-4 h-4 text-purple-400" />
          </button>
        </div>

        {/* Admin Quick Jump & Bank Logo Settings */}
        {isAdmin && (
          <div className="bg-slate-900 text-amber-300 p-5 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Admin Settings</span>
                </p>
                <h4 className="text-base font-extrabold text-white mt-1">CBE Brand &amp; Logo Settings</h4>
                <p className="text-xs text-slate-400 mt-0.5">Admin access verified for <span className="text-amber-300 font-mono">{currentUser.email}</span></p>
              </div>
              <button
                onClick={onOpenAdmin}
                className="bg-amber-400 hover:bg-amber-300 text-purple-950 text-xs font-extrabold px-3.5 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer shadow-md"
              >
                <span>Full Admin Panel</span>
              </button>
            </div>

            {/* Bank Logo Setting */}
            <div className="bg-slate-800/90 rounded-2xl p-4 border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-white/10 p-1 border border-white/10 flex-shrink-0 flex items-center justify-center">
                    <CbeLogo 
                      src={customBankLogo} 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white whitespace-nowrap">Bank Logo &amp; Emblem</p>
                    <p className="text-[10px] text-slate-400">Change Commercial Bank of Ethiopia logo</p>
                  </div>
                </div>
                <button
                  id="btn-profile-change-logo"
                  onClick={() => setShowLogoModal(true)}
                  className="bg-[#70189F] hover:bg-[#7e1c97] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-purple-400/30 shadow-md flex-shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Change Logo</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Android PWA Installation & App Details */}
        <AppInstallPrompt mode="settings" currentUser={currentUser} />

        {/* Web Push Notifications & Lock Screen Privacy Settings */}
        <NotificationSettingsCard
          currentUser={currentUser}
          onSuccess={(msg) => {
            setErrorMsg('');
            setSuccessMsg(msg);
          }}
          onError={(msg) => {
            setSuccessMsg('');
            setErrorMsg(msg);
          }}
        />

        {/* Security & Access Section */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">Security &amp; Device Access</h3>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
              {biometrics ? 'Biometrics Active' : 'PIN / Password'}
            </span>
          </div>
          
          {/* Device Biometrics Toggle */}
          <div className="flex justify-between items-center py-1 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl shrink-0">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800">
                  {BiometricAuthService.getDeviceBiometricName()} Login
                </p>
                <p className="text-[10px] text-gray-400">
                  Hardware-backed unlock (no browser password manager)
                </p>
              </div>
            </div>
            <button
              id="btn-toggle-biometrics"
              type="button"
              disabled={biometricBusy}
              onClick={handleToggleBiometrics}
              className={`w-12 h-6.5 rounded-full p-1 transition duration-300 cursor-pointer shrink-0 disabled:opacity-60 ${
                biometrics ? 'bg-emerald-800' : 'bg-gray-200'
              }`}
            >
              <div className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transition-transform duration-300 transform ${
                biometrics ? 'translate-x-5.5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Availability Check & Re-enable Device Controls */}
          <div className="flex flex-wrap gap-2">
            <button
              id="btn-check-biometric-availability"
              type="button"
              disabled={checkingAvailability}
              onClick={handleCheckBiometricAvailability}
              className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              {checkingAvailability ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              )}
              <span>Check Availability</span>
            </button>

            <button
              id="btn-reenable-biometrics"
              type="button"
              disabled={biometricBusy}
              onClick={() => requireSecurityAuth(performEnableBiometrics)}
              className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[#70189F] text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              {biometricBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Re-enable on Device</span>
            </button>
          </div>

          {availabilityInfo && (
            <div className={`rounded-2xl p-3 border text-[11px] space-y-1 ${
              availabilityInfo.available && availabilityInfo.enrolled
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex justify-between">
                <span className="font-semibold">Device Method:</span>
                <span className="font-bold">{BiometricAuthService.getDeviceBiometricName(availabilityInfo.method)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Hardware Status:</span>
                <span className="font-mono font-bold uppercase">{availabilityInfo.hardwareStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Biometric Enrolled:</span>
                <span className="font-bold">{availabilityInfo.enrolled ? 'Yes' : 'No'}</span>
              </div>
              {availabilityInfo.reason && (
                <p className="text-[10.5px] opacity-90 pt-1 border-t border-current/10">
                  {availabilityInfo.reason}
                </p>
              )}
            </div>
          )}

          {/* Custom Biometric Icon Upload */}
          <div className="border-t border-gray-100 pt-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-800">Biometric Icon Image</p>
                <p className="text-[10px] text-gray-400">
                  Customize the icon on &quot;USE BIOMETRICS&quot; &amp; &quot;Authenticating...&quot;
                </p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                customBiometricIcon ? 'bg-purple-100 text-[#70189F]' : 'bg-gray-100 text-gray-500'
              }`}>
                {customBiometricIcon ? 'Custom Image' : 'Default'}
              </span>
            </div>

            {/* Dual Live Preview + Upload/Reset Controls */}
            <div className="bg-gray-50/90 border border-gray-100 rounded-2xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 shrink-0">
                {/* Preview 1: Purple USE BIOMETRICS button */}
                <div
                  className="w-12 h-12 rounded-full bg-[#841ca6]/18 p-[3px] flex items-center justify-center"
                  title="Login Button Preview"
                >
                  <span className="w-full h-full rounded-full bg-[#841ca6] border border-white flex items-center justify-center overflow-hidden shadow-xs">
                    {customBiometricIcon ? (
                      <img
                        src={customBiometricIcon}
                        alt="Custom biometric button preview"
                        className="w-6 h-6 object-contain pointer-events-none select-none"
                      />
                    ) : BiometricAuthService.getBiometricMethod() === 'faceid' ? (
                      <CbeFaceIdIcon size={21} strokeColor="#ffffff" strokeWidth={1.9} />
                    ) : (
                      <CbeFingerprintIcon size={22} strokeColor="#ffffff" strokeWidth={1.9} />
                    )}
                  </span>
                </div>

                {/* Preview 2: Authenticating... popup ring */}
                <div
                  className="relative w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-2xs"
                  title="Authenticating Dialog Preview"
                >
                  <svg className="absolute inset-1 w-10 h-10" viewBox="0 0 84 84" fill="none">
                    <circle
                      cx="42"
                      cy="42"
                      r="36"
                      stroke="#dc2626"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray="155 240"
                    />
                  </svg>
                  {customBiometricIcon ? (
                    <img
                      src={customBiometricIcon}
                      alt="Custom biometric dialog preview"
                      className="w-5.5 h-5.5 object-contain pointer-events-none select-none"
                    />
                  ) : BiometricAuthService.getBiometricMethod() === 'faceid' ? (
                    <CbeFaceIdIcon size={20} strokeColor="#70189F" strokeWidth={2.0} />
                  ) : (
                    <CbeFingerprintIcon size={21} strokeColor="#70189F" strokeWidth={2.0} />
                  )}
                </div>
              </div>

              <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                <label
                  htmlFor="input-biometric-icon-upload"
                  className={`px-3 py-2 rounded-xl bg-[#70189F] hover:bg-[#5e1385] text-white text-[11px] font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer ${
                    isUploadingBiometricIcon ? 'opacity-60 pointer-events-none' : ''
                  }`}
                >
                  {isUploadingBiometricIcon ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>{customBiometricIcon ? 'Change Image' : 'Upload Image'}</span>
                  <input
                    id="input-biometric-icon-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleBiometricIconUpload}
                    disabled={isUploadingBiometricIcon}
                    className="hidden"
                  />
                </label>

                {customBiometricIcon && (
                  <button
                    id="btn-reset-biometric-icon"
                    type="button"
                    onClick={handleResetBiometricIcon}
                    className="px-2.5 py-2 rounded-xl bg-white hover:bg-rose-50 border border-gray-200 hover:border-rose-200 text-rose-600 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Change PIN Accordion */}
          <div className="border-t border-gray-50 pt-3">
            <button
              id="btn-toggle-pin-form"
              type="button"
              onClick={() => {
                if (showPinForm) {
                  setShowPinForm(false);
                } else {
                  requireSecurityAuth(() => {
                    setShowPinForm(true);
                  });
                }
              }}
              className="w-full flex justify-between items-center text-sm font-semibold text-gray-700 hover:text-emerald-800 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
                  <KeyRound className="w-5 h-5" />
                </div>
                <span>Update Authorization PIN</span>
              </div>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showPinForm ? 'rotate-90' : ''}`} />
            </button>

            {showPinForm && (
              <div className="mt-3.5 space-y-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-top-2 duration-150">
                {BiometricAuthService.hasAppPin(currentUser.id) && (
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-form-type="other"
                    maxLength={6}
                    placeholder="Current In-App PIN"
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-mono [-webkit-text-security:disc]"
                  />
                )}
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-form-type="other"
                  maxLength={6}
                  placeholder="New 4–6 Digit PIN (saved in app)"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-mono [-webkit-text-security:disc]"
                />
                <button
                  type="button"
                  onClick={handlePinChange}
                  className="w-full bg-emerald-800 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  Save PIN in App
                </button>
              </div>
            )}
          </div>

          {/* Change Password Accordion */}
          <div className="border-t border-gray-50 pt-3">
            <button
              type="button"
              onClick={() => {
                if (showPassForm) {
                  setShowPassForm(false);
                } else {
                  requireSecurityAuth(() => {
                    setShowPassForm(true);
                  });
                }
              }}
              className="w-full flex justify-between items-center text-sm font-semibold text-gray-700 hover:text-emerald-800 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
                  <Lock className="w-5 h-5" />
                </div>
                <span>Change Access Password</span>
              </div>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showPassForm ? 'rotate-90' : ''}`} />
            </button>

            {showPassForm && (
              <div className="mt-3.5 space-y-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-top-2 duration-150">
                {BiometricAuthService.hasAppPassword(currentUser.id) && (
                  <input
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-form-type="other"
                    placeholder="Current In-App Password"
                    value={oldPass}
                    onChange={(e) => setOldPass(e.target.value)}
                    className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs [-webkit-text-security:disc]"
                  />
                )}
                <input
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-form-type="other"
                  placeholder="New Password (min 6 chars, saved in app)"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs [-webkit-text-security:disc]"
                />
                <button
                  type="button"
                  onClick={handlePasswordChange}
                  className="w-full bg-emerald-800 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  Save Password in App
                </button>
              </div>
            )}
          </div>

          {/* Active Sessions & Device Management */}
          <div className="border-t border-gray-50 pt-3">
            <button
              id="btn-manage-active-sessions"
              type="button"
              onClick={() => {
                if (showSessionsPanel) {
                  setShowSessionsPanel(false);
                } else {
                  void handleLoadActiveSessions();
                }
              }}
              className="w-full flex justify-between items-center text-sm font-semibold text-gray-700 hover:text-emerald-800 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 text-[#70189F] rounded-xl">
                  <MonitorSmartphone className="w-5 h-5" />
                </div>
                <span>Active Devices &amp; Sessions</span>
              </div>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showSessionsPanel ? 'rotate-90' : ''}`} />
            </button>

            {showSessionsPanel && (
              <div className="mt-3 space-y-2.5 p-3 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-top-2 duration-150">
                {loadingSessions ? (
                  <div className="py-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading device sessions...</span>
                  </div>
                ) : activeSessions.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-2">No active device sessions found.</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {activeSessions.map((sess) => (
                        <div
                          key={sess.sessionId}
                          className="bg-white rounded-xl p-2.5 border border-gray-200 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-gray-800 truncate">{sess.deviceLabel}</p>
                              {sess.isCurrent && (
                                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                  This Device
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {sess.biometricEnabled ? `Biometric (${sess.biometricMethod})` : 'PIN / Password'} • Last active{' '}
                              {new Date(sess.lastUsedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleRevokeSession(sess.sessionId, false)}
                            className="text-[11px] font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 cursor-pointer shrink-0"
                          >
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>

                    {activeSessions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => void handleRevokeSession(undefined, true)}
                        className="w-full py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 transition cursor-pointer"
                      >
                        Log Out All Other Devices
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Starting Transaction ID Code Settings */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
                <Hash className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">Starting Transaction ID Code</h3>
                <p className="text-[10px] text-gray-400">System fills remaining chars cleanly & uniquely</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
              {savedTxPrefix ? `Active: ${savedTxPrefix}` : `Auto: ${getDefaultStartingTxPrefix()}`}
            </span>
          </div>

          <div className="space-y-2.5">
            <label htmlFor="input-tx-prefix" className="block text-[11px] font-bold text-gray-600">
              Custom Starting Code (2–10 letters/numbers)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="input-tx-prefix"
                type="text"
                maxLength={10}
                value={txPrefixInput}
                onChange={(e) => {
                  const cleaned = sanitizeStartingTxPrefix(e.target.value);
                  setTxPrefixInput(cleaned);
                  setTxPreviewSamples(buildDistinctTxSamples(cleaned));
                  setErrorMsg('');
                }}
                placeholder={`e.g. FT2631 or FT2345 (Auto: ${getDefaultStartingTxPrefix()})`}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-mono font-extrabold tracking-wider text-gray-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 focus:bg-white transition"
              />
              <button
                id="btn-refresh-tx-preview"
                type="button"
                onClick={() => setTxPreviewSamples(buildDistinctTxSamples(txPrefixInput))}
                title="Generate new unique preview codes"
                className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-800 transition cursor-pointer"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 mr-1">Presets:</span>
              {['FT2631', 'FT2345', 'FT26'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setTxPrefixInput(preset);
                    setTxPreviewSamples(buildDistinctTxSamples(preset));
                    setErrorMsg('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                    txPrefixInput === preset
                      ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-emerald-50 hover:text-emerald-800'
                  }`}
                >
                  {preset}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setTxPrefixInput('');
                  setTxPreviewSamples(buildDistinctTxSamples(''));
                  setErrorMsg('');
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                  txPrefixInput === ''
                    ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-emerald-50 hover:text-emerald-800'
                }`}
              >
                Auto ({getDefaultStartingTxPrefix()})
              </button>
            </div>

            {/* Live Unique Code Preview */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Live 12-Char Unique ID Preview
                </span>
                <span className="text-[10px] font-semibold text-emerald-700">
                  {(sanitizeStartingTxPrefix(txPrefixInput) || getDefaultStartingTxPrefix()).length} prefix + {12 - (sanitizeStartingTxPrefix(txPrefixInput) || getDefaultStartingTxPrefix()).length} unique
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {txPreviewSamples.map((sample, idx) => {
                  const activeLen = (sanitizeStartingTxPrefix(txPrefixInput) || getDefaultStartingTxPrefix()).length;
                  const head = sample.slice(0, activeLen);
                  const tail = sample.slice(activeLen);
                  return (
                    <div
                      key={`${sample}-${idx}`}
                      className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs tracking-wider"
                    >
                      <span>
                        <span className="font-black text-emerald-800">{head}</span>
                        <span className="font-bold text-slate-500">{tail}</span>
                      </span>
                      <span className="text-[9px] font-sans font-bold text-slate-400">#{idx + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                id="btn-save-tx-prefix"
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setSuccessMsg('');
                  const cleaned = sanitizeStartingTxPrefix(txPrefixInput);
                  if (cleaned.length > 0 && cleaned.length < 2) {
                    setErrorMsg('Starting transaction ID code must be at least 2 characters (e.g. FT2631), or use Reset to Auto.');
                    return;
                  }
                  const saved = LocalDb.setStartingTxPrefix(cleaned || null);
                  setSavedTxPrefix(saved);
                  setTxPrefixInput(saved);
                  setTxPreviewSamples(buildDistinctTxSamples(saved));
                  LocalDb.addAuditLog(
                    currentUser.id,
                    currentUser.email,
                    'TX_PREFIX_UPDATE',
                    saved
                      ? `Updated starting transaction ID code to "${saved}".`
                      : `Reset starting transaction ID code to Auto (${getDefaultStartingTxPrefix()}).`
                  );
                  setSuccessMsg(
                    saved
                      ? `Starting transaction ID code saved as "${saved}". Every new transaction will get a unique 12-char ID starting with ${saved}.`
                      : `Transaction ID prefix reset to Auto (${getDefaultStartingTxPrefix()}).`
                  );
                  setTimeout(() => setSuccessMsg(''), 4000);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Save Starting Code
              </button>
              <button
                id="btn-reset-tx-prefix"
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setSuccessMsg('');
                  LocalDb.setStartingTxPrefix(null);
                  setSavedTxPrefix('');
                  setTxPrefixInput('');
                  setTxPreviewSamples(buildDistinctTxSamples(''));
                  LocalDb.addAuditLog(
                    currentUser.id,
                    currentUser.email,
                    'TX_PREFIX_RESET',
                    `Reset starting transaction ID code to Auto (${getDefaultStartingTxPrefix()}).`
                  );
                  setSuccessMsg(`Starting transaction ID code reset to Auto (${getDefaultStartingTxPrefix()}).`);
                  setTimeout(() => setSuccessMsg(''), 4000);
                }}
                className="py-2.5 px-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* General Preferences */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">General Preferences</h3>

          {/* Language selection list */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm font-bold text-gray-700 mb-2">
              <Languages className="w-4.5 h-4.5 text-emerald-800" />
              <span>System Language Preference</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLangChange(lang.code)}
                  className={`py-2 px-3 rounded-xl border text-[11px] font-bold transition flex items-center justify-between cursor-pointer ${
                    activeLang === lang.code
                      ? 'bg-emerald-50 border-emerald-800 text-emerald-850 shadow-sm font-extrabold'
                      : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <span>{lang.label}</span>
                  {activeLang === lang.code && <Check className="w-3.5 h-3.5 text-emerald-800" />}
                </button>
              ))}
            </div>
          </div>

          {/* SMS Alerts toggle */}
          <div className="flex justify-between items-center border-t border-gray-50 pt-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">SMS Transaction Alerts</p>
                <p className="text-[10px] text-gray-400">Receive instant debits/credits SMS</p>
              </div>
            </div>
            <button
              onClick={() => setSmsAlerts(!smsAlerts)}
              className={`w-12 h-6.5 rounded-full p-1 transition duration-300 cursor-pointer ${
                smsAlerts ? 'bg-emerald-800' : 'bg-gray-200'
              }`}
            >
              <div className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transition-transform duration-300 transform ${
                smsAlerts ? 'translate-x-5.5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* SMS Simulator Settings Item */}
          <div className="flex justify-between items-center border-t border-gray-50 pt-3">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="p-2 bg-purple-50 text-purple-900 rounded-xl flex-shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-800">SMS Simulator</p>
                  {unreadSmsCount > 0 && (
                    <span className="text-[10px] font-extrabold bg-amber-400 text-purple-950 px-2 py-0.2 rounded-full shadow-2xs">
                      {unreadSmsCount > 99 ? '99+' : unreadSmsCount}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 truncate max-w-[200px] sm:max-w-xs">
                  View simulated bank messages
                </p>
              </div>
            </div>
            <button
              type="button"
              id="settings-sms-simulator-btn"
              onClick={() => {
                if (onOpenSmsSimulator) {
                  onOpenSmsSimulator();
                } else {
                  try {
                    window.history.pushState({ view: 'sms' }, '', '/sms');
                    window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'sms' } }));
                  } catch {}
                }
              }}
              className="px-3 py-1.5 bg-purple-900 hover:bg-purple-850 active:scale-95 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs flex-shrink-0"
            >
              <span>Open</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Truecaller SMS Simulator Settings Item (Requested Below SMS Simulator) */}
          <div className="flex justify-between items-center border-t border-gray-50 pt-3">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="p-2 bg-blue-50 text-[#0066FF] rounded-xl flex-shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-800">Truecaller SMS Simulator</p>
                  <span className="text-[9px] font-extrabold bg-[#0066FF] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                    New
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 truncate max-w-[200px] sm:max-w-xs">
                  Screen takeover alerts • Bank sender/receiver
                </p>
              </div>
            </div>
            <button
              type="button"
              id="settings-truecaller-simulator-btn"
              onClick={() => {
                if (onOpenTruecallerSimulator) {
                  onOpenTruecallerSimulator();
                } else {
                  try {
                    window.history.pushState({ view: 'truecaller' }, '', '/truecaller');
                    window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'truecaller' } }));
                  } catch {}
                }
              }}
              className="px-3 py-1.5 bg-[#0066FF] hover:bg-blue-600 active:scale-95 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs flex-shrink-0"
            >
              <span>Open</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Phone Call & USSD App (Requested Below Truecaller) */}
          <div className="flex justify-between items-center border-t border-gray-50 pt-3">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="p-2 bg-emerald-50 text-[#26d367] rounded-xl flex-shrink-0">
                <PhoneCall className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-800">Phone Call &amp; USSD App</p>
                  <span className="text-[9px] font-extrabold bg-[#26d367] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                    New
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 truncate max-w-[200px] sm:max-w-xs">
                  Recents dialer, contacts &amp; CBE *889# Mobile Banking
                </p>
              </div>
            </div>
            <button
              type="button"
              id="settings-phone-call-app-btn"
              onClick={() => {
                if (onOpenPhoneApp) {
                  onOpenPhoneApp();
                } else {
                  try {
                    window.history.pushState({ view: 'phone' }, '', '/phone');
                    window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'phone' } }));
                  } catch {}
                }
              }}
              className="px-3 py-1.5 bg-[#26d367] hover:bg-[#20ba59] active:scale-95 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs flex-shrink-0"
            >
              <span>Open</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Help & Terms Section */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">Resources &amp; Support</h3>

          {/* Help Line */}
          <div className="flex items-start gap-3 text-sm py-1">
            <HelpCircle className="w-5 h-5 text-emerald-800 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gray-800">Tana Bank Customer Support</p>
              <p className="text-xs text-gray-500 leading-normal mt-0.5">
                Helpline: <span className="font-bold font-mono text-emerald-850">9588</span> (Toll-Free in Ethiopia)<br />
                International: <span className="font-bold font-mono text-emerald-850">+251 11 555 1212</span><br />
                Support Email: <span className="font-bold font-mono text-emerald-850">support@tanabank.demo</span>
              </p>
            </div>
          </div>

          {/* App Software Updates Check */}
          <div className="border-t border-gray-50 pt-3 space-y-2">
            <button
              id="btn-check-app-updates"
              type="button"
              disabled={checkingUpdate}
              onClick={handleManualUpdateCheck}
              className="w-full flex justify-between items-center text-sm font-semibold text-gray-700 hover:text-[#70189F] transition cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center gap-3 text-left min-w-0">
                <div className="p-2 bg-purple-50 text-[#70189F] rounded-xl shrink-0">
                  {checkingUpdate ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-800">App Updates</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {installedAppInfo
                      ? `Version v${installedAppInfo.versionName} (Build ${installedAppInfo.versionCode})`
                      : 'Check for available app updates'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#70189F] bg-purple-50 px-2.5 py-1 rounded-xl shrink-0">
                {checkingUpdate ? 'Checking...' : 'Check'}
              </span>
            </button>
            {updateStatusNote && (
              <p className="text-[11px] text-gray-500 pl-12 leading-snug">
                {updateStatusNote}
              </p>
            )}
          </div>

          {/* Terms & Privacy Popup trigger */}
          <div className="border-t border-gray-50 pt-3">
            <button
              onClick={() => setShowTerms(true)}
              className="w-full flex justify-between items-center text-sm font-semibold text-gray-700 hover:text-emerald-800 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <span>Terms of Service &amp; Privacy</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Big logout button */}
        <button
          id="btn-profile-logout"
          onClick={onLogout}
          className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-150 text-rose-800 font-extrabold py-3.5 rounded-3xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <LogOut className="w-5 h-5" />
          <span>Securely Log Out</span>
        </button>

      </div>
    </div>
        </>
      )}

      {/* ================= CBE SETTINGS INTERACTIVE PREFERENCE SHEETS ================= */}
      {activePreferenceSheet && (
        <div
          className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-150"
          onClick={() => setActivePreferenceSheet(null)}
        >
          <div
            className="bg-white rounded-t-[26px] sm:rounded-3xl p-5 pb-8 sm:pb-6 max-w-md w-full shadow-2xl border border-gray-100 max-h-[85vh] overflow-y-auto relative animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />

            {/* Language Sheet */}
            {activePreferenceSheet === 'language' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#222226]">Language</h3>
                  <button
                    type="button"
                    onClick={() => setActivePreferenceSheet(null)}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 overflow-hidden">
                  {LANGUAGES.map((lang) => {
                    const selected = activeLang === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          handleLangChange(lang.code);
                          setActivePreferenceSheet(null);
                        }}
                        className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#FAF8FC] active:bg-[#F3EEF7] transition cursor-pointer"
                      >
                        <span className={`text-sm ${selected ? 'font-bold text-[#70189F]' : 'font-medium text-gray-800'}`}>
                          {lang.label}
                        </span>
                        {selected && <Check className="w-4 h-4 text-[#70189F] stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Account Preferences Sheet */}
            {activePreferenceSheet === 'account' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#222226]">Account Preferences</h3>
                  <button
                    type="button"
                    onClick={() => setActivePreferenceSheet(null)}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="bg-[#F6F6F8] rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account Holder</span>
                    <span className="font-bold text-gray-900">{currentUser.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account Number</span>
                    <span className="font-mono font-bold text-[#70189F]">{currentUser.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Account Type</span>
                    <span className="capitalize font-semibold text-gray-800">{currentUser.accountType || 'Savings'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePreferenceSheet(null);
                      handleOpenEditProfile();
                    }}
                    className="py-3 px-3 rounded-2xl bg-[#70189F] hover:bg-[#5e1385] text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Account</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePreferenceSheet(null);
                      setShowNewAccountForm(false);
                      setShowAccountsModal(true);
                    }}
                    className="py-3 px-3 rounded-2xl bg-[#F5F2F8] hover:bg-[#ECE5F4] text-[#70189F] text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Switch Account</span>
                  </button>
                </div>
              </div>
            )}

            {/* Notification Preferences Sheet */}
            {activePreferenceSheet === 'notifications' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#222226]">Notification Preferences</h3>
                  <button
                    type="button"
                    onClick={() => setActivePreferenceSheet(null)}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F6F6F8]">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">SMS Transaction Alerts</p>
                      <p className="text-xs text-gray-500">Instant SMS on credit and debit activity</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSmsAlerts(!smsAlerts)}
                      className={`w-11 h-6 rounded-full p-0.5 transition cursor-pointer ${smsAlerts ? 'bg-[#70189F]' : 'bg-gray-300'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${smsAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F6F6F8]">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Email Statements</p>
                      <p className="text-xs text-gray-500">Monthly account statement summary</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmailStatements(!emailStatements)}
                      className={`w-11 h-6 rounded-full p-0.5 transition cursor-pointer ${emailStatements ? 'bg-[#70189F]' : 'bg-gray-300'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${emailStatements ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <NotificationSettingsCard
                    currentUser={currentUser}
                    onSuccess={(msg) => {
                      setErrorMsg('');
                      setSuccessMsg(msg);
                    }}
                    onError={(msg) => {
                      setSuccessMsg('');
                      setErrorMsg(msg);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Service Preferences Sheet */}
            {activePreferenceSheet === 'services' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#222226]">Service Preferences</h3>
                  <button
                    type="button"
                    onClick={() => setActivePreferenceSheet(null)}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F6F6F8]">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Fast Transfer Confirmation</p>
                      <p className="text-xs text-gray-500">Streamlined summary before finalizing transfers</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFastTransferConfirm(!fastTransferConfirm)}
                      className={`w-11 h-6 rounded-full p-0.5 transition cursor-pointer ${fastTransferConfirm ? 'bg-[#70189F]' : 'bg-gray-300'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${fastTransferConfirm ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F6F6F8]">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Quick Balance Display</p>
                      <p className="text-xs text-gray-500">Allow quick balance toggle on dashboard</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQuickBalanceOnHome(!showQuickBalanceOnHome)}
                      className={`w-11 h-6 rounded-full p-0.5 transition cursor-pointer ${showQuickBalanceOnHome ? 'bg-[#70189F]' : 'bg-gray-300'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${showQuickBalanceOnHome ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={checkingUpdate}
                    onClick={handleManualUpdateCheck}
                    className="w-full p-3.5 rounded-2xl bg-[#F5F2F8] hover:bg-[#ECE5F4] flex items-center justify-between transition cursor-pointer disabled:opacity-60"
                  >
                    <div className="text-left">
                      <p className="text-sm font-semibold text-[#70189F]">Check for App Updates</p>
                      <p className="text-xs text-gray-500">{updateStatusNote || 'Verify latest installed version'}</p>
                    </div>
                    {checkingUpdate ? (
                      <Loader2 className="w-4 h-4 text-[#70189F] animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 text-[#70189F]" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Biometric Login Sheet */}
            {activePreferenceSheet === 'biometrics' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#222226]">Biometric Login</h3>
                  <button
                    type="button"
                    onClick={() => setActivePreferenceSheet(null)}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F6F6F8]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F5F2F8] text-[#70189F] flex items-center justify-center">
                      <Fingerprint className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {BiometricAuthService.getDeviceBiometricName()} Login
                      </p>
                      <p className="text-xs text-gray-500">
                        {biometrics ? 'Enabled on this device' : 'Use fingerprint or Face ID to sign in'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={biometricBusy}
                    onClick={handleToggleBiometrics}
                    className={`w-12 h-6.5 rounded-full p-1 transition cursor-pointer disabled:opacity-60 ${
                      biometrics ? 'bg-[#70189F]' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
                      biometrics ? 'translate-x-5.5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={checkingAvailability}
                    onClick={handleCheckBiometricAvailability}
                    className="py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition cursor-pointer"
                  >
                    {checkingAvailability ? 'Checking...' : 'Check Device'}
                  </button>
                  <button
                    type="button"
                    disabled={biometricBusy}
                    onClick={() => requireSecurityAuth(performEnableBiometrics)}
                    className="py-2.5 px-3 rounded-xl bg-[#70189F] hover:bg-[#5e1385] text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Re-enable Biometric
                  </button>
                </div>
              </div>
            )}

            {/* Change PIN Sheet */}
            {activePreferenceSheet === 'pin' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#222226]">Change PIN</h3>
                  <button
                    type="button"
                    onClick={() => setActivePreferenceSheet(null)}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {errorMsg && <p className="text-xs text-red-600 font-medium">{errorMsg}</p>}
                {successMsg && <p className="text-xs text-emerald-700 font-medium">{successMsg}</p>}
                <div className="space-y-3">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Current PIN"
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#F6F6F8] border border-gray-200 focus:border-[#70189F] focus:bg-white rounded-xl px-3.5 py-3 text-sm font-mono focus:outline-none"
                  />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="New 4-digit PIN"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#F6F6F8] border border-gray-200 focus:border-[#70189F] focus:bg-white rounded-xl px-3.5 py-3 text-sm font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      await handlePinChange();
                    }}
                    className="w-full py-3 rounded-xl bg-[#70189F] hover:bg-[#5e1385] text-white font-bold text-sm transition cursor-pointer"
                  >
                    Update PIN
                  </button>
                </div>
              </div>
            )}

            {/* Change Passphrase Sheet */}
            {activePreferenceSheet === 'passphrase' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#222226]">Change Passphrase</h3>
                  <button
                    type="button"
                    onClick={() => setActivePreferenceSheet(null)}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {errorMsg && <p className="text-xs text-red-600 font-medium">{errorMsg}</p>}
                {successMsg && <p className="text-xs text-emerald-700 font-medium">{successMsg}</p>}
                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="Current Passphrase"
                    value={oldPass}
                    onChange={(e) => setOldPass(e.target.value)}
                    className="w-full bg-[#F6F6F8] border border-gray-200 focus:border-[#70189F] focus:bg-white rounded-xl px-3.5 py-3 text-sm focus:outline-none"
                  />
                  <input
                    type="password"
                    placeholder="New Passphrase (min 6 characters)"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full bg-[#F6F6F8] border border-gray-200 focus:border-[#70189F] focus:bg-white rounded-xl px-3.5 py-3 text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      await handlePasswordChange();
                    }}
                    className="w-full py-3 rounded-xl bg-[#70189F] hover:bg-[#5e1385] text-white font-bold text-sm transition cursor-pointer"
                  >
                    Update Passphrase
                  </button>
                </div>
              </div>
            )}

            {/* Log out Confirmation Sheet */}
            {activePreferenceSheet === 'logout' && (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#FDF1F1] text-[#D84035] mx-auto flex items-center justify-center">
                  <LogOut className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#222226]">Log out</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Are you sure you want to log out of your CBE Mobile Banking session?
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setActivePreferenceSheet(null)}
                    className="py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePreferenceSheet(null);
                      onLogout();
                    }}
                    className="py-3 rounded-xl bg-[#D84035] hover:bg-[#c0352b] text-white font-semibold text-sm transition cursor-pointer"
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TERMS & PRIVACY POPUP MODAL ================= */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 max-h-[80vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-[#70189F] mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#70189F]" />
              <span>{legalModalMode === 'privacy' ? 'Privacy Policy' : 'Terms and Tarrifs'}</span>
            </h3>
            <div className="space-y-3.5 text-xs text-gray-600 leading-relaxed font-sans pr-1">
              <p className="font-bold text-gray-900">1. Commercial Bank of Ethiopia Mobile Banking</p>
              <p>
                Commercial Bank of Ethiopia Mobile Banking provides convenient digital access to your accounts, fund transfers, utility payments, and account preferences.
              </p>
              <p className="font-bold text-gray-900">2. Security and Passcode Guard</p>
              <p>
                This application stores simulated user records in local web browser caches. Security measures such as PIN codes and cryptographic audit logs are implemented for prototype demonstration purposes only.
              </p>
              <p className="font-bold text-gray-900">3. Legitimate Banking API Proxy</p>
              <p>
                Any future connection to legitimate payment structures (EthSwitch, Commercial Bank of Ethiopia systems, or national billing services) must be secured by encrypted server-side cloud resources as represented in our Firestore rules specifications.
              </p>
            </div>
            <button
              onClick={() => setShowTerms(false)}
              className="mt-6 w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-2.5 rounded-xl text-xs transition"
            >
              I Accept &amp; Understand
            </button>
          </div>
        </div>
      )}

      {/* ================= EDIT PROFILE & ACCOUNT NUMBER MODAL ================= */}
      {showEditProfileModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-[#70189F] rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">Edit Name &amp; Account</h3>
                  <p className="text-[11px] text-gray-500">Update account holder, balance &amp; CBE number</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
              {/* Full Name input with Ethiopian Name Autocomplete */}
              <div className="space-y-1">
                <EthiopianNameAutocomplete
                  id="input-edit-name"
                  label="Account Holder Name"
                  placeholder="e.g. Abebe, Selamawit, Dawit..."
                  value={editName}
                  onChange={setEditName}
                  required
                  theme="cbe"
                  helperText="Supports Ethiopian names with intelligent auto-suggestion & manual entry"
                />
              </div>

              {/* Account Number input with Generate button */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-700">CBE Account Number</label>
                  <button
                    type="button"
                    onClick={() => setEditAccount(generateRandomCbeAccount())}
                    className="text-[11px] text-[#70189F] hover:text-[#7e1c97] font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Shuffle className="w-3 h-3" />
                    <span>Generate A/C</span>
                  </button>
                </div>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-3 w-4 h-4 text-purple-600" />
                  <input
                    id="input-edit-account"
                    type="text"
                    value={editAccount}
                    onChange={(e) => setEditAccount(e.target.value.replace(/\s+/g, ''))}
                    placeholder="1000..."
                    className="w-full bg-gray-50 border border-gray-200 focus:border-[#70189F] focus:bg-white rounded-xl py-2.5 pl-10 pr-3 text-xs font-mono font-bold text-gray-900 focus:outline-none transition tracking-wide"
                    required
                  />
                </div>
                <p className="text-[10px] text-gray-400">Standard CBE format starts with 1000 (13 digits)</p>
              </div>

              {/* Account Type Selector */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Account Type</label>
                <select
                  value={editAccountType}
                  onChange={(e) => setEditAccountType(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-[#70189F] focus:bg-white rounded-xl py-2.5 px-3 text-xs font-semibold text-gray-900 focus:outline-none transition"
                >
                  <option value="savings">CBE Regular Savings</option>
                  <option value="wadiah">CBE Noor (Wadiah / Non-Interest)</option>
                  <option value="checking">Checking Current Account</option>
                  <option value="cbe_birr">CBE Birr Digital Wallet</option>
                </select>
              </div>

              {/* Account Balance Editor */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-700">Account Balance (ETB)</label>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Active Balance
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute left-3.5 top-2.5 text-xs font-bold text-[#70189F] pointer-events-none">
                    ETB
                  </div>
                  <input
                    id="input-edit-balance"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editBalance}
                    onChange={(e) => setEditBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-[#70189F] focus:bg-white rounded-xl py-2.5 pl-13 pr-3 text-xs font-mono font-bold text-gray-900 focus:outline-none transition tracking-wide"
                    required
                  />
                </div>
                <p className="text-[10px] text-gray-400">Updates live wallet &amp; CBE home account balance immediately</p>
              </div>

              {/* Phone & Email (Optional edits) */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500">Phone</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-2.5 text-[11px] font-mono text-gray-800 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-2.5 text-[11px] text-gray-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-profile-modal"
                  type="submit"
                  className="flex-1 bg-[#70189F] hover:bg-[#7e1c97] text-white font-extrabold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MULTI-ACCOUNT SWITCHER & NEW ACCOUNT REGISTRATION MODAL ================= */}
      {showAccountsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 max-h-[85vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-purple-950 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">
                    {showNewAccountForm ? 'Register New Account' : 'All Registered Accounts'}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    {showNewAccountForm ? 'Create a profile with custom name & A/C' : 'Switch active user or register a new one'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAccountsModal(false);
                  setShowNewAccountForm(false);
                }}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* View 1: List Accounts */}
            {!showNewAccountForm && (
              <div className="mt-3 space-y-2.5">
                <div className="relative">
                  <input
                    type="text"
                    value={accountsSearchTerm}
                    onChange={(e) => setAccountsSearchTerm(e.target.value)}
                    placeholder="Search account name or number..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#70189f] focus:bg-white transition"
                  />
                  {accountsSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setAccountsSearchTerm('')}
                      className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                  {allRegisteredUsers
                    .filter((u) => {
                      if (!accountsSearchTerm.trim()) return true;
                      const q = accountsSearchTerm.toLowerCase();
                      const digits = q.replace(/\D/g, '');
                      const matchName = u.name.toLowerCase().includes(q);
                      const matchAcc = digits.length > 0 && u.accountNumber.includes(digits);
                      return matchName || matchAcc;
                    })
                    .map((u) => {
                      const isCurrent = u.id === currentUser.id || (Boolean(u.accountNumber) && Boolean(currentUser.accountNumber) && u.accountNumber.replace(/\D/g, '') === currentUser.accountNumber.replace(/\D/g, ''));
                      return (
                        <div
                          key={u.id}
                          onClick={() => handleSwitchAccount(u)}
                          className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                            isCurrent
                              ? 'bg-purple-50/80 border-[#70189F] shadow-sm'
                              : 'bg-gray-50 hover:bg-purple-50/40 border-gray-200'
                          }`}
                        >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            isCurrent ? 'bg-[#70189F] text-amber-300' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-gray-900 truncate">{u.name}</p>
                              {isCurrent && (
                                <span className="bg-[#70189F] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-md">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-purple-900 font-semibold truncate">A/C: {u.accountNumber}</p>
                            <p className="text-[10px] text-gray-500 font-mono">ETB {u.balance.toLocaleString()}</p>
                          </div>
                        </div>

                        {!isCurrent && (
                          <span className="text-xs text-[#70189F] font-extrabold bg-white px-2.5 py-1 rounded-xl border border-purple-200 shadow-2xs hover:bg-purple-100 flex-shrink-0">
                            Switch
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <button
                    id="btn-show-new-acc-form"
                    type="button"
                    onClick={() => {
                      setNewAccName('');
                      setNewAccNumber(generateRandomCbeAccount());
                      setShowNewAccountForm(true);
                    }}
                    className="w-full bg-gradient-to-r from-amber-400 to-amber-300 hover:brightness-105 text-purple-950 font-extrabold py-3 rounded-2xl text-xs transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Register Different Account / Name</span>
                  </button>
                </div>
              </div>
            )}

            {/* View 2: Register New Account Form */}
            {showNewAccountForm && (
              <form onSubmit={handleRegisterNewAccount} className="mt-4 space-y-3.5">
                <div className="space-y-1">
                  <EthiopianNameAutocomplete
                    id="input-new-acc-name"
                    label="Account Holder Name"
                    placeholder="e.g. Almaz Ayana, Abebe Bikila..."
                    value={newAccName}
                    onChange={setNewAccName}
                    required
                    theme="cbe"
                    helperText="Select from Ethiopian names or manually enter custom name"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-700">Account Number</label>
                    <button
                      type="button"
                      onClick={() => setNewAccNumber(generateRandomCbeAccount())}
                      className="text-[11px] text-[#70189F] hover:text-[#7e1c97] font-extrabold flex items-center gap-1 cursor-pointer"
                    >
                      <Shuffle className="w-3 h-3" />
                      <span>Randomize</span>
                    </button>
                  </div>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-3 w-4 h-4 text-amber-600" />
                    <input
                      id="input-new-acc-number"
                      type="text"
                      placeholder="1000..."
                      value={newAccNumber}
                      onChange={(e) => setNewAccNumber(e.target.value.replace(/\s+/g, ''))}
                      className="w-full bg-gray-50 border border-gray-200 focus:border-[#70189F] focus:bg-white rounded-xl py-2.5 pl-10 pr-3 text-xs font-mono font-bold text-gray-900 focus:outline-none transition"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Account Type</label>
                  <select
                    value={newAccType}
                    onChange={(e) => setNewAccType(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-[#70189F] focus:bg-white rounded-xl py-2.5 px-3 text-xs font-semibold text-gray-900 focus:outline-none transition"
                  >
                    <option value="savings">CBE Regular Savings</option>
                    <option value="wadiah">CBE Noor (Wadiah / Non-Interest)</option>
                    <option value="checking">Checking Current Account</option>
                    <option value="cbe_birr">CBE Birr Digital Wallet</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500">Phone</label>
                    <input
                      type="tel"
                      value={newAccPhone}
                      onChange={(e) => setNewAccPhone(e.target.value)}
                      placeholder="+2519..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-2.5 text-[11px] font-mono text-gray-800 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500">Starting Balance</label>
                    <input
                      type="number"
                      value={newAccInitialBalance}
                      onChange={(e) => setNewAccInitialBalance(e.target.value)}
                      placeholder="25000.00"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-2.5 text-[11px] font-mono text-gray-800 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewAccountForm(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition"
                  >
                    Back to Accounts
                  </button>
                  <button
                    id="btn-create-account-submit"
                    type="submit"
                    className="flex-1 bg-[#70189F] hover:bg-[#7e1c97] text-white font-extrabold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create &amp; Activate</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Bank Logo Modal */}
      <BankLogoModal 
        isOpen={showLogoModal}
        onClose={() => setShowLogoModal(false)}
        currentUser={currentUser}
        onLogoUpdated={(logo) => setCustomBankLogo(logo)}
      />

      {/* Security Settings Re-Authentication Modal */}
      {showSecurityAuthGate && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 relative space-y-4">
            <button
              type="button"
              onClick={() => {
                setShowSecurityAuthGate(false);
                setPendingSecurityAction(null);
              }}
              aria-label="Close"
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#70189F] flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">Verify Your Identity</h3>
                <p className="text-[11px] text-gray-500">Authentication is required before changing security settings.</p>
              </div>
            </div>

            <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setSecurityAuthMode('pin');
                  setSecurityAuthSecret('');
                  setSecurityAuthError('');
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  securityAuthMode === 'pin' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'
                }`}
              >
                Use PIN
              </button>
              <button
                type="button"
                onClick={() => {
                  setSecurityAuthMode('password');
                  setSecurityAuthSecret('');
                  setSecurityAuthError('');
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  securityAuthMode === 'password' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'
                }`}
              >
                Use Password
              </button>
            </div>

            <input
              type="text"
              inputMode={securityAuthMode === 'pin' ? 'numeric' : 'text'}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-form-type="other"
              maxLength={securityAuthMode === 'pin' ? 6 : 64}
              placeholder={securityAuthMode === 'pin' ? 'Enter current 4–6 digit PIN' : 'Enter account password'}
              value={securityAuthSecret}
              onChange={(e) => {
                setSecurityAuthError('');
                setSecurityAuthSecret(
                  securityAuthMode === 'pin' ? e.target.value.replace(/\D/g, '') : e.target.value
                );
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleVerifySecurityGateWithCredentials();
                }
              }}
              className="w-full bg-gray-50 border border-gray-200 focus:border-[#70189F] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-mono [-webkit-text-security:disc] focus:outline-none"
            />

            {securityAuthError && (
              <p className="text-xs text-rose-600 font-medium">{securityAuthError}</p>
            )}

            <div className="space-y-2">
              <button
                id="btn-confirm-security-auth"
                type="button"
                disabled={securityAuthLoading}
                onClick={handleVerifySecurityGateWithCredentials}
                className="w-full py-2.5 rounded-xl bg-[#70189F] hover:bg-[#5e1385] text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-70"
              >
                {securityAuthLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Verify &amp; Continue</span>
                )}
              </button>

              {biometrics && (
                <button
                  type="button"
                  disabled={securityAuthLoading}
                  onClick={handleVerifySecurityGateWithBiometrics}
                  className="w-full py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#70189F] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-70"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>Verify with {BiometricAuthService.getDeviceBiometricName()}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

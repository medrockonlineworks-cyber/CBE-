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
  Hash
} from 'lucide-react';
import BankLogoModal from './BankLogoModal';
import AppInstallPrompt from './AppInstallPrompt';
import NotificationSettingsCard from './NotificationSettingsCard';
import { PushNotificationService } from '../services/pushNotificationService';
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
      if (showLogoModal) {
        setShowLogoModal(false);
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
  }, [showEditProfileModal, showAccountsModal, showPinForm, showPassForm, showTerms, showLogoModal, onBack]);

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
    setTimeout(() => setShowPinForm(false), 1800);
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
    setTimeout(() => setShowPassForm(false), 1800);
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

  return (
    <div id="profile-screen" className="w-full h-full overflow-y-auto overscroll-contain bg-gray-50 pb-36 font-sans select-none">
      
      {/* Settings Top Header Bar */}
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
        <span className="font-bold text-base text-white">Settings</span>
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

      {/* ================= TERMS & CONDITIONS POPUP MODAL ================= */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 max-h-[80vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-emerald-950 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-800" />
              <span>Terms of Service</span>
            </h3>
            <div className="space-y-3.5 text-xs text-gray-600 leading-relaxed font-sans pr-1">
              <p className="font-bold text-gray-900">1. Simulated Nature of Ledger</p>
              <p>
                Tana Digital Bank is a financial application prototype. All deposits, balances, interest rates, utility payments, and mobile airtime recharges represented herein are strictly simulated and have no actual real-world fiscal value.
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

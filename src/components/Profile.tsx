import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { LocalDb, DEFAULT_CBE_LOGO } from '../lib/mockData';
import { SmsService } from '../services/smsService';
import { CbeLogo } from './CbeLogo';
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
  PhoneCall
} from 'lucide-react';
import BankLogoModal from './BankLogoModal';
import AppInstallPrompt from './AppInstallPrompt';
import EthiopianNameAutocomplete, { EthiopianThreePartNameInput } from './EthiopianNameAutocomplete';

interface ProfileProps {
  currentUser: UserProfile;
  onLogout: () => void;
  onUpdateUser: (user: UserProfile) => void;
  onOpenAdmin: () => void;
  onOpenSmsSimulator?: () => void;
  onOpenTruecallerSimulator?: () => void;
  onOpenPhoneApp?: () => void;
  onOpenDashenApp?: () => void;
  onOpenTelebirrApp?: () => void;
  onOpenTelegramApp?: () => void;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'am', label: 'Amharic (አማርኛ)' },
  { code: 'or', label: 'Oromo (Afaan Oromoo)' },
  { code: 'ti', label: 'Tigrinya (ትግርኛ)' }
];

export default function Profile({ currentUser, onLogout, onUpdateUser, onOpenAdmin, onOpenSmsSimulator, onOpenTruecallerSimulator, onOpenPhoneApp, onOpenDashenApp, onOpenTelebirrApp, onOpenTelegramApp }: ProfileProps) {
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
  const [biometrics, setBiometrics] = useState(currentUser.biometricEnabled || false);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [emailStatements, setEmailStatements] = useState(false);

  // Edit Profile / Account Form States
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editAccount, setEditAccount] = useState(currentUser.accountNumber);
  const [editPhone, setEditPhone] = useState(currentUser.phone);
  const [editEmail, setEditEmail] = useState(currentUser.email);
  const [editAccountType, setEditAccountType] = useState<UserProfile['accountType']>(currentUser.accountType || 'savings');

  // Account Switcher / Multi-Account Registration Modal
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [showNewAccountForm, setShowNewAccountForm] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccNumber, setNewAccNumber] = useState(() => '1000' + Math.floor(100000000 + Math.random() * 900000000).toString());
  const [newAccPhone, setNewAccPhone] = useState('+2519');
  const [newAccEmail, setNewAccEmail] = useState('');
  const [newAccType, setNewAccType] = useState<'savings' | 'checking' | 'wadiah' | 'cbe_birr'>('savings');
  const [newAccInitialBalance, setNewAccInitialBalance] = useState('10000000000.00');

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

  const generateRandomCbeAccount = () => {
    return '1000' + Math.floor(100000000 + Math.random() * 900000000).toString();
  };

  const handleOpenEditProfile = () => {
    setEditName(currentUser.name);
    setEditAccount(currentUser.accountNumber);
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

    const updated = LocalDb.updateUserProfile(currentUser.id, {
      name: editName.trim(),
      accountNumber: cleanEditAcc,
      phone: editPhone.trim(),
      email: editEmail.trim(),
      accountType: editAccountType
    });

    if (updated) {
      onUpdateUser(updated);
      setSuccessMsg('Name and Account Number updated successfully!');
      setShowEditProfileModal(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg('Failed to update user profile.');
    }
  };

  const handleSwitchAccount = (targetUser: UserProfile) => {
    if (targetUser.id === currentUser.id) {
      setShowAccountsModal(false);
      return;
    }
    LocalDb.addAuditLog(targetUser.id, targetUser.email, 'USER_SWITCH_ACCOUNT', `Switched active session from ${currentUser.name} to ${targetUser.name} (A/C: ${targetUser.accountNumber}).`);
    localStorage.setItem('tana_active_user_id', targetUser.id);
    onUpdateUser(targetUser);
    setShowAccountsModal(false);
    setSuccessMsg(`Switched to account: ${targetUser.name} (A/C: ${targetUser.accountNumber})`);
    setTimeout(() => setSuccessMsg(''), 4000);
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

    const parsedBalance = parseFloat(newAccInitialBalance) || 10000000000.00;

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
  };

  const handleToggleBiometrics = () => {
    const nextVal = !biometrics;
    setBiometrics(nextVal);
    const updated = { ...currentUser, biometricEnabled: nextVal };
    onUpdateUser(updated);

    // Update in users DB array
    const users = LocalDb.getUsers();
    const idx = users.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) {
      users[idx].biometricEnabled = nextVal;
      LocalDb.setUsers(users);
    }

    LocalDb.addNotification(currentUser.id, 'Biometric Settings Updated', `Touch/Face ID has been successfully ${nextVal ? 'enabled' : 'disabled'}.`, 'info');
  };

  const handlePinChange = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPin.length !== 4) {
      setErrorMsg('New security PIN must be exactly 4 digits.');
      return;
    }

    // Save
    LocalDb.addAuditLog(currentUser.id, currentUser.email, 'USER_PIN_CHANGE', 'User updated their 4-digit secure transaction authorization PIN.');
    setSuccessMsg('Your security PIN code was updated successfully!');
    setOldPin('');
    setNewPin('');
    setTimeout(() => setShowPinForm(false), 2000);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPass.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }

    LocalDb.addAuditLog(currentUser.id, currentUser.email, 'USER_PASS_CHANGE', 'User updated their security access password.');
    setSuccessMsg('Security password successfully updated!');
    setOldPass('');
    setNewPass('');
    setTimeout(() => setShowPassForm(false), 2000);
  };

  const handleLangChange = (code: string) => {
    setActiveLang(code);
    let welcome = 'Language preference updated!';
    if (code === 'am') welcome = 'የቋንቋ ምርጫዎ ተስተካክሏል!';
    if (code === 'or') welcome = 'Filannoon afaan keessanii sirreeffameera!';
    if (code === 'ti') welcome = 'ምርጫ ቋንቋኹም ተስተካኪሉ ኣሎ!';
    
    LocalDb.addNotification(currentUser.id, 'Language Altered', welcome, 'info');
    alert(welcome);
  };

  return (
    <div id="profile-screen" className="max-w-md mx-auto bg-gray-50 min-h-screen pb-28 font-sans">
      
      {/* Profile Header */}
      <div className="bg-[#68137e] text-white px-5 pt-7 pb-8 rounded-b-[2rem] shadow-md text-center space-y-3 relative">
        <div className="w-20 h-20 rounded-full bg-white/15 border-2 border-[#deb356] mx-auto flex items-center justify-center font-black text-[#deb356] text-3xl shadow-lg relative">
          {currentUser.name.split(' ').map(n => n[0]).join('')}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#68137e] border border-white/20 rounded-full flex items-center justify-center">
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
              <div className="p-2 bg-purple-50 text-[#68137e] rounded-xl">
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
              className="bg-[#68137e] hover:bg-[#7e1c97] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer shadow-sm"
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
            className="w-full bg-white hover:bg-gray-50 text-[#68137e] text-xs font-bold py-2.5 px-3 rounded-2xl border border-purple-150 transition flex items-center justify-between cursor-pointer"
          >
            <span>View All Registered Accounts ({LocalDb.getUsers().length})</span>
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
                  className="bg-[#68137e] hover:bg-[#7e1c97] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-purple-400/30 shadow-md flex-shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Change Logo</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Android PWA Installation & App Details */}
        <AppInstallPrompt mode="settings" />

        {/* Security & Access Section */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">Security &amp; Device Access</h3>
          
          {/* Simulated Biometrics */}
          <div className="flex justify-between items-center py-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Biometric Verification</p>
                <p className="text-[10px] text-gray-400">Unlock app via Fingerprint / Face ID</p>
              </div>
            </div>
            <button
              id="btn-toggle-biometrics"
              onClick={handleToggleBiometrics}
              className={`w-12 h-6.5 rounded-full p-1 transition duration-300 cursor-pointer ${
                biometrics ? 'bg-emerald-800' : 'bg-gray-200'
              }`}
            >
              <div className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transition-transform duration-300 transform ${
                biometrics ? 'translate-x-5.5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Change PIN Accordion */}
          <div className="border-t border-gray-50 pt-3">
            <button
              id="btn-toggle-pin-form"
              onClick={() => setShowPinForm(!showPinForm)}
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
              <form onSubmit={handlePinChange} className="mt-3.5 space-y-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-top-2 duration-150">
                <input
                  type="password"
                  maxLength={4}
                  placeholder="Old 4-Digit PIN"
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-mono"
                  required
                />
                <input
                  type="password"
                  maxLength={4}
                  placeholder="New 4-Digit PIN"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-mono"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-emerald-800 text-white font-bold py-2 rounded-xl text-xs transition"
                >
                  Save PIN Change
                </button>
              </form>
            )}
          </div>

          {/* Change Password Accordion */}
          <div className="border-t border-gray-50 pt-3">
            <button
              onClick={() => setShowPassForm(!showPassForm)}
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
              <form onSubmit={handlePasswordChange} className="mt-3.5 space-y-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-top-2 duration-150">
                <input
                  type="password"
                  placeholder="Old Password"
                  value={oldPass}
                  onChange={(e) => setOldPass(e.target.value)}
                  className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs"
                  required
                />
                <input
                  type="password"
                  placeholder="New Password (min 6 chars)"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-emerald-800 text-white font-bold py-2 rounded-xl text-xs transition"
                >
                  Save Password
                </button>
              </form>
            )}
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

          {/* Dashen Bank Super App */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/50 hover:bg-blue-50 border border-blue-100/80 transition">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#0c1e3f] text-white rounded-xl flex-shrink-0 shadow-sm flex flex-col items-center justify-center w-9 h-9 border border-blue-400/30">
                <div className="w-4 h-2 border-b border-white flex items-end justify-center">
                  <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[5px] border-b-white" />
                </div>
                <span className="text-[5px] font-bold text-white leading-none mt-0.5">ዳሽን</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-800">Dashen Bank Super App</p>
                  <span className="text-[9px] font-extrabold bg-[#1a73e8] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Live
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 truncate max-w-[200px] sm:max-w-xs">
                  Account 5502877108011 • Transfers, Cards &amp; E-commerce
                </p>
              </div>
            </div>
            <button
              type="button"
              id="settings-dashen-bank-app-btn"
              onClick={() => {
                if (onOpenDashenApp) {
                  onOpenDashenApp();
                } else {
                  try {
                    window.history.pushState({ view: 'dashen' }, '', '/dashen');
                    window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'dashen' } }));
                  } catch {}
                }
              }}
              className="px-3 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] active:scale-95 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs flex-shrink-0"
            >
              <span>Open</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Telebirr Super App (Requested Below Dashen Bank) */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-lime-50/50 hover:bg-lime-50 border border-lime-200/80 transition">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-gradient-to-br from-[#5cb82e] to-[#0085ca] text-white rounded-xl flex-shrink-0 shadow-sm flex flex-col items-center justify-center w-9 h-9 border border-lime-300">
                <span className="text-[11px] font-black text-white leading-none">t</span>
                <span className="text-[6px] font-extrabold text-white leading-none mt-0.5">telebirr</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-800">Telebirr Super App</p>
                  <span className="text-[9px] font-extrabold bg-[#5cb82e] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Live
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 truncate max-w-[200px] sm:max-w-xs">
                  Balance 41,865.79 ETB • Transfer to Bank &amp; Airtime
                </p>
              </div>
            </div>
            <button
              type="button"
              id="settings-telebirr-app-btn"
              onClick={() => {
                if (onOpenTelebirrApp) {
                  onOpenTelebirrApp();
                } else {
                  try {
                    window.history.pushState({ view: 'telebirr' }, '', '/telebirr');
                    window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'telebirr' } }));
                  } catch {}
                }
              }}
              className="px-3 py-1.5 bg-[#5cb82e] hover:bg-[#4ea026] active:scale-95 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs flex-shrink-0"
            >
              <span>Open</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Telegram Chat Simulator (Requested Below Telebirr App) */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-sky-50/50 hover:bg-sky-50 border border-sky-200/80 transition">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-[#229ED9] text-white rounded-xl flex-shrink-0 shadow-sm flex flex-col items-center justify-center w-9 h-9 border border-sky-300">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-800">Telegram Chat Simulator</p>
                  <span className="text-[9px] font-extrabold bg-[#229ED9] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                    New
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 truncate max-w-[200px] sm:max-w-xs">
                  Fictional mock chat editor • Custom bubbles, receipts &amp; export
                </p>
              </div>
            </div>
            <button
              type="button"
              id="settings-telegram-simulator-app-btn"
              onClick={() => {
                if (onOpenTelegramApp) {
                  onOpenTelegramApp();
                } else {
                  try {
                    window.history.pushState({ view: 'telegram' }, '', '/telegram');
                    window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'telegram' } }));
                  } catch {}
                }
              }}
              className="px-3 py-1.5 bg-[#229ED9] hover:bg-[#1b88bd] active:scale-95 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs flex-shrink-0"
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
                <div className="p-2 bg-purple-50 text-[#68137e] rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">Edit Name &amp; Account</h3>
                  <p className="text-[11px] text-gray-500">Update account holder &amp; CBE number</p>
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
                    className="text-[11px] text-[#68137e] hover:text-[#7e1c97] font-extrabold flex items-center gap-1 cursor-pointer"
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
                    className="w-full bg-gray-50 border border-gray-200 focus:border-[#68137e] focus:bg-white rounded-xl py-2.5 pl-10 pr-3 text-xs font-mono font-bold text-gray-900 focus:outline-none transition tracking-wide"
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
                  className="w-full bg-gray-50 border border-gray-200 focus:border-[#68137e] focus:bg-white rounded-xl py-2.5 px-3 text-xs font-semibold text-gray-900 focus:outline-none transition"
                >
                  <option value="savings">CBE Regular Savings</option>
                  <option value="wadiah">CBE Noor (Wadiah / Non-Interest)</option>
                  <option value="checking">Checking Current Account</option>
                  <option value="cbe_birr">CBE Birr Digital Wallet</option>
                </select>
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
                  className="flex-1 bg-[#68137e] hover:bg-[#7e1c97] text-white font-extrabold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md"
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
              <div className="mt-4 space-y-3">
                <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                  {LocalDb.getUsers().map((u) => {
                    const isCurrent = u.id === currentUser.id;
                    return (
                      <div
                        key={u.id}
                        onClick={() => handleSwitchAccount(u)}
                        className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                          isCurrent
                            ? 'bg-purple-50/80 border-[#68137e] shadow-sm'
                            : 'bg-gray-50 hover:bg-purple-50/40 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            isCurrent ? 'bg-[#68137e] text-amber-300' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-gray-900 truncate">{u.name}</p>
                              {isCurrent && (
                                <span className="bg-[#68137e] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-md">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-purple-900 font-semibold truncate">A/C: {u.accountNumber}</p>
                            <p className="text-[10px] text-gray-500 font-mono">ETB {u.balance.toLocaleString()}</p>
                          </div>
                        </div>

                        {!isCurrent && (
                          <span className="text-xs text-[#68137e] font-extrabold bg-white px-2.5 py-1 rounded-xl border border-purple-200 shadow-2xs hover:bg-purple-100 flex-shrink-0">
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
                      className="text-[11px] text-[#68137e] hover:text-[#7e1c97] font-extrabold flex items-center gap-1 cursor-pointer"
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
                      className="w-full bg-gray-50 border border-gray-200 focus:border-[#68137e] focus:bg-white rounded-xl py-2.5 pl-10 pr-3 text-xs font-mono font-bold text-gray-900 focus:outline-none transition"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Account Type</label>
                  <select
                    value={newAccType}
                    onChange={(e) => setNewAccType(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-[#68137e] focus:bg-white rounded-xl py-2.5 px-3 text-xs font-semibold text-gray-900 focus:outline-none transition"
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
                      placeholder="10000000000.00"
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
                    className="flex-1 bg-[#68137e] hover:bg-[#7e1c97] text-white font-extrabold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md"
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

    </div>
  );
}

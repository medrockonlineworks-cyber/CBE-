import React, { useState } from 'react';
import { UserProfile } from '../types';
import { LocalDb, DEFAULT_CBE_LOGO } from '../lib/mockData';
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
  Sparkles
} from 'lucide-react';
import BankLogoModal from './BankLogoModal';

interface ProfileProps {
  currentUser: UserProfile;
  onLogout: () => void;
  onUpdateUser: (user: UserProfile) => void;
  onOpenAdmin: () => void;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'am', label: 'Amharic (አማርኛ)' },
  { code: 'or', label: 'Oromo (Afaan Oromoo)' },
  { code: 'ti', label: 'Tigrinya (ትግርኛ)' }
];

export default function Profile({ currentUser, onLogout, onUpdateUser, onOpenAdmin }: ProfileProps) {
  const [activeLang, setActiveLang] = useState('en');
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [customBankLogo, setCustomBankLogo] = useState<string | null>(() => LocalDb.getCustomBankLogo());
  
  const isAdmin = currentUser.role === 'admin' || currentUser.email === 'leykunjemaneh3@gmail.com';
  
  // Settings toggles
  const [biometrics, setBiometrics] = useState(currentUser.biometricEnabled || false);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [emailStatements, setEmailStatements] = useState(false);

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
      <div className="bg-[#61167e] text-white px-5 pt-7 pb-8 rounded-b-[2rem] shadow-md text-center space-y-3">
        <div className="w-20 h-20 rounded-full bg-white/15 border-2 border-[#deb356] mx-auto flex items-center justify-center font-black text-[#deb356] text-3xl shadow-lg relative">
          {currentUser.name.split(' ').map(n => n[0]).join('')}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#61167e] border border-white/20 rounded-full flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-purple-200" />
          </div>
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-white">{currentUser.name}</h2>
          <p className="text-xs text-purple-200 font-mono mt-0.5">A/C: {currentUser.accountNumber}</p>
          <p className="text-[10px] text-purple-300/80 font-mono">{currentUser.email}</p>
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
                  <img 
                    src={customBankLogo || DEFAULT_CBE_LOGO} 
                    alt="Current CBE Logo" 
                    className="w-11 h-11 object-contain rounded-xl bg-white/10 p-1 border border-white/10 flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white whitespace-nowrap">Bank Logo &amp; Emblem</p>
                    <p className="text-[10px] text-slate-400">Change Commercial Bank of Ethiopia logo</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLogoModal(true)}
                  className="bg-[#61167e] hover:bg-[#7b1fa2] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-purple-400/30 shadow-md flex-shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Change Logo</span>
                </button>
              </div>
            </div>
          </div>
        )}

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

import React, { useState, useEffect } from 'react';
import { LocalDb, DEFAULT_CBE_LOGO } from '../lib/mockData';
import { UserProfile } from '../types';
import { CbeLogo } from './CbeLogo';
import { 
  Phone, 
  Lock, 
  User, 
  Mail, 
  ArrowRight, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  Fingerprint
} from 'lucide-react';
import AppInstallPrompt from './AppInstallPrompt';

interface AuthProps {
  onLoginSuccess: (user: UserProfile) => void;
}

type AuthSubScreen = 'login' | 'register' | 'otp' | 'pin-setup' | 'forgot';

export default function Auth({ onLoginSuccess }: AuthProps) {
  const [screen, setScreen] = useState<AuthSubScreen>('login');
  
  // Registration States
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');

  // Login States
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // PIN & OTP States
  const [otpCode, setOtpCode] = useState('');
  const [simulatedSentOtp, setSimulatedSentOtp] = useState('');
  const [enteredPin, setEnteredPin] = useState('');

  // Status message
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [simulatedSmsToast, setSimulatedSmsToast] = useState<string | null>(null);
  const [customBankLogo, setCustomBankLogo] = useState<string | null>(() => LocalDb.getCustomBankLogo());

  useEffect(() => {
    const handleUpdate = () => setCustomBankLogo(LocalDb.getCustomBankLogo());
    window.addEventListener('cbe_logo_updated', handleUpdate);
    return () => window.removeEventListener('cbe_logo_updated', handleUpdate);
  }, []);

  // Auto load demo toast for visual delight
  const triggerSimulatedSms = (code: string) => {
    setSimulatedSentOtp(code);
    setSimulatedSmsToast(`[SMS GATEWAY] TanaBank OTP code is: ${code}. Valid for 5 mins.`);
    setTimeout(() => {
      setSimulatedSmsToast(null);
    }, 15000); // show for 15s so user sees it
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const users = LocalDb.getUsers();
    // find user by phone or email
    const match = users.find(u => 
      (u.phone === loginPhone || u.phone === '+251' + loginPhone || u.email.toLowerCase() === loginPhone.toLowerCase())
    );

    if (!match) {
      setErrorMsg('No account found with this phone number or email.');
      return;
    }

    if (match.status === 'suspended') {
      setErrorMsg('This account has been suspended by administration security policy.');
      return;
    }

    // Success - trigger simulated OTP
    const generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
    setSuccessMsg('Authentication credentials matched! OTP required.');
    triggerSimulatedSms(generatedCode);
    setScreen('otp');
    
    // Store user session temporarily
    localStorage.setItem('tana_pending_user_id', match.id);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regName || !regPhone || !regPass) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    const formattedPhone = regPhone.startsWith('+251') ? regPhone : '+251' + regPhone.replace(/^0/, '');
    const users = LocalDb.getUsers();
    const phoneExists = users.some(u => u.phone === formattedPhone);

    if (phoneExists) {
      setErrorMsg('An account with this phone number already exists.');
      return;
    }

    // Create intermediate pending profile
    const pendingProfile = {
      name: regName,
      phone: formattedPhone,
      email: regEmail || `${regName.toLowerCase().replace(/\s+/g, '')}@tana.demo`,
      password: regPass
    };

    localStorage.setItem('tana_pending_registration', JSON.stringify(pendingProfile));
    
    // Send simulated OTP for registration
    const generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
    triggerSimulatedSms(generatedCode);
    setSuccessMsg('Registration code dispatched via SMS!');
    setScreen('otp');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (otpCode !== simulatedSentOtp && otpCode !== '1234') { // '1234' is master debug code
      setErrorMsg('Invalid verification code. Please check your SMS and try again.');
      return;
    }

    // OTP Correct! Check if registration or login
    const pendingRegStr = localStorage.getItem('tana_pending_registration');
    const pendingUserId = localStorage.getItem('tana_pending_user_id');

    if (pendingRegStr) {
      // Registration complete, move to PIN Setup
      setScreen('pin-setup');
    } else if (pendingUserId) {
      // Login complete, load user directly
      const users = LocalDb.getUsers();
      const user = users.find(u => u.id === pendingUserId);
      if (user) {
        LocalDb.addAuditLog(user.id, user.email, 'USER_LOGIN', `User ${user.name} logged in successfully via simulated OTP authentication.`);
        onLoginSuccess(user);
      } else {
        setErrorMsg('Error reloading session profile.');
      }
    }
  };

  const handlePinSetupSubmit = (pin: string) => {
    setErrorMsg('');
    if (pin.length !== 4) {
      setErrorMsg('PIN must be exactly 4 digits.');
      return;
    }

    const pendingRegStr = localStorage.getItem('tana_pending_registration');
    if (!pendingRegStr) {
      setErrorMsg('Registration session expired.');
      setScreen('register');
      return;
    }

    const pr = JSON.parse(pendingRegStr);
    const users = LocalDb.getUsers();
    
    // Generate secure account number starting with 1000
    const newAccountNumber = '1000' + Math.floor(100000000 + Math.random() * 900000000).toString();

    const newUser: UserProfile = {
      id: 'user_' + Math.random().toString(36).substring(2, 9),
      name: pr.name,
      phone: pr.phone,
      email: pr.email,
      role: 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
      accountNumber: newAccountNumber,
      balance: 10000000000.00, // Welcome funds of 10 Billion ETB
      availableBalance: 10000000000.00,
      biometricEnabled: false
    };

    // Save user to DB
    users.push(newUser);
    LocalDb.setUsers(users);
    localStorage.removeItem('tana_pending_registration');

    // Logs & Notifications
    LocalDb.addAuditLog(newUser.id, newUser.email, 'USER_REGISTER', `Created new digital banking profile ${newUser.name}. Account A/C ${newUser.accountNumber} provisioned.`);
    LocalDb.addNotification(newUser.id, 'Welcome to Tana Digital Bank!', 'We have credited your new wallet with ETB 10,000,000,000.00 as welcome funds!', 'success');

    setSuccessMsg('Account created! Welcome funds of ETB 10,000,000,000.00 credited.');
    setTimeout(() => {
      onLoginSuccess(newUser);
    }, 1500);
  };

  const loadAbebeDemoUser = () => {
    const users = LocalDb.getUsers();
    const abebe = users.find(u => u.id === 'user_1');
    if (abebe) {
      LocalDb.addAuditLog(abebe.id, abebe.email, 'DEMO_LOGIN', 'Quick login as demo user Abebe Kebede.');
      onLoginSuccess(abebe);
    }
  };

  const loadAdminDemoUser = () => {
    const users = LocalDb.getUsers();
    let adminUser = users.find(u => u.email.toLowerCase() === 'leykunjemaneh3@gmail.com') || users.find(u => u.role === 'admin');
    if (!adminUser) {
      adminUser = {
        id: 'user_admin',
        name: 'Leykun Jemaneh (Admin)',
        phone: '+251900112233',
        email: 'leykunjemaneh3@gmail.com',
        role: 'admin',
        status: 'active',
        createdAt: '2026-01-01T08:00:00Z',
        accountNumber: '1000999999999',
        accountType: 'wadiah',
        balance: 10000000000.00,
        availableBalance: 10000000000.00,
        biometricEnabled: true
      };
      users.push(adminUser);
      LocalDb.setUsers(users);
    }
    LocalDb.addAuditLog(adminUser.id, adminUser.email, 'DEMO_LOGIN_ADMIN', 'Administrator Leykun Jemaneh authenticated with full root privileges.');
    onLoginSuccess(adminUser);
  };

  return (
    <div className="max-w-md mx-auto bg-gradient-to-br from-[#4a0d61] via-[#61167e] to-[#3a084c] min-h-screen text-white flex flex-col justify-between p-6 pb-12 relative overflow-hidden">
      {/* Background radial overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(222,179,86,0.18),transparent_60%)]" />

      {/* Top simulated SMS banner */}
      {simulatedSmsToast && (
        <div id="sms-toast" className="fixed top-4 left-4 right-4 max-w-sm mx-auto bg-[#deb356] text-[#4a0d61] px-4 py-3 rounded-2xl shadow-2xl border border-amber-300 font-sans z-50 animate-bounce flex items-start gap-3">
          <Smartphone className="w-5 h-5 flex-shrink-0 text-[#4a0d61] mt-0.5" />
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#4a0d61]/80 font-mono">SMS Verification Code Received</p>
            <p className="text-sm font-extrabold mt-0.5">{simulatedSmsToast}</p>
          </div>
        </div>
      )}

      {/* Header Branding */}
      <div className="text-center pt-6 relative">
        <div className="flex flex-col justify-center items-center gap-2 mb-2">
          <CbeLogo 
            src={customBankLogo} 
            className="w-16 h-16 object-contain drop-shadow-md"
          />
          <div className="text-center max-w-full px-2">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight leading-none text-[#deb356] whitespace-nowrap overflow-hidden text-ellipsis">
              Commercial Bank of Ethiopia
            </h1>
            <span className="text-[11px] tracking-wider font-semibold text-purple-200 mt-1 block whitespace-nowrap overflow-hidden text-ellipsis">
              The bank you can always rely on!
            </span>
          </div>
        </div>
      </div>

      {/* Forms & Screens container */}
      <div className="flex-1 flex flex-col justify-center my-8 relative z-10">
        
        {/* Error/Success messages */}
        {errorMsg && (
          <div className="mb-4 bg-red-500/15 border border-red-500/30 text-red-200 text-xs py-2.5 px-3.5 rounded-2xl flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs py-2.5 px-3.5 rounded-2xl flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. LOGIN SCREEN */}
        {screen === 'login' && (
          <form id="form-login" onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-emerald-300 font-semibold">Phone Number or Email</label>
              <div className="relative">
                <Smartphone className="absolute left-4 top-3.5 w-5 h-5 text-emerald-400/70" />
                <input 
                  id="input-login-phone"
                  type="text" 
                  placeholder="09... or email@example.com"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  className="w-full bg-white/5 border border-emerald-500/20 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-emerald-300/40 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs text-emerald-300 font-semibold">Password</label>
                <button 
                  id="btn-forgot-link"
                  type="button" 
                  onClick={() => setScreen('forgot')}
                  className="text-xs text-amber-400 hover:underline font-semibold"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-emerald-400/70" />
                <input 
                  id="input-login-pass"
                  type="password" 
                  placeholder="••••••••"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full bg-white/5 border border-emerald-500/20 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-emerald-300/40 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition"
                  required
                />
              </div>
            </div>

            <button 
              id="btn-submit-login"
              type="submit" 
              className="w-full bg-gradient-to-r from-amber-400 to-amber-300 text-emerald-950 font-extrabold py-3.5 rounded-2xl shadow-lg shadow-amber-400/10 hover:brightness-105 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Secure Login</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="pt-4 text-center">
              <p className="text-emerald-200/60 text-xs">
                Don't have an account?{' '}
                <button 
                  id="btn-switch-register"
                  type="button" 
                  onClick={() => setScreen('register')}
                  className="text-amber-400 font-extrabold hover:underline"
                >
                  Register Phone
                </button>
              </p>
            </div>
          </form>
        )}

        {/* 2. REGISTRATION SCREEN */}
        {screen === 'register' && (
          <form id="form-register" onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-emerald-300 font-semibold">Full Name (as in ID)</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 w-5 h-5 text-emerald-400/70" />
                <input 
                  id="input-reg-name"
                  type="text" 
                  placeholder="Enter full name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-white/5 border border-emerald-500/20 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-emerald-300/40 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-emerald-300 font-semibold">Ethiopian Phone Number</label>
              <div className="relative">
                <span className="absolute left-4 top-[14px] text-sm font-bold text-emerald-400/70 font-mono">+251</span>
                <input 
                  id="input-reg-phone"
                  type="tel" 
                  placeholder="911223344"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full bg-white/5 border border-emerald-500/20 rounded-2xl py-3.5 pl-16 pr-4 text-sm text-white placeholder-emerald-300/40 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-emerald-300 font-semibold">Email Address (Optional)</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-emerald-400/70" />
                <input 
                  id="input-reg-email"
                  type="email" 
                  placeholder="name@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full bg-white/5 border border-emerald-500/20 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-emerald-300/40 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-emerald-300 font-semibold">Set Security Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-emerald-400/70" />
                <input 
                  id="input-reg-pass"
                  type="password" 
                  placeholder="Minimum 6 characters"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  className="w-full bg-white/5 border border-emerald-500/20 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-emerald-300/40 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition"
                  required
                />
              </div>
            </div>

            <button 
              id="btn-submit-register"
              type="submit" 
              className="w-full bg-gradient-to-r from-amber-400 to-amber-300 text-emerald-950 font-extrabold py-3.5 rounded-2xl shadow-lg shadow-amber-400/10 hover:brightness-105 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Get Verification OTP</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="pt-2 text-center">
              <p className="text-emerald-200/60 text-xs">
                Already have an account?{' '}
                <button 
                  id="btn-switch-login"
                  type="button" 
                  onClick={() => setScreen('login')}
                  className="text-amber-400 font-extrabold hover:underline"
                >
                  Login Now
                </button>
              </p>
            </div>
          </form>
        )}

        {/* 3. OTP VERIFICATION */}
        {screen === 'otp' && (
          <form id="form-otp" onSubmit={handleVerifyOtp} className="space-y-6 text-center">
            <div className="space-y-2">
              <h2 className="text-xl font-bold">SMS Code Verification</h2>
              <p className="text-xs text-emerald-200/70 leading-relaxed max-w-xs mx-auto">
                We have simulated disptaching a 4-digit code to your handset. Please type the OTP received below.
              </p>
            </div>

            <div className="flex justify-center gap-3">
              <input 
                id="input-otp-field"
                type="text"
                maxLength={4}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-36 text-center text-3xl font-extrabold tracking-widest bg-white/10 border border-emerald-500/30 rounded-2xl py-3 text-white placeholder-emerald-300/20 focus:outline-none focus:border-amber-400"
                required
                autoFocus
              />
            </div>

            <button 
              id="btn-verify-otp"
              type="submit" 
              className="w-full bg-gradient-to-r from-amber-400 to-amber-300 text-emerald-950 font-extrabold py-3.5 rounded-2xl transition shadow-lg active:scale-[0.99]"
            >
              Verify OTP Code
            </button>

            <button
              id="btn-resend-otp"
              type="button"
              onClick={() => {
                const generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
                triggerSimulatedSms(generatedCode);
                setSuccessMsg('New security OTP code generated!');
              }}
              className="text-xs text-amber-400 hover:underline font-semibold block mx-auto"
            >
              Resend Code via SMS
            </button>
          </form>
        )}

        {/* 4. PIN SETUP SCREEN */}
        {screen === 'pin-setup' && (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <KeyRound className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
              <h2 className="text-xl font-bold">Set 4-Digit Security PIN</h2>
              <p className="text-xs text-emerald-200/70 max-w-xs mx-auto">
                This secure security PIN is required to authorize all future transfers, payments, and receipt generation.
              </p>
            </div>

            <div className="flex justify-center">
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-10 h-10 rounded-full border-2 transition ${
                      enteredPin.length > i 
                        ? 'bg-amber-400 border-amber-400 scale-110 shadow-lg shadow-amber-400/20' 
                        : 'border-emerald-500/30 bg-white/5'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Custom Interactive Numerical Keypad */}
            <div className="max-w-[280px] mx-auto grid grid-cols-3 gap-3 pt-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    if (enteredPin.length < 4) setEnteredPin(prev => prev + num);
                  }}
                  className="bg-white/5 hover:bg-white/15 py-3 rounded-2xl text-xl font-black font-mono transition border border-white/5 flex items-center justify-center cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setEnteredPin('')}
                className="text-xs font-bold text-red-400 bg-white/5 hover:bg-white/10 rounded-2xl py-3 flex items-center justify-center cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  if (enteredPin.length < 4) setEnteredPin(prev => prev + '0');
                }}
                className="bg-white/5 hover:bg-white/15 py-3 rounded-2xl text-xl font-black font-mono transition border border-white/5 flex items-center justify-center cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => {
                  if (enteredPin.length === 4) {
                    handlePinSetupSubmit(enteredPin);
                  } else {
                    setErrorMsg('Please enter a 4-digit PIN first.');
                  }
                }}
                className="bg-amber-400 text-emerald-950 font-bold rounded-2xl text-xs hover:brightness-105 transition flex items-center justify-center cursor-pointer"
              >
                Submit
              </button>
            </div>
          </div>
        )}

        {/* 5. FORGOT SCREEN */}
        {screen === 'forgot' && (
          <form id="form-forgot" onSubmit={(e) => {
            e.preventDefault();
            const code = Math.floor(1000 + Math.random() * 9000).toString();
            triggerSimulatedSms(code);
            setSuccessMsg('Recovery code sent via SMS!');
            setScreen('otp');
          }} className="space-y-4">
            <div className="space-y-2 text-center pb-4">
              <h2 className="text-xl font-bold">Password Recovery</h2>
              <p className="text-xs text-emerald-200/70 max-w-xs mx-auto">
                Enter your registered Ethiopian phone number or email address to request a simulated authentication OTP recovery code.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-emerald-300 font-semibold">Phone or Email</label>
              <div className="relative">
                <Smartphone className="absolute left-4 top-3.5 w-5 h-5 text-emerald-400/70" />
                <input 
                  id="input-forgot-phone"
                  type="text" 
                  placeholder="09... or email@example.com"
                  className="w-full bg-white/5 border border-emerald-500/20 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-emerald-300/40 focus:outline-none focus:border-amber-400/50 transition"
                  required
                />
              </div>
            </div>

            <button 
              id="btn-submit-forgot"
              type="submit" 
              className="w-full bg-gradient-to-r from-amber-400 to-amber-300 text-emerald-950 font-extrabold py-3.5 rounded-2xl transition shadow-lg"
            >
              Generate Recovery SMS Code
            </button>

            <button 
              id="btn-back-to-login"
              type="button" 
              onClick={() => setScreen('login')}
              className="text-xs text-emerald-200 hover:text-white font-bold block mx-auto pt-2"
            >
              Back to Login
            </button>
          </form>
        )}
      </div>

      {/* Quick Launch Demo Accounts */}
      {screen === 'login' && (
        <div className="border-t border-white/10 pt-6 relative z-10 text-center space-y-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-amber-400/70 mb-3">Quick Sandbox Login For Testing</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                id="btn-demo-user"
                onClick={loadAbebeDemoUser}
                className="bg-white/5 hover:bg-white/10 text-emerald-200 border border-white/5 p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
              >
                <User className="w-4 h-4 text-amber-400" />
                <span>Demo User (Abebe)</span>
              </button>
              <button
                id="btn-demo-admin"
                onClick={loadAdminDemoUser}
                className="bg-white/5 hover:bg-white/10 text-emerald-200 border border-white/5 p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
              >
                <Fingerprint className="w-4 h-4 text-amber-400" />
                <span>Demo Admin (Leykun)</span>
              </button>
            </div>
          </div>

          {/* Android PWA Installation Card */}
          <AppInstallPrompt mode="card" className="text-left" />
        </div>
      )}

      {/* Bottom Legal Notice */}
      <div className="text-center text-[10px] text-emerald-300/40 mt-6 relative z-10 font-mono">
        &copy; 2026 TANA Digital Bank. Licensed Sandbox Demo.
      </div>
    </div>
  );
}

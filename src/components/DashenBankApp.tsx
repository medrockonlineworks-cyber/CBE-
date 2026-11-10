import React, { useState, useEffect, useMemo } from 'react';
import {
  Send,
  PhoneCall,
  Building2,
  Wallet,
  CreditCard,
  Smartphone,
  Receipt,
  MoreHorizontal,
  RefreshCw,
  Bell,
  Paintbrush,
  Eye,
  EyeOff,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  QrCode,
  Home,
  LayoutGrid,
  ShoppingBag,
  FileText,
  User,
  ArrowUpRight,
  Calendar,
  Landmark,
  ArrowLeft,
  Search,
  CheckCircle2,
  X,
  Plus,
  Shield,
  Clock,
  ExternalLink,
  ChevronDown,
  Sparkles,
  RotateCcw,
  Upload
} from 'lucide-react';
import PhoneSettingsModal from './PhoneSettingsModal';
import { PhoneSettingsService } from '../services/phoneSettingsService';
import { DashenBankService, DashenAccount, DashenTransaction, DashenRegisteredAccount } from '../services/dashenBankService';
import { 
  DashenMountainBackdrop, 
  DashenLogo, 
  DashenLogoModal, 
  DashenThemeFab,
  DASHEN_PRESET_LOGOS, 
  OFFICIAL_DASHEN_LOGO_SVG 
} from './DashenBrandAssets';
import {
  DashenPaperPlaneIcon,
  DashenPhoneTransferIcon,
  DashenOtherBanksBirdIcon,
  DashenWalletsIcon,
  DashenMyCardsIcon,
  DashenMobileTopUpIcon,
  DashenUtilityPaymentsIcon,
  DashenSeeMoreIcon
} from './DashenGridIcons';
import { compressImageFile } from '../lib/imageUtils';
import { LocalDb } from '../lib/mockData';
import { UserProfile } from '../types';

interface DashenBankAppProps {
  currentUser?: UserProfile | null;
  onBack: () => void;
  onOpenTelebirr?: () => void;
}

type DashenMainTab = 'home' | 'apps' | 'ecommerce' | 'transactions' | 'profile';
type DashenSubScreen = 'none' | 'send_dashen' | 'send_phone' | 'send_other_banks' | 'send_wallets' | 'my_cards' | 'mobile_topup' | 'utility_payments' | 'see_more';

export default function DashenBankApp({ currentUser, onBack, onOpenTelebirr }: DashenBankAppProps) {
  // State
  const [account, setAccount] = useState<DashenAccount>(() => DashenBankService.getAccount());
  const [transactions, setTransactions] = useState<DashenTransaction[]>(() => DashenBankService.getTransactions());
  const [registeredAccounts, setRegisteredAccounts] = useState<DashenRegisteredAccount[]>(() => DashenBankService.getRegisteredAccounts());
  const [notifications, setNotifications] = useState(() => DashenBankService.getNotifications());
  
  // Navigation
  const [currentTab, setCurrentTab] = useState<DashenMainTab>('home');
  const [subScreen, setSubScreen] = useState<DashenSubScreen>('none');
  
  // Transactions tab segment
  const [txChannelTab, setTxChannelTab] = useState<'super_app' | 'all_channels'>('all_channels');
  
  // Modals & UI States
  const [showBalance, setShowBalance] = useState(true);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showPhoneSettings, setShowPhoneSettings] = useState(false);
  const [selectedTxDetail, setSelectedTxDetail] = useState<DashenTransaction | null>(null);
  const [themeAccent, setThemeAccent] = useState<'dashen_blue' | 'royal_navy' | 'midnight_purple' | 'slate_emerald'>('dashen_blue');
  const [customLogo, setCustomLogo] = useState<string | null>(() => DashenBankService.getCustomLogo());
  const [customBgImage, setCustomBgImage] = useState<string | null>(() => DashenBankService.getCustomBgImage());
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [isIPhone, setIsIPhone] = useState<boolean>(() => PhoneSettingsService.isIPhoneMode());

  useEffect(() => {
    return PhoneSettingsService.subscribe(() => {
      setIsIPhone(PhoneSettingsService.isIPhoneMode());
    });
  }, []);

  // Form states for "Send To Dashen Account"
  const [targetAccountInput, setTargetAccountInput] = useState('');
  const [resolvedRecipientName, setResolvedRecipientName] = useState('');
  const [sendAmountInput, setSendAmountInput] = useState('');
  const [sendRemarkInput, setSendRemarkInput] = useState('');
  const [sendStep, setSendStep] = useState<'input_acc' | 'amount_details' | 'pin_confirm' | 'success'>('input_acc');
  const [pinCode, setPinCode] = useState('');
  const [sendError, setSendError] = useState('');
  const [lastCompletedTx, setLastCompletedTx] = useState<DashenTransaction | null>(null);

  // Form states for "Transfer To Other Banks" (e.g. to CBE)
  const [otherBankSelected, setOtherBankSelected] = useState('Commercial Bank of Ethiopia (CBE)');
  const [otherBankAccInput, setOtherBankAccInput] = useState('1000419524747');
  const [otherBankRecipientName, setOtherBankRecipientName] = useState('Leykun Jemaneh Ylma');
  const [otherBankAmountInput, setOtherBankAmountInput] = useState('');
  const [otherBankRemark, setOtherBankRemark] = useState('');

  // Form states for Mobile Top-up & Wallets
  const [topupPhone, setTopupPhone] = useState('0900112233');
  const [topupAmount, setTopupAmount] = useState('50');
  const [walletPhone, setWalletPhone] = useState('0900112233');
  const [walletAmount, setWalletAmount] = useState('500');

  // Listen for real-time updates dispatched across the entire system
  useEffect(() => {
    const handleUpdate = () => {
      setAccount(DashenBankService.getAccount());
      setTransactions(DashenBankService.getTransactions());
      setRegisteredAccounts(DashenBankService.getRegisteredAccounts());
      setNotifications(DashenBankService.getNotifications());
      setCustomLogo(DashenBankService.getCustomLogo());
      setCustomBgImage(DashenBankService.getCustomBgImage());
    };

    window.addEventListener('tana_dashen_updated', handleUpdate);
    return () => window.removeEventListener('tana_dashen_updated', handleUpdate);
  }, []);

  // Quick refresh action
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setAccount(DashenBankService.getAccount());
      setTransactions(DashenBankService.getTransactions());
      setRegisteredAccounts(DashenBankService.getRegisteredAccounts());
      setIsRefreshing(false);
      setCopyToast('Account balance refreshed');
      setTimeout(() => setCopyToast(null), 2000);
    }, 450);
  };

  const handleCopyAccount = () => {
    try {
      navigator.clipboard.writeText(account.accountNumber);
    } catch {}
    setCopyToast('Account number copied!');
    setTimeout(() => setCopyToast(null), 2000);
  };

  // Resolve recipient account name when typing or selecting
  const handleAccountInputChange = (val: string) => {
    setTargetAccountInput(val);
    setSendError('');

    const clean = val.replace(/\D/g, '');
    if (clean === '5502877108011') {
      setResolvedRecipientName('Leykun Jemaneh Yilma (Self)');
    } else {
      // Check registered accounts
      const match = registeredAccounts.find(a => a.accountNumber === clean);
      if (match) {
        setResolvedRecipientName(match.accountName);
      } else if (clean.length >= 10) {
        // Realistic Ethiopian recipient resolution
        setResolvedRecipientName('Abel Tesfaye Wolde');
      } else {
        setResolvedRecipientName('');
      }
    }
  };

  // Proceed to amount & details step
  const handleContinueSend = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = targetAccountInput.replace(/\D/g, '');
    if (clean.length < 8) {
      setSendError('Please enter a valid Dashen account number (at least 8 digits).');
      return;
    }
    setSendStep('amount_details');
  };

  // Execute transfer
  const handleExecuteSend = () => {
    const num = parseFloat(sendAmountInput);
    if (isNaN(num) || num <= 0) {
      setSendError('Please enter a valid transfer amount.');
      return;
    }
    if (num > account.balance) {
      setSendError(`Insufficient Dashen balance. Available: ETB ${account.balance.toFixed(2)}`);
      return;
    }

    const result = DashenBankService.transferToAccount({
      recipientAccount: targetAccountInput,
      recipientName: resolvedRecipientName || 'Dashen Recipient',
      amount: num,
      remark: sendRemarkInput || 'Transfer via Dashen Super App',
      recipientBank: 'Dashen Bank'
    });

    if (result.success && result.tx) {
      setLastCompletedTx(result.tx);
      setSendStep('success');
      setAccount(DashenBankService.getAccount());
      setTransactions(DashenBankService.getTransactions());
    } else {
      setSendError(result.error || 'Transfer failed.');
    }
  };

  // Execute inter-bank transfer to CBE or other bank
  const handleExecuteOtherBankTransfer = () => {
    const num = parseFloat(otherBankAmountInput);
    if (isNaN(num) || num <= 0) {
      setSendError('Please enter a valid transfer amount.');
      return;
    }
    if (num > account.balance) {
      setSendError(`Insufficient balance. Available: ETB ${account.balance.toFixed(2)}`);
      return;
    }

    // 1. Deduct in Dashen Bank
    const result = DashenBankService.transferToAccount({
      recipientAccount: otherBankAccInput,
      recipientName: otherBankRecipientName || 'CBE Recipient',
      amount: num,
      remark: otherBankRemark || 'Inter-Bank Transfer to CBE',
      recipientBank: otherBankSelected
    });

    if (result.success && result.tx) {
      // 2. Inter-system sync: If sending to Commercial Bank of Ethiopia (CBE), credit CBE account!
      try {
        if (otherBankSelected.includes('Commercial Bank') || otherBankSelected.includes('CBE')) {
          const cleanAcc = otherBankAccInput.replace(/\D/g, '');
          const allAccounts = LocalDb.getAllAccounts();
          const targetCbeAcc = allAccounts.find(a => a.accountNumber === cleanAcc || a.accountNumber === '1000419524747');
          if (targetCbeAcc) {
            targetCbeAcc.balance = Number((targetCbeAcc.balance + num).toFixed(2));
            targetCbeAcc.availableBalance = targetCbeAcc.balance;
            LocalDb.setAccounts(allAccounts);

            // Also register Dashen account in CBE directory!
            LocalDb.registerNewAccount({
              accountNumber: account.accountNumber,
              accountName: account.accountName,
              bankName: 'Dashen Bank',
              phone: '+251900112233',
              isVerified: true,
              accountType: 'Dashen Savings Account'
            });
          }
        }
      } catch (err) {
        console.error('Failed to sync to CBE account:', err);
      }

      setLastCompletedTx(result.tx);
      setSendStep('success');
      setAccount(DashenBankService.getAccount());
      setTransactions(DashenBankService.getTransactions());
    } else {
      setSendError(result.error || 'Inter-bank transfer failed.');
    }
  };

  // Filtered transactions for the Transactions tab
  const displayedTransactions = useMemo(() => {
    if (txChannelTab === 'super_app') {
      return transactions.filter(t => t.channel === 'super_app');
    }
    return transactions; // all channels
  }, [transactions, txChannelTab]);

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  return (
    <div 
      className="relative w-full h-full flex flex-col overflow-hidden select-none font-sans text-white bg-[#040b18]"
    >
      {/* Authentic Mount Dashen Background matching Screenshot 123028 (with optional custom image overlay) */}
      <DashenMountainBackdrop customBgImage={customBgImage} />

      {/* Floating Toast Notification */}
      {copyToast && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-[#172544] text-white border border-[#2b3e6c] px-4 py-1.5 rounded-full shadow-2xl text-xs font-medium animate-in fade-in slide-in-from-top-2 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{copyToast}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-SCREEN: SEND TO DASHEN ACCOUNT (Screenshot_20260909-123050.png) */}
      {/* =================================================================== */}
      {subScreen === 'send_dashen' ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden animate-in slide-in-from-right-4 duration-200">
          {/* Header matching Screenshot 123050 */}
          <div className="w-full px-4 pt-[max(env(safe-area-inset-top,0px),12px)] pb-3 flex items-center gap-3 shrink-0">
            <button 
              onClick={() => {
                if (sendStep !== 'input_acc') {
                  setSendStep('input_acc');
                } else {
                  setSubScreen('none');
                }
              }}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-white transition"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-[17px] font-semibold text-white tracking-tight">
              Send To Dashen Account
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col justify-between scrollbar-none">
            {sendStep === 'input_acc' && (
              <form onSubmit={handleContinueSend} className="space-y-6">
                <div>
                  <h2 className="text-[26px] font-bold text-white tracking-tight leading-tight">
                    Enter Account Number
                  </h2>
                  <p className="text-[14px] text-neutral-400 mt-1">
                    Enter recipient bank account number.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-neutral-300">
                    Account Number
                  </label>
                  
                  {/* Account Number Input matching Screenshot 123050 */}
                  <div className="relative flex items-center bg-[#131c2e] border border-[#202d45] rounded-2xl px-4 py-3.5 focus-within:border-[#2b6cb0] focus-within:ring-1 focus-within:ring-[#2b6cb0] transition">
                    <input 
                      type="text"
                      value={targetAccountInput}
                      onChange={(e) => handleAccountInputChange(e.target.value)}
                      placeholder="Enter account number"
                      className="w-full bg-transparent text-white placeholder-neutral-500 text-[16px] outline-none tracking-wide"
                      autoFocus
                    />
                    <button 
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="p-1 text-neutral-400 hover:text-white transition active:scale-95"
                      title="Scan QR Code"
                    >
                      <QrCode className="w-5 h-5 text-neutral-300" />
                    </button>
                  </div>

                  {/* Auto-resolved recipient name badge */}
                  {resolvedRecipientName && (
                    <div className="mt-2 p-2.5 bg-[#12243d] border border-[#21436f] rounded-xl flex items-center justify-between text-xs animate-in fade-in">
                      <span className="text-neutral-400">Recipient Name:</span>
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {resolvedRecipientName}
                      </span>
                    </div>
                  )}

                  {sendError && (
                    <p className="text-xs text-rose-400 mt-1 font-medium">{sendError}</p>
                  )}
                </div>

                {/* Quick Registered Accounts known in Dashen */}
                <div className="pt-2">
                  <p className="text-[12px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                    Registered & Recent Accounts
                  </p>
                  <div className="space-y-2">
                    {registeredAccounts.slice(0, 3).map((accItem) => (
                      <button 
                        key={accItem.accountNumber}
                        type="button"
                        onClick={() => handleAccountInputChange(accItem.accountNumber)}
                        className="w-full p-3 bg-[#111a2c] hover:bg-[#18253d] border border-[#1d2b45] rounded-2xl flex items-center justify-between transition text-left active:scale-98"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#1b2b48] border border-[#29426f] flex items-center justify-center font-bold text-xs text-blue-300">
                            {accItem.accountName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-white">{accItem.accountName}</p>
                            <p className="text-[11px] text-neutral-400 font-mono">{accItem.accountNumber} • {accItem.bankName}</p>
                          </div>
                        </div>
                        <span className="text-[11px] text-blue-400 font-semibold">Select</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-8">
                  <button 
                    type="submit"
                    className="w-full py-4 bg-[#1a2b48] hover:bg-[#223961] active:bg-[#284373] text-white font-semibold text-[16px] rounded-full transition shadow-lg active:scale-98"
                  >
                    Continue
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Amount & Remarks */}
            {sendStep === 'amount_details' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-[24px] font-bold text-white tracking-tight">
                    Enter Amount
                  </h2>
                  <p className="text-sm text-neutral-400 mt-0.5">
                    Sending to <span className="text-white font-semibold">{resolvedRecipientName || targetAccountInput}</span>
                  </p>
                </div>

                <div className="p-4 bg-[#111c30] border border-[#1e2f4e] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>From: Amana Savings</span>
                    <span>Available: ETB {account.balance.toLocaleString()}</span>
                  </div>
                  <p className="text-sm font-mono text-neutral-300">{account.accountNumber}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-neutral-300">
                    Amount (ETB)
                  </label>
                  <div className="relative bg-[#131c2e] border border-[#202d45] rounded-2xl px-4 py-3 flex items-center">
                    <span className="text-neutral-400 text-lg font-bold mr-2">ETB</span>
                    <input 
                      type="number"
                      value={sendAmountInput}
                      onChange={(e) => {
                        setSendAmountInput(e.target.value);
                        setSendError('');
                      }}
                      placeholder="0.00"
                      className="w-full bg-transparent text-white text-2xl font-bold outline-none"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Quick amount chips */}
                <div className="flex gap-2">
                  {[100, 250, 500, 1000].map((preset) => (
                    <button 
                      key={preset}
                      type="button"
                      onClick={() => setSendAmountInput(preset.toString())}
                      className="flex-1 py-1.5 rounded-xl bg-[#131e33] hover:bg-[#1a2944] border border-[#1f2f4c] text-xs font-semibold text-neutral-300 active:scale-95 transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-neutral-300">
                    Remark (Optional)
                  </label>
                  <input 
                    type="text"
                    value={sendRemarkInput}
                    onChange={(e) => setSendRemarkInput(e.target.value)}
                    placeholder="Transfer note / description"
                    className="w-full bg-[#131c2e] border border-[#202d45] rounded-2xl px-4 py-3 text-white text-sm outline-none"
                  />
                </div>

                {sendError && (
                  <p className="text-xs text-rose-400 font-medium">{sendError}</p>
                )}

                <div className="pt-6">
                  <button 
                    type="button"
                    onClick={() => {
                      if (!sendAmountInput || parseFloat(sendAmountInput) <= 0) {
                        setSendError('Please specify an amount to send.');
                        return;
                      }
                      setSendStep('pin_confirm');
                    }}
                    className="w-full py-4 bg-[#1a73e8] hover:bg-[#1864c7] text-white font-semibold text-[16px] rounded-full transition shadow-lg active:scale-98"
                  >
                    Review &amp; Transfer
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: PIN Confirmation Modal */}
            {sendStep === 'pin_confirm' && (
              <div className="space-y-5 text-center py-4">
                <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
                  <Shield className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white">Confirm Transfer</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Transferring ETB {parseFloat(sendAmountInput || '0').toFixed(2)} to {resolvedRecipientName || targetAccountInput}
                  </p>
                </div>

                <div className="p-4 bg-[#10192b] border border-[#1d2d47] rounded-2xl text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Recipient:</span>
                    <span className="font-bold text-white">{resolvedRecipientName || 'Dashen Account'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Account Number:</span>
                    <span className="font-mono text-white">{targetAccountInput}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Transfer Amount:</span>
                    <span className="font-bold text-emerald-400">ETB {parseFloat(sendAmountInput || '0').toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Service Fee:</span>
                    <span className="text-neutral-300">Free (ETB 0.00)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-neutral-400">Enter your 4-Digit Dashen PIN</label>
                  <div className="flex justify-center gap-3">
                    {[0, 1, 2, 3].map((i) => (
                      <div 
                        key={i}
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg font-bold ${
                          pinCode.length > i 
                            ? 'border-blue-400 bg-blue-500/20 text-white' 
                            : 'border-neutral-700 bg-neutral-900/60 text-neutral-500'
                        }`}
                      >
                        {pinCode.length > i ? '•' : ''}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto pt-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'].map((k) => (
                    <button 
                      key={k.toString()}
                      type="button"
                      onClick={() => {
                        if (k === 'C') setPinCode('');
                        else if (k === '⌫') setPinCode(prev => prev.slice(0, -1));
                        else if (pinCode.length < 4) setPinCode(prev => prev + k);
                      }}
                      className="h-11 rounded-xl bg-[#121c2e] hover:bg-[#1a273f] text-white font-bold text-base transition active:scale-95 border border-[#1b2a45]"
                    >
                      {k}
                    </button>
                  ))}
                </div>

                <button 
                  type="button"
                  onClick={handleExecuteSend}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base rounded-full transition shadow-lg active:scale-98 mt-3"
                >
                  Authorize &amp; Send
                </button>
              </div>
            )}

            {/* Step 4: Success Receipt */}
            {sendStep === 'success' && lastCompletedTx && (
              <div className="space-y-5 text-center py-6 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20">
                  <Check className="w-9 h-9 stroke-[2.5]" />
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-white">Transfer Successful!</h3>
                  <p className="text-xs text-neutral-400 mt-1">Transaction has been processed instantly.</p>
                </div>

                <div className="p-5 bg-[#0f1a2e] border border-[#1e2f4f] rounded-2xl space-y-3 text-left text-xs">
                  <div className="flex justify-between pb-2 border-b border-neutral-800">
                    <span className="text-neutral-400">Amount Sent</span>
                    <span className="font-bold text-base text-emerald-400">
                      - ETB {lastCompletedTx.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Recipient Name</span>
                    <span className="font-semibold text-white">{lastCompletedTx.recipientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Recipient Account</span>
                    <span className="font-mono text-neutral-300">{lastCompletedTx.recipientAccount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Transaction ID</span>
                    <span className="font-mono text-blue-400">{lastCompletedTx.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">New Dashen Balance</span>
                    <span className="font-bold text-white">ETB {account.balance.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => {
                      setSubScreen('none');
                      setCurrentTab('transactions');
                    }}
                    className="flex-1 py-3.5 bg-[#121c2e] hover:bg-[#1a273f] text-neutral-300 font-semibold rounded-full border border-neutral-700 active:scale-95 transition"
                  >
                    View Transactions
                  </button>
                  <button 
                    onClick={() => {
                      setSubScreen('none');
                      setCurrentTab('home');
                    }}
                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full active:scale-95 transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : subScreen === 'send_other_banks' ? (
        /* =================================================================== */
        /* SUB-SCREEN: TRANSFER TO OTHER BANKS (e.g. CBE, Awash, Telebirr)     */
        /* =================================================================== */
        <div className="flex-1 flex flex-col h-full overflow-hidden animate-in slide-in-from-right-4 duration-200">
          <div className="w-full px-4 pt-3 pb-3 flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setSubScreen('none')}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-white transition"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-[17px] font-semibold text-white tracking-tight">
              Transfer To Other Banks
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4 scrollbar-none">
            {sendStep === 'success' && lastCompletedTx ? (
              <div className="space-y-5 text-center py-6 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
                  <Check className="w-9 h-9 stroke-[2.5]" />
                </div>
                <h3 className="text-2xl font-bold text-white">Inter-Bank Sent!</h3>
                <p className="text-xs text-neutral-400">
                  Amount sent to {otherBankSelected}. Account registered inside Dashen Bank.
                </p>
                <div className="p-4 bg-[#111c30] rounded-2xl text-left text-xs space-y-2 border border-[#1e2f4e]">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Destination:</span>
                    <span className="font-bold text-white">{otherBankSelected}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Recipient Account:</span>
                    <span className="font-mono text-neutral-300">{otherBankAccInput}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Amount:</span>
                    <span className="font-bold text-emerald-400">ETB {parseFloat(otherBankAmountInput || '0').toFixed(2)}</span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSubScreen('none');
                    setSendStep('input_acc');
                  }}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full active:scale-95 transition"
                >
                  Back to Dashboard
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Select Destination Bank</label>
                  <select 
                    value={otherBankSelected}
                    onChange={(e) => setOtherBankSelected(e.target.value)}
                    className="w-full bg-[#121c2e] border border-[#1e2f4e] rounded-xl px-3.5 py-3 text-sm text-white outline-none"
                  >
                    <option value="Commercial Bank of Ethiopia (CBE)">Commercial Bank of Ethiopia (CBE)</option>
                    <option value="Awash International Bank">Awash International Bank</option>
                    <option value="Bank of Abyssinia">Bank of Abyssinia</option>
                    <option value="Cooperative Bank of Oromia">Cooperative Bank of Oromia</option>
                    <option value="Hibret Bank">Hibret Bank</option>
                    <option value="Telebirr">Telebirr (Ethio Telecom)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Recipient Account Number</label>
                  <input 
                    type="text"
                    value={otherBankAccInput}
                    onChange={(e) => {
                      setOtherBankAccInput(e.target.value);
                      if (e.target.value === '1000419524747') {
                        setOtherBankRecipientName('Leykun Jemaneh Ylma');
                      }
                    }}
                    placeholder="Enter CBE or other bank account"
                    className="w-full bg-[#121c2e] border border-[#1e2f4e] rounded-xl px-3.5 py-3 text-sm text-white outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Recipient Name</label>
                  <input 
                    type="text"
                    value={otherBankRecipientName}
                    onChange={(e) => setOtherBankRecipientName(e.target.value)}
                    placeholder="Account Holder Name"
                    className="w-full bg-[#121c2e] border border-[#1e2f4e] rounded-xl px-3.5 py-3 text-sm text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Amount (ETB)</label>
                  <input 
                    type="number"
                    value={otherBankAmountInput}
                    onChange={(e) => setOtherBankAmountInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#121c2e] border border-[#1e2f4e] rounded-xl px-3.5 py-3 text-lg font-bold text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Remark</label>
                  <input 
                    type="text"
                    value={otherBankRemark}
                    onChange={(e) => setOtherBankRemark(e.target.value)}
                    placeholder="Transfer note / purpose"
                    className="w-full bg-[#121c2e] border border-[#1e2f4e] rounded-xl px-3.5 py-3 text-sm text-white outline-none"
                  />
                </div>

                {sendError && (
                  <p className="text-xs text-rose-400 font-medium">{sendError}</p>
                )}

                <div className="pt-4">
                  <button 
                    onClick={handleExecuteOtherBankTransfer}
                    className="w-full py-4 bg-[#1a73e8] hover:bg-[#1864c7] text-white font-semibold text-[16px] rounded-full transition shadow-lg active:scale-98"
                  >
                    Transfer To {otherBankSelected.split(' ')[0]}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* =================================================================== */
        /* MAIN 5 TABS: Home | Apps | E-Comm | Transactions | Profile           */
        /* =================================================================== */
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* TAB 1: HOME DASHBOARD (Exact match for Screenshot_20260909-123028.png) */}
          {currentTab === 'home' && (
            <div className="flex-1 overflow-y-auto px-4 pb-20 scrollbar-none space-y-4 pt-[max(env(safe-area-inset-top,0px),8px)]">
              
              {/* Top Header Row matching Screenshot 123028 */}
              <div className="flex items-center justify-between pt-1 pb-1">
                {/* Dashen Bank Logo Box & Hello Leykun */}
                <div className="flex items-center gap-2">
                  <DashenLogo 
                    src={customLogo} 
                    onClick={() => setShowLogoModal(true)} 
                    className="w-10 h-10 cursor-pointer shrink-0" 
                  />

                  <div>
                    <h2 className="text-[15px] font-bold text-white tracking-tight leading-tight">
                      Hello {account.accountName.split(' ')[0]}
                    </h2>
                    <p className="text-[12px] text-neutral-300 font-normal">
                      Welcome Back!
                    </p>
                  </div>
                </div>

                {/* Right Actions: Refresh | Bell */}
                <div className="flex items-center gap-2">
                  {/* Refresh Button */}
                  <button 
                    onClick={handleRefresh}
                    className="w-9 h-9 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-white transition cursor-pointer"
                    title="Refresh Balance"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>

                  {/* Notifications Bell with Red Badge "2" */}
                  <button 
                    onClick={() => setShowNotificationsModal(true)}
                    className="relative w-9 h-9 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-white transition cursor-pointer"
                    title="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadNotifsCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#f44336] text-white text-[9.5px] font-bold flex items-center justify-center border border-black shadow-xs">
                        {unreadNotifsCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Balance & Account Card matching Screenshot 123028 */}
              <div className="relative text-center pt-2 pb-1 space-y-1">
                {/* Floating Paintbrush Theme / Wallpaper Customizer FAB matching Screenshot 123028 & 125235 */}
                <div className="absolute right-0 top-0 z-10">
                  <DashenThemeFab onClick={() => setShowLogoModal(true)} />
                </div>

                <p className="text-[15px] font-semibold text-neutral-200">
                  {account.accountName}
                </p>

                {/* Balance & Eye toggle matching Screenshot_20260911-174046.png and 174056.png */}
                <div className="flex items-center justify-center gap-2">
                  <span className={`font-extrabold text-white tracking-tight ${
                    showBalance ? 'text-[32px]' : 'text-[28px] tracking-[0.14em]'
                  }`}>
                    {showBalance ? `${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB` : '************'}
                  </span>
                  <button 
                    onClick={() => setShowBalance(!showBalance)}
                    className="text-neutral-300 hover:text-white p-1 transition cursor-pointer"
                    title="Toggle Balance Visibility"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>

                {/* Account Number with Copy button (Masked with 10 asterisks when hidden) */}
                <div className="flex items-center justify-center gap-1.5 text-[13.5px] text-neutral-300 font-mono">
                  <span className={showBalance ? '' : 'tracking-[0.18em]'}>
                    {showBalance ? account.accountNumber : '**********'}
                  </span>
                  <button 
                    onClick={handleCopyAccount}
                    className="text-neutral-400 hover:text-white transition active:scale-90 cursor-pointer"
                    title="Copy Account Number"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* "Accounts >" Pill Button matching Screenshot 151718 */}
                <div className="pt-1 flex justify-center">
                  <button 
                    onClick={() => setShowAccountsModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/[0.10] hover:bg-white/[0.16] border border-white/20 backdrop-blur-md text-xs font-semibold text-white active:scale-95 transition shadow-sm cursor-pointer"
                  >
                    <span>Accounts</span>
                    <ChevronRight className="w-3.5 h-3.5 text-white/80" />
                  </button>
                </div>
              </div>

              {/* 2x4 Quick Actions Grid matching Screenshot 151718 */}
              {/* Fully transparent glass buttons with authentic white vector icons */}
              <div className="grid grid-cols-4 gap-2.5 pt-1">
                {/* 1. Transfer To Dashen */}
                <button 
                  onClick={() => {
                    setSendStep('input_acc');
                    setSubScreen('send_dashen');
                  }}
                  className="p-2 min-h-[86px] rounded-[22px] bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 border border-white/[0.18] backdrop-blur-md flex flex-col items-center justify-between text-center transition shadow-lg cursor-pointer group"
                  title="Transfer To Dashen"
                >
                  <div className="pt-1.5 flex items-center justify-center">
                    <DashenPaperPlaneIcon className="w-7 h-7 text-white drop-shadow-xs group-hover:scale-105 transition" />
                  </div>
                  <span className="text-[11px] font-semibold text-white leading-[1.2] pb-0.5">
                    Transfer To<br />Dashen
                  </span>
                </button>

                {/* 2. Transfer by Phone */}
                <button 
                  onClick={() => {
                    setSubScreen('send_dashen');
                  }}
                  className="p-2 min-h-[86px] rounded-[22px] bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 border border-white/[0.18] backdrop-blur-md flex flex-col items-center justify-between text-center transition shadow-lg cursor-pointer group"
                  title="Transfer by Phone"
                >
                  <div className="pt-1.5 flex items-center justify-center">
                    <DashenPhoneTransferIcon className="w-7 h-7 text-white drop-shadow-xs group-hover:scale-105 transition" />
                  </div>
                  <span className="text-[11px] font-semibold text-white leading-[1.2] pb-0.5">
                    Transfer<br />by Pho...
                  </span>
                </button>

                {/* 3. Transfer To Other Banks (Authentic Ethiopian Interbank Dove/Bird) */}
                <button 
                  onClick={() => {
                    setSendStep('input_acc');
                    setSubScreen('send_other_banks');
                  }}
                  className="p-2 min-h-[86px] rounded-[22px] bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 border border-white/[0.18] backdrop-blur-md flex flex-col items-center justify-between text-center transition shadow-lg cursor-pointer group"
                  title="Transfer To Other Banks"
                >
                  <div className="pt-1.5 flex items-center justify-center">
                    <DashenOtherBanksBirdIcon className="w-7 h-7 text-white drop-shadow-xs group-hover:scale-105 transition" />
                  </div>
                  <span className="text-[11px] font-semibold text-white leading-[1.2] pb-0.5">
                    Transfer To<br />Other Banks
                  </span>
                </button>

                {/* 4. Transfer To Wallets */}
                <button 
                  onClick={() => {
                    setSubScreen('send_other_banks');
                  }}
                  className="p-2 min-h-[86px] rounded-[22px] bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 border border-white/[0.18] backdrop-blur-md flex flex-col items-center justify-between text-center transition shadow-lg cursor-pointer group"
                  title="Transfer To Wallets"
                >
                  <div className="pt-1.5 flex items-center justify-center">
                    <DashenWalletsIcon className="w-7 h-7 text-white drop-shadow-xs group-hover:scale-105 transition" />
                  </div>
                  <span className="text-[11px] font-semibold text-white leading-[1.2] pb-0.5">
                    Transfer To<br />Wallets
                  </span>
                </button>

                {/* 5. My Cards */}
                <button 
                  onClick={() => {
                    setCopyToast('Dashen Branded Visa & Mastercard: Active');
                    setTimeout(() => setCopyToast(null), 2000);
                  }}
                  className="p-2 min-h-[86px] rounded-[22px] bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 border border-white/[0.18] backdrop-blur-md flex flex-col items-center justify-between text-center transition shadow-lg cursor-pointer group"
                  title="My Cards"
                >
                  <div className="pt-2 flex items-center justify-center">
                    <DashenMyCardsIcon className="w-7 h-7 text-white drop-shadow-xs group-hover:scale-105 transition" />
                  </div>
                  <span className="text-[11px] font-semibold text-white leading-[1.2] pb-1">
                    My Cards
                  </span>
                </button>

                {/* 6. Mobile Top-up */}
                <button 
                  onClick={() => {
                    setCopyToast('Airtime Top-up ready');
                    setTimeout(() => setCopyToast(null), 1500);
                  }}
                  className="p-2 min-h-[86px] rounded-[22px] bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 border border-white/[0.18] backdrop-blur-md flex flex-col items-center justify-between text-center transition shadow-lg cursor-pointer group"
                  title="Mobile Top-up"
                >
                  <div className="pt-1.5 flex items-center justify-center">
                    <DashenMobileTopUpIcon className="w-7 h-7 text-white drop-shadow-xs group-hover:scale-105 transition" />
                  </div>
                  <span className="text-[11px] font-semibold text-white leading-[1.2] pb-0.5">
                    Mobile<br />Top-up
                  </span>
                </button>

                {/* 7. Utility Payments */}
                <button 
                  onClick={() => {
                    setCopyToast('Utility Payments: Water, Electricity, DSTV');
                    setTimeout(() => setCopyToast(null), 2000);
                  }}
                  className="p-2 min-h-[86px] rounded-[22px] bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 border border-white/[0.18] backdrop-blur-md flex flex-col items-center justify-between text-center transition shadow-lg cursor-pointer group"
                  title="Utility Payments"
                >
                  <div className="pt-1.5 flex items-center justify-center">
                    <DashenUtilityPaymentsIcon className="w-7 h-7 text-white drop-shadow-xs group-hover:scale-105 transition" />
                  </div>
                  <span className="text-[11px] font-semibold text-white leading-[1.2] pb-0.5">
                    Utility<br />Payments
                  </span>
                </button>

                {/* 8. See More */}
                <button 
                  onClick={() => setCurrentTab('apps')}
                  className="p-2 min-h-[86px] rounded-[22px] bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 border border-white/[0.18] backdrop-blur-md flex flex-col items-center justify-between text-center transition shadow-lg cursor-pointer group"
                  title="See More"
                >
                  <div className="pt-2.5 flex items-center justify-center">
                    <DashenSeeMoreIcon className="w-7 h-7 text-white drop-shadow-xs group-hover:scale-105 transition" />
                  </div>
                  <span className="text-[11px] font-semibold text-white leading-[1.2] pb-1">
                    See More
                  </span>
                </button>
              </div>

              {/* E-commerce Card Banner matching Screenshot 123028 */}
              <div 
                onClick={() => setCurrentTab('ecommerce')}
                className="relative bg-[#101c34]/90 border border-[#1e335b] rounded-[22px] p-4 flex items-center justify-between cursor-pointer hover:border-blue-500/50 transition shadow-lg"
              >
                <div className="flex items-center gap-3.5 pr-6">
                  {/* Storefront icon */}
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white tracking-tight">
                      E-commerce
                    </h3>
                    <p className="text-[11.5px] text-neutral-300 leading-tight mt-0.5">
                      Explore our list of merchants and shop what you need.
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
              </div>

              {/* 3 Click E-commerce Section matching Screenshot 125235 */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-[13px] font-bold text-white tracking-tight">
                    3 Click e-commerce
                  </h4>
                  <button 
                    onClick={() => setCurrentTab('ecommerce')}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                  >
                    See All
                  </button>
                </div>

                {/* 3 Click Product Cards Row matching Screenshot 125235 */}
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Product 1: Honey */}
                  <div 
                    onClick={() => {
                      setCopyToast('Selected: Honey (Natural Gold)');
                      setTimeout(() => setCopyToast(null), 1800);
                    }}
                    className="relative bg-[#101c34]/80 border border-[#1e335b] rounded-2xl p-2.5 flex flex-col items-center text-center cursor-pointer hover:border-blue-500/50 transition group"
                  >
                    <div className="w-full aspect-square rounded-xl bg-[#142343] overflow-hidden flex items-center justify-center p-1.5 mb-2 relative">
                      <img 
                        src="https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300&q=80" 
                        alt="Honey" 
                        className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition"
                      />
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-500/90 border border-white/50 flex items-center justify-center shadow-xs">
                        <span className="text-[9px]">🍯</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-white leading-tight truncate w-full">
                      Honey
                    </span>
                    <span className="text-[10px] text-neutral-400 leading-tight truncate w-full mt-0.5">
                      Natural Gold
                    </span>
                  </div>

                  {/* Product 2: Dubai Chocolate */}
                  <div 
                    onClick={() => {
                      setCopyToast('Selected: Dubai Chocolate');
                      setTimeout(() => setCopyToast(null), 1800);
                    }}
                    className="relative bg-[#101c34]/80 border border-[#1e335b] rounded-2xl p-2.5 flex flex-col items-center text-center cursor-pointer hover:border-blue-500/50 transition group"
                  >
                    <div className="w-full aspect-square rounded-xl bg-[#142343] overflow-hidden flex items-center justify-center p-1.5 mb-2 relative">
                      <img 
                        src="https://images.unsplash.com/photo-1548907040-4baa42d10919?w=300&q=80" 
                        alt="Dubai Chocolate" 
                        className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition"
                      />
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-600/90 border border-white/50 flex items-center justify-center shadow-xs">
                        <span className="text-[9px]">🍫</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-white leading-tight truncate w-full">
                      Dubai Chocolate
                    </span>
                    <span className="text-[10px] text-neutral-400 leading-tight truncate w-full mt-0.5">
                      Indulgence In Every...
                    </span>
                  </div>

                  {/* Product 3: Teff Flour */}
                  <div 
                    onClick={() => {
                      setCopyToast('Selected: Teff Flour (100% Teff)');
                      setTimeout(() => setCopyToast(null), 1800);
                    }}
                    className="relative bg-[#101c34]/80 border border-[#1e335b] rounded-2xl p-2.5 flex flex-col items-center text-center cursor-pointer hover:border-blue-500/50 transition group"
                  >
                    <div className="w-full aspect-square rounded-xl bg-[#142343] overflow-hidden flex items-center justify-center p-1.5 mb-2 relative">
                      <img 
                        src="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&q=80" 
                        alt="Teff Flour" 
                        className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition"
                      />
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-yellow-600/90 border border-white/50 flex items-center justify-center shadow-xs">
                        <span className="text-[9px]">🌾</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-white leading-tight truncate w-full">
                      Teff Flour
                    </span>
                    <span className="text-[10px] text-neutral-400 leading-tight truncate w-full mt-0.5">
                      100% Teff
                    </span>
                  </div>
                </div>
              </div>

              {/* Promotional Coffee Banner matching Screenshot 125235 */}
              <div className="relative rounded-[22px] overflow-hidden bg-gradient-to-r from-[#2a1b12] via-[#3d2417] to-[#1a110a] border border-[#52331f]/70 p-4 shadow-lg cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 max-w-[62%]">
                    <h3 className="text-sm font-extrabold text-white leading-snug">
                      Explore The Taste.
                    </h3>
                    <p className="text-xs font-bold text-amber-300 leading-snug">
                      Experience The Tradition.
                    </p>
                    <p className="text-[10px] text-neutral-300 pt-0.5">
                      Premium Ethiopian Yirgacheffe &amp; Sidama Beans
                    </p>
                  </div>
                  <div className="w-20 h-16 rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-[#150d08]">
                    <img 
                      src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&q=80" 
                      alt="Ethiopian Coffee" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                {/* Carousel Indicator Dots */}
                <div className="flex items-center justify-center gap-1.5 pt-2">
                  <div className="w-4 h-1.5 rounded-full bg-white" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                </div>
              </div>

              {/* Mini Apps Section matching Screenshot 125235 */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-[13px] font-bold text-white tracking-tight">
                    Mini Apps
                  </h4>
                  <button 
                    onClick={() => setCurrentTab('apps')}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                  >
                    See All
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {/* 1. DSTV */}
                  <div 
                    onClick={() => {
                      setCopyToast('Opening DSTV Mini App');
                      setTimeout(() => setCopyToast(null), 1800);
                    }}
                    className="bg-[#101c34]/80 border border-[#1e335b] rounded-2xl p-3 flex flex-col items-center text-center cursor-pointer hover:border-blue-500/50 transition group"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#0a1b38] border border-cyan-400/40 flex items-center justify-center shadow-md mb-1.5 overflow-hidden">
                      <span className="text-[12px] font-black tracking-tighter text-white">
                        DStv
                      </span>
                    </div>
                    <span className="text-xs font-bold text-white truncate w-full">
                      DSTV
                    </span>
                  </div>

                  {/* 2. Ethiopian Airlines */}
                  <div 
                    onClick={() => {
                      setCopyToast('Opening Ethiopian Airlines Mini App');
                      setTimeout(() => setCopyToast(null), 1800);
                    }}
                    className="bg-[#101c34]/80 border border-[#1e335b] rounded-2xl p-3 flex flex-col items-center text-center cursor-pointer hover:border-blue-500/50 transition group"
                  >
                    <div className="w-12 h-12 rounded-full bg-white border border-neutral-300 flex items-center justify-center shadow-md mb-1.5 overflow-hidden p-1">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-emerald-700 tracking-tighter leading-none">
                          Ethiopian
                        </span>
                        <div className="w-4 h-0.5 bg-yellow-500 my-0.5" />
                        <span className="text-[7.5px] font-bold text-rose-700 tracking-tighter leading-none">
                          Airlines
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-white truncate w-full">
                      Ethiopian Airlines
                    </span>
                  </div>

                  {/* 3. Dashen Events */}
                  <div 
                    onClick={() => {
                      setCopyToast('Opening Dashen Events');
                      setTimeout(() => setCopyToast(null), 1800);
                    }}
                    className="bg-[#101c34]/80 border border-[#1e335b] rounded-2xl p-3 flex flex-col items-center text-center cursor-pointer hover:border-blue-500/50 transition group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#0b2149] border border-blue-400/40 flex items-center justify-center shadow-md mb-1.5 overflow-hidden p-1">
                      <DashenLogo src={customLogo} className="w-9 h-9" showText={false} />
                    </div>
                    <span className="text-xs font-bold text-white truncate w-full">
                      Dashen Events
                    </span>
                  </div>

                  {/* 4. Telebirr Super App */}
                  <div 
                    onClick={() => {
                      if (onOpenTelebirr) {
                        onOpenTelebirr();
                      } else {
                        try {
                          window.history.pushState({ view: 'telebirr' }, '', '/telebirr');
                          window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'telebirr' } }));
                        } catch {}
                      }
                    }}
                    className="bg-[#101c34]/80 border border-lime-500/40 rounded-2xl p-3 flex flex-col items-center text-center cursor-pointer hover:border-lime-400 transition group"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5cb82e] to-[#0085ca] border border-lime-300 flex items-center justify-center shadow-md mb-1.5 overflow-hidden p-1">
                      <span className="text-sm font-black text-white leading-none">t</span>
                    </div>
                    <span className="text-xs font-bold text-lime-400 truncate w-full">
                      Telebirr
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: TRANSACTIONS (Matching Screenshots 123057 & 123108) */}
          {currentTab === 'transactions' && (
            <div className="flex-1 overflow-y-auto px-4 pb-20 scrollbar-none space-y-3 pt-2">
              
              {/* Top Header: Title & Action Icons matching Screenshots */}
              <div className="flex items-center justify-between pt-1 pb-1">
                <h1 className="text-[22px] font-bold text-white tracking-tight">
                  Transactions
                </h1>

                <div className="flex items-center gap-2">
                  {/* Bank Building in circle */}
                  <button 
                    onClick={() => setShowAccountsModal(true)}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition active:scale-95"
                    title="Account Info"
                  >
                    <Landmark className="w-4 h-4" />
                  </button>

                  {/* Calendar in circle */}
                  <button 
                    onClick={() => {
                      setCopyToast('Date range: Showing all recent transactions');
                      setTimeout(() => setCopyToast(null), 2000);
                    }}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition active:scale-95"
                    title="Filter by Date"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Segmented Pill Tabs matching Screenshots: [ Super App ] [ All Channels ] */}
              <div className="w-full bg-[#101b30] p-1 rounded-2xl flex items-center border border-[#1d2d4d]">
                <button 
                  onClick={() => setTxChannelTab('super_app')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition text-center ${
                    txChannelTab === 'super_app' 
                      ? 'bg-[#1e2f4f] text-white shadow-sm' 
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Super App
                </button>
                <button 
                  onClick={() => setTxChannelTab('all_channels')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition text-center ${
                    txChannelTab === 'all_channels' 
                      ? 'bg-[#1e2f4f] text-white shadow-sm' 
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  All Channels
                </button>
              </div>

              {/* Transactions List Card matching exact Screenshot layouts */}
              <div className="bg-[#0f192b]/90 border border-[#1b2b48] rounded-[22px] overflow-hidden divide-y divide-[#1b2b48]/80 shadow-xl">
                {displayedTransactions.length === 0 ? (
                  <div className="p-8 text-center text-neutral-400 text-xs">
                    No transactions recorded for this channel.
                  </div>
                ) : (
                  displayedTransactions.map((tx) => {
                    const isCredit = tx.type === 'credit';
                    return (
                      <div 
                        key={tx.id}
                        onClick={() => setSelectedTxDetail(tx)}
                        className="p-4 flex items-center justify-between hover:bg-[#16243e]/50 cursor-pointer transition active:bg-[#182845]"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 pr-2">
                          {/* Circle Icon: Red diagonal up-right arrow for debit, green checkmark for credit */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            isCredit 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {isCredit ? (
                              <Check className="w-5 h-5 stroke-[2.5]" />
                            ) : (
                              <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />
                            )}
                          </div>

                          {/* Titles matching screenshots */}
                          <div className="min-w-0">
                            <h4 className="text-[14px] font-bold text-white truncate tracking-tight">
                              {tx.title}
                            </h4>
                            <p className="text-[11.5px] text-neutral-400 truncate mt-0.5">
                              {tx.subtitle}
                            </p>
                          </div>
                        </div>

                        {/* Amount and Date on the right */}
                        <div className="text-right shrink-0">
                          <p className={`text-[14px] font-bold tracking-tight ${
                            isCredit ? 'text-emerald-400' : 'text-neutral-100'
                          }`}>
                            {isCredit ? `+ ETB ${tx.amount.toFixed(2)}` : `- ETB ${tx.amount.toFixed(2)}`}
                          </p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            {tx.date}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Inter-bank indicator banner */}
              <div className="p-3 bg-[#111e36]/70 border border-[#1f345b] rounded-2xl flex items-center justify-between text-[11px] text-neutral-400">
                <span>Transfers to CBE &amp; other banks sync in real-time.</span>
                <span className="font-semibold text-blue-400">Connected</span>
              </div>
            </div>
          )}

          {/* TAB 2: APPS (All Dashen Services) */}
          {currentTab === 'apps' && (
            <div className="flex-1 overflow-y-auto px-4 pb-20 scrollbar-none space-y-4 pt-2">
              <h1 className="text-[22px] font-bold text-white tracking-tight">
                Dashen Apps &amp; Services
              </h1>

              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => {
                    setSendStep('input_acc');
                    setSubScreen('send_dashen');
                  }}
                  className="p-4 bg-[#101b30] border border-[#1e2f4f] rounded-2xl cursor-pointer hover:border-blue-500/50 transition"
                >
                  <Send className="w-6 h-6 text-blue-400 mb-2" />
                  <p className="text-sm font-bold text-white">Send To Dashen</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Instant intra-bank transfer</p>
                </div>

                <div 
                  onClick={() => {
                    setSendStep('input_acc');
                    setSubScreen('send_other_banks');
                  }}
                  className="p-4 bg-[#101b30] border border-[#1e2f4f] rounded-2xl cursor-pointer hover:border-blue-500/50 transition"
                >
                  <Building2 className="w-6 h-6 text-cyan-400 mb-2" />
                  <p className="text-sm font-bold text-white">Transfer to CBE</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Real-time inter-bank RTGS</p>
                </div>

                <div 
                  onClick={() => setShowAccountsModal(true)}
                  className="p-4 bg-[#101b30] border border-[#1e2f4f] rounded-2xl cursor-pointer hover:border-blue-500/50 transition"
                >
                  <Landmark className="w-6 h-6 text-emerald-400 mb-2" />
                  <p className="text-sm font-bold text-white">Account Registry</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Manage external contacts</p>
                </div>

                <div 
                  onClick={() => setShowQrModal(true)}
                  className="p-4 bg-[#101b30] border border-[#1e2f4f] rounded-2xl cursor-pointer hover:border-blue-500/50 transition"
                >
                  <QrCode className="w-6 h-6 text-purple-400 mb-2" />
                  <p className="text-sm font-bold text-white">Dashen Pay QR</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Scan &amp; Receive via QR</p>
                </div>
              </div>

              <div className="p-4 bg-[#101b30] border border-[#1e2f4f] rounded-2xl space-y-2">
                <h3 className="text-sm font-bold text-white">Digital Cards</h3>
                <div className="p-3 bg-[#15233e] rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-xs font-bold text-white">Dashen Branded Debit Card</p>
                      <p className="text-[10px] text-neutral-400 font-mono">5254 •••• •••• 9012</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: E-COMMERCE */}
          {currentTab === 'ecommerce' && (
            <div className="flex-1 overflow-y-auto px-4 pb-20 scrollbar-none space-y-4 pt-2">
              <h1 className="text-[22px] font-bold text-white tracking-tight">
                Dashen E-Commerce
              </h1>
              <p className="text-xs text-neutral-400">
                Explore verified Ethiopian merchants and shop directly with 3-click Dashen Pay.
              </p>

              <div className="space-y-2.5">
                {[
                  { name: 'Ethio Supermarket', cat: 'Groceries & Household', rating: '4.8 ★', logo: '🛒' },
                  { name: 'Zemen Electronics', cat: 'Phones & Gadgets', rating: '4.9 ★', logo: '📱' },
                  { name: 'Addis Fashion Hub', cat: 'Apparel & Shoes', rating: '4.7 ★', logo: '👗' },
                  { name: 'Bole Express Cafe', cat: 'Food & Coffee Beans', rating: '4.9 ★', logo: '☕' }
                ].map((merchant, i) => (
                  <div 
                    key={i}
                    onClick={() => {
                      setCopyToast(`Opening ${merchant.name}...`);
                      setTimeout(() => setCopyToast(null), 1500);
                    }}
                    className="p-3.5 bg-[#101b30] border border-[#1e2f4f] rounded-2xl flex items-center justify-between cursor-pointer hover:border-blue-400/50 transition active:scale-98"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-xl">
                        {merchant.logo}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{merchant.name}</p>
                        <p className="text-[11px] text-neutral-400">{merchant.cat}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-amber-400">{merchant.rating}</span>
                      <p className="text-[10px] text-blue-400 mt-0.5">Shop Now</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: PROFILE (Exact match to Screenshot_20260909-124553.png with Logo Uploader System) */}
          {currentTab === 'profile' && (
            <div className="flex-1 overflow-y-auto px-4 pb-20 scrollbar-none space-y-4 pt-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h1 className="text-[22px] font-bold text-white tracking-tight">
                  Dashen Profile
                </h1>
                <button
                  onClick={() => setShowLogoModal(true)}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                  <span>Branding</span>
                </button>
              </div>

              {/* Account Card with Bank Logo */}
              <div className="p-4 bg-[#101b30] border border-[#1e2f4f] rounded-2xl space-y-3 shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-600 border-2 border-blue-400 flex items-center justify-center text-lg font-bold text-white shadow-sm">
                      {account.accountName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{account.accountName}</h3>
                      <p className="text-xs text-neutral-400 font-mono">{account.accountNumber}</p>
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-semibold">
                        {account.accountType}
                      </span>
                    </div>
                  </div>

                  {/* Active Bank Logo & Quick Change */}
                  <div 
                    onClick={() => setShowLogoModal(true)}
                    className="flex flex-col items-center gap-1 cursor-pointer group shrink-0"
                    title="Click to customize bank logo"
                  >
                    <DashenLogo src={customLogo} className="w-11 h-11 group-hover:scale-105 transition" />
                    <span className="text-[9px] text-blue-400 font-bold group-hover:text-blue-300 underline">
                      Change Logo
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800/80 flex justify-between text-xs text-neutral-400">
                  <span>Branch: {account.branchName}</span>
                  <span>Currency: {account.currency}</span>
                </div>
              </div>

              {/* Options Navigation List */}
              <div className="space-y-2">
                {/* 1. Registered Inter-Bank Accounts */}
                <button 
                  onClick={() => setShowAccountsModal(true)}
                  className="w-full p-3.5 bg-[#101b30] hover:bg-[#16243e] border border-[#1e2f4f] rounded-2xl flex items-center justify-between text-left transition cursor-pointer"
                >
                  <span className="text-sm font-medium text-white">Registered Inter-Bank Accounts</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </button>

                {/* 2. Phone Model & Status Bar Settings */}
                <button 
                  onClick={() => setShowPhoneSettings(true)}
                  className="w-full p-3.5 bg-[#101b30] hover:bg-[#16243e] border border-[#1e2f4f] rounded-2xl flex items-center justify-between text-left transition cursor-pointer"
                >
                  <span className="text-sm font-medium text-white">Phone Model &amp; Status Bar Settings</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </button>

                {/* 3. Bank Logo & App Branding (Requested Feature) */}
                <button 
                  id="dashen-profile-logo-uploader-btn"
                  onClick={() => setShowLogoModal(true)}
                  className="w-full p-3.5 bg-[#101b30] hover:bg-[#16243e] border border-[#1e2f4f] rounded-2xl flex items-center justify-between text-left transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <DashenLogo src={customLogo} className="w-8 h-8" showText={false} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">Bank Logo &amp; Branding</span>
                        <span className="text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-1.5 py-0.2 rounded-full">
                          Customizable
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        {customLogo ? 'Custom Uploaded Logo • Tap to change or reset' : 'Official Dashen Logo • Upload custom PNG, JPG, or SVG'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-white transition" />
                </button>
              </div>

              {/* In-Page Quick Logo Uploader System Card */}
              <div className="p-4 bg-[#0a1529] border border-[#1b345b] rounded-2xl space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <h4 className="text-xs font-bold text-white">Logo Uploader System</h4>
                  </div>
                  {customLogo && (
                    <button
                      onClick={() => {
                        DashenBankService.resetCustomLogo();
                        setCustomLogo(null);
                        setCopyToast('Reset to Official Dashen Logo');
                        setTimeout(() => setCopyToast(null), 2000);
                      }}
                      className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Direct Upload input */}
                <label className="flex items-center justify-center gap-2.5 p-3 rounded-xl border border-dashed border-[#23457a] hover:border-blue-400 bg-[#0d2142]/40 hover:bg-[#0d2142]/70 cursor-pointer transition text-center group">
                  <Upload className="w-4 h-4 text-blue-400 group-hover:scale-110 transition" />
                  <div>
                    <span className="text-xs font-bold text-blue-200">
                      Upload Bank Logo
                    </span>
                    <span className="text-[10px] text-neutral-400 block">
                      PNG, JPG, SVG or WebP
                    </span>
                  </div>
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/svg+xml, image/webp" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const dataUrl = await compressImageFile(file, 400, 0.9);
                          DashenBankService.saveCustomLogo(dataUrl);
                          setCustomLogo(dataUrl);
                          setCopyToast('New logo applied to app header!');
                          setTimeout(() => setCopyToast(null), 2500);
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    }}
                  />
                </label>

                {/* Preset Fast Selectors */}
                <div className="pt-1">
                  <p className="text-[10px] text-neutral-400 mb-1.5 font-medium">Quick Select Presets:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DASHEN_PRESET_LOGOS.map((preset) => {
                      const isSelected = customLogo === preset.url || (!customLogo && preset.id === 'official_dashen');
                      return (
                        <button
                          key={preset.id}
                          onClick={() => {
                            DashenBankService.saveCustomLogo(preset.url);
                            setCustomLogo(preset.url);
                            setCopyToast(`Applied: ${preset.name}`);
                            setTimeout(() => setCopyToast(null), 2000);
                          }}
                          className={`p-2 rounded-xl border flex items-center gap-2 text-left transition cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600/30 border-blue-400 text-white'
                              : 'bg-[#081326] border-[#172c50] text-neutral-300 hover:bg-[#0e2145]'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-black/40 p-0.5 flex items-center justify-center shrink-0">
                            <img src={preset.url} alt={preset.name} className="w-full h-full object-contain" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10.5px] font-bold truncate">{preset.name.split(' ')[0]}</p>
                            <p className="text-[8.5px] text-neutral-400 truncate">{preset.isOfficial ? 'Dashen' : 'Other'}</p>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* More branding options link */}
                <div className="pt-1 text-center">
                  <button
                    onClick={() => setShowLogoModal(true)}
                    className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                  >
                    Open Full Logo &amp; Wallpaper Customizer
                  </button>
                </div>
              </div>

              {/* Reset & Back */}
              <div className="space-y-2 pt-1">
                <button 
                  onClick={() => {
                    DashenBankService.resetToDefault();
                    setAccount(DashenBankService.getAccount());
                    setTransactions(DashenBankService.getTransactions());
                    setCustomLogo(null);
                    setCustomBgImage(null);
                    setCopyToast('Reset to default prototype state');
                    setTimeout(() => setCopyToast(null), 2000);
                  }}
                  className="w-full p-3.5 bg-[#1a1320] hover:bg-[#251a2d] border border-rose-900/40 rounded-2xl flex items-center justify-between text-left transition text-rose-400 cursor-pointer"
                >
                  <span className="text-sm font-medium">Reset Dashen Prototype Data</span>
                  <RefreshCw className="w-4 h-4" />
                </button>

              </div>
            </div>
          )}

        </div>
      )}

      {/* Floating Glowing Blue QR Scanner FAB matching Screenshots 123028 & 125235 */}
      <div className="absolute bottom-20 right-4 z-40 pointer-events-auto">
        <button 
          onClick={() => setShowQrModal(true)}
          className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#1a73e8] via-[#2176ff] to-[#3d8bfe] text-white flex items-center justify-center shadow-2xl shadow-blue-500/50 hover:scale-105 active:scale-95 transition border border-white/25 cursor-pointer"
          title="Scan QR Code / Dashen Pay"
          aria-label="Scan QR Code"
        >
          <QrCode className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* =================================================================== */}
      {/* BOTTOM NAVIGATION BAR (Exact match for Screenshots 1, 2, 3)          */}
      {/* Tabs: Home | Apps | E-Comm... | Transact... | Profile               */}
      {/* =================================================================== */}
      <div className="w-full bg-[#050c18] border-t border-[#131d2e] px-2 py-2 flex items-center justify-around shrink-0 z-30 select-none">
        {/* 1. Home */}
        <button 
          onClick={() => {
            setSubScreen('none');
            setCurrentTab('home');
          }}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 transition ${
            currentTab === 'home' && subScreen === 'none'
              ? 'text-white' 
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">Home</span>
        </button>

        {/* 2. Apps */}
        <button 
          onClick={() => {
            setSubScreen('none');
            setCurrentTab('apps');
          }}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 transition ${
            currentTab === 'apps' 
              ? 'text-white' 
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] font-medium">Apps</span>
        </button>

        {/* 3. E-Comm... */}
        <button 
          onClick={() => {
            setSubScreen('none');
            setCurrentTab('ecommerce');
          }}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 transition ${
            currentTab === 'ecommerce' 
              ? 'text-white' 
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] font-medium">E-Comm...</span>
        </button>

        {/* 4. Transact... */}
        <button 
          onClick={() => {
            setSubScreen('none');
            setCurrentTab('transactions');
          }}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 transition ${
            currentTab === 'transactions' 
              ? 'text-white' 
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px] font-medium">Transact...</span>
        </button>

        {/* 5. Profile */}
        <button 
          onClick={() => {
            setSubScreen('none');
            setCurrentTab('profile');
          }}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 transition ${
            currentTab === 'profile' 
              ? 'text-white' 
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* ACCOUNTS & REGISTERED DIRECTORY MODAL                              */}
      {/* =================================================================== */}
      {showAccountsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0f192b] border border-[#1e2f4f] rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="font-bold text-base text-white">Dashen Accounts &amp; Registry</h3>
              <button onClick={() => setShowAccountsModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 scrollbar-none">
              <div className="p-3.5 bg-[#15233c] border border-[#21375d] rounded-2xl space-y-1">
                <p className="text-xs text-neutral-400">Primary Amana Account</p>
                <p className="text-base font-bold text-white">{account.accountNumber}</p>
                <p className="text-xs font-semibold text-emerald-400">Balance: ETB {account.balance.toFixed(2)}</p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                  Registered External Accounts
                </h4>
                <p className="text-[11px] text-neutral-400 mb-2">
                  Accounts that transferred to Dashen or were sent to are registered here:
                </p>
                <div className="space-y-2">
                  {registeredAccounts.map((item) => (
                    <div key={item.accountNumber} className="p-3 bg-[#111c30] rounded-xl border border-neutral-800 space-y-0.5">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-white">{item.accountName}</p>
                        <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                          {item.source === 'cbe_incoming' ? 'CBE Sender' : 'Saved'}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-neutral-400">{item.accountNumber} • {item.bankName}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS MODAL */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0f192b] border border-[#1e2f4f] rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-3 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base text-white">Notifications</h3>
              </div>
              <button 
                onClick={() => {
                  DashenBankService.markNotificationsRead();
                  setNotifications(DashenBankService.getNotifications());
                  setShowNotificationsModal(false);
                }} 
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 scrollbar-none">
              {notifications.map((n) => (
                <div key={n.id} className="p-3 bg-[#131f36] border border-[#203152] rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white">{n.title}</p>
                    <span className="text-[10px] text-neutral-400">{n.time}</span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-snug">{n.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QR SCANNER & MY QR MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0f192b] border border-[#1e2f4f] rounded-3xl p-6 max-w-xs w-full shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Dashen Pay QR</h3>
              <button onClick={() => setShowQrModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner">
              {/* Simulated QR Pattern */}
              <div className="w-44 h-44 border-4 border-black p-2 bg-white flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="w-10 h-10 border-4 border-black bg-black flex items-center justify-center">
                    <div className="w-4 h-4 bg-white" />
                  </div>
                  <div className="w-10 h-10 border-4 border-black bg-black flex items-center justify-center">
                    <div className="w-4 h-4 bg-white" />
                  </div>
                </div>
                <div className="text-center font-mono font-extrabold text-[10px] text-black">
                  DASHEN PAY
                </div>
                <div className="flex justify-between">
                  <div className="w-10 h-10 border-4 border-black bg-black flex items-center justify-center">
                    <div className="w-4 h-4 bg-white" />
                  </div>
                  <div className="w-10 h-10 border-2 border-black flex items-center justify-center">
                    <div className="w-4 h-4 bg-black" />
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-neutral-300">
              <p className="font-bold">{account.accountName}</p>
              <p className="font-mono text-neutral-400">{account.accountNumber}</p>
            </div>

            <button 
              onClick={() => {
                setCopyToast('QR Code saved to gallery');
                setTimeout(() => setCopyToast(null), 2000);
                setShowQrModal(false);
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition"
            >
              Save QR Code
            </button>
          </div>
        </div>
      )}

      {/* THEME PICKER MODAL */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0f192b] border border-[#1e2f4f] rounded-3xl p-5 max-w-xs w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Dashen Theme Palette</h3>
              <button onClick={() => setShowThemeModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {[
                { id: 'dashen_blue', name: 'Dashen Midnight Blue', color: 'bg-blue-600' },
                { id: 'royal_navy', name: 'Royal Navy Abyss', color: 'bg-indigo-600' },
                { id: 'midnight_purple', name: 'Dark Obsidian', color: 'bg-neutral-800' },
                { id: 'slate_emerald', name: 'Tana Deep Slate', color: 'bg-teal-700' }
              ].map((theme) => (
                <button 
                  key={theme.id}
                  onClick={() => {
                    setThemeAccent(theme.id as any);
                    setShowThemeModal(false);
                  }}
                  className="w-full p-3 rounded-xl bg-[#131f36] hover:bg-[#1a2b4a] border border-[#203152] flex items-center justify-between transition"
                >
                  <span className="text-xs font-bold text-white">{theme.name}</span>
                  <span className={`w-4 h-4 rounded-full ${theme.color}`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION DETAIL RECEIPT MODAL */}
      {selectedTxDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0f192b] border border-[#1e2f4f] rounded-3xl p-5 max-w-xs w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="font-bold text-sm text-white">Transaction Details</h3>
              <button onClick={() => setSelectedTxDetail(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-2 space-y-1">
              <span className={`text-2xl font-black ${
                selectedTxDetail.type === 'credit' ? 'text-emerald-400' : 'text-neutral-100'
              }`}>
                {selectedTxDetail.type === 'credit' ? `+ ETB ${selectedTxDetail.amount.toFixed(2)}` : `- ETB ${selectedTxDetail.amount.toFixed(2)}`}
              </span>
              <p className="text-xs font-bold text-white">{selectedTxDetail.title}</p>
              <p className="text-[11px] text-neutral-400">{selectedTxDetail.subtitle}</p>
            </div>

            <div className="p-3.5 bg-[#121c2e] rounded-xl border border-neutral-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Date</span>
                <span className="text-white font-medium">{selectedTxDetail.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Channel</span>
                <span className="text-white font-semibold uppercase">{selectedTxDetail.channel.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Reference</span>
                <span className="font-mono text-blue-400">{selectedTxDetail.reference || 'N/A'}</span>
              </div>
            </div>

            <button 
              onClick={() => setSelectedTxDetail(null)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Dashen Bank Logo & Wallpaper Customization Modal (Requested Feature) */}
      <DashenLogoModal 
        isOpen={showLogoModal}
        onClose={() => setShowLogoModal(false)}
        currentLogo={customLogo}
        onLogoUpdated={(newLogo) => {
          setCustomLogo(newLogo);
          setCopyToast(newLogo ? 'Bank logo updated!' : 'Reset to official Dashen logo');
          setTimeout(() => setCopyToast(null), 2500);
        }}
        currentBgImage={customBgImage}
        onBgImageUpdated={(newBg) => {
          setCustomBgImage(newBg);
          setCopyToast(newBg ? 'Wallpaper updated!' : 'Reset to Mount Dashen silhouette');
          setTimeout(() => setCopyToast(null), 2500);
        }}
      />

      {/* Global Phone Type & Status Bar Settings Modal */}
      <PhoneSettingsModal 
        isOpen={showPhoneSettings} 
        onClose={() => setShowPhoneSettings(false)} 
      />

    </div>
  );
}

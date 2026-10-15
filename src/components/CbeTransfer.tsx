import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  Eye, 
  EyeOff, 
  UserPlus, 
  AlertCircle, 
  Delete,
  Check,
  Loader2,
  Building2,
  Wallet,
  Calculator,
  PlusCircle,
  Trash2,
  ChevronRight,
  X
} from 'lucide-react';
import { UserProfile, Transaction, BankAccount, RegisteredAccountInfo } from '../types';
import { LocalDb } from '../lib/mockData';
import { RegisteredAccountsModal } from './RegisteredAccountsModal';

interface CbeTransferProps {
  currentUser: UserProfile;
  onTransactionComplete: (tx: Transaction) => void;
  onBack: () => void;
}

interface RecentTransferItem {
  id: string;
  name: string;
  initials: string;
  accountNumber: string;
  avatarBg?: string;
}

const DEFAULT_RECENT_TRANSFERS: RecentTransferItem[] = [
  {
    id: 'rec_1',
    name: 'Ayenew Wubete Parent Wubete Hotel',
    initials: 'AW',
    accountNumber: '1000284715104',
    avatarBg: 'bg-purple-100 text-purple-700'
  },
  {
    id: 'rec_2',
    name: 'Kess-jemane Yilma',
    initials: 'KY',
    accountNumber: '1000392816068',
    avatarBg: 'bg-purple-100 text-purple-700'
  },
  {
    id: 'rec_3',
    name: 'Kes Asegidew Negese',
    initials: 'KA',
    accountNumber: '1000491828218',
    avatarBg: 'bg-purple-100 text-purple-700'
  },
  {
    id: 'rec_4',
    name: 'Belew Demissie Bereded',
    initials: 'BD',
    accountNumber: '1000582914562',
    avatarBg: 'bg-purple-100 text-purple-700'
  }
];

export const CbeTransfer: React.FC<CbeTransferProps> = ({
  currentUser,
  onTransactionComplete,
  onBack,
}) => {
  // Sender's accounts
  const [userAccounts] = useState<BankAccount[]>(() => 
    LocalDb.getUserAccounts(currentUser.id)
  );
  const [selectedFromAccId] = useState<string>(() => {
    const accs = LocalDb.getUserAccounts(currentUser.id);
    const primary = accs.find(a => a.isPrimary) || accs[0];
    return primary ? primary.id : '';
  });

  const selectedFromAccountObj = useMemo(() => {
    return userAccounts.find(a => a.id === selectedFromAccId);
  }, [userAccounts, selectedFromAccId]);

  const currentAvailableBalance = selectedFromAccountObj?.balance ?? currentUser.balance;

  // Balance visibility toggle (starts hidden with dots as seen in image 2)
  const [showBalance, setShowBalance] = useState(false);

  // Form fields
  const [phoneOrAccount, setPhoneOrAccount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [amount, setAmount] = useState('');
  const [isRemarkOpen, setIsRemarkOpen] = useState(false);
  const [remark, setRemark] = useState('');

  // Bottom Tabs: 'recent' | 'beneficiaries'
  const [bottomTab, setBottomTab] = useState<'recent' | 'beneficiaries'>('recent');
  const [recentTransfers, setRecentTransfers] = useState<RecentTransferItem[]>(() => {
    try {
      const stored = localStorage.getItem('cbe_recent_transfers');
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_RECENT_TRANSFERS;
  });

  // Flow states: 'form' | 'confirm_pin'
  const [showPinSheet, setShowPinSheet] = useState(false);
  const [showRegisteredModal, setShowRegisteredModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Status feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clean Account or Phone Number input
  const handleRecipientChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 13);
    setPhoneOrAccount(clean);
    setErrorMsg('');

    // Check directory to auto-resolve recipient name
    if (clean.length >= 10) {
      const matched = LocalDb.findRegisteredAccount(clean);
      if (matched) {
        setRecipientName(matched.accountName);
      } else {
        const matchingRecent = recentTransfers.find(r => r.accountNumber === clean);
        if (matchingRecent) {
          setRecipientName(matchingRecent.name);
        }
      }
    }
  };

  // Selected registered account from modal
  const handleSelectRegisteredAccount = (account: RegisteredAccountInfo) => {
    setPhoneOrAccount(account.accountNumber);
    setRecipientName(account.accountName);
    setShowRegisteredModal(false);
    setErrorMsg('');
  };

  // Clicking an item from recent list
  const handleSelectRecent = (item: RecentTransferItem) => {
    setPhoneOrAccount(item.accountNumber);
    setRecipientName(item.name);
    setErrorMsg('');
  };

  const handleDeleteRecent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentTransfers.filter(item => item.id !== id);
    setRecentTransfers(updated);
    try {
      localStorage.setItem('cbe_recent_transfers', JSON.stringify(updated));
    } catch {}
  };

  // Handle hardware / virtual phone back
  useEffect(() => {
    const handlePhoneBack = (e: any) => {
      if (showRegisteredModal) {
        setShowRegisteredModal(false);
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        return;
      }
      if (showPinSheet) {
        setShowPinSheet(false);
        setPin('');
        setPinError('');
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        return;
      }
      onBack();
      e?.detail?.setHandled?.();
      e?.preventDefault?.();
    };

    window.addEventListener('cbe_phone_back', handlePhoneBack);
    return () => window.removeEventListener('cbe_phone_back', handlePhoneBack);
  }, [showRegisteredModal, showPinSheet, onBack]);

  // Step 1: Validate form inputs and open PIN confirmation sheet
  const handleInitiateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }

    if (parsedAmount > currentAvailableBalance) {
      setErrorMsg(`Insufficient funds. Available balance: ETB ${currentAvailableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`);
      return;
    }

    if (!phoneOrAccount || (phoneOrAccount.length !== 10 && phoneOrAccount.length !== 13)) {
      setErrorMsg('Please enter a valid CBE account number (13 digits) or phone number (10 digits).');
      return;
    }

    if (phoneOrAccount === currentUser.accountNumber) {
      setErrorMsg('Cannot transfer to your own source account.');
      return;
    }

    // Resolve recipient name if not already set
    if (!recipientName) {
      const matched = LocalDb.findRegisteredAccount(phoneOrAccount);
      if (matched) {
        setRecipientName(matched.accountName);
      } else {
        const matchingRecent = recentTransfers.find(r => r.accountNumber === phoneOrAccount);
        if (matchingRecent) {
          setRecipientName(matchingRecent.name);
        } else {
          setRecipientName('Ayenew Wubete Parent Wubete Hotel');
        }
      }
    }

    // Open the PIN confirmation bottom sheet (Image 2)
    setPin('');
    setPinError('');
    setShowPinSheet(true);
  };

  // Step 2: Confirm 6-digit PIN with the right icon -> complete transfer & show receipt
  const handleConfirmPin = () => {
    if (pin.length !== 6) {
      setPinError('Please enter your 6-digit PIN.');
      return;
    }

    setIsSubmitting(true);
    setPinError('');

    setTimeout(() => {
      const parsedAmount = parseFloat(amount);
      const targetAccount = phoneOrAccount.length === 13 ? phoneOrAccount : `1000${phoneOrAccount.slice(-9)}`;
      
      const targetName = recipientName.trim() || 'Ayenew Wubete Parent Wubete Hotel';

      const newTx = LocalDb.createTransaction(
        'transfer',
        currentUser.id,
        parsedAmount,
        0, // CBE standard fee
        targetName,
        targetAccount,
        'Commercial Bank of Ethiopia',
        remark.trim() || 'MB transfer',
        false,
        selectedFromAccId || undefined
      );

      // Add to recent list if not already there
      if (!recentTransfers.some(r => r.accountNumber === targetAccount)) {
        const nameParts = targetName.split(' ');
        const initials = nameParts.length >= 2 
          ? (nameParts[0][0] + nameParts[1][0]).toUpperCase() 
          : targetName.slice(0, 2).toUpperCase();
        const updated = [
          {
            id: `rec_${Date.now()}`,
            name: targetName,
            initials,
            accountNumber: targetAccount,
            avatarBg: 'bg-purple-100 text-purple-700'
          },
          ...recentTransfers
        ].slice(0, 10);
        setRecentTransfers(updated);
        try {
          localStorage.setItem('cbe_recent_transfers', JSON.stringify(updated));
        } catch {}
      }

      // Dispatch sync events so entire application updates in real-time
      try {
        const freshUsers = LocalDb.getUsers();
        const freshUser = freshUsers.find(u => u.id === currentUser.id);
        window.dispatchEvent(new CustomEvent('cbe_sync_user', { detail: { user: freshUser, balance: freshUser?.balance } }));
        window.dispatchEvent(new CustomEvent('cbe_transaction_added', { detail: { transaction: newTx } }));
      } catch {}

      setIsSubmitting(false);
      setShowPinSheet(false);

      // Navigate to official CBE Receipt view
      onTransactionComplete(newTx);
    }, 350);
  };

  // Masked account representations exactly matching Image 2
  const senderAccountRaw = selectedFromAccountObj?.accountNumber || currentUser.accountNumber || '1000419524747';
  const senderDisplayMasked = senderAccountRaw.length >= 8
    ? `${senderAccountRaw.slice(0, 1)}*********${senderAccountRaw.slice(-4)}`
    : senderAccountRaw;

  const recipientAccountRaw = phoneOrAccount.length === 13 
    ? phoneOrAccount 
    : (phoneOrAccount ? `1000${phoneOrAccount.slice(-9)}` : '1000284715104');

  const recipientDisplayMasked = recipientAccountRaw.length >= 8
    ? `${recipientAccountRaw.slice(0, 1)}*********${recipientAccountRaw.slice(-4)}`
    : recipientAccountRaw;

  const activeRecipientName = recipientName.trim() || 'Ayenew Wubete Parent Wubete Hotel';

  return (
    <div className="w-full flex-1 flex flex-col bg-[#F7F7F7] min-h-0 overflow-hidden relative select-none">
      
      {/* 1. TOP PURPLE CBE HEADER */}
      <div className="bg-[#70189F] text-white pt-[max(env(safe-area-inset-top,0px),16px)] pb-6 px-4 shadow-sm flex-shrink-0 relative z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              id="btn-cbe-transfer-back"
              type="button"
              onClick={() => {
                if (showPinSheet) {
                  setShowPinSheet(false);
                  setPin('');
                } else {
                  onBack();
                }
              }}
              className="p-1 -ml-1 rounded-full hover:bg-white/10 active:scale-95 transition cursor-pointer text-white flex items-center justify-center"
              aria-label="Back"
            >
              <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
            </button>
            <h1 className="text-xl font-bold text-white tracking-wide">
              {showPinSheet ? 'Transfer' : 'CBE Transfer'}
            </h1>
          </div>
          <div className="w-6" />
        </div>
      </div>

      {/* 2. SCROLLABLE FORM BODY */}
      <main className="flex-1 overflow-y-auto px-4 -mt-3 max-w-md mx-auto w-full scrollbar-none pb-8 z-10">
        
        {/* If PIN confirmation is open, show the Transfer summary cards seen behind the bottom sheet in Image 2 */}
        {showPinSheet ? (
          <div className="space-y-3 pt-1">
            {/* "Transfer to" Card with Bank building icon, Recipient Name & Masked Account */}
            <div className="bg-[#EFEBF2] rounded-2xl p-4 border border-purple-100/60 space-y-2">
              <span className="text-xs text-gray-500 font-medium">Transfer to</span>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-200/80 text-[#70189F] flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 stroke-[1.8]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {activeRecipientName}
                  </p>
                  <p className="text-xs text-gray-500 font-mono tracking-wider">
                    {recipientDisplayMasked}
                  </p>
                </div>
              </div>
            </div>

            {/* "From Account" Card */}
            <div className="bg-[#303030] text-white rounded-2xl p-4 shadow-sm border border-gray-700/50 space-y-1">
              <span className="text-[13px] text-[#deb356] font-normal">From Account</span>
              <p className="text-sm font-semibold tracking-wide text-gray-100">
                Saving Account <span className="font-mono">{senderDisplayMasked}</span>
              </p>
            </div>
          </div>
        ) : (
          /* Main white rounded container */
          <div className="bg-white rounded-3xl p-4 shadow-xs border border-gray-100/80 space-y-4">
            
            {/* Error Alert Banner */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-2xl flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            {/* FROM ACCOUNT CARD - Dark card exactly matching image 2 */}
            <div className="bg-[#303030] text-white rounded-2xl p-4 shadow-sm border border-gray-700/50 space-y-1">
              <span className="text-[13px] text-[#deb356] font-normal">From Account</span>
              <p className="text-sm font-semibold tracking-wide text-gray-100">
                savings <span className="font-mono">{senderDisplayMasked}</span>
              </p>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-base font-mono tracking-widest text-gray-300">
                  {showBalance 
                    ? `ETB ${currentAvailableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '••••••'
                  }
                </span>
                <button
                  type="button"
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-gray-400 hover:text-white transition p-0.5 cursor-pointer"
                  title={showBalance ? "Hide balance" : "Show balance"}
                >
                  {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* TRANSFER FORM */}
            <form onSubmit={handleInitiateTransfer} className="space-y-3.5">
              
              {/* Phone Number / Account Input with bank icon on left and person icon on right */}
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-purple-900/60">
                  <Building2 className="w-5 h-5 text-[#70189F]/70 stroke-[1.8]" />
                </div>
                <input
                  id="input-recipient-phone-or-account"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={13}
                  placeholder="Phone Number"
                  value={phoneOrAccount}
                  onChange={(e) => handleRecipientChange(e.target.value)}
                  className="w-full bg-[#fbfbfb] border border-gray-200/90 rounded-2xl pl-11 pr-11 py-3.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#70189F] transition"
                  required
                />
                
                {/* Person Icon Button -> Opens list of Registered Bank Accounts */}
                <button
                  type="button"
                  id="btn-open-registered-accounts"
                  onClick={() => setShowRegisteredModal(true)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#70189F]/80 hover:text-[#70189F] active:scale-90 transition cursor-pointer p-1"
                  title="Registered Bank Accounts"
                  aria-label="List of registered bank accounts"
                >
                  <UserPlus className="w-5 h-5 stroke-[1.8]" />
                </button>
              </div>

              {/* Amount Field with wallet icon and calculator/keypad icon */}
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#70189F]/70">
                  <Wallet className="w-5 h-5 stroke-[1.8]" />
                </div>
                <input
                  id="input-transfer-amount"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="Amount*"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#fbfbfb] border border-gray-200/90 rounded-2xl pl-11 pr-11 py-3.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#70189F] transition"
                  required
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#70189F]/70">
                  <Calculator className="w-5 h-5 stroke-[1.8]" />
                </div>
              </div>

              {/* Add remark *Default: MB transfer */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsRemarkOpen(!isRemarkOpen)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-[#70189F] stroke-[2]" />
                  <span className="font-medium text-gray-700">Add remark</span>
                  <span className="text-[11px] text-gray-400 italic">*Default: MB transfer</span>
                </button>
                
                {isRemarkOpen && (
                  <div className="mt-2 animate-in fade-in">
                    <input
                      type="text"
                      placeholder="Enter remark..."
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      className="w-full bg-[#fbfbfb] border border-gray-200/90 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#70189F]"
                    />
                  </div>
                )}
              </div>

              {/* Solid Purple Continue Button */}
              <div className="pt-1.5">
                <button
                  id="btn-submit-cbe-transfer"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#70189F] hover:bg-[#58117D] active:scale-[0.99] disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl text-base transition shadow-sm flex items-center justify-center cursor-pointer"
                >
                  Continue
                </button>
              </div>
            </form>

            {/* BOTTOM TABS: Recent Transfers vs Beneficiaries */}
            <div className="pt-3">
              <div className="flex border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => setBottomTab('recent')}
                  className={`flex-1 pb-2.5 text-center text-xs font-bold transition cursor-pointer relative ${
                    bottomTab === 'recent'
                      ? 'text-[#70189F]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Recent Transfers
                  {bottomTab === 'recent' && (
                    <div className="absolute bottom-0 inset-x-8 h-0.5 bg-[#70189F] rounded-full" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setBottomTab('beneficiaries')}
                  className={`flex-1 pb-2.5 text-center text-xs font-bold transition cursor-pointer relative ${
                    bottomTab === 'beneficiaries'
                      ? 'text-[#70189F]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Beneficiaries
                  {bottomTab === 'beneficiaries' && (
                    <div className="absolute bottom-0 inset-x-8 h-0.5 bg-[#70189F] rounded-full" />
                  )}
                </button>
              </div>

              {/* List Content */}
              <div className="pt-2 divide-y divide-gray-50">
                {bottomTab === 'recent' ? (
                  recentTransfers.length > 0 ? (
                    recentTransfers.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectRecent(item)}
                        className="py-3 flex items-center justify-between hover:bg-gray-50/80 rounded-xl px-1 transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          {/* Circle Avatar with Initials */}
                          <div className="w-10 h-10 rounded-full bg-purple-100/90 text-[#70189F] font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {item.initials}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-800">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-gray-400 font-mono">
                              {item.accountNumber.slice(0, 1)}*********{item.accountNumber.slice(-4)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-gray-400">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteRecent(item.id, e)}
                            className="p-1 hover:text-red-500 transition cursor-pointer"
                            title="Remove from recent"
                          >
                            <Trash2 className="w-4 h-4 stroke-[1.8]" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-gray-400">
                      No recent transfers
                    </div>
                  )
                ) : (
                  <div className="text-center py-6 text-xs text-gray-400">
                    No saved beneficiaries yet
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </main>

      {/* ================= REGISTERED BANK ACCOUNTS MODAL ================= */}
      <RegisteredAccountsModal
        isOpen={showRegisteredModal}
        onClose={() => setShowRegisteredModal(false)}
        onSelect={handleSelectRegisteredAccount}
        currentSelectedAccount={phoneOrAccount}
        title="Registered Bank Accounts"
      />

      {/* ========================================================================= */}
      {/* CBE PIN CONFIRMATION BOTTOM SHEET (EXACTLY MATCHING IMAGE 2: IMG_0553.jpeg) */}
      {/* ========================================================================= */}
      {showPinSheet && (
        <div className="fixed inset-0 z-[130] bg-black/50 backdrop-blur-2xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-t-[32px] sm:rounded-3xl pt-3 pb-6 px-5 max-w-sm w-full shadow-2xl border border-gray-100 flex flex-col animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Top Row: Gray Drag Handle (Centered) & Red Circular Close Button (Right) */}
            <div className="relative flex items-center justify-center mb-1">
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto" />
              <button
                type="button"
                id="btn-close-pin-sheet"
                onClick={() => {
                  setShowPinSheet(false);
                  setPin('');
                  setPinError('');
                }}
                className="absolute right-0 top-0 w-7 h-7 bg-red-100/70 hover:bg-red-200 active:scale-90 text-red-500 rounded-full flex items-center justify-center transition cursor-pointer p-0"
                aria-label="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Title: "Enter your PIN to confirm" in CBE Purple */}
            <div className="text-center pt-2 pb-1">
              <h3 className="text-base font-bold text-[#70189F] tracking-tight">
                Enter your PIN to confirm
              </h3>
            </div>

            {/* 6 Circle PIN Indicators */}
            <div className="flex justify-center items-center gap-3.5 py-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                    pin.length > i
                      ? 'bg-[#70189F] border-2 border-[#70189F] scale-110 shadow-2xs'
                      : 'border-2 border-gray-300 bg-transparent'
                  }`}
                />
              ))}
            </div>

            {/* Error Message */}
            {pinError && (
              <p className="text-xs font-semibold text-red-600 text-center animate-in fade-in pb-1">
                {pinError}
              </p>
            )}

            {/* Cancel text button */}
            <div className="text-center pb-3">
              <button
                type="button"
                onClick={() => {
                  setShowPinSheet(false);
                  setPin('');
                  setPinError('');
                }}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Keypad Grid with soft rounded-2xl buttons */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[280px] sm:max-w-[300px] mx-auto w-full pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  id={`pin-key-${num}`}
                  type="button"
                  onClick={() => {
                    if (pin.length < 6) {
                      const next = pin + num;
                      setPin(next);
                      setPinError('');
                    }
                  }}
                  className="h-12 bg-gray-100/80 hover:bg-gray-200/80 active:bg-gray-300/80 active:scale-95 rounded-2xl flex items-center justify-center text-xl font-bold text-gray-800 transition cursor-pointer select-none"
                >
                  {num}
                </button>
              ))}

              {/* Bottom Row Left: Red Backspace / Delete Icon */}
              <button
                id="pin-key-delete"
                type="button"
                onClick={() => {
                  setPin((prev) => prev.slice(0, -1));
                  setPinError('');
                }}
                className="h-12 bg-gray-100/80 hover:bg-gray-200/80 active:bg-gray-300/80 active:scale-95 rounded-2xl flex items-center justify-center text-red-500 transition cursor-pointer select-none"
                title="Delete"
                aria-label="Delete"
              >
                <Delete className="w-5 h-5 text-red-500 stroke-[2]" />
              </button>

              {/* Bottom Row Middle: 0 */}
              <button
                id="pin-key-0"
                type="button"
                onClick={() => {
                  if (pin.length < 6) {
                    const next = pin + '0';
                    setPin(next);
                    setPinError('');
                  }
                }}
                className="h-12 bg-gray-100/80 hover:bg-gray-200/80 active:bg-gray-300/80 active:scale-95 rounded-2xl flex items-center justify-center text-xl font-bold text-gray-800 transition cursor-pointer select-none"
              >
                0
              </button>

              {/* Bottom Row Right: Checkmark ✓ Right Icon */}
              <button
                id="pin-btn-submit-right-icon"
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmPin}
                className={`h-12 bg-gray-100/80 hover:bg-gray-200/80 active:bg-gray-300/80 active:scale-95 rounded-2xl flex items-center justify-center transition cursor-pointer select-none ${
                  pin.length === 6 ? 'text-[#70189F]' : 'text-gray-400'
                }`}
                title="Confirm PIN & View Receipt"
                aria-label="Confirm PIN"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#70189F]" />
                ) : (
                  <Check className={`w-6 h-6 stroke-[2.5] ${pin.length === 6 ? 'text-[#70189F]' : 'text-gray-400'}`} />
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default CbeTransfer;

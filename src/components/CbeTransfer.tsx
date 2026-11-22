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
  Landmark,
  Wallet,
  Calculator,
  PlusSquare,
  Trash2,
  ChevronRight,
  X
} from 'lucide-react';
import { UserProfile, Transaction, Beneficiary, RegisteredAccountInfo } from '../types';
import { LocalDb } from '../lib/mockData';
import { RegisteredAccountsModal } from './RegisteredAccountsModal';
import { TransferBiometricGate } from './TransferBiometricGate';
import { BiometricAuthService } from '../services/biometricAuthService';

interface CbeTransferProps {
  currentUser: UserProfile;
  onTransactionComplete: (tx: Transaction) => void;
  onBack: () => void;
}

interface RecentTransferItem {
  id: string;
  name: string;
  fullName?: string;
  initials: string;
  accountNumber: string;
  avatarBg?: string;
}

const DEFAULT_RECENT_TRANSFERS: RecentTransferItem[] = [
  {
    id: 'rec_1',
    name: 'Mekdes Getabalehu',
    fullName: 'Mekdes Getabalehu',
    initials: 'MG',
    accountNumber: '1000284719155',
    avatarBg: 'bg-purple-100 text-purple-700'
  },
  {
    id: 'rec_2',
    name: 'Kess-jemane Yilma',
    fullName: 'Kess-jemane Yilma Desalegn',
    initials: 'KY',
    accountNumber: '1000392816068',
    avatarBg: 'bg-purple-100 text-purple-700'
  },
  {
    id: 'rec_3',
    name: 'Kes Asegidew Negese',
    fullName: 'Kes Asegidew Negese',
    initials: 'KA',
    accountNumber: '1000491828218',
    avatarBg: 'bg-purple-100 text-purple-700'
  },
  {
    id: 'rec_4',
    name: 'Belew Demissie Bereded',
    fullName: 'Belew Demissie Bereded',
    initials: 'BD',
    accountNumber: '1000582914562',
    avatarBg: 'bg-purple-100 text-purple-700'
  }
];

function maskAccountNumber(accountRaw: string): string {
  const clean = (accountRaw || '').replace(/\s+/g, '');
  if (clean.length < 8) return clean;
  return `${clean.slice(0, 1)}********${clean.slice(-4)}`;
}

export const CbeTransfer: React.FC<CbeTransferProps> = ({
  currentUser,
  onTransactionComplete,
  onBack,
}) => {
  // Sender's accounts
  const userAccounts = useMemo(() => 
    LocalDb.getUserAccounts(currentUser.id),
    [currentUser.id]
  );
  const [selectedFromAccId, setSelectedFromAccId] = useState<string>(() => {
    const accs = LocalDb.getUserAccounts(currentUser.id);
    const primary = accs.find(a => a.isPrimary) || accs[0];
    return primary ? primary.id : '';
  });

  useEffect(() => {
    const accs = LocalDb.getUserAccounts(currentUser.id);
    const primary = accs.find(a => a.isPrimary) || accs[0];
    if (primary) setSelectedFromAccId(primary.id);
  }, [currentUser.id]);

  const selectedFromAccountObj = useMemo(() => {
    return userAccounts.find(a => a.id === selectedFromAccId);
  }, [userAccounts, selectedFromAccId]);

  const currentAvailableBalance = selectedFromAccountObj?.balance ?? currentUser.balance;

  // Balance visibility toggle (starts hidden with dots as seen in screenshots)
  const [showBalance, setShowBalance] = useState(false);

  // Selected recipient from Recent Transfers / Beneficiaries opens the dedicated Transfer page (Image 2)
  const [selectedRecipient, setSelectedRecipient] = useState<RecentTransferItem | null>(null);

  // Form fields
  const [phoneOrAccount, setPhoneOrAccount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [amount, setAmount] = useState('');
  const [isRemarkOpen, setIsRemarkOpen] = useState(false);
  const [remark, setRemark] = useState('');

  // Quick calculator modal state
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [calcExpr, setCalcExpr] = useState('');

  // Bottom Tabs: 'recent' | 'beneficiaries'
  const [bottomTab, setBottomTab] = useState<'recent' | 'beneficiaries'>('recent');
  const [recentTransfers, setRecentTransfers] = useState<RecentTransferItem[]>(() => {
    try {
      const stored = localStorage.getItem('cbe_recent_transfers');
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_RECENT_TRANSFERS;
  });

  const beneficiaries = useMemo<Beneficiary[]>(() => {
    try {
      return LocalDb.getBeneficiaries(currentUser.id) || [];
    } catch {
      return [];
    }
  }, [currentUser.id]);

  // Flow states: 'form' | 'biometric_gate' | 'confirm_pin'
  const [showBiometricGate, setShowBiometricGate] = useState(false);
  const [biometricConfirmed, setBiometricConfirmed] = useState(false);
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
          setRecipientName(matchingRecent.fullName || matchingRecent.name);
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

  // Resolve fullest known name for a recent/beneficiary item
  const resolveRecipientFullName = (item: RecentTransferItem): string => {
    if (item.fullName) return item.fullName;
    const matchedReg = LocalDb.findRegisteredAccount(item.accountNumber);
    if (matchedReg?.accountName && matchedReg.accountName.length >= item.name.length) {
      return matchedReg.accountName;
    }
    const knownDefault = DEFAULT_RECENT_TRANSFERS.find(d => d.accountNumber === item.accountNumber);
    if (knownDefault?.fullName) return knownDefault.fullName;
    return item.name;
  };

  // Clicking an item from Recent Transfers -> navigate to dedicated "Transfer" page (Image 2)
  const handleSelectRecent = (item: RecentTransferItem) => {
    const fullResolvedName = resolveRecipientFullName(item);
    setSelectedRecipient({ ...item, fullName: fullResolvedName });
    setPhoneOrAccount(item.accountNumber);
    setRecipientName(fullResolvedName);
    setAmount('');
    setRemark('');
    setIsRemarkOpen(false);
    setErrorMsg('');
  };

  const handleSelectBeneficiary = (b: Beneficiary) => {
    const accountNum = (b.accountNumber || b.phone || '').replace(/\D/g, '');
    const parts = (b.name || '').trim().split(/\s+/);
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : (b.name || 'CB').slice(0, 2).toUpperCase();
    handleSelectRecent({
      id: b.id,
      name: b.name,
      fullName: b.name,
      initials,
      accountNumber: accountNum,
    });
  };

  const handleExitRecipientPage = () => {
    setSelectedRecipient(null);
    setShowPinSheet(false);
    setShowCalcModal(false);
    setPin('');
    setPinError('');
    setErrorMsg('');
    setAmount('');
    setRemark('');
    setIsRemarkOpen(false);
  };

  const handleDeleteRecent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentTransfers.filter(item => item.id !== id);
    setRecentTransfers(updated);
    try {
      localStorage.setItem('cbe_recent_transfers', JSON.stringify(updated));
    } catch {}
  };

  // Cycle source account if user owns multiple accounts
  const handleCycleFromAccount = () => {
    if (userAccounts.length <= 1) return;
    const idx = userAccounts.findIndex(a => a.id === selectedFromAccId);
    const next = userAccounts[(idx + 1) % userAccounts.length];
    if (next) setSelectedFromAccId(next.id);
  };

  // Handle hardware / virtual phone back
  useEffect(() => {
    const handlePhoneBack = (e: any) => {
      if (showCalcModal) {
        setShowCalcModal(false);
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        return;
      }
      if (showRegisteredModal) {
        setShowRegisteredModal(false);
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        return;
      }
      if (showBiometricGate) {
        setShowBiometricGate(false);
        setBiometricConfirmed(false);
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        return;
      }
      if (showPinSheet) {
        setShowPinSheet(false);
        setBiometricConfirmed(false);
        setPin('');
        setPinError('');
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        return;
      }
      if (selectedRecipient) {
        handleExitRecipientPage();
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
  }, [showCalcModal, showRegisteredModal, showBiometricGate, showPinSheet, selectedRecipient, onBack]);

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
          setRecipientName(matchingRecent.fullName || matchingRecent.name);
        } else {
          setRecipientName('Ayenew Wubete Parent Wubete Hotel');
        }
      }
    }

    // Dismiss any OS soft keyboard before showing biometric confirmation
    try {
      (document.activeElement as HTMLElement | null)?.blur?.();
    } catch {}

    // Step 1 (Required): Confirm it's you with Fingerprint (Android) or Face ID (iOS) before PIN
    setPin('');
    setPinError('');
    setBiometricConfirmed(false);
    setShowPinSheet(false);
    setShowBiometricGate(true);
  };

  // Step 2 (Required): Confirm 6-digit PIN after biometric confirmation -> complete transfer & show receipt
  const handleConfirmPin = () => {
    if (!biometricConfirmed) {
      setShowPinSheet(false);
      setShowBiometricGate(true);
      return;
    }

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
            fullName: targetName,
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
      setBiometricConfirmed(false);

      // Navigate to official CBE Receipt view
      onTransactionComplete(newTx);
    }, 350);
  };

  // Mini calculator evaluation helper
  const evaluateCalculator = (expr: string): string => {
    const cleaned = expr.replace(/[^0-9+\-*/.]/g, '');
    if (!cleaned) return '';
    try {
      const tokens = cleaned.match(/(\d+(\.\d+)?|[+\-*/])/g);
      if (!tokens || tokens.length === 0) return '';
      let values: number[] = [];
      let ops: string[] = [];
      const applyOp = () => {
        const b = values.pop();
        const a = values.pop();
        const op = ops.pop();
        if (a === undefined || b === undefined || !op) return;
        if (op === '+') values.push(a + b);
        else if (op === '-') values.push(a - b);
        else if (op === '*') values.push(a * b);
        else if (op === '/') values.push(b === 0 ? 0 : a / b);
      };
      const prec = (op: string) => (op === '*' || op === '/' ? 2 : 1);
      for (const tok of tokens) {
        if (/^\d/.test(tok)) {
          values.push(parseFloat(tok));
        } else {
          while (ops.length > 0 && prec(ops[ops.length - 1]) >= prec(tok)) {
            applyOp();
          }
          ops.push(tok);
        }
      }
      while (ops.length > 0) applyOp();
      const res = values[0];
      if (res === undefined || isNaN(res) || !isFinite(res) || res <= 0) return '';
      return Number.isInteger(res) ? String(res) : res.toFixed(2);
    } catch {
      return '';
    }
  };

  // Masked account representations
  const senderAccountRaw = selectedFromAccountObj?.accountNumber || currentUser.accountNumber || '1000419524747';
  const senderDisplayMasked = maskAccountNumber(senderAccountRaw);
  const senderAccountLabel = selectedFromAccountObj?.accountType === 'checking' ? 'Current Account' : 'Saving Account';

  const recipientAccountRaw = selectedRecipient
    ? selectedRecipient.accountNumber
    : (phoneOrAccount.length === 13
        ? phoneOrAccount
        : (phoneOrAccount ? `1000${phoneOrAccount.slice(-9)}` : '1000284715104'));

  const recipientDisplayMasked = maskAccountNumber(recipientAccountRaw);
  const activeRecipientName = selectedRecipient
    ? (selectedRecipient.fullName || selectedRecipient.name)
    : (recipientName.trim() || 'Ayenew Wubete Parent Wubete Hotel');

  return (
    <div className="w-full flex-1 flex flex-col bg-[#F5F4F7] min-h-0 overflow-hidden relative select-none">
      
      {/* 1. TOP PURPLE CBE HEADER */}
      <div className="bg-[#70189F] text-white pt-[max(env(safe-area-inset-top,0px),12px)] pb-6 px-4 flex-shrink-0 relative z-10">
        <div className="max-w-md mx-auto flex items-center gap-3.5">
          <button
            id="btn-cbe-transfer-back"
            type="button"
            onClick={() => {
              if (showBiometricGate) {
                setShowBiometricGate(false);
                setBiometricConfirmed(false);
              } else if (showPinSheet) {
                setShowPinSheet(false);
                setBiometricConfirmed(false);
                setPin('');
                setPinError('');
              } else if (selectedRecipient) {
                handleExitRecipientPage();
              } else {
                onBack();
              }
            }}
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition cursor-pointer text-white flex items-center justify-center flex-shrink-0"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.4] -ml-0.5" />
          </button>
          <h1 className="text-[19px] font-semibold text-white tracking-tight">
            {selectedRecipient || showBiometricGate || showPinSheet ? 'Transfer' : 'CBE Transfer'}
          </h1>
        </div>
      </div>

      {/* 2. ROUNDED LIGHT SHEET BODY */}
      <main className="flex-1 w-full bg-[#F5F4F7] rounded-t-[26px] -mt-3 overflow-y-auto scrollbar-none pb-8 z-20">
        <div className="max-w-md mx-auto w-full px-4 pt-4 space-y-3.5">

          {/* Error Alert Banner */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-2xl flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {selectedRecipient ? (
            /* ===================================================================== */
            /* DEDICATED TRANSFER PAGE FOR SELECTED RECENT / BENEFICIARY (IMAGE 2)   */
            /* ===================================================================== */
            <form onSubmit={handleInitiateTransfer} className="space-y-3.5 animate-in fade-in duration-150">
              
              {/* 1. "Transfer to" Card */}
              <div className="bg-[#ECEAEF] rounded-[18px] px-4 py-3.5">
                <span className="text-[12.5px] text-[#6B6875] font-normal block mb-2">
                  Transfer to
                </span>
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-[#DFD5EA] text-[#70189F] flex items-center justify-center flex-shrink-0">
                    <Landmark className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15.5px] font-semibold text-[#3C244E] leading-snug break-words">
                      {activeRecipientName}
                    </p>
                    <p className="text-[13px] text-[#6B6875] font-normal tracking-wide mt-0.5">
                      {recipientDisplayMasked}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. "From Account" Dark Charcoal Card */}
              <div
                onClick={handleCycleFromAccount}
                className={`bg-gradient-to-br from-[#353739] via-[#2C2D30] to-[#232426] text-white rounded-[18px] px-4 py-3.5 shadow-xs space-y-1 ${
                  userAccounts.length > 1 ? 'cursor-pointer active:opacity-95' : ''
                }`}
              >
                <span className="text-[13px] text-[#D7AC4C] font-normal block">
                  From Account
                </span>
                <p className="text-[14.5px] tracking-wide text-[#EAECEF]">
                  <span className="font-normal">{senderAccountLabel}</span>{' '}
                  <span className="font-semibold text-white">{senderDisplayMasked}</span>
                </p>
                <div className="flex items-center gap-2.5 pt-0.5 h-6 whitespace-nowrap">
                  <span className="text-[15px] font-semibold tracking-[0.14em] text-white/95 tabular-nums leading-none">
                    {showBalance 
                      ? `ETB ${currentAvailableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '••••••'
                    }
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBalance(!showBalance);
                    }}
                    className="text-white/80 hover:text-white transition p-0.5 cursor-pointer flex items-center justify-center"
                    title={showBalance ? 'Hide balance' : 'Show balance'}
                    aria-label={showBalance ? 'Hide balance' : 'Show balance'}
                  >
                    {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 3. Amount* Input Card */}
              <div className="bg-[#F9F8FB] border border-[#E6E4EE] focus-within:border-[#70189F] focus-within:bg-white rounded-[16px] h-[54px] px-3.5 flex items-center gap-3 transition">
                <Wallet className="w-5 h-5 text-[#70189F]/85 stroke-[1.7] flex-shrink-0" />
                <input
                  id="input-direct-transfer-amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="1"
                  placeholder="Amount*"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setErrorMsg('');
                  }}
                  className="flex-1 min-w-0 bg-transparent text-[15px] font-medium text-gray-900 placeholder:text-[#8E8B97] focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    setCalcExpr(amount || '');
                    setShowCalcModal(true);
                  }}
                  className="text-[#70189F]/85 hover:text-[#70189F] active:scale-90 transition cursor-pointer p-1 flex-shrink-0"
                  title="Open calculator"
                  aria-label="Open amount calculator"
                >
                  <Calculator className="w-5 h-5 stroke-[1.7]" />
                </button>
              </div>

              {/* 4. + Add remark Row */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsRemarkOpen(!isRemarkOpen)}
                  className="flex items-center gap-2 text-[13.5px] text-[#70189F] hover:text-[#58117D] transition cursor-pointer py-1"
                >
                  <PlusSquare className="w-[18px] h-[18px] text-[#70189F] stroke-[1.8]" />
                  <span className="font-medium">Add remark</span>
                </button>

                {isRemarkOpen && (
                  <div className="mt-2 animate-in fade-in">
                    <input
                      id="input-direct-transfer-remark"
                      type="text"
                      placeholder="Enter remark (Default: MB transfer)..."
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      className="w-full bg-white border border-[#E6E4EE] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#70189F]"
                    />
                  </div>
                )}
              </div>

              {/* 5. Primary "Transfer" Pill Button */}
              <div className="pt-2">
                <button
                  id="btn-submit-direct-transfer"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-[#7B1FA2] to-[#70189F] hover:from-[#6A188C] hover:to-[#5C1282] active:scale-[0.99] disabled:opacity-50 text-white font-semibold py-3.5 rounded-full text-[15.5px] transition shadow-xs flex items-center justify-center cursor-pointer"
                >
                  Transfer
                </button>
              </div>
            </form>
          ) : showBiometricGate || showPinSheet ? (
            /* Transfer summary cards visible behind Biometric & PIN sheets when initiated from main CBE Transfer form */
            <div className="space-y-3 pt-1">
              <div className="bg-[#ECEAEF] rounded-[18px] px-4 py-3.5">
                <span className="text-[12.5px] text-[#6B6875] font-normal block mb-2">Transfer to</span>
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-[#DFD5EA] text-[#70189F] flex items-center justify-center flex-shrink-0">
                    <Landmark className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15.5px] font-semibold text-[#3C244E] truncate">
                      {activeRecipientName}
                    </p>
                    <p className="text-[13px] text-[#6B6875] font-normal tracking-wide">
                      {recipientDisplayMasked}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#353739] via-[#2C2D30] to-[#232426] text-white rounded-[18px] px-4 py-3.5 shadow-xs space-y-1">
                <span className="text-[13px] text-[#D7AC4C] font-normal">From Account</span>
                <p className="text-[14.5px] tracking-wide text-[#EAECEF]">
                  <span className="font-normal">{senderAccountLabel}</span>{' '}
                  <span className="font-semibold text-white">{senderDisplayMasked}</span>
                </p>
              </div>
            </div>
          ) : (
            /* ===================================================================== */
            /* MAIN CBE TRANSFER SCREEN (IMAGE 1)                                    */
            /* ===================================================================== */
            <div className="space-y-4">
              
              {/* FROM ACCOUNT CARD - Dark charcoal card matching Image 1 */}
              <div
                onClick={handleCycleFromAccount}
                className={`bg-gradient-to-br from-[#353739] via-[#2C2D30] to-[#232426] text-white rounded-[18px] px-4 py-3.5 shadow-xs space-y-1 ${
                  userAccounts.length > 1 ? 'cursor-pointer active:opacity-95' : ''
                }`}
              >
                <span className="text-[13px] text-[#D7AC4C] font-normal block">From Account</span>
                <p className="text-[14.5px] tracking-wide text-[#EAECEF]">
                  <span className="font-normal">{senderAccountLabel}</span>{' '}
                  <span className="font-semibold text-white">{senderDisplayMasked}</span>
                </p>
                <div className="flex items-center gap-2.5 pt-0.5 h-6 whitespace-nowrap">
                  <span className="text-[15px] font-semibold tracking-[0.14em] text-white/95 tabular-nums leading-none">
                    {showBalance 
                      ? `ETB ${currentAvailableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '••••••'
                    }
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBalance(!showBalance);
                    }}
                    className="text-white/80 hover:text-white transition p-0.5 cursor-pointer flex items-center justify-center"
                    title={showBalance ? 'Hide balance' : 'Show balance'}
                    aria-label={showBalance ? 'Hide balance' : 'Show balance'}
                  >
                    {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* TRANSFER FORM */}
              <form onSubmit={handleInitiateTransfer} className="space-y-3.5">
                
                {/* Phone Number / Account Input with bank icon on left and person icon on right */}
                <div className="relative bg-[#F9F8FB] border border-[#E6E4EE] focus-within:border-[#70189F] focus-within:bg-white rounded-[16px] h-[54px] px-3.5 flex items-center gap-3 transition">
                  <Landmark className="w-5 h-5 text-[#70189F]/80 stroke-[1.7] flex-shrink-0" />
                  <input
                    id="input-recipient-phone-or-account"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={13}
                    placeholder="Phone Number"
                    value={phoneOrAccount}
                    onChange={(e) => handleRecipientChange(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-[15px] font-medium text-gray-900 placeholder:text-[#8E8B97] focus:outline-none"
                    required
                  />
                  
                  {/* Person Icon Button -> Opens list of Registered Bank Accounts */}
                  <button
                    type="button"
                    id="btn-open-registered-accounts"
                    onClick={() => setShowRegisteredModal(true)}
                    className="text-[#70189F]/85 hover:text-[#70189F] active:scale-90 transition cursor-pointer p-1 flex-shrink-0"
                    title="Registered Bank Accounts"
                    aria-label="List of registered bank accounts"
                  >
                    <UserPlus className="w-5 h-5 stroke-[1.7]" />
                  </button>
                </div>

                {/* Amount Field with wallet icon and calculator button */}
                <div className="relative bg-[#F9F8FB] border border-[#E6E4EE] focus-within:border-[#70189F] focus-within:bg-white rounded-[16px] h-[54px] px-3.5 flex items-center gap-3 transition">
                  <Wallet className="w-5 h-5 text-[#70189F]/80 stroke-[1.7] flex-shrink-0" />
                  <input
                    id="input-transfer-amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="1"
                    placeholder="Amount*"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setErrorMsg('');
                    }}
                    className="flex-1 min-w-0 bg-transparent text-[15px] font-medium text-gray-900 placeholder:text-[#8E8B97] focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCalcExpr(amount || '');
                      setShowCalcModal(true);
                    }}
                    className="text-[#70189F]/80 hover:text-[#70189F] active:scale-90 transition cursor-pointer p-1 flex-shrink-0"
                    title="Open calculator"
                    aria-label="Open amount calculator"
                  >
                    <Calculator className="w-5 h-5 stroke-[1.7]" />
                  </button>
                </div>

                {/* Add remark *Default: MB transfer */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setIsRemarkOpen(!isRemarkOpen)}
                    className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition cursor-pointer py-0.5"
                  >
                    <PlusSquare className="w-[18px] h-[18px] text-[#70189F] stroke-[1.8]" />
                    <span className="font-medium text-[13px] text-[#4B4856]">Add remark</span>
                    <span className="text-[11.5px] text-gray-500 italic">*Default: MB transfer</span>
                  </button>
                  
                  {isRemarkOpen && (
                    <div className="mt-2 animate-in fade-in">
                      <input
                        type="text"
                        placeholder="Enter remark..."
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="w-full bg-white border border-[#E6E4EE] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:border-[#70189F]"
                      />
                    </div>
                  )}
                </div>

                {/* Solid Purple Continue Pill Button */}
                <div className="pt-1.5">
                  <button
                    id="btn-submit-cbe-transfer"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-[#7B1FA2] to-[#70189F] hover:from-[#6A188C] hover:to-[#5C1282] active:scale-[0.99] disabled:opacity-50 text-white font-semibold py-3.5 rounded-full text-[15.5px] transition shadow-xs flex items-center justify-center cursor-pointer"
                  >
                    Continue
                  </button>
                </div>
              </form>

              {/* BOTTOM TABS: Recent Transfers vs Beneficiaries */}
              <div className="pt-2">
                <div className="flex border-b border-gray-200/80">
                  <button
                    type="button"
                    onClick={() => setBottomTab('recent')}
                    className={`flex-1 pb-2.5 text-center text-[13.5px] font-semibold transition cursor-pointer relative ${
                      bottomTab === 'recent'
                        ? 'text-[#70189F]'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Recent Transfers
                    {bottomTab === 'recent' && (
                      <div className="absolute bottom-0 inset-x-6 h-[2.5px] bg-[#70189F] rounded-full" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setBottomTab('beneficiaries')}
                    className={`flex-1 pb-2.5 text-center text-[13.5px] font-semibold transition cursor-pointer relative ${
                      bottomTab === 'beneficiaries'
                        ? 'text-[#70189F]'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Beneficiaries
                    {bottomTab === 'beneficiaries' && (
                      <div className="absolute bottom-0 inset-x-6 h-[2.5px] bg-[#70189F] rounded-full" />
                    )}
                  </button>
                </div>

                {/* List Content */}
                <div className="pt-3 space-y-2.5">
                  {bottomTab === 'recent' ? (
                    recentTransfers.length > 0 ? (
                      recentTransfers.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectRecent(item)}
                          className="bg-[#ECEAEF]/75 hover:bg-[#ECEAEF] active:scale-[0.99] px-3.5 py-3 flex items-center justify-between rounded-[16px] transition cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Circle Avatar with Initials */}
                            <div className="w-10 h-10 rounded-full bg-[#DFD5EA] text-[#70189F] font-semibold text-xs flex items-center justify-center flex-shrink-0">
                              {item.initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13.5px] font-semibold text-[#3C244E] truncate">
                                {item.name}
                              </p>
                              <p className="text-[12px] text-[#6B6875] tracking-wide">
                                {maskAccountNumber(item.accountNumber)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-gray-500 flex-shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteRecent(item.id, e)}
                              className="p-1.5 hover:text-red-500 transition cursor-pointer rounded-full"
                              title="Remove from recent"
                            >
                              <Trash2 className="w-4 h-4 stroke-[1.7]" />
                            </button>
                            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition" />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-xs text-gray-400">
                        No recent transfers
                      </div>
                    )
                  ) : (
                    beneficiaries.length > 0 ? (
                      beneficiaries.map((b) => {
                        const acc = (b.accountNumber || b.phone || '').replace(/\D/g, '');
                        const parts = (b.name || '').trim().split(/\s+/);
                        const initials = parts.length >= 2
                          ? (parts[0][0] + parts[1][0]).toUpperCase()
                          : (b.name || 'CB').slice(0, 2).toUpperCase();
                        return (
                          <div
                            key={b.id}
                            onClick={() => handleSelectBeneficiary(b)}
                            className="bg-[#ECEAEF]/75 hover:bg-[#ECEAEF] active:scale-[0.99] px-3.5 py-3 flex items-center justify-between rounded-[16px] transition cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-full bg-[#DFD5EA] text-[#70189F] font-semibold text-xs flex items-center justify-center flex-shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13.5px] font-semibold text-[#3C244E] truncate">
                                  {b.name}
                                </p>
                                <p className="text-[12px] text-[#6B6875] tracking-wide">
                                  {maskAccountNumber(acc)}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition flex-shrink-0" />
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-xs text-gray-400">
                        No saved beneficiaries yet
                      </div>
                    )
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* ================= MINI AMOUNT CALCULATOR MODAL ================= */}
      {showCalcModal && (
        <div
          className="fixed inset-0 z-[125] bg-black/50 backdrop-blur-2xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowCalcModal(false)}
        >
          <div
            className="bg-white rounded-t-[28px] sm:rounded-3xl p-4 pb-6 max-w-xs w-full shadow-2xl border border-gray-100 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#70189F]">Amount Calculator</span>
              <button
                type="button"
                onClick={() => setShowCalcModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-[#F5F4F7] rounded-2xl px-3.5 py-3 text-right font-mono text-xl font-bold text-gray-900 min-h-[52px] flex items-center justify-end overflow-x-auto">
              {calcExpr || '0'}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', 'C', '0', '.', '+'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (key === 'C') setCalcExpr('');
                    else setCalcExpr((prev) => prev + key);
                  }}
                  className={`h-11 rounded-xl font-bold text-base transition active:scale-95 cursor-pointer ${
                    ['/', '*', '-', '+'].includes(key)
                      ? 'bg-purple-100 text-[#70189F]'
                      : key === 'C'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCalcExpr((prev) => prev.slice(0, -1))}
                className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm cursor-pointer"
              >
                DEL
              </button>
              <button
                type="button"
                onClick={() => {
                  const evaluated = evaluateCalculator(calcExpr);
                  if (evaluated) {
                    setAmount(evaluated);
                    setErrorMsg('');
                  }
                  setShowCalcModal(false);
                }}
                className="flex-1 py-2.5 rounded-full bg-[#70189F] hover:bg-[#5C1282] text-white font-semibold text-sm cursor-pointer"
              >
                Use Amount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= REGISTERED BANK ACCOUNTS MODAL ================= */}
      <RegisteredAccountsModal
        isOpen={showRegisteredModal}
        onClose={() => setShowRegisteredModal(false)}
        onSelect={handleSelectRegisteredAccount}
        currentSelectedAccount={phoneOrAccount}
        title="Registered Bank Accounts"
      />

      {/* ========================================================================= */}
      {/* STEP 1: BIOMETRIC IDENTITY CONFIRMATION (FINGERPRINT / FACE ID)           */}
      {/* ========================================================================= */}
      <TransferBiometricGate
        open={showBiometricGate}
        user={currentUser}
        amountDisplay={
          amount && !isNaN(parseFloat(amount))
            ? `ETB ${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : undefined
        }
        recipientName={activeRecipientName}
        onConfirmed={() => {
          setBiometricConfirmed(true);
          setShowBiometricGate(false);
          setPin('');
          setPinError('');
          setShowPinSheet(true);
        }}
        onCancel={() => {
          setShowBiometricGate(false);
          setBiometricConfirmed(false);
        }}
      />

      {/* ========================================================================= */}
      {/* STEP 2: CBE PIN CONFIRMATION BOTTOM SHEET (ONLY AFTER BIOMETRIC CONFIRMED) */}
      {/* ========================================================================= */}
      {showPinSheet && biometricConfirmed && (
        <div className="fixed inset-0 z-[130] bg-black/50 backdrop-blur-2xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-t-[32px] sm:rounded-3xl pt-3 pb-[max(env(safe-area-inset-bottom,0px),60px)] sm:pb-6 px-5 max-w-sm w-full shadow-2xl border border-gray-100 flex flex-col animate-in slide-in-from-bottom-6 duration-200"
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
                  setBiometricConfirmed(false);
                  setPin('');
                  setPinError('');
                }}
                className="absolute right-0 top-0 w-7 h-7 bg-red-100/70 hover:bg-red-200 active:scale-90 text-red-500 rounded-full flex items-center justify-center transition cursor-pointer p-0"
                aria-label="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Verified Identity Indicator + Title: "Enter your PIN to confirm" */}
            <div className="text-center pt-2 pb-1">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#16a34a] mb-1">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>
                  {BiometricAuthService.getBiometricMethod() === 'faceid'
                    ? 'Face ID confirmed • Step 2 of 2'
                    : 'Fingerprint confirmed • Step 2 of 2'}
                </span>
              </div>
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
                  setBiometricConfirmed(false);
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

              {/* Bottom Row Right: Checkmark ✓ Right Icon — solid CBE purple when all 6 digits are filled */}
              <button
                id="pin-btn-submit-right-icon"
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmPin}
                className={`h-12 active:scale-95 rounded-2xl flex items-center justify-center transition-all duration-150 cursor-pointer select-none ${
                  pin.length === 6
                    ? 'bg-[#70189F] hover:bg-[#5e1385] active:bg-[#4e0f70] text-white shadow-md shadow-purple-900/25'
                    : 'bg-gray-100/80 hover:bg-gray-200/80 active:bg-gray-300/80 text-gray-400'
                }`}
                title="Confirm PIN & View Receipt"
                aria-label="Confirm PIN"
              >
                {isSubmitting ? (
                  <Loader2 className={`w-5 h-5 animate-spin ${pin.length === 6 ? 'text-white' : 'text-[#70189F]'}`} />
                ) : (
                  <Check className={`w-6 h-6 stroke-[2.75] ${pin.length === 6 ? 'text-white' : 'text-gray-400'}`} />
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

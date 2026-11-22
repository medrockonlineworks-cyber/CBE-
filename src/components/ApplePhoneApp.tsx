import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Phone,
  Search,
  Mic,
  MicOff,
  Volume2,
  UserPlus,
  Video,
  Grid,
  X,
  Clock,
  UserCircle2,
  User,
  ChevronRight,
  Info,
  Check,
  Bell,
} from 'lucide-react';
import { UserProfile, Transaction } from '../types';
import { PhoneCallService, CallLogItem, CallerAccount, AccountTransactionItem } from '../services/phoneCallService';
import { LocalDb } from '../lib/mockData';
import { SmsService } from '../services/smsService';
import { TruecallerService } from '../services/truecallerService';
import SubAppPushModal from './SubAppPushModal';

interface ApplePhoneAppProps {
  currentUser?: UserProfile | null;
  onBack: () => void;
}

type IosUssdStep =
  | 'idle'
  | 'running'
  | 'cbe_login'
  | 'cbe_menu'
  | 'cbe_menu_page2'
  | 'cbe_select_account'
  | 'cbe_account_summary'
  | 'cbe_account_summary_page2'
  | 'cbe_tx_detail'
  | 'cbe_beneficiary'
  | 'cbe_fast_loan'
  | 'cbe_atm_cash_out'
  | 'cbe_airtime_menu'
  | 'cbe_airtime_amount'
  | 'cbe_other_transfers'
  | 'cbe_cbebirr'
  | 'cbe_transfer_acc'
  | 'cbe_transfer_amount'
  | 'cbe_transfer_confirm'
  | 'cbe_transfer_done'
  | 'ethio_telecom_balance'
  | 'error';

const DTMF_FREQS: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
};

function playDtmfTone(digit: string) {
  try {
    const pair = DTMF_FREQS[digit];
    if (!pair || typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    gain.connect(ctx.destination);

    pair.forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.12);
    });
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 200);
  } catch {
    // Audio playback optional
  }
}

function formatUssdTxAmount(amt: number): string {
  const num = Number.isFinite(amt) ? Math.abs(amt) : 0;
  return Number.isInteger(num) ? `${num}.0` : `${Math.round(num * 100) / 100}`;
}

function IosKeypadTabIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="6" cy="4.5" r="2" />
      <circle cx="12" cy="4.5" r="2" />
      <circle cx="18" cy="4.5" r="2" />
      <circle cx="6" cy="10" r="2" />
      <circle cx="12" cy="10" r="2" />
      <circle cx="18" cy="10" r="2" />
      <circle cx="6" cy="15.5" r="2" />
      <circle cx="12" cy="15.5" r="2" />
      <circle cx="18" cy="15.5" r="2" />
      <circle cx="12" cy="20.5" r="2" />
    </svg>
  );
}

function IosBackspaceIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 22" fill="none" className={className} aria-hidden="true">
      <path
        d="M9.6 2.5H23.5C24.88 2.5 26 3.62 26 5V17C26 18.38 24.88 19.5 23.5 19.5H9.6C8.83 19.5 8.1 19.14 7.63 18.53L2.5 11.78C2.14 11.32 2.14 10.68 2.5 10.22L7.63 3.47C8.1 2.86 8.83 2.5 9.6 2.5Z"
        fill="#58585C"
      />
      <path
        d="M13.2 7.7L19.8 14.3M19.8 7.7L13.2 14.3"
        stroke="#FFFFFF"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IosActivitySpinner() {
  const spokes = Array.from({ length: 8 }, (_, i) => i);
  return (
    <div className="relative w-7 h-7 mx-auto mb-2.5" aria-label="Loading">
      {spokes.map((idx) => (
        <span
          key={idx}
          className="absolute left-1/2 top-1/2 w-[2.5px] h-[7px] -ml-[1.25px] -mt-[12px] rounded-full bg-white animate-pulse"
          style={{
            transform: `rotate(${idx * 45}deg)`,
            transformOrigin: '1.25px 12px',
            opacity: 0.25 + (idx / 8) * 0.75,
            animationDelay: `${idx * 90}ms`,
            animationDuration: '720ms',
          }}
        />
      ))}
    </div>
  );
}

export const ApplePhoneApp: React.FC<ApplePhoneAppProps> = ({
  currentUser,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'calls' | 'contacts' | 'keypad'>('keypad');
  const [recentsFilter, setRecentsFilter] = useState<'all' | 'missed'>('all');
  const [dialedNumber, setDialedNumber] = useState<string>('');
  const [showSearchSheet, setShowSearchSheet] = useState<boolean>(false);
  const [showPushModal, setShowPushModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [callLogs, setCallLogs] = useState<CallLogItem[]>(() => {
    try {
      return PhoneCallService.getCallLogs();
    } catch {
      return [];
    }
  });
  const [callerAccounts, setCallerAccounts] = useState<CallerAccount[]>(() => {
    try {
      return PhoneCallService.getCallerAccounts();
    } catch {
      return [];
    }
  });
  const [activeCallerAccount, setActiveCallerAccount] = useState<CallerAccount | null>(() => {
    try {
      return PhoneCallService.getActiveCallerAccount();
    } catch {
      return null;
    }
  });

  // Active Calling State
  const [activeCall, setActiveCall] = useState<{
    contactName: string;
    phoneNumber: string;
    durationSeconds: number;
    isMuted: boolean;
    isSpeaker: boolean;
  } | null>(null);

  // Authentic Full-Screen iOS USSD State (Display Mode vs Reply Mode)
  const [ussdStep, setUssdStep] = useState<IosUssdStep>('idle');
  const [isUssdReplying, setIsUssdReplying] = useState<boolean>(false);
  const [ussdInput, setUssdInput] = useState<string>('');
  const [ussdErrorMessage, setUssdErrorMessage] = useState<string>('Error on: Failure during data access');
  const [selectedTxIndex, setSelectedTxIndex] = useState<number>(0);
  const [transferDraft, setTransferDraft] = useState<{
    recipientAccount: string;
    recipientName: string;
    amount: string;
  }>({ recipientAccount: '', recipientName: '', amount: '' });
  const [transferResultText, setTransferResultText] = useState<string>('');
  const [airtimeResultText, setAirtimeResultText] = useState<string>('');
  const [visualViewportBox, setVisualViewportBox] = useState<{ top: number; height: number } | null>(null);

  const replyInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track real visualViewport offsetTop & height so USSD Reply stays pinned cleanly above the native iOS keyboard
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const updateViewport = () => {
      setVisualViewportBox({
        top: Math.max(0, Math.round(vv.offsetTop)),
        height: Math.max(240, Math.round(vv.height)),
      });
    };
    updateViewport();
    vv.addEventListener('resize', updateViewport);
    vv.addEventListener('scroll', updateViewport);
    return () => {
      vv.removeEventListener('resize', updateViewport);
      vv.removeEventListener('scroll', updateViewport);
    };
  }, []);

  // Auto-focus real device keyboard when entering USSD Reply Mode and keep viewport anchored
  useEffect(() => {
    if (isUssdReplying && ussdStep !== 'idle' && ussdStep !== 'running') {
      const t = setTimeout(() => {
        replyInputRef.current?.focus({ preventScroll: true });
        try {
          window.scrollTo(0, 0);
        } catch {}
      }, 40);
      return () => clearTimeout(t);
    }
  }, [isUssdReplying, ussdStep]);

  // Live sync active caller account & logs on CBE / cross-app updates
  useEffect(() => {
    const syncPhoneState = () => {
      setCallerAccounts(PhoneCallService.getCallerAccounts());
      setActiveCallerAccount(PhoneCallService.getActiveCallerAccount());
      setCallLogs(PhoneCallService.getCallLogs());
    };
    window.addEventListener('caller_accounts_updated', syncPhoneState);
    window.addEventListener('caller_account_changed', syncPhoneState);
    window.addEventListener('cbe_account_switched', syncPhoneState);
    window.addEventListener('cbe_balance_updated', syncPhoneState);
    window.addEventListener('cbe_accounts_updated', syncPhoneState);
    window.addEventListener('cbe_transaction_completed', syncPhoneState);
    window.addEventListener('cbe_crossapp_synced', syncPhoneState);
    window.addEventListener('tana_data_updated', syncPhoneState);
    return () => {
      window.removeEventListener('caller_accounts_updated', syncPhoneState);
      window.removeEventListener('caller_account_changed', syncPhoneState);
      window.removeEventListener('cbe_account_switched', syncPhoneState);
      window.removeEventListener('cbe_balance_updated', syncPhoneState);
      window.removeEventListener('cbe_accounts_updated', syncPhoneState);
      window.removeEventListener('cbe_transaction_completed', syncPhoneState);
      window.removeEventListener('cbe_crossapp_synced', syncPhoneState);
      window.removeEventListener('tana_data_updated', syncPhoneState);
    };
  }, []);

  // Support Android/iOS hardware/swipe back button cleanly inside ApplePhoneApp
  useEffect(() => {
    const handleBack = (e: Event) => {
      const customEv = e as CustomEvent<{ setHandled?: () => void }>;
      if (isUssdReplying) {
        e.preventDefault();
        customEv.detail?.setHandled?.();
        setIsUssdReplying(false);
        return;
      }
      if (ussdStep !== 'idle') {
        e.preventDefault();
        customEv.detail?.setHandled?.();
        setUssdStep('idle');
        setUssdInput('');
        setIsUssdReplying(false);
        return;
      }
      if (activeCall) {
        e.preventDefault();
        customEv.detail?.setHandled?.();
        setActiveCall(null);
        return;
      }
      if (showSearchSheet) {
        e.preventDefault();
        customEv.detail?.setHandled?.();
        setShowSearchSheet(false);
        return;
      }
      if (activeTab !== 'keypad') {
        e.preventDefault();
        customEv.detail?.setHandled?.();
        setActiveTab('keypad');
        return;
      }
      e.preventDefault();
      customEv.detail?.setHandled?.();
      onBack();
    };
    window.addEventListener('cbe_phone_back', handleBack);
    return () => window.removeEventListener('cbe_phone_back', handleBack);
  }, [isUssdReplying, ussdStep, activeCall, showSearchSheet, activeTab, onBack]);

  // Call timer effect
  useEffect(() => {
    if (!activeCall) return;
    const interval = setInterval(() => {
      setActiveCall((prev) => (prev ? { ...prev, durationSeconds: prev.durationSeconds + 1 } : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall]);

  // Active account details synced with CBE
  const activeAccountNumber = activeCallerAccount?.accountNumber || currentUser?.accountNumber || '1000419524747';
  const activeAccountName = activeCallerAccount?.name || currentUser?.name || 'Leykun Jemaneh Ylma';
  const accountLast4 = activeAccountNumber.replace(/\D/g, '').slice(-4) || '4747';

  const accountTransactions = useMemo<AccountTransactionItem[]>(() => {
    const accId = activeCallerAccount?.id;
    const rawList = accId ? PhoneCallService.getCallerTransactions(accId) : [];
    if (rawList.length > 0) return rawList;

    // Fallback to LocalDb transactions for this account
    try {
      const cleanAcc = activeAccountNumber.replace(/\D/g, '');
      const allTx = LocalDb.getTransactions();
      const matched = allTx
        .filter((t) => {
          const s = (t.senderAccount || '').replace(/\D/g, '');
          const r = (t.recipientAccount || '').replace(/\D/g, '');
          return s === cleanAcc || r === cleanAcc;
        })
        .slice(0, 8);
      if (matched.length > 0) {
        return matched.map((t) => {
          const isIncoming = (t.recipientAccount || '').replace(/\D/g, '') === cleanAcc;
          const dt = new Date(t.createdAt || Date.now());
          const day = dt.getDate();
          const month = dt.getMonth() + 1;
          const sign = isIncoming ? '+' : '-';
          return {
            id: t.id,
            line: `${sign}${formatUssdTxAmount(t.amount)} on ${day}/${month}`,
            amount: `${sign}${t.amount.toFixed(2)} ETB`,
            rawAmount: t.amount,
            type: isIncoming ? 'in' : 'out',
            paymentAbout: t.description || 'Pay done via Mobile',
            sender: t.senderName || activeAccountName,
            senderAccount: t.senderAccount || activeAccountNumber,
            receiver: t.recipientName || activeAccountName,
            receiverAccount: t.recipientAccount || activeAccountNumber,
            date: dt.toISOString().slice(0, 16).replace('T', ' '),
            timestamp: dt.getTime(),
          };
        });
      }
    } catch {}

    return [
      {
        id: 'ios-tx-1',
        line: '+50.0 on 19/11',
        amount: '+50.00 ETB',
        rawAmount: 50,
        type: 'in',
        paymentAbout: 'Pay done via Mobile',
        sender: 'Dejene Buta Feye',
        senderAccount: '1000284758657',
        receiver: activeAccountName,
        receiverAccount: activeAccountNumber,
        date: '2026-11-19 14:22',
        timestamp: Date.now() - 86400000,
      },
      {
        id: 'ios-tx-2',
        line: '-20.0 on 18/11',
        amount: '-20.00 ETB',
        rawAmount: 20,
        type: 'out',
        paymentAbout: 'Pay done via Mobile',
        sender: activeAccountName,
        senderAccount: activeAccountNumber,
        receiver: 'Kasahun Yematawork Desta',
        receiverAccount: '1000345678901',
        date: '2026-11-18 11:05',
        timestamp: Date.now() - 172800000,
      },
      {
        id: 'ios-tx-3',
        line: '-20.0 on 17/11',
        amount: '-20.00 ETB',
        rawAmount: 20,
        type: 'out',
        paymentAbout: 'Pay done via Mobile',
        sender: activeAccountName,
        senderAccount: activeAccountNumber,
        receiver: 'Tesfahun Abebe Girma',
        receiverAccount: '1000567890123',
        date: '2026-11-17 09:41',
        timestamp: Date.now() - 259200000,
      },
      {
        id: 'ios-tx-4',
        line: '-10000.0 on 9/11',
        amount: '-10000.00 ETB',
        rawAmount: 10000,
        type: 'out',
        paymentAbout: 'Pay done via Mobile',
        sender: activeAccountName,
        senderAccount: activeAccountNumber,
        receiver: 'Global Online Market',
        receiverAccount: '1000684396671',
        date: '2026-11-09 16:15',
        timestamp: Date.now() - 864000000,
      },
    ];
  }, [activeCallerAccount, activeAccountNumber, activeAccountName]);

  const computedBalance = useMemo(() => {
    const cleanAcc = activeAccountNumber.replace(/\D/g, '');
    try {
      const users = LocalDb.getUsers();
      const matchedUser = users.find((u) => (u.accountNumber || '').replace(/\D/g, '') === cleanAcc);
      if (matchedUser && typeof matchedUser.balance === 'number' && !Number.isNaN(matchedUser.balance)) {
        return Math.round(matchedUser.balance * 100) / 100;
      }
    } catch {}
    if (activeCallerAccount) {
      const b = activeCallerAccount.availableBalance ?? activeCallerAccount.balance;
      if (typeof b === 'number' && !Number.isNaN(b)) {
        return Math.round(b * 100) / 100;
      }
    }
    return currentUser?.balance ?? 18450.5;
  }, [activeCallerAccount, activeAccountNumber, currentUser?.balance]);

  const formattedBalance = useMemo(
    () =>
      computedBalance.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [computedBalance]
  );

  const page1Txs = useMemo(() => accountTransactions.slice(0, 4), [accountTransactions]);
  const page2Txs = useMemo(() => accountTransactions.slice(4, 8), [accountTransactions]);

  const handleSelectActiveAccount = useCallback((acc: CallerAccount) => {
    PhoneCallService.setActiveCallerAccountId(acc.id);
    setActiveCallerAccount(acc);
    if (acc.accountNumber) {
      SmsService.setActiveAccountNumber(acc.accountNumber);
      TruecallerService.setActiveAccountByNumber(acc.accountNumber);
    }
  }, []);

  const handleKeyPress = (char: string) => {
    playDtmfTone(char);
    setDialedNumber((prev) => prev + char);
  };

  const handleDelete = () => {
    setDialedNumber((prev) => prev.slice(0, -1));
  };

  const handleBackspacePointerDown = () => {
    longPressTimerRef.current = setTimeout(() => {
      setDialedNumber('');
    }, 450);
  };

  const handleBackspacePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const transitionToUssdStep = (nextStep: IosUssdStep, delayMs = 380) => {
    setIsUssdReplying(false);
    setUssdInput('');
    setUssdStep('running');
    setTimeout(() => {
      setUssdStep(nextStep);
    }, delayMs);
  };

  const handleInitiateCall = (numberToCall: string) => {
    const num = numberToCall.trim();
    if (!num) return;

    if (num === '*889#' || num.startsWith('*889')) {
      setDialedNumber('');
      transitionToUssdStep('cbe_login', 480);
      return;
    }

    if (num === '*804#' || num.startsWith('*804')) {
      setDialedNumber('');
      transitionToUssdStep('ethio_telecom_balance', 450);
      return;
    }

    if (num.startsWith('*') && num.endsWith('#')) {
      setDialedNumber('');
      transitionToUssdStep('cbe_login', 450);
      return;
    }

    // Normal phone call
    const account = callerAccounts.find((a) => a.phoneNumber === num) || {
      name: num,
      phoneNumber: num,
    };

    setActiveCall({
      contactName: account.name,
      phoneNumber: num,
      durationSeconds: 0,
      isMuted: false,
      isSpeaker: false,
    });

    PhoneCallService.addCallLog({
      contactName: account.name,
      phoneNumber: num,
      type: 'outgoing',
      duration: '15s',
      simSlot: 1,
      timestamp: 'Just now',
    });
    setCallLogs(PhoneCallService.getCallLogs());
  };

  const handleDismissUssd = () => {
    setUssdStep('idle');
    setIsUssdReplying(false);
    setUssdInput('');
  };

  const handleOpenReplyMode = () => {
    if (ussdStep === 'running' || ussdStep === 'idle') return;
    if (ussdStep === 'cbe_transfer_done' || ussdStep === 'ethio_telecom_balance' || ussdStep === 'error') {
      handleDismissUssd();
      return;
    }
    setUssdInput('');
    setIsUssdReplying(true);
  };

  const handleSubmitUssdReply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = ussdInput.trim();

    switch (ussdStep) {
      case 'cbe_login':
        if (!val) {
          setIsUssdReplying(false);
          return;
        }
        transitionToUssdStep('cbe_menu');
        break;

      case 'cbe_menu':
        if (val === '1') {
          transitionToUssdStep('cbe_select_account');
        } else if (val === '2') {
          setTransferDraft({ recipientAccount: '', recipientName: '', amount: '' });
          transitionToUssdStep('cbe_transfer_acc');
        } else if (val === '3') {
          transitionToUssdStep('cbe_beneficiary');
        } else if (val === '4') {
          transitionToUssdStep('cbe_select_account');
        } else if (val === '5') {
          transitionToUssdStep('cbe_fast_loan');
        } else if (val === '6') {
          transitionToUssdStep('cbe_atm_cash_out');
        } else if (val === '7') {
          transitionToUssdStep('cbe_airtime_menu');
        } else if (val === '8') {
          transitionToUssdStep('cbe_other_transfers');
        } else if (val === '9') {
          transitionToUssdStep('cbe_cbebirr');
        } else if (val === '10') {
          transitionToUssdStep('cbe_menu_page2');
        } else {
          transitionToUssdStep('cbe_select_account');
        }
        break;

      case 'cbe_menu_page2':
        transitionToUssdStep('cbe_menu');
        break;

      case 'cbe_select_account':
        if (val === '2') {
          transitionToUssdStep('cbe_menu');
        } else {
          transitionToUssdStep('cbe_account_summary');
        }
        break;

      case 'cbe_account_summary': {
        const backNum = page1Txs.length + 1;
        const nextNum = page1Txs.length + 2;
        const parsed = parseInt(val, 10);
        if (parsed === backNum) {
          transitionToUssdStep('cbe_select_account');
        } else if (parsed === nextNum) {
          transitionToUssdStep(page2Txs.length > 0 ? 'cbe_account_summary_page2' : 'cbe_account_summary');
        } else if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= page1Txs.length) {
          setSelectedTxIndex(parsed - 1);
          transitionToUssdStep('cbe_tx_detail');
        } else {
          setUssdErrorMessage('Error on: Failure during data access');
          transitionToUssdStep('error');
        }
        break;
      }

      case 'cbe_account_summary_page2': {
        const backNum = page2Txs.length + 1;
        const parsed = parseInt(val, 10);
        if (parsed === backNum) {
          transitionToUssdStep('cbe_account_summary');
        } else if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= page2Txs.length) {
          setSelectedTxIndex(4 + (parsed - 1));
          transitionToUssdStep('cbe_tx_detail');
        } else {
          transitionToUssdStep('cbe_account_summary');
        }
        break;
      }

      case 'cbe_tx_detail':
        transitionToUssdStep('cbe_account_summary');
        break;

      case 'cbe_beneficiary':
      case 'cbe_fast_loan':
      case 'cbe_atm_cash_out':
      case 'cbe_other_transfers':
      case 'cbe_cbebirr':
        transitionToUssdStep('cbe_menu');
        break;

      case 'cbe_airtime_menu':
        if (val === '3') {
          transitionToUssdStep('cbe_menu');
        } else {
          transitionToUssdStep('cbe_airtime_amount');
        }
        break;

      case 'cbe_airtime_amount': {
        const amt = parseFloat(val);
        if (Number.isNaN(amt) || amt <= 0) {
          transitionToUssdStep('cbe_menu');
        } else {
          setAirtimeResultText(
            `Success!\nAirtime ETB ${amt.toFixed(2)} purchased successfully from Saving Account-${accountLast4}.`
          );
          transitionToUssdStep('cbe_transfer_done');
        }
        break;
      }

      case 'cbe_transfer_acc': {
        const cleanAcc = val.replace(/\D/g, '');
        if (cleanAcc.length < 5) {
          transitionToUssdStep('cbe_menu');
          return;
        }
        const matchedCaller = callerAccounts.find(
          (a) => (a.accountNumber || '').replace(/\D/g, '') === cleanAcc
        );
        const matchedDbUser = LocalDb.getUsers().find(
          (u) => (u.accountNumber || '').replace(/\D/g, '') === cleanAcc
        );
        const recName = matchedCaller?.name || matchedDbUser?.name || `CBE Account ${cleanAcc.slice(-4)}`;
        setTransferDraft({
          recipientAccount: cleanAcc,
          recipientName: recName,
          amount: '',
        });
        transitionToUssdStep('cbe_transfer_amount');
        break;
      }

      case 'cbe_transfer_amount': {
        const amt = parseFloat(val);
        if (Number.isNaN(amt) || amt <= 0) {
          transitionToUssdStep('cbe_menu');
          return;
        }
        setTransferDraft((prev) => ({ ...prev, amount: amt.toFixed(2) }));
        transitionToUssdStep('cbe_transfer_confirm');
        break;
      }

      case 'cbe_transfer_confirm': {
        if (val === '1') {
          const amt = parseFloat(transferDraft.amount) || 0;
          try {
            const dbUsers = LocalDb.getUsers();
            const senderIdx = dbUsers.findIndex(
              (u) => (u.accountNumber || '').replace(/\D/g, '') === activeAccountNumber.replace(/\D/g, '')
            );
            const sender = senderIdx !== -1 ? dbUsers[senderIdx] : (currentUser || dbUsers[0]);
            if (sender && amt > 0) {
              const currentTxs = LocalDb.getTransactions();
              const newTx: Transaction = {
                id: 'FT' + Date.now().toString().slice(-10),
                type: 'transfer',
                senderId: sender.id,
                senderName: activeAccountName || sender.name,
                senderAccount: activeAccountNumber || sender.accountNumber,
                recipientName: transferDraft.recipientName,
                recipientAccount: transferDraft.recipientAccount,
                recipientBank: 'Commercial Bank of Ethiopia',
                amount: amt,
                fee: 0,
                description: 'CBE USSD *889# Mobile Transfer',
                status: 'success',
                reference: 'REF' + Math.floor(100000 + Math.random() * 900000),
                createdAt: new Date().toISOString(),
                category: 'ACCOUNT TO ACCOUNT',
              };

              let updatedBalance = sender.balance;
              if (senderIdx !== -1) {
                dbUsers[senderIdx].balance = Math.max(0, (dbUsers[senderIdx].balance || 0) - amt);
                dbUsers[senderIdx].availableBalance = dbUsers[senderIdx].balance;
                updatedBalance = dbUsers[senderIdx].balance;
                LocalDb.setUsers(dbUsers);
              }

              LocalDb.setTransactions([newTx, ...currentTxs]);

              try {
                PhoneCallService.syncTransactionToCallerApp(newTx);
                setCallerAccounts(PhoneCallService.getCallerAccounts());
              } catch {}
              try {
                SmsService.createSmsFromTransaction(newTx, updatedBalance);
              } catch {}
              try {
                TruecallerService.syncTransactionToTruecaller(newTx, updatedBalance);
              } catch {}

              setTransferResultText(
                `Transaction Completed.\nETB ${amt.toFixed(2)} transferred to ${transferDraft.recipientName} (${transferDraft.recipientAccount}).\nRef: ${newTx.reference || newTx.id}`
              );
              transitionToUssdStep('cbe_transfer_done');
              return;
            }
          } catch {}
          setTransferResultText(
            `Transaction Completed.\nETB ${amt.toFixed(2)} transferred to ${transferDraft.recipientName}.`
          );
          transitionToUssdStep('cbe_transfer_done');
        } else {
          transitionToUssdStep('cbe_menu');
        }
        break;
      }

      default:
        handleDismissUssd();
        break;
    }
  };

  const ussdMessageText = useMemo(() => {
    switch (ussdStep) {
      case 'cbe_login':
        return 'Welcome to CBE Mobile Banking.\nPlease enter your PIN to login:';
      case 'cbe_menu':
        return [
          '1:My Account',
          '2:Transfer to CBE Account',
          '3:Beneficiary',
          '4:Own Account Transfer',
          '5:CBE Fast Loan',
          '6:ATM Cash Out',
          '7:Airtime',
          '8:Other Transfers',
          '9:CBEBirr',
          '10:Next',
        ].join('\n');
      case 'cbe_menu_page2':
        return [
          '1:Utility Payment',
          '2:Change PIN',
          '3:Language',
          '4:Mini Statement',
          '5:Manage Beneficiary',
          '6:Help',
          '7:Back',
        ].join('\n');
      case 'cbe_select_account':
        return ['Select Account', `1:Saving Account-${accountLast4}`, '2:Back'].join('\n');
      case 'cbe_account_summary': {
        const backNum = page1Txs.length + 1;
        const nextNum = page1Txs.length + 2;
        return [
          activeAccountName,
          `Available Balance is ETB ${formattedBalance}`,
          'Transactions',
          ...page1Txs.map((tx, idx) => `${idx + 1}:${tx.line}`),
          `${backNum}:Back`,
          `${nextNum}:Next`,
        ].join('\n');
      }
      case 'cbe_account_summary_page2': {
        const backNum = page2Txs.length + 1;
        return [
          activeAccountName,
          `Available Balance is ETB ${formattedBalance}`,
          'Transactions',
          ...page2Txs.map((tx, idx) => `${idx + 1}:${tx.line}`),
          `${backNum}:Back`,
        ].join('\n');
      }
      case 'cbe_tx_detail': {
        const detail = accountTransactions[selectedTxIndex] || accountTransactions[0];
        if (!detail) return 'Error on: Failure during data access';
        return [
          `Amount:${detail.amount}`,
          `About Payment: ${detail.paymentAbout}`,
          `From ${detail.sender} to ${detail.receiver}`,
          `On Date:${detail.date}`,
          '1:Back',
        ].join('\n');
      }
      case 'cbe_beneficiary':
        return ['Beneficiary', '1:Dejene Buta Feye', '2:Kasahun Yematawork', '3:Back'].join('\n');
      case 'cbe_fast_loan':
        return ['CBE Fast Loan', '1:Check Eligibility', '2:Apply Loan', '3:Back'].join('\n');
      case 'cbe_atm_cash_out':
        return ['ATM Cash Out', '1:Generate Cash Out Code', '2:Back'].join('\n');
      case 'cbe_airtime_menu':
        return ['Airtime', '1:My Phone', '2:Other Phone', '3:Back'].join('\n');
      case 'cbe_airtime_amount':
        return 'Enter Airtime Amount (ETB):';
      case 'cbe_other_transfers':
        return ['Other Transfers', '1:Other Bank', '2:Telebirr', '3:Back'].join('\n');
      case 'cbe_cbebirr':
        return ['CBEBirr', '1:CBEBirr to CBE Account', '2:CBE Account to CBEBirr', '3:Back'].join('\n');
      case 'cbe_transfer_acc':
        return 'Enter Recipient CBE Account Number:';
      case 'cbe_transfer_amount':
        return `Transfer to ${transferDraft.recipientName}\nEnter Amount (ETB):`;
      case 'cbe_transfer_confirm':
        return [
          'Confirm Transfer',
          `To: ${transferDraft.recipientName}`,
          `Acc: ${transferDraft.recipientAccount}`,
          `Amount: ETB ${transferDraft.amount}`,
          '1:Confirm',
          '2:Cancel',
        ].join('\n');
      case 'cbe_transfer_done':
        return transferResultText || airtimeResultText || 'Request completed successfully.';
      case 'ethio_telecom_balance':
        return 'Dear Customer, your current Ethio telecom balance is 42.75 Birr.\nValid until 31/12/2026.';
      case 'error':
        return ussdErrorMessage;
      default:
        return '';
    }
  }, [
    ussdStep,
    accountLast4,
    activeAccountName,
    formattedBalance,
    page1Txs,
    page2Txs,
    accountTransactions,
    selectedTxIndex,
    transferDraft,
    transferResultText,
    airtimeResultText,
    ussdErrorMessage,
  ]);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return callerAccounts;
    return callerAccounts.filter(
      (a) =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.accountNumber || '').toLowerCase().includes(q) ||
        (a.phoneNumber || '').toLowerCase().includes(q)
    );
  }, [callerAccounts, searchQuery]);

  const filteredLogs = useMemo(() => {
    if (recentsFilter === 'missed') {
      return callLogs.filter((l) => l.type === 'missed');
    }
    return callLogs;
  }, [callLogs, recentsFilter]);

  const formatCallTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingChars = Math.max(0, 182 - ussdInput.length);

  return (
    <div
      className="h-[100dvh] min-h-[100dvh] w-full flex flex-col select-none bg-black text-white relative overflow-hidden"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif',
      }}
    >
      {/* Main Tab Area (hidden while USSD overlay is active so dialer keypad never shows above the real iOS keyboard) */}
      <main className={`flex-1 min-h-0 flex flex-col overflow-hidden ${ussdStep !== 'idle' ? 'invisible pointer-events-none' : ''}`}>
        {/* TAB: KEYPAD (Exact iOS 26 Pure Black Dialer) */}
        {activeTab === 'keypad' && (
          <div className="flex-1 flex flex-col justify-between pt-[max(env(safe-area-inset-top,0px),14px)] pb-3 px-4 max-w-[390px] mx-auto w-full">
            {/* Top-right Add Contact icon (only visible once dialing begins, matching iOS video 00:04-00:05) */}
            <div className="h-9 flex items-center justify-end px-2">
              {dialedNumber.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSearchSheet(true)}
                  className="p-2 text-white active:opacity-60 transition cursor-pointer"
                  title="Switch Account / Add Contact"
                >
                  <UserPlus className="w-6 h-6 stroke-[1.9]" />
                </button>
              )}
            </div>

            {/* Dialed Number Display */}
            <div className="flex-1 min-h-[38px] max-h-[96px] flex items-center justify-center px-3">
              <span className="text-[32px] sm:text-[38px] font-normal tracking-wide text-white text-center truncate leading-tight">
                {dialedNumber || '\u00A0'}
              </span>
            </div>

            {/* Keypad Grid + Call/Backspace Row */}
            <div className="w-full max-w-[300px] sm:max-w-[310px] mx-auto pb-1 sm:pb-2">
              <div className="grid grid-cols-3 gap-x-4 sm:gap-x-5 gap-y-2.5 sm:gap-y-4">
                {[
                  { n: '1', l: '' },
                  { n: '2', l: 'ABC' },
                  { n: '3', l: 'DEF' },
                  { n: '4', l: 'GHI' },
                  { n: '5', l: 'JKL' },
                  { n: '6', l: 'MNO' },
                  { n: '7', l: 'PQRS' },
                  { n: '8', l: 'TUV' },
                  { n: '9', l: 'WXYZ' },
                  { n: '*', l: '' },
                  { n: '0', l: '+' },
                  { n: '#', l: '' },
                ].map((item) => (
                  <button
                    key={item.n}
                    type="button"
                    onClick={() => handleKeyPress(item.n)}
                    className="w-[66px] h-[66px] sm:w-[76px] sm:h-[76px] rounded-full bg-[#242426] hover:bg-[#323236] active:bg-[#5A5A5E] transition-colors flex flex-col items-center justify-center mx-auto cursor-pointer"
                  >
                    <span
                      className={`text-[30px] sm:text-[34px] font-normal text-white leading-none ${
                        item.n === '*' ? 'text-[38px] sm:text-[42px] pt-2' : item.n === '#' ? 'text-[28px] sm:text-[32px]' : ''
                      }`}
                    >
                      {item.n}
                    </span>
                    {item.l ? (
                      <span
                        className={`text-white leading-none mt-0.5 ${
                          item.l === '+'
                            ? 'text-[14px] font-normal -mt-0.5'
                            : 'text-[9.5px] sm:text-[10px] font-bold tracking-[0.16em]'
                        }`}
                      >
                        {item.l}
                      </span>
                    ) : (
                      item.n === '1' && <span className="h-[11px]" aria-hidden="true" />
                    )}
                  </button>
                ))}

                {/* Bottom Action Row aligned cleanly to 3 keypad columns */}
                <div className="flex items-center justify-center" />
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => handleInitiateCall(dialedNumber || '*889#')}
                    className="w-[66px] h-[66px] sm:w-[76px] sm:h-[76px] rounded-full bg-[#248A3D] hover:bg-[#2A9D47] active:bg-[#1C6F30] transition-colors flex items-center justify-center text-white cursor-pointer"
                    title="Call"
                  >
                    <Phone className="w-[28px] h-[28px] sm:w-[31px] sm:h-[31px] fill-white text-white" />
                  </button>
                </div>
                <div className="flex items-center justify-center">
                  {dialedNumber.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      onPointerDown={handleBackspacePointerDown}
                      onPointerUp={handleBackspacePointerUp}
                      onPointerLeave={handleBackspacePointerUp}
                      className="w-[66px] h-[66px] sm:w-[76px] sm:h-[76px] rounded-full flex items-center justify-center active:opacity-60 transition cursor-pointer"
                      title="Delete"
                    >
                      <IosBackspaceIcon className="w-[27px] h-[20px] sm:w-[29px] sm:h-[22px]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CALLS (Recents + Quick *889# & Active CBE Account Banner) */}
        {activeTab === 'calls' && (
          <div className="flex-1 overflow-y-auto px-4 pt-[max(env(safe-area-inset-top,0px),14px)] pb-24">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-[32px] font-bold tracking-tight text-white">Calls</h1>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#1C1C1E] p-0.5 rounded-full border border-white/10">
                  <button
                    type="button"
                    onClick={() => setRecentsFilter('all')}
                    className={`px-3 py-1 text-xs font-semibold rounded-full transition cursor-pointer ${
                      recentsFilter === 'all' ? 'bg-[#3A3A3C] text-white' : 'text-[#8E8E93]'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecentsFilter('missed')}
                    className={`px-3 py-1 text-xs font-semibold rounded-full transition cursor-pointer ${
                      recentsFilter === 'missed' ? 'bg-[#3A3A3C] text-white' : 'text-[#8E8E93]'
                    }`}
                  >
                    Missed
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPushModal(true)}
                  className="w-8 h-8 rounded-full bg-[#1C1C1E] border border-white/10 flex items-center justify-center text-[#0A84FF] active:opacity-70 transition cursor-pointer"
                  title="Install Standalone Phone App & Push Settings"
                  aria-label="Phone App Install & Push Settings"
                >
                  <Bell className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active *889# Account Pill */}
            <button
              type="button"
              onClick={() => setActiveTab('contacts')}
              className="w-full mb-4 px-3.5 py-2.5 rounded-2xl bg-[#1C1C1E] border border-white/10 flex items-center justify-between text-left active:bg-[#2C2C2E] transition cursor-pointer"
            >
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-[#8E8E93] uppercase tracking-wider">
                  Active *889# Account
                </div>
                <div className="text-[15px] font-semibold text-white truncate">{activeAccountName}</div>
                <div className="text-[12px] text-[#8E8E93] font-mono">
                  {activeAccountNumber} · ETB {formattedBalance}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8E8E93] shrink-0" />
            </button>

            <div className="divide-y divide-white/10">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => handleInitiateCall(log.phoneNumber)}
                  className="py-3 flex items-center justify-between cursor-pointer active:opacity-70 transition"
                >
                  <div className="flex flex-col min-w-0 pr-3">
                    <span
                      className={`text-[16px] font-semibold truncate ${
                        log.type === 'missed' ? 'text-[#FF453A]' : 'text-white'
                      }`}
                    >
                      {log.contactName}
                    </span>
                    <span className="text-[13px] text-[#8E8E93] truncate mt-0.5">{log.phoneNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#8E8E93] shrink-0">
                    <span className="text-[13px]">{log.timestamp}</span>
                    <Info className="w-4 h-4 text-[#0A84FF]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: CONTACTS (Registered CBE Accounts synced with *889#) */}
        {activeTab === 'contacts' && (
          <div className="flex-1 overflow-y-auto px-4 pt-[max(env(safe-area-inset-top,0px),14px)] pb-24">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-[32px] font-bold tracking-tight text-white">Contacts</h1>
              <span className="text-xs text-[#8E8E93]">{callerAccounts.length} accounts</span>
            </div>

            <div className="divide-y divide-white/10">
              {callerAccounts.map((acc) => {
                const isSelected =
                  (acc.accountNumber || '').replace(/\D/g, '') === activeAccountNumber.replace(/\D/g, '');
                return (
                  <div
                    key={acc.id}
                    onClick={() => {
                      handleSelectActiveAccount(acc);
                      setActiveTab('keypad');
                    }}
                    className="py-3 flex items-center justify-between cursor-pointer active:opacity-70 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      <div className="w-10 h-10 rounded-full bg-[#242426] flex items-center justify-center text-white font-semibold text-sm shrink-0">
                        {(acc.name || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[16px] font-medium text-white truncate">{acc.name}</span>
                        <span className="text-[12px] text-[#8E8E93] font-mono truncate">
                          {acc.accountNumber} · {acc.phoneNumber}
                        </span>
                      </div>
                    </div>
                    {isSelected ? (
                      <Check className="w-5 h-5 text-[#0A84FF] shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#636366] shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* iOS 26 Floating Liquid Glass Bottom Bar (Calls · Contacts · Keypad) + Separate Circular Search Button */}
      <footer className={`w-full px-4 pt-1 pb-[max(env(safe-area-inset-bottom,0px),18px)] flex items-center gap-3 z-20 shrink-0 max-w-[420px] mx-auto ${ussdStep !== 'idle' ? 'invisible pointer-events-none' : ''}`}>
        <div className="flex-1 bg-[#1C1C1E]/92 backdrop-blur-2xl border border-white/[0.11] rounded-full p-1 flex items-center justify-between shadow-[0_8px_28px_rgba(0,0,0,0.6)]">
          <button
            type="button"
            onClick={() => setActiveTab('calls')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-full transition cursor-pointer ${
              activeTab === 'calls' ? 'bg-white/[0.14] text-[#0A84FF]' : 'text-white/90 hover:text-white'
            }`}
          >
            <Clock className="w-[21px] h-[21px] stroke-[2]" />
            <span className="text-[10.5px] font-medium mt-0.5 leading-tight">Calls</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-full transition cursor-pointer ${
              activeTab === 'contacts' ? 'bg-white/[0.14] text-[#0A84FF]' : 'text-white/90 hover:text-white'
            }`}
          >
            <UserCircle2 className="w-[21px] h-[21px] stroke-[2]" />
            <span className="text-[10.5px] font-medium mt-0.5 leading-tight">Contacts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('keypad')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-full transition cursor-pointer ${
              activeTab === 'keypad' ? 'bg-white/[0.14] text-[#0A84FF]' : 'text-white/90 hover:text-white'
            }`}
          >
            <IosKeypadTabIcon className="w-[21px] h-[21px]" />
            <span className="text-[10.5px] font-medium mt-0.5 leading-tight">Keypad</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowSearchSheet(true)}
          className="w-[54px] h-[54px] rounded-full bg-[#1C1C1E]/92 backdrop-blur-2xl border border-white/[0.11] flex items-center justify-center text-white shadow-[0_8px_28px_rgba(0,0,0,0.6)] active:scale-95 transition shrink-0 cursor-pointer"
          title="Search Contacts & Accounts"
        >
          <Search className="w-[22px] h-[22px] stroke-[2.2]" />
        </button>
      </footer>

      {/* ===================================================================== */}
      {/* iOS SEARCH / ACCOUNT SWITCHER SHEET                                   */}
      {/* ===================================================================== */}
      {showSearchSheet && (
        <div className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl flex flex-col pt-[max(env(safe-area-inset-top,0px),16px)] px-4 pb-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex-1 flex items-center gap-2 bg-[#1C1C1E] border border-white/10 rounded-full px-3.5 h-10">
              <Search className="w-4 h-4 text-[#8E8E93] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search CBE accounts or phone..."
                autoFocus
                className="flex-1 bg-transparent text-white text-[15px] outline-none placeholder-[#8E8E93]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[#8E8E93] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowSearchSheet(false);
                setSearchQuery('');
              }}
              className="text-[#0A84FF] text-[16px] font-medium px-1 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <p className="text-[12px] text-[#8E8E93] mb-2 px-1">
            Tap any registered CBE account to set it active for *889#
          </p>

          <div className="flex-1 overflow-y-auto divide-y divide-white/10">
            {filteredContacts.map((acc) => {
              const isSelected =
                (acc.accountNumber || '').replace(/\D/g, '') === activeAccountNumber.replace(/\D/g, '');
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    handleSelectActiveAccount(acc);
                    setShowSearchSheet(false);
                    setSearchQuery('');
                    setActiveTab('keypad');
                  }}
                  className="w-full py-3 flex items-center justify-between text-left active:opacity-70 transition cursor-pointer"
                >
                  <div className="min-w-0 pr-3">
                    <div className="text-[15px] font-medium text-white truncate">{acc.name}</div>
                    <div className="text-[12px] text-[#8E8E93] font-mono truncate">
                      {acc.accountNumber} · ETB{' '}
                      {(acc.availableBalance ?? acc.balance ?? 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  {isSelected && <Check className="w-5 h-5 text-[#0A84FF] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FULL-SCREEN NATIVE iOS USSD OVERLAY (EXACT MATCH TO VIDEO 00:06-01:07)*/}
      {/* ===================================================================== */}
      {ussdStep !== 'idle' && (
        <div className="fixed inset-0 z-50 bg-[#545454] text-white overflow-hidden">
          <div
            className="w-full flex flex-col overflow-hidden bg-[#545454]"
            style={
              isUssdReplying && visualViewportBox
                ? {
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    top: `${visualViewportBox.top}px`,
                    height: `${visualViewportBox.height}px`,
                  }
                : {
                    height: '100dvh',
                  }
            }
          >
          {/* 1. LOADING STATE ("Please Wait...") */}
          {ussdStep === 'running' && (
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <IosActivitySpinner />
              <p className="text-[18px] font-normal text-white tracking-normal text-center">
                Please Wait...
              </p>
            </div>
          )}

          {/* 2. DISPLAY MODE (Full-screen gray + white message + White Dismiss / Black Reply) */}
          {ussdStep !== 'running' && !isUssdReplying && (
            <>
              <div className="flex-1 flex flex-col items-center justify-center px-6 pt-[max(env(safe-area-inset-top,0px),24px)] pb-6 overflow-y-auto">
                <p className="text-[17px] leading-[1.38] font-normal text-white text-center whitespace-pre-line max-w-[340px]">
                  {ussdMessageText}
                </p>
              </div>

              {/* Bottom Two Large Rectangular iOS Buttons: White Dismiss | Black Reply */}
              <div className="w-full max-w-[440px] mx-auto px-4 pb-[max(env(safe-area-inset-bottom,0px),24px)] pt-2 grid grid-cols-2 gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleDismissUssd}
                  className="h-[54px] rounded-[4px] bg-white text-black text-[19px] font-medium flex items-center justify-center active:opacity-80 transition cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={handleOpenReplyMode}
                  className="h-[54px] rounded-[4px] bg-black text-white text-[19px] font-medium flex items-center justify-center active:opacity-80 transition cursor-pointer"
                >
                  Reply
                </button>
              </div>
            </>
          )}

          {/* 3. REPLY MODE (Top Cancel / Reply / Reply pills + message + white-bordered input + 182 chars remaining) */}
          {ussdStep !== 'running' && isUssdReplying && (
            <form
              onSubmit={handleSubmitUssdReply}
              className="flex-1 flex flex-col justify-between min-h-0 w-full"
            >
              {/* Top iOS 26 Reply Header */}
              <div className="px-4 pt-[max(env(safe-area-inset-top,0px),12px)] pb-2 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsUssdReplying(false);
                    setUssdInput('');
                  }}
                  className="h-[40px] px-5 rounded-full bg-[#242426]/85 border border-white/10 text-white text-[16px] font-semibold flex items-center justify-center active:opacity-75 transition cursor-pointer"
                >
                  Cancel
                </button>

                <span className="text-[17px] font-semibold text-white tracking-tight">Reply</span>

                <button
                  type="submit"
                  className="h-[40px] px-5 rounded-full bg-[#242426]/85 border border-white/10 text-white text-[16px] font-semibold flex items-center justify-center active:opacity-75 transition cursor-pointer"
                >
                  Reply
                </button>
              </div>

              {/* Centered USSD Message */}
              <div className="flex-1 min-h-0 flex items-center justify-center px-6 py-2 overflow-y-auto">
                <p className="text-[17px] leading-[1.38] font-normal text-white text-center whitespace-pre-line max-w-[340px]">
                  {ussdMessageText}
                </p>
              </div>

              {/* White-bordered Real Input + "182 characters remaining" directly above real keyboard */}
              <div className="w-full px-1.5 pb-3 pt-1 shrink-0">
                <input
                  ref={replyInputRef}
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={182}
                  value={ussdInput}
                  onChange={(e) => setUssdInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmitUssdReply();
                    }
                  }}
                  className="w-full h-[42px] px-3 rounded-[6px] bg-[#464646]/70 border border-white/95 text-[17px] font-normal text-white outline-none caret-white"
                />
                <p className="text-[13px] font-normal text-white/95 text-center mt-2">
                  {remainingChars} characters remaining
                </p>
              </div>
            </form>
          )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* iOS FULL-SCREEN IN-CALL SCREEN                                        */}
      {/* ===================================================================== */}
      {activeCall && (
        <div className="fixed inset-0 z-50 bg-[#161618] text-white flex flex-col justify-between p-6">
          <div className="pt-12 flex flex-col items-center text-center">
            <h2 className="text-[32px] font-semibold text-white tracking-tight">
              {activeCall.contactName}
            </h2>
            <p className="text-sm text-[#8E8E93] mt-1 font-mono">
              {activeCall.durationSeconds === 0 ? 'calling...' : formatCallTime(activeCall.durationSeconds)}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-[280px] mx-auto w-full">
            {[
              {
                label: 'mute',
                icon: activeCall.isMuted ? MicOff : Mic,
                active: activeCall.isMuted,
                action: () => setActiveCall((p) => (p ? { ...p, isMuted: !p.isMuted } : null)),
              },
              { label: 'keypad', icon: Grid, active: false, action: () => {} },
              {
                label: 'speaker',
                icon: Volume2,
                active: activeCall.isSpeaker,
                action: () => setActiveCall((p) => (p ? { ...p, isSpeaker: !p.isSpeaker } : null)),
              },
              { label: 'add call', icon: UserPlus, active: false, action: () => {} },
              { label: 'FaceTime', icon: Video, active: false, action: () => {} },
              { label: 'contacts', icon: User, active: false, action: () => {} },
            ].map((btn, idx) => {
              const Icon = btn.icon;
              return (
                <div key={idx} className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={btn.action}
                    className={`w-[72px] h-[72px] rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer ${
                      btn.active ? 'bg-white text-black' : 'bg-white/15 text-white hover:bg-white/25'
                    }`}
                  >
                    <Icon className="w-7 h-7" />
                  </button>
                  <span className="text-[11px] text-[#8E8E93] font-medium capitalize">{btn.label}</span>
                </div>
              );
            })}
          </div>

          <div className="pb-8 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setActiveCall(null)}
              className="w-[74px] h-[74px] rounded-full bg-[#FF3B30] hover:bg-[#E0352B] active:scale-95 transition flex items-center justify-center text-white shadow-2xl cursor-pointer"
              title="End Call"
            >
              <Phone className="w-8 h-8 fill-white text-white rotate-[135deg]" />
            </button>
          </div>
        </div>
      )}
      <SubAppPushModal
        isOpen={showPushModal}
        onClose={() => setShowPushModal(false)}
        subAppId="phone"
        isDarkMode={true}
      />
    </div>
  );
};

export default ApplePhoneApp;

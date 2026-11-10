import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Phone, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Search, 
  Info, 
  Clock, 
  Users, 
  ArrowLeft, 
  Delete, 
  X, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Pause, 
  Play, 
  Plus, 
  MessageSquare, 
  Share2, 
  Copy, 
  Check, 
  Trash2, 
  Sparkles,
  Hexagon,
  Shield,
  Smartphone,
  CheckCircle2,
  Calendar,
  Send,
  MoreVertical,
  RotateCcw,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import GboardKeyboard from './GboardKeyboard';
import PhoneSettingsModal from './PhoneSettingsModal';
import { PhoneCallService, CallLogItem, ContactItem, CallerAccount, AccountTransactionItem, formatUssdTxAmount, SENDER_PRESET_BALANCES } from '../services/phoneCallService';
import { LocalDb } from '../lib/mockData';
import { UserProfile, Transaction } from '../types';
import { SmsService } from '../services/smsService';
import { TruecallerService } from '../services/truecallerService';
import ApplePhoneApp from './ApplePhoneApp';
import { PhoneSettingsService } from '../services/phoneSettingsService';

interface PhoneCallAppProps {
  currentUser?: UserProfile | null;
  onBack?: () => void;
}

type UssdStep = 
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
  | 'cbe_other_transfers'
  | 'cbe_cbebirr'
  | 'cbe_transfer_acc' 
  | 'cbe_transfer_amount' 
  | 'cbe_transfer_reason' 
  | 'cbe_transfer_confirm' 
  | 'cbe_transfer_done' 
  | 'cbe_airtime_menu' 
  | 'cbe_airtime_amount' 
  | 'cbe_airtime_done'
  | 'ethio_telecom_balance';

export default function PhoneCallApp({ currentUser, onBack }: PhoneCallAppProps) {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'recents' | 'contacts'>('recents');
  const [recentsFilter, setRecentsFilter] = useState<'all' | 'missed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Call Logs & Contacts
  const [callLogs, setCallLogs] = useState<CallLogItem[]>(() => PhoneCallService.getCallLogs());
  const [contacts, setContacts] = useState<ContactItem[]>(() => PhoneCallService.getContacts());

  // Dialpad & Number Input
  const [dialedNumber, setDialedNumber] = useState('');
  const [isKeypadOpen, setIsKeypadOpen] = useState(true);

  // Call Log Detail Modal (clicking (i))
  const [selectedCallDetail, setSelectedCallDetail] = useState<CallLogItem | null>(null);

  // Caller Accounts State (Transaction-generated senders and receivers)
  const [callerAccounts, setCallerAccounts] = useState<CallerAccount[]>(() => {
    try {
      PhoneCallService.syncAllTransactionsToCallerAccounts();
    } catch {}
    return PhoneCallService.getCallerAccounts();
  });
  const [activeCallerAccount, setActiveCallerAccount] = useState<CallerAccount>(() => 
    PhoneCallService.getActiveCallerAccount()
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [accountFilter, setAccountFilter] = useState<'all' | 'sender' | 'receiver'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPhoneSettingsOpen, setIsPhoneSettingsOpen] = useState(false);
  const [isIPhone, setIsIPhone] = useState<boolean>(() => PhoneSettingsService.isIPhoneMode());

  useEffect(() => {
    return PhoneSettingsService.subscribe(() => {
      setIsIPhone(PhoneSettingsService.isIPhoneMode());
    });
  }, []);

  if (isIPhone) {
    return <ApplePhoneApp currentUser={currentUser} onBack={onBack || (() => {})} />;
  }

  // Active Calling Screen (outgoing and incoming)
  const [activeCall, setActiveCall] = useState<{
    contactName: string;
    phoneNumber: string;
    simSlot: 1 | 2;
    status: 'dialing' | 'incoming' | 'connected' | 'ended';
    durationSeconds: number;
    isMuted: boolean;
    isSpeaker: boolean;
    callerRole?: 'sender' | 'receiver' | 'user';
  } | null>(null);

  // USSD Session Engine
  const [ussdStep, setUssdStep] = useState<UssdStep>('idle');
  const [ussdInput, setUssdInput] = useState('');
  const [ussdHistory, setUssdHistory] = useState<string[]>([]);
  const [ussdToast, setUssdToast] = useState<string | null>(null);
  const [selectedTxIndex, setSelectedTxIndex] = useState<number>(0);

  // USSD CBE Transfer temporary flow data
  const [transferData, setTransferData] = useState<{
    recipientAcc: string;
    recipientName: string;
    amount: number;
    reason: string;
  }>({
    recipientAcc: '',
    recipientName: '',
    amount: 0,
    reason: ''
  });

  const [airtimeData, setAirtimeData] = useState<{
    phone: string;
    amount: number;
  }>({
    phone: '',
    amount: 0
  });

  const ussdInputRef = useRef<HTMLInputElement>(null);

  // Audio DTMF Generator for realistic touch tones
  const playTone = (freq: number = 440) => {
    try {
      const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // AudioContext disallowed before gesture
    }
  };

  // Get active user data
  const user = useMemo(() => {
    if (currentUser) return currentUser;
    const users = LocalDb.getUsers();
    return users[0] || {
      id: 'user_1',
      name: 'Leykun Jemaneh Ylma',
      email: 'leykunjemaneh3@gmail.com',
      phone: '+251900112233',
      accountNumber: '1000419524747',
      role: 'admin' as const,
      status: 'active' as const,
      createdAt: '2026-01-01T08:00:00Z',
      balance: 18450.50,
      availableBalance: 18450.50
    };
  }, [currentUser]);

  // Real transactions from database
  const userTransactions = useMemo(() => {
    return LocalDb.getTransactions();
  }, []);

  // Filtered call logs
  const filteredCallLogs = useMemo(() => {
    let list = callLogs;
    if (recentsFilter === 'missed') {
      list = list.filter(item => item.type === 'missed');
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => 
        item.contactName.toLowerCase().includes(q) || 
        item.phoneNumber.toLowerCase().includes(q)
      );
    }
    return list;
  }, [callLogs, recentsFilter, searchQuery]);

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.phoneNumber.toLowerCase().includes(q)
    );
  }, [contacts, searchQuery]);

  // Auto-focus USSD input whenever step changes
  useEffect(() => {
    if (ussdStep !== 'idle' && ussdStep !== 'running') {
      setTimeout(() => {
        ussdInputRef.current?.focus();
      }, 100);
    }
  }, [ussdStep]);

  // Caller accounts listener & live sync
  useEffect(() => {
    const handleAccountsUpdate = () => {
      setCallerAccounts(PhoneCallService.getCallerAccounts());
      setActiveCallerAccount(PhoneCallService.getActiveCallerAccount());
      setCallLogs(PhoneCallService.getCallLogs());
      setContacts(PhoneCallService.getContacts());
    };
    window.addEventListener('caller_accounts_updated', handleAccountsUpdate);
    window.addEventListener('caller_account_changed', handleAccountsUpdate);
    window.addEventListener('storage', handleAccountsUpdate);
    return () => {
      window.removeEventListener('caller_accounts_updated', handleAccountsUpdate);
      window.removeEventListener('caller_account_changed', handleAccountsUpdate);
      window.removeEventListener('storage', handleAccountsUpdate);
    };
  }, []);

  // Sync active caller account if the user prop matches a known caller account
  useEffect(() => {
    if (user && user.accountNumber) {
      const cleanUserAcc = user.accountNumber.replace(/\D/g, '');
      const currentAccounts = PhoneCallService.getCallerAccounts();
      const matched = currentAccounts.find(a => 
        (a.accountNumber && a.accountNumber.replace(/\D/g, '') === cleanUserAcc) ||
        (a.name && user.name && (
          a.name.toLowerCase() === user.name.toLowerCase() ||
          a.name.toLowerCase().includes(user.name.toLowerCase()) ||
          user.name.toLowerCase().includes(a.name.toLowerCase()) ||
          (user.name.toLowerCase().includes('global') && a.name.toLowerCase().includes('global'))
        ))
      );
      if (matched && matched.id !== activeCallerAccount?.id) {
        PhoneCallService.setActiveCallerAccountId(matched.id);
        setActiveCallerAccount(matched);
      }
    }
  }, [user?.accountNumber, user?.name, user?.balance]);

  // Switch Active Caller Account
  const handleSwitchCaller = (acc: CallerAccount) => {
    PhoneCallService.setActiveCallerAccountId(acc.id);
    setActiveCallerAccount(acc);
    setToastMessage(`Active Caller set to: ${acc.name} (${acc.role === 'sender' ? 'Sender' : 'Receiver'})`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Simulate an Incoming Call (Sender calling Receiver or Receiver calling Sender)
  const handleSimulateIncomingCall = (acc: CallerAccount) => {
    setIsSettingsOpen(false);
    setActiveCall({
      contactName: acc.name,
      phoneNumber: acc.phoneNumber,
      simSlot: acc.simSlot,
      status: 'incoming',
      durationSeconds: 0,
      isMuted: false,
      isSpeaker: false,
      callerRole: acc.role
    });
    playTone(852);
  };

  // Accept Incoming Call
  const handleAcceptIncomingCall = () => {
    if (!activeCall) return;
    setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
    PhoneCallService.addCallLog({
      contactName: activeCall.contactName,
      phoneNumber: activeCall.phoneNumber,
      simSlot: activeCall.simSlot,
      type: 'incoming',
      timestamp: 'Just now',
      duration: 'Connected',
      hasWhatsApp: true
    });
    setCallLogs(PhoneCallService.getCallLogs());
  };

  // Decline Incoming Call
  const handleDeclineIncomingCall = () => {
    if (!activeCall) return;
    PhoneCallService.addCallLog({
      contactName: activeCall.contactName,
      phoneNumber: activeCall.phoneNumber,
      simSlot: activeCall.simSlot,
      type: 'missed',
      timestamp: 'Just now',
      duration: 'Declined',
      hasWhatsApp: true
    });
    setCallLogs(PhoneCallService.getCallLogs());
    setActiveCall(prev => prev ? { ...prev, status: 'ended' } : null);
    setTimeout(() => setActiveCall(null), 400);
  };

  // Active call duration timer
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected') return;
    const timer = setInterval(() => {
      setActiveCall(prev => prev ? { ...prev, durationSeconds: prev.durationSeconds + 1 } : null);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeCall?.status]);

  // Handle Keypad Press
  const handleKeyPress = (char: string) => {
    const freqs: Record<string, number> = {
      '1': 697, '2': 697, '3': 697,
      '4': 770, '5': 770, '6': 770,
      '7': 852, '8': 852, '9': 852,
      '*': 941, '0': 941, '#': 941
    };
    playTone(freqs[char] || 440);
    setDialedNumber(prev => prev + char);
  };

  const handleBackspace = () => {
    playTone(300);
    setDialedNumber(prev => prev.slice(0, -1));
  };

  // Trigger Outgoing Call
  const handleInitiateCall = (numberOrName: string, simSlot?: 1 | 2) => {
    const cleanNumber = numberOrName.trim();
    if (!cleanNumber) return;

    // Check if USSD code
    if (cleanNumber.startsWith('*') && cleanNumber.endsWith('#')) {
      handleDialUssd(cleanNumber);
      return;
    }

    // Selected SIM slot: explicitly passed or defaults to active caller account SIM
    const effectiveSimSlot = simSlot || activeCallerAccount?.simSlot || 1;

    // Normal Phone Call
    const contact = PhoneCallService.findContactByNumber(cleanNumber);
    const displayName = contact ? contact.name : cleanNumber;

    // Add to call log
    PhoneCallService.addCallLog({
      contactName: displayName,
      phoneNumber: cleanNumber,
      simSlot: effectiveSimSlot,
      type: 'outgoing',
      timestamp: 'Just now',
      duration: 'Connecting...',
      hasWhatsApp: true
    });
    setCallLogs(PhoneCallService.getCallLogs());

    // Start calling screen
    setActiveCall({
      contactName: displayName,
      phoneNumber: cleanNumber,
      simSlot: effectiveSimSlot,
      status: 'dialing',
      durationSeconds: 0,
      isMuted: false,
      isSpeaker: false,
      callerRole: activeCallerAccount?.role || 'user'
    });

    // Simulate answering after 2.2 seconds
    setTimeout(() => {
      setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
    }, 2200);
  };

  // End Active Call
  const handleEndCall = () => {
    if (!activeCall) return;
    setActiveCall(prev => prev ? { ...prev, status: 'ended' } : null);
    setTimeout(() => {
      setActiveCall(null);
    }, 700);
  };

  // Trigger USSD Code Execution
  const handleDialUssd = (code: string) => {
    setUssdStep('running');
    setDialedNumber('');

    setTimeout(() => {
      if (code === '*889#' || code.startsWith('*889')) {
        // CBE Mobile Banking USSD
        setUssdStep('cbe_login');
        setUssdInput('');
      } else if (code === '*804#' || code.startsWith('*804')) {
        // Ethio telecom airtime balance
        setUssdStep('ethio_telecom_balance');
        setUssdInput('');
      } else {
        // Generic USSD response
        setUssdStep('cbe_login');
        setUssdInput('');
      }
    }, 450);
  };

  // Close USSD Session
  const handleCloseUssd = (toastMessage?: string) => {
    setUssdStep('idle');
    setUssdInput('');
    setUssdHistory([]);
    if (toastMessage) {
      setUssdToast(toastMessage);
      setTimeout(() => setUssdToast(null), 3000);
    }
  };

  // Handle USSD "Send" Submission
  const handleUssdSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = ussdInput.trim();

    switch (ussdStep) {
      case 'cbe_login':
        // User entered PIN
        setUssdStep('cbe_menu');
        setUssdInput('');
        break;

      case 'cbe_menu':
        // Menu Options matching Screenshot 2:
        // 1:My Account
        // 2:Transfer to CBE Account
        // 3:Beneficiary
        // 4:Own Account Transfer
        // 5:CBE Fast Loan
        // 6:Airtime
        // 7:Other Transfers
        // 8:CBEBirr
        // 9:Next
        if (val === '1') {
          setUssdStep('cbe_select_account');
          setUssdInput('');
        } else if (val === '2') {
          setUssdStep('cbe_transfer_acc');
          setUssdInput('');
        } else if (val === '3') {
          setUssdStep('cbe_beneficiary');
          setUssdInput('');
        } else if (val === '4') {
          setUssdStep('cbe_select_account');
          setUssdInput('');
        } else if (val === '5') {
          setUssdStep('cbe_fast_loan');
          setUssdInput('');
        } else if (val === '6') {
          setUssdStep('cbe_airtime_menu');
          setUssdInput('');
        } else if (val === '7') {
          setUssdStep('cbe_other_transfers');
          setUssdInput('');
        } else if (val === '8') {
          setUssdStep('cbe_cbebirr');
          setUssdInput('');
        } else if (val === '9') {
          setUssdStep('cbe_menu_page2');
          setUssdInput('');
        } else {
          setUssdStep('cbe_select_account');
          setUssdInput('');
        }
        break;

      case 'cbe_menu_page2':
        // Page 2 of Main Menu: 9:Back returns to cbe_menu
        setUssdStep('cbe_menu');
        setUssdInput('');
        break;

      case 'cbe_beneficiary':
        // 1-3: details, 4:Back
        setUssdStep('cbe_menu');
        setUssdInput('');
        break;

      case 'cbe_fast_loan':
        // 3:Back
        setUssdStep('cbe_menu');
        setUssdInput('');
        break;

      case 'cbe_other_transfers':
        // 3:Back
        setUssdStep('cbe_menu');
        setUssdInput('');
        break;

      case 'cbe_cbebirr':
        // 3:Back
        setUssdStep('cbe_menu');
        setUssdInput('');
        break;

      case 'cbe_select_account':
        // Select Account
        // 1: Saving Account-4747
        // 2: Back
        if (val === '1') {
          setUssdStep('cbe_account_summary');
          setUssdInput('');
        } else if (val === '2') {
          setUssdStep('cbe_menu');
          setUssdInput('');
        } else {
          setUssdStep('cbe_account_summary');
          setUssdInput('');
        }
        break;

      case 'cbe_account_summary':
        // Account summary and transactions list (Screenshot 1)
        // 1-5: view transaction details
        // 6: Back
        // 7: Next
        if (val === '6') {
          setUssdStep('cbe_select_account');
          setUssdInput('');
        } else if (val === '7') {
          setUssdStep('cbe_account_summary_page2');
          setUssdInput('');
        } else {
          const idx = parseInt(val, 10);
          if (!isNaN(idx) && idx >= 1 && idx <= 5) {
            setSelectedTxIndex(idx - 1);
            setUssdStep('cbe_tx_detail');
            setUssdInput('');
          } else {
            setSelectedTxIndex(0);
            setUssdStep('cbe_tx_detail');
            setUssdInput('');
          }
        }
        break;

      case 'cbe_account_summary_page2':
        // Page 2 of transactions
        if (val === '6') {
          setUssdStep('cbe_select_account');
          setUssdInput('');
        } else if (val === '7') {
          setUssdStep('cbe_account_summary');
          setUssdInput('');
        } else {
          const idx = parseInt(val, 10);
          if (!isNaN(idx) && idx >= 1 && idx <= 5) {
            setSelectedTxIndex(5 + (idx - 1));
            setUssdStep('cbe_tx_detail');
            setUssdInput('');
          } else {
            setSelectedTxIndex(5);
            setUssdStep('cbe_tx_detail');
            setUssdInput('');
          }
        }
        break;

      case 'cbe_tx_detail':
        // Transaction detail (Screenshot 3)
        // 1: Back
        if (selectedTxIndex >= 5) {
          setUssdStep('cbe_account_summary_page2');
        } else {
          setUssdStep('cbe_account_summary');
        }
        setUssdInput('');
        break;

      case 'cbe_transfer_acc':
        // User entered recipient account number
        if (!val) {
          handleCloseUssd('Account number required.');
          return;
        }
        const allUsers = LocalDb.getUsers();
        const foundUser = allUsers.find(u => u.accountNumber === val);
        const recipientName = foundUser ? foundUser.name : 'Dejene Buta Feye';
        setTransferData(prev => ({ ...prev, recipientAcc: val, recipientName }));
        setUssdStep('cbe_transfer_amount');
        setUssdInput('');
        break;

      case 'cbe_transfer_amount':
        // User entered amount
        const amt = parseFloat(val);
        if (isNaN(amt) || amt <= 0) {
          handleCloseUssd('Invalid transfer amount.');
          return;
        }
        setTransferData(prev => ({ ...prev, amount: amt }));
        setUssdStep('cbe_transfer_reason');
        setUssdInput('');
        break;

      case 'cbe_transfer_reason':
        // User entered transfer reason / remarks
        setTransferData(prev => ({ ...prev, reason: val || 'Mobile Transfer' }));
        setUssdStep('cbe_transfer_confirm');
        setUssdInput('');
        break;

      case 'cbe_transfer_confirm':
        // 1: Confirm, 2: Cancel
        if (val === '1') {
          // Perform real transfer in LocalDb!
          try {
            const currentTxs = LocalDb.getTransactions();
            const newTx: Transaction = {
              id: 'FT' + Date.now().toString().slice(-10),
              type: 'transfer',
              senderId: user.id,
              senderName: user.name,
              senderAccount: user.accountNumber,
              recipientName: transferData.recipientName,
              recipientAccount: transferData.recipientAcc,
              recipientBank: 'Commercial Bank of Ethiopia',
              amount: transferData.amount,
              fee: 0,
              description: transferData.reason || 'CBE USSD *889# Mobile Transfer',
              status: 'success',
              reference: 'REF' + Math.floor(100000 + Math.random() * 900000),
              createdAt: new Date().toISOString(),
              category: 'ACCOUNT TO ACCOUNT'
            };

            // Deduct user balance
            const dbUsers = LocalDb.getUsers();
            const uIdx = dbUsers.findIndex(u => u.id === user.id);
            if (uIdx !== -1) {
              dbUsers[uIdx].balance = Math.max(0, (dbUsers[uIdx].balance || 0) - transferData.amount);
              dbUsers[uIdx].availableBalance = dbUsers[uIdx].balance;
              LocalDb.setUsers(dbUsers);
            }

            LocalDb.setTransactions([newTx, ...currentTxs]);

            // Sync to Caller App so the transaction account appears at the top with "Now" badge
            try {
              PhoneCallService.syncTransactionToCallerApp(newTx);
              setCallerAccounts(PhoneCallService.getCallerAccounts());
            } catch {}

            // Dispatch SMS and Truecaller alert
            try {
              SmsService.createSmsFromTransaction(newTx, dbUsers[uIdx]?.balance);
            } catch {}

            setUssdStep('cbe_transfer_done');
            setUssdInput('');
          } catch (err: unknown) {
            handleCloseUssd(err instanceof Error ? err.message : 'Transfer failed.');
          }
        } else {
          handleCloseUssd('Transfer canceled.');
        }
        break;

      case 'cbe_transfer_done':
        handleCloseUssd('Transaction complete. Thank you for banking with CBE.');
        break;

      case 'cbe_airtime_menu':
        // 1: Self Recharge, 2: Other Phone, 3: Back
        if (val === '1') {
          setAirtimeData({ phone: user.phone || '0968161314', amount: 0 });
          setUssdStep('cbe_airtime_amount');
          setUssdInput('');
        } else if (val === '3') {
          setUssdStep('cbe_menu');
          setUssdInput('');
        } else {
          setAirtimeData({ phone: '0978730420', amount: 0 });
          setUssdStep('cbe_airtime_amount');
          setUssdInput('');
        }
        break;

      case 'cbe_airtime_amount':
        const airtimeAmt = parseFloat(val);
        if (isNaN(airtimeAmt) || airtimeAmt <= 0) {
          handleCloseUssd('Invalid airtime amount.');
          return;
        }
        setAirtimeData(prev => ({ ...prev, amount: airtimeAmt }));
        try {
          const currentTxs = LocalDb.getTransactions();
          const airtimeTx: Transaction = {
            id: 'FT' + Date.now().toString().slice(-10),
            type: 'airtime',
            senderId: user.id,
            senderName: user.name,
            senderAccount: user.accountNumber,
            recipientName: 'Ethio Telecom',
            recipientAccount: airtimeData.phone,
            recipientBank: 'Ethio Telecom',
            amount: airtimeAmt,
            fee: 0,
            description: `Airtime recharge for ${airtimeData.phone}`,
            status: 'success',
            reference: 'REF' + Math.floor(100000 + Math.random() * 900000),
            createdAt: new Date().toISOString(),
            category: 'AIRTIME TOP-UP'
          };

          const dbUsers = LocalDb.getUsers();
          const uIdx = dbUsers.findIndex(u => u.id === user.id);
          if (uIdx !== -1) {
            dbUsers[uIdx].balance = Math.max(0, (dbUsers[uIdx].balance || 0) - airtimeAmt);
            dbUsers[uIdx].availableBalance = dbUsers[uIdx].balance;
            LocalDb.setUsers(dbUsers);
          }

          LocalDb.setTransactions([airtimeTx, ...currentTxs]);

          setUssdStep('cbe_airtime_done');
          setUssdInput('');
        } catch {
          handleCloseUssd('Airtime recharge failed.');
        }
        break;

      case 'cbe_airtime_done':
        handleCloseUssd('Airtime recharge successful.');
        break;

      case 'ethio_telecom_balance':
        handleCloseUssd();
        break;

      default:
        handleCloseUssd();
        break;
    }
  };

  // Format seconds to mm:ss
  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Format account number for USSD display (e.g. "Saving Account-4747")
  const formattedAccountDisplay = useMemo(() => {
    const raw = activeCallerAccount?.accountNumber || user.accountNumber || '1000419524747';
    const last4 = raw.slice(-4);
    return `Saving Account-${last4}`;
  }, [activeCallerAccount?.accountNumber, user.accountNumber]);

  // Dynamic transactions list for USSD - strictly shows only the active caller's bank account transactions
  const sampleTransactions = useMemo(() => {
    if (!activeCallerAccount) return [];

    const callerAccNum = activeCallerAccount.accountNumber;
    const callerNameLower = activeCallerAccount.name.toLowerCase();

    // 1. Get transactions stored or generated specifically for this caller's bank account
    const callerStoredTxs: AccountTransactionItem[] = PhoneCallService.getCallerTransactions(activeCallerAccount.id);

    // 2. Filter real user banking transactions that strictly involve this caller's bank account
    const realMatchedTxs: AccountTransactionItem[] = (userTransactions || [])
      .filter(tx => {
        const sAcc = tx.senderAccount;
        const rAcc = tx.recipientAccount;
        const sName = (tx.senderName || '').toLowerCase();
        const rName = (tx.recipientName || '').toLowerCase();
        return sAcc === callerAccNum || rAcc === callerAccNum || sName === callerNameLower || rName === callerNameLower;
      })
      .map(tx => {
        const isOut = tx.senderAccount === callerAccNum || (tx.senderName || '').toLowerCase() === callerNameLower;
        const sign = isOut ? '-' : '+';
        const d = new Date(tx.createdAt);
        const day = d.getDate();
        const month = d.getMonth() + 1;
        const formattedAmt = formatUssdTxAmount(tx.amount);

        return {
          id: tx.id,
          line: `${sign}${formattedAmt} on ${day}/${month}`,
          amount: `${sign}${tx.amount.toFixed(2)} ETB`,
          rawAmount: tx.amount,
          type: (isOut ? 'out' : 'in') as 'in' | 'out',
          paymentAbout: tx.description || 'Pay done via Mobile',
          sender: tx.senderName || (isOut ? activeCallerAccount.name : 'Dejene Buta Feye'),
          senderAccount: tx.senderAccount,
          receiver: tx.recipientName || (isOut ? 'Leykun Jemaneh Ylma' : activeCallerAccount.name),
          receiverAccount: tx.recipientAccount,
          date: tx.createdAt ? tx.createdAt.replace('T', ' ').slice(0, 16) : `${day}/${month}`,
          timestamp: new Date(tx.createdAt).getTime()
        };
      });

    // Merge: prioritize real matched transactions for this caller, followed by caller's account transactions
    const combined: AccountTransactionItem[] = [...realMatchedTxs];
    for (const tx of callerStoredTxs) {
      if (!combined.some(c => c.id === tx.id)) {
        combined.push(tx);
      }
    }

    // Always ensure traction out transactions are available (featuring 399, 440, 6000 etc. between 50-100,000)
    const smallTractionTxs = PhoneCallService.generateSmallTractionTransactions(activeCallerAccount);
    for (const t of smallTractionTxs) {
      if (!combined.some(c => c.id === t.id || c.line === t.line)) {
        combined.push(t);
      }
    }

    // Sort descending by timestamp (newest transactions first)
    combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // CRITICAL USER DIRECTIVE:
    // Only ONE transaction in the list is 'in' (the current transaction).
    // ALL OTHER transactions MUST be 'out' transactions with amounts between 50 and 100,000 ETB (including 399, 440, 6000, etc.).
    let hasCurrentInTx = false;
    const sanitizedTxs: AccountTransactionItem[] = [];

    for (let i = 0; i < combined.length; i++) {
      const tx = combined[i];
      if (tx.type === 'in') {
        if (!hasCurrentInTx) {
          // This is the current transaction - the single allowed incoming transaction
          hasCurrentInTx = true;
          sanitizedTxs.push(tx);
        } else {
          // Any other subsequent transaction must be converted to an OUT transaction
          const formatted = formatUssdTxAmount(tx.rawAmount);
          sanitizedTxs.push({
            ...tx,
            type: 'out',
            line: `-${formatted} on ${tx.line.includes(' on ') ? tx.line.split(' on ')[1] : '4/9'}`,
            amount: `-${tx.rawAmount.toFixed(2)} ETB`,
            sender: activeCallerAccount.name,
            senderAccount: activeCallerAccount.accountNumber,
            receiver: tx.sender || 'CBE Merchant Pay',
            receiverAccount: tx.senderAccount || '1000999999999'
          });
        }
      } else {
        // Already an out transaction
        sanitizedTxs.push(tx);
      }
    }

    // If receiver account has no 'in' transaction yet, ensure the top current transaction is 'in'
    if (!hasCurrentInTx && activeCallerAccount.role === 'receiver') {
      const curAmt = activeCallerAccount.lastTxAmount && activeCallerAccount.lastTxAmount > 0 
        ? activeCallerAccount.lastTxAmount 
        : 50.0;
      const formatted = formatUssdTxAmount(curAmt);
      sanitizedTxs.unshift({
        id: `tx-${activeCallerAccount.id}-current-in`,
        line: `+${formatted} on 4/9`,
        amount: `+${curAmt.toFixed(2)} ETB`,
        rawAmount: curAmt,
        type: 'in',
        paymentAbout: 'Pay done via Mobile',
        sender: 'Dejene Buta Feye',
        senderAccount: '1000284758657',
        receiver: activeCallerAccount.name,
        receiverAccount: activeCallerAccount.accountNumber,
        date: '2026-09-04 18:22',
        timestamp: Date.now()
      });
    }

    return sanitizedTxs;
  }, [userTransactions, activeCallerAccount]);

  // Current active caller available balance:
  // - For Receiver: strictly the total of the received amount and initial balance (initialBalance + receivedAmount)
  // - For Sender: strictly the initial balance minus the current sent amount (initialBalance - sentAmount)
  const computedBalance = useMemo(() => {
    if (!activeCallerAccount) return user.balance ?? 18450.50;

    const cleanAcc = (activeCallerAccount.accountNumber || '').replace(/\D/g, '');
    const cleanUserAcc = (user.accountNumber || '').replace(/\D/g, '');
    const isGlobal = cleanAcc === '1000170986671' || activeCallerAccount.name.toLowerCase().includes('global');
    const isCurrentUser = (cleanUserAcc && cleanAcc === cleanUserAcc) || 
      (user.name && activeCallerAccount.name && (
        user.name.toLowerCase() === activeCallerAccount.name.toLowerCase() ||
        user.name.toLowerCase().includes(activeCallerAccount.name.toLowerCase()) ||
        activeCallerAccount.name.toLowerCase().includes(user.name.toLowerCase())
      ));

    if (activeCallerAccount.role === 'receiver') {
      const initialBal = typeof activeCallerAccount.initialBalance === 'number' && !isNaN(activeCallerAccount.initialBalance)
        ? activeCallerAccount.initialBalance
        : 18400.50;
      // The available balance is strictly the total of the received amount and the initial balance
      const currentInTx = sampleTransactions.find(tx => tx.type === 'in');
      const receivedAmount = currentInTx 
        ? (currentInTx.rawAmount ?? 0) 
        : (activeCallerAccount.lastTxAmount || 50.0);
      const avail = Math.round((initialBal + receivedAmount) * 100) / 100;
      return avail;
    } else {
      // SENDER CALCULATION:
      // 1. If this account is the active user in the app, return user's balance
      if (isCurrentUser && typeof user.balance === 'number' && !isNaN(user.balance)) {
        return Math.round(user.balance * 100) / 100;
      }
      // 2. If this account is Global Online Market, return strictly 9,990,101,402.40 ETB
      if (isGlobal) {
        return 9990101402.40;
      }
      // 3. If this account has a preset sender balance (e.g. Dejene: 10432.00, Kasahun: 8760.00)
      if (cleanAcc && SENDER_PRESET_BALANCES[cleanAcc]) {
        return SENDER_PRESET_BALANCES[cleanAcc];
      }

      // 4. Mathematical calculation: initial balance minus sent amount
      const initialBal = typeof activeCallerAccount.initialBalance === 'number' && !isNaN(activeCallerAccount.initialBalance)
        ? activeCallerAccount.initialBalance
        : (activeCallerAccount.balance ? activeCallerAccount.balance + 50.0 : 10482.00);

      const outTxs = sampleTransactions.filter(tx => tx.type === 'out');
      const totalOutFromTxs = outTxs.reduce((sum, tx) => sum + (tx.rawAmount || 0), 0);
      const sentAmount = totalOutFromTxs > 0 
        ? totalOutFromTxs 
        : ((activeCallerAccount.lastTxAmount && activeCallerAccount.lastTxAmount > 0)
            ? activeCallerAccount.lastTxAmount 
            : 50.0);

      const calculatedAvail = Math.max(0, Math.round((initialBal - sentAmount) * 100) / 100);

      if (typeof activeCallerAccount.availableBalance === 'number' && activeCallerAccount.availableBalance > 0) {
        return Math.round(activeCallerAccount.availableBalance * 100) / 100;
      }

      return calculatedAvail > 0 ? calculatedAvail : (activeCallerAccount.balance || 10432.00);
    }
  }, [activeCallerAccount, sampleTransactions, user.balance, user.accountNumber, user.name]);

  // Current active caller balance formatted for USSD display
  const formattedBalance = useMemo(() => {
    return computedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [computedBalance]);

  // Page 1 and Page 2 of Transactions
  const page1Txs = useMemo(() => sampleTransactions.slice(0, 5), [sampleTransactions]);
  const page2Txs = useMemo(() => sampleTransactions.slice(5, 10), [sampleTransactions]);

  // Highest transaction timestamp for caller accounts
  const highestTxTimestamp = useMemo(() => {
    return Math.max(0, ...callerAccounts.map(a => a.lastTxTimestamp || 0));
  }, [callerAccounts]);

  // Filter caller accounts by role tab, ensuring recent transactions are sorted to the TOP
  const filteredCallerAccounts = useMemo(() => {
    let list = [...callerAccounts];

    // Find the max transaction timestamp
    let maxTxTimestamp = 0;
    for (const a of list) {
      if (a.lastTxTimestamp && a.lastTxTimestamp > maxTxTimestamp) {
        maxTxTimestamp = a.lastTxTimestamp;
      }
    }

    list.sort((a, b) => {
      // 1. isNow priority
      const isNowA = Boolean(a.isNow || (maxTxTimestamp > 0 && a.lastTxTimestamp === maxTxTimestamp));
      const isNowB = Boolean(b.isNow || (maxTxTimestamp > 0 && b.lastTxTimestamp === maxTxTimestamp));
      if (isNowA && !isNowB) return -1;
      if (!isNowA && isNowB) return 1;

      // 2. Timestamp priority (recent first)
      const timeA = a.lastTxTimestamp || 0;
      const timeB = b.lastTxTimestamp || 0;
      if (timeA !== timeB) return timeB - timeA;

      // 3. Accounts that have a lastTxAmount over those that don't
      if (a.lastTxAmount && !b.lastTxAmount) return -1;
      if (!a.lastTxAmount && b.lastTxAmount) return 1;

      return 0;
    });

    if (accountFilter === 'sender') {
      return list.filter(a => a.role === 'sender');
    }
    if (accountFilter === 'receiver') {
      return list.filter(a => a.role === 'receiver');
    }
    return list;
  }, [callerAccounts, accountFilter]);

  const currentDetailTx = sampleTransactions[selectedTxIndex] || sampleTransactions[0];

  // Exact USSD string content generator to ensure pristine formatting
  const ussdContentText = useMemo(() => {
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
          '6:Airtime',
          '7:Other Transfers',
          '8:CBEBirr',
          '9:Next'
        ].join('\n');

      case 'cbe_menu_page2':
        return [
          '1:Utility Payment',
          '2:Change PIN',
          '3:Language',
          '4:Mini Statement',
          '5:Manage Beneficiary',
          '6:Cheque Services',
          '7:Forex Rates',
          '8:Help / Contact',
          '9:Back'
        ].join('\n');

      case 'cbe_select_account':
        return [
          'Select Account',
          `1:${formattedAccountDisplay}`,
          '2:Back'
        ].join('\n');

      case 'cbe_account_summary':
        return [
          activeCallerAccount?.name || user.name || 'Leykun Jemaneh Ylma',
          `Available Balance is ETB ${formattedBalance}`,
          'Transactions',
          ...page1Txs.map((tx, idx) => `${idx + 1}:${tx.line}`),
          '6:Back',
          '7:Next'
        ].join('\n');

      case 'cbe_account_summary_page2':
        return [
          activeCallerAccount?.name || user.name || 'Leykun Jemaneh Ylma',
          `Available Balance is ETB ${formattedBalance}`,
          'Transactions (Page 2)',
          ...page2Txs.map((tx, idx) => `${idx + 1}:${tx.line}`),
          '6:Back',
          '7:Next'
        ].join('\n');

      case 'cbe_tx_detail':
        return [
          `Amount:${currentDetailTx.amount}`,
          `About Payment: ${currentDetailTx.paymentAbout}`,
          `From ${currentDetailTx.sender} to ${currentDetailTx.receiver}`,
          `On Date:${currentDetailTx.date}`,
          '1:Back'
        ].join('\n');

      case 'cbe_beneficiary':
        return [
          '1:Dejene Buta Feye',
          '2:Kasahun Yematawork',
          '3:Add Beneficiary',
          '4:Back'
        ].join('\n');

      case 'cbe_fast_loan':
        return [
          'CBE Fast Loan',
          '1:Check Eligibility',
          '2:Apply Loan (Up to ETB 15,000)',
          '3:Back'
        ].join('\n');

      case 'cbe_other_transfers':
        return [
          'Other Transfers',
          '1:Transfer to Other Bank',
          '2:Telebirr',
          '3:Back'
        ].join('\n');

      case 'cbe_cbebirr':
        return [
          'CBEBirr',
          '1:CBEBirr to CBE Account',
          '2:CBE Account to CBEBirr',
          '3:Back'
        ].join('\n');

      case 'cbe_transfer_acc':
        return 'Enter Recipient CBE Account Number:\n(e.g. 1000...)';

      case 'cbe_transfer_amount':
        return `Transfer to: ${transferData.recipientName}\nEnter Amount (ETB):`;

      case 'cbe_transfer_reason':
        return 'Enter Reason / Remark:';

      case 'cbe_transfer_confirm':
        return [
          'Confirm Transfer:',
          `To: ${transferData.recipientName}`,
          `Account: ${transferData.recipientAcc}`,
          `Amount: ETB ${transferData.amount.toFixed(2)}`,
          'Fee: ETB 0.00',
          '1:Confirm',
          '2:Cancel'
        ].join('\n');

      case 'cbe_transfer_done':
        return [
          'Transaction Successful!',
          `ETB ${transferData.amount.toFixed(2)} transferred to ${transferData.recipientName}.`,
          'SMS & Truecaller alert generated.',
          '1:OK'
        ].join('\n');

      case 'cbe_airtime_menu':
        return [
          'Airtime Top-up',
          `1:Self Recharge (${user.phone || '0968161314'})`,
          '2:Other Phone',
          '3:Back'
        ].join('\n');

      case 'cbe_airtime_amount':
        return `Recharge for: ${airtimeData.phone}\nEnter Airtime Amount (ETB 5 - 1000):`;

      case 'cbe_airtime_done':
        return `Airtime Top-up of ETB ${airtimeData.amount} successful for ${airtimeData.phone}!\n1:OK`;

      case 'ethio_telecom_balance':
        return [
          'Dear Customer, your main account balance is ETB 45.20.',
          'Active Package: 1.5 GB Monthly (Valid till 2026-10-01).',
          'Voice: 42 Mins.',
          '1:OK'
        ].join('\n');

      default:
        return '';
    }
  }, [
    ussdStep, 
    formattedAccountDisplay, 
    activeCallerAccount?.name, 
    user.name, 
    formattedBalance, 
    page1Txs, 
    page2Txs, 
    currentDetailTx, 
    transferData, 
    user.phone, 
    airtimeData
  ]);

  return (
    <div 
      className="relative w-full h-full bg-black text-white flex flex-col overflow-hidden font-sans select-none"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      {/* 2. Top Header Row: Search & Settings Hexagon (Right-aligned matching Screenshot 1) */}
      <div className="w-full px-4 pt-[max(env(safe-area-inset-top,0px),8px)] pb-1 flex items-center justify-between shrink-0 z-10">
        <div className="w-5" />

        <div className="flex items-center gap-3.5">
          <button 
            onClick={() => setIsSearching(!isSearching)}
            className="p-1 text-neutral-300 hover:text-white transition active:scale-95"
            title="Search call logs"
          >
            <Search className="w-5 h-5 stroke-[1.8]" />
          </button>

          {/* Phone Model & Status Bar Settings */}
          <button 
            id="btn-phone-model-settings"
            onClick={() => setIsPhoneSettingsOpen(true)}
            className="p-1 text-neutral-300 hover:text-white transition active:scale-95"
            title="Change Phone Model and Status Bar Style"
          >
            <Smartphone className="w-5 h-5 stroke-[1.8] text-blue-400" />
          </button>

          {/* Settings Hexagon Icon from screenshot - opens Caller Accounts Drawer */}
          <button 
            id="btn-caller-accounts-settings"
            onClick={() => setIsSettingsOpen(true)}
            className="relative p-1 text-neutral-300 hover:text-white transition active:scale-95"
            title="Caller Accounts & Settings"
          >
            <Hexagon className="w-5 h-5 stroke-[1.8]" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-black flex items-center justify-center text-[7.5px] font-bold text-black">
              {callerAccounts.length}
            </span>
          </button>
        </div>
      </div>

      {/* Big Title: Recents (Large bold display matching Screenshot 1) */}
      <div className="px-4 pb-1 shrink-0 z-10">
        <h1 className="text-[32px] font-bold tracking-tight text-white leading-tight">
          {activeTab === 'recents' ? 'Recents' : 'Contacts'}
        </h1>
      </div>

      {/* Active Caller Profile Bar (Sender / Receiver switchable) */}
      <div className="px-4 pb-2.5 flex items-center justify-between shrink-0 z-10">
        <button 
          id="btn-active-caller-chip"
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition active:scale-98 text-left group"
          title="Click to switch caller account between sender and receiver"
        >
          <div className={`w-2 h-2 rounded-full ${activeCallerAccount?.role === 'sender' ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
          <span className="text-[11.5px] text-neutral-300 font-medium">
            Caller: <strong className="text-white font-semibold">{activeCallerAccount?.name || user.name}</strong>
          </span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
            activeCallerAccount?.role === 'sender' 
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          }`}>
            {activeCallerAccount?.role || 'receiver'}
          </span>
        </button>

        <button 
          id="btn-caller-accounts-toggle"
          onClick={() => setIsSettingsOpen(true)}
          className="text-[11px] text-[#1a73e8] hover:text-blue-400 font-semibold flex items-center gap-1 transition"
          title="View all transaction caller accounts"
        >
          <span>{callerAccounts.length} Accounts</span>
        </button>
      </div>

      {/* Search Input Bar (Expandable) */}
      {isSearching && (
        <div className="px-4 pb-2 animate-in fade-in slide-in-from-top-1">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 flex items-center gap-2">
            <Search className="w-4 h-4 text-neutral-500" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or number..."
              className="bg-transparent text-sm text-white placeholder-neutral-500 outline-hidden flex-1"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-neutral-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Sub-tabs: "All" and "Missed Calls" (2 equal columns matching Screenshot 1) */}
      {activeTab === 'recents' && (
        <div className="w-full grid grid-cols-2 border-b border-neutral-900/80 shrink-0 z-10">
          <button 
            onClick={() => setRecentsFilter('all')}
            className="flex flex-col items-center justify-center pb-2 cursor-pointer"
          >
            <span className={`text-[16px] transition ${
              recentsFilter === 'all' ? 'text-white font-semibold' : 'text-[#8e9297] font-medium'
            }`}>
              All
            </span>
            {recentsFilter === 'all' && (
              <span className="w-12 h-[3.5px] bg-[#1a73e8] rounded-full mt-2" />
            )}
          </button>

          <button 
            onClick={() => setRecentsFilter('missed')}
            className="flex flex-col items-center justify-center pb-2 cursor-pointer"
          >
            <span className={`text-[16px] transition ${
              recentsFilter === 'missed' ? 'text-white font-semibold' : 'text-[#8e9297] font-medium'
            }`}>
              Missed Calls
            </span>
            {recentsFilter === 'missed' && (
              <span className="w-12 h-[3.5px] bg-[#1a73e8] rounded-full mt-2" />
            )}
          </button>
        </div>
      )}

      {/* 4. Main Scrollable List Area (Call Logs or Contacts) */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 divide-y divide-neutral-900/40 scrollbar-none">
        {activeTab === 'recents' ? (
          filteredCallLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-500 text-sm">
              <Clock className="w-10 h-10 mb-2 stroke-1 opacity-50" />
              <p>No recent calls</p>
            </div>
          ) : (
            filteredCallLogs.map((log) => (
              <div 
                key={log.id}
                onClick={() => handleInitiateCall(log.phoneNumber, log.simSlot)}
                className="pt-2 pb-2.5 flex items-center justify-between hover:bg-neutral-900/40 active:bg-neutral-900 rounded-lg px-1 cursor-pointer transition"
              >
                {/* Left: Direction handset icon, Contact Name, SIM slot badge, Phone number */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="pt-1 text-neutral-400 shrink-0">
                    <Phone className="w-4 h-4 text-neutral-400 rotate-[15deg] stroke-[1.8]" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-[16px] font-bold text-white tracking-tight leading-snug truncate">
                      {log.contactName}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5">
                      {/* SIM 1 / SIM 2 Square Badge matching screenshot: [2] or [1] */}
                      <span className="border border-neutral-600 text-[10px] font-mono px-1 py-[0.5px] rounded-[2px] text-neutral-300 leading-none">
                        {log.simSlot}
                      </span>
                      <span className="text-[13px] tracking-tight text-[#8e9297] truncate">
                        {log.phoneNumber}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Timestamp and (i) Info icon */}
                <div className="flex items-center gap-3 shrink-0 pl-2">
                  <span className="text-[13px] text-[#8e9297] tracking-tight">
                    {log.timestamp}
                  </span>

                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCallDetail(log);
                    }}
                    className="p-1 rounded-full text-neutral-300 hover:text-white hover:bg-neutral-800 transition active:scale-90"
                    title="Call details"
                  >
                    <Info className="w-5 h-5 stroke-[1.5]" />
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          /* Contacts List */
          filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-500 text-sm">
              <Users className="w-10 h-10 mb-2 stroke-1 opacity-50" />
              <p>No contacts found</p>
            </div>
          ) : (
            filteredContacts.map(contact => (
              <div 
                key={contact.id}
                onClick={() => handleInitiateCall(contact.phoneNumber, contact.simPreferred || 1)}
                className="py-2.5 flex items-center justify-between hover:bg-neutral-900/40 active:bg-neutral-900 rounded-lg px-1 cursor-pointer transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${contact.avatarColor || 'from-blue-600 to-purple-600'} flex items-center justify-center text-white font-bold text-sm shadow-xs`}>
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[15px] font-medium text-white">{contact.name}</div>
                    <div className="text-xs text-neutral-400">{contact.phoneNumber}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInitiateCall(contact.phoneNumber, contact.simPreferred || 1);
                  }}
                  className="p-2 text-emerald-400 hover:text-emerald-300"
                >
                  <Phone className="w-4.5 h-4.5" />
                </button>
              </div>
            ))
          )
        )}
      </div>

      {/* 5. Keypad Overlay Sheet (Matching Screenshot_20260906-121622.png) */}
      {isKeypadOpen && (
        <div className="w-full bg-black border-t border-neutral-900/80 px-4 pt-1 pb-1 shrink-0 z-20 animate-in slide-in-from-bottom-6 duration-200">
          
          {/* Dialed Number Display (if any) */}
          {dialedNumber && (
            <div className="w-full flex items-center justify-between py-1.5 px-2 mb-1 border-b border-neutral-900">
              <div className="text-2xl font-bold tracking-wider text-white font-mono truncate">
                {dialedNumber}
              </div>
              <button 
                onClick={handleBackspace}
                className="p-2 text-neutral-400 hover:text-white active:scale-95 transition"
                title="Backspace"
              >
                <Delete className="w-6 h-6" />
              </button>
            </div>
          )}

          {/* 3x4 Number Grid matching Screenshot 1 */}
          <div className="grid grid-cols-3 gap-y-1.5 gap-x-6 text-center my-1 max-w-[320px] mx-auto">
            {/* Row 1 */}
            <button 
              type="button"
              onClick={() => handleKeyPress('1')}
              className="py-1 active:bg-neutral-800/80 rounded-xl transition flex flex-col items-center justify-center select-none"
            >
              <span className="text-[28px] font-normal leading-tight text-white">1</span>
              {/* Voicemail tape icon: two circles connected by a line */}
              <div className="flex items-center justify-center -mt-0.5">
                <div className="w-2.5 h-2.5 rounded-full border border-neutral-400" />
                <div className="w-2 h-[1px] bg-neutral-400 -mx-0.5" />
                <div className="w-2.5 h-2.5 rounded-full border border-neutral-400" />
              </div>
            </button>

            <button 
              type="button"
              onClick={() => handleKeyPress('2')}
              className="py-1 active:bg-neutral-800/80 rounded-xl transition flex flex-col items-center justify-center select-none"
            >
              <span className="text-[28px] font-normal leading-tight text-white">2</span>
              <span className="text-[10px] text-neutral-400 font-semibold tracking-wider leading-none">ABC</span>
            </button>

            <button 
              type="button"
              onClick={() => handleKeyPress('3')}
              className="py-1 active:bg-neutral-800/80 rounded-xl transition flex flex-col items-center justify-center select-none"
            >
              <span className="text-[28px] font-normal leading-tight text-white">3</span>
              <span className="text-[10px] text-neutral-400 font-semibold tracking-wider leading-none">DEF</span>
            </button>

            {/* Row 2 */}
            <button 
              type="button"
              onClick={() => handleKeyPress('4')}
              className="py-1 active:bg-neutral-800/80 rounded-xl transition flex flex-col items-center justify-center select-none"
            >
              <span className="text-[28px] font-normal leading-tight text-white">4</span>
              <span className="text-[10px] text-neutral-400 font-semibold tracking-wider leading-none">GHI</span>
            </button>

            <button 
              type="button"
              onClick={() => handleKeyPress('5')}
              className="py-1 active:bg-neutral-800/80 rounded-xl transition flex flex-col items-center justify-center select-none"
            >
              <span className="text-[28px] font-normal leading-tight text-white">5</span>
              <span className="text-[10px] text-neutral-400 font-semibold tracking-wider leading-none">JKL</span>
            </button>

            <button 
              type="button"
              onClick={() => handleKeyPress('6')}
              className="py-1 active:bg-neutral-800/80 rounded-xl transition flex flex-col items-center justify-center select-none"
            >
              <span className="text-[28px] font-normal leading-tight text-white">6</span>
              <span className="text-[10px] text-neutral-400 font-semibold tracking-wider leading-none">MNO</span>
            </button>

            {/* Row 3 */}
            <button 
              type="button"
              onClick={() => handleKeyPress('7')}
              className="py-1 active:bg-neutral-800/80 rounded-xl transition flex flex-col items-center justify-center select-none"
            >
              <span className="text-[28px] font-normal leading-tight text-white">7</span>
              <span className="text-[10px] text-neutral-400 font-semibold tracking-wider leading-none">PQRS</span>
            </button>

            <button 
              type="button"
              onClick={() => handleKeyPress('8')}
              className="py-1 active:bg-neutral-800/80 rounded-xl transition flex flex-col items-center justify-center select-none"
            >
              <span className="text-[28px] font-normal leading-tight text-white">8</span>
              <span className="text-[10px] text-neutral-400 font-semibold tracking-wider leading-none">TUV</span>
            </button>

            <button 
              type="button"
              onClick={() => handleKeyPress('9')}
              className="py-1 active:bg-neutral-800/80 rounded-xl transition flex flex-col items-center justify-center select-none"
            >
              <span className="text-[28px] font-normal leading-tight text-white">9</span>
              <span className="text-[10px] text-neutral-400 font-semibold tracking-wider leading-none">WXYZ</span>
            </button>

            {/* Row 4 */}
            <button 
              type="button"
              onClick={() => handleKeyPress('*')}
              className="py-1 active:bg-neutral-800/80 rounded-xl transition flex flex-col items-center justify-center select-none"
            >
              <span className="text-[28px] font-normal leading-tight text-white">*</span>
            </button>

            <button 
              type="button"
              onClick={() => handleKeyPress('0')}
              className="py-1 active:bg-neutral-800/80 rounded-xl transition flex flex-col items-center justify-center select-none"
            >
              <span className="text-[28px] font-normal leading-tight text-white">0</span>
              <span className="text-[11px] text-neutral-400 font-bold leading-none -mt-1">+</span>
            </button>

            <button 
              type="button"
              onClick={() => handleKeyPress('#')}
              className="py-1 active:bg-neutral-800/80 rounded-xl transition flex flex-col items-center justify-center select-none"
            >
              <span className="text-[24px] font-normal leading-tight text-white">#</span>
            </button>
          </div>

          {/* Bottom Action Row (Dual Call Pill + WhatsApp + Keypad Toggle) */}
          <div className="flex items-center justify-center gap-4 pt-2 pb-1 max-w-[320px] mx-auto">
            {/* Dual Call Green Pill matching Screenshot 1: solid green pill with 2 handsets */}
            <div className="w-36 bg-[#00c853] hover:bg-[#00b248] rounded-full h-12 flex items-center justify-around px-4 shadow-lg select-none">
              <button 
                type="button"
                onClick={() => handleInitiateCall(dialedNumber || '*889#', 1)}
                className="relative flex items-center justify-center text-white font-bold p-1.5 active:scale-95 transition"
                title="Call with SIM 1 (Ethio Telecom)"
              >
                <Phone className="w-5 h-5 fill-white text-white" />
                <span className="absolute -top-0.5 -right-1 text-[10.5px] font-extrabold text-white">1</span>
              </button>

              <button 
                type="button"
                onClick={() => handleInitiateCall(dialedNumber || '*889#', 2)}
                className="relative flex items-center justify-center text-white font-bold p-1.5 active:scale-95 transition"
                title="Call with SIM 2"
              >
                <Phone className="w-5 h-5 fill-white text-white" />
                <span className="absolute -top-0.5 -right-1 text-[10.5px] font-extrabold text-white">2</span>
              </button>
            </div>

            {/* WhatsApp Green Circular Button */}
            <button 
              type="button"
              onClick={() => {
                const num = dialedNumber || '+251978730420';
                window.open(`https://wa.me/${num.replace(/[^0-9]/g, '')}`, '_blank');
              }}
              className="w-12 h-12 rounded-full bg-[#25d366] hover:bg-[#20ba59] flex items-center justify-center text-white shadow-lg active:scale-95 transition"
              title="Chat on WhatsApp"
            >
              <MessageSquare className="w-5 h-5 fill-white" />
            </button>

            {/* Keypad Toggle Button (3x3 Grid Dots) */}
            <button 
              type="button"
              onClick={() => setIsKeypadOpen(false)}
              className="w-10 h-10 rounded-full hover:bg-neutral-800 flex items-center justify-center text-neutral-300 transition active:scale-95"
              title="Hide Keypad"
            >
              <div className="grid grid-cols-3 gap-1">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="w-1 h-1 rounded-full bg-neutral-300" />
                ))}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Floating Keypad Open Button when collapsed */}
      {!isKeypadOpen && (
        <div className="absolute bottom-16 right-4 z-20">
          <button 
            type="button"
            onClick={() => setIsKeypadOpen(true)}
            className="w-13 h-13 rounded-full bg-[#00c853] hover:bg-[#00b248] text-white flex items-center justify-center shadow-2xl active:scale-95 transition"
            title="Open Dialpad"
          >
            <div className="grid grid-cols-3 gap-1">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
              ))}
            </div>
          </button>
        </div>
      )}

      {/* 6. Bottom Navigation Bar (Recents & Contacts matching Screenshot 1) */}
      <div className="w-full bg-black border-t border-neutral-900 px-8 py-1.5 flex items-center justify-around shrink-0 z-20">
        {/* Recents: Blue filled circular badge with white clock inside */}
        <button 
          onClick={() => setActiveTab('recents')}
          className="flex flex-col items-center gap-0.5 transition active:scale-95 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-[#1a73e8] flex items-center justify-center text-white shadow-xs">
            <Clock className="w-4.5 h-4.5 stroke-[2.4]" />
          </div>
          <span className="text-[11px] font-medium text-[#2979ff]">Recents</span>
        </button>

        {/* Contacts: Grey icon & text */}
        <button 
          onClick={() => setActiveTab('contacts')}
          className="flex flex-col items-center gap-0.5 transition active:scale-95 cursor-pointer"
        >
          <div className="w-8 h-8 flex items-center justify-center text-[#8e9297]">
            <Users className="w-5 h-5 stroke-[1.8]" />
          </div>
          <span className="text-[11px] font-medium text-[#8e9297]">Contacts</span>
        </button>
      </div>



      {/* ------------------------------------------------------------- */}
      {/* 8. USSD POPUP MODAL (Exact match for Screenshots) */}
      {/* ------------------------------------------------------------- */}
      {ussdStep !== 'idle' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[1px] flex flex-col justify-between animate-in fade-in duration-150">
          
          {/* Upper/Center Section: Floating USSD Card */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-2">
            {/* Running Spinner */}
            {ussdStep === 'running' ? (
              <div className="bg-[#202227] text-white rounded-[24px] px-8 py-6 shadow-2xl flex flex-col items-center gap-3 border border-neutral-700/40">
                <div className="w-8 h-8 rounded-full border-3 border-t-[#2979ff] border-neutral-600 animate-spin" />
                <p className="text-[15px] font-medium text-neutral-200">USSD code running...</p>
              </div>
            ) : (
              /* USSD Dialog Card */
              <div className="w-full max-w-[340px] bg-[#202227] text-white rounded-[26px] p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 border border-neutral-700/40">
                
                {/* Hidden input for physical keyboard entry */}
                <input 
                  ref={ussdInputRef}
                  type="text"
                  value={ussdInput}
                  onChange={(e) => setUssdInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleUssdSubmit();
                    } else if (e.key === 'Escape') {
                      handleCloseUssd();
                    }
                  }}
                  className="opacity-0 absolute -top-9999 left-0 pointer-events-none"
                  autoFocus
                />

                {/* Dialog Content Text: rendered with exact linebreaks matching Screenshots */}
                <div className="text-[15px] leading-[1.42] text-[#e2e4ea] font-sans whitespace-pre-line select-text mb-4 min-h-[50px] tracking-[0.01em]">
                  {ussdContentText}
                </div>

                {/* Blue Underline Input Line with vertical blinking cursor matching screenshots */}
                <div 
                  onClick={() => ussdInputRef.current?.focus()}
                  className="relative mb-4 border-b-[2px] border-[#1a73e8] pb-1 min-h-[26px] flex items-center cursor-text"
                >
                  <span className="text-[16px] text-white font-sans tracking-wide">
                    {ussdStep === 'cbe_login' ? '•'.repeat(ussdInput.length) : ussdInput}
                  </span>
                  <span className="w-[2px] h-[20px] bg-[#2979ff] inline-block animate-pulse ml-0.5" />
                </div>

                {/* Action Buttons: Cancel | Send (Centered in 2 equal halves matching screenshots) */}
                <div className="flex items-center justify-between pt-1">
                  <button 
                    type="button"
                    onClick={() => handleCloseUssd('USSD session ended.')}
                    className="flex-1 text-center text-[15.5px] font-semibold text-[#2979ff] hover:text-[#5393ff] active:scale-95 transition py-1"
                  >
                    Cancel
                  </button>

                  <div className="w-[1px] h-4 bg-[#3a3d45]" />

                  <button 
                    type="button"
                    onClick={() => handleUssdSubmit()}
                    className="flex-1 text-center text-[15.5px] font-semibold text-[#2979ff] hover:text-[#5393ff] active:scale-95 transition py-1"
                  >
                    Send
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* Bottom Section: Interactive Gboard Keyboard matching Screenshots 2, 3, 4 */}
          <GboardKeyboard 
            onKeyPress={(char) => setUssdInput(prev => prev + char)}
            onBackspace={() => setUssdInput(prev => prev.slice(0, -1))}
            onSubmit={() => handleUssdSubmit()}
            onClose={() => handleCloseUssd('USSD session ended.')}
          />

        </div>
      )}

      {/* 9. Active Calling Full-Screen Overlay */}
      {activeCall && (
        <div className="fixed inset-0 z-50 bg-[#121316] text-white flex flex-col items-center justify-between p-6 animate-in fade-in duration-200">
          {/* Top Call Info */}
          <div className="flex flex-col items-center pt-8 text-center">
            {/* Contact Avatar Circle */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 border-2 border-neutral-700 flex items-center justify-center text-3xl font-bold text-neutral-300 shadow-xl mb-4">
              {activeCall.contactName.charAt(0).toUpperCase()}
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">
              {activeCall.contactName}
            </h2>

            <p className="text-sm text-neutral-400 mb-2 font-mono">
              {activeCall.phoneNumber}
            </p>

            {/* Call State Pill */}
            <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border">
              {activeCall.status === 'incoming' ? (
                <span className="text-blue-400 bg-blue-950/60 border-blue-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  <span>Incoming Call • SIM {activeCall.simSlot} ({activeCall.callerRole === 'sender' ? 'Sender' : 'Receiver'})</span>
                </span>
              ) : activeCall.status === 'dialing' ? (
                <span className="text-emerald-400 bg-emerald-950/60 border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Dialing via SIM {activeCall.simSlot}...</span>
                </span>
              ) : activeCall.status === 'connected' ? (
                <span className="text-emerald-400 bg-emerald-950/60 border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{formatDuration(activeCall.durationSeconds)}</span>
                </span>
              ) : (
                <span className="text-red-400 bg-red-950/60 border-red-500/30">Call Ended</span>
              )}
            </div>
          </div>

          {/* Incoming Call Accept / Decline Controls OR Active Call Grid */}
          {activeCall.status === 'incoming' ? (
            <div className="flex items-center justify-center gap-16 pb-12 w-full max-w-[280px]">
              {/* Decline Button */}
              <div className="flex flex-col items-center gap-2">
                <button 
                  onClick={handleDeclineIncomingCall}
                  className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white shadow-2xl active:scale-95 transition"
                  title="Decline Call"
                >
                  <Phone className="w-7 h-7 rotate-[135deg] fill-white" />
                </button>
                <span className="text-xs text-neutral-400 font-medium">Decline</span>
              </div>

              {/* Accept Button */}
              <div className="flex flex-col items-center gap-2">
                <button 
                  onClick={handleAcceptIncomingCall}
                  className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white shadow-2xl active:scale-95 transition animate-bounce"
                  title="Accept Call"
                >
                  <Phone className="w-7 h-7 fill-white" />
                </button>
                <span className="text-xs text-emerald-400 font-bold">Accept</span>
              </div>
            </div>
          ) : (
            <>
              {/* Middle Call Actions Grid */}
              <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
                {/* Mute */}
                <button 
                  onClick={() => setActiveCall(p => p ? { ...p, isMuted: !p.isMuted } : null)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition ${
                    activeCall.isMuted ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {activeCall.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  <span className="text-[11px]">Mute</span>
                </button>

                {/* Keypad */}
                <button 
                  onClick={() => setIsKeypadOpen(true)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition"
                >
                  <div className="grid grid-cols-3 gap-0.5 w-6 h-6 items-center justify-center">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="w-1 h-1 rounded-full bg-current" />
                    ))}
                  </div>
                  <span className="text-[11px]">Keypad</span>
                </button>

                {/* Speaker */}
                <button 
                  onClick={() => setActiveCall(p => p ? { ...p, isSpeaker: !p.isSpeaker } : null)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition ${
                    activeCall.isSpeaker ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {activeCall.isSpeaker ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                  <span className="text-[11px]">Speaker</span>
                </button>
              </div>

              {/* Bottom End Call Button */}
              <div className="pb-10">
                <button 
                  onClick={handleEndCall}
                  className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white shadow-2xl active:scale-95 transition"
                  title="End Call"
                >
                  <Phone className="w-7 h-7 rotate-[135deg] fill-white" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 10. Call Detail Info Modal (When clicking (i) button) */}
      {selectedCallDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#1e2025] text-white rounded-3xl w-full max-w-sm p-5 border border-neutral-700/70 shadow-2xl animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">Call Details</h3>
              </div>
              <button 
                onClick={() => setSelectedCallDetail(null)}
                className="p-1 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contact info card */}
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 text-lg font-bold">
                {selectedCallDetail.contactName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-white text-base">{selectedCallDetail.contactName}</h4>
                <p className="text-xs text-neutral-400 font-mono">{selectedCallDetail.phoneNumber}</p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400">
                  <span className="border border-neutral-600 px-1.5 py-0.2 rounded text-[10px] font-bold">
                    SIM {selectedCallDetail.simSlot}
                  </span>
                  <span>{selectedCallDetail.timestamp}</span>
                  {selectedCallDetail.duration && <span>• {selectedCallDetail.duration}</span>}
                </div>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button 
                onClick={() => {
                  const num = selectedCallDetail.phoneNumber;
                  setSelectedCallDetail(null);
                  handleInitiateCall(num, 1);
                }}
                className="p-2.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 flex flex-col items-center gap-1 text-xs text-neutral-200 transition"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Call SIM 1</span>
              </button>

              <button 
                onClick={() => {
                  const num = selectedCallDetail.phoneNumber;
                  setSelectedCallDetail(null);
                  handleInitiateCall(num, 2);
                }}
                className="p-2.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 flex flex-col items-center gap-1 text-xs text-neutral-200 transition"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Call SIM 2</span>
              </button>

              <button 
                onClick={() => {
                  window.open(`https://wa.me/${selectedCallDetail.phoneNumber.replace(/[^0-9]/g, '')}`, '_blank');
                }}
                className="p-2.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 flex flex-col items-center gap-1 text-xs text-neutral-200 transition"
              >
                <MessageSquare className="w-4 h-4 text-[#25d366]" />
                <span>WhatsApp</span>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="space-y-1.5 pt-2 border-t border-neutral-800">
              <button 
                onClick={() => {
                  navigator.clipboard?.writeText(selectedCallDetail.phoneNumber);
                  setUssdToast('Phone number copied!');
                  setTimeout(() => setUssdToast(null), 2500);
                  setSelectedCallDetail(null);
                }}
                className="w-full py-2 px-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 text-left text-xs text-neutral-300 flex items-center justify-between transition"
              >
                <span className="flex items-center gap-2">
                  <Copy className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Copy phone number</span>
                </span>
              </button>

              <button 
                onClick={() => {
                  PhoneCallService.deleteCallLog(selectedCallDetail.id);
                  setCallLogs(PhoneCallService.getCallLogs());
                  setSelectedCallDetail(null);
                }}
                className="w-full py-2 px-3 rounded-xl bg-red-950/30 hover:bg-red-950/60 text-left text-xs text-red-400 flex items-center justify-between transition"
              >
                <span className="flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete from call log</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Caller Accounts & Settings Modal (Opened via Header Settings Icon) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col justify-end animate-in fade-in">
          <div className="bg-[#181a1f] text-white rounded-t-3xl max-h-[85vh] flex flex-col border-t border-neutral-700/80 shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-[#2979ff]">
                  <Hexagon className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Caller Accounts</h3>
                  <p className="text-[11px] text-neutral-400">
                    Each transaction creates caller accounts • Senders & Receivers can call
                  </p>
                </div>
              </div>
              <button 
                id="btn-close-caller-settings"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 rounded-full bg-neutral-800/80 text-neutral-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Active Caller Summary Pill & Controls */}
            <div className="px-4 py-2.5 bg-neutral-900/80 border-b border-neutral-800 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-neutral-400">Active Caller:</span>
                <span className="font-semibold text-white truncate max-w-[150px]">
                  {activeCallerAccount?.name}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                  activeCallerAccount?.role === 'sender' 
                    ? 'bg-amber-500/20 text-amber-300' 
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {activeCallerAccount?.role}
                </span>
              </div>

              <button 
                id="btn-sync-all-txs"
                onClick={() => {
                  PhoneCallService.syncAllTransactionsToCallerAccounts();
                  setCallerAccounts(PhoneCallService.getCallerAccounts());
                  setActiveCallerAccount(PhoneCallService.getActiveCallerAccount());
                  setToastMessage('Caller accounts re-synced from transactions!');
                  setTimeout(() => setToastMessage(null), 2500);
                }}
                className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium px-2 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 transition active:scale-95"
                title="Sync caller accounts from all banking transactions"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Sync Txs</span>
              </button>
            </div>

            {/* Filter Tabs: All, Senders, Receivers */}
            <div className="px-4 pt-2.5 pb-1 flex items-center gap-2 shrink-0">
              <button 
                onClick={() => setAccountFilter('all')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition ${
                  accountFilter === 'all' 
                    ? 'bg-white text-black shadow-sm' 
                    : 'bg-neutral-800/80 text-neutral-400 hover:text-white'
                }`}
              >
                All ({callerAccounts.length})
              </button>
              <button 
                onClick={() => setAccountFilter('sender')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition ${
                  accountFilter === 'sender' 
                    ? 'bg-amber-500 text-black font-bold shadow-sm' 
                    : 'bg-neutral-800/80 text-neutral-400 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-3 h-3" />
                <span>Senders ({callerAccounts.filter(a => a.role === 'sender').length})</span>
              </button>
              <button 
                onClick={() => setAccountFilter('receiver')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition ${
                  accountFilter === 'receiver' 
                    ? 'bg-emerald-500 text-black font-bold shadow-sm' 
                    : 'bg-neutral-800/80 text-neutral-400 hover:text-white'
                }`}
              >
                <ArrowDownLeft className="w-3 h-3" />
                <span>Receivers ({callerAccounts.filter(a => a.role === 'receiver').length})</span>
              </button>
            </div>

            {/* Scrollable Accounts List */}
            <div className="p-4 space-y-2.5 overflow-y-auto flex-1 overscroll-contain">
              {filteredCallerAccounts.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-xs">
                  No accounts found for this filter.
                </div>
              ) : (
                filteredCallerAccounts.map((acc) => {
                  const isActive = activeCallerAccount?.id === acc.id;
                  const isNow = Boolean(
                    acc.isNow || 
                    (highestTxTimestamp > 0 && acc.lastTxTimestamp === highestTxTimestamp)
                  );
                  return (
                    <div 
                      key={acc.id}
                      className={`p-3.5 rounded-2xl border transition ${
                        isActive 
                          ? 'bg-[#1e232d] border-[#2979ff]/70 shadow-lg ring-1 ring-[#2979ff]/30' 
                          : isNow
                            ? 'bg-[#141819] border-emerald-500/40 shadow-xs shadow-emerald-950/40 hover:border-emerald-500/60'
                            : 'bg-[#15171b] border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      {/* Account Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          {/* Avatar */}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-inner ${
                            acc.role === 'sender' 
                              ? 'bg-gradient-to-br from-amber-500/30 to-amber-700/20 text-amber-300 border border-amber-500/40' 
                              : 'bg-gradient-to-br from-emerald-500/30 to-emerald-700/20 text-emerald-300 border border-emerald-500/40'
                          }`}>
                            {acc.name.charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[13px] font-bold text-white leading-tight">
                                {acc.name}
                              </span>
                              {isActive && (
                                <span className="text-[9px] font-bold text-blue-400 bg-blue-950/80 border border-blue-500/40 px-1.5 py-0.2 rounded-sm">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-2">
                              <span>{acc.phoneNumber}</span>
                              <span className="text-neutral-600">•</span>
                              <span>Acc: {acc.accountNumber.slice(-6)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Role & Now Badges */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isNow && (
                            <span 
                              id={`badge-now-${acc.id}`}
                              className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/45 shadow-xs shadow-emerald-950/40"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                              Now
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            acc.role === 'sender' 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {acc.role}
                          </span>
                        </div>
                      </div>

                      {/* Details & Balance */}
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 bg-black/30 rounded-xl px-2.5 py-1.5 mb-2.5">
                        <span>Balance: <strong className="text-neutral-200">ETB {acc.balance.toFixed(2)}</strong></span>
                        {acc.lastTxAmount ? (
                          <span className="flex items-center gap-1.5">
                            <span>Tx: <strong className={acc.role === 'sender' ? 'text-amber-400' : 'text-emerald-400'}>
                              {acc.role === 'sender' ? '-' : '+'}{acc.lastTxAmount.toFixed(2)} ETB
                            </strong></span>
                            {isNow && (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.2 rounded-sm">
                                Now
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-neutral-500">SIM {acc.simSlot}</span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {/* 1. Set as Active */}
                        <button 
                          onClick={() => handleSwitchCaller(acc)}
                          disabled={isActive}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold transition text-center ${
                            isActive 
                              ? 'bg-blue-600 text-white cursor-default' 
                              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 active:scale-95'
                          }`}
                        >
                          {isActive ? 'Current' : 'Select'}
                        </button>

                        {/* 2. Call Out */}
                        <button 
                          onClick={() => {
                            setIsSettingsOpen(false);
                            handleInitiateCall(acc.phoneNumber, acc.simSlot);
                          }}
                          className="py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-emerald-700/60 hover:bg-emerald-600 text-emerald-200 flex items-center justify-center gap-1 transition active:scale-95"
                          title={`Call ${acc.name}`}
                        >
                          <Phone className="w-3 h-3 fill-current" />
                          <span>Call</span>
                        </button>

                        {/* 3. Incoming Call (Party calls user) */}
                        <button 
                          onClick={() => handleSimulateIncomingCall(acc)}
                          className="py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-blue-700/60 hover:bg-blue-600 text-blue-200 flex items-center justify-center gap-1 transition active:scale-95"
                          title={`Simulate incoming call from ${acc.name}`}
                        >
                          <PhoneIncoming className="w-3 h-3" />
                          <span>Receive</span>
                        </button>

                        {/* 4. USSD *889# */}
                        <button 
                          onClick={() => {
                            handleSwitchCaller(acc);
                            setIsSettingsOpen(false);
                            handleDialUssd('*889#');
                          }}
                          className="py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center gap-1 transition active:scale-95"
                          title="Open CBE USSD Banking"
                        >
                          <span className="font-mono font-bold text-[10px]">*889#</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer info */}
            <div className="p-3 bg-neutral-950 border-t border-neutral-800/80 text-center text-[10.5px] text-neutral-500">
              Transactions made automatically register sender & receiver phone numbers.
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {(ussdToast || toastMessage) && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-[#2d2f34] text-white border border-neutral-700 px-4 py-2 rounded-full shadow-2xl text-xs font-medium animate-in fade-in slide-in-from-top-2">
          {ussdToast || toastMessage}
        </div>
      )}

      {/* Global Phone Type & Status Bar Settings Modal */}
      <PhoneSettingsModal 
        isOpen={isPhoneSettingsOpen} 
        onClose={() => setIsPhoneSettingsOpen(false)} 
      />

    </div>
  );
}

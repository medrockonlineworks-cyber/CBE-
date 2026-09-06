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
  MoreVertical
} from 'lucide-react';
import GboardKeyboard from './GboardKeyboard';
import { PhoneCallService, CallLogItem, ContactItem } from '../services/phoneCallService';
import { LocalDb } from '../lib/mockData';
import { UserProfile, Transaction } from '../types';
import { SmsService } from '../services/smsService';
import { TruecallerService } from '../services/truecallerService';

interface PhoneCallAppProps {
  currentUser?: UserProfile | null;
  onBack?: () => void;
}

type UssdStep = 
  | 'idle' 
  | 'running' 
  | 'cbe_login' 
  | 'cbe_menu' 
  | 'cbe_select_account' 
  | 'cbe_account_summary' 
  | 'cbe_tx_detail' 
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

  // Active Calling Screen
  const [activeCall, setActiveCall] = useState<{
    contactName: string;
    phoneNumber: string;
    simSlot: 1 | 2;
    status: 'dialing' | 'connected' | 'ended';
    durationSeconds: number;
    isMuted: boolean;
    isSpeaker: boolean;
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
      balance: 348.54,
      availableBalance: 348.54
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
  const handleInitiateCall = (numberOrName: string, simSlot: 1 | 2 = 1) => {
    const cleanNumber = numberOrName.trim();
    if (!cleanNumber) return;

    // Check if USSD code
    if (cleanNumber.startsWith('*') && cleanNumber.endsWith('#')) {
      handleDialUssd(cleanNumber);
      return;
    }

    // Normal Phone Call
    const contact = PhoneCallService.findContactByNumber(cleanNumber);
    const displayName = contact ? contact.name : cleanNumber;

    // Add to call log
    const newLog = PhoneCallService.addCallLog({
      contactName: displayName,
      phoneNumber: cleanNumber,
      simSlot: simSlot,
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
      simSlot: simSlot,
      status: 'dialing',
      durationSeconds: 0,
      isMuted: false,
      isSpeaker: false
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
        // User entered PIN (Screenshot 2 -> Screenshot 3)
        // Any 4 digit pin or any input accepts
        setUssdStep('cbe_menu');
        setUssdInput('');
        break;

      case 'cbe_menu':
        // Menu Options (Screenshot 3)
        // 1: My Account
        // 2: Transfer to CBE Account
        // 6: Airtime
        // 8: CBEBirr
        if (val === '1') {
          setUssdStep('cbe_select_account');
          setUssdInput('');
        } else if (val === '2') {
          setUssdStep('cbe_transfer_acc');
          setUssdInput('');
        } else if (val === '6') {
          setUssdStep('cbe_airtime_menu');
          setUssdInput('');
        } else if (val === '9') {
          // Next page
          handleCloseUssd('More options currently unavailable.');
        } else {
          // Default to My Account if invalid input
          setUssdStep('cbe_select_account');
          setUssdInput('');
        }
        break;

      case 'cbe_select_account':
        // Select Account (Screenshot 4)
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
        // Account summary and transactions list (Screenshot 5)
        // 1-5: view transaction details
        // 6: Back
        // 7: Next
        if (val === '6') {
          setUssdStep('cbe_select_account');
          setUssdInput('');
        } else if (val === '7') {
          handleCloseUssd('End of transaction history');
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

      case 'cbe_tx_detail':
        // Transaction detail (Screenshot 6)
        // 1: Back
        setUssdStep('cbe_account_summary');
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
    const raw = user.accountNumber || '1000419524747';
    const last4 = raw.slice(-4);
    return `Saving Account-${last4}`;
  }, [user.accountNumber]);

  // Current user balance formatted
  const formattedBalance = useMemo(() => {
    const bal = user.balance ?? 348.54;
    return bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [user.balance]);

  // Dynamic transactions list for USSD Screenshot 5
  const sampleTransactions = useMemo(() => {
    if (userTransactions && userTransactions.length > 0) {
      return userTransactions.slice(0, 5).map(tx => {
        const sign = tx.type === 'receive' ? '+' : '-';
        const d = new Date(tx.createdAt);
        const day = d.getDate();
        const month = d.getMonth() + 1;
        return {
          id: tx.id,
          line: `${sign}${tx.amount.toFixed(1)} on ${day}/${month}`,
          amount: `${sign}${tx.amount.toFixed(2)} ETB`,
          paymentAbout: tx.description || 'Pay done via Mobile',
          sender: tx.senderName || 'Dejene Buta Feye',
          receiver: tx.recipientName || user.name || 'Leykun Jemaneh Ylma',
          date: tx.createdAt ? tx.createdAt.replace('T', ' ').slice(0, 16) : '2026-09-05 13:41'
        };
      });
    }

    // Default matching Screenshot 5 & 6
    return [
      {
        id: 'tx-1',
        line: '+50.0 on 4/9',
        amount: '+50.00 ETB',
        paymentAbout: 'Pay done via Mobile',
        sender: 'Dejene Buta Feye',
        receiver: user.name || 'Leykun Jemaneh Ylma',
        date: '2026-09-05 13:41'
      },
      {
        id: 'tx-2',
        line: '-20.0 on 4/9',
        amount: '-20.00 ETB',
        paymentAbout: 'Pay done via Mobile',
        sender: user.name || 'Leykun Jemaneh Ylma',
        receiver: 'Kasahun Yematawork Lema',
        date: '2026-09-04 18:22'
      },
      {
        id: 'tx-3',
        line: '+100.0 on 1/9',
        amount: '+100.00 ETB',
        paymentAbout: 'CBE Branch Deposit',
        sender: 'Addis Ababa Branch 001',
        receiver: user.name || 'Leykun Jemaneh Ylma',
        date: '2026-09-01 10:15'
      },
      {
        id: 'tx-4',
        line: '-0.06 on 31/8',
        amount: '-0.06 ETB',
        paymentAbout: 'SMS Notification Charge',
        sender: user.name || 'Leykun Jemaneh Ylma',
        receiver: 'CBE System',
        date: '2026-08-31 23:59'
      },
      {
        id: 'tx-5',
        line: '-100.0 on 30/8',
        amount: '-100.00 ETB',
        paymentAbout: 'Mobile Banking Transfer',
        sender: user.name || 'Leykun Jemaneh Ylma',
        receiver: 'Selamawit Tekle',
        date: '2026-08-30 14:02'
      }
    ];
  }, [userTransactions, user.name]);

  const currentDetailTx = sampleTransactions[selectedTxIndex] || sampleTransactions[0];

  return (
    <div 
      className="relative w-full h-full max-w-md mx-auto bg-black text-white flex flex-col overflow-hidden font-sans select-none"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      {/* 1. Android Status Bar (Matching Screenshot_20260906-121622.png & USSD Screenshots) */}
      <div className="w-full px-4 pt-2.5 pb-1 flex items-center justify-between text-xs text-neutral-300 font-medium z-10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-white tracking-tight">
            {ussdStep !== 'idle' ? '11:34' : '12:16'}
          </span>
          {/* Notification icons matching Screenshot 1 */}
          {ussdStep === 'idle' && (
            <div className="flex items-center gap-1.5 ml-1">
              {/* Chrome icon */}
              <div className="w-3.5 h-3.5 rounded-full border border-neutral-400/80 flex items-center justify-center p-[1.5px]">
                <div className="w-full h-full rounded-full bg-neutral-300" />
              </div>
              {/* Telegram send paper airplane icon */}
              <Send className="w-3 h-3 text-neutral-300 -rotate-12" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {/* Bluetooth icon */}
          <span className="text-neutral-400 font-serif">ᛒ</span>
          {/* Vibrate / Silent phone icon */}
          <VolumeX className="w-3.5 h-3.5 text-neutral-400 stroke-[1.8]" />
          {/* Data rate indicator */}
          <div className="flex flex-col text-[8.5px] font-mono leading-none tracking-tighter text-neutral-300 text-right">
            <span>{ussdStep !== 'idle' ? '2.10' : '238'}</span>
            <span>KB/S</span>
          </div>
          {/* Cellular Network 1 */}
          <div className="flex items-center text-[9.5px] font-bold text-neutral-300 tracking-tighter">
            {ussdStep !== 'idle' ? '4G' : 'H+'}
          </div>
          {/* Cellular Network 2 */}
          <div className="flex items-center text-[9.5px] font-bold text-neutral-300 tracking-tighter">
            3G
          </div>
          {/* Battery pill matching screenshot: rounded rectangle with percentage inside */}
          <div className="w-6 h-3 rounded-[3px] border border-neutral-300 px-0.5 flex items-center justify-center text-[9px] font-bold text-neutral-200">
            {ussdStep !== 'idle' ? '49' : '39'}
          </div>
        </div>
      </div>

      {/* 2. Top Header Row: Search & Settings Hexagon (Right-aligned matching Screenshot 1) */}
      <div className="w-full px-4 pt-1 pb-1 flex items-center justify-between shrink-0 z-10">
        <div>
          {onBack && (
            <button 
              onClick={onBack}
              aria-label="Back to App"
              className="p-1 -ml-1 text-neutral-400 hover:text-white transition active:scale-95"
              title="Return to Banking Profile"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3.5">
          <button 
            onClick={() => setIsSearching(!isSearching)}
            className="p-1 text-neutral-300 hover:text-white transition active:scale-95"
            title="Search call logs"
          >
            <Search className="w-5 h-5 stroke-[1.8]" />
          </button>

          {/* Settings Hexagon Icon from screenshot */}
          <button 
            onClick={() => handleDialUssd('*889#')}
            className="p-1 text-neutral-300 hover:text-white transition active:scale-95"
            title="Dial *889# CBE Mobile Banking USSD"
          >
            <Hexagon className="w-5 h-5 stroke-[1.8]" />
          </button>
        </div>
      </div>

      {/* Big Title: Recents (Large bold display matching Screenshot 1) */}
      <div className="px-4 pb-2 shrink-0 z-10">
        <h1 className="text-[32px] font-bold tracking-tight text-white leading-tight">
          {activeTab === 'recents' ? 'Recents' : 'Contacts'}
        </h1>
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

      {/* 7. Android System 3-Button Navigation Bar at bottom (≡, ○, ⤶) */}
      <div className="w-full bg-black px-10 py-1.5 flex items-center justify-between text-neutral-500 shrink-0 select-none border-t border-neutral-900/40">
        {/* Recents apps button */}
        <button 
          onClick={onBack} 
          className="p-1 text-neutral-500 hover:text-neutral-300 active:scale-90 transition"
          title="App Overview"
        >
          <span className="text-base font-mono">≡</span>
        </button>
        {/* Home button */}
        <button 
          onClick={onBack}
          className="p-1 text-neutral-500 hover:text-neutral-300 active:scale-90 transition"
          title="Home"
        >
          <span className="text-sm">○</span>
        </button>
        {/* Back button */}
        <button 
          onClick={() => {
            if (isKeypadOpen && !dialedNumber) {
              setIsKeypadOpen(false);
            } else if (onBack) {
              onBack();
            }
          }}
          className="p-1 text-neutral-500 hover:text-neutral-300 active:scale-90 transition"
          title="Back"
        >
          <span className="text-sm">‹</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 8. USSD POPUP MODAL (Exact match for Screenshots 2, 3, 4, 5, 6) */}
      {/* ------------------------------------------------------------- */}
      {ussdStep !== 'idle' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-[2px] flex flex-col justify-between animate-in fade-in duration-150">
          
          {/* Top Status Bar in USSD mode matching Screenshots 2, 3, 4 */}
          <div className="w-full px-4 pt-2.5 pb-1 flex items-center justify-between text-xs text-neutral-300 font-medium z-10 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-white tracking-tight">11:34</span>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-neutral-400 font-serif">ᛒ</span>
              <VolumeX className="w-3.5 h-3.5 text-neutral-400 stroke-[1.8]" />
              <div className="flex flex-col text-[8.5px] font-mono leading-none tracking-tighter text-neutral-300 text-right">
                <span>2.10</span>
                <span>KB/S</span>
              </div>
              <div className="flex items-center text-[9.5px] font-bold text-neutral-300 tracking-tighter">
                4G
              </div>
              <div className="flex items-center text-[9.5px] font-bold text-neutral-300 tracking-tighter">
                3G
              </div>
              <div className="w-6 h-3 rounded-[3px] border border-neutral-300 px-0.5 flex items-center justify-center text-[9px] font-bold text-neutral-200">
                49
              </div>
            </div>
          </div>

          {/* Upper/Center Section: Floating USSD Card */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-2">
            {/* Running Spinner */}
            {ussdStep === 'running' ? (
              <div className="bg-[#2b2d30] text-white rounded-[24px] px-8 py-6 shadow-2xl flex flex-col items-center gap-3 border border-neutral-700/40">
                <div className="w-8 h-8 rounded-full border-3 border-t-[#2979ff] border-neutral-600 animate-spin" />
                <p className="text-[15px] font-medium text-neutral-200">USSD code running...</p>
              </div>
            ) : (
              /* USSD Dialog Card */
              <div className="w-full max-w-[340px] bg-[#2b2d30] text-white rounded-[26px] p-5 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 border border-neutral-700/30">
                
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

                {/* Dialog Content Text based on USSD Step */}
                <div className="text-[14.5px] leading-[1.48] text-[#e3e5e8] font-sans whitespace-pre-line select-text mb-3 min-h-[50px]">
                  {/* Step 1: Login PIN */}
                  {ussdStep === 'cbe_login' && (
                    <>
                      Welcome to CBE Mobile Banking.
                      Please enter your PIN to login:
                    </>
                  )}

                  {/* Step 2: Main Menu (Screenshot 2 / Screenshot_20260906-113413.png) */}
                  {ussdStep === 'cbe_menu' && (
                    <>
                      1:My Account
                      2:Transfer to CBE Account
                      3:Beneficiary
                      4:Own Account Transfer
                      5:CBE Fast Loan
                      6:Airtime
                      7:Other Transfers
                      8:CBEBirr
                      9:Next
                    </>
                  )}

                  {/* Step 3: Select Account */}
                  {ussdStep === 'cbe_select_account' && (
                    <>
                      Select Account
                      1:{formattedAccountDisplay}
                      2:Back
                    </>
                  )}

                  {/* Step 4: Account Summary & Recent Transactions (Screenshot 4 / Screenshot_20260906-113432.png) */}
                  {ussdStep === 'cbe_account_summary' && (
                    <>
                      {user.name || 'Leykun Jemaneh Ylma'}
                      {'\n'}Available Balance is ETB {formattedBalance}
                      {'\n'}Transactions
                      {sampleTransactions.map((tx, idx) => (
                        `\n${idx + 1}:${tx.line}`
                      )).join('')}
                      {'\n'}6:Back
                      {'\n'}7:Next
                    </>
                  )}

                  {/* Step 5: Transaction Detail (Screenshot 3 / Screenshot_20260906-113446.png) */}
                  {ussdStep === 'cbe_tx_detail' && (
                    <>
                      Amount:{currentDetailTx.amount}
                      {'\n'}About Payment: {currentDetailTx.paymentAbout}
                      {'\n'}From {currentDetailTx.sender} to {currentDetailTx.receiver}
                      {'\n'}On Date:{currentDetailTx.date}
                      {'\n'}1:Back
                    </>
                  )}

                  {/* Step 6: Transfer - Enter Account Number */}
                  {ussdStep === 'cbe_transfer_acc' && (
                    <>
                      Enter Recipient CBE Account Number:
                      {'\n'}(e.g. 1000...)
                    </>
                  )}

                  {/* Step 7: Transfer - Enter Amount */}
                  {ussdStep === 'cbe_transfer_amount' && (
                    <>
                      Transfer to: {transferData.recipientName}
                      {'\n'}Enter Amount (ETB):
                    </>
                  )}

                  {/* Step 8: Transfer - Enter Reason */}
                  {ussdStep === 'cbe_transfer_reason' && (
                    <>
                      Enter Reason / Remark:
                    </>
                  )}

                  {/* Step 9: Transfer - Confirmation */}
                  {ussdStep === 'cbe_transfer_confirm' && (
                    <>
                      Confirm Transfer:
                      {'\n'}To: {transferData.recipientName}
                      {'\n'}Account: {transferData.recipientAcc}
                      {'\n'}Amount: ETB {transferData.amount.toFixed(2)}
                      {'\n'}Fee: ETB 0.00
                      {'\n'}1:Confirm
                      {'\n'}2:Cancel
                    </>
                  )}

                  {/* Step 10: Transfer - Completed */}
                  {ussdStep === 'cbe_transfer_done' && (
                    <>
                      Transaction Successful!
                      {'\n'}ETB {transferData.amount.toFixed(2)} transferred to {transferData.recipientName}.
                      {'\n'}SMS & Truecaller alert generated.
                      {'\n'}1:OK
                    </>
                  )}

                  {/* Airtime Menu */}
                  {ussdStep === 'cbe_airtime_menu' && (
                    <>
                      Airtime Top-up
                      {'\n'}1:Self Recharge ({user.phone || '0968161314'})
                      {'\n'}2:Other Phone
                      {'\n'}3:Back
                    </>
                  )}

                  {/* Airtime Amount */}
                  {ussdStep === 'cbe_airtime_amount' && (
                    <>
                      Recharge for: {airtimeData.phone}
                      {'\n'}Enter Airtime Amount (ETB 5 - 1000):
                    </>
                  )}

                  {/* Airtime Completed */}
                  {ussdStep === 'cbe_airtime_done' && (
                    <>
                      Airtime Top-up of ETB {airtimeData.amount} successful for {airtimeData.phone}!
                      {'\n'}1:OK
                    </>
                  )}

                  {/* Ethio Telecom Balance */}
                  {ussdStep === 'ethio_telecom_balance' && (
                    <>
                      Dear Customer, your main account balance is ETB 45.20.
                      {'\n'}Active Package: 1.5 GB Monthly (Valid till 2026-10-01).
                      {'\n'}Voice: 42 Mins.
                      {'\n'}1:OK
                    </>
                  )}
                </div>

                {/* Blue Underline Input Line with vertical blinking cursor matching screenshots */}
                <div 
                  onClick={() => ussdInputRef.current?.focus()}
                  className="relative mb-4 border-b-2 border-[#1a73e8] pb-1 min-h-[26px] flex items-center cursor-text"
                >
                  <span className="text-[16px] text-white font-mono">
                    {ussdStep === 'cbe_login' ? '•'.repeat(ussdInput.length) : ussdInput}
                  </span>
                  <span className="w-[2px] h-5 bg-[#2979ff] inline-block animate-pulse ml-0.5" />
                </div>

                {/* Action Buttons: Cancel | Send (Centered in 2 equal halves matching screenshots) */}
                <div className="flex items-center justify-between pt-1">
                  <button 
                    type="button"
                    onClick={() => handleCloseUssd('USSD session ended.')}
                    className="flex-1 text-center text-[15px] font-semibold text-[#2979ff] hover:text-[#5393ff] active:scale-95 transition py-1"
                  >
                    Cancel
                  </button>

                  <div className="w-[1px] h-4 bg-[#4a4d55]" />

                  <button 
                    type="button"
                    onClick={() => handleUssdSubmit()}
                    className="flex-1 text-center text-[15px] font-semibold text-[#2979ff] hover:text-[#5393ff] active:scale-95 transition py-1"
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

            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {activeCall.status === 'dialing' 
                  ? `Dialing via SIM ${activeCall.simSlot}...` 
                  : activeCall.status === 'connected'
                  ? formatDuration(activeCall.durationSeconds)
                  : 'Call Ended'}
              </span>
            </div>
          </div>

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

      {/* Floating Toast Notification */}
      {ussdToast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-[#2d2f34] text-white border border-neutral-700 px-4 py-2 rounded-full shadow-2xl text-xs font-medium animate-in fade-in slide-in-from-top-2">
          {ussdToast}
        </div>
      )}

    </div>
  );
}

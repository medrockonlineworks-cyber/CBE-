import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Search, 
  Plus, 
  Delete, 
  Mic, 
  MicOff, 
  Volume2, 
  UserPlus, 
  Video, 
  Grid, 
  X, 
  Star, 
  Clock, 
  User, 
  Voicemail, 
  ChevronRight, 
  Info,
  ChevronLeft,
  Check,
  Building2
} from 'lucide-react';
import { UserProfile } from '../types';
import { PhoneCallService, CallLogItem, CallerAccount } from '../services/phoneCallService';
import { LocalDb } from '../lib/mockData';

interface ApplePhoneAppProps {
  currentUser?: UserProfile | null;
  onBack: () => void;
}

export const ApplePhoneApp: React.FC<ApplePhoneAppProps> = ({
  currentUser,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'favorites' | 'recents' | 'contacts' | 'keypad' | 'voicemail'>('keypad');
  const [recentsFilter, setRecentsFilter] = useState<'all' | 'missed'>('all');
  const [dialedNumber, setDialedNumber] = useState<string>('*889#');
  const [callLogs, setCallLogs] = useState<CallLogItem[]>(() => PhoneCallService.getCallLogs());
  const [callerAccounts, setCallerAccounts] = useState<CallerAccount[]>(() => PhoneCallService.getCallerAccounts());
  const [activeCallerAccount, setActiveCallerAccount] = useState<CallerAccount | null>(() => PhoneCallService.getActiveCallerAccount());

  // Active Calling State
  const [activeCall, setActiveCall] = useState<{
    contactName: string;
    phoneNumber: string;
    durationSeconds: number;
    isMuted: boolean;
    isSpeaker: boolean;
  } | null>(null);

  // USSD Interactive Flow State
  const [ussdModal, setUssdModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    step: 'main' | 'pin' | 'balance' | 'transfer_amount' | 'done';
  } | null>(null);
  const [ussdInput, setUssdInput] = useState('');

  // Live sync active caller account & logs on account switch
  useEffect(() => {
    const syncPhoneState = () => {
      setCallerAccounts(PhoneCallService.getCallerAccounts());
      setActiveCallerAccount(PhoneCallService.getActiveCallerAccount());
      setCallLogs(PhoneCallService.getCallLogs());
    };
    window.addEventListener('caller_accounts_updated', syncPhoneState);
    window.addEventListener('caller_account_changed', syncPhoneState);
    window.addEventListener('cbe_account_switched', syncPhoneState);
    return () => {
      window.removeEventListener('caller_accounts_updated', syncPhoneState);
      window.removeEventListener('caller_account_changed', syncPhoneState);
      window.removeEventListener('cbe_account_switched', syncPhoneState);
    };
  }, []);

  // Call timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeCall) {
      interval = setInterval(() => {
        setActiveCall(prev => prev ? { ...prev, durationSeconds: prev.durationSeconds + 1 } : null);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeCall]);

  const handleKeyPress = (char: string) => {
    setDialedNumber(prev => prev + char);
  };

  const handleDelete = () => {
    setDialedNumber(prev => prev.slice(0, -1));
  };

  const handleInitiateCall = (numberToCall: string) => {
    const num = numberToCall.trim();
    if (!num) return;

    if (num === '*889#' || num.startsWith('*889')) {
      // Trigger CBE Mobile Banking USSD flow
      setUssdModal({
        isOpen: true,
        title: 'Commercial Bank of Ethiopia',
        message: 'Welcome to CBE Birr (*889#)\n1. Balance Inquiry\n2. Send Money\n3. Buy Airtime\n4. Pay Bill\n5. Mini-statement',
        step: 'main',
      });
      return;
    }

    // Normal phone call
    const account = callerAccounts.find(a => a.phoneNumber === num) || {
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

  const handleUssdSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!ussdModal) return;

    const val = ussdInput.trim();
    setUssdInput('');

    if (ussdModal.step === 'main') {
      if (val === '1') {
        setUssdModal({
          isOpen: true,
          title: 'CBE Birr (*889#)',
          message: 'Please enter your 4-digit CBE Birr PIN:',
          step: 'pin',
        });
      } else {
        setUssdModal({
          isOpen: true,
          title: 'CBE Birr (*889#)',
          message: 'Service selected: Send Money\nEnter recipient CBE account or phone number:',
          step: 'transfer_amount',
        });
      }
    } else if (ussdModal.step === 'pin') {
      const holderName = activeCallerAccount?.name || currentUser?.name || 'Customer';
      const balance = activeCallerAccount?.availableBalance ?? activeCallerAccount?.balance ?? currentUser?.balance ?? 25430.00;
      setUssdModal({
        isOpen: true,
        title: 'CBE Account Balance',
        message: `${holderName}\nYour CBE Account balance is ETB ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}.\nAvailable: ETB ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}.\nThank you for banking with CBE!`,
        step: 'done',
      });
    } else {
      setUssdModal(null);
    }
  };

  const formatCallTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-full flex flex-col font-sans select-none bg-black text-white pb-safe relative">
      {/* iOS Top Navigation Bar with Back to CBE */}
      <header className="px-4 pt-[max(env(safe-area-inset-top,0px),10px)] pb-1 flex items-center justify-between z-20">
        <div className="w-8" />

        {activeTab === 'recents' && (
          <div className="flex items-center bg-[#1C1C1E] p-0.5 rounded-lg border border-neutral-800">
            <button
              onClick={() => setRecentsFilter('all')}
              className={`px-3 py-0.5 text-xs font-semibold rounded-md transition ${
                recentsFilter === 'all' ? 'bg-[#636366] text-white' : 'text-neutral-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setRecentsFilter('missed')}
              className={`px-3 py-0.5 text-xs font-semibold rounded-md transition ${
                recentsFilter === 'missed' ? 'bg-[#636366] text-white' : 'text-neutral-400'
              }`}
            >
              Missed
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {activeTab === 'keypad' && (
            <span className="text-xs text-[#007AFF] font-medium bg-[#007AFF]/15 px-2 py-0.5 rounded-full border border-[#007AFF]/30">
              *889# Ready
            </span>
          )}
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="flex-1 overflow-y-auto px-4 flex flex-col justify-between">
        {/* TAB: KEYPAD */}
        {activeTab === 'keypad' && (
          <div className="flex-1 flex flex-col justify-between py-2 max-w-[340px] mx-auto w-full">
            {/* Number Display */}
            <div className="h-16 flex items-center justify-center relative px-2">
              <span className="text-[34px] font-normal tracking-wider font-mono text-white text-center truncate">
                {dialedNumber || ' '}
              </span>
              {dialedNumber && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="absolute right-0 text-[#8E8E93] hover:text-white p-2 active:scale-95 transition"
                  title="Delete"
                >
                  <Delete className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Apple Circular Dialpad Grid */}
            <div className="grid grid-cols-3 gap-x-5 gap-y-3.5 px-3">
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
              ].map(item => (
                <button
                  key={item.n}
                  type="button"
                  onClick={() => handleKeyPress(item.n)}
                  className="w-18 h-18 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] active:bg-[#48484A] transition-all flex flex-col items-center justify-center shadow-sm mx-auto active:scale-95"
                >
                  <span className="text-[30px] font-normal text-white leading-none">
                    {item.n}
                  </span>
                  {item.l && (
                    <span className="text-[9px] font-semibold text-[#8E8E93] tracking-widest leading-none mt-1">
                      {item.l}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Action Row: Green Circular Call Button */}
            <div className="flex items-center justify-center pt-3 pb-1">
              <button
                type="button"
                onClick={() => handleInitiateCall(dialedNumber || '*889#')}
                className="w-18 h-18 rounded-full bg-[#34C759] hover:bg-[#30B753] active:scale-95 transition flex items-center justify-center text-white shadow-xl cursor-pointer"
                title="Call"
              >
                <Phone className="w-8 h-8 fill-white text-white" />
              </button>
            </div>
          </div>
        )}

        {/* TAB: RECENTS */}
        {activeTab === 'recents' && (
          <div className="flex-1 py-2 divide-y divide-[#38383A]/60">
            <h1 className="text-[34px] font-bold tracking-tight pb-3">Recents</h1>
            {callLogs.map(log => (
              <div 
                key={log.id} 
                onClick={() => handleInitiateCall(log.phoneNumber)}
                className="py-3 flex items-center justify-between cursor-pointer active:bg-neutral-800/40 transition group"
              >
                <div className="flex flex-col">
                  <span className={`text-[16px] font-semibold ${log.type === 'missed' ? 'text-[#FF3B30]' : 'text-white'}`}>
                    {log.contactName}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-[#8E8E93] mt-0.5">
                    <Phone className="w-3 h-3" />
                    <span>{log.phoneNumber}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[#8E8E93]">
                  <span className="text-[13px]">{log.timestamp}</span>
                  <Info className="w-4 h-4 text-[#007AFF]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: CONTACTS */}
        {activeTab === 'contacts' && (
          <div className="flex-1 py-2">
            <h1 className="text-[34px] font-bold tracking-tight pb-3">Contacts</h1>
            <div className="divide-y divide-[#38383A]/60">
              {callerAccounts.map(c => (
                <div 
                  key={c.id}
                  onClick={() => handleInitiateCall(c.phoneNumber)}
                  className="py-3 flex items-center justify-between cursor-pointer active:bg-neutral-800/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1C1C1E] border border-neutral-700 flex items-center justify-center font-bold text-white text-sm">
                      {c.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[16px] font-semibold text-white">{c.name}</span>
                      <span className="text-xs text-[#8E8E93]">{c.phoneNumber}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#8E8E93]" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: FAVORITES */}
        {activeTab === 'favorites' && (
          <div className="flex-1 py-4 text-center">
            <h1 className="text-[34px] font-bold tracking-tight pb-3 text-left">Favorites</h1>
            <div className="mt-8 p-6 bg-[#1C1C1E] rounded-2xl border border-neutral-800">
              <Star className="w-10 h-10 text-amber-400 fill-amber-400 mx-auto mb-2" />
              <p className="text-base font-bold text-white">CBE Mobile Banking (*889#)</p>
              <p className="text-xs text-[#8E8E93] mt-1">Direct shortcut to CBE Birr USSD banking portal</p>
              <button
                type="button"
                onClick={() => handleInitiateCall('*889#')}
                className="mt-4 px-5 py-2 rounded-full bg-[#007AFF] text-white font-semibold text-sm cursor-pointer hover:bg-blue-600 active:scale-95 transition"
              >
                Dial *889# Now
              </button>
            </div>
          </div>
        )}

        {/* TAB: VOICEMAIL */}
        {activeTab === 'voicemail' && (
          <div className="flex-1 py-10 flex flex-col items-center justify-center text-center">
            <Voicemail className="w-16 h-16 text-[#8E8E93] mb-3" />
            <h2 className="text-xl font-bold text-white">No Voicemail</h2>
            <p className="text-xs text-[#8E8E93] mt-1 max-w-xs">
              Ethio Telecom voicemail is currently clear. All transaction alerts are delivered via SMS.
            </p>
          </div>
        )}
      </main>

      {/* iOS Bottom Tab Bar (Favorites, Recents, Contacts, Keypad, Voicemail) */}
      <footer className="w-full bg-[#161618]/90 backdrop-blur-xl border-t border-[#38383A] px-4 pt-1.5 pb-[max(env(safe-area-inset-bottom,0px),6px)] flex flex-col z-20 shrink-0">
        <div className="flex items-center justify-around w-full">
          {[
            { id: 'favorites' as const, label: 'Favorites', icon: Star },
            { id: 'recents' as const, label: 'Recents', icon: Clock },
            { id: 'contacts' as const, label: 'Contacts', icon: User },
            { id: 'keypad' as const, label: 'Keypad', icon: Grid },
            { id: 'voicemail' as const, label: 'Voicemail', icon: Voicemail },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition ${
                  isActive ? 'text-[#007AFF]' : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 stroke-[2.2]" />
                <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </footer>

      {/* ------------------------------------------------------------- */}
      {/* iOS USSD POPUP MODAL (Authentic Apple Sheet) */}
      {/* ------------------------------------------------------------- */}
      {ussdModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-xs bg-[#1C1C1E] border border-neutral-700/60 rounded-[22px] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150 text-center">
            {/* Title & Message */}
            <div className="p-5 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#70189F] flex items-center justify-center text-white mb-2 shadow-sm">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">
                {ussdModal.title}
              </h3>
              <p className="text-xs text-neutral-300 whitespace-pre-line leading-relaxed text-left bg-neutral-900/80 p-3 rounded-xl border border-neutral-800 w-full font-mono">
                {ussdModal.message}
              </p>

              {ussdModal.step !== 'done' && (
                <input
                  type="text"
                  placeholder="Enter option or PIN"
                  value={ussdInput}
                  onChange={(e) => setUssdInput(e.target.value)}
                  autoFocus
                  className="mt-3 w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-center text-sm text-white font-mono outline-none focus:border-[#007AFF]"
                />
              )}
            </div>

            {/* Apple Styled Split Action Buttons */}
            <div className="grid grid-cols-2 divide-x divide-neutral-700 border-t border-neutral-700 text-sm font-semibold">
              <button
                type="button"
                onClick={() => setUssdModal(null)}
                className="py-3 text-[#FF3B30] hover:bg-neutral-800/50 transition cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => handleUssdSubmit()}
                className="py-3 text-[#007AFF] font-bold hover:bg-neutral-800/50 transition cursor-pointer"
              >
                {ussdModal.step === 'done' ? 'OK' : 'Reply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* iOS FULL-SCREEN IN-CALL SCREEN */}
      {/* ------------------------------------------------------------- */}
      {activeCall && (
        <div className="fixed inset-0 z-50 bg-[#161618] text-white flex flex-col justify-between p-6 animate-in fade-in duration-200">
          {/* Top Info */}
          <div className="pt-10 flex flex-col items-center text-center">
            <h2 className="text-[32px] font-semibold text-white tracking-tight">
              {activeCall.contactName}
            </h2>
            <p className="text-sm text-[#8E8E93] mt-1 font-mono">
              {activeCall.durationSeconds === 0 ? 'calling...' : formatCallTime(activeCall.durationSeconds)}
            </p>
          </div>

          {/* iOS 6-Circle In-Call Controls */}
          <div className="grid grid-cols-3 gap-6 max-w-[280px] mx-auto w-full">
            {[
              { label: 'mute', icon: activeCall.isMuted ? MicOff : Mic, active: activeCall.isMuted, action: () => setActiveCall(p => p ? { ...p, isMuted: !p.isMuted } : null) },
              { label: 'keypad', icon: Grid, active: false, action: () => {} },
              { label: 'speaker', icon: Volume2, active: activeCall.isSpeaker, action: () => setActiveCall(p => p ? { ...p, isSpeaker: !p.isSpeaker } : null) },
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
                    className={`w-18 h-18 rounded-full flex items-center justify-center transition active:scale-95 ${
                      btn.active ? 'bg-white text-black' : 'bg-white/15 text-white hover:bg-white/25'
                    }`}
                  >
                    <Icon className="w-7 h-7" />
                  </button>
                  <span className="text-[11px] text-[#8E8E93] font-medium capitalize">
                    {btn.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Red End Call Button */}
          <div className="pb-8 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setActiveCall(null)}
              className="w-18 h-18 rounded-full bg-[#FF3B30] hover:bg-[#E0352B] active:scale-95 transition flex items-center justify-center text-white shadow-2xl cursor-pointer"
              title="End Call"
            >
              <Phone className="w-8 h-8 fill-white text-white rotate-[135deg]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplePhoneApp;

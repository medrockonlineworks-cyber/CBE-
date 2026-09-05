import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  X, 
  Sparkles, 
  Check, 
  Building2, 
  Plus, 
  Smartphone, 
  Send, 
  Download, 
  Clock, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Trash2, 
  Copy, 
  ExternalLink,
  ChevronDown,
  Layers,
  CheckCheck,
  ChevronRight,
  Sliders,
  Maximize2,
  Minimize2,
  BellRing,
  Wallet
} from 'lucide-react';
import { 
  TruecallerBankAccount, 
  TruecallerAlert, 
  TruecallerRole, 
  TruecallerBankKey 
} from '../types/truecaller';
import { 
  TruecallerService, 
  BANK_PRESETS, 
  maskTruecallerAccount, 
  formatCurrentTimeString 
} from '../services/truecallerService';

interface TruecallerSimulatorProps {
  onBack: () => void;
}

export default function TruecallerSimulator({ onBack }: TruecallerSimulatorProps) {
  // Accounts and Active Account
  const [accounts, setAccounts] = useState<TruecallerBankAccount[]>(() => TruecallerService.getAccounts());
  const [activeAccountId, setActiveAccountId] = useState<string>(() => TruecallerService.getActiveAccountId());
  
  // Alerts list and Currently displayed alert
  const [alerts, setAlerts] = useState<TruecallerAlert[]>(() => TruecallerService.getAlerts());
  const [currentAlert, setCurrentAlert] = useState<TruecallerAlert | null>(() => {
    const list = TruecallerService.getAlerts();
    return list[0] || null;
  });

  // Current simulation parameters for fast tweaking
  const [currentRole, setCurrentRole] = useState<TruecallerRole>('receiver');
  const [amountInput, setAmountInput] = useState<string>('450.00');
  const [customTimeInput, setCustomTimeInput] = useState<string>(() => formatCurrentTimeString());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  
  // UI Panels and States
  const [showAiBreakdown, setShowAiBreakdown] = useState<boolean>(false);
  const [isAlertVisible, setIsAlertVisible] = useState<boolean>(true);
  const [isAnimatingIn, setIsAnimatingIn] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'control' | 'accounts' | 'history'>('control');
  const [isFullTakeover, setIsFullTakeover] = useState<boolean>(false);
  
  // Create Account Modal State
  const [showCreateAccountModal, setShowCreateAccountModal] = useState<boolean>(false);
  const [newBankKey, setNewBankKey] = useState<TruecallerBankKey>('cbe');
  const [newAccNumber, setNewAccNumber] = useState<string>('1000419529165');
  const [newAccHolder, setNewAccHolder] = useState<string>('Leykun Jemaneh');
  const [newAccType, setNewAccType] = useState<string>('Savings Account');
  const [newAccBalance, setNewAccBalance] = useState<string>('5420.50');

  // Active account object
  const activeAccount = useMemo(() => {
    return accounts.find(a => a.id === activeAccountId) || accounts[0] || null;
  }, [accounts, activeAccountId]);

  // Sync state with selected account
  useEffect(() => {
    if (activeAccount && currentAlert && currentAlert.accountId === activeAccount.id) {
      setCurrentRole(currentAlert.role);
      setAmountInput(currentAlert.amount.toString());
    }
  }, [activeAccountId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const playNotificationChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.36);
    } catch {
      // Audio not supported or blocked
    }
  };

  // Trigger / Generate New Truecaller Alert
  const handleGenerateAlert = (overrideRole?: TruecallerRole, overrideAmount?: number) => {
    if (!activeAccount) return;
    
    const role = overrideRole || currentRole;
    const amountVal = overrideAmount !== undefined ? overrideAmount : (parseFloat(amountInput) || 450);

    const newAlert = TruecallerService.createAlert({
      account: activeAccount,
      role,
      amount: amountVal,
      timeString: customTimeInput || formatCurrentTimeString(),
    });

    setAlerts(TruecallerService.getAlerts());
    setCurrentAlert(newAlert);
    setIsAlertVisible(true);
    setIsAnimatingIn(true);
    playNotificationChime();

    setTimeout(() => {
      setIsAnimatingIn(false);
    }, 400);

    showToast(`Simulated Truecaller alert for ${activeAccount.bankName}!`);
  };

  // Mark as Read Handler
  const handleMarkAsRead = () => {
    if (!currentAlert) return;
    TruecallerService.markAlertAsRead(currentAlert.id);
    setAlerts(TruecallerService.getAlerts());
    setCurrentAlert({ ...currentAlert, read: true });
    showToast('Alert marked as read');
  };

  // Create Custom Bank Account
  const handleCreateAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccNumber.trim() || !newAccHolder.trim()) {
      showToast('Please fill in account number and holder name');
      return;
    }

    const preset = BANK_PRESETS.find(p => p.key === newBankKey);
    const bankName = preset ? preset.name : 'Custom Bank';

    const created = TruecallerService.createAccount({
      bankKey: newBankKey,
      bankName,
      accountNumber: newAccNumber.trim(),
      holderName: newAccHolder.trim(),
      accountType: newAccType.trim() || 'Savings Account',
      balance: parseFloat(newAccBalance) || 2500,
    });

    const updatedAccounts = TruecallerService.getAccounts();
    setAccounts(updatedAccounts);
    setActiveAccountId(created.id);
    setShowCreateAccountModal(false);

    // Automatically trigger alert for newly created account
    const newAlert = TruecallerService.createAlert({
      account: created,
      role: currentRole,
      amount: parseFloat(amountInput) || 450,
      timeString: formatCurrentTimeString(),
    });
    setAlerts(TruecallerService.getAlerts());
    setCurrentAlert(newAlert);
    setIsAlertVisible(true);
    playNotificationChime();

    showToast(`Created ${bankName} account & generated Truecaller alert!`);
  };

  // Quick Amount Presets
  const quickAmounts = [100, 450, 1000, 2500, 5000];

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden bg-slate-950 font-sans select-none text-slate-100">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-gray-900/95 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-2xl border border-blue-500/40 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Check className="w-3.5 h-3.5 text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP BAR / SIMULATOR NAV HEADER */}
      <div className="bg-[#0052cc] text-white px-4 py-3 flex items-center justify-between z-30 shadow-md border-b border-blue-600/40 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-white/15 active:scale-95 transition cursor-pointer"
            title="Back to Settings"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
                <span className="bg-white text-[#0066FF] px-1.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider">
                  TC
                </span>
                Truecaller SMS Simulator
              </span>
            </div>
            <p className="text-[10px] text-blue-100/90 font-medium">
              Takeover overlay • Multi-bank sender/receiver
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl text-xs transition cursor-pointer ${
              soundEnabled ? 'bg-white/20 text-white' : 'bg-black/20 text-white/60'
            }`}
            title={soundEnabled ? 'Sound alert enabled' : 'Sound muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsFullTakeover(!isFullTakeover)}
            className="px-2.5 py-1.5 bg-white text-[#0052cc] hover:bg-blue-50 active:scale-95 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1 shadow-sm"
            title={isFullTakeover ? 'Exit Screen Takeover' : 'Full Screen Takeover'}
          >
            {isFullTakeover ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullTakeover ? 'Controls' : 'Takeover'}</span>
          </button>
        </div>
      </div>

      {/* MAIN SCREEN AREA (SIMULATED PHONE SCREEN TAKEOVER) */}
      <div 
        className={`flex-1 relative flex flex-col justify-start items-center p-3 sm:p-5 overflow-hidden transition-all duration-300 ${
          isFullTakeover ? 'pb-6' : 'pb-2'
        }`}
        style={{
          // Realistic phone wallpaper backdrop matching user uploaded image (IMG_20260905_115947_509.jpg has lush green meadow background!)
          background: 'linear-gradient(180deg, #1b381e 0%, #29532d 40%, #3f7e45 100%)',
        }}
      >
        {/* Subtle meadow background texture effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-black/40 pointer-events-none" />

        {/* Simulated Phone Top Status Bar */}
        <div className="w-full max-w-sm flex items-center justify-between text-white/90 text-xs px-2 pt-1 pb-3 select-none z-20 flex-shrink-0">
          <span className="font-semibold text-[13px] tracking-tight">{customTimeInput.split(' ')[0]}</span>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="font-bold text-[10px] tracking-wider">5G</span>
            <div className="w-3.5 h-2.5 border border-white/90 rounded-[2px] p-[1px] flex items-center">
              <div className="h-full w-4/5 bg-white rounded-[0.5px]" />
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* TRUECALLER SMS POPUP ALERT BANNER (EXACT REPLICA OF USER REFERENCE) */}
        {/* =================================================================== */}
        {isAlertVisible && currentAlert && (
          <div 
            className={`w-full max-w-sm rounded-[24px] border-[3px] border-[#0066FF] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-30 transition-all duration-300 ${
              isAnimatingIn ? 'scale-95 opacity-0 -translate-y-4' : 'scale-100 opacity-100 translate-y-0'
            }`}
          >
            {/* 1. Truecaller Vibrant Blue Top Bar */}
            <div className="bg-[#0066FF] px-4 py-2.5 flex items-center justify-between text-white select-none">
              {/* Left: Truecaller Logo */}
              <div className="flex items-center gap-1.5">
                <span className="font-sans font-bold text-[19px] tracking-tight text-white leading-none">
                  truecaller
                </span>
              </div>

              {/* Center/Right: SMS • Time */}
              <div className="flex items-center gap-1.5 text-white/95 font-medium text-[13px]">
                <span>SMS</span>
                <span className="text-white/70">•</span>
                <span>{currentAlert.timeString}</span>
              </div>

              {/* Close (X) Button */}
              <button
                type="button"
                onClick={() => setIsAlertVisible(false)}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 active:scale-90 transition cursor-pointer text-white"
                title="Close Alert"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* 2. White Main Card Content */}
            <div className="bg-white p-4 sm:p-5 text-slate-900 space-y-3">
              
              {/* Bank Header Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Bank Icon with Light Blue Circle */}
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#0066FF] flex-shrink-0">
                    <Building2 className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  {/* Bank Name */}
                  <div>
                    <h3 className="font-bold text-[17px] text-slate-800 tracking-tight leading-tight">
                      {currentAlert.bankName}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {currentAlert.role === 'receiver' ? 'Credit notification' : 'Debit notification'}
                    </p>
                  </div>
                </div>

                {/* Role badge (Sender / Receiver indicator) */}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  currentAlert.role === 'receiver'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900'
                }`}>
                  {currentAlert.role === 'receiver' ? 'Receiver' : 'Sender'}
                </span>
              </div>

              {/* Message Body (Exact styling from user image) */}
              <div className="text-[17px] leading-[1.4] text-slate-900 font-semibold tracking-tight">
                Account <span className="font-extrabold text-slate-950">{currentAlert.maskedAccount}</span>{' '}
                {currentAlert.role === 'receiver' ? 'credited with' : 'debited with'}{' '}
                <span className="font-extrabold text-slate-950">
                  ETB {currentAlert.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
                </span>
              </div>

              {/* AI Summary Tag (Clickable to reveal details) */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowAiBreakdown(!showAiBreakdown)}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-[#0066FF] text-[13px] font-medium py-1 px-2 rounded-lg hover:bg-blue-50 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#0066FF] fill-[#0066FF]/20" />
                  <span className="font-semibold text-slate-600">AI summary</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showAiBreakdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Expandable AI Breakdown Modal / Card */}
                {showAiBreakdown && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-700 animate-fadeIn">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Type:</span>
                      <span className="font-bold text-slate-800 capitalize">
                        {currentAlert.role === 'receiver' ? 'Inward Transfer (Credit)' : 'Outward Transfer (Debit)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Full Account:</span>
                      <span className="font-bold font-mono text-slate-800">{currentAlert.fullAccount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Holder Name:</span>
                      <span className="font-bold text-slate-800">{currentAlert.holderName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Counterparty:</span>
                      <span className="font-bold text-slate-800">{currentAlert.counterpartyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Reference ID:</span>
                      <span className="font-bold font-mono text-slate-800">{currentAlert.txId}</span>
                    </div>
                    {currentAlert.balanceAfter !== undefined && (
                      <div className="flex justify-between border-t border-slate-200 pt-1.5">
                        <span className="text-slate-400 font-medium">Balance After:</span>
                        <span className="font-bold text-emerald-700">
                          ETB {currentAlert.balanceAfter.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Action: "Mark as read" */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleMarkAsRead}
                  className={`w-full py-1 text-center font-bold text-[16px] transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    currentAlert.read 
                      ? 'text-emerald-600' 
                      : 'text-[#0066FF] hover:text-[#0052cc] active:scale-98'
                  }`}
                >
                  {currentAlert.read ? (
                    <>
                      <CheckCheck className="w-4 h-4" />
                      <span>Read</span>
                    </>
                  ) : (
                    <span>Mark as read</span>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* If Alert Was Dismissed, Show Floating Re-trigger Button */}
        {!isAlertVisible && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 z-20">
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-xl">
              <BellRing className="w-8 h-8 text-blue-300 animate-pulse" />
            </div>
            <p className="text-white font-bold text-base">Alert Dismissed</p>
            <p className="text-white/70 text-xs max-w-xs">
              Tap the button below to re-trigger the Truecaller screen takeover alert banner.
            </p>
            <button
              type="button"
              onClick={() => {
                setIsAlertVisible(true);
                playNotificationChime();
              }}
              className="px-5 py-2.5 bg-[#0066FF] hover:bg-blue-600 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-lg transition cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Show Truecaller Alert</span>
            </button>
          </div>
        )}

        {/* When in Full Takeover, show minimalist float toggle at bottom */}
        {isFullTakeover && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
            <button
              type="button"
              onClick={() => setIsFullTakeover(false)}
              className="px-4 py-2 bg-black/70 backdrop-blur-md hover:bg-black/90 text-white rounded-full text-xs font-bold border border-white/20 shadow-2xl flex items-center gap-2 transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>Open Simulator Controls</span>
            </button>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* SIMULATOR CONTROL DOCK (HIDDEN IN FULLSCREEN TAKEOVER)              */}
      {/* =================================================================== */}
      {!isFullTakeover && (
        <div className="bg-slate-900 border-t border-slate-800 text-slate-100 flex flex-col z-30 flex-shrink-0 shadow-2xl">
          
          {/* Tabs header */}
          <div className="flex border-b border-slate-800 px-3 bg-slate-950/60">
            <button
              type="button"
              onClick={() => setActiveTab('control')}
              className={`px-3.5 py-2.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
                activeTab === 'control' 
                  ? 'border-[#0066FF] text-blue-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Quick Alert</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('accounts')}
              className={`px-3.5 py-2.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
                activeTab === 'accounts' 
                  ? 'border-[#0066FF] text-blue-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Bank Accounts ({accounts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-2.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
                activeTab === 'history' 
                  ? 'border-[#0066FF] text-blue-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Alerts History ({alerts.length})</span>
            </button>
          </div>

          {/* TAB 1: QUICK CONTROL PANEL */}
          {activeTab === 'control' && (
            <div className="p-3.5 sm:p-4 space-y-3.5 max-h-64 overflow-y-auto scrollbar-thin">
              
              {/* 1. Bank Account Selector with Quick Pill */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Bank Account:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCreateAccountModal(true)}
                    className="text-[11px] text-[#0066FF] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create Bank Account</span>
                  </button>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {accounts.map(acc => {
                    const isSelected = acc.id === activeAccountId;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          setActiveAccountId(acc.id);
                          TruecallerService.setActiveAccountId(acc.id);
                          // Auto trigger alert with new account
                          handleGenerateAlert(currentRole, parseFloat(amountInput) || 450);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition flex items-center gap-2 cursor-pointer border ${
                          isSelected 
                            ? 'bg-[#0066FF] text-white border-blue-400 shadow-sm' 
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{acc.bankName}</span>
                        <span className="text-[10px] opacity-80 font-mono">({acc.maskedAccount.slice(-4)})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Sender vs Receiver Mode Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Transaction Mode:
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {currentRole === 'receiver' ? 'Credit alert (Money In)' : 'Debit alert (Money Out)'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentRole('receiver');
                      handleGenerateAlert('receiver');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border ${
                      currentRole === 'receiver'
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>📥 Receiver (Credited)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentRole('sender');
                      handleGenerateAlert('sender');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border ${
                      currentRole === 'sender'
                        ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>📤 Sender (Debited)</span>
                  </button>
                </div>
              </div>

              {/* 3. Amount & Quick Amount Buttons */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Alert Amount (ETB):
                  </span>
                  <span className="text-[10px] text-slate-400">Presets</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">ETB</span>
                    <input
                      type="number"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-blue-500"
                      placeholder="450.00"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGenerateAlert()}
                    className="px-4 py-2 bg-[#0066FF] hover:bg-blue-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Simulate Alert</span>
                  </button>
                </div>

                {/* Quick amount chips */}
                <div className="flex gap-1.5 mt-2">
                  {quickAmounts.map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setAmountInput(amt.toString());
                        handleGenerateAlert(currentRole, amt);
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-300 border border-slate-700 transition cursor-pointer"
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: BANK ACCOUNTS MANAGER */}
          {activeTab === 'accounts' && (
            <div className="p-3.5 space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Manage Bank Accounts ({accounts.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreateAccountModal(true)}
                  className="px-2.5 py-1 bg-[#0066FF] hover:bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Account</span>
                </button>
              </div>

              <div className="space-y-2">
                {accounts.map(acc => {
                  const isSelected = acc.id === activeAccountId;
                  return (
                    <div
                      key={acc.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                        isSelected 
                          ? 'bg-blue-950/40 border-blue-500/60' 
                          : 'bg-slate-800/80 border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white truncate">{acc.bankName}</h4>
                            {isSelected && (
                              <span className="text-[9px] bg-[#0066FF] text-white px-1.5 py-0.2 rounded-full font-extrabold uppercase">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-slate-400">{acc.maskedAccount} • {acc.holderName}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!isSelected && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAccountId(acc.id);
                              TruecallerService.setActiveAccountId(acc.id);
                              handleGenerateAlert(currentRole, parseFloat(amountInput) || 450);
                            }}
                            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                          >
                            Select
                          </button>
                        )}
                        {acc.isCustom && (
                          <button
                            type="button"
                            onClick={() => {
                              TruecallerService.deleteAccount(acc.id);
                              setAccounts(TruecallerService.getAccounts());
                              showToast('Account deleted');
                            }}
                            className="p-1 hover:bg-red-500/20 text-red-400 rounded-lg cursor-pointer"
                            title="Delete custom account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ALERTS HISTORY */}
          {activeTab === 'history' && (
            <div className="p-3.5 space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Simulated Alerts History ({alerts.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    TruecallerService.markAllAsRead();
                    setAlerts(TruecallerService.getAlerts());
                    showToast('All marked as read');
                  }}
                  className="text-[11px] text-blue-400 hover:underline font-bold cursor-pointer"
                >
                  Mark all as read
                </button>
              </div>

              <div className="space-y-2">
                {alerts.map(al => {
                  const isCurrent = currentAlert?.id === al.id;
                  return (
                    <div
                      key={al.id}
                      onClick={() => {
                        setCurrentAlert(al);
                        setIsAlertVisible(true);
                        playNotificationChime();
                      }}
                      className={`p-2.5 rounded-xl border cursor-pointer transition ${
                        isCurrent 
                          ? 'bg-blue-900/30 border-blue-400' 
                          : 'bg-slate-800/80 border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{al.bankName}</span>
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full ${
                            al.role === 'receiver' ? 'bg-emerald-900/60 text-emerald-300' : 'bg-amber-900/60 text-amber-300'
                          }`}>
                            {al.role}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">{al.timeString}</span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium truncate">{al.summaryText}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CREATE NEW BANK ACCOUNT                                     */}
      {/* =================================================================== */}
      {showCreateAccountModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-scaleUp text-slate-100">
            
            {/* Modal Header */}
            <div className="bg-slate-800 px-5 py-3.5 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#0066FF]" />
                <h3 className="font-bold text-sm text-white">Add New Bank Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateAccountModal(false)}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateAccountSubmit} className="p-5 space-y-3.5">
              
              {/* Bank Preset Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Select Bank:
                </label>
                <select
                  value={newBankKey}
                  onChange={(e) => {
                    const key = e.target.value as TruecallerBankKey;
                    setNewBankKey(key);
                    const preset = BANK_PRESETS.find(p => p.key === key);
                    if (preset) {
                      // Pre-fill realistic account number based on bank standard prefix & length
                      const randomDigits = Math.floor(Math.random() * Math.pow(10, preset.accLength - preset.defaultPrefix.length - 4));
                      setNewAccNumber(`${preset.defaultPrefix}${randomDigits}9165`);
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                >
                  {BANK_PRESETS.map(b => (
                    <option key={b.key} value={b.key}>
                      {b.name} ({b.shortName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Account Number:
                </label>
                <input
                  type="text"
                  value={newAccNumber}
                  onChange={(e) => setNewAccNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                  placeholder="1000419529165"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Masked preview: <span className="text-blue-400 font-mono font-bold">{maskTruecallerAccount(newAccNumber)}</span>
                </p>
              </div>

              {/* Account Holder Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Account Holder Name:
                </label>
                <input
                  type="text"
                  value={newAccHolder}
                  onChange={(e) => setNewAccHolder(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Leykun Jemaneh"
                  required
                />
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Account Type:
                </label>
                <input
                  type="text"
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                  placeholder="Savings Account / Current / Wallet"
                />
              </div>

              {/* Initial Balance */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Initial Balance (ETB):
                </label>
                <input
                  type="number"
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                  placeholder="5420.50"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateAccountModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0066FF] hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition"
                >
                  Save &amp; Generate Alert
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

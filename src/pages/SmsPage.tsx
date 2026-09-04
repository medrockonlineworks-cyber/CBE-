import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, 
  MoreVertical, 
  User, 
  ArrowDown, 
  Check, 
  Landmark, 
  CreditCard, 
  Trash2, 
  CheckCheck, 
  Plus, 
  ExternalLink,
  Wifi,
  Battery,
  ShieldCheck,
  X,
  Zap
} from 'lucide-react';
import { SmsMessage, SmsAccount } from '../types/sms';
import { SmsService, maskAccountNumber } from '../services/smsService';
import { LocalDb } from '../lib/mockData';

interface SmsPageProps {
  onBack: () => void;
  accountId?: string;
}

export default function SmsPage({ onBack, accountId: initialAccountId }: SmsPageProps) {
  // Accounts and active account state
  const [accounts, setAccounts] = useState<SmsAccount[]>(() => SmsService.getAccounts());
  const [activeAccountNum, setActiveAccountNum] = useState<string>(() => {
    return SmsService.getActiveAccountNumber();
  });

  const [messages, setMessages] = useState<SmsMessage[]>(() => {
    const acc = SmsService.getActiveAccountNumber();
    return SmsService.getSmsMessages(acc);
  });

  // UI States
  const [showMenu, setShowMenu] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState<SmsMessage | null>(null);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simAmount, setSimAmount] = useState('500000');
  const [simRecipientName, setSimRecipientName] = useState('Sadik Ahmed');
  const [simRecipientAccount, setSimRecipientAccount] = useState('1000284758657');
  const [customAccInput, setCustomAccInput] = useState('');
  const [customNameInput, setCustomNameInput] = useState('');
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync with available banking accounts in LocalDb
  const refreshAccounts = () => {
    try {
      const registered = LocalDb.getAllRegisteredAccounts();
      registered.forEach(r => {
        if (r.accountNumber) {
          SmsService.ensureAccount(r.accountNumber, r.accountName);
        }
      });
    } catch {
      // Non-blocking fallback
    }
    const updatedAccs = SmsService.getAccounts();
    setAccounts(updatedAccs);
  };

  // Reload current account's messages
  const reloadMessages = (accountNum: string) => {
    const msgs = SmsService.getSmsMessages(accountNum);
    setMessages(msgs);
  };

  // Listen to SMS updates, account changes, and transactions
  useEffect(() => {
    refreshAccounts();
    reloadMessages(activeAccountNum);

    const handleSmsUpdated = () => {
      reloadMessages(activeAccountNum);
      setAccounts(SmsService.getAccounts());
    };

    const handleActiveAccChanged = (e: CustomEvent<string>) => {
      if (e.detail) {
        setActiveAccountNum(e.detail);
        reloadMessages(e.detail);
      }
    };

    window.addEventListener('sms-updated', handleSmsUpdated);
    window.addEventListener('sms-created', handleSmsUpdated);
    window.addEventListener('sms-accounts-updated', handleSmsUpdated);
    window.addEventListener('sms-active-account-changed', handleActiveAccChanged as EventListener);

    return () => {
      window.removeEventListener('sms-updated', handleSmsUpdated);
      window.removeEventListener('sms-created', handleSmsUpdated);
      window.removeEventListener('sms-accounts-updated', handleSmsUpdated);
      window.removeEventListener('sms-active-account-changed', handleActiveAccChanged as EventListener);
    };
  }, [activeAccountNum]);

  // Current active account details
  const activeAccount = useMemo(() => {
    return accounts.find(a => a.accountNumber === activeAccountNum) || {
      accountNumber: activeAccountNum,
      accountName: 'Leykun Jemaneh Ylma',
      bankName: 'Commercial Bank of Ethiopia',
      balance: 1859.47,
      lastUpdated: new Date().toISOString()
    };
  }, [accounts, activeAccountNum]);

  // Switch active account
  const handleSelectAccount = (accNum: string) => {
    SmsService.setActiveAccountNumber(accNum);
    setActiveAccountNum(accNum);
    reloadMessages(accNum);
    setShowMenu(false);
    setShowAccountModal(false);
  };

  // Add custom account
  const handleAddCustomAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = customAccInput.replace(/\D/g, '');
    if (!cleanNum || cleanNum.length < 5) return;

    const newAcc = SmsService.ensureAccount(
      cleanNum, 
      customNameInput.trim() || `Account ${cleanNum.slice(-4)}`,
      1000.00
    );
    refreshAccounts();
    handleSelectAccount(newAcc.accountNumber);
    setCustomAccInput('');
    setCustomNameInput('');
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 100;
    setShowScrollBottom(isFarFromBottom);
  };

  // Mark all messages as read
  const handleMarkAllAsRead = () => {
    SmsService.markAllAsRead(activeAccountNum);
    reloadMessages(activeAccountNum);
    setShowMenu(false);
  };

  // Simulate 500,000 ETB transfer
  const handleSimulate500k = () => {
    SmsService.simulateTransfer({
      amount: 500000,
      senderAccount: activeAccountNum,
      senderName: activeAccount.accountName,
      recipientAccount: '1000284758657',
      recipientName: 'Sadik Ahmed'
    });
    reloadMessages(activeAccountNum);
    setShowMenu(false);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Custom simulation handler
  const handleCustomSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(simAmount.replace(/,/g, ''));
    if (isNaN(amt) || amt <= 0) return;

    SmsService.simulateTransfer({
      amount: amt,
      senderAccount: activeAccountNum,
      senderName: activeAccount.accountName,
      recipientAccount: simRecipientAccount.trim() || '1000284758657',
      recipientName: simRecipientName.trim() || 'Sadik Ahmed'
    });
    reloadMessages(activeAccountNum);
    setShowSimulateModal(false);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Clear messages for this account
  const handleClearAccountMessages = () => {
    if (confirm(`Clear all messages for account ${activeAccountNum}?`)) {
      SmsService.clearAccountMessages(activeAccountNum);
      reloadMessages(activeAccountNum);
      setShowMenu(false);
    }
  };

  // Format message text with active links matching screenshot
  const renderMessageContent = (msg: SmsMessage) => {
    const text = msg.message;
    // URL regex to make links clickable
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return (
      <div className="whitespace-pre-line text-[14px] leading-relaxed text-[#e8eaed] font-normal break-words">
        {parts.map((part, index) => {
          if (part.match(urlRegex)) {
            const isReceipt = part.includes('mreciept.cbe.com.et');
            return (
              <a
                key={index}
                href={part}
                target="_blank"
                rel="noreferrer noopener"
                onClick={(e) => {
                  if (isReceipt) {
                    e.preventDefault();
                    setShowReceiptModal(msg);
                  }
                }}
                className="text-sky-400 hover:text-sky-300 underline font-normal break-all inline"
              >
                {part}
              </a>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  };

  // Format timestamp like "Sunday • 3:12 PM"
  const formatSmsTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Sunday • 3:12 PM';
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${dayName} • ${timeStr}`;
    } catch {
      return 'Sunday • 3:12 PM';
    }
  };

  // Partition messages around unread line
  const unreadIndex = useMemo(() => {
    return messages.findIndex(m => !m.read);
  }, [messages]);

  return (
    <div className="min-h-screen bg-[#121212] text-[#e3e3e3] flex flex-col font-sans select-text antialiased">
      
      {/* 1. Android Native Simulated Status Bar (Matching screenshot) */}
      <div className="w-full bg-[#121212] px-4 pt-1.5 pb-1 flex items-center justify-between text-xs text-neutral-400 select-none">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-white tracking-tight">3:28</span>
        </div>
        <div className="flex items-center space-x-2 text-[11px]">
          <span className="text-[10px] font-mono">2.21 KB/s</span>
          <span className="font-bold text-[10px]">H+</span>
          <span className="font-bold text-[10px]">3G</span>
          <div className="flex items-center space-x-0.5">
            <Battery className="w-3.5 h-3.5 fill-white text-white rotate-90" />
            <span className="text-[10px] text-white">100</span>
          </div>
        </div>
      </div>

      {/* 2. Google Messages CBE Header Bar (Matching screenshot) */}
      <header className="w-full bg-[#121212] border-b border-neutral-900/80 px-2 py-2 flex items-center justify-between relative z-40">
        <div className="flex items-center space-x-3">
          {/* Back button */}
          <button
            id="btn-sms-back"
            onClick={onBack}
            className="p-2 rounded-full hover:bg-neutral-800 text-white transition-colors active:scale-95"
            title="Back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          {/* Purple CBE Avatar with white silhouette */}
          <div className="w-10 h-10 rounded-full bg-[#8e24aa] flex items-center justify-center flex-shrink-0 shadow-sm">
            <User className="w-6 h-6 text-white" />
          </div>

          {/* Contact Name - CBE text only, no account number */}
          <h1 className="text-[20px] font-medium text-white tracking-wide leading-none select-none">
            CBE
          </h1>
        </div>

        {/* 3-Dot Menu Button with pink indicator dot */}
        <div className="relative">
          <button
            id="btn-sms-three-dot"
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full hover:bg-neutral-800 text-white relative transition-colors active:scale-95"
            title="Options & Bank Accounts"
          >
            <MoreVertical className="w-6 h-6 text-neutral-200" />
            {/* Small pink dot like in user screenshot */}
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-400 ring-2 ring-[#121212]"></span>
          </button>

          {/* 3-Dot Dropdown Menu (Accounts Option is prominently inside) */}
          {showMenu && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40 bg-black/40" 
                onClick={() => setShowMenu(false)} 
              />
              
              <div className="absolute right-0 mt-2 w-72 bg-[#1f2023] border border-neutral-800 rounded-2xl shadow-2xl z-50 py-2 overflow-hidden text-neutral-200 animate-in fade-in zoom-in-95 duration-100">
                
                {/* Menu Header / Section Label */}
                <div className="px-4 py-2 border-b border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                    <Landmark className="w-3.5 h-3.5 text-purple-400" />
                    <span>Bank Accounts</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowAccountModal(true);
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center space-x-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Switch/Add</span>
                  </button>
                </div>

                {/* Account list options */}
                <div className="max-h-56 overflow-y-auto py-1">
                  {accounts.map(acc => {
                    const isSelected = acc.accountNumber === activeAccountNum;
                    const unreadCount = SmsService.getUnreadSmsCount(acc.accountNumber);
                    return (
                      <button
                        key={acc.accountNumber}
                        onClick={() => handleSelectAccount(acc.accountNumber)}
                        className={`w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-neutral-800/80 transition-colors ${
                          isSelected ? 'bg-neutral-800/50 text-white font-medium' : 'text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          <CreditCard className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-purple-400' : 'text-neutral-500'}`} />
                          <div className="truncate">
                            <p className="text-sm font-mono truncate">{acc.accountNumber}</p>
                            <p className="text-[11px] text-neutral-400 truncate">{acc.accountName}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                          {unreadCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                          )}
                          {isSelected && (
                            <Check className="w-4 h-4 text-purple-400" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-neutral-800 my-1"></div>

                {/* Simulation Actions */}
                <button
                  onClick={handleSimulate500k}
                  className="w-full px-4 py-2 text-left text-sm text-purple-300 hover:bg-neutral-800 flex items-center space-x-2.5 transition-colors"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Simulate 500k Transfer</span>
                </button>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowSimulateModal(true);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-800 flex items-center space-x-2.5 transition-colors"
                >
                  <Plus className="w-4 h-4 text-neutral-400" />
                  <span>Simulate Custom Amount...</span>
                </button>

                <div className="border-t border-neutral-800 my-1"></div>

                {/* Secondary Actions */}
                <button
                  onClick={handleMarkAllAsRead}
                  className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-800 flex items-center space-x-2.5 transition-colors"
                >
                  <CheckCheck className="w-4 h-4 text-neutral-400" />
                  <span>Mark all as read</span>
                </button>

                <button
                  onClick={handleClearAccountMessages}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-neutral-800 flex items-center space-x-2.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>Clear conversation</span>
                </button>

                <div className="px-4 py-2 bg-neutral-900/50 border-t border-neutral-800 text-[11px] text-neutral-400">
                  <span>Current: {maskAccountNumber(activeAccount.accountNumber)}</span>
                  <span className="float-right font-mono text-purple-400">
                    ETB {activeAccount.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

              </div>
            </>
          )}
        </div>
      </header>

      {/* 3. Conversation Message Stream (Styled exactly like the Google Messages screenshot) */}
      <main 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4 max-w-xl mx-auto w-full relative"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500 text-center space-y-2">
            <Landmark className="w-12 h-12 stroke-[1.5] text-neutral-600" />
            <p className="text-sm font-medium text-neutral-400">No banking messages yet for this account.</p>
            <p className="text-xs text-neutral-500 max-w-xs">
              Perform any transfer or deposit in the bank app to automatically generate CBE debit and credit SMS alerts.
            </p>
          </div>
        ) : (
          <>
            {/* Top link / earlier message excerpt as seen at top of screenshot */}
            <div className="text-center">
              <span className="text-xs text-neutral-400 font-normal">
                {formatSmsTimestamp(messages[0].timestamp)}
              </span>
            </div>

            {/* Message bubbles sequence */}
            {messages.map((msg, index) => {
              const isUnreadBoundary = unreadIndex !== -1 && index === unreadIndex;

              return (
                <React.Fragment key={msg.id}>
                  {/* Unread Divider Bar (Matching the screenshot line with "Unread") */}
                  {isUnreadBoundary && (
                    <div className="flex items-center my-4 px-2 select-none">
                      <div className="h-[1px] bg-neutral-800 flex-1"></div>
                      <span className="px-3 text-xs text-neutral-400 font-normal tracking-wide">
                        Unread
                      </span>
                      <div className="h-[1px] bg-neutral-800 flex-1"></div>
                    </div>
                  )}

                  {/* Message Bubble Container (Exact Google Messages dark bubble style) */}
                  <div className="flex flex-col items-start w-full">
                    <div 
                      className="max-w-[92%] bg-[#212226] text-[#e8eaed] rounded-3xl rounded-tl-sm px-4 py-3.5 shadow-sm border border-neutral-800/40 relative group"
                    >
                      {/* Render text with hyperlinks */}
                      {renderMessageContent(msg)}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Floating Scroll to Bottom Button (Round down-arrow button as in screenshot) */}
      {showScrollBottom && (
        <div className="sticky bottom-16 flex justify-center pointer-events-none pb-2 z-30">
          <button
            onClick={scrollToBottom}
            className="pointer-events-auto w-10 h-10 rounded-full bg-[#202124] border border-neutral-700 text-white shadow-xl flex items-center justify-center hover:bg-neutral-800 transition-all active:scale-90"
            title="Scroll to latest"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Simulation Quick Bar */}
      <div className="w-full bg-[#16171a] border-t border-neutral-800/60 px-3 py-1.5 flex items-center justify-between text-xs z-30">
        <div className="flex items-center space-x-1.5 text-neutral-400">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-medium">Simulate:</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSimulate500k}
            className="px-2.5 py-1 rounded-full bg-purple-700/80 hover:bg-purple-600 text-white font-medium text-[11px] transition-all active:scale-95 flex items-center space-x-1 shadow-sm border border-purple-500/40"
            title="Simulate 500,000 ETB transfer with exact CBE VAT and Disaster Recovery"
          >
            <span>⚡ 500k ETB</span>
          </button>
          <button
            onClick={() => setShowSimulateModal(true)}
            className="px-2.5 py-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-[11px] transition-colors border border-neutral-700/50"
            title="Simulate custom amount transfer"
          >
            <span>Custom Amount...</span>
          </button>
        </div>
      </div>

      {/* 4. Bottom Banner: Exact text from screenshot */}
      <footer className="w-full bg-[#161719] border-t border-neutral-800/80 px-4 py-3.5 z-30">
        <div className="max-w-xl mx-auto flex items-center justify-center text-center">
          <p className="text-[13px] text-neutral-300 font-normal">
            Sender can't accept replies. Contact them directly.{' '}
            <a 
              href="https://www.combanketh.et" 
              target="_blank" 
              rel="noreferrer noopener"
              className="text-neutral-300 underline hover:text-white transition-colors"
            >
              Learn more
            </a>
          </p>
        </div>
      </footer>

      {/* 5. Android Navigation Soft-Keys Bar (Back, Home, Recents) */}
      <div className="w-full bg-[#121212] py-2 px-8 flex items-center justify-around select-none border-t border-neutral-900">
        {/* Recents Icon */}
        <button 
          onClick={onBack}
          className="p-2 text-neutral-500 hover:text-neutral-300 active:scale-90 transition-transform"
        >
          <div className="w-3.5 h-3.5 border-2 border-neutral-500 rounded-sm"></div>
        </button>
        {/* Home Icon */}
        <button 
          onClick={onBack}
          className="p-2 text-neutral-500 hover:text-neutral-300 active:scale-90 transition-transform"
        >
          <div className="w-3.5 h-3.5 border-2 border-neutral-500 rounded-full"></div>
        </button>
        {/* Back Icon */}
        <button 
          onClick={onBack}
          className="p-2 text-neutral-500 hover:text-neutral-300 active:scale-90 transition-transform"
        >
          <div className="w-0 h-0 border-y-[6px] border-y-transparent border-r-[10px] border-r-neutral-500"></div>
        </button>
      </div>

      {/* 6. Switch / Add Account Modal (from 3-Dot menu) */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1e1f23] border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-white">
            
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Landmark className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-lg">Bank Message Accounts</h3>
              </div>
              <button
                onClick={() => setShowAccountModal(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-neutral-400">
                Each sender or receiver account has its own independent message thread. Select an account to view its messages or add a new account number.
              </p>

              {/* Accounts List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {accounts.map(acc => {
                  const isSelected = acc.accountNumber === activeAccountNum;
                  return (
                    <div
                      key={acc.accountNumber}
                      onClick={() => handleSelectAccount(acc.accountNumber)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'border-purple-500 bg-purple-950/20 text-white' 
                          : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 text-neutral-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-semibold text-sm">{acc.accountNumber}</span>
                          {isSelected && (
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full font-medium">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">{acc.accountName}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-mono text-purple-400 font-semibold">
                          ETB {acc.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          {SmsService.getSmsMessages(acc.accountNumber).length} messages
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add / Switch by Account Number */}
              <form onSubmit={handleAddCustomAccount} className="pt-3 border-t border-neutral-800 space-y-3">
                <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Open or Add Account Number
                </h4>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 1000419524747"
                    value={customAccInput}
                    onChange={(e) => setCustomAccInput(e.target.value)}
                    className="w-full bg-[#141416] border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Account Holder Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Leykun Jemaneh Ylma"
                    value={customNameInput}
                    onChange={(e) => setCustomNameInput(e.target.value)}
                    className="w-full bg-[#141416] border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!customAccInput.trim()}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors flex items-center justify-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Open Account Messages</span>
                </button>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* 7. Official CBE Receipt Modal (when clicking mreciept link) */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1c1d21] border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-white">
            
            <div className="bg-purple-900/40 border-b border-purple-800/50 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-semibold text-sm">Commercial Bank of Ethiopia</h3>
                  <p className="text-[11px] text-neutral-300">Official Electronic Receipt</p>
                </div>
              </div>
              <button 
                onClick={() => setShowReceiptModal(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-sm">
              <div className="text-center py-2 border-b border-neutral-800">
                <span className="text-xs text-neutral-400 uppercase tracking-wider">Transaction Amount</span>
                <p className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                  ETB {showReceiptModal.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '10.00'}
                </p>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono mt-1 inline-block">
                  SUCCESSFUL
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Reference / Ref:</span>
                  <span className="font-mono text-white">{showReceiptModal.transactionId || 'FT263211VK07'}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Account Number:</span>
                  <span className="font-mono text-white">{maskAccountNumber(showReceiptModal.accountNumber)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Account Holder:</span>
                  <span className="text-white">{showReceiptModal.accountName || 'Leykun Jemaneh Ylma'}</span>
                </div>
                {showReceiptModal.serviceCharge !== undefined && (
                  <div className="flex justify-between text-neutral-400">
                    <span>Service Charge:</span>
                    <span className="font-mono text-white">ETB {showReceiptModal.serviceCharge.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {showReceiptModal.vat !== undefined && (
                  <div className="flex justify-between text-neutral-400">
                    <span>VAT (15%):</span>
                    <span className="font-mono text-white">ETB {showReceiptModal.vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {showReceiptModal.disasterRecovery !== undefined && (
                  <div className="flex justify-between text-neutral-400">
                    <span>Disaster Recovery (5%):</span>
                    <span className="font-mono text-white">ETB {showReceiptModal.disasterRecovery.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {showReceiptModal.totalDebited !== undefined && (
                  <div className="flex justify-between text-neutral-400 font-semibold border-t border-neutral-800 pt-1.5">
                    <span>Total Debited:</span>
                    <span className="font-mono text-white">ETB {showReceiptModal.totalDebited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-400">
                  <span>Remaining Balance:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    ETB {showReceiptModal.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '1,859.47'}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Date & Time:</span>
                  <span className="text-white">{new Date(showReceiptModal.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800">
                <button
                  onClick={() => setShowReceiptModal(null)}
                  className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-medium transition-colors"
                >
                  Close Receipt
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 8. Custom Simulation Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1e1f23] border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-white">
            
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-lg">Simulate Transfer SMS</h3>
              </div>
              <button
                onClick={() => setShowSimulateModal(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCustomSimulate} className="p-5 space-y-4">
              <p className="text-xs text-neutral-400">
                Simulate an immediate debit transfer notification for account <span className="font-mono text-purple-300">{activeAccountNum}</span> with accurate CBE Tariff, VAT, and Disaster Recovery.
              </p>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Transfer Amount (ETB)</label>
                <input
                  type="text"
                  placeholder="500000"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  className="w-full bg-[#141416] border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                  required
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  Try 500000 to test large transactions.
                </p>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Recipient Name</label>
                <input
                  type="text"
                  placeholder="Sadik Ahmed"
                  value={simRecipientName}
                  onChange={(e) => setSimRecipientName(e.target.value)}
                  className="w-full bg-[#141416] border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Recipient Account Number</label>
                <input
                  type="text"
                  placeholder="1000284758657"
                  value={simRecipientAccount}
                  onChange={(e) => setSimRecipientAccount(e.target.value)}
                  className="w-full bg-[#141416] border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 border-t border-neutral-800 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-md"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Generate Transfer SMS</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

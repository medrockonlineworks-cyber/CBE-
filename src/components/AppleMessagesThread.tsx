import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronLeft, 
  Info, 
  Plus, 
  ArrowUp, 
  Smile, 
  Camera, 
  Send,
  CheckCheck,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { SmsMessage, SmsAccount } from '../types/sms';
import { formatBubbleTime, maskAccountNumber } from '../services/smsService';
import { MessageThread } from '../types/messages';

interface AppleMessagesThreadProps {
  messages: SmsMessage[];
  accounts?: SmsAccount[];
  activeAccount?: SmsAccount | null;
  onSelectAccount?: (acc: SmsAccount) => void;
  onBack: () => void;
  onClearMessages?: () => void;
  onOpenWebReceipt?: (msg: SmsMessage) => void;
  onOpenHolidayCard?: (msg?: SmsMessage) => void;
  isDarkMode?: boolean;
  thread?: MessageThread | null;
  onSendMessage?: (text: string) => void;
}

export const AppleMessagesThread: React.FC<AppleMessagesThreadProps> = ({
  messages,
  accounts = [],
  activeAccount,
  onSelectAccount,
  onBack,
  onClearMessages,
  onOpenWebReceipt,
  onOpenHolidayCard,
  isDarkMode = true,
  thread = null,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, thread?.messages?.length]);

  const bgClass = isDarkMode ? 'bg-black text-white' : 'bg-white text-black';
  const headerBg = isDarkMode ? 'bg-[#1C1C1E]/90' : 'bg-[#F2F2F7]/90';
  const bubbleReceivedBg = isDarkMode ? 'bg-[#26252A] text-white' : 'bg-[#E9E9EB] text-black';
  const bubbleSentBg = 'bg-[#007AFF] text-white';
  const subtextClass = isDarkMode ? 'text-[#8E8E93]' : 'text-[#8E8E93]';
  const inputBg = isDarkMode ? 'bg-[#1C1C1E] border-[#38383A]' : 'bg-white border-[#C6C6C8]';

  const isGeneric = !!thread;
  const senderTitle = isGeneric ? thread.sender : 'Commercial Bank of Ethiopia';
  const avatarLetter = isGeneric ? (thread.avatarLetter || thread.sender.charAt(0).toUpperCase()) : 'CBE';
  const avatarBg = isGeneric ? (thread.avatarColor || '#007AFF') : '#70189F';

  const handleSend = () => {
    if (!inputText.trim()) return;
    if (onSendMessage) {
      onSendMessage(inputText.trim());
    }
    setInputText('');
  };

  return (
    <div className={`min-h-full flex flex-col font-sans select-none ${bgClass} pb-safe relative`}>
      {/* iOS Top App Bar */}
      <header className={`sticky top-0 z-30 px-3 pt-[max(env(safe-area-inset-top,0px),10px)] pb-2 backdrop-blur-xl ${headerBg} border-b border-black/10 dark:border-white/10`}>
        <div className="flex items-center justify-between h-11">
          {/* Back button: < Messages */}
          <button
            type="button"
            onClick={onBack}
            className="text-[#007AFF] hover:opacity-80 active:opacity-60 text-[17px] font-normal flex items-center gap-0.5 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 -ml-1 stroke-[2.5]" />
            <span>Messages</span>
          </button>

          {/* Center Contact Info */}
          <div 
            className={`flex flex-col items-center ${!isGeneric && onSelectAccount ? 'cursor-pointer' : ''}`}
            onClick={() => {
              if (!isGeneric && onSelectAccount) {
                setShowAccountDropdown(!showAccountDropdown);
              }
            }}
          >
            <div 
              className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-xs mb-0.5"
              style={{ backgroundColor: avatarBg }}
            >
              {avatarLetter}
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-[13px] leading-tight flex items-center gap-1 max-w-[190px] truncate">
                {senderTitle}
                {!isGeneric && (
                  <CheckCircle2 className="w-3 h-3 text-[#007AFF] fill-[#007AFF] text-black shrink-0" />
                )}
              </span>
              {!isGeneric && onSelectAccount && (
                <ChevronDown className="w-3 h-3 text-[#8E8E93]" />
              )}
            </div>
            <span className="text-[10px] text-[#8E8E93]">
              {isGeneric 
                ? (thread.phoneNumber || 'SMS Notification')
                : `127 • ${activeAccount ? maskAccountNumber(activeAccount.accountNumber) : 'All Accounts'}`}
            </span>
          </div>

          {/* Right Action: Info */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!isGeneric && onSelectAccount) {
                  setShowAccountDropdown(!showAccountDropdown);
                }
              }}
              className="text-[#007AFF] hover:opacity-80 p-1 cursor-pointer"
              title="Details & Info"
            >
              <Info className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Account Selector Dropdown Sheet (Only for CBE) */}
        {!isGeneric && showAccountDropdown && accounts.length > 0 && (
          <div className="mt-2 p-3 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800 text-xs font-bold text-neutral-400 uppercase tracking-wider">
              <span>Select Bank Account</span>
              {onClearMessages && (
                <button 
                  onClick={() => {
                    onClearMessages();
                    setShowAccountDropdown(false);
                  }}
                  className="text-rose-400 hover:text-rose-300 normal-case flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {accounts.map(acc => (
                <button
                  key={acc.accountNumber}
                  type="button"
                  onClick={() => {
                    if (onSelectAccount) onSelectAccount(acc);
                    setShowAccountDropdown(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between transition cursor-pointer ${
                    activeAccount?.accountNumber === acc.accountNumber 
                      ? 'bg-[#007AFF] text-white font-bold' 
                      : 'hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  <div className="flex flex-col">
                    <span>{acc.accountName}</span>
                    <span className="text-[10px] opacity-75 font-mono">{maskAccountNumber(acc.accountNumber)}</span>
                  </div>
                  <span className="text-[11px] font-bold">
                    {acc.currency} {acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3">
        {/* Date Stamp */}
        <div className="text-center my-2">
          <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">
            Today
          </span>
        </div>

        {isGeneric ? (
          /* Render Generic Thread Messages */
          (!thread.messages || thread.messages.length === 0) ? (
            <div className="py-20 text-center text-xs text-[#8E8E93]">
              No messages in this conversation.
            </div>
          ) : (
            thread.messages.map((m) => {
              const isSent = !!(m.isOutgoing ?? m.isSender);
              return (
                <div 
                  key={m.id} 
                  className={`flex flex-col ${isSent ? 'items-end' : 'items-start'} max-w-[85%] ${isSent ? 'ml-auto' : 'mr-auto'}`}
                >
                  <div 
                    className={`px-3.5 py-2.5 rounded-[18px] text-[14px] leading-relaxed shadow-xs whitespace-pre-wrap break-words ${
                      isSent ? bubbleSentBg : bubbleReceivedBg
                    } ${isSent ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'}`}
                  >
                    {m.text}
                  </div>
                  <span className={`text-[10px] mt-1 px-1 ${subtextClass}`}>
                    {m.timestamp}
                  </span>
                </div>
              );
            })
          )
        ) : (
          /* Render CBE SMS Messages */
          messages.length === 0 ? (
            <div className="py-20 text-center text-xs text-[#8E8E93]">
              No messages yet. Complete a transaction in CBE to receive real-time SMS alerts here.
            </div>
          ) : (
            messages.map((msg) => {
              const isSent = msg.role === 'sender' || msg.type === 'DEBIT';
              const isWebReceipt = (msg.message && (msg.message.includes('cbe.et/r/') || msg.message.includes('receipt') || msg.message.includes('FT'))) || !!msg.receiptUrl;
              const isHoliday = msg.message && (msg.message.includes('Happy') || msg.message.includes('Eid') || msg.message.includes('New Year'));

              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${isSent ? 'items-end' : 'items-start'} max-w-[85%] ${isSent ? 'ml-auto' : 'mr-auto'}`}
                >
                  {/* iMessage Bubble */}
                  <div 
                    className={`px-3.5 py-2.5 rounded-[18px] text-[14px] leading-relaxed shadow-xs whitespace-pre-wrap break-words ${
                      isSent ? bubbleSentBg : bubbleReceivedBg
                    } ${isSent ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'}`}
                  >
                    {msg.message}

                    {/* Interactive Button Chips for Receipts & Cards */}
                    {(isWebReceipt || isHoliday) && (
                      <div className="mt-2.5 pt-2 border-t border-black/10 dark:border-white/10 flex flex-wrap gap-1.5">
                        {isWebReceipt && onOpenWebReceipt && (
                          <button
                            type="button"
                            onClick={() => onOpenWebReceipt(msg)}
                            className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#007AFF] text-white hover:opacity-90 transition active:scale-95 flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Official Receipt
                          </button>
                        )}
                        {isHoliday && onOpenHolidayCard && (
                          <button
                            type="button"
                            onClick={() => onOpenHolidayCard(msg)}
                            className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-black hover:opacity-90 transition active:scale-95 flex items-center gap-1 cursor-pointer"
                          >
                            <span>🎉 View Holiday Card</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className={`text-[10px] mt-1 px-1 ${subtextClass}`}>
                    {formatBubbleTime(msg.timestamp)}
                  </span>
                </div>
              );
            })
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* iOS iMessage Input Bar */}
      <div className={`p-2.5 border-t border-black/10 dark:border-white/10 ${bgClass} shrink-0`}>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 max-w-md mx-auto"
        >
          {/* iOS Plus Circle Button */}
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-[#8E8E93]/20 hover:bg-[#8E8E93]/30 flex items-center justify-center text-[#007AFF] transition shrink-0 active:scale-95 cursor-pointer"
            title="Add Attachment"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Capsule Text Input */}
          <div className={`flex-1 flex items-center rounded-full px-3.5 py-1.5 border ${inputBg} transition-colors`}>
            <input
              type="text"
              placeholder="iMessage"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="bg-transparent text-[14px] outline-none flex-1 placeholder:text-[#8E8E93]"
            />
            {inputText ? (
              <button
                type="submit"
                className="w-6 h-6 rounded-full bg-[#007AFF] text-white flex items-center justify-center active:scale-95 transition cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            ) : (
              <span className="text-[11px] font-bold text-[#8E8E93]/60 uppercase">
                {isGeneric ? 'SMS' : '127'}
              </span>
            )}
          </div>
        </form>

        {/* Bottom iOS Home Indicator Bar */}
        <div className="w-32 h-1 bg-white/25 rounded-full mx-auto mt-2 mb-0.5 shrink-0 pointer-events-none" />
      </div>
    </div>
  );
};

export default AppleMessagesThread;

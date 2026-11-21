import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  ArrowUp, 
  Mic, 
  User 
} from 'lucide-react';
import { SmsMessage, SmsAccount } from '../types/sms';
import { formatBubbleTime, maskAccountNumber } from '../services/smsService';
import { MessageThread } from '../types/messages';
import AppleProfileSettingsModal from './AppleProfileSettingsModal';
import { PhoneSettingsService } from '../services/phoneSettingsService';
import { SystemBarsService } from '../services/systemBarsService';
import { openExternalUrlInBrowser } from '../services/webReceiptBrowserService';

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
  onBackToApp?: () => void;
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
  onBackToApp,
}) => {
  const [inputText, setInputText] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  // Support both 'Commercial Bank of Ethiopia' (IMG_1139) and 'CBE' (IMG_1136) display titles
  const [contactDisplayName, setContactDisplayName] = useState<string>(() => {
    try {
      return localStorage.getItem('apple_sms_contact_name') || 'Commercial Bank of Ethiopia';
    } catch {
      return 'Commercial Bank of Ethiopia';
    }
  });
  // Unread badge number on back button (e.g. 1 in IMG_1139, 59 in IMG_1136)
  const [backBadgeCount, setBackBadgeCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('apple_sms_back_badge');
      return saved ? parseInt(saved, 10) : 1;
    } catch {
      return 1;
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Enforce pure black status and nav bars whenever Apple Messages thread is active
  useEffect(() => {
    SystemBarsService.syncForView('sms', { isIPhone: true, theme: 'dark' });
  }, []);

  // Chronological order: oldest at top, newest at bottom matching IMG_1139
  const sortedMessages = useMemo(() => {
    const valid = (messages || []).filter(Boolean);
    return valid.sort((a, b) => {
      const timeA = a?.timestamp ? new Date(a.timestamp).getTime() || 0 : 0;
      const timeB = b?.timestamp ? new Date(b.timestamp).getTime() || 0 : 0;
      return timeA - timeB;
    });
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, thread?.messages?.length]);

  const isGeneric = !!thread;
  const senderTitle = isGeneric ? thread.sender : contactDisplayName;
  const senderSubtitle = isGeneric
    ? (thread.phoneNumber || 'SMS Notification')
    : `127 • ${activeAccount ? maskAccountNumber(activeAccount.accountNumber) : 'Saving Account'}`;

  const handleSend = () => {
    if (!inputText.trim()) return;
    if (onSendMessage) {
      onSendMessage(inputText.trim());
    }
    setInputText('');
  };

  // Toggle between "Commercial Bank of Ethiopia" and "CBE"
  const toggleContactTitle = () => {
    if (isGeneric) return;
    const next = contactDisplayName === 'Commercial Bank of Ethiopia' ? 'CBE' : 'Commercial Bank of Ethiopia';
    setContactDisplayName(next);
    try {
      localStorage.setItem('apple_sms_contact_name', next);
    } catch {}
  };

  // Helper to highlight URLs, shortcodes, and account numbers matching IMG_1139 exactly
  const renderFormattedText = (text: string, rawMsg?: SmsMessage) => {
    if (!text) return null;
    // Regex captures full URLs, shortcodes (*830*1#), and detected account numbers (e.g. 4747, 8925, 4715, 9874)
    const pattern = /(https?:\/\/[^\s]+|\*\d+[\d*#]+#?|\b\d{4,10}\b)/g;
    const parts = text.split(pattern);

    return (
      <span className="whitespace-pre-line leading-[1.38] break-words [overflow-wrap:anywhere] [word-break:break-word] w-full block">
        {parts.map((part, idx) => {
          if (!part) return null;
          if (part.match(/^https?:\/\//i)) {
            const isHoliday = part.includes('combanketh.et/holidays');
            const isReceipt = !isHoliday && (
              part.includes('mbreciept') || 
              part.includes('mbreceipt') || 
              part.includes('receipt') || 
              part.includes('mreciept') || 
              part.includes('BranchReceipt') ||
              part.includes('cbe.com.et')
            );

            return (
              <span
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isHoliday && onOpenHolidayCard) {
                    onOpenHolidayCard(rawMsg);
                  } else if (isReceipt && onOpenWebReceipt && rawMsg) {
                    onOpenWebReceipt(rawMsg);
                  } else {
                    openExternalUrlInBrowser(part);
                  }
                }}
                className="text-[#0a84ff] underline cursor-pointer hover:opacity-80 active:opacity-60 inline break-all [overflow-wrap:anywhere]"
              >
                {part}
              </span>
            );
          }

          // Blue styling for detected account numbers and shortcodes matching iPhone iOS Messages screenshot
          if (part.match(/^\d{4,10}$/) || part.match(/^\*\d+/)) {
            return (
              <span 
                key={idx} 
                className="text-[#0a84ff] cursor-pointer hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileModal(true);
                }}
              >
                {part}
              </span>
            );
          }

          return <span key={idx} className="break-words [overflow-wrap:anywhere]">{part}</span>;
        })}
      </span>
    );
  };

  return (
    <div className="h-full w-full flex-1 flex flex-col font-sans select-none bg-black text-white relative overflow-hidden overflow-x-hidden touch-pan-y">

      {/* 2. Top Navigation Bar: Opaque Black header containing Avatar & Pill, with Back button (< 1 or < 59) */}
      <header className="w-full bg-black border-b border-[#2c2c2e]/80 shrink-0 z-30 pt-[max(env(safe-area-inset-top,0px),8px)] pb-2 px-3 relative">
        <div className="w-full flex items-center justify-between">
          {/* Left: Back button in dark pill with white oval badge matching IMG_1139 (< 1) and IMG_1136 (< 59) */}
          <button
            type="button"
            onClick={onBack}
            className="bg-[#2c2c2e] hover:bg-[#3a3a3c] active:scale-95 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-white transition-transform cursor-pointer shadow-sm shrink-0"
            title="Back to Messages"
          >
            <ChevronLeft className="w-4 h-4 -ml-0.5 stroke-[2.8] text-white" />
            <span className="bg-white text-black font-bold text-[12px] px-2 py-0.5 rounded-full min-w-[20px] text-center leading-none">
              {backBadgeCount}
            </span>
          </button>

          {/* Center: Profile Icon & Contact Pill (Tapping opens Profile & Settings!) */}
          <div 
            onClick={() => setShowProfileModal(true)}
            className="flex flex-col items-center justify-center cursor-pointer group z-10 max-w-[65%]"
            title="Open Profile and Settings"
          >
            {/* Large Circular Avatar (#545458 with white User silhouette) */}
            <div className="w-11 h-11 bg-[#545458] rounded-full flex items-center justify-center text-white shadow-md group-hover:scale-105 active:scale-95 transition-transform">
              <User className="w-6 h-6 text-white stroke-[2.2]" />
            </div>

            {/* Contact Pill with Chevron > (Matching IMG_1139: 'Commercial Bank of Ethiopia >' or 'CBE >') */}
            <div className="bg-[#2c2c2e] hover:bg-[#3a3a3c] px-3.5 py-0.5 rounded-full text-white font-medium text-[13px] flex items-center gap-1 mt-1 shadow-xs transition-colors truncate max-w-full">
              <span className="truncate">{senderTitle}</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/80 shrink-0" />
            </div>
          </div>

          {/* Right: Invisible spacer to balance the back button so avatar stays centered */}
          <div className="w-[58px] shrink-0 pointer-events-none" />
        </div>
      </header>

      {/* 3. Messages Stream (Matching IMG_1139 with exact centered timestamps) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-3 pb-24 space-y-3 w-full bg-black">
        {/* Generic Thread Messages */}
        {isGeneric && thread?.messages && thread.messages.length > 0 ? (
          thread.messages.map((msg, index) => {
            const isOutgoing = msg.isOutgoing;

            return (
              <div key={msg.id || index} className="space-y-2">
                {/* Centered Timestamp Divider */}
                <div className="text-center my-2 select-none">
                  <span className="text-[12px] text-[#8e8e93] font-normal">
                    {msg.timestamp || 'Today • Ethio telecom'}
                  </span>
                </div>

                <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} w-full`}>
                  <div 
                    className={`p-3.5 rounded-[20px] max-w-[92%] text-[15.5px] leading-[1.38] select-text shadow-xs break-words [overflow-wrap:anywhere] overflow-hidden ${
                      isOutgoing 
                        ? 'bg-[#007aff] text-white rounded-br-[4px]' 
                        : 'bg-[#26252a] text-white rounded-bl-[4px]'
                    }`}
                  >
                    {renderFormattedText(msg.text)}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          /* CBE Banking SMS Messages (Chronological order with centered timestamps matching IMG_1139) */
          sortedMessages.map((msg, index) => {
            return (
              <div key={msg.id || index} className="space-y-2">
                {/* Centered Timestamp Divider matching IMG_1139 ("3:45 PM • Ethio telecom", "6:51 PM • Ethio telecom") */}
                <div className="text-center my-2.5 select-none">
                  <span className="text-[12px] text-[#8e8e93] font-normal">
                    {formatBubbleTime(msg.timestamp)}
                  </span>
                </div>

                {/* Left Aligned Message Bubble */}
                <div className="flex justify-start w-full">
                  <div className="bg-[#26252a] text-white px-4 py-3.5 rounded-[20px] rounded-bl-[4px] max-w-[92%] text-[15.5px] leading-[1.38] select-text shadow-xs break-words [overflow-wrap:anywhere] overflow-hidden">
                    {renderFormattedText(msg?.message, msg)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Fixed Bottom Bar (+ button and Text Message input pill matching IMG_1139) */}
      <div className="fixed bottom-0 inset-x-0 bg-black px-3 pt-2 pb-[max(env(safe-area-inset-bottom,0px),8px)] z-30 flex items-center gap-2 border-t border-[#1c1c1e]">
        {/* Circular Plus Button */}
        <button
          type="button"
          onClick={() => setShowProfileModal(true)}
          className="w-9 h-9 bg-[#2c2c2e] hover:bg-[#3a3a3c] active:scale-95 rounded-full flex items-center justify-center text-white text-xl font-light shrink-0 transition-transform cursor-pointer"
          title="Attach or Settings"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Input Bar Pill */}
        <div className="flex-1 bg-[#1c1c1e] border border-[#2c2c2e]/70 rounded-full px-4 py-2 flex items-center justify-between text-[15px]">
          <input
            type="text"
            placeholder="Text Message • SMS"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="bg-transparent text-white placeholder:text-[#8e8e93] outline-none flex-1 min-w-0"
          />

          {inputText.trim() ? (
            <button
              type="button"
              onClick={handleSend}
              className="w-7 h-7 bg-[#007aff] hover:bg-[#006ee6] active:scale-95 rounded-full flex items-center justify-center text-white shrink-0 ml-1.5 transition-transform cursor-pointer"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          ) : (
            <Mic className="w-4 h-4 text-[#8e8e93] hover:text-white shrink-0 cursor-pointer ml-1.5" />
          )}
        </div>
      </div>

      {/* 5. Profile & Settings Modal (Opens when Profile Avatar is tapped!) */}
      <AppleProfileSettingsModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        senderName={senderTitle}
        senderSubtitle={senderSubtitle}
        accounts={accounts}
        activeAccountNumber={activeAccount?.accountNumber}
        onSelectAccount={(accNum) => {
          const acc = accounts.find(a => a.accountNumber === accNum);
          if (acc && onSelectAccount) {
            onSelectAccount(acc);
          }
        }}
        onClearMessages={onClearMessages}
        onBackToApp={onBackToApp || onBack}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default AppleMessagesThread;

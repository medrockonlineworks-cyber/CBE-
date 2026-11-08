import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  ArrowUp, 
  Mic, 
  User, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';
import { SmsMessage, SmsAccount } from '../types/sms';
import { formatBubbleTime, maskAccountNumber } from '../services/smsService';
import { MessageThread } from '../types/messages';
import AppleProfileSettingsModal from './AppleProfileSettingsModal';
import { PhoneSettingsService } from '../services/phoneSettingsService';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const phoneSettings = PhoneSettingsService.getSettings();

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
  const senderTitle = isGeneric ? thread.sender : 'CBE';
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

  // Helper to highlight URLs and shortcodes matching IMG_1139
  const renderFormattedText = (text: string, rawMsg?: SmsMessage) => {
    if (!text) return null;
    const pattern = /(https?:\/\/[^\s]+|\*\d+#|\b\d{4,6}\b)/g;
    const parts = text.split(pattern);

    return (
      <span className="whitespace-pre-line leading-[1.38] break-words [overflow-wrap:anywhere] [word-break:break-word] w-full block">
        {parts.map((part, idx) => {
          if (part.match(pattern)) {
            const isHoliday = part.includes('combanketh.et/holidays');
            const isReceipt = !isHoliday && (
              part.includes('mbreciept') || 
              part.includes('mbreceipt') || 
              part.includes('receipt') || 
              part.includes('mreciept') || 
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
                  }
                }}
                className="text-[#0a84ff] underline cursor-pointer hover:opacity-80 active:opacity-60 inline break-all [overflow-wrap:anywhere]"
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

      {/* 2. Top Navigation Bar: Opaque Black header containing Avatar & Pill, with Back button (< 59) */}
      <header className="w-full bg-black border-b border-[#2c2c2e]/80 shrink-0 z-30 pt-[max(env(safe-area-inset-top,0px),8px)] pb-2 px-3 relative">
        <div className="w-full flex items-center justify-between">
          {/* Left: Back button in dark pill with white oval badge 59 matching IMG_1139 */}
          <button
            type="button"
            onClick={onBack}
            className="bg-[#2c2c2e] hover:bg-[#3a3a3c] active:scale-95 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-white transition-transform cursor-pointer shadow-sm shrink-0"
            title="Back to Messages"
          >
            <ChevronLeft className="w-4.5 h-4.5 -ml-0.5 stroke-[2.8] text-white" />
            <span className="bg-white text-black font-bold text-[12px] px-2 py-0.5 rounded-full min-w-[24px] text-center leading-none">
              59
            </span>
          </button>

          {/* Center: Profile Icon & Contact Pill (Tapping opens Profile & Settings!) */}
          <div 
            onClick={() => setShowProfileModal(true)}
            className="flex flex-col items-center justify-center cursor-pointer group z-10"
            title="Open Profile and Settings"
          >
            {/* Large Circular Avatar (#545458 with white User silhouette) */}
            <div className="w-11 h-11 bg-[#545458] rounded-full flex items-center justify-center text-white shadow-md group-hover:scale-105 active:scale-95 transition-transform">
              <User className="w-6 h-6 text-white stroke-[2.2]" />
            </div>

            {/* Contact Pill with Chevron > (Matching IMG_1139: 'CBE ›') */}
            <div className="bg-[#2c2c2e] hover:bg-[#3a3a3c] px-3.5 py-0.5 rounded-full text-white font-medium text-[13px] flex items-center gap-1 mt-1 shadow-xs transition-colors">
              <span>{senderTitle}</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/80 shrink-0" />
            </div>
          </div>

          {/* Right: Invisible spacer to balance the back button so avatar stays centered */}
          <div className="w-[68px] shrink-0 pointer-events-none" />
        </div>
      </header>

      {/* 3. Messages Stream (Matching IMG_1139) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-3 pb-24 space-y-3.5 w-full bg-black">
        {/* Generic Thread Messages (e.g. Safaricom from screenshot) */}
        {isGeneric && thread?.messages && thread.messages.length > 0 ? (
          thread.messages.map((msg, index) => {
            const isOutgoing = msg.isOutgoing;

            return (
              <div key={msg.id || index} className="space-y-1">
                <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} w-full`}>
                  <div 
                    className={`p-3.5 rounded-[20px] max-w-[94%] text-[15px] leading-[1.38] select-text shadow-xs break-words [overflow-wrap:anywhere] overflow-hidden ${
                      isOutgoing 
                        ? 'bg-[#007aff] text-white rounded-br-[4px]' 
                        : 'bg-[#262628] text-white rounded-bl-[4px]'
                    }`}
                  >
                    {renderFormattedText(msg.text)}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          /* CBE Banking SMS Messages (Chronological order matching IMG_1139) */
          sortedMessages.map((msg, index) => {
            return (
              <div key={msg.id || index} className="space-y-1">
                <div className="flex justify-start w-full">
                  <div className="bg-[#262628] text-white px-4 py-3.5 rounded-[20px] rounded-bl-[4px] max-w-[94%] text-[15px] leading-[1.38] select-text shadow-xs break-words [overflow-wrap:anywhere] overflow-hidden">
                    {renderFormattedText(msg?.message, msg)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Fixed Bottom Bar (+ button and Text Message input pill) */}
      <div className="fixed bottom-0 inset-x-0 bg-black px-3 pt-2 pb-[max(env(safe-area-inset-bottom,0px),12px)] z-30 flex items-center gap-2 border-t border-[#1c1c1e]">
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

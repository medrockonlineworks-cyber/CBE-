import React, { useState, useRef, useEffect } from 'react';
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, thread?.messages?.length]);

  const isGeneric = !!thread;
  const senderTitle = isGeneric ? thread.sender : 'Commercial Bank of Ethiopia';
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

  // Helper to highlight phone numbers, shortcodes, and URLs in light blue matching IMG_0092.png
  const renderFormattedText = (text: string, rawMsg?: SmsMessage) => {
    // Regex matches URLs, shortcodes like 30000, USSD like *799# or *777#
    const pattern = /(https?:\/\/[^\s]+|\*\d+#|\b\d{4,6}\b)/g;
    const parts = text.split(pattern);

    return (
      <span className="whitespace-pre-line leading-relaxed">
        {parts.map((part, idx) => {
          if (part.match(pattern)) {
            const isHoliday = part.includes('combanketh.et/holidays');
            const isReceipt = !isHoliday && (part.includes('mbreceipt') || part.includes('receipt') || part.includes('mreciept') || part.includes('cbe.com.et'));

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
                className="text-[#2997ff] underline cursor-pointer hover:opacity-80 active:opacity-60 inline"
              >
                {part}
              </span>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </span>
    );
  };

  return (
    <div className="h-full min-h-[100dvh] flex flex-col font-sans select-none bg-black text-white relative">
      {/* 1. iOS Top Status Bar (Matching IMG_0092.png with Green Call Pill & Signal/Battery) */}
      <div className="pt-2 px-6 pb-1 flex items-center justify-between text-white text-xs select-none z-20">
        {/* Left: Green call active pill with time */}
        <div className="bg-[#34c759] text-white px-2.5 py-0.5 rounded-full font-bold text-[13px] tracking-tight shadow-xs flex items-center">
          {phoneSettings.timeString || '10:57'}
        </div>

        {/* Right: Signal bars, LTE, Battery 53 */}
        <div className="flex items-center gap-1.5 text-white">
          <div className="flex items-end gap-[1.5px] h-3">
            <div className="w-[3px] h-1.5 bg-white rounded-[0.5px]" />
            <div className="w-[3px] h-2 bg-white rounded-[0.5px]" />
            <div className="w-[3px] h-2.5 bg-white rounded-[0.5px]" />
            <div className="w-[3px] h-3 bg-white rounded-[0.5px]" />
          </div>

          <span className="text-[11px] font-semibold tracking-tight ml-0.5">LTE</span>

          <div className="flex items-center ml-0.5">
            <div className="h-3 w-5 rounded-[3px] border border-white/80 p-[1px] flex items-center justify-center bg-black/40">
              <span className="text-[9px] font-extrabold leading-none text-white">
                {phoneSettings.batteryPercent ?? 53}
              </span>
            </div>
            <div className="w-[1.5px] h-1 bg-white/80 rounded-r-[0.5px]" />
          </div>
        </div>
      </div>

      {/* 2. Top Navigation Bar (Back pill on left, Large Avatar & Contact Pill in center) */}
      <div className="px-3 pt-1 pb-3 flex items-center justify-between relative border-b border-[#2c2c2e]/60">
        {/* Left: Back button in dark pill with count 1 */}
        <button
          type="button"
          onClick={onBack}
          className="bg-[#2c2c2e] hover:bg-[#3a3a3c] active:scale-95 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-white transition-transform cursor-pointer shadow-sm z-10"
          title="Back to Messages"
        >
          <ChevronLeft className="w-5 h-5 -ml-1 stroke-[2.5]" />
          <span className="w-4 h-4 bg-white text-black text-[11px] font-bold rounded-full flex items-center justify-center">
            1
          </span>
        </button>

        {/* Center: Profile Icon & Contact Pill (Tapping opens Profile & Settings!) */}
        <div 
          onClick={() => setShowProfileModal(true)}
          className="absolute inset-x-0 top-0 flex flex-col items-center justify-center cursor-pointer group pt-1"
          title="Open Profile and Settings"
        >
          {/* Large Circular Avatar (#545458 with white User silhouette) */}
          <div className="w-14 h-14 bg-[#545458] rounded-full flex items-center justify-center text-white shadow-md group-hover:scale-105 active:scale-95 transition-transform">
            <User className="w-8 h-8 text-white stroke-[2.2]" />
          </div>

          {/* Contact Pill with Chevron > */}
          <div className="bg-[#2c2c2e]/90 hover:bg-[#3a3a3c] px-3.5 py-1 rounded-full text-white font-semibold text-[13px] flex items-center gap-1 mt-1 shadow-xs transition-colors">
            <span className="truncate max-w-[200px]">{senderTitle}</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#8e8e93]" />
          </div>
        </div>

        {/* Right spacing anchor */}
        <div className="w-12 h-6" />
      </div>

      {/* 3. Messages Stream (Matching IMG_0092.png) */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-4">
        {/* Generic Thread Messages (e.g. Safaricom from screenshot) */}
        {isGeneric && thread?.messages && thread.messages.length > 0 ? (
          thread.messages.map((msg, index) => {
            const isOutgoing = msg.isOutgoing;
            // Show timestamp header when appropriate
            const showTimestamp = index === 0 || msg.timestamp.includes('Yesterday') || msg.timestamp.includes('Today');

            return (
              <div key={msg.id || index} className="space-y-1">
                {showTimestamp && (
                  <div className="text-center text-[12px] font-medium text-[#8e8e93] my-2.5">
                    {msg.timestamp.includes('Yesterday') || msg.timestamp.includes('Today') 
                      ? msg.timestamp 
                      : `Today ${msg.timestamp}`}
                  </div>
                )}

                <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`p-3.5 rounded-[20px] max-w-[85%] text-[15px] leading-relaxed select-text shadow-xs ${
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
          /* CBE Banking SMS Messages */
          messages.map((msg, index) => {
            const timeHeader = formatBubbleTime(msg.timestamp);

            return (
              <div key={msg.id || index} className="space-y-1">
                <div className="text-center text-[12px] font-medium text-[#8e8e93] my-2.5">
                  {timeHeader}
                </div>

                <div className="flex justify-start">
                  <div className="bg-[#26252a] text-white p-3.5 rounded-[20px] rounded-bl-[4px] max-w-[85%] text-[15px] leading-relaxed select-text shadow-xs">
                    {renderFormattedText(msg.message, msg)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Fixed Bottom Bar (+ button and Text Message input pill) */}
      <div className="fixed bottom-0 inset-x-0 bg-black px-3 pt-2 pb-safe z-30 flex items-center gap-2 border-t border-[#1c1c1e]">
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
        <div className="flex-1 bg-[#1c1c1e] border border-[#2c2c2e] rounded-full px-4 py-2 flex items-center justify-between text-[15px]">
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

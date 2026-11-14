import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Phone, 
  Search, 
  MoreVertical, 
  Send, 
  Paperclip, 
  Smile, 
  Mic, 
  User, 
  Copy, 
  Check, 
  CheckCheck,
  Trash2
} from 'lucide-react';
import { MessageThread } from '../types/messages';
import { GoogleMessagesService } from '../services/googleMessagesData';
import { CbeHolidayCardModal } from './CbeHolidayCardModal';
import { CbeWebReceiptModal } from './CbeWebReceiptModal';
import { openWebReceiptInRealBrowser, openExternalUrlInBrowser } from '../services/webReceiptBrowserService';

interface GoogleMessagesThreadProps {
  thread: MessageThread;
  onBack: () => void;
  isDarkMode: boolean;
  onThreadUpdated: () => void;
}

export default function GoogleMessagesThread({
  thread,
  onBack,
  isDarkMode,
  onThreadUpdated
}: GoogleMessagesThreadProps) {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentThread, setCurrentThread] = useState<MessageThread>(thread);
  const [showHolidayCardModal, setShowHolidayCardModal] = useState<boolean>(false);
  const [receiptModalMsg, setReceiptModalMsg] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentThread(thread);
    GoogleMessagesService.markThreadRead(thread.id);
    onThreadUpdated();
  }, [thread.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentThread.messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const updated = GoogleMessagesService.sendMessage(currentThread.id, inputText.trim());
    if (updated) {
      setCurrentThread(updated);
      setInputText('');
      onThreadUpdated();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={`min-h-screen flex flex-col ${
      isDarkMode ? 'bg-[#121316] text-white' : 'bg-[#f8f9fa] text-neutral-900'
    } font-sans select-none`}>
      
      {/* Top App Bar */}
      <header className={`px-3 pt-[max(env(safe-area-inset-top,0px),10px)] pb-2.5 flex items-center justify-between sticky top-0 z-20 border-b ${
        isDarkMode ? 'bg-[#1a1b1e] border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <div className="flex items-center space-x-2 min-w-0">
          <button 
            onClick={onBack}
            className={`p-2 rounded-full transition-colors ${
              isDarkMode ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Avatar with contact silhouette */}
          <div 
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-xs"
            style={{ backgroundColor: currentThread.avatarColor }}
          >
            <User className="w-5 h-5 text-white fill-white" />
          </div>

          <div className="min-w-0 pr-2">
            <h2 className="text-sm font-semibold truncate leading-tight">
              {currentThread.sender}
            </h2>
            <p className="text-[11px] text-neutral-400 truncate">
              SMS / MMS
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'}`}>
            <Phone className="w-4 h-4" />
          </button>
          <button className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'}`}>
            <Search className="w-4 h-4" />
          </button>
          <button className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'}`}>
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Service Security Notice Banner */}
        <div className="flex justify-center py-2">
          <div className={`px-3 py-1 rounded-full text-[11px] font-medium ${
            isDarkMode ? 'bg-neutral-800/80 text-neutral-400' : 'bg-neutral-200/80 text-neutral-600'
          }`}>
            Texting with {currentThread.sender} (SMS)
          </div>
        </div>

        {currentThread.messages && currentThread.messages.length > 0 ? (
          currentThread.messages.map((msg) => {
            const isMe = !!msg.isSender;
            const isCopied = copiedId === msg.id;

            return (
              <div 
                key={msg.id} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div 
                  onClick={() => handleCopy(msg.id, msg.text)}
                  className={`max-w-[82%] sm:max-w-[70%] p-3 rounded-2xl relative text-[13.5px] leading-relaxed break-words cursor-pointer group transition-shadow ${
                    isMe 
                      ? 'bg-[#1a73e8] text-white rounded-br-xs' 
                      : (isDarkMode ? 'bg-[#2a2b2f] text-neutral-100 rounded-bl-xs' : 'bg-neutral-200 text-neutral-900 rounded-bl-xs')
                  }`}
                >
                  <div>
                    {(() => {
                      const urlRegex = /(https?:\/\/[^\s]+)/g;
                      const parts = msg.text.split(urlRegex);
                      return (
                        <p className="whitespace-pre-line">
                          {parts.map((part, i) => {
                            if (part.match(urlRegex)) {
                              const isHoliday = part.includes('combanketh.et/holidays');
                              const isReceipt = !isHoliday && (part.includes('mbreceipt') || part.includes('receipt') || part.includes('mreciept') || part.includes('cbe.com.et'));
                              return (
                                <span
                                  key={i}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isHoliday) {
                                      setShowHolidayCardModal(true);
                                    } else if (isReceipt) {
                                      const smsPayload = {
                                        id: 'FT26248KLR82',
                                        transactionId: 'FT26248KLR82',
                                        bankName: 'Commercial Bank of Ethiopia',
                                        type: 'CREDIT' as const,
                                        sender: 'Dejene Buta',
                                        recipient: 'Leykun',
                                        accountNumber: '1000419524747',
                                        amount: 50.00,
                                        balance: 348.54,
                                        timestamp: '2026-09-05T16:41:01Z',
                                        role: 'receiver' as const,
                                        message: msg.text,
                                        read: true,
                                      };
                                      if (!openWebReceiptInRealBrowser({ smsMessage: smsPayload })) {
                                        setReceiptModalMsg(smsPayload);
                                      }
                                    } else {
                                      openExternalUrlInBrowser(part);
                                    }
                                  }}
                                  className={`${isDarkMode ? 'text-sky-400 hover:text-sky-300' : 'text-sky-600 hover:text-sky-700'} underline cursor-pointer font-medium break-all inline`}
                                >
                                  {part}
                                </span>
                              );
                            }
                            return <span key={i}>{part}</span>;
                          })}
                        </p>
                      );
                    })()}
                  </div>

                  <div className={`flex items-center justify-end space-x-1 mt-1 text-[10px] ${
                    isMe ? 'text-blue-100' : 'text-neutral-400'
                  }`}>
                    <span>{msg.timestamp}</span>
                    {isMe && <CheckCheck className="w-3.5 h-3.5 inline" />}
                    {isCopied && (
                      <span className="ml-1 text-emerald-300 font-medium">Copied!</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 text-xs text-neutral-400">
            {currentThread.snippet}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Composer */}
      <footer className={`p-3 border-t sticky bottom-0 ${
        isDarkMode ? 'bg-[#1a1b1e] border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <form onSubmit={handleSend} className="flex items-center space-x-2">
          <button 
            type="button" 
            className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-600'}`}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className={`flex-1 flex items-center px-4 py-2 rounded-full ${
            isDarkMode ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-900'
          }`}>
            <input 
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Text message"
              className="w-full bg-transparent border-none outline-none text-sm placeholder-neutral-400"
            />
            <button 
              type="button" 
              className="text-neutral-400 hover:text-neutral-200 ml-2"
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>

          {inputText.trim() ? (
            <button 
              type="submit"
              className="w-10 h-10 rounded-full bg-[#1b72e8] hover:bg-[#1a68d1] text-white flex items-center justify-center flex-shrink-0 shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button 
              type="button"
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                isDarkMode ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-200 text-neutral-700'
              }`}
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </form>
      </footer>

      {showHolidayCardModal && (
        <CbeHolidayCardModal onClose={() => setShowHolidayCardModal(false)} />
      )}

      {receiptModalMsg && (
        <CbeWebReceiptModal
          smsMessage={receiptModalMsg}
          onClose={() => setReceiptModalMsg(null)}
        />
      )}
    </div>
  );
}

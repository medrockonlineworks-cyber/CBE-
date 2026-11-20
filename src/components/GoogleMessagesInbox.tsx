import React, { useState } from 'react';
import { 
  Search, 
  User, 
  MessageSquare, 
  Sparkles, 
  X, 
  Moon, 
  Sun, 
  ArrowLeft, 
  CheckCheck,
  Send,
  Wifi,
  Battery,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Check,
  Smartphone,
  BellRing
} from 'lucide-react';
import PhoneSettingsModal from './PhoneSettingsModal';
import SubAppPushModal from './SubAppPushModal';
import { MessageThread } from '../types/messages';
import { SmsAccount } from '../types/sms';
import { GoogleMessagesService } from '../services/googleMessagesData';
import { maskAccountNumber } from '../services/smsService';

interface GoogleMessagesInboxProps {
  threads: MessageThread[];
  onSelectThread: (thread: MessageThread) => void;
  onBackToApp: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onStartChat: (recipient: string, message: string) => void;
  onRefresh: () => void;
  activeAccount?: SmsAccount;
  accounts?: SmsAccount[];
  onSelectAccount?: (accountNumber: string) => void;
}

export default function GoogleMessagesInbox({
  threads,
  onSelectThread,
  onBackToApp,
  isDarkMode,
  onToggleTheme,
  onStartChat,
  onRefresh,
  activeAccount,
  accounts = [],
  onSelectAccount,
}: GoogleMessagesInboxProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAccountList, setShowAccountList] = useState(false);

  const googleProfile = GoogleMessagesService.buildGoogleAccountProfile(activeAccount);
  const otherAccounts = (accounts || []).filter(
    (acc) => acc && (acc.accountNumber || '').replace(/\D/g, '') !== googleProfile.accountNumber
  );
  const [showPhoneSettingsModal, setShowPhoneSettingsModal] = useState(false);
  const [showPushSettingsModal, setShowPushSettingsModal] = useState(false);
  const [showStartChatModal, setShowStartChatModal] = useState(false);
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  
  // New chat modal states
  const [newRecipient, setNewRecipient] = useState('');
  const [newMessage, setNewMessage] = useState('');

  // Gemini assistant prompt state
  const [geminiPrompt, setGeminiPrompt] = useState('');
  const [geminiSuggestion, setGeminiSuggestion] = useState('');

  const filteredThreads = (threads || []).filter(t => {
    if (!t) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.sender || '').toLowerCase().includes(q) ||
      (t.snippet || '').toLowerCase().includes(q)
    );
  });

  const handleCreateChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipient.trim() || !newMessage.trim()) return;
    onStartChat(newRecipient.trim(), newMessage.trim());
    setNewRecipient('');
    setNewMessage('');
    setShowStartChatModal(false);
  };

  const handleGeminiDraft = () => {
    if (!geminiPrompt.trim()) return;
    // Fast contextual template generation for Ethiopian mobile banking & SMS
    const p = geminiPrompt.toLowerCase();
    if (p.includes('balance') || p.includes('cbe') || p.includes('statement')) {
      setGeminiSuggestion('Dear Customer, your request for account inquiry has been processed. Please check your transaction history or dial *889#.');
    } else if (p.includes('tele') || p.includes('airtime')) {
      setGeminiSuggestion('ውድ ደንበኛችን የጥቅል ግዢዎን ለማጠናቀቅ 1ን በመጫን ያረጋግጡ። ኢትዮ ቴሌኮም።');
    } else {
      setGeminiSuggestion(`Hi, regarding "${geminiPrompt}": thank you for reaching out. Your request has been received and is being processed.`);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#121316] text-white' : 'bg-[#f8f9fa] text-neutral-900'} flex flex-col font-sans transition-colors duration-150 select-none`}>
      
      {/* 🔍 Google Messages Top App Bar */}
      <header className={`px-4 pt-[max(env(safe-area-inset-top,0px),12px)] pb-2 flex items-center justify-between sticky top-0 z-30 ${isDarkMode ? 'bg-[#121316]' : 'bg-[#f8f9fa]'}`}>
        {!isSearching ? (
          <>
            <div className="flex items-center space-x-2">
              <h1 className="text-[22px] sm:text-[24px] font-medium tracking-normal text-current">
                Google Messages
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              {/* Search Icon */}
              <button 
                onClick={() => setIsSearching(true)}
                className={`p-2 rounded-full transition-colors ${
                  isDarkMode ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-200 text-neutral-700'
                }`}
                title="Search conversations"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* User Profile Avatar with Dynamic Google Account Color & Initial */}
              <button
                onClick={() => setShowProfileModal(true)}
                className="relative flex items-center justify-center p-[2px] rounded-full border-2 focus:outline-none"
                style={{ borderColor: googleProfile.ringColor }}
                title={`Google Account: ${googleProfile.fullName}`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm"
                  style={{ backgroundColor: googleProfile.avatarColor }}
                >
                  {googleProfile.initial}
                </div>
              </button>
            </div>
          </>
        ) : (
          /* Inline Search Mode */
          <div className={`w-full flex items-center space-x-2 px-3 py-1.5 rounded-full ${
            isDarkMode ? 'bg-neutral-800/90 text-white' : 'bg-neutral-200 text-neutral-900'
          }`}>
            <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search images, videos & more"
              autoFocus
              className="bg-transparent border-none outline-none w-full text-sm placeholder-neutral-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-1">
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            )}
            <button 
              onClick={() => {
                setIsSearching(false);
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-blue-400 px-2 py-1"
            >
              Cancel
            </button>
          </div>
        )}
      </header>

      {/* 📬 Conversation Threads List */}
      <div className="flex-1 overflow-y-auto pb-24 divide-y divide-transparent">
        {filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-neutral-400">
            <MessageSquare className="w-12 h-12 stroke-[1.5] mb-3 text-neutral-500" />
            <p className="text-base font-medium text-neutral-300">No conversations found</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs">
              Try searching with different keywords or start a new chat.
            </p>
          </div>
        ) : (
          filteredThreads.map((thread, idx) => (
            <div
              key={`${thread.id}-${idx}`}
              onClick={() => onSelectThread(thread)}
              className={`w-full px-4 py-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                isDarkMode 
                  ? 'hover:bg-neutral-800/50 active:bg-neutral-800/80' 
                  : 'hover:bg-neutral-100 active:bg-neutral-200'
              }`}
            >
              {/* Left Column: Silhouette Avatar & Sender details */}
              <div className="flex items-center space-x-3.5 min-w-0 pr-3 flex-1">
                {/* Contact Silhouette Avatar with Solid Background Color */}
                <div 
                  className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm overflow-hidden"
                  style={{ backgroundColor: thread.avatarColor }}
                >
                  <div className="w-7 h-7 flex items-center justify-center">
                    <User className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>

                {/* Sender Title and Snippet text */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <h2 className={`text-[15.5px] font-semibold truncate ${
                      isDarkMode ? 'text-neutral-100' : 'text-neutral-900'
                    }`}>
                      {thread.sender}
                    </h2>
                  </div>
                  <p className={`text-[13.5px] truncate mt-0.5 leading-snug ${
                    thread.unreadCount > 0 
                      ? (isDarkMode ? 'text-neutral-300 font-medium' : 'text-neutral-800 font-medium')
                      : (isDarkMode ? 'text-neutral-400' : 'text-neutral-500')
                  }`}>
                    {thread.snippet}
                  </p>
                </div>
              </div>

              {/* Right Column: Time and Unread Blue Badge */}
              <div className="flex flex-col items-end flex-shrink-0 space-y-1.5 pl-2">
                <span className={`text-[12px] font-normal ${
                  thread.unreadCount > 0 
                    ? (isDarkMode ? 'text-blue-400 font-medium' : 'text-blue-600 font-medium')
                    : (isDarkMode ? 'text-neutral-400' : 'text-neutral-500')
                }`}>
                  {thread.timeLabel}
                </span>

                {thread.unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#1a73e8] text-white text-[11px] font-semibold flex items-center justify-center shadow-sm">
                    {thread.unreadCount}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 🚀 Floating Action Buttons (Right-aligned matching Android Google Messages) */}
      <div className="fixed bottom-12 right-4 flex flex-col items-end space-y-3 z-40">
        {/* Gemini AI Sparkle Button */}
        <button
          onClick={() => setShowGeminiModal(true)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border transition-transform active:scale-95 ${
            isDarkMode 
              ? 'bg-[#2b2d31] hover:bg-[#34373d] text-[#8ab4f8] border-neutral-700/60' 
              : 'bg-white hover:bg-neutral-100 text-[#1a73e8] border-neutral-200 shadow-md'
          }`}
          title="Gemini Message Assistant"
        >
          <Sparkles className="w-5 h-5 fill-current" />
        </button>

        {/* Start Chat Pill Button */}
        <button
          onClick={() => setShowStartChatModal(true)}
          className="h-13 px-5 rounded-full bg-[#1b72e8] hover:bg-[#1a68d1] text-white flex items-center space-x-2.5 shadow-xl transition-transform active:scale-95 font-medium text-[15px]"
        >
          <MessageSquare className="w-5 h-5 fill-white" />
          <span>Start chat</span>
        </button>
      </div>



      {/* 👤 Google Account Profile Modal (Clicked on Avatar "L") */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div 
            className="fixed inset-0" 
            onClick={() => setShowProfileModal(false)}
          />

          <div className={`relative w-full max-w-sm rounded-3xl p-6 shadow-2xl z-10 border ${
            isDarkMode ? 'bg-[#1e1f22] border-neutral-800 text-neutral-200' : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-neutral-700/40">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold tracking-wide text-neutral-400">Google Account</span>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="p-1 rounded-full hover:bg-neutral-800/50 text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Google Account Info + Switcher Toggle */}
            <div className="py-4">
              <div className="flex items-center space-x-3.5">
                <div
                  className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                  style={{
                    backgroundColor: googleProfile.avatarColor,
                    borderColor: googleProfile.ringColor,
                  }}
                >
                  {googleProfile.initial}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-base text-current truncate">{googleProfile.fullName}</h3>
                  <p className="text-xs text-neutral-400 truncate">{googleProfile.email}</p>
                  <p className="text-[11px] text-neutral-500 font-mono truncate mt-0.5">
                    {maskAccountNumber(googleProfile.accountNumber)}
                  </p>
                </div>
                {onSelectAccount && otherAccounts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAccountList((prev) => !prev)}
                    className={`p-1.5 rounded-full border transition-colors ${
                      isDarkMode
                        ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                        : 'border-neutral-300 hover:bg-neutral-100 text-neutral-600'
                    }`}
                    title="Switch Google Account"
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-150 ${
                        showAccountList ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                )}
              </div>

              {onSelectAccount && showAccountList && otherAccounts.length > 0 && (
                <div
                  className={`mt-3 pt-2.5 border-t max-h-44 overflow-y-auto space-y-1 ${
                    isDarkMode ? 'border-neutral-800' : 'border-neutral-200'
                  }`}
                >
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400 px-1 mb-1">
                    Switch Google Account
                  </p>
                  {accounts.map((acc) => {
                    const prof = GoogleMessagesService.buildGoogleAccountProfile(acc);
                    const isActive = prof.accountNumber === googleProfile.accountNumber;
                    return (
                      <button
                        key={acc.accountNumber}
                        type="button"
                        onClick={() => {
                          onSelectAccount(acc.accountNumber);
                          setShowAccountList(false);
                          setShowProfileModal(false);
                        }}
                        className={`w-full px-2.5 py-2 rounded-xl flex items-center space-x-2.5 text-left transition-colors ${
                          isActive
                            ? isDarkMode
                              ? 'bg-blue-500/15 text-white'
                              : 'bg-blue-50 text-neutral-900'
                            : isDarkMode
                              ? 'hover:bg-neutral-800/80 text-neutral-200'
                              : 'hover:bg-neutral-100 text-neutral-800'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0"
                          style={{ backgroundColor: prof.avatarColor }}
                        >
                          {prof.initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">{prof.fullName}</p>
                          <p className="text-[11px] text-neutral-400 truncate">{prof.email}</p>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={onToggleTheme}
                className={`w-full p-3 rounded-xl flex items-center justify-between text-sm font-medium transition-colors ${
                  isDarkMode ? 'bg-neutral-800/70 hover:bg-neutral-800 text-neutral-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                }`}
              >
                <span className="flex items-center space-x-2.5">
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                  <span>{isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}</span>
                </span>
                <span className="text-xs text-neutral-400 uppercase">{isDarkMode ? 'Dark' : 'Light'}</span>
              </button>

              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setShowPhoneSettingsModal(true);
                }}
                className={`w-full p-3 rounded-xl flex items-center justify-between text-sm font-medium transition-colors ${
                  isDarkMode ? 'bg-neutral-800/70 hover:bg-neutral-800 text-neutral-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                }`}
              >
                <span className="flex items-center space-x-2.5">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>Phone Model &amp; Status Bar Settings</span>
                </span>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </button>

              <button
                id="btn-google-messages-push-settings"
                onClick={() => {
                  setShowProfileModal(false);
                  setShowPushSettingsModal(true);
                }}
                className={`w-full p-3 rounded-xl flex items-center justify-between text-sm font-medium transition-colors ${
                  isDarkMode ? 'bg-neutral-800/70 hover:bg-neutral-800 text-neutral-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                }`}
              >
                <span className="flex items-center space-x-2.5">
                  <BellRing className="w-4 h-4 text-emerald-400" />
                  <span>Push Notifications (Lock Screen)</span>
                </span>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </button>



              <button
                onClick={() => {
                  threads.forEach(t => GoogleMessagesService.markThreadRead(t.id));
                  onRefresh();
                  setShowProfileModal(false);
                }}
                className={`w-full p-3 rounded-xl flex items-center justify-between text-sm font-medium transition-colors ${
                  isDarkMode ? 'bg-neutral-800/70 hover:bg-neutral-800 text-neutral-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                }`}
              >
                <span className="flex items-center space-x-2.5">
                  <CheckCheck className="w-4 h-4 text-blue-400" />
                  <span>Mark all messages as read</span>
                </span>
              </button>
            </div>

            <div className="pt-4 mt-3 border-t border-neutral-700/40 text-center">
              <p className="text-[11px] text-neutral-500">Google Messages 2026.09-release</p>
            </div>
          </div>
        </div>
      )}

      {/* 💬 Start Chat Modal */}
      {showStartChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div 
            className="fixed inset-0" 
            onClick={() => setShowStartChatModal(false)}
          />

          <div className={`relative w-full max-w-md rounded-3xl p-6 shadow-2xl z-10 border ${
            isDarkMode ? 'bg-[#1e1f22] border-neutral-800 text-neutral-200' : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-700/40">
              <h3 className="font-semibold text-lg">Start new conversation</h3>
              <button 
                onClick={() => setShowStartChatModal(false)}
                className="p-1 rounded-full hover:bg-neutral-800 text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChat} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Recipient (Name, shortcode or Phone)
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. 889, CBE, 127 or +251..."
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none ${
                    isDarkMode 
                      ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500 focus:border-blue-500' 
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-blue-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Initial Message
                </label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none resize-none ${
                    isDarkMode 
                      ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500 focus:border-blue-500' 
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-blue-500'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStartChatModal(false)}
                  className="px-4 py-2 text-sm text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#1b72e8] hover:bg-[#1a68d1] text-white text-sm font-medium flex items-center space-x-1.5 shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✨ Gemini Assistant Modal */}
      {showGeminiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div 
            className="fixed inset-0" 
            onClick={() => setShowGeminiModal(false)}
          />

          <div className={`relative w-full max-w-md rounded-3xl p-6 shadow-2xl z-10 border ${
            isDarkMode ? 'bg-[#1e1f22] border-neutral-800 text-neutral-200' : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-700/40">
              <div className="flex items-center space-x-2 text-[#8ab4f8]">
                <Sparkles className="w-5 h-5 fill-current" />
                <h3 className="font-semibold text-lg text-current">Gemini Smart Assistant</h3>
              </div>
              <button 
                onClick={() => setShowGeminiModal(false)}
                className="p-1 rounded-full hover:bg-neutral-800 text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-xs text-neutral-400">
                Ask Gemini to draft an SMS, translate a bank alert (Amharic/English), or compose a response.
              </p>

              <div>
                <input 
                  type="text"
                  placeholder="e.g. Inquire about CBE transfer, buy airtime..."
                  value={geminiPrompt}
                  onChange={(e) => setGeminiPrompt(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none ${
                    isDarkMode 
                      ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500 focus:border-blue-500' 
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-blue-500'
                  }`}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleGeminiDraft}
                  className="px-4 py-2 rounded-full bg-[#1b72e8] text-white text-xs font-semibold hover:bg-[#1a68d1] flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Draft</span>
                </button>
              </div>

              {geminiSuggestion && (
                <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  isDarkMode ? 'bg-neutral-900/80 border-neutral-700 text-neutral-200' : 'bg-neutral-100 border-neutral-200 text-neutral-800'
                }`}>
                  <p className="font-semibold text-[#8ab4f8] mb-1">Generated Draft:</p>
                  <p>{geminiSuggestion}</p>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => {
                        setNewMessage(geminiSuggestion);
                        setShowGeminiModal(false);
                        setShowStartChatModal(true);
                      }}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
                    >
                      Use in new chat
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Phone Type & Status Bar Settings Modal */}
      <PhoneSettingsModal 
        isOpen={showPhoneSettingsModal} 
        onClose={() => setShowPhoneSettingsModal(false)} 
      />

      {/* SMS Simulator Push Notifications Modal */}
      <SubAppPushModal
        isOpen={showPushSettingsModal}
        onClose={() => setShowPushSettingsModal(false)}
        subAppId="sms"
        isDarkMode={isDarkMode}
      />

    </div>
  );
}

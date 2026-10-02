import React, { useState } from 'react';
import { 
  Search, 
  SquarePen, 
  ChevronRight, 
  Mic, 
  User, 
  SlidersHorizontal, 
  X,
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import { MessageThread } from '../types/messages';
import AppleProfileSettingsModal from './AppleProfileSettingsModal';
import { PhoneSettingsService } from '../services/phoneSettingsService';

interface AppleMessagesInboxProps {
  threads: MessageThread[];
  onSelectThread: (thread: MessageThread) => void;
  onOpenCbeThread: () => void;
  onBackToApp: () => void;
  isDarkMode?: boolean;
}

export const AppleMessagesInbox: React.FC<AppleMessagesInboxProps> = ({
  threads,
  onSelectThread,
  onOpenCbeThread,
  onBackToApp,
  isDarkMode = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const phoneSettings = PhoneSettingsService.getSettings();

  const filteredThreads = threads.filter(t => 
    t.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.snippet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full min-h-[100dvh] flex flex-col font-sans select-none bg-black text-white relative">
      {/* 1. iOS Top Status Bar (Matching IMG_0091.png with Green Call Pill & Signal/Battery) */}
      <div className="pt-2 px-6 pb-1 flex items-center justify-between text-white text-xs select-none z-20">
        {/* Left: Green call active pill with time */}
        <div className="bg-[#34c759] text-white px-2.5 py-0.5 rounded-full font-bold text-[13px] tracking-tight shadow-xs flex items-center">
          {phoneSettings.timeString || '10:56'}
        </div>

        {/* Right: LTE, 4 Signal Bars, Battery 53 */}
        <div className="flex items-center gap-1.5 text-white">
          {/* Signal Bars */}
          <div className="flex items-end gap-[1.5px] h-3">
            <div className="w-[3px] h-1.5 bg-white rounded-[0.5px]" />
            <div className="w-[3px] h-2 bg-white rounded-[0.5px]" />
            <div className="w-[3px] h-2.5 bg-white rounded-[0.5px]" />
            <div className="w-[3px] h-3 bg-white rounded-[0.5px]" />
          </div>

          <span className="text-[11px] font-semibold tracking-tight ml-0.5">LTE</span>

          {/* iOS Battery with Number 53 */}
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

      {/* 2. Top Navigation Bar (Edit pill button on left, Filter icon button with unread count on right) */}
      <div className="px-4 pt-2 pb-1 flex items-center justify-between">
        {/* Left: Edit button in dark pill - Opens Profile & Settings */}
        <button
          type="button"
          onClick={() => setShowSettingsModal(true)}
          className="bg-[#2c2c2e] hover:bg-[#3a3a3c] active:scale-95 text-white text-[15px] font-medium px-4 py-1.5 rounded-full transition-transform cursor-pointer"
          title="Edit and Settings"
        >
          Edit
        </button>

        {/* Right: Filter Button in dark circle with blue badge 1 - Opens Profile & Settings */}
        <button
          type="button"
          onClick={() => setShowSettingsModal(true)}
          className="w-10 h-10 bg-[#2c2c2e] hover:bg-[#3a3a3c] active:scale-95 rounded-full flex items-center justify-center text-white relative transition-transform cursor-pointer shadow-sm"
          title="Filter and Settings"
        >
          {/* 3 Horizontal Lines Filter Icon */}
          <div className="flex flex-col gap-[3px] items-center justify-center w-4">
            <div className="w-4 h-[2px] bg-white rounded-full" />
            <div className="w-3 h-[2px] bg-white rounded-full" />
            <div className="w-2 h-[2px] bg-white rounded-full" />
          </div>

          {/* Unread Badge 1 */}
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#007aff] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-black">
            1
          </span>
        </button>
      </div>

      {/* 3. Large Title & Syncing Status */}
      <div className="px-4 pt-1 pb-2">
        <h1 className="text-[34px] font-bold tracking-tight text-white leading-none">
          Messages
        </h1>
        <p className="text-[13px] text-[#8e8e93] font-normal mt-1">
          Syncing with iCloud Paused
        </p>
      </div>

      {/* 4. Messages Thread List */}
      <div className="flex-1 overflow-y-auto px-4 divide-y divide-[#2c2c2e] pb-24">
        {filteredThreads.map((thread) => {
          const isCbe = thread.isCbe || thread.id === 'cbe' || thread.sender === 'CBE';
          const isUnread = (thread.unreadCount ?? 0) > 0;

          return (
            <div
              key={thread.id}
              onClick={() => {
                if (isCbe) {
                  onOpenCbeThread();
                } else {
                  onSelectThread(thread);
                }
              }}
              className="py-3 flex items-start gap-3 cursor-pointer active:bg-neutral-900/60 transition-colors"
            >
              {/* Blue Unread Dot on the Left */}
              <div className="w-3 pt-4.5 flex justify-center shrink-0">
                {isUnread && (
                  <div className="w-2.5 h-2.5 bg-[#007aff] rounded-full" />
                )}
              </div>

              {/* Circular Avatar (Matching Screenshot: #545458 with white User silhouette) */}
              <div className="w-12 h-12 bg-[#545458] rounded-full flex items-center justify-center text-white shrink-0 shadow-sm">
                <User className="w-6 h-6 text-white stroke-[2.2]" />
              </div>

              {/* Thread Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-[16px] text-white truncate">
                      {isCbe ? 'Commercial Bank of Ethiopia' : thread.sender}
                    </span>
                    {/* Unknown Sender Badge (as seen in IMG_0091.png on MPESA Info) */}
                    {thread.tag && (
                      <span className="bg-[#1c1c1e] text-[#8e8e93] text-[10px] font-medium px-2 py-0.5 rounded border border-[#2c2c2e] shrink-0">
                        {thread.tag}
                      </span>
                    )}
                  </div>

                  {/* Time + Chevron > */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <span className="text-[13px] text-[#8e8e93]">
                      {thread.timeLabel || '9:30 AM'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#8e8e93]/60" />
                  </div>
                </div>

                {/* Snippet Text */}
                <p className="text-[14px] text-[#8e8e93] line-clamp-2 leading-[1.35] tracking-tight">
                  {thread.snippet}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Fixed Bottom Navigation Bar (Pill Search Bar + Compose Circle Button) */}
      <div className="fixed bottom-0 inset-x-0 bg-black/90 backdrop-blur-xl px-4 pt-2.5 pb-safe z-30 flex items-center justify-between gap-3 border-t border-white/5">
        {/* Search Pill */}
        <div className="flex-1 bg-[#1c1c1e] border border-[#2c2c2e]/60 rounded-full px-4 py-2 flex items-center gap-2.5 transition-colors">
          <Search className="w-4 h-4 text-[#8e8e93] shrink-0" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-[15px] text-white placeholder:text-[#8e8e93] outline-none flex-1 min-w-0"
          />
          {searchQuery ? (
            <button onClick={() => setSearchQuery('')} className="text-[#8e8e93] hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Mic className="w-4 h-4 text-[#8e8e93] shrink-0" />
          )}
        </div>

        {/* Compose Button (Square with pencil icon inside dark circular button) */}
        <button
          type="button"
          onClick={onOpenCbeThread}
          className="w-11 h-11 bg-[#2c2c2e] hover:bg-[#3a3a3c] active:scale-95 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg transition-transform cursor-pointer"
          title="Compose New Message"
        >
          <SquarePen className="w-5 h-5 text-white stroke-[2.2]" />
        </button>
      </div>

      {/* Profile & Settings Modal */}
      <AppleProfileSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        senderName="Leykun Jemaneh Ylma"
        senderSubtitle="Messages &amp; Phone Preferences"
        onBackToApp={onBackToApp}
      />
    </div>
  );
};

export default AppleMessagesInbox;

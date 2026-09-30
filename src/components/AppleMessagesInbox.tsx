import React, { useState } from 'react';
import { 
  Search, 
  SquarePen, 
  ChevronLeft, 
  Mic, 
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  X
} from 'lucide-react';
import { MessageThread } from '../types/messages';
import { GoogleMessagesService } from '../services/googleMessagesData';

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
  const [isEditing, setIsEditing] = useState(false);

  const filteredThreads = threads.filter(t => 
    t.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.snippet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const bgClass = isDarkMode ? 'bg-black text-white' : 'bg-white text-black';
  const headerBg = isDarkMode ? 'bg-black/90' : 'bg-white/90';
  const subtextClass = isDarkMode ? 'text-[#8E8E93]' : 'text-[#8E8E93]';
  const searchBg = isDarkMode ? 'bg-[#1C1C1E] text-white' : 'bg-[#E5E5EA] text-black';
  const separatorClass = isDarkMode ? 'border-[#38383A]' : 'border-[#E5E5EA]';

  return (
    <div className={`min-h-full flex flex-col font-sans select-none ${bgClass} pb-safe`}>
      {/* iOS Top Navigation Bar with Back to CBE */}
      <header className={`sticky top-0 z-30 px-4 pt-[max(env(safe-area-inset-top,0px),10px)] pb-2 backdrop-blur-xl ${headerBg} border-b ${separatorClass}`}>
        <div className="flex items-center justify-between h-11">
          {/* Left: Back to CBE button in Apple style */}
          <button
            type="button"
            onClick={onBackToApp}
            className="text-[#007AFF] hover:opacity-80 active:opacity-60 text-[17px] font-normal flex items-center gap-0.5 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 -ml-1.5 stroke-[2.5]" />
            <span>CBE</span>
          </button>

          {/* Right: Edit & Compose in Apple blue */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="text-[#007AFF] hover:opacity-80 text-[17px] font-normal cursor-pointer"
            >
              {isEditing ? 'Done' : 'Edit'}
            </button>
            <button
              type="button"
              onClick={onOpenCbeThread}
              className="text-[#007AFF] hover:opacity-80 p-1 cursor-pointer"
              title="New Message"
            >
              <SquarePen className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Large Title: Messages */}
        <div className="pt-1 pb-2">
          <h1 className="text-[34px] font-bold tracking-tight leading-none">
            Messages
          </h1>
        </div>

        {/* iOS Rounded Search Bar */}
        <div className="pt-1 pb-1">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${searchBg} transition-colors`}>
            <Search className="w-4 h-4 text-[#8E8E93]" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-[15px] outline-none flex-1 placeholder:text-[#8E8E93]"
            />
            {searchQuery ? (
              <button onClick={() => setSearchQuery('')} className="text-[#8E8E93] hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Mic className="w-4 h-4 text-[#8E8E93]" />
            )}
          </div>
        </div>
      </header>

      {/* Messages List (Apple Messages Table View) */}
      <div className="flex-1 overflow-y-auto px-4 divide-y divide-[#38383A]/60">
        {filteredThreads.map((thread) => {
          const isCbe = thread.isCbe || thread.id === 'cbe' || thread.sender === 'CBE';
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
              className="py-3 flex items-center gap-3.5 cursor-pointer active:bg-neutral-800/40 transition-colors group"
            >
              {/* Apple Avatar Bubble */}
              <div className="relative shrink-0">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-sm"
                  style={{ backgroundColor: isCbe ? '#70189F' : thread.avatarColor || '#007AFF' }}
                >
                  {isCbe ? 'CBE' : (thread.avatarLetter || thread.sender.charAt(0).toUpperCase())}
                </div>
                {thread.unreadCount > 0 && (
                  <div className="absolute -top-0.5 -left-0.5 w-3 h-3 bg-[#007AFF] rounded-full ring-2 ring-black" />
                )}
              </div>

              {/* Thread Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-[16px] truncate text-white">
                      {thread.sender}
                    </span>
                    {isCbe && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#007AFF] shrink-0 fill-[#007AFF] text-black" />
                    )}
                  </div>
                  <span className={`text-[13px] ${subtextClass} shrink-0`}>
                    {thread.timeLabel || '9:41 AM'}
                  </span>
                </div>

                <p className={`text-[14px] ${subtextClass} line-clamp-2 leading-snug`}>
                  {thread.snippet}
                </p>
              </div>

              <ChevronRight className="w-4 h-4 text-[#8E8E93]/60 shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AppleMessagesInbox;

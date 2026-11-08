import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Phone, 
  Search,
  MoreVertical, 
  Smile, 
  Paperclip, 
  Mic, 
  Send, 
  Check, 
  Copy, 
  Trash2, 
  Edit3, 
  CornerUpLeft, 
  Share2, 
  Download, 
  X, 
  ZoomIn,
  Signal,
  Wifi,
  Sparkles,
  Users,
  Receipt,
  RotateCw,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Eye
} from 'lucide-react';
import { 
  TelegramChat, 
  TelegramMessage, 
  TelegramReadStatus,
  TelegramImageItem,
  TelegramSender
} from '../../types/telegram';
import { getTelegramDoodleWallpaperSvg } from '../../utils/telegramWallpaper';
import { getLeulSegedAvatarDataUrl, getGOMAvatarDataUrl } from '../../utils/telegramReceiptGenerator';
import TelegramProfileEditModal from './TelegramProfileEditModal';
import TelegramAccountsModal from './TelegramAccountsModal';
import TelegramBankTransactionsModal from './TelegramBankTransactionsModal';
import TelegramSimulateChatModal from './TelegramSimulateChatModal';
import { TelegramSimulatorService } from '../../services/telegramSimulatorService';
import { Transaction } from '../../types';

interface TelegramChatPreviewProps {
  chat: TelegramChat;
  allChats?: TelegramChat[];
  onBack?: () => void;
  onEditMessage?: (msg: TelegramMessage) => void;
  onDeleteMessage?: (msgId: string) => void;
  onDuplicateMessage?: (msgId: string) => void;
  onToggleSender?: (msgId: string) => void;
  onUpdateProfile?: (updates: any) => void;
  onSelectAccount?: (chatId: string) => void;
  onCreateAccount?: (data: any) => void;
  onSimulateBankTransaction?: (tx: Partial<Transaction>) => void;
  onSimulateTwoAccountChat?: (config: {
    receiverName: string;
    receiverAccount: string;
    receiverAvatarUrl?: string;
    amount: number;
    referenceNo?: string;
    viewPerspective: 'gom' | 'receiver';
  }) => void;
  onTogglePerspective?: (perspective: 'gom' | 'receiver') => void;
  onLoadDemoChat?: (type: 'full_sep15' | 'receipt_only') => void;
  onOpenSettings?: () => void;
  onOpenEditor?: () => void;
  onOpenExport?: () => void;
  onOpenTelebirr?: () => void;
  onOpenCbe?: () => void;
  onOpenDashen?: () => void;
  onResetDefault?: () => void;
  isScreenshotMode?: boolean;
  onToggleScreenshotMode?: () => void;
}

export default function TelegramChatPreview({
  chat,
  allChats = [],
  onBack,
  onEditMessage,
  onDeleteMessage,
  onDuplicateMessage,
  onToggleSender,
  onUpdateProfile,
  onSelectAccount,
  onCreateAccount,
  onSimulateBankTransaction,
  onSimulateTwoAccountChat,
  onTogglePerspective,
  onLoadDemoChat,
  onOpenSettings,
  onOpenEditor,
  onOpenExport,
  onOpenTelebirr,
  onOpenCbe,
  onOpenDashen,
  onResetDefault,
  isScreenshotMode = false,
  onToggleScreenshotMode,
}: TelegramChatPreviewProps) {
  // Perspective calculations:
  // 'gom': viewer is GOM, sees Receiver in header, GOM messages on right, receiver on left
  // 'receiver': viewer is Receiver, sees GOM in header, receiver messages on right, GOM on left
  const perspective = chat.viewPerspective || 'gom';
  const isViewReceiver = perspective === 'receiver';

  // Dynamic header profile based on current view perspective
  const headerDisplayName = isViewReceiver 
    ? (chat.gomProfile?.contactName || 'GOM Customer Service')
    : (chat.receiverProfile?.contactName || chat.contactName);

  const headerAvatarUrl = isViewReceiver
    ? (chat.gomProfile?.avatarUrl || getGOMAvatarDataUrl())
    : (chat.receiverProfile?.avatarUrl || chat.avatarUrl || getLeulSegedAvatarDataUrl());

  const headerStatus = isViewReceiver
    ? (chat.gomProfile?.status || 'last seen recently')
    : (chat.receiverProfile?.status || chat.status || 'last seen recently');

  // Active role for typing: 'right' = Sender (Me), 'left' = Receiver (Contact)
  const [activeTypingRole, setActiveTypingRole] = useState<TelegramSender>('right');
  
  // Modals state
  const [isThreeDotMenuOpen, setIsThreeDotMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [isBankTxModalOpen, setIsBankTxModalOpen] = useState(false);
  const [isSimulateChatModalOpen, setIsSimulateChatModalOpen] = useState(false);

  // Context menu on message click
  const [activeContextMenuMsg, setActiveContextMenuMsg] = useState<TelegramMessage | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  // Lightbox for image preview
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<TelegramImageItem | null>(null);

  // Inline message editing
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editMsgText, setEditMsgText] = useState<string>('');

  // Composer state
  const [inputText, setInputText] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 2200);
  };

  // Close 3-dot dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsThreeDotMenuOpen(false);
      }
    };
    if (isThreeDotMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isThreeDotMenuOpen]);

  // Handle message action
  const handleMessageAction = (action: 'copy' | 'edit' | 'delete' | 'toggle_role' | 'reaction', msg: TelegramMessage) => {
    setActiveContextMenuMsg(null);
    setContextMenuPos(null);

    if (action === 'copy') {
      const textToCopy = msg.text || (msg.images && msg.images[0]?.caption) || 'Simulated message';
      navigator.clipboard.writeText(textToCopy);
      showToast('Text copied');
    } else if (action === 'toggle_role') {
      if (onToggleSender) {
        onToggleSender(msg.id);
        showToast(`Flipped to ${msg.sender === 'right' ? 'Receiver' : 'Sender'}`);
      }
    } else if (action === 'edit') {
      setEditingMsgId(msg.id);
      setEditMsgText(msg.text || '');
    } else if (action === 'delete') {
      if (onDeleteMessage) {
        onDeleteMessage(msg.id);
        showToast('Message deleted');
      }
    } else if (action === 'reaction') {
      const newReaction = msg.reaction ? undefined : '🤝 🌐 GOM';
      msg.reaction = newReaction;
      showToast(newReaction ? 'Reaction added: 🤝 🌐 GOM' : 'Reaction removed');
    }
  };

  const handleMessageClick = (e: React.MouseEvent, msg: TelegramMessage) => {
    e.stopPropagation();
    if (msg.type === 'date' || msg.type === 'system') return;
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenuPos({
      x: Math.min(rect.left + 20, window.innerWidth - 200),
      y: Math.min(rect.top + 30, window.innerHeight - 250),
    });
    setActiveContextMenuMsg(msg);
  };

  // Send message
  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const timeString = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const newMsg: TelegramMessage = {
      id: `msg-${Date.now()}`,
      sender: activeTypingRole,
      type: 'text',
      text: inputText.trim(),
      timestamp: timeString,
      status: activeTypingRole === 'right' ? 'read' : undefined,
    };

    chat.messages.push(newMsg);
    setInputText('');
    showToast(`Sent as ${activeTypingRole === 'right' ? 'Sender (Me)' : `Receiver (${chat.contactName})`}`);
    
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const renderReadTick = (status?: TelegramReadStatus) => {
    if (!status) return null;
    return (
      <div className="flex -space-x-1.5 items-center inline-flex">
        <Check className="w-3.5 h-3.5 text-[#4fae4e] stroke-[3]" />
        <Check className="w-3.5 h-3.5 text-[#4fae4e] stroke-[3]" />
      </div>
    );
  };

  // Reaction sticker / badge content renderer matching Screenshot_20260915-151140.png
  const renderReactionBadgeContent = (reactionText?: string) => {
    if (!reactionText) return null;
    const isGom = reactionText.includes('GOM') || reactionText.includes('🌐') || reactionText.includes('🤝');
    return (
      <span className="flex items-center gap-1.5 inline-flex">
        <span className="text-xs">🤝</span>
        {isGom && (
          <img 
            src={chat.gomProfile?.avatarUrl || getGOMAvatarDataUrl()} 
            alt="GOM" 
            className="w-3.5 h-3.5 rounded-full object-cover border border-amber-400 shrink-0" 
            referrerPolicy="no-referrer"
          />
        )}
      </span>
    );
  };

  // Album rendering matching the 2-image screenshot
  const renderAlbumGrid = (images: TelegramImageItem[], msgTimestamp?: string) => {
    if (images.length === 2) {
      return (
        <div className="relative flex gap-1 rounded-xl overflow-hidden max-w-[310px] bg-slate-900/10 p-0.5">
          {images.map((img, idx) => (
            <div 
              key={img.id || idx}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedLightboxImage(img);
              }}
              className="relative w-1/2 aspect-[9/16] bg-slate-800 rounded-lg overflow-hidden cursor-pointer group shadow-inner"
            >
              <img 
                src={img.url} 
                alt={img.caption || 'Transaction receipt'} 
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                <ZoomIn className="w-6 h-6 text-white drop-shadow-md" />
              </div>

              {/* Timestamp & read ticks badge overlay on bottom right of the 2nd image matching Screenshot_20260915-151140.png */}
              {idx === 1 && (
                <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium flex items-center gap-1 shadow-md select-none">
                  <span>{msgTimestamp || '2:33 PM'}</span>
                  <span className="flex items-center text-white">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <Check className="w-3 h-3 stroke-[3] -ml-1.5" />
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Single image rendering (Preserves vertical screenshot ratio for tasks & guides)
    if (images.length === 1) {
      const img = images[0];
      return (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLightboxImage(img);
          }}
          className="relative max-w-[260px] sm:max-w-[280px] rounded-xl overflow-hidden cursor-pointer group shadow-xs border border-black/5 bg-slate-100"
        >
          <img 
            src={img.url} 
            alt={img.caption || 'Screenshot'} 
            className="w-full h-auto object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
            <ZoomIn className="w-6 h-6 text-white drop-shadow-md" />
          </div>
        </div>
      );
    }

    // Fallback for 3+ images
    return (
      <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden max-w-[280px]">
        {images.map((img) => (
          <div 
            key={img.id} 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedLightboxImage(img);
            }}
            className="relative aspect-square cursor-pointer overflow-hidden group"
          >
            <img 
              src={img.url} 
              alt="" 
              className="w-full h-full object-cover group-hover:scale-105 transition"
              referrerPolicy="no-referrer"
            />
          </div>
        ))}
      </div>
    );
  };

  // Doodle wallpaper background URL
  const wallpaperUrl = getTelegramDoodleWallpaperSvg();

  return (
    <div 
      className="relative flex flex-col h-full w-full select-none overflow-hidden font-sans"
      style={{
        backgroundImage: `url("${wallpaperUrl}")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '360px auto',
        backgroundColor: '#7fa673',
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/80 backdrop-blur-md text-white text-xs font-medium shadow-lg animate-in fade-in slide-in-from-top-3 duration-150">
          {toastMessage}
        </div>
      )}

      {/* TOP FLOATING OVERLAY: Status Bar + Header Pills + Bio Card (Transparent background so messages scroll smoothly behind) */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none flex flex-col">
        {/* 1. Android Top System Status Bar (Exact replica of Screenshot_20260915-151140.png) */}
        {chat.settings.showAndroidStatusBar && (
          <div className="w-full px-4 pt-1.5 pb-0.5 flex items-center justify-between text-white drop-shadow-xs text-[11.5px] font-semibold shrink-0 select-none pointer-events-auto">
            <div className="flex items-center gap-1.5">
              <span>3:11</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Headset icon */}
              <span className="text-[11px]">🎧</span>
              {/* Silent bell */}
              <span className="text-[11px]">🔕</span>
              {/* Speed indicator */}
              <span className="text-[10px] font-normal tracking-tight">37.3 KB/s</span>
              {/* Network labels */}
              <span className="text-[9px] font-bold tracking-tight">3G</span>
              <span className="text-[9px] font-bold tracking-tight">4G</span>
              {/* Signal bars */}
              <Signal className="w-3.5 h-3.5 fill-white stroke-[1.5]" />
              {/* Battery Pill with 97 inside */}
              <div className="flex items-center justify-center border border-white/90 rounded-sm px-1 py-0.2 text-[9px] font-bold leading-none min-w-[20px] text-white">
                97
              </div>
            </div>
          </div>
        )}

        {/* 2. Floating Pill Header (Exact structure matching Screenshot_20260915-145508.png) */}
        <header className={`px-3 ${chat.settings.showAndroidStatusBar ? 'pt-1' : 'pt-[max(env(safe-area-inset-top,0px),8px)]'} pb-1 flex items-center justify-between shrink-0 pointer-events-auto`}>
          {/* Left Circular Back Button */}
          <button
            onClick={onBack}
            className="w-11 h-11 rounded-full bg-white/95 text-slate-800 shadow-xs border border-slate-200/60 flex items-center justify-center hover:bg-white active:scale-95 transition cursor-pointer shrink-0"
            title="Back to Apps"
          >
            <ArrowLeft className="w-5 h-5 text-slate-800 stroke-[2.5]" />
          </button>

          {/* Center Floating Contact Pill */}
          <div 
            onClick={() => setIsProfileModalOpen(true)}
            className="flex-1 mx-2 h-11 px-2.5 rounded-2xl bg-white/95 text-slate-800 shadow-xs border border-slate-200/60 flex items-center gap-2.5 overflow-hidden hover:bg-white active:scale-[0.99] transition cursor-pointer"
            title="Click to Edit Profile"
          >
          {/* Circular Avatar */}
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-200 shadow-xs">
            {headerAvatarUrl ? (
              <img 
                src={headerAvatarUrl} 
                alt="" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                {headerDisplayName.charAt(0)}
              </div>
            )}
          </div>

          {/* Contact Details */}
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-bold text-slate-900 truncate leading-tight">
              {headerDisplayName}
            </h2>
            <p className="text-[11px] text-slate-500 truncate leading-tight">
              {chat.status === 'custom' ? (chat.customStatusText || 'online') : headerStatus}
            </p>
          </div>
        </div>

        {/* Right Floating Actions Pill (Call/Search + 3-Dot Menu) */}
        <div 
          ref={menuRef}
          className="relative h-11 px-1.5 rounded-2xl bg-white/95 text-slate-800 shadow-xs border border-slate-200/60 flex items-center gap-0.5 shrink-0"
        >
          {isViewReceiver ? (
            <button 
              onClick={() => showToast('Search messages...')}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 active:scale-95 transition cursor-pointer text-slate-800"
              title="Search"
            >
              <Search className="w-4 h-4 stroke-[2.2]" />
            </button>
          ) : (
            <button 
              onClick={() => showToast('Simulated phone call ringing...')}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 active:scale-95 transition cursor-pointer text-slate-800"
              title="Voice Call"
            >
              <Phone className="w-4 h-4 stroke-[2.2]" />
            </button>
          )}

          <button 
            onClick={() => setIsThreeDotMenuOpen(!isThreeDotMenuOpen)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 active:scale-95 transition cursor-pointer text-slate-800"
            title="3-Dot Menu (All Settings Inside)"
          >
            <MoreVertical className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* THE CONSOLIDATED 3-DOT POPUP MENU (All settings inside 3 Dot as requested) */}
          {isThreeDotMenuOpen && (
            <div className="absolute right-0 top-12 w-76 max-h-[80vh] overflow-y-auto bg-white dark:bg-[#17212b] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100">
              
              {/* SECTION 1: WHICH ACCOUNT IS SEEN (Perspective Switcher) */}
              <div className="px-3 py-1.5 mb-1 bg-slate-50 dark:bg-[#0e1621] border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-500" />
                <span>Which Account is Seen?</span>
              </div>

              {/* View as Receiver (matches screenshot) */}
              <button
                onClick={() => {
                  setIsThreeDotMenuOpen(false);
                  if (onTogglePerspective) {
                    onTogglePerspective('receiver');
                    showToast('Viewing as Receiver (Customer)');
                  }
                }}
                className={`w-full px-4 py-2 flex items-center justify-between text-left text-xs transition cursor-pointer ${
                  isViewReceiver 
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-bold' 
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div>
                  <span className="block font-semibold">👁️ View as Customer (Receiver)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Header: GOM Customer Service (Bio visible)</span>
                </div>
                {isViewReceiver && <Check className="w-4 h-4 stroke-[3] text-blue-600" />}
              </button>

              {/* View as GOM */}
              <button
                onClick={() => {
                  setIsThreeDotMenuOpen(false);
                  if (onTogglePerspective) {
                    onTogglePerspective('gom');
                    showToast('Viewing as GOM Customer Service');
                  }
                }}
                className={`w-full px-4 py-2 flex items-center justify-between text-left text-xs transition cursor-pointer ${
                  !isViewReceiver 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold' 
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div>
                  <span className="block font-semibold">👁️ View as GOM Customer Service</span>
                  <span className="text-[10px] text-slate-400 font-normal">Header: {chat.receiverProfile?.contactName || 'Receiver'}</span>
                </div>
                {!isViewReceiver && <Check className="w-4 h-4 stroke-[3] text-emerald-600" />}
              </button>

              <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

              {/* SECTION 2: CONVERSATION PRESETS */}
              <div className="px-3 py-1.5 mb-1 bg-slate-50 dark:bg-[#0e1621] border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Conversation Presets</span>
              </div>

              <button
                onClick={() => {
                  setIsThreeDotMenuOpen(false);
                  if (onLoadDemoChat) {
                    onLoadDemoChat('full_sep15');
                  } else {
                    TelegramSimulatorService.loadFullDemoChat(chat.id);
                    window.location.reload();
                  }
                  showToast('Loaded September 15 Full Demo (Orders & Withdrawal)');
                }}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800/70 transition cursor-pointer"
              >
                <span className="text-amber-500 font-bold text-base">⚡</span>
                <div>
                  <span className="font-semibold block leading-tight">September 15 Full Demo Chat</span>
                  <span className="text-[10.5px] text-slate-400">88+ messages, 6 task screenshots &amp; withdrawal flow</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsThreeDotMenuOpen(false);
                  if (onLoadDemoChat) {
                    onLoadDemoChat('receipt_only');
                  } else if (onResetDefault) {
                    onResetDefault();
                  }
                  showToast('Loaded Bank Receipt Screenshot Chat');
                }}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800/70 transition cursor-pointer"
              >
                <Receipt className="w-4 h-4 text-purple-500 shrink-0" />
                <div>
                  <span className="font-semibold block leading-tight">Bank Receipt Screenshot Chat</span>
                  <span className="text-[10.5px] text-slate-400">SMS Alert &amp; Official CBE Web Receipt album</span>
                </div>
              </button>

              <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

              {/* SECTION 3: SENDING AS (Role Switcher) */}
              <div className="px-3 py-1.5 mb-1 bg-slate-50 dark:bg-[#0e1621] border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-500" />
                <span>Composer Typing As</span>
              </div>

              <button
                onClick={() => {
                  setActiveTypingRole('right');
                  setIsThreeDotMenuOpen(false);
                  showToast(`Typing as ${isViewReceiver ? (chat.receiverProfile?.contactName || 'Customer') : 'GOM'}`);
                }}
                className={`w-full px-4 py-2 flex items-center justify-between text-left text-xs transition cursor-pointer ${
                  activeTypingRole === 'right' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>🟢 {isViewReceiver ? (chat.receiverProfile?.contactName || 'Customer (Me)') : 'GOM Customer Service (Me)'}</span>
                {activeTypingRole === 'right' && <Check className="w-4 h-4 stroke-[3] text-emerald-600" />}
              </button>

              <button
                onClick={() => {
                  setActiveTypingRole('left');
                  setIsThreeDotMenuOpen(false);
                  showToast(`Typing as ${isViewReceiver ? 'GOM Customer Service' : (chat.receiverProfile?.contactName || 'Customer')}`);
                }}
                className={`w-full px-4 py-2 flex items-center justify-between text-left text-xs transition cursor-pointer ${
                  activeTypingRole === 'left' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>⚪ {isViewReceiver ? 'GOM Customer Service (Other)' : (chat.receiverProfile?.contactName || 'Customer (Other)')}</span>
                {activeTypingRole === 'left' && <Check className="w-4 h-4 stroke-[3] text-blue-600" />}
              </button>

              <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

              {/* SECTION 4: 2-ACCOUNT CHAT SIMULATOR & PROFILE */}
              <div className="px-3 py-1.5 mb-1 bg-slate-50 dark:bg-[#0e1621] border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-500" />
                <span>Simulate &amp; Manage Accounts</span>
              </div>

              <button
                onClick={() => {
                  setIsThreeDotMenuOpen(false);
                  setIsSimulateChatModalOpen(true);
                }}
                className="w-full px-4 py-2 flex items-center gap-3 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800/70 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <span className="font-semibold block leading-tight">Simulate Chat (2 Accounts)</span>
                  <span className="text-[10px] text-slate-400">Configure GOM + Receiver names &amp; perspective</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsThreeDotMenuOpen(false);
                  setIsProfileModalOpen(true);
                }}
                className="w-full px-4 py-2 flex items-center gap-3 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800/70 transition cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-blue-500 shrink-0" />
                <div>
                  <span className="font-semibold block leading-tight">Edit Profile</span>
                  <span className="text-[10px] text-slate-400">Change name, photo, bio &amp; status</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsThreeDotMenuOpen(false);
                  setIsAccountsModalOpen(true);
                }}
                className="w-full px-4 py-2 flex items-center gap-3 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800/70 transition cursor-pointer"
              >
                <Users className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <span className="font-semibold block leading-tight">Switch Receiver Account</span>
                  <span className="text-[10px] text-slate-400">Select or add recipient</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsThreeDotMenuOpen(false);
                  setIsBankTxModalOpen(true);
                }}
                className="w-full px-4 py-2 flex items-center gap-3 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800/70 transition cursor-pointer"
              >
                <Receipt className="w-4 h-4 text-purple-500 shrink-0" />
                <div>
                  <span className="font-semibold block leading-tight">Bank Transactions</span>
                  <span className="text-[10px] text-slate-400">Browse &amp; insert CBE receipts</span>
                </div>
              </button>

              <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

              {/* SECTION 5: TOOLS, EDITOR & SETTINGS */}
              <div className="px-3 py-1.5 mb-1 bg-slate-50 dark:bg-[#0e1621] border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <span>Tools &amp; Settings</span>
              </div>

              {onOpenEditor && (
                <button
                  onClick={() => {
                    setIsThreeDotMenuOpen(false);
                    onOpenEditor();
                  }}
                  className="w-full px-4 py-2 flex items-center gap-3 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Open Full Message Editor</span>
                </button>
              )}

              {onOpenExport && (
                <button
                  onClick={() => {
                    setIsThreeDotMenuOpen(false);
                    onOpenExport();
                  }}
                  className="w-full px-4 py-2 flex items-center gap-3 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Export Chat (JSON / Screenshot)</span>
                </button>
              )}

              {onOpenSettings && (
                <button
                  onClick={() => {
                    setIsThreeDotMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full px-4 py-2 flex items-center gap-3 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Sliders className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Chat &amp; Display Settings</span>
                </button>
              )}

              {onToggleScreenshotMode && (
                <button
                  onClick={() => {
                    setIsThreeDotMenuOpen(false);
                    onToggleScreenshotMode();
                  }}
                  className="w-full px-4 py-2 flex items-center gap-3 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Toggle Fullscreen / Screenshot Mode</span>
                </button>
              )}

              {/* Linked Banking Apps */}
              {(onOpenTelebirr || onOpenCbe || onOpenDashen) && (
                <>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Other Ethiopian Bank Apps
                  </div>
                  {onOpenTelebirr && (
                    <button
                      onClick={() => {
                        setIsThreeDotMenuOpen(false);
                        onOpenTelebirr();
                      }}
                      className="w-full px-4 py-1.5 flex items-center gap-3 text-left text-xs text-lime-600 dark:text-lime-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <span>📱 Telebirr App</span>
                    </button>
                  )}
                  {onOpenCbe && (
                    <button
                      onClick={() => {
                        setIsThreeDotMenuOpen(false);
                        onOpenCbe();
                      }}
                      className="w-full px-4 py-1.5 flex items-center gap-3 text-left text-xs text-purple-600 dark:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <span>🏦 Commercial Bank of Ethiopia</span>
                    </button>
                  )}
                  {onOpenDashen && (
                    <button
                      onClick={() => {
                        setIsThreeDotMenuOpen(false);
                        onOpenDashen();
                      }}
                      className="w-full px-4 py-1.5 flex items-center gap-3 text-left text-xs text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <span>🏛️ Dashen Bank App</span>
                    </button>
                  )}
                </>
              )}

              <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

              {/* Reset to Reference Chat */}
              {onResetDefault && (
                <button
                  onClick={() => {
                    setIsThreeDotMenuOpen(false);
                    onResetDefault();
                    showToast('Reset to original chat state');
                  }}
                  className="w-full px-4 py-2 flex items-center gap-3 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 shrink-0" />
                  <span>Reset to Original State</span>
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Bio Card (Exact match to Screenshot_20260915-151140.png) */}
      {isViewReceiver && (
        <div className="mx-3 mt-0 mb-1 px-3.5 py-2 bg-white/95 rounded-2xl text-slate-800 text-xs border border-slate-200/60 border-l-[3.5px] border-l-[#38a3e5] shadow-sm shrink-0 pointer-events-auto flex flex-col gap-0.5">
          <div className="text-[11.5px] text-[#38a3e5] font-semibold">Bio</div>
          <div className="text-[12.5px] text-slate-700 font-normal leading-snug">
            {chat.gomProfile?.bioText || "Let's work together through simple tasks for"}
          </div>
        </div>
      )}
      </div>

      {/* 3. Main Message Scroll Area (Underneath floating pills so content scrolls transparently behind them) */}
      <div 
        id="telegram-chat-messages-container"
        className={`absolute inset-0 overflow-y-auto px-3 space-y-2.5 z-10 scrollbar-none ${
          isViewReceiver ? 'pt-[144px]' : 'pt-[88px]'
        } pb-[94px]`}
      >
        {chat.messages.map((msg) => {
          // Date Separator
          if (msg.type === 'date') {
            return (
              <div key={msg.id} className="flex items-center justify-center my-2">
                <span className="px-3.5 py-0.5 rounded-full bg-[#7a9d70]/70 backdrop-blur-xs text-white text-[12px] font-medium shadow-xs">
                  {msg.dateLabel || msg.timestamp || 'September 15'}
                </span>
              </div>
            );
          }

          // DYNAMIC POSITION CALCULATION:
          // Based on which account originated the text (author) and current viewpoint perspective:
          // If viewing as GOM: GOM text is on RIGHT (green), Receiver text is on LEFT (white).
          // If viewing as Receiver: Receiver text is on RIGHT (green), GOM text is on LEFT (white).
          const author = msg.author || (msg.sender === 'right' ? 'gom' : 'receiver');
          const isRight = perspective === 'gom' ? (author === 'gom') : (author === 'receiver');

          // Reaction Sticker pill (e.g. 🤝 🌐 GOM)
          if (msg.reaction && !msg.text && (!msg.images || msg.images.length === 0)) {
            return (
              <div 
                key={msg.id}
                onClick={(e) => handleMessageClick(e, msg)}
                className={`flex items-center my-1 cursor-pointer ${isRight ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`px-2.5 py-1 rounded-2xl ${isRight ? 'bg-[#e2f7cb]' : 'bg-white'} text-slate-900 text-xs font-semibold flex items-center gap-2 shadow-xs border border-black/5`}>
                  {renderReactionBadgeContent(msg.reaction)}
                  <span className="text-[10px] text-slate-500 font-normal ml-0.5">{msg.timestamp}</span>
                  {isRight && chat.settings.showReadTicks && renderReadTick(msg.status || 'read')}
                </div>
              </div>
            );
          }

          // Quote bar color: Green (#4fae4e) when bubble on right, Coral/Red (#e06d6d) when bubble on left (matches Screenshot 2!)
          const quoteColor = isRight ? '#4fae4e' : '#e06d6d';

          return (
            <div 
              key={msg.id}
              className={`flex flex-col ${isRight ? 'items-end' : 'items-start'}`}
            >
              {/* Message Bubble Container */}
              <div 
                onClick={(e) => handleMessageClick(e, msg)}
                className={`relative group max-w-[85%] sm:max-w-[78%] rounded-2xl px-3 py-2 cursor-pointer transition active:scale-[0.99] shadow-sm ${
                  isRight 
                    ? 'bg-[#e2f7cb] text-slate-900 rounded-br-xs' 
                    : 'bg-white text-slate-900 rounded-bl-xs'
                }`}
              >
                {/* 1. Reply Quote Card Header (if present) */}
                {msg.replyQuote && (
                  <div 
                    className="mb-2 p-1.5 rounded-lg flex items-center gap-2"
                    style={{ 
                      borderLeft: `3.5px solid ${quoteColor}`,
                      backgroundColor: isRight ? 'rgba(79, 174, 78, 0.08)' : 'rgba(235, 87, 87, 0.08)' 
                    }}
                  >
                    {msg.replyQuote.thumbnailUrl && (
                      <div className="w-9 h-9 rounded-md overflow-hidden shrink-0 bg-slate-200">
                        <img 
                          src={msg.replyQuote.thumbnailUrl} 
                          alt="thumbnail" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 text-left">
                      <h4 
                        className="text-[12px] font-bold truncate leading-tight"
                        style={{ color: quoteColor }}
                      >
                        {isViewReceiver 
                          ? (chat.receiverProfile?.contactName.split(' ')[0] || 'Leul') 
                          : (msg.replyQuote.senderName || chat.contactName)}
                      </h4>
                      <p className="text-[11px] text-slate-600 truncate leading-tight">
                        {msg.replyQuote.title || 'Album'}
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. Image / Album Content */}
                {msg.images && msg.images.length > 0 && (
                  <div className="mb-1 -mx-1">
                    {renderAlbumGrid(msg.images, msg.timestamp)}
                  </div>
                )}

                {/* 3. Text Body */}
                {msg.text && (
                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words pr-1 text-slate-900 font-normal">
                    {msg.text}
                  </p>
                )}

                {/* 4. Timestamp & Read Status (Hidden on photo album if no text, as badge is on photo) */}
                {!(msg.type === 'album' && !msg.text) && (
                  <div className="flex items-center justify-end gap-1 mt-1 -mb-0.5 ml-auto text-[10.5px] text-slate-500 select-none">
                    {msg.isEdited && (
                      <span className="text-[9.5px] text-slate-400 italic mr-0.5">edited</span>
                    )}
                    <span>{msg.timestamp}</span>
                    {isRight && chat.settings.showReadTicks && renderReadTick(msg.status || 'read')}
                  </div>
                )}

                {/* Attached Reaction Badge */}
                {msg.reaction && (
                  <div className="absolute -bottom-2.5 left-2 px-2 py-0.5 rounded-full bg-white border border-slate-200/90 text-[11px] font-medium shadow-xs flex items-center gap-1 z-10">
                    {renderReactionBadgeContent(msg.reaction)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* BOTTOM FLOATING OVERLAY: Composer + Virtual Nav Bar (Transparent background so messages scroll smoothly behind) */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none flex flex-col">
        {/* 4. Floating Pill Message Composer (Matches Screenshot_20260915-151140.png) */}
        <footer className="px-3 pb-1 pt-1 shrink-0 pointer-events-auto">
          <div className="flex items-center gap-2">
            {/* White Pill Input */}
            <div className="flex-1 h-12 bg-white rounded-full px-3.5 shadow-md border border-slate-200/80 flex items-center gap-2">
              <button 
                onClick={() => showToast('Emoji picker')}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title="Emoji"
              >
                <Smile className="w-5 h-5 stroke-[1.8]" />
              </button>

              <div className="flex-1 flex items-center overflow-hidden">
                <span className="w-0.5 h-4 bg-[#24a1de] animate-pulse mr-0.5 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Message"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  className="w-full bg-transparent border-none text-[15px] text-slate-800 placeholder-slate-400 focus:outline-hidden"
                />
              </div>

              <button 
                onClick={() => showToast('Attach file / media')}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer -rotate-45"
                title="Attach media"
              >
                <Paperclip className="w-5 h-5 stroke-[1.8]" />
              </button>
            </div>

            {/* Blue Circular Send / Voice Action Button */}
            <button
              onClick={handleSendMessage}
              className="w-12 h-12 rounded-full bg-[#24a1de] hover:bg-[#1f93cb] active:scale-95 text-white flex items-center justify-center shadow-md transition cursor-pointer shrink-0"
              title={inputText.trim() ? "Send Message" : "Voice Message"}
            >
              {inputText.trim() ? (
                <Send className="w-5 h-5 stroke-[2.2] ml-0.5" />
              ) : (
                <Mic className="w-5 h-5 stroke-[2.2]" />
              )}
            </button>
          </div>
        </footer>

        {/* Android Soft Virtual Navigation Bar (Recents, Home, Back) */}
        <div className="w-full h-7 flex items-center justify-around text-slate-800/80 shrink-0 select-none pb-1 pointer-events-auto">
          {/* Recents: square */}
          <div className="w-5 h-5 flex items-center justify-center cursor-pointer active:opacity-60">
            <div className="w-3.5 h-3.5 border-2 border-slate-700/80 rounded-xs" />
          </div>
          {/* Home: circle */}
          <div className="w-5 h-5 flex items-center justify-center cursor-pointer active:opacity-60">
            <div className="w-3.5 h-3.5 border-2 border-slate-700/80 rounded-full" />
          </div>
          {/* Back: triangle */}
          <div className="w-5 h-5 flex items-center justify-center cursor-pointer active:opacity-60">
            <div className="w-0 h-0 border-y-[6px] border-y-transparent border-r-[9px] border-r-slate-700/80 mr-0.5" />
          </div>
        </div>
      </div>

      {/* 5. Context Menu on Message Click */}
      {activeContextMenuMsg && contextMenuPos && (
        <div 
          className="fixed z-50 bg-white dark:bg-[#17212b] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Flip Sender / Receiver */}
          <button 
            onClick={() => handleMessageAction('toggle_role', activeContextMenuMsg)}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
            <span>Switch to {activeContextMenuMsg.sender === 'right' ? 'Receiver (Left)' : 'Sender (Right)'}</span>
          </button>

          {/* Add / Toggle Reaction */}
          <button 
            onClick={() => handleMessageAction('reaction', activeContextMenuMsg)}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <span>🤝</span>
            <span>{activeContextMenuMsg.reaction ? 'Remove Reaction' : 'Add 🤝 🌐 GOM Reaction'}</span>
          </button>

          {/* Copy Text */}
          <button 
            onClick={() => handleMessageAction('copy', activeContextMenuMsg)}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Text</span>
          </button>

          {/* Delete Message */}
          <button 
            onClick={() => handleMessageAction('delete', activeContextMenuMsg)}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* 6. Lightbox Full Image Preview */}
      {selectedLightboxImage && (
        <div 
          onClick={() => setSelectedLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <button
              onClick={() => setSelectedLightboxImage(null)}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <img 
            src={selectedLightboxImage.url} 
            alt="Preview" 
            className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
            referrerPolicy="no-referrer"
          />
          {selectedLightboxImage.caption && (
            <p className="mt-3 text-white/90 text-sm font-medium text-center">
              {selectedLightboxImage.caption}
            </p>
          )}
        </div>
      )}

      {/* 7. Profile Edit Modal */}
      <TelegramProfileEditModal 
        chat={chat}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={(updates) => {
          if (onUpdateProfile) onUpdateProfile(updates);
          showToast('Profile updated successfully');
        }}
      />

      {/* 8. Accounts Switcher Modal */}
      <TelegramAccountsModal 
        isOpen={isAccountsModalOpen}
        onClose={() => setIsAccountsModalOpen(false)}
        chats={allChats.length > 0 ? allChats : [chat]}
        activeChatId={chat.id}
        onSelectAccount={(chatId) => {
          if (onSelectAccount) onSelectAccount(chatId);
          showToast('Switched receiver account');
        }}
        onCreateAccount={(data) => {
          if (onCreateAccount) onCreateAccount(data);
          showToast('New account created');
        }}
      />

      {/* 9. Bank Transactions Modal (Simulation) */}
      <TelegramBankTransactionsModal 
        isOpen={isBankTxModalOpen}
        onClose={() => setIsBankTxModalOpen(false)}
        onSimulateTransaction={(tx) => {
          if (onSimulateBankTransaction) onSimulateBankTransaction(tx);
          showToast(`Simulating chat with ${tx.recipientName || 'Receiver'}`);
        }}
      />

      {/* 10. Simulate Chat Modal (2 Accounts Setup) */}
      <TelegramSimulateChatModal 
        isOpen={isSimulateChatModalOpen}
        onClose={() => setIsSimulateChatModalOpen(false)}
        chats={allChats.length > 0 ? allChats : [chat]}
        currentChat={chat}
        onSimulate={(config) => {
          if (onSimulateTwoAccountChat) {
            onSimulateTwoAccountChat(config);
            showToast('Simulated 2-account chat applied');
          }
        }}
      />
    </div>
  );
}

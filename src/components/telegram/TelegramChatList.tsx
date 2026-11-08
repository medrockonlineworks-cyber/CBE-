import React, { useState, useRef } from 'react';
import { 
  Plus, 
  MessageCircle, 
  Trash2, 
  Copy, 
  Upload, 
  Download, 
  Eye, 
  Edit3, 
  Search, 
  Sparkles, 
  Phone, 
  User, 
  Check, 
  X, 
  Image as ImageIcon,
  RotateCcw,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  TelegramChat, 
  TelegramStatusType, 
  TelegramTheme 
} from '../../types/telegram';

interface TelegramChatListProps {
  chats: TelegramChat[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onCreateChat: (data: Partial<TelegramChat>) => void;
  onDeleteChat: (id: string) => void;
  onDuplicateChat: (id: string) => void;
  onOpenSimulator: (id: string) => void;
  onOpenPreview: (id: string) => void;
  onExportJson: (chat: TelegramChat) => void;
  onImportJson: (file: File) => void;
  onResetDefaults: () => void;
}

export default function TelegramChatList({
  chats,
  activeChatId,
  onSelectChat,
  onCreateChat,
  onDeleteChat,
  onDuplicateChat,
  onOpenSimulator,
  onOpenPreview,
  onExportJson,
  onImportJson,
  onResetDefaults,
}: TelegramChatListProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // New Chat Form
  const [newContactName, setNewContactName] = useState<string>('Leul Seged');
  const [newUsername, setNewUsername] = useState<string>('@leul_seged');
  const [newStatus, setNewStatus] = useState<TelegramStatusType>('last seen recently');
  const [newCustomStatus, setNewCustomStatus] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('+251 92 345 6789');
  const [newAvatarUrl, setNewAvatarUrl] = useState<string>('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80');
  const [newTheme, setNewTheme] = useState<TelegramTheme>('dark_blue');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const jsonImportInputRef = useRef<HTMLInputElement>(null);

  const filteredChats = chats.filter((c) => 
    c.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) setNewAvatarUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) {
      alert('Please enter a contact name');
      return;
    }

    onCreateChat({
      contactName: newContactName.trim(),
      username: newUsername.trim().startsWith('@') ? newUsername.trim() : `@${newUsername.trim()}`,
      status: newStatus,
      customStatusText: newCustomStatus.trim(),
      phoneNumber: newPhone.trim(),
      avatarUrl: newAvatarUrl,
      settings: {
        theme: newTheme,
        backgroundOpacity: 25,
        fontSize: 'normal',
        bubbleRadius: 'normal',
        showTimestamps: true,
        showReadTicks: true,
        showAvatars: false,
        showStatus: true,
        showAndroidStatusBar: false,
        timeFormat: '12h',
        typingSimulation: false,
        typingDurationSec: 3,
      },
    });

    setIsCreateModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-y-auto select-none p-4 pb-24">
      {/* Dashboard Top Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-900/60 via-slate-900 to-indigo-950/70 border border-sky-500/20 p-5 shadow-2xl mb-5">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-[11px] font-semibold mb-2.5 tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mockup & Conversation Designer</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1">
            Telegram Chat Simulator
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-4 leading-relaxed">
            Create, edit, and preview realistic fictional chat conversations in a Telegram-inspired mobile interface.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-sky-500/25 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create New Chat</span>
            </button>

            <button 
              onClick={() => onOpenSimulator(activeChatId)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-sky-400" />
              <span>Open Simulator</span>
            </button>

            <button 
              onClick={() => jsonImportInputRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              title="Import chat JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON</span>
            </button>
            <input 
              ref={jsonImportInputRef}
              type="file"
              accept=".json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportJson(f);
              }}
              className="hidden"
            />
          </div>
        </div>

        {/* Decorative background glows */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Search & Chats Section Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-sky-400" />
          <span>My Chats ({chats.length})</span>
        </h2>

        <div className="relative w-44 sm:w-56">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Chat Cards List */}
      <div className="space-y-2.5">
        {filteredChats.map((chat) => {
          const isActive = chat.id === activeChatId;
          const lastMsg = chat.messages[chat.messages.length - 1];

          return (
            <div 
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isActive 
                  ? 'bg-slate-900/90 border-sky-500/50 shadow-md shadow-sky-950/50 ring-1 ring-sky-500/30' 
                  : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Profile Photo */}
                <div className="relative shrink-0">
                  {chat.avatarUrl ? (
                    <img 
                      src={chat.avatarUrl} 
                      alt={chat.contactName} 
                      className="w-12 h-12 rounded-full object-cover border border-slate-700" 
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-bold text-white text-base">
                      {chat.contactName.charAt(0)}
                    </div>
                  )}
                  {chat.status === 'online' && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white truncate">{chat.contactName}</h3>
                    <span className="text-[11px] text-sky-400 truncate">{chat.username}</span>
                  </div>
                  
                  {/* Last message preview */}
                  <p className="text-xs text-slate-400 truncate mt-0.5 max-w-[200px] sm:max-w-xs">
                    {lastMsg ? (
                      lastMsg.type === 'text' 
                        ? lastMsg.text 
                        : lastMsg.type === 'image' 
                          ? '📷 Photo' 
                          : lastMsg.type === 'album' 
                            ? '🖼️ Photo Album' 
                            : lastMsg.dateLabel || 'Message'
                    ) : 'No messages'}
                  </p>

                  <div className="flex items-center gap-2 mt-1 text-[10.5px] text-slate-500">
                    <span>{chat.messages.length} messages</span>
                    <span>•</span>
                    <span>{lastMsg ? lastMsg.timestamp : 'Recent'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for this chat */}
              <div className="flex items-center gap-1 self-end sm:self-center shrink-0" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => onOpenPreview(chat.id)}
                  className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition shadow-xs"
                  title="Open Preview"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>

                <button 
                  onClick={() => onOpenSimulator(chat.id)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition"
                  title="Edit Messages"
                >
                  <Edit3 className="w-4 h-4 text-sky-400" />
                </button>

                <button 
                  onClick={() => onDuplicateChat(chat.id)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition"
                  title="Duplicate Chat"
                >
                  <Copy className="w-4 h-4" />
                </button>

                <button 
                  onClick={() => onExportJson(chat)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition"
                  title="Export Chat JSON"
                >
                  <Download className="w-4 h-4" />
                </button>

                <button 
                  onClick={() => onDeleteChat(chat.id)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-950/50 text-red-400 cursor-pointer transition"
                  title="Delete Chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reset Defaults Warning Footer */}
      <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
        <span>Offline simulation • 100% Client-side</span>
        <button 
          onClick={() => {
            if (confirm('Reset simulated chats to default sample conversations?')) {
              onResetDefaults();
            }
          }}
          className="flex items-center gap-1 text-slate-400 hover:text-amber-400 cursor-pointer transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Sample Chats</span>
        </button>
      </div>

      {/* Create New Chat Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create Fictional Chat</h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              {/* Profile Photo Picker */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  {newAvatarUrl ? (
                    <img 
                      src={newAvatarUrl} 
                      alt="avatar" 
                      className="w-14 h-14 rounded-full object-cover border border-slate-700" 
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                      <User className="w-6 h-6" />
                    </div>
                  )}
                  <button 
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1 bg-sky-600 rounded-full text-white cursor-pointer hover:bg-sky-500 shadow-md"
                    title="Upload photo"
                  >
                    <Upload className="w-3 h-3" />
                  </button>
                  <input 
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-200">Profile Photo</p>
                  <p className="text-[11px] text-slate-500">Upload a square photo from your device</p>
                </div>
              </div>

              {/* Contact Name */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Contact Name *
                </label>
                <input 
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="e.g. Leul Seged or GOM Customer Service"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 outline-none focus:border-sky-500"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Username
                </label>
                <input 
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. @leul_seged"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 outline-none focus:border-sky-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Status
                </label>
                <select 
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as TelegramStatusType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 outline-none focus:border-sky-500"
                >
                  <option value="online">online</option>
                  <option value="last seen recently">last seen recently</option>
                  <option value="last seen today">last seen today</option>
                  <option value="last seen yesterday">last seen yesterday</option>
                  <option value="custom">custom status...</option>
                </select>
              </div>

              {newStatus === 'custom' && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Custom Status Text
                  </label>
                  <input 
                    type="text"
                    value={newCustomStatus}
                    onChange={(e) => setNewCustomStatus(e.target.value)}
                    placeholder="e.g. last seen 2 hours ago"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
              )}

              {/* Phone Number */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Phone Number (Optional)
                </label>
                <input 
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. +251 92 345 6789"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 outline-none focus:border-sky-500"
                />
              </div>

              {/* Theme */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Chat Theme
                </label>
                <select 
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value as TelegramTheme)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 outline-none focus:border-sky-500"
                >
                  <option value="dark_blue">Telegram Dark Blue</option>
                  <option value="dark_default">Telegram Classic Dark</option>
                  <option value="obsidian">Obsidian Pitch Dark</option>
                  <option value="light">Telegram Light Day</option>
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button 
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer shadow-lg shadow-sky-600/20"
                >
                  Create Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

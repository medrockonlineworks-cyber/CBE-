import React, { useState, useEffect } from 'react';
import { 
  Home as HomeIcon, 
  MessageCircle, 
  Edit3, 
  Eye, 
  Sliders, 
  ArrowLeft, 
  Plus, 
  Download, 
  Share2, 
  Maximize2, 
  Minimize2, 
  Sparkles,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { TelegramChat, TelegramMessage, TelegramChatSettings } from '../../types/telegram';
import { Transaction } from '../../types';
import { TelegramSimulatorService } from '../../services/telegramSimulatorService';
import TelegramChatList from './TelegramChatList';
import TelegramEditor from './TelegramEditor';
import TelegramChatPreview from './TelegramChatPreview';
import TelegramSettingsModal from './TelegramSettingsModal';
import TelegramExportModal from './TelegramExportModal';

interface TelegramSimulatorAppProps {
  onBack?: () => void;
  onOpenTelebirr?: () => void;
  onOpenCbe?: () => void;
  onOpenDashen?: () => void;
}

export default function TelegramSimulatorApp({
  onBack,
  onOpenTelebirr,
  onOpenCbe,
  onOpenDashen,
}: TelegramSimulatorAppProps) {
  const [chats, setChats] = useState<TelegramChat[]>(() => TelegramSimulatorService.getChats());
  const [activeChatId, setActiveChatId] = useState<string>(() => TelegramSimulatorService.getActiveChatId());
  const [activeTab, setActiveTab] = useState<'home' | 'chats' | 'editor' | 'preview'>('preview');
  const [isScreenshotMode, setIsScreenshotMode] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Active chat object
  const activeChat = chats.find(c => c.id === activeChatId) || chats[0] || null;

  // Sync state helpers
  const refreshChats = () => {
    const updated = TelegramSimulatorService.getChats();
    setChats(updated);
  };

  const handleSelectChat = (id: string) => {
    TelegramSimulatorService.setActiveChatId(id);
    setActiveChatId(id);
    setActiveTab('editor');
  };

  const handleCreateChat = (data: Partial<TelegramChat>) => {
    const newChat = TelegramSimulatorService.createChat(data);
    refreshChats();
    setActiveChatId(newChat.id);
    setActiveTab('editor');
  };

  const handleDeleteChat = (id: string) => {
    TelegramSimulatorService.deleteChat(id);
    refreshChats();
    setActiveChatId(TelegramSimulatorService.getActiveChatId());
  };

  const handleDuplicateChat = (id: string) => {
    const dup = TelegramSimulatorService.duplicateChat(id);
    if (dup) {
      refreshChats();
      setActiveChatId(dup.id);
    }
  };

  // Message Operations
  const handleAddMessage = (msg: Omit<TelegramMessage, 'id'>) => {
    if (!activeChat) return;
    TelegramSimulatorService.addMessage(activeChat.id, msg);
    refreshChats();
  };

  const handleUpdateMessage = (msgId: string, updates: Partial<TelegramMessage>) => {
    if (!activeChat) return;
    TelegramSimulatorService.updateMessage(activeChat.id, msgId, updates);
    refreshChats();
  };

  const handleDeleteMessage = (msgId: string) => {
    if (!activeChat) return;
    TelegramSimulatorService.deleteMessage(activeChat.id, msgId);
    refreshChats();
  };

  const handleMoveMessage = (msgId: string, direction: 'up' | 'down') => {
    if (!activeChat) return;
    TelegramSimulatorService.moveMessage(activeChat.id, msgId, direction);
    refreshChats();
  };

  const handleDuplicateMessage = (msgId: string) => {
    if (!activeChat) return;
    TelegramSimulatorService.duplicateMessage(activeChat.id, msgId);
    refreshChats();
  };

  // Chat Settings Update
  const handleUpdateSettings = (settingsUpdates: Partial<TelegramChatSettings>) => {
    if (!activeChat) return;
    const newSettings = { ...activeChat.settings, ...settingsUpdates };
    TelegramSimulatorService.updateChat(activeChat.id, { settings: newSettings });
    refreshChats();
  };

  // Handlers for 3-Dot menu operations
  const handleToggleSender = (msgId: string) => {
    if (!activeChat) return;
    TelegramSimulatorService.toggleMessageSender(activeChat.id, msgId);
    refreshChats();
  };

  const handleUpdateProfile = (updates: any) => {
    if (!activeChat) return;
    TelegramSimulatorService.updateProfile(activeChat.id, updates);
    refreshChats();
  };

  const handleSelectAccount = (chatId: string) => {
    TelegramSimulatorService.setActiveChatId(chatId);
    setActiveChatId(chatId);
    refreshChats();
  };

  const handleCreateAccount = (data: any) => {
    const newChat = TelegramSimulatorService.createChat({
      contactName: data.contactName,
      accountNumber: data.accountNumber,
      phoneNumber: data.phoneNumber,
      avatarUrl: data.avatarUrl,
    });
    refreshChats();
    setActiveChatId(newChat.id);
  };

  const handleSimulateBankTransaction = (tx: Partial<Transaction>) => {
    const simulatedChat = TelegramSimulatorService.simulateBankTransactionChat(tx);
    refreshChats();
    setActiveChatId(simulatedChat.id);
    setActiveTab('preview');
  };

  const handleSimulateTwoAccountChat = (config: {
    receiverName: string;
    receiverAccount: string;
    receiverAvatarUrl?: string;
    amount: number;
    referenceNo?: string;
    viewPerspective: 'gom' | 'receiver';
  }) => {
    const simulatedChat = TelegramSimulatorService.simulateTwoAccountChat(config);
    refreshChats();
    setActiveChatId(simulatedChat.id);
    setActiveTab('preview');
  };

  const handleTogglePerspective = (perspective: 'gom' | 'receiver') => {
    if (!activeChat) return;
    TelegramSimulatorService.toggleChatPerspective(activeChat.id, perspective);
    refreshChats();
  };

  const handleClearChatMessages = () => {
    if (!activeChat) return;
    TelegramSimulatorService.updateChat(activeChat.id, { messages: [] });
    refreshChats();
    setIsSettingsModalOpen(false);
  };

  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const res = TelegramSimulatorService.importChatFromJson(content);
        if (res.success && res.chat) {
          refreshChats();
          setActiveChatId(res.chat.id);
          setActiveTab('preview');
        } else {
          alert(res.error || 'Failed to import JSON');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetDefaults = () => {
    TelegramSimulatorService.resetToDefault();
    refreshChats();
    setActiveChatId('chat-gom-customer-service');
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-white p-6">
        <p>Loading simulated chat...</p>
      </div>
    );
  }

  // --- SCREENSHOT / FULLSCREEN MODE (Minimal chrome) ---
  if (isScreenshotMode || activeTab === 'preview') {
    return (
      <div className="relative w-full h-full flex flex-col bg-black overflow-hidden">
        <TelegramChatPreview 
          chat={activeChat}
          allChats={chats}
          onBack={() => {
            if (onBack) onBack();
            else setActiveTab('chats');
          }}
          onEditMessage={() => {
            setIsScreenshotMode(false);
            setActiveTab('editor');
          }}
          onDeleteMessage={handleDeleteMessage}
          onDuplicateMessage={handleDuplicateMessage}
          onToggleSender={handleToggleSender}
          onUpdateProfile={handleUpdateProfile}
          onSelectAccount={handleSelectAccount}
          onCreateAccount={handleCreateAccount}
          onSimulateBankTransaction={handleSimulateBankTransaction}
          onSimulateTwoAccountChat={handleSimulateTwoAccountChat}
          onTogglePerspective={handleTogglePerspective}
          onLoadDemoChat={(type) => {
            if (type === 'full_sep15') {
              TelegramSimulatorService.loadFullDemoChat(activeChat.id);
            } else {
              handleResetDefaults();
            }
            refreshChats();
          }}
          onResetDefault={handleResetDefaults}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenEditor={() => {
            setIsScreenshotMode(false);
            setActiveTab('editor');
          }}
          onOpenExport={() => setIsExportModalOpen(true)}
          onOpenTelebirr={onOpenTelebirr}
          onOpenCbe={onOpenCbe}
          onOpenDashen={onOpenDashen}
          isScreenshotMode={true}
          onToggleScreenshotMode={() => setIsScreenshotMode(false)}
        />

        {isExportModalOpen && (
          <TelegramExportModal 
            chat={activeChat}
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 text-white">
      {/* Top App Bar with App Branding & Quick Actions */}
      <header className="h-12 px-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-30 shrink-0 select-none">
        <div className="flex items-center gap-2">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 transition cursor-pointer"
              title="Return"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center text-white shadow-xs">
              <MessageCircle className="w-3.5 h-3.5" />
            </div>
            <div>
              <h1 className="text-xs font-bold text-white tracking-wide">
                Telegram Chat Simulator
              </h1>
            </div>
          </div>
        </div>

        {/* Right header actions */}
        <div className="flex items-center gap-1">
          {/* Linked app shortcuts */}
          {onOpenTelebirr && (
            <button 
              onClick={onOpenTelebirr}
              className="px-2 py-1 rounded-lg bg-lime-500/10 hover:bg-lime-500/20 text-lime-400 text-[10px] font-semibold border border-lime-500/30 transition cursor-pointer hidden sm:flex items-center gap-1"
            >
              <span>Telebirr</span>
            </button>
          )}

          <button 
            onClick={() => setActiveTab('preview')}
            className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1 mr-1"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Chat</span>
          </button>

          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition cursor-pointer"
            title="Export conversation"
          >
            <Download className="w-4 h-4 text-sky-400" />
          </button>

          <button 
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition cursor-pointer"
            title="Chat settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === 'home' && (
          <TelegramChatList 
            chats={chats}
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            onCreateChat={handleCreateChat}
            onDeleteChat={handleDeleteChat}
            onDuplicateChat={handleDuplicateChat}
            onOpenSimulator={(id) => {
              setActiveChatId(id);
              setActiveTab('editor');
            }}
            onOpenPreview={(id) => {
              setActiveChatId(id);
              setActiveTab('preview');
            }}
            onExportJson={(c) => {
              setActiveChatId(c.id);
              setIsExportModalOpen(true);
            }}
            onImportJson={handleImportJson}
            onResetDefaults={handleResetDefaults}
          />
        )}

        {activeTab === 'chats' && (
          <TelegramChatList 
            chats={chats}
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            onCreateChat={handleCreateChat}
            onDeleteChat={handleDeleteChat}
            onDuplicateChat={handleDuplicateChat}
            onOpenSimulator={(id) => {
              setActiveChatId(id);
              setActiveTab('editor');
            }}
            onOpenPreview={(id) => {
              setActiveChatId(id);
              setActiveTab('preview');
            }}
            onExportJson={(c) => {
              setActiveChatId(c.id);
              setIsExportModalOpen(true);
            }}
            onImportJson={handleImportJson}
            onResetDefaults={handleResetDefaults}
          />
        )}

        {activeTab === 'editor' && (
          <TelegramEditor 
            chat={activeChat}
            onAddMessage={handleAddMessage}
            onUpdateMessage={handleUpdateMessage}
            onDeleteMessage={handleDeleteMessage}
            onMoveMessage={handleMoveMessage}
            onDuplicateMessage={handleDuplicateMessage}
            onOpenPreview={() => setActiveTab('preview')}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
          />
        )}

      </main>

      {/* Bottom Navigation Dock (Home, Chats, Editor, Preview) */}
      <nav className="h-14 bg-slate-950 border-t border-slate-800 flex items-center justify-around px-2 z-30 shrink-0 select-none">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition cursor-pointer ${
            activeTab === 'home' ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <HomeIcon className="w-4 h-4" />
          <span className="text-[10px]">Home</span>
        </button>

        <button 
          onClick={() => setActiveTab('chats')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition cursor-pointer ${
            activeTab === 'chats' ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-[10px]">Chats</span>
        </button>

        <button 
          onClick={() => setActiveTab('editor')}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition cursor-pointer ${
            activeTab === 'editor' ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span className="text-[10px]">Editor</span>
        </button>

        <button 
          onClick={() => setActiveTab('preview')}
          className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition cursor-pointer text-slate-400 hover:text-slate-200"
        >
          <Eye className="w-4 h-4" />
          <span className="text-[10px]">Preview</span>
        </button>
      </nav>

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <TelegramSettingsModal 
          chat={activeChat}
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onUpdateSettings={handleUpdateSettings}
          onClearChatMessages={handleClearChatMessages}
        />
      )}

      {/* Export Modal */}
      {isExportModalOpen && (
        <TelegramExportModal 
          chat={activeChat}
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}
    </div>
  );
}

import React, { useRef } from 'react';
import { 
  X, 
  Sliders, 
  Image as ImageIcon, 
  Upload, 
  Eye, 
  RotateCcw, 
  Clock, 
  Palette,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { 
  TelegramChat, 
  TelegramChatSettings, 
  TelegramTheme 
} from '../../types/telegram';

interface TelegramSettingsModalProps {
  chat: TelegramChat;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSettings: (settings: Partial<TelegramChatSettings>) => void;
  onClearChatMessages: () => void;
}

export default function TelegramSettingsModal({
  chat,
  isOpen,
  onClose,
  onUpdateSettings,
  onClearChatMessages,
}: TelegramSettingsModalProps) {
  const bgImageInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const { settings } = chat;

  const handleCustomBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        onUpdateSettings({ customBackgroundUrl: result });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white">Chat Simulation Settings</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Theme Picker */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">
              Theme Palette
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'dark_blue', name: 'Telegram Dark Blue', color: 'bg-[#2b5278]' },
                { id: 'dark_default', name: 'Classic Dark', color: 'bg-[#182533]' },
                { id: 'obsidian', name: 'Obsidian Black', color: 'bg-zinc-900' },
                { id: 'light', name: 'Day Light', color: 'bg-slate-200' },
              ].map((t) => (
                <button 
                  key={t.id}
                  type="button"
                  onClick={() => onUpdateSettings({ theme: t.id as TelegramTheme })}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition cursor-pointer ${
                    settings.theme === t.id 
                      ? 'border-sky-500 bg-sky-500/10 text-white shadow-xs' 
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${t.color} border border-white/20`} />
                  <span className="font-semibold text-[11px] truncate">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Background Wallpaper */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-400 font-semibold">
                Chat Background
              </label>
              {settings.customBackgroundUrl && (
                <button 
                  type="button"
                  onClick={() => onUpdateSettings({ customBackgroundUrl: undefined })}
                  className="text-[11px] text-red-400 hover:underline cursor-pointer"
                >
                  Remove Custom Image
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => bgImageInputRef.current?.click()}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500 text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>{settings.customBackgroundUrl ? 'Change Background Image' : 'Upload Custom Background'}</span>
              </button>
              <input 
                ref={bgImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleCustomBgUpload}
                className="hidden"
              />
            </div>

            {/* Opacity Slider */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>Pattern / Wallpaper Opacity</span>
                <span className="font-mono text-white">{settings.backgroundOpacity}%</span>
              </div>
              <input 
                type="range"
                min="0"
                max="100"
                value={settings.backgroundOpacity}
                onChange={(e) => onUpdateSettings({ backgroundOpacity: Number(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Display Toggles */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800">
            <label className="block text-slate-400 font-semibold mb-1">
              Visual Elements
            </label>

            <label className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
              <span className="text-slate-200">Show Android Status Bar</span>
              <input 
                type="checkbox"
                checked={settings.showAndroidStatusBar}
                onChange={(e) => onUpdateSettings({ showAndroidStatusBar: e.target.checked })}
                className="w-4 h-4 accent-sky-500"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
              <span className="text-slate-200">Show Message Timestamps</span>
              <input 
                type="checkbox"
                checked={settings.showTimestamps}
                onChange={(e) => onUpdateSettings({ showTimestamps: e.target.checked })}
                className="w-4 h-4 accent-sky-500"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
              <span className="text-slate-200">Show Read Checkmarks (✓ / ✓✓)</span>
              <input 
                type="checkbox"
                checked={settings.showReadTicks}
                onChange={(e) => onUpdateSettings({ showReadTicks: e.target.checked })}
                className="w-4 h-4 accent-sky-500"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
              <span className="text-slate-200">Show Avatars Beside Messages</span>
              <input 
                type="checkbox"
                checked={settings.showAvatars}
                onChange={(e) => onUpdateSettings({ showAvatars: e.target.checked })}
                className="w-4 h-4 accent-sky-500"
              />
            </label>
          </div>

          {/* Typing Simulation Controls */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-slate-400 font-semibold mb-1">
              Typing Animation Simulation
            </label>

            <label className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer mb-2">
              <span className="text-slate-200">Auto-simulate Typing on Preview</span>
              <input 
                type="checkbox"
                checked={settings.typingSimulation}
                onChange={(e) => onUpdateSettings({ typingSimulation: e.target.checked })}
                className="w-4 h-4 accent-sky-500"
              />
            </label>
          </div>

          {/* Danger Zone: Clear messages */}
          <div className="pt-2 border-t border-slate-800">
            <button 
              type="button"
              onClick={() => {
                if (confirm('Clear all messages from this simulated conversation?')) {
                  onClearChatMessages();
                }
              }}
              className="w-full py-2.5 rounded-xl bg-red-950/40 border border-red-900/50 hover:bg-red-900/50 text-red-400 font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Messages in this Chat</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer transition shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

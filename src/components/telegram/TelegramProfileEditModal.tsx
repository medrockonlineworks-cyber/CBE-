import React, { useState } from 'react';
import { X, Check, Camera, User, AtSign, Phone, Activity, FileText } from 'lucide-react';
import { TelegramChat, TelegramStatusType } from '../../types/telegram';
import { getLeulSegedAvatarDataUrl, getGOMAvatarDataUrl } from '../../utils/telegramReceiptGenerator';

interface TelegramProfileEditModalProps {
  chat: TelegramChat;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: {
    contactName: string;
    username: string;
    avatarUrl: string;
    status: TelegramStatusType;
    customStatusText?: string;
    phoneNumber?: string;
    bioText?: string;
  }) => void;
}

const PRESET_AVATARS = [
  { name: 'GOM Official Logo', url: getGOMAvatarDataUrl() },
  { name: 'Leul Seged (Official)', url: getLeulSegedAvatarDataUrl() },
  { name: 'Professional Male', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' },
  { name: 'Professional Female', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' },
  { name: 'Young Professional', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { name: 'Business Exec', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
];

export default function TelegramProfileEditModal({
  chat,
  isOpen,
  onClose,
  onSave,
}: TelegramProfileEditModalProps) {
  const [contactName, setContactName] = useState(chat.contactName);
  const [username, setUsername] = useState(chat.username);
  const [avatarUrl, setAvatarUrl] = useState(chat.avatarUrl || '');
  const [status, setStatus] = useState<TelegramStatusType>(chat.status || 'last seen recently');
  const [customStatusText, setCustomStatusText] = useState(chat.customStatusText || '');
  const [phoneNumber, setPhoneNumber] = useState(chat.phoneNumber || '');
  const [bioText, setBioText] = useState(chat.gomProfile?.bioText || "Let's work together through simple tasks for earning");


  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatarUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      contactName: contactName.trim() || 'Leul Seged',
      username: username.trim().startsWith('@') ? username.trim() : `@${username.trim()}`,
      avatarUrl,
      status,
      customStatusText,
      phoneNumber,
      bioText,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#17212b] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-[#0e1621] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">Edit Contact Profile</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Change receiver profile name and picture</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Avatar Preview & Upload */}
          <div className="flex flex-col items-center justify-center pb-2">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-blue-500 shadow-md bg-slate-100 dark:bg-slate-800">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-2xl">
                    {contactName.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <label 
                htmlFor="avatar-upload" 
                className="absolute inset-0 rounded-full bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
              >
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-medium">Change Photo</span>
              </label>
              <input 
                id="avatar-upload" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
            </div>
            <label 
              htmlFor="avatar-upload"
              className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Camera className="w-3.5 h-3.5" /> Upload Photo from Device
            </label>

            {/* Quick Preset Avatars */}
            <div className="w-full mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block text-center mb-2">
                Or choose a preset avatar:
              </span>
              <div className="flex justify-center gap-2 overflow-x-auto py-1">
                {PRESET_AVATARS.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAvatarUrl(p.url)}
                    className={`w-10 h-10 rounded-full overflow-hidden border-2 transition shrink-0 cursor-pointer ${
                      avatarUrl === p.url ? 'border-blue-500 scale-110 shadow-sm' : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                    title={p.name}
                  >
                    <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Display Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Profile Display Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Leul Seged"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#0e1621] border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Telegram Username
            </label>
            <div className="relative">
              <AtSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@leul_seged"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#0e1621] border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Online Status Display
            </label>
            <div className="relative">
              <Activity className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#0e1621] border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="last seen recently">last seen recently</option>
                <option value="online">online</option>
                <option value="last seen today">last seen today</option>
                <option value="last seen yesterday">last seen yesterday</option>
                <option value="custom">Custom text...</option>
              </select>
            </div>
          </div>

          {status === 'custom' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Custom Status Subtitle
              </label>
              <input 
                type="text" 
                value={customStatusText}
                onChange={(e) => setCustomStatusText(e.target.value)}
                placeholder="e.g. typing..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0e1621] border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Bio Text */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Bio Text
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                placeholder="e.g. Let's work together through simple tasks for earning"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#0e1621] border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+251 91 163 8276"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#0e1621] border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Check className="w-4 h-4" /> Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, Users, Check, Plus, CreditCard, Building, Phone, ArrowRight } from 'lucide-react';
import { TelegramChat } from '../../types/telegram';
import { getLeulSegedAvatarDataUrl } from '../../utils/telegramReceiptGenerator';

interface TelegramAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chats: TelegramChat[];
  activeChatId: string;
  onSelectAccount: (chatId: string) => void;
  onCreateAccount: (data: { contactName: string; accountNumber?: string; phoneNumber?: string; avatarUrl?: string }) => void;
}

export default function TelegramAccountsModal({
  isOpen,
  onClose,
  chats,
  activeChatId,
  onSelectAccount,
  onCreateAccount,
}: TelegramAccountsModalProps) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAccNum, setNewAccNum] = useState('');
  const [newPhone, setNewPhone] = useState('');

  if (!isOpen) return null;

  const handleAddNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreateAccount({
      contactName: newName.trim(),
      accountNumber: newAccNum.trim() || `1000${Math.floor(100000000 + Math.random() * 900000000)}`,
      phoneNumber: newPhone.trim() || '+251 91 100 0000',
    });
    setNewName('');
    setNewAccNum('');
    setNewPhone('');
    setIsAddingNew(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#17212b] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-[#0e1621] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">Switch Account / Receiver</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Select which receiver account to simulate</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {!isAddingNew ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Available Accounts ({chats.length})
                </span>
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Account
                </button>
              </div>

              {chats.map((chat) => {
                const isActive = chat.id === activeChatId;
                return (
                  <div
                    key={chat.id}
                    onClick={() => {
                      onSelectAccount(chat.id);
                      onClose();
                    }}
                    className={`p-3.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                      isActive 
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-600'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-[#0e1621]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                          {chat.avatarUrl ? (
                            <img src={chat.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                              {chat.contactName.charAt(0)}
                            </div>
                          )}
                        </div>
                        {isActive && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] ring-2 ring-white dark:ring-[#17212b]">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                            {chat.contactName}
                          </h4>
                          {isActive && (
                            <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{chat.username}</span>
                          {chat.accountNumber && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[11px]">{chat.accountNumber}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 shrink-0" />
                  </div>
                );
              })}
            </div>
          ) : (
            /* Add New Account Form */
            <form onSubmit={handleAddNewSubmit} className="space-y-3.5">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Create New Receiver Account
              </h4>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Receiver Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Dawit Kebede"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0e1621] border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Bank Account Number
                </label>
                <input 
                  type="text" 
                  placeholder="1000..."
                  value={newAccNum}
                  onChange={(e) => setNewAccNum(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0e1621] border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input 
                  type="text" 
                  placeholder="+251 9..."
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0e1621] border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Account
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

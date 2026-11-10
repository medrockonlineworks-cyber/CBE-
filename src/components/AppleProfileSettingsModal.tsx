import React, { useState } from 'react';
import { 
  X, 
  User, 
  Smartphone, 
  Sun, 
  Moon, 
  ChevronRight, 
  Check, 
  Landmark, 
  Trash2, 
  ArrowLeft,
  CreditCard,
  ShieldCheck,
  Sliders
} from 'lucide-react';
import { SmsAccount } from '../types/sms';
import PhoneSettingsModal from './PhoneSettingsModal';

interface AppleProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderName?: string;
  senderSubtitle?: string;
  accounts?: SmsAccount[];
  activeAccountNumber?: string;
  onSelectAccount?: (accountNumber: string) => void;
  onClearMessages?: () => void;
  onBackToApp?: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export const AppleProfileSettingsModal: React.FC<AppleProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  senderName = 'Leykun Jemaneh Ylma',
  senderSubtitle = 'Commercial Bank of Ethiopia',
  accounts = [],
  activeAccountNumber,
  onSelectAccount,
  onClearMessages,
  onBackToApp,
  isDarkMode = true,
  onToggleTheme,
}) => {
  const [showPhoneSettings, setShowPhoneSettings] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 select-none"
        onClick={onClose}
      >
        <div 
          className="w-full max-w-md bg-[#1c1c1e] text-white rounded-t-[32px] sm:rounded-3xl p-5 shadow-2xl border-t sm:border border-white/10 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* iOS Grabber */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3" />

          {/* Top Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#2c2c2e]">
            <span className="text-[17px] font-semibold text-white">Details &amp; Settings</span>
            <button
              type="button"
              onClick={onClose}
              className="text-[#007aff] hover:opacity-80 active:opacity-60 text-[17px] font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>

          {/* Large Profile Avatar & Contact Info */}
          <div className="flex flex-col items-center py-5">
            <div className="w-20 h-20 bg-[#545458] rounded-full flex items-center justify-center text-white shadow-lg mb-3">
              <User className="w-10 h-10 text-white stroke-[2.2]" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">{senderName}</h3>
            <p className="text-xs text-[#8e8e93] mt-0.5">{senderSubtitle}</p>
          </div>

          {/* Group 1: Phone & Status Bar Settings */}
          <div className="bg-[#2c2c2e] rounded-2xl overflow-hidden divide-y divide-white/5 mb-4 shadow-sm">
            <button
              type="button"
              onClick={() => setShowPhoneSettings(true)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[15px] font-medium text-white">Phone &amp; Status Bar Settings</div>
                  <div className="text-[12px] text-[#8e8e93]">Switch iPhone / Android, battery, time &amp; carrier</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#8e8e93]/60 shrink-0" />
            </button>

            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-[15px] font-medium text-white">Theme Appearance</div>
                    <div className="text-[12px] text-[#8e8e93]">Toggle between Dark &amp; Light Mode</div>
                  </div>
                </div>
                <span className="text-[13px] font-medium text-[#8e8e93] uppercase">
                  {isDarkMode ? 'Dark' : 'Light'}
                </span>
              </button>
            )}
          </div>

          {/* Group 2: CBE Bank Accounts Switcher (if accounts available) */}
          {accounts.length > 0 && onSelectAccount && (
            <div className="mb-4">
              <div className="text-xs uppercase tracking-wider text-[#8e8e93] px-2 mb-1.5 font-semibold">
                CBE Bank Accounts
              </div>
              <div className="bg-[#2c2c2e] rounded-2xl overflow-hidden divide-y divide-white/5 shadow-sm">
                {accounts.map((acc) => {
                  const isSelected = acc.accountNumber === activeAccountNumber;
                  return (
                    <button
                      key={acc.accountNumber}
                      type="button"
                      onClick={() => {
                        onSelectAccount(acc.accountNumber);
                        onClose();
                      }}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                          <Landmark className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[14px] font-medium text-white truncate">
                            {acc.accountName || 'Saving Account'}
                          </div>
                          <div className="text-[12px] font-mono text-[#8e8e93]">
                            {acc.accountNumber}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-[#007aff] stroke-[2.5] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Group 3: Actions (Clear Messages & Back to CBE App) */}
          <div className="bg-[#2c2c2e] rounded-2xl overflow-hidden divide-y divide-white/5 shadow-sm">
            {onClearMessages && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear messages in this conversation?')) {
                    onClearMessages();
                    onClose();
                  }
                }}
                className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/5 active:bg-white/10 transition-colors text-red-400 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <span className="text-[15px] font-medium">Clear Conversation Messages</span>
              </button>
            )}


          </div>
        </div>
      </div>

      {/* Embedded Phone & Status Bar Settings Modal */}
      <PhoneSettingsModal
        isOpen={showPhoneSettings}
        onClose={() => setShowPhoneSettings(false)}
      />
    </>
  );
};

export default AppleProfileSettingsModal;

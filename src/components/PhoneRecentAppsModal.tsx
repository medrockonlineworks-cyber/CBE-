import React from 'react';
import { 
  Building2, 
  Smartphone, 
  MessageSquare, 
  PhoneCall, 
  ShieldCheck, 
  Send, 
  X,
  CreditCard
} from 'lucide-react';

export type AppViewId = 'main' | 'telebirr' | 'dashen' | 'sms' | 'phone' | 'truecaller' | 'telegram' | 'admin';

interface PhoneRecentAppsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: AppViewId;
  onSelectApp: (view: AppViewId) => void;
}

interface AppInfo {
  id: AppViewId;
  name: string;
  subtitle: string;
  color: string;
  badge: string;
  iconBg: string;
  icon: React.ReactNode;
}

const APPS: AppInfo[] = [
  {
    id: 'main',
    name: 'CBE Mobile Banking',
    subtitle: 'Commercial Bank of Ethiopia • Digital Portal',
    color: '#70189F',
    badge: 'CBE',
    iconBg: 'bg-[#70189F]',
    icon: <Building2 className="w-5 h-5 text-white" />,
  },
  {
    id: 'telebirr',
    name: 'Telebirr SuperApp',
    subtitle: 'Ethio Telecom • Mobile Money & Services',
    color: '#7BBF18',
    badge: 'tele',
    iconBg: 'bg-[#7BBF18]',
    icon: <Smartphone className="w-5 h-5 text-white" />,
  },
  {
    id: 'dashen',
    name: 'Dashen Amole',
    subtitle: 'Dashen Bank • Digital Banking & Wallet',
    color: '#004B87',
    badge: 'DB',
    iconBg: 'bg-[#004B87]',
    icon: <CreditCard className="w-5 h-5 text-white" />,
  },
  {
    id: 'sms',
    name: 'Messages & SMS',
    subtitle: 'Google Messages • CBE Alerts & 127 OTP',
    color: '#1A73E8',
    badge: 'SMS',
    iconBg: 'bg-[#1A73E8]',
    icon: <MessageSquare className="w-5 h-5 text-white" />,
  },
  {
    id: 'phone',
    name: 'Phone & *889#',
    subtitle: 'Dialer & CBE Mobile Banking USSD',
    color: '#059669',
    badge: '889',
    iconBg: 'bg-[#059669]',
    icon: <PhoneCall className="w-5 h-5 text-white" />,
  },
  {
    id: 'truecaller',
    name: 'Truecaller',
    subtitle: 'Caller ID & Bank Verification',
    color: '#0284C7',
    badge: 'ID',
    iconBg: 'bg-[#0284C7]',
    icon: <ShieldCheck className="w-5 h-5 text-white" />,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    subtitle: 'CBE Community & Verification Bots',
    color: '#229ED9',
    badge: 'TG',
    iconBg: 'bg-[#229ED9]',
    icon: <Send className="w-5 h-5 text-white" />,
  },
];

export const PhoneRecentAppsModal: React.FC<PhoneRecentAppsModalProps> = ({
  isOpen,
  onClose,
  activeView,
  onSelectApp,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 select-none animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-5 text-white shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold tracking-tight text-neutral-200 uppercase">
              Recent Apps
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable list of apps */}
        <div className="overflow-y-auto py-3 space-y-2.5 scrollbar-none flex-1">
          {APPS.map((app) => {
            const isCurrent = app.id === activeView;
            return (
              <div
                key={app.id}
                onClick={() => {
                  onSelectApp(app.id);
                  onClose();
                }}
                className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.98] border ${
                  isCurrent 
                    ? 'bg-neutral-800 border-neutral-600 shadow-md ring-1 ring-purple-500/40' 
                    : 'bg-neutral-900/90 hover:bg-neutral-800/60 border-neutral-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl ${app.iconBg} flex items-center justify-center shrink-0 shadow-xs`}>
                    {app.icon}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">
                        {app.name}
                      </span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-[10.5px] text-neutral-400 truncate mt-0.5">
                      {app.subtitle}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg shrink-0 transition ${
                    isCurrent 
                      ? 'bg-neutral-700 text-neutral-200' 
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  {isCurrent ? 'Open' : 'Switch'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer: Close All button */}
        <div className="pt-3 border-t border-neutral-800 flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              onSelectApp('main');
              onClose();
            }}
            className="text-xs font-semibold text-neutral-400 hover:text-white px-4 py-1.5 rounded-full hover:bg-neutral-800 transition"
          >
            Clear All & Return to CBE
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhoneRecentAppsModal;

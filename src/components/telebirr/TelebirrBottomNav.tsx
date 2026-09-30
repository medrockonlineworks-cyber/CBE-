import React from 'react';
import { useWallet, SubView } from '../../context/WalletContext';

export interface TelebirrBottomNavProps {
  onScanQr?: () => void;
  className?: string;
}

export const TelebirrBottomNav: React.FC<TelebirrBottomNavProps> = ({
  onScanQr,
  className = '',
}) => {
  const { activeSubView, setActiveSubView, language } = useWallet();

  const getActiveTab = (): 'home' | 'payment' | 'apps' | 'engage' | 'account' => {
    if (activeSubView === '/payment') return 'payment';
    if (activeSubView === '/apps') return 'apps';
    if (activeSubView === '/engage') return 'engage';
    if (activeSubView === '/account') return 'account';
    return 'home';
  };

  const activeTab = getActiveTab();
  const isHomeScreen = activeSubView === 'home';

  const tabs = [
    {
      id: 'home' as const,
      route: 'home' as SubView,
      labelEn: 'Home',
      labelAm: 'መነሻ',
      renderIcon: () => (
        <svg viewBox="0 0 24 24" className="w-[21px] h-[21px]" fill="currentColor" stroke="none">
          <path d="M12 2.5L2 11h3v10h14V11h3L12 2.5z M10 20v-6h4v6h-4z" />
        </svg>
      )
    },
    {
      id: 'payment' as const,
      route: '/payment' as SubView,
      labelEn: 'Payment',
      labelAm: 'ክፍያ',
      renderIcon: () => (
        <svg viewBox="0 0 24 24" className="w-[21px] h-[21px]" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2.5" />
          <line x1="2" y1="9.5" x2="22" y2="9.5" strokeWidth="1.8" />
          <circle cx="17.5" cy="14.5" r="2.8" fill="#0072CE" stroke="currentColor" strokeWidth="1.2" />
          <path d="M16 14.5l1 1 2-2" stroke="white" strokeWidth="1.2" />
        </svg>
      )
    },
    {
      id: 'apps' as const,
      route: '/apps' as SubView,
      labelEn: 'Apps',
      labelAm: 'አፖች',
      renderIcon: () => (
        <svg viewBox="0 0 24 24" className="w-[21px] h-[21px]" fill="currentColor" stroke="none">
          <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
        </svg>
      )
    },
    {
      id: 'engage' as const,
      route: '/engage' as SubView,
      labelEn: 'Engage',
      labelAm: 'መድረክ',
      renderIcon: () => (
        <svg viewBox="0 0 24 24" className="w-[21px] h-[21px]" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          <circle cx="8" cy="11.5" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="11.5" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="16" cy="11.5" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      )
    },
    {
      id: 'account' as const,
      route: '/account' as SubView,
      labelEn: 'Account',
      labelAm: 'መለያ',
      renderIcon: () => (
        <svg viewBox="0 0 24 24" className="w-[21px] h-[21px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="7" r="4" />
          <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
        </svg>
      )
    }
  ];

  const tabIndex = tabs.findIndex(t => t.id === activeTab);
  const indicatorOffsetPercent = (tabIndex * 20) + 10;

  return (
    <div className={`w-full select-none shrink-0 ${className}`}>
      {/* 1. Floating Blue "Scan QR" button directly above tabs on Home screen */}
      {isHomeScreen && (
        <div className="flex justify-center items-center pb-2 px-4 pointer-events-auto">
          <button
            id="telebirr-btn-scan-qr-floating"
            type="button"
            onClick={() => {
              if (onScanQr) onScanQr();
              else setActiveSubView('/qr-scanner');
            }}
            className="w-full max-w-[360px] h-[40px] bg-[#0072CE] hover:bg-[#0060b0] active:scale-[0.98] text-white rounded-xl shadow-[0_3px_12px_rgba(0,114,206,0.32)] flex items-center justify-center gap-2 transition-all cursor-pointer border border-white/20 group"
          >
            {/* White Viewfinder icon */}
            <svg 
              className="w-4.5 h-4.5 text-white shrink-0 group-hover:scale-105 transition-transform" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.4"
            >
              <path d="M3 7V5a2 2 0 0 1 2-2h2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="7" y="7" width="10" height="10" rx="1.5" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            </svg>
            <span className="text-[14px] font-bold text-white tracking-wide">
              Scan QR
            </span>
          </button>
        </div>
      )}

      {/* 2. Solid Opaque #7BBF18 Background Bottom Navigation Bar */}
      <div className="relative w-full">
        {/* Dynamic notch scoop with floating green indicator dot */}
        <div 
          className="absolute -top-2.5 z-30 transition-all duration-300 ease-out pointer-events-none -translate-x-1/2"
          style={{ left: `${indicatorOffsetPercent}%` }}
        >
          <div className="w-[12px] h-[12px] rounded-full bg-[#7BBF18] border-2 border-white shadow-xs" />
        </div>

        <nav
          id="telebirr-bottom-bar"
          aria-label="Telebirr Navigation"
          className="w-full bg-[#7BBF18] px-2 pt-1.5 pb-2 flex justify-around items-center border-t border-white/10"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const label = language === 'am' ? tab.labelAm : tab.labelEn;

            return (
              <button
                key={tab.id}
                id={`telebirr-tab-${tab.id}`}
                type="button"
                onClick={() => setActiveSubView(tab.route)}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                className="flex flex-col items-center justify-center flex-1 py-1 text-white hover:opacity-95 active:scale-95 transition cursor-pointer group"
              >
                <div className={`p-0.5 transition-transform ${isActive ? 'scale-105' : 'opacity-85'}`}>
                  {tab.renderIcon()}
                </div>
                <span className={`text-[10.5px] mt-0.5 tracking-tight ${
                  isActive ? 'font-black text-white' : 'font-medium text-white/85'
                }`}>
                  {label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default TelebirrBottomNav;

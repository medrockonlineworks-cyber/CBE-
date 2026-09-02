import React from 'react';
import { 
  BottomNavHomeIcon, 
  BottomNavTransactionsIcon, 
  BottomNavSettingsIcon 
} from './CbeCustomIcons';

export type NavTabId = 'home' | 'transfer' | 'payments' | 'history' | 'profile' | 'transactions' | 'settings';

interface BottomNavigationProps {
  activeTab?: NavTabId | string;
  onChangeTab?: (tab: NavTabId) => void;
  onOpenScanQr?: () => void;
  showScanQr?: boolean;
  className?: string;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab = 'home',
  onChangeTab,
  onOpenScanQr,
  showScanQr = true,
  className = '',
}) => {
  const isHomeActive = activeTab === 'home';
  const isTransactionActive = activeTab === 'history' || activeTab === 'transactions' || activeTab === 'transaction' || activeTab === 'transfer';
  const isSettingActive = activeTab === 'profile' || activeTab === 'settings' || activeTab === 'setting';

  // The floating Scan QR button MUST ONLY appear on the Home screen and disappear when on Transactions/Settings or when viewing receipts/modals
  const shouldRenderScanQr = showScanQr && isHomeActive;

  return (
    <div className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 pointer-events-none ${className}`}>
      
      {/* 1. Floating Center "Scan QR" Pill Button (Only shown on Home tab when no detail/modal is open) */}
      {shouldRenderScanQr && (
        <div className="flex justify-center items-center pb-2 pointer-events-auto select-none">
          <button
            id="btn-nav-scan-qr"
            type="button"
            aria-label="Scan QR Code"
            onClick={() => {
              if (onOpenScanQr) {
                onOpenScanQr();
              } else {
                onChangeTab?.('transfer');
              }
            }}
            className="bg-[#7d17a3] hover:bg-[#6c128e] active:scale-95 text-white h-[34px] sm:h-[36px] px-2 rounded-full flex items-center justify-center gap-1 shadow-[0_4px_16px_rgba(125,23,163,0.45)] transition-all cursor-pointer border border-white/20 select-none group"
          >
            {/* Left Corner Scanner Brackets (Top & Bottom) */}
            <svg 
              className="w-3 h-5 text-white flex-shrink-0" 
              viewBox="0 0 14 26" 
              fill="none" 
              stroke="currentColor" 
            >
              {/* Top-Left Corner Bracket */}
              <path d="M1 8V4.5C1 2.5 2.5 1 4.5 1H8" strokeWidth="1.8" strokeLinecap="round" />
              <rect x="3.5" y="3.5" width="4.5" height="4.5" rx="1" strokeWidth="1.4" />
              <circle cx="5.75" cy="5.75" r="0.8" fill="currentColor" stroke="none" />

              {/* Bottom-Left Corner Bracket */}
              <path d="M1 18V21.5C1 23.5 2.5 25 4.5 25H8" strokeWidth="1.8" strokeLinecap="round" />
              <rect x="3.5" y="18" width="4.5" height="4.5" rx="1" strokeWidth="1.4" />
              <circle cx="5.75" cy="20.25" r="0.8" fill="currentColor" stroke="none" />
            </svg>

            {/* Centered Text snug against the corner reticles */}
            <span className="text-[12.5px] sm:text-[13px] font-bold tracking-tight text-white whitespace-nowrap leading-none">
              Scan QR
            </span>

            {/* Right Corner Scanner Brackets (Top & Bottom) */}
            <svg 
              className="w-3 h-5 text-white flex-shrink-0" 
              viewBox="0 0 14 26" 
              fill="none" 
              stroke="currentColor" 
            >
              {/* Top-Right Corner Bracket */}
              <path d="M13 8V4.5C13 2.5 11.5 1 9.5 1H6" strokeWidth="1.8" strokeLinecap="round" />
              <rect x="6" y="3.5" width="4.5" height="4.5" rx="1" strokeWidth="1.4" />
              <circle cx="8.25" cy="5.75" r="0.8" fill="currentColor" stroke="none" />

              {/* Bottom-Right Corner Bracket */}
              <path d="M13 18V21.5C13 23.5 11.5 25 9.5 25H6" strokeWidth="1.8" strokeLinecap="round" />
              <rect x="6" y="18" width="4.5" height="4.5" rx="1" strokeWidth="1.4" />
              <circle cx="8.25" cy="20.25" r="0.8" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
      )}

      {/* 2. White Bottom Navigation Bar: Stable Structure (Home | Transactions | Settings) */}
      <nav 
        id="cbe-bottom-navbar" 
        aria-label="Main Navigation"
        className="pointer-events-auto bg-white border-t border-gray-100 px-6 pt-2 pb-[max(env(safe-area-inset-bottom,0px),10px)] flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)] select-none"
      >
        {/* Item 1: Home */}
        <button
          id="nav-tab-home"
          type="button"
          aria-label="Home"
          aria-current={isHomeActive ? 'page' : undefined}
          onClick={() => onChangeTab?.('home')}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[#6b1284] hover:opacity-90 active:scale-95 transition cursor-pointer group"
        >
          <div className={`px-4 py-1 rounded-full flex items-center justify-center transition-all ${
            isHomeActive ? 'bg-[#faeed6]' : 'bg-transparent'
          }`}>
            <BottomNavHomeIcon 
              size={21} 
              color={isHomeActive ? '#6b1284' : '#6b1284cc'}
              className="transition-transform" 
            />
          </div>
          <span className={`text-[11px] mt-0.5 tracking-tight ${isHomeActive ? 'font-black text-[#6b1284]' : 'font-semibold text-[#6b1284]/80'}`}>
            Home
          </span>
        </button>

        {/* Item 2: Transactions (Navigates to Transaction History) */}
        <button
          id="nav-tab-transactions"
          type="button"
          aria-label="Transactions"
          aria-current={isTransactionActive ? 'page' : undefined}
          onClick={() => onChangeTab?.('history')}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[#6b1284] hover:opacity-90 active:scale-95 transition cursor-pointer group"
        >
          <div className={`px-4 py-1 rounded-full flex items-center justify-center transition-all ${
            isTransactionActive ? 'bg-[#faeed6]' : 'bg-transparent'
          }`}>
            <BottomNavTransactionsIcon 
              size={21} 
              color={isTransactionActive ? '#6b1284' : '#6b1284cc'}
              strokeWidth={isTransactionActive ? 2 : 1.7}
              className="transition-transform" 
            />
          </div>
          <span className={`text-[11px] mt-0.5 tracking-tight ${isTransactionActive ? 'font-black text-[#6b1284]' : 'font-semibold text-[#6b1284]/80'}`}>
            Transactions
          </span>
        </button>

        {/* Item 3: Settings */}
        <button
          id="nav-tab-settings"
          type="button"
          aria-label="Settings"
          aria-current={isSettingActive ? 'page' : undefined}
          onClick={() => onChangeTab?.('profile')}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[#6b1284] hover:opacity-90 active:scale-95 transition cursor-pointer group"
        >
          <div className={`px-4 py-1 rounded-full flex items-center justify-center transition-all ${
            isSettingActive ? 'bg-[#faeed6]' : 'bg-transparent'
          }`}>
            <BottomNavSettingsIcon 
              size={20} 
              color={isSettingActive ? '#6b1284' : '#6b1284cc'}
              className="transition-transform" 
            />
          </div>
          <span className={`text-[11px] mt-0.5 tracking-tight ${isSettingActive ? 'font-black text-[#6b1284]' : 'font-semibold text-[#6b1284]/80'}`}>
            Settings
          </span>
        </button>
      </nav>

    </div>
  );
};

export default BottomNavigation;


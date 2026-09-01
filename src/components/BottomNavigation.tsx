import React from 'react';
import { 
  Home, 
  Landmark, 
  Settings 
} from 'lucide-react';

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
            className="bg-[#6b1284] hover:bg-[#5a0e70] active:scale-95 text-white px-5 py-2 rounded-full flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(107,18,132,0.45)] transition-all cursor-pointer border border-purple-300/20"
          >
            {/* Left Viewfinder bracket with center dot */}
            <svg 
              className="w-3.5 h-3.5 text-purple-200" 
              viewBox="0 0 16 16" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M5 2H3a1 1 0 0 0-1 1v2" />
              <path d="M2 11v2a1 1 0 0 0 1 1h2" />
              <rect x="5" y="7" width="2" height="2" fill="currentColor" stroke="none" rx="0.5" />
            </svg>

            {/* Text */}
            <span className="text-[13px] font-bold tracking-tight text-white">Scan QR</span>

            {/* Right Viewfinder bracket with center dot */}
            <svg 
              className="w-3.5 h-3.5 text-purple-200" 
              viewBox="0 0 16 16" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M11 2h2a1 1 0 0 1 1 1v2" />
              <path d="M14 11v2a1 1 0 0 1-1 1h-2" />
              <rect x="9" y="7" width="2" height="2" fill="currentColor" stroke="none" rx="0.5" />
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
            <Home className={`w-5 h-5 transition-transform ${isHomeActive ? 'stroke-[2.4] text-[#6b1284]' : 'stroke-[2] text-[#6b1284]/80'}`} />
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
            <Landmark className={`w-5 h-5 transition-transform ${isTransactionActive ? 'stroke-[2.4] text-[#6b1284]' : 'stroke-[2] text-[#6b1284]/80'}`} />
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
            <Settings className={`w-5 h-5 transition-transform ${isSettingActive ? 'stroke-[2.4] text-[#6b1284]' : 'stroke-[2] text-[#6b1284]/80'}`} />
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


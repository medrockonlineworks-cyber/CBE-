import React from 'react';
import { 
  Home, 
  Landmark, 
  Settings 
} from 'lucide-react';
import { UserProfile } from '../types';

export type TabType = 'home' | 'transfer' | 'payments' | 'history' | 'profile';

interface NavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  currentUser?: UserProfile;
  onOpenAdmin?: () => void;
  onOpenScanQr?: () => void;
  showScanQr?: boolean;
}

export default function Navigation({ 
  activeTab, 
  onChangeTab, 
  onOpenScanQr,
  showScanQr = false 
}: NavigationProps) {
  const isHomeActive = activeTab === 'home';
  const isTransactionActive = activeTab === 'history' || activeTab === 'transfer' || activeTab === 'payments';
  const isSettingActive = activeTab === 'profile';

  const shouldRenderScanQr = showScanQr && isHomeActive;

  return (
    <div className="w-full relative z-40 select-none shrink-0">
      
      {/* 1. Upper Floating Center Scan QR Pill (Only on Home tab) */}
      {shouldRenderScanQr && (
        <div className="absolute -top-10 sm:-top-11 left-0 right-0 flex justify-center items-center pointer-events-auto z-50">
          <button
            id="btn-nav-scan-qr"
            type="button"
            aria-label="Scan QR Code"
            onClick={() => {
              if (onOpenScanQr) {
                onOpenScanQr();
              } else {
                onChangeTab('transfer');
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

            <span className="tracking-tight text-[13px] font-bold">Scan QR</span>

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

      {/* 2. Primary Bottom Bar: Stable Structure (Home | Transactions | Settings) */}
      <nav 
        id="cbe-bottom-navbar" 
        aria-label="Main Navigation"
        className="pointer-events-auto bg-white border-t border-gray-100 px-6 pt-2 pb-[max(env(safe-area-inset-bottom,0px),12px)] flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
      >
        {/* Item 1: Home */}
        <button
          id="nav-tab-home"
          type="button"
          aria-label="Home"
          aria-current={isHomeActive ? 'page' : undefined}
          onClick={() => onChangeTab('home')}
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
          onClick={() => onChangeTab('history')}
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
          onClick={() => onChangeTab('profile')}
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
}


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
}

export default function Navigation({ 
  activeTab, 
  onChangeTab, 
  onOpenScanQr 
}: NavigationProps) {
  const isHomeActive = activeTab === 'home';
  const isTransactionActive = activeTab === 'transfer' || activeTab === 'history' || activeTab === 'payments';
  const isSettingActive = activeTab === 'profile';

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 pointer-events-none select-none">
      
      {/* 1. Upper Floating Center Scan QR Pill */}
      <div className="flex justify-center items-center pb-2 pointer-events-auto">
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

      {/* 2. Primary Bottom Bar: Stable Structure (Home | Transaction | Setting) */}
      <nav 
        id="cbe-bottom-navbar" 
        aria-label="Main Navigation"
        className="pointer-events-auto bg-white border-t border-gray-100 px-6 pt-2 pb-[max(env(safe-area-inset-bottom,0px),10px)] flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
      >
        {/* Item 1: Home */}
        <button
          id="nav-tab-home"
          type="button"
          aria-label="Home"
          aria-current={isHomeActive ? 'page' : undefined}
          onClick={() => onChangeTab('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[#6b1284] hover:opacity-85 active:scale-95 transition cursor-pointer group ${
            isHomeActive ? 'opacity-100' : 'opacity-85'
          }`}
        >
          <Home className={`w-6 h-6 transition-transform group-hover:scale-105 ${isHomeActive ? 'stroke-[2.6]' : 'stroke-[2.2]'}`} />
          <span className={`text-[11px] mt-1 tracking-tight ${isHomeActive ? 'font-black' : 'font-semibold'}`}>
            Home
          </span>
        </button>

        {/* Item 2: Transaction */}
        <button
          id="nav-tab-transaction"
          type="button"
          aria-label="Transaction"
          aria-current={isTransactionActive ? 'page' : undefined}
          onClick={() => onChangeTab('transfer')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[#6b1284] hover:opacity-85 active:scale-95 transition cursor-pointer group ${
            isTransactionActive ? 'opacity-100' : 'opacity-85'
          }`}
        >
          <Landmark className={`w-6 h-6 transition-transform group-hover:scale-105 ${isTransactionActive ? 'stroke-[2.6]' : 'stroke-[2.2]'}`} />
          <span className={`text-[11px] mt-1 tracking-tight ${isTransactionActive ? 'font-black' : 'font-semibold'}`}>
            Transaction
          </span>
        </button>

        {/* Item 3: Setting */}
        <button
          id="nav-tab-setting"
          type="button"
          aria-label="Setting"
          aria-current={isSettingActive ? 'page' : undefined}
          onClick={() => onChangeTab('profile')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[#6b1284] hover:opacity-85 active:scale-95 transition cursor-pointer group ${
            isSettingActive ? 'opacity-100' : 'opacity-85'
          }`}
        >
          <Settings className={`w-6 h-6 transition-transform group-hover:scale-105 ${isSettingActive ? 'stroke-[2.6]' : 'stroke-[2.2]'}`} />
          <span className={`text-[11px] mt-1 tracking-tight ${isSettingActive ? 'font-black' : 'font-semibold'}`}>
            Setting
          </span>
        </button>
      </nav>

    </div>
  );
}

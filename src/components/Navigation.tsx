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
  currentUser: UserProfile;
  onOpenAdmin?: () => void;
  onOpenScanQr?: () => void;
}

export default function Navigation({ 
  activeTab, 
  onChangeTab, 
  currentUser, 
  onOpenScanQr 
}: NavigationProps) {
  const isHomeActive = activeTab === 'home';
  const isBankActive = activeTab === 'transfer';
  const isSettingActive = activeTab === 'profile';

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 pointer-events-none">
      
      {/* 1. Upper Floating Center Scan QR Pill */}
      <div className="flex justify-center items-center pb-2 pointer-events-auto">
        <button
          id="btn-nav-scan-qr"
          onClick={() => {
            if (onOpenScanQr) {
              onOpenScanQr();
            } else {
              onChangeTab('transfer');
            }
          }}
          className="bg-[#61167e] hover:bg-[#52106b] active:scale-95 text-white px-5 py-2 rounded-2xl flex items-center gap-2 font-bold text-xs shadow-[0_4px_14px_rgba(97,22,126,0.35)] transition cursor-pointer border border-purple-400/20"
        >
          <div className="relative flex items-center justify-center">
            {/* Viewfinder corner brackets styling */}
            <div className="w-4 h-4 border-2 border-dashed border-purple-200/80 rounded-xs flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-xs" />
            </div>
          </div>
          <span className="tracking-tight text-[13px]">Scan QR</span>
        </button>
      </div>

      {/* 2. Primary Bottom Bar: Home (Peach Pill) | Bank (Center) | Settings (Right) */}
      <nav 
        id="cbe-bottom-navbar" 
        className="pointer-events-auto bg-white border-t border-gray-100 px-6 pt-2 pb-[max(env(safe-area-inset-bottom,0px),8px)] flex justify-between items-center shadow-lg"
      >
        {/* Left: Home (Peach/Sand Active Pill or Inactive Icon) */}
        {isHomeActive ? (
          <button
            id="nav-tab-home"
            onClick={() => onChangeTab('home')}
            className="flex items-center gap-2 bg-[#fdf3e2] text-[#61167e] px-4 py-2 rounded-full font-bold text-xs transition cursor-pointer shadow-xs active:scale-95 border border-[#fae6c8]"
          >
            <Home className="w-4 h-4 fill-[#61167e] stroke-[#61167e]" />
            <span className="text-xs font-extrabold tracking-tight">Home</span>
          </button>
        ) : (
          <button
            id="nav-tab-home-inactive"
            onClick={() => onChangeTab('home')}
            className="p-2 text-[#61167e] hover:bg-purple-50 rounded-xl transition cursor-pointer"
            title="Home"
          >
            <Home className="w-6 h-6 stroke-[2]" />
          </button>
        )}

        {/* Center: Bank / Landmark Icon */}
        <button
          id="nav-tab-bank-center"
          onClick={() => onChangeTab('transfer')}
          className={`p-2 transition cursor-pointer flex items-center justify-center rounded-xl ${
            isBankActive ? 'text-[#61167e] scale-110 font-bold' : 'text-[#61167e] hover:bg-purple-50'
          }`}
          title="Bank Transfers"
        >
          <Landmark className="w-6 h-6 stroke-[2.2]" />
        </button>

        {/* Right: Settings Gear Icon */}
        <button
          id="nav-tab-settings-right"
          onClick={() => onChangeTab('profile')}
          className={`p-2 transition cursor-pointer flex items-center justify-center rounded-xl ${
            isSettingActive ? 'text-[#61167e] scale-110 font-bold' : 'text-[#61167e] hover:bg-purple-50'
          }`}
          title="Settings"
        >
          <Settings className="w-6 h-6 stroke-[2.2]" />
        </button>
      </nav>

    </div>
  );
}


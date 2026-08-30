import React from 'react';
import { 
  Home, 
  Landmark, 
  Settings,
  LayoutGrid,
  QrCode
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
  const isPaymentsActive = activeTab === 'payments';
  const isSettingActive = activeTab === 'profile';

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 pointer-events-none">
      
      {/* 1. Upper Floating Center Scan QR Pill */}
      <div className="flex justify-center items-center pb-1 pointer-events-auto">
        <button
          id="btn-nav-scan-qr"
          onClick={() => {
            if (onOpenScanQr) {
              onOpenScanQr();
            } else {
              onChangeTab('transfer');
            }
          }}
          className="bg-[#68137e] hover:bg-[#530d66] active:scale-95 text-white px-4 py-1.5 rounded-2xl flex items-center gap-1.5 font-bold text-xs shadow-[0_4px_14px_rgba(104,19,126,0.4)] transition cursor-pointer border border-purple-300/30 backdrop-blur-xs"
        >
          {/* Custom QR viewfinder graphic matching CBE mobile */}
          <div className="w-3.5 h-3.5 border-2 border-purple-200 rounded-[3px] flex items-center justify-center p-0.5">
            <div className="w-1 h-1 bg-white rounded-xs" />
          </div>
          <span className="tracking-tight text-[12px] font-extrabold">Scan QR</span>
        </button>
      </div>

      {/* 2. Primary Bottom Bar: Home (Peach Pill) | Bank | (Scan QR Space) | Grid | Settings */}
      <nav 
        id="cbe-bottom-navbar" 
        className="pointer-events-auto bg-white border-t border-gray-100/90 px-4 pt-1.5 pb-[max(env(safe-area-inset-bottom,0px),8px)] flex justify-between items-center shadow-lg"
      >
        {/* Item 1: Home (Warm Peach/Cream Active Pill or Icon) */}
        {isHomeActive ? (
          <button
            id="nav-tab-home"
            onClick={() => onChangeTab('home')}
            className="flex items-center gap-1.5 bg-[#fae7cb] text-[#68137e] px-3.5 py-1.5 rounded-full font-extrabold text-xs transition cursor-pointer shadow-xs active:scale-95 border border-[#f3d9b4]"
          >
            <Home className="w-4 h-4 fill-[#68137e] stroke-[#68137e]" />
            <span className="text-xs font-black tracking-tight">Home</span>
          </button>
        ) : (
          <button
            id="nav-tab-home-inactive"
            onClick={() => onChangeTab('home')}
            className="p-2 text-[#68137e] hover:bg-purple-50 rounded-xl transition cursor-pointer"
            title="Home"
          >
            <Home className="w-5 h-5 stroke-[2.2]" />
          </button>
        )}

        {/* Item 2: Bank / Landmark Icon */}
        <button
          id="nav-tab-bank-center"
          onClick={() => onChangeTab('transfer')}
          className={`p-2 transition cursor-pointer flex items-center justify-center rounded-xl ${
            isBankActive ? 'text-[#68137e] bg-purple-50 scale-105 font-bold' : 'text-[#68137e] hover:bg-purple-50'
          }`}
          title="Bank Transfers"
        >
          <Landmark className="w-5 h-5 stroke-[2.2]" />
        </button>

        {/* Item 3: Empty spacer for floating scan QR center pill */}
        <div className="w-10 h-5" />

        {/* Item 4: Grid / Services Launcher Icon */}
        <button
          id="nav-tab-services-grid"
          onClick={() => onChangeTab('payments')}
          className={`p-2 transition cursor-pointer flex items-center justify-center rounded-xl ${
            isPaymentsActive ? 'text-[#68137e] bg-purple-50 scale-105 font-bold' : 'text-[#68137e] hover:bg-purple-50'
          }`}
          title="Payments & Services"
        >
          <LayoutGrid className="w-5 h-5 stroke-[2.2]" />
        </button>

        {/* Item 5: Settings Gear Icon */}
        <button
          id="nav-tab-settings-right"
          onClick={() => onChangeTab('profile')}
          className={`p-2 transition cursor-pointer flex items-center justify-center rounded-xl ${
            isSettingActive ? 'text-[#68137e] bg-purple-50 scale-105 font-bold' : 'text-[#68137e] hover:bg-purple-50'
          }`}
          title="Settings & Profile"
        >
          <Settings className="w-5 h-5 stroke-[2.2]" />
        </button>
      </nav>

    </div>
  );
}


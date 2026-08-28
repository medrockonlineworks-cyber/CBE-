import React from 'react';
import { 
  Home, 
  Landmark, 
  QrCode, 
  Building2, 
  Settings,
  Scan,
  ShieldAlert
} from 'lucide-react';
import { UserProfile } from '../types';

export type TabType = 'home' | 'transfer' | 'payments' | 'history' | 'profile';

interface NavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  currentUser: UserProfile;
  onOpenAdmin: () => void;
  onOpenScanQr?: () => void;
}

export default function Navigation({ 
  activeTab, 
  onChangeTab, 
  currentUser, 
  onOpenAdmin,
  onOpenScanQr 
}: NavigationProps) {
  const isSystemAdmin = currentUser.role === 'admin' || currentUser.email === 'leykunjemaneh3@gmail.com';

  return (
    <div className="w-full">
      {/* CBE Signature Mobile Bottom Navigation Bar */}
      <nav 
        id="cbe-bottom-navbar" 
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/98 backdrop-blur-md border-t border-gray-100 px-3 py-2 flex justify-between items-center z-40 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
      >
        {/* 1. Home Tab (Active Pill or Standard) */}
        {activeTab === 'home' ? (
          <button
            id="nav-tab-home"
            onClick={() => onChangeTab('home')}
            className="flex items-center gap-1.5 bg-[#fdf3e2] text-[#61167e] px-4 py-2 rounded-full font-bold text-xs transition cursor-pointer shadow-xs active:scale-95"
          >
            <Home className="w-4 h-4 fill-[#61167e] stroke-[#61167e]" />
            <span>Home</span>
          </button>
        ) : (
          <button
            id="nav-tab-home-inactive"
            onClick={() => onChangeTab('home')}
            className="p-2 text-gray-500 hover:text-[#61167e] transition cursor-pointer"
            title="Home"
          >
            <Home className="w-5 h-5" />
          </button>
        )}

        {/* 2. Bank / Branches Tab */}
        <button
          id="nav-tab-transfer"
          onClick={() => onChangeTab('transfer')}
          className={`p-2 transition cursor-pointer flex flex-col items-center ${
            activeTab === 'transfer' ? 'text-[#61167e] scale-110 font-bold' : 'text-gray-500 hover:text-[#61167e]'
          }`}
          title="Transfer & Services"
        >
          <Landmark className="w-5 h-5" />
        </button>

        {/* 3. Center Floating Pill Button: Scan QR */}
        <button
          id="btn-nav-scan-qr"
          onClick={() => {
            if (onOpenScanQr) {
              onOpenScanQr();
            } else {
              onChangeTab('transfer');
            }
          }}
          className="bg-[#61167e] hover:bg-[#52106b] active:scale-95 text-white px-3.5 py-1.5 rounded-full flex items-center gap-1.5 font-extrabold text-xs shadow-md transition cursor-pointer border border-purple-400/20"
        >
          <div className="relative flex items-center justify-center">
            <Scan className="w-4 h-4 text-white" />
            <div className="absolute w-1.5 h-1.5 bg-white rounded-xs" />
          </div>
          <span>Scan QR</span>
        </button>

        {/* 4. Corporate / Payments History Tab */}
        <button
          id="nav-tab-history"
          onClick={() => onChangeTab('history')}
          className={`p-2 transition cursor-pointer flex flex-col items-center ${
            activeTab === 'history' || activeTab === 'payments' ? 'text-[#61167e] scale-110 font-bold' : 'text-gray-500 hover:text-[#61167e]'
          }`}
          title="History & Statements"
        >
          <Building2 className="w-5 h-5" />
        </button>

        {/* 5. Settings / Profile Tab */}
        <button
          id="nav-tab-profile"
          onClick={() => onChangeTab('profile')}
          className={`p-2 transition cursor-pointer flex flex-col items-center ${
            activeTab === 'profile' ? 'text-[#61167e] scale-110 font-bold' : 'text-gray-500 hover:text-[#61167e]'
          }`}
          title="Settings & Profile"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* If Admin, show a floating badge */}
        {isSystemAdmin && (
          <button
            id="btn-quick-admin"
            onClick={onOpenAdmin}
            className="absolute -top-12 right-4 bg-slate-900 text-amber-300 p-2.5 rounded-full shadow-lg hover:scale-110 active:scale-95 transition border border-slate-800"
            title="Open Admin Dashboard"
          >
            <ShieldAlert className="w-5 h-5 text-amber-400 animate-pulse" />
          </button>
        )}
      </nav>
    </div>
  );
}

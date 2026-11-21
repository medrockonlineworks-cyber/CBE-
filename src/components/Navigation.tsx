import React, { useState, useEffect } from 'react';
import { 
  BottomNavHomeIcon, 
  BottomNavTransactionsIcon, 
  BottomNavSettingsIcon 
} from './CbeCustomIcons';
import { UserProfile } from '../types';
import { PhoneSettingsService } from '../services/phoneSettingsService';

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
  const [isIPhone, setIsIPhone] = useState<boolean>(() => PhoneSettingsService.isIPhoneMode());

  useEffect(() => {
    return PhoneSettingsService.subscribe(() => {
      setIsIPhone(PhoneSettingsService.isIPhoneMode());
    });
  }, []);

  const isHomeActive = activeTab === 'home';
  const isTransactionActive = activeTab === 'history' || activeTab === 'transfer' || activeTab === 'payments';
  const isSettingActive = activeTab === 'profile';

  const shouldRenderScanQr = showScanQr && isHomeActive;

  return (
    <div className="w-full relative z-50 select-none shrink-0 bg-white">
      
      {/* 1. Floating Center "Scan QR" Pill Button (Clean clearance above bottom bar - Zero overlap to button) */}
      {shouldRenderScanQr && (
        <div className="absolute bottom-[calc(100%+6px)] sm:bottom-[calc(100%+8px)] left-0 right-0 flex justify-center items-center pointer-events-auto select-none z-50">
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
            className="bg-[#70189F] hover:bg-[#5a1280] active:scale-95 text-white h-[34px] sm:h-[36px] px-2.5 sm:px-3 rounded-full flex items-center justify-center gap-1 shadow-[0_4px_14px_rgba(112,24,159,0.35)] transition-all cursor-pointer border border-white/30 select-none group"
          >
            {/* Left Corner Scanner Brackets (Top & Bottom) */}
            <svg 
              className="w-2 h-4 text-white flex-shrink-0" 
              viewBox="0 0 14 26" 
              fill="none" 
              stroke="currentColor" 
            >
              <path d="M1 8V4.5C1 2.5 2.5 1 4.5 1H8" strokeWidth="1.8" strokeLinecap="round" />
              <rect x="3.5" y="3.5" width="4.5" height="4.5" rx="1" strokeWidth="1.4" />
              <circle cx="5.75" cy="5.75" r="0.8" fill="currentColor" stroke="none" />
              <path d="M1 18V21.5C1 23.5 2.5 25 4.5 25H8" strokeWidth="1.8" strokeLinecap="round" />
              <rect x="3.5" y="18" width="4.5" height="4.5" rx="1" strokeWidth="1.4" />
              <circle cx="5.75" cy="20.25" r="0.8" fill="currentColor" stroke="none" />
            </svg>

            {/* Centered Text */}
            <span className="text-[11.5px] sm:text-[12px] font-bold tracking-tight text-white whitespace-nowrap leading-none">
              Scan QR
            </span>

            {/* Right Corner Scanner Brackets (Top & Bottom) */}
            <svg 
              className="w-2 h-4 text-white flex-shrink-0" 
              viewBox="0 0 14 26" 
              fill="none" 
              stroke="currentColor" 
            >
              <path d="M13 8V4.5C13 2.5 11.5 1 9.5 1H6" strokeWidth="1.8" strokeLinecap="round" />
              <rect x="6" y="3.5" width="4.5" height="4.5" rx="1" strokeWidth="1.4" />
              <circle cx="8.25" cy="5.75" r="0.8" fill="currentColor" stroke="none" />
              <path d="M13 18V21.5C13 23.5 11.5 25 9.5 25H6" strokeWidth="1.8" strokeLinecap="round" />
              <rect x="6" y="18" width="4.5" height="4.5" rx="1" strokeWidth="1.4" />
              <circle cx="8.25" cy="20.25" r="0.8" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
      )}

      {/* 2. White Bottom Navigation Bar - Flush down to the edge of device for iPhone */}
      <nav 
        id="cbe-bottom-navbar" 
        aria-label="Main Navigation"
        className={`w-full pointer-events-auto bg-white border-t border-gray-100/50 px-6 select-none shrink-0 flex justify-between items-center ${
          isIPhone 
            ? 'pt-1.5 pb-[1px]' 
            : 'pt-2 pb-[1px]'
        }`}
      >
        {/* Item 1: Home */}
        <button
          id="nav-tab-home"
          type="button"
          aria-label="Home"
          aria-current={isHomeActive ? 'page' : undefined}
          onClick={() => onChangeTab('home')}
          className="flex flex-col items-center justify-center flex-1 pt-0.5 pb-0 text-[#70189F] hover:opacity-90 active:scale-95 transition cursor-pointer group"
        >
          <div className={`w-[54px] sm:w-[56px] h-[26px] sm:h-[28px] rounded-full flex items-center justify-center transition-all ${
            isHomeActive ? 'bg-[#faeed6]' : 'bg-transparent'
          }`}>
            <BottomNavHomeIcon 
              size={18} 
              color={isHomeActive ? '#70189F' : '#70189Faa'}
              className="transition-transform" 
            />
          </div>
          <span className={`text-[11px] sm:text-[11.5px] mt-1 mb-0 tracking-tight leading-none ${isHomeActive ? 'font-bold text-[#70189F]' : 'font-medium text-[#70189F]/75'}`}>
            Home
          </span>
        </button>

        {/* Item 2: Transactions */}
        <button
          id="nav-tab-transactions"
          type="button"
          aria-label="Transactions"
          aria-current={isTransactionActive ? 'page' : undefined}
          onClick={() => onChangeTab('history')}
          className="flex flex-col items-center justify-center flex-1 pt-0.5 pb-0 text-[#70189F] hover:opacity-90 active:scale-95 transition cursor-pointer group"
        >
          <div className={`w-[54px] sm:w-[56px] h-[26px] sm:h-[28px] rounded-full flex items-center justify-center transition-all ${
            isTransactionActive ? 'bg-[#faeed6]' : 'bg-transparent'
          }`}>
            <BottomNavTransactionsIcon 
              size={19} 
              color={isTransactionActive ? '#70189F' : '#70189Faa'}
              strokeWidth={isTransactionActive ? 2 : 1.7}
              className="transition-transform" 
            />
          </div>
          <span className={`text-[11px] sm:text-[11.5px] mt-1 mb-0 tracking-tight leading-none ${isTransactionActive ? 'font-bold text-[#70189F]' : 'font-medium text-[#70189F]/75'}`}>
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
          className="flex flex-col items-center justify-center flex-1 pt-0.5 pb-0 text-[#70189F] hover:opacity-90 active:scale-95 transition cursor-pointer group"
        >
          <div className={`w-[54px] sm:w-[56px] h-[26px] sm:h-[28px] rounded-full flex items-center justify-center transition-all ${
            isSettingActive ? 'bg-[#faeed6]' : 'bg-transparent'
          }`}>
            <BottomNavSettingsIcon 
              size={19} 
              color={isSettingActive ? '#70189F' : '#70189Faa'}
              className="transition-transform" 
            />
          </div>
          <span className={`text-[11px] sm:text-[11.5px] mt-1 mb-0 tracking-tight leading-none ${isSettingActive ? 'font-bold text-[#70189F]' : 'font-medium text-[#70189F]/75'}`}>
            Settings
          </span>
        </button>
      </nav>
    </div>
  );
}

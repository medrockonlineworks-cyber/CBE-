import React from 'react';
import { Search, Bell } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import LanguageTicker from './LanguageTicker';
import { TelebirrRipples, TelebirrSolidAvatar, EthioTelecomLogo, TelebirrLogo } from '../TelebirrBrandAssets';

export interface WalletHeaderProps {
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenLanguage?: () => void;
  className?: string;
}

// Delicate 6-spoke rounded star asterisk component
export const SixSpokeAsterisk: React.FC<{ size?: number; className?: string }> = ({ 
  size = 10.5, 
  className = "text-white" 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3.4" 
      strokeLinecap="round"
      className={`shrink-0 drop-shadow-xs ${className}`}
    >
      {/* 3 spokes at 0, 60, and 120 degrees crossing through center (12, 12) */}
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="4.2" y1="7.5" x2="19.8" y2="16.5" />
      <line x1="4.2" y1="16.5" x2="19.8" y2="7.5" />
    </svg>
  );
};

// Small delicate almond eye icon (13.5px × 9px, stroke 1.4px)
export const AlmondEyeIcon: React.FC<{
  isClosed?: boolean;
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
}> = ({
  isClosed = false,
  width = 13.5,
  height = 9,
  strokeWidth = 1.4,
  className = "text-white"
}) => {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 16 11" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={`shrink-0 ${className}`}
    >
      {isClosed ? (
        <>
          <path d="M1.5 5.5 C4.5 1.5, 11.5 1.5, 14.5 5.5 C11.5 9.5, 4.5 9.5, 1.5 5.5 Z" />
          <line x1="2.5" y1="9.5" x2="13.5" y2="1.5" />
        </>
      ) : (
        <>
          <path d="M1.5 5.5 C4.5 1.5, 11.5 1.5, 14.5 5.5 C11.5 9.5, 4.5 9.5, 1.5 5.5 Z" />
          <circle cx="8" cy="5.5" r="2.2" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
};

// Format currency
const formatETB = (amount: number) => {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const WalletHeader: React.FC<WalletHeaderProps> = ({
  onOpenSearch,
  onOpenNotifications,
  onOpenProfile,
  onOpenLanguage,
  className = '',
}) => {
  const {
    balance,
    endekiseBalance,
    rewardBalance,
    isBalanceVisible,
    isEndekiseVisible,
    isRewardVisible,
    toggleMainBalance,
    toggleEndekiseBalance,
    toggleRewardBalance,
    notificationCount,
    userName,
    language,
    customHeaderBgImage,
    setActiveSubView
  } = useWallet();

  const greetingPrefix = language === 'am' ? 'ሰላም, ' : 'Selam, ';

  return (
    <header className="w-full flex flex-col select-none">
      {/* Top Header Card: EXACT fixed height 196px, zero layout shift */}
      <div
        id="telebirr-wallet-header-card"
        className={`w-full h-[196px] max-h-[196px] min-h-[196px] relative overflow-hidden bg-[#7BBF18] flex flex-col justify-between px-3.5 pt-2.5 pb-2 text-white shadow-md ${className}`}
        style={customHeaderBgImage ? {
          backgroundImage: `url(${customHeaderBgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        {/* Authentic Telebirr Dual-Focal Wave Contour Lines Overlay */}
        {!customHeaderBgImage && (
          <TelebirrRipples className="absolute inset-0 w-full h-full pointer-events-none opacity-90" />
        )}

        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

        {/* 1. Top Greeting Row */}
        <div className="relative z-10 flex items-center justify-between gap-2 h-[42px]">
          {/* Left: Avatar + Greeting */}
          <div 
            onClick={() => {
              if (onOpenProfile) onOpenProfile();
              else setActiveSubView('/account');
            }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            {/* White circular silhouette profile avatar (38px-40px) */}
            <div className="w-[38px] h-[38px] rounded-full bg-white/20 p-1 flex items-center justify-center backdrop-blur-xs shadow-xs group-hover:bg-white/30 transition">
              <svg viewBox="0 0 24 24" className="w-full h-full fill-white" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="7" r="4.2" />
                <path d="M4 21 C4 15.6 7.6 13 12 13 C16.4 13 20 15.6 20 21 Z" />
              </svg>
            </div>

            {/* Greeting: "Selam, Leykun" in bold white text */}
            <div className="flex flex-col">
              <span className="text-[17px] font-bold text-white tracking-normal drop-shadow-xs truncate max-w-[155px]">
                {greetingPrefix}{userName || 'Leykun'}
              </span>
            </div>
          </div>

          {/* Right Action Controls: Search, Notification Bell, LanguageTicker */}
          <div className="flex items-center gap-2">
            {/* Search Icon (white outline) */}
            <button
              id="telebirr-btn-search"
              type="button"
              aria-label="Search Telebirr"
              onClick={onOpenSearch}
              className="p-1.5 rounded-full hover:bg-white/18 active:scale-90 text-white transition cursor-pointer flex items-center justify-center"
            >
              <Search className="w-[19px] h-[19px] text-white" strokeWidth={2} />
            </button>

            {/* Notification bell with red badge ("2") */}
            <button
              id="telebirr-btn-notifications"
              type="button"
              aria-label="Notifications"
              onClick={onOpenNotifications}
              className="p-1.5 rounded-full hover:bg-white/18 active:scale-90 text-white transition cursor-pointer relative flex items-center justify-center"
            >
              <Bell className="w-[20px] h-[20px] text-white" strokeWidth={2} />
              {notificationCount > 0 && (
                <span className="absolute 0 top-0.5 right-0.5 bg-[#E52E2E] text-white text-[10px] font-extrabold w-[16px] h-[16px] rounded-full flex items-center justify-center border border-[#7BBF18] shadow-xs">
                  {notificationCount}
                </span>
              )}
            </button>

            {/* Language Switcher Dropdown */}
            <LanguageTicker onClick={onOpenLanguage} />
          </div>
        </div>

        {/* 2. Center Main Balance Row: strictly locked 44px height container for zero layout shift */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto">
          {/* Label + Eye Toggle */}
          <div 
            onClick={toggleMainBalance}
            className="inline-flex items-center gap-1.5 cursor-pointer text-white/95 hover:text-white select-none transition group"
          >
            <span className="text-[15px] font-semibold tracking-normal drop-shadow-xs">
              {language === 'am' ? 'ሂሳብ (ብር)' : 'Balance (ETB)'}
            </span>
            <span 
              className="p-1 rounded-full group-hover:bg-white/15 transition flex items-center justify-center"
              title={isBalanceVisible ? 'Hide Balance' : 'Show Balance'}
            >
              <AlmondEyeIcon 
                isClosed={!isBalanceVisible} 
                width={13.5} 
                height={9} 
                strokeWidth={1.4} 
              />
            </span>
          </div>

          {/* Amount: Exactly 1,930.26 or six 6-spoke rounded star asterisks locked inside 44px container */}
          <div 
            id="telebirr-main-balance-container"
            onClick={toggleMainBalance}
            className="h-[44px] max-h-[44px] min-h-[44px] flex items-center justify-center cursor-pointer select-none"
            title="Tap to toggle balance visibility"
          >
            {isBalanceVisible ? (
              <span className="text-[35px] font-extrabold tracking-tight text-white drop-shadow-sm font-sans leading-none">
                {formatETB(balance)}
              </span>
            ) : (
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <SixSpokeAsterisk key={idx} size={10.5} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. Sub-Balances Row (Endekise & Reward): Two Columns */}
        <div className="relative z-10 grid grid-cols-2 gap-4 px-2 pb-1">
          {/* Left: Endekise (ETB) */}
          <div className="flex flex-col items-start select-none">
            <div 
              onClick={toggleEndekiseBalance}
              className="inline-flex items-center gap-1 cursor-pointer text-white/90 hover:text-white transition group"
            >
              <span className="text-[13px] font-semibold tracking-normal drop-shadow-xs">
                {language === 'am' ? 'እንደኪሴ (ብር)' : 'Endekise (ETB)'}
              </span>
              <span className="p-0.5 rounded-full group-hover:bg-white/15 transition flex items-center justify-center">
                <AlmondEyeIcon 
                  isClosed={!isEndekiseVisible} 
                  width={11.5} 
                  height={7.5} 
                  strokeWidth={1.4} 
                />
              </span>
            </div>

            <div 
              onClick={toggleEndekiseBalance}
              className="h-[22px] flex items-center cursor-pointer"
            >
              {isEndekiseVisible ? (
                <span className="text-[16.5px] font-bold text-white tracking-normal font-sans">
                  {formatETB(endekiseBalance)}
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <SixSpokeAsterisk key={idx} size={7.5} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Reward (ETB) */}
          <div className="flex flex-col items-start pl-2 select-none">
            <div 
              onClick={toggleRewardBalance}
              className="inline-flex items-center gap-1 cursor-pointer text-white/90 hover:text-white transition group"
            >
              <span className="text-[13px] font-semibold tracking-normal drop-shadow-xs">
                {language === 'am' ? 'ሪዋርድ (ብር)' : 'Reward (ETB)'}
              </span>
              <span className="p-0.5 rounded-full group-hover:bg-white/15 transition flex items-center justify-center">
                <AlmondEyeIcon 
                  isClosed={!isRewardVisible} 
                  width={11.5} 
                  height={7.5} 
                  strokeWidth={1.4} 
                />
              </span>
            </div>

            <div 
              onClick={toggleRewardBalance}
              className="h-[22px] flex items-center cursor-pointer"
            >
              {isRewardVisible ? (
                <span className="text-[16.5px] font-bold text-white tracking-normal font-sans">
                  {formatETB(rewardBalance)}
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <SixSpokeAsterisk key={idx} size={7.5} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};

export default WalletHeader;

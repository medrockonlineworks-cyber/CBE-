import React, { useState, useEffect } from 'react';
import { 
  PhoneSettingsService, 
  PhoneSettings,
  NavigationBarStyle
} from '../services/phoneSettingsService';

export interface PhoneNavigationBarProps {
  onBack?: () => void;
  onHome?: () => void;
  onRecents?: () => void;
  theme?: 'cbe' | 'dark' | 'light';
  className?: string;
  forceStyle?: NavigationBarStyle;
}

export const PhoneNavigationBar: React.FC<PhoneNavigationBarProps> = ({
  onBack,
  onHome,
  onRecents,
  theme = 'cbe',
  className = '',
  forceStyle,
}) => {
  const [settings, setSettings] = useState<PhoneSettings>(() => PhoneSettingsService.getSettings());
  const [isIPhone, setIsIPhone] = useState<boolean>(() => PhoneSettingsService.isIPhoneMode());

  useEffect(() => {
    return PhoneSettingsService.subscribe((newSettings) => {
      setSettings(newSettings);
      setIsIPhone(PhoneSettingsService.isIPhoneMode());
    });
  }, []);

  const navStyle = forceStyle || settings.navBarStyle || (isIPhone ? 'gesture' : 'buttons');
  const isCbe = theme === 'cbe';
  const isDark = theme === 'dark' || isCbe;

  const handleRecentsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRecents) {
      onRecents();
    } else {
      window.dispatchEvent(new CustomEvent('cbe_phone_recents'));
    }
  };

  const handleHomeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onHome) {
      onHome();
    } else {
      window.dispatchEvent(new CustomEvent('cbe_phone_home'));
    }
  };

  const handleBackClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBack) {
      onBack();
    } else {
      window.dispatchEvent(new CustomEvent('cbe_phone_back'));
    }
  };

  const hasCustomBg = className.includes('bg-');

  // 1. iPhone Edge-to-Edge Navigation System (matching iOS Home Indicator)
  // Continuous background extending to bottom edge with centered iOS Home Indicator Bar
  if (isIPhone || navStyle === 'gesture') {
    const bgContainer = hasCustomBg 
      ? '' 
      : isDark 
      ? 'bg-transparent text-white' 
      : 'bg-transparent text-black';

    return (
      <div 
        id="cbe-ios-home-indicator-container"
        className={`w-full shrink-0 flex flex-col items-center justify-center pointer-events-none select-none pt-1.5 pb-[max(env(safe-area-inset-bottom,0px),8px)] ${bgContainer} ${className}`}
      >
        <div 
          id="cbe-ios-home-indicator"
          className={`w-32 sm:w-36 h-1 sm:h-[4.5px] rounded-full transition-colors ${
            isDark ? 'bg-white/90 shadow-[0_1px_4px_rgba(0,0,0,0.6)]' : 'bg-black/90 shadow-[0_1px_3px_rgba(0,0,0,0.2)]'
          }`} 
        />
      </div>
    );
  }

  // 2. Android 3-Button Navigation Bar
  // [ ≡  ○  ⊃ ] Edge-to-edge soft keys: Theme aligned (dark background for dark subapps, white for light)
  if (navStyle === 'buttons') {
    const barBackgroundClass = isDark 
      ? 'bg-[#121214] border-neutral-800/80 shadow-[0_-1px_4px_rgba(0,0,0,0.5)]'
      : 'bg-white border-gray-200/90 shadow-[0_-1px_4px_rgba(0,0,0,0.02)]';
    const iconColorClass = isDark
      ? 'text-neutral-300 hover:text-white active:text-white'
      : 'text-neutral-700 hover:text-black active:text-black';

    const finalBgClass = hasCustomBg ? '' : barBackgroundClass;

    return (
      <div 
        id="cbe-android-navbar"
        className={`w-full shrink-0 flex items-center justify-between px-10 sm:px-14 py-2 select-none pointer-events-auto border-t transition-colors ${finalBgClass} ${className}`}
      >
        {/* Button 1: Recents Overview (≡ Three horizontal lines matching Screenshot_20261028-111001_7018c5b4.png) */}
        <button
          id="btn-android-nav-recents"
          type="button"
          aria-label="Recent Apps"
          onClick={handleRecentsClick}
          className={`p-2 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-80 active:opacity-60 ${iconColorClass}`}
        >
          <svg 
            className="w-4 h-4" 
            viewBox="0 0 16 16" 
            fill="currentColor"
          >
            <rect x="2" y="3.2" width="12" height="1.8" rx="0.9" />
            <rect x="2" y="7.1" width="12" height="1.8" rx="0.9" />
            <rect x="2" y="11" width="12" height="1.8" rx="0.9" />
          </svg>
        </button>

        {/* Button 2: Home (○ Crisp circle ring matching Screenshot_20261028-111001_7018c5b4.png) */}
        <button
          id="btn-android-nav-home"
          type="button"
          aria-label="Home Screen"
          onClick={handleHomeClick}
          className={`p-2 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-80 active:opacity-60 ${iconColorClass}`}
        >
          <svg 
            className="w-4 h-4" 
            viewBox="0 0 16 16" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.8"
          >
            <circle cx="8" cy="8" r="5.2" />
          </svg>
        </button>

        {/* Button 3: Back (⊃ Curved return arrow hook matching Screenshot_20261028-111001_7018c5b4.png) */}
        <button
          id="btn-android-nav-back"
          type="button"
          aria-label="Back"
          onClick={handleBackClick}
          className={`p-2 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-80 active:opacity-60 ${iconColorClass}`}
        >
          <svg 
            className="w-4 h-4" 
            viewBox="0 0 16 16" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.8" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M7 4.5L3.5 8l3.5 3.5" />
            <path d="M4.5 8h4.5a3.5 3.5 0 0 1 3.5 3.5v0.2" />
          </svg>
        </button>
      </div>
    );
  }

  // 3. Immersive (Hidden / No Bar)
  return (
    <div className="w-full pb-[max(env(safe-area-inset-bottom,0px),0px)] shrink-0 pointer-events-none" />
  );
};

export default PhoneNavigationBar;

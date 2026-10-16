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
  theme?: 'dark' | 'light';
  className?: string;
  forceStyle?: NavigationBarStyle;
}

export const PhoneNavigationBar: React.FC<PhoneNavigationBarProps> = ({
  onBack,
  onHome,
  onRecents,
  theme = 'light',
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
  const isDark = theme === 'dark';

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

  // 1. iPhone Edge-to-Edge Navigation System (matching Image 1)
  // Continuous background extending to bottom edge with centered iOS Home Indicator Bar
  if (isIPhone || navStyle === 'gesture') {
    return (
      <div 
        id="cbe-ios-home-indicator-container"
        className={`w-full shrink-0 flex flex-col items-center justify-center pointer-events-none select-none pt-1 pb-[max(env(safe-area-inset-bottom,0px),6px)] ${
          isDark ? 'bg-transparent text-white' : 'bg-transparent text-black'
        } ${className}`}
      >
        <div 
          id="cbe-ios-home-indicator"
          className={`w-32 sm:w-36 h-1 sm:h-[4.5px] rounded-full transition-colors ${
            isDark ? 'bg-white/90 shadow-[0_1px_4px_rgba(0,0,0,0.5)]' : 'bg-black/90 shadow-[0_1px_3px_rgba(0,0,0,0.2)]'
          }`} 
        />
      </div>
    );
  }

  // 2. Android 3-Button Navigation Bar (matching Image 2)
  // [ |||  ○  ⊃ ] Edge-to-edge soft keys with exact icons, spacing & touch feedback
  if (navStyle === 'buttons') {
    const iconColorClass = isDark 
      ? 'text-neutral-400 hover:text-white' 
      : 'text-neutral-500 hover:text-neutral-800';

    return (
      <div 
        id="cbe-android-navbar"
        className={`w-full shrink-0 flex items-center justify-between px-10 sm:px-14 py-1.5 select-none pointer-events-auto border-t transition-colors ${
          isDark 
            ? 'bg-neutral-950 border-neutral-900/60' 
            : 'bg-white border-gray-100 shadow-[0_-1px_4px_rgba(0,0,0,0.02)]'
        } ${className}`}
      >
        {/* Button 1: Recents Overview (||| Three vertical pill lines matching Image 2) */}
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
            <rect x="2" y="2.5" width="2.2" height="11" rx="1.1" />
            <rect x="6.9" y="2.5" width="2.2" height="11" rx="1.1" />
            <rect x="11.8" y="2.5" width="2.2" height="11" rx="1.1" />
          </svg>
        </button>

        {/* Button 2: Home (○ Crisp circle ring matching Image 2) */}
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
            <circle cx="8" cy="8" r="5.5" />
          </svg>
        </button>

        {/* Button 3: Back (⊃ Curved return arrow hook matching Image 2) */}
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

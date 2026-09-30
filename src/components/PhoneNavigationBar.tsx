import React, { useState, useEffect } from 'react';
import { 
  PhoneSettingsService, 
  PhoneSettings 
} from '../services/phoneSettingsService';

interface PhoneNavigationBarProps {
  onBack?: () => void;
  onHome?: () => void;
  onRecents?: () => void;
  theme?: 'dark' | 'light';
  className?: string;
}

export const PhoneNavigationBar: React.FC<PhoneNavigationBarProps> = ({
  onBack,
  onHome,
  onRecents,
  theme = 'dark',
  className = '',
}) => {
  const [settings, setSettings] = useState<PhoneSettings>(() => PhoneSettingsService.getSettings());

  useEffect(() => {
    return PhoneSettingsService.subscribe((s) => setSettings(s));
  }, []);

  if (settings.navBarStyle === 'none') {
    return null;
  }

  const isDark = theme === 'dark';
  const navBg = isDark ? 'bg-black' : 'bg-white';
  const borderCol = isDark ? 'border-neutral-900/80' : 'border-neutral-200';
  const iconColor = isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900';

  // 1. Gesture Navigation Bar Style (Edge-to-edge uses device native navigation bar)
  if (settings.navBarStyle === 'gesture' || settings.phoneModel === 'iphone') {
    return null;
  }

  // 2. 3-Button Navigation Bar (|||, ○, <) matching screenshot
  return (
    <div 
      className={`w-full py-2 px-8 sm:px-14 md:px-16 flex items-center justify-between text-base font-light ${navBg} border-t ${borderCol} select-none ${className}`}
    >
      {/* Recents Button: 三 */}
      <button
        type="button"
        id="phone-nav-recents"
        aria-label="Recent Apps"
        onClick={onRecents}
        className={`${iconColor} cursor-pointer opacity-80 hover:opacity-100 active:scale-85 transition p-2 flex items-center justify-center`}
        title="Recent Apps"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      {/* Home Button: ○ */}
      <button
        type="button"
        id="phone-nav-home"
        aria-label="Home"
        onClick={onHome}
        className={`${iconColor} cursor-pointer opacity-80 hover:opacity-100 active:scale-85 transition p-2 flex items-center justify-center`}
        title="Home"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
          <circle cx="12" cy="12" r="8.5" />
        </svg>
      </button>

      {/* Back Button: ⮌ (curved return arrow matching screenshot) */}
      <button 
        type="button"
        id="phone-nav-back"
        aria-label="Back"
        onClick={onBack}
        className={`${iconColor} cursor-pointer opacity-80 hover:opacity-100 active:scale-85 transition p-2 flex items-center justify-center`}
        title="Back to Previous Screen / CBE"
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 16V13a5 5 0 0 0-5-5H6" />
          <polyline points="10 4 6 8 10 12" />
        </svg>
      </button>
    </div>
  );
};

export default PhoneNavigationBar;

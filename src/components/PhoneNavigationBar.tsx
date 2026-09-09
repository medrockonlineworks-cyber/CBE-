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

  // 1. Gesture Navigation Bar Style (Horizontal pill bar)
  if (settings.navBarStyle === 'gesture' || settings.phoneModel === 'iphone' || settings.phoneModel === 'pixel') {
    return (
      <div className={`w-full py-2.5 flex items-center justify-center ${navBg} select-none ${className}`}>
        <div 
          onClick={onHome || onBack}
          className={`w-32 h-1 rounded-full cursor-pointer hover:opacity-80 active:scale-95 transition ${
            isDark ? 'bg-white/60' : 'bg-neutral-800/60'
          }`}
          title="Gesture Home Bar"
        />
      </div>
    );
  }

  // 2. 3-Button Navigation Bar (|||, ○, <) matching screenshot
  return (
    <div 
      className={`w-full py-2.5 px-16 flex items-center justify-between text-base font-light ${navBg} border-t ${borderCol} select-none ${className}`}
    >
      {/* Recents Button: ||| */}
      <button
        type="button"
        onClick={onRecents}
        className={`${iconColor} cursor-pointer tracking-tighter text-sm font-bold opacity-75 active:scale-90 transition p-1`}
        title="Recent Apps"
      >
        |||
      </button>

      {/* Home Button: ○ */}
      <button
        type="button"
        onClick={onHome}
        className={`${iconColor} cursor-pointer text-base opacity-75 active:scale-90 transition p-1`}
        title="Home"
      >
        ○
      </button>

      {/* Back Button: < */}
      <button 
        type="button" 
        onClick={onBack}
        className={`${iconColor} cursor-pointer text-base opacity-75 active:scale-90 transition p-1`}
        title="Back"
      >
        &lt;
      </button>
    </div>
  );
};

export default PhoneNavigationBar;

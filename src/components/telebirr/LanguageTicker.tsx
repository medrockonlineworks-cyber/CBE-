import React from 'react';
import { useWallet } from '../../context/WalletContext';

export interface LanguageTickerProps {
  className?: string;
  onClick?: () => void;
}

export const LanguageTicker: React.FC<LanguageTickerProps> = ({ className = '', onClick }) => {
  const { language, toggleLanguage } = useWallet();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else {
      toggleLanguage();
    }
  };

  return (
    <button
      id="telebirr-language-ticker"
      type="button"
      onClick={handleClick}
      aria-label="Switch Language / ቋንቋ ቀይር"
      title="Tap to toggle English / አማርኛ"
      className={`h-[24px] px-2 rounded-full bg-white/20 hover:bg-white/28 active:scale-95 border border-white/30 backdrop-blur-xs flex items-center gap-1.5 transition-all cursor-pointer select-none shadow-xs group ${className}`}
    >
      {/* Active continuous marquee animation masked on the sides */}
      <div 
        className="w-[74px] h-full overflow-hidden relative flex items-center"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        }}
      >
        <div className="flex items-center gap-2 whitespace-nowrap animate-ticker-marquee text-[11px] font-semibold text-white tracking-tight">
          <span>English • አማርኛ</span>
          <span>•</span>
          <span>English • አማርኛ</span>
          <span>•</span>
          <span>English • አማርኛ</span>
          <span>•</span>
        </div>
      </div>

      {/* Downward triangle dropdown arrow */}
      <svg 
        className="w-2.5 h-2 text-white/90 group-hover:text-white shrink-0 transition-transform" 
        viewBox="0 0 10 7" 
        fill="currentColor"
      >
        <path d="M5 6.5L0.669873 0.5L9.33013 0.5L5 6.5Z" />
      </svg>
    </button>
  );
};

export default LanguageTicker;

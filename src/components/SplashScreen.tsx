import React, { useEffect, useState } from 'react';
import { CbeLogo } from './CbeLogo';
import { LocalDb } from '../lib/mockData';

interface SplashScreenProps {
  onFinish?: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onFinish, 
  duration = 1400 
}) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [customLogo] = useState<string | null>(() => LocalDb.getCustomBankLogo());

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, Math.max(duration - 350, 400));

    const finishTimer = setTimeout(() => {
      onFinish?.();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [duration, onFinish]);

  return (
    <div 
      id="cbe-app-splash-screen"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between py-12 px-6 bg-[#70189F] text-white select-none transition-opacity duration-350 ease-out ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
      style={{
        backgroundColor: '#70189F',
      }}
    >
      {/* Top subtle spacer */}
      <div className="w-full pt-[max(env(safe-area-inset-top,0px),12px)] flex justify-center" />

      {/* Center Brand Identity */}
      <div className="flex flex-col items-center justify-center text-center animate-in zoom-in-95 fade-in duration-500">
        <div className="w-28 h-28 sm:w-32 sm:h-32 mb-6 flex items-center justify-center relative">
          {/* Ambient Glow */}
          <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl scale-125 pointer-events-none" />
          <CbeLogo 
            src={customLogo} 
            className="w-full h-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)] relative z-10" 
          />
        </div>

        {/* Amharic Bank Name */}
        <h2 className="text-[#deb356] font-bold text-xl sm:text-2xl tracking-wide drop-shadow-sm font-sans">
          የኢትዮጵያ ንግድ ባንክ
        </h2>

        {/* English Bank Name */}
        <h1 className="text-white font-extrabold text-lg sm:text-xl tracking-tight mt-1 drop-shadow-sm">
          Commercial Bank of Ethiopia
        </h1>

        {/* Slogan */}
        <p className="text-purple-100/90 text-xs sm:text-sm font-medium tracking-wide mt-2">
          The bank you can always rely on!
        </p>
      </div>

      {/* Bottom loading indicator & version badge */}
      <div className="w-full pb-[max(env(safe-area-inset-bottom,0px),16px)] flex flex-col items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#deb356] animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-[#deb356] animate-pulse [animation-delay:180ms]" />
          <span className="w-2 h-2 rounded-full bg-[#deb356] animate-pulse [animation-delay:360ms]" />
        </div>
        <span className="text-[10px] text-purple-200/70 font-mono tracking-widest uppercase">
          Mobile Banking
        </span>
      </div>
    </div>
  );
};

export default SplashScreen;

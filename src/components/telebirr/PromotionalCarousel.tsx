import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Trophy } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';

export interface PromotionalCarouselProps {
  onOpenTelePlay?: () => void;
  className?: string;
}

export interface PromoSlide {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  accentBg: string;
  imageSrc?: string;
  isTelePlay?: boolean;
}

export const PromotionalCarousel: React.FC<PromotionalCarouselProps> = ({
  onOpenTelePlay,
  className = '',
}) => {
  const { language, setIsTelePlayOpen } = useWallet();
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const touchStartX = useRef<number | null>(null);

  const slides: PromoSlide[] = [
    {
      id: 'zemen_gebeya',
      title: 'ዘመን ገበያ Zemen GEBEYA',
      subtitle: 'Where Ethiopia Shops Digitally • Fast Delivery',
      badge: 'SuperApp Shop',
      accentBg: 'from-[#0b3323] via-[#0e4832] to-[#125e41]',
      imageSrc: '/zemen-gebeya-banner.png'
    },
    {
      id: 'teleplay',
      title: 'TelePlay Prizes Above 60M ETB',
      subtitle: 'Spin daily, solve puzzles & win cars, phones and cash!',
      badge: 'Interactive Game',
      accentBg: 'from-[#1c4d18] via-[#2d7a26] to-[#409c38]',
      isTelePlay: true
    },
    {
      id: 'supersport',
      title: 'Football on SuperSport',
      subtitle: 'Monthly mobile data package with DStv Premier League',
      badge: 'Entertainment',
      accentBg: 'from-[#003b73] via-[#005a9c] to-[#0072ce]',
      imageSrc: '/dstv-supersport-banner.png'
    }
  ];

  // Auto advance every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleNext = () => {
    setCurrentIdx(prev => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setCurrentIdx(prev => (prev - 1 + slides.length) % slides.length);
  };

  const handleSlideClick = (slide: PromoSlide) => {
    if (slide.isTelePlay) {
      if (onOpenTelePlay) onOpenTelePlay();
      else setIsTelePlayOpen(true);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (diff > 40) {
      handleNext();
    } else if (diff < -40) {
      handlePrev();
    }
    touchStartX.current = null;
  };

  const activeSlide = slides[currentIdx];

  return (
    <div className={`w-full px-3 py-2 select-none ${className}`}>
      {/* Carousel Container */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => handleSlideClick(activeSlide)}
        className={`w-full h-[105px] rounded-2xl bg-gradient-to-r ${activeSlide.accentBg} text-white shadow-md relative overflow-hidden flex flex-col justify-between p-3.5 cursor-pointer active:scale-[0.99] transition-all border border-white/10`}
      >
        {/* Glow & Sparkles */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />

        {/* Top Row: Badge + Dots */}
        <div className="flex items-center justify-between z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-xs">
            {activeSlide.isTelePlay && <Trophy className="w-3 h-3 text-amber-300" />}
            {activeSlide.badge}
          </span>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentIdx(idx)}
                className={`transition-all rounded-full ${
                  idx === currentIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Middle Content */}
        <div className="z-10 mt-1">
          <h4 className="text-[14.5px] font-black text-white tracking-tight leading-snug drop-shadow-xs line-clamp-1">
            {activeSlide.title}
          </h4>
          <p className="text-[11px] text-white/85 tracking-normal leading-tight mt-0.5 line-clamp-1">
            {activeSlide.subtitle}
          </p>
        </div>

        {/* Bottom Bar: Action call */}
        <div className="z-10 flex items-center justify-between text-[10.5px] font-bold text-white/90 pt-1">
          <span className="underline underline-offset-2 flex items-center gap-1">
            {activeSlide.isTelePlay ? 'Tap to Play & Win ETB Rewards' : 'Explore Featured Service'}
          </span>
          <span className="text-[10px] opacity-75">{currentIdx + 1}/{slides.length}</span>
        </div>
      </div>
    </div>
  );
};

export default PromotionalCarousel;

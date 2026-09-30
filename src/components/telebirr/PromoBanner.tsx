import React from 'react';

export interface PromoBannerProps {
  text?: string;
  className?: string;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({
  text = 'ONE APP FOR ALL YOUR NEEDS! • ONE APP FOR ALL YOUR NEEDS!',
  className = '',
}) => {
  return (
    <div
      id="telebirr-orange-announcement-ribbon"
      aria-label="Telebirr Announcement"
      className={`w-full h-[24px] min-h-[24px] max-h-[24px] bg-[#FFA000] rounded-t-xl sm:rounded-t-2xl overflow-hidden relative flex items-center shadow-xs z-10 select-none ${className}`}
    >
      {/* Infinite hardware-accelerated marquee scrolling ribbon */}
      <div 
        className="w-full overflow-hidden flex items-center"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 2%, black 98%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 2%, black 98%, transparent 100%)',
        }}
      >
        <div className="flex items-center gap-6 whitespace-nowrap animate-marquee-scroll text-white text-[11px] font-black uppercase tracking-wider leading-none">
          <span>{text}</span>
          <span>•</span>
          <span>{text}</span>
          <span>•</span>
          <span>{text}</span>
          <span>•</span>
          <span>{text}</span>
          <span>•</span>
        </div>
      </div>
    </div>
  );
};

export default PromoBanner;

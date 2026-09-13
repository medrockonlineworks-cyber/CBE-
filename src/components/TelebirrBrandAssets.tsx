import React from 'react';
import { CbeGoldenEmblemSvg } from './CbeLogo';

/**
 * High-fidelity SVG brand assets for Ethio Telecom & Telebirr
 * Faithful representation matching official mobile application branding
 */

// Ethio Telecom Official Logo
export const EthioTelecomLogo: React.FC<{ className?: string }> = ({ className = "h-7" }) => (
  <svg viewBox="0 0 200 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Ethio Telecom Iconic Emblem (Green swoosh & Cyan/Blue crescent) */}
    <g transform="translate(4, 4)">
      {/* Green upper leaf/swoosh */}
      <path
        d="M 4 20 C 4 8, 16 2, 28 2 C 34 2, 38 5, 38 10 C 38 18, 24 24, 12 24 C 8 24, 5 22, 4 20 Z"
        fill="#5cb82e"
      />
      {/* Cyan/Blue lower curve swoosh */}
      <path
        d="M 6 22 C 10 28, 22 36, 34 34 C 40 33, 44 29, 44 24 C 44 19, 36 17, 26 21 C 18 24, 10 23, 6 22 Z"
        fill="#0088cc"
      />
      {/* Central inner white ribbon wave */}
      <path
        d="M 8 21 C 14 18, 26 18, 34 22 C 28 26, 16 26, 8 21 Z"
        fill="#ffffff"
        opacity="0.8"
      />
    </g>
    {/* English Text: ethio telecom */}
    <text
      x="54"
      y="24"
      fontFamily="system-ui, -apple-system, sans-serif"
      fontSize="17"
      fontWeight="800"
      letterSpacing="-0.5px"
      fill="#1f2937"
    >
      ethio telecom
    </text>
    <text
      x="170"
      y="15"
      fontFamily="system-ui, sans-serif"
      fontSize="7"
      fontWeight="700"
      fill="#4b5563"
    >
      TM
    </text>
    {/* Amharic Text: ኢትዮ ቴሌኮም */}
    <text
      x="55"
      y="38"
      fontFamily="system-ui, -apple-system, sans-serif"
      fontSize="10"
      fontWeight="600"
      fill="#6b7280"
    >
      ኢትዮ ቴሌኮም
    </text>
  </svg>
);

// Telebirr Official Logo (Burst star with Amharic & English)
export const TelebirrLogo: React.FC<{ className?: string }> = ({ className = "h-8" }) => (
  <svg viewBox="0 0 160 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Vibrant Cyan-Blue Star Burst Emblem */}
    <g transform="translate(6, 4)">
      <path
        d="M 20 0 L 23 13 L 36 13 L 26 21 L 30 34 L 20 26 L 10 34 L 14 21 L 4 13 L 17 13 Z"
        fill="#0085ca"
      />
      <circle cx="20" cy="18" r="4.5" fill="#ffffff" />
      <circle cx="20" cy="18" r="2.2" fill="#0085ca" />
    </g>
    {/* Amharic Text: ቴሌብር */}
    <text
      x="50"
      y="22"
      fontFamily="system-ui, sans-serif"
      fontSize="14"
      fontWeight="800"
      fill="#0085ca"
    >
      ቴሌብር
    </text>
    {/* English Text: telebirr */}
    <text
      x="50"
      y="39"
      fontFamily="system-ui, sans-serif"
      fontSize="17"
      fontWeight="900"
      letterSpacing="-0.5px"
      fill="#0085ca"
    >
      telebirr
    </text>
  </svg>
);

// Solid White User Silhouette Avatar for Telebirr (Matching Screenshot translucent halo)
export const TelebirrSolidAvatar: React.FC<{ className?: string }> = ({ className = "w-9 h-9" }) => (
  <div className={`${className} rounded-full bg-white/20 flex items-center justify-center p-1.5 shadow-xs backdrop-blur-xs`}>
    <svg viewBox="0 0 24 24" className="w-full h-full fill-white" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="7" r="4.2" />
      <path d="M4 21 C4 15.6 7.6 13 12 13 C16.4 13 20 15.6 20 21 Z" />
    </svg>
  </div>
);

// Authentic Dual-Focal Wave Graphics for Telebirr Card (matching screenshot IMG_20260912_142256_806.png)
export const TelebirrRipples: React.FC<{ className?: string }> = ({ className = "absolute inset-0 pointer-events-none" }) => {
  // 24 concentric wavefront radii matching the high-density contour curves in screenshot
  const radii = [
    14, 26, 40, 56, 74, 94, 116, 140, 166, 194, 224, 256, 290, 326, 364, 404, 446, 490, 536, 584, 634, 686, 740, 796
  ];

  return (
    <svg
      viewBox="0 0 400 270"
      preserveAspectRatio="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="leftWaveGlow" cx="9%" cy="7%" r="45%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rightWaveGlow" cx="91%" cy="7%" r="45%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <clipPath id="telebirrCardClip">
          <rect width="400" height="270" />
        </clipPath>
      </defs>

      <g clipPath="url(#telebirrCardClip)">
        {/* Ambient Top Glow Highlights */}
        <rect width="400" height="270" fill="url(#leftWaveGlow)" />
        <rect width="400" height="270" fill="url(#rightWaveGlow)" />

        {/* Left-focal tilted concentric wave streams (Originating at avatar x: 36, y: 16) */}
        <g transform="rotate(17 36 16)">
          {radii.map((r, i) => (
            <ellipse
              key={`left-wave-${i}`}
              cx="36"
              cy="16"
              rx={r}
              ry={r * 1.48}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.15"
              strokeOpacity={i % 3 === 0 ? 0.38 : (i % 2 === 0 ? 0.28 : 0.20)}
            />
          ))}
        </g>

        {/* Right-focal tilted concentric wave streams (Originating at bell/lang x: 364, y: 16) */}
        <g transform="rotate(-17 364 16)">
          {radii.map((r, i) => (
            <ellipse
              key={`right-wave-${i}`}
              cx="364"
              cy="16"
              rx={r}
              ry={r * 1.48}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.15"
              strokeOpacity={i % 3 === 0 ? 0.38 : (i % 2 === 0 ? 0.28 : 0.20)}
            />
          ))}
        </g>
      </g>
    </svg>
  );
};

// CBE Circular Emblem for Telebirr Grid
export const CbeMedallionIcon: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <div className={`${className} flex items-center justify-center`}>
    <CbeGoldenEmblemSvg className="w-9 h-9" />
  </div>
);

// Dashen Bank Mountain Crest for Telebirr Grid
export const DashenGridBadge: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <div className={`${className} rounded-xl bg-[#003882] p-1 shadow-sm flex flex-col items-center justify-center text-white overflow-hidden`}>
    <img 
      src="/dashen-logo-clean.svg" 
      alt="Dashen Bank" 
      className="w-7 h-7 object-contain drop-shadow-xs" 
    />
  </div>
);

// Siinqee Bank Emblem for Telebirr Grid
export const SiinqeeGridBadge: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <div className={`${className} rounded-xl bg-gradient-to-br from-emerald-50 to-orange-50 border border-emerald-200/60 p-1 flex flex-col items-center justify-center shadow-xs`}>
    <div className="flex items-center gap-0.5">
      <span className="text-emerald-700 font-extrabold text-[9px] tracking-tight">Sii</span>
      <span className="text-orange-600 font-extrabold text-[9px] tracking-tight">nqee</span>
    </div>
    <span className="text-[5px] font-semibold text-neutral-600 leading-none mt-0.5">BANK</span>
  </div>
);

// Zemen GEBEYA Badge for Telebirr Grid
export const ZemenGebeyaBadge: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <div className={`${className} rounded-full bg-[#0a3323] p-1 flex flex-col items-center justify-center text-[#e2b868] shadow-sm border border-emerald-900`}>
    <span className="text-[7.5px] font-bold leading-tight">ዘመን</span>
    <span className="text-[6px] font-extrabold tracking-tight text-white leading-none">GEBEYA</span>
  </div>
);

// Wallet with Send Money Icon
export const SendMoneyIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8 text-[#72be20]" }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="6" y="14" width="28" height="20" rx="4" stroke="currentColor" strokeWidth="2.2" fill="none" />
    <path d="M 6 18 L 34 18" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="26" cy="24" r="2.2" fill="currentColor" />
    <path d="M 12 14 L 12 8 C 12 6.5, 13.5 5, 15 5 L 25 5 C 26.5 5, 28 6.5, 28 8 L 28 14" stroke="currentColor" strokeWidth="2" strokeDasharray="2 1" />
    <path d="M 20 2 L 20 10 M 16 6 L 20 2 L 24 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Cash In/Out Wallet Icon
export const CashInOutIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8 text-[#72be20]" }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="6" y="12" width="28" height="22" rx="4" stroke="currentColor" strokeWidth="2.2" fill="none" />
    <circle cx="26" cy="23" r="2.5" fill="currentColor" />
    <path d="M 18 19 L 18 27 M 14 23 L 22 23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

// Airtime / Buy Package Gift with Sparks
export const AirtimePackageIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8 text-[#72be20]" }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="10" y="18" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2.2" fill="none" />
    <path d="M 7 14 L 33 14 L 33 18 L 7 18 Z" stroke="currentColor" strokeWidth="2.2" fill="none" />
    <path d="M 20 14 L 20 34" stroke="currentColor" strokeWidth="2" />
    {/* Sparks */}
    <path d="M 20 6 L 20 10 M 14 8 L 17 11 M 26 8 L 23 11 M 10 12 L 13 13 M 30 12 L 27 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Bank Columns Icon
export const BankPillarsIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8 text-[#72be20]" }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Roof pediment triangle */}
    <path d="M 6 12 L 20 5 L 34 12 Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" fill="none" />
    {/* Horizontal beams */}
    <line x1="5" y1="14" x2="35" y2="14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="5" y1="32" x2="35" y2="32" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="3" y1="35" x2="37" y2="35" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    {/* Columns */}
    <line x1="10" y1="16" x2="10" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="16.5" y1="16" x2="16.5" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="23.5" y1="16" x2="23.5" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="30" y1="16" x2="30" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

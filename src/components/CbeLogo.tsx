import React, { useState, useEffect } from 'react';
import { LocalDb, DEFAULT_CBE_LOGO } from '../lib/mockData';

interface CbeLogoProps {
  className?: string;
  src?: string | null;
  alt?: string;
}

export const CbeGoldenEmblemSvg: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <svg 
    viewBox="0 0 120 120" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`${className} shrink-0`}
  >
    <defs>
      <linearGradient id="cbeGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F9E79F" />
        <stop offset="30%" stopColor="#D4AC0D" />
        <stop offset="70%" stopColor="#B7950B" />
        <stop offset="100%" stopColor="#7D6608" />
      </linearGradient>
      <linearGradient id="cbeInnerGrad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#B9770E" />
        <stop offset="50%" stopColor="#F5B041" />
        <stop offset="100%" stopColor="#FAD7A0" />
      </linearGradient>
      <radialGradient id="cbeShine" cx="35%" cy="35%" r="60%">
        <stop offset="0%" stopColor="#FFF9C4" stopOpacity="0.9" />
        <stop offset="60%" stopColor="#D4AF37" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#8C6239" stopOpacity="0.1" />
      </radialGradient>
      <filter id="cbeShadow" x="-10%" y="-10%" width="125%" height="125%">
        <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#4a2e05" floodOpacity="0.3" />
      </filter>
    </defs>

    {/* Radiating Spiral Waves on the Left and Background (Iconic CBE Design) */}
    <g stroke="#C69214" strokeWidth="1.2" strokeLinecap="round" opacity="0.85">
      <path d="M60 22 C40 22, 16 35, 12 55 C8 75, 26 95, 52 98 C78 101, 104 88, 108 65 C112 42, 90 28, 68 28 C46 28, 30 42, 28 58 C26 74, 40 86, 58 87 C76 88, 90 78, 92 64 C94 50, 82 40, 68 40" fill="none" />
      <path d="M56 16 C32 17, 10 32, 6 56 C2 80, 22 102, 50 106 C78 110, 108 96, 114 70 C120 44, 98 22, 72 22" fill="none" opacity="0.6" />
      <path d="M64 26 C44 26, 22 38, 18 58 C14 78, 30 96, 56 99 C82 102, 102 88, 105 68" fill="none" opacity="0.5" />
      <path d="M50 30 C34 32, 22 44, 20 58 C18 72, 30 84, 48 87" fill="none" opacity="0.7" />
    </g>

    {/* Main Golden Coin Medallion */}
    <circle cx="68" cy="62" r="38" fill="url(#cbeGoldGrad)" filter="url(#cbeShadow)" stroke="#7D6608" strokeWidth="1.5" />
    <circle cx="68" cy="62" r="34" fill="url(#cbeInnerGrad)" stroke="#F9E79F" strokeWidth="1" />
    <circle cx="68" cy="62" r="34" fill="url(#cbeShine)" />

    {/* Coin Ridged Edge Dots */}
    <circle cx="68" cy="62" r="31" fill="none" stroke="#7D6608" strokeWidth="1" strokeDasharray="2 2" opacity="0.7" />

    {/* Inner Coin Ring */}
    <circle cx="68" cy="62" r="26" fill="#FAD7A0" stroke="#935116" strokeWidth="1.2" />

    {/* CBE Monogram / Symbol in Center */}
    <g fill="#7E5109" transform="translate(48, 44) scale(0.65)">
      {/* Central Pillar & Arch (Ethiopian Commercial Bank Landmark Monogram) */}
      <path d="M30 4 C15 4, 4 15, 4 30 C4 45, 15 56, 30 56 C45 56, 56 45, 56 30 C56 15, 45 4, 30 4 Z M30 10 C41 10, 50 19, 50 30 C50 41, 41 50, 30 50 C19 50, 10 41, 10 30 C10 19, 19 10, 30 10 Z" />
      <rect x="26" y="16" width="8" height="28" rx="2" fill="#6E2C00" />
      <path d="M18 24 Q30 15 42 24 L42 28 Q30 19 18 28 Z" fill="#6E2C00" />
      <circle cx="30" cy="22" r="3.5" fill="#FAD7A0" />
      <rect x="18" y="40" width="24" height="4" rx="1" fill="#6E2C00" />
    </g>

    {/* Micro Star Engravings on Rim */}
    <g fill="#5B3E06" opacity="0.8">
      <circle cx="68" cy="32" r="1.5" />
      <circle cx="68" cy="92" r="1.5" />
      <circle cx="38" cy="62" r="1.5" />
      <circle cx="98" cy="62" r="1.5" />
    </g>
  </svg>
);

export const CbeLogo: React.FC<CbeLogoProps> = ({ 
  className = "w-10 h-10", 
  src,
  alt = "Commercial Bank of Ethiopia" 
}) => {
  const [imgError, setImgError] = useState(false);
  const [activeUrl, setActiveUrl] = useState<string | null>(() => {
    const adminLogo = LocalDb.getCustomBankLogo();
    if (adminLogo) return adminLogo;
    if (typeof src === 'string' && src.trim().length > 0) return src;
    return DEFAULT_CBE_LOGO;
  });

  const syncLogo = () => {
    const adminLogo = LocalDb.getCustomBankLogo();
    if (adminLogo) {
      setActiveUrl(adminLogo);
    } else if (typeof src === 'string' && src.trim().length > 0) {
      setActiveUrl(src);
    } else {
      setActiveUrl(DEFAULT_CBE_LOGO);
    }
    setImgError(false);
  };

  useEffect(() => {
    syncLogo();
  }, [src]);

  useEffect(() => {
    const handleUpdate = () => {
      syncLogo();
    };

    window.addEventListener('cbe_logo_updated', handleUpdate);
    window.addEventListener('bank_logo_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('cbe_logo_updated', handleUpdate);
      window.removeEventListener('bank_logo_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [src]);

  const finalSrc = activeUrl || LocalDb.getCustomBankLogo() || DEFAULT_CBE_LOGO;

  if (imgError || !finalSrc) {
    return <CbeGoldenEmblemSvg className={className} />;
  }

  return (
    <img 
      src={finalSrc} 
      alt={alt} 
      className={`${className} object-contain`} 
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
      onError={() => {
        if (finalSrc !== '/custom-bank-logo.png') {
          console.warn('[CbeLogo] Custom URL failed to load, falling back to uploaded PNG logo');
          setActiveUrl('/custom-bank-logo.png');
        } else {
          console.warn('[CbeLogo] Uploaded PNG failed, falling back to SVG emblem');
          setImgError(true);
        }
      }}
    />
  );
};

export default CbeLogo;

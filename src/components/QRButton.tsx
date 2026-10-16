import React from 'react';

interface QRButtonProps {
  onClick?: () => void;
  className?: string;
}

export const QRButton: React.FC<QRButtonProps> = ({
  onClick,
  className = '',
}) => {
  return (
    <div className={`flex justify-center items-center select-none ${className}`}>
      <button
        id="btn-scan-qr-standalone"
        type="button"
        aria-label="Scan QR Code"
        onClick={onClick}
        className="bg-[#70189F] hover:bg-[#5a1280] active:scale-95 text-white px-5 py-2 rounded-full flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(107,18,132,0.4)] transition-all cursor-pointer border border-purple-300/20"
      >
        {/* Left Viewfinder bracket with center dot */}
        <svg 
          className="w-4 h-4 text-purple-200" 
          viewBox="0 0 16 16" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M5 2H3a1 1 0 0 0-1 1v2" />
          <path d="M2 11v2a1 1 0 0 0 1 1h2" />
          <rect x="5" y="7" width="2" height="2" fill="currentColor" stroke="none" rx="0.5" />
        </svg>

        {/* Text */}
        <span className="text-[13px] font-bold tracking-tight text-white">Scan QR</span>

        {/* Right Viewfinder bracket with center dot */}
        <svg 
          className="w-4 h-4 text-purple-200" 
          viewBox="0 0 16 16" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M11 2h2a1 1 0 0 1 1 1v2" />
          <path d="M14 11v2a1 1 0 0 1-1 1h-2" />
          <rect x="9" y="7" width="2" height="2" fill="currentColor" stroke="none" rx="0.5" />
        </svg>
      </button>
    </div>
  );
};

export default QRButton;

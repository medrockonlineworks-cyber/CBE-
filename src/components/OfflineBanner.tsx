import React from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { useOnlineStatus } from '../lib/useOnlineStatus';

interface OfflineBannerProps {
  className?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ className = '' }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div 
      id="offline-status-banner"
      role="alert"
      className={`bg-rose-900/95 text-white px-4 py-2.5 shadow-lg border-b border-rose-700/80 flex items-center justify-between gap-3 text-xs sm:text-sm animate-fade-in z-50 ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-full bg-rose-800 flex items-center justify-center flex-shrink-0">
          <WifiOff className="w-3.5 h-3.5 text-rose-200 animate-pulse" />
        </div>
        <div className="min-w-0">
          <p className="font-bold tracking-tight text-white leading-tight">No Internet Connection</p>
          <p className="text-[11px] text-rose-200/90 leading-tight truncate">Please check your internet connection and try again.</p>
        </div>
      </div>
      <div className="flex-shrink-0 flex items-center gap-1 bg-rose-950/60 px-2 py-1 rounded text-[10px] font-mono text-rose-300 border border-rose-800/50">
        <AlertTriangle className="w-3 h-3 text-amber-400" />
        <span>Offline</span>
      </div>
    </div>
  );
};

export default OfflineBanner;

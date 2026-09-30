import React, { useState, useEffect } from 'react';
import { Bluetooth, Zap } from 'lucide-react';

export const TelebirrPhoneStatusBar: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [timeStr, setTimeStr] = useState<string>('9:50');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      // Format like "9:50" or "10:15"
      setTimeStr(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className={`w-full bg-[#7BBF18] px-4 pt-1.5 pb-1 flex items-center justify-between text-white text-[11px] font-bold select-none z-30 shrink-0 ${className}`}
    >
      {/* Left: Clock */}
      <span className="font-extrabold tracking-tight text-[12px]">{timeStr}</span>

      {/* Right: Bluetooth, Network Speed, 4G signals, Battery */}
      <div className="flex items-center gap-2">
        <Bluetooth className="w-3 h-3 text-white/90" />
        <span className="text-[9.5px] font-mono font-medium text-white/90">55.3 KB/s</span>

        {/* 4G Dual SIM Signals */}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5">
            <span className="text-[7.5px] font-bold">4G</span>
            <div className="flex items-end gap-[1px] h-2.5">
              <span className="w-[1.5px] h-1 bg-white rounded-xs"></span>
              <span className="w-[1.5px] h-1.5 bg-white rounded-xs"></span>
              <span className="w-[1.5px] h-2 bg-white rounded-xs"></span>
              <span className="w-[1.5px] h-2.5 bg-white rounded-xs"></span>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <span className="text-[7.5px] font-bold">4G</span>
            <div className="flex items-end gap-[1px] h-2.5">
              <span className="w-[1.5px] h-1 bg-white rounded-xs"></span>
              <span className="w-[1.5px] h-1.5 bg-white rounded-xs"></span>
              <span className="w-[1.5px] h-2 bg-white rounded-xs"></span>
              <span className="w-[1.5px] h-2.5 bg-white rounded-xs"></span>
            </div>
          </div>
        </div>

        {/* Battery with Green Pill & Bolt */}
        <div className="flex items-center gap-1 bg-[#10b981] px-1.5 py-0.5 rounded-full text-white text-[9.5px] font-extrabold border border-white/20 shadow-xs">
          <span>81</span>
          <Zap className="w-2.5 h-2.5 fill-white text-white" />
        </div>
      </div>
    </div>
  );
};

export default TelebirrPhoneStatusBar;

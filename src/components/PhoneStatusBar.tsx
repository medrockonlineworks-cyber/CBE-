import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  Battery, 
  BatteryCharging, 
  VolumeX, 
  Vibrate, 
  Bluetooth, 
  Sliders
} from 'lucide-react';
import { 
  PhoneSettingsService, 
  PhoneSettings, 
  PhoneModelType 
} from '../services/phoneSettingsService';

interface PhoneStatusBarProps {
  theme?: 'dark' | 'light';
  onClick?: () => void;
  className?: string;
  showEditHint?: boolean;
}

export const PhoneStatusBar: React.FC<PhoneStatusBarProps> = ({
  theme = 'dark',
  onClick,
  className = '',
  showEditHint = false,
}) => {
  const [settings, setSettings] = useState<PhoneSettings>(() => PhoneSettingsService.getSettings());
  const [realTime, setRealTime] = useState<string>(() => PhoneSettingsService.formatCurrentClock());

  useEffect(() => {
    // Subscribe to settings changes
    const unsubscribe = PhoneSettingsService.subscribe((newSettings) => {
      setSettings(newSettings);
    });

    // If real time enabled, update every 10 seconds
    const interval = setInterval(() => {
      setRealTime(PhoneSettingsService.formatCurrentClock());
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const displayTime = settings.useRealTime ? realTime : (settings.timeString || '11:33');
  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-neutral-900';
  const subTextColor = isDark ? 'text-neutral-300' : 'text-neutral-700';
  const iconColor = isDark ? 'text-neutral-200' : 'text-neutral-800';

  // 1. iPhone iOS 18 Dynamic Island Style
  if (settings.phoneModel === 'iphone') {
    return (
      <div 
        onClick={onClick}
        title="Click to customize Phone Status Bar"
        className={`w-full px-5 pt-3 pb-2 flex items-center justify-between text-xs select-none relative group cursor-pointer transition-colors ${className}`}
      >
        {/* Left: iOS Bold Time */}
        <div className="flex items-center space-x-1 pl-1 z-10">
          <span className={`font-semibold tracking-tight text-[13px] ${textColor}`}>
            {displayTime}
          </span>
        </div>

        {/* Center: Dynamic Island Pill */}
        <div className="absolute left-1/2 -translate-x-1/2 top-2 z-10">
          <div className="w-24 h-6 bg-black rounded-full flex items-center justify-between px-2.5 shadow-md border border-neutral-800/80">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-blue-950/60" />
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-900" />
          </div>
        </div>

        {/* Right: iOS Cellular, Wi-Fi, and Pill Battery */}
        <div className="flex items-center space-x-2 z-10 pr-1">
          {/* Cellular bars */}
          <div className="flex items-end space-x-[2px] h-3">
            <div className={`w-[2.5px] h-1 rounded-xs ${isDark ? 'bg-white' : 'bg-black'}`} />
            <div className={`w-[2.5px] h-1.5 rounded-xs ${isDark ? 'bg-white' : 'bg-black'}`} />
            <div className={`w-[2.5px] h-2 rounded-xs ${isDark ? 'bg-white' : 'bg-black'}`} />
            <div className={`w-[2.5px] h-2.5 rounded-xs ${isDark ? 'bg-white' : 'bg-black'}`} />
          </div>

          <span className={`text-[10px] font-bold tracking-tight ${textColor}`}>
            {settings.sim1Network === 'None' ? '5G' : settings.sim1Network}
          </span>

          {/* iOS Rounded Battery */}
          <div className="flex items-center space-x-1">
            <div className={`w-5 h-2.5 rounded-[4px] border ${isDark ? 'border-white' : 'border-black'} p-[1.5px] relative flex items-center`}>
              <div 
                className={`h-full rounded-[2px] ${settings.isCharging ? 'bg-emerald-400' : (isDark ? 'bg-white' : 'bg-black')}`}
                style={{ width: `${Math.min(100, Math.max(10, settings.batteryPercent))}%` }}
              />
              <div className={`absolute -right-[3px] top-0.5 w-[2px] h-1.5 rounded-r-[1px] ${isDark ? 'bg-white' : 'bg-black'}`} />
            </div>
          </div>
        </div>

        {/* Subtle quick customize indicator on hover */}
        <div className="absolute right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <Sliders className="w-3 h-3 text-sky-400" />
        </div>
      </div>
    );
  }

  // 2. Google Pixel Style (Center punch-hole, Material You icons)
  if (settings.phoneModel === 'pixel') {
    return (
      <div 
        onClick={onClick}
        title="Click to customize Phone Status Bar"
        className={`w-full px-4 pt-2 pb-1.5 flex items-center justify-between text-xs select-none relative group cursor-pointer transition-colors ${className}`}
      >
        {/* Left: Pixel Clock */}
        <div className="flex items-center space-x-1.5">
          <span className={`font-medium tracking-tight text-[12.5px] ${textColor}`}>
            {displayTime}
          </span>
          {settings.soundMode === 'mute' && (
            <VolumeX className={`w-3 h-3 ${subTextColor}`} />
          )}
        </div>

        {/* Center: Punch Hole Camera */}
        <div className="w-3.5 h-3.5 rounded-full bg-black border border-neutral-800 shadow-inner" />

        {/* Right: Clean Material Status Icons */}
        <div className="flex items-center space-x-2 text-[11px]">
          {settings.showNetworkSpeed && settings.networkSpeedText && (
            <span className={`font-mono text-[9px] ${subTextColor}`}>
              {settings.networkSpeedText}
            </span>
          )}
          {settings.showWifi && (
            <Wifi className={`w-3.5 h-3.5 ${iconColor}`} />
          )}
          <span className={`font-bold text-[10px] ${textColor}`}>
            {settings.sim1Network === 'None' ? '5G' : settings.sim1Network}
          </span>
          <div className="flex items-center space-x-1">
            <span className={`text-[10.5px] font-medium ${textColor}`}>{settings.batteryPercent}%</span>
            {settings.isCharging ? (
              <BatteryCharging className={`w-4 h-4 text-emerald-400`} />
            ) : (
              <Battery className={`w-4 h-4 ${iconColor}`} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Samsung Galaxy One UI Style
  if (settings.phoneModel === 'samsung') {
    return (
      <div 
        onClick={onClick}
        title="Click to customize Phone Status Bar"
        className={`w-full px-4 pt-1.5 pb-1 flex items-center justify-between text-xs select-none relative group cursor-pointer transition-colors ${className}`}
      >
        {/* Left: Time & Notifications */}
        <div className="flex items-center space-x-2">
          <span className={`font-bold tracking-tight text-[12.5px] ${textColor}`}>
            {displayTime}
          </span>
          {settings.soundMode === 'mute' && (
            <VolumeX className={`w-3 h-3 ${subTextColor}`} />
          )}
        </div>

        {/* Right: VoLTE, Wi-Fi, Network & Battery */}
        <div className="flex items-center space-x-1.5 text-[11px]">
          {settings.showNetworkSpeed && settings.networkSpeedText && (
            <span className={`font-mono text-[9px] ${subTextColor} mr-1`}>
              {settings.networkSpeedText}
            </span>
          )}
          <span className={`px-1 py-[1px] border border-current rounded-[2px] text-[7.5px] font-bold ${subTextColor}`}>
            VoLTE
          </span>
          {settings.showWifi && (
            <Wifi className={`w-3.5 h-3.5 ${iconColor}`} />
          )}
          <div className="flex items-end space-x-0.5 h-2.5">
            <div className={`w-0.5 h-1 ${isDark ? 'bg-white' : 'bg-black'}`} />
            <div className={`w-0.5 h-1.5 ${isDark ? 'bg-white' : 'bg-black'}`} />
            <div className={`w-0.5 h-2 ${isDark ? 'bg-white' : 'bg-black'}`} />
            <div className={`w-0.5 h-2.5 ${isDark ? 'bg-white' : 'bg-black'}`} />
          </div>
          <span className={`text-[9.5px] font-bold ${textColor}`}>
            {settings.sim1Network === 'None' ? '5G' : settings.sim1Network}
          </span>
          <span className={`text-[10.5px] font-bold ${textColor}`}>{settings.batteryPercent}%</span>
          <div className="w-5 h-2.5 border border-current rounded-[2px] p-[1px] relative flex items-center">
            <div 
              className={`h-full ${settings.isCharging ? 'bg-emerald-400' : 'bg-current'}`}
              style={{ width: `${settings.batteryPercent}%` }}
            />
            <div className="absolute -right-1 top-0.5 w-0.5 h-1 bg-current" />
          </div>
        </div>
      </div>
    );
  }

  // 4. Default: Tecno / Infinix (HiOS / XOS) - Screenshot Exact Replication
  // Displays: [Time] ... [🔕] [0.00 KB/S stacked] [H+] [3G] [[ 75 ]]
  return (
    <div 
      onClick={onClick}
      title="Click to customize Phone Status Bar (Tecno / Infinix / Samsung / iPhone)"
      className={`w-full px-4 pt-1.5 pb-1 flex items-center justify-between text-xs select-none relative group cursor-pointer transition-colors ${className}`}
    >
      {/* Left: Time matching screenshot */}
      <div className="flex items-center space-x-1.5">
        <span className={`font-bold tracking-tight text-[12.5px] ${textColor}`}>
          {displayTime}
        </span>
      </div>

      {/* Right: Screenshot Exact Layout */}
      <div className="flex items-center space-x-2 text-[11px]">
        {/* Silent / Vibrate Icon */}
        {settings.soundMode === 'mute' && (
          <svg className={`w-3.5 h-3.5 ${textColor} fill-none stroke-current stroke-2`} viewBox="0 0 24 24">
            <path d="M10.26 5.15A5.86 5.86 0 0 1 12 5c3.31 0 6 2.69 6 6v3" />
            <path d="M6 11v3l-2 2h13" />
            <path d="M10.3 21a2 2 0 0 0 3.4 0" />
            <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
        {settings.soundMode === 'vibrate' && (
          <Vibrate className={`w-3.5 h-3.5 ${iconColor}`} />
        )}

        {/* Speed: e.g. 0.00 KB/S stacked vertically matching screenshot */}
        {settings.showNetworkSpeed && settings.networkSpeedText && (
          <div className="flex flex-col items-end leading-none">
            <span className={`font-mono text-[8px] font-bold ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
              {settings.networkSpeedText.split(' ')[0] || '0.00'}
            </span>
            <span className={`font-mono text-[6.5px] font-bold ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              {settings.networkSpeedText.split(' ')[1] || 'KB/S'}
            </span>
          </div>
        )}

        {/* Cellular 1: e.g. H+ or 4G Signal with 4 bars */}
        {settings.sim1Network !== 'None' && (
          <div className="flex items-center space-x-0.5">
            <div className="flex items-end space-x-0.5 h-2.5">
              <div className={`w-0.5 h-1 ${isDark ? 'bg-white' : 'bg-black'} rounded-xs`} />
              <div className={`w-0.5 h-1.5 ${isDark ? 'bg-white' : 'bg-black'} rounded-xs`} />
              <div className={`w-0.5 h-2 ${isDark ? 'bg-white' : 'bg-black'} rounded-xs`} />
              <div className={`w-0.5 h-2.5 ${isDark ? 'bg-white' : 'bg-black'} rounded-xs`} />
            </div>
            <span className={`text-[9.5px] font-bold ml-0.5 ${textColor}`}>{settings.sim1Network}</span>
          </div>
        )}

        {/* Cellular 2: e.g. 3G Signal with 4 bars */}
        {settings.sim2Network !== 'None' && (
          <div className="flex items-center space-x-0.5">
            <div className="flex items-end space-x-0.5 h-2.5">
              <div className={`w-0.5 h-1 ${isDark ? 'bg-white' : 'bg-black'} rounded-xs`} />
              <div className={`w-0.5 h-1.5 ${isDark ? 'bg-white' : 'bg-black'} rounded-xs`} />
              <div className={`w-0.5 h-2 ${isDark ? 'bg-white' : 'bg-black'} rounded-xs`} />
              <div className={`w-0.5 h-2.5 ${isDark ? 'bg-white' : 'bg-black'} rounded-xs`} />
            </div>
            <span className={`text-[9.5px] font-bold ml-0.5 ${textColor}`}>{settings.sim2Network}</span>
          </div>
        )}

        {/* Wi-Fi if enabled */}
        {settings.showWifi && (
          <Wifi className={`w-3.5 h-3.5 ${iconColor}`} />
        )}

        {/* Battery pill with percentage inside matching Screenshot_20260909-113343.png */}
        <div className={`w-7 h-3.5 border ${isDark ? 'border-white' : 'border-neutral-900'} rounded-[4px] px-0.5 flex items-center justify-center relative`}>
          <span className={`text-[9px] font-bold leading-none ${textColor}`}>
            {settings.batteryPercent}
          </span>
          {settings.isCharging && (
            <span className="text-[8px] text-emerald-400 font-bold ml-0.5">⚡</span>
          )}
          <div className={`absolute -right-1 top-1 w-0.5 h-1.5 ${isDark ? 'bg-white' : 'bg-neutral-900'} rounded-r-xs`} />
        </div>
      </div>

      {/* Hover visual cue */}
      {showEditHint && (
        <div className="absolute right-1 top-0 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded shadow">
          Customize
        </div>
      )}
    </div>
  );
};

export default PhoneStatusBar;

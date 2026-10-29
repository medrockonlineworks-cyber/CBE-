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
  theme?: 'cbe' | 'dark' | 'light';
  onClick?: () => void;
  className?: string;
  showEditHint?: boolean;
}

export const PhoneStatusBar: React.FC<PhoneStatusBarProps> = ({
  theme = 'cbe',
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

  const displayTime = settings.useRealTime ? realTime : (settings.timeString || '11:10');
  const isCbe = theme === 'cbe';
  const isDark = theme === 'dark' || isCbe;
  const textColor = isDark ? 'text-white' : 'text-neutral-900';
  const subTextColor = isCbe ? 'text-white/80' : isDark ? 'text-neutral-300' : 'text-neutral-700';
  const iconColor = isDark ? 'text-white' : 'text-neutral-800';
  const containerBgClass = isCbe ? 'bg-[#70189F] text-white' : '';

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

  // 4. Default: Tecno / Infinix (HiOS / XOS / Android) - Screenshot Exact Replication (Screenshot_20261028-111001_7018c5b4.png)
  // Displays: [11:10 ▢ 🛡 ✈ ✈] ... [ᛒ 🔔 3.66 KB/S 🛜 4G [100]]
  return (
    <div 
      onClick={onClick}
      title="Click to customize Phone Status Bar (Tecno / Infinix / Samsung / iPhone)"
      className={`w-full px-3.5 sm:px-4 pt-1.5 pb-1 flex items-center justify-between text-xs select-none relative group cursor-pointer transition-colors ${className}`}
    >
      {/* Left: Time and Notifications matching Screenshot_20261028-111001_7018c5b4.png */}
      <div className="flex items-center space-x-1.5">
        <span className={`font-bold tracking-tight text-[12.5px] ${textColor}`}>
          {displayTime}
        </span>

        {/* Status notification icons: message, shield, and telegram arrows */}
        <div className="flex items-center space-x-1 pl-0.5 opacity-90">
          {/* App / Notification square icon */}
          <svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="2" y="2" width="12" height="12" rx="3.5" />
            <path d="M5 6h6M5 10h4" strokeLinecap="round" />
          </svg>

          {/* Shield Check Icon */}
          <svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M8 1.5L2.5 4v4c0 3.5 2.5 6 5.5 7 3-1 5.5-3.5 5.5-7V4L8 1.5Z" />
            <path d="M5.5 8l1.8 1.8 3.2-3.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          {/* Telegram / Message Send Arrow 1 */}
          <svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14.5 1.5L1.5 6.5l4.5 2 2 4.5 6.5-11.5z" />
          </svg>

          {/* Telegram / Message Send Arrow 2 */}
          <svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14.5 1.5L1.5 6.5l4.5 2 2 4.5 6.5-11.5z" />
          </svg>
        </div>
      </div>

      {/* Right: Screenshot Exact Layout (Bluetooth, Bell, Speed, WiFi, 4G, Battery [100]) */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 text-[11px]">
        {/* Bluetooth Icon */}
        <Bluetooth className={`w-3 h-3 ${iconColor} opacity-90`} />

        {/* Notification Bell / Silent Icon */}
        <svg className={`w-3 h-3 ${iconColor} opacity-90`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M8 2a3 3 0 0 0-3 3v3l-1.5 2h9L11 8V5a3 3 0 0 0-3-3Z" />
          <path d="M6.5 13a1.5 1.5 0 0 0 3 0" />
        </svg>

        {/* Speed: e.g. 3.66 KB/S stacked vertically matching screenshot */}
        <div className="flex flex-col items-end leading-none">
          <span className={`font-mono text-[8px] font-bold ${textColor}`}>
            {settings.networkSpeedText ? settings.networkSpeedText.split(' ')[0] : '3.66'}
          </span>
          <span className={`font-mono text-[6.5px] font-bold ${subTextColor}`}>
            {settings.networkSpeedText ? settings.networkSpeedText.split(' ')[1] || 'KB/S' : 'KB/S'}
          </span>
        </div>

        {/* Wi-Fi Icon */}
        <Wifi className={`w-3.5 h-3.5 ${iconColor}`} />

        {/* Cellular 4G Signal with 4 bars */}
        <div className="flex items-center space-x-0.5">
          <div className="flex items-end space-x-0.5 h-2.5">
            <div className={`w-0.5 h-1 ${isDark ? 'bg-white' : 'bg-black'} rounded-xs`} />
            <div className={`w-0.5 h-1.5 ${isDark ? 'bg-white' : 'bg-black'} rounded-xs`} />
            <div className={`w-0.5 h-2 ${isDark ? 'bg-white' : 'bg-black'} rounded-xs`} />
            <div className={`w-0.5 h-2.5 ${isDark ? 'bg-white' : 'bg-black'} rounded-xs`} />
          </div>
          <span className={`text-[9.5px] font-bold ml-0.5 ${textColor}`}>
            {settings.sim1Network === 'None' ? '4G' : settings.sim1Network}
          </span>
        </div>

        {/* Battery pill with percentage inside matching Screenshot_20261028-111001_7018c5b4.png [ 100 ] */}
        <div className={`border ${isDark ? 'border-white' : 'border-neutral-900'} rounded-[4px] px-1 py-[0.5px] flex items-center justify-center relative min-w-[26px] h-3.5`}>
          <span className={`text-[9px] font-bold leading-none ${textColor}`}>
            {settings.batteryPercent || 100}
          </span>
          {settings.isCharging && (
            <span className="text-[8px] text-emerald-400 font-bold ml-0.5">⚡</span>
          )}
          <div className={`absolute -right-0.5 top-1 w-0.5 h-1.5 ${isDark ? 'bg-white' : 'bg-neutral-900'} rounded-r-xs`} />
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

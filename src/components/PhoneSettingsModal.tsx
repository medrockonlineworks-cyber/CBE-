import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  Clock, 
  Battery, 
  BatteryCharging, 
  Wifi, 
  VolumeX, 
  Vibrate, 
  Volume2, 
  RotateCcw, 
  Check, 
  Sliders, 
  Sparkles,
  Zap,
  Activity
} from 'lucide-react';
import { 
  PhoneSettingsService, 
  PhoneSettings, 
  PhoneModelType, 
  NetworkTech, 
  SoundMode, 
  NavigationBarStyle,
  PHONE_PRESETS 
} from '../services/phoneSettingsService';
import PhoneStatusBar from './PhoneStatusBar';

interface PhoneSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhoneSettingsModal: React.FC<PhoneSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [settings, setSettings] = useState<PhoneSettings>(() => PhoneSettingsService.getSettings());

  useEffect(() => {
    if (isOpen) {
      setSettings(PhoneSettingsService.getSettings());
    }
  }, [isOpen]);

  // Handle hardware / phone back event and escape key to close cleanly
  useEffect(() => {
    if (!isOpen) return;
    const handleBack = (e: any) => {
      e?.detail?.setHandled?.();
      e?.preventDefault?.();
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('cbe_phone_back', handleBack);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('cbe_phone_back', handleBack);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleUpdate = (partial: Partial<PhoneSettings>) => {
    const updated = PhoneSettingsService.updateSettings(partial);
    setSettings(updated);
  };

  const handleApplyPreset = (model: PhoneModelType) => {
    const updated = PhoneSettingsService.applyPreset(model);
    setSettings(updated);
  };

  const handleReset = () => {
    const updated = PhoneSettingsService.resetToDefault();
    setSettings(updated);
  };

  const phoneModels: { id: PhoneModelType; name: string; brand: string; desc: string; icon: string }[] = [
    {
      id: 'tecno',
      name: 'Tecno / Infinix',
      brand: 'HiOS / XOS',
      desc: 'Exact match from CBE screenshots (11:33, 🔕, 0.00 KB/S, H+ 3G, 75%)',
      icon: '📱'
    },
    {
      id: 'samsung',
      name: 'Samsung Galaxy',
      brand: 'One UI',
      desc: 'One UI status layout with VoLTE, 5G signal bars & horizontal battery',
      icon: '📱'
    },
    {
      id: 'iphone',
      name: 'iPhone 16 Pro',
      brand: 'iOS 18',
      desc: 'Dynamic Island cutout, bold time, iOS cellular bars & battery pill',
      icon: '🍎'
    },
    {
      id: 'pixel',
      name: 'Google Pixel',
      brand: 'Stock Android',
      desc: 'Clean center punch-hole camera, Material You status glyphs',
      icon: '📱'
    },
    {
      id: 'xiaomi',
      name: 'Xiaomi / Redmi',
      brand: 'HyperOS',
      desc: 'Modern MIUI / HyperOS indicators with dual 4G/VoLTE',
      icon: '📱'
    }
  ];

  const networkOptions: NetworkTech[] = ['H+', '4G', '5G', 'LTE', '3G', 'None'];

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn select-none"
    >
      <div className="bg-neutral-900 border border-neutral-800 text-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800/90 flex items-center justify-between bg-neutral-950/80 sticky top-0 z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Phone & Status Bar</h2>
              <p className="text-xs text-neutral-400">Customize phone model and status bar in all apps</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-6 text-sm">
          
          {/* Live Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                Live Status Bar Preview
              </span>
              <span className="text-[11px] text-neutral-500">Updates across all apps instantly</span>
            </div>
            
            <div className="rounded-xl overflow-hidden border border-neutral-800 shadow-inner bg-black">
              {/* Dark mode simulation */}
              <div className="bg-[#121212] border-b border-neutral-800/60 py-0.5">
                <PhoneStatusBar theme="dark" />
              </div>
              {/* Light mode simulation */}
              <div className="bg-[#f4f5f7] py-0.5">
                <PhoneStatusBar theme="light" />
              </div>
            </div>
          </div>

          {/* 1. Phone Model Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Select Phone Model Preset
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {phoneModels.map((m) => {
                const isSelected = settings.phoneModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleApplyPreset(m.id)}
                    className={`text-left p-3 rounded-xl border transition flex items-start space-x-3 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 text-white ring-1 ring-blue-500'
                        : 'bg-neutral-800/60 border-neutral-750 hover:bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{m.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-white">{m.name}</span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px]">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-blue-400 font-medium block">{m.brand}</span>
                      <p className="text-[10px] text-neutral-400 leading-snug mt-0.5 line-clamp-2">{m.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Clock / Time Configuration */}
          <div className="bg-neutral-800/40 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                Clock & Time Display
              </span>
              <label className="flex items-center space-x-2 text-xs text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.useRealTime}
                  onChange={(e) => handleUpdate({ useRealTime: e.target.checked })}
                  className="rounded bg-neutral-800 border-neutral-700 text-blue-500 focus:ring-0"
                />
                <span>Real-Time Clock</span>
              </label>
            </div>

            {!settings.useRealTime ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={settings.timeString}
                  onChange={(e) => handleUpdate({ timeString: e.target.value })}
                  placeholder="11:33"
                  className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                {['11:33', '11:32', '12:54', '3:28', '9:41'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleUpdate({ timeString: preset })}
                    className="px-2.5 py-1 text-xs rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/60 cursor-pointer transition"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-neutral-400">
                Using current device system clock: <span className="text-emerald-400 font-mono font-bold">{PhoneSettingsService.formatCurrentClock()}</span>
              </div>
            )}
          </div>

          {/* 3. Battery Level & Charging */}
          <div className="bg-neutral-800/40 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <Battery className="w-4 h-4 text-emerald-400" />
                Battery Percentage: <span className="text-emerald-400 font-bold ml-1">{settings.batteryPercent}%</span>
              </span>
              <button
                type="button"
                onClick={() => handleUpdate({ isCharging: !settings.isCharging })}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center space-x-1 transition cursor-pointer ${
                  settings.isCharging
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>{settings.isCharging ? 'Charging (⚡)' : 'Not Charging'}</span>
              </button>
            </div>

            <input
              type="range"
              min="1"
              max="100"
              value={settings.batteryPercent}
              onChange={(e) => handleUpdate({ batteryPercent: parseInt(e.target.value, 10) || 75 })}
              className="w-full accent-emerald-500 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
            />

            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-neutral-400">Presets:</span>
              {[100, 82, 75, 68, 49, 39, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleUpdate({ batteryPercent: pct })}
                  className={`px-2 py-0.5 text-xs rounded transition cursor-pointer ${
                    settings.batteryPercent === pct
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* 4. Network Speed Display */}
          <div className="bg-neutral-800/40 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-200">
                Network Speed Indicator
              </span>
              <label className="flex items-center space-x-2 text-xs text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showNetworkSpeed}
                  onChange={(e) => handleUpdate({ showNetworkSpeed: e.target.checked })}
                  className="rounded bg-neutral-800 border-neutral-700 text-blue-500 focus:ring-0"
                />
                <span>Show Speed</span>
              </label>
            </div>

            {settings.showNetworkSpeed && (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={settings.networkSpeedText}
                  onChange={(e) => handleUpdate({ networkSpeedText: e.target.value })}
                  placeholder="0.00 KB/S"
                  className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                />
                {['0.00 KB/S', '2.10 KB/S', '7.30 KB/S', '120 KB/S'].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => handleUpdate({ networkSpeedText: speed })}
                    className="px-2 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/60 cursor-pointer font-mono"
                  >
                    {speed}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 5. Cellular Signals, Wi-Fi & Sound */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Cellular SIM 1 & 2 */}
            <div className="bg-neutral-800/40 border border-neutral-800 rounded-xl p-3.5 space-y-2.5">
              <span className="text-xs font-semibold text-neutral-200 block">
                Cellular Network Tech
              </span>
              
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">SIM 1 Network:</label>
                <div className="grid grid-cols-3 gap-1">
                  {networkOptions.map((net) => (
                    <button
                      key={`sim1-${net}`}
                      type="button"
                      onClick={() => handleUpdate({ sim1Network: net })}
                      className={`py-1 text-xs rounded text-center font-medium transition cursor-pointer ${
                        settings.sim1Network === net
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      }`}
                    >
                      {net}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">SIM 2 Network:</label>
                <div className="grid grid-cols-3 gap-1">
                  {networkOptions.map((net) => (
                    <button
                      key={`sim2-${net}`}
                      type="button"
                      onClick={() => handleUpdate({ sim2Network: net })}
                      className={`py-1 text-xs rounded text-center font-medium transition cursor-pointer ${
                        settings.sim2Network === net
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      }`}
                    >
                      {net}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sound & Wi-Fi */}
            <div className="bg-neutral-800/40 border border-neutral-800 rounded-xl p-3.5 space-y-3">
              <span className="text-xs font-semibold text-neutral-200 block">
                Sound Mode & Wi-Fi
              </span>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Sound Mode:</label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'mute' as SoundMode, label: 'Silent (🔕)', icon: VolumeX },
                    { id: 'vibrate' as SoundMode, label: 'Vibrate', icon: Vibrate },
                    { id: 'normal' as SoundMode, label: 'Normal', icon: Volume2 }
                  ].map((s) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleUpdate({ soundMode: s.id })}
                        className={`py-1.5 px-1 text-xs rounded flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                          settings.soundMode === s.id
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-[10px]">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center justify-between p-2 rounded-lg bg-neutral-800/70 border border-neutral-700/60 cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <Wifi className="w-4 h-4 text-sky-400" />
                    <span className="text-xs text-neutral-200">Wi-Fi Connection</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showWifi}
                    onChange={(e) => handleUpdate({ showWifi: e.target.checked })}
                    className="rounded bg-neutral-800 border-neutral-700 text-blue-500 focus:ring-0"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* 6. Navigation Bar Style */}
          <div className="bg-neutral-800/40 border border-neutral-800 rounded-xl p-4 space-y-2.5">
            <span className="text-xs font-semibold text-neutral-200 block">
              Bottom Navigation Bar Style
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'buttons' as NavigationBarStyle, title: '3-Button', sub: '|||  ○  <' },
                { id: 'gesture' as NavigationBarStyle, title: 'Gesture Bar', sub: '—' },
                { id: 'none' as NavigationBarStyle, title: 'Immersive', sub: 'Hidden' }
              ].map((nav) => (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => handleUpdate({ navBarStyle: nav.id })}
                  className={`p-2.5 rounded-lg border text-center transition cursor-pointer ${
                    settings.navBarStyle === nav.id
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-neutral-800/60 border-neutral-750 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  <div className="font-semibold text-xs">{nav.title}</div>
                  <div className="text-[11px] text-blue-400 font-mono mt-0.5">{nav.sub}</div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between sticky bottom-0 z-10">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-neutral-400 hover:text-white flex items-center space-x-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Screenshot Defaults</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-medium text-xs shadow-md transition cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

export default PhoneSettingsModal;

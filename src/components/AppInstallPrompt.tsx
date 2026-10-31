import React, { useState, useEffect } from 'react';
import { usePwaInstall } from '../lib/usePwaInstall';
import { LocalDb } from '../lib/mockData';
import { CbeLogo } from './CbeLogo';
import { 
  Download, 
  Smartphone, 
  CheckCircle2, 
  X, 
  HelpCircle, 
  ExternalLink,
  ShieldCheck, 
  Maximize2, 
  Info
} from 'lucide-react';

export interface AppInstallPromptProps {
  mode?: 'modal' | 'card' | 'button' | 'banner' | 'settings';
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

const SNOOZE_STORAGE_KEY = 'tana_pwa_banner_snooze_until';
const FIVE_MINUTES_MS = 5 * 60 * 1000;

export const AppInstallPrompt: React.FC<AppInstallPromptProps> = ({
  mode = 'settings',
  isOpen = true,
  onClose,
  className = ''
}) => {
  const { 
    isInstallable, 
    isInstalled, 
    isStandalone, 
    isAndroid, 
    isIos, 
    isInIframe,
    promptInstall,
    openInBrowserTab
  } = usePwaInstall();

  const [installing, setInstalling] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [customLogo, setCustomLogo] = useState<string | null>(() => LocalDb.getCustomBankLogo());

  // Keep custom logo synchronized
  useEffect(() => {
    const handleUpdate = () => setCustomLogo(LocalDb.getCustomBankLogo());
    window.addEventListener('cbe_logo_updated', handleUpdate);
    window.addEventListener('bank_logo_updated', handleUpdate);
    return () => {
      window.removeEventListener('cbe_logo_updated', handleUpdate);
      window.removeEventListener('bank_logo_updated', handleUpdate);
    };
  }, []);

  // Initialize dismissed state based on 5-minute snooze cooldown (for banner mode)
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (mode === 'settings') return false; // Never dismiss inside Settings
    try {
      const snoozeUntil = localStorage.getItem(SNOOZE_STORAGE_KEY);
      if (snoozeUntil) {
        const remaining = Number(snoozeUntil) - Date.now();
        if (remaining > 0) {
          return true;
        }
      }
    } catch {}
    return false;
  });

  // Automatically restore banner once the 5-minute snooze expires
  useEffect(() => {
    if (mode === 'settings' || !dismissed) return;
    try {
      const snoozeUntil = localStorage.getItem(SNOOZE_STORAGE_KEY);
      if (snoozeUntil) {
        const remaining = Number(snoozeUntil) - Date.now();
        if (remaining > 0) {
          const timer = setTimeout(() => {
            setDismissed(false);
          }, remaining);
          return () => clearTimeout(timer);
        } else {
          setDismissed(false);
        }
      }
    } catch {}
  }, [dismissed, mode]);

  // Auto-dismiss banner after 5 minutes of continuous display if user neither installs nor cancels
  useEffect(() => {
    if (mode !== 'banner' || dismissed) return;
    const autoDismissTimer = setTimeout(() => {
      handleDismiss();
    }, FIVE_MINUTES_MS);
    return () => clearTimeout(autoDismissTimer);
  }, [mode, dismissed]);

  // Dismiss / Cancel handler for banner or card
  const handleDismiss = () => {
    try {
      localStorage.setItem(SNOOZE_STORAGE_KEY, (Date.now() + FIVE_MINUTES_MS).toString());
    } catch {}
    setDismissed(true);
    if (onClose) onClose();
  };

  // Direct PWA Install Handler
  const handleInstall = async () => {
    setInstalling(true);
    try {
      const result = await promptInstall();
      if (result.outcome === 'manual_required') {
        setShowManualGuide(true);
      }
    } catch (err) {
      console.error('Install prompt error:', err);
      setShowManualGuide(true);
    } finally {
      setInstalling(false);
    }
  };

  // Reusable Step-by-Step Manual Installation Guide
  const renderManualGuideModal = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-amber-400/40 rounded-3xl max-w-sm w-full p-5 text-white space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-400" />
            <h4 className="font-bold text-sm text-white">
              {isIos ? 'Install on iPhone / iPad' : 'Install as Standalone Application'}
            </h4>
          </div>
          <button 
            type="button"
            onClick={() => setShowManualGuide(false)}
            className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/10">
          <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center flex-shrink-0 shadow-sm border border-neutral-200">
            <CbeLogo className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">CBE Mobil</p>
            <p className="text-[10.5px] text-amber-300/90">
              {customLogo ? 'Installs with your white background app icon' : 'Installs with official CBE Gold Emblem on white'}
            </p>
          </div>
        </div>

        {isIos ? (
          <ol className="space-y-3 text-xs text-slate-200">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>Tap the <strong>Share</strong> button at the bottom of Safari.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong>.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>Tap <strong>&quot;Add&quot;</strong>. It launches as a dedicated fullscreen application.</span>
            </li>
          </ol>
        ) : (
          <ol className="space-y-3 text-xs text-slate-200">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div>
                <span>Tap the <strong>three dots (⋮)</strong> menu in the top right of Chrome.</span>
                {isInIframe && (
                  <p className="text-[10.5px] text-amber-300 mt-0.5 font-medium">
                    Note: Open in a direct tab first if viewing inside a preview iframe.
                  </p>
                )}
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div>
                <span>Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Install CBE Mobil&quot;</strong>.</span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Avoid selecting &quot;Create shortcut&quot; to ensure a genuine WebAPK application is installed in your app drawer.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>Tap <strong>&quot;Install&quot;</strong>. Android will mint and install CBE Mobil in your app drawer.</span>
            </li>
          </ol>
        )}

        <div className="flex gap-2">
          {isInIframe && (
            <button
              type="button"
              onClick={openInBrowserTab}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-amber-400/30"
            >
              <span>Open in Direct Tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowManualGuide(false)}
            className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );

  // 1. Settings Page Dedicated Install Section
  if (mode === 'settings') {
    return (
      <div 
        id="settings-install-section"
        className={`bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 text-purple-900 rounded-xl">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">Application &amp; Device Installation</h3>
              <p className="text-[11px] text-gray-500">Install CBE Mobil to your home screen</p>
            </div>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
            isStandalone 
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
              : 'bg-amber-50 text-amber-900 border border-amber-200/80'
          }`}>
            {isStandalone ? 'Installed' : 'PWA Ready'}
          </span>
        </div>

        {/* Preview Card with CBE App Icon */}
        <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 rounded-2xl p-4 text-white border border-purple-900/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start gap-3.5 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-200 p-2 flex items-center justify-center flex-shrink-0 shadow-lg group relative">
              <CbeLogo className="w-full h-full object-contain" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center" title="App Icon Ready">
                <CheckCircle2 className="w-2.5 h-2.5 text-white stroke-[3]" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-base font-black text-white tracking-tight">CBE Mobil</h4>
                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold border bg-amber-400/20 text-amber-300 border-amber-400/30">
                  {customLogo ? 'Custom Uploaded Icon' : 'Official CBE App'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {customLogo 
                  ? 'Commercial Bank of Ethiopia Mobile Banking. Installs with your white background app icon on your device home screen for fast, secure banking.'
                  : 'Commercial Bank of Ethiopia Mobile Banking. Install the official application on your device\'s home screen with clean white icon background for fast, secure banking.'}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300 relative z-10">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>CBE Secure Encrypted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Fullscreen App Experience</span>
            </div>
          </div>
        </div>

        {/* Action button: Install or Active status */}
        {isStandalone ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-emerald-900">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-950">App Installed &amp; Active</p>
                <p className="text-[11px] text-emerald-700">Running as CBE Mobil in standalone application mode.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowManualGuide(true)}
              className="text-xs font-bold text-emerald-800 hover:underline shrink-0 cursor-pointer"
            >
              Details
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {isInIframe && (
              <div className="bg-purple-50/90 border border-purple-200 rounded-2xl p-3 flex items-start justify-between gap-2.5 text-purple-950">
                <div className="text-xs space-y-0.5 min-w-0">
                  <p className="font-extrabold text-purple-900 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-purple-800 shrink-0" />
                    <span>Install as Native App (Not Shortcut)</span>
                  </p>
                  <p className="text-[11px] text-purple-800/90 leading-relaxed">
                    Browsers only allow full standalone application installation (WebAPK) in a direct browser tab. Open directly in Chrome/Safari:
                  </p>
                </div>
                <button
                  id="btn-open-tab-install"
                  type="button"
                  onClick={openInBrowserTab}
                  className="px-3 py-1.5 bg-purple-900 hover:bg-purple-800 text-amber-300 font-bold rounded-xl text-[11px] flex items-center gap-1 shrink-0 shadow-sm cursor-pointer transition-colors"
                >
                  <span>Open Tab</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}

            <button
              id="btn-settings-install-app"
              type="button"
              onClick={handleInstall}
              disabled={installing}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-amber-400 via-[#deb356] to-amber-500 hover:from-amber-300 hover:to-[#e5bf67] active:scale-[0.99] text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>{installing ? 'Launching Installer...' : 'Install CBE Mobil'}</span>
            </button>

            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => setShowManualGuide(true)}
                className="text-[11px] font-semibold text-purple-900 hover:text-purple-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Install as Application guide (Android &amp; iOS)</span>
              </button>
              <span className="text-[10px] text-gray-400 font-mono">v2.6.4 CBE PWA</span>
            </div>
          </div>
        )}

        {/* Guided Step-by-Step Modal */}
        {showManualGuide && renderManualGuideModal()}
      </div>
    );
  }

  // If already running inside installed standalone window, hide prompt for banner or card
  if (isStandalone) {
    if (mode === 'card') {
      return (
        <div className={`bg-emerald-950/30 border border-emerald-800/40 rounded-2xl p-4 flex items-center justify-between gap-3 text-emerald-300 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Application Installed</p>
              <p className="text-[11px] text-emerald-400/80">Running in mobile fullscreen mode</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-900/50 text-[10px] font-mono text-emerald-300 border border-emerald-700/40">
            Active PWA
          </span>
        </div>
      );
    }
    return null;
  }

  // If dismissed during this session view, remove from UI (banner or card at the bottom)
  if (dismissed && !showManualGuide) {
    return null;
  }

  // 2. Banner Mode
  if (mode === 'banner') {
    return (
      <>
        {!dismissed && (
          <div 
            id="pwa-install-banner"
            className={`w-full bg-gradient-to-r from-slate-900 via-[#260534] to-slate-900 border-b border-[#deb356]/40 px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-lg z-40 transition-all ${className}`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-black/50 border border-[#deb356]/40 p-1 flex items-center justify-center shrink-0">
                <CbeLogo className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">CBE Mobile Banking</span>
                  <span className="px-1.5 py-0.2 bg-[#deb356]/20 text-[#deb356] border border-[#deb356]/30 text-[9px] font-bold rounded">
                    {customLogo ? 'Custom Icon' : 'Official'}
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-300 truncate">Commercial Bank of Ethiopia</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="btn-pwa-banner-install"
                type="button"
                onClick={handleInstall}
                disabled={installing}
                className="px-3 py-1.5 bg-gradient-to-r from-[#dfa04c] to-[#deb356] hover:from-[#c9903f] hover:to-[#c99f47] active:scale-95 text-slate-950 font-black rounded-lg text-xs shadow-md flex items-center gap-1.5 transition-all touch-manipulation cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{installing ? 'Installing...' : 'Install'}</span>
              </button>

              <button 
                id="btn-pwa-banner-dismiss"
                type="button"
                onClick={handleDismiss} 
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-red-500/25 active:bg-red-500/40 text-slate-300 hover:text-white border border-white/15 transition-all cursor-pointer active:scale-95 shrink-0"
                aria-label="Cancel and remove install banner"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {showManualGuide && renderManualGuideModal()}
      </>
    );
  }

  // 3. Card Mode
  if (mode === 'card') {
    return (
      <>
        <div 
          id="pwa-install-card"
          className={`bg-gradient-to-b from-slate-900 to-[#1e042b] border border-[#deb356]/30 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden ${className}`}
        >
          <button
            id="btn-pwa-card-dismiss"
            type="button"
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors z-10"
            aria-label="Dismiss install card"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3.5 mb-4 pr-6">
            <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 p-1.5 flex items-center justify-center flex-shrink-0 shadow-md">
              <CbeLogo className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#deb356]/20 text-[#deb356] border border-[#deb356]/30">
                  {customLogo ? 'Custom Uploaded Icon' : 'Official CBE App'}
                </span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Maximize2 className="w-2.5 h-2.5" /> Fullscreen PWA
                </span>
              </div>
              <h3 className="text-base font-extrabold text-white mt-1">CBE Mobil</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {customLogo 
                  ? 'Install CBE Mobil on your device with your white background icon for fast, clean, and secure banking.'
                  : 'Install the official CBE Mobil application on your device with white icon background for fast, secure, and clean banking.'}
              </p>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <button
              id="btn-pwa-install-action"
              type="button"
              onClick={handleInstall}
              disabled={installing}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#dfa04c] to-[#deb356] hover:from-[#c9903f] hover:to-[#c99f47] active:scale-[0.99] text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-[#deb356]/20 flex items-center justify-center gap-2 transition-all touch-manipulation disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{installing ? 'LAUNCHING INSTALLER...' : 'INSTALL CBE MOBIL'}</span>
            </button>
          </div>
        </div>

        {showManualGuide && renderManualGuideModal()}
      </>
    );
  }

  // 4. Button Mode
  if (mode === 'button') {
    return (
      <>
        <button
          type="button"
          onClick={handleInstall}
          disabled={installing}
          className={`px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow transition cursor-pointer disabled:opacity-50 ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>{installing ? 'Installing...' : 'Install App'}</span>
        </button>

        {showManualGuide && renderManualGuideModal()}
      </>
    );
  }

  // 5. Modal Dialog Mode
  if (mode === 'modal' && isOpen) {
    return renderManualGuideModal();
  }

  return null;
};

export default AppInstallPrompt;

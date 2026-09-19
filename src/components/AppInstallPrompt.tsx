import React, { useState, useEffect } from 'react';
import { usePwaInstall } from '../lib/usePwaInstall';
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
  ChevronRight,
  Info
} from 'lucide-react';

interface AppInstallPromptProps {
  mode?: 'modal' | 'card' | 'button' | 'banner';
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

const SNOOZE_STORAGE_KEY = 'tana_pwa_banner_snooze_until';
const FIVE_MINUTES_MS = 5 * 60 * 1000;

export const AppInstallPrompt: React.FC<AppInstallPromptProps> = ({
  mode = 'card',
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
    hasPrompt, 
    promptInstall 
  } = usePwaInstall();

  const [installing, setInstalling] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [showNativeInfo, setShowNativeInfo] = useState(false);

  // Initialize dismissed state based on 5-minute snooze cooldown
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      const snoozeUntil = localStorage.getItem(SNOOZE_STORAGE_KEY);
      if (snoozeUntil) {
        const remaining = Number(snoozeUntil) - Date.now();
        if (remaining > 0) {
          return true; // Still waiting / snoozed for 5 minutes
        }
      }
    } catch {}
    return false;
  });

  // Check and automatically restore banner once the 5-minute snooze expires
  useEffect(() => {
    if (!dismissed) return;
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
  }, [dismissed]);

  // Auto-dismiss banner after 5 minutes of continuous display if user neither installs nor cancels
  useEffect(() => {
    if (mode !== 'banner' || dismissed) return;
    const autoDismissTimer = setTimeout(() => {
      handleDismiss();
    }, FIVE_MINUTES_MS);
    return () => clearTimeout(autoDismissTimer);
  }, [mode, dismissed]);

  // If already running inside installed standalone window, hide prompt unless in card mode in Profile
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

  // If dismissed during this session view
  if (dismissed && mode === 'banner' && !showManualGuide) {
    return null;
  }

  // Dismiss / Cancel handler: saves 5-minute cooldown and immediately removes from UI
  const handleDismiss = () => {
    try {
      localStorage.setItem(SNOOZE_STORAGE_KEY, (Date.now() + FIVE_MINUTES_MS).toString());
    } catch {}
    setDismissed(true);
    if (onClose) onClose();
  };

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      const result = await promptInstall();
      if (result.outcome === 'accepted') {
        if (onClose) onClose();
      } else if (result.outcome === 'manual_required') {
        setShowManualGuide(true);
      }
    } catch (err) {
      console.error('Install prompt error:', err);
      setShowManualGuide(true);
    } finally {
      setInstalling(false);
    }
  };

  // 1. Compact Header/Button Mode
  if (mode === 'button') {
    return (
      <button
        id="btn-install-app-compact"
        onClick={handleInstallClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#deb356] hover:bg-[#dfa04c] text-slate-950 text-xs font-bold shadow-md transition-all active:scale-95 touch-manipulation ${className}`}
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // 2. Banner Mode (Top popdown alert when open in browser)
  if (mode === 'banner') {
    return (
      <>
        {!dismissed && (
          <div 
            id="pwa-install-banner"
            className={`bg-gradient-to-r from-[#2a053b] via-[#3d0856] to-[#1a0126] border-b border-[#deb356]/40 text-white px-3 py-2 shadow-xl flex items-center justify-between gap-2.5 text-xs z-50 transition-all duration-300 transform translate-y-0 ${className}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-black/40 border border-[#deb356]/40 p-1 flex items-center justify-center shrink-0 shadow-sm">
                <CbeLogo className="w-6 h-6 object-contain" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-extrabold text-[#deb356] text-xs truncate">Install Tana Bank</p>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#deb356]/20 text-[#deb356] rounded-sm border border-[#deb356]/30">App</span>
                </div>
                <p className="text-[10.5px] text-slate-300 truncate">Tap to install on device home screen</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="btn-pwa-banner-install"
                onClick={handleInstallClick}
                disabled={installing}
                className="px-3 py-1.5 bg-gradient-to-r from-[#dfa04c] to-[#deb356] hover:from-[#c9903f] hover:to-[#c99f47] active:scale-95 text-slate-950 font-black rounded-lg text-xs shadow-md flex items-center gap-1.5 transition-all touch-manipulation cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{installing ? 'Installing...' : 'Install Now'}</span>
              </button>

              {/* High-visibility X Cancel Button to immediately remove from UI & wait 5 minutes */}
              <button 
                id="btn-pwa-banner-dismiss"
                onClick={handleDismiss} 
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-red-500/25 active:bg-red-500/40 text-slate-300 hover:text-white border border-white/15 transition-all cursor-pointer active:scale-95 shrink-0"
                aria-label="Cancel and remove install banner (hide for 5 minutes)"
                title="Cancel / Hide for 5 minutes"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {/* Guided Modal for Safari / Browsers requiring manual action */}
        {showManualGuide && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-[#deb356]/40 rounded-3xl max-w-sm w-full p-5 text-white space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#deb356]" />
                  <h4 className="font-bold text-sm text-white">
                    {isIos ? 'Install on iPhone / iPad' : 'Install on Your Device'}
                  </h4>
                </div>
                <button 
                  onClick={() => setShowManualGuide(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Follow these simple steps to install the app on your home screen for full-screen offline access:
              </p>

              {isIos ? (
                <ol className="space-y-3 text-xs text-slate-200">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#deb356] text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Tap the <strong>Share</strong> button in the Safari navigation bar at the bottom.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#deb356] text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Scroll down and select <strong>"Add to Home Screen"</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#deb356] text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>Tap <strong>"Add"</strong> in the top right. Tana Bank will appear on your home screen as a standalone app.</span>
                  </li>
                </ol>
              ) : (
                <ol className="space-y-3 text-xs text-slate-200">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#deb356] text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Tap the <strong>three dots (⋮)</strong> menu in the top right corner of Chrome.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#deb356] text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Select <strong>"Install app"</strong> (or <strong>"Install Tana Digital Bank"</strong>).</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#deb356] text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>Tap <strong>"Install"</strong> in the confirmation dialog to install the real application.</span>
                  </li>
                </ol>
              )}

              <button
                onClick={() => setShowManualGuide(false)}
                className="w-full py-2.5 bg-[#deb356] hover:bg-[#c99f47] text-slate-950 font-bold rounded-xl text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // 3. Card Mode (Embedded in Login, Dashboard, or Profile)
  if (mode === 'card') {
    return (
      <div 
        id="pwa-install-card"
        className={`bg-gradient-to-b from-slate-900 to-[#1e042b] border border-[#deb356]/30 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden ${className}`}
      >
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#deb356]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-black/40 border border-[#deb356]/40 p-1 flex items-center justify-center flex-shrink-0 shadow-inner">
            <CbeLogo className="w-9 h-9" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#deb356]/20 text-[#deb356] border border-[#deb356]/30">
                Android Ready
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Maximize2 className="w-2.5 h-2.5" /> Fullscreen PWA
              </span>
            </div>
            <h3 className="text-base font-extrabold text-white mt-1">Install App</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Install this application on your Android device for faster and easier access.
            </p>
          </div>
        </div>

        {/* Features badges */}
        <div className="grid grid-cols-2 gap-2 my-3 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5 bg-black/30 px-2.5 py-1.5 rounded-xl border border-white/5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#deb356] shrink-0" />
            <span className="truncate">Safe &amp; Encrypted</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/30 px-2.5 py-1.5 rounded-xl border border-white/5">
            <Smartphone className="w-3.5 h-3.5 text-[#deb356] shrink-0" />
            <span className="truncate">Zero Address Bar</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2 mt-4">
          <button
            id="btn-pwa-install-action"
            onClick={handleInstallClick}
            disabled={installing}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#dfa04c] to-[#deb356] hover:from-[#c9903f] hover:to-[#c99f47] active:scale-[0.99] text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-[#deb356]/20 flex items-center justify-center gap-2 transition-all touch-manipulation disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{installing ? 'Preparing Install...' : 'INSTALL APP'}</span>
          </button>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setShowManualGuide(true)}
              className="text-[11px] text-slate-400 hover:text-[#deb356] flex items-center gap-1 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>How to install on Chrome?</span>
            </button>
            <button
              onClick={() => setShowNativeInfo(true)}
              className="text-[11px] text-[#deb356]/80 hover:text-[#deb356] flex items-center gap-1 transition-colors font-mono"
            >
              <span>Capacitor APK Info</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Step-by-step Manual Guide Modal if Native prompt wasn't triggered */}
        {showManualGuide && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-5 text-white space-y-4 shadow-2xl animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#deb356]" />
                  <h4 className="font-bold text-sm text-white">How to Install on Android</h4>
                </div>
                <button 
                  onClick={() => setShowManualGuide(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                If the automatic install dialog didn't appear, you can install the app directly in 3 easy steps:
              </p>

              <ol className="space-y-3 text-xs text-slate-200">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#deb356] text-slate-950 font-black text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <span>Open your browser menu (tap the <strong>three dots ⋮</strong> in the top right of Chrome or Samsung Internet).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#deb356] text-slate-950 font-black text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <span>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#deb356] text-slate-950 font-black text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <span>Tap <strong>"Install"</strong> to confirm. The app will launch in genuine fullscreen mode from your home screen.</span>
                </li>
              </ol>

              <button
                onClick={() => setShowManualGuide(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}

        {/* Native Capacitor APK compilation info */}
        {showNativeInfo && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-5 text-white space-y-4 shadow-2xl animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-[#deb356]" />
                  <h4 className="font-bold text-sm text-white">Native Android Build (Capacitor)</h4>
                </div>
                <button 
                  onClick={() => setShowNativeInfo(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <p>This project includes a complete <code className="text-[#deb356]">capacitor.config.ts</code> configuration ready for Android Studio packaging:</p>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-400 space-y-1 overflow-x-auto">
                  <p className="text-slate-400"># To compile as native APK/AAB:</p>
                  <p>npx cap add android</p>
                  <p>npm run build</p>
                  <p>npx cap sync</p>
                  <p>npx cap open android</p>
                </div>
                <p className="text-[11px] text-slate-400">
                  Both PWA installation and native Android builds use the same secure backend and business logic without code duplication.
                </p>
              </div>

              <button
                onClick={() => setShowNativeInfo(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 4. Modal Dialog Mode
  if (mode === 'modal' && isOpen) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
        <div 
          id="modal-install-app"
          className="bg-gradient-to-b from-slate-900 via-slate-900 to-[#1e042b] border border-[#deb356]/40 rounded-3xl max-w-sm w-full p-6 text-white text-center space-y-5 shadow-2xl relative"
        >
          {onClose && (
            <button 
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800/80"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="mx-auto w-16 h-16 rounded-2xl bg-black/40 border border-[#deb356]/40 p-2 flex items-center justify-center shadow-lg">
            <CbeLogo className="w-12 h-12" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-white tracking-tight">Install App</h3>
            <p className="text-xs text-slate-300 leading-relaxed px-2">
              Install this application on your Android device for faster and easier access.
            </p>
          </div>

          <div className="pt-2 space-y-2.5">
            <button
              id="btn-modal-install-confirm"
              onClick={handleInstallClick}
              disabled={installing}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#dfa04c] to-[#deb356] hover:from-[#c9903f] hover:to-[#c99f47] active:scale-[0.98] text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-[#deb356]/20 transition-all touch-manipulation disabled:opacity-50"
            >
              {installing ? 'Installing...' : 'INSTALL APP'}
            </button>

            <button
              id="btn-modal-install-cancel"
              onClick={handleDismiss}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AppInstallPrompt;

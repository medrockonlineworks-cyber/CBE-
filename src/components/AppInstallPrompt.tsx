import React, { useState, useEffect, useRef } from 'react';
import { usePwaInstall } from '../lib/usePwaInstall';
import { CbeLogo } from './CbeLogo';
import { LocalDb, DEFAULT_CBE_LOGO } from '../lib/mockData';
import { compressImageFile } from '../lib/imageUtils';
import { updatePwaBranding } from '../utils/pwaBranding';
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
  Info,
  Sparkles,
  Layers,
  Upload,
  Camera,
  RefreshCw,
  Image as ImageIcon,
  Check,
  AlertCircle
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
    hasPrompt, 
    promptInstall,
    openInBrowserTab
  } = usePwaInstall();

  const [installing, setInstalling] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [currentLogo, setCurrentLogo] = useState<string | null>(() => LocalDb.getCustomBankLogo());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');

  const inlineFileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize logo whenever changed anywhere in app
  useEffect(() => {
    const handleSync = () => {
      setCurrentLogo(LocalDb.getCustomBankLogo());
    };
    window.addEventListener('cbe_logo_updated', handleSync);
    window.addEventListener('bank_logo_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('cbe_logo_updated', handleSync);
      window.removeEventListener('bank_logo_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Handle uploading and applying custom app icon
  const handleCustomIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadSuccessMsg('');
    try {
      const dataUrl = await compressImageFile(file, 512, 0.95);
      LocalDb.setCustomBankLogo(dataUrl);
      setCurrentLogo(dataUrl);
      await updatePwaBranding(dataUrl);
      setUploadSuccessMsg('Custom icon saved & synced! App will install with this icon.');
      setTimeout(() => setUploadSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to process custom app icon:', err);
      alert('Could not process this image. Please select a valid PNG or JPG photo.');
    } finally {
      setIsUploading(false);
      if (inlineFileInputRef.current) inlineFileInputRef.current.value = '';
      if (modalFileInputRef.current) modalFileInputRef.current.value = '';
    }
  };

  // Reset to default official CBE emblem
  const handleResetToDefaultIcon = async () => {
    setIsUploading(true);
    setUploadSuccessMsg('');
    try {
      LocalDb.setCustomBankLogo(null);
      setCurrentLogo(null);
      await updatePwaBranding(null);
      setUploadSuccessMsg('Restored official CBE golden emblem.');
      setTimeout(() => setUploadSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to reset app icon:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Initialize dismissed state based on 5-minute snooze cooldown (only for banner mode)
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

  // Check and automatically restore banner once the 5-minute snooze expires
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
    setShowInstallModal(false);
    if (onClose) onClose();
  };

  const handleOpenInstallModal = () => {
    setShowInstallModal(true);
  };

  const handleDirectInstallTrigger = async () => {
    setInstalling(true);
    try {
      const result = await promptInstall();
      if (result.outcome === 'manual_required') {
        setShowManualGuide(true);
      } else {
        setShowInstallModal(false);
      }
    } catch (err) {
      console.error('Install prompt error:', err);
      setShowManualGuide(true);
    } finally {
      setInstalling(false);
    }
  };

  // Reusable Install & App Icon Customization Dialog
  const renderInstallModalContent = () => (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div 
        id="modal-install-app-custom-icon"
        className="bg-gradient-to-b from-slate-900 via-[#20042a] to-slate-950 border border-amber-400/40 rounded-3xl max-w-md w-full p-5 sm:p-6 text-white space-y-5 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">Install App &amp; Choose Icon</h3>
              <p className="text-[11px] text-slate-400">Custom home screen icon or official CBE emblem</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => {
              setShowInstallModal(false);
              if (mode === 'modal' && onClose) onClose();
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Home Screen Icon Mockup */}
        <div className="bg-black/50 border border-white/10 rounded-2xl p-4 relative z-10 space-y-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-mono uppercase tracking-wider text-[10px]">Home Screen Preview</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              currentLogo 
                ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30' 
                : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
            }`}>
              {currentLogo ? 'Custom Icon Active' : 'Official CBE Emblem'}
            </span>
          </div>

          <div className="flex items-center gap-4 pt-1">
            {/* Phone App Icon Tile */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-slate-950 border-2 border-amber-400/50 p-2 flex items-center justify-center shadow-xl relative overflow-hidden group">
                <CbeLogo className="w-full h-full object-contain" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-300 max-w-[70px] truncate text-center">
                CBE Mobile
              </span>
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs font-bold text-white">
                {currentLogo ? 'Custom Uploaded Logo' : 'Official CBE Gold Emblem'}
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                When installed, your phone or desktop app drawer will display this exact emblem.
              </p>
            </div>
          </div>

          {/* Success / Status notification */}
          {uploadSuccessMsg && (
            <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-2 rounded-xl text-[11px] flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{uploadSuccessMsg}</span>
            </div>
          )}

          {/* Icon upload controls */}
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
            <input 
              ref={modalFileInputRef}
              type="file" 
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleCustomIconUpload}
              className="hidden" 
              id="modal-custom-app-icon-input"
            />
            
            <button
              type="button"
              onClick={() => modalFileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-white/20 transition cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5 text-amber-300" />
              <span>{isUploading ? 'Processing & Syncing...' : 'Upload Custom Icon'}</span>
            </button>

            {currentLogo && (
              <button
                type="button"
                onClick={handleResetToDefaultIcon}
                disabled={isUploading}
                className="py-2 px-3 bg-red-500/15 hover:bg-red-500/25 text-red-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-red-500/30 transition cursor-pointer"
                title="Reset back to official CBE Gold Emblem"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Installation Instructions if in iframe */}
        {isInIframe && (
          <div className="bg-purple-500/10 border border-purple-400/30 rounded-2xl p-3 flex items-start justify-between gap-2.5 text-purple-200">
            <div className="text-xs space-y-0.5 min-w-0">
              <p className="font-bold text-amber-300 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                <span>Notice: Direct Browser Tab Recommended</span>
              </p>
              <p className="text-[10.5px] text-slate-300 leading-relaxed">
                To install as a native standalone app (WebAPK), open directly in Chrome/Safari:
              </p>
            </div>
            <button
              onClick={openInBrowserTab}
              className="px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-[11px] flex items-center gap-1 shrink-0 shadow cursor-pointer transition"
            >
              <span>Open Tab</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1 relative z-10">
          <button
            id="btn-confirm-install-with-icon"
            onClick={handleDirectInstallTrigger}
            disabled={installing || isUploading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 via-[#deb356] to-amber-500 hover:from-amber-300 hover:to-[#e5bf67] active:scale-[0.99] text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>{installing ? 'Launching Installer...' : 'Install App With This Icon'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowManualGuide(true)}
            className="w-full py-2 text-center text-[11px] text-amber-300/80 hover:text-amber-200 flex items-center justify-center gap-1 cursor-pointer transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>View step-by-step device instructions</span>
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
              <p className="text-[11px] text-gray-500">Install CBE Mobile Banking to your home screen</p>
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

        {/* Preview Card with App Icon & Direct Custom Upload */}
        <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 rounded-2xl p-4 text-white border border-purple-900/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start gap-3.5 relative z-10">
            {/* App Icon preview */}
            <div className="w-14 h-14 rounded-2xl bg-black/60 border border-amber-400/40 p-2 flex items-center justify-center flex-shrink-0 shadow-lg group relative">
              <CbeLogo className="w-full h-full object-contain" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center" title="App Icon Ready">
                <CheckCircle2 className="w-2.5 h-2.5 text-white stroke-[3]" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-base font-black text-white tracking-tight">CBE Mobile Banking</h4>
                <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border ${
                  currentLogo 
                    ? 'bg-purple-500/20 text-purple-300 border-purple-400/30' 
                    : 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                }`}>
                  {currentLogo ? 'Custom Icon Active' : 'Official Emblem'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {currentLogo 
                  ? 'Custom logo is active and will be used as the app home screen icon upon installation.' 
                  : "Commercial Bank of Ethiopia Mobile Banking. Installed app will use this verified CBE emblem on your device's home screen."}
              </p>
            </div>
          </div>

          {/* Quick Custom Icon Upload directly on the card */}
          <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs relative z-10">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
              <ImageIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>App Icon:</span>
              <span className="font-semibold text-white truncate max-w-[130px]">
                {currentLogo ? 'Custom Logo' : 'Official CBE Emblem'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input 
                ref={inlineFileInputRef}
                type="file" 
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleCustomIconUpload}
                className="hidden" 
                id="inline-settings-icon-input"
              />
              <button
                type="button"
                onClick={() => inlineFileInputRef.current?.click()}
                disabled={isUploading}
                className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 active:scale-95 text-amber-300 font-bold rounded-xl text-[11px] flex items-center gap-1 border border-white/20 transition cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3 h-3" />
                <span>{isUploading ? 'Syncing...' : 'Upload Custom Icon'}</span>
              </button>

              {currentLogo && (
                <button
                  type="button"
                  onClick={handleResetToDefaultIcon}
                  disabled={isUploading}
                  className="px-2 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold rounded-xl text-[11px] flex items-center gap-1 border border-red-400/30 transition cursor-pointer"
                  title="Reset to official CBE Gold Emblem"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {uploadSuccessMsg && (
            <div className="mt-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-xl text-[11px] flex items-center gap-1.5 animate-fade-in">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{uploadSuccessMsg}</span>
            </div>
          )}

          <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
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
                <p className="text-[11px] text-emerald-700">Running as CBE Mobile Banking in standalone application mode.</p>
              </div>
            </div>
            <button
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
              onClick={handleOpenInstallModal}
              disabled={installing}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-amber-400 via-[#deb356] to-amber-500 hover:from-amber-300 hover:to-[#e5bf67] active:scale-[0.99] text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Install CBE Mobile Banking</span>
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

        {/* Modal: Customize Icon & Install */}
        {showInstallModal && renderInstallModalContent()}

        {/* Guided Step-by-Step Modal */}
        {showManualGuide && (
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
                  onClick={() => setShowManualGuide(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-purple-950/80 p-1.5 flex items-center justify-center flex-shrink-0">
                  <CbeLogo className="w-full h-full object-contain" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">CBE Mobile Banking</p>
                  <p className="text-[10.5px] text-amber-300/90">
                    {currentLogo ? 'Installs with your uploaded custom icon' : 'Installs with verified CBE emblem'}
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
                    <span>Scroll down and select <strong>"Add to Home Screen"</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>Tap <strong>"Add"</strong>. It launches as a dedicated fullscreen application with this custom icon.</span>
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
                      <span>Select <strong>"Install app"</strong> or <strong>"Install CBE Mobile Banking"</strong>.</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Avoid selecting "Create shortcut" to ensure a genuine WebAPK application is installed in your app drawer.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>Tap <strong>"Install"</strong>. Android will mint and install CBE Mobile Banking with your selected icon.</span>
                  </li>
                </ol>
              )}

              <div className="flex gap-2">
                {isInIframe && (
                  <button
                    onClick={openInBrowserTab}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-amber-400/30"
                  >
                    <span>Open in Direct Tab</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setShowManualGuide(false)}
                  className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        )}
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
  if (dismissed && !showManualGuide && !showInstallModal) {
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
                    {currentLogo ? 'Custom' : 'Official'}
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-300 truncate">Commercial Bank of Ethiopia</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="btn-pwa-banner-install"
                onClick={handleOpenInstallModal}
                disabled={installing}
                className="px-3 py-1.5 bg-gradient-to-r from-[#dfa04c] to-[#deb356] hover:from-[#c9903f] hover:to-[#c99f47] active:scale-95 text-slate-950 font-black rounded-lg text-xs shadow-md flex items-center gap-1.5 transition-all touch-manipulation cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>

              <button 
                id="btn-pwa-banner-dismiss"
                onClick={handleDismiss} 
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-red-500/25 active:bg-red-500/40 text-slate-300 hover:text-white border border-white/15 transition-all cursor-pointer active:scale-95 shrink-0"
                aria-label="Cancel and remove install banner"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {showInstallModal && renderInstallModalContent()}
      </>
    );
  }

  // 3. Card Mode
  if (mode === 'card') {
    return (
      <div 
        id="pwa-install-card"
        className={`bg-gradient-to-b from-slate-900 to-[#1e042b] border border-[#deb356]/30 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden ${className}`}
      >
        <button
          id="btn-pwa-card-dismiss"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors z-10"
          aria-label="Dismiss install card"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5 mb-4 pr-6">
          <div className="w-12 h-12 rounded-2xl bg-black/40 border border-[#deb356]/40 p-1 flex items-center justify-center flex-shrink-0 shadow-inner">
            <CbeLogo className="w-9 h-9 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#deb356]/20 text-[#deb356] border border-[#deb356]/30">
                {currentLogo ? 'Custom Icon' : 'Official CBE App'}
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Maximize2 className="w-2.5 h-2.5" /> Fullscreen PWA
              </span>
            </div>
            <h3 className="text-base font-extrabold text-white mt-1">CBE Mobile Banking</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Install the official Commercial Bank of Ethiopia (CBE) mobile banking application for fast, secure, and clean banking.
            </p>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <button
            id="btn-pwa-install-action"
            onClick={handleOpenInstallModal}
            disabled={installing}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#dfa04c] to-[#deb356] hover:from-[#c9903f] hover:to-[#c99f47] active:scale-[0.99] text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-[#deb356]/20 flex items-center justify-center gap-2 transition-all touch-manipulation disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>INSTALL CBE MOBILE BANKING</span>
          </button>
        </div>

        {showInstallModal && renderInstallModalContent()}
      </div>
    );
  }

  // 4. Modal Dialog Mode
  if (mode === 'modal' && isOpen) {
    return renderInstallModalContent();
  }

  return null;
};

export default AppInstallPrompt;

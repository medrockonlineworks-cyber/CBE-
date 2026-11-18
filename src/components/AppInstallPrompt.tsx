import React, { useState, useEffect, useRef } from 'react';
import { usePwaInstall } from '../lib/usePwaInstall';
import { LocalDb } from '../lib/mockData';
import type { UserProfile } from '../types';
import { PushNotificationService } from '../services/pushNotificationService';
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
  Info,
  PackageCheck,
  Upload,
  Link2,
  Loader2,
  AlertCircle
} from 'lucide-react';

export interface AppInstallPromptProps {
  mode?: 'modal' | 'card' | 'button' | 'banner' | 'settings';
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
  currentUser?: UserProfile | null;
}

const SNOOZE_STORAGE_KEY = 'tana_pwa_banner_snooze_until';
const CUSTOM_APK_URL_KEY = 'cbe_custom_apk_url';
const FIVE_MINUTES_MS = 5 * 60 * 1000;

interface ApkStatusInfo {
  available: boolean;
  downloadUrl: string | null;
  fileName: string;
  sizeBytes: number;
  versionName: string;
  source: 'server' | 'static' | 'external' | 'none';
}

export const AppInstallPrompt: React.FC<AppInstallPromptProps> = ({
  mode = 'settings',
  isOpen = true,
  onClose,
  className = '',
  currentUser = null,
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
  const [showApkGuide, setShowApkGuide] = useState(false);
  const [showAdminApkPanel, setShowAdminApkPanel] = useState(false);
  const [apkInfo, setApkInfo] = useState<ApkStatusInfo>({
    available: false,
    downloadUrl: null,
    fileName: 'CBE-Mobil.apk',
    sizeBytes: 0,
    versionName: '1.0',
    source: 'none',
  });
  const [apkUrlInput, setApkUrlInput] = useState<string>(() => {
    try {
      return localStorage.getItem(CUSTOM_APK_URL_KEY) || '';
    } catch {
      return '';
    }
  });
  const [apkBusy, setApkBusy] = useState(false);
  const [apkFeedback, setApkFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const apkFileInputRef = useRef<HTMLInputElement | null>(null);
  const [customLogo, setCustomLogo] = useState<string | null>(() => LocalDb.getCustomBankLogo());

  const isAdmin = Boolean(
    currentUser && (currentUser.role === 'admin' || currentUser.email === 'leykunjemaneh3@gmail.com')
  );

  const loadApkStatus = async () => {
    // 1. Check backend Express APK status API
    try {
      const res = await fetch('/api/app/apk-status', { cache: 'no-store' });
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (res.ok && ct.includes('application/json')) {
        const data = await res.json();
        if (data?.ok) {
          if (data.externalUrl && !apkUrlInput) {
            setApkUrlInput(data.externalUrl);
          }
          if (data.available && data.downloadUrl) {
            setApkInfo({
              available: true,
              downloadUrl: data.downloadUrl,
              fileName: data.fileName || 'CBE-Mobil.apk',
              sizeBytes: Number(data.sizeBytes || 0),
              versionName: data.versionName || '1.0',
              source: data.source || 'server',
            });
            return;
          }
        }
      }
    } catch {
      // Fallback to static check below
    }

    // 2. Check static /downloads/apk-metadata.json (works on static previews)
    try {
      const metaRes = await fetch('/downloads/apk-metadata.json', { cache: 'no-store' });
      const ct = (metaRes.headers.get('content-type') || '').toLowerCase();
      if (metaRes.ok && ct.includes('application/json')) {
        const meta = await metaRes.json();
        if (meta?.downloadUrl) {
          setApkInfo({
            available: true,
            downloadUrl: meta.downloadUrl,
            fileName: meta.fileName || 'CBE-Mobil.apk',
            sizeBytes: Number(meta.sizeBytes || 0),
            versionName: meta.versionName || '1.0',
            source: 'static',
          });
          return;
        }
      }
    } catch {
      // Ignore if not published statically yet
    }

    // 3. Check Admin-saved external APK URL in localStorage
    try {
      const savedUrl = localStorage.getItem(CUSTOM_APK_URL_KEY);
      if (savedUrl && /^https?:\/\//i.test(savedUrl)) {
        setApkInfo({
          available: true,
          downloadUrl: savedUrl,
          fileName: 'CBE-Mobil.apk',
          sizeBytes: 0,
          versionName: '1.0',
          source: 'external',
        });
        return;
      }
    } catch {}

    setApkInfo({
      available: false,
      downloadUrl: null,
      fileName: 'CBE-Mobil.apk',
      sizeBytes: 0,
      versionName: '1.0',
      source: 'none',
    });
  };

  useEffect(() => {
    if (mode === 'settings') {
      void loadApkStatus();
    }
  }, [mode]);

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

  const handleUploadApkFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.apk')) {
      setApkFeedback({ type: 'err', msg: 'Please select a valid compiled Android .apk file.' });
      return;
    }

    setApkBusy(true);
    setApkFeedback(null);
    try {
      const token = await PushNotificationService.ensureBackendSession(currentUser);
      if (!token) {
        throw new Error('Express server is not active on this URL. Run `npm run build:apk` or host with `npm start`, or save a hosted APK link below.');
      }

      const buf = await file.arrayBuffer();
      const res = await fetch('/api/app/upload-apk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.android.package-archive',
          'X-Apk-Version': '1.0',
          Authorization: `Bearer ${token}`,
        },
        body: buf,
      });

      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (!ct.includes('application/json')) {
        throw new Error('APK upload requires the Node.js server (server.ts). You can paste a direct hosted .apk URL below instead.');
      }

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Failed to upload APK package.');
      }

      await loadApkStatus();
      setApkFeedback({ type: 'ok', msg: `${file.name} published! Users can now download and install it directly.` });
    } catch (err) {
      setApkFeedback({
        type: 'err',
        msg: err instanceof Error ? err.message : 'Unable to upload APK file.',
      });
    } finally {
      setApkBusy(false);
    }
  };

  const handleSaveExternalApkUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = apkUrlInput.trim();
    setApkBusy(true);
    setApkFeedback(null);

    try {
      if (!cleaned) {
        localStorage.removeItem(CUSTOM_APK_URL_KEY);
      } else {
        const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
        const parsed = new URL(withProtocol);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          throw new Error('URL must start with https:// or http://');
        }
        setApkUrlInput(parsed.href);
        localStorage.setItem(CUSTOM_APK_URL_KEY, parsed.href);
      }

      // Sync to backend if available
      const token = await PushNotificationService.ensureBackendSession(currentUser);
      if (token) {
        await fetch('/api/app/apk-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ externalUrl: cleaned }),
        }).catch(() => null);
      }

      await loadApkStatus();
      setApkFeedback({
        type: 'ok',
        msg: cleaned ? 'Direct Android APK link saved!' : 'External APK link cleared.',
      });
    } catch (err) {
      setApkFeedback({
        type: 'err',
        msg: err instanceof Error ? err.message : 'Invalid APK download URL.',
      });
    } finally {
      setApkBusy(false);
    }
  };

  const renderApkInstallGuideModal = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-emerald-400/40 rounded-3xl max-w-sm w-full p-5 text-white space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-400" />
            <h4 className="font-bold text-sm text-white">Install {apkInfo.fileName}</h4>
          </div>
          <button
            type="button"
            onClick={() => setShowApkGuide(false)}
            className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ol className="space-y-3 text-xs text-slate-200">
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
            <span>When the download completes, tap <strong>Open</strong> on the Chrome bar or open <strong>{apkInfo.fileName}</strong> from your Android Downloads / notification tray.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
            <span>If Android asks for permission, tap <strong>Settings</strong> -&gt; turn ON <strong>Allow from this source</strong> for Chrome, then press Back.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
            <span>Tap <strong>Install</strong> and open <strong>CBE Mobil</strong> from your home screen or app drawer.</span>
          </li>
        </ol>

        <button
          type="button"
          onClick={() => setShowApkGuide(false)}
          className="w-full py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );

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

        {/* Direct Android APK Installation Section */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg shrink-0">
                <PackageCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-extrabold text-gray-900">Android APK Installer</h4>
                <p className="text-[10.5px] text-gray-500">
                  {apkInfo.available
                    ? `${apkInfo.fileName} • v${apkInfo.versionName}${
                        apkInfo.sizeBytes > 0
                          ? ` (${(apkInfo.sizeBytes / (1024 * 1024)).toFixed(1)} MB)`
                          : ''
                      }`
                    : 'Download and install the standalone Android .apk package'}
                </p>
              </div>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAdminApkPanel((v) => !v)}
                className="text-[10.5px] font-bold text-[#70189F] hover:underline shrink-0 cursor-pointer"
              >
                {showAdminApkPanel ? 'Close Setup' : 'Manage APK'}
              </button>
            )}
          </div>

          {apkFeedback && (
            <div
              className={`text-[11px] py-2 px-3 rounded-xl flex items-start gap-2 border ${
                apkFeedback.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {apkFeedback.type === 'ok' ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              )}
              <span>{apkFeedback.msg}</span>
            </div>
          )}

          {apkInfo.available && apkInfo.downloadUrl ? (
            <div className="space-y-2">
              <a
                id="btn-download-android-apk"
                href={apkInfo.downloadUrl}
                download={apkInfo.fileName}
                target={apkInfo.source === 'external' ? '_blank' : undefined}
                rel={apkInfo.source === 'external' ? 'noopener noreferrer' : undefined}
                onClick={() => setTimeout(() => setShowApkGuide(true), 400)}
                className="w-full py-3 px-4 bg-[#70189F] hover:bg-[#5e1385] active:scale-[0.99] text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download &amp; Install {apkInfo.fileName}</span>
              </a>
              <button
                type="button"
                onClick={() => setShowApkGuide(true)}
                className="text-[10.5px] font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-1 px-1 cursor-pointer"
              >
                <HelpCircle className="w-3 h-3" />
                <span>How to allow &amp; install APK on Android</span>
              </button>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-3 text-[11px] text-gray-600 leading-relaxed space-y-1">
              <p className="font-bold text-gray-800">APK file not published yet</p>
              <p>
                Use <strong>Install CBE Mobil</strong> above for instant WebAPK installation, or{' '}
                {isAdmin
                  ? 'tap Manage APK to upload a compiled .apk / link an APK URL (or run npm run build:apk).'
                  : 'check back once an administrator publishes the Android .apk package.'}
              </p>
            </div>
          )}

          {isAdmin && showAdminApkPanel && (
            <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-3.5 space-y-3">
              <div className="space-y-1.5">
                <p className="text-[11px] font-extrabold text-purple-950">Option 1: Upload Compiled .apk</p>
                <input
                  ref={apkFileInputRef}
                  type="file"
                  accept=".apk,application/vnd.android.package-archive"
                  onChange={handleUploadApkFile}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={apkBusy}
                  onClick={() => apkFileInputRef.current?.click()}
                  className="w-full py-2 px-3 bg-white hover:bg-purple-50 border border-purple-300 text-[#70189F] font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {apkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>Select &amp; Upload CBE-Mobil.apk</span>
                </button>
              </div>

              <form onSubmit={handleSaveExternalApkUrl} className="space-y-1.5 pt-2 border-t border-purple-200/70">
                <p className="text-[11px] font-extrabold text-purple-950">Option 2: Direct Hosted .apk File URL</p>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Link2 className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      inputMode="url"
                      value={apkUrlInput}
                      onChange={(e) => setApkUrlInput(e.target.value)}
                      placeholder="https://example.com/CBE-Mobil.apk"
                      className="w-full bg-white border border-purple-200 rounded-xl py-2 pl-8 pr-2 text-[11px] text-gray-800 focus:outline-none focus:border-[#70189F]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={apkBusy}
                    className="px-3 py-2 bg-[#70189F] text-white font-bold rounded-xl text-[11px] shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    Save
                  </button>
                  {apkUrlInput && (
                    <button
                      type="button"
                      disabled={apkBusy}
                      onClick={() => {
                        setApkUrlInput('');
                        try {
                          localStorage.removeItem(CUSTOM_APK_URL_KEY);
                        } catch {}
                        void loadApkStatus();
                        setApkFeedback({ type: 'ok', msg: 'External APK link cleared.' });
                      }}
                      className="px-2.5 py-2 bg-white border border-purple-200 text-purple-800 font-bold rounded-xl text-[11px] shrink-0 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-purple-900/75">
                  Paste only a working link where you already uploaded a real <code>.apk</code> file.
                </p>
              </form>

              <p className="text-[10px] text-purple-900/80 leading-relaxed">
                Or compile the included <code>./android</code> Capacitor project on a machine with JDK 17+ &amp; Android SDK using{' '}
                <code>npm run build:apk</code>.
              </p>
            </div>
          )}
        </div>

        {/* Guided Step-by-Step Modal */}
        {showManualGuide && renderManualGuideModal()}
        {showApkGuide && renderApkInstallGuideModal()}
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

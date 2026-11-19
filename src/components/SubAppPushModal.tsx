import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  AlertCircle,
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  Loader2,
  RefreshCw,
  RotateCcw,
  Send,
  Share,
  Smartphone,
  X,
} from 'lucide-react';
import {
  PlatformPushCapabilities,
  PushNotificationService,
  SUB_APP_NOTIFICATION_META,
  SubAppNotificationId,
  SubAppPushConfig,
} from '../services/pushNotificationService';
import { PhoneSettingsService } from '../services/phoneSettingsService';
import { SubAppInstallService } from '../services/subAppInstallService';
import { AppLogoService } from '../services/appLogoService';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface SubAppPushModalProps {
  isOpen: boolean;
  onClose: () => void;
  subAppId: SubAppNotificationId;
  isDarkMode?: boolean;
}

export const SubAppPushModal: React.FC<SubAppPushModalProps> = ({
  isOpen,
  onClose,
  subAppId,
  isDarkMode = true,
}) => {
  const meta = SUB_APP_NOTIFICATION_META[subAppId];
  const [caps, setCaps] = useState<PlatformPushCapabilities>(() =>
    PushNotificationService.getPlatformCapabilities()
  );
  const [config, setConfig] = useState<SubAppPushConfig>(
    () => PushNotificationService.getSubAppPreferences()[subAppId]
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [customSender, setCustomSender] = useState(meta.defaultSender);
  const [customBody, setCustomBody] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [connectionKey, setConnectionKey] = useState('');
  const [copiedConnKey, setCopiedConnKey] = useState(false);
  const [logoVersion, setLogoVersion] = useState(0);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const { isInstallable } = usePWAInstall();

  const isIPhoneMode = PhoneSettingsService.isIPhoneMode();
  const activeLogoSrc = AppLogoService.getDisplayIcon(subAppId, { isIPhone: isIPhoneMode });
  const hasCustomLogo = AppLogoService.hasCustomLogo(subAppId);
  void logoVersion;

  const subAppFullUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/${subAppId}/`
      : `/${subAppId}/`;

  const syncState = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      await PushNotificationService.syncNativePermissionStatus();
    }
    setCaps(PushNotificationService.getPlatformCapabilities());
    setConfig(PushNotificationService.getSubAppPreferences()[subAppId]);
  }, [subAppId]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setSuccessMsg('');
    setCustomSender(meta.defaultSender);
    void syncState();
  }, [isOpen, meta.defaultSender, syncState]);

  useEffect(() => {
    const onPrefsUpdated = () => {
      setConfig(PushNotificationService.getSubAppPreferences()[subAppId]);
    };
    const onLogosUpdated = () => {
      setLogoVersion((v) => v + 1);
    };
    window.addEventListener('cbe_subapp_push_prefs_updated', onPrefsUpdated);
    window.addEventListener('cbe_app_logos_updated', onLogosUpdated);
    return () => {
      window.removeEventListener('cbe_subapp_push_prefs_updated', onPrefsUpdated);
      window.removeEventListener('cbe_app_logos_updated', onLogosUpdated);
    };
  }, [subAppId]);

  if (!isOpen) return null;

  const isGranted = caps.permission === 'granted';
  const isActive = isGranted && config.enabled;

  const handleEnable = async () => {
    if (busy) return;
    setBusy('enable');
    setErrorMsg('');
    setSuccessMsg('');
    const res = await PushNotificationService.enableSubAppNotifications(subAppId);
    await syncState();
    setBusy(null);
    if (!res.ok) {
      setErrorMsg(res.message || 'Unable to enable notifications.');
      return;
    }
    if (res.connectionKey) {
      setConnectionKey(res.connectionKey);
    }
    setSuccessMsg(res.message || `${meta.name} notifications enabled!`);
  };

  const handleCopyConnectionKey = async (forceRenew = false) => {
    if (busy) return;
    setBusy(forceRenew ? 'renewkey' : 'connkey');
    setErrorMsg('');
    setSuccessMsg('');
    const res = await PushNotificationService.getOrCreateSubAppConnectionKey(subAppId, {
      forceRenew,
    });
    await syncState();
    setBusy(null);
    if (!res.ok || !res.connectionKey) {
      setErrorMsg(res.error || 'Could not create Connection Key.');
      return;
    }
    setConnectionKey(res.connectionKey);
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(res.connectionKey);
      } else {
        const ta = document.createElement('textarea');
        ta.value = res.connectionKey;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedConnKey(true);
      setSuccessMsg(
        forceRenew
          ? `Push channel refreshed under your same permanent key & copied! If already connected in CBE Mobile, it stays linked automatically.`
          : `Permanent Connection Key copied! Paste it once in CBE Mobile → Profile → Push Notifications → Connect. It never expires.`
      );
      setTimeout(() => setCopiedConnKey(false), 3000);
    } catch {
      setSuccessMsg('Permanent Connection Key generated below — copy and paste it once in CBE Mobile Settings.');
    }
  };

  const handleToggleEnabled = () => {
    const next = !config.enabled;
    PushNotificationService.updateSubAppPreference(subAppId, { enabled: next });
    setConfig((prev) => ({ ...prev, enabled: next }));
    setErrorMsg('');
    setSuccessMsg(
      next
        ? `${meta.name} push alerts turned ON.`
        : `${meta.name} push alerts paused.`
    );
  };

  const handleTogglePreview = () => {
    const next = !config.showPreview;
    PushNotificationService.updateSubAppPreference(subAppId, { showPreview: next });
    setConfig((prev) => ({ ...prev, showPreview: next }));
  };

  const handleTest = async (useCustom = false) => {
    if (busy) return;
    setBusy(useCustom ? 'custom' : 'test');
    setErrorMsg('');
    setSuccessMsg('');
    const res = await PushNotificationService.sendSubAppTestNotification(
      subAppId,
      useCustom
        ? {
            title: customSender.trim() || meta.defaultSender,
            body: customBody.trim() || undefined,
          }
        : undefined
    );
    await syncState();
    setBusy(null);
    if (res.connectionKey) {
      setConnectionKey(res.connectionKey);
    }
    if (!res.ok) {
      setErrorMsg(res.error || 'Could not send test notification.');
      return;
    }
    setSuccessMsg(res.message || 'Test notification sent!');
  };

  const handleInstallToHomeScreen = async () => {
    if (busy) return;
    setBusy('install');
    setErrorMsg('');
    setSuccessMsg('');
    const res = await SubAppInstallService.installSubAppToHomeScreen(subAppId);
    setBusy(null);
    if (!res.ok) {
      setErrorMsg(res.message);
      return;
    }
    setSuccessMsg(res.message);
  };

  const handleUploadCustomLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || busy) return;
    setBusy('logo');
    setErrorMsg('');
    setSuccessMsg('');
    const res = await AppLogoService.uploadCustomLogo(subAppId, file);
    setBusy(null);
    if (!res.ok) {
      setErrorMsg(res.error || 'Could not upload custom logo.');
      return;
    }
    setLogoVersion((v) => v + 1);
    setSuccessMsg(
      `Custom ${meta.shortName} logo saved! Installing ${meta.shortName} now will use your uploaded logo.`
    );
  };

  const handleResetCustomLogo = async () => {
    if (busy) return;
    setBusy('resetlogo');
    setErrorMsg('');
    setSuccessMsg('');
    await AppLogoService.resetCustomLogo(subAppId);
    setBusy(null);
    setLogoVersion((v) => v + 1);
    setSuccessMsg(`Restored default ${meta.shortName} icon.`);
  };

  const handleCopySubAppUrl = async () => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(subAppFullUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = subAppFullUrl;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedUrl(true);
      setErrorMsg('');
      setSuccessMsg(`Copied! Open Safari, paste the link, then tap Share → Add to Home Screen.`);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      setErrorMsg(`Copy failed. Manually open ${subAppFullUrl} in Safari.`);
    }
  };

  const badge = (() => {
    if (caps.requiresIosHomeScreenInstall) {
      return { label: 'Home Screen Required', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    }
    if (isActive) {
      return { label: 'Active', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    }
    if (caps.permission === 'denied') {
      return { label: 'Blocked', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
    }
    if (isGranted && !config.enabled) {
      return { label: 'Paused', cls: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30' };
    }
    return { label: 'Not Enabled', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
  })();

  const showCustomComposer = subAppId === 'sms' || subAppId === 'truecaller';

  return (
    <div
      className="fixed inset-0 z-[140] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border max-h-[90vh] overflow-y-auto space-y-4 ${
          isDarkMode
            ? 'bg-[#1a1c20] border-neutral-800 text-white'
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-current/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={activeLogoSrc}
              alt={meta.name}
              className="w-10 h-10 rounded-xl shrink-0 shadow-sm object-cover"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold truncate">{meta.name} Push</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
              <p className={`text-[11px] truncate ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Lock Screen &amp; Notification Center alerts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-full transition cursor-pointer ${
              isDarkMode ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-500'
            }`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback banners */}
        {errorMsg && (
          <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs py-2.5 px-3 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span className={isDarkMode ? 'text-rose-200' : 'text-rose-800'}>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 text-xs py-2.5 px-3 rounded-xl flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span className={isDarkMode ? 'text-emerald-200' : 'text-emerald-800'}>{successMsg}</span>
          </div>
        )}

        {/* iPhone / iOS 16.4+ Setup Notice (only when not yet installed on Home Screen) */}
        {caps.isIOS && !Capacitor.isNativePlatform() && caps.requiresIosHomeScreenInstall && (
          <div className="rounded-2xl p-3.5 border space-y-1.5 text-[11px] leading-relaxed bg-amber-500/10 border-amber-500/30 text-amber-200">
            <div className="flex items-center gap-1.5 font-extrabold text-xs">
              <Share className="w-3.5 h-3.5 shrink-0" />
              <span>iPhone Setup: Install {meta.shortName} with Own Logo</span>
            </div>
            <p className={isDarkMode ? 'opacity-90' : 'text-amber-900'}>
              On iPhone (iOS 16.4+), tap Safari <strong>Share</strong> →{' '}
              <strong>Add to Home Screen</strong> right here to install{' '}
              <strong>{meta.shortName}</strong> with its own icon. Open it from your Home Screen,
              then tap <strong>Enable</strong> below.
            </p>
          </div>
        )}

        {/* Status Card */}
        <div
          className={`rounded-2xl p-3.5 border space-y-2 text-xs ${
            isDarkMode ? 'bg-neutral-900/80 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}>Device Permission</span>
            <span className="font-bold capitalize">{caps.permission}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}>Delivery Mode</span>
            <span className="font-bold">
              {Capacitor.isNativePlatform()
                ? 'Android Native'
                : caps.isIOS
                  ? 'iPhone Home Screen PWA'
                  : 'PWA / Browser'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className={isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}>Channel</span>
            <span className="font-semibold text-[11px]">{meta.channelName}</span>
          </div>
        </div>

        {/* Enable or Test/Disable Actions */}
        {!isGranted ? (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={handleEnable}
            style={{ backgroundColor: meta.color }}
            className="w-full py-3 px-4 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:opacity-95 active:scale-[0.99] transition cursor-pointer disabled:opacity-60"
          >
            {busy === 'enable' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            <span>Enable {meta.shortName} Push Notifications</span>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void handleTest(false)}
              style={{ backgroundColor: meta.color }}
              className="w-full py-2.5 px-3 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 active:scale-[0.99] transition cursor-pointer disabled:opacity-60"
            >
              {busy === 'test' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Test Push</span>
            </button>
            <button
              type="button"
              onClick={handleToggleEnabled}
              className={`w-full py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                config.enabled
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {config.enabled ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
              <span>{config.enabled ? 'Pause Alerts' : 'Resume Alerts'}</span>
            </button>
          </div>
        )}

        {/* Special Connection Key — Direct Link to CBE Mobile (Stateless APNs/FCM Bridge) */}
        {!Capacitor.isNativePlatform() && !caps.requiresIosHomeScreenInstall && (
          <div
            className={`rounded-2xl p-3.5 border space-y-2.5 ${
              isDarkMode ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <div className="flex items-start gap-2">
              <KeyRound className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-extrabold">
                    Permanent Connection Key
                  </p>
                  <span className="text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Never Expires
                  </span>
                </div>
                <p
                  className={`text-[10.5px] mt-0.5 leading-snug ${
                    isDarkMode ? 'text-neutral-300' : 'text-neutral-600'
                  }`}
                >
                  Copy this permanent key from your installed <strong>{meta.shortName}</strong> app
                  and paste it <strong>once</strong> inside{' '}
                  <strong>CBE Mobile → Profile → Push Notifications</strong>. Background push
                  channels auto-renew automatically so you never need to re-paste it.
                </p>
              </div>
            </div>

            {connectionKey && (
              <div
                className={`rounded-xl px-2.5 py-2 text-[10px] font-mono break-all select-all border ${
                  isDarkMode
                    ? 'bg-neutral-950/90 border-neutral-700 text-emerald-300'
                    : 'bg-white border-emerald-200 text-emerald-900'
                }`}
              >
                {connectionKey}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void handleCopyConnectionKey(false)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] transition cursor-pointer disabled:opacity-60"
              >
                {busy === 'connkey' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : copiedConnKey ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>
                  {copiedConnKey
                    ? 'Copied!'
                    : connectionKey
                      ? 'Copy Key'
                      : `Generate & Copy Key`}
                </span>
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void handleCopyConnectionKey(true)}
                title="Refresh the underlying browser push channel while keeping your exact same permanent Connection Key"
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer disabled:opacity-60 ${
                  isDarkMode
                    ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-emerald-300'
                    : 'bg-white hover:bg-emerald-50 border-emerald-300 text-emerald-800'
                }`}
              >
                {busy === 'renewkey' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>Refresh Channel</span>
              </button>
            </div>
          </div>
        )}

        {/* Lock Screen Message Preview Toggle */}
        <div
          className={`rounded-2xl p-3.5 border flex items-center justify-between gap-3 ${
            isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              {config.showPreview ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-amber-400" />}
              <span>Show Full SMS Text on Lock Screen</span>
            </div>
            <p className={`text-[10.5px] mt-0.5 ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
              {config.showPreview
                ? 'Displays sender & simulated SMS text in the notification banner'
                : 'Hides amounts & message text behind a generic private notice'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.showPreview}
            onClick={handleTogglePreview}
            className={`w-11 h-6 rounded-full p-0.5 transition shrink-0 cursor-pointer ${
              config.showPreview ? 'bg-emerald-500' : isDarkMode ? 'bg-neutral-700' : 'bg-neutral-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                config.showPreview ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Install Sub-App to Home Screen (Synced with CBE Mobile Banking) */}
        <div
          className={`rounded-2xl p-3.5 border space-y-3 ${
            isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Smartphone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Install {meta.shortName} on Home Screen</span>
              </div>
              <p className={`text-[10.5px] mt-0.5 leading-snug ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Upload a custom logo below, then install {meta.shortName} so it appears on your Home Screen with your uploaded icon.
              </p>
            </div>
          </div>

          {/* Custom App Logo Uploader */}
          <div
            className={`rounded-xl p-2.5 border flex items-center justify-between gap-2.5 ${
              isDarkMode ? 'bg-neutral-950/80 border-neutral-800' : 'bg-white border-neutral-200'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={activeLogoSrc}
                alt={`${meta.shortName} install icon`}
                className="w-10 h-10 rounded-xl object-cover border border-current/10 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[11px] font-bold truncate">
                  {hasCustomLogo ? 'Custom Install Logo Active' : 'Default App Logo'}
                </p>
                <p className={`text-[10px] truncate ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  {hasCustomLogo
                    ? 'Ready — installs with this icon'
                    : 'PNG, JPG, WebP or SVG'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => void handleUploadCustomLogo(e)}
                className="hidden"
              />
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => logoInputRef.current?.click()}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-50 ${
                  isDarkMode
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {busy === 'logo' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ImagePlus className="w-3 h-3" />
                )}
                <span>Upload</span>
              </button>
              {hasCustomLogo && (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void handleResetCustomLogo()}
                  title="Reset to default logo"
                  className={`p-1.5 rounded-lg border transition cursor-pointer disabled:opacity-50 ${
                    isDarkMode
                      ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
                      : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-700'
                  }`}
                >
                  {busy === 'resetlogo' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          </div>

          {caps.isIOS && !Capacitor.isNativePlatform() ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={subAppFullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ backgroundColor: meta.color }}
                  className="py-2.5 px-3 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 active:scale-[0.99] transition"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span>Open in Safari</span>
                </a>
                <button
                  type="button"
                  onClick={() => void handleCopySubAppUrl()}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    isDarkMode
                      ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-white'
                      : 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-900'
                  }`}
                >
                  {copiedUrl ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{copiedUrl ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
              <p className={`text-[10.5px] leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                1. Upload your logo above if desired.<br />
                2. In Safari, tap <strong>Share (↑) → Add to Home Screen</strong> to install{' '}
                <strong>{meta.shortName}</strong> with {hasCustomLogo ? 'your custom uploaded logo' : 'its own iPhone icon'}.
              </p>
            </div>
          ) : (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void handleInstallToHomeScreen()}
              style={isInstallable ? { backgroundColor: meta.color } : undefined}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60 border ${
                isInstallable
                  ? 'text-white border-transparent shadow-sm hover:opacity-95'
                  : isDarkMode
                    ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-white'
                    : 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-900'
              }`}
            >
              {busy === 'install' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Smartphone className="w-3.5 h-3.5" />
              )}
              <span>
                {Capacitor.isNativePlatform()
                  ? `Add ${meta.shortName} to Home Screen${hasCustomLogo ? ' (Custom Logo)' : ''}`
                  : isInstallable
                    ? `Install ${meta.shortName} App${hasCustomLogo ? ' (Custom Logo)' : ''}`
                    : `Install ${meta.shortName} App`}
              </span>
            </button>
          )}
        </div>

        {/* Custom Simulated SMS Push Sender (for SMS Simulator & Truecaller) */}
        {showCustomComposer && isGranted && (
          <div
            className={`rounded-2xl p-3.5 border space-y-2.5 ${
              isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
            }`}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-wider opacity-75">
              Send Custom Device Push Alert
            </p>
            <input
              type="text"
              value={customSender}
              onChange={(e) => setCustomSender(e.target.value)}
              placeholder="Sender (e.g. CBE, DashenBank, 127, BOA)"
              className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                isDarkMode
                  ? 'bg-neutral-950 border-neutral-700 text-white placeholder-neutral-500 focus:border-blue-500'
                  : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-blue-500'
              }`}
            />
            <textarea
              rows={2}
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              placeholder="Custom SMS text (leave empty to use authentic CBE credit sample)"
              className={`w-full px-3 py-2 rounded-xl text-xs border outline-none resize-none ${
                isDarkMode
                  ? 'bg-neutral-950 border-neutral-700 text-white placeholder-neutral-500 focus:border-blue-500'
                  : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-blue-500'
              }`}
            />
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void handleTest(true)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60 ${
                isDarkMode
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-white'
              }`}
            >
              {busy === 'custom' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Push Custom Alert Now</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubAppPushModal;

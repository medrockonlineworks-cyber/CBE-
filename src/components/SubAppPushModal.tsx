import React, { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  AlertCircle,
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Send,
  X,
} from 'lucide-react';
import {
  PlatformPushCapabilities,
  PushNotificationService,
  SUB_APP_NOTIFICATION_META,
  SubAppNotificationId,
  SubAppPushConfig,
} from '../services/pushNotificationService';

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
    window.addEventListener('cbe_subapp_push_prefs_updated', onPrefsUpdated);
    return () => window.removeEventListener('cbe_subapp_push_prefs_updated', onPrefsUpdated);
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
    setSuccessMsg(res.message || `${meta.name} notifications enabled!`);
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
    if (!res.ok) {
      setErrorMsg(res.error || 'Could not send test notification.');
      return;
    }
    setSuccessMsg(res.message || 'Test notification sent!');
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
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
              style={{ backgroundColor: meta.color }}
            >
              <BellRing className="w-5 h-5" />
            </div>
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
              {Capacitor.isNativePlatform() ? 'Android Native' : 'PWA / Browser'}
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

import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Bell, CheckCircle2, Loader2, Share, X } from 'lucide-react';
import {
  PlatformPushCapabilities,
  PushNotificationService,
  SUB_APP_NOTIFICATION_META,
  SubAppNotificationId,
} from '../services/pushNotificationService';
import { PhoneSettingsService } from '../services/phoneSettingsService';

interface SubAppPermissionBannerProps {
  subAppId: SubAppNotificationId;
}

const DISMISS_PREFIX = 'cbe_subapp_perm_banner_dismissed_';

export const SubAppPermissionBanner: React.FC<SubAppPermissionBannerProps> = ({ subAppId }) => {
  const meta = SUB_APP_NOTIFICATION_META[subAppId];
  const [caps, setCaps] = useState<PlatformPushCapabilities>(() =>
    PushNotificationService.getPlatformCapabilities()
  );
  const [checkedNative, setCheckedNative] = useState<boolean>(() => !Capacitor.isNativePlatform());
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(`${DISMISS_PREFIX}${subAppId}`) === '1';
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);
  const [justEnabled, setJustEnabled] = useState(false);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    let active = true;
    setErrorText('');
    setJustEnabled(false);
    try {
      setDismissed(sessionStorage.getItem(`${DISMISS_PREFIX}${subAppId}`) === '1');
    } catch {
      setDismissed(false);
    }

    const sync = async () => {
      if (Capacitor.isNativePlatform()) {
        await PushNotificationService.syncNativePermissionStatus();
      }
      if (!active) return;
      setCaps(PushNotificationService.getPlatformCapabilities());
      setCheckedNative(true);
    };
    void sync();

    return () => {
      active = false;
    };
  }, [subAppId]);

  if (!checkedNative || dismissed) return null;

  // Hide once permission is granted (unless we briefly show confirmation)
  if (caps.permission === 'granted' && !justEnabled) return null;

  // Hide if unsupported browser (unless iPhone Safari needing Home Screen install)
  if (caps.permission === 'unsupported' && !caps.requiresIosHomeScreenInstall) return null;

  // Hide if permanently denied so we don't nag
  if (caps.permission === 'denied') return null;

  const isIosSms = subAppId === 'sms' && PhoneSettingsService.isIPhoneMode();
  const logoSrc = isIosSms ? '/icons/notif-sms-ios.png' : meta.webIcon;
  const accentColor = isIosSms ? '#16C64F' : meta.color;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(`${DISMISS_PREFIX}${subAppId}`, '1');
    } catch {}
  };

  const handleAllow = async () => {
    if (busy) return;
    setBusy(true);
    setErrorText('');
    const res = await PushNotificationService.enableSubAppNotifications(subAppId);
    if (Capacitor.isNativePlatform()) {
      await PushNotificationService.syncNativePermissionStatus();
    }
    setCaps(PushNotificationService.getPlatformCapabilities());
    setBusy(false);

    if (!res.ok) {
      setErrorText(res.message || 'Permission was not granted.');
      return;
    }

    setJustEnabled(true);
    setTimeout(() => {
      setJustEnabled(false);
    }, 2400);
  };

  return (
    <div className="fixed bottom-[max(env(safe-area-inset-bottom,0px),16px)] left-1/2 -translate-x-1/2 z-[120] w-[calc(100%-24px)] max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-200 select-none">
      <div className="rounded-2xl bg-[#181a1f]/95 backdrop-blur-md border border-white/12 shadow-2xl p-3.5 text-white space-y-2.5">
        <div className="flex items-start gap-3">
          <img
            src={logoSrc}
            alt={meta.shortName}
            className="w-10 h-10 rounded-xl shrink-0 object-cover shadow-md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13px] font-bold leading-snug text-white">
                {justEnabled
                  ? `${meta.shortName} Notifications Enabled`
                  : caps.requiresIosHomeScreenInstall
                    ? `Install ${meta.shortName} on iPhone`
                    : `Allow ${meta.shortName} to send notifications?`}
              </p>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 -mr-1 -mt-0.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed mt-0.5">
              {justEnabled
                ? `New ${meta.shortName} alerts will appear on your Lock Screen with ${meta.shortName}'s logo.`
                : caps.requiresIosHomeScreenInstall
                  ? `Tap Safari Share → Add to Home Screen to install ${meta.shortName} with its own iPhone icon and Lock Screen alerts.`
                  : `Show new ${meta.shortName} alerts on your Lock Screen & Notification Center as ${meta.shortName}.`}
            </p>
          </div>
        </div>

        {errorText && (
          <p className="text-[11px] text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-xl px-2.5 py-1.5">
            {errorText}
          </p>
        )}

        {justEnabled ? (
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400 py-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Ready to receive {meta.shortName} alerts</span>
          </div>
        ) : caps.requiresIosHomeScreenInstall ? (
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-300">
              <Share className="w-3.5 h-3.5 shrink-0" />
              <span>Share → Add to Home Screen</span>
            </span>
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition cursor-pointer"
            >
              Got it
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleDismiss}
              className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-200 text-xs font-semibold transition cursor-pointer"
            >
              Not now
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleAllow()}
              style={{ backgroundColor: accentColor }}
              className="py-2 px-3 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 active:scale-[0.99] transition cursor-pointer disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
              <span>Allow</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubAppPermissionBanner;

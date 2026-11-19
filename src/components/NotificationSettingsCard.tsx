import React, { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Send,
  ShieldAlert,
  Share,
  Smartphone,
  Download,
  AlertCircle,
  ImagePlus,
  KeyRound,
  Link2,
  RotateCcw,
  Unlink,
} from 'lucide-react';
import type { UserProfile } from '../types';
import {
  NotificationPreferences,
  PlatformPushCapabilities,
  PushNotificationService,
  SUB_APP_NOTIFICATION_LIST,
  SUB_APP_NOTIFICATION_META,
  SubAppNotificationId,
  SubAppPushPreferencesMap,
  SubscribedDeviceInfo,
} from '../services/pushNotificationService';
import { SubAppInstallService } from '../services/subAppInstallService';
import { CrossAppSyncService, PairedSubAppLink } from '../services/crossAppSyncService';
import { AppLogoService, BRAND_APP_LIST, BrandAppId } from '../services/appLogoService';

interface NotificationSettingsCardProps {
  currentUser: UserProfile;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export const NotificationSettingsCard: React.FC<NotificationSettingsCardProps> = ({
  currentUser,
  onSuccess,
  onError,
}) => {
  const [caps, setCaps] = useState<PlatformPushCapabilities>(() =>
    PushNotificationService.getPlatformCapabilities()
  );
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<'webpush' | 'local' | null>(null);
  const [deviceCount, setDeviceCount] = useState(0);
  const [devices, setDevices] = useState<SubscribedDeviceInfo[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    userId: currentUser.id,
    enabled: true,
    transactionNotifications: true,
    depositNotifications: true,
    withdrawalNotifications: true,
    transferNotifications: true,
    securityNotifications: true,
    privacyMode: 'detailed',
  });
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');
  const [subAppPrefs, setSubAppPrefs] = useState<SubAppPushPreferencesMap>(() =>
    PushNotificationService.getSubAppPreferences()
  );
  const [testingSubApp, setTestingSubApp] = useState<SubAppNotificationId | null>(null);
  const [installingSubApp, setInstallingSubApp] = useState<BrandAppId | null>(null);
  const [uploadingLogoApp, setUploadingLogoApp] = useState<BrandAppId | null>(null);
  const [logoTick, setLogoTick] = useState(0);
  const [connectionKeyInput, setConnectionKeyInput] = useState('');
  const [pairedLinks, setPairedLinks] = useState<PairedSubAppLink[]>(() =>
    CrossAppSyncService.getPairedSubAppLinks()
  );
  void logoTick;

  const refreshStatus = useCallback(async () => {
    setCaps(PushNotificationService.getPlatformCapabilities());
    try {
      const status = await PushNotificationService.getStatus(currentUser);
      setCaps(PushNotificationService.getPlatformCapabilities());
      setSubscribed(status.subscribed);
      setDeliveryMode(status.mode || null);
      setDeviceCount(status.deviceCount);
      setDevices(status.devices || []);
      if (status.preferences) {
        setPreferences(status.preferences);
      }
    } catch {
      // Keep graceful defaults if server unreachable
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const syncSubAppPrefs = () => {
      setSubAppPrefs(PushNotificationService.getSubAppPreferences());
    };
    const syncPairedLinks = () => {
      setPairedLinks(CrossAppSyncService.getPairedSubAppLinks());
    };
    const syncLogos = () => {
      setLogoTick((t) => t + 1);
    };
    window.addEventListener('cbe_subapp_push_prefs_updated', syncSubAppPrefs);
    window.addEventListener('cbe_paired_links_updated', syncPairedLinks);
    window.addEventListener('cbe_app_logos_updated', syncLogos);
    return () => {
      window.removeEventListener('cbe_subapp_push_prefs_updated', syncSubAppPrefs);
      window.removeEventListener('cbe_paired_links_updated', syncPairedLinks);
      window.removeEventListener('cbe_app_logos_updated', syncLogos);
    };
  }, []);

  const showBannerSuccess = (msg: string) => {
    setLocalError('');
    setLocalSuccess(msg);
    onSuccess?.(msg);
    setTimeout(() => setLocalSuccess(''), 4500);
  };

  const showBannerError = (msg: string) => {
    setLocalSuccess('');
    setLocalError(msg);
    onError?.(msg);
  };

  const handleEnableNotifications = async () => {
    if (busyAction) return;
    setBusyAction('enable');
    setLocalError('');
    setLocalSuccess('');

    const result = await PushNotificationService.enableNotifications(currentUser);
    setCaps(PushNotificationService.getPlatformCapabilities());
    setBusyAction(null);

    if (!result.ok) {
      showBannerError(result.message || 'Unable to enable push notifications.');
      return;
    }

    setSubscribed(true);
    if (result.mode) setDeliveryMode(result.mode);
    if (typeof result.deviceCount === 'number') setDeviceCount(result.deviceCount);
    if (result.preferences) setPreferences(result.preferences);
    await refreshStatus();
    showBannerSuccess(result.message || 'Push notifications enabled!');
  };

  const handleDisableNotifications = async () => {
    if (busyAction) return;
    setBusyAction('disable');
    setLocalError('');
    setLocalSuccess('');

    const result = await PushNotificationService.disableNotifications(currentUser);
    setCaps(PushNotificationService.getPlatformCapabilities());
    setBusyAction(null);

    if (!result.ok) {
      showBannerError(result.message || 'Unable to disable notifications.');
      return;
    }

    setSubscribed(false);
    setDeviceCount(result.deviceCount ?? 0);
    await refreshStatus();
    showBannerSuccess(result.message || 'Push notifications disabled.');
  };

  const handleTogglePreference = async (
    key:
      | 'transactionNotifications'
      | 'depositNotifications'
      | 'withdrawalNotifications'
      | 'transferNotifications'
      | 'securityNotifications'
  ) => {
    if (busyAction) return;
    const nextValue = !preferences[key];
    const optimistic = { ...preferences, [key]: nextValue };
    setPreferences(optimistic);

    const res = await PushNotificationService.updatePreferences(currentUser, {
      [key]: nextValue,
    });

    if (!res.ok) {
      setPreferences(preferences);
      showBannerError(res.error || 'Failed to update notification preference.');
      return;
    }

    if (res.preferences) {
      setPreferences(res.preferences);
    }
  };

  const handleChangePrivacyMode = async (mode: 'detailed' | 'private') => {
    if (busyAction || preferences.privacyMode === mode) return;
    const prev = preferences.privacyMode;
    setPreferences({ ...preferences, privacyMode: mode });

    const res = await PushNotificationService.updatePreferences(currentUser, {
      privacyMode: mode,
    });

    if (!res.ok) {
      setPreferences({ ...preferences, privacyMode: prev });
      showBannerError(res.error || 'Failed to update Lock Screen privacy mode.');
      return;
    }

    if (res.preferences) {
      setPreferences(res.preferences);
    }
    showBannerSuccess(
      mode === 'private'
        ? 'Private Lock Screen mode enabled: amounts are hidden.'
        : 'Detailed Lock Screen mode enabled: amounts are visible.'
    );
  };

  const handleTestNotification = async () => {
    if (busyAction) return;
    setBusyAction('test');
    setLocalError('');
    setLocalSuccess('');

    const res = await PushNotificationService.sendTestNotification(
      currentUser,
      'money_received',
      2500
    );
    setBusyAction(null);

    if (!res.ok) {
      showBannerError(res.error || 'Test notification failed.');
      return;
    }

    showBannerSuccess(res.message || 'Test banking notification dispatched!');
  };

  const handleToggleSubApp = (subAppId: SubAppNotificationId) => {
    const current = subAppPrefs[subAppId];
    const nextEnabled = !current.enabled;
    const updated = PushNotificationService.updateSubAppPreference(subAppId, {
      enabled: nextEnabled,
    });
    setSubAppPrefs(updated);
  };

  const handleTestSubApp = async (subAppId: SubAppNotificationId, label: string) => {
    if (testingSubApp || busyAction) return;
    setTestingSubApp(subAppId);
    setLocalError('');
    setLocalSuccess('');
    const res = await PushNotificationService.sendSubAppTestNotification(subAppId);
    setCaps(PushNotificationService.getPlatformCapabilities());
    setTestingSubApp(null);
    if (!res.ok) {
      showBannerError(res.error || `Failed to send ${label} test notification.`);
      return;
    }
    showBannerSuccess(res.message || `${label} push alert dispatched!`);
  };

  const handleInstallSubApp = async (appId: BrandAppId) => {
    if (installingSubApp || testingSubApp || busyAction || uploadingLogoApp) return;
    setInstallingSubApp(appId);
    setLocalError('');
    setLocalSuccess('');
    const res = await SubAppInstallService.installAppWithCustomLogo(appId);
    setInstallingSubApp(null);
    if (!res.ok) {
      showBannerError(res.message);
      return;
    }
    showBannerSuccess(res.message);
  };

  const handleUploadAppLogo = async (
    appId: BrandAppId,
    label: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || uploadingLogoApp) return;
    setUploadingLogoApp(appId);
    setLocalError('');
    setLocalSuccess('');
    const res = await AppLogoService.uploadCustomLogo(appId, file);
    setUploadingLogoApp(null);
    if (!res.ok) {
      showBannerError(res.error || `Failed to upload logo for ${label}.`);
      return;
    }
    setLogoTick((t) => t + 1);
    showBannerSuccess(
      `Custom logo saved for ${label}! Tap Install next to ${label} to install it with your uploaded logo.`
    );
  };

  const handleResetAppLogo = async (appId: BrandAppId, label: string) => {
    if (uploadingLogoApp) return;
    setUploadingLogoApp(appId);
    setLocalError('');
    setLocalSuccess('');
    await AppLogoService.resetCustomLogo(appId);
    setUploadingLogoApp(null);
    setLogoTick((t) => t + 1);
    showBannerSuccess(`Restored default logo for ${label}.`);
  };

  const handleConnectSubAppKey = () => {
    setLocalError('');
    setLocalSuccess('');
    const parsed = CrossAppSyncService.parseConnectionKey(connectionKeyInput);
    if (!parsed.ok || !parsed.link) {
      showBannerError(parsed.error || 'Invalid Special Connection Key.');
      return;
    }
    const updated = CrossAppSyncService.savePairedSubAppLink(parsed.link);
    setPairedLinks(updated);
    setConnectionKeyInput('');
    const subMeta = SUB_APP_NOTIFICATION_META[parsed.link.subAppId as SubAppNotificationId];
    const name = subMeta ? subMeta.shortName : parsed.link.subAppId;
    showBannerSuccess(
      `${name} connected! Tap Test next to ${subMeta?.name || name} below to verify the notification pops up from ${name}.`
    );
  };

  const handleUnlinkSubApp = (subAppId: SubAppNotificationId, label: string) => {
    const updated = CrossAppSyncService.removePairedSubAppLink(subAppId);
    setPairedLinks(updated);
    showBannerSuccess(`Disconnected ${label}. You can paste a new Connection Key anytime.`);
  };

  const permissionBadge = (() => {
    if (caps.requiresIosHomeScreenInstall) {
      return { label: 'Add to Home Screen Required', cls: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    if (caps.permission === 'granted') {
      return { label: 'Permission Granted', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    }
    if (caps.permission === 'denied') {
      return { label: 'Permission Blocked', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (caps.permission === 'unsupported') {
      return { label: 'Unsupported Browser', cls: 'bg-gray-100 text-gray-600 border-gray-200' };
    }
    return { label: 'Not Enabled', cls: 'bg-purple-50 text-[#70189F] border-purple-200' };
  })();

  return (
    <div
      id="settings-push-notifications-card"
      className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-purple-50 text-[#70189F] rounded-xl shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
              Push Notifications
            </h3>
            <p className="text-[11px] text-gray-500">
              Lock Screen &amp; Notification Center alerts
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${permissionBadge.cls}`}
        >
          {permissionBadge.label}
        </span>
      </div>

      {/* Feedback */}
      {localError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-[11.5px] py-2.5 px-3 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{localError}</span>
        </div>
      )}
      {localSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11.5px] py-2.5 px-3 rounded-xl flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{localSuccess}</span>
        </div>
      )}

      {/* iOS Home Screen PWA requirement notice */}
      {caps.requiresIosHomeScreenInstall && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 space-y-1.5 text-amber-950">
          <div className="flex items-center gap-1.5 text-xs font-extrabold">
            <Share className="w-4 h-4 text-amber-700 shrink-0" />
            <span>iPhone Safari Installation Required (iOS 16.4+)</span>
          </div>
          <p className="text-[11px] text-amber-900/90 leading-relaxed">
            Apple delivers Lock Screen banking notifications only to installed Home Screen Web Apps.
            Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>, open <strong>CBE Mobil</strong> from your Home Screen, then tap <strong>Enable Notifications</strong>.
          </p>
        </div>
      )}

      {/* Device & Permission Status Summary */}
      <div className="bg-gray-50/90 border border-gray-100 rounded-2xl p-3.5 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 font-medium">Permission Status</span>
          <span className="font-bold capitalize text-gray-800">
            {caps.permission}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 font-medium">This Device Subscription</span>
          <span
            className={`font-bold flex items-center gap-1 ${
              subscribed ? 'text-emerald-700' : 'text-gray-500'
            }`}
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : subscribed ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {Capacitor.isNativePlatform()
                    ? 'Subscribed (Android Native)'
                    : deliveryMode === 'local'
                      ? 'Subscribed (Local PWA)'
                      : 'Subscribed (Web Push)'}
                </span>
              </>
            ) : (
              <span>Not Subscribed</span>
            )}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 font-medium">Registered Devices</span>
          <span className="font-mono font-bold text-[#70189F]">
            {deviceCount} {deviceCount === 1 ? 'Device' : 'Devices'}
          </span>
        </div>
        {devices.length > 0 && (
          <div className="pt-2 border-t border-gray-200/70 space-y-1">
            {devices.map((dev) => (
              <div key={dev.id} className="flex items-center justify-between text-[10.5px] text-gray-600">
                <span className="flex items-center gap-1.5 truncate">
                  <Smartphone className="w-3 h-3 text-[#70189F] shrink-0" />
                  <span className="truncate">{dev.deviceLabel}</span>
                </span>
                <span className="uppercase font-bold text-[9.5px] text-gray-400 shrink-0">
                  {dev.isCurrentDevice ? 'This Device' : dev.platform}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Primary Enable / Disable / Test Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {!subscribed ? (
          <button
            id="btn-enable-push-notifications"
            type="button"
            disabled={Boolean(busyAction)}
            onClick={handleEnableNotifications}
            className="sm:col-span-2 w-full py-3 px-4 rounded-2xl bg-[#70189F] hover:bg-[#5e1385] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-60"
          >
            {busyAction === 'enable' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
            <span>Enable Notifications</span>
          </button>
        ) : (
          <>
            <button
              id="btn-test-push-notification"
              type="button"
              disabled={Boolean(busyAction)}
              onClick={handleTestNotification}
              className="w-full py-2.5 px-3.5 rounded-2xl bg-[#70189F] hover:bg-[#5e1385] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-60"
            >
              {busyAction === 'test' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Test Notification</span>
            </button>

            <button
              id="btn-disable-push-notifications"
              type="button"
              disabled={Boolean(busyAction)}
              onClick={handleDisableNotifications}
              className="w-full py-2.5 px-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60"
            >
              {busyAction === 'disable' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BellOff className="w-3.5 h-3.5" />
              )}
              <span>Disable Notifications</span>
            </button>
          </>
        )}
      </div>

      {/* Lock Screen Privacy Mode */}
      <div className="border-t border-gray-100 pt-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-gray-800">Lock Screen Privacy Mode</p>
            <p className="text-[10.5px] text-gray-400">
              Control whether transaction amounts appear on your Lock Screen
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            id="btn-privacy-detailed"
            type="button"
            onClick={() => handleChangePrivacyMode('detailed')}
            className={`p-2.5 rounded-2xl border text-left transition cursor-pointer ${
              preferences.privacyMode === 'detailed'
                ? 'bg-purple-50 border-[#70189F] text-[#70189F] shadow-2xs'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Eye className="w-3.5 h-3.5" />
              <span>Detailed</span>
            </div>
            <p className="text-[10px] opacity-80 mt-1 leading-tight">
              Shows transaction type &amp; ETB amount
            </p>
          </button>

          <button
            id="btn-privacy-private"
            type="button"
            onClick={() => handleChangePrivacyMode('private')}
            className={`p-2.5 rounded-2xl border text-left transition cursor-pointer ${
              preferences.privacyMode === 'private'
                ? 'bg-purple-50 border-[#70189F] text-[#70189F] shadow-2xs'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <EyeOff className="w-3.5 h-3.5" />
              <span>Private</span>
            </div>
            <p className="text-[10px] opacity-80 mt-1 leading-tight">
              &quot;You have a new account transaction.&quot;
            </p>
          </button>
        </div>
      </div>

      {/* Category Toggles */}
      <div className="border-t border-gray-100 pt-3.5 space-y-3">
        <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
          Notification Categories
        </p>

        {[
          {
            key: 'transactionNotifications' as const,
            label: 'Transaction Notifications',
            desc: 'Master toggle for all money movement & failed alerts',
          },
          {
            key: 'transferNotifications' as const,
            label: 'Transfer Notifications',
            desc: 'Money received and outgoing bank transfers',
          },
          {
            key: 'depositNotifications' as const,
            label: 'Deposit Notifications',
            desc: 'Cash deposits credited to your account',
          },
          {
            key: 'withdrawalNotifications' as const,
            label: 'Withdrawal Notifications',
            desc: 'Cash & ATM withdrawal confirmations',
          },
          {
            key: 'securityNotifications' as const,
            label: 'Security & Account Alerts',
            desc: 'New device access, PIN/password & profile updates',
          },
        ].map((item) => {
          const checked = preferences[item.key];
          return (
            <div key={item.key} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  {item.key === 'securityNotifications' && (
                    <ShieldAlert className="w-3.5 h-3.5 text-[#70189F] shrink-0" />
                  )}
                  <span className="truncate">{item.label}</span>
                </p>
                <p className="text-[10px] text-gray-400 leading-snug">{item.desc}</p>
              </div>
              <button
                id={`toggle-notif-${item.key}`}
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => handleTogglePreference(item.key)}
                className={`w-11 h-6 rounded-full p-0.5 transition duration-200 cursor-pointer shrink-0 ${
                  checked ? 'bg-[#70189F]' : 'bg-gray-200'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    checked ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      {/* Sub-Application Push Alerts */}
      <div className="border-t border-gray-100 pt-3.5 space-y-3">
        <div>
          <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
            Sub-Application Push Alerts
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Connect installed standalone sub-apps (Messages, Truecaller, etc.) so transfers &amp; Test alerts appear with their own logo
          </p>
        </div>

        {/* Connect Standalone Sub-App via Special Connection Key (Works on Android APK, Android PWA & iPhone!) */}
        <div className="rounded-2xl p-3 bg-purple-50/70 border border-purple-100 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#70189F]">
              <KeyRound className="w-3.5 h-3.5 shrink-0" />
              <span>Connect Standalone Messages App (No CBE Logo)</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-600 leading-relaxed">
            To show SMS notifications strictly <strong>from the Messages app</strong> (without CBE&apos;s
            bank icon): install{' '}
            <a
              href="https://www.cbebank.online/sms/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#70189F] underline"
            >
              cbebank.online/sms/
            </a>{' '}
            in Chrome/Safari → open it → tap the <strong>Bell</strong> →{' '}
            <strong>Generate &amp; Copy Connection Key</strong> → paste below &amp; tap{' '}
            <strong>Connect</strong>.
          </p>
          <div className="flex items-center gap-1.5">
            <input
              id="input-subapp-connection-key"
              type="text"
              value={connectionKeyInput}
              onChange={(e) => setConnectionKeyInput(e.target.value)}
              placeholder="Paste CBELINK-SMS-... key here"
              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white border border-purple-200 text-xs font-mono text-gray-800 placeholder-gray-400 outline-none focus:border-[#70189F]"
            />
            <button
              id="btn-connect-subapp-key"
              type="button"
              disabled={!connectionKeyInput.trim()}
              onClick={handleConnectSubAppKey}
              className="px-3 py-2 rounded-xl bg-[#70189F] hover:bg-[#5c1285] text-white font-bold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer disabled:opacity-45 shrink-0"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Connect</span>
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {SUB_APP_NOTIFICATION_LIST.map((app) => {
            const appCfg = subAppPrefs[app.id];
            const isTesting = testingSubApp === app.id;
            const isLinked = pairedLinks.some((l) => l.subAppId === app.id);
            return (
              <div
                key={app.id}
                className="flex items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-gray-50/90 border border-gray-100"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={AppLogoService.getDisplayIcon(app.id)}
                    alt={app.name}
                    className="w-7 h-7 rounded-lg shrink-0 object-cover shadow-2xs"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-gray-800 truncate">{app.name}</p>
                      {isLinked && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-extrabold shrink-0">
                          Linked
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 leading-snug truncate">
                      {app.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isLinked && (
                    <button
                      type="button"
                      title={`Disconnect ${app.shortName}`}
                      onClick={() => handleUnlinkSubApp(app.id, app.shortName)}
                      className="p-1.5 rounded-xl bg-white hover:bg-rose-50 border border-gray-200 text-gray-400 hover:text-rose-600 transition cursor-pointer"
                    >
                      <Unlink className="w-3 h-3" />
                    </button>
                  )}

                  <button
                    id={`btn-install-subapp-${app.id}`}
                    type="button"
                    title={`Install ${app.shortName} icon to Home Screen`}
                    disabled={Boolean(installingSubApp) || Boolean(testingSubApp) || Boolean(busyAction)}
                    onClick={() => handleInstallSubApp(app.id)}
                    className="px-2 py-1 rounded-xl bg-white hover:bg-blue-50 border border-gray-200 text-blue-700 font-bold text-[10px] flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                  >
                    {installingSubApp === app.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3" />
                    )}
                    <span>Pin</span>
                  </button>

                  <button
                    id={`btn-test-subapp-${app.id}`}
                    type="button"
                    disabled={Boolean(testingSubApp) || Boolean(busyAction)}
                    onClick={() => handleTestSubApp(app.id, app.shortName)}
                    className="px-2 py-1 rounded-xl bg-white hover:bg-purple-50 border border-gray-200 text-[#70189F] font-bold text-[10px] flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                  >
                    {isTesting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    <span>Test</span>
                  </button>

                  <button
                    id={`toggle-subapp-${app.id}`}
                    type="button"
                    role="switch"
                    aria-checked={appCfg.enabled}
                    onClick={() => handleToggleSubApp(app.id)}
                    className={`w-10 h-5.5 rounded-full p-0.5 transition duration-200 cursor-pointer shrink-0 ${
                      appCfg.enabled ? 'bg-[#70189F]' : 'bg-gray-200'
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                        appCfg.enabled ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom App Logos & Install Icons (All Apps) */}
      <div className="border-t border-gray-100 pt-3.5 space-y-3">
        <div>
          <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
            Custom App Logos &amp; Install Icons
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Upload a custom logo for any app below — when you install it to your Home Screen, it will install with your uploaded logo
          </p>
        </div>

        <div className="space-y-2">
          {BRAND_APP_LIST.map((app) => {
            const hasCustom = AppLogoService.hasCustomLogo(app.id);
            const iconSrc = AppLogoService.getDisplayIcon(app.id);
            const isUploading = uploadingLogoApp === app.id;
            const isInstalling = installingSubApp === app.id;
            const inputId = `upload-app-logo-${app.id}`;

            return (
              <div
                key={app.id}
                className="flex items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-gray-50/90 border border-gray-100"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={iconSrc}
                    alt={app.name}
                    className="w-8 h-8 rounded-xl shrink-0 object-cover border border-gray-200 bg-white shadow-2xs"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-gray-800 truncate">{app.name}</p>
                      {hasCustom && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-purple-100 text-[#70189F] text-[9px] font-extrabold shrink-0">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 truncate">
                      {hasCustom ? 'Installs with your uploaded logo' : 'Using default app logo'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleUploadAppLogo(app.id, app.shortName, e)}
                    className="hidden"
                  />
                  <label
                    htmlFor={inputId}
                    className={`px-2 py-1 rounded-xl bg-white hover:bg-purple-50 border border-gray-200 text-[#70189F] font-bold text-[10px] flex items-center gap-1 transition cursor-pointer ${
                      isUploading ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    {isUploading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ImagePlus className="w-3 h-3" />
                    )}
                    <span>Logo</span>
                  </label>

                  {hasCustom && (
                    <button
                      type="button"
                      title={`Reset ${app.shortName} to default logo`}
                      disabled={Boolean(uploadingLogoApp)}
                      onClick={() => void handleResetAppLogo(app.id, app.shortName)}
                      className="p-1.5 rounded-xl bg-white hover:bg-rose-50 border border-gray-200 text-gray-500 hover:text-rose-600 transition cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}

                  <button
                    type="button"
                    title={`Install ${app.shortName} with ${hasCustom ? 'custom' : 'default'} logo`}
                    disabled={Boolean(installingSubApp) || Boolean(uploadingLogoApp) || Boolean(busyAction)}
                    onClick={() => void handleInstallSubApp(app.id)}
                    className="px-2 py-1 rounded-xl bg-[#70189F] hover:bg-[#5c1285] text-white font-bold text-[10px] flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                  >
                    {isInstalling ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3" />
                    )}
                    <span>Install</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsCard;

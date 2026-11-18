import React, { useCallback, useEffect, useState } from 'react';
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
  AlertCircle,
} from 'lucide-react';
import type { UserProfile } from '../types';
import {
  NotificationPreferences,
  PlatformPushCapabilities,
  PushNotificationService,
  SubscribedDeviceInfo,
} from '../services/pushNotificationService';

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

  const refreshStatus = useCallback(async () => {
    setCaps(PushNotificationService.getPlatformCapabilities());
    try {
      const status = await PushNotificationService.getStatus(currentUser);
      setSubscribed(status.subscribed);
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
                <span>Subscribed</span>
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
    </div>
  );
};

export default NotificationSettingsCard;

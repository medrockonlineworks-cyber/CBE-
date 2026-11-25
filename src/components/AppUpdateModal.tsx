import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import {
  Download,
  AlertTriangle,
  CheckCircle2,
  Settings,
  X,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  AppUpdateService,
  AvailableUpdateInfo,
  DownloadProgressEvent,
  formatBytes,
} from '../services/appUpdateService';

interface AppUpdateModalProps {
  update: AvailableUpdateInfo | null;
  onClose: () => void;
  onDismissLater: (versionKey: string) => void;
}

type ModalStage =
  | 'available'
  | 'downloading'
  | 'verifying'
  | 'permission_required'
  | 'installing'
  | 'error';

export default function AppUpdateModal({
  update,
  onClose,
  onDismissLater,
}: AppUpdateModalProps) {
  const [stage, setStage] = useState<ModalStage>('available');
  const [progress, setProgress] = useState<DownloadProgressEvent>({
    stage: 'connecting',
    percent: 0,
    downloadedBytes: 0,
    totalBytes: 0,
  });
  const [verifiedFileName, setVerifiedFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const waitingForPermissionRef = useRef(false);

  // Reset state whenever a new update object is presented
  useEffect(() => {
    if (!update) return;
    setStage('available');
    setProgress({
      stage: 'connecting',
      percent: 0,
      downloadedBytes: 0,
      totalBytes: update.assetSizeBytes || 0,
    });
    setVerifiedFileName(null);
    setErrorMessage('');
    waitingForPermissionRef.current = false;
  }, [update?.versionKey]);

  const triggerSystemInstall = useCallback(async (fileName: string) => {
    try {
      setStage('installing');
      setErrorMessage('');
      const res = await AppUpdateService.launchSystemInstaller(fileName);
      if (res.permissionRequired) {
        waitingForPermissionRef.current = true;
        setStage('permission_required');
        return;
      }
      if (res.started) {
        waitingForPermissionRef.current = false;
        // System installer dialog is now open over the app
      }
    } catch (err: unknown) {
      setStage('error');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to open the Android package installer.'
      );
    }
  }, []);

  // Automatically resume installation when returning from Android "Install unknown apps" settings
  useEffect(() => {
    if (!update || !Capacitor.isNativePlatform()) return;
    let removeListener: (() => Promise<void>) | null = null;
    let mounted = true;

    CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
      if (!mounted || !isActive) return;
      if (waitingForPermissionRef.current && verifiedFileName) {
        const granted = await AppUpdateService.canInstallPackages();
        if (granted && mounted) {
          waitingForPermissionRef.current = false;
          await triggerSystemInstall(verifiedFileName);
        }
      }
    })
      .then((handle) => {
        if (mounted) {
          removeListener = () => handle.remove();
        } else {
          handle.remove().catch(() => {});
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
      if (removeListener) {
        void removeListener();
      }
    };
  }, [update, verifiedFileName, triggerSystemInstall]);

  // Handle Android hardware back button when update modal is visible
  useEffect(() => {
    if (!update) return;
    const onPhoneBack = (ev: Event) => {
      const detail = (ev as CustomEvent<{ setHandled?: () => void }>).detail;
      detail?.setHandled?.();
      ev.preventDefault();
      if (stage === 'verifying') return;
      if (stage === 'downloading') {
        void AppUpdateService.cancelDownload();
        setStage('available');
        return;
      }
      onDismissLater(update.versionKey);
      onClose();
    };
    window.addEventListener('cbe_phone_back', onPhoneBack);
    return () => {
      window.removeEventListener('cbe_phone_back', onPhoneBack);
    };
  }, [update, stage, onClose, onDismissLater]);

  if (!update) return null;

  const isDarkTheme = update.appId !== 'cbe';

  const accentConfig = (() => {
    switch (update.appId) {
      case 'sms':
        return {
          primaryBg: 'bg-[#1A73E8] hover:bg-[#1765CC]',
          badgeBg: 'bg-[#1A73E8]/15 text-[#669DF6]',
          barFill: 'bg-[#1A73E8]',
          iconWrap: 'bg-[#1A73E8]/15 text-[#669DF6]',
        };
      case 'truecaller':
        return {
          primaryBg: 'bg-[#0066FF] hover:bg-[#0055D6]',
          badgeBg: 'bg-[#0066FF]/15 text-[#4D94FF]',
          barFill: 'bg-[#0066FF]',
          iconWrap: 'bg-[#0066FF]/15 text-[#4D94FF]',
        };
      case 'phone':
        return {
          primaryBg: 'bg-[#26D367] hover:bg-[#20BA59] text-black',
          badgeBg: 'bg-[#26D367]/15 text-[#4ADE80]',
          barFill: 'bg-[#26D367]',
          iconWrap: 'bg-[#26D367]/15 text-[#4ADE80]',
        };
      case 'cbe':
      default:
        return {
          primaryBg: 'bg-[#70189F] hover:bg-[#5E1386]',
          badgeBg: 'bg-purple-50 text-[#70189F]',
          barFill: 'bg-[#70189F]',
          iconWrap: 'bg-purple-50 text-[#70189F]',
        };
    }
  })();

  const handleUpdateNow = async () => {
    if (verifiedFileName && (stage === 'permission_required' || stage === 'installing')) {
      await triggerSystemInstall(verifiedFileName);
      return;
    }

    setStage('downloading');
    setErrorMessage('');
    setProgress({
      stage: 'connecting',
      percent: 0,
      downloadedBytes: 0,
      totalBytes: update.assetSizeBytes || 0,
    });

    try {
      const result = await AppUpdateService.downloadAndVerifyUpdate(update, (ev) => {
        setProgress(ev);
        if (ev.stage === 'verifying') {
          setStage('verifying');
        }
      });

      if (!result.verified || !result.fileName) {
        throw new Error('APK integrity verification failed.');
      }

      setVerifiedFileName(result.fileName);
      await triggerSystemInstall(result.fileName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update download failed.';
      if (msg.includes('DOWNLOAD_CANCELLED')) {
        setStage('available');
        return;
      }
      setStage('error');
      setErrorMessage(msg.replace(/^[A-Z_]+:\s*/, ''));
    }
  };

  const handleCancelOrLater = async () => {
    if (stage === 'downloading') {
      await AppUpdateService.cancelDownload();
      setStage('available');
      return;
    }
    onDismissLater(update.versionKey);
    onClose();
  };

  const handleOpenSettings = async () => {
    try {
      waitingForPermissionRef.current = true;
      await AppUpdateService.openInstallPermissionSettings();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Open Android Settings → Apps → Special app access → Install unknown apps.'
      );
    }
  };

  const formattedPublishedDate = (() => {
    if (!update.publishedAt) return '';
    try {
      return new Date(update.publishedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  })();

  const totalBytesDisplay = progress.totalBytes > 0 ? progress.totalBytes : update.assetSizeBytes;
  const isBusy = stage === 'downloading' || stage === 'verifying';

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs font-sans select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-update-modal-title"
    >
      <div
        className={`w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border ${
          isDarkTheme
            ? 'bg-[#181A20] border-neutral-800 text-white'
            : 'bg-white border-gray-100 text-gray-900'
        }`}
      >
        {/* Top Accent Header */}
        <div
          className={`px-5 pt-5 pb-4 flex items-start justify-between gap-3 border-b ${
            isDarkTheme ? 'border-neutral-800/80' : 'border-gray-100'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${accentConfig.iconWrap}`}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p
                className={`text-[10px] font-extrabold uppercase tracking-wider ${
                  isDarkTheme ? 'text-neutral-400' : 'text-[#70189F]'
                }`}
              >
                Update Available
              </p>
              <h2
                id="app-update-modal-title"
                className="text-base font-extrabold truncate leading-tight mt-0.5"
              >
                {update.appName}
              </h2>
            </div>
          </div>

          {!isBusy && (
            <button
              type="button"
              onClick={handleCancelOrLater}
              aria-label="Close update notice"
              className={`p-1.5 rounded-full transition cursor-pointer ${
                isDarkTheme
                  ? 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Version Comparison Strip */}
          <div
            className={`rounded-2xl p-3 flex items-center justify-between gap-2 border ${
              isDarkTheme
                ? 'bg-[#121318] border-neutral-800'
                : 'bg-gray-50 border-gray-100'
            }`}
          >
            <div className="min-w-0">
              <p
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  isDarkTheme ? 'text-neutral-400' : 'text-gray-500'
                }`}
              >
                Current Version
              </p>
              <p className="text-xs font-bold font-mono mt-0.5 truncate">
                v{update.currentVersionName}
              </p>
            </div>

            <ArrowRight
              className={`w-4 h-4 shrink-0 ${
                isDarkTheme ? 'text-neutral-500' : 'text-gray-400'
              }`}
            />

            <div className="min-w-0 text-right">
              <p
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  isDarkTheme ? 'text-neutral-400' : 'text-gray-500'
                }`}
              >
                New Version
              </p>
              <p
                className={`text-xs font-extrabold font-mono mt-0.5 truncate ${
                  isDarkTheme ? 'text-white' : 'text-[#70189F]'
                }`}
              >
                v{update.latestVersionName}
              </p>
            </div>
          </div>

          {/* Release Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span
                className={`font-bold uppercase tracking-wider ${
                  isDarkTheme ? 'text-neutral-300' : 'text-gray-700'
                }`}
              >
                What&apos;s New
              </span>
              <span className={`text-[10px] ${isDarkTheme ? 'text-neutral-400' : 'text-gray-500'}`}>
                {formattedPublishedDate}
                {update.assetSizeBytes > 0
                  ? `${formattedPublishedDate ? ' • ' : ''}${formatBytes(update.assetSizeBytes)}`
                  : ''}
              </span>
            </div>
            <div
              className={`rounded-2xl p-3 max-h-36 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap break-words border ${
                isDarkTheme
                  ? 'bg-[#121318] border-neutral-800 text-neutral-300'
                  : 'bg-gray-50/80 border-gray-100 text-gray-600'
              }`}
            >
              {update.releaseNotes}
            </div>
          </div>

          {/* Live Download & Verification Progress */}
          {(stage === 'downloading' || stage === 'verifying' || stage === 'installing') && (
            <div
              className={`rounded-2xl p-3.5 space-y-2 border ${
                isDarkTheme
                  ? 'bg-[#121318] border-neutral-800'
                  : 'bg-purple-50/50 border-purple-100'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  {stage === 'installing' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  )}
                  <span>
                    {stage === 'verifying'
                      ? 'Verifying update...'
                      : stage === 'installing'
                        ? 'Opening installer...'
                        : progress.stage === 'connecting'
                          ? 'Connecting...'
                          : 'Downloading update...'}
                  </span>
                </span>
                <span className="font-mono">
                  {stage === 'downloading' ? `${progress.percent}%` : '100%'}
                </span>
              </div>

              <div
                className={`w-full h-2 rounded-full overflow-hidden ${
                  isDarkTheme ? 'bg-neutral-800' : 'bg-purple-100'
                }`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-200 ${accentConfig.barFill}`}
                  style={{
                    width: `${
                      stage === 'downloading' ? Math.max(4, progress.percent) : 100
                    }%`,
                  }}
                />
              </div>

              {totalBytesDisplay > 0 && (
                <div
                  className={`flex items-center justify-between text-[10px] font-mono ${
                    isDarkTheme ? 'text-neutral-400' : 'text-gray-500'
                  }`}
                >
                  <span>
                    {formatBytes(progress.downloadedBytes)} / {formatBytes(totalBytesDisplay)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Android Install Unknown Apps Permission Step */}
          {stage === 'permission_required' && (
            <div
              className={`rounded-2xl p-3.5 space-y-2.5 border ${
                isDarkTheme
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-start gap-2">
                <Settings className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold">Allow App Updates Permission</p>
                  <p className="opacity-90 mt-0.5">
                    Enable &ldquo;Allow from this source&rdquo; for {update.appName} in Android
                    Settings. Installation will resume automatically when you return.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenSettings}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  isDarkTheme
                    ? 'bg-amber-400 hover:bg-amber-300 text-black'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Open Android Permission Settings</span>
              </button>
            </div>
          )}

          {/* Error Banner */}
          {stage === 'error' && errorMessage && (
            <div
              className={`rounded-2xl p-3 border flex items-start gap-2 text-xs ${
                isDarkTheme
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <p className="leading-relaxed break-words">{errorMessage}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div
          className={`px-5 pb-5 pt-2 flex items-center gap-2.5 ${
            isDarkTheme ? 'bg-[#181A20]' : 'bg-white'
          }`}
        >
          <button
            id="btn-update-later"
            type="button"
            disabled={stage === 'verifying'}
            onClick={handleCancelOrLater}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs font-extrabold uppercase tracking-wide transition cursor-pointer disabled:opacity-50 ${
              isDarkTheme
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {stage === 'downloading' ? 'Cancel' : 'Later'}
          </button>

          <button
            id="btn-update-now"
            type="button"
            disabled={isBusy}
            onClick={handleUpdateNow}
            className={`flex-[1.4] py-3 px-4 rounded-2xl text-xs font-extrabold uppercase tracking-wide transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] disabled:opacity-60 ${
              update.appId === 'phone' ? '' : 'text-white'
            } ${accentConfig.primaryBg}`}
          >
            {isBusy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{stage === 'verifying' ? 'Verifying...' : `${progress.percent}%`}</span>
              </>
            ) : stage === 'permission_required' ? (
              <>
                <Download className="w-4 h-4" />
                <span>Install Now</span>
              </>
            ) : stage === 'error' ? (
              <>
                <Download className="w-4 h-4" />
                <span>Retry Update</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Update Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

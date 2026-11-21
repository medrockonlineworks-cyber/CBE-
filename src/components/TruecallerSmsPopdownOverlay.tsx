import React, { useEffect, useRef, useState } from 'react';
import { Building2, CheckCheck, X } from 'lucide-react';
import { TruecallerAlert } from '../types/truecaller';
import { TruecallerService } from '../services/truecallerService';

interface TruecallerSmsPopdownOverlayProps {
  /** Current active view in App.tsx so we don't duplicate when Truecaller's own popdown simulator is already active */
  activeView?: string;
  /** Optional callback to jump into the Truecaller app when tapping the popdown card body */
  onOpenTruecaller?: () => void;
}

function formatLiveTime(alert: TruecallerAlert): string {
  const raw = (alert.timeString || '').trim();
  if (raw && raw.toLowerCase() !== 'now') {
    return raw;
  }
  try {
    const dt = alert.timestamp ? new Date(alert.timestamp) : new Date();
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  } catch {}
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function playTruecallerChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.09);
    osc2.frequency.setValueAtTime(1318.5, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.14);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.34);
    setTimeout(() => {
      try {
        void ctx.close();
      } catch {}
    }, 500);
  } catch {}
}

/**
 * Authentic Truecaller SMS Pop-Down Overlay
 * Exact pixel-level design:
 *  - Solid vibrant Truecaller blue (#0066FF) outer rounded container with thick blue border framing inner white card
 *  - Header row: bold lowercase "truecaller" | "SMS • 3:40 PM" | crisp white "×"
 *  - Inner white rounded card:
 *      • Light blue-gray circular badge (#E6EFFD) with dark slate bank building icon + bold "CBE"
 *      • "Account 1********5466 credited with" (or "debited with")
 *      • Extra-bold "ETB 435,000.00"
 *      • Vibrant #0066FF 4-point AI sparkle + "AI summary" (tappable for full SMS breakdown)
 *  - Subtle divider + soft light-gray-blue footer (#F4F7FB) with centered bold #0066FF "Mark as read"
 */
export const TruecallerSmsPopdownOverlay: React.FC<TruecallerSmsPopdownOverlayProps> = ({
  activeView,
  onOpenTruecaller,
}) => {
  const [activeAlert, setActiveAlert] = useState<TruecallerAlert | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMarkedRead, setIsMarkedRead] = useState(false);
  const [showAiBreakdown, setShowAiBreakdown] = useState(false);
  const [isTakeoverPopdownOpen, setIsTakeoverPopdownOpen] = useState(false);
  const activatedInTruecallerRef = useRef<boolean>(activeView === 'truecaller');
  const lastChimedIdRef = useRef<string | null>(null);
  const hideAnimTimerRef = useRef<number | null>(null);

  const clearHideAnimTimer = () => {
    if (hideAnimTimerRef.current !== null) {
      window.clearTimeout(hideAnimTimerRef.current);
      hideAnimTimerRef.current = null;
    }
  };

  const hideOverlayVisually = (resetActivation = false) => {
    clearHideAnimTimer();
    if (resetActivation) {
      activatedInTruecallerRef.current = false;
    }
    setIsVisible(false);
    hideAnimTimerRef.current = window.setTimeout(() => {
      setActiveAlert(null);
      setIsMarkedRead(false);
      setShowAiBreakdown(false);
    }, 240);
  };

  const showAlertPopdown = (incoming: TruecallerAlert, playSound: boolean) => {
    clearHideAnimTimer();
    activatedInTruecallerRef.current = true;
    setActiveAlert(incoming);
    setIsMarkedRead(Boolean(incoming.read));
    // Arm native Android floating overlay so the user can open ANY other app while this pop-down stays shown
    TruecallerService.syncPopdownToNativeOverlay(incoming);
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
    if (playSound && lastChimedIdRef.current !== incoming.id) {
      lastChimedIdRef.current = incoming.id;
      playTruecallerChime();
    }
  };

  const syncPopdownFromStore = (playSoundIfNew: boolean) => {
    const isInTruecaller = activeView === 'truecaller';
    if (isInTruecaller) {
      const persisted = TruecallerService.getActivePopdownAlert({
        fallbackToLatestUnread: true,
      });
      if (persisted) {
        showAlertPopdown(persisted, playSoundIfNew);
      } else {
        hideOverlayVisually(true);
      }
      return;
    }

    // Outside Truecaller: ONLY keep floating if the user opened Truecaller and left without canceling/reading it.
    // Never auto-show on CBE / Messages / Phone launch.
    if (!activatedInTruecallerRef.current) {
      hideOverlayVisually(false);
      return;
    }

    const stillActive = TruecallerService.getActivePopdownAlert({
      fallbackToLatestUnread: false,
    });
    if (stillActive) {
      showAlertPopdown(stillActive, false);
    } else {
      hideOverlayVisually(true);
    }
  };

  useEffect(() => {
    // Only activate when opening Truecaller (or keep floating if already activated from Truecaller)
    syncPopdownFromStore(false);

    const handleLivePopdown = (ev: Event) => {
      // Only pop down live when user is inside Truecaller or already has an active Truecaller-launched floating card
      if (activeView !== 'truecaller' && !activatedInTruecallerRef.current) {
        return;
      }
      const detail = (
        ev as CustomEvent<{ alert?: TruecallerAlert; force?: boolean; silent?: boolean }>
      ).detail;
      const incoming = detail?.alert;
      if (!incoming) return;
      if (incoming.read || TruecallerService.isPopdownDismissed(incoming.id, incoming.txId)) {
        return;
      }
      setShowAiBreakdown(false);
      showAlertPopdown(incoming, !detail?.silent);
    };

    const handleTruecallerActivated = (ev: Event) => {
      const detail = (ev as CustomEvent<{ alert?: TruecallerAlert }>).detail;
      activatedInTruecallerRef.current = true;
      if (detail?.alert && !detail.alert.read) {
        showAlertPopdown(detail.alert, false);
      } else {
        syncPopdownFromStore(false);
      }
    };

    const handleExternalSync = () => {
      syncPopdownFromStore(false);
    };

    const handleExplicitDismiss = () => {
      // Explicitly canceled (×) or marked as read: deactivate and hide
      activatedInTruecallerRef.current = false;
      syncPopdownFromStore(false);
    };

    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        syncPopdownFromStore(false);
      }
    };

    const handleTakeoverState = (ev: Event) => {
      const detail = (ev as CustomEvent<{ active?: boolean }>).detail;
      const active = Boolean(detail?.active);
      setIsTakeoverPopdownOpen(active);
      if (active) {
        activatedInTruecallerRef.current = true;
      }
    };

    if (activeView !== 'truecaller') {
      setIsTakeoverPopdownOpen(false);
    }

    window.addEventListener('tc_live_popdown', handleLivePopdown);
    window.addEventListener('tc_truecaller_popdown_activated', handleTruecallerActivated);
    window.addEventListener('tc_popdown_dismissed', handleExplicitDismiss);
    window.addEventListener('tc_alerts_updated', handleExternalSync);
    window.addEventListener('truecaller_updated', handleExternalSync);
    window.addEventListener('cbe_crossapp_synced', handleExternalSync);
    window.addEventListener('cbe_account_switched', handleExternalSync);
    window.addEventListener('cbe_native_truecaller_marked_read', handleExplicitDismiss);
    window.addEventListener('cbe_native_truecaller_dismissed', handleExplicitDismiss);
    window.addEventListener('tc_takeover_popdown_state', handleTakeoverState);
    window.addEventListener('focus', handleExternalSync);
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      window.removeEventListener('tc_live_popdown', handleLivePopdown);
      window.removeEventListener('tc_truecaller_popdown_activated', handleTruecallerActivated);
      window.removeEventListener('tc_popdown_dismissed', handleExplicitDismiss);
      window.removeEventListener('tc_alerts_updated', handleExternalSync);
      window.removeEventListener('truecaller_updated', handleExternalSync);
      window.removeEventListener('cbe_crossapp_synced', handleExternalSync);
      window.removeEventListener('cbe_account_switched', handleExternalSync);
      window.removeEventListener('cbe_native_truecaller_marked_read', handleExplicitDismiss);
      window.removeEventListener('cbe_native_truecaller_dismissed', handleExplicitDismiss);
      window.removeEventListener('tc_takeover_popdown_state', handleTakeoverState);
      window.removeEventListener('focus', handleExternalSync);
      document.removeEventListener('visibilitychange', handleVisible);
      clearHideAnimTimer();
    };
  }, [activeView]);

  if (!activeAlert) return null;
  if (activeView === 'truecaller' && isTakeoverPopdownOpen) return null;

  const senderLabel =
    activeAlert.bankKey === 'cbe' || !activeAlert.bankName
      ? 'CBE'
      : activeAlert.bankName;
  const maskedAcc = (activeAlert.maskedAccount || '1********4747').replace(/X/g, '*');
  const actionVerb = activeAlert.role === 'receiver' ? 'credited with' : 'debited with';
  const formattedAmount = Number(activeAlert.amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const displayTime = formatLiveTime(activeAlert);

  const handleExplicitCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    TruecallerService.dismissPopdownAlert(activeAlert.id);
    hideOverlayVisually(true);
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    TruecallerService.markAlertAsRead(activeAlert.id);
    setIsMarkedRead(true);
    window.setTimeout(() => {
      hideOverlayVisually(true);
    }, 380);
  };

  const handleToggleBreakdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAiBreakdown((prev) => !prev);
  };

  return (
    <div
      className="fixed inset-x-0 top-0 z-[9999] pointer-events-none flex justify-center px-2.5 pt-[max(env(safe-area-inset-top,0px),36px)]"
      role="dialog"
      aria-label="Truecaller SMS Alert"
    >
      <div
        className={`w-full max-w-[420px] pointer-events-auto transition-all duration-300 ease-out transform ${
          isVisible
            ? 'translate-y-0 opacity-100 scale-100'
            : '-translate-y-[120%] opacity-0 scale-95'
        }`}
      >
        {/* Outer Vibrant Truecaller Blue Container (#0066FF) */}
        <div className="w-full bg-[#0066FF] rounded-[26px] p-[6px] shadow-[0_18px_46px_rgba(0,45,130,0.42)]">
          {/* Top Truecaller Header Row */}
          <div className="px-3.5 pt-2 pb-2.5 flex items-center justify-between text-white select-none">
            <span className="font-extrabold text-[18px] tracking-[-0.03em] lowercase leading-none text-white">
              truecaller
            </span>

            <span className="text-[14.5px] font-medium text-white/95 tracking-normal leading-none">
              SMS • {displayTime}
            </span>

            <button
              type="button"
              onClick={handleExplicitCancel}
              aria-label="Dismiss Truecaller SMS notification"
              className="w-7 h-7 -mr-1 rounded-full flex items-center justify-center text-white hover:bg-white/15 active:scale-90 transition cursor-pointer"
            >
              <X className="w-[19px] h-[19px] stroke-[2.3]" />
            </button>
          </div>

          {/* Inner Crisp White Card — tapping opens Truecaller WITHOUT canceling the pop-down */}
          <div
            onClick={() => {
              if (onOpenTruecaller && activeView !== 'truecaller') {
                onOpenTruecaller();
              }
            }}
            className="bg-white rounded-[20px] overflow-hidden text-[#111827] cursor-pointer"
          >
            {/* Card Body */}
            <div className="px-4 pt-4 pb-3.5">
              {/* Sender Avatar Circle + CBE Label */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#E5EEFA] flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-[22px] h-[22px] text-[#1F2937] stroke-[2]" />
                </div>
                <span className="font-bold text-[19.5px] text-[#111827] tracking-[-0.015em] leading-none">
                  {senderLabel}
                </span>
              </div>

              {/* Headline Account + Amount */}
              <div className="mt-3.5">
                <p className="text-[16px] font-bold text-[#111827] leading-snug tracking-[-0.01em]">
                  Account {maskedAcc} {actionVerb}
                </p>
                <p className="text-[27px] font-extrabold text-[#0B0F19] leading-[1.15] tracking-[-0.025em] mt-0.5 whitespace-nowrap">
                  ETB {formattedAmount}
                </p>
              </div>

              {/* AI Summary Row */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleToggleBreakdown}
                  className="inline-flex items-center gap-2 text-[#4B5563] hover:text-[#111827] text-[15px] font-normal transition cursor-pointer"
                >
                  {/* Truecaller 4-point AI Sparkle Icon */}
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="flex-shrink-0"
                    aria-hidden="true"
                  >
                    <path
                      d="M11 2L13.2 8.8L20 11L13.2 13.2L11 20L8.8 13.2L2 11L8.8 8.8L11 2Z"
                      fill="#0066FF"
                    />
                    <path
                      d="M18.5 3L19.4 5.6L22 6.5L19.4 7.4L18.5 10L17.6 7.4L15 6.5L17.6 5.6L18.5 3Z"
                      fill="#0066FF"
                    />
                    <circle cx="5.5" cy="18.5" r="1.5" fill="#0066FF" />
                  </svg>
                  <span>AI summary</span>
                </button>

                {showAiBreakdown && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2.5 p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-[12px] space-y-1.5 text-[#334155]"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="text-[#64748B]">Account Holder</span>
                      <span className="font-semibold text-[#0F172A] text-right">
                        {activeAlert.holderName}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#64748B]">Counterparty</span>
                      <span className="font-semibold text-[#0F172A] text-right">
                        {activeAlert.counterpartyName}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#64748B]">Reference</span>
                      <span className="font-mono font-semibold text-[#0F172A]">
                        {activeAlert.txId}
                      </span>
                    </div>
                    {typeof activeAlert.balanceAfter === 'number' && (
                      <div className="flex justify-between gap-2 pt-1.5 border-t border-[#E2E8F0]">
                        <span className="text-[#64748B]">Current Balance</span>
                        <span className="font-bold text-[#059669]">
                          ETB{' '}
                          {activeAlert.balanceAfter.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Mark as Read Footer */}
            <div className="border-t border-[#E5E7EB] bg-[#F5F8FC]">
              <button
                type="button"
                onClick={handleMarkAsRead}
                className="w-full py-3.5 px-4 text-center text-[17.5px] font-bold tracking-[-0.01em] active:bg-[#E8F0FE] transition cursor-pointer flex items-center justify-center gap-1.5"
                style={{ color: isMarkedRead ? '#059669' : '#0066FF' }}
              >
                {isMarkedRead ? (
                  <>
                    <CheckCheck className="w-4 h-4 text-[#059669]" />
                    <span>Read</span>
                  </>
                ) : (
                  <span>Mark as read</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TruecallerSmsPopdownOverlay;

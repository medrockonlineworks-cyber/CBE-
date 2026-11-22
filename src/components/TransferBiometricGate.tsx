import React, { useEffect, useRef, useState } from 'react';
import { Check, X, AlertCircle, ExternalLink } from 'lucide-react';
import { UserProfile } from '../types';
import { LocalDb } from '../lib/mockData';
import { BiometricAuthService, BiometricMethod } from '../services/biometricAuthService';
import { CbeFingerprintIcon, CbeFaceIdIcon } from './Auth';

interface TransferBiometricGateProps {
  open: boolean;
  user: UserProfile;
  amountDisplay?: string;
  recipientName?: string;
  onConfirmed: () => void;
  onCancel: () => void;
}

type GatePhase = 'prompt' | 'authenticating' | 'confirmed';

export const TransferBiometricGate: React.FC<TransferBiometricGateProps> = ({
  open,
  user,
  amountDisplay,
  recipientName,
  onConfirmed,
  onCancel,
}) => {
  const [phase, setPhase] = useState<GatePhase>('prompt');
  const [biometricMethod, setBiometricMethod] = useState<BiometricMethod>(() =>
    BiometricAuthService.getBiometricMethod()
  );
  const [customBiometricIcon, setCustomBiometricIcon] = useState<string | null>(() =>
    LocalDb.getCustomBiometricIcon()
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [iframeBlocked, setIframeBlocked] = useState(false);

  const isMountedRef = useRef(true);
  const confirmTimerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (confirmTimerRef.current) {
        window.clearTimeout(confirmTimerRef.current);
      }
    };
  }, []);

  // Reset state whenever modal opens/closes and refresh device biometric method
  useEffect(() => {
    if (open) {
      setPhase('prompt');
      setErrorMsg('');
      setIframeBlocked(false);
      setBiometricMethod(BiometricAuthService.getBiometricMethod());
      setCustomBiometricIcon(LocalDb.getCustomBiometricIcon());
      inFlightRef.current = false;

      // Sync with actual hardware detection (Android Fingerprint vs iOS Face ID)
      BiometricAuthService.checkAvailability()
        .then((avail) => {
          if (isMountedRef.current) {
            setBiometricMethod(avail.method);
          }
        })
        .catch(() => {});
    } else {
      if (confirmTimerRef.current) {
        window.clearTimeout(confirmTimerRef.current);
        confirmTimerRef.current = null;
      }
      inFlightRef.current = false;
    }
  }, [open]);

  if (!open) return null;

  const isFaceId = biometricMethod === 'faceid';
  const methodLabel = isFaceId ? 'Face ID' : 'Fingerprint';

  const renderBiometricGlyph = (
    size: number,
    color: string,
    strokeWidth: number = 1.9,
    imgSize?: number
  ) => {
    if (customBiometricIcon) {
      const px = imgSize ?? size;
      return (
        <img
          src={customBiometricIcon}
          alt={methodLabel}
          style={{ width: px, height: px }}
          className="object-contain select-none pointer-events-none"
          draggable={false}
        />
      );
    }
    return isFaceId ? (
      <CbeFaceIdIcon size={size} strokeColor={color} strokeWidth={strokeWidth} />
    ) : (
      <CbeFingerprintIcon size={size} strokeColor={color} strokeWidth={strokeWidth} />
    );
  };

  const handleStartBiometricVerification = async () => {
    if (inFlightRef.current || phase === 'confirmed') return;
    inFlightRef.current = true;
    setErrorMsg('');
    setIframeBlocked(false);
    setPhase('authenticating');

    try {
      const result = await BiometricAuthService.confirmIdentityForTransfer(user, {
        amountDisplay,
        recipientName,
      });

      if (!isMountedRef.current) return;

      setBiometricMethod(result.method);

      if (result.status === 'success') {
        // Show the exact green Authenticated/Confirmed pop-out animation from the Login screen
        setPhase('confirmed');
        confirmTimerRef.current = window.setTimeout(() => {
          if (!isMountedRef.current) return;
          inFlightRef.current = false;
          onConfirmed();
        }, 680);
        return;
      }

      // Not verified — stay on prompt (NO skip allowed; both biometric & PIN are required)
      setPhase('prompt');
      inFlightRef.current = false;

      if (result.status === 'iframe_blocked') {
        setIframeBlocked(true);
        setErrorMsg(
          result.message ||
            `Open this app directly in ${result.method === 'faceid' ? 'Safari' : 'Chrome'} to confirm with ${result.method === 'faceid' ? 'Face ID' : 'Fingerprint'}.`
        );
      } else {
        setErrorMsg(
          result.message ||
            `${result.method === 'faceid' ? 'Face ID' : 'Fingerprint'} confirmation is required before entering your PIN.`
        );
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setPhase('prompt');
      inFlightRef.current = false;
      setErrorMsg(
        err instanceof Error
          ? err.message
          : `${methodLabel} verification failed. Please try again.`
      );
    }
  };

  return (
    <>
      {/* Step 1 Bottom Sheet: Ask user to confirm it's you with Fingerprint (Android) / Face ID (iOS) */}
      {phase === 'prompt' && (
        <div
          className="fixed inset-0 z-[130] bg-black/45 backdrop-blur-[2px] flex items-end justify-center animate-in fade-in duration-150"
          onClick={onCancel}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-t-[28px] px-6 pt-3 pb-[max(env(safe-area-inset-bottom,16px),22px)] shadow-2xl animate-in slide-in-from-bottom duration-200 relative"
          >
            {/* Top Drag Handle + Close */}
            <div className="relative flex items-center justify-center pt-1 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
              <button
                type="button"
                onClick={onCancel}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition cursor-pointer absolute right-0 top-0"
                aria-label="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Step Indicator + Heading */}
            <div className="text-center pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#70189F]/75">
                Step 1 of 2 • Confirm Identity
              </p>
              <h3 className="text-[19px] font-bold text-[#1f1630] tracking-tight mt-1">
                Confirm it&apos;s you
              </h3>
              <p className="text-[13px] text-[#5e566d] mt-1.5 leading-relaxed max-w-[290px] mx-auto">
                {isFaceId
                  ? 'Provide your Face ID to verify this transfer, then continue with your PIN.'
                  : 'Provide your fingerprint to verify this transfer, then continue with your PIN.'}
              </p>
            </div>

            {/* Transfer Summary Strip */}
            {(amountDisplay || recipientName) && (
              <div className="mt-4 bg-[#f7f4fa] border border-[#ebe3f4] rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0 text-left">
                  <p className="text-[11px] font-medium text-[#7b6e91]">Transfer to</p>
                  <p className="text-[13px] font-bold text-[#251838] truncate">
                    {recipientName || 'CBE Recipient'}
                  </p>
                </div>
                {amountDisplay && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] font-medium text-[#7b6e91]">Amount</p>
                    <p className="text-[13.5px] font-extrabold text-[#70189F] tabular-nums">
                      {amountDisplay}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Central Biometric Trigger (matching CBE Login screen lavender halo + purple glyph) */}
            <div className="flex flex-col items-center justify-center pt-6 pb-4">
              <button
                id="transfer-biometric-trigger"
                type="button"
                onClick={handleStartBiometricVerification}
                className="group flex flex-col items-center focus:outline-none cursor-pointer"
                aria-label={`Confirm with ${methodLabel}`}
              >
                <span className="relative flex items-center justify-center">
                  <span className="w-[92px] h-[92px] rounded-full bg-[#e6d5ee] flex items-center justify-center transition-transform duration-150 group-hover:scale-105 group-active:scale-95">
                    <span className="w-[74px] h-[74px] rounded-full bg-[#fdfcff] shadow-[0_6px_18px_rgba(112,24,159,0.14)] flex items-center justify-center">
                      {renderBiometricGlyph(isFaceId ? 38 : 42, '#70189F', 1.9, 44)}
                    </span>
                  </span>
                </span>
                <span className="mt-3 text-[12px] font-bold uppercase tracking-[0.07em] text-[#70189F]">
                  {isFaceId ? 'Tap to verify Face ID' : 'Touch to verify Fingerprint'}
                </span>
              </button>
            </div>

            {/* Inline Error / Iframe Notice */}
            {errorMsg && (
              <div className="mb-3 rounded-2xl bg-red-50 border border-red-200/80 px-3.5 py-2.5 text-left flex items-start gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-red-700 leading-snug">
                    {errorMsg}
                  </p>
                  {iframeBlocked && (
                    <a
                      href={typeof window !== 'undefined' ? window.location.href : '/'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1.5 text-[11.5px] font-bold text-[#70189F] hover:underline"
                    >
                      <span>Open in {isFaceId ? 'Safari' : 'Chrome'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Primary CTA Button */}
            <button
              id="transfer-biometric-confirm-btn"
              type="button"
              onClick={handleStartBiometricVerification}
              className="w-full py-3.5 rounded-2xl bg-[#70189F] hover:bg-[#5e1385] active:scale-[0.99] text-white font-bold text-[14.5px] shadow-md shadow-purple-900/20 transition cursor-pointer"
            >
              {isFaceId ? 'Confirm with Face ID' : 'Confirm with Fingerprint'}
            </button>

            {/* Cancel Button (No skip — both Biometric & PIN are required) */}
            <div className="text-center pt-3">
              <button
                type="button"
                onClick={onCancel}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition cursor-pointer px-4 py-1"
              >
                Cancel Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Centered Biometric Pop-Out Card Animation (Exact Login Page Style: Authenticating -> Confirmed!) */}
      {(phase === 'authenticating' || phase === 'confirmed') && (
        <div
          className={`fixed inset-0 z-[130] bg-black/35 flex items-center justify-center px-6 animate-in fade-in duration-150 ${
            phase === 'confirmed'
              ? ''
              : isFaceId
                ? 'pt-10 sm:pt-8'
                : 'pb-32 sm:pb-24'
          }`}
        >
          <div className="w-[80%] max-w-[296px] min-h-[184px] rounded-[24px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.24)] px-6 py-7 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-150">
            {phase === 'confirmed' ? (
              <>
                <div className="w-[70px] h-[70px] rounded-full bg-[#22c55e] flex items-center justify-center shadow-sm animate-in zoom-in-75 duration-200">
                  <Check className="w-10 h-10 text-white stroke-[3]" />
                </div>
                <p className="text-[#22c55e] text-[15.5px] font-medium mt-4 tracking-normal">
                  Confirmed!
                </p>
              </>
            ) : (
              <>
                <div className="relative w-[84px] h-[84px] flex items-center justify-center">
                  <svg
                    className="absolute inset-0 w-full h-full animate-spin"
                    style={{ animationDuration: '1.05s' }}
                    viewBox="0 0 84 84"
                    fill="none"
                  >
                    <circle
                      cx="42"
                      cy="42"
                      r="38"
                      stroke="#dc2626"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                      strokeDasharray="166 240"
                    />
                  </svg>
                  {renderBiometricGlyph(isFaceId ? 42 : 44, '#70189F', 2.0, 46)}
                </div>
                <p className="text-[#4b5563] text-[15px] font-medium mt-4 tracking-normal">
                  Confirming...
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default TransferBiometricGate;

import React from 'react';
import { Check } from 'lucide-react';
import { LocalDb } from '../lib/mockData';
import { BiometricMethod } from '../services/biometricAuthService';
import { CbeFingerprintIcon, CbeFaceIdIcon } from './Auth';

export type TransferBiometricPhase = null | 'authenticating' | 'confirmed';

interface TransferBiometricOverlayProps {
  phase: TransferBiometricPhase;
  method: BiometricMethod;
  iframeBlockedMethod?: BiometricMethod | null;
  onDismissIframeNotice?: () => void;
}

/**
 * Clean, login-matched centered pop-out animation for real device biometrics
 * during transfers (Android Fingerprint / iOS Face ID).
 * No fake prompt sheets, no extra step labels.
 */
export const TransferBiometricGate: React.FC<TransferBiometricOverlayProps> = ({
  phase,
  method,
  iframeBlockedMethod = null,
  onDismissIframeNotice,
}) => {
  const customBiometricIcon = LocalDb.getCustomBiometricIcon();
  const isFaceId = method === 'faceid';

  const renderBiometricGlyph = (
    targetMethod: BiometricMethod,
    size: number,
    color: string,
    strokeWidth: number = 2.0,
    imgSize?: number
  ) => {
    if (customBiometricIcon) {
      const px = imgSize ?? size;
      return (
        <img
          src={customBiometricIcon}
          alt={targetMethod === 'faceid' ? 'Face ID' : 'Fingerprint'}
          style={{ width: px, height: px }}
          className="object-contain select-none pointer-events-none"
          draggable={false}
        />
      );
    }
    return targetMethod === 'faceid' ? (
      <CbeFaceIdIcon size={size} strokeColor={color} strokeWidth={strokeWidth} />
    ) : (
      <CbeFingerprintIcon size={size} strokeColor={color} strokeWidth={strokeWidth} />
    );
  };

  return (
    <>
      {/* Exact Login-Page Centered Biometric Pop-Out Card (Authenticating... -> Confirmed!) */}
      {phase && (
        <div
          className={`fixed inset-0 z-[140] bg-black/35 flex items-center justify-center px-6 pointer-events-none animate-in fade-in duration-150 ${
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
                  {renderBiometricGlyph(method, isFaceId ? 42 : 44, '#70189F', 2.0, 46)}
                </div>
                <p className="text-[#4b5563] text-[15px] font-medium mt-4 tracking-normal">
                  Authenticating...
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Embedded preview iframe notice ONLY when browser blocks native OS Face ID / Fingerprint */}
      {iframeBlockedMethod && (
        <div
          onClick={onDismissIframeNotice}
          className="fixed inset-0 z-[140] bg-black/45 backdrop-blur-[2px] flex items-center justify-center px-5 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-neutral-100 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-purple-100 text-[#70189F] flex items-center justify-center mx-auto mb-3 overflow-hidden">
              {renderBiometricGlyph(
                iframeBlockedMethod,
                iframeBlockedMethod === 'faceid' ? 28 : 30,
                '#70189F',
                2,
                32
              )}
            </div>
            <h3 className="text-base font-bold text-neutral-900">
              Open Directly for Device {iframeBlockedMethod === 'faceid' ? 'Face ID' : 'Fingerprint'}
            </h3>
            <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
              Your browser blocks native device {iframeBlockedMethod === 'faceid' ? 'Face ID' : 'Fingerprint'} inside an embedded preview frame. Open the app directly in {iframeBlockedMethod === 'faceid' ? 'Safari' : 'Chrome'} to confirm your transfer.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <a
                href={typeof window !== 'undefined' ? window.location.href : '/'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onDismissIframeNotice}
                className="w-full py-2.5 rounded-2xl bg-[#70189F] hover:bg-[#5e1385] text-white font-semibold text-xs transition flex items-center justify-center"
              >
                Open in {iframeBlockedMethod === 'faceid' ? 'Safari' : 'Browser'}
              </a>
              <button
                type="button"
                onClick={onDismissIframeNotice}
                className="w-full py-2.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TransferBiometricGate;

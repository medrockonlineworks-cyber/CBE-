import { UserProfile } from '../types';
import { PhoneSettingsService } from './phoneSettingsService';

export type BiometricMethod = 'faceid' | 'fingerprint';

export interface BiometricAttemptResult {
  status: 'success' | 'cancelled' | 'needs_system_sheet' | 'error';
  method: BiometricMethod;
  source?: 'webauthn' | 'system_sheet';
  message?: string;
}

interface StoredWebAuthnCredential {
  credId: string;
  rpId: string;
  method: BiometricMethod;
  createdAt: string;
}

const CRED_STORAGE_PREFIX = 'cbe_device_biometric_cred_v1_';

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(base64url: string): Uint8Array {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((base64url.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function generateChallenge(size = 32): Uint8Array {
  const buf = new Uint8Array(size);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < size; i++) {
      buf[i] = Math.floor(Math.random() * 256);
    }
  }
  return buf;
}

function utf8ToBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export class BiometricAuthService {
  /**
   * Returns 'faceid' on iPhone/iPad (real device OR iPhone simulator preset),
   * and 'fingerprint' on Android devices/presets.
   */
  public static getBiometricMethod(): BiometricMethod {
    return PhoneSettingsService.isIPhoneMode() ? 'faceid' : 'fingerprint';
  }

  public static getLabels(method: BiometricMethod = this.getBiometricMethod()) {
    if (method === 'faceid') {
      return {
        methodName: 'Face ID',
        idleButtonText: 'USE FACE ID',
        scanningButtonText: 'Verifying Face ID...',
        keypadButtonText: 'Use Face ID',
        cancelledMessage: 'Face ID authentication cancelled. Try again or enter PIN.',
        promptTitle: 'Face ID',
        promptSubtitle: 'Sign in to Commercial Bank of Ethiopia',
      };
    }

    return {
      methodName: 'Fingerprint',
      idleButtonText: 'USE FINGERPRINT',
      scanningButtonText: 'Scanning Fingerprint...',
      keypadButtonText: 'Use Fingerprint',
      cancelledMessage: 'Fingerprint authentication cancelled. Try again or enter PIN.',
      promptTitle: 'Verify your identity',
      promptSubtitle: 'Touch the fingerprint sensor to sign in to CBE Mobile',
    };
  }

  public static getStoredCredential(userId: string): StoredWebAuthnCredential | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`${CRED_STORAGE_PREFIX}${userId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredWebAuthnCredential;
      if (!parsed?.credId || !parsed?.rpId) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  public static saveStoredCredential(userId: string, cred: StoredWebAuthnCredential): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${CRED_STORAGE_PREFIX}${userId}`, JSON.stringify(cred));
    } catch {
      // Non-blocking
    }
  }

  public static clearStoredCredential(userId: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(`${CRED_STORAGE_PREFIX}${userId}`);
    } catch {
      // Non-blocking
    }
  }

  private static isWebAuthnBlockedByIframePolicy(): boolean {
    if (typeof window === 'undefined' || typeof document === 'undefined') return true;
    const inIframe = window.self !== window.top;
    if (!inIframe) return false;

    const docAny = document as unknown as {
      featurePolicy?: { allowsFeature?: (name: string) => boolean };
      permissionsPolicy?: { allowsFeature?: (name: string) => boolean };
    };

    try {
      if (docAny.permissionsPolicy?.allowsFeature) {
        if (
          !docAny.permissionsPolicy.allowsFeature('publickey-credentials-get') ||
          !docAny.permissionsPolicy.allowsFeature('publickey-credentials-create')
        ) {
          return true;
        }
      }
      if (docAny.featurePolicy?.allowsFeature) {
        if (!docAny.featurePolicy.allowsFeature('publickey-credentials-get')) {
          return true;
        }
      }
    } catch {
      // Ignore introspection failures
    }
    return false;
  }

  public static async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (
      typeof window === 'undefined' ||
      typeof window.PublicKeyCredential === 'undefined' ||
      !navigator.credentials
    ) {
      return false;
    }

    if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') {
      return false;
    }

    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  private static async enrollPlatformCredential(user: UserProfile, method: BiometricMethod): Promise<void> {
    const rpId = window.location.hostname;
    const userIdBytes = utf8ToBytes(user.id || 'cbe_user');
    const challenge = generateChallenge(32);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: challenge.buffer as ArrayBuffer,
        rp: {
          name: 'Commercial Bank of Ethiopia',
          id: rpId,
        },
        user: {
          id: userIdBytes.buffer as ArrayBuffer,
          name: user.accountNumber || user.email || user.id,
          displayName: user.name || 'CBE Customer',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256 (Secure Enclave / Android Keystore)
          { type: 'public-key', alg: -257 }, // RS256 fallback
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential || !credential.rawId) {
      throw new Error('Device biometric registration returned empty credential.');
    }

    const credId = bytesToBase64Url(new Uint8Array(credential.rawId));
    this.saveStoredCredential(user.id, {
      credId,
      rpId,
      method,
      createdAt: new Date().toISOString(),
    });
  }

  private static async verifyPlatformCredential(credId: string, rpId: string): Promise<void> {
    const challenge = generateChallenge(32);
    const idBytes = base64UrlToBytes(credId);

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: challenge.buffer as ArrayBuffer,
        rpId,
        allowCredentials: [
          {
            id: idBytes.buffer as ArrayBuffer,
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion || !assertion.rawId) {
      throw new Error('Biometric verification did not return an assertion.');
    }
  }

  /**
   * Attempts authentication using the real device login system (iPhone Face ID / Android Fingerprint via WebAuthn).
   * - If WebAuthn is allowed and supported by the device, launches the native OS Face ID / Fingerprint prompt.
   * - If the user explicitly cancels or fails the native prompt, returns 'cancelled' (does NOT bypass).
   * - If running inside an iframe/environment where WebAuthn is blocked by Permissions-Policy or unsupported,
   *   returns 'needs_system_sheet' so the UI can show the device-matched biometric prompt sheet.
   */
  public static async authenticateWithDevice(user: UserProfile): Promise<BiometricAttemptResult> {
    const method = this.getBiometricMethod();
    const labels = this.getLabels(method);

    if (typeof window === 'undefined' || !window.isSecureContext || !navigator.credentials || !window.PublicKeyCredential) {
      return {
        status: 'needs_system_sheet',
        method,
        message: 'Native WebAuthn requires a secure browser context.',
      };
    }

    if (this.isWebAuthnBlockedByIframePolicy()) {
      return {
        status: 'needs_system_sheet',
        method,
        message: 'Embedded frame restricts direct WebAuthn prompt.',
      };
    }

    const platformSupported = await this.isPlatformAuthenticatorAvailable();
    if (!platformSupported) {
      return {
        status: 'needs_system_sheet',
        method,
        message: 'Device platform authenticator is unavailable in this browser.',
      };
    }

    const currentHost = window.location.hostname;
    const stored = this.getStoredCredential(user.id);
    const startedAt = Date.now();

    try {
      if (stored && stored.rpId === currentHost) {
        try {
          await this.verifyPlatformCredential(stored.credId, currentHost);
          return {
            status: 'success',
            method,
            source: 'webauthn',
          };
        } catch (verifyErr: unknown) {
          const errName = verifyErr instanceof DOMException ? verifyErr.name : '';
          // If stored credential was removed from device keychain/settings, re-enroll cleanly
          if (errName === 'InvalidStateError' || errName === 'NotFoundError') {
            this.clearStoredCredential(user.id);
            await this.enrollPlatformCredential(user, method);
            return {
              status: 'success',
              method,
              source: 'webauthn',
            };
          }
          throw verifyErr;
        }
      } else {
        // First time on this device/origin: enroll & immediately verify with native Face ID / Fingerprint
        await this.enrollPlatformCredential(user, method);
        return {
          status: 'success',
          method,
          source: 'webauthn',
        };
      }
    } catch (err: unknown) {
      const elapsedMs = Date.now() - startedAt;
      const errName = err instanceof DOMException ? err.name : '';
      const errMsg = err instanceof Error ? err.message : String(err);
      const inIframe = window.self !== window.top;

      // Permissions policy / cross-origin iframe block (browser rejected instantly without showing OS sheet)
      if (
        errName === 'SecurityError' ||
        /feature is not enabled|permissions policy|not allowed in this document|cross-origin/i.test(errMsg) ||
        (inIframe && errName === 'NotAllowedError' && elapsedMs < 180)
      ) {
        return {
          status: 'needs_system_sheet',
          method,
          message: errMsg,
        };
      }

      // Real user cancellation or timeout on the native OS Face ID / Fingerprint dialog
      if (errName === 'NotAllowedError' || errName === 'AbortError') {
        return {
          status: 'cancelled',
          method,
          message: labels.cancelledMessage,
        };
      }

      return {
        status: 'error',
        method,
        message: errMsg || labels.cancelledMessage,
      };
    }
  }
}

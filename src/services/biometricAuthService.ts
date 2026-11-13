import { UserProfile } from '../types';
import { PhoneSettingsService } from './phoneSettingsService';

export type BiometricMethod = 'faceid' | 'fingerprint';

export interface BiometricAttemptResult {
  status: 'success' | 'cancelled' | 'iframe_blocked' | 'unsupported' | 'error';
  method: BiometricMethod;
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

  public static getDeviceBiometricName(method: BiometricMethod = this.getBiometricMethod()): string {
    return method === 'faceid' ? 'Face ID' : 'Fingerprint';
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

    const publicKeyOptions: PublicKeyCredentialCreationOptions & { hints?: string[] } = {
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
        { type: 'public-key', alg: -7 },   // ES256 (iOS Secure Enclave / Android Keystore)
        { type: 'public-key', alg: -257 }, // RS256 fallback
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
        requireResidentKey: false,
      },
      hints: ['client-device'],
      timeout: 60000,
      attestation: 'none',
    };

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyOptions,
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

    const publicKeyOptions: PublicKeyCredentialRequestOptions & { hints?: string[] } = {
      challenge: challenge.buffer as ArrayBuffer,
      rpId,
      allowCredentials: [
        {
          id: idBytes.buffer as ArrayBuffer,
          type: 'public-key',
          transports: ['internal'],
        },
      ],
      hints: ['client-device'],
      userVerification: 'required',
      timeout: 60000,
    };

    const assertion = (await navigator.credentials.get({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential | null;

    if (!assertion || !assertion.rawId) {
      throw new Error('Biometric verification did not return an assertion.');
    }
  }

  /**
   * Activates the real OS device security login system (Face ID on iPhone / Fingerprint on Android)
   * using WebAuthn Platform Authenticator (`navigator.credentials`).
   * Never fakes or bypasses verification.
   */
  public static async authenticateWithDevice(user: UserProfile): Promise<BiometricAttemptResult> {
    const method = this.getBiometricMethod();
    const methodName = this.getDeviceBiometricName(method);

    if (typeof window === 'undefined' || !window.isSecureContext || !navigator.credentials || !window.PublicKeyCredential) {
      return {
        status: 'unsupported',
        method,
        message: `${methodName} requires a secure HTTPS browser with device biometrics enabled.`,
      };
    }

    const platformSupported = await this.isPlatformAuthenticatorAvailable();
    if (!platformSupported) {
      return {
        status: 'unsupported',
        method,
        message: `${methodName} is not configured on this device/browser. Please enter your PIN.`,
      };
    }

    const currentHost = window.location.hostname;
    const stored = this.getStoredCredential(user.id);
    const startedAt = Date.now();

    try {
      if (stored && stored.rpId === currentHost) {
        try {
          await this.verifyPlatformCredential(stored.credId, currentHost);
          return { status: 'success', method };
        } catch (verifyErr: unknown) {
          const errName = verifyErr instanceof DOMException ? verifyErr.name : '';
          // If the device key was removed from iCloud Keychain / Android biometrics, re-enroll via real OS prompt
          if (errName === 'InvalidStateError' || errName === 'NotFoundError') {
            this.clearStoredCredential(user.id);
            await this.enrollPlatformCredential(user, method);
            return { status: 'success', method };
          }
          throw verifyErr;
        }
      } else {
        // Enroll on this device & verify immediately using real OS Face ID / Fingerprint dialog
        await this.enrollPlatformCredential(user, method);
        return { status: 'success', method };
      }
    } catch (err: unknown) {
      const elapsedMs = Date.now() - startedAt;
      const errName = err instanceof DOMException ? err.name : '';
      const errMsg = err instanceof Error ? err.message : String(err);
      const inIframe = window.self !== window.top;

      // Detect when an embedded iframe Permissions Policy blocks WebAuthn before showing the OS dialog
      if (
        inIframe &&
        (errName === 'SecurityError' ||
          /feature is not enabled|permissions policy|not allowed in this document|publickey-credentials/i.test(errMsg) ||
          (errName === 'NotAllowedError' && elapsedMs < 250))
      ) {
        return {
          status: 'iframe_blocked',
          method,
          message: `Open this app directly in ${method === 'faceid' ? 'Safari' : 'your browser'} to authenticate with device ${methodName}.`,
        };
      }

      if (errName === 'NotAllowedError' || errName === 'AbortError') {
        return {
          status: 'cancelled',
          method,
          message: `${methodName} verification was cancelled or failed.`,
        };
      }

      return {
        status: 'error',
        method,
        message: errMsg || `${methodName} verification failed. Please use your PIN.`,
      };
    }
  }
}

import { Capacitor, registerPlugin } from '@capacitor/core';
import { UserProfile } from '../types';
import { PhoneSettingsService } from './phoneSettingsService';

export type BiometricMethod = 'faceid' | 'fingerprint';

export interface BiometricAttemptResult {
  status: 'success' | 'cancelled' | 'iframe_blocked' | 'unsupported' | 'error';
  method: BiometricMethod;
  message?: string;
}

interface NativeBiometricResponse {
  verified: boolean;
  cancelled?: boolean;
  unavailable?: boolean;
  method?: string;
  error?: string;
}

interface DeviceBiometricsPluginInterface {
  authenticate(options: { reason: string }): Promise<NativeBiometricResponse>;
}

const DeviceBiometricsNative = registerPlugin<DeviceBiometricsPluginInterface>('DeviceBiometrics');

interface StoredWebAuthnCredential {
  credId: string;
  rpId: string;
  method: BiometricMethod;
  createdAt: string;
}

const CRED_STORAGE_PREFIX = 'cbe_device_biometric_cred_v1_';
const DEVICE_CRED_KEY = 'cbe_device_biometric_cred_v1_device';

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
   * Returns 'faceid' on iPhone/iPad (native iOS, physical iOS device, or iPhone simulator preset),
   * and 'fingerprint' on Android devices/presets.
   * Hardware OS always takes priority on real mobile devices.
   */
  public static getBiometricMethod(): BiometricMethod {
    if (typeof window !== 'undefined') {
      if (Capacitor.isNativePlatform()) {
        const platform = Capacitor.getPlatform();
        if (platform === 'ios') return 'faceid';
        if (platform === 'android') return 'fingerprint';
      }
      if (PhoneSettingsService.isIPhoneDevice()) {
        return 'faceid';
      }
      if (typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '')) {
        return 'fingerprint';
      }
    }
    return PhoneSettingsService.isIPhoneMode() ? 'faceid' : 'fingerprint';
  }

  public static getDeviceBiometricName(method: BiometricMethod = this.getBiometricMethod()): string {
    return method === 'faceid' ? 'Face ID' : 'Fingerprint';
  }

  public static getStoredCredential(userId: string): StoredWebAuthnCredential | null {
    if (typeof window === 'undefined') return null;
    try {
      const userRaw = localStorage.getItem(`${CRED_STORAGE_PREFIX}${userId}`);
      if (userRaw) {
        const parsed = JSON.parse(userRaw) as StoredWebAuthnCredential;
        if (parsed?.credId && parsed?.rpId) return parsed;
      }
      const deviceRaw = localStorage.getItem(DEVICE_CRED_KEY);
      if (deviceRaw) {
        const parsed = JSON.parse(deviceRaw) as StoredWebAuthnCredential;
        if (parsed?.credId && parsed?.rpId) return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  public static saveStoredCredential(userId: string, cred: StoredWebAuthnCredential): void {
    if (typeof window === 'undefined') return;
    try {
      const serialized = JSON.stringify(cred);
      localStorage.setItem(`${CRED_STORAGE_PREFIX}${userId}`, serialized);
      localStorage.setItem(DEVICE_CRED_KEY, serialized);
    } catch {
      // Non-blocking
    }
  }

  public static clearStoredCredential(userId: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(`${CRED_STORAGE_PREFIX}${userId}`);
      localStorage.removeItem(DEVICE_CRED_KEY);
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
        name: 'CBE Mobile Banking',
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

    let credential: PublicKeyCredential | null;
    try {
      credential = (await navigator.credentials.create({
        publicKey: publicKeyOptions,
      })) as PublicKeyCredential | null;
    } catch (createErr) {
      if (createErr instanceof TypeError) {
        const { hints: _ignoredHints, ...legacyOptions } = publicKeyOptions;
        credential = (await navigator.credentials.create({
          publicKey: legacyOptions,
        })) as PublicKeyCredential | null;
      } else {
        throw createErr;
      }
    }

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

    let assertion: PublicKeyCredential | null;
    try {
      assertion = (await navigator.credentials.get({
        publicKey: publicKeyOptions,
      })) as PublicKeyCredential | null;
    } catch (getErr) {
      if (getErr instanceof TypeError) {
        const { hints: _ignoredHints, ...legacyOptions } = publicKeyOptions;
        assertion = (await navigator.credentials.get({
          publicKey: legacyOptions,
        })) as PublicKeyCredential | null;
      } else {
        throw getErr;
      }
    }

    if (!assertion || !assertion.rawId) {
      throw new Error('Biometric verification did not return an assertion.');
    }
  }

  /**
   * Activates the real OS device security login system:
   * 1. Native Capacitor (iOS LAContext Face ID / Android BiometricPrompt Fingerprint) when running in native app
   * 2. WebAuthn Platform Authenticator (Face ID in iOS Safari/PWA / Fingerprint in Android Chrome)
   */
  public static async authenticateWithDevice(user: UserProfile): Promise<BiometricAttemptResult> {
    const method = this.getBiometricMethod();
    const methodName = this.getDeviceBiometricName(method);

    // 1. Native Capacitor Bridge (exact iOS LAContext Face ID / Android BiometricPrompt)
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      try {
        const res = await DeviceBiometricsNative.authenticate({
          reason:
            method === 'faceid'
              ? 'Sign in to Commercial Bank of Ethiopia'
              : 'Authenticate to continue.',
        });

        const resolvedMethod: BiometricMethod =
          res?.method === 'faceid' ? 'faceid' : res?.method === 'fingerprint' ? 'fingerprint' : method;

        if (res?.verified) {
          return { status: 'success', method: resolvedMethod };
        }

        if (res?.unavailable) {
          return {
            status: 'unsupported',
            method: resolvedMethod,
            message: res.error || `${methodName} is not configured on this device.`,
          };
        }

        if (res?.cancelled) {
          return {
            status: 'cancelled',
            method: resolvedMethod,
            message: `${methodName} verification was cancelled.`,
          };
        }

        return {
          status: 'error',
          method: resolvedMethod,
          message: res?.error || `${methodName} verification failed.`,
        };
      } catch (nativeErr: unknown) {
        const errMsg = nativeErr instanceof Error ? nativeErr.message : String(nativeErr);
        // If native plugin isn't compiled into an older binary, fall through to WebAuthn if available
        if (!/not implemented|UNIMPLEMENTED/i.test(errMsg)) {
          return {
            status: 'error',
            method,
            message: errMsg || `${methodName} verification failed.`,
          };
        }
      }
    }

    // 2. Web / PWA: Real OS WebAuthn Platform Authenticator (Face ID on iPhone / Fingerprint on Android)
    if (typeof window === 'undefined' || !window.isSecureContext || !navigator.credentials || !window.PublicKeyCredential) {
      return {
        status: 'unsupported',
        method,
        message: `${methodName} requires a secure HTTPS browser with device biometrics enabled.`,
      };
    }

    const inIframe = window.self !== window.top;
    const platformSupported = await this.isPlatformAuthenticatorAvailable();
    if (!platformSupported) {
      const isRealMobile =
        PhoneSettingsService.isIPhoneDevice() ||
        (typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || ''));
      if (inIframe && isRealMobile) {
        return {
          status: 'iframe_blocked',
          method,
          message: `Open this app directly in ${method === 'faceid' ? 'Safari' : 'your browser'} to authenticate with device ${methodName}.`,
        };
      }
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
          if (errName === 'InvalidStateError' || errName === 'NotFoundError') {
            this.clearStoredCredential(user.id);
            await this.enrollPlatformCredential(user, method);
            return { status: 'success', method };
          }
          throw verifyErr;
        }
      } else {
        await this.enrollPlatformCredential(user, method);
        return { status: 'success', method };
      }
    } catch (err: unknown) {
      const elapsedMs = Date.now() - startedAt;
      const errName = err instanceof DOMException ? err.name : '';
      const errMsg = err instanceof Error ? err.message : String(err);
      const inIframe = window.self !== window.top;

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
          message: `${methodName} verification was cancelled or not recognized.`,
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

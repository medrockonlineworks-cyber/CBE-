import { Capacitor, registerPlugin } from '@capacitor/core';
import { UserProfile } from '../types';
import { PhoneSettingsService } from './phoneSettingsService';
import { AuthSessionService } from './authSessionService';

export type BiometricMethod = 'faceid' | 'fingerprint';

export type BiometricHardwareStatus =
  | 'available'
  | 'not_enrolled'
  | 'no_hardware'
  | 'lockout'
  | 'unavailable'
  | 'iframe_blocked';

export interface BiometricAvailability {
  available: boolean;
  enrolled: boolean;
  method: BiometricMethod;
  hardwareStatus: BiometricHardwareStatus;
  reason?: string;
}

export interface BiometricAttemptResult {
  status:
    | 'success'
    | 'cancelled'
    | 'iframe_blocked'
    | 'unsupported'
    | 'not_enrolled'
    | 'not_enabled'
    | 'lockout'
    | 'biometric_changed'
    | 'session_expired'
    | 'network_error'
    | 'error';
  method: BiometricMethod;
  message?: string;
}

interface NativeBiometricResponse {
  verified: boolean;
  enrolled?: boolean;
  token?: string;
  cancelled?: boolean;
  unavailable?: boolean;
  biometricChanged?: boolean;
  errorCode?: string;
  method?: string;
  error?: string;
}

interface NativeAvailabilityResponse {
  available: boolean;
  enrolled: boolean;
  hardwareStatus?: BiometricHardwareStatus;
  method?: string;
  reason?: string;
}

interface DeviceBiometricsPluginInterface {
  checkAvailability(): Promise<NativeAvailabilityResponse>;
  enrollAndStoreToken(options: {
    userId: string;
    token: string;
    reason: string;
  }): Promise<NativeBiometricResponse>;
  authenticateAndRetrieveToken(options: {
    userId: string;
    reason: string;
    allowDeviceCredential?: boolean;
  }): Promise<NativeBiometricResponse>;
  clearToken(options: { userId: string }): Promise<{ cleared: boolean }>;
  authenticate(options: {
    title?: string;
    reason: string;
    description?: string;
  }): Promise<NativeBiometricResponse>;
}

const DeviceBiometricsNative = registerPlugin<DeviceBiometricsPluginInterface>('DeviceBiometrics');

interface StoredWebAuthnCredential {
  credId: string;
  rpId: string;
  method: BiometricMethod;
  createdAt: string;
}

const CRED_STORAGE_PREFIX = 'cbe_device_biometric_cred_v1_';
const APP_SECURITY_PREFIX = 'cbe_app_security_vault_v1_';

export interface AppSecurityVaultRecord {
  pinHash?: string;
  passwordHash?: string;
  biometricEnrolled?: boolean;
  biometricMethod?: BiometricMethod;
  updatedAt: string;
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ (ch + i), 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(base64url: string): Uint8Array {
  const padded =
    base64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((base64url.length + 3) % 4);
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
      return null;
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

  public static async clearStoredCredential(userId: string): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`${CRED_STORAGE_PREFIX}${userId}`);
        const vault = this.getSecurityVault(userId);
        vault.biometricEnrolled = false;
        this.saveSecurityVault(userId, vault);
      } catch {
        // Non-blocking
      }
    }

    await AuthSessionService.clearSealedTokens(userId);

    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      try {
        await DeviceBiometricsNative.clearToken({ userId });
      } catch {
        // Ignore if native binary doesn't implement clearToken
      }
    }
  }

  private static getSecurityVault(userId: string): AppSecurityVaultRecord {
    if (typeof window === 'undefined') {
      return { updatedAt: new Date().toISOString() };
    }
    try {
      const raw = localStorage.getItem(`${APP_SECURITY_PREFIX}${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as AppSecurityVaultRecord;
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // Non-blocking
    }
    return { updatedAt: new Date().toISOString() };
  }

  private static saveSecurityVault(userId: string, vault: AppSecurityVaultRecord): void {
    if (typeof window === 'undefined') return;
    try {
      vault.updatedAt = new Date().toISOString();
      localStorage.setItem(`${APP_SECURITY_PREFIX}${userId}`, JSON.stringify(vault));
    } catch {
      // Non-blocking
    }
  }

  public static hasAppPin(userId: string): boolean {
    return Boolean(this.getSecurityVault(userId).pinHash);
  }

  public static async saveAppPin(userId: string, pin: string): Promise<void> {
    const cleanPin = pin.trim();
    const pinHash = await sha256Hex(`cbe_pin_v1:${userId}:${cleanPin}`);
    const vault = this.getSecurityVault(userId);
    vault.pinHash = pinHash;
    this.saveSecurityVault(userId, vault);
  }

  public static async verifyAppPin(userId: string, pin: string): Promise<boolean> {
    const vault = this.getSecurityVault(userId);
    if (!vault.pinHash) return false;
    const candidate = await sha256Hex(`cbe_pin_v1:${userId}:${pin.trim()}`);
    return candidate === vault.pinHash;
  }

  public static hasAppPassword(userId: string): boolean {
    return Boolean(this.getSecurityVault(userId).passwordHash);
  }

  public static async saveAppPassword(userId: string, password: string): Promise<void> {
    const passwordHash = await sha256Hex(`cbe_pwd_v1:${userId}:${password}`);
    const vault = this.getSecurityVault(userId);
    vault.passwordHash = passwordHash;
    this.saveSecurityVault(userId, vault);
  }

  public static async verifyAppPassword(userId: string, password: string): Promise<boolean> {
    const vault = this.getSecurityVault(userId);
    if (!vault.passwordHash) return false;
    const candidate = await sha256Hex(`cbe_pwd_v1:${userId}:${password}`);
    return candidate === vault.passwordHash;
  }

  public static markBiometricEnrolled(userId: string, method: BiometricMethod): void {
    const vault = this.getSecurityVault(userId);
    vault.biometricEnrolled = true;
    vault.biometricMethod = method;
    this.saveSecurityVault(userId, vault);
  }

  public static isBiometricEnrolledForUser(userId: string): boolean {
    const vault = this.getSecurityVault(userId);
    return Boolean(vault.biometricEnrolled);
  }

  public static getSecuritySummary(userId: string): {
    hasPin: boolean;
    hasPassword: boolean;
    biometricEnrolled: boolean;
    deviceMethod: BiometricMethod;
  } {
    const vault = this.getSecurityVault(userId);
    return {
      hasPin: Boolean(vault.pinHash),
      hasPassword: Boolean(vault.passwordHash),
      biometricEnrolled: Boolean(vault.biometricEnrolled),
      deviceMethod: this.getBiometricMethod(),
    };
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

  /**
   * Step-by-step hardware & enrollment check for both native Capacitor and Web/PWA.
   */
  public static async checkAvailability(): Promise<BiometricAvailability> {
    const defaultMethod = this.getBiometricMethod();
    if (typeof window === 'undefined') {
      return {
        available: false,
        enrolled: false,
        method: defaultMethod,
        hardwareStatus: 'unavailable',
        reason: 'Browser window unavailable.',
      };
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const res = await DeviceBiometricsNative.checkAvailability();
        const resolvedMethod: BiometricMethod =
          res.method === 'faceid' ? 'faceid' : res.method === 'touchid' ? 'faceid' : defaultMethod;
        return {
          available: Boolean(res.available),
          enrolled: Boolean(res.enrolled),
          method: resolvedMethod,
          hardwareStatus: res.hardwareStatus || (res.available ? 'available' : 'unavailable'),
          reason: res.reason,
        };
      } catch {
        // Fall through if native plugin isn't compiled
      }
    }

    if (!window.isSecureContext || !navigator.credentials || !window.PublicKeyCredential) {
      return {
        available: false,
        enrolled: false,
        method: defaultMethod,
        hardwareStatus: 'no_hardware',
        reason: 'Device biometrics require HTTPS or a native mobile build.',
      };
    }

    const inIframe = window.self !== window.top;
    const supported = await this.isPlatformAuthenticatorAvailable();
    if (!supported) {
      const isRealMobile =
        PhoneSettingsService.isIPhoneDevice() ||
        /Android/i.test(navigator.userAgent || '');
      if (inIframe && isRealMobile) {
        return {
          available: false,
          enrolled: false,
          method: defaultMethod,
          hardwareStatus: 'iframe_blocked',
          reason: `Open this app directly in ${defaultMethod === 'faceid' ? 'Safari' : 'Chrome'} to use device ${this.getDeviceBiometricName(defaultMethod)}.`,
        };
      }
      return {
        available: false,
        enrolled: false,
        method: defaultMethod,
        hardwareStatus: 'not_enrolled',
        reason: `${this.getDeviceBiometricName(defaultMethod)} is not configured on this device/browser.`,
      };
    }

    return {
      available: true,
      enrolled: true,
      method: defaultMethod,
      hardwareStatus: 'available',
    };
  }

  private static async enrollPlatformCredential(user: UserProfile, method: BiometricMethod): Promise<void> {
    const rpId = window.location.hostname;
    const userIdBytes = utf8ToBytes(user.id || 'cbe_user');
    const challenge = generateChallenge(32);

    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      challenge: challenge.buffer as ArrayBuffer,
      rp: {
        name: 'CBE Mobile Banking',
        id: rpId,
      },
      user: {
        id: userIdBytes.buffer as ArrayBuffer,
        name: `cbe-device-${user.id || 'user'}`,
        displayName: user.name || 'CBE Customer',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'discouraged',
        requireResidentKey: false,
      },
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

    const publicKeyOptions: PublicKeyCredentialRequestOptions = {
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
    };

    const assertion = (await navigator.credentials.get({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential | null;

    if (!assertion || !assertion.rawId) {
      throw new Error('Biometric verification did not return an assertion.');
    }
  }

  /**
   * Enrollment workflow (Section 4):
   * 1. Check biometric hardware availability and enrolled biometrics.
   * 2. Request a backend biometric-bound rotating refresh token (requires valid login session).
   * 3. Authenticate with native Face ID / Fingerprint & seal hardware DEK + encrypted refresh token.
   * 4. Save biometric-enabled preference only after hardware + backend succeed.
   */
  public static async enableBiometricLogin(user: UserProfile): Promise<BiometricAttemptResult> {
    const availability = await this.checkAvailability();
    const method = availability.method;
    const methodName = this.getDeviceBiometricName(method);

    if (!availability.available) {
      if (availability.hardwareStatus === 'iframe_blocked') {
        return {
          status: 'iframe_blocked',
          method,
          message: availability.reason,
        };
      }
      return {
        status: availability.hardwareStatus === 'not_enrolled' ? 'not_enrolled' : 'unsupported',
        method,
        message: availability.reason || `${methodName} is unavailable on this device.`,
      };
    }

    const backendEnroll = await AuthSessionService.requestBiometricEnrollmentToken(method);
    if (!backendEnroll.ok || !backendEnroll.refreshToken) {
      return {
        status: backendEnroll.errorCode === 'NETWORK_ERROR' ? 'network_error' : 'error',
        method,
        message: backendEnroll.message || 'Could not enable biometric session on server.',
      };
    }

    const reason =
      method === 'faceid'
        ? 'Sign in to CBE Mobile Banking'
        : 'Authenticate to continue.';

    // Native Capacitor iOS Keychain (.biometryCurrentSet) / Android Keystore (CryptoObject)
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      try {
        const hardwareDek = AuthSessionService.generateHardwareDekBase64();
        const nativeRes = await DeviceBiometricsNative.enrollAndStoreToken({
          userId: user.id,
          token: hardwareDek,
          reason,
        });

        const resolvedMethod: BiometricMethod =
          nativeRes.method === 'faceid' || nativeRes.method === 'touchid'
            ? 'faceid'
            : nativeRes.method === 'fingerprint'
              ? 'fingerprint'
              : method;

        if (!nativeRes.verified) {
          await AuthSessionService.disableBiometricsOnBackend();
          return this.mapNativeFailure(nativeRes, resolvedMethod);
        }

        await AuthSessionService.sealRefreshTokenWithKey(
          user.id,
          backendEnroll.refreshToken,
          hardwareDek
        );
        this.markBiometricEnrolled(user.id, resolvedMethod);
        return { status: 'success', method: resolvedMethod };
      } catch (err) {
        await AuthSessionService.disableBiometricsOnBackend();
        return {
          status: 'error',
          method,
          message: err instanceof Error ? err.message : `Failed to store ${methodName} credential.`,
        };
      }
    }

    // Web / PWA: Non-discoverable WebAuthn credential + IndexedDB non-extractable WebCrypto encryption
    try {
      await this.enrollPlatformCredential(user, method);
      await AuthSessionService.sealRefreshTokenWithKey(user.id, backendEnroll.refreshToken);
      this.markBiometricEnrolled(user.id, method);
      return { status: 'success', method };
    } catch (err) {
      await AuthSessionService.disableBiometricsOnBackend();
      return this.mapWebAuthnError(err, method, Date.now());
    }
  }

  /**
   * Disables biometric login on backend, wipes Keychain/Keystore & sealed refresh tokens.
   */
  public static async disableBiometricLogin(userId: string): Promise<void> {
    await AuthSessionService.disableBiometricsOnBackend();
    await this.clearStoredCredential(userId);
  }

  /**
   * Login workflow (Section 3):
   * 1. Prompts native OS Face ID / Fingerprint or WebAuthn verification.
   * 2. Unseals hardware-protected refresh token ONLY upon OS biometric success.
   * 3. Validates & rotates the refresh token with the backend (/api/auth/refresh) before unlocking.
   */
  public static async authenticateWithDevice(
    user: UserProfile,
    options?: { allowDeviceCredential?: boolean }
  ): Promise<BiometricAttemptResult> {
    const method = this.getBiometricMethod();
    const methodName = this.getDeviceBiometricName(method);

    // 1. Native Capacitor Path (iOS Keychain .biometryCurrentSet / Android Keystore CryptoObject)
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      try {
        const res = await DeviceBiometricsNative.authenticateAndRetrieveToken({
          userId: user.id,
          reason:
            method === 'faceid'
              ? 'Sign in to Commercial Bank of Ethiopia'
              : 'Authenticate to continue.',
          allowDeviceCredential: options?.allowDeviceCredential ?? false,
        });

        const resolvedMethod: BiometricMethod =
          res?.method === 'faceid' || res?.method === 'touchid'
            ? 'faceid'
            : res?.method === 'fingerprint'
              ? 'fingerprint'
              : method;

        if (!res?.verified) {
          if (res?.biometricChanged || res?.errorCode === 'BIOMETRIC_CHANGED') {
            await this.clearStoredCredential(user.id);
            return {
              status: 'biometric_changed',
              method: resolvedMethod,
              message:
                res.error ||
                'Your device biometrics changed. Please sign in with your PIN or password to re-enable biometric login.',
            };
          }
          if (res?.errorCode === 'NO_STORED_TOKEN') {
            return {
              status: 'not_enabled',
              method: resolvedMethod,
              message: `Biometric login is not yet activated on this device. Please sign in with your PIN or password to enable ${methodName}.`,
            };
          }
          return this.mapNativeFailure(res, resolvedMethod);
        }

        const hardwareDek = res.token;
        const sealedRefreshToken = hardwareDek
          ? await AuthSessionService.unsealRefreshTokenWithKey(user.id, hardwareDek)
          : null;

        if (!sealedRefreshToken) {
          await this.clearStoredCredential(user.id);
          return {
            status: 'session_expired',
            method: resolvedMethod,
            message: 'Saved biometric session could not be unlocked. Please sign in with your PIN or password.',
          };
        }

        // Validate & rotate refresh token with backend (never trust client biometric flag alone)
        const refreshResult = await AuthSessionService.refreshAndVerifyBiometricSession(sealedRefreshToken);
        if (!refreshResult.ok || !refreshResult.refreshToken) {
          if (
            refreshResult.errorCode === 'SESSION_REVOKED' ||
            refreshResult.errorCode === 'TOKEN_EXPIRED' ||
            refreshResult.errorCode === 'REUSE_DETECTED'
          ) {
            await this.clearStoredCredential(user.id);
            return {
              status: 'session_expired',
              method: resolvedMethod,
              message: refreshResult.message,
            };
          }
          return {
            status: refreshResult.errorCode === 'NETWORK_ERROR' ? 'network_error' : 'error',
            method: resolvedMethod,
            message: refreshResult.message || 'Unable to verify session with server.',
          };
        }

        // Re-seal rotated refresh token immediately using the unlocked hardware DEK
        await AuthSessionService.sealRefreshTokenWithKey(
          user.id,
          refreshResult.refreshToken,
          hardwareDek
        );
        this.markBiometricEnrolled(user.id, resolvedMethod);
        return { status: 'success', method: resolvedMethod };
      } catch (nativeErr: unknown) {
        const errMsg = nativeErr instanceof Error ? nativeErr.message : String(nativeErr);
        if (!/not implemented|UNIMPLEMENTED/i.test(errMsg)) {
          return {
            status: 'error',
            method,
            message: errMsg || `${methodName} verification failed.`,
          };
        }
      }
    }

    // 2. Web / PWA Path: OS WebAuthn + Non-Extractable WebCrypto Refresh Token + Backend Rotation
    const availability = await this.checkAvailability();
    if (!availability.available) {
      if (availability.hardwareStatus === 'iframe_blocked') {
        return {
          status: 'iframe_blocked',
          method,
          message: availability.reason,
        };
      }
      return {
        status: availability.hardwareStatus === 'not_enrolled' ? 'not_enrolled' : 'unsupported',
        method,
        message: availability.reason || `${methodName} is unavailable on this browser/device.`,
      };
    }

    const currentHost = window.location.hostname;
    const storedCred = this.getStoredCredential(user.id);
    const hasSealedToken = await AuthSessionService.hasSealedRefreshToken(user.id);

    if (!storedCred || storedCred.rpId !== currentHost || !hasSealedToken) {
      return {
        status: 'not_enabled',
        method,
        message: `Please sign in with your PIN or password first, then enable ${methodName} login.`,
      };
    }

    const startedAt = Date.now();
    try {
      await this.verifyPlatformCredential(storedCred.credId, currentHost);
    } catch (err) {
      const errName = err instanceof DOMException ? err.name : '';
      if (errName === 'InvalidStateError' || errName === 'NotFoundError') {
        await this.clearStoredCredential(user.id);
        return {
          status: 'biometric_changed',
          method,
          message: `Your device biometric credential is no longer valid. Please sign in with your PIN or password to re-enable ${methodName}.`,
        };
      }
      return this.mapWebAuthnError(err, method, startedAt);
    }

    const sealedRefreshToken = await AuthSessionService.unsealRefreshTokenWithKey(user.id);
    if (!sealedRefreshToken) {
      await this.clearStoredCredential(user.id);
      return {
        status: 'session_expired',
        method,
        message: 'Saved biometric session expired. Please sign in with your PIN or password.',
      };
    }

    const refreshResult = await AuthSessionService.refreshAndVerifyBiometricSession(sealedRefreshToken);
    if (!refreshResult.ok || !refreshResult.refreshToken) {
      if (
        refreshResult.errorCode === 'SESSION_REVOKED' ||
        refreshResult.errorCode === 'TOKEN_EXPIRED' ||
        refreshResult.errorCode === 'REUSE_DETECTED'
      ) {
        await this.clearStoredCredential(user.id);
        return {
          status: 'session_expired',
          method,
          message: refreshResult.message,
        };
      }
      return {
        status: refreshResult.errorCode === 'NETWORK_ERROR' ? 'network_error' : 'error',
        method,
        message: refreshResult.message || 'Unable to validate session with server.',
      };
    }

    await AuthSessionService.sealRefreshTokenWithKey(user.id, refreshResult.refreshToken);
    this.markBiometricEnrolled(user.id, method);
    return { status: 'success', method };
  }

  /**
   * Transfer / Payment identity confirmation workflow (Step 1 before PIN):
   * Prompts real Android Fingerprint or iOS Face ID directly without requiring
   * prior biometric login-token enrollment.
   */
  public static async confirmIdentityForTransfer(
    user: UserProfile,
    options?: { amountDisplay?: string; recipientName?: string }
  ): Promise<BiometricAttemptResult> {
    const method = this.getBiometricMethod();
    const methodName = this.getDeviceBiometricName(method);
    const reasonText =
      options?.amountDisplay && options?.recipientName
        ? `Confirm ${options.amountDisplay} payment to ${options.recipientName}`
        : method === 'faceid'
          ? "Confirm it's you with Face ID to continue to PIN"
          : "Confirm it's you with Fingerprint to continue to PIN";

    // 1. Native Capacitor Path (Android BiometricPrompt / iOS LAContext)
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      try {
        const res = await DeviceBiometricsNative.authenticate({
          title: "Confirm it's you",
          reason: reasonText,
          description:
            method === 'faceid'
              ? 'Use Face ID to verify your identity before entering your PIN'
              : 'Touch the fingerprint sensor to confirm payment',
        });

        const resolvedMethod: BiometricMethod =
          res?.method === 'faceid' || res?.method === 'touchid'
            ? 'faceid'
            : res?.method === 'fingerprint'
              ? 'fingerprint'
              : method;

        if (res?.verified) {
          return { status: 'success', method: resolvedMethod };
        }
        return this.mapNativeFailure(res, resolvedMethod);
      } catch (nativeErr: unknown) {
        const errMsg = nativeErr instanceof Error ? nativeErr.message : String(nativeErr);
        if (!/not implemented|UNIMPLEMENTED/i.test(errMsg)) {
          return {
            status: 'error',
            method,
            message: errMsg || `${methodName} verification failed.`,
          };
        }
      }
    }

    // 2. Web / PWA Path: Invoke Real Platform WebAuthn (iOS Safari Face ID / Android Chrome Fingerprint)
    // immediately within the user click gesture (no extra async await beforehand so iOS Safari preserves activation).
    if (
      typeof window === 'undefined' ||
      !window.isSecureContext ||
      !navigator.credentials ||
      typeof window.PublicKeyCredential === 'undefined'
    ) {
      return {
        status: 'unsupported',
        method,
        message: `${methodName} requires HTTPS or a native mobile build.`,
      };
    }

    const currentHost = window.location.hostname;
    const storedCred = this.getStoredCredential(user.id);
    const startedAt = Date.now();

    if (storedCred && storedCred.rpId === currentHost) {
      try {
        await this.verifyPlatformCredential(storedCred.credId, currentHost);
        return { status: 'success', method };
      } catch (err) {
        const errName = err instanceof DOMException ? err.name : '';
        // If previously saved credential was invalidated/cleared on device, re-create with live UV check
        if (errName === 'InvalidStateError' || errName === 'NotFoundError') {
          try {
            await this.enrollPlatformCredential(user, method);
            return { status: 'success', method };
          } catch (reEnrollErr) {
            return this.mapWebAuthnError(reEnrollErr, method, startedAt);
          }
        }
        return this.mapWebAuthnError(err, method, startedAt);
      }
    }

    // First-time platform biometric verification on this origin: creates a hardware-bound platform credential
    // with userVerification: 'required', which natively triggers iOS Face ID / Android Fingerprint.
    try {
      await this.enrollPlatformCredential(user, method);
      return { status: 'success', method };
    } catch (err) {
      return this.mapWebAuthnError(err, method, startedAt);
    }
  }

  private static mapNativeFailure(
    res: NativeBiometricResponse,
    method: BiometricMethod
  ): BiometricAttemptResult {
    const code = res.errorCode || '';
    const methodName = this.getDeviceBiometricName(method);

    if (res.cancelled || code === 'CANCELLED') {
      return {
        status: 'cancelled',
        method,
        message: res.error || `${methodName} verification was cancelled.`,
      };
    }
    if (code === 'LOCKOUT') {
      return {
        status: 'lockout',
        method,
        message:
          res.error ||
          `Too many failed attempts. ${methodName} is locked—please use your PIN or password.`,
      };
    }
    if (code === 'NOT_ENROLLED') {
      return {
        status: 'not_enrolled',
        method,
        message: res.error || `No ${methodName} is enrolled on this device.`,
      };
    }
    if (res.unavailable || code === 'NO_HARDWARE') {
      return {
        status: 'unsupported',
        method,
        message: res.error || `${methodName} hardware is not available on this device.`,
      };
    }
    return {
      status: 'error',
      method,
      message: res.error || `${methodName} verification failed. Please retry or use your PIN.`,
    };
  }

  private static mapWebAuthnError(
    err: unknown,
    method: BiometricMethod,
    startedAt: number
  ): BiometricAttemptResult {
    const elapsedMs = Date.now() - startedAt;
    const errName = err instanceof DOMException ? err.name : '';
    const errMsg = err instanceof Error ? err.message : String(err);
    const methodName = this.getDeviceBiometricName(method);
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;

    if (
      inIframe &&
      (errName === 'SecurityError' ||
        /feature is not enabled|permissions policy|not allowed in this document|publickey-credentials/i.test(
          errMsg
        ) ||
        (errName === 'NotAllowedError' && elapsedMs < 250))
    ) {
      return {
        status: 'iframe_blocked',
        method,
        message: `Open this app directly in ${method === 'faceid' ? 'Safari' : 'Chrome'} to authenticate with device ${methodName}.`,
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
      message: errMsg || `${methodName} verification failed. Please use your PIN or password.`,
    };
  }
}

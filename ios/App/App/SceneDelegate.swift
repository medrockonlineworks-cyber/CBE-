import UIKit
import Capacitor
import LocalAuthentication
import Security

@objc(DeviceBiometricsPlugin)
public class DeviceBiometricsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DeviceBiometricsPlugin"
    public let jsName = "DeviceBiometrics"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkAvailability", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "enrollAndStoreToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticateAndRetrieveToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]

    private let keychainService = "et.cbe.tanadigitalbank.biometric.refresh"
    private let enrolledMarkerPrefix = "cbe_ios_kc_enrolled_"
    private var activeContext: LAContext?

    private func sanitizeUserId(_ raw: String?) -> String {
        let trimmed = (raw ?? "default_user").trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? "default_user" : trimmed
    }

    private func removeKeychainToken(for userId: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: userId
        ]
        SecItemDelete(query as CFDictionary)
        UserDefaults.standard.removeObject(forKey: "\(enrolledMarkerPrefix)\(userId)")
    }

    private func saveKeychainToken(_ token: String, for userId: String) -> OSStatus {
        removeKeychainToken(for: userId)
        guard let tokenData = token.data(using: .utf8) else {
            return errSecParam
        }

        var accessError: Unmanaged<CFError>?
        guard let accessControl = SecAccessControlCreateWithFlags(
            kCFAllocatorDefault,
            kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            .biometryCurrentSet,
            &accessError
        ) else {
            return errSecAllocate
        }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: userId,
            kSecAttrAccessControl as String: accessControl,
            kSecValueData as String: tokenData
        ]

        let status = SecItemAdd(query as CFDictionary, nil)
        if status == errSecSuccess {
            UserDefaults.standard.set(true, forKey: "\(enrolledMarkerPrefix)\(userId)")
        }
        return status
    }

    private func loadKeychainToken(for userId: String, context: LAContext) -> (token: String?, status: OSStatus) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: userId,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
            kSecUseAuthenticationContext as String: context
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else {
            return (nil, status)
        }
        return (token, errSecSuccess)
    }

    private func currentMethodName(for context: LAContext) -> String {
        switch context.biometryType {
        case .touchID:
            return "touchid"
        case .faceID:
            return "faceid"
        default:
            if #available(iOS 17.0, *), context.biometryType == .opticID {
                return "faceid"
            }
            return "faceid"
        }
    }

    @objc func checkAvailability(_ call: CAPPluginCall) {
        let context = LAContext()
        var authError: NSError?
        let canBio = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &authError)
        let method = currentMethodName(for: context)

        if canBio {
            call.resolve([
                "available": true,
                "enrolled": true,
                "hardwareStatus": "available",
                "method": method
            ])
            return
        }

        let laCode = (authError as? LAError)?.code
        if laCode == .biometryNotEnrolled {
            call.resolve([
                "available": false,
                "enrolled": false,
                "hardwareStatus": "not_enrolled",
                "method": method,
                "reason": "Face ID / Touch ID is not enrolled in your iPhone settings."
            ])
        } else if laCode == .biometryLockout {
            call.resolve([
                "available": false,
                "enrolled": true,
                "hardwareStatus": "lockout",
                "method": method,
                "reason": "Face ID / Touch ID is temporarily locked due to too many failed attempts."
            ])
        } else if laCode == .biometryNotAvailable {
            call.resolve([
                "available": false,
                "enrolled": false,
                "hardwareStatus": "no_hardware",
                "method": "none",
                "reason": "Biometric hardware is unavailable on this device."
            ])
        } else {
            call.resolve([
                "available": false,
                "enrolled": false,
                "hardwareStatus": "unavailable",
                "method": method,
                "reason": authError?.localizedDescription ?? "Biometric authentication is unavailable."
            ])
        }
    }

    @objc func clearToken(_ call: CAPPluginCall) {
        let userId = sanitizeUserId(call.getString("userId"))
        removeKeychainToken(for: userId)
        call.resolve(["cleared": true])
    }

    @objc func enrollAndStoreToken(_ call: CAPPluginCall) {
        let token = call.getString("token") ?? ""
        let userId = sanitizeUserId(call.getString("userId"))
        let reason = call.getString("reason") ?? "Authenticate to continue."

        guard !token.isEmpty else {
            call.resolve([
                "verified": false,
                "errorCode": "INVALID_REQUEST",
                "error": "Missing refresh credential to protect."
            ])
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.activeContext?.invalidate()

            let context = LAContext()
            context.localizedFallbackTitle = ""
            context.localizedCancelTitle = "Cancel"
            self.activeContext = context

            var authError: NSError?
            let method = self.currentMethodName(for: context)

            guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &authError) else {
                self.activeContext = nil
                self.resolveLAError(call: call, error: authError, method: method)
                return
            }

            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { [weak self] success, error in
                DispatchQueue.main.async {
                    guard let self = self else { return }
                    if self.activeContext === context {
                        self.activeContext = nil
                    }

                    if success {
                        let status = self.saveKeychainToken(token, for: userId)
                        if status == errSecSuccess {
                            call.resolve([
                                "verified": true,
                                "enrolled": true,
                                "method": method
                            ])
                        } else {
                            call.resolve([
                                "verified": false,
                                "errorCode": "KEYCHAIN_ERROR",
                                "method": method,
                                "error": "Could not store credential securely in iOS Keychain."
                            ])
                        }
                    } else {
                        self.resolveLAError(call: call, error: error, method: method)
                    }
                }
            }
        }
    }

    @objc func authenticateAndRetrieveToken(_ call: CAPPluginCall) {
        let userId = sanitizeUserId(call.getString("userId"))
        let reason = call.getString("reason") ?? "Authenticate to continue."
        let allowDeviceCredential = call.getBool("allowDeviceCredential") ?? false

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.activeContext?.invalidate()

            let wasEnrolled = UserDefaults.standard.bool(forKey: "\(self.enrolledMarkerPrefix)\(userId)")
            if !wasEnrolled {
                call.resolve([
                    "verified": false,
                    "errorCode": "NO_STORED_TOKEN",
                    "method": "faceid",
                    "error": "Biometric credential is not enrolled on this iPhone. Please sign in with your PIN or password."
                ])
                return
            }

            let context = LAContext()
            // Match native Face ID sheet with "Try Face ID Again" and "Cancel" only
            context.localizedFallbackTitle = allowDeviceCredential ? "Use Passcode" : ""
            context.localizedCancelTitle = "Cancel"
            self.activeContext = context

            var authError: NSError?
            let method = self.currentMethodName(for: context)
            let policy: LAPolicy = allowDeviceCredential ? .deviceOwnerAuthentication : .deviceOwnerAuthenticationWithBiometrics

            guard context.canEvaluatePolicy(policy, error: &authError) else {
                self.activeContext = nil
                self.resolveLAError(call: call, error: authError, method: method)
                return
            }

            context.evaluatePolicy(policy, localizedReason: reason) { [weak self] success, error in
                DispatchQueue.main.async {
                    guard let self = self else { return }
                    if self.activeContext === context {
                        self.activeContext = nil
                    }

                    if success {
                        let fetched = self.loadKeychainToken(for: userId, context: context)
                        if let token = fetched.token, !token.isEmpty {
                            call.resolve([
                                "verified": true,
                                "token": token,
                                "method": method
                            ])
                        } else {
                            // .biometryCurrentSet invalidated the Keychain item because device Face ID / Touch ID enrollments changed
                            self.removeKeychainToken(for: userId)
                            call.resolve([
                                "verified": false,
                                "biometricChanged": true,
                                "errorCode": "BIOMETRIC_CHANGED",
                                "method": method,
                                "error": "Your iPhone's enrolled Face ID or Touch ID changed. Please sign in with your PIN or password to re-enable biometric login."
                            ])
                        }
                    } else {
                        self.resolveLAError(call: call, error: error, method: method)
                    }
                }
            }
        }
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "Sign in to Commercial Bank of Ethiopia"

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.activeContext?.invalidate()

            let context = LAContext()
            // Match native Face ID sheet with "Try Face ID Again" and "Cancel" only
            context.localizedFallbackTitle = ""
            context.localizedCancelTitle = "Cancel"
            self.activeContext = context

            var authError: NSError?
            let method = self.currentMethodName(for: context)

            guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &authError) else {
                if context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &authError) {
                    context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { [weak self] success, error in
                        DispatchQueue.main.async {
                            if self?.activeContext === context {
                                self?.activeContext = nil
                            }
                            if success {
                                call.resolve(["verified": true, "method": method])
                            } else {
                                self?.resolveLAError(call: call, error: error, method: method)
                            }
                        }
                    }
                    return
                }

                self.activeContext = nil
                self.resolveLAError(call: call, error: authError, method: method)
                return
            }

            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { [weak self] success, error in
                DispatchQueue.main.async {
                    if self?.activeContext === context {
                        self?.activeContext = nil
                    }
                    if success {
                        call.resolve(["verified": true, "method": method])
                    } else {
                        self?.resolveLAError(call: call, error: error, method: method)
                    }
                }
            }
        }
    }

    private func resolveLAError(call: CAPPluginCall, error: Error?, method: String) {
        let laCode = (error as? LAError)?.code
        let cancelled = laCode == .userCancel || laCode == .systemCancel || laCode == .appCancel || laCode == .userFallback
        let lockout = laCode == .biometryLockout
        let notEnrolled = laCode == .biometryNotEnrolled
        let noHardware = laCode == .biometryNotAvailable || laCode == .passcodeNotSet

        var errorCode = "AUTH_FAILED"
        var message = error?.localizedDescription ?? "Face ID verification failed."

        if cancelled {
            errorCode = "CANCELLED"
            message = "Verification was cancelled."
        } else if lockout {
            errorCode = "LOCKOUT"
            message = "Too many failed attempts. Biometrics locked—please use your PIN or password."
        } else if notEnrolled {
            errorCode = "NOT_ENROLLED"
            message = "No Face ID or Touch ID is enrolled on this iPhone."
        } else if noHardware {
            errorCode = "NO_HARDWARE"
            message = "Biometric hardware is unavailable on this device."
        }

        call.resolve([
            "verified": false,
            "cancelled": cancelled,
            "unavailable": notEnrolled || noHardware,
            "errorCode": errorCode,
            "method": method,
            "error": message
        ])
    }
}

class CbeBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(DeviceBiometricsPlugin())
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CbeBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

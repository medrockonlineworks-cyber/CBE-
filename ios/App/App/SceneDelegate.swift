import UIKit
import Capacitor
import LocalAuthentication

@objc(DeviceBiometricsPlugin)
public class DeviceBiometricsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DeviceBiometricsPlugin"
    public let jsName = "DeviceBiometrics"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]

    private var activeContext: LAContext?

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
            let method = context.biometryType == .touchID ? "touchid" : "faceid"

            guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &authError) else {
                // Fall back to device owner authentication (biometrics + passcode) if biometry is locked out
                if context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &authError) {
                    context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { [weak self] success, error in
                        DispatchQueue.main.async {
                            if self?.activeContext === context {
                                self?.activeContext = nil
                            }
                            if success {
                                call.resolve(["verified": true, "method": "faceid"])
                            } else {
                                let laCode = (error as? LAError)?.code
                                let cancelled = laCode == .userCancel || laCode == .systemCancel || laCode == .appCancel
                                call.resolve([
                                    "verified": false,
                                    "cancelled": cancelled,
                                    "method": "faceid",
                                    "error": error?.localizedDescription ?? "Face ID verification failed."
                                ])
                            }
                        }
                    }
                    return
                }

                self.activeContext = nil
                call.resolve([
                    "verified": false,
                    "unavailable": true,
                    "method": "faceid",
                    "error": authError?.localizedDescription ?? "Face ID is not available on this device."
                ])
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
                        let laCode = (error as? LAError)?.code
                        let cancelled = laCode == .userCancel || laCode == .systemCancel || laCode == .appCancel || laCode == .userFallback
                        call.resolve([
                            "verified": false,
                            "cancelled": cancelled,
                            "method": method,
                            "error": error?.localizedDescription ?? "Face ID verification was not recognized."
                        ])
                    }
                }
            }
        }
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

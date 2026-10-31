package et.cbe.tanadigitalbank;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    public static final int CBE_PURPLE = Color.parseColor("#70189F");
    public static final int PURE_WHITE = Color.parseColor("#FFFFFF");

    private void applySystemBarsDualColor() {
        try {
            Window window = getWindow();
            if (window == null) return;

            // 1. Android 5.0+ (Lollipop): Enable system bar background drawing
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
                window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
                
                // Top status bar: CBE Purple (#70189F)
                window.setStatusBarColor(CBE_PURPLE);
                // Bottom navigation bar: Pure White (#FFFFFF)
                window.setNavigationBarColor(PURE_WHITE);
            }

            // 2. Android 10+ (Q): Explicitly disable automatic dark contrast scrim on white navigation bars
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.setNavigationBarContrastEnforced(false);
                window.setStatusBarContrastEnforced(false);
            }

            // 3. Android 11+ (R): Modern WindowInsetsController
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowInsetsController controller = window.getInsetsController();
                if (controller != null) {
                    // Dark soft-key buttons (≡, ○, ↩) on white navigation bar
                    controller.setSystemBarsAppearance(
                        WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                        WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                    );
                    // Light (white) text and icons on purple status bar
                    controller.setSystemBarsAppearance(
                        0,
                        WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                    );
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Android 8.0 - 10: Legacy system UI visibility flags
                View decorView = window.getDecorView();
                if (decorView != null) {
                    int flags = decorView.getSystemUiVisibility();
                    // Dark navigation buttons on white background
                    flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    // White status bar icons on purple background
                    flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                    decorView.setSystemUiVisibility(flags);
                }
            }
        } catch (Exception e) {
            // Guard against device-specific vendor quirks
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applySystemBarsDualColor();
    }

    @Override
    public void onResume() {
        super.onResume();
        applySystemBarsDualColor();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applySystemBarsDualColor();
        }
    }
}

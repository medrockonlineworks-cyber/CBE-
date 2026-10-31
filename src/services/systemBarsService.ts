import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@hugotomazi/capacitor-navigation-bar';

/**
 * SystemBarsService
 * Manages dual-color Android system UI:
 * 1. Top Status Bar: CBE Purple (#70189F) with White status text/icons
 * 2. Bottom Navigation Bar: Pure White (#FFFFFF) with Dark/Black navigation buttons
 */
export class SystemBarsService {
  private static isConfigured = false;
  public static readonly STATUS_BAR_COLOR = '#70189F';
  public static readonly NAVIGATION_BAR_COLOR = '#FFFFFF';

  public static async applyDualSystemBars(): Promise<void> {
    // 1. Web / PWA Meta Tags Configuration
    try {
      this.applyWebSystemBars();
    } catch (e) {
      console.warn('[SystemBars] Failed to configure web system bars:', e);
    }

    // 2. Native Capacitor Android / iOS Configuration
    if (Capacitor.isNativePlatform()) {
      try {
        // Status Bar: Purple background + Dark style (Style.Dark renders white icons/text)
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: this.STATUS_BAR_COLOR });
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch (err) {
        console.warn('[SystemBars] Native StatusBar config:', err);
      }

      try {
        // Navigation Bar: Pure White (#FFFFFF) + Dark Buttons (darkButtons: true)
        await NavigationBar.setColor({
          color: this.NAVIGATION_BAR_COLOR,
          darkButtons: true,
        });
      } catch (err) {
        console.warn('[SystemBars] Native NavigationBar config:', err);
      }
    }
  }

  public static applyWebSystemBars(): void {
    if (typeof document === 'undefined') return;

    // A. Separate Status Bar Meta Tags (Purple #70189F)
    const statusBarTags = [
      { name: 'theme-color', content: this.STATUS_BAR_COLOR },
      { name: 'msapplication-navbutton-color', content: this.STATUS_BAR_COLOR },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
    ];

    statusBarTags.forEach(({ name, content }) => {
      let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement('meta');
        tag.name = name;
        document.head.appendChild(tag);
      }
      tag.content = content;
    });

    // B. Separate Navigation Bar Meta Tags (Pure White #FFFFFF)
    const navBarTags = [
      { name: 'navigation-bar-color', content: this.NAVIGATION_BAR_COLOR },
      { name: 'color-scheme', content: 'light' }
    ];

    navBarTags.forEach(({ name, content }) => {
      let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement('meta');
        tag.name = name;
        document.head.appendChild(tag);
      }
      tag.content = content;
    });

    // C. Ensure root and body background are pure white so bottom safe-area insets never render purple
    document.documentElement.style.backgroundColor = this.NAVIGATION_BAR_COLOR;
    document.body.style.backgroundColor = this.NAVIGATION_BAR_COLOR;
  }

  public static initAutoSync(): () => void {
    if (this.isConfigured) return () => {};
    this.isConfigured = true;

    // Apply immediately
    this.applyDualSystemBars();

    // Reapply on visibility change and window focus (e.g., app resumed from background)
    const handleReapply = () => {
      if (document.visibilityState === 'visible') {
        this.applyDualSystemBars();
      }
    };

    window.addEventListener('visibilitychange', handleReapply);
    window.addEventListener('focus', handleReapply);

    return () => {
      window.removeEventListener('visibilitychange', handleReapply);
      window.removeEventListener('focus', handleReapply);
    };
  }
}

export default SystemBarsService;

/**
 * System Bars Service
 * Controls status bar and navigation bar styling across web, PWA, and Capacitor.
 * - Login / Auth view: White status bar and White navigation bar.
 * - Main App views: Purple status bar (#70189F) and White navigation bar.
 */
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

export class SystemBarsService {
  private static currentMode: 'white' | 'dual' = 'white';

  static applyAllWhiteBars(): void {
    this.currentMode = 'white';
    if (typeof document === 'undefined') return;

    const barColor = '#ffffff';

    // Top status bar meta tags
    const themeMetas = document.querySelectorAll(
      'meta[name="theme-color"], meta[name="msapplication-navbutton-color"]'
    );
    themeMetas.forEach(meta => meta.setAttribute('content', barColor));

    // Bottom navigation bar meta tags
    const navMetas = document.querySelectorAll('meta[name="navigation-bar-color"]');
    navMetas.forEach(meta => meta.setAttribute('content', barColor));

    // iOS Safari apple-mobile-web-app-status-bar-style: default = black text on white status bar
    const appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleStatusBar) {
      appleStatusBar.setAttribute('content', 'default');
    }

    // Document root backgrounds
    if (document.documentElement) {
      document.documentElement.style.backgroundColor = barColor;
    }
    if (document.body) {
      document.body.style.backgroundColor = barColor;
    }

    // Capacitor Native Bridge Support (Android & iOS)
    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.setBackgroundColor({ color: barColor }).catch(() => {});
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      } catch (err) {
        console.warn('[SystemBars] Capacitor white status bar note:', err);
      }
    }
  }

  static applyDualSystemBars(): void {
    this.currentMode = 'dual';
    if (typeof document === 'undefined') return;

    const statusBarColor = '#70189F';
    const navBarColor = '#ffffff';

    // Top status bar
    const themeMetas = document.querySelectorAll(
      'meta[name="theme-color"], meta[name="msapplication-navbutton-color"]'
    );
    themeMetas.forEach(meta => meta.setAttribute('content', statusBarColor));

    // Bottom navigation bar
    const navMetas = document.querySelectorAll('meta[name="navigation-bar-color"]');
    navMetas.forEach(meta => meta.setAttribute('content', navBarColor));

    // iOS Safari apple-mobile-web-app-status-bar-style: black-translucent = white text over purple content
    const appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleStatusBar) {
      appleStatusBar.setAttribute('content', 'black-translucent');
    }

    // Document root backgrounds: CBE purple #70189F so iOS notch/status bar is purple
    if (document.documentElement) {
      document.documentElement.style.backgroundColor = statusBarColor;
    }
    if (document.body) {
      document.body.style.backgroundColor = statusBarColor;
    }

    // Capacitor Native Bridge Support (Android & iOS)
    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.setBackgroundColor({ color: statusBarColor }).catch(() => {});
        StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      } catch (err) {
        console.warn('[SystemBars] Capacitor dual status bar note:', err);
      }
    }
  }

  static syncCurrent(): void {
    if (this.currentMode === 'white') {
      this.applyAllWhiteBars();
    } else {
      this.applyDualSystemBars();
    }
  }

  static initAutoSync(): void {
    this.syncCurrent();
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.syncCurrent();
        }
      });
      window.addEventListener('focus', () => {
        this.syncCurrent();
      });
    }
  }
}

export default SystemBarsService;

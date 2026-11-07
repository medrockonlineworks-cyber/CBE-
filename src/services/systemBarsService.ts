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
        StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
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
        StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
        StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      } catch (err) {
        console.warn('[SystemBars] Capacitor dual status bar note:', err);
      }
    }
  }

  static applyModalOpenBars(): void {
    if (typeof document === 'undefined') return;
    const darkenedPurple = '#380c50';
    const navBarColor = '#ffffff';

    const themeMetas = document.querySelectorAll(
      'meta[name="theme-color"], meta[name="msapplication-navbutton-color"]'
    );
    themeMetas.forEach(meta => meta.setAttribute('content', darkenedPurple));

    const navMetas = document.querySelectorAll('meta[name="navigation-bar-color"]');
    navMetas.forEach(meta => meta.setAttribute('content', navBarColor));

    const appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleStatusBar) {
      appleStatusBar.setAttribute('content', 'black-translucent');
    }

    if (document.documentElement) {
      document.documentElement.style.backgroundColor = darkenedPurple;
    }
    if (document.body) {
      document.body.style.backgroundColor = darkenedPurple;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
        StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      } catch (err) {}
    }
  }

  static syncForView(view: string): void {
    if (typeof document === 'undefined') return;

    let statusBarColor = '#70189F';
    let navBarColor = '#ffffff';
    let isDarkStyle = false; // false = dark text/icons on light bar; true = light text/icons on dark/colored bar

    switch (view) {
      case 'auth':
      case 'receipt':
        statusBarColor = '#ffffff';
        navBarColor = '#ffffff';
        isDarkStyle = false;
        break;
      case 'truecaller':
        statusBarColor = '#121316';
        navBarColor = '#121316';
        isDarkStyle = true;
        break;
      case 'sms':
        statusBarColor = '#121212';
        navBarColor = '#121212';
        isDarkStyle = true;
        break;
      case 'phone':
        statusBarColor = '#000000';
        navBarColor = '#000000';
        isDarkStyle = true;
        break;
      case 'dashen':
        statusBarColor = '#040b18';
        navBarColor = '#040b18';
        isDarkStyle = true;
        break;
      case 'telebirr':
        statusBarColor = '#005fa8';
        navBarColor = '#ffffff';
        isDarkStyle = true;
        break;
      case 'telegram':
      case 'admin':
        statusBarColor = '#0f172a';
        navBarColor = '#0f172a';
        isDarkStyle = true;
        break;
      case 'main':
      default:
        statusBarColor = '#70189F';
        navBarColor = '#ffffff';
        isDarkStyle = true;
        break;
    }

    // Top status bar meta tags
    const themeMetas = document.querySelectorAll(
      'meta[name="theme-color"], meta[name="msapplication-navbutton-color"]'
    );
    themeMetas.forEach(meta => meta.setAttribute('content', statusBarColor));

    // Bottom navigation bar meta tags
    const navMetas = document.querySelectorAll('meta[name="navigation-bar-color"]');
    navMetas.forEach(meta => meta.setAttribute('content', navBarColor));

    // iOS Safari apple-mobile-web-app-status-bar-style:
    // black-translucent shows white status bar icons/text over colored or dark background
    // default shows dark icons over light background
    const appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleStatusBar) {
      appleStatusBar.setAttribute('content', isDarkStyle ? 'black-translucent' : 'default');
    }

    // Document root backgrounds
    if (document.documentElement) {
      document.documentElement.style.backgroundColor = statusBarColor;
    }
    if (document.body) {
      document.body.style.backgroundColor = statusBarColor;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
        StatusBar.setStyle({ style: isDarkStyle ? Style.Light : Style.Dark }).catch(() => {});
      } catch (err) {
        console.warn('[SystemBars] Capacitor status bar error:', err);
      }
    }
  }

  static restoreFromModal(): void {
    this.syncCurrent();
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

/**
 * System Bars Service
 * Controls status bar and navigation bar styling across web, PWA, and Capacitor.
 * Ensures the device status bar and navigation bar strictly follow the active application theme.
 */
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { PhoneSettingsService } from './phoneSettingsService';

export interface SystemBarsConfig {
  statusBarColor: string;
  navBarColor: string;
  isDarkStyle: boolean; // true = white text/icons on dark or colored bar; false = dark text/icons on light bar
}

export class SystemBarsService {
  private static currentConfig: SystemBarsConfig = {
    statusBarColor: '#ffffff',
    navBarColor: '#ffffff',
    isDarkStyle: false,
  };
  private static activeViewName: string = 'auth';

  public static getCurrentConfig(): SystemBarsConfig {
    return { ...this.currentConfig };
  }

  public static applyBars(config: SystemBarsConfig): void {
    this.currentConfig = { ...config };
    if (typeof document === 'undefined') return;

    const { statusBarColor, navBarColor, isDarkStyle } = config;

    // 1. Bottom navigation bar meta tags:
    // msapplication-navbutton-color & navigation-bar-color explicitly command the phone navigation bar color
    const navMetas = document.querySelectorAll(
      'meta[name="navigation-bar-color"], meta[name="msapplication-navbutton-color"]'
    );
    navMetas.forEach(meta => meta.setAttribute('content', navBarColor));
    if (!document.querySelector('meta[name="navigation-bar-color"]')) {
      const meta = document.createElement('meta');
      meta.name = 'navigation-bar-color';
      meta.content = navBarColor;
      document.head.appendChild(meta);
    }
    if (!document.querySelector('meta[name="msapplication-navbutton-color"]')) {
      const meta = document.createElement('meta');
      meta.name = 'msapplication-navbutton-color';
      meta.content = navBarColor;
      document.head.appendChild(meta);
    }

    // 2. Top status bar / Header meta tag:
    // ALWAYS follows statusBarColor (#70189F for CBE) so the top header is authentic CBE purple!
    const themeMetas = document.querySelectorAll('meta[name="theme-color"]');
    themeMetas.forEach(meta => {
      meta.setAttribute('content', statusBarColor);
      meta.removeAttribute('media');
    });

    if (!document.querySelector('meta[name="theme-color"]')) {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = statusBarColor;
      document.head.appendChild(meta);
    }

    // 3. iOS Safari apple-mobile-web-app-status-bar-style:
    // black-translucent = white status bar text/icons over dark or colored background
    // default = dark text/icons over light background
    const appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleStatusBar) {
      appleStatusBar.setAttribute('content', isDarkStyle ? 'black-translucent' : 'default');
    }

    // 4. Document root, body, and canvas backgrounds:
    // Ensures the app itself extends with authentic CBE purple seamlessly into the edge of the device with no separate status bar layer
    if (document.documentElement) {
      document.documentElement.style.backgroundColor = statusBarColor;
    }
    if (document.body) {
      document.body.style.backgroundColor = statusBarColor;
    }

    const mainCanvas = document.getElementById('app-main-canvas');
    if (mainCanvas) {
      mainCanvas.style.backgroundColor = statusBarColor;
    }

    // 5. Capacitor Native Bridge Support (Android & iOS)
    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
        StatusBar.setStyle({ style: isDarkStyle ? Style.Light : Style.Dark }).catch(() => {});
        StatusBar.setBackgroundColor({ color: statusBarColor }).catch(() => {});
      } catch (err) {
        // Safe non-blocking
      }
    }
  }

  public static applyAllWhiteBars(): void {
    this.applyBars({
      statusBarColor: '#ffffff',
      navBarColor: '#ffffff',
      isDarkStyle: false,
    });
  }

  public static applyDualSystemBars(): void {
    this.applyBars({
      statusBarColor: '#70189F',
      navBarColor: '#ffffff',
      isDarkStyle: true,
    });
  }

  public static applyModalOpenBars(): void {
    this.applyBars({
      statusBarColor: '#2d0a40', // Exact #70189F blended with bg-black/60 (rgb(45, 10, 64)) so status bar matches the dimmed app header seamlessly
      navBarColor: '#ffffff',
      isDarkStyle: true,
    });
  }

  public static syncForView(
    view: string,
    options?: {
      isIPhone?: boolean;
      theme?: 'dark' | 'light';
      subView?: string;
    }
  ): void {
    this.activeViewName = view;
    const isIPhoneMode = options?.isIPhone ?? PhoneSettingsService.isIPhoneMode();

    let statusBarColor = '#70189F';
    let navBarColor = '#ffffff';
    let isDarkStyle = true;

    switch (view) {
      case 'auth':
        statusBarColor = '#ffffff';
        navBarColor = '#ffffff';
        isDarkStyle = false;
        break;

      case 'receipt':
        statusBarColor = '#7A1FA2';
        navBarColor = '#ffffff';
        isDarkStyle = true;
        break;

      case 'sms': {
        const savedTheme = options?.theme || (() => {
          try {
            return (localStorage.getItem('sms_theme') as 'dark' | 'light') || 'dark';
          } catch {
            return 'dark';
          }
        })();

        if (isIPhoneMode) {
          // iPhone SMS (Apple Messages): pitch black
          statusBarColor = '#000000';
          navBarColor = '#000000';
          isDarkStyle = true;
        } else if (savedTheme === 'light') {
          // Android Google Messages Light mode
          statusBarColor = '#ffffff';
          navBarColor = '#ffffff';
          isDarkStyle = false;
        } else {
          // Android Google Messages Dark mode
          statusBarColor = '#121212';
          navBarColor = '#121212';
          isDarkStyle = true;
        }
        break;
      }

      case 'truecaller': {
        const subView = options?.subView;
        const savedBase = (() => {
          try {
            return localStorage.getItem('tc_theme_base') || 'dark';
          } catch {
            return 'dark';
          }
        })();

        if (savedBase === 'light') {
          statusBarColor = '#f8fafc';
          navBarColor = '#f8fafc';
          isDarkStyle = false;
        } else if (savedBase === 'midnight') {
          statusBarColor = '#0a1128';
          navBarColor = '#0a1128';
          isDarkStyle = true;
        } else if (isIPhoneMode || savedBase === 'amoled') {
          statusBarColor = '#000000';
          navBarColor = '#000000';
          isDarkStyle = true;
        } else if (subView === 'inbox') {
          statusBarColor = '#121316';
          navBarColor = '#121316';
          isDarkStyle = true;
        } else {
          statusBarColor = '#000000';
          navBarColor = '#000000';
          isDarkStyle = true;
        }
        break;
      }

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

      case 'webreceipt':
        statusBarColor = '#f0f2f5';
        navBarColor = '#ffffff';
        isDarkStyle = false;
        break;

      case 'main':
      default:
        statusBarColor = '#70189F';
        navBarColor = '#ffffff';
        isDarkStyle = true;
        break;
    }

    this.applyBars({
      statusBarColor,
      navBarColor,
      isDarkStyle,
    });
  }

  public static restoreFromModal(): void {
    this.syncForView(this.activeViewName);
  }

  public static syncCurrent(): void {
    this.applyBars(this.currentConfig);
  }

  public static initAutoSync(): void {
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

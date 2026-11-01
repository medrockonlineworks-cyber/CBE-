/**
 * System Bars Service
 * Controls status bar (CBE Purple #70189F) and navigation bar styling
 */
export class SystemBarsService {
  static applyDualSystemBars(): void {
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

    // Document root backgrounds: CBE purple #70189F so iOS notch/status bar is purple
    if (document.documentElement) {
      document.documentElement.style.backgroundColor = statusBarColor;
    }
    if (document.body) {
      document.body.style.backgroundColor = statusBarColor;
    }
  }

  static initAutoSync(): void {
    this.applyDualSystemBars();
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.applyDualSystemBars();
        }
      });
      window.addEventListener('focus', () => {
        this.applyDualSystemBars();
      });
    }
  }
}

export default SystemBarsService;

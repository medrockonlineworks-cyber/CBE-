import React, { StrictMode, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import App from './App';
import './index.css';
import { initPwaDynamicManifest } from './utils/pwaBranding';
import { SystemBarsService } from './services/systemBarsService';

// Non-blocking initialization after initial paint
if (typeof window !== 'undefined') {
  const initBackgroundTasks = () => {
    try {
      SystemBarsService.initAutoSync();
    } catch (e) {
      console.warn('[SystemBars] AutoSync note:', e);
    }

    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});

      // Native Capacitor APKs serve all assets offline from bundled local files;
      // ensure no stale Service Worker intercepts updates inside the WebView.
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => {
            regs.forEach((r) => r.unregister().catch(() => {}));
          })
          .catch(() => {});
      }
      return;
    }

    try {
      initPwaDynamicManifest();
    } catch (e) {
      console.warn('[PWA] Manifest init skipped:', e);
    }

    if ('serviceWorker' in navigator) {
      if (import.meta.env.PROD) {
        import('virtual:pwa-register')
          .then(({ registerSW }) => {
            registerSW({
              immediate: true,
              onNeedRefresh() {
                console.log('[PWA] New version ready');
              },
              onOfflineReady() {
                console.log('[PWA] Ready for offline use');
              },
            });
          })
          .catch((swErr) => {
            console.warn('[PWA] SW registration note:', swErr);
          });
      } else {
        navigator.serviceWorker
          .register('/sw-push.js', { scope: '/' })
          .then((reg) => {
            console.log('[WebPush] Dev service worker registered:', reg.scope);
          })
          .catch((swErr) => {
            console.warn('[WebPush] Dev SW registration note:', swErr);
          });
      }
    }
  };

  if (document.readyState === 'complete') {
    setTimeout(initBackgroundTasks, 30);
  } else {
    window.addEventListener('load', () => setTimeout(initBackgroundTasks, 30));
  }
}

// React Error Boundary to prevent blank screen crashes
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[App Crash Caught]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#70189F] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4 text-2xl font-bold">
            !
          </div>
          <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
          <p className="text-sm text-white/80 max-w-sm mb-6">
            The application encountered a display issue. Tap reload to restore your session.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-6 py-2.5 bg-[#deb356] text-black font-bold rounded-xl shadow-lg active:scale-95 transition-transform cursor-pointer"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </StrictMode>,
  );
}



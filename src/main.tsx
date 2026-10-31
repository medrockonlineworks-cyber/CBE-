import React, { StrictMode, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initPwaDynamicManifest } from './utils/pwaBranding';
import { registerSW } from 'virtual:pwa-register';

// Register PWA Service Worker in production for offline capability & installability
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('[PWA] New version ready, updating in background');
      },
      onOfflineReady() {
        console.log('[PWA] App is cached and ready for offline use');
      },
    });
  } catch (swErr) {
    console.warn('[PWA] SW registration note:', swErr);
  }
}

// Safe PWA manifest dynamic loader
try {
  initPwaDynamicManifest();
} catch (e) {
  console.warn('[PWA] Manifest init skipped:', e);
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



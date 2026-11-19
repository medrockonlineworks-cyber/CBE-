import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Keep latest captured beforeinstallprompt event globally so modals opened later can still trigger it
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();

if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach((fn) => fn());
  });
  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    promptListeners.forEach((fn) => fn());
  });
}

export function getCapturedInstallPrompt(): BeforeInstallPromptEvent | null {
  return globalDeferredPrompt;
}

export async function triggerCapturedInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!globalDeferredPrompt) return 'unavailable';
  const promptEvent = globalDeferredPrompt;
  try {
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      globalDeferredPrompt = null;
      promptListeners.forEach((fn) => fn());
    }
    return outcome;
  } catch {
    return 'unavailable';
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => globalDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isStandalone =
      Capacitor.isNativePlatform() ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent || '';
    setIsIOS(
      /iPhone|iPad|iPod/i.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );

    const syncPrompt = () => {
      setDeferredPrompt(globalDeferredPrompt);
      if (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
      ) {
        setIsInstalled(true);
      }
    };

    promptListeners.add(syncPrompt);
    return () => {
      promptListeners.delete(syncPrompt);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    const outcome = await triggerCapturedInstallPrompt();
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  }, []);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

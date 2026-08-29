import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [installOutcome, setInstallOutcome] = useState<'accepted' | 'dismissed' | null>(null);

  // Check if currently running in standalone / fullscreen / native PWA mode
  const checkDisplayMode = useCallback(() => {
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(isStandaloneMode);
    
    // Also check saved installed state
    const savedInstalled = localStorage.getItem('tana_pwa_installed') === 'true';
    if (isStandaloneMode || savedInstalled) {
      setIsInstalled(true);
    }
  }, []);

  useEffect(() => {
    // 1. Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAndroidDevice = /android/.test(userAgent);
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    
    setIsAndroid(isAndroidDevice);
    setIsIos(isIosDevice);

    // 2. Initial display mode check
    checkDisplayMode();

    // 3. Listen for display-mode media query changes
    const standaloneMatcher = window.matchMedia('(display-mode: standalone)');
    const fullscreenMatcher = window.matchMedia('(display-mode: fullscreen)');
    
    const handleDisplayChange = () => checkDisplayMode();
    
    try {
      standaloneMatcher.addEventListener('change', handleDisplayChange);
      fullscreenMatcher.addEventListener('change', handleDisplayChange);
    } catch {
      // Legacy Safari fallback
      standaloneMatcher.addListener(handleDisplayChange);
      fullscreenMatcher.addListener(handleDisplayChange);
    }

    // 4. Capture native beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent automatic mini-infobar on mobile Chrome
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
      console.log('[PWA] beforeinstallprompt event captured and ready');
    };

    // 5. Capture appinstalled event
    const handleAppInstalled = () => {
      console.log('[PWA] Application successfully installed');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      localStorage.setItem('tana_pwa_installed', 'true');
      setInstallOutcome('accepted');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      try {
        standaloneMatcher.removeEventListener('change', handleDisplayChange);
        fullscreenMatcher.removeEventListener('change', handleDisplayChange);
      } catch {
        standaloneMatcher.removeListener(handleDisplayChange);
        fullscreenMatcher.removeListener(handleDisplayChange);
      }
    };
  }, [checkDisplayMode]);

  // Trigger real native installation prompt
  const promptInstall = async (): Promise<{ outcome: 'accepted' | 'dismissed' | 'manual_required' }> => {
    if (!deferredPrompt) {
      console.log('[PWA] No deferred prompt available; manual installation flow required');
      return { outcome: 'manual_required' };
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      console.log(`[PWA] User choice: ${choiceResult.outcome}`);
      setInstallOutcome(choiceResult.outcome);

      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        localStorage.setItem('tana_pwa_installed', 'true');
      }

      setDeferredPrompt(null);
      return { outcome: choiceResult.outcome };
    } catch (err) {
      console.error('[PWA] Error executing install prompt:', err);
      return { outcome: 'manual_required' };
    }
  };

  return {
    isInstallable,
    isInstalled,
    isStandalone,
    isAndroid,
    isIos,
    hasPrompt: !!deferredPrompt,
    installOutcome,
    promptInstall
  };
}

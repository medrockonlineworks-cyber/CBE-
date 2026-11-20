import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { UserProfile, Transaction } from './types';
import { LocalDb } from './lib/mockData';
import Auth from './components/Auth';
import Home from './pages/Home';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import CbeTransfer from './components/CbeTransfer';
import Payments from './components/Payments';
import History from './components/History';
import Profile from './components/Profile';
import Receipt from './components/Receipt';
import AdminPanel from './components/AdminPanel';
import SmsPage from './pages/SmsPage';
import TruecallerSimulator from './components/TruecallerSimulator';
import PhoneCallApp from './components/PhoneCallApp';
import DashenBankApp from './components/DashenBankApp';
import TelebirrApp from './components/TelebirrApp';
import TelegramSimulatorApp from './components/telegram/TelegramSimulatorApp';
import { PhoneCallService } from './services/phoneCallService';
import { SmsService } from './services/smsService';
import { PhoneSettingsService } from './services/phoneSettingsService';
import { SystemBarsService } from './services/systemBarsService';
import { AuthSessionService } from './services/authSessionService';
import { BiometricAuthService } from './services/biometricAuthService';
import { PushNotificationService } from './services/pushNotificationService';
import { SubAppInstallService } from './services/subAppInstallService';
import { CrossAppSyncService } from './services/crossAppSyncService';
import { AppLogoService, BrandAppId } from './services/appLogoService';
import Navigation, { TabType } from './components/Navigation';
import OfflineBanner from './components/OfflineBanner';
import PhoneRecentAppsModal, { AppViewId } from './components/PhoneRecentAppsModal';
import PhoneSettingsModal from './components/PhoneSettingsModal';
import SubAppPermissionBanner from './components/SubAppPermissionBanner';
import { CbeWebReceiptModal } from './components/CbeWebReceiptModal';
import {
  cacheCurrentPublicOriginIfReachable,
  decodeWebReceiptPayload,
  extractWebReceiptIdFromPath,
  loadWebReceiptPayload,
  saveWebReceiptPayload,
  WebReceiptUrlPayload,
} from './services/webReceiptBrowserService';
import { ChevronLeft, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';

interface ViewErrorBoundaryProps {
  children: React.ReactNode;
  viewName: string;
  onBack: () => void;
}

interface ViewErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ViewErrorBoundary extends React.Component<ViewErrorBoundaryProps, ViewErrorBoundaryState> {
  public state: ViewErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ViewErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ViewErrorBoundary:${this.props.viewName}]`, error, errorInfo);
    try {
      SystemBarsService.applyBars({
        statusBarColor: '#000000',
        navBarColor: '#000000',
        isDarkStyle: true,
      });
    } catch {}
  }

  handleReset = () => {
    try {
      localStorage.removeItem('google_messages_custom_threads');
      localStorage.removeItem('bank_sms_messages_v6');
      localStorage.removeItem('bank_sms_accounts_v6');
      localStorage.removeItem('bank_sms_active_account');
    } catch {}
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full bg-[#121212] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold mb-2">Unable to load {this.props.viewName}</h2>
          <p className="text-xs text-neutral-400 max-w-sm mb-4 leading-relaxed">
            A temporary display error was encountered while reading messages. You can reset message storage or return to CBE Mobile Banking.
          </p>
          {this.state.error && (
            <p className="text-[11px] text-rose-400/80 font-mono max-w-sm mb-6 p-2 bg-rose-950/30 rounded border border-rose-900/40 break-words">
              {this.state.error.message}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset &amp; Restore</span>
            </button>
            <button
              onClick={this.props.onBack}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to App</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // Authentication & View Session States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const users = LocalDb.getUsers();
      const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('tana_active_user_id') : null;
      if (savedUserId) {
        const match = users.find(u => u.id === savedUserId);
        if (match && match.status !== 'suspended') return match;
      }
      return users[0] || null;
    } catch {
      return null;
    }
  });
  const [activeView, setActiveView] = useState<'auth' | 'main' | 'receipt' | 'webreceipt' | 'admin' | 'sms' | 'truecaller' | 'phone' | 'dashen' | 'telebirr' | 'telegram'>(() => {
    if (typeof window !== 'undefined') {
      const path = (window.location.pathname || '').toLowerCase().replace(/\/+$/, '') || '/';
      const search = new URLSearchParams(window.location.search);
      const appParam = (search.get('app') || search.get('view') || '').toLowerCase();
      const hash = (window.location.hash || '').toLowerCase();

      const pathId = extractWebReceiptIdFromPath(window.location.pathname);

      if (pathId || path === '/webreceipt' || appParam === 'webreceipt' || hash === '#webreceipt' || hash === '#/webreceipt') return 'webreceipt';
      if (path === '/sms' || appParam === 'sms' || hash === '#sms' || hash === '#/sms') return 'sms';
      if (path === '/truecaller' || appParam === 'truecaller' || hash === '#truecaller' || hash === '#/truecaller') return 'truecaller';
      if (path === '/phone' || appParam === 'phone' || hash === '#phone' || hash === '#/phone') return 'phone';
      if (path === '/dashen' || appParam === 'dashen' || hash === '#dashen' || hash === '#/dashen') return 'dashen';
      if (path === '/telebirr' || appParam === 'telebirr' || hash === '#telebirr' || hash === '#/telebirr') return 'telebirr';
      if (path === '/telegram' || appParam === 'telegram' || hash === '#telegram' || hash === '#/telegram') return 'telegram';
      if (path === '/admin' || appParam === 'admin' || hash === '#admin') return 'admin';
      if (path === '/main' || appParam === 'main' || hash === '#main') return 'main';
    }
    // Default: Open directly to the authentic white CBE login page
    return 'auth';
  });

  const standaloneWebReceiptData = useMemo<{
    payload: WebReceiptUrlPayload | null;
    tx: Transaction | null;
    sms: any;
  }>(() => {
    if (typeof window === 'undefined') {
      return { payload: null, tx: null, sms: null };
    }
    try {
      const search = new URLSearchParams(window.location.search);
      const pathId = extractWebReceiptIdFromPath(window.location.pathname);
      const queryId = (pathId || search.get('id') || '').trim().toUpperCase();
      let decoded = decodeWebReceiptPayload(search.get('d'));
      if (decoded) {
        saveWebReceiptPayload(decoded);
      } else if (queryId) {
        decoded = loadWebReceiptPayload(queryId);
      }

      let matchedTx: Transaction | null = null;
      let matchedSms: any = null;

      if (!decoded && queryId) {
        const allTx = LocalDb.getTransactions();
        matchedTx =
          allTx.find(
            (t) =>
              (t.id && t.id.toUpperCase() === queryId) ||
              (t.reference && t.reference.toUpperCase() === queryId)
          ) || null;

        if (!matchedTx) {
          const accounts = SmsService.getAccounts();
          for (const acc of accounts) {
            const msgs = SmsService.getSmsMessages(acc.accountNumber);
            const found = msgs.find(
              (m) =>
                (m.transactionId && m.transactionId.toUpperCase() === queryId) ||
                (m.id && m.id.toUpperCase() === queryId) ||
                (m.message && m.message.toUpperCase().includes(queryId))
            );
            if (found) {
              matchedSms = found;
              break;
            }
          }
        }
      }

      if (!decoded && !matchedTx && !matchedSms && queryId) {
        matchedTx = {
          id: queryId,
          type: 'transfer',
          recipientName: 'Leykun Jemaneh Ylma',
          recipientAccount: '1000419524747',
          recipientBank: 'Commercial Bank of Ethiopia',
          amount: 50,
          fee: 0.5,
          description: 'MB Transfer',
          reference: queryId,
          status: 'success',
          createdAt: new Date().toISOString(),
        };
      }

      return { payload: decoded, tx: matchedTx, sms: matchedSms };
    } catch {
      return { payload: null, tx: null, sms: null };
    }
  }, []);

  useEffect(() => {
    cacheCurrentPublicOriginIfReachable();
    CrossAppSyncService.start();

    let mounted = true;
    const drainNativeMessagesBridge = async () => {
      if (!Capacitor.isNativePlatform()) return;
      const { records, readIds } = await SubAppInstallService.drainNativeIncomingSms();
      for (const rec of records) {
        CrossAppSyncService.applyIncomingPushPayload({ view: 'sms', smsRecord: rec });
      }
      if (readIds.length > 0) {
        try {
          const raw = localStorage.getItem('bank_sms_messages_v6');
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              let changed = false;
              const next = list.map((msg: any) => {
                if (!msg || msg.read) return msg;
                const matched = readIds.some(
                  (r) =>
                    (r.smsId && msg.id === r.smsId) ||
                    (r.reference && msg.transactionId === r.reference)
                );
                if (matched) {
                  changed = true;
                  return { ...msg, read: true };
                }
                return msg;
              });
              if (changed) {
                localStorage.setItem('bank_sms_messages_v6', JSON.stringify(next));
                window.dispatchEvent(new CustomEvent('sms-updated'));
              }
            }
          }
        } catch {}
      }
    };

    void SubAppInstallService.consumeNativeLaunchSubApp().then((launchView) => {
      if (mounted && launchView) {
        setActiveView(launchView);
      }
    });
    void drainNativeMessagesBridge();

    const handleNativeSubAppLaunch = (ev: Event) => {
      const detail = (ev as CustomEvent<{ view?: string }>).detail;
      if (detail?.view && SubAppInstallService.isValidSubApp(detail.view)) {
        setActiveView(detail.view);
      }
    };
    const handleNativeSmsBridgeEvent = () => {
      void drainNativeMessagesBridge();
    };
    window.addEventListener('cbe_subapp_launch', handleNativeSubAppLaunch);
    window.addEventListener('cbe_native_sms_received', handleNativeSmsBridgeEvent);
    window.addEventListener('cbe_native_sms_marked_read', handleNativeSmsBridgeEvent);

    // Keep permanent standalone sub-app Connection Keys alive automatically whenever the sub-app opens or resumes
    const maintainCurrentSubApp = (forceCheck = false) => {
      if (Capacitor.isNativePlatform()) return;
      const slug = window.location.pathname.toLowerCase().replace(/^\/+|\/+$/g, '').split('/')[0];
      if (
        slug === 'sms' ||
        slug === 'truecaller' ||
        slug === 'telebirr' ||
        slug === 'dashen' ||
        slug === 'telegram' ||
        slug === 'phone'
      ) {
        void PushNotificationService.autoMaintainSubAppSubscription(slug, { forceCheck });
      }
    };
    maintainCurrentSubApp(true);
    const onSubAppFocus = () => {
      maintainCurrentSubApp(false);
      void drainNativeMessagesBridge();
    };
    const onSubAppVisible = () => {
      if (document.visibilityState === 'visible') {
        maintainCurrentSubApp(false);
        void drainNativeMessagesBridge();
      }
    };
    window.addEventListener('focus', onSubAppFocus);
    document.addEventListener('visibilitychange', onSubAppVisible);

    return () => {
      mounted = false;
      window.removeEventListener('cbe_subapp_launch', handleNativeSubAppLaunch);
      window.removeEventListener('cbe_native_sms_received', handleNativeSmsBridgeEvent);
      window.removeEventListener('cbe_native_sms_marked_read', handleNativeSmsBridgeEvent);
      window.removeEventListener('focus', onSubAppFocus);
      document.removeEventListener('visibilitychange', onSubAppVisible);
    };
  }, []);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [returnTab, setReturnTab] = useState<TabType>('home');
  const [isRecentAppsOpen, setIsRecentAppsOpen] = useState<boolean>(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [initialTxTab, setInitialTxTab] = useState<'send' | 'transfer' | 'merchant' | 'receive' | 'airtime'>('transfer');
  const [smsActiveAccountId, setSmsActiveAccountId] = useState<string | undefined>(undefined);
  const [isIPhone, setIsIPhone] = useState<boolean>(() => PhoneSettingsService.isIPhoneMode());
  const [showPhoneSettingsModal, setShowPhoneSettingsModal] = useState<boolean>(false);
  const [showBiometricEnrollPrompt, setShowBiometricEnrollPrompt] = useState<boolean>(false);
  const [pendingDeepLinkTxId, setPendingDeepLinkTxId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const search = new URLSearchParams(window.location.search);
      return search.get('tx');
    } catch {
      return null;
    }
  });
  const [pendingDeepLinkTab, setPendingDeepLinkTab] = useState<TabType | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const search = new URLSearchParams(window.location.search);
      const tabParam = search.get('tab');
      if (tabParam === 'history' || tabParam === 'profile' || tabParam === 'transfer' || tabParam === 'payments' || tabParam === 'home') {
        return tabParam;
      }
      if (search.get('tx')) return 'history';
    } catch {}
    return null;
  });
  const [pendingDeepLinkView, setPendingDeepLinkView] = useState<'sms' | 'truecaller' | 'telebirr' | 'dashen' | 'telegram' | 'phone' | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const search = new URLSearchParams(window.location.search);
      const viewParam = search.get('view');
      if (
        viewParam === 'sms' ||
        viewParam === 'truecaller' ||
        viewParam === 'telebirr' ||
        viewParam === 'dashen' ||
        viewParam === 'telegram' ||
        viewParam === 'phone'
      ) {
        return viewParam;
      }
    } catch {}
    return null;
  });
  const [activeDetailTxId, setActiveDetailTxId] = useState<string | null>(null);

  useEffect(() => {
    return PhoneSettingsService.subscribe(() => {
      setIsIPhone(PhoneSettingsService.isIPhoneMode());
    });
  }, []);

  // Ensure system status bar & navigation bar match the active view dynamically:
  useEffect(() => {
    SystemBarsService.syncForView(activeView, { isIPhone });
  }, [activeView, isIPhone]);

  // Sync page title, Apple Touch Icon & dynamic PWA manifest with active app & any custom uploaded logo
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const validBrandApps: BrandAppId[] = [
      'sms',
      'truecaller',
      'telebirr',
      'dashen',
      'telegram',
      'phone',
    ];
    const activeBrandApp: BrandAppId = (validBrandApps as string[]).includes(activeView)
      ? (activeView as BrandAppId)
      : 'cbe';

    const applyNow = () => {
      AppLogoService.applyHeadBrandingForApp(activeBrandApp, { isIPhone });
    };

    applyNow();
    window.addEventListener('cbe_app_logos_updated', applyNow);
    return () => {
      window.removeEventListener('cbe_app_logos_updated', applyNow);
    };
  }, [activeView, isIPhone]);

  // Attach Service Worker notification click & subscription renewal listeners + deep-link handler
  const currentUserRef = useRef<UserProfile | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    PushNotificationService.attachServiceWorkerListeners(() => currentUserRef.current);

    const handleDeepLink = (e: Event) => {
      const detail = (
        e as CustomEvent<{ url?: string; txId?: string | null; view?: string | null }>
      ).detail;
      if (!detail) return;

      const rawUrl = detail.url || '';
      const validSubViews = ['sms', 'truecaller', 'telebirr', 'dashen', 'telegram', 'phone'] as const;
      type SubAppView = (typeof validSubViews)[number];

      let targetSubView: SubAppView | null = null;
      if (detail.view && (validSubViews as readonly string[]).includes(detail.view)) {
        targetSubView = detail.view as SubAppView;
      } else {
        for (const v of validSubViews) {
          if (rawUrl.includes(`view=${v}`) || rawUrl === `/${v}` || rawUrl === `/${v}/`) {
            targetSubView = v;
            break;
          }
        }
      }

      if (targetSubView) {
        if (activeView === 'auth') {
          setPendingDeepLinkView(targetSubView);
          return;
        }
        setActiveView(targetSubView);
        try {
          window.history.pushState({ view: targetSubView, tab: 'home' }, '', `/${targetSubView}/`);
        } catch {}
        return;
      }

      let targetTab: TabType | null = null;
      if (rawUrl.includes('tab=profile')) targetTab = 'profile';
      else if (rawUrl.includes('tab=history') || detail.txId) targetTab = 'history';

      if (activeView === 'auth') {
        if (detail.txId) setPendingDeepLinkTxId(detail.txId);
        if (targetTab) setPendingDeepLinkTab(targetTab);
        return;
      }

      if (detail.txId) {
        setActiveDetailTxId(detail.txId);
        setActiveView('main');
        setActiveTab('history');
      } else if (targetTab) {
        setActiveView('main');
        setActiveTab(targetTab);
      }
    };

    window.addEventListener('cbe_push_deep_link', handleDeepLink);
    return () => {
      window.removeEventListener('cbe_push_deep_link', handleDeepLink);
    };
  }, [activeView]);

  // Silently synchronize ALREADY-granted Web Push subscriptions (never prompts on load)
  useEffect(() => {
    if (activeView === 'main' && currentUser) {
      void PushNotificationService.syncExistingSubscription(currentUser);
    }
  }, [activeView, currentUser?.id]);

  // Support mobile navigation bar buttons (Home & Recents) across all subapps
  useEffect(() => {
    const handlePhoneHome = () => {
      navigateTo('main', 'home');
    };
    const handlePhoneRecents = () => {
      setIsRecentAppsOpen(true);
    };
    window.addEventListener('cbe_phone_home', handlePhoneHome);
    window.addEventListener('cbe_phone_recents', handlePhoneRecents);
    return () => {
      window.removeEventListener('cbe_phone_home', handlePhoneHome);
      window.removeEventListener('cbe_phone_recents', handlePhoneRecents);
    };
  }, []);

  // Truecaller base theme tracking (dark, amoled, midnight, light)
  const [tcBaseTheme, setTcBaseTheme] = useState<string>(() => {
    try {
      return localStorage.getItem('tc_theme_base') || 'dark';
    } catch {
      return 'dark';
    }
  });

  // Theme Alignment configuration for Fixed Status Bar and Navigation Bar per subapp
  const viewThemeConfig = useMemo(() => {
    switch (activeView) {
      case 'truecaller': {
        const isLight = tcBaseTheme === 'light';
        const isMidnight = tcBaseTheme === 'midnight';
        const isAmoled = tcBaseTheme === 'amoled' || isIPhone;
        const bg = isLight ? 'bg-[#f8fafc]' : (isMidnight ? 'bg-[#0a1128]' : (isAmoled ? 'bg-black' : 'bg-[#121316]'));
        const navBg = isLight ? 'bg-[#f8fafc] border-neutral-200 text-neutral-800' : (isMidnight ? 'bg-[#0a1128] border-neutral-800 text-white' : (isAmoled ? 'bg-black border-neutral-900 text-white' : 'bg-[#121316] border-neutral-800/80 text-white'));
        return {
          rootBg: bg,
          statusBarBg: isLight ? 'bg-[#f8fafc] text-neutral-900' : `${bg} text-white`,
          statusTheme: isLight ? ('light' as const) : ('dark' as const),
          navBarBg: navBg,
          navTheme: isLight ? ('light' as const) : ('dark' as const),
        };
      }
      case 'sms':
        return {
          rootBg: isIPhone ? 'bg-black' : 'bg-[#121212]',
          statusBarBg: isIPhone ? 'bg-black text-white' : 'bg-[#121212] text-white',
          statusTheme: 'dark' as const,
          navBarBg: isIPhone ? 'bg-black border-neutral-900 text-white' : 'bg-[#121212] border-neutral-800/80 text-white',
          navTheme: 'dark' as const,
        };
      case 'phone':
        return {
          rootBg: 'bg-black',
          statusBarBg: 'bg-black text-white',
          statusTheme: 'dark' as const,
          navBarBg: 'bg-black border-neutral-900 text-white',
          navTheme: 'dark' as const,
        };
      case 'dashen':
        return {
          rootBg: 'bg-[#040b18]',
          statusBarBg: 'bg-[#040b18] text-white',
          statusTheme: 'dark' as const,
          navBarBg: 'bg-[#040b18] border-neutral-900 text-white',
          navTheme: 'dark' as const,
        };
      case 'telebirr':
        return {
          rootBg: 'bg-white',
          statusBarBg: 'bg-[#005fa8] text-white',
          statusTheme: 'dark' as const,
          navBarBg: 'bg-white border-neutral-200 text-neutral-800',
          navTheme: 'light' as const,
        };
      case 'telegram':
      case 'admin':
        return {
          rootBg: 'bg-slate-900',
          statusBarBg: 'bg-slate-900 text-white',
          statusTheme: 'dark' as const,
          navBarBg: 'bg-slate-900 border-slate-800 text-white',
          navTheme: 'dark' as const,
        };
      case 'receipt':
        return {
          rootBg: 'bg-white',
          statusBarBg: 'bg-[#7A1FA2] text-white',
          statusTheme: 'cbe' as const,
          navBarBg: 'bg-white border-neutral-200 text-neutral-800',
          navTheme: 'light' as const,
        };
      case 'webreceipt':
        return {
          rootBg: 'bg-[#f0f2f5]',
          statusBarBg: 'bg-[#f0f2f5] text-neutral-900',
          statusTheme: 'light' as const,
          navBarBg: 'bg-white border-neutral-200 text-neutral-800',
          navTheme: 'light' as const,
        };
      case 'auth':
        return {
          rootBg: 'bg-white',
          statusBarBg: 'bg-white text-neutral-900',
          statusTheme: 'light' as const,
          navBarBg: 'bg-white border-neutral-200 text-neutral-800',
          navTheme: 'light' as const,
        };
      case 'main':
      default:
        return {
          rootBg: 'bg-[#70189F]',
          statusBarBg: 'bg-[#70189F] text-white',
          statusTheme: 'cbe' as const,
          navBarBg: 'bg-white border-neutral-200 text-neutral-800',
          navTheme: 'light' as const,
        };
    }
  }, [activeView]);

  // Listen for global balance updates & account switches so App-level currentUser is always fresh
  useEffect(() => {
    const handleBalanceSync = (e?: any) => {
      const savedActiveId = (typeof window !== 'undefined' ? localStorage.getItem('tana_active_user_id') : null) || e?.detail?.user?.id || currentUser?.id || 'user_1';
      const users = LocalDb.getUsers();
      const match = users.find(u => u.id === savedActiveId) || users.find(u => u.id === 'user_1') || users[0];
      if (match) {
        setCurrentUser({ ...match });
      }
    };
    const handleAccountSwitched = (e: any) => {
      if (e?.detail?.user) {
        localStorage.setItem('tana_active_user_id', e.detail.user.id);
        setCurrentUser({ ...e.detail.user });
      } else {
        const savedActiveId = typeof window !== 'undefined' ? localStorage.getItem('tana_active_user_id') : null;
        if (savedActiveId) {
          const users = LocalDb.getUsers();
          const match = users.find(u => u.id === savedActiveId);
          if (match) setCurrentUser({ ...match });
        }
      }
    };
    window.addEventListener('cbe_balance_updated' as any, handleBalanceSync);
    window.addEventListener('cbe_transaction_completed' as any, handleBalanceSync);
    window.addEventListener('cbe_accounts_updated' as any, handleBalanceSync);
    const handleCbeNavigateTab = (e: any) => {
      const targetTab = e?.detail?.tab;
      if (targetTab) {
        setActiveView('main');
        setActiveTab(targetTab === 'transactions' ? 'history' : targetTab);
      }
    };
    window.addEventListener('cbe_navigate_tab' as any, handleCbeNavigateTab);

    const handleTcThemeChanged = (e: any) => {
      if (e?.detail?.base) {
        setTcBaseTheme(e.detail.base);
      }
    };
    window.addEventListener('tc_theme_changed' as any, handleTcThemeChanged);

    return () => {
      window.removeEventListener('cbe_balance_updated' as any, handleBalanceSync);
      window.removeEventListener('cbe_transaction_completed' as any, handleBalanceSync);
      window.removeEventListener('cbe_accounts_updated' as any, handleBalanceSync);
      window.removeEventListener('cbe_account_switched' as any, handleAccountSwitched);
      window.removeEventListener('cbe_navigate_tab' as any, handleCbeNavigateTab);
      window.removeEventListener('tc_theme_changed' as any, handleTcThemeChanged);
    };
  }, []);

  // Track navigation state to manage Android / browser history correctly
  const navHistoryRef = useRef<{ view: string; tab: string }[]>([]);

  // Navigation pusher that keeps browser history in sync with Android back-button
  const navigateTo = useCallback((view: 'auth' | 'main' | 'receipt' | 'webreceipt' | 'admin' | 'sms' | 'truecaller' | 'phone' | 'dashen' | 'telebirr' | 'telegram', tab: TabType = activeTab) => {
    if (activeView === 'main') {
      setReturnTab(activeTab);
    }
    setActiveView(view);
    setActiveTab(tab);
    
    try {
      localStorage.setItem('tana_active_view', view);
      localStorage.setItem('tana_active_tab', tab);
      const stateObj = { view, tab };
      const normalizedCurrentPath = window.location.pathname.replace(/\/+$/, '') || '/';
      const targetPath = view === 'sms' 
        ? '/sms/' 
        : (view === 'truecaller' 
          ? '/truecaller/' 
          : (view === 'phone' 
            ? '/phone/' 
            : (view === 'dashen' 
              ? '/dashen/' 
              : (view === 'telebirr'
                ? '/telebirr/'
                : (view === 'telegram'
                  ? '/telegram/'
                  : (view === 'webreceipt'
                    ? (standaloneWebReceiptData.payload?.refId ? `/v2-hfHCxG${standaloneWebReceiptData.payload.refId}` : '/webreceipt')
                    : (['/sms', '/truecaller', '/phone', '/dashen', '/telebirr', '/telegram', '/webreceipt'].includes(normalizedCurrentPath) || extractWebReceiptIdFromPath(window.location.pathname) ? '/' : window.location.pathname)))))));
      window.history.pushState(stateObj, '', targetPath);
      navHistoryRef.current.push(stateObj);
    } catch {
      // Ignore if history state fails in sandboxed iframe
    }
  }, [activeTab, activeView]);

  // Phone Navigation Bar Handlers for CBE Main App
  const handlePhoneBack = useCallback(() => {
    // 1. Give active modals / sub-views first priority to handle back
    let handledBySubView = false;
    const customBackEvent = new CustomEvent('cbe_phone_back', {
      cancelable: true,
      detail: {
        setHandled: () => {
          handledBySubView = true;
        },
      },
    });
    window.dispatchEvent(customBackEvent);
    if (customBackEvent.defaultPrevented || handledBySubView) {
      return;
    }

    // 2. If viewing a receipt:
    // Strictly prevent exiting! The receipt screen has no way out except explicitly clicking the "Close" button.
    // iPhone and Android back navigation gestures/buttons are strictly disabled here.
    if (activeView === 'receipt') {
      return;
    }

    // 3. If in admin panel, return to main profile
    if (activeView === 'admin') {
      setActiveView('main');
      setActiveTab('profile');
      return;
    }

    // 4. If in secondary app, return to CBE main app
    if (activeView !== 'main') {
      navigateTo('main', returnTab || 'home');
      return;
    }

    // 5. If in CBE main app and on secondary tab (transfer, payments, history, profile), return to 'home' tab
    if (activeTab !== 'home') {
      setActiveTab('home');
      try {
        window.history.pushState({ view: 'main', tab: 'home' }, '', '/');
      } catch {}
      return;
    }

    // 6. If already on Home tab at the root:
    // If navigation history has a previous app (e.g. Telebirr, Dashen, SMS), go back to it
    if (navHistoryRef.current.length > 1) {
      navHistoryRef.current.pop(); // current
      const prev = navHistoryRef.current.pop();
      if (prev && prev.view && prev.view !== 'main') {
        navigateTo(prev.view as any, (prev.tab as any) || 'home');
        return;
      }
    }

    // Otherwise open Recent Apps Switcher
    setIsRecentAppsOpen(true);
  }, [activeView, activeTab, returnTab, navigateTo]);

  const handlePhoneHome = useCallback(() => {
    // On the receipt page, only the "Close" button can navigate away
    if (activeView === 'receipt') {
      return;
    }
    window.dispatchEvent(new CustomEvent('cbe_phone_home'));
    if (activeView !== 'main') {
      navigateTo('main', 'home');
    } else {
      setActiveTab('home');
    }
  }, [activeView, navigateTo]);

  const handlePhoneRecents = useCallback(() => {
    setIsRecentAppsOpen(true);
  }, []);

  const nativeBackStateRef = useRef({
    activeView,
    activeTab,
    isRecentAppsOpen,
    showPhoneSettingsModal,
    handlePhoneBack,
  });

  useEffect(() => {
    nativeBackStateRef.current = {
      activeView,
      activeTab,
      isRecentAppsOpen,
      showPhoneSettingsModal,
      handlePhoneBack,
    };
  }, [activeView, activeTab, isRecentAppsOpen, showPhoneSettingsModal, handlePhoneBack]);

  // Native Capacitor Android hardware Back button integration
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let mounted = true;
    let removeListener: (() => Promise<void>) | null = null;

    CapacitorApp.addListener('backButton', () => {
      const state = nativeBackStateRef.current;

      if (state.isRecentAppsOpen) {
        setIsRecentAppsOpen(false);
        return;
      }

      if (state.showPhoneSettingsModal) {
        setShowPhoneSettingsModal(false);
        return;
      }

      let handledBySubView = false;
      const customBackEvent = new CustomEvent('cbe_phone_back', {
        cancelable: true,
        detail: {
          setHandled: () => {
            handledBySubView = true;
          },
        },
      });
      window.dispatchEvent(customBackEvent);
      if (customBackEvent.defaultPrevented || handledBySubView) {
        return;
      }

      if (state.activeView === 'receipt') {
        return;
      }

      if (state.activeView === 'auth' || (state.activeView === 'main' && state.activeTab === 'home')) {
        CapacitorApp.minimizeApp().catch(() => {});
        return;
      }

      state.handlePhoneBack();
    })
      .then((handle) => {
        if (mounted) {
          removeListener = () => handle.remove();
        } else {
          handle.remove().catch(() => {});
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
      if (removeListener) {
        void removeListener();
      }
    };
  }, []);

  // Android Back Navigation handler
  useEffect(() => {
    // Push initial entry; for standalone web receipts, normalize browser URL to /v2-hfHCxG<refId>
    try {
      const receiptId =
        standaloneWebReceiptData.payload?.refId ||
        standaloneWebReceiptData.tx?.reference ||
        standaloneWebReceiptData.tx?.id ||
        standaloneWebReceiptData.sms?.transactionId ||
        extractWebReceiptIdFromPath(window.location.pathname);
      const initialUrl =
        activeView === 'webreceipt' && receiptId
          ? `/v2-hfHCxG${receiptId}`
          : `${window.location.pathname}${window.location.search || ''}${window.location.hash || ''}`;
      window.history.replaceState({ view: activeView, tab: activeTab }, '', initialUrl);
    } catch {}

    const handlePopState = (e: PopStateEvent) => {
      // 1. Give active modals / sheets / sub-views first priority to handle device back
      let handledBySubView = false;
      const customBackEvent = new CustomEvent('cbe_phone_back', {
        cancelable: true,
        detail: {
          setHandled: () => {
            handledBySubView = true;
          },
        },
      });
      window.dispatchEvent(customBackEvent);
      if (customBackEvent.defaultPrevented || handledBySubView) {
        return;
      }

      // 2. Real device back across views
      if (activeView === 'sms' || activeView === 'truecaller' || activeView === 'phone' || activeView === 'dashen' || activeView === 'telebirr' || activeView === 'telegram') {
        setActiveView('main');
        setActiveTab(returnTab || 'home');
      } else if (activeView === 'receipt') {
        // Strictly prevent device back / popstate from exiting receipt page
        try {
          window.history.pushState({ view: 'receipt', locked: true }, '', window.location.pathname);
        } catch {}
        return;
      } else if (activeView === 'admin') {
        setActiveView('main');
        setActiveTab('profile');
      } else if (activeView === 'main' && activeTab !== 'home') {
        setActiveTab('home');
      } else if (e.state && e.state.view) {
        setActiveView(e.state.view);
        if (e.state.tab) setActiveTab(e.state.tab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeView, activeTab]);

  // Platform Native Swipe-to-Back Gesture:
  // - iPhone: Left-edge swipe towards right
  // - Android: Left-edge or Right-edge swipe (modern Android gesture system)
  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 1) {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const diffX = endX - startX;
        const diffY = Math.abs(endY - startY);
        const screenW = window.innerWidth || 360;

        // 1. Left-edge swipe towards right (iPhone iOS & Android left back)
        const isLeftEdge = startX <= 40 && diffX > 45 && diffY < 50;

        // 2. Right-edge swipe towards left (Android gesture navigation right back)
        const isRightEdge = !isIPhone && startX >= (screenW - 40) && (startX - endX) > 45 && diffY < 50;

        // On the receipt page, iPhone navigation system (swipe-to-back) is completely disabled:
        // User requested: "Make sure in this page there is no way out either i click close button ok the iPhone navigation system will not work on this page"
        if (activeView === 'receipt') {
          return;
        }

        if (isLeftEdge || isRightEdge) {
          handlePhoneBack();
        }
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [handlePhoneBack, isIPhone, activeView]);

  // Try auto restoring session profile on mount
  useEffect(() => {
    const savedUserId = localStorage.getItem('tana_active_user_id');
    if (savedUserId) {
      const users = LocalDb.getUsers();
      const match = users.find(u => u.id === savedUserId);
      if (match) {
        if (match.status === 'suspended') {
          localStorage.removeItem('tana_active_user_id');
        } else {
          setCurrentUser(match);
        }
      }
    }
  }, []);

  const handleLoginSuccess = (
    user: UserProfile,
    method: 'biometric' | 'credentials' = 'credentials'
  ) => {
    setCurrentUser(user);
    localStorage.setItem('tana_active_user_id', user.id);
    const alreadyEnrolled = BiometricAuthService.isBiometricEnrolledForUser(user.id);
    setShowBiometricEnrollPrompt(method === 'credentials' && !alreadyEnrolled);

    if (pendingDeepLinkView) {
      const targetView = pendingDeepLinkView;
      setPendingDeepLinkView(null);
      navigateTo(targetView, 'home');
      return;
    }

    if (pendingDeepLinkTxId) {
      setActiveDetailTxId(pendingDeepLinkTxId);
      setPendingDeepLinkTxId(null);
      setPendingDeepLinkTab(null);
      navigateTo('main', 'history');
      return;
    }

    if (pendingDeepLinkTab) {
      const target = pendingDeepLinkTab;
      setPendingDeepLinkTab(null);
      navigateTo('main', target);
      return;
    }

    navigateTo('main', 'home');
  };

  const handleLogout = async () => {
    const loggingOutUser = currentUser;
    if (loggingOutUser) {
      LocalDb.addAuditLog(
        loggingOutUser.id,
        loggingOutUser.email,
        'USER_LOGOUT',
        'User logged out, revoked server session, and cleared local biometric credentials.'
      );
    }
    setShowBiometricEnrollPrompt(false);
    PushNotificationService.clearSession();
    await AuthSessionService.logoutFromBackend(loggingOutUser?.id);
    if (loggingOutUser?.id) {
      await BiometricAuthService.clearStoredCredential(loggingOutUser.id);
      const users = LocalDb.getUsers();
      const idx = users.findIndex((u) => u.id === loggingOutUser.id);
      if (idx !== -1) {
        users[idx].biometricEnabled = false;
        LocalDb.setUsers(users);
      }
    }
    setCurrentUser(null);
    localStorage.removeItem('tana_active_user_id');
    localStorage.removeItem('tana_pending_user_id');
    navigateTo('auth', 'home');
  };

  const handleUpdateUserProfile = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('tana_active_user_id', updatedUser.id);
  };

  const handleSelectTransaction = (tx: Transaction) => {
    setSelectedTransaction(tx);
    navigateTo('receipt', activeTab);
  };

  // Callback after completing any Send, Transfer, Bill or Airtime payment
  const handleTransactionComplete = (tx: Transaction) => {
    setSelectedTransaction(tx);
    const cleanSender = tx.senderAccount ? tx.senderAccount.replace(/\D/g, '') : '1000419524747';
    setSmsActiveAccountId(cleanSender);
    navigateTo('receipt', activeTab);
    
    // Refresh current user balance immediately from database
    const users = LocalDb.getUsers();
    const activeId = localStorage.getItem('tana_active_user_id') || currentUser?.id || 'user_1';
    const match = users.find(u => u.id === activeId || u.accountNumber === cleanSender);
    if (match) {
      setCurrentUser({ ...match });
    }

    // Ensure simulated SMS is generated with the accurate updated balance
    try {
      SmsService.createSmsFromTransaction(tx, match ? match.balance : currentUser?.balance);
    } catch (smsErr) {
      console.error('[SmsService] Non-blocking completion SMS error:', smsErr);
    }

    // Ensure PhoneCallService syncs caller accounts so recent transaction is at the top with Now badge
    try {
      PhoneCallService.syncTransactionToCallerApp(tx);
    } catch (callErr) {
      console.error('[PhoneCallService] Non-blocking caller account sync error:', callErr);
    }
  };

  // View Router Render Picker
  const renderTabContent = () => {
    const activeUser = currentUser || {
      id: 'user_1',
      name: 'Leykun Jemaneh Ylma',
      email: 'leykunjemaneh3@gmail.com',
      phone: '+251900112233',
      accountNumber: '1000419524747',
      accountType: 'wadiah' as const,
      balance: 18450.50,
      availableBalance: 18450.50,
      currency: 'ETB',
      role: 'user' as const,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    switch (activeTab) {
      case 'home':
        return (
          <Home 
            currentUser={activeUser}
            onUpdateCurrentUser={handleUpdateUserProfile}
            promptBiometricEnroll={showBiometricEnrollPrompt}
            onDismissBiometricPrompt={() => setShowBiometricEnrollPrompt(false)}
            initialDetailTxId={activeDetailTxId}
            onClearInitialDetailTx={() => setActiveDetailTxId(null)}
            onNavigateToTab={(tab, subTab) => {
              setActiveTab(tab);
              if (tab === 'transfer' && subTab) {
                setInitialTxTab(subTab as any);
              }
              try {
                window.history.pushState({ view: 'main', tab }, '', window.location.pathname);
              } catch {}
            }}
            onSelectTransaction={handleSelectTransaction}
            onOpenAdmin={() => navigateTo('admin', 'home')}
            onOpenSmsSimulator={() => navigateTo('sms', 'home')}
            onOpenTruecallerSimulator={() => navigateTo('truecaller', 'home')}
            onOpenPhoneApp={() => navigateTo('phone', 'home')}
            onOpenDashenApp={() => navigateTo('dashen', 'home')}
            onOpenTelebirrApp={() => navigateTo('telebirr', 'home')}
            onOpenTelegramSimulator={() => navigateTo('telegram', 'home')}
          />
        );
      case 'transfer':
        return (
          <CbeTransfer 
            currentUser={activeUser}
            onTransactionComplete={handleTransactionComplete}
            onBack={() => setActiveTab('home')}
          />
        );
      case 'payments':
        return (
          <Payments 
            currentUser={activeUser}
            onPaymentComplete={handleTransactionComplete}
          />
        );
      case 'history':
        return (
          <Home 
            currentUser={activeUser}
            onUpdateCurrentUser={handleUpdateUserProfile}
            initialNavTab="history"
            initialDetailTxId={activeDetailTxId}
            onClearInitialDetailTx={() => setActiveDetailTxId(null)}
            onNavigateToTab={(tab, subTab) => {
              setActiveTab(tab);
              if (tab === 'transfer' && subTab) {
                setInitialTxTab(subTab as any);
              }
              try {
                window.history.pushState({ view: 'main', tab }, '', window.location.pathname);
              } catch {}
            }}
            onSelectTransaction={handleSelectTransaction}
            onOpenAdmin={() => navigateTo('admin', 'history')}
            onOpenSmsSimulator={() => navigateTo('sms', 'history')}
            onOpenTruecallerSimulator={() => navigateTo('truecaller', 'history')}
            onOpenPhoneApp={() => navigateTo('phone', 'history')}
            onOpenDashenApp={() => navigateTo('dashen', 'history')}
            onOpenTelebirrApp={() => navigateTo('telebirr', 'history')}
            onOpenTelegramSimulator={() => navigateTo('telegram', 'history')}
          />
        );
      case 'profile':
        return (
          <Profile 
            currentUser={activeUser}
            onLogout={handleLogout}
            onUpdateUser={handleUpdateUserProfile}
            onOpenAdmin={() => navigateTo('admin', 'profile')}
            onBack={() => setActiveTab('home')}
            onOpenSmsSimulator={() => navigateTo('sms', 'profile')}
            onOpenTruecallerSimulator={() => navigateTo('truecaller', 'profile')}
            onOpenPhoneApp={() => navigateTo('phone', 'profile')}
            onOpenDashenApp={() => navigateTo('dashen', 'profile')}
            onOpenTelebirrApp={() => navigateTo('telebirr', 'profile')}
            onOpenTelegramApp={() => navigateTo('telegram', 'profile')}
          />
        );
      default:
        return (
          <Home 
            currentUser={activeUser}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onOpenSmsSimulator={() => navigateTo('sms', 'home')}
            onOpenTruecallerSimulator={() => navigateTo('truecaller', 'home')}
            onOpenPhoneApp={() => navigateTo('phone', 'home')}
            onOpenDashenApp={() => navigateTo('dashen', 'home')}
            onOpenTelebirrApp={() => navigateTo('telebirr', 'home')}
            onOpenTelegramSimulator={() => navigateTo('telegram', 'home')}
          />
        );
    }
  };

  return (
    <div 
      id="app-root-wrapper" 
      className={`h-full min-h-[100dvh] h-[100dvh] w-full ${viewThemeConfig.rootBg} flex flex-col p-0 m-0 font-sans overflow-hidden antialiased select-none relative transition-colors duration-200`}
    >
      
      {/* Phone Preset Switcher (desktop preview helper only) */}
      {activeView === 'main' && (
        <div className="hidden md:flex fixed top-2 right-3 items-center z-50">
          <button
            onClick={() => {
              const newModel = isIPhone ? 'tecno' : 'iphone';
              PhoneSettingsService.applyPreset(newModel);
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-lg backdrop-blur-md border border-slate-700/60 ${
              isIPhone ? 'bg-sky-600/90 text-white' : 'bg-emerald-700/90 text-white'
            }`}
            title="Toggle between iPhone (iOS) and Android modes"
          >
            <span>{isIPhone ? '🍎 iOS' : '🤖 Android'}</span>
          </button>
        </div>
      )}

      {/* Main Responsive Edge-to-Edge Canvas */}
      <div 
        id="app-main-canvas"
        className={`w-full h-full min-h-[100dvh] h-[100dvh] ${viewThemeConfig.rootBg} relative flex flex-col overflow-hidden border-none shadow-none rounded-none transition-colors duration-200`}
      >
        {/* Real-time Offline Warning Banner */}
        <OfflineBanner />


        {/* Dynamic View Panel Router */}
        <main className={`flex-1 flex flex-col min-h-0 scrollbar-none overflow-hidden ${
          activeView === 'admin'
            ? 'h-full overflow-y-auto overflow-x-hidden bg-slate-900 w-full max-w-full min-w-0'
            : activeView === 'sms' 
            ? (isIPhone ? 'h-full overflow-hidden bg-black' : 'h-full overflow-hidden bg-[#121212]') 
            : activeView === 'truecaller'
              ? (tcBaseTheme === 'light' ? 'h-full overflow-hidden bg-[#f8fafc]' : (tcBaseTheme === 'midnight' ? 'h-full overflow-hidden bg-[#0a1128]' : (isIPhone || tcBaseTheme === 'amoled' ? 'h-full overflow-hidden bg-black' : 'h-full overflow-hidden bg-[#121316]')))
              : activeView === 'phone'
                ? 'h-full overflow-hidden bg-black'
                : activeView === 'dashen'
                  ? 'h-full overflow-hidden bg-[#040b18]'
                  : activeView === 'telebirr'
                    ? 'h-full overflow-hidden bg-white'
                    : activeView === 'telegram'
                      ? 'h-full overflow-hidden bg-slate-900'
                      : activeView === 'receipt'
                        ? 'h-full overflow-hidden bg-white'
                        : activeView === 'webreceipt'
                          ? 'h-full overflow-hidden bg-[#f0f2f5]'
                          : 'h-full overflow-hidden'
        }`}>
          
          {activeView === 'auth' && (
            <Auth onLoginSuccess={handleLoginSuccess} />
          )}

          {activeView === 'webreceipt' && (
            <CbeWebReceiptModal
              standalone={true}
              initialPayload={standaloneWebReceiptData.payload}
              transaction={standaloneWebReceiptData.tx}
              smsMessage={standaloneWebReceiptData.sms}
              initialViewMode={standaloneWebReceiptData.payload?.viewMode || 'web'}
              onClose={() => {
                try {
                  window.close();
                } catch {}
                navigateTo('auth', 'home');
              }}
            />
          )}

          {activeView === 'main' && (
            <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">

              {/* Main Tab Content: Home, Transfer, Payments, History, Profile */}
              <div className="flex-1 min-h-0 w-full relative flex flex-col overflow-hidden">
                {renderTabContent()}
              </div>

              {/* Bottom navigation for secondary sub-tabs (payments, profile) */}
              {activeTab !== 'home' && activeTab !== 'history' && activeTab !== 'transfer' && (
                <Navigation 
                  activeTab={activeTab}
                  onChangeTab={(tab) => {
                    setActiveTab(tab);
                    try {
                      window.history.pushState({ view: 'main', tab }, '', window.location.pathname);
                    } catch {}
                    // Quick refresh of session model when tab changes
                    if (currentUser) {
                      const users = LocalDb.getUsers();
                      const match = users.find(u => u.id === currentUser.id);
                      if (match) {
                        setCurrentUser(match);
                      }
                    }
                  }}
                  currentUser={currentUser || undefined}
                  onOpenAdmin={() => navigateTo('admin', 'profile')}
                  showScanQr={false}
                />
              )}

              {/* Bottom Safe Area Pure White Base for iPhone */}
              <div 
                className="fixed bottom-0 inset-x-0 h-[max(env(safe-area-inset-bottom,0px),0px)] bg-white pointer-events-none z-30"
                aria-hidden="true"
              />
            </div>
          )}

          {activeView === 'receipt' && selectedTransaction && (
            <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative bg-white">
              <div className="flex-1 min-h-0 w-full overflow-hidden relative bg-white">
                <Receipt 
                  transaction={selectedTransaction}
                  onBack={() => {
                    const savedActiveId = localStorage.getItem('tana_active_user_id') || currentUser?.id || 'user_1';
                    const users = LocalDb.getUsers();
                    const match = users.find(u => u.id === savedActiveId);
                    if (match) {
                      setCurrentUser({ ...match });
                    }
                    setActiveView('main');
                    setActiveTab('home');
                    setSelectedTransaction(null);
                    try {
                      window.history.pushState({ view: 'main', tab: 'home' }, '', '/');
                    } catch {}
                  }}
                />
              </div>
            </div>
          )}

          {activeView === 'admin' && currentUser && (
            <AdminPanel 
              currentUser={currentUser}
              onBack={() => {
                // Refresh profile data just in case admin updated their parameters
                const users = LocalDb.getUsers();
                const match = users.find(u => u.id === currentUser.id);
                if (match) {
                  setCurrentUser(match);
                }
                setActiveView('main');
                setActiveTab('profile');
              }}
            />
          )}

          {activeView === 'sms' && (
            <ViewErrorBoundary
              viewName="SMS Messages Simulator"
              onBack={() => {
                navigateTo('main', returnTab);
              }}
            >
              <SmsPage 
                accountId={smsActiveAccountId}
                onBack={() => {
                  navigateTo('main', returnTab);
                }}
              />
            </ViewErrorBoundary>
          )}

          {activeView === 'truecaller' && (
            <ViewErrorBoundary
              viewName="Truecaller Simulator"
              onBack={() => {
                navigateTo('main', returnTab);
              }}
            >
              <TruecallerSimulator 
                onBack={() => {
                  navigateTo('main', returnTab);
                }}
              />
            </ViewErrorBoundary>
          )}

          {activeView === 'phone' && (
            <PhoneCallApp 
              currentUser={currentUser}
              onBack={() => {
                navigateTo('main', returnTab);
              }}
            />
          )}

          {activeView === 'dashen' && (
            <DashenBankApp 
              currentUser={currentUser}
              onBack={() => {
                navigateTo('main', returnTab);
              }}
              onOpenTelebirr={() => {
                navigateTo('telebirr', returnTab);
              }}
            />
          )}

          {activeView === 'telebirr' && (
            <TelebirrApp 
              currentUser={currentUser}
              onBack={() => {
                navigateTo('main', returnTab);
              }}
              onOpenDashen={() => {
                navigateTo('dashen', returnTab);
              }}
              onOpenCbe={() => {
                navigateTo('main', 'home');
              }}
              onOpenSms={() => {
                navigateTo('sms', returnTab);
              }}
              onOpenTelegram={() => {
                navigateTo('telegram', returnTab);
              }}
            />
          )}

          {activeView === 'telegram' && (
            <TelegramSimulatorApp 
              onBack={() => {
                navigateTo('telebirr', returnTab);
              }}
              onOpenTelebirr={() => {
                navigateTo('telebirr', returnTab);
              }}
              onOpenCbe={() => {
                navigateTo('main', 'home');
              }}
              onOpenDashen={() => {
                navigateTo('dashen', returnTab);
              }}
            />
          )}

        </main>

      </div>

      {/* Android / iPhone Recent Multitasking Apps Modal */}
      <PhoneRecentAppsModal 
        isOpen={isRecentAppsOpen}
        onClose={() => setIsRecentAppsOpen(false)}
        activeView={activeView as any}
        onSelectApp={(appId) => {
          setIsRecentAppsOpen(false);
          navigateTo(appId as any, 'home');
        }}
      />

      {/* Phone & Status Bar Settings Modal: Quick customize phone models, clock, battery, wifi, etc. */}
      <PhoneSettingsModal 
        isOpen={showPhoneSettingsModal}
        onClose={() => setShowPhoneSettingsModal(false)}
      />

      {/* Automatic Notification Permission Prompt for Sub-Applications (SMS Simulator, Truecaller, Telebirr, Dashen, Telegram, Phone) */}
      {(activeView === 'sms' ||
        activeView === 'truecaller' ||
        activeView === 'telebirr' ||
        activeView === 'dashen' ||
        activeView === 'telegram' ||
        activeView === 'phone') && (
        <SubAppPermissionBanner subAppId={activeView} />
      )}
    </div>
  );
}


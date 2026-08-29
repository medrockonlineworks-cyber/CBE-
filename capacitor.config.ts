export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime?: boolean;
  server?: {
    androidScheme?: string;
    cleartext?: boolean;
    url?: string;
  };
  android?: {
    allowMixedContent?: boolean;
    captureInput?: boolean;
    webContentsDebuggingEnabled?: boolean;
    backgroundColor?: string;
  };
  plugins?: {
    SplashScreen?: {
      launchShowDuration?: number;
      launchAutoHide?: boolean;
      backgroundColor?: string;
      androidSplashResourceName?: string;
      androidScaleType?: string;
      showSpinner?: boolean;
      splashFullScreen?: boolean;
      splashImmersive?: boolean;
    };
    StatusBar?: {
      style?: 'DARK' | 'LIGHT' | 'DEFAULT';
      backgroundColor?: string;
      overlaysWebView?: boolean;
    };
    NavigationBar?: {
      color?: string;
      darkButtons?: boolean;
    };
    Keyboard?: {
      resize?: 'body' | 'ionic' | 'native' | 'none';
      style?: 'DARK' | 'LIGHT' | 'DEFAULT';
      resizeOnFullScreen?: boolean;
    };
  };
}

const config: CapacitorConfig = {
  appId: 'et.cbe.tanadigitalbank',
  appName: 'Tana Digital Bank',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    cleartext: false
  },
  android: {
    backgroundColor: '#0f172a',
    webContentsDebuggingEnabled: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#1a0126',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#300642',
      overlaysWebView: true
    },
    NavigationBar: {
      color: '#0f172a',
      darkButtons: false
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true
    }
  }
};

export default config;

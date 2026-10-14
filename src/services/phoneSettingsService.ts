// Phone and Status Bar Settings Service
// Manages phone model types, status bar elements, and navigation bar styles across all apps

export type PhoneModelType = 'tecno' | 'samsung' | 'pixel' | 'iphone' | 'xiaomi';
export type NavigationBarStyle = 'buttons' | 'gesture' | 'none';
export type SoundMode = 'mute' | 'vibrate' | 'normal';
export type NetworkTech = 'H+' | '4G' | '5G' | 'LTE' | '3G' | 'None';

export interface PhoneSettings {
  phoneModel: PhoneModelType;
  timeString: string;
  useRealTime: boolean;
  batteryPercent: number;
  isCharging: boolean;
  networkSpeedText: string;
  showNetworkSpeed: boolean;
  sim1Network: NetworkTech;
  sim2Network: NetworkTech;
  showWifi: boolean;
  wifiBars: number;
  soundMode: SoundMode;
  showBluetooth: boolean;
  navBarStyle: NavigationBarStyle;
}

const STORAGE_KEY = 'tana_phone_settings_v1';
const EVENT_NAME = 'tana_phone_settings_changed';

export const PHONE_PRESETS: Record<PhoneModelType, PhoneSettings> = {
  tecno: {
    phoneModel: 'tecno',
    timeString: '11:33',
    useRealTime: false,
    batteryPercent: 75,
    isCharging: false,
    networkSpeedText: '0.00 KB/S',
    showNetworkSpeed: true,
    sim1Network: 'H+',
    sim2Network: '3G',
    showWifi: false,
    wifiBars: 4,
    soundMode: 'mute',
    showBluetooth: false,
    navBarStyle: 'buttons',
  },
  samsung: {
    phoneModel: 'samsung',
    timeString: '11:33',
    useRealTime: false,
    batteryPercent: 82,
    isCharging: false,
    networkSpeedText: '4.20 KB/S',
    showNetworkSpeed: false,
    sim1Network: '5G',
    sim2Network: '4G',
    showWifi: true,
    wifiBars: 4,
    soundMode: 'normal',
    showBluetooth: true,
    navBarStyle: 'gesture',
  },
  pixel: {
    phoneModel: 'pixel',
    timeString: '11:33',
    useRealTime: false,
    batteryPercent: 90,
    isCharging: false,
    networkSpeedText: '1.20 KB/S',
    showNetworkSpeed: false,
    sim1Network: '5G',
    sim2Network: 'None',
    showWifi: true,
    wifiBars: 4,
    soundMode: 'normal',
    showBluetooth: false,
    navBarStyle: 'gesture',
  },
  iphone: {
    phoneModel: 'iphone',
    timeString: '9:41',
    useRealTime: false,
    batteryPercent: 95,
    isCharging: false,
    networkSpeedText: '',
    showNetworkSpeed: false,
    sim1Network: '5G',
    sim2Network: 'None',
    showWifi: true,
    wifiBars: 4,
    soundMode: 'normal',
    showBluetooth: false,
    navBarStyle: 'gesture',
  },
  xiaomi: {
    phoneModel: 'xiaomi',
    timeString: '11:33',
    useRealTime: false,
    batteryPercent: 70,
    isCharging: false,
    networkSpeedText: '12.4 KB/S',
    showNetworkSpeed: true,
    sim1Network: '4G',
    sim2Network: '4G',
    showWifi: false,
    wifiBars: 4,
    soundMode: 'mute',
    showBluetooth: false,
    navBarStyle: 'buttons',
  },
};

export class PhoneSettingsService {
  private static cachedSettings: PhoneSettings | null = null;

  public static isIPhoneDevice(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isIos = /iPhone|iPad|iPod/i.test(ua);
    const isMacTouch = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return isIos || isMacTouch;
  }

  public static isIPhoneMode(): boolean {
    const current = this.getSettings();
    if (current.phoneModel === 'iphone') return true;
    if (['tecno', 'samsung', 'pixel', 'xiaomi'].includes(current.phoneModel)) return false;
    return this.isIPhoneDevice();
  }

  public static getSettings(): PhoneSettings {
    if (this.cachedSettings) {
      return { ...this.cachedSettings };
    }

    const defaultPreset = this.isIPhoneDevice() ? PHONE_PRESETS.iphone : PHONE_PRESETS.tecno;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.cachedSettings = {
          ...defaultPreset,
          ...parsed,
        };
        return { ...this.cachedSettings };
      }
    } catch {
      // Fallback
    }

    this.cachedSettings = { ...defaultPreset };
    return { ...this.cachedSettings };
  }

  public static updateSettings(partial: Partial<PhoneSettings>): PhoneSettings {
    const current = this.getSettings();
    const updated = {
      ...current,
      ...partial,
    };
    this.cachedSettings = updated;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
    } catch {
      // Non-blocking
    }

    return { ...updated };
  }

  public static applyPreset(model: PhoneModelType): PhoneSettings {
    const preset = PHONE_PRESETS[model] || PHONE_PRESETS.tecno;
    return this.updateSettings(preset);
  }

  public static resetToDefault(): PhoneSettings {
    return this.applyPreset('tecno');
  }

  public static subscribe(listener: (settings: PhoneSettings) => void): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<PhoneSettings>;
      if (customEvent.detail) {
        listener(customEvent.detail);
      } else {
        listener(this.getSettings());
      }
    };

    window.addEventListener(EVENT_NAME, handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
    };
  }

  public static formatCurrentClock(): string {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    hours = hours % 12 || 12;
    const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${minStr}`;
  }
}

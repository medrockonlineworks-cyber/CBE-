import React, { useRef, useState, useEffect, useMemo } from 'react';
import html2canvas from 'html2canvas-pro';
import QRCode from 'qrcode';
import { Transaction } from '../types';
import { 
  LocalDb, 
  DEFAULT_CBE_LOGO, 
  formatTo12CharTxId, 
  getAuthenticCbeQrSvgDataUri, 
  getAuthenticCbeQrMatrix, 
  getAuthenticCbeQrPngDataUrl 
} from '../lib/mockData';
import { calculateCbeFee } from '../lib/cbeTariff';
import { CbeLogo } from './CbeLogo';
import { CbeWebReceiptModal } from './CbeWebReceiptModal';
import { 
  Check, 
  Share2, 
  Download, 
  Printer, 
  ArrowLeft, 
  ShieldCheck, 
  AlertTriangle,
  Receipt as ReceiptLucideIcon,
  Camera,
  Scan,
  Focus,
  CheckCircle2,
  FileText,
  Loader2,
  Image as ImageIcon,
  Wifi,
  Sparkles,
  MessageSquare,
  X,
  RotateCcw,
  User,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Zap
} from 'lucide-react';
import { maskAccountNumber } from '../services/smsService';
import { PhoneSettingsService } from '../services/phoneSettingsService';

/**
 * Viewfinder focus screenshot icon matching exact reference (IMG_20260913_140907_194.jpg)
 * Features four enlarged surrounding corner brackets and an enlarged center circle ring
 * with an even, snug gap between the circle and brackets.
 */
function ScreenshotViewfinderIcon({ 
  className = "w-7 h-7 text-white",
  strokeWidth = 2.0 
}: { 
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {/* 4 Corner Viewfinder Brackets - scaled up with uniform gap to center circle */}
      {/* Top-Left */}
      <path d="M 3.8 8.2 V 6.0 A 2.2 2.2 0 0 1 6.0 3.8 H 8.2" />
      {/* Top-Right */}
      <path d="M 15.8 3.8 H 18.0 A 2.2 2.2 0 0 1 20.2 6.0 V 8.2" />
      {/* Bottom-Right */}
      <path d="M 20.2 15.8 V 18.0 A 2.2 2.2 0 0 1 18.0 20.2 H 15.8" />
      {/* Bottom-Left */}
      <path d="M 8.2 20.2 H 6.0 A 2.2 2.2 0 0 1 3.8 18.0 V 15.8" />
      {/* Enlarged center focus circle with refined line weight */}
      <circle cx="12" cy="12" r="4.4" />
    </svg>
  );
}

/**
 * Generates an authentic, high-density 33x33 QR matrix with Finder patterns,
 * Timing patterns, Alignment block, and unique deterministic data modules.
 */
export function getDenseQrMatrix(txId: string, payload: string): boolean[][] {
  const gridSize = 33;
  const matrix: boolean[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));

  // Helper to draw 7x7 Finder Pattern with quiet border
  const drawFinder = (startRow: number, startCol: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = startRow + r;
        const col = startCol + c;
        if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
          if (r === -1 || r === 7 || c === -1 || c === 7) {
            matrix[row][col] = false; // Quiet separator
          } else if (r === 0 || r === 6 || c === 0 || c === 6) {
            matrix[row][col] = true; // Outer 7x7 ring
          } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
            matrix[row][col] = true; // Inner 3x3 solid block
          } else {
            matrix[row][col] = false; // Middle ring
          }
        }
      }
    }
  };

  // 1. Finder patterns at 3 corners
  drawFinder(0, 0); // Top-Left
  drawFinder(0, gridSize - 7); // Top-Right
  drawFinder(gridSize - 7, 0); // Bottom-Left

  // 2. Timing patterns (alternating black/white at row 6 & col 6)
  for (let i = 8; i < gridSize - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // 3. Standard Alignment pattern (5x5 module) at center (24, 24)
  const alignCenter = 24;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const row = alignCenter + r;
      const col = alignCenter + c;
      if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
        if (Math.abs(r) === 2 || Math.abs(c) === 2) {
          matrix[row][col] = true; // Outer 5x5 ring
        } else if (r === 0 && c === 0) {
          matrix[row][col] = true; // Center 1x1 dot
        } else {
          matrix[row][col] = false;
        }
      }
    }
  }

  // 4. Dark Module
  matrix[gridSize - 8][8] = true;

  // 5. Seed-based high-density data modules unique to this transaction
  const seedString = `${txId}|${payload}|CBE_RECEIPT_V4_ETH`;
  let hash1 = 5381;
  let hash2 = 0x811c9dc5;
  for (let i = 0; i < seedString.length; i++) {
    const code = seedString.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) + code;
    hash2 = (hash2 ^ code) * 16777619;
  }

  const isReserved = (r: number, c: number): boolean => {
    if (r <= 7 && c <= 7) return true;
    if (r <= 7 && c >= gridSize - 8) return true;
    if (r >= gridSize - 8 && c <= 7) return true;
    if (r === 6 || c === 6) return true;
    if (r >= alignCenter - 2 && r <= alignCenter + 2 && c >= alignCenter - 2 && c <= alignCenter + 2) return true;
    return false;
  };

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (isReserved(r, c)) continue;
      
      const charIndex = (r * 11 + c * 17) % seedString.length;
      const charCode = seedString.charCodeAt(charIndex);
      const val = Math.abs((r * 31 + c * 47 + charCode * 13 + (hash1 ^ (hash2 >>> (r % 16)))) % 100);
      
      // High data density ~56%
      matrix[r][c] = val < 56;
    }
  }

  return matrix;
}

// Helper for authentic CBE currency formatting: e.g. 100.00, 1,000.00, 136,748.00
export const formatCbeCurrency = (val: number | string | undefined): string => {
  const num = typeof val === 'number' ? val : parseFloat(String(val || '0'));
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

interface ReceiptProps {
  transaction: Transaction;
  onBack: () => void;
}

export default function Receipt({ transaction, onBack }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [showDetailedModal, setShowDetailedModal] = useState(false);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashAnimation, setFlashAnimation] = useState(false);
  const [statusTime, setStatusTime] = useState<string>(() => {
    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const mins = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins}`;
  });

  const [isIPhone, setIsIPhone] = useState<boolean>(() => PhoneSettingsService.isIPhoneMode());

  useEffect(() => {
    return PhoneSettingsService.subscribe(() => {
      setIsIPhone(PhoneSettingsService.isIPhoneMode());
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const hours = now.getHours() % 12 || 12;
      const mins = now.getMinutes().toString().padStart(2, '0');
      setStatusTime(`${hours}:${mins}`);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Real device phone power & battery condition detection (Battery Status API with smart fallback)
  const [batteryLevel, setBatteryLevel] = useState<number>(92);
  const [isPhoneCharging, setIsPhoneCharging] = useState<boolean>(false);

  useEffect(() => {
    let batteryManager: any = null;

    const handleBatteryUpdate = (battery: any) => {
      if (battery && typeof battery.level === 'number') {
        const levelPct = Math.round(battery.level * 100);
        setBatteryLevel(Math.max(1, Math.min(100, levelPct)));
        setIsPhoneCharging(Boolean(battery.charging));
      }
    };

    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        batteryManager = battery;
        handleBatteryUpdate(battery);

        battery.addEventListener('levelchange', () => handleBatteryUpdate(battery));
        battery.addEventListener('chargingchange', () => handleBatteryUpdate(battery));
      }).catch(() => {
        // Fallback gracefully
      });
    }

    return () => {
      if (batteryManager) {
        try {
          batteryManager.removeEventListener('levelchange', () => handleBatteryUpdate(batteryManager));
          batteryManager.removeEventListener('chargingchange', () => handleBatteryUpdate(batteryManager));
        } catch {
          // Ignore cleanup error
        }
      }
    };
  }, []);

  // Dynamic customized feedback assets
  const [customBankLogo, setCustomBankLogo] = useState<string | null>(null);
  const [customQrCode, setCustomQrCode] = useState<string | null>(() => LocalDb.getCustomQrCode());
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Screenshot capture & preview modal states
  const [capturedScreenshotUrl, setCapturedScreenshotUrl] = useState<string | null>(null);
  const [showScreenshotModal, setShowScreenshotModal] = useState<boolean>(false);

  // Double-tap/click to toggle hiding action controls (top-right icon and bottom action buttons: receipt, screenshot, share)
  const [hideUiElements, setHideUiElements] = useState<boolean>(false);

  const toggleUiElements = () => {
    setHideUiElements(prev => {
      const next = !prev;
      showBarsToast(next ? 'Controls hidden (Tap screen to return)' : 'Controls restored');
      return next;
    });
  };

  // Double-tap/click to hide status bar (on iPhone, status bar is always hidden by default)
  const [hideStatusBar, setHideStatusBar] = useState<boolean>(() => {
    try {
      if (PhoneSettingsService.isIPhoneMode()) return true;
      return localStorage.getItem('cbe_hide_status_bar') === 'true' || localStorage.getItem('cbe_hide_phone_bars') === 'true';
    } catch {
      return PhoneSettingsService.isIPhoneMode();
    }
  });

  const toggleStatusBar = () => {
    setHideStatusBar(prev => {
      const next = !prev;
      try {
        localStorage.setItem('cbe_hide_status_bar', String(next));
      } catch {}
      showBarsToast(next ? 'Status bar hidden' : 'Status bar restored');
      return next;
    });
  };

  const shouldShowStatusBar = !isIPhone && !hideStatusBar && !isCapturing && !hideUiElements;

  const [barsToast, setBarsToast] = useState<string | null>(null);
  const barsToastTimerRef = useRef<any>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const isTouchRef = useRef<boolean>(false);

  const showBarsToast = (msg: string) => {
    if (barsToastTimerRef.current) clearTimeout(barsToastTimerRef.current);
    setBarsToast(msg);
    barsToastTimerRef.current = setTimeout(() => {
      setBarsToast(null);
    }, 2200);
  };

  const handleDoubleAction = () => {
    if (isIPhone) {
      onBack();
    } else {
      toggleStatusBar();
    }
  };

  const handleScreenTouchStart = (e: React.TouchEvent) => {
    if (e.touches && e.touches[0]) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleScreenClick = (e: React.MouseEvent) => {
    if (isTouchRef.current) {
      isTouchRef.current = false;
      return;
    }
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }

    // When in clean screenshot view mode (like Image 1), clicking anywhere navigates back to Home
    if (hideUiElements) {
      onBack();
      return;
    }

    const now = Date.now();
    const timeDiff = now - lastTapRef.current.time;
    const dist = Math.hypot(e.clientX - lastTapRef.current.x, e.clientY - lastTapRef.current.y);

    if (timeDiff > 50 && timeDiff < 450 && dist < 50) {
      handleDoubleAction();
      lastTapRef.current = { time: 0, x: 0, y: 0 };
    } else {
      lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
    }
  };

  const handleScreenTouchEnd = (e: React.TouchEvent) => {
    isTouchRef.current = true;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }
    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;

    // Edge swipe back gesture (standard iOS back swipe)
    if (touchStartXRef.current < 50 && deltaX > 60 && Math.abs(deltaY) < 60) {
      onBack();
      return;
    }

    // When in clean screenshot view mode (like Image 1), tapping anywhere navigates back to Home
    if (hideUiElements) {
      onBack();
      return;
    }

    const now = Date.now();
    const timeDiff = now - lastTapRef.current.time;
    const dist = Math.hypot(touch.clientX - lastTapRef.current.x, touch.clientY - lastTapRef.current.y);

    if (timeDiff > 50 && timeDiff < 450 && dist < 65) {
      handleDoubleAction();
      lastTapRef.current = { time: 0, x: 0, y: 0 };
    } else {
      lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };
    }
  };

  const handleScreenDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }
    handleDoubleAction();
  };

  useEffect(() => {
    setCustomBankLogo(LocalDb.getCustomBankLogo());
    setCustomQrCode(LocalDb.getCustomQrCode());

    const handleUpdate = () => {
      setCustomBankLogo(LocalDb.getCustomBankLogo());
    };
    const handleQrUpdate = () => {
      setCustomQrCode(LocalDb.getCustomQrCode());
    };
    window.addEventListener('cbe_logo_updated', handleUpdate);
    window.addEventListener('cbe_qr_updated', handleQrUpdate);
    window.addEventListener('storage', handleQrUpdate);
    return () => {
      window.removeEventListener('cbe_logo_updated', handleUpdate);
      window.removeEventListener('cbe_qr_updated', handleQrUpdate);
      window.removeEventListener('storage', handleQrUpdate);
    };
  }, []);

  // Mathematical computations with CBE rules
  const amount = transaction.amount;
  const cbeFee = calculateCbeFee(amount, transaction.type, false);
  const serviceCharge = transaction.serviceCharge !== undefined 
    ? transaction.serviceCharge 
    : (transaction.fee > 0 ? transaction.fee : cbeFee.serviceCharge);
  const vat = transaction.vat !== undefined 
    ? transaction.vat 
    : Number((serviceCharge * 0.15).toFixed(2));
  const disasterRecovery = transaction.disasterRecovery !== undefined 
    ? transaction.disasterRecovery 
    : Number((serviceCharge * 0.05).toFixed(2));
  const totalDebited = transaction.totalDebited !== undefined 
    ? transaction.totalDebited 
    : Number((amount + serviceCharge + vat + disasterRecovery).toFixed(2));

  const amountFormatted = formatCbeCurrency(amount);
  const totalDebitedFormatted = formatCbeCurrency(totalDebited);
  const serviceChargeFormatted = formatCbeCurrency(serviceCharge);
  const vatFormatted = formatCbeCurrency(vat);
  const disasterRecoveryFormatted = formatCbeCurrency(disasterRecovery);

  const totalDebitedStr = totalDebitedFormatted;
  const serviceChargeStr = serviceChargeFormatted;
  const vatStr = vatFormatted;
  const disasterRecoveryStr = disasterRecoveryFormatted;

  // Formatting Sender & Recipient names & account suffixes
  const isCredit = transaction.type === 'receive' || transaction.senderName === 'Deposit';
  const senderName = transaction.senderName || "Leykun Jemaneh Ylma";
  const rawSenderAccount = transaction.senderAccount || "4747";
  const senderSuffix = rawSenderAccount.length >= 4 
    ? `ETB-${rawSenderAccount.slice(-4)}` 
    : `ETB-4747`;

  const recipientName = transaction.recipientName || "Addisu Abebe Mengistu";
  const rawRecipientAccount = transaction.recipientAccount || "6547";
  const recipientSuffix = rawRecipientAccount.length >= 4 && !rawRecipientAccount.includes('+251')
    ? `ETB-${rawRecipientAccount.slice(-4)}` 
    : `ETB-6547`;

  const cbeSenderFullName = transaction.senderName || "Leykun Jemaneh Ylma";
  const rawSenderClean = rawSenderAccount.replace(/\D/g, '') || '1000419524747';
  const maskedSenderAcc = maskAccountNumber(rawSenderClean);
  const rawRecipientClean = rawRecipientAccount.replace(/\D/g, '') || '1000284758657';
  const maskedRecipientAcc = maskAccountNumber(rawRecipientClean);

  const formattedAmt = (transaction.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  const senderBalanceNum = transaction.senderAccount
    ? (LocalDb.getAllAccounts().find(a => a.accountNumber === transaction.senderAccount)?.balance ?? 9999499976.0)
    : 9999499976.0;
  const formattedBal = senderBalanceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Dynamic realistic CBE Transaction ID: 12 characters exactly (e.g. FT263211VK07)
  const txId = formatTo12CharTxId(transaction.id);

  const receiptUrl = `https://mbreceipt.cbe.com.et/v2-${txId}`;
  const feedbackUrl = 'https://forms.gle/kGNGQpG3mQCCk3iD6';

  const cleanSenderDisplayName = cbeSenderFullName.replace(/\s*\(Admin\)/i, '').replace(/\s*\(\d{4}\)/, '').trim() || 'Leykun Jemaneh Ylma';

  // Date formatting: e.g. "Aug 21, 2026 05:56 PM"
  const formatSummaryDate = (dateInput: any) => {
    const d = new Date(dateInput);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hourStr = hours.toString().padStart(2, '0');
    
    return `${month} ${day}, ${year} ${hourStr}:${minutes} ${ampm}`;
  };

  const formattedDate = formatSummaryDate(transaction.createdAt);

  const reason = transaction.description || 'Mobile Banking Transfer';

  // Memoized dynamic authentic CBE QR Code SVG Data URI generated uniquely for this transaction (Version 3, 29x29 modules, IMG_20260916_103244_278.png)
  const txQrSvgDataUri = useMemo(() => {
    return getAuthenticCbeQrSvgDataUri(txId);
  }, [txId]);

  // Memoized authentic 29x29 Version 3 QR Matrix for this transaction
  const qrMatrix = useMemo(() => {
    return getAuthenticCbeQrMatrix(txId);
  }, [txId]);

  // Generate dynamic authentic CBE QR code PNG data URL for downloads and canvas
  useEffect(() => {
    getAuthenticCbeQrPngDataUrl(txId, 450)
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR code generation failed:', err));
  }, [txId]);

  // Print handle
  const handlePrint = () => {
    window.print();
  };

  // Generate pixel-perfect CBE Mobile Phone Screenshot identical to user's uploaded reference (Image 1)
  const generateCanvasReceipt = async (hideButtons: boolean = false, forceHideStatusBar: boolean = true): Promise<string> => {
    const width = 720;
    const height = 1520;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');

    // Smooth rendering
    ctx.imageSmoothingEnabled = true;

    // 1. Phone Top Status Bar & Purple Background (iPhone Dynamic Island Header)
    // When capturing a screenshot, status bar is always excluded matching Image 1
    const hasStatusBar = !forceHideStatusBar && !hideButtons && !hideStatusBar && !isIPhone;
    ctx.fillStyle = '#68137e';
    ctx.fillRect(0, 0, width, hasStatusBar ? 220 : 180);

    if (hasStatusBar) {
      // Current Time for Status Bar (iOS standard format)
      const now = new Date();
      let statusHours = now.getHours();
      const statusMinutes = now.getMinutes().toString().padStart(2, '0');
      const statusTimeStr = `${statusHours % 12 || 12}:${statusMinutes}`;

      // 1A. Status Bar - Left: Time
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(statusTimeStr, 44, 42);

      // 1B. Status Bar - Right: Cellular 4-Bars, Wi-Fi, and iOS Battery
      // 4 Cellular Bars (iOS Stepped Rounded Bars)
      const cellX = width - 136;
      for (let b = 0; b < 4; b++) {
        ctx.fillStyle = '#ffffff';
        const bHeight = 4 + b * 3.5;
        ctx.beginPath();
        ctx.roundRect(cellX + b * 4.5, 42 - bHeight, 3, bHeight, 1);
        ctx.fill();
      }

    // iOS Wi-Fi Icon (3 concentric curved arcs)
    const wifiX = width - 105;
    const wifiY = 40;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    
    // Outer Arc
    ctx.beginPath();
    ctx.arc(wifiX, wifiY, 8.5, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.stroke();
    // Middle Arc
    ctx.beginPath();
    ctx.arc(wifiX, wifiY, 5.5, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.stroke();
    // Center Dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(wifiX, wifiY - 0.5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // iOS Battery Icon (Dynamic Real Device Battery Fill + Charging condition)
    const battX = width - 82;
    const battY = 28;
    const battW = 30;
    const battH = 15;
    
    // Battery Outer Border
    ctx.strokeStyle = isPhoneCharging ? '#4ade80' : '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(battX, battY, battW, battH, 4);
    ctx.stroke();

    // Battery Positive Terminal Knob on Right
    ctx.fillStyle = isPhoneCharging ? '#4ade80' : '#ffffff';
    ctx.beginPath();
    ctx.roundRect(battX + battW + 1.5, battY + 4, 2, 7, 1);
    ctx.fill();

    // Battery Inner Charge Level (Dynamically computed from actual device battery level)
    const fillMaxW = battW - 5;
    const fillW = Math.max(3, (fillMaxW * Math.min(100, Math.max(4, batteryLevel))) / 100);
    ctx.fillStyle = isPhoneCharging ? '#4ade80' : (batteryLevel <= 20 ? '#ef4444' : '#ffffff');
    ctx.beginPath();
    ctx.roundRect(battX + 2.5, battY + 2.5, fillW, battH - 5, 2.5);
    ctx.fill();

    // If device is currently plugged in & charging, draw iOS lightning bolt in canvas
    if (isPhoneCharging) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      const zX = battX + battW / 2;
      const zY = battY + battH / 2;
      ctx.moveTo(zX + 1, zY - 5);
      ctx.lineTo(zX - 3.5, zY);
      ctx.lineTo(zX, zY);
      ctx.lineTo(zX - 1, zY + 5);
      ctx.lineTo(zX + 3.5, zY);
      ctx.lineTo(zX, zY);
      ctx.closePath();
      ctx.fill();
    }
  }

    // 2. Top Purple Header: "Thank you / Success" & Top Scan Button
    // White Shield with Purple Checkmark (sharp crisp edges matching reference)
    const shieldX = 36;
    const shieldY = hasStatusBar ? 106 : 56;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const sX = shieldX;
    const sY = shieldY;
    ctx.moveTo(sX + 18, sY + 2);
    ctx.lineTo(sX + 33, sY + 7);
    ctx.lineTo(sX + 33, sY + 18);
    ctx.bezierCurveTo(sX + 33, sY + 28, sX + 24, sY + 34, sX + 18, sY + 39);
    ctx.bezierCurveTo(sX + 12, sY + 34, sX + 3, sY + 28, sX + 3, sY + 18);
    ctx.lineTo(sX + 3, sY + 7);
    ctx.closePath();
    ctx.fill();

    // Purple checkmark inside shield with sharp edges and miter corner (reduced weight matching reference)
    ctx.strokeStyle = '#68137e';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 4;
    ctx.beginPath();
    ctx.moveTo(sX + 12.0, sY + 18.3);
    ctx.lineTo(sX + 16.5, sY + 22.8);
    ctx.lineTo(sX + 25.8, sY + 13.5);
    ctx.stroke();
    ctx.restore();

    // "Thank you" & "Success" text
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText('Thank you', shieldX + 46, shieldY + 18);
    ctx.fillStyle = '#f3e8ff';
    ctx.font = '400 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('Success', shieldX + 46, shieldY + 38);

    // Top Right Viewfinder / Scan Button (hidden when taking screenshot)
    if (!hideButtons) {
      const scanBtnX = width - 82;
      const scanBtnY = 96;
      const btnRadius = 22;
      const btnCx = scanBtnX + btnRadius;
      const btnCy = scanBtnY + btnRadius;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.arc(btnCx, btnCy, btnRadius, 0, Math.PI * 2);
      ctx.fill();

      // Map 24x24 SVG coordinates to 28px icon inside canvas button
      const s = 28 / 24;
      const toCanvasX = (svgX: number) => btnCx + (svgX - 12) * s;
      const toCanvasY = (svgY: number) => btnCy + (svgY - 12) * s;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8 * s;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Top-left bracket
      ctx.beginPath();
      ctx.moveTo(toCanvasX(3.8), toCanvasY(8.2));
      ctx.lineTo(toCanvasX(3.8), toCanvasY(6.0));
      ctx.arcTo(toCanvasX(3.8), toCanvasY(3.8), toCanvasX(6.0), toCanvasY(3.8), 2.2 * s);
      ctx.lineTo(toCanvasX(8.2), toCanvasY(3.8));
      ctx.stroke();

      // Top-right bracket
      ctx.beginPath();
      ctx.moveTo(toCanvasX(15.8), toCanvasY(3.8));
      ctx.lineTo(toCanvasX(18.0), toCanvasY(3.8));
      ctx.arcTo(toCanvasX(20.2), toCanvasY(3.8), toCanvasX(20.2), toCanvasY(6.0), 2.2 * s);
      ctx.lineTo(toCanvasX(20.2), toCanvasY(8.2));
      ctx.stroke();

      // Bottom-right bracket
      ctx.beginPath();
      ctx.moveTo(toCanvasX(20.2), toCanvasY(15.8));
      ctx.lineTo(toCanvasX(20.2), toCanvasY(18.0));
      ctx.arcTo(toCanvasX(20.2), toCanvasY(20.2), toCanvasX(18.0), toCanvasY(20.2), 2.2 * s);
      ctx.lineTo(toCanvasX(15.8), toCanvasY(20.2));
      ctx.stroke();

      // Bottom-left bracket
      ctx.beginPath();
      ctx.moveTo(toCanvasX(8.2), toCanvasY(20.2));
      ctx.lineTo(toCanvasX(6.0), toCanvasY(20.2));
      ctx.arcTo(toCanvasX(3.8), toCanvasY(20.2), toCanvasX(3.8), toCanvasY(18.0), 2.2 * s);
      ctx.lineTo(toCanvasX(3.8), toCanvasY(15.8));
      ctx.stroke();

      // Center circle ring - enlarged matching second image with uniform gap
      ctx.beginPath();
      ctx.arc(btnCx, btnCy, 4.4 * s, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Main White Card
    const cardTop = hasStatusBar ? 180 : 136;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(0, cardTop, width, height - cardTop - 60, [36, 36, 0, 0]);
    ctx.fill();

    // 4. Overlapping Large Success Checkmark Circle (Sharp edge, white half-circle on top only, no bottom circle, no shadow)
    const badgeX = width / 2;
    const badgeY = cardTop;
    const badgeR = 60;
    const archWidth = 10;
    ctx.save();
    
    // Solid purple base circle
    ctx.fillStyle = '#68137e';
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fill();

    // Top-half white semi-circle arch ONLY (flat base on cardTop, sharp corner with card edge)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR + archWidth, Math.PI, 2 * Math.PI, false);
    ctx.lineTo(badgeX + badgeR, badgeY);
    ctx.arc(badgeX, badgeY, badgeR, 2 * Math.PI, Math.PI, true);
    ctx.closePath();
    ctx.fill();

    // Big Bold Crisp White Checkmark with sharp ends and miter elbow (extended right arm matching reference)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 11;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 4;
    ctx.beginPath();
    ctx.moveTo(badgeX - 32.4, badgeY + 0.8);
    ctx.lineTo(badgeX - 9.5, badgeY + 23.7);
    ctx.lineTo(badgeX + 41.1, badgeY - 26.8);
    ctx.stroke();
    ctx.restore();

    // 5. Headline Text (Normal weight as requested)
    ctx.fillStyle = '#111827';
    ctx.font = 'normal 21px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Transaction Completed Successfully!', width / 2, cardTop + 90);

    // 6. Gray Transaction Summary Box
    const boxX = 32;
    const boxY = cardTop + 120;
    const boxW = width - 64;
    const boxH = 920;

    ctx.fillStyle = '#ededf0';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 26);
    ctx.fill();

    // "Transaction Summary" Subtitle
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8e8e93';
    ctx.font = 'normal 17px system-ui, -apple-system, sans-serif';
    ctx.fillText('Transaction Summary', boxX + 26, boxY + 40);

    // Structured Rich Text Rendering with bolding support
    type TextFragment = { text: string; bold: boolean };
    const fragments: TextFragment[] = isCredit ? [
      { text: 'ETB ', bold: false },
      { text: `${amountFormatted}`, bold: true },
      { text: ' has been credited to ', bold: false },
      { text: `${recipientName}`, bold: true },
      { text: ` ${recipientSuffix} from `, bold: false },
      { text: `${senderName}`, bold: true },
      { text: ` ${senderSuffix} on `, bold: false },
      { text: `${formattedDate}`, bold: true },
      { text: ' with transaction ID: ', bold: false },
      { text: `${txId}.`, bold: true },
      { text: ` Reason: ${reason}`, bold: false }
    ] : [
      { text: 'ETB ', bold: false },
      { text: `${amountFormatted}`, bold: true },
      { text: ' has been debited from ', bold: false },
      { text: `${senderName}`, bold: true },
      { text: ` ${senderSuffix} for `, bold: false },
      { text: `${recipientName}`, bold: true },
      { text: ` ${recipientSuffix} on `, bold: false },
      { text: `${formattedDate}`, bold: true },
      { text: ' with transaction ID: ', bold: false },
      { text: `${txId}.`, bold: true },
      { text: ` Reason: ${reason} `, bold: false },
      { text: `Total Amount Debited: ETB${totalDebitedFormatted} with Service Charge of ETB${serviceChargeFormatted}, VAT (15%) of ETB${vatFormatted} and Disaster Recovery (5%) of ETB${disasterRecoveryFormatted}.`, bold: false }
    ];

    let cursorX = boxX + 26;
    let cursorY = boxY + 75;
    const textMaxWidth = boxW - 52;
    const lineHeight = 30;

    for (const frag of fragments) {
      if (frag.text.includes('\n')) {
        const parts = frag.text.split('\n');
        for (let p = 0; p < parts.length; p++) {
          if (p > 0) {
            cursorX = boxX + 26;
            cursorY += lineHeight;
          }
          if (parts[p]) {
            renderWordWrapped(parts[p], frag.bold);
          }
        }
      } else {
        renderWordWrapped(frag.text, frag.bold);
      }
    }

    function renderWordWrapped(str: string, isBold: boolean) {
      const words = str.split(' ');
      for (let i = 0; i < words.length; i++) {
        const w = (i === 0 ? '' : ' ') + words[i];
        ctx.font = isBold 
          ? 'bold 19px system-ui, -apple-system, sans-serif' 
          : 'normal 18px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#111827';

        const metrics = ctx.measureText(w);
        if (cursorX + metrics.width > boxX + 26 + textMaxWidth) {
          cursorX = boxX + 26;
          cursorY += lineHeight;
        }
        ctx.fillText(w, cursorX, cursorY);
        cursorX += metrics.width;
      }
    }

    // Helper to load image for canvas
    const loadImageAsync = (url: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image for canvas'));
        img.src = url;
      });
    };

    // 7. Authentic Centered QR Code with rounded grey border matching reference (IMG_20260916_103244_278.png)
    const qrInnerSize = 208;
    const qrPadding = 18;
    const qrBoxSize = qrInnerSize + qrPadding * 2; // 244px
    const qrBoxX = (width - qrBoxSize) / 2;
    const qrBoxY = boxY + 355;
    const qrInnerX = qrBoxX + qrPadding;
    const qrInnerY = qrBoxY + qrPadding;

    // Draw outer rounded rectangle container with grey border
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 34);
    ctx.fill();

    ctx.strokeStyle = '#737373';
    ctx.lineWidth = 5.5;
    ctx.stroke();
    ctx.restore();

    let qrImageLoaded = false;
    const activeQrUrl = customQrCode || qrDataUrl || (await getAuthenticCbeQrPngDataUrl(txId, 450));

    if (activeQrUrl) {
      try {
        const qrImg = await loadImageAsync(activeQrUrl);
        ctx.drawImage(qrImg, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);
        qrImageLoaded = true;
      } catch (err) {
        console.warn('QR image load failed for canvas, rendering fallback matrix:', err);
      }
    }

    if (!qrImageLoaded) {
      // Draw authentic 29x29 Version 3 QR Code Modules for this specific transaction
      const matrix = qrMatrix;
      const gridSize = matrix.length; // 29
      const cellSize = qrInnerSize / gridSize;
      ctx.fillStyle = '#000000';

      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (matrix[r][c]) {
            ctx.beginPath();
            ctx.rect(qrInnerX + c * cellSize, qrInnerY + r * cellSize, cellSize, cellSize);
            ctx.fill();
          }
        }
      }
    }

    // 8. Commercial Bank of Ethiopia Footer Inset
    const logoX = boxX + 36;
    const logoY = qrBoxY + qrBoxSize + 36;
    const activeLogoUrl = customBankLogo || LocalDb.getCustomBankLogo() || DEFAULT_CBE_LOGO || '/custom-bank-logo.png';

    let logoImageLoaded = false;
    const candidates = Array.from(new Set([activeLogoUrl, '/custom-bank-logo.png'].filter(Boolean))) as string[];
    for (const url of candidates) {
      if (logoImageLoaded) break;
      try {
        const logoImg = await loadImageAsync(url);
        ctx.drawImage(logoImg, logoX, logoY - 4, 46, 46);
        logoImageLoaded = true;
      } catch (err) {
        console.warn(`Custom logo candidate ${url} load failed for canvas:`, err);
      }
    }
    
    if (!logoImageLoaded) {
      // Draw Golden CBE Coin Logo
      ctx.save();
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(logoX + 22, logoY + 16, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#996515';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Spiral/Coin internal concentric lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      for (let r = 5; r <= 16; r += 5) {
        ctx.beginPath();
        ctx.arc(logoX + 22, logoY + 16, r, 0, Math.PI * 1.8);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Branding text
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.fillText('Commercial Bank of Ethiopia', logoX + 56, logoY + 12);

    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 15px system-ui, -apple-system, sans-serif';
    ctx.fillText('The bank you can always rely on!', logoX + 56, logoY + 34);

    // 9. Bottom Action Buttons: Receipt, Screenshot, Share (hidden when taking screenshot)
    const actY = boxY + boxH + 34;

    if (!hideButtons) {
      // Button 1: Receipt
      const b1X = 90;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.strokeRect(b1X - 24, actY - 14, 16, 20);
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.fillText('$', b1X - 19, actY + 1);
      ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
      ctx.fillText('Receipt', b1X, actY);

      // Button 2: Screenshot
      const b2X = width / 2 - 40;
      const sIcoX = b2X - 22;
      const sIcoY = actY - 14;
      const sz = 18;
      const cr = 4;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // 4 rounded corners
      // Top-left
      ctx.beginPath();
      ctx.moveTo(sIcoX, sIcoY + cr + 1);
      ctx.lineTo(sIcoX, sIcoY + 2);
      ctx.arcTo(sIcoX, sIcoY, sIcoX + 2, sIcoY, 2);
      ctx.lineTo(sIcoX + cr + 1, sIcoY);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(sIcoX + sz - cr - 1, sIcoY);
      ctx.lineTo(sIcoX + sz - 2, sIcoY);
      ctx.arcTo(sIcoX + sz, sIcoY, sIcoX + sz, sIcoY + 2, 2);
      ctx.lineTo(sIcoX + sz, sIcoY + cr + 1);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(sIcoX, sIcoY + sz - cr - 1);
      ctx.lineTo(sIcoX, sIcoY + sz - 2);
      ctx.arcTo(sIcoX, sIcoY + sz, sIcoX + 2, sIcoY + sz, 2);
      ctx.lineTo(sIcoX + cr + 1, sIcoY + sz);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(sIcoX + sz - cr - 1, sIcoY + sz);
      ctx.lineTo(sIcoX + sz - 2, sIcoY + sz);
      ctx.arcTo(sIcoX + sz, sIcoY + sz, sIcoX + sz, sIcoY + sz - 2, 2);
      ctx.lineTo(sIcoX + sz, sIcoY + sz - cr - 1);
      ctx.stroke();
      // Center circle
      ctx.beginPath();
      ctx.arc(sIcoX + sz / 2, sIcoY + sz / 2, 3.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
      ctx.fillText('Screenshot', b2X + 4, actY);

      // Button 3: Share
      const b3X = width - 150;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      // 3 share nodes
      ctx.beginPath();
      ctx.arc(b3X - 18, actY - 4, 3, 0, Math.PI * 2);
      ctx.arc(b3X - 8, actY - 11, 3, 0, Math.PI * 2);
      ctx.arc(b3X - 8, actY + 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(b3X - 18, actY - 4); ctx.lineTo(b3X - 8, actY - 11);
      ctx.moveTo(b3X - 18, actY - 4); ctx.lineTo(b3X - 8, actY + 3);
      ctx.stroke();
      ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
      ctx.fillText('Share', b3X, actY);
    }

    // 10. Close Button (Pill) & 11. iPhone Bottom Home Indicator (hidden when taking screenshot)
    if (!hideButtons) {
      const closeBtnY = actY + 28;
      ctx.fillStyle = '#d7d7db';
      ctx.beginPath();
      ctx.roundRect(32, closeBtnY, width - 64, 58, 29);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 19px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Close', width / 2, closeBtnY + 36);

      // 11. iPhone Bottom Home Indicator
      const navY = height - 48;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, navY, width, 48);

      // Centered iOS Home Indicator Bar
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect((width - 200) / 2, height - 24, 200, 7, 3.5);
      ctx.fill();
    }

    return canvas.toDataURL('image/png');
  };

  // Handle screenshot button or icon click: takes screenshot without status bar & navigates to clean view
  const handleScreenshotAction = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    await handleScreenshot();
  };

  // Screenshot / Save handle - takes complete clean receipt without status bar (matching Image 1)
  const handleScreenshot = async () => {
    if (isCapturing) return;

    try {
      setIsCapturing(true);

      // 1. Shutter flash effect
      setFlashAnimation(true);
      setTimeout(() => setFlashAnimation(false), 250);

      // Generate pristine canvas receipt without phone status bar, including complete authentic elements (Image 1)
      let dataUrl: string | null = null;
      try {
        dataUrl = await generateCanvasReceipt(false, true);
      } catch (canvasErr) {
        console.warn('Direct canvas render issue, trying DOM capture:', canvasErr);
      }

      if (!dataUrl) {
        const receiptEl = document.getElementById('receipt-screen-wrapper');
        if (receiptEl) {
          try {
            const canvas = await html2canvas(receiptEl, {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#68137e',
              logging: false,
              ignoreElements: (element) => {
                return element.getAttribute('data-html2canvas-ignore') === 'true' ||
                  element.id === 'receipt-status-bar';
              }
            });
            dataUrl = canvas.toDataURL('image/png');
          } catch (captureErr) {
            console.warn('html2canvas capture issue:', captureErr);
          }
        }
      }

      if (!dataUrl) {
        dataUrl = await generateCanvasReceipt(false, true);
      }

      if (dataUrl) {
        setCapturedScreenshotUrl(dataUrl);
        setShowScreenshotModal(true);

        // Instant download to device with native screenshot filename
        try {
          const downloadLink = document.createElement('a');
          const filename = `screenshot_${Date.now()}.png`;
          downloadLink.href = dataUrl;
          downloadLink.download = filename;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        } catch (dlErr) {
          console.warn('Direct download anchor failed:', dlErr);
        }
      }

      setCopiedToast('Screenshot captured • Tap Close to return');
      setTimeout(() => setCopiedToast(null), 3000);
    } catch (err) {
      console.error('Screenshot capture error:', err);
      setCopiedToast('Screenshot captured');
      setTimeout(() => setCopiedToast(null), 2500);
    } finally {
      setIsCapturing(false);
      setHideUiElements(false);
    }
  };

  // Share handle
  const handleShare = async () => {
    const summaryText = `ETB ${amount} has been debited from ${senderName} ${senderSuffix} for ${recipientName} ${recipientSuffix} on ${formattedDate} with transaction ID: ${txId}. Reason: ${reason}. Total Amount Debited: ${totalDebitedStr} ETB.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `CBE Receipt - ${txId}`,
          text: summaryText,
          url: window.location.href,
        });
      } catch (e) {
        console.log('Share canceled or failed', e);
      }
    } else {
      navigator.clipboard.writeText(summaryText);
      setCopiedToast('Transaction summary copied to clipboard!');
      setTimeout(() => setCopiedToast(null), 2500);
    }
  };

  return (
    <div 
      id="receipt-screen-wrapper" 
      onClick={handleScreenClick}
      onDoubleClick={handleScreenDoubleClick}
      onTouchStart={handleScreenTouchStart}
      onTouchEnd={handleScreenTouchEnd}
      className="h-full min-h-[100dvh] max-w-md mx-auto bg-[#68137e] text-slate-800 flex flex-col justify-between relative overflow-y-auto scrollbar-none select-none cursor-pointer"
    >
      
      {/* Floating Home Back Button when in clean screenshot view mode (like Image 1) */}
      {hideUiElements && (
        <button
          type="button"
          data-html2canvas-ignore="true"
          onClick={onBack}
          className="fixed top-3 left-3 z-50 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition active:scale-95 flex items-center gap-1 cursor-pointer animate-in fade-in"
          title="Return to Home"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </button>
      )}

      {/* Camera Flash Animation Overlay */}
      {flashAnimation && (
        <div 
          data-html2canvas-ignore="true"
          className="fixed inset-0 bg-white z-[100] pointer-events-none opacity-90 transition-opacity duration-300" 
        />
      )}

      {/* Double Tap Floating Notification Toast */}
      {barsToast && (
        <div 
          data-html2canvas-ignore="true"
          className="fixed top-5 left-1/2 -translate-x-1/2 bg-gray-950/95 backdrop-blur-md text-white text-[12px] font-semibold py-2 px-4 rounded-full shadow-2xl z-[90] flex items-center gap-2 border border-white/20 pointer-events-none animate-in fade-in zoom-in-95 duration-200"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>{barsToast}</span>
        </div>
      )}

      {/* Toast Notification */}
      {copiedToast && (
        <div 
          data-html2canvas-ignore="true"
          className="fixed top-5 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-md text-white text-xs font-bold py-2.5 px-5 rounded-full shadow-2xl z-50 animate-bounce flex items-center gap-2 border border-white/20"
        >
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* 1. Phone Top Status Bar (Time, Cellular, Wi-Fi, Battery) - Excluded on iPhone & during screenshot capture */}
      {shouldShowStatusBar && (
        <div 
          id="receipt-status-bar"
          data-html2canvas-ignore="true"
          className="w-full pt-2.5 pb-1 px-5 flex items-center justify-between text-white select-none z-20 flex-shrink-0 transition-opacity duration-200"
        >
          {/* Left: Time */}
          <div className="text-left">
            <span className="font-semibold text-[13px] sm:text-[14px] tracking-tight font-sans text-white/95 drop-shadow-xs">
              {statusTime}
            </span>
          </div>

          {/* Right: Cellular 4-Bars, Wi-Fi, and Battery Indicator */}
          <div className="w-16 sm:w-20 flex items-center justify-end gap-1.5 text-white">
            {/* Cellular 4-Bars */}
            <div className="flex items-end gap-[1.5px] h-3" title="Cellular Full Signal">
              <div className="w-[3px] h-1.5 bg-white rounded-[0.5px]" />
              <div className="w-[3px] h-2 bg-white rounded-[0.5px]" />
              <div className="w-[3px] h-2.5 bg-white rounded-[0.5px]" />
              <div className="w-[3px] h-3 bg-white rounded-[0.5px]" />
            </div>

            {/* Wi-Fi Icon */}
            <span title="Wi-Fi Connected" className="flex items-center">
              <Wifi className="w-3.5 h-3.5 text-white stroke-[2.4]" />
            </span>

            {/* iOS Battery with Real Phone Battery Percentage & Charging State */}
            <div 
              className="flex items-center gap-[2px]" 
              title={`Phone Battery: ${batteryLevel}% ${isPhoneCharging ? '(Charging ⚡)' : ''}`}
            >
              {/* Battery Body with Dynamic Real Phone Power Fill */}
              <div className={`h-3 rounded-[3.5px] border-[1.5px] p-[1px] flex items-center relative transition-colors ${
                isPhoneCharging 
                  ? 'border-emerald-400 bg-emerald-950/40' 
                  : (batteryLevel <= 20 ? 'border-red-400 bg-red-950/30' : 'border-white bg-black/15')
              } ${batteryLevel === 100 ? 'w-6' : 'w-5.5'}`}>
                <div 
                  className={`h-full rounded-[1px] transition-all duration-500 ${
                    isPhoneCharging 
                      ? 'bg-emerald-400' 
                      : (batteryLevel <= 20 ? 'bg-red-400' : 'bg-white')
                  }`}
                  style={{ width: `${Math.max(8, Math.min(100, batteryLevel))}%` }}
                />
                {isPhoneCharging && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Zap className="w-2.5 h-2.5 text-white fill-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                  </div>
                )}
              </div>
              {/* Battery Terminal Knob */}
              <div className={`w-[1.5px] h-1.5 rounded-r-[1px] ${
                isPhoneCharging 
                  ? 'bg-emerald-400' 
                  : (batteryLevel <= 20 ? 'bg-red-400' : 'bg-white')
              }`} />

              {/* Battery Percentage Number */}
              <span className="text-[10px] font-bold text-white leading-none ml-0.5 tracking-tight select-none">
                {batteryLevel}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Top Purple Navigation / App Header */}
      <div className={`${isIPhone ? 'pt-[max(env(safe-area-inset-top,0px),24px)]' : (shouldShowStatusBar ? 'pt-2 sm:pt-3' : 'pt-7 sm:pt-8')} pb-8 px-5 bg-[#68137e] flex items-center justify-between text-white flex-shrink-0`}>
        <div className="flex items-center gap-2.5">
          {/* iOS Top Back Button to navigate like the first image */}
          <button
            type="button"
            data-html2canvas-ignore="true"
            onClick={onBack}
            className="p-1.5 -ml-1.5 text-white hover:text-purple-200 active:opacity-70 transition flex items-center cursor-pointer rounded-full"
            title="Return to Home"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
          </button>

          {/* Solid White Shield with Purple Checkmark Icon perfectly fitted matching reference image */}
          <div className="w-8.5 h-8.5 flex-shrink-0 flex items-center justify-center">
            <svg className="w-8.5 h-8.5 drop-shadow-xs" viewBox="0 0 24 24" fill="none">
              <path 
                d="M12 2.2c0.3 0 0.6 0.1 0.9 0.2l6.5 2.6c0.5 0.2 0.8 0.7 0.8 1.2v5.6c0 4.8-3.0 9.2-7.5 10.7-.5 0.2-1.0 0.2-1.4 0-4.5-1.5-7.5-5.9-7.5-10.7V6.2c0-.5.3-1 .8-1.2l6.5-2.6c.3-.1.6-.2.9-.2z" 
                fill="#ffffff" 
              />
              <path 
                d="M8.0 12.2L11.0 15.2L17.2 9.0" 
                stroke="#68137e" 
                strokeWidth="1.9" 
                strokeLinecap="butt" 
                strokeLinejoin="miter" 
                strokeMiterlimit="4"
                shapeRendering="geometricPrecision"
              />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-[16px] sm:text-[17px] leading-tight text-white tracking-tight">Thank you</h2>
            <p className="text-[12px] sm:text-[13px] text-purple-100 font-normal leading-tight mt-0.5">Success</p>
          </div>
        </div>

        {/* Screenshot Button (Translucent circular badge with enlarged focus viewfinder) */}
        {!hideUiElements && !isCapturing && (
          <button 
            type="button"
            data-html2canvas-ignore="true"
            onClick={handleScreenshotAction}
            className="w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center transition text-white cursor-pointer shadow-xs"
            title="Take screenshot without status bar"
          >
            <ScreenshotViewfinderIcon className="w-7 h-7 text-white" strokeWidth={1.8} />
          </button>
        )}
      </div>

      {/* Main White Sheet Container */}
      <div className="bg-white rounded-t-[32px] sm:rounded-t-[36px] flex-1 px-4 sm:px-5 pt-0 pb-5 flex flex-col justify-between shadow-none relative">
        
        {/* Overlapping Large Success Checkmark Badge (Sharp edge, white half-circle on top only, no bottom circle, no shadow) */}
        <div className="relative flex justify-center flex-shrink-0">
          <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-0 w-[90px] h-[90px] sm:w-[98px] sm:h-[98px] pointer-events-none select-none z-10">
            <svg 
              viewBox="0 0 90 90" 
              className="w-full h-full block" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* 1. Purple Base Circle (radius 38, centered at 45, 45) */}
              <circle cx="45" cy="45" r="38" fill="#68137e" />

              {/* 2. Top-Half White Semi-Circle Arch Only:
                  Outer radius = 45 (touches horizontal line at x=0 and x=90, y=45)
                  Inner radius = 38 (touches purple circle)
                  Only on top (y <= 45). Flat base at y=45 forms sharp 90-degree corners with the white card edge!
              */}
              <path 
                d="M 0,45 A 45,45 0 0,1 90,45 L 83,45 A 38,38 0 0,0 7,45 Z" 
                fill="#ffffff" 
              />

              {/* 3. Bold Crisp White Checkmark with extended right arm and sharp ends matching reference image */}
              <path
                d="M 24.5 45.5 L 39.0 60.0 L 71.0 28.0"
                fill="none"
                stroke="#ffffff"
                strokeWidth="7.2"
                strokeLinecap="butt"
                strokeLinejoin="miter"
                strokeMiterlimit="4"
                shapeRendering="geometricPrecision"
              />
            </svg>
          </div>
        </div>

        {/* Spacer for the overlapping badge */}
        <div className="h-12 sm:h-13 flex-shrink-0" />

        <div className="space-y-3 flex-1 flex flex-col justify-center">
          {/* Headline */}
          <h1 className="text-center text-[15px] sm:text-[16px] font-medium text-black tracking-tight">
            Transaction Completed Successfully!
          </h1>

          {/* Main Transaction Summary Gray Card */}
          <div 
            ref={receiptRef}
            className="bg-[#f2f3f5] rounded-[24px] p-4 sm:p-5 space-y-3.5 border border-gray-200/50 shadow-xs"
          >
            <p className="text-[#8e8e93] font-normal text-[13.5px] sm:text-[14px]">Transaction Summary</p>

            {/* Paragraph Text with bold highlights matching CBE reference */}
            {isCredit ? (
              <p className="text-[14px] sm:text-[15px] leading-[1.62] text-[#1a1a1a] font-normal select-text">
                ETB <span className="font-bold text-black">{amountFormatted}</span> has been credited to <span className="font-bold text-black">{recipientName}</span> {recipientSuffix} from <span className="font-bold text-black">{senderName}</span> {senderSuffix} on <span className="font-bold text-black">{formattedDate}</span> with transaction ID: <span className="font-bold text-black">{txId}.</span> Reason: {reason}
              </p>
            ) : (
              <p className="text-[14px] sm:text-[15px] leading-[1.62] text-[#1a1a1a] font-normal select-text">
                ETB <span className="font-bold text-black">{amountFormatted}</span> has been debited from <span className="font-bold text-black">{senderName}</span> {senderSuffix} for <span className="font-bold text-black">{recipientName}</span> {recipientSuffix} on <span className="font-bold text-black">{formattedDate}</span> with transaction ID: <span className="font-bold text-black">{txId}.</span> Reason: {reason} Total Amount Debited: ETB{totalDebitedFormatted} with Service Charge of ETB{serviceChargeFormatted}, VAT (15%) of ETB{vatFormatted} and Disaster Recovery (5%) of ETB{disasterRecoveryFormatted}.
              </p>
            )}

            {/* Realistic QR Code Centered with authentic rounded grey frame */}
            <div className="flex justify-center py-1.5">
              <div 
                id="receipt-qr-container"
                className="bg-white p-2.5 sm:p-3 rounded-[24px] border-[3px] border-[#737373] shadow-xs inline-flex items-center justify-center select-none"
              >
                <div className="w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center">
                  {customQrCode ? (
                    <img 
                      src={customQrCode} 
                      alt={`Transaction ${txId} QR Code`} 
                      className="w-full h-full object-contain block"
                    />
                  ) : txQrSvgDataUri ? (
                    <img 
                      src={txQrSvgDataUri} 
                      alt={`Transaction ${txId} QR Code`} 
                      className="w-full h-full object-contain block"
                    />
                  ) : qrDataUrl ? (
                    <img 
                      src={qrDataUrl} 
                      alt={`Transaction ${txId} QR Code`} 
                      className="w-full h-full object-contain block"
                    />
                  ) : (
                    /* Authentic 29x29 Version 3 Matrix fallback */
                    <div 
                      className="grid gap-[1px] w-full h-full bg-white p-0.5"
                      style={{ gridTemplateColumns: `repeat(${qrMatrix.length}, minmax(0, 1fr))` }}
                    >
                      {qrMatrix.flatMap((row, rIdx) =>
                        row.map((filled, cIdx) => (
                          <div 
                            key={`${rIdx}-${cIdx}`} 
                            className={`rounded-[0.2px] ${
                              filled ? 'bg-black' : 'bg-transparent'
                            }`}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Commercial Bank of Ethiopia Footer Inset */}
            <div className="flex items-center gap-2.5 pt-1 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 flex items-center justify-center">
                <CbeLogo className="w-8 h-8 sm:w-9 sm:h-9" src={customBankLogo} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-gray-900 text-[13.5px] sm:text-[14.5px] leading-tight whitespace-nowrap overflow-hidden text-ellipsis">Commercial Bank of Ethiopia</h4>
                <p className="text-gray-500 text-[10.5px] sm:text-[11.5px] font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis mt-0.5">The bank you can always rely on!</p>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Actions Section - Hidden on double-tap screen or toggle button */}
        {!hideUiElements && !isCapturing && (
          <div data-html2canvas-ignore="true" className="mt-4 space-y-3.5 flex-shrink-0">
            {/* 3 Action Buttons matching exact app icons */}
            <div className="flex items-center justify-around px-3 text-black">
              {/* Receipt Button */}
              <button 
                type="button"
                id="btn-action-receipt"
                onClick={() => setShowDetailedModal(true)}
                className="flex items-center gap-2 text-[13.5px] font-medium text-black hover:text-purple-900 transition active:scale-95 cursor-pointer py-1 px-2 rounded-xl"
              >
                {/* Document with 2 top-left horizontal lines, folded top-right corner, and $ sign icon */}
                <div className="relative w-4 h-[18px] bg-black rounded-[2.5px] flex flex-col justify-between p-[2px] text-white flex-shrink-0 overflow-hidden">
                  {/* Folded top-right corner */}
                  <div className="absolute -top-[0.5px] -right-[0.5px] w-[5.5px] h-[5.5px] bg-[#f8f9fa] border-b border-l border-black" />
                  
                  {/* Top-left two horizontal lines */}
                  <div className="flex flex-col gap-[1.5px] w-[7px] pt-[0.5px] pl-[0.5px]">
                    <div className="h-[1.2px] w-full bg-white rounded-full" />
                    <div className="h-[1.2px] w-4/5 bg-white rounded-full" />
                  </div>

                  {/* Centered $ symbol */}
                  <div className="flex items-center justify-center flex-1">
                    <span className="text-[9px] font-black font-sans leading-none mt-0.5">$</span>
                  </div>
                </div>
                <span>Receipt</span>
              </button>

              {/* Screenshot Button: takes screenshot without status bar and navigates to clean view */}
              <button 
                type="button"
                id="btn-action-screenshot"
                onClick={handleScreenshotAction}
                className="flex items-center gap-2 text-[13.5px] font-medium text-black hover:text-purple-900 transition active:scale-95 cursor-pointer py-1 px-2 rounded-xl"
                title="Take screenshot without status bar"
              >
                <ScreenshotViewfinderIcon className="w-[18px] h-[18px] text-black" strokeWidth={1.8} />
                <span>Screenshot</span>
              </button>

              {/* Share Button */}
              <button 
                type="button"
                id="btn-action-share"
                onClick={handleShare}
                className="flex items-center gap-2 text-[13.5px] font-medium text-black hover:text-purple-900 transition active:scale-95 cursor-pointer py-1 px-2 rounded-xl"
              >
                <Share2 className="w-[18px] h-[18px] stroke-[2.2] fill-black text-black" />
                <span>Share</span>
              </button>
            </div>

            {/* Full-width Close Pill Button */}
            <button 
              type="button"
              id="btn-action-close"
              onClick={onBack}
              className="w-full bg-[#d7d7db] hover:bg-[#ceced3] active:bg-[#c4c4c9] text-[#333333] font-bold py-3.5 rounded-full text-[15px] transition active:scale-[0.99] cursor-pointer shadow-xs mb-1"
            >
              Close
            </button>
          </div>
        )}

        {/* When in Clean Screenshot Mode (matching Image 1) */}
        {hideUiElements && (
          <div data-html2canvas-ignore="true" className="pt-4 pb-2 flex flex-col items-center justify-center shrink-0">
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-neutral-400 hover:text-neutral-700 transition flex items-center gap-1.5 py-1.5 px-4 rounded-full bg-neutral-100 hover:bg-neutral-200 cursor-pointer shadow-2xs active:scale-95"
            >
              <span>Tap anywhere to return to Home</span>
            </button>
          </div>
        )}

      </div>

      {/* Official CBE Customer Receipt Web Page when User Clicks 'Receipt' */}
      {showDetailedModal && (
        <CbeWebReceiptModal 
          transaction={transaction}
          initialQrCode={customQrCode || txQrSvgDataUri || qrDataUrl}
          onClose={() => setShowDetailedModal(false)} 
        />
      )}

      {/* iOS Screenshot Preview Sheet Modal */}
      {showScreenshotModal && capturedScreenshotUrl && (
        <div 
          data-html2canvas-ignore="true"
          className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200 select-none"
        >
          {/* Top Bar: Done & Navigation Title */}
          <div className="flex items-center justify-between text-white pt-safe pb-2">
            <button
              type="button"
              onClick={() => setShowScreenshotModal(false)}
              className="text-base font-semibold text-white/90 hover:text-white px-3.5 py-1.5 rounded-full bg-white/10 active:scale-95 transition cursor-pointer"
            >
              Done
            </button>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
              Clean Screenshot
            </span>
            <button
              type="button"
              onClick={() => {
                setShowScreenshotModal(false);
                onBack();
              }}
              className="text-sm font-semibold text-amber-300 hover:text-amber-200 px-3 py-1.5 rounded-full bg-amber-400/20 active:scale-95 transition flex items-center gap-1 cursor-pointer"
            >
              <span>Home</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Screenshot Preview Image */}
          <div className="flex-1 flex items-center justify-center p-2 min-h-0 overflow-hidden">
            <img 
              src={capturedScreenshotUrl} 
              alt="CBE Clean Receipt Screenshot" 
              className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl border border-white/20"
            />
          </div>

          {/* Bottom Actions: Save to Photos, Share, and Return to Home */}
          <div className="space-y-2.5 pt-3 pb-safe max-w-sm mx-auto w-full">
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={capturedScreenshotUrl}
                download={`screenshot_${Date.now()}.png`}
                className="w-full bg-[#70189F] hover:bg-[#8320b9] text-white font-bold py-3 rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-lg active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Save to Photos</span>
              </a>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch(capturedScreenshotUrl);
                    const blob = await res.blob();
                    const file = new File([blob], `cbe_receipt_${txId}.png`, { type: 'image/png' });
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                      await navigator.share({
                        files: [file],
                        title: `CBE Receipt ${txId}`,
                        text: `CBE Transaction Receipt ${txId}`
                      });
                    } else {
                      await handleShare();
                    }
                  } catch {
                    handleShare();
                  }
                }}
                className="w-full bg-white/15 hover:bg-white/25 text-white font-bold py-3 rounded-2xl text-xs transition flex items-center justify-center gap-2 border border-white/20 active:scale-95 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowScreenshotModal(false);
                onBack();
              }}
              className="w-full bg-white hover:bg-gray-100 text-purple-950 font-extrabold py-3.5 rounded-2xl text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <span>Return to Home Screen</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}


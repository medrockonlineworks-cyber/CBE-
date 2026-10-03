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
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { 
  captureReceiptElement, 
  saveAndShareReceiptImage, 
  getSafeReceiptFilename 
} from '../services/receiptScreenshotService';
import { renderAuthenticReceiptToCanvas } from '../services/receiptCanvasService';

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
  const screenshotExportRef = useRef<HTMLDivElement>(null);
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

  // Dynamic customized feedback assets (uploaded CBE logo & QR code)
  const [customBankLogo, setCustomBankLogo] = useState<string | null>(() => LocalDb.getCustomBankLogo());
  const [customQrCode, setCustomQrCode] = useState<string | null>(() => LocalDb.getCustomQrCode());
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const handleLogoSync = () => {
      setCustomBankLogo(LocalDb.getCustomBankLogo());
    };
    window.addEventListener('cbe_logo_updated', handleLogoSync);
    window.addEventListener('bank_logo_updated', handleLogoSync);
    window.addEventListener('storage', handleLogoSync);
    return () => {
      window.removeEventListener('cbe_logo_updated', handleLogoSync);
      window.removeEventListener('bank_logo_updated', handleLogoSync);
      window.removeEventListener('storage', handleLogoSync);
    };
  }, []);

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

  // Save receipt image directly to device gallery / camera roll
  const saveImageToGallery = async (dataUrl: string) => {
    try {
      const result = await saveAndShareReceiptImage(dataUrl, txId, false);
      if (result.saved) {
        setCopiedToast('Saved to device Photos / Gallery');
        setTimeout(() => setCopiedToast(null), 3000);
      }
    } catch (err) {
      console.warn('Save to gallery issue:', err);
      setCopiedToast('Could not save image to gallery');
      setTimeout(() => setCopiedToast(null), 3000);
    }
  };

  // Share captured receipt screenshot image
  const handleShareScreenshotImage = async (dataUrl: string) => {
    try {
      await saveAndShareReceiptImage(dataUrl, txId, true);
    } catch (err) {
      console.warn('Share image issue:', err);
      handleShare();
    }
  };

  // Screenshot handler: captures EXACT receipt matching Image 1 (transaction-receipt-FT261701JD29.png)
  const handleScreenshot = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (isCapturing) return;

    try {
      setIsCapturing(true);

      // 1. Shutter camera flash animation overlay
      setFlashAnimation(true);
      setTimeout(() => setFlashAnimation(false), 250);

      // 2. Capture exact receipt with original top design and completely white bottom
      let dataUrl: string | null = null;
      const element = screenshotExportRef.current || receiptRef.current;
      if (element) {
        try {
          dataUrl = await captureReceiptElement(element);
        } catch (captureErr) {
          console.warn('[Screenshot] DOM capture error, running high-fidelity canvas fallback:', captureErr);
        }
      }

      // Fallback if needed: high-fidelity canvas renderer
      if (!dataUrl) {
        const qrUrl = customQrCode || qrDataUrl || txQrSvgDataUri;
        dataUrl = await renderAuthenticReceiptToCanvas({
          transaction,
          amountFormatted,
          senderName,
          senderSuffix,
          recipientName,
          recipientSuffix,
          formattedDate,
          txId,
          reason,
          totalDebitedFormatted,
          serviceChargeFormatted,
          vatFormatted,
          disasterRecoveryFormatted,
          isCredit,
          qrDataUrl: qrUrl,
          customBankLogo
        });
      }

      if (dataUrl) {
        setCapturedScreenshotUrl(dataUrl);
        setShowScreenshotModal(true);

        // 3. Cross-platform safe preparation (Android, iOS, Browser/PWA)
        try {
          const result = await saveAndShareReceiptImage(dataUrl, txId, false);
          if (result.saved) {
            setCopiedToast('Full receipt screenshot captured!');
            setTimeout(() => setCopiedToast(null), 3000);
          }
        } catch (saveErr) {
          console.warn('[Screenshot] Background save notice:', saveErr);
        }
      }
    } catch (err) {
      console.error('Screenshot capture error:', err);
      setCopiedToast('Could not capture receipt. Please try again.');
      setTimeout(() => setCopiedToast(null), 3000);
    } finally {
      setIsCapturing(false);
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

      {/* 1. Phone Top Status Bar & Receipt Master Container (Captures EXACT receipt view matching Image 2 on Android & iOS) */}
      <div 
        ref={receiptRef}
        id="cbe-full-receipt-capture-target"
        className="w-full flex-1 flex flex-col justify-between bg-[#68137e] relative select-none"
      >
        {/* Phone Top Status Bar (Time, Cellular, Wi-Fi, Battery) - Authentic Android / iOS phone bar */}
        {shouldShowStatusBar && (
          <div 
            id="receipt-status-bar"
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

        {/* 2. RECEIPT CONTENT CONTAINER */}
        <div 
          id="cbe-existing-receipt"
          className="w-full flex-1 flex flex-col bg-[#68137e] relative select-none"
        >
          {/* Top Purple Navigation / App Header */}
          <div className={`${isIPhone ? 'pt-[max(env(safe-area-inset-top,0px),24px)]' : (shouldShowStatusBar ? 'pt-2 sm:pt-3' : 'pt-7 sm:pt-8')} pb-8 px-5 bg-[#68137e] flex items-center justify-between text-white flex-shrink-0`}>
            <div className="flex items-center gap-2.5">
              {/* Top Back Button */}
              <button
                type="button"
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

            {/* Screenshot Button (Translucent circular badge with enlarged focus viewfinder) - hidden during screenshot capture */}
            {!hideUiElements && !isCapturing && (
              <button 
                type="button"
                id="btn-top-screenshot"
                data-screenshot-exclude="true"
                onClick={handleScreenshot}
                className="w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center transition text-white cursor-pointer shadow-xs"
                title="Take screenshot of receipt"
              >
                <ScreenshotViewfinderIcon className="w-7 h-7 text-white" strokeWidth={1.8} />
              </button>
            )}
          </div>

          {/* Main White Sheet Container */}
          <div className="bg-white rounded-t-[32px] sm:rounded-t-[36px] flex-1 px-4 sm:px-5 pt-0 pb-6 flex flex-col justify-between shadow-none relative">
            
            {/* Overlapping Large Success Checkmark Badge (matching IMG_0135.png) */}
            <div className="relative flex justify-center flex-shrink-0">
              <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-0 w-[90px] h-[90px] pointer-events-none select-none z-10">
                <svg 
                  viewBox="0 0 90 90" 
                  className="w-full h-full block" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Purple Circle with crisp White Outer Ring */}
                  <circle cx="45" cy="45" r="41.5" stroke="#ffffff" strokeWidth="6" fill="#68137e" />
                  {/* Bold Crisp White Checkmark */}
                  <path
                    d="M 25.5 45.5 L 39.0 59.0 L 68.0 30.0"
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
              <div className="bg-[#f2f3f5] rounded-[24px] p-4 sm:p-5 space-y-3 border border-gray-200/50 shadow-xs">
                <p className="text-[#8e8e93] font-normal text-[13.5px] sm:text-[14px]">Transaction Summary</p>

                {/* Paragraph Text with bold highlights matching CBE reference */}
                {isCredit ? (
                  <p className="text-[14px] sm:text-[14.5px] leading-[1.58] text-[#1a1a1a] font-normal select-text">
                    ETB <span className="font-bold text-black">{amountFormatted}</span> has been credited to <span className="font-bold text-black">{recipientName}</span> {recipientSuffix} from <span className="font-bold text-black">{senderName}</span> {senderSuffix} on <span className="font-bold text-black">{formattedDate}</span> with transaction ID: <span className="font-bold text-black">{txId}.</span> Reason: {reason}
                  </p>
                ) : (
                  <p className="text-[14px] sm:text-[14.5px] leading-[1.58] text-[#1a1a1a] font-normal select-text">
                    ETB <span className="font-bold text-black">{amountFormatted}</span> has been debited from <span className="font-bold text-black">{senderName}</span> {senderSuffix} for <span className="font-bold text-black">{recipientName}</span> {recipientSuffix} on <span className="font-bold text-black">{formattedDate}</span> with transaction ID: <span className="font-bold text-black">{txId}.</span> Reason: {reason} Total Amount Debited: ETB{totalDebitedFormatted} with Service Charge of ETB{serviceChargeFormatted}, VAT (15%) of ETB{vatFormatted} and Disaster Recovery (5%) of ETB{disasterRecoveryFormatted}.
                  </p>
                )}

                {/* Realistic QR Code Centered with authentic rounded grey frame */}
                <div className="flex justify-center pt-3 sm:pt-3.5 pb-2">
                  <div 
                    id="receipt-qr-container"
                    className="bg-white p-2 sm:p-2.5 rounded-[22px] border-[2.8px] border-[#737373] shadow-xs inline-flex items-center justify-center select-none"
                  >
                    <div className="w-34 h-34 sm:w-38 sm:h-38 flex items-center justify-center">
                      {customQrCode ? (
                        <img 
                          src={customQrCode} 
                          alt={`Transaction ${txId} QR Code`} 
                          className="w-full h-full object-contain block"
                        />
                      ) : qrDataUrl ? (
                        <img 
                          src={qrDataUrl} 
                          alt={`Transaction ${txId} QR Code`} 
                          className="w-full h-full object-contain block"
                        />
                      ) : txQrSvgDataUri ? (
                        <img 
                          src={txQrSvgDataUri} 
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

                {/* Commercial Bank of Ethiopia Footer Inset matching reference screenshot */}
                <div 
                  id="cbe-receipt-bottom-bar"
                  className="flex items-center gap-3.5 pt-2 pb-1 px-1.5 min-w-0 w-full"
                >
                  <div 
                    id="cbe-receipt-logo-container"
                    className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center"
                  >
                    <CbeLogo className="w-11 h-11 sm:w-12 sm:h-12 object-contain" src={customBankLogo} />
                  </div>
                  <div className="min-w-0 flex-1 text-left flex flex-col justify-center">
                    <h4 className="font-bold text-[#1f2937] text-[13.5px] sm:text-[14px] leading-tight tracking-tight">
                      Commercial Bank of Ethiopia
                    </h4>
                    <p className="text-[#6b7280] text-[11px] sm:text-[11.5px] font-normal leading-tight mt-0.5 tracking-tight">
                      The bank you can always rely on!
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* 3. Bottom Actions Section (Receipt, Screenshot, Share, Close) - Included in screenshot matching Image 2 */}
        {!hideUiElements && (
          <div 
            id="cbe-receipt-bottom-actions-container"
            className="bg-white px-4 sm:px-5 pb-5 space-y-3.5 flex-shrink-0 select-none"
          >
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

              {/* Screenshot Button: takes screenshot of existing receipt */}
              <button 
                type="button"
                id="btn-action-screenshot"
                onClick={handleScreenshot}
                className="flex items-center gap-2 text-[13.5px] font-medium text-black hover:text-purple-900 transition active:scale-95 cursor-pointer py-1 px-2 rounded-xl"
                title="Take screenshot"
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
      </div>

      {/* When in Clean Screenshot Mode (matching Image 1) */}
      {hideUiElements && (
        <div data-html2canvas-ignore="true" data-screenshot-exclude="true" className="pt-4 pb-2 flex flex-col items-center justify-center shrink-0 bg-white">
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-neutral-400 hover:text-neutral-700 transition flex items-center gap-1.5 py-1.5 px-4 rounded-full bg-neutral-100 hover:bg-neutral-200 cursor-pointer shadow-2xs active:scale-95"
          >
            <span>Tap anywhere to return to Home</span>
          </button>
        </div>
      )}
      {/* Official CBE Customer Receipt Web Page when User Clicks 'Receipt' */}
      {showDetailedModal && (
        <CbeWebReceiptModal 
          transaction={transaction}
          initialQrCode={customQrCode || txQrSvgDataUri || qrDataUrl}
          onClose={() => setShowDetailedModal(false)} 
        />
      )}

      {/* 
        ========================================================================
        AUTHENTIC CBE RECEIPT SCREENSHOT EXPORT TARGET (EXACT MATCH TO IMAGE 1)
        - Pure CBE purple top (#68137e) with white shield + "Thank you" / "Success" on left
        - NO status bar, NO back arrow (<), NO viewfinder camera button
        - Main white sheet with rounded top ONLY (rounded-t-[36px], rounded-b-none)
        - Overlapping large purple checkmark badge with crisp white outer ring
        - "Transaction Completed Successfully!"
        - Light gray card (#f2f3f5) with Transaction Summary, debited details,
          authentic QR code with rounded frame, and CBE Gold Emblem + slogan
        - BOTTOM PART IS COMPLETELY WHITE LIKE IMAGE ONE (NO purple strip, NO rounded bottom)
        - ZERO bottom buttons (NO Receipt, NO Screenshot, NO Share, NO Close)
        ========================================================================
      */}
      <div 
        ref={screenshotExportRef}
        id="cbe-screenshot-exact-target"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '420px',
          zIndex: -100,
          pointerEvents: 'none',
          opacity: 1,
          backgroundColor: '#ffffff',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        <div className="w-full bg-white text-slate-800 flex flex-col font-sans select-none">
          {/* Top Purple Header: Exact original top design matching live screen with clean top purple space */}
          <div className="pt-16 pb-8 px-5 bg-[#68137e] flex items-center justify-between text-white flex-shrink-0">
            <div className="flex items-center gap-2.5">
              {/* Solid White Shield with Purple Checkmark */}
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
            {/* Top right is clean: NO status bar, NO camera icon */}
          </div>

          {/* Main White Sheet Container with rounded top ONLY and completely white bottom matching Image 1 */}
          <div className="bg-white rounded-t-[36px] rounded-b-none mx-0 px-4 sm:px-5 pt-0 pb-12 flex flex-col shadow-none relative">
            
            {/* Overlapping Large Success Checkmark Badge (with full outer white ring matching Image 1) */}
            <div className="relative flex justify-center flex-shrink-0">
              <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-0 w-[90px] h-[90px] pointer-events-none select-none z-10">
                <svg 
                  viewBox="0 0 90 90" 
                  className="w-full h-full block" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Purple Circle with crisp White Outer Ring */}
                  <circle cx="45" cy="45" r="41.5" stroke="#ffffff" strokeWidth="6" fill="#68137e" />
                  {/* Bold Crisp White Checkmark */}
                  <path
                    d="M 25.5 45.5 L 39.0 59.0 L 68.0 30.0"
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
            <div className="h-13 flex-shrink-0" />

            <div className="space-y-3 flex flex-col justify-center">
              {/* Headline */}
              <h1 className="text-center text-[15.5px] sm:text-[16px] font-medium text-black tracking-tight mb-1">
                Transaction Completed Successfully!
              </h1>

              {/* Main Transaction Summary Gray Card */}
              <div className="bg-[#f2f3f5] rounded-[26px] p-4 sm:p-5 space-y-3 border border-gray-200/50 shadow-xs">
                <p className="text-[#8e8e93] font-normal text-[13.5px]">Transaction Summary</p>

                {/* Paragraph Text with bold highlights matching CBE reference */}
                {isCredit ? (
                  <p className="text-[14px] sm:text-[14.5px] leading-[1.58] text-[#1a1a1a] font-normal select-text">
                    ETB <span className="font-bold text-black">{amountFormatted}</span> has been credited to <span className="font-bold text-black">{recipientName}</span> {recipientSuffix} from <span className="font-bold text-black">{senderName}</span> {senderSuffix} on <span className="font-bold text-black">{formattedDate}</span> with transaction ID: <span className="font-bold text-black">{txId}.</span> Reason: {reason}
                  </p>
                ) : (
                  <p className="text-[14px] sm:text-[14.5px] leading-[1.58] text-[#1a1a1a] font-normal select-text">
                    ETB <span className="font-bold text-black">{amountFormatted}</span> has been debited from <span className="font-bold text-black">{senderName}</span> {senderSuffix} for <span className="font-bold text-black">{recipientName}</span> {recipientSuffix} on <span className="font-bold text-black">{formattedDate}</span> with transaction ID: <span className="font-bold text-black">{txId}.</span> Reason: {reason} Total Amount Debited: ETB{totalDebitedFormatted} with Service Charge of ETB{serviceChargeFormatted}, VAT (15%) of ETB{vatFormatted} and Disaster Recovery (5%) of ETB{disasterRecoveryFormatted}.
                  </p>
                )}

                {/* Realistic QR Code Centered with authentic rounded grey frame */}
                <div className="flex justify-center pt-3 pb-2">
                  <div 
                    className="bg-white p-2.5 rounded-[22px] border-[2.8px] border-[#737373] shadow-xs inline-flex items-center justify-center select-none"
                  >
                    <div className="w-36 h-36 flex items-center justify-center">
                      {customQrCode ? (
                        <img 
                          src={customQrCode} 
                          alt={`Transaction ${txId} QR Code`} 
                          className="w-full h-full object-contain block"
                        />
                      ) : qrDataUrl ? (
                        <img 
                          src={qrDataUrl} 
                          alt={`Transaction ${txId} QR Code`} 
                          className="w-full h-full object-contain block"
                        />
                      ) : txQrSvgDataUri ? (
                        <img 
                          src={txQrSvgDataUri} 
                          alt={`Transaction ${txId} QR Code`} 
                          className="w-full h-full object-contain block"
                        />
                      ) : (
                        <div 
                          className="grid gap-[1px] w-full h-full bg-white p-0.5"
                          style={{ gridTemplateColumns: `repeat(${qrMatrix.length}, minmax(0, 1fr))` }}
                        >
                          {qrMatrix.flatMap((row, rIdx) =>
                            row.map((filled, cIdx) => (
                              <div 
                                key={`export-qr-${rIdx}-${cIdx}`} 
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

                {/* Commercial Bank of Ethiopia Footer Inset matching Image 1 */}
                <div 
                  className="flex items-center gap-3.5 pt-2 pb-1 px-1 min-w-0 w-full"
                >
                  <div 
                    className="w-11 h-11 flex-shrink-0 flex items-center justify-center"
                  >
                    <CbeLogo className="w-11 h-11 object-contain" src={customBankLogo} />
                  </div>
                  <div className="min-w-0 flex-1 text-left flex flex-col justify-center">
                    <h4 className="font-bold text-[#1f2937] text-[13.5px] leading-tight tracking-tight">
                      Commercial Bank of Ethiopia
                    </h4>
                    <p className="text-[#6b7280] text-[11px] font-normal leading-tight mt-0.5 tracking-tight">
                      The bank you can always rely on!
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Completely white bottom matching Image 1 (ZERO purple strip) */}
        </div>
      </div>

      {/* Android & iOS Screenshot Preview Sheet Modal */}
      {showScreenshotModal && capturedScreenshotUrl && (
        <div 
          data-html2canvas-ignore="true"
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200 select-none"
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
              Receipt Screenshot
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

          {/* Screenshot Preview Image: Touch & Long-press enabled for Android & iOS */}
          <div className="flex-1 flex items-center justify-center p-2 min-h-0 overflow-auto">
            <img 
              src={capturedScreenshotUrl} 
              alt="CBE Full Receipt Screenshot" 
              className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl border border-white/20 select-auto pointer-events-auto touch-manipulation cursor-pointer"
              title="Touch & hold on Android or iOS to save image"
            />
          </div>

          {/* Bottom Actions: Save to Gallery, Share, and Return to Home */}
          <div className="space-y-2.5 pt-2 pb-safe max-w-sm mx-auto w-full">
            {/* Gallery Save Hint */}
            <p className="text-[11px] text-center text-white/90 font-medium tracking-tight">
              📸 Full receipt captured! Tap below to Save to Gallery or Share. (On mobile, you can also touch &amp; hold the image to save)
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                id="btn-modal-save-gallery"
                onClick={() => saveImageToGallery(capturedScreenshotUrl)}
                className="w-full bg-[#70189F] hover:bg-[#8320b9] active:bg-[#5b1082] text-white font-bold py-3 rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-lg active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-300" />
                <span>Save to Gallery</span>
              </button>
              <button
                type="button"
                id="btn-modal-share-image"
                onClick={() => handleShareScreenshotImage(capturedScreenshotUrl)}
                className="w-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white font-bold py-3 rounded-2xl text-xs transition flex items-center justify-center gap-2 border border-white/20 active:scale-95 cursor-pointer"
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


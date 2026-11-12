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
  getSafeReceiptFilename,
  checkIsIOS,
  dataUrlToBlob
} from '../services/receiptScreenshotService';
import { renderAuthenticReceiptToCanvas } from '../services/receiptCanvasService';
import { SystemBarsService } from '../services/systemBarsService';

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

// Helper for authentic CBE currency formatting: e.g. 100.00, 1,200.00, 458,999.00
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
  const [isIPhone, setIsIPhone] = useState<boolean>(() => PhoneSettingsService.isIPhoneMode() || PhoneSettingsService.isIPhoneDevice() || checkIsIOS());
  const [showIosPhotoPreview, setShowIosPhotoPreview] = useState<boolean>(false);

  useEffect(() => {
    return PhoneSettingsService.subscribe(() => {
      setIsIPhone(PhoneSettingsService.isIPhoneMode() || PhoneSettingsService.isIPhoneDevice() || checkIsIOS());
    });
  }, []);

  // Phone screen dimensions for authentic edge-to-edge screenshot matching Image 2 (720x1600)
  const getDeviceDimensions = () => {
    if (typeof window === 'undefined') return { width: 360, height: 800 };
    const isMobile = window.innerWidth <= 500;
    // On physical mobile phone, CSS width is typically 360px (720px at 2.0 DPR)
    const w = isMobile ? (window.screen?.width || window.innerWidth || 360) : 360;
    // Full physical screen height in CSS pixels (e.g. 800 on 720x1600 phones, ratio 20:9)
    const screenH = typeof window.screen !== 'undefined' && window.screen.height ? window.screen.height : 0;
    const computedRatioH = Math.round(w * (20 / 9)); // 360 * 20 / 9 = 800
    const h = isMobile ? Math.max(screenH, computedRatioH, 800) : 800;
    return { width: w, height: h };
  };

  const [screenshotDimensions, setScreenshotDimensions] = useState<{ width: number; height: number }>(getDeviceDimensions);

  useEffect(() => {
    const updateDimensions = () => {
      setScreenshotDimensions(getDeviceDimensions());
    };
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
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

  // Screenshot capture & image state
  const [capturedScreenshotUrl, setCapturedScreenshotUrl] = useState<string | null>(null);

  // Double-tap/click to toggle hiding action controls (top-right icon and bottom action buttons: receipt, screenshot, share)
  const [hideUiElements, setHideUiElements] = useState<boolean>(false);

  // Floating "PAID" stamp badge in CBE purple (#70189F), shown for 2 seconds on screen click & mount
  const [showPaidBadge, setShowPaidBadge] = useState<boolean>(true);
  const [isFadingPaidBadge, setIsFadingPaidBadge] = useState<boolean>(false);
  const [stampKey, setStampKey] = useState<number>(1);
  const paidBadgeTimerRef = useRef<any>(null);
  const paidFadeTimerRef = useRef<any>(null);

  const triggerPaidBadge = () => {
    if (paidBadgeTimerRef.current) clearTimeout(paidBadgeTimerRef.current);
    if (paidFadeTimerRef.current) clearTimeout(paidFadeTimerRef.current);

    // Replay stamp animation with impact
    setStampKey(prev => prev + 1);
    setIsFadingPaidBadge(false);
    setShowPaidBadge(true);

    // Begin fade out after 1.6s
    paidFadeTimerRef.current = setTimeout(() => {
      setIsFadingPaidBadge(true);
    }, 1600);

    // Complete fade out and hide at 2.05s
    paidBadgeTimerRef.current = setTimeout(() => {
      setShowPaidBadge(false);
      setIsFadingPaidBadge(false);
    }, 2050);
  };

  useEffect(() => {
    // Show for 2 seconds when receipt screen opens
    triggerPaidBadge();
    return () => {
      if (paidBadgeTimerRef.current) clearTimeout(paidBadgeTimerRef.current);
      if (paidFadeTimerRef.current) clearTimeout(paidFadeTimerRef.current);
    };
  }, []);

  const toggleUiElements = () => {
    setHideUiElements(prev => {
      const next = !prev;
      showBarsToast(next ? 'Controls hidden (Tap screen to return)' : 'Controls restored');
      return next;
    });
  };

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

  // Lock navigation to this receipt screen:
  // Disables all iPhone / Android device back navigation gestures and history pops.
  // There is NO way out of this screen except explicitly clicking the "Close" button!
  useEffect(() => {
    // Push a history state entry to trap device / browser back button
    try {
      window.history.pushState({ view: 'receipt', locked: true }, '', window.location.pathname);
    } catch {}

    const handlePopState = () => {
      // If a sub-modal is open, dismiss it
      if (showDetailedModal) {
        setShowDetailedModal(false);
      }
      // Re-push history entry to keep user firmly locked on this receipt page
      try {
        window.history.pushState({ view: 'receipt', locked: true }, '', window.location.pathname);
      } catch {}
    };

    const handlePhoneBack = (e: any) => {
      // Sub-modals can be dismissed
      if (showDetailedModal) {
        setShowDetailedModal(false);
        e?.detail?.setHandled?.();
        e?.preventDefault?.();
        return;
      }
      // On the receipt page itself, block all navigation!
      // The user must explicitly tap the "Close" button.
      e?.detail?.setHandled?.();
      e?.preventDefault?.();
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('cbe_phone_back', handlePhoneBack);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('cbe_phone_back', handlePhoneBack);
    };
  }, [showDetailedModal]);

  // Ensure device navigation bar is pure white (#ffffff) for Receipt view
  useEffect(() => {
    SystemBarsService.syncForView('receipt');
    return () => {
      SystemBarsService.syncForView('main');
    };
  }, []);

  const handleScreenTouchStart = (e: React.TouchEvent) => {
    if (e.touches && e.touches[0]) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleScreenClick = (e: React.MouseEvent) => {
    triggerPaidBadge();
    if (isTouchRef.current) {
      isTouchRef.current = false;
      return;
    }
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }
    if (hideUiElements) {
      toggleUiElements();
    }
  };

  const handleScreenTouchEnd = (e: React.TouchEvent) => {
    isTouchRef.current = true;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }
    triggerPaidBadge();
    if (hideUiElements) {
      toggleUiElements();
    }
  };

  const handleScreenDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }
    // No-op: double click will not exit the screen
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

  const formattedAmt = Number(transaction.amount ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const senderBalanceNum = transaction.senderAccount
    ? (LocalDb.getAllAccounts().find(a => a.accountNumber === transaction.senderAccount)?.balance ?? 9999499976.0)
    : 9999499976.0;
  const formattedBal = Number(senderBalanceNum).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Dynamic realistic CBE Transaction ID: 12 characters exactly (e.g. FT263211VK07)
  const txId = formatTo12CharTxId(transaction.id || transaction.reference);

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

  // Helper to trigger direct download (safe on Android; strictly disabled on iPhone to prevent Safari black preview screen)
  const triggerDirectDownload = (dataUrl: string, targetTxId: string) => {
    // Strictly disable <a download> on iOS / iPhone so Safari NEVER opens the black preview page (IMG_1216)
    if (checkIsIOS() || isIPhone || PhoneSettingsService.isIPhoneDevice()) return;
    try {
      const filename = getSafeReceiptFilename(targetTxId);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.setAttribute('download', filename);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          document.body.removeChild(link);
        } catch {}
      }, 1000);
    } catch (e) {
      console.warn('Direct download error:', e);
    }
  };

  // Screenshot handler: captures EXACT receipt and AUTOMATICALLY saves to device store
  // - On iPhone: Saves directly into Apple Photos / Camera Roll via native iOS share action sheet (NO black download preview!)
  // - On Android: Saves silently to gallery / downloads folder automatically
  const handleScreenshot = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (isCapturing) return;

    const isIos = checkIsIOS() || isIPhone || PhoneSettingsService.isIPhoneDevice();

    try {
      setIsCapturing(true);

      // 1. Shutter camera flash animation overlay
      setFlashAnimation(true);
      setTimeout(() => setFlashAnimation(false), 250);

      const qrUrl = customQrCode || qrDataUrl || txQrSvgDataUri;

      let dataUrl: string | null = null;

      if (isIos) {
        // Fast path for iOS (<15ms) to preserve Safari's user-activation gesture token:
        // Drawing directly on 2D canvas guarantees navigator.share succeeds without NotAllowedError
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
          customBankLogo,
          targetWidth: screenshotDimensions.width,
          targetHeight: screenshotDimensions.height,
          isIPhone: true,
        });
      } else {
        // Android flow: brief tick then capture DOM or high-fidelity canvas
        await new Promise(r => setTimeout(r, 60));
        const element = screenshotExportRef.current || receiptRef.current;
        if (element) {
          try {
            dataUrl = await captureReceiptElement(element);
          } catch (captureErr) {
            console.warn('[Screenshot] DOM capture fallback to canvas:', captureErr);
          }
        }
        if (!dataUrl) {
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
            customBankLogo,
            targetWidth: screenshotDimensions.width,
            targetHeight: screenshotDimensions.height,
            isIPhone: false,
          });
        }
      }

      if (dataUrl) {
        setCapturedScreenshotUrl(dataUrl);

        if (isIos) {
          const blob = dataUrlToBlob(dataUrl);
          const filename = getSafeReceiptFilename(txId);
          const file = new File([blob], filename, { type: 'image/png' });

          // 1. Silently copy high-resolution image to iOS clipboard
          if (typeof navigator !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
            try {
              await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            } catch {}
          }

          // 2. If running as an installed native iOS app, save directly into Apple Photos via native Media plugin
          if (Capacitor.isNativePlatform()) {
            try {
              await saveAndShareReceiptImage(dataUrl, txId, false);
              setCopiedToast('Screenshot saved to Photos');
              setTimeout(() => setCopiedToast(null), 3000);
              return;
            } catch (nativeSaveErr) {
              console.warn('Native iOS photo save note:', nativeSaveErr);
            }
          }

          // 3. In Safari on iOS: Prompt the native Action Sheet with "Save Image" to actually save to Apple Photos
          let sharedSuccessfully = false;
          if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
            setCopiedToast('Tap "Save Image" to save to Apple Photos 👇');
            try {
              await navigator.share({
                files: [file],
                title: 'CBE Receipt',
              });
              sharedSuccessfully = true;
              setCopiedToast('Screenshot saved to Apple Photos!');
            } catch (shareErr: any) {
              if (shareErr?.name === 'AbortError') {
                // User dismissed the sheet
                sharedSuccessfully = true;
              } else {
                console.warn('iOS share notice:', shareErr);
              }
            }
          }

          if (!sharedSuccessfully) {
            setShowIosPhotoPreview(true);
            setCopiedToast('Touch & hold image to Save to Photos');
          }
        } else {
          // Android: Automatic silent gallery save
          try {
            const result = await saveAndShareReceiptImage(dataUrl, txId, false);
            if (!result.saved) {
              triggerDirectDownload(dataUrl, txId);
            }
          } catch (saveErr) {
            console.warn('[Screenshot] Android save notice:', saveErr);
            triggerDirectDownload(dataUrl, txId);
          }
          setCopiedToast('Screenshot saved to gallery');
        }

        setTimeout(() => setCopiedToast(null), 3000);
      }
    } catch (err) {
      console.error('Screenshot capture error:', err);
      setCopiedToast('Could not save screenshot. Please try again.');
      setTimeout(() => setCopiedToast(null), 3000);
    } finally {
      setIsCapturing(false);
    }
  };

  // Share handle: opens the native share sheet with the receipt image when user taps Share
  const handleShare = async () => {
    const summaryText = `ETB ${amount} has been debited from ${senderName} ${senderSuffix} for ${recipientName} ${recipientSuffix} on ${formattedDate} with transaction ID: ${txId}. Reason: ${reason}. Total Amount Debited: ${totalDebitedStr} ETB.`;

    try {
      const qrUrl = customQrCode || qrDataUrl || txQrSvgDataUri;
      const dataUrl = capturedScreenshotUrl || await renderAuthenticReceiptToCanvas({
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
        customBankLogo,
        targetWidth: screenshotDimensions.width,
        targetHeight: screenshotDimensions.height,
        isIPhone,
      });

      const blob = dataUrlToBlob(dataUrl);
      const filename = getSafeReceiptFilename(txId);
      const file = new File([blob], filename, { type: 'image/png' });

      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `CBE Receipt - ${txId}`,
          text: summaryText,
        });
        return;
      }
    } catch (shareErr) {
      console.log('Share notice:', shareErr);
    }

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
      className="w-full h-full min-h-[100dvh] h-[100dvh] bg-white text-slate-800 flex flex-col relative overflow-hidden select-none cursor-pointer"
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

      {/* 1. Phone Top Status Bar & Receipt Master Container (Pure white background extending to bottom edge of device) */}
      <div 
        ref={receiptRef}
        id="cbe-full-receipt-capture-target"
        data-capturing={isCapturing ? "true" : "false"}
        className="w-full flex-1 flex flex-col justify-between bg-white relative select-none h-full overflow-hidden min-h-0"
      >
        {/* 2. RECEIPT CONTENT CONTAINER (Edge-to-Edge like real CBE Mobile Banking) */}
        <div 
          id="cbe-existing-receipt"
          className="w-full flex-1 flex flex-col bg-white relative select-none h-full overflow-hidden min-h-0"
        >
          {/* Top Purple Navigation / App Header: background extends behind rounded-t-[38px] curve */}
          <div className="bg-[#70189F] pb-10 -mb-10 flex-shrink-0 relative z-10">
            <div className="pt-[max(calc(env(safe-area-inset-top,0px)+10px),16px)] pb-14 sm:pb-16 px-5 flex items-center justify-between text-white flex-shrink-0">
              <div className="flex items-center gap-2.5">
                {/* Solid White Shield with Purple Checkmark Icon matching original reference */}
                <div className="w-8.5 h-8.5 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-8.5 h-8.5 drop-shadow-xs" viewBox="0 0 24 24" fill="none">
                    <path 
                      d="M12 2.2c0.3 0 0.6 0.1 0.9 0.2l6.5 2.6c0.5 0.2 0.8 0.7 0.8 1.2v5.6c0 4.8-3.0 9.2-7.5 10.7-.5 0.2-1.0 0.2-1.4 0-4.5-1.5-7.5-5.9-7.5-10.7V6.2c0-.5.3-1 .8-1.2l6.5-2.6c.3-.1.6-.2.9-.2z" 
                      fill="#ffffff" 
                    />
                    <path 
                      d="M8.0 12.2L11.0 15.2L17.2 9.0" 
                      stroke="#70189F" 
                      strokeWidth="1.9" 
                      strokeLinecap="butt" 
                      strokeLinejoin="miter" 
                      strokeMiterlimit="4" 
                      shapeRendering="geometricPrecision"
                    />
                  </svg>
                </div>
                <div>
                  <h2 
                    className="font-bold text-[18px] sm:text-[19px] leading-snug text-white tracking-normal"
                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif' }}
                  >
                    Thank you
                  </h2>
                  <p 
                    className="text-[13px] sm:text-[13.5px] text-purple-100/90 font-normal leading-snug mt-0.5 tracking-normal"
                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", system-ui, sans-serif' }}
                  >
                    Success
                  </p>
                </div>
              </div>
              {/* Top-Right Screenshot Icon Button (excluded from captured screenshot) */}
              <button
                type="button"
                id="btn-top-screenshot"
                data-screenshot-exclude="true"
                onClick={handleScreenshot}
                className="p-2 -mr-1 rounded-full text-white/90 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                title="Take screenshot"
                aria-label="Take screenshot"
              >
                <ScreenshotViewfinderIcon className="w-6 h-6 text-white" strokeWidth={1.9} />
              </button>
            </div>
          </div>

          {/* STATIC/UNSCROLLEABLE TOP CURVE CAP WITH OVERLAPPING ANIMATED CHECKMARK BADGE */}
          <div className="bg-white rounded-t-[38px] rounded-b-none relative flex-shrink-0 z-20 border-none outline-none">
            {/* Overlapping Large Success Checkmark Badge (matching real CBE Bank: animated breathing pulse, strictly original size when taking screenshot) */}
            <div className="relative flex justify-center flex-shrink-0">
              <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-0 w-[90px] h-[90px] pointer-events-none select-none z-30 flex items-center justify-center">
                <div 
                  className={`w-full h-full flex items-center justify-center origin-center transition-transform duration-200 ${
                    isCapturing ? 'transform-none !scale-100 [animation:none!important]' : 'animate-cbe-pulse'
                  }`}
                  style={isCapturing ? { transform: 'scale(1)', animation: 'none' } : undefined}
                >
                  <svg 
                    viewBox="0 0 90 90" 
                    className="w-full h-full block" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Purple Circle with crisp White Outer Ring */}
                    <circle cx="45" cy="45" r="41.5" stroke="#ffffff" strokeWidth="6" fill="#70189F" />
                    {/* Bold Crisp White Checkmark ("right icon") */}
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
            </div>

            {/* Spacer for the overlapping badge matching exact bottom edge */}
            <div className="h-[45px] flex-shrink-0" />
          </div>

          {/* SCROLLABLE MIDDLE TEXT & CARD PART: Only this upper text area scrolls between the static header and static bottom buttons */}
          <div className={`bg-white -mt-px px-4 sm:px-5 ${hideUiElements ? 'pb-12' : 'pb-4'} flex-1 overflow-y-auto overscroll-contain scrollbar-none min-h-0`}>
            <div className="pb-2">
              {/* Headline - perfectly balanced space from top badge and bottom card */}
              <h1 
                className={`text-center text-[16px] sm:text-[16.5px] font-medium text-[#111827] tracking-normal ${isIPhone ? 'mt-5 mb-5' : 'mt-4 mb-4'}`}
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif' }}
              >
                Transaction Completed Successfully!
              </h1>

              {/* Main Transaction Summary Gray Card with visible border shadow matching Image One */}
              <div className={`bg-[#f2f3f5] rounded-[26px] ${isIPhone ? 'p-5 sm:p-6 pb-6 sm:pb-7' : 'p-4.5 sm:p-5'} border border-black/[0.04] shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)]`}>
                <p className={`text-[#8e8e93] font-normal text-[13.5px] sm:text-[14px] ${isIPhone ? 'mb-3.5' : 'mb-2'}`}>Transaction Summary</p>

                {/* Paragraph Text with bold highlights and floating PAID badge */}
                <div className="relative mb-0 pb-0">
                  {isCredit ? (
                    <p 
                      className="text-[14.5px] sm:text-[15px] leading-[1.65] text-[#1f2937] font-normal select-text tracking-[0.012em] m-0 p-0"
                      style={{ 
                        margin: 0,
                        padding: 0,
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", system-ui, sans-serif' 
                      }}
                    >
                      ETB <span className="font-bold text-black">{amountFormatted}</span> has been credited to <span className="font-bold text-black">{recipientName}</span> {recipientSuffix} from <span className="font-bold text-black">{senderName}</span> {senderSuffix} on <span className="font-bold text-black">{formattedDate}</span> with transaction ID: <span className="font-bold text-black">{txId}.</span> Reason: {reason}
                    </p>
                  ) : (
                    <p 
                      className="text-[14.5px] sm:text-[15px] leading-[1.65] text-[#1f2937] font-normal select-text tracking-[0.012em] m-0 p-0"
                      style={{ 
                        margin: 0,
                        padding: 0,
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", system-ui, sans-serif' 
                      }}
                    >
                      ETB <span className="font-bold text-black">{amountFormatted}</span> has been debited from <span className="font-bold text-black">{senderName}</span> {senderSuffix} for <span className="font-bold text-black">{recipientName}</span> {recipientSuffix} on <span className="font-bold text-black">{formattedDate}</span> with transaction ID: <span className="font-bold text-black">{txId}.</span> Reason: {reason} Total Amount Debited: ETB{totalDebitedFormatted} with Service Charge of ETB{serviceChargeFormatted}, VAT (15%) of ETB{vatFormatted} and Disaster Recovery (5%) of ETB{disasterRecoveryFormatted}.
                    </p>
                  )}

                  {/* Floating "PAID" Rubber Stamp Badge matching exact video animation: -12deg tilt, stamp impact bounce & fade */}
                  {showPaidBadge && !isCapturing && (
                    <div 
                      key={stampKey}
                      data-screenshot-exclude="true"
                      className={`absolute left-[52%] top-[55%] z-30 select-none pointer-events-none transition-opacity duration-400 ease-out animate-paid-stamp ${
                        isFadingPaidBadge ? 'opacity-0' : 'opacity-100'
                      }`}
                    >
                      <div className="bg-[#70189F] text-white px-6 py-2 sm:px-7 sm:py-2.5 rounded-2xl shadow-xl shadow-purple-950/40 flex items-center justify-center border border-purple-400/25">
                        <span className="font-black text-[22px] sm:text-[25px] tracking-wider text-white drop-shadow-sm select-none">
                          PAID
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Realistic QR Code Centered: increased vertical spacing for iPhone matching reference */}
                <div className="flex justify-center mb-0" style={{ marginTop: isIPhone ? '13px' : '3px' }}>
                  <div 
                    id="receipt-qr-container"
                    className="bg-white p-2 rounded-[18px] border-[2px] border-[#737373] shadow-xs inline-flex items-center justify-center select-none"
                    style={{ marginTop: '0px' }}
                  >
                    <div className="w-[114px] h-[114px] sm:w-[118px] sm:h-[118px] flex items-center justify-center">
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

                {/* Commercial Bank of Ethiopia Footer Inset: increased vertical space for iPhone matching reference */}
                <div className={`flex items-center w-full pt-0 pb-1 px-1 ${isIPhone ? '!mt-[15px]' : '!mt-[5px]'}`}>
                  <div 
                    id="cbe-receipt-bottom-bar"
                    className="flex items-center gap-3 w-full select-none"
                  >
                    <div 
                      id="cbe-receipt-logo-container"
                      className="w-[42px] h-[42px] sm:w-[44px] sm:h-[44px] flex-shrink-0 flex items-center justify-center"
                    >
                      <CbeLogo className="w-full h-full object-contain" src={customBankLogo} />
                    </div>
                    <div className="text-left flex flex-col justify-center">
                      <h4 
                        className="font-bold text-[#1f2937] text-[15px] sm:text-[15.5px] leading-tight whitespace-nowrap"
                        style={{ 
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif'
                        }}
                      >
                        Commercial Bank of Ethiopia
                      </h4>
                      <p 
                        className="text-[#6b7280] text-[12.5px] sm:text-[13px] font-normal leading-tight mt-0.5 whitespace-nowrap"
                        style={{ 
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", system-ui, sans-serif'
                        }}
                      >
                        The bank you can always rely on!
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* 3. STATIC/UNSCROLLEABLE BOTTOM ACTIONS: Receipt, Screenshot, Share, Close */}
        {!hideUiElements && (
          <div 
            id="cbe-receipt-bottom-actions-container"
            className="bg-white px-4 sm:px-5 pb-[max(env(safe-area-inset-bottom,0px),10px)] pt-2.5 space-y-2.5 flex-shrink-0 z-20 select-none border-t border-gray-100/80 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]"
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

            {/* Full-width Close Pill Button (thin vertically matching real CBE) */}
            <button 
              type="button"
              id="btn-action-close"
              onClick={onBack}
              className="w-full bg-[#d7d7db] hover:bg-[#ceced3] active:bg-[#c4c4c9] text-[#333333] font-bold py-1.5 sm:py-2 rounded-full text-[13.5px] sm:text-[14px] transition active:scale-[0.99] cursor-pointer shadow-xs mb-0.5"
            >
              Close
            </button>
          </div>
        )}

        {/* Solid White Device Navigation Bar Safe-Area Strip extending to the bottom edge */}
        <div 
          data-html2canvas-ignore="true" 
          className="fixed bottom-0 inset-x-0 h-[max(env(safe-area-inset-bottom,0px),0px)] bg-white pointer-events-none z-30" 
        />
      </div>

      {/* When in Clean Screenshot Mode (matching Image 1) */}
      {hideUiElements && (
        <div data-html2canvas-ignore="true" data-screenshot-exclude="true" className="pt-4 pb-2 flex flex-col items-center justify-center shrink-0 bg-white">
          <button
            type="button"
            onClick={toggleUiElements}
            className="text-xs text-neutral-500 hover:text-neutral-800 transition flex items-center gap-1.5 py-1.5 px-4 rounded-full bg-neutral-100 hover:bg-neutral-200 cursor-pointer shadow-2xs active:scale-95 font-medium"
          >
            <span>Tap to show Close &amp; Action controls</span>
          </button>
        </div>
      )}
      {/* Official CBE Customer Receipt Web Page when User Clicks 'Receipt' */}
      {showDetailedModal && (
        <CbeWebReceiptModal 
          transaction={{
            ...transaction,
            id: txId,
            reference: txId
          }}
          initialQrCode={customQrCode || txQrSvgDataUri || qrDataUrl}
          onClose={() => setShowDetailedModal(false)} 
        />
      )}

      {/* iOS Direct Apple Photos Preview & Save Modal */}
      {showIosPhotoPreview && capturedScreenshotUrl && (
        <div 
          data-html2canvas-ignore="true" 
          data-screenshot-exclude="true"
          className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowIosPhotoPreview(false)}
        >
          <div 
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-neutral-300 rounded-full mb-3 sm:hidden" />
            
            <div className="w-11 h-11 rounded-full bg-purple-50 text-[#70189F] flex items-center justify-center mb-2.5">
              <Camera className="w-6 h-6 stroke-[2.2]" />
            </div>

            <h3 className="text-base font-bold text-gray-900 mb-1">
              Save to Apple Photos
            </h3>
            
            <p className="text-xs text-gray-500 mb-3 px-2 leading-relaxed">
              Touch and hold the receipt image below, then tap <strong className="text-gray-800">"Save to Photos"</strong>.
            </p>

            {/* Receipt Preview Thumbnail with Touch & Hold capability */}
            <div className="w-full max-h-[300px] overflow-hidden rounded-2xl border border-gray-200 shadow-inner bg-gray-50 mb-4 flex items-center justify-center p-2">
              <img 
                src={capturedScreenshotUrl} 
                alt="Receipt Screenshot" 
                className="max-h-[280px] w-auto object-contain rounded-lg select-auto pointer-events-auto shadow-md"
              />
            </div>

            <div className="w-full flex flex-col gap-2">
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const blob = dataUrlToBlob(capturedScreenshotUrl);
                      const filename = getSafeReceiptFilename(txId);
                      const file = new File([blob], filename, { type: 'image/png' });
                      await navigator.share({
                        files: [file],
                        title: 'CBE Receipt',
                      });
                      setShowIosPhotoPreview(false);
                    } catch {}
                  }}
                  className="w-full py-2.5 rounded-full bg-[#70189F] hover:bg-[#5b1482] text-white font-semibold text-xs transition active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Open iOS Save Menu</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowIosPhotoPreview(false)}
                className="w-full py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition active:scale-95 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 
        ========================================================================
        AUTHENTIC CBE RECEIPT SCREENSHOT EXPORT TARGET (EXACT MATCH TO IMAGE 1)
        - Pure CBE purple top (#70189F) with white shield + "Thank you" / "Success" on left
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
          width: `${screenshotDimensions.width}px`,
          height: `${screenshotDimensions.height}px`,
          minHeight: `${screenshotDimensions.height}px`,
          maxHeight: `${screenshotDimensions.height}px`,
          zIndex: -100,
          pointerEvents: 'none',
          opacity: 1,
          backgroundColor: '#ffffff',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
        aria-hidden="true"
      >
        {/* Top Purple Header: Explicit inline styles for rock-solid Android rendering with purple extension behind curve */}
        <div 
          style={{ 
            width: '100%', 
            backgroundColor: '#70189F', 
            color: '#ffffff', 
            display: 'flex', 
            flexDirection: 'column', 
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            userSelect: 'none',
            flexShrink: 0,
            paddingBottom: '38px',
            marginBottom: '-38px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div 
            style={{ 
              paddingTop: '54px', 
              paddingBottom: '38px', 
              paddingLeft: '20px', 
              paddingRight: '20px', 
              backgroundColor: '#70189F', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Solid White Shield with Purple Checkmark */}
              <div style={{ width: '34px', height: '34px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg style={{ width: '34px', height: '34px', display: 'block' }} viewBox="0 0 24 24" fill="none">
                  <path 
                    d="M12 2.2c0.3 0 0.6 0.1 0.9 0.2l6.5 2.6c0.5 0.2 0.8 0.7 0.8 1.2v5.6c0 4.8-3.0 9.2-7.5 10.7-.5 0.2-1.0 0.2-1.4 0-4.5-1.5-7.5-5.9-7.5-10.7V6.2c0-.5.3-1 .8-1.2l6.5-2.6c.3-.1.6-.2.9-.2z" 
                    fill="#ffffff" 
                  />
                  <path 
                    d="M8.0 12.2L11.0 15.2L17.2 9.0" 
                    stroke="#70189F" 
                    strokeWidth="1.9" 
                    strokeLinecap="butt" 
                    strokeLinejoin="miter" 
                    strokeMiterlimit="4" 
                    shapeRendering="geometricPrecision"
                  />
                </svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontWeight: 700, fontSize: '17px', lineHeight: 1.2, color: '#ffffff', letterSpacing: '-0.3px' }}>Thank you</h2>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#e9d5ff', fontWeight: 400, lineHeight: 1.2, marginTop: '2px' }}>Success</p>
              </div>
            </div>
          </div>
        </div>

        {/* 
          ========================================================================
          MAIN WHITE SHEET CONTAINER (MATCHING IMAGE 2 EXACTLY)
          - Symmetrical 38px rounded top corners directly on white container against purple header
          - ZERO intermediate SVG div => ZERO tiny horizontal line or seam!
          - Overlapping large success checkmark badge centered on top curve boundary
          - "Transaction Completed Successfully!" headline centered directly below badge
          - Full edge-to-edge phone screen layout extending flat all the way to bottom edge
          ========================================================================
        */}
        <div 
          style={{ 
            width: '100%', 
            flex: 1, 
            backgroundColor: '#ffffff', 
            borderTopLeftRadius: '38px', 
            borderTopRightRadius: '38px', 
            border: 'none',
            outline: 'none',
            paddingLeft: '16px', 
            paddingRight: '16px', 
            paddingTop: '0px', 
            paddingBottom: '0px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between', 
            position: 'relative', 
            userSelect: 'none', 
            minHeight: 0,
            boxSizing: 'border-box',
            zIndex: 2,
          }}
        >
          {/* Overlapping Large Success Checkmark Badge (matching Image 2) */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
            <div 
              style={{ 
                position: 'absolute', 
                left: '50%', 
                top: 0, 
                transform: 'translate(-50%, -50%)', 
                width: '90px', 
                height: '90px', 
                pointerEvents: 'none', 
                userSelect: 'none', 
                zIndex: 10,
              }}
            >
              <svg 
                viewBox="0 0 90 90" 
                style={{ width: '100%', height: '100%', display: 'block' }} 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Purple Circle with crisp White Outer Ring */}
                <circle cx="45" cy="45" r="41.5" stroke="#ffffff" strokeWidth="6" fill="#70189F" />
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

          {/* Spacer for bottom half of overlapping badge */}
          <div style={{ height: '45px', flexShrink: 0 }} />

          {/* Main Content Area - Matching Image 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', flex: 1, paddingTop: '0px', minHeight: 0 }}>
            {/* Headline with perfectly balanced vertical space from top badge and bottom card */}
            <h1 
              style={{ 
                margin: isIPhone ? '20px 0 20px 0' : '16px 0 16px 0', 
                textAlign: 'center', 
                fontSize: '16px', 
                fontWeight: 500, 
                color: '#111827', 
                letterSpacing: '0px', 
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif',
                flexShrink: 0,
              }}
            >
              Transaction Completed Successfully!
            </h1>

            {/* Main Transaction Summary Gray Card with border shadow matching Image One */}
            <div 
              style={{ 
                backgroundColor: '#f2f3f5', 
                borderRadius: '26px', 
                padding: isIPhone ? '22px 18px 26px 18px' : '18px', 
                border: '1px solid rgba(0, 0, 0, 0.04)', 
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0px',
                boxSizing: 'border-box',
              }}
            >
              <p style={{ margin: isIPhone ? '0 0 14px 0' : '0 0 8px 0', color: '#8e8e93', fontWeight: 400, fontSize: '13.5px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", system-ui, sans-serif' }}>
                Transaction Summary
              </p>

              {/* Paragraph Text with bold highlights matching CBE reference */}
              {isCredit ? (
                <p style={{ margin: '0 0 0px 0', padding: 0, fontSize: '14.5px', lineHeight: 1.65, color: '#1f2937', fontWeight: 400, letterSpacing: '0.15px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", system-ui, sans-serif' }}>
                  ETB <span style={{ fontWeight: 700, color: '#000000' }}>{amountFormatted}</span> has been credited to <span style={{ fontWeight: 700, color: '#000000' }}>{recipientName}</span> {recipientSuffix} from <span style={{ fontWeight: 700, color: '#000000' }}>{senderName}</span> {senderSuffix} on <span style={{ fontWeight: 700, color: '#000000' }}>{formattedDate}</span> with transaction ID: <span style={{ fontWeight: 700, color: '#000000' }}>{txId}.</span> Reason: {reason}
                </p>
              ) : (
                <p style={{ margin: '0 0 0px 0', padding: 0, fontSize: '14.5px', lineHeight: 1.65, color: '#1f2937', fontWeight: 400, letterSpacing: '0.15px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", system-ui, sans-serif' }}>
                  ETB <span style={{ fontWeight: 700, color: '#000000' }}>{amountFormatted}</span> has been debited from <span style={{ fontWeight: 700, color: '#000000' }}>{senderName}</span> {senderSuffix} for <span style={{ fontWeight: 700, color: '#000000' }}>{recipientName}</span> {recipientSuffix} on <span style={{ fontWeight: 700, color: '#000000' }}>{formattedDate}</span> with transaction ID: <span style={{ fontWeight: 700, color: '#000000' }}>{txId}.</span> Reason: {reason} Total Amount Debited: ETB{totalDebitedFormatted} with Service Charge of ETB{serviceChargeFormatted}, VAT (15%) of ETB{vatFormatted} and Disaster Recovery (5%) of ETB{disasterRecoveryFormatted}.
                </p>
              )}

              {/* Realistic QR Code Centered with strictly 3px vertical spacing from text above (or 13px for iPhone) */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: isIPhone ? '13px' : '3px', marginBottom: '0px' }}>
                <div 
                  style={{ 
                    backgroundColor: '#ffffff', 
                    padding: '8px', 
                    borderRadius: '18px', 
                    border: '2px solid #737373', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    userSelect: 'none', 
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ width: '114px', height: '114px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {customQrCode ? (
                      <img 
                        src={customQrCode} 
                        alt={`Transaction ${txId} QR Code`} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                      />
                    ) : qrDataUrl ? (
                      <img 
                        src={qrDataUrl} 
                        alt={`Transaction ${txId} QR Code`} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                      />
                    ) : txQrSvgDataUri ? (
                      <img 
                        src={txQrSvgDataUri} 
                        alt={`Transaction ${txId} QR Code`} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                      />
                    ) : (
                      <div 
                        style={{ display: 'grid', gridTemplateColumns: `repeat(${qrMatrix.length}, minmax(0, 1fr))`, gap: '1px', width: '100%', height: '100%', backgroundColor: '#ffffff', padding: '2px' }}
                      >
                        {qrMatrix.flatMap((row, rIdx) =>
                          row.map((filled, cIdx) => (
                            <div 
                              key={`export-qr-${rIdx}-${cIdx}`} 
                              style={{ 
                                borderRadius: '0.2px', 
                                backgroundColor: filled ? '#000000' : 'transparent',
                              }}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Commercial Bank of Ethiopia Footer Inset: Logo on left, aligned with text margin, matching reference image two */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  width: '100%', 
                  marginTop: isIPhone ? '15px' : '5px', 
                  paddingTop: '0px', 
                  paddingBottom: '2px', 
                  paddingLeft: '4px',
                  boxSizing: 'border-box', 
                }}
              >
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    width: '100%',
                  }}
                >
                  <div 
                    style={{ width: '42px', height: '42px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
                  >
                    <CbeLogo className="w-10.5 h-10.5 object-contain" style={{ width: '42px', height: '42px', maxWidth: '42px', maxHeight: '42px' }} src={customBankLogo} />
                  </div>
                  <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h4 style={{ margin: 0, fontWeight: 700, color: '#1f2937', fontSize: '15px', lineHeight: 1.2, letterSpacing: '0px', whiteSpace: 'nowrap', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif' }}>
                      Commercial Bank of Ethiopia
                    </h4>
                    <p style={{ margin: '2px 0 0 0', color: '#6b7280', fontSize: '12.5px', fontWeight: 400, lineHeight: 1.2, letterSpacing: '0px', whiteSpace: 'nowrap', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", system-ui, sans-serif' }}>
                      The bank you can always rely on!
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Generous clean white space extending to the bottom edge */}
            <div style={{ flex: 1, backgroundColor: '#ffffff', minHeight: '36px' }} />
          </div>

          {/* Bottom edge color change matching Image One (IMG_1210_75ffdd7f.jpeg) for iPhone user only; Android users keep clean pure white bottom */}
          {isIPhone && (
            <div 
              style={{ 
                width: 'calc(100% + 32px)', 
                marginLeft: '-16px', 
                marginRight: '-16px', 
                height: '64px', 
                backgroundColor: '#f4f5f7', 
                borderTop: '1px solid #edf0f3',
                flexShrink: 0,
              }} 
            />
          )}
        </div>
      </div>



    </div>
  );
}


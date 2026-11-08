import React, { useRef, useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { Transaction } from '../types';
import { SmsMessage } from '../types/sms';
import { 
  LocalDb, 
  formatTo12CharTxId, 
  DEFAULT_CBE_LOGO, 
  OFFICIAL_CBE_PURPLE_LOGO, 
  OFFICIAL_CBE_STAMP_LOGO, 
  getOfficialCbeStampSvg, 
  StampWeight, 
  StampPosition, 
  rasterizeSvgToPng,
  getAuthenticCbeQrSvgDataUri,
  getAuthenticCbeQrPngDataUrl
} from '../lib/mockData';
import { CbeLogo } from './CbeLogo';
import { CbeOfficialPdfReceipt } from './CbeOfficialPdfReceipt';
import { 
  ArrowLeft, 
  Home, 
  Lock, 
  MoreVertical, 
  Check, 
  SlidersHorizontal,
  Sliders,
  Minus,
  Plus,
  Feather,
  Copy,
  RotateCw,
  RotateCcw,
  Shield,
  Star,
  Download,
  Upload,
  X,
  Smartphone,
  Globe,
  CheckCircle2,
  Trash2,
  Share2,
  ExternalLink,
  RefreshCw,
  Stamp,
  Sparkles,
  Printer,
  FileText,
  Link,
  Move,
  Save,
  ArrowUp,
  ArrowDown,
  ArrowRight
} from 'lucide-react';
import { PhoneSettingsService, BrowserHeaderType } from '../services/phoneSettingsService';
import { SystemBarsService } from '../services/systemBarsService';

export type { BrowserHeaderType };

interface CbeWebReceiptModalProps {
  transaction?: Transaction | null;
  smsMessage?: SmsMessage | null;
  onClose: () => void;
  initialViewMode?: 'web' | 'pdf';
  initialQrCode?: string;
}

/**
 * Converts numeric amount to official CBE English words:
 * e.g. 50.61 -> "Fifty ETB and Sixty One cents"
 * e.g. 35003.60 -> "Thirty Five Thousand Three ETB and Sixty cents"
 */
function numberToCbeWords(amount: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertGroup(n: number): string {
    let group = '';
    if (n >= 100) {
      group += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      group += tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '') + ' ';
    } else if (n > 0) {
      group += ones[n] + ' ';
    }
    return group.trim();
  }

  const rounded = Math.round(amount * 100) / 100;
  const intPart = Math.floor(rounded);
  const decPart = Math.round((rounded - intPart) * 100);

  if (intPart === 0 && decPart === 0) return 'Zero ETB';

  let words = '';
  if (intPart >= 1000000000) {
    const billions = Math.floor(intPart / 1000000000);
    words += convertGroup(billions) + ' Billion ';
  }
  const remMillions = intPart % 1000000000;
  if (remMillions >= 1000000) {
    const millions = Math.floor(remMillions / 1000000);
    words += convertGroup(millions) + ' Million ';
  }
  const remThousands = intPart % 1000000;
  if (remThousands >= 1000) {
    const thousands = Math.floor(remThousands / 1000);
    words += convertGroup(thousands) + ' Thousand ';
  }
  const remUnits = intPart % 1000;
  if (remUnits > 0) {
    words += convertGroup(remUnits) + ' ';
  }

  words = words.trim();
  if (!words) words = 'Zero';

  words += ' ETB';

  if (decPart > 0) {
    words += ' and ' + convertGroup(decPart) + (decPart === 1 ? ' cent' : ' cents');
  }

  return words;
}

/**
 * Format account number to CBE standard receipt masking:
 * e.g. "1000419524747" -> "1****4747"
 * e.g. "1000482918925" -> "1****8925"
 */
function formatCbeMask(raw?: string): string {
  if (!raw) return '1****4747';
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 5) {
    return `${digits[0]}****${digits.slice(-4)}`;
  }
  return raw;
}

/**
 * Formats date into CBE standard receipt string:
 * e.g. "Aug 21, 2026, 6:51 PM"
 */
function formatCbeReceiptDate(dateStr?: string | number | Date): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) {
    return 'Aug 21, 2026, 6:51 PM';
  }

  const dateFormatted = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const timeFormatted = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  return `${dateFormatted}, ${timeFormatted}`;
}

export const CbeWebReceiptModal: React.FC<CbeWebReceiptModalProps> = ({
  transaction,
  smsMessage,
  onClose,
  initialViewMode = 'web',
  initialQrCode
}) => {
  const receiptCardRef = useRef<HTMLDivElement>(null);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>(() => {
    if (initialQrCode) return initialQrCode;
    const custom = LocalDb.getCustomQrCode();
    if (custom) return custom;
    return '';
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Browser bar customization state (synced with settings and localStorage)
  const [browserType, setBrowserType] = useState<BrowserHeaderType>(() => {
    try {
      const saved = localStorage.getItem('cbe_receipt_browser_type') as BrowserHeaderType;
      if (saved && ['chrome', 'opera', 'safari', 'samsung', 'phoenix', 'firefox'].includes(saved)) {
        return saved;
      }
      const fromPhoneSettings = PhoneSettingsService.getSettings().receiptBrowser;
      if (fromPhoneSettings) return fromPhoneSettings;
      return PhoneSettingsService.isIPhoneDevice() ? 'safari' : 'chrome';
    } catch {
      return 'chrome';
    }
  });

  const [tabCount, setTabCount] = useState<string>(() => {
    try {
      return localStorage.getItem('cbe_receipt_tab_count') || '2';
    } catch {
      return '2';
    }
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync browserType with external changes in PhoneSettings
  useEffect(() => {
    const unsubscribe = PhoneSettingsService.subscribe((settings) => {
      if (settings.receiptBrowser && settings.receiptBrowser !== browserType) {
        setBrowserType(settings.receiptBrowser);
      }
    });
    return () => unsubscribe();
  }, [browserType]);

  // Sync native physical device status bar / browser theme color with active subapp
  useEffect(() => {
    const browserThemeColors: Record<BrowserHeaderType, string> = {
      chrome: '#121214',
      opera: '#0e0e10',
      safari: '#1c1c1e',
      samsung: '#181920',
      phoenix: '#131720',
      firefox: '#1c1b22',
    };

    const activeColor = browserThemeColors[browserType] || '#121214';
    SystemBarsService.applyBars({
      statusBarColor: activeColor,
      navBarColor: activeColor,
      isDarkStyle: true,
    });

    return () => {
      SystemBarsService.restoreFromModal();
    };
  }, [browserType]);

  const stampFileInputRef = useRef<HTMLInputElement>(null);
  const pdfLogoFileInputRef = useRef<HTMLInputElement>(null);

  // View Mode: 'web' for mobile web receipt, 'pdf' for official CBE PDF document opened in browser
  const [viewMode, setViewMode] = useState<'web' | 'pdf'>('web');
  const [pdfZoom, setPdfZoom] = useState<number>(1);
  const [isAutoFit, setIsAutoFit] = useState<boolean>(true);
  const [viewportWidth, setViewportWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 640);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute scale for 640px official A4 sheet to fit mobile screens automatically
  const autoFitScale = useMemo(() => {
    const available = Math.max(280, viewportWidth - 28);
    if (available < 640) {
      return Number((available / 640).toFixed(3));
    }
    return 1;
  }, [viewportWidth]);

  const effectiveScale = isAutoFit ? autoFitScale : pdfZoom;
  const [barsToast, setBarsToast] = useState<string | null>(null);
  const barsToastTimerRef = useRef<any>(null);

  const showBarsToast = (msg: string) => {
    if (barsToastTimerRef.current) clearTimeout(barsToastTimerRef.current);
    setBarsToast(msg);
    barsToastTimerRef.current = setTimeout(() => {
      setBarsToast(null);
    }, 2200);
  };

  // Retrieve admin uploaded logo and stamp from LocalDb and listen to updates
  const [adminLogo, setAdminLogo] = useState<string | null>(() => LocalDb.getCustomBankLogo());
  const [customPdfLogo, setCustomPdfLogo] = useState<string | null>(() => LocalDb.getCustomPdfLogo());
  const [pdfLogoUrlInput, setPdfLogoUrlInput] = useState<string>(() => LocalDb.getCustomPdfLogo() || '');
  const [customStamp, setCustomStamp] = useState<string | null>(() => LocalDb.getCustomBankStamp());
  // Web Receipt stamp settings
  const [webStampSize, setWebStampSize] = useState<number>(() => LocalDb.getWebStampSize());
  const [webStampWeight, setWebStampWeight] = useState<StampWeight>(() => LocalDb.getWebStampWeight());
  const [webStampPosition, setWebStampPosition] = useState<StampPosition>(() => LocalDb.getWebStampPosition());

  // PDF Receipt stamp settings
  const [pdfStampSize, setPdfStampSize] = useState<number>(() => LocalDb.getPdfStampSize());
  const [pdfStampWeight, setPdfStampWeight] = useState<StampWeight>(() => LocalDb.getPdfStampWeight());
  const [pdfStampPosition, setPdfStampPosition] = useState<StampPosition>(() => LocalDb.getPdfStampPosition());

  // Dedicated menu state for PDF viewer
  const [isPdfMenuOpen, setIsPdfMenuOpen] = useState<boolean>(false);
  
  // Rearrangeable stamp position state
  const [isEditingStampPosition, setIsEditingStampPosition] = useState<boolean>(false);
  const [isDraggingStamp, setIsDraggingStamp] = useState<boolean>(false);
  const [hasUnsavedStampPos, setHasUnsavedStampPos] = useState<boolean>(false);
  const transactionTableRef = useRef<HTMLDivElement>(null);
  const pdfTableRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startXPercent: number; startYPercent: number } | null>(null);
  const stampLastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });

  const wakeUpStampRearrange = () => {
    setIsEditingStampPosition(true);
    showBarsToast(`${viewMode === 'pdf' ? 'PDF' : 'Web'} stamp rearrange active — drag to move, saved for all receipts`);
  };

  const handleStampClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditingStampPosition) return;

    const now = Date.now();
    const timeDiff = now - stampLastTapRef.current.time;
    const dist = Math.hypot(e.clientX - stampLastTapRef.current.x, e.clientY - stampLastTapRef.current.y);

    if (timeDiff > 40 && timeDiff < 480 && dist < 60) {
      wakeUpStampRearrange();
      stampLastTapRef.current = { time: 0, x: 0, y: 0 };
    } else {
      stampLastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
    }
  };

  const handleStampTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (isEditingStampPosition) return;

    const touch = e.changedTouches[0];
    if (!touch) return;
    const now = Date.now();
    const timeDiff = now - stampLastTapRef.current.time;
    const dist = Math.hypot(touch.clientX - stampLastTapRef.current.x, touch.clientY - stampLastTapRef.current.y);

    if (timeDiff > 40 && timeDiff < 480 && dist < 65) {
      wakeUpStampRearrange();
      stampLastTapRef.current = { time: 0, x: 0, y: 0 };
    } else {
      stampLastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };
    }
  };

  const handleStampDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    wakeUpStampRearrange();
  };

  const webActiveStamp = useMemo(() => {
    if (customStamp) return customStamp;
    return getOfficialCbeStampSvg(webStampWeight);
  }, [customStamp, webStampWeight]);

  const pdfActiveStamp = useMemo(() => {
    if (customStamp) return customStamp;
    return getOfficialCbeStampSvg(pdfStampWeight);
  }, [customStamp, pdfStampWeight]);

  const [rasterizedPdfStampPng, setRasterizedPdfStampPng] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    rasterizeSvgToPng(pdfActiveStamp, 640).then((pngUrl) => {
      if (!isCancelled && pngUrl) {
        setRasterizedPdfStampPng(pngUrl);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [pdfActiveStamp]);

  useEffect(() => {
    const handleSyncLogo = () => {
      setAdminLogo(LocalDb.getCustomBankLogo());
    };
    const handleSyncPdfLogo = () => {
      const val = LocalDb.getCustomPdfLogo();
      setCustomPdfLogo(val);
      setPdfLogoUrlInput(val || '');
    };
    const handleSyncStamp = () => {
      setCustomStamp(LocalDb.getCustomBankStamp());
    };

    const handleSyncWebStampSize = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail?.size) {
        setWebStampSize(customEvt.detail.size);
      } else {
        setWebStampSize(LocalDb.getWebStampSize());
      }
    };
    const handleSyncWebStampWeight = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail?.weight) {
        setWebStampWeight(customEvt.detail.weight);
      } else {
        setWebStampWeight(LocalDb.getWebStampWeight());
      }
    };
    const handleSyncWebStampPosition = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail?.position) {
        setWebStampPosition(customEvt.detail.position);
      } else {
        setWebStampPosition(LocalDb.getWebStampPosition());
      }
      setHasUnsavedStampPos(false);
    };

    const handleSyncPdfStampSize = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail?.size) {
        setPdfStampSize(customEvt.detail.size);
      } else {
        setPdfStampSize(LocalDb.getPdfStampSize());
      }
    };
    const handleSyncPdfStampWeight = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail?.weight) {
        setPdfStampWeight(customEvt.detail.weight);
      } else {
        setPdfStampWeight(LocalDb.getPdfStampWeight());
      }
    };
    const handleSyncPdfStampPosition = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail?.position) {
        setPdfStampPosition(customEvt.detail.position);
      } else {
        setPdfStampPosition(LocalDb.getPdfStampPosition());
      }
      setHasUnsavedStampPos(false);
    };

    window.addEventListener('cbe_logo_updated', handleSyncLogo);
    window.addEventListener('cbe_pdf_logo_updated', handleSyncPdfLogo);
    window.addEventListener('cbe_stamp_updated', handleSyncStamp);
    window.addEventListener('cbe_web_stamp_size_updated', handleSyncWebStampSize);
    window.addEventListener('cbe_stamp_size_updated', handleSyncWebStampSize);
    window.addEventListener('cbe_web_stamp_weight_updated', handleSyncWebStampWeight);
    window.addEventListener('cbe_stamp_weight_updated', handleSyncWebStampWeight);
    window.addEventListener('cbe_web_stamp_position_updated', handleSyncWebStampPosition);
    window.addEventListener('cbe_stamp_position_updated', handleSyncWebStampPosition);

    window.addEventListener('cbe_pdf_stamp_size_updated', handleSyncPdfStampSize);
    window.addEventListener('cbe_pdf_stamp_weight_updated', handleSyncPdfStampWeight);
    window.addEventListener('cbe_pdf_stamp_position_updated', handleSyncPdfStampPosition);

    window.addEventListener('storage', handleSyncLogo);
    window.addEventListener('storage', handleSyncPdfLogo);
    window.addEventListener('storage', handleSyncStamp);
    return () => {
      window.removeEventListener('cbe_logo_updated', handleSyncLogo);
      window.removeEventListener('cbe_pdf_logo_updated', handleSyncPdfLogo);
      window.removeEventListener('cbe_stamp_updated', handleSyncStamp);
      window.removeEventListener('cbe_web_stamp_size_updated', handleSyncWebStampSize);
      window.removeEventListener('cbe_stamp_size_updated', handleSyncWebStampSize);
      window.removeEventListener('cbe_web_stamp_weight_updated', handleSyncWebStampWeight);
      window.removeEventListener('cbe_stamp_weight_updated', handleSyncWebStampWeight);
      window.removeEventListener('cbe_web_stamp_position_updated', handleSyncWebStampPosition);
      window.removeEventListener('cbe_stamp_position_updated', handleSyncWebStampPosition);

      window.removeEventListener('cbe_pdf_stamp_size_updated', handleSyncPdfStampSize);
      window.removeEventListener('cbe_pdf_stamp_weight_updated', handleSyncPdfStampWeight);
      window.removeEventListener('cbe_pdf_stamp_position_updated', handleSyncPdfStampPosition);

      window.removeEventListener('storage', handleSyncLogo);
      window.removeEventListener('storage', handleSyncPdfLogo);
      window.removeEventListener('storage', handleSyncStamp);
    };
  }, []);

  const handleUpdateWebStampWidth = (newSize: number) => {
    const clamped = Math.max(160, Math.min(480, Math.round(newSize)));
    LocalDb.setWebStampSize(clamped);
    setWebStampSize(clamped);
    showBarsToast(`Web stamp size set to ${clamped}px (saved for web receipts)`);
  };

  const handleUpdateWebStampWeight = (newWeight: StampWeight) => {
    LocalDb.setWebStampWeight(newWeight);
    setWebStampWeight(newWeight);
    showBarsToast(`Web stamp weight set to ${newWeight} (saved for web receipts)`);
  };

  const handleUpdatePdfStampWidth = (newSize: number) => {
    const clamped = Math.max(160, Math.min(480, Math.round(newSize)));
    LocalDb.setPdfStampSize(clamped);
    setPdfStampSize(clamped);
    showBarsToast(`PDF stamp size set to ${clamped}px (saved for PDF receipts)`);
  };

  const handleUpdatePdfStampWeight = (newWeight: StampWeight) => {
    LocalDb.setPdfStampWeight(newWeight);
    setPdfStampWeight(newWeight);
    showBarsToast(`PDF stamp weight set to ${newWeight} (saved for PDF receipts)`);
  };

  // Drag & reposition stamp handlers
  const handleStampPointerDown = (e: React.PointerEvent) => {
    if (!isEditingStampPosition) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.stopPropagation();
    e.preventDefault();

    setIsDraggingStamp(true);
    const activePos = viewMode === 'pdf' ? pdfStampPosition : webStampPosition;

    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startXPercent: activePos.xPercent,
      startYPercent: activePos.yPercent
    };

    const handlePointerMove = (moveEvt: PointerEvent) => {
      if (!dragStartRef.current) return;
      const targetTable = viewMode === 'pdf' ? pdfTableRef.current : transactionTableRef.current;
      if (!targetTable) return;
      const rect = targetTable.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const deltaX = moveEvt.clientX - dragStartRef.current.clientX;
      const deltaY = moveEvt.clientY - dragStartRef.current.clientY;

      const deltaXPercent = (deltaX / rect.width) * 100;
      const deltaYPercent = (deltaY / rect.height) * 100;

      const newXPercent = Math.max(5, Math.min(95, Math.round((dragStartRef.current.startXPercent + deltaXPercent) * 10) / 10));
      const newYPercent = Math.max(5, Math.min(95, Math.round((dragStartRef.current.startYPercent + deltaYPercent) * 10) / 10));

      if (viewMode === 'pdf') {
        setPdfStampPosition({ xPercent: newXPercent, yPercent: newYPercent });
      } else {
        setWebStampPosition({ xPercent: newXPercent, yPercent: newYPercent });
      }
      setHasUnsavedStampPos(true);
    };

    const handlePointerUp = () => {
      setIsDraggingStamp(false);
      dragStartRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);

      if (viewMode === 'pdf') {
        setPdfStampPosition(current => {
          LocalDb.setPdfStampPosition(current);
          return current;
        });
        showBarsToast('PDF stamp position saved for all receipts');
      } else {
        setWebStampPosition(current => {
          LocalDb.setWebStampPosition(current);
          return current;
        });
        showBarsToast('Web stamp position saved for all receipts');
      }
      setHasUnsavedStampPos(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handleSaveStampPosition = () => {
    if (viewMode === 'pdf') {
      LocalDb.setPdfStampPosition(pdfStampPosition);
      showBarsToast('PDF stamp position saved for all receipts');
    } else {
      LocalDb.setWebStampPosition(webStampPosition);
      showBarsToast('Web stamp position saved for all receipts');
    }
    setHasUnsavedStampPos(false);
  };

  const handleResetStampPosition = () => {
    const defaultPos: StampPosition = { xPercent: 48, yPercent: 52 };
    if (viewMode === 'pdf') {
      LocalDb.setPdfStampPosition(defaultPos);
      setPdfStampPosition(defaultPos);
      showBarsToast('PDF stamp position reset to center (saved for all receipts)');
    } else {
      LocalDb.setWebStampPosition(defaultPos);
      setWebStampPosition(defaultPos);
      showBarsToast('Web stamp position reset to center (saved for all receipts)');
    }
    setHasUnsavedStampPos(false);
  };

  const handleNudgeStamp = (dx: number, dy: number) => {
    if (viewMode === 'pdf') {
      setPdfStampPosition(prev => {
        const nextX = Math.max(5, Math.min(95, Math.round((prev.xPercent + dx) * 10) / 10));
        const nextY = Math.max(5, Math.min(95, Math.round((prev.yPercent + dy) * 10) / 10));
        const nextPos = { xPercent: nextX, yPercent: nextY };
        LocalDb.setPdfStampPosition(nextPos);
        setHasUnsavedStampPos(false);
        return nextPos;
      });
    } else {
      setWebStampPosition(prev => {
        const nextX = Math.max(5, Math.min(95, Math.round((prev.xPercent + dx) * 10) / 10));
        const nextY = Math.max(5, Math.min(95, Math.round((prev.yPercent + dy) * 10) / 10));
        const nextPos = { xPercent: nextX, yPercent: nextY };
        LocalDb.setWebStampPosition(nextPos);
        setHasUnsavedStampPos(false);
        return nextPos;
      });
    }
  };

  // Derive all receipt fields accurately from either Transaction or SmsMessage
  const receiptData = useMemo(() => {
    if (transaction) {
      const refId = formatTo12CharTxId(transaction.id || transaction.reference || 'FT26233ZJ908');
      const amount = Number(transaction.amount) || 0;
      const serviceCharge = transaction.serviceCharge !== undefined 
        ? Number(transaction.serviceCharge) 
        : (amount >= 10000 ? 3.00 : amount >= 500 ? 10.00 : 0.50);
      const vat = transaction.vat !== undefined 
        ? Number(transaction.vat) 
        : Math.round(serviceCharge * 0.15 * 100) / 100;
      const disasterRecovery = transaction.disasterRecovery !== undefined 
        ? Number(transaction.disasterRecovery) 
        : Math.round(serviceCharge * 0.05 * 100) / 100;
      const totalDebited = transaction.totalDebited !== undefined 
        ? Number(transaction.totalDebited) 
        : Math.round((amount + serviceCharge + vat + disasterRecovery) * 100) / 100;

      const payerName = transaction.senderName || 'Kasahun Yematawork Lema';
      const payerAccount = formatCbeMask(transaction.senderAccount || '1000482918925');
      const receiverName = transaction.recipientName || 'Leykun Jemaneh Ylma';
      const receiverAccount = formatCbeMask(transaction.recipientAccount || '1000419524747');
      const paymentDate = formatCbeReceiptDate(transaction.createdAt);
      const reason = transaction.description && transaction.description.trim().length > 0 
        ? transaction.description 
        : String(Math.round(amount));

      return {
        refId,
        payerName,
        payerAccount,
        receiverName,
        receiverAccount,
        paymentType: 'A2A',
        paymentDate,
        reason,
        amount,
        serviceCharge,
        vat,
        disasterRecovery,
        totalDebited,
        words: numberToCbeWords(totalDebited),
        customerName: payerName
      };
    }

    if (smsMessage) {
      const msg = smsMessage.message || '';
      
      // Extract FT transaction id if available in message (e.g. FT26233ZJ908)
      const ftMatch = msg.match(/FT\d{5,8}[A-Z0-9]{3,6}/i);
      let refId = smsMessage.transactionId;
      if (!refId && ftMatch) {
        refId = ftMatch[0];
      }
      if (!refId) {
        refId = 'FT26233ZJ908';
      }

      // Check if it was a received credit (like Kasahun transfer in screenshot)
      const isCredit = smsMessage.type === 'CREDIT' || msg.toLowerCase().includes('you have received');

      let payerName = 'Kasahun Yematawork Lema';
      let payerAccount = '1****8925';
      let receiverName = 'Leykun Jemaneh Ylma';
      let receiverAccount = '1****4747';

      if (isCredit) {
        // e.g. "You have received ETB 50.00 from account 1*********8925 (Kasahun Yematawork Lema) to your account 1*********4747"
        const fromMatch = msg.match(/from account\s+([\d*]+)\s*\(([^)]+)\)/i);
        if (fromMatch) {
          payerAccount = formatCbeMask(fromMatch[1]);
          payerName = fromMatch[2].trim();
        } else if (smsMessage.sender) {
          payerName = smsMessage.sender;
        }

        const toMatch = msg.match(/to your account\s+([\d*]+)/i);
        if (toMatch) {
          receiverAccount = formatCbeMask(toMatch[1]);
        } else if (smsMessage.accountNumber) {
          receiverAccount = formatCbeMask(smsMessage.accountNumber);
        }
        receiverName = smsMessage.accountName || 'Leykun Jemaneh Ylma';
      } else {
        // Debit
        payerName = smsMessage.accountName || 'Leykun Jemaneh Yilma';
        payerAccount = formatCbeMask(smsMessage.accountNumber || '1000419524747');
        receiverName = smsMessage.recipient || 'Kasahun Yematawork Desta';
        receiverAccount = '1****9999';
      }

      const amount = smsMessage.amount !== undefined ? Number(smsMessage.amount) : 50.00;
      const serviceCharge = smsMessage.serviceCharge !== undefined 
        ? Number(smsMessage.serviceCharge) 
        : (amount >= 30000 ? 3.00 : amount >= 500 ? 10.00 : 0.50);
      const vat = smsMessage.vat !== undefined 
        ? Number(smsMessage.vat) 
        : Math.round(serviceCharge * 0.15 * 100) / 100;
      const disasterRecovery = smsMessage.disasterRecovery !== undefined 
        ? Number(smsMessage.disasterRecovery) 
        : Math.round(serviceCharge * 0.05 * 100) / 100;
      const totalDebited = smsMessage.totalDebited !== undefined 
        ? Number(smsMessage.totalDebited) 
        : Math.round((amount + serviceCharge + vat + disasterRecovery) * 100) / 100;

      const reason = isCredit ? String(Math.round(amount)) : 'MB transfer';

      return {
        refId,
        payerName,
        payerAccount,
        receiverName,
        receiverAccount,
        paymentType: 'A2A',
        paymentDate: formatCbeReceiptDate(smsMessage.timestamp),
        reason,
        amount,
        serviceCharge,
        vat,
        disasterRecovery,
        totalDebited,
        words: numberToCbeWords(totalDebited),
        customerName: isCredit ? payerName : (smsMessage.accountName || payerName)
      };
    }

    // Default Fallback matching Screenshot_20260904-124119.png exactly
    return {
      refId: 'FT26233ZJ908',
      payerName: 'Kasahun Yematawork Lema',
      payerAccount: '1****8925',
      receiverName: 'Leykun Jemaneh Ylma',
      receiverAccount: '1****4747',
      paymentType: 'A2A',
      paymentDate: 'Aug 21, 2026, 6:51 PM',
      reason: '50',
      amount: 50.00,
      serviceCharge: 0.50,
      vat: 0.08,
      disasterRecovery: 0.03,
      totalDebited: 50.61,
      words: 'Fifty ETB and Sixty One cents',
      customerName: 'Kasahun Yematawork Lema'
    };
  }, [transaction, smsMessage]);

  const webReceiptUrl = `https://apps.cbe.com.et:100/?id=${receiptData.refId}`;

  // Helper to convert SVG data URIs into high-resolution PNG data URLs for canvas & PDF export
  const convertSvgDataUriToPng = (svgDataUri: string, size = 450): Promise<string> => {
    return new Promise((resolve) => {
      if (!svgDataUri || svgDataUri.startsWith('data:image/png')) {
        resolve(svgDataUri);
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = size;
          c.height = size;
          const ctx = c.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);
            ctx.drawImage(img, 0, 0, size, size);
            resolve(c.toDataURL('image/png', 1.0));
            return;
          }
        } catch (err) {
          console.warn('Canvas SVG to PNG conversion fallback:', err);
        }
        resolve(svgDataUri);
      };
      img.onerror = () => resolve(svgDataUri);
      img.src = svgDataUri;
    });
  };

  // Synchronize identical authentic CBE QR code for Receipt, Web Receipt, and PDF Receipt
  useEffect(() => {
    let isMounted = true;

    // 1. If a custom QR code was uploaded or set in AdminPanel, use it
    const customQr = LocalDb.getCustomQrCode();
    if (customQr) {
      if (customQr.startsWith('data:image/svg')) {
        convertSvgDataUriToPng(customQr).then((png) => {
          if (isMounted) setQrCodeDataUrl(png);
        });
      } else {
        setQrCodeDataUrl(customQr);
      }
      return;
    }

    // 2. If passed directly from in-app receipt props, sync it (convert to PNG if SVG)
    if (initialQrCode) {
      if (initialQrCode.startsWith('data:image/svg')) {
        convertSvgDataUriToPng(initialQrCode).then((png) => {
          if (isMounted) setQrCodeDataUrl(png);
        });
      } else {
        setQrCodeDataUrl(initialQrCode);
      }
      return;
    }

    const txId = receiptData.refId;
    if (!txId) return;

    // 3. Immediately render authentic SVG data URI so there is zero flash or delay
    try {
      const svgUri = getAuthenticCbeQrSvgDataUri(txId);
      if (svgUri && isMounted) {
        setQrCodeDataUrl(svgUri);
      }
    } catch {
      // Fallback to async PNG
    }

    // 4. Generate high-res 450px Version 3 authentic CBE QR PNG matching Receipt.tsx exactly
    getAuthenticCbeQrPngDataUrl(txId, 450)
      .then((pngUrl) => {
        if (isMounted && pngUrl) {
          setQrCodeDataUrl(pngUrl);
        }
      })
      .catch((err) => console.error('Failed to generate authentic CBE QR:', err));

    return () => {
      isMounted = false;
    };
  }, [receiptData.refId, initialQrCode]);

  // Synchronize dynamic QR updates from AdminPanel or cross-tab storage
  useEffect(() => {
    const handleQrUpdate = () => {
      const customQr = LocalDb.getCustomQrCode();
      if (customQr) {
        if (customQr.startsWith('data:image/svg')) {
          convertSvgDataUriToPng(customQr).then((png) => setQrCodeDataUrl(png));
        } else {
          setQrCodeDataUrl(customQr);
        }
      } else if (receiptData.refId) {
        getAuthenticCbeQrPngDataUrl(receiptData.refId, 450)
          .then((pngUrl) => setQrCodeDataUrl(pngUrl))
          .catch(() => {});
      }
    };

    window.addEventListener('cbe_qr_updated', handleQrUpdate);
    window.addEventListener('storage', handleQrUpdate);
    return () => {
      window.removeEventListener('cbe_qr_updated', handleQrUpdate);
      window.removeEventListener('storage', handleQrUpdate);
    };
  }, [receiptData.refId]);

  const handleOpenPdfView = () => {
    setViewMode('pdf');
    showBarsToast('Official CBE PDF opened — double-tap stamp to rearrange, or click Save PDF');
  };

  const handleDownloadPdf = async () => {
    if (isDownloading) return;

    try {
      setIsDownloading(true);
      setDownloadError(null);
      showBarsToast('Generating high-resolution official CBE PDF...');

      // 1. Resolve exact QR code currently visible in the Web Receipt
      let exactQr = qrCodeDataUrl;
      const webReceiptQrImg = receiptCardRef.current?.querySelector('img[alt="Official CBE Receipt QR"]') as HTMLImageElement | null;
      if (webReceiptQrImg && webReceiptQrImg.src) {
        exactQr = webReceiptQrImg.src;
      }

      // Convert SVG QR data URI to PNG if needed for flawless rendering
      if (exactQr && (exactQr.startsWith('data:image/svg') || exactQr.includes('<svg'))) {
        try {
          exactQr = await convertSvgDataUriToPng(exactQr, 450);
          setQrCodeDataUrl(exactQr);
        } catch {
          const genPng = await getAuthenticCbeQrPngDataUrl(receiptData.refId || 'FT26248KLR82', 450);
          if (genPng) {
            exactQr = genPng;
            setQrCodeDataUrl(exactQr);
          }
        }
      }

      if (!exactQr) {
        exactQr = await getAuthenticCbeQrPngDataUrl(receiptData.refId || 'FT26248KLR82', 450);
        if (exactQr) setQrCodeDataUrl(exactQr);
      }

      // Brief pause to allow state batching and image pre-rendering to settle
      await new Promise(r => setTimeout(r, 200));

      // Target the permanently mounted offscreen template element
      const targetContainer = pdfTemplateRef.current || document.getElementById('cbe-official-pdf-render-canvas');
      if (!targetContainer || !document.body.contains(targetContainer)) {
        throw new Error('Receipt document template is not ready. Please try again.');
      }

      const page1Element = (targetContainer.querySelector('#cbe-pdf-page-1') || targetContainer) as HTMLElement;
      const page2Element = targetContainer.querySelector('#cbe-pdf-page-2') as HTMLElement | null;

      // Ensure QR image element on Page 1 has the exact source loaded
      const qrImageInPage1 = page1Element.querySelector('#cbe-pdf-official-qr-image') as HTMLImageElement | null;
      if (qrImageInPage1 && exactQr) {
        qrImageInPage1.src = exactQr;
        if (!qrImageInPage1.complete) {
          await new Promise<void>((resolve) => {
            qrImageInPage1.onload = () => resolve();
            qrImageInPage1.onerror = () => resolve();
            setTimeout(resolve, 300);
          });
        }
      }

      // Capture Page 1 cleanly with the single exact QR code from web receipt
      const canvas1 = await html2canvas(page1Element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 15000,
        windowWidth: 640,
      });

      const imgData1 = canvas1.toDataURL('image/png', 1.0);

      // Capture Page 2 (The Bank you can always rely on footer)
      let canvas2: HTMLCanvasElement | null = null;
      let imgData2: string | null = null;
      if (page2Element) {
        canvas2 = await html2canvas(page2Element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          imageTimeout: 15000,
          windowWidth: 640,
        });
        imgData2 = canvas2.toDataURL('image/png', 1.0);
      }

      // Generate authentic high-resolution 2-page PDF document matching A4 format
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

      // Standard official margins (12mm)
      const marginX = 12;
      const marginY = 12;
      const printableWidth = pageWidth - (marginX * 2);
      const printableHeight = pageHeight - (marginY * 2);

      // --- RENDER PAGE 1 ---
      let renderWidth1 = printableWidth;
      let renderHeight1 = (canvas1.height * renderWidth1) / canvas1.width;
      if (renderHeight1 > printableHeight) {
        const ratio = printableHeight / renderHeight1;
        renderHeight1 = printableHeight;
        renderWidth1 = renderWidth1 * ratio;
      }
      const startX1 = marginX + (printableWidth - renderWidth1) / 2;
      pdf.addImage(imgData1, 'PNG', startX1, marginY, renderWidth1, renderHeight1, undefined, 'FAST');

      // --- RENDER PAGE 2 ---
      if (imgData2 && canvas2) {
        pdf.addPage();
        let renderWidth2 = printableWidth;
        let renderHeight2 = (canvas2.height * renderWidth2) / canvas2.width;
        if (renderHeight2 > printableHeight) {
          const ratio = printableHeight / renderHeight2;
          renderHeight2 = printableHeight;
          renderWidth2 = renderWidth2 * ratio;
        }
        const startX2 = marginX + (printableWidth - renderWidth2) / 2;
        pdf.addImage(imgData2, 'PNG', startX2, marginY, renderWidth2, renderHeight2, undefined, 'FAST');
      }

      pdf.save(`CBE_Customer_Receipt_${receiptData.refId || 'FT'}.pdf`);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err: any) {
      console.error('PDF Download error:', err);
      setDownloadError(err?.message || 'Failed to generate PDF. Please try again.');
      setTimeout(() => setDownloadError(null), 4000);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleDownloadPng = async () => {
    const rawTarget = pdfTemplateRef.current || receiptCardRef.current;
    if (!rawTarget || isDownloading) return;
    const targetElement = (rawTarget.querySelector('#cbe-pdf-page-1') as HTMLElement) || rawTarget;
    try {
      setIsDownloading(true);
      setDownloadError(null);
      const canvas = await html2canvas(targetElement, {
        scale: 3.0,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 15000,
      });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `CBE_Customer_Receipt_${receiptData.refId || 'FT'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err: any) {
      console.error('PNG Download error:', err);
      setDownloadError(err?.message || 'Failed to save image. Please try again.');
      setTimeout(() => setDownloadError(null), 4000);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(webReceiptUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const handleSelectBrowser = (type: BrowserHeaderType) => {
    setBrowserType(type);
    try {
      localStorage.setItem('cbe_receipt_browser_type', type);
      PhoneSettingsService.updateSettings({ receiptBrowser: type });
    } catch {}
    const labels: Record<BrowserHeaderType, string> = {
      chrome: 'Google Chrome',
      opera: 'Opera Browser',
      safari: 'Apple Safari',
      samsung: 'Samsung Internet',
      phoenix: 'Phoenix Browser',
      firefox: 'Mozilla Firefox',
    };
    showBarsToast(`Browser switched to ${labels[type] || type}`);
  };

  const handleSelectTabCount = (count: string) => {
    const clean = count.replace(/[^0-9+]/g, '').slice(0, 4) || '1';
    setTabCount(clean);
    localStorage.setItem('cbe_receipt_tab_count', clean);
  };

  const handleUploadStampFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        LocalDb.setCustomBankStamp(dataUrl);
        setCustomStamp(dataUrl);
        setIsMenuOpen(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetStamp = () => {
    LocalDb.setCustomBankStamp(null);
    setCustomStamp(null);
  };

  const handleUploadPdfLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        LocalDb.setCustomPdfLogo(dataUrl);
        setCustomPdfLogo(dataUrl);
        setPdfLogoUrlInput(dataUrl);
        showBarsToast('PDF logo updated (PDF only)');
        setIsMenuOpen(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyPdfLogoUrl = (inputUrl?: string) => {
    const target = (inputUrl !== undefined ? inputUrl : pdfLogoUrlInput).trim();
    if (!target) {
      handleResetPdfLogo();
      return;
    }
    LocalDb.setCustomPdfLogo(target);
    setCustomPdfLogo(target);
    showBarsToast('PDF logo updated by URL (PDF only)');
  };

  const handleResetPdfLogo = () => {
    LocalDb.setCustomPdfLogo(null);
    setCustomPdfLogo(null);
    setPdfLogoUrlInput('');
    showBarsToast('PDF logo reset to official CBE emblem');
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#f0f2f5] flex flex-col items-stretch justify-start overflow-hidden w-full h-full min-h-[100dvh] select-none"
    >
      
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

      {/* Hidden file input for uploading bank stamp directly */}
      <input 
        ref={stampFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUploadStampFile}
      />

      {/* Hidden file input for uploading custom PDF logo (PDF only) */}
      <input 
        ref={pdfLogoFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUploadPdfLogoFile}
      />

      {/* Mobile Browser Headers (Edge-to-Edge with Physical Device Safe-Area Top) */}
      {browserType === 'opera' ? (
        /* ================= 1. OPERA HEADER ================= */
        <header 
          id="cbe-opera-browser-header"
          className="w-full px-3.5 pt-[max(env(safe-area-inset-top,0px),8px)] pb-2.5 bg-[#0e0e10] border-b border-neutral-900 flex items-center justify-between text-white flex-shrink-0 z-30 select-none shadow-sm"
        >
          {/* Back button */}
          <button
            onClick={onClose}
            aria-label="Back"
            className="p-1 -ml-1 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-full transition cursor-pointer flex items-center justify-center shrink-0 mr-1.5"
            title="Return to App"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Left / Center: (i) Info icon + Exact URL: apps.cbe.com.et:100/?id=FT2... */}
          <div 
            onClick={handleCopyLink}
            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer select-none pr-2 py-0.5"
            title="Click to copy receipt URL"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white/95 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="9.5" />
              <path d="M12 7.5h.01M12 11v5" strokeWidth="2.2" strokeLinecap="round" />
            </svg>

            <div className="flex-1 overflow-hidden whitespace-nowrap text-ellipsis text-[14px] text-[#e5e5e5] font-normal tracking-tight font-sans">
              {viewMode === 'pdf' ? (
                <span className="flex items-center gap-1.5">
                  <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-2xs leading-none">PDF</span>
                  <span className="truncate">apps.cbe.com.et:100/pdf/?id={receiptData.refId}</span>
                </span>
              ) : copiedUrl ? (
                <span className="text-emerald-400 font-bold text-xs">Copied URL to clipboard!</span>
              ) : (
                <span>apps.cbe.com.et:100/?id={receiptData.refId}</span>
              )}
            </div>
          </div>

          {/* Right: Circular Refresh Arrow + Tabs count + 3-Dots Menu */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRefresh}
              className="p-1 text-neutral-200 hover:text-white transition cursor-pointer flex items-center justify-center"
              title="Reload page"
              aria-label="Reload page"
            >
              <svg viewBox="0 0 24 24" className={`w-4.5 h-4.5 text-neutral-200 stroke-current ${isRefreshing ? 'animate-spin' : ''}`} fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-2.6-6.3L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>

            <button
              onClick={() => setIsMenuOpen(true)}
              className="w-5 h-5 rounded-[4px] border border-neutral-400 text-neutral-200 font-bold text-[10.5px] flex items-center justify-center hover:bg-white/10 transition cursor-pointer shrink-0"
              title="Tabs / Browser Settings"
            >
              {tabCount}
            </button>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 text-white hover:bg-white/10 rounded-full transition cursor-pointer flex items-center justify-center"
              title="Opera menu & options"
              aria-label="Opera menu & options"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <circle cx="12" cy="5" r="1.7" />
                <circle cx="12" cy="12" r="1.7" />
                <circle cx="12" cy="19" r="1.7" />
              </svg>
            </button>
          </div>
        </header>
      ) : browserType === 'chrome' ? (
        /* ================= 2. GOOGLE CHROME HEADER ================= */
        <header 
          id="cbe-chrome-browser-header"
          className="w-full px-3 pt-[max(env(safe-area-inset-top,0px),8px)] pb-2 bg-[#121214] border-b border-[#282a30] flex items-center justify-between text-white flex-shrink-0 z-30 select-none shadow-sm"
        >
          {/* Left: Home Button */}
          <button
            onClick={onClose}
            aria-label="Home"
            className="p-1 text-white hover:bg-white/10 rounded-full transition cursor-pointer flex items-center justify-center shrink-0"
            title="Home (Close Receipt)"
          >
            <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H15v-6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v6H4.5A1.5 1.5 0 0 1 3 20v-9.5z" />
            </svg>
          </button>

          {/* Center: Address Bar Pill */}
          <div 
            onClick={handleCopyLink}
            className="flex-1 bg-[#28282b] hover:bg-[#323236] h-9.5 rounded-full px-3.5 flex items-center gap-2.5 cursor-pointer transition select-none overflow-hidden mx-2 shadow-xs"
            title="Click to copy receipt URL"
          >
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] text-white shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none" />
              <path d="M12 11.2v5.3" strokeWidth="2" strokeLinecap="round" />
            </svg>

            <div className="flex-1 overflow-hidden whitespace-nowrap text-ellipsis flex items-center">
              {viewMode === 'pdf' ? (
                <div className="flex items-center gap-1.5 text-[13px] text-[#e3e3e8] font-normal tracking-tight font-sans">
                  <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-2xs leading-none">PDF</span>
                  <span className="truncate">apps.cbe.com.et:100/pdf/?id={receiptData.refId}</span>
                </div>
              ) : copiedUrl ? (
                <span className="text-emerald-400 font-bold text-xs">Copied URL to clipboard!</span>
              ) : (
                <div className="text-[14px] text-[#e3e3e8] font-normal tracking-tight font-sans flex items-center">
                  <span className="inline-block opacity-65">s</span>
                  <span>.cbe.com.et:100</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Google Translate, Tab count [2], 3-dots */}
          <div className="flex items-center gap-2 shrink-0 pr-0.5">
            <button
              onClick={handleCopyLink}
              className="p-1 text-white hover:bg-white/10 rounded-md transition cursor-pointer flex items-center justify-center shrink-0"
              title="Google Translate"
              aria-label="Google Translate"
            >
              <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="none">
                <rect x="2.5" y="3.5" width="12" height="13.5" rx="2" fill="#ffffff" />
                <text x="5.2" y="13" fill="#121214" fontSize="8" fontWeight="bold" fontFamily="system-ui, -apple-system, sans-serif">G</text>
                <path 
                  d="M8.5 7.5a1.5 1.5 0 0 1 1.5-1.5h8.5a1.5 1.5 0 0 1 1.5 1.5v7.2a1.5 1.5 0 0 1-.44 1.06l-2.7 2.7A1.5 1.5 0 0 1 15.8 19H10a1.5 1.5 0 0 1-1.5-1.5v-10z" 
                  fill="#121214" 
                  stroke="#ffffff" 
                  strokeWidth="1.6" 
                  strokeLinejoin="round"
                />
                <path d="M16.5 18.8v-2.5a.8.8 0 0 1 .8-.8h2.5" fill="none" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <text x="11.2" y="15" fill="#ffffff" fontSize="8" fontWeight="bold" fontFamily="system-ui, -apple-system, sans-serif">文</text>
              </svg>
            </button>

            <button
              onClick={() => setIsMenuOpen(true)}
              className="w-[20px] h-[20px] rounded-[4.5px] border-[1.8px] border-white text-white font-bold text-[11px] flex items-center justify-center hover:bg-white/10 transition cursor-pointer shrink-0 leading-none"
              title="Tabs (Click to customize)"
            >
              <span className="-translate-y-[0.5px]">{tabCount}</span>
            </button>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 text-white hover:bg-white/10 rounded-full transition cursor-pointer flex items-center justify-center shrink-0"
              title="Chrome menu"
              aria-label="Chrome menu"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <circle cx="12" cy="5" r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="12" cy="19" r="1.6" />
              </svg>
            </button>
          </div>
        </header>
      ) : browserType === 'safari' ? (
        /* ================= 3. APPLE SAFARI (iOS) HEADER ================= */
        <header 
          id="cbe-safari-browser-header"
          className="w-full px-3.5 pt-[max(env(safe-area-inset-top,0px),8px)] pb-2.5 bg-[#1c1c1e]/98 backdrop-blur-md border-b border-neutral-800 flex items-center justify-between text-white flex-shrink-0 z-30 select-none shadow-sm"
        >
          {/* Left: Done button */}
          <button
            onClick={onClose}
            className="text-[#0a84ff] hover:text-blue-400 font-medium text-[15px] px-1 py-1 transition cursor-pointer shrink-0"
            title="Done (Close Receipt)"
          >
            Done
          </button>

          {/* Center: Address Bar Capsule */}
          <div 
            onClick={handleCopyLink}
            className="flex-1 bg-[#2c2c2e] hover:bg-[#38383a] h-9 rounded-xl px-3 flex items-center justify-between cursor-pointer transition select-none mx-2.5 border border-neutral-700/50 shadow-inner"
            title="Click to copy receipt URL"
          >
            <span className="text-[11px] font-serif font-bold text-neutral-400 select-none tracking-tight">
              <span className="text-sm">a</span>A
            </span>

            <div className="flex items-center gap-1.5 overflow-hidden mx-2">
              <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="text-[13.5px] text-[#f2f2f7] font-sans font-medium tracking-tight truncate">
                {viewMode === 'pdf' ? `apps.cbe.com.et:100/pdf/?id=${receiptData.refId}` : 'apps.cbe.com.et:100'}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRefresh();
              }}
              className="text-neutral-400 hover:text-white transition"
              title="Reload"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Right: Share icon & Safari Settings */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className="p-1 text-[#0a84ff] hover:text-blue-400 transition cursor-pointer"
              title="Share / Copy Link"
            >
              <Share2 className="w-4.5 h-4.5" />
            </button>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 text-[#0a84ff] hover:text-blue-400 transition cursor-pointer"
              title="Safari Tabs & Settings"
            >
              <div className="w-4.5 h-4.5 border-2 border-current rounded-xs relative">
                <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-current rounded-2xs" />
              </div>
            </button>
          </div>
        </header>
      ) : browserType === 'samsung' ? (
        /* ================= 4. SAMSUNG INTERNET HEADER ================= */
        <header 
          id="cbe-samsung-browser-header"
          className="w-full px-3.5 pt-[max(env(safe-area-inset-top,0px),8px)] pb-2 bg-[#181920] border-b border-neutral-800 flex items-center justify-between text-[#e2e4ea] flex-shrink-0 z-30 select-none shadow-sm"
        >
          <button
            onClick={onClose}
            aria-label="Home"
            className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-full transition cursor-pointer shrink-0"
            title="Return to App"
          >
            <Home className="w-4.5 h-4.5" />
          </button>

          <div 
            onClick={handleCopyLink}
            className="flex-1 bg-[#262730] hover:bg-[#30323c] h-9 rounded-full px-3.5 flex items-center justify-between cursor-pointer transition select-none mx-2 border border-neutral-700/60"
            title="Click to copy receipt URL"
          >
            <div className="flex items-center gap-1.5 overflow-hidden">
              <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="text-[13.5px] text-white font-sans tracking-tight truncate">
                {viewMode === 'pdf' ? `apps.cbe.com.et:100/pdf/?id=${receiptData.refId}` : 'apps.cbe.com.et:100'}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRefresh();
              }}
              className="text-neutral-400 hover:text-white"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => showBarsToast('Bookmark saved')}
              className="p-1 text-amber-400 hover:text-amber-300 transition"
              title="Bookmark"
            >
              <Star className="w-4.5 h-4.5 fill-amber-400/20" />
            </button>

            <button
              onClick={() => setIsMenuOpen(true)}
              className="w-5.5 h-5.5 rounded-lg border border-neutral-400 text-white font-bold text-[10.5px] flex items-center justify-center hover:bg-neutral-800 transition"
              title="Tabs"
            >
              {tabCount}
            </button>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 text-neutral-300 hover:text-white transition"
              title="Samsung menu"
            >
              <MoreVertical className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>
      ) : browserType === 'phoenix' ? (
        /* ================= 5. PHOENIX BROWSER HEADER ================= */
        <header 
          id="cbe-phoenix-browser-header"
          className="w-full px-3 pt-[max(env(safe-area-inset-top,0px),8px)] pb-2 bg-[#131720] border-b border-[#202735] flex items-center justify-between text-[#e0e5ee] flex-shrink-0 z-30 select-none shadow-sm"
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={onClose}
              aria-label="Back"
              className="p-1 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-full transition"
              title="Return to App"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div 
              onClick={() => setIsMenuOpen(true)}
              className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-emerald-400 text-xs font-black select-none cursor-pointer"
              title="Phoenix Browser"
            >
              P
            </div>
          </div>

          <div 
            onClick={handleCopyLink}
            className="flex-1 bg-[#1e2433] hover:bg-[#283044] h-9 rounded-full px-3 flex items-center justify-between cursor-pointer transition select-none mx-2 border border-[#2b354a]"
            title="Click to copy receipt URL"
          >
            <div className="flex items-center gap-1.5 overflow-hidden">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[13px] text-white font-sans tracking-tight truncate">
                apps.cbe.com.et:100
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="w-5.5 h-5.5 rounded-[5px] border-[1.8px] border-neutral-300 text-neutral-200 font-bold text-[10.5px] flex items-center justify-center hover:bg-neutral-800 transition"
              title="Tabs"
            >
              {tabCount}
            </button>

            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-full transition"
              title="Browser options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </header>
      ) : (
        /* ================= 6. MOZILLA FIREFOX HEADER ================= */
        <header 
          id="cbe-firefox-browser-header"
          className="w-full px-3 pt-[max(env(safe-area-inset-top,0px),8px)] pb-2 bg-[#1c1b22] border-b border-[#2b2a33] flex items-center justify-between text-white flex-shrink-0 z-30 select-none shadow-sm"
        >
          <button 
            onClick={onClose}
            aria-label="Back"
            className="p-1 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-full transition shrink-0"
            title="Return to App"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div 
            onClick={handleCopyLink}
            className="flex-1 bg-[#2b2a33] hover:bg-[#383742] h-9 rounded-xl px-3 flex items-center justify-between cursor-pointer transition select-none mx-2 border border-neutral-700/60"
            title="Click to copy receipt URL"
          >
            <div className="flex items-center gap-1.5 overflow-hidden">
              <Shield className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <Lock className="w-3 h-3 text-neutral-400 shrink-0" />
              <span className="text-[13px] text-neutral-100 font-sans tracking-tight truncate">
                apps.cbe.com.et:100
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRefresh();
              }}
              className="text-neutral-400 hover:text-white"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="w-5.5 h-5.5 rounded-md border border-neutral-400 text-white font-bold text-[10.5px] flex items-center justify-center hover:bg-neutral-800 transition"
              title="Tabs"
            >
              {tabCount}
            </button>

            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-full transition"
              title="Firefox menu & options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </header>
      )}

      {/* 3-Dot Options & Browser Style Switcher Menu Popup */}
      {isMenuOpen && (
        <>
          {/* Backdrop dismiss */}
          <div 
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-2xs animate-fade-in"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Floating Options Card */}
          <div 
            id="browser-settings-modal"
            className="fixed top-12 sm:top-14 right-2 sm:right-4 z-50 w-84 max-w-[calc(100vw-16px)] max-h-[calc(100vh-64px)] overflow-y-auto bg-[#1c1f26] text-white rounded-2xl shadow-2xl border border-neutral-700/90 p-4 animate-in fade-in zoom-in-95 duration-150 select-none"
            style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-700/80 mb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4.5 h-4.5 text-emerald-400" />
                <div>
                  <h3 className="text-[14px] font-bold tracking-tight flex items-center gap-1.5">
                    <span>Web Receipt Settings</span>
                    <span className="text-[9.5px] bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                      Web View
                    </span>
                  </h3>
                  <p className="text-[10px] text-neutral-400">Header style &amp; web receipt stamp options</p>
                </div>
              </div>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-1 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Browser Type Selector (All 6 Browsers) */}
            <div className="space-y-1.5 mb-4">
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Choose Browser Header Style
              </p>

              {/* 1. Google Chrome */}
              <button
                type="button"
                onClick={() => handleSelectBrowser('chrome')}
                className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left transition cursor-pointer ${
                  browserType === 'chrome'
                    ? 'bg-emerald-500/20 border border-emerald-400/80 text-white'
                    : 'bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#1f1f21] flex items-center justify-center border border-neutral-600 text-white font-bold text-xs">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H15v-6h-6v6H4.5A1.5 1.5 0 0 1 3 20v-9.5z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold flex items-center gap-1.5">
                      <span>Google Chrome</span>
                      <span className="text-[9.5px] bg-neutral-700 text-white px-1.5 py-0.2 rounded font-semibold">Image 1</span>
                    </div>
                    <div className="text-[10px] text-neutral-400">Home icon, pill bar, Google Translate & tabs</div>
                  </div>
                </div>
                {browserType === 'chrome' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>

              {/* 2. Opera */}
              <button
                type="button"
                onClick={() => handleSelectBrowser('opera')}
                className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left transition cursor-pointer ${
                  browserType === 'opera'
                    ? 'bg-emerald-500/20 border border-emerald-400/80 text-white'
                    : 'bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#0e0e10] flex items-center justify-center border border-neutral-700 text-neutral-200">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-neutral-200" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-2.6-6.3L21 8" />
                      <path d="M21 3v5h-5" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold flex items-center gap-1.5">
                      <span>Opera Browser</span>
                      <span className="text-[9.5px] bg-red-950 border border-red-500/50 text-red-300 px-1.5 py-0.2 rounded font-semibold">Image 2</span>
                    </div>
                    <div className="text-[10px] text-neutral-400">Flat black bar, full URL with ID, reload button</div>
                  </div>
                </div>
                {browserType === 'opera' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>

              {/* 3. Apple Safari (iOS) */}
              <button
                type="button"
                onClick={() => handleSelectBrowser('safari')}
                className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left transition cursor-pointer ${
                  browserType === 'safari'
                    ? 'bg-emerald-500/20 border border-emerald-400/80 text-white'
                    : 'bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#1c1c1e] flex items-center justify-center border border-neutral-700 text-[#0a84ff]">
                    <span className="text-[10px] font-serif font-black">aA</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold flex items-center gap-1.5">
                      <span>Apple Safari</span>
                      <span className="text-[9.5px] bg-blue-950 border border-blue-500/50 text-blue-300 px-1.5 py-0.2 rounded font-semibold">iOS Style</span>
                    </div>
                    <div className="text-[10px] text-neutral-400">Done button, aA text controls, lock pill & share</div>
                  </div>
                </div>
                {browserType === 'safari' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>

              {/* 4. Samsung Internet */}
              <button
                type="button"
                onClick={() => handleSelectBrowser('samsung')}
                className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left transition cursor-pointer ${
                  browserType === 'samsung'
                    ? 'bg-emerald-500/20 border border-emerald-400/80 text-white'
                    : 'bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center border border-neutral-700 text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400/30 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold">Samsung Internet</div>
                    <div className="text-[10px] text-neutral-400">Galaxy One UI style with bookmark star & tabs</div>
                  </div>
                </div>
                {browserType === 'samsung' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>

              {/* 5. Phoenix Browser */}
              <button
                type="button"
                onClick={() => handleSelectBrowser('phoenix')}
                className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left transition cursor-pointer ${
                  browserType === 'phoenix'
                    ? 'bg-emerald-500/20 border border-emerald-400/80 text-white'
                    : 'bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-950/80 flex items-center justify-center border border-emerald-500/50 text-emerald-400 font-black text-xs">
                    P
                  </div>
                  <div>
                    <div className="text-[13px] font-bold">Phoenix Browser</div>
                    <div className="text-[10px] text-neutral-400">Tecno, Infinix & Itel mobile style</div>
                  </div>
                </div>
                {browserType === 'phoenix' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>

              {/* 6. Mozilla Firefox */}
              <button
                type="button"
                onClick={() => handleSelectBrowser('firefox')}
                className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left transition cursor-pointer ${
                  browserType === 'firefox'
                    ? 'bg-emerald-500/20 border border-emerald-400/80 text-white'
                    : 'bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-950/80 flex items-center justify-center border border-purple-500/50 text-purple-400 font-bold text-xs">
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold">Mozilla Firefox</div>
                    <div className="text-[10px] text-neutral-400">Tracking shield & dark modern layout</div>
                  </div>
                </div>
                {browserType === 'firefox' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>
            </div>

            {/* Tab Counter Selector */}
            <div className="mb-4 pt-3 border-t border-neutral-700/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Tab Counter Badge
                </span>
                <span className="text-xs text-emerald-400 font-mono font-bold">[{tabCount}]</span>
              </div>
              <div className="flex items-center gap-1.5">
                {['2', '1', '4', '12', '80', '99+'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleSelectTabCount(num)}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      tabCount === num
                        ? 'bg-emerald-500 text-black shadow-xs'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Web Stamp Width & Weight Customizer */}
            <div className="mb-4 pt-3 border-t border-neutral-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Stamp className="w-3.5 h-3.5 text-purple-400" />
                  <span>Web Stamp Width &amp; Weight</span>
                </span>
                <span className="text-[10px] text-purple-300 font-mono font-bold bg-purple-900/60 border border-purple-500/40 px-2 py-0.5 rounded-full">
                  {webStampSize}px • {webStampWeight.toUpperCase()}
                </span>
              </div>

              {/* 1. Web Stamp Width Control (Slider, Steppers, & Quick Presets) */}
              <div className="bg-neutral-850/80 border border-neutral-700/70 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-purple-400" />
                    <span>Web Stamp Width (ስፋት)</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateWebStampWidth(webStampSize - 10)}
                      className="w-5 h-5 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-200 flex items-center justify-center font-bold text-xs transition cursor-pointer"
                      title="Decrease width by 10px"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs text-purple-300 font-mono font-bold px-1 min-w-[46px] text-center">
                      {webStampSize}px
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateWebStampWidth(webStampSize + 10)}
                      className="w-5 h-5 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-200 flex items-center justify-center font-bold text-xs transition cursor-pointer"
                      title="Increase width by 10px"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Range Slider for dynamic width adjustment */}
                <input
                  type="range"
                  min="160"
                  max="480"
                  step="5"
                  value={webStampSize}
                  onChange={(e) => handleUpdateWebStampWidth(Number(e.target.value))}
                  className="w-full accent-purple-500 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                />

                {/* Quick Presets */}
                <div className="grid grid-cols-5 gap-1 pt-0.5">
                  {[
                    { label: '220px', size: 220, name: 'Small' },
                    { label: '260px', size: 260, name: 'Normal' },
                    { label: '330px', size: 330, name: 'Med' },
                    { label: '380px', size: 380, name: 'Large' },
                    { label: '440px', size: 440, name: 'Jumbo' },
                  ].map((preset) => (
                    <button
                      key={preset.size}
                      type="button"
                      onClick={() => handleUpdateWebStampWidth(preset.size)}
                      className={`py-1 px-0.5 rounded-lg text-[10px] font-semibold transition text-center cursor-pointer ${
                        webStampSize === preset.size
                          ? 'bg-purple-600 text-white font-bold shadow-xs'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Web Stamp Weight (Ink Thickness & Saturated Impression) */}
              <div className="bg-neutral-850/80 border border-neutral-700/70 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Feather className="w-3.5 h-3.5 text-purple-400" />
                    <span>Web Stamp Weight / Ink (ክብደት)</span>
                  </span>
                  <span className="text-purple-300 font-medium text-[10.5px]">
                    {webStampWeight === 'light' ? 'Light (ቀላል)' : 
                     webStampWeight === 'normal' ? 'Normal (መደበኛ)' :
                     webStampWeight === 'medium' ? 'Medium (መካከለኛ)' :
                     webStampWeight === 'bold' ? 'Bold (ደማቅ)' : 'Heavy (እጅግ ደማቅ)'}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1">
                  {(['light', 'normal', 'medium', 'bold', 'heavy'] as StampWeight[]).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => handleUpdateWebStampWeight(w)}
                      className={`py-1.5 px-0.5 rounded-lg text-[10px] font-semibold transition text-center capitalize cursor-pointer ${
                        webStampWeight === w
                          ? 'bg-purple-600 text-white font-bold shadow-xs'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Web Stamp Position Controls (Rearrange & Reset) */}
              <div className="bg-neutral-850/80 border border-neutral-700/70 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Move className="w-3.5 h-3.5 text-purple-400" />
                    <span>Web Stamp Position (ቦታ)</span>
                  </span>
                  <span className="text-[10px] text-purple-300 font-mono font-bold bg-purple-900/40 px-1.5 py-0.5 rounded border border-purple-500/30">
                    X: {webStampPosition.xPercent}% • Y: {webStampPosition.yPercent}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingStampPosition(true);
                      setIsMenuOpen(false);
                      showBarsToast('Click & drag stamp to position anywhere on web receipt, then click Save');
                    }}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 shadow-md shadow-purple-600/30"
                  >
                    <Move className="w-3.5 h-3.5" />
                    <span>Rearrange Position</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetStampPosition}
                    className="py-1.5 px-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer border border-neutral-700 active:scale-95"
                    title="Reset web stamp to default center"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Center</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-3 border-t border-neutral-700/80 space-y-1.5">
              <button
                type="button"
                onClick={() => { handleOpenPdfView(); setIsMenuOpen(false); }}
                className="w-full px-3 py-2 rounded-xl bg-purple-900/40 hover:bg-purple-900/70 border border-purple-500/40 text-purple-200 hover:text-white text-xs font-semibold flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>Open Official PDF View</span>
                </span>
                <span className="text-[10px] text-purple-300 font-bold bg-purple-800/60 px-1.5 py-0.5 rounded">.PDF</span>
              </button>

              <button
                type="button"
                onClick={() => { handleDownloadPdf(); setIsMenuOpen(false); }}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-300 hover:text-white text-xs font-medium flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Direct Download PDF</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-medium">Save</span>
              </button>

              <button
                type="button"
                onClick={() => { handleDownloadPng(); setIsMenuOpen(false); }}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs font-medium flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Save Receipt as Image</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-semibold">.PNG</span>
              </button>

              <button
                type="button"
                onClick={() => { handleCopyLink(); setIsMenuOpen(false); }}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs font-medium flex items-center gap-2 transition cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                <span>Copy Receipt URL (apps.cbe.com.et:100)</span>
              </button>

              <button
                type="button"
                onClick={() => { handleRefresh(); setIsMenuOpen(false); }}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs font-medium flex items-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
                <span>Refresh / Reload Receipt Page</span>
              </button>

              <button
                type="button"
                onClick={() => { stampFileInputRef.current?.click(); }}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs font-medium flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Upload Custom Bank Stamp</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">Image</span>
              </button>

              {customStamp && (
                <button
                  type="button"
                  onClick={handleResetStamp}
                  className="w-full px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-950/70 text-red-300 text-xs font-medium flex items-center gap-2 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Reset Stamp to CBE Official</span>
                </button>
              )}

              {/* Change PDF Logo by URL (PDF Only) */}
              <div className="bg-neutral-850/80 border border-neutral-700/80 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-purple-200">
                    <Link className="w-3.5 h-3.5 text-purple-400" />
                    <span>PDF Logo (by URL)</span>
                  </span>
                  <span className="text-[10px] text-purple-300 font-bold bg-purple-900/60 px-1.5 py-0.5 rounded">
                    PDF Only
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="url"
                    value={pdfLogoUrlInput}
                    onChange={(e) => setPdfLogoUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyPdfLogoUrl();
                      }
                    }}
                    placeholder="https://... image URL"
                    className="flex-1 bg-neutral-900 border border-neutral-700 focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyPdfLogoUrl()}
                    className="bg-purple-700 hover:bg-purple-600 active:bg-purple-800 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer shadow-sm"
                  >
                    Apply
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-neutral-700/50 text-[11px]">
                  <button
                    type="button"
                    onClick={() => pdfLogoFileInputRef.current?.click()}
                    className="text-neutral-400 hover:text-neutral-200 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Or upload file</span>
                  </button>

                  {customPdfLogo && (
                    <button
                      type="button"
                      onClick={handleResetPdfLogo}
                      className="text-red-400 hover:text-red-300 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Reset to default</span>
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setIsMenuOpen(false); onClose(); }}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-2 transition cursor-pointer pt-2 mt-1 border-t border-neutral-700"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-neutral-400" />
                <span>Close Receipt & Return to App</span>
              </button>
            </div>

          </div>
        </>
      )}

      {/* 2. Main Content Canvas: Either In-Browser PDF Document Viewer or Mobile Web Receipt */}
      {viewMode === 'pdf' ? (
        <div className="w-full flex-1 flex flex-col overflow-hidden bg-[#525659]">
          {/* Authentic In-Browser PDF Viewer Toolbar */}
          <div className="w-full bg-[#2a2b2e] text-white px-3 py-2 border-b border-neutral-700/90 flex items-center justify-between z-20 shrink-0 select-none shadow-md">
            {/* Left: Back to Web Receipt & PDF Title */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('web')}
                className="flex items-center gap-1.5 text-xs font-semibold text-purple-200 hover:text-white bg-purple-900/60 hover:bg-purple-800/80 px-2.5 py-1.5 rounded-lg border border-purple-500/50 transition cursor-pointer active:scale-95"
                title="Switch back to Web Receipt view"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Web Receipt</span>
              </button>

              <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-300 font-mono bg-neutral-850 px-2.5 py-1 rounded border border-neutral-700/80">
                <FileText className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="truncate max-w-[190px]">CBE_Customer_Receipt_{receiptData.refId}.pdf</span>
                <span className="text-[10px] text-neutral-400 font-sans ml-1">2 pages</span>
              </div>
            </div>

            {/* Right: Zoom Controls, Print & Save PDF Button */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Zoom Controls */}
              <div className="flex items-center bg-neutral-800/90 rounded-lg p-0.5 border border-neutral-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoFit(false);
                    setPdfZoom(prev => Math.max(0.4, Number((prev - 0.15).toFixed(2))));
                  }}
                  className="p-1 text-neutral-300 hover:text-white hover:bg-neutral-700 rounded transition cursor-pointer"
                  title="Zoom Out"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoFit(prev => !prev);
                    if (!isAutoFit) setPdfZoom(1);
                  }}
                  className={`px-1.5 py-0.5 text-[10.5px] font-bold rounded transition cursor-pointer ${
                    isAutoFit ? 'text-purple-300 bg-purple-950/60' : 'text-neutral-300 hover:text-white'
                  }`}
                  title={isAutoFit ? 'Auto-Fit to Screen Width' : 'Reset to 100%'}
                >
                  {isAutoFit ? 'Fit' : `${Math.round(pdfZoom * 100)}%`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoFit(false);
                    setPdfZoom(prev => Math.min(1.8, Number((prev + 0.15).toFixed(2))));
                  }}
                  className="p-1 text-neutral-300 hover:text-white hover:bg-neutral-700 rounded transition cursor-pointer"
                  title="Zoom In"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrintPdf}
                className="hidden sm:flex p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition cursor-pointer"
                title="Print Receipt"
              >
                <Printer className="w-4 h-4" />
              </button>

              {/* Download .PDF File Button */}
              <button
                type="button"
                onClick={() => handleDownloadPdf()}
                disabled={isDownloading}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#781d77] hover:bg-[#70189F] active:bg-[#580f68] px-3 py-1.5 rounded-lg shadow-md transition cursor-pointer disabled:opacity-75 active:scale-95"
                title="Save PDF file to device storage"
              >
                {isDownloading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Save PDF</span>
              </button>

              {/* 3-Dot Options Button for PDF Receipt Form */}
              <button
                type="button"
                onClick={() => setIsPdfMenuOpen(prev => !prev)}
                aria-label="PDF Receipt Form Options"
                className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center ${
                  isPdfMenuOpen 
                    ? 'bg-purple-700 text-white shadow-sm ring-1 ring-white/50' 
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                }`}
                title="PDF Receipt Settings (Stamp Size, Weight, Position & Logo)"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dedicated 3-Dot Settings Menu Popup for PDF Receipt Form */}
          {isPdfMenuOpen && (
            <>
              {/* Backdrop dismiss */}
              <div 
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-2xs animate-fade-in"
                onClick={() => setIsPdfMenuOpen(false)}
              />

              {/* Floating PDF Options Card */}
              <div 
                className="fixed top-12 sm:top-14 right-2 sm:right-4 z-50 w-84 max-w-[calc(100vw-16px)] max-h-[calc(100vh-64px)] overflow-y-auto bg-[#1c1f26] text-white rounded-2xl shadow-2xl border border-neutral-700/90 p-4 animate-in fade-in zoom-in-95 duration-150 select-none"
                style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-neutral-700/80 mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4.5 h-4.5 text-red-400" />
                    <div>
                      <h3 className="text-[14px] font-bold tracking-tight flex items-center gap-1.5">
                        <span>PDF Receipt Settings</span>
                        <span className="text-[9.5px] bg-red-950/80 border border-red-500/50 text-red-300 px-1.5 py-0.2 rounded font-bold">
                          PDF View
                        </span>
                      </h3>
                      <p className="text-[10px] text-neutral-400">PDF receipt stamp &amp; logo options</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsPdfMenuOpen(false)}
                    className="p-1 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* PDF Stamp Width & Weight Customizer */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Stamp className="w-3.5 h-3.5 text-purple-400" />
                      <span>PDF Stamp Width &amp; Weight</span>
                    </span>
                    <span className="text-[10px] text-purple-300 font-mono font-bold bg-purple-900/60 border border-purple-500/40 px-2 py-0.5 rounded-full">
                      {pdfStampSize}px • {pdfStampWeight.toUpperCase()}
                    </span>
                  </div>

                  {/* 1. PDF Stamp Width Control (Slider, Steppers, & Quick Presets) */}
                  <div className="bg-neutral-850/80 border border-neutral-700/70 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-purple-400" />
                        <span>PDF Stamp Width (ስፋት)</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdatePdfStampWidth(pdfStampSize - 10)}
                          className="w-5 h-5 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-200 flex items-center justify-center font-bold text-xs transition cursor-pointer"
                          title="Decrease PDF stamp width by 10px"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs text-purple-300 font-mono font-bold px-1 min-w-[46px] text-center">
                          {pdfStampSize}px
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdatePdfStampWidth(pdfStampSize + 10)}
                          className="w-5 h-5 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-200 flex items-center justify-center font-bold text-xs transition cursor-pointer"
                          title="Increase PDF stamp width by 10px"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Range Slider */}
                    <input
                      type="range"
                      min="160"
                      max="480"
                      step="5"
                      value={pdfStampSize}
                      onChange={(e) => handleUpdatePdfStampWidth(Number(e.target.value))}
                      className="w-full accent-purple-500 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                    />

                    {/* Quick Presets */}
                    <div className="grid grid-cols-5 gap-1 pt-0.5">
                      {[
                        { label: '220px', size: 220, name: 'Small' },
                        { label: '260px', size: 260, name: 'Normal' },
                        { label: '330px', size: 330, name: 'Med' },
                        { label: '380px', size: 380, name: 'Large' },
                        { label: '440px', size: 440, name: 'Jumbo' },
                      ].map((preset) => (
                        <button
                          key={preset.size}
                          type="button"
                          onClick={() => handleUpdatePdfStampWidth(preset.size)}
                          className={`py-1 px-0.5 rounded-lg text-[10px] font-semibold transition text-center cursor-pointer ${
                            pdfStampSize === preset.size
                              ? 'bg-purple-600 text-white font-bold shadow-xs'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                          }`}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. PDF Stamp Weight */}
                  <div className="bg-neutral-850/80 border border-neutral-700/70 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                        <Feather className="w-3.5 h-3.5 text-purple-400" />
                        <span>PDF Stamp Weight / Ink (ክብደት)</span>
                      </span>
                      <span className="text-purple-300 font-medium text-[10.5px]">
                        {pdfStampWeight === 'light' ? 'Light (ቀላል)' : 
                         pdfStampWeight === 'normal' ? 'Normal (መደበኛ)' :
                         pdfStampWeight === 'medium' ? 'Medium (መካከለኛ)' :
                         pdfStampWeight === 'bold' ? 'Bold (ደማቅ)' : 'Heavy (እጅግ ደማቅ)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-1">
                      {(['light', 'normal', 'medium', 'bold', 'heavy'] as StampWeight[]).map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => handleUpdatePdfStampWeight(w)}
                          className={`py-1.5 px-0.5 rounded-lg text-[10px] font-semibold transition text-center capitalize cursor-pointer ${
                            pdfStampWeight === w
                              ? 'bg-purple-600 text-white font-bold shadow-xs'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. PDF Stamp Position Controls (Rearrange & Reset) */}
                  <div className="bg-neutral-850/80 border border-neutral-700/70 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                        <Move className="w-3.5 h-3.5 text-purple-400" />
                        <span>PDF Stamp Position (ቦታ)</span>
                      </span>
                      <span className="text-[10px] text-purple-300 font-mono font-bold bg-purple-900/40 px-1.5 py-0.5 rounded border border-purple-500/30">
                        X: {pdfStampPosition.xPercent}% • Y: {pdfStampPosition.yPercent}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingStampPosition(true);
                          setIsPdfMenuOpen(false);
                          showBarsToast('Click & drag stamp anywhere on PDF receipt, then click Save');
                        }}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 shadow-md shadow-purple-600/30"
                      >
                        <Move className="w-3.5 h-3.5" />
                        <span>Rearrange Position</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetStampPosition}
                        className="py-1.5 px-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer border border-neutral-700 active:scale-95"
                        title="Reset PDF stamp to default center"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Center</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* PDF Header Logo Customizer */}
                <div className="pt-3 border-t border-neutral-700/80 space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-purple-400" />
                      <span>PDF Official Header Logo</span>
                    </span>
                    {customPdfLogo && (
                      <span className="text-[9.5px] bg-purple-900/60 border border-purple-500/40 text-purple-300 px-1.5 py-0.2 rounded font-bold">
                        Custom
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="url"
                      value={pdfLogoUrlInput}
                      onChange={(e) => setPdfLogoUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyPdfLogoUrl();
                        }
                      }}
                      placeholder="https://... image URL"
                      className="flex-1 bg-neutral-900 border border-neutral-700 focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyPdfLogoUrl()}
                      className="bg-purple-700 hover:bg-purple-600 active:bg-purple-800 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer shadow-sm"
                    >
                      Apply
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-neutral-700/50 text-[11px]">
                    <button
                      type="button"
                      onClick={() => pdfLogoFileInputRef.current?.click()}
                      className="text-neutral-400 hover:text-neutral-200 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Or upload file</span>
                    </button>

                    {customPdfLogo && (
                      <button
                        type="button"
                        onClick={handleResetPdfLogo}
                        className="text-red-400 hover:text-red-300 flex items-center gap-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Reset to default</span>
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPdfMenuOpen(false)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer border border-neutral-700"
                >
                  <span>Done</span>
                </button>
              </div>
            </>
          )}

          {/* Scrollable PDF Document Canvas */}
          <div 
            ref={pdfContainerRef}
            className="flex-1 overflow-auto p-3 sm:p-6 flex flex-col items-center justify-start relative select-none"
          >
            {/* Visual wrapper that scales accurately on mobile while keeping A4 2-page document structure */}
            <div
              className="transition-transform duration-200 ease-out origin-top flex flex-col items-center"
              style={{
                width: effectiveScale < 1 ? `${640 * effectiveScale}px` : '640px',
                height: effectiveScale < 1 ? `calc(1860px * ${effectiveScale})` : 'auto',
                marginBottom: effectiveScale < 1 ? '36px' : '64px'
              }}
            >
              <div
                style={{
                  width: '640px',
                  transform: effectiveScale !== 1 ? `scale(${effectiveScale})` : undefined,
                  transformOrigin: 'top center',
                }}
              >
                <CbeOfficialPdfReceipt
                  receiptData={receiptData}
                  qrCodeDataUrl={qrCodeDataUrl}
                  activeStamp={rasterizedPdfStampPng || pdfActiveStamp}
                  stampWeight={pdfStampWeight}
                  stampSize={pdfStampSize}
                  stampPosition={pdfStampPosition}
                  customPdfLogo={customPdfLogo}
                  isPreview={true}
                  tableRef={pdfTableRef}
                  isEditingStampPosition={isEditingStampPosition && viewMode === 'pdf'}
                  isDraggingStamp={isDraggingStamp}
                  onStampPointerDown={handleStampPointerDown}
                  onStampClick={handleStampClick}
                  onStampDoubleClick={handleStampDoubleClick}
                  onStampTouchEnd={handleStampTouchEnd}
                />
              </div>
            </div>
          </div>

          {/* Floating Mobile Bottom Action Pill in PDF mode (Respects physical device navigation bar) */}
          <div className="fixed bottom-[max(env(safe-area-inset-bottom,0px),16px)] inset-x-0 flex items-center justify-center gap-2 z-30 pointer-events-auto px-4">
            <button
              type="button"
              onClick={() => setViewMode('web')}
              className="bg-neutral-900/95 hover:bg-neutral-800 text-white font-semibold text-xs py-2 px-4 rounded-full shadow-2xl border border-white/20 flex items-center gap-1.5 transition active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-purple-400" />
              <span>Back to Web Receipt</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadPdf()}
              disabled={isDownloading}
              className="bg-[#781d77] hover:bg-[#70189F] text-white font-bold text-xs py-2 px-4 rounded-full shadow-2xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-75"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloading ? 'Saving...' : 'Save PDF'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Web Receipt Mode */
        <>
          <main className="w-full flex-1 overflow-y-auto px-2 pt-2.5 pb-[max(env(safe-area-inset-bottom,0px),96px)] bg-[#f0f2f5] flex justify-center">
        <div 
          ref={receiptCardRef}
          className={`bg-white w-full max-w-[460px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-gray-200/90 rounded-2xl overflow-hidden text-gray-900 self-start transition-opacity ${
            isRefreshing ? 'opacity-40 scale-[0.99]' : 'opacity-100'
          }`}
          style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
        >
          
          {/* Header Banner: Deep Royal CBE Purple (#781d77) */}
          <div className="bg-[#781d77] relative px-3 py-3.5 sm:px-4 sm:py-4 rounded-t-2xl flex items-center justify-center min-h-[76px] overflow-hidden">
            {/* Admin Uploaded Logo or Official Golden Emblem positioned on left */}
            <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 shrink-0 flex items-center justify-center select-none">
              <CbeLogo className="w-11 h-11 sm:w-12 sm:h-12 object-contain" src={adminLogo} />
            </div>

            {/* Header Text: Exact font size, weights, colors and centered alignment */}
            <div className="text-center px-12 sm:px-14 select-none">
              <h1 className="text-white font-bold text-[17.5px] sm:text-[19px] leading-tight tracking-tight whitespace-nowrap">
                Commercial Bank of Ethiopia
              </h1>
              <p className="text-white text-[13.5px] sm:text-[14px] font-normal leading-tight mt-1 whitespace-nowrap">
                Customer Receipt
              </p>
              <div className="text-[#86efac] font-bold text-[10.5px] sm:text-[11px] tracking-[0.16em] uppercase mt-1 whitespace-nowrap">
                Status: COMPLETED
              </div>
            </div>
          </div>

          {/* Body Information: 2 Columns with exact text style, weights and layout */}
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 text-[11px] leading-[1.38]">
              
              {/* Left Column: Company Address & Other Information */}
              <div className="space-y-0.5 text-[#111827]">
                <h2 className="font-bold text-black text-[12px] leading-tight pb-1 mb-1 border-b border-gray-200">
                  Company Address &amp; Other<br />Information
                </h2>
                
                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">Country:</span>
                  <span className="font-normal text-right text-black">Ethiopia</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">City:</span>
                  <span className="font-normal text-right text-black">Addis Ababa</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-gray-700 font-normal">Address: Ras Desta Damtew</span>
                  <span className="font-normal text-right text-black">St, 01, Kirkos</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">Postal code:</span>
                  <span className="font-normal text-right text-black">255</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">SWIFT Code:</span>
                  <span className="font-normal text-right text-black">CBETETAA</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">Email:</span>
                  <span className="font-normal text-right text-black truncate">info@cbe.com.et</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">Tel:</span>
                  <span className="font-normal text-right text-black">+251-551-50-04</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">Fax:</span>
                  <span className="font-normal text-right text-black">+251-551-45-22</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">Tin:</span>
                  <span className="font-normal text-right text-black">0000006966</span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-gray-700 font-normal">VAT Receipt</span>
                  <span className="font-normal text-right text-black">{receiptData.refId}</span>
                </div>
                <div className="text-gray-700 font-normal -mt-0.5">
                  No:
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">VAT Registration No:</span>
                  <span className="font-normal text-right text-black">011140</span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-gray-700 font-normal">VAT Registration</span>
                  <span className="font-normal text-right text-black">01/01/2003</span>
                </div>
                <div className="text-gray-700 font-normal -mt-0.5">
                  Date:
                </div>
              </div>

              {/* Right Column: Customer Information */}
              <div className="space-y-0.5 text-black">
                <h2 className="font-bold text-black text-[12px] leading-tight pb-1 mb-1 border-b border-gray-200">
                  Customer Information
                </h2>

                <div className="flex justify-between items-start">
                  <span className="text-gray-700 font-normal shrink-0">Customer</span>
                  <span className="font-normal text-right text-black leading-tight max-w-[130px]">
                    {receiptData.customerName}
                  </span>
                </div>
                <div className="text-gray-700 font-normal -mt-0.5">
                  Name:
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">Region:</span>
                  <span className="font-normal text-right text-black">-</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">City:</span>
                  <span className="font-normal text-right text-black">-</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">Sub City:</span>
                  <span className="font-normal text-right text-black">-</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">Wereda/Kebele:</span>
                  <span className="font-normal text-right text-black">-</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">VAT Registration No:</span>
                  <span className="font-normal text-right text-black">-</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">VAT Registration Date:</span>
                  <span className="font-normal text-right text-black">-</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">TIN (TAX ID):</span>
                  <span className="font-normal text-right text-black">-</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">Branch:</span>
                  <span className="font-normal text-right text-black">-</span>
                </div>
              </div>

            </div>
          </div>

          {/* Section: Payment / Transaction Informations */}
          <div className="p-3 sm:p-4 relative">
            
            {/* Table Header Bar with bordered card top */}
            <div className="border border-[#d1d5db] rounded-t-md bg-white py-1.5 px-3">
              <h2 className="text-center font-bold text-black text-[13px] sm:text-[13.5px]">
                Payment / Transaction Informations
              </h2>
            </div>

            {/* Structured Table matching Screenshot_20260904-124119.png and Screenshot_20260904-124126.png */}
            <div ref={transactionTableRef} className="border-x border-b border-[#d1d5db] rounded-b-md overflow-hidden text-[11.5px] leading-tight relative">
              
              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200">
                <span className="text-gray-800 font-normal">Payer:</span>
                <span className="text-black font-normal text-right">{receiptData.payerName}</span>
              </div>

              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200">
                <span className="text-gray-800 font-normal">Account:</span>
                <span className="text-black font-normal text-right">{receiptData.payerAccount}</span>
              </div>

              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200">
                <span className="text-gray-800 font-normal">Receiver:</span>
                <span className="text-black font-normal text-right">{receiptData.receiverName}</span>
              </div>

              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200">
                <span className="text-gray-800 font-normal">Account:</span>
                <span className="text-black font-normal text-right">{receiptData.receiverAccount}</span>
              </div>

              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200">
                <span className="text-gray-800 font-normal">Payment Type:</span>
                <span className="text-black font-normal text-right">{receiptData.paymentType}</span>
              </div>

              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200">
                <span className="text-gray-800 font-normal">Payment Date & Time:</span>
                <span className="text-black font-normal text-right">{receiptData.paymentDate}</span>
              </div>

              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200">
                <span className="text-gray-800 font-normal leading-tight">
                  Reference No. (VAT Invoice<br />No):
                </span>
                <span className="text-black font-normal text-right self-center">{receiptData.refId}</span>
              </div>

              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200">
                <span className="text-gray-800 font-normal">Reason / Type of service:</span>
                <span className="text-black font-normal text-right">{receiptData.reason}</span>
              </div>

              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200">
                <span className="text-gray-800 font-normal">Transferred Amount:</span>
                <span className="text-black font-normal text-right">
                  {(Number(receiptData.amount) || 0).toFixed(2)} ETB
                </span>
              </div>

              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200">
                <span className="text-gray-800 font-normal">Service Charge:</span>
                <span className="text-black font-normal text-right">
                  {(Number(receiptData.serviceCharge) || 0).toFixed(2)} ETB
                </span>
              </div>

              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200">
                <span className="text-gray-800 font-normal">VAT (15% of service charge):</span>
                <span className="text-black font-normal text-right">
                  {(Number(receiptData.vat) || 0).toFixed(2)} ETB
                </span>
              </div>

              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200">
                <span className="text-gray-800 font-normal leading-tight">
                  Disaster Risk Response Fund<br />(5% of service charge):
                </span>
                <span className="text-black font-normal text-right self-center">
                  {(Number(receiptData.disasterRecovery) || 0).toFixed(2)} ETB
                </span>
              </div>

              {/* Total Amount Debited Row: Bold label and bold value matching screenshot */}
              <div className="flex justify-between items-center px-3 py-2.5 bg-white">
                <span className="font-bold text-black text-[12px] sm:text-[12.5px] max-w-[200px] leading-snug">
                  Total amount debited from customer&apos;s account:
                </span>
                <span className="font-bold text-black text-right text-[12.5px] sm:text-[13px] self-center">
                  {(Number(receiptData.totalDebited) || 0).toFixed(2)} ETB
                </span>
              </div>

              {/* Authentic Overlaid Stamp: Double-tap wakes up rearrange mode; drag anywhere to position */}
              {webActiveStamp && (
                <div 
                  id="cbe-stamp-container"
                  onPointerDown={isEditingStampPosition && viewMode === 'web' ? handleStampPointerDown : undefined}
                  onClick={handleStampClick}
                  onDoubleClick={handleStampDoubleClick}
                  onTouchEnd={handleStampTouchEnd}
                  className={`absolute select-none z-20 shrink-0 touch-none transition-all ${
                    isEditingStampPosition && viewMode === 'web'
                      ? 'cursor-grab active:cursor-grabbing ring-2 ring-purple-600 ring-offset-2 ring-offset-white rounded-full' 
                      : 'cursor-pointer hover:ring-2 hover:ring-purple-400/60 hover:ring-offset-1 rounded-full'
                  }`}
                  style={{
                    top: `${webStampPosition.yPercent}%`,
                    left: `${webStampPosition.xPercent}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${webStampSize}px`,
                    height: `${webStampSize}px`,
                    maxWidth: 'min(98vw, 490px)',
                    maxHeight: 'min(98vw, 490px)',
                    aspectRatio: '1 / 1'
                  }}
                  title={isEditingStampPosition && viewMode === 'web' ? "Drag stamp to position anywhere" : "Double-tap stamp to rearrange position"}
                >
                  <img
                    src={webActiveStamp}
                    alt="Official Bank Stamp"
                    draggable={false}
                    className="w-full h-full object-contain pointer-events-none select-none transition-all duration-150"
                    style={{
                      transform: 'rotate(-13deg)',
                      opacity: webStampWeight === 'light' ? 0.88 : webStampWeight === 'normal' ? 0.96 : 1,
                    }}
                  />

                  {/* Visual Drag Handle Badge when in Position Edit Mode */}
                  {isEditingStampPosition && viewMode === 'web' && (
                    <div 
                      data-html2canvas-ignore="true"
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-purple-700/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xl flex items-center gap-1.5 pointer-events-none border border-white/40 backdrop-blur-xs whitespace-nowrap animate-in fade-in zoom-in-90 duration-150"
                    >
                      <Move className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isDraggingStamp ? 'Moving...' : 'Drag to Move'}</span>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Combined Amount in Word & QR Code Box matching reference screenshot */}
            <div className="mt-3.5 bg-white border border-[#d1d5db] rounded-xl overflow-hidden shadow-xs">
              {/* Top Section: Light gray Amount in Word */}
              <div className="bg-[#f8f9fa] pt-3 pb-3.5 px-3.5 text-center border-b border-gray-200/70">
                <div className="font-bold text-black text-[12px] sm:text-[12.5px]">
                  Amount in Word:
                </div>
                <div className="text-[#1f2937] text-[11.5px] sm:text-[12px] font-normal mt-1 leading-relaxed max-w-[340px] mx-auto">
                  {receiptData.words}
                </div>
              </div>

              {/* Bottom Section: Centered QR Code */}
              <div className="py-4 px-3 flex flex-col items-center justify-center bg-white">
                {qrCodeDataUrl ? (
                  <img 
                    src={qrCodeDataUrl} 
                    alt="Official CBE Receipt QR" 
                    className="w-24 h-24 sm:w-26 sm:h-26 object-contain block"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-26 sm:h-26 bg-gray-100 animate-pulse" />
                )}
              </div>
            </div>

            {/* Horizontal Line separating Card and Footer Text */}
            <div className="w-full border-t border-gray-200 mt-4 mb-3" />

            {/* Footer Text */}
            <div className="text-center pb-2">
              <p className="text-[#781d77] font-bold text-[12px]">
                The Bank you can always rely on.
              </p>
              <p className="text-gray-500 text-[10px] mt-0.5">
                © 2026 Commercial Bank of Ethiopia. All rights reserved.
              </p>
            </div>

          </div>

        </div>
      </main>

      {/* Floating Download PDF Button (Respects physical device navigation bar) */}
          <div className="fixed bottom-[max(env(safe-area-inset-bottom,0px),16px)] inset-x-0 flex flex-col items-center gap-1.5 z-20 pointer-events-auto px-4">
            {downloadError && (
              <div className="bg-red-900/90 border border-red-500 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg max-w-sm text-center">
                {downloadError}
              </div>
            )}
            <button
              type="button"
              onClick={handleOpenPdfView}
              className="bg-[#781d77] hover:bg-[#70189F] active:bg-[#580f68] text-white font-semibold text-[13px] sm:text-[13.5px] py-2 px-7 rounded-xl shadow-lg shadow-purple-950/25 flex items-center justify-center transition active:scale-95 cursor-pointer"
            >
              <span>Download PDF</span>
            </button>
          </div>
        </>
      )}

      {/* Permanently mounted offscreen CBE Official Customer Receipt Form for html2canvas */}
      <div 
        id="cbe-official-pdf-render-canvas"
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '640px',
          zIndex: -100, 
          pointerEvents: 'none',
          opacity: 1,
          backgroundColor: '#ffffff',
          overflow: 'hidden'
        }}
        aria-hidden="true"
      >
        <CbeOfficialPdfReceipt
          ref={pdfTemplateRef}
          receiptData={receiptData}
          qrCodeDataUrl={qrCodeDataUrl}
          activeStamp={rasterizedPdfStampPng || pdfActiveStamp}
          stampWeight={pdfStampWeight}
          stampSize={pdfStampSize}
          stampPosition={pdfStampPosition}
          customPdfLogo={customPdfLogo}
        />
      </div>

      {/* Floating Stamp Repositioning & Save Toolbar (Active when clicking stamp or menu) */}
      {isEditingStampPosition && (
        <div 
          id="stamp-position-toolbar"
          data-html2canvas-ignore="true"
          onClick={(e) => e.stopPropagation()}
          className="fixed bottom-[max(env(safe-area-inset-bottom,0px),16px)] inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50 bg-[#171922]/95 backdrop-blur-md border border-purple-500/60 text-white rounded-2xl p-3 sm:p-3.5 shadow-2xl flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full animate-in fade-in slide-in-from-bottom-3 duration-200 select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-700/80">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-600/30 border border-purple-400 flex items-center justify-center text-purple-300">
                <Move className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Rearrange {viewMode === 'pdf' ? 'PDF' : 'Web'} Stamp Position</span>
                  {hasUnsavedStampPos && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-semibold border border-amber-500/30">
                      Unsaved
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-neutral-300">
                  Drag {viewMode === 'pdf' ? 'PDF' : 'web'} stamp anywhere (saved for all receipts)
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingStampPosition(false)}
              className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              title="Close editor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Coordinates & Nudge Arrows */}
          <div className="flex items-center justify-between bg-neutral-800/80 rounded-xl px-3 py-2 border border-neutral-700/60 text-xs">
            <div className="flex items-center gap-1 font-mono text-[11px] text-purple-300">
              <span>X: {(viewMode === 'pdf' ? pdfStampPosition : webStampPosition).xPercent}%</span>
              <span className="text-neutral-500">•</span>
              <span>Y: {(viewMode === 'pdf' ? pdfStampPosition : webStampPosition).yPercent}%</span>
            </div>

            {/* Directional Nudge Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleNudgeStamp(-2, 0)}
                className="w-7 h-7 bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-500 rounded flex items-center justify-center text-neutral-200 transition active:scale-95 cursor-pointer"
                title="Nudge Left"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleNudgeStamp(0, -2)}
                className="w-7 h-7 bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-500 rounded flex items-center justify-center text-neutral-200 transition active:scale-95 cursor-pointer"
                title="Nudge Up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleNudgeStamp(0, 2)}
                className="w-7 h-7 bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-500 rounded flex items-center justify-center text-neutral-200 transition active:scale-95 cursor-pointer"
                title="Nudge Down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleNudgeStamp(2, 0)}
                className="w-7 h-7 bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-500 rounded flex items-center justify-center text-neutral-200 transition active:scale-95 cursor-pointer"
                title="Nudge Right"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action Buttons: Save Position, Reset, Done */}
          <div className="grid grid-cols-3 gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleSaveStampPosition}
              className="col-span-1 py-1.5 px-2 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/30 transition active:scale-95 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>

            <button
              type="button"
              onClick={handleResetStampPosition}
              className="col-span-1 py-1.5 px-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-neutral-700 transition active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-neutral-400" />
              <span>Center</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (hasUnsavedStampPos) handleSaveStampPosition();
                setIsEditingStampPosition(false);
              }}
              className="col-span-1 py-1.5 px-2 rounded-xl bg-neutral-750 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-neutral-700 transition active:scale-95 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Done</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default CbeWebReceiptModal;

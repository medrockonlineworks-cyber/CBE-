import React, { useRef, useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { Transaction } from '../types';
import { SmsMessage } from '../types/sms';
import { LocalDb, formatTo12CharTxId, DEFAULT_CBE_LOGO, OFFICIAL_CBE_PURPLE_LOGO, OFFICIAL_CBE_STAMP_LOGO } from '../lib/mockData';
import { CbeLogo } from './CbeLogo';
import { 
  ArrowLeft, 
  Home, 
  Lock, 
  MoreVertical, 
  Check, 
  SlidersHorizontal,
  Copy,
  RotateCw,
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
  Stamp
} from 'lucide-react';

export type BrowserHeaderType = 'chrome' | 'phoenix' | 'opera' | 'samsung' | 'safari';

interface CbeWebReceiptModalProps {
  transaction?: Transaction | null;
  smsMessage?: SmsMessage | null;
  onClose: () => void;
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
  onClose
}) => {
  const receiptCardRef = useRef<HTMLDivElement>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Browser bar customization state
  const [browserType, setBrowserType] = useState<BrowserHeaderType>(() => {
    return (localStorage.getItem('cbe_receipt_browser_type') as BrowserHeaderType) || 'chrome';
  });
  const [tabCount, setTabCount] = useState<string>(() => {
    return localStorage.getItem('cbe_receipt_tab_count') || '80';
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const stampFileInputRef = useRef<HTMLInputElement>(null);

  // Retrieve admin uploaded logo and stamp from LocalDb and listen to updates
  const [adminLogo, setAdminLogo] = useState<string | null>(() => LocalDb.getCustomBankLogo());
  const [customStamp, setCustomStamp] = useState<string | null>(() => LocalDb.getCustomBankStamp());
  const [stampSize, setStampSize] = useState<number>(() => LocalDb.getBankStampSize());
  const activeStamp = customStamp || OFFICIAL_CBE_STAMP_LOGO;

  useEffect(() => {
    const handleSyncLogo = () => {
      setAdminLogo(LocalDb.getCustomBankLogo());
    };
    const handleSyncStamp = () => {
      setCustomStamp(LocalDb.getCustomBankStamp());
    };
    const handleSyncStampSize = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail?.size) {
        setStampSize(customEvt.detail.size);
      } else {
        setStampSize(LocalDb.getBankStampSize());
      }
    };
    window.addEventListener('cbe_logo_updated', handleSyncLogo);
    window.addEventListener('cbe_stamp_updated', handleSyncStamp);
    window.addEventListener('cbe_stamp_size_updated', handleSyncStampSize);
    window.addEventListener('storage', handleSyncLogo);
    window.addEventListener('storage', handleSyncStamp);
    return () => {
      window.removeEventListener('cbe_logo_updated', handleSyncLogo);
      window.removeEventListener('cbe_stamp_updated', handleSyncStamp);
      window.removeEventListener('cbe_stamp_size_updated', handleSyncStampSize);
      window.removeEventListener('storage', handleSyncLogo);
      window.removeEventListener('storage', handleSyncStamp);
    };
  }, []);

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

  const webReceiptUrl = `https://receipt.cbe.com.et/v2-hfHCxG${receiptData.refId}`;

  // Generate QR Code for the web receipt
  useEffect(() => {
    QRCode.toDataURL(webReceiptUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Failed to generate QR:', err));
  }, [webReceiptUrl]);

  const handleDownloadPdf = async () => {
    if (!receiptCardRef.current || isDownloading) return;
    try {
      setIsDownloading(true);
      const canvas = await html2canvas(receiptCardRef.current, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `CBE_Customer_Receipt_${receiptData.refId}.png`;
      link.click();

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Download error:', err);
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
    localStorage.setItem('cbe_receipt_browser_type', type);
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

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-start overflow-hidden animate-fade-in">
      
      {/* Hidden file input for uploading bank stamp directly */}
      <input 
        ref={stampFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUploadStampFile}
      />

      {/* 1. Mobile Browser Top Bar (Configurable in 3-dot menu: Chrome, Phoenix, Opera, Samsung, Safari) */}
      <header 
        className={`w-full px-3 py-2 flex items-center justify-between gap-2 shadow-md flex-shrink-0 z-30 transition-colors ${
          browserType === 'phoenix' 
            ? 'bg-[#131720] text-[#e0e5ee] border-b border-[#202735]' 
            : browserType === 'opera'
            ? 'bg-[#161616] text-[#e5e5e5] border-b border-neutral-800'
            : browserType === 'samsung'
            ? 'bg-[#181920] text-[#e2e4ea] border-b border-neutral-800'
            : browserType === 'safari'
            ? 'bg-[#1c1c1e] text-[#f2f2f7] border-b border-neutral-800'
            : 'bg-[#121315] text-[#e3e3e3] border-b border-[#282a2e]'
        }`}
      >
        {/* Left Side Controls */}
        <div className="flex items-center gap-1.5">
          {/* Back button */}
          <button 
            onClick={onClose}
            aria-label="Back"
            className={`p-1.5 rounded-full transition active:scale-95 ${
              browserType === 'safari' ? 'text-blue-400 hover:bg-neutral-800' : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
            }`}
            title="Return to App"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Browser Specific Branding / Home Button */}
          {browserType === 'phoenix' ? (
            <div 
              onClick={() => setIsMenuOpen(true)}
              className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-emerald-400 text-xs font-black select-none cursor-pointer shadow-xs"
              title="Phoenix Browser (Phonex)"
            >
              P
            </div>
          ) : browserType === 'opera' ? (
            <div 
              onClick={() => setIsMenuOpen(true)}
              className="w-5.5 h-5.5 rounded-full bg-[#ff1b2d] flex items-center justify-center text-white text-[11.5px] font-black shadow-sm select-none cursor-pointer"
              title="Opera / Opera Mini"
            >
              O
            </div>
          ) : browserType === 'safari' ? (
            null
          ) : (
            <button 
              onClick={onClose}
              aria-label="Home"
              className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-300 hover:text-white transition"
              title="Home"
            >
              <Home className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Address Bar Pill */}
        <div 
          onClick={handleCopyLink}
          className={`flex-1 max-w-[285px] sm:max-w-xs mx-1 px-3 py-1 flex items-center justify-between cursor-pointer transition select-none ${
            browserType === 'phoenix'
              ? 'bg-[#1c222c] hover:bg-[#242b37] border border-emerald-500/35 rounded-full'
              : browserType === 'opera'
              ? 'bg-[#252525] hover:bg-[#2f2f2f] border border-neutral-700 rounded-full'
              : browserType === 'samsung'
              ? 'bg-[#242632] hover:bg-[#2d303f] border border-neutral-700/60 rounded-full'
              : browserType === 'safari'
              ? 'bg-[#2c2c2e] hover:bg-[#38383a] border border-neutral-700 rounded-xl py-1.5'
              : 'bg-[#282a2d] hover:bg-[#323539] border border-[#3b3e44] rounded-full'
          }`}
          title="Click to copy receipt URL"
        >
          {/* Left inside pill */}
          <div className="flex items-center gap-1.5 overflow-hidden">
            {browserType === 'phoenix' ? (
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : browserType === 'opera' || browserType === 'samsung' ? (
              <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            ) : browserType === 'safari' ? (
              <span className="text-neutral-400 text-xs font-semibold shrink-0">aA</span>
            ) : (
              <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            )}

            {browserType === 'safari' && (
              <Lock className="w-3 h-3 text-neutral-400 shrink-0 ml-0.5" />
            )}

            <span className="text-[13.5px] sm:text-[14px] text-white font-sans tracking-tight truncate">
              receipt.cbe.com.et
            </span>
          </div>

          {/* Right inside pill */}
          <div className="flex items-center gap-1.5 shrink-0 pl-1">
            {copiedUrl ? (
              <span className="text-[10px] text-emerald-400 font-bold animate-pulse">Copied</span>
            ) : browserType === 'phoenix' ? (
              <RotateCw 
                onClick={(e) => { e.stopPropagation(); handleRefresh(); }} 
                className={`w-3.5 h-3.5 text-emerald-400/80 hover:text-emerald-300 transition ${isRefreshing ? 'animate-spin' : ''}`} 
              />
            ) : browserType === 'opera' || browserType === 'safari' ? (
              <RotateCw 
                onClick={(e) => { e.stopPropagation(); handleRefresh(); }} 
                className={`w-3.5 h-3.5 text-neutral-400 hover:text-white transition ${isRefreshing ? 'animate-spin' : ''}`} 
              />
            ) : browserType === 'samsung' ? (
              <Star className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400/20" />
            ) : (
              <div className="w-4 h-4 rounded-xs border border-neutral-400 flex items-center justify-center text-[9px] font-bold text-neutral-300 select-none">
                G
              </div>
            )}
          </div>
        </div>

        {/* Browser Tab Count Badge & 3-dots Menu */}
        <div className="flex items-center gap-1">
          {/* Extra browser action icons */}
          {browserType === 'phoenix' && (
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-1 text-neutral-300 hover:text-white transition"
              title="Phoenix Downloads & Settings"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {browserType === 'opera' && (
            <div className="p-1 text-[#ff1b2d]" title="Opera Ad Blocker Enabled">
              <Shield className="w-4 h-4 fill-[#ff1b2d]/20" />
            </div>
          )}

          {browserType === 'samsung' && (
            <button
              onClick={handleRefresh}
              className={`p-1 text-neutral-300 hover:text-white transition ${isRefreshing ? 'animate-spin' : ''}`}
              title="Refresh"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}

          {/* Tab Count Box */}
          <div 
            onClick={() => setIsMenuOpen(true)}
            className={`cursor-pointer transition select-none flex items-center justify-center font-bold ${
              browserType === 'phoenix'
                ? 'w-5.5 h-5.5 rounded-full border-[1.8px] border-emerald-400 bg-emerald-500/20 text-emerald-300 text-[10px]'
                : browserType === 'safari'
                ? 'w-5.5 h-5.5 border-[1.8px] border-blue-400 rounded-sm text-blue-400 text-[10px]'
                : 'w-5.5 h-5.5 border-[1.8px] border-neutral-300 rounded-[5px] text-neutral-200 text-[10.5px]'
            }`}
            title="Tabs switcher (Click to configure)"
          >
            {tabCount}
          </div>

          {/* 3-dots Button: Opens the change system menu */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Browser options & style switcher"
            className={`p-1 rounded-full hover:bg-neutral-800 transition active:scale-95 ${
              isMenuOpen 
                ? 'bg-neutral-800 text-white ring-2 ring-emerald-500/50' 
                : browserType === 'safari'
                ? 'text-blue-400 hover:text-blue-300'
                : 'text-neutral-300 hover:text-white'
            }`}
            title="Change browser type & options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

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
            className="fixed top-12 sm:top-14 right-2 sm:right-4 z-50 w-84 max-w-[calc(100vw-16px)] bg-[#1c1f26] text-white rounded-2xl shadow-2xl border border-neutral-700/90 p-4 animate-in fade-in zoom-in-95 duration-150 select-none"
            style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-700/80 mb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4.5 h-4.5 text-emerald-400" />
                <h3 className="text-[14px] font-bold tracking-tight">Browser Header Type</h3>
              </div>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-1 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Browser Type Selector */}
            <div className="space-y-1.5 mb-4">
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Choose Browser Header Type
              </p>

              {/* 1. Google Chrome */}
              <button
                type="button"
                onClick={() => handleSelectBrowser('chrome')}
                className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left transition ${
                  browserType === 'chrome'
                    ? 'bg-emerald-500/20 border border-emerald-400/80 text-white'
                    : 'bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center border border-neutral-700">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold">Google Chrome</div>
                    <div className="text-[10px] text-neutral-400">Android Chrome dark bar</div>
                  </div>
                </div>
                {browserType === 'chrome' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </button>

              {/* 2. Phoenix Browser (Phonex) */}
              <button
                type="button"
                onClick={() => handleSelectBrowser('phoenix')}
                className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left transition ${
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
                    <div className="text-[13px] font-bold">Phoenix Browser (Phonex)</div>
                    <div className="text-[10px] text-neutral-400">Popular on Tecno, Infinix & Itel</div>
                  </div>
                </div>
                {browserType === 'phoenix' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </button>

              {/* 3. Opera / Opera Mini */}
              <button
                type="button"
                onClick={() => handleSelectBrowser('opera')}
                className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left transition ${
                  browserType === 'opera'
                    ? 'bg-emerald-500/20 border border-emerald-400/80 text-white'
                    : 'bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-red-950/80 flex items-center justify-center border border-red-500/50 text-red-400 font-black text-xs">
                    O
                  </div>
                  <div>
                    <div className="text-[13px] font-bold">Opera / Opera Mini</div>
                    <div className="text-[10px] text-neutral-400">Red Opera icon & ad-blocker</div>
                  </div>
                </div>
                {browserType === 'opera' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </button>

              {/* 4. Samsung Internet */}
              <button
                type="button"
                onClick={() => handleSelectBrowser('samsung')}
                className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left transition ${
                  browserType === 'samsung'
                    ? 'bg-emerald-500/20 border border-emerald-400/80 text-white'
                    : 'bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center border border-neutral-700 text-blue-400">
                    <Star className="w-4 h-4 fill-amber-400/30 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold">Samsung Internet</div>
                    <div className="text-[10px] text-neutral-400">Samsung Galaxy One UI browser</div>
                  </div>
                </div>
                {browserType === 'samsung' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </button>

              {/* 5. Safari (iOS) */}
              <button
                type="button"
                onClick={() => handleSelectBrowser('safari')}
                className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left transition ${
                  browserType === 'safari'
                    ? 'bg-emerald-500/20 border border-emerald-400/80 text-white'
                    : 'bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-950/80 flex items-center justify-center border border-blue-500/50 text-blue-400 font-bold text-xs">
                    iOS
                  </div>
                  <div>
                    <div className="text-[13px] font-bold">Safari (Apple iOS)</div>
                    <div className="text-[10px] text-neutral-400">Minimal Apple Safari style</div>
                  </div>
                </div>
                {browserType === 'safari' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
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
                {['80', '1', '4', '12', '99+'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleSelectTabCount(num)}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
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

            {/* Stamp Size Selector */}
            <div className="mb-4 pt-3 border-t border-neutral-700/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Stamp className="w-3.5 h-3.5 text-purple-400" />
                  <span>Stamp Size</span>
                </span>
                <span className="text-xs text-purple-300 font-mono font-bold">{stampSize}px</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: 'Normal', size: 260 },
                  { label: 'Large', size: 330 },
                  { label: 'X-Large', size: 365 },
                  { label: 'Jumbo', size: 405 },
                ].map((preset) => (
                  <button
                    key={preset.size}
                    type="button"
                    onClick={() => {
                      LocalDb.setBankStampSize(preset.size);
                      setStampSize(preset.size);
                    }}
                    className={`py-1.5 px-1 rounded-lg text-xs font-semibold transition text-center ${
                      stampSize === preset.size
                        ? 'bg-purple-600 text-white font-bold shadow-xs'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-3 border-t border-neutral-700/80 space-y-1.5">
              <button
                type="button"
                onClick={() => { handleCopyLink(); setIsMenuOpen(false); }}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs font-medium flex items-center gap-2 transition"
              >
                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                <span>Copy Receipt URL (receipt.cbe.com.et)</span>
              </button>

              <button
                type="button"
                onClick={() => { handleRefresh(); setIsMenuOpen(false); }}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs font-medium flex items-center gap-2 transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
                <span>Refresh / Reload Receipt Page</span>
              </button>

              <button
                type="button"
                onClick={() => { stampFileInputRef.current?.click(); }}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs font-medium flex items-center justify-between transition"
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
                  className="w-full px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-950/70 text-red-300 text-xs font-medium flex items-center gap-2 transition"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Reset Stamp to CBE Official</span>
                </button>
              )}
            </div>

          </div>
        </>
      )}

      {/* 2. Scrollable Receipt Content Canvas */}
      <main className="w-full flex-1 overflow-y-auto px-2 pt-2.5 pb-24 bg-[#f0f2f5] flex justify-center">
        <div 
          ref={receiptCardRef}
          className={`bg-white w-full max-w-[460px] shadow-sm border border-gray-200 rounded-sm overflow-hidden text-gray-900 self-start transition-opacity ${
            isRefreshing ? 'opacity-40 scale-[0.99]' : 'opacity-100'
          }`}
          style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
        >
          
          {/* Header Banner: Deep Royal CBE Purple (#781d77) matching IMG_20260906_111256_173.png */}
          <div className="bg-[#781d77] relative px-3 py-3.5 sm:px-4 sm:py-4 rounded-t-sm flex items-center justify-center min-h-[76px] overflow-hidden">
            {/* Admin Uploaded Logo or Official Golden Emblem positioned on left */}
            <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 shrink-0 flex items-center justify-center select-none">
              <CbeLogo className="w-11 h-11 sm:w-12 sm:h-12 object-contain" src={adminLogo} />
            </div>

            {/* Header Text: Exact font size, weights, colors and centered alignment matching IMG_20260906_111256_173.png */}
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
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 text-[11px] leading-[1.38]">
              
              {/* Left Column: Company Address & Other Information */}
              <div className="space-y-0.5 text-[#111827]">
                <h2 className="font-bold text-black text-[12px] leading-tight mb-1">
                  Company Address & Other Information
                </h2>
                
                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">Country:</span>
                  <span className="font-normal text-right">Ethiopia</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">City:</span>
                  <span className="font-normal text-right">Addis Ababa</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-gray-700 font-normal">Address: Ras Desta Damtew</span>
                  <span className="font-normal text-right">St, 01, Kirkos</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">Postal code:</span>
                  <span className="font-normal text-right">255</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">SWIFT Code:</span>
                  <span className="font-normal text-right">CBETETAA</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">Email:</span>
                  <span className="font-normal text-right truncate">info@cbe.com.et</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">Tel:</span>
                  <span className="font-normal text-right">+251-551-50-04</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">Fax:</span>
                  <span className="font-normal text-right">+251-551-45-22</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">Tin:</span>
                  <span className="font-normal text-right">0000006966</span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-gray-700 font-normal">VAT Receipt</span>
                  <span className="font-normal text-right">{receiptData.refId}</span>
                </div>
                <div className="text-gray-700 font-normal -mt-0.5">
                  No:
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">VAT Registration No:</span>
                  <span className="font-normal text-right">011140</span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-gray-700 font-normal">VAT Registration</span>
                  <span className="font-normal text-right">01/01/2003</span>
                </div>
                <div className="text-gray-700 font-normal -mt-0.5">
                  Date:
                </div>
              </div>

              {/* Right Column: Customer Information */}
              <div className="space-y-0.5 text-[#111827]">
                <h2 className="font-bold text-black text-[12px] leading-tight mb-1">
                  Customer Information
                </h2>

                <div className="flex justify-between items-start">
                  <span className="text-gray-700 font-normal shrink-0">Customer</span>
                  <span className="font-normal text-right leading-tight max-w-[130px]">
                    {receiptData.customerName}
                  </span>
                </div>
                <div className="text-gray-700 font-normal -mt-0.5">
                  Name:
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">Region:</span>
                  <span className="font-normal text-right">-</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">City:</span>
                  <span className="font-normal text-right">-</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">Sub City:</span>
                  <span className="font-normal text-right">-</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">Wereda/Kebele:</span>
                  <span className="font-normal text-right">-</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">VAT Registration No:</span>
                  <span className="font-normal text-right">-</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">VAT Registration Date:</span>
                  <span className="font-normal text-right">-</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">TIN (TAX ID):</span>
                  <span className="font-normal text-right">-</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700 font-normal">Branch:</span>
                  <span className="font-normal text-right">-</span>
                </div>
              </div>

            </div>
          </div>

          {/* Section: Payment / Transaction Informations */}
          <div className="p-3 sm:p-4 relative">
            
            {/* Table Header Bar with bordered card top */}
            <div className="border border-[#d1d5db] rounded-t-sm bg-white py-1.5 px-3">
              <h2 className="text-center font-bold text-black text-[13px] sm:text-[13.5px]">
                Payment / Transaction Informations
              </h2>
            </div>

            {/* Structured Table matching Screenshot_20260904-124119.png and Screenshot_20260904-124126.png */}
            <div className="border-x border-b border-[#d1d5db] text-[11.5px] leading-tight relative">
              
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
                  {receiptData.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                </span>
              </div>

              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200">
                <span className="text-gray-800 font-normal">Service Charge:</span>
                <span className="text-black font-normal text-right">
                  {receiptData.serviceCharge.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                </span>
              </div>

              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200">
                <span className="text-gray-800 font-normal">VAT (15% of service charge):</span>
                <span className="text-black font-normal text-right">
                  {receiptData.vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                </span>
              </div>

              <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200">
                <span className="text-gray-800 font-normal leading-tight">
                  Disaster Risk Response Fund<br />(5% of service charge):
                </span>
                <span className="text-black font-normal text-right self-center">
                  {receiptData.disasterRecovery.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                </span>
              </div>

              {/* Total Amount Debited Row: Bold label and bold value matching screenshot */}
              <div className="flex justify-between items-center px-3 py-2.5 border-t border-[#d1d5db]">
                <span className="font-bold text-black text-[12.5px] max-w-[200px] leading-snug">
                  Total amount debited from customer's account:
                </span>
                <span className="font-bold text-black text-[13.5px] text-right">
                  {receiptData.totalDebited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                </span>
              </div>

              {/* Authentic Overlaid Stamp: Defaults to official CBE purple stamp, or admin uploaded stamp */}
              {activeStamp && (
                <div 
                  className="absolute pointer-events-none select-none z-10 shrink-0"
                  style={{
                    top: '52%',
                    left: '48%',
                    transform: 'translate(-50%, -50%)',
                    width: `clamp(${Math.round(stampSize * 0.85)}px, 88%, ${stampSize}px)`,
                    height: `clamp(${Math.round(stampSize * 0.85)}px, 88%, ${stampSize}px)`,
                    minWidth: `${Math.round(stampSize * 0.80)}px`,
                    minHeight: `${Math.round(stampSize * 0.80)}px`,
                    maxWidth: `${stampSize}px`,
                    maxHeight: `${stampSize}px`,
                    aspectRatio: '1 / 1'
                  }}
                >
                  <img
                    src={activeStamp}
                    alt="Official Bank Stamp"
                    className="w-full h-full object-contain pointer-events-none select-none"
                    style={{
                      mixBlendMode: 'multiply',
                      filter: 'contrast(1.15)',
                      transform: 'rotate(-13deg)'
                    }}
                  />
                </div>
              )}

            </div>

            {/* Amount in Word Box: Light gray card matching Screenshot_20260904-124126.png */}
            <div className="mt-3.5 bg-[#f8f9fa] border border-[#d1d5db] rounded-md p-3 text-center">
              <div className="font-bold text-black text-[12px]">
                Amount in Word:
              </div>
              <div className="text-[#1f2937] text-[11.5px] font-normal mt-1">
                {receiptData.words}
              </div>
            </div>

            {/* Centered QR Code */}
            <div className="mt-3.5 flex flex-col items-center justify-center">
              {qrCodeDataUrl ? (
                <img 
                  src={qrCodeDataUrl} 
                  alt="Official CBE Receipt QR" 
                  className="w-28 h-28 border border-gray-200 p-0.5 bg-white shadow-2xs"
                />
              ) : (
                <div className="w-28 h-28 bg-gray-100 animate-pulse border border-gray-200" />
              )}
            </div>

            {/* Footer Text */}
            <div className="mt-3 text-center pb-2">
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

      {/* Floating Download PDF Button matching Screenshot_20260904-124119.png */}
      <div className="fixed bottom-3 inset-x-0 flex justify-center z-20 pointer-events-auto">
        <button
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          className="bg-[#781d77] hover:bg-[#68137e] active:bg-[#580f68] text-white font-bold text-[13px] py-2 px-6 rounded-lg shadow-xl flex items-center justify-center transition active:scale-95 disabled:opacity-75 cursor-pointer"
        >
          {isDownloading ? (
            <span className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Downloading...</span>
            </span>
          ) : downloadSuccess ? (
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>Downloaded</span>
            </span>
          ) : (
            <span>Download PDF</span>
          )}
        </button>
      </div>

    </div>
  );
};

export default CbeWebReceiptModal;

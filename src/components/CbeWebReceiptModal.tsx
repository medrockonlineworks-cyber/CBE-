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
  Copy
} from 'lucide-react';

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

  // Retrieve admin uploaded logo and stamp from LocalDb and listen to updates
  const [adminLogo, setAdminLogo] = useState<string | null>(() => LocalDb.getCustomBankLogo());
  const [customStamp, setCustomStamp] = useState<string | null>(() => LocalDb.getCustomBankStamp());

  useEffect(() => {
    const handleSyncLogo = () => {
      setAdminLogo(LocalDb.getCustomBankLogo());
    };
    const handleSyncStamp = () => {
      setCustomStamp(LocalDb.getCustomBankStamp());
    };
    window.addEventListener('cbe_logo_updated', handleSyncLogo);
    window.addEventListener('cbe_stamp_updated', handleSyncStamp);
    window.addEventListener('storage', handleSyncLogo);
    window.addEventListener('storage', handleSyncStamp);
    return () => {
      window.removeEventListener('cbe_logo_updated', handleSyncLogo);
      window.removeEventListener('cbe_stamp_updated', handleSyncStamp);
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

  const webReceiptUrl = `https://mbreceipt.cbe.com.et/v2-hfHCxG${receiptData.refId}`;

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

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-start overflow-hidden animate-fade-in">
      
      {/* 1. Mobile Browser Chrome Bar at Top (matches actual mobile browser screen Screenshot_20260904-124119.png) */}
      <header className="w-full bg-[#121315] text-[#e3e3e3] border-b border-[#282a2e] px-3 py-2 flex items-center justify-between gap-2 shadow-md flex-shrink-0 z-10">
        <div className="flex items-center gap-1.5">
          {/* Back button to close modal */}
          <button 
            onClick={onClose}
            aria-label="Back"
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-300 hover:text-white transition active:scale-95"
            title="Return to App"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {/* Home button */}
          <button 
            onClick={onClose}
            aria-label="Home"
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-300 hover:text-white transition"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>

        {/* Address Bar Pill: mbreceipt.cbe.com.et with tune sliders & translate icon */}
        <div 
          onClick={handleCopyLink}
          className="flex-1 max-w-[280px] sm:max-w-xs mx-1 bg-[#282a2d] hover:bg-[#323539] border border-[#3b3e44] rounded-full px-3 py-1 flex items-center justify-between cursor-pointer transition"
          title="Click to copy receipt URL"
        >
          <div className="flex items-center gap-1.5 overflow-hidden">
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="text-[14px] text-white font-sans tracking-tight truncate">
              mbreceipt.cbe.com.et
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 pl-1">
            {/* Google Translate G-文 icon */}
            <div className="w-4 h-4 rounded-xs border border-neutral-400 flex items-center justify-center text-[9px] font-bold text-neutral-300 select-none">
              G
            </div>
            {copiedUrl && (
              <span className="text-[10px] text-emerald-400 font-bold animate-pulse">Copied</span>
            )}
          </div>
        </div>

        {/* Browser Tab Count Badge (80) & 3-dots Menu */}
        <div className="flex items-center gap-1">
          <div className="w-5.5 h-5.5 border-[1.8px] border-neutral-300 rounded-[5px] flex items-center justify-center text-[10.5px] font-bold text-neutral-200 select-none">
            80
          </div>
          <button 
            onClick={handleCopyLink}
            aria-label="More options"
            className="p-1 rounded-full hover:bg-neutral-800 text-neutral-300 hover:text-white transition"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. Scrollable Receipt Content Canvas */}
      <main className="w-full flex-1 overflow-y-auto px-2 pt-2.5 pb-24 bg-[#f0f2f5] flex justify-center">
        <div 
          ref={receiptCardRef}
          className="bg-white w-full max-w-[460px] shadow-sm border border-gray-200 rounded-sm overflow-hidden text-gray-900 self-start"
          style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
        >
          
          {/* Header Banner: Deep Royal CBE Purple (#781d77) with rounded top corners */}
          <div className="bg-[#781d77] px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center gap-3 rounded-t-sm">
            {/* Admin Uploaded Logo or Official Golden Emblem */}
            <div className="w-12 h-12 shrink-0 flex items-center justify-center">
              <CbeLogo className="w-12 h-12 object-contain" src={adminLogo} />
            </div>

            {/* Header Text: Exact font styling and weights from Screenshot_20260904-124119.png */}
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-[18px] sm:text-[20px] leading-tight tracking-tight">
                Commercial Bank of Ethiopia
              </h1>
              <p className="text-white text-[13.5px] sm:text-[14px] font-normal leading-tight mt-0.5">
                Customer Receipt
              </p>
              <div className="text-[#38d368] font-extrabold text-[10.5px] sm:text-[11px] tracking-[0.16em] uppercase mt-0.5">
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

              {/* Authentic Overlaid Stamp: Rendered ONLY if an admin has uploaded a stamp */}
              {customStamp && (
                <div 
                  className="absolute pointer-events-none select-none z-10 shrink-0"
                  style={{
                    top: '53%',
                    left: '43%',
                    transform: 'translate(-50%, -50%)',
                    width: '195px',
                    height: '195px',
                    minWidth: '195px',
                    minHeight: '195px',
                    maxWidth: '195px',
                    maxHeight: '195px',
                    aspectRatio: '1 / 1'
                  }}
                >
                  <img
                    src={customStamp}
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

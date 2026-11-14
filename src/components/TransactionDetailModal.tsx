import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { formatTo12CharTxId } from '../lib/mockData';
import { X, Check } from 'lucide-react';
import { PhoneSettingsService } from '../services/phoneSettingsService';
import { SystemBarsService } from '../services/systemBarsService';
import BottomNavigation from './BottomNavigation';
import { CbeWebReceiptModal } from './CbeWebReceiptModal';
import { openWebReceiptInRealBrowser } from '../services/webReceiptBrowserService';

interface TransactionDetailModalProps {
  transaction: Transaction;
  onClose: () => void;
  onViewReceipt?: (tx: Transaction) => void;
  currentUserId?: string;
  currentUserAccount?: string;
  onNavigateTab?: (tab: 'home' | 'history' | 'profile') => void;
}

/**
 * Formats date into authentic CBE detail format matching Image 1 & 2: e.g. "09-Nov-26 6:20 PM" or "01-Sep-26 05:56 PM"
 */
export function formatCbeDetailDate(dateInput: any): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '09-Nov-26 6:20 PM';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getDate().toString().padStart(2, '0');
  const month = months[d.getMonth()];
  const yearShort = d.getFullYear().toString().slice(-2);

  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hourStr = hours.toString().padStart(2, '0');

  return `${day}-${month}-${yearShort} ${hourStr}:${minutes} ${ampm}`;
}

/**
 * Deterministically formats / generates authentic CBE Receipt ID (e.g. "v2-hfHCxNWf7zFVZ9Hq2rAn")
 */
export function generateCbeReceiptId(txId: string, createdAt: string): string {
  const seed = `${txId}_${createdAt}_CBE_V2`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'v2-';
  let absVal = Math.abs(hash);
  for (let i = 0; i < 20; i++) {
    const code = (absVal * (i + 13) + seed.charCodeAt(i % seed.length) * 31) % chars.length;
    result += chars[code];
  }
  return result;
}

export default function TransactionDetailModal({
  transaction,
  onClose,
  onViewReceipt,
  currentUserId,
  currentUserAccount,
  onNavigateTab
}: TransactionDetailModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showWebReceipt, setShowWebReceipt] = useState<boolean>(false);
  const [isIPhone, setIsIPhone] = useState<boolean>(() => PhoneSettingsService.isIPhoneMode());

  useEffect(() => {
    return PhoneSettingsService.subscribe(() => {
      setIsIPhone(PhoneSettingsService.isIPhoneMode());
    });
  }, []);

  // Sync native status bar and background dimming to match dimmed CBE purple #380c50
  useEffect(() => {
    SystemBarsService.applyModalOpenBars();
    return () => {
      SystemBarsService.restoreFromModal();
    };
  }, []);

  // Re-apply detail modal system bars when returning from the Web Receipt overlay
  useEffect(() => {
    if (!showWebReceipt) {
      SystemBarsService.applyModalOpenBars();
    }
  }, [showWebReceipt]);

  // Handle hardware/gesture back while Web Receipt is open before closing detail modal
  useEffect(() => {
    if (!showWebReceipt) return;
    const handlePhoneBack = (e: any) => {
      setShowWebReceipt(false);
      e?.detail?.setHandled?.();
      e?.stopImmediatePropagation?.();
      e?.preventDefault?.();
    };
    window.addEventListener('cbe_phone_back', handlePhoneBack, true);
    return () => {
      window.removeEventListener('cbe_phone_back', handlePhoneBack, true);
    };
  }, [showWebReceipt]);

  // Check if credit or debit
  const txType = (transaction.type as string);
  const isCredit = 
    txType === 'receive' || 
    transaction.senderName === 'Deposit' ||
    (currentUserId && transaction.recipientId === currentUserId) ||
    (currentUserAccount && transaction.recipientAccount === currentUserAccount) ||
    (!transaction.recipientId && !transaction.senderId && txType === 'receive');

  // Exact 12-char CBE Transaction ID (guaranteed same across modal, receipt, and webreceipt)
  const txId = formatTo12CharTxId(transaction.id || transaction.reference);
  const receiptId = generateCbeReceiptId(txId, transaction.createdAt);
  const formattedDate = formatCbeDetailDate(transaction.createdAt);

  // Determine realistic type string matching Image 1 & 2
  const recipientNameLower = (transaction.recipientName || '').toLowerCase();
  const descLower = (transaction.description || '').toLowerCase();
  const isWallet = 
    recipientNameLower.includes('tele') || 
    recipientNameLower.includes('settlement') || 
    recipientNameLower.includes('cbebirr') || 
    descLower.includes('tele') || 
    descLower.includes('wallet');

  let typeLabel = 'Account to Account';
  if (isWallet) {
    typeLabel = 'Wallet Transfer';
  } else if (txType === 'bill') {
    typeLabel = 'Utility Bill Payment';
  } else if (txType === 'airtime') {
    typeLabel = 'Airtime Topup';
  } else {
    typeLabel = 'Account to Account';
  }

  // Remark string matching Image 1 & 2
  let remark = transaction.description;
  if (!remark || remark.toLowerCase() === 'deposit') {
    if (isWallet) {
      const cleanPhone = (transaction.recipientAccount || '0926193920').replace(/\D/g, '').slice(-10) || '0926193920';
      remark = `TeleB${cleanPhone}`;
    } else {
      remark = isIPhone ? 'transfer' : 'tr';
    }
  }

  const handleCopy = (text: string, fieldName: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <>
    <div 
      id="transaction-detail-modal-overlay"
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[0.5px] flex flex-col justify-end items-center p-0 animate-in fade-in duration-200 select-none pointer-events-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="transaction-detail-sheet"
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-white rounded-t-[32px] sm:rounded-t-[36px] rounded-b-none shadow-[0_-12px_45px_rgba(0,0,0,0.25)] flex flex-col relative animate-in slide-in-from-bottom-5 duration-250 select-none h-[calc(100%-max(env(safe-area-inset-top,0px),0px)-152px)] min-h-[calc(100%-max(env(safe-area-inset-top,0px),0px)-152px)] overflow-hidden"
      >
        {/* Scrollable Upper Body with Proportional Vertical Spacing Matching Image One */}
        <div className="flex-1 overflow-y-auto px-6 pt-3 pb-0 flex flex-col justify-between min-h-0">
          {/* Subtle top drag pill handle matching reference image */}
          <div className="w-10 h-1 bg-gray-300/80 rounded-full mx-auto mb-2 mt-0.5 shrink-0" />

          {/* Top Title Bar with Close Button (matching reference image) */}
          <div className="flex items-center justify-between relative mb-2 shrink-0">
            <div className="w-6" /> {/* Balance spacer */}
            <h2 className="text-[12.5px] sm:text-[13px] font-semibold text-gray-400 tracking-wider uppercase text-center flex-1 font-sans">
              TRANSACTION DETAIL
            </h2>
            <button
              id="btn-close-tx-detail"
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status Pill Badge: Completed */}
          <div className="flex justify-center mb-2.5 shrink-0">
            <div className="bg-[#eaf8f1] text-[#00b050] px-4 py-1 text-xs rounded-full font-bold inline-flex items-center gap-1.5 shadow-2xs">
              <span className="w-3.5 h-3.5 rounded-full bg-[#00b050] text-white flex items-center justify-center text-[9px] font-black">
                ✓
              </span>
              <span className="text-[12.5px] font-bold tracking-tight text-[#00b050]">Completed</span>
            </div>
          </div>

          {/* Transaction Amount matching Image One */}
          <div className="text-center mb-4 sm:mb-5 shrink-0">
            <h3 className="text-[32px] sm:text-[34px] font-black text-[#111827] tracking-tight font-sans leading-tight">
              {isCredit ? '+' : '-'}{transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
            </h3>
            <p className="text-[14px] sm:text-[14.5px] mt-1 text-gray-500 font-normal">
              {isCredit ? 'from' : 'to'} {isCredit ? (transaction.senderName || 'Mosisa Teshome Tesfa') : (transaction.recipientName || 'Mosisa Teshome Tesfa')}
            </p>
          </div>

          {/* Key-Value Details List with 20px gap and increased text sizes matching Image One */}
          <div className="space-y-[20px] py-1 px-0.5 my-auto">
            {/* 1. Date & Time */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500 font-medium whitespace-nowrap text-[14.5px] sm:text-[15px]">Date &amp; Time</span>
              <span className="font-bold text-gray-900 text-right text-[14.5px] sm:text-[15px]">{formattedDate}</span>
            </div>

            {/* 2. Type */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500 font-medium whitespace-nowrap text-[14.5px] sm:text-[15px]">Type</span>
              <span className="font-bold text-gray-900 text-right text-[14.5px] sm:text-[15px]">{typeLabel}</span>
            </div>

            {/* 3. Transaction ID */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500 font-medium whitespace-nowrap text-[14.5px] sm:text-[15px]">Transaction ID</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold font-mono text-gray-900 text-[14.5px] sm:text-[15px]">{txId}</span>
                <button
                  id="btn-copy-txid"
                  type="button"
                  onClick={() => handleCopy(txId, 'txid')}
                  className="p-1 text-gray-400 hover:text-[#70189F] hover:bg-purple-50 rounded transition cursor-pointer"
                  title="Copy Transaction ID"
                >
                  {copiedField === 'txid' ? (
                    <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                  ) : (
                    <svg className="w-4 h-4 text-gray-400 hover:text-[#70189F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* 4. Receipt ID (Wrapped nicely matching Image One) */}
            <div className="flex items-start justify-between gap-3">
              <span className="text-gray-500 font-medium whitespace-nowrap text-[14.5px] sm:text-[15px] pt-0.5">Receipt ID</span>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="font-bold font-mono text-gray-900 text-[14px] sm:text-[14.5px] tracking-tight leading-tight max-w-[210px] break-all text-right">
                  {receiptId.startsWith('v2-') ? (
                    <>
                      <span>v2-</span><br />
                      <span>{receiptId.slice(3)}</span>
                    </>
                  ) : (
                    receiptId
                  )}
                </span>
                <button
                  id="btn-copy-receiptid"
                  type="button"
                  onClick={() => handleCopy(receiptId, 'receiptid')}
                  className="p-1 text-gray-400 hover:text-[#70189F] hover:bg-purple-50 rounded transition cursor-pointer shrink-0"
                  title="Copy Receipt ID"
                >
                  {copiedField === 'receiptid' ? (
                    <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                  ) : (
                    <svg className="w-4 h-4 text-gray-400 hover:text-[#70189F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* 5. Remark */}
            <div className="flex items-start justify-between gap-3">
              <span className="text-gray-500 font-medium whitespace-nowrap mt-0.5 text-[14.5px] sm:text-[15px]">Remark</span>
              <span className="font-bold text-gray-900 text-right leading-snug max-w-[220px] sm:max-w-[250px] text-[14.5px] sm:text-[15px]">
                {remark}
              </span>
            </div>
          </div>

          {/* Copied Notification Toast */}
          {copiedField && (
            <div className="my-1 py-1 px-3 bg-gray-900 text-white text-[11px] font-semibold rounded-lg text-center animate-in fade-in duration-150 shrink-0">
              {copiedField === 'txid' ? 'Transaction ID' : 'Receipt ID'} copied to clipboard
            </div>
          )}

          {/* Centered Purple VIEW RECEIPT Action Button Matching Image One */}
          <div className="mt-[12px] mb-[12px] flex justify-center shrink-0">
            <button
              id="btn-view-full-receipt"
              type="button"
              onClick={() => {
                const txPayload = {
                  ...transaction,
                  id: txId,
                  reference: txId,
                  description: remark,
                };
                if (!openWebReceiptInRealBrowser({ transaction: txPayload })) {
                  setShowWebReceipt(true);
                }
              }}
              className="w-auto min-w-[172px] max-w-[196px] h-[44px] sm:h-[46px] px-6 py-2.5 text-xs bg-[#70189F] hover:bg-[#5e1286] active:scale-[0.98] text-white rounded-full font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(112,24,159,0.35)] transition-all cursor-pointer"
            >
              <svg 
                className="w-4 h-4 text-white shrink-0" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                <path d="M16 8h-8" />
                <path d="M16 12h-8" />
                <path d="M13 16h-5" />
              </svg>
              <span className="font-bold tracking-wider text-[12px] whitespace-nowrap">VIEW RECEIPT</span>
            </button>
          </div>
        </div>

        {/* Authentic CBE Bottom Navigation Bar (Home, Transactions active pill, Settings) */}
        <div className="w-full shrink-0 bg-white z-10">
          <BottomNavigation
            activeTab="transactions"
            showScanQr={false}
            onChangeTab={(tab) => {
              onClose();
              if (onNavigateTab) {
                onNavigateTab(tab as any);
              } else {
                window.dispatchEvent(new CustomEvent('cbe_navigate_tab', { detail: { tab } }));
              }
            }}
          />
        </div>
      </div>
    </div>

    {showWebReceipt && (
      <CbeWebReceiptModal
        transaction={{
          ...transaction,
          id: txId,
          reference: txId,
          description: remark,
        }}
        onClose={() => setShowWebReceipt(false)}
      />
    )}
    </>
  );
}

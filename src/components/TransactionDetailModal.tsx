import React, { useState } from 'react';
import { Transaction } from '../types';
import { formatTo12CharTxId } from '../lib/mockData';
import { 
  X, 
  Check, 
  Copy, 
  CheckCheck, 
  ArrowDownLeft, 
  ArrowUpRight 
} from 'lucide-react';
import { ViewReceiptIcon } from './CbeCustomIcons';

interface TransactionDetailModalProps {
  transaction: Transaction;
  onClose: () => void;
  onViewReceipt: (tx: Transaction) => void;
  currentUserId?: string;
  currentUserAccount?: string;
}

/**
 * Formats date into authentic CBE detail format: e.g. "29-Aug-26 12:00 AM"
 */
export function formatCbeDetailDate(dateInput: any): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '29-Aug-26 12:00 AM';

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
 * Deterministically formats / generates authentic CBE Receipt ID (e.g. "v2-hfHCxGIMN8iwmc7TXQ0K")
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
  currentUserAccount
}: TransactionDetailModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Check if credit or debit
  const txType = (transaction.type as string);
  const isCredit = 
    txType === 'receive' || 
    transaction.senderName === 'Deposit' ||
    (currentUserId && transaction.recipientId === currentUserId) ||
    (currentUserAccount && transaction.recipientAccount === currentUserAccount) ||
    (!transaction.recipientId && !transaction.senderId && txType === 'receive');

  const txId = formatTo12CharTxId(transaction.reference || transaction.id);
  const receiptId = generateCbeReceiptId(txId, transaction.createdAt);
  const formattedDate = formatCbeDetailDate(transaction.createdAt);

  // Determine realistic type string
  let typeLabel = 'Mobile Money TXN';
  if (txType === 'bill') {
    typeLabel = 'Utility Bill Payment';
  } else if (txType === 'airtime') {
    typeLabel = 'Airtime Topup';
  } else if (txType === 'transfer') {
    typeLabel = 'CBE Transfer';
  } else if (txType === 'send') {
    typeLabel = isCredit ? 'Mobile Money TXN' : 'Inter-Bank Transfer';
  } else if (txType === 'receive') {
    typeLabel = 'Mobile Money TXN';
  } else {
    typeLabel = isCredit ? 'Mobile Money TXN' : 'CBE Transfer';
  }

  // Remark string
  let remark = transaction.description || (isCredit ? 'Transfer done via Branch' : 'Mobile Banking Transfer');
  if (remark.toLowerCase() === 'deposit') {
    remark = 'Transfer done via Branch';
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
    <div 
      id="transaction-detail-modal-overlay"
      className="fixed inset-0 z-40 bg-black/40 flex items-end justify-center p-0 pb-[62px] sm:pb-[66px] animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="transaction-detail-sheet"
        className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-b-[24px] shadow-2xl px-6 pt-3 pb-5 flex flex-col justify-between relative animate-in slide-in-from-bottom-6 duration-250 select-none border-t border-gray-100 h-[73.5vh] max-h-[75vh] overflow-y-auto"
      >
        {/* Top Drag Indicator */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-1.5" />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col justify-between py-1">
          {/* Top Header Group */}
          <div>
            {/* Top Title Bar with Close Button */}
            <div className="flex items-center justify-between relative mb-2">
              <div className="w-7" /> {/* Balance spacer */}
              <h2 className="text-xs sm:text-[13px] font-bold text-gray-500 tracking-wider uppercase text-center flex-1">
                TRANSACTION DETAIL
              </h2>
              <button
                id="btn-close-tx-detail"
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Pill Badge: Completed */}
            <div className="flex justify-center my-1.5">
              <div className="bg-[#eaf8f0] text-[#16a34a] px-4 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                <span className="w-3.5 h-3.5 rounded-full bg-[#16a34a] text-white flex items-center justify-center text-[9px] font-bold">
                  ✓
                </span>
                <span>Completed</span>
              </div>
            </div>

            {/* Transaction Amount */}
            <div className="text-center my-3 sm:my-3.5">
              <h3 className="text-3xl sm:text-4xl font-extrabold text-[#0f172a] tracking-tight font-sans">
                {isCredit ? '+' : '-'}{transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 font-medium mt-1">
                {isCredit ? 'from' : 'to'} {isCredit ? (transaction.senderName || 'CBE Customer') : (transaction.recipientName || 'CBE Customer')}
              </p>
            </div>
          </div>

          {/* Key-Value Details List - Increased text size & clear hierarchy */}
          <div className="my-auto space-y-4 sm:space-y-4.5 px-0.5 text-sm sm:text-[15px]">
            {/* Date & Time */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400 font-medium whitespace-nowrap text-[13px] sm:text-sm">Date &amp; Time</span>
              <span className="font-bold text-gray-900 text-right text-[13px] sm:text-sm">{formattedDate}</span>
            </div>

            {/* Type */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400 font-medium whitespace-nowrap text-[13px] sm:text-sm">Type</span>
              <span className="font-bold text-gray-900 text-right text-[13px] sm:text-sm">{typeLabel}</span>
            </div>

            {/* Transaction ID */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400 font-medium whitespace-nowrap text-[13px] sm:text-sm">Transaction ID</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold font-mono text-gray-900 text-[13px] sm:text-sm">{txId}</span>
                <button
                  id="btn-copy-txid"
                  type="button"
                  onClick={() => handleCopy(txId, 'txid')}
                  className="p-1 text-gray-400 hover:text-[#70189F] transition cursor-pointer"
                  title="Copy Transaction ID"
                >
                  {copiedField === 'txid' ? (
                    <CheckCheck className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Receipt ID */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400 font-medium whitespace-nowrap text-[13px] sm:text-sm">Receipt ID</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold font-mono text-gray-900 text-right break-all sm:break-normal max-w-[210px] sm:max-w-[250px] text-[12.5px] sm:text-[13.5px]">
                  {receiptId}
                </span>
                <button
                  id="btn-copy-receiptid"
                  type="button"
                  onClick={() => handleCopy(receiptId, 'receiptid')}
                  className="p-1 text-gray-400 hover:text-[#70189F] transition cursor-pointer shrink-0"
                  title="Copy Receipt ID"
                >
                  {copiedField === 'receiptid' ? (
                    <CheckCheck className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remark */}
            <div className="flex items-start justify-between gap-3">
              <span className="text-gray-400 font-medium whitespace-nowrap mt-0.5 text-[13px] sm:text-sm">Remark</span>
              <span className="font-bold text-gray-900 text-right max-w-[220px] sm:max-w-[240px] leading-snug text-[13px] sm:text-sm">
                {remark}
              </span>
            </div>
          </div>

          {/* Copied Notification Toast */}
          {copiedField && (
            <div className="my-1.5 py-1 px-3 bg-gray-900 text-white text-[11px] font-semibold rounded-lg text-center animate-in fade-in duration-150">
              {copiedField === 'txid' ? 'Transaction ID' : 'Receipt ID'} copied to clipboard
            </div>
          )}
        </div>

        {/* Centered Purple VIEW RECEIPT Action Button (Matching reference) */}
        <div className="mt-4 mb-0.5 flex justify-center">
          <button
            id="btn-view-full-receipt"
            type="button"
            onClick={() => onViewReceipt(transaction)}
            className="w-auto min-w-[180px] max-w-[230px] bg-[#70189F] hover:bg-[#5e1385] active:scale-[0.98] text-white py-2.5 sm:py-3 px-6 rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_3px_12px_rgba(112,24,159,0.22)] transition-all cursor-pointer"
          >
            <ViewReceiptIcon size={18} className="text-white" strokeWidth={1.8} />
            <span className="font-bold tracking-wider text-[12px] whitespace-nowrap">VIEW RECEIPT</span>
          </button>
        </div>
      </div>
    </div>
  );
}

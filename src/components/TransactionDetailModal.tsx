import React, { useState } from 'react';
import { Transaction } from '../types';
import { formatTo12CharTxId } from '../lib/mockData';
import { X, Check } from 'lucide-react';

interface TransactionDetailModalProps {
  transaction: Transaction;
  onClose: () => void;
  onViewReceipt: (tx: Transaction) => void;
  currentUserId?: string;
  currentUserAccount?: string;
}

/**
 * Formats date into authentic CBE detail format matching Image 2: e.g. "14-Oct-26 10:35 PM"
 */
export function formatCbeDetailDate(dateInput: any): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '14-Oct-26 10:35 PM';

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
 * Deterministically formats / generates authentic CBE Receipt ID (e.g. "v2-hfHCxHBAM4l2EDhVl6xw")
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

  // Exact 12-char CBE Transaction ID (guaranteed same across modal, receipt, and webreceipt)
  const txId = formatTo12CharTxId(transaction.id || transaction.reference);
  const receiptId = generateCbeReceiptId(txId, transaction.createdAt);
  const formattedDate = formatCbeDetailDate(transaction.createdAt);

  // Determine realistic type string matching Image 2
  const recipientNameLower = (transaction.recipientName || '').toLowerCase();
  const descLower = (transaction.description || '').toLowerCase();
  const isWallet = 
    recipientNameLower.includes('tele') || 
    recipientNameLower.includes('settlement') || 
    recipientNameLower.includes('cbebirr') || 
    descLower.includes('tele') || 
    descLower.includes('wallet');

  let typeLabel = 'CBE Transfer';
  if (isWallet) {
    typeLabel = 'Wallet Transfer';
  } else if (txType === 'bill') {
    typeLabel = 'Utility Bill Payment';
  } else if (txType === 'airtime') {
    typeLabel = 'Airtime Topup';
  } else if (txType === 'transfer' || txType === 'send') {
    typeLabel = isCredit ? 'Mobile Money TXN' : 'CBE Transfer';
  } else if (txType === 'receive') {
    typeLabel = 'Mobile Money TXN';
  }

  // Remark string matching Image 2
  let remark = transaction.description;
  if (!remark || remark.toLowerCase() === 'deposit') {
    if (isWallet) {
      const cleanPhone = (transaction.recipientAccount || '0926193920').replace(/\D/g, '').slice(-10) || '0926193920';
      remark = `TeleB${cleanPhone}`;
    } else {
      remark = 'MB transfer';
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
    <div 
      id="transaction-detail-modal-overlay"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[0.5px] flex items-end justify-center p-0 animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="transaction-detail-sheet"
        className="w-full max-w-md bg-white rounded-t-[32px] rounded-b-none shadow-[0_-12px_45px_rgba(0,0,0,0.25)] px-6 pt-3 pb-8 flex flex-col justify-between relative animate-in slide-in-from-bottom-5 duration-250 select-none border-t border-gray-100 min-h-[580px] max-h-[88vh] h-[80vh] sm:h-auto overflow-y-auto"
      >
        {/* Top Drag Indicator matching Image 2 */}
        <div className="w-10 h-1.5 bg-gray-300 rounded-full mx-auto mb-3 mt-0.5 shrink-0" />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col justify-between py-1">
          {/* Top Header Group */}
          <div className="shrink-0">
            {/* Top Title Bar with Close Button */}
            <div className="flex items-center justify-between relative mb-2.5">
              <div className="w-6" /> {/* Balance spacer */}
              <h2 className="text-[12px] sm:text-[12.5px] font-bold text-gray-400 tracking-wider uppercase text-center flex-1 font-sans">
                TRANSACTION DETAIL
              </h2>
              <button
                id="btn-close-tx-detail"
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Status Pill Badge: Completed (Matching exact soft green in Image 2) */}
            <div className="flex justify-center my-2">
              <div className="bg-[#eaf8f1] text-[#00b050] px-4 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                <span className="w-3.5 h-3.5 rounded-full bg-[#00b050] text-white flex items-center justify-center text-[9px] font-black">
                  ✓
                </span>
                <span className="text-[12px] font-bold tracking-tight">Completed</span>
              </div>
            </div>

            {/* Transaction Amount matching Image 2 */}
            <div className="text-center my-4 sm:my-5">
              <h3 className="text-3xl sm:text-[34px] font-black text-[#0f172a] tracking-tight font-sans leading-tight">
                {isCredit ? '+' : '-'}{transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
              </h3>
              <p className="text-[13px] text-gray-500 font-normal mt-1.5">
                {isCredit ? 'from' : 'to'} {isCredit ? (transaction.senderName || 'CBE Customer') : (transaction.recipientName || 'CBE Customer')}
              </p>
            </div>
          </div>

          {/* Key-Value Details List matching Image 2 */}
          <div className="my-auto space-y-4 sm:space-y-4.5 px-0.5 text-sm py-2">
            {/* 1. Date & Time */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400 font-medium whitespace-nowrap text-[13px]">Date &amp; Time</span>
              <span className="font-bold text-gray-900 text-right text-[13px]">{formattedDate}</span>
            </div>

            {/* 2. Type */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400 font-medium whitespace-nowrap text-[13px]">Type</span>
              <span className="font-bold text-gray-900 text-right text-[13px]">{typeLabel}</span>
            </div>

            {/* 3. Transaction ID */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400 font-medium whitespace-nowrap text-[13px]">Transaction ID</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold font-mono text-gray-900 text-[13px]">{txId}</span>
                <button
                  id="btn-copy-txid"
                  type="button"
                  onClick={() => handleCopy(txId, 'txid')}
                  className="p-1 text-gray-400 hover:text-[#70189F] hover:bg-purple-50 rounded transition cursor-pointer"
                  title="Copy Transaction ID"
                >
                  {copiedField === 'txid' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                  ) : (
                    <svg className="w-3.5 h-3.5 text-purple-400/80 hover:text-[#70189F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* 4. Receipt ID */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-400 font-medium whitespace-nowrap text-[13px]">Receipt ID</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold font-mono text-gray-900 text-right break-all sm:break-normal max-w-[210px] sm:max-w-[250px] text-[12.5px] sm:text-[13px]">
                  {receiptId}
                </span>
                <button
                  id="btn-copy-receiptid"
                  type="button"
                  onClick={() => handleCopy(receiptId, 'receiptid')}
                  className="p-1 text-gray-400 hover:text-[#70189F] hover:bg-purple-50 rounded transition cursor-pointer shrink-0"
                  title="Copy Receipt ID"
                >
                  {copiedField === 'receiptid' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                  ) : (
                    <svg className="w-3.5 h-3.5 text-purple-400/80 hover:text-[#70189F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* 5. Remark */}
            <div className="flex items-start justify-between gap-3">
              <span className="text-gray-400 font-medium whitespace-nowrap mt-0.5 text-[13px]">Remark</span>
              <span className="font-bold text-gray-900 text-right max-w-[220px] sm:max-w-[240px] leading-snug text-[13px]">
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

        {/* Centered Purple VIEW RECEIPT Action Button (Matching Image 2) */}
        <div className="mt-6 mb-2 flex justify-center shrink-0">
          <button
            id="btn-view-full-receipt"
            type="button"
            onClick={() => {
              // Ensure normalized transaction object with matching id and reference
              const normalizedTx = {
                ...transaction,
                id: txId,
                reference: txId
              };
              onViewReceipt(normalizedTx);
            }}
            className="w-auto min-w-[210px] max-w-[260px] bg-[#70189F] hover:bg-[#5e1286] active:scale-[0.98] text-white py-3 px-8 rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(112,24,159,0.35)] transition-all cursor-pointer"
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
    </div>
  );
}

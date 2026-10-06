import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Trash2, 
  Copy, 
  Check, 
  Landmark, 
  Calendar, 
  CreditCard, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Info,
  CheckCheck
} from 'lucide-react';
import { SmsMessage, SmsType } from '../types/sms';

interface SmsMessageDetailProps {
  message: SmsMessage;
  onBack: () => void;
  onDelete: (id: string) => void;
}

export default function SmsMessageDetail({ message, onBack, onDelete }: SmsMessageDetailProps) {
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatFullDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return isoString;
    }
  };

  const getTypeLabel = (type: SmsType) => {
    switch (type) {
      case 'TRANSFER': return 'Debit / Transfer';
      case 'DEPOSIT': return 'Credit / Deposit';
      case 'WITHDRAWAL': return 'Cash Withdrawal';
      case 'PAYMENT': return 'Bill / Airtime Payment';
      case 'REVERSAL': return 'Transaction Reversal';
      default: return 'Bank Notification';
    }
  };

  return (
    <div id="sms-message-detail-view" className="flex flex-col h-full bg-gray-50 text-gray-900 overflow-hidden">
      {/* Detail Header */}
      <div className="bg-purple-900 text-white px-4 py-3.5 flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="sms-detail-back-btn"
            onClick={onBack}
            className="p-1.5 -ml-1 text-white/90 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer active:scale-95"
            title="Back to messages"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-400 text-purple-950 flex items-center justify-center font-bold text-xs shadow-xs">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">{message.bankName}</h2>
              <p className="text-[10px] text-white/70 font-medium">Simulated SMS Alert</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          id="sms-detail-delete-btn"
          onClick={() => setShowDeleteConfirm(true)}
          className="p-2 text-white/80 hover:text-rose-300 hover:bg-white/10 rounded-xl transition cursor-pointer"
          title="Delete message"
        >
          <Trash2 className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Detail Content Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Date Stamp */}
        <div className="flex items-center justify-center">
          <span className="text-[11px] bg-gray-200/70 text-gray-600 px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-gray-500" />
            {formatFullDate(message.timestamp)}
          </span>
        </div>

        {/* SMS Message Bubble */}
        <div className="flex items-start gap-2.5 max-w-sm mx-auto">
          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center flex-shrink-0 mt-1 shadow-2xs">
            <Landmark className="w-4 h-4" />
          </div>

          <div className="flex-1 bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border border-gray-200/80 space-y-2 relative">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-purple-900">{message.sender}</span>
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                Delivered <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
              </span>
            </div>

            {/* Authentic SMS Text */}
            <pre className="text-xs text-gray-800 whitespace-pre-wrap font-sans leading-relaxed tracking-normal">
              {message.message}
            </pre>

            <div className="text-[10px] text-gray-400 text-right pt-1">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
            </div>
          </div>
        </div>

        {/* Structured Transaction Breakdown Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200/80 space-y-3 max-w-sm mx-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Transaction Data</span>
            <span className="text-[10px] bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">
              {getTypeLabel(message.type)}
            </span>
          </div>

          <div className="space-y-2 text-xs divide-y divide-gray-50">
            {message.amount !== undefined && (
              <div className="flex justify-between items-center pt-1.5">
                <span className="text-gray-500">Transaction Amount</span>
                <span className="font-mono font-extrabold text-sm text-gray-900">
                  ETB {message.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {message.balance !== undefined && (
              <div className="flex justify-between items-center pt-1.5">
                <span className="text-gray-500">Available Balance</span>
                <span className="font-mono font-bold text-emerald-800">
                  ETB {message.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {message.transactionId && (
              <div className="flex justify-between items-center pt-1.5">
                <span className="text-gray-500">Transaction ID</span>
                <span className="font-mono font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded">
                  {message.transactionId}
                </span>
              </div>
            )}

            {message.recipient && (
              <div className="flex justify-between items-center pt-1.5">
                <span className="text-gray-500">Beneficiary / Info</span>
                <span className="font-semibold text-gray-800 truncate max-w-[180px]">
                  {message.recipient}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-1.5">
              <span className="text-gray-500">Recorded At</span>
              <span className="text-gray-700 font-medium">
                {new Date(message.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Disclaimer Card */}
        <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl max-w-sm mx-auto flex items-start gap-2.5 text-[11px] text-amber-900 leading-snug">
          <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <p>
            This message is an in-app simulated SMS generated locally by Tana Digital Bank for testing and notification records. Deleting this message will not alter your actual bank balance or transactions.
          </p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-xl space-y-3 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-gray-900">Delete Message?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to remove this simulated SMS? Your banking transactions remain intact.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete(message.id);
                  onBack();
                }}
                className="py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

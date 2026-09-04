import React from 'react';
import { Landmark, Trash2, ArrowUpRight, ArrowDownLeft, CreditCard, RefreshCw, Info } from 'lucide-react';
import { SmsMessage, SmsType } from '../types/sms';

interface SmsItemProps {
  message: SmsMessage;
  onSelect: (message: SmsMessage) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export default function SmsItem({ message, onSelect, onDelete }: SmsItemProps) {
  // Format readable timestamp
  const formatSmsTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'Recently';

      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();

      const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

      if (isToday) return `Today, ${timeStr}`;
      if (isYesterday) return `Yesterday, ${timeStr}`;

      const monthStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return `${monthStr}, ${timeStr}`;
    } catch {
      return 'Recently';
    }
  };

  // Get icon and color badge by transaction type
  const getTypeBadge = (type: SmsType) => {
    switch (type) {
      case 'TRANSFER':
        return {
          icon: <ArrowUpRight className="w-3.5 h-3.5 text-rose-700" />,
          bg: 'bg-rose-50 text-rose-800 border-rose-100',
          label: 'Debit',
        };
      case 'DEPOSIT':
        return {
          icon: <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-800" />,
          bg: 'bg-emerald-50 text-emerald-850 border-emerald-100',
          label: 'Credit',
        };
      case 'WITHDRAWAL':
        return {
          icon: <ArrowUpRight className="w-3.5 h-3.5 text-amber-700" />,
          bg: 'bg-amber-50 text-amber-900 border-amber-100',
          label: 'Cash Out',
        };
      case 'PAYMENT':
        return {
          icon: <CreditCard className="w-3.5 h-3.5 text-purple-700" />,
          bg: 'bg-purple-50 text-purple-900 border-purple-100',
          label: 'Payment',
        };
      case 'REVERSAL':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-cyan-700" />,
          bg: 'bg-cyan-50 text-cyan-900 border-cyan-100',
          label: 'Reversal',
        };
      case 'INFO':
      default:
        return {
          icon: <Info className="w-3.5 h-3.5 text-blue-700" />,
          bg: 'bg-blue-50 text-blue-900 border-blue-100',
          label: 'Notice',
        };
    }
  };

  const badge = getTypeBadge(message.type);

  return (
    <div
      id={`sms-item-${message.id}`}
      onClick={() => onSelect(message)}
      className={`group relative p-3.5 border-b border-gray-100 transition-colors cursor-pointer select-none flex items-start gap-3 active:bg-gray-100 ${
        message.read 
          ? 'bg-white hover:bg-gray-50/80' 
          : 'bg-purple-50/40 hover:bg-purple-50/70 border-l-4 border-l-purple-800'
      }`}
    >
      {/* Bank Avatar Icon */}
      <div className="relative flex-shrink-0 mt-0.5">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-2xs ${
          message.read ? 'bg-gray-100 text-gray-600' : 'bg-purple-800 text-amber-300'
        }`}>
          <Landmark className="w-5 h-5" />
        </div>
        {/* Unread indicator dot */}
        {!message.read && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white animate-pulse" />
        )}
      </div>

      {/* Message Info Preview */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <h4 className={`text-xs truncate ${message.read ? 'font-semibold text-gray-700' : 'font-extrabold text-gray-900'}`}>
              {message.bankName}
            </h4>
            <span className={`text-[9.5px] px-1.5 py-0.2 rounded-md font-semibold border flex items-center gap-0.5 ${badge.bg}`}>
              {badge.icon}
              <span>{badge.label}</span>
            </span>
          </div>

          <span className="text-[10px] text-gray-400 whitespace-nowrap font-medium flex-shrink-0">
            {formatSmsTime(message.timestamp)}
          </span>
        </div>

        {/* Message body preview */}
        <p className={`text-xs mt-1 line-clamp-2 leading-snug ${
          message.read ? 'text-gray-500 font-normal' : 'text-gray-800 font-medium'
        }`}>
          {message.message}
        </p>

        {/* Bottom meta row: Amount & Ref */}
        <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-50">
          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
            {message.transactionId && (
              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono font-medium">
                {message.transactionId}
              </span>
            )}
            {message.balance !== undefined && (
              <span>Bal: ETB {message.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            )}
          </div>

          {message.amount !== undefined && (
            <span className={`text-xs font-bold font-mono ${
              message.type === 'DEPOSIT' || message.type === 'REVERSAL'
                ? 'text-emerald-800'
                : 'text-gray-900'
            }`}>
              {message.type === 'DEPOSIT' || message.type === 'REVERSAL' ? '+' : '-'}
              ETB {message.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>

      {/* Delete button */}
      <button
        type="button"
        id={`sms-delete-btn-${message.id}`}
        onClick={(e) => onDelete(message.id, e)}
        className="p-1.5 text-gray-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer self-center flex-shrink-0"
        title="Delete simulated SMS"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

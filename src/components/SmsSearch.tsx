import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { SmsType } from '../types/sms';

export type FilterCategory = 'ALL' | 'UNREAD' | 'TRANSFER' | 'DEPOSIT' | 'WITHDRAWAL' | 'PAYMENT';

interface SmsSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: FilterCategory;
  onFilterChange: (filter: FilterCategory) => void;
  unreadCount: number;
}

export default function SmsSearch({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  unreadCount,
}: SmsSearchProps) {
  const filters: { key: FilterCategory; label: string; badge?: number }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'UNREAD', label: 'Unread', badge: unreadCount > 0 ? unreadCount : undefined },
    { key: 'TRANSFER', label: 'Transfers' },
    { key: 'DEPOSIT', label: 'Deposits' },
    { key: 'WITHDRAWAL', label: 'Withdrawals' },
    { key: 'PAYMENT', label: 'Payments' },
  ];

  return (
    <div id="sms-search-container" className="px-4 pt-2 pb-3 bg-white border-b border-gray-100 space-y-2.5">
      {/* Search Bar */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
        <input
          id="sms-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search messages by bank, ref, amount, text..."
          className="w-full pl-10 pr-9 py-2 bg-gray-50 border border-gray-200/90 rounded-2xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition"
        />
        {searchQuery && (
          <button
            type="button"
            id="sms-clear-search-btn"
            onClick={() => onSearchChange('')}
            className="absolute right-3 p-0.5 text-gray-400 hover:text-gray-600 transition cursor-pointer"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Chips Scrollbar */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 -mx-1 px-1">
        {filters.map((f) => {
          const isActive = activeFilter === f.key;
          return (
            <button
              key={f.key}
              id={`sms-filter-${f.key.toLowerCase()}`}
              type="button"
              onClick={() => onFilterChange(f.key)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                isActive
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{f.label}</span>
              {f.badge !== undefined && (
                <span
                  className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold leading-tight ${
                    isActive ? 'bg-amber-400 text-purple-950' : 'bg-purple-800 text-white'
                  }`}
                >
                  {f.badge > 99 ? '99+' : f.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

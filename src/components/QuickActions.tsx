import React from 'react';
import { ChevronRight } from 'lucide-react';

interface QuickActionsProps {
  onActionClick?: (actionId: 'ministatement' | 'cards' | 'billshare' | 'schedules') => void;
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onActionClick,
  className = '',
}) => {
  return (
    <div className={`w-full max-w-md mx-auto px-4 mt-2 mb-3 relative select-none ${className}`}>
      {/* Authentic Gold Horizontal Drag Indicator Bar as in the reference image */}
      <div className="w-12 h-1.5 bg-[#deb356] rounded-full mx-auto mb-3.5 shadow-xs opacity-90" />

      <div className="flex items-start justify-between relative px-0.5">
        {/* 1. MINI STATEMENT */}
        <button
          id="quick-action-ministatement"
          onClick={() => onActionClick?.('ministatement')}
          className="flex flex-col items-center flex-1 group cursor-pointer active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.06)] border border-gray-100/90 group-hover:scale-105 group-active:scale-95 transition-all">
            {/* Authentic Receipt Ticket with Serrated Edges & 3 Horizontal Lines */}
            <svg
              className="w-6 h-6 text-[#70189F]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Serrated zigzag top and bottom ticket shape */}
              <path d="M4 2v20l2.5-1.5L9 22l2.5-1.5L14 22l2.5-1.5L19 22l2.5-1.5L20 22V2l-2.5 1.5L15 2l-2.5 1.5L10 2 7.5 3.5 4 2Z" />
              {/* 3 Horizontal statement bars */}
              <line x1="8" y1="7.5" x2="16" y2="7.5" strokeWidth="2.2" />
              <line x1="8" y1="11.5" x2="16" y2="11.5" strokeWidth="2.2" />
              <line x1="8" y1="15.5" x2="16" y2="15.5" strokeWidth="2.2" />
            </svg>
          </div>
          <span className="text-[11.5px] font-bold text-[#6b1284] mt-2 text-center leading-tight whitespace-pre-line">
            {'Mini\nStatement'}
          </span>
        </button>

        {/* 2. CARDS */}
        <button
          id="quick-action-cards"
          onClick={() => onActionClick?.('cards')}
          className="flex flex-col items-center flex-1 group cursor-pointer active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.06)] border border-gray-100/90 group-hover:scale-105 group-active:scale-95 transition-all">
            {/* Authentic Credit Card Outline with Top Magnetic Stripe and Dual Chip Stripes */}
            <svg
              className="w-6 h-6 text-[#70189F]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
              <line x1="2.5" y1="9.5" x2="21.5" y2="9.5" strokeWidth="2.2" />
              <line x1="6" y1="14" x2="11.5" y2="14" strokeWidth="2.2" />
              <line x1="6" y1="16.5" x2="9.5" y2="16.5" strokeWidth="2.2" />
            </svg>
          </div>
          <span className="text-[11.5px] font-bold text-[#6b1284] mt-2 text-center leading-tight">
            Cards
          </span>
        </button>

        {/* 3. BILL SHARE */}
        <button
          id="quick-action-billshare"
          onClick={() => onActionClick?.('billshare')}
          className="flex flex-col items-center flex-1 group cursor-pointer active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.06)] border border-gray-100/90 group-hover:scale-105 group-active:scale-95 transition-all">
            {/* Authentic Branching / Forking Split Path Arrow for Bill Share */}
            <svg
              className="w-6 h-6 text-[#70189F]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Vertical stem from bottom */}
              <path d="M12 20.5v-7.5" />
              {/* Branch up-left */}
              <path d="M12 13c0-3.2-3-5.2-6.5-6.2" />
              <path d="M5.5 10.5V6.8H9.2" />
              {/* Branch up-right */}
              <path d="M12 13c0-3.2 3-5.2 6.5-6.2" />
              <path d="M18.5 10.5V6.8H14.8" />
            </svg>
          </div>
          <span className="text-[11.5px] font-bold text-[#6b1284] mt-2 text-center leading-tight">
            Bill Share
          </span>
        </button>

        {/* 4. SCHEDULES */}
        <button
          id="quick-action-schedules"
          onClick={() => onActionClick?.('schedules')}
          className="flex flex-col items-center flex-1 group cursor-pointer active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.06)] border border-gray-100/90 group-hover:scale-105 group-active:scale-95 transition-all">
            {/* Authentic Clock for Schedules */}
            <svg
              className="w-6 h-6 text-[#70189F]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9.5" />
              <polyline points="12 6.5 12 12 16.5 13.5" />
            </svg>
          </div>
          <span className="text-[11.5px] font-bold text-[#6b1284] mt-2 text-center leading-tight">
            Schedules
          </span>
        </button>

        {/* Small Forward Carousel Arrow Pill Indicator on the right */}
        <div className="absolute -right-1 top-4 w-5 h-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.1)] border border-gray-100 flex items-center justify-center text-[#6b1284] pointer-events-none opacity-90">
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.8]" />
        </div>
      </div>
    </div>
  );
};

export default QuickActions;


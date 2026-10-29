import React from 'react';
import { 
  MiniStatementIcon, 
  CashOutIcon,
  BillShareIcon, 
  CardsIcon, 
  RightChevronIcon 
} from './CbeCustomIcons';

interface QuickActionsProps {
  onActionClick?: (actionId: 'ministatement' | 'cashout' | 'billshare' | 'cards' | 'schedules') => void;
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onActionClick,
  className = '',
}) => {
  return (
    <div className={`w-full max-w-md mx-auto px-3 sm:px-4 pt-3.5 sm:pt-4 pb-3 relative select-none ${className}`}>
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 relative items-start">
        {/* 1. MINI STATEMENT */}
        <button
          id="quick-action-ministatement"
          type="button"
          onClick={() => onActionClick?.('ministatement')}
          className="flex flex-col items-center justify-start group cursor-pointer active:scale-95 transition-transform w-full focus:outline-none"
        >
          <div className="w-[50px] h-[50px] sm:w-[54px] sm:h-[54px] rounded-full bg-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-100/90 group-hover:scale-105 group-active:scale-95 transition-all flex-shrink-0">
            <MiniStatementIcon size={24} className="text-[#70189F]" strokeWidth={2.2} />
          </div>
          <span className="text-[11px] sm:text-[11.5px] font-bold text-[#70189F] mt-2 text-center leading-tight whitespace-pre-line min-h-[28px] flex items-center justify-center">
            {'Mini\nStatement'}
          </span>
        </button>

        {/* 2. CASH OUT (Matching Image 2) */}
        <button
          id="quick-action-cashout"
          type="button"
          onClick={() => onActionClick?.('cashout')}
          className="flex flex-col items-center justify-start group cursor-pointer active:scale-95 transition-transform w-full focus:outline-none"
        >
          <div className="w-[50px] h-[50px] sm:w-[54px] sm:h-[54px] rounded-full bg-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-100/90 group-hover:scale-105 group-active:scale-95 transition-all flex-shrink-0">
            <CashOutIcon size={24} className="text-[#70189F]" strokeWidth={2.1} />
          </div>
          <span className="text-[11px] sm:text-[11.5px] font-bold text-[#70189F] mt-2 text-center leading-tight min-h-[28px] flex items-center justify-center">
            Cash Out
          </span>
        </button>

        {/* 3. BILL SHARE (Matching Image 2) */}
        <button
          id="quick-action-billshare"
          type="button"
          onClick={() => onActionClick?.('billshare')}
          className="flex flex-col items-center justify-start group cursor-pointer active:scale-95 transition-transform w-full focus:outline-none"
        >
          <div className="w-[50px] h-[50px] sm:w-[54px] sm:h-[54px] rounded-full bg-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-100/90 group-hover:scale-105 group-active:scale-95 transition-all flex-shrink-0">
            <BillShareIcon size={24} className="text-[#70189F]" strokeWidth={2.3} />
          </div>
          <span className="text-[11px] sm:text-[11.5px] font-bold text-[#70189F] mt-2 text-center leading-tight min-h-[28px] flex items-center justify-center">
            Bill Share
          </span>
        </button>

        {/* 4. CARDS (Matching Image 2) */}
        <button
          id="quick-action-cards"
          type="button"
          onClick={() => onActionClick?.('cards')}
          className="flex flex-col items-center justify-start group cursor-pointer active:scale-95 transition-transform w-full focus:outline-none"
        >
          <div className="w-[50px] h-[50px] sm:w-[54px] sm:h-[54px] rounded-full bg-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-100/90 group-hover:scale-105 group-active:scale-95 transition-all flex-shrink-0">
            <CardsIcon size={24} className="text-[#70189F]" strokeWidth={2.2} />
          </div>
          <span className="text-[11px] sm:text-[11.5px] font-bold text-[#70189F] mt-2 text-center leading-tight min-h-[28px] flex items-center justify-center">
            Cards
          </span>
        </button>

        {/* 5. RIGHT ARROW / CHEVRON INDICATOR */}
        <div className="absolute -right-1 top-3 sm:top-3.5 w-5 h-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.12)] border border-gray-100 flex items-center justify-center text-[#70189F] pointer-events-none opacity-85 z-10">
          <RightChevronIcon size={13} className="text-[#70189F]" strokeWidth={2.6} />
        </div>
      </div>
    </div>
  );
};

export default QuickActions;


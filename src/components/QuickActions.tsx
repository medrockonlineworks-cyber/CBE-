import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  MiniStatementIcon,
  CashOutIcon,
  BillShareIcon,
  CardsIcon,
  SchedulesClockIcon,
  ReceiptCheckIcon,
  RightChevronIcon,
} from './CbeCustomIcons';

export type QuickActionId =
  | 'ministatement'
  | 'cashout'
  | 'billshare'
  | 'cards'
  | 'schedules'
  | 'receipt';

interface QuickActionsProps {
  onActionClick?: (actionId: QuickActionId) => void;
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onActionClick,
  className = '',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < maxScroll - 8);
  }, []);

  useEffect(() => {
    updateScrollArrows();
    window.addEventListener('resize', updateScrollArrows);
    return () => window.removeEventListener('resize', updateScrollArrows);
  }, [updateScrollArrows]);

  const scrollByStep = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const delta = direction === 'right' ? el.clientWidth * 0.55 : -el.clientWidth * 0.55;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <div className={`w-full max-w-md mx-auto px-2 sm:px-3 pt-3.5 sm:pt-4 pb-3 relative select-none ${className}`}>
      <div className="relative">
        {/* Horizontal Swipeable Quick Actions Row (4 visible + swipe/arrow to Schedules & Receipt) */}
        <div
          ref={scrollRef}
          onScroll={updateScrollArrows}
          className="flex items-start overflow-x-auto scrollbar-none scroll-smooth touch-pan-x px-1"
        >
          {/* 1. MINI STATEMENT */}
          <button
            id="quick-action-ministatement"
            type="button"
            onClick={() => onActionClick?.('ministatement')}
            className="w-1/4 shrink-0 px-1 flex flex-col items-center justify-start group cursor-pointer active:scale-95 transition-transform focus:outline-none"
          >
            <div className="w-[50px] h-[50px] sm:w-[54px] sm:h-[54px] rounded-full bg-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-100/90 group-hover:scale-105 group-active:scale-95 transition-all flex-shrink-0">
              <MiniStatementIcon size={24} className="text-[#70189F]" strokeWidth={2.2} />
            </div>
            <span className="text-[12.5px] sm:text-[13.5px] font-bold text-[#70189F] mt-2 text-center leading-tight whitespace-pre-line min-h-[30px] flex items-center justify-center">
              {'Mini\nStatement'}
            </span>
          </button>

          {/* 2. CASH OUT */}
          <button
            id="quick-action-cashout"
            type="button"
            onClick={() => onActionClick?.('cashout')}
            className="w-1/4 shrink-0 px-1 flex flex-col items-center justify-start group cursor-pointer active:scale-95 transition-transform focus:outline-none"
          >
            <div className="w-[50px] h-[50px] sm:w-[54px] sm:h-[54px] rounded-full bg-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-100/90 group-hover:scale-105 group-active:scale-95 transition-all flex-shrink-0">
              <CashOutIcon size={25} className="text-[#70189F]" strokeWidth={1.9} />
            </div>
            <span className="text-[12.5px] sm:text-[13.5px] font-bold text-[#70189F] mt-2 text-center leading-tight min-h-[30px] flex items-center justify-center whitespace-nowrap">
              Cash Out
            </span>
          </button>

          {/* 3. BILL SHARE */}
          <button
            id="quick-action-billshare"
            type="button"
            onClick={() => onActionClick?.('billshare')}
            className="w-1/4 shrink-0 px-1 flex flex-col items-center justify-start group cursor-pointer active:scale-95 transition-transform focus:outline-none"
          >
            <div className="w-[50px] h-[50px] sm:w-[54px] sm:h-[54px] rounded-full bg-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-100/90 group-hover:scale-105 group-active:scale-95 transition-all flex-shrink-0">
              <BillShareIcon size={24} className="text-[#70189F]" strokeWidth={2.3} />
            </div>
            <span className="text-[12.5px] sm:text-[13.5px] font-bold text-[#70189F] mt-2 text-center leading-tight min-h-[30px] flex items-center justify-center whitespace-nowrap">
              Bill Share
            </span>
          </button>

          {/* 4. CARDS */}
          <button
            id="quick-action-cards"
            type="button"
            onClick={() => onActionClick?.('cards')}
            className="w-1/4 shrink-0 px-1 flex flex-col items-center justify-start group cursor-pointer active:scale-95 transition-transform focus:outline-none"
          >
            <div className="w-[50px] h-[50px] sm:w-[54px] sm:h-[54px] rounded-full bg-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-100/90 group-hover:scale-105 group-active:scale-95 transition-all flex-shrink-0">
              <CardsIcon size={24} className="text-[#70189F]" strokeWidth={2.2} />
            </div>
            <span className="text-[12.5px] sm:text-[13.5px] font-bold text-[#70189F] mt-2 text-center leading-tight min-h-[30px] flex items-center justify-center whitespace-nowrap">
              Cards
            </span>
          </button>

          {/* 5. SCHEDULES */}
          <button
            id="quick-action-schedules"
            type="button"
            onClick={() => onActionClick?.('schedules')}
            className="w-1/4 shrink-0 px-1 flex flex-col items-center justify-start group cursor-pointer active:scale-95 transition-transform focus:outline-none"
          >
            <div className="w-[50px] h-[50px] sm:w-[54px] sm:h-[54px] rounded-full bg-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-100/90 group-hover:scale-105 group-active:scale-95 transition-all flex-shrink-0">
              <SchedulesClockIcon size={24} className="text-[#70189F]" strokeWidth={1.9} />
            </div>
            <span className="text-[12.5px] sm:text-[13.5px] font-bold text-[#70189F] mt-2 text-center leading-tight min-h-[30px] flex items-center justify-center whitespace-nowrap">
              Schedules
            </span>
          </button>

          {/* 6. RECEIPT */}
          <button
            id="quick-action-receipt"
            type="button"
            onClick={() => onActionClick?.('receipt')}
            className="w-1/4 shrink-0 px-1 flex flex-col items-center justify-start group cursor-pointer active:scale-95 transition-transform focus:outline-none"
          >
            <div className="w-[50px] h-[50px] sm:w-[54px] sm:h-[54px] rounded-full bg-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-100/90 group-hover:scale-105 group-active:scale-95 transition-all flex-shrink-0">
              <ReceiptCheckIcon size={24} className="text-[#70189F]" strokeWidth={2.5} />
            </div>
            <span className="text-[12.5px] sm:text-[13.5px] font-bold text-[#70189F] mt-2 text-center leading-tight min-h-[30px] flex items-center justify-center whitespace-nowrap">
              Receipt
            </span>
          </button>
        </div>

        {/* Left Chevron Button (shown when scrolled right, matching CBE reference video) */}
        {canScrollLeft && (
          <button
            id="quick-actions-scroll-left"
            type="button"
            aria-label="Scroll quick actions left"
            onClick={() => scrollByStep('left')}
            className="absolute left-0 top-[25px] sm:top-[27px] -translate-y-1/2 w-6 h-6 rounded-full bg-white/95 shadow-[0_2px_6px_rgba(0,0,0,0.14)] border border-gray-100 flex items-center justify-center text-[#70189F] active:scale-90 transition cursor-pointer z-10"
          >
            <RightChevronIcon size={13} className="text-[#70189F] rotate-180" strokeWidth={2.6} />
          </button>
        )}

        {/* Right Chevron Button (shown when more quick actions exist to the right) */}
        {canScrollRight && (
          <button
            id="quick-actions-scroll-right"
            type="button"
            aria-label="Scroll quick actions right"
            onClick={() => scrollByStep('right')}
            className="absolute right-0 top-[25px] sm:top-[27px] -translate-y-1/2 w-6 h-6 rounded-full bg-white/95 shadow-[0_2px_6px_rgba(0,0,0,0.14)] border border-gray-100 flex items-center justify-center text-[#70189F] active:scale-90 transition cursor-pointer z-10"
          >
            <RightChevronIcon size={13} className="text-[#70189F]" strokeWidth={2.6} />
          </button>
        )}
      </div>
    </div>
  );
};

export default QuickActions;

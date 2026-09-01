import React from 'react';
import { 
  MiniStatementIcon, 
  CardsIcon, 
  BillShareIcon, 
  SchedulesClockIcon, 
  RightChevronIcon 
} from './CbeCustomIcons';

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
        {/* 6. MINI STATEMENT */}
        <button
          id="quick-action-ministatement"
          onClick={() => onActionClick?.('ministatement')}
          className="flex flex-col items-center flex-1 group cursor-pointer active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.06)] border border-gray-100/90 group-hover:scale-105 group-active:scale-95 transition-all">
            <MiniStatementIcon size={24} className="text-[#70189F]" strokeWidth={2.2} />
          </div>
          <span className="text-[11.5px] font-bold text-[#6b1284] mt-2 text-center leading-tight whitespace-pre-line">
            {'Mini\nStatement'}
          </span>
        </button>

        {/* 7. CARDS */}
        <button
          id="quick-action-cards"
          onClick={() => onActionClick?.('cards')}
          className="flex flex-col items-center flex-1 group cursor-pointer active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.06)] border border-gray-100/90 group-hover:scale-105 group-active:scale-95 transition-all">
            <CardsIcon size={24} className="text-[#70189F]" strokeWidth={2.2} />
          </div>
          <span className="text-[11.5px] font-bold text-[#6b1284] mt-2 text-center leading-tight">
            Cards
          </span>
        </button>

        {/* 8. BILL SHARE */}
        <button
          id="quick-action-billshare"
          onClick={() => onActionClick?.('billshare')}
          className="flex flex-col items-center flex-1 group cursor-pointer active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.06)] border border-gray-100/90 group-hover:scale-105 group-active:scale-95 transition-all">
            <BillShareIcon size={24} className="text-[#70189F]" strokeWidth={2.3} />
          </div>
          <span className="text-[11.5px] font-bold text-[#6b1284] mt-2 text-center leading-tight">
            Bill Share
          </span>
        </button>

        {/* 9. SCHEDULES */}
        <button
          id="quick-action-schedules"
          onClick={() => onActionClick?.('schedules')}
          className="flex flex-col items-center flex-1 group cursor-pointer active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.06)] border border-gray-100/90 group-hover:scale-105 group-active:scale-95 transition-all">
            <SchedulesClockIcon size={24} className="text-[#70189F]" strokeWidth={2.2} />
          </div>
          <span className="text-[11.5px] font-bold text-[#6b1284] mt-2 text-center leading-tight">
            Schedules
          </span>
        </button>

        {/* 10. RIGHT ARROW / CHEVRON INDICATOR */}
        <div className="absolute -right-1 top-4 w-5 h-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.1)] border border-gray-100 flex items-center justify-center text-[#6b1284] pointer-events-none opacity-90">
          <RightChevronIcon size={14} className="text-[#6b1284]" strokeWidth={2.6} />
        </div>
      </div>
    </div>
  );
};

export default QuickActions;


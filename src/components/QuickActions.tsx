import React from 'react';
import { 
  ArrowUpRight, 
  FileText, 
  CreditCard, 
  GitFork,
  ChevronRight
} from 'lucide-react';

interface QuickActionsProps {
  onActionClick?: (actionId: 'cashout' | 'ministatement' | 'cards' | 'billshare') => void;
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onActionClick,
  className = '',
}) => {
  const actions = [
    {
      id: 'cashout' as const,
      label: 'Cash Out',
      icon: <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />,
    },
    {
      id: 'ministatement' as const,
      label: 'Mini\nStatement',
      icon: <FileText className="w-6 h-6 stroke-[2.5]" />,
    },
    {
      id: 'cards' as const,
      label: 'Cards',
      icon: <CreditCard className="w-6 h-6 stroke-[2.5]" />,
    },
    {
      id: 'billshare' as const,
      label: 'Bill Share',
      icon: <GitFork className="w-6 h-6 stroke-[2.5]" />,
    },
  ];

  return (
    <div className={`w-full max-w-md mx-auto px-4 my-4 relative select-none ${className}`}>
      <div className="flex items-start justify-between relative px-1">
        {actions.map((action) => (
          <button
            key={action.id}
            id={`quick-action-${action.id}`}
            onClick={() => onActionClick?.(action.id)}
            className="flex flex-col items-center flex-1 group cursor-pointer active:scale-95 transition-transform"
          >
            {/* White Circular Icon Container */}
            <div className="w-13 h-13 rounded-full bg-white flex items-center justify-center text-[#70189F] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-100/80 group-hover:scale-105 group-active:scale-95 transition-all">
              {action.icon}
            </div>

            {/* Label Below Button */}
            <span className="text-[11px] font-extrabold text-[#70189F] mt-2 text-center whitespace-pre-line leading-tight">
              {action.label}
            </span>
          </button>
        ))}

        {/* Small Forward Carousel Arrow Pill Indicator on the right */}
        <div className="absolute -right-1.5 top-3.5 w-5 h-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.08)] border border-gray-100 flex items-center justify-center text-[#70189F] pointer-events-none opacity-80">
          <ChevronRight className="w-3 h-3 stroke-[2.5]" />
        </div>
      </div>
    </div>
  );
};

export default QuickActions;

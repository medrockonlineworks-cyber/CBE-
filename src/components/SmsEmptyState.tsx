import React from 'react';
import { MessageSquareDashed, SearchX } from 'lucide-react';

interface SmsEmptyStateProps {
  isFiltered: boolean;
  onClearFilter?: () => void;
}

export default function SmsEmptyState({ isFiltered, onClearFilter }: SmsEmptyStateProps) {
  if (isFiltered) {
    return (
      <div id="sms-empty-filtered" className="flex flex-col items-center justify-center p-8 text-center space-y-3 py-16">
        <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-800 flex items-center justify-center shadow-xs">
          <SearchX className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-800">No matching SMS messages</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
            Try adjusting your search terms or selecting a different filter.
          </p>
        </div>
        {onClearFilter && (
          <button
            type="button"
            id="sms-reset-filters-btn"
            onClick={onClearFilter}
            className="px-4 py-1.5 bg-purple-900 text-white text-xs font-semibold rounded-xl hover:bg-purple-850 active:scale-95 transition cursor-pointer shadow-xs"
          >
            Reset filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div id="sms-empty-all" className="flex flex-col items-center justify-center p-8 text-center space-y-3 py-16">
      <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-800 flex items-center justify-center shadow-xs">
        <MessageSquareDashed className="w-7 h-7" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-800">No simulated SMS messages yet</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
          Every completed transfer, deposit, bill payment, or withdrawal will automatically generate an authentic bank SMS here.
        </p>
      </div>
    </div>
  );
}

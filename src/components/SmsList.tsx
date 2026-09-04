import React from 'react';
import { SmsMessage } from '../types/sms';
import SmsItem from './SmsItem';
import SmsEmptyState from './SmsEmptyState';

interface SmsListProps {
  messages: SmsMessage[];
  onSelectMessage: (message: SmsMessage) => void;
  onDeleteMessage: (id: string, e: React.MouseEvent) => void;
  isFiltered: boolean;
  onClearFilter?: () => void;
}

export default function SmsList({
  messages,
  onSelectMessage,
  onDeleteMessage,
  isFiltered,
  onClearFilter,
}: SmsListProps) {
  if (messages.length === 0) {
    return <SmsEmptyState isFiltered={isFiltered} onClearFilter={onClearFilter} />;
  }

  return (
    <div id="sms-list-container" className="divide-y divide-gray-100 overflow-y-auto flex-1">
      {messages.map((message) => (
        <SmsItem
          key={message.id}
          message={message}
          onSelect={onSelectMessage}
          onDelete={onDeleteMessage}
        />
      ))}
    </div>
  );
}

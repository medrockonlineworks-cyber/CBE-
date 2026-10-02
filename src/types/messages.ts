export interface MessageThread {
  id: string;
  sender: string;
  phoneNumber?: string;
  avatarColor: string;
  avatarLetter?: string;
  snippet: string;
  timestamp: string;
  timeLabel: string;
  unreadCount: number;
  tag?: string;
  isCbe?: boolean;
  messages?: {
    id: string;
    text: string;
    timestamp: string;
    sender: string;
    isSender?: boolean;
    isOutgoing?: boolean;
  }[];
}

export interface MessageThread {
  id: string;
  sender: string;
  avatarColor: string;
  avatarLetter?: string;
  snippet: string;
  timestamp: string;
  timeLabel: string;
  unreadCount: number;
  isCbe?: boolean;
  messages?: {
    id: string;
    text: string;
    timestamp: string;
    sender: string;
    isSender?: boolean;
  }[];
}

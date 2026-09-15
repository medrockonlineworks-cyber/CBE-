export type TelegramSender = 'left' | 'right'; // left = Contact / Receiver, right = Me / Sender

export type TelegramMessageType = 'text' | 'image' | 'photo' | 'album' | 'date' | 'system';

export type TelegramReadStatus = 'sending' | 'sent' | 'delivered' | 'read'; // sending (clock), sent (✓), delivered (✓✓), read (✓✓ green)

export type TelegramStatusType = 'online' | 'last seen recently' | 'last seen today' | 'last seen yesterday' | 'custom';

export type TelegramTheme = 'telegram_classic_green' | 'dark_default' | 'dark_blue' | 'obsidian' | 'light';

export interface TelegramImageItem {
  id: string;
  url: string; // base64 data url or image link
  caption?: string;
  name?: string;
}

export interface TelegramReplyQuote {
  senderName: string;
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  text?: string;
}

export interface TelegramMessage {
  id: string;
  sender: TelegramSender; // 'left' or 'right'
  author?: 'gom' | 'receiver'; // Who actually originated this message
  type: TelegramMessageType;
  text?: string;
  images?: TelegramImageItem[]; // For image (1) or album (2+)
  timestamp?: string; // e.g. "2:30 PM" (optional for date / system events)
  dateLabel?: string; // For type === 'date' e.g. "September 15, 2026" or "Today"
  status?: TelegramReadStatus;
  replyToId?: string;
  replyQuote?: TelegramReplyQuote;
  reaction?: string; // e.g. "🤝 🌐 GOM" or "🤝" or "❤️"
  isEdited?: boolean;
  transactionRef?: string;
}

export interface TelegramChatSettings {
  theme: TelegramTheme;
  customBackgroundUrl?: string;
  backgroundOpacity: number; // 0 to 100
  fontSize: 'small' | 'normal' | 'large';
  bubbleRadius: 'normal' | 'rounded' | 'sharp';
  showTimestamps: boolean;
  showReadTicks: boolean;
  showAvatars: boolean;
  showStatus: boolean;
  showAndroidStatusBar: boolean;
  timeFormat: '12h' | '24h';
  typingSimulation: boolean;
  typingDurationSec: number; // 1 to 10
}

export interface TelegramParticipantProfile {
  contactName: string;
  username: string;
  avatarUrl?: string;
  status: TelegramStatusType;
  customStatusText?: string;
  phoneNumber?: string;
  accountNumber?: string;
  bioText?: string;
}

export interface TelegramChat {
  id: string;
  contactName: string;
  username: string; // e.g. "@leul_seged"
  avatarUrl?: string;
  status: TelegramStatusType;
  customStatusText?: string;
  phoneNumber?: string;
  accountNumber?: string;
  bankName?: string;
  balance?: number;
  viewPerspective?: 'gom' | 'receiver'; // Which perspective is viewing: 'gom' sees receiver in header, 'receiver' sees GOM in header
  gomProfile?: TelegramParticipantProfile;
  receiverProfile?: TelegramParticipantProfile;
  messages: TelegramMessage[];
  settings: TelegramChatSettings;
  createdAt: string;
  updatedAt: string;
}


import { TelegramChat, TelegramMessage, TelegramChatSettings, TelegramParticipantProfile } from '../types/telegram';
import { 
  generateSmsScreenshotDataUrl, 
  generateCbeWebReceiptScreenshotDataUrl, 
  getLeulSegedAvatarDataUrl,
  getGOMAvatarDataUrl,
  TransactionMockData 
} from '../utils/telegramReceiptGenerator';
import { buildSeptember15DemoMessages } from '../utils/telegramDemoChatData';
import { LocalDb } from '../lib/mockData';
import { Transaction } from '../types';

const STORAGE_KEY = 'telegram_simulator_chats_v5';
const ACTIVE_CHAT_KEY = 'telegram_simulator_active_chat_id_v5';

const DEFAULT_SETTINGS: TelegramChatSettings = {
  theme: 'telegram_classic_green',
  backgroundOpacity: 100,
  fontSize: 'normal',
  bubbleRadius: 'normal',
  showTimestamps: true,
  showReadTicks: true,
  showAvatars: false,
  showStatus: true,
  showAndroidStatusBar: true,
  timeFormat: '12h',
  typingSimulation: false,
  typingDurationSec: 3,
};

// Initial realistic default transaction matching Screenshot_20260915-145508.png
const DEFAULT_LEUL_TRANSACTION: TransactionMockData = {
  payerName: 'Global Online Market',
  payerAccount: '*******6671',
  receiverName: 'Leul Degsew Alemayehu',
  receiverAccount: '1********6450',
  amount: 200000,
  balance: 201000,
  referenceNo: 'FT267561AI79',
  dateTimeStr: '2:21 PM',
  bankName: 'Commercial Bank of Ethiopia (CBE)',
};

const INITIAL_SMS_IMAGE = generateSmsScreenshotDataUrl(DEFAULT_LEUL_TRANSACTION);
const INITIAL_RECEIPT_IMAGE = generateCbeWebReceiptScreenshotDataUrl(DEFAULT_LEUL_TRANSACTION);
const INITIAL_LEUL_AVATAR = getLeulSegedAvatarDataUrl();
const INITIAL_GOM_AVATAR = getGOMAvatarDataUrl();

const DEFAULT_GOM_PROFILE: TelegramParticipantProfile = {
  contactName: 'GOM Customer Service',
  username: '@gom_customer_service',
  avatarUrl: INITIAL_GOM_AVATAR,
  status: 'last seen recently',
  accountNumber: '1000684396671',
  bioText: "Let's work together through simple tasks for earning",
};

const DEFAULT_LEUL_PROFILE: TelegramParticipantProfile = {
  contactName: 'Leul Seged',
  username: '@leul_seged',
  avatarUrl: INITIAL_LEUL_AVATAR,
  status: 'last seen recently',
  phoneNumber: '+251 91 163 8276',
  accountNumber: '1000638276450',
};

export const INITIAL_SAMPLE_CHATS: TelegramChat[] = [
  {
    id: 'chat-leul-seged',
    contactName: 'GOM Customer Se',
    username: '@gom_customer_service',
    avatarUrl: INITIAL_GOM_AVATAR,
    status: 'last seen recently',
    customStatusText: '',
    phoneNumber: '+251 91 163 8276',
    accountNumber: '1000638276450',
    bankName: 'Commercial Bank of Ethiopia',
    balance: 201000,
    viewPerspective: 'receiver', // Default viewing as Receiver looking at GOM (Matches Screenshot_20260915-151140.png)
    gomProfile: { ...DEFAULT_GOM_PROFILE },
    receiverProfile: { ...DEFAULT_LEUL_PROFILE },
    settings: { ...DEFAULT_SETTINGS },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: buildSeptember15DemoMessages('receiver'),
  },
  {
    id: 'chat-gom-customer-service',
    contactName: 'GOM Customer Service',
    username: '@gom_customer_service',
    avatarUrl: INITIAL_GOM_AVATAR,
    status: 'last seen recently',
    customStatusText: '',
    phoneNumber: '+251 91 123 4567',
    accountNumber: '1000684396671',
    bankName: 'Commercial Bank of Ethiopia',
    viewPerspective: 'receiver', // Viewing as Receiver looking at GOM (Screenshot 2)
    gomProfile: { ...DEFAULT_GOM_PROFILE },
    receiverProfile: { ...DEFAULT_LEUL_PROFILE },
    settings: { ...DEFAULT_SETTINGS },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg-date-today-gom',
        sender: 'left',
        type: 'date',
        timestamp: 'Today',
        dateLabel: 'Today',
      },
      {
        id: 'msg-sticker-1-gom',
        sender: 'right',
        author: 'receiver',
        type: 'text',
        text: '',
        reaction: '🤝 🌐 GOM',
        timestamp: '2:29 PM',
        status: 'read',
      },
      {
        id: 'msg-req-receipt-gom',
        sender: 'left',
        author: 'gom',
        type: 'text',
        text: "If you don't mind, please send me your payment receipt from the bank.",
        timestamp: '2:30 PM',
      },
      {
        id: 'msg-resp-send-gom',
        sender: 'right',
        author: 'receiver',
        type: 'text',
        text: 'Ok I will send',
        reaction: '🤝 🌐 GOM',
        timestamp: '2:31 PM',
        status: 'read',
      },
      {
        id: 'msg-album-receipt-gom',
        sender: 'right',
        author: 'receiver',
        type: 'album',
        images: [
          {
            id: 'img-sms-1',
            url: INITIAL_SMS_IMAGE,
            caption: 'SMS Deposit Alert: ETB 200,000.00 received',
            name: 'CBE_SMS_Alert.png',
          },
          {
            id: 'img-receipt-2',
            url: INITIAL_RECEIPT_IMAGE,
            caption: 'CBE Official Web Receipt: FT267561AI79',
            name: 'CBE_Receipt_FT267561AI79.png',
          },
        ],
        text: '',
        timestamp: '2:33 PM',
        status: 'read',
        transactionRef: 'FT267561AI79',
      },
      {
        id: 'msg-praise-reply-gom',
        sender: 'left',
        author: 'gom',
        type: 'text',
        text: '🎉 Nice work, Leul! 🎉',
        timestamp: '2:34 PM',
        replyQuote: {
          senderName: 'Leul',
          title: 'Album',
          thumbnailUrl: INITIAL_RECEIPT_IMAGE,
        },
      },
      {
        id: 'msg-encouragement-gom',
        sender: 'left',
        author: 'gom',
        type: 'text',
        text: 'Keep working, keep earning, and keep moving forward toward your goals. 💪💰',
        timestamp: '2:35 PM',
      },
    ],
  },
];


export class TelegramSimulatorService {
  static getChats(): TelegramChat[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading chats from localStorage, using initial sample', e);
    }
    // Initialize default samples
    this.saveChats(INITIAL_SAMPLE_CHATS);
    return INITIAL_SAMPLE_CHATS;
  }

  static saveChats(chats: TelegramChat[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch (e) {
      console.error('Error saving chats to localStorage', e);
    }
  }

  static getActiveChatId(): string {
    try {
      const saved = localStorage.getItem(ACTIVE_CHAT_KEY);
      if (saved) {
        const chats = this.getChats();
        if (chats.some(c => c.id === saved)) {
          return saved;
        }
      }
    } catch {}
    return 'chat-leul-seged';
  }

  static setActiveChatId(id: string): void {
    try {
      localStorage.setItem(ACTIVE_CHAT_KEY, id);
    } catch {}
  }

  static getChatById(id: string): TelegramChat | null {
    const chats = this.getChats();
    return chats.find(c => c.id === id) || null;
  }

  static createChat(data: Partial<TelegramChat>): TelegramChat {
    const chats = this.getChats();
    const newChat: TelegramChat = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      contactName: data.contactName?.trim() || 'New Contact',
      username: data.username?.trim() || `@user_${Math.floor(Math.random() * 10000)}`,
      avatarUrl: data.avatarUrl || '',
      status: data.status || 'last seen recently',
      customStatusText: data.customStatusText || '',
      phoneNumber: data.phoneNumber || '',
      accountNumber: data.accountNumber || '',
      bankName: data.bankName || 'Commercial Bank of Ethiopia',
      balance: data.balance || 0,
      settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: data.messages && data.messages.length > 0 ? data.messages : [
        {
          id: `msg-${Date.now()}-date`,
          sender: 'left',
          type: 'date',
          timestamp: 'Today',
          dateLabel: 'Today',
        },
        {
          id: `msg-${Date.now()}-1`,
          sender: 'left',
          type: 'text',
          text: `Hello! Nice to connect with you.`,
          timestamp: '12:00 PM',
        },
      ],
    };

    chats.unshift(newChat);
    this.saveChats(chats);
    this.setActiveChatId(newChat.id);
    return newChat;
  }

  static updateChat(id: string, updates: Partial<TelegramChat>): TelegramChat | null {
    const chats = this.getChats();
    const index = chats.findIndex(c => c.id === id);
    if (index === -1) return null;

    chats[index] = {
      ...chats[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.saveChats(chats);
    return chats[index];
  }

  static updateProfile(
    chatId: string, 
    profile: {
      contactName?: string;
      username?: string;
      avatarUrl?: string;
      status?: any;
      customStatusText?: string;
      phoneNumber?: string;
    }
  ): TelegramChat | null {
    return this.updateChat(chatId, profile);
  }

  static deleteChat(id: string): boolean {
    let chats = this.getChats();
    if (chats.length <= 1) {
      this.saveChats(INITIAL_SAMPLE_CHATS);
      this.setActiveChatId(INITIAL_SAMPLE_CHATS[0].id);
      return true;
    }
    chats = chats.filter(c => c.id !== id);
    this.saveChats(chats);
    if (this.getActiveChatId() === id) {
      this.setActiveChatId(chats[0].id);
    }
    return true;
  }

  static duplicateChat(id: string): TelegramChat | null {
    const orig = this.getChatById(id);
    if (!orig) return null;

    const cloned: TelegramChat = {
      ...JSON.parse(JSON.stringify(orig)),
      id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      contactName: `${orig.contactName} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const chats = this.getChats();
    chats.unshift(cloned);
    this.saveChats(chats);
    this.setActiveChatId(cloned.id);
    return cloned;
  }

  // --- Messages Operations ---

  static addMessage(chatId: string, message: Omit<TelegramMessage, 'id'>): TelegramMessage | null {
    const chat = this.getChatById(chatId);
    if (!chat) return null;

    const newMsg: TelegramMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };

    chat.messages.push(newMsg);
    this.updateChat(chatId, { messages: chat.messages });
    return newMsg;
  }

  static updateMessage(chatId: string, messageId: string, updates: Partial<TelegramMessage>): boolean {
    const chat = this.getChatById(chatId);
    if (!chat) return false;

    const idx = chat.messages.findIndex(m => m.id === messageId);
    if (idx === -1) return false;

    chat.messages[idx] = {
      ...chat.messages[idx],
      ...updates,
    };

    this.updateChat(chatId, { messages: chat.messages });
    return true;
  }

  /**
   * Toggle a message role between 'left' (Receiver) and 'right' (Sender)
   */
  static toggleMessageSender(chatId: string, messageId: string): boolean {
    const chat = this.getChatById(chatId);
    if (!chat) return false;

    const idx = chat.messages.findIndex(m => m.id === messageId);
    if (idx === -1) return false;

    const currentSender = chat.messages[idx].sender;
    const newSender = currentSender === 'right' ? 'left' : 'right';

    chat.messages[idx] = {
      ...chat.messages[idx],
      sender: newSender,
      status: newSender === 'right' ? (chat.messages[idx].status || 'read') : undefined,
    };

    this.updateChat(chatId, { messages: chat.messages });
    return true;
  }

  static deleteMessage(chatId: string, messageId: string): boolean {
    const chat = this.getChatById(chatId);
    if (!chat) return false;

    chat.messages = chat.messages.filter(m => m.id !== messageId);
    this.updateChat(chatId, { messages: chat.messages });
    return true;
  }

  static moveMessage(chatId: string, messageId: string, direction: 'up' | 'down'): boolean {
    const chat = this.getChatById(chatId);
    if (!chat) return false;

    const idx = chat.messages.findIndex(m => m.id === messageId);
    if (idx === -1) return false;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= chat.messages.length) return false;

    const temp = chat.messages[idx];
    chat.messages[idx] = chat.messages[targetIdx];
    chat.messages[targetIdx] = temp;

    this.updateChat(chatId, { messages: [...chat.messages] });
    return true;
  }

  static duplicateMessage(chatId: string, messageId: string): TelegramMessage | null {
    const chat = this.getChatById(chatId);
    if (!chat) return null;

    const idx = chat.messages.findIndex(m => m.id === messageId);
    if (idx === -1) return null;

    const target = chat.messages[idx];
    const clonedMsg: TelegramMessage = {
      ...JSON.parse(JSON.stringify(target)),
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };

    chat.messages.splice(idx + 1, 0, clonedMsg);
    this.updateChat(chatId, { messages: [...chat.messages] });
    return clonedMsg;
  }

  // --- BANK TRANSACTIONS & SIMULATION (Requested Feature) ---

  /**
   * Get all transactions made in the bank (CBE Birr / Telebirr / Dashen)
   */
  static getAllBankTransactions(): Transaction[] {
    try {
      const txs = LocalDb.getTransactions();
      if (Array.isArray(txs) && txs.length > 0) {
        return txs;
      }
    } catch {}

    // Fallback default transactions including the one from screenshot
    return [
      {
        id: 'tx-leul-degsew-200k',
        type: 'send',
        senderName: 'Global Online Market',
        senderAccount: '1000684396671',
        recipientName: 'Leul Degsew Alemayehu',
        recipientAccount: '1000638276450',
        recipientBank: 'Commercial Bank of Ethiopia',
        amount: 200000.00,
        fee: 3.00,
        serviceCharge: 3.00,
        description: 'Payment cycle completed',
        status: 'success',
        reference: 'FT267561AI79',
        createdAt: '2026-09-11T14:21:00Z',
      },
      {
        id: 'tx-selamawit-50k',
        type: 'send',
        senderName: 'Leykun Jemaneh Ylma',
        senderAccount: '1000419524747',
        recipientName: 'Selamawit Tekle',
        recipientAccount: '1000246810121',
        recipientBank: 'Commercial Bank of Ethiopia',
        amount: 52450.00,
        fee: 3.00,
        serviceCharge: 3.00,
        description: 'Project payment settlement',
        status: 'success',
        reference: 'FT268924BJ88',
        createdAt: '2026-09-12T11:45:00Z',
      },
      {
        id: 'tx-elisabeth-85k',
        type: 'send',
        senderName: 'Global Online Market',
        senderAccount: '1000684396671',
        recipientName: 'Elisabeth Hune Mamo',
        recipientAccount: '1000714565892',
        recipientBank: 'Commercial Bank of Ethiopia',
        amount: 85000.00,
        fee: 3.00,
        serviceCharge: 3.00,
        description: 'Online earnings reward',
        status: 'success',
        reference: 'FT269103KL42',
        createdAt: '2026-09-13T16:30:00Z',
      },
    ];
  }

  /**
   * Automatically simulate chat with receiver from a bank transaction!
   * Creates or updates the receiver's chat with the exact sequence from Screenshot_20260915-145508.png:
   * 1. Left: reaction badge
   * 2. Right: "If you don't mind, please send me your payment receipt from the bank."
   * 3. Left: "Ok I will send"
   * 4. Left: Album with SMS screenshot + CBE Web Receipt screenshot with stamp
   * 5. Right: Quoted reply: "🎉 Nice work, [Name]! 🎉"
   * 6. Right: "Keep working, keep earning, and keep moving forward toward your goals. 💪💰"
   */
  static simulateBankTransactionChat(tx: Partial<Transaction>): TelegramChat {
    const receiverFullName = tx.recipientName || 'Leul Degsew Alemayehu';
    // Derive contact display name (e.g., "Leul Seged" or first two names)
    const nameParts = receiverFullName.split(' ');
    const firstName = nameParts[0] || 'Friend';
    const displayContactName = nameParts.length >= 2 ? `${nameParts[0]} ${nameParts[1]}` : receiverFullName;

    const amount = Number(tx.amount || 200000);
    const ref = tx.reference || `FT26${Math.floor(100000 + Math.random() * 900000)}AI79`;
    const payerName = tx.senderName || 'Global Online Market';
    const payerAccount = tx.senderAccount ? `*******${tx.senderAccount.slice(-4)}` : '*******6671';
    const receiverAccount = tx.recipientAccount ? `1********${tx.recipientAccount.slice(-4)}` : '1********6450';

    const txMock: TransactionMockData = {
      payerName,
      payerAccount,
      receiverName: receiverFullName,
      receiverAccount,
      amount,
      balance: amount + 1000,
      referenceNo: ref,
      dateTimeStr: '2:21 PM',
      bankName: tx.recipientBank || 'Commercial Bank of Ethiopia (CBE)',
    };

    // Generate dynamic SMS screenshot and CBE Web Receipt with stamp
    const smsImgUrl = generateSmsScreenshotDataUrl(txMock);
    const receiptImgUrl = generateCbeWebReceiptScreenshotDataUrl(txMock);

    const chats = this.getChats();
    // Check if chat already exists for this recipient
    let existingChat = chats.find(
      c => c.contactName.toLowerCase() === displayContactName.toLowerCase() || 
           c.contactName.toLowerCase() === receiverFullName.toLowerCase() ||
           c.id === `chat-tx-${ref}`
    );

    const messages: TelegramMessage[] = [
      {
        id: `msg-${Date.now()}-date`,
        sender: 'left',
        type: 'date',
        timestamp: 'Today',
        dateLabel: 'Today',
      },
      {
        id: `msg-${Date.now()}-sticker`,
        sender: 'left',
        author: 'receiver',
        type: 'text',
        text: '',
        reaction: '🤝 🌐 GOM',
        timestamp: '2:29 PM',
      },
      {
        id: `msg-${Date.now()}-req`,
        sender: 'right',
        author: 'gom',
        type: 'text',
        text: "If you don't mind, please send me your payment receipt from the bank.",
        timestamp: '2:30 PM',
        status: 'read',
      },
      {
        id: `msg-${Date.now()}-resp`,
        sender: 'left',
        author: 'receiver',
        type: 'text',
        text: 'Ok I will send',
        reaction: '🤝 🌐 GOM',
        timestamp: '2:31 PM',
      },
      {
        id: `msg-${Date.now()}-album`,
        sender: 'left',
        author: 'receiver',
        type: 'album',
        images: [
          {
            id: `img-sms-${ref}`,
            url: smsImgUrl,
            caption: `SMS Deposit Alert: ETB ${amount.toLocaleString()} received`,
            name: `CBE_SMS_${ref}.png`,
          },
          {
            id: `img-receipt-${ref}`,
            url: receiptImgUrl,
            caption: `CBE Official Web Receipt: ${ref}`,
            name: `CBE_Receipt_${ref}.png`,
          },
        ],
        text: '',
        timestamp: '2:33 PM',
        transactionRef: ref,
      },
      {
        id: `msg-${Date.now()}-praise`,
        sender: 'right',
        author: 'gom',
        type: 'text',
        text: `🎉 Nice work, ${firstName}! 🎉`,
        timestamp: '2:34 PM',
        status: 'read',
        replyQuote: {
          senderName: displayContactName,
          title: 'Album',
          thumbnailUrl: receiptImgUrl,
        },
      },
      {
        id: `msg-${Date.now()}-encourage`,
        sender: 'right',
        author: 'gom',
        type: 'text',
        text: 'Keep working, keep earning, and keep moving forward toward your goals. 💪💰',
        timestamp: '2:35 PM',
        status: 'read',
      },
    ];

    const receiverProf: TelegramParticipantProfile = {
      contactName: displayContactName,
      username: `@${firstName.toLowerCase()}_${Math.floor(Math.random() * 900 + 100)}`,
      avatarUrl: displayContactName.toLowerCase().includes('leul') 
        ? INITIAL_LEUL_AVATAR 
        : `https://images.unsplash.com/photo-1534528741775?w=150&auto=format&fit=crop&q=80`,
      status: 'last seen recently',
      phoneNumber: '+251 91 163 8276',
      accountNumber: tx.recipientAccount || '1000638276450',
    };

    if (existingChat) {
      existingChat.messages = messages;
      existingChat.accountNumber = tx.recipientAccount || existingChat.accountNumber;
      existingChat.bankName = tx.recipientBank || existingChat.bankName;
      existingChat.balance = amount + 1000;
      existingChat.viewPerspective = 'gom';
      existingChat.gomProfile = { ...DEFAULT_GOM_PROFILE };
      existingChat.receiverProfile = receiverProf;
      this.updateChat(existingChat.id, existingChat);
      this.setActiveChatId(existingChat.id);
      return existingChat;
    }

    // Create new chat for this receiver
    const newChat: TelegramChat = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      contactName: displayContactName,
      username: receiverProf.username,
      avatarUrl: receiverProf.avatarUrl,
      status: 'last seen recently',
      customStatusText: '',
      phoneNumber: '+251 91 163 8276',
      accountNumber: tx.recipientAccount || '1000638276450',
      bankName: tx.recipientBank || 'Commercial Bank of Ethiopia',
      balance: amount + 1000,
      viewPerspective: 'gom',
      gomProfile: { ...DEFAULT_GOM_PROFILE },
      receiverProfile: receiverProf,
      settings: { ...DEFAULT_SETTINGS },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages,
    };

    chats.unshift(newChat);
    this.saveChats(chats);
    this.setActiveChatId(newChat.id);
    return newChat;
  }

  /**
   * 2-Account Simulation as requested:
   * Account 1 = GOM Customer Service (Global Online Market)
   * Account 2 = Receiver Account (e.g. Leul Seged)
   * viewPerspective = 'gom' (sees Receiver) or 'receiver' (sees GOM)
   */
  static simulateTwoAccountChat(config: {
    receiverName: string;
    receiverAccount: string;
    receiverAvatarUrl?: string;
    amount: number;
    referenceNo?: string;
    viewPerspective: 'gom' | 'receiver';
  }): TelegramChat {
    const receiverFullName = config.receiverName.includes(' ') && config.receiverName.split(' ').length >= 3 
      ? config.receiverName 
      : `${config.receiverName} Alemayehu`;
    const nameParts = config.receiverName.split(' ');
    const firstName = nameParts[0] || 'Friend';
    const displayContactName = config.receiverName;

    const amount = Number(config.amount || 200000);
    const ref = config.referenceNo || `FT26${Math.floor(100000 + Math.random() * 900000)}AI79`;
    const payerName = 'Global Online Market';
    const payerAccount = '*******6671';
    const receiverAccount = config.receiverAccount ? `1********${config.receiverAccount.slice(-4)}` : '1********6450';

    const txMock: TransactionMockData = {
      payerName,
      payerAccount,
      receiverName: receiverFullName,
      receiverAccount,
      amount,
      balance: amount + 1000,
      referenceNo: ref,
      dateTimeStr: '2:21 PM',
      bankName: 'Commercial Bank of Ethiopia (CBE)',
    };

    const smsImgUrl = generateSmsScreenshotDataUrl(txMock);
    const receiptImgUrl = generateCbeWebReceiptScreenshotDataUrl(txMock);

    const isViewReceiver = config.viewPerspective === 'receiver';

    // Position messages according to viewpoint:
    // If viewing as GOM: GOM = right, Receiver = left
    // If viewing as Receiver: Receiver = right, GOM = left
    const messages: TelegramMessage[] = [
      {
        id: `msg-${Date.now()}-date`,
        sender: 'left',
        type: 'date',
        timestamp: 'Today',
        dateLabel: 'Today',
      },
      {
        id: `msg-${Date.now()}-sticker`,
        sender: isViewReceiver ? 'right' : 'left',
        author: 'receiver',
        type: 'text',
        text: '',
        reaction: '🤝 🌐 GOM',
        timestamp: '2:29 PM',
        status: isViewReceiver ? 'read' : undefined,
      },
      {
        id: `msg-${Date.now()}-req`,
        sender: isViewReceiver ? 'left' : 'right',
        author: 'gom',
        type: 'text',
        text: "If you don't mind, please send me your payment receipt from the bank.",
        timestamp: '2:30 PM',
        status: !isViewReceiver ? 'read' : undefined,
      },
      {
        id: `msg-${Date.now()}-resp`,
        sender: isViewReceiver ? 'right' : 'left',
        author: 'receiver',
        type: 'text',
        text: 'Ok I will send',
        reaction: '🤝 🌐 GOM',
        timestamp: '2:31 PM',
        status: isViewReceiver ? 'read' : undefined,
      },
      {
        id: `msg-${Date.now()}-album`,
        sender: isViewReceiver ? 'right' : 'left',
        author: 'receiver',
        type: 'album',
        images: [
          {
            id: `img-sms-${ref}`,
            url: smsImgUrl,
            caption: `SMS Deposit Alert: ETB ${amount.toLocaleString()} received`,
            name: `CBE_SMS_${ref}.png`,
          },
          {
            id: `img-receipt-${ref}`,
            url: receiptImgUrl,
            caption: `CBE Official Web Receipt: ${ref}`,
            name: `CBE_Receipt_${ref}.png`,
          },
        ],
        text: '',
        timestamp: '2:33 PM',
        status: isViewReceiver ? 'read' : undefined,
        transactionRef: ref,
      },
      {
        id: `msg-${Date.now()}-praise`,
        sender: isViewReceiver ? 'left' : 'right',
        author: 'gom',
        type: 'text',
        text: `🎉 Nice work, ${firstName}! 🎉`,
        timestamp: '2:34 PM',
        status: !isViewReceiver ? 'read' : undefined,
        replyQuote: {
          senderName: isViewReceiver ? firstName : displayContactName,
          title: 'Album',
          thumbnailUrl: receiptImgUrl,
        },
      },
      {
        id: `msg-${Date.now()}-encourage`,
        sender: isViewReceiver ? 'left' : 'right',
        author: 'gom',
        type: 'text',
        text: 'Keep working, keep earning, and keep moving forward toward your goals. 💪💰',
        timestamp: '2:35 PM',
        status: !isViewReceiver ? 'read' : undefined,
      },
    ];

    const receiverProf: TelegramParticipantProfile = {
      contactName: displayContactName,
      username: `@${firstName.toLowerCase()}_${Math.floor(Math.random() * 900 + 100)}`,
      avatarUrl: config.receiverAvatarUrl || (displayContactName.toLowerCase().includes('leul') 
        ? INITIAL_LEUL_AVATAR 
        : `https://images.unsplash.com/photo-1534528741775?w=150&auto=format&fit=crop&q=80`),
      status: 'last seen recently',
      phoneNumber: '+251 91 163 8276',
      accountNumber: config.receiverAccount,
    };

    const chats = this.getChats();
    const chatId = `chat-sim-${Date.now()}`;
    const newChat: TelegramChat = {
      id: chatId,
      contactName: isViewReceiver ? 'GOM Customer Service' : displayContactName,
      username: isViewReceiver ? '@gom_customer_service' : receiverProf.username,
      avatarUrl: isViewReceiver ? INITIAL_GOM_AVATAR : receiverProf.avatarUrl,
      status: 'last seen recently',
      customStatusText: '',
      phoneNumber: isViewReceiver ? '+251 91 123 4567' : receiverProf.phoneNumber,
      accountNumber: config.receiverAccount,
      bankName: 'Commercial Bank of Ethiopia',
      balance: amount + 1000,
      viewPerspective: config.viewPerspective,
      gomProfile: { ...DEFAULT_GOM_PROFILE },
      receiverProfile: receiverProf,
      settings: { ...DEFAULT_SETTINGS },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages,
    };

    chats.unshift(newChat);
    this.saveChats(chats);
    this.setActiveChatId(newChat.id);
    return newChat;
  }

  /**
   * Switch perspective of an existing chat:
   * 'gom' => seeing Receiver (e.g. Leul Seged) in header, GOM messages on right
   * 'receiver' => seeing GOM in header, Receiver messages on right
   */
  static toggleChatPerspective(chatId: string, perspective: 'gom' | 'receiver'): boolean {
    const chat = this.getChatById(chatId);
    if (!chat) return false;

    const isViewReceiver = perspective === 'receiver';

    // Update messages positions according to their author:
    chat.messages = chat.messages.map(msg => {
      if (msg.type === 'date' || msg.type === 'system') return msg;
      
      const author = msg.author || (msg.sender === 'right' ? 'gom' : 'receiver');
      const shouldBeRight = isViewReceiver ? (author === 'receiver') : (author === 'gom');

      return {
        ...msg,
        author,
        sender: shouldBeRight ? 'right' : 'left',
        status: shouldBeRight ? (msg.status || 'read') : undefined,
      };
    });

    chat.viewPerspective = perspective;

    // Update header displayed profile
    if (isViewReceiver) {
      chat.contactName = chat.gomProfile?.contactName || 'GOM Customer Service';
      chat.avatarUrl = chat.gomProfile?.avatarUrl || INITIAL_GOM_AVATAR;
      chat.username = chat.gomProfile?.username || '@gom_customer_service';
    } else {
      chat.contactName = chat.receiverProfile?.contactName || chat.contactName;
      chat.avatarUrl = chat.receiverProfile?.avatarUrl || chat.avatarUrl || INITIAL_LEUL_AVATAR;
      chat.username = chat.receiverProfile?.username || chat.username;
    }

    this.updateChat(chatId, chat);
    return true;
  }

  // --- Export & Import ---

  static exportChatToJson(chat: TelegramChat): string {
    const payload = {
      app: 'Telegram Chat Simulator',
      notice: 'SIMULATED CHAT - FOR ENTERTAINMENT AND MOCKUP PURPOSES ONLY',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      chat,
    };
    return JSON.stringify(payload, null, 2);
  }

  static importChatFromJson(jsonStr: string): { success: boolean; error?: string; chat?: TelegramChat } {
    try {
      const data = JSON.parse(jsonStr);
      const chatData: TelegramChat = data.chat || data;

      if (!chatData.contactName || !Array.isArray(chatData.messages)) {
        return { success: false, error: 'Invalid file format. Missing contactName or messages array.' };
      }

      const importedChat: TelegramChat = {
        ...chatData,
        id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        contactName: `${chatData.contactName} (Imported)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const chats = this.getChats();
      chats.unshift(importedChat);
      this.saveChats(chats);
      this.setActiveChatId(importedChat.id);

      return { success: true, chat: importedChat };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to parse JSON file' };
    }
  }

  /**
   * Load the full September 15 GOM Customer ↔ Customer Service demo chat (Orders & Withdrawal)
   */
  static loadFullDemoChat(chatId: string): boolean {
    const chat = this.getChatById(chatId);
    if (!chat) return false;
    const perspective = chat.viewPerspective || 'receiver';
    chat.messages = buildSeptember15DemoMessages(perspective);
    this.updateChat(chatId, chat);
    return true;
  }

  static resetToDefault(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.saveChats(INITIAL_SAMPLE_CHATS);
    this.setActiveChatId(INITIAL_SAMPLE_CHATS[0].id);
  }
}


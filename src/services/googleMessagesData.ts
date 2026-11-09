import { MessageThread } from '../types/messages';
import { SmsService } from './smsService';

const STORAGE_KEY = 'google_messages_custom_threads';

export const DEFAULT_THREADS: MessageThread[] = [
  {
    id: 'CBE',
    sender: 'CBE',
    avatarColor: '#545458',
    tag: 'Unknown Sender',
    snippet: 'Dear Leykun Jemaneh Yilma You have successfully transferred ETB 5,000....',
    timestamp: new Date().toISOString(),
    timeLabel: '2:38 PM',
    unreadCount: 1,
    isCbe: true,
  },
  {
    id: '127',
    sender: '127',
    avatarColor: '#545458',
    tag: 'Unknown Sender',
    snippet: 'Dear Leykun You have transferred ETB 2,000.00 t...',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    timeLabel: '15 min',
    unreadCount: 1,
    messages: [
      {
        id: 'msg-127-1',
        text: 'Dear Leykun You have transferred ETB 2,000.00 to account 1********3892. Your current balance is ETB 3,450.00. Thank you for using our service.',
        timestamp: '2:23 PM',
        sender: '127'
      }
    ]
  },
  {
    id: 'boa',
    sender: 'BOA',
    avatarColor: '#545458',
    tag: 'Unknown Sender',
    snippet: 'Dear Leykun, your account 5*****96 was debited with ETB 1,812.00. Avail...',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    timeLabel: '45 min',
    unreadCount: 1,
    messages: [
      {
        id: 'msg-boa-1',
        text: 'Dear Leykun, your account 5*****96 was debited with ETB 1,812.00. Available balance ETB 14,230.50. Bank of Abyssinia.',
        timestamp: '1:53 PM',
        sender: 'BOA'
      }
    ]
  },
  {
    id: '830',
    sender: '830',
    avatarColor: '#545458',
    tag: 'Unknown Sender',
    snippet: 'በቴሌብር ስላደረጉት የገንዘብ ዝውውር እናመሰግናለን:: ወደ *830*1# በመደወ...',
    timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    timeLabel: '1:08 PM',
    unreadCount: 1,
    messages: [
      {
        id: 'msg-830-1',
        text: 'በቴሌብር ስላደረጉት የገንዘብ ዝውውር እናመሰግናለን:: ወደ *830*1# በመደወል አገልግሎትዎን ያግኙ። telebirr!',
        timestamp: '1:08 PM',
        sender: '830'
      }
    ]
  },
  {
    id: '251958190691',
    sender: '+251 95 819 0691',
    avatarColor: '#545458',
    tag: 'Unknown Sender',
    snippet: 'በአቢሲኒያ ቤት የእረፍት ቀኖችን ከ 400% ጉርሻ ጋር ያጣጥሙ !...',
    timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    timeLabel: '11:38 AM',
    unreadCount: 1,
    messages: [
      {
        id: 'msg-25195-1',
        text: 'በአቢሲኒያ ቤት የእረፍት ቀኖችን ከ 400% ጉርሻ ጋር ያጣጥሙ ! አሁኑኑ ይመዝገቡና ልዩ ሽልማቶችን ያሸንፉ!',
        timestamp: '11:38 AM',
        sender: '+251 95 819 0691'
      }
    ]
  },
  {
    id: 'dashenbank',
    sender: 'DashenBank',
    avatarColor: '#545458',
    snippet: "Dear, LEYKUN Your Account '5502******011' has been credited w...",
    timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    timeLabel: '11:04 AM',
    unreadCount: 1,
    messages: [
      {
        id: 'msg-dash-1',
        text: "Dear, LEYKUN Your Account '5502******011' has been credited with ETB 5,000.00. Current Balance: ETB 18,720.00. Dashen Bank.",
        timestamp: '11:04 AM',
        sender: 'DashenBank'
      }
    ]
  },
  {
    id: '251994',
    sender: '251994',
    avatarColor: '#545458',
    snippet: 'Dear Customer, your remaining...',
    timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    timeLabel: 'Friday',
    unreadCount: 0,
    messages: [
      {
        id: 'msg-251994-1',
        text: 'Dear Customer, your remaining prepaid account balance is ETB 115.40. Thank you for choosing our service.',
        timestamp: 'Friday 12:56 PM',
        sender: '251994'
      }
    ]
  },
  {
    id: 'safaricom',
    sender: 'Safaricom',
    avatarColor: '#545458',
    snippet: 'ዕለታዊ የተመረጡ መረጃዎች እንዳያመልጦ! አስተማማኝ እና እውነተኛ የቴክኖሎጂ ዜናዎችን...',
    timestamp: new Date().toISOString(),
    timeLabel: '9:30 AM',
    unreadCount: 1,
    messages: [
      {
        id: 'msg-saf-1',
        text: 'አስደሳች ዜና!\nበአንድ ጥቅል ውስጥ የተለያዩ የቴሌ ቁጥሮች ይደውሉ!\nወደ *777# ይደውሉና "ቴሌ ደቂቃ"ን ይምረጡ::',
        timestamp: 'Yesterday 10:40 AM',
        sender: 'Safaricom'
      },
      {
        id: 'msg-saf-2',
        text: '<#> 4463 is your verification code. NEVER share your M-PESA Safaricom verification code. undefined',
        timestamp: 'Yesterday 10:40 AM',
        sender: 'Safaricom'
      },
      {
        id: 'msg-saf-3',
        text: 'ዕለታዊ የተመረጡ መረጃዎች እንዳያመልጦ! አስተማማኝ እና እውነተኛ የቴክኖሎጂ ዜናዎችን ለማግኘት ዛሬውኑ ይቀላቀሉ::አገልግሎት ለማግኘት "A" ብለው 30000 ላይ በአጭር መልዕክት ይላኩ ወደ *799# ይደውሉ!',
        timestamp: 'Today 9:30 AM',
        sender: 'Safaricom'
      },
      {
        id: 'msg-saf-4',
        text: 'ዕለታዊ የተመረጡ መረጃዎች እንዳያመልጦ! አስተማማኝ እና እውነተኛ የቴክኖሎጂ ዜናዎችን ለማግኘት ዛሬውኑ ይቀላቀሉ::አገልግሎት ለማግኘት "A" ብለው 30000 ላይ በአጭር መልዕክት ይላኩ ወደ *799# ይደውሉ!',
        timestamp: 'Today 9:30 AM',
        sender: 'Safaricom'
      }
    ]
  },
  {
    id: 'mpesa-info',
    sender: 'MPESA Info',
    avatarColor: '#545458',
    tag: 'Unknown Sender',
    snippet: 'ውድ Yeshiwalem በብሔራዊ ባንክ መመሪያ መሰረት እባክዎ የሂሳብ ቁጥርዎን ከፋይዳ ጋር...',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    timeLabel: '9:30 AM',
    unreadCount: 1,
    messages: [
      {
        id: 'msg-mpesa-1',
        text: 'ውድ Yeshiwalem በብሔራዊ ባንክ መመሪያ መሰረት እባክዎ የሂሳብ ቁጥርዎን ከፋይዳ ጋር ያገናኙ። ለተጨማሪ መረጃ ወደ 733 ይደውሉ። M-PESA Safaricom!',
        timestamp: '9:30 AM',
        sender: 'MPESA Info'
      }
    ]
  },
  {
    id: '7822235877',
    sender: '+1 (782) 223-5877',
    avatarColor: '#545458',
    snippet: 'Send this message without editing. (ohUQzHIXpKaA)',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    timeLabel: 'Yesterday',
    unreadCount: 0,
    messages: [
      {
        id: 'msg-782-1',
        text: 'Send this message without editing. (ohUQzHIXpKaA)',
        timestamp: 'Yesterday',
        sender: '+1 (782) 223-5877'
      }
    ]
  },
  {
    id: '7822235875',
    sender: '+1 (782) 223-5875',
    avatarColor: '#545458',
    snippet: 'Send this message without editing. (XdTg9Kn1Ijm1)',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    timeLabel: 'Yesterday',
    unreadCount: 0,
    messages: [
      {
        id: 'msg-782-2',
        text: 'Send this message without editing. (XdTg9Kn1Ijm1)',
        timestamp: 'Yesterday',
        sender: '+1 (782) 223-5875'
      }
    ]
  },
  {
    id: 'boa-promo',
    sender: 'BOA',
    avatarColor: '#ef4444',
    snippet: 'ዓለም አቀፍ ግብይቶችን በቀላሉ ያድርጉ!...',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    timeLabel: 'Yesterday',
    unreadCount: 0,
    messages: [
      {
        id: 'msg-boa-promo-1',
        text: 'ዓለም አቀፍ ግብይቶችን በቀላሉ ያድርጉ! የባንክ ኦፍ አቢሲንያ ዲጂታል የክፍያ አማራጮችን አሁኑኑ ይጠቀሙ። ለተጨማሪ መረጃ 8397 ይደውሉ።',
        timestamp: 'Yesterday',
        sender: 'BOA'
      }
    ]
  },
  {
    id: 'bunna-bank',
    sender: 'Bunna Bank',
    avatarColor: '#ec4899',
    snippet: 'ውድ ደንበኛችን...',
    timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    timeLabel: 'Aug 26',
    unreadCount: 0,
    messages: [
      {
        id: 'msg-bunna-1',
        text: 'ውድ ደንበኛችን የቡና ባንክ ሞባይል ባንኪንግ አገልግሎትን ስለመረጡ እናመሰግናለን። የሂሳብዎን እንቅስቃሴ በደህንነት ይከታተሉ።',
        timestamp: 'Aug 26',
        sender: 'Bunna Bank'
      }
    ]
  },
  {
    id: 'fraud-alert',
    sender: 'Fraud Alert',
    avatarColor: '#0284c7',
    snippet: 'Be aware of fraudulent messages asking for your PIN...',
    timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    timeLabel: 'Thu',
    unreadCount: 0,
    messages: [
      {
        id: 'msg-fraud-1',
        text: 'Security Warning: CBE or any financial institution will never ask for your PIN, OTP or mobile banking password. Do not share your codes with anyone.',
        timestamp: 'Thu',
        sender: 'Fraud Alert'
      }
    ]
  }
];

export class GoogleMessagesService {
  /**
   * Loads custom threads and combines with defaults
   */
  private static getStoredThreads(): MessageThread[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seen = new Set<string>();
          // Ensure all threads have required string fields and unique IDs
          return parsed.map((t, idx) => {
            let threadId = t?.id || `thread-${idx}`;
            if (seen.has(threadId)) {
              threadId = `${threadId}-${idx}`;
            }
            seen.add(threadId);
            return {
              id: threadId,
              sender: t?.sender || 'Unknown',
              avatarColor: t?.avatarColor || '#545458',
              snippet: t?.snippet || '',
              timestamp: t?.timestamp || new Date().toISOString(),
              timeLabel: t?.timeLabel || '9:30 AM',
              unreadCount: typeof t?.unreadCount === 'number' ? t.unreadCount : 0,
              isCbe: Boolean(t?.isCbe || t?.id === 'CBE' || t?.sender === 'CBE'),
              tag: t?.tag,
              phoneNumber: t?.phoneNumber,
              messages: Array.isArray(t?.messages) ? t.messages : [],
            };
          });
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_THREADS;
  }

  private static saveStoredThreads(threads: MessageThread[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    } catch {
      // ignore
    }
  }

  /**
   * Retrieves all threads, dynamically synchronizing the CBE thread
   * with real banking transactions from SmsService.
   */
  static getThreads(): MessageThread[] {
    try {
      const activeAccNum = SmsService.getActiveAccountNumber();
      const cbeMessages = SmsService.getSmsMessages(activeAccNum) || [];
      const sortedCbe = [...cbeMessages].sort((a, b) => {
        const timeA = new Date(a?.timestamp || 0).getTime();
        const timeB = new Date(b?.timestamp || 0).getTime();
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });
      const latestCbeMsg = sortedCbe[0];
      const unreadCbeCount = cbeMessages.filter(m => m && !m.read).length;

      const threads = this.getStoredThreads();

      return threads.map(thread => {
        if (!thread) return DEFAULT_THREADS[0];

        if (thread.isCbe || thread.id === 'CBE' || thread.sender === 'CBE') {
          let snippet = thread.snippet || 'Dear Customer...';
          let timeLabel = thread.timeLabel || 'Now';

          if (latestCbeMsg && typeof latestCbeMsg.message === 'string') {
            snippet = latestCbeMsg.message.replace(/\n+/g, ' ');
            if (snippet.length > 55) {
              snippet = snippet.slice(0, 52) + '...';
            }

            const msgDate = new Date(latestCbeMsg.timestamp);
            if (!isNaN(msgDate.getTime())) {
              const now = new Date();
              const diffMs = Math.max(0, now.getTime() - msgDate.getTime());
              const diffMins = Math.floor(diffMs / (1000 * 60));

              if (diffMins < 1) {
                timeLabel = 'Now';
              } else if (diffMins < 60) {
                timeLabel = `${diffMins} min`;
              } else {
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                if (diffDays === 0) {
                  timeLabel = msgDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                } else if (diffDays === 1) {
                  timeLabel = 'Yesterday';
                } else {
                  timeLabel = msgDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }
              }
            } else {
              timeLabel = 'Now';
            }
          }

          return {
            ...thread,
            snippet,
            timeLabel,
            unreadCount: unreadCbeCount,
          };
        }

        return thread;
      });
    } catch (err) {
      console.error('[GoogleMessagesService] Error in getThreads:', err);
      return DEFAULT_THREADS;
    }
  }

  /**
   * Mark a thread as read
   */
  static markThreadRead(threadId: string) {
    if (threadId === 'CBE') {
      SmsService.markAllAsRead(SmsService.getActiveAccountNumber());
    } else {
      const threads = this.getStoredThreads();
      const updated = threads.map(t => {
        if (t.id === threadId) {
          return { ...t, unreadCount: 0 };
        }
        return t;
      });
      this.saveStoredThreads(updated);
    }
  }

  /**
   * Add a message to a thread
   */
  static sendMessage(threadId: string, text: string): MessageThread | null {
    const threads = this.getStoredThreads();
    const target = threads.find(t => t.id === threadId);
    if (!target) return null;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const newMsg = {
      id: `msg-${Date.now()}`,
      text,
      timestamp: timeStr,
      sender: 'Me',
      isSender: true
    };

    const updatedMessages = [...(target.messages || []), newMsg];
    const updatedThread: MessageThread = {
      ...target,
      messages: updatedMessages,
      snippet: text.length > 55 ? text.slice(0, 52) + '...' : text,
      timestamp: now.toISOString(),
      timeLabel: 'Now',
    };

    const newThreads = [
      updatedThread,
      ...threads.filter(t => t.id !== threadId)
    ];

    this.saveStoredThreads(newThreads);
    return updatedThread;
  }

  /**
   * Create a new conversation thread
   */
  static startNewThread(recipient: string, initialMessage: string): MessageThread {
    const threads = this.getStoredThreads();
    const id = `thread-${Date.now()}`;
    const colors = ['#0ea5e9', '#9333ea', '#eab308', '#f97316', '#16a34a', '#ef4444', '#ec4899'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const newThread: MessageThread = {
      id,
      sender: recipient,
      avatarColor: randomColor,
      snippet: initialMessage.length > 55 ? initialMessage.slice(0, 52) + '...' : initialMessage,
      timestamp: now.toISOString(),
      timeLabel: 'Now',
      unreadCount: 0,
      messages: [
        {
          id: `msg-${Date.now()}`,
          text: initialMessage,
          timestamp: timeStr,
          sender: 'Me',
          isSender: true
        }
      ]
    };

    this.saveStoredThreads([newThread, ...threads]);
    return newThread;
  }
}

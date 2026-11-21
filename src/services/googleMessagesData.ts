import { MessageThread } from '../types/messages';
import { SmsAccount } from '../types/sms';
import { SmsService } from './smsService';
import { LocalDb } from '../lib/mockData';

const STORAGE_KEY = 'google_messages_custom_threads';

export interface GoogleAccountProfile {
  accountNumber: string;
  fullName: string;
  firstName: string;
  upperFirstName: string;
  initial: string;
  email: string;
  avatarColor: string;
  ringColor: string;
}

const GOOGLE_AVATAR_PALETTE: Array<{ bg: string; ring: string }> = [
  { bg: '#06b6d4', ring: '#22d3ee' }, // Cyan (default)
  { bg: '#1a73e8', ring: '#60a5fa' }, // Google Blue
  { bg: '#9333ea', ring: '#c084fc' }, // Purple
  { bg: '#059669', ring: '#34d399' }, // Emerald
  { bg: '#ea580c', ring: '#fb923c' }, // Orange
  { bg: '#e11d48', ring: '#fb7185' }, // Rose
  { bg: '#4f46e5', ring: '#818cf8' }, // Indigo
  { bg: '#0d9488', ring: '#2dd4bf' }, // Teal
];

function cleanDisplayAccountName(raw?: string): string {
  const cleaned = (raw || '')
    .replace(/\s*\(Admin\)/gi, '')
    .replace(/\s*\(\d{4,}\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'Leykun Jemaneh Ylma';
}

function generateGmailFromName(fullName: string, accountNumber?: string): string {
  const words = fullName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0]}.${words[1]}@gmail.com`;
  }
  if (words.length === 1) {
    const suffix = (accountNumber || '').replace(/\D/g, '').slice(-2) || '1';
    return `${words[0]}${suffix}@gmail.com`;
  }
  return 'user.account@gmail.com';
}

function pickGoogleAvatarPalette(name: string, accountNumber: string): { bg: string; ring: string } {
  const cleanNum = (accountNumber || '').replace(/\D/g, '');
  if (cleanNum === '1000419524747' || name.toLowerCase().startsWith('leykun')) {
    return GOOGLE_AVATAR_PALETTE[0];
  }
  let hash = 0;
  const seed = `${name.toLowerCase()}:${cleanNum}`;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return GOOGLE_AVATAR_PALETTE[(hash % (GOOGLE_AVATAR_PALETTE.length - 1)) + 1];
}

function makeSnippet(text: string): string {
  const singleLine = (text || '').replace(/\n+/g, ' ').trim();
  return singleLine.length > 55 ? singleLine.slice(0, 52) + '...' : singleLine;
}

function buildPreSimulatedMessageText(msgId: string, profile: GoogleAccountProfile): string | null {
  switch (msgId) {
    case 'msg-127-1':
      return `Dear ${profile.firstName} You have transferred ETB 2,000.00 to account 1********3892. Your current balance is ETB 3,450.00. Thank you for using our service.`;
    case 'msg-boa-1':
      return `Dear ${profile.firstName}, your account 5*****96 was debited with ETB 1,812.00. Available balance ETB 14,230.50. Bank of Abyssinia.`;
    case 'msg-830-1':
      return `ውድ ${profile.firstName}፣ በቴሌብር ስላደረጉት የገንዘብ ዝውውር እናመሰግናለን:: ወደ *830*1# በመደወል አገልግሎትዎን ያግኙ። telebirr!`;
    case 'msg-25195-1':
      return `ውድ ${profile.firstName}፣ በአቢሲኒያ ቤት የእረፍት ቀኖችን ከ 400% ጉርሻ ጋር ያጣጥሙ ! አሁኑኑ ይመዝገቡና ልዩ ሽልማቶችን ያሸንፉ!`;
    case 'msg-dash-1':
      return `Dear, ${profile.upperFirstName} Your Account '5502******011' has been credited with ETB 5,000.00. Current Balance: ETB 18,720.00. Dashen Bank.`;
    case 'msg-251994-1':
      return `Dear ${profile.firstName}, your remaining prepaid account balance is ETB 115.40. Thank you for choosing our service.`;
    case 'msg-saf-1':
      return `ውድ ${profile.firstName}፣ አስደሳች ዜና!\nበአንድ ጥቅል ውስጥ የተለያዩ የቴሌ ቁጥሮች ይደውሉ!\nወደ *777# ይደውሉና "ቴሌ ደቂቃ"ን ይምረጡ::`;
    case 'msg-saf-2':
      return `Dear ${profile.firstName}, <#> 4463 is your verification code. NEVER share your M-PESA Safaricom verification code.`;
    case 'msg-saf-3':
    case 'msg-saf-4':
      return `ውድ ${profile.firstName}፣ ዕለታዊ የተመረጡ መረጃዎች እንዳያመልጦ! አስተማማኝ እና እውነተኛ የቴክኖሎጂ ዜናዎችን ለማግኘት ዛሬውኑ ይቀላቀሉ::አገልግሎት ለማግኘት "A" ብለው 30000 ላይ በአጭር መልዕክት ይላኩ ወደ *799# ይደውሉ!`;
    case 'msg-mpesa-1':
      return `ውድ ${profile.firstName} በብሔራዊ ባንክ መመሪያ መሰረት እባክዎ የሂሳብ ቁጥርዎን ከፋይዳ ጋር ያገናኙ። ለተጨማሪ መረጃ ወደ 733 ይደውሉ። M-PESA Safaricom!`;
    case 'msg-boa-promo-1':
      return `ውድ ${profile.firstName}፣ ዓለም አቀፍ ግብይቶችን በቀላሉ ያድርጉ! የባንክ ኦፍ አቢሲንያ ዲጂታል የክፍያ አማራጮችን አሁኑኑ ይጠቀሙ። ለተጨማሪ መረጃ 8397 ይደውሉ።`;
    case 'msg-bunna-1':
      return `ውድ ${profile.firstName}፣ የቡና ባንክ ሞባይል ባንኪንግ አገልግሎትን ስለመረጡ እናመሰግናለን። የሂሳብዎን እንቅስቃሴ በደህንነት ይከታተሉ።`;
    case 'msg-fraud-1':
      return `Dear ${profile.fullName}, be aware of fraudulent messages asking for your PIN or OTP. Commercial Bank of Ethiopia will never ask for your password.`;
    default:
      return null;
  }
}

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
   * Builds a Google Account profile (display name, Gmail address, avatar initial & color)
   * linked to a bank/SMS account so switching accounts updates the Google Messages identity too.
   */
  static buildGoogleAccountProfile(account?: Partial<SmsAccount> | null): GoogleAccountProfile {
    const cleanAccNum = (account?.accountNumber || SmsService.getActiveAccountNumber() || '1000419524747').replace(/\D/g, '');
    let matchedUserEmail: string | undefined;
    let matchedUserName: string | undefined;

    try {
      const users = LocalDb.getUsers();
      const matchedUser = users.find(
        (u) => (u?.accountNumber || '').replace(/\D/g, '') === cleanAccNum
      );
      if (matchedUser) {
        if (matchedUser.email) matchedUserEmail = matchedUser.email;
        if (matchedUser.name) matchedUserName = matchedUser.name;
      }
    } catch {
      // Ignore storage access errors
    }

    const fullName = cleanDisplayAccountName(account?.accountName || matchedUserName);
    const firstName = fullName.split(/\s+/)[0] || fullName;
    const upperFirstName = firstName.toUpperCase();
    const initial = (firstName.charAt(0) || 'U').toUpperCase();
    const email = matchedUserEmail || generateGmailFromName(fullName, cleanAccNum);
    const palette = pickGoogleAvatarPalette(fullName, cleanAccNum);

    return {
      accountNumber: cleanAccNum || '1000419524747',
      fullName,
      firstName,
      upperFirstName,
      initial,
      email,
      avatarColor: palette.bg,
      ringColor: palette.ring,
    };
  }

  /**
   * Resolves the currently active SMS account as a Google Account profile.
   */
  static getActiveGoogleAccountProfile(accountNumOverride?: string): GoogleAccountProfile {
    const targetNum = (accountNumOverride || SmsService.getActiveAccountNumber() || '1000419524747').replace(/\D/g, '');
    const accounts = SmsService.getAccounts() || [];
    const matchedAccount = accounts.find(
      (a) => a && (a.accountNumber || '').replace(/\D/g, '') === targetNum
    );
    return this.buildGoogleAccountProfile(
      matchedAccount || { accountNumber: targetNum }
    );
  }

  /**
   * Personalizes any built-in pre-simulated SMS thread so every simulated bank/telecom
   * message and inbox snippet reflects the currently active account's name.
   */
  private static personalizeThread(
    thread: MessageThread,
    profile: GoogleAccountProfile
  ): MessageThread {
    if (!thread) return thread;

    const existingMessages = Array.isArray(thread.messages) ? thread.messages : [];
    let hasPersonalizedMsg = false;

    const updatedMessages = existingMessages.map((msg) => {
      if (!msg) return msg;
      const dynamicText = buildPreSimulatedMessageText(msg.id, profile);
      if (dynamicText) {
        hasPersonalizedMsg = true;
        return {
          ...msg,
          text: dynamicText,
        };
      }
      return msg;
    });

    if (!hasPersonalizedMsg) {
      return thread;
    }

    const lastMsg = updatedMessages[updatedMessages.length - 1];
    const updatedSnippet = lastMsg?.text ? makeSnippet(lastMsg.text) : thread.snippet;

    return {
      ...thread,
      snippet: updatedSnippet,
      messages: updatedMessages,
    };
  }

  /**
   * Retrieves all threads, dynamically synchronizing the CBE thread
   * with real banking transactions from SmsService and personalizing all
   * pre-simulated SMS threads with the active account's name.
   */
  static getThreads(accountNumOverride?: string): MessageThread[] {
    try {
      const activeAccNum = accountNumOverride || SmsService.getActiveAccountNumber();
      const profile = this.getActiveGoogleAccountProfile(activeAccNum);
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
          let snippet = makeSnippet(`Dear ${profile.fullName} You have successfully transferred ETB 5,000.00.`);
          let timeLabel = thread.timeLabel || 'Now';

          if (latestCbeMsg && typeof latestCbeMsg.message === 'string') {
            snippet = makeSnippet(latestCbeMsg.message);

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

        return this.personalizeThread(thread, profile);
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
    const profile = this.getActiveGoogleAccountProfile();
    return this.personalizeThread(updatedThread, profile);
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

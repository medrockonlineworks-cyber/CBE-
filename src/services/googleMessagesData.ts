import { MessageThread } from '../types/messages';
import { SmsService } from './smsService';

export const INITIAL_THREADS: MessageThread[] = [
  {
    id: '131',
    sender: '131',
    avatarColor: '#0ea5e9',
    snippet: 'Dear customer, Your airtime top-up has given you 2 Silver c...',
    timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    timeLabel: '22 min',
    unreadCount: 2,
    messages: [
      {
        id: 'msg-131-1',
        text: 'Dear customer, your airtime balance has been topped up with ETB 50.00. Thank you for using Ethio telecom.',
        timestamp: '12:40 PM',
        sender: '131'
      },
      {
        id: 'msg-131-2',
        text: 'Dear customer, Your airtime top-up has given you 2 Silver coins. Dial *131# to redeem your rewards and win bonus packages and exciting gifts!',
        timestamp: '1:06 PM',
        sender: '131'
      }
    ]
  },
  {
    id: 'ethio-tel',
    sender: 'ethio tel',
    avatarColor: '#9333ea',
    snippet: 'አድማስ ዲጂታል ሎተሪ በ51ኛው ዙር የሽልማት መጠኑን ወደ 5 ሚሊየን ብ...',
    timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    timeLabel: '22 min',
    unreadCount: 4,
    messages: [
      {
        id: 'msg-ethio-1',
        text: 'ውድ ደንበኛችን የሳምንታዊ የኢንተርኔት ጥቅልዎን በተሳካ ሁኔታ ገዝተዋል። ቀሪ ሂሳብዎን ለመመልከት *999# ይደውሉ።',
        timestamp: '11:15 AM',
        sender: 'ethio tel'
      },
      {
        id: 'msg-ethio-2',
        text: 'አድማስ ዲጂታል ሎተሪ በ51ኛው ዙር የሽልማት መጠኑን ወደ 5 ሚሊየን ብር አሳድጓል! አሁኑኑ ወደ 605 ፊደል \'A\' ልከው ይሳተፉ። ኢትዮ ቴሌኮም!',
        timestamp: '1:06 PM',
        sender: 'ethio tel'
      }
    ]
  },
  {
    id: 'CBE',
    sender: 'CBE',
    avatarColor: '#8e24aa',
    snippet: 'Dear Leykun Jemaneh Ylma A debit transaction of ETB 20.0. has occurred...',
    timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    timeLabel: '32 min',
    unreadCount: 1,
    isCbe: true,
  },
  {
    id: '251994',
    sender: '251994',
    avatarColor: '#eab308',
    snippet: 'Dear Customer, Your prepaid account has bee...',
    timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    timeLabel: '32 min',
    unreadCount: 1,
    messages: [
      {
        id: 'msg-251994-1',
        text: 'Dear Customer, Your prepaid account has been recharged with ETB 100.00 on 2026-09-04 12:56:02. New balance: ETB 115.40. Thank you for choosing our service.',
        timestamp: '12:56 PM',
        sender: '251994'
      }
    ]
  },
  {
    id: 'safaricom',
    sender: 'Safaricom',
    avatarColor: '#f97316',
    snippet: 'አስደሳች ዜና!...',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    timeLabel: '8:25 AM',
    unreadCount: 0,
    messages: [
      {
        id: 'msg-saf-1',
        text: 'አስደሳች ዜና! በሳፋሪኮም ኔትወርክ ፈጣን የ4G ኢንተርኔት እና ያልተገደበ ጥሪ ይጠቀሙ። ለበለጠ መረጃ *700# ይደውሉ።',
        timestamp: '8:25 AM',
        sender: 'Safaricom'
      }
    ]
  },
  {
    id: 'mpesa-info',
    sender: 'MPESA Info',
    avatarColor: '#16a34a',
    snippet: 'ውድ Yeshiwalem በብሔራዊ ባንክ መመሪያ መሰረት እባክዎ የሂ...',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    timeLabel: '7:38 AM',
    unreadCount: 6,
    messages: [
      {
        id: 'msg-mpesa-1',
        text: 'ውድ Yeshiwalem በብሔራዊ ባንክ መመሪያ መሰረት እባክዎ የሂሳብ መረጃዎን በአቅራቢያዎ በሚገኝ የM-PESA ወኪል ወይም ቅርንጫፍ በኩል ያረጋግጡ። ሳፋሪኮም M-PESA!',
        timestamp: '7:38 AM',
        sender: 'MPESA Info'
      }
    ]
  },
  {
    id: 'boa',
    sender: 'BOA',
    avatarColor: '#ef4444',
    snippet: 'ዓለም አቀፍ ግብይቶችን በቀላሉ ያድርጉ!...',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    timeLabel: 'Yesterday',
    unreadCount: 0,
    messages: [
      {
        id: 'msg-boa-1',
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
   * Retrieves all threads, dynamically synchronizing the CBE thread
   * with real banking transactions from SmsService.
   */
  static getThreads(): MessageThread[] {
    const activeAccNum = SmsService.getActiveAccountNumber();
    const cbeMessages = SmsService.getSmsMessages(activeAccNum);
    const sortedCbe = [...cbeMessages].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const latestCbeMsg = sortedCbe[0];
    const unreadCbeCount = cbeMessages.filter(m => !m.read).length;

    return INITIAL_THREADS.map(thread => {
      if (thread.isCbe) {
        let snippet = thread.snippet;
        let timeLabel = thread.timeLabel;

        if (latestCbeMsg) {
          snippet = latestCbeMsg.message.replace(/\n+/g, ' ');
          if (snippet.length > 55) {
            snippet = snippet.slice(0, 52) + '...';
          }

          const msgDate = new Date(latestCbeMsg.timestamp);
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
  }
}

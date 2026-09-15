import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  ArrowRight, 
  Building, 
  CreditCard, 
  User, 
  ShieldCheck,
  Eye,
  Plus
} from 'lucide-react';
import { TelegramChat, TelegramParticipantProfile } from '../../types/telegram';
import { Transaction } from '../../types';
import { 
  getLeulSegedAvatarDataUrl, 
  getGOMAvatarDataUrl 
} from '../../utils/telegramReceiptGenerator';
import { TelegramSimulatorService } from '../../services/telegramSimulatorService';

interface TelegramSimulateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chats: TelegramChat[];
  currentChat: TelegramChat;
  onSimulate: (config: {
    receiverName: string;
    receiverAccount: string;
    receiverAvatarUrl?: string;
    amount: number;
    referenceNo?: string;
    viewPerspective: 'gom' | 'receiver';
  }) => void;
}

export default function TelegramSimulateChatModal({
  isOpen,
  onClose,
  chats,
  currentChat,
  onSimulate,
}: TelegramSimulateChatModalProps) {
  // Account 1: Always GOM Customer Service (Global Online Market)
  const gomProfile: TelegramParticipantProfile = {
    contactName: 'GOM Customer Service',
    username: '@gom_customer_service',
    avatarUrl: getGOMAvatarDataUrl(),
    status: 'last seen recently',
    accountNumber: '1000684396671',
    bioText: "Let's work together through simple tasks for earning",
  };

  // Account 2: Receiver Options
  const [selectedReceiverId, setSelectedReceiverId] = useState<string>(() => {
    // If current chat is not GOM, select it
    if (currentChat && !currentChat.contactName.includes('GOM')) {
      return currentChat.id;
    }
    const found = chats.find(c => !c.contactName.includes('GOM'));
    return found ? found.id : 'leul-seged-custom';
  });

  const [isCustomReceiver, setIsCustomReceiver] = useState(false);
  const [customReceiverName, setCustomReceiverName] = useState('Leul Seged');
  const [customReceiverFullName, setCustomReceiverFullName] = useState('Leul Degsew Alemayehu');
  const [customReceiverAccount, setCustomReceiverAccount] = useState('1000638276450');
  const [amount, setAmount] = useState<number>(200000);
  const [refNo, setRefNo] = useState<string>('FT267561AI79');

  // View Perspective: 'gom' = Viewing as GOM (sees Receiver in header), 'receiver' = Viewing as Receiver (sees GOM in header)
  const [viewPerspective, setViewPerspective] = useState<'gom' | 'receiver'>(
    currentChat.viewPerspective || 'gom'
  );

  if (!isOpen) return null;

  // Selected receiver object
  const selectedChatObj = chats.find(c => c.id === selectedReceiverId);

  const handleStartSimulation = () => {
    let recName = isCustomReceiver ? customReceiverName : (selectedChatObj?.contactName || 'Leul Seged');
    let recAcc = isCustomReceiver ? customReceiverAccount : (selectedChatObj?.accountNumber || '1000638276450');
    let avatar = isCustomReceiver 
      ? (recName.toLowerCase().includes('leul') ? getLeulSegedAvatarDataUrl() : undefined) 
      : selectedChatObj?.avatarUrl;

    onSimulate({
      receiverName: recName,
      receiverAccount: recAcc,
      receiverAvatarUrl: avatar,
      amount: Number(amount) || 200000,
      referenceNo: refNo.trim() || 'FT267561AI79',
      viewPerspective,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#17212b] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 my-auto">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-[#0e1621] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Simulate Chat (2 Accounts)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Select accounts &amp; viewpoint perspective</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto scrollbar-thin">
          
          {/* STEP 1: ACCOUNT 1 (Fixed: GOM Customer Service) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                1. Account 1 (Always Selected Host / Payer)
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold border border-emerald-200/50 dark:border-emerald-800/50">
                <ShieldCheck className="w-3 h-3" /> Locked: Global Online Market
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0e1621] border border-blue-200/60 dark:border-blue-900/40 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-amber-400 shadow-xs">
                <img 
                  src={gomProfile.avatarUrl} 
                  alt="GOM Logo" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                    {gomProfile.contactName}
                  </h4>
                  <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 font-semibold px-1.5 py-0.2 rounded-sm">
                    GOM Admin
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Account: 1000684396671 (Global Online Market)
                </p>
                <p className="text-[11px] text-slate-400 italic truncate">
                  Bio: {gomProfile.bioText}
                </p>
              </div>
            </div>
          </div>

          {/* STEP 2: ACCOUNT 2 (Receiver Selection) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                2. Account 2 (Receiver / Member)
              </span>
              <button
                type="button"
                onClick={() => setIsCustomReceiver(!isCustomReceiver)}
                className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                {isCustomReceiver ? 'Pick from List' : '➕ Custom Receiver'}
              </button>
            </div>

            {!isCustomReceiver ? (
              <div className="space-y-2">
                {chats
                  .filter(c => !c.contactName.includes('GOM'))
                  .map(c => {
                    const isSelected = selectedReceiverId === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedReceiverId(c.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 shadow-xs'
                            : 'bg-white dark:bg-[#1e2c3a] border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200 shadow-xs">
                            <img 
                              src={c.avatarUrl || getLeulSegedAvatarDataUrl()} 
                              alt="" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                              {c.contactName}
                            </h5>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              CBE Acc: {c.accountNumber || '1000638276450'}
                            </p>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-blue-600 text-white' : 'border border-slate-300 dark:border-slate-600'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0e1621] border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Display Name
                  </label>
                  <input 
                    type="text"
                    value={customReceiverName}
                    onChange={(e) => setCustomReceiverName(e.target.value)}
                    placeholder="e.g. Leul Seged"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#17212b] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Name (on CBE Receipt &amp; SMS)
                  </label>
                  <input 
                    type="text"
                    value={customReceiverFullName}
                    onChange={(e) => setCustomReceiverFullName(e.target.value)}
                    placeholder="e.g. Leul Degsew Alemayehu"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#17212b] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    CBE Account Number
                  </label>
                  <input 
                    type="text"
                    value={customReceiverAccount}
                    onChange={(e) => setCustomReceiverAccount(e.target.value)}
                    placeholder="e.g. 1000638276450"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#17212b] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: TRANSACTION DETAILS */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0e1621] border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Transfer Amount (ETB)
              </label>
              <input 
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#17212b] text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                CBE Reference No
              </label>
              <input 
                type="text"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#17212b] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* STEP 4: CHOOSE VIEWPOINT ("Which account is seen") */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              3. Which account is seen? (Choose Viewpoint)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Option A: View as GOM (Sees Receiver) */}
              <div 
                onClick={() => setViewPerspective('gom')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  viewPerspective === 'gom'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e2c3a] hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      View as GOM
                    </span>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      viewPerspective === 'gom' ? 'bg-emerald-600 text-white' : 'border border-slate-300'
                    }`}>
                      {viewPerspective === 'gom' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-snug">
                    You see <strong>{isCustomReceiver ? customReceiverName : (selectedChatObj?.contactName || 'Leul Seged')}</strong> in the header with phone icon.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
                  • GOM text on <span className="text-emerald-600 font-semibold">Right (Green)</span><br/>
                  • Receiver text on <span className="font-semibold text-slate-700 dark:text-slate-300">Left (White)</span>
                </div>
              </div>

              {/* Option B: View as Receiver (Sees GOM) */}
              <div 
                onClick={() => setViewPerspective('receiver')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  viewPerspective === 'receiver'
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e2c3a] hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                      View as Receiver ({isCustomReceiver ? customReceiverName.split(' ')[0] : (selectedChatObj?.contactName.split(' ')[0] || 'Leul')})
                    </span>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      viewPerspective === 'receiver' ? 'bg-blue-600 text-white' : 'border border-slate-300'
                    }`}>
                      {viewPerspective === 'receiver' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-snug">
                    You see <strong>GOM Customer Service</strong> with gold logo, search icon &amp; Bio card.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
                  • Receiver text on <span className="text-emerald-600 font-semibold">Right (Green)</span><br/>
                  • GOM text on <span className="font-semibold text-slate-700 dark:text-slate-300">Left (White)</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-[#0e1621] border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStartSimulation}
            className="px-5 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-md shadow-blue-500/20 flex items-center gap-2 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Simulate Chat &amp; Apply</span>
          </button>
        </div>

      </div>
    </div>
  );
}

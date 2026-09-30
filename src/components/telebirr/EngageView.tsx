import React from 'react';
import { ArrowLeft, Sparkles, Trophy, Gift, MessageCircle, Share2, Flame, Award } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';

export const EngageView: React.FC = () => {
  const { setActiveSubView, language, setIsTelePlayOpen, rewardBalance } = useWallet();

  return (
    <div className="w-full flex-1 flex flex-col bg-[#F4F6F8] min-h-screen pb-24 select-none animate-fade-in">
      {/* Top Header */}
      <div className="w-full bg-white px-4 py-3 border-b border-gray-200 flex items-center gap-3 sticky top-0 z-30 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveSubView('home')}
          className="p-1.5 -ml-1 text-gray-700 hover:text-black hover:bg-gray-100 rounded-full transition cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2.4]" />
        </button>
        <h2 className="text-[19px] font-extrabold text-gray-900 tracking-tight">
          {language === 'am' ? 'ቴሌብር መድረክ' : 'Telebirr Engage'}
        </h2>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* TelePlay Highlight Card */}
        <div 
          onClick={() => setIsTelePlayOpen(true)}
          className="w-full rounded-3xl bg-gradient-to-br from-emerald-800 via-[#103b19] to-slate-950 p-5 text-white shadow-xl relative overflow-hidden cursor-pointer active:scale-98 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-amber-400/30">
              <Trophy className="w-3 h-3" />
              <span>TelePlay Super Games</span>
            </span>
            <span className="text-xs text-emerald-200 font-bold">Reward: {rewardBalance.toFixed(2)} ETB</span>
          </div>

          <div className="mt-3">
            <h3 className="text-lg font-black text-white">Above 60 Million ETB in Prizes!</h3>
            <p className="text-xs text-emerald-100/80 mt-1">Spin the daily lucky wheel, play mini games, and win cash directly into your wallet.</p>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition shadow-md flex items-center gap-1.5"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Play Now & Win</span>
            </button>
            <span className="text-[11px] text-white/60">Free Daily Turn Available</span>
          </div>
        </div>

        {/* Daily Streak Check-in */}
        <div className="w-full bg-white rounded-3xl p-4 shadow-xs border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-500">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-extrabold text-gray-900 block">7-Day Check-in Streak</span>
              <span className="text-xs text-gray-500">Check-in daily for bonus reward points</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => alert('Daily check-in completed! +5 reward points.')}
            className="px-3 py-1.5 rounded-xl bg-[#7BBF18] text-white text-xs font-black hover:bg-[#72be20] transition"
          >
            Claim
          </button>
        </div>

        {/* Community Announcements */}
        <div className="w-full bg-white rounded-3xl p-4 shadow-xs border border-gray-100 flex flex-col gap-3">
          <span className="text-xs font-black text-gray-400 uppercase tracking-wider">News & Updates</span>
          
          <div className="flex flex-col gap-2.5">
            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="text-xs font-bold text-gray-900 block">Zero-Fee Merchant Transactions Extended</span>
              <span className="text-[11px] text-gray-500 mt-0.5 block">Pay without any extra transaction surcharge at over 200,000 merchants nationwide.</span>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="text-xs font-bold text-gray-900 block">Instant Remittance from 40+ Countries</span>
              <span className="text-[11px] text-gray-500 mt-0.5 block">Receive remittances directly into your Telebirr wallet with favorable bonus exchange rates.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EngageView;

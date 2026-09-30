import React, { useState } from 'react';
import { X, Sparkles, Trophy, Award, Gift, ArrowRight } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';

export interface TelePlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelePlayModal: React.FC<TelePlayModalProps> = ({ isOpen, onClose }) => {
  const { rewardBalance, setRewardBalance, language } = useWallet();
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [wonPrize, setWonPrize] = useState<{ amount: number; label: string } | null>(null);

  if (!isOpen) return null;

  const PRIZES = [
    { amount: 50, label: '50 ETB Reward' },
    { amount: 10, label: '10 ETB Airtime' },
    { amount: 100, label: '100 ETB Super Bonus' },
    { amount: 25, label: '25 ETB Cashback' },
    { amount: 500, label: '500 ETB Grand Prize' },
    { amount: 15, label: '15 ETB Data Pack' },
  ];

  const handleSpinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWonPrize(null);

    // Random prize selection
    const randomIndex = Math.floor(Math.random() * PRIZES.length);
    const selected = PRIZES[randomIndex];

    // Spin animation: 5 full rotations + segment offset
    const segmentAngle = 360 / PRIZES.length;
    const targetAngle = 360 * 5 + (randomIndex * segmentAngle);
    setRotation(prev => prev + targetAngle);

    setTimeout(() => {
      setIsSpinning(false);
      setWonPrize(selected);
      // Credit to reward balance
      setRewardBalance(Number((rewardBalance + selected.amount).toFixed(2)));
    }, 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs select-none">
      <div 
        className="w-full max-w-sm bg-gradient-to-b from-emerald-900 via-[#103b19] to-slate-950 rounded-3xl p-5 text-white shadow-2xl border border-emerald-500/30 relative flex flex-col items-center animate-fade-in"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 border border-amber-300/40 rounded-full text-amber-300 text-xs font-black tracking-wider uppercase mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>TelePlay Rewards • 60M ETB</span>
        </div>

        <h3 className="text-xl font-black text-center tracking-tight text-white mb-1">
          {language === 'am' ? 'ቴሌፕሌይ እድለኛ እጣ' : 'TelePlay Lucky Wheel'}
        </h3>
        <p className="text-xs text-emerald-200/80 text-center mb-4">
          {language === 'am' ? 'መንኮራኩሩን አሽከርክረው የብር ሽልማት ያሸንፉ!' : 'Spin the wheel to win instant cash into your Reward Balance!'}
        </p>

        {/* Wheel Graphic */}
        <div className="relative w-56 h-56 flex items-center justify-center my-2">
          {/* Wheel Pointer */}
          <div className="absolute -top-3 z-20 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-amber-400 drop-shadow-md" />

          {/* Rotating Wheel Disc */}
          <div 
            className="w-full h-full rounded-full border-4 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.35)] overflow-hidden relative transition-transform duration-[3500ms] ease-out"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <div className="absolute inset-0 bg-conic from-emerald-600 via-amber-500 via-teal-600 via-indigo-600 to-emerald-600" />
            <div className="absolute inset-2 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center">
              {/* Segments Dividers */}
              <div className="absolute w-full h-[1.5px] bg-white/40" />
              <div className="absolute w-full h-[1.5px] bg-white/40 rotate-60" />
              <div className="absolute w-full h-[1.5px] bg-white/40 -rotate-60" />
            </div>

            {/* Center Cap */}
            <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-slate-900 border-2 border-amber-400 flex items-center justify-center shadow-lg z-10">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Winner Announcement Card */}
        {wonPrize && (
          <div className="w-full mt-3 p-3 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-between text-center animate-fade-in">
            <div className="flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-300 shrink-0" />
              <div className="text-left">
                <span className="text-[11px] font-bold text-amber-300 block uppercase">Congratulations!</span>
                <span className="text-sm font-extrabold text-white">+{wonPrize.label}</span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-300 bg-emerald-950/80 px-2 py-1 rounded-lg">Credited</span>
          </div>
        )}

        {/* Spin Action Button */}
        <button
          type="button"
          disabled={isSpinning}
          onClick={handleSpinWheel}
          className={`w-full mt-4 py-3 px-4 rounded-2xl font-black text-sm tracking-wide transition cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
            isSpinning 
              ? 'bg-emerald-800 text-white/50 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-400/30 active:scale-98'
          }`}
        >
          {isSpinning ? (
            <span>Spinning the Wheel...</span>
          ) : (
            <>
              <Gift className="w-4 h-4" />
              <span>SPIN FOR FREE (DEMO)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TelePlayModal;

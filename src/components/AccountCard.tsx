import React, { useState } from 'react';
import { Check } from 'lucide-react';
import DottedWorldMap from './DottedWorldMap';
import { CbeGoldenEmblemSvg } from './CbeLogo';
import { EyeOffIcon, EyeOpenIcon, CopyIcon } from './CbeCustomIcons';

interface AccountCardProps {
  bankName?: string;
  slogan?: string;
  balance?: number;
  currency?: string;
  accountType?: string;
  accountNumber?: string;
  dateTimeString?: string;
  showBalanceDefault?: boolean;
  onToggleBalance?: () => void;
  customLogoUrl?: string | null;
  className?: string;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  bankName = 'Commercial Bank of Ethiopia',
  slogan = 'The bank you can always rely on!',
  balance = 25430.00,
  currency = 'ETB',
  accountType = 'Saving Account',
  accountNumber = '1000284758657',
  dateTimeString = '01 Jul 2026 • 10:14 AM',
  showBalanceDefault = false,
  onToggleBalance,
  customLogoUrl = null,
  className = '',
}) => {
  const [showBalance, setShowBalance] = useState(showBalanceDefault);
  const [copied, setCopied] = useState(false);

  const handleToggle = () => {
    setShowBalance(!showBalance);
    onToggleBalance?.();
  };

  const handleCopy = () => {
    if (accountNumber) {
      navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Format account string like: "Saving Account 1 **** 8657"
  const formattedAccountDisplay = React.useMemo(() => {
    const rawType = (accountType || '').toLowerCase();
    let displayType = accountType;
    if (rawType.includes('regular') || rawType.includes('wadiah') || rawType.includes('staff') || !accountType) {
      displayType = 'Saving Account';
    }
    if (!accountNumber) return `${displayType} 1 **** 8657`;
    const clean = accountNumber.replace(/\s+/g, '');
    const firstDigit = clean.slice(0, 1) || '1';
    const lastDigits = clean.slice(-4) || '8657';
    if (!showBalance) {
      return `${displayType} ${firstDigit} **** ${lastDigits}`;
    }
    return `${displayType} ${clean}`;
  }, [accountType, accountNumber, showBalance]);

  const formattedBalanceAmount = React.useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(balance) || 0);
  }, [balance]);

  return (
    <div className={`w-full max-w-md mx-auto px-4 relative z-10 select-none ${className}`}>
      {/* Compact Dark CBE Account Card */}
      <div 
        id="cbe-account-card"
        className="account-card w-full bg-[#141416] rounded-[26px] p-5 sm:p-5.5 shadow-2xl text-white relative overflow-hidden border border-white/10"
      >
        {/* Subtle Halftone Dotted Texture */}
        <DottedWorldMap />
        <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-[#deb356]/10 rounded-full blur-2xl pointer-events-none" />

        {/* TOP SECTION: Bank Emblem & Bank Titles */}
        <div className="relative z-10 flex items-center justify-between gap-2 min-w-0 mb-4 sm:mb-4.5">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Bank Golden Coin Emblem or Custom Logo */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 flex items-center justify-center">
              {customLogoUrl ? (
                <img 
                  src={customLogoUrl} 
                  alt="Bank Logo" 
                  className="w-9 h-9 object-contain rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <CbeGoldenEmblemSvg className="w-9 h-9 sm:w-10 sm:h-10" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-[#FED053] font-bold text-[16px] sm:text-[17px] tracking-normal leading-tight whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                {bankName}
              </h3>
              <p className="text-[#FED053] text-[12px] sm:text-[12.5px] font-medium tracking-normal mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                {slogan}
              </p>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: Horizontally Centered Balance, Currency & Beside Eye Toggle */}
        <div className="my-3.5 sm:my-4 flex items-center justify-center z-10">
          <div className="flex items-center justify-center">
            {/* Balance Amount */}
            <span className="text-[36px] sm:text-[40px] font-black text-white tracking-tight font-sans leading-none">
              {showBalance ? formattedBalanceAmount : '******'}
            </span>
            {/* Currency ETB */}
            <span className="ml-2.5 sm:ml-3 text-[16px] sm:text-[17px] font-bold text-white font-sans">
              {currency}
            </span>
            {/* Eye Visibility Toggle Button positioned directly beside ETB */}
            <button
              id="btn-toggle-balance"
              type="button"
              aria-label={showBalance ? "Hide Account Balance" : "Show Account Balance"}
              onClick={handleToggle}
              className="ml-3 sm:ml-4 p-1 rounded-full text-white/75 hover:text-white transition-colors cursor-pointer active:scale-95 flex items-center justify-center"
              title={showBalance ? "Hide Balance & Account" : "Show Balance & Account"}
            >
              {showBalance ? (
                <EyeOpenIcon size={21} className="text-white/80 hover:text-white" strokeWidth={1.8} />
              ) : (
                <EyeOffIcon size={21} className="text-white/80 hover:text-white" strokeWidth={1.8} />
              )}
            </button>
          </div>
        </div>

        {/* BOTTOM SECTION: Account Type/Number & Copy Icon (Centered together) */}
        <div className="flex items-center justify-center text-[14.5px] sm:text-[15.5px] text-[#FED053] relative z-10 font-sans my-1.5">
          <span className="font-bold tracking-normal text-[#FED053] select-text">
            {formattedAccountDisplay}
          </span>
          <button
            id="btn-copy-account"
            type="button"
            aria-label="Copy Account Number"
            onClick={handleCopy}
            className="ml-2 hover:text-white text-white/80 p-0.5 transition cursor-pointer flex items-center active:scale-95"
            title="Copy Account Number"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
            ) : (
              <CopyIcon size={16} className="text-white/80 hover:text-white" strokeWidth={1.8} />
            )}
          </button>
        </div>

        {/* Date & Time display */}
        <div className="mt-2.5 text-center text-[11.5px] sm:text-[12px] text-white/60 font-sans tracking-normal">
          {dateTimeString}
        </div>
      </div>
    </div>
  );
};

export default AccountCard;

import React, { useState } from 'react';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';
import DottedWorldMap from './DottedWorldMap';
import { CbeGoldenEmblemSvg } from './CbeLogo';

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
    navigator.clipboard.writeText(accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    }).format(balance);
  }, [balance]);

  return (
    <div className={`w-full max-w-md mx-auto px-4 relative z-10 select-none ${className}`}>
      {/* Compact Dark CBE Account Card */}
      <div 
        id="cbe-account-card"
        className="account-card w-full bg-[#18191c] rounded-3xl p-5 shadow-2xl text-white relative overflow-hidden border border-white/10"
      >
        {/* Subtle Halftone Dotted Texture */}
        <DottedWorldMap />
        <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-[#deb356]/10 rounded-full blur-2xl pointer-events-none" />

        {/* TOP SECTION: Bank Emblem & Bank Titles */}
        <div className="relative z-10 flex items-center gap-2.5 min-w-0">
          {/* Bank Golden Coin Emblem or Custom Logo */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 flex items-center justify-center">
            {customLogoUrl ? (
              <img 
                src={customLogoUrl} 
                alt="Bank Logo" 
                className="w-8 h-8 object-contain rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <CbeGoldenEmblemSvg className="w-8 h-8 sm:w-9 sm:h-9" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-[#deb356] font-extrabold text-xs sm:text-[13px] tracking-wide leading-none whitespace-nowrap overflow-hidden text-ellipsis">
              {bankName}
            </h3>
            <p className="text-[#deb356]/80 text-[9px] sm:text-[10px] font-medium tracking-tight mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
              {slogan}
            </p>
          </div>
        </div>

        {/* MIDDLE SECTION: Horizontally Centered Balance & Right Eye Toggle */}
        <div className="my-4 sm:my-5 relative flex items-center justify-center z-10">
          {/* Centered Balance text */}
          <div className="flex items-baseline justify-center gap-2 text-center">
            <span className="text-xl sm:text-2xl font-extrabold tracking-widest font-mono text-white">
              {showBalance ? formattedBalanceAmount : '******'}
            </span>
            <span className="text-sm font-bold text-gray-300 font-mono">
              {currency}
            </span>
          </div>

          {/* Eye Visibility Toggle Button positioned at right */}
          <button
            id="btn-toggle-balance"
            type="button"
            aria-label={showBalance ? "Hide Account Balance" : "Show Account Balance"}
            onClick={handleToggle}
            className="absolute right-0 p-1.5 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer active:scale-95"
            title={showBalance ? "Hide Balance & Account" : "Show Balance & Account"}
          >
            {showBalance ? (
              <Eye className="w-5 h-5 text-gray-300 stroke-[1.8]" />
            ) : (
              <EyeOff className="w-5 h-5 text-gray-400 stroke-[1.8]" />
            )}
          </button>
        </div>

        {/* BOTTOM SECTION: Account Type/Number & Date */}
        <div className="flex justify-between items-center text-xs text-[#deb356] relative z-10 font-mono">
          <span className="font-bold tracking-wide text-[#deb356]">
            {formattedAccountDisplay}
          </span>
          <button
            id="btn-copy-account"
            type="button"
            aria-label="Copy Account Number"
            onClick={handleCopy}
            className="hover:text-amber-400 text-gray-400 p-1 transition cursor-pointer flex items-center gap-1"
            title="Copy Account Number"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Date & Time display */}
        <div className="mt-3 text-center text-[10px] text-gray-400/90 font-mono tracking-wide">
          {dateTimeString}
        </div>
      </div>

      {/* CARD CAROUSEL INDICATOR PILLS (Below Card) */}
      <div className="flex justify-center items-center gap-1.5 mt-3">
        {/* Active Pill: 24px x 6px */}
        <div className="w-6 h-1.5 bg-[#deb356] rounded-full transition-all shadow-xs" />
        {/* Inactive Circle 1 */}
        <div className="w-1.5 h-1.5 bg-[#deb356]/70 rounded-full transition-all" />
        {/* Inactive Circle 2 */}
        <div className="w-1.5 h-1.5 bg-[#deb356]/70 rounded-full transition-all" />
      </div>
    </div>
  );
};

export default AccountCard;

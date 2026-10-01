import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import DottedWorldMap from './DottedWorldMap';
import { CbeGoldenEmblemSvg } from './CbeLogo';
import { EyeOffIcon, EyeOpenIcon, CopyIcon, AccountSearchDirectoryIcon } from './CbeCustomIcons';

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
  onOpenAccountSearch?: () => void;
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
  onOpenAccountSearch,
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

        {/* TOP SECTION: Bank Emblem & Bank Titles & Multi-Account Switcher */}
        <div className="relative z-10 flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
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

          {/* Multi-Account / Registered Accounts Search Button */}
          {onOpenAccountSearch && (
            <button
              id="btn-account-search-card"
              type="button"
              onClick={onOpenAccountSearch}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 text-[#deb356] text-[11px] font-bold transition cursor-pointer flex-shrink-0 shadow-xs backdrop-blur-xs group"
              title="Search & Choose Registered Accounts"
            >
              <AccountSearchDirectoryIcon size={14} className="text-[#deb356] group-hover:scale-110 transition-transform" />
              <span className="text-[10.5px] tracking-tight">Accounts</span>
              <ChevronDown className="w-3 h-3 text-[#deb356]/80" />
            </button>
          )}
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
              <EyeOpenIcon size={20} className="text-gray-300" strokeWidth={2} />
            ) : (
              <EyeOffIcon size={20} className="text-gray-400" strokeWidth={2} />
            )}
          </button>
        </div>

        {/* BOTTOM SECTION: Account Type/Number & Copy Icon (Centered together) */}
        <div className="flex items-center justify-center text-xs sm:text-[13px] text-[#EDE49E] relative z-10 font-mono">
          <span className="font-medium tracking-wide text-[#EDE49E] select-text">
            {formattedAccountDisplay}
          </span>
          <button
            id="btn-copy-account"
            type="button"
            aria-label="Copy Account Number"
            onClick={handleCopy}
            className="ml-2 hover:text-white text-gray-300 p-0.5 transition cursor-pointer flex items-center active:scale-95"
            title="Copy Account Number"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
            ) : (
              <CopyIcon size={15} className="text-gray-300 hover:text-white" strokeWidth={1.6} />
            )}
          </button>
          {onOpenAccountSearch && (
            <button
              id="btn-account-search-inline"
              type="button"
              aria-label="Search & Switch Accounts"
              onClick={onOpenAccountSearch}
              className="ml-2 p-1 rounded-lg bg-white/10 hover:bg-white/20 text-[#deb356] hover:text-white transition cursor-pointer flex items-center active:scale-95 border border-white/10"
              title="Search & Choose Registered Accounts"
            >
              <AccountSearchDirectoryIcon size={13} className="text-[#deb356]" />
            </button>
          )}
        </div>

        {/* Date & Time display */}
        <div className="mt-3 text-center text-[10px] text-gray-400/90 font-mono tracking-wide">
          {dateTimeString}
        </div>
      </div>
    </div>
  );
};

export default AccountCard;

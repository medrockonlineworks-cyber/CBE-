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
  isRefreshing?: boolean;
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
  isRefreshing = false,
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
        style={{
          background:
            'linear-gradient(160deg, rgba(44, 42, 49, 0.92) 0%, rgba(36, 36, 40, 0.96) 52%, rgba(28, 28, 32, 0.98) 100%)',
        }}
        className="account-card w-full rounded-[22px] sm:rounded-3xl p-5 shadow-[0_14px_34px_rgba(0,0,0,0.28)] text-white relative overflow-hidden border border-white/12 backdrop-blur-[2px]"
      >
        {/* Subtle Halftone Dotted World Map Texture */}
        <DottedWorldMap />

        {/* TOP SECTION: Bank Emblem & Bank Titles */}
        <div className="relative z-10 flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Bank Golden Coin Emblem or Custom Logo */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 flex items-center justify-center">
              {customLogoUrl ? (
                <img 
                  src={customLogoUrl} 
                  alt="Bank Logo" 
                  className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <CbeGoldenEmblemSvg className="w-9 h-9 sm:w-10 sm:h-10" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-sans text-[#F6C84C] font-bold text-[15.5px] sm:text-[17px] tracking-[-0.01em] leading-tight whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
                {bankName}
              </h3>
              <p className="font-mono text-[#E8CF84] text-[11px] sm:text-[11.5px] font-medium tracking-[0.015em] leading-snug mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                {slogan}
              </p>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: Horizontally Centered Balance & Right Eye Toggle (Fixed height to prevent card resize) */}
        <div className="my-5 sm:my-6 h-[32px] sm:h-[34px] relative flex items-center justify-center z-10">
          {/* Centered Balance text or Refresh Shimmer Skeleton */}
          {isRefreshing ? (
            <div
              id="cbe-balance-shimmer-skeleton"
              aria-label="Refreshing balance"
              className="flex items-end justify-center gap-2 px-9"
            >
              <div className="cbe-balance-shimmer w-[144px] sm:w-[158px] h-[30px] sm:h-[34px] rounded-[9px]" />
              <div className="cbe-balance-shimmer w-[42px] sm:w-[46px] h-[18px] sm:h-[20px] rounded-[6px]" />
            </div>
          ) : (
            <div className="flex items-baseline justify-center gap-2 text-center whitespace-nowrap px-9 max-w-full overflow-hidden">
              {showBalance ? (
                <span className="font-sans text-[23px] sm:text-[25px] font-extrabold tracking-tight text-white leading-none truncate">
                  {formattedBalanceAmount}
                </span>
              ) : (
                <span className="font-mono text-[24px] sm:text-[26px] font-extrabold tracking-[0.11em] text-white leading-none">
                  ******
                </span>
              )}
              <span className="font-sans text-[15px] sm:text-[16px] font-bold text-white tracking-normal leading-none shrink-0">
                {currency}
              </span>
            </div>
          )}

          {/* Eye Visibility Toggle Button positioned at right */}
          <button
            id="btn-toggle-balance"
            type="button"
            aria-label={showBalance ? "Hide Account Balance" : "Show Account Balance"}
            onClick={handleToggle}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-[#A4A6AC] hover:text-white transition-colors cursor-pointer active:scale-95"
            title={showBalance ? "Hide Balance & Account" : "Show Balance & Account"}
          >
            {showBalance ? (
              <EyeOpenIcon size={22} className="text-[#D1D5DB]" strokeWidth={1.9} />
            ) : (
              <EyeOffIcon size={22} className="text-[#A4A6AC]" strokeWidth={1.9} />
            )}
          </button>
        </div>

        {/* BOTTOM SECTION: Account Type/Number & Copy Icon (Single-line fixed height) */}
        <div className="h-[22px] sm:h-[24px] flex items-center justify-center text-[13px] sm:text-[14.5px] text-[#EAE292] relative z-10 font-mono whitespace-nowrap">
          <span className="font-medium tracking-[0.025em] text-[#EAE292] select-text truncate leading-none">
            {formattedAccountDisplay}
          </span>
          <button
            id="btn-copy-account"
            type="button"
            aria-label="Copy Account Number"
            onClick={handleCopy}
            className="ml-2 hover:text-white text-[#C9CBD1] p-0.5 transition cursor-pointer flex items-center shrink-0 active:scale-95"
            title="Copy Account Number"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
            ) : (
              <CopyIcon size={17} className="text-[#C9CBD1] hover:text-white" strokeWidth={1.6} />
            )}
          </button>
        </div>

        {/* Date & Time display */}
        <div className="mt-3.5 h-[16px] flex items-center justify-center text-center font-sans text-[11.5px] sm:text-[12px] font-medium text-[#92949A] tracking-[0.01em] relative z-10 whitespace-nowrap leading-none">
          {dateTimeString}
        </div>
      </div>
    </div>
  );
};

export default AccountCard;

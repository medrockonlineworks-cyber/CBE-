import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Search, Bell, Edit3, X, Check, ArrowDownLeft, ArrowUpRight, Globe, Sliders } from 'lucide-react';
import { TelebirrRipples, TelebirrSolidAvatar } from './TelebirrBrandAssets';
import { TelebirrService, AccountData, TelebirrAccountState } from '../services/telebirrService';

// Format ETB currency number to standard string (e.g. 41865.79 -> "41,865.79")
export const formatETB = (val: number): string => {
  const safeNum = typeof val === 'number' && !isNaN(val) ? val : 0;
  return safeNum.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/* ==========================================================================
   SUB-COMPONENT 1: ProfileButton (Requirement 8, 10)
   White profile icon button, opens user profile / account screen on click
   ========================================================================== */
export interface ProfileButtonProps {
  onClick?: () => void;
  className?: string;
}

export const ProfileButton: React.FC<ProfileButtonProps> = ({ onClick, className = '' }) => {
  return (
    <button
      id="telebirr-profile-button"
      type="button"
      onClick={onClick}
      className={`group flex items-center justify-center p-0.5 rounded-full hover:bg-white/15 active:scale-95 transition cursor-pointer ${className}`}
      title="Open Profile & Account"
      aria-label="Profile and Account"
    >
      <TelebirrSolidAvatar className="w-8 h-8 shrink-0 drop-shadow-xs group-hover:scale-105 transition-transform" />
    </button>
  );
};

/* ==========================================================================
   SUB-COMPONENT 2: Greeting (Requirement 1, 10)
   Displays dynamic user.name: "Selam, {user.name}"
   Updates automatically if user.name changes anywhere in the app
   ========================================================================== */
export interface GreetingProps {
  name: string;
  language?: string;
  onEdit?: () => void;
  className?: string;
}

export const Greeting: React.FC<GreetingProps> = ({ name, language = 'English', onEdit, className = '' }) => {
  // Respect selected language greeting prefix if applicable
  const getGreetingPrefix = (lang: string) => {
    switch (lang) {
      case 'Amharic (አማርኛ)':
        return 'ሰላም, ';
      case 'Afaan Oromoo':
        return 'Akkam, ';
      case 'Tigrinya (ትግርኛ)':
        return 'ሰላም, ';
      case 'Somali (Soomaali)':
        return 'Nabad, ';
      default:
        return 'Selam, ';
    }
  };

  const prefix = getGreetingPrefix(language);
  const displayName = name || 'Leykun';

  return (
    <div
      id="telebirr-greeting-button"
      onClick={onEdit}
      className={`group flex items-center gap-1.5 cursor-pointer select-none rounded-lg py-0.5 px-1 hover:bg-white/10 transition active:scale-98 ${className}`}
      title="Tap to change display name"
      role="button"
      tabIndex={0}
    >
      <span className="text-[16.5px] font-semibold text-white tracking-normal drop-shadow-xs truncate max-w-[170px]">
        {prefix}{displayName}
      </span>
      {onEdit && (
        <Edit3 className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-colors shrink-0" />
      )}
    </div>
  );
};

/* ==========================================================================
   SUB-COMPONENT 3: SearchButton (Requirement 9, 10)
   White search magnifying glass button, opens search interface
   ========================================================================== */
export interface SearchButtonProps {
  onClick?: () => void;
  className?: string;
}

export const SearchButton: React.FC<SearchButtonProps> = ({ onClick, className = '' }) => {
  return (
    <button
      id="telebirr-search-button"
      type="button"
      onClick={onClick}
      className={`p-1.5 rounded-full text-white hover:bg-white/15 active:scale-90 transition cursor-pointer flex items-center justify-center ${className}`}
      title="Search Telebirr services, banks & contacts"
      aria-label="Search"
    >
      <Search className="w-[19px] h-[19px] text-white" strokeWidth={2.4} />
    </button>
  );
};

/* ==========================================================================
   SUB-COMPONENT 4: NotificationButton (Requirement 6, 10)
   Notification bell with dynamic red count badge (hidden if 0)
   ========================================================================== */
export interface NotificationButtonProps {
  count: number;
  onClick?: () => void;
  className?: string;
}

export const NotificationButton: React.FC<NotificationButtonProps> = ({ count, onClick, className = '' }) => {
  const isVisible = count > 0;

  return (
    <button
      id="telebirr-notification-button"
      type="button"
      onClick={onClick}
      className={`relative p-1.5 rounded-full text-white hover:bg-white/15 active:scale-90 transition cursor-pointer flex items-center justify-center ${className}`}
      title={count > 0 ? `${count} unread notifications` : 'No unread notifications'}
      aria-label={`Notifications ${count > 0 ? `(${count} unread)` : ''}`}
    >
      <Bell className="w-[19px] h-[19px] text-white" strokeWidth={2.4} />
      {isVisible && (
        <span
          id="telebirr-notification-badge"
          className="absolute -top-0.5 -right-0.5 bg-[#e51c23] text-white text-[10px] font-bold min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center shadow-xs ring-1 ring-white/30 animate-in fade-in zoom-in-75 duration-150"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
};

/* ==========================================================================
   SUB-COMPONENT 5: LanguageSelector (Requirement 7, 10)
   Displays current language with downward arrow, triggers language change
   ========================================================================== */
export interface LanguageSelectorProps {
  language: string;
  onClick?: () => void;
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ language, onClick, className = '' }) => {
  // Show clean short label (e.g. "English", "አማርኛ")
  const displayLabel = language.split(' ')[0] || 'English';

  return (
    <button
      id="telebirr-language-selector"
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 text-[15px] font-medium text-white hover:bg-white/15 py-1 px-1.5 rounded-md transition active:scale-95 cursor-pointer select-none ${className}`}
      title="Change Language"
      aria-label={`Current language: ${language}. Tap to change.`}
    >
      <span>{displayLabel}</span>
      <svg className="w-2.5 h-2.5 fill-white shrink-0 mt-0.5" viewBox="0 0 10 6">
        <polygon points="0,0 10,0 5,6" />
      </svg>
    </button>
  );
};

/* ==========================================================================
   SUB-COMPONENT 6: HeaderTopBar (Requirement 10)
   Combines ProfileButton, Greeting, SearchButton, NotificationButton, LanguageSelector
   ========================================================================== */
export interface HeaderTopBarProps {
  name: string;
  notificationCount: number;
  language: string;
  onOpenProfile?: () => void;
  onEditName?: () => void;
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  onOpenLanguage?: () => void;
}

export const HeaderTopBar: React.FC<HeaderTopBarProps> = ({
  name,
  notificationCount,
  language,
  onOpenProfile,
  onEditName,
  onOpenSearch,
  onOpenNotifications,
  onOpenLanguage,
}) => {
  return (
    <div id="telebirr-header-top-bar" className="relative z-10 flex items-center justify-between px-3.5 pt-3 pb-1">
      {/* Left: Profile avatar + Greeting */}
      <div className="flex items-center gap-2">
        <ProfileButton onClick={onOpenProfile} />
        <Greeting name={name} language={language} onEdit={onEditName} />
      </div>

      {/* Right: Search, Notification Bell with badge, Language */}
      <div className="flex items-center gap-2">
        <SearchButton onClick={onOpenSearch} />
        <NotificationButton count={notificationCount} onClick={onOpenNotifications} />
        <LanguageSelector language={language} onClick={onOpenLanguage} />
      </div>
    </div>
  );
};

/* ==========================================================================
   SUB-COMPONENT 7: BalanceDisplay (Requirement 2, 5, 10)
   Main balance display: "Balance (ETB)" + Eye toggle button + formatted amount
   ========================================================================== */
export interface BalanceDisplayProps {
  balance: number;
  isVisible: boolean;
  onToggleVisibility: (e?: React.MouseEvent) => void;
  onAmountClick?: () => void;
}

export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  balance,
  isVisible,
  onToggleVisibility,
  onAmountClick,
}) => {
  return (
    <div id="telebirr-main-balance-section" className="text-center pt-2 pb-1">
      {/* Label and Eye toggle button */}
      <div className="inline-flex items-center justify-center gap-1.5 text-white">
        <span
          onClick={onToggleVisibility}
          className="text-[16.5px] font-semibold tracking-normal drop-shadow-xs cursor-pointer select-none"
        >
          Balance (ETB)
        </span>
        <button
          id="telebirr-balance-eye-btn"
          type="button"
          onClick={onToggleVisibility}
          className="p-1 hover:bg-white/20 active:scale-90 rounded-full transition cursor-pointer text-white flex items-center justify-center"
          title={isVisible ? 'Hide Balance' : 'Show Balance'}
          aria-label={isVisible ? 'Hide Balance' : 'Show Balance'}
        >
          {isVisible ? (
            <Eye className="w-[18px] h-[18px] text-white" strokeWidth={2.4} />
          ) : (
            <EyeOff className="w-[18px] h-[18px] text-white" strokeWidth={2.4} />
          )}
        </button>
      </div>

      {/* Big Bold Numerals or Masked asterisks */}
      <div className="pt-0.5">
        <h1
          id="telebirr-balance-value"
          onClick={onAmountClick}
          className="text-[39px] font-extrabold tracking-tight text-white drop-shadow-sm font-sans leading-tight cursor-pointer select-none hover:scale-[1.01] active:scale-98 transition"
          title="Tap to deposit or withdraw funds"
        >
          {isVisible ? formatETB(balance) : '******'}
        </h1>
      </div>
    </div>
  );
};

/* ==========================================================================
   SUB-COMPONENT 8: EndekiseDisplay (Requirement 3, 5, 10)
   Left column: "Endekise (ETB)" + Eye toggle + dynamic value
   ========================================================================== */
export interface EndekiseDisplayProps {
  amount: number;
  isVisible: boolean;
  onToggleVisibility: (e?: React.MouseEvent) => void;
}

export const EndekiseDisplay: React.FC<EndekiseDisplayProps> = ({
  amount,
  isVisible,
  onToggleVisibility,
}) => {
  return (
    <div id="telebirr-endekise-section" className="text-left">
      <div className="flex items-center gap-1 text-[14.5px] font-semibold text-white">
        <span
          onClick={onToggleVisibility}
          className="cursor-pointer select-none hover:opacity-90 transition"
        >
          Endekise (ETB)
        </span>
        <button
          id="telebirr-endekise-eye-btn"
          type="button"
          onClick={onToggleVisibility}
          className="p-0.5 hover:bg-white/20 active:scale-90 rounded-full transition cursor-pointer text-white flex items-center justify-center"
          title={isVisible ? 'Hide Endekise' : 'Show Endekise'}
          aria-label={isVisible ? 'Hide Endekise' : 'Show Endekise'}
        >
          {isVisible ? (
            <Eye className="w-4 h-4 text-white" strokeWidth={2.3} />
          ) : (
            <EyeOff className="w-4 h-4 text-white" strokeWidth={2.3} />
          )}
        </button>
      </div>
      <div
        id="telebirr-endekise-value"
        className="text-[18px] font-bold text-white tracking-wider pt-0.5 select-none font-sans"
      >
        {isVisible ? formatETB(amount) : '******'}
      </div>
    </div>
  );
};

/* ==========================================================================
   SUB-COMPONENT 9: RewardDisplay (Requirement 4, 5, 10)
   Right column: "Reward (ETB)" + Eye toggle + dynamic value
   ========================================================================== */
export interface RewardDisplayProps {
  amount: number;
  isVisible: boolean;
  onToggleVisibility: (e?: React.MouseEvent) => void;
}

export const RewardDisplay: React.FC<RewardDisplayProps> = ({
  amount,
  isVisible,
  onToggleVisibility,
}) => {
  return (
    <div id="telebirr-reward-section" className="text-left pl-2">
      <div className="flex items-center gap-1 text-[14.5px] font-semibold text-white">
        <span
          onClick={onToggleVisibility}
          className="cursor-pointer select-none hover:opacity-90 transition"
        >
          Reward (ETB)
        </span>
        <button
          id="telebirr-reward-eye-btn"
          type="button"
          onClick={onToggleVisibility}
          className="p-0.5 hover:bg-white/20 active:scale-90 rounded-full transition cursor-pointer text-white flex items-center justify-center"
          title={isVisible ? 'Hide Reward' : 'Show Reward'}
          aria-label={isVisible ? 'Hide Reward' : 'Show Reward'}
        >
          {isVisible ? (
            <Eye className="w-4 h-4 text-white" strokeWidth={2.3} />
          ) : (
            <EyeOff className="w-4 h-4 text-white" strokeWidth={2.3} />
          )}
        </button>
      </div>
      <div
        id="telebirr-reward-value"
        className="text-[18px] font-bold text-white tracking-wider pt-0.5 select-none font-sans"
      >
        {isVisible ? formatETB(amount) : '******'}
      </div>
    </div>
  );
};

/* ==========================================================================
   SUB-COMPONENT 10: BalanceSection (Requirement 10)
   Container wrapping BalanceDisplay, EndekiseDisplay, and RewardDisplay
   ========================================================================== */
export interface BalanceSectionProps {
  balance: number;
  endekise: number;
  reward: number;
  showBalance: boolean;
  showEndekise: boolean;
  showReward: boolean;
  onToggleBalance: (e?: React.MouseEvent) => void;
  onToggleEndekise: (e?: React.MouseEvent) => void;
  onToggleReward: (e?: React.MouseEvent) => void;
  onAmountClick?: () => void;
}

export const BalanceSection: React.FC<BalanceSectionProps> = ({
  balance,
  endekise,
  reward,
  showBalance,
  showEndekise,
  showReward,
  onToggleBalance,
  onToggleEndekise,
  onToggleReward,
  onAmountClick,
}) => {
  return (
    <div id="telebirr-balance-container" className="relative z-10 px-4">
      {/* Main Balance */}
      <BalanceDisplay
        balance={balance}
        isVisible={showBalance}
        onToggleVisibility={onToggleBalance}
        onAmountClick={onAmountClick}
      />

      {/* Sub-balances: Endekise & Reward twin columns */}
      <div className="grid grid-cols-2 gap-6 pt-2 pb-3.5 max-w-sm mx-auto">
        <EndekiseDisplay
          amount={endekise}
          isVisible={showEndekise}
          onToggleVisibility={onToggleEndekise}
        />
        <RewardDisplay
          amount={reward}
          isVisible={showReward}
          onToggleVisibility={onToggleReward}
        />
      </div>
    </div>
  );
};

/* ==========================================================================
   SUB-COMPONENT 11: OneAppBanner (Requirement 10, 14)
   Vibrant orange bottom banner: "ONE APP FOR ALL YOUR NEEDS!"
   ========================================================================== */
export const OneAppBanner: React.FC<{ text?: string; className?: string }> = ({
  text = 'ONE APP FOR ALL YOUR NEEDS!',
  className = '',
}) => {
  return (
    <div
      id="telebirr-one-app-banner"
      className={`relative z-10 bg-[#ffa012] text-white py-2 px-4 text-center font-black tracking-wider text-[12.5px] rounded-t-[20px] shadow-xs uppercase select-none ${className}`}
    >
      {text}
    </div>
  );
};

/* ==========================================================================
   COMPLETE RECONSTRUCTED COMPONENT: TelebirrHeaderCard (Requirement 10, 14, 15)
   Recreates the entire visible balance/header section as REAL React + TS components
   with authentic vector waves, single source of truth, and interactive controls
   ========================================================================== */
export interface TelebirrHeaderCardProps {
  onOpenProfile?: () => void;
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  onOpenLanguage?: () => void;
  onAmountClick?: () => void;
  onToast?: (msg: string) => void;
}

export const TelebirrHeaderCard: React.FC<TelebirrHeaderCardProps> = ({
  onOpenProfile,
  onOpenSearch,
  onOpenNotifications,
  onOpenLanguage,
  onAmountClick,
  onToast,
}) => {
  // Single Source of Truth: sync with central TelebirrService state
  const [account, setAccount] = useState<AccountData>(() => TelebirrService.getAccountData());
  const [isEditingNameInline, setIsEditingNameInline] = useState<boolean>(false);
  const [tempNameInput, setTempNameInput] = useState<string>('');

  // Subscribe to central service changes (Single Source of Truth)
  useEffect(() => {
    const syncState = (s: TelebirrAccountState) => {
      setAccount({
        name: s.userName || 'Leykun',
        balance: s.balance,
        endekise: s.endekiseBalance,
        reward: s.rewardBalance,
        showBalance: s.showBalance,
        showEndekise: s.showEndekise,
        showReward: s.showReward,
        notificationCount: s.notificationCount,
        language: s.language,
      });
    };

    // Initial sync
    syncState(TelebirrService.getState());

    // In-memory listener
    const unsubscribe = TelebirrService.subscribe(syncState);

    // Window custom event listener for multi-component sync
    const handleCustomUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail as TelebirrAccountState;
      if (detail) syncState(detail);
    };
    window.addEventListener('telebirr_account_updated', handleCustomUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('telebirr_account_updated', handleCustomUpdate);
    };
  }, []);

  // Independent Eye toggles (Requirement 5)
  const handleToggleBalance = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextVal = TelebirrService.toggleBalanceVisibility();
    onToast?.(nextVal ? 'Balance is now visible' : 'Balance is now hidden');
  };

  const handleToggleEndekise = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextVal = TelebirrService.toggleEndekiseVisibility();
    onToast?.(nextVal ? 'Endekise balance is now visible' : 'Endekise balance is now hidden');
  };

  const handleToggleReward = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextVal = TelebirrService.toggleRewardVisibility();
    onToast?.(nextVal ? 'Reward balance is now visible' : 'Reward balance is now hidden');
  };

  // Open inline name editor
  const handleStartEditName = () => {
    setTempNameInput(account.name);
    setIsEditingNameInline(true);
  };

  const handleSaveName = (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = tempNameInput.trim();
    if (clean) {
      TelebirrService.setName(clean);
      onToast?.(`Name updated to "${clean}"`);
    }
    setIsEditingNameInline(false);
  };

  return (
    <div
      id="telebirr-header-card-root"
      className="relative bg-gradient-to-b from-[#88c92b] via-[#83c426] to-[#7ebf23] text-white pt-1 overflow-hidden select-none"
    >
      {/* Authentic Dual-Focal Wave Graphics matching Screenshot */}
      <TelebirrRipples className="absolute inset-0 w-full h-full pointer-events-none opacity-90 z-0" />

      {/* Top Bar: Profile, Greeting, Search, Notification Bell, Language */}
      <HeaderTopBar
        name={account.name}
        notificationCount={account.notificationCount}
        language={account.language}
        onOpenProfile={onOpenProfile}
        onEditName={handleStartEditName}
        onOpenSearch={onOpenSearch}
        onOpenNotifications={onOpenNotifications}
        onOpenLanguage={onOpenLanguage}
      />

      {/* Inline Quick Name Editor (Popover when user taps greeting) */}
      {isEditingNameInline && (
        <div className="relative z-20 mx-4 my-2 p-3 bg-white/95 text-neutral-900 rounded-xl shadow-lg border border-lime-300 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
            <span className="text-xs font-bold text-neutral-700">Change Display Name</span>
            <button
              onClick={() => setIsEditingNameInline(false)}
              className="p-1 text-neutral-400 hover:text-neutral-700 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSaveName} className="flex gap-2">
            <input
              type="text"
              value={tempNameInput}
              onChange={(e) => setTempNameInput(e.target.value)}
              placeholder="e.g. Abebe or Leykun"
              className="flex-1 px-3 py-1.5 text-sm bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 font-semibold"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#83c426] text-white text-xs font-bold rounded-lg hover:bg-[#74b21d] transition flex items-center gap-1 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" /> Save
            </button>
          </form>
          <div className="flex items-center gap-2 mt-2 pt-1 text-[11px] text-neutral-500">
            <span>Quick test presets:</span>
            <button
              type="button"
              onClick={() => {
                TelebirrService.setName('Leykun');
                setIsEditingNameInline(false);
                onToast?.('Name changed to Leykun');
              }}
              className="px-2 py-0.5 bg-neutral-100 hover:bg-neutral-200 rounded text-neutral-800 font-medium cursor-pointer"
            >
              Leykun
            </button>
            <button
              type="button"
              onClick={() => {
                TelebirrService.setName('Abebe');
                setIsEditingNameInline(false);
                onToast?.('Name changed to Abebe');
              }}
              className="px-2 py-0.5 bg-neutral-100 hover:bg-neutral-200 rounded text-neutral-800 font-medium cursor-pointer"
            >
              Abebe
            </button>
          </div>
        </div>
      )}

      {/* Complete Balance Section */}
      <BalanceSection
        balance={account.balance}
        endekise={account.endekise}
        reward={account.reward}
        showBalance={account.showBalance}
        showEndekise={account.showEndekise}
        showReward={account.showReward}
        onToggleBalance={handleToggleBalance}
        onToggleEndekise={handleToggleEndekise}
        onToggleReward={handleToggleReward}
        onAmountClick={onAmountClick}
      />

      {/* Bottom Golden-Orange Banner */}
      <OneAppBanner />
    </div>
  );
};

/* ==========================================================================
   LIVE ACCOUNT DATA CONTROLLER (Requirement 17 Test Scenarios)
   Provides immediate one-click testing of all scenarios requested by user:
   - Scenario A: Name "Leykun" -> "Abebe"
   - Scenario B: Balance 41,865.79 -> 50,000.00
   - Scenario C: Reward 0 -> 500
   - Scenario D/E: Balance Eye Toggle
   - Scenario F: Endekise Eye Toggle
   - Scenario G: Reward Eye Toggle
   - Scenario H/I: Notification count 2 -> 5 -> 0
   - Scenario J: Transaction updates balance
   ========================================================================== */
export interface LiveAccountControllerProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const LiveAccountController: React.FC<LiveAccountControllerProps> = ({ isOpen, onClose, onToast }) => {
  const [account, setAccount] = useState<AccountData>(() => TelebirrService.getAccountData());
  const [nameInput, setNameInput] = useState<string>(account.name);
  const [balanceInput, setBalanceInput] = useState<string>(String(account.balance));
  const [endekiseInput, setEndekiseInput] = useState<string>(String(account.endekise));
  const [rewardInput, setRewardInput] = useState<string>(String(account.reward));
  const [notifInput, setNotifInput] = useState<string>(String(account.notificationCount));

  useEffect(() => {
    const unsub = TelebirrService.subscribe((s) => {
      const data: AccountData = {
        name: s.userName,
        balance: s.balance,
        endekise: s.endekiseBalance,
        reward: s.rewardBalance,
        showBalance: s.showBalance,
        showEndekise: s.showEndekise,
        showReward: s.showReward,
        notificationCount: s.notificationCount,
        language: s.language,
      };
      setAccount(data);
      setNameInput(data.name);
      setBalanceInput(String(data.balance));
      setEndekiseInput(String(data.endekise));
      setRewardInput(String(data.reward));
      setNotifInput(String(data.notificationCount));
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-3 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#83c426] to-[#6fa81e] text-white p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-white" />
            <div>
              <h3 className="font-bold text-sm">Account Data & Test Controller</h3>
              <p className="text-[11px] text-white/80">Real-time single source of truth mutations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Quick Scenario Test Suite (Requirement 17) */}
          <div className="bg-lime-50 rounded-xl p-3 border border-lime-200">
            <div className="font-bold text-neutral-800 mb-2 flex items-center justify-between">
              <span>Quick Test Scenarios (Prompt Spec)</span>
              <span className="text-[10px] bg-lime-600 text-white px-2 py-0.5 rounded-full font-semibold">1-Click</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  TelebirrService.setName('Abebe');
                  onToast('Test A: Name set to "Abebe" -> "Selam, Abebe"');
                }}
                className="p-1.5 bg-white hover:bg-lime-100 border border-lime-300 rounded text-left font-medium text-neutral-800 transition"
              >
                A. Name: Abebe
              </button>
              <button
                type="button"
                onClick={() => {
                  TelebirrService.setName('Leykun');
                  onToast('Test A: Name set to "Leykun" -> "Selam, Leykun"');
                }}
                className="p-1.5 bg-white hover:bg-lime-100 border border-lime-300 rounded text-left font-medium text-neutral-800 transition"
              >
                Reset Name: Leykun
              </button>
              <button
                type="button"
                onClick={() => {
                  TelebirrService.setBalance(50000);
                  onToast('Test B: Balance set to 50,000.00 ETB');
                }}
                className="p-1.5 bg-white hover:bg-lime-100 border border-lime-300 rounded text-left font-medium text-neutral-800 transition"
              >
                B. Balance: 50,000.00
              </button>
              <button
                type="button"
                onClick={() => {
                  TelebirrService.setBalance(41865.79);
                  onToast('Reset Balance: 41,865.79 ETB');
                }}
                className="p-1.5 bg-white hover:bg-lime-100 border border-lime-300 rounded text-left font-medium text-neutral-800 transition"
              >
                Reset: 41,865.79
              </button>
              <button
                type="button"
                onClick={() => {
                  TelebirrService.setReward(500);
                  onToast('Test C: Reward set to 500.00 ETB');
                }}
                className="p-1.5 bg-white hover:bg-lime-100 border border-lime-300 rounded text-left font-medium text-neutral-800 transition"
              >
                C. Reward: 500.00
              </button>
              <button
                type="button"
                onClick={() => {
                  TelebirrService.setReward(0);
                  onToast('Reward: 0.00 ETB');
                }}
                className="p-1.5 bg-white hover:bg-lime-100 border border-lime-300 rounded text-left font-medium text-neutral-800 transition"
              >
                Reward: 0.00
              </button>
              <button
                type="button"
                onClick={() => {
                  TelebirrService.setNotificationCount(5);
                  onToast('Test H: Notification Count -> 5');
                }}
                className="p-1.5 bg-white hover:bg-lime-100 border border-lime-300 rounded text-left font-medium text-neutral-800 transition"
              >
                H. Notif Count: 5
              </button>
              <button
                type="button"
                onClick={() => {
                  TelebirrService.setNotificationCount(0);
                  onToast('Test I: Notification Count -> 0 (Hidden)');
                }}
                className="p-1.5 bg-white hover:bg-lime-100 border border-lime-300 rounded text-left font-medium text-neutral-800 transition"
              >
                I. Notif Count: 0 (Hide)
              </button>
            </div>
          </div>

          {/* 1. User Name Controller */}
          <div className="space-y-1">
            <label className="font-bold text-neutral-700">1. User Name (user.name)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-neutral-300 rounded-lg font-semibold"
                placeholder="Name"
              />
              <button
                type="button"
                onClick={() => {
                  TelebirrService.setName(nameInput);
                  onToast(`Updated name to ${nameInput}`);
                }}
                className="px-3 py-1.5 bg-[#83c426] text-white font-bold rounded-lg hover:bg-[#74b21d]"
              >
                Apply
              </button>
            </div>
          </div>

          {/* 2. Main Balance Controller */}
          <div className="space-y-1">
            <label className="font-bold text-neutral-700">2. Main Balance (account.balance)</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-neutral-300 rounded-lg font-semibold"
                placeholder="Balance"
              />
              <button
                type="button"
                onClick={() => {
                  const num = parseFloat(balanceInput);
                  if (!isNaN(num)) {
                    TelebirrService.setBalance(num);
                    onToast(`Updated balance to ${formatETB(num)} ETB`);
                  }
                }}
                className="px-3 py-1.5 bg-[#83c426] text-white font-bold rounded-lg hover:bg-[#74b21d]"
              >
                Apply
              </button>
            </div>
            <div className="flex gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  TelebirrService.receiveMoney({
                    senderName: 'Test Deposit',
                    amount: 1000,
                  });
                  onToast('Transaction: +1,000 ETB Deposited!');
                }}
                className="flex-1 py-1 bg-neutral-100 hover:bg-neutral-200 rounded font-semibold text-neutral-800 flex items-center justify-center gap-1"
              >
                <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> +1,000 Deposit
              </button>
              <button
                type="button"
                onClick={() => {
                  TelebirrService.sendMoneyToMobile({
                    recipientName: 'Test Withdrawal',
                    recipientPhone: '0911000000',
                    amount: 500,
                  });
                  onToast('Transaction: -500 ETB Withdrawn!');
                }}
                className="flex-1 py-1 bg-neutral-100 hover:bg-neutral-200 rounded font-semibold text-neutral-800 flex items-center justify-center gap-1"
              >
                <ArrowUpRight className="w-3 h-3 text-red-600" /> -500 Withdraw
              </button>
            </div>
          </div>

          {/* 3 & 4. Endekise & Reward Controllers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-neutral-700">Endekise (ETB)</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  step="0.01"
                  value={endekiseInput}
                  onChange={(e) => setEndekiseInput(e.target.value)}
                  className="w-full px-2 py-1.5 border border-neutral-300 rounded-lg font-semibold"
                />
                <button
                  type="button"
                  onClick={() => {
                    const num = parseFloat(endekiseInput);
                    if (!isNaN(num)) {
                      TelebirrService.setEndekise(num);
                      onToast(`Endekise updated to ${formatETB(num)}`);
                    }
                  }}
                  className="px-2 py-1.5 bg-[#83c426] text-white font-bold rounded-lg"
                >
                  Set
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-neutral-700">Reward (ETB)</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  step="0.01"
                  value={rewardInput}
                  onChange={(e) => setRewardInput(e.target.value)}
                  className="w-full px-2 py-1.5 border border-neutral-300 rounded-lg font-semibold"
                />
                <button
                  type="button"
                  onClick={() => {
                    const num = parseFloat(rewardInput);
                    if (!isNaN(num)) {
                      TelebirrService.setReward(num);
                      onToast(`Reward updated to ${formatETB(num)}`);
                    }
                  }}
                  className="px-2 py-1.5 bg-[#83c426] text-white font-bold rounded-lg"
                >
                  Set
                </button>
              </div>
            </div>
          </div>

          {/* 5. Eye Visibility States */}
          <div className="space-y-1 pt-1">
            <label className="font-bold text-neutral-700">5. Eye Visibility States</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => TelebirrService.toggleBalanceVisibility()}
                className={`py-1 px-2 rounded font-semibold border text-center transition ${
                  account.showBalance ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                }`}
              >
                Balance: {account.showBalance ? 'Visible' : 'Masked'}
              </button>
              <button
                type="button"
                onClick={() => TelebirrService.toggleEndekiseVisibility()}
                className={`py-1 px-2 rounded font-semibold border text-center transition ${
                  account.showEndekise ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                }`}
              >
                Endekise: {account.showEndekise ? 'Visible' : 'Masked'}
              </button>
              <button
                type="button"
                onClick={() => TelebirrService.toggleRewardVisibility()}
                className={`py-1 px-2 rounded font-semibold border text-center transition ${
                  account.showReward ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                }`}
              >
                Reward: {account.showReward ? 'Visible' : 'Masked'}
              </button>
            </div>
          </div>

          {/* 6. Notification Count */}
          <div className="space-y-1">
            <label className="font-bold text-neutral-700">6. Notification Badge Count</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={notifInput}
                onChange={(e) => setNotifInput(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-neutral-300 rounded-lg font-semibold"
                placeholder="Count (0 hides badge)"
              />
              <button
                type="button"
                onClick={() => {
                  const num = parseInt(notifInput, 10);
                  if (!isNaN(num)) {
                    TelebirrService.setNotificationCount(num);
                    onToast(`Notification count updated to ${num}`);
                  }
                }}
                className="px-3 py-1.5 bg-[#83c426] text-white font-bold rounded-lg hover:bg-[#74b21d]"
              >
                Set
              </button>
            </div>
          </div>

          {/* 7. Language Selector */}
          <div className="space-y-1">
            <label className="font-bold text-neutral-700">7. Language</label>
            <div className="flex flex-wrap gap-1">
              {['English', 'Amharic (አማርኛ)', 'Afaan Oromoo', 'Tigrinya (ትግርኛ)', 'Somali (Soomaali)'].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    TelebirrService.setLanguage(lang);
                    onToast(`Language set to ${lang}`);
                  }}
                  className={`px-2 py-1 rounded text-xs font-semibold border transition ${
                    account.language === lang ? 'bg-[#83c426] text-white border-[#83c426]' : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  {lang.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 text-white font-bold text-xs rounded-xl hover:bg-neutral-800 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

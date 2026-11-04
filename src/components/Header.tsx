import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { AppsGridIcon, RefreshIcon, CbeLoadingStatusIcon } from './CbeCustomIcons';
import { PhoneSettingsService } from '../services/phoneSettingsService';

interface HeaderProps {
  userName?: string;
  onOpenMenu?: () => void;
  onRefresh?: () => void;
  onOpenSearch?: () => void;
  onOpenProfile?: () => void;
  selectedLanguage?: string;
  onChangeLanguage?: (lang: string) => void;
  isRefreshing?: boolean;
  showProfileIcon?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  userName = 'Leykun',
  onOpenMenu,
  onRefresh,
  onOpenSearch,
  onOpenProfile,
  selectedLanguage = 'English',
  onChangeLanguage,
  isRefreshing = false,
  showProfileIcon = true,
}) => {
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [isIPhone, setIsIPhone] = useState<boolean>(() => PhoneSettingsService.isIPhoneMode());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return PhoneSettingsService.subscribe(() => {
      setIsIPhone(PhoneSettingsService.isIPhoneMode());
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languages = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'am', label: 'Amharic', native: 'አማርኛ' },
  ];

  return (
    <header className={`relative z-30 ${isIPhone ? 'pt-[max(calc(env(safe-area-inset-top,0px)-22px),12px)]' : 'pt-[max(env(safe-area-inset-top,0px),24px)]'} px-4 pb-1.5 max-w-md mx-auto w-full flex items-center justify-between text-white select-none`}>
      {/* Left Section: 2x2 Rounded Squares Apps Grid Menu Button & User Greeting */}
      <div className="flex items-center gap-2.5">
        {/* Apps Grid Menu Button */}
        <button
          id="btn-header-menu"
          aria-label="Open App Menu"
          onClick={onOpenMenu}
          className="w-10 h-10 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all flex items-center justify-center flex-shrink-0 cursor-pointer border border-white/20 backdrop-blur-xs shadow-xs"
        >
          {/* 1. Apps Grid Icon: 2x2 grid of 4 rounded-square outlines */}
          <AppsGridIcon size={20} className="text-white" strokeWidth={2.2} />
        </button>

        {/* Greeting Text */}
        <div className="flex flex-col justify-center">
          <p className="text-[13px] sm:text-[14px] text-white/85 font-normal leading-tight">
            Hello,
          </p>
          <h2 className="text-[19px] sm:text-[21px] font-bold text-white tracking-tight leading-none mt-0.5">
            {userName}
          </h2>
        </div>
      </div>

      {/* Right Controls: Language Selector, Refresh Icon, Processing/Status Icon */}
      <div className="flex items-center gap-2">
        {/* Language Selector Pill */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="btn-language-selector"
            aria-label="Select Language"
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="bg-white/15 hover:bg-white/25 border border-white/20 px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 text-white transition cursor-pointer backdrop-blur-xs active:scale-95"
          >
            <span>{selectedLanguage}</span>
            <ChevronDown className={`w-3.5 h-3.5 opacity-90 transition-transform duration-200 ${langDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Language Dropdown Menu */}
          {langDropdownOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-white rounded-2xl shadow-xl py-1.5 border border-gray-100 text-gray-800 z-50 animate-in fade-in zoom-in-95 duration-150">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    onChangeLanguage?.(lang.label);
                    setLangDropdownOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-purple-50 hover:text-[#781FA5] flex items-center justify-between transition cursor-pointer"
                >
                  <span>{lang.native}</span>
                  {selectedLanguage === lang.label && (
                    <Check className="w-3.5 h-3.5 text-[#781FA5]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 1. Refresh / Reload Icon Button (Broken circle arrow, upper-left arrowhead) */}
        <button
          id="btn-header-refresh"
          aria-label="Refresh Balance"
          onClick={onRefresh}
          className={`w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition cursor-pointer backdrop-blur-xs active:scale-95 ${
            isRefreshing ? 'animate-spin' : ''
          }`}
          title="Refresh / Reload"
        >
          <RefreshIcon size={19} className="text-white" />
        </button>

        {/* 2. Loading / Processing / Status / Profile Icon Button */}
        {showProfileIcon && (
          <button
            id="btn-header-status"
            aria-label="Account Status / Profile"
            onClick={onOpenProfile || onOpenSearch}
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition cursor-pointer backdrop-blur-xs active:scale-95"
            title="Account Status & Settings"
          >
            <CbeLoadingStatusIcon size={18} className="text-white" strokeWidth={1.4} />
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;


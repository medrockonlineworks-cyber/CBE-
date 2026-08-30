import React, { useState, useRef, useEffect } from 'react';
import { RotateCw, Search, ChevronDown, Check } from 'lucide-react';

interface HeaderProps {
  userName?: string;
  onOpenMenu?: () => void;
  onRefresh?: () => void;
  onOpenSearch?: () => void;
  selectedLanguage?: string;
  onChangeLanguage?: (lang: string) => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  userName = 'Abdurahman',
  onOpenMenu,
  onRefresh,
  onOpenSearch,
  selectedLanguage = 'English',
  onChangeLanguage,
  isRefreshing = false,
}) => {
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <header className="relative z-30 pt-4 px-4 pb-2 max-w-md mx-auto w-full flex items-center justify-between text-white select-none">
      {/* Left Section: 2x2 Grid Menu Button & User Greeting */}
      <div className="flex items-center gap-2.5">
        {/* Circular Menu Button */}
        <button
          id="btn-header-menu"
          aria-label="Open App Menu"
          onClick={onOpenMenu}
          className="w-9 h-9 rounded-2xl bg-white/20 hover:bg-white/30 active:scale-95 transition-all flex items-center justify-center flex-shrink-0 cursor-pointer border border-white/25 backdrop-blur-xs shadow-xs"
        >
          <div className="grid grid-cols-2 gap-1 p-0.5">
            <div className="w-1.5 h-1.5 rounded-full border border-white/90 bg-white/40" />
            <div className="w-1.5 h-1.5 rounded-full border border-white/90 bg-white/40" />
            <div className="w-1.5 h-1.5 rounded-full border border-white/90 bg-white/40" />
            <div className="w-1.5 h-1.5 rounded-full border border-white/90 bg-white/40" />
          </div>
        </button>

        {/* Greeting Text */}
        <div>
          <p className="text-[11px] text-white/80 font-normal leading-none">
            Hello,
          </p>
          <h2 className="text-base font-extrabold text-white tracking-tight leading-tight mt-0.5">
            {userName}
          </h2>
        </div>
      </div>

      {/* Right Controls: Language Selector & Action Circles */}
      <div className="flex items-center gap-2">
        {/* Language Selector Pill */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="btn-language-selector"
            aria-label="Select Language"
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="bg-white/20 hover:bg-white/30 border border-white/25 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 text-white transition cursor-pointer backdrop-blur-xs active:scale-95"
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

        {/* Refresh Button */}
        <button
          id="btn-header-refresh"
          aria-label="Refresh Balance"
          onClick={onRefresh}
          className={`w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 border border-white/25 flex items-center justify-center text-white transition cursor-pointer backdrop-blur-xs active:scale-95 ${
            isRefreshing ? 'animate-spin' : ''
          }`}
          title="Refresh Balance"
        >
          <RotateCw className="w-4 h-4 stroke-[2.4]" />
        </button>

        {/* Search Button */}
        <button
          id="btn-header-search"
          aria-label="Search Transactions & Services"
          onClick={onOpenSearch}
          className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 border border-white/25 flex items-center justify-center text-white transition cursor-pointer backdrop-blur-xs active:scale-95"
          title="Search"
        >
          <Search className="w-4 h-4 stroke-[2.4]" />
        </button>
      </div>
    </header>
  );
};

export default Header;

import React, { useRef, useEffect } from 'react';
import { useEthiopianNameAutocomplete } from '../../hooks/useEthiopianNameAutocomplete';
import { EthiopianNameAutocompleteProps } from './EthiopianNameAutocomplete.types';
import { 
  User, 
  Check, 
  Sparkles, 
  X, 
  Loader2, 
  ChevronDown,
  Flame,
  ShieldAlert
} from 'lucide-react';

export default function EthiopianNameAutocomplete({
  id = 'ethiopian-name-input',
  value,
  onChange,
  onSelect,
  label,
  placeholder = 'e.g. Abebe, Dawit, Selam, Meron...',
  required = false,
  disabled = false,
  genderFilter,
  maxSuggestions = 8,
  debounceMs = 250,
  className = '',
  inputClassName = '',
  dropdownClassName = '',
  error,
  helperText,
  showGenderBadge = true,
  showPopularityBadge = true,
  allowManualEntry = true,
  extractActiveToken = false,
  leftIcon,
  theme = 'cbe',
  ...rest
}: EthiopianNameAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = `${id}-listbox`;

  const {
    query,
    suggestions,
    isLoading,
    isOpen,
    setIsOpen,
    highlightedIndex,
    setHighlightedIndex,
    handleInputChange,
    handleSelect,
    clear,
    handleKeyDown,
    searchTerm
  } = useEthiopianNameAutocomplete({
    initialValue: value,
    maxSuggestions,
    genderFilter,
    debounceMs,
    onSelect,
    onChange,
    extractActiveToken
  });

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  // Render highlighted text matching query characters
  const renderHighlightedName = (name: string, highlightRanges: [number, number][]) => {
    if (!highlightRanges || highlightRanges.length === 0) {
      return <span>{name}</span>;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    highlightRanges.forEach(([start, end], idx) => {
      if (start > lastIndex) {
        elements.push(
          <span key={`text-${idx}`}>{name.substring(lastIndex, start)}</span>
        );
      }
      elements.push(
        <mark
          key={`mark-${idx}`}
          className="bg-amber-400/20 text-amber-900 font-black rounded px-0.5"
        >
          {name.substring(start, end)}
        </mark>
      );
      lastIndex = end;
    });

    if (lastIndex < name.length) {
      elements.push(
        <span key={`text-end`}>{name.substring(lastIndex)}</span>
      );
    }

    return <>{elements}</>;
  };

  // Styling by theme
  const getThemeStyles = () => {
    if (theme === 'dark') {
      return {
        input: 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50',
        dropdown: 'bg-slate-900 border-slate-700 shadow-2xl text-slate-200',
        itemHover: 'hover:bg-slate-800 focus:bg-slate-800',
        itemActive: 'bg-amber-400/10 text-amber-300 border-l-2 border-amber-400',
        label: 'text-slate-300 font-semibold',
        helper: 'text-slate-400'
      };
    }
    // Default CBE Gold & White Theme
    return {
      input: 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#7b1fa2] focus:ring-2 focus:ring-[#7b1fa2]/15',
      dropdown: 'bg-white border-slate-200 shadow-2xl text-slate-800',
      itemHover: 'hover:bg-purple-50/80',
      itemActive: 'bg-purple-50 text-[#7b1fa2] border-l-2 border-[#7b1fa2] font-semibold',
      label: 'text-slate-700 font-bold',
      helper: 'text-slate-500'
    };
  };

  const themeStyles = getThemeStyles();

  return (
    <div id={`${id}-wrapper`} ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor={id} className={`block text-xs uppercase tracking-wider ${themeStyles.label}`}>
            {label} {required && <span className="text-rose-500 font-bold">*</span>}
          </label>
          <span className="text-[10px] font-mono text-purple-700/80 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 flex items-center gap-1 font-semibold">
            <Sparkles className="w-2.5 h-2.5 text-[#dfa04c]" />
            Ethiopian Name Suggestion
          </span>
        </div>
      )}

      {/* Input container */}
      <div className="relative flex items-center">
        {leftIcon ? (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
            {leftIcon}
          </div>
        ) : (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-purple-700/60">
            <User className="w-4 h-4" />
          </div>
        )}

        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            isOpen && highlightedIndex >= 0 && suggestions[highlightedIndex]
              ? `${id}-option-${highlightedIndex}`
              : undefined
          }
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          spellCheck="false"
          className={`w-full py-3.5 pl-10 pr-12 rounded-xl border text-sm font-medium transition duration-150 outline-none ${themeStyles.input} ${
            error ? 'border-rose-400 focus:border-rose-500 ring-rose-200' : ''
          } ${inputClassName}`}
          {...rest}
        />

        {/* Right side controls (Spinner, Clear, Dropdown indicator) */}
        <div className="absolute right-3 flex items-center gap-1.5">
          {isLoading && (
            <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
          )}

          {query && !disabled && (
            <button
              id={`${id}-btn-clear`}
              type="button"
              onClick={clear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              title="Clear input"
              aria-label="Clear name input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            id={`${id}-btn-toggle-dropdown`}
            type="button"
            onClick={() => {
              if (!disabled) {
                setIsOpen(!isOpen);
                inputRef.current?.focus();
              }
            }}
            tabIndex={-1}
            className="p-1 text-slate-400 hover:text-slate-600 transition"
            aria-label="Toggle Ethiopian name suggestions"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#7b1fa2]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Helper text / Error */}
      {error ? (
        <p className="mt-1 text-xs text-rose-500 font-medium flex items-center gap-1">
          <ShieldAlert className="w-3 h-3" />
          {error}
        </p>
      ) : helperText ? (
        <p className={`mt-1 text-xs ${themeStyles.helper}`}>{helperText}</p>
      ) : null}

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className={`absolute left-0 right-0 top-full mt-1.5 max-h-72 overflow-y-auto rounded-2xl border z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100/50 ${themeStyles.dropdown} ${dropdownClassName}`}
        >
          {/* Header info banner */}
          <div className="px-3.5 py-1.5 text-[11px] font-medium flex items-center justify-between text-slate-400 border-b border-slate-100">
            <span>
              {searchTerm ? `Suggestions for "${searchTerm}"` : 'Popular Ethiopian Names'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {suggestions.length} found
            </span>
          </div>

          {/* Suggestions List */}
          {suggestions.length > 0 ? (
            suggestions.map((sug, index) => {
              const isSelected = highlightedIndex === index;
              return (
                <div
                  key={sug.item.id || index}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => handleSelect(sug)}
                  className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer text-sm transition select-none ${themeStyles.itemHover} ${
                    isSelected ? themeStyles.itemActive : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Gender badge indicator */}
                    {showGenderBadge && (
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${
                          sug.item.gender === 'male'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : sug.item.gender === 'female'
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : 'bg-purple-50 text-purple-700 border border-purple-100'
                        }`}
                        title={`Gender: ${sug.item.gender || 'Unisex'}`}
                      >
                        {sug.item.gender ? sug.item.gender.charAt(0) : 'U'}
                      </span>
                    )}

                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {renderHighlightedName(sug.item.name, sug.highlightRanges)}
                      </p>
                      {sug.item.category && (
                        <p className="text-[10px] text-slate-400 font-normal">
                          {sug.item.category}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Popularity metric badge */}
                    {showPopularityBadge && sug.item.usage_count > 0 && (
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60 flex items-center gap-1 font-semibold">
                        <Flame className="w-2.5 h-2.5 text-amber-500" />
                        {sug.item.usage_count}
                      </span>
                    )}

                    {/* Exact / Selection mark */}
                    {query.toLowerCase() === sug.item.name.toLowerCase() && (
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-5 text-center text-xs text-slate-500">
              <p className="font-medium text-slate-700">No matching name in database</p>
              {allowManualEntry && (
                <p className="text-[11px] text-slate-400 mt-1">
                  You can keep &quot;<span className="text-[#7b1fa2] font-semibold">{query}</span>&quot; — custom Ethiopian names are fully accepted!
                </p>
              )}
            </div>
          )}

          {/* Footer note informing user that manual entry is always supported */}
          {allowManualEntry && (
            <div className="px-3.5 py-2 bg-slate-50/80 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-100">
              <span>Ethiopian Latin names only</span>
              <span className="font-mono text-slate-400">Enter / Tab to select</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

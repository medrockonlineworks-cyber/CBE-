import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ethiopianNameService } from '../services/ethiopianNameService';
import { 
  EthiopianName, 
  EthiopianNameSearchResult, 
  EthiopianNameGender,
  EthiopianFullNameSuggestion 
} from '../types/ethiopianName';

interface UseEthiopianNameAutocompleteProps {
  initialValue?: string;
  maxSuggestions?: number;
  genderFilter?: EthiopianNameGender;
  debounceMs?: number;
  onSelect?: (name: string, item?: EthiopianName) => void;
  onChange?: (value: string) => void;
  extractActiveToken?: boolean;
  suggestFullNames?: boolean; // Set to true by default to suggest full 3-part names like Leykun Jemaneh Ylma
}

export function useEthiopianNameAutocomplete({
  initialValue = '',
  maxSuggestions = 8,
  genderFilter,
  debounceMs = 100,
  onSelect,
  onChange,
  extractActiveToken = false,
  suggestFullNames = true
}: UseEthiopianNameAutocompleteProps = {}) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<EthiopianNameSearchResult[]>([]);
  const [fullNameSuggestions, setFullNameSuggestions] = useState<EthiopianFullNameSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const requestTokenRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine what query string to send to the search service
  const getSearchTerm = useCallback((rawQuery: string): string => {
    if (!extractActiveToken) return rawQuery.trim();
    const tokens = rawQuery.trimStart().split(/\s+/);
    return tokens[tokens.length - 1] || '';
  }, [extractActiveToken]);

  // Core search function
  const performSearch = useCallback(async (currentQuery: string, token: number) => {
    const term = getSearchTerm(currentQuery);
    setIsLoading(true);

    try {
      // 1. Fetch single name suggestions
      const resultsPromise = ethiopianNameService.searchEthiopianNames(term, maxSuggestions, genderFilter);
      
      // 2. Fetch full 3-part name suggestions if enabled (e.g. "Leykun Jemaneh Ylma")
      const fullNamesPromise = suggestFullNames
        ? ethiopianNameService.searchEthiopianFullNames(currentQuery, 5)
        : Promise.resolve([]);

      const [results, fullNames] = await Promise.all([resultsPromise, fullNamesPromise]);

      if (token === requestTokenRef.current) {
        setSuggestions(results);
        setFullNameSuggestions(fullNames);
        setHighlightedIndex(-1);
        setIsLoading(false);
      }
    } catch (err) {
      if (token === requestTokenRef.current) {
        setSuggestions([]);
        setFullNameSuggestions([]);
        setIsLoading(false);
      }
    }
  }, [getSearchTerm, maxSuggestions, genderFilter, suggestFullNames]);

  // Trigger search when isOpen becomes true or query changes
  const triggerSearch = useCallback((newQuery: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const currentToken = ++requestTokenRef.current;

    // Run immediately for responsive local experience
    performSearch(newQuery, currentToken);
  }, [performSearch]);

  // Synchronize when initialValue changes externally
  useEffect(() => {
    if (initialValue !== undefined && initialValue !== query) {
      setQuery(initialValue);
      if (isOpen) {
        triggerSearch(initialValue);
      }
    }
  }, [initialValue, isOpen, triggerSearch]);

  // When dropdown opens, immediately load matching or popular suggestions
  const handleOpenDropdown = useCallback(() => {
    setIsOpen(true);
    triggerSearch(query);
  }, [query, triggerSearch]);

  // Listen for database changes to refresh suggestions live
  useEffect(() => {
    const handleDbUpdate = () => {
      if (isOpen) {
        triggerSearch(query);
      }
    };
    window.addEventListener('ethiopian_names_updated', handleDbUpdate);
    return () => window.removeEventListener('ethiopian_names_updated', handleDbUpdate);
  }, [isOpen, query, triggerSearch]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement> | string) => {
    const val = typeof e === 'string' ? e : e.target.value;
    setQuery(val);
    setIsOpen(true);
    onChange?.(val);
    triggerSearch(val);
  }, [onChange, triggerSearch]);

  const handleSelect = useCallback((suggestion: EthiopianNameSearchResult | EthiopianName | EthiopianFullNameSuggestion | string) => {
    let selectedName = '';
    let selectedItem: EthiopianName | undefined = undefined;

    if (typeof suggestion === 'string') {
      selectedName = suggestion;
    } else if ('fullName' in suggestion) {
      // It's a full 3-part name suggestion like "Leykun Jemaneh Ylma"
      selectedName = suggestion.fullName;
    } else if ('item' in suggestion) {
      selectedName = suggestion.item.name;
      selectedItem = suggestion.item;
    } else {
      selectedName = suggestion.name;
      selectedItem = suggestion;
    }

    let finalQuery = selectedName;
    if (extractActiveToken && !('fullName' in (suggestion as any))) {
      const tokens = query.trimStart().split(/\s+/);
      if (tokens.length > 1) {
        tokens[tokens.length - 1] = selectedName;
        finalQuery = tokens.join(' ');
      } else {
        finalQuery = selectedName;
      }
    }

    setQuery(finalQuery);
    setIsOpen(false);
    setHighlightedIndex(-1);

    if (selectedItem) {
      ethiopianNameService.incrementNameUsage(selectedItem.id);
    }

    onSelect?.(finalQuery, selectedItem);
    onChange?.(finalQuery);
  }, [extractActiveToken, query, onSelect, onChange]);

  const clear = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setFullNameSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onChange?.('');
  }, [onChange]);

  // Total selectable items count across full names and individual names
  const totalItemCount = fullNameSuggestions.length + suggestions.length;

  const getItemAtIndex = useCallback((index: number) => {
    if (index < fullNameSuggestions.length) {
      return fullNameSuggestions[index];
    }
    return suggestions[index - fullNameSuggestions.length];
  }, [fullNameSuggestions, suggestions]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || totalItemCount === 0) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        handleOpenDropdown();
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < totalItemCount - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : totalItemCount - 1));
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < totalItemCount) {
          e.preventDefault();
          const target = getItemAtIndex(highlightedIndex);
          if (target) handleSelect(target);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        if (highlightedIndex >= 0 && highlightedIndex < totalItemCount) {
          const target = getItemAtIndex(highlightedIndex);
          if (target) handleSelect(target);
        } else {
          setIsOpen(false);
        }
        break;
      default:
        break;
    }
  }, [isOpen, totalItemCount, highlightedIndex, getItemAtIndex, handleSelect, handleOpenDropdown]);

  return {
    query,
    setQuery,
    suggestions,
    fullNameSuggestions,
    isLoading,
    isOpen,
    setIsOpen,
    highlightedIndex,
    setHighlightedIndex,
    handleInputChange,
    handleSelect,
    clear,
    handleKeyDown,
    searchTerm: getSearchTerm(query),
    handleOpenDropdown
  };
}

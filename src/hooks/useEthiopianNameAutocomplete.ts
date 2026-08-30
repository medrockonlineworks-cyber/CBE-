import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ethiopianNameService } from '../services/ethiopianNameService';
import { EthiopianName, EthiopianNameSearchResult, EthiopianNameGender } from '../types/ethiopianName';
import { debounce } from '../utils/debounce';

interface UseEthiopianNameAutocompleteProps {
  initialValue?: string;
  maxSuggestions?: number;
  genderFilter?: EthiopianNameGender;
  debounceMs?: number;
  onSelect?: (name: string, item?: EthiopianName) => void;
  onChange?: (value: string) => void;
  extractActiveToken?: boolean; // When true, searches for the last word token being typed
}

export function useEthiopianNameAutocomplete({
  initialValue = '',
  maxSuggestions = 8,
  genderFilter,
  debounceMs = 250,
  onSelect,
  onChange,
  extractActiveToken = false
}: UseEthiopianNameAutocompleteProps = {}) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<EthiopianNameSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const requestTokenRef = useRef(0);
  const isSelectedRef = useRef(false);

  // Synchronize when initialValue changes externally
  useEffect(() => {
    if (initialValue !== undefined && initialValue !== query && !isOpen) {
      setQuery(initialValue);
    }
  }, [initialValue]);

  // Determine what query string to send to the search service
  const getSearchTerm = useCallback((rawQuery: string): string => {
    if (!extractActiveToken) return rawQuery;
    const tokens = rawQuery.trimStart().split(' ');
    return tokens[tokens.length - 1] || '';
  }, [extractActiveToken]);

  // Core search function with cancellation token
  const performSearch = useCallback(async (currentQuery: string, token: number) => {
    const term = getSearchTerm(currentQuery);
    setIsLoading(true);

    try {
      const results = await ethiopianNameService.searchEthiopianNames(term, maxSuggestions, genderFilter);
      // Ensure no race conditions from stale requests
      if (token === requestTokenRef.current) {
        setSuggestions(results);
        setHighlightedIndex(-1);
        setIsLoading(false);
      }
    } catch (err) {
      if (token === requestTokenRef.current) {
        setSuggestions([]);
        setIsLoading(false);
      }
    }
  }, [getSearchTerm, maxSuggestions, genderFilter]);

  // Debounced searcher
  const debouncedSearch = useRef(
    debounce((currentQuery: string, token: number) => {
      performSearch(currentQuery, token);
    }, debounceMs)
  ).current;

  // Listen for database changes to refresh suggestions live
  useEffect(() => {
    const handleDbUpdate = () => {
      if (isOpen) {
        requestTokenRef.current += 1;
        performSearch(query, requestTokenRef.current);
      }
    };
    window.addEventListener('ethiopian_names_updated', handleDbUpdate);
    return () => window.removeEventListener('ethiopian_names_updated', handleDbUpdate);
  }, [isOpen, query, performSearch]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement> | string) => {
    const val = typeof e === 'string' ? e : e.target.value;
    isSelectedRef.current = false;
    setQuery(val);
    setIsOpen(true);
    onChange?.(val);

    const nextToken = ++requestTokenRef.current;
    debouncedSearch(val, nextToken);
  }, [debouncedSearch, onChange]);

  const handleSelect = useCallback((suggestion: EthiopianNameSearchResult | EthiopianName | string) => {
    let selectedName = '';
    let selectedItem: EthiopianName | undefined = undefined;

    if (typeof suggestion === 'string') {
      selectedName = suggestion;
    } else if ('item' in suggestion) {
      selectedName = suggestion.item.name;
      selectedItem = suggestion.item;
    } else {
      selectedName = suggestion.name;
      selectedItem = suggestion;
    }

    let finalQuery = selectedName;
    if (extractActiveToken) {
      const tokens = query.trimStart().split(' ');
      tokens[tokens.length - 1] = selectedName;
      finalQuery = tokens.join(' ');
    }

    isSelectedRef.current = true;
    setQuery(finalQuery);
    setIsOpen(false);
    setHighlightedIndex(-1);

    if (selectedItem) {
      // Increment usage count in background
      ethiopianNameService.incrementNameUsage(selectedItem.id);
    }

    onSelect?.(finalQuery, selectedItem);
    onChange?.(finalQuery);
  }, [extractActiveToken, query, onSelect, onChange]);

  const clear = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onChange?.('');
  }, [onChange]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && query.length > 0) {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          e.preventDefault();
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex]);
        } else {
          setIsOpen(false);
        }
        break;
      default:
        break;
    }
  }, [isOpen, suggestions, highlightedIndex, query, handleSelect]);

  return {
    query,
    setQuery,
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
    searchTerm: getSearchTerm(query)
  };
}

import { InputHTMLAttributes, ReactNode } from 'react';
import { EthiopianName, EthiopianNameGender } from '../../types/ethiopianName';

export interface EthiopianNameAutocompleteProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onSelect' | 'value'> {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (name: string, item?: EthiopianName) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  genderFilter?: EthiopianNameGender;
  maxSuggestions?: number;
  debounceMs?: number;
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  error?: string;
  helperText?: string;
  showGenderBadge?: boolean;
  showPopularityBadge?: boolean;
  allowManualEntry?: boolean; // Defaults to true (never forces selection)
  extractActiveToken?: boolean; // Allows tokenized 3-part name suggestions in single field
  suggestFullNames?: boolean; // When true, includes authentic full 3-part Ethiopian names (e.g. Leykun Jemaneh Ylma)
  leftIcon?: ReactNode;
  theme?: 'dark' | 'light' | 'cbe';
}

export type EthiopianNameInputMethod = 'split' | 'single' | 'wizard' | 'presets';

export interface EthiopianThreePartNameProps {
  idPrefix?: string;
  firstName: string;
  fathersName: string;
  grandfathersName: string;
  onChange: (parts: { firstName: string; fathersName: string; grandfathersName: string; fullName: string }) => void;
  required?: boolean;
  disabled?: boolean;
  theme?: 'dark' | 'light' | 'cbe';
  className?: string;
  defaultInputMethod?: EthiopianNameInputMethod;
  allowMethodSwitching?: boolean;
  showAmharicPreview?: boolean;
  showQuickActions?: boolean;
}

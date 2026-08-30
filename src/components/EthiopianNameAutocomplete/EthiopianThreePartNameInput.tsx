import React from 'react';
import EthiopianNameAutocomplete from './EthiopianNameAutocomplete';
import { EthiopianThreePartNameProps } from './EthiopianNameAutocomplete.types';
import { Sparkles, UserCheck } from 'lucide-react';

export default function EthiopianThreePartNameInput({
  idPrefix = 'eth-3part',
  firstName,
  fathersName,
  grandfathersName,
  onChange,
  required = false,
  disabled = false,
  theme = 'cbe',
  className = ''
}: EthiopianThreePartNameProps) {
  const updateParts = (
    nextFirst: string,
    nextFather: string,
    nextGrandfather: string
  ) => {
    const parts = [nextFirst.trim(), nextFather.trim(), nextGrandfather.trim()].filter(Boolean);
    const fullName = parts.join(' ');
    onChange({
      firstName: nextFirst,
      fathersName: nextFather,
      grandfathersName: nextGrandfather,
      fullName
    });
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-[#7b1fa2]" />
          Ethiopian 3-Part Name Convention
        </span>
        <span className="text-[10px] text-slate-400 font-mono">
          First + Father + Grandfather
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* 1. First Name */}
        <EthiopianNameAutocomplete
          id={`${idPrefix}-first-name`}
          label="First Name"
          value={firstName}
          onChange={(val) => updateParts(val, fathersName, grandfathersName)}
          placeholder="e.g. Abebe"
          required={required}
          disabled={disabled}
          theme={theme}
          maxSuggestions={6}
        />

        {/* 2. Father's Name (Patronymic) */}
        <EthiopianNameAutocomplete
          id={`${idPrefix}-father-name`}
          label="Father's Name"
          value={fathersName}
          onChange={(val) => updateParts(firstName, val, grandfathersName)}
          placeholder="e.g. Kebede"
          required={required}
          disabled={disabled}
          genderFilter="male"
          theme={theme}
          maxSuggestions={6}
        />

        {/* 3. Grandfather's Name */}
        <EthiopianNameAutocomplete
          id={`${idPrefix}-grandfather-name`}
          label="Grandfather's Name"
          value={grandfathersName}
          onChange={(val) => updateParts(firstName, fathersName, val)}
          placeholder="e.g. Tadesse"
          disabled={disabled}
          genderFilter="male"
          theme={theme}
          maxSuggestions={6}
        />
      </div>

      {/* Preview Full Name */}
      {(firstName || fathersName || grandfathersName) && (
        <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#dfa04c]" />
            <span className="text-xs text-slate-600 font-medium">Full Name Preview:</span>
            <span className="text-xs font-bold text-slate-900">
              {[firstName, fathersName, grandfathersName].filter(Boolean).join(' ') || '—'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

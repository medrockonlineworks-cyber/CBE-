import React, { useState, useRef, useEffect } from 'react';
import EthiopianNameAutocomplete from './EthiopianNameAutocomplete';
import { EthiopianThreePartNameProps, EthiopianNameInputMethod } from './EthiopianNameAutocomplete.types';
import { ethiopianNameService } from '../../services/ethiopianNameService';
import { EthiopianName, EthiopianNameGender } from '../../types/ethiopianName';
import { transliterateToAmharic } from '../../utils/amharicTransliteration';
import { 
  UserCheck, 
  Sparkles, 
  Layers, 
  AlignLeft, 
  Compass, 
  Star, 
  RotateCcw, 
  Shuffle, 
  Copy, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  ChevronRight,
  Flame,
  User,
  Users,
  Search,
  CheckCircle2,
  X
} from 'lucide-react';

const CURATED_ETHIOPIAN_COMBOS = [
  { firstName: 'Leykun', fathersName: 'Jemaneh', grandfathersName: 'Ylma', category: 'Traditional' },
  { firstName: 'Leykun', fathersName: 'Jemaneh', grandfathersName: 'Yilma', category: 'Traditional' },
  { firstName: 'Abebe', fathersName: 'Bikila', grandfathersName: 'Demisse', category: 'Athletes & Icons' },
  { firstName: 'Abebe', fathersName: 'Kebede', grandfathersName: 'Tadesse', category: 'Traditional' },
  { firstName: 'Selamawit', fathersName: 'Tekle', grandfathersName: 'Haile', category: 'Traditional' },
  { firstName: 'Dawit', fathersName: 'Yohannes', grandfathersName: 'Mekonnen', category: 'Christian' },
  { firstName: 'Meron', fathersName: 'Tesfaye', grandfathersName: 'Alemu', category: 'Traditional' },
  { firstName: 'Haile', fathersName: 'Gebrselassie', grandfathersName: 'Bireda', category: 'Athletes & Icons' },
  { firstName: 'Samuel', fathersName: 'Getachew', grandfathersName: 'Girma', category: 'Christian' },
  { firstName: 'Bereket', fathersName: 'Solomon', grandfathersName: 'Worku', category: 'Traditional' },
  { firstName: 'Kalkidan', fathersName: 'Asfaw', grandfathersName: 'Berhanu', category: 'Christian' },
  { firstName: 'Mohammed', fathersName: 'Ahmed', grandfathersName: 'Hassen', category: 'Muslim' },
  { firstName: 'Abel', fathersName: 'Mulugeta', grandfathersName: 'Kassahun', category: 'Modern' },
  { firstName: 'Liya', fathersName: 'Endalkachew', grandfathersName: 'Zewdu', category: 'Christian' },
  { firstName: 'Tolasa', fathersName: 'Gemechu', grandfathersName: 'Chala', category: 'Oromo' },
  { firstName: 'Henok', fathersName: 'Tadesse', grandfathersName: 'Desta', category: 'Traditional' }
];

export default function EthiopianThreePartNameInput({
  idPrefix = 'eth-3part',
  firstName,
  fathersName,
  grandfathersName,
  onChange,
  required = false,
  disabled = false,
  theme = 'cbe',
  className = '',
  defaultInputMethod = 'split',
  allowMethodSwitching = true,
  showAmharicPreview = true,
  showQuickActions = true
}: EthiopianThreePartNameProps) {
  const [inputMethod, setInputMethod] = useState<EthiopianNameInputMethod>(defaultInputMethod);
  const [copied, setCopied] = useState(false);
  
  // Wizard state
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [wizardGender, setWizardGender] = useState<EthiopianNameGender | 'all'>('all');
  const [wizardCategory, setWizardCategory] = useState<string>('all');
  const [wizardSearch, setWizardSearch] = useState<string>('');
  const [popularList, setPopularList] = useState<EthiopianName[]>([]);

  // Presets search
  const [presetSearch, setPresetSearch] = useState('');
  const [presetCategory, setPresetCategory] = useState('all');

  // References for smooth auto-focus between fields in Split Mode
  const fatherInputRef = useRef<HTMLInputElement | null>(null);
  const grandfatherInputRef = useRef<HTMLInputElement | null>(null);

  // Load popular names for wizard & suggestions
  useEffect(() => {
    ethiopianNameService.getPopularEthiopianNames(30).then((names) => {
      setPopularList(names);
    }).catch(() => {});
  }, []);

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

  const handleCopyFullName = () => {
    const parts = [firstName, fathersName, grandfathersName].filter(Boolean);
    const full = parts.join(' ');
    if (!full) return;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleClearAll = () => {
    updateParts('', '', '');
    setWizardStep(1);
  };

  const handleRandomize = () => {
    const randomCombo = CURATED_ETHIOPIAN_COMBOS[Math.floor(Math.random() * CURATED_ETHIOPIAN_COMBOS.length)];
    updateParts(randomCombo.firstName, randomCombo.fathersName, randomCombo.grandfathersName);
  };

  const handleSwapFirstFather = () => {
    updateParts(fathersName, firstName, grandfathersName);
  };

  const fullNameString = [firstName, fathersName, grandfathersName].filter(Boolean).join(' ');
  const amharicTranslation = transliterateToAmharic(fullNameString);
  const completedPartsCount = [firstName, fathersName, grandfathersName].filter(p => p && p.trim().length > 0).length;

  return (
    <div id={`${idPrefix}-container`} className={`bg-white/95 rounded-2xl border border-gray-100 p-3.5 shadow-sm space-y-3.5 font-sans ${className}`}>
      
      {/* HEADER WITH INPUT METHOD TOGGLES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-100">
        <div>
          <span className="text-xs font-black text-gray-900 flex items-center gap-1.5 uppercase tracking-wide">
            <UserCheck className="w-4 h-4 text-[#70189F]" />
            <span>Ethiopian 3-Part Naming</span>
            {required && <span className="text-rose-500 font-bold">*</span>}
          </span>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
            Self (First) + Father (Patronymic) + Grandfather
          </p>
        </div>

        {/* INPUT METHOD SELECTOR TABS */}
        {allowMethodSwitching && (
          <div className="bg-gray-100/90 p-1 rounded-xl flex items-center gap-1 border border-gray-200/60 overflow-x-auto scrollbar-none">
            <button
              id={`${idPrefix}-tab-split`}
              type="button"
              onClick={() => setInputMethod('split')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                inputMethod === 'split'
                  ? 'bg-white text-[#70189F] shadow-sm font-black'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
              title="Separate 3-Part Inputs for Self, Father, Grandfather"
            >
              <Layers className="w-3 h-3 text-[#70189F]" />
              <span>3-Fields</span>
            </button>

            <button
              id={`${idPrefix}-tab-single`}
              type="button"
              onClick={() => setInputMethod('single')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                inputMethod === 'single'
                  ? 'bg-white text-[#70189F] shadow-sm font-black'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
              title="Single Smart Field with Live Self/Father/Grandfather Token Detection"
            >
              <AlignLeft className="w-3 h-3 text-[#70189F]" />
              <span>Smart Single</span>
            </button>

            <button
              id={`${idPrefix}-tab-wizard`}
              type="button"
              onClick={() => setInputMethod('wizard')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                inputMethod === 'wizard'
                  ? 'bg-white text-[#70189F] shadow-sm font-black'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
              title="Guided 3-Step Name Selector"
            >
              <Compass className="w-3 h-3 text-[#dfa04c]" />
              <span>Step-by-Step</span>
            </button>

            <button
              id={`${idPrefix}-tab-presets`}
              type="button"
              onClick={() => setInputMethod('presets')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                inputMethod === 'presets'
                  ? 'bg-white text-[#70189F] shadow-sm font-black'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
              title="1-Tap Curated Ethiopian Full Names"
            >
              <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
              <span>Presets</span>
            </button>
          </div>
        )}
      </div>

      {/* ================= METHOD 1: 3-FIELD SPLIT (STRUCTURED FORM) ================= */}
      {inputMethod === 'split' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. Self (First Name) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-[#70189F] uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3 text-[#70189F]" />
                  <span>1. Self (First Name)</span>
                </span>
                <span className="text-[9px] text-gray-400 font-medium">የግል ስም</span>
              </div>
              <EthiopianNameAutocomplete
                id={`${idPrefix}-split-first`}
                placeholder="e.g. Leykun, Abebe, Selam"
                value={firstName}
                onChange={(val) => {
                  const parts = val.trim().split(/\s+/);
                  if (parts.length >= 3) {
                    updateParts(parts[0], parts[1], parts.slice(2).join(' '));
                  } else if (parts.length === 2) {
                    updateParts(parts[0], parts[1], grandfathersName);
                  } else {
                    updateParts(val, fathersName, grandfathersName);
                  }
                }}
                onSelect={(selectedName) => {
                  const parts = selectedName.trim().split(/\s+/);
                  if (parts.length >= 3) {
                    updateParts(parts[0], parts[1], parts.slice(2).join(' '));
                  } else if (parts.length === 2) {
                    updateParts(parts[0], parts[1], grandfathersName);
                  } else {
                    updateParts(selectedName, fathersName, grandfathersName);
                  }
                }}
                theme={theme}
                maxSuggestions={6}
                suggestFullNames={true}
                required={required}
                disabled={disabled}
              />
            </div>

            {/* 2. Father's Name */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-[#70189F] uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#70189F]" />
                  <span>2. Father's Name</span>
                </span>
                <span className="text-[9px] text-gray-400 font-medium">የአባት ስም</span>
              </div>
              <EthiopianNameAutocomplete
                id={`${idPrefix}-split-father`}
                placeholder="e.g. Jemaneh, Kebede, Bikila"
                value={fathersName}
                onChange={(val) => updateParts(firstName, val, grandfathersName)}
                genderFilter="male"
                theme={theme}
                maxSuggestions={6}
                suggestFullNames={false}
                required={required}
                disabled={disabled}
              />
            </div>

            {/* 3. Grandfather's Name */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-[#70189F] uppercase tracking-wider flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-[#70189F]" />
                  <span>3. Grandfather's Name</span>
                </span>
                <span className="text-[9px] text-gray-400 font-medium">የአያት ስም</span>
              </div>
              <EthiopianNameAutocomplete
                id={`${idPrefix}-split-grandfather`}
                placeholder="e.g. Ylma, Tadesse, Demisse"
                value={grandfathersName}
                onChange={(val) => updateParts(firstName, fathersName, val)}
                genderFilter="male"
                theme={theme}
                maxSuggestions={6}
                suggestFullNames={false}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Quick Patronymic Combo Chips */}
          {firstName && !fathersName && (
            <div className="bg-purple-50/50 p-2 rounded-xl border border-purple-100/60 space-y-1">
              <span className="text-[10px] text-purple-900 font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#dfa04c]" />
                <span>Suggested Father Names for "{firstName}":</span>
              </span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {['Jemaneh', 'Kebede', 'Tadesse', 'Alemayehu', 'Tesfaye', 'Bikila', 'Yohannes'].map((pat) => (
                  <button
                    key={pat}
                    type="button"
                    onClick={() => updateParts(firstName, pat, grandfathersName)}
                    className="text-[10px] font-bold bg-white text-purple-900 px-2 py-0.5 rounded-lg border border-purple-200 hover:bg-purple-100/70 transition cursor-pointer"
                  >
                    + {pat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {firstName && fathersName && !grandfathersName && (
            <div className="bg-amber-50/50 p-2 rounded-xl border border-amber-100/60 space-y-1">
              <span className="text-[10px] text-amber-900 font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#dfa04c]" />
                <span>Suggested Grandfather Names for "{firstName} {fathersName}":</span>
              </span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {['Ylma', 'Yilma', 'Tadesse', 'Demisse', 'Worku', 'Bekele', 'Haile'].map((gpat) => (
                  <button
                    key={gpat}
                    type="button"
                    onClick={() => updateParts(firstName, fathersName, gpat)}
                    className="text-[10px] font-bold bg-white text-amber-900 px-2 py-0.5 rounded-lg border border-amber-200 hover:bg-amber-100/70 transition cursor-pointer"
                  >
                    + {gpat}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= METHOD 2: SMART SINGLE UNIFIED INPUT ================= */}
      {inputMethod === 'single' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <EthiopianNameAutocomplete
              id={`${idPrefix}-single-input`}
              label="Full Name (Self + Father + Grandfather)"
              placeholder="Type full 3-part name e.g. Leykun Jemaneh Ylma"
              value={fullNameString}
              onChange={(val) => {
                const parts = val.trimStart().split(/\s+/);
                updateParts(parts[0] || '', parts[1] || '', parts.slice(2).join(' '));
              }}
              onSelect={(selectedFullName) => {
                const parts = selectedFullName.trim().split(/\s+/);
                updateParts(parts[0] || '', parts[1] || '', parts.slice(2).join(' '));
              }}
              extractActiveToken={true}
              suggestFullNames={true}
              maxSuggestions={8}
              theme={theme}
              required={required}
              disabled={disabled}
            />
          </div>

          {/* Real-time Tokenized Slot Pills */}
          <div className="bg-gray-50/80 p-2.5 rounded-xl border border-gray-100 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
              Detected Slots:
            </span>
            
            {/* Slot 1: Self */}
            <div className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition ${
              firstName ? 'bg-purple-100 text-[#70189F] border border-purple-200' : 'bg-gray-100 text-gray-400 border border-gray-200'
            }`}>
              <User className="w-3 h-3 text-[#70189F]" />
              <span>1. Self:</span>
              <span className="font-extrabold text-gray-900">{firstName || 'Empty'}</span>
              {firstName && (
                <button
                  type="button"
                  onClick={() => updateParts('', fathersName, grandfathersName)}
                  className="hover:text-rose-600 transition"
                  title="Clear First Name"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Slot 2: Father */}
            <div className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition ${
              fathersName ? 'bg-blue-100 text-blue-900 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-200'
            }`}>
              <Users className="w-3 h-3 text-blue-800" />
              <span>2. Father:</span>
              <span className="font-extrabold text-gray-900">{fathersName || 'Empty'}</span>
              {fathersName && (
                <button
                  type="button"
                  onClick={() => updateParts(firstName, '', grandfathersName)}
                  className="hover:text-rose-600 transition"
                  title="Clear Father's Name"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Slot 3: Grandfather */}
            <div className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition ${
              grandfathersName ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' : 'bg-gray-100 text-gray-400 border border-gray-200'
            }`}>
              <UserCheck className="w-3 h-3 text-emerald-800" />
              <span>3. Grandfather:</span>
              <span className="font-extrabold text-gray-900">{grandfathersName || 'Empty'}</span>
              {grandfathersName && (
                <button
                  type="button"
                  onClick={() => updateParts(firstName, fathersName, '')}
                  className="hover:text-rose-600 transition"
                  title="Clear Grandfather's Name"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= METHOD 3: GUIDED 3-STEP WIZARD ================= */}
      {inputMethod === 'wizard' && (
        <div className="space-y-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/70">
          {/* Step Progress Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              {[
                { step: 1, label: 'Self (First)', done: !!firstName },
                { step: 2, label: 'Father', done: !!fathersName },
                { step: 3, label: 'Grandfather', done: !!grandfathersName }
              ].map((s) => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setWizardStep(s.step as any)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold transition flex items-center gap-1 cursor-pointer ${
                    wizardStep === s.step
                      ? 'bg-[#70189F] text-white shadow-sm'
                      : s.done
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-white text-gray-500 border border-gray-200'
                  }`}
                >
                  {s.done ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <span>{s.step}.</span>}
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
            <span className="text-[10px] text-gray-500 font-mono font-bold">
              Step {wizardStep} of 3
            </span>
          </div>

          {/* STEP 1: CHOOSE SELF / FIRST NAME */}
          {wizardStep === 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">Choose or Type Self / First Name</span>
                {/* Gender toggle */}
                <div className="flex gap-1 bg-white p-0.5 rounded-lg border border-gray-200 text-[10px] font-bold">
                  {(['all', 'male', 'female'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setWizardGender(g)}
                      className={`px-2 py-0.5 rounded-md capitalize cursor-pointer ${
                        wizardGender === g ? 'bg-[#70189F] text-white' : 'text-gray-500'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <EthiopianNameAutocomplete
                id={`${idPrefix}-wiz-first`}
                placeholder="Search or type Self name (e.g. Leykun, Abebe, Selamawit...)"
                value={firstName}
                onChange={(val) => updateParts(val, fathersName, grandfathersName)}
                onSelect={(val) => {
                  updateParts(val, fathersName, grandfathersName);
                  setWizardStep(2);
                }}
                genderFilter={wizardGender === 'all' ? undefined : wizardGender}
                theme={theme}
              />

              {/* Quick Pick Chips */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Popular Ethiopian First Names:</span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {popularList
                    .filter(n => wizardGender === 'all' || n.gender === wizardGender || n.gender === 'unisex')
                    .slice(0, 16)
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          updateParts(item.name, fathersName, grandfathersName);
                          setWizardStep(2);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                          firstName.toLowerCase() === item.name.toLowerCase()
                            ? 'bg-[#70189F] text-white border-[#70189F] font-bold'
                            : 'bg-white text-gray-800 border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <span>{item.name}</span>
                        {item.usage_count > 1000 && <Flame className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />}
                      </button>
                    ))}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  disabled={!firstName}
                  className="bg-[#70189F] disabled:opacity-50 text-white text-xs font-bold px-4 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>Next: Father's Name</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CHOOSE FATHER'S NAME */}
          {wizardStep === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-800">Choose Father's Name</span>
                  {firstName && (
                    <span className="text-[10px] text-purple-700 ml-1 font-semibold">
                      (for {firstName})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="text-[11px] text-[#70189F] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to Self</span>
                </button>
              </div>

              <EthiopianNameAutocomplete
                id={`${idPrefix}-wiz-father`}
                placeholder="Search or type Father's name (e.g. Jemaneh, Kebede, Tadesse...)"
                value={fathersName}
                onChange={(val) => updateParts(firstName, val, grandfathersName)}
                onSelect={(val) => {
                  updateParts(firstName, val, grandfathersName);
                  setWizardStep(3);
                }}
                genderFilter="male"
                theme={theme}
              />

              {/* Recommended Patronymics */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Popular Patronymic Names:</span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {['Jemaneh', 'Kebede', 'Tadesse', 'Bikila', 'Alemayehu', 'Tesfaye', 'Yohannes', 'Bekele', 'Tekle', 'Solomon', 'Worku', 'Getachew'].map((pat) => (
                    <button
                      key={pat}
                      type="button"
                      onClick={() => {
                        updateParts(firstName, pat, grandfathersName);
                        setWizardStep(3);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-xl border transition cursor-pointer ${
                        fathersName.toLowerCase() === pat.toLowerCase()
                          ? 'bg-[#70189F] text-white border-[#70189F] font-bold'
                          : 'bg-white text-gray-800 border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      {pat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  disabled={!fathersName}
                  className="bg-[#70189F] disabled:opacity-50 text-white text-xs font-bold px-4 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>Next: Grandfather</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CHOOSE GRANDFATHER'S NAME */}
          {wizardStep === 3 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-800">Choose Grandfather's Name</span>
                  {firstName && fathersName && (
                    <span className="text-[10px] text-purple-700 ml-1 font-semibold">
                      (for {firstName} {fathersName})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="text-[11px] text-[#70189F] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to Father</span>
                </button>
              </div>

              <EthiopianNameAutocomplete
                id={`${idPrefix}-wiz-grandfather`}
                placeholder="Search or type Grandfather's name (e.g. Ylma, Demisse, Haile...)"
                value={grandfathersName}
                onChange={(val) => updateParts(firstName, fathersName, val)}
                genderFilter="male"
                theme={theme}
              />

              {/* Recommended Grandfather Names */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Popular Grandfather Names:</span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {['Ylma', 'Yilma', 'Demisse', 'Tadesse', 'Worku', 'Bekele', 'Haile', 'Mekonnen', 'Asfaw', 'Desta'].map((gpat) => (
                    <button
                      key={gpat}
                      type="button"
                      onClick={() => updateParts(firstName, fathersName, gpat)}
                      className={`text-xs px-2.5 py-1 rounded-xl border transition cursor-pointer ${
                        grandfathersName.toLowerCase() === gpat.toLowerCase()
                          ? 'bg-[#70189F] text-white border-[#70189F] font-bold'
                          : 'bg-white text-gray-800 border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      {gpat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setInputMethod('split')}
                  className="bg-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm hover:bg-emerald-800"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Done / Apply Name</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= METHOD 4: QUICK PRESETS & CURATED COMBOS ================= */}
      {inputMethod === 'presets' && (
        <div className="space-y-3 bg-amber-50/40 p-3 rounded-2xl border border-amber-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#dfa04c]" />
              <span>1-Tap Curated Ethiopian Full Names</span>
            </span>
            <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
              {CURATED_ETHIOPIAN_COMBOS.length} Presets
            </span>
          </div>

          {/* Search Presets */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search presets (e.g. Leykun, Abebe, Selamawit...)"
              value={presetSearch}
              onChange={(e) => setPresetSearch(e.target.value)}
              className="w-full bg-white border border-amber-200/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#70189F]"
            />
          </div>

          {/* Preset Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {CURATED_ETHIOPIAN_COMBOS
              .filter(c => {
                const query = presetSearch.toLowerCase();
                return (
                  c.firstName.toLowerCase().includes(query) ||
                  c.fathersName.toLowerCase().includes(query) ||
                  c.grandfathersName.toLowerCase().includes(query) ||
                  c.category.toLowerCase().includes(query)
                );
              })
              .map((combo, idx) => {
                const isSelected = 
                  firstName === combo.firstName && 
                  fathersName === combo.fathersName && 
                  grandfathersName === combo.grandfathersName;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      updateParts(combo.firstName, combo.fathersName, combo.grandfathersName);
                    }}
                    className={`p-2 rounded-xl text-left border transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#70189F] text-white border-[#70189F] shadow-sm'
                        : 'bg-white text-gray-800 border-amber-200/70 hover:border-purple-300 hover:bg-purple-50/40'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-black leading-tight">
                        {combo.firstName} {combo.fathersName} {combo.grandfathersName}
                      </p>
                      <p className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-amber-300' : 'text-gray-400'}`}>
                        {transliterateToAmharic(`${combo.firstName} ${combo.fathersName} ${combo.grandfathersName}`)}
                      </p>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {combo.category}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* ================= BOTTOM PREVIEW & UTILITY ACTIONS ================= */}
      {fullNameString ? (
        <div className="bg-gradient-to-r from-purple-50 via-white to-amber-50/50 border border-purple-100 rounded-2xl p-3 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#dfa04c]" />
                <span className="text-[10px] font-extrabold text-purple-900 uppercase tracking-wider">
                  Full 3-Part Name:
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-purple-200/60 text-purple-900">
                  {completedPartsCount}/3 Parts Complete
                </span>
              </div>
              
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className="text-sm font-black text-gray-950 font-sans tracking-tight">
                  {fullNameString}
                </p>
                {showAmharicPreview && amharicTranslation && (
                  <span className="text-xs font-bold text-[#70189F] font-mono bg-white px-2 py-0.5 rounded-lg border border-purple-100 shadow-2xs">
                    {amharicTranslation}
                  </span>
                )}
              </div>
            </div>

            {/* Action Tools */}
            {showQuickActions && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopyFullName}
                  className="p-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                  title="Copy Full Name"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSwapFirstFather}
                  className="p-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                  title="Swap First & Father Name"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                  <span>Swap</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="p-1.5 rounded-xl bg-white hover:bg-rose-50 border border-gray-200 hover:border-rose-200 text-rose-600 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                  title="Clear All Fields"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty helper state with quick randomize */
        showQuickActions && (
          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-0.5">
            <span className="font-medium">Type or select Self, Father, and Grandfather names above</span>
            <button
              type="button"
              onClick={handleRandomize}
              className="text-[#70189F] hover:text-[#520f63] font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Shuffle className="w-3 h-3 text-[#dfa04c]" />
              <span>Generate Sample Name</span>
            </button>
          </div>
        )
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { 
  Smile, 
  Settings, 
  Mic, 
  Globe, 
  Check, 
  Delete, 
  Palette,
  Grid2X2
} from 'lucide-react';

interface GboardKeyboardProps {
  onKeyPress: (char: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  onClose?: () => void;
}

export default function GboardKeyboard({
  onKeyPress,
  onBackspace,
  onSubmit,
  onClose
}: GboardKeyboardProps) {
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [isSymbolMode, setIsSymbolMode] = useState(false);

  // Top letter row with number superscripts matching Screenshot 2, 3, 4
  const row1Letters = [
    { key: 'q', num: '1' },
    { key: 'w', num: '2' },
    { key: 'e', num: '3' },
    { key: 'r', num: '4' },
    { key: 't', num: '5' },
    { key: 'y', num: '6' },
    { key: 'u', num: '7' },
    { key: 'i', num: '8' },
    { key: 'o', num: '9' },
    { key: 'p', num: '0' },
  ];

  const row2Letters = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
  const row3Letters = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];

  // Number/symbol mode keys
  const row1Symbols = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const row2Symbols = ['@', '#', '$', '%', '&', '-', '+', '(', ')'];
  const row3Symbols = ['*', '"', '\'', ':', ';', '!', '?'];

  const handleKeyClick = (val: string) => {
    onKeyPress(isShiftActive ? val.toUpperCase() : val);
  };

  return (
    <div className="w-full bg-[#1e1f22] text-white select-none border-t border-neutral-800 shrink-0 font-sans">
      
      {/* 1. Gboard Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 text-neutral-400 border-b border-neutral-800/60">
        <div className="flex items-center gap-4">
          {/* 4-squares App menu */}
          <button type="button" className="p-1 hover:text-white transition active:scale-95" title="Menu">
            <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
              <div className="w-1.5 h-1.5 rounded-[1px] bg-neutral-400" />
              <div className="w-1.5 h-1.5 rounded-[1px] bg-neutral-400" />
              <div className="w-1.5 h-1.5 rounded-[1px] bg-neutral-400" />
              <div className="w-1.5 h-1.5 rounded-[1px] bg-neutral-400" />
            </div>
          </button>

          {/* Sticker icon */}
          <button type="button" className="p-1 hover:text-white transition active:scale-95" title="Stickers">
            <div className="w-4 h-4 rounded-xs border border-neutral-400 flex items-center justify-center text-[9px] font-bold">
              ☺
            </div>
          </button>

          {/* GIF icon */}
          <button type="button" className="p-1 hover:text-white transition active:scale-95" title="GIF">
            <span className="text-[11px] font-extrabold tracking-tight border border-neutral-400 px-1 py-0.2 rounded-xs leading-none">
              GIF
            </span>
          </button>

          {/* Settings icon */}
          <button type="button" className="p-1 hover:text-white transition active:scale-95" title="Settings">
            <Settings className="w-4 h-4 stroke-[1.8]" />
          </button>

          {/* Translate icon: G & 文 */}
          <button type="button" className="p-1 hover:text-white transition active:scale-95" title="Translate">
            <div className="w-4 h-4 rounded-xs border border-neutral-400 flex items-center justify-center text-[9px] font-serif">
              文
            </div>
          </button>

          {/* Palette theme icon */}
          <button type="button" className="p-1 hover:text-white transition active:scale-95" title="Themes">
            <Palette className="w-4 h-4 stroke-[1.8]" />
          </button>
        </div>

        {/* Microphone on right */}
        <button type="button" className="p-1 text-neutral-400 hover:text-white transition active:scale-95" title="Voice typing">
          <Mic className="w-4.5 h-4.5 stroke-[1.8]" />
        </button>
      </div>

      {/* 2. Keys Rows */}
      <div className="px-1 pt-1.5 pb-1 space-y-1.5">
        
        {/* ROW 1 */}
        <div className="flex items-center justify-center gap-1">
          {isSymbolMode ? (
            row1Symbols.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => handleKeyClick(sym)}
                className="flex-1 h-10 bg-[#2d2f33] hover:bg-[#383a3f] active:bg-[#43464d] rounded-md flex items-center justify-center text-[16px] font-normal text-white transition active:scale-95"
              >
                {sym}
              </button>
            ))
          ) : (
            row1Letters.map(({ key, num }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKeyClick(key)}
                className="relative flex-1 h-10 bg-[#2d2f33] hover:bg-[#383a3f] active:bg-[#43464d] rounded-md flex flex-col items-center justify-center text-white transition active:scale-95"
              >
                {/* Number superscript in top right corner */}
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    onKeyPress(num);
                  }}
                  className="absolute top-0.5 right-1 text-[8.5px] text-neutral-400 font-mono hover:text-white"
                >
                  {num}
                </span>
                <span className="text-[17px] font-normal leading-none mt-1">
                  {isShiftActive ? key.toUpperCase() : key}
                </span>
              </button>
            ))
          )}
        </div>

        {/* ROW 2 */}
        <div className="flex items-center justify-center gap-1 px-3">
          {(isSymbolMode ? row2Symbols : row2Letters).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleKeyClick(key)}
              className="flex-1 h-10 bg-[#2d2f33] hover:bg-[#383a3f] active:bg-[#43464d] rounded-md flex items-center justify-center text-[17px] font-normal text-white transition active:scale-95"
            >
              {isShiftActive && !isSymbolMode ? key.toUpperCase() : key}
            </button>
          ))}
        </div>

        {/* ROW 3: Shift / Letters / Backspace */}
        <div className="flex items-center justify-center gap-1">
          {/* Shift / Symbol Toggle */}
          <button
            type="button"
            onClick={() => {
              if (isSymbolMode) {
                setIsSymbolMode(false);
              } else {
                setIsShiftActive(!isShiftActive);
              }
            }}
            className={`w-11 h-10 rounded-md flex items-center justify-center transition active:scale-95 ${
              isShiftActive 
                ? 'bg-[#3b82f6] text-white' 
                : 'bg-[#25262a] text-neutral-300 hover:bg-[#323438]'
            }`}
          >
            <span className="text-base font-bold">⇧</span>
          </button>

          {/* Letter / Symbol Keys */}
          {(isSymbolMode ? row3Symbols : row3Letters).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleKeyClick(key)}
              className="flex-1 h-10 bg-[#2d2f33] hover:bg-[#383a3f] active:bg-[#43464d] rounded-md flex items-center justify-center text-[17px] font-normal text-white transition active:scale-95"
            >
              {isShiftActive && !isSymbolMode ? key.toUpperCase() : key}
            </button>
          ))}

          {/* Backspace Key */}
          <button
            type="button"
            onClick={onBackspace}
            className="w-11 h-10 bg-[#25262a] hover:bg-[#323438] active:bg-[#43464d] rounded-md flex items-center justify-center text-neutral-300 hover:text-white transition active:scale-95"
            title="Backspace"
          >
            <Delete className="w-5 h-5 stroke-[1.8]" />
          </button>
        </div>

        {/* ROW 4: ?123 / Emoji / Globe / Spacebar / Period / Enter */}
        <div className="flex items-center justify-center gap-1 pt-0.5">
          {/* ?123 Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsSymbolMode(!isSymbolMode)}
            className="w-12 h-10 bg-[#25262a] hover:bg-[#323438] active:bg-[#43464d] rounded-md flex items-center justify-center text-xs font-semibold text-neutral-300 transition active:scale-95"
          >
            {isSymbolMode ? 'ABC' : '?123'}
          </button>

          {/* Emoji / Comma Key */}
          <button
            type="button"
            onClick={() => handleKeyClick(',')}
            className="w-9 h-10 bg-[#25262a] hover:bg-[#323438] active:bg-[#43464d] rounded-md flex flex-col items-center justify-center text-neutral-300 transition active:scale-95"
          >
            <span className="text-[10px] leading-none opacity-70">☺</span>
            <span className="text-sm leading-none font-bold">,</span>
          </button>

          {/* Globe Key */}
          <button
            type="button"
            onClick={() => {}}
            className="w-9 h-10 bg-[#25262a] hover:bg-[#323438] active:bg-[#43464d] rounded-md flex items-center justify-center text-neutral-300 transition active:scale-95"
            title="Language"
          >
            <Globe className="w-4 h-4 stroke-[1.8]" />
          </button>

          {/* Wide Spacebar with "English" */}
          <button
            type="button"
            onClick={() => onKeyPress(' ')}
            className="flex-1 h-10 bg-[#2d2f33] hover:bg-[#383a3f] active:bg-[#43464d] rounded-md flex items-center justify-center text-[13px] text-neutral-300 font-medium transition active:scale-95"
          >
            English
          </button>

          {/* Period . */}
          <button
            type="button"
            onClick={() => handleKeyClick('.')}
            className="w-9 h-10 bg-[#2d2f33] hover:bg-[#383a3f] active:bg-[#43464d] rounded-md flex items-center justify-center text-sm font-bold text-white transition active:scale-95"
          >
            .
          </button>

          {/* Enter Checkmark Button (Blue with Checkmark icon matching screenshots) */}
          <button
            type="button"
            onClick={onSubmit}
            className="w-12 h-10 bg-[#2979ff] hover:bg-[#1a73e8] active:bg-[#1565c0] rounded-md flex items-center justify-center text-white shadow-md transition active:scale-95"
            title="Send / Submit"
          >
            <Check className="w-5 h-5 stroke-[2.8]" />
          </button>
        </div>
      </div>

      {/* 3. Bottom Android Navigation Row */}
      <div className="w-full bg-[#18191b] px-10 py-1.5 flex items-center justify-between text-neutral-400 select-none border-t border-neutral-800/80">
        {/* Recents apps button */}
        <button 
          onClick={onClose} 
          className="p-1 text-neutral-400 hover:text-white active:scale-90 transition"
          title="App Overview"
        >
          <span className="text-base font-mono">≡</span>
        </button>
        {/* Home button */}
        <button 
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-white active:scale-90 transition"
          title="Home"
        >
          <span className="text-sm">○</span>
        </button>
        {/* Back button */}
        <button 
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-white active:scale-90 transition"
          title="Back"
        >
          <span className="text-sm">‹</span>
        </button>
        {/* Keyboard switch icon */}
        <button 
          type="button"
          className="p-1 text-neutral-400 hover:text-white active:scale-90 transition"
          title="Change Keyboard"
        >
          <div className="grid grid-cols-3 gap-0.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-0.5 h-0.5 rounded-full bg-neutral-400" />
            ))}
          </div>
        </button>
      </div>

    </div>
  );
}

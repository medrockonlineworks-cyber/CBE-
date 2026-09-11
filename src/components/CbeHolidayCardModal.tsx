import React, { useState } from 'react';
import { X, Sparkles, Share2, Copy, Check, ExternalLink } from 'lucide-react';
import CbeLogo from './CbeLogo';

interface CbeHolidayCardModalProps {
  onClose: () => void;
  messageText?: string;
  url?: string;
}

export const CbeHolidayCardModal: React.FC<CbeHolidayCardModalProps> = ({
  onClose,
  messageText = 'ውድ ደንበኛችን እንኳን ለ2019 ዓ.ም. የዘመን መለወጫ በዓል አደረሰዎ! በዓሉ የሰላም እና የደስታ እንዲሆንልዎ እንመኛለን! መስፈንጠሪያውን በመጫን ካርድዎን ያግኙ፡፡ የኢትዮጵያ ንግድ ባንክ፣ ሁሌም የሚተማመኑበት ባንክ:: https://combanketh.et/holidays',
  url = 'https://combanketh.et/holidays',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'CBE 2019 Enkutatash Card',
          text: messageText,
          url,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div 
      id="cbe-holiday-card-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        id="cbe-holiday-card-container"
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-b from-[#3b0857] via-[#240436] to-[#12021b] text-white shadow-2xl border border-amber-400/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center border border-amber-400/40">
              <CbeLogo className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">የኢትዮጵያ ንግድ ባንክ</h3>
              <p className="text-[10px] text-white/70">CBE Digital Holiday Greeting</p>
            </div>
          </div>
          <button
            id="close-holiday-card-btn"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Artwork / Content */}
        <div className="px-6 py-6 text-center relative overflow-hidden">
          {/* Subtle floral background glow */}
          <div className="absolute -top-10 -right-10 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Adey Abeba icon / Festive badge */}
          <div className="inline-flex items-center justify-center mb-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/30 border-2 border-amber-200 animate-pulse">
                <span className="text-2xl select-none">🌼</span>
              </div>
              <Sparkles className="w-5 h-5 text-amber-300 absolute -top-1 -right-1 animate-bounce" />
            </div>
          </div>

          {/* Year and Holiday Title */}
          <div className="space-y-1 mb-4">
            <div className="inline-block px-3 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold tracking-wide">
              መስከረም 1, 2019 ዓ.ም.
            </div>
            <h2 className="text-xl font-black text-amber-200 pt-1 tracking-tight">
              እንኳን ለ2019 ዓ.ም. የዘመን መለወጫ በዓል አደረሰዎ!
            </h2>
            <p className="text-xs text-amber-100/90 font-medium">
              በዓሉ የሰላም፣ የፍቅርና የደስታ እንዲሆንልዎ ከልብ እንመኛለን!
            </p>
          </div>

          {/* Official message text card */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-left space-y-2 mb-4">
            <p className="text-[13px] leading-relaxed text-neutral-200">
              ውድ ደንበኛችን እንኳን ለ2019 ዓ.ም. የዘመን መለወጫ በዓል አደረሰዎ! በዓሉ የሰላም እና የደስታ እንዲሆንልዎ እንመኛለን! መስፈንጠሪያውን በመጫን ካርድዎን ያግኙ፡፡
            </p>
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
              <span className="text-amber-400 font-bold">የኢትዮጵያ ንግድ ባንክ</span>
              <span className="text-neutral-400">ሁሌም የሚተማመኑበት ባንክ!</span>
            </div>
          </div>

          {/* External Link Pill */}
          <div className="flex items-center justify-center space-x-2 text-[11.5px] text-amber-300 mb-5">
            <ExternalLink className="w-3.5 h-3.5" />
            <a 
              href={url} 
              target="_blank" 
              rel="noreferrer noopener"
              className="underline hover:text-amber-100 font-medium break-all"
            >
              {url}
            </a>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              id="copy-holiday-msg-btn"
              type="button"
              onClick={handleCopy}
              className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-semibold flex items-center justify-center space-x-1.5 transition border border-white/10 text-white"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">ተቀድቷል!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>መልእክት ቅዳ</span>
                </>
              )}
            </button>

            <button
              id="share-holiday-card-btn"
              type="button"
              onClick={handleShare}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-xs font-bold flex items-center justify-center space-x-1.5 transition text-purple-950 shadow-md"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>ካርዱን አጋራ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CbeHolidayCardModal;

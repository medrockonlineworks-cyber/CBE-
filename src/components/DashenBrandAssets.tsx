import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Link as LinkIcon, 
  RotateCcw, 
  Check, 
  X, 
  Image as ImageIcon, 
  Sparkles, 
  Layers, 
  Eye, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { compressImageFile } from '../lib/imageUtils';
import { DashenBankService } from '../services/dashenBankService';

/**
 * High-fidelity vector SVG path for official Dashen Bank emblem
 * Features authentic Ras Dashen mountain contour, truss triangulation, circle crests, and bilingual Amharic/English typography
 */
export const OFFICIAL_DASHEN_LOGO_SVG = '/dashen-logo-clean.svg';

export const DASHEN_PRESET_LOGOS = [
  {
    id: 'official_dashen',
    name: 'Official Dashen Bank (Authentic Emblem)',
    description: 'Authentic Ras Dashen mountain crest, triangulation truss, and official bilingual typography matching mobile banking',
    url: '/dashen-logo-clean.svg',
    isOfficial: true
  },
  {
    id: 'dashen_gold_shield',
    name: 'Dashen Super App Gold & Blue',
    description: 'Royal navy badge with golden mountain crest',
    url: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="100%" height="100%">
  <defs>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffd56b"/>
      <stop offset="100%" stop-color="#d49a24"/>
    </linearGradient>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0c234b"/>
      <stop offset="100%" stop-color="#051226"/>
    </linearGradient>
  </defs>
  <rect width="160" height="160" rx="28" fill="url(#bgGrad)"/>
  <circle cx="80" cy="80" r="72" fill="none" stroke="url(#goldGrad)" stroke-width="2" stroke-opacity="0.4"/>
  <path d="M 32 98 L 128 98 L 128 93 L 32 93 Z" fill="url(#goldGrad)"/>
  <path d="M 44 93 L 80 38 L 116 93 Z" fill="url(#goldGrad)"/>
  <path d="M 80 38 L 116 93 L 95 93 L 80 60 Z" fill="#ffffff" opacity="0.4"/>
  <text x="80" y="121" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="url(#goldGrad)" text-anchor="middle">ዳሽን ባንክ</text>
  <text x="80" y="139" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#f0c666" text-anchor="middle">DASHEN BANK</text>
</svg>
`)}`,
    isOfficial: true
  },
  {
    id: 'cbe_official',
    name: 'Commercial Bank of Ethiopia (CBE)',
    description: 'Official CBE purple monument disc emblem',
    url: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Commercial_Bank_of_Ethiopia_Logo.svg',
    isOfficial: false
  },
  {
    id: 'telebirr',
    name: 'Telebirr Mobile Money',
    description: 'Ethio telecom Telebirr official logo',
    url: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Telebirr_logo.png',
    isOfficial: false
  }
];

/**
 * Authentic Mount Dashen Background matching Screenshot_20260909-123028.png
 */
export function DashenMountainBackdrop({ 
  customBgImage, 
  className = '' 
}: { 
  customBgImage?: string | null; 
  className?: string; 
}) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}>
      {/* 1. Base Gradient Canvas matching Screenshot 123028 */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          background: 'radial-gradient(ellipse 120% 80% at 50% 18%, #133f84 0%, #0c2a5c 42%, #051433 70%, #030816 100%)'
        }}
      />

      {/* 2. Custom Uploaded Background Image (if user provided one) */}
      {customBgImage && (
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center opacity-40 mix-blend-screen"
          style={{ backgroundImage: `url(${customBgImage})` }}
        />
      )}

      {/* 3. Authentic Mount Dashen Mountain Silhouette & Ridge Facets */}
      {/* Matches exact mountain shape, ridges, crags and contrast facets visible in Screenshot_20260909-123028.png */}
      <svg 
        className="absolute inset-0 w-full h-full" 
        viewBox="0 0 400 840" 
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Sky illumination radial glow centered behind the account balance */}
          <radialGradient id="skyRadialAura" cx="48%" cy="18%" r="55%">
            <stop offset="0%" stopColor="#1a4f9e" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#0f346e" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#030816" stopOpacity="0" />
          </radialGradient>

          {/* Linear fade-to-bottom so E-commerce and nav stay clean midnight blue */}
          <linearGradient id="mountainBottomFade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#040b18" stopOpacity="0" />
            <stop offset="65%" stopColor="#040b18" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#040b18" stopOpacity="1" />
          </linearGradient>

          {/* Shading gradients for mountain facets */}
          <linearGradient id="lightFacetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2564cc" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#133d80" stopOpacity="0.85" />
          </linearGradient>

          <linearGradient id="midFacetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#16438a" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0b2452" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="shadowFacetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0b2554" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#040f24" stopOpacity="0.98" />
          </linearGradient>

          <linearGradient id="deepDarkFacet" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#081a38" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#030917" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Top Sky Glow */}
        <rect x="0" y="0" width="400" height="450" fill="url(#skyRadialAura)" />

        {/* LAYER 1: Distant Background Peaks (Atmospheric Depth) */}
        <g opacity="0.45">
          <path 
            d="M -20 280 L 45 210 L 95 240 L 160 175 L 210 220 L 285 160 L 340 215 L 420 180 L 420 500 L -20 500 Z" 
            fill="#081a3c"
          />
          <path 
            d="M 120 220 L 160 175 L 205 220 Z" 
            fill="#123875" 
            opacity="0.4"
          />
          <path 
            d="M 245 200 L 285 160 L 330 210 Z" 
            fill="#123875" 
            opacity="0.4"
          />
        </g>

        {/* LAYER 2: Main Mount Dashen Massif (Left Ridge, Central Summit, Right Slopes) */}
        {/* Exact match to the jagged silhouette behind Leykun Jemaneh Yilma and balance card */}
        <g>
          {/* Primary Main Mountain Silhouette Base */}
          <path 
            d="M -20 480 
               L -20 250 
               L 35 195 
               L 80 230 
               L 135 138 
               L 175 190 
               L 205 160 
               L 260 215 
               L 315 165 
               L 360 205 
               L 420 175 
               L 420 620 
               L -20 620 Z" 
            fill="url(#deepDarkFacet)"
          />

          {/* Facet: High Left Peak (Light Face) */}
          <polygon 
            points="135,138 80,230 140,265" 
            fill="url(#lightFacetGrad)" 
          />
          {/* Facet: High Left Peak (Shadow Face) */}
          <polygon 
            points="135,138 140,265 175,190" 
            fill="url(#shadowFacetGrad)" 
          />

          {/* Facet: Far Left Shoulder (Sunlit Ridge) */}
          <polygon 
            points="35,195 80,230 30,300 -20,250" 
            fill="url(#midFacetGrad)" 
          />
          <polygon 
            points="80,230 140,265 95,350 30,300" 
            fill="url(#shadowFacetGrad)" 
          />

          {/* Facet: Central Ravine & Ridge behind Balance */}
          <polygon 
            points="175,190 140,265 190,320 205,160" 
            fill="url(#lightFacetGrad)" 
          />
          <polygon 
            points="205,160 190,320 240,290 260,215" 
            fill="url(#shadowFacetGrad)" 
          />

          {/* Facet: Right Central Peak */}
          <polygon 
            points="260,215 240,290 295,320 315,165" 
            fill="url(#lightFacetGrad)" 
          />
          <polygon 
            points="315,165 295,320 345,300 360,205" 
            fill="url(#shadowFacetGrad)" 
          />

          {/* Facet: Far Right Mountain Ridge (behind Theme Paintbrush) */}
          <polygon 
            points="360,205 345,300 420,330 420,175" 
            fill="url(#midFacetGrad)" 
          />

          {/* Facet: Lower Crags spanning behind the 8 Action Buttons */}
          <polygon 
            points="95,350 140,265 190,320 160,420 80,440" 
            fill="url(#midFacetGrad)" 
          />
          <polygon 
            points="190,320 240,290 270,390 160,420" 
            fill="url(#shadowFacetGrad)" 
          />
          <polygon 
            points="240,290 295,320 350,380 270,390" 
            fill="url(#lightFacetGrad)" 
          />
          <polygon 
            points="295,320 345,300 420,330 420,440 350,380" 
            fill="url(#deepDarkFacet)" 
          />

          {/* Foothills and lower mountain rock faces */}
          <polygon 
            points="-20,380 80,440 160,420 120,530 -20,510" 
            fill="url(#deepDarkFacet)" 
            opacity="0.95"
          />
          <polygon 
            points="160,420 270,390 320,490 180,520 120,530" 
            fill="url(#shadowFacetGrad)" 
            opacity="0.9"
          />
          <polygon 
            points="270,390 350,380 420,440 420,540 320,490" 
            fill="url(#deepDarkFacet)" 
            opacity="0.95"
          />

          {/* Crisp highlight strokes for rock crests */}
          <polyline 
            points="35,195 80,230 135,138 175,190 205,160 260,215 315,165 360,205 420,175" 
            fill="none" 
            stroke="#4589f5" 
            strokeWidth="1.5" 
            strokeOpacity="0.45" 
          />
          <polyline 
            points="135,138 140,265 190,320 160,420" 
            fill="none" 
            stroke="#3a7de6" 
            strokeWidth="1" 
            strokeOpacity="0.3" 
          />
          <polyline 
            points="205,160 240,290 270,390" 
            fill="none" 
            stroke="#3a7de6" 
            strokeWidth="1" 
            strokeOpacity="0.3" 
          />
        </g>

        {/* 4. Bottom Smooth Fade to Deep Midnight Blue (#040b18) */}
        {/* Ensures the E-Commerce section and navigation bar remain clean and legible */}
        <rect 
          x="0" 
          y="420" 
          width="400" 
          height="420" 
          fill="url(#mountainBottomFade)" 
        />
      </svg>
    </div>
  );
}

/**
 * Dashen Bank Logo Box Component
 * Displays custom uploaded logo or official Dashen vector logo matching Screenshot_20260909-123028.png top-left
 */
export function DashenLogo({
  src,
  className = 'w-10 h-10',
  showText = true,
  onClick
}: {
  src?: string | null;
  className?: string;
  showText?: boolean;
  onClick?: () => void;
}) {
  const isCustom = Boolean(src && src.trim() !== '');

  return (
    <div 
      onClick={onClick}
      className={`relative rounded-[12px] border border-white/35 bg-[#0b2149]/95 backdrop-blur-md flex items-center justify-center p-0.5 text-center shadow-md overflow-hidden shrink-0 transition ${
        onClick ? 'cursor-pointer hover:border-white/70 active:scale-95' : ''
      } ${className}`}
      title={isCustom ? 'Custom Uploaded Logo (Click to change)' : 'Official Dashen Bank Emblem (Click to customize)'}
    >
      <img 
        src={isCustom ? (src || '') : '/dashen-logo-clean.svg'} 
        alt="Dashen Bank Emblem" 
        className="w-full h-full object-contain filter drop-shadow-xs"
        onError={(e) => {
          // Graceful fallback to official vector logo
          (e.currentTarget as HTMLImageElement).src = '/dashen-logo-clean.svg';
        }}
      />
    </div>
  );
}

/**
 * Floating Theme / Wallpaper Customizer FAB
 * Exact 1:1 match for the floating paintbrush squircle icon in Screenshot_20260909-125235.png and Screenshot_20260909-123028.png
 */
export function DashenThemeFab({
  onClick,
  className = ''
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button 
      onClick={onClick}
      className={`w-12 h-12 rounded-2xl bg-[#374151]/85 backdrop-blur-md border border-white/35 shadow-xl flex items-center justify-center p-1.5 hover:scale-105 active:scale-95 transition cursor-pointer select-none ${className}`}
      title="Customize Bank Logo & Wallpaper"
      aria-label="Customize Bank Logo & Wallpaper"
    >
      {/* Inner White Circular Disc */}
      <div className="w-9 h-9 rounded-full bg-white shadow-xs flex items-center justify-center">
        {/* Stylized Diagonal Paintbrush Icon with blue handle and dark tip matching screenshots */}
        <svg 
          viewBox="0 0 36 36" 
          className="w-6 h-6 transform rotate-45"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Blue gradient handle */}
            <linearGradient id="fabBlueHandle" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="35%" stopColor="#3b82f6" />
              <stop offset="85%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
            {/* Silver metallic ferrule */}
            <linearGradient id="fabSilverFerrule" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            {/* Dark slate bristle tip */}
            <linearGradient id="fabDarkBristle" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="60%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </linearGradient>
            {/* White specular shine */}
            <linearGradient id="fabShine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 1. Paintbrush Handle */}
          <path d="M 16 3 C 16 2, 20 2, 20 3 L 20 18 L 16 18 Z" fill="url(#fabBlueHandle)" />
          <ellipse cx="18" cy="3" rx="2" ry="1.2" fill="#e2e8f0" />
          <path d="M 16.5 4 L 17.5 4 L 17.5 17 L 16.5 17 Z" fill="url(#fabShine)" />

          {/* 2. Ferrule Band */}
          <rect x="15.5" y="18" width="5" height="4" rx="0.5" fill="url(#fabSilverFerrule)" />
          <line x1="15.5" y1="20" x2="20.5" y2="20" stroke="#cbd5e1" strokeWidth="0.5" />

          {/* 3. Dark Pointed Bristle Tip */}
          <path d="M 15.8 22 C 16 24, 17.2 29.5, 18 31.5 C 18.8 29.5, 20 24, 20.2 22 Z" fill="url(#fabDarkBristle)" />
          <path d="M 17.7 28.5 L 18 31.5 L 18.3 28.5 Z" fill="#60a5fa" opacity="0.6" />
        </svg>
      </div>
    </button>
  );
}

/**
 * Dashen Logo & Branding Management Modal
 */
export function DashenLogoModal({
  isOpen,
  onClose,
  currentLogo,
  onLogoUpdated,
  currentBgImage,
  onBgImageUpdated
}: {
  isOpen: boolean;
  onClose: () => void;
  currentLogo: string | null;
  onLogoUpdated: (newLogo: string | null) => void;
  currentBgImage?: string | null;
  onBgImageUpdated?: (newBg: string | null) => void;
}) {
  const [activeTab, setActiveTab] = useState<'logo' | 'background'>('logo');
  const [urlInput, setUrlInput] = useState('');
  const [bgUrlInput, setBgUrlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
  };

  // Handle Logo Upload via File
  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const compressedDataUrl = await compressImageFile(file, 400, 0.9);
      DashenBankService.saveCustomLogo(compressedDataUrl);
      onLogoUpdated(compressedDataUrl);
      showSuccess('Bank logo uploaded & saved successfully!');
    } catch (err) {
      console.error(err);
      showError('Failed to process image file. Please try another image.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Background Upload via File
  const handleBgFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const compressedDataUrl = await compressImageFile(file, 800, 0.85);
      DashenBankService.saveCustomBgImage(compressedDataUrl);
      if (onBgImageUpdated) onBgImageUpdated(compressedDataUrl);
      showSuccess('Background image updated successfully!');
    } catch (err) {
      console.error(err);
      showError('Failed to process background image.');
    } finally {
      setIsProcessing(false);
      if (bgFileInputRef.current) bgFileInputRef.current.value = '';
    }
  };

  // Apply URL
  const handleApplyLogoUrl = () => {
    if (!urlInput.trim()) {
      showError('Please enter a valid image URL');
      return;
    }
    try {
      DashenBankService.saveCustomLogo(urlInput.trim());
      onLogoUpdated(urlInput.trim());
      setUrlInput('');
      showSuccess('Logo URL applied successfully!');
    } catch {
      showError('Failed to apply logo URL');
    }
  };

  const handleApplyBgUrl = () => {
    if (!bgUrlInput.trim()) {
      showError('Please enter a valid background image URL');
      return;
    }
    try {
      DashenBankService.saveCustomBgImage(bgUrlInput.trim());
      if (onBgImageUpdated) onBgImageUpdated(bgUrlInput.trim());
      setBgUrlInput('');
      showSuccess('Background URL applied successfully!');
    } catch {
      showError('Failed to apply background URL');
    }
  };

  // Select Preset
  const handleSelectPreset = (url: string, name: string) => {
    DashenBankService.saveCustomLogo(url);
    onLogoUpdated(url);
    showSuccess(`Applied preset: ${name}`);
  };

  // Reset to Official
  const handleResetToOfficial = () => {
    DashenBankService.resetCustomLogo();
    onLogoUpdated(null);
    showSuccess('Reset to Official Dashen Bank Logo');
  };

  const handleResetBackground = () => {
    DashenBankService.resetCustomBgImage();
    if (onBgImageUpdated) onBgImageUpdated(null);
    showSuccess('Reset to Official Mount Dashen Background');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-[#0a152b] border border-[#1b345f] rounded-3xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-white font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#182a4a]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Bank Branding &amp; Logo</h2>
              <p className="text-[11px] text-blue-300">Customize header emblem &amp; background</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Logo vs Background */}
        <div className="flex bg-[#061021] p-1 rounded-2xl my-3 border border-[#162744]">
          <button
            onClick={() => setActiveTab('logo')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'logo'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Bank Logo</span>
          </button>
          <button
            onClick={() => setActiveTab('background')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'background'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Mount Dashen BG</span>
          </button>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="mb-3 p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mb-3 p-2.5 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-none">
          
          {/* TAB 1: BANK LOGO UPLOADER */}
          {activeTab === 'logo' && (
            <div className="space-y-4">
              
              {/* Active Logo Live Preview */}
              <div className="p-3.5 bg-[#0e1e3b] border border-[#1b3662] rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DashenLogo src={currentLogo} className="w-12 h-12" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-white">
                        {currentLogo ? 'Custom Uploaded Logo' : 'Official Dashen Logo (Default)'}
                      </h4>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded-full font-bold uppercase">
                        Active
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      {currentLogo ? 'Stored securely in prototype storage' : 'Official vector mountain emblem'}
                    </p>
                  </div>
                </div>

                {currentLogo && (
                  <button
                    onClick={handleResetToOfficial}
                    className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl text-[11px] font-medium transition flex items-center gap-1"
                    title="Reset to official logo"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Upload New Image File (Drag & Drop / File Input) */}
              <div className="p-4 bg-[#071328] border border-[#193259] rounded-2xl space-y-2.5">
                <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                  <span>Upload Logo Image</span>
                </h4>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleLogoFileUpload} 
                  accept="image/png, image/jpeg, image/svg+xml, image/webp" 
                  className="hidden" 
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#1f3e72] hover:border-blue-400 bg-[#0c1c38]/40 hover:bg-[#0c1c38]/70 rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 group-hover:bg-blue-600/30 text-blue-400 flex items-center justify-center transition">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Click to browse or drop bank logo</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">PNG, JPG, SVG or WebP (auto-optimized)</p>
                  </div>
                </div>
              </div>

              {/* Enter Web URL */}
              <div className="p-3.5 bg-[#071328] border border-[#193259] rounded-2xl space-y-2">
                <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Or Enter Image URL</span>
                </h4>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 bg-[#0d1e3d] border border-[#1b3765] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={handleApplyLogoUrl}
                    disabled={!urlInput.trim() || isProcessing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Preset Logos */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Preset Bank Logos</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DASHEN_PRESET_LOGOS.map((preset) => {
                    const isSelected = currentLogo === preset.url || (!currentLogo && preset.id === 'official_dashen');
                    return (
                      <button
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset.url, preset.name)}
                        className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#12284f] border-blue-400 text-white'
                            : 'bg-[#09152b] border-[#182f56] text-neutral-300 hover:bg-[#0e2145]'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#061021] border border-white/20 p-1 flex items-center justify-center shrink-0">
                          <img src={preset.url} alt={preset.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-white truncate">{preset.name}</p>
                          <p className="text-[9px] text-neutral-400 truncate">{preset.description}</p>
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: MOUNT DASHEN BACKGROUND CUSTOMIZATION */}
          {activeTab === 'background' && (
            <div className="space-y-4">
              
              {/* Active Background Preview */}
              <div className="p-3.5 bg-[#0e1e3b] border border-[#1b3662] rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-white/25 overflow-hidden relative shadow-inner bg-[#0b2149]">
                    <DashenMountainBackdrop customBgImage={currentBgImage} className="scale-125" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-white">
                        {currentBgImage ? 'Custom Uploaded Background' : 'Official Mount Dashen Silhouette'}
                      </h4>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded-full font-bold uppercase">
                        Active
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      {currentBgImage ? 'Active custom wallpaper' : 'Ras Dashen massif with faceted ridges (Default)'}
                    </p>
                  </div>
                </div>

                {currentBgImage && (
                  <button
                    onClick={handleResetBackground}
                    className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl text-[11px] font-medium transition flex items-center gap-1"
                    title="Reset to official Mount Dashen"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Upload Background File */}
              <div className="p-4 bg-[#071328] border border-[#193259] rounded-2xl space-y-2.5">
                <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                  <span>Upload Background Image</span>
                </h4>
                
                <input 
                  type="file" 
                  ref={bgFileInputRef} 
                  onChange={handleBgFileUpload} 
                  accept="image/png, image/jpeg, image/webp" 
                  className="hidden" 
                />

                <div 
                  onClick={() => bgFileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#1f3e72] hover:border-blue-400 bg-[#0c1c38]/40 hover:bg-[#0c1c38]/70 rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 group-hover:bg-blue-600/30 text-blue-400 flex items-center justify-center transition">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Click to upload custom background image</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">High-res photo or wallpaper (fits mobile screen)</p>
                  </div>
                </div>
              </div>

              {/* Background URL Input */}
              <div className="p-3.5 bg-[#071328] border border-[#193259] rounded-2xl space-y-2">
                <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span>Or Enter Wallpaper URL</span>
                </h4>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={bgUrlInput}
                    onChange={(e) => setBgUrlInput(e.target.value)}
                    placeholder="https://example.com/wallpaper.jpg"
                    className="flex-1 bg-[#0d1e3d] border border-[#1b3765] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={handleApplyBgUrl}
                    disabled={!bgUrlInput.trim() || isProcessing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-[#182a4a] flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}

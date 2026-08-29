import React, { useState, useEffect } from 'react';
import { LocalDb, DEFAULT_CBE_LOGO } from '../lib/mockData';
import { UserProfile } from '../types';
import { CbeLogo } from './CbeLogo';
import { compressImageFile } from '../lib/imageUtils';
import { 
  Image as ImageIcon, 
  Upload, 
  Link, 
  RotateCcw, 
  Check, 
  X, 
  ShieldCheck, 
  Sparkles,
  Eye,
  Loader2
} from 'lucide-react';

interface BankLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onLogoUpdated?: (newLogo: string | null) => void;
}

const PRESET_LOGOS = [
  {
    name: 'Official CBE Emblem (Default)',
    url: DEFAULT_CBE_LOGO,
    description: 'Official Commercial Bank of Ethiopia golden emblem'
  },
  {
    name: 'CBE Birr Vector Emblem',
    url: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Commercial_Bank_of_Ethiopia_Logo.svg',
    description: 'High-resolution SVG CBE emblem'
  }
];

export default function BankLogoModal({ isOpen, onClose, currentUser, onLogoUpdated }: BankLogoModalProps) {
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [customLogoUrlInput, setCustomLogoUrlInput] = useState('');
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [logoSaveSuccess, setLogoSaveSuccess] = useState(false);
  const [logoErrorMsg, setLogoErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const savedLogo = LocalDb.getCustomBankLogo();
      setCurrentLogo(savedLogo);
      setPreviewLogo(savedLogo || DEFAULT_CBE_LOGO);
      setLogoSaveSuccess(false);
      setLogoErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingLogo(true);
      const optimizedDataUrl = await compressImageFile(file, 400, 0.9);
      setPreviewLogo(optimizedDataUrl);
      applyLogoChange(optimizedDataUrl);
    } catch (err: any) {
      console.error('Image compression failed:', err);
      setLogoErrorMsg('Failed to process image. Please choose another file.');
    } finally {
      setIsProcessingLogo(false);
    }
  };

  const handleLogoUrlApply = (e: React.FormEvent) => {
    e.preventDefault();
    setLogoErrorMsg('');
    if (!customLogoUrlInput.trim()) {
      setLogoErrorMsg('Please enter a valid image URL.');
      return;
    }
    setPreviewLogo(customLogoUrlInput.trim());
    applyLogoChange(customLogoUrlInput.trim());
    setCustomLogoUrlInput('');
  };

  const applyLogoChange = (logo: string | null) => {
    LocalDb.setCustomBankLogo(logo);
    setCurrentLogo(logo);
    setLogoSaveSuccess(true);
    LocalDb.addAuditLog(
      currentUser.id, 
      currentUser.email, 
      'UPDATE_BANK_LOGO', 
      `Administrator ${currentUser.name} (${currentUser.email}) updated the bank logo image.`
    );
    if (onLogoUpdated) {
      onLogoUpdated(logo);
    }
    setTimeout(() => setLogoSaveSuccess(false), 3000);
  };

  const handleResetLogoToDefault = () => {
    setLogoErrorMsg('');
    LocalDb.setCustomBankLogo(null);
    setCurrentLogo(null);
    setPreviewLogo(DEFAULT_CBE_LOGO);
    setLogoSaveSuccess(true);
    LocalDb.addAuditLog(
      currentUser.id, 
      currentUser.email, 
      'RESET_BANK_LOGO', 
      `Administrator ${currentUser.name} reset the bank logo to official default CBE emblem.`
    );
    if (onLogoUpdated) {
      onLogoUpdated(null);
    }
    setTimeout(() => setLogoSaveSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans select-none">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex justify-between items-start pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-1.5 text-[#deb356] font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-[#61167e]" />
              <span className="text-[#61167e]">Admin Branding Node</span>
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mt-0.5">
              Manage Bank Logo Images
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Authorized access for <span className="font-semibold text-[#61167e] font-mono">{currentUser.email}</span>
            </p>
          </div>
          <button 
            id="btn-close-brand-modal"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview on Dark Card */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700">
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#61167e]" />
              Live Card Preview
            </span>
            <span className="text-[10px] text-gray-400 font-mono">Real-time sync</span>
          </div>

          <div className="bg-[#18191c] rounded-2xl p-4 text-white relative overflow-hidden border border-white/10 shadow-lg">
            <div className="flex items-center gap-3 relative z-10 min-w-0">
              <CbeLogo 
                src={previewLogo} 
                className="w-11 h-11 object-contain flex-shrink-0 drop-shadow-md rounded-md bg-white/5 p-0.5"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-[#deb356] font-extrabold text-sm tracking-wide leading-none whitespace-nowrap overflow-hidden text-ellipsis">
                  Commercial Bank of Ethiopia
                </h4>
                <p className="text-[#deb356]/80 text-[10px] font-medium tracking-tight mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                  The bank you can always rely on!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {logoSaveSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-1">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Bank logo successfully updated and applied across the entire app!</span>
          </div>
        )}

        {/* Error Alert */}
        {logoErrorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2 rounded-2xl text-xs font-semibold">
            {logoErrorMsg}
          </div>
        )}

        {/* Upload Logo from Device */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-800">
            1. Upload Logo from Device (PNG, SVG, JPG, WebP)
          </label>
          <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#61167e]/30 rounded-2xl bg-purple-50/40 hover:bg-purple-50 transition cursor-pointer group">
            {isProcessingLogo ? (
              <div className="flex flex-col items-center justify-center py-2">
                <Loader2 className="w-7 h-7 text-[#61167e] animate-spin mb-1" />
                <span className="text-xs font-bold text-[#61167e]">Optimizing &amp; Applying Image...</span>
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 text-[#61167e] group-hover:scale-110 transition mb-1.5" />
                <span className="text-xs font-bold text-[#61167e]">Click or Tap to Browse Image</span>
                <span className="text-[10px] text-gray-400 mt-0.5">Supports any resolution image (auto-optimized)</span>
              </>
            )}
            <input 
              id="input-bank-logo-upload-modal"
              type="file" 
              accept="image/*" 
              onChange={handleLogoFileUpload} 
              disabled={isProcessingLogo}
              className="hidden" 
            />
          </label>
        </div>

        {/* Direct Image Web URL */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-800">
            2. Or Enter Direct Image Web URL
          </label>
          <form onSubmit={handleLogoUrlApply} className="flex gap-2">
            <div className="relative flex-1">
              <Link className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input 
                id="input-bank-logo-url-modal"
                type="url" 
                placeholder="https://example.com/cbe-logo.png" 
                value={customLogoUrlInput}
                onChange={(e) => setCustomLogoUrlInput(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-gray-800 focus:outline-none focus:border-[#61167e] focus:bg-white"
              />
            </div>
            <button 
              id="btn-apply-logo-url"
              type="submit"
              className="bg-[#61167e] hover:bg-[#4d0f66] text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Apply
            </button>
          </form>
        </div>

        {/* Presets */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <label className="block text-xs font-bold text-gray-800">
            3. Official Presets
          </label>
          <div className="space-y-2">
            {PRESET_LOGOS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPreviewLogo(preset.url);
                  applyLogoChange(preset.url);
                }}
                className="w-full p-2.5 rounded-xl border border-gray-100 hover:border-[#61167e]/40 hover:bg-purple-50/30 transition text-left flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <img 
                    src={preset.url} 
                    alt={preset.name} 
                    className="w-7 h-7 object-contain bg-white rounded p-0.5 border border-gray-200" 
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <p className="text-xs font-bold text-gray-800">{preset.name}</p>
                    <p className="text-[10px] text-gray-400">{preset.description}</p>
                  </div>
                </div>
                <Sparkles className="w-3.5 h-3.5 text-[#deb356]" />
              </button>
            ))}
          </div>
        </div>

        {/* Reset Button */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <button
            id="btn-reset-logo-in-modal"
            type="button"
            onClick={handleResetLogoToDefault}
            className="text-xs font-semibold text-gray-500 hover:text-rose-600 transition flex items-center gap-1.5 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-rose-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Official Default</span>
          </button>

          <button
            id="btn-done-logo-modal"
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}

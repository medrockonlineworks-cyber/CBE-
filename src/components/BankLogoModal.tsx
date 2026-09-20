import React, { useState, useEffect } from 'react';
import { LocalDb, DEFAULT_CBE_LOGO, StampWeight } from '../lib/mockData';
import { UserProfile } from '../types';
import { CbeLogo } from './CbeLogo';
import { compressImageFile } from '../lib/imageUtils';
import { updatePwaBranding } from '../utils/pwaBranding';
import { 
  Image as ImageIcon, 
  Upload, 
  Link, 
  RotateCcw, 
  Check, 
  X, 
  ShieldCheck, 
  Eye,
  Loader2,
  Stamp,
  Sliders,
  Minus,
  Plus,
  Feather
} from 'lucide-react';

interface BankLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onLogoUpdated?: (newLogo: string | null) => void;
}

export default function BankLogoModal({ isOpen, onClose, currentUser, onLogoUpdated }: BankLogoModalProps) {
  const [activeTab, setActiveTab] = useState<'logo' | 'stamp'>('logo');
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [customLogoUrlInput, setCustomLogoUrlInput] = useState('');
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [logoSaveSuccess, setLogoSaveSuccess] = useState(false);
  const [logoErrorMsg, setLogoErrorMsg] = useState('');

  // Stamp States
  const [currentStamp, setCurrentStamp] = useState<string | null>(null);
  const [previewStamp, setPreviewStamp] = useState<string | null>(null);
  const [customStampUrlInput, setCustomStampUrlInput] = useState('');
  const [stampSize, setStampSize] = useState<number>(() => LocalDb.getBankStampSize());
  const [stampWeight, setStampWeight] = useState<StampWeight>(() => LocalDb.getBankStampWeight());
  const [isProcessingStamp, setIsProcessingStamp] = useState(false);
  const [stampSaveSuccess, setStampSaveSuccess] = useState(false);
  const [stampErrorMsg, setStampErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const savedLogo = LocalDb.getCustomBankLogo();
      setCurrentLogo(savedLogo);
      setPreviewLogo(savedLogo || DEFAULT_CBE_LOGO);
      setLogoSaveSuccess(false);
      setLogoErrorMsg('');

      const savedStamp = LocalDb.getCustomBankStamp();
      setCurrentStamp(savedStamp);
      setPreviewStamp(savedStamp || null);
      setStampSize(LocalDb.getBankStampSize());
      setStampWeight(LocalDb.getBankStampWeight());
      setStampSaveSuccess(false);
      setStampErrorMsg('');
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
    const trimmed = customLogoUrlInput.trim();
    if (!trimmed) {
      setLogoErrorMsg('Please enter an image URL.');
      return;
    }
    if (!trimmed.toLowerCase().startsWith('https://')) {
      setLogoErrorMsg('Only secure HTTPS URLs are allowed (must start with https://).');
      return;
    }
    setPreviewLogo(trimmed);
    applyLogoChange(trimmed);
    setCustomLogoUrlInput('');
  };

  const applyLogoChange = async (logo: string | null) => {
    LocalDb.setCustomBankLogo(logo);
    setCurrentLogo(logo);
    setLogoSaveSuccess(true);
    // Instantly sync PWA icons, server disk assets, and dynamic manifest with new custom logo
    await updatePwaBranding(logo);
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

  const handleResetLogoToDefault = async () => {
    setLogoErrorMsg('');
    LocalDb.setCustomBankLogo('/custom-bank-logo.png');
    setCurrentLogo('/custom-bank-logo.png');
    setPreviewLogo('/custom-bank-logo.png');
    setLogoSaveSuccess(true);
    // Reset PWA icons, server disk assets, and manifest back to uploaded PNG logo
    await updatePwaBranding('/custom-bank-logo.png');
    LocalDb.addAuditLog(
      currentUser.id, 
      currentUser.email, 
      'RESET_BANK_LOGO', 
      `Administrator ${currentUser.name} reset the bank logo to recently uploaded PNG logo.`
    );
    if (onLogoUpdated) {
      onLogoUpdated('/custom-bank-logo.png');
    }
    setTimeout(() => setLogoSaveSuccess(false), 3000);
  };

  // Stamp Handlers
  const handleStampFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setStampErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingStamp(true);
      const optimizedDataUrl = await compressImageFile(file, 500, 0.95);
      setPreviewStamp(optimizedDataUrl);
      applyStampChange(optimizedDataUrl);
    } catch (err: any) {
      console.error('Stamp image compression failed:', err);
      setStampErrorMsg('Failed to process stamp image. Please choose another file.');
    } finally {
      setIsProcessingStamp(false);
    }
  };

  const handleStampUrlApply = (e: React.FormEvent) => {
    e.preventDefault();
    setStampErrorMsg('');
    const trimmed = customStampUrlInput.trim();
    if (!trimmed) {
      setStampErrorMsg('Please enter a stamp image URL.');
      return;
    }
    if (!trimmed.toLowerCase().startsWith('https://')) {
      setStampErrorMsg('Only secure HTTPS URLs are allowed (must start with https://).');
      return;
    }
    setPreviewStamp(trimmed);
    applyStampChange(trimmed);
    setCustomStampUrlInput('');
  };

  const applyStampChange = (stamp: string | null) => {
    LocalDb.setCustomBankStamp(stamp);
    setCurrentStamp(stamp);
    setStampSaveSuccess(true);
    LocalDb.addAuditLog(
      currentUser.id, 
      currentUser.email, 
      'UPDATE_BANK_STAMP', 
      `Administrator ${currentUser.name} updated the web receipt stamp image.`
    );
    setTimeout(() => setStampSaveSuccess(false), 3000);
  };

  const handleResetStamp = () => {
    setStampErrorMsg('');
    LocalDb.setCustomBankStamp(null);
    setCurrentStamp(null);
    setPreviewStamp(null);
    setStampSaveSuccess(true);
    LocalDb.addAuditLog(
      currentUser.id, 
      currentUser.email, 
      'REMOVE_BANK_STAMP', 
      `Administrator ${currentUser.name} removed the web receipt stamp. Receipts will display with no stamp.`
    );
    setTimeout(() => setStampSaveSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans select-none">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex justify-between items-start pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-1.5 text-[#deb356] font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-[#68137e]" />
              <span className="text-[#68137e]">Admin Branding Node</span>
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mt-0.5">
              {activeTab === 'logo' ? 'Manage Bank Logo Images' : 'Manage Web Receipt Stamps'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Authorized access for <span className="font-semibold text-[#68137e] font-mono">{currentUser.email}</span>
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

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 bg-gray-100 p-1 rounded-2xl">
          <button
            id="tab-brand-modal-logo"
            type="button"
            onClick={() => setActiveTab('logo')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'logo'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-[#68137e]" />
            <span>Bank Logo</span>
          </button>
          <button
            id="tab-brand-modal-stamp"
            type="button"
            onClick={() => setActiveTab('stamp')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'stamp'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Stamp className="w-4 h-4 text-purple-600" />
            <span>Web Receipt Stamp</span>
          </button>
        </div>

        {/* TAB 1: BANK LOGO */}
        {activeTab === 'logo' && (
          <div className="space-y-4">
            {/* Live Preview on Dark Card */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#68137e]" />
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
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#68137e]/30 rounded-2xl bg-purple-50/40 hover:bg-purple-50 transition cursor-pointer group">
                {isProcessingLogo ? (
                  <div className="flex flex-col items-center justify-center py-2">
                    <Loader2 className="w-7 h-7 text-[#68137e] animate-spin mb-1" />
                    <span className="text-xs font-bold text-[#68137e]">Optimizing &amp; Applying Image...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-[#68137e] group-hover:scale-110 transition mb-1.5" />
                    <span className="text-xs font-bold text-[#68137e]">Click or Tap to Browse Image</span>
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
                2. Or Enter Direct HTTPS Image URL
              </label>
              <form onSubmit={handleLogoUrlApply} className="flex gap-2">
                <div className="relative flex-1">
                  <Link className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input 
                    id="input-bank-logo-url-modal"
                    type="url" 
                    placeholder="https://example.com/logo.png" 
                    value={customLogoUrlInput}
                    onChange={(e) => setCustomLogoUrlInput(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-gray-800 focus:outline-none focus:border-[#68137e] focus:bg-white"
                  />
                </div>
                <button 
                  id="btn-apply-logo-url"
                  type="submit"
                  className="bg-[#68137e] hover:bg-[#530d66] text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Apply
                </button>
              </form>
              <p className="text-[10px] text-gray-400">
                Supports uploaded files from device or secure HTTPS image URLs only.
              </p>
            </div>

            {/* Footer Actions */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              {currentLogo && currentLogo !== '/custom-bank-logo.png' ? (
                <button
                  id="btn-reset-logo-in-modal"
                  type="button"
                  onClick={handleResetLogoToDefault}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition flex items-center gap-1.5 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-rose-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Uploaded PNG Logo</span>
                </button>
              ) : (
                <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Active: Recently uploaded PNG logo
                </span>
              )}

              <button
                id="btn-done-logo-modal"
                onClick={onClose}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: WEB RECEIPT STAMP */}
        {activeTab === 'stamp' && (
          <div className="space-y-4">
            {/* Stamp Policy Banner */}
            <div className="bg-purple-50 border border-purple-200 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-purple-900 leading-relaxed">
              <Stamp className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Web Receipt Exclusive Policy:</strong> The CBE Web Receipt displays <span className="underline decoration-purple-600 font-bold">only uploaded stamps</span>. If no stamp is uploaded, the web receipt displays cleanly without any stamp.
              </div>
            </div>

            {/* Live Stamp Paper Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-purple-600" />
                  Live Web Receipt Stamp Preview
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  currentStamp ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {currentStamp ? 'Active on Web Receipts' : 'No Stamp Active'}
                </span>
              </div>

              {/* Receipt Paper Simulation Box */}
              <div className="bg-[#fcfaf5] rounded-2xl p-4 border border-amber-200/70 shadow-sm relative overflow-hidden flex items-center justify-center min-h-[140px]">
                {/* Receipt Grid pattern */}
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:8px_8px]" />
                
                {previewStamp ? (
                  <div className="relative z-10 w-28 h-28 flex items-center justify-center">
                    <img 
                      src={previewStamp} 
                      alt="Stamp Preview" 
                      className="w-full h-full object-contain pointer-events-none select-none"
                      style={{
                        mixBlendMode: 'multiply',
                        filter: 'contrast(1.15)',
                        transform: 'rotate(-13deg)'
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400 relative z-10 py-3">
                    <Stamp className="w-8 h-8 stroke-1 text-gray-300 mb-1" />
                    <span className="text-xs font-semibold text-gray-500">No Custom Stamp Uploaded</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">Web receipts render with no rubber stamp</span>
                  </div>
                )}
              </div>
            </div>

            {/* Success Alert */}
            {stampSaveSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-1">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Web receipt stamp updated! Web receipts will instantly reflect this change.</span>
              </div>
            )}

            {/* Error Alert */}
            {stampErrorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2 rounded-2xl text-xs font-semibold">
                {stampErrorMsg}
              </div>
            )}

            {/* Stamp Width & Weight Settings */}
            <div className="bg-purple-50/60 border border-purple-200/80 rounded-2xl p-3.5 space-y-3">
              {/* Width */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-purple-600" />
                    <span>Web Receipt Stamp Width (ስፋት)</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const newSize = Math.max(160, stampSize - 10);
                        LocalDb.setBankStampSize(newSize);
                        setStampSize(newSize);
                        setStampSaveSuccess(true);
                        setTimeout(() => setStampSaveSuccess(false), 2000);
                      }}
                      className="w-5 h-5 rounded bg-purple-200 hover:bg-purple-300 text-purple-800 flex items-center justify-center font-bold text-xs cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-mono font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full min-w-[50px] text-center">
                      {stampSize}px
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newSize = Math.min(480, stampSize + 10);
                        LocalDb.setBankStampSize(newSize);
                        setStampSize(newSize);
                        setStampSaveSuccess(true);
                        setTimeout(() => setStampSaveSuccess(false), 2000);
                      }}
                      className="w-5 h-5 rounded bg-purple-200 hover:bg-purple-300 text-purple-800 flex items-center justify-center font-bold text-xs cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min="160"
                  max="480"
                  step="5"
                  value={stampSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    LocalDb.setBankStampSize(newSize);
                    setStampSize(newSize);
                  }}
                  className="w-full accent-purple-600 h-1.5 bg-purple-200 rounded-lg cursor-pointer"
                />

                <div className="grid grid-cols-5 gap-1 pt-0.5">
                  {[
                    { label: 'Small', size: 220 },
                    { label: 'Normal', size: 260 },
                    { label: 'Med', size: 330 },
                    { label: 'Large', size: 380 },
                    { label: 'Jumbo', size: 440 },
                  ].map((preset) => (
                    <button
                      key={preset.size}
                      type="button"
                      onClick={() => {
                        LocalDb.setBankStampSize(preset.size);
                        setStampSize(preset.size);
                        setStampSaveSuccess(true);
                        setTimeout(() => setStampSaveSuccess(false), 2000);
                      }}
                      className={`py-1.5 px-0.5 rounded-xl text-[10.5px] font-semibold transition cursor-pointer text-center ${
                        stampSize === preset.size
                          ? 'bg-purple-700 text-white font-bold shadow-xs'
                          : 'bg-white border border-purple-200 text-purple-900 hover:bg-purple-100/60'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight / Ink Thickness */}
              <div className="space-y-1.5 pt-2 border-t border-purple-200/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Feather className="w-3.5 h-3.5 text-purple-600" />
                    <span>Stamp Weight / Ink Thickness (ክብደት)</span>
                  </span>
                  <span className="text-[11px] font-bold text-purple-700 capitalize">
                    {stampWeight}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1">
                  {(['light', 'normal', 'medium', 'bold', 'heavy'] as StampWeight[]).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => {
                        LocalDb.setBankStampWeight(w);
                        setStampWeight(w);
                        setStampSaveSuccess(true);
                        setTimeout(() => setStampSaveSuccess(false), 2000);
                      }}
                      className={`py-1 px-0.5 rounded-xl text-[10.5px] font-semibold transition cursor-pointer text-center capitalize ${
                        stampWeight === w
                          ? 'bg-purple-700 text-white font-bold shadow-xs'
                          : 'bg-white border border-purple-200 text-purple-900 hover:bg-purple-100/60'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 1. Upload Stamp from Device */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-800">
                1. Upload Stamp from Device (PNG with transparency, SVG, JPG, WebP)
              </label>
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-purple-300 rounded-2xl bg-purple-50/40 hover:bg-purple-50 transition cursor-pointer group">
                {isProcessingStamp ? (
                  <div className="flex flex-col items-center justify-center py-2">
                    <Loader2 className="w-7 h-7 text-purple-600 animate-spin mb-1" />
                    <span className="text-xs font-bold text-purple-600">Processing &amp; Optimizing Stamp...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-purple-600 group-hover:scale-110 transition mb-1.5" />
                    <span className="text-xs font-bold text-purple-600">Click or Tap to Browse Stamp Image</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">Transparent PNG circular stamps look best</span>
                  </>
                )}
                <input 
                  id="input-stamp-upload-modal"
                  type="file" 
                  accept="image/*" 
                  onChange={handleStampFileUpload} 
                  disabled={isProcessingStamp}
                  className="hidden" 
                />
              </label>
            </div>

            {/* 2. Direct Stamp Web URL */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-800">
                2. Or Enter Direct HTTPS Stamp Image URL
              </label>
              <form onSubmit={handleStampUrlApply} className="flex gap-2">
                <div className="relative flex-1">
                  <Link className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input 
                    id="input-stamp-url-modal"
                    type="url" 
                    placeholder="https://example.com/cbe-rubber-stamp.png" 
                    value={customStampUrlInput}
                    onChange={(e) => setCustomStampUrlInput(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-gray-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
                <button 
                  id="btn-apply-stamp-url-modal"
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Apply
                </button>
              </form>
              <p className="text-[10px] text-gray-400">
                Supports uploaded files from device or secure HTTPS image URLs only.
              </p>
            </div>

            {/* Stamp Footer Actions */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              {currentStamp ? (
                <button
                  id="btn-remove-stamp-in-modal"
                  type="button"
                  onClick={handleResetStamp}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition flex items-center gap-1.5 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-rose-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Remove Stamp (Receipts With No Stamp)</span>
                </button>
              ) : (
                <span className="text-[11px] text-gray-400 italic">No stamp active</span>
              )}

              <button
                id="btn-done-stamp-modal"
                onClick={onClose}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

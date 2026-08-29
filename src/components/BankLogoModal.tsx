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
  Loader2,
  QrCode as QrIcon
} from 'lucide-react';

interface BankLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onLogoUpdated?: (newLogo: string | null) => void;
  onQrUpdated?: (newQr: string | null) => void;
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

export default function BankLogoModal({ isOpen, onClose, currentUser, onLogoUpdated, onQrUpdated }: BankLogoModalProps) {
  // Logo states
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [customLogoUrlInput, setCustomLogoUrlInput] = useState('');
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [logoSaveSuccess, setLogoSaveSuccess] = useState(false);
  const [logoErrorMsg, setLogoErrorMsg] = useState('');

  // QR Code states
  const [currentQr, setCurrentQr] = useState<string | null>(null);
  const [previewQr, setPreviewQr] = useState<string | null>(null);
  const [customQrUrlInput, setCustomQrUrlInput] = useState('');
  const [isProcessingQr, setIsProcessingQr] = useState(false);
  const [qrSaveSuccess, setQrSaveSuccess] = useState(false);
  const [qrErrorMsg, setQrErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const savedLogo = LocalDb.getCustomBankLogo();
      setCurrentLogo(savedLogo);
      setPreviewLogo(savedLogo || DEFAULT_CBE_LOGO);
      setLogoSaveSuccess(false);
      setLogoErrorMsg('');

      const savedQr = LocalDb.getCustomQrCode();
      setCurrentQr(savedQr);
      setPreviewQr(savedQr);
      setQrSaveSuccess(false);
      setQrErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- LOGO HANDLERS ---
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

  // --- QR CODE HANDLERS ---
  const handleQrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setQrErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingQr(true);
      const optimizedDataUrl = await compressImageFile(file, 600, 0.95);
      setPreviewQr(optimizedDataUrl);
      applyQrChange(optimizedDataUrl);
    } catch (err: any) {
      console.error('QR code compression failed:', err);
      setQrErrorMsg('Failed to process QR code image. Please choose another file.');
    } finally {
      setIsProcessingQr(false);
    }
  };

  const handleQrUrlApply = (e: React.FormEvent) => {
    e.preventDefault();
    setQrErrorMsg('');
    if (!customQrUrlInput.trim()) {
      setQrErrorMsg('Please enter a valid QR code image URL.');
      return;
    }
    setPreviewQr(customQrUrlInput.trim());
    applyQrChange(customQrUrlInput.trim());
    setCustomQrUrlInput('');
  };

  const applyQrChange = (qr: string | null) => {
    LocalDb.setCustomQrCode(qr);
    setCurrentQr(qr);
    setQrSaveSuccess(true);
    LocalDb.addAuditLog(
      currentUser.id, 
      currentUser.email, 
      'UPDATE_QR_CODE', 
      `Administrator ${currentUser.name} (${currentUser.email}) uploaded/updated custom receipt QR code.`
    );
    if (onQrUpdated) {
      onQrUpdated(qr);
    }
    setTimeout(() => setQrSaveSuccess(false), 3000);
  };

  const handleResetQrToDefault = () => {
    setQrErrorMsg('');
    LocalDb.setCustomQrCode(null);
    setCurrentQr(null);
    setPreviewQr(null);
    setQrSaveSuccess(true);
    LocalDb.addAuditLog(
      currentUser.id, 
      currentUser.email, 
      'RESET_QR_CODE', 
      `Administrator ${currentUser.name} reset the receipt QR code to high-density dynamic mathematical matrix.`
    );
    if (onQrUpdated) {
      onQrUpdated(null);
    }
    setTimeout(() => setQrSaveSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans select-none">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto scrollbar-none">
        
        {/* Modal Header */}
        <div className="flex justify-between items-start pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-1.5 text-[#deb356] font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-[#61167e]" />
              <span className="text-[#61167e]">Admin Branding &amp; Asset Node</span>
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mt-0.5">
              Brand Assets &amp; Receipt Manager
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

        {/* SECTION 1: BANK LOGO UPLOADER */}
        <div className="space-y-4 bg-gray-50/70 p-4 rounded-2xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#61167e]/10 text-[#61167e] rounded-lg">
                <ImageIcon className="w-4 h-4" />
              </div>
              <h4 className="font-extrabold text-sm text-gray-900">
                1. Bank Logo &amp; Header Emblem
              </h4>
            </div>
            <span className="text-[10px] font-mono text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-200">
              {currentLogo ? 'Custom Logo' : 'Official CBE'}
            </span>
          </div>

          {/* Live Preview on Dark Card */}
          <div className="bg-[#18191c] rounded-2xl p-3.5 text-white relative overflow-hidden border border-white/10 shadow-md">
            <div className="flex items-center gap-3 relative z-10 min-w-0">
              <CbeLogo 
                src={previewLogo} 
                className="w-10 h-10 object-contain flex-shrink-0 drop-shadow-md rounded-md bg-white/5 p-0.5"
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

          {/* Logo Success Alert */}
          {logoSaveSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Bank logo updated and synced across the app!</span>
            </div>
          )}

          {/* Logo Error Alert */}
          {logoErrorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-xl text-xs font-semibold">
              {logoErrorMsg}
            </div>
          )}

          {/* Upload Logo from Device */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              Upload Logo from Device
            </label>
            <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-[#61167e]/30 rounded-xl bg-purple-50/40 hover:bg-purple-50 transition cursor-pointer group">
              {isProcessingLogo ? (
                <div className="flex items-center gap-2 py-1">
                  <Loader2 className="w-5 h-5 text-[#61167e] animate-spin" />
                  <span className="text-xs font-bold text-[#61167e]">Optimizing Logo...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[#61167e]">
                  <Upload className="w-4 h-4 group-hover:scale-110 transition" />
                  <span className="text-xs font-bold">Choose Logo Image (PNG, SVG, JPG, WebP)</span>
                </div>
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

          {/* Direct Logo URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              Or Enter Direct Image Web URL
            </label>
            <form onSubmit={handleLogoUrlApply} className="flex gap-2">
              <div className="relative flex-1">
                <Link className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input 
                  id="input-bank-logo-url-modal"
                  type="url" 
                  placeholder="https://example.com/cbe-logo.png" 
                  value={customLogoUrlInput}
                  onChange={(e) => setCustomLogoUrlInput(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-gray-800 focus:outline-none focus:border-[#61167e]"
                />
              </div>
              <button 
                id="btn-apply-logo-url"
                type="submit"
                className="bg-[#61167e] hover:bg-[#4d0f66] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex-shrink-0"
              >
                Apply
              </button>
            </form>
          </div>

          {/* Presets & Reset Logo */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-200/80">
            <div className="flex gap-2">
              {PRESET_LOGOS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPreviewLogo(preset.url);
                    applyLogoChange(preset.url);
                  }}
                  className="text-[11px] font-semibold text-gray-600 hover:text-[#61167e] bg-white border border-gray-200 px-2 py-1 rounded-lg hover:bg-purple-50/50 transition cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-[#deb356]" />
                  <span>{idx === 0 ? 'Default Emblem' : 'CBE Vector'}</span>
                </button>
              ))}
            </div>

            <button
              id="btn-reset-logo-in-modal"
              type="button"
              onClick={handleResetLogoToDefault}
              className="text-xs font-semibold text-gray-500 hover:text-rose-600 transition flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-rose-50"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* SECTION 2: QR CODE UPLOADER (BELOW LOGO UPLOADER) */}
        <div className="space-y-4 bg-amber-50/40 p-4 rounded-2xl border border-amber-200/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/10 text-[#61167e] rounded-lg">
                <QrIcon className="w-4 h-4" />
              </div>
              <h4 className="font-extrabold text-sm text-gray-900">
                2. Receipt QR Code Uploader
              </h4>
            </div>
            <span className="text-[10px] font-mono text-gray-700 bg-white px-2 py-0.5 rounded-md border border-amber-200">
              {currentQr ? 'Custom QR Code' : 'Dynamic 33x33 Matrix'}
            </span>
          </div>

          {/* QR Code Live Preview */}
          <div className="bg-white rounded-2xl p-3.5 border border-amber-200/70 shadow-sm flex items-center gap-4">
            <div className="w-18 h-18 bg-gray-50 rounded-xl p-1.5 border border-gray-200 shadow-inner flex items-center justify-center flex-shrink-0 overflow-hidden">
              {previewQr ? (
                <img 
                  src={previewQr} 
                  alt="Custom Uploaded QR" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="grid grid-cols-5 gap-0.5 w-full h-full p-1 opacity-80">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`rounded-[0.5px] ${
                        (i % 2 === 0 || i === 6 || i === 12 || i === 18 || i === 24) ? 'bg-black' : 'bg-transparent'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900">
                {previewQr ? 'Custom Receipt QR Active' : 'High-Density 33x33 Matrix Active'}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {previewQr 
                  ? 'Displays this customized QR code on all generated & downloaded receipts.' 
                  : 'Renders dynamic mathematical 33x33 modules (1,089 cells) seeded per transaction.'}
              </p>
            </div>
          </div>

          {/* QR Code Success Alert */}
          {qrSaveSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Receipt QR code successfully saved and active across all receipts!</span>
            </div>
          )}

          {/* QR Code Error Alert */}
          {qrErrorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-xl text-xs font-semibold">
              {qrErrorMsg}
            </div>
          )}

          {/* Upload QR from Device */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              Upload Custom QR Code from Device
            </label>
            <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-amber-400/50 rounded-xl bg-amber-50/60 hover:bg-amber-50 transition cursor-pointer group">
              {isProcessingQr ? (
                <div className="flex items-center gap-2 py-1">
                  <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                  <span className="text-xs font-bold text-amber-800">Optimizing QR Image...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[#61167e]">
                  <Upload className="w-4 h-4 group-hover:scale-110 transition" />
                  <span className="text-xs font-extrabold">Choose QR Image (PNG, JPG, SVG, WebP)</span>
                </div>
              )}
              <input 
                id="input-qr-upload-below-logo"
                type="file" 
                accept="image/*" 
                onChange={handleQrFileUpload} 
                disabled={isProcessingQr}
                className="hidden" 
              />
            </label>
          </div>

          {/* Direct QR Image URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              Or Enter Direct QR Code Web URL
            </label>
            <form onSubmit={handleQrUrlApply} className="flex gap-2">
              <div className="relative flex-1">
                <Link className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input 
                  id="input-qr-url-below-logo"
                  type="url" 
                  placeholder="https://example.com/cbe-receipt-qr.png" 
                  value={customQrUrlInput}
                  onChange={(e) => setCustomQrUrlInput(e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-gray-800 focus:outline-none focus:border-[#61167e]"
                />
              </div>
              <button 
                id="btn-apply-qr-url-below-logo"
                type="submit"
                className="bg-amber-400 hover:bg-amber-300 text-purple-950 px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex-shrink-0 shadow-xs"
              >
                Apply
              </button>
            </form>
          </div>

          {/* Reset QR Code */}
          <div className="flex items-center justify-between pt-1 border-t border-amber-200/60">
            <button
              id="btn-reset-qr-in-modal"
              type="button"
              onClick={handleResetQrToDefault}
              className="text-xs font-semibold text-gray-600 hover:text-red-700 transition flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-red-50"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Dynamic 33x33 Matrix</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-end">
          <button
            id="btn-done-brand-modal"
            onClick={onClose}
            className="bg-[#61167e] hover:bg-[#52106b] text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-md"
          >
            Save &amp; Done
          </button>
        </div>

      </div>
    </div>
  );
}

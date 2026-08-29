import React, { useState, useEffect } from 'react';
import { LocalDb } from '../lib/mockData';
import { UserProfile } from '../types';
import { compressImageFile } from '../lib/imageUtils';
import { 
  QrCode as QrIcon, 
  Upload, 
  Link, 
  RotateCcw, 
  Check, 
  X, 
  ShieldCheck, 
  Eye, 
  Loader2,
  Sparkles
} from 'lucide-react';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onQrUpdated?: (newQr: string | null) => void;
}

export default function QrCodeModal({ isOpen, onClose, currentUser, onQrUpdated }: QrCodeModalProps) {
  const [currentQr, setCurrentQr] = useState<string | null>(null);
  const [previewQr, setPreviewQr] = useState<string | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const saved = LocalDb.getCustomQrCode();
      setCurrentQr(saved);
      setPreviewQr(saved);
      setSaveSuccess(false);
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const optimizedDataUrl = await compressImageFile(file, 600, 0.95);
      setPreviewQr(optimizedDataUrl);
      applyQrChange(optimizedDataUrl);
    } catch (err: any) {
      console.error('QR code compression failed:', err);
      setErrorMsg('Failed to process QR code image. Please choose another file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlApply = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!customUrlInput.trim()) {
      setErrorMsg('Please enter a valid QR code image URL.');
      return;
    }
    setPreviewQr(customUrlInput.trim());
    applyQrChange(customUrlInput.trim());
    setCustomUrlInput('');
  };

  const applyQrChange = (qr: string | null) => {
    LocalDb.setCustomQrCode(qr);
    setCurrentQr(qr);
    setSaveSuccess(true);
    LocalDb.addAuditLog(
      currentUser.id, 
      currentUser.email, 
      'UPDATE_QR_CODE', 
      `Administrator ${currentUser.name} (${currentUser.email}) uploaded/updated custom receipt QR code.`
    );
    if (onQrUpdated) {
      onQrUpdated(qr);
    }
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetToDefault = () => {
    setErrorMsg('');
    LocalDb.setCustomQrCode(null);
    setCurrentQr(null);
    setPreviewQr(null);
    setSaveSuccess(true);
    LocalDb.addAuditLog(
      currentUser.id, 
      currentUser.email, 
      'RESET_QR_CODE', 
      `Administrator ${currentUser.name} reset the receipt QR code to high-density dynamic mathematical matrix.`
    );
    if (onQrUpdated) {
      onQrUpdated(null);
    }
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans select-none">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex justify-between items-start pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-1.5 text-[#deb356] font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-[#61167e]" />
              <span className="text-[#61167e]">Admin Branding &amp; Assets Node</span>
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mt-0.5">
              Upload Custom Receipt QR Code
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Authorized access for <span className="font-semibold text-[#61167e] font-mono">{currentUser.email}</span>
            </p>
          </div>
          <button 
            id="btn-close-qr-modal"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview on Receipt Card */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700">
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#61167e]" />
              Live Receipt Preview
            </span>
            <span className="text-[10px] text-gray-400 font-mono">
              {currentQr ? 'Using Custom QR' : 'Using 33x33 Matrix'}
            </span>
          </div>

          <div className="bg-[#ededf0] rounded-2xl p-4 border border-gray-200 shadow-inner flex flex-col items-center justify-center space-y-2">
            <p className="text-[11px] text-gray-500 font-bold self-start">Transaction Summary Preview</p>
            
            <div className="w-32 h-32 bg-white rounded-xl p-2 border border-gray-300 shadow-sm flex items-center justify-center overflow-hidden">
              {previewQr ? (
                <img 
                  src={previewQr} 
                  alt="Custom Uploaded QR" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="grid grid-cols-6 gap-0.5 w-full h-full p-1 opacity-85">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`rounded-[1px] ${
                        (i % 2 === 0 || i === 7 || i === 19 || i === 31 || i === 35) ? 'bg-black' : 'bg-transparent'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <p className="text-[10px] text-center text-gray-600 font-medium">
              {previewQr 
                ? 'Custom QR Code active on all generated and downloaded receipts.'
                : 'High-density dynamic 33x33 matrix active by default.'}
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-1">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>QR Code saved successfully and synced across all receipts!</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <X className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Upload Action Area */}
        <div className="space-y-3 pt-1">
          <label className="block text-xs font-bold text-gray-800">
            Upload from Device
          </label>

          <label className="border-2 border-dashed border-[#61167e]/30 hover:border-[#61167e] bg-purple-50/40 hover:bg-purple-50/80 rounded-2xl p-4 transition flex flex-col items-center justify-center text-center cursor-pointer group">
            <input 
              id="input-qr-file-upload"
              type="file" 
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
            />
            {isProcessing ? (
              <div className="py-2 flex flex-col items-center">
                <Loader2 className="w-6 h-6 text-[#61167e] animate-spin mb-1" />
                <span className="text-xs font-bold text-[#61167e]">Optimizing image...</span>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-[#61167e]/10 text-[#61167e] flex items-center justify-center mb-1 group-hover:scale-110 transition">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-extrabold text-[#61167e]">
                  Tap to upload QR Code image
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  PNG, JPG, SVG, WEBP (auto-compressed)
                </p>
              </>
            )}
          </label>
        </div>

        {/* Direct Image URL Form */}
        <form onSubmit={handleUrlApply} className="space-y-2 pt-1">
          <label className="block text-xs font-bold text-gray-800">
            Or Paste Online Image URL
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input 
                id="input-qr-url"
                type="url"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                placeholder="https://example.com/cbe_qr.png"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#61167e] font-mono"
              />
            </div>
            <button
              id="btn-apply-qr-url"
              type="submit"
              className="bg-[#61167e] hover:bg-[#52106b] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer flex-shrink-0"
            >
              Apply
            </button>
          </div>
        </form>

        {/* Reset to Default */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <button
            id="btn-reset-default-qr"
            type="button"
            onClick={handleResetToDefault}
            className="text-xs font-bold text-gray-600 hover:text-red-700 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to High-Density Dynamic Matrix</span>
          </button>

          <button
            id="btn-done-qr-modal"
            type="button"
            onClick={onClose}
            className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}

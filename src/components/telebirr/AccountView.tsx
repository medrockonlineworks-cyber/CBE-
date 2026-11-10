import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, 
  Upload, 
  RotateCcw, 
  Image as ImageIcon, 
  Sparkles, 
  Check, 
  Trash2, 
  FileSpreadsheet, 
  Download, 
  FileText, 
  Sliders, 
  ChevronRight,
  Eye,
  CheckCircle2,
  ArrowRight,
  Building2
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { EthioTelecomLogo, TelebirrLogo } from '../TelebirrBrandAssets';

export interface AccountViewProps {
  onBack?: () => void;
  onOpenCbe?: () => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ onBack, onOpenCbe }) => {
  const {
    userName,
    setUserName,
    phoneNumber,
    setPhoneNumber,
    language,
    setLanguage,
    customHeaderBgImage,
    setCustomHeaderBgImage,
    customEthioLogo,
    setCustomEthioLogo,
    customTelebirrLogo,
    setCustomTelebirrLogo,
    customButtonLogos,
    setCustomButtonLogo,
    transactions,
    resetAllData,
    setActiveSubView
  } = useWallet();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadTarget, setActiveUploadTarget] = useState<string>('header_bg');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [activeLogoTab, setActiveLogoTab] = useState<'all' | 'grid1' | 'grid2'>('grid1');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Background presets matching Screenshot 2
  const bgPresets = [
    {
      id: 'default',
      name: 'Authentic Contour (Default)',
      desc: 'Original Telebirr lime green with topographical contours',
      bgStyle: 'linear-gradient(135deg, #7BBF18, #6bb012)',
      value: ''
    },
    {
      id: 'emerald',
      name: 'Deep Emerald Curves',
      desc: 'Deep forest and emerald luxury wave gradients',
      bgStyle: 'linear-gradient(135deg, #064e3b, #047857)',
      value: 'linear-gradient(135deg, #064e3b, #047857)'
    },
    {
      id: 'golden',
      name: 'Golden Sunrise Ribbon',
      desc: 'Warm Ethiopian amber and gold gradients',
      bgStyle: 'linear-gradient(135deg, #b45309, #d97706)',
      value: 'linear-gradient(135deg, #b45309, #d97706)'
    },
    {
      id: 'cyber',
      name: 'Cyber Wave Cyan & Lime',
      desc: 'Modern high-tech telecom mesh combining cyan and lime',
      bgStyle: 'linear-gradient(135deg, #0e7490, #047857)',
      value: 'linear-gradient(135deg, #0e7490, #047857)'
    }
  ];

  // 16 button keys matching Screenshot 5 & 6
  const serviceButtons = [
    { id: 'send_money', label: 'Send Money', grid: 1 },
    { id: 'cash_out', label: 'Cash In/ Out', grid: 1 },
    { id: 'airtime', label: 'Airtime/ Buy Package', grid: 1 },
    { id: 'zemen_gebeya', label: 'Zemen GEBEYA', grid: 1 },
    { id: 'dashen', label: 'Financial Service With Dashen', grid: 1 },
    { id: 'financial_services', label: 'Transfer to Bank', grid: 1 },
    { id: 'cbe', label: 'Financial Service With CBE', grid: 1 },
    { id: 'siinqee', label: 'Financial Service with Siinqee', grid: 1 },
    { id: 'receive_money', label: 'Receive Money', grid: 2 },
    { id: 'pay_merchant', label: 'Pay for Merchant', grid: 2 },
    { id: 'utility_bills', label: 'teleEV Charging', grid: 2 },
    { id: 'tolo', label: 'TOLO Payment', grid: 2 },
    { id: 'traffic', label: 'AA Traffic', grid: 2 },
    { id: 'aatma', label: 'AATMA', grid: 2 },
    { id: 'fundraising', label: 'Fundraising', grid: 2 },
    { id: 'lottery', label: 'Telebirr Lottery', grid: 2 },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (activeUploadTarget === 'header_bg') {
        setCustomHeaderBgImage(dataUrl);
        showToast('Header wallpaper updated!');
      } else if (activeUploadTarget === 'ethio_logo') {
        setCustomEthioLogo(dataUrl);
        showToast('Ethio Telecom logo updated!');
      } else if (activeUploadTarget === 'telebirr_logo') {
        setCustomTelebirrLogo(dataUrl);
        showToast('Telebirr logo updated!');
      } else if (activeUploadTarget.startsWith('btn_')) {
        const btnId = activeUploadTarget.replace('btn_', '');
        setCustomButtonLogo(btnId, dataUrl);
        showToast(`Button logo for ${btnId} updated!`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const triggerUpload = (target: string) => {
    setActiveUploadTarget(target);
    fileInputRef.current?.click();
  };

  const filteredButtons = serviceButtons.filter(b => {
    if (activeLogoTab === 'all') return true;
    if (activeLogoTab === 'grid1') return b.grid === 1;
    if (activeLogoTab === 'grid2') return b.grid === 2;
    return true;
  });

  return (
    <div className="w-full flex-1 flex flex-col bg-[#F4F6F8] min-h-screen pb-28 select-none animate-fade-in">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/90 text-white rounded-full text-xs font-bold shadow-xl border border-white/20 animate-fade-in flex items-center gap-1.5 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Bar with back to Home or CBE navigation */}
      <div className="w-full bg-[#7BBF18] px-4 pt-3 pb-1 flex items-center justify-between text-white">
        <button
          type="button"
          onClick={() => setActiveSubView('home')}
          className="p-1.5 -ml-1 rounded-full hover:bg-white/20 active:scale-95 text-white transition cursor-pointer flex items-center gap-1"
          title="Back to Telebirr Home"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.4]" />
          <span className="text-xs font-bold">Home</span>
        </button>

      </div>

      {/* Top Profile Header matching Screenshot 2 */}
      <div className="w-full bg-[#7BBF18] px-5 pt-2 pb-6 text-white flex items-center gap-3.5 shadow-sm">
        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center p-2 backdrop-blur-xs">
          <svg viewBox="0 0 24 24" className="w-full h-full fill-white">
            <circle cx="12" cy="7" r="4.2" />
            <path d="M4 21 C4 15.6 7.6 13 12 13 C16.4 13 20 15.6 20 21 Z" />
          </svg>
        </div>

        <div className="flex flex-col">
          <span className="text-[19px] font-black tracking-normal leading-tight">
            {userName}
          </span>
          <span className="text-[13.5px] text-white/90 font-mono font-medium">
            {phoneNumber}
          </span>
          <span className="inline-block mt-1 bg-white/25 border border-white/30 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full w-max tracking-wide">
            Tier 3 Verified Account (Demo)
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* SECTION 1: Upload Custom Image / Wallpaper matching Screenshot 2 */}
        <div className="w-full bg-white rounded-3xl p-5 shadow-xs border border-gray-100 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lime-100 text-lime-700 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 leading-tight">Upload Custom Image</h3>
              <p className="text-xs text-gray-500 mt-0.5">Upload any personal image or wallpaper from your device</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => triggerUpload('header_bg')}
              className="flex-1 py-2.5 rounded-2xl bg-[#7BBF18] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-[#72be20] transition shadow-xs cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Image</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomHeaderBgImage('');
                showToast('Reset to default contour wallpaper.');
              }}
              className="py-2.5 px-4 rounded-2xl bg-gray-100 text-gray-700 font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-gray-200 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>

          {/* Sample Background Presets */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
                Sample Background Presets
              </span>
              <span className="text-[11px] text-gray-400">Click to apply instantly</span>
            </div>

            <div className="flex flex-col gap-2">
              {bgPresets.map(preset => (
                <div
                  key={preset.id}
                  onClick={() => {
                    setCustomHeaderBgImage(preset.value);
                    showToast(`Applied preset: ${preset.name}`);
                  }}
                  className="p-3 rounded-2xl border border-gray-100 bg-white hover:border-[#7BBF18] transition flex items-center gap-3 cursor-pointer group shadow-2xs"
                >
                  <div 
                    className="w-12 h-10 rounded-xl shrink-0 shadow-xs border border-black/10"
                    style={{ background: preset.bgStyle }}
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-bold text-gray-900 group-hover:text-[#7BBF18] transition truncate">
                      {preset.name}
                    </span>
                    <span className="text-[11px] text-gray-500 truncate">
                      {preset.desc}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#7BBF18]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 2: Brand & Button Logo Upload matching Screenshot 5 & 6 */}
        <div className="w-full bg-white rounded-3xl p-5 shadow-xs border border-gray-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 leading-tight">Brand & Button Logo Upload</h3>
                <p className="text-xs text-gray-500 mt-0.5">Upload custom logos for Ethio Telecom, TeleBirr, and all 16 service buttons</p>
              </div>
            </div>
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md uppercase shrink-0">
              Custom Logos
            </span>
          </div>

          {/* 1. MAIN BRAND LOGOS (TOP HEADER) */}
          <div className="flex flex-col gap-2 pt-1">
            <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
              1. Main Brand Logos (Top Header)
            </span>

            {/* Ethio Telecom */}
            <div className="p-3.5 rounded-2xl border border-gray-100 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Ethio Telecom</span>
                  <span className="text-[11px] text-gray-500">Left Header Brand Logo</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Custom</span>
              </div>
              <div className="h-14 border border-dashed border-gray-200 rounded-xl flex items-center justify-center p-2 bg-gray-50">
                {customEthioLogo ? (
                  <img src={customEthioLogo} alt="Ethio" className="max-h-full max-w-full object-contain" />
                ) : (
                  <EthioTelecomLogo className="h-7" />
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => triggerUpload('ethio_logo')}
                  className="flex-1 py-2 rounded-xl bg-[#7BBF18] text-white text-xs font-bold flex items-center justify-center gap-1 hover:bg-[#72be20] transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Logo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomEthioLogo('');
                    showToast('Reset Ethio Telecom logo.');
                  }}
                  className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* TeleBirr */}
            <div className="p-3.5 rounded-2xl border border-gray-100 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-900 block">TeleBirr</span>
                  <span className="text-[11px] text-gray-500">Right Header Logo & App Icon</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Custom</span>
              </div>
              <div className="h-14 border border-dashed border-gray-200 rounded-xl flex items-center justify-center p-2 bg-gray-50">
                {customTelebirrLogo ? (
                  <img src={customTelebirrLogo} alt="Telebirr" className="max-h-full max-w-full object-contain" />
                ) : (
                  <TelebirrLogo className="h-8" />
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => triggerUpload('telebirr_logo')}
                  className="flex-1 py-2 rounded-xl bg-[#0072CE] text-white text-xs font-bold flex items-center justify-center gap-1 hover:bg-[#0060b0] transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Logo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomTelebirrLogo('');
                    showToast('Reset Telebirr logo.');
                  }}
                  className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 2. SERVICE BUTTON LOGOS (16 BUTTONS) matching Screenshot 5 & 6 */}
          <div className="flex flex-col gap-2.5 pt-2">
            <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
              2. Service Button Logos (16 Buttons)
            </span>

            {/* Tabs: All (16) | Grid 1 (8) | Grid 2 (8) */}
            <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
              {[
                { id: 'all', label: 'All (16)' },
                { id: 'grid1', label: 'Grid 1 (8)' },
                { id: 'grid2', label: 'Grid 2 (8)' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveLogoTab(tab.id as any)}
                  className={`flex-1 py-1.5 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                    activeLogoTab === tab.id ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 2-Column Grid of customizable buttons */}
            <div className="grid grid-cols-2 gap-2">
              {filteredButtons.map(btn => {
                const customImg = customButtonLogos[btn.id];
                return (
                  <div key={btn.id} className="p-3 rounded-2xl border border-gray-100 flex flex-col gap-2 bg-gray-50/50">
                    <span className="text-[10px] font-mono text-gray-400">#{btn.id}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                        {customImg ? (
                          <img src={customImg} alt={btn.label} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-xs font-black text-[#7BBF18]">{btn.label.charAt(0)}</span>
                        )}
                      </div>
                      <span className="text-[11.5px] font-bold text-gray-900 leading-tight truncate">
                        {btn.label}
                      </span>
                    </div>

                    <div className="flex gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => triggerUpload(`btn_${btn.id}`)}
                        className="flex-1 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 text-[11px] font-bold flex items-center justify-center gap-1 hover:border-[#7BBF18] hover:text-[#7BBF18] transition"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload</span>
                      </button>
                      {customImg && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomButtonLogo(btn.id, '');
                            showToast(`Reset icon for ${btn.label}`);
                          }}
                          className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECTION 3: Telebirr CSV Importer & Data Reset matching Screenshot 8 */}
        <div className="w-full bg-white rounded-3xl p-5 shadow-xs border border-gray-100 flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 leading-tight">Telebirr CSV Importer</h3>
                <p className="text-xs text-gray-500 mt-0.5">Upload bank/telebirr CSV statements or export history</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              {transactions.length} Records
            </span>
          </div>

          <div 
            onClick={() => showToast('CSV import ready (Drag & drop enabled)')}
            className="w-full p-5 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer hover:border-[#7BBF18] transition bg-gray-50/50"
          >
            <Upload className="w-6 h-6 text-[#7BBF18]" />
            <span className="text-xs font-bold text-gray-800">Click or drop your TeleBirr CSV file here</span>
            <span className="text-[10px] text-gray-400">Supports Telebirr official exports & bank statements</span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => showToast('Sample statement loaded')}
              className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition"
            >
              Load Sample Data
            </button>
            <button
              type="button"
              onClick={() => showToast('CSV statement exported')}
              className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition flex items-center justify-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">Current active transactions: {transactions.length}</span>
            <button
              type="button"
              onClick={() => {
                resetAllData();
                showToast('All data reset to factory default (1,930.26 ETB).');
              }}
              className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
            >
              Reset App Data
            </button>
          </div>
        </div>

        {/* SECTION 4: Language Selector Toggle */}
        <div className="w-full bg-white rounded-3xl p-4 shadow-xs border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <span className="font-extrabold text-sm">EN</span>
            </div>
            <div>
              <span className="text-sm font-extrabold text-gray-900 block">Language / ቋንቋ</span>
              <span className="text-xs text-gray-500">English / አማርኛ (Amharic)</span>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                language === 'en' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('am')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                language === 'am' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'
              }`}
            >
              አማ
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AccountView;

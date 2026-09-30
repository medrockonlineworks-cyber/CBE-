import React, { useState } from 'react';
import { useWallet } from '../../context/WalletContext';
import { 
  CbeMedallionIcon, 
  DashenGridBadge, 
  SiinqeeGridBadge, 
  ZemenGebeyaBadge 
} from '../TelebirrBrandAssets';

export interface ServiceGridProps {
  onSelectService?: (serviceKey: string) => void;
  className?: string;
}

export const TelebirrServiceGrid: React.FC<ServiceGridProps> = ({
  onSelectService,
  className = '',
}) => {
  const { language, setActiveSubView, customButtonLogos } = useWallet();
  const [activePage, setActivePage] = useState<number>(0);
  const [showSendMoneyModal, setShowSendMoneyModal] = useState<boolean>(false);

  // Page 1: 8 Primary Tiles matching Screenshot 1
  const page1Services = [
    {
      id: 'send_money',
      nameEn: 'Send Money',
      nameAm: 'ገንዘብ መላክ',
      action: () => setShowSendMoneyModal(true),
      icon: (
        <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7 text-[#72be20]" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="13" width="30" height="22" rx="4" stroke="currentColor" strokeWidth="2.4" fill="none" />
          <path d="M 5 18 L 35 18" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="28" cy="24" r="2.4" fill="currentColor" />
          <path d="M 12 13 L 12 7 C 12 5.5, 13.5 4, 15 4 L 25 4 C 26.5 4, 28 5.5, 28 7 L 28 13" stroke="currentColor" strokeWidth="2.2" strokeDasharray="2.5 1.5" />
          <path d="M 20 2 L 20 10 M 16 6 L 20 2 L 24 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      id: 'cash_out',
      nameEn: 'Cash In/ Out',
      nameAm: 'ገንዘብ ማውጣት/ማስገባት',
      action: () => onSelectService ? onSelectService('cash_out') : alert('Agent Cash In / Cash Out selected.'),
      icon: (
        <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7 text-[#72be20]" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="12" width="30" height="23" rx="4" stroke="currentColor" strokeWidth="2.4" fill="none" />
          <circle cx="28" cy="23.5" r="2.5" fill="currentColor" />
          <path d="M 18 19 L 18 28 M 13.5 23.5 L 22.5 23.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      )
    },
    {
      id: 'airtime',
      nameEn: 'Airtime/ Buy Package',
      nameAm: 'አየር ሰዓት/ፓኬጅ',
      badge: 'Up to 35%',
      action: () => onSelectService ? onSelectService('airtime') : alert('Ethio Telecom Airtime & Packages selected.'),
      icon: (
        <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7 text-[#72be20]" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="16" width="20" height="18" rx="3" stroke="currentColor" strokeWidth="2.3" fill="none" />
          <path d="M 7 12 L 33 12 L 33 16 L 7 16 Z" stroke="currentColor" strokeWidth="2.3" fill="none" />
          <path d="M 20 12 L 20 34" stroke="currentColor" strokeWidth="2.2" />
          <path d="M 20 4 L 20 8 M 14 6 L 17 9 M 26 6 L 23 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      )
    },
    {
      id: 'zemen_gebeya',
      nameEn: 'Zemen GEBEYA',
      nameAm: 'ዘመን ገበያ',
      action: () => setActiveSubView('/apps'),
      icon: <ZemenGebeyaBadge className="w-8 h-8" />
    },
    {
      id: 'dashen',
      nameEn: 'Financial Service With Dashen',
      nameAm: 'ዳሸን ባንክ',
      action: () => setActiveSubView('/transfer-to-bank'),
      icon: <DashenGridBadge className="w-8 h-8" />
    },
    {
      id: 'cbe',
      nameEn: 'Financial Service With CBE',
      nameAm: 'የኢትዮጵያ ንግድ ባንክ',
      action: () => setActiveSubView('/transfer-to-bank'),
      icon: <CbeMedallionIcon className="w-8 h-8" />
    },
    {
      id: 'siinqee',
      nameEn: 'Financial Service with Siinqee',
      nameAm: 'ሲንቄ ባንክ',
      action: () => setActiveSubView('/transfer-to-bank'),
      icon: <SiinqeeGridBadge className="w-8 h-8" />
    },
    {
      id: 'bank',
      nameEn: 'Transfer to Bank',
      nameAm: 'ወደ ባንክ ማስተላለፍ',
      action: () => setActiveSubView('/transfer-to-bank'),
      icon: (
        <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7 text-[#72be20]" xmlns="http://www.w3.org/2000/svg">
          <path d="M 6 13 L 20 6 L 34 13 Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" fill="none" />
          <line x1="5" y1="15" x2="35" y2="15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="5" y1="31" x2="35" y2="31" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="4" y1="34" x2="36" y2="34" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="10" y1="17" x2="10" y2="29" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="16.5" y1="17" x2="16.5" y2="29" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="23.5" y1="17" x2="23.5" y2="29" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="30" y1="17" x2="30" y2="29" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )
    }
  ];

  // Page 2: 8 Secondary Tiles matching Screenshot 2 & 3
  const page2Services = [
    {
      id: 'awash',
      nameEn: 'Financial Service with Awash',
      nameAm: 'አዋሽ ባንክ',
      action: () => setActiveSubView('/transfer-to-bank'),
      icon: (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center text-white font-black text-[9px] shadow-xs">
          AWASH
        </div>
      )
    },
    {
      id: 'pay_merchant',
      nameEn: 'Pay for Merchant',
      nameAm: 'ለነጋዴ ክፍያ',
      action: () => setActiveSubView('/payment'),
      icon: (
        <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7 text-[#72be20]" xmlns="http://www.w3.org/2000/svg">
          <path d="M 6 15 L 9 8 L 31 8 L 34 15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M 6 15 C 6 18, 10 18, 10 15 C 10 18, 14 18, 14 15 C 14 18, 18 18, 18 15 C 18 18, 22 18, 22 15 C 22 18, 26 18, 26 15 C 26 18, 30 18, 30 15 C 30 18, 34 18, 34 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M 8 18 L 8 33 L 32 33 L 32 18" stroke="currentColor" strokeWidth="2.4" />
          <rect x="16" y="24" width="8" height="9" stroke="currentColor" strokeWidth="2.2" fill="none" />
        </svg>
      )
    },
    {
      id: 'telev',
      nameEn: 'teleEV Charging',
      nameAm: 'ኢቪ ቻርጅንግ',
      action: () => setActiveSubView('/payment'),
      icon: (
        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-[#72be20] font-black text-xs">
          ⚡ EV
        </div>
      )
    },
    {
      id: 'tolo',
      nameEn: 'TOLO Payment',
      nameAm: 'ቶሎ ክፍያ',
      action: () => setActiveSubView('/payment'),
      icon: (
        <div className="w-8 h-8 rounded-xl bg-[#0072ce] flex flex-col items-center justify-center text-white">
          <span className="text-[8px] font-black leading-none">TOLO</span>
          <span className="text-[6px] font-bold">PAY</span>
        </div>
      )
    },
    {
      id: 'aa_traffic',
      nameEn: 'AA Traffic Penalty Payment',
      nameAm: 'የትራፊክ ቅጣት',
      action: () => setActiveSubView('/payment'),
      icon: (
        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white text-[9px] font-black">
          TRAFFIC
        </div>
      )
    },
    {
      id: 'aatma',
      nameEn: 'AATMA Parking Payment',
      nameAm: 'ፓርኪንግ ክፍያ',
      action: () => setActiveSubView('/payment'),
      icon: (
        <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center text-white text-[9px] font-black">
          P AATMA
        </div>
      )
    },
    {
      id: 'tele_device',
      nameEn: 'tele Device Financing',
      nameAm: 'ስልክ በብድር',
      action: () => setActiveSubView('/apps'),
      icon: (
        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-[#72be20] font-bold text-base">
          📱
        </div>
      )
    },
    {
      id: 'more',
      nameEn: 'More',
      nameAm: 'ተጨማሪ',
      action: () => setActiveSubView('/apps'),
      icon: (
        <div className="w-8 h-8 rounded-full border-2 border-[#72be20] text-[#72be20] flex items-center justify-center font-bold text-lg">
          +
        </div>
      )
    }
  ];

  const currentServices = activePage === 0 ? page1Services : page2Services;

  return (
    <div className={`w-full px-3 pt-3 pb-2 select-none relative ${className}`}>
      {/* 8-Grid action tiles with authentic rounded containers */}
      <div className="grid grid-cols-4 gap-y-3.5 gap-x-2">
        {currentServices.map((service) => {
          const customImg = customButtonLogos[service.id];
          const label = language === 'am' ? service.nameAm : service.nameEn;

          return (
            <button
              key={service.id}
              id={`btn-telebirr-${service.id}`}
              type="button"
              onClick={service.action}
              className="flex flex-col items-center justify-start group cursor-pointer active:scale-95 transition-transform relative"
            >
              {/* Badge if exists (e.g. "Up to 35%" on Airtime) */}
              {(service as any).badge && (
                <span className="absolute -top-1.5 left-1 z-20 bg-[#FFA000] text-white text-[8.5px] font-extrabold px-1.5 py-0.2 rounded-md shadow-xs pointer-events-none whitespace-nowrap">
                  {(service as any).badge}
                </span>
              )}

              {/* Rounded White Icon Container */}
              <div className="w-[56px] h-[56px] rounded-2xl bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-center p-2 group-hover:scale-105 transition-all overflow-hidden relative">
                {customImg ? (
                  <img 
                    src={customImg} 
                    alt={label} 
                    className="w-full h-full object-contain" 
                  />
                ) : (
                  service.icon
                )}
              </div>

              {/* Label */}
              <span className="text-[11px] font-semibold text-gray-800 text-center tracking-tight mt-1.5 leading-tight line-clamp-2 px-0.5">
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid Page Dots Switcher (Screenshot 1 & 2) */}
      <div className="flex items-center justify-center gap-1.5 mt-3 pt-1">
        <button
          type="button"
          onClick={() => setActivePage(0)}
          className={`h-1.5 rounded-full transition-all cursor-pointer ${
            activePage === 0 ? 'w-4 bg-[#7BBF18]' : 'w-1.5 bg-gray-300'
          }`}
          aria-label="Grid Page 1"
        />
        <button
          type="button"
          onClick={() => setActivePage(1)}
          className={`h-1.5 rounded-full transition-all cursor-pointer ${
            activePage === 1 ? 'w-4 bg-[#7BBF18]' : 'w-1.5 bg-gray-300'
          }`}
          aria-label="Grid Page 2"
        />
      </div>

      {/* Send Money Popover Modal (Screenshot 4) */}
      {showSendMoneyModal && (
        <div 
          onClick={() => setShowSendMoneyModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 select-none animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 flex flex-col gap-1 overflow-hidden animate-fade-in"
          >
            {/* Option 1: To Individual */}
            <button
              type="button"
              onClick={() => {
                setShowSendMoneyModal(false);
                setActiveSubView('/send');
              }}
              className="w-full p-3.5 flex items-center gap-3.5 hover:bg-emerald-50/70 active:bg-emerald-100 rounded-xl transition cursor-pointer text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#7BBF18] flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current" fill="none" strokeWidth="2.2">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M12 7V3m-4 4l4-4 4 4" />
                </svg>
              </div>
              <span className="text-[14px] font-extrabold text-gray-900 group-hover:text-[#7BBF18]">
                {language === 'am' ? 'ለግለሰብ' : 'To Individual'}
              </span>
            </button>

            {/* Option 2: To Group */}
            <button
              type="button"
              onClick={() => {
                setShowSendMoneyModal(false);
                alert('Send Money to Group selected.');
              }}
              className="w-full p-3.5 flex items-center gap-3.5 hover:bg-emerald-50/70 active:bg-emerald-100 rounded-xl transition cursor-pointer text-left group border-t border-gray-100"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#7BBF18] flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current" fill="none" strokeWidth="2.2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <span className="text-[14px] font-extrabold text-gray-900 group-hover:text-[#7BBF18]">
                {language === 'am' ? 'ለቡድን' : 'To Group'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelebirrServiceGrid;

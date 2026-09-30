import React from 'react';
import { ArrowLeft, ShoppingBag, Smartphone, Car, Shield, Gamepad2, HeartHandshake, Film, Landmark } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';

export const AppsView: React.FC = () => {
  const { setActiveSubView, language, setIsTelePlayOpen } = useWallet();

  const miniApps = [
    {
      title: 'Zemen GEBEYA',
      subtitle: 'Online Shopping & Delivery',
      icon: ShoppingBag,
      color: '#10B981',
      bg: 'bg-emerald-50',
      action: () => alert('Opening Zemen Gebeya mini app...')
    },
    {
      title: 'Ethio Telecom Selfcare',
      subtitle: 'SIM registration, bundles, Roaming',
      icon: Smartphone,
      color: '#0284C7',
      bg: 'bg-sky-50',
      action: () => alert('Opening Ethio telecom SelfCare mini app...')
    },
    {
      title: 'Ride & Feres Transport',
      subtitle: 'Hail instant taxis in Addis Ababa',
      icon: Car,
      color: '#F59E0B',
      bg: 'bg-amber-50',
      action: () => alert('Ride mini app launched...')
    },
    {
      title: 'TelePlay Game Hub',
      subtitle: 'Win cash prizes & lucky draw rewards',
      icon: Gamepad2,
      color: '#8B5CF6',
      bg: 'bg-purple-50',
      action: () => setIsTelePlayOpen(true)
    },
    {
      title: 'Government e-Services',
      subtitle: 'Passports, Vital events, Licenses',
      icon: Shield,
      color: '#0D9488',
      bg: 'bg-teal-50',
      action: () => alert('Government portal mini app...')
    },
    {
      title: 'Charity & Fundraising',
      subtitle: 'GERD, Red Cross & community appeals',
      icon: HeartHandshake,
      color: '#EF4444',
      bg: 'bg-rose-50',
      action: () => alert('Fundraising appeals mini app...')
    }
  ];

  return (
    <div className="w-full flex-1 flex flex-col bg-[#F4F6F8] min-h-screen pb-24 select-none animate-fade-in">
      {/* Top Header */}
      <div className="w-full bg-white px-4 py-3 border-b border-gray-200 flex items-center gap-3 sticky top-0 z-30 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveSubView('home')}
          className="p-1.5 -ml-1 text-gray-700 hover:text-black hover:bg-gray-100 rounded-full transition cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2.4]" />
        </button>
        <h2 className="text-[19px] font-extrabold text-gray-900 tracking-tight">
          {language === 'am' ? 'ሚኒ አፖች' : 'SuperApp Mini Apps'}
        </h2>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Banner */}
        <div className="w-full rounded-2xl bg-gradient-to-r from-[#7BBF18] to-[#0072CE] p-4 text-white shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-base font-black">All in One SuperApp</h3>
            <p className="text-xs text-white/90 mt-0.5">Explore 50+ integrated lifestyle and fintech services</p>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-2 gap-3">
          {miniApps.map((app, idx) => {
            const Icon = app.icon;
            return (
              <div
                key={idx}
                onClick={app.action}
                className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex flex-col gap-2.5 hover:shadow-md transition cursor-pointer active:scale-98"
              >
                <div className={`w-11 h-11 rounded-2xl ${app.bg} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" style={{ color: app.color }} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-black text-gray-900 leading-tight">{app.title}</span>
                  <span className="text-[11px] text-gray-500 mt-1 leading-snug">{app.subtitle}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AppsView;

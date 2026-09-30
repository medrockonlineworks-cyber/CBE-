import React from 'react';
import { ArrowLeft, QrCode, Store, Zap, Droplets, Tv, GraduationCap, Plane, Car, Ticket, ShieldCheck, ChevronRight } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';

export const PaymentView: React.FC = () => {
  const { setActiveSubView, language } = useWallet();

  const paymentCategories = [
    {
      id: 'merchant',
      title: 'Pay for Merchant',
      desc: 'Scan merchant QR or enter till number',
      icon: Store,
      color: '#10B981',
      bg: 'bg-emerald-50',
      action: () => setActiveSubView('/qr-scanner')
    },
    {
      id: 'electricity',
      title: 'Ethiopian Electric Power',
      desc: 'Prepaid token & postpaid bill payment',
      icon: Zap,
      color: '#F59E0B',
      bg: 'bg-amber-50',
      action: () => alert('Electric utility payment selected.')
    },
    {
      id: 'water',
      title: 'Addis Ababa Water Supply (AAWSA)',
      desc: 'Monthly water meter bill settlement',
      icon: Droplets,
      color: '#0284C7',
      bg: 'bg-sky-50',
      action: () => alert('Water utility payment selected.')
    },
    {
      id: 'dstv',
      title: 'DStv & Canal+ Ethiopia',
      desc: 'Renew satellite TV entertainment subscription',
      icon: Tv,
      color: '#8B5CF6',
      bg: 'bg-purple-50',
      action: () => alert('TV subscription renewal selected.')
    },
    {
      id: 'traffic',
      title: 'Addis Ababa Traffic Management (AATMA)',
      desc: 'Instant e-traffic penalty and fine payment',
      icon: Car,
      color: '#EF4444',
      bg: 'bg-rose-50',
      action: () => alert('Traffic fine payment selected.')
    },
    {
      id: 'school',
      title: 'School & University Tuition Fees',
      desc: 'Direct payment to educational institutions',
      icon: GraduationCap,
      color: '#0D9488',
      bg: 'bg-teal-50',
      action: () => alert('Tuition fee payment selected.')
    },
    {
      id: 'airline',
      title: 'Ethiopian Airlines Tickets',
      desc: 'Book and pay for domestic & international flights',
      icon: Plane,
      color: '#DC2626',
      bg: 'bg-red-50',
      action: () => alert('Airlines ticket booking selected.')
    }
  ];

  return (
    <div className="w-full flex-1 flex flex-col bg-[#F4F6F8] min-h-screen pb-24 select-none animate-fade-in">
      {/* Top Header */}
      <div className="w-full bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveSubView('home')}
            className="p-1.5 -ml-1 text-gray-700 hover:text-black hover:bg-gray-100 rounded-full transition cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.4]" />
          </button>
          <h2 className="text-[19px] font-extrabold text-gray-900 tracking-tight">
            {language === 'am' ? 'የክፍያ አገልግሎቶች' : 'Payment Services'}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setActiveSubView('/qr-scanner')}
          className="p-2 rounded-xl bg-sky-50 text-[#0072CE] hover:bg-sky-100 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
        >
          <QrCode className="w-4 h-4" />
          <span>Scan Till</span>
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider px-1">
          Bills & Merchant Gateways
        </span>

        <div className="w-full bg-white rounded-3xl shadow-xs border border-gray-100 divide-y divide-gray-100 overflow-hidden">
          {paymentCategories.map(cat => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                onClick={cat.action}
                className="p-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-2xl ${cat.bg} border border-gray-100 flex items-center justify-center shrink-0`}>
                    <Icon className="w-6 h-6" style={{ color: cat.color }} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14.5px] font-extrabold text-gray-900 leading-tight">
                      {cat.title}
                    </span>
                    <span className="text-[12px] text-gray-500 font-medium mt-0.5">
                      {cat.desc}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PaymentView;

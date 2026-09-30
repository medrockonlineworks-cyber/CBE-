import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { WalletProvider, useWallet } from '../../context/WalletContext';
import { PhoneSettingsService } from '../../services/phoneSettingsService';
import WalletHeader from './WalletHeader';
import PromoBanner from './PromoBanner';
import TelebirrServiceGrid from './ServiceGrid';
import PromotionalCarousel from './PromotionalCarousel';
import TelebirrBottomNav from './TelebirrBottomNav';
import TelePlayModal from './TelePlayModal';
import SendMoneyView from './SendMoneyView';
import TransferToBankView from './TransferToBankView';
import TransactionsView from './TransactionsView';
import PaymentView from './PaymentView';
import AppsView from './AppsView';
import EngageView from './EngageView';
import AccountView from './AccountView';
import QrScannerView from './QrScannerView';
import { EthioTelecomLogo, TelebirrLogo } from '../TelebirrBrandAssets';

interface TelebirrSuperAppContentProps {
  onBack?: () => void;
  onOpenCbe?: () => void;
  onOpenDashen?: () => void;
}

const TelebirrSuperAppContent: React.FC<TelebirrSuperAppContentProps> = ({
  onBack,
  onOpenCbe,
  onOpenDashen
}) => {
  const { 
    activeSubView, 
    setActiveSubView, 
    isTelePlayOpen, 
    setIsTelePlayOpen, 
    customEthioLogo, 
    customTelebirrLogo 
  } = useWallet();

  const [showAppSwitcher, setShowAppSwitcher] = useState<boolean>(false);
  const [isIPhone, setIsIPhone] = useState<boolean>(() => PhoneSettingsService.isIPhoneMode());

  useEffect(() => {
    return PhoneSettingsService.subscribe(() => {
      setIsIPhone(PhoneSettingsService.isIPhoneMode());
    });
  }, []);

  const isHome = activeSubView === 'home';

  // Bottom Phone Navigation Bar Handlers
  const handlePhoneBack = () => {
    if (activeSubView !== 'home') {
      // Go back to previous screen (Telebirr Home)
      setActiveSubView('home');
    } else {
      // At Telebirr home: Back button returns to the CBE main application!
      if (onOpenCbe) {
        onOpenCbe();
      } else if (onBack) {
        onBack();
      }
    }
  };

  const handlePhoneHome = () => {
    setActiveSubView('home');
  };

  const handlePhoneRecents = () => {
    setShowAppSwitcher(true);
  };

  return (
    <div 
      id="telebirr-superapp-viewport"
      className="w-full h-full max-w-md mx-auto relative bg-[#F4F6F8] font-sans antialiased select-none flex flex-col justify-between overflow-hidden"
    >
      {/* 1. TOP BRAND HEADER (Clean Ethio Telecom Left, Telebirr Right matching Screenshot 1-4) */}
      {isHome && (
        <div className="w-full bg-white px-3.5 py-1.5 flex items-center justify-between border-b border-gray-100 z-20 shrink-0 shadow-2xs">
          {/* Ethio Telecom Logo & Back to CBE */}
          <div className="flex items-center gap-1.5 h-6">
            {isIPhone && (
              <button
                type="button"
                onClick={handlePhoneBack}
                className="text-[#0072ce] hover:opacity-80 active:opacity-60 text-[14px] font-medium flex items-center gap-0.5 cursor-pointer -ml-1 mr-1"
                title="Back to CBE"
              >
                <ChevronLeft className="w-4.5 h-4.5 -ml-1 stroke-[2.5]" />
                <span>CBE</span>
              </button>
            )}
            <div className="flex items-center h-6 max-w-[140px] overflow-hidden">
              {customEthioLogo ? (
                <img src={customEthioLogo} alt="Ethio telecom" className="h-6 object-contain" />
              ) : (
                <EthioTelecomLogo className="h-5.5" />
              )}
            </div>
          </div>

          {/* Telebirr Logo */}
          <div className="flex items-center h-7 max-w-[120px] overflow-hidden">
            {customTelebirrLogo ? (
              <img src={customTelebirrLogo} alt="Telebirr" className="h-6 object-contain" />
            ) : (
              <TelebirrLogo className="h-6" />
            )}
          </div>
        </div>
      )}

      {/* 2. SCROLLABLE APP BODY */}
      <main className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col relative scrollbar-none">
        {/* SUB-VIEW: HOME */}
        {activeSubView === 'home' && (
          <div className="flex-1 flex flex-col pb-8">
            {/* Header & Balance Card (Exact fixed height 196px) */}
            <WalletHeader 
              onOpenSearch={() => setActiveSubView('/transactions')}
              onOpenNotifications={() => alert('You have 2 new security alerts.')}
              onOpenProfile={() => setActiveSubView('/account')}
              onOpenLanguage={() => setActiveSubView('/account')}
            />

            {/* Orange Announcement Ribbon flush below balance card */}
            <PromoBanner text="ONE APP FOR ALL YOUR NEEDS! • ONE APP FOR ALL YOUR NEEDS!" />

            {/* 8-Grid Service Action Tiles with Authentic Buttons (FIRST, matching Screenshot 1) */}
            <div className="w-full bg-white shadow-2xs rounded-b-2xl mx-auto">
              <TelebirrServiceGrid 
                onSelectService={(key) => {
                  if (key === 'airtime') alert('Ethio Telecom Airtime & Packages selected.');
                  else if (key === 'cash_out') alert('Agent Cash Out selected.');
                  else if (key === 'receive_money') setActiveSubView('/qr-scanner');
                  else if (key === 'pay_merchant') setActiveSubView('/payment');
                  else if (key === 'utility_bills') setActiveSubView('/payment');
                  else if (key === 'fundraising') alert('Fundraising donation portal.');
                }}
              />
            </div>

            {/* Promotional Carousel with "Transaction Details >" Link (SECOND, matching Screenshot 1 & 2) */}
            <div className="mt-2 px-1">
              <PromotionalCarousel onOpenTelePlay={() => setIsTelePlayOpen(true)} />
              
              {/* Transaction Details Quick Link (Screenshot 2 & 3) */}
              <div className="flex justify-end px-4 mt-0.5 mb-2">
                <button
                  type="button"
                  onClick={() => setActiveSubView('/transactions')}
                  className="flex items-center gap-0.5 text-[#0072ce] hover:underline font-extrabold text-[12px] tracking-tight cursor-pointer"
                >
                  <span>Transaction Details</span>
                  <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUB-VIEW: /send */}
        {activeSubView === '/send' && <SendMoneyView />}

        {/* SUB-VIEW: /transfer-to-bank */}
        {activeSubView === '/transfer-to-bank' && <TransferToBankView />}

        {/* SUB-VIEW: /payment */}
        {activeSubView === '/payment' && <PaymentView />}

        {/* SUB-VIEW: /apps */}
        {activeSubView === '/apps' && <AppsView />}

        {/* SUB-VIEW: /engage */}
        {activeSubView === '/engage' && <EngageView />}

        {/* SUB-VIEW: /account */}
        {activeSubView === '/account' && <AccountView onBack={onBack} onOpenCbe={onOpenCbe} />}

        {/* SUB-VIEW: /transactions */}
        {activeSubView === '/transactions' && <TransactionsView />}

        {/* SUB-VIEW: /qr-scanner */}
        {activeSubView === '/qr-scanner' && <QrScannerView />}
      </main>

      {/* 3. FIXED BOTTOM CONTROLS CONTAINER: Telebirr Bottom Nav */}
      <div className="w-full shrink-0 flex flex-col z-40 bg-[#7BBF18] pb-[max(env(safe-area-inset-bottom,0px),8px)]">
        {/* Telebirr 5 Tabs Navigation with floating Scan QR button */}
        {activeSubView !== '/qr-scanner' && (
          <TelebirrBottomNav 
            onScanQr={() => setActiveSubView('/qr-scanner')} 
          />
        )}
      </div>

      {/* 4. ANDROID RECENT APPS SWITCHER MODAL */}
      {showAppSwitcher && (
        <div 
          onClick={() => setShowAppSwitcher(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs bg-slate-900 rounded-3xl p-5 text-white shadow-2xl border border-slate-800 flex flex-col gap-4 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Recent Apps</span>
              <button 
                type="button" 
                onClick={() => setShowAppSwitcher(false)}
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            {/* CBE Mobile Banking Card */}
            <div 
              onClick={() => {
                setShowAppSwitcher(false);
                if (onOpenCbe) onOpenCbe();
                else if (onBack) onBack();
              }}
              className="p-3.5 rounded-2xl bg-[#70189F] hover:bg-[#58106c] cursor-pointer active:scale-98 transition flex items-center gap-3 border border-purple-400/30"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-slate-950 font-black text-sm">
                CBE
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-white">CBE Mobile Banking</span>
                <span className="text-[11px] text-purple-200">Switch to Commercial Bank of Ethiopia</span>
              </div>
            </div>

            {/* Telebirr SuperApp Card */}
            <div 
              onClick={() => {
                setShowAppSwitcher(false);
                setActiveSubView('home');
              }}
              className="p-3.5 rounded-2xl bg-[#7BBF18] cursor-pointer active:scale-98 transition flex items-center gap-3 border border-lime-300/40"
            >
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#7BBF18] font-black text-sm">
                tele
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-white">Telebirr SuperApp</span>
                <span className="text-[11px] text-lime-100">Currently active app</span>
              </div>
            </div>

            {/* Dashen Bank Card */}
            <div 
              onClick={() => {
                setShowAppSwitcher(false);
                if (onOpenDashen) onOpenDashen();
              }}
              className="p-3.5 rounded-2xl bg-[#003882] hover:bg-[#002b66] cursor-pointer active:scale-98 transition flex items-center gap-3 border border-blue-400/30"
            >
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#003882] font-black text-sm">
                DB
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-white">Dashen Bank</span>
                <span className="text-[11px] text-blue-200">Amole & Mobile Banking</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. INTERACTIVE TELEPLAY LUCKY WHEEL MODAL */}
      <TelePlayModal 
        isOpen={isTelePlayOpen} 
        onClose={() => setIsTelePlayOpen(false)} 
      />
    </div>
  );
};

export const TelebirrSuperApp: React.FC<TelebirrSuperAppContentProps> = (props) => {
  return (
    <WalletProvider>
      <TelebirrSuperAppContent {...props} />
    </WalletProvider>
  );
};

export default TelebirrSuperApp;

import React, { useState } from 'react';
import { ArrowLeft, Flashlight, Image as ImageIcon, QrCode, CheckCircle2 } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';

export const QrScannerView: React.FC = () => {
  const { setActiveSubView, language } = useWallet();
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);

  const sampleQrs = [
    { label: 'Pay Merchant (Zemen Gebeya)', till: '998412', type: 'merchant' },
    { label: 'Send to Leykun (0926193920)', phone: '0926193920', type: 'send' },
    { label: 'Transfer to CBE (1000419524747)', acc: '1000419524747', type: 'bank' }
  ];

  const handleSimulateScan = (qr: typeof sampleQrs[0]) => {
    setScannedResult(qr.label);
    setTimeout(() => {
      if (qr.type === 'send') {
        setActiveSubView('/send');
      } else if (qr.type === 'bank') {
        setActiveSubView('/transfer-to-bank');
      } else {
        setActiveSubView('/payment');
      }
    }, 1200);
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-black min-h-screen text-white select-none animate-fade-in relative z-50">
      {/* Top Header */}
      <div className="w-full px-4 py-3 bg-black/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
        <button
          type="button"
          onClick={() => setActiveSubView('home')}
          className="p-1.5 text-white/90 hover:text-white rounded-full bg-white/10 transition cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2.4]" />
        </button>
        <span className="text-base font-extrabold text-white">
          {language === 'am' ? 'ኪውአር ስካን' : 'Scan QR Code'}
        </span>
        <button
          type="button"
          onClick={() => setTorchOn(prev => !prev)}
          className={`p-2 rounded-full transition cursor-pointer ${torchOn ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}`}
          title="Toggle Torch"
        >
          <Flashlight className="w-5 h-5" />
        </button>
      </div>

      {/* Camera Viewport with Viewfinder Reticle */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Subtle camera noise / mesh background */}
        <div className="absolute inset-0 bg-radial from-slate-900 via-black to-black opacity-90" />

        {/* Viewfinder box (260x260) */}
        <div className="relative w-64 h-64 border-2 border-white/30 rounded-3xl overflow-hidden flex items-center justify-center shadow-[0_0_50px_rgba(0,114,206,0.3)]">
          {/* Laser scanning line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#0072CE] to-transparent shadow-[0_0_15px_#0072CE] animate-bounce duration-1000" />

          {/* Corner brackets */}
          <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-[#0072CE] rounded-tl-lg" />
          <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-[#0072CE] rounded-tr-lg" />
          <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-[#0072CE] rounded-bl-lg" />
          <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-[#0072CE] rounded-br-lg" />

          {/* Center hint */}
          <span className="text-[11px] font-bold text-white/60 tracking-wider uppercase text-center px-4">
            Align Telebirr QR code within frame
          </span>
        </div>

        {scannedResult && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in z-20">
            <CheckCircle2 className="w-4 h-4" />
            <span>Scanned: {scannedResult}</span>
          </div>
        )}

        <div className="mt-6 flex flex-col items-center gap-2 z-10 w-full max-w-xs">
          <span className="text-xs text-white/50 font-bold uppercase tracking-wider">
            Quick Test QR Codes (Demo)
          </span>
          <div className="flex flex-col gap-2 w-full">
            {sampleQrs.map((qr, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSimulateScan(qr)}
                className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-98 transition text-xs font-bold text-white flex items-center justify-between cursor-pointer border border-white/10"
              >
                <span>{qr.label}</span>
                <QrCode className="w-4 h-4 text-[#0072CE]" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QrScannerView;

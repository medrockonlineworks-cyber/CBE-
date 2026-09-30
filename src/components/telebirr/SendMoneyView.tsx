import React, { useState } from 'react';
import { ArrowLeft, Scan, BookUser, Trash2, CheckCircle2, ChevronRight, Trophy } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';

export const SendMoneyView: React.FC = () => {
  const { 
    balance, 
    setActiveSubView, 
    language, 
    addTransaction, 
    setSelectedTransaction,
    setIsTelePlayOpen
  } = useWallet();

  const [phoneInput, setPhoneInput] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('Tirhas');
  const [amountStr, setAmountStr] = useState<string>('100');
  const [step, setStep] = useState<'input_number' | 'enter_amount' | 'success'>('input_number');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Matching Screenshot 5 recents
  const [recents, setRecents] = useState([
    { name: 'Tirhas', phone: '0911234567' },
    { name: 'Haftu', phone: '0922334455' },
    { name: 'Almaz', phone: '0933445566' },
    { name: 'Haftu', phone: '0944556677' }
  ]);

  const handleSelectRecent = (r: { name: string; phone: string }) => {
    const clean = r.phone.replace('+251', '').replace(/^251/, '').replace(/^0/, '');
    setPhoneInput(clean);
    setRecipientName(r.name);
    setErrorMsg('');
  };

  const handleClearRecents = () => {
    setRecents([]);
  };

  const handleNextFromNumber = () => {
    const clean = phoneInput.trim().replace(/\D/g, '');
    if (!clean || clean.length < 8) {
      setErrorMsg(language === 'am' ? 'እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ' : 'Please enter a valid mobile number');
      return;
    }
    setErrorMsg('');
    setStep('enter_amount');
  };

  const handleConfirmSend = () => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg(language === 'am' ? 'እባክዎ ትክክለኛ የብር መጠን ያስገቡ' : 'Please enter a valid transfer amount');
      return;
    }
    if (amount > balance) {
      setErrorMsg(language === 'am' ? 'በቂ ያልሆነ ሂሳብ' : 'Insufficient wallet balance');
      return;
    }

    const tx = addTransaction({
      txType: 'Send Money',
      recipientName: recipientName || `Recipient (${phoneInput})`,
      bankName: 'Telebirr P2P',
      bankKey: 'telebirr',
      accountNumber: `+251 ${phoneInput}`,
      amount,
      serviceFee: 0.00,
      totalDeducted: amount,
      notes: 'Telebirr P2P Transfer',
      status: 'successful'
    });

    setSelectedTransaction(tx);
    setStep('success');
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-[#F4F6F8] min-h-screen pb-24 select-none animate-fade-in">
      {/* Top Header Bar matching Screenshot 5 */}
      <div className="w-full bg-white px-4 py-3 border-b border-gray-200 flex items-center gap-3 sticky top-0 z-30 shadow-xs">
        <button
          type="button"
          onClick={() => {
            if (step === 'enter_amount') setStep('input_number');
            else setActiveSubView('home');
          }}
          className="p-1.5 -ml-1 text-gray-700 hover:text-black hover:bg-gray-100 rounded-full transition cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2.4]" />
        </button>
        <h2 className="text-[18px] font-extrabold text-gray-900 tracking-tight">
          {language === 'am' ? 'ለግለሰብ ገንዘብ መላክ' : 'Send Money to Individual'}
        </h2>
      </div>

      {step === 'input_number' && (
        <div className="flex-1 flex flex-col p-4 gap-4">
          {/* TelePlay Banner with Car, Cash & Prizes matching Screenshot 5 */}
          <div 
            onClick={() => setIsTelePlayOpen(true)}
            className="w-full rounded-2xl bg-gradient-to-r from-lime-300 via-emerald-400 to-[#7BBF18] text-slate-900 p-3 shadow-md relative overflow-hidden flex flex-col justify-between cursor-pointer border border-lime-400/40"
          >
            <div className="flex items-center justify-between z-10">
              <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">Above 60 Million ETB</span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-950" />
                <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
              </div>
            </div>

            <div className="flex items-center justify-between mt-1 z-10">
              <div className="flex flex-col">
                <span className="text-[20px] font-black tracking-tighter text-emerald-950 leading-none">
                  TelePlay
                </span>
                <span className="text-[12px] font-extrabold text-emerald-900 bg-amber-300 px-2 py-0.5 rounded-md mt-1 w-max shadow-xs">
                  Prizes!
                </span>
              </div>
              <div className="text-3xl filter drop-shadow-md">🚗 💵</div>
            </div>
          </div>

          {/* Input Card matching Screenshot 5 */}
          <div className="w-full bg-white rounded-3xl p-5 shadow-xs border border-gray-100 flex flex-col gap-3">
            <label className="text-[15px] font-extrabold text-gray-900 tracking-tight">
              {language === 'am' ? 'እባክዎ የስልክ ቁጥር ያስገቡ' : 'Please Enter Mobile Number'}
            </label>

            {/* Input field with lime-green border and +251 prefix */}
            <div className="w-full flex items-center h-[52px] rounded-2xl border-2 border-[#7BBF18] px-3.5 bg-white shadow-xs focus-within:ring-2 focus-within:ring-[#7BBF18]/30 transition">
              <span className="text-[16px] font-bold text-gray-900 mr-2 shrink-0">+251</span>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder=""
                className="w-full h-full bg-transparent outline-none font-bold text-[16px] text-gray-900 placeholder:text-gray-300"
                autoFocus
              />
              <div className="flex items-center gap-2 text-gray-400 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveSubView('/qr-scanner')}
                  className="p-1 hover:text-[#7BBF18] transition cursor-pointer"
                  title="Scan QR Code"
                >
                  <Scan className="w-5 h-5 text-gray-500" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => setPhoneInput('911234567')}
                  className="p-1 hover:text-[#7BBF18] transition cursor-pointer"
                  title="Pick from Contacts"
                >
                  <BookUser className="w-5 h-5 text-gray-500" strokeWidth={2} />
                </button>
              </div>
            </div>

            {errorMsg && (
              <span className="text-xs font-semibold text-rose-600">{errorMsg}</span>
            )}

            {/* Next Button */}
            <button
              type="button"
              disabled={phoneInput.length < 8}
              onClick={handleNextFromNumber}
              className={`w-full h-[46px] rounded-2xl font-black text-[15px] tracking-wide mt-2 transition cursor-pointer flex items-center justify-center ${
                phoneInput.length >= 8
                  ? 'bg-[#0072CE] hover:bg-[#0060b0] text-white shadow-md active:scale-98'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {language === 'am' ? 'ቀጥል' : 'Next'}
            </button>
          </div>

          {/* Recent Section matching Screenshot 5 */}
          {recents.length > 0 && (
            <div className="w-full flex flex-col gap-2 mt-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[14px] font-extrabold text-gray-700">
                  {language === 'am' ? 'የቅርብ ጊዜ' : 'Recent'}
                </span>
                <button
                  type="button"
                  onClick={handleClearRecents}
                  className="text-gray-400 hover:text-rose-500 transition cursor-pointer p-1"
                  title="Clear Recents"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="w-full bg-white rounded-2xl shadow-xs border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                {recents.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectRecent(item)}
                    className="p-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center text-white shrink-0 shadow-2xs">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                        </svg>
                      </div>
                      <span className="text-[14.5px] font-bold text-gray-900 leading-tight">
                        {item.name}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'enter_amount' && (
        <div className="flex-1 flex flex-col p-4 gap-4">
          <div className="w-full bg-white rounded-3xl p-5 shadow-xs border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center gap-3 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100">
              <div className="w-10 h-10 rounded-full bg-[#7BBF18] flex items-center justify-center text-white font-black text-sm">
                {recipientName.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-gray-900">{recipientName}</span>
                <span className="text-xs text-gray-500">+251 {phoneInput}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-600">
                {language === 'am' ? 'የብር መጠን (ETB)' : 'Transfer Amount (ETB)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full h-12 rounded-xl border border-gray-300 px-3 font-extrabold text-xl text-gray-900 focus:border-[#7BBF18] outline-none"
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-3 text-sm font-bold text-gray-400">ETB</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmSend}
              className="w-full h-12 rounded-2xl bg-[#0072CE] hover:bg-[#0060b0] text-white font-black text-sm tracking-wide shadow-md active:scale-98 transition cursor-pointer mt-2"
            >
              {language === 'am' ? 'ገንዘብ ላክ' : 'Confirm & Send Money'}
            </button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-[#7BBF18] mb-3">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>
          <h3 className="text-xl font-extrabold text-gray-900">
            {language === 'am' ? 'ዝውውሩ በተሳካ ሁኔታ ተጠናቋል!' : 'Transfer Successful!'}
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xs">
            {amountStr} ETB transferred to {recipientName} (+251 {phoneInput})
          </p>

          <div className="w-full flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => setActiveSubView('/transactions')}
              className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-800 font-bold text-xs hover:bg-gray-200 transition cursor-pointer"
            >
              View Receipt
            </button>
            <button
              type="button"
              onClick={() => setActiveSubView('home')}
              className="flex-1 py-3 rounded-2xl bg-[#7BBF18] text-white font-black text-xs hover:bg-[#72be20] shadow-sm transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SendMoneyView;

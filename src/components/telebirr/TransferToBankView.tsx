import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Trash2, CheckCircle2, Building2 } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { TELEBIRR_SUPPORTED_BANKS } from '../../services/telebirrService';

export const TransferToBankView: React.FC = () => {
  const { 
    balance, 
    setActiveSubView, 
    language, 
    addTransaction, 
    setSelectedTransaction,
    setIsTelePlayOpen
  } = useWallet();

  const [selectedBank, setSelectedBank] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('Mr Leykun Jemaneh Yilma');
  const [amountStr, setAmountStr] = useState<string>('100');
  const [step, setStep] = useState<'input_account' | 'enter_amount' | 'success'>('input_account');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isBankPickerOpen, setIsBankPickerOpen] = useState<boolean>(false);

  const [recents, setRecents] = useState([
    {
      name: 'Mr Leykun Jemaneh Yilma',
      bank: 'Commercial Bank of Ethiopia',
      accountNumber: '1000419524747',
    },
    {
      name: 'LEYKUN JEMANEH YILAM',
      bank: 'Bank of Abyssinia',
      accountNumber: '56848096',
    },
    {
      name: 'MAHLET JEMANEH YILMA',
      bank: 'Dashen Bank',
      accountNumber: '5265422310011',
    }
  ]);

  const handleSelectRecent = (r: { name: string; bank: string; accountNumber: string }) => {
    setSelectedBank(r.bank);
    setAccountNumber(r.accountNumber);
    setRecipientName(r.name);
    setErrorMsg('');
  };

  const handleClearRecents = () => {
    setRecents([]);
  };

  const handleNextFromAccount = () => {
    if (!selectedBank) {
      setErrorMsg(language === 'am' ? 'እባክዎ ባንክ ይምረጡ' : 'Please choose a bank');
      return;
    }
    const clean = accountNumber.trim().replace(/\D/g, '');
    if (!clean || clean.length < 6) {
      setErrorMsg(language === 'am' ? 'እባክዎ ትክክለኛ የባንክ ሂሳብ ቁጥር ያስገቡ' : 'Please enter a valid account number');
      return;
    }
    setErrorMsg('');
    setStep('enter_amount');
  };

  const handleConfirmTransfer = () => {
    const amount = parseFloat(amountStr);
    const serviceFee = 1.00;
    const totalDeducted = amount + serviceFee;

    if (isNaN(amount) || amount <= 0) {
      setErrorMsg(language === 'am' ? 'እባክዎ ትክክለኛ የብር መጠን ያስገቡ' : 'Please enter a valid transfer amount');
      return;
    }
    if (totalDeducted > balance) {
      setErrorMsg(language === 'am' ? 'በቂ ያልሆነ ሂሳብ' : 'Insufficient wallet balance');
      return;
    }

    const tx = addTransaction({
      txType: 'Transfer To Bank',
      recipientName: recipientName || 'Bank Beneficiary',
      bankName: selectedBank || 'Commercial Bank of Ethiopia',
      bankKey: 'cbe',
      accountNumber,
      amount,
      serviceFee,
      totalDeducted,
      notes: 'Telebirr Bank Transfer',
      status: 'successful'
    });

    setSelectedTransaction(tx);
    setStep('success');
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-[#F4F6F8] min-h-screen pb-24 select-none animate-fade-in">
      {/* Top Header Bar matching Screenshot 6 */}
      <div className="w-full bg-white px-4 py-3 border-b border-gray-200 flex items-center gap-3 sticky top-0 z-30 shadow-xs">
        <button
          type="button"
          onClick={() => {
            if (step === 'enter_amount') setStep('input_account');
            else setActiveSubView('home');
          }}
          className="p-1.5 -ml-1 text-gray-700 hover:text-black hover:bg-gray-100 rounded-full transition cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2.4]" />
        </button>
        <h2 className="text-[18px] font-extrabold text-gray-900 tracking-tight">
          {language === 'am' ? 'ወደ ባንክ ማስተላለፍ' : 'Transfer to Bank'}
        </h2>
      </div>

      {step === 'input_account' && (
        <div className="flex-1 flex flex-col p-4 gap-4">
          {/* TelePlay Banner matching Screenshot 6 */}
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

          {/* Form Card matching Screenshot 6 */}
          <div className="w-full bg-white rounded-3xl p-5 shadow-xs border border-gray-100 flex flex-col gap-4">
            {/* Select Bank */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-extrabold text-gray-800 tracking-tight">
                {language === 'am' ? 'ባንክ ይምረጡ' : 'Select Bank'}
              </label>
              <div 
                onClick={() => setIsBankPickerOpen(true)}
                className="w-full h-[52px] rounded-2xl border border-gray-200 px-4 bg-white flex items-center justify-between cursor-pointer hover:border-gray-300 transition"
              >
                <span className={`text-[15px] font-bold truncate ${selectedBank ? 'text-gray-900' : 'text-gray-400'}`}>
                  {selectedBank || (language === 'am' ? 'እባክዎ ይምረጡ' : 'Please Choose')}
                </span>
                <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
              </div>
            </div>

            {/* Account No */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-extrabold text-gray-800 tracking-tight">
                {language === 'am' ? 'የሂሳብ ቁጥር' : 'Account No'}
              </label>
              <div className="w-full h-[52px] rounded-2xl border border-gray-200 px-4 bg-white flex items-center shadow-xs focus-within:border-[#7BBF18] focus-within:ring-2 focus-within:ring-[#7BBF18]/20 transition">
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder={language === 'am' ? 'የሂሳብ ቁጥር ያስገቡ' : 'Enter Account Number'}
                  className="w-full h-full bg-transparent outline-none font-bold text-[15.5px] text-gray-900 placeholder:text-gray-300 font-mono"
                />
              </div>
            </div>

            {errorMsg && (
              <span className="text-xs font-semibold text-rose-600">{errorMsg}</span>
            )}

            {/* Next Button */}
            <button
              type="button"
              disabled={!selectedBank || accountNumber.length < 6}
              onClick={handleNextFromAccount}
              className={`w-full h-[46px] rounded-2xl font-black text-[15px] tracking-wide mt-2 transition cursor-pointer flex items-center justify-center ${
                selectedBank && accountNumber.length >= 6
                  ? 'bg-[#0072CE] hover:bg-[#0060b0] text-white shadow-md active:scale-98'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {language === 'am' ? 'ቀጥል' : 'Next'}
            </button>
          </div>

          {/* Recent matching Screenshot 6 */}
          <div className="w-full flex flex-col gap-2 mt-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[14px] font-extrabold text-gray-700">
                {language === 'am' ? 'የቅርብ ጊዜ' : 'Recent'}
              </span>
              {recents.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearRecents}
                  className="text-gray-400 hover:text-rose-500 transition cursor-pointer p-1"
                  title="Clear Recents"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {recents.length > 0 && (
              <div className="w-full bg-white rounded-2xl shadow-xs border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                {recents.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectRecent(item)}
                    className="p-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current" fill="none" strokeWidth="2">
                          <rect x="2" y="5" width="20" height="14" rx="2" />
                          <line x1="2" y1="10" x2="22" y2="10" />
                        </svg>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[14.5px] font-bold text-gray-900 leading-tight">
                          {item.name}
                        </span>
                        <span className="text-[12px] text-gray-500 font-sans mt-0.5">
                          {item.bank} ({item.accountNumber})
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'enter_amount' && (
        <div className="flex-1 flex flex-col p-4 gap-4">
          <div className="w-full bg-white rounded-3xl p-5 shadow-xs border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center gap-3 p-3.5 bg-sky-50/70 rounded-2xl border border-sky-100">
              <div className="w-10 h-10 rounded-2xl bg-[#0072CE] flex items-center justify-center text-white shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-gray-900">{recipientName}</span>
                <span className="text-xs text-gray-600">{selectedBank}</span>
                <span className="text-xs text-gray-400 font-mono">{accountNumber}</span>
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

            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span>Service Fee:</span>
              <span className="font-bold text-gray-800">1.00 ETB</span>
            </div>

            {errorMsg && (
              <span className="text-xs font-semibold text-rose-600">{errorMsg}</span>
            )}

            <button
              type="button"
              onClick={handleConfirmTransfer}
              className="w-full h-12 rounded-2xl bg-[#0072CE] hover:bg-[#0060b0] text-white font-black text-sm tracking-wide shadow-md active:scale-98 transition cursor-pointer mt-2"
            >
              {language === 'am' ? 'አስተላልፍ' : 'Confirm Bank Transfer'}
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
            {language === 'am' ? 'የባንክ ዝውውሩ ተሳክቷል!' : 'Bank Transfer Completed!'}
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xs">
            {amountStr} ETB transferred to {recipientName} at {selectedBank} ({accountNumber})
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

      {/* Bank Picker Modal */}
      {isBankPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col overflow-hidden animate-fade-in shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-gray-900">
                {language === 'am' ? 'ባንክ ይምረጡ' : 'Select Destination Bank'}
              </h3>
              <button
                type="button"
                onClick={() => setIsBankPickerOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm px-2 py-1"
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto divide-y divide-gray-100 p-2">
              {TELEBIRR_SUPPORTED_BANKS.map((bank) => (
                <div
                  key={bank.key}
                  onClick={() => {
                    setSelectedBank(bank.name);
                    setIsBankPickerOpen(false);
                  }}
                  className={`p-3.5 flex items-center justify-between rounded-xl hover:bg-gray-50 active:bg-gray-100 transition cursor-pointer ${
                    selectedBank === bank.name ? 'bg-emerald-50/70 font-black text-[#7BBF18]' : 'text-gray-800 font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-black text-gray-600">
                      {bank.shortName}
                    </span>
                    <span className="text-sm">{bank.name}</span>
                  </div>
                  {selectedBank === bank.name && (
                    <CheckCircle2 className="w-5 h-5 text-[#7BBF18]" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferToBankView;

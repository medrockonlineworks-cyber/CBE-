import React, { useState } from 'react';
import { UserProfile, Transaction } from '../types';
import { LocalDb } from '../lib/mockData';
import { calculateCbeFee } from '../lib/cbeTariff';
import { 
  Zap, 
  Droplet, 
  Wifi, 
  Tv, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck 
} from 'lucide-react';

interface PaymentsProps {
  currentUser: UserProfile;
  onPaymentComplete: (tx: Transaction) => void;
}

type BillCategory = 'electricity' | 'water' | 'internet' | 'tv';

const UTILITIES_INFO = {
  electricity: {
    title: 'EEP (Ethiopian Electric Power)',
    desc: 'Prepaid & Postpaid power tokens',
    icon: Zap,
    companies: ['EEP Prepaid Token', 'EEP Postpaid Utility'],
    placeholderId: 'EEP-894-1029',
    amount: '450.00'
  },
  water: {
    title: 'AAWSA (Water Utility)',
    desc: 'Municipal water & sewerage bills',
    icon: Droplet,
    companies: ['AAWSA Addis Ababa', 'Municipal Water Outlying'],
    placeholderId: 'WAT-013-9481',
    amount: '180.00'
  },
  internet: {
    title: 'Broadband Internet',
    desc: 'Fiber, LTE & Fixed DSL subscriptions',
    icon: Wifi,
    companies: ['Ethio Telecom Fiber', 'Safaricom Fixed Home', 'WebSprix Highspeed'],
    placeholderId: 'FIB-902-8812',
    amount: '850.00'
  },
  tv: {
    title: 'TV Subscriptions',
    desc: 'Premium home satellite entertainment',
    icon: Tv,
    companies: ['DSTV Ethiopia', 'Canal+ Ethiopia', 'StarTimes TV'],
    placeholderId: 'SUB-304-9218',
    amount: '1150.00'
  }
};

export default function Payments({ currentUser, onPaymentComplete }: PaymentsProps) {
  const [activeCategory, setActiveCategory] = useState<BillCategory>('electricity');
  const [selectedCompany, setSelectedCompany] = useState(UTILITIES_INFO.electricity.companies[0]);
  const [customerId, setCustomerId] = useState('');
  const [billAmount, setBillAmount] = useState(UTILITIES_INFO.electricity.amount);
  
  // States for verification & PIN
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');

  const handleCategoryChange = (cat: BillCategory) => {
    setActiveCategory(cat);
    setSelectedCompany(UTILITIES_INFO[cat].companies[0]);
    setBillAmount(UTILITIES_INFO[cat].amount);
    setCustomerId('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleVerifyBillPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const amountNum = parseFloat(billAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }

    if (customerId.length < 5) {
      setErrorMsg('Please enter a valid Customer ID or Account Reference Number.');
      return;
    }

    const serviceCharge = 2.00;
    const vat = +(serviceCharge * 0.15).toFixed(2);
    const disasterRecovery = +(serviceCharge * 0.05).toFixed(2);
    const totalAdditionalFees = +(serviceCharge + vat + disasterRecovery).toFixed(2);
    const totalCost = +(amountNum + totalAdditionalFees).toFixed(2);

    if (totalCost > currentUser.balance) {
      setErrorMsg(`Insufficient balance. Cost with CBE Service Charge (ETB ${serviceCharge.toFixed(2)}), 15% VAT (ETB ${vat.toFixed(2)}) & 5% Disaster Recovery (ETB ${disasterRecovery.toFixed(2)}) is ETB ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`);
      return;
    }

    // Authorize with security PIN
    setEnteredPin('');
    setShowPinModal(true);
  };

  const handleAuthorizeAndPay = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (enteredPin.length !== 4) {
      setErrorMsg('PIN must be exactly 4 digits.');
      return;
    }

    setShowPinModal(false);

    try {
      const amountNum = parseFloat(billAmount);
      const serviceCharge = 2.00;

      const tx = LocalDb.createTransaction(
        'bill',
        currentUser.id,
        amountNum,
        serviceCharge,
        selectedCompany,
        customerId,
        selectedCompany,
        `Payment for ${selectedCompany} - Customer A/C ${customerId}`,
        false
      );

      onPaymentComplete(tx);
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment processing failed.');
    }
  };

  return (
    <div id="payments-screen" className="w-full h-full overflow-y-auto overscroll-contain bg-gray-50 pb-28 font-sans">
      <div className="max-w-md mx-auto min-h-full">
        {/* Banner */}
        <div className="bg-[#70189F] text-white px-5 pt-7 pb-8 rounded-b-[2rem] shadow-md">
        <h2 className="text-xl font-extrabold">Bill Payments &amp; Utilities</h2>
        <p className="text-purple-200 text-xs mt-0.5">Pay electric, water, internet and TV bills directly via CBE.</p>
      </div>

      <div className="p-5 space-y-6">
        
        {/* Category Grid Cards */}
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(UTILITIES_INFO) as BillCategory[]).map((key) => {
            const info = UTILITIES_INFO[key];
            const Icon = info.icon;
            const isActive = activeCategory === key;

            return (
              <button
                id={`btn-utility-cat-${key}`}
                key={key}
                onClick={() => handleCategoryChange(key)}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition h-28 cursor-pointer ${
                  isActive 
                    ? 'bg-purple-50 border-[#70189F] text-[#70189F] shadow-md scale-[1.02]' 
                    : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <div className={`p-2 rounded-xl w-9 h-9 flex items-center justify-center ${
                  isActive ? 'bg-[#70189F] text-white' : 'bg-gray-50 text-gray-600'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold leading-none">{key.charAt(0).toUpperCase() + key.slice(1)}</h4>
                  <p className="text-[9px] opacity-70 mt-1 truncate">{info.title.split(' ')[0]}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Payment Input Form */}
        <form id="form-bill-pay" onSubmit={handleVerifyBillPayment} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
          <div className="border-b border-gray-50 pb-3 flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-mono">
              {activeCategory}
            </span>
            <p className="text-xs text-gray-400 font-semibold">{UTILITIES_INFO[activeCategory].desc}</p>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-800 text-xs py-2.5 px-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-bold">Billing Company Provider</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-emerald-800 focus:bg-white"
            >
              {UTILITIES_INFO[activeCategory].companies.map((co) => (
                <option key={co} value={co}>{co}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-bold">Customer ID / Billing Contract Number</label>
            <input
              type="text"
              placeholder={UTILITIES_INFO[activeCategory].placeholderId}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-emerald-800 focus:bg-white transition"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-bold">Invoice Amount (ETB)</label>
            <input
              type="number"
              placeholder="0.00"
              value={billAmount}
              onChange={(e) => setBillAmount(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-mono font-bold focus:outline-none focus:border-emerald-800 focus:bg-white transition"
              required
            />
          </div>

          <div className="bg-gray-50 p-3.5 rounded-2xl space-y-1.5 text-xs border border-gray-100">
            <div className="flex justify-between items-center text-gray-500 font-semibold">
              <span>CBE Utility Service Charge</span>
              <span className="font-mono text-gray-700">ETB 2.00</span>
            </div>
            <div className="flex justify-between items-center text-gray-500 font-semibold">
              <span>VAT (15%)</span>
              <span className="font-mono text-gray-700">ETB 0.30</span>
            </div>
            <div className="flex justify-between items-center text-gray-500 font-semibold">
              <span>Disaster Recovery (5%)</span>
              <span className="font-mono text-gray-700">ETB 0.10</span>
            </div>
            <div className="flex justify-between items-center font-bold text-gray-800 pt-2 border-t border-gray-200">
              <span>Total Debited Amount</span>
              <span className="font-mono text-emerald-800 font-extrabold text-sm">
                ETB {billAmount ? (parseFloat(billAmount) + 2.40).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '2.40'}
              </span>
            </div>
          </div>

          <button
            id="btn-bill-pay-submit"
            type="submit"
            className="w-full bg-emerald-800 hover:bg-emerald-850 text-white font-extrabold py-3 rounded-xl transition shadow-md active:scale-[0.99] cursor-pointer"
          >
            Review and Pay Bill
          </button>
        </form>

      </div>

      {/* ================= PAYMENT AUTH PIN MODAL ================= */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-center relative animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-extrabold text-emerald-950 mb-1 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 animate-pulse" />
              <span>Authorize Bill Payment</span>
            </h3>
            <p className="text-xs text-gray-500 max-w-[220px] mx-auto mb-4">
              Enter your secure 4-digit PIN to process payment of ETB {billAmount} to {selectedCompany}.
            </p>

            <form onSubmit={handleAuthorizeAndPay} className="space-y-4">
              <div className="flex justify-center gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-10 h-10 rounded-full border-2 transition ${
                      enteredPin.length > i 
                        ? 'bg-emerald-800 border-emerald-800 scale-105 shadow-md' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                ))}
              </div>

              {/* Numerical keypad */}
              <div className="grid grid-cols-3 gap-2 pt-3 max-w-[240px] mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (enteredPin.length < 4) setEnteredPin(prev => prev + num);
                    }}
                    className="bg-gray-50 hover:bg-gray-100 py-2 rounded-xl text-lg font-black font-mono border border-gray-100 cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setEnteredPin('')}
                  className="text-xs font-bold text-red-600 bg-gray-50 hover:bg-gray-100 rounded-xl py-2 flex items-center justify-center cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (enteredPin.length < 4) setEnteredPin(prev => prev + '0');
                  }}
                  className="bg-gray-50 hover:bg-gray-100 py-2 rounded-xl text-lg font-black font-mono border border-gray-100 cursor-pointer"
                >
                  0
                </button>
                <button
                  type="submit"
                  className="bg-emerald-800 text-white font-bold rounded-xl text-xs hover:bg-emerald-900 transition flex items-center justify-center cursor-pointer"
                >
                  OK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

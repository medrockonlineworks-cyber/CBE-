import React, { useState } from 'react';
import { ArrowLeft, Search, Filter, ArrowUpRight, ArrowDownLeft, Download, Share2, Copy, Check, CheckCircle2, X } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { TelebirrTransaction } from '../../services/telebirrService';
import { EthioTelecomLogo, TelebirrLogo } from '../TelebirrBrandAssets';

export const TransactionsView: React.FC = () => {
  const { 
    transactions, 
    setActiveSubView, 
    language, 
    selectedTransaction, 
    setSelectedTransaction 
  } = useWallet();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<boolean>(false);

  const filtered = transactions.filter(t => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      t.recipientName.toLowerCase().includes(q) ||
      t.txNumber.toLowerCase().includes(q) ||
      t.bankName.toLowerCase().includes(q) ||
      t.accountNumber.includes(q);
    
    if (!matchesSearch) return false;
    if (filterType === 'all') return true;
    if (filterType === 'transfer') return t.txType.includes('Transfer');
    if (filterType === 'send') return t.txType.includes('Send');
    if (filterType === 'airtime') return t.txType.includes('Airtime');
    if (filterType === 'merchant') return t.txType.includes('Merchant');
    return true;
  });

  const handleCopyTx = (txNo: string) => {
    try {
      navigator.clipboard.writeText(txNo);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {}
  };

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
          {language === 'am' ? 'የግብይት ታሪክ' : 'Transaction History'}
        </h2>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Search bar */}
        <div className="w-full h-11 bg-white rounded-2xl border border-gray-200 px-3.5 flex items-center gap-2 shadow-xs">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'am' ? 'በስም ወይም በግብይት ቁጥር ፈልግ...' : 'Search by recipient, TX# or bank...'}
            className="w-full h-full bg-transparent outline-none text-xs font-semibold text-gray-800 placeholder:text-gray-400"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'transfer', label: 'Bank Transfer' },
            { id: 'send', label: 'Send Money' },
            { id: 'airtime', label: 'Airtime' },
            { id: 'merchant', label: 'Merchant' },
          ].map(chip => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilterType(chip.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filterType === chip.id
                  ? 'bg-[#7BBF18] text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Transactions list */}
        <div className="w-full bg-white rounded-2xl shadow-xs border border-gray-100 divide-y divide-gray-100 overflow-hidden mt-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs">
              No transactions match your search query.
            </div>
          ) : (
            filtered.map(tx => (
              <div
                key={tx.id}
                onClick={() => setSelectedTransaction(tx)}
                className="p-3.5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                    <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-extrabold text-gray-900 leading-tight">
                      {tx.recipientName}
                    </span>
                    <span className="text-[11.5px] text-gray-500 font-medium">
                      {tx.txType} • {tx.bankName}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                      {tx.txTime}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-[14.5px] font-black text-rose-600 font-sans">
                    -{tx.totalDeducted.toFixed(2)} ETB
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-0.5">
                    Successful
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Transaction Receipt Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs select-none">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col animate-fade-in">
            {/* Header banner */}
            <div className="bg-[#7BBF18] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-base font-black">Telebirr Official Receipt</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Details */}
            <div className="p-5 flex flex-col gap-3.5 text-xs text-gray-700">
              <div className="text-center py-2 border-b border-gray-100">
                <span className="text-xs text-gray-500 block uppercase font-bold">Total Amount Paid</span>
                <span className="text-3xl font-black text-gray-900 font-sans mt-0.5 block">
                  {selectedTransaction.totalDeducted.toFixed(2)} ETB
                </span>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                  Completed • {selectedTransaction.status}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Transaction No:</span>
                <div className="flex items-center gap-1 font-mono font-bold text-gray-900">
                  <span>{selectedTransaction.txNumber}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyTx(selectedTransaction.txNumber)}
                    className="p-1 text-gray-400 hover:text-black"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Transaction Type:</span>
                <span className="font-bold text-gray-900">{selectedTransaction.txType}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Recipient:</span>
                <span className="font-bold text-gray-900">{selectedTransaction.recipientName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Account / Phone:</span>
                <span className="font-bold text-gray-900 font-mono">{selectedTransaction.accountNumber}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Service Fee:</span>
                <span className="font-bold text-gray-900 font-mono">{selectedTransaction.serviceFee.toFixed(2)} ETB</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Transaction Time:</span>
                <span className="font-bold text-gray-900 font-mono">{selectedTransaction.txTime}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  alert(`Receipt ${selectedTransaction.txNumber} copied & prepared for sharing.`);
                }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-gray-100 transition"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(`Receipt ${selectedTransaction.txNumber} downloaded.`);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#0072CE] text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#0060b0] transition"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsView;

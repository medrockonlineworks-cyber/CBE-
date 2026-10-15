import React, { useState, useEffect } from 'react';
import { UserProfile, Transaction, TransactionType } from '../types';
import { LocalDb } from '../lib/mockData';
import TransactionDetailModal from './TransactionDetailModal';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  SlidersHorizontal,
  Calendar,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';

interface HistoryProps {
  currentUser: UserProfile;
  onSelectTransaction: (tx: Transaction) => void;
}

export default function History({ currentUser, onSelectTransaction }: HistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [creditDebitFilter, setCreditDebitFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'pending' | 'failed'>('all');
  const [selectedDetailTx, setSelectedDetailTx] = useState<Transaction | null>(null);

  useEffect(() => {
    // Load latest transaction ledger
    const list = LocalDb.getTransactions();
    // Filter by user participant
    const userList = list.filter(t => 
      t.senderId === currentUser.id || t.recipientId === currentUser.id || t.senderAccount === currentUser.accountNumber || t.recipientAccount === currentUser.accountNumber
    );
    // Sort reverse chronological (newest first)
    setTransactions(
      userList.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (isNaN(timeA) || isNaN(timeB)) {
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        }
        return timeB - timeA;
      })
    );
  }, [currentUser]);

  const isCreditTx = (t: Transaction) => {
    return t.type === 'receive' || t.recipientId === currentUser.id || t.recipientAccount === currentUser.accountNumber;
  };

  // Apply filters
  const filteredTransactions = transactions
    .filter((t) => {
      const isCredit = isCreditTx(t);
      const participantName = isCredit ? t.senderName || 'Cash Deposit' : t.recipientName;
      
      if (creditDebitFilter === 'credit' && !isCredit) return false;
      if (creditDebitFilter === 'debit' && isCredit) return false;

      const matchesSearch = 
        participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.recipientAccount.includes(searchTerm);

      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      if (isNaN(timeA) || isNaN(timeB)) {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      return timeB - timeA;
    });

  const totalCreditCount = transactions.filter(t => isCreditTx(t)).length;
  const totalDebitCount = transactions.filter(t => !isCreditTx(t)).length;

  return (
    <div id="history-screen" className="max-w-md mx-auto bg-gray-50 min-h-screen pb-28 font-sans">
      
      {/* Top Banner */}
      <div className="bg-[#70189F] text-white px-5 pt-7 pb-8 rounded-b-[2rem] shadow-md">
        <h2 className="text-xl font-extrabold">Transaction History</h2>
        <p className="text-purple-200 text-xs mt-0.5">Commercial Bank of Ethiopia statement &amp; activity history</p>
      </div>

      <div className="p-5 space-y-4">
        
        {/* All, Credit, Debit Filter Tabs */}
        <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex gap-1.5">
          <button
            id="btn-history-filter-all"
            type="button"
            onClick={() => setCreditDebitFilter('all')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              creditDebitFilter === 'all'
                ? 'bg-[#70189F] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>All</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
              creditDebitFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {transactions.length}
            </span>
          </button>

          <button
            id="btn-history-filter-credit"
            type="button"
            onClick={() => setCreditDebitFilter('credit')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              creditDebitFilter === 'credit'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'text-emerald-800 hover:bg-emerald-50/60'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
            <span>Credit</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
              creditDebitFilter === 'credit' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {totalCreditCount}
            </span>
          </button>

          <button
            id="btn-history-filter-debit"
            type="button"
            onClick={() => setCreditDebitFilter('debit')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              creditDebitFilter === 'debit'
                ? 'bg-rose-700 text-white shadow-md'
                : 'text-rose-800 hover:bg-rose-50/60'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
            <span>Debit</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
              creditDebitFilter === 'debit' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
            }`}>
              {totalDebitCount}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
          <input 
            id="input-history-search"
            type="text"
            placeholder="Search by name, ID, reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl pl-11 pr-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800/20 shadow-sm transition"
          />
        </div>

        {/* Filters bar */}
        <div className="flex flex-col gap-3 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-950 uppercase tracking-wider">
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-800" />
            <span>Filter ledger parameters</span>
          </div>

          {/* Type Filter Tabs */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-1">
            {['all', 'send', 'receive', 'transfer', 'bill', 'airtime'].map((type) => (
              <button
                id={`btn-filter-type-${type}`}
                key={type}
                onClick={() => setTypeFilter(type as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer flex-shrink-0 ${
                  typeFilter === type
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                }`}
              >
                {type === 'all' ? 'All Types' : type === 'airtime' ? 'Airtime' : type}
              </button>
            ))}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex gap-1.5 pt-1 border-t border-gray-50">
            {['all', 'success', 'pending', 'failed'].map((status) => (
              <button
                id={`btn-filter-status-${status}`}
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition cursor-pointer ${
                  statusFilter === status
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-white border border-gray-100 text-gray-400 hover:bg-gray-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions list */}
        <div className="space-y-3">
          {filteredTransactions.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center shadow-sm space-y-2">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-sm font-bold text-gray-500">No transactions match your search filter.</p>
              <p className="text-xs text-gray-400">Try modifying your filter parameters or search terms.</p>
            </div>
          ) : (
            filteredTransactions.map((tx, index) => {
              const isCredit = isCreditTx(tx);
              const isRecentTop = index < 2;
              return (
                <button
                  id={`btn-history-tx-${tx.id}`}
                  key={tx.id}
                  onClick={() => setSelectedDetailTx(tx)}
                  className="w-full bg-white hover:bg-emerald-50/5 border border-gray-100 p-3 sm:p-3.5 rounded-2xl flex justify-between items-center transition shadow-sm text-left cursor-pointer hover:scale-[1.01]"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full flex items-center justify-center ${
                      isCredit ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                    }`}>
                      {isCredit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isRecentTop && (
                          <span className="text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-100 text-[#70189F] border border-purple-200">
                            Recent
                          </span>
                        )}
                        <span className={`text-[7.5px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          isCredit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isCredit ? 'Credit' : 'Debit'}
                        </span>
                        <p className="text-xs font-bold text-gray-900 leading-none">
                          {isCredit ? tx.senderName || 'Cash Deposit' : tx.recipientName}
                        </p>
                      </div>
                      <p className="text-[9px] text-gray-400 font-medium mt-0.5 font-mono">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                      <p className="text-[8px] text-emerald-850 font-bold font-mono mt-0.5 uppercase tracking-wide">
                        Ref: {tx.id}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`text-xs font-bold font-mono leading-none ${
                      isCredit ? 'text-emerald-700' : 'text-gray-900'
                    }`}>
                      {isCredit ? '+' : '-'}ETB {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <span className={`inline-block mt-0.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                      tx.status === 'success' ? 'bg-emerald-100 text-emerald-800' :
                      tx.status === 'failed' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

      </div>

      {/* TRANSACTION DETAIL MODAL */}
      {selectedDetailTx && (
        <TransactionDetailModal
          transaction={selectedDetailTx}
          onClose={() => setSelectedDetailTx(null)}
          onViewReceipt={(tx) => {
            setSelectedDetailTx(null);
            onSelectTransaction(tx);
          }}
          currentUserId={currentUser.id}
          currentUserAccount={currentUser.accountNumber}
        />
      )}
    </div>
  );
}

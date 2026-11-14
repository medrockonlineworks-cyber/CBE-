import React, { useState } from 'react';
import { 
  X, 
  Receipt, 
  ArrowUpRight, 
  Sparkles, 
  CheckCircle2, 
  Calendar, 
  Building, 
  User, 
  Plus, 
  Send,
  MessageSquare
} from 'lucide-react';
import { Transaction } from '../../types';
import { TelegramSimulatorService } from '../../services/telegramSimulatorService';
import { generateCbeTxId } from '../../lib/mockData';

interface TelegramBankTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateTransaction: (tx: Partial<Transaction>) => void;
}

export default function TelegramBankTransactionsModal({
  isOpen,
  onClose,
  onSimulateTransaction,
}: TelegramBankTransactionsModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(() => 
    TelegramSimulatorService.getAllBankTransactions()
  );

  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customRecipient, setCustomRecipient] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customSender, setCustomSender] = useState('Global Online Market');
  const [customRef, setCustomRef] = useState('');

  if (!isOpen) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRecipient.trim() || !customAmount) return;

    const amountNum = parseFloat(customAmount);
    const refStr = customRef.trim() || generateCbeTxId();

    const newTx: Partial<Transaction> = {
      id: `tx-${Date.now()}`,
      type: 'send',
      senderName: customSender.trim() || 'Global Online Market',
      recipientName: customRecipient.trim(),
      amount: amountNum,
      reference: refStr,
      recipientBank: 'Commercial Bank of Ethiopia',
      createdAt: new Date().toISOString(),
    };

    onSimulateTransaction(newTx);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#17212b] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-[#0e1621] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">Bank Transactions</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Simulate receiver chat from bank transfer</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {!isCustomMode ? (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Registered Transactions ({transactions.length})
                </span>
                <button
                  onClick={() => setIsCustomMode(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Simulate Custom Transfer
                </button>
              </div>

              {transactions.map((tx) => {
                const amountFormatted = Number(tx.amount || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                const ref = tx.reference || 'FT267561AI79';
                const recipient = tx.recipientName || 'Leul Degsew Alemayehu';
                const sender = tx.senderName || 'Global Online Market';

                return (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 bg-slate-50/50 dark:bg-[#0e1621]/60 transition group space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                            {recipient}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            From: <span className="font-medium text-slate-700 dark:text-slate-300">{sender}</span>
                          </p>
                          <span className="inline-block px-1.5 py-0.5 mt-1 rounded bg-slate-200/60 dark:bg-slate-800 text-[10.5px] font-mono text-slate-600 dark:text-slate-300">
                            Ref: {ref}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 block">
                          ETB {amountFormatted}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today'}
                        </span>
                      </div>
                    </div>

                    {/* Simulation Button */}
                    <div className="pt-1.5 border-t border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Auto-creates SMS &amp; CBE Receipt
                      </span>
                      <button
                        onClick={() => {
                          onSimulateTransaction(tx);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Simulate Chat
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Custom Simulation Form */
            <form onSubmit={handleCustomSubmit} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200">
                Type custom transfer details to simulate a live receipt conversation with this receiver.
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Receiver Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Leul Degsew Alemayehu"
                  value={customRecipient}
                  onChange={(e) => setCustomRecipient(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0e1621] border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Transferred Amount (ETB) <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  required
                  placeholder="e.g. 200000"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0e1621] border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Payer / Sender Name
                </label>
                <input 
                  type="text" 
                  placeholder="Global Online Market"
                  value={customSender}
                  onChange={(e) => setCustomSender(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0e1621] border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reference Number (optional)
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. FT267561AI79 (auto-generated if empty)"
                  value={customRef}
                  onChange={(e) => setCustomRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0e1621] border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-md shadow-purple-500/20 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" /> Start Simulation
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

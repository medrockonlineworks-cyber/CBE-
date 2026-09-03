import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Check, 
  CreditCard, 
  Building, 
  Wallet, 
  ArrowLeftRight, 
  ShieldCheck, 
  Copy, 
  Sparkles, 
  AlertCircle, 
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  MessageSquare
} from 'lucide-react';
import { BankAccount, BankAccountType, UserProfile } from '../types';
import { LocalDb } from '../lib/mockData';
import { SmsWebhookService } from '../lib/smsWebhookService';
import { CopyIcon } from './CbeCustomIcons';

interface ManageAccountsModalProps {
  currentUser: UserProfile;
  accounts: BankAccount[];
  selectedAccountId: string;
  onClose: () => void;
  onSelectAccount: (acc: BankAccount) => void;
  onAccountsUpdated: () => void;
  onOpenTransferBetweenOwn?: (fromAccId?: string, toAccId?: string) => void;
}

const ACCOUNT_TYPE_OPTIONS: { type: BankAccountType; label: string; desc: string; icon: any }[] = [
  { type: 'savings', label: 'Saving Account', desc: 'Standard CBE high-yield savings account', icon: Building },
  { type: 'wadiah', label: 'Wadiah Interest-Free', desc: 'Sharia-compliant interest-free banking', icon: ShieldCheck },
  { type: 'cbe_birr', label: 'CBE Birr Wallet', desc: 'Instant mobile digital wallet account', icon: Wallet },
  { type: 'checking', label: 'Checking / Business', desc: 'Commercial checking for active transactions', icon: CreditCard },
  { type: 'youth_savings', label: 'Youth Savings', desc: 'Special youth interest rate savings', icon: Sparkles },
  { type: 'women_special', label: 'Women Special', desc: 'Empowerment savings with bonus privileges', icon: TrendingUp },
];

export default function ManageAccountsModal({
  currentUser,
  accounts,
  selectedAccountId,
  onClose,
  onSelectAccount,
  onAccountsUpdated,
  onOpenTransferBetweenOwn
}: ManageAccountsModalProps) {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<BankAccountType>('savings');
  const [newAccDeposit, setNewAccDeposit] = useState('5000');
  const [isPrimary, setIsPrimary] = useState(false);
  const [customAccNum, setCustomAccNum] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleCopyAcc = (accNumber: string, id: string) => {
    navigator.clipboard.writeText(accNumber);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newAccName.trim()) {
      setErrorMsg('Please enter an account name or nickname.');
      return;
    }

    const depositAmount = parseFloat(newAccDeposit) || 0;
    if (depositAmount < 0) {
      setErrorMsg('Initial deposit cannot be negative.');
      return;
    }

    try {
      const created = LocalDb.createAccount(currentUser.id, {
        accountName: newAccName.trim(),
        accountType: newAccType,
        initialBalance: depositAmount,
        customAccountNumber: customAccNum.trim() || undefined,
        isPrimary
      });

      onAccountsUpdated();
      onSelectAccount(created);
      setSuccessMsg(`Account "${created.accountName}" (${created.accountNumber}) created successfully!`);
      setView('list');
      setNewAccName('');
      setNewAccDeposit('5000');
      setCustomAccNum('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create account.');
    }
  };

  const handleSetPrimary = (acc: BankAccount) => {
    const allAccs = LocalDb.getAllAccounts();
    allAccs.forEach(a => {
      if (a.userId === currentUser.id) {
        a.isPrimary = a.id === acc.id;
      }
    });
    LocalDb.setAccounts(allAccs);
    
    // Also sync user profile primary account number and balance
    LocalDb.updateUserProfile(currentUser.id, {
      accountNumber: acc.accountNumber,
      accountType: acc.accountType === 'wadiah' ? 'wadiah' : acc.accountType === 'cbe_birr' ? 'cbe_birr' : 'savings',
      balance: acc.balance
    });

    onAccountsUpdated();
    onSelectAccount(acc);
    setSuccessMsg(`Set ${acc.accountName} as your primary account!`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in select-none">
      <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl relative max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-[#70189F]">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900">
                {view === 'list' ? 'My CBE Accounts' : 'Open New CBE Account'}
              </h3>
              <p className="text-[10px] text-gray-500">
                {view === 'list' ? `${accounts.length} Accounts Registered` : 'Instant creation with 13-digit CBE number'}
              </p>
            </div>
          </div>
          <button 
            id="btn-close-manage-accounts"
            onClick={onClose} 
            className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status messages */}
        {errorMsg && (
          <div className="mt-3 bg-red-50 text-red-700 text-xs p-2.5 rounded-xl flex items-center gap-2 border border-red-100">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-3 bg-emerald-50 text-emerald-700 text-xs p-2.5 rounded-xl flex items-center gap-2 border border-emerald-100">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* View: Accounts List */}
        {view === 'list' && (
          <div className="flex-1 overflow-y-auto my-3 space-y-2.5 pr-0.5">
            {accounts.map((acc) => {
              const isSelected = acc.id === selectedAccountId;
              return (
                <div 
                  key={acc.id}
                  className={`p-3.5 rounded-2xl border transition relative ${
                    isSelected 
                      ? 'bg-purple-50/70 border-[#70189F]/40 shadow-xs' 
                      : 'bg-gray-50/80 border-gray-100 hover:bg-gray-100/60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-xs text-gray-900 truncate">{acc.accountName}</span>
                        {acc.isPrimary && (
                          <span className="text-[9px] font-black bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                            Primary
                          </span>
                        )}
                        <span className="text-[9px] font-bold bg-gray-200/80 text-gray-700 px-1.5 py-0.5 rounded-md uppercase">
                          {acc.accountType}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-xs font-mono">
                        <span className="text-gray-500 font-semibold">{acc.accountNumber}</span>
                        <button
                          onClick={() => handleCopyAcc(acc.accountNumber, acc.id)}
                          className="text-gray-400 hover:text-[#70189F] cursor-pointer"
                          title="Copy account number"
                        >
                          {copiedId === acc.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <CopyIcon size={14} />
                          )}
                        </button>
                      </div>

                      <p className="mt-1.5 text-sm font-black font-mono text-[#70189F]">
                        ETB {acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>

                      {/* Dedicated Message Account Tag */}
                      <div className="mt-2 pt-1.5 border-t border-gray-200/60 flex items-center gap-2 text-[10.5px]">
                        <div className="flex items-center gap-1 text-emerald-800 font-mono font-bold">
                          <MessageSquare className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                          <span>SIM: {acc.messagePhone || SmsWebhookService.getDefaultMessagePhone(acc.accountNumber)}</span>
                        </div>
                        <span className="text-gray-300">•</span>
                        <span className="text-[9.5px] font-mono font-bold bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded">
                          {acc.messageAccountId || `MSG-${acc.accountNumber.slice(-4)}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {isSelected ? (
                        <span className="flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-lg">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            onSelectAccount(acc);
                            setSuccessMsg(`Switched active view to ${acc.accountName}`);
                          }}
                          className="text-xs font-bold bg-white hover:bg-purple-100 text-[#70189F] border border-purple-200 px-2.5 py-1 rounded-xl transition cursor-pointer active:scale-95 shadow-2xs"
                        >
                          Select
                        </button>
                      )}

                      {!acc.isPrimary && (
                        <button
                          onClick={() => handleSetPrimary(acc)}
                          className="text-[10px] text-gray-500 hover:text-amber-700 underline font-medium cursor-pointer"
                        >
                          Make Primary
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quick action buttons inside list */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                id="btn-open-create-account-view"
                onClick={() => {
                  setView('create');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="flex-1 bg-[#70189F] hover:bg-[#8322b7] text-white text-xs font-black py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Open Another Account</span>
              </button>

              {accounts.length > 1 && onOpenTransferBetweenOwn && (
                <button
                  id="btn-transfer-between-accounts"
                  onClick={() => {
                    onClose();
                    onOpenTransferBetweenOwn();
                  }}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Transfer Between Accounts</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* View: Create New Account Form */}
        {view === 'create' && (
          <form onSubmit={handleCreateAccount} className="flex-1 overflow-y-auto my-3 space-y-3.5 pr-0.5">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Account Name / Nickname*</label>
              <input
                id="input-new-acc-name"
                type="text"
                placeholder="e.g. Wadiah Emergency Fund, Business Saving..."
                value={newAccName}
                onChange={(e) => setNewAccName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#70189F] focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Account Type</label>
              <div className="grid grid-cols-2 gap-2">
                {ACCOUNT_TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isChecked = newAccType === opt.type;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setNewAccType(opt.type)}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition cursor-pointer ${
                        isChecked 
                          ? 'bg-purple-50 border-[#70189F] ring-1 ring-[#70189F]/20' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isChecked ? 'text-[#70189F]' : 'text-gray-400'}`} />
                      <div className="min-w-0">
                        <p className={`text-xs font-extrabold leading-tight ${isChecked ? 'text-[#70189F]' : 'text-gray-800'}`}>
                          {opt.label}
                        </p>
                        <p className="text-[9px] text-gray-500 leading-tight mt-0.5 line-clamp-1">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Initial Deposit (ETB)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">ETB</span>
                <input
                  id="input-new-acc-deposit"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="5000"
                  value={newAccDeposit}
                  onChange={(e) => setNewAccDeposit(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-3.5 py-2.5 text-xs font-mono font-black focus:outline-none focus:border-[#70189F] focus:bg-white"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Starting balance allocated to this new CBE account.</p>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Custom 13-digit Account Number (Optional)</label>
              <input
                id="input-new-acc-custom-num"
                type="text"
                maxLength={13}
                placeholder="Leave blank to auto-generate (1000XXXXXXXXX)"
                value={customAccNum}
                onChange={(e) => setCustomAccNum(e.target.value.replace(/\D/g, '').slice(0, 13))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold focus:outline-none focus:border-[#70189F] focus:bg-white"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">If left blank, a valid 13-digit CBE account number will be generated.</p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="check-set-primary"
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="rounded border-gray-300 text-[#70189F] focus:ring-[#70189F] cursor-pointer"
              />
              <label htmlFor="check-set-primary" className="text-xs font-bold text-gray-700 cursor-pointer">
                Set as Primary Account on Dashboard
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setView('list')}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer"
              >
                Back to Accounts
              </button>
              <button
                id="btn-submit-create-account"
                type="submit"
                className="flex-1 bg-[#70189F] hover:bg-[#8322b7] text-white text-xs font-black py-2.5 rounded-xl transition cursor-pointer shadow-sm active:scale-95"
              >
                Confirm & Create
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

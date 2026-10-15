import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  Check, 
  ShieldCheck, 
  Building, 
  Copy, 
  CheckCircle2, 
  ArrowRight,
  UserPlus,
  ArrowLeft,
  Users
} from 'lucide-react';
import { RegisteredAccountInfo } from '../types';
import { LocalDb } from '../lib/mockData';

interface RegisteredAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (account: RegisteredAccountInfo) => void;
  currentSelectedAccount?: string;
  title?: string;
}

export const RegisteredAccountsModal: React.FC<RegisteredAccountsModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentSelectedAccount,
  title = "Registered Bank Accounts"
}) => {
  // Modal view: 'directory' | 'register'
  const [modalView, setModalView] = useState<'directory' | 'register'>('directory');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'cbe' | 'other' | 'verified'>('all');
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regAccount, setRegAccount] = useState('');
  const [regBank, setRegBank] = useState('Commercial Bank of Ethiopia');
  const [regPhone, setRegPhone] = useState('');
  const [regError, setRegError] = useState('');

  // Reload trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load all registered accounts from LocalDb
  const allAccounts = useMemo(() => {
    return LocalDb.getAllRegisteredAccounts();
  }, [isOpen, refreshTrigger]);

  // Filter accounts based on query and tab
  const filteredAccounts = useMemo(() => {
    let list = allAccounts;

    // Filter by tab
    if (activeTab === 'cbe') {
      list = list.filter(acc => 
        acc.bankName.toLowerCase().includes('commercial bank') || 
        acc.bankName.toLowerCase().includes('cbe')
      );
    } else if (activeTab === 'other') {
      list = list.filter(acc => 
        !acc.bankName.toLowerCase().includes('commercial bank') && 
        !acc.bankName.toLowerCase().includes('cbe')
      );
    } else if (activeTab === 'verified') {
      list = list.filter(acc => acc.isVerified);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const digits = q.replace(/\D/g, '');
      list = list.filter(acc => {
        const nameMatch = acc.accountName.toLowerCase().includes(q);
        const bankMatch = acc.bankName.toLowerCase().includes(q);
        const accMatch = digits.length > 0 && acc.accountNumber.includes(digits);
        const phoneMatch = acc.phone && digits.length > 3 && acc.phone.includes(digits);
        return nameMatch || bankMatch || accMatch || phoneMatch;
      });
    }

    return list;
  }, [allAccounts, searchQuery, activeTab]);

  const handleCopy = (e: React.MouseEvent, accNum: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(accNum);
    setCopiedAccount(accNum);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const handleAccountClick = (acc: RegisteredAccountInfo) => {
    onSelect(acc);
    onClose();
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    const cleanAccount = regAccount.replace(/\D/g, '');
    if (cleanAccount.length !== 13) {
      setRegError('Account Number must be exactly 13 digits.');
      return;
    }

    if (!regName.trim()) {
      setRegError('Please provide the full beneficiary name.');
      return;
    }

    const newEntry: RegisteredAccountInfo = {
      accountNumber: cleanAccount,
      accountName: regName.trim(),
      bankName: regBank.trim() || 'Commercial Bank of Ethiopia',
      phone: regPhone.trim() || undefined,
      isVerified: true,
      accountType: 'Saving Account',
      balance: 1000.00
    };

    LocalDb.registerNewAccount(newEntry);
    setRefreshTrigger(prev => prev + 1);

    // Reset registration form
    setRegName('');
    setRegAccount('');
    setRegPhone('');
    setModalView('directory');

    // Auto-select the newly registered account for transfer
    onSelect(newEntry);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 pt-4 pb-3 bg-gradient-to-r from-[#70189F] to-[#7f1899] text-white flex-shrink-0">
          <div className="w-12 h-1 bg-white/30 rounded-full mx-auto mb-3 sm:hidden" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {modalView === 'register' ? (
                <button
                  type="button"
                  onClick={() => setModalView('directory')}
                  className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition cursor-pointer"
                  title="Back to Directory"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-amber-300">
                  <Building className="w-5 h-5" />
                </div>
              )}
              <div>
                <h3 className="font-extrabold text-[16px] text-white tracking-tight leading-tight">
                  {modalView === 'register' ? 'Register New Bank Account' : title}
                </h3>
                <p className="text-purple-200 text-xs mt-0.5">
                  {modalView === 'register' 
                    ? 'Register beneficiary name & 13-digit account number' 
                    : 'Select a verified registered beneficiary to auto-fill'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {modalView === 'directory' && (
                <button
                  type="button"
                  onClick={() => setModalView('register')}
                  className="px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-purple-950 rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-xs"
                  title="Register new beneficiary account"
                >
                  <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Register</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Directory Search & Category Tabs */}
          {modalView === 'directory' && (
            <>
              {/* Search Bar inside Header */}
              <div className="mt-3.5 relative">
                <Search className="w-4 h-4 text-purple-300 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, 13-digit A/C, phone, or bank..."
                  className="w-full bg-white text-gray-900 placeholder:text-gray-400 pl-10 pr-9 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/80 shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Tabs */}
              <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-0.5 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex-shrink-0 cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-amber-400 text-purple-950 shadow-xs'
                      : 'bg-white/15 text-purple-100 hover:bg-white/20'
                  }`}
                >
                  All ({allAccounts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('cbe')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex-shrink-0 cursor-pointer ${
                    activeTab === 'cbe'
                      ? 'bg-amber-400 text-purple-950 shadow-xs'
                      : 'bg-white/15 text-purple-100 hover:bg-white/20'
                  }`}
                >
                  CBE Accounts
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('verified')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex-shrink-0 cursor-pointer ${
                    activeTab === 'verified'
                      ? 'bg-amber-400 text-purple-950 shadow-xs'
                      : 'bg-white/15 text-purple-100 hover:bg-white/20'
                  }`}
                >
                  Verified
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('other')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex-shrink-0 cursor-pointer ${
                    activeTab === 'other'
                      ? 'bg-amber-400 text-purple-950 shadow-xs'
                      : 'bg-white/15 text-purple-100 hover:bg-white/20'
                  }`}
                >
                  Other Banks
                </button>
              </div>
            </>
          )}
        </div>

        {/* Modal Body: Either Directory List OR Registration Form */}
        {modalView === 'register' ? (
          /* ================= ACCOUNT REGISTRATION PAGE ================= */
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/60">
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3.5 text-xs text-purple-900">
              <span className="font-bold">Account Registration:</span> Enter beneficiary details once. The verified name will be stored here in your Registered Directory and automatically associated with this 13-digit account.
            </div>

            {regError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl font-semibold">
                {regError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">
                  Full Beneficiary Name*
                </label>
                <input
                  type="text"
                  placeholder="e.g. Abebe Bikila"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#70189F]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">
                  Account Number (13 Digits)*
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={13}
                  placeholder="e.g. 1000123456789"
                  value={regAccount}
                  onChange={(e) => setRegAccount(e.target.value.replace(/\D/g, '').slice(0, 13))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-gray-900 focus:outline-none focus:border-[#70189F]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">
                  Bank Name*
                </label>
                <select
                  value={regBank}
                  onChange={(e) => setRegBank(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#70189F]"
                >
                  <option value="Commercial Bank of Ethiopia">Commercial Bank of Ethiopia (CBE)</option>
                  <option value="Dashen Bank">Dashen Bank</option>
                  <option value="Awash Bank">Awash Bank</option>
                  <option value="Bank of Abyssinia">Bank of Abyssinia</option>
                  <option value="Telebirr">Telebirr Wallet</option>
                  <option value="Cooperative Bank of Oromia">Cooperative Bank of Oromia</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +251 91 123 4567"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:border-[#70189F]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalView('directory')}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-2 py-3 bg-[#70189F] hover:bg-[#58117D] active:scale-95 text-white font-extrabold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Save &amp; Select Account</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ================= DIRECTORY LIST CONTAINER ================= */
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-gray-50/60 divide-y divide-gray-100">
            {filteredAccounts.length > 0 ? (
              filteredAccounts.map((account, index) => {
                const isSelected = currentSelectedAccount === account.accountNumber;
                const initials = account.accountName
                  .split(' ')
                  .map(n => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'CB';
                
                const isCbe = account.bankName.toLowerCase().includes('commercial bank') || account.bankName.toLowerCase().includes('cbe');

                return (
                  <div
                    key={`${account.accountNumber}-${index}`}
                    onClick={() => handleAccountClick(account)}
                    className={`pt-2.5 first:pt-0 group p-3 rounded-2xl transition cursor-pointer flex items-center justify-between gap-3 border ${
                      isSelected
                        ? 'bg-purple-50 border-[#70189F]/60 ring-2 ring-purple-600/20 shadow-xs'
                        : 'bg-white hover:bg-purple-50/40 hover:border-purple-200 border-gray-100 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Account Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-sm tracking-tight ${
                          isCbe
                            ? 'bg-purple-100 text-[#70189F] border border-purple-200/60'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200/60'
                        }`}>
                          {isCbe ? initials : <Building className="w-5 h-5 text-emerald-700" />}
                        </div>
                        {account.isVerified && (
                          <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      {/* Account Info Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-gray-900 text-sm tracking-tight truncate group-hover:text-purple-950">
                            {account.accountName}
                          </h4>
                          {account.isVerified && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md">
                              Verified
                            </span>
                          )}
                        </div>

                        {/* Account Number with Copy Button */}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100/90 px-1.5 py-0.5 rounded-md tracking-wider">
                            {account.accountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopy(e, account.accountNumber)}
                            className="text-gray-400 hover:text-purple-700 transition p-0.5"
                            title="Copy account number"
                          >
                            {copiedAccount === account.accountNumber ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Bank & Branch info */}
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-1 truncate">
                          <span className="truncate">{account.bankName}</span>
                          {account.accountType && (
                            <>
                              <span>•</span>
                              <span className="text-gray-400">{account.accountType}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Choose / Select Action */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                          isSelected
                            ? 'bg-[#70189F] text-white'
                            : 'bg-purple-50 text-[#70189F] group-hover:bg-[#70189F] group-hover:text-white'
                        }`}
                      >
                        <span>{isSelected ? 'Selected' : 'Choose'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-gray-800 text-sm">No registered accounts found</h4>
                <p className="text-gray-500 text-xs mt-1 max-w-xs mx-auto">
                  No matching accounts found for "{searchQuery}".
                </p>
                <button
                  type="button"
                  onClick={() => setModalView('register')}
                  className="mt-4 px-4 py-2 bg-[#70189F] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#58117D] transition cursor-pointer"
                >
                  Register New Account
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Commercial Bank of Ethiopia Verified Directory</span>
          </span>
          <span className="font-mono text-[11px] font-semibold text-gray-400">
            {filteredAccounts.length} accounts
          </span>
        </div>
      </div>
    </div>
  );
};

export default RegisteredAccountsModal;

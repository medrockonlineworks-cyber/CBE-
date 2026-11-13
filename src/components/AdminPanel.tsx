import React, { useState, useEffect, useMemo } from 'react';
import { 
  LocalDb, 
  DEFAULT_CBE_LOGO, 
  OFFICIAL_CBE_STAMP_LOGO, 
  OFFICIAL_CBE_QR_PRESET,
  getAuthenticCbeQrSvgDataUri,
  formatTo12CharTxId 
} from '../lib/mockData';
import { UserProfile, Transaction, AuditLog } from '../types';
import { CbeLogo } from './CbeLogo';
import { compressImageFile } from '../lib/imageUtils';
import BankLogoModal from './BankLogoModal';
import AdminEthiopianNames from '../pages/AdminEthiopianNames';
import { updatePwaBranding } from '../utils/pwaBranding';
import { 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  Activity, 
  Search, 
  AlertOctagon, 
  Ban, 
  CheckCircle, 
  Edit3, 
  ChevronRight, 
  Database,
  ArrowLeft,
  ArrowLeftRight,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  Loader2,
  Link as LinkIcon,
  Sparkles,
  ExternalLink,
  Stamp,
  CheckCircle2,
  QrCode
} from 'lucide-react';

interface AdminPanelProps {
  currentUser: UserProfile;
  onBack: () => void;
}

export default function AdminPanel({ currentUser, onBack }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'transactions' | 'audit' | 'reports' | 'feedback_settings' | 'ethiopian_names'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [customBankLogo, setCustomBankLogo] = useState<string | null>(null);
  const [customBankStamp, setCustomBankStamp] = useState<string | null>(null);
  const [customQrCode, setCustomQrCode] = useState<string | null>(null);
  const [stampProcessing, setStampProcessing] = useState(false);
  const [qrProcessing, setQrProcessing] = useState(false);
  const [stampUrlInput, setStampUrlInput] = useState('');
  const [qrUrlInput, setQrUrlInput] = useState('');
  const [showLogoModal, setShowLogoModal] = useState(false);

  // Dynamic QR tester state to test different transactions
  const [testTxId, setTestTxId] = useState('FT263211VK07');
  const testTxQr = useMemo(() => {
    return getAuthenticCbeQrSvgDataUri(testTxId);
  }, [testTxId]);
  
  // Search / Filters
  const [userSearch, setUserSearch] = useState('');
  const [txSearch, setTxSearch] = useState('');
  
  // Modal / Adjust State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newBalance, setNewBalance] = useState<string>('');
  const [newStatus, setNewStatus] = useState<'active' | 'suspended'>('active');

  // Load latest database state
  const refreshData = () => {
    setUsers(LocalDb.getUsers());
    setTransactions(LocalDb.getTransactions());
    setAuditLogs(LocalDb.getAuditLogs());
    setCustomBankLogo(LocalDb.getCustomBankLogo());
    setCustomBankStamp(LocalDb.getCustomBankStamp());
    setCustomQrCode(LocalDb.getCustomQrCode());
  };

  useEffect(() => {
    refreshData();
    const handleSyncLogo = () => {
      setCustomBankLogo(LocalDb.getCustomBankLogo());
    };
    const handleSyncStamp = () => {
      setCustomBankStamp(LocalDb.getCustomBankStamp());
    };
    const handleSyncQr = () => {
      setCustomQrCode(LocalDb.getCustomQrCode());
    };
    window.addEventListener('cbe_logo_updated', handleSyncLogo);
    window.addEventListener('cbe_stamp_updated', handleSyncStamp);
    window.addEventListener('cbe_qr_updated', handleSyncQr);
    window.addEventListener('storage', handleSyncLogo);
    window.addEventListener('storage', handleSyncStamp);
    window.addEventListener('storage', handleSyncQr);
    return () => {
      window.removeEventListener('cbe_logo_updated', handleSyncLogo);
      window.removeEventListener('cbe_stamp_updated', handleSyncStamp);
      window.removeEventListener('cbe_qr_updated', handleSyncQr);
      window.removeEventListener('storage', handleSyncLogo);
      window.removeEventListener('storage', handleSyncStamp);
      window.removeEventListener('storage', handleSyncQr);
    };
  }, []);

  // Handle balance adjust
  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    const balanceNum = parseFloat(newBalance);
    if (!isNaN(balanceNum)) {
      LocalDb.adminAdjustUserBalance(editingUser.id, balanceNum);
    }
    
    if (editingUser.status !== newStatus) {
      LocalDb.adminChangeUserStatus(editingUser.id, newStatus);
    }
    
    setEditingUser(null);
    setNewBalance('');
    refreshData();
  };

  // Change Tx Status
  const handleToggleTxStatus = (txId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'success' ? 'failed' : currentStatus === 'failed' ? 'pending' : 'success';
    LocalDb.adminChangeTransactionStatus(txId, nextStatus);
    refreshData();
  };

  // Feedback customization handlers
  const handleBankLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await compressImageFile(file, 400, 0.9);
      LocalDb.setCustomBankLogo(dataUrl);
      setCustomBankLogo(dataUrl);
      await updatePwaBranding(dataUrl);
      LocalDb.addAuditLog(currentUser.id, currentUser.email, 'UPLOAD_BANK_LOGO', 'Uploaded a custom bank logo image for receipts, UI, and PWA home screen icon.');
    } catch (err) {
      console.error('Failed to compress bank logo:', err);
      alert('Failed to process image. Please try another image file.');
    }
  };

  const handleResetBankLogo = async () => {
    LocalDb.setCustomBankLogo('/custom-bank-logo.png');
    setCustomBankLogo('/custom-bank-logo.png');
    await updatePwaBranding('/custom-bank-logo.png');
    LocalDb.addAuditLog(currentUser.id, currentUser.email, 'RESET_BANK_LOGO', 'Reset the bank logo to recently uploaded PNG logo.');
  };

  const handleBankStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setStampProcessing(true);
      const dataUrl = await compressImageFile(file, 500, 0.95);
      LocalDb.setCustomBankStamp(dataUrl);
      setCustomBankStamp(dataUrl);
      LocalDb.addAuditLog(currentUser.id, currentUser.email, 'UPLOAD_BANK_STAMP', 'Uploaded a custom bank rubber stamp for web receipts.');
    } catch (err) {
      console.error('Failed to compress bank stamp:', err);
      alert('Failed to process stamp image. Please try another image file.');
    } finally {
      setStampProcessing(false);
    }
  };

  const handleApplyStampUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stampUrlInput.trim()) return;
    LocalDb.setCustomBankStamp(stampUrlInput.trim());
    setCustomBankStamp(stampUrlInput.trim());
    setStampUrlInput('');
    LocalDb.addAuditLog(currentUser.id, currentUser.email, 'UPLOAD_BANK_STAMP', 'Applied custom bank rubber stamp from URL.');
  };

  const handleApplyStampPreset = () => {
    LocalDb.setCustomBankStamp(OFFICIAL_CBE_STAMP_LOGO);
    setCustomBankStamp(OFFICIAL_CBE_STAMP_LOGO);
    LocalDb.addAuditLog(currentUser.id, currentUser.email, 'APPLY_PRESET_STAMP', 'Applied official CBE circular purple rubber stamp preset.');
  };

  const handleResetBankStamp = () => {
    LocalDb.setCustomBankStamp(null);
    setCustomBankStamp(null);
    LocalDb.addAuditLog(currentUser.id, currentUser.email, 'REMOVE_BANK_STAMP', 'Removed custom bank stamp. Web receipts will display without any stamp.');
  };

  // QR Code custom sample handlers
  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setQrProcessing(true);
      const dataUrl = await compressImageFile(file, 500, 0.95);
      LocalDb.setCustomQrCode(dataUrl);
      setCustomQrCode(dataUrl);
      LocalDb.addAuditLog(currentUser.id, currentUser.email, 'UPLOAD_CUSTOM_QR', 'Uploaded a sample QR code image for transaction receipts.');
    } catch (err) {
      console.error('Failed to compress QR image:', err);
      alert('Failed to process QR code image. Please try another image file.');
    } finally {
      setQrProcessing(false);
    }
  };

  const handleApplyQrUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrUrlInput.trim()) return;
    LocalDb.setCustomQrCode(qrUrlInput.trim());
    setCustomQrCode(qrUrlInput.trim());
    setQrUrlInput('');
    LocalDb.addAuditLog(currentUser.id, currentUser.email, 'UPLOAD_CUSTOM_QR', 'Applied sample QR code from URL.');
  };

  const handleApplyQrPreset = () => {
    LocalDb.setCustomQrCode(null);
    setCustomQrCode(null);
    setTestTxId('FT263211VK07');
    LocalDb.addAuditLog(currentUser.id, currentUser.email, 'APPLY_PRESET_QR', 'Activated dynamic authentic CBE receipt QR code generation matching template (IMG_20260916_103244_278).');
  };

  const handleResetQrCode = () => {
    LocalDb.setCustomQrCode(null);
    setCustomQrCode(null);
    LocalDb.addAuditLog(currentUser.id, currentUser.email, 'RESET_CUSTOM_QR', 'Reset receipt QR code to auto-generated dynamic CBE QR code.');
  };

  // Metrics
  const totalVolume = transactions
    .filter(t => t.status === 'success')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalFees = transactions
    .filter(t => t.status === 'success')
    .reduce((sum, t) => sum + t.fee, 0);

  const activeUsersCount = users.filter(u => u.status === 'active').length;
  const suspendedUsersCount = users.filter(u => u.status === 'suspended').length;

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phone.includes(userSearch) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.accountNumber.includes(userSearch)
    );
  }, [users, userSearch]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => 
      t.recipientName.toLowerCase().includes(txSearch.toLowerCase()) ||
      t.reference.toLowerCase().includes(txSearch.toLowerCase()) ||
      t.id.toLowerCase().includes(txSearch.toLowerCase()) ||
      (t.senderName && t.senderName.toLowerCase().includes(txSearch.toLowerCase()))
    );
  }, [transactions, txSearch]);

  return (
    <div 
      id="admin-panel-container" 
      className="w-full min-h-screen px-3 py-4 sm:p-5 md:p-6 bg-slate-900 text-slate-100 pb-24 overflow-x-hidden min-w-0 box-border"
    >
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4 sm:pb-6 sm:mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px] uppercase tracking-wider font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">Root Administrator Node</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black mt-0.5 tracking-tight text-white truncate">
            Tana Admin Dashboard
          </h1>
          <p className="text-slate-400 text-xs mt-0.5 leading-tight line-clamp-2">
            Control simulation ledger state, user accounts, &amp; security policies.
          </p>
        </div>

        <button 
          id="btn-back-admin"
          onClick={onBack}
          className="flex items-center justify-center gap-2 w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl transition border border-slate-700 text-xs sm:text-sm font-semibold shrink-0 cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Admin Mode</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-5 sm:mb-7">
        <div className="bg-slate-800/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 min-w-0 flex flex-col justify-between overflow-hidden shadow-xs">
          <div className="flex justify-between items-center gap-1">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-500/10 shrink-0">
              Active
            </span>
          </div>
          <p className="text-slate-400 text-[10px] sm:text-xs mt-2 font-semibold uppercase tracking-wider truncate">
            Total Users
          </p>
          <h2 className="text-base sm:text-xl md:text-2xl font-black mt-0.5 font-mono text-white truncate">
            {users.length} <span className="text-[10px] sm:text-xs text-slate-400 font-normal">({activeUsersCount} Live)</span>
          </h2>
        </div>

        <div className="bg-slate-800/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 min-w-0 flex flex-col justify-between overflow-hidden shadow-xs">
          <div className="flex justify-between items-center gap-1">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-mono bg-amber-500/10 text-amber-400 px-1.5 sm:px-2 py-0.5 rounded-full border border-amber-500/10 shrink-0">
              Volume
            </span>
          </div>
          <p className="text-slate-400 text-[10px] sm:text-xs mt-2 font-semibold uppercase tracking-wider truncate">
            Tx Volume
          </p>
          <h2 className="text-base sm:text-xl md:text-2xl font-black mt-0.5 font-mono text-white truncate" title={`ETB ${totalVolume.toLocaleString()}`}>
            ETB {totalVolume >= 1000000 ? `${(totalVolume / 1000000).toFixed(1)}M` : totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </h2>
        </div>

        <div className="bg-slate-800/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 min-w-0 flex flex-col justify-between overflow-hidden shadow-xs">
          <div className="flex justify-between items-center gap-1">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-mono bg-blue-500/10 text-blue-400 px-1.5 sm:px-2 py-0.5 rounded-full border border-blue-500/10 shrink-0">
              Collected
            </span>
          </div>
          <p className="text-slate-400 text-[10px] sm:text-xs mt-2 font-semibold uppercase tracking-wider truncate">
            Simulated Fees
          </p>
          <h2 className="text-base sm:text-xl md:text-2xl font-black mt-0.5 font-mono text-white truncate">
            ETB {totalFees.toFixed(2)}
          </h2>
        </div>

        <div className="bg-slate-800/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 min-w-0 flex flex-col justify-between overflow-hidden shadow-xs">
          <div className="flex justify-between items-center gap-1">
            <AlertOctagon className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 shrink-0" />
            <span className="text-[9px] sm:text-[10px] font-mono bg-rose-500/10 text-rose-400 px-1.5 sm:px-2 py-0.5 rounded-full border border-rose-500/10 shrink-0">
              Alerts
            </span>
          </div>
          <p className="text-slate-400 text-[10px] sm:text-xs mt-2 font-semibold uppercase tracking-wider truncate">
            Suspended
          </p>
          <h2 className="text-base sm:text-xl md:text-2xl font-black mt-0.5 font-mono text-white truncate">
            {suspendedUsersCount} <span className="text-[10px] sm:text-xs text-rose-400 font-normal">Flagged</span>
          </h2>
        </div>
      </div>

      {/* Contained Horizontal Scroll Tabs Bar */}
      <div className="w-full max-w-full overflow-x-auto scrollbar-none mb-5 sm:mb-6 border-b border-slate-800 pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
        <div className="flex gap-1.5 min-w-max">
          {[
            { id: 'users', label: 'Users', icon: Users },
            { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
            { id: 'audit', label: 'Audit Logs', icon: Database },
            { id: 'reports', label: 'System Health', icon: Activity },
            { id: 'feedback_settings', label: 'Receipt Assets', icon: ImageIcon },
            { id: 'ethiopian_names', label: 'Ethiopian Names', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-admin-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition whitespace-nowrap cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 shadow-md'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'users' && (
        <div className="space-y-4 sm:space-y-6 w-full max-w-full">
          {/* Search bar */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input 
              id="input-search-users"
              type="text"
              placeholder="Search by name, phone, account or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-3 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
            />
          </div>

          {/* Mobile User Cards (Fit phone screen without side scrolling) */}
          <div className="space-y-3 block md:hidden">
            {filteredUsers.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-800/30 rounded-2xl border border-slate-800">
                No users found matching "{userSearch}"
              </div>
            ) : (
              filteredUsers.map(u => (
                <div key={u.id} className="bg-slate-800/50 border border-slate-700/70 p-3.5 rounded-2xl space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm truncate">{u.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono truncate">{u.email}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{u.phone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[9px] font-mono font-semibold uppercase bg-slate-700 px-2 py-0.5 rounded text-slate-200">
                        {u.role}
                      </span>
                      <span className={`text-[9px] font-mono font-semibold uppercase px-2 py-0.5 rounded ${
                        u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {u.status}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/90 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-mono">A/C Number</p>
                      <p className="font-mono text-xs text-slate-200 font-bold">{u.accountNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-mono">Balance</p>
                      <p className="font-mono text-xs sm:text-sm font-bold text-amber-300">
                        ETB {u.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <button
                    id={`btn-edit-user-m-${u.id}`}
                    onClick={() => {
                      setEditingUser(u);
                      setNewBalance(u.balance.toString());
                      setNewStatus(u.status);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-slate-700/80 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold transition border border-slate-600/60 cursor-pointer active:scale-98"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Adjust Balance &amp; Status</span>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Desktop Users Table */}
          <div className="hidden md:block bg-slate-800/30 rounded-2xl border border-slate-800 overflow-hidden w-full max-w-full">
            <div className="overflow-x-auto w-full max-w-full">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-mono">
                  <tr>
                    <th className="px-6 py-4">User Details</th>
                    <th className="px-6 py-4">Account Number</th>
                    <th className="px-6 py-4 text-right">Balance</th>
                    <th className="px-6 py-4">Role / Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-800/20 transition">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-white text-base">{u.name}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{u.email}</p>
                          <p className="text-xs text-slate-500 font-mono">{u.phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{u.accountNumber}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-amber-300">
                        ETB {u.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-[10px] font-mono font-semibold uppercase bg-slate-700 px-2 py-0.5 rounded text-slate-200">
                            {u.role}
                          </span>
                          <span className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded ${
                            u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {u.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          id={`btn-edit-user-${u.id}`}
                          onClick={() => {
                            setEditingUser(u);
                            setNewBalance(u.balance.toString());
                            setNewStatus(u.status);
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 p-2 rounded-lg border border-slate-700 transition cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-4 sm:space-y-6 w-full max-w-full">
          {/* Search bar */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input 
              id="input-search-txs"
              type="text"
              placeholder="Search by sender, recipient, reference, ID..."
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-3 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
            />
          </div>

          {/* Mobile Transaction Cards (Fit phone screen without side scrolling) */}
          <div className="space-y-3 block md:hidden">
            {filteredTransactions.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-800/30 rounded-2xl border border-slate-800">
                No transactions found matching "{txSearch}"
              </div>
            ) : (
              filteredTransactions.map(t => (
                <div key={t.id} className="bg-slate-800/50 border border-slate-700/70 p-3.5 rounded-2xl space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-xs font-mono truncate">{t.id}</span>
                        <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                          t.type === 'receive' ? 'bg-emerald-500/10 text-emerald-400' :
                          t.type === 'send' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                        }`}>
                          {t.type}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <button 
                      id={`btn-toggle-status-m-${t.id}`}
                      onClick={() => handleToggleTxStatus(t.id, t.status)}
                      className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold uppercase transition flex items-center gap-1 border shrink-0 cursor-pointer active:scale-95 ${
                        t.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        t.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {t.status === 'success' && <CheckCircle className="w-3 h-3" />}
                      {t.status === 'failed' && <Ban className="w-3 h-3" />}
                      <span>{t.status}</span>
                    </button>
                  </div>

                  <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80 text-xs space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>From: <strong className="text-slate-200">{t.senderName || 'Self'}</strong></span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span className="truncate">To: <strong className="text-slate-200">{t.recipientName}</strong></span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">
                      A/C: {t.recipientAccount} ({t.recipientBank})
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-mono">Ref: {t.reference}</p>
                      <p className="text-[10px] text-slate-500 font-mono">Fee: ETB {t.fee.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm sm:text-base font-bold text-white">
                        ETB {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Transactions Table */}
          <div className="hidden md:block bg-slate-800/30 rounded-2xl border border-slate-800 overflow-hidden w-full max-w-full">
            <div className="overflow-x-auto w-full max-w-full">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-mono">
                  <tr>
                    <th className="px-6 py-4">Transaction ID / Date</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Participants</th>
                    <th className="px-6 py-4 text-right">Amount / Fee</th>
                    <th className="px-6 py-4 text-center">Status (Click to toggle)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-800/20 transition">
                      <td className="px-6 py-4 font-mono text-xs">
                        <p className="font-bold text-white">{t.id}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{new Date(t.createdAt).toLocaleString()}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">Ref: {t.reference}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                          t.type === 'receive' ? 'bg-emerald-500/10 text-emerald-400' :
                          t.type === 'send' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div>
                          <p className="text-slate-400">From: <span className="font-bold text-slate-200">{t.senderName || 'Self'}</span></p>
                          <p className="text-slate-400 mt-0.5">To: <span className="font-bold text-slate-200">{t.recipientName}</span></p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">A/C: {t.recipientAccount} ({t.recipientBank})</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        <p className="font-bold text-white">ETB {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-slate-400">Fee: ETB {t.fee.toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          id={`btn-toggle-status-${t.id}`}
                          onClick={() => handleToggleTxStatus(t.id, t.status)}
                          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold uppercase transition flex items-center gap-1.5 mx-auto border cursor-pointer active:scale-95 ${
                            t.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            t.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {t.status === 'success' && <CheckCircle className="w-3.5 h-3.5" />}
                          {t.status === 'failed' && <Ban className="w-3.5 h-3.5" />}
                          <span>{t.status}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-amber-400" />
              <div>
                <h3 className="font-bold text-white text-base">Ledger Audit Chain</h3>
                <p className="text-slate-400 text-xs">Simulated, cryptographically-tied actions logged live</p>
              </div>
            </div>
            <span className="text-xs font-mono bg-slate-700/80 px-3 py-1 rounded text-slate-300">{auditLogs.length} Records</span>
          </div>

          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="bg-slate-800/20 border border-slate-800/80 p-4 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold bg-amber-400/10 text-amber-300 px-2.5 py-0.5 rounded border border-amber-400/10">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-200 mt-1">{log.details}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-400 font-mono font-semibold">{log.userEmail}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {log.id}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 rounded-3xl border border-slate-800">
            <h3 className="text-lg font-black text-white mb-4">Simulated Ledger Integrity Check</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <span className="text-slate-400 text-sm">Active Simulated nodes</span>
                <span className="font-mono text-emerald-400 font-bold">1 Node Online (EU-West1 Cluster)</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <span className="text-slate-400 text-sm">Ledger Checksum</span>
                <span className="font-mono text-amber-300 font-bold">MATCHED (0x7FAD...89E2)</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <span className="text-slate-400 text-sm">System Latency</span>
                <span className="font-mono text-emerald-400 font-bold">12ms (Secure Tunnel)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Legitimate API Proxy State</span>
                <span className="font-mono text-blue-400 font-bold">Simulated Sandbox Active</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl flex gap-3.5">
            <AlertOctagon className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-400">On-Device Storage Notice</h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                This administration dashboard manages banking simulation data stored 100% locally on the device using LocalStorage and IndexedDB security vaults.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'feedback_settings' && (
        <div className="space-y-6">
          <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-800/80 space-y-2">
            <h3 className="text-xl font-black text-white">Feedback Screen Custom Assets</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Customize the look of the transaction success/feedback screen. You can upload any standard image file (JPEG, PNG, SVG) up to 2MB. These changes will instantly update the feedback presentation for the simulation.
            </p>
          </div>

          <div className="space-y-6">
            {/* 1. Bank Logo Customizer */}
            <div className="bg-slate-800/30 border border-slate-800 p-6 rounded-3xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-400/10 text-amber-400 rounded-xl">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Custom Bank Logo</h4>
                    <p className="text-slate-400 text-xs">Replaces the default CBE logo in the receipt feedback</p>
                  </div>
                </div>

                <button
                  id="btn-open-logo-modal"
                  type="button"
                  onClick={() => setShowLogoModal(true)}
                  className="flex items-center gap-2 self-start sm:self-center px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Presets &amp; Advanced Logo Manager</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Upload Field */}
                <div className="space-y-2">
                  <label className="block text-xs font-mono uppercase text-slate-400 font-bold">Upload Custom Logo</label>
                  <div className="relative border-2 border-dashed border-slate-700 hover:border-amber-400/50 rounded-2xl p-4 transition flex flex-col items-center justify-center text-center cursor-pointer bg-slate-950/40">
                    <input 
                      id="input-bank-logo-upload"
                      type="file" 
                      accept="image/*" 
                      onChange={handleBankLogoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="w-8 h-8 text-slate-500 mb-2" />
                    <p className="text-xs text-slate-300 font-semibold">Click to browse or drag image here</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">PNG, JPG, SVG up to 2MB</p>
                  </div>
                </div>

                {/* Preview & Actions */}
                <div className="space-y-3 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-mono uppercase text-slate-400 font-bold mb-2">Logo Preview</p>
                    <div className="flex items-center gap-4 bg-slate-950/30 p-3 rounded-2xl border border-slate-800">
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-md p-1.5 border border-[#dfa04c]/30 flex-shrink-0 overflow-hidden">
                        <CbeLogo 
                          src={customBankLogo} 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">
                          {customBankLogo && customBankLogo !== '/custom-bank-logo.png' ? 'Custom Uploaded Logo' : 'Uploaded Bank Logo (PNG)'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {customBankLogo && customBankLogo !== '/custom-bank-logo.png' ? 'Active custom PNG/HTTPS branding' : 'Active: /custom-bank-logo.png'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {customBankLogo && customBankLogo !== '/custom-bank-logo.png' && (
                    <button
                      id="btn-reset-bank-logo"
                      type="button"
                      onClick={handleResetBankLogo}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-slate-700 bg-slate-850 hover:bg-slate-750 text-xs font-bold text-slate-300 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reset to Uploaded PNG Logo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Stamp and Sample QR Code Uploaders Side-by-Side ("beside stamps uploader") */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
              {/* 2. Custom Bank Stamp Uploader */}
              <div className="bg-slate-800/30 border border-slate-800 p-6 rounded-3xl space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl">
                        <Stamp className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base">Custom Bank Stamp</h4>
                        <p className="text-slate-400 text-xs">Official circular rubber stamp for CBE Web Receipt</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        customBankStamp 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {customBankStamp ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Uploaded Stamp Active</span>
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span>No Stamp Active</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Policy Banner */}
                  <div className="bg-purple-950/30 border border-purple-800/40 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-purple-200 mb-5">
                    <Stamp className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="text-purple-300">Web Receipt:</strong> Displays <span className="underline decoration-purple-400 font-bold">only uploaded stamps</span>. Web receipts display without stamp if none is uploaded.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Upload Field */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-mono uppercase text-slate-400 font-bold">Upload Stamp Image</label>
                      <div className="relative border-2 border-dashed border-slate-700 hover:border-purple-400/50 rounded-2xl p-3.5 transition flex flex-col items-center justify-center text-center cursor-pointer bg-slate-950/40">
                        <input 
                          id="input-bank-stamp-upload"
                          type="file" 
                          accept="image/*" 
                          onChange={handleBankStampUpload}
                          disabled={stampProcessing}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        {stampProcessing ? (
                          <div className="flex flex-col items-center py-2">
                            <Loader2 className="w-6 h-6 text-purple-400 animate-spin mb-1" />
                            <p className="text-xs text-purple-300 font-semibold">Processing Stamp...</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-purple-400/70 mb-1.5" />
                            <p className="text-xs text-slate-300 font-semibold">Click to browse or drag stamp image</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">PNG (transparent) or JPG up to 2MB</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Or Enter Stamp URL */}
                    <form onSubmit={handleApplyStampUrl} className="space-y-1.5">
                      <label className="block text-[11px] font-mono uppercase text-slate-400 font-bold">Or Enter Stamp Image URL</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <LinkIcon className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                          <input
                            id="input-bank-stamp-url"
                            type="url"
                            placeholder="https://.../cbe-stamp.png"
                            value={stampUrlInput}
                            onChange={(e) => setStampUrlInput(e.target.value)}
                            className="w-full bg-slate-950/40 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-400"
                          />
                        </div>
                        <button
                          id="btn-apply-stamp-url"
                          type="submit"
                          disabled={!stampUrlInput.trim()}
                          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                    </form>

                    {/* Stamp Preview */}
                    <div className="pt-1">
                      <p className="text-xs font-mono uppercase text-slate-400 font-bold mb-2">Web Receipt Stamp Preview</p>
                      <div className="flex items-center gap-3.5 bg-slate-950/40 p-3 rounded-2xl border border-slate-800">
                        <div className="w-18 h-18 rounded-2xl bg-white flex items-center justify-center shadow-inner border border-slate-200 flex-shrink-0 overflow-hidden relative">
                          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:6px_6px]" />
                          {customBankStamp ? (
                            <img 
                              src={customBankStamp} 
                              alt="Custom CBE Stamp Preview" 
                              className="w-full h-full object-contain pointer-events-none select-none relative z-10 p-1"
                              style={{
                                mixBlendMode: 'multiply',
                                filter: 'contrast(1.15)',
                                transform: 'rotate(-13deg)'
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                              <Stamp className="w-5 h-5 stroke-1 text-slate-300 mb-0.5" />
                              <span className="text-[9px] font-bold text-slate-400">No Stamp</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-xs truncate">
                            {customBankStamp ? 'Custom Uploaded Stamp' : 'No Stamp Uploaded'}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                            {customBankStamp 
                              ? 'Actively stamped on CBE Web Receipts.' 
                              : 'Web receipt will render cleanly with NO stamp.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stamp Actions */}
                <div className="pt-4 space-y-2">
                  {customBankStamp ? (
                    <button
                      id="btn-reset-bank-stamp"
                      type="button"
                      onClick={handleResetBankStamp}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-rose-900/50 bg-rose-950/30 hover:bg-rose-900/40 text-xs font-bold text-rose-300 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
                      <span>Remove Uploaded Stamp (Clear Receipt Stamp)</span>
                    </button>
                  ) : (
                    <button
                      id="btn-apply-cbe-stamp-preset"
                      type="button"
                      onClick={handleApplyStampPreset}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-purple-800/60 bg-purple-950/40 hover:bg-purple-900/40 text-xs font-bold text-purple-300 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Apply Authentic CBE Purple Stamp Template</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Custom Sample QR Code Uploader (Beside stamps uploader) */}
              <div className="bg-slate-800/30 border border-slate-800 p-6 rounded-3xl space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base">Sample QR Code</h4>
                        <p className="text-slate-400 text-xs">Official transaction QR code template &amp; custom sample uploader</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        customQrCode 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {customQrCode ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Static Override Active</span>
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Dynamic QR Active (Different per Tx)</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* QR Policy Banner */}
                  <div className="bg-blue-950/30 border border-blue-800/40 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-blue-200 mb-5">
                    <QrCode className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="text-blue-300">Authentic Dynamic Generation:</strong> According to the uploaded QR code standard (IMG_20260916_103244_278.png), every transaction generates its own unique 29x29 Version 3 QR code with rounded grey border (#737373) and official payload (<code className="text-blue-300 bg-blue-950/80 px-1 py-0.5 rounded">https://apps.cbe.com.et/v/&#123;txId&#125;</code>).
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Live Tester for Different Transactions */}
                    <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-mono uppercase text-blue-400 font-bold">
                          Test QR Code For Different Transactions
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">Version 3 (29x29)</span>
                      </div>

                      {/* Quick Transaction Chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: 'FT263211VK07', label: 'Sample Ref (FT263211VK07)' },
                          { id: 'FT262451AA99', label: 'Tx 1 (FT262451AA99)' },
                          { id: 'FT262438BB88', label: 'Tx 2 (FT262438BB88)' },
                          { id: 'FT262331BC12', label: 'Tx 3 (FT262331BC12)' }
                        ].map(tx => (
                          <button
                            key={tx.id}
                            type="button"
                            onClick={() => setTestTxId(tx.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                              testTxId === tx.id 
                                ? 'bg-blue-600 text-white font-bold shadow-xs' 
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {tx.label}
                          </button>
                        ))}
                      </div>

                      {/* Custom Tx ID Input */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={testTxId}
                            onChange={(e) => setTestTxId(e.target.value.trim().toUpperCase())}
                            placeholder="Enter Transaction ID (e.g. FT263211VK07)"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-400"
                          />
                        </div>
                      </div>

                      {/* Live QR Display */}
                      <div className="flex items-center gap-3.5 bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
                        <div className="w-20 h-20 rounded-[18px] bg-white p-2 border-[2.5px] border-[#737373] flex items-center justify-center shadow-xs flex-shrink-0 overflow-hidden">
                          <img 
                            src={customQrCode || testTxQr} 
                            alt={`Preview QR for ${testTxId}`} 
                            className="w-full h-full object-contain pointer-events-none select-none block"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs font-mono truncate">
                              {testTxId}
                            </span>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                              {customQrCode ? 'Static Custom' : 'Unique QR'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono break-all leading-tight">
                            https://apps.cbe.com.et/v/{formatTo12CharTxId(testTxId)}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">
                            {customQrCode 
                              ? '⚠️ Overridden by static custom upload.' 
                              : 'Each transaction automatically generates its own distinct QR pattern.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Upload QR Image */}
                    <div className="space-y-1.5 pt-2">
                      <label className="block text-xs font-mono uppercase text-slate-400 font-bold">Upload Custom QR Code (Optional Override)</label>
                      <div className="relative border-2 border-dashed border-slate-700 hover:border-blue-400/50 rounded-2xl p-3.5 transition flex flex-col items-center justify-center text-center cursor-pointer bg-slate-950/40">
                        <input 
                          id="input-qr-code-upload"
                          type="file" 
                          accept="image/*" 
                          onChange={handleQrUpload}
                          disabled={qrProcessing}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        {qrProcessing ? (
                          <div className="flex flex-col items-center py-2">
                            <Loader2 className="w-6 h-6 text-blue-400 animate-spin mb-1" />
                            <p className="text-xs text-blue-300 font-semibold">Processing QR Code...</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-blue-400/70 mb-1.5" />
                            <p className="text-xs text-slate-300 font-semibold">Click to browse or drag QR code here</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">PNG, JPG, SVG, WebP up to 5MB</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Or Enter QR Image URL */}
                    <form onSubmit={handleApplyQrUrl} className="space-y-1.5">
                      <label className="block text-[11px] font-mono uppercase text-slate-400 font-bold">Or Enter QR Image URL</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <LinkIcon className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                          <input
                            id="input-qr-code-url"
                            type="url"
                            placeholder="https://.../sample-qr.png"
                            value={qrUrlInput}
                            onChange={(e) => setQrUrlInput(e.target.value)}
                            className="w-full bg-slate-950/40 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-400"
                          />
                        </div>
                        <button
                          id="btn-apply-qr-url"
                          type="submit"
                          disabled={!qrUrlInput.trim()}
                          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* QR Actions */}
                <div className="pt-4 space-y-2">
                  <button
                    id="btn-apply-cbe-qr-preset"
                    type="button"
                    onClick={handleApplyQrPreset}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-blue-800/60 bg-blue-950/40 hover:bg-blue-900/40 text-xs font-bold text-blue-300 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Apply Dynamic QR Generation For All Transactions</span>
                  </button>

                  {customQrCode && (
                    <button
                      id="btn-reset-qr-code"
                      type="button"
                      onClick={handleResetQrCode}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-900/50 bg-rose-950/30 hover:bg-rose-900/40 text-xs font-bold text-rose-300 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
                      <span>Reset to Dynamic Unique CBE QR Code (Remove Static Override)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ethiopian_names' && (
        <div className="pt-2">
          <AdminEthiopianNames />
        </div>
      )}

      {/* Editing User Modal Drawer */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 max-w-md w-full rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-white mb-2">Adjust User Profile</h3>
            <p className="text-slate-400 text-xs mb-5">Modifying parameters for {editingUser.name}.</p>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5 font-bold">Adjust Simulated Balance (ETB)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400/50 text-sm font-mono"
                  placeholder="Enter balance value..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5 font-bold">Account Access Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStatus('active')}
                    className={`py-2 rounded-xl border text-sm font-bold transition ${
                      newStatus === 'active' 
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus('suspended')}
                    className={`py-2 rounded-xl border text-sm font-bold transition ${
                      newStatus === 'suspended' 
                        ? 'bg-rose-500/10 border-rose-500 text-rose-400' 
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    Suspended
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 bg-slate-700 text-slate-200 hover:bg-slate-600 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-400 text-emerald-950 hover:bg-amber-300 rounded-xl text-xs font-bold transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bank Logo Modal */}
      <BankLogoModal 
        isOpen={showLogoModal}
        onClose={() => setShowLogoModal(false)}
        currentUser={currentUser}
        onLogoUpdated={(logo) => setCustomBankLogo(logo)}
      />
    </div>
  );
}

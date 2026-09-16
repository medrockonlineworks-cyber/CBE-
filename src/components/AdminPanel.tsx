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
      LocalDb.addAuditLog(currentUser.id, currentUser.email, 'UPLOAD_BANK_LOGO', 'Uploaded a custom bank logo image for receipts and feedback.');
    } catch (err) {
      console.error('Failed to compress bank logo:', err);
      alert('Failed to process image. Please try another image file.');
    }
  };

  const handleResetBankLogo = () => {
    LocalDb.setCustomBankLogo(null);
    setCustomBankLogo(null);
    LocalDb.addAuditLog(currentUser.id, currentUser.email, 'RESET_BANK_LOGO', 'Reset the bank logo to the official Commercial Bank of Ethiopia (CBE) SVG logo.');
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

  return (
    <div id="admin-panel-container" className="max-w-6xl mx-auto p-4 md:p-6 bg-slate-900 text-slate-100 min-h-screen pb-24 rounded-3xl shadow-2xl border border-slate-800">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase tracking-widest font-semibold">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <span>Root Administrator Security Node</span>
          </div>
          <h1 className="text-3xl font-black mt-1 tracking-tight text-white">Tana Admin Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Control simulation ledger state, user accounts, &amp; security policies.</p>
        </div>

        <button 
          id="btn-back-admin"
          onClick={onBack}
          className="flex items-center gap-2 self-start md:self-center bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl transition border border-slate-700 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Admin Mode</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex justify-between items-start">
            <Users className="w-5 h-5 text-emerald-400" />
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/10">Active</span>
          </div>
          <p className="text-slate-400 text-xs mt-3 font-semibold uppercase tracking-wider">Total Users</p>
          <h2 className="text-2xl font-black mt-1 font-mono text-white">{users.length} <span className="text-xs text-slate-400 font-normal">({activeUsersCount} Live)</span></h2>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex justify-between items-start">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/10">Volume</span>
          </div>
          <p className="text-slate-400 text-xs mt-3 font-semibold uppercase tracking-wider">Tx Volume</p>
          <h2 className="text-2xl font-black mt-1 font-mono text-white">ETB {totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex justify-between items-start">
            <Activity className="w-5 h-5 text-blue-400" />
            <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/10">Collected</span>
          </div>
          <p className="text-slate-400 text-xs mt-3 font-semibold uppercase tracking-wider">Simulated Fees</p>
          <h2 className="text-2xl font-black mt-1 font-mono text-white">ETB {totalFees.toFixed(2)}</h2>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex justify-between items-start">
            <AlertOctagon className="w-5 h-5 text-rose-500" />
            <span className="text-[10px] font-mono bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/10">Alerts</span>
          </div>
          <p className="text-slate-400 text-xs mt-3 font-semibold uppercase tracking-wider">Suspended Users</p>
          <h2 className="text-2xl font-black mt-1 font-mono text-white">{suspendedUsersCount} <span className="text-xs text-rose-400 font-normal">Flagged</span></h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-1 overflow-x-auto mb-6">
        <button 
          id="tab-admin-users"
          onClick={() => setActiveTab('users')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'users' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          User Management
        </button>
        <button 
          id="tab-admin-txs"
          onClick={() => setActiveTab('transactions')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'transactions' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Transaction Monitoring
        </button>
        <button 
          id="tab-admin-audit"
          onClick={() => setActiveTab('audit')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'audit' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Security Audit Logs
        </button>
        <button 
          id="tab-admin-reports"
          onClick={() => setActiveTab('reports')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'reports' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          System Health Reports
        </button>
        <button 
          id="tab-admin-feedback"
          onClick={() => setActiveTab('feedback_settings')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'feedback_settings' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Receipt Assets (Logo, Stamp &amp; QR)
        </button>
        <button 
          id="tab-admin-ethiopian-names"
          onClick={() => setActiveTab('ethiopian_names')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'ethiopian_names' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Ethiopian Names Database</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
            <input 
              id="input-search-users"
              type="text"
              placeholder="Search by name, phone, account or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl pl-12 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
            />
          </div>

          {/* Users Table */}
          <div className="bg-slate-800/30 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
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
                  {users
                    .filter(u => 
                      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.phone.includes(userSearch) ||
                      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.accountNumber.includes(userSearch)
                    )
                    .map(u => (
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
                            className="bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 p-2 rounded-lg border border-slate-700 transition"
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
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
            <input 
              id="input-search-txs"
              type="text"
              placeholder="Search by sender, recipient, reference, ID..."
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl pl-12 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
            />
          </div>

          <div className="bg-slate-800/30 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
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
                  {transactions
                    .filter(t => 
                      t.recipientName.toLowerCase().includes(txSearch.toLowerCase()) ||
                      t.reference.toLowerCase().includes(txSearch.toLowerCase()) ||
                      t.id.toLowerCase().includes(txSearch.toLowerCase()) ||
                      (t.senderName && t.senderName.toLowerCase().includes(txSearch.toLowerCase()))
                    )
                    .map(t => (
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
                            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold uppercase transition flex items-center gap-1.5 mx-auto border ${
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
              <h4 className="text-sm font-bold text-amber-400">Production Reminder</h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                This administration dashboard manages standard simulation fields stored locally. If real Firebase products are active, modify permissions in <code className="bg-slate-900 text-amber-300 px-1 py-0.5 rounded font-mono">firestore.rules</code> and deploy them to secure the database.
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
                          {customBankLogo ? 'Custom Uploaded Logo' : 'Official CBE Logo (Default)'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {customBankLogo ? 'Stored as persistent base64 data' : 'Standard SVG vector path asset'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {customBankLogo && (
                    <button
                      id="btn-reset-bank-logo"
                      type="button"
                      onClick={handleResetBankLogo}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-slate-700 bg-slate-850 hover:bg-slate-750 text-xs font-bold text-slate-300 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reset to Default CBE Logo</span>
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

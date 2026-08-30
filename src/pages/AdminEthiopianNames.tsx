import React, { useState, useEffect, useRef } from 'react';
import { ethiopianNameService } from '../services/ethiopianNameService';
import { 
  EthiopianName, 
  EthiopianNameGender, 
  EthiopianNameType, 
  EthiopianNameImportResult 
} from '../types/ethiopianName';
import { isSupabaseConfigured } from '../lib/supabase';
import { isValidEthiopianNameString } from '../utils/normalizeName';
import EthiopianNameAutocomplete from '../components/EthiopianNameAutocomplete/EthiopianNameAutocomplete';
import { 
  Search, 
  Plus, 
  Upload, 
  Download, 
  RefreshCw, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Flame, 
  Database, 
  Sparkles, 
  AlertCircle,
  FileText,
  HelpCircle,
  PlayCircle,
  Zap,
  ArrowLeft
} from 'lucide-react';

interface AdminEthiopianNamesProps {
  onBack?: () => void;
}

export default function AdminEthiopianNames({ onBack }: AdminEthiopianNamesProps) {
  const [names, setNames] = useState<EthiopianName[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<EthiopianNameGender | 'all'>('all');
  const [nameTypeFilter, setNameTypeFilter] = useState<EthiopianNameType | 'all'>('all');
  const [activeFilter, setActiveFilter] = useState<boolean | 'all'>('all');
  const [sortBy, setSortBy] = useState<'popularity' | 'name_asc' | 'name_desc' | 'recently_added'>('popularity');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedName, setSelectedName] = useState<EthiopianName | null>(null);

  // Add / Edit Form State
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState<EthiopianNameGender>('male');
  const [formType, setFormType] = useState<EthiopianNameType>('first_name');
  const [formCategory, setFormCategory] = useState('Traditional');
  const [formUsageCount, setFormUsageCount] = useState('100');
  const [formError, setFormError] = useState('');

  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<EthiopianNameImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Test Sandbox State
  const [testQuery, setTestQuery] = useState('');
  const [testSelected, setTestSelected] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await ethiopianNameService.getAllEthiopianNames({
        search: searchQuery,
        gender: genderFilter,
        nameType: nameTypeFilter,
        isActive: activeFilter,
        sortBy,
        limit: 250
      });
      setNames(res.names);
      setTotalCount(res.total);
    } catch (err) {
      console.error('Failed to load Ethiopian names:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, genderFilter, nameTypeFilter, activeFilter, sortBy]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormName('');
    setFormGender('male');
    setFormType('first_name');
    setFormCategory('Traditional');
    setFormUsageCount('100');
    setFormError('');
    setShowAddModal(true);
  };

  // Submit Add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!isValidEthiopianNameString(formName)) {
      setFormError('Invalid name. Only English/Latin letters, spaces, and hyphens are allowed.');
      return;
    }

    try {
      await ethiopianNameService.createEthiopianName({
        name: formName,
        gender: formGender,
        name_type: formType,
        category: formCategory,
        usage_count: parseInt(formUsageCount, 10) || 0
      });
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to add Ethiopian name.');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: EthiopianName) => {
    setSelectedName(item);
    setFormName(item.name);
    setFormGender(item.gender || 'unisex');
    setFormType(item.name_type || 'first_name');
    setFormCategory(item.category || 'Traditional');
    setFormUsageCount(item.usage_count.toString());
    setFormError('');
    setShowEditModal(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedName) return;
    setFormError('');

    if (!isValidEthiopianNameString(formName)) {
      setFormError('Invalid name format.');
      return;
    }

    try {
      await ethiopianNameService.updateEthiopianName(selectedName.id, {
        name: formName,
        gender: formGender,
        name_type: formType,
        category: formCategory,
        usage_count: parseInt(formUsageCount, 10) || 0
      });
      setShowEditModal(false);
      setSelectedName(null);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update Ethiopian name.');
    }
  };

  // Toggle Active Status
  const handleToggleStatus = async (item: EthiopianName) => {
    await ethiopianNameService.updateEthiopianName(item.id, {
      is_active: !item.is_active
    });
    loadData();
  };

  // Delete
  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from the Ethiopian names database?`)) {
      await ethiopianNameService.deleteEthiopianName(id);
      loadData();
    }
  };

  // Increment Usage Count manually
  const handleIncrementUsage = async (id: string) => {
    await ethiopianNameService.incrementNameUsage(id);
    loadData();
  };

  // CSV Import handler
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content || '');
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!csvText.trim()) return;
    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await ethiopianNameService.importEthiopianNamesCsv(csvText);
      setImportResult(result);
      loadData();
    } catch (err: any) {
      setImportResult({
        total: 0,
        imported: 0,
        duplicates: 0,
        failed: 1,
        errors: [err.message || 'Import failed']
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    const csvData = await ethiopianNameService.exportEthiopianNamesCsv();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ethiopian_names_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset to default seed
  const handleResetDatabase = async () => {
    if (window.confirm('Reset database to curated 200+ verified Ethiopian names? Custom names not exported will be replaced.')) {
      await ethiopianNameService.resetToCuratedEthiopianDatabase();
      loadData();
    }
  };

  // Metrics
  const maleCount = names.filter(n => n.gender === 'male').length;
  const femaleCount = names.filter(n => n.gender === 'female').length;
  const unisexCount = names.filter(n => n.gender === 'unisex' || !n.gender).length;
  const totalVolumeUsage = names.reduce((sum, n) => sum + (n.usage_count || 0), 0);

  return (
    <div id="admin-ethiopian-names-container" className="max-w-6xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase font-bold tracking-widest">
            <Database className="w-4 h-4 text-amber-400" />
            <span>Ethiopian Naming Intelligence &amp; Registry</span>
            {isSupabaseConfigured() ? (
              <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px] border border-emerald-500/30">
                Supabase Connected
              </span>
            ) : (
              <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-[10px] border border-purple-500/30">
                Client LocalDB Active
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1">
            Ethiopian Name Suggestion Database
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-0.5">
            Strict Latin/English script dictionary for instant banking name autocompletion &amp; verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onBack && (
            <button
              id="btn-back-names"
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
          <button
            id="btn-import-csv"
            onClick={() => {
              setCsvText('');
              setImportResult(null);
              setShowImportModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Import CSV</span>
          </button>
          <button
            id="btn-export-csv"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            id="btn-add-ethiopian-name"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 text-xs font-black rounded-xl shadow-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Name</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Total Curated Names</span>
          <p className="text-2xl font-black text-white font-mono mt-1">{totalCount}</p>
          <span className="text-[10px] text-emerald-400 font-mono">100% Latin-Script</span>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Male / Female / Unisex</span>
          <p className="text-2xl font-black text-amber-300 font-mono mt-1">
            {maleCount} <span className="text-xs text-slate-500 font-normal">/ {femaleCount} / {unisexCount}</span>
          </p>
          <span className="text-[10px] text-slate-400 font-mono">Categorized registry</span>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Total Usage Frequency</span>
          <p className="text-2xl font-black text-blue-400 font-mono mt-1">
            {totalVolumeUsage.toLocaleString()}
          </p>
          <span className="text-[10px] text-blue-300/80 font-mono">Weighted ranking</span>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Registry State</span>
            <p className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Ready for Banking
            </p>
          </div>
          <button
            id="btn-reset-curated"
            onClick={handleResetDatabase}
            className="text-[10px] text-slate-400 hover:text-amber-300 transition text-left underline font-mono mt-2"
          >
            Reset to default 200+ names
          </button>
        </div>
      </div>

      {/* Interactive Testing Sandbox */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-amber-950/30 border border-purple-900/40 rounded-3xl p-5 md:p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-black text-white">Live Autocomplete Testing Sandbox</h2>
          <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 font-semibold">
            250ms Debounced Engine
          </span>
        </div>
        <p className="text-xs text-slate-300 mb-4">
          Test typing an Ethiopian name below to see the prefix-first matching, ranking algorithm, and highlighted substrings in real-time.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div className="bg-white p-4 rounded-2xl shadow-inner">
            <EthiopianNameAutocomplete
              id="test-sandbox-autocomplete"
              label="Recipient Name Autocomplete"
              placeholder="Start typing e.g. 'A', 'Da', 'Te', 'Me', 'Ab'..."
              value={testQuery}
              onChange={setTestQuery}
              onSelect={(name, item) => {
                setTestSelected(`Selected: ${name} (ID: ${item?.id || 'manual'})`);
              }}
              theme="cbe"
            />
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2 font-mono text-xs text-slate-300">
            <div className="flex justify-between border-b border-slate-800 pb-1.5 text-slate-400">
              <span>Input Value:</span>
              <span className="text-amber-300 font-bold">&quot;{testQuery}&quot;</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1.5 text-slate-400">
              <span>Selection Feedback:</span>
              <span className="text-emerald-400 font-bold">{testSelected || 'Awaiting selection...'}</span>
            </div>
            <div className="text-[11px] text-slate-400 pt-1 leading-relaxed font-sans">
              Matches are ranked: Exact Match &gt; Starts With &gt; Word Starts With &gt; Contains &gt; Fuzzy. Users can type any custom name if not listed.
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              id="input-filter-search"
              type="text"
              placeholder="Search by Ethiopian name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Gender Filter */}
          <div>
            <select
              id="select-filter-gender"
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            >
              <option value="all">All Genders</option>
              <option value="male">Male (M)</option>
              <option value="female">Female (F)</option>
              <option value="unisex">Unisex (U)</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              id="select-filter-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-mono"
            >
              <option value="popularity">Sort: Most Popular</option>
              <option value="name_asc">Sort: A to Z</option>
              <option value="name_desc">Sort: Z to A</option>
              <option value="recently_added">Sort: Recently Added</option>
            </select>
          </div>
        </div>
      </div>

      {/* Database Names Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase text-slate-400 font-mono border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Ethiopian Name (Latin)</th>
                <th className="px-6 py-4">Gender</th>
                <th className="px-6 py-4">Type / Category</th>
                <th className="px-6 py-4 text-center">Usage Count</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {names.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-6 py-3.5">
                    <div>
                      <p className="font-bold text-white text-base">{item.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        normalized: {item.normalized_name}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                        item.gender === 'male'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : item.gender === 'female'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                      }`}
                    >
                      {item.gender || 'unisex'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="text-xs">
                      <span className="font-medium text-slate-300">{item.name_type}</span>
                      {item.category && (
                        <span className="text-[10px] text-slate-500 block font-mono">
                          {item.category}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <div className="inline-flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-mono font-bold text-xs text-amber-300">{item.usage_count}</span>
                      <button
                        onClick={() => handleIncrementUsage(item.id)}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded ml-1 transition"
                        title="Increment usage count"
                      >
                        +1
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <button
                      onClick={() => handleToggleStatus(item)}
                      className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase transition ${
                        item.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      {item.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700 transition"
                        title="Edit Name"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="p-1.5 bg-slate-800 hover:bg-rose-950 text-rose-400 rounded-lg border border-slate-700 hover:border-rose-800 transition"
                        title="Delete Name"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {names.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500 text-sm">
                    No Ethiopian names matched your query. Click &quot;Add Name&quot; to register new names.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Name Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white">Add Ethiopian Name</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block uppercase font-mono font-bold text-slate-400 mb-1">Name (Latin/English)</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Amanuel, Bethlehem, Kedir..."
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase font-mono font-bold text-slate-400 mb-1">Gender</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>

                <div>
                  <label className="block uppercase font-mono font-bold text-slate-400 mb-1">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="first_name">First Name</option>
                    <option value="patronymic">Patronymic (Father)</option>
                    <option value="both">Both / Versatile</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase font-mono font-bold text-slate-400 mb-1">Category</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Traditional, Oromo, Tigrayan, etc."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                  </input>
                </div>

                <div>
                  <label className="block uppercase font-mono font-bold text-slate-400 mb-1">Initial Usage Score</label>
                  <input
                    type="number"
                    value={formUsageCount}
                    onChange={(e) => setFormUsageCount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-emerald-950 rounded-xl font-black transition"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Name Modal */}
      {showEditModal && selectedName && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white">Edit Ethiopian Name</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-200">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block uppercase font-mono font-bold text-slate-400 mb-1">Name (Latin/English)</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase font-mono font-bold text-slate-400 mb-1">Gender</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>

                <div>
                  <label className="block uppercase font-mono font-bold text-slate-400 mb-1">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="first_name">First Name</option>
                    <option value="patronymic">Patronymic</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase font-mono font-bold text-slate-400 mb-1">Category</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block uppercase font-mono font-bold text-slate-400 mb-1">Usage Count</label>
                  <input
                    type="number"
                    value={formUsageCount}
                    onChange={(e) => setFormUsageCount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-emerald-950 rounded-xl font-black transition"
                >
                  Update Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 max-w-xl w-full rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-black text-white">Batch Import Ethiopian Names (CSV)</h3>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-200">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
              <span className="text-[11px] font-mono text-amber-400 font-bold uppercase">Expected CSV Format:</span>
              <p className="text-xs font-mono text-slate-300">
                name,gender,name_type,category<br />
                Abebe,male,first_name,Traditional<br />
                Meron,female,first_name,Christian<br />
                Abdisa,male,first_name,Oromo
              </p>
            </div>

            {/* File upload picker */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-amber-400/60 rounded-2xl flex flex-col items-center justify-center gap-1 text-slate-300 text-xs transition bg-slate-950/40"
              >
                <FileText className="w-6 h-6 text-amber-400" />
                <span className="font-semibold">Click to choose a CSV file or drag &amp; drop</span>
              </button>
            </div>

            {/* Textarea Paste */}
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1 font-bold uppercase">
                Or Paste Raw CSV Lines:
              </label>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="name,gender,name_type,category&#10;Tekle,male,first_name,Traditional&#10;Tsion,female,first_name,Christian"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Import Summary Result */}
            {importResult && (
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-300">Import Results:</span>
                  <span className="text-emerald-400 font-mono">{importResult.imported} Imported</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                  <div className="bg-emerald-500/10 text-emerald-300 p-1.5 rounded border border-emerald-500/20">
                    {importResult.imported} New Added
                  </div>
                  <div className="bg-amber-500/10 text-amber-300 p-1.5 rounded border border-amber-500/20">
                    {importResult.duplicates} Duplicates Skipped
                  </div>
                  <div className="bg-rose-500/10 text-rose-300 p-1.5 rounded border border-rose-500/20">
                    {importResult.failed} Invalid/Failed
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="max-h-24 overflow-y-auto text-[10px] text-rose-400 font-mono space-y-0.5 bg-rose-950/20 p-2 rounded">
                    {importResult.errors.slice(0, 5).map((err, i) => (
                      <p key={i}>• {err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting || !csvText.trim()}
                className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-emerald-950 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5"
              >
                {isImporting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Execute Import</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

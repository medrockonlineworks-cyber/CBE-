import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  RefreshCw, 
  Smartphone, 
  Laptop, 
  Code, 
  Trash2, 
  X,
  Radio,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building,
  Wallet,
  CreditCard,
  Sparkles,
  Sliders,
  ListFilter
} from 'lucide-react';
import { 
  SmsWebhookService, 
  DEFAULT_SMS_WEBHOOK_URL, 
  SMS_WEBHOOK_PRESETS 
} from '../lib/smsWebhookService';
import { 
  BankAccountMessageAccount, 
  BankAccount, 
  SmsDispatchLog, 
  UserProfile 
} from '../types';
import { LocalDb } from '../lib/mockData';

interface MessageAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  initialSelectedAccountNumber?: string;
}

export default function MessageAppModal({ 
  isOpen, 
  onClose, 
  currentUser,
  initialSelectedAccountNumber 
}: MessageAppModalProps) {
  // User's bank accounts
  const [accounts, setAccounts] = useState<BankAccount[]>(() => LocalDb.getUserAccounts(currentUser.id));
  
  // Selected bank account for granular message config
  const [selectedAccNum, setSelectedAccNum] = useState<string>(() => {
    if (initialSelectedAccountNumber) return initialSelectedAccountNumber;
    const userAccs = LocalDb.getUserAccounts(currentUser.id);
    return userAccs[0]?.accountNumber || currentUser.accountNumber || '1000999999999';
  });

  // Current selected account's message configuration
  const [accountConfig, setAccountConfig] = useState<BankAccountMessageAccount>(() => {
    return SmsWebhookService.getAccountMessageConfig(selectedAccNum);
  });

  // History logs
  const [logs, setLogs] = useState<SmsDispatchLog[]>(() => SmsWebhookService.getLogs());
  const [logAccountFilter, setLogAccountFilter] = useState<string>('all');

  // Tabs
  const [activeTab, setActiveTab] = useState<'account_config' | 'all_accounts' | 'test' | 'code' | 'logs'>('account_config');

  // Test states
  const [testAmount, setTestAmount] = useState('250.00');
  const [testType, setTestType] = useState<'debit' | 'credit'>('debit');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    statusCode?: number;
    message?: string;
    responseBody?: string;
  } | null>(null);

  // Copy state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Sync state when account updates occur
  useEffect(() => {
    const refreshData = () => {
      const freshAccounts = LocalDb.getUserAccounts(currentUser.id);
      setAccounts(freshAccounts);
      setLogs(SmsWebhookService.getLogs());
      setAccountConfig(SmsWebhookService.getAccountMessageConfig(selectedAccNum));
    };

    window.addEventListener('cbe_sms_config_updated', refreshData);
    window.addEventListener('cbe_account_message_config_updated', refreshData);
    window.addEventListener('cbe_accounts_updated', refreshData);
    window.addEventListener('cbe_sms_log_added', refreshData);

    return () => {
      window.removeEventListener('cbe_sms_config_updated', refreshData);
      window.removeEventListener('cbe_account_message_config_updated', refreshData);
      window.removeEventListener('cbe_accounts_updated', refreshData);
      window.removeEventListener('cbe_sms_log_added', refreshData);
    };
  }, [currentUser.id, selectedAccNum]);

  // When switching bank account
  const handleSelectAccount = (accNum: string) => {
    setSelectedAccNum(accNum);
    const cfg = SmsWebhookService.getAccountMessageConfig(accNum);
    setAccountConfig(cfg);
    setTestResult(null);
  };

  if (!isOpen) return null;

  const currentSelectedBankAcc = accounts.find(a => a.accountNumber === selectedAccNum) || accounts[0];

  const handleUpdateConfig = (updates: Partial<BankAccountMessageAccount>) => {
    const updated = { ...accountConfig, ...updates };
    setAccountConfig(updated);
    SmsWebhookService.saveAccountMessageConfig(updated);
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 2500);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSendTestSms = async () => {
    setIsSendingTest(true);
    setTestResult(null);

    const amt = parseFloat(testAmount) || 250;
    const fakeTx = {
      id: 'FT' + Math.floor(10000000 + Math.random() * 90000000) + 'VK07',
      amount: amt,
      type: (testType === 'credit' ? 'receive' : 'transfer') as any,
      senderName: currentUser.name,
      senderAccount: accountConfig.accountNumber,
      recipientName: 'Addisu Abebe Mengistu',
      recipientAccount: '1000246810121',
      serviceCharge: 0.50,
      totalDebited: amt + 0.60
    };

    const smsText = SmsWebhookService.formatCbeSms(fakeTx, accountConfig);
    const result = await SmsWebhookService.dispatchSms({
      messageText: smsText,
      tx: fakeTx,
      isTest: true,
      accountNumber: accountConfig.accountNumber,
      targetAccount: currentSelectedBankAcc
    });

    setIsSendingTest(false);
    setTestResult({
      success: result.success,
      statusCode: result.statusCode,
      message: result.success 
        ? `Inbound SMS from message account ${accountConfig.messageAccountId} successfully delivered to webhook!` 
        : (result.error || 'Failed to dispatch test SMS'),
      responseBody: result.responseBody
    });
    setLogs(SmsWebhookService.getLogs());
  };

  const snippets = SmsWebhookService.getCodeSnippets(accountConfig.webhookUrl);

  const previewSms = SmsWebhookService.formatCbeSms({
    id: 'FT263211VK07',
    amount: parseFloat(testAmount) || 250,
    type: (testType === 'credit' ? 'receive' : 'transfer') as any,
    senderName: currentUser.name,
    senderAccount: accountConfig.accountNumber,
    recipientName: 'Addisu Abebe Mengistu',
    recipientAccount: '1000246810121',
    serviceCharge: 0.50
  }, accountConfig);

  // Filter logs for selected tab
  const filteredLogs = logAccountFilter === 'all' 
    ? logs 
    : logs.filter(l => l.bankAccountNumber === logAccountFilter || l.messageAccountId === logAccountFilter);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[94vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-850 to-emerald-950 p-4 sm:p-5 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <MessageSquare className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold tracking-tight">Bank Account Message Accounts</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {accounts.length} Accounts Configured
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80 mt-0.5 font-sans">
                Each bank account has its own dedicated message account &amp; phone
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Bank Account Selection Strip */}
        <div className="bg-emerald-950/90 border-b border-emerald-800/40 p-2 sm:p-2.5 overflow-x-auto scrollbar-none flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 px-1 whitespace-nowrap">
              Bank Account:
            </span>
            {accounts.map((acc) => {
              const isSelected = acc.accountNumber === selectedAccNum;
              const cfg = SmsWebhookService.getAccountMessageConfig(acc.accountNumber, acc);
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleSelectAccount(acc.accountNumber)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer flex-shrink-0 whitespace-nowrap border ${
                    isSelected 
                      ? 'bg-white text-emerald-950 border-white shadow-md ring-2 ring-emerald-400/60' 
                      : 'bg-emerald-900/60 text-emerald-100 hover:bg-emerald-800/80 border-emerald-700/60'
                  }`}
                >
                  {acc.accountType === 'cbe_birr' ? (
                    <Wallet className="w-3.5 h-3.5 text-amber-500" />
                  ) : acc.accountType === 'wadiah' ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Building className="w-3.5 h-3.5 text-blue-500" />
                  )}
                  <span>{acc.accountName}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-emerald-100 text-emerald-900 font-bold' : 'bg-black/20 text-emerald-200'
                  }`}>
                    *{acc.accountNumber.slice(-4)}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${cfg.enabled ? 'bg-emerald-400' : 'bg-gray-400'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/80 px-4 pt-2 gap-1 flex-shrink-0 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('account_config')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'account_config'
                ? 'border-emerald-800 text-emerald-900 font-extrabold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Account Message Config
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all_accounts')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'all_accounts'
                ? 'border-emerald-800 text-emerald-900 font-extrabold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            All Accounts Summary
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('test')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'test'
                ? 'border-emerald-800 text-emerald-900 font-extrabold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Test Inbound SMS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'code'
                ? 'border-emerald-800 text-emerald-900 font-extrabold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Code Snippets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-emerald-800 text-emerald-900 font-extrabold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            History ({logs.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 text-xs">

          {/* Success toast when saving */}
          {saveSuccessNotice && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Message account settings saved for {accountConfig.accountName}!</span>
            </div>
          )}
          
          {/* TAB 1: INDIVIDUAL ACCOUNT MESSAGE CONFIG */}
          {activeTab === 'account_config' && (
            <div className="space-y-4">
              
              {/* Linked Account Card */}
              <div className="bg-gradient-to-br from-emerald-50/90 to-teal-50/70 border border-emerald-200/80 p-4 rounded-2xl">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold shadow-xs">
                      {currentSelectedBankAcc?.accountType === 'cbe_birr' ? '📱' : currentSelectedBankAcc?.accountType === 'wadiah' ? '🛡️' : '🏦'}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-emerald-950 text-sm">{accountConfig.accountName}</h4>
                      <p className="text-[11px] font-mono text-emerald-850">
                        A/C: {accountConfig.accountNumber} • <span className="uppercase font-sans font-bold">{accountConfig.accountType}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-lg bg-emerald-200/80 text-emerald-900 border border-emerald-300/80">
                    {accountConfig.messageAccountId}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-emerald-200/50 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-gray-500 block text-[10px]">Assigned Message Phone / SIM:</span>
                    <span className="font-bold font-mono text-gray-900">{accountConfig.messagePhone}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Sender ID in Message App:</span>
                    <span className="font-bold font-mono text-gray-900">{accountConfig.senderName}</span>
                  </div>
                </div>
              </div>

              {/* Status & Auto-dispatch Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-150">
                  <div>
                    <p className="font-bold text-gray-800">Account SMS Alerts</p>
                    <p className="text-[10px] text-gray-400">Enable for this bank account</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdateConfig({ enabled: !accountConfig.enabled })}
                    className={`w-11 h-6 rounded-full p-0.5 transition duration-300 cursor-pointer ${
                      accountConfig.enabled ? 'bg-emerald-800' : 'bg-gray-200'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 transform ${
                      accountConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-150">
                  <div>
                    <p className="font-bold text-gray-800">Auto-Dispatch</p>
                    <p className="text-[10px] text-gray-400">Instant send upon transactions</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdateConfig({ autoDispatchOnTransaction: !accountConfig.autoDispatchOnTransaction })}
                    className={`w-11 h-6 rounded-full p-0.5 transition duration-300 cursor-pointer ${
                      accountConfig.autoDispatchOnTransaction ? 'bg-emerald-800' : 'bg-gray-200'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 transform ${
                      accountConfig.autoDispatchOnTransaction ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Editable Message Phone Number */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-700">Dedicated Message Phone / SIM Number</label>
                  <button
                    type="button"
                    onClick={() => handleUpdateConfig({ messagePhone: SmsWebhookService.getDefaultMessagePhone(accountConfig.accountNumber) })}
                    className="text-[10px] text-emerald-750 font-bold hover:underline cursor-pointer"
                  >
                    Reset to Default SIM
                  </button>
                </div>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={accountConfig.messagePhone}
                    onChange={(e) => handleUpdateConfig({ messagePhone: e.target.value })}
                    placeholder="+251911223344"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <p className="text-[10px] text-gray-400">
                  Each bank account routes to its own dedicated telephone number or SIM in your message application.
                </p>
              </div>

              {/* Editable Sender ID */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-700">SMS Sender ID for this Bank Account</label>
                  <span className="text-[10px] text-gray-400 font-mono">Origin Contact Name</span>
                </div>
                <input
                  type="text"
                  value={accountConfig.senderName}
                  onChange={(e) => handleUpdateConfig({ senderName: e.target.value })}
                  placeholder="CBE-Savings"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Dedicated Webhook URL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-700">Target Inbound SMS Webhook URL</label>
                  <button
                    type="button"
                    onClick={() => handleUpdateConfig({ webhookUrl: DEFAULT_SMS_WEBHOOK_URL })}
                    className="text-[10px] text-emerald-750 font-bold hover:underline cursor-pointer"
                  >
                    Reset URL
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={accountConfig.webhookUrl}
                    onChange={(e) => handleUpdateConfig({ webhookUrl: e.target.value })}
                    placeholder="https://.../api/inbound-sms"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(accountConfig.webhookUrl, 'url')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                    title="Copy URL"
                  >
                    {copiedCode === 'url' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Presets */}
              <div className="space-y-2 pt-1">
                <label className="font-bold text-gray-700 block text-[11px]">Quick Webhook Presets:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SMS_WEBHOOK_PRESETS.map((preset) => {
                    const isSelected = accountConfig.webhookUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleUpdateConfig({ webhookUrl: preset.url })}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          isSelected 
                            ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' 
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-bold text-gray-900 text-[11px] flex items-center justify-between">
                          <span>{preset.name.split(' (')[0]}</span>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-600" />}
                        </div>
                        <p className="text-[9px] font-mono text-gray-400 truncate mt-1">{preset.url}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleSendTestSms}
                  disabled={isSendingTest}
                  className="flex-1 bg-emerald-800 hover:bg-emerald-850 text-white font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Test Send for {accountConfig.accountName}</span>
                </button>
              </div>

              {/* Test Result Display */}
              {testResult && (
                <div className={`p-3.5 rounded-2xl border transition-all ${
                  testResult.success 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}>
                  <div className="flex items-start gap-2.5">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-xs">
                          {testResult.success ? 'Dispatch Succeeded!' : 'Dispatch Notice'}
                        </h4>
                        {testResult.statusCode !== undefined && (
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/10">
                            HTTP {testResult.statusCode}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] mt-1 leading-normal opacity-90">{testResult.message}</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: ALL ACCOUNTS SUMMARY MATRIX */}
          {activeTab === 'all_accounts' && (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200/70 p-3.5 rounded-2xl text-emerald-950">
                <h4 className="font-extrabold text-xs">Multi-Account Message Routing Matrix</h4>
                <p className="text-[11px] text-emerald-850 mt-0.5">
                  Commercial Bank of Ethiopia delivers transactions from each of your bank accounts to its own dedicated message account phone number.
                </p>
              </div>

              <div className="space-y-2.5">
                {accounts.map((acc) => {
                  const cfg = SmsWebhookService.getAccountMessageConfig(acc.accountNumber, acc);
                  const isCurrent = acc.accountNumber === selectedAccNum;
                  return (
                    <div
                      key={acc.id}
                      className={`p-3.5 rounded-2xl border transition ${
                        isCurrent 
                          ? 'bg-emerald-50/50 border-emerald-400 ring-1 ring-emerald-300' 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                            {acc.accountType === 'cbe_birr' ? '📱' : acc.accountType === 'wadiah' ? '🛡️' : '🏦'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900 text-xs">{acc.accountName}</span>
                              <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-gray-100 text-gray-600 font-bold">
                                {acc.accountType}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-gray-400">
                              A/C: {acc.accountNumber}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            cfg.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.enabled ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                            {cfg.enabled ? 'Active' : 'Muted'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectAccount(acc.accountNumber);
                              setActiveTab('account_config');
                            }}
                            className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10.5px]">
                        <div>
                          <span className="text-gray-400 block text-[9px]">Message Account:</span>
                          <span className="font-mono font-bold text-emerald-900">{cfg.messageAccountId}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[9px]">Dedicated SIM / Phone:</span>
                          <span className="font-mono font-bold text-gray-800">{cfg.messagePhone}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-gray-400 block text-[9px]">Sender ID:</span>
                          <span className="font-mono font-bold text-gray-800">{cfg.senderName}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: TEST INBOUND SMS */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              
              <div className="bg-amber-50 border border-amber-200/70 p-3.5 rounded-2xl flex items-start gap-2.5 text-amber-900">
                <Radio className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="font-bold">Test Inbound SMS for {accountConfig.accountName}</strong>
                  <p className="text-amber-800/90 mt-0.5">
                    Dispatches a real CBE alert payload to <span className="font-mono font-bold">{accountConfig.webhookUrl}</span> for message account <span className="font-mono font-bold">{accountConfig.messageAccountId}</span> (Phone: {accountConfig.messagePhone}).
                  </p>
                </div>
              </div>

              {/* Test Parameters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Transaction Type</label>
                  <select
                    value={testType}
                    onChange={(e) => setTestType(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="debit">Debit (Transfer / Payment)</option>
                    <option value="credit">Credit (Deposit / Inflow)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Test Amount (ETB)</label>
                  <input
                    type="number"
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Live Preview of CBE SMS */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-gray-600">
                  <span className="font-bold">CBE SMS Body Preview:</span>
                  <span className="text-[10px] text-gray-400 font-mono">Format: Official CBE SMS</span>
                </div>
                <div className="bg-gray-900 text-gray-100 p-3.5 rounded-2xl font-mono text-[11px] leading-relaxed border border-gray-800 select-all">
                  {previewSms}
                </div>
              </div>

              {/* Dispatch Action Button */}
              <button
                type="button"
                onClick={handleSendTestSms}
                disabled={isSendingTest}
                className="w-full bg-emerald-800 hover:bg-emerald-850 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md text-xs"
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Transmitting to {accountConfig.webhookUrl}...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Test SMS to Message Account</span>
                  </>
                )}
              </button>

              {/* Test Result Display */}
              {testResult && (
                <div className={`p-4 rounded-2xl border transition-all ${
                  testResult.success 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}>
                  <div className="flex items-start gap-2.5">
                    {testResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-xs">
                          {testResult.success ? 'Dispatch Succeeded!' : 'Dispatch Notice'}
                        </h4>
                        {testResult.statusCode !== undefined && (
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/10">
                            HTTP {testResult.statusCode}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] mt-1 leading-normal opacity-90">{testResult.message}</p>
                      
                      {testResult.responseBody && (
                        <div className="mt-2.5 pt-2 border-t border-black/10">
                          <p className="text-[10px] font-bold mb-1 opacity-70">Server Response:</p>
                          <pre className="text-[10px] font-mono bg-black/5 p-2 rounded-xl overflow-x-auto max-h-24">
                            {testResult.responseBody}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: DEVELOPER CODE SNIPPETS */}
          {activeTab === 'code' && (
            <div className="space-y-4">
              <p className="text-gray-500 leading-relaxed text-[11px]">
                Integration code for <strong className="text-gray-800">{accountConfig.accountName}</strong> (Message Account: {accountConfig.messageAccountId}, Phone: {accountConfig.messagePhone}):
              </p>

              {/* cURL Snippet */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800">1. cURL / Terminal Command</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(snippets.curlSnippet, 'curl')}
                    className="text-emerald-750 font-bold hover:underline flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    {copiedCode === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === 'curl' ? 'Copied' : 'Copy cURL'}</span>
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded-2xl font-mono text-[10.5px] overflow-x-auto border border-gray-800">
                  {snippets.curlSnippet}
                </pre>
              </div>

              {/* Node.js Snippet */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800">2. Node.js / JavaScript Fetch</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(snippets.nodeSnippet, 'node')}
                    className="text-emerald-750 font-bold hover:underline flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    {copiedCode === 'node' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === 'node' ? 'Copied' : 'Copy Node.js'}</span>
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded-2xl font-mono text-[10.5px] overflow-x-auto border border-gray-800">
                  {snippets.nodeSnippet}
                </pre>
              </div>

              {/* Android Kotlin Snippet */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800">3. Android (Kotlin / OkHttp)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(snippets.androidSnippet, 'android')}
                    className="text-emerald-750 font-bold hover:underline flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    {copiedCode === 'android' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === 'android' ? 'Copied' : 'Copy Android'}</span>
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded-2xl font-mono text-[10.5px] overflow-x-auto border border-gray-800 max-h-40">
                  {snippets.androidSnippet}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 5: DISPATCH HISTORY / LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <ListFilter className="w-3.5 h-3.5 text-gray-400" />
                  <select
                    value={logAccountFilter}
                    onChange={(e) => setLogAccountFilter(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-bold text-gray-700"
                  >
                    <option value="all">All Bank Accounts ({logs.length})</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.accountNumber}>
                        {a.accountName} (*{a.accountNumber.slice(-4)})
                      </option>
                    ))}
                  </select>
                </div>

                {logs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      SmsWebhookService.clearLogs();
                      setLogs([]);
                    }}
                    className="text-rose-600 hover:text-rose-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear Logs
                  </button>
                )}
              </div>

              {filteredLogs.length === 0 ? (
                <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-bold text-xs">No SMS Dispatches for this View</p>
                  <p className="text-[11px] mt-0.5">Send a test SMS or execute a transfer</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-2xl border ${
                        log.status === 'success'
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-rose-50/50 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`w-2 h-2 rounded-full ${
                            log.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`} />
                          <span className="font-bold text-gray-800">{log.sender}</span>
                          {log.messageAccountId && (
                            <span className="text-[9px] font-mono bg-emerald-100 text-emerald-900 px-1 rounded font-bold">
                              {log.messageAccountId}
                            </span>
                          )}
                          {log.bankAccountName && (
                            <span className="text-[10px] text-gray-500 font-semibold">
                              • {log.bankAccountName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {log.statusCode !== undefined && (
                            <span className="text-[10px] font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-gray-200">
                              HTTP {log.statusCode}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] font-mono text-gray-700 bg-white/70 p-2 rounded-xl border border-gray-200/50 line-clamp-3">
                        {log.messageText}
                      </p>

                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                        <span>SIM: {log.recipientPhone || '+251911223344'}</span>
                        <span className="truncate max-w-[200px]">{log.webhookUrl}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

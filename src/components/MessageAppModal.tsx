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
  ShieldCheck
} from 'lucide-react';
import { 
  SmsWebhookService, 
  DEFAULT_SMS_WEBHOOK_URL, 
  SMS_WEBHOOK_PRESETS 
} from '../lib/smsWebhookService';
import { SmsWebhookConfig, SmsDispatchLog, UserProfile } from '../types';

interface MessageAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}

export default function MessageAppModal({ isOpen, onClose, currentUser }: MessageAppModalProps) {
  const [config, setConfig] = useState<SmsWebhookConfig>(() => SmsWebhookService.getConfig());
  const [logs, setLogs] = useState<SmsDispatchLog[]>(() => SmsWebhookService.getLogs());
  const [activeTab, setActiveTab] = useState<'settings' | 'test' | 'code' | 'logs'>('settings');
  
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

  useEffect(() => {
    const handleUpdate = () => {
      setConfig(SmsWebhookService.getConfig());
      setLogs(SmsWebhookService.getLogs());
    };
    window.addEventListener('cbe_sms_config_updated', handleUpdate);
    window.addEventListener('cbe_sms_log_added', handleUpdate);
    return () => {
      window.removeEventListener('cbe_sms_config_updated', handleUpdate);
      window.removeEventListener('cbe_sms_log_added', handleUpdate);
    };
  }, []);

  if (!isOpen) return null;

  const handleSave = (updated: Partial<SmsWebhookConfig>) => {
    const newConfig = { ...config, ...updated };
    setConfig(newConfig);
    SmsWebhookService.saveConfig(newConfig);
  };

  const handleSelectPreset = (url: string) => {
    handleSave({ webhookUrl: url });
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
      senderAccount: currentUser.accountNumber,
      recipientName: 'Addisu Abebe Mengistu',
      recipientAccount: '1000246810121',
      serviceCharge: 0.50,
      totalDebited: amt + 0.60
    };

    const smsText = SmsWebhookService.formatCbeSms(fakeTx);
    const result = await SmsWebhookService.dispatchSms({
      messageText: smsText,
      tx: fakeTx,
      isTest: true
    });

    setIsSendingTest(false);
    setTestResult({
      success: result.success,
      statusCode: result.statusCode,
      message: result.success ? 'Inbound SMS successfully received by message app!' : (result.error || 'Failed to dispatch test SMS'),
      responseBody: result.responseBody
    });
    setLogs(SmsWebhookService.getLogs());
  };

  const snippets = SmsWebhookService.getCodeSnippets(config.webhookUrl);

  const previewSms = SmsWebhookService.formatCbeSms({
    id: 'FT263211VK07',
    amount: parseFloat(testAmount) || 250,
    type: (testType === 'credit' ? 'receive' : 'transfer') as any,
    senderName: currentUser.name,
    senderAccount: currentUser.accountNumber,
    recipientName: 'Addisu Abebe Mengistu',
    recipientAccount: '1000246810121',
    serviceCharge: 0.50
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-850 to-emerald-950 p-5 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <MessageSquare className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight">Message App Integration</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  config.enabled ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30' : 'bg-gray-500/30 text-gray-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${config.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
                  {config.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80 mt-0.5 font-mono truncate max-w-[280px]">
                /api/inbound-sms webhook link
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/70 px-4 pt-2 gap-1 flex-shrink-0 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-emerald-800 text-emerald-900'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            Connection Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('test')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'test'
                ? 'border-emerald-800 text-emerald-900'
                : 'border-transparent text-gray-400 hover:text-gray-700'
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
                ? 'border-emerald-800 text-emerald-900'
                : 'border-transparent text-gray-400 hover:text-gray-700'
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
                ? 'border-emerald-800 text-emerald-900'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            History ({logs.length})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* TAB 1: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              
              {/* Integration Status Card */}
              <div className="bg-emerald-50/70 border border-emerald-200/70 p-4 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-850 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-emerald-950 text-xs">Direct Banking to Message App Pipeline</h4>
                  <p className="text-[11px] text-emerald-850 leading-relaxed mt-0.5">
                    Connects your CBE banking actions (transfers, deposits, bill payments) to the inbound SMS webhook endpoint of your message applet.
                  </p>
                </div>
              </div>

              {/* Master Enabled Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <p className="font-bold text-gray-800">Forward Banking SMS to Message App</p>
                  <p className="text-[11px] text-gray-400">Pushes debit/credit alerts to webhook automatically</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSave({ enabled: !config.enabled })}
                  className={`w-12 h-6.5 rounded-full p-1 transition duration-300 cursor-pointer ${
                    config.enabled ? 'bg-emerald-800' : 'bg-gray-200'
                  }`}
                >
                  <div className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transition-transform duration-300 transform ${
                    config.enabled ? 'translate-x-5.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Auto-Dispatch on Transactions */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <p className="font-bold text-gray-800">Auto-Dispatch on New Transactions</p>
                  <p className="text-[11px] text-gray-400">Triggers immediately upon Send Money, Transfer, or Deposit</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSave({ autoDispatchOnTransaction: !config.autoDispatchOnTransaction })}
                  className={`w-12 h-6.5 rounded-full p-1 transition duration-300 cursor-pointer ${
                    config.autoDispatchOnTransaction ? 'bg-emerald-800' : 'bg-gray-200'
                  }`}
                >
                  <div className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transition-transform duration-300 transform ${
                    config.autoDispatchOnTransaction ? 'translate-x-5.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Target Webhook URL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-700">Target Inbound SMS Webhook URL</label>
                  <button
                    type="button"
                    onClick={() => handleSave({ webhookUrl: DEFAULT_SMS_WEBHOOK_URL })}
                    className="text-[10px] text-emerald-750 font-bold hover:underline cursor-pointer"
                  >
                    Reset to Default
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={config.webhookUrl}
                    onChange={(e) => handleSave({ webhookUrl: e.target.value })}
                    placeholder="https://.../api/inbound-sms"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(config.webhookUrl, 'url')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                    title="Copy URL"
                  >
                    {copiedCode === 'url' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Quick Presets (matching user screenshot) */}
              <div className="space-y-2 pt-1">
                <label className="font-bold text-gray-700 block">Quick Presets (From Your Message App Screen)</label>
                <div className="space-y-2">
                  {SMS_WEBHOOK_PRESETS.map((preset) => {
                    const isSelected = config.webhookUrl === preset.url;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset.url)}
                        className={`p-3 rounded-2xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                          isSelected 
                            ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500' 
                            : 'bg-white border-gray-200 hover:border-emerald-200 hover:bg-gray-50/50'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center mt-0.5 ${
                            isSelected ? 'bg-emerald-800 text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {preset.id === 'current_app' && <MessageSquare className="w-3.5 h-3.5" />}
                            {preset.id === 'localhost' && <Laptop className="w-3.5 h-3.5" />}
                            {preset.id === 'android_emulator' && <Smartphone className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900">{preset.name}</span>
                              {isSelected && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                  Selected
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5 font-mono truncate">{preset.url}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{preset.description}</p>
                          </div>
                        </div>
                        <div className="mt-1">
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                          }`}>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sender Name config */}
              <div className="space-y-1 pt-1">
                <label className="font-bold text-gray-700">SMS Sender ID</label>
                <input
                  type="text"
                  value={config.senderName}
                  onChange={(e) => handleSave({ senderName: e.target.value })}
                  placeholder="CBE"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <p className="text-[10px] text-gray-400">Displayed in message app as origin sender contact (e.g. CBE)</p>
              </div>

            </div>
          )}

          {/* TAB 2: TEST INBOUND SMS */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              
              <div className="bg-amber-50 border border-amber-200/70 p-3.5 rounded-2xl flex items-start gap-2.5 text-amber-900">
                <Radio className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="font-bold">Interactive Test Inbound Trigger</strong>
                  <p className="text-amber-800/90 mt-0.5">
                    Click the button below to simulate an authentic CBE mobile banking SMS alert and send it directly to <span className="font-mono font-bold">{config.webhookUrl}</span>.
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
                    <span>Transmitting to {config.webhookUrl}...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Test Inbound SMS Now</span>
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

          {/* TAB 3: DEVELOPER CODE SNIPPETS */}
          {activeTab === 'code' && (
            <div className="space-y-4">
              <p className="text-gray-500 leading-relaxed text-[11px]">
                As described in your message app's developer guide, you can also trigger inbound SMS from any background script, backend server, or Android mobile application using these snippets:
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

          {/* TAB 4: DISPATCH HISTORY / LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-[11px]">Recent inbound SMS transmissions to the message app</p>
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

              {logs.length === 0 ? (
                <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-bold text-xs">No SMS Dispatches Yet</p>
                  <p className="text-[11px] mt-0.5">Send a test SMS or perform a transfer in the app</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-2xl border ${
                        log.status === 'success'
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-rose-50/50 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${
                            log.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`} />
                          <span className="font-bold text-gray-800">{log.sender}</span>
                          {log.transactionId && (
                            <span className="font-mono text-[10px] text-gray-500">
                              ({log.transactionId})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {log.statusCode !== undefined && (
                            <span className="text-[10px] font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-gray-200">
                              {log.statusCode}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] font-mono text-gray-700 bg-white/70 p-2 rounded-xl border border-gray-100 leading-relaxed break-words">
                        {log.messageText}
                      </p>
                      {log.errorMessage && (
                        <p className="text-[10px] text-rose-700 mt-1.5 font-medium">
                          Note: {log.errorMessage}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-gray-600 font-medium">
              Target: <span className="font-mono font-bold">{new URL(config.webhookUrl).pathname}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}

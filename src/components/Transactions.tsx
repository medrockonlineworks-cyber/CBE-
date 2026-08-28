import React, { useState, useEffect } from 'react';
import { UserProfile, Transaction, Beneficiary } from '../types';
import { LocalDb } from '../lib/mockData';
import { calculateCbeFee } from '../lib/cbeTariff';
import { 
  Send, 
  ArrowLeftRight, 
  ArrowDownLeft, 
  PhoneCall, 
  Check, 
  Copy, 
  AlertCircle, 
  TrendingDown, 
  UserPlus, 
  QrCode, 
  Share2, 
  CheckCircle2, 
  ShieldCheck,
  CreditCard,
  Eye,
  EyeOff,
  Trash2,
  Building,
  Wallet,
  Calculator,
  Scan,
  X,
  Search,
  ChevronRight,
  User
} from 'lucide-react';

interface TransactionsProps {
  currentUser: UserProfile;
  onTransactionComplete: (tx: Transaction) => void;
  initialTab?: 'send' | 'transfer' | 'merchant' | 'receive' | 'airtime';
}

type TxModuleTab = 'send' | 'transfer' | 'merchant' | 'receive' | 'airtime';

const ETHIOPIAN_BANKS = [
  'Commercial Bank of Ethiopia (CBE)',
  'Awash International Bank',
  'Dashen Bank',
  'Abyssinia Bank',
  'Wegagen Bank',
  'Nib International Bank',
  'Hibret Bank',
  'Cooperative Bank of Oromia',
  'Zemen Bank'
];

export default function Transactions({ currentUser, onTransactionComplete, initialTab }: TransactionsProps) {
  const [activeTab, setActiveTab] = useState<TxModuleTab>('send');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pin Verification State
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Beneficiaries list
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [showAddBen, setShowAddBen] = useState(false);
  const [newBenName, setNewBenName] = useState('');
  const [newBenAcc, setNewBenAcc] = useState('');
  const [newBenBank, setNewBenBank] = useState('Tana Digital Bank');

  // Load Beneficiaries
  useEffect(() => {
    setBeneficiaries(LocalDb.getBeneficiaries(currentUser.id));
  }, [currentUser]);

  // Set active tab if passed from parent
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [initialTab]);

  // Form Fields - Send Money
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendRecipientName, setSendRecipientName] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendDesc, setSendDesc] = useState('');

  // Form Fields - CBE / Bank Transfer (Screenshot 2 Alignment)
  const [transferSubTab, setTransferSubTab] = useState<'other' | 'own'>('other');
  const [selectedFromAccount, setSelectedFromAccount] = useState<'savings' | 'wadiah'>('savings');
  const [showFromBalance, setShowFromBalance] = useState<boolean>(true);
  const [transferAccount, setTransferAccount] = useState('');
  const [transferRecipientName, setTransferRecipientName] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferBank, setTransferBank] = useState(ETHIOPIAN_BANKS[0]);
  const [showRemarkInput, setShowRemarkInput] = useState(false);
  const [remarkText, setRemarkText] = useState('');
  const [transferListTab, setTransferListTab] = useState<'recent' | 'beneficiaries'>('recent');

  // Account verification status simulation
  const [isAccountVerifying, setIsAccountVerifying] = useState(false);
  const [verifiedAccountName, setVerifiedAccountName] = useState('');

  // Mock Recent Transfers list
  const [recentTransfers, setRecentTransfers] = useState([
    { id: 'rt_1', name: 'Selamawit Tekle', accountNumber: '1000246810121', initial: 'ST', color: 'bg-purple-100 text-purple-700 border border-purple-200' },
    { id: 'rt_2', name: 'Kidus Yohannes', accountNumber: '013204958100', initial: 'KY', color: 'bg-amber-100 text-amber-700 border border-amber-200' },
    { id: 'rt_3', name: 'Desta Kassahun', accountNumber: '0234059681', initial: 'DK', color: 'bg-rose-100 text-rose-700 border border-rose-200' }
  ]);

  // Form Fields - Pay Merchant (Screenshot 1 Alignment)
  const [merchantSubTab, setMerchantSubTab] = useState<'customer' | 'dynamic'>('customer');
  const [merchantCode, setMerchantCode] = useState('');
  const [operatorCode, setOperatorCode] = useState('');
  const [merchantStep, setMerchantStep] = useState<1 | 2>(1);
  const [verifiedMerchantName, setVerifiedMerchantName] = useState('');
  const [merchantPayAmount, setMerchantPayAmount] = useState('');
  const [merchantRemark, setMerchantRemark] = useState('');

  // Floating Action QR Scanner Simulation Overlay
  const [showScanner, setShowScanner] = useState(false);

  // Auto look up names for accounts when typed
  useEffect(() => {
    if (transferAccount.length >= 10) {
      setIsAccountVerifying(true);
      const timer = setTimeout(() => {
        setIsAccountVerifying(false);
        // Match mock database profiles
        if (transferAccount === '1000246810121') {
          setVerifiedAccountName('Selamawit Tekle');
          setTransferRecipientName('Selamawit Tekle');
        } else if (transferAccount === '013204958100') {
          setVerifiedAccountName('Kidus Yohannes');
          setTransferRecipientName('Kidus Yohannes');
        } else if (transferAccount === '0234059681') {
          setVerifiedAccountName('Desta Kassahun');
          setTransferRecipientName('Desta Kassahun');
        } else {
          setVerifiedAccountName('External CBE Account Holder');
          if (!transferRecipientName) {
            setTransferRecipientName('External Account');
          }
        }
      }, 700);
      return () => clearTimeout(timer);
    } else {
      setVerifiedAccountName('');
    }
  }, [transferAccount]);

  // Form Fields - Receive Money Request
  const [receiveAmountRequest, setReceiveAmountRequest] = useState('');
  const [generatedRequestLink, setGeneratedRequestLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Form Fields - Airtime & Data
  const [airtimeNetwork, setAirtimeNetwork] = useState<'Ethio Telecom' | 'Safaricom'>('Ethio Telecom');
  const [airtimePhone, setAirtimePhone] = useState('');
  const [airtimeAmount, setAirtimeAmount] = useState('');
  const [airtimeType, setAirtimeType] = useState<'airtime' | 'data'>('airtime');
  const [selectedDataPackage, setSelectedDataPackage] = useState('Weekly 5GB Unlimited - 250 ETB');

  // Trigger PIN Verification Modal
  const requestPinAuthorize = (action: () => void) => {
    setErrorMsg('');
    setEnteredPin('');
    setPendingAction(() => action);
    setShowPinModal(true);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // PIN is verified
    if (enteredPin.length !== 4) {
      setErrorMsg('PIN must be exactly 4 digits.');
      return;
    }

    setShowPinModal(false);
    if (pendingAction) {
      pendingAction();
    }
  };

  // Submit Send Money
  const handleSendMoneySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const amountNum = parseFloat(sendAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }

    const cbeFee = calculateCbeFee(amountNum, 'send', false);

    if (cbeFee.totalDebited > currentUser.balance) {
      setErrorMsg(`Insufficient balance. Transaction requires ETB ${cbeFee.totalDebited.toLocaleString(undefined, { minimumFractionDigits: 2 })} including CBE Service Charge (ETB ${cbeFee.serviceCharge.toFixed(2)}), 15% VAT (ETB ${cbeFee.vat.toFixed(2)}), and 5% Disaster Recovery (ETB ${cbeFee.disasterRecovery.toFixed(2)}).`);
      return;
    }

    requestPinAuthorize(() => {
      try {
        const finalRecipientName = sendRecipientName.trim() || sendRecipient.trim();
        const finalRecipientAccount = sendRecipient.trim().includes('@') || isNaN(Number(sendRecipient.trim())) 
          ? ('1000' + Math.floor(100000 + Math.random() * 900000).toString())
          : sendRecipient.trim();

        const tx = LocalDb.createTransaction(
          'send',
          currentUser.id,
          amountNum,
          cbeFee.serviceCharge,
          finalRecipientName,
          finalRecipientAccount,
          'Commercial Bank of Ethiopia (CBE)',
          sendDesc || 'Mobile Banking Transfer',
          false
        );
        onTransactionComplete(tx);
      } catch (err: any) {
        setErrorMsg(err.message || 'Transaction failed.');
      }
    });
  };

  // Submit CBE Transfer / Own Account Transfer
  const handleCbeTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const amountNum = parseFloat(transferAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }

    const isOwn = transferSubTab === 'own';
    const cbeFee = calculateCbeFee(amountNum, 'transfer', isOwn);
    const sourceBalance = selectedFromAccount === 'savings' ? currentUser.balance : 5420.00;
    const totalCost = cbeFee.totalDebited;

    if (totalCost > sourceBalance) {
      setErrorMsg(`Insufficient funds. Total amount with CBE Service Charge (ETB ${cbeFee.serviceCharge.toFixed(2)}), 15% VAT (ETB ${cbeFee.vat.toFixed(2)}) & 5% Disaster Recovery (ETB ${cbeFee.disasterRecovery.toFixed(2)}) is ETB ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}. Current balance is ETB ${sourceBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`);
      return;
    }

    if (transferSubTab === 'other' && transferAccount.length < 8) {
      setErrorMsg('Please enter a valid account number (minimum 8 digits).');
      return;
    }

    requestPinAuthorize(() => {
      try {
        if (transferSubTab === 'own') {
          // Own account transfer simulation
          const targetName = selectedFromAccount === 'savings' ? 'Wadiah Staff Sa' : 'Savings Account';
          const targetAcc = selectedFromAccount === 'savings' ? '1000987654321' : currentUser.accountNumber;
          
          const tx = LocalDb.createTransaction(
            'transfer',
            currentUser.id,
            amountNum,
            0,
            targetName,
            targetAcc,
            'Commercial Bank of Ethiopia (CBE)',
            remarkText || 'Transfer to Own Account',
            true
          );
          
          onTransactionComplete(tx);
        } else {
          // Other account transfer
          const tx = LocalDb.createTransaction(
            'transfer',
            currentUser.id,
            amountNum,
            cbeFee.serviceCharge,
            transferRecipientName || 'CBE Recipient',
            transferAccount,
            transferBank,
            remarkText || 'MB transfer',
            false
          );

          // Add to recent list dynamically if not already there
          const exists = recentTransfers.some(rt => rt.accountNumber === transferAccount);
          if (!exists) {
            const initials = (transferRecipientName || 'CBE Recipient')
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);
            setRecentTransfers(prev => [
              { id: 'rt_' + Date.now(), name: transferRecipientName || 'CBE Recipient', accountNumber: transferAccount, initial: initials || 'AC', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
              ...prev
            ]);
          }

          onTransactionComplete(tx);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Transfer failed.');
      }
    });
  };

  // Submit Pay Merchant
  const handleMerchantPaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (merchantStep === 1) {
      if (!merchantCode) {
        setErrorMsg('Please enter a valid Merchant Code.');
        return;
      }
      // Look up merchant code
      if (merchantCode.toUpperCase() === 'MC7821') {
        setVerifiedMerchantName('Tana Food & Cafe');
      } else if (merchantCode.toUpperCase() === 'MC9042') {
        setVerifiedMerchantName('Ethio Mart Supermarket');
      } else if (merchantCode.toUpperCase() === 'MC1120') {
        setVerifiedMerchantName('Sheger Bakery');
      } else {
        setVerifiedMerchantName('CBE Merchant Partner');
      }
      setMerchantStep(2);
      return;
    }

    // Step 2 submission (Actual Payment)
    const amountNum = parseFloat(merchantPayAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg('Please enter a valid payment amount.');
      return;
    }

    if (amountNum > currentUser.balance) {
      setErrorMsg('Insufficient balance to pay merchant.');
      return;
    }

    requestPinAuthorize(() => {
      try {
        const tx = LocalDb.createTransaction(
          'bill',
          currentUser.id,
          amountNum,
          0, // Merchant pay is free of fee
          verifiedMerchantName,
          merchantCode,
          'CBE Merchant Network',
          merchantRemark || `Merchant Pay (Operator: ${operatorCode || 'N/A'})`
        );
        onTransactionComplete(tx);
      } catch (err: any) {
        setErrorMsg(err.message || 'Merchant payment failed.');
      }
    });
  };

  // Submit Airtime recharge
  const handleAirtimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    let amountNum = parseFloat(airtimeAmount);
    let packageDetail = undefined;

    if (airtimeType === 'data') {
      const matches = selectedDataPackage.match(/(\d+)\s*ETB/);
      if (matches && matches[1]) {
        amountNum = parseFloat(matches[1]);
        packageDetail = selectedDataPackage;
      } else {
        amountNum = 150;
      }
    }

    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }

    if (amountNum > currentUser.balance) {
      setErrorMsg('Insufficient savings balance to purchase airtime or bundles.');
      return;
    }

    requestPinAuthorize(() => {
      try {
        const tx = LocalDb.createTransaction(
          'airtime',
          currentUser.id,
          amountNum,
          0,
          `${airtimeNetwork} Recharge`,
          airtimePhone.startsWith('+251') ? airtimePhone : '+251' + airtimePhone.replace(/^0/, ''),
          airtimeNetwork,
          packageDetail ? `Bundle: ${packageDetail}` : `Airtime Recharge of ETB ${amountNum}`
        );
        onTransactionComplete(tx);
      } catch (err: any) {
        setErrorMsg(err.message || 'Airtime recharge failed.');
      }
    });
  };

  // Generate payment request link (Receive Money)
  const handleGenerateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(receiveAmountRequest);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg('Please enter a valid request amount.');
      return;
    }

    const payload = btoa(JSON.stringify({
      account: currentUser.accountNumber,
      name: currentUser.name,
      amount: amountNum,
      bank: 'Tana Digital Bank'
    }));

    setGeneratedRequestLink(`${window.location.origin}/#pay?request=${payload}`);
    setSuccessMsg('Payment request QR & Link successfully compiled!');
  };

  // Add a quick Beneficiary
  const handleAddBeneficiary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBenName || !newBenAcc) return;

    LocalDb.addBeneficiary({
      userId: currentUser.id,
      name: newBenName,
      accountNumber: newBenAcc,
      bankName: newBenBank
    });

    setBeneficiaries(LocalDb.getBeneficiaries(currentUser.id));
    setNewBenName('');
    setNewBenAcc('');
    setShowAddBen(false);
    setSuccessMsg('Beneficiary saved successfully!');
  };

  // Quick Action: Pre-fill fields from Recents/Beneficiaries list
  const prefillFromContact = (name: string, accountNum: string, bank?: string) => {
    setTransferAccount(accountNum);
    setTransferRecipientName(name);
    if (bank) {
      setTransferBank(bank);
    }
    setSuccessMsg(`Pre-filled transfer details for ${name}!`);
    // scroll to form
    const formElement = document.getElementById('form-bank-transfer');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Simulated QR Scan Action Click
  const handleSimulateScan = (type: 'merchant_cafe' | 'merchant_mart' | 'account_selam') => {
    setShowScanner(false);
    if (type === 'merchant_cafe') {
      setActiveTab('merchant');
      setMerchantCode('MC7821');
      setOperatorCode('OP-091');
      setMerchantStep(1);
      setSuccessMsg('Scanned QR for Tana Food & Cafe (MC7821)!');
    } else if (type === 'merchant_mart') {
      setActiveTab('merchant');
      setMerchantCode('MC9042');
      setOperatorCode('OP-552');
      setMerchantStep(1);
      setSuccessMsg('Scanned QR for Ethio Mart Supermarket (MC9042)!');
    } else if (type === 'account_selam') {
      setActiveTab('transfer');
      setTransferSubTab('other');
      setTransferAccount('1000246810121');
      setTransferRecipientName('Selamawit Tekle');
      setSuccessMsg('Scanned QR for Selamawit Tekle account!');
    }
  };

  return (
    <div id="transactions-screen" className="max-w-md mx-auto bg-gray-50 min-h-screen pb-28 font-sans relative">
      
      {/* Header Banner */}
      <div className="bg-[#61167e] text-white px-5 pt-7 pb-8 rounded-b-[2rem] shadow-md relative">
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          <span>CBE Financial Gate</span>
        </h2>
        <p className="text-purple-200 text-xs mt-0.5">Commercial Bank of Ethiopia Transfers &amp; Services</p>
        
        {/* Horizontal segment selector tabs */}
        <div className="flex bg-black/20 p-1.5 rounded-2xl mt-5 border border-white/10 gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'send', label: 'Other Banks', icon: Send },
            { id: 'transfer', label: 'CBE Transfer', icon: ArrowLeftRight },
            { id: 'merchant', label: 'Pay Merchant', icon: CreditCard },
            { id: 'receive', label: 'Receive', icon: ArrowDownLeft },
            { id: 'airtime', label: 'Airtime', icon: PhoneCall },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                id={`tx-subtab-${tab.id}`}
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TxModuleTab);
                  setErrorMsg('');
                  setSuccessMsg('');
                  setMerchantStep(1); // Reset merchant screen step
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isActive 
                    ? 'bg-white text-[#61167e] shadow-md' 
                    : 'text-purple-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Form Area */}
      <div className="p-5">
        
        {/* Error/Success banners */}
        {errorMsg && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-800 text-xs py-2.5 px-4 rounded-2xl flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs py-2.5 px-4 rounded-2xl flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ================= SEND MONEY SCREEN (Internal Tana Bank) ================= */}
        {activeTab === 'send' && (
          <div className="space-y-6">
            <form id="form-send-money" onSubmit={handleSendMoneySubmit} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-emerald-950 uppercase tracking-wider">Internal Transfer</h3>
                <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200/50">Instant Peer-to-Peer</span>
              </div>
              
              {/* Recipient Account Number or Phone */}
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-bold">Recipient Account / Phone</label>
                <input 
                  id="input-send-recipient"
                  type="text" 
                  placeholder="Enter A/C or phone (e.g. 1000246810121 or 0911234567)"
                  value={sendRecipient}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSendRecipient(val);
                    // If matched beneficiary, auto-suggest name if empty
                    const matched = beneficiaries.find(b => b.accountNumber === val || b.phone === val);
                    if (matched && !sendRecipientName) {
                      setSendRecipientName(matched.name);
                    }
                  }}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-800 focus:bg-white transition"
                  required
                />
              </div>

              {/* Recipient Name / Account Holder Name Input */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-gray-500 font-bold">Account Holder Name</label>
                  <span className="text-[10px] text-emerald-700 font-bold">Recipient Name</span>
                </div>
                <div className="relative">
                  <div className="absolute left-3.5 top-[11px] text-gray-400">
                    <User className="w-4 h-4 text-emerald-700/70" />
                  </div>
                  <input 
                    id="input-send-recipient-name"
                    type="text" 
                    placeholder="Enter recipient's full name (e.g. Selamawit Tekle)"
                    value={sendRecipientName}
                    onChange={(e) => setSendRecipientName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:border-emerald-800 focus:bg-white transition font-medium"
                    required
                  />
                </div>
              </div>

              {/* Quick Beneficiaries Select */}
              {beneficiaries.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Quick Beneficiaries</span>
                  <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none">
                    {beneficiaries.map((b) => (
                      <button
                        type="button"
                        key={b.id}
                        onClick={() => {
                          setSendRecipient(b.accountNumber || b.phone || b.name);
                          setSendRecipientName(b.name);
                        }}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-100/50 transition flex-shrink-0 cursor-pointer"
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-bold">Transfer Amount (ETB)</label>
                <input 
                  id="input-send-amount"
                  type="number" 
                  placeholder="0.00"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-800 focus:bg-white font-mono font-bold transition"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-bold">Add Private Description</label>
                <input 
                  id="input-send-desc"
                  type="text" 
                  placeholder="e.g. Birthday gift, rent, groceries"
                  value={sendDesc}
                  onChange={(e) => setSendDesc(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-800 focus:bg-white transition"
                />
              </div>

              {/* CBE TARIFF & VAT SUMMARY */}
              {(() => {
                const sendAmtNum = parseFloat(sendAmount) || 0;
                const sendCbeFee = calculateCbeFee(sendAmtNum, 'send', false);
                return (
                  <div className="bg-emerald-50/50 border border-emerald-100/50 p-3.5 rounded-2xl space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-gray-500 font-semibold">
                      <span>CBE Service Charge</span>
                      <span className="font-mono text-gray-800">ETB {sendCbeFee.serviceCharge.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-500 font-semibold">
                      <span>VAT (15%)</span>
                      <span className="font-mono text-gray-800">ETB {sendCbeFee.vat.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-500 font-semibold">
                      <span>Disaster Recovery (5%)</span>
                      <span className="font-mono text-gray-800">ETB {sendCbeFee.disasterRecovery.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-gray-800 pt-2 border-t border-emerald-200/50">
                      <span>Total Amount to Debit</span>
                      <span className="font-mono text-emerald-800 font-extrabold text-sm">
                        ETB {sendCbeFee.totalDebited.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <button 
                id="btn-send-submit"
                type="submit" 
                className="w-full bg-emerald-800 hover:bg-emerald-850 text-white font-extrabold py-3 rounded-xl transition shadow-md active:scale-[0.99] cursor-pointer"
              >
                Simulate Direct Transfer
              </button>
            </form>

            {/* Quick add Beneficiary Panel */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <button
                type="button"
                onClick={() => setShowAddBen(!showAddBen)}
                className="flex items-center gap-2 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>{showAddBen ? 'Close Beneficiary Form' : 'Register New Beneficiary'}</span>
              </button>

              {showAddBen && (
                <form onSubmit={handleAddBeneficiary} className="space-y-3 pt-3 mt-3 border-t border-gray-50">
                  <input
                    type="text"
                    placeholder="Beneficiary Full Name"
                    value={newBenName}
                    onChange={(e) => setNewBenName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={newBenAcc}
                    onChange={(e) => setNewBenAcc(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs font-mono"
                    required
                  />
                  <select
                    value={newBenBank}
                    onChange={(e) => setNewBenBank(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2 text-xs"
                  >
                    <option value="Tana Digital Bank">Tana Digital Bank</option>
                    {ETHIOPIAN_BANKS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="w-full bg-emerald-50 text-emerald-800 font-bold py-2 rounded-xl text-xs"
                  >
                    Save Beneficiary
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ================= CBE TRANSFER SCREEN (Screenshot 2 Alignment) ================= */}
        {activeTab === 'transfer' && (
          <div className="space-y-6">
            
            {/* Own Account / Other Account Subtabs */}
            <div className="bg-white p-1 rounded-2xl flex border border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setTransferSubTab('other');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 text-center text-xs font-extrabold rounded-xl transition cursor-pointer ${
                  transferSubTab === 'other'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Other Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setTransferSubTab('own');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 text-center text-xs font-extrabold rounded-xl transition cursor-pointer ${
                  transferSubTab === 'own'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Own Account
              </button>
            </div>

            {/* CBE Transfer Main Card Form */}
            <form id="form-bank-transfer" onSubmit={handleCbeTransferSubmit} className="space-y-4">
              
              {/* FROM ACCOUNT SELECTOR CARD */}
              <div className="bg-gradient-to-br from-emerald-950 to-emerald-850 text-white rounded-3xl p-5 shadow-md border border-emerald-800/20 relative overflow-hidden">
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">From Account</p>
                
                <div className="mt-2.5 flex justify-between items-center">
                  <div className="flex-1">
                    <select
                      value={selectedFromAccount}
                      onChange={(e) => setSelectedFromAccount(e.target.value as 'savings' | 'wadiah')}
                      className="bg-transparent text-sm font-black border-none p-0 pr-6 text-white focus:ring-0 focus:outline-none cursor-pointer font-sans"
                    >
                      <option value="savings" className="bg-emerald-950 text-white">Savings Account - {currentUser.accountNumber.slice(0, 4)}••••{currentUser.accountNumber.slice(-4)}</option>
                      <option value="wadiah" className="bg-emerald-950 text-white">Wadiah Staff Sa - 1000888888888</option>
                    </select>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-200 pointer-events-none rotate-90" />
                </div>

                <div className="mt-3.5 flex justify-between items-center pt-3 border-t border-white/5">
                  <div>
                    <span className="text-xs text-emerald-300 font-bold">Balance</span>
                    <p className="text-xl font-black font-mono mt-0.5">
                      ETB {showFromBalance 
                        ? (selectedFromAccount === 'savings' ? currentUser.balance : 5420.00).toLocaleString(undefined, { minimumFractionDigits: 2 })
                        : '••••••••'
                      }
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFromBalance(!showFromBalance)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition text-emerald-200 cursor-pointer"
                  >
                    {showFromBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* FIELDS AREA */}
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                
                {/* ACCOUNT NUMBER (Other Account Only) */}
                {transferSubTab === 'other' && (
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-bold">Account Number</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-[13px] text-gray-400">
                        <Building className="w-4 h-4" />
                      </div>
                      <input 
                        id="input-transfer-acc"
                        type="text" 
                        placeholder="Enter 13-digit account number"
                        value={transferAccount}
                        onChange={(e) => setTransferAccount(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 pl-10 pr-10 text-sm focus:outline-none focus:border-emerald-800 focus:bg-white transition font-mono font-semibold"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setTransferAccount('1000246810121'); // Prefill Selamawit
                          setSuccessMsg('Scanned Selamawit Account QR Code!');
                        }}
                        className="absolute right-3 top-[11px] p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-emerald-800 transition cursor-pointer"
                        title="Simulate Account Scan"
                      >
                        <Scan className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Account lookup loader / verification display */}
                    {isAccountVerifying && (
                      <p className="text-[11px] text-amber-600 font-bold animate-pulse pl-1">Verifying Account Title...</p>
                    )}
                    {verifiedAccountName && !isAccountVerifying && (
                      <div className="mt-1 flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[11px] py-1 px-2.5 rounded-lg border border-emerald-100/40">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Verified Name: <strong>{verifiedAccountName}</strong></span>
                      </div>
                    )}
                  </div>
                )}

                {/* ACCOUNT HOLDER NAME (Other Account Only) */}
                {transferSubTab === 'other' && (
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-bold">Account Holder Name</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-[13px] text-gray-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input 
                        id="input-transfer-recipient"
                        type="text" 
                        placeholder="Enter recipient's full name"
                        value={transferRecipientName}
                        onChange={(e) => setTransferRecipientName(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 pl-10 text-sm focus:outline-none focus:border-emerald-800 focus:bg-white transition font-semibold"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* TO ACCOUNT (Own Account Only) */}
                {transferSubTab === 'own' && (
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-bold">To Account</label>
                    <select
                      value={selectedFromAccount === 'savings' ? 'wadiah' : 'savings'}
                      disabled
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none font-semibold text-gray-700"
                    >
                      {selectedFromAccount === 'savings' ? (
                        <option>Wadiah Staff Sa - 1000888888888</option>
                      ) : (
                        <option>Savings Account - {currentUser.accountNumber}</option>
                      )}
                    </select>
                  </div>
                )}

                {/* DESTINATION BANK SELECTOR (Other Account Only) */}
                {transferSubTab === 'other' && (
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-bold">Destination Bank</label>
                    <select 
                      id="select-transfer-bank"
                      value={transferBank}
                      onChange={(e) => setTransferBank(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-800 focus:bg-white font-semibold cursor-pointer"
                    >
                      {ETHIOPIAN_BANKS.map((bank) => (
                        <option key={bank} value={bank}>{bank}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* AMOUNT* FIELD */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-bold">Amount*</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-[13px] text-gray-400">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <input 
                      id="input-transfer-amount"
                      type="number" 
                      placeholder="0.00"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 pl-10 pr-10 text-sm focus:outline-none focus:border-emerald-800 focus:bg-white font-mono font-black transition text-gray-900"
                      required
                    />
                    <div className="absolute right-3.5 top-[14px] text-gray-400">
                      <Calculator className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* ADD REMARK TOGGLE (Screenshot 2 Alignment) */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRemarkInput(!showRemarkInput)}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition cursor-pointer"
                  >
                    <span className="text-sm">{showRemarkInput ? '−' : '+'}</span>
                    <span>{showRemarkInput ? 'Hide remark' : 'Add remark'}</span>
                  </button>
                  <p className="text-[10px] text-gray-400 mt-0.5 ml-3 font-semibold">*Default: MB transfer</p>

                  {showRemarkInput && (
                    <div className="mt-2 animate-fade-in">
                      <input 
                        type="text" 
                        placeholder="Enter optional payment remark description"
                        value={remarkText}
                        onChange={(e) => setRemarkText(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-800 focus:bg-white transition font-medium"
                      />
                    </div>
                  )}
                </div>

                {/* CBE SERVICE CHARGE, VAT (15%), DISASTER RECOVERY (5%) & TOTAL COST SUMMARY */}
                {(() => {
                  const amtNum = parseFloat(transferAmount) || 0;
                  const cbeFee = calculateCbeFee(amtNum, 'transfer', transferSubTab === 'own');
                  return (
                    <div className="bg-gray-50 p-3.5 rounded-2xl space-y-1.5 text-xs border border-gray-100">
                      <div className="flex justify-between items-center text-gray-500 font-semibold">
                        <span>CBE Service Charge</span>
                        <span className="font-mono text-gray-700">ETB {cbeFee.serviceCharge.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-500 font-semibold">
                        <span>VAT (15%)</span>
                        <span className="font-mono text-gray-700">ETB {cbeFee.vat.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-500 font-semibold">
                        <span>Disaster Recovery (5%)</span>
                        <span className="font-mono text-gray-700">ETB {cbeFee.disasterRecovery.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center font-bold text-gray-800 pt-2 border-t border-gray-200">
                        <span>Total Amount to Debit</span>
                        <span className="font-mono text-emerald-800 font-extrabold text-sm">
                          ETB {cbeFee.totalDebited.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <button 
                  id="btn-transfer-submit"
                  type="submit" 
                  className="w-full bg-emerald-800 hover:bg-emerald-850 text-white font-extrabold py-3.5 rounded-2xl transition shadow-md active:scale-[0.99] cursor-pointer text-sm"
                >
                  Continue
                </button>
              </div>

            </form>

            {/* TAB SECTION UNDER FORM (Recent Transfers vs Beneficiaries) */}
            {transferSubTab === 'other' && (
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
                <div className="flex bg-gray-50 p-1 rounded-xl gap-1 border border-gray-100/50 mb-4">
                  <button
                    type="button"
                    onClick={() => setTransferListTab('recent')}
                    className={`flex-1 py-1.5 text-center text-[11px] font-extrabold rounded-lg transition cursor-pointer ${
                      transferListTab === 'recent'
                        ? 'bg-white text-emerald-800 shadow-sm border border-gray-100'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Recent Transfers
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferListTab('beneficiaries')}
                    className={`flex-1 py-1.5 text-center text-[11px] font-extrabold rounded-lg transition cursor-pointer ${
                      transferListTab === 'beneficiaries'
                        ? 'bg-white text-emerald-800 shadow-sm border border-gray-100'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Beneficiaries
                  </button>
                </div>

                {/* Recents list rendering */}
                {transferListTab === 'recent' && (
                  <div className="space-y-2.5">
                    {recentTransfers.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 py-3 font-semibold">No recent transfers.</p>
                    ) : (
                      recentTransfers.map((rt) => (
                        <div key={rt.id} className="flex justify-between items-center p-2 hover:bg-gray-50/50 rounded-2xl transition border border-transparent hover:border-gray-100">
                          <button
                            type="button"
                            onClick={() => prefillFromContact(rt.name, rt.accountNumber)}
                            className="flex items-center gap-3 text-left flex-1"
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${rt.color}`}>
                              {rt.initial}
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-800 leading-none">{rt.name}</p>
                              <p className="text-[10px] text-gray-400 font-mono mt-1 font-bold">
                                {rt.accountNumber.slice(0, 4)}••••{rt.accountNumber.slice(-4)}
                              </p>
                            </div>
                          </button>
                          
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setRecentTransfers(prev => prev.filter(item => item.id !== rt.id))}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Delete recent entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => prefillFromContact(rt.name, rt.accountNumber)}
                              className="p-1.5 text-gray-400 hover:text-emerald-800 transition cursor-pointer"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Saved beneficiaries rendering */}
                {transferListTab === 'beneficiaries' && (
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-2 mb-2">
                      <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Registered Beneficiaries</span>
                      <button
                        type="button"
                        onClick={() => setShowAddBen(!showAddBen)}
                        className="text-[10px] text-emerald-800 font-black hover:underline cursor-pointer"
                      >
                        + Add New
                      </button>
                    </div>

                    {showAddBen && (
                      <form onSubmit={handleAddBeneficiary} className="bg-gray-50/50 p-3 rounded-2xl space-y-2 border border-gray-100 mb-3 animate-fade-in">
                        <input
                          type="text"
                          placeholder="Beneficiary Full Name"
                          value={newBenName}
                          onChange={(e) => setNewBenName(e.target.value)}
                          className="w-full bg-white border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Account Number"
                          value={newBenAcc}
                          onChange={(e) => setNewBenAcc(e.target.value)}
                          className="w-full bg-white border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none"
                          required
                        />
                        <select
                          value={newBenBank}
                          onChange={(e) => setNewBenBank(e.target.value)}
                          className="w-full bg-white border border-gray-100 rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer"
                        >
                          {ETHIOPIAN_BANKS.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="w-full bg-emerald-800 text-white font-extrabold py-2 rounded-xl text-xs"
                        >
                          Save Beneficiary Contact
                        </button>
                      </form>
                    )}

                    {beneficiaries.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 py-3 font-semibold">No beneficiaries saved yet.</p>
                    ) : (
                      beneficiaries.map((b) => (
                        <button
                          type="button"
                          key={b.id}
                          onClick={() => prefillFromContact(b.name, b.accountNumber, b.bankName)}
                          className="w-full flex items-center gap-3 p-2 hover:bg-gray-50/50 rounded-2xl transition text-left border border-transparent hover:border-gray-100 cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center font-black text-xs">
                            {b.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-black text-gray-800 leading-none">{b.name}</p>
                            <p className="text-[10px] text-gray-400 font-medium mt-1">
                              {b.bankName} &bull; <span className="font-mono">{b.accountNumber}</span>
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= PAY MERCHANT SCREEN (Screenshot 1 Alignment) ================= */}
        {activeTab === 'merchant' && (
          <div className="space-y-6">
            
            {/* Customer initiated vs Dynamic ID tabs */}
            <div className="bg-white p-1 rounded-2xl flex border border-gray-100">
              <button
                type="button"
                onClick={() => setMerchantSubTab('customer')}
                className={`flex-1 py-2 text-center text-xs font-extrabold rounded-xl transition cursor-pointer ${
                  merchantSubTab === 'customer'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Customer initiated
              </button>
              <button
                type="button"
                onClick={() => setMerchantSubTab('dynamic')}
                className={`flex-1 py-2 text-center text-xs font-extrabold rounded-xl transition cursor-pointer ${
                  merchantSubTab === 'dynamic'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Dynamic ID
              </button>
            </div>

            <p className="text-xs text-gray-500 font-semibold text-center py-1">
              {merchantStep === 1 ? 'Fill the fields to process payment.' : 'Confirm payment details below.'}
            </p>

            {/* Merchant Payment Form */}
            <form onSubmit={handleMerchantPaySubmit} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              
              {merchantStep === 1 ? (
                // STEP 1: Enter codes
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-bold">Merchant code*</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-[13px] text-gray-400 font-black font-mono">
                        =
                      </div>
                      <input 
                        type="text" 
                        placeholder="e.g. MC7821, MC9042"
                        value={merchantCode}
                        onChange={(e) => setMerchantCode(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 pl-8 text-sm focus:outline-none focus:border-emerald-800 focus:bg-white font-mono font-bold transition uppercase"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium pl-1">MC7821: Tana Cafe, MC9042: Ethio Mart</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-bold">Operator code</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-[13px] text-gray-400 font-black font-mono">
                        =
                      </div>
                      <input 
                        type="text" 
                        placeholder="Enter optional operator code"
                        value={operatorCode}
                        onChange={(e) => setOperatorCode(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 pl-8 text-sm focus:outline-none focus:border-emerald-800 focus:bg-white font-mono font-bold transition uppercase"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-emerald-800 hover:bg-emerald-850 text-white font-extrabold py-3.5 rounded-2xl transition shadow-md active:scale-[0.99] cursor-pointer text-sm mt-2"
                  >
                    Continue
                  </button>
                </div>
              ) : (
                // STEP 2: Enter Amount & Pay
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100/50 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-black text-emerald-800/80">Paying Merchant</p>
                      <p className="text-sm font-black text-emerald-950 mt-1">{verifiedMerchantName}</p>
                      <p className="text-[11px] font-mono text-gray-500 mt-0.5">Code: {merchantCode.toUpperCase()}</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs">
                      {verifiedMerchantName.slice(0, 2).toUpperCase()}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-bold">Amount to Pay (ETB)*</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-[13px] text-gray-400">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <input 
                        type="number" 
                        placeholder="0.00"
                        value={merchantPayAmount}
                        onChange={(e) => setMerchantPayAmount(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 pl-10 text-sm focus:outline-none focus:border-emerald-800 focus:bg-white font-mono font-black transition text-gray-900"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 font-bold">Remark / Customer Reference</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Table 5, receipt-12, dinner"
                      value={merchantRemark}
                      onChange={(e) => setMerchantRemark(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-800 focus:bg-white transition"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setMerchantStep(1)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-extrabold py-3 rounded-2xl transition cursor-pointer text-xs"
                    >
                      Back
                    </button>
                    <button 
                      type="submit" 
                      className="flex-[2] bg-emerald-800 hover:bg-emerald-850 text-white font-extrabold py-3 rounded-2xl transition shadow-md cursor-pointer text-xs"
                    >
                      Pay Merchant Now
                    </button>
                  </div>
                </div>
              )}

            </form>
          </div>
        )}

        {/* ================= RECEIVE MONEY SCREEN (QR Generator) ================= */}
        {activeTab === 'receive' && (
          <div className="space-y-6">
            {/* Show Account Details QR */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center space-y-4">
              <h3 className="text-sm font-extrabold text-emerald-950 uppercase tracking-wider">Your Digital Wallet QR</h3>
              
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 inline-block">
                <div className="w-40 h-40 bg-white flex items-center justify-center p-2 border border-emerald-800/20 rounded-xl overflow-hidden relative">
                  {/* Visual simulated QR */}
                  <div className="grid grid-cols-6 gap-1 w-full h-full opacity-80">
                    {Array.from({ length: 36 }).map((_, i) => {
                      const isFilled = (i * 7 % 11 === 0 && i % 4 !== 0) || i < 4 || i === 5 || i === 30 || i === 35;
                      return (
                        <div key={i} className={`rounded ${isFilled ? 'bg-emerald-900' : 'bg-transparent'}`} />
                      );
                    })}
                  </div>
                  <QrCode className="absolute w-12 h-12 text-emerald-950 m-auto inset-0 p-2 bg-white rounded-lg shadow-md border border-gray-100" />
                </div>
              </div>

              <div>
                <p className="text-sm font-extrabold text-gray-900">{currentUser.name}</p>
                <p className="text-xs text-gray-400 mt-1 font-mono">{currentUser.accountNumber}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(currentUser.accountNumber);
                    setSuccessMsg('Account number copied!');
                  }}
                  className="flex items-center justify-center gap-1.5 p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMsg('Simulated Account Details QR shared successfully!');
                  }}
                  className="flex items-center justify-center gap-1.5 p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share QR</span>
                </button>
              </div>
            </div>

            {/* Generate Custom Request */}
            <form onSubmit={handleGenerateRequest} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="text-sm font-extrabold text-emerald-950 uppercase tracking-wider">Generate Payment Request</h3>
              
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-bold">Request Amount (ETB)</label>
                <input 
                  type="number" 
                  placeholder="Enter requested amount"
                  value={receiveAmountRequest}
                  onChange={(e) => setReceiveAmountRequest(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-800 focus:bg-white transition font-mono font-bold"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-emerald-800 hover:bg-emerald-850 text-white font-extrabold py-3 rounded-xl transition shadow-md"
              >
                Compile Payment Request
              </button>

              {generatedRequestLink && (
                <div className="pt-3 border-t border-gray-50 space-y-2.5">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-[10px] uppercase font-bold text-emerald-800">Dynamic Payment QR Compiled</p>
                    <p className="text-xs text-emerald-700 mt-1 leading-normal font-mono text-ellipsis overflow-hidden">
                      {generatedRequestLink}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedRequestLink);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="w-full bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Payment Request Link'}</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* ================= AIRTIME & DATA SCREEN ================= */}
        {activeTab === 'airtime' && (
          <form id="form-airtime" onSubmit={handleAirtimeSubmit} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-sm font-extrabold text-emerald-950 uppercase tracking-wider">Airtime &amp; Data Recharge</h3>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-bold">Select Mobile Carrier Network</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAirtimeNetwork('Ethio Telecom')}
                  className={`py-2 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    airtimeNetwork === 'Ethio Telecom' 
                      ? 'bg-emerald-50 border-emerald-800 text-emerald-850 shadow-sm' 
                      : 'bg-gray-50 border-gray-150 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-sm">Ethio Telecom</span>
                  <span className="text-[9px] opacity-70">Ethio telecom</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAirtimeNetwork('Safaricom')}
                  className={`py-2 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    airtimeNetwork === 'Safaricom' 
                      ? 'bg-emerald-50 border-emerald-800 text-emerald-850 shadow-sm' 
                      : 'bg-gray-50 border-gray-150 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-sm">Safaricom</span>
                  <span className="text-[9px] opacity-70">Safaricom Ethiopia</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-bold">Recipient Phone Number</label>
              <div className="relative">
                <span className="absolute left-4 top-[11.5px] text-xs font-bold text-gray-400 font-mono">+251</span>
                <input 
                  id="input-airtime-phone"
                  type="tel" 
                  placeholder="911223344"
                  value={airtimePhone}
                  onChange={(e) => setAirtimePhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm pl-16 focus:outline-none focus:border-emerald-800 focus:bg-white transition font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-bold">Purchase Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAirtimeType('airtime')}
                  className={`py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    airtimeType === 'airtime' 
                      ? 'bg-emerald-800 border-emerald-800 text-white' 
                      : 'bg-gray-50 border-gray-100 text-gray-500'
                  }`}
                >
                  Airtime Recharge
                </button>
                <button
                  type="button"
                  onClick={() => setAirtimeType('data')}
                  className={`py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    airtimeType === 'data' 
                      ? 'bg-emerald-800 border-emerald-800 text-white' 
                      : 'bg-gray-50 border-gray-100 text-gray-500'
                  }`}
                >
                  Data Packages
                </button>
              </div>
            </div>

            {airtimeType === 'airtime' ? (
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-bold">Airtime Amount (ETB)</label>
                <input 
                  id="input-airtime-amount"
                  type="number" 
                  placeholder="Enter recharge amount"
                  value={airtimeAmount}
                  onChange={(e) => setAirtimeAmount(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-800 focus:bg-white font-mono font-bold transition"
                  required
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-bold">Select Active Data Package</label>
                <select 
                  value={selectedDataPackage}
                  onChange={(e) => setSelectedDataPackage(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer"
                >
                  <option value="Daily 1GB - 50 ETB">Daily 1GB - 50 ETB</option>
                  <option value="Weekly 5GB Unlimited - 250 ETB">Weekly 5GB Unlimited - 250 ETB</option>
                  <option value="Monthly 20GB YouTube Bundle - 450 ETB">Monthly 20GB YouTube Bundle - 450 ETB</option>
                  <option value="Monthly Unlimited Premium - 999 ETB">Monthly Unlimited Premium - 999 ETB</option>
                </select>
              </div>
            )}

            <button 
              id="btn-airtime-submit"
              type="submit" 
              className="w-full bg-emerald-800 hover:bg-emerald-850 text-white font-extrabold py-3 rounded-xl transition shadow-md active:scale-[0.99] cursor-pointer"
            >
              Authorize Purchase
            </button>
          </form>
        )}

      </div>

      {/* FLOATING ACTION QR SCANNER BUTTON (Bottom-Right, Screenshot 1 Alignment) */}
      {(activeTab === 'merchant' || activeTab === 'transfer') && (
        <button
          id="btn-floating-qr-scan"
          type="button"
          onClick={() => setShowScanner(true)}
          className="fixed bottom-24 right-5 md:absolute md:bottom-28 md:right-5 bg-emerald-800 hover:bg-emerald-700 text-white p-4 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition z-45 border border-emerald-600/30 cursor-pointer"
          title="Open QR Scanner"
        >
          <Scan className="w-6 h-6 text-white" />
        </button>
      )}

      {/* ================= SIMULATED INTERACTIVE QR CODE SCANNER OVERLAY ================= */}
      {showScanner && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 shadow-2xl relative text-center">
            
            <button
              type="button"
              onClick={() => setShowScanner(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-2 mb-2">
              <QrCode className="w-6 h-6 text-emerald-400 animate-pulse" />
              <h3 className="text-base font-extrabold text-white">Live CBE Scanner Node</h3>
            </div>
            
            <p className="text-[11px] text-gray-400 max-w-[280px] mx-auto mb-6">
              Align a Commercial Bank of Ethiopia Merchant code or Customer account QR inside the frame.
            </p>

            {/* SCANNING CAMERA VIEWPORT VIEW */}
            <div className="w-48 h-48 mx-auto bg-slate-950 rounded-2xl border-2 border-emerald-500/30 relative flex items-center justify-center overflow-hidden mb-6 shadow-inner">
              
              {/* Pulsing scanning red line laser */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500/80 shadow-[0_0_8px_#ef4444] animate-[bounce_2s_infinite] z-10" />

              {/* Viewfinder frame corners */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />

              <div className="text-center p-3 opacity-60">
                <Scan className="w-10 h-10 text-emerald-400 mx-auto animate-pulse mb-2" />
                <span className="text-[9px] font-mono font-bold tracking-widest text-emerald-400 block">VIEWFINDER ACTIVE</span>
              </div>
            </div>

            {/* QUICK MOCK QR CODES FOR TESTING */}
            <div className="space-y-2 text-left bg-slate-950/60 p-3 rounded-2xl border border-slate-850">
              <p className="text-[9px] font-black text-emerald-400/80 uppercase tracking-widest text-center border-b border-slate-800 pb-1.5 mb-2">
                Click mock tag below to simulate scan
              </p>
              
              <button
                type="button"
                onClick={() => handleSimulateScan('merchant_cafe')}
                className="w-full text-left flex items-center justify-between text-xs font-bold text-gray-300 hover:text-white py-1.5 px-2 bg-slate-900/50 hover:bg-slate-800 rounded-xl border border-slate-800/80 cursor-pointer transition"
              >
                <span>🍔 Scan Cafe Merchant QR</span>
                <span className="text-[9px] font-mono text-emerald-400">MC7821</span>
              </button>

              <button
                type="button"
                onClick={() => handleSimulateScan('merchant_mart')}
                className="w-full text-left flex items-center justify-between text-xs font-bold text-gray-300 hover:text-white py-1.5 px-2 bg-slate-900/50 hover:bg-slate-800 rounded-xl border border-slate-800/80 cursor-pointer transition"
              >
                <span>🛒 Scan Supermarket Merchant QR</span>
                <span className="text-[9px] font-mono text-emerald-400">MC9042</span>
              </button>

              <button
                type="button"
                onClick={() => handleSimulateScan('account_selam')}
                className="w-full text-left flex items-center justify-between text-xs font-bold text-gray-300 hover:text-white py-1.5 px-2 bg-slate-900/50 hover:bg-slate-800 rounded-xl border border-slate-800/80 cursor-pointer transition"
              >
                <span>👤 Scan Selamawit Account QR</span>
                <span className="text-[9px] font-mono text-emerald-400">1000••••0121</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowScanner(false)}
              className="w-full mt-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-xs font-bold rounded-xl transition text-gray-300 cursor-pointer"
            >
              Cancel Scanning
            </button>

          </div>
        </div>
      )}

      {/* ================= SECURITY TRANSACTIONS PIN GATE MODAL ================= */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-center relative animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-extrabold text-emerald-950 mb-1.5 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 animate-pulse" />
              <span>Authorize Ledger Gate</span>
            </h3>
            <p className="text-xs text-gray-500 max-w-[240px] mx-auto mb-4">
              Enter your private 4-digit security PIN passcode to sign this digital banking transaction.
            </p>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="flex justify-center gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-10 h-10 rounded-full border-2 transition ${
                      enteredPin.length > i 
                        ? 'bg-emerald-800 border-emerald-800 scale-105 shadow-md' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                ))}
              </div>

              {/* Custom numerical keypad inside PIN verify */}
              <div className="grid grid-cols-3 gap-2.5 pt-3 max-w-[240px] mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (enteredPin.length < 4) setEnteredPin(prev => prev + num);
                    }}
                    className="bg-gray-50 hover:bg-gray-100 py-2 rounded-xl text-lg font-black font-mono border border-gray-100 cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setEnteredPin('')}
                  className="text-xs font-bold text-red-600 bg-gray-50 hover:bg-gray-100 rounded-xl py-2 flex items-center justify-center cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (enteredPin.length < 4) setEnteredPin(prev => prev + '0');
                  }}
                  className="bg-gray-50 hover:bg-gray-100 py-2 rounded-xl text-lg font-black font-mono border border-gray-100 cursor-pointer"
                >
                  0
                </button>
                <button
                  type="submit"
                  className="bg-emerald-800 text-white font-bold rounded-xl text-xs hover:bg-emerald-900 transition flex items-center justify-center cursor-pointer"
                >
                  OK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

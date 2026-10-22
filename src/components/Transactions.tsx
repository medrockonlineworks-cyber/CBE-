import React, { useState, useEffect } from 'react';
import { UserProfile, Transaction, Beneficiary, BankAccount, RegisteredAccountInfo } from '../types';
import { LocalDb } from '../lib/mockData';
import { calculateCbeFee, CBE_TO_CBE_SERVICE_CHARGES } from '../lib/cbeTariff';
import EthiopianNameAutocomplete, { EthiopianThreePartNameInput } from './EthiopianNameAutocomplete';
import AccountCard from './AccountCard';
import TransactionDetailModal from './TransactionDetailModal';
import { RegisteredAccountsModal } from './RegisteredAccountsModal';
import { RefreshIcon, AccountScanIcon, AccountSearchDirectoryIcon } from './CbeCustomIcons';
import { 
  Send, 
  ArrowLeftRight, 
  ArrowDownLeft, 
  ArrowUpRight,
  PhoneCall, 
  Check, 
  Copy, 
  AlertCircle, 
  TrendingDown, 
  TrendingUp,
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
  ChevronLeft,
  User,
  SlidersHorizontal,
  RotateCw,
  Receipt as ReceiptIcon,
  Plus,
  Layers
} from 'lucide-react';

interface TransactionsProps {
  currentUser: UserProfile;
  onTransactionComplete: (tx: Transaction) => void;
  onSelectTransaction?: (tx: Transaction) => void;
  onBack?: () => void;
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

export default function Transactions({ currentUser, onTransactionComplete, onSelectTransaction, onBack, initialTab }: TransactionsProps) {
  // View mode: 'records' | 'transfer' (defaults to independent CBE Transfer)
  const [viewMode, setViewMode] = useState<'records' | 'transfer'>('transfer');
  // Direct filter tabs requested by user: 'all' | 'credit' | 'debit'
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'pending' | 'failed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionsList, setTransactionsList] = useState<Transaction[]>([]);
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState('01 Jul 2026 • 10:14 AM');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTxDetail, setSelectedTxDetail] = useState<Transaction | null>(null);

  const [activeTab, setActiveTab] = useState<TxModuleTab>(initialTab || 'transfer');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pin Verification State
  const [showPinModal, setShowPinModal] = useState(false);
  const [showTariffModal, setShowTariffModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Beneficiaries list
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [showAddBen, setShowAddBen] = useState(false);
  const [newBenName, setNewBenName] = useState('');
  const [newBenAcc, setNewBenAcc] = useState('');
  const [newBenBank, setNewBenBank] = useState('Tana Digital Bank');

  // Load Beneficiaries and Transactions
  useEffect(() => {
    setBeneficiaries(LocalDb.getBeneficiaries(currentUser.id));
    setCustomLogoUrl(LocalDb.getCustomBankLogo());
    loadTransactions();

    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      };
      setCurrentDateTime(now.toLocaleDateString('en-GB', options).replace(',', ' •'));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const loadTransactions = () => {
    const list = LocalDb.getTransactions();
    const cleanUserAcc = (currentUser.accountNumber || '').replace(/\D/g, '');
    const userAccs = LocalDb.getUserAccounts(currentUser.id).map(a => a.accountNumber.replace(/\D/g, ''));
    userAccs.push(cleanUserAcc);

    const filtered = list.filter(tx => {
      const sAcc = (tx.senderAccount || '').replace(/\D/g, '');
      const rAcc = (tx.recipientAccount || '').replace(/\D/g, '');
      const isSender = userAccs.includes(sAcc) || tx.senderId === currentUser.id;
      const isRecipient = userAccs.includes(rAcc) || tx.recipientId === currentUser.id;

      const isPrimaryUser = currentUser.id === 'user_1' || currentUser.id === 'user_admin' || userAccs.includes('1000419524747') || userAccs.includes('1000284758657');
      const isLegacyPrimaryTx = isPrimaryUser && (sAcc === '1000284758657' || rAcc === '1000284758657' || tx.senderId === 'user_1' || tx.recipientId === 'user_1');

      return isSender || isRecipient || isLegacyPrimaryTx;
    });

    setTransactionsList(
      filtered.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (isNaN(timeA) || isNaN(timeB)) {
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        }
        return timeB - timeA;
      })
    );
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadTransactions();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Set active tab if passed from parent
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else {
      setActiveTab('transfer');
    }
    setViewMode('transfer');
    setErrorMsg('');
    setSuccessMsg('');
  }, [initialTab]);

  // Form Fields - Send Money
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendRecipientName, setSendRecipientName] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendDesc, setSendDesc] = useState('');

  // Form Fields - CBE / Bank Transfer (Screenshot 2 Alignment)
  const [transferSubTab, setTransferSubTab] = useState<'other' | 'own'>('other');
  
  // User's Multiple Bank Accounts
  const [userAccounts, setUserAccounts] = useState<BankAccount[]>(() => LocalDb.getUserAccounts(currentUser.id));
  const [selectedFromAccId, setSelectedFromAccId] = useState<string>(() => {
    const accs = LocalDb.getUserAccounts(currentUser.id);
    const primary = accs.find(a => a.isPrimary) || accs[0];
    return primary ? primary.id : '';
  });
  const [selectedToAccId, setSelectedToAccId] = useState<string>(() => {
    const accs = LocalDb.getUserAccounts(currentUser.id);
    const nonPrimary = accs.find(a => !a.isPrimary) || accs[1] || accs[0];
    return nonPrimary ? nonPrimary.id : '';
  });
  const [showFromBalance, setShowFromBalance] = useState<boolean>(true);

  // Recipient Search & Auto-Fill
  const [searchRecipientQuery, setSearchRecipientQuery] = useState('');
  const [selectedRegisteredRecipient, setSelectedRegisteredRecipient] = useState<RegisteredAccountInfo | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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

  // Reload accounts when updated
  const refreshAccounts = () => {
    const updated = LocalDb.getUserAccounts(currentUser.id);
    setUserAccounts(updated);
    if (!updated.some(a => a.id === selectedFromAccId) && updated.length > 0) {
      setSelectedFromAccId(updated[0].id);
    }
  };

  useEffect(() => {
    const handleSync = () => {
      refreshAccounts();
    };
    window.addEventListener('cbe_balance_updated' as any, handleSync);
    window.addEventListener('cbe_transaction_completed' as any, handleSync);
    window.addEventListener('cbe_accounts_updated' as any, handleSync);
    return () => {
      window.removeEventListener('cbe_balance_updated' as any, handleSync);
      window.removeEventListener('cbe_transaction_completed' as any, handleSync);
      window.removeEventListener('cbe_accounts_updated' as any, handleSync);
    };
  }, []);

  const selectedFromAccountObj = userAccounts.find(a => a.id === selectedFromAccId) || userAccounts[0];
  const selectedToAccountObj = userAccounts.find(a => a.id === selectedToAccId) || userAccounts.find(a => a.id !== selectedFromAccId) || userAccounts[1];

  // Dynamic search results for registered recipients
  const matchedRegisteredAccounts = React.useMemo(() => {
    if (!searchRecipientQuery.trim()) return [];
    return LocalDb.searchRegisteredAccounts(searchRecipientQuery).filter(
      acc => acc.accountNumber !== selectedFromAccountObj?.accountNumber
    );
  }, [searchRecipientQuery, selectedFromAccountObj]);

  // Mock Recent Transfers list
  const [recentTransfers, setRecentTransfers] = useState([
    { id: 'rt_1', name: 'Selamawit Tekle Haile', accountNumber: '1000246810121', initial: 'ST', color: 'bg-purple-100 text-purple-700 border border-purple-200' },
    { id: 'rt_2', name: 'Kidus Yohannes', accountNumber: '1000132049581', initial: 'KY', color: 'bg-amber-100 text-amber-700 border border-amber-200' },
    { id: 'rt_3', name: 'Desta Kassahun', accountNumber: '1000234059681', initial: 'DK', color: 'bg-rose-100 text-rose-700 border border-rose-200' }
  ]);

  // Select a registered recipient from search/recent/directory modal
  const handleSelectRecipient = (recip: RegisteredAccountInfo | { name?: string; accountName?: string; accountNumber: string; bankName?: string }) => {
    const accName = ('accountName' in recip && recip.accountName) ? recip.accountName : ('name' in recip && recip.name) ? recip.name : 'Registered CBE Recipient';
    const fullInfo: RegisteredAccountInfo = {
      accountNumber: recip.accountNumber,
      accountName: accName,
      bankName: recip.bankName || 'Commercial Bank of Ethiopia (CBE)',
      isVerified: true
    };
    setSelectedRegisteredRecipient(fullInfo);
    setTransferAccount(fullInfo.accountNumber);
    setTransferRecipientName(fullInfo.accountName);
    setTransferBank(fullInfo.bankName);
    setSendRecipient(fullInfo.accountNumber);
    setSendRecipientName(fullInfo.accountName);
    setVerifiedAccountName(fullInfo.accountName);
    setIsAccountVerifying(false);
    setSearchRecipientQuery('');
    setIsSearchFocused(false);
    setErrorMsg('');
    setSuccessMsg(`Selected registered account: ${fullInfo.accountName} (${fullInfo.accountNumber})`);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  // Registered Accounts Directory Modal State
  const [showRegisteredDirectoryModal, setShowRegisteredDirectoryModal] = useState(false);

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

  // Auto look up names for accounts when typed (Strictly 13 digits)
  useEffect(() => {
    const cleanAcc = transferAccount.replace(/\D/g, '');
    if (cleanAcc.length === 13) {
      setIsAccountVerifying(true);
      const timer = setTimeout(() => {
        setIsAccountVerifying(false);
        const matched = LocalDb.findRegisteredAccount(cleanAcc);
        if (matched) {
          setVerifiedAccountName(matched.accountName);
          setSelectedRegisteredRecipient(matched);
          setTransferRecipientName(matched.accountName);
          setTransferBank(matched.bankName);
        } else {
          setVerifiedAccountName('External CBE Account Holder');
        }
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setIsAccountVerifying(false);
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
    const sourceBalance = selectedFromAccountObj ? selectedFromAccountObj.balance : currentUser.balance;
    const totalCost = cbeFee.totalDebited;

    if (totalCost > sourceBalance) {
      setErrorMsg(`Insufficient funds in ${selectedFromAccountObj?.accountName || 'selected account'}. Total required: ETB ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} (Balance: ETB ${sourceBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}).`);
      return;
    }

    if (isOwn) {
      if (!selectedToAccountObj || selectedToAccountObj.id === selectedFromAccountObj?.id) {
        setErrorMsg('Please select a different destination account.');
        return;
      }
    } else {
      const cleanAcc = transferAccount.replace(/\D/g, '');
      if (cleanAcc.length !== 13) {
        setErrorMsg(`Bank account number must be exactly 13 digits (currently entered ${cleanAcc.length} digits). It cannot be less than or greater than 13 digits.`);
        return;
      }
    }

    requestPinAuthorize(() => {
      try {
        if (transferSubTab === 'own') {
          // Own account transfer
          const result = LocalDb.transferBetweenOwnAccounts(
            currentUser.id,
            selectedFromAccountObj.id,
            selectedToAccountObj.id,
            amountNum,
            remarkText || 'Transfer Between Own Accounts'
          );
          
          refreshAccounts();
          onTransactionComplete(result.tx);
        } else {
          // Other account transfer
          const finalRecipientName = selectedRegisteredRecipient?.accountName || transferRecipientName || 'CBE Recipient';
          const finalRecipientAccount = selectedRegisteredRecipient?.accountNumber || transferAccount;
          const finalRecipientBank = selectedRegisteredRecipient?.bankName || transferBank;

          const tx = LocalDb.createTransaction(
            'transfer',
            currentUser.id,
            amountNum,
            cbeFee.serviceCharge,
            finalRecipientName,
            finalRecipientAccount,
            finalRecipientBank,
            remarkText || 'MB transfer',
            false,
            selectedFromAccountObj?.id
          );

          // Add to recent list dynamically if not already there
          const exists = recentTransfers.some(rt => rt.accountNumber === finalRecipientAccount);
          if (!exists) {
            const initials = finalRecipientName
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);
            setRecentTransfers(prev => [
              { id: 'rt_' + Date.now(), name: finalRecipientName, accountNumber: finalRecipientAccount, initial: initials || 'AC', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
              ...prev
            ]);
          }

          refreshAccounts();
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
    setErrorMsg('');
    if (!newBenName.trim() || !newBenAcc.trim()) return;

    const cleanAcc = newBenAcc.replace(/\D/g, '');
    if (cleanAcc.length !== 13) {
      setErrorMsg(`Beneficiary bank account must be exactly 13 digits (entered ${cleanAcc.length} digits).`);
      return;
    }

    LocalDb.addBeneficiary({
      userId: currentUser.id,
      name: newBenName.trim(),
      accountNumber: cleanAcc,
      bankName: newBenBank
    });

    setBeneficiaries(LocalDb.getBeneficiaries(currentUser.id));
    setNewBenName('');
    setNewBenAcc('');
    setShowAddBen(false);
    setSuccessMsg('Beneficiary saved successfully with valid 13-digit CBE account!');
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

  // Check if a transaction is a credit (inflow/received) or debit (outflow/sent)
  const isCreditTx = (t: Transaction) => {
    if (t.type === 'receive') return true;
    if (t.recipientAccount === currentUser.accountNumber) return true;
    if (t.recipientId === currentUser.id && t.senderId !== currentUser.id) return true;
    return false;
  };

  const filteredRecords = transactionsList
    .filter((t) => {
      const isCredit = isCreditTx(t);

      if (filterType === 'credit' && !isCredit) return false;
      if (filterType === 'debit' && isCredit) return false;

      if (statusFilter !== 'all' && t.status !== statusFilter) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesRecipient = (t.recipientName || '').toLowerCase().includes(term);
        const matchesSender = (t.senderName || '').toLowerCase().includes(term);
        const matchesAccount = (t.recipientAccount || '').includes(term) || (t.senderAccount || '').includes(term);
        const matchesRef = (t.reference || '').toLowerCase().includes(term) || (t.id || '').toLowerCase().includes(term);
        const matchesDesc = (t.description || '').toLowerCase().includes(term);
        if (!matchesRecipient && !matchesSender && !matchesAccount && !matchesRef && !matchesDesc) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      if (isNaN(timeA) || isNaN(timeB)) {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      return timeB - timeA;
    });

  const totalCreditCount = transactionsList.filter(t => isCreditTx(t)).length;
  const totalDebitCount = transactionsList.filter(t => !isCreditTx(t)).length;

  const totalCreditAmount = transactionsList
    .filter(t => isCreditTx(t) && t.status === 'success')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebitAmount = transactionsList
    .filter(t => !isCreditTx(t) && t.status === 'success')
    .reduce((sum, t) => sum + t.amount + (t.fee || 0), 0);

  return (
    <div id="transactions-screen" className="min-h-full w-full bg-[#F7F7F7] font-sans relative flex flex-col justify-between overflow-x-hidden text-gray-900 pb-28 select-none">
      
      {/* 1. HERO BACKGROUND WITH SMOOTH CURVED WAVE TRANSITION */}
      <div 
        className="hero-background absolute top-0 left-0 right-0 h-[280px] sm:h-[300px] pointer-events-none z-0 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #70189F 0%, #8420AE 55%, #8E29B9 100%)',
        }}
      >
        {/* Soft Ambient Glow Elements */}
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute top-20 -right-20 w-80 h-80 rounded-full bg-[#8E29B9]/30 blur-3xl pointer-events-none" />

        {/* SVG Smooth Curved Transition Wave */}
        <svg
          className="hero-curve absolute bottom-0 left-0 w-full h-[140px] sm:h-[160px] text-[#F7F7F7]"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          fill="currentColor"
        >
          <path d="M0,192L48,181.3C96,171,192,149,288,160C384,171,480,213,576,224C672,235,768,213,864,186.7C960,160,1056,128,1152,122.7C1248,117,1344,139,1392,149.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
      </div>

      {/* 2. TOP HEADER (Independent CBE Transfer Header) */}
      <div className="relative z-10 flex flex-col w-full">
        <div className="px-5 pt-4 pb-2 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                id="btn-transfer-back-home"
                type="button"
                onClick={onBack}
                className="p-1.5 -ml-1.5 rounded-full hover:bg-white/10 active:scale-95 transition text-white cursor-pointer flex items-center gap-0.5"
                title="Back to Home"
                aria-label="Back to Home"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-sm">
              <ArrowLeftRight className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-wide">CBE Transfer</h1>
              <p className="text-[10px] text-purple-200">{currentDateTime}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-refresh-transactions"
              type="button"
              onClick={handleRefresh}
              className={`p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer ${isRefreshing ? 'animate-spin' : ''}`}
              title="Refresh balances"
            >
              <RefreshIcon size={18} />
            </button>
          </div>
        </div>

        {/* 3. EXACT ACCOUNT CARD (Without changing the card) */}
        <main className="w-full mt-2 sm:mt-3 flex flex-col">
          <AccountCard
            bankName="Commercial Bank of Ethiopia"
            slogan="The bank you can always rely on!"
            balance={selectedFromAccountObj ? selectedFromAccountObj.balance : currentUser.balance}
            currency={currentUser.currency || 'ETB'}
            accountType={selectedFromAccountObj?.accountType === 'checking' ? 'Current Account' : 'Saving Account'}
            accountNumber={selectedFromAccountObj ? selectedFromAccountObj.accountNumber : currentUser.accountNumber}
            dateTimeString={currentDateTime}
            showBalanceDefault={false}
            customLogoUrl={customLogoUrl}
          />

          {/* Error/Success banners */}
          <div className="max-w-md mx-auto w-full px-4 mt-3">
            {errorMsg && (
              <div className="mb-2 bg-red-500/10 border border-red-500/20 text-red-800 text-xs py-2 px-3 rounded-2xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs py-2 px-3 rounded-2xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>

          {/* 4. MAIN CONTENT BELOW THE CARD */}
          <div className="w-full max-w-md mx-auto px-4 mt-2 space-y-3">
            {viewMode === 'records' ? (
              <>
                {/* 3 Direct Filter Tabs: ALL, CREDIT, DEBIT */}
                <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex gap-1.5">
                  <button
                    id="btn-tab-filter-all"
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      filterType === 'all'
                        ? 'bg-[#70189F] text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>All</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      filterType === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {transactionsList.length}
                    </span>
                  </button>

                  <button
                    id="btn-tab-filter-credit"
                    type="button"
                    onClick={() => setFilterType('credit')}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      filterType === 'credit'
                        ? 'bg-emerald-700 text-white shadow-md'
                        : 'text-emerald-800 hover:bg-emerald-50/60'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Credit</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      filterType === 'credit' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {totalCreditCount}
                    </span>
                  </button>

                  <button
                    id="btn-tab-filter-debit"
                    type="button"
                    onClick={() => setFilterType('debit')}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      filterType === 'debit'
                        ? 'bg-rose-700 text-white shadow-md'
                        : 'text-rose-800 hover:bg-rose-50/60'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                    <span>Debit</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      filterType === 'debit' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {totalDebitCount}
                    </span>
                  </button>
                </div>

                {/* Summary Inflow / Outflow Metric Cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-3 rounded-2xl border border-emerald-200/60 flex items-center gap-2.5 shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                      <ArrowDownLeft className="w-5 h-5 stroke-[2.4]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-extrabold text-emerald-900 uppercase tracking-tight">Credit (Received)</p>
                      <p className="text-xs sm:text-sm font-black font-mono text-emerald-700 truncate">
                        +{totalCreditAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 p-3 rounded-2xl border border-rose-200/60 flex items-center gap-2.5 shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                      <ArrowUpRight className="w-5 h-5 stroke-[2.4]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-extrabold text-rose-900 uppercase tracking-tight">Debit (Sent)</p>
                      <p className="text-xs sm:text-sm font-black font-mono text-rose-700 truncate">
                        -{totalDebitAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Search & Status Filters */}
                <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm space-y-2.5">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      id="input-search-ledger"
                      type="text"
                      placeholder="Search recipient, sender, reference (FT...)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-800 focus:bg-white transition"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Status Pills: All, Completed/Success, Pending, Failed */}
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
                    {(['all', 'success', 'pending', 'failed'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition cursor-pointer flex-shrink-0 ${
                          statusFilter === st
                            ? 'bg-[#70189F] text-white'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {st === 'all' ? 'All Status' : st === 'success' ? 'Completed' : st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transaction Records List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                      {filterType === 'all' ? 'All Transaction Records' : filterType === 'credit' ? 'Credit (Received) Records' : 'Debit (Sending) Records'}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-gray-400">
                      {filteredRecords.length} records
                    </span>
                  </div>

                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((tx, index) => {
                      const isCredit = isCreditTx(tx);
                      const isRecentTop = index < 2;
                      return (
                        <div
                          key={tx.id}
                          id={`tx-card-${tx.id}`}
                          onClick={() => {
                            setSelectedTxDetail(tx);
                          }}
                          className="bg-white hover:bg-purple-50/20 active:scale-[0.99] p-3.5 rounded-2xl border border-gray-100 shadow-sm transition-all cursor-pointer flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Inflow / Outflow Icon */}
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold shadow-sm ${
                              isCredit
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {isCredit ? (
                                <ArrowDownLeft className="w-5 h-5 stroke-[2.2]" />
                              ) : (
                                <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isRecentTop && (
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-[#70189F] border border-purple-200 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#70189F] animate-pulse" />
                                    Recent
                                  </span>
                                )}
                                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                                  isCredit 
                                    ? 'bg-emerald-100/70 text-emerald-800' 
                                    : 'bg-rose-100/70 text-rose-800'
                                }`}>
                                  {isCredit ? 'CREDIT • RECEIVED' : 'DEBIT • SENT'}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                  tx.status === 'success' 
                                    ? 'bg-emerald-50 text-emerald-700' 
                                    : tx.status === 'pending' 
                                      ? 'bg-amber-50 text-amber-700' 
                                      : 'bg-red-50 text-red-700'
                                }`}>
                                  {tx.status === 'success' ? 'Completed' : tx.status}
                                </span>
                              </div>

                              <p className="text-xs sm:text-[13px] font-extrabold text-gray-900 mt-1 truncate">
                                {isCredit ? (tx.senderName || 'Cash Deposit') : tx.recipientName}
                              </p>
                              <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">
                                {tx.reference || tx.id} • {new Date(tx.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>

                          {/* Right Side: Amount */}
                          <div className="text-right flex-shrink-0">
                            <p className={`text-xs sm:text-sm font-black font-mono ${
                              isCredit ? 'text-emerald-700' : 'text-gray-900'
                            }`}>
                              {isCredit ? '+' : '-'}{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              <span className="text-[10px] font-normal text-gray-500 ml-1">ETB</span>
                            </p>
                            <p className="text-[10px] text-gray-400 capitalize mt-0.5">
                              {tx.type}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#70189F] flex items-center justify-center mx-auto">
                        <ReceiptIcon className="w-6 h-6 stroke-[1.8]" />
                      </div>
                      <p className="text-xs font-bold text-gray-800">No {filterType !== 'all' ? filterType : ''} records found</p>
                      <p className="text-[11px] text-gray-400">Transactions will automatically appear here once initiated or received.</p>
                    </div>
                  )}
                </div>

                {/* Make New Transfer Button */}
                <div className="pt-2">
                  <button
                    id="btn-initiate-transfer"
                    type="button"
                    onClick={() => setViewMode('transfer')}
                    className="w-full bg-[#70189F] hover:bg-[#58117D] active:scale-[0.99] text-white p-3.5 rounded-2xl font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-amber-300" />
                    <span>Make New Transfer or Payment</span>
                  </button>
                </div>
              </>
            ) : (
              /* VIEW MODE: INDEPENDENT CBE TRANSFER */
              <div className="space-y-4">
                {/* Horizontal segment selector tabs */}
                <div className="flex bg-[#70189F] p-1.5 rounded-2xl border border-purple-300/20 gap-1 overflow-x-auto scrollbar-none shadow-md">
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
                          setMerchantStep(1);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                          isActive 
                            ? 'bg-white text-[#70189F] shadow-md' 
                            : 'text-purple-200 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Main Content Form Area */}
                <div className="space-y-4 pt-1">

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
                <div className="relative">
                  <input 
                    id="input-send-recipient"
                    type="text" 
                    placeholder="Enter A/C or phone (e.g. 1000246810121 or 0911234567)"
                    value={sendRecipient}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSendRecipient(val);
                      // If matched beneficiary, auto-suggest name if empty
                      const matched = beneficiaries.find(b => b.accountNumber === val || b.phone === val) ||
                                      LocalDb.findRegisteredAccount(val);
                      if (matched && !sendRecipientName) {
                        setSendRecipientName('name' in matched ? matched.name : matched.accountName);
                      }
                    }}
                    className="w-full bg-gray-50 border border-emerald-500/80 focus:border-emerald-600 rounded-xl px-4 py-2.5 pr-24 text-sm focus:outline-none focus:bg-white transition"
                    required
                  />
                  {/* Dual action icons matching reference image IMG_20261001_102840_360.png */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                    <div className="h-5 w-[1.5px] bg-gray-200/90 mx-0.5 flex-shrink-0" />
                    <button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-[#16a34a] hover:text-[#15803d] active:scale-95 transition cursor-pointer"
                      title="Scan QR Code / Barcode"
                    >
                      <AccountScanIcon className="w-5 h-5 text-[#16a34a]" />
                    </button>
                    <button
                      id="btn-send-profile-icon"
                      type="button"
                      onClick={() => setShowRegisteredDirectoryModal(true)}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-[#16a34a] hover:text-[#15803d] active:scale-95 transition cursor-pointer flex items-center justify-center group"
                      title="Click profile icon to choose from registered bank accounts"
                      aria-label="View registered bank accounts"
                    >
                      <User className="w-5 h-5 text-[#16a34a] group-hover:scale-110 transition-transform stroke-[2.2]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Recipient Name / Account Holder Name Input (Self, Father, Grandfather with Multiple Input Methods) */}
              <div className="space-y-1">
                {(() => {
                  const parts = sendRecipientName.trim().split(/\s+/);
                  return (
                    <EthiopianThreePartNameInput
                      idPrefix="send-recipient"
                      firstName={parts[0] || ''}
                      fathersName={parts[1] || ''}
                      grandfathersName={parts.slice(2).join(' ') || ''}
                      onChange={({ fullName }) => setSendRecipientName(fullName)}
                      required
                      theme="cbe"
                    />
                  );
                })()}
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>CBE Service Charge</span>
                        {sendCbeFee.tierLabel && sendAmtNum > 0 && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                            {sendCbeFee.tierLabel}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-gray-800">ETB {sendCbeFee.serviceCharge.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => setShowTariffModal(true)}
                          className="text-[10px] text-emerald-750 hover:underline font-bold cursor-pointer"
                          title="View CBE Service Charges"
                        >
                          Tariff
                        </button>
                      </div>
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
                  {(() => {
                    const parts = newBenName.trim().split(/\s+/);
                    return (
                      <EthiopianThreePartNameInput
                        idPrefix="new-ben-recipient"
                        firstName={parts[0] || ''}
                        fathersName={parts[1] || ''}
                        grandfathersName={parts.slice(2).join(' ') || ''}
                        onChange={({ fullName }) => setNewBenName(fullName)}
                        required
                        theme="cbe"
                      />
                    );
                  })()}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-500 font-bold">Account Number</span>
                      <span className="font-mono text-gray-400">{newBenAcc.replace(/\D/g, '').length}/13 digits</span>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={13}
                      placeholder="13-digit Bank Account (e.g. 1000246810121)"
                      value={newBenAcc}
                      onChange={(e) => setNewBenAcc(e.target.value.replace(/\D/g, '').slice(0, 13))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold"
                      required
                    />
                  </div>
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
              
              {/* FROM ACCOUNT CARD */}
              <div className="bg-gradient-to-br from-emerald-950 to-emerald-850 text-white rounded-3xl p-5 shadow-md border border-emerald-800/20 relative overflow-hidden">
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">From Account</p>
                
                <div className="mt-2.5 flex justify-between items-center">
                  <div className="flex-1">
                    {userAccounts.length > 1 ? (
                      <select
                        id="select-from-bank-account"
                        value={selectedFromAccId}
                        onChange={(e) => setSelectedFromAccId(e.target.value)}
                        className="w-full bg-transparent text-sm font-black border-none p-0 pr-6 text-white focus:ring-0 focus:outline-none cursor-pointer font-sans"
                      >
                        {userAccounts.map(acc => (
                          <option key={acc.id} value={acc.id} className="bg-emerald-950 text-white font-medium">
                            {acc.accountName} - {acc.accountNumber.slice(0, 4)}••••{acc.accountNumber.slice(-4)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm font-black text-white font-sans">
                        Saving Account - {currentUser.accountNumber.slice(0, 4)}••••{currentUser.accountNumber.slice(-4)}
                      </p>
                    )}
                  </div>
                  {userAccounts.length > 1 && (
                    <ChevronRight className="w-4 h-4 text-emerald-200 pointer-events-none rotate-90" />
                  )}
                </div>

                <div className="mt-3.5 flex justify-between items-center pt-3 border-t border-white/5">
                  <div>
                    <span className="text-xs text-emerald-300 font-bold">Balance</span>
                    <p className="text-xl font-black font-mono mt-0.5">
                      ETB {showFromBalance 
                        ? (selectedFromAccountObj?.balance ?? currentUser.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })
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
                
                {/* OWN ACCOUNT: TO ACCOUNT SELECTOR */}
                {transferSubTab === 'own' && (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 font-bold">To Destination Account</label>

                    {userAccounts.length <= 1 ? (
                      <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-700 space-y-1.5">
                        <p className="font-bold text-gray-900">Single Account Active</p>
                        <p className="text-[11px] text-gray-600">You currently have one active CBE account registered. To switch or add accounts, please visit the Settings page.</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <select
                          id="select-to-bank-account"
                          value={selectedToAccId}
                          onChange={(e) => setSelectedToAccId(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-800 font-semibold text-gray-800 cursor-pointer"
                        >
                          {userAccounts
                            .filter(a => a.id !== selectedFromAccId)
                            .map(acc => (
                              <option key={acc.id} value={acc.id}>
                                {acc.accountName} ({acc.accountType}) - {acc.accountNumber} (Bal: ETB {acc.balance.toLocaleString()})
                              </option>
                            ))}
                        </select>
                        {selectedToAccountObj && (
                          <div className="flex items-center justify-between text-[11px] px-1 text-gray-500 font-mono">
                            <span>Current Destination Balance:</span>
                            <span className="font-bold text-emerald-800">ETB {selectedToAccountObj.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* OTHER ACCOUNT: SEARCHABLE REGISTERED RECIPIENT & AUTO-POPULATION */}
                {transferSubTab === 'other' && (
                  <div className="space-y-3">
                    
                    {/* If a registered recipient is already selected / locked in */}
                    {selectedRegisteredRecipient ? (
                      <div className="bg-emerald-50/90 border border-emerald-300/80 rounded-2xl p-4 relative animate-in fade-in">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-emerald-800 text-white flex items-center justify-center font-extrabold text-sm shadow-xs flex-shrink-0">
                              {selectedRegisteredRecipient.accountName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-extrabold text-sm text-gray-900 leading-tight">
                                  {selectedRegisteredRecipient.accountName}
                                </h4>
                                <span className="text-[9px] font-black bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" /> Registered
                                </span>
                              </div>
                              <p className="text-xs font-mono text-emerald-950 font-bold mt-0.5">
                                {selectedRegisteredRecipient.accountNumber}
                              </p>
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                {selectedRegisteredRecipient.bankName}
                              </p>
                              {selectedRegisteredRecipient.balance !== undefined && (
                                <p className="text-[11px] font-mono font-extrabold text-emerald-900 mt-1">
                                  Balance: ETB {selectedRegisteredRecipient.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRegisteredRecipient(null);
                              setTransferAccount('');
                              setTransferRecipientName('');
                              setSearchRecipientQuery('');
                            }}
                            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline px-2 py-1 cursor-pointer"
                          >
                            Change
                          </button>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex items-center gap-1.5 text-[11px] text-emerald-900 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                          <span>Recipient confirmed! No need to write name again. Just enter amount below.</span>
                        </div>
                      </div>
                    ) : (
                      /* SEARCH BAR TO FIND REGISTERED RECIPIENTS BY NAME OR ACCOUNT NUMBER */
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs text-gray-700 font-bold">Search Recipient (Name or Account Number)</label>
                          <span className="text-[10px] text-emerald-800 font-bold">Instant Auto-fill</span>
                        </div>

                        <div className="relative">
                          <div className="absolute left-3.5 top-[13px] text-gray-400">
                            <Search className="w-4 h-4 text-emerald-800" />
                          </div>
                          <input
                            id="input-search-registered-recipient"
                            type="text"
                            placeholder="Type recipient name (e.g. Selamawit) or 13-digit A/C..."
                            value={searchRecipientQuery}
                            onFocus={() => setIsSearchFocused(true)}
                            onChange={(e) => {
                              setSearchRecipientQuery(e.target.value);
                              setIsSearchFocused(true);
                            }}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 pl-10 pr-10 text-xs focus:outline-none focus:border-emerald-800 focus:bg-white transition font-medium"
                          />
                          {searchRecipientQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchRecipientQuery('')}
                              className="absolute right-3.5 top-[13px] text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Search Results Dropdown */}
                        {searchRecipientQuery.trim().length > 0 && (
                          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg max-h-56 overflow-y-auto divide-y divide-gray-100 animate-in fade-in z-20 relative">
                            {matchedRegisteredAccounts.length > 0 ? (
                              matchedRegisteredAccounts.map((acc, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleSelectRecipient(acc)}
                                  className="w-full p-3 text-left hover:bg-emerald-50/70 transition flex items-center justify-between group cursor-pointer"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 text-[#70189F] font-bold text-xs flex items-center justify-center flex-shrink-0">
                                      {acc.accountName.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-gray-900 group-hover:text-emerald-900 truncate">
                                        {acc.accountName}
                                      </p>
                                      <p className="text-[11px] font-mono text-gray-500">
                                        {acc.accountNumber} • {acc.bankName}
                                      </p>
                                      {acc.balance !== undefined && (
                                        <p className="text-[10px] font-mono font-bold text-emerald-800">
                                          Balance: ETB {acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md flex-shrink-0">
                                    Select
                                  </span>
                                </button>
                              ))
                            ) : (
                              <div className="p-3 text-center text-xs text-gray-500">
                                No registered account matching "{searchRecipientQuery}".
                              </div>
                            )}
                          </div>
                        )}

                        {/* Quick Directory Chips */}
                        {!searchRecipientQuery && (
                          <div className="pt-1">
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1.5 tracking-wider">
                              Verified Directory Contacts:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {LocalDb.searchRegisteredAccounts('').slice(0, 6).map((rec, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => handleSelectRecipient(rec)}
                                  className="bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 text-gray-700 hover:text-emerald-900 text-[11px] font-bold px-2.5 py-1 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                                >
                                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                                  <span>{rec.accountName.split(' ')[0]} ({rec.accountNumber.slice(-4)})</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Manual / Direct 13-digit Input fallback */}
                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs text-gray-500 font-bold">Or Enter Account Number Directly</label>
                            <button
                              id="btn-text-open-registered-accounts"
                              type="button"
                              onClick={() => setShowRegisteredDirectoryModal(true)}
                              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer transition active:scale-95"
                              title="Click to choose from registered bank accounts"
                            >
                              <User className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Registered Accounts</span>
                            </button>
                          </div>

                          <div className="relative">
                            <div className="absolute left-3.5 top-[14px] text-gray-400">
                              <Building className="w-4 h-4" />
                            </div>
                            <input 
                              id="input-transfer-acc"
                              type="text" 
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={13}
                              placeholder="XXXXXXXXXXXXX"
                              value={transferAccount}
                              onChange={(e) => setTransferAccount(e.target.value.replace(/\D/g, '').slice(0, 13))}
                              className={`w-full bg-gray-50 border rounded-2xl px-4 py-3 pl-10 pr-24 text-sm focus:outline-none focus:bg-white transition font-mono font-semibold ${
                                transferAccount.length === 13
                                  ? 'border-[#22c55e] focus:border-[#16a34a] ring-2 ring-[#22c55e]/20'
                                  : transferAccount.length > 0
                                    ? 'border-amber-400 focus:border-amber-500'
                                    : 'border-[#22c55e]/80 focus:border-[#16a34a] ring-1 ring-[#22c55e]/15'
                              }`}
                            />
                            {/* Dual action icons: Scan QR + Profile Icon to choose from Registered Bank Accounts */}
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                              <div className="h-6 w-[1.5px] bg-gray-200/90 mx-1 flex-shrink-0" />
                              <button
                                type="button"
                                onClick={() => setShowScanner(true)}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-[#16a34a] hover:text-[#15803d] active:scale-95 transition cursor-pointer"
                                title="Scan QR Code / Barcode"
                                aria-label="Scan QR Code"
                              >
                                <AccountScanIcon className="w-5 h-5 text-[#16a34a]" />
                              </button>
                              <button
                                id="btn-transfer-profile-icon"
                                type="button"
                                onClick={() => setShowRegisteredDirectoryModal(true)}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-[#16a34a] hover:text-[#15803d] active:scale-95 transition cursor-pointer flex items-center justify-center group"
                                title="Click profile icon to choose from registered bank accounts"
                                aria-label="View registered bank accounts"
                              >
                                <User className="w-5 h-5 text-[#16a34a] group-hover:scale-110 transition-transform stroke-[2.2]" />
                              </button>
                            </div>
                          </div>

                          {/* Account verification indicator */}
                          {isAccountVerifying && (
                            <p className="text-[11px] text-amber-600 font-bold animate-pulse mt-1 pl-1">Verifying registered account title...</p>
                          )}
                          {verifiedAccountName && !isAccountVerifying && (
                            <div className="mt-1 flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[11px] py-1 px-2.5 rounded-lg border border-emerald-100/40 font-semibold">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Registered Name: <strong>{verifiedAccountName}</strong></span>
                            </div>
                          )}

                          {/* Recipient name input only if not verified from directory */}
                          {!selectedRegisteredRecipient && (
                            <div className="mt-3 space-y-1">
                              <label className="text-xs text-gray-500 font-bold">Recipient Name</label>
                              {(() => {
                                const parts = transferRecipientName.trim().split(/\s+/);
                                return (
                                  <EthiopianThreePartNameInput
                                    idPrefix="transfer-recipient"
                                    firstName={parts[0] || ''}
                                    fathersName={parts[1] || ''}
                                    grandfathersName={parts.slice(2).join(' ') || ''}
                                    onChange={({ fullName }) => setTransferRecipientName(fullName)}
                                    required
                                    theme="cbe"
                                  />
                                );
                              })()}
                            </div>
                          )}

                          {/* Destination Bank Selector */}
                          <div className="mt-3 space-y-1">
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
                        </div>
                      </div>
                    )}
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>CBE Service Charge</span>
                          {cbeFee.tierLabel && amtNum > 0 && transferSubTab !== 'own' && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                              {cbeFee.tierLabel}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-gray-700">ETB {cbeFee.serviceCharge.toFixed(2)}</span>
                          {transferSubTab !== 'own' && (
                            <button
                              type="button"
                              onClick={() => setShowTariffModal(true)}
                              className="text-[10px] text-emerald-750 hover:underline font-bold cursor-pointer"
                              title="View CBE Service Charges Table"
                            >
                              Tariff
                            </button>
                          )}
                        </div>
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
              </div>
            )}
          </div>
        </main>
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

      {/* ================= TRANSACTION DETAIL MODAL ================= */}
      {selectedTxDetail && (
        <TransactionDetailModal
          transaction={selectedTxDetail}
          onClose={() => setSelectedTxDetail(null)}
          onViewReceipt={(tx) => {
            setSelectedTxDetail(null);
            if (onSelectTransaction) {
              onSelectTransaction(tx);
            }
          }}
          currentUserId={currentUser.id}
          currentUserAccount={currentUser.accountNumber}
        />
      )}

      {/* ================= CBE SERVICE CHARGES TARIFF MODAL ================= */}
      {showTariffModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-extrabold text-xs">
                  CBE
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 leading-tight">CBE → CBE Service Charges</h3>
                  <p className="text-[10px] text-gray-400 font-medium">Standard Transfer Tariff Schedule</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTariffModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto pr-1">
              {CBE_TO_CBE_SERVICE_CHARGES.map((tier, idx) => {
                const curAmt = parseFloat(transferAmount) || parseFloat(sendAmount) || 0;
                const isCurrent = curAmt >= tier.min && curAmt <= tier.max;
                return (
                  <div
                    key={idx}
                    className={`py-2 px-3 rounded-xl flex items-center justify-between text-xs transition my-0.5 ${
                      isCurrent
                        ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      )}
                      <span className="font-medium">{tier.label}</span>
                    </div>
                    <span className={`font-mono ${isCurrent ? 'text-emerald-800 font-extrabold' : 'text-gray-900 font-bold'}`}>
                      {tier.charge.toFixed(2)} ETB
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3.5 pt-3 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
              <p>• Transfers between own CBE accounts are free (0.00 ETB).</p>
              <p>• 15% VAT and 5% Disaster Recovery apply to the service charge.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowTariffModal(false)}
              className="mt-4 w-full bg-emerald-800 hover:bg-emerald-850 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Registered Accounts Directory Selection Modal */}
      <RegisteredAccountsModal
        isOpen={showRegisteredDirectoryModal}
        onClose={() => setShowRegisteredDirectoryModal(false)}
        onSelect={handleSelectRecipient}
        currentSelectedAccount={transferAccount || sendRecipient}
        title="Registered Accounts Directory"
      />

    </div>
  );
}

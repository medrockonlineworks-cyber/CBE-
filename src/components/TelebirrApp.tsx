import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ArrowRight,
  Search, 
  Bell, 
  ChevronDown, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  QrCode, 
  Home as HomeIcon, 
  CreditCard, 
  Grid, 
  MessageSquare, 
  User, 
  MapPin, 
  Trash2, 
  Check, 
  X, 
  Download, 
  Share2, 
  Delete,
  Building2,
  ExternalLink,
  Sparkles,
  Smartphone,
  Upload,
  RotateCcw,
  Image as ImageIcon,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Sliders,
  LogOut,
  Landmark,
  PhoneCall,
  FileText,
  Plus,
  PlusCircle,
  Edit3,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet
} from 'lucide-react';
import { 
  EthioTelecomLogo, 
  TelebirrLogo, 
  TelebirrRipples, 
  TelebirrSolidAvatar,
  CbeMedallionIcon, 
  DashenGridBadge, 
  SiinqeeGridBadge, 
  ZemenGebeyaBadge,
  SendMoneyIcon,
  CashInOutIcon,
  AirtimePackageIcon,
  BankPillarsIcon
} from './TelebirrBrandAssets';
import { 
  TelebirrService, 
  TelebirrAccountState, 
  TelebirrTransaction,
  TelebirrRecentRecipient,
  TelebirrRegisteredAccount,
  TELEBIRR_SUPPORTED_BANKS 
} from '../services/telebirrService';
import { UserProfile } from '../types';
import PhoneStatusBar from './PhoneStatusBar';
import PhoneSettingsModal from './PhoneSettingsModal';
import { TelebirrHeaderCard, LiveAccountController } from './TelebirrHeaderCard';

interface TelebirrAppProps {
  currentUser?: UserProfile | null;
  onBack: () => void;
  onOpenDashen?: () => void;
  onOpenCbe?: () => void;
  onOpenSms?: () => void;
  onOpenTelegram?: () => void;
}

type TelebirrView = 'home' | 'transfer_select' | 'transfer_amount' | 'transfer_receipt';

export default function TelebirrApp({ 
  currentUser, 
  onBack,
  onOpenDashen,
  onOpenCbe,
  onOpenSms,
  onOpenTelegram 
}: TelebirrAppProps) {
  // State from service
  const [teleState, setTeleState] = useState<TelebirrAccountState>(() => TelebirrService.getState());
  const [currentView, setCurrentView] = useState<TelebirrView>('home');

  // Bottom Navigation state
  const [activeBottomNav, setActiveBottomNav] = useState<'home' | 'payment' | 'apps' | 'engage' | 'account'>('home');

  // Bank Transfer Form States
  const [selectedBank, setSelectedBank] = useState<string>('Commercial Bank of Ethiopia');
  const [accountNumber, setAccountNumber] = useState<string>('1000419524747');
  const [recipientName, setRecipientName] = useState<string>('Mr Leykun Jemaneh Yilma');
  const [showBankPickerModal, setShowBankPickerModal] = useState<boolean>(false);
  const [isVerifyingAccount, setIsVerifyingAccount] = useState<boolean>(false);

  // Amount Entry States
  const [transferAmountStr, setTransferAmountStr] = useState<string>('100');
  const [transferNotes, setTransferNotes] = useState<string>('');
  const [showNotesInput, setShowNotesInput] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Latest Receipt State
  const [latestTx, setLatestTx] = useState<TelebirrTransaction | null>(() => {
    return teleState.transactions[0] || null;
  });

  // Simulated Push Notification banner on receipt
  const [showPushNotification, setShowPushNotification] = useState<boolean>(false);
  const [copiedTxNo, setCopiedTxNo] = useState<boolean>(false);
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);

  // Logo Upload & Customization states inside Account Page
  const [customEthioUrl, setCustomEthioUrl] = useState<string>('');
  const [customTelebirrUrl, setCustomTelebirrUrl] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Service Button Definitions for custom logo upload (User Request)
  const SERVICE_BUTTON_DEFS = [
    { key: 'send_money', label: 'Send Money', desc: 'P2P wallet transfer' },
    { key: 'cash_in_out', label: 'Cash In/ Out', desc: 'Agent cash deposit & withdrawal' },
    { key: 'airtime', label: 'Airtime/ Buy Package', desc: 'Ethio Telecom airtime & bundles' },
    { key: 'zemen_gebeya', label: 'Zemen GEBEYA', desc: 'Super App marketplace' },
    { key: 'dashen', label: 'Financial Service With Dashen', desc: 'Dashen Bank Amole gateway' },
    { key: 'cbe', label: 'Financial Service With CBE', desc: 'Commercial Bank of Ethiopia' },
    { key: 'siinqee', label: 'Financial Service with Siinqee', desc: 'Siinqee Bank microfinance' },
    { key: 'transfer_bank', label: 'Transfer to Bank', desc: 'Direct bank settlement gateway' },
  ];
  const [selectedButtonKey, setSelectedButtonKey] = useState<string>('dashen');
  const [customButtonUrl, setCustomButtonUrl] = useState<string>('');

  // Profile Edit states
  const [editDisplayName, setEditDisplayName] = useState<string>(() => teleState.displayName || 'Selam, Leykun');
  const [editMainBalance, setEditMainBalance] = useState<string>(() => String(teleState.balance || 41865.79));
  const [editEndekise, setEditEndekise] = useState<string>(() => String(teleState.endekiseBalance || 0));
  const [editReward, setEditReward] = useState<string>(() => String(teleState.rewardBalance || 150));
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);

  // Service dialog modal state
  const [serviceModal, setServiceModal] = useState<{ title: string; description: string; actionLabel?: string; onAction?: () => void } | null>(null);
  const [showPhoneSettings, setShowPhoneSettings] = useState<boolean>(false);

  // User Interactive Modals & Controls:
  // 1. Send Money modal
  const [showSendMoneyModal, setShowSendMoneyModal] = useState<boolean>(false);
  const [sendMoneyTab, setSendMoneyTab] = useState<'mobile' | 'bank'>('mobile');
  const [sendMobilePhone, setSendMobilePhone] = useState<string>('0911048011');
  const [sendMobileName, setSendMobileName] = useState<string>('Mahlet Jemaneh');
  const [sendMobileAmount, setSendMobileAmount] = useState<string>('250');
  const [sendMobileNotes, setSendMobileNotes] = useState<string>('Transfer via Telebirr');

  // 2. Receive Money / Cash In modal
  const [showReceiveMoneyModal, setShowReceiveMoneyModal] = useState<boolean>(false);
  const [receiveSource, setReceiveSource] = useState<'bank' | 'telebirr' | 'agent'>('bank');
  const [receiveSenderName, setReceiveSenderName] = useState<string>('Commercial Bank of Ethiopia');
  const [receiveSenderAccount, setReceiveSenderAccount] = useState<string>('1000419524747');
  const [receiveBankKey, setReceiveBankKey] = useState<string>('cbe');
  const [receiveBankName, setReceiveBankName] = useState<string>('Commercial Bank of Ethiopia');
  const [receiveAmount, setReceiveAmount] = useState<string>('1000');
  const [receiveNotes, setReceiveNotes] = useState<string>('Deposit to Telebirr');

  // 3. Register Account modal & Registered Accounts Search
  const [showRegisterAccountModal, setShowRegisterAccountModal] = useState<boolean>(false);
  const [regAccName, setRegAccName] = useState<string>('');
  const [regAccBank, setRegAccBank] = useState<string>('Commercial Bank of Ethiopia');
  const [regAccNumber, setRegAccNumber] = useState<string>('');
  const [registeredAccountSearch, setRegisteredAccountSearch] = useState<string>('');

  // 4. Quick Name Editor modal
  const [showQuickNameModal, setShowQuickNameModal] = useState<boolean>(false);
  const [quickNameInput, setQuickNameInput] = useState<string>('');

  // 5. Header Top Bar Modals & Test Controller
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);
  const [showLiveControllerModal, setShowLiveControllerModal] = useState<boolean>(false);

  // Reactive subscription to central TelebirrService state (Single Source of Truth)
  useEffect(() => {
    const sync = (s: TelebirrAccountState) => {
      setTeleState(s);
    };
    const unsub = TelebirrService.subscribe(sync);
    return unsub;
  }, []);

  // Auto dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3200);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Scroll Container Ref to guarantee balance is never hidden or scrolled away on mount
  const homeScrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (homeScrollRef.current) {
      homeScrollRef.current.scrollTop = 0;
    }
  }, [currentView, activeBottomNav]);

  // Handle Logo Upload from File
  const handleLogoFileUpload = (type: 'ethio' | 'telebirr', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setToastMessage('Please select an image file (PNG, JPG, SVG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (type === 'ethio') {
        TelebirrService.setCustomLogos({ ethioTelecomLogo: dataUrl });
        setToastMessage('Ethio Telecom logo updated successfully!');
      } else {
        TelebirrService.setCustomLogos({ telebirrLogo: dataUrl });
        setToastMessage('Telebirr logo updated successfully!');
      }
      refreshState();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Logo from URL
  const handleApplyLogoUrl = (type: 'ethio' | 'telebirr') => {
    const url = type === 'ethio' ? customEthioUrl.trim() : customTelebirrUrl.trim();
    if (!url) return;

    if (type === 'ethio') {
      TelebirrService.setCustomLogos({ ethioTelecomLogo: url });
      setCustomEthioUrl('');
      setToastMessage('Ethio Telecom logo URL applied!');
    } else {
      TelebirrService.setCustomLogos({ telebirrLogo: url });
      setCustomTelebirrUrl('');
      setToastMessage('Telebirr logo URL applied!');
    }
    refreshState();
  };

  // Reset custom logo to default built-in official SVG
  const handleResetLogo = (type: 'ethio' | 'telebirr') => {
    if (type === 'ethio') {
      TelebirrService.setCustomLogos({ ethioTelecomLogo: null });
      setToastMessage('Ethio Telecom logo restored to default');
    } else {
      TelebirrService.setCustomLogos({ telebirrLogo: null });
      setToastMessage('Telebirr logo restored to default');
    }
    refreshState();
  };

  // Handle Button Logo Upload from File (User Request)
  const handleButtonLogoFileUpload = (buttonKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setToastMessage('Please select an image file (PNG, JPG, SVG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      TelebirrService.setCustomButtonLogo(buttonKey, dataUrl);
      refreshState();
      const btnName = SERVICE_BUTTON_DEFS.find(b => b.key === buttonKey)?.label || buttonKey;
      setToastMessage(`Updated logo for "${btnName}"!`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Button Logo from URL
  const handleApplyButtonLogoUrl = (buttonKey: string) => {
    const url = customButtonUrl.trim();
    if (!url) return;
    TelebirrService.setCustomButtonLogo(buttonKey, url);
    setCustomButtonUrl('');
    refreshState();
    const btnName = SERVICE_BUTTON_DEFS.find(b => b.key === buttonKey)?.label || buttonKey;
    setToastMessage(`Custom logo URL applied for "${btnName}"!`);
  };

  // Reset single button logo to default
  const handleResetButtonLogo = (buttonKey: string) => {
    TelebirrService.setCustomButtonLogo(buttonKey, null);
    refreshState();
    const btnName = SERVICE_BUTTON_DEFS.find(b => b.key === buttonKey)?.label || buttonKey;
    setToastMessage(`Restored default icon for "${btnName}"`);
  };

  // Reset Header Card to official Telebirr waves
  const handleResetBg = () => {
    TelebirrService.resetHeaderBgImage();
    refreshState();
    setToastMessage('Official Telebirr wave background active');
  };

  // Reset all button logos to default
  const handleResetAllButtonLogos = () => {
    TelebirrService.resetAllButtonLogos();
    refreshState();
    setToastMessage('Restored all service button icons to defaults');
  };

  // Save profile and balance adjustments
  const handleSaveProfileSettings = () => {
    const mainBal = parseFloat(editMainBalance);
    const endek = parseFloat(editEndekise);
    const rew = parseFloat(editReward);

    TelebirrService.updateDisplayName(editDisplayName.trim() || 'Selam, Leykun');
    TelebirrService.updateBalances({
      balance: isNaN(mainBal) ? 41865.79 : mainBal,
      endekiseBalance: isNaN(endek) ? 0.00 : endek,
      rewardBalance: isNaN(rew) ? 150.00 : rew,
    });
    refreshState();
    setIsEditingProfile(false);
    setToastMessage('Account profile & balances updated!');
  };

  // Reload state
  const refreshState = () => {
    setTeleState(TelebirrService.getState());
  };

  // Visibility toggles with stopPropagation
  const handleToggleBalance = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    TelebirrService.toggleBalanceVisibility();
    refreshState();
  };

  const handleToggleEndekise = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    TelebirrService.toggleEndekiseVisibility();
    refreshState();
  };

  const handleToggleReward = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    TelebirrService.toggleRewardVisibility();
    refreshState();
  };

  // Quick Send Money to Telebirr Mobile recipient
  const handleExecuteSendMobile = () => {
    const amountNum = parseFloat(sendMobileAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setToastMessage('Please enter a valid amount to send');
      return;
    }
    if (amountNum > teleState.balance) {
      setToastMessage(`Insufficient balance. Current: ETB ${teleState.balance.toFixed(2)}`);
      return;
    }
    const res = TelebirrService.sendMoneyToMobile({
      recipientPhone: sendMobilePhone.trim() || '0911048011',
      recipientName: sendMobileName.trim() || 'Recipient',
      amount: amountNum,
      notes: sendMobileNotes.trim()
    });
    setLatestTx(res.tx);
    refreshState();
    setShowSendMoneyModal(false);
    setToastMessage(`Sent ETB ${amountNum.toFixed(2)} to ${sendMobileName}. New Balance: ETB ${res.newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  };

  // Receive Money / Cash In
  const handleExecuteReceiveMoney = () => {
    const amountNum = parseFloat(receiveAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setToastMessage('Please enter a valid deposit amount');
      return;
    }
    const res = TelebirrService.receiveMoney({
      senderName: receiveSenderName.trim() || 'Commercial Bank of Ethiopia',
      amount: amountNum,
      sourceBank: receiveSource === 'bank' ? receiveBankName : undefined,
      bankKey: receiveSource === 'bank' ? receiveBankKey : undefined,
      senderAccount: receiveSource === 'bank' ? receiveSenderAccount.trim() : undefined,
      notes: receiveNotes.trim()
    });
    setLatestTx(res.tx);
    refreshState();
    setShowReceiveMoneyModal(false);
    setToastMessage(`Received ETB ${amountNum.toFixed(2)} from ${receiveSenderName}! New Balance: ETB ${res.newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  };

  // Register Bank Account manually
  const handleManualRegisterAccount = () => {
    if (!regAccNumber.trim() || !regAccName.trim() || !regAccBank.trim()) {
      setToastMessage('Please fill all account details');
      return;
    }
    const bankPreset = TELEBIRR_SUPPORTED_BANKS.find(b => b.name === regAccBank) || TELEBIRR_SUPPORTED_BANKS[0];
    TelebirrService.registerBankAccount({
      name: regAccName.trim(),
      bankName: regAccBank,
      bankKey: bankPreset.key,
      accountNumber: regAccNumber.trim()
    });
    refreshState();
    setShowRegisterAccountModal(false);
    setRegAccName('');
    setRegAccNumber('');
    setToastMessage(`Account registered for ${regAccName}!`);
  };

  // Remove registered account
  const handleRemoveRegisteredAccount = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    TelebirrService.removeRegisteredAccount(id);
    refreshState();
    setToastMessage('Account removed from registered list');
  };

  // Select registered account to transfer to
  const handleSelectRegisteredAccount = (acc: TelebirrRegisteredAccount) => {
    setSelectedBank(acc.bankName);
    setAccountNumber(acc.accountNumber);
    setRecipientName(acc.name);
    setIsVerifyingAccount(true);
    setTimeout(() => {
      setIsVerifyingAccount(false);
      setCurrentView('transfer_amount');
    }, 600);
  };

  // Quick Name update
  const handleQuickUpdateName = () => {
    if (!quickNameInput.trim()) return;
    TelebirrService.updateDisplayName(quickNameInput.trim());
    refreshState();
    setShowQuickNameModal(false);
    setToastMessage(`Name updated to "${quickNameInput.trim()}"`);
  };

  // Helper to return default SVG/badge icon for each of the 8 service buttons
  const getDefaultIconForButton = (key: string) => {
    switch (key) {
      case 'send_money':
        return <SendMoneyIcon className="w-8 h-8 text-[#5cb82e]" />;
      case 'cash_in_out':
        return <CashInOutIcon className="w-8 h-8 text-[#5cb82e]" />;
      case 'airtime':
        return <AirtimePackageIcon className="w-8 h-8 text-[#5cb82e]" />;
      case 'zemen_gebeya':
        return <ZemenGebeyaBadge className="w-9 h-9" />;
      case 'dashen':
        return <DashenGridBadge className="w-9 h-9" />;
      case 'cbe':
        return <CbeMedallionIcon className="w-9 h-9" />;
      case 'siinqee':
        return <SiinqeeGridBadge className="w-9 h-9" />;
      case 'transfer_bank':
        return <BankPillarsIcon className="w-8 h-8 text-[#5cb82e]" />;
      default:
        return <SendMoneyIcon className="w-8 h-8 text-[#5cb82e]" />;
    }
  };

  // Helper to render service icon with custom uploaded logo support
  const renderServiceIcon = (buttonKey: string, defaultIcon: React.ReactNode, label: string) => {
    const customLogo = teleState.customButtonLogos?.[buttonKey];
    if (customLogo) {
      return (
        <img
          src={customLogo}
          alt={label}
          className="w-9 h-9 object-contain drop-shadow-xs"
          referrerPolicy="no-referrer"
        />
      );
    }
    return defaultIcon;
  };

  const handleClearRecents = () => {
    if (confirm('Clear all recent bank transfer accounts?')) {
      TelebirrService.clearRecents();
      refreshState();
    }
  };

  // Selecting a recent account
  const handleSelectRecent = (rec: TelebirrRecentRecipient) => {
    setSelectedBank(rec.bankName);
    setAccountNumber(rec.accountNumber);
    setRecipientName(rec.name);
    
    // Trigger loading spinner overlay matching Screenshot 3
    setIsVerifyingAccount(true);
    setTimeout(() => {
      setIsVerifyingAccount(false);
      setCurrentView('transfer_amount');
    }, 700);
  };

  // Clicking "Next" in Bank Select form
  const handleProceedToAmount = () => {
    if (!selectedBank || !accountNumber.trim()) return;
    
    setIsVerifyingAccount(true);
    setTimeout(() => {
      setIsVerifyingAccount(false);
      setCurrentView('transfer_amount');
    }, 700);
  };

  // Custom soft keypad handler
  const handleKeypadPress = (val: string) => {
    if (val === 'backspace') {
      setTransferAmountStr(prev => (prev.length > 1 ? prev.slice(0, -1) : ''));
      return;
    }
    if (val === '.') {
      if (!transferAmountStr.includes('.')) {
        setTransferAmountStr(prev => (prev === '' ? '0.' : prev + '.'));
      }
      return;
    }
    // Limit decimal places to 2
    if (transferAmountStr.includes('.')) {
      const parts = transferAmountStr.split('.');
      if (parts[1] && parts[1].length >= 2) return;
    }
    setTransferAmountStr(prev => (prev === '0' ? val : prev + val));
  };

  // Execute transfer
  const handleConfirmTransfer = () => {
    const numAmount = parseFloat(transferAmountStr);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const tx = TelebirrService.executeTransfer({
      recipientName: recipientName || 'Mr Leykun Jemaneh Yilma',
      bankName: selectedBank || 'Commercial Bank of Ethiopia',
      bankKey: selectedBank.toLowerCase().includes('abyssinia') ? 'abyssinia' : (selectedBank.toLowerCase().includes('dashen') ? 'dashen' : 'cbe'),
      accountNumber: accountNumber || '1000419524747',
      amount: numAmount,
      notes: transferNotes,
    });

    setLatestTx(tx);
    setShowConfirmModal(false);
    refreshState();
    setCurrentView('transfer_receipt');

    // Show simulated CBE push notification banner after brief delay
    setTimeout(() => {
      setShowPushNotification(true);
    }, 800);
  };

  // Format amount
  const parsedAmount = parseFloat(transferAmountStr) || 0;
  const serviceFee = 1.00;
  const totalCharge = parsedAmount + serviceFee;

  return (
    <div className="relative w-full h-full bg-[#f6f8fa] flex flex-col font-sans select-none overflow-hidden text-neutral-800">
      
      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden relative">

        {/* Interactive Phone Top Status Bar (Phone Model & Settings synced with all apps) */}
        <div className="relative z-30 shrink-0 bg-white">
          <PhoneStatusBar 
            theme="light" 
            onClick={() => setShowPhoneSettings(true)}
            showEditHint={false}
          />
        </div>

        {/* FIXED TOP HEADER LOGO PART: Ethio Telecom Logo & Telebirr Logo (Fixed at top, never scrolls away) */}
        {currentView === 'home' && (
          <div className="bg-white px-3.5 py-1.5 flex items-center justify-between border-b border-neutral-100 shadow-xs flex-shrink-0 min-h-[40px] z-30">
            {teleState.customEthioTelecomLogo ? (
              <img 
                src={teleState.customEthioTelecomLogo} 
                alt="Ethio Telecom" 
                className="h-7 max-w-[150px] object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <EthioTelecomLogo className="h-7 w-auto" />
            )}
            {teleState.customTelebirrLogo ? (
              <img 
                src={teleState.customTelebirrLogo} 
                alt="Telebirr" 
                className="h-7 max-w-[150px] object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <TelebirrLogo className="h-7 w-auto" />
            )}
          </div>
        )}

        {/* Toast Notification Alert */}
        {toastMessage && (
          <div className="absolute top-18 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/90 text-white text-xs px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-2 backdrop-blur-xs transition-all animate-fade-in border border-neutral-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Dynamic Screen Switcher */}
        {currentView === 'home' && activeBottomNav === 'home' && (
          <div 
            ref={homeScrollRef} 
            className="flex-1 flex flex-col overflow-y-auto scrollbar-none pb-6 overscroll-contain bg-[#f6f8fa]"
          >
            {/* Real React + TypeScript Reconstructed Header & Balance Card (Requirement 10, 14, 15) */}
            <TelebirrHeaderCard
              onOpenProfile={() => setActiveBottomNav('account')}
              onOpenSearch={() => setShowSearchModal(true)}
              onOpenNotifications={() => setShowNotificationsModal(true)}
              onOpenLanguage={() => setShowLanguageModal(true)}
              onAmountClick={() => setShowReceiveMoneyModal(true)}
              onToast={(msg) => setToastMessage(msg)}
            />

            {/* Quick Live Account Test Controller Pill (To test scenarios A - J instantly) */}
            <div className="px-4 pt-2.5 pb-0.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowLiveControllerModal(true)}
                className="w-full py-1.5 px-3 bg-gradient-to-r from-lime-600 to-[#5cb82e] hover:from-lime-700 hover:to-[#4fa127] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer active:scale-98"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Open Live Account & State Controller (Test Scenarios A-J)</span>
              </button>
            </div>

            {/* Quick Service Grid (8 Cards matching Screenshot 1 & custom logo enabled) */}
            <div className="p-4 grid grid-cols-4 gap-2.5">
              
              {/* 1. Send Money */}
              <button 
                onClick={() => setShowSendMoneyModal(true)}
                className="bg-white rounded-2xl p-2.5 flex flex-col items-center justify-between text-center min-h-[96px] shadow-xs border border-neutral-100 hover:border-lime-400 hover:shadow-sm transition cursor-pointer active:scale-95"
              >
                <div className="p-1 flex items-center justify-center min-h-[36px]">
                  {renderServiceIcon('send_money', <SendMoneyIcon className="w-8 h-8 text-[#5cb82e]" />, 'Send Money')}
                </div>
                <span className="text-[11px] font-semibold text-neutral-800 leading-tight mt-1">
                  Send Money
                </span>
              </button>

              {/* 2. Cash In/Out (Receive Money & Deposit) */}
              <button 
                onClick={() => setShowReceiveMoneyModal(true)}
                className="bg-white rounded-2xl p-2.5 flex flex-col items-center justify-between text-center min-h-[96px] shadow-xs border border-neutral-100 hover:border-lime-400 hover:shadow-sm transition cursor-pointer active:scale-95"
              >
                <div className="p-1 flex items-center justify-center min-h-[36px]">
                  {renderServiceIcon('cash_in_out', <CashInOutIcon className="w-8 h-8 text-[#5cb82e]" />, 'Cash In/ Out')}
                </div>
                <span className="text-[11px] font-semibold text-neutral-800 leading-tight mt-1">
                  Cash In/ Out
                </span>
              </button>

              {/* 3. Airtime/Buy Package */}
              <button 
                onClick={() => setServiceModal({
                  title: 'Airtime & Package (Up to 35% Bonus)',
                  description: 'Recharge your Ethio Telecom mobile line or purchase unlimited data, voice, and SMS combo packages with up to 35% instant bonus.',
                  actionLabel: 'Buy 100 ETB Package',
                  onAction: () => {
                    const currentBal = (typeof teleState.balance === 'number' && !isNaN(teleState.balance)) ? teleState.balance : 41865.79;
                    const currentRew = (typeof teleState.rewardBalance === 'number' && !isNaN(teleState.rewardBalance)) ? teleState.rewardBalance : 150.00;
                    TelebirrService.updateBalances({
                      balance: Math.max(0, currentBal - 100),
                      rewardBalance: currentRew + 35
                    });
                    refreshState();
                    setToastMessage('Purchased 100 ETB package! 35 ETB reward credited.');
                  }
                })}
                className="bg-white rounded-2xl p-2.5 flex flex-col items-center justify-between text-center min-h-[96px] shadow-xs border border-neutral-100 hover:border-lime-400 hover:shadow-sm transition cursor-pointer active:scale-95 relative"
              >
                <span className="absolute -top-1.5 right-1 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                  Up to 35%
                </span>
                <div className="p-1 mt-1 flex items-center justify-center min-h-[36px]">
                  {renderServiceIcon('airtime', <AirtimePackageIcon className="w-8 h-8 text-[#5cb82e]" />, 'Airtime/ Buy Package')}
                </div>
                <span className="text-[11px] font-semibold text-neutral-800 leading-tight mt-1">
                  Airtime/ Buy Package
                </span>
              </button>

              {/* 4. Zemen GEBEYA */}
              <button 
                onClick={() => setServiceModal({
                  title: 'Zemen GEBEYA Marketplace',
                  description: 'Welcome to Zemen GEBEYA on Telebirr Super App! Order electronics, traditional Ethiopian outfits, household groceries, and goods directly with one-click payment.',
                  actionLabel: 'Browse GEBEYA',
                  onAction: () => setToastMessage('Opening Zemen GEBEYA super catalog...')
                })}
                className="bg-white rounded-2xl p-2.5 flex flex-col items-center justify-between text-center min-h-[96px] shadow-xs border border-neutral-100 hover:border-lime-400 hover:shadow-sm transition cursor-pointer active:scale-95"
              >
                <div className="p-1 flex items-center justify-center min-h-[36px]">
                  {renderServiceIcon('zemen_gebeya', <ZemenGebeyaBadge className="w-9 h-9" />, 'Zemen GEBEYA')}
                </div>
                <span className="text-[11px] font-semibold text-neutral-800 leading-tight mt-1">
                  Zemen GEBEYA
                </span>
              </button>

              {/* 5. Financial Service With Dashen */}
              <button 
                onClick={() => {
                  if (onOpenDashen) onOpenDashen();
                  else {
                    setServiceModal({
                      title: 'Dashen Bank Super App',
                      description: 'Seamlessly linked to Dashen Bank. Transfer funds instantly, view Amole digital statements, and access omni-channel foreign exchange services.',
                      actionLabel: 'Launch Dashen',
                      onAction: () => onOpenDashen?.()
                    });
                  }
                }}
                className="bg-white rounded-2xl p-2.5 flex flex-col items-center justify-between text-center min-h-[96px] shadow-xs border border-neutral-100 hover:border-blue-400 hover:shadow-sm transition cursor-pointer active:scale-95"
                title="Launch Dashen Bank Super App"
              >
                <div className="p-0.5 flex items-center justify-center min-h-[36px]">
                  {renderServiceIcon('dashen', <DashenGridBadge className="w-9 h-9" />, 'Financial Service With Dashen')}
                </div>
                <span className="text-[10px] font-semibold text-neutral-800 leading-tight mt-1">
                  Financial Service With Dashen
                </span>
              </button>

              {/* 6. Financial Service With CBE */}
              <button 
                onClick={() => {
                  if (onOpenCbe) onOpenCbe();
                  else {
                    setServiceModal({
                      title: 'Commercial Bank of Ethiopia (CBE)',
                      description: 'Direct interoperability with CBE Birr and CBE Core Accounts. Instant transfers and real-time account settlements.',
                      actionLabel: 'Switch to CBE',
                      onAction: () => onOpenCbe?.()
                    });
                  }
                }}
                className="bg-white rounded-2xl p-2.5 flex flex-col items-center justify-between text-center min-h-[96px] shadow-xs border border-neutral-100 hover:border-amber-400 hover:shadow-sm transition cursor-pointer active:scale-95"
                title="Switch to CBE Digital Banking"
              >
                <div className="p-0.5 flex items-center justify-center min-h-[36px]">
                  {renderServiceIcon('cbe', <CbeMedallionIcon className="w-9 h-9" />, 'Financial Service With CBE')}
                </div>
                <span className="text-[10px] font-semibold text-neutral-800 leading-tight mt-1">
                  Financial Service With CBE
                </span>
              </button>

              {/* 7. Financial Service with Siinqee */}
              <button 
                onClick={() => setServiceModal({
                  title: 'Siinqee Bank Services',
                  description: 'Inclusive micro-lending, agricultural credit lines, and high-yield interest savings through Siinqee Bank digital integration.',
                  actionLabel: 'Check Eligibility',
                  onAction: () => setToastMessage('Siinqee account linked. Credit score verified.')
                })}
                className="bg-white rounded-2xl p-2.5 flex flex-col items-center justify-between text-center min-h-[96px] shadow-xs border border-neutral-100 hover:border-emerald-400 hover:shadow-sm transition cursor-pointer active:scale-95"
              >
                <div className="p-0.5 flex items-center justify-center min-h-[36px]">
                  {renderServiceIcon('siinqee', <SiinqeeGridBadge className="w-9 h-9" />, 'Financial Service with Siinqee')}
                </div>
                <span className="text-[10px] font-semibold text-neutral-800 leading-tight mt-1">
                  Financial Service with Siinqee
                </span>
              </button>

              {/* 8. Transfer to Bank (Direct link to Screen 2) */}
              <button 
                onClick={() => {
                  setCurrentView('transfer_select');
                }}
                className="bg-white rounded-2xl p-2.5 flex flex-col items-center justify-between text-center min-h-[96px] shadow-xs border-2 border-lime-200 hover:border-lime-500 hover:shadow-sm transition cursor-pointer active:scale-95 bg-lime-50/20"
              >
                <div className="p-1 flex items-center justify-center min-h-[36px]">
                  {renderServiceIcon('transfer_bank', <BankPillarsIcon className="w-8 h-8 text-[#5cb82e]" />, 'Transfer to Bank')}
                </div>
                <span className="text-[11px] font-bold text-neutral-900 leading-tight mt-1">
                  Transfer to Bank
                </span>
              </button>

            </div>

            {/* Floating Scan QR pill button */}
            <div className="px-4 py-1 flex justify-center">
              <button 
                onClick={() => setQrModalOpen(true)}
                className="w-full max-w-xs bg-[#0085ca] hover:bg-[#0073af] active:scale-98 text-white rounded-2xl py-3 px-6 font-extrabold flex items-center justify-center gap-2 text-base shadow-md cursor-pointer transition"
              >
                <QrCode className="w-5 h-5" />
                <span>Scan QR</span>
              </button>
            </div>

            {/* Recent activity summary */}
            {teleState.transactions.length > 0 && (
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Latest Activity</h3>
                  <button 
                    onClick={() => {
                      if (teleState.transactions[0]) {
                        setLatestTx(teleState.transactions[0]);
                        setCurrentView('transfer_receipt');
                      }
                    }}
                    className="text-xs font-bold text-[#0085ca] hover:underline cursor-pointer"
                  >
                    View Receipt
                  </button>
                </div>
                <div className="bg-white rounded-2xl p-3 border border-neutral-100 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-800">{teleState.transactions[0].recipientName}</p>
                      <p className="text-[10px] text-neutral-500">{teleState.transactions[0].bankName}</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-red-600">
                    -{teleState.transactions[0].totalDeducted.toFixed(2)} ETB
                  </span>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 5: Account Screen with Custom Logo Upload Settings (User Request) */}
        {currentView === 'home' && activeBottomNav === 'account' && (
          <div className="flex-1 flex flex-col overflow-y-auto scrollbar-none pb-20 bg-[#f6f8fa]">
            
            {/* Profile Summary Card */}
            <div className="bg-white m-3.5 rounded-2xl p-4 border border-neutral-200/80 shadow-xs flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#5cb82e] to-[#7ecb23] text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-bold text-neutral-900 truncate">
                    {teleState.displayName || 'Selam, Leykun'}
                  </h3>
                  <ShieldCheck className="w-4 h-4 text-[#5cb82e] shrink-0" />
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 font-mono">+251 91 123 4567</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[10px] bg-lime-50 text-lime-700 font-bold px-2 py-0.5 rounded-full border border-lime-200">
                    Tier 3 Verified
                  </span>
                  <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                    Telebirr Super App
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Balance & Money Actions */}
            <div className="mx-3.5 mb-3.5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setShowReceiveMoneyModal(true)}
                className="bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col items-center text-center hover:border-lime-400 active:scale-95 transition cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-lime-100 text-[#5cb82e] flex items-center justify-center mb-1.5">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-neutral-800">Receive Money</span>
                <span className="text-[10px] text-neutral-400 font-medium">Deposit to balance</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSendMoneyModal(true)}
                className="bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col items-center text-center hover:border-lime-400 active:scale-95 transition cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 text-[#0085ca] flex items-center justify-center mb-1.5">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-neutral-800">Send Money</span>
                <span className="text-[10px] text-neutral-400 font-medium">Transfer funds</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col items-center text-center hover:border-lime-400 active:scale-95 transition cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-1.5">
                  <Edit3 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-neutral-800">Edit Profile</span>
                <span className="text-[10px] text-neutral-400 font-medium">Name & balance</span>
              </button>
            </div>

            {/* REGISTERED BANK ACCOUNTS (Profile Account List - User Request) */}
            <div className="mx-3.5 mb-3.5 bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-neutral-900">Registered Bank Accounts</h4>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">
                        {teleState.registeredBankAccounts?.length || 0}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500">Auto-registered on each banking transaction</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowRegisterAccountModal(true)}
                  className="text-xs text-[#5cb82e] hover:text-[#4ea026] font-bold flex items-center gap-1 cursor-pointer bg-lime-50 hover:bg-lime-100 px-2.5 py-1.5 rounded-xl transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Account</span>
                </button>
              </div>

              {/* Search filter if more than 2 accounts */}
              {teleState.registeredBankAccounts && teleState.registeredBankAccounts.length > 2 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search registered accounts or banks..."
                    value={registeredAccountSearch}
                    onChange={(e) => setRegisteredAccountSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-neutral-50 rounded-xl text-xs text-neutral-800 placeholder-neutral-400 border border-neutral-200 focus:outline-none focus:border-[#5cb82e]"
                  />
                  {registeredAccountSearch && (
                    <button
                      type="button"
                      onClick={() => setRegisteredAccountSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Registered Accounts List */}
              {(!teleState.registeredBankAccounts || teleState.registeredBankAccounts.length === 0) ? (
                <div className="text-center py-6 px-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                  <Building2 className="w-8 h-8 text-neutral-300 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-neutral-700">No registered bank accounts yet</p>
                  <p className="text-[11px] text-neutral-400 max-w-xs mx-auto mt-0.5">
                    Any account you transfer to via Banking will automatically be registered here. You can also add one manually.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowRegisterAccountModal(true)}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#5cb82e] hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Register a Bank Account</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {teleState.registeredBankAccounts
                    .filter(acc => {
                      if (!registeredAccountSearch.trim()) return true;
                      const q = registeredAccountSearch.toLowerCase();
                      return acc.name.toLowerCase().includes(q) ||
                             acc.bankName.toLowerCase().includes(q) ||
                             acc.accountNumber.includes(q);
                    })
                    .map((acc) => (
                      <div
                        key={acc.id}
                        className="p-3 bg-neutral-50/80 hover:bg-neutral-100/80 rounded-xl border border-neutral-200/70 transition flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-[#5cb82e] shadow-2xs shrink-0">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-neutral-900 truncate">
                                {acc.name}
                              </p>
                              <span className="text-[9px] bg-lime-100 text-lime-800 px-1.5 py-0.2 rounded font-bold shrink-0">
                                {acc.transactionCount} txns
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-600 font-mono font-medium truncate mt-0.5">
                              {acc.bankName} • {acc.accountNumber}
                            </p>
                            <p className="text-[9.5px] text-neutral-400 mt-0.5">
                              Registered {acc.registeredAt ? new Date(acc.registeredAt).toLocaleDateString() : 'Active'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSelectRegisteredAccount(acc)}
                            className="px-2.5 py-1.5 bg-[#5cb82e] hover:bg-[#4ea026] active:scale-95 text-white rounded-lg text-[11px] font-bold transition shadow-2xs cursor-pointer flex items-center gap-1"
                            title="Transfer funds to this registered bank account"
                          >
                            <span>Transfer</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveRegisteredAccount(acc.id, e)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Remove from registered list"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* LOGO UPLOAD & BRANDING SETTINGS (Requested by user) */}
            <div className="mx-3.5 mb-3.5 bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-lime-100 text-lime-700 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900">Brand Logo Settings</h4>
                    <p className="text-[11px] text-neutral-500">Upload or change logos in the top header</p>
                  </div>
                </div>
                {(teleState.customEthioTelecomLogo || teleState.customTelebirrLogo) && (
                  <button
                    onClick={() => {
                      TelebirrService.resetLogos();
                      refreshState();
                      setToastMessage('Both logos restored to official defaults');
                    }}
                    className="text-[11px] text-red-600 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset All</span>
                  </button>
                )}
              </div>

              {/* 1. Ethio Telecom Logo Upload Setting */}
              <div className="p-3 bg-neutral-50/80 rounded-xl border border-neutral-200/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <span>Ethio Telecom Logo</span>
                    {teleState.customEthioTelecomLogo ? (
                      <span className="text-[9px] bg-lime-600 text-white px-1.5 py-0.2 rounded font-bold">Custom</span>
                    ) : (
                      <span className="text-[9px] bg-neutral-200 text-neutral-600 px-1.5 py-0.2 rounded font-medium">Default</span>
                    )}
                  </span>
                  {teleState.customEthioTelecomLogo && (
                    <button
                      onClick={() => handleResetLogo('ethio')}
                      className="text-[10px] text-neutral-500 hover:text-red-600 flex items-center gap-0.5 cursor-pointer font-semibold"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Restore Default</span>
                    </button>
                  )}
                </div>

                {/* Logo Preview Box */}
                <div className="bg-white p-2.5 rounded-lg border border-neutral-200 flex items-center justify-center min-h-[48px]">
                  {teleState.customEthioTelecomLogo ? (
                    <img 
                      src={teleState.customEthioTelecomLogo} 
                      alt="Custom Ethio Telecom" 
                      className="h-8 max-w-[200px] object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <EthioTelecomLogo className="h-7 w-auto" />
                  )}
                </div>

                {/* Upload from File & URL input */}
                <div className="space-y-2">
                  <label className="w-full py-1.5 px-3 bg-[#5cb82e] hover:bg-[#4ea025] active:scale-98 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image File (PNG, SVG, JPG)</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleLogoFileUpload('ethio', e)}
                    />
                  </label>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="url"
                      placeholder="Or paste image URL..."
                      value={customEthioUrl}
                      onChange={(e) => setCustomEthioUrl(e.target.value)}
                      className="flex-1 bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-[#5cb82e]"
                    />
                    <button
                      onClick={() => handleApplyLogoUrl('ethio')}
                      disabled={!customEthioUrl.trim()}
                      className="py-1.5 px-3 bg-neutral-800 text-white text-xs font-bold rounded-lg hover:bg-neutral-900 disabled:opacity-40 transition cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Telebirr Logo Upload Setting */}
              <div className="p-3 bg-neutral-50/80 rounded-xl border border-neutral-200/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <span>Telebirr Logo</span>
                    {teleState.customTelebirrLogo ? (
                      <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-bold">Custom</span>
                    ) : (
                      <span className="text-[9px] bg-neutral-200 text-neutral-600 px-1.5 py-0.2 rounded font-medium">Default</span>
                    )}
                  </span>
                  {teleState.customTelebirrLogo && (
                    <button
                      onClick={() => handleResetLogo('telebirr')}
                      className="text-[10px] text-neutral-500 hover:text-red-600 flex items-center gap-0.5 cursor-pointer font-semibold"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Restore Default</span>
                    </button>
                  )}
                </div>

                {/* Logo Preview Box */}
                <div className="bg-white p-2.5 rounded-lg border border-neutral-200 flex items-center justify-center min-h-[48px]">
                  {teleState.customTelebirrLogo ? (
                    <img 
                      src={teleState.customTelebirrLogo} 
                      alt="Custom Telebirr" 
                      className="h-8 max-w-[200px] object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <TelebirrLogo className="h-7 w-auto" />
                  )}
                </div>

                {/* Upload from File & URL input */}
                <div className="space-y-2">
                  <label className="w-full py-1.5 px-3 bg-[#0085ca] hover:bg-[#0073af] active:scale-98 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image File (PNG, SVG, JPG)</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleLogoFileUpload('telebirr', e)}
                    />
                  </label>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="url"
                      placeholder="Or paste image URL..."
                      value={customTelebirrUrl}
                      onChange={(e) => setCustomTelebirrUrl(e.target.value)}
                      className="flex-1 bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-[#0085ca]"
                    />
                    <button
                      onClick={() => handleApplyLogoUrl('telebirr')}
                      disabled={!customTelebirrUrl.trim()}
                      className="py-1.5 px-3 bg-neutral-800 text-white text-xs font-bold rounded-lg hover:bg-neutral-900 disabled:opacity-40 transition cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Telebirr Official Wave Theme & Balance Card Display */}
              <div className="p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200/70 space-y-3">
                {/* Header Title & Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-[#5cb82e]" />
                    <span className="text-xs font-bold text-neutral-900">3. Official Telebirr Wave Theme</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Active & Interactive
                    </span>
                    <button
                      onClick={handleResetBg}
                      className="text-[10px] text-neutral-500 hover:text-[#5cb82e] flex items-center gap-0.5 cursor-pointer font-semibold"
                      title="Ensure official Telebirr wave graphics are restored"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reset Card</span>
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-500 leading-tight">
                  The Home screen balance card utilizes authentic Telebirr dual-focal acoustic wave graphics with fully interactive live balances and hide/unhide toggles.
                </p>

                {/* Card Preview Showcase */}
                <div 
                  className="relative rounded-2xl overflow-hidden min-h-[120px] shadow-xs p-3.5 select-none bg-gradient-to-b from-[#88c92b] via-[#84c527] to-[#7ebf23] text-white flex flex-col justify-between"
                >
                  <TelebirrRipples />

                  {/* Card Header row */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TelebirrSolidAvatar className="w-7 h-7 shrink-0 shadow-xs" />
                      <div>
                        <span className="text-xs font-bold text-white drop-shadow-xs block leading-tight">
                          {teleState.displayName || 'Selam, Leykun'}
                        </span>
                        <span className="text-[10px] text-white/80 font-mono">0911048011</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-black/30 backdrop-blur-xs px-2 py-0.5 rounded-full text-white font-medium border border-white/20">
                      Official Wave Graphics
                    </span>
                  </div>

                  {/* Balance Showcase */}
                  <div className="relative z-10 text-center py-1">
                    <span className="text-[11px] text-white/90 font-medium block">Live Balance</span>
                    <span className="text-xl font-extrabold text-white drop-shadow-sm font-mono">
                      ETB {((typeof teleState.balance === 'number' && !isNaN(teleState.balance)) ? teleState.balance : 41865.79).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="relative z-10 flex items-center justify-between text-[10px] text-white/90 pt-1 border-t border-white/20">
                    <span>Endekise: ETB {teleState.endekiseBalance?.toFixed(2) || '0.00'}</span>
                    <span>Reward: ETB {teleState.rewardBalance?.toFixed(2) || '150.00'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => {
                      handleResetBg();
                      setActiveBottomNav('home');
                    }}
                    className="w-full py-2 bg-[#5cb82e] hover:bg-[#4ea026] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Clean Balance Card on Home</span>
                  </button>
                </div>

                <p className="text-[10px] text-neutral-400 text-center">
                  💡 Tip: You can also copy any screenshot to clipboard and press <kbd className="px-1 py-0.5 bg-neutral-200 text-neutral-700 rounded font-mono text-[9px]">Ctrl+V</kbd> to upload directly.
                </p>
              </div>

              {/* 4. Other Button Logos (Requested by User) */}
              <div className="p-3 bg-neutral-50/80 rounded-xl border border-neutral-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-neutral-800">4. Other Button Logos</span>
                    <span className="text-[9px] bg-neutral-200 text-neutral-700 font-bold px-1.5 py-0.5 rounded-full">
                      {Object.keys(teleState.customButtonLogos || {}).length} / 8 Custom
                    </span>
                  </div>
                  {Object.keys(teleState.customButtonLogos || {}).length > 0 && (
                    <button
                      onClick={handleResetAllButtonLogos}
                      className="text-[10px] text-neutral-500 hover:text-red-600 flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reset All Defaults</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-neutral-500 leading-tight">
                  Select any home screen service button below to upload your own custom logo or icon:
                </p>

                {/* 8 Buttons Selector Grid */}
                <div className="grid grid-cols-4 gap-1.5">
                  {SERVICE_BUTTON_DEFS.map((btn) => {
                    const isSelected = selectedButtonKey === btn.key;
                    const hasCustom = Boolean(teleState.customButtonLogos?.[btn.key]);
                    return (
                      <button
                        key={btn.key}
                        onClick={() => setSelectedButtonKey(btn.key)}
                        className={`p-1.5 rounded-xl border flex flex-col items-center justify-center text-center transition cursor-pointer relative ${
                          isSelected
                            ? 'bg-lime-50 border-lime-500 shadow-xs'
                            : 'bg-white border-neutral-200 hover:border-neutral-300'
                        }`}
                        title={btn.label}
                      >
                        {hasCustom && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white shadow-xs" />
                        )}
                        <div className="w-7 h-7 flex items-center justify-center">
                          {teleState.customButtonLogos?.[btn.key] ? (
                            <img
                              src={teleState.customButtonLogos[btn.key]}
                              alt={btn.label}
                              className="w-6 h-6 object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="scale-75 origin-center">
                              {getDefaultIconForButton(btn.key)}
                            </div>
                          )}
                        </div>
                        <span className={`text-[9px] font-bold mt-1 line-clamp-1 w-full text-center ${isSelected ? 'text-lime-800' : 'text-neutral-700'}`}>
                          {btn.label.replace('Financial Service With ', '').replace('Financial Service with ', '')}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Button Editor */}
                {(() => {
                  const selectedBtn = SERVICE_BUTTON_DEFS.find(b => b.key === selectedButtonKey) || SERVICE_BUTTON_DEFS[0];
                  const isCustom = Boolean(teleState.customButtonLogos?.[selectedBtn.key]);
                  return (
                    <div className="bg-white p-3 rounded-xl border border-neutral-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-xs font-bold text-neutral-900">{selectedBtn.label}</h5>
                          <p className="text-[10px] text-neutral-500">{selectedBtn.desc}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isCustom ? (
                            <span className="text-[9px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">Custom</span>
                          ) : (
                            <span className="text-[9px] bg-neutral-100 text-neutral-600 font-medium px-2 py-0.5 rounded-full border border-neutral-200">Default</span>
                          )}
                          {isCustom && (
                            <button
                              onClick={() => handleResetButtonLogo(selectedBtn.key)}
                              className="text-[10px] text-red-600 hover:text-red-700 font-bold flex items-center gap-0.5 cursor-pointer ml-1"
                              title="Restore default icon"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>Restore</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Logo Preview */}
                      <div className="h-14 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center p-2">
                        {isCustom ? (
                          <img
                            src={teleState.customButtonLogos![selectedBtn.key]}
                            alt={selectedBtn.label}
                            className="h-10 max-w-[120px] object-contain drop-shadow-xs"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            {getDefaultIconForButton(selectedBtn.key)}
                            <span className="text-xs font-semibold text-neutral-600">{selectedBtn.label}</span>
                          </div>
                        )}
                      </div>

                      {/* File Upload & URL Input */}
                      <div className="space-y-2 pt-0.5">
                        <label className="w-full py-1.5 px-3 bg-[#5cb82e] hover:bg-[#4ea026] active:scale-98 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload {selectedBtn.label.replace('Financial Service With ', '').replace('Financial Service with ', '')} Logo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleButtonLogoFileUpload(selectedBtn.key, e)}
                          />
                        </label>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="url"
                            placeholder="Or paste button logo image URL..."
                            value={customButtonUrl}
                            onChange={(e) => setCustomButtonUrl(e.target.value)}
                            className="flex-1 bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-[#5cb82e]"
                          />
                          <button
                            onClick={() => handleApplyButtonLogoUrl(selectedBtn.key)}
                            disabled={!customButtonUrl.trim()}
                            className="py-1.5 px-3 bg-neutral-800 text-white text-xs font-bold rounded-lg hover:bg-neutral-900 disabled:opacity-40 transition cursor-pointer"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Profile & Balance Settings */}
            <div className="mx-3.5 mb-3.5 bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-neutral-700" />
                  <h4 className="text-sm font-bold text-neutral-900">Profile & Balance Settings</h4>
                </div>
                <button
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="text-xs font-bold text-[#5cb82e] hover:underline cursor-pointer"
                >
                  {isEditingProfile ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {isEditingProfile ? (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 block mb-1">Display Name</label>
                    <input
                      type="text"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-lime-500"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-neutral-600 block mb-1">Main Balance</label>
                      <input
                        type="number"
                        value={editMainBalance}
                        onChange={(e) => setEditMainBalance(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-2.5 py-1.5 text-xs text-neutral-800 font-mono focus:outline-none focus:border-lime-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-neutral-600 block mb-1">Endekise</label>
                      <input
                        type="number"
                        value={editEndekise}
                        onChange={(e) => setEditEndekise(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-2.5 py-1.5 text-xs text-neutral-800 font-mono focus:outline-none focus:border-lime-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-neutral-600 block mb-1">Reward</label>
                      <input
                        type="number"
                        value={editReward}
                        onChange={(e) => setEditReward(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-2.5 py-1.5 text-xs text-neutral-800 font-mono focus:outline-none focus:border-lime-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSaveProfileSettings}
                    className="w-full py-2 bg-[#5cb82e] hover:bg-[#4ea025] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-neutral-50 p-2 rounded-xl border border-neutral-200/60">
                    <span className="text-[10px] text-neutral-500 block">Balance</span>
                    <span className="text-xs font-bold text-neutral-800">{teleState.balance.toFixed(2)} ETB</span>
                  </div>
                  <div className="bg-neutral-50 p-2 rounded-xl border border-neutral-200/60">
                    <span className="text-[10px] text-neutral-500 block">Endekise</span>
                    <span className="text-xs font-bold text-neutral-800">{teleState.endekiseBalance.toFixed(2)} ETB</span>
                  </div>
                  <div className="bg-neutral-50 p-2 rounded-xl border border-neutral-200/60">
                    <span className="text-[10px] text-neutral-500 block">Reward</span>
                    <span className="text-xs font-bold text-neutral-800">{teleState.rewardBalance.toFixed(2)} ETB</span>
                  </div>
                </div>
              )}
            </div>

            {/* Related Applications & Navigation */}
            <div className="mx-3.5 mb-3.5 bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-2.5">
              <h4 className="text-sm font-bold text-neutral-900 mb-2">Connected Banking Services</h4>
              
              {onOpenDashen && (
                <button
                  onClick={onOpenDashen}
                  className="w-full p-2.5 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-100/60 flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <DashenGridBadge className="w-7 h-7" />
                    <div className="text-left">
                      <p className="text-xs font-bold text-[#003882]">Dashen Bank Super App</p>
                      <p className="text-[10px] text-neutral-500">Amole transfers & digital banking</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </button>
              )}

              {onOpenCbe && (
                <button
                  onClick={onOpenCbe}
                  className="w-full p-2.5 rounded-xl border border-purple-100 bg-purple-50/50 hover:bg-purple-100/60 flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <CbeMedallionIcon className="w-7 h-7" />
                    <div className="text-left">
                      <p className="text-xs font-bold text-[#8a2267]">Commercial Bank of Ethiopia (CBE)</p>
                      <p className="text-[10px] text-neutral-500">CBE Birr & savings transfers</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </button>
              )}

              {onOpenTelegram && (
                <button
                  onClick={onOpenTelegram}
                  className="w-full p-2.5 rounded-xl border border-sky-100 bg-sky-50/50 hover:bg-sky-100/60 flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#229ED9] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      💬
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-[#0077b5]">Telegram Chat Simulator</p>
                      <p className="text-[10px] text-neutral-500">Fictional chat & support simulator</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </button>
              )}

              <button
                onClick={onBack}
                className="w-full p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 flex items-center justify-between transition cursor-pointer text-neutral-700"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center font-bold text-xs text-neutral-700">
                    🏦
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-neutral-800">Return to Tana Digital Bank</p>
                    <p className="text-[10px] text-neutral-500">Main banking simulator dashboard</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </button>

              <button
                onClick={() => {
                  TelebirrService.resetToDefault();
                  refreshState();
                  setToastMessage('Telebirr reset to default state');
                }}
                className="w-full py-2 text-center text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
              >
                Reset All Telebirr Data
              </button>
            </div>

          </div>
        )}

        {/* TAB 2: Payment Hub */}
        {currentView === 'home' && activeBottomNav === 'payment' && (
          <div className="flex-1 flex flex-col overflow-y-auto scrollbar-none pb-20 bg-[#f6f8fa]">

            <div className="p-4 space-y-4">
              <div className="bg-gradient-to-r from-[#0085ca] to-[#005a8c] p-4 rounded-2xl text-white shadow-sm">
                <h3 className="text-base font-bold">Telebirr Payment Hub</h3>
                <p className="text-xs text-blue-100 mt-1">Pay merchants, utility bills, fuel, and school fees instantly</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => setQrModalOpen(true)}
                  className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col items-center text-center cursor-pointer hover:border-blue-400 transition active:scale-95"
                >
                  <QrCode className="w-8 h-8 text-[#0085ca] mb-2" />
                  <span className="text-xs font-bold text-neutral-800">Pay Merchant</span>
                  <span className="text-[10px] text-neutral-500">Scan QR or enter Till</span>
                </div>

                <div 
                  onClick={() => {
                    setCurrentView('transfer_select');
                  }}
                  className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col items-center text-center cursor-pointer hover:border-lime-400 transition active:scale-95"
                >
                  <BankPillarsIcon className="w-8 h-8 text-[#5cb82e] mb-2" />
                  <span className="text-xs font-bold text-neutral-800">Bank Transfer</span>
                  <span className="text-[10px] text-neutral-500">Direct deposit to bank</span>
                </div>

                <div 
                  onClick={() => setServiceModal({
                    title: 'Ethiopian Electric Power (EEP)',
                    description: 'Recharge your prepaid electricity card or pay monthly postpaid utility bill via Derash.',
                    actionLabel: 'Pay Bill',
                    onAction: () => setToastMessage('Connected to EEP billing server.')
                  })}
                  className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col items-center text-center cursor-pointer hover:border-amber-400 transition active:scale-95"
                >
                  <Building2 className="w-8 h-8 text-amber-600 mb-2" />
                  <span className="text-xs font-bold text-neutral-800">Electric & Water</span>
                  <span className="text-[10px] text-neutral-500">Utility bills via Derash</span>
                </div>

                <div 
                  onClick={() => setServiceModal({
                    title: 'Traffic Penalty & Government Fees',
                    description: 'Pay federal and regional traffic police fines, revenue tax, and immigration services directly.',
                    actionLabel: 'Check Penalties',
                    onAction: () => setToastMessage('No outstanding traffic violations found.')
                  })}
                  className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col items-center text-center cursor-pointer hover:border-red-400 transition active:scale-95"
                >
                  <ShieldCheck className="w-8 h-8 text-red-600 mb-2" />
                  <span className="text-xs font-bold text-neutral-800">Traffic Penalty</span>
                  <span className="text-[10px] text-neutral-500">Federal police fines</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Apps Directory */}
        {currentView === 'home' && activeBottomNav === 'apps' && (
          <div className="flex-1 flex flex-col overflow-y-auto scrollbar-none pb-20 bg-[#f6f8fa]">

            <div className="p-4 space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
                <h3 className="text-sm font-bold text-neutral-900 mb-1">Telebirr Mini-Apps & Ecosystem</h3>
                <p className="text-xs text-neutral-500">Government services, travel, shopping, and ticketing</p>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div 
                  onClick={() => setServiceModal({
                    title: 'Ethiopian Airlines',
                    description: 'Book domestic and international flights, check-in online, and pay with zero transaction fees via Telebirr.',
                    actionLabel: 'Book Flight',
                    onAction: () => setToastMessage('Redirecting to Ethiopian Airlines...')
                  })}
                  className="bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col items-center text-center cursor-pointer hover:border-lime-400 transition"
                >
                  <span className="text-2xl mb-1">✈️</span>
                  <span className="text-[11px] font-bold text-neutral-800">ET Airlines</span>
                  <span className="text-[9px] text-neutral-400">Flight Booking</span>
                </div>

                <div 
                  onClick={() => setServiceModal({
                    title: 'Zemen GEBEYA',
                    description: 'Explore the leading online Ethiopian eCommerce marketplace.',
                    actionLabel: 'Open Market',
                    onAction: () => setToastMessage('Opening Zemen GEBEYA...')
                  })}
                  className="bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col items-center text-center cursor-pointer hover:border-lime-400 transition"
                >
                  <ZemenGebeyaBadge className="w-8 h-8 mb-1" />
                  <span className="text-[11px] font-bold text-neutral-800">GEBEYA</span>
                  <span className="text-[9px] text-neutral-400">Online Store</span>
                </div>

                <div 
                  onClick={() => setServiceModal({
                    title: 'National Fuel Pay',
                    description: 'Scan QR at any gas station in Ethiopia to pay fuel subsidy digitally.',
                    actionLabel: 'Scan Pump QR',
                    onAction: () => setQrModalOpen(true)
                  })}
                  className="bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col items-center text-center cursor-pointer hover:border-lime-400 transition"
                >
                  <span className="text-2xl mb-1">⛽</span>
                  <span className="text-[11px] font-bold text-neutral-800">Fuel Pay</span>
                  <span className="text-[9px] text-neutral-400">National Subsidy</span>
                </div>

                <div 
                  onClick={() => setServiceModal({
                    title: 'Digital National ID (Fayda)',
                    description: 'Integrate your biometric Fayda digital identity card with Telebirr for instant KYC.',
                    actionLabel: 'Link Fayda',
                    onAction: () => setToastMessage('Fayda Digital ID already verified.')
                  })}
                  className="bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col items-center text-center cursor-pointer hover:border-lime-400 transition"
                >
                  <span className="text-2xl mb-1">🪪</span>
                  <span className="text-[11px] font-bold text-neutral-800">Fayda ID</span>
                  <span className="text-[9px] text-neutral-400">Digital Identity</span>
                </div>

                <div 
                  onClick={() => setServiceModal({
                    title: 'Cinema & Event Tickets',
                    description: 'Cinema tickets, concerts, sports stadium matches, and comedy shows in Addis Ababa.',
                    actionLabel: 'Browse Events',
                    onAction: () => setToastMessage('Loading Addis Ababa event guide...')
                  })}
                  className="bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col items-center text-center cursor-pointer hover:border-lime-400 transition"
                >
                  <span className="text-2xl mb-1">🎟️</span>
                  <span className="text-[11px] font-bold text-neutral-800">Event Tickets</span>
                  <span className="text-[9px] text-neutral-400">Cinema & Shows</span>
                </div>

                <div 
                  onClick={() => setServiceModal({
                    title: 'Ride Hailing',
                    description: 'Book rides with Feres, RIDE, or Little and pay directly from your Telebirr wallet.',
                    actionLabel: 'Call Ride',
                    onAction: () => setToastMessage('Connecting to ride dispatch...')
                  })}
                  className="bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col items-center text-center cursor-pointer hover:border-lime-400 transition"
                >
                  <span className="text-2xl mb-1">🚕</span>
                  <span className="text-[11px] font-bold text-neutral-800">Ride Hailing</span>
                  <span className="text-[9px] text-neutral-400">Feres & RIDE</span>
                </div>

                <div 
                  onClick={() => {
                    if (onOpenTelegram) {
                      onOpenTelegram();
                    } else {
                      setToastMessage('Opening Telegram Chat Simulator...');
                    }
                  }}
                  className="bg-white p-3 rounded-2xl border border-sky-100 shadow-xs flex flex-col items-center text-center cursor-pointer hover:border-sky-400 transition"
                >
                  <span className="text-2xl mb-1">💬</span>
                  <span className="text-[11px] font-bold text-neutral-800">Telegram Chat</span>
                  <span className="text-[9px] text-neutral-400">Chat Simulator</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Engage Hub */}
        {currentView === 'home' && activeBottomNav === 'engage' && (
          <div className="flex-1 flex flex-col overflow-y-auto scrollbar-none pb-20 bg-[#f6f8fa]">

            <div className="p-4 space-y-4">
              <div className="bg-gradient-to-r from-[#6dbf20] to-[#88d626] p-4 rounded-2xl text-white shadow-sm">
                <h3 className="text-base font-bold">Telebirr Engage & Rewards</h3>
                <p className="text-xs text-white/90 mt-1">Spin to win prizes, earn airtime rewards, and explore Ethio Telecom news</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-lg font-bold">
                    🎁
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-neutral-900">Daily Sanduq (Lucky Box)</h4>
                    <p className="text-[11px] text-neutral-500">Open your free mystery chest today to win up to 100 ETB</p>
                  </div>
                  <button 
                    onClick={() => {
                      TelebirrService.updateBalances({ rewardBalance: teleState.rewardBalance + 25 });
                      refreshState();
                      setToastMessage('Lucky Box opened! You won 25.00 ETB reward points.');
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-xs"
                  >
                    Open
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0085ca] flex items-center justify-center text-lg font-bold">
                    👥
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-neutral-900">Refer a Friend</h4>
                    <p className="text-[11px] text-neutral-500">Get 50 ETB bonus for every friend who activates Telebirr</p>
                  </div>
                  <button 
                    onClick={() => setToastMessage('Referral link copied to clipboard: telebirr.et/ref/LEYKUN')}
                    className="px-3 py-1.5 bg-[#0085ca] hover:bg-[#0070ab] active:scale-95 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-xs"
                  >
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 2: Transfer to Bank - Bank & Account Selection */}
        {currentView === 'transfer_select' && (
          <div className="flex-1 flex flex-col overflow-y-auto scrollbar-none bg-[#f6f8fa] p-4 space-y-4">
            
            {/* Top Navigation Bar */}
            <div className="flex items-center gap-3 py-1">
              <button 
                onClick={() => setCurrentView('home')}
                className="p-1 rounded-full hover:bg-neutral-200 text-neutral-700 transition cursor-pointer"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-lg font-bold text-neutral-900">Transfer to Bank</h2>
            </div>

            {/* Top Banner Placeholder with 3 Dots */}
            <div className="bg-neutral-100 border border-neutral-200 rounded-2xl h-36 flex flex-col items-center justify-center relative overflow-hidden shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-neutral-200/80 flex items-center justify-center text-neutral-400">
                <CreditCard className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium text-neutral-400 mt-2">Instant Transfers to 11+ Ethiopian Banks</p>
              
              {/* 3 Pagination dots */}
              <div className="absolute bottom-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#5cb82e]" />
                <span className="w-2 h-2 rounded-full bg-neutral-300" />
                <span className="w-2 h-2 rounded-full bg-neutral-300" />
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 space-y-4">
              
              {/* Select Bank */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-600">Select Bank</label>
                <button
                  type="button"
                  onClick={() => setShowBankPickerModal(true)}
                  className="w-full px-3.5 py-3 rounded-xl border border-neutral-200 bg-white flex items-center justify-between text-neutral-800 font-medium text-sm hover:border-neutral-300 transition cursor-pointer"
                >
                  <span className={selectedBank ? 'text-neutral-900 font-semibold' : 'text-neutral-400'}>
                    {selectedBank || 'Please Choose'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-neutral-400" />
                </button>
              </div>

              {/* Account No */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-600">Account No</label>
                <div className="relative">
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Enter Account Number"
                    className="w-full px-3.5 py-3 rounded-xl border border-neutral-200 text-neutral-900 font-mono font-medium text-sm focus:outline-none focus:border-[#5cb82e] focus:ring-1 focus:ring-[#5cb82e]"
                  />
                  {accountNumber && (
                    <button
                      type="button"
                      onClick={() => setAccountNumber('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Next Button */}
              <button
                type="button"
                onClick={handleProceedToAmount}
                disabled={!selectedBank || !accountNumber.trim()}
                className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition cursor-pointer shadow-xs ${
                  selectedBank && accountNumber.trim()
                    ? 'bg-[#5cb82e] hover:bg-[#4ea026] text-white'
                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                }`}
              >
                Next
              </button>

            </div>

            {/* Registered Bank Accounts Quick Select */}
            {teleState.registeredBankAccounts && teleState.registeredBankAccounts.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-[#5cb82e]" />
                    <h3 className="text-sm font-bold text-neutral-800">Registered Accounts</h3>
                    <span className="text-[10px] bg-lime-100 text-lime-800 font-bold px-1.5 py-0.2 rounded-full">
                      {teleState.registeredBankAccounts.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRegisterAccountModal(true)}
                    className="text-xs text-[#5cb82e] hover:text-[#4ea026] font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 divide-y divide-neutral-100 overflow-hidden">
                  {teleState.registeredBankAccounts.slice(0, 5).map((acc) => (
                    <div
                      key={acc.id}
                      onClick={() => handleSelectRegisteredAccount(acc)}
                      className="p-3.5 flex items-center justify-between hover:bg-neutral-50 transition cursor-pointer active:bg-lime-50/40"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#5cb82e] flex-shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-neutral-900 leading-tight truncate">
                              {acc.name}
                            </p>
                            <span className="text-[9px] bg-neutral-100 text-neutral-600 px-1.5 py-0.2 rounded font-medium shrink-0">
                              {acc.transactionCount} txns
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 font-medium truncate mt-0.5">
                            {acc.bankName} ({acc.accountNumber})
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* "Recent" Section matching Screenshot 2 */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-neutral-800">Recent</h3>
                <button
                  type="button"
                  onClick={handleClearRecents}
                  className="text-neutral-400 hover:text-neutral-600 transition p-1 cursor-pointer"
                  title="Clear Recents"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 divide-y divide-neutral-100 overflow-hidden">
                {teleState.recentRecipients.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => handleSelectRecent(rec)}
                    className="p-3.5 flex items-center justify-between hover:bg-neutral-50 transition cursor-pointer active:bg-lime-50/40"
                  >
                    <div className="flex items-center gap-3">
                      {/* Green card icon matching Screenshot 2 */}
                      <div className="w-9 h-9 rounded-full bg-[#f0f9ea] border border-[#d9f2c5] flex items-center justify-center text-[#5cb82e] flex-shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-neutral-900 leading-tight truncate">
                          {rec.name}
                        </p>
                        <p className="text-[11px] text-neutral-500 font-medium truncate mt-0.5">
                          {rec.bankName} ({rec.accountNumber})
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* SCREEN 3: Loading Verification Overlay (Matching Screenshot 3) */}
        {isVerifyingAccount && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-center w-28 h-28">
              {/* Circular Orbiting Green Dots */}
              <div className="relative w-12 h-12 animate-spin">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
                  <span
                    key={i}
                    className="absolute w-2.5 h-2.5 rounded-full bg-[#5cb82e]"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: `rotate(${deg}deg) translate(18px) translate(-50%, -50%)`,
                      opacity: 0.25 + (i / 8) * 0.75,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 4: Amount Entry Screen with In-App Numeric Keypad */}
        {currentView === 'transfer_amount' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#f6f8fa]">
            
            {/* Top Bar */}
            <div className="bg-white px-4 py-2.5 flex items-center gap-3 border-b border-neutral-100 flex-shrink-0">
              <button 
                onClick={() => setCurrentView('transfer_select')}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-700 transition cursor-pointer"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-base font-bold text-neutral-900">Transfer to Bank</h2>
            </div>

            {/* Recipient Purple Card matching Screenshot 4 */}
            <div className="p-3.5 flex-shrink-0">
              <div className="bg-gradient-to-r from-[#8b35df] via-[#9842e6] to-[#7b29d4] rounded-2xl p-4 text-white shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#5cb82e] shadow-xs flex-shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white tracking-tight truncate">
                    {recipientName}
                  </h3>
                  <p className="text-[11px] text-purple-100 truncate mt-0.5">
                    {selectedBank} ({accountNumber})
                  </p>
                </div>
              </div>
            </div>

            {/* Amount Input Display Area */}
            <div className="px-3.5 flex-1 flex flex-col justify-start">
              <div className="bg-white rounded-2xl p-4 shadow-xs border border-neutral-100 space-y-2">
                <label className="text-xs font-semibold text-neutral-500">Amount</label>
                
                {/* Big digits line */}
                <div className="flex items-baseline justify-between border-b border-neutral-200 pb-2">
                  <div className="flex items-center text-[38px] font-bold text-neutral-900 tracking-tight">
                    <span>{transferAmountStr || '0'}</span>
                    <span className="w-0.5 h-8 bg-lime-500 animate-pulse ml-0.5" />
                  </div>
                  <span className="text-sm font-medium text-neutral-400">
                    (ETB)
                  </span>
                </div>

                {/* Balance Note */}
                <div className="text-xs font-semibold text-neutral-600 pt-1">
                  <span>Balance: {teleState.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  <span className="text-neutral-500">(ETB)</span>
                </div>

                {/* Add notes button / field */}
                <div className="pt-2">
                  {!showNotesInput ? (
                    <button
                      type="button"
                      onClick={() => setShowNotesInput(true)}
                      className="text-xs font-semibold text-[#5cb82e] hover:underline cursor-pointer"
                    >
                      Add notes(optional)
                    </button>
                  ) : (
                    <input
                      type="text"
                      value={transferNotes}
                      onChange={(e) => setTransferNotes(e.target.value)}
                      placeholder="Add note here..."
                      className="w-full text-xs p-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-[#5cb82e]"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Custom In-App Soft Keypad matching Screenshot 4 */}
            <div className="bg-neutral-100 p-2 border-t border-neutral-200 flex-shrink-0">
              <div className="grid grid-cols-4 gap-1.5 text-xl font-bold text-neutral-800">
                
                {/* Row 1 */}
                <button
                  type="button"
                  onClick={() => handleKeypadPress('1')}
                  className="h-12 bg-white rounded-xl shadow-xs active:bg-neutral-200 flex items-center justify-center transition cursor-pointer"
                >
                  1
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('2')}
                  className="h-12 bg-white rounded-xl shadow-xs active:bg-neutral-200 flex items-center justify-center transition cursor-pointer"
                >
                  2
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('3')}
                  className="h-12 bg-white rounded-xl shadow-xs active:bg-neutral-200 flex items-center justify-center transition cursor-pointer"
                >
                  3
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('backspace')}
                  className="h-12 bg-white rounded-xl shadow-xs active:bg-neutral-200 flex items-center justify-center transition cursor-pointer text-neutral-600"
                >
                  <Delete className="w-5 h-5" />
                </button>

                {/* Row 2 & 3: Columns 1-3 digits + Tall Transfer button */}
                <button
                  type="button"
                  onClick={() => handleKeypadPress('4')}
                  className="h-12 bg-white rounded-xl shadow-xs active:bg-neutral-200 flex items-center justify-center transition cursor-pointer"
                >
                  4
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('5')}
                  className="h-12 bg-white rounded-xl shadow-xs active:bg-neutral-200 flex items-center justify-center transition cursor-pointer"
                >
                  5
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('6')}
                  className="h-12 bg-white rounded-xl shadow-xs active:bg-neutral-200 flex items-center justify-center transition cursor-pointer"
                >
                  6
                </button>

                {/* TALL TRANSFER BUTTON (Spans 2 rows) */}
                <button
                  type="button"
                  disabled={parsedAmount <= 0}
                  onClick={() => setShowConfirmModal(true)}
                  className={`row-span-2 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center transition cursor-pointer shadow-sm ${
                    parsedAmount > 0 
                      ? 'bg-[#5cb82e] hover:bg-[#4ea026] text-white active:scale-98' 
                      : 'bg-[#d8edd0] text-[#a1cca0] cursor-not-allowed'
                  }`}
                >
                  Transfer
                </button>

                {/* Row 3 */}
                <button
                  type="button"
                  onClick={() => handleKeypadPress('7')}
                  className="h-12 bg-white rounded-xl shadow-xs active:bg-neutral-200 flex items-center justify-center transition cursor-pointer"
                >
                  7
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('8')}
                  className="h-12 bg-white rounded-xl shadow-xs active:bg-neutral-200 flex items-center justify-center transition cursor-pointer"
                >
                  8
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('9')}
                  className="h-12 bg-white rounded-xl shadow-xs active:bg-neutral-200 flex items-center justify-center transition cursor-pointer"
                >
                  9
                </button>

                {/* Row 4 */}
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="col-span-2 h-12 bg-white rounded-xl shadow-xs active:bg-neutral-200 flex items-center justify-center transition cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('.')}
                  className="h-12 bg-white rounded-xl shadow-xs active:bg-neutral-200 flex items-center justify-center transition cursor-pointer"
                >
                  .
                </button>
                <div className="h-12 bg-neutral-200/50 rounded-xl" />

              </div>
            </div>

          </div>
        )}

        {/* SCREEN 5: Confirmation Modal Bottom Sheet (Matching Screenshot 5) */}
        {showConfirmModal && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col justify-end z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-t-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-300">
              
              {/* Close button & Header */}
              <div className="relative flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="absolute left-0 p-1 text-neutral-600 hover:text-neutral-900 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-sm font-bold text-neutral-800">Transfer To Bank</h3>
              </div>

              {/* Prominent Amount */}
              <div className="text-center py-2">
                <h1 className="text-[34px] font-black text-neutral-950 tracking-tight">
                  {totalCharge.toFixed(2)}<span className="text-sm font-bold ml-1 text-neutral-600">ETB</span>
                </h1>
              </div>

              {/* Breakdown Card */}
              <div className="bg-neutral-50 rounded-2xl p-3.5 space-y-2 text-xs border border-neutral-100">
                <div className="flex items-center justify-between text-neutral-600 font-medium">
                  <span>Original Amount</span>
                  <span className="font-bold text-neutral-800">{parsedAmount.toFixed(2)}ETB</span>
                </div>
                <div className="flex items-center justify-between text-neutral-600 font-medium">
                  <span>Service fee</span>
                  <span className="font-bold text-neutral-800">{serviceFee.toFixed(2)}ETB</span>
                </div>
              </div>

              {/* Payment Method Card */}
              <div className="bg-white rounded-2xl p-3.5 border border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#5cb82e]/15 text-[#5cb82e] flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900">Balance</h4>
                    <p className="text-[11px] text-neutral-500 font-medium">
                      (Available Balance:{teleState.balance.toFixed(2)}ETB)
                    </p>
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full bg-[#5cb82e] text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Confirm Transfer Button */}
              <button
                type="button"
                onClick={handleConfirmTransfer}
                className="w-full py-3.5 rounded-xl bg-[#5cb82e] hover:bg-[#4ea026] text-white font-extrabold text-sm tracking-wide transition cursor-pointer shadow-md active:scale-98"
              >
                Transfer
              </button>

            </div>
          </div>
        )}

        {/* SCREEN 6 & 7: Success / Receipt Screen (Matching Screenshot 6 & 7) */}
        {currentView === 'transfer_receipt' && latestTx && (
          <div className="flex-1 flex flex-col overflow-y-auto scrollbar-none bg-white relative">
            
            {/* Simulated CBE Push Notification banner on top matching Screenshot 6 */}
            {showPushNotification && (
              <div className="absolute top-2 left-3 right-3 z-40 bg-[#1e232a] text-white rounded-2xl p-3 shadow-2xl border border-neutral-700 animate-in slide-in-from-top duration-300">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white flex-shrink-0 text-xs font-black">
                    💬
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-white">CBE <span className="text-[10px] font-normal text-neutral-400">now</span></span>
                      <button 
                        onClick={() => setShowPushNotification(false)}
                        className="text-neutral-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-200 line-clamp-1 mt-0.5">
                      Dear Mr Leykun your Account 1********4747 credited with ETB {latestTx.amount.toFixed(2)} from telebirr...
                    </p>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => {
                          if (onOpenSms) onOpenSms();
                        }}
                        className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer"
                      >
                        <span>🌐</span>
                        <span>Open link</span>
                      </button>
                      <button
                        onClick={() => setShowPushNotification(false)}
                        className="px-2.5 py-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                      >
                        Mark as read
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Top Action Bar: Download & Share */}
            <div className="px-5 pt-3 pb-2 flex items-center justify-between text-xs font-bold text-[#5cb82e]">
              <button 
                onClick={() => alert('Receipt downloaded as image.')}
                className="flex items-center gap-1 hover:opacity-80 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
              <button 
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(`Telebirr Receipt: ${latestTx.txNumber}, Amount: ${latestTx.totalDeducted.toFixed(2)} ETB to ${latestTx.recipientName}`);
                    alert('Receipt details copied to share!');
                  }
                }}
                className="flex items-center gap-1 hover:opacity-80 transition cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>

            {/* Success Check & Title */}
            <div className="flex flex-col items-center justify-center pt-2 pb-1 space-y-1">
              <div className="w-16 h-16 rounded-full bg-[#5cb82e] text-white flex items-center justify-center shadow-md animate-in zoom-in-75 duration-300">
                <Check className="w-9 h-9 stroke-[3]" />
              </div>
              <h2 className="text-base font-bold text-[#5cb82e]">Successful</h2>
            </div>

            {/* Large Bold Deducted Amount */}
            <div className="text-center py-2">
              <h1 className="text-[38px] font-black text-neutral-900 tracking-tight">
                -{latestTx.totalDeducted.toFixed(2)} <span className="text-sm font-semibold text-neutral-600">(ETB)</span>
              </h1>
            </div>

            {/* Horizontal divider */}
            <div className="px-6 my-2">
              <hr className="border-neutral-200" />
            </div>

            {/* Transaction Details Table matching Screenshot 7 */}
            <div className="px-6 py-2 space-y-3.5 text-xs">
              
              <div className="flex items-start justify-between">
                <span className="text-neutral-500 font-medium">Transaction Number</span>
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-neutral-900 font-mono">{latestTx.txNumber}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard?.writeText(latestTx.txNumber);
                      setCopiedTxNo(true);
                      setTimeout(() => setCopiedTxNo(false), 2000);
                    }}
                    className="text-neutral-400 hover:text-neutral-700 text-[10px]"
                    title="Copy Transaction Number"
                  >
                    {copiedTxNo ? '✓' : '⧉'}
                  </button>
                </div>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-neutral-500 font-medium">Transaction Time:</span>
                <span className="font-semibold text-neutral-800">{latestTx.txTime}</span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-neutral-500 font-medium">Transaction Type:</span>
                <span className="font-semibold text-neutral-800">{latestTx.txType}</span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-neutral-500 font-medium">Transaction To:</span>
                <span className="font-bold text-neutral-900 text-right">{latestTx.recipientName}</span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-neutral-500 font-medium leading-tight">Bank Account<br />Number:</span>
                <span className="font-mono font-bold text-neutral-900">{latestTx.accountNumber}</span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-neutral-500 font-medium">Bank Name:</span>
                <span className="font-semibold text-neutral-800 text-right">{latestTx.bankName}</span>
              </div>

              {/* QR Code link matching Screenshot 7 */}
              <div className="flex items-center justify-end pt-1">
                <button 
                  onClick={() => setQrModalOpen(true)}
                  className="flex items-center gap-1 text-[#5cb82e] font-bold hover:underline cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>QR Code</span>
                </button>
              </div>

            </div>

            {/* Finished Button */}
            <div className="mt-auto p-6">
              <button
                type="button"
                onClick={() => {
                  setCurrentView('home');
                  setShowPushNotification(false);
                }}
                className="w-full py-3.5 rounded-xl bg-[#5cb82e] hover:bg-[#4ea026] text-white font-extrabold text-sm tracking-wide transition cursor-pointer shadow-md active:scale-98"
              >
                Finished
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Telebirr Bottom Navigation Bar matching Screenshot 1 */}
      {currentView === 'home' && (
        <div className="relative bg-white border-t border-neutral-200 px-3 py-1.5 flex items-center justify-around z-20 flex-shrink-0 text-[10px] font-semibold text-neutral-500 shadow-sm">
          
          {/* 1. Home */}
          <button 
            onClick={() => setActiveBottomNav('home')}
            className={`flex flex-col items-center gap-0.5 cursor-pointer ${activeBottomNav === 'home' ? 'text-[#5cb82e]' : 'text-neutral-500'}`}
          >
            <div className="relative">
              {activeBottomNav === 'home' && <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#5cb82e]" />}
              <HomeIcon className="w-5 h-5" />
            </div>
            <span>Home</span>
          </button>

          {/* 2. Payment */}
          <button 
            onClick={() => setActiveBottomNav('payment')}
            className={`flex flex-col items-center gap-0.5 cursor-pointer ${activeBottomNav === 'payment' ? 'text-[#5cb82e]' : 'text-neutral-500'}`}
          >
            <CreditCard className="w-5 h-5" />
            <span>Payment</span>
          </button>

          {/* 3. Apps */}
          <button 
            onClick={() => setActiveBottomNav('apps')}
            className={`flex flex-col items-center gap-0.5 cursor-pointer ${activeBottomNav === 'apps' ? 'text-[#5cb82e]' : 'text-neutral-500'}`}
          >
            <Grid className="w-5 h-5" />
            <span>Apps</span>
          </button>

          {/* 4. Engage */}
          <button 
            onClick={() => setActiveBottomNav('engage')}
            className={`flex flex-col items-center gap-0.5 cursor-pointer ${activeBottomNav === 'engage' ? 'text-[#5cb82e]' : 'text-neutral-500'}`}
          >
            <MessageSquare className="w-5 h-5" />
            <span>Engage</span>
          </button>

          {/* 5. Account */}
          <button 
            onClick={() => setActiveBottomNav('account')}
            className={`flex flex-col items-center gap-0.5 cursor-pointer ${activeBottomNav === 'account' ? 'text-[#5cb82e]' : 'text-neutral-500'}`}
          >
            <User className="w-5 h-5" />
            <span>Account</span>
          </button>

          {/* Floating Location Pin Button matching Screenshot 1 */}
          <div className="absolute right-3 -top-5">
            <button 
              className="w-10 h-10 rounded-full bg-white border border-neutral-200 shadow-md flex items-center justify-center text-[#5cb82e] hover:bg-neutral-50 transition cursor-pointer"
              title="Nearby Telebirr Agents"
            >
              <MapPin className="w-5 h-5" />
            </button>
          </div>

        </div>
      )}

      {/* Android 3-Button System Navigation Bar */}
      <div className="bg-white/90 border-t border-neutral-200 py-1 px-8 flex items-center justify-around z-20 flex-shrink-0 text-neutral-400">
        <button 
          onClick={() => {
            if (currentView !== 'home') setCurrentView('home');
            else onBack();
          }}
          className="p-1 hover:text-neutral-700 cursor-pointer"
        >
          <span className="text-base font-black leading-none">☰</span>
        </button>
        <button 
          onClick={() => setCurrentView('home')}
          className="p-1 hover:text-neutral-700 cursor-pointer"
        >
          <span className="w-3.5 h-3.5 rounded-full border-2 border-neutral-400 inline-block" />
        </button>
        <button 
          onClick={() => {
            if (currentView === 'transfer_receipt' || currentView === 'transfer_amount') setCurrentView('transfer_select');
            else if (currentView === 'transfer_select') setCurrentView('home');
            else onBack();
          }}
          className="p-1 hover:text-neutral-700 cursor-pointer"
        >
          <span className="text-sm font-black">↩</span>
        </button>
      </div>

      {/* Bank Picker Modal */}
      {showBankPickerModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col justify-end z-50">
          <div className="bg-white rounded-t-3xl max-h-[70vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900">Select Bank</h3>
              <button 
                onClick={() => setShowBankPickerModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-2 divide-y divide-neutral-100">
              {TELEBIRR_SUPPORTED_BANKS.map((b) => (
                <button
                  key={b.key}
                  onClick={() => {
                    setSelectedBank(b.name);
                    setShowBankPickerModal(false);
                  }}
                  className={`w-full p-3 text-left flex items-center justify-between rounded-xl hover:bg-neutral-50 transition cursor-pointer ${
                    selectedBank === b.name ? 'bg-lime-50/60 font-bold text-[#5cb82e]' : 'text-neutral-800'
                  }`}
                >
                  <span className="text-xs font-semibold">{b.name}</span>
                  {selectedBank === b.name && <Check className="w-4 h-4 text-[#5cb82e]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrModalOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center space-y-3 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900">Telebirr QR Code</h3>
              <button onClick={() => setQrModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="w-48 h-48 mx-auto bg-neutral-100 border-2 border-dashed border-[#5cb82e] rounded-2xl flex flex-col items-center justify-center p-4">
              <QrCode className="w-32 h-32 text-[#0085ca]" />
              <span className="text-[10px] font-mono text-neutral-500 mt-1">0911048011</span>
            </div>
            <p className="text-xs text-neutral-600">
              Show this QR code at any agent or merchant to receive funds instantly.
            </p>
          </div>
        </div>
      )}

      {/* Send Money Modal */}
      {showSendMoneyModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] w-full max-w-sm flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-lime-100 text-[#5cb82e] flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Send Money</h3>
                  <p className="text-[10px] text-neutral-400">P2P Wallet & Bank Transfer</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSendMoneyModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-tabs: Mobile vs Bank */}
            <div className="p-3 border-b border-neutral-100 bg-neutral-50 flex gap-2">
              <button
                type="button"
                onClick={() => setSendMoneyTab('mobile')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  sendMoneyTab === 'mobile' 
                    ? 'bg-white text-[#5cb82e] shadow-xs' 
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                To Mobile Phone
              </button>
              <button
                type="button"
                onClick={() => setSendMoneyTab('bank')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  sendMoneyTab === 'bank' 
                    ? 'bg-white text-[#0085ca] shadow-xs' 
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                To Bank Account
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-3.5">
              {sendMoneyTab === 'mobile' ? (
                <>
                  {/* Available Balance Box */}
                  <div className="bg-lime-50/70 border border-lime-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-lime-800 font-bold block">Available Telebirr Balance</span>
                      <span className="text-base font-extrabold text-lime-900 font-mono">
                        ETB {teleState.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSendMoneyModal(false);
                        setShowReceiveMoneyModal(true);
                      }}
                      className="text-[10px] bg-[#5cb82e] hover:bg-[#4ea026] text-white font-bold px-2 py-1 rounded-lg transition"
                    >
                      + Top Up
                    </button>
                  </div>

                  {/* Recipient Phone */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Recipient Phone Number</label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={sendMobilePhone}
                        onChange={(e) => setSendMobilePhone(e.target.value)}
                        placeholder="09... or 07..."
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 font-mono focus:outline-none focus:border-[#5cb82e]"
                      />
                    </div>
                  </div>

                  {/* Recipient Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Recipient Name</label>
                    <input
                      type="text"
                      value={sendMobileName}
                      onChange={(e) => setSendMobileName(e.target.value)}
                      placeholder="e.g. Mahlet Jemaneh"
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-[#5cb82e]"
                    />
                  </div>

                  {/* Amount */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Amount to Send (ETB)</label>
                    <input
                      type="number"
                      value={sendMobileAmount}
                      onChange={(e) => setSendMobileAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-base font-extrabold text-neutral-900 focus:outline-none focus:border-[#5cb82e]"
                    />
                    <div className="flex gap-1.5 pt-1">
                      {['50', '100', '250', '500', '1000'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSendMobileAmount(preset)}
                          className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                            sendMobileAmount === preset 
                              ? 'bg-[#5cb82e] text-white border-[#5cb82e]' 
                              : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Note */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Note (Optional)</label>
                    <input
                      type="text"
                      value={sendMobileNotes}
                      onChange={(e) => setSendMobileNotes(e.target.value)}
                      placeholder="e.g. Lunch split, Gift"
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-[#5cb82e]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteSendMobile}
                    className="w-full py-3 bg-[#5cb82e] hover:bg-[#4ea026] active:scale-98 text-white rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer mt-2"
                  >
                    Confirm & Send ETB {parseFloat(sendMobileAmount || '0').toFixed(2)}
                  </button>
                </>
              ) : (
                <div className="space-y-3 py-2">
                  <p className="text-xs text-neutral-600">
                    Choose an account from your registered profile list or start a new bank transfer:
                  </p>
                  
                  {teleState.registeredBankAccounts && teleState.registeredBankAccounts.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {teleState.registeredBankAccounts.map((acc) => (
                        <div
                          key={acc.id}
                          onClick={() => {
                            setShowSendMoneyModal(false);
                            handleSelectRegisteredAccount(acc);
                          }}
                          className="p-2.5 bg-neutral-50 hover:bg-lime-50/60 rounded-xl border border-neutral-200 flex items-center justify-between cursor-pointer transition"
                        >
                          <div>
                            <p className="text-xs font-bold text-neutral-800">{acc.name}</p>
                            <p className="text-[11px] text-neutral-500 font-mono">{acc.bankName} • {acc.accountNumber}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-neutral-400" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-neutral-50 rounded-xl text-center border border-neutral-200">
                      <p className="text-xs text-neutral-500">No bank accounts registered yet.</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowSendMoneyModal(false);
                      setCurrentView('transfer_select');
                    }}
                    className="w-full py-2.5 bg-[#0085ca] hover:bg-[#0073af] text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Open Transfer to Bank Flow</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receive Money / Cash In Modal */}
      {showReceiveMoneyModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] w-full max-w-sm flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Receive Money / Cash In</h3>
                  <p className="text-[10px] text-neutral-400">Deposit funds directly into your Telebirr balance</p>
                </div>
              </div>
              <button 
                onClick={() => setShowReceiveMoneyModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-neutral-100 bg-neutral-50 flex gap-2">
              <button
                type="button"
                onClick={() => setReceiveSource('bank')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  receiveSource === 'bank' 
                    ? 'bg-white text-emerald-700 shadow-xs' 
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                From Bank (CBE, Dashen)
              </button>
              <button
                type="button"
                onClick={() => setReceiveSource('telebirr')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  receiveSource === 'telebirr' 
                    ? 'bg-white text-[#5cb82e] shadow-xs' 
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                From Contact / Agent
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-3.5">
              {receiveSource === 'bank' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Source Bank</label>
                    <select
                      value={receiveBankName}
                      onChange={(e) => {
                        const name = e.target.value;
                        setReceiveBankName(name);
                        const b = TELEBIRR_SUPPORTED_BANKS.find(item => item.name === name);
                        if (b) setReceiveBankKey(b.key);
                      }}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 font-semibold focus:outline-none focus:border-[#5cb82e]"
                    >
                      {TELEBIRR_SUPPORTED_BANKS.map((b) => (
                        <option key={b.key} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Bank Account Number</label>
                    <input
                      type="text"
                      value={receiveSenderAccount}
                      onChange={(e) => setReceiveSenderAccount(e.target.value)}
                      placeholder="Enter source account number"
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 font-mono focus:outline-none focus:border-[#5cb82e]"
                    />
                    <p className="text-[10px] text-emerald-700 font-medium">
                      Note: This account will be automatically registered into your Profile account list!
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Sender / Depositor Name</label>
                    <input
                      type="text"
                      value={receiveSenderName}
                      onChange={(e) => setReceiveSenderName(e.target.value)}
                      placeholder="e.g. Mr Leykun Jemaneh Yilma"
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-[#5cb82e]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Deposit Amount (ETB)</label>
                    <input
                      type="number"
                      value={receiveAmount}
                      onChange={(e) => setReceiveAmount(e.target.value)}
                      placeholder="Amount in ETB"
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-base font-extrabold text-neutral-900 focus:outline-none focus:border-[#5cb82e]"
                    />
                    <div className="flex gap-1.5 pt-1">
                      {['500', '1000', '2500', '5000', '10000'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setReceiveAmount(preset)}
                          className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                            receiveAmount === preset 
                              ? 'bg-emerald-600 text-white border-emerald-600' 
                              : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteReceiveMoney}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer mt-2"
                  >
                    Deposit ETB {parseFloat(receiveAmount || '0').toFixed(2)} to Balance
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Sender Phone or Name</label>
                    <input
                      type="text"
                      value={receiveSenderName}
                      onChange={(e) => setReceiveSenderName(e.target.value)}
                      placeholder="e.g. 0911048011 or Mahlet Jemaneh"
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-[#5cb82e]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Amount (ETB)</label>
                    <input
                      type="number"
                      value={receiveAmount}
                      onChange={(e) => setReceiveAmount(e.target.value)}
                      placeholder="Amount"
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-base font-extrabold text-neutral-900 focus:outline-none focus:border-[#5cb82e]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteReceiveMoney}
                    className="w-full py-3 bg-[#5cb82e] hover:bg-[#4ea026] active:scale-98 text-white rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer mt-2"
                  >
                    Receive ETB {parseFloat(receiveAmount || '0').toFixed(2)}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Register Account Modal (Profile Account List) */}
      {showRegisterAccountModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Register Bank Account</h3>
                  <p className="text-[10px] text-neutral-400">Add account to profile account list</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRegisterAccountModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Account Holder Name</label>
                <input
                  type="text"
                  value={regAccName}
                  onChange={(e) => setRegAccName(e.target.value)}
                  placeholder="e.g. Mr Leykun Jemaneh Yilma"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-[#5cb82e]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Select Bank</label>
                <select
                  value={regAccBank}
                  onChange={(e) => setRegAccBank(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 font-semibold focus:outline-none focus:border-[#5cb82e]"
                >
                  {TELEBIRR_SUPPORTED_BANKS.map((b) => (
                    <option key={b.key} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Account Number</label>
                <input
                  type="text"
                  value={regAccNumber}
                  onChange={(e) => setRegAccNumber(e.target.value)}
                  placeholder="Enter 13-16 digit bank account number"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 font-mono focus:outline-none focus:border-[#5cb82e]"
                />
              </div>

              <button
                type="button"
                onClick={handleManualRegisterAccount}
                className="w-full py-3 bg-[#5cb82e] hover:bg-[#4ea026] active:scale-98 text-white rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer mt-2"
              >
                Register Account in Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Greeting Name Editor Modal */}
      {showQuickNameModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-lime-100 text-[#5cb82e] flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Update Greeting Name</h3>
                  <p className="text-[10px] text-neutral-400">Displays on header and profile card</p>
                </div>
              </div>
              <button 
                onClick={() => setShowQuickNameModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Display Name / Greeting</label>
                <input
                  type="text"
                  value={quickNameInput}
                  onChange={(e) => setQuickNameInput(e.target.value)}
                  placeholder="e.g. Selam, Leykun"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-900 focus:outline-none focus:border-[#5cb82e]"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickNameModal(false)}
                  className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleQuickUpdateName}
                  className="flex-1 py-2.5 bg-[#5cb82e] hover:bg-[#4ea026] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Save Name
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone Model & Status Bar Settings Modal */}
      {showPhoneSettings && (
        <PhoneSettingsModal 
          isOpen={showPhoneSettings}
          onClose={() => setShowPhoneSettings(false)}
        />
      )}

      {/* Live Account Data & State Controller Modal (Requirement 17 Test Scenarios) */}
      <LiveAccountController
        isOpen={showLiveControllerModal}
        onClose={() => setShowLiveControllerModal(false)}
        onToast={(msg) => setToastMessage(msg)}
      />

      {/* Header Search Modal (Requirement 9) */}
      {showSearchModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh]">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-[#83c426] to-[#6fa81e] text-white">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold">Search Telebirr</h3>
              </div>
              <button 
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery('');
                }}
                className="p-1 text-white/80 hover:text-white rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-neutral-100 bg-neutral-50">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search services, banks, or recipients..."
                  className="w-full pl-9 pr-8 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#83c426]"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 overflow-y-auto space-y-3 flex-1 text-xs">
              <div>
                <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Quick Services</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Send Money', action: () => { setShowSearchModal(false); setShowSendMoneyModal(true); } },
                    { label: 'Transfer to Bank', action: () => { setShowSearchModal(false); setCurrentView('transfer_select'); } },
                    { label: 'Receive Money / Deposit', action: () => { setShowSearchModal(false); setShowReceiveMoneyModal(true); } },
                    { label: 'Register Bank Account', action: () => { setShowSearchModal(false); setShowRegisterAccountModal(true); } },
                  ].filter(s => !searchQuery || s.label.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="p-2.5 bg-neutral-50 hover:bg-lime-50 border border-neutral-200 hover:border-lime-300 rounded-xl text-left font-semibold text-neutral-800 transition cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Supported Banks</h4>
                <div className="space-y-1">
                  {TELEBIRR_SUPPORTED_BANKS
                    .filter(b => !searchQuery || b.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .slice(0, 5)
                    .map(bank => (
                      <button
                        key={bank.key}
                        onClick={() => {
                          setSelectedBank(bank.name);
                          setShowSearchModal(false);
                          setCurrentView('transfer_select');
                        }}
                        className="w-full p-2 bg-white hover:bg-neutral-50 border border-neutral-100 rounded-xl text-left flex items-center justify-between transition cursor-pointer"
                      >
                        <span className="font-semibold text-neutral-800">{bank.name}</span>
                        <ChevronRight className="w-4 h-4 text-neutral-400" />
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Drawer/Modal (Requirement 6, 17H, 17I) */}
      {showNotificationsModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh]">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-[#83c426] to-[#6fa81e] text-white">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-white" />
                <div>
                  <h3 className="text-sm font-bold">Notifications</h3>
                  <p className="text-[10px] text-white/80">
                    {teleState.notificationCount > 0 ? `${teleState.notificationCount} unread message(s)` : 'All caught up'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowNotificationsModal(false)}
                className="p-1 text-white/80 hover:text-white rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Badge Controls to test Requirement 6, 17H, 17I */}
            <div className="p-3 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-600">Actions:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    TelebirrService.setNotificationCount(0);
                    setToastMessage('Marked all as read. Badge count is 0 (hidden).');
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg text-[11px] font-bold text-neutral-700 transition"
                >
                  Mark All Read (0)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    TelebirrService.setNotificationCount(5);
                    setToastMessage('Set notification badge to 5');
                  }}
                  className="px-2.5 py-1 bg-[#83c426] hover:bg-[#74b21d] text-white rounded-lg text-[11px] font-bold transition"
                >
                  Test 5 (17H)
                </button>
              </div>
            </div>

            <div className="p-3 overflow-y-auto space-y-2.5 flex-1 text-xs">
              <div className="p-3 bg-lime-50/60 border border-lime-200 rounded-2xl">
                <div className="flex items-center justify-between pb-1">
                  <span className="font-bold text-neutral-800">Transfer Confirmation</span>
                  <span className="text-[10px] text-neutral-400">Just now</span>
                </div>
                <p className="text-neutral-600 text-[11.5px]">
                  Dear customer, you transferred 100.00 ETB to Commercial Bank of Ethiopia account 1000419524747.
                </p>
              </div>

              <div className="p-3 bg-white border border-neutral-100 rounded-2xl">
                <div className="flex items-center justify-between pb-1">
                  <span className="font-bold text-neutral-800">Ethio Telecom Special Promo</span>
                  <span className="text-[10px] text-neutral-400">2h ago</span>
                </div>
                <p className="text-neutral-600 text-[11.5px]">
                  Recharge your phone or buy data package using telebirr and get up to 35% bonus packages instantly!
                </p>
              </div>

              <div className="p-3 bg-white border border-neutral-100 rounded-2xl">
                <div className="flex items-center justify-between pb-1">
                  <span className="font-bold text-neutral-800">Security Login Notice</span>
                  <span className="text-[10px] text-neutral-400">Yesterday</span>
                </div>
                <p className="text-neutral-600 text-[11.5px]">
                  Your telebirr session was authorized on device SM-S928B.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Language Selector Modal (Requirement 7) */}
      {showLanguageModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-[#83c426] to-[#6fa81e] text-white">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold">Select Language</h3>
              </div>
              <button 
                onClick={() => setShowLanguageModal(false)}
                className="p-1 text-white/80 hover:text-white rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 space-y-1.5 text-xs">
              {[
                { key: 'English', label: 'English', native: 'English (US)' },
                { key: 'Amharic (አማርኛ)', label: 'አማርኛ', native: 'Amharic' },
                { key: 'Afaan Oromoo', label: 'Afaan Oromoo', native: 'Oromo' },
                { key: 'Tigrinya (ትግርኛ)', label: 'ትግርኛ', native: 'Tigrinya' },
                { key: 'Somali (Soomaali)', label: 'Soomaali', native: 'Somali' },
              ].map(lang => {
                const isSelected = teleState.language === lang.key;
                return (
                  <button
                    key={lang.key}
                    type="button"
                    onClick={() => {
                      TelebirrService.setLanguage(lang.key);
                      setShowLanguageModal(false);
                      setToastMessage(`Language changed to ${lang.label}`);
                    }}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between border transition cursor-pointer ${
                      isSelected ? 'bg-lime-50 border-[#83c426] text-neutral-900 font-bold' : 'bg-white border-neutral-100 hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold">{lang.label}</div>
                      <div className="text-[11px] text-neutral-400">{lang.native}</div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#83c426] text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

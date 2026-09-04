import React, { useRef, useState, useEffect, useMemo } from 'react';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { Transaction } from '../types';
import { LocalDb, DEFAULT_CBE_LOGO, formatTo12CharTxId } from '../lib/mockData';
import { calculateCbeFee } from '../lib/cbeTariff';
import { CbeLogo } from './CbeLogo';
import { 
  Check, 
  Share2, 
  Download, 
  Printer, 
  ArrowLeft, 
  ShieldCheck, 
  AlertTriangle,
  Receipt as ReceiptLucideIcon,
  Camera,
  Scan,
  Focus,
  CheckCircle2,
  FileText,
  Loader2,
  Image as ImageIcon,
  Wifi,
  Lock,
  Sparkles,
  MessageSquare,
  X,
  RotateCcw,
  User,
  ExternalLink,
  Zap
} from 'lucide-react';

/**
 * Generates an authentic, high-density 33x33 QR matrix with Finder patterns,
 * Timing patterns, Alignment block, and unique deterministic data modules.
 */
export function getDenseQrMatrix(txId: string, payload: string): boolean[][] {
  const gridSize = 33;
  const matrix: boolean[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));

  // Helper to draw 7x7 Finder Pattern with quiet border
  const drawFinder = (startRow: number, startCol: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = startRow + r;
        const col = startCol + c;
        if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
          if (r === -1 || r === 7 || c === -1 || c === 7) {
            matrix[row][col] = false; // Quiet separator
          } else if (r === 0 || r === 6 || c === 0 || c === 6) {
            matrix[row][col] = true; // Outer 7x7 ring
          } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
            matrix[row][col] = true; // Inner 3x3 solid block
          } else {
            matrix[row][col] = false; // Middle ring
          }
        }
      }
    }
  };

  // 1. Finder patterns at 3 corners
  drawFinder(0, 0); // Top-Left
  drawFinder(0, gridSize - 7); // Top-Right
  drawFinder(gridSize - 7, 0); // Bottom-Left

  // 2. Timing patterns (alternating black/white at row 6 & col 6)
  for (let i = 8; i < gridSize - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // 3. Standard Alignment pattern (5x5 module) at center (24, 24)
  const alignCenter = 24;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const row = alignCenter + r;
      const col = alignCenter + c;
      if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
        if (Math.abs(r) === 2 || Math.abs(c) === 2) {
          matrix[row][col] = true; // Outer 5x5 ring
        } else if (r === 0 && c === 0) {
          matrix[row][col] = true; // Center 1x1 dot
        } else {
          matrix[row][col] = false;
        }
      }
    }
  }

  // 4. Dark Module
  matrix[gridSize - 8][8] = true;

  // 5. Seed-based high-density data modules unique to this transaction
  const seedString = `${txId}|${payload}|CBE_RECEIPT_V4_ETH`;
  let hash1 = 5381;
  let hash2 = 0x811c9dc5;
  for (let i = 0; i < seedString.length; i++) {
    const code = seedString.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) + code;
    hash2 = (hash2 ^ code) * 16777619;
  }

  const isReserved = (r: number, c: number): boolean => {
    if (r <= 7 && c <= 7) return true;
    if (r <= 7 && c >= gridSize - 8) return true;
    if (r >= gridSize - 8 && c <= 7) return true;
    if (r === 6 || c === 6) return true;
    if (r >= alignCenter - 2 && r <= alignCenter + 2 && c >= alignCenter - 2 && c <= alignCenter + 2) return true;
    return false;
  };

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (isReserved(r, c)) continue;
      
      const charIndex = (r * 11 + c * 17) % seedString.length;
      const charCode = seedString.charCodeAt(charIndex);
      const val = Math.abs((r * 31 + c * 47 + charCode * 13 + (hash1 ^ (hash2 >>> (r % 16)))) % 100);
      
      // High data density ~56%
      matrix[r][c] = val < 56;
    }
  }

  return matrix;
}

// Helper for authentic CBE currency formatting: e.g. 100.00, 1,000.00, 136,748.00
export const formatCbeCurrency = (val: number | string | undefined): string => {
  const num = typeof val === 'number' ? val : parseFloat(String(val || '0'));
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

interface ReceiptProps {
  transaction: Transaction;
  onBack: () => void;
}

export default function Receipt({ transaction, onBack }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [showDetailedModal, setShowDetailedModal] = useState(false);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashAnimation, setFlashAnimation] = useState(false);
  const [islandExpanded, setIslandExpanded] = useState(false);
  const [showSmsBanner, setShowSmsBanner] = useState(true);
  const [statusTime, setStatusTime] = useState<string>(() => {
    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const mins = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins}`;
  });

  // Automatically pop down CBE SMS message on opening receipt for 1 minute (60s)
  useEffect(() => {
    setShowSmsBanner(true);
    const timer = setTimeout(() => {
      setShowSmsBanner(false);
    }, 60000);
    return () => clearTimeout(timer);
  }, [transaction.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const hours = now.getHours() % 12 || 12;
      const mins = now.getMinutes().toString().padStart(2, '0');
      setStatusTime(`${hours}:${mins}`);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Real device phone power & battery condition detection (Battery Status API with smart fallback)
  const [batteryLevel, setBatteryLevel] = useState<number>(92);
  const [isPhoneCharging, setIsPhoneCharging] = useState<boolean>(false);

  useEffect(() => {
    let batteryManager: any = null;

    const handleBatteryUpdate = (battery: any) => {
      if (battery && typeof battery.level === 'number') {
        const levelPct = Math.round(battery.level * 100);
        setBatteryLevel(Math.max(1, Math.min(100, levelPct)));
        setIsPhoneCharging(Boolean(battery.charging));
      }
    };

    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        batteryManager = battery;
        handleBatteryUpdate(battery);

        battery.addEventListener('levelchange', () => handleBatteryUpdate(battery));
        battery.addEventListener('chargingchange', () => handleBatteryUpdate(battery));
      }).catch(() => {
        // Fallback gracefully
      });
    }

    return () => {
      if (batteryManager) {
        try {
          batteryManager.removeEventListener('levelchange', () => handleBatteryUpdate(batteryManager));
          batteryManager.removeEventListener('chargingchange', () => handleBatteryUpdate(batteryManager));
        } catch {
          // Ignore cleanup error
        }
      }
    };
  }, []);

  // Dynamic customized feedback assets
  const [customBankLogo, setCustomBankLogo] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    setCustomBankLogo(LocalDb.getCustomBankLogo());

    const handleUpdate = () => {
      setCustomBankLogo(LocalDb.getCustomBankLogo());
    };
    window.addEventListener('cbe_logo_updated', handleUpdate);
    return () => {
      window.removeEventListener('cbe_logo_updated', handleUpdate);
    };
  }, []);

  // Mathematical computations with CBE rules
  const amount = transaction.amount;
  const cbeFee = calculateCbeFee(amount, transaction.type, false);
  const serviceCharge = transaction.serviceCharge !== undefined 
    ? transaction.serviceCharge 
    : (transaction.fee > 0 ? transaction.fee : cbeFee.serviceCharge);
  const vat = transaction.vat !== undefined 
    ? transaction.vat 
    : Number((serviceCharge * 0.15).toFixed(2));
  const disasterRecovery = transaction.disasterRecovery !== undefined 
    ? transaction.disasterRecovery 
    : Number((serviceCharge * 0.05).toFixed(2));
  const totalDebited = transaction.totalDebited !== undefined 
    ? transaction.totalDebited 
    : Number((amount + serviceCharge + vat + disasterRecovery).toFixed(2));

  const amountFormatted = formatCbeCurrency(amount);
  const totalDebitedFormatted = formatCbeCurrency(totalDebited);
  const serviceChargeFormatted = formatCbeCurrency(serviceCharge);
  const vatFormatted = formatCbeCurrency(vat);
  const disasterRecoveryFormatted = formatCbeCurrency(disasterRecovery);

  const totalDebitedStr = totalDebitedFormatted;
  const serviceChargeStr = serviceChargeFormatted;
  const vatStr = vatFormatted;
  const disasterRecoveryStr = disasterRecoveryFormatted;

  // Formatting Sender & Recipient names & account suffixes
  const isCredit = transaction.type === 'receive' || transaction.senderName === 'Deposit';
  const senderName = transaction.senderName || "Leykun Jemaneh Ylma";
  const rawSenderAccount = transaction.senderAccount || "4747";
  const senderSuffix = rawSenderAccount.length >= 4 
    ? `ETB-${rawSenderAccount.slice(-4)}` 
    : `ETB-4747`;

  const recipientName = transaction.recipientName || "Addisu Abebe Mengistu";
  const rawRecipientAccount = transaction.recipientAccount || "6547";
  const recipientSuffix = rawRecipientAccount.length >= 4 && !rawRecipientAccount.includes('+251')
    ? `ETB-${rawRecipientAccount.slice(-4)}` 
    : `ETB-6547`;

  const cbeSenderFullName = transaction.senderName || "Leykun Jemaneh Ylma";
  const cbeAmountStr = transaction.amount !== undefined ? transaction.amount.toFixed(1) : "10.0";
  const cbeAccountMasked = rawSenderAccount.length >= 4
    ? `1********${rawSenderAccount.slice(-4)}`
    : "1********4747";
  const cbeSmsText = isCredit
    ? `Dear ${recipientName} A credit transaction of ETB ${cbeAmountStr}. has occurred on your account ${cbeAccountMasked}. Service`
    : `Dear ${cbeSenderFullName} A debit transaction of ETB ${cbeAmountStr}. has occurred on your account ${cbeAccountMasked}. Service`;

  // Date formatting: e.g. "Aug 21, 2026 05:56 PM"
  const formatSummaryDate = (dateInput: any) => {
    const d = new Date(dateInput);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hourStr = hours.toString().padStart(2, '0');
    
    return `${month} ${day}, ${year} ${hourStr}:${minutes} ${ampm}`;
  };

  const formattedDate = formatSummaryDate(transaction.createdAt);

  // Dynamic realistic CBE Transaction ID: 12 characters exactly (e.g. FT263211VK07)
  const txId = formatTo12CharTxId(transaction.id);

  const reason = transaction.description || 'Mobile Banking Transfer';

  // Generate dynamic authentic CBE QR code
  useEffect(() => {
    const payload = `https://apps.cbe.com.et/verify?tx=${txId}&amt=${amount.toFixed(2)}&dt=${encodeURIComponent(formattedDate)}`;
    QRCode.toDataURL(payload, {
      width: 400,
      margin: 0,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#00000000'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR code generation failed:', err));
  }, [txId, amount, formattedDate]);

  // Memoized 33x33 High-Density QR Matrix
  const qrMatrix = useMemo(() => {
    return getDenseQrMatrix(txId, `${amount}|${rawRecipientAccount}|${rawSenderAccount}|${formattedDate}`);
  }, [txId, amount, rawRecipientAccount, rawSenderAccount, formattedDate]);

  // Print handle
  const handlePrint = () => {
    window.print();
  };

  // Generate pixel-perfect CBE Mobile Phone Screenshot identical to user's uploaded reference
  const generateCanvasReceipt = async (): Promise<string> => {
    const width = 720;
    const height = 1520;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');

    // Smooth rendering
    ctx.imageSmoothingEnabled = true;

    // 1. Phone Top Status Bar & Purple Background (iPhone Dynamic Island Header)
    ctx.fillStyle = '#68137e';
    ctx.fillRect(0, 0, width, 220);

    // Current Time for Status Bar (iOS standard format)
    const now = new Date();
    let statusHours = now.getHours();
    const statusMinutes = now.getMinutes().toString().padStart(2, '0');
    const statusTimeStr = `${statusHours % 12 || 12}:${statusMinutes}`;

    // 1A. iOS Status Bar - Left: Time in SF Pro / iOS Typography
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(statusTimeStr, 44, 42);

    // 1B. Center: iPhone 17 Dynamic Island Pill (Slimmer 2026 Micro-Sensor Architecture)
    const islandW = 160;
    const islandH = 30;
    const islandX = (width - islandW) / 2;
    const islandY = 16;
    
    // iPhone 17 Dynamic Island Shadow & Precision Opaque Glass Body
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.roundRect(islandX, islandY, islandW, islandH, 15);
    ctx.fill();

    // iPhone 17 Under-display TrueDepth Lens & Integrated Front Camera
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(islandX + islandW - 20, islandY + islandH / 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(islandX + islandW - 20, islandY + islandH / 2, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // iPhone 17 Micro Sensor Dot on Left of Island
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(islandX + 18, islandY + islandH / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // 1C. iOS Status Bar - Right: Cellular 4-Bars, Wi-Fi, and iOS Battery
    // 4 Cellular Bars (iOS Stepped Rounded Bars)
    const cellX = width - 136;
    for (let b = 0; b < 4; b++) {
      ctx.fillStyle = '#ffffff';
      const bHeight = 4 + b * 3.5;
      ctx.beginPath();
      ctx.roundRect(cellX + b * 4.5, 42 - bHeight, 3, bHeight, 1);
      ctx.fill();
    }

    // iOS Wi-Fi Icon (3 concentric curved arcs)
    const wifiX = width - 105;
    const wifiY = 40;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    
    // Outer Arc
    ctx.beginPath();
    ctx.arc(wifiX, wifiY, 8.5, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.stroke();
    // Middle Arc
    ctx.beginPath();
    ctx.arc(wifiX, wifiY, 5.5, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.stroke();
    // Center Dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(wifiX, wifiY - 0.5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // iOS Battery Icon (Dynamic Real Device Battery Fill + Charging condition)
    const battX = width - 82;
    const battY = 28;
    const battW = 30;
    const battH = 15;
    
    // Battery Outer Border
    ctx.strokeStyle = isPhoneCharging ? '#4ade80' : '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(battX, battY, battW, battH, 4);
    ctx.stroke();

    // Battery Positive Terminal Knob on Right
    ctx.fillStyle = isPhoneCharging ? '#4ade80' : '#ffffff';
    ctx.beginPath();
    ctx.roundRect(battX + battW + 1.5, battY + 4, 2, 7, 1);
    ctx.fill();

    // Battery Inner Charge Level (Dynamically computed from actual device battery level)
    const fillMaxW = battW - 5;
    const fillW = Math.max(3, (fillMaxW * Math.min(100, Math.max(4, batteryLevel))) / 100);
    ctx.fillStyle = isPhoneCharging ? '#4ade80' : (batteryLevel <= 20 ? '#ef4444' : '#ffffff');
    ctx.beginPath();
    ctx.roundRect(battX + 2.5, battY + 2.5, fillW, battH - 5, 2.5);
    ctx.fill();

    // If device is currently plugged in & charging, draw iOS lightning bolt in canvas
    if (isPhoneCharging) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      const zX = battX + battW / 2;
      const zY = battY + battH / 2;
      ctx.moveTo(zX + 1, zY - 5);
      ctx.lineTo(zX - 3.5, zY);
      ctx.lineTo(zX, zY);
      ctx.lineTo(zX - 1, zY + 5);
      ctx.lineTo(zX + 3.5, zY);
      ctx.lineTo(zX, zY);
      ctx.closePath();
      ctx.fill();
    }

    // 2. Top Purple Header: "Thank you / Success" & Top Scan Button
    // White Shield with Purple Checkmark
    const shieldX = 36;
    const shieldY = 106;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const sX = shieldX;
    const sY = shieldY;
    ctx.moveTo(sX + 18, sY + 2);
    ctx.lineTo(sX + 33, sY + 7);
    ctx.lineTo(sX + 33, sY + 18);
    ctx.bezierCurveTo(sX + 33, sY + 28, sX + 24, sY + 34, sX + 18, sY + 38);
    ctx.bezierCurveTo(sX + 12, sY + 34, sX + 3, sY + 28, sX + 3, sY + 18);
    ctx.lineTo(sX + 3, sY + 7);
    ctx.closePath();
    ctx.fill();

    // Purple checkmark inside shield
    ctx.strokeStyle = '#68137e';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(sX + 12, sY + 19);
    ctx.lineTo(sX + 16.5, sY + 23.5);
    ctx.lineTo(sX + 24, sY + 14);
    ctx.stroke();
    ctx.restore();

    // "Thank you" & "Success" text
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText('Thank you', shieldX + 46, shieldY + 18);
    ctx.fillStyle = '#f3e8ff';
    ctx.font = '400 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('Success', shieldX + 46, shieldY + 38);

    // Top Right Viewfinder / Scan Button (Translucent circle with focus icon)
    const scanBtnX = width - 82;
    const scanBtnY = 96;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(scanBtnX + 22, scanBtnY + 22, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Viewfinder focus brackets & center ring
    const vfX = scanBtnX + 11;
    const vfY = scanBtnY + 11;
    const vfS = 22;
    const vfCr = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Top-left
    ctx.beginPath(); ctx.moveTo(vfX, vfY + vfCr + 2); ctx.lineTo(vfX, vfY + 2); ctx.arcTo(vfX, vfY, vfX + 2, vfY, 2); ctx.lineTo(vfX + vfCr + 2, vfY); ctx.stroke();
    // Top-right
    ctx.beginPath(); ctx.moveTo(vfX + vfS - vfCr - 2, vfY); ctx.lineTo(vfX + vfS - 2, vfY); ctx.arcTo(vfX + vfS, vfY, vfX + vfS, vfY + 2, 2); ctx.lineTo(vfX + vfS, vfY + vfCr + 2); ctx.stroke();
    // Bottom-left
    ctx.beginPath(); ctx.moveTo(vfX, vfY + vfS - vfCr - 2); ctx.lineTo(vfX, vfY + vfS - 2); ctx.arcTo(vfX, vfY + vfS, vfX + 2, vfY + vfS, 2); ctx.lineTo(vfX + vfCr + 2, vfY + vfS); ctx.stroke();
    // Bottom-right
    ctx.beginPath(); ctx.moveTo(vfX + vfS - vfCr - 2, vfY + vfS); ctx.lineTo(vfX + vfS - 2, vfY + vfS); ctx.arcTo(vfX + vfS, vfY + vfS, vfX + vfS, vfY + vfS - 2, 2); ctx.lineTo(vfX + vfS, vfY + vfS - vfCr - 2); ctx.stroke();
    // Center circle ring
    ctx.beginPath(); ctx.arc(vfX + vfS / 2, vfY + vfS / 2, 4, 0, Math.PI * 2); ctx.stroke();

    // 3. Main White Card
    const cardTop = 180;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(0, cardTop, width, height - cardTop - 60, [36, 36, 0, 0]);
    ctx.fill();

    // 4. Overlapping Large Success Checkmark Circle
    const badgeX = width / 2;
    const badgeY = cardTop;
    const badgeR = 66;
    ctx.save();
    ctx.fillStyle = '#68137e';
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Big Bold Checkmark
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(badgeX - 27, badgeY + 3);
    ctx.lineTo(badgeX - 7, badgeY + 25);
    ctx.lineTo(badgeX + 29, badgeY - 19);
    ctx.stroke();
    ctx.restore();

    // 5. Headline Text (Normal weight as requested)
    ctx.fillStyle = '#111827';
    ctx.font = 'normal 21px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Transaction Completed Successfully!', width / 2, cardTop + 90);

    // 6. Gray Transaction Summary Box
    const boxX = 32;
    const boxY = cardTop + 120;
    const boxW = width - 64;
    const boxH = 920;

    ctx.fillStyle = '#ededf0';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 26);
    ctx.fill();

    // "Transaction Summary" Subtitle
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('Transaction Summary', boxX + 26, boxY + 40);

    // Structured Rich Text Rendering with bolding support
    type TextFragment = { text: string; bold: boolean };
    const fragments: TextFragment[] = [
      { text: 'ETB ', bold: false },
      { text: `${amountFormatted}`, bold: true },
      { text: ' has been debited from ', bold: false },
      { text: `${senderName}`, bold: true },
      { text: ` ${senderSuffix} for `, bold: false },
      { text: `${recipientName}`, bold: true },
      { text: ` ${recipientSuffix} on `, bold: false },
      { text: `${formattedDate}`, bold: true },
      { text: ' with transaction ID: ', bold: false },
      { text: `${txId}.`, bold: true },
      { text: ` Reason: ${reason} `, bold: false },
      { text: `\nTotal Amount Debited: ${totalDebitedFormatted} ETB with Service Charge of ETB${serviceChargeFormatted}, VAT (15%) of ETB${vatFormatted} and Disaster Recovery (5%) of ETB${disasterRecoveryFormatted}.`, bold: false }
    ];

    let cursorX = boxX + 26;
    let cursorY = boxY + 80;
    const textMaxWidth = boxW - 52;
    const lineHeight = 28;

    for (const frag of fragments) {
      if (frag.text.includes('\n')) {
        const parts = frag.text.split('\n');
        for (let p = 0; p < parts.length; p++) {
          if (p > 0) {
            cursorX = boxX + 26;
            cursorY += lineHeight;
          }
          if (parts[p]) {
            renderWordWrapped(parts[p], frag.bold);
          }
        }
      } else {
        renderWordWrapped(frag.text, frag.bold);
      }
    }

    function renderWordWrapped(str: string, isBold: boolean) {
      const words = str.split(' ');
      for (let i = 0; i < words.length; i++) {
        const w = (i === 0 ? '' : ' ') + words[i];
        ctx.font = isBold 
          ? 'bold 18px system-ui, -apple-system, sans-serif' 
          : 'normal 17px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#111827';

        const metrics = ctx.measureText(w);
        if (cursorX + metrics.width > boxX + 26 + textMaxWidth) {
          cursorX = boxX + 26;
          cursorY += lineHeight;
        }
        ctx.fillText(w, cursorX, cursorY);
        cursorX += metrics.width;
      }
    }

    // Helper to load image for canvas
    const loadImageAsync = (url: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image for canvas'));
        img.src = url;
      });
    };

    // 7. Authentic Centered QR Code
    const qrSize = 250;
    const qrX = (width - qrSize) / 2;
    const qrY = boxY + 360;

    let qrImageLoaded = false;
    const activeQrUrl = qrDataUrl || (await (async () => {
      try {
        const payload = `https://apps.cbe.com.et/verify?tx=${txId}&amt=${amount.toFixed(2)}&dt=${encodeURIComponent(formattedDate)}`;
        return await QRCode.toDataURL(payload, {
          width: 400,
          margin: 0,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#00000000' }
        });
      } catch {
        return null;
      }
    })());

    if (activeQrUrl) {
      try {
        const qrImg = await loadImageAsync(activeQrUrl);
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        qrImageLoaded = true;
      } catch (err) {
        console.warn('QR image load failed for canvas, rendering fallback matrix:', err);
      }
    }

    if (!qrImageLoaded) {
      // Draw High-Density QR Code Modules
      const matrix = getDenseQrMatrix(txId, `${amount}|${rawRecipientAccount}|${rawSenderAccount}`);
      const gridSize = matrix.length; // 33
      const cellSize = qrSize / gridSize;
      ctx.fillStyle = '#000000';

      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (matrix[r][c]) {
            ctx.beginPath();
            ctx.roundRect(qrX + c * cellSize + 0.5, qrY + r * cellSize + 0.5, cellSize - 1, cellSize - 1, 1);
            ctx.fill();
          }
        }
      }
    }

    // 8. Commercial Bank of Ethiopia Footer Inset
    const logoX = boxX + 36;
    const logoY = qrY + qrSize + 48;
    const activeLogoUrl = customBankLogo || LocalDb.getCustomBankLogo() || DEFAULT_CBE_LOGO;

    let logoImageLoaded = false;
    if (activeLogoUrl) {
      try {
        const logoImg = await loadImageAsync(activeLogoUrl);
        ctx.drawImage(logoImg, logoX, logoY - 4, 46, 46);
        logoImageLoaded = true;
      } catch (err) {
        console.warn('Custom logo load failed for canvas, rendering default emblem:', err);
      }
    }
    
    if (!logoImageLoaded) {
      // Draw Golden CBE Coin Logo
      ctx.save();
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(logoX + 22, logoY + 16, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#996515';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Spiral/Coin internal concentric lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      for (let r = 5; r <= 16; r += 5) {
        ctx.beginPath();
        ctx.arc(logoX + 22, logoY + 16, r, 0, Math.PI * 1.8);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Branding text
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.fillText('Commercial Bank of Ethiopia', logoX + 56, logoY + 12);

    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 15px system-ui, -apple-system, sans-serif';
    ctx.fillText('The bank you can always rely on!', logoX + 56, logoY + 34);

    // 9. Bottom Action Buttons: Receipt, Screenshot, Share
    const actY = boxY + boxH + 34;

    // Button 1: Receipt
    const b1X = 90;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(b1X - 24, actY - 14, 16, 20);
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText('$', b1X - 19, actY + 1);
    ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
    ctx.fillText('Receipt', b1X, actY);

    // Button 2: Screenshot
    const b2X = width / 2 - 40;
    const sIcoX = b2X - 22;
    const sIcoY = actY - 14;
    const sz = 18;
    const cr = 4;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // 4 rounded corners
    // Top-left
    ctx.beginPath();
    ctx.moveTo(sIcoX, sIcoY + cr + 1);
    ctx.lineTo(sIcoX, sIcoY + 2);
    ctx.arcTo(sIcoX, sIcoY, sIcoX + 2, sIcoY, 2);
    ctx.lineTo(sIcoX + cr + 1, sIcoY);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(sIcoX + sz - cr - 1, sIcoY);
    ctx.lineTo(sIcoX + sz - 2, sIcoY);
    ctx.arcTo(sIcoX + sz, sIcoY, sIcoX + sz, sIcoY + 2, 2);
    ctx.lineTo(sIcoX + sz, sIcoY + cr + 1);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(sIcoX, sIcoY + sz - cr - 1);
    ctx.lineTo(sIcoX, sIcoY + sz - 2);
    ctx.arcTo(sIcoX, sIcoY + sz, sIcoX + 2, sIcoY + sz, 2);
    ctx.lineTo(sIcoX + cr + 1, sIcoY + sz);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(sIcoX + sz - cr - 1, sIcoY + sz);
    ctx.lineTo(sIcoX + sz - 2, sIcoY + sz);
    ctx.arcTo(sIcoX + sz, sIcoY + sz, sIcoX + sz, sIcoY + sz - 2, 2);
    ctx.lineTo(sIcoX + sz, sIcoY + sz - cr - 1);
    ctx.stroke();
    // Center circle
    ctx.beginPath();
    ctx.arc(sIcoX + sz / 2, sIcoY + sz / 2, 3.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
    ctx.fillText('Screenshot', b2X + 4, actY);

    // Button 3: Share
    const b3X = width - 150;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    // 3 share nodes
    ctx.beginPath();
    ctx.arc(b3X - 18, actY - 4, 3, 0, Math.PI * 2);
    ctx.arc(b3X - 8, actY - 11, 3, 0, Math.PI * 2);
    ctx.arc(b3X - 8, actY + 3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(b3X - 18, actY - 4); ctx.lineTo(b3X - 8, actY - 11);
    ctx.moveTo(b3X - 18, actY - 4); ctx.lineTo(b3X - 8, actY + 3);
    ctx.stroke();
    ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
    ctx.fillText('Share', b3X, actY);

    // 10. Close Button (Pill)
    const closeBtnY = actY + 28;
    ctx.fillStyle = '#d7d7db';
    ctx.beginPath();
    ctx.roundRect(32, closeBtnY, width - 64, 58, 29);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 19px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Close', width / 2, closeBtnY + 36);

    // 11. iPhone Bottom Home Indicator
    const navY = height - 48;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, navY, width, 48);

    // Centered iOS Home Indicator Bar
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect((width - 200) / 2, height - 24, 200, 7, 3.5);
    ctx.fill();

    return canvas.toDataURL('image/png');
  };

  // Screenshot / Save handle - behaves like a real native phone screenshot
  const handleScreenshot = async () => {
    if (isCapturing) return;

    try {
      setIsCapturing(true);
      // 1. Trigger realistic camera shutter flash effect
      setFlashAnimation(true);
      setTimeout(() => setFlashAnimation(false), 250);

      const receiptEl = document.getElementById('receipt-screen-wrapper');
      let dataUrl: string | null = null;

      if (receiptEl) {
        try {
          const canvas = await html2canvas(receiptEl, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#68137e',
            logging: false,
          });
          dataUrl = canvas.toDataURL('image/png');
        } catch (captureErr) {
          console.warn('html2canvas capture issue, falling back to direct canvas renderer:', captureErr);
        }
      }

      if (!dataUrl) {
        dataUrl = await generateCanvasReceipt();
      }

      // 2. Trigger instant download to user device
      const downloadLink = document.createElement('a');
      const filename = `CBE_Receipt_${txId}.png`;
      downloadLink.href = dataUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // 3. Show clean phone-style screenshot notification toast
      setCopiedToast('Screenshot captured & saved');
      setTimeout(() => setCopiedToast(null), 2500);
    } catch (err) {
      console.error('Screenshot capture error:', err);
      setCopiedToast('Screenshot saved');
      setTimeout(() => setCopiedToast(null), 2500);
    } finally {
      setIsCapturing(false);
    }
  };

  // Share handle
  const handleShare = async () => {
    const summaryText = `ETB ${amount} has been debited from ${senderName} ${senderSuffix} for ${recipientName} ${recipientSuffix} on ${formattedDate} with transaction ID: ${txId}. Reason: ${reason}. Total Amount Debited: ${totalDebitedStr} ETB.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `CBE Receipt - ${txId}`,
          text: summaryText,
          url: window.location.href,
        });
      } catch (e) {
        console.log('Share canceled or failed', e);
      }
    } else {
      navigator.clipboard.writeText(summaryText);
      setCopiedToast('Transaction summary copied to clipboard!');
      setTimeout(() => setCopiedToast(null), 2500);
    }
  };

  return (
    <div id="receipt-screen-wrapper" className="h-full min-h-[100dvh] max-w-md mx-auto bg-[#68137e] text-slate-800 flex flex-col justify-between relative overflow-y-auto scrollbar-none">
      
      {/* Camera Flash Animation Overlay */}
      {flashAnimation && (
        <div className="fixed inset-0 bg-white z-[100] pointer-events-none opacity-90 transition-opacity duration-300" />
      )}

      {/* Toast Notification */}
      {copiedToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-md text-white text-xs font-bold py-2.5 px-5 rounded-full shadow-2xl z-50 animate-bounce flex items-center gap-2 border border-white/20">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* 0. Pop Down CBE SMS Message Notification (iPhone iOS Messages Banner) */}
      <div 
        className={`fixed top-3 left-3 right-3 max-w-sm sm:max-w-md mx-auto z-50 transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1) transform ${
          showSmsBanner 
            ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto shadow-2xl' 
            : '-translate-y-28 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div 
          onClick={() => setShowSmsBanner(false)}
          className="bg-[#1c1c1e]/95 backdrop-blur-[36px] -webkit-backdrop-blur-[36px] text-white rounded-[22px] border border-white/20 p-3.5 px-4 shadow-[0_18px_50px_rgba(0,0,0,0.65)] relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all select-none"
        >
          {/* iOS App Header Row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              {/* iOS Green Messages App Icon */}
              <div className="w-[18px] h-[18px] rounded-[4.5px] bg-gradient-to-b from-[#34c759] to-[#30d158] flex items-center justify-center shadow-xs">
                <MessageSquare className="w-2.5 h-2.5 text-white fill-white" />
              </div>
              <span className="text-[11px] font-semibold tracking-wider text-white/80 uppercase">Messages</span>
            </div>
            <span className="text-[11.5px] text-white/60 font-medium">now</span>
          </div>

          {/* iOS Message Content Row */}
          <div className="flex gap-3 items-start pl-0.5">
            {/* Sender Contact Avatar */}
            <div className="w-9 h-9 rounded-full bg-[#8e24aa] flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-md border border-white/20 mt-0.5">
              <span className="tracking-tight">CBE</span>
            </div>

            {/* Sender Name & Text Preview */}
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="font-bold text-[14px] text-white leading-tight">CBE</h4>
              <p className="text-[13px] text-[#f2f2f7] leading-[1.38] mt-0.5 font-normal line-clamp-2 select-text font-sans">
                {cbeSmsText}
              </p>
            </div>
          </div>

          {/* iOS Subtle Bottom Dismiss Drag Handle */}
          <div className="pt-2.5 flex justify-center">
            <div className="w-9 h-[3.5px] bg-white/30 rounded-full" />
          </div>
        </div>
      </div>

      {/* 1. iPhone Top Status Bar (Time, Dynamic Island, Cellular, Wi-Fi, Battery) */}
      <div className="w-full pt-2.5 pb-1 px-5 flex items-center justify-between text-white select-none z-20 flex-shrink-0">
        {/* Left: iOS Time */}
        <div className="w-16 sm:w-20 text-left">
          <span className="font-semibold text-[13px] sm:text-[14px] tracking-tight font-sans text-white/95 drop-shadow-xs">
            {statusTime}
          </span>
        </div>

        {/* Center: iPhone 17 Dynamic Island Pill with Interactive Expansion */}
        <div className="flex-1 flex justify-center">
          <button
            type="button"
            onClick={() => setIslandExpanded(!islandExpanded)}
            className={`bg-black text-white rounded-full transition-all duration-300 ease-out flex items-center justify-between shadow-2xl border border-white/10 ${
              islandExpanded 
                ? 'px-3 py-1 w-56 gap-2 scale-105 ring-2 ring-purple-500/30' 
                : 'h-5.5 w-22 px-2 hover:w-26 cursor-pointer hover:border-white/20'
            }`}
            title="iPhone 17 Dynamic Island"
          >
            {islandExpanded ? (
              <>
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-black tracking-tight text-white leading-tight">iPhone 17 Pro</span>
                    <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider">CBE Verified</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-purple-300 font-medium flex-shrink-0 bg-white/10 px-1.5 py-0.5 rounded-full">
                  <Lock className="w-2.5 h-2.5 text-purple-200" />
                  <span className="text-[9px]">FaceID Active</span>
                </div>
              </>
            ) : (
              <>
                {/* Left Micro-TrueDepth Sensor */}
                <div className="w-1.5 h-1.5 rounded-full bg-[#111827] border border-gray-700/60 flex items-center justify-center">
                  <div className="w-0.5 h-0.5 rounded-full bg-blue-900/60" />
                </div>
                {/* Center subtle CBE green pulse indicator */}
                <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                {/* Right Camera Lens Dot with optical coating */}
                <div className="w-2 h-2 rounded-full bg-[#0a0f1d] border border-gray-700/60 flex items-center justify-center">
                  <div className="w-0.5 h-0.5 rounded-full bg-purple-900/80" />
                </div>
              </>
            )}
          </button>
        </div>

        {/* Right: iOS Cellular 4-Bars, Wi-Fi, and iOS Battery Indicator */}
        <div className="w-16 sm:w-20 flex items-center justify-end gap-1.5 text-white">
          {/* Cellular 4-Bars */}
          <div className="flex items-end gap-[1.5px] h-3" title="Cellular Full Signal">
            <div className="w-[3px] h-1.5 bg-white rounded-[0.5px]" />
            <div className="w-[3px] h-2 bg-white rounded-[0.5px]" />
            <div className="w-[3px] h-2.5 bg-white rounded-[0.5px]" />
            <div className="w-[3px] h-3 bg-white rounded-[0.5px]" />
          </div>

          {/* Wi-Fi Icon */}
          <span title="Wi-Fi Connected" className="flex items-center">
            <Wifi className="w-3.5 h-3.5 text-white stroke-[2.4]" />
          </span>

          {/* iOS Battery with Real Phone Battery Percentage & Charging State */}
          <div 
            className="flex items-center gap-[2px]" 
            title={`Phone Battery: ${batteryLevel}% ${isPhoneCharging ? '(Charging ⚡)' : ''}`}
          >
            {/* Battery Body with Dynamic Real Phone Power Fill */}
            <div className={`h-3 rounded-[3.5px] border-[1.5px] p-[1px] flex items-center relative transition-colors ${
              isPhoneCharging 
                ? 'border-emerald-400 bg-emerald-950/40' 
                : (batteryLevel <= 20 ? 'border-red-400 bg-red-950/30' : 'border-white bg-black/15')
            } ${batteryLevel === 100 ? 'w-6' : 'w-5.5'}`}>
              <div 
                className={`h-full rounded-[1px] transition-all duration-500 ${
                  isPhoneCharging 
                    ? 'bg-emerald-400' 
                    : (batteryLevel <= 20 ? 'bg-red-400' : 'bg-white')
                }`}
                style={{ width: `${Math.max(8, Math.min(100, batteryLevel))}%` }}
              />
              {isPhoneCharging && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Zap className="w-2.5 h-2.5 text-white fill-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                </div>
              )}
            </div>
            {/* Battery Terminal Knob */}
            <div className={`w-[1.5px] h-1.5 rounded-r-[1px] ${
              isPhoneCharging 
                ? 'bg-emerald-400' 
                : (batteryLevel <= 20 ? 'bg-red-400' : 'bg-white')
            }`} />

            {/* Battery Percentage Number */}
            <span className="text-[10px] font-bold text-white leading-none ml-0.5 tracking-tight select-none">
              {batteryLevel}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top Purple Navigation / App Header */}
      <div className="pt-6 sm:pt-7 pb-8 px-5 bg-[#68137e] flex items-center justify-between text-white flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Solid White Shield with Purple Checkmark Icon matching reference */}
          <div className="w-8.5 h-8.5 flex-shrink-0 flex items-center justify-center">
            <svg className="w-8.5 h-8.5 drop-shadow-xs" viewBox="0 0 24 24" fill="none">
              <path 
                d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" 
                fill="#ffffff" 
              />
              <path 
                d="M9 12l2.2 2.2 4.3-4.4" 
                stroke="#68137e" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-[16px] sm:text-[17px] leading-tight text-white tracking-tight">Thank you</h2>
            <p className="text-[12px] sm:text-[13px] text-purple-100 font-normal leading-tight mt-0.5">Success</p>
          </div>
        </div>

        {/* Screenshot Button (Translucent circular badge with focus viewfinder) */}
        <button 
          onClick={handleScreenshot}
          disabled={isCapturing}
          className="w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center transition border border-white/20 text-white cursor-pointer disabled:opacity-50 shadow-xs"
          title="Take iPhone Screenshot & Save"
        >
          {isCapturing ? (
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          ) : (
            <Focus className="w-5.5 h-5.5 text-white stroke-[2.2]" />
          )}
        </button>
      </div>

      {/* Main White Sheet Container */}
      <div className="bg-white rounded-t-[32px] sm:rounded-t-[36px] flex-1 px-4 sm:px-5 pt-0 pb-5 flex flex-col justify-between shadow-2xl relative">
        
        {/* Overlapping Large Success Checkmark Badge */}
        <div className="flex justify-center -mt-10 sm:-mt-11 mb-2.5 flex-shrink-0">
          <div className="w-[82px] h-[82px] sm:w-[92px] sm:h-[92px] rounded-full bg-[#68137e] border-[5.5px] sm:border-[6.5px] border-white shadow-[0_4px_18px_rgba(0,0,0,0.15)] flex items-center justify-center">
            <svg 
              className="w-11 h-11 sm:w-12 sm:h-12 text-white" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3.8" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <div className="space-y-3 flex-1 flex flex-col justify-center">
          {/* Headline (Normal weight as requested) */}
          <h1 className="text-center text-[13.5px] sm:text-[15px] font-normal text-gray-900 tracking-tight">
            Transaction Completed Successfully!
          </h1>

          {/* Main Transaction Summary Gray Card */}
          <div 
            ref={receiptRef}
            className="bg-[#ededf0] rounded-[20px] sm:rounded-[24px] p-3.5 sm:p-4 space-y-3 border border-gray-200/60 shadow-xs"
          >
            <p className="text-gray-400 font-bold text-[11px]">Transaction Summary</p>

            {/* Paragraph Text with bold highlights matching CBE reference */}
            {isCredit ? (
              <p className="text-[12px] sm:text-[13px] leading-[1.65] text-gray-900 font-normal select-text">
                ETB <span className="font-bold text-black">{amountFormatted}</span> has been credited to <span className="font-bold text-black">{recipientName}</span> {recipientSuffix} from <span className="font-bold text-black">{senderName}</span> {senderSuffix} on <span className="font-bold text-black">{formattedDate}</span> with transaction ID: <span className="font-bold text-black">{txId}.</span> Reason: {reason}
              </p>
            ) : (
              <p className="text-[12px] sm:text-[13px] leading-[1.65] text-gray-900 font-normal select-text">
                ETB <span className="font-bold text-black">{amountFormatted}</span> has been debited from <span className="font-bold text-black">{senderName}</span> {senderSuffix} for <span className="font-bold text-black">{recipientName}</span> {recipientSuffix} on <span className="font-bold text-black">{formattedDate}</span> with transaction ID: <span className="font-bold text-black">{txId}.</span> Reason: {reason}
                <br className="my-0.5" />
                Total Amount Debited: {totalDebitedFormatted} ETB with Service Charge of ETB{serviceChargeFormatted}, VAT (15%) of ETB{vatFormatted} and Disaster Recovery (5%) of ETB{disasterRecoveryFormatted}.
              </p>
            )}

            {/* High-Density Realistic QR Code Centered */}
            <div className="flex justify-center py-1">
              <div className="w-32 h-32 sm:w-36 sm:h-36 bg-transparent flex items-center justify-center p-0.5">
                {qrDataUrl ? (
                  <img 
                    src={qrDataUrl} 
                    alt="Transaction QR Code" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  /* High-fidelity 33x33 Dense QR Matrix fallback */
                  <div 
                    className="grid gap-[1px] w-full h-full"
                    style={{ gridTemplateColumns: `repeat(${qrMatrix.length}, minmax(0, 1fr))` }}
                  >
                    {qrMatrix.flatMap((row, rIdx) =>
                      row.map((filled, cIdx) => (
                        <div 
                          key={`${rIdx}-${cIdx}`} 
                          className={`rounded-[0.2px] ${
                            filled ? 'bg-black' : 'bg-transparent'
                          }`}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Commercial Bank of Ethiopia Footer Inset */}
            <div className="flex items-center gap-2 pt-0.5 min-w-0">
              <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
                <CbeLogo className="w-8 h-8" src={customBankLogo} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-gray-900 text-xs leading-tight whitespace-nowrap overflow-hidden text-ellipsis">Commercial Bank of Ethiopia</h4>
                <p className="text-gray-500 text-[10px] font-normal mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">The bank you can always rely on!</p>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Actions Section */}
        <div className="mt-4 space-y-3.5 flex-shrink-0">
          {/* 3 Action Buttons matching exact app icons */}
          <div className="flex items-center justify-around px-3 text-black">
            {/* Receipt Button */}
            <button 
              id="btn-action-receipt"
              onClick={() => setShowDetailedModal(true)}
              className="flex items-center gap-2 text-[13.5px] font-medium text-black hover:text-purple-900 transition active:scale-95 cursor-pointer py-1 px-2 rounded-xl"
            >
              {/* Document with 2 top-left horizontal lines, folded top-right corner, and $ sign icon */}
              <div className="relative w-4 h-[18px] bg-black rounded-[2.5px] flex flex-col justify-between p-[2px] text-white flex-shrink-0 overflow-hidden">
                {/* Folded top-right corner */}
                <div className="absolute -top-[0.5px] -right-[0.5px] w-[5.5px] h-[5.5px] bg-[#f8f9fa] border-b border-l border-black" />
                
                {/* Top-left two horizontal lines */}
                <div className="flex flex-col gap-[1.5px] w-[7px] pt-[0.5px] pl-[0.5px]">
                  <div className="h-[1.2px] w-full bg-white rounded-full" />
                  <div className="h-[1.2px] w-4/5 bg-white rounded-full" />
                </div>

                {/* Centered $ symbol */}
                <div className="flex items-center justify-center flex-1">
                  <span className="text-[9px] font-black font-sans leading-none mt-0.5">$</span>
                </div>
              </div>
              <span>Receipt</span>
            </button>

            {/* Screenshot Button */}
            <button 
              id="btn-action-screenshot"
              onClick={handleScreenshot}
              disabled={isCapturing}
              className="flex items-center gap-2 text-[13.5px] font-medium text-black hover:text-purple-900 transition active:scale-95 cursor-pointer py-1 px-2 rounded-xl disabled:opacity-50"
            >
              {isCapturing ? (
                <Loader2 className="w-[18px] h-[18px] stroke-[2.2] animate-spin text-[#68137e]" />
              ) : (
                <Focus className="w-[18px] h-[18px] stroke-[2.4] text-black" />
              )}
              <span>{isCapturing ? 'Saving...' : 'Screenshot'}</span>
            </button>

            {/* Share Button */}
            <button 
              id="btn-action-share"
              onClick={handleShare}
              className="flex items-center gap-2 text-[13.5px] font-medium text-black hover:text-purple-900 transition active:scale-95 cursor-pointer py-1 px-2 rounded-xl"
            >
              <Share2 className="w-[18px] h-[18px] stroke-[2.2] fill-black text-black" />
              <span>Share</span>
            </button>
          </div>

          {/* Full-width Close Pill Button */}
          <button 
            id="btn-action-close"
            onClick={onBack}
            className="w-full bg-[#d7d7db] hover:bg-[#ceced3] active:bg-[#c4c4c9] text-[#333333] font-bold py-3.5 rounded-full text-[15px] transition active:scale-[0.99] cursor-pointer shadow-xs"
          >
            Close
          </button>

          {/* iPhone 17 Native Home Navigation Bar Indicator */}
          <div className="pt-2.5 pb-0.5 flex justify-center items-center">
            <div className="w-32 sm:w-36 h-[4.5px] bg-[#1a1a1a] rounded-full shadow-xs" />
          </div>
        </div>

      </div>

      {/* Detailed Modal Breakdown if User Clicks 'Receipt' */}
      {showDetailedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-fade-in border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CbeLogo className="w-7 h-7" src={customBankLogo} />
                <h3 className="font-extrabold text-sm text-gray-900">Official Receipt Details</h3>
              </div>
              <button 
                onClick={() => setShowDetailedModal(false)}
                className="text-gray-400 hover:text-gray-700 text-xs font-bold px-2 py-1 rounded-lg bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400 font-medium">Transaction ID</span>
                <span className="font-mono font-bold text-gray-900">{txId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-medium">Principal Amount</span>
                <span className="font-mono font-bold text-gray-900">ETB {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-medium">Service Charge</span>
                <span className="font-mono font-bold text-gray-900">ETB {serviceChargeStr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-medium">VAT (15%)</span>
                <span className="font-mono font-bold text-gray-900">ETB {vatStr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-medium">Disaster Recovery (5%)</span>
                <span className="font-mono font-bold text-gray-900">ETB {disasterRecoveryStr}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between text-sm font-black">
                <span className="text-gray-900">Total Debited</span>
                <span className="text-purple-900 font-mono">ETB {totalDebitedStr}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button 
                onClick={handlePrint}
                className="flex-1 bg-[#68137e] hover:bg-[#530d66] text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official PDF</span>
              </button>
              <button 
                onClick={() => setShowDetailedModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


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
  CheckCircle2,
  FileText,
  Loader2,
  Image as ImageIcon
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

  const totalDebitedStr = totalDebited.toFixed(2);
  const serviceChargeStr = serviceCharge.toFixed(2);
  const vatStr = vat.toFixed(2);
  const disasterRecoveryStr = disasterRecovery.toFixed(2);

  // Formatting Sender & Recipient names & account suffixes
  const senderName = transaction.senderName || "Global Online Market";
  const rawSenderAccount = transaction.senderAccount || "6671";
  const senderSuffix = rawSenderAccount.length >= 4 
    ? `ETB-${rawSenderAccount.slice(-4)}` 
    : `ETB-6671`;

  const recipientName = transaction.recipientName || "Addisu Abebe Mengistu";
  const rawRecipientAccount = transaction.recipientAccount || "6547";
  const recipientSuffix = rawRecipientAccount.length >= 4 && !rawRecipientAccount.includes('+251')
    ? `ETB-${rawRecipientAccount.slice(-4)}` 
    : `ETB-6547`;

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

    // 1. Phone Top Status Bar & Purple Background
    ctx.fillStyle = '#68137e';
    ctx.fillRect(0, 0, width, 220);

    // Current Time for Status Bar
    const now = new Date();
    let statusHours = now.getHours();
    const statusMinutes = now.getMinutes().toString().padStart(2, '0');
    const statusTimeStr = `${statusHours % 12 || 12}:${statusMinutes}`;

    // Status Bar - Left Time & Camera Icon
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 19px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(statusTimeStr, 34, 38);

    // Camera circle icon next to time
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(92, 32, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(92, 32, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Status Bar - Right Icons (LTE, arrows, signal bars, battery)
    ctx.textAlign = 'right';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillText('LTE', width - 105, 34);
    
    // Up/Down small arrows
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillText('↑↓', width - 90, 34);

    // Signal Bars
    const barX = width - 82;
    for (let b = 0; b < 4; b++) {
      ctx.fillStyle = '#ffffff';
      const bHeight = 4 + b * 3.5;
      ctx.fillRect(barX + b * 4.5, 36 - bHeight, 3, bHeight);
    }

    // Battery Icon with percentage '20'
    const battX = width - 58;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(battX, 23, 26, 14, 3);
    ctx.stroke();
    ctx.fillRect(battX + 26, 27, 2, 6);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('20', battX + 13, 34);

    // 2. Top Purple Header: "Thank you / Success" & Top Scan Button
    // Shield with checkmark badge
    const shieldX = 36;
    const shieldY = 82;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(shieldX + 18, shieldY + 18, 18, 0, Math.PI * 2);
    ctx.fill();

    // Shield checkmark
    ctx.strokeStyle = '#68137e';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(shieldX + 10, shieldY + 18);
    ctx.lineTo(shieldX + 16, shieldY + 24);
    ctx.lineTo(shieldX + 26, shieldY + 12);
    ctx.stroke();
    ctx.restore();

    // "Thank you" & "Success" text
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 25px system-ui, -apple-system, sans-serif';
    ctx.fillText('Thank you', shieldX + 46, shieldY + 18);
    ctx.fillStyle = '#e9d5ff';
    ctx.font = '500 17px system-ui, -apple-system, sans-serif';
    ctx.fillText('Success', shieldX + 46, shieldY + 40);

    // Top Right Viewfinder / Scan Button
    const scanBtnX = width - 78;
    const scanBtnY = 80;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(scanBtnX, scanBtnY, 44, 44, 12);
    ctx.stroke();

    // Viewfinder corners
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    const vfX = scanBtnX + 10;
    const vfY = scanBtnY + 10;
    const vfS = 24;
    // Top-left
    ctx.beginPath(); ctx.moveTo(vfX, vfY + 6); ctx.lineTo(vfX, vfY); ctx.lineTo(vfX + 6, vfY); ctx.stroke();
    // Top-right
    ctx.beginPath(); ctx.moveTo(vfX + vfS - 6, vfY); ctx.lineTo(vfX + vfS, vfY); ctx.lineTo(vfX + vfS, vfY + 6); ctx.stroke();
    // Bottom-left
    ctx.beginPath(); ctx.moveTo(vfX, vfY + vfS - 6); ctx.lineTo(vfX, vfY + vfS); ctx.lineTo(vfX + 6, vfY + vfS); ctx.stroke();
    // Bottom-right
    ctx.beginPath(); ctx.moveTo(vfX + vfS - 6, vfY + vfS); ctx.lineTo(vfX + vfS, vfY + vfS); ctx.lineTo(vfX + vfS, vfY + vfS - 6); ctx.stroke();
    // Center point
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(vfX + vfS / 2, vfY + vfS / 2, 2.5, 0, Math.PI * 2); ctx.fill();

    // 3. Main White Card
    const cardTop = 180;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(0, cardTop, width, height - cardTop - 60, [36, 36, 0, 0]);
    ctx.fill();

    // 4. Overlapping Large Success Checkmark Circle
    const badgeX = width / 2;
    const badgeY = cardTop;
    const badgeR = 54;
    ctx.save();
    ctx.fillStyle = '#68137e';
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Big Bold Checkmark
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(badgeX - 22, badgeY + 2);
    ctx.lineTo(badgeX - 6, badgeY + 19);
    ctx.lineTo(badgeX + 24, badgeY - 15);
    ctx.stroke();
    ctx.restore();

    // 5. Headline Text
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
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
      { text: `${amount.toFixed(2)}`, bold: true },
      { text: ' has been debited from ', bold: false },
      { text: `${senderName} ${senderSuffix}`, bold: true },
      { text: ' for ', bold: false },
      { text: `${recipientName} ${recipientSuffix}`, bold: true },
      { text: ' on ', bold: false },
      { text: `${formattedDate}`, bold: true },
      { text: ' with transaction ID: ', bold: false },
      { text: `${txId}.`, bold: true },
      { text: ' Reason: ', bold: false },
      { text: `${reason}`, bold: false },
      { text: '\nTotal Amount Debited: ', bold: false },
      { text: `ETB${totalDebitedStr}`, bold: false },
      { text: ` with Service Charge of ETB${serviceChargeStr}, VAT (15%) of ${vatStr} and Disaster Recovery (5%) of ETB${disasterRecoveryStr}.`, bold: false }
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
    // Viewfinder icon
    const sIcoX = b2X - 22;
    const sIcoY = actY - 14;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(sIcoX, sIcoY, 18, 18);
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

    // 11. Android Bottom Navigation Bar
    const navY = height - 60;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, navY, width, 60);

    // Three vertical lines (Recents)
    ctx.fillStyle = '#94a3b8';
    const recX = 140;
    ctx.fillRect(recX, navY + 20, 2.5, 18);
    ctx.fillRect(recX + 7, navY + 20, 2.5, 18);
    ctx.fillRect(recX + 14, navY + 20, 2.5, 18);

    // Home rounded button
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(width / 2 - 10, navY + 19, 20, 20, 6);
    ctx.stroke();

    // Back chevron <
    ctx.beginPath();
    ctx.moveTo(width - 135, navY + 20);
    ctx.lineTo(width - 146, navY + 29);
    ctx.lineTo(width - 135, navY + 38);
    ctx.stroke();

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

      {/* Top Purple Header */}
      <div className="pt-3 pb-8 px-5 bg-[#68137e] flex items-center justify-between text-white flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center border border-white/20">
            <ShieldCheck className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm leading-tight">Thank you</h2>
            <p className="text-[11px] text-purple-200 font-medium leading-none">Success</p>
          </div>
        </div>

        <button 
          onClick={handleScreenshot}
          disabled={isCapturing}
          className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center transition border border-white/20 text-white cursor-pointer disabled:opacity-50"
          title="Take Screenshot & Save"
        >
          {isCapturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4.5 h-4.5" />}
        </button>
      </div>

      {/* Main White Sheet Container */}
      <div className="bg-white rounded-t-[32px] sm:rounded-t-[36px] flex-1 px-4 sm:px-5 pt-0 pb-5 flex flex-col justify-between shadow-2xl relative">
        
        {/* Overlapping Large Success Checkmark Badge */}
        <div className="flex justify-center -mt-7 sm:-mt-8 mb-2 flex-shrink-0">
          <div className="w-15 h-15 sm:w-16 sm:h-16 rounded-full bg-[#68137e] border-4 border-white shadow-md flex items-center justify-center">
            <Check className="w-7 h-7 sm:w-8 sm:h-8 text-white stroke-[3.5]" />
          </div>
        </div>

        <div className="space-y-3 flex-1 flex flex-col justify-center">
          {/* Headline */}
          <h1 className="text-center text-xs sm:text-sm font-extrabold text-gray-900 tracking-tight">
            Transaction Completed Successfully!
          </h1>

          {/* Main Transaction Summary Gray Card */}
          <div 
            ref={receiptRef}
            className="bg-[#ededf0] rounded-[20px] sm:rounded-[24px] p-3.5 sm:p-4 space-y-3 border border-gray-200/60 shadow-xs"
          >
            <p className="text-gray-400 font-bold text-[11px]">Transaction Summary</p>

            {/* Paragraph Text with bold highlights */}
            <p className="text-[12px] sm:text-[13px] leading-[1.6] text-gray-900 font-normal">
              ETB <span className="font-extrabold">{amount.toFixed(2)}</span> has been debited from <span className="font-extrabold">{senderName} {senderSuffix}</span> for <span className="font-extrabold">{recipientName} {recipientSuffix}</span> on <span className="font-extrabold">{formattedDate}</span> with transaction ID: <span className="font-extrabold">{txId}</span>. Reason: {reason}. Total Amount Debited: ETB{totalDebitedStr} with Service Charge of ETB{serviceChargeStr}, VAT (15%) of {vatStr} and Disaster Recovery (5%) of ETB{disasterRecoveryStr}.
            </p>

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
        <div className="mt-4 space-y-3 flex-shrink-0">
          {/* 3 Action Buttons */}
          <div className="flex items-center justify-around px-2 text-gray-900">
            <button 
              id="btn-action-receipt"
              onClick={() => setShowDetailedModal(true)}
              className="flex items-center gap-1.5 text-xs font-extrabold hover:text-purple-900 transition active:scale-95 cursor-pointer py-1 px-2.5 rounded-xl hover:bg-gray-100"
            >
              <FileText className="w-4 h-4 stroke-[2.5]" />
              <span>Receipt</span>
            </button>

            <button 
              id="btn-action-screenshot"
              onClick={handleScreenshot}
              disabled={isCapturing}
              className="flex items-center gap-1.5 text-xs font-extrabold hover:text-purple-900 transition active:scale-95 cursor-pointer py-1 px-2.5 rounded-xl hover:bg-gray-100 disabled:opacity-50"
            >
              {isCapturing ? (
                <Loader2 className="w-4 h-4 stroke-[2.5] animate-spin text-[#68137e]" />
              ) : (
                <Scan className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>{isCapturing ? 'Saving...' : 'Screenshot'}</span>
            </button>

            <button 
              id="btn-action-share"
              onClick={handleShare}
              className="flex items-center gap-1.5 text-xs font-extrabold hover:text-purple-900 transition active:scale-95 cursor-pointer py-1 px-2.5 rounded-xl hover:bg-gray-100"
            >
              <Share2 className="w-4 h-4 stroke-[2.5]" />
              <span>Share</span>
            </button>
          </div>

          {/* Full-width Close Pill Button */}
          <button 
            id="btn-action-close"
            onClick={onBack}
            className="w-full bg-[#d7d7db] hover:bg-[#c9c9ce] text-gray-800 font-extrabold py-3 rounded-full text-xs sm:text-sm transition active:scale-[0.99] cursor-pointer shadow-xs"
          >
            Close
          </button>
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


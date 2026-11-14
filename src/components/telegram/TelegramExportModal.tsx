import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileJson, 
  FileImage, 
  FileText, 
  Check, 
  Loader2, 
  AlertTriangle,
  Share2
} from 'lucide-react';
import { TelegramChat } from '../../types/telegram';
import { TelegramSimulatorService } from '../../services/telegramSimulatorService';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface TelegramExportModalProps {
  chat: TelegramChat;
  isOpen: boolean;
  onClose: () => void;
}

export default function TelegramExportModal({
  chat,
  isOpen,
  onClose,
}: TelegramExportModalProps) {
  const [isExportingImage, setIsExportingImage] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Export JSON
  const handleExportJson = () => {
    const jsonString = TelegramSimulatorService.exportChatToJson(chat);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `simulated_chat_${chat.contactName.replace(/\s+/g, '_').toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setExportSuccess('JSON exported successfully');
    setTimeout(() => setExportSuccess(null), 3000);
  };

  // 2. Export Image (PNG)
  const handleExportImage = async () => {
    try {
      setIsExportingImage(true);
      const targetElement = document.getElementById('telegram-chat-messages-container') || document.getElementById('telegram-preview-shell');
      
      if (!targetElement) {
        alert('Preview element not found');
        return;
      }

      const targetWidth = targetElement.scrollWidth || targetElement.offsetWidth;
      const targetHeight = targetElement.scrollHeight || targetElement.offsetHeight;
      const canvas = await html2canvas(targetElement, {
        backgroundColor: '#0e1621',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        width: targetWidth,
        height: targetHeight,
        windowWidth: targetWidth,
        windowHeight: targetHeight,
      });

      // Draw watermark on canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height - 36, canvas.width, 36);
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SIMULATED CHAT • MOCKUP ONLY', canvas.width / 2, canvas.height - 12);
      }

      const imageUri = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imageUri;
      link.download = `simulated_chat_${chat.contactName.replace(/\s+/g, '_').toLowerCase()}.png`;
      link.click();

      setExportSuccess('Image exported successfully');
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to export image', err);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsExportingImage(false);
    }
  };

  // 3. Export PDF
  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const doc = new jsPDF();

      // Title & Notice
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text('SIMULATED CHAT TRANSCRIPT', 20, 20);

      doc.setFontSize(10);
      doc.setTextColor(239, 68, 68);
      doc.text('NOTICE: Fictional chat mockup only. Not an authentic Telegram communication.', 20, 28);

      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105);
      doc.text(`Contact: ${chat.contactName} (${chat.username})`, 20, 38);
      doc.text(`Date of Export: ${new Date().toLocaleString()}`, 20, 45);
      doc.text(`Total Messages: ${chat.messages.length}`, 20, 52);

      doc.setLineWidth(0.5);
      doc.setDrawColor(203, 213, 225);
      doc.line(20, 56, 190, 56);

      let yPos = 65;
      chat.messages.forEach((msg, idx) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        const senderLabel = msg.sender === 'right' ? 'Me' : chat.contactName;
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);

        if (msg.type === 'date') {
          doc.setFont('helvetica', 'bold');
          doc.text(`--- ${msg.dateLabel || msg.timestamp} ---`, 105, yPos, { align: 'center' });
          yPos += 8;
        } else {
          doc.setFont('helvetica', 'bold');
          doc.text(`[${msg.timestamp}] ${senderLabel}:`, 20, yPos);
          doc.setFont('helvetica', 'normal');
          
          const content = msg.text || (msg.images ? `[${msg.images.length} Image(s)]` : 'Message');
          const splitText = doc.splitTextToSize(content, 140);
          doc.text(splitText, 60, yPos);
          yPos += splitText.length * 6 + 4;
        }
      });

      doc.save(`simulated_chat_${chat.contactName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
      setExportSuccess('PDF transcript exported successfully');
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to export PDF', err);
      alert('Failed to generate PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white">Export Simulated Chat</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Card */}
        <div className="p-4 space-y-3.5 text-xs">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              All exported files contain a clear "SIMULATED CHAT" label to ensure fictional mockups cannot be mistaken for authentic records.
            </p>
          </div>

          {exportSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 font-semibold animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>{exportSuccess}</span>
            </div>
          )}

          {/* Export Buttons */}
          <div className="space-y-2.5">
            {/* 1. JSON */}
            <button 
              onClick={handleExportJson}
              className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 flex items-center justify-between transition cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                  <FileJson className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-white group-hover:text-sky-300">Export as JSON</p>
                  <p className="text-[11px] text-slate-400">Save full data to reload or share with simulator</p>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-500 group-hover:text-white" />
            </button>

            {/* 2. Image (PNG) */}
            <button 
              onClick={handleExportImage}
              disabled={isExportingImage}
              className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 flex items-center justify-between transition cursor-pointer group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  {isExportingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileImage className="w-5 h-5" />}
                </div>
                <div className="text-left">
                  <p className="font-bold text-white group-hover:text-emerald-300">Export as Image (PNG)</p>
                  <p className="text-[11px] text-slate-400">High-resolution screenshot of current conversation</p>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-500 group-hover:text-white" />
            </button>

            {/* 3. PDF Transcript */}
            <button 
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 flex items-center justify-between transition cursor-pointer group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                  {isExportingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                </div>
                <div className="text-left">
                  <p className="font-bold text-white group-hover:text-indigo-300">Export as PDF Document</p>
                  <p className="text-[11px] text-slate-400">Printable text transcript with timestamps</p>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-500 group-hover:text-white" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

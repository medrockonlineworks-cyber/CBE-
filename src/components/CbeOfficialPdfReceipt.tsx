import React, { forwardRef } from 'react';
import { CbeGoldenEmblemSvg } from './CbeLogo';
import { StampWeight, StampPosition, getOfficialCbeStampSvg, OFFICIAL_CBE_STAMP_LOGO, LocalDb, getAuthenticCbeQrSvgDataUri } from '../lib/mockData';

export interface CbePdfReceiptData {
  refId: string;
  payerName: string;
  payerAccount: string;
  receiverName: string;
  receiverAccount: string;
  paymentType: string;
  paymentDate: string;
  reason: string;
  amount: number;
  serviceCharge: number;
  vat: number;
  disasterRecovery: number;
  totalDebited: number;
  words: string;
  customerName: string;
}

export interface CbeOfficialPdfReceiptProps {
  receiptData: CbePdfReceiptData;
  qrCodeDataUrl?: string;
  activeStamp?: string;
  stampWeight?: StampWeight;
  stampSize?: number;
  stampPosition?: StampPosition;
  customPdfLogo?: string | null;
  isPreview?: boolean;
  tableRef?: React.RefObject<HTMLDivElement>;
  isEditingStampPosition?: boolean;
  isDraggingStamp?: boolean;
  onStampPointerDown?: (e: React.PointerEvent) => void;
  onStampClick?: (e: React.MouseEvent) => void;
  onStampDoubleClick?: (e: React.MouseEvent) => void;
  onStampTouchEnd?: (e: React.TouchEvent) => void;
}

/**
 * Authentic CBE Official Customer Receipt form designed for high-resolution PDF generation.
 * Exact 1:1 match with official Commercial Bank of Ethiopia standards (IMG_20260907_191152_295.jpg).
 * Configured as a true 2-page document matching user requirements and official CBE portal print specs.
 */
export const CbeOfficialPdfReceipt = forwardRef<HTMLDivElement, CbeOfficialPdfReceiptProps>(({
  receiptData,
  qrCodeDataUrl,
  activeStamp,
  stampWeight = 'normal',
  stampSize = 330,
  stampPosition,
  customPdfLogo,
  isPreview = false,
  tableRef,
  isEditingStampPosition = false,
  isDraggingStamp = false,
  onStampPointerDown,
  onStampClick,
  onStampDoubleClick,
  onStampTouchEnd
}, ref) => {
  const effectiveStamp = activeStamp || getOfficialCbeStampSvg(stampWeight) || OFFICIAL_CBE_STAMP_LOGO;
  // Use full, prominent stamp size (default 330px) to match the authentic web receipt layout
  const effectiveStampSize = stampSize || LocalDb.getPdfStampSize() || 330;
  const effectiveStampPos = stampPosition || LocalDb.getPdfStampPosition();
  const effectiveQr = qrCodeDataUrl || LocalDb.getCustomQrCode() || getAuthenticCbeQrSvgDataUri(receiptData.refId || 'FT26248KLR82');

  return (
    <div
      ref={ref}
      className="cbe-official-pdf-document"
      style={{
        width: '640px',
        display: 'flex',
        flexDirection: 'column',
        gap: isPreview ? '24px' : '0px',
        backgroundColor: 'transparent'
      }}
    >
      {/* ========================================================
          PAGE 1: Official Customer Receipt Data & Overlaid Stamp
         ======================================================== */}
      <div
        id="cbe-pdf-page-1"
        data-page="1"
        style={{
          width: '640px',
          minHeight: '880px',
          backgroundColor: '#ffffff',
          color: '#000000',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          padding: '28px 32px 36px 32px',
          boxSizing: 'border-box',
          position: 'relative',
          boxShadow: isPreview ? '0 8px 36px rgba(0,0,0,0.38), 0 2px 8px rgba(0,0,0,0.22)' : 'none',
          borderRadius: isPreview ? '2px' : '0px',
        }}
      >
        {/* 1. Header Banner: Deep CBE Purple with golden emblem and centered white text */}
        <div 
          style={{ 
            backgroundColor: '#77126a',
            borderRadius: '6px 6px 0 0',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ffffff',
            position: 'relative'
          }}
        >
          {/* Left: CBE Official Bank Logo (Uploaded PNG or HTTPS) */}
          <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {(() => {
              const effectiveLogo = customPdfLogo || LocalDb.getCustomBankLogo() || '/custom-bank-logo.png';
              return (
                <img 
                  src={effectiveLogo} 
                  alt="Bank Logo" 
                  style={{ width: '48px', height: '48px', objectFit: 'contain' }} 
                  crossOrigin="anonymous" 
                  onError={(e) => {
                    // Fallback to /custom-bank-logo.png or SVG if remote URL fails
                    const target = e.currentTarget;
                    if (target.src !== window.location.origin + '/custom-bank-logo.png') {
                      target.src = '/custom-bank-logo.png';
                    }
                  }}
                />
              );
            })()}
          </div>

          {/* Center: Official CBE Title, Subtitle, and Status */}
          <div style={{ flex: 1, textAlign: 'center', paddingRight: '48px' }}>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.2px', color: '#ffffff' }}>
              Commercial Bank of Ethiopia
            </h1>
            <div style={{ fontSize: '13px', fontWeight: 400, marginTop: '2px', color: '#ffffff' }}>
              Customer Receipt
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, marginTop: '2px', letterSpacing: '0.2px', color: '#ffffff' }}>
              Status: COMPLETED
            </div>
          </div>
        </div>

        {/* 2. Two-Column Information Section: Company Address & Customer Information */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '24px', 
            marginTop: '16px',
            fontSize: '10px',
            color: '#000000'
          }}
        >
          {/* Left Column: Company Address & Other Information */}
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#000000', lineHeight: 1.25, marginBottom: '5px', paddingBottom: '3px', borderBottom: '1px solid #4a5568' }}>
              <div>Company Address &amp; Other</div>
              <div>Information</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  { label: 'Country:', val: 'Ethiopia' },
                  { label: 'City:', val: 'Addis Ababa' },
                  { label: 'Address:', val: 'Ras Desta Damtew St, 01, Kirkos' },
                  { label: 'Postal code:', val: '255' },
                  { label: 'SWIFT Code:', val: 'CBETETAA' },
                  { label: 'Email:', val: 'info@cbe.com.et' },
                  { label: 'Tel:', val: '+251-551-50-04' },
                  { label: 'Fax:', val: '+251-551-45-22' },
                  { label: 'Tfn:', val: '0000006966' },
                  { label: 'VAT Receipt No:', val: receiptData.refId },
                  { label: 'VAT Registration No:', val: '011140' },
                  { label: 'VAT Registration Date:', val: '01/01/2003' },
                ].map((row, idx) => (
                  <tr key={idx} style={{ height: '16px' }}>
                    <td style={{ color: '#000000', fontWeight: 500, padding: '1px 0', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      {row.label}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500, color: '#000000', padding: '1px 0', verticalAlign: 'top' }}>
                      {row.val}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right Column: Customer Information */}
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#000000', lineHeight: 1.25, marginBottom: '5px', paddingBottom: '3px', borderBottom: '1px solid #4a5568' }}>
              <div>Customer Information</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  { label: 'Customer Name:', val: receiptData.customerName || receiptData.payerName },
                  { label: 'Region:', val: '-' },
                  { label: 'City:', val: '-' },
                  { label: 'Sub City:', val: '-' },
                  { label: 'Wereda/Kebele:', val: '-' },
                  { label: 'VAT Registration No:', val: '-' },
                  { label: 'VAT Registration Date:', val: '-' },
                  { label: 'TIN (TAX ID):', val: '-' },
                  { label: 'Branch:', val: '-' },
                ].map((row, idx) => (
                  <tr key={idx} style={{ height: '16px' }}>
                    <td style={{ color: '#000000', fontWeight: 500, padding: '1px 0', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      {row.label}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500, color: '#000000', padding: '1px 0', verticalAlign: 'top' }}>
                      {row.val}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Main Box: Payment / Transaction Information Table with Overlaid Stamp */}
        <div 
          ref={tableRef}
          style={{ 
            marginTop: '16px', 
            border: '1.5px solid #852d76', 
            borderRadius: '6px',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#ffffff'
          }}
        >
          {/* Table Header */}
          <div 
            style={{ 
              textAlign: 'center', 
              fontWeight: 800, 
              fontSize: '11.5px', 
              color: '#000000',
              padding: '6px 0', 
              borderBottom: '1px solid #4a5568',
              backgroundColor: '#ffffff'
            }}
          >
            Payment / Transaction Information
          </div>

          {/* Data Rows: Dark charcoal/slate horizontal row dividers matching IMG_20260920_113448_873.png */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
            <tbody>
              {[
                { label: 'Payer:', val: receiptData.payerName, bold: false },
                { label: 'Account:', val: receiptData.payerAccount, bold: false },
                { label: 'Receiver:', val: receiptData.receiverName, bold: false },
                { label: 'Account:', val: receiptData.receiverAccount, bold: false },
                { label: 'Payment Type:', val: receiptData.paymentType || 'A2A', bold: false },
                { label: 'Payment Date & Time:', val: receiptData.paymentDate, bold: false },
                { label: 'Reference No. (VAT Invoice No):', val: receiptData.refId, bold: false },
                { label: 'Reason / Type of service:', val: receiptData.reason || '-', bold: false },
                { label: 'Transferred Amount:', val: `${receiptData.amount.toFixed(2)} ETB`, bold: false, boldVal: true },
                { label: 'Service Charge:', val: `${receiptData.serviceCharge.toFixed(2)} ETB`, bold: false },
                { label: 'VAT (15% of service charge):', val: `${receiptData.vat.toFixed(2)} ETB`, bold: false },
                { label: 'Disaster Risk Response Fund (5% of service charge):', val: `${receiptData.disasterRecovery.toFixed(2)} ETB`, bold: false },
                { label: 'Total amount debited from customer\'s account:', val: `${receiptData.totalDebited.toFixed(2)} ETB`, bold: true, boldVal: true },
              ].map((row, idx, arr) => (
                <tr 
                  key={idx} 
                  style={{ 
                    borderBottom: idx < arr.length - 1 ? '1px solid #4a5568' : 'none',
                    height: '24px'
                  }}
                >
                  <td style={{ 
                    padding: '4px 14px', 
                    color: '#000000', 
                    fontWeight: row.bold ? 800 : 500,
                    whiteSpace: 'nowrap'
                  }}>
                    {row.label}
                  </td>
                  <td style={{ 
                    padding: '4px 14px', 
                    textAlign: 'right', 
                    color: '#000000', 
                    fontWeight: (row.bold || row.boldVal) ? 800 : 500,
                    whiteSpace: 'nowrap'
                  }}>
                    {row.val}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Authentic Overlaid Stamp: Full prominent size matching Screenshot_20260916-125145.png */}
          <div 
            id={isPreview ? "cbe-stamp-container" : undefined}
            style={{
              position: 'absolute',
              top: `${effectiveStampPos.yPercent}%`,
              left: `${effectiveStampPos.xPercent}%`,
              transform: 'translate(-50%, -50%)',
              width: `${effectiveStampSize}px`,
              height: `${effectiveStampSize}px`,
              maxWidth: '92%',
              aspectRatio: '1 / 1',
              pointerEvents: isPreview ? 'auto' : 'none',
              cursor: isPreview ? (isEditingStampPosition ? (isDraggingStamp ? 'grabbing' : 'grab') : 'pointer') : 'default',
              zIndex: 10,
              touchAction: isPreview ? 'none' : 'auto'
            }}
            onPointerDown={isPreview && isEditingStampPosition ? onStampPointerDown : undefined}
            onClick={isPreview ? onStampClick : undefined}
            onDoubleClick={isPreview ? onStampDoubleClick : undefined}
            onTouchEnd={isPreview ? onStampTouchEnd : undefined}
          >
            {/* Visual Focus Ring in Edit Mode */}
            {isPreview && isEditingStampPosition && (
              <div 
                data-html2canvas-ignore="true"
                style={{
                  position: 'absolute',
                  inset: -6,
                  border: '2.5px dashed #9333ea',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  boxShadow: '0 0 0 2px rgba(255,255,255,0.8), 0 4px 14px rgba(147, 51, 234, 0.45)'
                }}
              />
            )}
            <img
              src={effectiveStamp}
              alt="Bank Stamp"
              crossOrigin="anonymous"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transform: 'rotate(-13deg)',
                opacity: stampWeight === 'light' ? 0.88 : stampWeight === 'normal' ? 0.96 : 1
              }}
            />
            {/* Moving badge in Edit Mode */}
            {isPreview && isEditingStampPosition && (
              <div 
                data-html2canvas-ignore="true"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: 'rgba(126, 34, 206, 0.95)',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: '9999px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  border: '1px solid rgba(255,255,255,0.5)'
                }}
              >
                <span>{isDraggingStamp ? 'Moving...' : 'Drag to Move'}</span>
              </div>
            )}
          </div>
        </div>

        {/* 4. Amount in Word Card (Left) & QR Code without frame (Right) */}
        <div 
          style={{ 
            marginTop: '18px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          {/* Left: Amount in Word Card */}
          <div 
            style={{ 
              flex: 1, 
              backgroundColor: '#f2f3f7', 
              borderRadius: '8px', 
              padding: '12px 18px', 
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#000000' }}>
              Amount in Word:
            </div>
            <div style={{ fontSize: '10.5px', color: '#000000', marginTop: '3px', fontWeight: 400 }}>
              {receiptData.words}
            </div>
          </div>

          {/* Right: QR Code without frame */}
          <div style={{ width: '84px', height: '84px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {effectiveQr ? (
              <img 
                id="cbe-pdf-official-qr-image"
                src={effectiveQr} 
                alt="Receipt Verification QR" 
                crossOrigin="anonymous"
                style={{ width: '80px', height: '80px', objectFit: 'contain', display: 'block' }} 
              />
            ) : (
              <div style={{ width: '80px', height: '80px', backgroundColor: '#e5e7eb' }} />
            )}
          </div>
        </div>

        {/* Page 1 indicator badge */}
        <div 
          style={{ 
            position: 'absolute', 
            bottom: '12px', 
            left: '16px', 
            backgroundColor: '#e5e7eb', 
            color: '#4b5563', 
            fontSize: '10px', 
            fontWeight: 600, 
            padding: '2px 8px', 
            borderRadius: '4px', 
            opacity: isPreview ? 0.9 : 0
          }}
        >
          1
        </div>
      </div>

      {/* ========================================================
          PAGE 2: Official Bank Slogan & Copyright Footer
         ======================================================== */}
      <div
        id="cbe-pdf-page-2"
        data-page="2"
        style={{
          width: '640px',
          minHeight: '880px',
          backgroundColor: '#ffffff',
          color: '#000000',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          padding: '28px 32px 36px 32px',
          boxSizing: 'border-box',
          position: 'relative',
          boxShadow: isPreview ? '0 8px 36px rgba(0,0,0,0.38), 0 2px 8px rgba(0,0,0,0.22)' : 'none',
          borderRadius: isPreview ? '2px' : '0px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: '130px',
        }}
      >
        {/* Footer: Official Slogan & Copyright centered in upper third of Page 2 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#77126a', fontWeight: 800, fontSize: '13px' }}>
            The Bank you can always rely on.
          </div>
          <div style={{ color: '#555555', fontSize: '10px', marginTop: '4px' }}>
            © 2026 Commercial Bank of Ethiopia. All rights reserved.
          </div>
        </div>

        {/* Page 2 indicator badge */}
        <div 
          style={{ 
            position: 'absolute', 
            bottom: '12px', 
            left: '16px', 
            backgroundColor: '#e5e7eb', 
            color: '#4b5563', 
            fontSize: '10px', 
            fontWeight: 600, 
            padding: '2px 8px', 
            borderRadius: '4px', 
            opacity: isPreview ? 0.9 : 0
          }}
        >
          2
        </div>
      </div>
    </div>
  );
});

CbeOfficialPdfReceipt.displayName = 'CbeOfficialPdfReceipt';

export default CbeOfficialPdfReceipt;

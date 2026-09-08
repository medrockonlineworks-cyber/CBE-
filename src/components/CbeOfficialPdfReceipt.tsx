import React, { forwardRef } from 'react';
import { CbeGoldenEmblemSvg } from './CbeLogo';
import { StampWeight, getOfficialCbeStampSvg, OFFICIAL_CBE_STAMP_LOGO } from '../lib/mockData';

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

interface CbeOfficialPdfReceiptProps {
  receiptData: CbePdfReceiptData;
  qrCodeDataUrl?: string;
  activeStamp?: string;
  stampWeight?: StampWeight;
  stampSize?: number;
  customPdfLogo?: string | null;
}

/**
 * Authentic CBE Official Customer Receipt form designed for high-resolution PDF generation.
 * Exact 1:1 match with official Commercial Bank of Ethiopia standards (IMG_20260907_191152_295.jpg).
 */
export const CbeOfficialPdfReceipt = forwardRef<HTMLDivElement, CbeOfficialPdfReceiptProps>(({
  receiptData,
  qrCodeDataUrl,
  activeStamp,
  stampWeight = 'normal',
  stampSize = 185,
  customPdfLogo
}, ref) => {
  const effectiveStamp = activeStamp || getOfficialCbeStampSvg(stampWeight) || OFFICIAL_CBE_STAMP_LOGO;

  return (
    <div
      ref={ref}
      style={{
        width: '640px',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        padding: '28px 32px 48px 32px',
        boxSizing: 'border-box'
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
        {/* Left: CBE Emblem or Custom PDF Logo */}
        <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
          {customPdfLogo ? (
            <img 
              src={customPdfLogo} 
              alt="PDF Bank Logo" 
              style={{ width: '48px', height: '48px', objectFit: 'contain' }} 
              crossOrigin="anonymous" 
            />
          ) : (
            <CbeGoldenEmblemSvg className="w-12 h-12" />
          )}
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
          <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#000000', lineHeight: 1.25, marginBottom: '6px' }}>
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
          <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#000000', lineHeight: 1.25, marginBottom: '6px' }}>
            <div>Customer Information</div>
            <div style={{ visibility: 'hidden' }}>&nbsp;</div>
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
        style={{ 
          marginTop: '16px', 
          border: '1.2px solid #77126a', 
          borderRadius: '4px',
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
            borderBottom: '1.2px solid #77126a',
            backgroundColor: '#ffffff'
          }}
        >
          Payment / Transaction Information
        </div>

        {/* Data Rows: Crisp 1px solid #77126a dividers matching IMG_20260907_191152_295.jpg */}
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
                  borderBottom: idx < arr.length - 1 ? '1px solid #77126a' : 'none',
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

        {/* Authentic Overlaid Stamp: Centered across rows 5-8 */}
        <div 
          style={{
            position: 'absolute',
            top: '47%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${Math.min(215, Math.max(165, Math.round(stampSize * 0.60)))}px`,
            height: `${Math.min(215, Math.max(165, Math.round(stampSize * 0.60)))}px`,
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          <img
            src={effectiveStamp}
            alt="Bank Stamp"
            crossOrigin="anonymous"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              mixBlendMode: 'multiply',
              transform: 'rotate(-12deg)',
              opacity: stampWeight === 'light' ? 0.85 : 0.94
            }}
          />
        </div>
      </div>

      {/* 4. Amount in Word Card (Left) & QR Code (Right) */}
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

        {/* Right: QR Code */}
        <div style={{ width: '80px', height: '80px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {qrCodeDataUrl ? (
            <img 
              src={qrCodeDataUrl} 
              alt="Receipt Verification QR" 
              crossOrigin="anonymous"
              style={{ width: '80px', height: '80px', objectFit: 'contain' }} 
            />
          ) : (
            <div style={{ width: '80px', height: '80px', backgroundColor: '#e5e7eb' }} />
          )}
        </div>
      </div>

      {/* 5. Footer: Official Slogan & Copyright */}
      <div style={{ marginTop: '54px', textAlign: 'center' }}>
        <div style={{ color: '#77126a', fontWeight: 800, fontSize: '11.5px' }}>
          The Bank you can always rely on.
        </div>
        <div style={{ color: '#555555', fontSize: '9.5px', marginTop: '3px' }}>
          © 2026 Commercial Bank of Ethiopia. All rights reserved.
        </div>
      </div>
    </div>
  );
});

CbeOfficialPdfReceipt.displayName = 'CbeOfficialPdfReceipt';

export default CbeOfficialPdfReceipt;

import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Transaction } from '../types';
import { SmsMessage } from '../types/sms';
import { formatTo12CharTxId } from '../lib/mockData';

export interface WebReceiptUrlPayload {
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
  viewMode?: 'web' | 'pdf';
}

export type RealBrowserTargetMode = 'hosted' | 'official_url';

const STORAGE_PUBLIC_ORIGIN_KEY = 'cbe_webreceipt_public_origin';
const STORAGE_CUSTOM_HOST_KEY = 'cbe_webreceipt_custom_host';
const STORAGE_AUTO_OPEN_REAL_BROWSER_KEY = 'cbe_webreceipt_open_in_real_browser';
const STORAGE_REAL_BROWSER_TARGET_MODE_KEY = 'cbe_webreceipt_real_browser_target';
const STORAGE_PAYLOAD_PREFIX = 'cbe_webreceipt_payload_';

export function numberToCbeWords(amount: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertGroup(n: number): string {
    let group = '';
    if (n >= 100) {
      group += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      group += tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '') + ' ';
    } else if (n > 0) {
      group += ones[n] + ' ';
    }
    return group.trim();
  }

  const rounded = Math.round(amount * 100) / 100;
  const intPart = Math.floor(rounded);
  const decPart = Math.round((rounded - intPart) * 100);

  if (intPart === 0 && decPart === 0) return 'Zero ETB';

  let words = '';
  if (intPart >= 1000000000) {
    const billions = Math.floor(intPart / 1000000000);
    words += convertGroup(billions) + ' Billion ';
  }
  const remMillions = intPart % 1000000000;
  if (remMillions >= 1000000) {
    const millions = Math.floor(remMillions / 1000000);
    words += convertGroup(millions) + ' Million ';
  }
  const remThousands = intPart % 1000000;
  if (remThousands >= 1000) {
    const thousands = Math.floor(remThousands / 1000);
    words += convertGroup(thousands) + ' Thousand ';
  }
  const remUnits = intPart % 1000;
  if (remUnits > 0) {
    words += convertGroup(remUnits) + ' ';
  }

  words = words.trim();
  if (!words) words = 'Zero';
  words += ' ETB';

  if (decPart > 0) {
    words += ' and ' + convertGroup(decPart) + (decPart === 1 ? ' cent' : ' cents');
  }

  return words;
}

export function formatCbeMask(raw?: string): string {
  if (!raw) return '1****4747';
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 5) {
    return `${digits[0]}****${digits.slice(-4)}`;
  }
  return raw;
}

export function formatCbeReceiptDate(dateStr?: string | number | Date): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) {
    return 'Aug 21, 2026, 6:51 PM';
  }

  const dateFormatted = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeFormatted = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${dateFormatted}, ${timeFormatted}`;
}

export function buildWebReceiptPayload(params: {
  transaction?: Transaction | null;
  smsMessage?: SmsMessage | null;
  initialViewMode?: 'web' | 'pdf';
}): WebReceiptUrlPayload {
  const { transaction, smsMessage, initialViewMode } = params;

  if (transaction) {
    const refId = formatTo12CharTxId(transaction.id || transaction.reference || 'FT26233ZJ908');
    const amount = Number(transaction.amount) || 0;
    const serviceCharge =
      transaction.serviceCharge !== undefined
        ? Number(transaction.serviceCharge)
        : amount >= 10000
          ? 3.0
          : amount >= 500
            ? 10.0
            : 0.5;
    const vat =
      transaction.vat !== undefined
        ? Number(transaction.vat)
        : Math.round(serviceCharge * 0.15 * 100) / 100;
    const disasterRecovery =
      transaction.disasterRecovery !== undefined
        ? Number(transaction.disasterRecovery)
        : Math.round(serviceCharge * 0.05 * 100) / 100;
    const totalDebited =
      transaction.totalDebited !== undefined
        ? Number(transaction.totalDebited)
        : Math.round((amount + serviceCharge + vat + disasterRecovery) * 100) / 100;

    const payerName = transaction.senderName || 'Kasahun Yematawork Lema';
    const payerAccount = formatCbeMask(transaction.senderAccount || '1000482918925');
    const receiverName = transaction.recipientName || 'Leykun Jemaneh Ylma';
    const receiverAccount = formatCbeMask(transaction.recipientAccount || '1000419524747');
    const paymentDate = formatCbeReceiptDate(transaction.createdAt);
    const reason =
      transaction.description && transaction.description.trim().length > 0
        ? transaction.description
        : String(Math.round(amount));

    return {
      refId,
      payerName,
      payerAccount,
      receiverName,
      receiverAccount,
      paymentType: 'A2A',
      paymentDate,
      reason,
      amount,
      serviceCharge,
      vat,
      disasterRecovery,
      totalDebited,
      words: numberToCbeWords(totalDebited),
      customerName: payerName,
      ...(initialViewMode ? { viewMode: initialViewMode } : {}),
    };
  }

  if (smsMessage) {
    const msg = smsMessage.message || '';
    const urlMatch = msg.match(/mbreceipt\.cbe\.com\.et\/v2-(?:hfHCxG)?([A-Z0-9]{12})/i);
    const ftMatch = msg.match(/\bFT[A-Z0-9]{10}\b/i);
    let refId = smsMessage.transactionId;
    if (!refId && urlMatch?.[1]) {
      refId = urlMatch[1].toUpperCase();
    } else if (!refId && ftMatch?.[0]) {
      refId = ftMatch[0].toUpperCase();
    }
    if (!refId) {
      refId = formatTo12CharTxId();
    }

    const isCredit = smsMessage.type === 'CREDIT' || msg.toLowerCase().includes('you have received');
    let payerName = 'Kasahun Yematawork Lema';
    let payerAccount = '1****8925';
    let receiverName = 'Leykun Jemaneh Ylma';
    let receiverAccount = '1****4747';

    if (isCredit) {
      const fromMatch = msg.match(/from account\s+([\d*]+)\s*\(([^)]+)\)/i);
      if (fromMatch) {
        payerAccount = formatCbeMask(fromMatch[1]);
        payerName = fromMatch[2].trim();
      } else if (smsMessage.sender) {
        payerName = smsMessage.sender;
      }

      const toMatch = msg.match(/to your account\s+([\d*]+)/i);
      if (toMatch) {
        receiverAccount = formatCbeMask(toMatch[1]);
      } else if (smsMessage.accountNumber) {
        receiverAccount = formatCbeMask(smsMessage.accountNumber);
      }
      receiverName = smsMessage.accountName || 'Leykun Jemaneh Ylma';
    } else {
      payerName = smsMessage.accountName || 'Leykun Jemaneh Yilma';
      payerAccount = formatCbeMask(smsMessage.accountNumber || '1000419524747');
      receiverName = smsMessage.recipient || 'Kasahun Yematawork Desta';
      receiverAccount = '1****9999';
    }

    const amount = smsMessage.amount !== undefined ? Number(smsMessage.amount) : 50.0;
    const serviceCharge =
      smsMessage.serviceCharge !== undefined
        ? Number(smsMessage.serviceCharge)
        : amount >= 30000
          ? 3.0
          : amount >= 500
            ? 10.0
            : 0.5;
    const vat =
      smsMessage.vat !== undefined
        ? Number(smsMessage.vat)
        : Math.round(serviceCharge * 0.15 * 100) / 100;
    const disasterRecovery =
      smsMessage.disasterRecovery !== undefined
        ? Number(smsMessage.disasterRecovery)
        : Math.round(serviceCharge * 0.05 * 100) / 100;
    const totalDebited =
      smsMessage.totalDebited !== undefined
        ? Number(smsMessage.totalDebited)
        : Math.round((amount + serviceCharge + vat + disasterRecovery) * 100) / 100;

    const reason = isCredit ? String(Math.round(amount)) : 'MB transfer';

    return {
      refId: formatTo12CharTxId(refId),
      payerName,
      payerAccount,
      receiverName,
      receiverAccount,
      paymentType: 'A2A',
      paymentDate: formatCbeReceiptDate(smsMessage.timestamp),
      reason,
      amount,
      serviceCharge,
      vat,
      disasterRecovery,
      totalDebited,
      words: numberToCbeWords(totalDebited),
      customerName: isCredit ? payerName : smsMessage.accountName || payerName,
      ...(initialViewMode ? { viewMode: initialViewMode } : {}),
    };
  }

  return {
    refId: 'FT26233ZJ908',
    payerName: 'Kasahun Yematawork Lema',
    payerAccount: '1****8925',
    receiverName: 'Leykun Jemaneh Ylma',
    receiverAccount: '1****4747',
    paymentType: 'A2A',
    paymentDate: 'Aug 21, 2026, 6:51 PM',
    reason: '50',
    amount: 50.0,
    serviceCharge: 0.5,
    vat: 0.08,
    disasterRecovery: 0.03,
    totalDebited: 50.61,
    words: 'Fifty ETB and Sixty One cents',
    customerName: 'Kasahun Yematawork Lema',
    ...(initialViewMode ? { viewMode: initialViewMode } : {}),
  };
}

export function encodeWebReceiptPayload(payload: WebReceiptUrlPayload): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeWebReceiptPayload(encoded: string | null | undefined): WebReceiptUrlPayload | null {
  if (!encoded || typeof encoded !== 'string') return null;
  try {
    let base64 = encoded.trim().replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || !parsed.refId) return null;
    return {
      refId: formatTo12CharTxId(String(parsed.refId)),
      payerName: String(parsed.payerName || 'Kasahun Yematawork Lema'),
      payerAccount: String(parsed.payerAccount || '1****8925'),
      receiverName: String(parsed.receiverName || 'Leykun Jemaneh Ylma'),
      receiverAccount: String(parsed.receiverAccount || '1****4747'),
      paymentType: String(parsed.paymentType || 'A2A'),
      paymentDate: String(parsed.paymentDate || 'Aug 21, 2026, 6:51 PM'),
      reason: String(parsed.reason || '50'),
      amount: Number(parsed.amount) || 0,
      serviceCharge: Number(parsed.serviceCharge) || 0,
      vat: Number(parsed.vat) || 0,
      disasterRecovery: Number(parsed.disasterRecovery) || 0,
      totalDebited: Number(parsed.totalDebited) || 0,
      words: String(parsed.words || numberToCbeWords(Number(parsed.totalDebited) || 0)),
      customerName: String(parsed.customerName || parsed.payerName || 'Kasahun Yematawork Lema'),
      viewMode: parsed.viewMode === 'pdf' ? 'pdf' : 'web',
    };
  } catch {
    return null;
  }
}

function normalizeOriginUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function isLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '[::1]';
}

function isNonPublicSimulatedReceiptHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === 'mbreceipt.cbe.com.et' ||
    h === 'mreciept.cbe.com.et' ||
    h === 'mbreciept.cbe.com.et' ||
    h.endsWith('.mbreceipt.cbe.com.et')
  );
}

/**
 * Call during app boot on web/PWA so if the app is ever accessed from a real public domain,
 * native Capacitor builds on the same device know the reachable HTTPS origin if present.
 */
export function cacheCurrentPublicOriginIfReachable(): void {
  if (typeof window === 'undefined') return;
  try {
    if (Capacitor.isNativePlatform()) return;
    const { protocol, hostname, origin } = window.location;
    if ((protocol === 'https:' || protocol === 'http:') && !isLocalHostname(hostname)) {
      localStorage.setItem(STORAGE_PUBLIC_ORIGIN_KEY, origin);
    }
  } catch {}
}

export function getCustomWebReceiptHost(): string {
  try {
    return localStorage.getItem(STORAGE_CUSTOM_HOST_KEY) || '';
  } catch {
    return '';
  }
}

export function setCustomWebReceiptHost(url: string | null): void {
  try {
    const cleaned = (url || '').trim();
    if (!cleaned) {
      localStorage.removeItem(STORAGE_CUSTOM_HOST_KEY);
    } else {
      const normalized = normalizeOriginUrl(cleaned);
      localStorage.setItem(STORAGE_CUSTOM_HOST_KEY, normalized || cleaned);
    }
  } catch {}
}

export function isOpenInRealBrowserEnabled(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_AUTO_OPEN_REAL_BROWSER_KEY);
    if (raw === null) return true; // Enabled by default
    return raw !== 'false';
  } catch {
    return true;
  }
}

export function setOpenInRealBrowserEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_AUTO_OPEN_REAL_BROWSER_KEY, enabled ? 'true' : 'false');
  } catch {}
}

export function getRealBrowserTargetMode(): RealBrowserTargetMode {
  // Always use the reachable app-hosted receipt route (/v2-hfHCxG...) for external browser tabs,
  // because mbreceipt.cbe.com.et is not a publicly resolvable DNS domain (causes DNS_PROBE_FINISHED_NXDOMAIN).
  return 'hosted';
}

export function setRealBrowserTargetMode(_mode: RealBrowserTargetMode): void {
  try {
    localStorage.setItem(STORAGE_REAL_BROWSER_TARGET_MODE_KEY, 'hosted');
  } catch {}
}

export function buildOfficialCbeWebReceiptUrl(refId?: string | null): string {
  const cleanId = formatTo12CharTxId(refId || 'FT263198WG29');
  return `https://mbreceipt.cbe.com.et/v2-hfHCxG${cleanId}`;
}

export function resolveWebReceiptPublicOrigin(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Explicit custom host configured by the user (ignore non-existent mbreceipt.cbe.com.et host)
  const customHost = normalizeOriginUrl(getCustomWebReceiptHost());
  if (customHost) {
    try {
      const parsedCustom = new URL(customHost);
      if (!isNonPublicSimulatedReceiptHost(parsedCustom.hostname)) {
        return customHost;
      }
      // Clean up invalid stored host that causes DNS_PROBE_FINISHED_NXDOMAIN
      localStorage.removeItem(STORAGE_CUSTOM_HOST_KEY);
    } catch {}
  }

  // 2. Environment public app URL configured at build time
  const envPublicUrl = normalizeOriginUrl(
    (import.meta as any)?.env?.VITE_PUBLIC_APP_URL as string | undefined
  );
  if (envPublicUrl) {
    try {
      const parsedEnv = new URL(envPublicUrl);
      if (!isNonPublicSimulatedReceiptHost(parsedEnv.hostname)) {
        return envPublicUrl;
      }
    } catch {}
  }

  const isNative = Capacitor.isNativePlatform();

  // 3. On Web / PWA (Chrome, Safari, desktop, iOS home screen PWA, iframe preview):
  // Any http(s) origin (including http://localhost:3000 in local dev/web) opens cleanly in a real browser tab!
  if (!isNative) {
    const { protocol, origin, hostname } = window.location;
    if ((protocol === 'http:' || protocol === 'https:') && !isNonPublicSimulatedReceiptHost(hostname)) {
      return origin;
    }
    return null;
  }

  // 4. On Native Capacitor (Android/iOS):
  // Capacitor serves bundled assets at https://localhost or capacitor://localhost, which external Chrome/Safari
  // cannot resolve. Only open externally if a cached reachable non-localhost public http(s) origin is available.
  try {
    const cached = normalizeOriginUrl(localStorage.getItem(STORAGE_PUBLIC_ORIGIN_KEY));
    if (cached) {
      const u = new URL(cached);
      if (!isLocalHostname(u.hostname) && !isNonPublicSimulatedReceiptHost(u.hostname)) {
        return cached;
      }
    }
  } catch {}

  return null;
}

export function saveWebReceiptPayload(payload: WebReceiptUrlPayload): void {
  if (typeof window === 'undefined' || !payload?.refId) return;
  try {
    const key = `${STORAGE_PAYLOAD_PREFIX}${payload.refId.toUpperCase()}`;
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {}
}

export function loadWebReceiptPayload(refId: string | null | undefined): WebReceiptUrlPayload | null {
  if (typeof window === 'undefined' || !refId) return null;
  try {
    const key = `${STORAGE_PAYLOAD_PREFIX}${refId.trim().toUpperCase()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.refId) return null;
    return parsed as WebReceiptUrlPayload;
  } catch {
    return null;
  }
}

export function extractWebReceiptIdFromPath(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const match = pathname.match(/^\/v2-(?:hfHCxG)?([A-Z0-9]{8,16})\/?$/i);
  if (match && match[1]) {
    return match[1].toUpperCase();
  }
  return null;
}

export function buildStandaloneWebReceiptUrl(params: {
  origin: string;
  transaction?: Transaction | null;
  smsMessage?: SmsMessage | null;
  initialViewMode?: 'web' | 'pdf';
  payload?: WebReceiptUrlPayload;
}): string {
  const { origin, transaction, smsMessage, initialViewMode, payload } = params;
  const finalPayload =
    payload ||
    buildWebReceiptPayload({
      transaction,
      smsMessage,
      initialViewMode,
    });

  // Store locally so same-origin browser tabs load cleanly from /v2-hfHCxG<refId> without query noise
  saveWebReceiptPayload(finalPayload);

  const cleanPath = `/v2-hfHCxG${finalPayload.refId}`;
  const url = new URL(cleanPath, origin);

  // Only include encoded payload query parameter when crossing origins (e.g. native Capacitor localhost -> external host)
  const isSameOrigin = typeof window !== 'undefined' && window.location.origin === origin;
  if (!isSameOrigin) {
    url.searchParams.set('d', encodeWebReceiptPayload(finalPayload));
  }

  return url.toString();
}

/**
 * Opens an external URL in the user's real web browser WITHOUT using window.open.
 * - On Web/PWA: uses a synchronous programmatic <a target="_blank" rel="noopener noreferrer"> click
 *   so Chrome/iOS Safari treat it as a valid user gesture and open a genuine browser tab.
 * - On Native Capacitor: launches Chrome Custom Tab / Safari View Controller via @capacitor/browser.
 */
export function openExternalUrlInBrowser(url: string): boolean {
  if (typeof window === 'undefined' || !url) return false;

  // Never send the non-existent simulated mbreceipt.cbe.com.et domain to Chrome/Safari
  // (it always fails with DNS_PROBE_FINISHED_NXDOMAIN).
  try {
    const parsed = new URL(url);
    if (isNonPublicSimulatedReceiptHost(parsed.hostname)) {
      return false;
    }
  } catch {}

  if (Capacitor.isNativePlatform()) {
    Browser.open({
      url,
      toolbarColor: '#781d77',
      presentationStyle: 'fullscreen',
    }).catch((err) => {
      console.warn('[WebReceipt] Capacitor Browser.open failed:', err);
    });
    return true;
  }

  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return true;
  } catch (err) {
    console.warn('[WebReceipt] Anchor navigation fallback failed:', err);
    return false;
  }
}

/**
 * Attempts to open the CBE Web Receipt directly in a real web browser tab/controller.
 * Returns `true` if successfully handed off to a reachable hosted browser URL, or `false` so
 * the caller displays the instant in-app CbeWebReceiptModal (with the mbreceipt.cbe.com.et URL bar).
 */
export function openWebReceiptInRealBrowser(params: {
  transaction?: Transaction | null;
  smsMessage?: SmsMessage | null;
  initialViewMode?: 'web' | 'pdf';
  forceOpen?: boolean;
  targetModeOverride?: RealBrowserTargetMode;
}): boolean {
  const { transaction, smsMessage, initialViewMode, forceOpen = false } = params;

  if (!forceOpen && !isOpenInRealBrowserEnabled()) {
    return false;
  }

  const origin = resolveWebReceiptPublicOrigin();
  if (!origin) {
    return false;
  }

  const targetUrl = buildStandaloneWebReceiptUrl({
    origin,
    transaction,
    smsMessage,
    initialViewMode,
  });

  return openExternalUrlInBrowser(targetUrl);
}

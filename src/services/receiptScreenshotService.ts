import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Media } from '@capacitor-community/media';
import html2canvas from 'html2canvas-pro';
import { LocalDb, DEFAULT_CBE_LOGO } from '../lib/mockData';
import { CBE_DEFAULT_LOGO_BASE64 } from '../assets/cbeLogoBase64';

/**
 * Sanitizes transaction ID for safe cross-platform file naming.
 * Example: "FT26090CYW4B" -> "transaction-receipt-FT26090CYW4B.png"
 */
export function getSafeReceiptFilename(txId: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const timeStr = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const sanitized = (txId || 'receipt')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 30);
  return `Screenshot_${dateStr}-${timeStr}_CBE_${sanitized}.png`;
}

/**
 * Safely converts a Base64 or Data URL to a native binary Blob without using fetch()
 * (which can fail in Android WebViews / iframes).
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

import { PhoneSettingsService } from './phoneSettingsService';

/**
 * Accurately detects iOS devices (iPhone, iPad, iPod, or iPadOS Safari on MacIntel,
 * plus user-selected iPhone mode).
 */
export function checkIsIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || (navigator as any).vendor || '';
  const isIosUa = /iPhone|iPad|iPod/i.test(ua);
  const isMacTouch = (navigator.platform === 'MacIntel' || navigator.platform === 'iPad' || navigator.platform === 'iPhone') && navigator.maxTouchPoints > 1;
  const isIosWebKit = /WebKit/i.test(ua) && !/Chrome|CriOS|Android/i.test(ua) && /Mobile/i.test(ua);
  const isPhoneSetting = PhoneSettingsService.isIPhoneDevice() || PhoneSettingsService.isIPhoneMode();
  return isIosUa || isMacTouch || isIosWebKit || isPhoneSetting;
}

/**
 * Converts an SVG Data URL (e.g. data:image/svg+xml...) to a rasterized PNG Data URL
 * to avoid tainted canvas or blank image issues on Android Chrome / WebKit.
 */
async function rasterizeSvgToPngDataUrl(svgDataUrl: string, width = 450, height = 450): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timer = setTimeout(() => resolve(svgDataUrl), 1500);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(svgDataUrl);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(svgDataUrl);
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        resolve(svgDataUrl);
      };

      img.src = svgDataUrl;
    } catch {
      resolve(svgDataUrl);
    }
  });
}

/**
 * Converts any image element inside the receipt into a self-contained Base64 PNG Data URL
 * and ensures the browser decodes it before canvas rendering.
 */
async function inlineImageElement(img: HTMLImageElement): Promise<void> {
  const isCbeLogo = img.getAttribute('data-cbe-logo') === 'true' || 
                    img.alt?.toLowerCase().includes('commercial bank') ||
                    img.id?.includes('cbe-logo');
  
  if (isCbeLogo) {
    const savedCustomLogo = LocalDb.getCustomBankLogo();
    if (savedCustomLogo && savedCustomLogo.startsWith('data:image/')) {
      img.src = savedCustomLogo;
    } else {
      img.src = CBE_DEFAULT_LOGO_BASE64;
    }
    if ('decode' in img) {
      await img.decode().catch(() => {});
    }
    return;
  }

  // If already an SVG Data URL, rasterize to PNG to prevent Android Chrome canvas taint
  if (img.src && img.src.startsWith('data:image/svg')) {
    try {
      const pngData = await rasterizeSvgToPngDataUrl(img.src, 450, 450);
      img.src = pngData;
      if ('decode' in img) {
        await img.decode().catch(() => {});
      }
      return;
    } catch {
      // Continue
    }
  }

  // If already a PNG/JPEG base64 data URL, ensure it is decoded
  if (img.src && img.src.startsWith('data:')) {
    if ('decode' in img) {
      await img.decode().catch(() => {});
    }
    return;
  }

  // If default local logo, replace with embedded base64
  if (!img.src || img.src.includes('custom-bank-logo') || img.src.includes('cbe-gold-logo')) {
    img.src = CBE_DEFAULT_LOGO_BASE64;
    if ('decode' in img) {
      await img.decode().catch(() => {});
    }
    return;
  }

  // Fetch remote/relative image data as blob and convert to Base64 Data URL
  try {
    const resp = await fetch(img.src);
    if (resp.ok) {
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error('Reader result not string'));
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      img.src = dataUrl;
      if ('decode' in img) {
        await img.decode().catch(() => {});
      }
      return;
    }
  } catch {
    // If fetch failed, try drawing on canvas
  }

  try {
    if (img.complete && img.naturalWidth > 0) {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = img.naturalWidth;
      offCanvas.height = img.naturalHeight;
      const offCtx = offCanvas.getContext('2d');
      if (offCtx) {
        offCtx.drawImage(img, 0, 0);
        const inlinedSrc = offCanvas.toDataURL('image/png');
        img.src = inlinedSrc;
        if ('decode' in img) {
          await img.decode().catch(() => {});
        }
      }
    }
  } catch (canvasErr) {
    console.warn('[ScreenshotService] Canvas inlining note:', canvasErr);
  }
}

/**
 * Captures the FULL rendered receipt DOM element.
 * Specially optimized for Android and iOS phones:
 * - Resets and restores scroll offsets so scrolled views don't cut off or shift
 * - Expands full content height and width without clipping
 * - Inlines all assets and rasterizes SVGs
 * - Uses memory-safe scale for high-DPI Android/Retina screens
 */
export interface CaptureReceiptOptions {
  addGrayBottomStrip?: boolean;
  targetWidth?: number;
  targetHeight?: number;
}

export async function captureReceiptElement(
  element: HTMLElement,
  options?: CaptureReceiptOptions
): Promise<string> {
  // 1. Capture initial scroll position of scroll wrapper so we can restore it afterwards
  const innerScrollable = element.querySelector('.overflow-y-auto') as HTMLElement | null;
  const initialInnerScrollTop = innerScrollable ? innerScrollable.scrollTop : 0;
  const scrollWrapper = document.getElementById('receipt-screen-wrapper') || 
                        element.closest('.overflow-y-auto') || 
                        element.parentElement;
  const initialScrollTop = scrollWrapper ? scrollWrapper.scrollTop : window.scrollY;

  // Temporarily reset scroll to 0 for flawless viewport bounding calculation
  if (innerScrollable) {
    innerScrollable.scrollTop = 0;
  }
  if (scrollWrapper) {
    scrollWrapper.scrollTop = 0;
  }

  // 2. Allow DOM and layout microtasks to settle
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  // 3. Wait for all images inside the receipt container to finish loading and inline them as Data URLs
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      if (!img.complete || img.naturalHeight === 0) {
        await new Promise<void>((resolve) => {
          const onDone = () => {
            img.removeEventListener('load', onDone);
            img.removeEventListener('error', onDone);
            resolve();
          };
          img.addEventListener('load', onDone);
          img.addEventListener('error', onDone);
          setTimeout(resolve, 800);
        });
      }

      await inlineImageElement(img);
    })
  );

  // 4. Ensure web fonts are completely ready
  if (typeof document !== 'undefined' && 'fonts' in document && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue even if font ready rejects
    }
  }

  // 5. Measure full content bounds matching exact edge-to-edge screen dimensions
  const rect = element.getBoundingClientRect();
  const isExactTarget = element.id === 'cbe-screenshot-exact-target';
  const shouldAddGrayStrip = options?.addGrayBottomStrip ?? true;
  const isWideViewport = typeof window !== 'undefined' && window.innerWidth > 500;
  const fullWidth = isExactTarget
    ? (parseInt(element.style.width, 10) || element.offsetWidth || options?.targetWidth || 360)
    : (isWideViewport && options?.targetWidth
        ? options.targetWidth
        : Math.max(Math.ceil(rect.width), element.offsetWidth, options?.targetWidth || 360));

  let fullHeight: number;
  if (isExactTarget) {
    fullHeight = Math.max(
      parseInt(element.style.height, 10) || 0,
      element.scrollHeight,
      element.offsetHeight,
      options?.targetHeight || 800
    );
  } else {
    const viewportH = Math.max(Math.ceil(rect.height), element.offsetHeight, options?.targetHeight || 800);
    const extraScroll = innerScrollable ? Math.max(0, innerScrollable.scrollHeight - innerScrollable.clientHeight) : 0;
    const bottomActions = element.querySelector('#cbe-receipt-bottom-actions-container') as HTMLElement | null;
    const bottomActionsH = bottomActions ? bottomActions.offsetHeight : 0;
    const bottomReserve = shouldAddGrayStrip ? 123 : 48;
    const neededContentHeight = Math.ceil(rect.height || element.offsetHeight) - bottomActionsH + extraScroll + bottomReserve;
    fullHeight = Math.max(viewportH, neededContentHeight, options?.targetHeight || 800);
  }

  // Safe pixel ratio for mobile devices (2.0x is razor-sharp without exceeding Android canvas memory limits)
  const rawDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2;
  const pixelRatio = Math.min(2.5, Math.max(2, rawDpr));

  // Ignore overlays/toasts/flash but handle #btn-top-screenshot and bottom bar cleanly in onclone
  const isExcluded = (node: Element): boolean => {
    return (
      node.getAttribute('data-screenshot-temporary') === 'true' ||
      (node.getAttribute('data-screenshot-exclude') === 'true' && node.id !== 'btn-top-screenshot')
    );
  };

  const prepareClonedReceiptDom = (clonedDoc: Document, clonedElement: HTMLElement) => {
    clonedDoc.defaultView?.scrollTo(0, 0);

    try {
      const existingStyleTexts = new Set(
        Array.from(clonedDoc.querySelectorAll('style')).map((s) => s.textContent || '')
      );
      const existingHrefs = new Set(
        Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]')).map((l) => l.getAttribute('href') || '')
      );
      const mainStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
      mainStyles.forEach((styleTag) => {
        if (styleTag.tagName === 'STYLE') {
          if (!existingStyleTexts.has(styleTag.textContent || '')) {
            clonedDoc.head.appendChild(styleTag.cloneNode(true));
          }
        } else {
          const href = styleTag.getAttribute('href') || '';
          if (href && !existingHrefs.has(href)) {
            clonedDoc.head.appendChild(styleTag.cloneNode(true));
          }
        }
      });
    } catch {}

    // Detach cloned receipt directly onto clonedDoc.body and hide #root so ancestor margins,
    // safe-area offsets, OfflineBanner, or 100dvh viewport constraints can never clip or inset the capture.
    clonedDoc.body.appendChild(clonedElement);

    const rootElement = clonedDoc.getElementById('root');
    if (rootElement && rootElement !== clonedElement) {
      rootElement.style.display = 'none';
    }

    if (clonedDoc.documentElement) {
      clonedDoc.documentElement.style.width = `${fullWidth}px`;
      clonedDoc.documentElement.style.height = `${fullHeight}px`;
      clonedDoc.documentElement.style.minWidth = `${fullWidth}px`;
      clonedDoc.documentElement.style.maxWidth = `${fullWidth}px`;
      clonedDoc.documentElement.style.minHeight = `${fullHeight}px`;
      clonedDoc.documentElement.style.maxHeight = `${fullHeight}px`;
      clonedDoc.documentElement.style.margin = '0';
      clonedDoc.documentElement.style.padding = '0';
      clonedDoc.documentElement.style.border = 'none';
      clonedDoc.documentElement.style.overflow = 'hidden';
      clonedDoc.documentElement.style.backgroundColor = '#7A1FA2';
    }
    if (clonedDoc.body) {
      clonedDoc.body.style.width = `${fullWidth}px`;
      clonedDoc.body.style.height = `${fullHeight}px`;
      clonedDoc.body.style.minWidth = `${fullWidth}px`;
      clonedDoc.body.style.maxWidth = `${fullWidth}px`;
      clonedDoc.body.style.minHeight = `${fullHeight}px`;
      clonedDoc.body.style.maxHeight = `${fullHeight}px`;
      clonedDoc.body.style.margin = '0';
      clonedDoc.body.style.padding = '0';
      clonedDoc.body.style.border = 'none';
      clonedDoc.body.style.overflow = 'hidden';
      clonedDoc.body.style.backgroundColor = '#7A1FA2';
    }

    clonedElement.style.position = 'relative';
    clonedElement.style.top = '0';
    clonedElement.style.left = '0';
    clonedElement.style.right = '0';
    clonedElement.style.bottom = '0';
    clonedElement.style.zIndex = '9999';
    clonedElement.style.opacity = '1';
    clonedElement.style.visibility = 'visible';
    clonedElement.style.display = 'flex';
    clonedElement.style.flexDirection = 'column';
    clonedElement.style.justifyContent = 'space-between';
    clonedElement.style.width = `${fullWidth}px`;
    clonedElement.style.minWidth = `${fullWidth}px`;
    clonedElement.style.maxWidth = `${fullWidth}px`;
    clonedElement.style.height = `${fullHeight}px`;
    clonedElement.style.minHeight = `${fullHeight}px`;
    clonedElement.style.maxHeight = `${fullHeight}px`;
    clonedElement.style.margin = '0';
    clonedElement.style.padding = '0';
    clonedElement.style.border = 'none';
    clonedElement.style.borderRadius = '0';
    clonedElement.style.boxShadow = 'none';
    clonedElement.style.transform = 'none';
    clonedElement.style.overflow = 'hidden';
    clonedElement.style.boxSizing = 'border-box';
    clonedElement.style.backgroundColor = '#7A1FA2';

    if (clonedElement.id !== 'cbe-screenshot-exact-target') {
      const stripHeight = 35;
      const receiptContentHeight = shouldAddGrayStrip ? Math.max(600, fullHeight - stripHeight) : fullHeight;
      const existingReceipt = clonedDoc.getElementById('cbe-existing-receipt');
      if (existingReceipt) {
        existingReceipt.style.width = '100%';
        existingReceipt.style.height = `${receiptContentHeight}px`;
        existingReceipt.style.minHeight = `${receiptContentHeight}px`;
        existingReceipt.style.flex = '1 1 auto';
        existingReceipt.style.display = 'flex';
        existingReceipt.style.flexDirection = 'column';
        existingReceipt.style.overflow = 'hidden';
        existingReceipt.style.backgroundColor = '#7A1FA2';
      }

      const purpleHeaderInner = clonedDoc.getElementById('cbe-receipt-purple-header-inner');
      if (purpleHeaderInner) {
        const computedTop = parseFloat(clonedDoc.defaultView?.getComputedStyle(purpleHeaderInner).paddingTop || '70') || 70;
        purpleHeaderInner.style.paddingTop = `${Math.max(70, computedTop)}px`;
      }

      const clonedScrollable = clonedElement.querySelector('.overflow-y-auto') as HTMLElement | null;
      if (clonedScrollable) {
        clonedScrollable.scrollTop = 0;
        clonedScrollable.style.overflow = 'visible';
        clonedScrollable.style.height = 'auto';
        clonedScrollable.style.maxHeight = 'none';
        clonedScrollable.style.flex = '1 1 auto';
        clonedScrollable.style.backgroundColor = '#ffffff';
        if (shouldAddGrayStrip) {
          clonedScrollable.style.paddingBottom = '88px';
        }
      }

      const bottomBar = clonedDoc.getElementById('cbe-receipt-bottom-actions-container');
      if (bottomBar) {
        bottomBar.style.display = 'none';
      }

      if (shouldAddGrayStrip && !clonedDoc.getElementById('cbe-live-gray-bottom-strip')) {
        const stripEl = clonedDoc.createElement('div');
        stripEl.id = 'cbe-live-gray-bottom-strip';
        stripEl.style.width = '100%';
        stripEl.style.height = `${stripHeight}px`;
        stripEl.style.minHeight = `${stripHeight}px`;
        stripEl.style.flexShrink = '0';
        stripEl.style.backgroundColor = '#f0f1f4';
        stripEl.style.borderTop = '1px solid #e2e4e8';
        stripEl.style.boxSizing = 'border-box';
        clonedElement.appendChild(stripEl);
      }

      const topScreenshotBtn = clonedDoc.getElementById('btn-top-screenshot');
      if (topScreenshotBtn) {
        topScreenshotBtn.style.visibility = 'hidden';
      }

      const animatedBadges = clonedElement.querySelectorAll('.animate-cbe-pulse');
      animatedBadges.forEach((badge) => {
        (badge as HTMLElement).style.animation = 'none';
        (badge as HTMLElement).style.transform = 'scale(1)';
      });
    }

    const temporaryNodes = clonedDoc.querySelectorAll(
      '[data-screenshot-exclude="true"]:not(#btn-top-screenshot), [data-screenshot-temporary="true"]'
    );
    temporaryNodes.forEach((node) => {
      (node as HTMLElement).style.display = 'none';
    });

    const clonedImgs = clonedDoc.querySelectorAll('img');
    clonedImgs.forEach((clonedImg) => {
      if (!clonedImg.src || clonedImg.src.includes('custom-bank-logo') || clonedImg.src.includes('cbe-gold-logo')) {
        clonedImg.src = CBE_DEFAULT_LOGO_BASE64;
      }
    });
  };

  const paintGrayBottomStripOnCanvas = (targetCanvas: HTMLCanvasElement, scaleFactor: number) => {
    if (!shouldAddGrayStrip) return;
    const targetCtx = targetCanvas.getContext('2d');
    if (!targetCtx) return;
    targetCtx.save();
    targetCtx.setTransform(1, 0, 0, 1, 0, 0);
    targetCtx.globalAlpha = 1;
    targetCtx.globalCompositeOperation = 'source-over';
    const bottomStripH = Math.round(35 * scaleFactor);
    const stripTopY = Math.max(0, targetCanvas.height - bottomStripH);
    targetCtx.fillStyle = '#f0f1f4';
    targetCtx.fillRect(0, stripTopY, targetCanvas.width, bottomStripH);
    targetCtx.fillStyle = '#e2e4e8';
    targetCtx.fillRect(0, stripTopY, targetCanvas.width, Math.max(1, Math.round(1 * scaleFactor)));
    targetCtx.restore();
  };

  const validateCapturedCanvas = (targetCanvas: HTMLCanvasElement, scaleFactor: number) => {
    const tCtx = targetCanvas.getContext('2d');
    if (!tCtx) return;

    // 1. Top header must have authentic CBE purple (#7A1FA2 / #70189F)
    const sampleTop = tCtx.getImageData(Math.round(targetCanvas.width / 2), Math.round(25 * scaleFactor), 1, 1).data;
    const isTopPurple = sampleTop[0] > 60 && sampleTop[0] < 165 && sampleTop[1] < 65 && sampleTop[2] > 110 && sampleTop[3] > 200;
    if (!isTopPurple) {
      throw new Error('Unstyled capture detected: missing purple header');
    }

    // 2. Middle of receipt must NOT be solid purple
    const midY = Math.round(targetCanvas.height / 2);
    const sampleMid = tCtx.getImageData(Math.round(targetCanvas.width / 2), midY, 1, 1).data;
    const isMidPurple = sampleMid[0] > 60 && sampleMid[0] < 165 && sampleMid[1] < 65 && sampleMid[2] > 110;
    if (isMidPurple) {
      throw new Error('Blank solid purple capture detected');
    }

    // 3. Detail card left padding strip (x=26px, inside 20px margin and left of 38px text) must show #f3f3f5 gray fill
    const probeX = Math.min(targetCanvas.width - 2, Math.round(26 * scaleFactor));
    const startY = Math.round(220 * scaleFactor);
    const endY = Math.min(targetCanvas.height - 2, Math.round(440 * scaleFactor));
    const stepY = Math.max(4, Math.round(8 * scaleFactor));
    let foundCardGrayFill = false;
    for (let y = startY; y <= endY; y += stepY) {
      const p = tCtx.getImageData(probeX, y, 1, 1).data;
      if (p[0] >= 232 && p[0] <= 248 && p[1] >= 232 && p[1] <= 248 && p[2] >= 234 && p[2] <= 250 && p[3] > 240) {
        foundCardGrayFill = true;
        break;
      }
    }
    if (!foundCardGrayFill) {
      throw new Error('Unstyled capture detected: missing styled detail card fill');
    }
  };

  try {
    const canvas = await html2canvas(element, {
      scale: pixelRatio,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#7A1FA2',
      logging: false,
      imageTimeout: 15000,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      width: fullWidth,
      height: fullHeight,
      windowWidth: fullWidth,
      windowHeight: fullHeight,
      ignoreElements: isExcluded,
      onclone: prepareClonedReceiptDom,
    });

    try {
      validateCapturedCanvas(canvas, pixelRatio);
    } catch (checkErr) {
      console.warn('[ScreenshotService] Rejecting defective primary DOM capture:', checkErr);
      throw checkErr;
    }

    // Draw crisp 35px gray bottom strip at the bottom edge of screenshot
    paintGrayBottomStripOnCanvas(canvas, pixelRatio);

    const dataUrl = canvas.toDataURL('image/png');
    if (dataUrl && dataUrl.length > 1000) {
      return dataUrl;
    }
    throw new Error('html2canvas canvas data was empty');
  } catch (primaryErr) {
    console.warn('[ScreenshotService] html2canvas-pro capture retry with standard options:', primaryErr);
    
    // Fallback: html2canvas with standard options, cloned cleanup, and strict validation
    try {
      const fallbackCanvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#7A1FA2',
        logging: false,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        width: fullWidth,
        height: fullHeight,
        windowWidth: fullWidth,
        windowHeight: fullHeight,
        ignoreElements: isExcluded,
        onclone: prepareClonedReceiptDom,
      });
      validateCapturedCanvas(fallbackCanvas, 2);
      paintGrayBottomStripOnCanvas(fallbackCanvas, 2);
      return fallbackCanvas.toDataURL('image/png');
    } catch (fallbackErr) {
      console.error('[ScreenshotService] DOM capture rejected/failed, using Canvas 2D fallback:', fallbackErr);
      throw fallbackErr;
    }
  } finally {
    // Restore user scroll position so viewport does not jump
    if (innerScrollable) {
      innerScrollable.scrollTop = initialInnerScrollTop;
    }
    if (scrollWrapper) {
      scrollWrapper.scrollTop = initialScrollTop;
    }
  }
}

/**
 * Cross-platform save and share workflow.
 * Full support for Android (Capacitor & Web Chrome) and iOS (Capacitor & Safari).
 * Never throws fatal exceptions to UI - guarantees receipt stays visible and preview works.
 */
export async function saveAndShareReceiptImage(
  dataUrl: string,
  txId: string,
  triggerShareModal: boolean = false
): Promise<{ saved: boolean; fileUri?: string }> {
  const filename = getSafeReceiptFilename(txId);
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  const isIos = platform === 'ios' || checkIsIOS();

  if (isNative) {
    try {
      // 1. Direct native save into Apple Photos (iOS) or Camera Roll (Android) via Media plugin
      try {
        await Media.savePhoto({
          path: dataUrl,
          fileName: filename.replace(/\.png$/i, ''),
        });
        return { saved: true };
      } catch (mediaErr) {
        console.warn('Native Media.savePhoto direct gallery save note:', mediaErr);
      }

      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

      // 1. Write PNG file into Cache directory (safe, temporary, no special permissions required)
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
      });

      const fileUri = writeResult.uri;

      // 2. On Android, persist to Documents and ExternalStorage for direct user file access & gallery indexing
      if (platform === 'android') {
        try {
          await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: Directory.Documents,
          });
        } catch (docErr) {
          console.warn('Documents directory write note:', docErr);
        }
        try {
          await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: Directory.ExternalStorage,
          });
        } catch (extErr) {
          console.warn('ExternalStorage directory write note:', extErr);
        }
      }

      // 2b. On native iOS, also persist to Documents
      if (platform === 'ios') {
        try {
          await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: Directory.Documents,
          });
        } catch (iosDocErr) {
          console.warn('iOS Documents directory write note:', iosDocErr);
        }
      }

      // 3. For native explicit share request ONLY: open native share sheet
      if (triggerShareModal) {
        try {
          await Share.share({
            title: `CBE Receipt ${txId}`,
            text: `Commercial Bank of Ethiopia Transaction Receipt #${txId}`,
            files: [fileUri],
            dialogTitle: 'Share Receipt',
          });
        } catch (shareErr: any) {
          if (
            shareErr?.name === 'AbortError' ||
            shareErr?.message?.includes('canceled') ||
            shareErr?.message?.includes('cancelled')
          ) {
            return { saved: true, fileUri };
          }
          console.warn('Native share dialog note:', shareErr);
        }
      }

      return { saved: true, fileUri };
    } catch (nativeErr) {
      console.warn('Native Capacitor save notice:', nativeErr);
      return { saved: false };
    }
  } else {
    // Browser / PWA environment (Android Chrome, iOS Safari, etc.)
    try {
      const blob = dataUrlToBlob(dataUrl);
      const file = new File([blob], filename, { type: 'image/png' });

      // 1. Direct browser file download: saves silently on Android; skip on iOS/Safari so Safari never opens the black preview screen
      if (!isIos) {
        try {
          const blobUrl = URL.createObjectURL(blob);
          const downloadLink = document.createElement('a');
          downloadLink.href = blobUrl;
          downloadLink.download = filename;
          downloadLink.setAttribute('download', filename);
          downloadLink.style.display = 'none';
          document.body.appendChild(downloadLink);
          downloadLink.click();
          setTimeout(() => {
            try {
              document.body.removeChild(downloadLink);
              URL.revokeObjectURL(blobUrl);
            } catch {}
          }, 3000);
        } catch (downloadErr) {
          console.warn('Download link fallback notice:', downloadErr);
        }
      }

      // 2. Clipboard copy: silently saves full image to clipboard on iOS and desktop
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        } catch {}
      }

      // 3. Web Share API ONLY when explicitly requested by tapping the Share button
      if (triggerShareModal && typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `CBE Receipt - ${txId}`,
            text: `Commercial Bank of Ethiopia Transaction Receipt #${txId}`,
          });
          return { saved: true };
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') {
            return { saved: true };
          }
          console.log('Share dialog note:', shareErr);
        }
      }

      return { saved: true };
    } catch (browserErr) {
      console.warn('Browser save note:', browserErr);
      return { saved: true };
    }
  }
}

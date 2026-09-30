import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import html2canvas from 'html2canvas';
import { LocalDb } from '../lib/mockData';

/**
 * Sanitizes transaction ID for safe cross-platform file naming.
 * Example: "FT26090CYW4B" -> "transaction-receipt-FT26090CYW4B.png"
 */
export function getSafeReceiptFilename(txId: string): string {
  const sanitized = (txId || 'receipt')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 50);
  return `transaction-receipt-${sanitized}.png`;
}

/**
 * Converts any image element inside the receipt into a self-contained Base64 Data URL
 * and ensures the browser decodes it before html2canvas runs.
 */
async function inlineImageElement(img: HTMLImageElement): Promise<void> {
  // If this image is the CBE bank logo, check if an uploaded custom logo exists in LocalDb
  const isCbeLogo = img.getAttribute('data-cbe-logo') === 'true' || 
                    img.alt?.toLowerCase().includes('commercial bank') ||
                    img.id?.includes('cbe-logo');
  
  if (isCbeLogo) {
    const savedCustomLogo = LocalDb.getCustomBankLogo();
    if (savedCustomLogo && savedCustomLogo.startsWith('data:image/')) {
      img.src = savedCustomLogo;
      if ('decode' in img) {
        await img.decode().catch(() => {});
      }
      return;
    }
  }

  // If already a base64 data URL, ensure it is decoded
  if (img.src && img.src.startsWith('data:')) {
    if ('decode' in img) {
      await img.decode().catch(() => {});
    }
    return;
  }

  if (!img.src) return;

  // Fetch image data as blob and convert to Base64 Data URL
  try {
    const resp = await fetch(img.src, { mode: 'cors' });
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
    // If fetch failed, try offscreen canvas drawing
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
 * Captures ONLY the existing rendered receipt DOM element.
 * Waits for full render, images (including CBE logo), SVGs, QR code, and fonts
 * before taking a crisp, high-resolution PNG.
 */
export async function captureReceiptElement(element: HTMLElement): Promise<string> {
  // 1. Wait until receipt is fully rendered and pending microtasks / layout complete
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  // 2. Wait for all images inside the receipt container to finish loading and inline them as Data URLs
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      // Await loading if not yet complete
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

  // Allow layout and GPU rasterization to settle
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  // 3. Ensure fonts are loaded
  if (typeof document !== 'undefined' && 'fonts' in document && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue even if font ready rejects
    }
  }

  // 4. Determine high-resolution pixel ratio (minimum 3x for crisp Retina rendering)
  const pixelRatio = Math.max(3, window.devicePixelRatio || 2);

  const isExcluded = (node: Element): boolean => {
    return (
      node.getAttribute('data-screenshot-exclude') === 'true' ||
      node.getAttribute('data-html2canvas-ignore') === 'true' ||
      node.id === 'receipt-status-bar'
    );
  };

  // 5. Capture existing rendered receipt DOM element using html2canvas with CORS and no taint
  const canvas = await html2canvas(element, {
    scale: pixelRatio,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#68137e',
    logging: false,
    imageTimeout: 15000,
    ignoreElements: isExcluded,
  });

  return canvas.toDataURL('image/png');
}

/**
 * Cross-platform save and share workflow.
 * Works on Android (Capacitor), iOS (Capacitor), and Browser / PWA.
 */
export async function saveAndShareReceiptImage(
  dataUrl: string,
  txId: string,
  triggerShareModal: boolean = true
): Promise<{ saved: boolean; fileUri?: string }> {
  const filename = getSafeReceiptFilename(txId);
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  if (isNative) {
    try {
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

      // 1. Write PNG file into Cache directory (safe, temporary, no special permissions required)
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
      });

      const fileUri = writeResult.uri;

      // 2. On Android, also persist to Documents for direct user file access
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
      }

      // 3. Open native share sheet (on iOS provides "Save Image" to Photos, AirDrop; on Android provides Photos, Drive, Telegram, WhatsApp)
      if (triggerShareModal) {
        try {
          await Share.share({
            title: `CBE Receipt ${txId}`,
            text: `Commercial Bank of Ethiopia Transaction Receipt #${txId}`,
            files: [fileUri],
            dialogTitle: 'Share or Save Receipt',
          });
        } catch (shareErr: any) {
          // User cancelling the share sheet is normal
          if (
            shareErr?.name === 'AbortError' ||
            shareErr?.message?.includes('canceled') ||
            shareErr?.message?.includes('cancelled')
          ) {
            return { saved: true, fileUri };
          }
          console.warn('Native share dialog warning:', shareErr);
        }
      }

      return { saved: true, fileUri };
    } catch (nativeErr) {
      console.error('Native Capacitor save error:', nativeErr);
      throw nativeErr;
    }
  } else {
    // Browser / PWA environment
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: 'image/png' });

      // 1. Web Share API with file support
      let shared = false;
      if (triggerShareModal && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'CBE Receipt',
            text: `Commercial Bank of Ethiopia Transaction Receipt #${txId}`,
          });
          shared = true;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') {
            return { saved: true };
          }
        }
      }

      // 2. Browser file download fallback
      const blobUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      setTimeout(() => {
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(blobUrl);
      }, 3000);

      // 3. Clipboard copy fallback
      if (navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        } catch {}
      }

      return { saved: true };
    } catch (browserErr) {
      console.error('Browser save error:', browserErr);
      throw browserErr;
    }
  }
}

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import html2canvas from 'html2canvas-pro';
import { LocalDb, DEFAULT_CBE_LOGO } from '../lib/mockData';
import { CBE_DEFAULT_LOGO_BASE64 } from '../assets/cbeLogoBase64';

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

  // If already a base64 data URL, ensure it is decoded
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
 * Captures ONLY the existing rendered receipt DOM element.
 * Waits for full render, images (including CBE logo), SVGs, QR code, and fonts
 * before taking a crisp, high-resolution PNG using html2canvas-pro.
 */
export async function captureReceiptElement(element: HTMLElement): Promise<string> {
  // 1. Wait until receipt is fully rendered and pending microtasks / layout complete
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  // 2. Wait for all images inside the receipt container to finish loading and inline them as Data URLs
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
          setTimeout(resolve, 600);
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

  // 4. Determine high-resolution pixel ratio (2x-3x: sharp on Retina/mobile without memory overflow)
  const rawDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2;
  const pixelRatio = Math.min(3, Math.max(2, rawDpr));

  const isExcluded = (node: Element): boolean => {
    return (
      node.getAttribute('data-screenshot-exclude') === 'true' ||
      node.getAttribute('data-html2canvas-ignore') === 'true' ||
      node.id === 'receipt-status-bar' ||
      node.id === 'btn-top-screenshot'
    );
  };

  // 5. Capture existing rendered receipt DOM element using html2canvas-pro
  try {
    const canvas = await html2canvas(element, {
      scale: pixelRatio,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#68137e',
      logging: false,
      imageTimeout: 10000,
      ignoreElements: isExcluded,
      onclone: (clonedDoc: Document) => {
        // Ensure any status bar or action buttons in the cloned tree are strictly hidden
        const excludedNodes = clonedDoc.querySelectorAll(
          '[data-screenshot-exclude="true"], [data-html2canvas-ignore="true"], #receipt-status-bar, #btn-top-screenshot'
        );
        excludedNodes.forEach((node) => {
          (node as HTMLElement).style.display = 'none';
        });

        // Ensure all images in clone use their assigned inlined src
        const clonedImgs = clonedDoc.querySelectorAll('img');
        clonedImgs.forEach((clonedImg) => {
          if (!clonedImg.src || clonedImg.src.includes('custom-bank-logo')) {
            clonedImg.src = CBE_DEFAULT_LOGO_BASE64;
          }
        });
      },
    });

    return canvas.toDataURL('image/png');
  } catch (primaryErr) {
    console.warn('[ScreenshotService] html2canvas-pro primary capture note, retrying with fallback options:', primaryErr);
    
    // Fallback: html2canvas with taint allowed and 2x scale
    const fallbackCanvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#68137e',
      logging: false,
      ignoreElements: isExcluded,
    });
    return fallbackCanvas.toDataURL('image/png');
  }
}

/**
 * Cross-platform save and share workflow.
 * Works on Android (Capacitor), iOS (Capacitor), and Browser / PWA.
 * Never throws fatal exceptions to UI - guarantees receipt stays visible and preview works.
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
    // Browser / PWA environment
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: 'image/png' });

      // 1. Web Share API with file support (if supported and allowed)
      let shared = false;
      if (triggerShareModal && typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'CBE Receipt',
            text: `Commercial Bank of Ethiopia Transaction Receipt #${txId}`,
          });
          shared = true;
        } catch (shareErr: any) {
          // Normal user cancel or iframe restriction
          console.log('Web share note:', shareErr);
        }
      }

      // 2. Browser file download fallback
      try {
        const blobUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = filename;
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

      // 3. Clipboard copy fallback
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        } catch {}
      }

      return { saved: true };
    } catch (browserErr) {
      console.warn('Browser save note:', browserErr);
      return { saved: true };
    }
  }
}

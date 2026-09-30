import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';

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
 * Captures ONLY the existing rendered receipt DOM element.
 * Waits for full render, images, SVGs, QR code, and fonts before taking a high-res PNG.
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

      // Convert remote/relative image source to data URL so html2canvas and html-to-image render it 100% reliably
      if (img.complete && img.naturalWidth > 0 && img.src && !img.src.startsWith('data:')) {
        try {
          const offCanvas = document.createElement('canvas');
          offCanvas.width = img.naturalWidth;
          offCanvas.height = img.naturalHeight;
          const offCtx = offCanvas.getContext('2d');
          if (offCtx) {
            offCtx.drawImage(img, 0, 0);
            const inlinedSrc = offCanvas.toDataURL('image/png');
            img.src = inlinedSrc;
          }
        } catch {
          // If canvas was tainted, try fetching blob
          try {
            const resp = await fetch(img.src);
            const blob = await resp.blob();
            const reader = new FileReader();
            await new Promise<void>((res) => {
              reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                  img.src = reader.result;
                }
                res();
              };
              reader.onerror = () => res();
              reader.readAsDataURL(blob);
            });
          } catch (fetchErr) {
            console.warn('[ScreenshotService] Could not inline image:', img.src, fetchErr);
          }
        }
      }
    })
  );

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

  // Primary capture: html2canvas with scale and ignore rules
  try {
    const canvas = await html2canvas(element, {
      scale: pixelRatio,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#68137e',
      logging: false,
      imageTimeout: 10000,
      ignoreElements: isExcluded,
    });
    return canvas.toDataURL('image/png');
  } catch (canvasErr) {
    console.warn('html2canvas capture warning, falling back to html-to-image toPng:', canvasErr);
    // Fallback: html-to-image toPng
    return await toPng(element, {
      pixelRatio,
      quality: 1,
      backgroundColor: '#68137e',
      filter: (node) => {
        if (node instanceof HTMLElement) {
          return !isExcluded(node);
        }
        return true;
      },
    });
  }
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

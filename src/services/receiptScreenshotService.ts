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
export async function captureReceiptElement(element: HTMLElement): Promise<string> {
  // 1. Capture initial scroll position of scroll wrapper so we can restore it afterwards
  const scrollWrapper = document.getElementById('receipt-screen-wrapper') || 
                        element.closest('.overflow-y-auto') || 
                        element.parentElement;
  const initialScrollTop = scrollWrapper ? scrollWrapper.scrollTop : window.scrollY;

  // Temporarily reset scroll to 0 for flawless viewport bounding calculation
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

  // 5. Measure full content bounds
  const rect = element.getBoundingClientRect();
  const isExactTarget = element.id === 'cbe-screenshot-exact-target';
  const fullWidth = isExactTarget 
    ? (parseInt(element.style.width, 10) || element.offsetWidth || 412)
    : Math.max(element.scrollWidth, element.offsetWidth, Math.ceil(rect.width), 360);
  const fullHeight = isExactTarget
    ? (parseInt(element.style.height, 10) || element.offsetHeight || 915)
    : Math.max(element.scrollHeight, element.offsetHeight, Math.ceil(rect.height), 700);

  // Safe pixel ratio for mobile devices (2.0x is razor-sharp without exceeding Android canvas memory limits)
  const rawDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2;
  const pixelRatio = Math.min(2.5, Math.max(2, rawDpr));

  const isExcluded = (node: Element): boolean => {
    return (
      node.getAttribute('data-screenshot-exclude') === 'true' ||
      node.getAttribute('data-screenshot-temporary') === 'true' ||
      node.id === 'btn-top-screenshot'
    );
  };

  try {
    const canvas = await html2canvas(element, {
      scale: pixelRatio,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 15000,
      scrollX: 0,
      scrollY: 0,
      width: fullWidth,
      height: fullHeight,
      windowWidth: fullWidth,
      windowHeight: fullHeight,
      ignoreElements: isExcluded,
      onclone: (clonedDoc: Document, clonedElement: HTMLElement) => {
        // Reset scroll position on clone
        clonedDoc.defaultView?.scrollTo(0, 0);
        
        // Ensure root and body do not constrain layout in clone and use white background
        if (clonedDoc.documentElement) {
          clonedDoc.documentElement.style.overflow = 'visible';
          clonedDoc.documentElement.style.height = 'auto';
          clonedDoc.documentElement.style.backgroundColor = '#ffffff';
        }
        if (clonedDoc.body) {
          clonedDoc.body.style.overflow = 'visible';
          clonedDoc.body.style.height = 'auto';
          clonedDoc.body.style.backgroundColor = '#ffffff';
        }

        const clonedWrapper = clonedDoc.getElementById('receipt-screen-wrapper');
        if (clonedWrapper) {
          clonedWrapper.scrollTop = 0;
          clonedWrapper.scrollLeft = 0;
          clonedWrapper.style.overflow = 'visible';
          clonedWrapper.style.height = 'auto';
          clonedWrapper.style.maxHeight = 'none';
        }

        // Expand clonedElement to full content height with zero clipping
        clonedElement.style.overflow = 'visible';
        clonedElement.style.height = 'auto';
        clonedElement.style.minHeight = '100%';
        clonedElement.style.maxHeight = 'none';
        clonedElement.style.transform = 'none';

        // Copy all style and link tags from main document to cloned document
        try {
          const mainStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
          mainStyles.forEach((styleTag) => {
            clonedDoc.head.appendChild(styleTag.cloneNode(true));
          });
        } catch {}

        if (clonedElement.id === 'cbe-screenshot-exact-target') {
          // Hide all other elements in body without removing style or link tags
          Array.from(clonedDoc.body.children).forEach((child) => {
            if (child !== clonedElement && !['style', 'link'].includes(child.tagName.toLowerCase())) {
              (child as HTMLElement).style.display = 'none';
            }
          });
          clonedElement.style.position = 'static';
          clonedElement.style.top = '0';
          clonedElement.style.left = '0';
          clonedElement.style.zIndex = '1';
          clonedElement.style.opacity = '1';
          clonedElement.style.width = `${fullWidth}px`;
          clonedElement.style.height = `${fullHeight}px`;
          clonedElement.style.minHeight = `${fullHeight}px`;
          clonedElement.style.maxHeight = `${fullHeight}px`;
          clonedElement.style.margin = '0';
          clonedElement.style.padding = '0';
          clonedElement.style.boxSizing = 'border-box';
          clonedElement.style.backgroundColor = '#ffffff';
          clonedDoc.body.style.width = `${fullWidth}px`;
          clonedDoc.body.style.height = `${fullHeight}px`;
          clonedDoc.body.style.backgroundColor = '#ffffff';
          clonedDoc.body.style.margin = '0';
          clonedDoc.body.style.padding = '0';
          clonedDoc.body.style.overflow = 'hidden';
          if (clonedDoc.documentElement) {
            clonedDoc.documentElement.style.width = `${fullWidth}px`;
            clonedDoc.documentElement.style.height = `${fullHeight}px`;
            clonedDoc.documentElement.style.margin = '0';
            clonedDoc.documentElement.style.padding = '0';
            clonedDoc.documentElement.style.overflow = 'hidden';
          }
        }

        // Ensure white sheet container does not clip or shrink and has clean white bottom
        const whiteSheet = clonedElement.querySelector('.bg-white');
        if (whiteSheet) {
          (whiteSheet as HTMLElement).style.overflow = 'visible';
          (whiteSheet as HTMLElement).style.height = 'auto';
          (whiteSheet as HTMLElement).style.backgroundColor = '#ffffff';
        }

        // Only restore action buttons if capturing live on-screen view
        if (clonedElement.id !== 'cbe-screenshot-exact-target') {
          const bottomBar = clonedDoc.getElementById('cbe-receipt-bottom-actions-container');
          if (bottomBar) {
            bottomBar.style.display = 'block';
            bottomBar.style.visibility = 'visible';
            bottomBar.style.opacity = '1';
          }
        }

        // Only hide temporary trigger buttons or overlays
        const temporaryNodes = clonedDoc.querySelectorAll(
          '[data-screenshot-exclude="true"], [data-screenshot-temporary="true"], #btn-top-screenshot'
        );
        temporaryNodes.forEach((node) => {
          (node as HTMLElement).style.display = 'none';
        });

        // Ensure all images in clone use their assigned inlined src
        const clonedImgs = clonedDoc.querySelectorAll('img');
        clonedImgs.forEach((clonedImg) => {
          if (!clonedImg.src || clonedImg.src.includes('custom-bank-logo') || clonedImg.src.includes('cbe-gold-logo')) {
            clonedImg.src = CBE_DEFAULT_LOGO_BASE64;
          }
        });
      },
    });

    // Sanity check: Ensure top header has authentic CBE purple color (#70189F)
    // If Android or mobile browser dropped CSS (rendering white unstyled text), reject so canvas fallback runs!
    const ctx = canvas.getContext('2d');
    if (ctx) {
      try {
        const sample = ctx.getImageData(Math.round(canvas.width / 2), Math.round(25 * pixelRatio), 1, 1).data;
        // CBE purple: r: 112, g: 24, b: 159
        const isPurple = sample[0] > 60 && sample[0] < 160 && sample[1] < 60 && sample[2] > 110 && sample[3] > 200;
        if (!isPurple) {
          console.warn('[ScreenshotService] Detected unstyled capture (missing CBE purple header), rejecting for canvas fallback');
          throw new Error('Unstyled capture detected: missing purple header');
        }
      } catch (checkErr) {
        if (checkErr instanceof Error && checkErr.message.includes('Unstyled capture')) {
          throw checkErr;
        }
      }
    }

    const dataUrl = canvas.toDataURL('image/png');
    if (dataUrl && dataUrl.length > 1000) {
      return dataUrl;
    }
    throw new Error('html2canvas canvas data was empty');
  } catch (primaryErr) {
    console.warn('[ScreenshotService] html2canvas-pro capture retry with standard options:', primaryErr);
    
    // Fallback: html2canvas with standard options and white background
    try {
      const fallbackCanvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        ignoreElements: isExcluded,
      });
      return fallbackCanvas.toDataURL('image/png');
    } catch (fallbackErr) {
      console.error('[ScreenshotService] All capture methods failed:', fallbackErr);
      throw fallbackErr;
    }
  } finally {
    // Restore user scroll position so viewport does not jump
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
    // Browser / PWA environment (Android Chrome, iOS Safari, etc.)
    try {
      const blob = dataUrlToBlob(dataUrl);
      const file = new File([blob], filename, { type: 'image/png' });

      // 1. Web Share API with file support (works on Android Chrome and iOS Safari when user gesture is present)
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
          console.log('Web share note (falling back to download):', shareErr);
        }
      }

      // 2. Direct browser file download (Saves directly to Android Downloads/Gallery and iOS Files/Photos)
      try {
        const blobUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = filename;
        downloadLink.target = '_blank';
        downloadLink.rel = 'noopener noreferrer';
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

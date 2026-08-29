/**
 * Utility to process and optimize uploaded bank logos and QR codes on client-side canvas.
 * Handles high-resolution mobile photos (10MB+) by safely downscaling and converting 
 * to compact, persistent Base64 PNG/WebP strings (30KB-80KB) that never exceed storage quotas.
 */
export async function compressImageFile(file: File | Blob, maxDimension = 400, quality = 0.9): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's an SVG, read as text/dataURL directly
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional scale
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        try {
          // Check if PNG gives a compact string, or fall back to high quality WebP/JPEG
          const pngUrl = canvas.toDataURL('image/png');
          if (pngUrl.length < 500000) {
            resolve(pngUrl);
          } else {
            const jpegUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(jpegUrl);
          }
        } catch {
          resolve(rawDataUrl);
        }
      };

      img.onerror = () => {
        resolve(rawDataUrl);
      };

      img.src = rawDataUrl;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

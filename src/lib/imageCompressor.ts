/**
 * Client-side WebP Image Compressor & Thumbnail Generator (Section 3 & Phase 4)
 * - Compresses uploaded images automatically in the browser before upload/storage
 * - Max width: 1600px (or compact 900px for Firestore inline fallback), Quality: 0.8, Format: WebP
 * - Generates a lightweight thumbnail (400px width, WebP)
 */

export interface CompressedImageResult {
  fullWebpDataUrl: string;
  thumbnailWebpDataUrl: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  width: number;
  height: number;
}

function resizeAndEncodeWebP(
  img: HTMLImageElement,
  maxWidth: number,
  quality: number
): { dataUrl: string; width: number; height: number } {
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('تعذر تهيئة معالج الصور في المتصفح');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  // Encode as WebP with specified quality (0.8)
  let dataUrl = canvas.toDataURL('image/webp', quality);
  if (!dataUrl.startsWith('data:image/webp')) {
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  return { dataUrl, width, height };
}

export async function compressImageFileToWebP(
  file: File,
  maxWidth = 1200,
  quality = 0.8
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ملف الصورة غير صالح'));
      img.onload = () => {
        try {
          const full = resizeAndEncodeWebP(img, maxWidth, quality);
          const thumb = resizeAndEncodeWebP(img, 400, 0.72);

          const originalSizeKB = Math.round(file.size / 1024);
          const compressedSizeKB = Math.round((full.dataUrl.length * 3) / 4 / 1024);

          resolve({
            fullWebpDataUrl: full.dataUrl,
            thumbnailWebpDataUrl: thumb.dataUrl,
            originalSizeKB,
            compressedSizeKB,
            width: full.width,
            height: full.height,
          });
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

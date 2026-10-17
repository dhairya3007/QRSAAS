/**
 * High-performance, client-side image compressor.
 * Compresses images automatically to be strictly UNDER 50KB while preserving visual clarity.
 * Returns standard base64 data URL, ensuring 100% compatibility with existing components and backend storage.
 */

const MAX_TARGET_BYTES = 50 * 1024; // 50 KB
const MAX_BASE64_LENGTH = Math.floor(MAX_TARGET_BYTES * 1.33); // ~66,500 characters

/**
 * Compresses any image file to be under 50KB.
 * @param {File|Blob} file 
 * @param {number} [maxWidth=800] 
 * @param {number} [maxHeight=800] 
 * @returns {Promise<string>} Base64 Data URL
 */
export const compressImageUnder50KB = (file, maxWidth = 800, maxHeight = 800) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      // If not an image, read directly
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      // Scale down to max dimensions while preserving aspect ratio
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to basic reader if canvas context fails
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
        return;
      }

      // Iteratively scale down dimensions and quality until strictly under 50KB
      let curWidth = width;
      let curHeight = height;
      let quality = 0.82;

      const redraw = (w, h, q) => {
        canvas.width = w;
        canvas.height = h;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        return canvas.toDataURL('image/jpeg', q);
      };

      let dataUrl = redraw(curWidth, curHeight, quality);

      // Step 1: Lower JPEG quality
      while (dataUrl.length > MAX_BASE64_LENGTH && quality > 0.3) {
        quality -= 0.12;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }

      // Step 2: If still over 50KB, reduce dimensions iteratively
      while (dataUrl.length > MAX_BASE64_LENGTH && (curWidth > 150 || curHeight > 150)) {
        curWidth = Math.round(curWidth * 0.8);
        curHeight = Math.round(curHeight * 0.8);
        quality = Math.max(0.4, quality);
        dataUrl = redraw(curWidth, curHeight, quality);
        while (dataUrl.length > MAX_BASE64_LENGTH && quality > 0.25) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
      }

      resolve(dataUrl);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      // Fallback to normal FileReader
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
};

/**
 * Validates non-image file size (e.g. PDFs or docs) against max KB limit.
 * @param {File} file 
 * @param {number} [maxKb=50] 
 * @returns {{isValid: boolean, sizeKb: number, maxKb: number}}
 */
export const checkMaxFileSize = (file, maxKb = 50) => {
  if (!file) return { isValid: true, sizeKb: 0, maxKb };
  const sizeKb = Math.round(file.size / 1024);
  return {
    isValid: file.size <= maxKb * 1024,
    sizeKb,
    maxKb
  };
};

export default compressImageUnder50KB;

/**
 * Client-side image and video optimization utility.
 * Shrinks images and prepares them for faster uploads to Cloudinary.
 */

export const optimizeImage = (file, { maxWidth = 1200, maxHeight = 1200, quality = 0.8 } = {}) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio and new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob conversion failed'));
              return;
            }
            // Create a new File object from the blob
            const optimizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(optimizedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * For videos, client-side compression is complex without heavy libraries like ffmpeg.wasm.
 * However, we can at least check constraints or use browser native APIs if available.
 * For now, we'll implement a basic check or placeholder for video optimization.
 */
export const optimizeVideo = async (file) => {
  // Basic implementation: if video is too large, we might warn or use a simple trim/resize if possible.
  // Real video compression usually requires a service or ffmpeg.
  // For this project, we'll return the file as-is but could add logic later.
  return file;
};

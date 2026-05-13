import { cloudinary } from '../middleware/upload.js';

/**
 * Upload a buffer directly to Cloudinary via a stream.
 * Returns the secure URL of the uploaded asset.
 */
export const uploadBufferToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });

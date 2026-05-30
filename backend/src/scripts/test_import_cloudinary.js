import { uploadBufferToCloudinary } from '../services/cloudinary.service.js';
import { cloudinary } from '../middleware/upload.js';

console.log('cloudinary:', typeof cloudinary);
console.log('cloudinary.uploader:', typeof cloudinary.uploader);
console.log('uploadBufferToCloudinary:', typeof uploadBufferToCloudinary);
process.exit(0);

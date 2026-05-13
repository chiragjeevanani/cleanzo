import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Verify file magic bytes to prevent MIME-type spoofing
const isValidImageBuffer = (buf) => {
  if (!buf || buf.length < 12) return false;
  const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
  const isPng  = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
  const isWebP = buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
              && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;
  return isJpeg || isPng || isWebP;
};

// Middleware: run after multer, validates magic bytes on req.file / req.files
export const validateImageBytes = (req, res, next) => {
  const files = req.files
    ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat())
    : (req.file ? [req.file] : []);

  for (const file of files) {
    if (!isValidImageBuffer(file.buffer)) {
      return res.status(400).json({ success: false, message: 'Invalid image file — file content does not match its type.' });
    }
  }
  next();
};

// We use memory storage so we can upload a stream to Cloudinary directly from memory
const storage = multer.memoryStorage();

// ── General task photo upload ───────────────────────
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, png, webp) are allowed'));
    }
  },
});

// ── KYC document upload ─────────────────────────────
export const kycUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for KYC'));
    }
  },
});

export { cloudinary };



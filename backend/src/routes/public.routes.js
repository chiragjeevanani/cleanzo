import { Router } from 'express';
import { upload, cloudinary } from '../middleware/upload.js';
import asyncHandler from '../utils/asyncHandler.js';
import CleanerApplication from '../models/CleanerApplication.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

// Helper to upload buffer to Cloudinary
const uploadBufferToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
};

/**
 * POST /api/public/cleaner-apply
 * Public endpoint for new cleaner applications
 */
router.post('/cleaner-apply', upload.fields([
  { name: 'livePhoto', maxCount: 1 },
  { name: 'aadhaarPhoto', maxCount: 1 },
  { name: 'panPhoto', maxCount: 1 }
]), asyncHandler(async (req, res) => {
  const { 
    name, phone, email, age, city, 
    fatherName, permanentAddress, currentAddress,
    referenceName, referencePhone 
  } = req.body;

  // Simple validation
  if (!name || !phone || !age || !city) {
    throw new ApiError(400, 'Missing required fields');
  }

  const kyc = {};
  if (req.files) {
    const uploadPromises = [];
    
    if (req.files.livePhoto) {
      uploadPromises.push(
        uploadBufferToCloudinary(req.files.livePhoto[0].buffer, 'cleanzo/public_kyc')
          .then(url => kyc.livePhoto = url)
      );
    }
    if (req.files.aadhaarPhoto) {
      uploadPromises.push(
        uploadBufferToCloudinary(req.files.aadhaarPhoto[0].buffer, 'cleanzo/public_kyc')
          .then(url => kyc.aadhaarPhoto = url)
      );
    }
    if (req.files.panPhoto) {
      uploadPromises.push(
        uploadBufferToCloudinary(req.files.panPhoto[0].buffer, 'cleanzo/public_kyc')
          .then(url => kyc.panPhoto = url)
      );
    }
    
    await Promise.all(uploadPromises);
  }

  const application = await CleanerApplication.create({
    name, phone, email, age, city,
    fatherName, permanentAddress, currentAddress,
    localReference: { name: referenceName, phone: referencePhone },
    kyc
  });

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully. We will contact you soon.',
    applicationId: application._id
  });
}));

export default router;

import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import asyncHandler from '../utils/asyncHandler.js';
import CleanerApplication from '../models/CleanerApplication.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadBufferToCloudinary } from '../services/cloudinary.service.js';

const router = Router();

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

  if (!name || !phone || !age || !city) {
    throw new ApiError(400, 'Missing required fields: name, phone, age, and city are required');
  }
  if (!/^\d{10}$/.test(phone)) {
    throw new ApiError(400, 'Phone must be exactly 10 digits');
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'Invalid email format');
  }
  const ageNum = parseInt(age, 10);
  if (isNaN(ageNum) || ageNum < 18 || ageNum > 65) {
    throw new ApiError(400, 'Age must be between 18 and 65');
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

/**
 * GET /api/public/settings
 * Returns public-facing settings (trial price, etc.)
 */
router.get('/settings', asyncHandler(async (req, res) => {
  const { default: Settings } = await import('../models/Settings.js');
  const [trialSetting, prioritySetting] = await Promise.all([
    Settings.findOne({ key: 'trialPrice' }),
    Settings.findOne({ key: 'prioritySlotFee' }),
  ]);
  res.json({
    success: true,
    trialPrice: trialSetting?.value ?? 30,
    prioritySlotFee: prioritySetting?.value ?? 99,
  });
}));

export default router;

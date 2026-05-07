import Cleaner from '../models/Cleaner.js';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { v2 as cloudinary } from 'cloudinary';


// ─── PROFILE ─────────────────────────────────────
export const getProfile = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, assignedArea } = req.body;
  const cleaner = await Cleaner.findByIdAndUpdate(req.user._id, { name, email, assignedArea }, { new: true });
  res.json({ success: true, user: cleaner });
});

export const toggleAvailability = asyncHandler(async (req, res) => {
  const cleaner = await Cleaner.findById(req.user._id);
  cleaner.isAvailable = !cleaner.isAvailable;
  await cleaner.save();
  res.json({ success: true, isAvailable: cleaner.isAvailable });
});

// ─── TASKS ───────────────────────────────────────
export const getTodayTasks = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tasks = await Task.find({
    cleaner: req.user._id,
    date: { $gte: today, $lt: tomorrow },
  })
    .populate('vehicle', 'model number parking color')
    .populate('customer', 'name phone')
    .populate('subscription', 'package')
    .sort('scheduledTime');

  res.json({ success: true, tasks });
});

export const getTaskById = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, cleaner: req.user._id })
    .populate('vehicle', 'model number parking color type')
    .populate('customer', 'name phone addresses');
  if (!task) throw new ApiError(404, 'Task not found');
  res.json({ success: true, task });
});

export const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const allowed = ['in-progress', 'completed'];
  if (!allowed.includes(status)) throw new ApiError(400, 'Invalid status');

  const update = { status, notes };
  if (status === 'completed') {
    update.completedTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    // Update cleaner stats
    const cleaner = await Cleaner.findById(req.user._id);
    cleaner.totalCompleted += 1;
    await cleaner.save();

    // Update subscription completed days
    const task = await Task.findById(req.params.id);
    if (task) {
      const sub = await (await import('../models/Subscription.js')).default.findById(task.subscription);
      if (sub) {
        sub.completedDays += 1;
        sub.remainingDays = sub.totalDays - sub.completedDays - sub.skippedDays;
        await sub.save();
      }
    }
  }

  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, cleaner: req.user._id },
    update,
    { new: true }
  );
  if (!task) throw new ApiError(404, 'Task not found');

  // Auto-mark attendance
  if (status === 'in-progress' || status === 'completed') {
    const { default: Attendance } = await import('../models/Attendance.js');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    await Attendance.findOneAndUpdate(
      { cleaner: req.user._id, date: today },
      { 
        $setOnInsert: { checkIn: new Date() },
        status: 'present',
        $inc: { tasksCompleted: status === 'completed' ? 1 : 0 }
      },
      { upsert: true }
    );
  }

  res.json({ success: true, task });
});

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

export const uploadTaskPhotos = asyncHandler(async (req, res) => {
  const { type } = req.body; // 'before' or 'after'
  if (!req.file && (!req.files || req.files.length === 0)) throw new ApiError(400, 'No files uploaded');

  let urls = [];
  const kycFolder = 'cleanzo/tasks';

  if (req.file) {
    const url = await uploadBufferToCloudinary(req.file.buffer, kycFolder);
    urls.push(url);
  } else {
    const uploadPromises = req.files.map(f => uploadBufferToCloudinary(f.buffer, kycFolder));
    urls = await Promise.all(uploadPromises);
  }

  const updateField = type === 'before' ? 'photos.before' : 'photos.after';

  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, cleaner: req.user._id },
    { $push: { [updateField]: { $each: urls } } },
    { new: true }
  );
  if (!task) throw new ApiError(404, 'Task not found');
  res.json({ success: true, photos: task.photos });
});

// ─── HISTORY ─────────────────────────────────────
export const getHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    Task.find({ cleaner: req.user._id, status: { $in: ['completed', 'skipped'] } })
      .populate('vehicle', 'model number')
      .populate('customer', 'name')
      .sort('-date').skip(skip).limit(limit),
    Task.countDocuments({ cleaner: req.user._id, status: { $in: ['completed', 'skipped'] } }),
  ]);

  res.json({ success: true, tasks, page, totalPages: Math.ceil(total / limit), total });
});

// ─── KYC ─────────────────────────────────────────

/**
 * GET /api/cleaner/kyc
 * Returns current KYC status and submitted documents.
 */
export const getKycStatus = asyncHandler(async (req, res) => {
  const cleaner = await Cleaner.findById(req.user._id).select('kycStatus kycRejectionNote kyc');
  res.json({ success: true, kycStatus: cleaner.kycStatus, kyc: cleaner.kyc, rejectionNote: cleaner.kycRejectionNote });
});

/**
 * POST /api/cleaner/kyc
 * Files: live_photo, aadhaar, pan (multipart/form-data)
 * Uploads all 3 to Cloudinary, sets avatar = live_photo, kycStatus = 'pending'.
 */
export const submitKyc = asyncHandler(async (req, res) => {
  if (!req.files || !req.files.live_photo || !req.files.aadhaar || !req.files.pan) {
    throw new ApiError(400, 'Live photo, Aadhaar card, and PAN card are all required for KYC');
  }

  const kycFolder = `cleanzo/kyc/${req.user._id}`;
  
  const [livePhotoUrl, aadhaarUrl, panUrl] = await Promise.all([
    uploadBufferToCloudinary(req.files.live_photo[0].buffer, kycFolder),
    uploadBufferToCloudinary(req.files.aadhaar[0].buffer, kycFolder),
    uploadBufferToCloudinary(req.files.pan[0].buffer, kycFolder)
  ]);

  const cleaner = await Cleaner.findByIdAndUpdate(
    req.user._id,
    {
      avatar: livePhotoUrl,          // Live photo also becomes profile picture
      kycStatus: 'pending',
      kycRejectionNote: null,
      'kyc.livePhoto':    livePhotoUrl,
      'kyc.aadhaarPhoto': aadhaarUrl,
      'kyc.panPhoto':     panUrl,
      'kyc.submittedAt':  new Date(),
    },
    { new: true }
  ).select('kycStatus kyc avatar name');


  res.json({
    success: true,
    message: 'KYC submitted successfully. Our team will verify and activate your account within 24 hours.',
    kycStatus: cleaner.kycStatus,
    avatar: cleaner.avatar,
  });
});

// ─── ATTENDANCE & EARNINGS ───────────────────────

export const getAttendance = asyncHandler(async (req, res) => {
  const { default: Attendance } = await import('../models/Attendance.js');
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const history = await Attendance.find({
    cleaner: req.user._id,
    date: { $gte: start, $lte: end }
  }).sort('date');

  res.json({ success: true, history });
});

export const getEarnings = asyncHandler(async (req, res) => {
  const { default: Attendance } = await import('../models/Attendance.js');
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const presentDays = await Attendance.countDocuments({
    cleaner: req.user._id,
    date: { $gte: start },
    status: 'present'
  });

  const cleaner = await Cleaner.findById(req.user._id);
  const dailyRate = cleaner.dailyRate || 500;
  const totalEarnings = presentDays * dailyRate;

  res.json({ 
    success: true, 
    presentDays, 
    dailyRate, 
    totalEarnings,
    currency: 'INR'
  });
});

export const requestLeave = asyncHandler(async (req, res) => {
  const { date } = req.body;
  if (!date) throw new ApiError(400, 'Date is required');

  const leaveDate = new Date(date);
  leaveDate.setHours(0, 0, 0, 0);

  const { default: Attendance } = await import('../models/Attendance.js');
  
  // Check if already 2 leaves this month
  const start = new Date(leaveDate.getFullYear(), leaveDate.getMonth(), 1);
  const leaveCount = await Attendance.countDocuments({
    cleaner: req.user._id,
    date: { $gte: start },
    status: 'leave'
  });

  if (leaveCount >= 2) {
    throw new ApiError(400, 'Maximum 2 leaves allowed per month');
  }

  await Attendance.findOneAndUpdate(
    { cleaner: req.user._id, date: leaveDate },
    { status: 'leave' },
    { upsert: true, new: true }
  );

  res.json({ success: true, message: 'Leave marked successfully' });
});


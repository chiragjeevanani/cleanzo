import Cleaner from '../models/Cleaner.js';
import Task from '../models/Task.js';
import Subscription from '../models/Subscription.js';
import Notification from '../models/Notification.js';
import Society from '../models/Society.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uploadBufferToCloudinary } from '../services/cloudinary.service.js';
import { getISTMidnight } from '../utils/dateHelper.js';
import { syncCleanerStats } from '../utils/cleanerStats.js';
import Customer from '../models/Customer.js';
import Admin from '../models/Admin.js';
import { sendPushNotification, NOTIFICATION_LINKS } from '../services/fcm.service.js';
import LeaveRequest from '../models/LeaveRequest.js';


// ─── PROFILE ─────────────────────────────────────
export const getProfile = asyncHandler(async (req, res) => {
  await syncCleanerStats(req.user._id);
  const updatedCleaner = await Cleaner.findById(req.user._id);
  res.json({ success: true, user: updatedCleaner });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, assignedArea } = req.body;
  const cleaner = await Cleaner.findByIdAndUpdate(req.user._id, { name, email, assignedArea }, { returnDocument: 'after', runValidators: true });
  res.json({ success: true, user: cleaner });
});

export const saveFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, 'FCM token is required');
  const cleaner = await Cleaner.findById(req.user._id);
  if (!cleaner.fcmTokens.includes(token)) {
    cleaner.fcmTokens.push(token);
    if (cleaner.fcmTokens.length > 10) cleaner.fcmTokens = cleaner.fcmTokens.slice(-10);
    await cleaner.save({ validateModifiedOnly: true });
  }
  res.json({ success: true, message: 'FCM token saved' });
});

export const removeFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, 'FCM token is required');
  await Cleaner.findByIdAndUpdate(req.user._id, { $pull: { fcmTokens: token } });
  res.json({ success: true, message: 'FCM token removed' });
});


export const toggleAvailability = asyncHandler(async (req, res) => {
  const cleaner = await Cleaner.findById(req.user._id);
  cleaner.isAvailable = !cleaner.isAvailable;
  await cleaner.save({ validateModifiedOnly: true });
  res.json({ success: true, isAvailable: cleaner.isAvailable });
});

// ─── TASKS ───────────────────────────────────────
export const getTodayTasks = asyncHandler(async (req, res) => {
  const today = getISTMidnight();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const rawTasks = await Task.find({
    cleaner: req.user._id,
    date: { $gte: today, $lt: tomorrow },
  })
    .populate('vehicle', 'model number parking color')
    .populate('customer', 'firstName lastName phone')
    .populate('subscription', 'package')
    .sort('scheduledTime')
    .lean();

  // Deduplicate by vehicle — if two tasks exist for the same vehicle on the same
  // day (e.g. trial + paid subscription overlap), keep only the one with the
  // most-advanced status so the cleaner sees exactly one card per vehicle.
  // Priority: completed > in-progress > pending > others
  const statusPriority = { completed: 4, 'in-progress': 3, pending: 2 };
  const vehicleMap = new Map();
  for (const t of rawTasks) {
    const vehicleId = t.vehicle?._id?.toString() || t.vehicle?.toString();
    if (!vehicleId) continue;
    const existing = vehicleMap.get(vehicleId);
    if (!existing || (statusPriority[t.status] ?? 0) > (statusPriority[existing.status] ?? 0)) {
      vehicleMap.set(vehicleId, t);
    }
  }
  const tasks = [...vehicleMap.values()];

  res.json({ success: true, tasks });
});

export const getTaskById = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, cleaner: req.user._id })
    .populate('vehicle', 'model number parking color type')
    .populate('customer', 'firstName lastName phone addresses');
  if (!task) throw new ApiError(404, 'Task not found');
  res.json({ success: true, task });
});

export const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const allowed = ['in-progress', 'completed'];
  if (!allowed.includes(status)) throw new ApiError(400, 'Invalid status');

  // Fetch task first so we can guard against double-completion
  const task = await Task.findOne({ _id: req.params.id, cleaner: req.user._id });
  if (!task) throw new ApiError(404, 'Task not found');
  if (task.status === 'completed') throw new ApiError(400, 'Task is already completed');

  const update = { status, notes };

  if (status === 'completed') {
    update.completedTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // Apply the status update atomically first
  const updatedTask = await Task.findOneAndUpdate(
    { _id: req.params.id, cleaner: req.user._id },
    update,
    { returnDocument: 'after' }
  );

  if (status === 'completed' && updatedTask) {
    // Update cleaner stats only after confirming the task was actually updated
    await syncCleanerStats(req.user._id);

    // Update subscription completed days and nextWash
    const sub = await Subscription.findById(task.subscription);
    if (sub) {
      sub.completedDays += 1;
      // Skipped days are a customer-facing pause feature — they extend endDate and
      // must NOT reduce remaining washes. Only completed washes count against totalDays.
      sub.remainingDays = Math.max(0, sub.totalDays - sub.completedDays);

      // If no usage left (or trial limits reached), mark as Expired
      if (sub.remainingDays <= 0 || (sub.isTrial && sub.completedDays >= 1)) {
        sub.status = 'Expired';
        sub.remainingDays = 0;

        // Decrement slot count now — the midnight cron only decrements Active subs,
        // so early-expired subscriptions would never be picked up otherwise.
        if (sub.society && sub.slot) {
          try {
            await Society.updateOne(
              { _id: sub.society, slots: { $elemMatch: { slotId: sub.slot, currentCount: { $gt: 0 } } } },
              { $inc: { 'slots.$.currentCount': -1 } }
            );
          } catch (slotErr) {
            console.error('[updateTaskStatus] Failed to decrement slot count:', slotErr.message);
          }
        }
      }

      const today = getISTMidnight();
      
      const skippedTasks = await Task.find({
        subscription: sub._id,
        status: 'skipped',
        date: { $gt: today }
      }).lean();
      
      const skippedDates = new Set(skippedTasks.map(t => new Date(t.date).toDateString()));
      
      let checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() + 1); // Start checking from tomorrow
      
      for (let i = 0; i < 30; i++) {
        if (!skippedDates.has(checkDate.toDateString())) {
          sub.nextWash = checkDate;
          break;
        }
        checkDate.setDate(checkDate.getDate() + 1);
      }

      await sub.save({ validateModifiedOnly: true });
    }
  }

  // Auto-mark attendance on first action of the day
  const { default: Attendance } = await import('../models/Attendance.js');
  const today = getISTMidnight();
  await Attendance.findOneAndUpdate(
    { cleaner: req.user._id, date: today },
    {
      $setOnInsert: { checkIn: new Date() },
      $set: { status: 'present' },
      $inc: { tasksCompleted: status === 'completed' ? 1 : 0 },
    },
    { upsert: true }
  );

  // ── Push Notification: task completed → notify customer ──
  if (status === 'completed' && updatedTask) {
    try {
      const cleanerName = req.user.name || 'Your cleaner';
      const customerDoc = await Customer.findById(task.customer).select('fcmTokens');
      if (customerDoc?.fcmTokens?.length) {
        sendPushNotification(customerDoc.fcmTokens, {
          title: '✅ Car Clean Complete!',
          body: `${cleanerName} has finished cleaning your car.`,
          data: { type: 'task_completed', link: NOTIFICATION_LINKS.task_completed },
        }).catch(() => {});
      }
    } catch { /* non-fatal */ }
  }

  res.json({ success: true, task: updatedTask });
});


export const uploadTaskPhotos = asyncHandler(async (req, res) => {
  const { type, notes } = req.body; // 'before' or 'after'
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

  // Build the update object — always push photos, optionally save notes
  const updateObj = { $push: { [updateField]: { $each: urls } } };
  if (notes && notes.trim()) {
    updateObj.$set = { notes: notes.trim() };
  }

  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, cleaner: req.user._id },
    updateObj,
    { returnDocument: 'after' }
  );
  if (!task) throw new ApiError(404, 'Task not found');
  res.json({ success: true, photos: task.photos, notes: task.notes });
});

// ─── HISTORY ─────────────────────────────────────
export const getHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    Task.find({ cleaner: req.user._id, status: { $in: ['completed', 'skipped'] } })
      .populate('vehicle', 'model number')
      .populate('customer', 'name')
      .sort('-date').skip(skip).limit(limit)
      .lean(),
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
    { returnDocument: 'after' }
  ).select('kycStatus kyc avatar name');

  // ── Push Notification to Admin: KYC submitted ──
  try {
    const admins = await Admin.find({ fcmTokens: { $exists: true, $ne: [] } }).select('fcmTokens');
    const adminTokens = admins.flatMap(a => a.fcmTokens || []);
    if (adminTokens.length) {
      sendPushNotification(adminTokens, {
        title: '📋 New KYC Submitted',
        body: `${cleaner.name || 'A cleaner'} has submitted KYC for review.`,
        data: { type: 'kyc_submitted', link: NOTIFICATION_LINKS.kyc_submitted },
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to send KYC submission push notification:', err.message);
  }

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
  const year = parseInt(req.query.year) || now.getFullYear();
  const month = parseInt(req.query.month); // 0-indexed
  const targetMonth = (!isNaN(month) && month >= 0 && month <= 11) ? month : now.getMonth();
  const start = new Date(year, targetMonth, 1);
  const end = new Date(year, targetMonth + 1, 0);

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
  const { default: Settings } = await import('../models/Settings.js');
  const globalSetting = await Settings.findOne({ key: 'globalCleanerPayoutRate' });
  const globalRate = globalSetting ? globalSetting.value : 500;
  const dailyRate = (cleaner.dailyRate !== undefined && cleaner.dailyRate !== null) ? cleaner.dailyRate : globalRate;
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
  const { date, reason } = req.body;
  if (!date) throw new ApiError(400, 'Date is required');

  const leaveDate = getISTMidnight(date);
  const today = getISTMidnight();
  // Require at least 1 day advance notice — same-day leave is rejected because the
  // 4 AM cron has already created and assigned tasks for today.
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (leaveDate < tomorrow) {
    throw new ApiError(400, 'Leave must be requested at least 1 day in advance');
  }

  // Check if there is already a pending or approved request for this date
  const existingRequest = await LeaveRequest.findOne({
    cleaner: req.user._id,
    date: leaveDate
  });

  if (existingRequest) {
    if (existingRequest.status === 'pending') {
      throw new ApiError(400, 'You already have a pending leave request for this date');
    }
    if (existingRequest.status === 'approved') {
      throw new ApiError(400, 'Leave has already been approved for this date');
    }
    // If rejected, they can re-apply if needed, so we'll delete/overwrite or update it
    if (existingRequest.status === 'rejected') {
      existingRequest.status = 'pending';
      existingRequest.reason = reason || '';
      existingRequest.rejectionReason = undefined;
      await existingRequest.save();
      return res.json({ success: true, message: 'Leave request submitted successfully' });
    }
  }

  // Use UTC methods because leaveDate is stored as UTC midnight (IST day boundary).
  // Using local getMonth/getFullYear would give wrong month on servers not in IST.
  const year = leaveDate.getUTCFullYear();
  const month = leaveDate.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  const activeLeaveRequestsCount = await LeaveRequest.countDocuments({
    cleaner: req.user._id,
    date: { $gte: start, $lt: end },
    status: { $in: ['pending', 'approved'] }
  });

  if (activeLeaveRequestsCount >= 2) {
    throw new ApiError(400, 'Maximum 2 leaves allowed per month');
  }

  await LeaveRequest.create({
    cleaner: req.user._id,
    date: leaveDate,
    reason: reason || '',
    status: 'pending'
  });

  res.json({ success: true, message: 'Leave request submitted successfully' });
});

export const getLeaveRequestHistory = asyncHandler(async (req, res) => {
  const history = await LeaveRequest.find({ cleaner: req.user._id }).sort('-date');
  res.json({ success: true, history });
});

export const getActiveLeave = asyncHandler(async (req, res) => {
  const today = getISTMidnight();
  const leave = await LeaveRequest.findOne({
    cleaner: req.user._id,
    date: { $gte: today },
    status: { $in: ['pending', 'approved'] }
  }).sort('date');
  res.json({ success: true, leave });
});



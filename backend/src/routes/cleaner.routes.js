import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { upload, kycUpload, validateImageBytes } from '../middleware/upload.js';
import * as ctrl from '../controllers/cleaner.controller.js';
import { cleanerApiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Auth first, then per-user rate limit (500 req / 15 min per cleaner ID)
router.use(protect, authorize('cleaner'));
router.use(cleanerApiLimiter);

router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.put('/availability', ctrl.toggleAvailability);

router.post('/fcm-token', ctrl.saveFcmToken);
router.delete('/fcm-token', ctrl.removeFcmToken);

router.get('/tasks', ctrl.getTodayTasks);
router.get('/tasks/today', ctrl.getTodayTasks);
router.get('/tasks/:id', ctrl.getTaskById);
router.put('/tasks/:id/status', ctrl.updateTaskStatus);
router.post('/tasks/:id/photo', upload.single('photo'), validateImageBytes, ctrl.uploadTaskPhotos);

router.get('/history', ctrl.getHistory);

// KYC routes
router.get('/kyc', ctrl.getKycStatus);
router.post(
  '/kyc',
  kycUpload.fields([
    { name: 'live_photo', maxCount: 1 },
    { name: 'aadhaar',    maxCount: 1 },
    { name: 'pan',        maxCount: 1 },
  ]),
  validateImageBytes,
  ctrl.submitKyc
);

// Attendance & Earnings
router.get('/attendance', ctrl.getAttendance);
router.get('/earnings', ctrl.getEarnings);
router.get('/leave', ctrl.getActiveLeave);
router.post('/leave', ctrl.requestLeave);
router.get('/leave/history', ctrl.getLeaveRequestHistory);


export default router;


import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/society.controller.js';

const router = Router();

// All routes require a valid society JWT
router.use(protect, authorize('society'));

router.get('/dashboard', ctrl.getDashboard);
router.get('/commissions', ctrl.getCommissions);
router.get('/payout-requests', ctrl.getPayoutRequests);
router.post('/payout-requests', ctrl.requestPayout);
router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.put('/profile/change-password', ctrl.changePassword);

router.post('/fcm-token', ctrl.saveFcmToken);
router.delete('/fcm-token', ctrl.removeFcmToken);

export default router;

import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { saveFcmToken, removeFcmToken } from '../controllers/push.controller.js';

const router = Router();

router.use(protect);

router.post('/save', saveFcmToken);
router.delete('/save', removeFcmToken);

export default router;

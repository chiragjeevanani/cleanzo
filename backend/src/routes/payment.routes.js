import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { createOrder, verifyPayment, getKey } from '../controllers/payment.controller.js';

const router = Router();

router.get('/key', getKey);
router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);

export default router;

import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { createOrder, verifyPayment, getKey, handlePaymentCallback } from '../controllers/payment.controller.js';
import { paymentApiLimiter, publicApiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/key',      publicApiLimiter,  getKey);
router.post('/create-order', protect, paymentApiLimiter, createOrder);
router.post('/verify',       protect, paymentApiLimiter, verifyPayment);
router.post('/callback', handlePaymentCallback); // unprotected Razorpay POST — no limiter

export default router;

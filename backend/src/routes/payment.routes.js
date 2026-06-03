import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { createOrder, verifyPayment, getKey, handlePaymentCallback, createPayToCleanerPayment } from '../controllers/payment.controller.js';
import { paymentApiLimiter, publicApiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/key',      publicApiLimiter,  getKey);
router.post('/create-order', protect, paymentApiLimiter, createOrder);
router.post('/verify',       protect, paymentApiLimiter, verifyPayment);
// Offline "Pay to Cleaner" checkout (used while Razorpay is flagged off)
router.post('/pay-to-cleaner', protect, paymentApiLimiter, createPayToCleanerPayment);
router.post('/callback', handlePaymentCallback); // unprotected Razorpay POST — no limiter

export default router;

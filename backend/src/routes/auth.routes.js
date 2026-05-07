import { Router } from 'express';
import { handleSendOtp, handleVerifyOtp, handlePasswordLogin, handleAdminLogin, handleRefreshToken, getMe } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import { otpLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { sendOtpSchema, verifyOtpSchema } from '../validations/auth.validation.js';

const router = Router();

router.post('/send-otp', otpLimiter, validate(sendOtpSchema), handleSendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), handleVerifyOtp);
router.post('/login-password', handlePasswordLogin);
router.post('/admin-login', handleAdminLogin);
router.post('/refresh-token', handleRefreshToken);
router.get('/me', protect, getMe);

export default router;

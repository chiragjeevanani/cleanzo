import { Router } from 'express';
import { handleSendOtp, handleVerifyOtp, handlePasswordLogin, handleAdminLogin, handleRefreshToken, handleLogout, handleForgotPassword, handleResetPassword, getMe } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import { otpLimiter, authLimiter, adminLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { sendOtpSchema, verifyOtpSchema, passwordLoginSchema } from '../validations/auth.validation.js';

const router = Router();

router.post('/send-otp', otpLimiter, validate(sendOtpSchema), handleSendOtp);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), handleVerifyOtp);
router.post('/login-password', authLimiter, validate(passwordLoginSchema), handlePasswordLogin);
router.post('/admin-login', adminLimiter, handleAdminLogin);
router.post('/refresh-token', handleRefreshToken);
router.post('/logout', handleLogout);
router.post('/forgot-password', otpLimiter, handleForgotPassword);
router.post('/reset-password', authLimiter, handleResetPassword);
router.get('/me', protect, getMe);

export default router;

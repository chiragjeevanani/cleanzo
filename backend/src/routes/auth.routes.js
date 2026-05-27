import { Router } from 'express';
import { handleSendOtp, handleVerifyOtp, handleAdminLogin, handleSocietyLogin, handleRefreshToken, handleLogout, getMe, updateMe, handleVerifyOtpSignup, handleCompleteSignup } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import { otpLimiter, authLimiter, adminLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { sendOtpSchema, verifyOtpSchema, verifyOtpSignupSchema, completeSignupSchema } from '../validations/auth.validation.js';

const router = Router();

router.post('/send-otp', otpLimiter, validate(sendOtpSchema), handleSendOtp);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), handleVerifyOtp);
router.post('/verify-otp-signup', authLimiter, validate(verifyOtpSignupSchema), handleVerifyOtpSignup);
router.post('/complete-signup', authLimiter, validate(completeSignupSchema), handleCompleteSignup);
router.post('/admin-login', adminLimiter, handleAdminLogin);
router.post('/society-login', adminLimiter, handleSocietyLogin);
router.post('/refresh-token', handleRefreshToken);
router.post('/logout', handleLogout);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);

export default router;

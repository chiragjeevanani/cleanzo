import { Router } from 'express';
import { handleSendOtp, handleVerifyOtp, handlePasswordLogin, handleAdminLogin, handleSocietyLogin, handleRefreshToken, handleLogout, handleForgotPassword, handleResetPassword, getMe, updateMe, handleVerifyOtpSignup, handleCompleteSignup } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import { otpLimiter, authLimiter, adminLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { sendOtpSchema, verifyOtpSchema, passwordLoginSchema, verifyOtpSignupSchema, completeSignupSchema } from '../validations/auth.validation.js';

const router = Router();

router.post('/send-otp', otpLimiter, validate(sendOtpSchema), handleSendOtp);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), handleVerifyOtp);
router.post('/verify-otp-signup', authLimiter, validate(verifyOtpSignupSchema), handleVerifyOtpSignup);
router.post('/complete-signup', authLimiter, validate(completeSignupSchema), handleCompleteSignup);
router.post('/login-password', authLimiter, validate(passwordLoginSchema), handlePasswordLogin);
router.post('/admin-login', adminLimiter, handleAdminLogin);
router.post('/society-login', adminLimiter, handleSocietyLogin);
router.post('/refresh-token', handleRefreshToken);
router.post('/logout', handleLogout);
router.post('/forgot-password', otpLimiter, handleForgotPassword);
router.post('/reset-password', authLimiter, handleResetPassword);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);

export default router;

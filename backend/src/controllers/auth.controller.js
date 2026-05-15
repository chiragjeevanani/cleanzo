import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Customer from '../models/Customer.js';
import Cleaner from '../models/Cleaner.js';
import Admin from '../models/Admin.js';
import Settings from '../models/Settings.js';
import RefreshToken from '../models/RefreshToken.js';
import { sendOtp, verifyOtp } from '../services/otp.service.js';
import { normalizePhone } from '../utils/helpers.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logActivity } from './admin.controller.js';

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const generateRefreshToken = (id, role) =>
  jwt.sign({ id, role, jti: crypto.randomBytes(16).toString('hex') }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });

const REFRESH_EXPIRES_MS = () => {
  const raw = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
  const match = raw.match(/^(\d+)([dh])$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const [, n, unit] = match;
  return unit === 'd' ? Number(n) * 86400000 : Number(n) * 3600000;
};

const storeRefreshToken = async (token, userId, role) => {
  await RefreshToken.create({
    token,
    user: userId,
    role,
    expiresAt: new Date(Date.now() + REFRESH_EXPIRES_MS()),
  });
};

const userResponse = (user, role) => ({
  _id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  name: user.name,
  phone: user.phone,
  email: user.email,
  role,
  city: user.city,
  referralCode: user.referralCode,
  avatar: user.avatar,
  kycStatus: user.kycStatus,
  ...(role === 'cleaner' && { kycRejectionNote: user.kycRejectionNote }),
});

const sendTokenResponse = async (user, role, res) => {
  const token = generateToken(user._id, role);
  const refreshToken = generateRefreshToken(user._id, role);
  await storeRefreshToken(refreshToken, user._id, role);

  const cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  };

  const refreshOptions = {
    ...cookieOptions,
    expires: new Date(Date.now() + REFRESH_EXPIRES_MS()),
  };

  res.cookie('token', token, cookieOptions);
  res.cookie('refreshToken', refreshToken, refreshOptions);

  return res.json({
    success: true,
    user: userResponse(user, role),
    // Fallback for non-cookie clients if any
    token,
    refreshToken,
  });
};

// ─── SEND OTP ─────────────────────────────────────
/**
 * POST /api/auth/send-otp
 * Body: { phone, role, mode: 'login'|'signup' }
 */
export const handleSendOtp = asyncHandler(async (req, res) => {
  const { phone, role, mode } = req.body;

  // Map 'crew' role to 'cleaner'
  const targetRole = role === 'crew' ? 'cleaner' : role;

  if (!['customer', 'cleaner'].includes(targetRole)) {
    throw new ApiError(400, 'Invalid role');
  }

  const normalized = normalizePhone(phone);
  let user;

  if (targetRole === 'customer') {
    user = await Customer.findOne({ phone: normalized });
  } else {
    user = await Cleaner.findOne({ phone: normalized });
  }

  // Existence checks
  if (mode === 'login' && !user) {
    return res.status(404).json({
      success: false,
      type: 'USER_NOT_FOUND',
      message: 'Account not found. Would you like to sign up instead?'
    });
  }

  if (mode === 'signup' && user) {
    return res.status(409).json({
      success: false,
      type: 'USER_ALREADY_EXISTS',
      message: 'Account already exists with this number. Please login.'
    });
  }

  const result = await sendOtp(phone, targetRole);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.message,
      ...(process.env.NODE_ENV !== 'production' && { debug: result.debug })
    });
  }

  res.json({ success: true, message: result.message });
});

// ─── VERIFY OTP & LOGIN / SIGNUP ──────────────────
/**
 * POST /api/auth/verify-otp
 * Body: { phone, code, role, firstName?, lastName?, email?, password?, city?, referralCode? }
 */
export const handleVerifyOtp = asyncHandler(async (req, res) => {
  const { phone, code, role, firstName, lastName, email, password, city, referralCode } = req.body;

  if (!phone || !code || !role) {
    throw new ApiError(400, 'Phone, code, and role are required');
  }

  // Map 'crew' to 'cleaner'
  const targetRole = role === 'crew' ? 'cleaner' : role;

  const result = await verifyOtp(phone, code, targetRole);
  if (!result.success) {
    throw new ApiError(400, result.message);
  }

  const normalized = normalizePhone(phone);
  let user;

  if (targetRole === 'customer') {
    user = await Customer.findOne({ phone: normalized });
    if (!user) {
      // New signup — all fields required
      if (!firstName || !lastName || !email || !password || !city) {
        throw new ApiError(400, 'First name, last name, email, password, and city are required for signup');
      }

      // Handle referral — load discount config from admin-controlled Settings
      let referredByCustomer = null;
      if (referralCode) {
        referredByCustomer = await Customer.findOne({ referralCode: referralCode.toUpperCase() });
      }

      const [discountSetting, expirySetting] = await Promise.all([
        Settings.findOne({ key: 'referralDiscountPercent' }),
        Settings.findOne({ key: 'referralExpiryDays' }),
      ]);
      const referralPercent = discountSetting?.value ?? 25;
      const referralExpiryDays = expirySetting?.value ?? 7;

      user = await Customer.create({
        firstName,
        lastName,
        phone: normalized,
        email,
        password,
        city,
        referredBy: referredByCustomer?._id || null,
        referralDiscount: referredByCustomer ? {
          isActive: true,
          percentage: referralPercent,
          expiresAt: new Date(Date.now() + referralExpiryDays * 24 * 60 * 60 * 1000),
        } : { isActive: false, percentage: 0 },
      });

      await logActivity({
        type: 'user_created',
        message: `New customer signed up: ${firstName} ${lastName}`,
        metadata: { userId: user._id }
      });
    }
    user.lastLogin = new Date();
    await user.save({ validateModifiedOnly: true });

  } else if (targetRole === 'cleaner') {
    user = await Cleaner.findOne({ phone: normalized });
    if (!user) {
      if (!firstName || !city) {
        throw new ApiError(400, 'First name and city are required for new crew members');
      }
      user = await Cleaner.create({
        name: `${firstName} ${lastName || ''}`.trim(),
        phone: normalized,
        city,
        email,
      });

      await logActivity({
        type: 'application_submitted',
        message: `New cleaner joined: ${user.name}`,
        metadata: { cleanerId: user._id }
      });
    }
    user.lastLogin = new Date();
    await user.save({ validateModifiedOnly: true });
  }

  await sendTokenResponse(user, targetRole, res);
});

// ─── PHONE + PASSWORD LOGIN ────────────────────────
/**
 * POST /api/auth/login-password
 * Body: { phone, password, role }
 */
export const handlePasswordLogin = asyncHandler(async (req, res) => {
  const { phone, password, role } = req.body;

  if (!phone || !password || !role) {
    throw new ApiError(400, 'Phone, password, and role are required');
  }

  const targetRole = role === 'crew' ? 'cleaner' : role;
  const normalized = normalizePhone(phone);
  let user;

  if (targetRole === 'customer') {
    user = await Customer.findOne({ phone: normalized }).select('+password');
    if (!user) throw new ApiError(404, 'No account found with this phone number');
    if (!user.password) throw new ApiError(401, 'This account uses OTP login. Please use OTP to sign in.');
    if (!(await user.comparePassword(password))) throw new ApiError(401, 'Invalid phone number or password');

  } else if (targetRole === 'cleaner') {
    user = await Cleaner.findOne({ phone: normalized }).select('+password');
    if (!user) throw new ApiError(404, 'No crew account found with this phone number');
    if (!user.password) throw new ApiError(401, 'Password not set for this account. Please use OTP login or contact your admin.');
    if (!(await user.comparePassword(password))) throw new ApiError(401, 'Invalid phone number or password');

  } else {
    throw new ApiError(400, 'Invalid role. Must be customer or crew.');
  }

  user.lastLogin = new Date();
  await user.save({ validateModifiedOnly: true });

  await sendTokenResponse(user, targetRole, res);
});

// ─── ADMIN LOGIN ───────────────────────────────────
/**
 * POST /api/auth/admin-login
 * Body: { email, password }
 */
export const handleAdminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const admin = await Admin.findOne({ email: email.toLowerCase() });
  if (!admin || !(await admin.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  admin.lastLogin = new Date();
  await admin.save({ validateModifiedOnly: true });

  await sendTokenResponse(admin, admin.role, res);
});

// ─── REFRESH TOKEN ─────────────────────────────────
/**
 * POST /api/auth/refresh-token
 * Body: { refreshToken }
 */
export const handleRefreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!refreshToken) throw new ApiError(400, 'Refresh token required');

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const stored = await RefreshToken.findOne({ token: refreshToken });
  if (!stored) throw new ApiError(401, 'Refresh token has been revoked');

  await RefreshToken.deleteOne({ _id: stored._id });

  await sendTokenResponse({ _id: decoded.id }, decoded.role, res);
});

// ─── LOGOUT ────────────────────────────────────────
/**
 * POST /api/auth/logout
 * Body: { refreshToken }
 */
export const handleLogout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (refreshToken) {
    await RefreshToken.deleteOne({ token: refreshToken });
  }

  res.clearCookie('token');
  res.clearCookie('refreshToken');

  res.json({ success: true, message: 'Logged out successfully' });
});

// ─── FORGOT PASSWORD ───────────────────────────────
/**
 * POST /api/auth/forgot-password
 * Body: { phone }
 */
export const handleForgotPassword = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) throw new ApiError(400, 'Phone number is required');

  const normalized = normalizePhone(phone);
  const customer = await Customer.findOne({ phone: normalized });
  if (!customer) throw new ApiError(404, 'No account found with this phone number');

  const result = await sendOtp(normalized, 'customer');
  if (!result.success) {
    return res.status(400).json({ success: false, message: result.message });
  }

  res.json({ success: true, message: 'OTP sent to your registered phone number' });
});

// ─── RESET PASSWORD ────────────────────────────────
/**
 * POST /api/auth/reset-password
 * Body: { phone, code, newPassword }
 */
export const handleResetPassword = asyncHandler(async (req, res) => {
  const { phone, code, newPassword } = req.body;
  if (!phone || !code || !newPassword) {
    throw new ApiError(400, 'Phone, OTP code, and new password are required');
  }
  if (newPassword.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }

  const normalized = normalizePhone(phone);
  const result = await verifyOtp(normalized, code, 'customer');
  if (!result.success) throw new ApiError(400, result.message);

  const customer = await Customer.findOne({ phone: normalized }).select('+password');
  if (!customer) throw new ApiError(404, 'Customer not found');

  customer.password = newPassword;
  await customer.save({ validateModifiedOnly: true }); // pre-save hook bcrypts the password

  res.json({ success: true, message: 'Password reset successfully. Please log in with your new password.' });
});

// ─── GET ME ────────────────────────────────────────
/**
 * GET /api/auth/me
 * Protected
 */
export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user, role: req.userRole });
});

/**
 * PUT /api/auth/me
 * Update own profile
 */
export const updateMe = asyncHandler(async (req, res) => {
  const { name, firstName, lastName, email, phone, city } = req.body;
  const role = req.userRole;
  const userId = req.user._id;

  let user;
  if (role === 'admin' || role === 'superadmin') {
    user = await Admin.findByIdAndUpdate(userId, { name, email, phone }, { new: true, runValidators: true });
  } else if (role === 'customer') {
    const update = { firstName, lastName, email, city };
    if (phone) update.phone = normalizePhone(phone);
    user = await Customer.findByIdAndUpdate(userId, update, { new: true, runValidators: true });
  } else if (role === 'cleaner') {
    const update = { name, email, city };
    if (phone) update.phone = normalizePhone(phone);
    user = await Cleaner.findByIdAndUpdate(userId, update, { new: true, runValidators: true });
  }

  if (!user) throw new ApiError(404, 'User not found');

  res.json({
    success: true,
    user: userResponse(user, role)
  });
});

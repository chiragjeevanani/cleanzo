import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Customer from '../models/Customer.js';
import Cleaner from '../models/Cleaner.js';
import Admin from '../models/Admin.js';
import { sendOtp, verifyOtp } from '../services/otp.service.js';
import { normalizePhone } from '../utils/helpers.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const generateRefreshToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });

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
  kycStatus: user.kycStatus, // Important for crew members
  kycRejectionNote: user.kycRejectionNote,
});

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

  const result = await sendOtp(phone, targetRole, mode);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.message,
      debug: result.debug
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

      // Handle referral
      let referredByCustomer = null;
      if (referralCode) {
        referredByCustomer = await Customer.findOne({ referralCode: referralCode.toUpperCase() });
      }

      user = await Customer.create({
        firstName,
        lastName,
        phone: normalized,
        email,
        password,
        city,
        referredBy: referredByCustomer?._id || null,
        // Apply referral discount if referral code is valid
        referralDiscount: referredByCustomer ? {
          isActive: true,
          percentage: 25,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        } : { isActive: false, percentage: 0 },
      });
    }
    user.lastLogin = new Date();
    await user.save();

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
    }
    user.lastLogin = new Date();
    await user.save();
  }

  const token = generateToken(user._id, targetRole);
  const refreshToken = generateRefreshToken(user._id, targetRole);

  res.json({
    success: true,
    token,
    refreshToken,
    user: userResponse(user, targetRole),
  });
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
    if (!user || !(await user.comparePassword(password))) {
      throw new ApiError(401, 'Invalid phone number or password');
    }
  } else {
    throw new ApiError(400, 'Password login is only available for customers');
  }

  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user._id, targetRole);
  const refreshToken = generateRefreshToken(user._id, targetRole);

  res.json({
    success: true,
    token,
    refreshToken,
    user: userResponse(user, targetRole),
  });
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
  await admin.save();

  const token = generateToken(admin._id, admin.role);
  const refreshToken = generateRefreshToken(admin._id, admin.role);

  res.json({
    success: true,
    token,
    refreshToken,
    user: {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  });
});

// ─── REFRESH TOKEN ─────────────────────────────────
/**
 * POST /api/auth/refresh-token
 * Body: { refreshToken }
 */
export const handleRefreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ApiError(400, 'Refresh token required');

  const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
  const token = generateToken(decoded.id, decoded.role);

  res.json({ success: true, token });
});

// ─── GET ME ────────────────────────────────────────
/**
 * GET /api/auth/me
 * Protected
 */
export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user, role: req.userRole });
});

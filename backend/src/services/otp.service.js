import axios from 'axios';
import bcrypt from 'bcryptjs';
import Otp from '../models/Otp.js';
import { normalizePhone, generateOtp } from '../utils/helpers.js';

// Dev bypass — only active in non-production environments
const DEV_BYPASS_PHONE = '9111966732';
const DEV_BYPASS_OTP = '123456';

/**
 * Send OTP via SMSIndiaHub
 */
export async function sendOtp(phone, role) {
  const normalized = normalizePhone(phone);
  const isDev = process.env.NODE_ENV !== 'production';

  // Delete any existing OTP for this phone
  await Otp.deleteMany({ phone: normalized });

  // Generate OTP (use bypass for dev phone in non-production only)
  const code = (isDev && normalized === DEV_BYPASS_PHONE) ? DEV_BYPASS_OTP : generateOtp();

  // Hash before storing
  const hashedCode = await bcrypt.hash(code, 10);

  // Save to DB with 5 min expiry
  await Otp.create({
    phone: normalized,
    code: hashedCode,
    role,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  // Skip SMS for dev bypass phone in non-production
  if (isDev && normalized === DEV_BYPASS_PHONE) {
    console.log(`[DEV OTP BYPASS] ${normalized} → ${code}`);
    return { success: true, message: 'OTP sent (bypass mode)' };
  }

  // If we are in dev and NO API key is present, just log it.
  if (!process.env.SMS_API_KEY) {
    console.log(`[DEV OTP] ${normalized} → ${code}`);
    return { success: true, message: 'OTP sent (dev mode - no API key)' };
  }

  // Send via SMSIndiaHub
  try {
    const response = await axios.get('https://cloud.smsindiahub.in/api/mt/SendSMS', {
      params: {
        user: process.env.SMS_USERNAME,
        APIKey: process.env.SMS_API_KEY,
        senderid: process.env.SMS_SENDER_ID,
        channel: 2,
        DCS: 0,
        flashsms: 0,
        number: `91${normalized}`,
        text: `Welcome to the Cleanzo powered by SMSINDIAHUB. Your OTP for registration is ${code}`,
        route: '2', // Often 2 is for Transactional
        EntityId: process.env.SMS_ENTITY_ID || '',
        TemplateId: process.env.SMS_DLT_TEMPLATE_ID,
      }
    });

    // Check if the response indicates failure
    if (response.data && response.data.ErrorCode !== '000') {
       return {
         success: false,
         message: `SMS Error: ${response.data.ErrorMessage || 'Unknown API Error'}`,
         debug: response.data
       };
    }

    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    console.error('SMSIndiaHub error:', error.message);
    return { success: false, message: `Failed to send OTP: ${error.message}` };
  }
}

/**
 * Verify OTP
 */
export async function verifyOtp(phone, code, role) {
  const normalized = normalizePhone(phone);

  const otpRecord = await Otp.findOne({ phone: normalized, role, expiresAt: { $gt: new Date() } });

  if (!otpRecord) {
    return { success: false, message: 'OTP not found or expired' };
  }

  if (otpRecord.attempts >= 5) {
    await Otp.deleteOne({ _id: otpRecord._id });
    return { success: false, message: 'Too many attempts. Please request a new OTP.' };
  }

  const isMatch = await bcrypt.compare(code, otpRecord.code);
  if (!isMatch) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    return { success: false, message: 'Invalid OTP' };
  }

  // OTP verified — delete it
  await Otp.deleteOne({ _id: otpRecord._id });
  return { success: true, message: 'OTP verified' };
}

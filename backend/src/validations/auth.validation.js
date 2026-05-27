import Joi from 'joi';

/**
 * Schema for sending OTP
 */
export const sendOtpSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone number must be exactly 10 digits.',
      'any.required': 'Phone number is required.'
    }),
  role: Joi.string()
    .valid('customer', 'crew', 'cleaner')
    .required(),
  mode: Joi.string()
    .valid('login', 'signup')
    .required()
});

/**
 * Schema for verifying OTP (and completing signup in one step)
 */
export const verifyOtpSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({ 'string.pattern.base': 'Phone number must be exactly 10 digits.' }),

  code: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required()
    .messages({ 'string.pattern.base': 'OTP must be a 6-digit number.' }),

  role: Joi.string()
    .valid('customer', 'crew', 'cleaner')
    .required(),

  // Signup-only fields (optional at schema level, controller enforces if new user)
  firstName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .optional()
    .messages({ 'string.pattern.base': 'First name should only contain letters.' }),

  lastName: Joi.string()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .optional()
    .messages({ 'string.pattern.base': 'Last name should only contain letters.' }),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .optional()
    .allow('', null),

  city: Joi.string()
    .min(2)
    .max(100)
    .optional(),

  referralCode: Joi.string()
    .max(20)
    .optional()
    .allow('', null),
});

/**
 * Schema for verifying OTP during signup flow
 */
export const verifyOtpSignupSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({ 'string.pattern.base': 'Phone number must be exactly 10 digits.' }),
  code: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required()
    .messages({ 'string.pattern.base': 'OTP must be a 6-digit number.' }),
  role: Joi.string()
    .valid('customer')
    .required(),
  firstName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .optional()
    .messages({ 'string.pattern.base': 'First name should only contain letters.' }),
  lastName: Joi.string()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .optional()
    .messages({ 'string.pattern.base': 'Last name should only contain letters.' }),
});

/**
 * Schema for completing signup after successful OTP verification
 */
export const completeSignupSchema = Joi.object({
  signupToken: Joi.string()
    .required()
    .messages({ 'any.required': 'Signup token is required.' }),
  firstName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({ 'string.pattern.base': 'First name should only contain letters.' }),
  lastName: Joi.string()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({ 'string.pattern.base': 'Last name should only contain letters.' }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({ 'any.required': 'Email is required.' }),
  city: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({ 'any.required': 'City is required.' }),
  society: Joi.string()
    .optional()
    .allow('', null),
  societyName: Joi.string()
    .optional()
    .allow('', null),
  area: Joi.string()
    .optional()
    .allow('', null),
  referralCode: Joi.string()
    .max(20)
    .optional()
    .allow('', null),
});


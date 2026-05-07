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
    .pattern(/^[0-9]{4,6}$/)
    .required()
    .messages({ 'string.pattern.base': 'OTP must be numeric.' }),

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

  password: Joi.string()
    .min(8)
    .optional()
    .messages({ 'string.min': 'Password must be at least 8 characters.' }),

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
 * Schema for phone + password login
 */
export const passwordLoginSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({ 'string.pattern.base': 'Phone number must be exactly 10 digits.' }),
  password: Joi.string().required(),
  role: Joi.string().valid('customer').required(),
});

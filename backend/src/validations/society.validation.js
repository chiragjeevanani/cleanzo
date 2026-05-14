import Joi from 'joi';

export const createSocietySchema = Joi.object({
  name: Joi.string().required().trim(),
  city: Joi.string().required().trim(),
  area: Joi.string().required().trim(),
  pincode: Joi.string().required().trim().length(6).pattern(/^[0-9]+$/),
  address: Joi.string().required().trim(),
  slots: Joi.array().items(Joi.object({
    slotId: Joi.string().required(),
    timeWindow: Joi.string().required(),
    maxVehicles: Joi.number().default(20),
    currentCount: Joi.number().default(0),
  })),
  isActive: Joi.boolean().default(true),
});

export const updateSocietySchema = Joi.object({
  name: Joi.string().trim(),
  city: Joi.string().trim(),
  area: Joi.string().trim(),
  pincode: Joi.string().trim().length(6).pattern(/^[0-9]+$/),
  address: Joi.string().trim(),
  slots: Joi.array().items(Joi.object({
    slotId: Joi.string().required(),
    timeWindow: Joi.string().required(),
    maxVehicles: Joi.number(),
    currentCount: Joi.number(),
  })),
  isActive: Joi.boolean(),
});

export const captureLeadSchema = Joi.object({
  name: Joi.string().required().trim(),
  phone: Joi.string().required().trim().pattern(/^[0-9]{10}$/),
  email: Joi.string().email().trim(),
  city: Joi.string().required().trim(),
  requestedArea: Joi.string().trim().allow(''),
  requestedSociety: Joi.string().trim().allow(''),
  pincode: Joi.string().trim().length(6).pattern(/^[0-9]+$/).allow(''),
});

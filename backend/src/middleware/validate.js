import { ApiError } from '../utils/ApiError.js';

export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message.replace(/"/g, ''))
      .join(', ');
    return next(new ApiError(400, errorMessage));
  }

  // Replace req.body with validated and sanitized value
  req.body = value;
  next();
};

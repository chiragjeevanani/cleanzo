import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import Customer from '../models/Customer.js';
import Cleaner from '../models/Cleaner.js';
import Admin from '../models/Admin.js';

/**
 * JWT authentication middleware.
 * Attaches req.user and req.userRole after verification.
 */
export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw new ApiError(401, 'Not authorized — no token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let user;
    switch (decoded.role) {
      case 'customer':
        user = await Customer.findById(decoded.id).select('-__v');
        break;
      case 'cleaner':
        user = await Cleaner.findById(decoded.id).select('-__v');
        break;
      case 'admin':
      case 'superadmin':
        user = await Admin.findById(decoded.id).select('-password -__v');
        break;
      default:
        throw new ApiError(401, 'Invalid token role');
    }

    if (!user || !user.isActive) {
      throw new ApiError(401, 'User not found or deactivated');
    }

    req.user = user;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new ApiError(401, 'Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Token expired'));
    }
    next(error);
  }
};

/**
 * Role-based access guard. Use after protect().
 * Usage: authorize('admin', 'superadmin')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return next(new ApiError(403, `Role '${req.userRole}' is not authorized`));
    }
    next();
  };
};

import Customer from '../models/Customer.js';
import Cleaner from '../models/Cleaner.js';
import Admin from '../models/Admin.js';
import PartnerSociety from '../models/PartnerSociety.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const saveFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, 'FCM token is required');

  let UserModel;
  switch (req.userRole) {
    case 'customer':
      UserModel = Customer;
      break;
    case 'cleaner':
      UserModel = Cleaner;
      break;
    case 'admin':
    case 'superadmin':
      UserModel = Admin;
      break;
    case 'society':
      UserModel = PartnerSociety;
      break;
    default:
      throw new ApiError(401, 'Invalid user role');
  }

  const user = await UserModel.findById(req.user._id);
  if (!user) throw new ApiError(404, 'User not found');

  if (!user.fcmTokens.includes(token)) {
    user.fcmTokens.push(token);
    if (user.fcmTokens.length > 10) {
      user.fcmTokens = user.fcmTokens.slice(-10);
    }
    await user.save({ validateModifiedOnly: true });
  }

  res.json({ success: true, message: 'FCM token saved' });
});

export const removeFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, 'FCM token is required');

  let UserModel;
  switch (req.userRole) {
    case 'customer':
      UserModel = Customer;
      break;
    case 'cleaner':
      UserModel = Cleaner;
      break;
    case 'admin':
    case 'superadmin':
      UserModel = Admin;
      break;
    case 'society':
      UserModel = PartnerSociety;
      break;
    default:
      throw new ApiError(401, 'Invalid user role');
  }

  await UserModel.findByIdAndUpdate(req.user._id, { $pull: { fcmTokens: token } });
  res.json({ success: true, message: 'FCM token removed' });
});

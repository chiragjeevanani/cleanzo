import Customer from '../models/Customer.js';
import Grievance from '../models/Grievance.js';
import Vehicle, { VEHICLE_PRICING } from '../models/Vehicle.js';
import Subscription from '../models/Subscription.js';
import Payment from '../models/Payment.js';
import Razorpay from 'razorpay';

let razorpay = null;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
} catch (error) {
  console.warn('Failed to initialize Razorpay in customer controller:', error.message);
}
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import Society from '../models/Society.js';
import Package from '../models/Package.js';
import Settings from '../models/Settings.js';
import Rating from '../models/Rating.js';
import Cleaner from '../models/Cleaner.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import VehicleCategory from '../models/VehicleCategory.js';
import { logActivity } from './admin.controller.js';
import { uploadBufferToCloudinary } from '../services/cloudinary.service.js';
import { clearCache } from '../middleware/cache.js';
import { getISTMidnight } from '../utils/dateHelper.js';
import { getDiscountConfig, resolvePackageDiscount } from '../utils/discount.js';
import { validateCoupon, redeemCoupon } from '../utils/coupon.js';
import PartnerSociety from '../models/PartnerSociety.js';
import SocietyCommission from '../models/SocietyCommission.js';
import { sendPushNotification, NOTIFICATION_LINKS } from '../services/fcm.service.js';
import Admin from '../models/Admin.js';
import RefreshToken from '../models/RefreshToken.js';



// ─── PROFILE ─────────────────────────────────────
export const getProfile = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.user._id).select('-__v');
  const vehicles = await Vehicle.find({ customer: req.user._id, isActive: true }).select('-__v');
  res.json({ success: true, user: customer, vehicles });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, city } = req.body;
  const update = Object.fromEntries(
    Object.entries({ firstName, lastName, email, city }).filter(([, v]) => v !== undefined && v !== '')
  );
  if (Object.keys(update).length === 0) throw new ApiError(400, 'No valid fields provided');
  const customer = await Customer.findByIdAndUpdate(req.user._id, update, { returnDocument: 'after', runValidators: true });
  await clearCache(`cache:${req.user._id}:*`);
  res.json({ success: true, user: customer });
});

export const saveFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, 'FCM token is required');
  const customer = await Customer.findById(req.user._id);
  if (!customer.fcmTokens.includes(token)) {
    customer.fcmTokens.push(token);
    if (customer.fcmTokens.length > 10) customer.fcmTokens = customer.fcmTokens.slice(-10);
    await customer.save({ validateModifiedOnly: true });
  }
  res.json({ success: true, message: 'FCM token saved' });
});

export const removeFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, 'FCM token is required');
  await Customer.findByIdAndUpdate(req.user._id, { $pull: { fcmTokens: token } });
  res.json({ success: true, message: 'FCM token removed' });
});

// ─── ACCOUNT DELETION (App Store / Play Store requirement) ───────────
// Soft-deletes the customer account: the account is suspended (deactivated)
// and signed out everywhere, but its data is retained. A suspended account
// is blocked from logging back in until an admin restores it. Gated on the
// client behind the ACCOUNT_DELETION feature flag.
export const deleteAccount = asyncHandler(async (req, res) => {
  const customerId = req.user._id;

  const customer = await Customer.findById(customerId);
  if (!customer) throw new ApiError(404, 'Account not found');

  // Suspend the account instead of removing data.
  customer.isActive = false;
  customer.suspendedAt = new Date();
  customer.suspensionReason = 'self_requested';
  customer.fcmTokens = []; // stop push notifications to this account
  await customer.save({ validateModifiedOnly: true });

  // End the current session everywhere by revoking refresh tokens.
  await RefreshToken.deleteMany({ user: customerId, role: 'customer' });

  await clearCache(`cache:${customerId}:*`);

  // Best-effort audit trail (logActivity swallows its own errors).
  await logActivity({
    type: 'user_deleted',
    message: `Customer ${customer.firstName} ${customer.lastName} (${customer.phone}) deleted (suspended) their own account`,
  });

  res.json({ success: true, message: 'Your account has been deactivated' });
});


// ─── VEHICLES ────────────────────────────────────
export const getVehicles = asyncHandler(async (req, res) => {
  const vehicles = await Vehicle.find({ customer: req.user._id, isActive: true }).sort('-createdAt').lean();
  res.json({ success: true, vehicles });
});

export const addVehicle = asyncHandler(async (req, res) => {
  const { brand, model, number, flatNumber, blockTower, slotPillar, color, category } = req.body;
  if (!brand || !model || !number) throw new ApiError(400, 'Brand, model, and number are required');
  
  const flatNumberClean = flatNumber || '';
  const blockTowerClean = blockTower || '';
  const slotPillarClean = slotPillar || '';
  const parkingClean = [
    blockTowerClean ? `Block/Tower: ${blockTowerClean}` : '',
    slotPillarClean ? `Slot/Pillar: ${slotPillarClean}` : '',
    flatNumberClean ? `Flat: ${flatNumberClean}` : ''
  ].filter(Boolean).join(' · ');

  let resolvedCategory = category || 'sedan';
  if (brand && model) {
    const matchedPkg = await Package.findOne({
      isActive: true,
      'applicableModels.brand': { $regex: new RegExp(`^${brand.trim()}$`, 'i') },
      'applicableModels.models': { $regex: new RegExp(`^${model.trim()}$`, 'i') }
    });
    if (matchedPkg && matchedPkg.category) {
      resolvedCategory = matchedPkg.category;
    }
  }

  let photos = [];
  if (req.files && req.files.length > 0) {
    const uploadPromises = req.files.map(file => 
      uploadBufferToCloudinary(file.buffer, 'cleanzo/vehicles')
    );
    photos = await Promise.all(uploadPromises);
  }

  const vehicle = await Vehicle.create({ 
    customer: req.user._id, 
    brand, 
    model, 
    number, 
    flatNumber: flatNumberClean,
    blockTower: blockTowerClean,
    slotPillar: slotPillarClean,
    parking: parkingClean, 
    color, 
    category: resolvedCategory,
    photos 
  });
  
  await clearCache(`cache:${req.user._id}:*`);
  res.status(201).json({ success: true, vehicle });
});

export const updateVehicle = asyncHandler(async (req, res) => {
  const { brand, model, number, flatNumber, blockTower, slotPillar, color, category } = req.body;

  const existing = await Vehicle.findOne({ _id: req.params.id, customer: req.user._id });
  if (!existing) throw new ApiError(404, 'Vehicle not found');

  // Identity fields (brand/model/number/category) are locked while a plan is active —
  // keep the existing values regardless of what the client sends so the lock can't be bypassed.
  const hasActiveSub = await Subscription.exists({ vehicle: existing._id, customer: req.user._id, status: 'Active' });

  const flatNumberClean = flatNumber || '';
  const blockTowerClean = blockTower || '';
  const slotPillarClean = slotPillar || '';
  const parkingClean = [
    blockTowerClean ? `Block/Tower: ${blockTowerClean}` : '',
    slotPillarClean ? `Slot/Pillar: ${slotPillarClean}` : '',
    flatNumberClean ? `Flat: ${flatNumberClean}` : ''
  ].filter(Boolean).join(' · ');

  let resolvedCategory = category || existing.category;
  if (!hasActiveSub && brand && model) {
    const matchedPkg = await Package.findOne({
      isActive: true,
      'applicableModels.brand': { $regex: new RegExp(`^${brand.trim()}$`, 'i') },
      'applicableModels.models': { $regex: new RegExp(`^${model.trim()}$`, 'i') }
    });
    if (matchedPkg && matchedPkg.category) {
      resolvedCategory = matchedPkg.category;
    }
  }

  const updateFields = {
    brand: hasActiveSub ? existing.brand : brand,
    model: hasActiveSub ? existing.model : model,
    number: hasActiveSub ? existing.number : number,
    flatNumber: flatNumberClean,
    blockTower: blockTowerClean,
    slotPillar: slotPillarClean,
    parking: parkingClean,
    color,
    category: hasActiveSub ? existing.category : resolvedCategory
  };

  if (req.files && req.files.length > 0) {
    const uploadPromises = req.files.map(file => 
      uploadBufferToCloudinary(file.buffer, 'cleanzo/vehicles')
    );
    updateFields.photos = await Promise.all(uploadPromises);
  }

  const vehicle = await Vehicle.findOneAndUpdate(
    { _id: req.params.id, customer: req.user._id },
    updateFields,
    { returnDocument: 'after', runValidators: true }
  );
  if (!vehicle) throw new ApiError(404, 'Vehicle not found');
  await clearCache(`cache:${req.user._id}:*`);
  res.json({ success: true, vehicle });
});

export const deleteVehicle = asyncHandler(async (req, res) => {
  const activeSubscription = await Subscription.findOne({
    vehicle: req.params.id,
    customer: req.user._id,
    status: 'Active'
  });
  if (activeSubscription) {
    throw new ApiError(400, 'Cannot delete a vehicle with an active subscription');
  }

  const vehicle = await Vehicle.findOneAndUpdate(
    { _id: req.params.id, customer: req.user._id },
    { isActive: false },
    { returnDocument: 'after' }
  );
  if (!vehicle) throw new ApiError(404, 'Vehicle not found');
  await clearCache(`cache:${req.user._id}:*`);
  res.json({ success: true, message: 'Vehicle removed' });
});

// ─── SUBSCRIPTIONS ───────────────────────────────

// Compute next wash date given already-loaded task data (no DB calls)
const computeNextWash = (sub, todaysTask, skippedTasks) => {
  const today = getISTMidnight();
  let startCheck = getISTMidnight(sub.startDate);
  if (startCheck < today) startCheck = today;

  let startDate = new Date(startCheck);
  if (todaysTask && (todaysTask.status === 'completed' || todaysTask.status === 'missed')) {
    startDate.setDate(startDate.getDate() + 1);
  }

  const skippedDates = new Set(
    (skippedTasks || [])
      .filter(t => new Date(t.date) >= startDate)
      .map(t => new Date(t.date).toDateString())
  );

  let checkDate = new Date(startDate);
  for (let i = 0; i < 30; i++) {
    if (!skippedDates.has(checkDate.toDateString())) return checkDate;
    checkDate.setDate(checkDate.getDate() + 1);
  }
  return checkDate;
};

// Single-subscription helper (used by getSubscriptionById)
const calculateDynamicNextWash = async (subId) => {
  const sub = await Subscription.findById(subId).lean();
  if (!sub) return null;

  const today = getISTMidnight();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todaysTask, skippedTasks] = await Promise.all([
    Task.findOne({ subscription: subId, date: { $gte: today, $lt: tomorrow } }).lean(),
    Task.find({ subscription: subId, status: 'skipped', date: { $gte: today } }).lean(),
  ]);

  return computeNextWash(sub, todaysTask, skippedTasks);
};

export const getSubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await Subscription.find({ customer: req.user._id })
    .populate('vehicle', 'brand model number parking color')
    .populate('package', 'name tier price features')
    .populate('assignedCleaner', 'name phone rating')
    .sort('-createdAt')
    .lean();

  const activeSubs = subscriptions.filter(s => s.status === 'Active');
  if (activeSubs.length > 0) {
    const activeIds = activeSubs.map(s => s._id);
    const today = getISTMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Batch both task queries across all active subscriptions at once
    const [todayTasks, skippedTasks] = await Promise.all([
      Task.find({ subscription: { $in: activeIds }, date: { $gte: today, $lt: tomorrow } }).lean(),
      Task.find({ subscription: { $in: activeIds }, status: 'skipped', date: { $gte: today } }).lean(),
    ]);

    const todayTaskMap = new Map(todayTasks.map(t => [t.subscription.toString(), t]));
    const skippedBySubId = skippedTasks.reduce((acc, t) => {
      const key = t.subscription.toString();
      (acc[key] = acc[key] || []).push(t);
      return acc;
    }, {});

    for (const sub of subscriptions) {
      if (sub.status === 'Active') {
        sub.nextWash = computeNextWash(
          sub,
          todayTaskMap.get(sub._id.toString()),
          skippedBySubId[sub._id.toString()]
        );
      }
    }
  }

  res.json({ success: true, subscriptions });
});

export const getSubscriptionById = asyncHandler(async (req, res) => {
  const sub = await Subscription.findOne({ _id: req.params.id, customer: req.user._id })
    .populate('vehicle', 'brand model number parking color')
    .populate('package', 'name tier price features perDay')
    .populate('assignedCleaner', 'name phone rating')
    .lean();
  if (!sub) throw new ApiError(404, 'Subscription not found');
  
  if (sub.status === 'Active') {
    sub.nextWash = await calculateDynamicNextWash(sub._id);
  }
  
  res.json({ success: true, subscription: sub });
});

export const getSocieties = asyncHandler(async (req, res) => {
  const societies = await Society.find({ isActive: true }).select('name city address slots');
  res.json({ success: true, societies });
});

// Resolve the coupon category for a customer's NEW booking (first_purchase vs renewal).
const resolveNewBookingCategory = async (customerId) => {
  const count = await Subscription.countDocuments({ customer: customerId, isTrial: false });
  return count === 0 ? 'first_purchase' : 'renewal';
};

// POST /customer/coupons/validate — preview only, does NOT redeem the coupon.
export const validateCouponCode = asyncHandler(async (req, res) => {
  const { code, type, societyId, subscriptionId, baseAmount } = req.body;
  if (!code) throw new ApiError(400, 'Please enter a coupon code');
  if (!baseAmount || baseAmount <= 0) throw new ApiError(400, 'Invalid amount');

  let category;
  let resolvedSocietyId = societyId;
  if (type === 'extension') {
    category = 'extension';
    if (!resolvedSocietyId && subscriptionId) {
      const sub = await Subscription.findOne({ _id: subscriptionId, customer: req.user._id }).select('society');
      resolvedSocietyId = sub?.society;
    }
  } else {
    category = await resolveNewBookingCategory(req.user._id);
  }

  const { coupon, discountAmount, finalAmount } = await validateCoupon({
    code,
    customerId: req.user._id,
    category,
    societyId: resolvedSocietyId,
    baseAmount: Number(baseAmount),
  });

  res.json({
    success: true,
    valid: true,
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountAmount,
    finalAmount,
  });
});

export const createSubscription = asyncHandler(async (req, res) => {
  const { vehicleId, packageId, paymentId, societyId, slotId, specialInstructions, isTrial, startDate, isPremiumOverride, overrideReason, couponCode } = req.body;
  if (!vehicleId || !societyId || !slotId) {
    throw new ApiError(400, 'Vehicle, society, and slot are required');
  }
  if (!isTrial && !packageId) {
    throw new ApiError(400, 'Package is required for standard subscriptions');
  }

  // Non-trial subscriptions must have a backend-verified payment
  if (!isTrial) {
    if (!paymentId) throw new ApiError(400, 'Payment is required for non-trial subscriptions');
    const verifiedPayment = await Payment.findOne({ paymentId, customer: req.user._id });
    if (!verifiedPayment) {
      throw new ApiError(400, 'Payment not verified. Please complete payment before subscribing.');
    }
  }

  // Referrer reward only applies to a customer's very first non-trial subscription
  const isFirstNonTrial = !isTrial && req.user.referredBy
    ? (await Subscription.countDocuments({ customer: req.user._id, isTrial: false })) === 0
    : false;

  const [vehicle, pkg, referrer] = await Promise.all([
    Vehicle.findOne({ _id: vehicleId, customer: req.user._id, isActive: true }),
    packageId ? Package.findById(packageId) : null,
    isFirstNonTrial ? Customer.findById(req.user.referredBy) : null,
  ]);

  if (!vehicle) throw new ApiError(404, 'Vehicle not found');
  if (!isTrial && !pkg) throw new ApiError(404, 'Package not found');

  // Duplicate active subscription check
  const existing = await Subscription.findOne({ customer: req.user._id, vehicle: vehicleId, status: 'Active' });
  if (existing) throw new ApiError(409, 'An active subscription already exists for this vehicle');

  // The 1-day trial is offered once per vehicle (a customer with multiple vehicles
  // can trial each one independently, but not retake it for the same vehicle).
  if (isTrial) {
    const trialUsed = await Subscription.findOne({ vehicle: vehicleId, isTrial: true });
    if (trialUsed) throw new ApiError(409, 'This vehicle has already used its free trial');
  }

  const society = await Society.findById(societyId);
  if (!society || !society.isActive) throw new ApiError(404, 'Society not found or inactive');

  if (!Array.isArray(society.slots)) throw new ApiError(500, 'Society configuration error');

  const slot = society.slots.find(s => s.slotId === slotId);
  if (!slot) throw new ApiError(404, 'Slot not found');

  // Load admin-configurable pricing from Settings
  const [trialSetting, prioritySetting] = await Promise.all([
    Settings.findOne({ key: 'trialPrice' }),
    Settings.findOne({ key: 'prioritySlotFee' }),
  ]);
  let trialPrice = trialSetting?.value ?? 30;
  const prioritySlotFee = prioritySetting?.value ?? 99;

  let resolvedPackageId = packageId;

  if (isTrial) {
    // Look up active packages to find a dynamic trial price matching this vehicle
    const activePackages = await Package.find({ isActive: true });
    const isVehicleMatch = (v, p) => {
      if (!p.applicableModels || p.applicableModels.length === 0) {
        return v.category?.toLowerCase() === p.category?.toLowerCase();
      }
      const brandMatch = p.applicableModels.find(
        app => app.brand.toLowerCase() === v.brand.toLowerCase()
      );
      if (!brandMatch) return false;
      if (!brandMatch.models || brandMatch.models.length === 0) return true;
      return brandMatch.models.some(
        m => m.toLowerCase() === v.model.toLowerCase()
      );
    };

    const matchedPackages = activePackages.filter(p => isVehicleMatch(vehicle, p));

    // 1. Prioritize BASIC tier package matching the vehicle with a trialPrice
    const basicPkg = matchedPackages.find(
      p => (p.tier || 'BASIC').toUpperCase() === 'BASIC' && p.trialPrice !== undefined && p.trialPrice !== null
    );

    if (basicPkg) {
      trialPrice = basicPkg.trialPrice;
      resolvedPackageId = basicPkg._id;
    } else {
      // 2. Fallback to any matched package with a trialPrice
      const anyPkgWithTrial = matchedPackages.find(
        p => p.trialPrice !== undefined && p.trialPrice !== null
      );
      if (anyPkgWithTrial) {
        trialPrice = anyPkgWithTrial.trialPrice;
        resolvedPackageId = anyPkgWithTrial._id;
      }
    }
  }


  // Verify vehicle eligibility for the package
  if (!isTrial && pkg.applicableModels && pkg.applicableModels.length > 0) {
    const brandMatch = pkg.applicableModels.find(
      app => app.brand.toLowerCase() === vehicle.brand.toLowerCase()
    );
    if (!brandMatch) {
      throw new ApiError(400, `This package is not applicable to vehicle brand: ${vehicle.brand}`);
    }
    if (brandMatch.models && brandMatch.models.length > 0) {
      const modelMatch = brandMatch.models.some(
        m => m.toLowerCase() === vehicle.model.toLowerCase()
      );
      if (!modelMatch) {
        throw new ApiError(400, `This package is not applicable to vehicle model: ${vehicle.model}`);
      }
    }
  }

  let basePrice = isTrial ? trialPrice : pkg.price;
  let priorityFee = 0;

  // Apply package discount (individual override or global) — never to trials.
  // Computed server-side so the stored amount is authoritative regardless of the client.
  let discountPercent = 0;
  let discountNote = '';
  if (!isTrial) {
    const discountConfig = await getDiscountConfig();
    const pricing = resolvePackageDiscount(pkg, vehicle, discountConfig);
    if (pricing.hasDiscount) {
      basePrice = pricing.effectivePrice;
      discountPercent = pricing.percent;
      discountNote = pricing.note;
    }
  }

  if (isPremiumOverride) {
    if (!overrideReason || !overrideReason.trim()) {
      throw new ApiError(400, 'Override reason is required for premium override bookings');
    }
    // Prevent charging the priority fee when the slot has open standard capacity.
    // A buggy or tampered client must not be able to trigger premium pricing
    // when no override is actually needed.
    const slotStatus = slot.status || 'Open';
    const slotIsFull = slotStatus !== 'Open' || slot.currentCount >= slot.maxVehicles;
    if (!slotIsFull) {
      throw new ApiError(400, 'This slot has available capacity. Please use standard booking instead of priority override.');
    }
    priorityFee = prioritySlotFee;
    await Society.updateOne(
      { _id: societyId, 'slots.slotId': slotId },
      { $inc: { 'slots.$.currentCount': 1 } }
    );
  } else {
    // Standard booking slot status and capacity verification
    const slotStatus = slot.status || 'Open';
    if (slotStatus !== 'Open') {
      throw new ApiError(400, `Standard booking is closed for this time slot. Current status: ${slotStatus}.`);
    }

    if (isTrial) {
      // Trial bypasses capacity check
      await Society.updateOne(
        { _id: societyId, 'slots.slotId': slotId },
        { $inc: { 'slots.$.currentCount': 1 } }
      );
    } else {
      if (slot.currentCount >= slot.maxVehicles) {
        throw new ApiError(400, 'Standard capacity for this slot is full. Please use Premium Override Booking to schedule.');
      }

      // Atomic slot increment: only succeeds if currentCount < maxVehicles and status is Open
      const updatedSociety = await Society.findOneAndUpdate(
        { 
          _id: societyId, 
          slots: { 
            $elemMatch: { 
              slotId, 
              status: 'Open',
              currentCount: { $lt: slot.maxVehicles } 
            } 
          } 
        },
        { $inc: { 'slots.$.currentCount': 1 } },
        { returnDocument: 'after' }
      );

      if (!updatedSociety) {
        throw new ApiError(400, 'Slot status changed or capacity filled during booking. Please try again.');
      }
    }
  }

  // Calculate final amount
  let finalAmount = basePrice + priorityFee;

  // Apply Referral Discount (only for standard subscription, not trial)
  // Atomic update: only succeeds if discount is still active — eliminates race condition
  if (!isTrial && req.user.referralDiscount?.isActive) {
    const claimed = await Customer.findOneAndUpdate(
      { _id: req.user._id, 'referralDiscount.isActive': true },
      { $set: { 'referralDiscount.isActive': false } },
      { returnDocument: 'after' }
    );
    if (claimed) {
      const discount = finalAmount * (req.user.referralDiscount.percentage / 100);
      finalAmount = finalAmount - discount;
    }
  }

  // Apply coupon (non-trial only) — validated server-side against the authoritative amount
  let couponDoc = null;
  let couponDiscount = 0;
  if (!isTrial && couponCode) {
    const category = await resolveNewBookingCategory(req.user._id);
    const result = await validateCoupon({
      code: couponCode,
      customerId: req.user._id,
      category,
      societyId,
      baseAmount: finalAmount,
    });
    couponDoc = result.coupon;
    couponDiscount = result.discountAmount;
    finalAmount = result.finalAmount;
  }

  let finalStartDate = getISTMidnight();
  let nextWashVal = new Date(finalStartDate.getTime() + 24 * 60 * 60 * 1000);
  
  if (isTrial && startDate) {
    finalStartDate = getISTMidnight(startDate);
    const todayMidnight = getISTMidnight();
    const diffTime = finalStartDate.getTime() - todayMidnight.getTime();
    const diffDays = Math.round(diffTime / (24 * 60 * 60 * 1000));
    
    if (diffDays < 1 || diffDays > 2) {
      throw new ApiError(400, 'Trial date must be either tomorrow or the day after tomorrow');
    }
    nextWashVal = finalStartDate;
  }
  
  const finalEndDate = new Date(finalStartDate);
  finalEndDate.setDate(finalEndDate.getDate() + (isTrial ? 1 : 30));

  const sub = await Subscription.create({
    customer: req.user._id,
    vehicle: vehicleId,
    package: resolvedPackageId,
    society: societyId,
    slot: slotId,
    isTrial: isTrial || false,
    startDate: finalStartDate,
    endDate: finalEndDate,
    totalDays: isTrial ? 1 : 30,
    remainingDays: isTrial ? 1 : 30,
    nextWash: nextWashVal,
    amount: finalAmount,
    priorityFee,
    discountPercent,
    discountNote,
    couponCode: couponDoc ? couponDoc.code : undefined,
    couponDiscount,
    isPremiumOverride: isPremiumOverride || false,
    overrideReason: isPremiumOverride ? overrideReason : undefined,
    specialInstructions,
    paymentId,
  });

  if (paymentId) {
    await Payment.findOneAndUpdate(
      { paymentId },
      {
        subscription: sub._id,
        package: resolvedPackageId,
        vehicle: vehicleId,
        type: 'purchase',
      }
    ).catch(err => console.error('Failed to link payment to subscription:', err));
  }

  // Record coupon redemption (payment already succeeded — don't fail the sub on a redeem race)
  if (couponDoc) {
    try {
      await redeemCoupon(couponDoc, req.user._id, sub._id, couponDiscount);
    } catch (err) {
      console.error('Failed to record coupon redemption:', err.message);
    }
  }

  // Referral Reward (Give referrer a discount) — atomic, no race condition
  if (referrer) {
    await Customer.findByIdAndUpdate(referrer._id, {
      $set: {
        'referralDiscount.isActive': true,
        'referralDiscount.percentage': 25,
        'referralDiscount.expiresAt': new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Create Society Commission if partner society
  let partnerForPush = null;
  if (!isTrial) {
    try {
      const partner = await PartnerSociety.findOne({ society: societyId, isActive: true });
      if (partner) {
        const commissionAmount = (sub.amount * partner.commissionRate) / 100;
        await SocietyCommission.create({
          partnerSociety: partner._id,
          subscription: sub._id,
          customer: req.user._id,
          subscriptionAmount: sub.amount,
          commissionRate: partner.commissionRate,
          commissionAmount,
          status: 'pending'
        });
        
        // Update partner society balance
        partner.totalEarned += commissionAmount;
        partner.pendingBalance += commissionAmount;
        await partner.save();
        partnerForPush = { tokens: partner.fcmTokens, amount: commissionAmount, customerName: `${req.user.firstName} ${req.user.lastName}` };
      }
    } catch (err) {
      console.error('Failed to create society commission:', err);
    }
  }

  await logActivity({
    type: 'subscription_created',
    message: `${req.user.firstName} ${req.user.lastName} started ${isTrial ? 'Trial' : 'Standard'} subscription`,
    metadata: { subscriptionId: sub._id, customerId: req.user._id }
  });

  // ── Push Notifications ──
  // 1. Customer: subscription activated
  const customer = await Customer.findById(req.user._id).select('fcmTokens firstName');
  if (customer?.fcmTokens?.length) {
    const dateStr = finalStartDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    sendPushNotification(customer.fcmTokens, {
      title: '🚗 Subscription Activated!',
      body: `Your ${isTrial ? 'trial' : 'car clean'} plan starts on ${dateStr}.`,
      data: { type: 'subscription_created', link: NOTIFICATION_LINKS.subscription_created },
    }).catch(() => {});
  }

  // 2. Society partner: commission earned
  if (partnerForPush?.tokens?.length) {
    sendPushNotification(partnerForPush.tokens, {
      title: '💰 Commission Earned!',
      body: `₹${partnerForPush.amount.toFixed(0)} commission added from ${partnerForPush.customerName}'s subscription.`,
      data: { type: 'commission_earned', link: NOTIFICATION_LINKS.commission_earned },
    }).catch(() => {});
  }

  await clearCache(`cache:${req.user._id}:*`);
  res.status(201).json({ success: true, subscription: sub });
});




export const skipService = asyncHandler(async (req, res) => {
  const { date, dates } = req.body;
  
  // Normalize to an array of dates
  let datesArray = [];
  if (Array.isArray(dates)) {
    datesArray = dates;
  } else if (date) {
    datesArray = [date];
  } else {
    throw new ApiError(400, 'Date is required to skip service');
  }

  if (datesArray.length === 0) {
    throw new ApiError(400, 'At least one date is required to skip service');
  }

  // Check limit (max 3 days in a frequency)
  if (datesArray.length > 3) {
    throw new ApiError(400, 'Maximum of 3 skip days allowed per subscription period');
  }

  const sub = await Subscription.findOne({ _id: req.params.id, customer: req.user._id });
  if (!sub) throw new ApiError(404, 'Subscription not found');
  if (sub.status !== 'Active') throw new ApiError(400, 'Only active subscriptions can be skipped');
  if (sub.isTrial) throw new ApiError(400, 'Trial subscriptions cannot be skipped');

  // Check if they have already skipped this subscription (using dynamic maxSkips limit)
  const maxSkips = sub.maxSkips || 1;
  const skipsUsed = sub.skipsUsed || 0;
  const effectiveSkipsUsed = (skipsUsed === 0 && sub.skippedDays > 0) ? 1 : skipsUsed;
  if (effectiveSkipsUsed >= maxSkips) {
    if (maxSkips === 1) {
      throw new ApiError(400, 'You can only skip service once per subscription period');
    } else {
      throw new ApiError(400, `You have reached the maximum allowed skips (${maxSkips}) for this subscription period`);
    }
  }

  const tomorrow = getISTMidnight();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Validate dates: ISO format, in future (>= tomorrow)
  const parsedDates = datesArray.map(d => {
    const pDate = new Date(d);
    if (isNaN(pDate.getTime())) {
      throw new ApiError(400, 'Invalid date format. Use YYYY-MM-DD.');
    }
    const skipDate = getISTMidnight(pDate);
    if (skipDate < tomorrow) {
      throw new ApiError(400, 'Skip must be requested at least 1 day in advance');
    }
    return skipDate;
  });

  // Sort dates to check for consecutiveness
  parsedDates.sort((a, b) => a.getTime() - b.getTime());

  // Check consecutiveness
  for (let i = 0; i < parsedDates.length - 1; i++) {
    const diffTime = parsedDates[i+1].getTime() - parsedDates[i].getTime();
    const diffDays = Math.round(diffTime / (24 * 60 * 60 * 1000));
    if (diffDays !== 1) {
      throw new ApiError(400, 'Skipped dates must be consecutive');
    }
  }

  // Check if any of these dates is already skipped
  for (const skipDate of parsedDates) {
    const alreadySkipped = await Task.findOne({
      subscription: sub._id,
      date: skipDate,
      status: 'skipped',
      skipReason: 'Customer skip',
    });
    if (alreadySkipped) {
      throw new ApiError(400, 'This date is already marked as skipped');
    }
  }

  // Perform updates
  for (const skipDate of parsedDates) {
    // Use findOneAndUpdate with upsert so that if the cron already created a task
    // for this date (e.g. after a manual backfill), we update it rather than
    // hitting the unique (subscription, date) index with a duplicate create.
    await Task.findOneAndUpdate(
      { subscription: sub._id, date: skipDate },
      {
        $set: {
          status: 'skipped',
          skipReason: 'Customer skip',
          creditBack: false,
          packageName: 'N/A',
          cleaner: null,
        },
        $setOnInsert: {
          customer: req.user._id,
          vehicle: sub.vehicle,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
  }

  // Extend subscription
  sub.skippedDays += parsedDates.length;
  sub.skipsUsed = (sub.skipsUsed || 0) + 1;
  sub.endDate = new Date(sub.endDate.getTime() + parsedDates.length * 24 * 60 * 60 * 1000);
  
  // Calculate next wash
  sub.nextWash = await calculateDynamicNextWash(sub._id);
  
  await sub.save({ validateModifiedOnly: true });

  // ── Push Notification: service skipped ──
  try {
    const customer = await Customer.findById(req.user._id).select('fcmTokens');
    if (customer?.fcmTokens?.length) {
      const formattedDates = parsedDates.map(d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })).join(', ');
      sendPushNotification(customer.fcmTokens, {
        title: '📅 Service Skipped!',
        body: `Your clean for ${formattedDates} has been skipped and subscription extended.`,
        data: { type: 'service_skipped', link: NOTIFICATION_LINKS.service_skipped },
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to send service skipped push notification:', err.message);
  }

  await clearCache(`cache:${req.user._id}:*`);
  
  res.json({
    success: true,
    message: `Service skipped. Subscription extended by ${parsedDates.length} day(s).`,
    skippedDays: sub.skippedDays,
    newEndDate: sub.endDate,
    nextWash: sub.nextWash,
  });
});


// ─── HISTORY ─────────────────────────────────────
export const getHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = { customer: req.user._id, status: { $in: ['completed', 'skipped'] } };
  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('vehicle', 'model number')
      .populate('cleaner', 'name')
      .sort('-date')
      .skip(skip)
      .limit(limit),
    Task.countDocuments(filter),
  ]);

  res.json({ success: true, tasks, page, totalPages: Math.ceil(total / limit), total });
});

export const rateTask = asyncHandler(async (req, res) => {
  const { score, feedback } = req.body;
  if (!score || score < 1 || score > 5) throw new ApiError(400, 'Valid score (1-5) is required');

  const task = await Task.findOne({ _id: req.params.id, customer: req.user._id, status: 'completed' });
  if (!task) throw new ApiError(404, 'Completed task not found');
  if (!task.cleaner) throw new ApiError(400, 'Cannot rate a task without an assigned cleaner');

  const existing = await Rating.findOne({ task: task._id });
  if (existing) throw new ApiError(400, 'Task already rated');

  const rating = await Rating.create({
    task: task._id,
    customer: req.user._id,
    cleaner: task.cleaner,
    score,
    feedback
  });

  // Recalculate and persist the cleaner's average rating
  const [agg] = await Rating.aggregate([
    { $match: { cleaner: task.cleaner } },
    { $group: { _id: null, avg: { $avg: '$score' } } },
  ]);
  if (agg) {
    await Cleaner.findByIdAndUpdate(task.cleaner, {
      rating: Math.round(agg.avg * 10) / 10,
    });
  }

  await clearCache(`cache:${req.user._id}:*`);
  res.status(201).json({ success: true, rating });
});

// ─── NOTIFICATIONS ───────────────────────────────
export const getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find({ recipient: req.user._id, recipientModel: 'Customer' })
      .sort('-createdAt').skip(skip).limit(limit),
    Notification.countDocuments({ recipient: req.user._id, recipientModel: 'Customer' }),
  ]);

  res.json({ success: true, notifications, page, totalPages: Math.ceil(total / limit), total });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { read: true }
  );
  await clearCache(`cache:${req.user._id}:*`);
  res.json({ success: true });
});

// ─── ADDRESSES ───────────────────────────────────
export const getAddresses = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.user._id).select('addresses');
  res.json({ success: true, addresses: customer.addresses || [] });
});

export const addAddress = asyncHandler(async (req, res) => {
  const { label, line1, line2, societyName, tower, flat, city, state, pincode, isDefault } = req.body;
  if (!city) throw new ApiError(400, 'City is required');
  const customer = await Customer.findById(req.user._id);
  customer.addresses.push({ label, line1, line2, societyName, tower, flat, city, state, pincode, isDefault });
  await customer.save({ validateModifiedOnly: true });
  res.status(201).json({ success: true, addresses: customer.addresses });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const { label, line1, line2, societyName, tower, flat, city, state, pincode, isDefault } = req.body;
  if (!city) throw new ApiError(400, 'City is required');
  const customer = await Customer.findById(req.user._id);
  
  const address = customer.addresses.id(req.params.id);
  if (!address) throw new ApiError(404, 'Address not found');

  if (label !== undefined) address.label = label;
  if (line1 !== undefined) address.line1 = line1;
  if (line2 !== undefined) address.line2 = line2;
  if (societyName !== undefined) address.societyName = societyName;
  if (tower !== undefined) address.tower = tower;
  if (flat !== undefined) address.flat = flat;
  if (city !== undefined) address.city = city;
  if (state !== undefined) address.state = state;
  if (pincode !== undefined) address.pincode = pincode;
  if (isDefault !== undefined) address.isDefault = isDefault;

  await customer.save({ validateModifiedOnly: true });
  res.json({ success: true, addresses: customer.addresses });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  // $pull is a silent no-op for an unknown id, so confirm the address exists
  // first and return 404 otherwise (instead of a misleading success).
  const owns = await Customer.exists({ _id: req.user._id, 'addresses._id': req.params.id });
  if (!owns) throw new ApiError(404, 'Address not found');

  // Atomic $pull avoids a full-document save (which could fail validation on
  // unrelated existing fields and surface as "Failed to delete address"). (bug 73)
  const customer = await Customer.findByIdAndUpdate(
    req.user._id,
    { $pull: { addresses: { _id: req.params.id } } },
    { new: true }
  );
  if (!customer) throw new ApiError(404, 'Customer not found');
  res.json({ success: true, addresses: customer.addresses });
});

export const getGrievances = asyncHandler(async (req, res) => {
  const grievances = await Grievance.find({ customer: req.user._id }).sort('-createdAt').lean();
  res.json({ success: true, grievances });
});

export const addGrievance = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, issue } = req.body;
  if (!name || !email || !phone || !subject || !issue) {
    throw new ApiError(400, 'All fields are required');
  }

  let attachment = null;
  if (req.file) {
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, 'cleanzo/grievances');
    attachment = uploadResult;
  }

  const grievance = await Grievance.create({
    customer: req.user.id,
    name,
    email,
    phone,
    subject,
    issue,
    attachment
  });

  // ── Push Notification to Admin: new grievance filed ──
  try {
    const admins = await Admin.find({ fcmTokens: { $exists: true, $ne: [] } }).select('fcmTokens');
    const adminTokens = admins.flatMap(a => a.fcmTokens || []);
    if (adminTokens.length) {
      sendPushNotification(adminTokens, {
        title: '⚠️ New Grievance Filed',
        body: `${req.user.firstName || 'A customer'} has filed a new grievance: "${subject}".`,
        data: { type: 'grievance_filed', link: NOTIFICATION_LINKS.grievance_filed },
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to send grievance push notification:', err.message);
  }

  res.status(201).json({
    success: true,
    grievance
  });
});

// ─── MARKETPLACE: ORDERS ──────────────────────────
export const placeMarketplaceOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress, paymentMethod } = req.body; // items: [{ productId, quantity }]
  
  if (!items || !items.length || !shippingAddress) {
    throw new ApiError(400, 'Products and shipping address are required');
  }

  let totalAmount = 0;
  const orderItems = [];

  // Validate stock and calculate total
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product || !product.isActive) {
      throw new ApiError(404, `Product ${item.productId} not found or inactive`);
    }
    if (product.stock < item.quantity) {
      throw new ApiError(400, `Insufficient stock for product ${product.name}`);
    }

    const price = product.discountPrice || product.price;
    totalAmount += price * item.quantity;
    orderItems.push({
      product: product._id,
      quantity: item.quantity,
      priceAtPurchase: price
    });

    // Update stock
    product.stock -= item.quantity;
    await product.save();
  }

  const order = await Order.create({
    customer: req.user._id,
    items: orderItems,
    totalAmount,
    shippingAddress,
    paymentMethod: paymentMethod || 'COD',
    paymentStatus: 'Pending',
    status: 'Placed'
  });

  await logActivity({
    type: 'order_placed',
    message: `New marketplace order ${order.orderId} placed by ${req.user.firstName}`,
    metadata: { orderId: order._id, customerId: req.user._id }
  });

  await clearCache(`cache:${req.user._id}:*`);
  res.status(201).json({ success: true, order });
});

export const getMyMarketplaceOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ customer: req.user._id })
    .populate('items.product', 'name images')
    .sort('-createdAt');
  res.json({ success: true, orders });
});

export const getVehicleCategories = asyncHandler(async (req, res) => {
  const categories = await VehicleCategory.find({ isActive: true }).sort('sortOrder name').lean();
  res.json({ success: true, categories });
});


export const cancelMarketplaceOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
  if (!order) throw new ApiError(404, 'Order not found');

  if (!['Placed', 'Confirmed'].includes(order.status)) {
    throw new ApiError(400, `Order cannot be cancelled in status: ${order.status}`);
  }

  order.status = 'Cancelled';
  order.cancelledAt = new Date();
  await order.save();

  // Restore stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
  }

  await logActivity({
    type: 'order_cancelled',
    message: `Order ${order.orderId} cancelled by customer`,
    metadata: { orderId: order._id, customerId: req.user._id }
  });

  await clearCache(`cache:${req.user._id}:*`);
  res.json({ success: true, message: 'Order cancelled successfully' });
});

export const extendSubscription = asyncHandler(async (req, res) => {
  const { paymentId, couponCode } = req.body;
  if (!paymentId) throw new ApiError(400, 'Payment ID is required');

  const sub = await Subscription.findOne({ _id: req.params.id, customer: req.user._id, status: 'Active' })
    .populate('package')
    .populate('vehicle');
  if (!sub) throw new ApiError(404, 'Active subscription not found');

  const verifiedPayment = await Payment.findOne({ paymentId, customer: req.user._id });
  if (!verifiedPayment) {
    throw new ApiError(400, 'Payment not verified. Please complete payment before extending.');
  }

  if (verifiedPayment.subscription) {
    throw new ApiError(400, 'This payment has already been used.');
  }

  // Validate an extension coupon, if provided, against the sub's package price
  let couponDoc = null;
  let couponDiscount = 0;
  if (couponCode) {
    const result = await validateCoupon({
      code: couponCode,
      customerId: req.user._id,
      category: 'extension',
      societyId: sub.society,
      baseAmount: sub.package?.price || sub.amount || 0,
    });
    couponDoc = result.coupon;
    couponDiscount = result.discountAmount;
  }

  // Extend subscription: add 30 days
  sub.totalDays += 30;
  sub.remainingDays = (sub.remainingDays || 0) + 30;
  sub.endDate = new Date(sub.endDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  sub.maxSkips = (sub.maxSkips || 1) + 1;
  if (couponDoc) {
    sub.couponCode = couponDoc.code;
    sub.couponDiscount = couponDiscount;
  }

  await sub.save({ validateModifiedOnly: true });

  if (couponDoc) {
    try {
      await redeemCoupon(couponDoc, req.user._id, sub._id, couponDiscount);
    } catch (err) {
      console.error('Failed to record coupon redemption:', err.message);
    }
  }

  verifiedPayment.subscription = sub._id;
  verifiedPayment.package = sub.package?._id;
  verifiedPayment.vehicle = sub.vehicle?._id;
  verifiedPayment.type = 'extension';
  await verifiedPayment.save();

  await logActivity({
    type: 'subscription_extended',
    message: `${req.user.firstName} ${req.user.lastName} extended subscription for vehicle ${sub.vehicle?.model}`,
    metadata: { subscriptionId: sub._id, customerId: req.user._id, paymentId }
  });

  try {
    const customer = await Customer.findById(req.user._id).select('fcmTokens');
    if (customer?.fcmTokens?.length) {
      const newEndDateStr = sub.endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      sendPushNotification(customer.fcmTokens, {
        title: '🔄 Subscription Extended!',
        body: `Your plan has been extended by 30 days. New end date is ${newEndDateStr}.`,
        data: { type: 'subscription_extended', link: NOTIFICATION_LINKS.subscription_created },
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to send push notification:', err.message);
  }

  await clearCache(`cache:${req.user._id}:*`);
  res.json({ success: true, subscription: sub });
});

// ─── PLAN UPGRADE ────────────────────────────────
const UPGRADE_TIER_RANK = { BASIC: 0, STANDARD: 1, PREMIUM: 2 };
const tierRankOf = (pkg) => UPGRADE_TIER_RANK[(pkg?.tier || '').toUpperCase()] ?? 99;

const isVehicleEligibleForPkg = (vehicle, pkg) => {
  if (!pkg.applicableModels || pkg.applicableModels.length === 0) {
    return (vehicle.category || '').toLowerCase() === (pkg.category || '').toLowerCase();
  }
  const brandMatch = pkg.applicableModels.find(a => a.brand.toLowerCase() === (vehicle.brand || '').toLowerCase());
  if (!brandMatch) return false;
  if (!brandMatch.models || brandMatch.models.length === 0) return true;
  return brandMatch.models.some(m => m.toLowerCase() === (vehicle.model || '').toLowerCase());
};

/**
 * Switch an active subscription to a strictly-higher-tier package on a fresh 30-day term.
 * Validates tier + vehicle eligibility, recomputes the authoritative (discounted) amount.
 * Shared by the customer endpoint and the Razorpay redirect callback. `sub` must have
 * `package` and `vehicle` populated. Throws ApiError on invalid upgrades.
 */
export const applyUpgrade = async (sub, targetPkg) => {
  if (!sub.vehicle) throw new ApiError(400, 'Vehicle details missing on subscription');
  if (tierRankOf(targetPkg) <= tierRankOf(sub.package)) {
    throw new ApiError(400, 'You can only upgrade to a higher-tier plan');
  }
  if (!isVehicleEligibleForPkg(sub.vehicle, targetPkg)) {
    throw new ApiError(400, 'This plan is not available for your vehicle');
  }

  const config = await getDiscountConfig();
  const pricing = resolvePackageDiscount(targetPkg, sub.vehicle, config);
  const amount = pricing.hasDiscount ? pricing.effectivePrice : targetPkg.price;

  const start = getISTMidnight();
  const end = new Date(start);
  end.setDate(end.getDate() + 30);

  sub.package = targetPkg._id;
  sub.amount = amount;
  sub.discountPercent = pricing.hasDiscount ? pricing.percent : 0;
  sub.discountNote = pricing.hasDiscount ? pricing.note : '';
  sub.startDate = start;
  sub.endDate = end;
  sub.totalDays = 30;
  sub.remainingDays = 30;
  sub.completedDays = 0;
  sub.skippedDays = 0;
  sub.creditedDays = 0;
  sub.nextWash = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  await sub.save({ validateModifiedOnly: true });
  return sub;
};

export const upgradeSubscription = asyncHandler(async (req, res) => {
  const { packageId, paymentId } = req.body;
  if (!packageId) throw new ApiError(400, 'Target package is required');
  if (!paymentId) throw new ApiError(400, 'Payment ID is required');

  const sub = await Subscription.findOne({ _id: req.params.id, customer: req.user._id, status: 'Active' })
    .populate('package')
    .populate('vehicle');
  if (!sub) throw new ApiError(404, 'Active subscription not found');

  const targetPkg = await Package.findById(packageId);
  if (!targetPkg) throw new ApiError(404, 'Package not found');

  const verifiedPayment = await Payment.findOne({ paymentId, customer: req.user._id });
  if (!verifiedPayment) throw new ApiError(400, 'Payment not verified. Please complete payment before upgrading.');
  if (verifiedPayment.subscription) throw new ApiError(400, 'This payment has already been used.');

  await applyUpgrade(sub, targetPkg);

  verifiedPayment.subscription = sub._id;
  verifiedPayment.package = targetPkg._id;
  verifiedPayment.vehicle = sub.vehicle?._id;
  verifiedPayment.type = 'purchase';
  await verifiedPayment.save();

  await logActivity({
    type: 'subscription_upgraded',
    message: `${req.user.firstName} ${req.user.lastName} upgraded to ${targetPkg.name}`,
    metadata: { subscriptionId: sub._id, customerId: req.user._id, paymentId }
  });

  try {
    const customer = await Customer.findById(req.user._id).select('fcmTokens');
    if (customer?.fcmTokens?.length) {
      sendPushNotification(customer.fcmTokens, {
        title: '⭐ Plan Upgraded!',
        body: `Your plan is now ${targetPkg.name}. Enjoy the upgraded service!`,
        data: { type: 'subscription_upgraded', link: NOTIFICATION_LINKS.subscription_created },
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to send push notification:', err.message);
  }

  await clearCache(`cache:${req.user._id}:*`);
  res.json({ success: true, subscription: sub });
});

export const getPaymentHistory = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ customer: req.user._id, status: 'verified' })
    .populate('package', 'name price tier')
    .populate('vehicle', 'brand model number')
    .sort('-createdAt')
    .lean();

  // For backward compatibility, backfill package/vehicle if missing by searching Subscription
  for (const payment of payments) {
    if (!payment.package || !payment.vehicle) {
      const sub = await Subscription.findOne({ paymentId: payment.paymentId })
        .populate('package', 'name price tier')
        .populate('vehicle', 'brand model number')
        .lean();
      if (sub) {
        if (!payment.package) payment.package = sub.package;
        if (!payment.vehicle) payment.vehicle = sub.vehicle;
      }
    }
  }

  res.json({ success: true, payments });
});

export const getPaymentDetails = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ paymentId: req.params.paymentId, customer: req.user._id })
    .populate('package')
    .populate('vehicle')
    .populate('customer')
    .populate({
      path: 'subscription',
      populate: {
        path: 'society'
      }
    })
    .lean();

  if (!payment) throw new ApiError(404, 'Payment record not found');

  if (!payment.package || !payment.vehicle || !payment.subscription) {
    const sub = await Subscription.findOne({ paymentId: payment.paymentId })
      .populate('package')
      .populate('vehicle')
      .populate('society')
      .lean();
    if (sub) {
      if (!payment.package) payment.package = sub.package;
      if (!payment.vehicle) payment.vehicle = sub.vehicle;
      if (!payment.subscription) payment.subscription = sub;
    }
  }

  let method = 'Online';
  let payVia = 'Razorpay';
  let cardDetails = null;
  let upiDetails = null;

  if (razorpay) {
    try {
      const rzpPayment = await razorpay.payments.fetch(payment.paymentId);
      method = rzpPayment.method || 'Online';
      if (method === 'card' && rzpPayment.card) {
        cardDetails = {
          network: rzpPayment.card.network,
          last4: rzpPayment.card.last4,
          type: rzpPayment.card.type
        };
        payVia = rzpPayment.card.network || 'Card';
      } else if (method === 'upi') {
        upiDetails = {
          vpa: rzpPayment.vpa
        };
        payVia = rzpPayment.vpa ? rzpPayment.vpa.split('@')[1]?.toUpperCase() || 'UPI' : 'UPI';
      } else if (method === 'netbanking') {
        payVia = rzpPayment.bank || 'Netbanking';
      } else if (method === 'wallet') {
        payVia = rzpPayment.wallet || 'Wallet';
      }
    } catch (err) {
      // Razorpay SDK errors carry no `.message` — the real reason lives in
      // `err.error.description` (e.g. "The id provided does not exist", which
      // usually means a test/live key mismatch or a mock paymentId).
      const errMsg = err?.error?.description
        || err?.message
        || (err?.statusCode ? `Razorpay HTTP ${err.statusCode}` : null)
        || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      console.warn('Failed to fetch payment details from Razorpay:', errMsg);
    }
  }

  res.json({
    success: true,
    payment: {
      ...payment,
      method: method.charAt(0).toUpperCase() + method.slice(1),
      payVia,
      cardDetails,
      upiDetails
    }
  });
});

// ─── REQUEST SOCIETY (creates a Lead) ────────────
export const requestSociety = asyncHandler(async (req, res) => {
  const { requestedSociety, requestedArea, pincode, city } = req.body;

  if (!requestedSociety || !city) {
    throw new ApiError(400, 'Society name and city are required');
  }

  const { default: Lead } = await import('../models/Lead.js');

  const customer = await Customer.findById(req.user._id).select('firstName lastName phone email city');
  if (!customer) throw new ApiError(404, 'Customer not found');

  await Lead.create({
    name: `${customer.firstName} ${customer.lastName}`,
    phone: customer.phone,
    email: customer.email || '',
    city: city || customer.city,
    requestedSociety: requestedSociety.trim(),
    requestedArea: requestedArea?.trim() || '',
    pincode: pincode?.trim() || '',
    source: 'society_request',
    customerId: req.user._id,
    status: 'pending',
  });

  res.status(201).json({ success: true, message: 'Your society request has been submitted. We will get back to you soon!' });
});

// ─── CHANGE SOCIETY (update active subscription) ─
export const changeSociety = asyncHandler(async (req, res) => {
  const { subscriptionId, newSocietyId, newSlotId } = req.body;

  if (!subscriptionId || !newSocietyId || !newSlotId) {
    throw new ApiError(400, 'Subscription ID, new society ID, and slot ID are required');
  }

  const [sub, newSociety] = await Promise.all([
    Subscription.findOne({ _id: subscriptionId, customer: req.user._id, status: 'Active' }),
    Society.findById(newSocietyId),
  ]);

  if (!sub) throw new ApiError(404, 'Active subscription not found');
  if (!newSociety || !newSociety.isActive) throw new ApiError(404, 'Selected society not found or inactive');

  const slot = newSociety.slots.find(s => s.slotId === newSlotId);
  if (!slot) throw new ApiError(404, 'Selected time slot not found in this society');

  // Release old society slot count
  if (sub.society && sub.slot) {
    await Society.updateOne(
      { _id: sub.society, 'slots.slotId': sub.slot, 'slots.currentCount': { $gt: 0 } },
      { $inc: { 'slots.$.currentCount': -1 } }
    );
  }

  // Reserve slot in new society (atomic)
  const reserved = await Society.findOneAndUpdate(
    {
      _id: newSocietyId,
      slots: { $elemMatch: { slotId: newSlotId, status: 'Open', currentCount: { $lt: slot.maxVehicles } } }
    },
    { $inc: { 'slots.$.currentCount': 1 } },
    { returnDocument: 'after' }
  );

  if (!reserved) {
    // Restore old slot count if new one failed
    if (sub.society && sub.slot) {
      await Society.updateOne(
        { _id: sub.society, 'slots.slotId': sub.slot },
        { $inc: { 'slots.$.currentCount': 1 } }
      );
    }
    throw new ApiError(400, 'This time slot is full. Please choose a different slot.');
  }

  // Update the subscription society + slot
  sub.society = newSocietyId;
  sub.slot = newSlotId;
  await sub.save({ validateModifiedOnly: true });

  await clearCache(`cache:${req.user._id}:*`);
  await clearCache('cache:global:*');

  res.json({ success: true, message: 'Society updated successfully. Your plan and vehicle info have been preserved.' });
});

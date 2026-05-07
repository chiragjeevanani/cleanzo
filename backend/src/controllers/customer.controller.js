import Customer from '../models/Customer.js';
import Vehicle, { VEHICLE_PRICING } from '../models/Vehicle.js';
import Subscription from '../models/Subscription.js';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';


// ─── PROFILE ─────────────────────────────────────
export const getProfile = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.user._id).select('-__v');
  const vehicles = await Vehicle.find({ customer: req.user._id, isActive: true }).select('-__v');
  res.json({ success: true, user: customer, vehicles });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, city } = req.body;
  const customer = await Customer.findByIdAndUpdate(req.user._id, { name, email, city }, { new: true, runValidators: true });
  res.json({ success: true, user: customer });
});

// ─── VEHICLES ────────────────────────────────────
export const getVehicles = asyncHandler(async (req, res) => {
  const vehicles = await Vehicle.find({ customer: req.user._id, isActive: true }).sort('-createdAt');
  res.json({ success: true, vehicles });
});

export const addVehicle = asyncHandler(async (req, res) => {
  const { model, number, parking, color, type } = req.body;
  if (!model || !number) throw new ApiError(400, 'Model and number are required');
  const vehicle = await Vehicle.create({ customer: req.user._id, model, number, parking, color, type });
  res.status(201).json({ success: true, vehicle });
});

export const updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findOneAndUpdate(
    { _id: req.params.id, customer: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!vehicle) throw new ApiError(404, 'Vehicle not found');
  res.json({ success: true, vehicle });
});

export const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findOneAndUpdate(
    { _id: req.params.id, customer: req.user._id },
    { isActive: false },
    { new: true }
  );
  if (!vehicle) throw new ApiError(404, 'Vehicle not found');
  res.json({ success: true, message: 'Vehicle removed' });
});

// ─── SUBSCRIPTIONS ───────────────────────────────
export const getSubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await Subscription.find({ customer: req.user._id })
    .populate('vehicle', 'model number parking color')
    .populate('package', 'name tier price features')
    .populate('assignedCleaner', 'name phone rating')
    .sort('-createdAt');
  res.json({ success: true, subscriptions });
});

export const getSubscriptionById = asyncHandler(async (req, res) => {
  const sub = await Subscription.findOne({ _id: req.params.id, customer: req.user._id })
    .populate('vehicle', 'model number parking color')
    .populate('package', 'name tier price features perDay')
    .populate('assignedCleaner', 'name phone rating');
  if (!sub) throw new ApiError(404, 'Subscription not found');
  res.json({ success: true, subscription: sub });
});

export const getSocieties = asyncHandler(async (req, res) => {
  const { default: Society } = await import('../models/Society.js');
  // Return all active societies and their slots
  const societies = await Society.find({ isActive: true }).select('name city address slots');
  res.json({ success: true, societies });
});

export const createSubscription = asyncHandler(async (req, res) => {
  const { vehicleId, packageId, paymentId, societyId, slotId, specialInstructions, isTrial } = req.body;
  if (!vehicleId || !societyId || !slotId) {
    throw new ApiError(400, 'Vehicle, society, and slot are required');
  }
  if (!isTrial && !packageId) {
    throw new ApiError(400, 'Package is required for standard subscriptions');
  }

  const [vehicle, pkg, { default: Society }] = await Promise.all([
    Vehicle.findOne({ _id: vehicleId, customer: req.user._id, isActive: true }),
    packageId ? (await import('../models/Package.js')).default.findById(packageId) : null,
    import('../models/Society.js'),
  ]);

  if (!vehicle) throw new ApiError(404, 'Vehicle not found');
  if (!isTrial && !pkg) throw new ApiError(404, 'Package not found');

  const society = await Society.findById(societyId);
  if (!society || !society.isActive) throw new ApiError(404, 'Society not found or inactive');

  const slot = society.slots.find(s => s.slotId === slotId);
  if (!slot) throw new ApiError(404, 'Slot not found');

  let basePrice = isTrial ? 30 : (VEHICLE_PRICING[vehicle.category] || pkg.price);
  let priorityFee = 0;

  // Check slot capacity and apply priority fee if full
  if (slot.currentCount >= slot.maxVehicles) {
    priorityFee = 99;
  }

  // Calculate final amount
  let finalAmount = basePrice + priorityFee;

  // Apply Referral Discount (only for standard subscription, not trial)
  if (!isTrial && req.user.referralDiscount && req.user.referralDiscount.isActive) {
    const discount = finalAmount * (req.user.referralDiscount.percentage / 100);
    finalAmount = finalAmount - discount;

    // Deactivate discount after use
    req.user.referralDiscount.isActive = false;
    await req.user.save();
  }

  // Increment slot count
  await Society.updateOne(
    { _id: societyId, 'slots.slotId': slotId },
    { $inc: { 'slots.$.currentCount': 1 } }
  );

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (isTrial ? 1 : 30));

  const sub = await Subscription.create({
    customer: req.user._id,
    vehicle: vehicleId,
    package: packageId,
    society: societyId,
    slot: slotId,
    isTrial: isTrial || false,
    startDate,
    endDate,
    totalDays: isTrial ? 1 : 30,
    remainingDays: isTrial ? 1 : 30,
    nextWash: new Date(startDate.getTime() + 24 * 60 * 60 * 1000),
    amount: finalAmount,
    priorityFee,
    specialInstructions,
    paymentId,
  });

  // Referral Reward (Give referrer a discount)
  if (!isTrial && req.user.referredBy) {
    const { default: Customer } = await import('../models/Customer.js');
    const referrer = await Customer.findById(req.user.referredBy);
    if (referrer) {
      referrer.referralDiscount = {
        isActive: true,
        percentage: 25,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
      };
      await referrer.save();
    }
  }

  res.status(201).json({ success: true, subscription: sub });
});


export const skipService = asyncHandler(async (req, res) => {
  const { date } = req.body;
  if (!date) throw new ApiError(400, 'Date is required to skip service');

  const sub = await Subscription.findOne({ _id: req.params.id, customer: req.user._id });
  if (!sub) throw new ApiError(404, 'Subscription not found');
  if (sub.status !== 'Active') throw new ApiError(400, 'Only active subscriptions can be skipped');

  // BRD §10.1 — 1-day advance notice required
  const skipDate = new Date(date);
  skipDate.setHours(0, 0, 0, 0);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  if (skipDate < tomorrow) {
    throw new ApiError(400, 'Skip must be requested at least 1 day in advance');
  }

  // BRD §10.1 — Max 5 skip days per subscription period
  if (sub.skippedDays >= 5) {
    throw new ApiError(400, 'Maximum of 5 skip days allowed per subscription period');
  }

  // BRD §10.1 — Only one continuous skip sequence allowed
  // Check if there's already a skip on a non-adjacent day
  const existingSkips = await Task.find({
    subscription: sub._id,
    status: 'skipped',
    skipReason: 'Customer skip',
  }).sort('date');

  if (existingSkips.length > 0) {
    // Build the existing continuous skip range
    const sortedDates = existingSkips.map(t => new Date(t.date).toDateString());
    const firstSkip = new Date(existingSkips[0].date);
    const lastSkip = new Date(existingSkips[existingSkips.length - 1].date);

    // New skip must be adjacent (day before firstSkip or day after lastSkip)
    const dayBefore = new Date(firstSkip);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayAfter = new Date(lastSkip);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const isAdjacent =
      skipDate.toDateString() === dayBefore.toDateString() ||
      skipDate.toDateString() === dayAfter.toDateString() ||
      sortedDates.includes(skipDate.toDateString()); // already in sequence

    if (!isAdjacent) {
      throw new ApiError(
        400,
        'Only one continuous skip sequence is allowed. Your new skip date must be adjacent to your existing skip days.'
      );
    }
  }

  // Check if this date is already skipped
  const alreadySkipped = await Task.findOne({
    subscription: sub._id,
    date: skipDate,
    status: 'skipped',
    skipReason: 'Customer skip',
  });
  if (alreadySkipped) {
    throw new ApiError(400, 'This date is already marked as skipped');
  }

  // Create the skipped task
  await Task.create({
    subscription: sub._id,
    customer: req.user._id,
    vehicle: sub.vehicle,
    date: skipDate,
    status: 'skipped',
    skipReason: 'Customer skip',
    creditBack: false,
    packageName: 'N/A',
  });

  // BRD §10.2 — Auto-extend subscription endDate by 1 day per skip
  sub.skippedDays += 1;
  sub.endDate = new Date(sub.endDate.getTime() + 24 * 60 * 60 * 1000);
  await sub.save();

  res.json({
    success: true,
    message: 'Service skipped. Subscription extended by 1 day.',
    skippedDays: sub.skippedDays,
    newEndDate: sub.endDate,
  });
});


// ─── HISTORY ─────────────────────────────────────
export const getHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    Task.find({ customer: req.user._id })
      .populate('vehicle', 'model number')
      .populate('cleaner', 'name')
      .sort('-date')
      .skip(skip)
      .limit(limit),
    Task.countDocuments({ customer: req.user._id }),
  ]);

  res.json({ success: true, tasks, page, totalPages: Math.ceil(total / limit), total });
});

export const rateTask = asyncHandler(async (req, res) => {
  const { score, feedback } = req.body;
  if (!score || score < 1 || score > 5) throw new ApiError(400, 'Valid score (1-5) is required');

  const task = await Task.findOne({ _id: req.params.id, customer: req.user._id, status: 'completed' });
  if (!task) throw new ApiError(404, 'Completed task not found');

  const { default: Rating } = await import('../models/Rating.js');
  
  const existing = await Rating.findOne({ task: task._id });
  if (existing) throw new ApiError(400, 'Task already rated');

  const rating = await Rating.create({
    task: task._id,
    customer: req.user._id,
    cleaner: task.cleaner,
    score,
    feedback
  });

  res.status(201).json({ success: true, rating });
});

// ─── NOTIFICATIONS ───────────────────────────────
export const getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
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
  res.json({ success: true });
});

// ─── ADDRESSES ───────────────────────────────────
export const getAddresses = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.user._id).select('addresses');
  res.json({ success: true, addresses: customer.addresses || [] });
});

export const addAddress = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.user._id);
  customer.addresses.push(req.body);
  await customer.save();
  res.status(201).json({ success: true, addresses: customer.addresses });
});

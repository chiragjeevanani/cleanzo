import Customer from '../models/Customer.js';
import Vehicle, { VEHICLE_PRICING } from '../models/Vehicle.js';
import Subscription from '../models/Subscription.js';
import Payment from '../models/Payment.js';
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
  const customer = await Customer.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true });
  await clearCache(`cache:${req.user._id}:*`);
  res.json({ success: true, user: customer });
});

// ─── VEHICLES ────────────────────────────────────
export const getVehicles = asyncHandler(async (req, res) => {
  const vehicles = await Vehicle.find({ customer: req.user._id, isActive: true }).sort('-createdAt').lean();
  res.json({ success: true, vehicles });
});

export const addVehicle = asyncHandler(async (req, res) => {
  const { brand, model, number, parking, color, category } = req.body;
  if (!brand || !model || !number) throw new ApiError(400, 'Brand, model, and number are required');
  
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
    parking, 
    color, 
    category,
    photos 
  });
  
  await clearCache(`cache:${req.user._id}:*`);
  res.status(201).json({ success: true, vehicle });
});

export const updateVehicle = asyncHandler(async (req, res) => {
  const { brand, model, number, parking, color, category } = req.body;
  const vehicle = await Vehicle.findOneAndUpdate(
    { _id: req.params.id, customer: req.user._id },
    { brand, model, number, parking, color, category },
    { new: true, runValidators: true }
  );
  if (!vehicle) throw new ApiError(404, 'Vehicle not found');
  await clearCache(`cache:${req.user._id}:*`);
  res.json({ success: true, vehicle });
});

export const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findOneAndUpdate(
    { _id: req.params.id, customer: req.user._id },
    { isActive: false },
    { new: true }
  );
  if (!vehicle) throw new ApiError(404, 'Vehicle not found');
  await clearCache(`cache:${req.user._id}:*`);
  res.json({ success: true, message: 'Vehicle removed' });
});

// ─── SUBSCRIPTIONS ───────────────────────────────
export const getSubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await Subscription.find({ customer: req.user._id })
    .populate('vehicle', 'model number parking color')
    .populate('package', 'name tier price features')
    .populate('assignedCleaner', 'name phone rating')
    .sort('-createdAt')
    .lean();
    
  for (const sub of subscriptions) {
    if (sub.status === 'Active') {
      sub.nextWash = await calculateDynamicNextWash(sub._id);
    }
  }
  
  res.json({ success: true, subscriptions });
});

// Helper to calculate dynamic next wash
const calculateDynamicNextWash = async (subId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaysTask = await Task.findOne({
    subscription: subId,
    date: today,
  }).lean();

  let startDate = new Date(today);
  if (todaysTask && (todaysTask.status === 'completed' || todaysTask.status === 'missed')) {
    startDate.setDate(startDate.getDate() + 1);
  }

  const skippedTasks = await Task.find({
    subscription: subId,
    status: 'skipped',
    date: { $gte: startDate }
  }).lean();
  
  const skippedDates = new Set(skippedTasks.map(t => new Date(t.date).toDateString()));
  
  let checkDate = new Date(startDate);
  for (let i = 0; i < 30; i++) {
    if (!skippedDates.has(checkDate.toDateString())) {
      return checkDate;
    }
    checkDate.setDate(checkDate.getDate() + 1);
  }
  return checkDate;
};

export const getSubscriptionById = asyncHandler(async (req, res) => {
  const sub = await Subscription.findOne({ _id: req.params.id, customer: req.user._id })
    .populate('vehicle', 'model number parking color')
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

export const createSubscription = asyncHandler(async (req, res) => {
  const { vehicleId, packageId, paymentId, societyId, slotId, specialInstructions, isTrial } = req.body;
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
  const trialPrice = trialSetting?.value ?? 30;
  const prioritySlotFee = prioritySetting?.value ?? 99;

  let basePrice = isTrial ? trialPrice : (VEHICLE_PRICING[vehicle.category] || pkg.price);
  let priorityFee = 0;

  // Atomic slot increment: only succeeds if currentCount < maxVehicles
  const updatedSociety = await Society.findOneAndUpdate(
    { _id: societyId, slots: { $elemMatch: { slotId, currentCount: { $lt: slot.maxVehicles } } } },
    { $inc: { 'slots.$.currentCount': 1 } },
    { new: true }
  );

  if (!updatedSociety) {
    // Slot was full — apply priority fee (only for non-trial) and increment unconditionally
    if (!isTrial) priorityFee = prioritySlotFee;
    await Society.updateOne(
      { _id: societyId, 'slots.slotId': slotId },
      { $inc: { 'slots.$.currentCount': 1 } }
    );
  }

  // Calculate final amount
  let finalAmount = basePrice + priorityFee;

  // Apply Referral Discount (only for standard subscription, not trial)
  // Atomic update: only succeeds if discount is still active — eliminates race condition
  if (!isTrial && req.user.referralDiscount?.isActive) {
    const claimed = await Customer.findOneAndUpdate(
      { _id: req.user._id, 'referralDiscount.isActive': true },
      { $set: { 'referralDiscount.isActive': false } },
      { new: true }
    );
    if (claimed) {
      const discount = finalAmount * (req.user.referralDiscount.percentage / 100);
      finalAmount = finalAmount - discount;
    }
  }

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

  await logActivity({
    type: 'subscription_created',
    message: `${req.user.firstName} ${req.user.lastName} started ${isTrial ? 'Trial' : 'Standard'} subscription`,
    metadata: { subscriptionId: sub._id, customerId: req.user._id }
  });

  await clearCache(`cache:${req.user._id}:*`);
  res.status(201).json({ success: true, subscription: sub });
});


export const skipService = asyncHandler(async (req, res) => {
  const { date } = req.body;
  if (!date) throw new ApiError(400, 'Date is required to skip service');

  // Validate date is a proper ISO date string (YYYY-MM-DD or ISO 8601)
  const skipDate = new Date(date);
  if (isNaN(skipDate.getTime())) throw new ApiError(400, 'Invalid date format. Use YYYY-MM-DD.');
  skipDate.setHours(0, 0, 0, 0);

  const sub = await Subscription.findOne({ _id: req.params.id, customer: req.user._id });
  if (!sub) throw new ApiError(404, 'Subscription not found');
  if (sub.status !== 'Active') throw new ApiError(400, 'Only active subscriptions can be skipped');
  if (sub.isTrial) throw new ApiError(400, 'Trial subscriptions cannot be skipped');
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
  
  // Calculate the newly adjusted nextWash date
  sub.nextWash = await calculateDynamicNextWash(sub._id);
  
  await sub.save({ validateModifiedOnly: true });

  await clearCache(`cache:${req.user._id}:*`);
  res.json({
    success: true,
    message: 'Service skipped. Subscription extended by 1 day.',
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
  const { label, line1, line2, city, pincode, isDefault } = req.body;
  if (!line1 || !city) throw new ApiError(400, 'Address line1 and city are required');
  const customer = await Customer.findById(req.user._id);
  customer.addresses.push({ label, line1, line2, city, pincode, isDefault });
  await customer.save({ validateModifiedOnly: true });
  res.status(201).json({ success: true, addresses: customer.addresses });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.user._id);
  const index = customer.addresses.findIndex(a => a._id.toString() === req.params.id);
  if (index === -1) throw new ApiError(404, 'Address not found');
  customer.addresses.splice(index, 1);
  await customer.save({ validateModifiedOnly: true });
  res.json({ success: true, addresses: customer.addresses });
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

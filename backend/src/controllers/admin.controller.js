import Customer from '../models/Customer.js';
import Cleaner from '../models/Cleaner.js';
import { normalizePhone, timeAgo } from '../utils/helpers.js';
import Subscription from '../models/Subscription.js';
import Package from '../models/Package.js';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import Activity from '../models/Activity.js';
import Banner from '../models/Banner.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Vehicle from '../models/Vehicle.js';
import Rating from '../models/Rating.js';
import Society from '../models/Society.js';
import VehicleCategory from '../models/VehicleCategory.js';
import { uploadBufferToCloudinary } from '../services/cloudinary.service.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { clearCache } from '../middleware/cache.js';
import { getISTMidnight } from '../utils/dateHelper.js';
import { syncCleanerStats } from '../utils/cleanerStats.js';
import Testimonial from '../models/Testimonial.js';
import FAQ from '../models/FAQ.js';
import Brand from '../models/Brand.js';
import Grievance from '../models/Grievance.js';
import Admin from '../models/Admin.js';
import PartnerSociety from '../models/PartnerSociety.js';
import { sendPushNotification, NOTIFICATION_LINKS } from '../services/fcm.service.js';
import Attendance from '../models/Attendance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Settings from '../models/Settings.js';



// Helper to log activities
export const logActivity = async ({ type, message, performer, metadata }) => {
  try {
    await Activity.create({ type, message, performer, metadata });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

export const getProfile = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.user._id).select('-password -fcmTokens -__v');
  if (!admin) throw new ApiError(404, 'Admin not found');
  res.json({ success: true, admin });
});

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Please upload an image');
  const url = await uploadBufferToCloudinary(req.file.buffer);
  res.json({ success: true, url });
});

// ─── DASHBOARD ───────────────────────────────────
export const getDashboard = asyncHandler(async (req, res) => {
  const today = getISTMidnight();

  // Month boundaries for growth calculation
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(thisMonthStart);

  const [
    totalUsers,
    activeSubscriptions,
    activeCleaners,
    todayTasks,
    todayCompleted,
    totalRevenue,
    recentApplications,
    recentTasks,
    usersThisMonth,
    usersLastMonth,
    subsThisMonth,
    subsLastMonth,
    revenueThisMonth,
    revenueLastMonth,
    cleanersThisMonth,
    cleanersLastMonth,
    pendingOrdersCount,
    marketplaceRevenue,
    trialNotSubscribedCountRaw,
    inactiveSubscriptionsCount,
    trialToPaidRaw,
    engagementRaw,
    statusDistributionRaw,
    monthlyCreatedRaw,
    monthlyExpiredRaw,
  ] = await Promise.all([
    Customer.countDocuments({ isActive: true }),
    Subscription.countDocuments({ status: 'Active' }),
    Cleaner.countDocuments({ isActive: true, isAvailable: true }),
    Task.countDocuments({ date: { $gte: today } }),
    Task.countDocuments({ date: { $gte: today }, status: 'completed' }),
    Subscription.aggregate([{ $match: { status: { $in: ['Active', 'Expired'] } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    (await import('../models/CleanerApplication.js')).default.find().sort('-createdAt').limit(3).select('name status createdAt'),
    Task.find().sort('-createdAt').limit(5).populate('customer', 'firstName lastName').populate('cleaner', 'name').lean(),
    Customer.countDocuments({ isActive: true, createdAt: { $gte: thisMonthStart } }),
    Customer.countDocuments({ isActive: true, createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd } }),
    Subscription.countDocuments({ status: 'Active', createdAt: { $gte: thisMonthStart } }),
    Subscription.countDocuments({ status: 'Active', createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd } }),
    Subscription.aggregate([{ $match: { createdAt: { $gte: thisMonthStart } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Subscription.aggregate([{ $match: { createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Cleaner.countDocuments({ isActive: true, createdAt: { $gte: thisMonthStart } }),
    Cleaner.countDocuments({ isActive: true, createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd } }),
    Order.countDocuments({ status: { $in: ['Placed', 'Confirmed'] } }),
    Order.aggregate([{ $match: { status: { $ne: 'Cancelled' } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Subscription.aggregate([
      {
        $group: {
          _id: '$customer',
          hasTrial: { $max: { $cond: [{ $eq: ['$isTrial', true] }, 1, 0] } },
          hasStandard: { $max: { $cond: [{ $eq: ['$isTrial', false] }, 1, 0] } }
        }
      },
      { $match: { hasTrial: 1, hasStandard: 0 } },
      { $count: 'count' }
    ]),
    Subscription.countDocuments({ status: { $ne: 'Active' } }),
    Subscription.aggregate([
      {
        $group: {
          _id: '$customer',
          hasTrial: { $max: { $cond: [{ $eq: ['$isTrial', true] }, 1, 0] } },
          hasPaid: { $max: { $cond: [{ $eq: ['$isTrial', false] }, 1, 0] } }
        }
      },
      {
        $group: {
          _id: null,
          totalTrials: { $sum: '$hasTrial' },
          totalConverted: { $sum: { $cond: [{ $and: [{ $eq: ['$hasTrial', 1] }, { $eq: ['$hasPaid', 1] }] }, 1, 0] } }
        }
      }
    ]),
    Subscription.aggregate([
      {
        $group: {
          _id: null,
          totalCompleted: { $sum: '$completedDays' },
          totalSkipped: { $sum: '$skippedDays' },
          totalCredited: { $sum: '$creditedDays' },
          totalDays: { $sum: '$totalDays' },
          avgCompleted: { $avg: '$completedDays' },
          avgSkipped: { $avg: '$skippedDays' },
          avgCredited: { $avg: '$creditedDays' },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]),
    Subscription.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Subscription.aggregate([
      { $match: { createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 7)) } } },
      { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),
    Subscription.aggregate([
      { $match: { status: 'Expired', endDate: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 7)) } } },
      { $group: { _id: { month: { $month: '$endDate' }, year: { $year: '$endDate' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),
  ]);

  const calcGrowth = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const revThis = revenueThisMonth[0]?.total || 0;
  const revLast = revenueLastMonth[0]?.total || 0;

  // Plan distribution for Pie Chart
  const planDistribution = await Subscription.aggregate([
    { $match: { status: 'Active' } },
    { $lookup: { from: 'packages', localField: 'package', foreignField: '_id', as: 'pkg' } },
    { $unwind: '$pkg' },
    { $group: { _id: '$pkg.name', value: { $sum: 1 } } },
  ]);

  const colors = ['var(--primary-blue)', 'var(--accent-lime)', '#DFFF00', 'var(--text-tertiary)'];
  const pieData = planDistribution.map((p, i) => ({
    name: p._id,
    value: p.value,
    color: colors[i % colors.length]
  }));

  // Revenue Data for Area Chart (Last 7 months)
  const revenueDataRaw = await Subscription.aggregate([
    { $match: { createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 7)) } } },
    { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, revenue: { $sum: '$amount' } } },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const revenueData = revenueDataRaw.map(r => ({
    month: months[r._id.month],
    revenue: r.revenue
  }));

  // Customer Trend Data (Last 7 months)
  const customerDataRaw = await Customer.aggregate([
    { $match: { isActive: true, createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 7)) } } },
    { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);
  const customerData = customerDataRaw.map(c => ({
    month: months[c._id.month],
    users: c.count
  }));

  // Time Slot Distribution
  const slotDistributionRaw = await Subscription.aggregate([
    { $match: { status: 'Active', slot: { $exists: true, $ne: null, $ne: '' } } },
    { $group: { _id: '$slot', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  const slotDistribution = slotDistributionRaw.map(s => ({
    slot: s._id,
    count: s.count
  }));
  const mostUsedSlot = slotDistribution[0]?.slot || 'N/A';

  // Fetch Recent Activities from Activity model
  const recentActivitiesRaw = await Activity.find()
    .sort('-createdAt')
    .limit(10)
    .lean();

  const activity = recentActivitiesRaw.map(a => ({
    type: a.type,
    text: a.message,
    time: a.createdAt ? a.createdAt.toISOString() : null
  }));

  const { default: CleanerApplication } = await import('../models/CleanerApplication.js');
  const { default: Lead } = await import('../models/Lead.js');
  const [pendingApps, pendingKyc, pendingLeavesCount, pendingGrievancesCount, pendingLeadsCount] = await Promise.all([
    CleanerApplication.countDocuments({ status: 'pending' }),
    Cleaner.countDocuments({ kycStatus: 'pending' }),
    LeaveRequest.countDocuments({ status: 'pending' }),
    Grievance.countDocuments({ status: { $in: ['Open', 'In Progress'] } }),
    Lead.countDocuments({ status: 'pending' })
  ]);

  const subscriptionRevenue = totalRevenue[0]?.total || 0;
  const marketRevenue = marketplaceRevenue[0]?.total || 0;
  const totalRevVal = subscriptionRevenue + marketRevenue;
  const trialNotSubscribedCount = trialNotSubscribedCountRaw[0]?.count || 0;

  // Subscription Flow Metrics Processing
  const conversionData = trialToPaidRaw[0] || { totalTrials: 0, totalConverted: 0 };
  const trialConversionRate = conversionData.totalTrials > 0 
    ? Math.round((conversionData.totalConverted / conversionData.totalTrials) * 100) 
    : 0;

  const engagement = engagementRaw[0] || { totalCompleted: 0, totalSkipped: 0, totalCredited: 0, totalDays: 0, avgCompleted: 0, avgSkipped: 0, avgCredited: 0, avgAmount: 0 };
  const skipRatio = engagement.totalDays > 0 
    ? parseFloat(((engagement.totalSkipped / engagement.totalDays) * 100).toFixed(1)) 
    : 0;
  
  const statusCounts = statusDistributionRaw.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, { Active: 0, Paused: 0, Expired: 0, Cancelled: 0 });

  // Combine monthlyCreated and monthlyExpired into a single flow data array
  const flowMap = {};
  monthlyCreatedRaw.forEach(c => {
    const key = `${c._id.year}-${c._id.month}`;
    flowMap[key] = { month: months[c._id.month], created: c.count, expired: 0 };
  });
  monthlyExpiredRaw.forEach(e => {
    const key = `${e._id.year}-${e._id.month}`;
    if (flowMap[key]) {
      flowMap[key].expired = e.count;
    } else {
      flowMap[key] = { month: months[e._id.month], created: 0, expired: e.count };
    }
  });

  const monthlyFlow = Object.values(flowMap);

  res.json({
    success: true,
    usersCount: totalUsers,
    subscriptionsCount: activeSubscriptions,
    cleanersCount: activeCleaners,
    pendingApplicationsCount: pendingApps + pendingKyc,
    pendingOrdersCount,
    pendingLeavesCount,
    pendingGrievancesCount,
    pendingLeadsCount,
    revenue: totalRevVal,
    subscriptionRevenue,
    marketplaceRevenue: marketRevenue,
    trialNotSubscribedCount,
    inactiveSubscriptionsCount,
    customerData: customerData.length > 0 ? customerData : [{ month: 'N/A', users: 0 }],
    slotDistribution: slotDistribution.length > 0 ? slotDistribution : [{ slot: 'N/A', count: 0 }],
    mostUsedSlot,
    kpiData: [
      { label: 'Total Users', value: totalUsers, growth: calcGrowth(usersThisMonth, usersLastMonth), icon: 'Users', color: 'var(--primary-blue)' },
      { label: 'Subscriptions', value: activeSubscriptions, growth: calcGrowth(subsThisMonth, subsLastMonth), icon: 'CreditCard', color: 'var(--accent-lime)' },
      { label: "Total Revenue", value: `₹${totalRevVal.toLocaleString()}`, growth: calcGrowth(revThis, revLast), icon: 'TrendingUp', color: 'var(--success)' },
      { label: 'Pending Orders', value: pendingOrdersCount, growth: 0, icon: 'ShoppingCart', color: 'var(--warning)' },
    ],
    pieData: pieData.length > 0 ? pieData : [{ name: 'No Data', value: 1, color: 'var(--divider)' }],
    revenueData: revenueData.length > 0 ? revenueData : [{ month: 'N/A', revenue: 0 }],
    recentActivity: activity,
    subscriptionFlow: {
      trialConversionRate,
      skipRatio,
      statusCounts,
      averageMetrics: {
        avgCompleted: Math.round(engagement.avgCompleted || 0),
        avgSkipped: Math.round(engagement.avgSkipped || 0),
        avgCredited: Math.round(engagement.avgCredited || 0),
        avgAmount: Math.round(engagement.avgAmount || 0),
      },
      monthlyFlow: monthlyFlow.length > 0 ? monthlyFlow : [{ month: 'N/A', created: 0, expired: 0 }]
    }
  });
});

export const getAdminBadges = asyncHandler(async (req, res) => {
  const { default: CleanerApplication } = await import('../models/CleanerApplication.js');
  const { default: Lead } = await import('../models/Lead.js');
  const [pendingApps, pendingKyc, pendingOrdersCount, pendingLeavesCount, pendingGrievancesCount, pendingLeadsCount] = await Promise.all([
    CleanerApplication.countDocuments({ status: 'pending' }),
    Cleaner.countDocuments({ kycStatus: 'pending' }),
    Order.countDocuments({ status: { $in: ['Placed', 'Confirmed'] } }),
    LeaveRequest.countDocuments({ status: 'pending' }),
    Grievance.countDocuments({ status: { $in: ['Open', 'In Progress'] } }),
    Lead.countDocuments({ status: 'pending' })
  ]);

  res.json({ 
    success: true, 
    pendingApplicationsCount: pendingApps + pendingKyc, 
    pendingOrdersCount,
    pendingLeavesCount,
    pendingGrievancesCount,
    pendingLeadsCount
  });
});

// ─── USERS ───────────────────────────────────────
export const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limitQuery = req.query.limit;
  const limit = limitQuery === 'all' ? 1000000 : Math.min(parseInt(limitQuery) || 20, 100);
  const skip = limitQuery === 'all' ? 0 : (page - 1) * limit;
  const search = req.query.search || '';

  const escaped = search ? search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
  const filter = escaped
    ? { $or: [{ firstName: new RegExp(escaped, 'i') }, { lastName: new RegExp(escaped, 'i') }, { phone: new RegExp(escaped, 'i') }] }
    : {};

  const [users, total] = await Promise.all([
    Customer.find(filter).sort('-createdAt').skip(skip).limit(limit).select('-__v').lean(),
    Customer.countDocuments(filter),
  ]);

  res.json({ success: true, users, page, totalPages: Math.ceil(total / limit), total });
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await Customer.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  const subs = await Subscription.find({ customer: user._id }).populate('package', 'name').populate('vehicle', 'model number');
  const vehicles = await Vehicle.find({ customer: user._id, isActive: true });
  const orders = await Order.find({ customer: user._id }).populate('items.product', 'name');
  res.json({ success: true, user, subscriptions: subs, vehicles, orders });
});

export const createUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, email, city } = req.body;
  if (!firstName || !phone || !email || !city) {
    throw new ApiError(400, 'First name, phone, email, and city are required');
  }
  const normalized = normalizePhone(phone);
  const existing = await Customer.findOne({ phone: normalized });
  if (existing) throw new ApiError(409, 'A user with this phone number already exists');

  const user = await Customer.create({ firstName, lastName, phone: normalized, email, city });
  
  await logActivity({
    type: 'user_created',
    message: `Admin created new user: ${firstName} ${lastName}`,
    performer: req.user._id,
    metadata: { userId: user._id }
  });

  res.status(201).json({ success: true, user });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, city, isActive } = req.body;
  const user = await Customer.findByIdAndUpdate(req.params.id, { firstName, lastName, email, city, isActive }, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await Customer.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!user) throw new ApiError(404, 'User not found');

  await logActivity({
    type: 'user_deleted',
    message: `Admin deactivated user: ${user.firstName} ${user.lastName}`,
    performer: req.user._id,
    metadata: { userId: user._id }
  });

  res.json({ success: true, message: 'User deactivated successfully' });
});

export const getCleanerById = asyncHandler(async (req, res) => {
  await syncCleanerStats(req.params.id);
  const cleaner = await Cleaner.findById(req.params.id);
  if (!cleaner) throw new ApiError(404, 'Cleaner not found');
  
  const assignedSocieties = await Society.find({ cleaners: cleaner._id }).select('name city');
  const tasks = await Task.find({ cleaner: cleaner._id }).sort('-date').limit(20).populate('customer', 'firstName lastName').populate('vehicle', 'brand model number parking');
  const ratings = await Rating.find({ cleaner: cleaner._id }).sort('-createdAt').limit(10).populate('customer', 'firstName lastName');
  
  // Create a plain object and append assignedSocieties manually since it's not in the schema
  const cleanerData = cleaner.toObject();
  cleanerData.assignedSocieties = assignedSocieties;

  res.json({ success: true, cleaner: cleanerData, recentTasks: tasks, recentRatings: ratings });
});

// ─── CLEANERS ────────────────────────────────────
export const getCleaners = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limitQuery = req.query.limit;
  const limit = limitQuery === 'all' ? 1000000 : Math.min(parseInt(limitQuery) || 20, 100);
  const skip = limitQuery === 'all' ? 0 : (page - 1) * limit;

  const [cleaners, total] = await Promise.all([
    Cleaner.find().sort('-createdAt').skip(skip).limit(limit),
    Cleaner.countDocuments(),
  ]);

  // Sync cleaner stats dynamically before returning the list
  const syncedCleaners = await Promise.all(
    cleaners.map(async (c) => {
      await syncCleanerStats(c._id);
      return Cleaner.findById(c._id).lean();
    })
  );

  res.json({ success: true, cleaners: syncedCleaners, page, totalPages: Math.ceil(total / limit), total });
});

export const addCleaner = asyncHandler(async (req, res) => {
  const { 
    name, phone, email, age, city, assignedArea, dailyRate,
    fatherName, currentAddress, permanentAddress,
    referenceName, referencePhone 
  } = req.body;

  if (!name || !phone || !city) throw new ApiError(400, 'Name, phone, and city are required');
  
  const cleaner = await Cleaner.create({ 
    name, phone, email, age, city, assignedArea, dailyRate,
    fatherName, currentAddress, permanentAddress,
    localReference: { name: referenceName, phone: referencePhone }
  });

  await logActivity({
    type: 'cleaner_created',
    message: `Admin added new cleaner: ${name}`,
    performer: req.user._id,
    metadata: { cleanerId: cleaner._id }
  });

  res.status(201).json({ success: true, cleaner });
});

export const updateCleaner = asyncHandler(async (req, res) => {
  const { 
    name, phone, email, age, city, assignedArea, dailyRate, 
    isActive, isAvailable, kycStatus, kycRejectionNote,
    fatherName, currentAddress, permanentAddress,
    referenceName, referencePhone
  } = req.body;

  const updateData = { 
    name, phone, email, age, city, assignedArea, dailyRate, 
    isActive, isAvailable, kycStatus, kycRejectionNote,
    fatherName, currentAddress, permanentAddress
  };

  if (referenceName || referencePhone) {
    updateData.localReference = { name: referenceName, phone: referencePhone };
  }

  const cleaner = await Cleaner.findByIdAndUpdate(
    req.params.id, 
    updateData, 
    { new: true, runValidators: true }
  );
  if (!cleaner) throw new ApiError(404, 'Cleaner not found');
  res.json({ success: true, cleaner });
});

export const deleteCleaner = asyncHandler(async (req, res) => {
  const cleaner = await Cleaner.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!cleaner) throw new ApiError(404, 'Cleaner not found');

  await logActivity({
    type: 'cleaner_deleted',
    message: `Admin deactivated cleaner: ${cleaner.name}`,
    performer: req.user._id,
    metadata: { cleanerId: cleaner._id }
  });

  res.json({ success: true, message: 'Cleaner deactivated successfully' });
});


// ─── PACKAGES (Admin CRUD) ──────────────────────
export const getAllPackages = asyncHandler(async (req, res) => {
  const packages = await Package.find().sort('sortOrder');
  res.json({ success: true, packages });
});

export const createPackage = asyncHandler(async (req, res) => {
  const { name, tier, price, trialPrice, category, features, popular, sortOrder, applicableModels, showOnLanding } = req.body;
  if (!name || !price) throw new ApiError(400, 'Name and price are required');
  const pkg = await Package.create({ name, tier, price, trialPrice, category, features, popular, sortOrder, applicableModels, showOnLanding });
  await clearCache('cache:global:*');
  res.status(201).json({ success: true, package: pkg });
});

export const updatePackage = asyncHandler(async (req, res) => {
  const { name, tier, price, trialPrice, category, features, popular, sortOrder, isActive, applicableModels, showOnLanding } = req.body;
  const pkg = await Package.findByIdAndUpdate(
    req.params.id,
    { name, tier, price, trialPrice, category, features, popular, sortOrder, isActive, applicableModels, showOnLanding },
    { new: true, runValidators: true }
  );
  if (!pkg) throw new ApiError(404, 'Package not found');
  await clearCache('cache:global:*');
  res.json({ success: true, package: pkg });
});

export const deletePackage = asyncHandler(async (req, res) => {
  const pkg = await Package.findByIdAndDelete(req.params.id);
  if (!pkg) throw new ApiError(404, 'Package not found');
  await clearCache('cache:global:*');
  res.json({ success: true, message: 'Package deleted successfully' });
});

// ─── SUBSCRIPTIONS ───────────────────────────────
export const getAllSubscriptions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limitQuery = req.query.limit;
  const limit = limitQuery === 'all' ? 1000000 : Math.min(parseInt(limitQuery) || 20, 100);
  const skip = limitQuery === 'all' ? 0 : (page - 1) * limit;
  const status = req.query.status;

  const filter = status ? { status } : {};
  const [subs, total] = await Promise.all([
    Subscription.find(filter)
      .populate('customer', 'firstName lastName phone')
      .populate('vehicle', 'model number')
      .populate('package', 'name price')
      .populate('society', 'name')
      .sort('-createdAt').skip(skip).limit(limit),
    Subscription.countDocuments(filter),
  ]);
  res.json({ success: true, subscriptions: subs, page, totalPages: Math.ceil(total / limit), total });
});

// ─── REVENUE ─────────────────────────────────────
export const getRevenue = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [thisMonth, lastMonth, totalRevenue, topCustomersRaw, chartDataRaw] = await Promise.all([
    Subscription.aggregate([{ $match: { createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Subscription.aggregate([{ $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Subscription.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    Subscription.aggregate([
      { $group: { _id: '$customer', totalPaid: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { totalPaid: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' }
    ]),
    Subscription.aggregate([
      { $match: { createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 7)) } } },
      { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, revenue: { $sum: '$amount' }, subs: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ])
  ]);

  const tm = thisMonth[0]?.total || 0;
  const lm = lastMonth[0]?.total || 0;
  const trend = lm === 0 ? 100 : Math.round(((tm - lm) / lm) * 100);

  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  res.json({
    success: true,
    summary: [
      { label: 'This Month', value: `₹${tm.toLocaleString()}`, trend: `${trend > 0 ? '+' : ''}${trend}%`, trendColor: trend >= 0 ? 'var(--success)' : 'var(--error)' },
      { label: 'Last Month', value: `₹${lm.toLocaleString()}`, trend: 'Stable', trendColor: 'var(--text-tertiary)' },
      { label: 'All Time Total', value: `₹${(totalRevenue[0]?.total || 0).toLocaleString()}`, trend: '+100%', trendColor: 'var(--success)' },
    ],
    chartData: chartDataRaw.map(r => ({
      month: months[r._id.month],
      revenue: r.revenue,
      subscriptions: r.subs
    })),
    topCustomers: topCustomersRaw.map(c => ({
      name: `${c.user.firstName} ${c.user.lastName}`,
      plan: 'Active',
      months: c.count,
      total: `₹${c.totalPaid.toLocaleString()}`
    }))
  });
});

// ─── ADMIN NOTIFICATIONS (for admin panel) ───────
export const getAdminNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 30, 100);
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find({ recipientModel: { $in: ['Customer', 'Cleaner'] } })
      .sort('-createdAt').skip(skip).limit(limit)
      .populate('recipient', 'firstName lastName name phone'),
    Notification.countDocuments()
  ]);
  res.json({ success: true, notifications, page, total, totalPages: Math.ceil(total / limit) });
});

// ─── NOTIFICATIONS BROADCAST ─────────────────────
export const broadcastNotification = asyncHandler(async (req, res) => {
  const { title, message, type, target } = req.body; // target: 'all' | 'customers' | 'cleaners' | 'society'
  if (!title || !message) throw new ApiError(400, 'Title and message required');
  if (!target || !['all', 'customers', 'cleaners', 'society'].includes(target)) {
    throw new ApiError(400, "target must be one of: 'all', 'customers', 'cleaners', 'society'");
  }

  const BATCH_SIZE = 500;
  let totalSent = 0;
  const allFcmTokens = [];

  // Stream recipients via cursor — insert in-app records + collect FCM tokens
  const flushBatch = async (batch) => {
    if (batch.length === 0) return;
    await Notification.insertMany(batch, { ordered: false });
    totalSent += batch.length;
  };

  const processCursor = async (cursor, recipientModel) => {
    let batch = [];
    for await (const doc of cursor) {
      batch.push({ recipient: doc._id, recipientModel, type: type || 'system', title, message });
      // Collect FCM tokens for push delivery
      if (doc.fcmTokens?.length) allFcmTokens.push(...doc.fcmTokens);
      if (batch.length >= BATCH_SIZE) {
        await flushBatch(batch);
        batch = [];
      }
    }
    await flushBatch(batch);
  };

  if (target === 'all' || target === 'customers') {
    await processCursor(Customer.find({ isActive: true }).select('_id fcmTokens').cursor(), 'Customer');
  }
  if (target === 'all' || target === 'cleaners') {
    await processCursor(Cleaner.find({ isActive: true }).select('_id fcmTokens').cursor(), 'Cleaner');
  }
  if (target === 'all' || target === 'society') {
    await processCursor(PartnerSociety.find({ isActive: true }).select('_id fcmTokens').cursor(), 'PartnerSociety');
  }

  // Fire FCM push to all collected tokens (non-fatal)
  if (allFcmTokens.length > 0) {
    // Split into batches of 500 (FCM multicast limit)
    const tokenBatches = [];
    for (let i = 0; i < allFcmTokens.length; i += 500) {
      tokenBatches.push(allFcmTokens.slice(i, i + 500));
    }
    await Promise.allSettled(tokenBatches.map(tokens =>
      sendPushNotification(tokens, { title, body: message, data: { type: type || 'system', link: '/' } })
    ));
  }

  await logActivity({
    type: 'system',
    message: `Admin broadcasted "${title}" to ${target}`,
    performer: req.user._id,
    metadata: { title, target, recipients: totalSent, pushTokens: allFcmTokens.length }
  });

  res.json({ success: true, message: `Sent to ${totalSent} recipients (${allFcmTokens.length} push devices)` });
});


// ─── SOCIETIES ───────────────────────────────────
export const getSocieties = asyncHandler(async (req, res) => {
  const { default: Society } = await import('../models/Society.js');
  const societies = await Society.find().populate('cleaners', 'name phone').sort('-createdAt');
  res.json({ success: true, societies });
});

export const createSociety = asyncHandler(async (req, res) => {
  const { default: Society } = await import('../models/Society.js');
  const { name, state, city, area, pincode, address, slots, cleaners, isActive } = req.body;
  
  if (!name || !state || !city || !area || !pincode || !address) {
    throw new ApiError(400, 'Name, State, City, Area, Pincode and Address are required');
  }

  // Duplicate Check (case-insensitive check for society name in the same State and City)
  const existing = await Society.findOne({
    name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    state: { $regex: new RegExp(`^${state.trim()}$`, 'i') },
    city: { $regex: new RegExp(`^${city.trim()}$`, 'i') }
  });

  if (existing) {
    throw new ApiError(400, `Society "${name}" already exists in ${city}, ${state}`);
  }

  const society = await Society.create({ name, state, city, area, pincode, address, slots, cleaners, isActive });
  
  await logActivity({
    type: 'system',
    message: `Admin created society: ${name}`,
    performer: req.user._id,
    metadata: { societyId: society._id }
  });

  await clearCache('cache:global:*');
  res.status(201).json({ success: true, society });
});

export const updateSociety = asyncHandler(async (req, res) => {
  const { default: Society } = await import('../models/Society.js');
  const { name, state, city, area, pincode, address, slots, cleaners, isActive } = req.body;

  const current = await Society.findById(req.params.id);
  if (!current) throw new ApiError(404, 'Society not found');

  if (name || state || city) {
    const checkName = name ? name.trim() : current.name;
    const checkState = state ? state.trim() : (current.state || 'Maharashtra');
    const checkCity = city ? city.trim() : current.city;

    const existing = await Society.findOne({
      _id: { $ne: req.params.id },
      name: { $regex: new RegExp(`^${checkName}$`, 'i') },
      state: { $regex: new RegExp(`^${checkState}$`, 'i') },
      city: { $regex: new RegExp(`^${checkCity}$`, 'i') }
    });

    if (existing) {
      throw new ApiError(400, `Society "${checkName}" already exists in ${checkCity}, ${checkState}`);
    }
  }

  const society = await Society.findByIdAndUpdate(req.params.id, { name, state, city, area, pincode, address, slots, cleaners, isActive }, { new: true });

  await logActivity({
    type: 'system',
    message: `Admin updated society: ${society.name}`,
    performer: req.user._id,
    metadata: { societyId: society._id }
  });

  await clearCache('cache:global:*');
  res.json({ success: true, society });
});

export const deleteSociety = asyncHandler(async (req, res) => {
  const { default: Society } = await import('../models/Society.js');
  const society = await Society.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!society) throw new ApiError(404, 'Society not found');

  await logActivity({
    type: 'system',
    message: `Admin deactivated society: ${society.name}`,
    performer: req.user._id,
    metadata: { societyId: society._id }
  });

  res.json({ success: true, message: 'Society deactivated' });
});

// ─── LEADS ───────────────────────────────────────
export const getLeads = asyncHandler(async (req, res) => {
  const { default: Lead } = await import('../models/Lead.js');
  const leads = await Lead.find().sort('-createdAt');
  res.json({ success: true, leads });
});

export const updateLeadStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const { default: Lead } = await import('../models/Lead.js');
  const lead = await Lead.findByIdAndUpdate(req.params.id, { status, notes }, { new: true });
  if (!lead) throw new ApiError(404, 'Lead not found');
  res.json({ success: true, lead });
});

export const deleteLead = asyncHandler(async (req, res) => {
  const { default: Lead } = await import('../models/Lead.js');
  const lead = await Lead.findByIdAndDelete(req.params.id);
  if (!lead) throw new ApiError(404, 'Lead not found');
  res.json({ success: true, message: 'Lead deleted' });
});

// Cleaner Applications
export const getCleanerApplications = asyncHandler(async (req, res) => {
  const { default: CleanerApplication } = await import('../models/CleanerApplication.js');
  
  const [apps, kycRequestCleaners] = await Promise.all([
    CleanerApplication.find().sort('-createdAt'),
    Cleaner.find({ kycStatus: { $in: ['pending', 'rejected'] } }).sort('-updatedAt').select('name phone email city age fatherName currentAddress permanentAddress localReference kyc kycStatus kycRejectionNote createdAt')
  ]);

  // Convert KYC cleaners to a similar format for the frontend
  const kycRequests = kycRequestCleaners.map(c => ({
    _id: c._id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    city: c.city,
    age: c.age,
    fatherName: c.fatherName,
    currentAddress: c.currentAddress,
    permanentAddress: c.permanentAddress,
    localReference: c.localReference,
    kyc: c.kyc,
    status: c.kycStatus === 'rejected' ? 'rejected' : 'pending',
    rejectionNote: c.kycRejectionNote,
    createdAt: c.createdAt,
    isExistingCleaner: true
  }));

  res.json({ success: true, applications: [...apps, ...kycRequests] });
});

export const updateCleanerApplicationStatus = asyncHandler(async (req, res) => {
  const { status, rejectionNote } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    throw new ApiError(400, "Status must be 'approved' or 'rejected'");
  }
  if (status === 'rejected' && !rejectionNote) {
    throw new ApiError(400, 'Rejection note is required when rejecting');
  }
  const { default: CleanerApplication } = await import('../models/CleanerApplication.js');
  const { default: Cleaner } = await import('../models/Cleaner.js');

    const application = await CleanerApplication.findById(req.params.id);
    if (!application) throw new ApiError(404, 'Application not found');
  
    application.status = status;
    if (status === 'rejected') application.rejectionNote = rejectionNote;
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    await application.save({ validateModifiedOnly: true });
  
    const { sendSms } = await import('../services/sms.service.js');

    // Handle Approval
    if (status === 'approved') {
      const existing = await Cleaner.findOne({ phone: application.phone });
      if (existing) throw new ApiError(409, 'A cleaner with this phone number already exists');
      try {
        await Cleaner.create({
          name: application.name,
          phone: application.phone,
          email: application.email,
          city: application.city,
          age: application.age,
          fatherName: application.fatherName,
          currentAddress: application.currentAddress,
          permanentAddress: application.permanentAddress,
          localReference: application.localReference,
          avatar: application.kyc?.livePhoto,
          kycStatus: 'approved',
          kyc: {
            livePhoto: application.kyc?.livePhoto,
            aadhaarPhoto: application.kyc?.aadhaarPhoto,
            panPhoto: application.kyc?.panPhoto,
            submittedAt: application.createdAt,
          },
        });
      } catch (createErr) {
        if (createErr.code === 11000) throw new ApiError(409, 'A cleaner with this phone number already exists');
        throw createErr;
      }

      // Notify Cleaner of Approval
      await sendSms(
        application.phone,
        `Congratulations ${application.name}! Your application with Cleanzo has been approved. You can now login to the Cleaner App and start working.`,
        process.env.SMS_APPROVAL_TEMPLATE_ID
      );
    }
    
    // Handle Rejection
    if (status === 'rejected') {
      await sendSms(
        application.phone,
        `Dear ${application.name}, your application with Cleanzo has been rejected. Reason: ${rejectionNote}. You can contact support for details.`,
        process.env.SMS_REJECTION_TEMPLATE_ID
      );
    }
    
    await logActivity({
      type: status === 'approved' ? 'kyc_approved' : 'kyc_rejected',
      message: `${status === 'approved' ? 'Approved' : 'Rejected'} application from ${application.name}`,
      performer: req.user._id,
      metadata: { applicationId: application._id }
    });
  
    res.json({ success: true, application });
  });

export const deleteCleanerApplication = asyncHandler(async (req, res) => {
  const { default: CleanerApplication } = await import('../models/CleanerApplication.js');
  const application = await CleanerApplication.findByIdAndDelete(req.params.id);
  if (!application) throw new ApiError(404, 'Application not found');
  res.json({ success: true, message: 'Application deleted successfully' });
});

// ─── CLEANER KYC REVIEW ──────────────────────────
export const getCleanerKycList = asyncHandler(async (req, res) => {
  const status = req.query.status || 'pending';
  const cleaners = await Cleaner.find({ kycStatus: status })
    .select('name phone email city kycStatus kycRejectionNote kyc createdAt')
    .sort('-updatedAt');
  res.json({ success: true, cleaners });
});

export const reviewCleanerKyc = asyncHandler(async (req, res) => {
  const { status, rejectionNote } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    throw new ApiError(400, 'Status must be approved or rejected');
  }
  if (status === 'rejected' && !rejectionNote) {
    throw new ApiError(400, 'Rejection note is required when rejecting KYC');
  }

  const update = { kycStatus: status };
  if (status === 'rejected') update.kycRejectionNote = rejectionNote;
  if (status === 'approved') update.kycRejectionNote = null;

  const cleaner = await Cleaner.findByIdAndUpdate(req.params.id, update, { new: true })
    .select('name phone kycStatus kycRejectionNote');
  if (!cleaner) throw new ApiError(404, 'Cleaner not found');

  const { sendSms } = await import('../services/sms.service.js');
  if (status === 'approved') {
    await sendSms(cleaner.phone, `Congratulations ${cleaner.name}! Your KYC has been approved by Cleanzo. Your account is now fully active.`, process.env.SMS_APPROVAL_TEMPLATE_ID);
  } else {
    await sendSms(cleaner.phone, `Dear ${cleaner.name}, your KYC was rejected. Reason: ${rejectionNote}. Please resubmit via the app.`, process.env.SMS_REJECTION_TEMPLATE_ID);
  }

  await logActivity({
    type: status === 'approved' ? 'kyc_approved' : 'kyc_rejected',
    message: `KYC ${status} for ${cleaner.name}`,
    performer: req.user._id,
    metadata: { cleanerId: cleaner._id }
  });

  // ── Push Notification → Cleaner ──
  const freshCleaner = await Cleaner.findById(req.params.id).select('fcmTokens name');
  if (freshCleaner?.fcmTokens?.length) {
    sendPushNotification(freshCleaner.fcmTokens, {
      title: status === 'approved' ? '✅ KYC Approved!' : '❌ KYC Rejected',
      body: status === 'approved'
        ? 'Your account is now verified and fully active.'
        : `KYC rejected: ${rejectionNote}. Please resubmit.`,
      data: {
        type: status === 'approved' ? 'kyc_approved' : 'kyc_rejected',
        link: status === 'approved' ? NOTIFICATION_LINKS.kyc_approved : NOTIFICATION_LINKS.kyc_rejected,
      },
    }).catch(() => {});
  }

  res.json({ success: true, cleaner });
});

// ─── SETTINGS ─────────────────────────────────────
export const getSettings = asyncHandler(async (req, res) => {
  const { default: Settings } = await import('../models/Settings.js');
  const settings = await Settings.find().sort('key');
  res.json({ success: true, settings });
});

export const updateSetting = asyncHandler(async (req, res) => {
  const { value } = req.body;
  if (value === undefined) throw new ApiError(400, 'Value is required');

  const { default: Settings } = await import('../models/Settings.js');
  const setting = await Settings.findOneAndUpdate(
    { key: req.params.key },
    { value },
    { new: true, upsert: false }
  );
  if (!setting) throw new ApiError(404, `Setting '${req.params.key}' not found`);
  res.json({ success: true, setting });
});

// ─── BANNERS ─────────────────────────────────────
export const getBanners = asyncHandler(async (req, res) => {
  const banners = await Banner.find().sort('-createdAt');
  res.json({ success: true, banners });
});

export const createBanner = asyncHandler(async (req, res) => {
  const { title, description, imageUrl, link } = req.body;
  if (!title || !imageUrl) throw new ApiError(400, 'Title and Image URL are required');
  const banner = await Banner.create({ title, description, imageUrl, link });
  await clearCache('cache:global:*');
  res.status(201).json({ success: true, banner });
});

export const deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) throw new ApiError(404, 'Banner not found');
  await clearCache('cache:global:*');
  res.json({ success: true, message: 'Banner deleted successfully' });
});

// ─── MARKETPLACE: PRODUCTS ────────────────────────
export const getProducts = asyncHandler(async (req, res) => {
  const products = await Product.find().sort('-createdAt');
  res.json({ success: true, products });
});

export const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, discountPrice, images, category, stock, specifications } = req.body;
  
  if (!name || !description || !price || !images || !images.length) {
    throw new ApiError(400, 'Name, description, price, and at least one image are required');
  }

  const product = await Product.create({
    name, description, price, discountPrice, images, category, stock, specifications
  });

  await logActivity({
    type: 'product_created',
    message: `New product added: ${name}`,
    metadata: { productId: product._id }
  });

  await clearCache('cache:global:*');
  res.status(201).json({ success: true, product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!product) throw new ApiError(404, 'Product not found');

  await logActivity({
    type: 'product_updated',
    message: `Product updated: ${product.name}`,
    metadata: { productId: product._id }
  });

  await clearCache('cache:global:*');
  res.json({ success: true, product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  await logActivity({
    type: 'product_deleted',
    message: `Product deleted: ${product.name}`,
    metadata: { productId: product._id }
  });

  await clearCache('cache:global:*');
  res.json({ success: true, message: 'Product deleted successfully' });
});

// ─── MARKETPLACE: ORDERS ──────────────────────────
export const getMarketplaceOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate('customer', 'firstName lastName phone email')
    .populate('items.product', 'name images')
    .sort('-createdAt');
  res.json({ success: true, orders });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, trackingId, courierPartner, paymentStatus } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');

  if (status) order.status = status;
  if (trackingId) order.trackingId = trackingId;
  if (courierPartner) order.courierPartner = courierPartner;
  if (paymentStatus) order.paymentStatus = paymentStatus;

  if (status === 'Delivered') order.deliveredAt = new Date();
  if (status === 'Cancelled') order.cancelledAt = new Date();

  await order.save();

  await logActivity({
    type: 'order_status_updated',
    message: `Order ${order.orderId} status updated to ${status || order.status}`,
    metadata: { orderId: order._id, status }
  });

  res.json({ success: true, order });
});

export const assignCleanerToSubscription = asyncHandler(async (req, res) => {
  const { subscriptionId } = req.params;
  const { cleanerId } = req.body;

  const subscription = await Subscription.findById(subscriptionId).populate('society').populate('package');
  if (!subscription) throw new ApiError(404, 'Subscription not found');

  const cleaner = await Cleaner.findById(cleanerId);
  if (!cleaner) throw new ApiError(404, 'Cleaner not found');
  if (!cleaner.isActive) throw new ApiError(400, 'Cannot assign a deactivated cleaner');
  if (!cleaner.isAvailable) throw new ApiError(400, 'This cleaner is currently marked as unavailable');

  // Block assignment if the cleaner has an approved leave for today
  const todayForLeave = getISTMidnight();
  const leaveToday = await LeaveRequest.findOne({
    cleaner: cleanerId,
    date: todayForLeave,
    status: 'approved',
  });
  if (leaveToday) {
    throw new ApiError(400, 'This cleaner has an approved leave for today and cannot be assigned');
  }

  if (subscription.status === 'Expired' || subscription.status === 'Cancelled') {
    throw new ApiError(400, 'Cannot assign cleaner to an expired or cancelled subscription');
  }

  if (subscription.isTrial && subscription.completedDays >= 1) {
    throw new ApiError(400, 'Trial subscription has already been used');
  }

  const previousCleanerId = subscription.assignedCleaner || null;
  subscription.assignedCleaner = cleanerId;
  await subscription.save();

  // Automatically create or update today's task
  const today = getISTMidnight();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Find today's task using a range to be safe with timezones
  const existingTask = await Task.findOne({
    subscription: subscriptionId,
    date: { $gte: today, $lt: tomorrow }
  });

  if (!existingTask) {
    let scheduledTime = '07:00 AM';
    if (subscription.society && subscription.slot) {
      const slot = subscription.society.slots?.find(s => s.slotId === subscription.slot);
      if (slot?.timeWindow) scheduledTime = slot.timeWindow.split(' - ')[0];
    }

    try {
      await Task.create({
        subscription: subscriptionId,
        customer: subscription.customer,
        cleaner: cleanerId,
        vehicle: subscription.vehicle,
        date: today,
        scheduledTime,
        status: 'pending',
        packageName: subscription.package?.name || (subscription.isTrial ? 'Trial' : 'Standard'),
      });
    } catch (createErr) {
      if (createErr.code !== 11000) {
        throw createErr;
      }
      // If a task was created in parallel, just update its cleaner
      const duplicateTask = await Task.findOne({
        subscription: subscriptionId,
        date: { $gte: today, $lt: tomorrow }
      });
      if (duplicateTask) {
        duplicateTask.cleaner = cleanerId;
        await duplicateTask.save();
      }
    }
  } else {
    // Force update the cleaner even if one was already assigned (handles re-assignment)
    existingTask.cleaner = cleanerId;
    await existingTask.save();
  }

  // Recalculate stats for the new cleaner and the old cleaner
  await syncCleanerStats(cleanerId);
  if (previousCleanerId && previousCleanerId.toString() !== cleanerId.toString()) {
    await syncCleanerStats(previousCleanerId);
  }

  await logActivity({
    type: 'cleaner_assigned',
    message: `Cleaner ${cleaner.name} assigned to subscription for ${subscription.customer}`,
    metadata: { subscriptionId, cleanerId }
  });

  // ── Push Notification: task assigned ──
  try {
    if (cleaner.fcmTokens?.length) {
      const locName = subscription.society?.name || 'assigned area';
      sendPushNotification(cleaner.fcmTokens, {
        title: '🧹 New Task Assigned!',
        body: `You have a wash job at ${locName} today.`,
        data: { type: 'task_assigned', link: NOTIFICATION_LINKS.task_assigned },
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to send task assigned push notification:', err.message);
  }

  res.json({ success: true, message: 'Cleaner assigned successfully and task generated', subscription });
});

// ─── VEHICLE CATEGORIES ───────────────────────────
export const getVehicleCategories = asyncHandler(async (req, res) => {
  const categories = await VehicleCategory.find().sort('sortOrder name');
  res.json({ success: true, categories });
});

export const addVehicleCategory = asyncHandler(async (req, res) => {
  const { name, slug, description, icon, sortOrder } = req.body;
  if (!name || !slug) throw new ApiError(400, 'Name and slug are required');
  const category = await VehicleCategory.create({ name, slug, description, icon, sortOrder });
  await logActivity({ type: 'vehicle_category_create', message: `Added vehicle category: ${name}`, performer: req.user._id });
  res.status(201).json({ success: true, category });
});

export const updateVehicleCategory = asyncHandler(async (req, res) => {
  const category = await VehicleCategory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!category) throw new ApiError(404, 'Category not found');
  await logActivity({ type: 'vehicle_category_update', message: `Updated vehicle category: ${category.name}`, performer: req.user._id });
  res.json({ success: true, category });
});

export const deleteVehicleCategory = asyncHandler(async (req, res) => {
  const category = await VehicleCategory.findByIdAndDelete(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  await logActivity({ type: 'vehicle_category_delete', message: `Deleted vehicle category: ${category.name}`, performer: req.user._id });
  res.json({ success: true, message: 'Category deleted' });
});

// ─── MAINTENANCE: CLEANUP DUPLICATE TASKS ────────
/**
 * POST /api/admin/maintenance/cleanup-duplicate-tasks
 * Finds tasks where the same cleaner has multiple entries for the same vehicle
 * on the same day (happens when a customer has overlapping subscriptions).
 * Keeps the most-advanced-status task and deletes the rest.
 * Then resyncs completion stats for all affected cleaners.
 */
export const cleanupDuplicateTasks = asyncHandler(async (req, res) => {
  const statusPriority = { completed: 4, 'in-progress': 3, pending: 2, missed: 1, skipped: 0, rain: 0, curfew: 0 };

  const duplicates = await Task.aggregate([
    {
      $group: {
        _id: { cleaner: '$cleaner', vehicle: '$vehicle', date: '$date' },
        count: { $sum: 1 },
        tasks: { $push: { id: '$_id', status: '$status' } }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]);

  if (duplicates.length === 0) {
    return res.json({ success: true, message: 'No duplicate tasks found', deleted: 0 });
  }

  const toDelete = [];
  for (const group of duplicates) {
    const sorted = group.tasks.sort(
      (a, b) => (statusPriority[b.status] ?? 0) - (statusPriority[a.status] ?? 0)
    );
    const [, ...discard] = sorted;
    toDelete.push(...discard.map(d => d.id));
  }

  const result = await Task.deleteMany({ _id: { $in: toDelete } });

  const affectedCleanerIds = [...new Set(
    duplicates.map(d => d._id.cleaner?.toString()).filter(Boolean)
  )];
  await Promise.all(affectedCleanerIds.map(id => syncCleanerStats(id)));

  await logActivity({
    type: 'maintenance',
    message: `Cleanup: removed ${result.deletedCount} duplicate task(s) across ${duplicates.length} group(s)`,
    performer: req.user._id,
  });

  res.json({
    success: true,
    message: `Deleted ${result.deletedCount} duplicate task(s). Stats resynced for ${affectedCleanerIds.length} cleaner(s).`,
    deleted: result.deletedCount,
    groupsFound: duplicates.length,
  });
});

// ─── TESTIMONIALS ─────────────────────────────────
export const getTestimonials = asyncHandler(async (req, res) => {
  const testimonials = await Testimonial.find().sort('sortOrder -createdAt');
  res.json({ success: true, testimonials });
});

export const createTestimonial = asyncHandler(async (req, res) => {
  const { name, role, text, rating, isActive, sortOrder } = req.body;
  if (!name || !role || !text) throw new ApiError(400, 'Name, role, and text are required');
  const testimonial = await Testimonial.create({ name, role, text, rating, isActive, sortOrder });
  await clearCache('cache:global:*');
  await logActivity({
    type: 'system',
    message: `Admin added testimonial from ${name}`,
    performer: req.user._id,
    metadata: { testimonialId: testimonial._id }
  });
  res.status(201).json({ success: true, testimonial });
});

export const updateTestimonial = asyncHandler(async (req, res) => {
  const { name, role, text, rating, isActive, sortOrder } = req.body;
  const testimonial = await Testimonial.findByIdAndUpdate(
    req.params.id,
    { name, role, text, rating, isActive, sortOrder },
    { new: true, runValidators: true }
  );
  if (!testimonial) throw new ApiError(404, 'Testimonial not found');
  await clearCache('cache:global:*');
  res.json({ success: true, testimonial });
});

export const deleteTestimonial = asyncHandler(async (req, res) => {
  const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
  if (!testimonial) throw new ApiError(404, 'Testimonial not found');
  await clearCache('cache:global:*');
  res.json({ success: true, message: 'Testimonial deleted' });
});

// ─── FAQs ─────────────────────────────────────────
export const getFaqs = asyncHandler(async (req, res) => {
  const faqs = await FAQ.find().sort('sortOrder -createdAt');
  res.json({ success: true, faqs });
});

export const createFaq = asyncHandler(async (req, res) => {
  const { question, answer, isActive, sortOrder } = req.body;
  if (!question || !answer) throw new ApiError(400, 'Question and answer are required');
  const faq = await FAQ.create({ question, answer, isActive, sortOrder });
  await clearCache('cache:global:*');
  await logActivity({
    type: 'system',
    message: `Admin added FAQ: ${question.substring(0, 60)}`,
    performer: req.user._id,
    metadata: { faqId: faq._id }
  });
  res.status(201).json({ success: true, faq });
});

export const updateFaq = asyncHandler(async (req, res) => {
  const { question, answer, isActive, sortOrder } = req.body;
  const faq = await FAQ.findByIdAndUpdate(
    req.params.id,
    { question, answer, isActive, sortOrder },
    { new: true, runValidators: true }
  );
  if (!faq) throw new ApiError(404, 'FAQ not found');
  await clearCache('cache:global:*');
  res.json({ success: true, faq });
});

export const deleteFaq = asyncHandler(async (req, res) => {
  const faq = await FAQ.findByIdAndDelete(req.params.id);
  if (!faq) throw new ApiError(404, 'FAQ not found');
  await clearCache('cache:global:*');
  res.json({ success: true, message: 'FAQ deleted' });
});

// ─── BRANDS & MODELS ──────────────────────────────
export const getBrands = asyncHandler(async (req, res) => {
  const brands = await Brand.find().sort('name');
  res.json({ success: true, brands });
});

export const createBrand = asyncHandler(async (req, res) => {
  const { name, models, isActive } = req.body;
  if (!name) throw new ApiError(400, 'Brand name is required');
  const brand = await Brand.create({ name, models: models || [], isActive: isActive !== false });
  await clearCache('cache:global:*');
  await logActivity({
    type: 'system',
    message: `Admin added Brand: ${name}`,
    performer: req.user._id,
    metadata: { brandId: brand._id }
  });
  res.status(201).json({ success: true, brand });
});

export const updateBrand = asyncHandler(async (req, res) => {
  const { name, models, isActive } = req.body;
  const brand = await Brand.findByIdAndUpdate(
    req.params.id,
    { name, models: models || [], isActive },
    { new: true, runValidators: true }
  );
  if (!brand) throw new ApiError(404, 'Brand not found');
  await clearCache('cache:global:*');
  res.json({ success: true, brand });
});

export const deleteBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findByIdAndDelete(req.params.id);
  if (!brand) throw new ApiError(404, 'Brand not found');
  await clearCache('cache:global:*');
  res.json({ success: true, message: 'Brand deleted' });
});

export const getGrievances = asyncHandler(async (req, res) => {
  const grievances = await Grievance.find()
    .populate('customer', 'name phone email')
    .sort('-createdAt');
  res.json({ success: true, grievances });
});

export const updateGrievance = asyncHandler(async (req, res) => {
  const { status, adminNotes } = req.body;
  const grievance = await Grievance.findById(req.params.id);
  if (!grievance) throw new ApiError(404, 'Grievance not found');

  if (status) grievance.status = status;
  if (adminNotes !== undefined) grievance.adminNotes = adminNotes;

  await grievance.save();

  // Optionally send notification to user here if needed in the future

  res.json({ success: true, grievance });
});


// ─── PARTNER SOCIETIES ────────────────────────────────────────

export const getPartnerSocieties = asyncHandler(async (req, res) => {
  const { default: PartnerSociety } = await import('../models/PartnerSociety.js');
  const partners = await PartnerSociety.find()
    .populate('society', 'name city area')
    .select('-password')
    .sort('-createdAt')
    .lean();
  res.json({ success: true, partners });
});

export const createPartnerSociety = asyncHandler(async (req, res) => {
  const { default: PartnerSociety } = await import('../models/PartnerSociety.js');
  const { societyId, contactName, email, password, phone, commissionRate } = req.body;
  if (!societyId || !contactName || !email || !password) {
    throw new ApiError(400, 'Society, contact name, email, and password are required');
  }

  const existing = await PartnerSociety.findOne({ society: societyId });
  if (existing) throw new ApiError(400, 'This society is already enrolled as a partner');

  const partner = await PartnerSociety.create({
    society: societyId, contactName, email, password, phone,
    commissionRate: commissionRate ?? 5,
  });

  const populated = await PartnerSociety.findById(partner._id)
    .populate('society', 'name city area')
    .select('-password');

  res.status(201).json({ success: true, partner: populated });
});

export const updatePartnerSociety = asyncHandler(async (req, res) => {
  const { default: PartnerSociety } = await import('../models/PartnerSociety.js');
  const { contactName, phone, commissionRate, isActive, newPassword } = req.body;

  const partner = await PartnerSociety.findById(req.params.id);
  if (!partner) throw new ApiError(404, 'Partner society not found');

  if (contactName !== undefined) partner.contactName = contactName;
  if (phone !== undefined) partner.phone = phone;
  if (commissionRate !== undefined) partner.commissionRate = commissionRate;
  if (isActive !== undefined) partner.isActive = isActive;
  if (newPassword) partner.password = newPassword; // pre-save hook hashes it

  await partner.save({ validateModifiedOnly: true });

  const updated = await PartnerSociety.findById(partner._id)
    .populate('society', 'name city area')
    .select('-password');

  res.json({ success: true, partner: updated });
});

export const deletePartnerSociety = asyncHandler(async (req, res) => {
  const { default: PartnerSociety } = await import('../models/PartnerSociety.js');
  const partner = await PartnerSociety.findByIdAndDelete(req.params.id);
  if (!partner) throw new ApiError(404, 'Partner society not found');
  res.json({ success: true, message: 'Partner society removed' });
});

export const getPartnerSocietyCommissions = asyncHandler(async (req, res) => {
  const { default: SocietyCommission } = await import('../models/SocietyCommission.js');
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const [commissions, total] = await Promise.all([
    SocietyCommission.find({ partnerSociety: req.params.id })
      .populate('customer', 'firstName lastName phone')
      .populate('subscription', 'amount startDate')
      .sort('-createdAt').skip(skip).limit(limit).lean(),
    SocietyCommission.countDocuments({ partnerSociety: req.params.id }),
  ]);

  res.json({ success: true, commissions, page, totalPages: Math.ceil(total / limit), total });
});

// ─── PAYOUT REQUESTS (ADMIN) ─────────────────────────────────

export const getPayoutRequests = asyncHandler(async (req, res) => {
  const { default: SocietyPayoutRequest } = await import('../models/SocietyPayoutRequest.js');
  const status = req.query.status || 'pending';
  const requests = await SocietyPayoutRequest.find(status !== 'all' ? { status } : {})
    .populate('partnerSociety', 'contactName email society')
    .sort('-createdAt')
    .lean();
  res.json({ success: true, requests });
});

export const processPayoutRequest = asyncHandler(async (req, res) => {
  const { default: SocietyPayoutRequest } = await import('../models/SocietyPayoutRequest.js');
  const { default: SocietyCommission } = await import('../models/SocietyCommission.js');
  const { default: PartnerSociety } = await import('../models/PartnerSociety.js');
  const { action, adminRemark } = req.body; // action: 'approve' | 'reject'

  if (!['approve', 'reject'].includes(action)) throw new ApiError(400, 'Action must be approve or reject');

  const request = await SocietyPayoutRequest.findById(req.params.id);
  if (!request) throw new ApiError(404, 'Payout request not found');
  if (request.status !== 'pending') throw new ApiError(400, 'Request already processed');

  request.status = action === 'approve' ? 'approved' : 'rejected';
  request.adminRemark = adminRemark || '';
  request.processedAt = new Date();
  request.processedBy = req.user._id;
  await request.save();

  if (action === 'approve') {
    // Mark pending commissions as paid up to the requested amount
    const pendingCommissions = await SocietyCommission.find({
      partnerSociety: request.partnerSociety,
      status: 'pending',
    }).sort('createdAt');

    let remaining = request.amount;
    const toMark = [];
    for (const c of pendingCommissions) {
      if (remaining <= 0) break;
      toMark.push(c._id);
      remaining -= c.commissionAmount;
    }
    await SocietyCommission.updateMany({ _id: { $in: toMark } }, { status: 'paid' });

    // Update pendingBalance on PartnerSociety
    await PartnerSociety.findByIdAndUpdate(request.partnerSociety, {
      $inc: { pendingBalance: -request.amount },
    });
  }

  res.json({ success: true, request, message: `Payout request ${action === 'approve' ? 'approved' : 'rejected'} successfully` });
});

// ─── FCM TOKEN ───────────────────────────────────

export const saveFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, 'FCM token is required');
  const admin = await Admin.findById(req.user._id);
  if (!admin.fcmTokens.includes(token)) {
    admin.fcmTokens.push(token);
    if (admin.fcmTokens.length > 10) admin.fcmTokens = admin.fcmTokens.slice(-10);
    await admin.save({ validateModifiedOnly: true });
  }
  res.json({ success: true, message: 'FCM token saved' });
});

export const removeFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, 'FCM token is required');
  await Admin.findByIdAndUpdate(req.user._id, { $pull: { fcmTokens: token } });
  res.json({ success: true, message: 'FCM token removed' });
});

// ─── LEAVE MANAGEMENT ──────────────────────────────

export const getLeaveRequests = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = {};
  if (status && status !== 'all') {
    query.status = status;
  }
  const leaveRequests = await LeaveRequest.find(query)
    .populate('cleaner', 'name phone email city assignedArea')
    .sort('-date');
  res.json({ success: true, leaveRequests });
});

export const reviewLeaveRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;
  
  if (!status || !['approved', 'rejected'].includes(status)) {
    throw new ApiError(400, 'Invalid status. Must be approved or rejected.');
  }

  const leaveReq = await LeaveRequest.findById(id);
  if (!leaveReq) throw new ApiError(404, 'Leave request not found');

  if (leaveReq.status !== 'pending') {
    throw new ApiError(400, `This leave request has already been ${leaveReq.status}`);
  }

  leaveReq.status = status;
  if (status === 'rejected') {
    leaveReq.rejectionReason = rejectionReason || '';
  }
  await leaveReq.save();

  if (status === 'approved') {
    // 1. Mark cleaner as 'leave' in Attendance collection
    await Attendance.findOneAndUpdate(
      { cleaner: leaveReq.cleaner, date: leaveReq.date },
      { status: 'leave' },
      { upsert: true, new: true }
    );

    // 2. Unassign tasks assigned to this cleaner on this date.
    // Include 'in-progress' too — cleaner may have just started and then
    // gone on leave; the task still needs reassignment.
    const result = await Task.updateMany(
      { cleaner: leaveReq.cleaner, date: leaveReq.date, status: { $in: ['pending', 'in-progress'] } },
      { $unset: { cleaner: "" } }
    );
    
    await logActivity({
      type: 'leave_approved',
      message: `Admin approved leave request for cleaner: ${leaveReq.cleaner} on date ${leaveReq.date.toLocaleDateString()}`,
      performer: req.user._id,
      metadata: { leaveRequestId: id, cleanerId: leaveReq.cleaner, tasksUnassigned: result.modifiedCount }
    });
  } else {
    await logActivity({
      type: 'leave_rejected',
      message: `Admin rejected leave request for cleaner: ${leaveReq.cleaner} on date ${leaveReq.date.toLocaleDateString()}`,
      performer: req.user._id,
      metadata: { leaveRequestId: id, cleanerId: leaveReq.cleaner, reason: rejectionReason }
    });
  }

  res.json({ success: true, leaveRequest: leaveReq, message: `Leave request ${status} successfully` });
});

// ─── ATTENDANCE OVERRIDES ───────────────────────────

export const getCleanerAttendanceLogs = asyncHandler(async (req, res) => {
  const { date, month, year } = req.query;
  
  let query = {};
  
  if (date) {
    query.date = getISTMidnight(new Date(date));
  } else if (month && year) {
    const start = new Date(parseInt(year), parseInt(month), 1);
    const end = new Date(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59, 999);
    query.date = { $gte: start, $lte: end };
  } else {
    // Default to today
    query.date = getISTMidnight();
  }

  // Find all attendance records
  const records = await Attendance.find(query).populate('cleaner', 'name phone email assignedArea city');
  
  res.json({ success: true, records });
});

export const updateCleanerAttendance = asyncHandler(async (req, res) => {
  const { cleanerId, date, status, checkIn, checkOut, note } = req.body;
  
  if (!cleanerId || !date || !status) {
    throw new ApiError(400, 'cleanerId, date, and status are required');
  }

  if (!['present', 'absent', 'leave'].includes(status)) {
    throw new ApiError(400, 'Invalid status. Must be present, absent, or leave');
  }

  const targetDate = getISTMidnight(new Date(date));

  const updatedRecord = await Attendance.findOneAndUpdate(
    { cleaner: cleanerId, date: targetDate },
    { 
      status,
      checkIn: checkIn ? new Date(checkIn) : undefined,
      checkOut: checkOut ? new Date(checkOut) : undefined,
      note: note || ''
    },
    { upsert: true, new: true }
  );

  // If manual status is set to leave, unassign pending and in-progress tasks
  if (status === 'leave') {
    await Task.updateMany(
      { cleaner: cleanerId, date: targetDate, status: { $in: ['pending', 'in-progress'] } },
      { $unset: { cleaner: "" } }
    );
  }

  await logActivity({
    type: 'attendance_override',
    message: `Admin manually updated attendance status of cleaner ${cleanerId} on ${targetDate.toLocaleDateString()} to ${status}`,
    performer: req.user._id,
    metadata: { cleanerId, date: targetDate, status }
  });

  res.json({ success: true, record: updatedRecord, message: 'Attendance updated successfully' });
});


// ─── TRUSTED SOCIETIES (CMS) ─────────────────────
export const getTrustedSocieties = asyncHandler(async (req, res) => {
  const setting = await Settings.findOne({ key: 'trustedSocieties' });
  const defaultData = { heading: 'TRUSTED BY RESIDENTS OF', items: [] };
  res.json({ success: true, data: setting ? setting.value : defaultData });
});

export const updateTrustedSocieties = asyncHandler(async (req, res) => {
  const { heading, items } = req.body;
  if (!heading || !Array.isArray(items)) {
    throw new ApiError(400, 'heading (string) and items (array) are required');
  }
  const data = { heading, items };
  await Settings.findOneAndUpdate(
    { key: 'trustedSocieties' },
    { key: 'trustedSocieties', value: data, description: 'Trusted societies shown on landing page hero' },
    { upsert: true, new: true }
  );
  await clearCache('cache:global:*');
  res.json({ success: true, data });
});

// ─── CITY MANAGEMENT ─────────────────────────────
export const getCities = asyncHandler(async (req, res) => {
  const { default: City } = await import('../models/City.js');
  const cities = await City.find().sort('name');
  res.json({ success: true, cities });
});

export const createCity = asyncHandler(async (req, res) => {
  const { default: City } = await import('../models/City.js');
  const { name, state, isActive, launchDate } = req.body;
  if (!name || !state) {
    throw new ApiError(400, 'City name and State are required');
  }
  
  // check for existing city
  const existing = await City.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
  if (existing) {
    throw new ApiError(400, `City "${name}" already exists`);
  }

  const city = await City.create({ 
    name: name.trim(), 
    state: state.trim(), 
    isActive: isActive !== false, 
    launchDate: launchDate ? new Date(launchDate) : undefined 
  });
  
  await logActivity({
    type: 'system',
    message: `Admin created city: ${name}`,
    performer: req.user._id,
    metadata: { cityId: city._id }
  });

  await clearCache('cache:global:*');
  res.status(201).json({ success: true, city });
});

export const updateCity = asyncHandler(async (req, res) => {
  const { default: City } = await import('../models/City.js');
  const { name, state, isActive, launchDate } = req.body;
  
  const city = await City.findById(req.params.id);
  if (!city) throw new ApiError(404, 'City not found');

  if (name) {
    // Check if name is taken by another city
    const existing = await City.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      _id: { $ne: req.params.id }
    });
    if (existing) {
      throw new ApiError(400, `City "${name}" already exists`);
    }
    city.name = name.trim();
  }
  if (state) city.state = state.trim();
  if (isActive !== undefined) city.isActive = isActive;
  city.launchDate = launchDate ? new Date(launchDate) : undefined;

  await city.save();

  await logActivity({
    type: 'system',
    message: `Admin updated city: ${city.name}`,
    performer: req.user._id,
    metadata: { cityId: city._id }
  });

  await clearCache('cache:global:*');
  res.json({ success: true, city });
});

export const deleteCity = asyncHandler(async (req, res) => {
  const { default: City } = await import('../models/City.js');
  const city = await City.findByIdAndDelete(req.params.id);
  if (!city) throw new ApiError(404, 'City not found');

  await logActivity({
    type: 'system',
    message: `Admin deleted city: ${city.name}`,
    performer: req.user._id,
    metadata: { cityId: city._id }
  });

  await clearCache('cache:global:*');
  res.json({ success: true, message: 'City deleted successfully' });
});

// ─── MARKETPLACE CATEGORIES ───────────────────────
export const getMarketplaceCategories = asyncHandler(async (req, res) => {
  const { default: MarketplaceCategory } = await import('../models/MarketplaceCategory.js');
  const categories = await MarketplaceCategory.find().sort('sortOrder name');
  res.json({ success: true, categories });
});

export const createMarketplaceCategory = asyncHandler(async (req, res) => {
  const { default: MarketplaceCategory } = await import('../models/MarketplaceCategory.js');
  const { name, icon, description, isActive, sortOrder } = req.body;
  if (!name || !icon) throw new ApiError(400, 'Category Name and Icon are required');

  const existing = await MarketplaceCategory.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
  if (existing) throw new ApiError(400, `Category "${name}" already exists`);

  const category = await MarketplaceCategory.create({
    name: name.trim(),
    icon: icon.trim(),
    description: description || '',
    isActive: isActive !== false,
    sortOrder: sortOrder ? Number(sortOrder) : 0
  });

  await logActivity({
    type: 'system',
    message: `Admin created marketplace category: ${name}`,
    performer: req.user._id,
    metadata: { categoryId: category._id }
  });

  await clearCache('cache:global:*');
  res.status(201).json({ success: true, category });
});

export const updateMarketplaceCategory = asyncHandler(async (req, res) => {
  const { default: MarketplaceCategory } = await import('../models/MarketplaceCategory.js');
  const { name, icon, description, isActive, sortOrder } = req.body;

  const category = await MarketplaceCategory.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');

  if (name) {
    const existing = await MarketplaceCategory.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      _id: { $ne: req.params.id }
    });
    if (existing) throw new ApiError(400, `Category "${name}" already exists`);
    category.name = name.trim();
  }
  if (icon) category.icon = icon.trim();
  if (description !== undefined) category.description = description;
  if (isActive !== undefined) category.isActive = isActive;
  if (sortOrder !== undefined) category.sortOrder = Number(sortOrder);

  await category.save();

  await logActivity({
    type: 'system',
    message: `Admin updated marketplace category: ${category.name}`,
    performer: req.user._id,
    metadata: { categoryId: category._id }
  });

  await clearCache('cache:global:*');
  res.json({ success: true, category });
});

export const deleteMarketplaceCategory = asyncHandler(async (req, res) => {
  const { default: MarketplaceCategory } = await import('../models/MarketplaceCategory.js');
  const category = await MarketplaceCategory.findByIdAndDelete(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');

  await logActivity({
    type: 'system',
    message: `Admin deleted marketplace category: ${category.name}`,
    performer: req.user._id,
    metadata: { categoryId: category._id }
  });

  await clearCache('cache:global:*');
  res.json({ success: true, message: 'Category deleted successfully' });
});



import Customer from '../models/Customer.js';
import Cleaner from '../models/Cleaner.js';
import { normalizePhone, timeAgo } from '../utils/helpers.js';
import Subscription from '../models/Subscription.js';
import Package from '../models/Package.js';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// ─── DASHBOARD ───────────────────────────────────
export const getDashboard = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  // Recent Activity Mapping — sort by raw timestamp before formatting
  const activity = [
    ...recentApplications.map(a => ({ text: `New application from ${a.name}`, _ts: a.createdAt })),
    ...recentTasks.filter(t => t.status === 'completed').map(t => ({ text: `${t.cleaner?.name || 'Cleaner'} completed task for ${t.customer ? `${t.customer.firstName} ${t.customer.lastName}` : 'User'}`, _ts: t.updatedAt })),
  ]
    .sort((a, b) => new Date(b._ts) - new Date(a._ts))
    .slice(0, 8)
    .map(({ text, _ts }) => ({ text, time: timeAgo(_ts) }));

  res.json({
    success: true,
    usersCount: totalUsers,
    subscriptionsCount: activeSubscriptions,
    cleanersCount: activeCleaners,
    revenue: totalRevenue[0]?.total || 0,
    kpiData: [
      { label: 'Total Users', value: totalUsers, growth: calcGrowth(usersThisMonth, usersLastMonth), icon: 'Users', color: 'var(--primary-blue)' },
      { label: 'Subscriptions', value: activeSubscriptions, growth: calcGrowth(subsThisMonth, subsLastMonth), icon: 'CreditCard', color: 'var(--accent-lime)' },
      { label: "Total Revenue", value: `₹${(totalRevenue[0]?.total || 0).toLocaleString()}`, growth: calcGrowth(revThis, revLast), icon: 'TrendingUp', color: 'var(--success)' },
      { label: 'Live Crew', value: activeCleaners, growth: calcGrowth(cleanersThisMonth, cleanersLastMonth), icon: 'UserCog', color: 'var(--warning)' },
    ],
    pieData: pieData.length > 0 ? pieData : [{ name: 'No Data', value: 1, color: 'var(--divider)' }],
    revenueData: revenueData.length > 0 ? revenueData : [{ month: 'N/A', revenue: 0 }],
    recentActivity: activity
  });
});

// ─── USERS ───────────────────────────────────────
export const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;
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
  res.json({ success: true, user, subscriptions: subs });
});

export const createUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, email, city, password } = req.body;
  if (!firstName || !phone || !email || !city) {
    throw new ApiError(400, 'First name, phone, email, and city are required');
  }
  const normalized = normalizePhone(phone);
  const existing = await Customer.findOne({ phone: normalized });
  if (existing) throw new ApiError(409, 'A user with this phone number already exists');

  // Admin must supply a temporary password, or we generate one
  const { randomBytes } = await import('crypto');
  const tempPassword = password || randomBytes(6).toString('hex'); // 12-char hex

  const user = await Customer.create({ firstName, lastName, phone: normalized, email, city, password: tempPassword });
  res.status(201).json({ success: true, user, tempPassword: password ? undefined : tempPassword });
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
  res.json({ success: true, message: 'User deactivated successfully' });
});

// ─── CLEANERS ────────────────────────────────────
export const getCleaners = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const [cleaners, total] = await Promise.all([
    Cleaner.find().sort('-createdAt').skip(skip).limit(limit).lean(),
    Cleaner.countDocuments(),
  ]);
  res.json({ success: true, cleaners, page, totalPages: Math.ceil(total / limit), total });
});

export const addCleaner = asyncHandler(async (req, res) => {
  const { name, phone, city, assignedArea } = req.body;
  if (!name || !phone || !city) throw new ApiError(400, 'Name, phone, and city are required');
  const cleaner = await Cleaner.create({ name, phone, city, assignedArea });
  res.status(201).json({ success: true, cleaner });
});

export const updateCleaner = asyncHandler(async (req, res) => {
  const { name, phone, email, city, assignedArea, dailyRate, isActive, isAvailable, kycStatus, kycRejectionNote } = req.body;
  const cleaner = await Cleaner.findByIdAndUpdate(req.params.id, { name, phone, email, city, assignedArea, dailyRate, isActive, isAvailable, kycStatus, kycRejectionNote }, { new: true, runValidators: true });
  if (!cleaner) throw new ApiError(404, 'Cleaner not found');
  res.json({ success: true, cleaner });
});

export const deleteCleaner = asyncHandler(async (req, res) => {
  const cleaner = await Cleaner.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!cleaner) throw new ApiError(404, 'Cleaner not found');
  res.json({ success: true, message: 'Cleaner deactivated successfully' });
});

// ─── PACKAGES (Admin CRUD) ──────────────────────
export const getAllPackages = asyncHandler(async (req, res) => {
  const packages = await Package.find().sort('sortOrder');
  res.json({ success: true, packages });
});

export const createPackage = asyncHandler(async (req, res) => {
  const { name, tier, price, category, features, popular, sortOrder } = req.body;
  if (!name || !price) throw new ApiError(400, 'Name and price are required');
  const pkg = await Package.create({ name, tier, price, category, features, popular, sortOrder });
  res.status(201).json({ success: true, package: pkg });
});

export const updatePackage = asyncHandler(async (req, res) => {
  const { name, tier, price, category, features, popular, sortOrder, isActive } = req.body;
  const pkg = await Package.findByIdAndUpdate(
    req.params.id,
    { name, tier, price, category, features, popular, sortOrder, isActive },
    { new: true, runValidators: true }
  );
  if (!pkg) throw new ApiError(404, 'Package not found');
  res.json({ success: true, package: pkg });
});

// ─── SUBSCRIPTIONS ───────────────────────────────
export const getAllSubscriptions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;
  const status = req.query.status;

  const filter = status ? { status } : {};
  const [subs, total] = await Promise.all([
    Subscription.find(filter)
      .populate('customer', 'firstName lastName phone')
      .populate('vehicle', 'model number')
      .populate('package', 'name price')
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
  const { title, message, type, target } = req.body; // target: 'all' | 'customers' | 'cleaners'
  if (!title || !message) throw new ApiError(400, 'Title and message required');
  if (!target || !['all', 'customers', 'cleaners'].includes(target)) {
    throw new ApiError(400, "target must be one of: 'all', 'customers', 'cleaners'");
  }

  const BATCH_SIZE = 500;
  let totalSent = 0;

  // Stream recipients via cursor and insert in batches — avoids loading all IDs into memory
  const flushBatch = async (batch) => {
    if (batch.length === 0) return;
    await Notification.insertMany(batch, { ordered: false });
    totalSent += batch.length;
  };

  const processCursor = async (cursor, recipientModel) => {
    let batch = [];
    for await (const doc of cursor) {
      batch.push({ recipient: doc._id, recipientModel, type: type || 'system', title, message });
      if (batch.length >= BATCH_SIZE) {
        await flushBatch(batch);
        batch = [];
      }
    }
    await flushBatch(batch);
  };

  if (target === 'all' || target === 'customers') {
    await processCursor(Customer.find({ isActive: true }).select('_id').cursor(), 'Customer');
  }
  if (target === 'all' || target === 'cleaners') {
    await processCursor(Cleaner.find({ isActive: true }).select('_id').cursor(), 'Cleaner');
  }

  res.json({ success: true, message: `Sent to ${totalSent} recipients` });
});

// ─── SOCIETIES ───────────────────────────────────
export const getSocieties = asyncHandler(async (req, res) => {
  const { default: Society } = await import('../models/Society.js');
  const societies = await Society.find().populate('cleaners', 'name phone').sort('-createdAt');
  res.json({ success: true, societies });
});

export const createSociety = asyncHandler(async (req, res) => {
  const { default: Society } = await import('../models/Society.js');
  const { name, city, address, slots, cleaners, isActive } = req.body;
  const society = await Society.create({ name, city, address, slots, cleaners, isActive });
  res.status(201).json({ success: true, society });
});

export const updateSociety = asyncHandler(async (req, res) => {
  const { default: Society } = await import('../models/Society.js');
  const { name, city, address, slots, cleaners, isActive } = req.body;
  const society = await Society.findByIdAndUpdate(req.params.id, { name, city, address, slots, cleaners, isActive }, { new: true });
  if (!society) throw new ApiError(404, 'Society not found');
  res.json({ success: true, society });
});

export const deleteSociety = asyncHandler(async (req, res) => {
  const { default: Society } = await import('../models/Society.js');
  const society = await Society.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!society) throw new ApiError(404, 'Society not found');
  res.json({ success: true, message: 'Society deactivated' });
});

// Cleaner Applications
export const getCleanerApplications = asyncHandler(async (req, res) => {
  const { default: CleanerApplication } = await import('../models/CleanerApplication.js');
  const applications = await CleanerApplication.find().sort('-createdAt');
  res.json({ success: true, applications });
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

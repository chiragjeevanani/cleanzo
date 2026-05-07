import Customer from '../models/Customer.js';
import Cleaner from '../models/Cleaner.js';
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
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const [
    totalUsers, 
    activeSubscriptions, 
    activeCleaners, 
    todayTasks, 
    todayCompleted, 
    totalRevenue,
    recentApplications,
    recentTasks
  ] = await Promise.all([
    Customer.countDocuments({ isActive: true }),
    Subscription.countDocuments({ status: 'Active' }),
    Cleaner.countDocuments({ isActive: true, isAvailable: true }),
    Task.countDocuments({ date: { $gte: today } }),
    Task.countDocuments({ date: { $gte: today }, status: 'completed' }),
    Subscription.aggregate([{ $match: { status: { $in: ['Active', 'Expired'] } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    (await import('../models/CleanerApplication.js')).default.find().sort('-createdAt').limit(3).select('name status createdAt'),
    Task.find().sort('-createdAt').limit(5).populate('customer', 'name').populate('cleaner', 'name')
  ]);

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

  // Recent Activity Mapping
  const activity = [
    ...recentApplications.map(a => ({ text: `New application from ${a.name}`, time: 'Recently' })),
    ...recentTasks.filter(t => t.status === 'completed').map(t => ({ text: `${t.cleaner?.name || 'Cleaner'} completed task for ${t.customer?.name || 'User'}`, time: 'Just now' }))
  ].slice(0, 8);

  res.json({
    success: true,
    usersCount: totalUsers,
    subscriptionsCount: activeSubscriptions,
    cleanersCount: activeCleaners,
    revenue: totalRevenue[0]?.total || 0,
    kpiData: [
      { label: 'Total Users', value: totalUsers, growth: 12, icon: 'Users', color: 'var(--primary-blue)' },
      { label: 'Subscriptions', value: activeSubscriptions, growth: 8, icon: 'CreditCard', color: 'var(--accent-lime)' },
      { label: "Total Revenue", value: `₹${(totalRevenue[0]?.total || 0).toLocaleString()}`, growth: 15, icon: 'TrendingUp', color: 'var(--success)' },
      { label: 'Live Crew', value: activeCleaners, growth: 5, icon: 'UserCog', color: 'var(--warning)' },
    ],
    pieData: pieData.length > 0 ? pieData : [{ name: 'No Data', value: 1, color: 'var(--divider)' }],
    revenueData: revenueData.length > 0 ? revenueData : [{ month: 'N/A', revenue: 0 }],
    recentActivity: activity
  });
});

// ─── USERS ───────────────────────────────────────
export const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';

  const filter = search
    ? { $or: [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }] }
    : {};

  const [users, total] = await Promise.all([
    Customer.find(filter).sort('-createdAt').skip(skip).limit(limit).select('-__v'),
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

export const updateUser = asyncHandler(async (req, res) => {
  const user = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, user });
});

// ─── CLEANERS ────────────────────────────────────
export const getCleaners = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [cleaners, total] = await Promise.all([
    Cleaner.find().sort('-createdAt').skip(skip).limit(limit),
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
  const cleaner = await Cleaner.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!cleaner) throw new ApiError(404, 'Cleaner not found');
  res.json({ success: true, cleaner });
});

// ─── PACKAGES (Admin CRUD) ──────────────────────
export const getAllPackages = asyncHandler(async (req, res) => {
  const packages = await Package.find().sort('sortOrder');
  res.json({ success: true, packages });
});

export const createPackage = asyncHandler(async (req, res) => {
  const pkg = await Package.create(req.body);
  res.status(201).json({ success: true, package: pkg });
});

export const updatePackage = asyncHandler(async (req, res) => {
  const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!pkg) throw new ApiError(404, 'Package not found');
  res.json({ success: true, package: pkg });
});

// ─── SUBSCRIPTIONS ───────────────────────────────
export const getAllSubscriptions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const status = req.query.status;

  const filter = status ? { status } : {};
  const [subs, total] = await Promise.all([
    Subscription.find(filter)
      .populate('customer', 'name phone')
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
      subscriptions: r.subs * 1000 // Just for visual scale in the line chart
    })),
    topCustomers: topCustomersRaw.map(c => ({
      name: c.user.name,
      plan: 'Active',
      months: c.count,
      total: `₹${c.totalPaid.toLocaleString()}`
    }))
  });
});

// ─── NOTIFICATIONS BROADCAST ─────────────────────
export const broadcastNotification = asyncHandler(async (req, res) => {
  const { title, message, type, target } = req.body; // target: 'all' | 'customers' | 'cleaners'
  if (!title || !message) throw new ApiError(400, 'Title and message required');

  let recipients = [];
  if (target === 'all' || target === 'customers') {
    const customers = await Customer.find({ isActive: true }).select('_id');
    recipients.push(...customers.map(c => ({ recipient: c._id, recipientModel: 'Customer' })));
  }
  if (target === 'all' || target === 'cleaners') {
    const cleaners = await Cleaner.find({ isActive: true }).select('_id');
    recipients.push(...cleaners.map(c => ({ recipient: c._id, recipientModel: 'Cleaner' })));
  }

  const notifications = recipients.map(r => ({
    ...r, type: type || 'system', title, message,
  }));

  await Notification.insertMany(notifications);
  res.json({ success: true, message: `Sent to ${recipients.length} recipients` });
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
  const society = await Society.findByIdAndDelete(req.params.id);
  if (!society) throw new ApiError(404, 'Society not found');
  res.json({ success: true, message: 'Society deleted' });
});

// Cleaner Applications
export const getCleanerApplications = asyncHandler(async (req, res) => {
  const { default: CleanerApplication } = await import('../models/CleanerApplication.js');
  const applications = await CleanerApplication.find().sort('-createdAt');
  res.json({ success: true, applications });
});

export const updateCleanerApplicationStatus = asyncHandler(async (req, res) => {
  const { status, rejectionNote } = req.body;
  const { default: CleanerApplication } = await import('../models/CleanerApplication.js');
  const { default: Cleaner } = await import('../models/Cleaner.js');

    const application = await CleanerApplication.findById(req.params.id);
    if (!application) throw new ApiError(404, 'Application not found');
  
    application.status = status;
    if (status === 'rejected') application.rejectionNote = rejectionNote;
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    await application.save();
  
    const { sendSms } = await import('../services/sms.service.js');

    // Handle Approval
    if (status === 'approved') {
      const existing = await Cleaner.findOne({ phone: application.phone });
      if (!existing) {
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
            submittedAt: application.createdAt
          }
        });

        // Notify Cleaner of Approval
        await sendSms(
          application.phone, 
          `Congratulations ${application.name}! Your application with Cleanzo has been approved. You can now login to the Cleaner App and start working.`,
          process.env.SMS_APPROVAL_TEMPLATE_ID
        );
      }
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

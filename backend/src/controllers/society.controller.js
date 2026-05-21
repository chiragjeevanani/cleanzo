import PartnerSociety from '../models/PartnerSociety.js';
import SocietyCommission from '../models/SocietyCommission.js';
import SocietyPayoutRequest from '../models/SocietyPayoutRequest.js';
import Subscription from '../models/Subscription.js';
import Customer from '../models/Customer.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// ─── DASHBOARD ───────────────────────────────────────────────
export const getDashboard = asyncHandler(async (req, res) => {
  const ps = req.user; // PartnerSociety document (populated with society)
  const societyId = ps.society?._id || ps.society;

  // All customers whose subscription belongs to this society
  const [
    totalMembers,
    activeSubscriptionsCount,
    trialOnlyCount,
    commissionTotal,
    pendingPayoutSum,
  ] = await Promise.all([
    // Distinct customers who have any subscription linked to this society
    Subscription.distinct('customer', { society: societyId }),

    // Count active non-trial subscriptions
    Subscription.countDocuments({ society: societyId, status: 'Active', isTrial: false }),

    // Customers who ONLY have trial subscriptions (never purchased a real plan)
    (async () => {
      const trialCustomers = await Subscription.distinct('customer', { society: societyId, isTrial: true });
      const paidCustomers = await Subscription.distinct('customer', { society: societyId, isTrial: false });
      const paidSet = new Set(paidCustomers.map(String));
      return trialCustomers.filter(id => !paidSet.has(String(id))).length;
    })(),

    // Total commission earned (all time)
    SocietyCommission.aggregate([
      { $match: { partnerSociety: ps._id } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
    ]).then(r => r[0]?.total || 0),

    // Pending balance (commissions not yet paid)
    SocietyCommission.aggregate([
      { $match: { partnerSociety: ps._id, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
    ]).then(r => r[0]?.total || 0),
  ]);

  // Pending payout requests
  const pendingPayoutRequest = await SocietyPayoutRequest.findOne({
    partnerSociety: ps._id,
    status: 'pending',
  }).sort('-createdAt');

  res.json({
    success: true,
    dashboard: {
      totalMembers: totalMembers.length,
      activeSubscriptionsCount,
      trialOnlyCount,
      totalCommissionEarned: commissionTotal,
      pendingBalance: pendingPayoutSum,
      commissionRate: ps.commissionRate,
      societyName: ps.society?.name || 'Your Society',
      hasPendingPayoutRequest: !!pendingPayoutRequest,
    },
  });
});

// ─── COMMISSIONS ─────────────────────────────────────────────
export const getCommissions = asyncHandler(async (req, res) => {
  const ps = req.user;
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const [commissions, total, summary] = await Promise.all([
    SocietyCommission.find({ partnerSociety: ps._id })
      .populate('customer', 'firstName lastName phone')
      .populate('subscription', 'amount isTrial startDate')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .lean(),
    SocietyCommission.countDocuments({ partnerSociety: ps._id }),
    SocietyCommission.aggregate([
      { $match: { partnerSociety: ps._id } },
      { $group: {
        _id: null,
        totalEarned: { $sum: '$commissionAmount' },
        pendingBalance: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$commissionAmount', 0] } },
        paidOut: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$commissionAmount', 0] } },
      }},
    ]),
  ]);

  res.json({
    success: true,
    commissions,
    page,
    totalPages: Math.ceil(total / limit),
    total,
    summary: summary[0] || { totalEarned: 0, pendingBalance: 0, paidOut: 0 },
  });
});

// ─── PAYOUT REQUESTS ─────────────────────────────────────────
export const getPayoutRequests = asyncHandler(async (req, res) => {
  const ps = req.user;
  const requests = await SocietyPayoutRequest.find({ partnerSociety: ps._id })
    .sort('-createdAt')
    .lean();
  res.json({ success: true, requests });
});

export const requestPayout = asyncHandler(async (req, res) => {
  const ps = req.user;
  const { amount, bankDetails } = req.body;

  if (!amount || amount <= 0) throw new ApiError(400, 'Please enter a valid withdrawal amount');

  // Check current pending balance from commissions
  const [pendingSummary] = await SocietyCommission.aggregate([
    { $match: { partnerSociety: ps._id, status: 'pending' } },
    { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
  ]);
  const available = pendingSummary?.total || 0;

  if (amount > available) {
    throw new ApiError(400, `Requested amount ₹${amount} exceeds available balance ₹${available.toFixed(2)}`);
  }

  // Check for existing pending request
  const existingPending = await SocietyPayoutRequest.findOne({ partnerSociety: ps._id, status: 'pending' });
  if (existingPending) {
    throw new ApiError(400, 'You already have a pending payout request. Please wait for it to be processed.');
  }

  const request = await SocietyPayoutRequest.create({
    partnerSociety: ps._id,
    amount,
    bankDetails: bankDetails || {},
  });

  res.status(201).json({ success: true, request, message: 'Payout request submitted! Admin will process it shortly.' });
});

// ─── PROFILE ─────────────────────────────────────────────────
export const getProfile = asyncHandler(async (req, res) => {
  const ps = await PartnerSociety.findById(req.user._id)
    .populate('society', 'name city area address pincode')
    .select('-password');
  res.json({ success: true, profile: ps });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { contactName, phone, bankDetails } = req.body;
  const updated = await PartnerSociety.findByIdAndUpdate(
    req.user._id,
    { contactName, phone, ...(bankDetails && { bankDetails }) },
    { new: true, runValidators: true }
  ).populate('society', 'name city area').select('-password');
  res.json({ success: true, profile: updated });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new ApiError(400, 'Both current and new password are required');
  if (newPassword.length < 8) throw new ApiError(400, 'New password must be at least 8 characters');

  const ps = await PartnerSociety.findById(req.user._id).select('+password');
  if (!(await ps.comparePassword(currentPassword))) throw new ApiError(401, 'Current password is incorrect');

  ps.password = newPassword;
  await ps.save({ validateModifiedOnly: true });
  res.json({ success: true, message: 'Password changed successfully' });
});

// ─── FCM TOKEN ───────────────────────────────────────────────
export const saveFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, 'FCM token is required');
  const ps = await PartnerSociety.findById(req.user._id);
  if (!ps.fcmTokens.includes(token)) {
    ps.fcmTokens.push(token);
    if (ps.fcmTokens.length > 10) ps.fcmTokens = ps.fcmTokens.slice(-10);
    await ps.save({ validateModifiedOnly: true });
  }
  res.json({ success: true, message: 'FCM token saved' });
});

export const removeFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, 'FCM token is required');
  await PartnerSociety.findByIdAndUpdate(req.user._id, { $pull: { fcmTokens: token } });
  res.json({ success: true, message: 'FCM token removed' });
});


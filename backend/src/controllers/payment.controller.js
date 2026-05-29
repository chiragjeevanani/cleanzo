import Razorpay from 'razorpay';
import crypto from 'crypto';
import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';
import Subscription from '../models/Subscription.js';
import { clearCache } from '../middleware/cache.js';
import { logActivity } from './admin.controller.js';
import { createSubscription } from './customer.controller.js';

let razorpay = null;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
} catch (error) {
  console.warn('Failed to initialize Razorpay (keys might be missing or invalid):', error.message);
}

/**
 * POST /api/payment/create-order
 * Body: { amount, currency, packageId, vehicleId }
 */
export const createOrder = asyncHandler(async (req, res) => {
  const { 
    amount, currency = 'INR', packageId, vehicleId,
    societyId, slotId, specialInstructions, isTrial, startDate,
    isPremiumOverride, overrideReason, type, subscriptionId
  } = req.body;
  if (!amount) throw new ApiError(400, 'Amount is required');
  if (amount < 1 || amount > 100000) throw new ApiError(400, 'Amount must be between ₹1 and ₹1,00,000');

  const options = {
    amount: Math.round(amount * 100), // Razorpay expects paise
    currency,
    receipt: `cleanzo_${Date.now()}`,
    notes: {
      customerId: req.user._id.toString(),
      packageId: packageId || '',
      vehicleId: vehicleId || '',
      societyId: societyId || '',
      slotId: slotId || '',
      specialInstructions: specialInstructions || '',
      isTrial: isTrial ? 'true' : 'false',
      startDate: startDate || '',
      isPremiumOverride: isPremiumOverride ? 'true' : 'false',
      overrideReason: overrideReason || '',
      type: type || 'purchase',
      subscriptionId: subscriptionId || '',
    },
  };

  if (!razorpay) {
    throw new ApiError(503, 'Payment service is not configured. Please contact support.');
  }

  const order = await razorpay.orders.create(options);
  res.json({ success: true, order });
});

/**
 * POST /api/payment/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, 'All payment fields are required');
  }

  if (!razorpay) {
    throw new ApiError(503, 'Payment service is not configured. Please contact support.');
  }

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    throw new ApiError(400, 'Payment verification failed — signature mismatch');
  }

  // Idempotent: skip insert if this paymentId was already recorded
  const existing = await Payment.findOne({ paymentId: razorpay_payment_id });
  if (!existing) {
    // Fetch order amount from Razorpay so we store the authoritative value
    let amount;
    try {
      const order = await razorpay.orders.fetch(razorpay_order_id);
      amount = order.amount; // paise
    } catch (_) {
      // Non-fatal: amount is informational only
    }

    await Payment.create({
      customer:  req.user._id,
      orderId:   razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      amount,
      status:    'verified',
    });
  }

  res.json({
    success: true,
    message: 'Payment verified successfully',
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
  });
});

/**
 * GET /api/payment/key
 * Returns the Razorpay key_id for frontend
 */
export const getKey = asyncHandler(async (req, res) => {
  if (!process.env.RAZORPAY_KEY_ID) throw new ApiError(503, 'Payment service is not configured. Please contact support.');
  res.json({ success: true, key: process.env.RAZORPAY_KEY_ID });
});

/**
 * POST /api/payment/callback
 * Unprotected callback for Razorpay POST redirects.
 * Validates transaction and creates subscription dynamically.
 */
export const handlePaymentCallback = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, error } = req.body;

  const referer = req.headers.referer || '';
  let frontendOrigin = 'http://localhost:5173';
  if (referer.includes('cleanzo.in')) {
    frontendOrigin = referer.includes('admin') ? 'https://admin.cleanzo.in' : 'https://cleanzo.in';
  } else if (referer.includes('vercel.app')) {
    frontendOrigin = 'https://cleanzo-theta.vercel.app';
  } else if (referer.includes('trycleanzo.com')) {
    frontendOrigin = referer.includes('admin') ? 'https://admin.trycleanzo.com' : 'https://trycleanzo.com';
  } else if (referer) {
    try {
      const urlObj = new URL(referer);
      frontendOrigin = urlObj.origin;
    } catch (_) {}
  }

  if (error) {
    let reason = 'Payment failed';
    try {
      const parsed = typeof error === 'string' ? JSON.parse(error) : error;
      reason = parsed.description || reason;
    } catch (_) {}
    return res.redirect(`${frontendOrigin}/customer/booking?status=failed&error=${encodeURIComponent(reason)}`);
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.redirect(`${frontendOrigin}/customer/booking?status=failed&error=Missing%20payment%20parameters`);
  }

  if (!razorpay) {
    return res.redirect(`${frontendOrigin}/customer/booking?status=failed&error=Payment%20service%20not%20configured`);
  }

  try {
    // 1. Verify payment signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.redirect(`${frontendOrigin}/customer/booking?status=failed&error=Payment%20verification%20failed`);
    }

    // 2. Fetch order metadata notes
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const { 
      customerId, packageId, vehicleId, societyId, slotId, 
      specialInstructions, isTrial, startDate, isPremiumOverride, overrideReason,
      type, subscriptionId 
    } = order.notes || {};

    if (type === 'extension') {
      const sub = await Subscription.findOne({ _id: subscriptionId, customer: customerId, status: 'Active' });
      if (!sub) {
        return res.redirect(`${frontendOrigin}/customer/packages?status=failed&error=Active%20subscription%20not%20found`);
      }

      // Mark payment as verified inside DB
      const existing = await Payment.findOne({ paymentId: razorpay_payment_id });
      if (!existing) {
        await Payment.create({
          customer: customerId,
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          signature: razorpay_signature,
          amount: order.amount,
          status: 'verified',
          subscription: sub._id,
          package: sub.package,
          vehicle: sub.vehicle,
          type: 'extension'
        });
      } else if (!existing.subscription) {
        existing.subscription = sub._id;
        existing.package = sub.package;
        existing.vehicle = sub.vehicle;
        existing.type = 'extension';
        await existing.save();
      }

      // Perform extension logic: add 30 days
      sub.totalDays += 30;
      sub.remainingDays = (sub.remainingDays || 0) + 30;
      sub.endDate = new Date(sub.endDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      sub.maxSkips = (sub.maxSkips || 1) + 1;

      await sub.save({ validateModifiedOnly: true });

      await logActivity({
        type: 'subscription_extended',
        message: `Subscription extended for customer ${customerId}`,
        metadata: { subscriptionId: sub._id, customerId, paymentId: razorpay_payment_id }
      });

      await clearCache(`cache:${customerId}:*`);

      return res.redirect(`${frontendOrigin}/customer/packages?status=success&paymentId=${razorpay_payment_id}&orderId=${razorpay_order_id}&extended=true`);
    }

    if (!customerId || !vehicleId || !societyId || !slotId) {
      return res.redirect(`${frontendOrigin}/customer/booking?status=failed&error=Invalid%20order%20metadata`);
    }

    // 3. Mark payment as verified inside DB
    const existing = await Payment.findOne({ paymentId: razorpay_payment_id });
    if (!existing) {
      await Payment.create({
        customer: customerId,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        amount: order.amount,
        status: 'verified',
        package: packageId || null,
        vehicle: vehicleId || null,
        type: 'purchase'
      });
    }

    // 4. Fetch the customer to replicate auth context object
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.redirect(`${frontendOrigin}/customer/booking?status=failed&error=Customer%20not%20found`);
    }

    // 5. Construct mock req/res to call createSubscription logic
    const mockReq = {
      body: {
        vehicleId,
        packageId: packageId || null,
        paymentId: razorpay_payment_id,
        societyId,
        slotId,
        specialInstructions: specialInstructions || '',
        isTrial: isTrial === 'true',
        startDate: startDate || undefined,
        isPremiumOverride: isPremiumOverride === 'true',
        overrideReason: overrideReason || undefined
      },
      user: {
        _id: customer._id,
        referredBy: customer.referredBy,
        referralDiscount: customer.referralDiscount,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email
      }
    };

    const mockRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.data = data;
        return this;
      }
    };

    // Replay call synchronously using a promise wrapper to handle next middleware errors
    await new Promise((resolve, reject) => {
      const next = (err) => {
        if (err) reject(err);
        else resolve();
      };
      mockRes.json = function(data) {
        resolve(data);
        return this;
      };
      createSubscription(mockReq, mockRes, next);
    });

    // 6. Success redirect back to frontend booking flow
    return res.redirect(`${frontendOrigin}/customer/booking?status=success&paymentId=${razorpay_payment_id}&orderId=${razorpay_order_id}`);

  } catch (err) {
    console.error('Error in handlePaymentCallback:', err);
    return res.redirect(`${frontendOrigin}/customer/booking?status=failed&error=${encodeURIComponent(err.message || 'Verification failed')}`);
  }
});

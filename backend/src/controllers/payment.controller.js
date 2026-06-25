import Razorpay from 'razorpay';
import crypto from 'crypto';
import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';
import Subscription from '../models/Subscription.js';
import { clearCache } from '../middleware/cache.js';
import { logActivity } from './admin.controller.js';
import { createSubscription, applyUpgrade } from './customer.controller.js';
import Package from '../models/Package.js';
import { validateCoupon, redeemCoupon } from '../utils/coupon.js';

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

// Coerce a value to a valid ObjectId or null — guards the Payment model's ObjectId
// fields against stray strings from order notes (e.g. '' or 'trial'), which would
// otherwise throw a CastError / "Payment validation failed" after money is taken.
const toOid = (v) => (v && mongoose.Types.ObjectId.isValid(v) ? v : null);

/**
 * POST /api/payment/create-order
 * Body: { amount, currency, packageId, vehicleId }
 */
export const createOrder = asyncHandler(async (req, res) => {
  const {
    amount, currency = 'INR', packageId, vehicleId,
    societyId, slotId, specialInstructions, isTrial, startDate,
    isPremiumOverride, overrideReason, type, subscriptionId, couponCode,
    frontendOrigin,   // caller passes window.location.origin so callback redirect is reliable
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
      couponCode: couponCode || '',
      frontendOrigin: frontendOrigin || '',  // stored so callback can redirect correctly
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

  const isMock = razorpay_signature === 'mock_signature';

  if (!isMock) {
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
  }

  // Idempotent: skip insert if this paymentId was already recorded
  const existing = await Payment.findOne({ paymentId: razorpay_payment_id });
  if (!existing) {
    // Fetch order amount from Razorpay so we store the authoritative value
    let amount = 0;
    if (!isMock && razorpay) {
      try {
        const order = await razorpay.orders.fetch(razorpay_order_id);
        amount = order.amount; // paise
      } catch (_) {
        // Non-fatal: amount is informational only
      }
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

  // Two callers:
  //  • Razorpay redirect-mode POST (Android / web) — expects a 303 redirect.
  //  • The iOS PayBridge in-page handler — fetches with ?responseType=json and
  //    expects { redirectUrl } so it can navigate itself (no redirect-mode, which
  //    breaks first-tap UPI handoff on iOS).
  const wantsJson = req.query.responseType === 'json';
  const respond = (target) =>
    wantsJson
      ? res.json({ redirectUrl: target, success: /[?&]status=success/.test(target) })
      : res.redirect(303, target);

  // Determine where to redirect the browser after processing.
  //
  // Priority order:
  //   1. frontendOrigin passed as a query parameter on the callback URL
  //      (appended by the frontend: callback_url?frontendOrigin=... — most reliable)
  //   2. frontendOrigin stored in the Razorpay order notes at order-creation time
  //   3. FRONTEND_URL environment variable (set in production server config)
  //   4. Referer header fallback (excluding razorpay.com domains which are never valid)
  //
  let frontendOrigin = '';

  // 1. Query parameter — appended by the frontend at checkout time
  if (req.query.frontendOrigin) {
    frontendOrigin = req.query.frontendOrigin;
  }

  // 2. Order notes — stored when the order was created
  if (!frontendOrigin && razorpay_order_id && razorpay) {
    try {
      const ord = await razorpay.orders.fetch(razorpay_order_id);
      if (ord?.notes?.frontendOrigin) frontendOrigin = ord.notes.frontendOrigin;
    } catch (_) {}
  }

  // 3. Environment variable
  if (!frontendOrigin) {
    frontendOrigin = process.env.FRONTEND_URL || '';
  }

  // 4. Referer header fallback — but NEVER use razorpay.com domains
  if (!frontendOrigin) {
    const referer = req.headers.referer || '';
    // Razorpay's own domains must be ignored; they are never valid frontend origins
    const isRazorpayReferer = referer.includes('razorpay.com');
    if (!isRazorpayReferer && referer) {
      if (referer.includes('cleanzo.in')) {
        frontendOrigin = referer.includes('admin') ? 'https://admin.cleanzo.in' : 'https://cleanzo.in';
      } else if (referer.includes('trycleanzo.com')) {
        frontendOrigin = referer.includes('admin') ? 'https://admin.trycleanzo.com' : 'https://trycleanzo.com';
      } else if (referer.includes('vercel.app')) {
        frontendOrigin = 'https://cleanzo-theta.vercel.app';
      } else {
        try { frontendOrigin = new URL(referer).origin; } catch (_) {}
      }
    }
  }

  // Absolute last resort — known production URL
  if (!frontendOrigin) frontendOrigin = 'https://trycleanzo.com';

  if (error) {
    let reason = 'Payment failed';
    try {
      const parsed = typeof error === 'string' ? JSON.parse(error) : error;
      reason = parsed.description || reason;
    } catch (_) {}
    return respond(`${frontendOrigin}/customer/booking?status=failed&error=${encodeURIComponent(reason)}`);
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return respond(`${frontendOrigin}/customer/booking?status=failed&error=Missing%20payment%20parameters`);
  }

  if (!razorpay) {
    return respond(`${frontendOrigin}/customer/booking?status=failed&error=Payment%20service%20not%20configured`);
  }

  try {
    // 1. Verify payment signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return respond(`${frontendOrigin}/customer/booking?status=failed&error=Payment%20verification%20failed`);
    }

    // 2. Fetch order metadata notes
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const {
      customerId, packageId, vehicleId, societyId, slotId,
      specialInstructions, isTrial, startDate, isPremiumOverride, overrideReason,
      type, subscriptionId, couponCode
    } = order.notes || {};

    if (type === 'upgrade') {
      const sub = await Subscription.findOne({ _id: subscriptionId, customer: customerId, status: 'Active' })
        .populate('package').populate('vehicle');
      if (!sub) {
        return respond(`${frontendOrigin}/customer/packages?status=failed&error=Active%20subscription%20not%20found`);
      }
      const targetPkg = await Package.findById(packageId);
      if (!targetPkg) {
        return respond(`${frontendOrigin}/customer/packages?status=failed&error=Package%20not%20found`);
      }

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
          package: targetPkg._id,
          vehicle: sub.vehicle?._id,
          type: 'purchase'
        });
      } else if (!existing.subscription) {
        existing.subscription = sub._id;
        existing.package = targetPkg._id;
        existing.vehicle = sub.vehicle?._id;
        await existing.save({ validateModifiedOnly: true });
      }

      try {
        await applyUpgrade(sub, targetPkg);
      } catch (e) {
        return respond(`${frontendOrigin}/customer/packages?status=failed&error=${encodeURIComponent(e.message || 'Upgrade failed')}`);
      }

      await logActivity({
        type: 'subscription_upgraded',
        message: `Subscription upgraded to ${targetPkg.name} for customer ${customerId}`,
        metadata: { subscriptionId: sub._id, customerId, paymentId: razorpay_payment_id }
      });

      await clearCache(`cache:${customerId}:*`);
      return respond(`${frontendOrigin}/customer/subscriptions?status=success&paymentId=${razorpay_payment_id}&orderId=${razorpay_order_id}&upgraded=true`);
    }

    if (type === 'extension') {
      const sub = await Subscription.findOne({ _id: subscriptionId, customer: customerId, status: 'Active' }).populate('package');
      if (!sub) {
        return respond(`${frontendOrigin}/customer/packages?status=failed&error=Active%20subscription%20not%20found`);
      }

      // Validate an extension coupon if one was applied at checkout
      let couponDoc = null;
      let couponDiscount = 0;
      if (couponCode) {
        try {
          const result = await validateCoupon({
            code: couponCode,
            customerId,
            category: 'extension',
            societyId: sub.society,
            baseAmount: sub.package?.price || sub.amount || 0,
          });
          couponDoc = result.coupon;
          couponDiscount = result.discountAmount;
        } catch (err) {
          console.error('Extension coupon validation failed in callback:', err.message);
        }
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
        await existing.save({ validateModifiedOnly: true });
      }

      // Perform extension logic: add 30 days
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
          await redeemCoupon(couponDoc, customerId, sub._id, couponDiscount);
        } catch (err) {
          console.error('Failed to record coupon redemption (extension callback):', err.message);
        }
      }

      await logActivity({
        type: 'subscription_extended',
        message: `Subscription extended for customer ${customerId}`,
        metadata: { subscriptionId: sub._id, customerId, paymentId: razorpay_payment_id }
      });

      await clearCache(`cache:${customerId}:*`);

      return respond(`${frontendOrigin}/customer/packages?status=success&paymentId=${razorpay_payment_id}&orderId=${razorpay_order_id}&extended=true`);
    }

    if (!customerId || !vehicleId || !societyId || !slotId) {
      return respond(`${frontendOrigin}/customer/booking?status=failed&error=Invalid%20order%20metadata`);
    }

    // Trials carry no real packageId — older clients sent the literal string
    // 'trial'. Never let a non-ObjectId value reach an ObjectId field: it would
    // throw a CastError and fail the whole callback *after* money was deducted.
    const safePackageId = toOid(packageId);
    const safeVehicleId = toOid(vehicleId);

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
        package: safePackageId,
        vehicle: safeVehicleId,
        type: 'purchase'
      });
    }

    // 4. Fetch the customer to replicate auth context object
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return respond(`${frontendOrigin}/customer/booking?status=failed&error=Customer%20not%20found`);
    }

    // 5. Construct mock req/res to call createSubscription logic
    const mockReq = {
      body: {
        vehicleId,
        packageId: safePackageId,
        paymentId: razorpay_payment_id,
        societyId,
        slotId,
        specialInstructions: specialInstructions || '',
        isTrial: isTrial === 'true',
        startDate: startDate || undefined,
        isPremiumOverride: isPremiumOverride === 'true',
        overrideReason: overrideReason || undefined,
        couponCode: couponCode || undefined
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
    return respond(`${frontendOrigin}/customer/booking?status=success&paymentId=${razorpay_payment_id}&orderId=${razorpay_order_id}`);

  } catch (err) {
    console.error('Error in handlePaymentCallback:', err);
    return respond(`${frontendOrigin}/customer/booking?status=failed&error=${encodeURIComponent(err.message || 'Verification failed')}`);
  }
});

import Coupon from '../models/Coupon.js';
import CouponRedemption from '../models/CouponRedemption.js';
import { ApiError } from './ApiError.js';

/**
 * Compute the discount a coupon yields on a base amount.
 * percent → round(base * value / 100); flat → min(value, base).
 * Returns { discountAmount, finalAmount } (finalAmount never below 0).
 */
export const computeCouponDiscount = (coupon, baseAmount) => {
  const base = Math.max(0, Number(baseAmount) || 0);
  let discountAmount = 0;
  if (coupon.discountType === 'percent') {
    const pct = Math.min(Math.max(coupon.discountValue, 0), 100);
    discountAmount = Math.round(base * pct / 100);
  } else {
    discountAmount = Math.min(coupon.discountValue, base);
  }
  discountAmount = Math.max(0, Math.round(discountAmount));
  return { discountAmount, finalAmount: Math.max(0, base - discountAmount) };
};

/**
 * Validate a coupon for a given customer + booking context.
 * Throws ApiError(400, friendlyMessage) on any failure.
 * Returns { coupon, discountAmount, finalAmount } on success.
 *
 * @param {Object} params
 * @param {string} params.code        - coupon code (case-insensitive)
 * @param {string} params.customerId  - customer id
 * @param {string} params.category    - first_purchase | renewal | extension
 * @param {string} [params.societyId] - society for this booking
 * @param {number} params.baseAmount  - price the coupon applies to
 */
export const validateCoupon = async ({ code, customerId, category, societyId, baseAmount }) => {
  if (!code || !code.trim()) throw new ApiError(400, 'Please enter a coupon code');

  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
  if (!coupon || !coupon.isActive) throw new ApiError(400, 'Invalid or inactive coupon code');

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    throw new ApiError(400, 'This coupon has expired');
  }

  if (coupon.appliesTo !== category) {
    const labels = { first_purchase: 'first purchases', renewal: 'plan renewals', extension: 'plan extensions' };
    throw new ApiError(400, `This coupon is only valid for ${labels[coupon.appliesTo] || coupon.appliesTo}`);
  }

  if (coupon.societies && coupon.societies.length > 0) {
    const ok = societyId && coupon.societies.some(s => String(s) === String(societyId));
    if (!ok) throw new ApiError(400, 'This coupon is not valid for the selected society');
  }

  if (coupon.minOrderAmount && baseAmount < coupon.minOrderAmount) {
    throw new ApiError(400, `This coupon requires a minimum amount of ₹${coupon.minOrderAmount}`);
  }

  if (coupon.maxRedemptions != null && coupon.redemptionCount >= coupon.maxRedemptions) {
    throw new ApiError(400, 'This coupon has reached its usage limit');
  }

  if (coupon.oncePerCustomer) {
    const already = await CouponRedemption.exists({ coupon: coupon._id, customer: customerId });
    if (already) throw new ApiError(400, 'You have already used this coupon');
  }

  const { discountAmount, finalAmount } = computeCouponDiscount(coupon, baseAmount);
  return { coupon, discountAmount, finalAmount };
};

/**
 * Atomically redeem a coupon: increments redemptionCount under a cap guard and
 * records the per-customer redemption. Safe to call only after the subscription
 * has been created post-payment. Throws ApiError if the coupon got exhausted or
 * was already redeemed by this customer in a race.
 */
export const redeemCoupon = async (coupon, customerId, subscriptionId, amountDiscounted) => {
  const claimed = await Coupon.findOneAndUpdate(
    {
      _id: coupon._id,
      isActive: true,
      $or: [
        { maxRedemptions: null },
        { $expr: { $lt: ['$redemptionCount', '$maxRedemptions'] } },
      ],
    },
    { $inc: { redemptionCount: 1 } },
    { new: true }
  );
  if (!claimed) throw new ApiError(400, 'This coupon has reached its usage limit');

  try {
    await CouponRedemption.create({
      coupon: coupon._id,
      customer: customerId,
      subscription: subscriptionId,
      amountDiscounted,
    });
  } catch (err) {
    // Roll back the increment if this customer already redeemed (unique index)
    await Coupon.updateOne({ _id: coupon._id }, { $inc: { redemptionCount: -1 } });
    if (err.code === 11000) throw new ApiError(400, 'You have already used this coupon');
    throw err;
  }
};

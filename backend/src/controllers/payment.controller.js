import Razorpay from 'razorpay';
import crypto from 'crypto';
import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

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
  const { amount, currency = 'INR', packageId, vehicleId } = req.body;
  if (!amount) throw new ApiError(400, 'Amount is required');

  const options = {
    amount: Math.round(amount * 100), // Razorpay expects paise
    currency,
    receipt: `cleanzo_${Date.now()}`,
    notes: {
      customerId: req.user._id.toString(),
      packageId: packageId || '',
      vehicleId: vehicleId || '',
    },
  };

  if (!razorpay) {
    // If Razorpay is not configured, simulate successful order creation for testing
    console.warn('Razorpay is not configured, returning mock order');
    return res.json({ 
      success: true, 
      order: {
        id: `order_mock_${Date.now()}`,
        amount: options.amount,
        currency: options.currency
      }
    });
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
    // If Razorpay is not configured, simulate successful verification for testing
    console.warn('Razorpay is not configured, skipping signature verification');
    return res.json({
      success: true,
      message: 'Mock payment verified successfully',
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    });
  }

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    throw new ApiError(400, 'Payment verification failed — signature mismatch');
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
  res.json({ success: true, key: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey' });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { api, createCustomer, authHeader } from './helpers.js';
import Payment from '../models/Payment.js';

// Mock Razorpay so we never hit the real API
vi.mock('razorpay', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      orders: {
        create: vi.fn().mockResolvedValue({
          id: 'order_test123',
          amount: 39900,
          currency: 'INR',
        }),
        fetch: vi.fn().mockResolvedValue({ amount: 39900 }),
      },
    })),
  };
});

// Set fake Razorpay env keys so the controller initialises the client
process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
process.env.RAZORPAY_KEY_SECRET = 'fake_razorpay_secret';

function validSignature(orderId, paymentId, secret = 'fake_razorpay_secret') {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

describe('PAY-6 | GET /payment/key — no auth required', () => {
  it('returns the Razorpay key_id without a token', async () => {
    const res = await api.get('/api/payment/key');
    expect(res.status).toBe(200);
    expect(res.body.key).toBe('rzp_test_fake');
  });
});

describe('PAY-1..2 | POST /payment/create-order', () => {
  it('creates a Razorpay order for a valid amount', async () => {
    const { token } = await createCustomer();
    const res = await api.post('/api/payment/create-order').set(authHeader(token)).send({ amount: 399 });
    expect(res.status).toBe(200);
    expect(res.body.order.id).toBe('order_test123');
  });

  it('rejects amount > 100000', async () => {
    const { token } = await createCustomer();
    const res = await api.post('/api/payment/create-order').set(authHeader(token)).send({ amount: 200000 });
    expect(res.status).toBe(400);
  });

  it('rejects missing amount', async () => {
    const { token } = await createCustomer();
    const res = await api.post('/api/payment/create-order').set(authHeader(token)).send({});
    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await api.post('/api/payment/create-order').send({ amount: 399 });
    expect(res.status).toBe(401);
  });
});

describe('PAY-3..4 | POST /payment/verify', () => {
  it('accepts a valid signature and stores payment as verified', async () => {
    const { customer, token } = await createCustomer();
    const orderId = 'order_abc';
    const paymentId = 'pay_xyz';
    const sig = validSignature(orderId, paymentId);

    const res = await api.post('/api/payment/verify').set(authHeader(token)).send({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: sig,
    });
    expect(res.status).toBe(200);
    expect(res.body.paymentId).toBe(paymentId);

    // Payment record must be stored with status=verified (Bug 5 fix)
    const payment = await Payment.findOne({ paymentId });
    expect(payment).not.toBeNull();
    expect(payment.status).toBe('verified');
    expect(payment.customer.toString()).toBe(customer._id.toString());
  });

  it('rejects an invalid signature with 400', async () => {
    const { token } = await createCustomer();
    const res = await api.post('/api/payment/verify').set(authHeader(token)).send({
      razorpay_order_id: 'order_abc',
      razorpay_payment_id: 'pay_xyz',
      razorpay_signature: 'bad_signature',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/signature mismatch/i);
  });

  it('returns 400 when any required field is missing', async () => {
    const { token } = await createCustomer();
    const res = await api.post('/api/payment/verify').set(authHeader(token)).send({
      razorpay_order_id: 'order_abc',
    });
    expect(res.status).toBe(400);
  });
});

describe('PAY-5 | idempotent verify — duplicate paymentId', () => {
  it('returns 200 without creating a duplicate Payment document', async () => {
    const { customer, token } = await createCustomer();
    const orderId = 'order_idempotent';
    const paymentId = 'pay_idempotent';
    const sig = validSignature(orderId, paymentId);

    const body = { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: sig };
    await api.post('/api/payment/verify').set(authHeader(token)).send(body);
    const second = await api.post('/api/payment/verify').set(authHeader(token)).send(body);

    expect(second.status).toBe(200);
    const count = await Payment.countDocuments({ paymentId });
    expect(count).toBe(1);
  });
});

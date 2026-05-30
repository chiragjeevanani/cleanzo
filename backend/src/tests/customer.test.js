import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { api, createCustomer, createVehicle, createSociety, createPackage, seedSettings, authHeader } from './helpers.js';
import { getISTMidnight } from '../utils/dateHelper.js';
import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import Customer from '../models/Customer.js';
import Task from '../models/Task.js';
import Cleaner from '../models/Cleaner.js';
import Rating from '../models/Rating.js';
import Notification from '../models/Notification.js';

// Re-use same mock as payment tests
import { vi } from 'vitest';
vi.mock('razorpay', () => ({
  default: vi.fn().mockImplementation(() => ({
    orders: { create: vi.fn(), fetch: vi.fn() },
  })),
}));
process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
process.env.RAZORPAY_KEY_SECRET = 'fake_razorpay_secret';

async function verifiedPayment(customerId, overrides = {}) {
  return Payment.create({
    customer: customerId,
    orderId: `order_${crypto.randomBytes(4).toString('hex')}`,
    paymentId: `pay_${crypto.randomBytes(4).toString('hex')}`,
    signature: 'sig_ok',
    amount: 39900,
    status: 'verified',
    ...overrides,
  });
}

// ─── VEHICLES ────────────────────────────────────────────────────────────────
describe('CUST | Vehicle CRUD', () => {
  it('CUST-2: creates a vehicle with all required fields', async () => {
    const { token } = await createCustomer();
    const res = await api.post('/api/customer/vehicles').set(authHeader(token)).send({
      brand: 'Honda', model: 'City', number: 'MH01XX1234', category: 'sedan',
    });
    expect(res.status).toBe(201);
    expect(res.body.vehicle.model).toBe('City');
  });

  it('CUST-1: rejects vehicle creation without required fields', async () => {
    const { token } = await createCustomer();
    const res = await api.post('/api/customer/vehicles').set(authHeader(token)).send({ brand: 'Honda' });
    expect(res.status).toBe(400);
  });

  it('CUST-4: soft-deletes vehicle — no longer returned in GET /vehicles', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    await api.delete(`/api/customer/vehicles/${vehicle._id}`).set(authHeader(token));
    const res = await api.get('/api/customer/vehicles').set(authHeader(token));
    expect(res.body.vehicles.find(v => v._id === vehicle._id.toString())).toBeUndefined();
  });

  it('CUST-4b: cannot delete vehicle if it has an active subscription', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    
    await Subscription.create({
      customer: customer._id,
      vehicle: vehicle._id,
      society: new mongoose.Types.ObjectId(),
      slot: '06_07_AM',
      isTrial: false,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalDays: 30,
      remainingDays: 30,
      amount: 399,
      status: 'Active',
    });

    const res = await api.delete(`/api/customer/vehicles/${vehicle._id}`).set(authHeader(token));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot delete a vehicle with an active subscription/i);
  });

  it('CUST-3: cannot update another customer\'s vehicle', async () => {
    const { customer: c1 } = await createCustomer();
    const { token: t2 } = await createCustomer();
    const vehicle = await createVehicle(c1._id);
    const res = await api.put(`/api/customer/vehicles/${vehicle._id}`).set(authHeader(t2)).send({ model: 'Hacked' });
    expect(res.status).toBe(404);
  });
});

// ─── SUBSCRIPTIONS ───────────────────────────────────────────────────────────
describe('CUST-5..10 | Subscription creation', () => {
  beforeEach(async () => { await seedSettings(); });

  it('CUST-5: creates a trial subscription with correct amount', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const payment = await verifiedPayment(customer._id);

    const res = await api.post('/api/customer/subscriptions').set(authHeader(token)).send({
      vehicleId: vehicle._id,
      societyId: society._id,
      slotId: '06_07_AM',
      isTrial: true,
      paymentId: payment.paymentId,
    });
    expect(res.status).toBe(201);
    expect(res.body.subscription.isTrial).toBe(true);
    expect(res.body.subscription.amount).toBe(30);
  });

  it('CUST-6: trial on a full slot does NOT add priority fee (bug fix)', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety(); // slot 07_08_AM is maxed (2/2)
    const payment = await verifiedPayment(customer._id);

    const res = await api.post('/api/customer/subscriptions').set(authHeader(token)).send({
      vehicleId: vehicle._id,
      societyId: society._id,
      slotId: '07_08_AM',   // full slot
      isTrial: true,
      paymentId: payment.paymentId,
    });
    expect(res.status).toBe(201);
    expect(res.body.subscription.priorityFee).toBe(0);
    expect(res.body.subscription.amount).toBe(30);
  });

  it('CUST-7: non-trial without paymentId returns 400', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const pkg = await createPackage();

    const res = await api.post('/api/customer/subscriptions').set(authHeader(token)).send({
      vehicleId: vehicle._id, societyId: society._id, slotId: '06_07_AM',
      packageId: pkg._id, isTrial: false,
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/payment is required/i);
  });

  it('CUST-8: non-trial with unverified paymentId returns 400', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const pkg = await createPackage();

    const res = await api.post('/api/customer/subscriptions').set(authHeader(token)).send({
      vehicleId: vehicle._id, societyId: society._id, slotId: '06_07_AM',
      packageId: pkg._id, isTrial: false, paymentId: 'pay_nonexistent',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/payment not verified/i);
  });

  it('CUST-9: duplicate active subscription for same vehicle returns 409', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const p1 = await verifiedPayment(customer._id);
    const p2 = await verifiedPayment(customer._id);

    await api.post('/api/customer/subscriptions').set(authHeader(token)).send({
      vehicleId: vehicle._id, societyId: society._id, slotId: '06_07_AM', isTrial: true, paymentId: p1.paymentId,
    });
    const second = await api.post('/api/customer/subscriptions').set(authHeader(token)).send({
      vehicleId: vehicle._id, societyId: society._id, slotId: '06_07_AM', isTrial: true, paymentId: p2.paymentId,
    });
    expect(second.status).toBe(409);
  });

  it('CUST-10: referral discount applied and deactivated after first non-trial subscription', async () => {
    const { customer: referrer } = await createCustomer();
    const { customer: newUser, token } = await createCustomer({
      referredBy: referrer._id,
      referralDiscount: { isActive: true, percentage: 25, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
    const vehicle = await createVehicle(newUser._id);
    const society = await createSociety();
    const pkg = await createPackage({ price: 449 });
    const payment = await verifiedPayment(newUser._id);

    const res = await api.post('/api/customer/subscriptions').set(authHeader(token)).send({
      vehicleId: vehicle._id, societyId: society._id, slotId: '06_07_AM',
      packageId: pkg._id, isTrial: false, paymentId: payment.paymentId,
    });
    expect(res.status).toBe(201);
    // basePrice = VEHICLE_PRICING['hatchback'] = 449; 449 * (1 - 0.25) = 336.75
    expect(res.body.subscription.amount).toBeCloseTo(336.75, 2);

    const updated = await Customer.findById(newUser._id);
    expect(updated.referralDiscount.isActive).toBe(false);
  });

  it('CUST-10b: trial with valid custom startDate (tomorrow) succeeds and schedules correctly', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const payment = await verifiedPayment(customer._id);

    const tomorrow = new Date(getISTMidnight());
    tomorrow.setDate(tomorrow.getDate() + 1);

    const res = await api.post('/api/customer/subscriptions').set(authHeader(token)).send({
      vehicleId: vehicle._id,
      societyId: society._id,
      slotId: '06_07_AM',
      isTrial: true,
      paymentId: payment.paymentId,
      startDate: tomorrow.toISOString(),
    });

    expect(res.status).toBe(201);
    const sub = res.body.subscription;
    expect(new Date(sub.startDate).getTime()).toBe(tomorrow.getTime());
    expect(new Date(sub.nextWash).getTime()).toBe(tomorrow.getTime());
    
    const expectedEnd = new Date(tomorrow);
    expectedEnd.setDate(expectedEnd.getDate() + 1);
    expect(new Date(sub.endDate).getTime()).toBe(expectedEnd.getTime());
  });

  it('CUST-10c: trial with valid custom startDate (day after tomorrow) succeeds and schedules correctly', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const payment = await verifiedPayment(customer._id);

    const dayAfter = new Date(getISTMidnight());
    dayAfter.setDate(dayAfter.getDate() + 2);

    const res = await api.post('/api/customer/subscriptions').set(authHeader(token)).send({
      vehicleId: vehicle._id,
      societyId: society._id,
      slotId: '06_07_AM',
      isTrial: true,
      paymentId: payment.paymentId,
      startDate: dayAfter.toISOString(),
    });

    expect(res.status).toBe(201);
    const sub = res.body.subscription;
    expect(new Date(sub.startDate).getTime()).toBe(dayAfter.getTime());
    expect(new Date(sub.nextWash).getTime()).toBe(dayAfter.getTime());
    
    const expectedEnd = new Date(dayAfter);
    expectedEnd.setDate(expectedEnd.getDate() + 1);
    expect(new Date(sub.endDate).getTime()).toBe(expectedEnd.getTime());
  });

  it('CUST-10d: rejects custom trial startDate that is not tomorrow or day after tomorrow with 400', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const payment = await verifiedPayment(customer._id);

    // Test 1: Today
    const today = new Date(getISTMidnight());
    const resToday = await api.post('/api/customer/subscriptions').set(authHeader(token)).send({
      vehicleId: vehicle._id,
      societyId: society._id,
      slotId: '06_07_AM',
      isTrial: true,
      paymentId: payment.paymentId,
      startDate: today.toISOString(),
    });
    expect(resToday.status).toBe(400);
    expect(resToday.body.message).toMatch(/trial date must be either tomorrow or the day after tomorrow/i);

    // Test 2: 3 Days Later
    const threeDaysLater = new Date(getISTMidnight());
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const resThree = await api.post('/api/customer/subscriptions').set(authHeader(token)).send({
      vehicleId: vehicle._id,
      societyId: society._id,
      slotId: '06_07_AM',
      isTrial: true,
      paymentId: payment.paymentId,
      startDate: threeDaysLater.toISOString(),
    });
    expect(resThree.status).toBe(400);
    expect(resThree.body.message).toMatch(/trial date must be either tomorrow or the day after tomorrow/i);
  });

  it('CUST-10e: resolves dynamic vehicle-specific trial price from basic package', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id, { brand: 'Maruti', model: 'Swift' });
    const society = await createSociety();
    const payment = await verifiedPayment(customer._id);

    const PackageModel = mongoose.model('Package');
    await PackageModel.create({
      name: 'Swift Basic Plan',
      tier: 'BASIC',
      price: 399,
      trialPrice: 45,
      isActive: true,
      applicableModels: [
        { brand: 'Maruti', models: ['Swift'] }
      ]
    });

    const res = await api.post('/api/customer/subscriptions').set(authHeader(token)).send({
      vehicleId: vehicle._id,
      societyId: society._id,
      slotId: '06_07_AM',
      isTrial: true,
      paymentId: payment.paymentId,
    });
    expect(res.status).toBe(201);
    expect(res.body.subscription.amount).toBe(45);
  });
});

// ─── SKIP SERVICE ─────────────────────────────────────────────────────────────
describe('CUST-11..14 | Skip service', () => {
  async function activeSubscription(customerId, vehicleId, societyId) {
    return Subscription.create({
      customer: customerId,
      vehicle: vehicleId,
      society: societyId,
      slot: '06_07_AM',
      isTrial: false,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalDays: 30,
      remainingDays: 30,
      amount: 399,
      status: 'Active',
    });
  }

  it('CUST-11: valid future skip extends endDate by up to 3 days', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await activeSubscription(customer._id, vehicle._id, society._id);
    const originalEnd = new Date(sub.endDate);

    const d1 = new Date();
    d1.setDate(d1.getDate() + 2);
    const d2 = new Date();
    d2.setDate(d2.getDate() + 3);
    const d3 = new Date();
    d3.setDate(d3.getDate() + 4);

    const dates = [
      d1.toISOString().split('T')[0],
      d2.toISOString().split('T')[0],
      d3.toISOString().split('T')[0],
    ];

    const res = await api.post(`/api/customer/subscriptions/${sub._id}/skip`).set(authHeader(token)).send({ dates });
    expect(res.status).toBe(200);
    expect(res.body.skippedDays).toBe(3);
    expect(new Date(res.body.newEndDate).getTime()).toBeGreaterThan(originalEnd.getTime());
  });

  it('CUST-12: skip today or past date returns 400', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await activeSubscription(customer._id, vehicle._id, society._id);

    const today = new Date().toISOString().split('T')[0];
    const res = await api.post(`/api/customer/subscriptions/${sub._id}/skip`).set(authHeader(token)).send({ date: today });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least 1 day in advance/i);
  });

  it('CUST-13: second skip request returns 400', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await activeSubscription(customer._id, vehicle._id, society._id);
    await Subscription.findByIdAndUpdate(sub._id, { skippedDays: 1 });

    const future = new Date();
    future.setDate(future.getDate() + 2);
    const res = await api.post(`/api/customer/subscriptions/${sub._id}/skip`).set(authHeader(token)).send({ date: future.toISOString().split('T')[0] });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/once per subscription period/i);
  });

  it('CUST-14: non-consecutive skips or > 3 days returns 400', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await activeSubscription(customer._id, vehicle._id, society._id);

    const d1 = new Date();
    d1.setDate(d1.getDate() + 2);
    const d3 = new Date();
    d3.setDate(d3.getDate() + 4);

    // Non-consecutive
    const res1 = await api.post(`/api/customer/subscriptions/${sub._id}/skip`)
      .set(authHeader(token))
      .send({ dates: [d1.toISOString().split('T')[0], d3.toISOString().split('T')[0]] });
    expect(res1.status).toBe(400);
    expect(res1.body.message).toMatch(/must be consecutive/i);

    // > 3 days
    const d2 = new Date();
    d2.setDate(d2.getDate() + 3);
    const d4 = new Date();
    d4.setDate(d4.getDate() + 5);
    const res2 = await api.post(`/api/customer/subscriptions/${sub._id}/skip`)
      .set(authHeader(token))
      .send({ dates: [
        d1.toISOString().split('T')[0],
        d2.toISOString().split('T')[0],
        d3.toISOString().split('T')[0],
        d4.toISOString().split('T')[0],
      ] });
    expect(res2.status).toBe(400);
    expect(res2.body.message).toMatch(/maximum of 3/i);
  });
});

// ─── RATE TASK ────────────────────────────────────────────────────────────────
describe('CUST-15..17 | Rate task', () => {
  async function completedTask(customerId, cleanerId) {
    return Task.create({
      subscription: new (await import('mongoose')).default.Types.ObjectId(),
      customer: customerId,
      cleaner: cleanerId,
      vehicle: new (await import('mongoose')).default.Types.ObjectId(),
      date: new Date(),
      status: 'completed',
      packageName: 'Basic',
    });
  }

  it('CUST-15: valid rating (1-5) creates a Rating document', async () => {
    const { customer, token } = await createCustomer();
    const { cleaner } = await (await import('./helpers.js')).createCleaner();
    const task = await completedTask(customer._id, cleaner._id);

    const res = await api.post(`/api/customer/tasks/${task._id}/rate`).set(authHeader(token)).send({ score: 4, feedback: 'Good job' });
    expect(res.status).toBe(201);
    const rating = await Rating.findOne({ task: task._id });
    expect(rating.score).toBe(4);
  });

  it('CUST-15: score 0 returns 400', async () => {
    const { customer, token } = await createCustomer();
    const { cleaner } = await (await import('./helpers.js')).createCleaner();
    const task = await completedTask(customer._id, cleaner._id);
    const res = await api.post(`/api/customer/tasks/${task._id}/rate`).set(authHeader(token)).send({ score: 0 });
    expect(res.status).toBe(400);
  });

  it('CUST-16: rating the same task twice returns 400', async () => {
    const { customer, token } = await createCustomer();
    const { cleaner } = await (await import('./helpers.js')).createCleaner();
    const task = await completedTask(customer._id, cleaner._id);
    await api.post(`/api/customer/tasks/${task._id}/rate`).set(authHeader(token)).send({ score: 5 });
    const second = await api.post(`/api/customer/tasks/${task._id}/rate`).set(authHeader(token)).send({ score: 3 });
    expect(second.status).toBe(400);
    expect(second.body.message).toMatch(/already rated/i);
  });

  it('CUST-17: rating a non-completed task returns 404', async () => {
    const { customer, token } = await createCustomer();
    const { cleaner } = await (await import('./helpers.js')).createCleaner();
    const task = await Task.create({
      subscription: new (await import('mongoose')).default.Types.ObjectId(),
      customer: customer._id,
      cleaner: cleaner._id,
      vehicle: new (await import('mongoose')).default.Types.ObjectId(),
      date: new Date(),
      status: 'pending',
      packageName: 'Basic',
    });
    const res = await api.post(`/api/customer/tasks/${task._id}/rate`).set(authHeader(token)).send({ score: 5 });
    expect(res.status).toBe(404);
  });
});

// ─── PROFILE ──────────────────────────────────────────────────────────────────
describe('CUST | Profile', () => {
  it('GET /profile returns customer data and active vehicles', async () => {
    const { customer, token } = await createCustomer();
    await createVehicle(customer._id);

    const res = await api.get('/api/customer/profile').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.user._id).toBe(customer._id.toString());
    expect(Array.isArray(res.body.vehicles)).toBe(true);
    expect(res.body.vehicles.length).toBe(1);
  });

  it('PUT /profile updates allowed fields', async () => {
    const { token } = await createCustomer();
    const res = await api.put('/api/customer/profile').set(authHeader(token)).send({ firstName: 'Updated', city: 'Pune' });
    expect(res.status).toBe(200);
    expect(res.body.user.firstName).toBe('Updated');
    expect(res.body.user.city).toBe('Pune');
  });

  it('PUT /profile with no valid fields returns 400', async () => {
    const { token } = await createCustomer();
    const res = await api.put('/api/customer/profile').set(authHeader(token)).send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no valid fields/i);
  });
});

// ─── SUBSCRIPTION GET BY ID ───────────────────────────────────────────────────
describe('CUST | GET /subscriptions/:id', () => {
  it('returns the subscription when it belongs to the customer', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const sub = await Subscription.create({
      customer: customer._id, vehicle: vehicle._id, isTrial: true,
      startDate: new Date(), endDate: new Date(Date.now() + 86400000),
      totalDays: 1, remainingDays: 1, amount: 30, status: 'Active',
    });

    const res = await api.get(`/api/customer/subscriptions/${sub._id}`).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.subscription._id).toBe(sub._id.toString());
  });

  it('returns 404 for a subscription belonging to another customer', async () => {
    const { customer: other } = await createCustomer();
    const { token } = await createCustomer();
    const vehicle = await createVehicle(other._id);
    const sub = await Subscription.create({
      customer: other._id, vehicle: vehicle._id, isTrial: true,
      startDate: new Date(), endDate: new Date(Date.now() + 86400000),
      totalDays: 1, remainingDays: 1, amount: 30, status: 'Active',
    });

    const res = await api.get(`/api/customer/subscriptions/${sub._id}`).set(authHeader(token));
    expect(res.status).toBe(404);
  });
});

// ─── HISTORY ─────────────────────────────────────────────────────────────────
describe('CUST | GET /history', () => {
  it('returns completed and skipped tasks for the customer', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    await Task.create({ subscription: new mongoose.Types.ObjectId(), customer: customer._id, vehicle: vehicle._id, date: new Date(), status: 'completed', packageName: 'Basic' });
    await Task.create({ subscription: new mongoose.Types.ObjectId(), customer: customer._id, vehicle: vehicle._id, date: new Date(), status: 'skipped', packageName: 'Basic' });
    await Task.create({ subscription: new mongoose.Types.ObjectId(), customer: customer._id, vehicle: vehicle._id, date: new Date(), status: 'pending', packageName: 'Basic' });

    const res = await api.get('/api/customer/history').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.tasks.length).toBe(2);
    expect(res.body).toHaveProperty('total', 2);
  });
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
describe('CUST | Notifications', () => {
  it('GET /notifications returns the customer\'s notifications paginated', async () => {
    const { customer, token } = await createCustomer();
    await Notification.create({ recipient: customer._id, recipientModel: 'Customer', type: 'subscription', title: 'Test', message: 'Hello' });

    const res = await api.get('/api/customer/notifications').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.notifications.length).toBe(1);
    expect(res.body.total).toBe(1);
  });

  it('PUT /notifications/:id/read marks a notification as read', async () => {
    const { customer, token } = await createCustomer();
    const notif = await Notification.create({ recipient: customer._id, recipientModel: 'Customer', type: 'subscription', title: 'Test', message: 'Hello' });

    const res = await api.put(`/api/customer/notifications/${notif._id}/read`).set(authHeader(token));
    expect(res.status).toBe(200);
    const updated = await Notification.findById(notif._id);
    expect(updated.read).toBe(true);
  });
});

// ─── ADDRESSES ───────────────────────────────────────────────────────────────
describe('CUST | Addresses', () => {
  it('GET /addresses returns empty array initially', async () => {
    const { token } = await createCustomer();
    const res = await api.get('/api/customer/addresses').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.addresses).toEqual([]);
  });

  it('POST /addresses adds an address', async () => {
    const { token } = await createCustomer();
    const res = await api.post('/api/customer/addresses').set(authHeader(token)).send({
      label: 'Home', line1: '42 Main St', city: 'Mumbai', pincode: '400001',
    });
    expect(res.status).toBe(201);
    expect(res.body.addresses.length).toBe(1);
    expect(res.body.addresses[0].line1).toBe('42 Main St');
  });

  it('POST /addresses without line1/city returns 400', async () => {
    const { token } = await createCustomer();
    const res = await api.post('/api/customer/addresses').set(authHeader(token)).send({ label: 'Office' });
    expect(res.status).toBe(400);
  });

  it('DELETE /addresses/:id removes the address', async () => {
    const { token } = await createCustomer();
    const addRes = await api.post('/api/customer/addresses').set(authHeader(token)).send({ line1: '10 Park Rd', city: 'Delhi' });
    const addrId = addRes.body.addresses[0]._id;

    const delRes = await api.delete(`/api/customer/addresses/${addrId}`).set(authHeader(token));
    expect(delRes.status).toBe(200);
    expect(delRes.body.addresses).toHaveLength(0);
  });

  it('DELETE /addresses/:id with unknown id returns 404', async () => {
    const { token } = await createCustomer();
    const fakeId = new mongoose.Types.ObjectId();
    const res = await api.delete(`/api/customer/addresses/${fakeId}`).set(authHeader(token));
    expect(res.status).toBe(404);
  });
});

// ─── SOCIETIES ────────────────────────────────────────────────────────────────
describe('CUST | GET /societies', () => {
  it('returns only active societies', async () => {
    await createSociety();
    const { token } = await createCustomer();

    const res = await api.get('/api/customer/societies').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.societies)).toBe(true);
    expect(res.body.societies.length).toBeGreaterThanOrEqual(1);
  });
});

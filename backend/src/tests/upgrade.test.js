import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { api, createCustomer, createVehicle, createPackage, seedSettings, authHeader } from './helpers.js';
import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';

vi.mock('razorpay', () => ({
  default: vi.fn().mockImplementation(() => ({ orders: { create: vi.fn(), fetch: vi.fn() } })),
}));
process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
process.env.RAZORPAY_KEY_SECRET = 'fake_razorpay_secret';

const verifiedPayment = (customerId) => Payment.create({
  customer: customerId,
  orderId: `order_${crypto.randomBytes(4).toString('hex')}`,
  paymentId: `pay_${crypto.randomBytes(4).toString('hex')}`,
  signature: 'sig_ok',
  amount: 79900,
  status: 'verified',
});

const activeSub = (customerId, vehicleId, pkgId, over = {}) => Subscription.create({
  customer: customerId,
  vehicle: vehicleId,
  package: pkgId,
  society: new mongoose.Types.ObjectId(),
  slot: '06_07_AM',
  isTrial: false,
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  totalDays: 30,
  remainingDays: 20,
  completedDays: 8,
  amount: 399,
  status: 'Active',
  ...over,
});

// ─── VEHICLE IDENTITY LOCK ──────────────────────────────────────────────────
describe('VLOCK | vehicle identity locked while a plan is active', () => {
  it('ignores brand/model/number changes but still updates parking', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id, { brand: 'Maruti', model: 'Swift', number: 'MH01AB1111' });
    const pkg = await createPackage();
    await activeSub(customer._id, vehicle._id, pkg._id);

    const res = await api.put(`/api/customer/vehicles/${vehicle._id}`).set(authHeader(token)).send({
      brand: 'Audi', model: 'A4', number: 'HACK9999', flatNumber: '202', blockTower: 'Tower B',
    });
    expect(res.status).toBe(200);
    // Identity unchanged
    expect(res.body.vehicle.brand).toBe('Maruti');
    expect(res.body.vehicle.model).toBe('Swift');
    expect(res.body.vehicle.number).toBe('MH01AB1111');
    // Parking still updated
    expect(res.body.vehicle.flatNumber).toBe('202');
    expect(res.body.vehicle.parking).toMatch(/Tower B/);
  });

  it('allows full edits when there is no active subscription', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id, { brand: 'Maruti', model: 'Swift' });
    const res = await api.put(`/api/customer/vehicles/${vehicle._id}`).set(authHeader(token)).send({
      brand: 'Honda', model: 'City', number: 'MH02CD2222', flatNumber: '5',
    });
    expect(res.status).toBe(200);
    expect(res.body.vehicle.brand).toBe('Honda');
    expect(res.body.vehicle.model).toBe('City');
  });
});

// ─── PLAN UPGRADE ───────────────────────────────────────────────────────────
describe('UPG | plan upgrade', () => {
  beforeEach(async () => { await seedSettings(); });

  it('upgrades to a higher tier, charges new price, resets the 30-day term', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const basic = await createPackage({ name: 'Basic', tier: 'BASIC', price: 399 });
    const premium = await createPackage({ name: 'Premium', tier: 'PREMIUM', price: 799 });
    const sub = await activeSub(customer._id, vehicle._id, basic._id);
    const pay = await verifiedPayment(customer._id);

    const res = await api.post(`/api/customer/subscriptions/${sub._id}/upgrade`).set(authHeader(token))
      .send({ packageId: premium._id, paymentId: pay.paymentId });

    expect(res.status).toBe(200);
    const updated = await Subscription.findById(sub._id);
    expect(updated.package.toString()).toBe(premium._id.toString());
    expect(updated.amount).toBe(799);
    expect(updated.totalDays).toBe(30);
    expect(updated.remainingDays).toBe(30);
    expect(updated.completedDays).toBe(0);
  });

  it('rejects a same/lower tier "upgrade"', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const premium = await createPackage({ name: 'Premium', tier: 'PREMIUM', price: 799 });
    const basic = await createPackage({ name: 'Basic', tier: 'BASIC', price: 399 });
    const sub = await activeSub(customer._id, vehicle._id, premium._id);
    const pay = await verifiedPayment(customer._id);

    const res = await api.post(`/api/customer/subscriptions/${sub._id}/upgrade`).set(authHeader(token))
      .send({ packageId: basic._id, paymentId: pay.paymentId });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/higher-tier/i);
  });

  it('rejects an unverified payment', async () => {
    const { customer, token } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const basic = await createPackage({ name: 'Basic', tier: 'BASIC', price: 399 });
    const premium = await createPackage({ name: 'Premium', tier: 'PREMIUM', price: 799 });
    const sub = await activeSub(customer._id, vehicle._id, basic._id);

    const res = await api.post(`/api/customer/subscriptions/${sub._id}/upgrade`).set(authHeader(token))
      .send({ packageId: premium._id, paymentId: 'pay_does_not_exist' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/payment not verified/i);
  });
});

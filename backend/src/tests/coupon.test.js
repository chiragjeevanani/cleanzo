import { describe, it, expect } from 'vitest';
import { api, authHeader, createAdmin, createCustomer, createSociety } from './helpers.js';
import { computeCouponDiscount, validateCoupon } from '../utils/coupon.js';
import Coupon from '../models/Coupon.js';
import CouponRedemption from '../models/CouponRedemption.js';

// ─── PURE HELPER ──────────────────────────────────────────────────────────────
describe('CPN-1 | computeCouponDiscount', () => {
  it('computes a percentage discount', () => {
    const r = computeCouponDiscount({ discountType: 'percent', discountValue: 20 }, 1000);
    expect(r.discountAmount).toBe(200);
    expect(r.finalAmount).toBe(800);
  });

  it('computes a flat discount and never goes below 0', () => {
    expect(computeCouponDiscount({ discountType: 'flat', discountValue: 100 }, 400)).toEqual({ discountAmount: 100, finalAmount: 300 });
    expect(computeCouponDiscount({ discountType: 'flat', discountValue: 999 }, 400)).toEqual({ discountAmount: 400, finalAmount: 0 });
  });
});

// ─── validateCoupon ───────────────────────────────────────────────────────────
describe('CPN-2 | validateCoupon rules', () => {
  const baseDoc = (over = {}) => ({
    code: 'SAVE20', discountType: 'percent', discountValue: 20,
    appliesTo: 'first_purchase', societies: [], ...over,
  });

  it('accepts a matching coupon and returns the discount', async () => {
    const { customer } = await createCustomer();
    await Coupon.create(baseDoc());
    const r = await validateCoupon({ code: 'save20', customerId: customer._id, category: 'first_purchase', baseAmount: 500 });
    expect(r.discountAmount).toBe(100);
    expect(r.finalAmount).toBe(400);
  });

  it('rejects an expired coupon', async () => {
    const { customer } = await createCustomer();
    await Coupon.create(baseDoc({ code: 'OLD', expiresAt: new Date(Date.now() - 1000) }));
    await expect(validateCoupon({ code: 'OLD', customerId: customer._id, category: 'first_purchase', baseAmount: 500 }))
      .rejects.toThrow(/expired/i);
  });

  it('rejects when the category does not match', async () => {
    const { customer } = await createCustomer();
    await Coupon.create(baseDoc({ code: 'EXTONLY', appliesTo: 'extension' }));
    await expect(validateCoupon({ code: 'EXTONLY', customerId: customer._id, category: 'first_purchase', baseAmount: 500 }))
      .rejects.toThrow(/extension/i);
  });

  it('enforces society scope', async () => {
    const { customer } = await createCustomer();
    const soc = await createSociety();
    const other = await createSociety({ name: 'Other Society' });
    await Coupon.create(baseDoc({ code: 'SOC1', societies: [soc._id] }));
    await expect(validateCoupon({ code: 'SOC1', customerId: customer._id, category: 'first_purchase', societyId: other._id, baseAmount: 500 }))
      .rejects.toThrow(/society/i);
    const ok = await validateCoupon({ code: 'SOC1', customerId: customer._id, category: 'first_purchase', societyId: soc._id, baseAmount: 500 });
    expect(ok.discountAmount).toBe(100);
  });

  it('enforces minimum order amount', async () => {
    const { customer } = await createCustomer();
    await Coupon.create(baseDoc({ code: 'MIN500', minOrderAmount: 500 }));
    await expect(validateCoupon({ code: 'MIN500', customerId: customer._id, category: 'first_purchase', baseAmount: 300 }))
      .rejects.toThrow(/minimum/i);
  });

  it('rejects once the redemption cap is reached', async () => {
    const { customer } = await createCustomer();
    await Coupon.create(baseDoc({ code: 'CAP', maxRedemptions: 5, redemptionCount: 5 }));
    await expect(validateCoupon({ code: 'CAP', customerId: customer._id, category: 'first_purchase', baseAmount: 500 }))
      .rejects.toThrow(/usage limit/i);
  });

  it('rejects a second use by the same customer when oncePerCustomer', async () => {
    const { customer } = await createCustomer();
    const c = await Coupon.create(baseDoc({ code: 'ONCE', oncePerCustomer: true }));
    await CouponRedemption.create({ coupon: c._id, customer: customer._id });
    await expect(validateCoupon({ code: 'ONCE', customerId: customer._id, category: 'first_purchase', baseAmount: 500 }))
      .rejects.toThrow(/already used/i);
  });
});

// ─── ADMIN CRUD + customer preview endpoint ────────────────────────────────────
describe('CPN-3 | admin coupon endpoints', () => {
  it('creates a coupon and rejects a duplicate code', async () => {
    const { token } = await createAdmin();
    const payload = { code: 'welcome', discountType: 'percent', discountValue: 15, appliesTo: 'first_purchase' };
    const create = await api.post('/api/admin/coupons').set(authHeader(token)).send(payload);
    expect(create.status).toBe(201);
    expect(create.body.coupon.code).toBe('WELCOME');

    const dup = await api.post('/api/admin/coupons').set(authHeader(token)).send(payload);
    expect(dup.status).toBe(409);
  });

  it('rejects a percent value above 100', async () => {
    const { token } = await createAdmin();
    const res = await api.post('/api/admin/coupons').set(authHeader(token))
      .send({ code: 'BAD', discountType: 'percent', discountValue: 150, appliesTo: 'renewal' });
    expect(res.status).toBe(400);
  });

  it('lists coupons', async () => {
    const { token } = await createAdmin();
    await api.post('/api/admin/coupons').set(authHeader(token)).send({ code: 'L1', discountType: 'flat', discountValue: 50, appliesTo: 'extension' });
    const list = await api.get('/api/admin/coupons').set(authHeader(token));
    expect(list.status).toBe(200);
    expect(list.body.coupons.some(c => c.code === 'L1')).toBe(true);
  });
});

describe('CPN-4 | customer coupon validate endpoint', () => {
  it('previews a valid first-purchase coupon', async () => {
    const { token } = await createCustomer();
    await Coupon.create({ code: 'NEW10', discountType: 'percent', discountValue: 10, appliesTo: 'first_purchase' });
    const res = await api.post('/api/customer/coupons/validate').set(authHeader(token))
      .send({ code: 'NEW10', type: 'first_purchase', baseAmount: 1000 });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.discountAmount).toBe(100);
    expect(res.body.finalAmount).toBe(900);
  });

  it('returns 400 for an invalid code', async () => {
    const { token } = await createCustomer();
    const res = await api.post('/api/customer/coupons/validate').set(authHeader(token))
      .send({ code: 'NOPE', type: 'first_purchase', baseAmount: 1000 });
    expect(res.status).toBe(400);
  });
});

import { describe, it, expect } from 'vitest';
import { api, authHeader, createAdmin, createPackage } from './helpers.js';
import { resolvePackageDiscount } from '../utils/discount.js';
import Settings from '../models/Settings.js';
import PackageDiscount from '../models/PackageDiscount.js';

// ─── PURE HELPER ──────────────────────────────────────────────────────────────
describe('DISC-1 | resolvePackageDiscount helper', () => {
  const pkg = { _id: 'pkg1', price: 1000 };
  const vehicle = { brand: 'Maruti', model: 'Swift' };

  it('returns no discount when nothing is configured', () => {
    const r = resolvePackageDiscount(pkg, vehicle, { global: {}, individual: [] });
    expect(r.hasDiscount).toBe(false);
    expect(r.effectivePrice).toBe(1000);
  });

  it('applies the global discount when active', () => {
    const r = resolvePackageDiscount(pkg, vehicle, { global: { percent: 20, note: 'Sale', isActive: true }, individual: [] });
    expect(r.hasDiscount).toBe(true);
    expect(r.percent).toBe(20);
    expect(r.effectivePrice).toBe(800);
    expect(r.source).toBe('global');
  });

  it('individual override beats global for the matching vehicle', () => {
    const config = {
      global: { percent: 20, note: 'Sale', isActive: true },
      individual: [{ package: 'pkg1', brand: 'Maruti', model: 'Swift', percent: 30, note: 'Swift deal', isActive: true }],
    };
    const r = resolvePackageDiscount(pkg, vehicle, config);
    expect(r.source).toBe('individual');
    expect(r.percent).toBe(30);
    expect(r.effectivePrice).toBe(700);
    // A different model still gets the global discount
    const other = resolvePackageDiscount(pkg, { brand: 'Maruti', model: 'Baleno' }, config);
    expect(other.source).toBe('global');
    expect(other.percent).toBe(20);
  });

  it('blank-model individual discount covers all models of the brand', () => {
    const config = {
      global: { percent: 0, isActive: false },
      individual: [{ package: 'pkg1', brand: 'Maruti', model: '', percent: 15, isActive: true }],
    };
    expect(resolvePackageDiscount(pkg, { brand: 'Maruti', model: 'Swift' }, config).percent).toBe(15);
    expect(resolvePackageDiscount(pkg, { brand: 'Maruti', model: 'Dzire' }, config).percent).toBe(15);
    expect(resolvePackageDiscount(pkg, { brand: 'Honda', model: 'City' }, config).hasDiscount).toBe(false);
  });

  it('prefers an exact-model match over a brand-wide one', () => {
    const config = {
      global: { isActive: false },
      individual: [
        { package: 'pkg1', brand: 'Maruti', model: '', percent: 10, isActive: true },
        { package: 'pkg1', brand: 'Maruti', model: 'Swift', percent: 40, isActive: true },
      ],
    };
    expect(resolvePackageDiscount(pkg, { brand: 'Maruti', model: 'Swift' }, config).percent).toBe(40);
  });
});

// ─── ADMIN ENDPOINTS ────────────────────────────────────────────────────────
describe('DISC-2 | admin discount CRUD', () => {
  it('rejects an out-of-range global percent', async () => {
    const { token } = await createAdmin();
    const res = await api.put('/api/admin/discounts/global').set(authHeader(token)).send({ percent: 150 });
    expect(res.status).toBe(400);
  });

  it('saves the global discount and exposes it publicly', async () => {
    const { token } = await createAdmin();
    const put = await api.put('/api/admin/discounts/global').set(authHeader(token)).send({ percent: 25, note: 'Festive', isActive: true });
    expect(put.status).toBe(200);
    expect(put.body.global.percent).toBe(25);

    const stored = await Settings.findOne({ key: 'packageDiscount' });
    expect(stored.value.percent).toBe(25);
    expect(stored.value.isActive).toBe(true);

    const pub = await api.get('/api/public/discounts');
    expect(pub.status).toBe(200);
    expect(pub.body.global.percent).toBe(25);
  });

  it('creates, lists, and deletes an individual discount', async () => {
    const { token } = await createAdmin();
    const pkg = await createPackage();

    const create = await api.post('/api/admin/discounts/individual').set(authHeader(token))
      .send({ packageId: pkg._id, brand: 'Maruti', model: 'Swift', percent: 30, note: 'Swift offer' });
    expect(create.status).toBe(201);
    expect(create.body.discount.percent).toBe(30);

    const list = await api.get('/api/admin/discounts').set(authHeader(token));
    expect(list.status).toBe(200);
    expect(list.body.individual.length).toBe(1);
    expect(list.body.individual[0].package.name).toBe(pkg.name);

    const del = await api.delete(`/api/admin/discounts/individual/${create.body.discount._id}`).set(authHeader(token));
    expect(del.status).toBe(200);
    expect(await PackageDiscount.countDocuments()).toBe(0);
  });

  it('rejects a duplicate package+brand+model override', async () => {
    const { token } = await createAdmin();
    const pkg = await createPackage();
    const payload = { packageId: pkg._id, brand: 'Maruti', model: 'Swift', percent: 30 };
    const first = await api.post('/api/admin/discounts/individual').set(authHeader(token)).send(payload);
    expect(first.status).toBe(201);
    const dup = await api.post('/api/admin/discounts/individual').set(authHeader(token)).send(payload);
    expect(dup.status).toBe(409);
  });
});

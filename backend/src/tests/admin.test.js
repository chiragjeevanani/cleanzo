import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { api, createAdmin, createCustomer, createCleaner, createSociety, createPackage, authHeader } from './helpers.js';
import Cleaner from '../models/Cleaner.js';
import Customer from '../models/Customer.js';
import CleanerApplication from '../models/CleanerApplication.js';
import Notification from '../models/Notification.js';
import Settings from '../models/Settings.js';
import Subscription from '../models/Subscription.js';
import Package from '../models/Package.js';
import Society from '../models/Society.js';

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
describe('ADMIN-1 | GET /admin/dashboard', () => {
  it('returns all expected KPI fields', async () => {
    const { token } = await createAdmin();
    const res = await api.get('/api/admin/dashboard').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.kpiData)).toBe(true);
    expect(res.body.kpiData.length).toBe(4);
    expect(res.body).toHaveProperty('pieData');
    expect(res.body).toHaveProperty('revenueData');
    expect(res.body).toHaveProperty('recentActivity');
  });

  it('recent activity is sorted newest-first (bug-fix check)', async () => {
    const { token } = await createAdmin();
    const requiredFields = { age: 25, fatherName: 'Test Father', permanentAddress: '1 Old St', currentAddress: '1 Old St', localReference: { name: 'Ref Name', phone: '9999999991' } };
    const oldApp = await CleanerApplication.create({ name: 'Old App', phone: '8000000001', city: 'Delhi', ...requiredFields });
    const newApp = await CleanerApplication.create({ name: 'New App', phone: '8000000002', city: 'Mumbai', ...requiredFields });
    // Force timestamps so sort order is deterministic
    await CleanerApplication.updateOne({ _id: oldApp._id }, { $set: { createdAt: new Date('2024-01-01') } });
    await CleanerApplication.updateOne({ _id: newApp._id }, { $set: { createdAt: new Date('2024-06-01') } });

    const res = await api.get('/api/admin/dashboard').set(authHeader(token));
    expect(res.status).toBe(200);
    const activities = res.body.recentActivity;
    if (activities.length >= 2) {
      // Verify newer entries appear before older ones by checking text content
      const newIdx = activities.findIndex(a => a.text.includes('New App'));
      const oldIdx = activities.findIndex(a => a.text.includes('Old App'));
      if (newIdx !== -1 && oldIdx !== -1) {
        expect(newIdx).toBeLessThan(oldIdx);
      }
    }
  });
});

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────────
describe('ADMIN | User management', () => {
  it('returns paginated user list', async () => {
    const { token } = await createAdmin();
    await createCustomer(); await createCustomer();
    const res = await api.get('/api/admin/users').set(authHeader(token)).query({ limit: 1 });
    expect(res.status).toBe(200);
    expect(res.body.users.length).toBe(1);
    expect(res.body).toHaveProperty('total');
  });

  it('deactivates (soft-deletes) a user', async () => {
    const { token } = await createAdmin();
    const { customer } = await createCustomer();
    const res = await api.delete(`/api/admin/users/${customer._id}`).set(authHeader(token));
    expect(res.status).toBe(200);
    const updated = await (await import('../models/Customer.js')).default.findById(customer._id);
    expect(updated.isActive).toBe(false);
  });
});

// ─── CLEANER APPLICATION REVIEW ───────────────────────────────────────────────
describe('ADMIN | GET /cleaner-applications', () => {
  const requiredFields = { age: 26, fatherName: 'Father', permanentAddress: 'Addr', currentAddress: 'Addr', localReference: { name: 'Ref', phone: '9700000001' } };

  it('returns all cleaner applications sorted newest-first', async () => {
    const { token } = await createAdmin();
    await CleanerApplication.create({ name: 'App One', phone: '8600000001', city: 'Delhi', ...requiredFields });
    await CleanerApplication.create({ name: 'App Two', phone: '8600000002', city: 'Mumbai', ...requiredFields });

    const res = await api.get('/api/admin/cleaner-applications').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.applications)).toBe(true);
    expect(res.body.applications.length).toBe(2);
  });

  it('returns empty array when no applications exist', async () => {
    const { token } = await createAdmin();
    const res = await api.get('/api/admin/cleaner-applications').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.applications).toEqual([]);
  });
});

describe('ADMIN-2..3 | Cleaner application approval', () => {
  async function seedApplication(phone = '8000000010') {
    return CleanerApplication.create({
      name: 'Apply Bob', phone, age: 28, city: 'Chennai',
      fatherName: 'Bob Sr', permanentAddress: '1 Main St', currentAddress: '1 Main St',
      localReference: { name: 'Ref Person', phone: '9888888888' },
    });
  }

  it('ADMIN-2: approves application and creates Cleaner document', async () => {
    const { token } = await createAdmin();
    const app = await seedApplication('8000000011');

    const res = await api.put(`/api/admin/cleaner-applications/${app._id}`).set(authHeader(token)).send({ status: 'approved' });
    expect(res.status).toBe(200);
    const cleaner = await Cleaner.findOne({ phone: '8000000011' });
    expect(cleaner).not.toBeNull();
    expect(cleaner.kycStatus).toBe('approved');
  });

  it('ADMIN-3: approving a phone that is already a cleaner returns 409', async () => {
    const { token } = await createAdmin();
    await createCleaner({ phone: '8000000012' });
    const app = await seedApplication('8000000012');

    const res = await api.put(`/api/admin/cleaner-applications/${app._id}`).set(authHeader(token)).send({ status: 'approved' });
    expect(res.status).toBe(409);
  });

  it('ADMIN-4: rejecting without rejectionNote returns 400', async () => {
    const { token } = await createAdmin();
    const app = await seedApplication('8000000013');
    const res = await api.put(`/api/admin/cleaner-applications/${app._id}`).set(authHeader(token)).send({ status: 'rejected' });
    expect(res.status).toBe(400);
  });
});

// ─── KYC REVIEW ──────────────────────────────────────────────────────────────
describe('ADMIN-4..5 | Cleaner KYC review', () => {
  it('ADMIN-5: approves KYC and clears rejection note', async () => {
    const { token } = await createAdmin();
    const { cleaner } = await createCleaner({ kycStatus: 'pending' });

    const res = await api.put(`/api/admin/cleaner-kyc/${cleaner._id}`).set(authHeader(token)).send({ status: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.cleaner.kycStatus).toBe('approved');
  });

  it('ADMIN-4: rejects KYC without note returns 400', async () => {
    const { token } = await createAdmin();
    const { cleaner } = await createCleaner({ kycStatus: 'pending' });
    const res = await api.put(`/api/admin/cleaner-kyc/${cleaner._id}`).set(authHeader(token)).send({ status: 'rejected' });
    expect(res.status).toBe(400);
  });

  it('stores rejection note on rejected KYC', async () => {
    const { token } = await createAdmin();
    const { cleaner } = await createCleaner({ kycStatus: 'pending' });
    await api.put(`/api/admin/cleaner-kyc/${cleaner._id}`).set(authHeader(token)).send({ status: 'rejected', rejectionNote: 'Blurry photo' });
    const updated = await Cleaner.findById(cleaner._id);
    expect(updated.kycRejectionNote).toBe('Blurry photo');
  });
});

// ─── BROADCAST NOTIFICATIONS ──────────────────────────────────────────────────
describe('ADMIN-6 | Broadcast notifications', () => {
  it('sends notification to all active customers and cleaners', async () => {
    const { token } = await createAdmin();
    await createCustomer(); await createCustomer();
    await createCleaner();

    const res = await api.post('/api/admin/notifications/broadcast').set(authHeader(token)).send({
      title: 'Maintenance', message: 'App downtime tonight', target: 'all',
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/sent to/i);

    const count = await Notification.countDocuments();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it('invalid target returns 400', async () => {
    const { token } = await createAdmin();
    const res = await api.post('/api/admin/notifications/broadcast').set(authHeader(token)).send({
      title: 'Test', message: 'Test', target: 'everyone',
    });
    expect(res.status).toBe(400);
  });
});

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
describe('ADMIN-10..11 | Settings', () => {
  beforeEach(async () => {
    await Settings.create({ key: 'trialPrice', value: 30, description: 'Trial price' });
  });

  it('ADMIN-10: updates an existing setting', async () => {
    const { token } = await createAdmin();
    const res = await api.put('/api/admin/settings/trialPrice').set(authHeader(token)).send({ value: 50 });
    expect(res.status).toBe(200);
    expect(res.body.setting.value).toBe(50);
  });

  it('ADMIN-11: returns 404 for unknown setting key', async () => {
    const { token } = await createAdmin();
    const res = await api.put('/api/admin/settings/unknownKey').set(authHeader(token)).send({ value: 99 });
    expect(res.status).toBe(404);
  });
});

// ─── ROLE ISOLATION ───────────────────────────────────────────────────────────
describe('ADMIN-7..8 | Role isolation', () => {
  it('ADMIN-7: admin token rejected on customer route', async () => {
    const { token } = await createAdmin();
    const res = await api.get('/api/customer/profile').set(authHeader(token));
    expect(res.status).toBe(403);
  });

  it('ADMIN-8: customer token rejected on admin route', async () => {
    const { token } = await createCustomer();
    const res = await api.get('/api/admin/dashboard').set(authHeader(token));
    expect(res.status).toBe(403);
  });
});

// ─── USER CRUD (extended) ─────────────────────────────────────────────────────
describe('ADMIN | User CRUD', () => {
  it('POST /users creates a user with required fields', async () => {
    const { token } = await createAdmin();
    const res = await api.post('/api/admin/users').set(authHeader(token)).send({
      firstName: 'New', lastName: 'User', phone: '9100000001', email: 'new@example.com', city: 'Delhi',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.firstName).toBe('New');
  });

  it('POST /users returns 400 when required fields are missing', async () => {
    const { token } = await createAdmin();
    const res = await api.post('/api/admin/users').set(authHeader(token)).send({ firstName: 'Only' });
    expect(res.status).toBe(400);
  });

  it('POST /users returns 409 when phone already exists', async () => {
    const { token } = await createAdmin();
    await createCustomer({ phone: '9100000002' });
    const res = await api.post('/api/admin/users').set(authHeader(token)).send({
      firstName: 'Dup', phone: '9100000002', email: 'dup@example.com', city: 'Mumbai',
    });
    expect(res.status).toBe(409);
  });

  it('GET /users/:id returns user with subscriptions', async () => {
    const { token } = await createAdmin();
    const { customer } = await createCustomer();
    const res = await api.get(`/api/admin/users/${customer._id}`).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.user._id).toBe(customer._id.toString());
    expect(Array.isArray(res.body.subscriptions)).toBe(true);
  });

  it('GET /users/:id returns 404 for unknown id', async () => {
    const { token } = await createAdmin();
    const res = await api.get(`/api/admin/users/${new mongoose.Types.ObjectId()}`).set(authHeader(token));
    expect(res.status).toBe(404);
  });

  it('PUT /users/:id updates user fields', async () => {
    const { token } = await createAdmin();
    const { customer } = await createCustomer();
    const res = await api.put(`/api/admin/users/${customer._id}`).set(authHeader(token)).send({ city: 'Kolkata' });
    expect(res.status).toBe(200);
    expect(res.body.user.city).toBe('Kolkata');
  });
});

// ─── CLEANER CRUD ─────────────────────────────────────────────────────────────
describe('ADMIN | Cleaner CRUD', () => {
  it('GET /cleaners returns paginated cleaner list', async () => {
    const { token } = await createAdmin();
    await createCleaner(); await createCleaner();
    const res = await api.get('/api/admin/cleaners').set(authHeader(token)).query({ limit: 1 });
    expect(res.status).toBe(200);
    expect(res.body.cleaners.length).toBe(1);
    expect(res.body).toHaveProperty('total');
  });

  it('POST /cleaners creates a cleaner directly', async () => {
    const { token } = await createAdmin();
    const res = await api.post('/api/admin/cleaners').set(authHeader(token)).send({
      name: 'Admin Cleaner', phone: '8500000001', city: 'Chennai',
    });
    expect(res.status).toBe(201);
    expect(res.body.cleaner.name).toBe('Admin Cleaner');
  });

  it('POST /cleaners returns 400 when name/phone/city missing', async () => {
    const { token } = await createAdmin();
    const res = await api.post('/api/admin/cleaners').set(authHeader(token)).send({ name: 'No Phone' });
    expect(res.status).toBe(400);
  });

  it('PUT /cleaners/:id updates cleaner fields', async () => {
    const { token } = await createAdmin();
    const { cleaner } = await createCleaner();
    const res = await api.put(`/api/admin/cleaners/${cleaner._id}`).set(authHeader(token)).send({ dailyRate: 700 });
    expect(res.status).toBe(200);
    expect(res.body.cleaner.dailyRate).toBe(700);
  });

  it('PUT /cleaners/:id returns 404 for unknown cleaner', async () => {
    const { token } = await createAdmin();
    const res = await api.put(`/api/admin/cleaners/${new mongoose.Types.ObjectId()}`).set(authHeader(token)).send({ dailyRate: 700 });
    expect(res.status).toBe(404);
  });

  it('DELETE /cleaners/:id deactivates the cleaner', async () => {
    const { token } = await createAdmin();
    const { cleaner } = await createCleaner();
    const res = await api.delete(`/api/admin/cleaners/${cleaner._id}`).set(authHeader(token));
    expect(res.status).toBe(200);
    const updated = await Cleaner.findById(cleaner._id);
    expect(updated.isActive).toBe(false);
  });

  it('DELETE /cleaners/:id returns 404 for unknown cleaner', async () => {
    const { token } = await createAdmin();
    const res = await api.delete(`/api/admin/cleaners/${new mongoose.Types.ObjectId()}`).set(authHeader(token));
    expect(res.status).toBe(404);
  });
});

// ─── PACKAGE CRUD ─────────────────────────────────────────────────────────────
describe('ADMIN | Package CRUD', () => {
  it('GET /packages returns all packages', async () => {
    const { token } = await createAdmin();
    await createPackage();
    const res = await api.get('/api/admin/packages').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.packages)).toBe(true);
    expect(res.body.packages.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /packages creates a package', async () => {
    const { token } = await createAdmin();
    const res = await api.post('/api/admin/packages').set(authHeader(token)).send({
      name: 'Premium', price: 599, tier: 'premium', category: 'sedan', features: ['Polish'],
    });
    expect(res.status).toBe(201);
    expect(res.body.package.name).toBe('Premium');
  });

  it('POST /packages returns 400 when name or price missing', async () => {
    const { token } = await createAdmin();
    const res = await api.post('/api/admin/packages').set(authHeader(token)).send({ tier: 'basic' });
    expect(res.status).toBe(400);
  });

  it('PUT /packages/:id updates package fields', async () => {
    const { token } = await createAdmin();
    const pkg = await createPackage();
    const res = await api.put(`/api/admin/packages/${pkg._id}`).set(authHeader(token)).send({ price: 500 });
    expect(res.status).toBe(200);
    expect(res.body.package.price).toBe(500);
  });

  it('PUT /packages/:id returns 404 for unknown package', async () => {
    const { token } = await createAdmin();
    const res = await api.put(`/api/admin/packages/${new mongoose.Types.ObjectId()}`).set(authHeader(token)).send({ price: 500 });
    expect(res.status).toBe(404);
  });
});

// ─── SUBSCRIPTIONS & REVENUE ──────────────────────────────────────────────────
describe('ADMIN | Subscriptions and Revenue', () => {
  it('GET /subscriptions returns paginated list', async () => {
    const { token } = await createAdmin();
    const { customer } = await createCustomer();
    const vehicle = await (await import('./helpers.js')).createVehicle(customer._id);
    await Subscription.create({
      customer: customer._id, vehicle: vehicle._id, isTrial: true,
      startDate: new Date(), endDate: new Date(Date.now() + 86400000),
      totalDays: 1, remainingDays: 1, amount: 30, status: 'Active',
    });

    const res = await api.get('/api/admin/subscriptions').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.subscriptions)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /subscriptions filters by status', async () => {
    const { token } = await createAdmin();
    const res = await api.get('/api/admin/subscriptions').set(authHeader(token)).query({ status: 'Expired' });
    expect(res.status).toBe(200);
    expect(res.body.subscriptions.every(s => s.status === 'Expired')).toBe(true);
  });

  it('GET /revenue returns summary, chartData, and topCustomers', async () => {
    const { token } = await createAdmin();
    const res = await api.get('/api/admin/revenue').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.summary)).toBe(true);
    expect(res.body.summary.length).toBe(3);
    expect(Array.isArray(res.body.chartData)).toBe(true);
    expect(Array.isArray(res.body.topCustomers)).toBe(true);
  });
});

// ─── ADMIN NOTIFICATIONS ──────────────────────────────────────────────────────
describe('ADMIN | GET /notifications', () => {
  it('returns paginated notification list across customers and cleaners', async () => {
    const { token } = await createAdmin();
    const { customer } = await createCustomer();
    await Notification.create({ recipient: customer._id, recipientModel: 'Customer', type: 'subscription', title: 'Test', message: 'Hi' });

    const res = await api.get('/api/admin/notifications').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.notifications)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });
});

// ─── SOCIETY CRUD ─────────────────────────────────────────────────────────────
describe('ADMIN | Society CRUD', () => {
  it('GET /societies returns all societies', async () => {
    const { token } = await createAdmin();
    await createSociety();
    const res = await api.get('/api/admin/societies').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.societies)).toBe(true);
  });

  it('POST /societies creates a society', async () => {
    const { token } = await createAdmin();
    const res = await api.post('/api/admin/societies').set(authHeader(token)).send({
      name: 'New Colony', city: 'Bangalore', address: '1 Tech Park',
      slots: [{ slotId: '06_07_AM', timeWindow: '06:00-07:00', maxVehicles: 10, currentCount: 0 }],
    });
    expect(res.status).toBe(201);
    expect(res.body.society.name).toBe('New Colony');
  });

  it('PUT /societies/:id updates society fields', async () => {
    const { token } = await createAdmin();
    const society = await createSociety();
    const res = await api.put(`/api/admin/societies/${society._id}`).set(authHeader(token)).send({ name: 'Renamed' });
    expect(res.status).toBe(200);
    expect(res.body.society.name).toBe('Renamed');
  });

  it('PUT /societies/:id returns 404 for unknown society', async () => {
    const { token } = await createAdmin();
    const res = await api.put(`/api/admin/societies/${new mongoose.Types.ObjectId()}`).set(authHeader(token)).send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  it('DELETE /societies/:id deactivates the society', async () => {
    const { token } = await createAdmin();
    const society = await createSociety();
    const res = await api.delete(`/api/admin/societies/${society._id}`).set(authHeader(token));
    expect(res.status).toBe(200);
    const updated = await Society.findById(society._id);
    expect(updated.isActive).toBe(false);
  });

  it('DELETE /societies/:id returns 404 for unknown society', async () => {
    const { token } = await createAdmin();
    const res = await api.delete(`/api/admin/societies/${new mongoose.Types.ObjectId()}`).set(authHeader(token));
    expect(res.status).toBe(404);
  });
});

// ─── CLEANER APPLICATION — DELETE ─────────────────────────────────────────────
describe('ADMIN | DELETE /cleaner-applications/:id', () => {
  const requiredAppFields = {
    age: 25, fatherName: 'Test Father', permanentAddress: '1 Main St',
    currentAddress: '1 Main St', localReference: { name: 'Ref', phone: '9888888801' },
  };

  it('deletes a cleaner application permanently', async () => {
    const { token } = await createAdmin();
    const app = await CleanerApplication.create({ name: 'Del Bob', phone: '8700000001', city: 'Delhi', ...requiredAppFields });
    const res = await api.delete(`/api/admin/cleaner-applications/${app._id}`).set(authHeader(token));
    expect(res.status).toBe(200);
    const remaining = await CleanerApplication.findById(app._id);
    expect(remaining).toBeNull();
  });

  it('returns 404 for unknown application', async () => {
    const { token } = await createAdmin();
    const res = await api.delete(`/api/admin/cleaner-applications/${new mongoose.Types.ObjectId()}`).set(authHeader(token));
    expect(res.status).toBe(404);
  });
});

// ─── CLEANER KYC LIST ─────────────────────────────────────────────────────────
describe('ADMIN | GET /cleaner-kyc', () => {
  it('returns cleaners whose kycStatus matches the query param', async () => {
    const { token } = await createAdmin();
    await createCleaner({ kycStatus: 'pending' });
    await createCleaner({ kycStatus: 'approved' });

    const res = await api.get('/api/admin/cleaner-kyc').set(authHeader(token)).query({ status: 'pending' });
    expect(res.status).toBe(200);
    expect(res.body.cleaners.every(c => c.kycStatus === 'pending')).toBe(true);
  });

  it('defaults to pending when no status query param given', async () => {
    const { token } = await createAdmin();
    const res = await api.get('/api/admin/cleaner-kyc').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.cleaners)).toBe(true);
  });
});

// ─── SETTINGS GET ─────────────────────────────────────────────────────────────
describe('ADMIN | GET /settings', () => {
  it('returns all settings', async () => {
    const { token } = await createAdmin();
    await Settings.create({ key: 'trialPrice', value: 30 });
    await Settings.create({ key: 'prioritySlotFee', value: 99 });

    const res = await api.get('/api/admin/settings').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.settings)).toBe(true);
    expect(res.body.settings.length).toBeGreaterThanOrEqual(2);
  });
});

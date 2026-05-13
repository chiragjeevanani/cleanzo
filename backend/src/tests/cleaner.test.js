import { describe, it, expect, vi } from 'vitest';
import { api, createCleaner, createCustomer, createVehicle, authHeader } from './helpers.js';
import Task from '../models/Task.js';
import Cleaner from '../models/Cleaner.js';
import Attendance from '../models/Attendance.js';
import Subscription from '../models/Subscription.js';
import mongoose from 'mongoose';

async function pendingTask(cleanerId, customerId, vehicleId, subId) {
  return Task.create({
    subscription: subId || new mongoose.Types.ObjectId(),
    customer: customerId,
    cleaner: cleanerId,
    vehicle: vehicleId,
    date: new Date(),
    status: 'pending',
    packageName: 'Basic',
  });
}

async function activeSubscription(customerId, vehicleId) {
  return Subscription.create({
    customer: customerId,
    vehicle: vehicleId,
    isTrial: false,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    totalDays: 30,
    remainingDays: 30,
    amount: 399,
    status: 'Active',
  });
}

// ─── TASK STATUS UPDATE ───────────────────────────────────────────────────────
describe('CLEAN-1..3 | updateTaskStatus', () => {
  it('CLEAN-1: marks task in-progress and auto-creates attendance (present)', async () => {
    const { cleaner, token } = await createCleaner();
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const task = await pendingTask(cleaner._id, customer._id, vehicle._id);

    const res = await api.put(`/api/cleaner/tasks/${task._id}/status`).set(authHeader(token)).send({ status: 'in-progress' });
    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe('in-progress');

    // Attendance must be created (the P0 crash fix)
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const att = await Attendance.findOne({ cleaner: cleaner._id, date: today });
    expect(att).not.toBeNull();
    expect(att.status).toBe('present');
  });

  it('CLEAN-2: completing task increments totalCompleted and updates attendance', async () => {
    const { cleaner, token } = await createCleaner();
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const sub = await activeSubscription(customer._id, vehicle._id);
    const task = await pendingTask(cleaner._id, customer._id, vehicle._id, sub._id);

    const res = await api.put(`/api/cleaner/tasks/${task._id}/status`).set(authHeader(token)).send({ status: 'completed' });
    expect(res.status).toBe(200);

    const updatedCleaner = await Cleaner.findById(cleaner._id);
    expect(updatedCleaner.totalCompleted).toBe(1);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const att = await Attendance.findOne({ cleaner: cleaner._id, date: today });
    expect(att.tasksCompleted).toBe(1);
  });

  it('CLEAN-3: completing an already-completed task returns 400', async () => {
    const { cleaner, token } = await createCleaner();
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const task = await Task.create({
      subscription: new mongoose.Types.ObjectId(),
      customer: customer._id,
      cleaner: cleaner._id,
      vehicle: vehicle._id,
      date: new Date(),
      status: 'completed',
      packageName: 'Basic',
    });

    const res = await api.put(`/api/cleaner/tasks/${task._id}/status`).set(authHeader(token)).send({ status: 'completed' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already completed/i);
  });

  it('rejects status values outside in-progress/completed', async () => {
    const { cleaner, token } = await createCleaner();
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const task = await pendingTask(cleaner._id, customer._id, vehicle._id);

    const res = await api.put(`/api/cleaner/tasks/${task._id}/status`).set(authHeader(token)).send({ status: 'skipped' });
    expect(res.status).toBe(400);
  });
});

// ─── KYC ─────────────────────────────────────────────────────────────────────
describe('CLEAN-6..7 | KYC submission', () => {
  // Build a minimal valid JPEG buffer (magic bytes)
  const fakeJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, ...Array(12).fill(0)]);

  it('CLEAN-6: submits all 3 KYC docs and sets kycStatus=pending', async () => {
    const { cleaner, token } = await createCleaner();

    const res = await api
      .post('/api/cleaner/kyc')
      .set(authHeader(token))
      .attach('live_photo', fakeJpeg, { filename: 'face.jpg', contentType: 'image/jpeg' })
      .attach('aadhaar', fakeJpeg, { filename: 'aadhaar.jpg', contentType: 'image/jpeg' })
      .attach('pan', fakeJpeg, { filename: 'pan.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body.kycStatus).toBe('pending');
  });

  it('CLEAN-7: missing one KYC document returns 400', async () => {
    const { cleaner, token } = await createCleaner();

    const res = await api
      .post('/api/cleaner/kyc')
      .set(authHeader(token))
      .attach('live_photo', fakeJpeg, { filename: 'face.jpg', contentType: 'image/jpeg' })
      .attach('aadhaar', fakeJpeg, { filename: 'aadhaar.jpg', contentType: 'image/jpeg' });
    // pan is missing

    expect(res.status).toBe(400);
  });

  it('CLEAN-5: rejects non-image file (magic bytes check)', async () => {
    const { token } = await createCleaner();
    const fakePdf = Buffer.from('%PDF-1.4 fake content here');

    const res = await api
      .post('/api/cleaner/kyc')
      .set(authHeader(token))
      .attach('live_photo', fakePdf, { filename: 'face.jpg', contentType: 'image/jpeg' })
      .attach('aadhaar', fakePdf, { filename: 'aadhaar.jpg', contentType: 'image/jpeg' })
      .attach('pan', fakePdf, { filename: 'pan.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid image/i);
  });
});

// ─── ATTENDANCE & EARNINGS ────────────────────────────────────────────────────
describe('CLEAN-8..10 | Attendance and earnings', () => {
  it('CLEAN-8: GET /attendance returns records for the specified month', async () => {
    const { cleaner, token } = await createCleaner();
    const now = new Date();
    await Attendance.create({ cleaner: cleaner._id, date: new Date(now.getFullYear(), now.getMonth(), 5), status: 'present' });

    const res = await api
      .get('/api/cleaner/attendance')
      .set(authHeader(token))
      .query({ year: now.getFullYear(), month: now.getMonth() });
    expect(res.status).toBe(200);
    expect(res.body.history.length).toBe(1);
  });

  it('CLEAN-9: GET /earnings returns presentDays × dailyRate', async () => {
    const { cleaner, token } = await createCleaner();
    await Cleaner.findByIdAndUpdate(cleaner._id, { dailyRate: 600 });
    const now = new Date();
    await Attendance.create({ cleaner: cleaner._id, date: new Date(now.getFullYear(), now.getMonth(), 1), status: 'present' });
    await Attendance.create({ cleaner: cleaner._id, date: new Date(now.getFullYear(), now.getMonth(), 2), status: 'present' });

    const res = await api.get('/api/cleaner/earnings').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.presentDays).toBe(2);
    expect(res.body.totalEarnings).toBe(1200);
  });

  it('CLEAN-10: 3rd leave request in same month returns 400', async () => {
    const { cleaner, token } = await createCleaner();
    const now = new Date();
    // Seed 2 existing leaves
    await Attendance.insertMany([
      { cleaner: cleaner._id, date: new Date(now.getFullYear(), now.getMonth(), 1), status: 'leave' },
      { cleaner: cleaner._id, date: new Date(now.getFullYear(), now.getMonth(), 2), status: 'leave' },
    ]);
    const future = new Date(now.getFullYear(), now.getMonth(), 15).toISOString().split('T')[0];
    const res = await api.post('/api/cleaner/leave').set(authHeader(token)).send({ date: future });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/maximum 2 leaves/i);
  });
});

// ─── TODAY TASKS ─────────────────────────────────────────────────────────────
describe('CLEAN | GET /tasks/today', () => {
  it('returns only today\'s tasks for the authenticated cleaner', async () => {
    const { cleaner, token } = await createCleaner();
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);

    await pendingTask(cleaner._id, customer._id, vehicle._id);
    // Yesterday's task — should NOT appear
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    await Task.create({
      subscription: new mongoose.Types.ObjectId(),
      customer: customer._id,
      cleaner: cleaner._id,
      vehicle: vehicle._id,
      date: yesterday,
      status: 'pending',
      packageName: 'Basic',
    });

    const res = await api.get('/api/cleaner/tasks/today').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.tasks.length).toBe(1);
  });
});

// ─── PROFILE ─────────────────────────────────────────────────────────────────
describe('CLEAN | Profile', () => {
  it('GET /profile returns the cleaner\'s own data', async () => {
    const { cleaner, token } = await createCleaner();
    const res = await api.get('/api/cleaner/profile').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.user._id).toBe(cleaner._id.toString());
  });

  it('PUT /profile updates name and email', async () => {
    const { token } = await createCleaner();
    const res = await api.put('/api/cleaner/profile').set(authHeader(token)).send({ name: 'New Name', email: 'new@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('New Name');
    expect(res.body.user.email).toBe('new@example.com');
  });
});

// ─── AVAILABILITY ─────────────────────────────────────────────────────────────
describe('CLEAN | PUT /availability', () => {
  it('toggles isAvailable from false to true', async () => {
    const { cleaner, token } = await createCleaner();
    await Cleaner.findByIdAndUpdate(cleaner._id, { isAvailable: false });

    const res = await api.put('/api/cleaner/availability').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.isAvailable).toBe(true);
  });

  it('toggles isAvailable from true to false', async () => {
    const { cleaner, token } = await createCleaner();
    await Cleaner.findByIdAndUpdate(cleaner._id, { isAvailable: true });

    const res = await api.put('/api/cleaner/availability').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.isAvailable).toBe(false);
  });
});

// ─── GET TASK BY ID ───────────────────────────────────────────────────────────
describe('CLEAN | GET /tasks/:id', () => {
  it('returns the task when it belongs to the cleaner', async () => {
    const { cleaner, token } = await createCleaner();
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const task = await pendingTask(cleaner._id, customer._id, vehicle._id);

    const res = await api.get(`/api/cleaner/tasks/${task._id}`).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.task._id).toBe(task._id.toString());
  });

  it('returns 404 for a task belonging to a different cleaner', async () => {
    const { cleaner: other } = await createCleaner();
    const { token } = await createCleaner();
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const task = await pendingTask(other._id, customer._id, vehicle._id);

    const res = await api.get(`/api/cleaner/tasks/${task._id}`).set(authHeader(token));
    expect(res.status).toBe(404);
  });
});

// ─── HISTORY ─────────────────────────────────────────────────────────────────
describe('CLEAN | GET /history', () => {
  it('returns completed/skipped tasks only, not pending ones', async () => {
    const { cleaner, token } = await createCleaner();
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);

    await Task.create({ subscription: new mongoose.Types.ObjectId(), customer: customer._id, cleaner: cleaner._id, vehicle: vehicle._id, date: new Date(), status: 'completed', packageName: 'Basic' });
    await Task.create({ subscription: new mongoose.Types.ObjectId(), customer: customer._id, cleaner: cleaner._id, vehicle: vehicle._id, date: new Date(), status: 'pending', packageName: 'Basic' });

    const res = await api.get('/api/cleaner/history').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.tasks.length).toBe(1);
    expect(res.body.tasks[0].status).toBe('completed');
  });
});

// ─── KYC STATUS ───────────────────────────────────────────────────────────────
describe('CLEAN | GET /kyc', () => {
  it('returns kycStatus and kyc docs for the cleaner', async () => {
    const { token } = await createCleaner({ kycStatus: 'pending' });
    const res = await api.get('/api/cleaner/kyc').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.kycStatus).toBe('pending');
    expect(res.body).toHaveProperty('kyc');
  });
});

// ─── TASK PHOTO UPLOAD ────────────────────────────────────────────────────────
describe('CLEAN | POST /tasks/:id/photo', () => {
  const fakeJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, ...Array(12).fill(0)]);

  it('uploads a before photo and returns updated task photos', async () => {
    const { cleaner, token } = await createCleaner();
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const task = await pendingTask(cleaner._id, customer._id, vehicle._id);

    const res = await api
      .post(`/api/cleaner/tasks/${task._id}/photo`)
      .set(authHeader(token))
      .field('type', 'before')
      .attach('photo', fakeJpeg, { filename: 'before.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.photos.before)).toBe(true);
    expect(res.body.photos.before.length).toBe(1);
  });

  it('returns 400 when no file is provided', async () => {
    const { cleaner, token } = await createCleaner();
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const task = await pendingTask(cleaner._id, customer._id, vehicle._id);

    const res = await api.post(`/api/cleaner/tasks/${task._id}/photo`).set(authHeader(token)).send({ type: 'before' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-image file (magic bytes)', async () => {
    const { cleaner, token } = await createCleaner();
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const task = await pendingTask(cleaner._id, customer._id, vehicle._id);
    const fakePdf = Buffer.from('%PDF-1.4 fake content padding here!!');

    const res = await api
      .post(`/api/cleaner/tasks/${task._id}/photo`)
      .set(authHeader(token))
      .field('type', 'before')
      .attach('photo', fakePdf, { filename: 'trick.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid image/i);
  });
});

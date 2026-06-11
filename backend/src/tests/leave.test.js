import { describe, it, expect, vi } from 'vitest';
import Subscription from '../models/Subscription.js';
import Task from '../models/Task.js';
import LeaveRequest from '../models/LeaveRequest.js';
import { getISTMidnight } from '../utils/dateHelper.js';
import {
  api,
  createAdmin,
  createCleaner,
  createCustomer,
  createVehicle,
  createSociety,
  authHeader,
} from './helpers.js';

// Mock FCM — assignCleanerToSubscription and reviewCleanerKyc send push notifications
vi.mock('../services/fcm.service.js', () => ({
  sendPushNotification: vi.fn().mockResolvedValue({ success: true }),
  NOTIFICATION_LINKS: {
    task_assigned: '/cleaner/tasks',
    kyc_approved: '/kyc',
    kyc_rejected: '/kyc',
  },
}));

// Import createDailyTasks directly so we can call it in integration tests
const { createDailyTasks } = await import('../cron/referralCron.js');

// ─── shared helpers ───────────────────────────────────────────────────────────
function isoDate(daysFromNow) {
  // Use the IST calendar date (not the UTC date) so the "YYYY-MM-DD" we POST
  // matches how the server interprets it via getISTMidnight(). getISTMidnight()
  // returns the IST date as a UTC-midnight marker, so its ISO date IS the IST day.
  const d = getISTMidnight(new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000));
  return d.toISOString().split('T')[0]; // "YYYY-MM-DD" in IST
}

function istMidnightFor(daysFromNow) {
  return getISTMidnight(new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000));
}

async function makeActiveSub(customerId, vehicleId, societyId, cleanerId, overrides = {}) {
  return Subscription.create({
    customer: customerId,
    vehicle: vehicleId,
    society: societyId,
    slot: '06_07_AM',
    isTrial: false,
    startDate: getISTMidnight(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    totalDays: 30,
    remainingDays: 30,
    amount: 399,
    status: 'Active',
    ...(cleanerId ? { assignedCleaner: cleanerId } : {}),
    ...overrides,
  });
}

async function makePendingTaskFor(subId, customerId, cleanerId, vehicleId, dateOffset = 0) {
  return Task.create({
    subscription: subId,
    customer: customerId,
    cleaner: cleanerId,
    vehicle: vehicleId,
    date: istMidnightFor(dateOffset),
    scheduledTime: '06:00 AM',
    status: 'pending',
    packageName: 'Standard',
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — Leave → Cleaner Assignment Flow
// ═══════════════════════════════════════════════════════════════════════════════

describe('LEAVE-5.1 | assignCleanerToSubscription — leave guard', () => {
  it('rejects assignment if cleaner has an approved leave for today', async () => {
    const { token: adminToken } = await createAdmin();
    const { customer } = await createCustomer();
    const { cleaner } = await createCleaner();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await makeActiveSub(customer._id, vehicle._id, society._id);

    await LeaveRequest.create({
      cleaner: cleaner._id,
      date: getISTMidnight(),
      status: 'approved',
    });

    const res = await api
      .put(`/api/admin/subscriptions/${sub._id}/assign-cleaner`)
      .set(authHeader(adminToken))
      .send({ cleanerId: cleaner._id });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/leave/i);
  });

  it('allows assignment when cleaner has a leave for a DIFFERENT date', async () => {
    const { token: adminToken } = await createAdmin();
    const { customer } = await createCustomer();
    const { cleaner } = await createCleaner();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await makeActiveSub(customer._id, vehicle._id, society._id);

    // Leave is for tomorrow, not today
    await LeaveRequest.create({
      cleaner: cleaner._id,
      date: istMidnightFor(1),
      status: 'approved',
    });

    const res = await api
      .put(`/api/admin/subscriptions/${sub._id}/assign-cleaner`)
      .set(authHeader(adminToken))
      .send({ cleanerId: cleaner._id });

    expect(res.status).toBe(200);
  });

  it('allows assignment after a leave request is rejected (not approved)', async () => {
    const { token: adminToken } = await createAdmin();
    const { customer } = await createCustomer();
    const { cleaner } = await createCleaner();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await makeActiveSub(customer._id, vehicle._id, society._id);

    // Leave was rejected, not approved
    await LeaveRequest.create({
      cleaner: cleaner._id,
      date: getISTMidnight(),
      status: 'rejected',
    });

    const res = await api
      .put(`/api/admin/subscriptions/${sub._id}/assign-cleaner`)
      .set(authHeader(adminToken))
      .send({ cleanerId: cleaner._id });

    expect(res.status).toBe(200);
  });
});

describe('LEAVE-5.2 | assignCleanerToSubscription — isActive guard', () => {
  it('rejects assignment if cleaner is deactivated (isActive: false)', async () => {
    const { token: adminToken } = await createAdmin();
    const { customer } = await createCustomer();
    const { cleaner } = await createCleaner({ isActive: false });
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await makeActiveSub(customer._id, vehicle._id, society._id);

    const res = await api
      .put(`/api/admin/subscriptions/${sub._id}/assign-cleaner`)
      .set(authHeader(adminToken))
      .send({ cleanerId: cleaner._id });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/inactive|deactivated/i);
  });

  it('allows assignment when cleaner is active', async () => {
    const { token: adminToken } = await createAdmin();
    const { customer } = await createCustomer();
    const { cleaner } = await createCleaner({ isActive: true });
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await makeActiveSub(customer._id, vehicle._id, society._id);

    const res = await api
      .put(`/api/admin/subscriptions/${sub._id}/assign-cleaner`)
      .set(authHeader(adminToken))
      .send({ cleanerId: cleaner._id });

    expect(res.status).toBe(200);
  });
});

describe('LEAVE-5.3 | assignCleanerToSubscription — isAvailable guard', () => {
  it('rejects assignment if cleaner is marked unavailable (isAvailable: false)', async () => {
    const { token: adminToken } = await createAdmin();
    const { customer } = await createCustomer();
    const { cleaner } = await createCleaner({ isAvailable: false });
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await makeActiveSub(customer._id, vehicle._id, society._id);

    const res = await api
      .put(`/api/admin/subscriptions/${sub._id}/assign-cleaner`)
      .set(authHeader(adminToken))
      .send({ cleanerId: cleaner._id });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/unavailable/i);
  });
});

describe('LEAVE-5.4 | reviewLeaveRequest — task unset on approval', () => {
  it('unsets cleaner on a PENDING task when leave is approved', async () => {
    const { token: adminToken } = await createAdmin();
    const { customer } = await createCustomer();
    const { cleaner } = await createCleaner();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await makeActiveSub(customer._id, vehicle._id, society._id, cleaner._id);
    const today = getISTMidnight();
    const task = await makePendingTaskFor(sub._id, customer._id, cleaner._id, vehicle._id, 0);

    const leave = await LeaveRequest.create({
      cleaner: cleaner._id,
      date: today,
      status: 'pending',
    });

    const res = await api
      .put(`/api/admin/leaves/${leave._id}/review`)
      .set(authHeader(adminToken))
      .send({ status: 'approved' });

    expect(res.status).toBe(200);

    const updatedTask = await Task.findById(task._id);
    expect(updatedTask.cleaner).toBeFalsy(); // $unset removes the field
  });

  it('does NOT unset cleaner on a COMPLETED task (wash already done)', async () => {
    const { token: adminToken } = await createAdmin();
    const { customer } = await createCustomer();
    const { cleaner } = await createCleaner();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await makeActiveSub(customer._id, vehicle._id, society._id, cleaner._id);
    const today = getISTMidnight();

    const task = await Task.create({
      subscription: sub._id,
      customer: customer._id,
      cleaner: cleaner._id,
      vehicle: vehicle._id,
      date: today,
      scheduledTime: '06:00 AM',
      status: 'completed',
      packageName: 'Standard',
    });

    const leave = await LeaveRequest.create({
      cleaner: cleaner._id,
      date: today,
      status: 'pending',
    });

    await api
      .put(`/api/admin/leaves/${leave._id}/review`)
      .set(authHeader(adminToken))
      .send({ status: 'approved' });

    const updatedTask = await Task.findById(task._id);
    // completed tasks must remain assigned — the wash already happened
    expect(updatedTask.cleaner.toString()).toBe(cleaner._id.toString());
  });
});

describe('LEAVE-5.5 | reviewLeaveRequest — in-progress task unset', () => {
  it('unsets cleaner on an IN-PROGRESS task when leave is approved', async () => {
    const { token: adminToken } = await createAdmin();
    const { customer } = await createCustomer();
    const { cleaner } = await createCleaner();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await makeActiveSub(customer._id, vehicle._id, society._id, cleaner._id);
    const today = getISTMidnight();

    const task = await Task.create({
      subscription: sub._id,
      customer: customer._id,
      cleaner: cleaner._id,
      vehicle: vehicle._id,
      date: today,
      scheduledTime: '06:00 AM',
      status: 'in-progress',
      packageName: 'Standard',
    });

    const leave = await LeaveRequest.create({
      cleaner: cleaner._id,
      date: today,
      status: 'pending',
    });

    const res = await api
      .put(`/api/admin/leaves/${leave._id}/review`)
      .set(authHeader(adminToken))
      .send({ status: 'approved' });

    expect(res.status).toBe(200);

    const updatedTask = await Task.findById(task._id);
    expect(updatedTask.cleaner).toBeFalsy();
  });
});

describe('LEAVE-5.6 | reviewLeaveRequest — rejection flow', () => {
  it('does NOT unset tasks when leave is rejected', async () => {
    const { token: adminToken } = await createAdmin();
    const { customer } = await createCustomer();
    const { cleaner } = await createCleaner();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await makeActiveSub(customer._id, vehicle._id, society._id, cleaner._id);
    const today = getISTMidnight();
    const task = await makePendingTaskFor(sub._id, customer._id, cleaner._id, vehicle._id, 0);

    const leave = await LeaveRequest.create({
      cleaner: cleaner._id,
      date: today,
      status: 'pending',
    });

    await api
      .put(`/api/admin/leaves/${leave._id}/review`)
      .set(authHeader(adminToken))
      .send({ status: 'rejected', rejectionReason: 'No valid reason' });

    const updatedTask = await Task.findById(task._id);
    expect(updatedTask.cleaner.toString()).toBe(cleaner._id.toString());
  });

  it('returns 400 when trying to review an already-reviewed leave', async () => {
    const { token: adminToken } = await createAdmin();
    const { cleaner } = await createCleaner();

    const leave = await LeaveRequest.create({
      cleaner: cleaner._id,
      date: getISTMidnight(),
      status: 'approved',
    });

    const res = await api
      .put(`/api/admin/leaves/${leave._id}/review`)
      .set(authHeader(adminToken))
      .send({ status: 'rejected', rejectionReason: 'Too late' });

    expect(res.status).toBe(400);
  });
});

describe('LEAVE-5.7 | Admin attendance override to leave — task unset', () => {
  it('unsets pending task when admin manually marks attendance as leave', async () => {
    const { token: adminToken } = await createAdmin();
    const { customer } = await createCustomer();
    const { cleaner } = await createCleaner();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await makeActiveSub(customer._id, vehicle._id, society._id, cleaner._id);
    const today = getISTMidnight();
    const task = await makePendingTaskFor(sub._id, customer._id, cleaner._id, vehicle._id, 0);

    const res = await api
      .put('/api/admin/cleaners/attendance')
      .set(authHeader(adminToken))
      .send({
        cleanerId: cleaner._id,
        date: today.toISOString(),
        status: 'leave',
      });

    expect(res.status).toBe(200);

    const updatedTask = await Task.findById(task._id);
    expect(updatedTask.cleaner).toBeFalsy();
  });

  it('unsets in-progress task when admin manually marks attendance as leave', async () => {
    const { token: adminToken } = await createAdmin();
    const { customer } = await createCustomer();
    const { cleaner } = await createCleaner();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await makeActiveSub(customer._id, vehicle._id, society._id, cleaner._id);
    const today = getISTMidnight();

    const task = await Task.create({
      subscription: sub._id,
      customer: customer._id,
      cleaner: cleaner._id,
      vehicle: vehicle._id,
      date: today,
      scheduledTime: '06:00 AM',
      status: 'in-progress',
      packageName: 'Standard',
    });

    const res = await api
      .put('/api/admin/cleaners/attendance')
      .set(authHeader(adminToken))
      .send({
        cleanerId: cleaner._id,
        date: today.toISOString(),
        status: 'leave',
      });

    expect(res.status).toBe(200);

    const updatedTask = await Task.findById(task._id);
    expect(updatedTask.cleaner).toBeFalsy();
  });

  it('does NOT unset tasks when attendance is marked as present (not leave)', async () => {
    const { token: adminToken } = await createAdmin();
    const { customer } = await createCustomer();
    const { cleaner } = await createCleaner();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await makeActiveSub(customer._id, vehicle._id, society._id, cleaner._id);
    const today = getISTMidnight();
    const task = await makePendingTaskFor(sub._id, customer._id, cleaner._id, vehicle._id, 0);

    await api
      .put('/api/admin/cleaners/attendance')
      .set(authHeader(adminToken))
      .send({
        cleanerId: cleaner._id,
        date: today.toISOString(),
        status: 'present',
      });

    const updatedTask = await Task.findById(task._id);
    expect(updatedTask.cleaner.toString()).toBe(cleaner._id.toString());
  });
});

describe('LEAVE-5.8 | cron + leave integration — task cleaner assignment', () => {
  it('cron creates task with cleaner null when leave was pre-approved for today', async () => {
    const { customer } = await createCustomer();
    const { cleaner } = await createCleaner();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await makeActiveSub(customer._id, vehicle._id, society._id, cleaner._id);

    // Leave approved for today before cron runs
    await LeaveRequest.create({
      cleaner: cleaner._id,
      date: getISTMidnight(),
      status: 'approved',
    });

    await createDailyTasks();

    const today = getISTMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const task = await Task.findOne({
      subscription: sub._id,
      date: { $gte: today, $lt: tomorrow },
    });

    expect(task).not.toBeNull();
    expect(task.cleaner).toBeFalsy();
  });

  it('cron assigns cleaner normally when leave is for a different day', async () => {
    const { customer } = await createCustomer();
    const { cleaner } = await createCleaner();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await makeActiveSub(customer._id, vehicle._id, society._id, cleaner._id);

    // Leave is for tomorrow, not today
    await LeaveRequest.create({
      cleaner: cleaner._id,
      date: istMidnightFor(1),
      status: 'approved',
    });

    await createDailyTasks();

    const today = getISTMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const task = await Task.findOne({
      subscription: sub._id,
      date: { $gte: today, $lt: tomorrow },
    });

    expect(task).not.toBeNull();
    expect(task.cleaner.toString()).toBe(cleaner._id.toString());
  });

  it('reassignment after leave approval: admin assigns new cleaner → task updated', async () => {
    const { token: adminToken } = await createAdmin();
    const { customer } = await createCustomer();
    const { cleaner: cleanerA } = await createCleaner();
    const { cleaner: cleanerB } = await createCleaner();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await makeActiveSub(customer._id, vehicle._id, society._id, cleanerA._id);

    // CleanerA's task created by cron
    await createDailyTasks();

    // CleanerA goes on leave
    const leave = await LeaveRequest.create({
      cleaner: cleanerA._id,
      date: getISTMidnight(),
      status: 'pending',
    });
    await api
      .put(`/api/admin/leaves/${leave._id}/review`)
      .set(authHeader(adminToken))
      .send({ status: 'approved' });

    // Admin reassigns to CleanerB (not on leave, active, available)
    const assignRes = await api
      .put(`/api/admin/subscriptions/${sub._id}/assign-cleaner`)
      .set(authHeader(adminToken))
      .send({ cleanerId: cleanerB._id });

    expect(assignRes.status).toBe(200);

    const today = getISTMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const task = await Task.findOne({ subscription: sub._id, date: { $gte: today, $lt: tomorrow } });
    expect(task.cleaner.toString()).toBe(cleanerB._id.toString());
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — requestLeave Validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('LEAVE-6.1 | requestLeave — past date blocked', () => {
  it('returns 400 when requesting leave for yesterday', async () => {
    const { token } = await createCleaner();

    const res = await api
      .post('/api/cleaner/leave')
      .set(authHeader(token))
      .send({ date: isoDate(-1), reason: 'Sick' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/advance/i);
  });
});

describe('LEAVE-6.2 | requestLeave — same-day request blocked', () => {
  it('returns 400 when requesting leave for today (cron already ran)', async () => {
    const { token } = await createCleaner();

    const res = await api
      .post('/api/cleaner/leave')
      .set(authHeader(token))
      .send({ date: isoDate(0), reason: 'Sick' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/advance/i);
  });

  it('succeeds when requesting leave for tomorrow', async () => {
    const { token } = await createCleaner();

    const res = await api
      .post('/api/cleaner/leave')
      .set(authHeader(token))
      .send({ date: isoDate(1), reason: 'Personal' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('LEAVE-6.3 | requestLeave — monthly limit enforcement', () => {
  it('returns 400 when a third leave is requested in the same month', async () => {
    const { cleaner, token } = await createCleaner();

    // Anchor to NEXT month so end-of-month day overflow is impossible.
    // Day 3, 4, 5 of next month are always safely in the future and in the same month.
    const today = getISTMidnight();
    const yr = today.getUTCFullYear();
    const mo = today.getUTCMonth();

    const nextMonthDay3 = new Date(Date.UTC(yr, mo + 1, 3));
    const nextMonthDay4 = new Date(Date.UTC(yr, mo + 1, 4));
    const nextMonthDay5 = new Date(Date.UTC(yr, mo + 1, 5));

    await LeaveRequest.insertMany([
      { cleaner: cleaner._id, date: nextMonthDay3, status: 'pending' },
      { cleaner: cleaner._id, date: nextMonthDay4, status: 'approved' },
    ]);

    const res = await api
      .post('/api/cleaner/leave')
      .set(authHeader(token))
      .send({ date: nextMonthDay5.toISOString().split('T')[0], reason: 'Holiday' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/maximum|2 leaves/i);
  });

  it('allows a leave in next month even when this month is full', async () => {
    const { cleaner, token } = await createCleaner();
    const thisMonth = getISTMidnight();
    const year = thisMonth.getUTCFullYear();
    const month = thisMonth.getUTCMonth();

    // 2 leaves in current month (using dates well into the future for that month)
    const day25 = new Date(Date.UTC(year, month, 25));
    const day26 = new Date(Date.UTC(year, month, 26));
    if (day25 > thisMonth && day26 > thisMonth) {
      await LeaveRequest.insertMany([
        { cleaner: cleaner._id, date: day25, status: 'pending' },
        { cleaner: cleaner._id, date: day26, status: 'pending' },
      ]);

      // Request for next month should still be allowed
      const nextMonthDate = new Date(Date.UTC(year, month + 1, 5));
      const res = await api
        .post('/api/cleaner/leave')
        .set(authHeader(token))
        .send({ date: nextMonthDate.toISOString().split('T')[0], reason: 'Holiday' });

      // Either 200 (success) or skip if next-month date isn't at least tomorrow
      if (nextMonthDate > new Date(Date.now() + 24 * 60 * 60 * 1000)) {
        expect(res.status).toBe(200);
      }
    }
  });
});

describe('LEAVE-6.4 | requestLeave — re-apply after rejection', () => {
  it('allows cleaner to re-apply for a previously rejected leave date', async () => {
    const { cleaner, token } = await createCleaner();
    const leaveDate = istMidnightFor(2);

    // Existing rejected leave
    await LeaveRequest.create({
      cleaner: cleaner._id,
      date: leaveDate,
      status: 'rejected',
      rejectionReason: 'Not approved',
    });

    const res = await api
      .post('/api/cleaner/leave')
      .set(authHeader(token))
      .send({ date: isoDate(2), reason: 'New reason' });

    expect(res.status).toBe(200);

    const updated = await LeaveRequest.findOne({ cleaner: cleaner._id, date: leaveDate });
    expect(updated.status).toBe('pending');
    expect(updated.reason).toBe('New reason');
  });
});

describe('LEAVE-6.5 | requestLeave — no re-apply after approval', () => {
  it('returns 400 when leave is already approved for that date', async () => {
    const { cleaner, token } = await createCleaner();
    const leaveDate = istMidnightFor(2);

    await LeaveRequest.create({
      cleaner: cleaner._id,
      date: leaveDate,
      status: 'approved',
    });

    const res = await api
      .post('/api/cleaner/leave')
      .set(authHeader(token))
      .send({ date: isoDate(2), reason: 'Trying again' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/approved/i);
  });
});

describe('LEAVE-6.6 | requestLeave — duplicate pending blocked', () => {
  it('returns 400 when a pending leave for the same date already exists', async () => {
    const { cleaner, token } = await createCleaner();
    const leaveDate = istMidnightFor(2);

    await LeaveRequest.create({
      cleaner: cleaner._id,
      date: leaveDate,
      status: 'pending',
    });

    const res = await api
      .post('/api/cleaner/leave')
      .set(authHeader(token))
      .send({ date: isoDate(2), reason: 'Duplicate' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/pending/i);
  });
});

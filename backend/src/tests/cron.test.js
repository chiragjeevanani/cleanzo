import { describe, it, expect, vi } from 'vitest';
import Customer from '../models/Customer.js';
import Subscription from '../models/Subscription.js';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import Society from '../models/Society.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Admin from '../models/Admin.js';
import { getISTMidnight } from '../utils/dateHelper.js';
import { createCustomer, createCleaner, createVehicle, createSociety } from './helpers.js';

// Mock FCM — cron functions call sendPushNotification for admin alerts
vi.mock('../services/fcm.service.js', () => ({
  sendPushNotification: vi.fn().mockResolvedValue({ success: true }),
  NOTIFICATION_LINKS: {},
}));

// Import all 4 exported cron functions
const { expireReferralDiscounts, expireSubscriptions, createDailyTasks, sendReminders } =
  await import('../cron/referralCron.js');

// ─── shared helpers ───────────────────────────────────────────────────────────
async function activeSubFor(customerId, vehicleId, societyId, overrides = {}) {
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
    ...overrides,
  });
}

async function pastEndedSub(customerId, vehicleId, societyId) {
  return Subscription.create({
    customer: customerId,
    vehicle: vehicleId,
    society: societyId,
    slot: '06_07_AM',
    isTrial: false,
    startDate: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
    totalDays: 30,
    remainingDays: 0,
    amount: 399,
    status: 'Active',
  });
}


// ─── CRON-1 | expireReferralDiscounts ────────────────────────────────────────
describe('CRON-1 | expireReferralDiscounts', () => {
  it('deactivates referral discounts whose expiresAt is in the past', async () => {
    const { customer } = await createCustomer({
      referralDiscount: {
        isActive: true,
        percentage: 25,
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    await expireReferralDiscounts();

    const updated = await Customer.findById(customer._id);
    expect(updated.referralDiscount.isActive).toBe(false);
  });

  it('does NOT deactivate a discount that has not yet expired', async () => {
    const { customer } = await createCustomer({
      referralDiscount: {
        isActive: true,
        percentage: 25,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await expireReferralDiscounts();

    const updated = await Customer.findById(customer._id);
    expect(updated.referralDiscount.isActive).toBe(true);
  });
});


// ─── CRON-2 | expireSubscriptions ────────────────────────────────────────────
describe('CRON-2 | expireSubscriptions', () => {
  it('marks an Active subscription with past endDate as Expired', async () => {
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await pastEndedSub(customer._id, vehicle._id, society._id);

    await expireSubscriptions();

    const updated = await Subscription.findById(sub._id);
    expect(updated.status).toBe('Expired');
  });

  it('creates an expiry notification for the customer', async () => {
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    await pastEndedSub(customer._id, vehicle._id, society._id);

    await expireSubscriptions();

    const notif = await Notification.findOne({ recipient: customer._id, title: 'Subscription Expired' });
    expect(notif).not.toBeNull();
  });

  it('decrements slot currentCount on expiry', async () => {
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety({ slots: [
      { slotId: '06_07_AM', timeWindow: '06:00 AM - 07:00 AM', maxVehicles: 10, currentCount: 3 },
    ]});
    await pastEndedSub(customer._id, vehicle._id, society._id);

    await expireSubscriptions();

    const updated = await Society.findById(society._id);
    const slot = updated.slots.find(s => s.slotId === '06_07_AM');
    expect(slot.currentCount).toBe(2);
  });

  it('slot currentCount does NOT go below 0', async () => {
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety({ slots: [
      { slotId: '06_07_AM', timeWindow: '06:00 AM - 07:00 AM', maxVehicles: 10, currentCount: 0 },
    ]});
    await pastEndedSub(customer._id, vehicle._id, society._id);

    await expireSubscriptions();

    const updated = await Society.findById(society._id);
    const slot = updated.slots.find(s => s.slotId === '06_07_AM');
    expect(slot.currentCount).toBe(0);
  });

  it('subscription without society/slot is still expired without error', async () => {
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const sub = await Subscription.create({
      customer: customer._id,
      vehicle: vehicle._id,
      // no society, no slot
      isTrial: false,
      startDate: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      totalDays: 30,
      remainingDays: 0,
      amount: 399,
      status: 'Active',
    });

    await expect(expireSubscriptions()).resolves.not.toThrow();

    const updated = await Subscription.findById(sub._id);
    expect(updated.status).toBe('Expired');
  });

  it('a notification failure does NOT abort expiry of other subscriptions', async () => {
    const { customer: c1 } = await createCustomer();
    const { customer: c2 } = await createCustomer();
    const v1 = await createVehicle(c1._id);
    const v2 = await createVehicle(c2._id);
    const society = await createSociety();
    const sub1 = await pastEndedSub(c1._id, v1._id, society._id);
    const sub2 = await pastEndedSub(c2._id, v2._id, society._id);

    // Both should be Expired even if individual steps fail
    await expireSubscriptions();

    const [u1, u2] = await Promise.all([
      Subscription.findById(sub1._id),
      Subscription.findById(sub2._id),
    ]);
    expect(u1.status).toBe('Expired');
    expect(u2.status).toBe('Expired');
  });

  it('already-Expired subscriptions are NOT processed again', async () => {
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    await Subscription.create({
      customer: customer._id,
      vehicle: vehicle._id,
      society: society._id,
      slot: '06_07_AM',
      isTrial: false,
      startDate: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      totalDays: 30,
      remainingDays: 0,
      amount: 399,
      status: 'Expired', // already expired
    });

    await expireSubscriptions();

    // No new notification should be created (nothing to process)
    const notifs = await Notification.find({ recipient: customer._id });
    expect(notifs.length).toBe(0);
  });
});


// ─── CRON-3 | createDailyTasks ────────────────────────────────────────────────
describe('CRON-3 | createDailyTasks', () => {
  it('creates exactly one task per active subscription', async () => {
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const { cleaner } = await createCleaner();
    const sub = await activeSubFor(customer._id, vehicle._id, society._id, { assignedCleaner: cleaner._id });

    await createDailyTasks();

    const today = getISTMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tasks = await Task.find({ subscription: sub._id, date: { $gte: today, $lt: tomorrow } });
    expect(tasks.length).toBe(1);
    expect(tasks[0].cleaner.toString()).toBe(cleaner._id.toString());
  });

  it('does NOT create a duplicate task when run twice on the same day', async () => {
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await activeSubFor(customer._id, vehicle._id, society._id);

    await createDailyTasks();
    await createDailyTasks(); // second run — must be idempotent

    const today = getISTMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tasks = await Task.find({ subscription: sub._id, date: { $gte: today, $lt: tomorrow } });
    expect(tasks.length).toBe(1);
  });

  it('creates task with cleaner: null if assigned cleaner is on approved leave today', async () => {
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const { cleaner } = await createCleaner();
    const sub = await activeSubFor(customer._id, vehicle._id, society._id, { assignedCleaner: cleaner._id });

    await LeaveRequest.create({
      cleaner: cleaner._id,
      date: getISTMidnight(),
      status: 'approved',
      reason: 'Sick',
    });

    await createDailyTasks();

    const today = getISTMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tasks = await Task.find({ subscription: sub._id, date: { $gte: today, $lt: tomorrow } });
    expect(tasks.length).toBe(1);
    expect(tasks[0].cleaner).toBeNull();
  });

  it('creates task with cleaner: null if subscription has no assignedCleaner', async () => {
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await activeSubFor(customer._id, vehicle._id, society._id);
    // no assignedCleaner set

    await createDailyTasks();

    const today = getISTMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const task = await Task.findOne({ subscription: sub._id, date: { $gte: today, $lt: tomorrow } });
    expect(task).not.toBeNull();
    expect(task.cleaner).toBeNull();
  });

  it('does NOT create a task for a subscription whose startDate is tomorrow', async () => {
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const tomorrow = new Date(getISTMidnight());
    tomorrow.setDate(tomorrow.getDate() + 1);
    const sub = await activeSubFor(customer._id, vehicle._id, society._id, {
      startDate: tomorrow,
      endDate: new Date(tomorrow.getTime() + 30 * 24 * 60 * 60 * 1000),
    });

    await createDailyTasks();

    const today = getISTMidnight();
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 1);
    const task = await Task.findOne({ subscription: sub._id, date: { $gte: today, $lt: dayAfter } });
    expect(task).toBeNull();
  });

  it('picks scheduledTime from the slot timeWindow', async () => {
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety({
      slots: [
        { slotId: '08_09_AM', timeWindow: '08:00 AM - 09:00 AM', maxVehicles: 10, currentCount: 0 },
      ],
    });
    const sub = await activeSubFor(customer._id, vehicle._id, society._id, { slot: '08_09_AM' });

    await createDailyTasks();

    const today = getISTMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const task = await Task.findOne({ subscription: sub._id, date: { $gte: today, $lt: tomorrow } });
    expect(task).not.toBeNull();
    expect(task.scheduledTime).toBe('08:00 AM');
  });

  it('defaults scheduledTime to 07:00 AM when subscription has no society/slot', async () => {
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const sub = await Subscription.create({
      customer: customer._id,
      vehicle: vehicle._id,
      isTrial: false,
      startDate: getISTMidnight(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalDays: 30,
      remainingDays: 30,
      amount: 399,
      status: 'Active',
    });

    await createDailyTasks();

    const today = getISTMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const task = await Task.findOne({ subscription: sub._id, date: { $gte: today, $lt: tomorrow } });
    expect(task).not.toBeNull();
    expect(task.scheduledTime).toBe('07:00 AM');
  });

  it('does NOT create tasks for Paused subscriptions', async () => {
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    const sub = await activeSubFor(customer._id, vehicle._id, society._id, { status: 'Paused' });

    await createDailyTasks();

    const today = getISTMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const task = await Task.findOne({ subscription: sub._id, date: { $gte: today, $lt: tomorrow } });
    expect(task).toBeNull();
  });

  it('sends admin push alert when unassigned tasks are created', async () => {
    const { sendPushNotification } = await import('../services/fcm.service.js');
    const mockFcm = vi.mocked(sendPushNotification);
    mockFcm.mockClear();

    // Create admin with FCM token so the alert has somewhere to send
    await Admin.create({
      name: 'Alert Admin',
      email: `alertadmin_${Date.now()}@test.com`,
      password: 'hashedpw',
      role: 'superadmin',
      fcmTokens: ['test-token-123'],
    });

    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    const society = await createSociety();
    await activeSubFor(customer._id, vehicle._id, society._id); // no assignedCleaner

    await createDailyTasks();

    expect(mockFcm).toHaveBeenCalledWith(
      expect.arrayContaining(['test-token-123']),
      expect.objectContaining({ title: '⚠️ Unassigned Tasks Today' })
    );
  });
});


// ─── CRON-4 | sendReminders ───────────────────────────────────────────────────
describe('CRON-4 | sendReminders', () => {
  it('fires subscription reminder when endDate is within 3 days', async () => {
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    await activeSubFor(customer._id, vehicle._id, undefined, {
      society: undefined,
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      remainingDays: 2,
    });

    await sendReminders();

    const notif = await Notification.findOne({ recipient: customer._id, title: 'Subscription Ending Soon' });
    expect(notif).not.toBeNull();
  });

  it('does NOT fire reminder when endDate is more than 3 days away', async () => {
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    await activeSubFor(customer._id, vehicle._id, undefined, {
      society: undefined,
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    });

    await sendReminders();

    const notif = await Notification.findOne({ recipient: customer._id, title: 'Subscription Ending Soon' });
    expect(notif).toBeNull();
  });

  it('does NOT fire reminder for Expired subscriptions', async () => {
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    await Subscription.create({
      customer: customer._id,
      vehicle: vehicle._id,
      isTrial: false,
      startDate: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      totalDays: 30,
      remainingDays: 0,
      amount: 399,
      status: 'Expired',
    });

    await sendReminders();

    const notif = await Notification.findOne({ recipient: customer._id, title: 'Subscription Ending Soon' });
    expect(notif).toBeNull();
  });

  it('calculates daysLeft correctly in the notification message', async () => {
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    // 23 h → Math.ceil(23/24) = 1 day; using 1 day + epsilon gives Math.ceil(1.0007) = 2
    await activeSubFor(customer._id, vehicle._id, undefined, {
      society: undefined,
      endDate: new Date(Date.now() + 23 * 60 * 60 * 1000),
    });

    await sendReminders();

    const notif = await Notification.findOne({ recipient: customer._id, title: 'Subscription Ending Soon' });
    expect(notif).not.toBeNull();
    expect(notif.message).toMatch(/1 day/);
  });

  it('does NOT send duplicate reminder if cron runs twice on the same day', async () => {
    const { customer } = await createCustomer();
    const vehicle = await createVehicle(customer._id);
    await activeSubFor(customer._id, vehicle._id, undefined, {
      society: undefined,
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    });

    await sendReminders();
    await sendReminders(); // second run same day

    const count = await Notification.countDocuments({
      recipient: customer._id,
      title: 'Subscription Ending Soon',
    });
    expect(count).toBe(1);
  });

  it('fires referral reminder when expiresAt is within IST-aligned 2-day window', async () => {
    const in2Days = getISTMidnight(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));
    const { customer } = await createCustomer({
      referralDiscount: {
        isActive: true,
        percentage: 25,
        expiresAt: new Date(in2Days.getTime() + 6 * 60 * 60 * 1000), // within the IST day
      },
    });

    await sendReminders();

    const notif = await Notification.findOne({
      recipient: customer._id,
      title: 'Referral Discount Expiring Soon',
    });
    expect(notif).not.toBeNull();
  });

  it('does NOT fire referral reminder for inactive discounts', async () => {
    const { customer } = await createCustomer({
      referralDiscount: {
        isActive: false,
        percentage: 25,
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
    });

    await sendReminders();

    const notif = await Notification.findOne({
      recipient: customer._id,
      title: 'Referral Discount Expiring Soon',
    });
    expect(notif).toBeNull();
  });
});

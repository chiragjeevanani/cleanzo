import cron from 'node-cron';
import Customer from '../models/Customer.js';
import Subscription from '../models/Subscription.js';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import Society from '../models/Society.js';

// ─── Job 1: Expire referral discounts (midnight) ──────────────────────────────
const expireReferralDiscounts = async () => {
  try {
    const result = await Customer.updateMany(
      { 'referralDiscount.isActive': true, 'referralDiscount.expiresAt': { $lt: new Date() } },
      { $set: { 'referralDiscount.isActive': false } }
    );
    console.log(`[CRON] Expired ${result.modifiedCount} referral discounts`);
  } catch (err) {
    console.error('[CRON] Referral expiry error:', err.message);
  }
};

// ─── Job 2: Expire subscriptions + decrement slot count (midnight) ────────────
const expireSubscriptions = async () => {
  try {
    const now = new Date();
    const expired = await Subscription.find({ status: 'Active', endDate: { $lt: now } });

    if (expired.length === 0) {
      console.log('[CRON] No subscriptions to expire');
      return;
    }

    const ids = expired.map(s => s._id);
    await Subscription.updateMany({ _id: { $in: ids } }, { status: 'Expired' });

    // Decrement slot counts for each expired subscription
    for (const sub of expired) {
      if (sub.society && sub.slot) {
        await Society.updateOne(
          { _id: sub.society, slots: { $elemMatch: { slotId: sub.slot, currentCount: { $gt: 0 } } } },
          { $inc: { 'slots.$.currentCount': -1 } }
        );
      }

      // Notify customer
      await Notification.create({
        recipient: sub.customer,
        recipientModel: 'Customer',
        type: 'subscription',
        title: 'Subscription Expired',
        message: 'Your Cleanzo subscription has expired. Renew now to continue daily car washing!',
        data: { subscriptionId: sub._id },
      });
    }

    console.log(`[CRON] Expired ${expired.length} subscriptions`);
  } catch (err) {
    console.error('[CRON] Subscription expiry error:', err.message);
  }
};

// ─── Job 3: Create daily tasks for all active subscriptions (4 AM) ────────────
const createDailyTasks = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeSubs = await Subscription.find({ status: 'Active' })
      .populate('package', 'name')
      .populate('assignedCleaner', '_id')
      .populate('society', 'slots');

    if (activeSubs.length === 0) {
      console.log('[CRON] No active subscriptions — skipping task creation');
      return;
    }

    // One query to find all sub IDs that already have a task today
    const subIds = activeSubs.map(s => s._id);
    const existingToday = await Task.find(
      { subscription: { $in: subIds }, date: today },
      { subscription: 1 }
    ).lean();
    const alreadyCreated = new Set(existingToday.map(t => t.subscription.toString()));

    // Build all missing task docs in memory, then bulk-insert once
    const newDocs = [];
    for (const sub of activeSubs) {
      if (alreadyCreated.has(sub._id.toString())) continue;

      let scheduledTime = '07:00 AM';
      if (sub.society && sub.slot) {
        const slot = sub.society.slots?.find(s => s.slotId === sub.slot);
        if (slot?.timeWindow) scheduledTime = slot.timeWindow.split(' - ')[0];
      }

      newDocs.push({
        subscription: sub._id,
        customer: sub.customer,
        cleaner: sub.assignedCleaner?._id || null,
        vehicle: sub.vehicle,
        date: today,
        scheduledTime,
        status: 'pending',
        packageName: sub.package?.name || (sub.isTrial ? 'Trial' : 'Standard'),
      });
    }

    if (newDocs.length > 0) {
      // ordered: false — a single duplicate key won't abort the whole batch
      await Task.insertMany(newDocs, { ordered: false });
    }

    console.log(`[CRON] Created ${newDocs.length} tasks for ${today.toDateString()}`);
  } catch (err) {
    console.error('[CRON] Task creation error:', err.message);
  }
};

// ─── Job 4: Send reminders — referral + subscription expiry (9 AM) ────────────
const sendReminders = async () => {
  try {
    const now = new Date();

    // Referral discount expiring in ~2 days
    const in2Days = new Date(now);
    in2Days.setDate(in2Days.getDate() + 2);
    in2Days.setHours(0, 0, 0, 0);
    const in2DaysEnd = new Date(in2Days);
    in2DaysEnd.setHours(23, 59, 59, 999);

    const expiringReferrals = await Customer.find({
      'referralDiscount.isActive': true,
      'referralDiscount.expiresAt': { $gte: in2Days, $lte: in2DaysEnd },
    }).select('_id');

    if (expiringReferrals.length > 0) {
      await Notification.insertMany(
        expiringReferrals.map(c => ({
          recipient: c._id,
          recipientModel: 'Customer',
          type: 'offer',
          title: 'Referral Discount Expiring Soon',
          message: 'Your referral discount expires in 2 days! Subscribe now to save 25% on your first plan.',
        }))
      );
      console.log(`[CRON] Sent ${expiringReferrals.length} referral reminder(s)`);
    }

    // Subscriptions expiring in ≤3 remaining days
    const expiringSubs = await Subscription.find({
      status: 'Active',
      remainingDays: { $gt: 0, $lte: 3 },
    }).select('customer remainingDays');

    if (expiringSubs.length > 0) {
      await Notification.insertMany(
        expiringSubs.map(s => ({
          recipient: s.customer,
          recipientModel: 'Customer',
          type: 'subscription',
          title: 'Subscription Ending Soon',
          message: `Your Cleanzo subscription has only ${s.remainingDays} day${s.remainingDays === 1 ? '' : 's'} left. Renew now to avoid a gap in service!`,
          data: { remainingDays: s.remainingDays },
        }))
      );
      console.log(`[CRON] Sent ${expiringSubs.length} subscription expiry reminder(s)`);
    }
  } catch (err) {
    console.error('[CRON] Reminders error:', err.message);
  }
};

// ─── Start all cron jobs ──────────────────────────────────────────────────────
export const startCronJobs = () => {
  cron.schedule('0 0 * * *', expireReferralDiscounts);  // midnight
  cron.schedule('5 0 * * *', expireSubscriptions);       // 12:05 AM (after referral job)
  cron.schedule('0 4 * * *', createDailyTasks);          // 4:00 AM
  cron.schedule('0 9 * * *', sendReminders);             // 9:00 AM
  console.log('✅ Cron jobs scheduled');
};

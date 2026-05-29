import cron from 'node-cron';
import Customer from '../models/Customer.js';
import Cleaner from '../models/Cleaner.js';
import Subscription from '../models/Subscription.js';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import Society from '../models/Society.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Admin from '../models/Admin.js';
import { getISTMidnight } from '../utils/dateHelper.js';
import { sendPushNotification } from '../services/fcm.service.js';

// ─── Job 1: Expire referral discounts (midnight) ──────────────────────────────
export const expireReferralDiscounts = async () => {
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
export const expireSubscriptions = async () => {
  try {
    const now = new Date();
    const expired = await Subscription.find({ status: 'Active', endDate: { $lt: now } });

    if (expired.length === 0) {
      console.log('[CRON] No subscriptions to expire');
      return;
    }

    let successCount = 0;
    for (const sub of expired) {
      try {
        // Mark this subscription expired atomically before touching slot/notifications
        await Subscription.findByIdAndUpdate(sub._id, { status: 'Expired' });

        if (sub.society && sub.slot) {
          await Society.updateOne(
            { _id: sub.society, slots: { $elemMatch: { slotId: sub.slot, currentCount: { $gt: 0 } } } },
            { $inc: { 'slots.$.currentCount': -1 } }
          );
        }

        await Notification.create({
          recipient: sub.customer,
          recipientModel: 'Customer',
          type: 'subscription',
          title: 'Subscription Expired',
          message: 'Your Cleanzo subscription has expired. Renew now to continue daily car washing!',
          data: { subscriptionId: sub._id },
        });

        successCount++;
      } catch (subErr) {
        console.error(`[CRON] Failed to expire subscription ${sub._id}:`, subErr.message);
      }
    }

    console.log(`[CRON] Expired ${successCount}/${expired.length} subscriptions`);
  } catch (err) {
    console.error('[CRON] Subscription expiry error:', err.message);
  }
};

// ─── Job 3: Create daily tasks for all active subscriptions (4 AM) ────────────
export const createDailyTasks = async () => {
  try {
    const today = getISTMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activeSubs = await Subscription.find({ status: 'Active' })
      .populate('package', 'name')
      .populate('assignedCleaner', '_id')
      .populate('society', 'slots cleaners'); // cleaners needed for auto-assignment

    if (activeSubs.length === 0) {
      console.log('[CRON] No active subscriptions — skipping task creation');
      return;
    }

    // Fetch all approved leave requests for today
    const approvedLeaves = await LeaveRequest.find({
      date: today,
      status: 'approved'
    }).select('cleaner');

    // Create a Set of cleaner IDs who are on approved leave today
    const cleanersOnLeaveToday = new Set(
      approvedLeaves.map(leave => leave.cleaner.toString())
    );

    // One query to find all sub IDs that already have a task today (range check)
    const subIds = activeSubs.map(s => s._id);
    const existingToday = await Task.find(
      { subscription: { $in: subIds }, date: { $gte: today, $lt: tomorrow } },
      { subscription: 1 }
    ).lean();
    const alreadyCreated = new Set(existingToday.map(t => t.subscription.toString()));

    // Build all missing task docs in memory, then bulk-insert once
    const newDocs = [];
    for (const sub of activeSubs) {
      if (alreadyCreated.has(sub._id.toString())) continue;
      if (sub.startDate && today < getISTMidnight(sub.startDate)) continue;

      let scheduledTime = '07:00 AM';
      if (sub.society && sub.slot) {
        const slot = sub.society.slots?.find(s => s.slotId === sub.slot);
        if (slot?.timeWindow) scheduledTime = slot.timeWindow.split(' - ')[0];
      }

      // Check if the assigned cleaner is on approved leave today
      const assignedCleanerId = sub.assignedCleaner?._id?.toString();
      const isCleanerOnLeave = assignedCleanerId && cleanersOnLeaveToday.has(assignedCleanerId);

      newDocs.push({
        subscription: sub._id,
        customer: sub.customer,
        cleaner: isCleanerOnLeave ? null : (sub.assignedCleaner?._id || null),
        vehicle: sub.vehicle,
        date: today,
        scheduledTime,
        status: 'pending',
        packageName: sub.package?.name || (sub.isTrial ? 'Trial' : 'Standard'),
      });
    }

    // ── Step 1: Insert new tasks ─────────────────────────────────────────────
    if (newDocs.length > 0) {
      try {
        await Task.insertMany(newDocs, { ordered: false });
      } catch (insertErr) {
        if (insertErr.code !== 11000 && !insertErr.writeErrors?.every(we => we.code === 11000)) {
          throw insertErr;
        }
        console.log('[CRON] Some tasks were already created (duplicate key ignored)');
      }
    }
    console.log(`[CRON] Created ${newDocs.length} new task(s) for ${today.toDateString()}`);

    // ── Step 2: Auto-assign cleaners to ALL unassigned pending tasks today ────
    //
    // WHY this runs after insertMany and queries MongoDB directly:
    //   • Bug fix A — previously queried society.cleaners[] which admins rarely
    //     populate. Cleaners are added to subscriptions directly, so we instead
    //     discover eligible cleaners from *existing subscription assignments* in
    //     the same society (+ society.cleaners as a secondary source).
    //   • Bug fix B — previously only ran on newDocs (tasks created THIS run).
    //     Pre-existing tasks with cleaner: null (from earlier runs) were silently
    //     skipped by the alreadyCreated check and never reconsidered. Now we
    //     query MongoDB for ALL unassigned pending tasks today.
    //
    const allUnassignedTasks = await Task.find({
      subscription: { $in: subIds },
      date: { $gte: today, $lt: tomorrow },
      cleaner: { $in: [null, undefined] },
      status: 'pending',
    }).select('_id subscription').lean();

    console.log(`[CRON][AUTO-ASSIGN] Unassigned pending tasks today: ${allUnassignedTasks.length}`);

    if (allUnassignedTasks.length > 0) {
      // Map subscriptionId → full subscription object for society lookup
      const subMap = new Map(activeSubs.map(s => [s._id.toString(), s]));

      // Group unassigned tasks by society, storing the society ObjectId directly
      // to avoid string-to-ObjectId casting issues in Mongoose 8.x queries
      const bySociety = new Map(); // societyId string → { societyObjId, tasks[] }
      for (const task of allUnassignedTasks) {
        const sub = subMap.get(task.subscription.toString());
        const society = sub?.society;
        if (!society?._id) {
          console.log(`[CRON][AUTO-ASSIGN] Skipping task ${task._id} — subscription has no society`);
          continue;
        }
        const societyId = society._id.toString();
        if (!bySociety.has(societyId)) {
          bySociety.set(societyId, { societyObjId: society._id, tasks: [] });
        }
        bySociety.get(societyId).tasks.push(task);
      }

      console.log(`[CRON][AUTO-ASSIGN] Grouped into ${bySociety.size} society bucket(s)`);
      let autoAssignedCount = 0;

      for (const [societyId, { societyObjId, tasks }] of bySociety) {
        console.log(`[CRON][AUTO-ASSIGN] Society ${societyId}: ${tasks.length} task(s) need a cleaner`);

        // ── Source 1: cleaners from active subscriptions in this society ─────
        // This works even when society.cleaners[] is empty, which is the common
        // case since admins assign cleaners per-subscription, not per-society.
        const fromSubs = await Subscription.distinct('assignedCleaner', {
          society: societyObjId,            // ObjectId — avoids Mongoose casting
          status: 'Active',
          assignedCleaner: { $exists: true, $ne: null },
        });

        // ── Source 2: society.cleaners[] admin-managed list ──────────────────
        const societyDoc = await Society.findById(societyObjId).select('cleaners').lean();
        const fromSocietyList = (societyDoc?.cleaners || []).map(c => c.toString());

        const candidateIds = [...new Set([
          ...fromSubs.map(id => id.toString()),
          ...fromSocietyList,
        ])];

        console.log(`[CRON][AUTO-ASSIGN] Society ${societyId}: ${candidateIds.length} candidate(s) — fromSubs=${fromSubs.length}, fromSocietyList=${fromSocietyList.length}`);

        if (candidateIds.length === 0) {
          console.warn(`[CRON][AUTO-ASSIGN] Society ${societyId}: no cleaners found — assign at least one cleaner to a subscription in this society`);
          continue;
        }

        // Filter: active, available, not on approved leave today
        const eligible = await Cleaner.find({
          _id: { $in: candidateIds },
          isActive: true,
          isAvailable: true,
        }).select('_id name').lean();

        const notOnLeave = eligible.filter(c => !cleanersOnLeaveToday.has(c._id.toString()));
        console.log(`[CRON][AUTO-ASSIGN] Society ${societyId}: eligible=${eligible.length}, notOnLeave=${notOnLeave.length}`);

        if (eligible.length === 0) {
          console.warn(`[CRON][AUTO-ASSIGN] Society ${societyId}: no active+available cleaners among candidates`);
          continue;
        }
        if (notOnLeave.length === 0) {
          console.warn(`[CRON][AUTO-ASSIGN] Society ${societyId}: all eligible cleaners are on leave today`);
          continue;
        }

        // Load-balance: count existing assigned tasks per cleaner today
        const taskCounts = await Task.aggregate([
          {
            $match: {
              cleaner: { $in: notOnLeave.map(c => c._id) },
              date: { $gte: today, $lt: tomorrow },
            },
          },
          { $group: { _id: '$cleaner', count: { $sum: 1 } } },
        ]);
        const runningCount = new Map(taskCounts.map(t => [t._id.toString(), t.count]));

        for (const task of tasks) {
          notOnLeave.sort(
            (a, b) => (runningCount.get(a._id.toString()) || 0) - (runningCount.get(b._id.toString()) || 0)
          );
          const cleaner = notOnLeave[0];

          await Task.findByIdAndUpdate(task._id, { cleaner: cleaner._id });
          await Subscription.findByIdAndUpdate(task.subscription, { assignedCleaner: cleaner._id });

          console.log(`[CRON][AUTO-ASSIGN] Assigned "${cleaner.name}" (${cleaner._id}) to task ${task._id}`);
          runningCount.set(cleaner._id.toString(), (runningCount.get(cleaner._id.toString()) || 0) + 1);
          autoAssignedCount++;
        }
      }

      console.log(`[CRON][AUTO-ASSIGN] Done — auto-assigned ${autoAssignedCount}/${allUnassignedTasks.length} task(s)`);
    }
    // ── End auto-assign ──────────────────────────────────────────────────────

    // Count tasks still unassigned after auto-assign attempt (needs human action)
    const unassignedCount = await Task.countDocuments({
      subscription: { $in: subIds },
      date: { $gte: today, $lt: tomorrow },
      cleaner: null,
      status: 'pending',
    });
    if (unassignedCount > 0) {
      try {
        const admins = await Admin.find({ fcmTokens: { $exists: true, $ne: [] } }).select('fcmTokens');
        const adminTokens = admins.flatMap(a => a.fcmTokens || []);
        if (adminTokens.length) {
          await sendPushNotification(adminTokens, {
            title: '⚠️ Unassigned Tasks Today',
            body: `${unassignedCount} subscription${unassignedCount > 1 ? 's have' : ' has'} no cleaner assigned for today. Please assign cleaners.`,
            data: { type: 'unassigned_tasks', link: '/admin/subscriptions' },
          });
        }
      } catch (alertErr) {
        console.error('[CRON] Failed to send unassigned tasks alert:', alertErr.message);
      }
      console.warn(`[CRON] ⚠️  ${unassignedCount} task(s) created without a cleaner`);
    }
  } catch (err) {
    console.error('[CRON] Task creation error:', err.message);
  }
};


// ─── Job 4: Send reminders — referral + subscription expiry (9 AM) ────────────
export const sendReminders = async () => {
  try {
    const now = new Date();

    // Referral discount expiring in ~2 IST calendar days
    // Use getISTMidnight so the window is aligned to IST days, not UTC days
    const in2Days = getISTMidnight(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000));
    const in2DaysEnd = new Date(in2Days.getTime() + 24 * 60 * 60 * 1000 - 1);

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

    // Subscriptions expiring within the next 3 days — query by endDate so the
    // reminder fires correctly regardless of whether all tasks were marked completed.
    // remainingDays stored in DB can be stale if tasks were missed/rain/curfew.
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const expiringSubs = await Subscription.find({
      status: 'Active',
      endDate: { $gt: now, $lte: threeDaysFromNow },
    }).select('customer endDate');

    if (expiringSubs.length > 0) {
      // Dedup: skip customers who already received this reminder today so that a
      // server restart or manual re-run does not flood them with duplicates.
      const todayStart = getISTMidnight();
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      const alreadyRemindedIds = await Notification.distinct('recipient', {
        type: 'subscription',
        title: 'Subscription Ending Soon',
        recipientModel: 'Customer',
        createdAt: { $gte: todayStart, $lt: todayEnd },
      });
      const alreadyRemindedSet = new Set(alreadyRemindedIds.map(id => id.toString()));

      const subsToNotify = expiringSubs.filter(
        s => !alreadyRemindedSet.has(s.customer.toString())
      );

      if (subsToNotify.length > 0) {
        await Notification.insertMany(
          subsToNotify.map(s => {
            const msLeft = s.endDate.getTime() - now.getTime();
            const daysLeft = Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
            return {
              recipient: s.customer,
              recipientModel: 'Customer',
              type: 'subscription',
              title: 'Subscription Ending Soon',
              message: `Your Cleanzo subscription has only ${daysLeft} day${daysLeft === 1 ? '' : 's'} left. Renew now to avoid a gap in service!`,
              data: { remainingDays: daysLeft },
            };
          })
        );
        console.log(`[CRON] Sent ${subsToNotify.length} subscription expiry reminder(s)`);
      }
    }
  } catch (err) {
    console.error('[CRON] Reminders error:', err.message);
  }
};

// ─── Start all cron jobs ──────────────────────────────────────────────────────
export const startCronJobs = () => {
  const IST = { timezone: 'Asia/Kolkata' };
  cron.schedule('0 0 * * *', expireReferralDiscounts, IST);  // midnight IST
  cron.schedule('5 0 * * *', expireSubscriptions, IST);       // 12:05 AM IST (after referral job)
  cron.schedule('0 4 * * *', createDailyTasks, IST);          // 4:00 AM IST
  cron.schedule('0 9 * * *', sendReminders, IST);             // 9:00 AM IST
  console.log('✅ Cron jobs scheduled (timezone: Asia/Kolkata)');
};

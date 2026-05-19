import Task from '../models/Task.js';
import Cleaner from '../models/Cleaner.js';

/**
 * Recalculates and updates a cleaner's totalCompleted and completionRate
 * based on the actual tasks in the database.
 *
 * Deduplication logic:
 *   A cleaner can have two tasks for the same vehicle on the same day when a
 *   customer has two overlapping subscriptions (e.g. trial + paid).  We count
 *   unique (vehicle, date) slots — and a slot is considered "completed" if ANY
 *   of its tasks is completed.
 *
 * @param {string|mongoose.Types.ObjectId} cleanerId
 */
export const syncCleanerStats = async (cleanerId) => {
  if (!cleanerId) return;
  try {
    // Pull all non-ignored tasks for this cleaner
    const tasks = await Task.find({
      cleaner: cleanerId,
      status: { $in: ['completed', 'pending', 'in-progress', 'missed'] },
    }).select('vehicle date status').lean();

    // Deduplicate by (vehicle, date) — keep the "best" status per slot
    // Priority: completed > in-progress > pending > missed
    const statusPriority = { completed: 4, 'in-progress': 3, pending: 2, missed: 1 };
    const slotMap = new Map();
    for (const t of tasks) {
      const key = `${t.vehicle}_${new Date(t.date).toISOString().slice(0, 10)}`;
      const existing = slotMap.get(key);
      if (!existing || (statusPriority[t.status] ?? 0) > (statusPriority[existing] ?? 0)) {
        slotMap.set(key, t.status);
      }
    }

    const totalAssigned = slotMap.size;
    const totalCompleted = [...slotMap.values()].filter(s => s === 'completed').length;

    const completionRate = totalAssigned > 0
      ? Math.min(100, Math.round((totalCompleted / totalAssigned) * 100))
      : 100;

    await Cleaner.findByIdAndUpdate(cleanerId, {
      totalCompleted,
      completionRate
    });
  } catch (err) {
    console.error(`[StatsSync] Failed to sync stats for cleaner ${cleanerId}:`, err.message);
  }
};

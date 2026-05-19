import Task from '../models/Task.js';
import Cleaner from '../models/Cleaner.js';

/**
 * Recalculates and updates a cleaner's totalCompleted and completionRate
 * based on the actual tasks in the database.
 * 
 * @param {string|mongoose.Types.ObjectId} cleanerId 
 */
export const syncCleanerStats = async (cleanerId) => {
  if (!cleanerId) return;
  try {
    const [totalAssigned, totalCompleted] = await Promise.all([
      Task.countDocuments({ 
        cleaner: cleanerId, 
        status: { $in: ['completed', 'pending', 'in-progress', 'missed'] } 
      }),
      Task.countDocuments({ 
        cleaner: cleanerId, 
        status: 'completed' 
      })
    ]);
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

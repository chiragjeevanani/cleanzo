/**
 * cleanup_duplicate_tasks.js
 * 
 * One-time script to remove duplicate tasks where the same cleaner has two
 * tasks for the same vehicle on the same day.
 * 
 * Strategy: Keep the task with the most-advanced status (completed > in-progress > pending).
 * Delete the lower-priority duplicates.
 * 
 * Run with: node src/scripts/cleanup_duplicate_tasks.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Task from '../models/Task.js';
import Subscription from '../models/Subscription.js';
import { syncCleanerStats } from '../utils/cleanerStats.js';

dotenv.config();

const statusPriority = { completed: 4, 'in-progress': 3, pending: 2, missed: 1, skipped: 0, rain: 0, curfew: 0 };

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to DB\n');

    // Find all tasks grouped by (cleaner, vehicle, date)
    const duplicates = await Task.aggregate([
      {
        $group: {
          _id: {
            cleaner: '$cleaner',
            vehicle: '$vehicle',
            date: '$date'
          },
          count: { $sum: 1 },
          tasks: { $push: { id: '$_id', status: '$status', subscription: '$subscription' } }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (duplicates.length === 0) {
      console.log('✅ No duplicate tasks found. Database is clean.');
      process.exit(0);
    }

    console.log(`⚠️  Found ${duplicates.length} duplicate group(s):\n`);

    const toDelete = [];
    for (const group of duplicates) {
      console.log(`  Cleaner: ${group._id.cleaner} | Vehicle: ${group._id.vehicle} | Date: ${new Date(group._id.date).toLocaleDateString('en-IN')}`);
      console.log(`  Tasks (${group.count}):`, group.tasks.map(t => `${t.id} [${t.status}]`).join(', '));

      // Sort by priority descending — keep the best one
      const sorted = group.tasks.sort((a, b) => (statusPriority[b.status] ?? 0) - (statusPriority[a.status] ?? 0));
      const [keep, ...discard] = sorted;
      console.log(`  → Keep: ${keep.id} [${keep.status}] | Delete: ${discard.map(d => `${d.id} [${d.status}]`).join(', ')}\n`);
      toDelete.push(...discard.map(d => d.id));
    }

    if (toDelete.length > 0) {
      const result = await Task.deleteMany({ _id: { $in: toDelete } });
      console.log(`🗑️  Deleted ${result.deletedCount} duplicate task(s).`);

      // Re-sync stats for all affected cleaners
      const affectedCleaners = [...new Set(duplicates.map(d => d._id.cleaner?.toString()).filter(Boolean))];
      console.log(`\n🔄 Syncing stats for ${affectedCleaners.length} cleaner(s)...`);
      for (const cleanerId of affectedCleaners) {
        await syncCleanerStats(cleanerId);
        console.log(`  ✅ Synced cleaner ${cleanerId}`);
      }
    }

    console.log('\n✅ Done.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

run();

/**
 * Manual Cron Trigger — for local testing only.
 *
 * Usage:
 *   node src/scripts/trigger_crons.js                    # runs ALL 4 jobs
 *   node src/scripts/trigger_crons.js expireReferralDiscounts
 *   node src/scripts/trigger_crons.js expireSubscriptions
 *   node src/scripts/trigger_crons.js createDailyTasks
 *   node src/scripts/trigger_crons.js sendReminders
 *
 * The jobs run in the correct dependency order when 'all' is selected:
 *   1. expireReferralDiscounts  (midnight)
 *   2. expireSubscriptions      (12:05 AM — must run after referral expiry)
 *   3. createDailyTasks         (4:00 AM — must run after subscriptions are expired)
 *   4. sendReminders            (9:00 AM)
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';

dotenv.config();

const JOB_MAP = {
  expireReferralDiscounts: 'Expire referral discounts',
  expireSubscriptions:     'Expire subscriptions + decrement slot counts',
  createDailyTasks:        'Create daily tasks for active subscriptions',
  sendReminders:           'Send expiry / referral reminders',
};

const ALL_JOBS_IN_ORDER = [
  'expireReferralDiscounts',
  'expireSubscriptions',
  'createDailyTasks',
  'sendReminders',
];

async function run() {
  const jobArg = process.argv[2] || 'all';

  const jobsToRun = jobArg === 'all'
    ? ALL_JOBS_IN_ORDER
    : [jobArg];

  for (const job of jobsToRun) {
    if (!JOB_MAP[job]) {
      console.error(`\n❌  Unknown job: "${job}"`);
      console.error(`   Valid options: all, ${ALL_JOBS_IN_ORDER.join(', ')}\n`);
      process.exit(1);
    }
  }

  await connectDB();
  console.log('\n🔌 Connected to MongoDB\n');

  // Lazy-import the cron module AFTER DB is connected so models are ready
  const cronModule = await import('../cron/referralCron.js');

  for (const job of jobsToRun) {
    const label = JOB_MAP[job];
    console.log(`▶  Running: ${label} …`);
    const start = Date.now();
    try {
      await cronModule[job]();
      console.log(`✅ Done (${Date.now() - start}ms)\n`);
    } catch (err) {
      console.error(`❌ Failed: ${err.message}\n`);
    }
  }

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB\n');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

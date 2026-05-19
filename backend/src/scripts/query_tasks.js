import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Task from '../models/Task.js';
import Subscription from '../models/Subscription.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // Find all tasks with status completed or pending for cleaners
    const tasks = await Task.find({
      status: { $in: ['completed', 'pending', 'in-progress'] }
    })
      .populate('subscription', 'status isTrial vehicle')
      .populate('vehicle', 'model number')
      .populate('customer', 'firstName lastName')
      .populate('cleaner', 'name phone')
      .sort('-date')
      .limit(20)
      .lean();

    console.log('\n=== Recent Tasks ===');
    for (const t of tasks) {
      console.log({
        taskId: t._id,
        date: new Date(t.date).toLocaleDateString('en-IN'),
        status: t.status,
        vehicle: t.vehicle?.model + ' ' + t.vehicle?.number,
        customer: t.customer?.firstName,
        cleaner: t.cleaner?.name,
        subscriptionId: t.subscription?._id,
        subscriptionStatus: t.subscription?.status,
        isTrial: t.subscription?.isTrial,
      });
    }

    // Find duplicate tasks: same cleaner, same vehicle, same date
    const duplicates = await Task.aggregate([
      {
        $group: {
          _id: {
            cleaner: '$cleaner',
            vehicle: '$vehicle',
            date: '$date'
          },
          count: { $sum: 1 },
          taskIds: { $push: '$_id' },
          statuses: { $push: '$status' },
          subscriptions: { $push: '$subscription' }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    console.log('\n=== Duplicate Tasks (same cleaner+vehicle+date) ===');
    if (duplicates.length === 0) {
      console.log('No duplicates found');
    } else {
      for (const d of duplicates) {
        console.log({
          cleaner: d._id.cleaner,
          vehicle: d._id.vehicle,
          date: new Date(d._id.date).toLocaleDateString('en-IN'),
          count: d.count,
          statuses: d.statuses,
          taskIds: d.taskIds,
          subscriptions: d.subscriptions
        });
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();

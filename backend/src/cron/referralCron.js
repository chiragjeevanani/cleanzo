import cron from 'node-cron';
import Customer from '../models/Customer.js';

export const startCronJobs = () => {
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running referral discount expiry cron job...');
    try {
      const result = await Customer.updateMany(
        {
          'referralDiscount.isActive': true,
          'referralDiscount.expiresAt': { $lt: new Date() }
        },
        {
          $set: { 'referralDiscount.isActive': false }
        }
      );
      console.log(`Expired ${result.modifiedCount} referral discounts.`);
    } catch (error) {
      console.error('Error expiring referral discounts:', error);
    }
  });
};

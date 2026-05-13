import dotenv from 'dotenv';
import connectDB from './src/config/db.js';
import Admin from './src/models/Admin.js';
import Settings from './src/models/Settings.js';
import { startCronJobs } from './src/cron/referralCron.js';
import app from './src/app.js';

dotenv.config();

// Fail fast if required secrets are missing — never silently use defaults in any env
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}
if (!process.env.JWT_REFRESH_SECRET) {
  console.error('❌ FATAL: JWT_REFRESH_SECRET is not set. Refusing to start.');
  process.exit(1);
}

const seedAdminOnStartup = async () => {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)) {
    console.error('❌ FATAL: ADMIN_EMAIL and ADMIN_PASSWORD must be set in production.');
    process.exit(1);
  }
  const adminEmail = process.env.ADMIN_EMAIL || 'superadmin@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'password123';
  if (!isProduction && !process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  WARNING: Using default admin password. Set ADMIN_PASSWORD before production.');
  }
  try {
    const existing = await Admin.findOne({ email: adminEmail });
    if (!existing) {
      await Admin.create({ name: 'Super Admin', email: adminEmail, password: adminPassword, role: 'superadmin' });
      console.log(`✅ Auto-seeded superadmin: ${adminEmail}`);
    }
  } catch (err) {
    console.error('❌ Auto-seed failed:', err.message);
  }
};

const seedSettingsOnStartup = async () => {
  const defaults = [
    { key: 'trialPrice',              value: 30,  description: 'One-day trial subscription price (₹)' },
    { key: 'prioritySlotFee',         value: 99,  description: 'Priority slot surcharge when slot is full (₹)' },
    { key: 'referralDiscountPercent', value: 25,  description: 'Discount % applied to new user on referral' },
    { key: 'referralExpiryDays',      value: 7,   description: 'Days the referral discount stays valid' },
  ];
  try {
    for (const s of defaults) {
      await Settings.findOneAndUpdate({ key: s.key }, s, { upsert: true, new: true });
    }
    console.log('✅ Settings defaults ensured');
  } catch (err) {
    console.error('❌ Settings seed failed:', err.message);
  }
};

const PORT = process.env.PORT || 3001;

const start = async () => {
  app.listen(PORT, () => {
    console.log(`🚀 Cleanzo API running on http://localhost:${PORT}`);
    console.log(`📋 Health: http://localhost:${PORT}/api/health`);
  });
  try {
    await connectDB();
    await seedAdminOnStartup();
    await seedSettingsOnStartup();
    startCronJobs();
  } catch (err) {
    console.error('❌ Async startup error:', err.message);
  }
};

start();

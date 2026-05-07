import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import Package from '../models/Package.js';

dotenv.config();

const seedAdmin = async () => {
  const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL || 'superadmin@gmail.com' });
  if (existing) {
    console.log('⏭  Superadmin already exists, skipping.');
  } else {
    await Admin.create({
      name: 'Super Admin',
      email: process.env.ADMIN_EMAIL || 'superadmin@gmail.com',
      password: process.env.ADMIN_PASSWORD || 'password123',
      role: 'superadmin',
    });
    console.log('✅ Superadmin created: superadmin@gmail.com');
  }
};

const seedPackages = async () => {
  const count = await Package.countDocuments();
  if (count > 0) {
    console.log(`⏭  ${count} packages already exist, skipping.`);
    return;
  }

  await Package.insertMany([
    {
      name: 'Basic Plan', tier: 'Essential Care',
      price: 599, duration: 'Monthly', perDay: 20, sortOrder: 1,
      features: ['Daily Exterior Cleaning', '365 Days (No Holidays)', '5 AM - 10 AM Slot', 'Doorstep Service', 'Windshield Rinse'],
      popular: false,
    },
    {
      name: 'Standard Plan', tier: 'Popular Choice',
      price: 999, duration: 'Monthly', perDay: 33, sortOrder: 2,
      features: ['Daily Exterior Cleaning', '365 Days (No Holidays)', '5 AM - 10 AM Slot', 'Liquid Wax Shine (Weekly)', 'Tire Polish (Weekly)', 'Monthly Interior Add-on'],
      popular: true,
    },
    {
      name: 'Elite Plan', tier: 'Luxury Care',
      price: 1999, duration: 'Monthly', perDay: 66, sortOrder: 3,
      features: ['Daily Exterior Cleaning', '365 Days (No Holidays)', '5 AM - 10 AM Slot', 'Interior Cleaning (Weekly)', 'Microfiber Deep Dry', 'Priority Support'],
      popular: false,
    },
  ]);
  console.log('✅ 3 packages seeded (Basic, Standard, Elite)');
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🌱 Running seed script...');
    await seedAdmin();
    await seedPackages();
    console.log('🌱 Seed complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
};

seed();

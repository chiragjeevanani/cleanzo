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

// BRD §6 — Vehicle-based monthly pricing
const BRD_PACKAGES = [
  {
    name: 'Scooty Plan', tier: 'Scooty',
    price: 199, category: 'scooty', duration: 'Monthly', perDay: 7, sortOrder: 1,
    features: ['Daily Exterior Cleaning', '365 Days (No Holidays)', '5 AM–12 PM Slot', 'Doorstep Service'],
    popular: false,
  },
  {
    name: 'Bike Plan', tier: 'Bike',
    price: 249, category: 'bike', duration: 'Monthly', perDay: 8, sortOrder: 2,
    features: ['Daily Exterior Cleaning', '365 Days (No Holidays)', '5 AM–12 PM Slot', 'Doorstep Service'],
    popular: false,
  },
  {
    name: 'Small Car Plan', tier: 'Small Car',
    price: 399, category: 'small_car', duration: 'Monthly', perDay: 13, sortOrder: 3,
    features: ['Daily Exterior Cleaning', '365 Days (No Holidays)', '5 AM–12 PM Slot', 'Doorstep Service', 'Windshield Rinse'],
    popular: false,
  },
  {
    name: 'Hatchback Plan', tier: 'Hatchback',
    price: 449, category: 'hatchback', duration: 'Monthly', perDay: 15, sortOrder: 4,
    features: ['Daily Exterior Cleaning', '365 Days (No Holidays)', '5 AM–12 PM Slot', 'Doorstep Service', 'Windshield Rinse'],
    popular: false,
  },
  {
    name: 'Sedan Plan', tier: 'Sedan',
    price: 499, category: 'sedan', duration: 'Monthly', perDay: 17, sortOrder: 5,
    features: ['Daily Exterior Cleaning', '365 Days (No Holidays)', '5 AM–12 PM Slot', 'Doorstep Service', 'Windshield Rinse', 'Tyre Wipe'],
    popular: true,
  },
  {
    name: 'MPV Plan', tier: 'MPV',
    price: 599, category: 'mpv', duration: 'Monthly', perDay: 20, sortOrder: 6,
    features: ['Daily Exterior Cleaning', '365 Days (No Holidays)', '5 AM–12 PM Slot', 'Doorstep Service', 'Windshield Rinse', 'Tyre Wipe'],
    popular: false,
  },
  {
    name: 'SUV Plan', tier: 'SUV',
    price: 699, category: 'suv', duration: 'Monthly', perDay: 23, sortOrder: 7,
    features: ['Daily Exterior Cleaning', '365 Days (No Holidays)', '5 AM–12 PM Slot', 'Doorstep Service', 'Windshield Rinse', 'Tyre Wipe', 'Liquid Wax Shine (Weekly)'],
    popular: false,
  },
  {
    name: 'Premium Plan', tier: 'Premium',
    price: 899, category: 'premium', duration: 'Monthly', perDay: 30, sortOrder: 8,
    features: ['Daily Exterior Cleaning', '365 Days (No Holidays)', '5 AM–12 PM Slot', 'Doorstep Service', 'Windshield Rinse', 'Tyre Wipe', 'Liquid Wax Shine (Weekly)', 'Microfiber Deep Dry', 'Priority Support'],
    popular: false,
  },
];

const seedPackages = async () => {
  const count = await Package.countDocuments();
  if (count > 0) {
    console.log(`⏭  ${count} packages already exist, skipping.`);
    return;
  }

  await Package.insertMany(BRD_PACKAGES);
  console.log(`✅ ${BRD_PACKAGES.length} BRD-compliant packages seeded`);
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

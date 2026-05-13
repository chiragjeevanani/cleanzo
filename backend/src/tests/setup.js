import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach, vi } from 'vitest';

// Mock external services globally — tests should never hit real SMS/Cloudinary/Razorpay
vi.mock('../services/sms.service.js', () => ({
  sendSms: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../services/cloudinary.service.js', () => ({
  uploadBufferToCloudinary: vi.fn().mockResolvedValue('https://cloudinary.example.com/test.jpg'),
}));

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
  // Wipe all collections between tests for isolation
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

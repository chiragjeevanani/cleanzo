import request from 'supertest';
import app from '../../src/app.js';
import Customer from '../models/Customer.js';
import Cleaner from '../models/Cleaner.js';
import Admin from '../models/Admin.js';
import Vehicle from '../models/Vehicle.js';
import Society from '../models/Society.js';
import Package from '../models/Package.js';
import Settings from '../models/Settings.js';
import jwt from 'jsonwebtoken';

export const api = request(app);

// ── Token helpers ─────────────────────────────────────────────────────────────
export const makeToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });

export const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

// ── Seed helpers ──────────────────────────────────────────────────────────────
export async function createCustomer(overrides = {}) {
  const customer = await Customer.create({
    firstName: 'Test',
    lastName: 'User',
    phone: `9${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}`,
    email: `test_${Date.now()}@example.com`,
    password: 'Password123',
    city: 'Mumbai',
    ...overrides,
  });
  const token = makeToken(customer._id, 'customer');
  return { customer, token };
}

export async function createCleaner(overrides = {}) {
  const cleaner = await Cleaner.create({
    name: 'Test Cleaner',
    phone: `8${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}`,
    city: 'Mumbai',
    ...overrides,
  });
  const token = makeToken(cleaner._id, 'cleaner');
  return { cleaner, token };
}

export async function createAdmin(overrides = {}) {
  const admin = await Admin.create({
    name: 'Test Admin',
    email: `admin_${Date.now()}@example.com`,
    password: 'AdminPass123',
    role: 'superadmin',
    ...overrides,
  });
  const token = makeToken(admin._id, 'superadmin');
  return { admin, token };
}

export async function createVehicle(customerId, overrides = {}) {
  return Vehicle.create({
    customer: customerId,
    brand: 'Maruti',
    model: 'Swift',
    number: `MH01AB${Math.floor(Math.random() * 9000 + 1000)}`,
    category: 'hatchback',
    ...overrides,
  });
}

export async function createSociety(overrides = {}) {
  return Society.create({
    name: 'Test Society',
    city: 'Mumbai',
    address: '123 Test St',
    isActive: true,
    slots: [
      { slotId: '06_07_AM', timeWindow: '06:00 AM - 07:00 AM', maxVehicles: 10, currentCount: 0 },
      { slotId: '07_08_AM', timeWindow: '07:00 AM - 08:00 AM', maxVehicles: 2, currentCount: 2 },
    ],
    ...overrides,
  });
}

export async function createPackage(overrides = {}) {
  return Package.create({
    name: 'Basic',
    tier: 'basic',
    price: 399,
    category: 'hatchback',
    features: ['Daily wash'],
    ...overrides,
  });
}

export async function seedSettings() {
  await Settings.insertMany([
    { key: 'trialPrice', value: 30 },
    { key: 'prioritySlotFee', value: 99 },
    { key: 'referralDiscountPercent', value: 25 },
    { key: 'referralExpiryDays', value: 7 },
  ]);
}

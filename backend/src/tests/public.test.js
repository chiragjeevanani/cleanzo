import { describe, it, expect, beforeEach } from 'vitest';
import { api } from './helpers.js';
import CleanerApplication from '../models/CleanerApplication.js';
import Settings from '../models/Settings.js';

// Minimal valid JPEG buffer (magic bytes: FF D8 FF)
const fakeJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, ...Array(12).fill(0)]);

// ─── PUBLIC CLEANER APPLICATION ───────────────────────────────────────────────
describe('PUB-1 | POST /public/cleaner-apply', () => {
  it('creates an application with text-only fields (no KYC files)', async () => {
    const res = await api.post('/api/public/cleaner-apply')
      .field('name', 'Ravi Kumar')
      .field('phone', '9876543210')
      .field('age', '28')
      .field('city', 'Hyderabad')
      .field('fatherName', 'Suresh Kumar')
      .field('permanentAddress', '10 MG Road, Hyd')
      .field('currentAddress', '10 MG Road, Hyd')
      .field('referenceName', 'Ram Sharma')
      .field('referencePhone', '9111111111');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('applicationId');

    const app = await CleanerApplication.findById(res.body.applicationId);
    expect(app).not.toBeNull();
    expect(app.name).toBe('Ravi Kumar');
    expect(app.status).toBe('pending');
  });

  it('creates an application with KYC image uploads', async () => {
    const res = await api.post('/api/public/cleaner-apply')
      .field('name', 'Sita Devi')
      .field('phone', '9123456780')
      .field('age', '25')
      .field('city', 'Pune')
      .field('fatherName', 'Gopal Das')
      .field('permanentAddress', '5 Shivaji Nagar')
      .field('currentAddress', '5 Shivaji Nagar')
      .field('referenceName', 'Anita Ref')
      .field('referencePhone', '9000000099')
      .attach('livePhoto', fakeJpeg, { filename: 'face.jpg', contentType: 'image/jpeg' })
      .attach('aadhaarPhoto', fakeJpeg, { filename: 'aadhaar.jpg', contentType: 'image/jpeg' })
      .attach('panPhoto', fakeJpeg, { filename: 'pan.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(201);
    expect(res.body.applicationId).toBeTruthy();

    const app = await CleanerApplication.findById(res.body.applicationId);
    // Cloudinary is mocked — URL should be the mock value
    expect(app.kyc.livePhoto).toBe('https://cloudinary.example.com/test.jpg');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await api.post('/api/public/cleaner-apply')
      .field('name', 'Incomplete')
      // phone, age, city missing
    ;
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it('returns 400 for invalid phone (not 10 digits)', async () => {
    const res = await api.post('/api/public/cleaner-apply')
      .field('name', 'Bad Phone')
      .field('phone', '123')
      .field('age', '22')
      .field('city', 'Delhi');

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/10 digits/i);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await api.post('/api/public/cleaner-apply')
      .field('name', 'Bad Email')
      .field('phone', '9800000001')
      .field('age', '22')
      .field('city', 'Delhi')
      .field('email', 'not-an-email');

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  it('returns 400 when age is below 18', async () => {
    const res = await api.post('/api/public/cleaner-apply')
      .field('name', 'Young One')
      .field('phone', '9800000002')
      .field('age', '16')
      .field('city', 'Delhi');

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/18.*65|between/i);
  });

  it('returns 400 for non-image file (magic bytes check)', async () => {
    const fakePdf = Buffer.from('%PDF-1.4 this is not an image at all!!!');
    const res = await api.post('/api/public/cleaner-apply')
      .field('name', 'Fake Img')
      .field('phone', '9800000003')
      .field('age', '24')
      .field('city', 'Bangalore')
      .attach('livePhoto', fakePdf, { filename: 'hack.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid image/i);
  });
});

// ─── PUBLIC SETTINGS ──────────────────────────────────────────────────────────
describe('PUB-2 | GET /public/settings', () => {
  beforeEach(async () => {
    await Settings.insertMany([
      { key: 'trialPrice', value: 30 },
      { key: 'prioritySlotFee', value: 99 },
    ]);
  });

  it('returns trialPrice and prioritySlotFee', async () => {
    const res = await api.get('/api/public/settings');
    expect(res.status).toBe(200);
    expect(res.body.trialPrice).toBe(30);
    expect(res.body.prioritySlotFee).toBe(99);
  });

  it('falls back to defaults when settings are not in DB', async () => {
    // Clear settings seeded in beforeEach
    await Settings.deleteMany({});
    const res = await api.get('/api/public/settings');
    expect(res.status).toBe(200);
    expect(res.body.trialPrice).toBe(30);
    expect(res.body.prioritySlotFee).toBe(99);
  });
});

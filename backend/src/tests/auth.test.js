import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, createCustomer, createCleaner, createAdmin, makeToken, authHeader } from './helpers.js';
import Customer from '../models/Customer.js';
import RefreshToken from '../models/RefreshToken.js';
import Otp from '../models/Otp.js';
import bcrypt from 'bcryptjs';

// ── Helpers ───────────────────────────────────────────────────────────────────
async function seedOtp(phone, code = '123456', role = 'customer') {
  const normalized = phone.replace(/\D/g, '').replace(/^91/, '');
  const hashed = await bcrypt.hash(code, 10);
  await Otp.create({
    phone: normalized,
    code: hashed,
    role,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });
  return { phone: normalized, code };
}

describe('AUTH-1..2 | send-otp existence checks', () => {
  it('returns 404 USER_NOT_FOUND when phone not registered and mode=login', async () => {
    const res = await api.post('/api/auth/send-otp').send({ phone: '9000000001', role: 'customer', mode: 'login' });
    expect(res.status).toBe(404);
    expect(res.body.type).toBe('USER_NOT_FOUND');
  });

  it('returns 409 USER_ALREADY_EXISTS when phone registered and mode=signup', async () => {
    const { customer } = await createCustomer({ phone: '9000000002' });
    const res = await api.post('/api/auth/send-otp').send({ phone: '9000000002', role: 'customer', mode: 'signup' });
    expect(res.status).toBe(409);
    expect(res.body.type).toBe('USER_ALREADY_EXISTS');
  });
});

describe('AUTH-3 | verify-otp new customer signup', () => {
  it('creates customer and returns JWT + refreshToken on valid OTP', async () => {
    const phone = '9000000010';
    await seedOtp(phone, '654321');
    const res = await api.post('/api/auth/verify-otp').send({
      phone,
      code: '654321',
      role: 'customer',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      city: 'Delhi',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.user.role).toBe('customer');
    // Refresh token should be stored in DB
    const stored = await RefreshToken.findOne({ token: res.body.refreshToken });
    expect(stored).not.toBeNull();
  });
});

describe('AUTH-4 | verify-otp wrong code / brute-force lockout', () => {
  it('returns 400 on wrong OTP code', async () => {
    const phone = '9000000020';
    await seedOtp(phone, '111111');
    const res = await api.post('/api/auth/verify-otp').send({ phone, code: '999999', role: 'customer' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid otp/i);
  });

  it('deletes OTP and returns error after 5 failed attempts', async () => {
    const phone = '9000000021';
    const normalized = phone;
    const hashed = await bcrypt.hash('111111', 10);
    await Otp.create({ phone: normalized, code: hashed, role: 'customer', expiresAt: new Date(Date.now() + 5 * 60 * 1000), attempts: 4 });
    const res = await api.post('/api/auth/verify-otp').send({ phone, code: '999999', role: 'customer' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/too many attempts/i);
    const remaining = await Otp.findOne({ phone: normalized });
    expect(remaining).toBeNull();
  });
});

describe('AUTH-7..8 | refresh token rotation', () => {
  it('issues new tokens and deletes the old refresh token', async () => {
    const { customer, token } = await createCustomer({ phone: '9000000030' });
    // Obtain a refresh token via OTP login
    await seedOtp('9000000030', '555555');
    const loginRes = await api.post('/api/auth/verify-otp').send({
      phone: '9000000030', code: '555555', role: 'customer'
    });
    const oldRefreshToken = loginRes.body.refreshToken;

    const refreshRes = await api.post('/api/auth/refresh-token').send({ refreshToken: oldRefreshToken });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.token).toBeTruthy();
    expect(refreshRes.body.refreshToken).toBeTruthy();
    expect(refreshRes.body.refreshToken).not.toBe(oldRefreshToken);

    // Old token should be revoked
    const old = await RefreshToken.findOne({ token: oldRefreshToken });
    expect(old).toBeNull();
  });

  it('rejects an already-rotated (reused) refresh token', async () => {
    const { customer } = await createCustomer({ phone: '9000000031' });
    await seedOtp('9000000031', '666666');
    const loginRes = await api.post('/api/auth/verify-otp').send({
      phone: '9000000031', code: '666666', role: 'customer'
    });
    const oldRefreshToken = loginRes.body.refreshToken;
    // Rotate once
    await api.post('/api/auth/refresh-token').send({ refreshToken: oldRefreshToken });
    // Second use of same token should fail
    const res = await api.post('/api/auth/refresh-token').send({ refreshToken: oldRefreshToken });
    expect(res.status).toBe(401);
  });
});

describe('AUTH-9 | logout revokes refresh token', () => {
  it('deletes the refresh token from DB on logout', async () => {
    const { customer } = await createCustomer({ phone: '9000000040' });
    await seedOtp('9000000040', '444444');
    const loginRes = await api.post('/api/auth/verify-otp').send({
      phone: '9000000040', code: '444444', role: 'customer'
    });
    const refreshToken = loginRes.body.refreshToken;

    await api.post('/api/auth/logout').send({ refreshToken });

    const stored = await RefreshToken.findOne({ token: refreshToken });
    expect(stored).toBeNull();

    // Subsequent refresh with same token should fail
    const refreshRes = await api.post('/api/auth/refresh-token').send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });
});

describe('AUTH-13..14 | GET /auth/me', () => {
  it('returns user data with a valid token', async () => {
    const { customer, token } = await createCustomer();
    const res = await api.get('/api/auth/me').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.user._id).toBe(customer._id.toString());
  });

  it('returns 401 with no token', async () => {
    const res = await api.get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with an expired / invalid token', async () => {
    const res = await api.get('/api/auth/me').set({ Authorization: 'Bearer invalid.token.here' });
    expect(res.status).toBe(401);
  });
});

describe('AUTH | admin login', () => {
  it('returns token for valid admin credentials', async () => {
    const { admin } = await createAdmin({ email: 'admin@cleanzo.in', password: 'AdminSecret1' });
    const res = await api.post('/api/auth/admin-login').send({ email: 'admin@cleanzo.in', password: 'AdminSecret1' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('superadmin');
  });

  it('returns 401 on wrong admin password', async () => {
    await createAdmin({ email: 'admin2@cleanzo.in', password: 'AdminSecret1' });
    const res = await api.post('/api/auth/admin-login').send({ email: 'admin2@cleanzo.in', password: 'WrongPass' });
    expect(res.status).toBe(401);
  });
});

describe('AUTH | role isolation', () => {
  it('customer token rejected on admin route', async () => {
    const { token } = await createCustomer();
    const res = await api.get('/api/admin/dashboard').set(authHeader(token));
    expect(res.status).toBe(403);
  });

  it('cleaner token rejected on customer route', async () => {
    const { token } = await createCleaner();
    const res = await api.get('/api/customer/profile').set(authHeader(token));
    expect(res.status).toBe(403);
  });
});

describe('AUTH | multi-phase customer signup flow', () => {
  it('verifies OTP and completes signup successfully', async () => {
    const phone = '9000000100';
    await seedOtp(phone, '123456');

    // 1. Verify OTP only
    const verifyRes = await api.post('/api/auth/verify-otp-signup').send({
      phone,
      code: '123456',
      role: 'customer',
    });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.signupToken).toBeTruthy();

    const signupToken = verifyRes.body.signupToken;

    // 2. Complete Signup
    const completeRes = await api.post('/api/auth/complete-signup').send({
      signupToken,
      firstName: 'John',
      lastName: 'Smith',
      email: 'johnsmith@example.com',
      city: 'Jaipur',
    });
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.token).toBeTruthy();
    expect(completeRes.body.refreshToken).toBeTruthy();
    expect(completeRes.body.user.firstName).toBe('John');

    // Verify user in DB
    const user = await Customer.findOne({ phone });
    expect(user).toBeTruthy();
    expect(user.firstName).toBe('John');
    expect(user.lastName).toBe('Smith');
  });

  it('rejects signup with invalid token', async () => {
    const res = await api.post('/api/auth/complete-signup').send({
      signupToken: 'invalid-token-here',
      firstName: 'John',
      lastName: 'Smith',
      email: 'johnsmith2@example.com',
      city: 'Jaipur',
    });
    expect(res.status).toBe(401);
  });
});

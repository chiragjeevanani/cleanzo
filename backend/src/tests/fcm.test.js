import { describe, it, expect } from 'vitest';
import { api, createCustomer, createCleaner, createAdmin, createSociety, makeToken, authHeader } from './helpers.js';
import Customer from '../models/Customer.js';
import Cleaner from '../models/Cleaner.js';
import Admin from '../models/Admin.js';
import PartnerSociety from '../models/PartnerSociety.js';

describe('FCM | Push Notification Tokens', () => {
  it('saves and removes customer FCM tokens with deduplication using generic endpoint', async () => {
    const { customer, token } = await createCustomer();
    const headers = authHeader(token);

    // Save token using generic endpoint
    const resSave = await api.post('/api/push/save').set(headers).send({ token: 'cust_fcm_token_123', platform: 'mobile' });
    expect(resSave.status).toBe(200);
    expect(resSave.body.message).toBe('FCM token saved');

    const updated = await Customer.findById(customer._id);
    expect(updated.fcmTokens).toContain('cust_fcm_token_123');

    // Save duplicate (should deduplicate)
    await api.post('/api/push/save').set(headers).send({ token: 'cust_fcm_token_123', platform: 'mobile' });
    const updatedDup = await Customer.findById(customer._id);
    expect(updatedDup.fcmTokens.filter(t => t === 'cust_fcm_token_123').length).toBe(1);

    // Delete token using generic endpoint
    const resDel = await api.delete('/api/push/save').set(headers).send({ token: 'cust_fcm_token_123' });
    expect(resDel.status).toBe(200);
    expect(resDel.body.message).toBe('FCM token removed');

    const deleted = await Customer.findById(customer._id);
    expect(deleted.fcmTokens).not.toContain('cust_fcm_token_123');
  });

  it('saves and removes cleaner FCM tokens using generic endpoint', async () => {
    const { cleaner, token } = await createCleaner();
    const headers = authHeader(token);

    const resSave = await api.post('/api/push/save').set(headers).send({ token: 'cleaner_fcm_token_123', platform: 'mobile' });
    expect(resSave.status).toBe(200);

    const updated = await Cleaner.findById(cleaner._id);
    expect(updated.fcmTokens).toContain('cleaner_fcm_token_123');

    const resDel = await api.delete('/api/push/save').set(headers).send({ token: 'cleaner_fcm_token_123' });
    expect(resDel.status).toBe(200);

    const deleted = await Cleaner.findById(cleaner._id);
    expect(deleted.fcmTokens).not.toContain('cleaner_fcm_token_123');
  });

  it('saves and removes admin FCM tokens using generic endpoint', async () => {
    const { admin, token } = await createAdmin();
    const headers = authHeader(token);

    const resSave = await api.post('/api/push/save').set(headers).send({ token: 'admin_fcm_token_123', platform: 'mobile' });
    expect(resSave.status).toBe(200);

    const updated = await Admin.findById(admin._id);
    expect(updated.fcmTokens).toContain('admin_fcm_token_123');

    const resDel = await api.delete('/api/push/save').set(headers).send({ token: 'admin_fcm_token_123' });
    expect(resDel.status).toBe(200);

    const deleted = await Admin.findById(admin._id);
    expect(deleted.fcmTokens).not.toContain('admin_fcm_token_123');
  });

  it('saves and removes society partner FCM tokens using generic endpoint', async () => {
    const societyDoc = await createSociety();
    const partner = await PartnerSociety.create({
      society: societyDoc._id,
      contactName: 'Partner Society Contact',
      email: `partner_fcm_${Date.now()}@example.com`,
      password: 'Password123',
    });
    const token = makeToken(partner._id, 'society');
    const headers = authHeader(token);

    const resSave = await api.post('/api/push/save').set(headers).send({ token: 'society_fcm_token_123', platform: 'mobile' });
    expect(resSave.status).toBe(200);

    const updated = await PartnerSociety.findById(partner._id);
    expect(updated.fcmTokens).toContain('society_fcm_token_123');

    const resDel = await api.delete('/api/push/save').set(headers).send({ token: 'society_fcm_token_123' });
    expect(resDel.status).toBe(200);

    const deleted = await PartnerSociety.findById(partner._id);
    expect(deleted.fcmTokens).not.toContain('society_fcm_token_123');
  });

  // Keep checks for legacy role-based endpoints to prevent regression
  describe('Legacy Role-Based Endpoints', () => {
    it('customer fcm-token', async () => {
      const { customer, token } = await createCustomer();
      const headers = authHeader(token);
      const resSave = await api.post('/api/customer/fcm-token').set(headers).send({ token: 'legacy_cust' });
      expect(resSave.status).toBe(200);
      const resDel = await api.delete('/api/customer/fcm-token').set(headers).send({ token: 'legacy_cust' });
      expect(resDel.status).toBe(200);
    });

    it('cleaner fcm-token', async () => {
      const { cleaner, token } = await createCleaner();
      const headers = authHeader(token);
      const resSave = await api.post('/api/cleaner/fcm-token').set(headers).send({ token: 'legacy_cleaner' });
      expect(resSave.status).toBe(200);
    });

    it('admin fcm-token', async () => {
      const { admin, token } = await createAdmin();
      const headers = authHeader(token);
      const resSave = await api.post('/api/admin/fcm-token').set(headers).send({ token: 'legacy_admin' });
      expect(resSave.status).toBe(200);
    });

    it('society fcm-token', async () => {
      const societyDoc = await createSociety();
      const partner = await PartnerSociety.create({
        society: societyDoc._id,
        contactName: 'Partner Society Contact 2',
        email: `partner_fcm_legacy_${Date.now()}@example.com`,
        password: 'Password123',
      });
      const token = makeToken(partner._id, 'society');
      const headers = authHeader(token);
      const resSave = await api.post('/api/society/fcm-token').set(headers).send({ token: 'legacy_society' });
      expect(resSave.status).toBe(200);
    });
  });
});

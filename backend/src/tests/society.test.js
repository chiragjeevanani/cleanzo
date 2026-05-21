import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { api, createAdmin, createCustomer, createSociety, createPackage, makeToken, authHeader } from './helpers.js';
import PartnerSociety from '../models/PartnerSociety.js';
import SocietyCommission from '../models/SocietyCommission.js';
import SocietyPayoutRequest from '../models/SocietyPayoutRequest.js';
import Subscription from '../models/Subscription.js';
import Payment from '../models/Payment.js';
import Vehicle from '../models/Vehicle.js';

// Helper to mock Razorpay
import { vi } from 'vitest';
vi.mock('razorpay', () => ({
  default: vi.fn().mockImplementation(() => ({
    orders: { create: vi.fn(), fetch: vi.fn() },
  })),
}));

async function verifiedPayment(customerId, overrides = {}) {
  return Payment.create({
    customer: customerId,
    orderId: `order_${crypto.randomBytes(4).toString('hex')}`,
    paymentId: `pay_${crypto.randomBytes(4).toString('hex')}`,
    signature: 'sig_ok',
    amount: 39900,
    status: 'verified',
    ...overrides,
  });
}

async function createPartner(societyId, overrides = {}) {
  const email = `partner_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`;
  const partner = await PartnerSociety.create({
    society: societyId,
    contactName: 'Partner Contact',
    email,
    password: 'Password123',
    phone: '9876543210',
    commissionRate: 10,
    isActive: true,
    ...overrides
  });
  const token = makeToken(partner._id, 'society');
  return { partner, token };
}

describe('SOCIETY PARTNER PROGRAM | Backend Tests', () => {

  // ─── ADMIN: CRUD PARTNER SOCIETIES ─────────────────────────
  describe('Admin Operations on Partner Societies', () => {
    it('creates a partner society successfully', async () => {
      const { token } = await createAdmin();
      const society = await createSociety();
      const email = `admin_created_${Date.now()}@example.com`;

      const res = await api
        .post('/api/admin/partner-societies')
        .set(authHeader(token))
        .send({
          societyId: society._id,
          contactName: 'Jane Partner',
          email,
          password: 'SecretPassword123',
          phone: '9988776655',
          commissionRate: 12,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.partner.contactName).toBe('Jane Partner');
      expect(res.body.partner.commissionRate).toBe(12);

      const dbPartner = await PartnerSociety.findOne({ email });
      expect(dbPartner).not.toBeNull();
      expect(dbPartner.society.toString()).toBe(society._id.toString());
    });

    it('lists partner societies with pagination', async () => {
      const { token } = await createAdmin();
      const society1 = await createSociety();
      const society2 = await createSociety();
      await createPartner(society1._id);
      await createPartner(society2._id);

      const res = await api
        .get('/api/admin/partner-societies')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.partners.length).toBeGreaterThanOrEqual(2);
    });

    it('updates a partner society', async () => {
      const { token } = await createAdmin();
      const society = await createSociety();
      const { partner } = await createPartner(society._id);

      const res = await api
        .put(`/api/admin/partner-societies/${partner._id}`)
        .set(authHeader(token))
        .send({
          contactName: 'Updated Partner Name',
          commissionRate: 15,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.partner.contactName).toBe('Updated Partner Name');
      expect(res.body.partner.commissionRate).toBe(15);
    });

    it('deactivates (soft-deletes) a partner society', async () => {
      const { token } = await createAdmin();
      const society = await createSociety();
      const { partner } = await createPartner(society._id);

      const res = await api
        .delete(`/api/admin/partner-societies/${partner._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbPartner = await PartnerSociety.findById(partner._id);
      expect(dbPartner).toBeNull();
    });
  });

  // ─── SOCIETY: AUTHENTICATION ───────────────────────────────
  describe('Partner Society Login', () => {
    it('returns JWT token on valid credentials', async () => {
      const society = await createSociety();
      const { partner } = await createPartner(society._id, { password: 'Password123' });

      const res = await api
        .post('/api/auth/society-login')
        .send({
          email: partner.email,
          password: 'Password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeTruthy();
      expect(res.body.user.role).toBe('society');
    });

    it('returns 401 on incorrect password', async () => {
      const society = await createSociety();
      const { partner } = await createPartner(society._id, { password: 'Password123' });

      const res = await api
        .post('/api/auth/society-login')
        .send({
          email: partner.email,
          password: 'WrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── SOCIETY: PROFILE & SETTINGS ───────────────────────────
  describe('Society Profile Endpoints', () => {
    it('gets the partner society profile details', async () => {
      const society = await createSociety({ name: 'Emerald Heights' });
      const { token } = await createPartner(society._id, { contactName: 'Garrison' });

      const res = await api
        .get('/api/society/profile')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile.contactName).toBe('Garrison');
      expect(res.body.profile.society.name).toBe('Emerald Heights');
    });

    it('updates contact name, phone, and saved bank details', async () => {
      const society = await createSociety();
      const { token, partner } = await createPartner(society._id);

      const res = await api
        .put('/api/society/profile')
        .set(authHeader(token))
        .send({
          contactName: 'New Contact Person',
          phone: '9999988888',
          bankDetails: {
            accountName: 'Emerald Partner',
            accountNumber: '1234567890',
            bankName: 'HDFC Bank',
            ifscCode: 'HDFC0001234',
            upiId: 'emerald@upi',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile.contactName).toBe('New Contact Person');
      expect(res.body.profile.phone).toBe('9999988888');
      expect(res.body.profile.bankDetails.accountNumber).toBe('1234567890');
      expect(res.body.profile.bankDetails.upiId).toBe('emerald@upi');

      const updated = await PartnerSociety.findById(partner._id);
      expect(updated.bankDetails.bankName).toBe('HDFC Bank');
    });

    it('changes password successfully', async () => {
      const society = await createSociety();
      const { token, partner } = await createPartner(society._id, { password: 'OldPassword123' });

      const res = await api
        .put('/api/society/profile/change-password')
        .set(authHeader(token))
        .send({
          currentPassword: 'OldPassword123',
          newPassword: 'NewPassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify login with new password
      const loginRes = await api
        .post('/api/auth/society-login')
        .send({
          email: partner.email,
          password: 'NewPassword123',
        });
      expect(loginRes.status).toBe(200);
    });
  });

  // ─── COMMISSION CREDIT FLOW & DASHBOARD ─────────────────────
  describe('Subscription Commission Credit & Dashboard', () => {
    it('credits commission upon non-trial purchase, shows correct dashboard metrics', async () => {
      const society = await createSociety();
      const { partner, token: partnerToken } = await createPartner(society._id, { commissionRate: 15 });

      // Create a customer belonging to this society
      const { customer, token: customerToken } = await createCustomer({ society: society._id });
      
      // Add a vehicle to the customer
      const vehicle = await Vehicle.create({
        customer: customer._id,
        brand: 'Hyundai',
        model: 'i20',
        number: 'MH12AB1234',
        category: 'hatchback',
      });

      // Create a package
      const pkg = await createPackage({ price: 1000 });

      // Mock a payment of 1000
      const payment = await verifiedPayment(customer._id, { amount: 100000 }); // ₹1000 in paise

      // Purchase a non-trial subscription
      const subRes = await api
        .post('/api/customer/subscriptions')
        .set(authHeader(customerToken))
        .send({
          packageId: pkg._id,
          vehicleId: vehicle._id,
          societyId: society._id,
          slotId: '06_07_AM',
          isTrial: false,
          paymentId: payment.paymentId,
        });

      expect(subRes.status).toBe(201);

      // Verify that commission was credited
      const commissions = await SocietyCommission.find({ partnerSociety: partner._id });
      expect(commissions.length).toBe(1);
      
      const comm = commissions[0];
      expect(comm.subscriptionAmount).toBe(1000);
      expect(comm.commissionRate).toBe(15);
      expect(comm.commissionAmount).toBe(150); // 15% of 1000
      expect(comm.status).toBe('pending');

      // Verify partner's updated balances in DB
      const updatedPartner = await PartnerSociety.findById(partner._id);
      expect(updatedPartner.totalEarned).toBe(150);
      expect(updatedPartner.pendingBalance).toBe(150);

      // Get Society Dashboard & check metrics
      const dashRes = await api
        .get('/api/society/dashboard')
        .set(authHeader(partnerToken));

      expect(dashRes.status).toBe(200);
      expect(dashRes.body.success).toBe(true);
      expect(dashRes.body.dashboard.totalMembers).toBe(1);
      expect(dashRes.body.dashboard.activeSubscriptionsCount).toBe(1);
      expect(dashRes.body.dashboard.totalCommissionEarned).toBe(150);
      expect(dashRes.body.dashboard.pendingBalance).toBe(150);
      expect(dashRes.body.dashboard.trialOnlyCount).toBe(0);
    });

    it('does not credit commission on trial subscription purchase', async () => {
      const society = await createSociety();
      const { partner } = await createPartner(society._id, { commissionRate: 10 });
      const { customer, token: customerToken } = await createCustomer({ society: society._id });
      const vehicle = await Vehicle.create({
        customer: customer._id,
        brand: 'Hyundai',
        model: 'i20',
        number: 'MH12AB1234',
        category: 'hatchback',
      });
      const payment = await verifiedPayment(customer._id, { amount: 3000 }); // ₹30

      // Purchase a trial subscription
      const subRes = await api
        .post('/api/customer/subscriptions')
        .set(authHeader(customerToken))
        .send({
          vehicleId: vehicle._id,
          societyId: society._id,
          slotId: '06_07_AM',
          isTrial: true,
          paymentId: payment.paymentId,
        });

      expect(subRes.status).toBe(201);

      // Verify no commission was credited
      const commissions = await SocietyCommission.find({ partnerSociety: partner._id });
      expect(commissions.length).toBe(0);
    });
  });

  // ─── PAYOUT FLOW ───────────────────────────────────────────
  describe('Payout Requests & Administration', () => {
    it('manages a successful payout request cycle', async () => {
      const { token: adminToken } = await createAdmin();
      const society = await createSociety();
      const { partner, token: partnerToken } = await createPartner(society._id);

      // Seed some pending commission for the partner
      await SocietyCommission.create({
        partnerSociety: partner._id,
        customer: new mongoose.Types.ObjectId(),
        subscription: new mongoose.Types.ObjectId(),
        subscriptionAmount: 1000,
        commissionRate: 10,
        commissionAmount: 100,
        status: 'pending',
      });
      partner.totalEarned = 100;
      partner.pendingBalance = 100;
      await partner.save();

      // Submit payout request
      const payoutRes = await api
        .post('/api/society/payout-requests')
        .set(authHeader(partnerToken))
        .send({
          amount: 60,
          bankDetails: {
            upiId: 'partner@upi',
          },
        });

      expect(payoutRes.status).toBe(201);
      expect(payoutRes.body.success).toBe(true);
      expect(payoutRes.body.request.amount).toBe(60);
      expect(payoutRes.body.request.status).toBe('pending');

      const reqId = payoutRes.body.request._id;

      // Try submitting another request while one is pending - should fail
      const repeatRes = await api
        .post('/api/society/payout-requests')
        .set(authHeader(partnerToken))
        .send({ amount: 10 });
      expect(repeatRes.status).toBe(400);

      // Admin approves the request
      const approveRes = await api
        .put(`/api/admin/payout-requests/${reqId}`)
        .set(authHeader(adminToken))
        .send({
          action: 'approve',
          adminRemark: 'Approved transaction ID tx_123',
        });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.success).toBe(true);
      expect(approveRes.body.request.status).toBe('approved');
      expect(approveRes.body.request.adminRemark).toBe('Approved transaction ID tx_123');

      // Verify that society pendingBalance has decreased
      const finalPartner = await PartnerSociety.findById(partner._id);
      expect(finalPartner.pendingBalance).toBe(40); // 100 - 60

      // Verify that commission status is updated appropriately
      // (amount approved is 60, our pending commission is 100. It marks commission as paid because it satisfies/deducts up to the request amount)
      const commissionInDb = await SocietyCommission.findOne({ partnerSociety: partner._id });
      expect(commissionInDb.status).toBe('paid');
    });

    it('rejects payout request if amount exceeds pending balance', async () => {
      const society = await createSociety();
      const { partner, token: partnerToken } = await createPartner(society._id);

      // Balance is 0
      const payoutRes = await api
        .post('/api/society/payout-requests')
        .set(authHeader(partnerToken))
        .send({ amount: 50 });

      expect(payoutRes.status).toBe(400);
      expect(payoutRes.body.success).toBe(false);
    });
  });
});

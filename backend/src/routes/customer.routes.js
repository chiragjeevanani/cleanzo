import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { upload, validateImageBytes } from '../middleware/upload.js';
import * as ctrl from '../controllers/customer.controller.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { customerApiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Auth first, then per-user rate limit (300 req / 15 min per customer ID)
router.use(protect, authorize('customer'));
router.use(customerApiLimiter);

router.get('/profile', cacheMiddleware(300, true), ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
// Account deletion — App Store / Play Store requirement
router.delete('/account', ctrl.deleteAccount);

router.get('/vehicles', cacheMiddleware(300, true), ctrl.getVehicles);
router.post('/vehicles', upload.array('photos', 5), ctrl.addVehicle);
router.put('/vehicles/:id', upload.array('photos', 5), ctrl.updateVehicle);
router.delete('/vehicles/:id', ctrl.deleteVehicle);

router.get('/subscriptions', cacheMiddleware(300, true), ctrl.getSubscriptions);
router.get('/subscriptions/:id', cacheMiddleware(300, true), ctrl.getSubscriptionById);
router.post('/subscriptions', ctrl.createSubscription);
router.post('/subscriptions/:id/skip', ctrl.skipService);
router.post('/subscriptions/:id/extend', ctrl.extendSubscription);
router.post('/subscriptions/:id/upgrade', ctrl.upgradeSubscription);

router.post('/coupons/validate', ctrl.validateCouponCode);

router.get('/payment-history', ctrl.getPaymentHistory);
router.get('/payment-history/:paymentId', ctrl.getPaymentDetails);

router.get('/history', cacheMiddleware(300, true), ctrl.getHistory);
router.post('/tasks/:id/rate', ctrl.rateTask);

router.get('/notifications', cacheMiddleware(120, true), ctrl.getNotifications);
router.put('/notifications/:id/read', ctrl.markNotificationRead);

router.post('/fcm-token', ctrl.saveFcmToken);
router.delete('/fcm-token', ctrl.removeFcmToken);

router.get('/addresses', cacheMiddleware(600, true), ctrl.getAddresses);
router.post('/addresses', ctrl.addAddress);
router.put('/addresses/:id', ctrl.updateAddress);
router.delete('/addresses/:id', ctrl.deleteAddress);

router.get('/grievances', ctrl.getGrievances);
router.post('/grievances', upload.single('attachment'), validateImageBytes, ctrl.addGrievance);

router.get('/societies', cacheMiddleware(3600), ctrl.getSocieties);
router.get('/vehicle-categories', cacheMiddleware(3600), ctrl.getVehicleCategories);


// MARKETPLACE
router.get('/marketplace/orders', ctrl.getMyMarketplaceOrders);
router.post('/marketplace/orders', ctrl.placeMarketplaceOrder);
router.post('/marketplace/orders/:id/cancel', ctrl.cancelMarketplaceOrder);

export default router;

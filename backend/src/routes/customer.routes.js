import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/customer.controller.js';

const router = Router();

// All routes require customer auth
router.use(protect, authorize('customer'));

router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);

router.get('/vehicles', ctrl.getVehicles);
router.post('/vehicles', ctrl.addVehicle);
router.put('/vehicles/:id', ctrl.updateVehicle);
router.delete('/vehicles/:id', ctrl.deleteVehicle);

router.get('/subscriptions', ctrl.getSubscriptions);
router.get('/subscriptions/:id', ctrl.getSubscriptionById);
router.post('/subscriptions', ctrl.createSubscription);
router.post('/subscriptions/:id/skip', ctrl.skipService);

router.get('/history', ctrl.getHistory);
router.post('/tasks/:id/rate', ctrl.rateTask);

router.get('/notifications', ctrl.getNotifications);
router.put('/notifications/:id/read', ctrl.markNotificationRead);

router.get('/addresses', ctrl.getAddresses);
router.post('/addresses', ctrl.addAddress);
router.delete('/addresses/:id', ctrl.deleteAddress);

router.get('/societies', ctrl.getSocieties);

// MARKETPLACE
router.get('/marketplace/orders', ctrl.getMyMarketplaceOrders);
router.post('/marketplace/orders', ctrl.placeMarketplaceOrder);
router.post('/marketplace/orders/:id/cancel', ctrl.cancelMarketplaceOrder);

export default router;

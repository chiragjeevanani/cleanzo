import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import * as ctrl from '../controllers/customer.controller.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = Router();

// All routes require customer auth
router.use(protect, authorize('customer'));

router.get('/profile', cacheMiddleware(300, true), ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);

router.get('/vehicles', cacheMiddleware(300, true), ctrl.getVehicles);
router.post('/vehicles', upload.array('photos', 5), ctrl.addVehicle);
router.put('/vehicles/:id', ctrl.updateVehicle);
router.delete('/vehicles/:id', ctrl.deleteVehicle);

router.get('/subscriptions', cacheMiddleware(300, true), ctrl.getSubscriptions);
router.get('/subscriptions/:id', cacheMiddleware(300, true), ctrl.getSubscriptionById);
router.post('/subscriptions', ctrl.createSubscription);
router.post('/subscriptions/:id/skip', ctrl.skipService);

router.get('/history', cacheMiddleware(300, true), ctrl.getHistory);
router.post('/tasks/:id/rate', ctrl.rateTask);

router.get('/notifications', cacheMiddleware(120, true), ctrl.getNotifications);
router.put('/notifications/:id/read', ctrl.markNotificationRead);

router.get('/addresses', cacheMiddleware(600, true), ctrl.getAddresses);
router.post('/addresses', ctrl.addAddress);
router.delete('/addresses/:id', ctrl.deleteAddress);

router.get('/societies', cacheMiddleware(3600), ctrl.getSocieties);
router.get('/vehicle-categories', cacheMiddleware(3600), ctrl.getVehicleCategories);


// MARKETPLACE
router.get('/marketplace/orders', ctrl.getMyMarketplaceOrders);
router.post('/marketplace/orders', ctrl.placeMarketplaceOrder);
router.post('/marketplace/orders/:id/cancel', ctrl.cancelMarketplaceOrder);

export default router;

import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import * as ctrl from '../controllers/admin.controller.js';

const router = Router();

router.use(protect, authorize('admin', 'superadmin'));

router.post('/upload', upload.single('image'), ctrl.uploadImage);

router.get('/dashboard', ctrl.getDashboard);
router.get('/badges', ctrl.getAdminBadges);

router.get('/users', ctrl.getUsers);
router.post('/users', ctrl.createUser);
router.get('/users/:id', ctrl.getUserById);
router.put('/users/:id', ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);

router.get('/cleaners', ctrl.getCleaners);
router.post('/cleaners', ctrl.addCleaner);
router.put('/cleaners/:id', ctrl.updateCleaner);
router.delete('/cleaners/:id', ctrl.deleteCleaner);

router.get('/packages', ctrl.getAllPackages);
router.post('/packages', ctrl.createPackage);
router.put('/packages/:id', ctrl.updatePackage);

router.get('/subscriptions', ctrl.getAllSubscriptions);
router.put('/subscriptions/:subscriptionId/assign-cleaner', ctrl.assignCleanerToSubscription);

router.get('/revenue', ctrl.getRevenue);

router.get('/notifications', ctrl.getAdminNotifications);
router.post('/notifications/broadcast', ctrl.broadcastNotification);

// Societies
router.get('/societies', ctrl.getSocieties);
router.post('/societies', ctrl.createSociety);
router.put('/societies/:id', ctrl.updateSociety);
router.delete('/societies/:id', ctrl.deleteSociety);

// Cleaner Applications
router.get('/cleaner-applications', ctrl.getCleanerApplications);
router.put('/cleaner-applications/:id', ctrl.updateCleanerApplicationStatus);
router.delete('/cleaner-applications/:id', ctrl.deleteCleanerApplication);

// Cleaner KYC Review
router.get('/cleaner-kyc', ctrl.getCleanerKycList);
router.put('/cleaner-kyc/:id', ctrl.reviewCleanerKyc);

// Leads
router.get('/leads', ctrl.getLeads);
router.put('/leads/:id', ctrl.updateLeadStatus);
router.delete('/leads/:id', ctrl.deleteLead);

// Settings
router.get('/settings', ctrl.getSettings);
router.put('/settings/:key', ctrl.updateSetting);

// Banners
router.get('/banners', ctrl.getBanners);
router.post('/banners', ctrl.createBanner);
router.delete('/banners/:id', ctrl.deleteBanner);

// MARKETPLACE
router.get('/products', ctrl.getProducts);
router.post('/products', ctrl.createProduct);
router.put('/products/:id', ctrl.updateProduct);
router.delete('/products/:id', ctrl.deleteProduct);

router.get('/marketplace/orders', ctrl.getMarketplaceOrders);
router.put('/marketplace/orders/:id', ctrl.updateOrderStatus);

export default router;

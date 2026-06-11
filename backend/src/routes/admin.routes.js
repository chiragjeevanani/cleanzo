import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import * as ctrl from '../controllers/admin.controller.js';
import { adminApiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Auth first, then per-user rate limit (800 req / 15 min per admin ID)
router.use(protect, authorize('admin', 'superadmin'));
router.use(adminApiLimiter);

router.get('/profile', ctrl.getProfile);
router.post('/upload', upload.single('image'), ctrl.uploadImage);

router.get('/dashboard', ctrl.getDashboard);
router.get('/badges', ctrl.getAdminBadges);

router.get('/users', ctrl.getUsers);
router.post('/users', ctrl.createUser);
router.get('/users/:id', ctrl.getUserById);
router.put('/users/:id', ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);
// Admin acting on behalf of a user
router.post('/users/:id/vehicles', upload.array('photos', 5), ctrl.createUserVehicle);
router.post('/users/:id/subscriptions', ctrl.createUserSubscription);

router.get('/cleaners', ctrl.getCleaners);
router.post('/cleaners', ctrl.addCleaner);
router.get('/cleaners/attendance', ctrl.getCleanerAttendanceLogs);
router.put('/cleaners/attendance', ctrl.updateCleanerAttendance);
router.get('/cleaners/:id', ctrl.getCleanerById);
router.put('/cleaners/:id', ctrl.updateCleaner);
router.delete('/cleaners/:id', ctrl.deleteCleaner);

router.get('/leaves', ctrl.getLeaveRequests);
router.put('/leaves/:id/review', ctrl.reviewLeaveRequest);


router.get('/packages', ctrl.getAllPackages);
router.post('/packages', ctrl.createPackage);
router.put('/packages/:id', ctrl.updatePackage);
router.delete('/packages/:id', ctrl.deletePackage);

// Package Discounts
router.get('/discounts', ctrl.getDiscounts);
router.put('/discounts/global', ctrl.updateGlobalDiscount);
router.post('/discounts/individual', ctrl.createIndividualDiscount);
router.put('/discounts/individual/:id', ctrl.updateIndividualDiscount);
router.delete('/discounts/individual/:id', ctrl.deleteIndividualDiscount);

// Coupons
router.get('/coupons', ctrl.getCoupons);
router.post('/coupons', ctrl.createCoupon);
router.put('/coupons/:id', ctrl.updateCoupon);
router.delete('/coupons/:id', ctrl.deleteCoupon);


router.get('/subscriptions', ctrl.getAllSubscriptions);
router.put('/subscriptions/:subscriptionId/assign-cleaner', ctrl.assignCleanerToSubscription);
router.put('/subscriptions/:subscriptionId/cancel', ctrl.cancelSubscription);

router.get('/revenue', ctrl.getRevenue);

router.get('/notifications', ctrl.getAdminNotifications);
router.post('/notifications/broadcast', ctrl.broadcastNotification);

router.post('/fcm-token', ctrl.saveFcmToken);
router.delete('/fcm-token', ctrl.removeFcmToken);

// Societies
router.get('/societies', ctrl.getSocieties);
router.post('/societies', ctrl.createSociety);
router.put('/societies/:id', ctrl.updateSociety);
router.delete('/societies/:id', ctrl.deleteSociety);

// Cities
router.get('/cities', ctrl.getCities);
router.post('/cities', ctrl.createCity);
router.put('/cities/:id', ctrl.updateCity);
router.delete('/cities/:id', ctrl.deleteCity);

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

router.get('/marketplace/categories', ctrl.getMarketplaceCategories);
router.post('/marketplace/categories', ctrl.createMarketplaceCategory);
router.put('/marketplace/categories/:id', ctrl.updateMarketplaceCategory);
router.delete('/marketplace/categories/:id', ctrl.deleteMarketplaceCategory);

router.get('/marketplace/orders', ctrl.getMarketplaceOrders);
router.put('/marketplace/orders/:id', ctrl.updateOrderStatus);

// Vehicle Categories
router.get('/vehicle-categories', ctrl.getVehicleCategories);
router.post('/vehicle-categories', ctrl.addVehicleCategory);
router.put('/vehicle-categories/:id', ctrl.updateVehicleCategory);
router.delete('/vehicle-categories/:id', ctrl.deleteVehicleCategory);

// Maintenance
router.post('/maintenance/cleanup-duplicate-tasks', ctrl.cleanupDuplicateTasks);
router.post('/maintenance/trigger-cron', ctrl.triggerCronJob);
router.post('/maintenance/assign-all-cleaners', ctrl.assignAllCleaners);

// Testimonials
router.get('/testimonials', ctrl.getTestimonials);
router.post('/testimonials', ctrl.createTestimonial);
router.put('/testimonials/:id', ctrl.updateTestimonial);
router.delete('/testimonials/:id', ctrl.deleteTestimonial);

// FAQs
router.get('/faqs', ctrl.getFaqs);
router.post('/faqs', ctrl.createFaq);
router.put('/faqs/:id', ctrl.updateFaq);
router.delete('/faqs/:id', ctrl.deleteFaq);

// Brands & Models
router.get('/brands', ctrl.getBrands);
router.post('/brands', ctrl.createBrand);
router.put('/brands/:id', ctrl.updateBrand);
router.delete('/brands/:id', ctrl.deleteBrand);

// Grievances
router.get('/grievances', ctrl.getGrievances);
router.put('/grievances/:id', ctrl.updateGrievance);

// Partner Societies
router.get('/partner-societies', ctrl.getPartnerSocieties);
router.post('/partner-societies', ctrl.createPartnerSociety);
router.put('/partner-societies/:id', ctrl.updatePartnerSociety);
router.delete('/partner-societies/:id', ctrl.deletePartnerSociety);
router.get('/partner-societies/:id/commissions', ctrl.getPartnerSocietyCommissions);

// Payout Requests (Admin manages society payout requests)
router.get('/payout-requests', ctrl.getPayoutRequests);
router.put('/payout-requests/:id', ctrl.processPayoutRequest);

// Trusted Societies CMS
router.get('/trusted-societies', ctrl.getTrustedSocieties);
router.put('/trusted-societies', ctrl.updateTrustedSocieties);

export default router;




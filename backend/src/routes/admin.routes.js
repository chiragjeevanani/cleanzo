import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/admin.controller.js';

const router = Router();

router.use(protect, authorize('admin', 'superadmin'));

router.get('/dashboard', ctrl.getDashboard);

router.get('/users', ctrl.getUsers);
router.get('/users/:id', ctrl.getUserById);
router.put('/users/:id', ctrl.updateUser);

router.get('/cleaners', ctrl.getCleaners);
router.post('/cleaners', ctrl.addCleaner);
router.put('/cleaners/:id', ctrl.updateCleaner);

router.get('/packages', ctrl.getAllPackages);
router.post('/packages', ctrl.createPackage);
router.put('/packages/:id', ctrl.updatePackage);

router.get('/subscriptions', ctrl.getAllSubscriptions);

router.get('/revenue', ctrl.getRevenue);

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

export default router;

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import customerRoutes from './customer.routes.js';
import cleanerRoutes from './cleaner.routes.js';
import packageRoutes from './package.routes.js';
import adminRoutes from './admin.routes.js';
import paymentRoutes from './payment.routes.js';
import publicRoutes from './public.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/customer', customerRoutes);
router.use('/cleaner', cleanerRoutes);
router.use('/packages', packageRoutes);
router.use('/admin', adminRoutes);
router.use('/payment', paymentRoutes);
router.use('/public', publicRoutes);

export default router;

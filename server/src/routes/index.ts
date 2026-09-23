import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import customerRoutes from './customerRoutes';
import leadRoutes from './leadRoutes';
import orderRoutes from './orderRoutes';
import paymentRoutes from './paymentRoutes';
import taskRoutes from './taskRoutes';
import dashboardRoutes from './dashboardRoutes';
import auditRoutes from './auditRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
router.use('/leads', leadRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/tasks', taskRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit-logs', auditRoutes);

export default router;

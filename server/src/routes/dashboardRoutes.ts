import { Router } from 'express';
import { getDashboardMetrics } from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/metrics', getDashboardMetrics);

export default router;

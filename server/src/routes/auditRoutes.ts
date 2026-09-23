import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController';
import { authenticate } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';

const router = Router();

router.use(authenticate);
router.get('/', requireRoles('ADMIN', 'MANAGER'), getAuditLogs);

export default router;

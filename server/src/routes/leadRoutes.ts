import { Router } from 'express';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  convertLeadToCustomer,
  deleteLead,
  createLeadSchema,
  updateLeadSchema,
} from '../controllers/leadController';
import { authenticate } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/', getLeads);
router.get('/:id', getLeadById);
router.post('/', validateBody(createLeadSchema), createLead);
router.put('/:id', validateBody(updateLeadSchema), updateLead);
router.post('/:id/convert', convertLeadToCustomer);
router.delete('/:id', requireRoles('ADMIN', 'MANAGER'), deleteLead);

export default router;

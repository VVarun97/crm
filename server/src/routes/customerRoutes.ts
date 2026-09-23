import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  createCustomerSchema,
  updateCustomerSchema,
} from '../controllers/customerController';
import { authenticate } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', validateBody(createCustomerSchema), createCustomer);
router.put('/:id', validateBody(updateCustomerSchema), updateCustomer);
router.delete('/:id', requireRoles('ADMIN', 'MANAGER'), deleteCustomer);

export default router;

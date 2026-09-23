import { Router } from 'express';
import {
  getPayments,
  recordPayment,
  recordPaymentSchema,
} from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/', getPayments);
router.post('/', validateBody(recordPaymentSchema), recordPayment);

export default router;

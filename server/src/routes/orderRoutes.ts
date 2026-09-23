import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  createOrderSchema,
  updateOrderSchema,
} from '../controllers/orderController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/', getOrders);
router.get('/:id', getOrderById);
router.post('/', validateBody(createOrderSchema), createOrder);
router.put('/:id', validateBody(updateOrderSchema), updateOrder);

export default router;

import { Router } from 'express';
import { getUsers } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', getUsers);

export default router;

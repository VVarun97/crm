import { Router } from 'express';
import { login, getMe, logout, loginSchema } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/login', authRateLimiter, validateBody(loginSchema), login);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

export default router;

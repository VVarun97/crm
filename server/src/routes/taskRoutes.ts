import { Router } from 'express';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  createTaskSchema,
  updateTaskSchema,
} from '../controllers/taskController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/', getTasks);
router.post('/', validateBody(createTaskSchema), createTask);
router.put('/:id', validateBody(updateTaskSchema), updateTask);
router.delete('/:id', deleteTask);

export default router;

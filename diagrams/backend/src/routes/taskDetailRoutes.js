import { Router } from 'express';
import {
  getTask,
  updateTask,
  moveTask,
  deleteTask,
  addComment,
} from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';
import { requireWorkspaceMember } from '../middleware/workspaceAccess.js';

const router = Router();

router.use(protect);
router.use('/:taskId', requireWorkspaceMember);

router.route('/:taskId').get(getTask).put(updateTask).delete(deleteTask);
router.patch('/:taskId/move', moveTask);
router.post('/:taskId/comments', addComment);

export default router;

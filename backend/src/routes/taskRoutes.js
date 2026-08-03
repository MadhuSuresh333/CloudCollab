import { Router } from 'express';
import { createTask, getTasks } from '../controllers/taskController.js';
import { requireWorkspaceMember } from '../middleware/workspaceAccess.js';

// mergeParams lets this router read :projectId from the parent router (projectRoutes)
const router = Router({ mergeParams: true });

router.route('/').get(requireWorkspaceMember, getTasks).post(requireWorkspaceMember, createTask);

export default router;

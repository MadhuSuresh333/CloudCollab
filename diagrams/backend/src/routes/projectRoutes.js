import { Router } from 'express';
import { getProject, updateProject, deleteProject } from '../controllers/projectController.js';
import { protect } from '../middleware/auth.js';
import { requireWorkspaceMember, requireWorkspaceRole } from '../middleware/workspaceAccess.js';
import taskRoutes from './taskRoutes.js';

const router = Router();

router.use(protect);

// Nested task routes: /api/projects/:projectId/tasks
router.use('/:projectId/tasks', taskRoutes);

router
  .route('/:projectId')
  .get(requireWorkspaceMember, getProject)
  .put(requireWorkspaceMember, updateProject)
  .delete(requireWorkspaceMember, requireWorkspaceRole('owner', 'admin'), deleteProject);

export default router;

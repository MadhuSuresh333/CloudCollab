import { Router } from 'express';
import {
  createWorkspace,
  getWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  inviteMember,
  removeMember,
  updateMemberRole,
} from '../controllers/workspaceController.js';
import { protect } from '../middleware/auth.js';
import { requireWorkspaceMember, requireWorkspaceRole } from '../middleware/workspaceAccess.js';
import { createProject, getProjects } from '../controllers/projectController.js';

const router = Router();

router.use(protect);

router.route('/').get(getWorkspaces).post(createWorkspace);

router
  .route('/:workspaceId')
  .get(requireWorkspaceMember, getWorkspace)
  .put(requireWorkspaceMember, requireWorkspaceRole('owner', 'admin'), updateWorkspace)
  .delete(requireWorkspaceMember, requireWorkspaceRole('owner'), deleteWorkspace);

router
  .route('/:workspaceId/members')
  .post(requireWorkspaceMember, requireWorkspaceRole('owner', 'admin'), inviteMember);

router
  .route('/:workspaceId/members/:userId')
  .delete(requireWorkspaceMember, requireWorkspaceRole('owner', 'admin'), removeMember)
  .put(requireWorkspaceMember, requireWorkspaceRole('owner'), updateMemberRole);

router
  .route('/:workspaceId/projects')
  .get(requireWorkspaceMember, getProjects)
  .post(requireWorkspaceMember, createProject);

export default router;

import Workspace from '../models/Workspace.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';

/**
 * Loads the workspace referenced by req.params.workspaceId (or a project's
 * workspace, via req.params.projectId) and ensures req.user is a member.
 * Attaches `req.workspace` and `req.memberRole` for downstream handlers.
 */
export const requireWorkspaceMember = async (req, res, next) => {
  try {
    let workspaceId = req.params.workspaceId;

    // Allow resolving the workspace indirectly through a project id,
    // e.g. routes nested under /projects/:projectId/tasks
    if (!workspaceId && req.params.projectId) {
      const project = await Project.findById(req.params.projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }
      workspaceId = project.workspace.toString();
      req.project = project;
    }

    // Allow resolving the workspace indirectly through a task id,
    // e.g. routes mounted at /api/tasks/:taskId
    if (!workspaceId && req.params.taskId) {
      const task = await Task.findById(req.params.taskId).populate('project');
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      workspaceId = task.project.workspace.toString();
      req.task = task;
    }

    if (!workspaceId) {
      return res.status(400).json({ success: false, message: 'Workspace could not be resolved' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    const membership = workspace.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this workspace',
      });
    }

    req.workspace = workspace;
    req.memberRole = membership.role;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restricts access to specific workspace roles (e.g. 'owner', 'admin').
 * Must run after requireWorkspaceMember.
 */
export const requireWorkspaceRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.memberRole)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.memberRole}' is not permitted to perform this action`,
      });
    }
    next();
  };
};

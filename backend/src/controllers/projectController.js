import * as projectService from '../services/projectService.js';

/**
 * @desc    Create a project inside a workspace
 * @route   POST /api/workspaces/:workspaceId/projects
 * @access  Private (workspace member)
 */
export const createProject = async (req, res, next) => {
  try {
    const { name, description, dueDate } = req.body;
    const project = await projectService.createProject({
      name,
      description,
      dueDate,
      workspaceId: req.params.workspaceId,
      userId: req.user._id,
    });
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all projects in a workspace
 * @route   GET /api/workspaces/:workspaceId/projects
 * @access  Private (workspace member)
 */
export const getProjects = async (req, res, next) => {
  try {
    const projects = await projectService.getWorkspaceProjects(req.params.workspaceId);
    res.status(200).json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single project (with task stats)
 * @route   GET /api/projects/:projectId
 * @access  Private (workspace member)
 */
export const getProject = async (req, res, next) => {
  try {
    const project = await projectService.getProjectById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const stats = await projectService.getProjectStats(req.params.projectId);
    res.status(200).json({ success: true, data: { ...project.toObject(), stats } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a project
 * @route   PUT /api/projects/:projectId
 * @access  Private (workspace member)
 */
export const updateProject = async (req, res, next) => {
  try {
    const project = await projectService.updateProject(req.params.projectId, req.body);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a project (and its tasks)
 * @route   DELETE /api/projects/:projectId
 * @access  Private (workspace admin/owner)
 */
export const deleteProject = async (req, res, next) => {
  try {
    await projectService.deleteProject(req.params.projectId);
    res.status(200).json({ success: true, message: 'Project deleted' });
  } catch (error) {
    next(error);
  }
};

import * as workspaceService from '../services/workspaceService.js';

/**
 * @desc    Create a new workspace
 * @route   POST /api/workspaces
 * @access  Private
 */
export const createWorkspace = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const workspace = await workspaceService.createWorkspace({
      name,
      description,
      ownerId: req.user._id,
    });

    res.status(201).json({ success: true, data: workspace });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all workspaces the current user belongs to
 * @route   GET /api/workspaces
 * @access  Private
 */
export const getWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await workspaceService.getUserWorkspaces(req.user._id);
    res.status(200).json({ success: true, count: workspaces.length, data: workspaces });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single workspace
 * @route   GET /api/workspaces/:workspaceId
 * @access  Private (member only)
 */
export const getWorkspace = async (req, res, next) => {
  try {
    // req.workspace is already loaded + membership-checked by middleware
    res.status(200).json({ success: true, data: req.workspace });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update workspace details
 * @route   PUT /api/workspaces/:workspaceId
 * @access  Private (owner/admin only)
 */
export const updateWorkspace = async (req, res, next) => {
  try {
    const workspace = await workspaceService.updateWorkspace(req.params.workspaceId, req.body);
    res.status(200).json({ success: true, data: workspace });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a workspace
 * @route   DELETE /api/workspaces/:workspaceId
 * @access  Private (owner only)
 */
export const deleteWorkspace = async (req, res, next) => {
  try {
    await workspaceService.deleteWorkspace(req.params.workspaceId);
    res.status(200).json({ success: true, message: 'Workspace deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Invite a member to the workspace by email
 * @route   POST /api/workspaces/:workspaceId/members
 * @access  Private (owner/admin only)
 */
export const inviteMember = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const workspace = await workspaceService.inviteMemberByEmail(
      req.params.workspaceId,
      email,
      role
    );
    res.status(200).json({ success: true, data: workspace });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove a member from the workspace
 * @route   DELETE /api/workspaces/:workspaceId/members/:userId
 * @access  Private (owner/admin only)
 */
export const removeMember = async (req, res, next) => {
  try {
    const workspace = await workspaceService.removeMember(
      req.params.workspaceId,
      req.params.userId
    );
    res.status(200).json({ success: true, data: workspace });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a member's role
 * @route   PUT /api/workspaces/:workspaceId/members/:userId
 * @access  Private (owner only)
 */
export const updateMemberRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const workspace = await workspaceService.updateMemberRole(
      req.params.workspaceId,
      req.params.userId,
      role
    );
    res.status(200).json({ success: true, data: workspace });
  } catch (error) {
    next(error);
  }
};

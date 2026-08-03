import Workspace from '../models/Workspace.js';
import User from '../models/User.js';

export const createWorkspace = async ({ name, description, ownerId }) => {
  const workspace = await Workspace.create({
    name,
    description,
    owner: ownerId,
    members: [{ user: ownerId, role: 'owner' }],
  });
  return workspace.populate('members.user', 'name email avatar');
};

export const getUserWorkspaces = async (userId) => {
  return Workspace.find({ 'members.user': userId })
    .populate('members.user', 'name email avatar')
    .sort({ updatedAt: -1 });
};

export const getWorkspaceById = async (workspaceId) => {
  return Workspace.findById(workspaceId).populate('members.user', 'name email avatar');
};

export const updateWorkspace = async (workspaceId, updateData) => {
  const allowed = (({ name, description }) => ({ name, description }))(updateData);
  return Workspace.findByIdAndUpdate(workspaceId, allowed, {
    new: true,
    runValidators: true,
  }).populate('members.user', 'name email avatar');
};

export const deleteWorkspace = async (workspaceId) => {
  await Workspace.findByIdAndDelete(workspaceId);
};

export const inviteMemberByEmail = async (workspaceId, email, role = 'member') => {
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error('No user found with that email');
    err.statusCode = 404;
    throw err;
  }

  const workspace = await Workspace.findById(workspaceId);
  const alreadyMember = workspace.members.some((m) => m.user.toString() === user._id.toString());
  if (alreadyMember) {
    const err = new Error('User is already a member of this workspace');
    err.statusCode = 400;
    throw err;
  }

  workspace.members.push({ user: user._id, role });
  await workspace.save();
  return workspace.populate('members.user', 'name email avatar');
};

export const removeMember = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId);
  workspace.members = workspace.members.filter((m) => m.user.toString() !== userId);
  await workspace.save();
  return workspace.populate('members.user', 'name email avatar');
};

export const updateMemberRole = async (workspaceId, userId, role) => {
  const workspace = await Workspace.findById(workspaceId);
  const membership = workspace.members.find((m) => m.user.toString() === userId);
  if (!membership) {
    const err = new Error('User is not a member of this workspace');
    err.statusCode = 404;
    throw err;
  }
  membership.role = role;
  await workspace.save();
  return workspace.populate('members.user', 'name email avatar');
};

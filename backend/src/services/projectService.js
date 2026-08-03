import Project from '../models/Project.js';
import Task from '../models/Task.js';

export const createProject = async ({ name, description, workspaceId, dueDate, userId }) => {
  const project = await Project.create({
    name,
    description,
    workspace: workspaceId,
    dueDate: dueDate || null,
    members: [userId],
    createdBy: userId,
  });
  return project.populate('members', 'name email avatar');
};

export const getWorkspaceProjects = async (workspaceId) => {
  return Project.find({ workspace: workspaceId })
    .populate('members', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .sort({ createdAt: -1 });
};

export const getProjectById = async (projectId) => {
  return Project.findById(projectId)
    .populate('members', 'name email avatar')
    .populate('createdBy', 'name email avatar');
};

export const updateProject = async (projectId, updateData) => {
  const allowed = (({ name, description, status, dueDate, members }) => ({
    name,
    description,
    status,
    dueDate,
    members,
  }))(updateData);

  Object.keys(allowed).forEach((key) => allowed[key] === undefined && delete allowed[key]);

  return Project.findByIdAndUpdate(projectId, allowed, {
    new: true,
    runValidators: true,
  }).populate('members', 'name email avatar');
};

export const deleteProject = async (projectId) => {
  // Cascade delete tasks belonging to this project
  await Task.deleteMany({ project: projectId });
  await Project.findByIdAndDelete(projectId);
};

export const getProjectStats = async (projectId) => {
  const tasks = await Task.find({ project: projectId }).select('status');
  const stats = { todo: 0, 'in-progress': 0, review: 0, done: 0, total: tasks.length };
  tasks.forEach((t) => {
    stats[t.status] = (stats[t.status] || 0) + 1;
  });
  return stats;
};

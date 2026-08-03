import Task from '../models/Task.js';

export const createTask = async ({
  title,
  description,
  projectId,
  status,
  priority,
  dueDate,
  labels,
  assignees,
  userId,
}) => {
  // Place new task at the end of its column
  const lastTask = await Task.findOne({ project: projectId, status: status || 'todo' }).sort({
    position: -1,
  });
  const position = lastTask ? lastTask.position + 1 : 0;

  const task = await Task.create({
    title,
    description,
    project: projectId,
    status: status || 'todo',
    priority,
    dueDate: dueDate || null,
    labels,
    assignees,
    position,
    createdBy: userId,
  });

  return task.populate('assignees', 'name email avatar');
};

export const getProjectTasks = async (projectId) => {
  return Task.find({ project: projectId })
    .populate('assignees', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .sort({ status: 1, position: 1 });
};

export const getTaskById = async (taskId) => {
  return Task.findById(taskId)
    .populate('assignees', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('comments.user', 'name email avatar');
};

export const updateTask = async (taskId, updateData) => {
  const allowed = (({
    title,
    description,
    status,
    priority,
    dueDate,
    labels,
    assignees,
    position,
  }) => ({ title, description, status, priority, dueDate, labels, assignees, position }))(
    updateData
  );

  Object.keys(allowed).forEach((key) => allowed[key] === undefined && delete allowed[key]);

  return Task.findByIdAndUpdate(taskId, allowed, {
    new: true,
    runValidators: true,
  })
    .populate('assignees', 'name email avatar')
    .populate('createdBy', 'name email avatar');
};

/**
 * Move a task to a new status/position, e.g. after a drag-and-drop.
 */
export const moveTask = async (taskId, status, position) => {
  return Task.findByIdAndUpdate(
    taskId,
    { status, position },
    { new: true, runValidators: true }
  ).populate('assignees', 'name email avatar');
};

export const deleteTask = async (taskId) => {
  await Task.findByIdAndDelete(taskId);
};

export const addComment = async (taskId, userId, text) => {
  const task = await Task.findByIdAndUpdate(
    taskId,
    { $push: { comments: { user: userId, text } } },
    { new: true, runValidators: true }
  ).populate('comments.user', 'name email avatar');
  return task;
};

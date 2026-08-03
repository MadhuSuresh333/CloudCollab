import * as taskService from '../services/taskService.js';
import { getIO } from '../config/socket.js';

/**
 * @desc    Create a task in a project
 * @route   POST /api/projects/:projectId/tasks
 * @access  Private (workspace member)
 */
export const createTask = async (req, res, next) => {
  try {
    const task = await taskService.createTask({
      ...req.body,
      projectId: req.params.projectId,
      userId: req.user._id,
    });

    getIO().to(`project:${req.params.projectId}`).emit('task:created', task);

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all tasks for a project (kanban board data)
 * @route   GET /api/projects/:projectId/tasks
 * @access  Private (workspace member)
 */
export const getTasks = async (req, res, next) => {
  try {
    const tasks = await taskService.getProjectTasks(req.params.projectId);
    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single task
 * @route   GET /api/tasks/:taskId
 * @access  Private (workspace member)
 */
export const getTask = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a task
 * @route   PUT /api/tasks/:taskId
 * @access  Private (workspace member)
 */
export const updateTask = async (req, res, next) => {
  try {
    const task = await taskService.updateTask(req.params.taskId, req.body);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    getIO().to(`project:${task.project}`).emit('task:updated', task);

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Move a task between columns / reorder (drag-and-drop)
 * @route   PATCH /api/tasks/:taskId/move
 * @access  Private (workspace member)
 */
export const moveTask = async (req, res, next) => {
  try {
    const { status, position } = req.body;
    const task = await taskService.moveTask(req.params.taskId, status, position);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    getIO().to(`project:${task.project}`).emit('task:moved', task);

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a task
 * @route   DELETE /api/tasks/:taskId
 * @access  Private (workspace member)
 */
export const deleteTask = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    await taskService.deleteTask(req.params.taskId);

    getIO().to(`project:${task.project}`).emit('task:deleted', { _id: req.params.taskId });

    res.status(200).json({ success: true, message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a comment to a task
 * @route   POST /api/tasks/:taskId/comments
 * @access  Private (workspace member)
 */
export const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    const task = await taskService.addComment(req.params.taskId, req.user._id, text);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    getIO().to(`project:${task.project}`).emit('task:comment', task);

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

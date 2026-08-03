import api from './api.js';

export const listTasks = (projectId) => api.get(`/projects/${projectId}/tasks`);
export const createTask = (projectId, payload) =>
  api.post(`/projects/${projectId}/tasks`, payload);
export const getTask = (taskId) => api.get(`/tasks/${taskId}`);
export const updateTask = (taskId, payload) => api.put(`/tasks/${taskId}`, payload);
export const moveTask = (taskId, status, position) =>
  api.patch(`/tasks/${taskId}/move`, { status, position });
export const deleteTask = (taskId) => api.delete(`/tasks/${taskId}`);
export const addComment = (taskId, text) => api.post(`/tasks/${taskId}/comments`, { text });

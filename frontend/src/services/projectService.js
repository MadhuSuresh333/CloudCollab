import api from './api.js';

export const listProjects = (workspaceId) => api.get(`/workspaces/${workspaceId}/projects`);
export const createProject = (workspaceId, payload) =>
  api.post(`/workspaces/${workspaceId}/projects`, payload);
export const getProject = (projectId) => api.get(`/projects/${projectId}`);
export const updateProject = (projectId, payload) => api.put(`/projects/${projectId}`, payload);
export const deleteProject = (projectId) => api.delete(`/projects/${projectId}`);

import api from './api.js';

export const listWorkspaces = () => api.get('/workspaces');
export const getWorkspace = (workspaceId) => api.get(`/workspaces/${workspaceId}`);
export const createWorkspace = (payload) => api.post('/workspaces', payload);
export const updateWorkspace = (workspaceId, payload) =>
  api.put(`/workspaces/${workspaceId}`, payload);
export const deleteWorkspace = (workspaceId) => api.delete(`/workspaces/${workspaceId}`);
export const inviteMember = (workspaceId, payload) =>
  api.post(`/workspaces/${workspaceId}/members`, payload);
export const removeMember = (workspaceId, userId) =>
  api.delete(`/workspaces/${workspaceId}/members/${userId}`);
export const updateMemberRole = (workspaceId, userId, role) =>
  api.put(`/workspaces/${workspaceId}/members/${userId}`, { role });

import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Users API
export const usersAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/me', data),
};

// Workspaces API
export const workspacesAPI = {
  create: (data) => api.post('/workspaces', data),
  getAll: () => api.get('/workspaces'),
  getById: (id) => api.get(`/workspaces/${id}`),
  update: (id, data) => api.put(`/workspaces/${id}`, data),
  delete: (id) => api.delete(`/workspaces/${id}`),
  inviteMember: (id, data) => api.post(`/workspaces/${id}/members`, data),
  getMembers: (id) => api.get(`/workspaces/${id}/members`),
  removeMember: (workspaceId, userId) => api.delete(`/workspaces/${workspaceId}/members/${userId}`),
};

// Documents API
export const documentsAPI = {
  create: (workspaceId, data) => api.post(`/workspaces/${workspaceId}/documents`, data),
  getAll: (workspaceId) => api.get(`/workspaces/${workspaceId}/documents`),
  getById: (id) => api.get(`/documents/${id}`),
  update: (id, data) => api.put(`/documents/${id}`, data),
  delete: (id) => api.delete(`/documents/${id}`),
};

// Files API
export const filesAPI = {
  upload: (workspaceId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/workspaces/${workspaceId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getAll: (workspaceId) => api.get(`/workspaces/${workspaceId}/files`),
  delete: (id) => api.delete(`/files/${id}`),
};

// Projects API
export const projectsAPI = {
  create: (workspaceId, data) => api.post(`/workspaces/${workspaceId}/projects`, data),
  getAll: (workspaceId) => api.get(`/workspaces/${workspaceId}/projects`),
  getById: (id) => api.get(`/projects/${id}`),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

// Tasks API
export const tasksAPI = {
  create: (projectId, data) => api.post(`/projects/${projectId}/tasks`, data),
  getAll: (projectId) => api.get(`/projects/${projectId}/tasks`),
  getById: (id) => api.get(`/tasks/${id}`),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
};

export default api;

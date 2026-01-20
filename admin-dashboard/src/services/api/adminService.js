/**
 * Admin API Service
 * Wraps admin-specific API endpoints
 */
import api from './apiClient';

/**
 * Projects API
 */
export const projectsApi = {
  list: () => api.get('/admin/api/projects'),
  create: (projectData) => api.post('/admin/api/projects', projectData),
  delete: (projectId) => api.del(`/admin/api/projects/${projectId}`),
};

/**
 * Users API
 */
export const usersApi = {
  list: () => api.get('/admin/api/users'),
  getById: (userId) => api.get(`/admin/api/users/${userId}`),
};

/**
 * Saves API
 */
export const savesApi = {
  list: () => api.get('/admin/api/saves'),
  getById: (saveId) => api.get(`/admin/api/saves/${saveId}`),
};

/**
 * Inventory API
 */
export const inventoryApi = {
  list: () => api.get('/admin/api/inventories'),
};

/**
 * Progress API
 */
export const progressApi = {
  list: () => api.get('/admin/api/progress'),
};

/**
 * Export API
 */
export const exportApi = {
  users: () => api.downloadFile('/admin/api/export/users', `users-export-${Date.now()}.json`),
  saves: () => api.downloadFile('/admin/api/export/saves', `saves-export-${Date.now()}.json`),
  inventories: () => api.downloadFile('/admin/api/export/inventories', `inventories-export-${Date.now()}.json`),
  progress: () => api.downloadFile('/admin/api/export/progress', `progress-export-${Date.now()}.json`),
  achievements: () => api.downloadFile('/admin/api/export/achievements', `achievements-export-${Date.now()}.json`),
  all: () => api.downloadFile('/admin/api/export/all', `complete-export-${Date.now()}.json`),
};

/**
 * Docs API
 */
export const docsApi = {
  get: (filename) => api.get(`/admin/api/docs/${filename}`),
};

export default {
  projects: projectsApi,
  users: usersApi,
  saves: savesApi,
  inventory: inventoryApi,
  progress: progressApi,
  export: exportApi,
  docs: docsApi,
};

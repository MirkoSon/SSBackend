/**
 * User API Service
 * Handles all API calls related to user management
 */

const API_BASE = '/admin/api';

/**
 * Helper to get project-scoped API path
 * @param {string} path - Original API path
 * @returns {string} Project-scoped path
 */
const getProjectPath = (path) => {
    const projectId = localStorage.getItem('ssbackend_current_project');
    if (projectId && projectId !== 'default') {
        // Avoid doubling prefix if already present
        if (path.startsWith('/project/')) return path;

        // Ensure path starts with slash
        const p = path.startsWith('/') ? path : `/${path}`;
        return `/project/${projectId}${p}`;
    }
    return path;
};

/**
 * User Service API
 */
export const userService = {
    /**
     * Get all users
     * @returns {Promise<{users: Array, count: number}>}
     */
    async getAll() {
        const response = await fetch(getProjectPath(`${API_BASE}/users`));
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to fetch users' }));
            throw new Error(error.error || 'Failed to fetch users');
        }
        return response.json();
    },

    /**
     * Get user by ID
     * @param {number} userId - User ID
     * @returns {Promise<{user: Object}>}
     */
    async getById(userId) {
        const response = await fetch(getProjectPath(`${API_BASE}/users/${userId}`));
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to fetch user' }));
            throw new Error(error.error || 'Failed to fetch user');
        }
        return response.json();
    },

    /**
     * Delete user by ID
     * @param {number} userId - User ID
     * @returns {Promise<{success: boolean}>}
     */
    async delete(userId) {
        const response = await fetch(getProjectPath(`${API_BASE}/users/${userId}`), {
            method: 'DELETE',
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to delete user' }));
            throw new Error(error.error || 'Failed to delete user');
        }
        return response.json();
    },
};

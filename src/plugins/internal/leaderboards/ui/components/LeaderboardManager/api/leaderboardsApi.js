export const leaderboardsApi = {
    /**
     * List all leaderboards
     */
    async listLeaderboards() {
        const response = await fetch('/admin/api/plugins/leaderboards/boards');
        if (!response.ok) throw new Error('Failed to fetch leaderboards');
        return await response.json();
    },

    /**
     * Create a new leaderboard
     */
    async createLeaderboard(data) {
        const response = await fetch('/admin/api/plugins/leaderboards/boards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create leaderboard');
        return await response.json();
    },

    /**
     * Update an existing leaderboard
     */
    async updateLeaderboard(id, data) {
        const response = await fetch(`/admin/api/plugins/leaderboards/boards/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update leaderboard');
        return await response.json();
    },

    /**
     * Delete a leaderboard
     */
    async deleteLeaderboard(id) {
        const response = await fetch(`/admin/api/plugins/leaderboards/boards/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete leaderboard');
        return await response.json();
    },

    /**
     * Get rankings for a specific leaderboard (Admin version)
     */
    async getAdminRankings(boardId, limit = 50, offset = 0) {
        const response = await fetch(`/admin/api/plugins/leaderboards/boards/${boardId}/rankings?limit=${limit}&offset=${offset}`);
        if (!response.ok) throw new Error('Failed to fetch admin rankings');
        return await response.json();
    },

    /**
     * Delete a specific ranking entry
     */
    async deleteRankingEntry(boardId, userId) {
        const response = await fetch(`/admin/api/plugins/leaderboards/boards/${boardId}/rankings/${userId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete ranking entry');
        return await response.json();
    },

    /**
     * Get rankings for a specific leaderboard (Public version)
     */
    async getRankings(boardId, limit = 50, offset = 0) {
        const response = await fetch(`/leaderboards/${boardId}/rankings?limit=${limit}&offset=${offset}`);
        if (!response.ok) throw new Error('Failed to fetch rankings');
        return await response.json();
    }
};

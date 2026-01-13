const express = require('express');

/**
 * Leaderboards Admin Routes
 * Provides endpoints for administrative management of leaderboards
 */
module.exports = (db) => {
    const router = express.Router();

    // Use a context-like object for consistency with other plugins
    const LeaderboardService = require('../../services/LeaderboardService');
    const leaderboardService = new LeaderboardService(db);

    /**
     * GET /admin/api/plugins/leaderboards/boards
     * List all leaderboards
     */
    router.get('/boards', async (req, res) => {
        try {
            const boards = await leaderboardService.listLeaderboards();
            res.json({ success: true, leaderboards: boards });
        } catch (error) {
            console.error('Error listing leaderboards:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /admin/api/plugins/leaderboards/stats
     * Get global leaderboard statistics
     */
    router.get('/stats', async (req, res) => {
        try {
            const stats = await leaderboardService.getLeaderboardStats();
            res.json({ success: true, stats });
        } catch (error) {
            console.error('Error getting leaderboard stats:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /admin/api/plugins/leaderboards/boards
     * Create a new leaderboard
     */
    router.post('/boards', async (req, res) => {
        try {
            const boardId = await leaderboardService.createLeaderboard(req.body);
            res.json({ success: true, id: boardId, message: 'Leaderboard created successfully' });
        } catch (error) {
            console.error('Error creating leaderboard:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /admin/api/plugins/leaderboards/boards/:id
     * Update an existing leaderboard
     */
    router.put('/boards/:id', async (req, res) => {
        try {
            const board = await leaderboardService.updateLeaderboard(req.params.id, req.body);
            res.json({ success: true, board, message: 'Leaderboard updated successfully' });
        } catch (error) {
            console.error('Error updating leaderboard:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /admin/api/plugins/leaderboards/boards/:id
     * Delete a leaderboard
     */
    router.delete('/boards/:id', async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM plugin_leaderboards WHERE id = ?', [id], function (err) {
                    if (err) reject(err);
                    else resolve();
                });
            });
            res.json({ success: true, message: 'Leaderboard deleted successfully' });
        } catch (error) {
            console.error('Error deleting leaderboard:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /admin/api/plugins/leaderboards/boards/:id/rankings
     * Get rankings for a specific leaderboard
     */
    router.get('/boards/:id/rankings', async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
            const result = await leaderboardService.getRankings(req.params.id, { limit, offset });
            res.json({ success: true, ...result });
        } catch (error) {
            console.error('Error fetching admin rankings:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /admin/api/plugins/leaderboards/boards/:id/rankings/:userId
     * Delete a specific ranking entry
     */
    router.delete('/boards/:id/rankings/:userId', async (req, res) => {
        try {
            await leaderboardService.deleteEntry(req.params.id, req.params.userId);
            res.json({ success: true, message: 'Ranking entry deleted successfully' });
        } catch (error) {
            console.error('Error deleting ranking entry:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};

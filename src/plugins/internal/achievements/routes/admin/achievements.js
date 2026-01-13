const express = require('express');
const router = express.Router();

module.exports = (db) => {

    // Admin authentication middleware
    const adminAuth = (req, res, next) => {
        const adminSession = req.session?.adminAuthenticated;
        if (!adminSession) {
            // Development bypass
            if (process.env.NODE_ENV !== 'production' && (req.headers['x-cli-request'] || req.headers['user-agent']?.includes('CLI'))) {
                return next();
            }
            return res.status(401).json({ error: 'Admin authentication required' });
        }
        next();
    };

    router.use(adminAuth);

    /**
     * GET / - List all achievements
     */
    router.get('/', (req, res) => {
        db.all('SELECT * FROM plugin_achievements ORDER BY created_at DESC', [], (err, rows) => {
            if (err) {
                console.error('Error fetching achievements:', err);
                return res.status(500).json({ error: 'Failed to fetch achievements' });
            }
            res.json(rows);
        });
    });

    /**
     * POST / - Create new achievement
     */
    router.post('/', (req, res) => {
        const { code, name, description, type, metric_name, target, is_active, season_id } = req.body;

        if (!code || !name || !description || !type || !target) {
            return res.status(400).json({ error: 'Missing required fields (code, name, description, type, target)' });
        }

        const query = `
      INSERT INTO plugin_achievements (code, name, description, type, metric_name, target, is_active, season_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const params = [code, name, description, type, metric_name, target, is_active ? 1 : 0, season_id || null];

        db.run(query, params, function (err) {
            if (err) {
                console.error('Error creating achievement:', err);
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: 'Achievement code or name must be unique' });
                }
                return res.status(500).json({ error: 'Failed to create achievement' });
            }
            res.json({
                id: this.lastID,
                code,
                name,
                description,
                type,
                metric_name,
                target,
                is_active,
                season_id
            });
        });
    });

    /**
     * PUT /:id - Update achievement
     */
    router.put('/:id', (req, res) => {
        const { id } = req.params;
        const { code, name, description, type, metric_name, target, is_active, season_id } = req.body;

        if (!code || !name || !description || !type || !target) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const query = `
      UPDATE plugin_achievements 
      SET code = ?, name = ?, description = ?, type = ?, metric_name = ?, target = ?, is_active = ?, season_id = ?
      WHERE id = ?
    `;

        const params = [code, name, description, type, metric_name, target, is_active ? 1 : 0, season_id || null, id];

        db.run(query, params, function (err) {
            if (err) {
                console.error('Error updating achievement:', err);
                return res.status(500).json({ error: 'Failed to update achievement' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Achievement not found' });
            }
            res.json({
                id,
                code,
                name,
                description,
                type,
                metric_name,
                target,
                is_active,
                season_id
            });
        });
    });

    /**
     * DELETE /:id - Delete achievement
     */
    router.delete('/:id', (req, res) => {
        const { id } = req.params;

        db.run('DELETE FROM plugin_achievements WHERE id = ?', [id], function (err) {
            if (err) {
                console.error('Error deleting achievement:', err);
                return res.status(500).json({ error: 'Failed to delete achievement' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Achievement not found' });
            }
            res.json({ success: true });
        });
    });

    return router;
};

const express = require('express');
const router = express.Router();

module.exports = (db) => {

    // Admin authentication middleware (Copied from achievements.js for consistency)
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
     * GET / - List users with achievement stats
     */
    router.get('/', (req, res) => {
        const query = `
            SELECT 
                u.id, 
                u.username, 
                COUNT(*) as total_progress_records,
                SUM(CASE WHEN pua.state = 'unlocked' THEN 1 ELSE 0 END) as unlocked_count,
                MAX(pua.updated_at) as last_updated
            FROM users u
            JOIN plugin_user_achievements pua ON u.id = pua.user_id
            GROUP BY u.id
            ORDER BY last_updated DESC
        `;

        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Error fetching user progress:', err);
                return res.status(500).json({ error: 'Failed to fetch user progress' });
            }
            res.json(rows);
        });
    });

    /**
     * GET /:userId - Get detailed achievements for a user
     */
    router.get('/:userId', (req, res) => {
        const { userId } = req.params;

        const query = `
            SELECT 
                pa.id,
                pa.code,
                pa.name,
                pa.target,
                pua.state,
                pua.progress,
                pua.unlocked_at,
                pua.updated_at
            FROM plugin_achievements pa
            LEFT JOIN plugin_user_achievements pua ON pa.id = pua.achievement_id AND pua.user_id = ?
            WHERE pa.is_active = 1
            ORDER BY pua.unlocked_at DESC, pa.name ASC
        `;

        db.all(query, [userId], (err, rows) => {
            if (err) {
                console.error('Error fetching user details:', err);
                return res.status(500).json({ error: 'Failed to fetch user details' });
            }
            res.json(rows);
        });
    });

    return router;
};

/**
 * Achievements Plugin - Initial Schema Migration
 * 
 * Creates the core tables for the Achievements plugin:
 * - plugin_achievements: Achievement definitions
 * - plugin_user_achievements: User achievement progress and unlocks
 */

module.exports = {
    version: 1,
    name: 'initial_schema',
    description: 'Create achievements plugin tables',

    async up(db) {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                // Create plugin_achievements table
                db.run(`
          CREATE TABLE IF NOT EXISTS plugin_achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            type TEXT NOT NULL,
            metric_name TEXT,
            target INTEGER NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            season_id TEXT,
            version INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
                    if (err) {
                        console.error('Failed to create plugin_achievements table:', err);
                        return reject(err);
                    }
                });

                // Create plugin_user_achievements table
                db.run(`
          CREATE TABLE IF NOT EXISTS plugin_user_achievements (
            user_id INTEGER,
            achievement_id INTEGER,
            state TEXT NOT NULL DEFAULT 'locked',
            progress INTEGER DEFAULT 0,
            progress_data TEXT,
            unlocked_at DATETIME,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, achievement_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (achievement_id) REFERENCES plugin_achievements(id) ON DELETE CASCADE
          )
        `, (err) => {
                    if (err) {
                        console.error('Failed to create plugin_user_achievements table:', err);
                        return reject(err);
                    }
                    resolve();
                });
            });
        });
    },

    async down(db) {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                // Drop tables in reverse order (respecting foreign keys)
                db.run('DROP TABLE IF EXISTS plugin_user_achievements;', (err) => {
                    if (err) return reject(err);
                });

                db.run('DROP TABLE IF EXISTS plugin_achievements;', (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        });
    }
};

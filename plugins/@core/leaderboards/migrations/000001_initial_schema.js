/**
 * Leaderboards Plugin - Initial Schema Migration
 * 
 * Creates the core tables for the Leaderboards plugin:
 * - plugin_leaderboards: Leaderboard definitions
 * - plugin_leaderboard_entries: User scores and rankings
 * 
 * Also creates performance indexes for efficient ranking queries.
 */

module.exports = {
    version: 1,
    name: 'initial_schema',
    description: 'Create leaderboards plugin tables and indexes',

    async up(db) {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                // Create plugin_leaderboards table
                db.run(`
          CREATE TABLE IF NOT EXISTS plugin_leaderboards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            type VARCHAR(50) NOT NULL DEFAULT 'all_time',
            game_mode VARCHAR(100),
            sort_order VARCHAR(10) NOT NULL DEFAULT 'DESC',
            max_entries INTEGER DEFAULT 10000,
            reset_schedule VARCHAR(50),
            last_reset DATETIME,
            next_reset DATETIME,
            metadata TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(name, game_mode)
          );
        `, (err) => {
                    if (err) {
                        console.error('Failed to create plugin_leaderboards table:', err);
                        return reject(err);
                    }
                });

                // Create plugin_leaderboard_entries table
                db.run(`
          CREATE TABLE IF NOT EXISTS plugin_leaderboard_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            leaderboard_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            score REAL NOT NULL,
            rank_position INTEGER,
            metadata TEXT,
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (leaderboard_id) REFERENCES plugin_leaderboards(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(leaderboard_id, user_id)
          );
        `, (err) => {
                    if (err) {
                        console.error('Failed to create plugin_leaderboard_entries table:', err);
                        return reject(err);
                    }
                });

                // Create indexes for performance optimization
                const indexes = [
                    'CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_score ON plugin_leaderboard_entries(leaderboard_id, score DESC, submitted_at ASC);',
                    'CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user ON plugin_leaderboard_entries(user_id);',
                    'CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_rank ON plugin_leaderboard_entries(leaderboard_id, rank_position);',
                    'CREATE INDEX IF NOT EXISTS idx_leaderboards_type ON plugin_leaderboards(type, is_active);',
                    'CREATE INDEX IF NOT EXISTS idx_leaderboards_reset ON plugin_leaderboards(next_reset) WHERE next_reset IS NOT NULL;'
                ];

                indexes.forEach((indexSql, i) => {
                    db.run(indexSql, (err) => {
                        if (err) {
                            console.error(`Failed to create index ${i}:`, err);
                            return reject(err);
                        }

                        // Resolve after last index
                        if (i === indexes.length - 1) {
                            resolve();
                        }
                    });
                });
            });
        });
    },

    async down(db) {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                // Drop indexes first
                const dropIndexes = [
                    'DROP INDEX IF EXISTS idx_leaderboard_entries_score;',
                    'DROP INDEX IF EXISTS idx_leaderboard_entries_user;',
                    'DROP INDEX IF EXISTS idx_leaderboard_entries_rank;',
                    'DROP INDEX IF EXISTS idx_leaderboards_type;',
                    'DROP INDEX IF EXISTS idx_leaderboards_reset;'
                ];

                dropIndexes.forEach(sql => {
                    db.run(sql, (err) => {
                        if (err) console.error('Failed to drop index:', err);
                    });
                });

                // Drop tables in reverse order (respecting foreign keys)
                db.run('DROP TABLE IF EXISTS plugin_leaderboard_entries;', (err) => {
                    if (err) return reject(err);
                });

                db.run('DROP TABLE IF EXISTS plugin_leaderboards;', (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        });
    }
};

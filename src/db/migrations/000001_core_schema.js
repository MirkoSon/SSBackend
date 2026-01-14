/**
 * Migration 000001: Initial Core Schema
 *
 * Creates core tables for SSBackend:
 * - users: User authentication and session tracking
 * - saves: Game save data
 * - inventory: User inventory items
 * - character_progress: User progress metrics
 * - achievements: Achievement definitions
 * - user_achievements: User achievement unlocks
 */

module.exports = {
  version: 1,
  name: 'core_schema',
  description: 'Create initial core tables (users, saves, inventory, progress, achievements)',

  /**
   * Apply migration
   */
  async up(db) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Create saves table
        db.exec(`
          CREATE TABLE IF NOT EXISTS saves (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('Failed to create saves table:', err.message);
            return reject(err);
          }
        });

        // Create users table
        db.exec(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME,
            login_count INTEGER DEFAULT 0
          )
        `, (err) => {
          if (err) {
            console.error('Failed to create users table:', err.message);
            return reject(err);
          }
        });

        // Create inventory table
        db.exec(`
          CREATE TABLE IF NOT EXISTS inventory (
            user_id INTEGER,
            item_id TEXT,
            quantity INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, item_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) {
            console.error('Failed to create inventory table:', err.message);
            return reject(err);
          }
        });

        // Create character_progress table
        db.exec(`
          CREATE TABLE IF NOT EXISTS character_progress (
            user_id INTEGER,
            metric_name TEXT,
            current_value INTEGER DEFAULT 0,
            max_value INTEGER DEFAULT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, metric_name),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) {
            console.error('Failed to create character_progress table:', err.message);
            return reject(err);
          }
        });

        // Create achievements table
        db.exec(`
          CREATE TABLE IF NOT EXISTS achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT NOT NULL,
            type TEXT NOT NULL,
            metric_name TEXT,
            requirement_value INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('Failed to create achievements table:', err.message);
            return reject(err);
          }
        });

        // Create user_achievements table
        db.exec(`
          CREATE TABLE IF NOT EXISTS user_achievements (
            user_id INTEGER,
            achievement_id INTEGER,
            unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            progress_value INTEGER,
            PRIMARY KEY (user_id, achievement_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) {
            console.error('Failed to create user_achievements table:', err.message);
            return reject(err);
          }
          resolve();
        });
      });
    });
  },

  /**
   * Rollback migration
   * WARNING: This will delete all user data!
   */
  async down(db) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.exec(`
          DROP TABLE IF EXISTS user_achievements;
          DROP TABLE IF EXISTS achievements;
          DROP TABLE IF EXISTS character_progress;
          DROP TABLE IF EXISTS inventory;
          DROP TABLE IF EXISTS users;
          DROP TABLE IF EXISTS saves;
        `, (err) => {
          if (err) {
            console.error('Failed to drop core tables:', err.message);
            return reject(err);
          }
          resolve();
        });
      });
    });
  }
};

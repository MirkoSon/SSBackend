/**
 * Migration 000002: Epic 4 Tables
 *
 * Creates tables for Epic 4 plugin management features:
 * - plugin_audit_log: Audit trail for plugin management actions
 * - admin_preferences: Admin user preferences and settings
 *
 * Includes indexes for better query performance.
 */

module.exports = {
  version: 2,
  name: 'epic4_tables',
  description: 'Create plugin management audit logging and admin preferences tables',

  /**
   * Apply migration
   */
  async up(db) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Create plugin audit log table
        db.run(`
          CREATE TABLE IF NOT EXISTS plugin_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            plugin_name TEXT NOT NULL,
            admin_user TEXT,
            details TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('Failed to create plugin_audit_log table:', err.message);
            return reject(err);
          }
        });

        // Create admin preferences table
        db.run(`
          CREATE TABLE IF NOT EXISTS admin_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_session TEXT NOT NULL,
            preference_key TEXT NOT NULL,
            preference_value TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(admin_session, preference_key)
          )
        `, (err) => {
          if (err) {
            console.error('Failed to create admin_preferences table:', err.message);
            return reject(err);
          }
        });

        // Create index on plugin_name for audit log queries
        db.run(`
          CREATE INDEX IF NOT EXISTS idx_plugin_audit_log_plugin_name
          ON plugin_audit_log(plugin_name)
        `, (err) => {
          if (err) {
            console.error('Failed to create plugin audit log index:', err.message);
            return reject(err);
          }
        });

        // Create index on timestamp for chronological queries
        db.run(`
          CREATE INDEX IF NOT EXISTS idx_plugin_audit_log_timestamp
          ON plugin_audit_log(timestamp DESC)
        `, (err) => {
          if (err) {
            console.error('Failed to create timestamp index:', err.message);
            return reject(err);
          }
        });

        // Create index on admin_session for preferences lookup
        db.run(`
          CREATE INDEX IF NOT EXISTS idx_admin_preferences_session
          ON admin_preferences(admin_session)
        `, (err) => {
          if (err) {
            console.error('Failed to create admin preferences index:', err.message);
            return reject(err);
          }
          resolve();
        });
      });
    });
  },

  /**
   * Rollback migration
   */
  async down(db) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.exec(`
          DROP INDEX IF EXISTS idx_admin_preferences_session;
          DROP INDEX IF EXISTS idx_plugin_audit_log_timestamp;
          DROP INDEX IF EXISTS idx_plugin_audit_log_plugin_name;
          DROP TABLE IF EXISTS admin_preferences;
          DROP TABLE IF EXISTS plugin_audit_log;
        `, (err) => {
          if (err) {
            console.error('Failed to drop Epic 4 tables:', err.message);
            return reject(err);
          }
          resolve();
        });
      });
    });
  }
};

const { getDatabase } = require('../database');

/**
 * Epic 4 Database Migration
 * Creates tables for plugin management audit logging and admin preferences
 */

/**
 * Create Epic 4 tables if they don't exist
 * This migration is designed to be run safely multiple times (idempotent)
 */
async function createEpic4Tables() {
  const db = getDatabase();
  
  try {
    console.log('📊 Running Epic 4 database migration...');
    
    // Create plugin audit log table
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS plugin_audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,              -- 'enable', 'disable', 'configure', 'validate', etc.
          plugin_name TEXT NOT NULL,
          admin_user TEXT,                   -- Admin session identifier
          details TEXT,                      -- JSON details of the action
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('❌ Failed to create plugin_audit_log table:', err.message);
          reject(err);
        } else {
          console.log('✅ plugin_audit_log table created/verified');
          resolve();
        }
      });
    });

    // Create admin preferences table
    await new Promise((resolve, reject) => {
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
          console.error('❌ Failed to create admin_preferences table:', err.message);
          reject(err);
        } else {
          console.log('✅ admin_preferences table created/verified');
          resolve();
        }
      });
    });

    // Create indexes for better performance
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_plugin_audit_log_plugin_name 
        ON plugin_audit_log(plugin_name)
      `, (err) => {
        if (err) {
          console.error('❌ Failed to create plugin audit log index:', err.message);
          reject(err);
        } else {
          console.log('✅ Plugin audit log index created/verified');
          resolve();
        }
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_plugin_audit_log_timestamp 
        ON plugin_audit_log(timestamp DESC)
      `, (err) => {
        if (err) {
          console.error('❌ Failed to create timestamp index:', err.message);
          reject(err);
        } else {
          console.log('✅ Timestamp index created/verified');
          resolve();
        }
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_admin_preferences_session 
        ON admin_preferences(admin_session)
      `, (err) => {
        if (err) {
          console.error('❌ Failed to create admin preferences index:', err.message);
          reject(err);
        } else {
          console.log('✅ Admin preferences index created/verified');
          resolve();
        }
      });
    });

    console.log('✅ Epic 4 database migration completed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Epic 4 database migration failed:', error.message);
    throw error;
  }
}

/**
 * Verify Epic 4 tables exist and are properly structured
 */
async function verifyEpic4Tables() {
  const db = getDatabase();
  
  try {
    const tables = ['plugin_audit_log', 'admin_preferences'];
    const verification = {
      tablesExist: [],
      tablesMissing: [],
      allTablesReady: true
    };

    for (const tableName of tables) {
      await new Promise((resolve, reject) => {
        db.get(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
          [tableName],
          (err, row) => {
            if (err) {
              reject(err);
            } else if (row) {
              verification.tablesExist.push(tableName);
              console.log(`✅ Table ${tableName} exists`);
              resolve();
            } else {
              verification.tablesMissing.push(tableName);
              verification.allTablesReady = false;
              console.log(`❌ Table ${tableName} missing`);
              resolve();
            }
          }
        );
      });
    }

    return verification;
    
  } catch (error) {
    console.error('❌ Failed to verify Epic 4 tables:', error.message);
    throw error;
  }
}

/**
 * Initialize Epic 4 database features
 * This function should be called during app startup
 */
async function initializeEpic4Database() {
  try {
    console.log('🔧 Initializing Epic 4 database features...');
    
    // Run migration to create tables
    await createEpic4Tables();
    
    // Verify everything is working
    const verification = await verifyEpic4Tables();
    
    if (verification.allTablesReady) {
      console.log('✅ Epic 4 database features ready');
      return { success: true, verification };
    } else {
      console.warn('⚠️ Some Epic 4 tables are missing:', verification.tablesMissing);
      return { success: false, verification };
    }
    
  } catch (error) {
    console.error('❌ Failed to initialize Epic 4 database features:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  createEpic4Tables,
  verifyEpic4Tables,
  initializeEpic4Database
};

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const MigrationManager = require('./migrations/MigrationManager');

/**
 * TODO [EPIC 7 - Multi-Project Support]:
 * This database module currently manages a single database connection.
 * For multi-project support, this will need to:
 * 1. Support multiple database connections (one per project)
 * 2. Become a DatabaseManager factory: getDatabaseForProject(projectId)
 * 3. Remove hardcoded DB_PATH in favor of project-specific paths
 * 4. Handle connection pooling and LRU eviction for many projects
 *
 * See: docs/multi-project-architecture-design.md
 * Related Stories: Epic 7.1.1, Epic 7.2.1
 */
const {
  SAVES_TABLE,
  USERS_TABLE,
  INVENTORY_TABLE,
  CHARACTER_PROGRESS_TABLE,
  ACHIEVEMENTS_TABLE,
  USER_ACHIEVEMENTS_TABLE,
  USERS_MIGRATION,
  SAMPLE_ACHIEVEMENTS
} = require('./schema');

// Database path - create in current working directory for packaged executable compatibility
const DB_PATH = process.pkg ? 
  path.join(process.cwd(), 'game.db') : 
  path.join(__dirname, '../../game.db');

let db = null;

/**
 * Check if a column exists in a table
 */
async function columnExists(tableName, columnName) {
  return new Promise((resolve) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) {
        resolve(false);
        return;
      }
      const columnExists = rows.some(row => row.name === columnName);
      resolve(columnExists);
    });
  });
}

/**
 * Check if a table exists
 */
async function tableExists(tableName) {
  return new Promise((resolve) => {
    db.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName],
      (err, row) => {
        resolve(!err && row);
      }
    );
  });
}

/**
 * Migrate users table to add new columns
 */
async function migrateUsersTable() {
  try {
    // Check if migration is needed
    const hasLastLogin = await columnExists('users', 'last_login');
    const hasLoginCount = await columnExists('users', 'login_count');

    if (!hasLastLogin || !hasLoginCount) {
      console.log('Migrating users table to add session tracking fields...');
      
      return new Promise((resolve, reject) => {
        db.serialize(() => {
          if (!hasLastLogin) {
            db.run(`ALTER TABLE users ADD COLUMN last_login DATETIME`);
          }
          if (!hasLoginCount) {
            db.run(`ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0`);
          }
        });
        console.log('Users table migration completed');
        resolve();
      });
    }
  } catch (error) {
    console.error('Error during users table migration:', error.message);
  }
}

/**
 * Seed sample achievements if achievements table is empty
 */
async function seedAchievements() {
  return new Promise((resolve) => {
    // Check if achievements already exist
    db.get('SELECT COUNT(*) as count FROM achievements', (err, row) => {
      if (err || row.count > 0) {
        resolve(); // Skip seeding if error or achievements exist
        return;
      }

      console.log('Seeding sample achievements...');
      const stmt = db.prepare(`
        INSERT INTO achievements (name, description, type, metric_name, requirement_value)
        VALUES (?, ?, ?, ?, ?)
      `);

      let completed = 0;
      const total = SAMPLE_ACHIEVEMENTS.length;

      SAMPLE_ACHIEVEMENTS.forEach((achievement) => {
        stmt.run([
          achievement.name,
          achievement.description,
          achievement.type,
          achievement.metric_name,
          achievement.requirement_value
        ], (err) => {
          if (err) {
            console.error(`Error seeding achievement ${achievement.name}:`, err.message);
          }
          completed++;
          if (completed === total) {
            stmt.finalize();
            console.log(`Seeded ${total} sample achievements successfully`);
            resolve();
          }
        });
      });
    });
  });
}

/**
 * Initialize SQLite database connection and create tables
 * Now using the new migration system
 */
async function initializeDatabase() {
  return new Promise(async (resolve, reject) => {
    // Create database connection
    db = new sqlite3.Database(DB_PATH, async (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database:', DB_PATH);

      try {
        // Run migrations using new MigrationManager
        const migrationManager = new MigrationManager(db);
        await migrationManager.migrate();

        // Seed sample achievements if needed (TODO: move to migration)
        await seedAchievements();

        console.log('Database initialization complete');
        resolve();
      } catch (error) {
        console.error('Database initialization failed:', error.message);
        reject(error);
      }
    });
  });
}

/**
 * Get database connection
 */
function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Close database connection
 */
function closeDatabase() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase
};

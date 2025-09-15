const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { SAVES_TABLE, USERS_TABLE, INVENTORY_TABLE } = require('./schema');

// Database path - create in current working directory for packaged executable compatibility
const DB_PATH = process.pkg ? 
  path.join(process.cwd(), 'game.db') : 
  path.join(__dirname, '../../game.db');

let db = null;

/**
 * Initialize SQLite database connection and create tables
 */
async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    // Create database connection
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database:', DB_PATH);
    });

    // Create tables
    db.exec(SAVES_TABLE, (err) => {
      if (err) {
        console.error('Error creating saves table:', err.message);
        reject(err);
        return;
      }
      
      // Create users table after saves table
      db.exec(USERS_TABLE, (err) => {
        if (err) {
          console.error('Error creating users table:', err.message);
          reject(err);
          return;
        }
        
        // Create inventory table after users table (foreign key dependency)
        db.exec(INVENTORY_TABLE, (err) => {
          if (err) {
            console.error('Error creating inventory table:', err.message);
            reject(err);
            return;
          }
          console.log('Database tables created/verified successfully');
          resolve();
        });
      });
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
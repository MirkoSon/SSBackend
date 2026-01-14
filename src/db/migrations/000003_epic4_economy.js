/**
 * Migration 000003: Epic 4 Economy Plugin Tables
 *
 * Creates tables for the Economy plugin:
 * - plugin_currencies: Virtual currency definitions
 * - plugin_user_balances: User currency balances with optimistic locking
 * - plugin_transactions: Transaction history and audit trail
 */

module.exports = {
  version: 3,
  name: 'epic4_economy',
  description: 'Create economy plugin tables (currencies, balances, transactions)',

  /**
   * Apply migration
   */
  async up(db) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Create currencies table
        db.exec(`
          CREATE TABLE IF NOT EXISTS plugin_currencies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            symbol TEXT,
            description TEXT,
            decimal_places INTEGER DEFAULT 0,
            max_balance INTEGER DEFAULT -1,
            transferable BOOLEAN DEFAULT true,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('Failed to create plugin_currencies table:', err.message);
            return reject(err);
          }
        });

        // Create user balances table
        db.exec(`
          CREATE TABLE IF NOT EXISTS plugin_user_balances (
            user_id INTEGER NOT NULL,
            currency_id TEXT NOT NULL,
            balance INTEGER NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            version INTEGER DEFAULT 1,
            PRIMARY KEY (user_id, currency_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (currency_id) REFERENCES plugin_currencies(id)
          )
        `, (err) => {
          if (err) {
            console.error('Failed to create plugin_user_balances table:', err.message);
            return reject(err);
          }
        });

        // Create transactions table
        db.exec(`
          CREATE TABLE IF NOT EXISTS plugin_transactions (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            currency_id TEXT NOT NULL,
            amount INTEGER NOT NULL,
            balance_before INTEGER NOT NULL,
            balance_after INTEGER NOT NULL,
            transaction_type TEXT,
            source TEXT,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT,
            rollback_of TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (currency_id) REFERENCES plugin_currencies(id)
          )
        `, (err) => {
          if (err) {
            console.error('Failed to create plugin_transactions table:', err.message);
            return reject(err);
          }
          resolve();
        });
      });
    });
  },

  /**
   * Rollback migration
   * WARNING: This will delete all economy data!
   */
  async down(db) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.exec(`
          DROP TABLE IF EXISTS plugin_transactions;
          DROP TABLE IF EXISTS plugin_user_balances;
          DROP TABLE IF EXISTS plugin_currencies;
        `, (err) => {
          if (err) {
            console.error('Failed to drop economy tables:', err.message);
            return reject(err);
          }
          resolve();
        });
      });
    });
  }
};

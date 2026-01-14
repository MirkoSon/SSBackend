/**
 * Economy Plugin - Initial Schema Migration
 * 
 * Creates the core tables for the Economy plugin:
 * - plugin_currencies: Currency definitions
 * - plugin_user_balances: User balance tracking
 * - plugin_transactions: Transaction history
 * 
 * Also creates performance indexes for efficient queries.
 */

module.exports = {
    version: 1,
    name: 'initial_schema',
    description: 'Create economy plugin tables and indexes',

    async up(db) {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                // Create plugin_currencies table
                db.run(`
          CREATE TABLE IF NOT EXISTS plugin_currencies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            symbol TEXT,
            decimal_places INTEGER DEFAULT 0,
            description TEXT,
            max_balance INTEGER DEFAULT -1,
            transferable INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            config TEXT
          );
        `, (err) => {
                    if (err) {
                        console.error('Failed to create plugin_currencies table:', err);
                        return reject(err);
                    }
                });

                // Create plugin_user_balances table
                db.run(`
          CREATE TABLE IF NOT EXISTS plugin_user_balances (
            user_id INTEGER NOT NULL,
            currency_id TEXT NOT NULL,
            balance INTEGER NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            version INTEGER DEFAULT 1,
            PRIMARY KEY (user_id, currency_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (currency_id) REFERENCES plugin_currencies(id),
            CHECK (balance >= 0)
          );
        `, (err) => {
                    if (err) {
                        console.error('Failed to create plugin_user_balances table:', err);
                        return reject(err);
                    }
                });

                // Create plugin_transactions table
                db.run(`
          CREATE TABLE IF NOT EXISTS plugin_transactions (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            currency_id TEXT NOT NULL,
            amount INTEGER NOT NULL,
            balance_before INTEGER NOT NULL,
            balance_after INTEGER NOT NULL,
            transaction_type TEXT NOT NULL,
            source TEXT NOT NULL,
            source_id TEXT,
            description TEXT,
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            rollback_of TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (currency_id) REFERENCES plugin_currencies(id),
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (rollback_of) REFERENCES plugin_transactions(id)
          );
        `, (err) => {
                    if (err) {
                        console.error('Failed to create plugin_transactions table:', err);
                        return reject(err);
                    }
                });

                // Create indexes for performance optimization
                const indexes = [
                    'CREATE INDEX IF NOT EXISTS idx_user_balances ON plugin_user_balances(user_id);',
                    'CREATE INDEX IF NOT EXISTS idx_user_transactions ON plugin_transactions(user_id, created_at DESC);',
                    'CREATE INDEX IF NOT EXISTS idx_transaction_type ON plugin_transactions(transaction_type, created_at DESC);',
                    'CREATE INDEX IF NOT EXISTS idx_currency_transactions ON plugin_transactions(currency_id, created_at DESC);',
                    'CREATE INDEX IF NOT EXISTS idx_transaction_source ON plugin_transactions(source, created_at DESC);',
                    'CREATE INDEX IF NOT EXISTS idx_balance_currency ON plugin_user_balances(currency_id, balance DESC);'
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
                    'DROP INDEX IF EXISTS idx_user_balances;',
                    'DROP INDEX IF EXISTS idx_user_transactions;',
                    'DROP INDEX IF EXISTS idx_transaction_type;',
                    'DROP INDEX IF EXISTS idx_currency_transactions;',
                    'DROP INDEX IF EXISTS idx_transaction_source;',
                    'DROP INDEX IF EXISTS idx_balance_currency;'
                ];

                dropIndexes.forEach(sql => {
                    db.run(sql, (err) => {
                        if (err) console.error('Failed to drop index:', err);
                    });
                });

                // Drop tables in reverse order (respecting foreign keys)
                db.run('DROP TABLE IF EXISTS plugin_transactions;', (err) => {
                    if (err) return reject(err);
                });

                db.run('DROP TABLE IF EXISTS plugin_user_balances;', (err) => {
                    if (err) return reject(err);
                });

                db.run('DROP TABLE IF EXISTS plugin_currencies;', (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        });
    }
};

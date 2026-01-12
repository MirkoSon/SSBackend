const { getDatabase } = require('../database');

async function initializeEpic4EconomyDatabase() {
  const db = getDatabase();

  const createCurrenciesTable = `
    CREATE TABLE IF NOT EXISTS plugin_currencies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT,
      description TEXT,
      decimal_places INTEGER DEFAULT 0,
      max_balance INTEGER DEFAULT -1,
      transferable BOOLEAN DEFAULT true,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createBalancesTable = `
    CREATE TABLE IF NOT EXISTS plugin_user_balances (
      user_id INTEGER NOT NULL,
      currency_id TEXT NOT NULL,
      balance INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      version INTEGER DEFAULT 1,
      PRIMARY KEY (user_id, currency_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (currency_id) REFERENCES plugin_currencies(id)
    );
  `;

  const createTransactionsTable = `
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
    );
  `;

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.exec(createCurrenciesTable, (err) => {
        if (err) return reject(err);
        console.log('Economy plugin table "plugin_currencies" created or already exists.');
      });
      db.exec(createBalancesTable, (err) => {
        if (err) return reject(err);
        console.log('Economy plugin table "plugin_user_balances" created or already exists.');
      });
      db.exec(createTransactionsTable, (err) => {
        if (err) return reject(err);
        console.log('Economy plugin table "plugin_transactions" created or already exists.');
        resolve();
      });
    });
  });
}

module.exports = { initializeEpic4EconomyDatabase };

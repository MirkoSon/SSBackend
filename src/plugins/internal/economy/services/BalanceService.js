/**
 * Balance Service - Manages user balances across all currencies
 */
class BalanceService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get user balance for a specific currency
   * @param {number} userId - User ID
   * @param {string} currencyId - Currency ID
   * @returns {Promise<number>} Current balance
   */
  async getBalance(userId, currencyId) {
    const query = 'SELECT balance FROM plugin_user_balances WHERE user_id = ? AND currency_id = ?';
    const row = await this.db.get(query, [userId, currencyId]);
    return row ? row.balance : 0;
  }

  /**
   * Get all balances for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User balances by currency
   */
  async getUserBalances(userId) {
    const query = `
      SELECT 
        ub.currency_id,
        ub.balance,
        ub.updated_at,
        c.name,
        c.symbol,
        c.decimal_places
      FROM plugin_user_balances ub
      JOIN plugin_currencies c ON ub.currency_id = c.id
      WHERE ub.user_id = ?
      ORDER BY c.created_at ASC
    `;
    
    const rows = await new Promise((resolve, reject) => {
      this.db.all(query, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    const balances = {};
    for (const row of rows) {
      balances[row.currency_id] = {
        currency: row.currency_id,
        balance: row.balance,
        name: row.name,
        symbol: row.symbol,
        decimal_places: row.decimal_places,
        updatedAt: row.updated_at
      };
    }
    
    return balances;
  }
  /**
   * Initialize user balance for a currency (if not exists)
   * @param {number} userId - User ID
   * @param {string} currencyId - Currency ID
   * @param {number} startingBalance - Initial balance amount
   * @returns {Promise<boolean>} True if created, false if already exists
   */
  async initializeBalance(userId, currencyId, startingBalance = 0) {
    const existingBalance = await this.getBalance(userId, currencyId);
    if (existingBalance !== 0 || await this.balanceExists(userId, currencyId)) {
      return false; // Balance already exists
    }

    const query = `
      INSERT INTO plugin_user_balances (user_id, currency_id, balance)
      VALUES (?, ?, ?)
    `;
    
    await this.db.run(query, [userId, currencyId, startingBalance]);
    return true;
  }

  /**
   * Check if balance record exists (even if balance is 0)
   * @param {number} userId - User ID
   * @param {string} currencyId - Currency ID
   * @returns {Promise<boolean>} True if balance record exists
   */
  async balanceExists(userId, currencyId) {
    const query = 'SELECT 1 FROM plugin_user_balances WHERE user_id = ? AND currency_id = ?';
    const row = await this.db.get(query, [userId, currencyId]);
    return !!row;
  }

  /**
   * Update user balance with optimistic locking
   * @param {number} userId - User ID
   * @param {string} currencyId - Currency ID
   * @param {number} newBalance - New balance amount
   * @param {number} expectedVersion - Expected version for optimistic locking
   * @returns {Promise<Object>} Update result with new version
   */
  async updateBalance(userId, currencyId, newBalance, expectedVersion) {
    const query = `
      UPDATE plugin_user_balances 
      SET balance = ?, updated_at = CURRENT_TIMESTAMP, version = version + 1
      WHERE user_id = ? AND currency_id = ? AND version = ?
    `;
    
    const result = await this.db.run(query, [newBalance, userId, currencyId, expectedVersion]);
    
    if (result.changes === 0) {
      throw new Error('Concurrent modification detected - please retry');
    }
    
    return {
      success: true,
      newVersion: expectedVersion + 1,
      newBalance
    };
  }
  /**
   * Get balance with version for optimistic locking
   * @param {number} userId - User ID
   * @param {string} currencyId - Currency ID
   * @returns {Promise<Object>} Balance and version info
   */
  async getBalanceWithVersion(userId, currencyId) {
    const query = 'SELECT balance, version FROM plugin_user_balances WHERE user_id = ? AND currency_id = ?';
    const row = await this.db.get(query, [userId, currencyId]);
    
    if (!row) {
      // Initialize balance if it doesn't exist
      await this.initializeBalance(userId, currencyId, 0);
      return { balance: 0, version: 1 };
    }
    
    return {
      balance: row.balance,
      version: row.version
    };
  }

  /**
   * Admin function to adjust user balance
   * @param {number} userId - User ID
   * @param {string} currencyId - Currency ID
   * @param {number} adjustment - Amount to add/subtract
   * @param {string} reason - Reason for adjustment
   * @returns {Promise<Object>} Adjustment result
   */
  async adjustBalance(userId, currencyId, adjustment, reason = 'Admin adjustment') {
    const { balance: currentBalance, version } = await this.getBalanceWithVersion(userId, currencyId);
    const newBalance = currentBalance + adjustment;
    
    if (newBalance < 0) {
      throw new Error('Adjustment would result in negative balance');
    }
    
    return await this.updateBalance(userId, currencyId, newBalance, version);
  }

  /**
   * Get richest players for a currency (leaderboard)
   * @param {string} currencyId - Currency ID
   * @param {number} limit - Number of players to return
   * @returns {Promise<Array>} Top players by balance
   */
  async getRichestPlayers(currencyId, limit = 50) {
    const query = `
      SELECT 
        ub.user_id,
        ub.balance,
        u.username,
        ROW_NUMBER() OVER (ORDER BY ub.balance DESC) as rank
      FROM plugin_user_balances ub
      JOIN users u ON ub.user_id = u.id
      WHERE ub.currency_id = ? AND ub.balance > 0
      ORDER BY ub.balance DESC
      LIMIT ?
    `;
    
    return await new Promise((resolve, reject) => {
      this.db.all(query, [currencyId, limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
}

module.exports = BalanceService;
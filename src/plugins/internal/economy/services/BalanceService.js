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
    const row = await new Promise((resolve, reject) => {
      this.db.get(query, [userId, currencyId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
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
   * Get all user balances with pagination (Admin API)
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {string} options.search - Search term
   * @returns {Promise<Object>} Paginated users with balances
   */
  async getAllUserBalances({ page = 1, limit = 50, search = '' }) {
    const offset = (page - 1) * limit;

    // Base query for counting
    let countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN plugin_user_balances ub ON u.id = ub.user_id
    `;

    const params = [];
    if (search) {
      countQuery += ` WHERE u.username LIKE ?`;
      params.push(`%${search}%`);
    }

    const countResult = await new Promise((resolve, reject) => {
      this.db.get(countQuery, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const total = countResult ? countResult.total : 0;

    // Main query
    let query = `
      SELECT 
        u.id as user_id, u.username, u.last_login, u.created_at,
        ub.currency_id, ub.balance, ub.updated_at as balance_updated
      FROM users u
      LEFT JOIN plugin_user_balances ub ON u.id = ub.user_id
    `;

    if (search) {
      query += ` WHERE u.username LIKE ?`;
    }

    query += ` ORDER BY u.last_login DESC LIMIT ? OFFSET ?`;

    const rows = await new Promise((resolve, reject) => {
      this.db.all(query, [...params, limit, offset], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Group by user
    const usersMap = new Map();

    rows.forEach(row => {
      if (!usersMap.has(row.user_id)) {
        usersMap.set(row.user_id, {
          user_id: row.user_id,
          id: row.user_id, // Compatibility
          username: row.username,
          last_login: row.last_login,
          created_at: row.created_at,
          updated_at: row.balance_updated,
          balances: {}
        });
      }

      if (row.currency_id) {
        usersMap.get(row.user_id).balances[row.currency_id] = row.balance;
      }
    });

    return {
      users: Array.from(usersMap.values()),
      total,
      page,
      limit
    };
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

    await new Promise((resolve, reject) => {
      this.db.run(query, [userId, currencyId, startingBalance], function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
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
    const row = await new Promise((resolve, reject) => {
      this.db.get(query, [userId, currencyId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
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

    const result = await new Promise((resolve, reject) => {
      this.db.run(query, [newBalance, userId, currencyId, expectedVersion], function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });

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
    const row = await new Promise((resolve, reject) => {
      this.db.get(query, [userId, currencyId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

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
  /**
   * Complex balance adjustment (used by Admin API)
   * @param {number} userId - User ID
   * @param {Object} options - Adjustment options
   * @param {string} options.currency - Currency ID
   * @param {string} options.adjustmentType - 'add', 'subtract', or 'set'
   * @param {number} options.amount - Amount value
   * @param {string} options.reason - content for audit/history
   * @returns {Promise<Object>} Result with new balance and transaction ID placeholder
   */
  async adjustUserBalance(userId, { currency, adjustmentType, amount, reason, adminUser }) {
    const { balance: currentBalance, version } = await this.getBalanceWithVersion(userId, currency);

    let newBalance = currentBalance;
    const value = parseInt(amount);

    switch (adjustmentType) {
      case 'add':
        newBalance += value;
        break;
      case 'subtract':
        newBalance -= value;
        break;
      case 'set':
        newBalance = value;
        break;
      default:
        throw new Error(`Invalid adjustment type: ${adjustmentType}`);
    }

    if (newBalance < 0) {
      throw new Error('Balance cannot be negative');
    }

    const result = await this.updateBalance(userId, currency, newBalance, version);

    // In a real implementation, we would create a transaction record here
    // using TransactionService.createTransaction(...)

    return {
      transactionId: `tx_${Date.now()}`, // Placeholder until TransactionService is integrated
      newBalance: newBalance,
      success: true
    };
  }
}

module.exports = BalanceService;
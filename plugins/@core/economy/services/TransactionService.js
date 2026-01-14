const { v4: uuidv4 } = require('uuid');

/**
 * Transaction Service - Handles atomic economic transactions
 */
class TransactionService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Process a transaction atomically
   * @param {Object} transaction - Transaction details
   * @returns {Promise<Object>} Transaction result
   */
  async processTransaction(transaction) {
    const {
      userId,
      currencyId,
      amount,
      type,
      source,
      sourceId = null,
      description = '',
      metadata = {},
      createdBy = null
    } = transaction;

    // Validate transaction
    if (!userId || !currencyId || amount === undefined || !type || !source) {
      throw new Error('Missing required transaction fields');
    }
    if (amount === 0) {
      throw new Error('Transaction amount cannot be zero');
    }

    // Start database transaction
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');

        this._executeTransaction(transaction)
          .then(result => {
            this.db.run('COMMIT', (err) => {
              if (err) {
                this.db.run('ROLLBACK');
                reject(err);
              } else {
                resolve(result);
              }
            });
          })
          .catch(error => {
            this.db.run('ROLLBACK', () => {
              reject(error);
            });
          });
      });
    });
  }

  /**
   * Internal transaction execution with balance management
   * @param {Object} transaction - Transaction details
   * @returns {Promise<Object>} Transaction result
   * @private
   */
  async _executeTransaction(transaction) {
    const { userId, currencyId, amount } = transaction;

    // Get current balance with version for optimistic locking
    const balanceQuery = `
      SELECT balance, version 
      FROM plugin_user_balances 
      WHERE user_id = ? AND currency_id = ?
    `;

    let currentBalance = await new Promise((resolve, reject) => {
      this.db.get(balanceQuery, [userId, currencyId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Initialize balance if it doesn't exist
    if (!currentBalance) {
      await new Promise((resolve, reject) => {
        this.db.run(
          'INSERT INTO plugin_user_balances (user_id, currency_id, balance) VALUES (?, ?, 0)',
          [userId, currencyId],
          function (err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
      currentBalance = { balance: 0, version: 1 };
    }

    // Calculate new balance
    const newBalance = currentBalance.balance + amount;

    // Prevent negative balances
    if (newBalance < 0) {
      throw new Error('Insufficient balance for transaction');
    }
    // Update balance with optimistic locking
    const updateResult = await new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE plugin_user_balances 
         SET balance = ?, updated_at = CURRENT_TIMESTAMP, version = version + 1
         WHERE user_id = ? AND currency_id = ? AND version = ?`,
        [newBalance, userId, currencyId, currentBalance.version],
        function (err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    if (updateResult.changes === 0) {
      throw new Error('Concurrent modification detected - please retry transaction');
    }

    // Generate transaction ID and log transaction
    const transactionId = uuidv4();
    await new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO plugin_transactions 
         (id, user_id, currency_id, amount, balance_before, balance_after, 
          transaction_type, source, source_id, description, metadata, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transactionId,
          userId,
          currencyId,
          amount,
          currentBalance.balance,
          newBalance,
          transaction.type,
          transaction.source,
          transaction.sourceId,
          transaction.description,
          JSON.stringify(transaction.metadata),
          transaction.createdBy
        ],
        function (err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    return {
      success: true,
      transactionId,
      balanceBefore: currentBalance.balance,
      balanceAfter: newBalance,
      amount: amount
    };
  }
  /**
   * Get transaction by ID
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object|null>} Transaction details
   */
  async getTransaction(transactionId) {
    const query = `
      SELECT 
        t.*,
        c.name as currency_name,
        c.symbol as currency_symbol,
        u.username
      FROM plugin_transactions t
      JOIN plugin_currencies c ON t.currency_id = c.id
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `;

    const row = await new Promise((resolve, reject) => {
      this.db.get(query, [transactionId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (row && row.metadata) {
      row.metadata = JSON.parse(row.metadata);
    }

    return row;
  }

  /**
   * Get transactions with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Transactions and total count
   */
  async getTransactions(options = {}) {
    const {
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      search = '',
      currency = 'all',
      type = 'all',
      dateFrom = '',
      dateTo = '',
      minAmount = '',
      maxAmount = '',
      userId = ''
    } = options;

    const offset = (page - 1) * limit;
    const params = [];
    let whereConditions = [];

    // Filter by User ID
    if (userId) {
      whereConditions.push('t.user_id = ?');
      params.push(userId);
    }

    // Filter by Currency
    if (currency && currency !== 'all') {
      whereConditions.push('t.currency_id = ?');
      params.push(currency);
    }

    // Filter by Type
    if (type && type !== 'all') {
      whereConditions.push('t.transaction_type = ?');
      params.push(type);
    }

    // Filter by Date Range
    if (dateFrom) {
      whereConditions.push('t.created_at >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      whereConditions.push('t.created_at <= ?');
      params.push(dateTo);
    }

    // Filter by Amount Range
    if (minAmount !== '') {
      whereConditions.push('ABS(t.amount) >= ?');
      params.push(parseInt(minAmount));
    }
    if (maxAmount !== '') {
      whereConditions.push('ABS(t.amount) <= ?');
      params.push(parseInt(maxAmount));
    }

    // Search (Username or Description)
    if (search) {
      whereConditions.push('(u.username LIKE ? OR t.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Main Query
    const query = `
      SELECT 
        t.*,
        c.name as currency_name,
        c.symbol as currency_symbol,
        u.username
      FROM plugin_transactions t
      JOIN plugin_currencies c ON t.currency_id = c.id
      JOIN users u ON t.user_id = u.id
      ${whereClause}
      ORDER BY t.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM plugin_transactions t
      JOIN users u ON t.user_id = u.id
      ${whereClause}
    `;

    // Execute Main Query
    const transactions = await new Promise((resolve, reject) => {
      this.db.all(query, [...params, limit, offset], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Parse Metadata
    transactions.forEach(tx => {
      if (tx.metadata) {
        try {
          tx.metadata = JSON.parse(tx.metadata);
        } catch (e) {
          tx.metadata = {};
        }
      }
    });

    // Execute Count Query
    const countResult = await new Promise((resolve, reject) => {
      this.db.get(countQuery, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    return {
      transactions,
      total: countResult ? countResult.total : 0
    };
  }

  /**
   * Get user transaction history (Legacy wrapper)
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   */
  async getUserTransactions(userId, options = {}) {
    // Forward to the new generic method
    const result = await this.getTransactions({ ...options, userId });
    return {
      transactions: result.transactions,
      pagination: {
        total: result.total,
        limit: options.limit || 50,
        offset: options.offset || 0, // Note: getTransactions uses page/limit, so we might need conversion if strictly needed, but let's assume standard usage
        hasNext: (options.offset || 0) + (options.limit || 50) < result.total
      }
    };
  }
  /**
   * Rollback a transaction (admin only)
   * @param {string} transactionId - Original transaction ID
   * @param {number} adminUserId - Admin user performing rollback
   * @param {string} reason - Reason for rollback
   * @returns {Promise<Object>} Rollback transaction result
   */
  async rollbackTransaction(transactionId, adminUserId, reason = 'Admin rollback') {
    // Get original transaction
    const originalTransaction = await this.getTransaction(transactionId);
    if (!originalTransaction) {
      throw new Error('Original transaction not found');
    }

    // Check if already rolled back
    const existingRollback = await new Promise((resolve, reject) => {
      this.db.get(
        'SELECT id FROM plugin_transactions WHERE rollback_of = ?',
        [transactionId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingRollback) {
      throw new Error('Transaction has already been rolled back');
    }

    // Create reverse transaction
    const rollbackTransaction = {
      userId: originalTransaction.user_id,
      currencyId: originalTransaction.currency_id,
      amount: -originalTransaction.amount,
      type: 'rollback',
      source: 'admin_rollback',
      sourceId: transactionId,
      description: `Rollback: ${reason}`,
      metadata: {
        originalTransaction: transactionId,
        rollbackReason: reason,
        adminUserId: adminUserId
      },
      createdBy: adminUserId
    };

    // Process the rollback transaction
    const result = await this.processTransaction(rollbackTransaction);

    // Update the rollback transaction to reference the original
    await new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE plugin_transactions SET rollback_of = ? WHERE id = ?',
        [transactionId, result.transactionId],
        function (err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    return {
      ...result,
      originalTransactionId: transactionId,
      rollbackReason: reason
    };
  }

  /**
   * Validate transaction data
   * @param {Object} transaction - Transaction to validate
   * @returns {Object} Validation result
   */
  validateTransaction(transaction) {
    const errors = [];
    const { userId, currencyId, amount, type, source } = transaction;

    if (!userId || !Number.isInteger(userId)) {
      errors.push('Valid user ID is required');
    }

    if (!currencyId || typeof currencyId !== 'string') {
      errors.push('Valid currency ID is required');
    }

    if (amount === undefined || !Number.isInteger(amount)) {
      errors.push('Amount must be an integer');
    }

    if (amount === 0) {
      errors.push('Amount cannot be zero');
    }

    if (!type || typeof type !== 'string') {
      errors.push('Transaction type is required');
    }

    if (!source || typeof source !== 'string') {
      errors.push('Transaction source is required');
    }

    const validTypes = ['earn', 'spend', 'transfer', 'admin', 'rollback'];
    if (type && !validTypes.includes(type)) {
      errors.push('Invalid transaction type');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = TransactionService;
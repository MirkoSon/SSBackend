const { v4: uuidv4 } = require('uuid');

/**
 * Currency Service - Manages virtual currencies in the economy system
 */
class CurrencyService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new currency
   * @param {Object} currencyData - Currency configuration
   * @returns {Promise<Object>} Created currency
   */
  async createCurrency(currencyData) {
    const {
      id,
      name,
      symbol = '',
      decimal_places = 0,
      description = '',
      max_balance = -1,
      transferable = true,
      config = {}
    } = currencyData;

    // Check if currency already exists
    const existing = await this.getCurrency(id);
    if (existing) {
      console.log(`Currency ${id} already exists, skipping creation`);
      return existing;
    }

    const query = `
      INSERT INTO plugin_currencies 
      (id, name, symbol, decimal_places, description, max_balance, transferable, config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await new Promise((resolve, reject) => {
      this.db.run(query, [
        id,
        name,
        symbol,
        decimal_places,
        description,
        max_balance,
        transferable ? 1 : 0,
        JSON.stringify(config)
      ], function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });

    return await this.getCurrency(id);
  }
  /**
   * Get currency by ID
   * @param {string} currencyId - Currency identifier
   * @returns {Promise<Object|null>} Currency details or null
   */
  async getCurrency(currencyId) {
    const query = 'SELECT * FROM plugin_currencies WHERE id = ?';
    const row = await new Promise((resolve, reject) => {
      this.db.get(query, [currencyId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (row && row.config) {
      row.config = JSON.parse(row.config);
    }
    
    return row || null;
  }

  /**
   * Get all currencies
   * @returns {Promise<Array>} List of all currencies
   */
  async getAllCurrencies() {
    const query = 'SELECT * FROM plugin_currencies ORDER BY created_at ASC';
    
    try {
      const rows = await new Promise((resolve, reject) => {
        this.db.all(query, [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
      
      return rows.map(row => {
        if (row.config) {
          row.config = JSON.parse(row.config);
        }
        return row;
      });
    } catch (error) {
      console.error('Error in getAllCurrencies:', error);
      throw error;
    }
  }

  /**
   * Update currency configuration
   * @param {string} currencyId - Currency identifier
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated currency
   */
  async updateCurrency(currencyId, updates) {
    const allowedFields = ['name', 'symbol', 'description', 'max_balance', 'transferable', 'config'];
    const updateFields = [];
    const values = [];

    Object.keys(updates).forEach(field => {
      if (allowedFields.includes(field)) {
        updateFields.push(`${field} = ?`);
        values.push(field === 'config' ? JSON.stringify(updates[field]) : updates[field]);
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(currencyId);
    const query = `UPDATE plugin_currencies SET ${updateFields.join(', ')} WHERE id = ?`;
    
    await new Promise((resolve, reject) => {
      this.db.run(query, values, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
    return await this.getCurrency(currencyId);
  }
  /**
   * Delete a currency (admin only)
   * @param {string} currencyId - Currency identifier
   * @returns {Promise<boolean>} Success status
   */
  async deleteCurrency(currencyId) {
    // Check if currency has any balances or transactions
    const balanceCount = await new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COUNT(*) as count FROM plugin_user_balances WHERE currency_id = ?',
        [currencyId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (balanceCount.count > 0) {
      throw new Error('Cannot delete currency with existing balances');
    }

    const transactionCount = await new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COUNT(*) as count FROM plugin_transactions WHERE currency_id = ?',
        [currencyId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (transactionCount.count > 0) {
      throw new Error('Cannot delete currency with existing transactions');
    }

    const result = await new Promise((resolve, reject) => {
      this.db.run('DELETE FROM plugin_currencies WHERE id = ?', [currencyId], function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
    return result.changes > 0;
  }

  /**
   * Validate currency configuration
   * @param {Object} currencyData - Currency data to validate
   * @returns {Object} Validation result
   */
  validateCurrency(currencyData) {
    const errors = [];

    if (!currencyData.id || typeof currencyData.id !== 'string') {
      errors.push('Currency ID is required and must be a string');
    }

    if (!currencyData.name || typeof currencyData.name !== 'string') {
      errors.push('Currency name is required and must be a string');
    }

    if (currencyData.decimal_places && !Number.isInteger(currencyData.decimal_places)) {
      errors.push('Decimal places must be an integer');
    }

    if (currencyData.max_balance && !Number.isInteger(currencyData.max_balance)) {
      errors.push('Max balance must be an integer');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = CurrencyService;
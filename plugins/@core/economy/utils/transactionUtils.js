const { v4: uuidv4 } = require('uuid');

/**
 * Transaction utilities for the economy plugin
 */

/**
 * Generate a unique transaction ID
 * @returns {string} Transaction ID
 */
function generateTransactionId() {
  return `txn_${uuidv4().replace(/-/g, '')}`;
}

/**
 * Validate transaction amount
 * @param {number} amount - Amount to validate
 * @param {Object} currency - Currency configuration
 * @returns {boolean} Is valid amount
 */
function validateAmount(amount, currency) {
  if (!Number.isInteger(amount)) {
    return false;
  }

  if (currency.max_balance > 0 && Math.abs(amount) > currency.max_balance) {
    return false;
  }

  return true;
}

/**
 * Format amount for display based on currency configuration
 * @param {number} amount - Raw amount
 * @param {Object} currency - Currency configuration
 * @returns {string} Formatted amount
 */
function formatAmount(amount, currency) {
  const { decimal_places = 0, symbol = '' } = currency;
  
  if (decimal_places === 0) {
    return `${symbol}${amount.toLocaleString()}`;
  }
  
  const formatted = (amount / Math.pow(10, decimal_places)).toFixed(decimal_places);
  return `${symbol}${formatted}`;
}

/**
 * Parse amount from user input to internal representation
 * @param {string|number} input - User input amount
 * @param {Object} currency - Currency configuration  
 * @returns {number} Internal amount representation
 */
function parseAmount(input, currency) {
  const { decimal_places = 0 } = currency;
  
  if (typeof input === 'number') {
    return Math.round(input * Math.pow(10, decimal_places));
  }
  
  const parsed = parseFloat(input);
  if (isNaN(parsed)) {
    throw new Error('Invalid amount format');
  }
  
  return Math.round(parsed * Math.pow(10, decimal_places));
}

/**
 * Transaction type validation
 */
const TRANSACTION_TYPES = {
  EARN: 'earn',      // Player earns currency (achievements, rewards)
  SPEND: 'spend',    // Player spends currency (purchases, fees)
  TRANSFER: 'transfer', // Player-to-player transfers
  ADMIN: 'admin',    // Administrative adjustments
  ROLLBACK: 'rollback' // Transaction rollbacks
};

/**
 * Validate transaction type
 * @param {string} type - Transaction type
 * @returns {boolean} Is valid type
 */
function isValidTransactionType(type) {
  return Object.values(TRANSACTION_TYPES).includes(type);
}

module.exports = {
  generateTransactionId,
  validateAmount,
  formatAmount,
  parseAmount,
  TRANSACTION_TYPES,
  isValidTransactionType
};
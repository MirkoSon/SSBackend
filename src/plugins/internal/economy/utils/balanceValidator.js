/**
 * Balance validation utilities
 */

/**
 * Validate balance constraints
 * @param {number} newBalance - Proposed new balance
 * @param {Object} currency - Currency configuration
 * @returns {Object} Validation result
 */
function validateBalance(newBalance, currency) {
  const errors = [];

  // Check for negative balance
  if (newBalance < 0) {
    errors.push('Balance cannot be negative');
  }

  // Check maximum balance limit
  if (currency.max_balance > 0 && newBalance > currency.max_balance) {
    errors.push(`Balance cannot exceed ${currency.max_balance} ${currency.symbol || currency.name}`);
  }

  // Check for reasonable upper limits (prevent overflow)
  if (newBalance > Number.MAX_SAFE_INTEGER) {
    errors.push('Balance exceeds maximum safe value');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate transfer eligibility
 * @param {Object} currency - Currency configuration
 * @param {number} fromUserId - Sender user ID
 * @param {number} toUserId - Recipient user ID
 * @returns {Object} Validation result
 */
function validateTransfer(currency, fromUserId, toUserId) {
  const errors = [];

  // Check if currency is transferable
  if (!currency.transferable) {
    errors.push('Currency is not transferable between users');
  }

  // Check for self-transfer
  if (fromUserId === toUserId) {
    errors.push('Cannot transfer to yourself');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calculate transfer fees (if any)
 * @param {number} amount - Transfer amount
 * @param {Object} currency - Currency configuration
 * @returns {Object} Fee calculation
 */
function calculateTransferFee(amount, currency) {
  const config = currency.config || {};
  const feeRate = config.transferFeeRate || 0;
  const minFee = config.minTransferFee || 0;
  const maxFee = config.maxTransferFee || Number.MAX_SAFE_INTEGER;

  let fee = Math.round(amount * feeRate);
  fee = Math.max(fee, minFee);
  fee = Math.min(fee, maxFee);

  return {
    fee,
    amountAfterFee: amount - fee,
    feeRate
  };
}

/**
 * Validate daily transaction limits
 * @param {number} userId - User ID
 * @param {string} currencyId - Currency ID
 * @param {number} amount - Transaction amount
 * @param {Object} userDailyVolume - User's daily transaction volume
 * @param {Object} limits - Transaction limits configuration
 * @returns {Object} Validation result
 */
function validateDailyLimits(userId, currencyId, amount, userDailyVolume, limits) {
  const errors = [];
  const { daily_volume_limit = 10000000, max_amount = 1000000 } = limits;

  // Check single transaction limit
  if (Math.abs(amount) > max_amount) {
    errors.push(`Transaction amount exceeds limit of ${max_amount}`);
  }

  // Check daily volume limit
  const currentVolume = userDailyVolume || 0;
  if (currentVolume + Math.abs(amount) > daily_volume_limit) {
    errors.push(`Transaction would exceed daily volume limit of ${daily_volume_limit}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    remainingDailyVolume: daily_volume_limit - currentVolume
  };
}

module.exports = {
  validateBalance,
  validateTransfer,
  calculateTransferFee,
  validateDailyLimits
};
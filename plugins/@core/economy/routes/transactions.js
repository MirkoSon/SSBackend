/**
 * Transaction processing routes for the economy plugin
 */

const { TRANSACTION_TYPES, isValidTransactionType } = require('../utils/transactionUtils');
const { validateBalance, validateDailyLimits } = require('../utils/balanceValidator');

/**
 * Handle transaction-related requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleTransactionRequest(req, res) {
  const { method, params, body, query, user } = req;
  const { transactionService, currencyService, balanceService } = req.pluginContext || {};

  if (!transactionService || !currencyService || !balanceService) {
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Transaction service not available'
    });
  }

  try {
    switch (method) {
      case 'POST':
        if (req.path.includes('/rollback')) {
          return await rollbackTransaction(transactionService, params.transactionId, user, body, res);
        } else {
          return await createTransaction(transactionService, currencyService, balanceService, body, user, res);
        }

      case 'GET':
        if (params.userId) {
          return await getUserTransactions(transactionService, params.userId, query, user, res);
        } else if (params.transactionId) {
          return await getTransactionDetails(transactionService, params.transactionId, user, res);
        }
        break;

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Transaction route error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
/**
 * Create a new transaction
 */
async function createTransaction(transactionService, currencyService, balanceService, body, user, res) {
  const {
    userId,
    currencyId,
    amount,
    type,
    source,
    sourceId,
    description = '',
    metadata = {}
  } = body;

  // Validate required fields
  if (!userId || !currencyId || amount === undefined || !type || !source) {
    return res.status(400).json({
      error: 'Missing required fields: userId, currencyId, amount, type, source'
    });
  }

  // Validate transaction type
  if (!isValidTransactionType(type)) {
    return res.status(400).json({
      error: 'Invalid transaction type',
      validTypes: Object.values(TRANSACTION_TYPES)
    });
  }

  // Authorization checks
  if (type === TRANSACTION_TYPES.ADMIN && !user.isAdmin) {
    return res.status(403).json({
      error: 'Admin access required for admin transactions'
    });
  }

  // For non-admin transactions, user can only transact for themselves
  if (type !== TRANSACTION_TYPES.ADMIN && user.id !== userId && !user.isAdmin) {
    return res.status(403).json({
      error: 'Can only create transactions for yourself'
    });
  }

  // Verify currency exists
  const currency = await currencyService.getCurrency(currencyId);
  if (!currency) {
    return res.status(404).json({
      error: 'Currency not found',
      currencyId
    });
  }

  // Validate transaction data
  const validation = transactionService.validateTransaction(body);
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Invalid transaction data',
      details: validation.errors
    });
  }

  try {
    // Process the transaction
    const transaction = {
      userId,
      currencyId,
      amount,
      type,
      source,
      sourceId,
      description,
      metadata,
      createdBy: user.id
    };

    const result = await transactionService.processTransaction(transaction);
    
    return res.status(201).json({
      success: true,
      message: 'Transaction processed successfully',
      transaction: {
        id: result.transactionId,
        userId,
        currencyId,
        amount,
        balanceBefore: result.balanceBefore,
        balanceAfter: result.balanceAfter,
        type,
        source,
        description
      }
    });
  } catch (error) {
    if (error.message.includes('Insufficient balance')) {
      return res.status(400).json({
        error: 'Insufficient balance for transaction'
      });
    }
    if (error.message.includes('Concurrent modification')) {
      return res.status(409).json({
        error: 'Transaction conflict - please retry'
      });
    }
    throw error;
  }
}
/**
 * Get user transaction history
 */
async function getUserTransactions(transactionService, userId, query, user, res) {
  // Users can view their own transactions, admins can view any
  if (user.id !== parseInt(userId) && !user.isAdmin) {
    return res.status(403).json({
      error: 'Access denied - can only view your own transactions'
    });
  }

  const {
    limit = 50,
    offset = 0,
    currencyId,
    type,
    sortOrder = 'DESC'
  } = query;

  const options = {
    limit: Math.min(parseInt(limit) || 50, 100),
    offset: parseInt(offset) || 0,
    currencyId,
    transactionType: type,
    sortOrder: ['ASC', 'DESC'].includes(sortOrder) ? sortOrder : 'DESC'
  };

  const result = await transactionService.getUserTransactions(userId, options);
  
  return res.json({
    success: true,
    userId: parseInt(userId),
    transactions: result.transactions.map(tx => ({
      id: tx.id,
      currency: {
        id: tx.currency_id,
        name: tx.currency_name,
        symbol: tx.currency_symbol
      },
      amount: tx.amount,
      balanceAfter: tx.balance_after,
      type: tx.transaction_type,
      source: tx.source,
      sourceId: tx.source_id,
      description: tx.description,
      metadata: tx.metadata,
      createdAt: tx.created_at,
      isRollback: !!tx.rollback_of
    })),
    pagination: result.pagination
  });
}

/**
 * Get transaction details
 */
async function getTransactionDetails(transactionService, transactionId, user, res) {
  const transaction = await transactionService.getTransaction(transactionId);
  
  if (!transaction) {
    return res.status(404).json({
      error: 'Transaction not found',
      transactionId
    });
  }

  // Users can only view their own transactions, admins can view any
  if (user.id !== transaction.user_id && !user.isAdmin) {
    return res.status(403).json({
      error: 'Access denied - can only view your own transactions'
    });
  }

  return res.json({
    success: true,
    transaction: {
      id: transaction.id,
      user: {
        id: transaction.user_id,
        username: transaction.username
      },
      currency: {
        id: transaction.currency_id,
        name: transaction.currency_name,
        symbol: transaction.currency_symbol
      },
      amount: transaction.amount,
      balanceBefore: transaction.balance_before,
      balanceAfter: transaction.balance_after,
      type: transaction.transaction_type,
      source: transaction.source,
      sourceId: transaction.source_id,
      description: transaction.description,
      metadata: transaction.metadata,
      createdAt: transaction.created_at,
      createdBy: transaction.created_by,
      isRollback: !!transaction.rollback_of,
      rollbackOf: transaction.rollback_of
    }
  });
}
/**
 * Rollback a transaction (admin only)
 */
async function rollbackTransaction(transactionService, transactionId, user, body, res) {
  // Check admin permissions
  if (!user.isAdmin) {
    return res.status(403).json({
      error: 'Admin access required for transaction rollbacks'
    });
  }

  const { reason = 'Admin rollback' } = body;

  try {
    const result = await transactionService.rollbackTransaction(transactionId, user.id, reason);
    
    return res.json({
      success: true,
      message: 'Transaction rolled back successfully',
      rollback: {
        rollbackTransactionId: result.transactionId,
        originalTransactionId: result.originalTransactionId,
        amount: result.amount,
        balanceBefore: result.balanceBefore,
        balanceAfter: result.balanceAfter,
        reason: result.rollbackReason,
        performedBy: user.id
      }
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Original transaction not found'
      });
    }
    if (error.message.includes('already been rolled back')) {
      return res.status(409).json({
        error: 'Transaction has already been rolled back'
      });
    }
    throw error;
  }
}

module.exports = handleTransactionRequest;
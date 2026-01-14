/**
 * Balance management routes for the economy plugin
 */

/**
 * Handle balance-related requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleBalanceRequest(req, res) {
  const { method, params, body, query, user } = req;
  const { balanceService, currencyService } = req.pluginContext || {};

  if (!balanceService || !currencyService) {
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Balance service not available'
    });
  }

  try {
    switch (method) {
      case 'GET':
        if (params.userId) {
          return await getUserBalances(balanceService, currencyService, params.userId, user, res);
        } else if (req.path.includes('/leaderboard/')) {
          return await getBalanceLeaderboard(balanceService, params.currencyId, query, res);
        }
        break;

      case 'POST':
        if (req.path.includes('/adjust')) {
          return await adjustBalance(balanceService, currencyService, body, user, res);
        }
        break;

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Balance route error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

/**
 * Get user balances for all currencies
 */
async function getUserBalances(balanceService, currencyService, userId, requestingUser, res) {
  // Users can view their own balances, admins can view any
  if (requestingUser.id !== parseInt(userId) && !requestingUser.isAdmin) {
    return res.status(403).json({
      error: 'Access denied - can only view your own balances'
    });
  }

  const balances = await balanceService.getUserBalances(userId);
  const currencies = await currencyService.getAllCurrencies();

  // Initialize balances for currencies that don't have records yet
  for (const currency of currencies) {
    if (!balances[currency.id]) {
      balances[currency.id] = {
        currency: currency.id,
        balance: 0,
        name: currency.name,
        symbol: currency.symbol,
        decimal_places: currency.decimal_places,
        updatedAt: null
      };
    }
  }
  return res.json({
    success: true,
    userId: parseInt(userId),
    balances,
    totalCurrencies: currencies.length
  });
}

/**
 * Admin balance adjustment
 */
async function adjustBalance(balanceService, currencyService, body, user, res) {
  // Check admin permissions
  if (!user.isAdmin) {
    return res.status(403).json({
      error: 'Admin access required for balance adjustments'
    });
  }

  const { userId, currencyId, adjustment, reason = 'Admin adjustment' } = body;

  // Validate required fields
  if (!userId || !currencyId || adjustment === undefined) {
    return res.status(400).json({
      error: 'Missing required fields: userId, currencyId, adjustment'
    });
  }

  if (!Number.isInteger(adjustment) || adjustment === 0) {
    return res.status(400).json({
      error: 'Adjustment must be a non-zero integer'
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

  try {
    const result = await balanceService.adjustBalance(userId, currencyId, adjustment, reason);
    
    return res.json({
      success: true,
      message: 'Balance adjusted successfully',
      userId,
      currencyId,
      adjustment,
      newBalance: result.newBalance,
      reason
    });
  } catch (error) {
    if (error.message.includes('negative balance')) {
      return res.status(400).json({
        error: 'Adjustment would result in negative balance'
      });
    }
    throw error;
  }
}
/**
 * Get balance leaderboard for a currency
 */
async function getBalanceLeaderboard(balanceService, currencyId, query, res) {
  const { limit = 50 } = query;
  const limitInt = Math.min(parseInt(limit) || 50, 100); // Max 100 entries

  try {
    const richestPlayers = await balanceService.getRichestPlayers(currencyId, limitInt);
    
    return res.json({
      success: true,
      currencyId,
      leaderboard: richestPlayers.map(player => ({
        rank: player.rank,
        userId: player.user_id,
        username: player.username,
        balance: player.balance
      })),
      total: richestPlayers.length,
      limit: limitInt
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch leaderboard',
      message: error.message
    });
  }
}

module.exports = handleBalanceRequest;
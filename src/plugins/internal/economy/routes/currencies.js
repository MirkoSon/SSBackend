/**
 * Currency management routes for the economy plugin
 */

/**
 * Handle currency-related requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleCurrencyRequest(req, res) {
  const { method, params, body, query, user } = req;
  const { currencyService } = req.pluginContext || {};

  if (!currencyService) {
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Currency service not available'
    });
  }

  try {
    switch (method) {
      case 'GET':
        if (params.currencyId) {
          return await getCurrency(currencyService, params.currencyId, res);
        } else {
          return await getAllCurrencies(currencyService, res);
        }

      case 'POST':
        return await createCurrency(currencyService, body, user, res);

      case 'PUT':
        return await updateCurrency(currencyService, params.currencyId, body, user, res);

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Currency route error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

/**
 * Get all currencies
 */
async function getAllCurrencies(currencyService, res) {
  const currencies = await currencyService.getAllCurrencies();
  
  return res.json({
    success: true,
    currencies: currencies.map(currency => ({
      id: currency.id,
      name: currency.name,
      symbol: currency.symbol,
      decimal_places: currency.decimal_places,
      description: currency.description,
      transferable: !!currency.transferable,
      max_balance: currency.max_balance,
      created_at: currency.created_at
    })),
    total: currencies.length
  });
}
/**
 * Get specific currency
 */
async function getCurrency(currencyService, currencyId, res) {
  const currency = await currencyService.getCurrency(currencyId);
  
  if (!currency) {
    return res.status(404).json({
      error: 'Currency not found',
      currencyId
    });
  }

  return res.json({
    success: true,
    currency: {
      id: currency.id,
      name: currency.name,
      symbol: currency.symbol,
      decimal_places: currency.decimal_places,
      description: currency.description,
      transferable: !!currency.transferable,
      max_balance: currency.max_balance,
      created_at: currency.created_at,
      config: currency.config
    }
  });
}

/**
 * Create new currency (admin only)
 */
async function createCurrency(currencyService, body, user, res) {
  // Check admin permissions
  if (!user.isAdmin) {
    return res.status(403).json({
      error: 'Admin access required to create currencies'
    });
  }

  // Validate input
  const validation = currencyService.validateCurrency(body);
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Invalid currency data',
      details: validation.errors
    });
  }

  try {
    const currency = await currencyService.createCurrency(body);
    
    return res.status(201).json({
      success: true,
      message: 'Currency created successfully',
      currency: {
        id: currency.id,
        name: currency.name,
        symbol: currency.symbol,
        decimal_places: currency.decimal_places,
        description: currency.description,
        transferable: !!currency.transferable,
        max_balance: currency.max_balance,
        created_at: currency.created_at
      }
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({
        error: 'Currency with this ID already exists'
      });
    }
    throw error;
  }
}
/**
 * Update currency (admin only)
 */
async function updateCurrency(currencyService, currencyId, body, user, res) {
  // Check admin permissions
  if (!user.isAdmin) {
    return res.status(403).json({
      error: 'Admin access required to update currencies'
    });
  }

  // Check if currency exists
  const existingCurrency = await currencyService.getCurrency(currencyId);
  if (!existingCurrency) {
    return res.status(404).json({
      error: 'Currency not found',
      currencyId
    });
  }

  try {
    const updatedCurrency = await currencyService.updateCurrency(currencyId, body);
    
    return res.json({
      success: true,
      message: 'Currency updated successfully',
      currency: {
        id: updatedCurrency.id,
        name: updatedCurrency.name,
        symbol: updatedCurrency.symbol,
        decimal_places: updatedCurrency.decimal_places,
        description: updatedCurrency.description,
        transferable: !!updatedCurrency.transferable,
        max_balance: updatedCurrency.max_balance,
        created_at: updatedCurrency.created_at
      }
    });
  } catch (error) {
    if (error.message === 'No valid fields to update') {
      return res.status(400).json({
        error: 'No valid fields provided for update'
      });
    }
    throw error;
  }
}

module.exports = handleCurrencyRequest;
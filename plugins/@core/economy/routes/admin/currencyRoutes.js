const express = require('express');
const router = express.Router();
const CurrencyService = require('../../services/CurrencyService');

// Admin authentication middleware (reuse pattern from main admin routes)
const adminAuth = (req, res, next) => {
  const adminSession = req.session?.adminAuthenticated;
  const isCliRequest = req.headers['user-agent']?.includes('CLI') || req.headers['x-cli-request'];
  
  // Temporary CLI bypass for development - in production, implement proper CLI auth
  if (isCliRequest && process.env.NODE_ENV !== 'production') {
    console.log('🔧 CLI request detected - bypassing admin auth for development');
    return next();
  }
  
  if (!adminSession) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }
  next();
};

module.exports = (db) => {
  const currencyService = new CurrencyService(db);

  /**
   * Get all currencies for configuration
   * GET /admin/api/plugins/economy/currencies
   */
  router.get('/currencies', adminAuth, async (req, res) => {
    try {
      const currencies = await currencyService.getAllCurrencies();
      res.json({ currencies });
    } catch (error) {
      console.error('Error getting currencies:', error);
      res.status(500).json({ error: 'Failed to retrieve currencies' });
    }
  });

  /**
   * Create new currency
   * POST /admin/api/plugins/economy/currencies
   */
  router.post('/currencies', adminAuth, async (req, res) => {
    try {
      const { id, name, symbol, description, decimal_places = 0, max_balance = -1, transferable = true } = req.body;

      if (!id || !name) {
        return res.status(400).json({ error: 'Currency ID and name are required' });
      }

      const currency = await currencyService.createCurrency({
        id,
        name,
        symbol,
        description,
        decimal_places,
        max_balance,
        transferable
      });

      res.json({ success: true, currency });
    } catch (error) {
      console.error('Error creating currency:', error);
      res.status(500).json({ error: 'Failed to create currency' });
    }
  });

  /**
   * Update currency
   * PUT /admin/api/plugins/economy/currencies/:currencyId
   */
  router.put('/currencies/:currencyId', adminAuth, async (req, res) => {
    try {
      const { currencyId } = req.params;
      const { name, symbol, description, decimal_places, max_balance, transferable } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Currency name is required' });
      }

      const currency = await currencyService.updateCurrency(currencyId, {
        name,
        symbol,
        description,
        decimal_places,
        max_balance,
        transferable
      });

      res.json({ success: true, currency });
    } catch (error) {
      console.error('Error updating currency:', error);
      res.status(500).json({ error: 'Failed to update currency' });
    }
  });

  /**
   * Delete currency
   * DELETE /admin/api/plugins/economy/currencies/:currencyId
   */
  router.delete('/currencies/:currencyId', adminAuth, async (req, res) => {
    try {
      const { currencyId } = req.params;

      await currencyService.deleteCurrency(currencyId);

      res.json({ success: true, message: 'Currency deleted successfully' });
    } catch (error) {
      console.error('Error deleting currency:', error);
      res.status(500).json({ error: 'Failed to delete currency' });
    }
  });

  /**
   * Toggle currency active status
   * POST /admin/api/plugins/economy/currencies/:currencyId/toggle
   */
  router.post('/currencies/:currencyId/toggle', adminAuth, async (req, res) => {
    try {
      const { currencyId } = req.params;
      const { active } = req.body;

      await currencyService.toggleCurrencyStatus(currencyId, active);

      res.json({ 
        success: true, 
        message: `Currency ${active ? 'activated' : 'deactivated'} successfully` 
      });
    } catch (error) {
      console.error('Error toggling currency status:', error);
      res.status(500).json({ error: 'Failed to toggle currency status' });
    }
  });

  return router;
};
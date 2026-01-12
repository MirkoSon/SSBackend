const express = require('express');
const router = express.Router();
const BalanceService = require('../../services/balanceService');

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
  const balanceService = new BalanceService(db);

  /**
   * Get all user balances for balance management interface
   * GET /admin/api/plugins/economy/balances
   */
  router.get('/balances', adminAuth, async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        search = '',
        currency = 'all',
        sortBy = 'total_value',
        sortOrder = 'desc'
      } = req.query;

      const balances = await balanceService.getUserBalances({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        currency,
        sortBy,
        sortOrder
      });

      res.json({
        balances: balances.users,
        currencies: balances.currencies,
        page: parseInt(page),
        limit: parseInt(limit),
        total: balances.total
      });

    } catch (error) {
      console.error('Error getting user balances:', error);
      res.status(500).json({ error: 'Failed to retrieve user balances' });
    }
  });

  /**
   * Modify user balance (admin function)
   * PUT /admin/api/plugins/economy/balances/:userId
   */
  router.put('/balances/:userId', adminAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { currency, adjustmentType, amount, reason } = req.body;

      if (!currency || !adjustmentType || !amount || !reason) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const result = await balanceService.adjustUserBalance(userId, {
        currency,
        adjustmentType,
        amount: parseInt(amount),
        reason,
        adminUser: req.session.adminUser || 'admin'
      });

      res.json({
        success: true,
        message: 'Balance adjusted successfully',
        transactionId: result.transactionId,
        newBalance: result.newBalance
      });

    } catch (error) {
      console.error('Error adjusting balance:', error);
      res.status(500).json({ error: 'Failed to adjust balance' });
    }
  });

  /**
   * Get single user balance details
   * GET /admin/api/plugins/economy/balances/:userId
   */
  router.get('/balances/:userId', adminAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const balances = await balanceService.getUserBalanceDetails(userId);
      res.json({ success: true, balances });
    } catch (error) {
      console.error('Error getting user balance details:', error);
      res.status(500).json({ error: 'Failed to retrieve user balance details' });
    }
  });

  return router;
};
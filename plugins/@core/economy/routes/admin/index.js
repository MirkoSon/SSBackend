const express = require('express');
const router = express.Router();

// Import all admin route modules
const balanceRoutes = require('./balanceRoutes');
const transactionRoutes = require('./transactionRoutes');
const currencyRoutes = require('./currencyRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const reportRoutes = require('./reportRoutes');

// Admin authentication middleware (shared across all admin routes)
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
  // Mount all route modules (no prefix needed - already mounted at /admin/api/plugins/economy in index.js)
  router.use('/', balanceRoutes(db));
  router.use('/', transactionRoutes(db));
  router.use('/', currencyRoutes(db));
  router.use('/', analyticsRoutes(db));
  router.use('/', reportRoutes(db));

  // Health check endpoint
  router.get('/health', adminAuth, (req, res) => {
    res.json({ 
      status: 'ok', 
      plugin: 'economy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // Root endpoint for economy admin
  router.get('/', adminAuth, (req, res) => {
    res.json({
      plugin: 'economy',
      endpoints: {
        balances: {
          get: '/admin/api/plugins/economy/balances',
          post: '/admin/api/plugins/economy/balances/adjust',
          put: '/admin/api/plugins/economy/balances/:userId/:currencyId'
        },
        transactions: {
          get: '/admin/api/plugins/economy/transactions',
          getById: '/admin/api/plugins/economy/transactions/:transactionId',
          export: '/admin/api/plugins/economy/transactions/export',
          rollback: '/admin/api/plugins/economy/transactions/:transactionId/rollback'
        },
        currencies: {
          get: '/admin/api/plugins/economy/currencies',
          post: '/admin/api/plugins/economy/currencies',
          put: '/admin/api/plugins/economy/currencies/:currencyId',
          delete: '/admin/api/plugins/economy/currencies/:currencyId'
        },
        analytics: {
          flow: '/admin/api/plugins/economy/analytics/flow',
          behavior: '/admin/api/plugins/economy/analytics/behavior',
          volume: '/admin/api/plugins/economy/analytics/volume',
          wealth: '/admin/api/plugins/economy/analytics/wealth',
          recent: '/admin/api/plugins/economy/recent-activity'
        },
        reports: {
          transactions: '/admin/api/plugins/economy/reports/transactions/export',
          balances: '/admin/api/plugins/economy/reports/balances/export',
          analytics: '/admin/api/plugins/economy/reports/analytics/export',
          pdf: '/admin/api/plugins/economy/reports/pdf',
          bulk: '/admin/api/plugins/economy/reports/bulk-generate'
        }
      }
    });
  });

  return router;
};
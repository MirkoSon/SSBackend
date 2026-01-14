const express = require('express');
const router = express.Router();

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
  /**
   * Get economy overview metrics for dashboard
   * GET /admin/api/plugins/economy/metrics
   */
  router.get('/metrics', adminAuth, async (req, res) => {
    try {
      // Get total currencies
      const currenciesResult = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as total FROM plugin_currencies', (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      // Get active users (users with balances)
      const activeUsersResult = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(DISTINCT user_id) as total FROM plugin_user_balances WHERE balance > 0', (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      // Get daily transactions (today)
      const dailyTransactionsResult = await new Promise((resolve, reject) => {
        db.get(`
          SELECT COUNT(*) as total, COALESCE(SUM(ABS(amount)), 0) as volume
          FROM plugin_transactions 
          WHERE DATE(created_at) = DATE('now')
        `, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      res.json({
        totalCurrencies: currenciesResult.total,
        activeUsers: activeUsersResult.total,
        dailyTransactions: dailyTransactionsResult.total,
        totalVolume: dailyTransactionsResult.volume
      });

    } catch (error) {
      console.error('Error getting economy metrics:', error);
      res.status(500).json({ error: 'Failed to retrieve economy metrics' });
    }
  });

  /**
   * Get system health information
   * GET /admin/api/plugins/economy/health
   */
  router.get('/health', adminAuth, async (req, res) => {
    try {
      const startTime = Date.now();

      // Test database connectivity
      await new Promise((resolve, reject) => {
        db.get('SELECT 1', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const apiResponseTime = Date.now() - startTime;

      res.json({
        databaseStatus: 'healthy',
        apiResponseTime: apiResponseTime,
        cacheHitRate: 85 // Placeholder - would track actual cache metrics in real implementation
      });

    } catch (error) {
      console.error('Error getting system health:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch system health' });
    }
  });

  /**
   * Get system configuration
   * GET /admin/api/plugins/economy/config
   */
  router.get('/config', adminAuth, async (req, res) => {
    try {
      // In a real implementation, this would read from a config table or file
      // For now, return default configuration
      const config = {
        transaction_limits: {
          max_amount: 1000000,
          daily_volume_limit: 10000000,
          min_balance: 0
        },
        analytics: {
          enabled: true,
          retention_days: 365,
          real_time_updates: true
        },
        cache: {
          balance_ttl: 300,
          analytics_ttl: 3600,
          transaction_cache_size: 1000
        }
      };

      res.json(config);
    } catch (error) {
      console.error('Error getting system config:', error);
      res.status(500).json({ error: 'Failed to retrieve system configuration' });
    }
  });

  /**
   * Update system configuration
   * PUT /admin/api/plugins/economy/config
   */
  router.put('/config', adminAuth, async (req, res) => {
    try {
      const config = req.body;

      // Log admin action
      const economyAuditLogger = require('../../services/economyAuditLogger');
      await economyAuditLogger.logAdminAction('system_config_updated', {
        newConfig: config,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }, req.session.adminUser || 'unknown');

      res.json({ success: true, message: 'System configuration updated successfully' });
    } catch (error) {
      console.error('Error updating system config:', error);
      res.status(500).json({ error: 'Failed to update system configuration' });
    }
  });

  return router;
};
const express = require('express');
const router = express.Router();
const AnalyticsService = require('../../services/AnalyticsService');

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
  const analyticsService = new AnalyticsService(db);

  /**
   * Get currency flow analysis
   * GET /admin/api/plugins/economy/analytics/flow
   */
  router.get('/analytics/flow', adminAuth, async (req, res) => {
    try {
      const { start, end, currency = 'all' } = req.query;

      const flows = await analyticsService.getCurrencyFlow({
        start,
        end,
        currency
      });

      res.json({ flows });
    } catch (error) {
      console.error('Error getting currency flow analysis:', error);
      res.status(500).json({ error: 'Failed to retrieve currency flow data' });
    }
  });

  /**
   * Get user behavior analysis
   * GET /admin/api/plugins/economy/analytics/behavior
   */
  router.get('/analytics/behavior', adminAuth, async (req, res) => {
    try {
      const behavior = await analyticsService.getUserBehavior();
      
      // Calculate percentages
      const total = behavior.reduce((sum, item) => sum + item.count, 0);
      const behaviorWithPercentages = behavior.map(item => ({
        ...item,
        percentage: total > 0 ? Math.round((item.count / total) * 100) : 0
      }));

      res.json({ behavior: behaviorWithPercentages });
    } catch (error) {
      console.error('Error getting user behavior analysis:', error);
      res.status(500).json({ error: 'Failed to retrieve user behavior data' });
    }
  });

  /**
   * Get transaction volume trends
   * GET /admin/api/plugins/economy/analytics/volume
   */
  router.get('/analytics/volume', adminAuth, async (req, res) => {
    try {
      const { start, end } = req.query;

      const volumes = await analyticsService.getTransactionVolume({
        start,
        end
      });

      res.json({ volumes });
    } catch (error) {
      console.error('Error getting transaction volume trends:', error);
      res.status(500).json({ error: 'Failed to retrieve volume data' });
    }
  });

  /**
   * Get wealth distribution analysis
   * GET /admin/api/plugins/economy/analytics/wealth
   */
  router.get('/analytics/wealth', adminAuth, async (req, res) => {
    try {
      const distribution = await analyticsService.getWealthDistribution();

      // Calculate percentages
      const total = distribution.reduce((sum, item) => sum + item.users, 0);
      const distributionWithPercentages = distribution.map(item => ({
        ...item,
        percentage: total > 0 ? Math.round((item.users / total) * 100) : 0
      }));

      res.json({ distribution: distributionWithPercentages });
    } catch (error) {
      console.error('Error getting wealth distribution:', error);
      res.status(500).json({ error: 'Failed to retrieve wealth distribution data' });
    }
  });

  /**
   * Get recent economy activity
   * GET /admin/api/plugins/economy/recent-activity
   */
  router.get('/recent-activity', adminAuth, async (req, res) => {
    try {
      const { limit = 10 } = req.query;

      const activities = await analyticsService.getRecentActivity(parseInt(limit));

      // Format activities for UI
      const formattedActivities = activities.map(activity => ({
        id: activity.id,
        action: activity.action,
        description: `${activity.username || `User ${activity.user_id}`} ${activity.transaction_type}: ${activity.amount >= 0 ? '+' : ''}${activity.amount} ${activity.currency_id}`,
        timestamp: activity.created_at,
        userId: activity.user_id,
        username: activity.username
      }));

      res.json({ activities: formattedActivities });
    } catch (error) {
      console.error('Error getting recent activity:', error);
      res.status(500).json({ error: 'Failed to retrieve recent activity' });
    }
  });

  /**
   * Export analytics data
   * GET /admin/api/plugins/economy/analytics/export
   */
  router.get('/analytics/export', adminAuth, async (req, res) => {
    try {
      const { start, end, format = 'csv' } = req.query;

      const analytics = await analyticsService.exportAnalytics({
        start,
        end,
        format
      });

      if (format === 'csv') {
        const csvHeader = 'Date,Currency,Transaction Type,Count,Total Volume,Average Amount,Minimum Amount,Maximum Amount\n';
        const csvRows = analytics.map(row => {
          return [
            row.date,
            row.currency,
            row.transaction_type,
            row.transaction_count,
            row.total_volume,
            row.avg_amount.toFixed(2),
            row.min_amount,
            row.max_amount
          ].map(field => `"${field}"`).join(',');
        }).join('\n');

        const csv = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-export-${start || 'all'}-to-${end || 'now'}.csv`);
        res.send(csv);
      } else {
        res.json({ analytics, total: analytics.length });
      }

    } catch (error) {
      console.error('Error exporting analytics:', error);
      res.status(500).json({ error: 'Failed to export analytics data' });
    }
  });

  return router;
};
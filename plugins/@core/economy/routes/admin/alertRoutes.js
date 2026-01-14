const express = require('express');
const router = express.Router();
const AlertService = require('../../services/AlertService');

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
  const alertService = new AlertService(db);

  /**
   * Get all alerts
   * GET /admin/api/plugins/economy/alerts
   */
  router.get('/alerts', adminAuth, async (req, res) => {
    try {
      const alerts = await alertService.getAlerts();
      res.json({ success: true, alerts });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
    }
  });

  /**
   * Create new alert
   * POST /admin/api/plugins/economy/alerts
   */
  router.post('/alerts', adminAuth, async (req, res) => {
    try {
      const newAlert = req.body;
      const createdAlert = await alertService.createAlert(newAlert);
      res.status(201).json({ success: true, message: 'Alert created successfully', alert: createdAlert });
    } catch (error) {
      console.error('Error creating alert:', error);
      res.status(500).json({ success: false, message: 'Failed to create alert' });
    }
  });

  /**
   * Update existing alert
   * PUT /admin/api/plugins/economy/alerts/:alertId
   */
  router.put('/alerts/:alertId', adminAuth, async (req, res) => {
    try {
      const { alertId } = req.params;
      const updateData = req.body;
      const result = await alertService.updateAlert(alertId, updateData);
      res.json({ success: result.success, message: result.message, alert: result.alert });
    } catch (error) {
      console.error('Error updating alert:', error);
      res.status(500).json({ success: false, message: 'Failed to update alert' });
    }
  });

  /**
   * Delete alert
   * DELETE /admin/api/plugins/economy/alerts/:alertId
   */
  router.delete('/alerts/:alertId', adminAuth, async (req, res) => {
    try {
      const { alertId } = req.params;
      const result = await alertService.deleteAlert(alertId);
      res.json({ success: result.success, message: result.message });
    } catch (error) {
      console.error('Error deleting alert:', error);
      res.status(500).json({ success: false, message: 'Failed to delete alert' });
    }
  });

  return router;
};
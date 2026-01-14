const express = require('express');
const PluginManagementService = require('../../services/pluginManagementService');

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

// Lazy initialize plugin management service
let pluginService = null;
const getPluginService = () => {
  if (!pluginService) {
    pluginService = new PluginManagementService();
  }
  return pluginService;
};

/**
 * GET /admin/api/plugins/ui-modules - Get UI metadata for all active plugins
 */
router.get('/plugins/ui-modules', adminAuth, async (req, res) => {
  try {
    if (!global.pluginManager) {
      throw new Error('Plugin manager not initialized');
    }

    const uiModules = await global.pluginManager.getPluginUIMetadata();

    res.json({
      success: true,
      plugins: uiModules,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting plugin UI modules:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve plugin UI modules',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /admin/api/plugins - Get all plugins with status and metadata
 */
router.get('/plugins', adminAuth, async (req, res) => {
  try {
    console.log('📋 Admin request: Get all plugins status');

    const service = getPluginService();
    const pluginStatus = await service.getAllPluginsStatus();

    res.json({
      success: true,
      data: pluginStatus,
      message: 'Plugin status retrieved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting plugin status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve plugin status',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /admin/api/plugins/:id/enable - Enable a specific plugin
 */
router.post('/plugins/:id/enable', adminAuth, async (req, res) => {
  try {
    const pluginId = req.params.id;
    const adminUser = req.session?.adminUser || 'admin';

    console.log(`🔌 Admin request: Enable plugin ${pluginId} by ${adminUser}`);

    const service = getPluginService();
    const result = await service.enablePlugin(pluginId);

    // Log the action with admin user context
    await service.logPluginAction('enable', pluginId, result, adminUser);

    res.json({
      success: true,
      data: result,
      message: result.message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Error enabling plugin ${req.params.id}:`, error.message);
    res.status(400).json({
      success: false,
      error: 'Failed to enable plugin',
      details: error.message,
      pluginId: req.params.id,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /admin/api/plugins/:id/disable - Disable a specific plugin
 */
router.post('/plugins/:id/disable', adminAuth, async (req, res) => {
  try {
    const pluginId = req.params.id;
    const adminUser = req.session?.adminUser || 'admin';

    console.log(`🔌 Admin request: Disable plugin ${pluginId} by ${adminUser}`);

    const service = getPluginService();
    const result = await service.disablePlugin(pluginId);

    // Log the action with admin user context
    await service.logPluginAction('disable', pluginId, result, adminUser);

    res.json({
      success: true,
      data: result,
      message: result.message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Error disabling plugin ${req.params.id}:`, error.message);
    res.status(400).json({
      success: false,
      error: 'Failed to disable plugin',
      details: error.message,
      pluginId: req.params.id,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /admin/api/plugins/:id/toggle - Toggle plugin state (enable/disable)
 */
router.post('/plugins/:id/toggle', adminAuth, async (req, res) => {
  try {
    const pluginId = req.params.id;
    const adminUser = req.session?.adminUser || 'admin';

    console.log(`🔄 Admin request: Toggle plugin ${pluginId} by ${adminUser}`);

    const service = getPluginService();

    // First get current status
    const currentStatus = await service.getAllPluginsStatus();
    const targetPlugin = currentStatus.plugins.find(p => p.id === pluginId);

    if (!targetPlugin) {
      return res.status(404).json({
        success: false,
        error: 'Plugin not found',
        pluginId: pluginId,
        timestamp: new Date().toISOString()
      });
    }

    // Toggle based on current state
    let result;
    if (targetPlugin.enabled) {
      result = await service.disablePlugin(pluginId);
    } else {
      result = await service.enablePlugin(pluginId);
    }

    // Log the action
    await service.logPluginAction('toggle', pluginId, result, adminUser);

    res.json({
      success: true,
      data: result,
      message: result.message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Error toggling plugin ${req.params.id}:`, error.message);
    res.status(400).json({
      success: false,
      error: 'Failed to toggle plugin',
      details: error.message,
      pluginId: req.params.id,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /admin/api/plugins/:id/config - Get plugin configuration
 */
router.get('/plugins/:id/config', adminAuth, async (req, res) => {
  try {
    const pluginId = req.params.id;

    console.log(`⚙️ Admin request: Get configuration for plugin ${pluginId}`);

    const service = getPluginService();
    const config = await service.getPluginConfiguration(pluginId);

    res.json({
      success: true,
      data: config,
      message: 'Plugin configuration retrieved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Error getting plugin configuration for ${req.params.id}:`, error.message);
    res.status(400).json({
      success: false,
      error: 'Failed to get plugin configuration',
      details: error.message,
      pluginId: req.params.id,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /admin/api/plugins/:id/config - Update plugin configuration
 */
router.put('/plugins/:id/config', adminAuth, async (req, res) => {
  try {
    const pluginId = req.params.id;
    const newConfig = req.body;
    const adminUser = req.session?.adminUser || 'admin';

    console.log(`⚙️ Admin request: Update configuration for plugin ${pluginId} by ${adminUser}`);

    const service = getPluginService();
    const result = await service.updatePluginConfiguration(pluginId, newConfig);

    // Log the configuration change
    await service.logPluginAction('configure', pluginId, {
      configurationUpdated: result.configuration
    }, adminUser);

    res.json({
      success: true,
      data: result,
      message: 'Plugin configuration updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Error updating plugin configuration for ${req.params.id}:`, error.message);
    res.status(400).json({
      success: false,
      error: 'Failed to update plugin configuration',
      details: error.message,
      pluginId: req.params.id,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /admin/api/plugins/validate - Validate entire plugin system
 */
router.post('/plugins/validate', adminAuth, async (req, res) => {
  try {
    const adminUser = req.session?.adminUser || 'admin';

    console.log(`🔍 Admin request: Validate plugin system by ${adminUser}`);

    const service = getPluginService();
    const validation = await service.validatePluginSystem();

    // Log the validation action
    await service.logPluginAction('validate', 'system', {
      validationResult: validation.valid,
      issuesFound: validation.summary.issuesFound,
      warningsFound: validation.summary.warningsFound
    }, adminUser);

    // Return appropriate status code based on validation result
    const statusCode = validation.valid ? 200 : 400;

    res.status(statusCode).json({
      success: validation.valid,
      data: validation,
      message: validation.valid ? 'Plugin system validation passed' : 'Plugin system validation found issues',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error validating plugin system:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to validate plugin system',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /admin/api/plugins/:id - Get detailed plugin information
 */
router.get('/plugins/:id', adminAuth, async (req, res) => {
  try {
    const pluginId = req.params.id;

    console.log(`📋 Admin request: Get detailed info for plugin ${pluginId}`);

    const service = getPluginService();
    const allPlugins = await service.getAllPluginsStatus();
    const targetPlugin = allPlugins.plugins.find(p => p.id === pluginId);

    if (!targetPlugin) {
      return res.status(404).json({
        success: false,
        error: 'Plugin not found',
        pluginId: pluginId,
        timestamp: new Date().toISOString()
      });
    }

    // Get plugin configuration as well
    const config = await service.getPluginConfiguration(pluginId);

    res.json({
      success: true,
      data: {
        plugin: targetPlugin,
        configuration: config,
        systemHealth: allPlugins.systemHealth
      },
      message: 'Plugin details retrieved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Error getting plugin details for ${req.params.id}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get plugin details',
      details: error.message,
      pluginId: req.params.id,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /admin/api/plugins/:id - Purge a plugin completely from config
 */
router.delete('/plugins/:id', adminAuth, async (req, res) => {
  try {
    const pluginId = req.params.id;
    const adminUser = req.session?.adminUser || 'admin';

    console.log(`🗑️ Admin request: Purge plugin ${pluginId} by ${adminUser}`);

    if (!global.pluginManager) {
      throw new Error('Plugin manager not initialized');
    }

    await global.pluginManager.purgePlugin(pluginId);

    res.json({
      success: true,
      message: `Plugin ${pluginId} purged successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Error purging plugin ${req.params.id}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to purge plugin',
      details: error.message,
      pluginId: req.params.id,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /admin/api/plugins/:id/suppress - Suppress a missing plugin
 */
router.post('/plugins/:id/suppress', adminAuth, async (req, res) => {
  try {
    const pluginId = req.params.id;
    const adminUser = req.session?.adminUser || 'admin';

    console.log(`🔇 Admin request: Suppress plugin ${pluginId} by ${adminUser}`);

    if (!global.pluginManager) {
      throw new Error('Plugin manager not initialized');
    }

    await global.pluginManager.suppressPlugin(pluginId);

    res.json({
      success: true,
      message: `Plugin ${pluginId} suppressed successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Error suppressing plugin ${req.params.id}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to suppress plugin',
      details: error.message,
      pluginId: req.params.id,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Error handling middleware for plugin routes
 */
router.use((error, req, res, next) => {
  console.error('❌ Plugin management API error:', error);

  res.status(500).json({
    success: false,
    error: 'Plugin management operation failed',
    details: error.message,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

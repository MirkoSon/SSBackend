const { getDatabase } = require('../db/database');
const PluginDiscoveryService = require('./plugins/PluginDiscoveryService');
const PluginLifecycleService = require('./plugins/PluginLifecycleService');
const PluginConfigService = require('./plugins/PluginConfigService');

/**
 * Plugin Management Service
 * Provides a high-level interface for plugin management operations
 * Builds upon the existing PluginManager without modifying its core functionality
 */
class PluginManagementService {
  constructor() {
    this.pluginManager = null;
    this.db = null;
    this.discoveryService = new PluginDiscoveryService();
    this.lifecycleService = null;
    this.configService = null;
    this.initialized = false;
  }

  /**
   * Initialize the service with PluginManager and database
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      this.db = getDatabase();
      this.lifecycleService = new PluginLifecycleService(this.db, this.discoveryService);
      this.configService = new PluginConfigService(this.discoveryService, this.lifecycleService);
      this.initialized = true;
      console.log('✅ PluginManagementService initialized');
    } catch (error) {
      console.error('❌ Failed to initialize PluginManagementService:', error.message);
      throw error;
    }
  }

  /**
   * Ensure service is initialized before operations
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.db) {
      throw new Error('PluginManagementService not properly initialized');
    }
  }

  /**
   * Get the active PluginManager instance from global scope
   * This ensures we work with the same instance used by the Express app
   */
  getPluginManager() {
    // For now, we'll need to work with the PluginManager through its static methods
    // In a production system, we'd want to pass the instance through dependency injection
    return require('../plugins/PluginManager');
  }

  async getAllPluginsStatus() {
    await this.ensureInitialized();
    return this.discoveryService.getSystemStatus();
  }


  /**
   * Get configuration for a specific plugin
   * @param {string} pluginId - Plugin identifier
   * @returns {Promise<Object>} Plugin configuration
   */
  async getPluginConfiguration(pluginId) {
    await this.ensureInitialized();
    return this.configService.getPluginConfig(pluginId);
  }

  async updatePluginConfiguration(pluginId, newConfig) {
    await this.ensureInitialized();
    return this.configService.updatePluginConfig(pluginId, newConfig);
  }

  async getPluginSchema(pluginId) {
    await this.ensureInitialized();
    return this.configService.getPluginSchema(pluginId);
  }

  /**
   * Enable a plugin with dependency resolution
   * @param {string} pluginId - Plugin identifier
   * @returns {Promise<Object>} Operation result
   */
  async enablePlugin(pluginId) {
    await this.ensureInitialized();
    return this.lifecycleService.enablePlugin(pluginId);
  }

  /**
   * Disable a plugin with dependent impact analysis
   * @param {string} pluginId - Plugin identifier
   * @returns {Promise<Object>} Operation result
   */
  async disablePlugin(pluginId) {
    await this.ensureInitialized();
    return this.lifecycleService.disablePlugin(pluginId);
  }

  /**
   * Toggle a plugin status
   */
  async togglePlugin(pluginId) {
    await this.ensureInitialized();
    return this.lifecycleService.togglePlugin(pluginId);
  }

  /**
   * Reload a plugin
   */
  async reloadPlugin(pluginId) {
    await this.ensureInitialized();
    return this.lifecycleService.reloadPlugin(pluginId);
  }

  /**
   * Validate the entire plugin system for consistency and health
   * @returns {Promise<Object>} Validation result
   */
  async validatePluginSystem() {
    await this.ensureInitialized();
    return this.discoveryService.validatePluginSystem();
  }

  /**
   * Log plugin management actions for audit trail
   */
  async logPluginAction(action, pluginName, details = {}, adminUser = 'system') {
    await this.ensureInitialized();
    return this.lifecycleService.logPluginAction(action, pluginName, details, adminUser);
  }
}

module.exports = PluginManagementService;

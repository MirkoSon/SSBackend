const fs = require('fs');
const path = require('path');
const { getConfigValue, updateConfig } = require('../utils/config');

/**
 * Plugin Manager for handling plugin lifecycle, discovery, and configuration
 */
class PluginManager {
  constructor() {
    this.loadedPlugins = new Map();
    this.activePlugins = new Map();
    this.pluginRoutes = [];
    this.pluginSchemas = [];
  }

  /**
   * Initialize the plugin system
   * @param {Object} app - Express app instance
   * @param {Object} db - Database instance
   */
  async initialize(app, db) {
    this.app = app;
    this.db = db;
    
    console.log('🔌 Initializing Plugin System...');
    
    // Discover and auto-register external plugins
    await this.discoverExternalPlugins();
    
    // Load and activate configured plugins
    await this.loadConfiguredPlugins();
    
    console.log(`✅ Plugin System initialized. ${this.activePlugins.size} plugins active.`);
  }

  /**
   * Discover external plugins in the plugins/ directory
   */
  async discoverExternalPlugins() {
    const pluginsDir = path.join(process.cwd(), 'plugins');
    
    if (!fs.existsSync(pluginsDir)) {
      console.log('📂 Creating plugins directory...');
      fs.mkdirSync(pluginsDir, { recursive: true });
      return;
    }

    try {
      const pluginDirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const pluginDir of pluginDirs) {
        const pluginPath = path.join(pluginsDir, pluginDir);
        const manifestPath = path.join(pluginPath, 'plugin.js');
        
        if (fs.existsSync(manifestPath)) {
          await this.registerExternalPlugin(pluginDir, pluginPath);
        }
      }
    } catch (error) {
      console.error('❌ Error discovering external plugins:', error.message);
    }
  }

  /**
   * Register an external plugin in the config if not already present
   */
  async registerExternalPlugin(pluginName, pluginPath) {
    const pluginConfig = getConfigValue('plugins', {});
    
    if (!pluginConfig[pluginName]) {
      console.log(`🆕 Discovered new external plugin: ${pluginName}`);
      
      // Auto-add to config as enabled
      pluginConfig[pluginName] = {
        enabled: true,
        type: 'external',
        path: pluginPath
      };
      
      // Update config
      updateConfig('plugins', pluginConfig);
      console.log(`✅ Auto-registered external plugin: ${pluginName}`);
    }
  }

  /**
   * Load all configured plugins
   */
  async loadConfiguredPlugins() {
    const pluginConfig = getConfigValue('plugins', {});
    
    // Skip if plugins system is disabled
    if (pluginConfig.enabled === false) {
      console.log('🔌 Plugin system disabled in configuration');
      return;
    }

    for (const [pluginName, config] of Object.entries(pluginConfig)) {
      if (pluginName === 'enabled') continue; // Skip the global enabled flag
      
      try {
        // Load the plugin (but don't activate it yet)
        await this.loadPlugin(pluginName, config, false); // false = don't auto-activate
        
        // Only activate if enabled
        if (config.enabled) {
          await this.activatePlugin(pluginName);
        }
      } catch (error) {
        console.error(`❌ Failed to load plugin ${pluginName}:`, error.message);
      }
    }
  }

  /**
   * Load a specific plugin
   * @param {string} pluginName - Name of the plugin
   * @param {Object} config - Plugin configuration
   * @param {boolean} autoActivate - Whether to automatically activate the plugin (default: true)
   */
  async loadPlugin(pluginName, config, autoActivate = true) {
    let plugin;
    let pluginPath;

    if (config.type === 'external') {
      // External plugin
      pluginPath = config.path;
      const manifestPath = path.join(pluginPath, 'plugin.js');
      if (!fs.existsSync(manifestPath)) {
        throw new Error(`Plugin manifest not found: ${manifestPath}`);
      }
      plugin = require(manifestPath);
    } else {
      // Internal plugin
      pluginPath = path.join(__dirname, 'internal', pluginName);
      if (!fs.existsSync(path.join(pluginPath, 'index.js'))) {
        throw new Error(`Internal plugin not found: ${pluginName}`);
      }
      plugin = require(path.join(pluginPath, 'index.js'));
    }

    // Validate plugin structure
    if (!plugin.manifest) {
      throw new Error(`Plugin ${pluginName} missing manifest`);
    }

    // Store plugin
    this.loadedPlugins.set(pluginName, {
      plugin,
      config,
      path: pluginPath
    });

    // Call onLoad hook
    if (plugin.onLoad) {
      await plugin.onLoad({
        app: this.app,
        db: this.db,
        config: config.settings || {}
      });
    }

    // Only activate if requested
    if (autoActivate) {
      await this.activatePlugin(pluginName);
    }

    console.log(`✅ Loaded plugin: ${pluginName} v${plugin.manifest.version}`);
  }

  /**
   * Activate a loaded plugin
   */
  async activatePlugin(pluginName) {
    const pluginData = this.loadedPlugins.get(pluginName);
    if (!pluginData) {
      throw new Error(`Plugin not loaded: ${pluginName}`);
    }

    const { plugin, config, path: pluginPath } = pluginData;

    // Setup database schemas FIRST before calling onActivate
    if (plugin.schemas) {
      for (const schema of plugin.schemas) {
        await this.createPluginSchema(schema, pluginName);
      }
    }

    // Call onActivate hook
    const activationContext = {
      app: this.app,
      db: this.db,
      config: config.settings || {}
    };
    
    if (plugin.onActivate) {
      await plugin.onActivate(activationContext);
    }

    // Store the activation context for use in routes
    pluginData.context = activationContext;

    // Register routes
    if (plugin.routes) {
      for (const route of plugin.routes) {
        console.log(`📍 Registering route: ${route.method} ${route.path}`);
        const handler = this.resolveHandler(route.handler, pluginPath);
        const middleware = this.resolveMiddleware(route.middleware || []);
        
        // Create a wrapped handler that includes plugin context
        const wrappedHandler = this.createContextualHandler(handler, pluginName, pluginData);
        
        this.app[route.method.toLowerCase()](route.path, ...middleware, wrappedHandler);
        this.pluginRoutes.push({
          plugin: pluginName,
          method: route.method,
          path: route.path
        });
        console.log(`✅ Route registered: ${route.method} ${route.path}`);
      }
    }

    this.activePlugins.set(pluginName, pluginData);
    console.log(`🚀 Activated plugin: ${pluginName}`);
  }

  /**
   * Deactivate a plugin
   */
  async deactivatePlugin(pluginName) {
    const pluginData = this.activePlugins.get(pluginName);
    if (!pluginData) {
      console.log(`⚠️  Plugin not active: ${pluginName}`);
      return;
    }

    const { plugin } = pluginData;

    // Call onDeactivate hook
    if (plugin.onDeactivate) {
      await plugin.onDeactivate({
        app: this.app,
        db: this.db
      });
    }

    // Remove from active plugins
    this.activePlugins.delete(pluginName);
    
    // Note: Routes can't be dynamically removed from Express easily
    // This would require a more complex routing system for hot reload
    console.log(`⏹️  Deactivated plugin: ${pluginName}`);
  }

  /**
   * Create a contextual handler that includes plugin context
   */
  createContextualHandler(handler, pluginName, pluginData) {
    return (req, res, next) => {
      // Create plugin context with services and utilities
      const pluginContext = {
        pluginName,
        config: pluginData.config.settings || {},
        db: this.db,
        app: this.app
      };

      // Add plugin-specific services to context
      const activePlugin = this.activePlugins.get(pluginName);
      if (activePlugin && activePlugin.context) {
        Object.assign(pluginContext, activePlugin.context);
      }

      // Inject context into request
      req.pluginContext = pluginContext;
      
      // Call the original handler
      return handler(req, res, next);
    };
  }

  /**
   * Resolve plugin handler from path or direct function
   */
  resolveHandler(handler, pluginPath) {
    console.log(`🔍 Resolving handler:`, typeof handler, handler);
    console.log(`🔍 Plugin path:`, pluginPath);
    
    if (typeof handler === 'function') {
      return handler;
    }
    
    if (typeof handler === 'string') {
      const handlerPath = path.resolve(pluginPath, handler);
      console.log(`🔍 Handler file path:`, handlerPath);
      console.log(`🔍 File exists:`, fs.existsSync(handlerPath));
      return require(handlerPath);
    }
    
    throw new Error('Invalid handler type');
  }

  /**
   * Resolve middleware array
   */
  resolveMiddleware(middlewareNames) {
    const middleware = [];
    
    for (const name of middlewareNames) {
      if (name === 'auth') {
        middleware.push(require('../middleware/auth').authenticateToken);
      }
      // Add more middleware mappings as needed
    }
    
    return middleware;
  }

  /**
   * Create database schema for plugin
   */
  async createPluginSchema(schema, pluginName) {
    return new Promise((resolve, reject) => {
      // Add plugin prefix if not already present
      const tableName = schema.table.startsWith('plugin_') 
        ? schema.table 
        : `plugin_${schema.table}`;

      let schemaSql = schema.definition;
      if (typeof schema.definition === 'string') {
        // Replace table name in SQL
        schemaSql = schemaSql.replace(schema.table, tableName);
      }

      this.db.exec(schemaSql, (err) => {
        if (err) {
          console.error(`❌ Failed to create schema for plugin ${pluginName}:`, err);
          reject(err);
        } else {
          console.log(`📋 Created schema ${tableName} for plugin ${pluginName}`);
          resolve();
        }
      });
    });
  }

  /**
   * Get list of all available plugins
   */
  getAvailablePlugins() {
    return Array.from(this.loadedPlugins.entries()).map(([name, data]) => ({
      name,
      active: this.activePlugins.has(name),
      version: data.plugin.manifest.version,
      description: data.plugin.manifest.description,
      type: data.config.type || 'internal'
    }));
  }

  /**
   * Get active plugins
   */
  getActivePlugins() {
    return Array.from(this.activePlugins.keys());
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginName) {
    const pluginConfig = getConfigValue('plugins', {});
    
    if (!pluginConfig[pluginName]) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }

    pluginConfig[pluginName].enabled = true;
    updateConfig('plugins', pluginConfig);

    // If already loaded but not active, activate it
    if (this.loadedPlugins.has(pluginName) && !this.activePlugins.has(pluginName)) {
      await this.activatePlugin(pluginName);
    } else if (!this.loadedPlugins.has(pluginName)) {
      await this.loadPlugin(pluginName, pluginConfig[pluginName]);
    }

    console.log(`✅ Enabled plugin: ${pluginName}`);
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginName) {
    const pluginConfig = getConfigValue('plugins', {});
    
    if (!pluginConfig[pluginName]) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }

    pluginConfig[pluginName].enabled = false;
    updateConfig('plugins', pluginConfig);

    if (this.activePlugins.has(pluginName)) {
      await this.deactivatePlugin(pluginName);
    }

    console.log(`⏹️  Disabled plugin: ${pluginName}`);
  }
}

module.exports = PluginManager;

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { getConfigValue, updateConfig } = require('../utils/config');
const PluginValidator = require('./PluginValidator');

/**
 * Plugin Manager for handling plugin lifecycle, discovery, and configuration
 */
class PluginManager {
  constructor() {
    this.loadedPlugins = new Map();
    this.activePlugins = new Map();
    this.failedPlugins = new Map();
    this.disabledPlugins = new Map();
    this.discoveredPlugins = new Map();
    this.missingPlugins = new Map();
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

    // Discover and auto-register external plugins if enabled
    const autoDiscover = getConfigValue('plugins.auto_discover', true);
    if (autoDiscover) {
      await this.discoverExternalPlugins();
    }

    // Check for reinstalled suppressed plugins and unsuppress them
    await this.checkSuppressedPlugins();

    // Load and activate configured plugins
    await this.loadConfiguredPlugins();

    // Start file watcher for hot-adding if configured
    const watchForChanges = getConfigValue('plugins.watch_for_changes', false);
    if (watchForChanges) {
      this.startWatcher();
    }

    console.log(`✅ Plugin System initialized. ${this.activePlugins.size} plugins active.`);
  }

  /**
   * Discover external plugins in the plugins/ directory
   * Skips @core and @examples directories (reserved for built-in/example plugins)
   */
  async discoverExternalPlugins() {
    const pluginsDir = path.join(process.cwd(), 'plugins');

    if (!fs.existsSync(pluginsDir)) {
      console.log('📂 Creating plugins directory...');
      fs.mkdirSync(pluginsDir, { recursive: true });
      return;
    }

    console.log('🔍 Scanning for external plugins...');

    try {
      const dirents = fs.readdirSync(pluginsDir, { withFileTypes: true });

      const processDir = async (dirName, basePath) => {
        const pluginPath = path.join(basePath, dirName);

        // Skip hidden and internal-looking directories
        if (dirName.startsWith('.') || (dirName.startsWith('@core') && basePath === pluginsDir)) return;

        // Recurse into scoped directories (starting with @)
        if (dirName.startsWith('@')) {
          try {
            const subDirents = fs.readdirSync(pluginPath, { withFileTypes: true })
              .filter(d => d.isDirectory() && !d.name.startsWith('.'));

            for (const subD of subDirents) {
              await processDir(subD.name, pluginPath);
            }
          } catch (e) {
            console.error(`❌ Error scanning scoped directory ${dirName}:`, e.message);
          }
          return;
        }

        // Check for manifest or entry points
        const hasIndex = fs.existsSync(path.join(pluginPath, 'index.js'));
        const hasPluginJs = fs.existsSync(path.join(pluginPath, 'plugin.js'));
        const hasManifest = fs.existsSync(path.join(pluginPath, 'plugin.json'));

        if (hasIndex || hasPluginJs || hasManifest) {
          await this.registerExternalPlugin(dirName, pluginPath);
        }
      };

      for (const dirent of dirents) {
        if (dirent.isDirectory()) {
          await processDir(dirent.name, pluginsDir);
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

      // Basic Validation before registration
      try {
        const validator = new PluginValidator();
        const hasIndex = fs.existsSync(path.join(pluginPath, 'index.js'));
        const hasPluginJs = fs.existsSync(path.join(pluginPath, 'plugin.js'));
        const entryPath = hasIndex ? path.join(pluginPath, 'index.js') : (hasPluginJs ? path.join(pluginPath, 'plugin.js') : null);

        if (!entryPath) {
          console.warn(`⚠️  Skipping registration for ${pluginName}: No entry point found.`);
          return;
        }

        // We only do a shallow require to check manifest
        const plugin = require(entryPath);
        const result = validator.validate(plugin, pluginName, pluginPath);

        if (!result.valid) {
          console.warn(`⚠️  Skipping registration for ${pluginName}: Basic validation failed.`);
          return;
        }

        const autoEnable = getConfigValue('plugins.auto_enable_discovered', true);

        // Auto-add to config
        pluginConfig[pluginName] = {
          enabled: autoEnable,
          type: 'external',
          path: pluginPath
        };

        // Update config
        updateConfig('plugins', pluginConfig);
        console.log(`✅ Auto-registered external plugin: ${pluginName} (Enabled: ${autoEnable})`);
      } catch (e) {
        console.error(`❌ Registration failed for ${pluginName}:`, e.message);
      }
    }
  }

  /**
   * Start watching the plugins directory for changes (Hot-Add)
   */
  startWatcher() {
    const pluginsDir = path.join(process.cwd(), 'plugins');
    console.log('👁️  Starting plugin directory watcher...');

    this.watcher = chokidar.watch(pluginsDir, {
      ignored: [
        /(^|[\/\\])\../, // ignore dotfiles
        'node_modules',
        '**/.git',
        path.join(pluginsDir, '@core') // ignore internal core plugins
      ],
      persistent: true,
      depth: 2, // Allow scoped plugins @scope/plugin
      ignoreInitial: true // Don't trigger 'add' on startup discovery
    });

    this.watcher.on('addDir', (dirPath) => {
      const dirName = path.basename(dirPath);
      // Skip if it's the plugins root or a scoped directory itself
      if (dirPath === pluginsDir || dirName.startsWith('@') || dirName.startsWith('.')) return;

      console.log(`📂 Directory added: ${dirName}`);
      this.hotAddPlugin(dirName, dirPath);
    });
  }

  /**
   * Handle hot-adding a plugin without restart
   */
  async hotAddPlugin(pluginName, pluginPath) {
    console.log(`🔥 Hot-adding plugin: ${pluginName}...`);

    // Wait a bit to ensure files are written (common issue with file watchers)
    await new Promise(r => setTimeout(r, 500));

    const hasIndex = fs.existsSync(path.join(pluginPath, 'index.js'));
    const hasPluginJs = fs.existsSync(path.join(pluginPath, 'plugin.js'));
    const hasManifest = fs.existsSync(path.join(pluginPath, 'plugin.json'));

    if (hasIndex || hasPluginJs || hasManifest) {
      // Register (takes care of config)
      await this.registerExternalPlugin(pluginName, pluginPath);

      const pluginConfig = getConfigValue('plugins', {});
      const config = pluginConfig[pluginName];

      if (config && config.enabled) {
        try {
          // Mark as discovered
          this.discoveredPlugins.set(pluginName, { config, discoveredAt: new Date() });

          // Load and Activate
          await this.loadPlugin(pluginName, config, true); // true = auto-activate
          console.log(`🔥 Plugin ${pluginName} hot-added successfully!`);
        } catch (error) {
          console.error(`❌ Hot-add failed for ${pluginName}:`, error.message);
        }
      }
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

    // Known setting keys to skip
    const SETTING_KEYS = ['enabled', 'auto_discover', 'auto_enable_discovered', 'watch_for_changes'];

    for (const [pluginName, config] of Object.entries(pluginConfig)) {
      // Skip global settings
      if (SETTING_KEYS.includes(pluginName)) continue;

      // Skip if config is not an object (settings are usually booleans)
      if (typeof config !== 'object' || config === null) {
        console.warn(`⚠️  Skipping non-object config entry: ${pluginName}`);
        continue;
      }

      // Skip suppressed plugins
      if (config.suppressed === true) {
        console.log(`🔇 Skipping suppressed plugin: ${pluginName}`);
        continue;
      }

      try {
        // Mark as discovered
        this.discoveredPlugins.set(pluginName, { config, discoveredAt: new Date() });

        // Load the plugin (but don't activate it yet)
        await this.loadPlugin(pluginName, config, false); // false = don't auto-activate

        // Only activate if enabled
        if (config.enabled) {
          await this.activatePlugin(pluginName);
        }
      } catch (error) {
        console.error(`❌ Failed to load plugin ${pluginName}:`, error.message);

        // Check if this is a missing plugin error
        if (error.message.includes('not found') || error.message.includes('ENOENT')) {
          this.missingPlugins.set(pluginName, {
            error: error.message,
            timestamp: new Date(),
            config
          });
        } else {
          this.failedPlugins.set(pluginName, {
            error: error.message,
            stack: error.stack,
            timestamp: new Date(),
            phase: 'load',
            config
          });
        }
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
      // External plugin - support both index.js and plugin.js (index.js preferred)
      pluginPath = config.path;
      const indexPath = path.join(pluginPath, 'index.js');
      const pluginJsPath = path.join(pluginPath, 'plugin.js');

      if (fs.existsSync(indexPath)) {
        plugin = require(indexPath);
      } else if (fs.existsSync(pluginJsPath)) {
        plugin = require(pluginJsPath);
      } else {
        throw new Error(`Plugin entry point not found: ${pluginPath} (looked for index.js or plugin.js)`);
      }
    } else {
      // Internal plugin (from plugins/@core/)
      pluginPath = path.join(process.cwd(), 'plugins', '@core', pluginName);
      if (!fs.existsSync(path.join(pluginPath, 'index.js'))) {
        throw new Error(`Internal plugin not found: ${pluginName}`);
      }
      plugin = require(path.join(pluginPath, 'index.js'));
    }

    // Validate plugin structure
    const validator = new PluginValidator();
    const validationResult = validator.validate(plugin, pluginName, pluginPath);

    if (!validationResult.valid) {
      const errorMessage = PluginValidator.formatResult(validationResult, pluginName);
      console.error(errorMessage);
      throw new Error(`Plugin ${pluginName} failed validation (${validationResult.errors.length} errors)`);
    }

    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      console.warn(`⚠️  Plugin ${pluginName} has ${validationResult.warnings.length} validation warnings:`);
      validationResult.warnings.forEach((warning, i) => {
        console.warn(`   ${i + 1}. ${warning}`);
      });
    }

    // Store plugin
    this.loadedPlugins.set(pluginName, {
      plugin,
      config,
      path: pluginPath
    });

    // Call onLoad hook
    if (plugin.onLoad) {
      try {
        await plugin.onLoad({
          app: this.app,
          db: this.db,
          config: config.settings || {}
        });
      } catch (error) {
        console.error(`❌ Error in onLoad hook for plugin ${pluginName}:`, error.message);
        throw new Error(`Plugin ${pluginName} onLoad failed: ${error.message}`);
      }
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

    try {
      // Setup database schemas FIRST before calling onActivate
      if (plugin.schemas) {
        for (const schema of plugin.schemas) {
          try {
            await this.createPluginSchema(schema, pluginName);
          } catch (error) {
            console.error(`❌ Failed to create schema for plugin ${pluginName}:`, error.message);
            throw new Error(`Schema creation failed: ${error.message}`);
          }
        }
      }

      // Call onActivate hook
      const activationContext = {
        app: this.app,
        db: this.db,
        config: config.settings || {}
      };

      if (plugin.onActivate) {
        try {
          await plugin.onActivate(activationContext);
        } catch (error) {
          console.error(`❌ Error in onActivate hook for plugin ${pluginName}:`, error.message);
          throw new Error(`Plugin ${pluginName} onActivate failed: ${error.message}`);
        }
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
    } catch (error) {
      // Mark plugin as failed
      this.failedPlugins.set(pluginName, {
        error: error.message,
        stack: error.stack,
        timestamp: new Date(),
        phase: 'activate',
        config
      });
      throw error; // Re-throw to be caught by caller
    }
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
   * Create a contextual handler that includes plugin context and error handling
   */
  createContextualHandler(handler, pluginName, pluginData) {
    return async (req, res, next) => {
      try {
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
        return await handler(req, res, next);
      } catch (error) {
        console.error(`❌ Error in plugin ${pluginName} route handler:`, error.message);
        console.error(error.stack);

        // Return 500 error instead of crashing
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Plugin error',
            plugin: pluginName,
            message: error.message,
            path: req.path
          });
        }
      }
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
   * Get UI metadata for all plugins (active, loaded, disabled)
   */
  async getPluginUIMetadata() {
    const allPlugins = [];

    // Helper function to determine group
    const getGroup = (config) => {
      const group = (() => {
        if (config.type === 'internal' || (config.path && config.path.includes('@core'))) {
          return 'Core';
        } else if (config.path && config.path.includes('@examples')) {
          return 'Examples';
        }
        return 'Community';
      })();
      console.log(`[PluginManager] Group detection - path: ${config.path}, type: ${config.type}, group: ${group}`);
      return group;
    };

    // Add active plugins
    for (const [name, pluginData] of this.activePlugins.entries()) {
      const { plugin, config } = pluginData;
      const manifest = plugin.manifest || {};
      const adminUI = plugin.adminUI || manifest.adminUI || {};

      if (adminUI.enabled) {
        // Resolve the web-accessible path for the UI module
        let webPath = null;
        if (adminUI.modulePath) {
          const isCore = config.type === 'internal' || (config.path && config.path.includes('@core'));
          const isExample = config.path && config.path.includes('@examples');
          const scope = isCore ? '@core' : (isExample ? '@examples' : null);

          if (scope) {
            webPath = `/plugins/${scope}/${name}/${adminUI.modulePath.replace(/^\.\//, '')}`;
          } else {
            webPath = `/plugins/${name}/${adminUI.modulePath.replace(/^\.\//, '')}`;
          }
        }

        allPlugins.push({
          id: name,
          name: adminUI.navigation?.label || manifest.name || name,
          icon: adminUI.navigation?.icon || '🧩',
          priority: adminUI.navigation?.priority || 100,
          uiModulePath: webPath,
          navigation: adminUI.navigation,
          group: getGroup(config)
        });
      }
    }

    // Add loaded but not active plugins (disabled in config)
    for (const [name, pluginData] of this.loadedPlugins.entries()) {
      if (!this.activePlugins.has(name)) {
        const { plugin, config } = pluginData;
        const manifest = plugin.manifest || {};
        const adminUI = plugin.adminUI || manifest.adminUI || {};

        allPlugins.push({
          id: name,
          name: adminUI.navigation?.label || manifest.name || name,
          icon: adminUI.navigation?.icon || '🧩',
          priority: adminUI.navigation?.priority || 100,
          uiModulePath: null,
          navigation: adminUI.navigation,
          group: getGroup(config)
        });
      }
    }

    // Add disabled plugins from config
    const pluginConfig = getConfigValue('plugins', {});
    const SETTING_KEYS = ['enabled', 'auto_discover', 'auto_enable_discovered', 'watch_for_changes'];

    for (const [name, config] of Object.entries(pluginConfig)) {
      if (SETTING_KEYS.includes(name)) continue;
      if (typeof config !== 'object' || config === null) continue;
      if (config.enabled === false && !this.loadedPlugins.has(name) && !this.activePlugins.has(name)) {
        allPlugins.push({
          id: name,
          name: name,
          icon: '🧩',
          priority: 999,
          uiModulePath: null,
          navigation: null,
          group: getGroup(config)
        });
      }
    }

    return allPlugins.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get plugin health status
   * @returns {Object} Status of all plugins by state
   */
  getPluginStatus() {
    return {
      active: Array.from(this.activePlugins.keys()),
      loaded: Array.from(this.loadedPlugins.keys()).filter(name => !this.activePlugins.has(name)),
      failed: Array.from(this.failedPlugins.entries()).map(([name, data]) => ({
        name,
        error: data.error,
        timestamp: data.timestamp,
        phase: data.phase
      })),
      disabled: Array.from(this.disabledPlugins.keys()),
      discovered: Array.from(this.discoveredPlugins.keys()).filter(name =>
        !this.loadedPlugins.has(name) && !this.failedPlugins.has(name)
      )
    };
  }

  /**
   * Get plugin health status with group information
   */
  getPluginHealthStatus() {
    // Helper to get group from plugin data
    const getGroupForPlugin = (name) => {
      const pluginData = this.activePlugins.get(name) || this.loadedPlugins.get(name);
      if (!pluginData) {
        // Try to get from config
        const pluginConfig = getConfigValue('plugins', {});
        const config = pluginConfig[name];
        if (config && typeof config === 'object') {
          if (config.type === 'internal' || (config.path && config.path.includes('@core'))) {
            return 'Core';
          } else if (config.path && config.path.includes('@examples')) {
            return 'Examples';
          }
        }
        return 'Community';
      }

      const { config } = pluginData;
      if (config.type === 'internal' || (config.path && config.path.includes('@core'))) {
        return 'Core';
      } else if (config.path && config.path.includes('@examples')) {
        return 'Examples';
      }
      return 'Community';
    };

    return {
      status: this.failedPlugins.size > 0 ? 'degraded' : 'ok',
      plugins: {
        active: Array.from(this.activePlugins.keys()).map(name => ({
          name,
          group: getGroupForPlugin(name)
        })),
        failed: Array.from(this.failedPlugins.entries()).map(([name, data]) => ({
          name,
          error: data.error,
          timestamp: data.timestamp,
          phase: data.phase,
          group: getGroupForPlugin(name)
        })),
        missing: Array.from(this.missingPlugins.entries()).map(([name, data]) => ({
          name,
          error: data.error,
          timestamp: data.timestamp,
          config: data.config,
          group: getGroupForPlugin(name)
        })),
        disabled: Array.from(this.disabledPlugins.keys()).map(name => ({
          name,
          group: getGroupForPlugin(name)
        })),
        loaded: Array.from(this.loadedPlugins.keys()).filter(
          name => !this.activePlugins.has(name) && !this.failedPlugins.has(name)
        ).map(name => ({
          name,
          group: getGroupForPlugin(name)
        }))
      },
      timestamp: new Date().toISOString()
    };
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

  /**
   * Purge a plugin completely from config
   */
  async purgePlugin(pluginName) {
    const pluginConfig = getConfigValue('plugins', {});

    if (!pluginConfig[pluginName]) {
      throw new Error(`Plugin not found in config: ${pluginName}`);
    }

    // Remove from all internal maps
    this.missingPlugins.delete(pluginName);
    this.failedPlugins.delete(pluginName);
    this.loadedPlugins.delete(pluginName);
    this.activePlugins.delete(pluginName);
    this.discoveredPlugins.delete(pluginName);

    // Remove from config
    delete pluginConfig[pluginName];
    updateConfig('plugins', pluginConfig);

    console.log(`🗑️  Purged plugin: ${pluginName}`);
  }

  /**
   * Check for reinstalled suppressed plugins and unsuppress them
   */
  async checkSuppressedPlugins() {
    const pluginConfig = getConfigValue('plugins', {});
    const SETTING_KEYS = ['enabled', 'auto_discover', 'auto_enable_discovered', 'watch_for_changes'];

    for (const [pluginName, config] of Object.entries(pluginConfig)) {
      // Skip settings
      if (SETTING_KEYS.includes(pluginName)) continue;
      if (typeof config !== 'object' || config === null) continue;

      // Check if plugin is suppressed
      if (config.suppressed === true) {
        // Check if plugin files exist
        let pluginPath;
        if (config.type === 'external') {
          pluginPath = config.path;
        } else {
          pluginPath = path.join(process.cwd(), 'plugins', '@core', pluginName);
        }

        const indexPath = path.join(pluginPath, 'index.js');
        const pluginJsPath = path.join(pluginPath, 'plugin.js');

        if (fs.existsSync(indexPath) || fs.existsSync(pluginJsPath)) {
          console.log(`🔄 Plugin ${pluginName} has been reinstalled, unsuppressing...`);

          // Unsuppress the plugin
          pluginConfig[pluginName].suppressed = false;
          pluginConfig[pluginName].enabled = true;
          updateConfig('plugins', pluginConfig);
        }
      }
    }
  }

  /**
   * Suppress a plugin (hide from UI but keep config)
   */
  async suppressPlugin(pluginName) {
    const pluginConfig = getConfigValue('plugins', {});

    if (!pluginConfig[pluginName]) {
      throw new Error(`Plugin not found in config: ${pluginName}`);
    }

    // Mark as suppressed
    pluginConfig[pluginName].suppressed = true;
    pluginConfig[pluginName].enabled = false;
    updateConfig('plugins', pluginConfig);

    // Remove from internal maps
    this.missingPlugins.delete(pluginName);
    this.failedPlugins.delete(pluginName);

    console.log(`🔇 Suppressed plugin: ${pluginName}`);
  }
}

module.exports = PluginManager;

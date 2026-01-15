const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { getConfigValue, updateConfig } = require('../utils/config');
const PluginValidator = require('./PluginValidator');
const PluginDiscoveryService = require('../services/plugins/PluginDiscoveryService');

/**
 * Plugin Manager for handling plugin lifecycle, discovery, and configuration
 *
 * TODO [EPIC 7 - Multi-Project Support]:
 * PluginManager is currently used as a global singleton (global.pluginManager).
 * For multi-project support:
 * 1. Remove global.pluginManager - each ProjectContext should have its own instance
 * 2. Constructor should accept projectId and project-specific config
 * 3. Plugin routes should be scoped: /api/project/{projectId}/{pluginRoute}
 * 4. Plugin data isolation: each project's plugins use project-specific database
 * 5. CLI commands need --project flag to specify which project's plugins to manage
 *
 * See: docs/multi-project-architecture-design.md
 * Related Stories: Epic 7.2.2
 */
class PluginManager {
  constructor() {
    this.loadedPlugins = new Map();
    this.activePlugins = new Map();
    this.failedPlugins = new Map();
    this.disabledPlugins = new Map();
    this.discoveredPlugins = new Map();
    this.pluginRoutes = [];
    this.pluginSchemas = [];
    this.discoveryService = new PluginDiscoveryService();
  }

  /**
   * Initialize the plugin system
   * @param {Object} app - Express app instance
   * @param {Object} db - Database instance
   */
  async initialize(app, db) {
    this.app = app;
    this.db = db;

    // Discover and auto-register external plugins if enabled
    const autoDiscover = getConfigValue('plugins.auto_discover', true);
    if (autoDiscover) {
      await this.discoveryService.registerNewPlugins();
    }

    // Check for reinstalled suppressed plugins and unsuppress them
    await this.discoveryService.checkSuppressedPlugins();

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
      // Register (takes care of config) using specialized service
      const externalPlugins = await this.discoveryService.discoverExternalPlugins();
      const pluginMeta = externalPlugins.find(p => p.name === pluginName || p.path === pluginPath);

      if (pluginMeta) {
        // Register it
        const pluginConfig = getConfigValue('plugins', {});
        if (!pluginConfig[pluginName]) {
          const autoEnable = getConfigValue('plugins.auto_enable_discovered', true);
          pluginConfig[pluginName] = {
            enabled: autoEnable,
            type: 'external',
            path: pluginPath
          };
          updateConfig('plugins', pluginConfig);
          console.log(`✅ Auto-registered hot-added plugin: ${pluginName}`);
        }
      }

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
      // Check for plugin migrations and run them FIRST before schemas
      const migrationsPath = path.join(pluginPath, 'migrations');
      const hasMigrations = fs.existsSync(migrationsPath);

      if (hasMigrations) {
        console.log(`📦 Plugin ${pluginName} has migrations directory, running migrations...`);
        const MigrationManager = require('../db/migrations/MigrationManager');
        const migrationManager = new MigrationManager(this.db);

        try {
          await migrationManager.migratePluginFromPath(pluginName, migrationsPath);
        } catch (error) {
          console.error(`❌ Plugin migration failed for ${pluginName}:`, error.message);
          throw new Error(`Plugin ${pluginName} migration failed: ${error.message}`);
        }
      }

      // Setup database schemas (backward compatibility for plugins without migrations)
      // Skip if migrations exist to avoid conflicts
      if (plugin.schemas && !hasMigrations) {
        for (const schema of plugin.schemas) {
          try {
            await this.createPluginSchema(schema, pluginName);
          } catch (error) {
            console.error(`❌ Failed to create schema for plugin ${pluginName}:`, error.message);
            throw new Error(`Schema creation failed: ${error.message}`);
          }
        }
      } else if (plugin.schemas && hasMigrations) {
        console.log(`  ℹ️  Skipping schema creation for ${pluginName} (using migrations instead)`);
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

      // Register routes using isolated router (Story 6.2 - Hot-Reload)
      if (plugin.routes) {
        const express = require('express');
        const pluginRouter = express.Router();

        // Register all plugin routes to isolated router
        for (const route of plugin.routes) {
          // Strip plugin name from route path if present (for backward compatibility)
          // E.g., "/economy/balance" becomes "/balance" when mounting at "/api/economy"
          let routePath = route.path;
          const pluginPrefix = `/${pluginName}/`;
          if (routePath.startsWith(pluginPrefix)) {
            routePath = routePath.substring(pluginPrefix.length - 1); // Keep leading slash
          } else if (routePath === `/${pluginName}`) {
            routePath = '/';
          }

          const handler = this.resolveHandler(route.handler, pluginPath);
          const middleware = this.resolveMiddleware(route.middleware || []);

          // Create a wrapped handler that includes plugin context
          const wrappedHandler = this.createContextualHandler(handler, pluginName, pluginData);

          pluginRouter[route.method.toLowerCase()](routePath, ...middleware, wrappedHandler);
          this.pluginRoutes.push({
            plugin: pluginName,
            method: route.method,
            path: route.path
          });
        }

        // Track module paths for cache clearing during reload
        // IMPORTANT: Must be done AFTER route registration so handler files are included
        const pluginDir = path.resolve(pluginPath);
        const modulePaths = Object.keys(require.cache).filter(key => key.startsWith(pluginDir));
        pluginData.modulePaths = modulePaths;

        // Check if plugin already has a router layer (from previous activation)
        const existingLayerIndex = this.app._router.stack.findIndex(
          layer => layer.pluginName === pluginName
        );

        if (existingLayerIndex !== -1) {
          // Reuse existing layer, just replace the router handle
          const existingLayer = this.app._router.stack[existingLayerIndex];
          existingLayer.handle = pluginRouter;

          // Store metadata
          pluginData.router = pluginRouter;
          pluginData.routerLayerIndex = existingLayerIndex;
          pluginData.mountPath = `/api/${pluginName}`;

          console.log(`✅ Plugin router reloaded at /api/${pluginName} (${plugin.routes.length} routes)`);
        } else {
          // First time activation - mount new router
          const mountPath = `/api/${pluginName}`;
          this.app.use(mountPath, pluginRouter);

          // Tag the layer with metadata for easy identification (Tagged Layer Pattern)
          const layerIndex = this.app._router.stack.length - 1;
          const layer = this.app._router.stack[layerIndex];

          layer.pluginName = pluginName;
          layer.pluginMountPath = mountPath;

          // Store router reference and metadata
          pluginData.router = pluginRouter;
          pluginData.routerLayerIndex = layerIndex;
          pluginData.mountPath = mountPath;

          console.log(`✅ Plugin router mounted at ${mountPath} (${plugin.routes.length} routes)`);
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

    // Call onDeactivate hook first (allow plugin to clean up)
    if (plugin.onDeactivate) {
      try {
        await plugin.onDeactivate({
          app: this.app,
          db: this.db
        });
      } catch (error) {
        console.error(`⚠️  Error in onDeactivate hook for ${pluginName}:`, error.message);
        // Continue with deactivation even if hook fails
      }
    }

    // DON'T remove router from Express stack during reload
    // The layer will be reused when the plugin is reactivated
    // This preserves the Express stack integrity and avoids routing issues

    // Clear require cache for plugin modules (Story 6.2 - Hot-Reload)
    if (pluginData.modulePaths && pluginData.modulePaths.length > 0) {
      pluginData.modulePaths.forEach(modulePath => {
        if (require.cache[modulePath]) {
          delete require.cache[modulePath];
        }
      });
    }

    // Remove from active plugins
    this.activePlugins.delete(pluginName);

    console.log(`⏹️  Deactivated plugin: ${pluginName}`);
  }

  /**
   * Remove plugin router from Express stack (Story 6.2 - Hot-Reload)
   * Uses Tagged Layer Pattern to safely identify and remove router
   *
   * @param {string} pluginName - Name of the plugin
   * @param {Object} pluginData - Plugin data containing router metadata
   * @returns {boolean} True if router was removed, false otherwise
   */
  removePluginRouter(pluginName, pluginData) {
    if (!pluginData.router || !this.app._router || !this.app._router.stack) {
      return false;
    }

    try {
      // Find layer by plugin name tag (Tagged Layer Pattern)
      const layerIndex = this.app._router.stack.findIndex(
        layer => layer.pluginName === pluginName
      );

      if (layerIndex === -1) {
        console.warn(`⚠️  Router layer not found for plugin: ${pluginName}`);
        return false;
      }

      // Safety checks before removal
      const layer = this.app._router.stack[layerIndex];

      // Verify it's a router layer
      if (layer.name !== 'router') {
        console.error(`❌ Layer mismatch for ${pluginName}: expected 'router', got '${layer.name}'`);
        return false;
      }

      // Verify mount path matches (extra safety)
      if (pluginData.mountPath && !layer.regexp.test(pluginData.mountPath)) {
        console.error(`❌ Mount path mismatch for ${pluginName}`);
        return false;
      }

      // Safe to remove
      this.app._router.stack.splice(layerIndex, 1);

      // Clean up plugin routes tracking
      this.pluginRoutes = this.pluginRoutes.filter(r => r.plugin !== pluginName);

      return true;
    } catch (error) {
      console.error(`❌ Error removing router for ${pluginName}:`, error.message);
      return false;
    }
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
    if (typeof handler === 'function') {
      return handler;
    }

    if (typeof handler === 'string') {
      const handlerPath = path.resolve(pluginPath, handler);
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

        // Include documentation metadata from manifest
        const docs = manifest.docs || plugin.docs || {};
        const docsMetadata = docs.apiReference ? {
          path: `plugins/@core/${name}/${docs.apiReference.path}`,
          title: docs.apiReference.title,
          icon: docs.apiReference.icon
        } : null;

        allPlugins.push({
          id: name,
          name: adminUI.navigation?.label || manifest.name || name,
          icon: adminUI.navigation?.icon || '🧩',
          priority: adminUI.navigation?.priority || 100,
          uiModulePath: webPath,
          navigation: adminUI.navigation,
          docs: docsMetadata,
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
        missing: [], // Handled by discovery service in higher layers
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
   * Reload a plugin without server restart (Story 6.3 - Hot-Reload)
   * 
   * Process:
   * 1. Deactivate plugin (removes routes, calls cleanup hooks)
   * 2. Clear require cache for plugin modules
   * 3. Reload plugin from disk
   * 4. Validate reloaded plugin
   * 5. Reactivate plugin (registers routes, calls activation hooks)
   * 
   * @param {string} pluginName - Name of the plugin to reload
   * @returns {Promise<Object>} Result object with success status and plugin data
   */
  async reloadPlugin(pluginName) {
    console.log(`🔄 [Hot-Reload] Starting reload of ${pluginName}...`);

    try {
      // 1. Verify plugin exists and is active
      const pluginData = this.activePlugins.get(pluginName);
      if (!pluginData) {
        throw new Error(`Plugin ${pluginName} is not active. Use 'enable' command instead.`);
      }

      const { config, path: pluginPath } = pluginData;

      // 2. Deactivate plugin (removes routes, clears cache, calls hooks)
      console.log(`🔄 [Hot-Reload] Deactivating ${pluginName}...`);
      await this.deactivatePlugin(pluginName);

      // Also remove from loadedPlugins to force fresh load
      this.loadedPlugins.delete(pluginName);

      // 3. Reload plugin from disk
      console.log(`🔄 [Hot-Reload] Reloading from disk...`);
      await this.loadPlugin(pluginName, config, false); // false = don't auto-activate yet

      // 4. Validate reloaded plugin
      const reloadedPluginData = this.loadedPlugins.get(pluginName);
      if (!reloadedPluginData) {
        throw new Error(`Failed to reload plugin ${pluginName} from disk`);
      }

      // 5. Reactivate plugin
      console.log(`🔄 [Hot-Reload] Reactivating ${pluginName}...`);
      await this.activatePlugin(pluginName);

      const reloadedPlugin = reloadedPluginData.plugin;
      console.log(`✅ [Hot-Reload] ${pluginName} reloaded successfully`);
      console.log(`   Version: ${reloadedPlugin.manifest.version}`);
      console.log(`   Routes: ${reloadedPlugin.routes ? reloadedPlugin.routes.length : 0}`);

      return {
        success: true,
        plugin: {
          name: pluginName,
          version: reloadedPlugin.manifest.version,
          routes: reloadedPlugin.routes ? reloadedPlugin.routes.length : 0
        }
      };

    } catch (error) {
      console.error(`❌ [Hot-Reload] Failed to reload ${pluginName}:`, error.message);

      // Mark as failed
      this.failedPlugins.set(pluginName, {
        error: error.message,
        stack: error.stack,
        timestamp: new Date(),
        phase: 'reload'
      });

      return {
        success: false,
        error: error.message
      };
    }
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
    this.failedPlugins.delete(pluginName);

    console.log(`🔇 Suppressed plugin: ${pluginName}`);
  }
}

module.exports = PluginManager;

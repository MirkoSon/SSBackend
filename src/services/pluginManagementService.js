const PluginManager = require('../plugins/PluginManager');
const { getConfigValue, updateConfig } = require('../utils/config');
const { getDatabase } = require('../db/database');
const fs = require('fs');
const path = require('path');

/**
 * Plugin Management Service
 * Provides a high-level interface for plugin management operations
 * Builds upon the existing PluginManager without modifying its core functionality
 */
class PluginManagementService {
  constructor() {
    // Get the singleton PluginManager instance if it exists
    // This ensures we work with the same instance used by the app
    this.pluginManager = null;
    this.db = null;
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

  /**
   * Get all plugins with their current status and metadata
   * @returns {Promise<Object>} Plugin status information
   */
  async getAllPluginsStatus() {
    await this.ensureInitialized();

    try {
      const config = getConfigValue('plugins', {});
      const result = {
        plugins: [],
        summary: {
          total: 0,
          enabled: 0,
          disabled: 0,
          internal: 0,
          external: 0
        },
        systemHealth: 'healthy'
      };

      // Get internal plugins
      const internalPluginsPath = path.join(process.cwd(), 'src', 'plugins', 'internal');
      const internalPlugins = await this.discoverInternalPlugins(internalPluginsPath);

      // Get external plugins
      const externalPluginsPath = path.join(process.cwd(), 'plugins');
      const externalPlugins = await this.discoverExternalPlugins(externalPluginsPath);

      // Combine all plugins
      const allPlugins = [...internalPlugins, ...externalPlugins];

      for (const plugin of allPlugins) {
        const pluginStatus = {
          id: plugin.name,
          name: plugin.name,
          type: plugin.type,
          enabled: config[plugin.name]?.enabled || false,
          version: plugin.version || '1.0.0',
          description: plugin.description || 'No description available',
          author: plugin.author || 'Unknown',
          dependencies: plugin.dependencies || [],
          adminUI: plugin.adminUI || null,
          metadata: {
            path: plugin.path,
            manifestPath: plugin.manifestPath,
            hasRoutes: plugin.hasRoutes || false,
            hasSchemas: plugin.hasSchemas || false
          }
        };

        result.plugins.push(pluginStatus);
        result.summary.total++;

        if (pluginStatus.enabled) {
          result.summary.enabled++;
        } else {
          result.summary.disabled++;
        }

        if (pluginStatus.type === 'internal') {
          result.summary.internal++;
        } else {
          result.summary.external++;
        }
      }

      return result;
    } catch (error) {
      console.error('❌ Error getting plugin status:', error.message);
      throw new Error(`Failed to get plugin status: ${error.message}`);
    }
  }

  /**
   * Discover internal plugins in the src/plugins/internal directory
   */
  async discoverInternalPlugins(internalPath) {
    const plugins = [];

    if (!fs.existsSync(internalPath)) {
      return plugins;
    }

    try {
      const pluginDirs = fs.readdirSync(internalPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const pluginName of pluginDirs) {
        const pluginPath = path.join(internalPath, pluginName);
        const indexPath = path.join(pluginPath, 'index.js');

        if (fs.existsSync(indexPath)) {
          try {
            // Clear require cache to get fresh data
            delete require.cache[require.resolve(indexPath)];
            const pluginModule = require(indexPath);

            plugins.push({
              name: pluginName,
              type: 'internal',
              path: pluginPath,
              manifestPath: indexPath,
              version: pluginModule.manifest?.version || '1.0.0',
              description: pluginModule.manifest?.description || `Internal ${pluginName} plugin`,
              author: pluginModule.manifest?.author || 'System',
              dependencies: pluginModule.manifest?.dependencies || [],
              adminUI: pluginModule.manifest?.adminUI || null,
              hasRoutes: pluginModule.routes !== undefined,
              hasSchemas: pluginModule.schemas !== undefined
            });
          } catch (error) {
            console.warn(`⚠️ Failed to load internal plugin ${pluginName}:`, error.message);
            // Add as discovered but with error state
            plugins.push({
              name: pluginName,
              type: 'internal',
              path: pluginPath,
              manifestPath: indexPath,
              version: 'unknown',
              description: `Plugin failed to load: ${error.message}`,
              author: 'Unknown',
              dependencies: [],
              adminUI: null,
              hasRoutes: false,
              hasSchemas: false,
              error: error.message
            });
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to discover internal plugins:', error.message);
    }

    return plugins;
  }

  /**
   * Discover external plugins in the plugins directory
   */
  async discoverExternalPlugins(externalPath) {
    const plugins = [];

    if (!fs.existsSync(externalPath)) {
      return plugins;
    }

    try {
      const dirents = fs.readdirSync(externalPath, { withFileTypes: true });

      const processDir = async (dirName, basePath) => {
        const pluginPath = path.join(basePath, dirName);
        const manifestPath = path.join(pluginPath, 'plugin.json');
        const indexPath = path.join(pluginPath, 'index.js');
        const pluginJsPath = path.join(pluginPath, 'plugin.js');

        if (fs.existsSync(manifestPath) || fs.existsSync(indexPath) || fs.existsSync(pluginJsPath)) {
          try {
            let manifest = {};
            if (fs.existsSync(manifestPath)) {
              const manifestData = fs.readFileSync(manifestPath, 'utf8');
              manifest = JSON.parse(manifestData);
            } else {
              // Try to load from index.js/plugin.js manifest property
              try {
                const entryPoint = fs.existsSync(indexPath) ? indexPath : pluginJsPath;
                delete require.cache[require.resolve(entryPoint)];
                const pluginModule = require(entryPoint);
                manifest = pluginModule.manifest || {};
              } catch (e) {
                // Ignore load errors for manifest extraction
              }
            }

            plugins.push({
              name: manifest.name || dirName,
              type: 'external',
              path: pluginPath,
              manifestPath: manifestPath,
              version: manifest.version || '1.0.0',
              description: manifest.description || `External ${dirName} plugin`,
              author: manifest.author || 'Unknown',
              dependencies: manifest.dependencies || [],
              adminUI: manifest.adminUI || null,
              hasRoutes: manifest.routes !== undefined || fs.existsSync(path.join(pluginPath, 'routes')),
              hasSchemas: manifest.schemas !== undefined || fs.existsSync(path.join(pluginPath, 'schemas'))
            });
          } catch (error) {
            console.warn(`⚠️ Failed to load external plugin ${dirName}:`, error.message);
            plugins.push({
              name: dirName,
              type: 'external',
              path: pluginPath,
              error: error.message
            });
          }
        } else if (dirName.startsWith('@')) {
          // Recurse into scoped directories
          const subDirents = fs.readdirSync(pluginPath, { withFileTypes: true })
            .filter(d => d.isDirectory() && !d.name.startsWith('.'));

          for (const subD of subDirents) {
            await processDir(subD.name, pluginPath);
          }
        }
      };

      for (const dirent of dirents) {
        if (dirent.isDirectory() && !dirent.name.startsWith('.')) {
          await processDir(dirent.name, externalPath);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to discover external plugins:', error.message);
    }

    return plugins;
  }

  /**
   * Get configuration for a specific plugin
   * @param {string} pluginId - Plugin identifier
   * @returns {Promise<Object>} Plugin configuration
   */
  async getPluginConfiguration(pluginId) {
    await this.ensureInitialized();

    try {
      const config = getConfigValue('plugins', {});
      const pluginConfig = config[pluginId] || {};

      return {
        pluginId: pluginId,
        enabled: pluginConfig.enabled || false,
        configuration: pluginConfig,
        lastModified: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Error getting plugin configuration for ${pluginId}:`, error.message);
      throw new Error(`Failed to get plugin configuration: ${error.message}`);
    }
  }

  /**
   * Update configuration for a specific plugin
   * @param {string} pluginId - Plugin identifier
   * @param {Object} newConfig - New configuration data
   * @returns {Promise<Object>} Updated configuration
   */
  async updatePluginConfiguration(pluginId, newConfig) {
    await this.ensureInitialized();

    try {
      // Get current configuration
      const currentConfig = getConfigValue('plugins', {});

      // Update the specific plugin configuration
      const updatedPluginConfig = {
        ...currentConfig[pluginId],
        ...newConfig,
        lastModified: new Date().toISOString()
      };

      // Update the full configuration
      const updatedConfig = {
        ...currentConfig,
        [pluginId]: updatedPluginConfig
      };

      // Write back to config file atomically
      await updateConfig('plugins', updatedConfig);

      // Log the configuration change for audit
      await this.logPluginAction('configure', pluginId, {
        previousConfig: currentConfig[pluginId],
        newConfig: updatedPluginConfig
      });

      return {
        pluginId: pluginId,
        configuration: updatedPluginConfig,
        updated: true
      };
    } catch (error) {
      console.error(`❌ Error updating plugin configuration for ${pluginId}:`, error.message);
      throw new Error(`Failed to update plugin configuration: ${error.message}`);
    }
  }

  /**
   * Enable a plugin with dependency resolution
   * @param {string} pluginId - Plugin identifier
   * @returns {Promise<Object>} Operation result
   */
  async enablePlugin(pluginId) {
    await this.ensureInitialized();

    try {
      // Get current configuration
      const config = getConfigValue('plugins', {});

      // Check if plugin exists
      const allPlugins = await this.getAllPluginsStatus();
      const targetPlugin = allPlugins.plugins.find(p => p.id === pluginId);

      if (!targetPlugin) {
        throw new Error(`Plugin '${pluginId}' not found`);
      }

      if (targetPlugin.enabled) {
        return {
          pluginId: pluginId,
          action: 'enable',
          success: true,
          message: 'Plugin is already enabled',
          alreadyEnabled: true
        };
      }

      // Check and resolve dependencies
      const dependencyCheck = await this.resolveDependencies(pluginId, 'enable');

      if (!dependencyCheck.canEnable) {
        throw new Error(`Cannot enable plugin: ${dependencyCheck.reason}`);
      }

      // Enable the plugin in configuration
      const updatedConfig = {
        ...config,
        [pluginId]: {
          ...config[pluginId],
          enabled: true,
          enabledAt: new Date().toISOString()
        }
      };

      // Also enable any required dependencies that aren't already enabled
      for (const dep of dependencyCheck.dependenciesToEnable) {
        updatedConfig[dep] = {
          ...updatedConfig[dep],
          enabled: true,
          enabledAt: new Date().toISOString(),
          enabledByDependency: pluginId
        };
      }

      // Update configuration atomically
      await updateConfig('plugins', updatedConfig);

      // Log the action
      await this.logPluginAction('enable', pluginId, {
        dependenciesEnabled: dependencyCheck.dependenciesToEnable
      });

      return {
        pluginId: pluginId,
        action: 'enable',
        success: true,
        message: 'Plugin enabled successfully',
        dependenciesEnabled: dependencyCheck.dependenciesToEnable
      };
    } catch (error) {
      console.error(`❌ Error enabling plugin ${pluginId}:`, error.message);
      await this.logPluginAction('enable_failed', pluginId, { error: error.message });
      throw new Error(`Failed to enable plugin: ${error.message}`);
    }
  }

  /**
   * Disable a plugin with dependent impact analysis
   * @param {string} pluginId - Plugin identifier
   * @returns {Promise<Object>} Operation result
   */
  async disablePlugin(pluginId) {
    await this.ensureInitialized();

    try {
      // Get current configuration
      const config = getConfigValue('plugins', {});

      // Check if plugin exists
      const allPlugins = await this.getAllPluginsStatus();
      const targetPlugin = allPlugins.plugins.find(p => p.id === pluginId);

      if (!targetPlugin) {
        throw new Error(`Plugin '${pluginId}' not found`);
      }

      if (!targetPlugin.enabled) {
        return {
          pluginId: pluginId,
          action: 'disable',
          success: true,
          message: 'Plugin is already disabled',
          alreadyDisabled: true
        };
      }

      // Check for dependent plugins
      const dependentCheck = await this.analyzeDependents(pluginId);

      if (dependentCheck.hasEnabledDependents) {
        // For now, we'll warn but allow disabling
        // In a more advanced implementation, we might force disable dependents
        console.warn(`⚠️ Disabling plugin ${pluginId} may affect: ${dependentCheck.enabledDependents.join(', ')}`);
      }

      // Disable the plugin in configuration
      const updatedConfig = {
        ...config,
        [pluginId]: {
          ...config[pluginId],
          enabled: false,
          disabledAt: new Date().toISOString()
        }
      };

      // Update configuration atomically
      await updateConfig('plugins', updatedConfig);

      // Log the action
      await this.logPluginAction('disable', pluginId, {
        affectedDependents: dependentCheck.enabledDependents
      });

      return {
        pluginId: pluginId,
        action: 'disable',
        success: true,
        message: 'Plugin disabled successfully',
        affectedDependents: dependentCheck.enabledDependents
      };
    } catch (error) {
      console.error(`❌ Error disabling plugin ${pluginId}:`, error.message);
      await this.logPluginAction('disable_failed', pluginId, { error: error.message });
      throw new Error(`Failed to disable plugin: ${error.message}`);
    }
  }

  /**
   * Resolve dependencies for a plugin
   * @param {string} pluginId - Plugin identifier
   * @param {string} action - Action being performed (enable/disable)
   * @returns {Promise<Object>} Dependency resolution result
   */
  async resolveDependencies(pluginId, action) {
    const allPlugins = await this.getAllPluginsStatus();
    const targetPlugin = allPlugins.plugins.find(p => p.id === pluginId);

    if (!targetPlugin) {
      return { canEnable: false, reason: 'Plugin not found' };
    }

    const dependencies = targetPlugin.dependencies || [];
    const dependenciesToEnable = [];

    for (const depName of dependencies) {
      const depPlugin = allPlugins.plugins.find(p => p.id === depName);

      if (!depPlugin) {
        return {
          canEnable: false,
          reason: `Required dependency '${depName}' not found`
        };
      }

      if (!depPlugin.enabled) {
        dependenciesToEnable.push(depName);
      }
    }

    return {
      canEnable: true,
      dependenciesToEnable: dependenciesToEnable,
      allDependencies: dependencies
    };
  }

  /**
   * Analyze plugins that depend on this plugin
   * @param {string} pluginId - Plugin identifier
   * @returns {Promise<Object>} Dependent analysis result
   */
  async analyzeDependents(pluginId) {
    const allPlugins = await this.getAllPluginsStatus();
    const enabledDependents = [];
    const allDependents = [];

    for (const plugin of allPlugins.plugins) {
      if (plugin.dependencies && plugin.dependencies.includes(pluginId)) {
        allDependents.push(plugin.id);
        if (plugin.enabled) {
          enabledDependents.push(plugin.id);
        }
      }
    }

    return {
      hasEnabledDependents: enabledDependents.length > 0,
      enabledDependents: enabledDependents,
      allDependents: allDependents
    };
  }

  /**
   * Validate the entire plugin system for consistency and health
   * @returns {Promise<Object>} Validation result
   */
  async validatePluginSystem() {
    await this.ensureInitialized();

    try {
      const validation = {
        valid: true,
        issues: [],
        warnings: [],
        summary: {
          totalPlugins: 0,
          enabledPlugins: 0,
          issuesFound: 0,
          warningsFound: 0
        }
      };

      const allPlugins = await this.getAllPluginsStatus();
      validation.summary.totalPlugins = allPlugins.plugins.length;
      validation.summary.enabledPlugins = allPlugins.plugins.filter(p => p.enabled).length;

      // Check each plugin
      for (const plugin of allPlugins.plugins) {
        // Check for errors in plugin loading
        if (plugin.error) {
          validation.issues.push({
            type: 'plugin_load_error',
            plugin: plugin.id,
            message: `Plugin failed to load: ${plugin.error}`
          });
          validation.valid = false;
        }

        // Check dependencies
        if (plugin.enabled && plugin.dependencies) {
          for (const depName of plugin.dependencies) {
            const depPlugin = allPlugins.plugins.find(p => p.id === depName);

            if (!depPlugin) {
              validation.issues.push({
                type: 'missing_dependency',
                plugin: plugin.id,
                message: `Missing dependency: ${depName}`
              });
              validation.valid = false;
            } else if (!depPlugin.enabled) {
              validation.warnings.push({
                type: 'disabled_dependency',
                plugin: plugin.id,
                message: `Dependency '${depName}' is disabled`
              });
            }
          }
        }
      }

      validation.summary.issuesFound = validation.issues.length;
      validation.summary.warningsFound = validation.warnings.length;

      return validation;
    } catch (error) {
      console.error('❌ Error validating plugin system:', error.message);
      return {
        valid: false,
        issues: [{
          type: 'validation_error',
          message: `Validation failed: ${error.message}`
        }],
        warnings: [],
        summary: {
          totalPlugins: 0,
          enabledPlugins: 0,
          issuesFound: 1,
          warningsFound: 0
        }
      };
    }
  }

  /**
   * Log plugin management actions for audit trail
   * @param {string} action - Action performed
   * @param {string} pluginName - Plugin name
   * @param {Object} details - Additional details
   * @param {string} adminUser - Admin user identifier
   */
  async logPluginAction(action, pluginName, details = {}, adminUser = 'system') {
    try {
      // For now, we'll log to console and optionally to database if audit table exists
      const logEntry = {
        timestamp: new Date().toISOString(),
        action: action,
        plugin_name: pluginName,
        admin_user: adminUser,
        details: JSON.stringify(details)
      };

      console.log(`🔍 Plugin Audit: ${action} - ${pluginName} by ${adminUser}`);

      // Try to log to database if audit table exists
      try {
        await new Promise((resolve, reject) => {
          this.db.run(
            `INSERT INTO plugin_audit_log (action, plugin_name, admin_user, details) VALUES (?, ?, ?, ?)`,
            [logEntry.action, logEntry.plugin_name, logEntry.admin_user, logEntry.details],
            function (err) {
              if (err) {
                // Table might not exist yet, that's OK for now
                console.log('📝 Plugin audit log saved to console only (database table not ready)');
                resolve();
              } else {
                console.log('📝 Plugin audit log saved to database');
                resolve();
              }
            }
          );
        });
      } catch (dbError) {
        // Database logging is optional for now
        console.log('📝 Plugin audit log saved to console only');
      }
    } catch (error) {
      console.error('❌ Failed to log plugin action:', error.message);
    }
  }
}

module.exports = PluginManagementService;

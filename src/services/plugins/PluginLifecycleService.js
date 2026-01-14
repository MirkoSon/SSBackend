const { getConfigValue, updateConfig } = require('../../utils/config');
const path = require('path');

/**
 * Plugin Lifecycle Service
 * Handles plugin enabling, disabling, toggling, and reload operations
 * with dependency resolution and audit logging.
 */
class PluginLifecycleService {
    /**
     * @param {Object} db - Database instance
     * @param {Object} discoveryService - Instance of PluginDiscoveryService
     */
    constructor(db, discoveryService) {
        this.db = db;
        this.discoveryService = discoveryService;
    }

    /**
     * Enable a plugin with dependency resolution
     * @param {string} pluginId - Plugin identifier
     * @param {string} adminUser - Admin user performing the action
     * @returns {Promise<Object>} Operation result
     */
    async enablePlugin(pluginId, adminUser = 'system') {
        try {
            // Get current configuration
            const config = getConfigValue('plugins', {});

            // Check if plugin exists
            const allPlugins = await this.discoveryService.getSystemStatus();
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
            const dependencyCheck = await this.resolveDependencies(pluginId, allPlugins);

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
            }, adminUser);

            return {
                pluginId: pluginId,
                action: 'enable',
                success: true,
                message: 'Plugin enabled successfully',
                dependenciesEnabled: dependencyCheck.dependenciesToEnable
            };
        } catch (error) {
            console.error(`❌ Error enabling plugin ${pluginId}:`, error.message);
            await this.logPluginAction('enable_failed', pluginId, { error: error.message }, adminUser);
            throw new Error(`Failed to enable plugin: ${error.message}`);
        }
    }

    /**
     * Disable a plugin with dependent impact analysis
     * @param {string} pluginId - Plugin identifier
     * @param {string} adminUser - Admin user performing the action
     * @returns {Promise<Object>} Operation result
     */
    async disablePlugin(pluginId, adminUser = 'system') {
        try {
            // Get current configuration
            const config = getConfigValue('plugins', {});

            // Check if plugin exists
            const allPlugins = await this.discoveryService.getSystemStatus();
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
            const dependentCheck = await this.analyzeDependents(pluginId, allPlugins);

            if (dependentCheck.hasEnabledDependents) {
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
            }, adminUser);

            return {
                pluginId: pluginId,
                action: 'disable',
                success: true,
                message: 'Plugin disabled successfully',
                affectedDependents: dependentCheck.enabledDependents
            };
        } catch (error) {
            console.error(`❌ Error disabling plugin ${pluginId}:`, error.message);
            await this.logPluginAction('disable_failed', pluginId, { error: error.message }, adminUser);
            throw new Error(`Failed to disable plugin: ${error.message}`);
        }
    }

    /**
     * Toggle a plugin's enabled status
     * @param {string} pluginId 
     * @param {string} adminUser 
     */
    async togglePlugin(pluginId, adminUser = 'system') {
        const allPlugins = await this.discoveryService.getSystemStatus();
        const targetPlugin = allPlugins.plugins.find(p => p.id === pluginId);

        if (!targetPlugin) {
            throw new Error(`Plugin '${pluginId}' not found`);
        }

        if (targetPlugin.enabled) {
            return this.disablePlugin(pluginId, adminUser);
        } else {
            return this.enablePlugin(pluginId, adminUser);
        }
    }

    /**
     * Reload a plugin (disable then enable)
     * @param {string} pluginId 
     * @param {string} adminUser 
     */
    async reloadPlugin(pluginId, adminUser = 'system') {
        await this.disablePlugin(pluginId, adminUser);
        return this.enablePlugin(pluginId, adminUser);
    }

    /**
     * Resolve dependencies for a plugin
     * @param {string} pluginId 
     * @param {Object} allPluginsStatus 
     */
    async resolveDependencies(pluginId, allPluginsStatus) {
        const targetPlugin = allPluginsStatus.plugins.find(p => p.id === pluginId);

        if (!targetPlugin) {
            return { canEnable: false, reason: 'Plugin not found' };
        }

        const dependencies = targetPlugin.dependencies || [];
        const dependenciesToEnable = [];

        for (const depName of dependencies) {
            const depPlugin = allPluginsStatus.plugins.find(p => p.id === depName);

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
     * @param {string} pluginId 
     * @param {Object} allPluginsStatus 
     */
    async analyzeDependents(pluginId, allPluginsStatus) {
        const enabledDependents = [];
        const allDependents = [];

        for (const plugin of allPluginsStatus.plugins) {
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
     * Log plugin management actions for audit trail
     */
    async logPluginAction(action, pluginName, details = {}, adminUser = 'system') {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                action: action,
                plugin_name: pluginName,
                admin_user: adminUser,
                details: JSON.stringify(details)
            };

            console.log(`🔍 Plugin Audit: ${action} - ${pluginName} by ${adminUser}`);

            if (!this.db) return;

            try {
                await new Promise((resolve) => {
                    this.db.run(
                        `INSERT INTO plugin_audit_log (action, plugin_name, admin_user, details) VALUES (?, ?, ?, ?)`,
                        [logEntry.action, logEntry.plugin_name, logEntry.admin_user, logEntry.details],
                        function (err) {
                            if (err) {
                                console.log('📝 Plugin audit log saved to console only (database table not ready)');
                            } else {
                                console.log('📝 Plugin audit log saved to database');
                            }
                            resolve();
                        }
                    );
                });
            } catch (dbError) {
                console.log('📝 Plugin audit log saved to console only');
            }
        } catch (error) {
            console.error('❌ Failed to log plugin action:', error.message);
        }
    }
}

module.exports = PluginLifecycleService;

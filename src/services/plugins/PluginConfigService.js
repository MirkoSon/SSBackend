const { getConfigValue, updateConfig, getProjectConfig, updateProjectConfig } = require('../../utils/config');

/**
 * Plugin Config Service
 * Handles plugin configuration retrieval, updates, and validation.
 */
class PluginConfigService {
    /**
     * @param {Object} discoveryService - Instance of PluginDiscoveryService
     * @param {Object} lifecycleService - Instance of PluginLifecycleService (for logging)
     * @param {string} projectId - Project identifier
     */
    constructor(discoveryService, lifecycleService, projectId = 'default') {
        this.discoveryService = discoveryService;
        this.lifecycleService = lifecycleService;
        this.projectId = projectId;
    }

    /**
     * Get the current project's plugin configuration
     * @private
     */
    _getPluginConfig() {
        if (this.projectId === 'default') {
            return getConfigValue('plugins', {});
        }
        const projectConfig = getProjectConfig(this.projectId);
        return projectConfig ? projectConfig.plugins : {};
    }

    /**
     * Update the current project's plugin configuration
     * @private
     */
    async _updatePluginConfig(newConfig) {
        if (this.projectId === 'default') {
            await updateConfig('plugins', newConfig);
        } else {
            await updateProjectConfig(this.projectId, 'plugins', newConfig);
        }
    }

    /**
     * Get configuration for a specific plugin
     * @param {string} pluginId 
     * @returns {Promise<Object>}
     */
    async getPluginConfig(pluginId) {
        const config = this._getPluginConfig();
        const pluginConfig = config[pluginId] || {};

        return {
            pluginId: pluginId,
            enabled: pluginConfig.enabled || false,
            configuration: pluginConfig,
            lastModified: pluginConfig.lastModified || new Date().toISOString()
        };
    }

    /**
     * Update configuration for a specific plugin
     * @param {string} pluginId 
     * @param {Object} newConfig 
     * @param {string} adminUser 
     */
    async updatePluginConfig(pluginId, newConfig, adminUser = 'system') {
        try {
            // Get current configuration
            const fullConfig = this._getPluginConfig();
            const currentPluginConfig = fullConfig[pluginId];

            if (!currentPluginConfig) {
                throw new Error(`Plugin '${pluginId}' not found in configuration`);
            }

            // Get plugin metadata to find its schema
            const status = await this.discoveryService.getSystemStatus(fullConfig);
            const pluginMetadata = status.plugins.find(p => p.id === pluginId);

            // TODO: In Story 3.4.2, implement full JSON schema validation here
            // using pluginMetadata.configSchema if it exists

            // Prepare the updated configuration
            // If the plugin has a 'settings' block, we merge into it
            let updatedPluginConfig;
            if (currentPluginConfig.settings && typeof currentPluginConfig.settings === 'object') {
                updatedPluginConfig = {
                    ...currentPluginConfig,
                    settings: {
                        ...currentPluginConfig.settings,
                        ...newConfig
                    },
                    lastModified: new Date().toISOString()
                };
            } else {
                updatedPluginConfig = {
                    ...currentPluginConfig,
                    ...newConfig,
                    lastModified: new Date().toISOString()
                };
            }

            // Update the full configuration object
            const updatedFullConfig = {
                ...fullConfig,
                [pluginId]: updatedPluginConfig
            };

            // Write back to config file
            await this._updatePluginConfig(updatedFullConfig);

            // Log the action via lifecycle service
            if (this.lifecycleService) {
                await this.lifecycleService.logPluginAction('configure', pluginId, {
                    previousConfig: currentPluginConfig,
                    newConfig: updatedPluginConfig
                }, adminUser);
            }

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
     * Get configuration schema for a plugin
     * @param {string} pluginId 
     */
    async getPluginSchema(pluginId) {
        const config = this._getPluginConfig();
        const status = await this.discoveryService.getSystemStatus(config);
        const plugin = status.plugins.find(p => p.id === pluginId);

        if (!plugin) {
            throw new Error(`Plugin '${pluginId}' not found`);
        }

        // Many plugins define their schema in the manifest
        // Return it for UI generation
        return {
            pluginId: pluginId,
            schema: plugin.configSchema || null
        };
    }
}

module.exports = PluginConfigService;

const { getConfigValue, updateConfig } = require('../../utils/config');

/**
 * Plugin Config Service
 * Handles plugin configuration retrieval, updates, and validation.
 */
class PluginConfigService {
    /**
     * @param {Object} discoveryService - Instance of PluginDiscoveryService
     * @param {Object} lifecycleService - Instance of PluginLifecycleService (for logging)
     */
    constructor(discoveryService, lifecycleService) {
        this.discoveryService = discoveryService;
        this.lifecycleService = lifecycleService;
    }

    /**
     * Get configuration for a specific plugin
     * @param {string} pluginId 
     * @returns {Promise<Object>}
     */
    async getPluginConfig(pluginId) {
        const config = getConfigValue('plugins', {});
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
            const fullConfig = getConfigValue('plugins', {});
            const currentPluginConfig = fullConfig[pluginId];

            if (!currentPluginConfig) {
                throw new Error(`Plugin '${pluginId}' not found in configuration`);
            }

            // Get plugin metadata to find its schema
            const status = await this.discoveryService.getSystemStatus();
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
            await updateConfig('plugins', updatedFullConfig);

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
        const status = await this.discoveryService.getSystemStatus();
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

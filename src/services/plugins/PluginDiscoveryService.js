const fs = require('fs');
const path = require('path');
const { getConfigValue, updateConfig } = require('../../utils/config');
const PluginValidator = require('../../plugins/PluginValidator');

/**
 * PluginDiscoveryService - Handles finding and identifying plugins on disk
 * Extracts logic from PluginManager and PluginManagementService to provide
 * a unified discovery mechanism.
 */
class PluginDiscoveryService {
    /**
     * @param {Object} options - Service options
     */
    constructor(options = {}) {
        this.pluginDir = options.pluginDir || path.join(process.cwd(), 'plugins');
        // Core plugins are actually in plugins/@core
        this.internalPluginDir = options.internalPluginDir || path.join(this.pluginDir, '@core');
        this.fallbackInternalDir = path.join(process.cwd(), 'src', 'plugins', 'internal');
        this.validator = options.validator || new PluginValidator();
    }

    /**
     * @param {Object} projectPluginConfig - Optional project-specific plugin config
     * @returns {Promise<Object>} Unified status report
     */
    async getSystemStatus(projectPluginConfig = null) {
        const pluginConfig = projectPluginConfig || getConfigValue('plugins', {});
        const internalPlugins = await this.discoverInternalPlugins();
        const externalPlugins = await this.discoverExternalPlugins();
        const allPlugins = [...internalPlugins, ...externalPlugins];

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

        // Create a map of paths to config keys to help matching
        const pathToKey = {};
        for (const [key, config] of Object.entries(pluginConfig)) {
            if (config && typeof config === 'object' && config.path) {
                // Normalize and lowercase path for cross-platform comparison
                const normalizedPath = path.resolve(config.path).toLowerCase();
                pathToKey[normalizedPath] = key;
            }
        }

        for (const plugin of allPlugins) {
            const normalizedPluginPath = path.resolve(plugin.path).toLowerCase();
            const configKey = pathToKey[normalizedPluginPath] || plugin.name;
            const isEnabled = pluginConfig[configKey]?.enabled || false;

            const pluginStatus = {
                id: configKey,
                name: plugin.name,
                type: plugin.type,
                enabled: isEnabled,
                version: plugin.version || '1.0.0',
                description: plugin.description || 'No description available',
                author: plugin.author || 'Unknown',
                dependencies: plugin.dependencies || [],
                adminUI: plugin.adminUI || null,
                configSchema: plugin.configSchema || null,
                metadata: {
                    path: plugin.path,
                    manifestPath: plugin.manifestPath,
                    hasRoutes: plugin.hasRoutes || false,
                    hasSchemas: plugin.hasSchemas || false
                }
            };

            if (plugin.error) {
                pluginStatus.error = plugin.error;
                result.systemHealth = 'degraded';
            }

            result.plugins.push(pluginStatus);
            result.summary.total++;

            if (isEnabled) result.summary.enabled++;
            else result.summary.disabled++;

            if (plugin.type === 'internal') result.summary.internal++;
            else result.summary.external++;
        }

        return result;
    }

    /**
     * Validate the entire plugin system for consistency and health
     * @param {Object} projectPluginConfig - Optional project-specific plugin config
     * @returns {Promise<Object>} Validation result
     */
    async validatePluginSystem(projectPluginConfig = null) {
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

            const allPlugins = await this.getSystemStatus(projectPluginConfig);
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
     * Discover internal plugins
     */
    async discoverInternalPlugins() {
        const plugins = await this._scanDirectory(this.internalPluginDir, 'internal');

        // Also scan fallback internal directory
        if (fs.existsSync(this.fallbackInternalDir) && this.fallbackInternalDir !== this.internalPluginDir) {
            const fallbackPlugins = await this._scanDirectory(this.fallbackInternalDir, 'internal');
            plugins.push(...fallbackPlugins);
        }

        return plugins;
    }

    /**
     * Discover external plugins
     */
    async discoverExternalPlugins() {
        if (!fs.existsSync(this.pluginDir)) return [];
        return this._scanDirectory(this.pluginDir, 'external', { recursive: true });
    }

    /**
     * Low-level directory scanner
     * @private
     */
    async _scanDirectory(basePath, type, options = {}) {
        const plugins = [];
        if (!fs.existsSync(basePath)) return plugins;

        try {
            const dirents = fs.readdirSync(basePath, { withFileTypes: true });

            for (const dirent of dirents) {
                if (!dirent.isDirectory() || dirent.name.startsWith('.')) continue;

                if (type === 'external' && basePath === this.pluginDir && dirent.name.startsWith('@core')) continue;

                const pluginPath = path.join(basePath, dirent.name);

                if (dirent.name.startsWith('@') && options.recursive) {
                    const subPlugins = await this._scanDirectory(pluginPath, type, { recursive: false });
                    plugins.push(...subPlugins);
                    continue;
                }

                const metadata = await this._readPluginMetadata(pluginPath, type, dirent.name);
                if (metadata) {
                    plugins.push(metadata);
                }
            }
        } catch (error) {
            console.warn(`⚠️ Error scanning ${basePath}:`, error.message);
        }

        return plugins;
    }

    /**
     * Read plugin manifest and metadata
     * @private
     */
    async _readPluginMetadata(pluginPath, type, dirName) {
        const manifestPath = path.join(pluginPath, 'plugin.json');
        const indexPath = path.join(pluginPath, 'index.js');
        const pluginJsPath = path.join(pluginPath, 'plugin.js');

        if (!fs.existsSync(manifestPath) && !fs.existsSync(indexPath) && !fs.existsSync(pluginJsPath)) {
            return null;
        }

        try {
            let manifest = {};
            let hasSchemas = fs.existsSync(path.join(pluginPath, 'schemas'));
            let hasRoutes = fs.existsSync(path.join(pluginPath, 'routes'));
            let entryPoint = null;

            if (fs.existsSync(manifestPath)) {
                manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            }

            if (fs.existsSync(indexPath)) entryPoint = indexPath;
            else if (fs.existsSync(pluginJsPath)) entryPoint = pluginJsPath;

            if (entryPoint) {
                try {
                    delete require.cache[require.resolve(entryPoint)];
                    const pluginModule = require(entryPoint);

                    manifest = { ...pluginModule.manifest, ...manifest };
                    if (pluginModule.schemas) hasSchemas = true;
                    if (pluginModule.routes) hasRoutes = true;
                } catch (e) {
                    return {
                        name: dirName,
                        type,
                        path: pluginPath,
                        error: e.message
                    };
                }
            }

            return {
                name: manifest.name || dirName,
                type,
                path: pluginPath,
                manifestPath: manifestPath || entryPoint,
                version: manifest.version || '1.0.0',
                description: manifest.description || `${type === 'internal' ? 'Internal' : 'External'} ${dirName} plugin`,
                author: manifest.author || (type === 'internal' ? 'System' : 'Unknown'),
                dependencies: manifest.dependencies || [],
                adminUI: manifest.adminUI || null,
                configSchema: manifest.configSchema || null,
                hasRoutes,
                hasSchemas
            };
        } catch (error) {
            return {
                name: dirName,
                type,
                path: pluginPath,
                error: error.message
            };
        }
    }

    /**
     * Check for reinstalled suppressed plugins
     * @param {Object} projectPluginConfig - Optional project-specific plugin config
     * @param {Function} updateCallback - Function to call with updated config
     */
    async checkSuppressedPlugins(projectPluginConfig = null, updateCallback = null) {
        const pluginConfig = projectPluginConfig || getConfigValue('plugins', {});
        const SETTING_KEYS = ['enabled', 'auto_discover', 'auto_enable_discovered', 'watch_for_changes'];
        let changed = false;

        for (const [pluginName, config] of Object.entries(pluginConfig)) {
            if (SETTING_KEYS.includes(pluginName)) continue;
            if (typeof config !== 'object' || config === null) continue;

            if (config.suppressed === true) {
                const pluginPath = config.path || path.join(this.pluginDir, pluginName);
                const indexPath = path.join(pluginPath, 'index.js');
                const pluginJsPath = path.join(pluginPath, 'plugin.js');

                if (fs.existsSync(indexPath) || fs.existsSync(pluginJsPath)) {
                    console.log(`🔄 Plugin ${pluginName} has been reinstalled, unsuppressing...`);
                    pluginConfig[pluginName].suppressed = false;
                    pluginConfig[pluginName].enabled = true;
                    changed = true;
                }
            }
        }

        if (changed) {
            if (updateCallback) {
                await updateCallback(pluginConfig);
            } else {
                await updateConfig('plugins', pluginConfig);
            }
        }
    }

    /**
     * Register new external plugins into the config
     * @param {Object} projectPluginConfig - Optional project-specific plugin config
     * @param {Function} updateCallback - Function to call with updated config
     */
    async registerNewPlugins(projectPluginConfig = null, updateCallback = null) {
        const pluginConfig = projectPluginConfig || getConfigValue('plugins', {});
        const autoEnable = projectPluginConfig
            ? (projectPluginConfig.auto_enable_discovered !== undefined ? projectPluginConfig.auto_enable_discovered : true)
            : getConfigValue('plugins.auto_enable_discovered', true);
        const externalPlugins = await this.discoverExternalPlugins();
        let changed = false;

        const existingPaths = new Set();
        for (const [key, config] of Object.entries(pluginConfig)) {
            if (config && typeof config === 'object' && config.path) {
                existingPaths.add(path.resolve(config.path).toLowerCase());
            }
        }

        for (const plugin of externalPlugins) {
            const normalizedPath = path.resolve(plugin.path).toLowerCase();

            if (!pluginConfig[plugin.name] && !existingPaths.has(normalizedPath) && !plugin.error) {
                console.log(`🆕 Discovered new external plugin: ${plugin.name}`);

                const validationResult = this.validator.validateManifest ?
                    this.validator.validateManifest(plugin) : { valid: true };

                if (validationResult.valid) {
                    pluginConfig[plugin.name] = {
                        enabled: autoEnable,
                        type: 'external',
                        path: plugin.path
                    };
                    changed = true;
                    existingPaths.add(normalizedPath);
                    console.log(`✅ Auto-registered external plugin: ${plugin.name} (Enabled: ${autoEnable})`);
                } else {
                    console.warn(`⚠️ Skipping registration for ${plugin.name}: Validation failed.`);
                }
            }
        }

        if (changed) {
            if (updateCallback) {
                await updateCallback(pluginConfig);
            } else {
                await updateConfig('plugins', pluginConfig);
            }
        }
    }
}

module.exports = PluginDiscoveryService;

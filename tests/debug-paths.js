const PluginDiscoveryService = require('../src/services/plugins/PluginDiscoveryService');
const path = require('path');
const { loadConfig, getConfigValue } = require('../src/utils/config');

async function debugPaths() {
    loadConfig();
    const service = new PluginDiscoveryService();
    const pluginConfig = getConfigValue('plugins', {});

    console.log('--- Config Paths ---');
    for (const [key, config] of Object.entries(pluginConfig)) {
        if (config && typeof config === 'object' && config.path) {
            console.log(`${key}: ${config.path} -> RESOLVED: ${path.resolve(config.path)}`);
        }
    }

    console.log('\n--- Discovered Paths ---');
    const external = await service.discoverExternalPlugins();
    external.forEach(p => {
        console.log(`${p.name}: ${p.path} -> RESOLVED: ${path.resolve(p.path)}`);
    });

    const status = await service.getSystemStatus();
    console.log('\n--- Match Results ---');
    status.plugins.forEach(p => {
        console.log(`Plugin: ${p.name}, ID: ${p.id}, Enabled: ${p.enabled}`);
    });
}

debugPaths().catch(console.error);

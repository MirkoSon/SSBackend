const PluginDiscoveryService = require('../src/services/plugins/PluginDiscoveryService');
const path = require('path');
const fs = require('fs');
const { loadConfig } = require('../src/utils/config');

async function debugDiscovery() {
    loadConfig();
    const service = new PluginDiscoveryService();

    console.log('--- Paths ---');
    console.log('Plugin Dir:', service.pluginDir);
    console.log('Internal Dir:', service.internalPluginDir);
    console.log('Fallback Internal Dir:', service.fallbackInternalDir);

    console.log('\n--- Internal Scan ---');
    const internal = await service.discoverInternalPlugins();
    console.log('Internal Count:', internal.length);
    internal.forEach(p => console.log(`Found internal: ${p.name}`));

    console.log('\n--- External Scan ---');
    const external = await service.discoverExternalPlugins();
    console.log('External Count:', external.length);
    external.forEach(p => console.log(`Found external: ${p.name}`));
}

debugDiscovery().catch(console.error);

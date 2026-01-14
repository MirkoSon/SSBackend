const PluginDiscoveryService = require('../src/services/plugins/PluginDiscoveryService');
const path = require('path');
const fs = require('fs');
const { loadConfig } = require('../src/utils/config');

async function testDiscovery() {
    console.log('🧪 Testing PluginDiscoveryService...');

    // Load configuration
    loadConfig();

    const service = new PluginDiscoveryService({
        pluginDir: path.join(process.cwd(), 'plugins'),
        internalPluginDir: path.join(process.cwd(), 'src', 'plugins', 'internal')
    });

    try {
        console.log('1. Testing System Status Discovery...');
        const status = await service.getSystemStatus();
        console.log(`   Found ${status.plugins.length} plugins in total.`);
        console.log(`   Health: ${status.systemHealth}`);

        console.log('2. Testing Internal Plugin Discovery...');
        const internal = await service.discoverInternalPlugins();
        console.log(`   Found ${internal.length} internal plugins.`);
        internal.forEach(p => console.log(`   - ${p.name} (${p.type})`));

        console.log('3. Testing External Plugin Discovery...');
        const external = await service.discoverExternalPlugins();
        console.log(`   Found ${external.length} external plugins.`);
        external.forEach(p => console.log(`   - ${p.name} (${p.type})`));

        // Test a specific manifest read
        console.log('4. Testing Manifest Reading (Economy)...');
        const economyPath = path.join(process.cwd(), 'plugins', '@core', 'economy');
        const metadata = await service._readPluginMetadata(economyPath, 'external', 'economy');
        if (metadata && metadata.name === 'economy') {
            console.log('   ✅ Successfully read economy manifest.');
        } else {
            console.error('   ❌ Failed to read economy manifest.');
        }

        console.log('\n✅ All discovery tests passed!');
    } catch (error) {
        console.error('❌ Discovery test failed:', error);
        process.exit(1)
    }
}

testDiscovery();

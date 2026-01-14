const PluginManagementService = require('../src/services/pluginManagementService');
const { loadConfig } = require('../src/utils/config');
const { initializeDatabase } = require('../src/db/database');

async function testLifecycle() {
    loadConfig();
    await initializeDatabase();
    const service = new PluginManagementService();
    await service.initialize();

    console.log('--- Current Status ---');
    let status = await service.getAllPluginsStatus();
    let hw = status.plugins.find(p => p.id === 'hello-world');
    console.log(`Hello World Status: ${hw.enabled ? 'Enabled' : 'Disabled'}`);

    console.log('\n--- Disabling Hello World ---');
    await service.disablePlugin('hello-world');
    status = await service.getAllPluginsStatus();
    hw = status.plugins.find(p => p.id === 'hello-world');
    console.log(`Hello World Status: ${hw.enabled ? 'Enabled' : 'Disabled'}`);

    console.log('\n--- Enabling Hello World ---');
    await service.enablePlugin('hello-world');
    status = await service.getAllPluginsStatus();
    hw = status.plugins.find(p => p.id === 'hello-world');
    console.log(`Hello World Status: ${hw.enabled ? 'Enabled' : 'Disabled'}`);

    console.log('\n--- Toggling Hello World ---');
    await service.togglePlugin('hello-world');
    status = await service.getAllPluginsStatus();
    hw = status.plugins.find(p => p.id === 'hello-world');
    console.log(`Hello World Status: ${hw.enabled ? 'Enabled' : 'Disabled'}`);

    // Restore state
    if (!hw.enabled) {
        console.log('Restoring to enabled...');
        await service.enablePlugin('hello-world');
    }
}

testLifecycle().catch(console.error);

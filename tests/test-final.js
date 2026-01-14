const PluginManagementService = require('../src/services/pluginManagementService');
const { loadConfig } = require('../src/utils/config');
const { initializeDatabase } = require('../src/db/database');

async function verifyAll() {
    loadConfig();
    await initializeDatabase();
    const service = new PluginManagementService();
    await service.initialize();

    console.log('--- System Validation ---');
    const validation = await service.validatePluginSystem();
    console.log(`System is valid: ${validation.valid}`);
    console.log(`Total Plugins: ${validation.summary.totalPlugins}`);
    console.log(`Issues: ${validation.summary.issuesFound}`);
    console.log(`Warnings: ${validation.summary.warningsFound}`);

    if (validation.issues.length > 0) {
        console.log('Issues:', JSON.stringify(validation.issues, null, 2));
    }

    console.log('\n--- Cleanup Status ---');
    const status = await service.getAllPluginsStatus();
    const notesPlugin = status.plugins.find(p => p.id === 'full-featured' || p.name === 'notes');
    console.log(`Notes (full-featured) status: ${notesPlugin ? notesPlugin.enabled : 'Not found'}`);
    console.log(`Notes Schema revealed: ${notesPlugin && notesPlugin.configSchema ? 'Yes' : 'No'}`);
}

verifyAll().catch(console.error);

const PluginManagementService = require('../src/services/pluginManagementService');
const { loadConfig } = require('../src/utils/config');
const { initializeDatabase } = require('../src/db/database');

async function testConfig() {
    loadConfig();
    await initializeDatabase();
    const service = new PluginManagementService();
    await service.initialize();

    console.log('--- Initial Config (Achievements) ---');
    let config = await service.getPluginConfiguration('achievements');
    console.log(JSON.stringify(config, null, 2));

    console.log('\n--- Schema (Achievements) ---');
    let schema = await service.getPluginSchema('achievements');
    console.log(JSON.stringify(schema, null, 2));

    console.log('\n--- Updating Config (achievements: autoCheck -> toggle) ---');
    const currentVal = config.configuration.settings ? config.configuration.settings.autoCheck : true;
    await service.updatePluginConfiguration('achievements', { autoCheck: !currentVal });

    let updatedConfig = await service.getPluginConfiguration('achievements');
    const newVal = updatedConfig.configuration.settings ? updatedConfig.configuration.settings.autoCheck : 'missing';
    console.log(`AutoCheck is now: ${newVal}`);

    // Verify audit log entry
    const db = require('../src/db/database').getDatabase();
    const log = await new Promise((resolve) => {
        db.get('SELECT * FROM plugin_audit_log WHERE plugin_name = ? ORDER BY timestamp DESC LIMIT 1', ['achievements'], (err, row) => {
            resolve(row);
        });
    });
    console.log(`\n--- Verification Audit Log ---`);
    console.log(`Action: ${log.action}, Details: ${log.details}`);
}

testConfig().catch(console.error);

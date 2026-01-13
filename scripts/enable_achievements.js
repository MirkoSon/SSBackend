const { loadConfig, updateConfig } = require('../src/utils/config');
const path = require('path');

const configPath = path.join(__dirname, '../config.yml');

console.log('🔧 Configuring Achievements Plugin...');

try {
    loadConfig(configPath);

    console.log('Enabling achievements plugin...');
    updateConfig('plugins.achievements.enabled', true, configPath);

    // Also ensure type is set if needed, though usually auto-discovery handles it. 
    // But let's be safe and set it to internal just in case auto-discovery missed it.
    // Actually, PluginManager auto-registers if missing. 'enabled' flag is the key.

    console.log('✅ Achievements plugin enabled in config.yml');
    console.log('PLEASE RESTART YOUR SERVER NOW.');

} catch (e) {
    console.error('❌ Error configuring plugin:', e.message);
}

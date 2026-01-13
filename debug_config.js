const { loadConfig, getConfigValue } = require('./src/utils/config');
const path = require('path');

console.log('--- DEBUG CONFIG START ---');
try {
    loadConfig(path.join(__dirname, 'config.yml'));
    const plugins = getConfigValue('plugins');
    console.log(JSON.stringify(plugins, null, 2));
} catch (e) {
    console.error('Error:', e.message);
}
console.log('--- DEBUG CONFIG END ---');

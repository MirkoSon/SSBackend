
/**
 * Test for Story 6.7: Extend Plugin Registry with Tab Metadata
 *
 * This test verifies that the PluginNavigationManager correctly registers a plugin's
 * metadata from its manifest and that the getRegisteredPlugins method returns
 * the data in the correct format.
 */

const assert = require('assert');

// Since we are in a Node.js test environment and not a browser, we need to mock
// the window object and the PluginNavigationManager class.

// Mock a global window object
global.window = {};

// The actual class is at public/admin/components/pluginNavigation.js
// We will load it and attach it to our mock window
const fs = require('fs');
const path = require('path');
const pluginNavManagerCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin', 'components', 'pluginNavigation.js'), 'utf8');
new Function('window', pluginNavManagerCode)(global.window);

const PluginNavigationManager = global.window.PluginNavigationManager;

// Load the economy plugin manifest
const { manifest: economyManifest } = require('../src/plugins/internal/economy/index.js');

function runTest() {
  console.log('🧪 Running Test for Story 6.7: Plugin Registry Metadata...');

  let allTestsPassed = true;

  try {
    const manager = new PluginNavigationManager();

    // 1. Register the economy plugin
    manager.registerPlugin(economyManifest);
    console.log('  - Registered economy plugin manifest.');

    // 2. Get the registered plugins
    const registeredPlugins = manager.getRegisteredPlugins();
    console.log('  - Called getRegisteredPlugins().');

    // 3. Find the economy plugin data
    const economyPluginData = registeredPlugins.find(p => p.id === 'economy');
    assert.ok(economyPluginData, 'Test Failed: Economy plugin data not found in registry.');
    console.log('  - Found economy plugin in registry.');

    // 4. Assert the metadata is correct
    assert.strictEqual(economyPluginData.title, 'Economy', 'Test Failed: Title is incorrect.');
    assert.strictEqual(economyPluginData.icon, '💵', 'Test Failed: Icon is incorrect.');
    assert.strictEqual(economyPluginData.displayOrder, 10, 'Test Failed: displayOrder is incorrect.');
    console.log('  - Verified metadata (title, icon, displayOrder) is correct.');

  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    allTestsPassed = false;
  }

  if (allTestsPassed) {
    console.log('\n✅ All tests for Story 6.7 passed!');
  } else {
    console.log('\n❌ Some tests for Story 6.7 failed.');
    // Exit with a non-zero code to indicate failure in CI environments
    process.exit(1);
  }
}

runTest();

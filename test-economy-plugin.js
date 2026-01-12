/**
 * Test script to verify economy plugin activation
 */

const PluginManager = require('./src/plugins/PluginManager');
const { Database } = require('./src/db/database');

async function testEconomyPlugin() {
  console.log('🧪 Testing Economy Plugin Activation...');
  
  try {
    // Create a mock database
    const db = new Database(':memory:');
    
    // Create a mock Express app
    const mockApp = {
      use: (path, handler) => {
        console.log(`📍 Mock app.use called: ${path}`);
      },
      get: () => {},
      post: () => {},
      put: () => {},
      delete: () => {}
    };
    
    // Create plugin manager
    const pluginManager = new PluginManager();
    
    // Test loading the economy plugin directly
    console.log('📦 Loading economy plugin...');
    
    // Load the economy plugin manually
    const economyPlugin = require('./src/plugins/internal/economy/index.js');
    
    console.log('✅ Economy plugin module loaded');
    console.log('📋 Plugin manifest:', economyPlugin.manifest);
    
    // Test onLoad hook
    if (economyPlugin.onLoad) {
      console.log('🔄 Testing onLoad hook...');
      await economyPlugin.onLoad({
        app: mockApp,
        db: db,
        config: {}
      });
      console.log('✅ onLoad hook completed');
    }
    
    // Test onActivate hook
    if (economyPlugin.onActivate) {
      console.log('🔄 Testing onActivate hook...');
      await economyPlugin.onActivate({
        app: mockApp,
        db: db,
        config: {
          default_currencies: [
            {
              id: 'coins',
              name: 'Coins',
              symbol: '🪙',
              decimal_places: 0,
              starting_balance: 100,
              transferable: true,
              max_balance: -1
            }
          ]
        }
      });
      console.log('✅ onActivate hook completed');
    }
    
    console.log('🎉 Economy plugin test completed successfully!');
    
  } catch (error) {
    console.error('❌ Economy plugin test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testEconomyPlugin().then(() => {
    console.log('Test finished');
    process.exit(0);
  }).catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
}

module.exports = { testEconomyPlugin };
/**
 * Example Plugin UI Integration
 * Demonstrates how to use the Plugin UI Framework
 */

// Example plugin manifest for testing
const examplePluginManifest = {
  name: 'economy',
  version: '1.2.0',
  description: 'Economy management plugin with comprehensive financial tools',
  
  // Plugin UI Configuration (NEW in Story 4.3)
  adminUI: {
    enabled: true,
    routes: [
      {
        path: '/admin/economy',
        component: 'EconomyDashboard',
        title: 'Economy Dashboard',
        icon: '💰',
        permissions: ['admin']
      },
      {
        path: '/admin/economy/transactions',
        component: 'TransactionManager',
        title: 'Transaction Manager', 
        icon: '💳',
        permissions: ['admin']
      },
      {
        path: '/admin/economy/analytics',
        component: 'EconomyAnalytics',
        title: 'Economy Analytics',
        icon: '📊',
        permissions: ['admin']
      }
    ],
    navigation: {
      label: 'Economy',
      icon: '💰',
      group: 'plugins',
      priority: 10
    },
    components: {
      'EconomyDashboard': './ui/components/EconomyDashboard.js',
      'TransactionManager': './ui/components/TransactionManager.js',
      'EconomyAnalytics': './ui/components/EconomyAnalytics.js'
    }
  }
};

// Example plugin manifest for leaderboards
const leaderboardsPluginManifest = {
  name: 'leaderboards',
  version: '1.1.0',
  description: 'Leaderboards and ranking system',
  
  adminUI: {
    enabled: true,
    routes: [
      {
        path: '/admin/leaderboards',
        component: 'LeaderboardsDashboard',
        title: 'Leaderboards',
        icon: '🏆',
        permissions: ['admin']
      }
    ],
    navigation: {
      label: 'Leaderboards',
      icon: '🏆',
      group: 'plugins',
      priority: 20
    },
    components: {
      'LeaderboardsDashboard': './ui/components/LeaderboardsDashboard.js'
    }
  }
};

// Example function to demonstrate plugin registration
async function demonstratePluginFramework() {
  try {
    console.log('🚀 Demonstrating Plugin UI Framework...');
    
    // Check if framework components are available
    if (!window.pluginUILoader || !window.pluginEventBus || !window.pluginRouter) {
      console.error('❌ Plugin UI Framework components not available');
      return;
    }
    
    console.log('✅ Plugin UI Framework components detected');
    
    // Register example plugins
    console.log('📝 Registering example plugins...');
    
    const economyRegistered = await window.pluginUILoader.registerPluginUI(examplePluginManifest);
    console.log(`Economy plugin registered: ${economyRegistered}`);
    
    const leaderboardsRegistered = await window.pluginUILoader.registerPluginUI(leaderboardsPluginManifest);
    console.log(`Leaderboards plugin registered: ${leaderboardsRegistered}`);
    
    // Display registration status
    const registeredPlugins = window.pluginUILoader.getRegisteredPlugins();
    console.log(`📦 Total registered plugins: ${registeredPlugins.length}`);
    
    registeredPlugins.forEach(plugin => {
      console.log(`  - ${plugin.pluginName} (${plugin.routes.length} routes)`);
    });
    
    // Set up event listeners for demonstration
    window.pluginEventBus.on('plugin-ui-error', (errorInfo) => {
      console.error('Plugin UI Error:', errorInfo);
    });
    
    window.pluginEventBus.on('plugin-demo-event', (payload) => {
      console.log('Demo Event Received:', payload);
    });
    
    console.log('✅ Plugin framework demonstration complete');
    
    return {
      economyRegistered,
      leaderboardsRegistered,
      totalPlugins: registeredPlugins.length
    };
    
  } catch (error) {
    console.error('❌ Plugin framework demonstration failed:', error);
    throw error;
  }
}

// Example function to test plugin UI loading
async function testPluginUILoading(pluginName) {
  try {
    console.log(`🔄 Testing plugin UI loading for: ${pluginName}`);
    
    if (!window.pluginUILoader.isPluginRegistered(pluginName)) {
      throw new Error(`Plugin not registered: ${pluginName}`);
    }
    
    const pluginInstance = await window.pluginUILoader.loadPluginUI(pluginName);
    console.log(`✅ Plugin UI loaded successfully:`, pluginInstance);
    
    return pluginInstance;
    
  } catch (error) {
    console.error(`❌ Failed to load plugin UI: ${pluginName}`, error);
    throw error;
  }
}

// Example function to test event system
function testPluginEventSystem() {
  try {
    console.log('🔄 Testing plugin event system...');
    
    // Test event emission
    window.pluginEventBus.emit('test-event', {
      message: 'Hello from event system!',
      timestamp: new Date().toISOString(),
      data: { test: true, count: 42 }
    });
    
    // Test event listening
    window.pluginEventBus.on('test-event', (payload, sourcePlugin) => {
      console.log('✅ Test event received:', payload);
      console.log('Source plugin:', sourcePlugin);
    });
    
    // Emit another test event
    setTimeout(() => {
      window.pluginEventBus.emit('delayed-test-event', {
        message: 'Delayed test event',
        delay: 1000
      });
    }, 1000);
    
    console.log('✅ Event system test initiated');
    
  } catch (error) {
    console.error('❌ Event system test failed:', error);
    throw error;
  }
}

// Make functions available globally for testing
window.pluginExamples = {
  demonstratePluginFramework,
  testPluginUILoading,
  testPluginEventSystem,
  examplePluginManifest,
  leaderboardsPluginManifest
};

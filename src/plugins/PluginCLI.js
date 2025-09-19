const { loadConfig, getConfigValue } = require('../utils/config');
const PluginManager = require('./PluginManager');
const { initializeDatabase } = require('../db/database');

/**
 * CLI Command Handler for Plugin Management
 */
class PluginCLI {
  constructor() {
    this.pluginManager = null;
  }

  /**
   * Initialize plugin manager for CLI operations
   */
  async initialize() {
    if (this.pluginManager) return;

    // Load config
    const config = loadConfig();
    
    // Initialize database
    await initializeDatabase();
    const { getDatabase } = require('../db/database');
    const db = getDatabase();
    
    // Create plugin manager
    this.pluginManager = new PluginManager();
    
    // Create minimal app context for plugin manager
    const mockApp = {
      get: () => {},
      post: () => {},
      put: () => {},
      delete: () => {},
      patch: () => {}
    };
    
    await this.pluginManager.initialize(mockApp, db);
  }

  /**
   * Handle plugin commands
   */
  async handlePluginCommand(args) {
    if (args.length < 2) {
      this.showPluginHelp();
      return;
    }

    const subcommand = args[1];

    try {
      await this.initialize();

      switch (subcommand) {
        case 'list':
          await this.listPlugins();
          break;
        case 'enable':
          await this.enablePlugin(args[2]);
          break;
        case 'disable':
          await this.disablePlugin(args[2]);
          break;
        default:
          console.log(`❌ Unknown plugin command: ${subcommand}`);
          this.showPluginHelp();
      }
    } catch (error) {
      console.error('❌ Plugin command failed:', error.message);
    }
  }

  /**
   * List all available plugins
   */
  async listPlugins() {
    const plugins = this.pluginManager.getAvailablePlugins();
    
    if (plugins.length === 0) {
      console.log('📋 No plugins found');
      return;
    }

    console.log('\n🔌 Available Plugins:\n');
    
    plugins.forEach((plugin, index) => {
      const status = plugin.active ? '✅ Active' : '⏸️  Inactive';
      const type = plugin.type === 'external' ? '📦 External' : '🏠 Internal';
      
      console.log(`${index + 1}. ${plugin.name} v${plugin.version}`);
      console.log(`   ${type} | ${status}`);
      console.log(`   ${plugin.description}`);
      console.log();
    });
  }

  /**
   * Enable a plugin by name or number
   */
  async enablePlugin(identifier) {
    if (!identifier) {
      console.log('❌ Plugin identifier required');
      console.log('Usage: ssbackend plugins enable <name|number>');
      return;
    }

    const pluginName = await this.resolvePluginName(identifier);
    if (!pluginName) return;

    try {
      await this.pluginManager.enablePlugin(pluginName);
      console.log(`✅ Plugin "${pluginName}" enabled successfully`);
    } catch (error) {
      console.log(`❌ Failed to enable plugin "${pluginName}":`, error.message);
    }
  }

  /**
   * Disable a plugin by name or number
   */
  async disablePlugin(identifier) {
    if (!identifier) {
      console.log('❌ Plugin identifier required');
      console.log('Usage: ssbackend plugins disable <name|number>');
      return;
    }

    const pluginName = await this.resolvePluginName(identifier);
    if (!pluginName) return;

    try {
      await this.pluginManager.disablePlugin(pluginName);
      console.log(`⏹️  Plugin "${pluginName}" disabled successfully`);
    } catch (error) {
      console.log(`❌ Failed to disable plugin "${pluginName}":`, error.message);
    }
  }

  /**
   * Resolve plugin name from identifier (name or number)
   */
  async resolvePluginName(identifier) {
    const plugins = this.pluginManager.getAvailablePlugins();
    
    // Check if it's a number
    const num = parseInt(identifier);
    if (!isNaN(num)) {
      if (num < 1 || num > plugins.length) {
        console.log(`❌ Plugin number ${num} out of range (1-${plugins.length})`);
        return null;
      }
      return plugins[num - 1].name;
    }
    
    // Check if it's a name
    const plugin = plugins.find(p => p.name === identifier);
    if (!plugin) {
      console.log(`❌ Plugin "${identifier}" not found`);
      console.log('Available plugins:');
      plugins.forEach((p, i) => console.log(`  ${i + 1}. ${p.name}`));
      return null;
    }
    
    return plugin.name;
  }

  /**
   * Show plugin command help
   */
  showPluginHelp() {
    console.log(`
🔌 Plugin Management Commands

Usage:
  ssbackend plugins <command> [options]

Commands:
  list                     List all available plugins with status
  enable <name|number>     Enable a plugin by name or list number
  disable <name|number>    Disable a plugin by name or list number

Examples:
  ssbackend plugins list               # Show all plugins
  ssbackend plugins enable achievements # Enable achievements plugin
  ssbackend plugins enable 1          # Enable first plugin in list
  ssbackend plugins disable 2         # Disable second plugin in list

Notes:
  - Plugin changes are saved to config.yml
  - Some plugins may require server restart to fully take effect
`);
  }
}

module.exports = PluginCLI;

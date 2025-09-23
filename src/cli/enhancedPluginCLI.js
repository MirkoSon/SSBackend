const PluginManagementAPIClient = require('./apiClient');

/**
 * Enhanced CLI Command Handler for Plugin Management
 * Implements Story 4.4 requirements with API integration and advanced features
 */
class EnhancedPluginCLI {
  constructor() {
    this.apiClient = new PluginManagementAPIClient();
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m'
    };
  }

  colorize(text, color) {
    if (process.env.NO_COLOR) return text;
    return `${this.colors[color] || ''}${text}${this.colors.reset}`;
  }

  async handlePluginCommand(args) {
    if (args.length < 2) {
      this.showPluginHelp();
      return;
    }

    const subcommand = args[1];

    try {
      const serverRunning = await this.apiClient.checkServerHealth();
      if (!serverRunning) {
        console.log(`${this.colorize('❌', 'red')} SSBackend server is not running.`);
        console.log(`${this.colorize('💡', 'blue')} Please start the server first: ${this.colorize('node src/app.js', 'cyan')}`);
        return;
      }

      await this.apiClient.initialize();

      switch (subcommand) {
        case 'list':
          await this.listPlugins(args);
          break;
        case 'enable':
          await this.enablePlugin(args[2]);
          break;
        case 'disable':
          await this.disablePlugin(args[2]);
          break;
        case 'info':
          await this.showPluginInfo(args[2]);
          break;
        case 'validate':
          await this.validatePluginSystem();
          break;
        case 'install':
          await this.installPlugin(args[2]);
          break;
        case 'remove':
          await this.removePlugin(args[2]);
          break;
        default:
          console.log(`${this.colorize('❌', 'red')} Unknown plugin command: ${subcommand}`);
          this.showPluginHelp();
      }
    } catch (error) {
      console.error(`${this.colorize('❌', 'red')} Plugin command failed:`, error.message);
      
      if (error.message.includes('authentication required')) {
        console.log(`${this.colorize('💡', 'blue')} Tip: Please authenticate as admin via the web interface first.`);
        console.log(`${this.colorize('🌐', 'blue')} Visit: http://localhost:${this.apiClient.config.port || 3000}/admin`);
      }
    }
  }

  /**
   * List all plugins with status and metadata
   * AC 1: Plugin Listing Command
   */
  async listPlugins(args) {
    try {
      console.log(`${this.colorize('🔄', 'blue')} Fetching plugin status...`);
      
      const response = await this.apiClient.listPlugins();
      const { plugins, systemHealth } = response.data;
      
      if (!plugins || plugins.length === 0) {
        console.log(`${this.colorize('📋', 'yellow')} No plugins found`);
        return;
      }

      const verbose = args.includes('--verbose') || args.includes('-v');
      console.log(`\n${this.colorize('📦', 'cyan')} SSBackend Plugin Status\n`);
      
      const internalPlugins = plugins.filter(p => p.type === 'internal');
      const externalPlugins = plugins.filter(p => p.type === 'external');

      if (internalPlugins.length > 0) {
        console.log(`${this.colorize('Internal Plugins:', 'bright')}`);
        this.displayPluginList(internalPlugins, verbose);
      }

      if (externalPlugins.length > 0) {
        console.log(`\n${this.colorize('External Plugins:', 'bright')}`);
        this.displayPluginList(externalPlugins, verbose);
      }

      const enabledCount = plugins.filter(p => p.enabled).length;
      const totalCount = plugins.length;
      
      console.log(`\n${this.colorize('Plugin Summary:', 'bright')} ${enabledCount}/${totalCount} enabled, ${totalCount - enabledCount} disabled`);
      
      if (systemHealth && !systemHealth.healthy) {
        console.log(`${this.colorize('⚠️', 'yellow')} System health: Issues detected`);
      }
      
      console.log(`${this.colorize('💡', 'blue')} Use '${this.colorize('ssbackend plugins info <n>', 'cyan')}' for detailed information`);
      
    } catch (error) {
      throw new Error(`Failed to list plugins: ${error.message}`);
    }
  }

  /**
   * Display formatted list of plugins
   */
  displayPluginList(plugins, verbose = false) {
    plugins.forEach((plugin, index) => {
      const status = plugin.enabled ? 
        `${this.colorize('✅', 'green')} Active` : 
        `${this.colorize('❌', 'red')} Inactive`;
      
      console.log(`  ${status} ${this.colorize(plugin.name, 'bright')}      v${plugin.version}  ${plugin.description}`);
      
      if (verbose) {
        if (plugin.dependencies && plugin.dependencies.length > 0) {
          console.log(`      ${this.colorize('Dependencies:', 'cyan')} ${plugin.dependencies.join(', ')}`);
        }
        if (plugin.routes && plugin.routes.length > 0) {
          console.log(`      ${this.colorize('Routes:', 'cyan')} ${plugin.routes.length} endpoints`);
        }
      }
    });
  }

  /**
   * Enable a plugin by name or number
   * AC 2: Plugin Control Commands
   */
  async enablePlugin(identifier) {
    if (!identifier) {
      console.log(`${this.colorize('❌', 'red')} Plugin identifier required`);
      console.log(`${this.colorize('Usage:', 'blue')} ssbackend plugins enable <name|number>`);
      return;
    }

    try {
      const pluginName = await this.resolvePluginName(identifier);
      if (!pluginName) return;

      console.log(`${this.colorize('🔄', 'blue')} Enabling plugin ${this.colorize(pluginName, 'bright')}...`);
      
      const response = await this.apiClient.enablePlugin(pluginName);
      
      console.log(`${this.colorize('✅', 'green')} Plugin "${pluginName}" enabled successfully`);
      
      if (response.data && response.data.routes) {
        console.log(`${this.colorize('🌐', 'blue')} Plugin routes available at:`, response.data.routes.join(', '));
      }
      
    } catch (error) {
      console.log(`${this.colorize('❌', 'red')} Failed to enable plugin "${identifier}":`, error.message);
    }
  }

  /**
   * Disable a plugin by name or number
   * AC 2: Plugin Control Commands
   */
  async disablePlugin(identifier) {
    if (!identifier) {
      console.log(`${this.colorize('❌', 'red')} Plugin identifier required`);
      console.log(`${this.colorize('Usage:', 'blue')} ssbackend plugins disable <name|number>`);
      return;
    }

    try {
      const pluginName = await this.resolvePluginName(identifier);
      if (!pluginName) return;

      console.log(`${this.colorize('🔄', 'blue')} Disabling plugin ${this.colorize(pluginName, 'bright')}...`);
      
      const response = await this.apiClient.disablePlugin(pluginName);
      
      console.log(`${this.colorize('⏹️', 'yellow')} Plugin "${pluginName}" disabled successfully`);
      
      if (response.data && response.data.warning) {
        console.log(`${this.colorize('⚠️', 'yellow')} Warning:`, response.data.warning);
      }
      
    } catch (error) {
      console.log(`${this.colorize('❌', 'red')} Failed to disable plugin "${identifier}":`, error.message);
    }
  }

  /**
   * Show detailed plugin information
   * AC 3: Plugin Information Command
   */
  async showPluginInfo(identifier) {
    if (!identifier) {
      console.log(`${this.colorize('❌', 'red')} Plugin identifier required`);
      console.log(`${this.colorize('Usage:', 'blue')} ssbackend plugins info <name|number>`);
      return;
    }

    try {
      const pluginName = await this.resolvePluginName(identifier);
      if (!pluginName) return;

      console.log(`${this.colorize('🔄', 'blue')} Fetching detailed information for ${this.colorize(pluginName, 'bright')}...`);
      
      const response = await this.apiClient.getPluginInfo(pluginName);
      const { plugin, configuration } = response.data;
      
      console.log(`\n${this.colorize('📋', 'cyan')} Plugin Information: ${this.colorize(plugin.name, 'bright')}\n`);
      
      // Basic information
      console.log(`${this.colorize('Name:', 'bright')}           ${plugin.name}`);
      console.log(`${this.colorize('Version:', 'bright')}        ${plugin.version}`);
      console.log(`${this.colorize('Description:', 'bright')}    ${plugin.description}`);
      console.log(`${this.colorize('Type:', 'bright')}           ${plugin.type}`);
      console.log(`${this.colorize('Status:', 'bright')}         ${plugin.enabled ? 
        this.colorize('✅ Enabled', 'green') : 
        this.colorize('❌ Disabled', 'red')}`);
      
      // Dependencies
      if (plugin.dependencies && plugin.dependencies.length > 0) {
        console.log(`${this.colorize('Dependencies:', 'bright')}  ${plugin.dependencies.join(', ')}`);
      }
      
      // Routes
      if (plugin.routes && plugin.routes.length > 0) {
        console.log(`\n${this.colorize('API Routes:', 'bright')}`);
        plugin.routes.forEach(route => {
          console.log(`  ${this.colorize('•', 'cyan')} ${route}`);
        });
      }
      
      // Configuration
      if (configuration && Object.keys(configuration).length > 0) {
        console.log(`\n${this.colorize('Configuration:', 'bright')}`);
        Object.entries(configuration).forEach(([key, value]) => {
          if (key !== 'message') {
            console.log(`  ${this.colorize(key + ':', 'cyan')} ${JSON.stringify(value)}`);
          }
        });
      }
      
      // Additional metadata
      if (plugin.author) {
        console.log(`\n${this.colorize('Author:', 'bright')}        ${plugin.author}`);
      }
      if (plugin.license) {
        console.log(`${this.colorize('License:', 'bright')}       ${plugin.license}`);
      }
      
    } catch (error) {
      console.log(`${this.colorize('❌', 'red')} Failed to get plugin information for "${identifier}":`, error.message);
    }
  }

  /**
   * Validate the entire plugin system
   * AC 4: Plugin Validation Command
   */
  async validatePluginSystem() {
    try {
      console.log(`${this.colorize('🔍', 'blue')} Validating plugin system...`);
      
      const response = await this.apiClient.validatePluginSystem();
      const validation = response.data;
      
      console.log(`\n${this.colorize('🔍', 'cyan')} Plugin System Validation Report\n`);
      
      // Overall status
      if (validation.valid) {
        console.log(`${this.colorize('✅', 'green')} Overall Status: ${this.colorize('PASSED', 'green')}`);
      } else {
        console.log(`${this.colorize('❌', 'red')} Overall Status: ${this.colorize('FAILED', 'red')}`);
      }
      
      // Summary
      if (validation.summary) {
        console.log(`\n${this.colorize('Summary:', 'bright')}`);
        console.log(`  Total Plugins: ${validation.summary.totalPlugins || 'N/A'}`);
        console.log(`  Enabled: ${validation.summary.enabledPlugins || 'N/A'}`);
        console.log(`  Issues Found: ${validation.summary.issuesFound || 0}`);
        console.log(`  Warnings: ${validation.summary.warningsFound || 0}`);
      }
      
      // Issues
      if (validation.issues && validation.issues.length > 0) {
        console.log(`\n${this.colorize('Issues Found:', 'red')}`);
        validation.issues.forEach((issue, index) => {
          console.log(`  ${index + 1}. ${this.colorize('❌', 'red')} ${issue.message || issue}`);
          if (issue.plugin) {
            console.log(`     Plugin: ${issue.plugin}`);
          }
          if (issue.suggestion) {
            console.log(`     ${this.colorize('💡', 'blue')} Suggestion: ${issue.suggestion}`);
          }
        });
      }
      
      // Warnings
      if (validation.warnings && validation.warnings.length > 0) {
        console.log(`\n${this.colorize('Warnings:', 'yellow')}`);
        validation.warnings.forEach((warning, index) => {
          console.log(`  ${index + 1}. ${this.colorize('⚠️', 'yellow')} ${warning.message || warning}`);
        });
      }
      
      // Recommendations
      if (validation.recommendations && validation.recommendations.length > 0) {
        console.log(`\n${this.colorize('Recommendations:', 'blue')}`);
        validation.recommendations.forEach((rec, index) => {
          console.log(`  ${index + 1}. ${this.colorize('💡', 'blue')} ${rec}`);
        });
      }
      
    } catch (error) {
      if (error.message.includes('Plugin system validation found issues')) {
        // This is expected for failed validation - the error contains the validation data
        return;
      }
      console.log(`${this.colorize('❌', 'red')} Failed to validate plugin system:`, error.message);
    }
  }

  /**
   * Install an external plugin
   * AC 5: Plugin Installation Command
   */
  async installPlugin(pluginPath) {
    if (!pluginPath) {
      console.log(`${this.colorize('❌', 'red')} Plugin path required`);
      console.log(`${this.colorize('Usage:', 'blue')} ssbackend plugins install <path>`);
      console.log(`${this.colorize('Examples:', 'blue')}`);
      console.log(`  ssbackend plugins install ./my-plugin/`);
      console.log(`  ssbackend plugins install my-plugin.ssb-plugin`);
      return;
    }

    try {
      console.log(`${this.colorize('📦', 'blue')} Installing plugin from ${this.colorize(pluginPath, 'bright')}...`);
      
      // For now, this is a placeholder implementation
      // In a full implementation, this would:
      // 1. Validate plugin structure
      // 2. Copy files to plugins directory
      // 3. Install dependencies if needed
      // 4. Register with plugin system
      
      console.log(`${this.colorize('⚠️', 'yellow')} Plugin installation feature is not yet implemented.`);
      console.log(`${this.colorize('💡', 'blue')} Manual installation:`);
      console.log(`  1. Copy plugin to src/plugins/ directory`);
      console.log(`  2. Restart SSBackend server`);
      console.log(`  3. Enable plugin with: ssbackend plugins enable <plugin-name>`);
      
    } catch (error) {
      console.log(`${this.colorize('❌', 'red')} Failed to install plugin from "${pluginPath}":`, error.message);
    }
  }

  /**
   * Remove an external plugin
   * AC 6: Plugin Removal Command
   */
  async removePlugin(identifier) {
    if (!identifier) {
      console.log(`${this.colorize('❌', 'red')} Plugin identifier required`);
      console.log(`${this.colorize('Usage:', 'blue')} ssbackend plugins remove <name|number>`);
      return;
    }

    try {
      const pluginName = await this.resolvePluginName(identifier);
      if (!pluginName) return;

      // Check if it's an internal plugin (protect from removal)
      const listResponse = await this.apiClient.listPlugins();
      const plugin = listResponse.data.plugins.find(p => p.id === pluginName || p.name === pluginName);
      
      if (!plugin) {
        console.log(`${this.colorize('❌', 'red')} Plugin "${pluginName}" not found`);
        return;
      }
      
      if (plugin.type === 'internal') {
        console.log(`${this.colorize('❌', 'red')} Cannot remove internal plugin "${pluginName}"`);
        console.log(`${this.colorize('💡', 'blue')} Internal plugins can only be disabled, not removed`);
        return;
      }

      console.log(`${this.colorize('🗑️', 'blue')} Removing external plugin ${this.colorize(pluginName, 'bright')}...`);
      
      // For now, this is a placeholder implementation
      console.log(`${this.colorize('⚠️', 'yellow')} Plugin removal feature is not yet implemented.`);
      console.log(`${this.colorize('💡', 'blue')} Manual removal:`);
      console.log(`  1. Disable plugin first: ssbackend plugins disable ${pluginName}`);
      console.log(`  2. Remove plugin directory from src/plugins/`);
      console.log(`  3. Restart SSBackend server`);
      
    } catch (error) {
      console.log(`${this.colorize('❌', 'red')} Failed to remove plugin "${identifier}":`, error.message);
    }
  }

  /**
   * Resolve plugin name from identifier (name or number)
   */
  async resolvePluginName(identifier) {
    try {
      const response = await this.apiClient.listPlugins();
      const plugins = response.data.plugins;
      
      // Check if it's a number
      const num = parseInt(identifier);
      if (!isNaN(num)) {
        if (num < 1 || num > plugins.length) {
          console.log(`${this.colorize('❌', 'red')} Plugin number ${num} out of range (1-${plugins.length})`);
          return null;
        }
        return plugins[num - 1].id || plugins[num - 1].name;
      }
      
      // Check if it's a name or ID
      const plugin = plugins.find(p => p.name === identifier || p.id === identifier);
      if (!plugin) {
        console.log(`${this.colorize('❌', 'red')} Plugin "${identifier}" not found`);
        console.log(`${this.colorize('Available plugins:', 'blue')}`);
        plugins.forEach((p, i) => console.log(`  ${i + 1}. ${p.name}`));
        return null;
      }
      
      return plugin.id || plugin.name;
    } catch (error) {
      throw new Error(`Failed to resolve plugin name: ${error.message}`);
    }
  }

  /**
   * Show comprehensive plugin command help
   * AC 9: Help Integration
   */
  showPluginHelp() {
    console.log(`
${this.colorize('🔌', 'cyan')} Plugin Management Commands

${this.colorize('Usage:', 'bright')}
  ssbackend plugins <command> [options]

${this.colorize('Commands:', 'bright')}
  ${this.colorize('list', 'green')} [--verbose]            List all available plugins with status
  ${this.colorize('enable', 'green')} <name|number>        Enable a plugin by name or list number
  ${this.colorize('disable', 'green')} <name|number>       Disable a plugin by name or list number
  ${this.colorize('info', 'green')} <name|number>          Show detailed plugin information
  ${this.colorize('validate', 'green')}                    Validate plugin system health and configuration
  ${this.colorize('install', 'green')} <path>              Install external plugin from path
  ${this.colorize('remove', 'green')} <name|number>        Remove external plugin (internal plugins protected)

${this.colorize('Examples:', 'bright')}
  ssbackend plugins list                    # Show all plugins
  ssbackend plugins list --verbose          # Show plugins with detailed information
  ssbackend plugins enable achievements     # Enable achievements plugin
  ssbackend plugins enable 1               # Enable first plugin in list
  ssbackend plugins disable 2              # Disable second plugin in list
  ssbackend plugins info economy           # Show detailed economy plugin information
  ssbackend plugins validate               # Check plugin system health
  ssbackend plugins install ./my-plugin/   # Install plugin from directory

${this.colorize('Notes:', 'bright')}
  ${this.colorize('•', 'blue')} Plugin changes are applied immediately via backend APIs
  ${this.colorize('•', 'blue')} All operations require SSBackend server to be running
  ${this.colorize('•', 'blue')} CLI uses same backend APIs as web admin interface
  ${this.colorize('•', 'blue')} Internal plugins can be disabled but not removed
  ${this.colorize('•', 'blue')} Use ${this.colorize('--verbose', 'cyan')} flag with list for detailed output

${this.colorize('Authentication:', 'bright')}
  ${this.colorize('•', 'blue')} CLI operations require admin authentication
  ${this.colorize('•', 'blue')} Please authenticate via web interface first: ${this.colorize('http://localhost:3000/admin', 'cyan')}
`);
  }
}

module.exports = EnhancedPluginCLI;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const MigrationManager = require('../db/migrations/MigrationManager');

/**
 * Database CLI Command Handler
 * Provides migration management commands
 */
class DatabaseCLI {
  constructor() {
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m'
    };
  }

  colorize(text, color) {
    if (process.env.NO_COLOR) return text;
    return `${this.colors[color] || ''}${text}${this.colors.reset}`;
  }

  /**
   * Get database connection
   * @private
   */
  async _getDatabase() {
    const DB_PATH = process.pkg
      ? path.join(process.cwd(), 'game.db')
      : path.join(__dirname, '../../game.db');

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(db);
        }
      });
    });
  }

  /**
   * Handle database commands
   */
  async handleDbCommand(args) {
    if (args.length < 2) {
      this.showDbHelp();
      return;
    }

    const subcommand = args[1];

    try {
      switch (subcommand) {
        case 'migrate':
          await this.runMigrations();
          break;
        case 'status':
          await this.showMigrationStatus();
          break;
        case 'rollback':
          const steps = parseInt(args[2]) || 1;
          await this.rollbackMigrations(steps);
          break;
        case 'plugin:migrate':
          await this.migratePlugin(args[2]);
          break;
        case 'plugin:status':
          await this.pluginMigrationStatus(args[2]);
          break;
        default:
          console.log(`${this.colorize('❌', 'red')} Unknown db command: ${subcommand}`);
          this.showDbHelp();
      }
    } catch (error) {
      console.error(`${this.colorize('❌', 'red')} Database command failed:`, error.message);
      process.exit(1);
    }
  }

  /**
   * Run all pending core migrations
   */
  async runMigrations() {
    console.log(`${this.colorize('🔄', 'blue')} Running database migrations...`);

    const db = await this._getDatabase();
    const manager = new MigrationManager(db);

    try {
      const result = await manager.migrate();

      if (result.applied === 0) {
        console.log(`${this.colorize('✅', 'green')} Database is up to date`);
      } else {
        console.log(`${this.colorize('✅', 'green')} Applied ${result.applied} migration(s)`);
        result.migrations.forEach(m => {
          console.log(`  ${this.colorize('✓', 'green')} ${m.version}: ${m.name} (${m.executionTime}ms)`);
        });
      }
    } finally {
      db.close();
    }
  }

  /**
   * Show migration status
   */
  async showMigrationStatus() {
    console.log(`${this.colorize('📊', 'blue')} Database Migration Status\n`);

    const db = await this._getDatabase();
    const manager = new MigrationManager(db);

    try {
      const status = await manager.status();

      console.log(`${this.colorize('Current Version:', 'cyan')} ${status.current_version || 'None'}`);
      console.log(`${this.colorize('Applied:', 'green')} ${status.applied.length} migration(s)`);
      console.log(`${this.colorize('Pending:', 'yellow')} ${status.pending.length} migration(s)`);

      if (status.applied.length > 0) {
        console.log(`\n${this.colorize('Applied Migrations:', 'green')}`);
        status.applied.forEach(m => {
          console.log(`  ${this.colorize('✓', 'green')} ${m.version}: ${m.name}`);
          if (m.description) {
            console.log(`    ${this.colorize(m.description, 'cyan')}`);
          }
        });
      }

      if (status.pending.length > 0) {
        console.log(`\n${this.colorize('Pending Migrations:', 'yellow')}`);
        status.pending.forEach(m => {
          console.log(`  ${this.colorize('○', 'yellow')} ${m.version}: ${m.name}`);
          if (m.description) {
            console.log(`    ${this.colorize(m.description, 'cyan')}`);
          }
        });
      }
    } finally {
      db.close();
    }
  }

  /**
   * Rollback migrations
   */
  async rollbackMigrations(steps) {
    console.log(`${this.colorize('⚠️', 'yellow')} Rolling back ${steps} migration(s)...`);
    console.log(`${this.colorize('⚠️', 'yellow')} This may result in data loss!`);

    // Require confirmation in production
    if (process.env.NODE_ENV === 'production') {
      console.log(`${this.colorize('❌', 'red')} Rollback disabled in production environment`);
      console.log(`${this.colorize('💡', 'blue')} Use NODE_ENV=development to enable rollback`);
      return;
    }

    const db = await this._getDatabase();
    const manager = new MigrationManager(db);

    try {
      const result = await manager.rollback(steps);

      console.log(`${this.colorize('✅', 'green')} Rolled back ${result.rolled_back} migration(s)`);
      result.migrations.forEach(m => {
        console.log(`  ${this.colorize('✓', 'green')} ${m.version}: ${m.name} (${m.executionTime}ms)`);
      });
    } catch (error) {
      console.error(`${this.colorize('❌', 'red')} Rollback failed:`, error.message);
      throw error;
    } finally {
      db.close();
    }
  }

  /**
   * Run plugin migrations
   */
  async migratePlugin(pluginName) {
    if (!pluginName) {
      console.log(`${this.colorize('❌', 'red')} Plugin name required`);
      console.log(`${this.colorize('💡', 'blue')} Usage: ssbackend db plugin:migrate <plugin-name>`);
      return;
    }

    console.log(`${this.colorize('🔄', 'blue')} Running migrations for plugin: ${pluginName}...`);

    const db = await this._getDatabase();
    const manager = new MigrationManager(db);

    try {
      const result = await manager.migratePlugin(pluginName);

      if (result.applied === 0) {
        console.log(`${this.colorize('✅', 'green')} Plugin ${pluginName} is up to date`);
      } else {
        console.log(`${this.colorize('✅', 'green')} Applied ${result.applied} migration(s) for ${pluginName}`);
        result.migrations.forEach(m => {
          console.log(`  ${this.colorize('✓', 'green')} ${m.version}: ${m.name} (${m.executionTime}ms)`);
        });
      }
    } finally {
      db.close();
    }
  }

  /**
   * Show plugin migration status
   */
  async pluginMigrationStatus(pluginName) {
    if (!pluginName) {
      console.log(`${this.colorize('❌', 'red')} Plugin name required`);
      console.log(`${this.colorize('💡', 'blue')} Usage: ssbackend db plugin:status <plugin-name>`);
      return;
    }

    console.log(`${this.colorize('📊', 'blue')} Migration Status: ${pluginName}\n`);

    const db = await this._getDatabase();
    const manager = new MigrationManager(db);

    try {
      const status = await manager.statusPlugin(pluginName);

      console.log(`${this.colorize('Plugin:', 'cyan')} ${status.plugin}`);
      console.log(`${this.colorize('Current Version:', 'cyan')} ${status.current_version || 'None'}`);
      console.log(`${this.colorize('Applied:', 'green')} ${status.applied.length} migration(s)`);
      console.log(`${this.colorize('Pending:', 'yellow')} ${status.pending.length} migration(s)`);

      if (status.applied.length > 0) {
        console.log(`\n${this.colorize('Applied Migrations:', 'green')}`);
        status.applied.forEach(m => {
          console.log(`  ${this.colorize('✓', 'green')} ${m.version}: ${m.name}`);
        });
      }

      if (status.pending.length > 0) {
        console.log(`\n${this.colorize('Pending Migrations:', 'yellow')}`);
        status.pending.forEach(m => {
          console.log(`  ${this.colorize('○', 'yellow')} ${m.version}: ${m.name}`);
        });
      }
    } finally {
      db.close();
    }
  }

  /**
   * Show help for database commands
   */
  showDbHelp() {
    console.log(`
${this.colorize('SSBackend Database CLI', 'bright')}

${this.colorize('Usage:', 'cyan')}
  ssbackend db <command> [options]

${this.colorize('Commands:', 'cyan')}
  ${this.colorize('migrate', 'green')}              Run all pending core migrations
  ${this.colorize('status', 'green')}               Show migration status
  ${this.colorize('rollback [steps]', 'green')}     Rollback last N migrations (default: 1)

  ${this.colorize('plugin:migrate <name>', 'green')}  Run migrations for specific plugin
  ${this.colorize('plugin:status <name>', 'green')}   Show migration status for plugin

${this.colorize('Examples:', 'cyan')}
  ssbackend db migrate
  ssbackend db status
  ssbackend db rollback 2
  ssbackend db plugin:migrate economy
  ssbackend db plugin:status economy

${this.colorize('Environment Variables:', 'cyan')}
  NODE_ENV=production    Disables rollback for safety
`);
  }
}

module.exports = DatabaseCLI;

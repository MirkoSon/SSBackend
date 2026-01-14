const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * MigrationManager - Manages database migrations for SSBackend
 *
 * Provides version tracking, idempotent migrations, and rollback capability.
 * Supports both core system migrations and plugin-specific migrations.
 *
 * @class MigrationManager
 */
class MigrationManager {
  constructor(db, options = {}) {
    this.db = db;
    this.migrationsPath = options.migrationsPath || path.join(__dirname);
    this.pluginBasePath = options.pluginBasePath || path.join(__dirname, '../../../plugins');
  }

  /**
   * Helper to find a plugin's migrations directory across standard locations
   * @private
   */
  _findPluginMigrationsPath(pluginName) {
    // Standard locations to search
    const searchPaths = [
      path.join(this.pluginBasePath, pluginName, 'migrations'),
      path.join(this.pluginBasePath, '@core', pluginName, 'migrations'),
      path.join(this.pluginBasePath, '@examples', pluginName, 'migrations')
    ];

    for (const p of searchPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    return null;
  }

  /**
   * Initialize migration tracking tables
   * @private
   */
  async _initializeTables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Core migrations tracking
        this.db.run(`
          CREATE TABLE IF NOT EXISTS migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            execution_time_ms INTEGER,
            checksum TEXT
          )
        `, (err) => {
          if (err) {
            console.error('Failed to create migrations table:', err);
            return reject(err);
          }
        });

        // Plugin migrations tracking
        this.db.run(`
          CREATE TABLE IF NOT EXISTS plugin_migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plugin_name TEXT NOT NULL,
            version INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            execution_time_ms INTEGER,
            UNIQUE(plugin_name, version)
          )
        `, (err) => {
          if (err) {
            console.error('Failed to create plugin_migrations table:', err);
            return reject(err);
          }
          resolve();
        });
      });
    });
  }

  /**
   * Discover migration files in the migrations directory
   * @private
   * @param {string} dir - Directory to scan
   * @returns {Promise<Array>} Array of migration objects
   */
  async _discoverMigrations(dir = this.migrationsPath) {
    const files = fs.readdirSync(dir)
      .filter(f => f.match(/^\d{6}_.*\.js$/))
      .sort();

    return files.map(file => {
      const filePath = path.join(dir, file);
      const migration = require(filePath);

      // Calculate checksum for integrity
      const content = fs.readFileSync(filePath, 'utf8');
      const checksum = crypto.createHash('md5').update(content).digest('hex');

      return {
        version: migration.version,
        name: migration.name,
        description: migration.description || '',
        filePath,
        up: migration.up,
        down: migration.down,
        checksum
      };
    });
  }

  /**
   * Get currently applied migration versions
   * @private
   * @returns {Promise<Array>} Array of applied version numbers
   */
  async _getAppliedVersions() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT version FROM migrations ORDER BY version ASC',
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows.map(row => row.version));
        }
      );
    });
  }

  /**
   * Get pending migrations that haven't been applied
   * @returns {Promise<Array>} Array of pending migration objects
   */
  async getPendingMigrations() {
    const allMigrations = await this._discoverMigrations();
    const appliedVersions = await this._getAppliedVersions();

    return allMigrations.filter(m => !appliedVersions.includes(m.version));
  }

  /**
   * Get current database version
   * @returns {Promise<number>} Current version number
   */
  async getCurrentVersion() {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT MAX(version) as version FROM migrations',
        (err, row) => {
          if (err) return reject(err);
          resolve(row?.version || 0);
        }
      );
    });
  }

  /**
   * Execute a single migration
   * @private
   * @param {Object} migration - Migration object
   * @param {string} direction - 'up' or 'down'
   * @returns {Promise<number>} Execution time in milliseconds
   */
  async _executeMigration(migration, direction = 'up') {
    if (!migration[direction]) {
      throw new Error(
        `Migration ${migration.version} (${migration.name}) has no ${direction}() method`
      );
    }

    const startTime = Date.now();

    try {
      await migration[direction](this.db);
      return Date.now() - startTime;
    } catch (error) {
      throw new Error(
        `Migration ${migration.version} (${migration.name}) failed during ${direction}(): ${error.message}`
      );
    }
  }

  /**
   * Record a migration as applied
   * @private
   */
  async _recordMigration(migration, executionTime) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO migrations (version, name, description, execution_time_ms, checksum)
         VALUES (?, ?, ?, ?, ?)`,
        [
          migration.version,
          migration.name,
          migration.description,
          executionTime,
          migration.checksum
        ],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  /**
   * Remove a migration record (for rollback)
   * @private
   */
  async _removeMigrationRecord(version) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM migrations WHERE version = ?',
        [version],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  /**
   * Run all pending core migrations
   * @returns {Promise<Object>} Result object with applied count and details
   */
  async migrate() {
    console.log('🔄 Running database migrations...');

    // Initialize tracking tables
    await this._initializeTables();

    const pending = await this.getPendingMigrations();

    if (pending.length === 0) {
      console.log('✅ No pending migrations');
      return { applied: 0, migrations: [] };
    }

    console.log(`📋 Found ${pending.length} pending migration(s)`);

    const results = [];

    for (const migration of pending) {
      try {
        console.log(`  🔄 Applying ${migration.version}: ${migration.name}...`);

        const executionTime = await this._executeMigration(migration, 'up');
        await this._recordMigration(migration, executionTime);

        console.log(`  ✅ Applied ${migration.version} (${executionTime}ms)`);
        results.push({
          version: migration.version,
          name: migration.name,
          status: 'success',
          executionTime
        });

      } catch (error) {
        console.error(`  ❌ Migration ${migration.version} failed:`, error.message);

        results.push({
          version: migration.version,
          name: migration.name,
          status: 'failed',
          error: error.message
        });

        // HALT - don't run subsequent migrations
        throw new Error(
          `Migration ${migration.version} (${migration.name}) failed. ` +
          `Subsequent migrations not run. Error: ${error.message}`
        );
      }
    }

    console.log(`✅ Applied ${results.length} migration(s) successfully`);
    return { applied: results.length, migrations: results };
  }

  /**
   * Rollback last N core migrations
   * @param {number} steps - Number of migrations to rollback (default: 1)
   * @returns {Promise<Object>} Result object with rolled back count
   */
  async rollback(steps = 1) {
    console.log(`🔄 Rolling back ${steps} migration(s)...`);

    // Get applied migrations in reverse order
    const appliedMigrations = await this._discoverMigrations();
    const appliedVersions = await this._getAppliedVersions();

    const toRollback = appliedMigrations
      .filter(m => appliedVersions.includes(m.version))
      .sort((a, b) => b.version - a.version)
      .slice(0, steps);

    if (toRollback.length === 0) {
      console.log('⚠️  No migrations to rollback');
      return { rolled_back: 0, migrations: [] };
    }

    // Check for irreversible migrations
    const irreversible = toRollback.filter(m => !m.down);
    if (irreversible.length > 0) {
      throw new Error(
        `Cannot rollback: ${irreversible.length} migration(s) lack down() method: ` +
        irreversible.map(m => `${m.version} (${m.name})`).join(', ')
      );
    }

    console.warn('⚠️  Rollback will execute DOWN migrations - data may be lost');

    const results = [];

    for (const migration of toRollback) {
      try {
        console.log(`  🔄 Rolling back ${migration.version}: ${migration.name}...`);

        const executionTime = await this._executeMigration(migration, 'down');
        await this._removeMigrationRecord(migration.version);

        console.log(`  ✅ Rolled back ${migration.version} (${executionTime}ms)`);
        results.push({
          version: migration.version,
          name: migration.name,
          status: 'rolled_back',
          executionTime
        });

      } catch (error) {
        console.error(`  ❌ Rollback ${migration.version} failed:`, error.message);

        results.push({
          version: migration.version,
          name: migration.name,
          status: 'failed',
          error: error.message
        });

        throw new Error(
          `Rollback of migration ${migration.version} failed: ${error.message}`
        );
      }
    }

    console.log(`✅ Rolled back ${results.length} migration(s)`);
    return { rolled_back: results.length, migrations: results };
  }

  /**
   * Get migration status (pending and applied)
   * @returns {Promise<Object>} Status object
   */
  async status() {
    await this._initializeTables();

    const currentVersion = await this.getCurrentVersion();
    const allMigrations = await this._discoverMigrations();
    const appliedVersions = await this._getAppliedVersions();

    const applied = allMigrations.filter(m => appliedVersions.includes(m.version));
    const pending = allMigrations.filter(m => !appliedVersions.includes(m.version));

    return {
      current_version: currentVersion,
      applied: applied.map(m => ({
        version: m.version,
        name: m.name,
        description: m.description
      })),
      pending: pending.map(m => ({
        version: m.version,
        name: m.name,
        description: m.description
      }))
    };
  }

  /**
   * Run all pending migrations for a plugin
   * @param {string} pluginName - Name of the plugin
   * @returns {Promise<Object>} Result object
   */
  async migratePlugin(pluginName) {
    console.log(`🔄 Running migrations for plugin: ${pluginName}...`);

    await this._initializeTables();

    // Find plugin migrations directory
    const pluginMigrationsPath = this._findPluginMigrationsPath(pluginName);

    if (!pluginMigrationsPath) {
      console.log(`  ℹ️  No migrations directory found for plugin: ${pluginName}`);
      return { applied: 0, migrations: [] };
    }

    // Discover plugin migrations
    const allMigrations = await this._discoverMigrations(pluginMigrationsPath);

    // Get applied plugin migrations
    const appliedVersions = await new Promise((resolve, reject) => {
      this.db.all(
        'SELECT version FROM plugin_migrations WHERE plugin_name = ? ORDER BY version ASC',
        [pluginName],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows.map(row => row.version));
        }
      );
    });

    const pending = allMigrations.filter(m => !appliedVersions.includes(m.version));

    if (pending.length === 0) {
      console.log(`  ✅ No pending migrations for plugin: ${pluginName}`);
      return { applied: 0, migrations: [] };
    }

    console.log(`  📋 Found ${pending.length} pending migration(s) for ${pluginName}`);

    const results = [];

    for (const migration of pending) {
      try {
        console.log(`    🔄 Applying ${migration.version}: ${migration.name}...`);

        const executionTime = await this._executeMigration(migration, 'up');

        // Record plugin migration
        await new Promise((resolve, reject) => {
          this.db.run(
            `INSERT INTO plugin_migrations (plugin_name, version, name, description, execution_time_ms)
             VALUES (?, ?, ?, ?, ?)`,
            [pluginName, migration.version, migration.name, migration.description, executionTime],
            (err) => {
              if (err) return reject(err);
              resolve();
            }
          );
        });

        console.log(`    ✅ Applied ${migration.version} (${executionTime}ms)`);
        results.push({
          version: migration.version,
          name: migration.name,
          status: 'success',
          executionTime
        });

      } catch (error) {
        console.error(`    ❌ Plugin migration ${migration.version} failed:`, error.message);

        results.push({
          version: migration.version,
          name: migration.name,
          status: 'failed',
          error: error.message
        });

        throw new Error(
          `Plugin ${pluginName} migration ${migration.version} failed: ${error.message}`
        );
      }
    }

    console.log(`  ✅ Applied ${results.length} migration(s) for ${pluginName}`);
    return { applied: results.length, migrations: results };
  }

  /**
   * Run all pending migrations for a plugin from a specific path
   * @param {string} pluginName - Name of the plugin
   * @param {string} migrationsPath - Absolute path to the plugin's migrations directory
   * @returns {Promise<Object>} Result object
   */
  async migratePluginFromPath(pluginName, migrationsPath) {
    console.log(`🔄 Running migrations for plugin: ${pluginName}...`);

    await this._initializeTables();

    if (!fs.existsSync(migrationsPath)) {
      console.log(`  ℹ️  No migrations directory found for plugin: ${pluginName}`);
      return { applied: 0, migrations: [] };
    }

    // Discover plugin migrations
    const allMigrations = await this._discoverMigrations(migrationsPath);

    // Get applied plugin migrations
    const appliedVersions = await new Promise((resolve, reject) => {
      this.db.all(
        'SELECT version FROM plugin_migrations WHERE plugin_name = ? ORDER BY version ASC',
        [pluginName],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows.map(row => row.version));
        }
      );
    });

    const pending = allMigrations.filter(m => !appliedVersions.includes(m.version));

    if (pending.length === 0) {
      console.log(`  ✅ No pending migrations for plugin: ${pluginName}`);
      return { applied: 0, migrations: [] };
    }

    console.log(`  📋 Found ${pending.length} pending migration(s) for ${pluginName}`);

    const results = [];

    for (const migration of pending) {
      try {
        console.log(`    🔄 Applying ${migration.version}: ${migration.name}...`);

        const executionTime = await this._executeMigration(migration, 'up');

        // Record plugin migration
        await new Promise((resolve, reject) => {
          this.db.run(
            `INSERT INTO plugin_migrations (plugin_name, version, name, description, execution_time_ms)
             VALUES (?, ?, ?, ?, ?)`,
            [pluginName, migration.version, migration.name, migration.description, executionTime],
            (err) => {
              if (err) return reject(err);
              resolve();
            }
          );
        });

        console.log(`    ✅ Applied ${migration.version} (${executionTime}ms)`);
        results.push({
          version: migration.version,
          name: migration.name,
          status: 'success',
          executionTime
        });

      } catch (error) {
        console.error(`    ❌ Plugin migration ${migration.version} failed:`, error.message);

        results.push({
          version: migration.version,
          name: migration.name,
          status: 'failed',
          error: error.message
        });

        throw new Error(
          `Plugin ${pluginName} migration ${migration.version} failed: ${error.message}`
        );
      }
    }

    console.log(`  ✅ Applied ${results.length} migration(s) for ${pluginName}`);
    return { applied: results.length, migrations: results };
  }


  /**
   * Get plugin migration status
   * @param {string} pluginName - Name of the plugin
   * @returns {Promise<Object>} Status object
   */
  async statusPlugin(pluginName) {
    await this._initializeTables();

    const pluginMigrationsPath = this._findPluginMigrationsPath(pluginName);

    if (!pluginMigrationsPath) {
      return {
        plugin: pluginName,
        current_version: 0,
        applied: [],
        pending: []
      };
    }

    const allMigrations = await this._discoverMigrations(pluginMigrationsPath);

    const appliedVersions = await new Promise((resolve, reject) => {
      this.db.all(
        'SELECT version FROM plugin_migrations WHERE plugin_name = ? ORDER BY version ASC',
        [pluginName],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows.map(row => row.version));
        }
      );
    });

    const currentVersion = appliedVersions.length > 0
      ? Math.max(...appliedVersions)
      : 0;

    const applied = allMigrations.filter(m => appliedVersions.includes(m.version));
    const pending = allMigrations.filter(m => !appliedVersions.includes(m.version));

    return {
      plugin: pluginName,
      current_version: currentVersion,
      applied: applied.map(m => ({
        version: m.version,
        name: m.name,
        description: m.description
      })),
      pending: pending.map(m => ({
        version: m.version,
        name: m.name,
        description: m.description
      }))
    };
  }
}

module.exports = MigrationManager;

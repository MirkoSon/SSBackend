const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const MigrationManager = require('../db/migrations/MigrationManager');

/**
 * ProjectContext - Encapsulates project-specific state
 * 
 * Each project has:
 * - Isolated database connection
 * - Own MigrationManager instance
 * - Own PluginManager instance (initialized in Phase 2)
 * - Project-specific configuration
 * 
 * Epic 7 - Multi-Project Support
 * Story 7.1.1 - Project Manager Foundation
 */
class ProjectContext {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description || '';
        this.databasePath = config.database;
        this.pluginConfig = config.plugins;
        this.createdAt = new Date(config.created_at || Date.now());
        this.lastAccessed = new Date();

        // These will be initialized in initialize()
        this.database = null;
        this.pluginManager = null;
        this.migrationManager = null;
    }

    /**
     * Initialize project context
     * - Opens database connection
     * - Runs migrations
     * - Initializes plugins
     */
    async initialize(app) {
        console.log(`  📂 Initializing project: ${this.id} (${this.name})`);

        // Open database connection
        this.database = await this._openDatabase();
        console.log(`    ✓ Database opened: ${this.databasePath}`);

        // Run migrations
        this.migrationManager = new MigrationManager(this.database);
        await this.migrationManager.migrate();
        console.log(`    ✓ Migrations complete`);

        // Initialize plugins for this project (Story 7.2.2)
        if (app) {
            await this.initializePlugins(app);
            console.log(`    ✓ Plugins initialized`);
        }

        console.log(`  ✅ Project ${this.id} initialized`);
    }

    /**
     * Open database connection
     * @private
     * @returns {Promise<sqlite3.Database>} Database instance
     */
    async _openDatabase() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.databasePath, (err) => {
                if (err) {
                    reject(new Error(`Failed to open database ${this.databasePath}: ${err.message}`));
                } else {
                    resolve(db);
                }
            });
        });
    }

    /**
     * Update last accessed timestamp
     */
    touch() {
        this.lastAccessed = new Date();
    }

    /**
     * Close database connection and cleanup
     */
    async close() {
        if (this.database) {
            await new Promise((resolve) => {
                this.database.close((err) => {
                    if (err) {
                        console.error(`Error closing database for project ${this.id}:`, err.message);
                    }
                    resolve();
                });
            });
            this.database = null;
        }

        // TODO [Phase 2 - Story 7.2.2]: Cleanup plugins
        // if (this.pluginManager) {
        //   await this.pluginManager.deactivateAll();
        // }

        console.log(`  🔒 Project ${this.id} closed`);
    }

    /**
     * Initialize plugins for this project
     * @param {Object} app - Express app instance
     */
    async initializePlugins(app) {
        const PluginManager = require('../plugins/PluginManager');
        this.pluginManager = new PluginManager(this.id);
        await this.pluginManager.initialize(app, this.database, this.pluginConfig);
    }

    /**
     * Get project metadata
     * @returns {Object} Project metadata
     */
    getMetadata() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            database: this.databasePath,
            createdAt: this.createdAt,
            lastAccessed: this.lastAccessed
        };
    }
}

module.exports = ProjectContext;

const ProjectContext = require('./ProjectContext');

/**
 * ProjectManager - Orchestrates multiple game projects
 * 
 * Manages project lifecycle, lazy loading, and LRU eviction.
 * Each project has isolated database, plugins, and configuration.
 * 
 * Epic 7 - Multi-Project Support
 * Story 7.1.1 - Project Manager Foundation
 */
class ProjectManager {
    constructor(config) {
        this.projects = new Map(); // projectId -> ProjectContext
        this.config = config;
        this.maxProjects = config.maxConcurrentProjects || 10;
    }

    /**
     * Initialize ProjectManager and load all configured projects
     * @param {Object} app - Express app instance (for plugin initialization)
     */
    async initialize(app) {
        console.log('🚀 Initializing ProjectManager...');

        this.app = app; // Store for later use

        if (!this.config.projects || this.config.projects.length === 0) {
            throw new Error('No projects configured in config.yml');
        }

        // Load all projects from config
        for (const projectConfig of this.config.projects) {
            try {
                await this.loadProject(projectConfig.id);
            } catch (error) {
                console.error(`❌ Failed to load project ${projectConfig.id}:`, error.message);
                throw error;
            }
        }

        console.log(`✅ ProjectManager initialized with ${this.projects.size} project(s)`);
    }

    /**
     * Load a project by ID
     * @param {string} projectId - Project identifier
     * @returns {Promise<ProjectContext>} Loaded project context
     */
    async loadProject(projectId) {
        // Check if already loaded
        if (this.projects.has(projectId)) {
            const project = this.projects.get(projectId);
            project.touch(); // Update last accessed
            return project;
        }

        // Find project config
        const projectConfig = this.config.projects.find(p => p.id === projectId);
        if (!projectConfig) {
            throw new Error(`Project ${projectId} not found in config`);
        }

        // Check if we need to evict (LRU)
        if (this.projects.size >= this.maxProjects) {
            this.evictLRU();
        }

        // Create and initialize project context
        console.log(`📦 Loading project: ${projectId}`);
        const context = new ProjectContext(projectConfig);
        await context.initialize(this.app);

        this.projects.set(projectId, context);
        return context;
    }

    /**
     * Get a project by ID (does not load if not already loaded)
     * @param {string} projectId - Project identifier
     * @returns {ProjectContext|undefined} Project context or undefined
     */
    getProject(projectId) {
        const project = this.projects.get(projectId);
        if (project) {
            project.touch(); // Update last accessed
        }
        return project;
    }

    /**
     * List all currently loaded projects
     * @returns {Array<Object>} Array of project metadata
     */
    listProjects() {
        return Array.from(this.projects.values()).map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            database: p.databasePath,
            createdAt: p.createdAt,
            lastAccessed: p.lastAccessed
        }));
    }

    /**
     * Create a new project
     * @param {Object} projectConfig - Project configuration
     * @returns {Promise<ProjectContext>} Created project context
     */
    async createProject(projectConfig) {
        if (!projectConfig.id || !projectConfig.name) {
            throw new Error('Project must have id and name');
        }

        // Check if project already exists
        if (this.config.projects.find(p => p.id === projectConfig.id)) {
            throw new Error(`Project ${projectConfig.id} already exists`);
        }

        // Add to config
        const newProject = {
            id: projectConfig.id,
            name: projectConfig.name,
            description: projectConfig.description || '',
            database: projectConfig.database || `./projects/${projectConfig.id}.db`,
            created_at: new Date().toISOString(),
            plugins: projectConfig.plugins || {
                auto_discover: true,
                plugin_list: []
            }
        };

        this.config.projects.push(newProject);

        // Load the new project
        const context = await this.loadProject(newProject.id);

        console.log(`✅ Created project: ${newProject.id}`);
        return context;
    }

    /**
     * Delete a project
     * @param {string} projectId - Project identifier
     */
    async deleteProject(projectId) {
        if (projectId === 'default') {
            throw new Error('Cannot delete default project');
        }

        // Close project if loaded
        const project = this.projects.get(projectId);
        if (project) {
            await project.close();
            this.projects.delete(projectId);
        }

        // Remove from config
        const index = this.config.projects.findIndex(p => p.id === projectId);
        if (index !== -1) {
            this.config.projects.splice(index, 1);
        }

        console.log(`✅ Deleted project: ${projectId}`);
    }

    /**
     * Evict least recently used project
     * @private
     */
    evictLRU() {
        if (this.projects.size === 0) return;

        // Find project with oldest lastAccessed
        const [oldestId, oldestProject] = [...this.projects.entries()]
            .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)[0];

        console.log(`🗑️  Evicting LRU project: ${oldestId}`);
        oldestProject.close();
        this.projects.delete(oldestId);
    }

    /**
     * Close all projects and cleanup
     */
    async closeAll() {
        console.log('🔒 Closing all projects...');
        for (const [projectId, project] of this.projects.entries()) {
            await project.close();
        }
        this.projects.clear();
        console.log('✅ All projects closed');
    }
}

module.exports = ProjectManager;

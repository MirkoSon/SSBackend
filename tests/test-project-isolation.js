/**
 * Integration Test for Epic 7 - Multi-Project Data and Plugin Isolation
 * 
 * Verifies that:
 * 1. Data written to one project database is not visible in another.
 * 2. Plugins enabled in one project are not active in another.
 */

const fs = require('fs');
const path = require('path');
const ProjectManager = require('../src/projects/ProjectManager');
const { loadConfig } = require('../src/utils/config');
const yaml = require('js-yaml'); // Added for writing temporary config

async function runIsolationTest() {
    console.log('🧪 Running Multi-Project Isolation Test...\n');

    // Initial cleanup
    if (fs.existsSync('./test-isolation-a.db')) fs.unlinkSync('./test-isolation-a.db');
    if (fs.existsSync('./test-isolation-b.db')) fs.unlinkSync('./test-isolation-b.db');
    if (fs.existsSync('./test-isolation-config.yml')) fs.unlinkSync('./test-isolation-config.yml');

    // Create a temporary config file for the test
    const tempConfigPath = './test-isolation-config.yml';
    const testConfig = {
        server: { port: 3000, default_project: 'default' },
        auth: { jwt_secret: 'test-secret', jwt_expires_in: '24h', session_secret: 'test-session' },
        projects: [
            { id: 'project-a', name: 'Project A', database: './test-isolation-a.db', plugins: { auto_discover: false } },
            { id: 'project-b', name: 'Project B', database: './test-isolation-b.db', plugins: { auto_discover: false } }
        ]
    };
    fs.writeFileSync(tempConfigPath, yaml.dump(testConfig));

    // Initialize global config
    loadConfig(tempConfigPath);

    // Mock app for plugin initialization
    const mockApp = {
        use: () => { },
        get: () => { },
        post: () => { },
        put: () => { },
        delete: () => { },
        set: () => { },
        _router: { stack: [] } // Needed for PluginManager route registration
    };

    const projectManager = new ProjectManager(testConfig);

    try {
        // 1. Initialize projects
        await projectManager.initialize(mockApp);

        const projectA = projectManager.getProject('project-a');
        const projectB = projectManager.getProject('project-b');

        console.log('✅ Projects initialized.');

        // 2. Test Data Isolation
        console.log('\n🔍 Testing Data Isolation...');

        // Write to Project A
        await new Promise((resolve, reject) => {
            projectA.database.run(
                'INSERT INTO saves (id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                ['test-id', JSON.stringify({ name: 'Project A Data' })],
                (err) => err ? reject(err) : resolve()
            );
        });
        console.log('   ✓ Wrote data to Project A');

        // Read from Project B
        const dataInB = await new Promise((resolve, reject) => {
            projectB.database.get(
                'SELECT * FROM saves WHERE id = ?',
                ['test-id'],
                (err, row) => err ? reject(err) : resolve(row)
            );
        });

        if (dataInB) {
            throw new Error('Data isolation breach! Data from Project A found in Project B.');
        }
        console.log('   ✅ Project B is empty as expected.');

        // 3. Test Plugin Isolation
        console.log('\n🔍 Testing Plugin Isolation...');

        // In our current implementation, plugins are loaded from config.
        // If we want to test isolation, we should check if they have separate PluginManager instances.
        if (projectA.pluginManager === projectB.pluginManager) {
            throw new Error('Plugin isolation breach! Projects share the same PluginManager instance.');
        }
        console.log('   ✅ Each project has a separate PluginManager instance.');

        // Check plugin status in both (they should be empty or matching their own configs)
        console.log(`   Project A active plugins: ${projectA.pluginManager.activePlugins.size}`);
        console.log(`   Project B active plugins: ${projectB.pluginManager.activePlugins.size}`);

        // 4. Test LRU Eviction does not lose data
        console.log('\n🔍 Testing LRU doesn\'t corrupt state...');
        await projectManager.closeAll();
        projectManager.maxProjects = 1; // Force eviction (use maxProjects, not maxConcurrentProjects)

        console.log('   Loading Project A...');
        await projectManager.loadProject('project-a');

        console.log('   Loading Project B (should evict A)...');
        await projectManager.loadProject('project-b');

        if (projectManager.projects.has('project-a')) {
            throw new Error('Eviction failed! Project A should have been evicted.');
        }
        console.log('   ✅ Project A was evicted successfully.');

        // Reload Project A
        console.log('   Reloading Project A...');
        const reloadedA = await projectManager.loadProject('project-a');

        const reloadedData = await new Promise((resolve, reject) => {
            reloadedA.database.get(
                'SELECT * FROM saves WHERE id = ?',
                ['test-id'],
                (err, row) => err ? reject(err) : resolve(row)
            );
        });

        if (!reloadedData) {
            throw new Error('Data persistence lost! Data in Project A missing after reload.');
        }
        console.log('   ✅ Data in Project A persisted after eviction/reload.');

        console.log('\n🎉 Isolation tests passed successfully!');

    } catch (error) {
        console.error('\n❌ Isolation test failed:', error.message);
        throw error;
    } finally {
        // Cleanup
        await projectManager.closeAll();
        if (fs.existsSync('./test-isolation-a.db')) fs.unlinkSync('./test-isolation-a.db');
        if (fs.existsSync('./test-isolation-b.db')) fs.unlinkSync('./test-isolation-b.db');
        if (fs.existsSync('./test-isolation-config.yml')) fs.unlinkSync('./test-isolation-config.yml');
    }
}

runIsolationTest();

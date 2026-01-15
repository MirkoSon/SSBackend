/**
 * Unit Tests for Story 7.1.1 - Project Manager Foundation
 * 
 * Tests ProjectManager and ProjectContext classes
 * 
 * Run: node tests/test-project-manager.js
 */

const fs = require('fs');
const path = require('path');
const ProjectManager = require('../src/projects/ProjectManager');
const ProjectContext = require('../src/projects/ProjectContext');

// Test utilities
class TestRunner {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    async run() {
        console.log('🧪 Running Project Manager Tests...\n');

        for (const test of this.tests) {
            try {
                await test.fn();
                this.results.push({ name: test.name, passed: true });
                console.log(`✅ ${test.name}`);
            } catch (error) {
                this.results.push({ name: test.name, passed: false, error: error.message });
                console.log(`❌ ${test.name}: ${error.message}`);
            }
        }

        this.printSummary();
    }

    printSummary() {
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;
        const total = this.results.length;

        console.log(`\n📊 Test Summary: ${passed}/${total} tests passed`);

        if (failed > 0) {
            console.log('\n❌ Failed tests:');
            this.results.filter(r => !r.passed).forEach(r => {
                console.log(`  - ${r.name}: ${r.error}`);
            });
            process.exit(1);
        } else {
            console.log('🎉 All tests passed!');
            process.exit(0);
        }
    }
}

// Helper functions
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

function assertDefined(value, message) {
    if (value === undefined || value === null) {
        throw new Error(message || 'Value is undefined or null');
    }
}

// Mock config for testing
function getMockConfig() {
    return {
        maxConcurrentProjects: 3, // Lower limit for testing LRU
        projects: [
            {
                id: 'test-project-1',
                name: 'Test Project 1',
                description: 'First test project',
                database: './test-db-1.db',
                created_at: '2026-01-01T00:00:00Z',
                plugins: {
                    auto_discover: true,
                    plugin_list: []
                }
            },
            {
                id: 'test-project-2',
                name: 'Test Project 2',
                description: 'Second test project',
                database: './test-db-2.db',
                created_at: '2026-01-02T00:00:00Z',
                plugins: {
                    auto_discover: true,
                    plugin_list: []
                }
            }
        ]
    };
}

// Cleanup test databases
function cleanupTestDatabases() {
    const testDbs = ['./test-db-1.db', './test-db-2.db', './test-db-3.db', './test-db-4.db'];
    testDbs.forEach(db => {
        if (fs.existsSync(db)) {
            fs.unlinkSync(db);
        }
    });
}

// Test suite
const runner = new TestRunner();

// ===== ProjectManager Tests =====

runner.test('ProjectManager: initializes with config', async () => {
    const config = getMockConfig();
    const pm = new ProjectManager(config);

    assertDefined(pm, 'ProjectManager should be defined');
    assertEquals(pm.projects.size, 0, 'Should start with 0 loaded projects');
    assertEquals(pm.maxProjects, 3, 'Should respect maxConcurrentProjects');
});

runner.test('ProjectManager: loads projects from config', async () => {
    cleanupTestDatabases();
    const config = getMockConfig();
    const pm = new ProjectManager(config);

    await pm.initialize();

    assertEquals(pm.projects.size, 2, 'Should load 2 projects');
    assert(pm.projects.has('test-project-1'), 'Should have test-project-1');
    assert(pm.projects.has('test-project-2'), 'Should have test-project-2');

    await pm.closeAll();
    cleanupTestDatabases();
});

runner.test('ProjectManager: getProject returns correct context', async () => {
    cleanupTestDatabases();
    const config = getMockConfig();
    const pm = new ProjectManager(config);

    await pm.initialize();

    const project = pm.getProject('test-project-1');
    assertDefined(project, 'Project should be defined');
    assertEquals(project.id, 'test-project-1', 'Should return correct project');
    assertEquals(project.name, 'Test Project 1', 'Should have correct name');

    await pm.closeAll();
    cleanupTestDatabases();
});

runner.test('ProjectManager: listProjects returns all projects', async () => {
    cleanupTestDatabases();
    const config = getMockConfig();
    const pm = new ProjectManager(config);

    await pm.initialize();

    const projects = pm.listProjects();
    assertEquals(projects.length, 2, 'Should list 2 projects');
    assert(projects.find(p => p.id === 'test-project-1'), 'Should include test-project-1');
    assert(projects.find(p => p.id === 'test-project-2'), 'Should include test-project-2');

    await pm.closeAll();
    cleanupTestDatabases();
});

runner.test('ProjectManager: createProject adds new project', async () => {
    cleanupTestDatabases();
    const config = getMockConfig();
    const pm = new ProjectManager(config);

    await pm.initialize();

    const newProject = await pm.createProject({
        id: 'test-project-3',
        name: 'Test Project 3',
        description: 'Third test project',
        database: './test-db-3.db'
    });

    assertDefined(newProject, 'New project should be defined');
    assertEquals(newProject.id, 'test-project-3', 'Should have correct ID');
    assertEquals(pm.projects.size, 3, 'Should have 3 projects loaded');

    await pm.closeAll();
    cleanupTestDatabases();
});

runner.test('ProjectManager: LRU eviction works when maxProjects exceeded', async () => {
    cleanupTestDatabases();
    const config = getMockConfig();
    const pm = new ProjectManager(config);

    await pm.initialize();

    // Load 2 projects (test-project-1, test-project-2)
    assertEquals(pm.projects.size, 2, 'Should have 2 projects');

    // Access test-project-2 to make it more recent
    pm.getProject('test-project-2');

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create third project (should be fine, max is 3)
    await pm.createProject({
        id: 'test-project-3',
        name: 'Test Project 3',
        database: './test-db-3.db'
    });
    assertEquals(pm.projects.size, 3, 'Should have 3 projects');

    // Create fourth project (should trigger LRU eviction of test-project-1)
    await pm.createProject({
        id: 'test-project-4',
        name: 'Test Project 4',
        database: './test-db-4.db'
    });

    assertEquals(pm.projects.size, 3, 'Should still have 3 projects (max)');
    assert(!pm.projects.has('test-project-1'), 'test-project-1 should be evicted (LRU)');
    assert(pm.projects.has('test-project-2'), 'test-project-2 should remain (accessed recently)');
    assert(pm.projects.has('test-project-3'), 'test-project-3 should remain');
    assert(pm.projects.has('test-project-4'), 'test-project-4 should be loaded');

    await pm.closeAll();
    cleanupTestDatabases();
});

runner.test('ProjectManager: deleteProject removes project', async () => {
    cleanupTestDatabases();
    const config = getMockConfig();
    const pm = new ProjectManager(config);

    await pm.initialize();

    await pm.deleteProject('test-project-2');

    assertEquals(pm.projects.size, 1, 'Should have 1 project after deletion');
    assert(!pm.projects.has('test-project-2'), 'test-project-2 should be deleted');
    assertEquals(pm.config.projects.length, 1, 'Should remove from config');

    await pm.closeAll();
    cleanupTestDatabases();
});

runner.test('ProjectManager: cannot delete default project', async () => {
    cleanupTestDatabases();
    const config = {
        maxConcurrentProjects: 10,
        projects: [{
            id: 'default',
            name: 'Default Project',
            database: './test-db-1.db',
            plugins: { auto_discover: true, plugin_list: [] }
        }]
    };
    const pm = new ProjectManager(config);

    await pm.initialize();

    try {
        await pm.deleteProject('default');
        throw new Error('Should have thrown error');
    } catch (error) {
        assert(error.message.includes('Cannot delete default project'), 'Should prevent default deletion');
    }

    await pm.closeAll();
    cleanupTestDatabases();
});

// ===== ProjectContext Tests =====

runner.test('ProjectContext: initializes with config', () => {
    const config = {
        id: 'test-ctx',
        name: 'Test Context',
        description: 'Test description',
        database: './test-ctx.db',
        created_at: '2026-01-01T00:00:00Z',
        plugins: { auto_discover: true, plugin_list: [] }
    };

    const ctx = new ProjectContext(config);

    assertEquals(ctx.id, 'test-ctx', 'Should have correct ID');
    assertEquals(ctx.name, 'Test Context', 'Should have correct name');
    assertEquals(ctx.description, 'Test description', 'Should have correct description');
    assertEquals(ctx.databasePath, './test-ctx.db', 'Should have correct database path');
});

runner.test('ProjectContext: opens database connection', async () => {
    cleanupTestDatabases();
    const config = {
        id: 'test-ctx',
        name: 'Test Context',
        database: './test-db-1.db',
        plugins: { auto_discover: true, plugin_list: [] }
    };

    const ctx = new ProjectContext(config);
    await ctx.initialize();

    assertDefined(ctx.database, 'Database should be defined');
    assertDefined(ctx.migrationManager, 'MigrationManager should be defined');

    await ctx.close();
    cleanupTestDatabases();
});

runner.test('ProjectContext: touch() updates lastAccessed', async () => {
    const config = {
        id: 'test-ctx',
        name: 'Test Context',
        database: './test-db-1.db',
        plugins: { auto_discover: true, plugin_list: [] }
    };

    const ctx = new ProjectContext(config);
    const before = ctx.lastAccessed;

    await new Promise(resolve => setTimeout(resolve, 10));
    ctx.touch();

    const after = ctx.lastAccessed;
    assert(after > before, 'lastAccessed should be updated');
});

runner.test('ProjectContext: getMetadata returns correct data', async () => {
    const config = {
        id: 'test-ctx',
        name: 'Test Context',
        description: 'Test description',
        database: './test-db-1.db',
        created_at: '2026-01-01T00:00:00Z',
        plugins: { auto_discover: true, plugin_list: [] }
    };

    const ctx = new ProjectContext(config);
    const metadata = ctx.getMetadata();

    assertEquals(metadata.id, 'test-ctx', 'Metadata should have correct ID');
    assertEquals(metadata.name, 'Test Context', 'Metadata should have correct name');
    assertEquals(metadata.description, 'Test description', 'Metadata should have correct description');
    assertDefined(metadata.createdAt, 'Metadata should have createdAt');
    assertDefined(metadata.lastAccessed, 'Metadata should have lastAccessed');
});

// Run all tests
runner.run();

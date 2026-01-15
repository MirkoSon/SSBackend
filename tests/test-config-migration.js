/**
 * Unit Tests for Story 7.1.2 - Multi-Project Config Format
 * 
 * Tests config auto-migration from old single-project to new multi-project format
 * 
 * Run: node tests/test-config-migration.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const {
    isOldConfigFormat,
    migrateToMultiProject
} = require('../src/utils/config');

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
        console.log('🧪 Running Config Migration Tests...\n');

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

// Mock old config
function getOldConfig() {
    return {
        server: {
            port: 3012,
            host: 'localhost'
        },
        database: {
            file: 'game.db'
        },
        auth: {
            jwt_secret: 'test-secret',
            jwt_expires_in: '1h',
            session_secret: 'test-session'
        },
        dev: {
            enable_logging: false,
            enable_cors: true
        },
        plugins: {
            enabled: true,
            auto_discover: true,
            achievements: {
                enabled: true
            },
            economy: {
                enabled: true
            }
        }
    };
}

// Mock new config
function getNewConfig() {
    return {
        server: {
            port: 3012,
            host: 'localhost',
            default_project: 'default'
        },
        database: {
            file: 'game.db'
        },
        auth: {
            jwt_secret: 'test-secret',
            jwt_expires_in: '1h',
            session_secret: 'test-session'
        },
        dev: {
            enable_logging: false,
            enable_cors: true
        },
        projects: [
            {
                id: 'default',
                name: 'Default Project',
                database: './game.db',
                plugins: {
                    enabled: true,
                    auto_discover: true
                }
            }
        ]
    };
}

// Test suite
const runner = new TestRunner();

// ===== Config Format Detection Tests =====

runner.test('isOldConfigFormat: detects old format with plugins at root', () => {
    const oldConfig = getOldConfig();
    const result = isOldConfigFormat(oldConfig);
    assert(result, 'Should detect old format');
});

runner.test('isOldConfigFormat: detects new format with projects array', () => {
    const newConfig = getNewConfig();
    const result = isOldConfigFormat(newConfig);
    assert(!result, 'Should detect new format');
});

runner.test('isOldConfigFormat: handles config without plugins or projects', () => {
    const config = {
        server: { port: 3000 },
        auth: { jwt_secret: 'test' }
    };
    const result = isOldConfigFormat(config);
    assert(!result, 'Should return false for config without plugins/projects');
});

// ===== Migration Tests =====

runner.test('migrateToMultiProject: creates backup file', () => {
    const oldConfig = getOldConfig();
    const testConfigPath = './test-config-migration.yml';
    const backupPath = `${testConfigPath}.backup`;

    // Clean up any existing files
    if (fs.existsSync(testConfigPath)) fs.unlinkSync(testConfigPath);
    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);

    // Write test config
    fs.writeFileSync(testConfigPath, yaml.dump(oldConfig), 'utf8');

    // Migrate
    migrateToMultiProject(oldConfig, testConfigPath);

    // Check backup exists
    assert(fs.existsSync(backupPath), 'Backup file should exist');

    // Verify backup content
    const backupContent = yaml.load(fs.readFileSync(backupPath, 'utf8'));
    assert(backupContent.plugins, 'Backup should contain original plugins');

    // Cleanup
    fs.unlinkSync(testConfigPath);
    fs.unlinkSync(backupPath);
});

runner.test('migrateToMultiProject: creates projects array', () => {
    const oldConfig = getOldConfig();
    const testConfigPath = './test-config-migration.yml';

    // Clean up
    if (fs.existsSync(testConfigPath)) fs.unlinkSync(testConfigPath);
    if (fs.existsSync(`${testConfigPath}.backup`)) fs.unlinkSync(`${testConfigPath}.backup`);

    const newConfig = migrateToMultiProject(oldConfig, testConfigPath);

    assertDefined(newConfig.projects, 'Should have projects array');
    assertEquals(newConfig.projects.length, 1, 'Should have 1 project');
    assertEquals(newConfig.projects[0].id, 'default', 'Project should have id "default"');

    // Cleanup
    fs.unlinkSync(testConfigPath);
    fs.unlinkSync(`${testConfigPath}.backup`);
});

runner.test('migrateToMultiProject: preserves server config', () => {
    const oldConfig = getOldConfig();
    const testConfigPath = './test-config-migration.yml';

    // Clean up
    if (fs.existsSync(testConfigPath)) fs.unlinkSync(testConfigPath);
    if (fs.existsSync(`${testConfigPath}.backup`)) fs.unlinkSync(`${testConfigPath}.backup`);

    const newConfig = migrateToMultiProject(oldConfig, testConfigPath);

    assertEquals(newConfig.server.port, 3012, 'Should preserve port');
    assertEquals(newConfig.server.host, 'localhost', 'Should preserve host');
    assertEquals(newConfig.server.default_project, 'default', 'Should add default_project');

    // Cleanup
    fs.unlinkSync(testConfigPath);
    fs.unlinkSync(`${testConfigPath}.backup`);
});

runner.test('migrateToMultiProject: preserves auth config', () => {
    const oldConfig = getOldConfig();
    const testConfigPath = './test-config-migration.yml';

    // Clean up
    if (fs.existsSync(testConfigPath)) fs.unlinkSync(testConfigPath);
    if (fs.existsSync(`${testConfigPath}.backup`)) fs.unlinkSync(`${testConfigPath}.backup`);

    const newConfig = migrateToMultiProject(oldConfig, testConfigPath);

    assertEquals(newConfig.auth.jwt_secret, 'test-secret', 'Should preserve jwt_secret');
    assertEquals(newConfig.auth.session_secret, 'test-session', 'Should preserve session_secret');

    // Cleanup
    fs.unlinkSync(testConfigPath);
    fs.unlinkSync(`${testConfigPath}.backup`);
});

runner.test('migrateToMultiProject: moves plugins to project', () => {
    const oldConfig = getOldConfig();
    const testConfigPath = './test-config-migration.yml';

    // Clean up
    if (fs.existsSync(testConfigPath)) fs.unlinkSync(testConfigPath);
    if (fs.existsSync(`${testConfigPath}.backup`)) fs.unlinkSync(`${testConfigPath}.backup`);

    const newConfig = migrateToMultiProject(oldConfig, testConfigPath);

    assertDefined(newConfig.projects[0].plugins, 'Project should have plugins');
    assertEquals(newConfig.projects[0].plugins.enabled, true, 'Should preserve plugins.enabled');
    assertEquals(newConfig.projects[0].plugins.auto_discover, true, 'Should preserve plugins.auto_discover');

    // Cleanup
    fs.unlinkSync(testConfigPath);
    fs.unlinkSync(`${testConfigPath}.backup`);
});

runner.test('migrateToMultiProject: sets database path correctly', () => {
    const oldConfig = getOldConfig();
    const testConfigPath = './test-config-migration.yml';

    // Clean up
    if (fs.existsSync(testConfigPath)) fs.unlinkSync(testConfigPath);
    if (fs.existsSync(`${testConfigPath}.backup`)) fs.unlinkSync(`${testConfigPath}.backup`);

    const newConfig = migrateToMultiProject(oldConfig, testConfigPath);

    assertEquals(newConfig.projects[0].database, 'game.db', 'Should use database.file as project database');

    // Cleanup
    fs.unlinkSync(testConfigPath);
    fs.unlinkSync(`${testConfigPath}.backup`);
});

runner.test('migrateToMultiProject: adds metadata fields', () => {
    const oldConfig = getOldConfig();
    const testConfigPath = './test-config-migration.yml';

    // Clean up
    if (fs.existsSync(testConfigPath)) fs.unlinkSync(testConfigPath);
    if (fs.existsSync(`${testConfigPath}.backup`)) fs.unlinkSync(`${testConfigPath}.backup`);

    const newConfig = migrateToMultiProject(oldConfig, testConfigPath);

    assertEquals(newConfig.projects[0].name, 'Default Project', 'Should have project name');
    assertEquals(newConfig.projects[0].description, 'Auto-migrated from single-project config', 'Should have description');
    assertDefined(newConfig.projects[0].created_at, 'Should have created_at timestamp');

    // Cleanup
    fs.unlinkSync(testConfigPath);
    fs.unlinkSync(`${testConfigPath}.backup`);
});

runner.test('migrateToMultiProject: saves migrated config to file', () => {
    const oldConfig = getOldConfig();
    const testConfigPath = './test-config-migration.yml';

    // Clean up
    if (fs.existsSync(testConfigPath)) fs.unlinkSync(testConfigPath);
    if (fs.existsSync(`${testConfigPath}.backup`)) fs.unlinkSync(`${testConfigPath}.backup`);

    migrateToMultiProject(oldConfig, testConfigPath);

    // Read saved file
    assert(fs.existsSync(testConfigPath), 'Migrated config file should exist');
    const savedConfig = yaml.load(fs.readFileSync(testConfigPath, 'utf8'));

    assertDefined(savedConfig.projects, 'Saved config should have projects');
    assertEquals(savedConfig.projects.length, 1, 'Saved config should have 1 project');

    // Cleanup
    fs.unlinkSync(testConfigPath);
    fs.unlinkSync(`${testConfigPath}.backup`);
});

// Run all tests
runner.run();

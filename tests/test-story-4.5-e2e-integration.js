#!/usr/bin/env node
/**
 * End-to-End Integration Test Suite for Story 4.5: Economy Plugin Dashboard Integration
 * Validates complete integration across all phases (2.2, 3, 4, 5)
 * 
 * This test suite covers:
 * - Phase 2.2: Enhanced Reporting (CSV/PDF exports, analytics)
 * - Phase 3: Plugin Framework Integration (components, routes, navigation)
 * - Phase 4: CLI Plugin Management (plugin lifecycle via CLI)
 * - Phase 5: Final Integration (end-to-end workflows)
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const TEST_PORT = 3002;
const TEST_TIMEOUT = 45000;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const CLI_PATH = './src/cli/enhancedPluginCLI.js';

// Test results
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: [],
  phases: {
    '2.2': { passed: 0, failed: 0, total: 0 },
    '3': { passed: 0, failed: 0, total: 0 },
    '4': { passed: 0, failed: 0, total: 0 },
    '5': { passed: 0, failed: 0, total: 0 }
  }
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '📋';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function addTestResult(testName, passed, details = '', phase = '5') {
  testResults.total++;
  testResults.phases[phase].total++;
  
  if (passed) {
    testResults.passed++;
    testResults.phases[phase].passed++;
    log(`${testName}: PASSED`, 'success');
  } else {
    testResults.failed++;
    testResults.phases[phase].failed++;
    log(`${testName}: FAILED - ${details}`, 'error');
  }
  
  testResults.details.push({ testName, passed, details, phase });
}

async function waitForServer() {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkServer = () => {
      const req = http.get(`${BASE_URL}/health`, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          setTimeout(checkServer, 500);
        }
      });
      
      req.on('error', () => {
        if (Date.now() - startTime > TEST_TIMEOUT) {
          reject(new Error('Server failed to start within timeout'));
        } else {
          setTimeout(checkServer, 500);
        }
      });
    };
    checkServer();
  });
}

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => reject(new Error('Request timeout')));
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

function runCLICommand(args) {
  return new Promise((resolve, reject) => {
    const cli = spawn('node', [CLI_PATH, ...args], {
      stdio: 'pipe'
    });
    
    let stdout = '';
    let stderr = '';
    
    cli.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    cli.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    cli.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
    
    cli.on('error', reject);
  });
}

// Phase 2.2 Tests: Enhanced Reporting
async function testEnhancedReporting() {
  log('Testing Phase 2.2: Enhanced Reporting...');
  
  // Test CSV export
  try {
    const response = await makeRequest(`${BASE_URL}/admin/api/plugins/economy/reports/transactions/csv`);
    if (response.status === 200 && response.data.includes('Transaction ID')) {
      addTestResult('CSV Export', true, 'CSV export working', '2.2');
    } else {
      addTestResult('CSV Export', false, 'CSV export failed', '2.2');
    }
  } catch (error) {
    addTestResult('CSV Export', false, error.message, '2.2');
  }
  
  // Test PDF generation
  try {
    const response = await makeRequest(`${BASE_URL}/admin/api/plugins/economy/reports/balances/pdf`);
    if (response.status === 200 && response.data.includes('PDF')) {
      addTestResult('PDF Generation', true, 'PDF generation working', '2.2');
    } else {
      addTestResult('PDF Generation', false, 'PDF generation failed', '2.2');
    }
  } catch (error) {
    addTestResult('PDF Generation', false, error.message, '2.2');
  }
  
  // Test analytics endpoints
  try {
    const response = await makeRequest(`${BASE_URL}/admin/api/plugins/economy/analytics/summary`);
    if (response.status === 200 && response.data.totalTransactions !== undefined) {
      addTestResult('Analytics Summary', true, 'Analytics working', '2.2');
    } else {
      addTestResult('Analytics Summary', false, 'Analytics failed', '2.2');
    }
  } catch (error) {
    addTestResult('Analytics Summary', false, error.message, '2.2');
  }
}

// Phase 3 Tests: Plugin Framework Integration
async function testPluginFrameworkIntegration() {
  log('Testing Phase 3: Plugin Framework Integration...');
  
  // Test plugin loading
  try {
    const response = await makeRequest(`${BASE_URL}/admin/api/plugins`);
    if (response.status === 200 && response.data.plugins) {
      const economyPlugin = response.data.plugins.find(p => p.name === 'economy');
      if (economyPlugin && economyPlugin.status === 'active') {
        addTestResult('Plugin Loading', true, 'Economy plugin active', '3');
      } else {
        addTestResult('Plugin Loading', false, 'Economy plugin not active', '3');
      }
    } else {
      addTestResult('Plugin Loading', false, 'Plugins endpoint failed', '3');
    }
  } catch (error) {
    addTestResult('Plugin Loading', false, error.message, '3');
  }
  
  // Test component registration
  try {
    const response = await makeRequest(`${BASE_URL}/admin/api/plugins/economy/components`);
    if (response.status === 200 && response.data.components) {
      const expected = ['EconomyDashboard', 'BalanceManager', 'CurrencyConfig', 'TransactionMonitor', 'EconomyAnalytics', 'AlertConfig', 'ReportingHub'];
      const available = response.data.components;
      const missing = expected.filter(e => !available.includes(e));
      
      if (missing.length === 0) {
        addTestResult('Component Registration', true, 'All components registered', '3');
      } else {
        addTestResult('Component Registration', false, `Missing: ${missing.join(', ')}`, '3');
      }
    } else {
      addTestResult('Component Registration', false, 'Components endpoint failed', '3');
    }
  } catch (error) {
    addTestResult('Component Registration', false, error.message, '3');
  }
  
  // Test navigation registration
  try {
    const response = await makeRequest(`${BASE_URL}/admin/api/plugins/economy/navigation`);
    if (response.status === 200 && response.data.routes) {
      const expected = ['economy-dashboard', 'economy-balances', 'economy-currencies', 'economy-transactions', 'economy-analytics', 'economy-alerts', 'economy-reports'];
      const available = response.data.routes.map(r => r.path);
      const missing = expected.filter(e => !available.includes(e));
      
      if (missing.length === 0) {
        addTestResult('Navigation Registration', true, 'All routes registered', '3');
      } else {
        addTestResult('Navigation Registration', false, `Missing: ${missing.join(', ')}`, '3');
      }
    } else {
      addTestResult('Navigation Registration', false, 'Navigation endpoint failed', '3');
    }
  } catch (error) {
    addTestResult('Navigation Registration', false, error.message, '3');
  }
}

// Phase 4 Tests: CLI Plugin Management
async function testCLIPluginManagement() {
  log('Testing Phase 4: CLI Plugin Management...');
  
  // Test plugin listing
  try {
    const result = await runCLICommand(['list']);
    if (result.code === 0 && result.stdout.includes('economy')) {
      addTestResult('CLI Plugin List', true, 'CLI plugin listing working', '4');
    } else {
      addTestResult('CLI Plugin List', false, 'CLI plugin listing failed', '4');
    }
  } catch (error) {
    addTestResult('CLI Plugin List', false, error.message, '4');
  }
  
  // Test plugin info
  try {
    const result = await runCLICommand(['info', 'economy']);
    if (result.code === 0 && result.stdout.includes('Economy Plugin')) {
      addTestResult('CLI Plugin Info', true, 'CLI plugin info working', '4');
    } else {
      addTestResult('CLI Plugin Info', false, 'CLI plugin info failed', '4');
    }
  } catch (error) {
    addTestResult('CLI Plugin Info', false, error.message, '4');
  }
  
  // Test plugin status
  try {
    const result = await runCLICommand(['status', 'economy']);
    if (result.code === 0 && result.stdout.includes('active')) {
      addTestResult('CLI Plugin Status', true, 'CLI plugin status working', '4');
    } else {
      addTestResult('CLI Plugin Status', false, 'CLI plugin status failed', '4');
    }
  } catch (error) {
    addTestResult('CLI Plugin Status', false, error.message, '4');
  }
}

// Phase 5 Tests: End-to-End Integration
async function testEndToEndIntegration() {
  log('Testing Phase 5: End-to-End Integration...');
  
  // Test complete workflow: Install -> Configure -> Use -> Remove
  try {
    // 1. Verify plugin is installed and active
    const pluginResponse = await makeRequest(`${BASE_URL}/admin/api/plugins`);
    const economyPlugin = pluginResponse.data.plugins?.find(p => p.name === 'economy');
    
    if (!economyPlugin) {
      addTestResult('E2E Workflow', false, 'Plugin not found', '5');
      return;
    }
    
    // 2. Test configuration
    const configResponse = await makeRequest(`${BASE_URL}/admin/api/plugins/economy/currencies`);
    if (configResponse.status !== 200) {
      addTestResult('E2E Workflow', false, 'Configuration access failed', '5');
      return;
    }
    
    // 3. Test transaction creation
    const createResponse = await makeRequest(`${BASE_URL}/admin/api/plugins/economy/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        userId: 'test-user',
        currencyId: 'coins',
        amount: 100,
        type: 'credit',
        description: 'E2E test transaction'
      }
    });
    
    if (createResponse.status !== 201) {
      addTestResult('E2E Workflow', false, 'Transaction creation failed', '5');
      return;
    }
    
    // 4. Test balance update
    const balanceResponse = await makeRequest(`${BASE_URL}/admin/api/plugins/economy/balances/test-user`);
    if (balanceResponse.status !== 200) {
      addTestResult('E2E Workflow', false, 'Balance check failed', '5');
      return;
    }
    
    // 5. Test report generation
    const reportResponse = await makeRequest(`${BASE_URL}/admin/api/plugins/economy/reports/transactions/csv`);
    if (reportResponse.status !== 200) {
      addTestResult('E2E Workflow', false, 'Report generation failed', '5');
      return;
    }
    
    addTestResult('E2E Workflow', true, 'Complete workflow working', '5');
    
  } catch (error) {
    addTestResult('E2E Workflow', false, error.message, '5');
  }
}

// Performance and load testing
async function testPerformance() {
  log('Testing Performance and Load...');
  
  const startTime = Date.now();
  const requests = [];
  
  // Simulate concurrent requests
  for (let i = 0; i < 10; i++) {
    requests.push(makeRequest(`${BASE_URL}/admin/api/plugins/economy/metrics`));
  }
  
  try {
    const results = await Promise.all(requests);
    const endTime = Date.now();
    const avgResponseTime = (endTime - startTime) / 10;
    
    const allSuccess = results.every(r => r.status === 200);
    
    if (allSuccess && avgResponseTime < 1000) {
      addTestResult('Performance Test', true, `Average response: ${avgResponseTime}ms`, '5');
    } else {
      addTestResult('Performance Test', false, `Slow response: ${avgResponseTime}ms`, '5');
    }
  } catch (error) {
    addTestResult('Performance Test', false, error.message, '5');
  }
}

// Main test runner
async function runE2ETests() {
  log('Starting Story 4.5 End-to-End Integration Tests...');
  log('=================================================');
  
  // Start the server
  log('Starting test server...');
  const server = spawn('node', ['src/app.js'], {
    env: { ...process.env, PORT: TEST_PORT },
    stdio: 'pipe'
  });
  
  server.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (!message.includes('GET') && !message.includes('POST')) {
      log(`Server: ${message}`);
    }
  });
  
  server.stderr.on('data', (data) => {
    log(`Server Error: ${data.toString().trim()}`, 'error');
  });
  
  try {
    // Wait for server to start
    await waitForServer();
    log('Server started successfully');
    
    // Run all phase tests
    log('\n=== Phase 2.2: Enhanced Reporting ===');
    await testEnhancedReporting();
    
    log('\n=== Phase 3: Plugin Framework Integration ===');
    await testPluginFrameworkIntegration();
    
    log('\n=== Phase 4: CLI Plugin Management ===');
    await testCLIPluginManagement();
    
    log('\n=== Phase 5: End-to-End Integration ===');
    await testEndToEndIntegration();
    await testPerformance();
    
  } catch (error) {
    log(`Test runner error: ${error.message}`, 'error');
  } finally {
    // Clean up
    server.kill();
    
    // Print comprehensive summary
    log('\n=================================================');
    log('STORY 4.5 COMPLETION SUMMARY');
    log('=================================================');
    
    Object.keys(testResults.phases).forEach(phase => {
      const p = testResults.phases[phase];
      log(`Phase ${phase}: ${p.passed}/${p.total} tests passed`);
    });
    
    log(`\nOverall: ${testResults.passed}/${testResults.total} tests passed`);
    
    if (testResults.failed > 0) {
      log('\nFailed Tests:');
      testResults.details
        .filter(d => !d.passed)
        .forEach(d => log(`- [Phase ${d.phase}] ${d.testName}: ${d.details}`));
    }
    
    const success = testResults.failed === 0;
    log(`\nStory 4.5 Status: ${success ? 'COMPLETED' : 'INCOMPLETE'}`);
    
    process.exit(success ? 0 : 1);
  }
}

// Run if called directly
if (require.main === module) {
  runE2ETests();
}

module.exports = {
  runE2ETests,
  testResults
};
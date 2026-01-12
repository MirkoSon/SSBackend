#!/usr/bin/env node
/**
 * Test Script: Plugin Framework Integration
 * Validates the economy plugin's integration with the Plugin Framework
 * Part of Story 4.5: Economy Plugin Dashboard Integration - Phase 3
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const TEST_PORT = 3001;
const TEST_TIMEOUT = 30000;
const BASE_URL = `http://localhost:${TEST_PORT}`;

// Test results
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '📋';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function addTestResult(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    log(`${testName}: PASSED`, 'success');
  } else {
    testResults.failed++;
    log(`${testName}: FAILED - ${details}`, 'error');
  }
  testResults.details.push({ testName, passed, details });
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
    req.setTimeout(5000, () => reject(new Error('Request timeout')));
    req.end();
  });
}

// Test functions
async function testPluginLoading() {
  log('Testing plugin loading...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/admin/api/plugins`);
    if (response.status === 200 && response.data.plugins) {
      const economyPlugin = response.data.plugins.find(p => p.name === 'economy');
      if (economyPlugin && economyPlugin.status === 'active') {
        addTestResult('Plugin Loading', true, 'Economy plugin loaded and active');
        return true;
      }
    }
    addTestResult('Plugin Loading', false, 'Economy plugin not found or not active');
    return false;
  } catch (error) {
    addTestResult('Plugin Loading', false, error.message);
    return false;
  }
}

async function testComponentRegistration() {
  log('Testing component registration...');
  
  try {
    // Test if components are available through PluginFramework
    const browserTest = `
      const framework = window.PluginFramework;
      if (!framework) return { success: false, error: 'PluginFramework not found' };
      
      const components = framework.components || {};
      const expectedComponents = [
        'EconomyDashboard',
        'BalanceManager',
        'CurrencyConfig',
        'TransactionMonitor',
        'EconomyAnalytics',
        'AlertConfig',
        'ReportingHub'
      ];
      
      const missing = expectedComponents.filter(name => !components[name]);
      return {
        success: missing.length === 0,
        missing: missing,
        available: Object.keys(components)
      };
    `;
    
    // Since we can't run browser JS directly, we'll test the API endpoints
    const response = await makeRequest(`${BASE_URL}/admin/api/plugins/economy/components`);
    if (response.status === 200) {
      const expectedComponents = [
        'EconomyDashboard',
        'BalanceManager',
        'CurrencyConfig',
        'TransactionMonitor',
        'EconomyAnalytics',
        'AlertConfig',
        'ReportingHub'
      ];
      
      const available = response.data.components || [];
      const missing = expectedComponents.filter(name => !available.includes(name));
      
      if (missing.length === 0) {
        addTestResult('Component Registration', true, 'All components registered');
        return true;
      } else {
        addTestResult('Component Registration', false, `Missing: ${missing.join(', ')}`);
        return false;
      }
    }
    
    addTestResult('Component Registration', false, 'Components endpoint not accessible');
    return false;
  } catch (error) {
    addTestResult('Component Registration', false, error.message);
    return false;
  }
}

async function testNavigationRegistration() {
  log('Testing navigation registration...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/admin/api/plugins/economy/navigation`);
    if (response.status === 200 && response.data.routes) {
      const expectedRoutes = [
        'economy-dashboard',
        'economy-balances',
        'economy-currencies',
        'economy-transactions',
        'economy-analytics',
        'economy-alerts',
        'economy-reports'
      ];
      
      const available = response.data.routes.map(r => r.path);
      const missing = expectedRoutes.filter(route => !available.includes(route));
      
      if (missing.length === 0) {
        addTestResult('Navigation Registration', true, 'All routes registered');
        return true;
      } else {
        addTestResult('Navigation Registration', false, `Missing: ${missing.join(', ')}`);
        return false;
      }
    }
    
    addTestResult('Navigation Registration', false, 'Navigation endpoint not accessible');
    return false;
  } catch (error) {
    addTestResult('Navigation Registration', false, error.message);
    return false;
  }
}

async function testAuthenticationInheritance() {
  log('Testing authentication inheritance...');
  
  try {
    // Test without auth token
    const noAuthResponse = await makeRequest(`${BASE_URL}/admin/api/plugins/economy/metrics`);
    
    // Test with auth token (we'll simulate this)
    const authResponse = await makeRequest(`${BASE_URL}/admin/api/plugins/economy/metrics`, {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });
    
    if (noAuthResponse.status === 401 && authResponse.status !== 401) {
      addTestResult('Authentication Inheritance', true, 'Authentication properly enforced');
      return true;
    } else {
      addTestResult('Authentication Inheritance', false, 'Authentication not properly enforced');
      return false;
    }
  } catch (error) {
    addTestResult('Authentication Inheritance', false, error.message);
    return false;
  }
}

async function testErrorBoundaries() {
  log('Testing error boundaries...');
  
  try {
    // Test error handling by requesting a non-existent component
    const response = await makeRequest(`${BASE_URL}/admin/api/plugins/economy/components/nonexistent`);
    
    if (response.status === 404) {
      addTestResult('Error Boundaries', true, 'Error boundaries working');
      return true;
    } else {
      addTestResult('Error Boundaries', false, 'Error boundaries not working');
      return false;
    }
  } catch (error) {
    addTestResult('Error Boundaries', false, error.message);
    return false;
  }
}

async function testAdminOperations() {
  log('Testing admin operations...');
  
  const operations = [
    { name: 'Get Metrics', url: '/admin/api/plugins/economy/metrics' },
    { name: 'Get Balances', url: '/admin/api/plugins/economy/balances' },
    { name: 'Get Currencies', url: '/admin/api/plugins/economy/currencies' },
    { name: 'Get Transactions', url: '/admin/api/plugins/economy/transactions' },
    { name: 'Get Analytics', url: '/admin/api/plugins/economy/analytics' },
    { name: 'Get Alerts', url: '/admin/api/plugins/economy/alerts' },
    { name: 'Get Reports', url: '/admin/api/plugins/economy/reports' }
  ];
  
  let allPassed = true;
  
  for (const op of operations) {
    try {
      const response = await makeRequest(`${BASE_URL}${op.url}`);
      if (response.status === 200) {
        log(`${op.name}: OK`, 'success');
      } else {
        log(`${op.name}: FAILED (${response.status})`, 'error');
        allPassed = false;
      }
    } catch (error) {
      log(`${op.name}: ERROR (${error.message})`, 'error');
      allPassed = false;
    }
  }
  
  addTestResult('Admin Operations', allPassed, 'All admin operations tested');
  return allPassed;
}

async function testSecurityMeasures() {
  log('Testing security measures...');
  
  const securityTests = [
    { name: 'SQL Injection Prevention', payload: { currency: "'; DROP TABLE currencies; --" } },
    { name: 'XSS Prevention', payload: { description: "<script>alert('xss')</script>" } },
    { name: 'Path Traversal', payload: { filename: "../../../etc/passwd" } }
  ];
  
  let allPassed = true;
  
  for (const test of securityTests) {
    try {
      const response = await makeRequest(`${BASE_URL}/admin/api/plugins/economy/test-security`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.payload)
      });
      
      if (response.status === 400 || response.status === 422) {
        log(`${test.name}: Blocked`, 'success');
      } else {
        log(`${test.name}: Not properly blocked`, 'error');
        allPassed = false;
      }
    } catch (error) {
      log(`${test.name}: Error during test`, 'error');
      allPassed = false;
    }
  }
  
  addTestResult('Security Measures', allPassed, 'Security measures tested');
  return allPassed;
}

async function testComponentLoading() {
  log('Testing component loading/unloading...');
  
  try {
    // Test dynamic component loading
    const response = await makeRequest(`${BASE_URL}/admin/api/plugins/economy/components/EconomyDashboard`);
    if (response.status === 200 && response.data.component) {
      addTestResult('Component Loading', true, 'Dynamic component loading working');
      return true;
    } else {
      addTestResult('Component Loading', false, 'Component loading failed');
      return false;
    }
  } catch (error) {
    addTestResult('Component Loading', false, error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('Starting Plugin Framework Integration Tests...');
  log('============================================');
  
  // Start the server
  log('Starting test server...');
  const server = spawn('node', ['src/app.js'], {
    env: { ...process.env, PORT: TEST_PORT },
    stdio: 'pipe'
  });
  
  server.stdout.on('data', (data) => {
    log(`Server: ${data.toString().trim()}`);
  });
  
  server.stderr.on('data', (data) => {
    log(`Server Error: ${data.toString().trim()}`, 'error');
  });
  
  try {
    // Wait for server to start
    await waitForServer();
    log('Server started successfully');
    
    // Run all tests
    await testPluginLoading();
    await testComponentRegistration();
    await testNavigationRegistration();
    await testAuthenticationInheritance();
    await testErrorBoundaries();
    await testAdminOperations();
    await testSecurityMeasures();
    await testComponentLoading();
    
  } catch (error) {
    log(`Test runner error: ${error.message}`, 'error');
  } finally {
    // Clean up
    server.kill();
    
    // Print summary
    log('============================================');
    log('Test Summary:');
    log(`Total Tests: ${testResults.total}`);
    log(`Passed: ${testResults.passed}`);
    log(`Failed: ${testResults.failed}`);
    
    if (testResults.failed > 0) {
      log('Failed Tests:');
      testResults.details
        .filter(d => !d.passed)
        .forEach(d => log(`- ${d.testName}: ${d.details}`));
    }
    
    process.exit(testResults.failed > 0 ? 1 : 0);
  }
}

// Run if called directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testResults
};
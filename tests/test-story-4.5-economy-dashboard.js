/**
 * Test Story 4.5: Economy Plugin Dashboard Integration
 * Comprehensive test for economy admin UI and API endpoints
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ServerManager = require('../scripts/restart-and-auth.js');

const BASE_URL = 'http://localhost:3015';
const TEST_RESULTS = [];

// Test configuration
const TEST_CONFIG = {
  adminCredentials: {
    username: 'admin',
    password: 'admin123'
  }
};

let adminCookies = '';
let testUserId = null;

/**
 * Utility function to log test results
 */
function logTest(testName, status, message = '', details = null) {
  const result = {
    test: testName,
    status: status,
    message: message,
    timestamp: new Date().toISOString(),
    details: details
  };
  
  TEST_RESULTS.push(result);
  
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${statusIcon} ${testName}: ${message}`);
  
  if (details && (status === 'FAIL' || status === 'WARN')) {
    console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }
}

/**
 * Test economy metrics endpoint
 */
async function testEconomyMetrics() {
  try {
    console.log('\n📊 Testing economy metrics endpoint...');
    
    const response = await axios.get(`${BASE_URL}/admin/api/plugins/economy/metrics`, {
      headers: { Cookie: adminCookies }
    });
    
    if (response.status === 200 && response.data) {
      const metrics = response.data;
      const requiredFields = ['totalCurrencies', 'activeUsers', 'dailyTransactions', 'totalVolume'];
      const hasAllFields = requiredFields.every(field => metrics.hasOwnProperty(field));
      
      if (hasAllFields) {
        logTest('Economy Metrics API', 'PASS', 'Metrics endpoint returned all required fields', metrics);
      } else {
        logTest('Economy Metrics API', 'FAIL', 'Missing required fields in metrics response', {
          received: Object.keys(metrics),
          required: requiredFields
        });
      }
    } else {
      logTest('Economy Metrics API', 'FAIL', 'Invalid response from metrics endpoint', response.status);
    }
  } catch (error) {
    logTest('Economy Metrics API', 'FAIL', 'Metrics endpoint error', error.message);
  }
}

/**
 * Test system health endpoint
 */
async function testSystemHealth() {
  try {
    console.log('\n🏥 Testing system health endpoint...');
    
    const response = await axios.get(`${BASE_URL}/admin/api/plugins/economy/health`, {
      headers: { Cookie: adminCookies }
    });
    
    if (response.status === 200 && response.data) {
      const health = response.data;
      const requiredFields = ['databaseStatus', 'apiResponseTime'];
      const hasAllFields = requiredFields.every(field => health.hasOwnProperty(field));
      
      if (hasAllFields) {
        logTest('System Health API', 'PASS', `Health check passed - DB: ${health.databaseStatus}, Response: ${health.apiResponseTime}ms`);
      } else {
        logTest('System Health API', 'FAIL', 'Missing required fields in health response', health);
      }
    } else {
      logTest('System Health API', 'FAIL', 'Invalid response from health endpoint', response.status);
    }
  } catch (error) {
    logTest('System Health API', 'FAIL', 'Health endpoint error', error.message);
  }
}

/**
 * Test balance management endpoints
 */
async function testBalanceManagement() {
  if (!testUserId) {
    logTest('Balance Management API', 'FAIL', 'No test user available for balance tests');
    return;
  }
  
  try {
    console.log('\n💳 Testing balance management endpoints...');
    
    // Test get all balances
    const balancesResponse = await axios.get(`${BASE_URL}/admin/api/plugins/economy/balances`, {
      headers: { Cookie: adminCookies }
    });
    
    if (balancesResponse.status === 200) {
      logTest('Get All Balances API', 'PASS', `Retrieved ${balancesResponse.data.users?.length || 0} user balances`);
    } else {
      logTest('Get All Balances API', 'FAIL', 'Failed to retrieve balances', balancesResponse.status);
    }
    
    // Test balance adjustment
    const adjustmentResponse = await axios.put(`${BASE_URL}/admin/api/plugins/economy/balances/${testUserId}`, {
      currency: 'coins',
      adjustmentType: 'add',
      amount: 100,
      reason: 'Test balance adjustment for Story 4.5'
    }, {
      headers: { Cookie: adminCookies }
    });
    
    if (adjustmentResponse.status === 200) {
      logTest('Balance Adjustment API', 'PASS', `Successfully adjusted balance for user ${testUserId}`, adjustmentResponse.data);
    } else {
      logTest('Balance Adjustment API', 'FAIL', 'Failed to adjust balance', adjustmentResponse.status);
    }
    
  } catch (error) {
    logTest('Balance Management API', 'FAIL', 'Balance management error', error.message);
  }
}

/**
 * Test transaction monitoring endpoints
 */
async function testTransactionMonitoring() {
  try {
    console.log('\n📈 Testing transaction monitoring endpoints...');
    
    // Test get transactions
    const transactionsResponse = await axios.get(`${BASE_URL}/admin/api/plugins/economy/transactions`, {
      headers: { Cookie: adminCookies }
    });
    
    if (transactionsResponse.status === 200 && transactionsResponse.data) {
      const data = transactionsResponse.data;
      logTest('Transaction Monitoring API', 'PASS', `Retrieved ${data.transactions?.length || 0} transactions (Page ${data.page || 1}/${data.totalPages || 1})`);
    } else {
      logTest('Transaction Monitoring API', 'FAIL', 'Failed to retrieve transactions', transactionsResponse.status);
    }
    
    // Test transaction export
    const exportResponse = await axios.get(`${BASE_URL}/admin/api/plugins/economy/transactions/export?format=csv&limit=10`, {
      headers: { Cookie: adminCookies }
    });
    
    if (exportResponse.status === 200) {
      logTest('Transaction Export API', 'PASS', 'Successfully exported transaction data');
    } else {
      logTest('Transaction Export API', 'FAIL', 'Failed to export transactions', exportResponse.status);
    }
    
  } catch (error) {
    logTest('Transaction Monitoring API', 'FAIL', 'Transaction monitoring error', error.message);
  }
}

/**
 * Test analytics endpoints
 */
async function testAnalyticsEndpoints() {
  try {
    console.log('\n📊 Testing analytics endpoints...');
    
    // Test currency flow
    const flowResponse = await axios.get(`${BASE_URL}/admin/api/plugins/economy/analytics/flow`, {
      headers: { Cookie: adminCookies }
    });
    
    if (flowResponse.status === 200) {
      logTest('Currency Flow Analytics', 'PASS', `Retrieved ${flowResponse.data.flows?.length || 0} flow data points`);
    } else {
      logTest('Currency Flow Analytics', 'FAIL', 'Failed to retrieve flow data', flowResponse.status);
    }
    
    // Test user behavior
    const behaviorResponse = await axios.get(`${BASE_URL}/admin/api/plugins/economy/analytics/behavior`, {
      headers: { Cookie: adminCookies }
    });
    
    if (behaviorResponse.status === 200) {
      logTest('User Behavior Analytics', 'PASS', `Retrieved ${behaviorResponse.data.behavior?.length || 0} behavior categories`);
    } else {
      logTest('User Behavior Analytics', 'FAIL', 'Failed to retrieve behavior data', behaviorResponse.status);
    }
    
  } catch (error) {
    logTest('Analytics Endpoints', 'FAIL', 'Analytics error', error.message);
  }
}

/**
 * Test currency configuration endpoints
 */
async function testCurrencyConfiguration() {
  try {
    console.log('\n⚙️ Testing currency configuration endpoints...');
    
    // Test get currencies
    const currenciesResponse = await axios.get(`${BASE_URL}/admin/api/plugins/economy/currencies`, {
      headers: { Cookie: adminCookies }
    });
    
    if (currenciesResponse.status === 200) {
      logTest('Get Currencies API', 'PASS', `Retrieved ${currenciesResponse.data.currencies?.length || 0} currencies`);
    } else {
      logTest('Get Currencies API', 'FAIL', 'Failed to retrieve currencies', currenciesResponse.status);
    }
    
    // Test create test currency
    const createResponse = await axios.post(`${BASE_URL}/admin/api/plugins/economy/currencies`, {
      id: 'test_tokens',
      name: 'Test Tokens',
      symbol: '🎫',
      description: 'Test currency for Story 4.5 testing',
      decimal_places: 0,
      max_balance: 10000,
      transferable: true
    }, {
      headers: { Cookie: adminCookies }
    });
    
    if (createResponse.status === 200) {
      logTest('Create Currency API', 'PASS', 'Successfully created test currency');
      
      // Clean up by deleting the test currency
      try {
        await axios.delete(`${BASE_URL}/admin/api/plugins/economy/currencies/test_tokens`, {
          headers: { Cookie: adminCookies }
        });
        logTest('Delete Currency API', 'PASS', 'Successfully cleaned up test currency');
      } catch (deleteError) {
        logTest('Delete Currency API', 'WARN', 'Could not delete test currency', deleteError.message);
      }
    } else {
      logTest('Create Currency API', 'FAIL', 'Failed to create test currency', createResponse.status);
    }
    
  } catch (error) {
    if (error.response?.status === 409) {
      logTest('Create Currency API', 'WARN', 'Test currency already exists');
    } else {
      logTest('Currency Configuration API', 'FAIL', 'Currency configuration error', error.message);
    }
  }
}

/**
 * Test economy plugin UI components exist
 */
async function testUIComponents() {
  try {
    console.log('\n🎨 Testing economy UI components...');
    
    const componentFiles = [
      'src/plugins/internal/economy/ui/components/EconomyDashboard.js',
      'src/plugins/internal/economy/ui/components/BalanceManager.js',
      'src/plugins/internal/economy/ui/components/TransactionMonitor.js',
      'src/plugins/internal/economy/ui/components/EconomyAnalytics.js',
      'src/plugins/internal/economy/ui/components/CurrencyConfig.js'
    ];
    
    let missingComponents = [];
    let existingComponents = [];
    
    for (const componentPath of componentFiles) {
      const fullPath = path.join(__dirname, '..', componentPath);
      if (fs.existsSync(fullPath)) {
        existingComponents.push(path.basename(componentPath));
      } else {
        missingComponents.push(path.basename(componentPath));
      }
    }
    
    if (missingComponents.length === 0) {
      logTest('UI Components Check', 'PASS', `All ${existingComponents.length} economy UI components exist`);
    } else {
      logTest('UI Components Check', 'FAIL', `Missing components: ${missingComponents.join(', ')}`, {
        existing: existingComponents,
        missing: missingComponents
      });
    }
    
    // Check if economy manifest has adminUI section
    const manifestPath = path.join(__dirname, '..', 'src/plugins/internal/economy/index.js');
    if (fs.existsSync(manifestPath)) {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      if (manifestContent.includes('adminUI:') && manifestContent.includes('navigation:')) {
        logTest('Plugin Manifest Check', 'PASS', 'Economy plugin manifest includes adminUI configuration');
      } else {
        logTest('Plugin Manifest Check', 'FAIL', 'Economy plugin manifest missing adminUI section');
      }
    }
    
  } catch (error) {
    logTest('UI Components Check', 'FAIL', 'Component check error', error.message);
  }
}

/**
 * Generate comprehensive test report
 */
function generateTestReport() {
  console.log('\n📋 STORY 4.5 TEST SUMMARY');
  console.log('=' .repeat(50));
  
  const passedTests = TEST_RESULTS.filter(t => t.status === 'PASS').length;
  const failedTests = TEST_RESULTS.filter(t => t.status === 'FAIL').length;
  const warnTests = TEST_RESULTS.filter(t => t.status === 'WARN').length;
  const totalTests = TEST_RESULTS.length;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`⚠️  Warnings: ${warnTests}`);
  console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  console.log('\nDetailed Results:');
  console.log('-'.repeat(50));
  
  TEST_RESULTS.forEach(result => {
    const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${statusIcon} ${result.test}: ${result.message}`);
  });
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'test-story-4.5-results.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
      totalTests,
      passed: passedTests,
      failed: failedTests,
      warnings: warnTests,
      successRate: Math.round((passedTests / totalTests) * 100)
    },
    results: TEST_RESULTS,
    generatedAt: new Date().toISOString()
  }, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  return failedTests === 0;
}

/**
 * Main test execution
 */
async function runStory45Tests() {
  const manager = new ServerManager();
  try {
    console.log('🚀 Starting Story 4.5: Economy Plugin Dashboard Integration Tests');
    console.log('🎯 Target: http://localhost:3015');
    console.log('⏰ Started at:', new Date().toISOString());
    console.log('======================================================================');

    // Start the server
    await manager.startServer();
    await manager.waitForServer();

    // --- Admin Authentication ---
    console.log('\n📝 Authenticating as admin...');
    try {
      await axios.post(`${BASE_URL}/auth/register`, TEST_CONFIG.adminCredentials); // Ensure admin exists
    } catch (error) {
      // Ignore if admin already exists
    }
    const adminLoginResponse = await axios.post(`${BASE_URL}/admin/login`, TEST_CONFIG.adminCredentials);
    if (adminLoginResponse.status === 200 && adminLoginResponse.headers['set-cookie']) {
      adminCookies = adminLoginResponse.headers['set-cookie'].join('; ');
      logTest('Admin Authentication', 'PASS', 'Successfully authenticated as admin');
    } else {
      throw new Error('Admin authentication failed');
    }

    // --- Test User Creation ---
    const testUser = {
      username: `econtest_${Date.now()}`,
      password: 'password123'
    };
    console.log(`\n👤 Creating unique test user: ${testUser.username}...`);
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, testUser);
    if (registerResponse.status === 201) {
      testUserId = registerResponse.data.id;
      logTest('Test User Creation', 'PASS', `Created test user with ID: ${testUserId}`);
    } else {
      throw new Error('Test user creation failed');
    }
    
    // Core API endpoint tests
    await testEconomyMetrics();
    await testSystemHealth();
    await testBalanceManagement();
    await testTransactionMonitoring();
    await testAnalyticsEndpoints();
    await testCurrencyConfiguration();
    
    // UI component tests
    await testUIComponents();
    
    // Generate report
    const allTestsPassed = generateTestReport();
    
    console.log('\n🏁 Story 4.5 Testing Complete!');
    console.log(`Overall Status: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    return allTestsPassed;
    
  } catch (error) {
    console.error('💥 Fatal error during testing:', error);
    logTest('Test Execution', 'FAIL', 'Fatal error occurred', error.message);
    return false;
  } finally {
    // Ensure the server is killed after the tests
    console.log('\n\n🔌 Shutting down server...');
    await manager.killExistingServer();
    console.log('✅ Server shut down.');
  }
}

// Execute tests if run directly
if (require.main === module) {
  runStory45Tests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = {
  runStory45Tests,
  TEST_RESULTS
};
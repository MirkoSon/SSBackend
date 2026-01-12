/**
 * Test Suite for Epic 3 Story 3.3 - Economy Module
 * 
 * This test validates:
 * - Economy plugin loading and activation
 * - Currency management functionality
 * - Balance management and atomic transactions
 * - Transaction processing and rollback capabilities
 * - Economic analytics and reporting
 * - Performance under load
 * - Security and validation
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3015';
const TEST_CONFIG_PATH = path.join(__dirname, '..', 'config.yml');

class APITester {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.authToken = null;
    this.adminToken = null;
  }

  async makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (this.authToken) {
        options.headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const jsonBody = body ? JSON.parse(body) : {};
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: jsonBody
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: body
            });
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }
  async authenticate() {
    console.log('🔐 Authenticating users...');
    
    // Regular user authentication
    const loginResponse = await this.makeRequest('POST', '/auth/login', {
      username: 'testuser',
      password: 'testpass123'
    });

    if (loginResponse.status === 200) {
      this.authToken = loginResponse.body.token;
      console.log('✅ Regular user authenticated');
    } else {
      console.log('❌ Regular user authentication failed');
      throw new Error('Authentication failed for regular user');
    }

    // Admin user authentication  
    const adminLoginResponse = await this.makeRequest('POST', '/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    if (adminLoginResponse.status === 200) {
      this.adminToken = adminLoginResponse.body.token;
      console.log('✅ Admin user authenticated');
    } else {
      console.log('❌ Admin authentication failed');
      throw new Error('Authentication failed for admin user');
    }
  }

  async useAdminToken() {
    this.authToken = this.adminToken;
  }

  async useRegularToken() {
    this.authToken = this.authToken; // This was already set in authenticate
  }
}

class EconomyPluginTester {
  constructor(apiTester) {
    this.api = apiTester;
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async runTest(name, testFn) {
    console.log(`\n🧪 Testing: ${name}`);
    this.testResults.total++;
    
    try {
      await testFn();
      this.testResults.passed++;
      console.log(`✅ ${name} - PASSED`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({ test: name, error: error.message });
      console.log(`❌ ${name} - FAILED: ${error.message}`);
    }
  }

  async expect(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }
  // Test 1: Plugin Loading and Currency Initialization
  async testPluginInitialization() {
    const response = await this.api.makeRequest('GET', '/plugins/economy/currencies');
    
    await this.expect(response.status === 200, 'Should successfully fetch currencies');
    await this.expect(response.body.success === true, 'Response should indicate success');
    await this.expect(Array.isArray(response.body.currencies), 'Should return currencies array');
    
    // Check for default currencies
    const currencies = response.body.currencies;
    const coinsCurrency = currencies.find(c => c.id === 'coins');
    const gemsCurrency = currencies.find(c => c.id === 'gems');
    
    await this.expect(coinsCurrency !== undefined, 'Coins currency should be initialized');
    await this.expect(gemsCurrency !== undefined, 'Gems currency should be initialized');
    await this.expect(coinsCurrency.name === 'Coins', 'Coins currency should have correct name');
    await this.expect(coinsCurrency.symbol === '🪙', 'Coins currency should have correct symbol');
  }

  // Test 2: Currency Management (Admin Functions)
  async testCurrencyManagement() {
    await this.api.useAdminToken();
    
    // Create new currency
    const createResponse = await this.api.makeRequest('POST', '/plugins/economy/currencies', {
      id: 'testcoin',
      name: 'Test Coin',
      symbol: '🔧',
      decimal_places: 0,
      description: 'Test currency for validation',
      transferable: true,
      max_balance: 50000
    });
    
    await this.expect(createResponse.status === 201, 'Should create new currency successfully');
    await this.expect(createResponse.body.success === true, 'Create response should indicate success');
    
    // Get currency details
    const getResponse = await this.api.makeRequest('GET', '/plugins/economy/currencies/testcoin');
    await this.expect(getResponse.status === 200, 'Should fetch currency details');
    await this.expect(getResponse.body.currency.name === 'Test Coin', 'Should return correct currency name');
    
    // Update currency
    const updateResponse = await this.api.makeRequest('PUT', '/plugins/economy/currencies/testcoin', {
      description: 'Updated test currency'
    });
    await this.expect(updateResponse.status === 200, 'Should update currency successfully');
  }

  // Test 3: Balance Management
  async testBalanceManagement() {
    await this.api.useRegularToken();
    
    // Get user balances (should initialize if not exists)
    const balanceResponse = await this.api.makeRequest('GET', '/plugins/economy/balances/1');
    await this.expect(balanceResponse.status === 200, 'Should fetch user balances');
    await this.expect(typeof balanceResponse.body.balances === 'object', 'Should return balances object');
    
    // Check initial balances match configuration
    const balances = balanceResponse.body.balances;
    await this.expect(balances.coins.balance === 100, 'Should have initial coins balance');
    await this.expect(balances.gems.balance === 5, 'Should have initial gems balance');
    
    await this.api.useAdminToken();
    
    // Admin balance adjustment
    const adjustResponse = await this.api.makeRequest('POST', '/plugins/economy/balances/adjust', {
      userId: 1,
      currencyId: 'coins',
      adjustment: 500,
      reason: 'Test bonus'
    });
    
    await this.expect(adjustResponse.status === 200, 'Should adjust balance successfully');
    await this.expect(adjustResponse.body.newBalance === 600, 'Should have correct new balance');
  }
  // Test 4: Transaction Processing
  async testTransactionProcessing() {
    await this.api.useRegularToken();
    
    // Create earning transaction
    const earnResponse = await this.api.makeRequest('POST', '/plugins/economy/transactions', {
      userId: 1,
      currencyId: 'coins',
      amount: 250,
      type: 'earn',
      source: 'achievement',
      sourceId: 'daily-login',
      description: 'Daily login bonus',
      metadata: { streak: 7 }
    });
    
    await this.expect(earnResponse.status === 201, 'Should create earning transaction');
    await this.expect(earnResponse.body.success === true, 'Earn transaction should succeed');
    
    const earnTx = earnResponse.body.transaction;
    await this.expect(earnTx.amount === 250, 'Should have correct transaction amount');
    await this.expect(earnTx.balanceAfter === earnTx.balanceBefore + 250, 'Should update balance correctly');
    
    // Create spending transaction
    const spendResponse = await this.api.makeRequest('POST', '/plugins/economy/transactions', {
      userId: 1,
      currencyId: 'coins',
      amount: -100,
      type: 'spend',
      source: 'shop',
      sourceId: 'health-potion',
      description: 'Purchased health potion'
    });
    
    await this.expect(spendResponse.status === 201, 'Should create spending transaction');
    await this.expect(spendResponse.body.transaction.amount === -100, 'Should have negative amount for spending');
    
    // Test insufficient balance
    const insufficientResponse = await this.api.makeRequest('POST', '/plugins/economy/transactions', {
      userId: 1,
      currencyId: 'coins',
      amount: -10000,
      type: 'spend',
      source: 'shop',
      description: 'Expensive item'
    });
    
    await this.expect(insufficientResponse.status === 400, 'Should reject insufficient balance transaction');
  }

  // Test 5: Transaction History and Details
  async testTransactionHistory() {
    await this.api.useRegularToken();
    
    // Get transaction history
    const historyResponse = await this.api.makeRequest('GET', '/plugins/economy/transactions/1?limit=10');
    await this.expect(historyResponse.status === 200, 'Should fetch transaction history');
    await this.expect(Array.isArray(historyResponse.body.transactions), 'Should return transactions array');
    await this.expect(historyResponse.body.transactions.length > 0, 'Should have transaction records');
    
    // Get specific transaction details
    const firstTransaction = historyResponse.body.transactions[0];
    const detailResponse = await this.api.makeRequest('GET', `/plugins/economy/transactions/history/${firstTransaction.id}`);
    await this.expect(detailResponse.status === 200, 'Should fetch transaction details');
    await this.expect(detailResponse.body.transaction.id === firstTransaction.id, 'Should return correct transaction');
  }
  // Test 6: Transaction Rollback (Admin Function)
  async testTransactionRollback() {
    await this.api.useAdminToken();
    
    // Create a transaction to rollback
    const txResponse = await this.api.makeRequest('POST', '/plugins/economy/transactions', {
      userId: 1,
      currencyId: 'gems',
      amount: 10,
      type: 'admin',
      source: 'admin_bonus',
      description: 'Admin bonus - to be rolled back'
    });
    
    await this.expect(txResponse.status === 201, 'Should create admin transaction');
    const transactionId = txResponse.body.transaction.id;
    
    // Get balance before rollback
    const balanceBeforeRollback = await this.api.makeRequest('GET', '/plugins/economy/balances/1');
    const gemsBefore = balanceBeforeRollback.body.balances.gems.balance;
    
    // Rollback the transaction
    const rollbackResponse = await this.api.makeRequest('POST', `/plugins/economy/transactions/${transactionId}/rollback`, {
      reason: 'Test rollback functionality'
    });
    
    await this.expect(rollbackResponse.status === 200, 'Should rollback transaction successfully');
    await this.expect(rollbackResponse.body.success === true, 'Rollback should succeed');
    
    // Verify balance was restored
    const balanceAfterRollback = await this.api.makeRequest('GET', '/plugins/economy/balances/1');
    const gemsAfter = balanceAfterRollback.body.balances.gems.balance;
    await this.expect(gemsAfter === gemsBefore - 10, 'Balance should be restored after rollback');
  }

  // Test 7: Analytics and Reporting
  async testAnalytics() {
    await this.api.useAdminToken();
    
    // Get economy overview
    const overviewResponse = await this.api.makeRequest('GET', '/plugins/economy/analytics/overview');
    await this.expect(overviewResponse.status === 200, 'Should fetch economy overview');
    await this.expect(typeof overviewResponse.body.overview === 'object', 'Should return overview data');
    await this.expect(typeof overviewResponse.body.health === 'object', 'Should include health metrics');
    
    // Get currency analytics
    const currencyAnalytics = await this.api.makeRequest('GET', '/plugins/economy/analytics/currency/coins');
    await this.expect(currencyAnalytics.status === 200, 'Should fetch currency analytics');
    await this.expect(currencyAnalytics.body.analytics.currency.id === 'coins', 'Should return correct currency analytics');
    
    // Get user behavior analytics
    const userBehavior = await this.api.makeRequest('GET', '/plugins/economy/analytics/users?limit=50');
    await this.expect(userBehavior.status === 200, 'Should fetch user behavior analytics');
    await this.expect(typeof userBehavior.body.userBehavior === 'object', 'Should return user behavior data');
    
    // Get transaction flow analytics
    const flowAnalytics = await this.api.makeRequest('GET', '/plugins/economy/analytics/flow?days=7');
    await this.expect(flowAnalytics.status === 200, 'Should fetch flow analytics');
    await this.expect(Array.isArray(flowAnalytics.body.transactionFlow.dailyVolume), 'Should return daily volume data');
  }
  // Test 8: Security and Access Control
  async testSecurity() {
    await this.api.useRegularToken();
    
    // Test non-admin cannot create currencies
    const createCurrencyResponse = await this.api.makeRequest('POST', '/plugins/economy/currencies', {
      id: 'hackcoins',
      name: 'Hack Coins'
    });
    await this.expect(createCurrencyResponse.status === 403, 'Non-admin should not create currencies');
    
    // Test user cannot view other user balances
    const otherBalanceResponse = await this.api.makeRequest('GET', '/plugins/economy/balances/999');
    await this.expect(otherBalanceResponse.status === 403, 'Should not access other user balances');
    
    // Test user cannot create transactions for other users
    const otherUserTxResponse = await this.api.makeRequest('POST', '/plugins/economy/transactions', {
      userId: 999,
      currencyId: 'coins',
      amount: 1000,
      type: 'earn',
      source: 'hack'
    });
    await this.expect(otherUserTxResponse.status === 403, 'Should not create transactions for other users');
    
    // Test non-admin cannot rollback transactions
    const rollbackResponse = await this.api.makeRequest('POST', '/plugins/economy/transactions/fake-id/rollback');
    await this.expect(rollbackResponse.status === 403, 'Non-admin should not rollback transactions');
    
    // Test input validation
    const invalidTxResponse = await this.api.makeRequest('POST', '/plugins/economy/transactions', {
      userId: 1,
      currencyId: 'coins',
      amount: 'invalid',
      type: 'earn',
      source: 'test'
    });
    await this.expect(invalidTxResponse.status === 400, 'Should reject invalid transaction data');
  }

  // Test 9: Performance - Concurrent Transactions  
  async testConcurrentTransactions() {
    console.log('🚀 Testing concurrent transaction performance...');
    
    const concurrentPromises = [];
    const startTime = Date.now();
    
    // Create 10 concurrent transactions
    for (let i = 0; i < 10; i++) {
      const promise = this.api.makeRequest('POST', '/plugins/economy/transactions', {
        userId: 1,
        currencyId: 'coins',
        amount: 1,
        type: 'earn',
        source: 'performance_test',
        description: `Concurrent transaction ${i}`
      });
      concurrentPromises.push(promise);
    }
    
    const results = await Promise.all(concurrentPromises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️ Processed 10 concurrent transactions in ${duration}ms`);
    
    // All transactions should succeed
    const successCount = results.filter(r => r.status === 201).length;
    await this.expect(successCount === 10, 'All concurrent transactions should succeed');
    await this.expect(duration < 5000, 'Should process transactions within 5 seconds');
  }

  // Test 10: Balance Leaderboard
  async testBalanceLeaderboard() {
    await this.api.useRegularToken();
    
    const leaderboardResponse = await this.api.makeRequest('GET', '/plugins/economy/balances/leaderboard/coins?limit=20');
    await this.expect(leaderboardResponse.status === 200, 'Should fetch balance leaderboard');
    await this.expect(Array.isArray(leaderboardResponse.body.leaderboard), 'Should return leaderboard array');
    await this.expect(leaderboardResponse.body.currencyId === 'coins', 'Should return correct currency leaderboard');
    
    // Verify leaderboard is sorted correctly (highest balance first)
    const leaderboard = leaderboardResponse.body.leaderboard;
    if (leaderboard.length > 1) {
      await this.expect(leaderboard[0].balance >= leaderboard[1].balance, 'Leaderboard should be sorted by balance desc');
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Economy Plugin Test Suite...\n');
    
    // Authentication
    await this.api.authenticate();
    
    // Run all tests
    await this.runTest('Plugin Initialization', () => this.testPluginInitialization());
    await this.runTest('Currency Management', () => this.testCurrencyManagement());
    await this.runTest('Balance Management', () => this.testBalanceManagement());
    await this.runTest('Transaction Processing', () => this.testTransactionProcessing());
    await this.runTest('Transaction History', () => this.testTransactionHistory());
    await this.runTest('Transaction Rollback', () => this.testTransactionRollback());
    await this.runTest('Analytics and Reporting', () => this.testAnalytics());
    await this.runTest('Security and Access Control', () => this.testSecurity());
    await this.runTest('Concurrent Transactions', () => this.testConcurrentTransactions());
    await this.runTest('Balance Leaderboard', () => this.testBalanceLeaderboard());
    
    // Print results
    console.log('\n📊 Test Results:');
    console.log(`Total Tests: ${this.testResults.total}`);
    console.log(`Passed: ${this.testResults.passed}`);
    console.log(`Failed: ${this.testResults.failed}`);
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.errors.forEach(error => {
        console.log(`- ${error.test}: ${error.error}`);
      });
    }
    
    const successRate = (this.testResults.passed / this.testResults.total * 100).toFixed(1);
    console.log(`\n✨ Success Rate: ${successRate}%`);
    
    return this.testResults.failed === 0;
  }
}

// Main execution
async function main() {
  try {
    console.log('🧪 Economy Plugin Test Suite');
    console.log('============================\n');
    
    // Check if server is running
    const apiTester = new APITester(API_BASE);
    
    // Test server connectivity
    try {
      const healthCheck = await apiTester.makeRequest('GET', '/');
      if (healthCheck.status !== 200) {
        throw new Error('Server not responding correctly');
      }
      console.log('✅ Server connectivity confirmed');
    } catch (error) {
      console.log('❌ Server not accessible. Please ensure the server is running on port 3010');
      console.log('Run: npm start');
      process.exit(1);
    }
    
    const tester = new EconomyPluginTester(apiTester);
    const success = await tester.runAllTests();
    
    if (success) {
      console.log('\n🎉 All tests passed! Economy plugin is working correctly.');
      process.exit(0);
    } else {
      console.log('\n💥 Some tests failed. Please check the implementation.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Test suite error:', error.message);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  main();
}

module.exports = { EconomyPluginTester, APITester };    const apiTester = new APITester(API_BASE);
    
    // Check server connectivity
    try {
      const healthCheck = await apiTester.makeRequest('GET', '/health');
      if (healthCheck.status !== 200) {
        throw new Error('Server health check failed');
      }
      console.log('✅ Server is running and accessible\n');
    } catch (error) {
      console.log('❌ Cannot connect to server. Please ensure the server is running on port 3010');
      process.exit(1);
    }
    
    // Run tests
    const tester = new EconomyPluginTester(apiTester);
    const allTestsPassed = await tester.runAllTests();
    
    if (allTestsPassed) {
      console.log('\n🎉 All tests passed! Economy plugin is working correctly.');
      process.exit(0);
    } else {
      console.log('\n💥 Some tests failed. Please check the implementation.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Test suite failed with error:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { EconomyPluginTester, APITester };
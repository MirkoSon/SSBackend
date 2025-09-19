/**
 * Test Suite for Epic 3 Stories 3.1 and 3.2
 * 
 * Story 3.1: Plugin Architecture Foundation & Achievements Migration
 * Story 3.2: Leaderboards Module
 * 
 * This test validates:
 * - Plugin system functionality
 * - Achievements plugin integration
 * - Leaderboards plugin functionality
 * - API compatibility and data integrity
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3010'; // Using config port
const TEST_CONFIG_PATH = path.join(__dirname, '..', 'config.yml');

class APITester {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.authToken = null;
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
            const response = body ? JSON.parse(body) : {};
            resolve({ status: res.statusCode, data: response, headers: res.headers });
          } catch (e) {
            resolve({ status: res.statusCode, data: body, headers: res.headers });
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

  async login(username, password) {
    const response = await this.makeRequest('POST', '/auth/login', { username, password });
    if (response.status === 200 && response.data.token) {
      this.authToken = response.data.token;
    }
    return response;
  }

  async register(username, password) {
    return await this.makeRequest('POST', '/auth/register', { username, password });
  }
}

class TestRunner {
  constructor() {
    this.tester = new APITester(API_BASE);
    this.testUser = {
      username: `testuser_${Date.now()}`,
      password: 'testpass123'
    };
    this.passedTests = 0;
    this.totalTests = 0;
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 ${testName}`);
    this.totalTests++;
    try {
      await testFunction();
      console.log(`✅ ${testName} - PASSED`);
      this.passedTests++;
    } catch (error) {
      console.log(`❌ ${testName} - FAILED: ${error.message}`);
      console.log(`   Stack: ${error.stack.split('\n')[1].trim()}`);
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  assertEquals(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
    }
  }

  assertStatus(response, expectedStatus, message) {
    if (response.status !== expectedStatus) {
      throw new Error(`${message}\nExpected status: ${expectedStatus}\nActual status: ${response.status}\nResponse: ${JSON.stringify(response.data)}`);
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.totalTests}`);
    console.log(`Passed: ${this.passedTests}`);
    console.log(`Failed: ${this.totalTests - this.passedTests}`);
    console.log(`Success Rate: ${((this.passedTests/this.totalTests)*100).toFixed(1)}%`);
    
    if (this.passedTests === this.totalTests) {
      console.log('\n🎉 ALL TESTS PASSED!');
    } else {
      console.log('\n❌ Some tests failed. Please review above.');
    }
  }
}

async function main() {
  const runner = new TestRunner();
  
  console.log('🚀 Starting Epic 3 Stories 3.1 & 3.2 Test Suite');
  console.log('==================================================');
  
  // Setup user for testing
  await runner.runTest('User Setup', async () => {
    const registerResponse = await runner.tester.register(
      runner.testUser.username, 
      runner.testUser.password
    );
    runner.assertStatus(registerResponse, 201, 'User registration failed');
    
    const loginResponse = await runner.tester.login(
      runner.testUser.username, 
      runner.testUser.password
    );
    runner.assertStatus(loginResponse, 200, 'User login failed');
    runner.assert(runner.tester.authToken, 'Auth token not received');
  });

  // ==========================================
  // STORY 3.1: Plugin Architecture Foundation
  // ==========================================
  
  console.log('\n🔌 STORY 3.1: Plugin Architecture Foundation & Achievements Migration');
  
  await runner.runTest('Plugin System - Health Check', async () => {
    const response = await runner.tester.makeRequest('GET', '/plugins/status');
    runner.assertStatus(response, 200, 'Plugin status endpoint failed');
    runner.assert(response.data.achievements, 'Achievements plugin not found in status');
    runner.assert(response.data.leaderboards, 'Leaderboards plugin not found in status');
  });

  await runner.runTest('Achievements Plugin - Create Achievement', async () => {
    const achievement = {
      name: 'First Login',
      description: 'Login for the first time',
      criteria: { action: 'login', count: 1 }
    };
    
    const response = await runner.tester.makeRequest('POST', '/achievements', achievement);
    runner.assertStatus(response, 201, 'Achievement creation failed');
    runner.assert(response.data.id, 'Achievement ID not returned');
    runner.assertEquals(response.data.name, achievement.name, 'Achievement name mismatch');
  });

  await runner.runTest('Achievements Plugin - List Achievements', async () => {
    const response = await runner.tester.makeRequest('GET', '/achievements');
    runner.assertStatus(response, 200, 'Achievements list failed');
    runner.assert(Array.isArray(response.data), 'Achievements should be an array');
    runner.assert(response.data.length > 0, 'Should have at least one achievement');
  });

  await runner.runTest('Achievements Plugin - User Progress', async () => {
    const response = await runner.tester.makeRequest('GET', '/achievements/progress');
    runner.assertStatus(response, 200, 'Achievement progress failed');
    runner.assert(response.data.userId, 'User ID should be present in progress');
    runner.assert(Array.isArray(response.data.achievements), 'Progress should have achievements array');
  });

  // ==========================================
  // STORY 3.2: Leaderboards Module
  // ==========================================
  
  console.log('\n🏆 STORY 3.2: Leaderboards Module');
  
  await runner.runTest('Leaderboards Plugin - Create Leaderboard', async () => {
    const leaderboard = {
      name: 'High Score',
      description: 'Track highest game scores',
      scoreType: 'highest'
    };
    
    const response = await runner.tester.makeRequest('POST', '/leaderboards', leaderboard);
    runner.assertStatus(response, 201, 'Leaderboard creation failed');
    runner.assert(response.data.id, 'Leaderboard ID not returned');
    runner.assertEquals(response.data.name, leaderboard.name, 'Leaderboard name mismatch');
  });

  await runner.runTest('Leaderboards Plugin - Submit Score', async () => {
    // First get available leaderboards
    const listResponse = await runner.tester.makeRequest('GET', '/leaderboards');
    runner.assertStatus(listResponse, 200, 'Leaderboards list failed');
    runner.assert(listResponse.data.length > 0, 'Should have at least one leaderboard');
    
    const leaderboardId = listResponse.data[0].id;
    const score = {
      score: 1000,
      metadata: { level: 1, time: 60 }
    };
    
    const response = await runner.tester.makeRequest('POST', `/leaderboards/${leaderboardId}/scores`, score);
    runner.assertStatus(response, 201, 'Score submission failed');
    runner.assert(response.data.id, 'Score ID not returned');
    runner.assertEquals(response.data.score, score.score, 'Score value mismatch');
  });

  await runner.runTest('Leaderboards Plugin - Get Rankings', async () => {
    const listResponse = await runner.tester.makeRequest('GET', '/leaderboards');
    const leaderboardId = listResponse.data[0].id;
    
    const response = await runner.tester.makeRequest('GET', `/leaderboards/${leaderboardId}/rankings`);
    runner.assertStatus(response, 200, 'Rankings retrieval failed');
    runner.assert(Array.isArray(response.data.rankings), 'Rankings should be an array');
    runner.assert(response.data.rankings.length > 0, 'Should have at least one ranking');
    runner.assert(response.data.rankings[0].score, 'Ranking should have score');
    runner.assert(response.data.rankings[0].username, 'Ranking should have username');
  });

  await runner.runTest('Leaderboards Plugin - Daily Rankings', async () => {
    const response = await runner.tester.makeRequest('GET', '/leaderboards/daily');
    runner.assertStatus(response, 200, 'Daily rankings failed');
    runner.assert(Array.isArray(response.data), 'Daily rankings should be an array');
  });

  await runner.runTest('Leaderboards Plugin - Weekly Rankings', async () => {
    const response = await runner.tester.makeRequest('GET', '/leaderboards/weekly');
    runner.assertStatus(response, 200, 'Weekly rankings failed');
    runner.assert(Array.isArray(response.data), 'Weekly rankings should be an array');
  });

  // ==========================================
  // Integration Tests
  // ==========================================
  
  console.log('\n🔗 Integration Tests');
  
  await runner.runTest('Plugin Integration - Both Plugins Active', async () => {
    const pluginStatus = await runner.tester.makeRequest('GET', '/plugins/status');
    runner.assertStatus(pluginStatus, 200, 'Plugin status check failed');
    
    const plugins = pluginStatus.data;
    runner.assert(plugins.achievements && plugins.achievements.enabled, 'Achievements plugin not enabled');
    runner.assert(plugins.leaderboards && plugins.leaderboards.enabled, 'Leaderboards plugin not enabled');
  });

  await runner.runTest('Cross-Plugin Functionality - Achievement for Leaderboard', async () => {
    // Submit a high score
    const listResponse = await runner.tester.makeRequest('GET', '/leaderboards');
    const leaderboardId = listResponse.data[0].id;
    
    const highScore = {
      score: 5000,
      metadata: { level: 5, time: 120 }
    };
    
    const scoreResponse = await runner.tester.makeRequest('POST', `/leaderboards/${leaderboardId}/scores`, highScore);
    runner.assertStatus(scoreResponse, 201, 'High score submission failed');
    
    // Check if achievements were updated (this might trigger achievements)
    const progressResponse = await runner.tester.makeRequest('GET', '/achievements/progress');
    runner.assertStatus(progressResponse, 200, 'Achievement progress check failed');
  });

  // ==========================================
  // Performance & Error Handling Tests
  // ==========================================
  
  console.log('\n⚡ Performance & Error Handling');
  
  await runner.runTest('Error Handling - Invalid Leaderboard', async () => {
    const response = await runner.tester.makeRequest('GET', '/leaderboards/999999/rankings');
    runner.assert(response.status === 404 || response.status === 400, 'Should return 404 or 400 for invalid leaderboard');
  });

  await runner.runTest('Error Handling - Invalid Achievement', async () => {
    const response = await runner.tester.makeRequest('GET', '/achievements/999999');
    runner.assert(response.status === 404 || response.status === 400, 'Should return 404 or 400 for invalid achievement');
  });

  await runner.runTest('Bulk Operations - Multiple Score Submissions', async () => {
    const listResponse = await runner.tester.makeRequest('GET', '/leaderboards');
    const leaderboardId = listResponse.data[0].id;
    
    // Submit 5 scores quickly
    const promises = [];
    for (let i = 1; i <= 5; i++) {
      promises.push(
        runner.tester.makeRequest('POST', `/leaderboards/${leaderboardId}/scores`, {
          score: 1000 + i * 100,
          metadata: { bulk_test: true, iteration: i }
        })
      );
    }
    
    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.status === 201).length;
    runner.assert(successCount >= 4, `Expected at least 4 successful submissions, got ${successCount}`);
  });

  runner.printSummary();
  process.exit(runner.passedTests === runner.totalTests ? 0 : 1);
}

// Check if server is running before starting tests
async function checkServer() {
  try {
    const tester = new APITester(API_BASE);
    const response = await tester.makeRequest('GET', '/health');
    if (response.status === 200) {
      console.log('✅ Server is running');
      return true;
    }
  } catch (error) {
    console.log('❌ Server is not responding. Please start the server first:');
    console.log('   npm start');
    return false;
  }
  return false;
}

// Run the tests
checkServer().then(serverRunning => {
  if (serverRunning) {
    main().catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

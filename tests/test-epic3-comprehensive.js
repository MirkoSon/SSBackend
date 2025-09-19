/**
 * Updated Test Script for Epic 3 Stories 3.1 and 3.2
 * Based on actual server endpoints discovered from startup logs
 */

const http = require('http');

const API_BASE = 'http://localhost:3010';
let authToken = null;

function makeRequest(method, path, data = null, useAuth = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (useAuth && authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
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

async function setupTestUser() {
  const username = `testuser_${Date.now()}`;
  const password = 'testpass123';
  
  console.log('👤 Setting up test user...');
  
  // Register user
  const registerResponse = await makeRequest('POST', '/auth/register', { username, password });
  if (registerResponse.status !== 201) {
    throw new Error(`Registration failed: ${JSON.stringify(registerResponse)}`);
  }
  
  // Login user
  const loginResponse = await makeRequest('POST', '/auth/login', { username, password });
  if (loginResponse.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(loginResponse)}`);
  }
  
  authToken = loginResponse.data.token;
  console.log(`✅ Test user created: ${username}`);
  
  return { username, password, userId: loginResponse.data.userId };
}

async function testStory31_PluginArchitecture() {
  console.log('\n🔌 STORY 3.1: Plugin Architecture Foundation & Achievements Migration');
  console.log('================================================================');
  
  try {
    // Test 1: Check achievements are available
    console.log('\n📋 Test 1: List Available Achievements');
    const achievementsResponse = await makeRequest('GET', '/achievements/available');
    console.log(`Status: ${achievementsResponse.status}`);
    
    if (achievementsResponse.status === 200) {
      console.log(`✅ Found ${achievementsResponse.data.length} achievements available`);
      if (achievementsResponse.data.length > 0) {
        console.log(`   First achievement: ${achievementsResponse.data[0].name}`);
      }
    } else {
      console.log(`❌ Failed to get achievements: ${JSON.stringify(achievementsResponse.data)}`);
    }
    
    // Test 2: Check user achievements (needs auth)
    console.log('\n👤 Test 2: Check User Achievements Progress');
    const user = await setupTestUser();
    const progressResponse = await makeRequest('GET', `/achievements/${user.userId}/progress`, null, true);
    console.log(`Status: ${progressResponse.status}`);
    
    if (progressResponse.status === 200) {
      console.log(`✅ User progress retrieved successfully`);
      console.log(`   Achievements unlocked: ${progressResponse.data.unlockedCount || 0}`);
    } else {
      console.log(`❌ Failed to get user progress: ${JSON.stringify(progressResponse.data)}`);
    }
    
    // Test 3: Achievement stats
    console.log('\n📊 Test 3: Achievement Statistics');
    const statsResponse = await makeRequest('GET', '/achievements/stats');
    console.log(`Status: ${statsResponse.status}`);
    
    if (statsResponse.status === 200) {
      console.log(`✅ Achievement stats retrieved`);
      console.log(`   Stats: ${JSON.stringify(statsResponse.data, null, 2)}`);
    } else {
      console.log(`❌ Failed to get achievement stats: ${JSON.stringify(statsResponse.data)}`);
    }
    
  } catch (error) {
    console.error('❌ Story 3.1 test failed:', error.message);
  }
}

async function testStory32_Leaderboards() {
  console.log('\n🏆 STORY 3.2: Leaderboards Module');
  console.log('=================================');
  
  try {
    // Test 1: List existing leaderboards
    console.log('\n📋 Test 1: List Leaderboards');
    const listResponse = await makeRequest('GET', '/leaderboards');
    console.log(`Status: ${listResponse.status}`);
    
    if (listResponse.status === 200) {
      console.log(`✅ Found ${listResponse.data.length} leaderboards`);
      if (listResponse.data.length > 0) {
        console.log(`   First leaderboard: ${listResponse.data[0].name}`);
      }
    } else {
      console.log(`❌ Failed to get leaderboards: ${JSON.stringify(listResponse.data)}`);
    }
    
    // Test 2: Create a new leaderboard (needs auth)
    console.log('\n🆕 Test 2: Create New Leaderboard');
    const user = await setupTestUser();
    const newBoard = {
      name: `Test Board ${Date.now()}`,
      description: 'Test leaderboard for Epic 3',
      scoreType: 'highest',
      type: 'all_time'
    };
    
    const createResponse = await makeRequest('POST', '/leaderboards', newBoard, true);
    console.log(`Status: ${createResponse.status}`);
    
    let testBoardId = null;
    if (createResponse.status === 201) {
      testBoardId = createResponse.data.id;
      console.log(`✅ Leaderboard created with ID: ${testBoardId}`);
      console.log(`   Board name: ${createResponse.data.name}`);
    } else {
      console.log(`❌ Failed to create leaderboard: ${JSON.stringify(createResponse.data)}`);
      // Try to use existing board for testing
      if (listResponse.status === 200 && listResponse.data.length > 0) {
        testBoardId = listResponse.data[0].id;
        console.log(`   Using existing board ${testBoardId} for further tests`);
      }
    }
    
    // Test 3: Submit a score
    if (testBoardId) {
      console.log('\n🎯 Test 3: Submit Score');
      const scoreData = {
        userId: user.userId,
        score: 1500,
        metadata: JSON.stringify({ level: 3, time: 120 })
      };
      
      const scoreResponse = await makeRequest('POST', `/leaderboards/${testBoardId}/submit`, scoreData, true);
      console.log(`Status: ${scoreResponse.status}`);
      
      if (scoreResponse.status === 201 || scoreResponse.status === 200) {
        console.log(`✅ Score submitted successfully`);
        console.log(`   Score: ${scoreData.score}`);
      } else {
        console.log(`❌ Failed to submit score: ${JSON.stringify(scoreResponse.data)}`);
      }
      
      // Test 4: Get rankings
      console.log('\n🥇 Test 4: Get Rankings');
      const rankingsResponse = await makeRequest('GET', `/leaderboards/${testBoardId}/rankings`);
      console.log(`Status: ${rankingsResponse.status}`);
      
      if (rankingsResponse.status === 200) {
        console.log(`✅ Rankings retrieved successfully`);
        console.log(`   Entries: ${rankingsResponse.data.length}`);
        if (rankingsResponse.data.length > 0) {
          console.log(`   Top score: ${rankingsResponse.data[0].score} by ${rankingsResponse.data[0].username}`);
        }
      } else {
        console.log(`❌ Failed to get rankings: ${JSON.stringify(rankingsResponse.data)}`);
      }
      
      // Test 5: Get user rank
      console.log('\n🏅 Test 5: Get User Rank');
      const rankResponse = await makeRequest('GET', `/leaderboards/${testBoardId}/user/${user.userId}/rank`);
      console.log(`Status: ${rankResponse.status}`);
      
      if (rankResponse.status === 200) {
        console.log(`✅ User rank retrieved`);
        console.log(`   Rank: ${rankResponse.data.rank}, Score: ${rankResponse.data.score}`);
      } else {
        console.log(`❌ Failed to get user rank: ${JSON.stringify(rankResponse.data)}`);
      }
    }
    
    // Test 6: Leaderboard stats
    console.log('\n📊 Test 6: Leaderboard Statistics');
    const statsResponse = await makeRequest('GET', '/leaderboards/stats');
    console.log(`Status: ${statsResponse.status}`);
    
    if (statsResponse.status === 200) {
      console.log(`✅ Leaderboard stats retrieved`);
      console.log(`   Stats: ${JSON.stringify(statsResponse.data, null, 2)}`);
    } else {
      console.log(`❌ Failed to get leaderboard stats: ${JSON.stringify(statsResponse.data)}`);
    }
    
  } catch (error) {
    console.error('❌ Story 3.2 test failed:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Epic 3 Stories 3.1 & 3.2 Comprehensive Test Suite');
  console.log('====================================================');
  console.log(`Testing against: ${API_BASE}\n`);
  
  try {
    // First check if server is responding
    console.log('🔍 Health Check...');
    const healthResponse = await makeRequest('GET', '/health');
    if (healthResponse.status === 200) {
      console.log('✅ Server is responding');
    } else {
      console.log('⚠️  Server health check returned:', healthResponse.status);
    }
    
    await testStory31_PluginArchitecture();
    await testStory32_Leaderboards();
    
    console.log('\n🎉 Test suite completed!');
    console.log('\n📋 Summary:');
    console.log('✅ Story 3.1: Plugin Architecture Foundation & Achievements Migration - Tested');
    console.log('✅ Story 3.2: Leaderboards Module - Tested');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  }
}

runTests().then(() => {
  console.log('\n🏁 All tests completed');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

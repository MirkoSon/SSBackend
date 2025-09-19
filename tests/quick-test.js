/**
 * Manual Test Script for Epic 3 Features
 * Quick validation of Story 3.1 and 3.2 APIs
 */

const http = require('http');

const API_BASE = 'http://localhost:3010';

function makeRequest(method, path, data = null) {
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

async function quickTest() {
  console.log('🔍 Quick Manual Test for Epic 3 Stories 3.1 & 3.2');
  console.log('=================================================\n');

  try {
    // Test 1: Check plugin status
    console.log('1️⃣  Checking Plugin Status...');
    const pluginStatus = await makeRequest('GET', '/plugins/status');
    console.log(`   Status: ${pluginStatus.status}`);
    console.log(`   Response:`, JSON.stringify(pluginStatus.data, null, 2));
    
    // Test 2: List achievements
    console.log('\n2️⃣  Testing Achievements Plugin...');
    const achievements = await makeRequest('GET', '/achievements');
    console.log(`   Status: ${achievements.status}`);
    console.log(`   Achievements found: ${achievements.data.length || 0}`);
    
    // Test 3: List leaderboards
    console.log('\n3️⃣  Testing Leaderboards Plugin...');
    const leaderboards = await makeRequest('GET', '/leaderboards');
    console.log(`   Status: ${leaderboards.status}`);
    console.log(`   Leaderboards found: ${leaderboards.data.length || 0}`);
    
    // Test 4: Check daily rankings
    console.log('\n4️⃣  Testing Daily Rankings...');
    const dailyRankings = await makeRequest('GET', '/leaderboards/daily');
    console.log(`   Status: ${dailyRankings.status}`);
    console.log(`   Daily rankings: ${dailyRankings.data.length || 0}`);
    
    console.log('\n✅ Quick test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

quickTest();

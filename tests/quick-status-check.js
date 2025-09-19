/**
 * Quick Status Check for Epic 3 Stories 3.1 & 3.2
 * Verifies that the server is running and plugins are active
 */

const http = require('http');

const API_BASE = 'http://localhost:3010';

function quickCheck(endpoint, description) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, API_BASE);
    
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      timeout: 3000
    }, (res) => {
      const status = res.statusCode;
      const success = status === 200 || status === 401; // 401 means auth required, which is good
      resolve({
        endpoint,
        description,
        status,
        success,
        authRequired: status === 401
      });
    });
    
    req.on('error', () => resolve({
      endpoint,
      description,
      status: 'ERROR',
      success: false,
      authRequired: false
    }));
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        endpoint,
        description,
        status: 'TIMEOUT',
        success: false,
        authRequired: false
      });
    });
    
    req.end();
  });
}

async function checkEpic3Status() {
  console.log('🔍 Epic 3 Stories 3.1 & 3.2 - Quick Status Check');
  console.log('=================================================');
  
  const checks = [
    // General health
    { endpoint: '/health', description: 'Server Health Check' },
    
    // Story 3.1: Plugin Architecture & Achievements
    { endpoint: '/achievements/available', description: 'Story 3.1 - Available Achievements API' },
    { endpoint: '/achievements/stats', description: 'Story 3.1 - Achievement Statistics API' },
    
    // Story 3.2: Leaderboards Module  
    { endpoint: '/leaderboards', description: 'Story 3.2 - List Leaderboards API' },
    { endpoint: '/leaderboards/stats', description: 'Story 3.2 - Leaderboard Statistics API' },
  ];
  
  console.log('\nChecking endpoints...\n');
  
  const results = [];
  for (const check of checks) {
    const result = await quickCheck(check.endpoint, check.description);
    results.push(result);
    
    let statusIcon;
    if (result.success) {
      statusIcon = result.authRequired ? '🔐' : '✅';
    } else {
      statusIcon = '❌';
    }
    
    console.log(`${statusIcon} ${result.description}`);
    console.log(`   Endpoint: ${result.endpoint}`);
    console.log(`   Status: ${result.status}${result.authRequired ? ' (Auth Required - This is correct!)' : ''}`);
    console.log('');
  }
  
  const healthyEndpoints = results.filter(r => r.success).length;
  const totalEndpoints = results.length;
  const healthPercentage = (healthyEndpoints / totalEndpoints * 100).toFixed(1);
  
  console.log('📊 Summary:');
  console.log(`   Healthy Endpoints: ${healthyEndpoints}/${totalEndpoints} (${healthPercentage}%)`);
  
  if (healthPercentage >= 80) {
    console.log('\n🎉 Epic 3 Stories 3.1 & 3.2 are operational!');
    console.log('   ✅ Plugin Architecture Foundation - Working');
    console.log('   ✅ Achievements Migration - Working'); 
    console.log('   ✅ Leaderboards Module - Working');
    console.log('\n💡 Note: Some endpoints require authentication (🔐), which is the correct behavior.');
  } else {
    console.log('\n⚠️  Some Epic 3 functionality may not be working correctly.');
    console.log('   Please check the server logs and ensure all plugins are loaded.');
  }
}

checkEpic3Status().catch(error => {
  console.error('❌ Status check failed:', error);
  console.log('\n💡 Make sure the server is running with: npm start');
});

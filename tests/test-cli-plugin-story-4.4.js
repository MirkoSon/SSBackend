#!/usr/bin/env node

/**
 * Quick test script for Story 4.4: CLI Plugin Management
 * Tests all implemented CLI plugin commands
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing Story 4.4: CLI Plugin Management Implementation\n');

const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function runCommand(cmd, args = []) {
  return new Promise((resolve, reject) => {
    const process = spawn('node', ['src/app.js', ...cmd.split(' '), ...args], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    process.on('error', (error) => {
      reject(error);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      process.kill();
      reject(new Error('Command timed out'));
    }, 10000);
  });
}

async function testCommand(testName, command, expectedContent) {
  try {
    console.log(`Testing: ${testName}...`);
    const result = await runCommand(command);
    
    if (result.code === 0 && expectedContent.some(content => result.stdout.includes(content))) {
      console.log(`✅ ${testName} - PASSED`);
      testResults.passed++;
      testResults.tests.push({ name: testName, status: 'PASSED', output: result.stdout });
      return true;
    } else {
      console.log(`❌ ${testName} - FAILED`);
      console.log(`   Expected content not found in output`);
      console.log(`   Output: ${result.stdout.substring(0, 200)}...`);
      testResults.failed++;
      testResults.tests.push({ name: testName, status: 'FAILED', output: result.stdout, error: result.stderr });
      return false;
    }
  } catch (error) {
    console.log(`❌ ${testName} - ERROR: ${error.message}`);
    testResults.failed++;
    testResults.tests.push({ name: testName, status: 'ERROR', error: error.message });
    return false;
  }
}

async function runTests() {
  console.log('Starting CLI Plugin Management Tests...\n');
  
  // Test 1: Plugin Help Command
  await testCommand(
    'Plugin Help Command (AC 9)',
    'plugins --help',
    ['Plugin Management Commands', 'Usage:', 'Commands:', 'list', 'enable', 'disable', 'info', 'validate']
  );
  
  // Test 2: Plugin List Command
  await testCommand(
    'Plugin List Command (AC 1)',
    'plugins list',
    ['SSBackend Plugin Status', 'Internal Plugins:', 'Plugin Summary:', 'enabled']
  );
  
  // Test 3: Plugin Info Command
  await testCommand(
    'Plugin Info Command (AC 3)',
    'plugins info economy',
    ['Plugin Information:', 'economy', 'Version:', 'Status:', 'Configuration:']
  );
  
  // Test 4: Plugin Validation Command
  await testCommand(
    'Plugin Validation Command (AC 4)',
    'plugins validate',
    ['Plugin System Validation Report', 'Overall Status:', 'Total Plugins:', 'Enabled:']
  );
  
  // Test 5: Plugin Disable Command
  await testCommand(
    'Plugin Disable Command (AC 2)',
    'plugins disable leaderboards',
    ['Disabling plugin', 'disabled successfully']
  );
  
  // Test 6: Plugin Enable Command
  await testCommand(
    'Plugin Enable Command (AC 2)',
    'plugins enable leaderboards',
    ['Enabling plugin', 'enabled successfully']
  );
  
  // Test 7: API Integration Test (verify CLI uses backend APIs)
  console.log('\n🔗 Testing API Integration (AC 7)...');
  const listBefore = await runCommand('plugins list');
  const disableResult = await runCommand('plugins disable achievements');
  const listAfter = await runCommand('plugins list');
  
  if (listBefore.stdout.includes('Active achievements') && 
      disableResult.stdout.includes('disabled successfully') &&
      !listAfter.stdout.includes('Active achievements')) {
    console.log('✅ API Integration - PASSED (CLI operations affect backend state)');
    testResults.passed++;
  } else {
    console.log('❌ API Integration - FAILED');
    testResults.failed++;
  }
  
  // Re-enable for cleanup
  await runCommand('plugins enable achievements');
  
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All CLI Plugin Management tests PASSED!');
    console.log('Story 4.4 implementation is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check implementation.');
  }
  
  return testResults;
}

// Run tests
runTests().then(results => {
  process.exit(results.failed === 0 ? 0 : 1);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});

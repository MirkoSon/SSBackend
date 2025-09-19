#!/usr/bin/env node

/**
 * Test Runner for Epic 3 Stories 3.1 and 3.2
 * 
 * This script:
 * 1. Checks if the server is running
 * 2. Starts the server if needed
 * 3. Runs the comprehensive test suite
 * 4. Reports results
 */

const { spawn, exec } = require('child_process');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const SERVER_SCRIPT = path.join(PROJECT_ROOT, 'src', 'app.js');
const TEST_SCRIPT = path.join(__dirname, 'test-story-3.1-and-3.2.js');

console.log('🧪 SSBackend Epic 3 Test Runner');
console.log('================================');

function runCommand(command, args = [], cwd = PROJECT_ROOT) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    const proc = spawn(command, args, { 
      cwd, 
      stdio: 'inherit',
      shell: true 
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
    
    proc.on('error', reject);
  });
}

function checkServerRunning() {
  return new Promise((resolve) => {
    const http = require('http');
    const req = http.request({
      hostname: 'localhost',
      port: 3010,
      path: '/health',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

function startServerInBackground() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting server in background...');
    const server = spawn('node', [SERVER_SCRIPT], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    });
    
    let output = '';
    server.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Server running on') || output.includes('listening on')) {
        console.log('✅ Server started successfully');
        resolve(server);
      }
    });
    
    server.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });
    
    server.on('error', reject);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!output.includes('Server running on')) {
        server.kill();
        reject(new Error('Server failed to start within 10 seconds'));
      }
    }, 10000);
  });
}

async function main() {
  let serverProcess = null;
  
  try {
    // Check if server is already running
    const isRunning = await checkServerRunning();
    
    if (!isRunning) {
      console.log('Server not running, starting it...');
      serverProcess = await startServerInBackground();
      
      // Give server a moment to fully initialize
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      console.log('✅ Server already running');
    }
    
    // Run the tests
    console.log('\n🧪 Running test suite...\n');
    await runCommand('node', [TEST_SCRIPT]);
    
    console.log('\n✅ Test suite completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test run failed:', error.message);
    process.exit(1);
  } finally {
    // Clean up: kill the server process if we started it
    if (serverProcess) {
      console.log('\n🔄 Shutting down test server...');
      serverProcess.kill('SIGTERM');
      
      // Give it a moment to shut down gracefully
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
      }, 2000);
    }
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️  Test interrupted by user');
  process.exit(1);
});

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

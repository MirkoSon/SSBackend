#!/usr/bin/env node

/**
 * Server Restart & Authentication Script
 * Handles the server restart/login dance automatically
 */

const http = require('http');
const { spawn, exec } = require('child_process');
const path = require('path');

class ServerManager {
  constructor() {
    this.serverProcess = null;
    this.authToken = null;
    this.adminToken = null;
    this.baseUrl = 'http://localhost:3015';
    this.projectRoot = 'E:\\GIT\\SSBackend';
  }

  async makeRequest(method, endpoint, data = null, token = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseUrl);
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const jsonBody = body ? JSON.parse(body) : {};
            resolve({ status: res.statusCode, body: jsonBody, rawBody: body });
          } catch (e) {
            resolve({ status: res.statusCode, body: body, rawBody: body });
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

  async killExistingServer() {
    console.log('🔄 Killing any existing server processes...');
    
    return new Promise((resolve) => {
      // Kill processes using port 3015
      exec('netstat -ano | findstr :3015', (error, stdout) => {
        if (stdout) {
          const lines = stdout.trim().split('\n');
          const pids = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            return parts[parts.length - 1];
          }).filter(pid => pid && pid !== '0');

          if (pids.length > 0) {
            const uniquePids = [...new Set(pids)];
            console.log(`   Found processes: ${uniquePids.join(', ')}`);
            
            uniquePids.forEach(pid => {
              exec(`taskkill /F /PID ${pid}`, () => {});
            });
            
            setTimeout(resolve, 1000); // Wait for cleanup
          } else {
            resolve();
          }
        } else {
          resolve();
        }
      });
    });
  }

  async startServer() {
    console.log('🚀 Starting server...');
    
    return new Promise((resolve, reject) => {
      const serverCmd = spawn('node', ['src\\app.js', '--port', '3015'], {
        cwd: this.projectRoot,
        stdio: 'pipe'
      });

      let startupComplete = false;
      let outputBuffer = '';

      serverCmd.stdout.on('data', (data) => {
        const output = data.toString();
        outputBuffer += output;
        
        // Look for the completion signal
        if (output.includes('Plugin System initialized') && !startupComplete) {
          startupComplete = true;
          console.log('✅ Server started successfully');
          setTimeout(resolve, 500); // Give it a moment to fully initialize
        }
      });

      serverCmd.stderr.on('data', (data) => {
        const error = data.toString();
        if (error.includes('EADDRINUSE')) {
          console.log('⚠️  Port already in use - server might already be running');
          resolve(); // Continue anyway
        }
      });

      setTimeout(() => {
        if (!startupComplete) {
          console.log('⚠️  Server startup timeout - continuing anyway');
          resolve();
        }
      }, 10000);

      this.serverProcess = serverCmd;
    });
  }

  async waitForServer() {
    console.log('⏳ Waiting for server to be ready...');
    
    for (let i = 0; i < 10; i++) {
      try {
        const response = await this.makeRequest('GET', '/health');
        if (response.status === 200) {
          console.log('✅ Server is ready');
          return true;
        }
      } catch (error) {
        // Server not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Server failed to become ready');
  }

  async ensureAdminUser() {
    console.log('👤 Ensuring admin user exists...');
    
    // Try to register admin user (will fail if exists, which is fine)
    const registerResponse = await this.makeRequest('POST', '/auth/register', {
      username: 'admin',
      password: 'admin123',
      email: 'admin@example.com'
    });

    if (registerResponse.status === 201) {
      console.log('✅ Admin user created');
    } else if (registerResponse.body && registerResponse.body.error === 'Username already exists') {
      console.log('✅ Admin user already exists');
    } else {
      console.log('⚠️  Admin user status unclear, continuing...');
    }
  }

  async authenticateAdmin() {
    console.log('🔐 Authenticating as admin...');
    
    const loginResponse = await this.makeRequest('POST', '/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    if (loginResponse.status === 200 && loginResponse.body.token) {
      this.adminToken = loginResponse.body.token;
      console.log('✅ Admin authentication successful');
      console.log(`   Token: ${this.adminToken.substring(0, 20)}...`);
      return this.adminToken;
    } else {
      throw new Error(`Admin authentication failed: ${JSON.stringify(loginResponse.body)}`);
    }
  }

  async ensureTestUser() {
    console.log('👤 Ensuring test user exists...');
    
    // Try to register test user
    const registerResponse = await this.makeRequest('POST', '/auth/register', {
      username: 'testuser',
      password: 'password123',
      email: 'test@example.com'
    });

    if (registerResponse.status === 201) {
      console.log('✅ Test user created');
    } else if (registerResponse.body && registerResponse.body.error === 'Username already exists') {
      console.log('✅ Test user already exists');
    } else {
      console.log('⚠️  Test user status unclear, continuing...');
    }
  }

  async authenticateUser() {
    console.log('🔐 Authenticating as test user...');
    
    const loginResponse = await this.makeRequest('POST', '/auth/login', {
      username: 'testuser',
      password: 'password123'
    });

    if (loginResponse.status === 200 && loginResponse.body.token) {
      this.authToken = loginResponse.body.token;
      console.log('✅ User authentication successful');
      console.log(`   Token: ${this.authToken.substring(0, 20)}...`);
      return this.authToken;
    } else {
      throw new Error(`User authentication failed: ${JSON.stringify(loginResponse.body)}`);
    }
  }

  async testRequest(endpoint, description = '') {
    console.log(`🧪 Testing: ${description || endpoint}`);
    
    try {
      const response = await this.makeRequest('GET', endpoint, null, this.adminToken);
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200) {
        console.log('   ✅ Success');
        return response;
      } else {
        console.log(`   ❌ Failed: ${JSON.stringify(response.body)}`);
        return response;
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      return { status: 500, error: error.message };
    }
  }

  async fullRestart() {
    try {
      console.log('🔄 Starting full server restart sequence...\n');
      
      await this.killExistingServer();
      await this.startServer();
      await this.waitForServer();
      await this.ensureAdminUser();
      await this.authenticateAdmin();
      await this.ensureTestUser();
      await this.authenticateUser();
      
      console.log('\n🎉 Server restart and authentication complete!');
      console.log('📋 Available tokens:');
      console.log(`   Admin Token: ${this.adminToken}`);
      console.log(`   User Token:  ${this.authToken}`);
      
      return {
        adminToken: this.adminToken,
        userToken: this.authToken,
        baseUrl: this.baseUrl
      };
      
    } catch (error) {
      console.error('❌ Restart sequence failed:', error.message);
      throw error;
    }
  }

  async quickTest() {
    console.log('\n🧪 Running quick endpoint tests...');
    
    await this.testRequest('/health', 'Health check');
    await this.testRequest('/economy/balances/20', 'Economy balances (admin user)');
    
    console.log('\n✅ Quick tests complete');
  }

  getTokens() {
    return {
      admin: this.adminToken,
      user: this.authToken,
      baseUrl: this.baseUrl
    };
  }
}

// CLI usage
if (require.main === module) {
  const manager = new ServerManager();
  
  const command = process.argv[2] || 'restart';
  
  switch (command) {
    case 'restart':
      manager.fullRestart()
        .then(() => manager.quickTest())
        .catch(console.error);
      break;
      
    case 'test':
      manager.authenticateAdmin()
        .then(() => manager.quickTest())
        .catch(console.error);
      break;
      
    default:
      console.log('Usage: node restart-and-auth.js [restart|test]');
  }
}

module.exports = ServerManager;
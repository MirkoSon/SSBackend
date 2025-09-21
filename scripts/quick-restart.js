#!/usr/bin/env node

/**
 * Quick Server Restart & Admin Auth Script
 * Simplified version focused on admin authentication only
 */

const http = require('http');
const { spawn, exec } = require('child_process');

class QuickServerManager {
  constructor() {
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
        headers: { 'Content-Type': 'application/json' }
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
            resolve({ status: res.statusCode, body: jsonBody });
          } catch (e) {
            resolve({ status: res.statusCode, body: body });
          }
        });
      });

      req.on('error', reject);
      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

  async killServer() {
    console.log('🔄 Killing existing server...');
    return new Promise((resolve) => {
      exec('netstat -ano | findstr :3015', (error, stdout) => {
        if (stdout) {
          const pids = [...new Set(stdout.trim().split('\n').map(line => {
            const parts = line.trim().split(/\s+/);
            return parts[parts.length - 1];
          }).filter(pid => pid && pid !== '0'))];
          
          if (pids.length > 0) {
            pids.forEach(pid => exec(`taskkill /F /PID ${pid}`, () => {}));
            setTimeout(resolve, 1000);
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
    return new Promise((resolve) => {
      const serverCmd = spawn('node', ['src\\app.js', '--port', '3015'], {
        cwd: this.projectRoot,
        stdio: 'pipe'
      });

      let resolved = false;
      serverCmd.stdout.on('data', (data) => {
        if (data.toString().includes('Plugin System initialized') && !resolved) {
          resolved = true;
          console.log('✅ Server started');
          setTimeout(resolve, 500);
        }
      });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      }, 8000);
    });
  }

  async waitAndAuth() {
    console.log('⏳ Waiting for server and authenticating...');
    
    // Wait for server
    for (let i = 0; i < 10; i++) {
      try {
        const health = await this.makeRequest('GET', '/health');
        if (health.status === 200) break;
      } catch (e) {}
      await new Promise(r => setTimeout(r, 1000));
    }

    // Ensure admin user
    await this.makeRequest('POST', '/auth/register', {
      username: 'admin',
      password: 'admin123',
      email: 'admin@example.com'
    });

    // Authenticate
    const login = await this.makeRequest('POST', '/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    if (login.status === 200 && login.body.token) {
      this.adminToken = login.body.token;
      console.log('✅ Admin authenticated');
      return this.adminToken;
    } else {
      throw new Error('Authentication failed');
    }
  }

  async restart() {
    await this.killServer();
    await this.startServer();
    await this.waitAndAuth();
    
    console.log('\n🎉 Ready to go!');
    console.log(`💾 Admin Token: ${this.adminToken}`);
    console.log(`🌐 Base URL: ${this.baseUrl}`);
    
    return {
      token: this.adminToken,
      baseUrl: this.baseUrl
    };
  }

  async test(endpoint, description) {
    console.log(`🧪 Testing: ${description}`);
    try {
      const response = await this.makeRequest('GET', endpoint, null, this.adminToken);
      console.log(`   Status: ${response.status} ${response.status === 200 ? '✅' : '❌'}`);
      return response;
    } catch (error) {
      console.log(`   Error: ${error.message} ❌`);
      return { status: 500, error: error.message };
    }
  }
}

// Export for use in other scripts
module.exports = QuickServerManager;

// CLI usage
if (require.main === module) {
  const manager = new QuickServerManager();
  
  manager.restart()
    .then(async () => {
      console.log('\n🧪 Quick tests:');
      await manager.test('/health', 'Health check');
      await manager.test('/economy/balances/20', 'Economy balances');
      console.log('\n✅ All done!');
    })
    .catch(console.error);
}

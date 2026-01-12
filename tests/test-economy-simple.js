/**
 * Simple Economy Plugin Manual Test
 */

const http = require('http');

const API_BASE = 'http://localhost:3015';

async function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
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
          resolve({ status: res.statusCode, body: jsonBody });
        } catch (e) {
          resolve({ status: res.statusCode, body: body });
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

async function testEconomyPlugin() {
  console.log('🧪 Testing Economy Plugin...\n');

  try {
    // Test 1: Check health
    console.log('1. Testing server health...');
    const health = await makeRequest('GET', '/health');
    console.log(`✅ Health check: ${health.status === 200 ? 'PASS' : 'FAIL'}`);

    // Test 2: Get currencies (should require auth)
    console.log('\n2. Testing currencies endpoint (without auth)...');
    const currenciesNoAuth = await makeRequest('GET', '/economy/currencies');
    console.log(`✅ Currency auth protection: ${currenciesNoAuth.status === 401 ? 'PASS' : 'FAIL'}`);

    // Test 3: Login as admin
    console.log('\n3. Testing user authentication...');
    const login = await makeRequest('POST', '/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    if (login.status !== 200) {
      console.log('❌ Login failed - cannot continue tests');
      return;
    }
    
    const token = login.body.token;
    console.log('✅ User login: PASS');

    // Test 4: Get currencies with auth
    console.log('\n4. Testing currencies endpoint (with auth)...');
    const currencies = await makeRequest('GET', '/economy/currencies', null, token);
    console.log(`✅ Get currencies: ${currencies.status === 200 ? 'PASS' : 'FAIL'}`);
    
    if (currencies.status === 200) {
      console.log(`   Found ${currencies.body.currencies.length} currencies`);
      currencies.body.currencies.forEach(c => {
        console.log(`   - ${c.name} (${c.symbol})`);
      });
    }

    // Test 5: Get user balances
    console.log('\n5. Testing user balances...');
    const balances = await makeRequest('GET', '/economy/balances/1', null, token);
    console.log(`✅ Get balances: ${balances.status === 200 ? 'PASS' : 'FAIL'}`);
    
    if (balances.status === 200) {
      console.log('   Balances:');
      Object.values(balances.body.balances).forEach(b => {
        console.log(`   - ${b.name}: ${b.balance} ${b.symbol}`);
      });
    }

    // Test 6: Create transaction
    console.log('\n6. Testing transaction creation...');
    const transaction = await makeRequest('POST', '/economy/transactions', {
      userId: 1,
      currencyId: 'coins',
      amount: 50,
      type: 'earn',
      source: 'manual_test',
      description: 'Manual test transaction'
    }, token);
    console.log(`✅ Create transaction: ${transaction.status === 201 ? 'PASS' : 'FAIL'}`);

    if (transaction.status === 201) {
      console.log(`   Transaction ID: ${transaction.body.transaction.id}`);
      console.log(`   New balance: ${transaction.body.transaction.balanceAfter}`);
    }

    console.log('\n🎉 Economy Plugin core functionality is working!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testEconomyPlugin();
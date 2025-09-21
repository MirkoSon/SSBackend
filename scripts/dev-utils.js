// Quick utility for development sessions
// Usage: const { token, test } = require('./scripts/dev-utils.js'); await test('/economy/balances/20');

const QuickServerManager = require('./quick-restart.js');

let manager = null;
let currentToken = null;

async function ensureReady() {
  if (!manager) {
    manager = new QuickServerManager();
    const result = await manager.restart();
    currentToken = result.token;
  }
  return currentToken;
}

async function getToken() {
  if (!currentToken) {
    await ensureReady();
  }
  return currentToken;
}

async function test(endpoint, description) {
  if (!manager) {
    await ensureReady();
  }
  return await manager.test(endpoint, description || endpoint);
}

async function restart() {
  manager = new QuickServerManager();
  const result = await manager.restart();
  currentToken = result.token;
  return result;
}

module.exports = {
  getToken,
  test,
  restart,
  ensureReady
};

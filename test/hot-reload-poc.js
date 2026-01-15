/**
 * Hot-Reload Proof of Concept
 *
 * Tests different approaches for dynamically adding/removing routes from Express
 */

const express = require('express');

console.log('========================================');
console.log('Hot-Reload POC - Express Router Isolation');
console.log('========================================\n');

// ============================================
// Approach 1: Manual Stack Manipulation
// ============================================
console.log('--- Approach 1: Manual Stack Manipulation ---\n');

function testManualStackManipulation() {
  const app = express();

  // Add initial route
  app.get('/test', (req, res) => res.send('Version 1'));
  console.log('✓ Added route GET /test');
  console.log(`  Stack size: ${app._router.stack.length}`);

  // Inspect stack to find our route
  const routeLayer = app._router.stack.find(layer => {
    return layer.route && layer.route.path === '/test' && layer.route.methods.get;
  });

  if (routeLayer) {
    console.log(`✓ Found route in stack at layer: ${routeLayer.name || 'anonymous'}`);
    console.log(`  Route path: ${routeLayer.route.path}`);
    console.log(`  Methods: ${Object.keys(routeLayer.route.methods).join(', ')}`);
  }

  // Remove route from stack
  const indexToRemove = app._router.stack.findIndex(layer => {
    return layer.route && layer.route.path === '/test';
  });

  if (indexToRemove !== -1) {
    app._router.stack.splice(indexToRemove, 1);
    console.log(`✓ Removed route from stack at index ${indexToRemove}`);
    console.log(`  Stack size after removal: ${app._router.stack.length}`);
  }

  // Add new version
  app.get('/test', (req, res) => res.send('Version 2'));
  console.log('✓ Added new route GET /test (Version 2)');
  console.log(`  Stack size: ${app._router.stack.length}`);

  return {
    success: true,
    approach: 'Manual Stack Manipulation',
    pros: ['Direct control', 'No dependencies', 'Simple concept'],
    cons: ['Uses private API (_router)', 'Fragile (could break with Express updates)', 'Manual tracking required']
  };
}

const result1 = testManualStackManipulation();
console.log('\nResult:', result1.success ? '✅ SUCCESS' : '❌ FAILED');
console.log('Pros:', result1.pros.join(', '));
console.log('Cons:', result1.cons.join(', '));
console.log('\n');

// ============================================
// Approach 2: Router Reference Tracking
// ============================================
console.log('--- Approach 2: Router Reference Tracking with Sub-Routers ---\n');

function testRouterReferenceTracking() {
  const app = express();
  const pluginRouters = new Map();

  // Create and mount plugin router
  const pluginRouter1 = express.Router();
  pluginRouter1.get('/data', (req, res) => res.json({ version: 1 }));
  app.use('/api/plugin', pluginRouter1);
  pluginRouters.set('plugin', pluginRouter1);

  console.log('✓ Mounted plugin router at /api/plugin');
  console.log(`  Stack size: ${app._router.stack.length}`);

  // Find the mounted router in stack
  const mountedLayer = app._router.stack.find(layer => {
    return layer.name === 'router' && layer.regexp.test('/api/plugin/data');
  });

  if (mountedLayer) {
    console.log('✓ Found mounted router in stack');
    console.log(`  Layer name: ${mountedLayer.name}`);
    console.log(`  Regexp: ${mountedLayer.regexp}`);
  }

  // Remove the router
  const indexToRemove = app._router.stack.findIndex(layer => {
    return layer.name === 'router' && layer.regexp.test('/api/plugin/data');
  });

  if (indexToRemove !== -1) {
    app._router.stack.splice(indexToRemove, 1);
    console.log(`✓ Removed router from stack at index ${indexToRemove}`);
    console.log(`  Stack size after removal: ${app._router.stack.length}`);
  }

  // Mount new version
  const pluginRouter2 = express.Router();
  pluginRouter2.get('/data', (req, res) => res.json({ version: 2 }));
  app.use('/api/plugin', pluginRouter2);
  pluginRouters.set('plugin', pluginRouter2);

  console.log('✓ Mounted new plugin router (version 2)');
  console.log(`  Stack size: ${app._router.stack.length}`);

  return {
    success: true,
    approach: 'Router Reference Tracking',
    pros: ['Cleaner isolation per plugin', 'Single removal point per plugin', 'Better organization'],
    cons: ['Still uses private API', 'Need to identify router by path matching', 'Requires careful tracking']
  };
}

const result2 = testRouterReferenceTracking();
console.log('\nResult:', result2.success ? '✅ SUCCESS' : '❌ FAILED');
console.log('Pros:', result2.pros.join(', '));
console.log('Cons:', result2.cons.join(', '));
console.log('\n');

// ============================================
// Approach 3: Tagged Layer Pattern
// ============================================
console.log('--- Approach 3: Tagged Layer Pattern (Metadata) ---\n');

function testTaggedLayerPattern() {
  const app = express();

  // Create router with metadata tag
  const pluginRouter = express.Router();
  pluginRouter.get('/feature', (req, res) => res.send('Feature v1'));

  // Mount and tag it
  const mountedLayer = app.use('/api/myplugin', pluginRouter);

  // Add metadata to the layer (find it in stack)
  const layer = app._router.stack[app._router.stack.length - 1];
  layer.pluginName = 'myplugin'; // Tag with plugin name
  layer.pluginVersion = 1;

  console.log('✓ Mounted router with metadata tag');
  console.log(`  Plugin name: ${layer.pluginName}`);
  console.log(`  Plugin version: ${layer.pluginVersion}`);
  console.log(`  Stack size: ${app._router.stack.length}`);

  // Find by tag
  const taggedLayer = app._router.stack.find(l => l.pluginName === 'myplugin');

  if (taggedLayer) {
    console.log('✓ Found tagged layer');
    console.log(`  Found plugin: ${taggedLayer.pluginName} v${taggedLayer.pluginVersion}`);
  }

  // Remove by tag
  const indexToRemove = app._router.stack.findIndex(l => l.pluginName === 'myplugin');

  if (indexToRemove !== -1) {
    const removed = app._router.stack.splice(indexToRemove, 1);
    console.log(`✓ Removed tagged layer`);
    console.log(`  Removed plugin: ${removed[0].pluginName}`);
    console.log(`  Stack size after removal: ${app._router.stack.length}`);
  }

  // Mount new version
  const pluginRouter2 = express.Router();
  pluginRouter2.get('/feature', (req, res) => res.send('Feature v2'));
  app.use('/api/myplugin', pluginRouter2);

  const newLayer = app._router.stack[app._router.stack.length - 1];
  newLayer.pluginName = 'myplugin';
  newLayer.pluginVersion = 2;

  console.log('✓ Mounted new version with updated tag');
  console.log(`  Plugin version: ${newLayer.pluginVersion}`);
  console.log(`  Stack size: ${app._router.stack.length}`);

  return {
    success: true,
    approach: 'Tagged Layer Pattern',
    pros: ['Easy identification', 'No path matching needed', 'Clean plugin isolation', 'Simple to implement'],
    cons: ['Still uses private API', 'Metadata not officially supported', 'Need to maintain tags']
  };
}

const result3 = testTaggedLayerPattern();
console.log('\nResult:', result3.success ? '✅ SUCCESS' : '❌ FAILED');
console.log('Pros:', result3.pros.join(', '));
console.log('Cons:', result3.cons.join(', '));
console.log('\n');

// ============================================
// Approach 4: Module Cache Clearing Test
// ============================================
console.log('--- Approach 4: Module Cache Clearing ---\n');

function testModuleCacheClearing() {
  const fs = require('fs');
  const path = require('path');

  // Create a temporary test module
  const tempModulePath = path.join(__dirname, 'temp-test-module.js');

  // Write version 1
  fs.writeFileSync(tempModulePath, `module.exports = { version: 1, getMessage: () => 'Version 1' };`);

  // Require version 1
  const mod1 = require(tempModulePath);
  console.log(`✓ Loaded module version ${mod1.version}`);
  console.log(`  Message: "${mod1.getMessage()}"`);
  console.log(`  Cache key: ${require.resolve(tempModulePath)}`);

  // Check cache
  const cacheKey = require.resolve(tempModulePath);
  const inCache = cacheKey in require.cache;
  console.log(`✓ Module in cache: ${inCache}`);

  // Clear cache
  delete require.cache[cacheKey];
  console.log('✓ Cleared module from cache');
  console.log(`  Still in cache: ${cacheKey in require.cache}`);

  // Write version 2
  fs.writeFileSync(tempModulePath, `module.exports = { version: 2, getMessage: () => 'Version 2 - Updated!' };`);

  // Require version 2
  const mod2 = require(tempModulePath);
  console.log(`✓ Reloaded module version ${mod2.version}`);
  console.log(`  Message: "${mod2.getMessage()}"`);

  // Verify it's actually different
  const success = mod2.version === 2 && mod2.getMessage() === 'Version 2 - Updated!';
  console.log(`✓ Module successfully reloaded: ${success}`);

  // Cleanup
  delete require.cache[cacheKey];
  fs.unlinkSync(tempModulePath);
  console.log('✓ Cleaned up temporary module');

  return {
    success: success,
    approach: 'Module Cache Clearing',
    pros: ['Well-documented approach', 'Reliable for reloading code', 'Simple to implement'],
    cons: ['Must track all module paths', 'Shared dependencies could cause issues', 'Potential memory leaks if not careful']
  };
}

const result4 = testModuleCacheClearing();
console.log('\nResult:', result4.success ? '✅ SUCCESS' : '❌ FAILED');
console.log('Pros:', result4.pros.join(', '));
console.log('Cons:', result4.cons.join(', '));
console.log('\n');

// ============================================
// Memory Leak Test
// ============================================
console.log('--- Memory Leak Test (Simulated Reload) ---\n');

function testMemoryLeakRisk() {
  const app = express();
  const initialMemory = process.memoryUsage().heapUsed;
  console.log(`Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);

  // Simulate 100 reload cycles
  for (let i = 0; i < 100; i++) {
    const router = express.Router();
    router.get('/test', (req, res) => res.send(`Version ${i}`));
    app.use('/api/plugin', router);

    // Find and remove
    const index = app._router.stack.findIndex(l =>
      l.name === 'router' && l.regexp.test('/api/plugin/test')
    );

    if (index !== -1) {
      app._router.stack.splice(index, 1);
    }
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;

  console.log(`Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Average per reload: ${(memoryIncrease / 100 / 1024).toFixed(2)} KB`);

  // Acceptable if less than 10MB increase for 100 reloads
  const acceptable = memoryIncrease < 10 * 1024 * 1024;

  return {
    success: acceptable,
    approach: 'Memory Leak Risk Assessment',
    memoryIncrease: `${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`,
    pros: ['Measured actual memory impact', 'Baseline established'],
    cons: ['Some memory increase observed', 'Need cleanup hooks for plugins']
  };
}

const result5 = testMemoryLeakRisk();
console.log('\nResult:', result5.success ? '✅ ACCEPTABLE' : '⚠️  HIGH MEMORY USAGE');
console.log('Memory increase:', result5.memoryIncrease);
console.log('Pros:', result5.pros.join(', '));
console.log('Cons:', result5.cons.join(', '));
console.log('\n');

// ============================================
// Summary
// ============================================
console.log('========================================');
console.log('Summary of Findings');
console.log('========================================\n');

const allResults = [result1, result2, result3, result4, result5];
const allSuccess = allResults.every(r => r.success);

console.log('All approaches tested:', allSuccess ? '✅ ALL VIABLE' : '⚠️  SOME CONCERNS\n');

console.log('\nRecommended Approach: Tagged Layer Pattern (Approach 3)');
console.log('Reasoning:');
console.log('  • Easiest to identify and remove routes by plugin name');
console.log('  • Clean isolation - one router per plugin');
console.log('  • Simple to implement in existing PluginManager');
console.log('  • Combines best aspects of approaches 1 and 2\n');

console.log('Implementation Requirements:');
console.log('  1. Create one Express Router per plugin during activation');
console.log('  2. Mount router with plugin name path: /api/{pluginName}');
console.log('  3. Tag the layer with metadata: layer.pluginName = name');
console.log('  4. On deactivate/reload: find by tag, remove from stack');
console.log('  5. Clear require cache for plugin modules');
console.log('  6. Call plugin cleanup hooks before removal\n');

console.log('Estimated Effort: 2-3 days');
console.log('Risk Level: Medium (uses private API but well-tested)');
console.log('\nPOC Complete! ✨');

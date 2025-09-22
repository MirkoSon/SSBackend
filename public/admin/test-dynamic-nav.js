// Manual test script for dynamic navigation functionality
// This script can be run in the browser console to verify navigation works

function testDynamicNavigation() {
  console.log('🧪 Testing Dynamic Navigation Implementation...');
  
  // Test 1: Check if components are loaded
  const tests = [];
  
  tests.push({
    name: 'NavigationRenderer available',
    pass: typeof NavigationRenderer !== 'undefined'
  });
  
  tests.push({
    name: 'PluginNavigationManager available', 
    pass: typeof PluginNavigationManager !== 'undefined'
  });
  
  tests.push({
    name: 'DynamicNavigation available',
    pass: typeof DynamicNavigation !== 'undefined'
  });
  
  tests.push({
    name: 'AdminDashboard instance available',
    pass: typeof window.adminDashboard !== 'undefined'
  });
  
  tests.push({
    name: 'Dynamic navigation initialized',
    pass: window.adminDashboard && window.adminDashboard.dynamicNav !== null
  });
  
  // Test 2: Check DOM elements
  tests.push({
    name: 'Navigation menu exists',
    pass: document.querySelector('.nav-menu') !== null
  });
  
  tests.push({
    name: 'Plugin navigation CSS loaded',
    pass: document.querySelector('link[href*="plugin-navigation.css"]') !== null
  });
  
  // Test 3: Check for plugin navigation elements
  const pluginSections = document.querySelectorAll('.nav-plugin-group');
  tests.push({
    name: 'Plugin navigation sections rendered',
    pass: pluginSections.length > 0,
    details: `Found ${pluginSections.length} plugin sections`
  });
  
  const pluginToggle = document.querySelector('.nav-section-toggle[data-section="plugins"]');
  tests.push({
    name: 'Plugin section toggle exists',
    pass: pluginToggle !== null
  });
  
  // Test 4: Check search functionality
  const searchInput = document.getElementById('navSearchInput');
  tests.push({
    name: 'Navigation search input exists',
    pass: searchInput !== null
  });
  
  // Report results
  console.log('\n📊 Test Results:');
  let passed = 0;
  tests.forEach(test => {
    const status = test.pass ? '✅' : '❌';
    const details = test.details ? ` (${test.details})` : '';
    console.log(`${status} ${test.name}${details}`);
    if (test.pass) passed++;
  });
  
  console.log(`\n📈 Summary: ${passed}/${tests.length} tests passed`);
  
  // Additional debugging info
  if (window.adminDashboard && window.adminDashboard.dynamicNav) {
    const navState = window.adminDashboard.dynamicNav.getState();
    console.log('\n🔍 Navigation State:', navState);
  }
  
  return { passed, total: tests.length, success: passed === tests.length };
}

// Auto-run if in browser console
if (typeof document !== 'undefined') {
  console.log('Dynamic Navigation Test Script Loaded. Run testDynamicNavigation() to test.');
}
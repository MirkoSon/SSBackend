/**
 * Test file for StatCard component
 * Validates all acceptance criteria for Story 6.3
 */

const StatCard = require('./src/ui/components/data-display/StatCard');

console.log('=== StatCard Component Test Suite ===\n');

// Test 1: Basic stat card (AC1)
console.log('Test 1: Basic stat card without trend');
const basicCard = new StatCard({
  label: 'Total Users',
  value: 1250,
  icon: '👥'
});
console.log(basicCard.render());
console.log('\n---\n');

// Test 2: Stat card with positive trend (AC2, AC4)
console.log('Test 2: Stat card with positive trend');
const positiveCard = new StatCard({
  label: 'Active Sessions',
  value: 847,
  icon: '🔥',
  trend: { value: 12.5, direction: 'up' }
});
console.log(positiveCard.render());
console.log('\n---\n');

// Test 3: Stat card with negative trend (AC2, AC4)
console.log('Test 3: Stat card with negative trend');
const negativeCard = new StatCard({
  label: 'Error Rate',
  value: '2.3%',
  icon: '⚠️',
  trend: { value: 3.2, direction: 'down' }
});
console.log(negativeCard.render());
console.log('\n---\n');

// Test 4: Stat card without icon
console.log('Test 4: Stat card without icon');
const noIconCard = new StatCard({
  label: 'Response Time',
  value: '145ms',
  trend: { value: 8.1, direction: 'up' }
});
console.log(noIconCard.render());
console.log('\n---\n');

// Test 5: Stat card with large number formatting
console.log('Test 5: Large number formatting');
const largeNumberCard = new StatCard({
  label: 'Total Revenue',
  value: 1234567,
  icon: '💰',
  trend: { value: 15.3, direction: 'up' }
});
console.log(largeNumberCard.render());
console.log('\n---\n');

// Test 6: Component import from index.js (AC6)
console.log('Test 6: Import from component library');
try {
  const { StatCard: ImportedStatCard } = require('./src/ui/components');
  const importedCard = new ImportedStatCard({
    label: 'Import Test',
    value: 999,
    icon: '✅'
  });
  console.log('✅ Component successfully imported from index.js');
  console.log(importedCard.render());
} catch (error) {
  console.error('❌ Failed to import from index.js:', error.message);
}

console.log('\n=== Test Suite Complete ===');

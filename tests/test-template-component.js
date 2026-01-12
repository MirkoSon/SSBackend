/**
 * Test file for TemplateComponent
 * 
 * This file demonstrates how to test the TemplateComponent
 * and serves as an example for testing other UI components.
 */

const TemplateComponent = require('../src/ui/components/template/TemplateComponent');

/**
 * Simple test runner for TemplateComponent
 */
class TemplateComponentTest {
  constructor() {
    this.tests = [];
    this.results = [];
  }

  /**
   * Add a test case
   * @param {string} name - Test name
   * @param {Function} testFn - Test function
   */
  addTest(name, testFn) {
    this.tests.push({ name, testFn });
  }

  /**
   * Run all tests
   */
  async run() {
    console.log('🧪 Running TemplateComponent tests...\n');
    
    for (const test of this.tests) {
      try {
        await test.testFn();
        this.results.push({ name: test.name, passed: true });
        console.log(`✅ ${test.name}`);
      } catch (error) {
        this.results.push({ name: test.name, passed: false, error: error.message });
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }

    this.printSummary();
  }

  /**
   * Print test summary
   */
  printSummary() {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    
    console.log(`\n📊 Test Summary: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All tests passed!');
    } else {
      const failed = this.results.filter(r => !r.passed);
      console.log('\nFailed tests:');
      failed.forEach(test => console.log(`  - ${test.name}: ${test.error}`));
    }
  }
}

// Create test instance
const testRunner = new TemplateComponentTest();

// Test 1: Component creation with default options
testRunner.addTest('should create component with default options', () => {
  const component = new TemplateComponent();
  
  if (!component) {
    throw new Error('Component not created');
  }
  
  if (!component.element) {
    throw new Error('Element not created');
  }
  
  if (component.element.className !== 'template-component') {
    throw new Error(`Expected className 'template-component', got '${component.element.className}'`);
  }
});

// Test 2: Component creation with custom options
testRunner.addTest('should create component with custom options', () => {
  const component = new TemplateComponent({
    className: 'custom-template',
    title: 'Custom Title',
    content: 'Custom content',
    id: 'test-component'
  });
  
  if (component.element.className !== 'custom-template') {
    throw new Error(`Expected className 'custom-template', got '${component.element.className}'`);
  }
  
  if (component.element.id !== 'test-component') {
    throw new Error(`Expected id 'test-component', got '${component.element.id}'`);
  }
  
  const titleElement = component.element.querySelector('.custom-template__title');
  if (!titleElement || titleElement.textContent !== 'Custom Title') {
    throw new Error('Title not set correctly');
  }
});

// Test 3: Component rendering
testRunner.addTest('should render component correctly', () => {
  const component = new TemplateComponent({
    title: 'Test Component',
    content: 'Test content'
  });
  
  const rendered = component.render();
  if (!rendered || !(rendered instanceof HTMLElement)) {
    throw new Error('Component did not return valid HTMLElement');
  }
  
  // Check if it has the expected structure
  const title = rendered.querySelector('.template-component__title');
  const content = rendered.querySelector('.template-component__content');
  
  if (!title) {
    throw new Error('Title element not found');
  }
  
  if (!content) {
    throw new Error('Content element not found');
  }
});

// Test 4: Component state management
testRunner.addTest('should manage component state correctly', () => {
  const component = new TemplateComponent();
  
  // Initial state
  const initialState = component.getState();
  if (!initialState.isVisible) {
    throw new Error('Component should be visible by default');
  }
  
  // Hide component
  component.hide();
  if (component.getState().isVisible !== false) {
    throw new Error('Component should be hidden after hide()');
  }
  
  // Show component
  component.show();
  if (component.getState().isVisible !== true) {
    throw new Error('Component should be visible after show()');
  }
});

// Test 5: Component updates
testRunner.addTest('should update content correctly', () => {
  const component = new TemplateComponent({
    title: 'Original Title',
    content: 'Original content'
  });
  
  // Update title
  component.updateTitle('New Title');
  const titleElement = component.element.querySelector('.template-component__title');
  if (titleElement.textContent !== 'New Title') {
    throw new Error('Title not updated correctly');
  }
  
  // Update content
  component.updateContent('New content');
  const contentElement = component.element.querySelector('.template-component__content');
  if (contentElement.textContent !== 'New content') {
    throw new Error('Content not updated correctly');
  }
});

// Test 6: Event handling
testRunner.addTest('should handle click events', (done) => {
  let clickCount = 0;
  
  const component = new TemplateComponent({
    onClick: (event, comp) => {
      clickCount++;
      if (comp !== component) {
        throw new Error('Component reference not passed correctly');
      }
    }
  });
  
  // Simulate click
  component.element.click();
  
  if (clickCount !== 1) {
    throw new Error('Click event not handled correctly');
  }
});

// Test 7: Component destruction
testRunner.addTest('should destroy component correctly', () => {
  const component = new TemplateComponent();
  const element = component.element;
  
  // Add to DOM
  document.body.appendChild(element);
  
  // Destroy
  component.destroy();
  
  if (component.element !== null) {
    throw new Error('Component element not cleared');
  }
  
  if (document.body.contains(element)) {
    throw new Error('Element not removed from DOM');
  }
});

// Test 8: Footer visibility
testRunner.addTest('should show/hide footer based on options', () => {
  // Without footer
  const component1 = new TemplateComponent({ showFooter: false });
  const footer1 = component1.element.querySelector('.template-component__footer');
  if (footer1) {
    throw new Error('Footer should not be present when showFooter=false');
  }
  
  // With footer
  const component2 = new TemplateComponent({ showFooter: true });
  const footer2 = component2.element.querySelector('.template-component__footer');
  if (!footer2) {
    throw new Error('Footer should be present when showFooter=true');
  }
});

// Run tests if this file is executed directly
if (require.main === module) {
  testRunner.run();
}

module.exports = { TemplateComponentTest, testRunner };
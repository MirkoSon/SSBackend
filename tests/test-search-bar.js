

/**
 * Test file for SearchBar component
 *
 * This script generates an HTML file for visually testing the SearchBar component.
 * It covers debounce behavior, the clear button, and keyboard navigation.
 */

const fs = require('fs');
const path = require('path');

// This test doesn't run assertions in Node, but generates an HTML file
// for manual, browser-based testing, following the project's convention.
function runTests() {
  console.log('🧪 Generating SearchBar Component Test Page...');

  try {
    generateTestHTML();
    console.log('✅ Test page generated successfully: tests/search-bar-test.html');
    console.log('Please open this file in a browser to manually test the component.');
  } catch (error) {
    console.error('❌ Failed to generate test page:', error);
  }
}

function getComponentAndStyles() {
  const searchBarComponent = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'components', 'inputs', 'SearchBar.js'), 'utf8');
  const searchBarStyles = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'styles', 'components', 'search-bar.css'), 'utf8');
  const themeStyles = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'styles', 'theme.css'), 'utf8');
  return { searchBarComponent, searchBarStyles, themeStyles };
}

function generateTestHTML() {
  const { searchBarComponent, searchBarStyles, themeStyles } = getComponentAndStyles();

  const testHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SearchBar Component Test</title>
    <style>
        ${themeStyles}
        ${searchBarStyles}
        body {
            font-family: sans-serif;
            margin: 0;
            padding: 20px;
            background-color: var(--color-background);
            color: var(--color-text);
        }
        .test-section {
            margin-bottom: 40px;
            background: var(--color-surface);
            padding: 20px;
            border-radius: var(--border-radius-lg);
            box-shadow: var(--shadow-md);
        }
        .test-title {
            font-size: 1.2rem;
            font-weight: bold;
            margin-bottom: 16px;
            color: var(--color-text);
            border-bottom: 1px solid var(--color-border);
            padding-bottom: 8px;
        }
        .output {
            margin-top: 10px;
            padding: 10px;
            background: var(--color-background);
            border-radius: var(--border-radius-md);
            min-height: 20px;
            font-family: monospace;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <h1>SearchBar Component Test Page</h1>

    <div class="test-section">
        <div class="test-title">1. Basic SearchBar</div>
        <p>Should allow typing, clearing with 'X' button, and clearing with 'Escape' key.</p>
        <div id="search-bar-1"></div>
        <div class="output" id="output-1"></div>
    </div>

    <div class="test-section">
        <div class="test-title">2. SearchBar with Debounce (500ms)</div>
        <p>Search output should only update after you stop typing for 500ms.</p>
        <div id="search-bar-2"></div>
        <div class="output" id="output-2"></div>
    </div>

    <div class="test-section">
        <div class="test-title">3. SearchBar with Filter Button</div>
        <p>Should show a filter button. Clicking it logs to the output.</p>
        <div id="search-bar-3"></div>
        <div class="output" id="output-3"></div>
    </div>

    <script>
        // Inlined SearchBar component code
        ${searchBarComponent}

        document.addEventListener('DOMContentLoaded', function() {
            // Test 1: Basic
            const sb1 = new SearchBar({
                placeholder: 'Type here...',
                onSearch: (query) => {
                    document.getElementById('output-1').textContent = \`Searching for: \${query}\`;
                }
            });
            document.getElementById('search-bar-1').appendChild(sb1.render());

            // Test 2: With Debounce
            const sb2 = new SearchBar({
                placeholder: 'Try typing quickly...',
                debounceMs: 500,
                onSearch: (query) => {
                    document.getElementById('output-2').textContent = \`Debounced search: \${query}\`;
                }
            });
            document.getElementById('search-bar-2').appendChild(sb2.render());

            // Test 3: With Filter
            const sb3 = new SearchBar({
                placeholder: 'Search with filter...',
                showFilter: true,
                onSearch: (query) => {
                    document.getElementById('output-3').textContent = \`Searching for: \${query}\`;
                },
                onFilter: () => {
                    document.getElementById('output-3').textContent = 'Filter button clicked!';
                }
            });
            document.getElementById('search-bar-3').appendChild(sb3.render());
        });
    </script>
</body>
</html>
  `

  fs.writeFileSync(path.join(__dirname, 'search-bar-test.html'), testHTML.trim());
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };

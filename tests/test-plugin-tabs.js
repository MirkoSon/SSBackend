
/**
 * Test file for PluginTabs component
 *
 * This script generates an HTML file for visually and manually testing the
 * PluginTabs component, including its state management with localStorage.
 */

const fs = require('fs');
const path = require('path');

function runTests() {
  console.log('🧪 Generating PluginTabs Component Test Page...');

  try {
    generateTestHTML();
    console.log('✅ Test page generated successfully: tests/plugin-tabs-test.html');
    console.log('Please open this file in a browser to manually test the component.');
  } catch (error) {
    console.error('❌ Failed to generate test page:', error);
  }
}

function getComponentAndStyles() {
  const pluginTabsComponent = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'components', 'navigation', 'PluginTabs.js'), 'utf8');
  const pluginNavManagerCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin', 'components', 'pluginNavigation.js'), 'utf8');
  const pluginTabsStyles = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'styles', 'components', 'navigation', 'plugin-tabs.css'), 'utf8');
  const themeStyles = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'styles', 'theme.css'), 'utf8');
  return { pluginTabsComponent, pluginNavManagerCode, pluginTabsStyles, themeStyles };
}

function generateTestHTML() {
  const { pluginTabsComponent, pluginNavManagerCode, pluginTabsStyles, themeStyles } = getComponentAndStyles();

  const testHTML = `
<!DOCTYPE html>
<html lang=\"en\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>PluginTabs Component Test</title>
    <style>
        ${themeStyles}
        ${pluginTabsStyles}
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
        .output { margin-top: 10px; padding: 10px; background: #333; border-radius: 4px; min-height: 20px; font-family: monospace; }
        .controls button { margin-right: 10px; }
    </style>
</head>
<body>
    <h1>PluginTabs Component Test Page</h1>
    <p>Clear localStorage (\"ssbackend_open_tabs\") and refresh to reset the test.</p>

    <div class=\"test-section\">
        <div id=\"tab-bar-container\"></div>
        <div class=\"controls\">
            <h3>Controls</h3>
            <button id=\"btn-activate-economy\">Activate Economy Tab</button>
            <button id=\"btn-activate-achievements\">Activate Achievements Tab</button>
            <button id=\"btn-open-leaderboards\">Open Leaderboards Tab</button>
        </div>
        <div class=\"output\" id=\"output-log\"></div>
    </div>

    <script>
        // Mock global window
        window.PluginNavigationManager = {};

        // Inlined code
        ${pluginNavManagerCode}
        ${pluginTabsComponent}

        const PluginNavigationManager = window.PluginNavigationManager;

        // --- Test Setup ---
        const mockPlugins = [
          { name: \"economy\", version: \"1.0.0\", adminUI: { enabled: true, navigation: { label: \"Economy\", icon: \"💰\", priority: 10 } } },
          { name: \"achievements\", version: \"1.0.0\", adminUI: { enabled: true, navigation: { label: \"Achievements\", icon: \"🏆\", priority: 20 } } },
          { name: \"leaderboards\", version: \"1.0.0\", adminUI: { enabled: true, navigation: { label: \"Leaderboards\", icon: \"📊\", priority: 30 } } },
          { name: \"users\", version: \"1.0.0\", adminUI: { enabled: true, navigation: { label: \"Users\", icon: \"👥\", priority: 1 } } },
        ];

        const manager = new PluginNavigationManager();
        mockPlugins.forEach(p => manager.registerPlugin(p));

        let activePluginId = \"economy\"; // Initial active plugin

        const log = (message) => {
            const output = document.getElementById(\"output-log\");
            output.textContent = message;
            console.log(message);
        };

        function renderTabs() {
            const container = document.getElementById(\"tab-bar-container\");
            container.innerHTML = \"\"; // Clear previous render

            const tabs = new PluginTabs({
                allPlugins: manager.getRegisteredPlugins(),
                activePlugin: activePluginId,
                onTabClick: (pluginId) => {
                    log(\\`Tab clicked: ${pluginId}\\`);
                    activePluginId = pluginId;
                    renderTabs(); // Re-render to show active state
                },
            });
            
            const renderedTabs = tabs.render();
            container.appendChild(renderedTabs);

            // We need to re-attach the close handler because closeTab is instance-specific
            renderedTabs.querySelectorAll("\\.plugin-tab__close\").forEach(btn => {
                btn.addEventListener(\"click\", (e) => {
                    e.stopPropagation();
                    const pluginIdToClose = e.target.dataset.pluginId;
                    log(\\`Close button clicked for: ${pluginIdToClose}\\`);
                    tabs.closeTab(pluginIdToClose);
                });
            });
        }

        // --- Controls --- 
        document.getElementById(\"btn-activate-economy\").addEventListener(\"click\", () => {
            log(\"Activating Economy\");
            activePluginId = \"economy\";
            renderTabs();
        });

        document.getElementById(\"btn-activate-achievements\").addEventListener(\"click\", () => {
            log(\"Activating Achievements\");
            activePluginId = \"achievements\";
            renderTabs();
        });

        document.getElementById(\"btn-open-leaderboards\").addEventListener(\"click\", () => {
            log(\"Opening Leaderboards\");
            const tabsInstance = new PluginTabs({ allPlugins: manager.getRegisteredPlugins() });
            tabsInstance.openTab(\"leaderboards\");
            renderTabs();
        });

        // --- Initial Render ---
        document.addEventListener(\"DOMContentLoaded\", renderTabs);

    </script>
</body>
</html>
  `;

  fs.writeFileSync(path.join(__dirname, 'plugin-tabs-test.html'), testHTML.trim());
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };

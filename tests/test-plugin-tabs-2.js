
const fs = require('fs');
const path = require('path');

function run() {
    console.log('🧪 Generating PluginTabs Component Test Page...');

    try {
        // 1. Read component and style files
        const pluginTabsComponent = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'components', 'navigation', 'PluginTabs.js'), 'utf8');
        const pluginNavManagerCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin', 'components', 'pluginNavigation.js'), 'utf8');
        const pluginTabsStyles = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'styles', 'components', 'navigation', 'plugin-tabs.css'), 'utf8');
        const themeStyles = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'styles', 'theme.css'), 'utf8');

        // 2. Define the HTML structure
        const testHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PluginTabs Component Test</title>
    <style>
        ${themeStyles}
        ${pluginTabsStyles}
        body { font-family: sans-serif; margin: 20px; background-color: var(--color-background); color: var(--color-text); }
        .test-section { margin-bottom: 40px; background: var(--color-surface); padding: 20px; border-radius: 8px; box-shadow: var(--shadow-md); }
        .output { margin-top: 10px; padding: 10px; background: #2c2c2c; border-radius: 4px; min-height: 20px; font-family: monospace; color: #eee; }
        .controls button { margin-right: 10px; }
    </style>
</head>
<body>
    <h1>PluginTabs Component Test Page</h1>
    <p>Clear localStorage ('ssbackend_open_tabs') and refresh to reset the test.</p>

    <div class="test-section">
        <div id="tab-bar-container"></div>
        <div class="controls">
            <h3>Controls</h3>
            <button id="btn-activate-economy">Activate Economy Tab</button>
            <button id="btn-activate-achievements">Activate Achievements Tab</button>
            <button id="btn-open-leaderboards">Open Leaderboards Tab</button>
        </div>
        <div class="output" id="output-log"></div>
    </div>

    <script>
        // Inlined code
        ${pluginNavManagerCode}
        ${pluginTabsComponent}
    </script>
    <script>
        // Test logic
        document.addEventListener('DOMContentLoaded', () => {
            const log = (message) => {
                const output = document.getElementById('output-log');
                output.textContent = message;
                console.log(message);
            };

            const manager = new window.PluginNavigationManager();
            const mockPlugins = [
              { name: 'economy', version: '1.0.0', adminUI: { enabled: true, navigation: { label: 'Economy', icon: '💰', priority: 10 } } },
              { name: 'achievements', version: '1.0.0', adminUI: { enabled: true, navigation: { label: 'Achievements', icon: '🏆', priority: 20 } } },
              { name: 'leaderboards', version: '1.0.0', adminUI: { enabled: true, navigation: { label: 'Leaderboards', icon: '📊', priority: 30 } } },
              { name: 'users', version: '1.0.0', adminUI: { enabled: true, navigation: { label: 'Users', icon: '👥', priority: 1 } } },
            ];
            mockPlugins.forEach(p => manager.registerPlugin(p));

            let activePluginId = 'economy';
            let tabsInstance = null;

            function renderTabs() {
                const container = document.getElementById('tab-bar-container');
                container.innerHTML = '';

                tabsInstance = new PluginTabs({
                    allPlugins: manager.getRegisteredPlugins(),
                    activePlugin: activePluginId,
                    onTabClick: (pluginId) => {
                        log("Tab clicked: " + pluginId);
                        activePluginId = pluginId;
                        renderTabs();
                    },
                });

                const renderedTabs = tabsInstance.render();
                container.appendChild(renderedTabs);
                
                // Override the close button listener to re-render
                renderedTabs.querySelectorAll('.plugin-tab__close').forEach(btn => {
                    const originalListener = btn.onclick;
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const pluginIdToClose = e.target.closest('.plugin-tab').dataset.pluginId;
                        log("Closing tab: " + pluginIdToClose);
                        tabsInstance.closeTab(pluginIdToClose);
                        // In a real app, we'd navigate if the active tab is closed
                        if (activePluginId === pluginIdToClose) {
                            activePluginId = tabsInstance.openTabIds[0] || null;
                        }
                        renderTabs();
                    });
                });
            }

            document.getElementById('btn-activate-economy').addEventListener('click', () => {
                log('Activating Economy');
                activePluginId = 'economy';
                renderTabs();
            });

            document.getElementById('btn-activate-achievements').addEventListener('click', () => {
                log('Activating Achievements');
                activePluginId = 'achievements';
                renderTabs();
            });

            document.getElementById('btn-open-leaderboards').addEventListener('click', () => {
                log('Opening Leaderboards');
                tabsInstance.openTab('leaderboards');
                renderTabs();
            });

            renderTabs(); // Initial render
        });
    </script>
</body>
</html>
`;

        // 3. Write the final HTML to a file
        fs.writeFileSync(path.join(__dirname, 'plugin-tabs-test.html'), testHTML.trim());
        console.log('✅ Test page generated successfully: tests/plugin-tabs-test.html');

    } catch (error) {
        console.error('❌ Failed to generate test page:', error);
        process.exit(1);
    }
}

run();

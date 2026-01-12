
const fs = require('fs');
const path = require('path');

function run() {
    console.log('🧪 Generating PluginDropdown Component Test Page...');

    try {
        // 1. Read component and style files
        const pluginDropdownComponent = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'components', 'navigation', 'PluginDropdown.js'), 'utf8');
        const pluginNavManagerCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin', 'components', 'pluginNavigation.js'), 'utf8');
        const pluginDropdownStyles = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'styles', 'components', 'navigation', 'plugin-dropdown.css'), 'utf8');
        const themeStyles = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'styles', 'theme.css'), 'utf8');

        // 2. Define the HTML structure
        const testHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PluginDropdown Component Test</title>
    <style>
        ${themeStyles}
        ${pluginDropdownStyles}
        body { font-family: sans-serif; margin: 20px; background-color: var(--color-background); color: var(--color-text); }
        .test-section { display: flex; justify-content: flex-end; padding: 20px; background: var(--color-surface); border-radius: 8px; box-shadow: var(--shadow-md); }
        .output { margin-top: 10px; padding: 10px; background: #2c2c2c; border-radius: 4px; min-height: 20px; font-family: monospace; color: #eee; }
    </style>
</head>
<body>
    <h1>PluginDropdown Component Test Page</h1>
    <p>Tests opening, closing, click-outside, and placeholder toggle functionality.</p>

    <div class="test-section">
        <div id="dropdown-container"></div>
    </div>
    <div class="output" id="output-log"></div>

    <script>
        // Inlined code
        ${pluginNavManagerCode}
        ${pluginDropdownComponent}
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
              { name: 'achievements', version: '1.0.0', adminUI: { enabled: false, navigation: { label: 'Achievements', icon: '🏆', priority: 20 } } },
              { name: 'leaderboards', version: '1.0.0', adminUI: { enabled: true, navigation: { label: 'Leaderboards', icon: '📊', priority: 30 } } },
            ];
            mockPlugins.forEach(p => manager.registerPlugin(p));

            const allPlugins = manager.getRegisteredPlugins().map(p => {
                const manifest = mockPlugins.find(m => m.name === p.id);
                return { ...p, enabled: manifest.adminUI.enabled };
            });

            const dropdown = new PluginDropdown({
                plugins: allPlugins,
                onToggle: (pluginId, isEnabled) => {
                    log("Toggled plugin: " + pluginId + ", new state: " + isEnabled);
                }
            });

            const container = document.getElementById('dropdown-container');
            container.appendChild(dropdown.render());
        });
    </script>
</body>
</html>
`;

        // 3. Write the final HTML to a file
        fs.writeFileSync(path.join(__dirname, 'plugin-dropdown-test.html'), testHTML.trim());
        console.log('✅ Test page generated successfully: tests/plugin-dropdown-test.html');

    } catch (error) {
        console.error('❌ Failed to generate test page:', error);
        process.exit(1);
    }
}

run();

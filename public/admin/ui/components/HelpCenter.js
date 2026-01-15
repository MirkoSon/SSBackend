/**
 * Help Center UI Component
 * Renders technical documentation with side-navigation and premium styling.
 */
export class HelpCenter {
    constructor(config = {}) {
        this.config = {
            containerId: config.containerId || 'help-center-overlay',
            onClose: config.onClose || (() => { }),
            ...config
        };
        this.isOpen = false;
        this.currentDoc = 'api/overview.md';
        this.docs = [
            // API Documentation (User-facing)
            { type: 'header', title: 'API Documentation', icon: '🌐' },
            { id: 'api/overview.md', title: 'API Overview', icon: '📖' },
            { id: 'api/core-endpoints.md', title: 'Core Endpoints', icon: '⚡' },
            { id: 'api/admin-endpoints.md', title: 'Admin API', icon: '🔐' },

            // Plugin APIs will be inserted here dynamically
            { type: 'plugin-section', title: 'Plugin APIs', icon: '🔌' },

            // Development Resources
            { type: 'header', title: 'Development', icon: '💻' },
            { id: 'plugin-development-guide.md', title: 'Plugin Development', icon: '🔧' },
            { id: 'plugin-ui-guide.md', title: 'Plugin UI Guide', icon: '🎨' }
        ];
        this.activePlugins = []; // Will be populated from server
    }

    async loadActivePlugins() {
        try {
            const response = await fetch('/admin/api/plugins/ui-modules');
            if (response.ok) {
                const data = await response.json();
                this.activePlugins = data.plugins || [];
                this.insertPluginDocs();
            }
        } catch (error) {
            console.warn('Failed to load active plugins:', error);
        }
    }

    insertPluginDocs() {
        const pluginSectionIndex = this.docs.findIndex(doc => doc.type === 'plugin-section');
        if (pluginSectionIndex === -1) return;

        const pluginDocs = this.activePlugins.flatMap(plugin => {
            const docs = [];

            // Check if plugin has documentation declared in its manifest
            if (plugin.docs && plugin.docs.path) {
                docs.push({
                    id: plugin.docs.path,
                    title: plugin.docs.title || `${plugin.name} API`,
                    icon: plugin.docs.icon || '📚',
                    pluginId: plugin.id
                });
            }

            return docs;
        });

        // Insert plugin docs after plugin-section marker
        this.docs.splice(pluginSectionIndex + 1, 0, ...pluginDocs);
    }

    render() {
        const overlay = document.createElement('div');
        overlay.id = this.config.containerId;
        overlay.className = 'help-center-overlay';
        if (!this.isOpen) overlay.style.display = 'none';

        overlay.innerHTML = `
            <div class="help-center-modal">
                <header class="help-center-header">
                    <div class="help-center-header__title">
                        <span>📚</span> Documentation Help Center
                    </div>
                    <button class="help-center-close">&times;</button>
                </header>
                <div class="help-center-body">
                    <aside class="help-center-sidebar">
                        <nav class="help-center-nav">
                            ${this.renderNavigation()}
                        </nav>
                        <div class="help-center-sidebar-footer">
                            v1.5.0 • API Documentation
                        </div>
                    </aside>
                    <main class="help-center-content" id="help-center-content-area">
                        <div class="help-center-loading">
                            <div class="spinner"></div>
                            <p>Fetching documentation...</p>
                        </div>
                    </main>
                </div>
            </div>
        `;

        // Event Listeners
        overlay.querySelector('.help-center-close').addEventListener('click', () => this.toggle(false));
        overlay.querySelectorAll('.help-center-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const docId = item.dataset.doc;
                if (docId) {
                    this.loadDoc(docId);
                }
            });
        });

        return overlay;
    }

    renderNavigation() {
        return this.docs.map(doc => {
            if (doc.type === 'header') {
                return `
                    <div class="help-center-nav-header">
                        <span class="help-center-nav-icon">${doc.icon}</span>
                        <span>${doc.title}</span>
                    </div>
                `;
            } else if (doc.type === 'plugin-section') {
                // Don't render the marker itself
                return '';
            } else {
                // All documentation items (regular and plugin)
                return `
                    <a href="#" class="help-center-nav-item ${this.currentDoc === doc.id ? 'active' : ''}" data-doc="${doc.id}" data-plugin="${doc.pluginId || ''}">
                        <span class="help-center-nav-icon">${doc.icon}</span>
                        <span class="help-center-nav-text">${doc.title}</span>
                    </a>
                `;
            }
        }).join('');
    }

    async toggle(show) {
        this.isOpen = show !== undefined ? show : !this.isOpen;
        const overlay = document.getElementById(this.config.containerId);
        if (overlay) {
            overlay.style.display = this.isOpen ? 'flex' : 'none';
            if (this.isOpen) {
                document.body.style.overflow = 'hidden';
                // Load active plugins and update navigation
                await this.loadActivePlugins();
                // Re-render navigation with plugin docs
                const navContainer = overlay.querySelector('.help-center-nav');
                if (navContainer) {
                    navContainer.innerHTML = this.renderNavigation();
                    // Re-attach event listeners to new nav items
                    navContainer.querySelectorAll('.help-center-nav-item').forEach(item => {
                        item.addEventListener('click', (e) => {
                            e.preventDefault();
                            const docId = item.dataset.doc;
                            if (docId) {
                                this.loadDoc(docId);
                            }
                        });
                    });
                }
                await this.loadDoc(this.currentDoc);
            } else {
                document.body.style.overflow = '';
                this.config.onClose();
            }
        }
    }

    copyIntegrationPrompt(pluginId) {
        const prompts = {
            economy: `You are integrating the SSBackend Economy plugin into a game client.

**Base URL:** http://localhost:3000
**Plugin:** Economy (Virtual currency system)
**Authentication:** JWT Bearer token required

**Key Features:**
- Multi-currency support (coins, gems, etc.)
- Credit/debit/transfer transactions
- Balance management
- Transaction history

**Integration Tasks:**
1. Implement authentication flow (login to get JWT token)
2. Fetch user balances: GET /api/economy/balances/:userId
3. Create transactions: POST /api/economy/transactions
4. Display transaction history: GET /api/economy/transactions/:userId

**Example: Purchase Flow**
\`\`\`javascript
// 1. Check balance
const balances = await fetch('http://localhost:3000/api/economy/balances/1', {
  headers: { 'Authorization': 'Bearer <token>' }
}).then(r => r.json());

// 2. Debit currency for purchase
await fetch('http://localhost:3000/api/economy/transactions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    type: 'debit',
    user_id: 1,
    currency_id: 'coins',
    amount: 100,
    source: 'shop_purchase',
    description: 'Bought sword'
  })
});
\`\`\`

**Full API Documentation:** See Economy API docs in Help Center

**Task:** Implement a complete integration with error handling, balance checking, and UI feedback.`,

            achievements: `You are integrating the SSBackend Achievements plugin into a game client.

**Base URL:** http://localhost:3000
**Plugin:** Achievements (Achievement tracking system)
**Authentication:** JWT Bearer token required

**Key Features:**
- One-shot and incremental achievements
- Progress tracking
- Auto-checking on progress updates
- Achievement unlocking

**Integration Tasks:**
1. Fetch user achievements: GET /api/achievements/:userId
2. Update progress: POST /api/achievements/progress
3. Display achievement notifications when unlocked
4. Show achievement progress UI

**Example: Level-Up Achievement**
\`\`\`javascript
// Update player level progress
const response = await fetch('http://localhost:3000/api/achievements/progress', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    user_id: 1,
    metric_name: 'level',
    current_value: 5
  })
}).then(r => r.json());

// Check for newly unlocked achievements
response.checked_achievements.forEach(achievement => {
  if (achievement.newly_unlocked) {
    showNotification(\`Achievement Unlocked: \${achievement.achievement_code}\`);
  }
});
\`\`\`

**Full API Documentation:** See Achievements API docs in Help Center

**Task:** Implement achievement tracking with UI notifications and progress display.`,

            leaderboards: `You are integrating the SSBackend Leaderboards plugin into a game client.

**Base URL:** http://localhost:3000
**Plugin:** Leaderboards (Competitive ranking system)
**Authentication:** JWT Bearer token required

**Key Features:**
- Multiple leaderboard types (daily, weekly, all-time)
- Score submission
- Rank queries (global, surrounding players)
- Tie handling

**Integration Tasks:**
1. List available leaderboards: GET /api/leaderboards
2. Submit scores: POST /api/leaderboards/:boardId/submit
3. Get player rank: GET /api/leaderboards/:boardId/user/:userId/rank
4. Display surrounding players: GET /api/leaderboards/:boardId/user/:userId/surrounding

**Example: Submit Score & Show Rank**
\`\`\`javascript
// 1. Submit score
const submitResponse = await fetch('http://localhost:3000/api/leaderboards/1/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    user_id: 1,
    score: 75000
  })
}).then(r => r.json());

console.log(\`Your rank: #\${submitResponse.rank}\`);

// 2. Get surrounding players
const surroundResponse = await fetch('http://localhost:3000/api/leaderboards/1/user/1/surrounding?range=3', {
  headers: { 'Authorization': 'Bearer <token>' }
}).then(r => r.json());

surroundResponse.rankings.forEach(entry => {
  const marker = entry.is_current_user ? '➜' : ' ';
  console.log(\`\${marker} #\${entry.rank} - \${entry.username}: \${entry.score}\`);
});
\`\`\`

**Full API Documentation:** See Leaderboards API docs in Help Center

**Task:** Implement leaderboard integration with score submission, rank display, and surrounding players view.`
        };

        const prompt = prompts[pluginId];
        if (prompt) {
            navigator.clipboard.writeText(prompt).then(() => {
                // Show success notification
                const contentArea = document.getElementById('help-center-content-area');
                const notification = document.createElement('div');
                notification.className = 'help-center-notification';
                notification.innerHTML = `✅ Integration prompt copied to clipboard!`;
                contentArea.prepend(notification);
                setTimeout(() => notification.remove(), 3000);
            }).catch(err => {
                console.error('Failed to copy prompt:', err);
                alert('Failed to copy prompt to clipboard');
            });
        }
    }

    async loadDoc(docId) {
        this.currentDoc = docId;

        // Update Nav UI
        const navItems = document.querySelectorAll('.help-center-nav-item');
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.doc === docId);
        });

        const contentArea = document.getElementById('help-center-content-area');
        contentArea.innerHTML = `
            <div class="help-center-loading">
                <div class="spinner"></div>
                <p>Loading ${docId}...</p>
            </div>
        `;

        try {
            const response = await fetch(`/admin/api/docs/${docId}`);
            if (!response.ok) throw new Error('Failed to load documentation');

            const data = await response.json();
            this.renderMarkdown(data.content, contentArea);

            // Check if this is a plugin document and add floating copy button
            const pluginDoc = this.docs.find(doc => doc.id === docId && doc.pluginId);
            if (pluginDoc) {
                this.addFloatingCopyButton(contentArea, pluginDoc.pluginId);
            }
        } catch (error) {
            contentArea.innerHTML = `
                <div class="help-center-error">
                    <h3>❌ Failed to load document</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    addFloatingCopyButton(contentArea, pluginId) {
        // Remove any existing floating button
        const existingBtn = contentArea.querySelector('.floating-copy-btn');
        if (existingBtn) existingBtn.remove();

        // Create floating copy button
        const floatingBtn = document.createElement('button');
        floatingBtn.className = 'floating-copy-btn';
        floatingBtn.innerHTML = '📋';
        floatingBtn.title = 'Copy integration prompt for LLM';
        floatingBtn.addEventListener('click', () => this.copyIntegrationPrompt(pluginId));

        contentArea.appendChild(floatingBtn);
    }

    renderMarkdown(markdown, container) {
        // Since we don't want to add heavy dependencies like marked.js instantly via npm in this environment
        // and we want a premium look, let's use a structured rendering approach.
        // For now, we converts basic MD patterns to HTML with some premium classes.

        let html = markdown
            // Sections (Accordions for H2)
            .split(/^##\s+/m)
            .map((section, index) => {
                if (index === 0) { // Introduction / H1
                    return section
                        .replace(/^#\s+(.+)$/m, '<h1 class="docs-h1">$1</h1>')
                        .replace(/\n\n/g, '</p><p>')
                        .replace(/^(?!<h1|<p|<ul|<li)(.+)$/gm, '<p>$1</p>');
                }

                const lines = section.split('\n');
                const title = lines.shift();
                const body = lines.join('\n');

                return `
                    <div class="docs-accordion">
                        <div class="docs-accordion-header">
                            <span class="docs-accordion-title">${title}</span>
                            <span class="docs-accordion-arrow">▼</span>
                        </div>
                        <div class="docs-accordion-content">
                            ${this.parseBasicMarkdown(body)}
                        </div>
                    </div>
                `;
            }).join('');

        container.innerHTML = `<div class="docs-content">${html}</div>`;

        // Add accordion toggle logic
        container.querySelectorAll('.docs-accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                const parent = header.parentElement;
                parent.classList.toggle('open');
            });
        });

        // Highlight first section by default
        const first = container.querySelector('.docs-accordion');
        if (first) first.classList.add('open');
    }

    parseBasicMarkdown(text) {
        // Parse tables first (before other replacements)
        text = this.parseTables(text);

        return text
            .replace(/```([\s\S]*?)```/g, (match, code) => {
                return `
                    <div class="docs-code-block">
                        <div class="docs-code-header">
                            <span>Code</span>
                            <button class="docs-copy-btn" onclick="navigator.clipboard.writeText(\`${code.trim().replace(/`/g, '\\`')}\`)">📋 Copy</button>
                        </div>
                        <pre><code>${this.escapeHTML(code.trim())}</code></pre>
                    </div>
                `;
            })
            // Links [text](url)
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="docs-link">$1</a>')
            .replace(/`([^`]+)`/g, '<code class="docs-inline-code">$1</code>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // H3-H6 headings
            .replace(/^######\s+(.+)$/gm, '<h6 class="docs-h6">$1</h6>')
            .replace(/^#####\s+(.+)$/gm, '<h5 class="docs-h5">$1</h5>')
            .replace(/^####\s+(.+)$/gm, '<h4 class="docs-h4">$1</h4>')
            .replace(/^###\s+(.+)$/gm, '<h3 class="docs-h3">$1</h3>')
            .replace(/^-\s+(.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.+<\/li>)+/g, '<ul>$&</ul>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(?!<h|<p|<ul|<li|<div|<table)(.+)$/gm, '<p>$1</p>');
    }

    parseTables(text) {
        // Match markdown tables: | header | header |\n|--------|--------|\n| cell | cell |
        const tableRegex = /(\|[^\n]+\|\r?\n)((?:\|[-:\s]+\|[-:\s]*\r?\n))(\|[^\n]+\|\r?\n)+((?:\|[^\n]+\|\r?\n)*)/gm;

        return text.replace(tableRegex, (match) => {
            const lines = match.trim().split('\n');
            if (lines.length < 3) return match; // Need at least header, separator, one row

            // Parse header
            const headers = lines[0].split('|')
                .map(h => h.trim())
                .filter(h => h.length > 0);

            // Skip separator line (line[1])

            // Parse rows
            const rows = lines.slice(2).map(line => {
                return line.split('|')
                    .map(c => c.trim())
                    .filter(c => c.length > 0);
            });

            // Generate HTML table
            let html = '<table class="docs-table"><thead><tr>';
            headers.forEach(header => {
                html += `<th>${header}</th>`;
            });
            html += '</tr></thead><tbody>';

            rows.forEach(row => {
                html += '<tr>';
                row.forEach(cell => {
                    html += `<td>${cell}</td>`;
                });
                html += '</tr>';
            });

            html += '</tbody></table>';
            return html;
        });
    }

    escapeHTML(str) {
        return str.replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m]));
    }
}

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
        this.currentDoc = 'plugin-development-guide.md';
        this.docs = [
            { id: 'plugin-development-guide.md', title: '🔌 Plugin Development', icon: '🔌' },
            { id: 'plugin-ui-guide.md', title: '🎨 Plugin UI Guide', icon: '🎨' },
            { id: 'prd-optimization-2026.md', title: '🚀 Roadmap 2026', icon: '🚀' }
        ];
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
                            ${this.docs.map(doc => `
                                <a href="#" class="help-center-nav-item ${this.currentDoc === doc.id ? 'active' : ''}" data-doc="${doc.id}">
                                    <span class="help-center-nav-icon">${doc.icon}</span>
                                    <span class="help-center-nav-text">${doc.title}</span>
                                </a>
                            `).join('')}
                        </nav>
                        <div class="help-center-sidebar-footer">
                            v1.4.0 • Technical Docs
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
                this.loadDoc(item.dataset.doc);
            });
        });

        return overlay;
    }

    async toggle(show) {
        this.isOpen = show !== undefined ? show : !this.isOpen;
        const overlay = document.getElementById(this.config.containerId);
        if (overlay) {
            overlay.style.display = this.isOpen ? 'flex' : 'none';
            if (this.isOpen) {
                document.body.style.overflow = 'hidden';
                await this.loadDoc(this.currentDoc);
            } else {
                document.body.style.overflow = '';
                this.config.onClose();
            }
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
        } catch (error) {
            contentArea.innerHTML = `
                <div class="help-center-error">
                    <h3>❌ Failed to load document</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
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
            .replace(/`([^`]+)`/g, '<code class="docs-inline-code">$1</code>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/^-\s+(.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.+<\/li>)+/g, '<ul>$&</ul>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(?!<h|<p|<ul|<li|<div)(.+)$/gm, '<p>$1</p>');
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

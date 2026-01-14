/**
 * NotesView Component
 * 
 * Provides the main UI for managing notes in the admin dashboard.
 * Demonstrates use of CardContainer, DataTable, and ActionRegistry.
 */
import { CardContainer } from '../../ui/components/layout/CardContainer.js';
import { DataTable } from '../../ui/components/data-display/DataTable.js';
import { ActionRegistry } from '../../ui/components/ActionRegistry.js';

export class NotesView {
    constructor(container, context) {
        this.container = container;
        this.context = context;
        this.notes = [];
    }

    async init() {
        console.log('📝 NotesView initializing...');
        await this.fetchNotes();
        this.render();
    }

    async fetchNotes() {
        try {
            // In a real plugin, this would call req.pluginContext.app or a custom API
            // For the example, we'll simulate some data
            this.notes = [
                { id: 1, title: 'Welcome Note', content: 'This is an example note.', is_public: true, created_at: new Date().toISOString() },
                { id: 2, title: 'Private Research', content: 'Secret plugin ideas.', is_public: false, created_at: new Date().toISOString() }
            ];
        } catch (error) {
            console.error('Failed to fetch notes:', error);
        }
    }

    render() {
        const columns = [
            { key: 'id', label: 'ID' },
            { key: 'title', label: 'Title' },
            {
                key: 'is_public',
                label: 'Status',
                render: (val) => val ? '<span class="status-tag status-tag--active">Public</span>' : '<span class="status-tag status-tag--inactive">Private</span>'
            },
            { key: 'created_at', label: 'Created', render: (val) => new Date(val).toLocaleDateString() },
            {
                key: 'actions',
                label: 'Actions',
                render: (_, row) => {
                    const viewAction = ActionRegistry.resolve('view');
                    const editAction = ActionRegistry.resolve('edit');
                    const deleteAction = ActionRegistry.resolve({ id: 'delete', onClick: () => this.handleDelete(row.id) });

                    return `
                        <div class="action-buttons">
                            <button class="action-btn ${viewAction.className}" title="${viewAction.title}">${viewAction.label}</button>
                            <button class="action-btn ${editAction.className}" title="${editAction.title}">${editAction.label}</button>
                            <button class="action-btn ${deleteAction.className}" title="${deleteAction.title}">${deleteAction.label}</button>
                        </div>
                    `;
                }
            }
        ];

        const table = new DataTable({
            columns,
            data: this.notes,
            emptyMessage: 'No notes found. Create your first one!'
        });

        const card = new CardContainer({
            title: 'Notes Manager',
            icon: '📝',
            content: `
                <div class="notes-controls">
                    <button class="btn-primary">Add New Note</button>
                </div>
                <div class="notes-table-container">
                    ${table.render()}
                </div>
            `,
            actions: [
                { label: 'Refresh', onClick: () => this.init() }
            ]
        });

        this.container.innerHTML = '';
        this.container.appendChild(card.render());
    }

    handleDelete(id) {
        if (confirm(`Are you sure you want to delete note #${id}?`)) {
            console.log(`Deleting note ${id}...`);
            this.notes = this.notes.filter(n => n.id !== id);
            this.render();
        }
    }
}

export default NotesView;

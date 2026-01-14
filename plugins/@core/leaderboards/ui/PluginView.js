import { leaderboardsApi } from './components/LeaderboardManager/api/leaderboardsApi.js';
import CardContainer from '@ui/CardContainer';
import DataTable from '@ui/DataTable';
import RankingsView from './components/RankingsView/RankingsView.js';

export class PluginView {
    constructor(container) {
        this.container = container;
        this.currentTab = 'boards';
        this.leaderboards = [];
        this.rankingsView = new RankingsView();
    }

    async render() {
        this.container.innerHTML = `
            <div class="plugin-layout">
                <div class="plugin-subnav">
                    <button class="subnav-item active" data-tab="boards">Leaderboards</button>
                    <button class="subnav-item" data-tab="rankings">Rankings</button>
                </div>
                <div id="leaderboard-subview-container">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <p>Loading...</p>
                    </div>
                </div>
            </div>
            <style>
                .plugin-layout { display: flex; flex-direction: column; gap: 1rem; height: 100%; }
                .plugin-subnav { display: flex; gap: 1rem; border-bottom: 1px solid var(--color-border); padding-bottom: 0.5rem; }
                .subnav-item { 
                    background: none; border: none; padding: 0.5rem 1rem; cursor: pointer; 
                    color: var(--color-text-secondary); font-weight: 500; border-bottom: 2px solid transparent;
                    transition: all 0.2s;
                }
                .subnav-item.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }
                .subnav-item:hover:not(:disabled) { color: var(--color-primary); }
                .subnav-item:disabled { opacity: 0.5; cursor: not-allowed; }
                #leaderboard-subview-container { flex: 1; overflow: auto; }
                .leaderboard-actions { display: flex; gap: 0.5rem; }
            </style>
        `;

        this.attachTabEvents();
        await this.switchTab('boards');
    }

    attachTabEvents() {
        const tabs = this.container.querySelectorAll('.subnav-item');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                if (tabName !== this.currentTab) {
                    this.switchTab(tabName);
                }
            });
        });
    }

    async switchTab(tabName) {
        this.currentTab = tabName;

        // Update UI
        const tabs = this.container.querySelectorAll('.subnav-item');
        tabs.forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });

        const subContainer = this.container.querySelector('#leaderboard-subview-container');
        subContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading...</p></div>';

        if (tabName === 'boards') {
            await this.loadLeaderboards();
        } else if (tabName === 'rankings') {
            await this.rankingsView.init(subContainer);
        }
    }

    async loadLeaderboards() {
        try {
            const subContainer = this.container.querySelector('#leaderboard-subview-container');
            const data = await leaderboardsApi.listLeaderboards();
            this.leaderboards = data.leaderboards || [];

            subContainer.innerHTML = '';

            const card = new CardContainer({
                title: 'Leaderboard Manager',
                subtitle: 'Manage competition boards and scoring rules',
                content: this.leaderboards.length === 0 ? this.renderNoData() : this.renderTable(),
                actions: this.renderHeaderActions()
            });

            subContainer.appendChild(card.render());
        } catch (error) {
            console.error('Error loading leaderboards:', error);
            this.container.querySelector('#leaderboard-subview-container').innerHTML = `
                <div class="error-message">
                    <p>Error loading leaderboards: ${error.message}</p>
                    <button class="btn btn-secondary" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }

    renderHeaderActions() {
        const actions = document.createElement('div');
        actions.className = 'leaderboard-actions';

        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'btn btn-secondary btn-sm';
        refreshBtn.innerHTML = '<span>🔄</span> Refresh';
        refreshBtn.onclick = () => this.loadLeaderboards();

        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary btn-sm';
        addBtn.innerHTML = '<span>➕</span> New Board';
        addBtn.onclick = () => this.showBoardModal();

        actions.appendChild(refreshBtn);
        actions.appendChild(addBtn);

        return actions;
    }

    renderNoData() {
        const div = document.createElement('div');
        div.className = 'no-data';
        div.style.textAlign = 'center';
        div.style.padding = '3rem';
        div.innerHTML = `
            <p style="color: var(--color-text-secondary); margin-bottom: 1rem;">No leaderboards found. Create your first one to start tracking rankings!</p>
            <button class="btn btn-primary" id="create-first-btn">Create First Board</button>
        `;
        div.querySelector('#create-first-btn').onclick = () => this.showBoardModal();
        return div;
    }

    renderTable() {
        const table = new DataTable({
            columns: [
                { field: 'name', label: 'NAME', formatter: (val) => `<strong>${val}</strong>` },
                {
                    field: 'type',
                    label: 'TYPE',
                    formatter: (val) => `<span class="status-badge status-badge--${val === 'all_time' ? 'info' : 'success'}">${val.toUpperCase().replace('_', ' ')}</span>`
                },
                { field: 'game_mode', label: 'GAME MODE', formatter: (val) => `<code>${val || 'Default'}</code>` },
                { field: 'entry_count', label: 'ENTRIES' },
                { field: 'reset_schedule', label: 'RESET', formatter: (val) => val || 'None' }
            ],
            actions: [
                {
                    id: 'rankings',
                    handler: (row) => {
                        this.rankingsView.selectedBoardId = row.id;
                        this.switchTab('rankings');
                    }
                },
                {
                    id: 'edit',
                    title: 'Edit Board',
                    handler: (row) => this.showBoardModal(row)
                },
                {
                    id: 'delete',
                    title: 'Delete Board',
                    handler: (row) => this.handleDeleteBoard(row.id)
                }
            ],
            data: this.leaderboards
        });

        return table.render();
    }

    async handleDeleteBoard(id) {
        if (!confirm('Are you sure you want to delete this leaderboard? All rankings will be permanently removed.')) return;

        try {
            await leaderboardsApi.deleteLeaderboard(id);
            await this.loadLeaderboards();
        } catch (error) {
            alert('Failed to delete leaderboard: ' + error.message);
        }
    }

    showBoardModal(board = null) {
        const isEdit = !!board;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3 class="modal-title">${isEdit ? 'Edit Leaderboard' : 'Create New Leaderboard'}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="boardForm">
                        <div class="form-group">
                            <label class="form-label">Board Name</label>
                            <input type="text" name="name" class="form-control" required value="${board ? board.name : ''}" placeholder="e.g. Global High Scores">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <input type="text" name="description" class="form-control" value="${board ? (board.description || '') : ''}" placeholder="Optional description">
                        </div>
                        <div class="form-row" style="display:flex; gap:1rem; margin-bottom: 1.25rem;">
                            <div class="form-group" style="flex:1; margin-bottom:0;">
                                <label class="form-label">Reset Type</label>
                                <select name="type" class="form-control form-select">
                                    <option value="all_time" ${board && board.type === 'all_time' ? 'selected' : ''}>All Time</option>
                                    <option value="daily" ${board && board.type === 'daily' ? 'selected' : ''}>Daily</option>
                                    <option value="weekly" ${board && board.type === 'weekly' ? 'selected' : ''}>Weekly</option>
                                    <option value="monthly" ${board && board.type === 'monthly' ? 'selected' : ''}>Monthly</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:1; margin-bottom:0;">
                                <label class="form-label">Sort Order</label>
                                <select name="sortOrder" class="form-control form-select">
                                    <option value="DESC" ${board && board.sort_order === 'DESC' ? 'selected' : ''}>Higher is Better (DESC)</option>
                                    <option value="ASC" ${board && board.sort_order === 'ASC' ? 'selected' : ''}>Lower is Better (ASC)</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row" style="display:flex; gap:1rem;">
                            <div class="form-group" style="flex:1">
                                <label class="form-label">Game Mode</label>
                                <input type="text" name="gameMode" class="form-control" value="${board ? (board.game_mode || '') : ''}" placeholder="e.g. survival">
                            </div>
                            <div class="form-group" style="flex:1">
                                <label class="form-label">Max Entries</label>
                                <input type="number" name="maxEntries" class="form-control" value="${board ? board.max_entries : 10000}" min="1">
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary btn-close-modal">Cancel</button>
                    <button class="btn btn-primary" id="confirmBtn">${isEdit ? 'Save Changes' : 'Create Board'}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelectorAll('.modal-close, .btn-close-modal').forEach(b => b.onclick = close);

        overlay.querySelector('#confirmBtn').onclick = async (e) => {
            const btn = e.target;
            const form = overlay.querySelector('#boardForm');
            if (!form.reportValidity()) return;

            btn.disabled = true;
            btn.textContent = isEdit ? 'Saving...' : 'Creating...';

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            try {
                if (isEdit) {
                    await leaderboardsApi.updateLeaderboard(board.id, data);
                } else {
                    await leaderboardsApi.createLeaderboard(data);
                }
                close();
                await this.loadLeaderboards();
            } catch (error) {
                alert(`Error ${isEdit ? 'updating' : 'creating'} leaderboard: ` + error.message);
                btn.disabled = false;
                btn.textContent = isEdit ? 'Save Changes' : 'Create Board';
            }
        };
    }
}

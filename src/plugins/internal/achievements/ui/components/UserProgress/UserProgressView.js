import { achievementsApi } from '../AchievementManager/api/achievementsApi.js'; // Reuse or extend
import CardContainer from '@ui/CardContainer';
import DataTable from '@ui/DataTable';
import Button from '@ui/Button';

// Extend API to include user endpoints locally for now
const userProgressApi = {
    getAll: async () => {
        const res = await fetch('/admin/api/plugins/achievements/users');
        if (!res.ok) throw new Error((await res.json()).error);
        return res.json();
    },
    getUserDetails: async (userId) => {
        const res = await fetch(`/admin/api/plugins/achievements/users/${userId}`);
        if (!res.ok) throw new Error((await res.json()).error);
        return res.json();
    }
};

export class UserProgressView {
    constructor(container) {
        this.container = container;
        this.users = [];
        this.init();
    }

    async init() {
        await this.refresh();
    }

    async refresh() {
        try {
            this.users = await userProgressApi.getAll();
            this.render();
        } catch (err) {
            console.error(err);
            this.showError('Failed to load user progress');
        }
    }

    render() {
        this.container.innerHTML = '';

        const card = new CardContainer({
            title: 'User Progress',
            subtitle: 'Monitor player achievement unlocking status',
            content: this.renderContent(),
            actions: this.renderHeaderActions()
        });

        this.container.appendChild(card.render());
    }

    renderHeaderActions() {
        const actions = document.createElement('div');
        actions.className = 'achievement-actions';

        const refreshBtn = new Button({
            label: 'Refresh',
            icon: 'refresh',
            variant: 'secondary',
            size: 'small',
            onClick: () => this.refresh()
        });

        actions.appendChild(refreshBtn.render());
        return actions;
    }

    renderContent() {
        const content = document.createElement('div');
        content.className = 'user-progress-content';
        content.appendChild(this.renderTable());
        return content;
    }

    renderTable() {
        const tableContainer = document.createElement('div');
        tableContainer.className = 'progress-table-container';

        const columns = [
            { field: 'username', label: 'User', width: '25%', sortable: true, formatter: (val) => `<strong>${val}</strong>` },
            { field: 'unlocked_count', label: 'Unlocked', width: '15%', sortable: true, formatter: (val) => `<span class="status-badge status-active">${val}</span>` },
            { field: 'total_progress_records', label: 'Tracked', width: '15%' },
            { field: 'last_updated', label: 'Last Updated', width: '25%', formatter: (val) => val ? new Date(val).toLocaleString() : '-' },
            {
                field: 'actions',
                label: 'Actions',
                width: '15%',
                formatter: (_, row) => {
                    const btn = new Button({
                        label: 'View Details',
                        size: 'small',
                        variant: 'primary',
                        onClick: () => this.showUserDetails(row.id, row.username)
                    });
                    return btn.render();
                }
            }
        ];

        this.dataTable = new DataTable({
            columns,
            data: this.users,
            emptyMessage: 'No user progress found.',
            loading: false
        });

        tableContainer.appendChild(this.dataTable.render());
        return tableContainer;
    }

    async showUserDetails(userId, username) {
        try {
            const achievements = await userProgressApi.getUserDetails(userId);
            this.renderDetailsModal(username, achievements);
        } catch (err) {
            alert(err.message);
        }
    }

    renderDetailsModal(username, achievements) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const rows = achievements.map(a => {
            const isUnlocked = a.state === 'unlocked';
            const statusClass = isUnlocked ? 'status-active' : (a.state === 'in_progress' ? 'status-warning' : 'status-inactive');
            const statusIcon = isUnlocked ? '🏆' : (a.state === 'in_progress' ? '⏳' : '🔒');

            return `
                <tr>
                    <td><span class="code-text">${a.code}</span></td>
                    <td>
                        <div><strong>${a.name}</strong></div>
                        <div class="small-text">${a.name}</div>
                    </td>
                    <td>
                        <span class="status-badge ${statusClass}">${statusIcon} ${a.state}</span>
                    </td>
                    <td>
                        ${a.progress} / ${a.target}
                    </td>
                    <td>
                        ${a.unlocked_at ? new Date(a.unlocked_at).toLocaleString() : '-'}
                    </td>
                </tr>
            `;
        }).join('');

        overlay.innerHTML = `
            <div class="modal-container" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>Progress: ${username}</h3>
                    <button class="btn-close">&times;</button>
                </div>
                <div class="modal-body">
                    <table class="data-table__table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Achievement</th>
                                <th>State</th>
                                <th>Progress</th>
                                <th>Unlocked At</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.length ? rows : '<tr><td colspan="5" class="text-center">No achievements found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        const close = () => overlay.remove();
        overlay.querySelector('.btn-close').onclick = close;
    }

    showError(message) {
        this.container.innerHTML = `<div class="error-message">${message}</div>`;
    }
}

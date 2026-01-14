import { BalanceManagerView } from './components/BalanceManager/BalanceManagerView.js';

export class PluginView {
    constructor(container) {
        this.container = container;
        this.view = null;
        this.controller = this.createController();
    }

    async render() {
        this.container.innerHTML = '<div class="loading">Loading Economy Data...</div>';

        try {
            await this.fetchInitialData();
            this.container.innerHTML = '';
            this.view = new BalanceManagerView(this.container, this.controller);
            this.controller.view = this.view; // Link back
            this.view.render();
        } catch (err) {
            console.error('Failed to render Economy PluginView:', err);
            this.container.innerHTML = `<div class="error-message">Failed to load economy data: ${err.message}</div>`;
        }
    }

    async fetchInitialData() {
        const [balancesResponse, currenciesResponse] = await Promise.all([
            fetch(`/admin/api/plugins/economy/balances?limit=1000&_t=${Date.now()}`).then(r => r.json()),
            fetch('/admin/api/plugins/economy/currencies').then(r => r.json())
        ]);

        if (!balancesResponse.success) throw new Error(balancesResponse.error || 'Failed to fetch balances');

        const mappedUsers = (balancesResponse.balances || []).map(u => ({
            ...u,
            id: u.user_id || u.id,
            status: u.status || (u.last_login && (Date.now() - new Date(u.last_login).getTime() < 30 * 24 * 60 * 60 * 1000) ? 'active' : 'inactive') || 'inactive',
            balances: u.balances || {},
            last_updated: u.updated_at || u.last_login || new Date().toISOString(),
            email: u.email || 'N/A'
        }));

        this.controller.users = mappedUsers;
        this.controller.filteredUsers = [...mappedUsers];
        this.controller.currencies = currenciesResponse.currencies || currenciesResponse || [];
    }

    createController() {
        const self = this;
        return {
            users: [],
            filteredUsers: [],
            currencies: [],
            view: null,

            getCurrencies: () => self.controller.currencies,
            getTotalUsers: () => self.controller.filteredUsers.length,
            getPaginatedUsers: (page, pageSize) => {
                const start = (page - 1) * pageSize;
                return self.controller.filteredUsers.slice(start, start + pageSize);
            },

            handleSearch: (query) => {
                const q = query.toLowerCase();
                self.controller.filteredUsers = self.controller.users.filter(u =>
                    u.username.toLowerCase().includes(q) ||
                    (u.email && u.email.toLowerCase().includes(q)) ||
                    u.id.toString().includes(q)
                );
                if (self.view) {
                    self.view.currentPage = 1;
                    self.view.updateTable();
                }
            },

            handleCurrencyFilter: (currencyCode) => {
                self.controller.filteredUsers = [...self.controller.users];
                if (currencyCode) {
                    self.controller.filteredUsers = self.controller.filteredUsers.filter(u =>
                        u.balances && u.balances[currencyCode] !== undefined
                    );
                }
                if (self.view) {
                    self.view.currentPage = 1;
                    self.view.updateTable();
                }
            },

            handleStatusFilter: (status) => {
                self.controller.filteredUsers = [...self.controller.users];
                if (status) {
                    self.controller.filteredUsers = self.controller.filteredUsers.filter(u => u.status === status);
                }
                if (self.view) {
                    self.view.currentPage = 1;
                    self.view.updateTable();
                }
            },

            handleSort: (field, direction) => {
                self.controller.filteredUsers.sort((a, b) => {
                    let valA = a[field];
                    let valB = b[field];
                    if (valA == null) valA = '';
                    if (valB == null) valB = '';
                    if (typeof valA === 'string') valA = valA.toLowerCase();
                    if (typeof valB === 'string') valB = valB.toLowerCase();

                    if (valA < valB) return direction === 'asc' ? -1 : 1;
                    if (valA > valB) return direction === 'asc' ? 1 : -1;
                    return 0;
                });
                if (self.view) self.view.updateTable();
            },

            refreshData: async () => {
                await self.render();
            },

            exportData: () => {
                alert('Export feature coming soon!');
            },

            handleRowSelect: (row) => {
                console.log('Row selected:', row);
            },

            showTransactionHistory: async (userId) => {
                // Implementation moved from integration script
                console.log('Showing transaction history for:', userId);
                // For brevity, I'll assume we can use the same modal logic or common UI util
                // But for now, let's keep it simple or use a placeholder
                if (window.EconomyPluginUI && window.EconomyPluginUI.showTransactionHistory) {
                    window.EconomyPluginUI.showTransactionHistory(userId);
                } else {
                    alert('Transaction history feature requires additional UI components.');
                }
            },

            showBalanceModal: (userId) => {
                if (window.EconomyPluginUI && window.EconomyPluginUI.showBalanceModal) {
                    window.EconomyPluginUI.showBalanceModal(userId, () => self.render());
                } else {
                    alert('Balance adjustment feature requires additional UI components.');
                }
            }
        };
    }
}

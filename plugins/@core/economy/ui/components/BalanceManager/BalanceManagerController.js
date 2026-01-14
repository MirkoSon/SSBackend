import { economyApi } from '../api/economyApi';

export class BalanceManagerController {
    constructor() {
        this.users = [];
        this.filteredUsers = [];
        this.currencies = [];
        this.filters = {
            searchQuery: '',
            currencyFilter: '',
            statusFilter: ''
        };
        this.sortConfig = {
            field: 'id',
            direction: 'asc'
        };
        this.currentPage = 1;
        this.pageSize = 10;
        this.init();
    }

    async init() {
        await this.loadData();
    }

    async loadData() {
        try {
            // Load users and currencies
            const [usersResponse, currenciesResponse] = await Promise.all([
                economyApi.getUsers(),
                economyApi.getCurrencies()
            ]);

            this.users = usersResponse.data || [];
            this.currencies = currenciesResponse.data || [];
            
            this.applyFilters();
            return { success: true };
        } catch (error) {
            console.error('Failed to load balance manager data:', error);
            return { success: false, error: error.message };
        }
    }

    async refreshData() {
        return await this.loadData();
    }

    applyFilters() {
        let filtered = [...this.users];

        // Apply search filter
        if (this.filters.searchQuery) {
            const query = this.filters.searchQuery.toLowerCase();
            filtered = filtered.filter(user => 
                user.id?.toString().includes(query) ||
                user.username?.toLowerCase().includes(query) ||
                user.email?.toLowerCase().includes(query)
            );
        }

        // Apply currency filter
        if (this.filters.currencyFilter) {
            filtered = filtered.filter(user => 
                user.balances && user.balances[this.filters.currencyFilter] !== undefined
            );
        }

        // Apply status filter
        if (this.filters.statusFilter) {
            filtered = filtered.filter(user => user.status === this.filters.statusFilter);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            const aValue = this.getSortValue(a, this.sortConfig.field);
            const bValue = this.getSortValue(b, this.sortConfig.field);
            
            if (aValue < bValue) return this.sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        this.filteredUsers = filtered;
    }

    getSortValue(user, field) {
        switch (field) {
            case 'balances':
                // Sort by total balance value
                return Object.values(user.balances || {}).reduce((sum, balance) => sum + balance, 0);
            case 'last_updated':
                return new Date(user.last_updated || 0).getTime();
            default:
                return user[field] || '';
        }
    }

    handleSearch(query) {
        this.filters.searchQuery = query;
        this.currentPage = 1;
        this.applyFilters();
    }

    handleCurrencyFilter(currency) {
        this.filters.currencyFilter = currency;
        this.currentPage = 1;
        this.applyFilters();
    }

    handleStatusFilter(status) {
        this.filters.statusFilter = status;
        this.currentPage = 1;
        this.applyFilters();
    }

    handleSort(field, direction) {
        this.sortConfig.field = field;
        this.sortConfig.direction = direction;
        this.applyFilters();
    }

    getPaginatedUsers(page = this.currentPage, pageSize = this.pageSize) {
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return this.filteredUsers.slice(startIndex, endIndex);
    }

    getTotalUsers() {
        return this.filteredUsers.length;
    }

    getCurrencies() {
        return this.currencies.map(currency => ({
            code: currency.code,
            name: currency.name || currency.code.toUpperCase()
        }));
    }

    async showTransactionHistory(userId) {
        try {
            const response = await economyApi.getUserTransactions(userId);
            // This would typically open a modal or navigate to transaction history
            console.log('Transaction history for user:', userId, response.data);
            return response.data;
        } catch (error) {
            console.error('Failed to load transaction history:', error);
            throw error;
        }
    }

    async showBalanceModal(userId) {
        try {
            const user = this.users.find(u => u.id === userId);
            if (!user) {
                throw new Error('User not found');
            }
            
            // This would typically open a modal for balance editing
            console.log('Edit balance for user:', user);
            return { user, currencies: this.currencies };
        } catch (error) {
            console.error('Failed to load user data:', error);
            throw error;
        }
    }

    async updateUserBalance(userId, currency, newBalance) {
        try {
            const response = await economyApi.updateUserBalance(userId, currency, newBalance);
            
            // Update local data
            const userIndex = this.users.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                if (!this.users[userIndex].balances) {
                    this.users[userIndex].balances = {};
                }
                this.users[userIndex].balances[currency] = newBalance;
                this.users[userIndex].last_updated = new Date().toISOString();
            }
            
            this.applyFilters();
            return response.data;
        } catch (error) {
            console.error('Failed to update user balance:', error);
            throw error;
        }
    }

    async exportData() {
        try {
            const exportData = {
                timestamp: new Date().toISOString(),
                filters: this.filters,
                sortConfig: this.sortConfig,
                users: this.filteredUsers.map(user => ({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    status: user.status,
                    balances: user.balances,
                    last_updated: user.last_updated
                }))
            };

            // Create and download CSV file
            const csvContent = this.convertToCSV(exportData.users);
            this.downloadCSV(csvContent, `balance_export_${new Date().getTime()}.csv`);
            
            return { success: true, data: exportData };
        } catch (error) {
            console.error('Failed to export data:', error);
            return { success: false, error: error.message };
        }
    }

    convertToCSV(users) {
        const headers = ['User ID', 'Username', 'Email', 'Status', 'Last Updated'];
        const currencyHeaders = this.currencies.map(c => c.code.toUpperCase());
        const allHeaders = [...headers, ...currencyHeaders];
        
        const csvRows = [allHeaders.join(',')];
        
        users.forEach(user => {
            const row = [
                user.id,
                `"${user.username || ''}"`,
                `"${user.email || ''}"`,
                user.status,
                user.last_updated || ''
            ];
            
            // Add balance for each currency
            this.currencies.forEach(currency => {
                const balance = user.balances?.[currency.code] || 0;
                row.push(balance);
            });
            
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    handleRowSelect(row) {
        // Handle row selection for bulk operations
        console.log('Row selected:', row);
        return row;
    }

    getFilterSummary() {
        return {
            totalUsers: this.users.length,
            filteredUsers: this.filteredUsers.length,
            activeFilters: Object.values(this.filters).filter(f => f).length,
            currentPage: this.currentPage,
            totalPages: Math.ceil(this.filteredUsers.length / this.pageSize)
        };
    }

    // Utility methods for the view
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    formatDate(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}
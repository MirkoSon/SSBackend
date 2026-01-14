import CardContainer from '@ui/CardContainer';
import DataTable from '@ui/DataTable';
import SearchBar from '@ui/SearchBar';
import Button from '@ui/Button';
import Pagination from '@ui/Pagination';

export class BalanceManagerView {
    constructor(container, controller) {
        this.container = container;
        this.controller = controller;
        this.currentPage = 1;
        this.pageSize = 10;
        this.init();
    }

    async init() {
        this.render();
        this.bindEvents();
    }

    render() {
        this.container.innerHTML = '';

        const card = new CardContainer({
            title: 'Balance Management',
            subtitle: 'Manage user balances and currency allocations',
            content: this.renderContent(),
            actions: this.renderHeaderActions()
        });

        this.container.appendChild(card.render());
    }

    renderHeaderActions() {
        const actions = document.createElement('div');
        actions.className = 'balance-manager-actions';

        const refreshBtn = new Button({
            label: 'Refresh',
            icon: 'refresh',
            variant: 'secondary',
            size: 'small',
            onClick: () => this.controller.refreshData()
        });

        const exportBtn = new Button({
            label: 'Export',
            icon: 'download',
            variant: 'outline',
            size: 'small',
            onClick: () => this.controller.exportData()
        });

        actions.appendChild(refreshBtn.render());
        actions.appendChild(exportBtn.render());

        return actions;
    }

    renderContent() {
        const content = document.createElement('div');
        content.className = 'balance-manager-content';

        // Search and filters section
        const controlsSection = this.renderControls();
        content.appendChild(controlsSection);

        // Data table section
        const tableSection = this.renderTable();
        content.appendChild(tableSection);

        // Pagination section
        const paginationSection = this.renderPagination();
        content.appendChild(paginationSection);

        return content;
    }

    renderControls() {
        const controls = document.createElement('div');
        controls.className = 'balance-manager-controls';

        // Search bar
        const searchBar = new SearchBar({
            placeholder: 'Search users by ID, username, or email...',
            onSearch: (query) => this.controller.handleSearch(query),
            debounce: 300
        });

        // Filter controls
        const filterControls = this.renderFilterControls();

        controls.appendChild(searchBar.render());
        controls.appendChild(filterControls);

        return controls;
    }

    renderFilterControls() {
        const filters = document.createElement('div');
        filters.className = 'balance-filters';

        // Currency filter
        const currencySelect = document.createElement('select');
        currencySelect.className = 'filter-select';
        currencySelect.innerHTML = `
            <option value="">All Currencies</option>
            ${this.controller.getCurrencies().map(currency =>
            `<option value="${currency.code}">${currency.name}</option>`
        ).join('')}
        `;
        currencySelect.addEventListener('change', (e) =>
            this.controller.handleCurrencyFilter(e.target.value)
        );

        // Status filter
        const statusSelect = document.createElement('select');
        statusSelect.className = 'filter-select';
        statusSelect.innerHTML = `
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
        `;
        statusSelect.addEventListener('change', (e) =>
            this.controller.handleStatusFilter(e.target.value)
        );

        filters.appendChild(this.createFilterGroup('Currency', currencySelect));
        filters.appendChild(this.createFilterGroup('Status', statusSelect));

        return filters;
    }

    createFilterGroup(label, control) {
        const group = document.createElement('div');
        group.className = 'filter-group';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.className = 'filter-label';

        group.appendChild(labelEl);
        group.appendChild(control);

        return group;
    }

    renderTable() {
        const tableContainer = document.createElement('div');
        tableContainer.className = 'balance-table-container';

        const columns = [
            {
                field: 'id',
                label: 'User ID',
                width: '120px',
                sortable: true
            },
            {
                field: 'username',
                label: 'Username',
                width: '150px',
                sortable: true
            },
            {
                field: 'email',
                label: 'Email',
                width: '200px',
                sortable: true
            },
            {
                field: 'status',
                label: 'Status',
                width: '100px',
                formatter: (status) => this.formatStatus(status)
            },
            {
                field: 'balances',
                label: 'Balances',
                formatter: (balances) => this.renderBalances(balances)
            },
            {
                field: 'last_updated',
                label: 'Last Updated',
                width: '150px',
                formatter: (date) => this.formatDate(date)
            }
        ];

        const users = this.controller.getPaginatedUsers(this.currentPage, this.pageSize);

        this.dataTable = new DataTable({
            columns,
            data: users,
            actions: [
                {
                    id: 'history',
                    title: 'Transaction History',
                    handler: (row) => this.controller.showTransactionHistory(row.id)
                },
                {
                    id: 'edit',
                    title: 'Adjust Balance',
                    handler: (row) => this.controller.showBalanceModal(row.id)
                }
            ],
            emptyMessage: 'No users found matching your criteria.',
            loading: false,
            selectable: true,
            onRowSelect: (row) => this.controller.handleRowSelect(row),
            onSort: (field, direction) => this.controller.handleSort(field, direction)
        });

        tableContainer.appendChild(this.dataTable.render());
        return tableContainer;
    }

    renderPagination() {
        const totalUsers = this.controller.getTotalUsers();
        const totalPages = Math.ceil(totalUsers / this.pageSize);

        const pagination = new Pagination({
            currentPage: this.currentPage,
            totalPages: totalPages,
            pageSize: this.pageSize,
            totalItems: totalUsers,
            onPageChange: (page) => this.handlePageChange(page),
            onPageSizeChange: (size) => this.handlePageSizeChange(size)
        });

        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'balance-pagination';
        paginationContainer.appendChild(pagination.render());

        return paginationContainer;
    }

    renderBalances(balances) {
        if (!balances || Object.keys(balances).length === 0) {
            return '<span class="no-balances">No balances</span>';
        }

        const availableCurrencies = this.controller.getCurrencies();

        const balanceItems = Object.entries(balances)
            .map(([currencyId, amount]) => {
                const currencyInfo = availableCurrencies.find(c => c.id === currencyId) || { name: currencyId, symbol: '' };
                const displayName = currencyInfo.symbol || currencyInfo.name;

                return `<div class="balance-item">
                    <span class="balance-amount ${amount >= 0 ? 'positive' : 'negative'}">
                        ${this.formatNumber(amount)}
                    </span>
                    <span class="currency-code" title="${currencyInfo.name}">${displayName}</span>
                </div>`;
            })
            .join('');

        return `<div class="balances-list">${balanceItems}</div>`;
    }

    // Renamed from formatCurrency to avoid confusion since it no longer adds the symbol
    formatNumber(amount) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    }


    formatStatus(status) {
        const statusMap = {
            active: { class: 'status-active', label: 'Active' },
            inactive: { class: 'status-inactive', label: 'Inactive' },
            suspended: { class: 'status-suspended', label: 'Suspended' }
        };

        const statusInfo = statusMap[status] || { class: 'status-unknown', label: status };
        return `<span class="status-badge ${statusInfo.class}">${statusInfo.label}</span>`;
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

    handlePageChange(page) {
        this.currentPage = page;
        this.updateTable();
    }

    handlePageSizeChange(size) {
        this.pageSize = size;
        this.currentPage = 1;
        this.updateTable();
    }

    updateTable() {
        const users = this.controller.getPaginatedUsers(this.currentPage, this.pageSize);
        this.dataTable.updateData(users);

        // Update pagination
        const paginationContainer = this.container.querySelector('.balance-pagination');
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
            paginationContainer.appendChild(this.renderPagination());
        }
    }

    bindEvents() {
        // DataTable handles its own events internally
        // Additional event binding can be added here if needed
    }

    showLoading() {
        this.dataTable?.showLoading();
    }

    hideLoading() {
        this.dataTable?.hideLoading();
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;

        const tableContainer = this.container.querySelector('.balance-table-container');
        if (tableContainer) {
            tableContainer.innerHTML = '';
            tableContainer.appendChild(errorDiv);
        }
    }
}

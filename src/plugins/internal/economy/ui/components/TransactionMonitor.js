/**
 * Transaction Monitor - Component for viewing and managing economy transactions
 * Story 6.13: Refactor Economy Transaction Monitor with DataTable
 */

import { CardContainer } from '../../../../../../ui/components/layout/CardContainer.js';
import { DataTable } from '../../../../../../ui/components/data-display/DataTable.js';
import { SearchBar } from '../../../../../../ui/components/inputs/SearchBar.js';

class TransactionMonitor {
    constructor(container) {
        this.container = container;
        this.transactions = [];
        this.currencies = [];
        this.filteredTransactions = [];

        this.init();
    }

    async init() {
        try {
            await this.loadInitialData();
            this.render();
        } catch (error) {
            console.error('Failed to initialize Transaction Monitor:', error);
            this.container.innerHTML = `<div class="error-message">Failed to load Transaction Monitor.</div>`;
        }
    }

    async loadInitialData() {
        // In a real app, these would be API calls
        // const [transactions, currencies] = await Promise.all([...]);
        this.transactions = this.getMockTransactions();
        this.currencies = this.getMockCurrencies();
        this.filteredTransactions = this.transactions;
    }

    render() {
        const card = new CardContainer({
            title: 'Transaction Monitor',
            content: this.renderContent(),
        });

        this.container.innerHTML = '';
        this.container.appendChild(card.render());

        this.bindEvents();
    }

    renderContent() {
        const searchBar = new SearchBar({
            placeholder: 'Search by user, type, or status...',
            onSearch: (query) => this.handleSearch(query),
        });

        const columns = [
            { key: 'id', label: 'Transaction ID' },
            { key: 'user_id', label: 'User' },
            { key: 'amount', label: 'Amount', render: (amount) => this.renderAmount(amount) },
            { key: 'transaction_type', label: 'Type' },
            { key: 'currency_id', label: 'Currency' },
            { key: 'created_at', label: 'Timestamp', render: (date) => new Date(date).toLocaleString() },
            { key: 'status', label: 'Status', render: (status) => this.renderStatus(status) },
        ];

        this.dataTable = new DataTable({ columns, data: this.filteredTransactions });

        return `
            <div class="transaction-monitor-controls">
                ${searchBar.render()}
            </div>
            <div class="transaction-table-container">
                ${this.dataTable.render()}
            </div>
        `;
    }

    renderAmount(amount) {
        const className = amount >= 0 ? 'positive' : 'negative';
        const prefix = amount >= 0 ? '+' : '';
        return `<span class="${className}">${prefix}${amount.toLocaleString()}</span>`;
    }

    renderStatus(status) {
        return `<span class="status-badge status-${status.toLowerCase()}">${status}</span>`;
    }

    handleSearch(query) {
        const lowerQuery = query.toLowerCase();
        this.filteredTransactions = this.transactions.filter(tx => 
            tx.id.toLowerCase().includes(lowerQuery) ||
            tx.user_id.toString().toLowerCase().includes(lowerQuery) ||
            tx.transaction_type.toLowerCase().includes(lowerQuery) ||
            tx.status.toLowerCase().includes(lowerQuery)
        );
        this.dataTable.updateData(this.filteredTransactions);
    }

    bindEvents() {
        // Event listeners can be added here if needed, for example, for sorting.
    }

    // Mock data for demonstration purposes
    getMockTransactions() {
        return [
            { id: 'txn_1', user_id: 1, amount: 100, transaction_type: 'deposit', currency_id: 'coins', created_at: new Date(), status: 'Completed' },
            { id: 'txn_2', user_id: 2, amount: -50, transaction_type: 'withdraw', currency_id: 'coins', created_at: new Date(), status: 'Completed' },
            { id: 'txn_3', user_id: 1, amount: 25, transaction_type: 'admin_adjustment', currency_id: 'gems', created_at: new Date(), status: 'Completed' },
            { id: 'txn_4', user_id: 3, amount: 1000, transaction_type: 'deposit', currency_id: 'coins', created_at: new Date(), status: 'Pending' },
            { id: 'txn_5', user_id: 2, amount: -10, transaction_type: 'rollback', currency_id: 'gems', created_at: new Date(), status: 'Failed' },
        ];
    }

    getMockCurrencies() {
        return [
            { id: 'coins', name: 'Coins', symbol: '🪙' },
            { id: 'gems', name: 'Gems', symbol: '💎' },
        ];
    }
}

// This would be instantiated by a plugin loader
// new TransactionMonitor(document.getElementById('transaction-monitor-container'));
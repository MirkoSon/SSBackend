/**
 * CurrencyConfig - Refactored with modern components
 * Story 6.15: Refactor Economy Currency Configuration
 */

import { CardContainer } from '../../../../../../ui/components/layout/CardContainer.js';
import { DataTable } from '../../../../../../ui/components/data-display/DataTable.js';

class CurrencyConfig {
    constructor(container) {
        this.container = container;
        this.currencies = [];
        this.dataTable = null;

        this.init();
    }

    async init() {
        try {
            await this.loadCurrencies();
            this.render();
        } catch (error) {
            console.error('Failed to initialize Currency Config:', error);
            this.container.innerHTML = `<div class="error-message">Failed to load Currency Config.</div>`;
        }
    }

    async loadCurrencies() {
        // Mocking API call
        this.currencies = this.getMockCurrencies();
    }

    render() {
        const mainCard = new CardContainer({
            title: 'Currency Management',
            content: this.renderTableContainer(),
            actions: [{ label: 'Add New Currency', onClick: () => this.showCurrencyModal() }]
        });

        this.container.innerHTML = '';
        this.container.appendChild(mainCard.render());
        this.postRender();
    }

    renderTableContainer() {
        const columns = [
            { key: 'name', label: 'Currency Name' },
            { key: 'symbol', label: 'Symbol' },
            { key: 'id', label: 'Type' },
            { key: 'active', label: 'Status', render: (active) => this.renderStatus(active) }
        ];

        this.dataTable = new DataTable({
            columns,
            data: this.currencies,
            actions: [
                { id: 'edit', handler: (row) => this.showCurrencyModal(row.id) },
                { id: 'delete', handler: (row) => this.deleteCurrency(row.id) }
            ]
        });
        return this.dataTable.render();
    }

    renderStatus(active) {
        const status = active ? 'Active' : 'Inactive';
        const className = active ? 'status-active' : 'status-inactive';
        return `<span class="status-badge ${className}">${status}</span>`;
    }

    postRender() {
        // No longer needed for action buttons as DataTable handles them via handlers
    }

    showCurrencyModal(currencyId = null) {
        const isEdit = !!currencyId;
        const currency = isEdit ? this.currencies.find(c => c.id === currencyId) : {};

        const modalHTML = `
            <div class="modal-backdrop">
                <div class="modal">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Edit' : 'Add'} Currency</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form class="currency-form">
                            <div class="form-group">
                                <label>ID</label>
                                <input type="text" class="form-control" id="currency-id" value="${currency.id || ''}" ${isEdit ? 'readonly' : ''}>
                            </div>
                            <div class="form-group">
                                <label>Name</label>
                                <input type="text" class="form-control" id="currency-name" value="${currency.name || ''}">
                            </div>
                            <div class="form-group">
                                <label>Symbol</label>
                                <input type="text" class="form-control" id="currency-symbol" value="${currency.symbol || ''}">
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.bindModalEvents();
    }

    bindModalEvents() {
        const modal = document.querySelector('.modal-backdrop');
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.querySelector('.currency-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCurrency();
            modal.remove();
        });
    }

    saveCurrency() {
        console.log('Saving currency...'); // Mock save
        this.loadCurrencies(); // Re-load and re-render
        this.dataTable.updateData(this.currencies);
    }

    deleteCurrency(currencyId) {
        if (confirm(`Are you sure you want to delete currency ${currencyId}?`)) {
            console.log(`Deleting ${currencyId}...`); // Mock delete
            this.currencies = this.currencies.filter(c => c.id !== currencyId);
            this.dataTable.updateData(this.currencies);
        }
    }

    getMockCurrencies() {
        return [
            { id: 'coins', name: 'Coins', symbol: '🪙', active: true },
            { id: 'gems', name: 'Gems', symbol: '💎', active: true },
            { id: 'dust', name: 'Magic Dust', symbol: '✨', active: false },
        ];
    }
}

// new CurrencyConfig(document.getElementById('currency-config-container'));

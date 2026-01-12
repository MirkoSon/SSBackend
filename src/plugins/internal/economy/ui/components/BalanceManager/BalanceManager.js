import { BalanceManagerController } from './controller/BalanceManagerController.js';
import { BalanceManagerView } from './BalanceManagerView.js';
import { EconomyAPI } from './api/economyApi.js';

class BalanceManager {
    constructor(container) {
        this.container = container;
        this.api = new EconomyAPI();
        this.init();
    }

    async init() {
        try {
            const [users, currencies] = await Promise.all([
                this.api.getUsers(),
                this.api.getCurrencies(),
            ]);

            this.controller = new BalanceManagerController({
                users,
                currencies,
            });

            this.view = new BalanceManagerView(this.container, this.controller);
            this.view.render();

        } catch (error) {
            console.error('Failed to initialize Balance Manager:', error);
            this.container.innerHTML = `<div class="error-message">Failed to load Balance Manager.</div>`;
        }
    }
}

// This would be called by the plugin loader
new BalanceManager(document.getElementById('balance-manager-container'));

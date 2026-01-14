import { AchievementManagerView } from './components/AchievementManager/AchievementManagerView.js';
import { UserProgressView } from './components/UserProgress/UserProgressView.js';

export class PluginView {
    constructor(container) {
        this.container = container;
        this.currentTab = 'achievements'; // 'achievements' or 'progress'
        this.views = {};
    }

    async render() {
        this.container.innerHTML = `
            <div class="plugin-layout">
                <div class="plugin-subnav">
                    <button class="subnav-item active" data-tab="achievements">Definitions</button>
                    <button class="subnav-item" data-tab="progress">User Progress</button>
                </div>
                <div id="plugin-subview-container"></div>
            </div>
            <style>
                .plugin-layout { display: flex; flex-direction: column; gap: 1rem; height: 100%; }
                .plugin-subnav { display: flex; gap: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; }
                .subnav-item { 
                    background: none; border: none; padding: 0.5rem 1rem; cursor: pointer; 
                    color: var(--text-secondary); font-weight: 500; border-bottom: 2px solid transparent;
                }
                .subnav-item.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }
                .subnav-item:hover { color: var(--primary-color); }
                #plugin-subview-container { flex: 1; overflow: auto; }
            </style>
        `;

        this.attachEvents();
        await this.loadTab(this.currentTab);
    }

    attachEvents() {
        this.container.querySelectorAll('.subnav-item').forEach(btn => {
            btn.onclick = (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            };
        });
    }

    switchTab(tab) {
        if (this.currentTab === tab) return;
        this.currentTab = tab;

        // Update UI
        this.container.querySelectorAll('.subnav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        this.loadTab(tab);
    }

    async loadTab(tab) {
        const subContainer = this.container.querySelector('#plugin-subview-container');
        subContainer.innerHTML = ''; // Clear current

        if (tab === 'achievements') {
            this.views.achievements = new AchievementManagerView(subContainer);
        } else if (tab === 'progress') {
            this.views.progress = new UserProgressView(subContainer);
        }
    }
}

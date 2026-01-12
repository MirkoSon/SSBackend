/**
 * PluginTabs - Visual tab navigation for plugin switching
 * 
 * @component
 * @example
 * const pluginNavManager = new PluginNavigationManager();
 * // ... register plugins ...
 * const tabs = new PluginTabs({
 *   plugins: pluginNavManager.getRegisteredPlugins(),
 *   activePlugin: 'economy',
 *   onTabClick: (pluginId) => navigateToPlugin(pluginId),
 *   onTabClose: (pluginId) => closeTab(pluginId)
 * });
 * document.body.appendChild(tabs.render());
 */
class PluginTabs {
  constructor(config) {
    this.config = {
      allPlugins: [],
      activePlugin: null,
      onTabClick: () => {},
      ...config,
    };
    this.element = null;
    this.openTabIds = this.loadOpenTabs();

    // Ensure the active plugin always has a tab open
    if (this.config.activePlugin && !this.openTabIds.includes(this.config.activePlugin)) {
      this.openTab(this.config.activePlugin, false); // Don't save immediately
    }
  }

  loadOpenTabs() {
    try {
      const storedTabs = localStorage.getItem('ssbackend_open_tabs');
      return storedTabs ? JSON.parse(storedTabs) : [];
    } catch (e) {
      console.error('Failed to load open tabs from localStorage', e);
      return [];
    }
  }

  saveOpenTabs() {
    try {
      localStorage.setItem('ssbackend_open_tabs', JSON.stringify(this.openTabIds));
    } catch (e) {
      console.error('Failed to save open tabs to localStorage', e);
    }
  }

  openTab(pluginId, shouldSave = true) {
    if (!this.openTabIds.includes(pluginId)) {
      this.openTabIds.push(pluginId);
      if (shouldSave) {
        this.saveOpenTabs();
      }
    }
  }

  closeTab(pluginId) {
    this.openTabIds = this.openTabIds.filter(id => id !== pluginId);
    this.saveOpenTabs();
    // Here, we would typically navigate away if the active tab is closed.
    // The parent component will handle this logic.
    this.render(); // Re-render to show the change
  }

  render() {
    const container = document.createElement('div');
    container.className = 'plugin-tabs';

    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'plugin-tabs__container';

    const openPlugins = this.config.allPlugins.filter(p => this.openTabIds.includes(p.id));
    openPlugins.sort((a, b) => this.openTabIds.indexOf(a.id) - this.openTabIds.indexOf(b.id));

    openPlugins.forEach(plugin => {
      const tab = document.createElement('div');
      tab.className = 'plugin-tab';
      tab.dataset.pluginId = plugin.id;

      if (plugin.id === this.config.activePlugin) {
        tab.classList.add('plugin-tab--active');
      }

      tab.innerHTML = `
        <span class="plugin-tab__icon">${plugin.icon}</span>
        <span class="plugin-tab__title">${plugin.title}</span>
        <button class="plugin-tab__close" data-plugin-id="${plugin.id}">×</button>
      `;

      tabsContainer.appendChild(tab);
    });

    container.innerHTML = ''; // Clear previous content
    container.appendChild(tabsContainer);
    
    // If an element already exists, replace its content.
    // Otherwise, set this as the new element.
    if (this.element) {
        this.element.innerHTML = container.innerHTML;
    } else {
        this.element = container;
    }
    
    this.addEventListeners();
    return this.element;
  }

  addEventListeners() {
    this.element.addEventListener('click', (event) => {
      const tab = event.target.closest('.plugin-tab');
      if (!tab) return;

      const pluginId = tab.dataset.pluginId;

      if (event.target.classList.contains('plugin-tab__close')) {
        event.stopPropagation(); // Prevent tab click from firing
        this.closeTab(pluginId);
      } else {
        this.config.onTabClick(pluginId);
      }
    });
  }
}

export default PluginTabs;

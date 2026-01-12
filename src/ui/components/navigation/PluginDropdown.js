/**
 * PluginDropdown - Dropdown menu for plugin management
 * 
 * @component
 * @example
 * const pluginNavManager = new PluginNavigationManager();
 * // ... register plugins ...
 * const dropdown = new PluginDropdown({
 *   plugins: pluginNavManager.getRegisteredPlugins(),
 *   onToggle: (pluginId, enabled) => handlePluginToggle(pluginId, enabled)
 * });
 * document.body.appendChild(dropdown.render());
 */
class PluginDropdown {
  constructor(config) {
    this.config = {
      plugins: [],
      onToggle: () => {},
      ...config,
    };
    this.element = null;
    this.isOpen = false;
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
  }

  toggle() {
    this.isOpen = !this.isOpen;
    const menu = this.element.querySelector('.plugin-dropdown__menu');
    if (this.isOpen) {
      menu.classList.add('open');
      document.addEventListener('click', this.handleOutsideClick);
    } else {
      menu.classList.remove('open');
      document.removeEventListener('click', this.handleOutsideClick);
    }
  }

  handleOutsideClick(event) {
    if (!this.element.contains(event.target)) {
      this.toggle();
    }
  }

  render() {
    const container = document.createElement('div');
    container.className = 'plugin-dropdown';

    const trigger = document.createElement('button');
    trigger.className = 'plugin-dropdown__trigger';
    trigger.innerHTML = '🧩';

    const menu = document.createElement('div');
    menu.className = 'plugin-dropdown__menu';

    const header = document.createElement('div');
    header.className = 'plugin-dropdown__header';
    header.textContent = 'Available Plugins';

    const list = document.createElement('div');
    list.className = 'plugin-dropdown__list';

    this.config.plugins.forEach(plugin => {
      const item = document.createElement('div');
      item.className = 'plugin-dropdown__item';
      item.innerHTML = `
        <span class="plugin-dropdown__icon">${plugin.icon}</span>
        <span class="plugin-dropdown__name">${plugin.title}</span>
        <label class="plugin-dropdown__toggle">
          <input type="checkbox" class="plugin-toggle-checkbox" data-plugin-id="${plugin.id}" ${plugin.enabled ? 'checked' : ''}>
          <span class="plugin-dropdown__slider"></span>
        </label>
      `;
      list.appendChild(item);
    });

    menu.appendChild(header);
    menu.appendChild(list);
    container.appendChild(trigger);
    container.appendChild(menu);

    this.element = container;
    this.addEventListeners();
    return this.element;
  }

  addEventListeners() {
    const trigger = this.element.querySelector('.plugin-dropdown__trigger');
    trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        this.toggle();
    });

    const toggles = this.element.querySelectorAll('.plugin-toggle-checkbox');
    toggles.forEach(toggle => {
      toggle.addEventListener('change', (event) => {
        const pluginId = event.target.dataset.pluginId;
        const isEnabled = event.target.checked;
        this.config.onToggle(pluginId, isEnabled);
        alert('Plugin enable/disable functionality will be implemented in a future release.');
        // Since this is a visual placeholder, we prevent the state from actually changing
        event.target.checked = !isEnabled;
      });
    });
  }
}

export default PluginDropdown;

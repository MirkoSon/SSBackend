/**
 * Navigation Renderer
 * Handles rendering and visual aspects of dynamic navigation
 */
class NavigationRenderer {
  constructor() {
    this.templates = {};
    this.loadTemplates();
    
    console.log('🎨 Navigation Renderer initialized');
  }

  /**
   * Load HTML templates for different navigation components
   */
  loadTemplates() {
    this.templates = {
      pluginSection: `
        <li class="nav-section-header">
          <div class="nav-section-title">
            <span class="nav-section-icon">{{icon}}</span>
            <span>{{title}}</span>
            <button class="nav-section-toggle" data-section="{{sectionId}}" title="Toggle {{title}} section">
              {{toggleIcon}}
            </button>
          </div>
        </li>
      `,
      
      pluginGroup: `
        <li class="nav-plugin-group" data-plugin="{{pluginId}}">
          <div class="nav-plugin-header">
            <span class="nav-plugin-icon">{{icon}}</span>
            <span class="nav-plugin-label">{{label}}</span>
            <div class="nav-plugin-indicators">
              {{indicators}}
            </div>
          </div>
          {{items}}
        </li>
      `,
      
      pluginItem: `
        <li>
          <a href="#{{id}}" class="nav-link nav-plugin-item" 
             data-view="{{id}}" data-plugin-id="{{pluginId}}"
             title="{{title}}">
            {{icon}} {{label}}
          </a>
        </li>
      `,
      
      statusIndicator: `
        <span class="plugin-status-indicator {{statusClass}}" 
              title="{{statusText}}">{{statusIcon}}</span>
      `,
      
      separator: `
        <li class="nav-separator">
          <hr>
        </li>
      `,

      searchBox: `
        <li class="nav-search-container">
          <div class="nav-search">
            <input type="text" 
                   class="nav-search-input" 
                   placeholder="Search navigation..."
                   id="navSearchInput">
            <button class="nav-search-clear" id="navSearchClear" title="Clear search">
              ✕
            </button>
          </div>
        </li>
      `
    };
  }

  /**
   * Render template with data
   */
  renderTemplate(templateName, data) {
    let template = this.templates[templateName];
    if (!template) {
      console.error(`❌ Template not found: ${templateName}`);
      return '';
    }

    // Simple template replacement
    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(placeholder, value);
    }

    return template;
  }

  /**
   * Render complete navigation structure
   */
  renderNavigation(coreItems, pluginItems, state) {
    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) {
      console.error('❌ Nav menu element not found');
      return;
    }

    // Clear existing content
    navMenu.innerHTML = '';

    // Render core navigation
    this.renderCoreNavigation(navMenu, coreItems);

    // Render search box if enabled
    if (state.searchEnabled) {
      this.renderSearchBox(navMenu);
    }

    // Render plugin navigation if available
    if (pluginItems.length > 0) {
      this.renderPluginNavigation(navMenu, pluginItems, state);
    }

    // Setup event listeners
    this.setupNavigationEvents();
  }

  /**
   * Render core navigation items
   */
  renderCoreNavigation(container, coreItems) {
    coreItems.forEach(item => {
      const li = document.createElement('li');
      
      // Clone the original link to preserve all attributes
      const link = item.element ? item.element.cloneNode(true) : this.createCoreLink(item);
      link.classList.add('nav-core-item');
      
      li.appendChild(link);
      container.appendChild(li);
    });
  }

  /**
   * Create core navigation link if element not available
   */
  createCoreLink(item) {
    const link = document.createElement('a');
    link.href = item.href || `#${item.id}`;
    link.className = 'nav-link nav-core-item';
    link.dataset.view = item.id;
    link.innerHTML = `${item.icon} ${item.label}`;
    return link;
  }

  /**
   * Render search box
   */
  renderSearchBox(container) {
    const searchHtml = this.renderTemplate('searchBox', {});
    const searchElement = document.createElement('div');
    searchElement.innerHTML = searchHtml;
    
    container.appendChild(searchElement.firstElementChild);
  }

  /**
   * Render plugin navigation sections
   */
  renderPluginNavigation(container, pluginItems, state) {
    if (pluginItems.length === 0) return;

    // Add separator
    const separatorHtml = this.renderTemplate('separator', {});
    const separatorElement = document.createElement('div');
    separatorElement.innerHTML = separatorHtml;
    container.appendChild(separatorElement.firstElementChild);

    // Render plugins section header
    const sectionHtml = this.renderTemplate('pluginSection', {
      icon: '🧩',
      title: 'Plugins',
      sectionId: 'plugins',
      toggleIcon: state.collapsed?.plugins ? '▶' : '▼'
    });
    
    const sectionElement = document.createElement('div');
    sectionElement.innerHTML = sectionHtml;
    container.appendChild(sectionElement.firstElementChild);

    // Render plugin groups if not collapsed
    if (!state.collapsed?.plugins) {
      pluginItems.forEach(plugin => {
        this.renderPluginGroup(container, plugin);
      });
    }
  }

  /**
   * Render individual plugin group
   */
  renderPluginGroup(container, plugin) {
    // Render plugin items
    const itemsHtml = this.renderPluginItems(plugin.items || [], plugin.pluginId);

    // Generate status indicators
    const indicators = this.renderStatusIndicators(plugin);

    // Render plugin group
    const groupHtml = this.renderTemplate('pluginGroup', {
      pluginId: plugin.pluginId,
      icon: plugin.icon || '🧩',
      label: plugin.label || plugin.pluginId,
      indicators: indicators,
      items: itemsHtml
    });

    const groupElement = document.createElement('div');
    groupElement.innerHTML = groupHtml;
    container.appendChild(groupElement.firstElementChild);
  }

  /**
   * Render plugin navigation items
   */
  renderPluginItems(items, pluginId) {
    if (!items || items.length === 0) {
      return '';
    }

    const itemsContainer = document.createElement('ul');
    itemsContainer.className = 'nav-plugin-items';

    items.forEach(item => {
      const itemHtml = this.renderTemplate('pluginItem', {
        id: item.id,
        pluginId: pluginId,
        icon: item.icon || '📄',
        label: item.label || item.title,
        title: item.title || item.label
      });

      const itemElement = document.createElement('div');
      itemElement.innerHTML = itemHtml;
      itemsContainer.appendChild(itemElement.firstElementChild);
    });

    return itemsContainer.outerHTML;
  }

  /**
   * Render status indicators for plugin
   */
  renderStatusIndicators(plugin) {
    const indicators = [];

    // Active status indicator
    indicators.push(this.renderTemplate('statusIndicator', {
      statusClass: 'status-active',
      statusText: 'Plugin Active',
      statusIcon: '●'
    }));

    // Add health indicator if available
    if (plugin.health) {
      const healthClass = plugin.health === 'healthy' ? 'status-healthy' : 
                         plugin.health === 'warning' ? 'status-warning' : 'status-error';
      
      indicators.push(this.renderTemplate('statusIndicator', {
        statusClass: healthClass,
        statusText: `Health: ${plugin.health}`,
        statusIcon: plugin.health === 'healthy' ? '✓' : 
                   plugin.health === 'warning' ? '⚠' : '✗'
      }));
    }

    // Add update indicator if available
    if (plugin.updateAvailable) {
      indicators.push(this.renderTemplate('statusIndicator', {
        statusClass: 'status-update',
        statusText: 'Update Available',
        statusIcon: '⬆'
      }));
    }

    return indicators.join('');
  }

  /**
   * Setup navigation event listeners
   */
  setupNavigationEvents() {
    // Section toggle events
    document.querySelectorAll('.nav-section-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const sectionId = toggle.dataset.section;
        this.toggleSection(sectionId);
      });
    });

    // Search events (if search box exists)
    const searchInput = document.getElementById('navSearchInput');
    const searchClear = document.getElementById('navSearchClear');
    
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.handleSearch(e.target.value);
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchInput.value = '';
          this.handleSearch('');
        }
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          this.handleSearch('');
          searchInput.focus();
        }
      });
    }
  }

  /**
   * Toggle section collapse state
   */
  toggleSection(sectionId) {
    if (window.dynamicNavigation) {
      window.dynamicNavigation.toggleSection(sectionId);
    }
  }

  /**
   * Handle search input
   */
  handleSearch(searchTerm) {
    if (window.dynamicNavigation) {
      window.dynamicNavigation.filterNavigation(searchTerm);
    }
  }

  /**
   * Update visual state of navigation
   */
  updateNavigationState(state) {
    // Update toggle icons
    document.querySelectorAll('.nav-section-toggle').forEach(toggle => {
      const sectionId = toggle.dataset.section;
      const isCollapsed = state.collapsed?.[sectionId];
      toggle.textContent = isCollapsed ? '▶' : '▼';
    });

    // Update search visibility
    const searchContainer = document.querySelector('.nav-search-container');
    if (searchContainer) {
      searchContainer.style.display = state.searchEnabled ? 'block' : 'none';
    }
  }

  /**
   * Apply search filter to navigation
   */
  applySearchFilter(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    
    // Show/hide navigation items based on search
    document.querySelectorAll('.nav-link').forEach(link => {
      const text = link.textContent.toLowerCase();
      const matches = !term || text.includes(term);
      
      const parentLi = link.closest('li');
      if (parentLi) {
        parentLi.style.display = matches ? '' : 'none';
      }
    });

    // Show/hide plugin groups based on whether they have visible items
    document.querySelectorAll('.nav-plugin-group').forEach(group => {
      const visibleItems = group.querySelectorAll('.nav-plugin-items li:not([style*="display: none"])');
      group.style.display = !term || visibleItems.length > 0 ? '' : 'none';
    });

    // Update search state indicator
    const searchInput = document.getElementById('navSearchInput');
    if (searchInput) {
      searchInput.classList.toggle('has-results', term && this.hasVisibleResults());
    }
  }

  /**
   * Check if search has visible results
   */
  hasVisibleResults() {
    const visibleLinks = document.querySelectorAll('.nav-link:not([style*="display: none"])');
    return visibleLinks.length > 0;
  }

  /**
   * Clear search and show all items
   */
  clearSearch() {
    // Show all navigation items
    document.querySelectorAll('.nav-link').forEach(link => {
      const parentLi = link.closest('li');
      if (parentLi) {
        parentLi.style.display = '';
      }
    });

    // Show all plugin groups
    document.querySelectorAll('.nav-plugin-group').forEach(group => {
      group.style.display = '';
    });

    // Clear search input
    const searchInput = document.getElementById('navSearchInput');
    if (searchInput) {
      searchInput.value = '';
      searchInput.classList.remove('has-results');
    }
  }

  /**
   * Highlight search matches in navigation
   */
  highlightMatches(searchTerm) {
    if (!searchTerm) {
      this.clearHighlights();
      return;
    }

    const term = searchTerm.toLowerCase();
    
    document.querySelectorAll('.nav-link').forEach(link => {
      const originalText = link.dataset.originalText || link.textContent;
      if (!link.dataset.originalText) {
        link.dataset.originalText = originalText;
      }

      // Simple highlight - wrap matching text
      const text = originalText.toLowerCase();
      const index = text.indexOf(term);
      
      if (index !== -1) {
        const before = originalText.substring(0, index);
        const match = originalText.substring(index, index + term.length);
        const after = originalText.substring(index + term.length);
        
        link.innerHTML = `${before}<mark class="nav-search-highlight">${match}</mark>${after}`;
      } else {
        link.textContent = originalText;
      }
    });
  }

  /**
   * Clear search highlights
   */
  clearHighlights() {
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.dataset.originalText) {
        link.textContent = link.dataset.originalText;
      }
    });
  }
}

// Export for use in other modules
window.NavigationRenderer = NavigationRenderer;
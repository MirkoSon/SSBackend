    return `
      <button 
        class="plugin-card-collapse-btn btn btn-sm btn-outline-secondary"
        aria-label="${label} card"
        aria-expanded="${!this.config.collapsed}"
      >
        <span class="collapse-icon" aria-hidden="true">${icon}</span>
      </button>
    `;
  }

  /**
   * Render card content
   * @returns {String} HTML for card content
   */
  renderCardContent() {
    if (!this.config.content && !this.config.collapsible) {
      return '';
    }

    const contentVisible = !this.config.collapsible || !this.config.collapsed;
    const contentClass = this.config.collapsible ? 'plugin-card-collapsible-content' : 'plugin-card-content';

    return `
      <div class="${contentClass}" ${this.config.collapsible ? `style="display: ${contentVisible ? 'block' : 'none'}"` : ''}>
        ${this.config.content}
      </div>
    `;
  }

  /**
   * Render card footer
   * @returns {String} HTML for card footer
   */
  renderCardFooter() {
    if (!this.config.footer && !this.config.actions.length && !this.config.primaryAction) {
      return '';
    }

    return `
      <div class="plugin-card-footer">
        ${this.config.footer ? `<div class="plugin-card-footer-content">${this.config.footer}</div>` : ''}
        ${this.renderCardActions()}
      </div>
    `;
  }

  /**
   * Render card actions
   * @returns {String} HTML for card actions
   */
  renderCardActions() {
    if (!this.config.actions.length && !this.config.primaryAction) {
      return '';
    }

    let actionsHtml = '';

    // Primary action
    if (this.config.primaryAction) {
      actionsHtml += `
        <button 
          class="btn btn-primary plugin-card-primary-action"
          data-action="primary"
        >
          ${this.config.primaryAction.icon ? `<span aria-hidden="true">${this.config.primaryAction.icon}</span> ` : ''}
          ${this.config.primaryAction.label}
        </button>
      `;
    }

    // Secondary actions
    if (this.config.actions.length > 0) {
      const secondaryActions = this.config.actions.map((action, index) => `
        <button 
          class="btn btn-outline-secondary btn-sm plugin-card-action"
          data-action="${action.action || index}"
          ${action.disabled ? 'disabled' : ''}
          title="${action.tooltip || action.label}"
        >
          ${action.icon ? `<span aria-hidden="true">${action.icon}</span> ` : ''}
          ${action.label}
        </button>
      `).join('');

      actionsHtml += `<div class="plugin-card-secondary-actions">${secondaryActions}</div>`;
    }

    return `<div class="plugin-card-actions">${actionsHtml}</div>`;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Card click handler
    if (this.config.clickable && this.config.onClick) {
      this.element.addEventListener('click', (e) => {
        // Don't trigger card click if clicking on an action button
        if (!e.target.closest('.plugin-card-actions, .plugin-card-collapse-btn')) {
          this.config.onClick(e, this);
        }
      });

      this.element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (!e.target.closest('.plugin-card-actions, .plugin-card-collapse-btn')) {
            e.preventDefault();
            this.config.onClick(e, this);
          }
        }
      });
    }

    // Action button handlers
    this.element.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('.plugin-card-action, .plugin-card-primary-action');
      if (actionBtn) {
        e.stopPropagation();
        const actionType = actionBtn.dataset.action;
        
        if (actionType === 'primary' && this.config.primaryAction) {
          if (this.config.primaryAction.handler) {
            this.config.primaryAction.handler(e, this);
          } else {
            this.config.onActionClick(actionType, this.config.primaryAction, this);
          }
        } else {
          const action = this.config.actions.find(a => (a.action || this.config.actions.indexOf(a).toString()) === actionType);
          if (action && action.handler) {
            action.handler(e, this);
          } else {
            this.config.onActionClick(actionType, action, this);
          }
        }
      }
    });

    // Collapse/expand handler
    if (this.config.collapsible) {
      const collapseBtn = this.element.querySelector('.plugin-card-collapse-btn');
      if (collapseBtn) {
        collapseBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleCollapse();
        });
      }
    }
  }

  /**
   * Toggle card collapse state
   */
  toggleCollapse() {
    this.config.collapsed = !this.config.collapsed;
    
    const content = this.element.querySelector('.plugin-card-collapsible-content');
    const collapseBtn = this.element.querySelector('.plugin-card-collapse-btn');
    const collapseIcon = collapseBtn?.querySelector('.collapse-icon');
    
    if (content) {
      if (this.config.collapsed) {
        content.style.display = 'none';
        this.element.classList.add('plugin-card-collapsed');
      } else {
        content.style.display = 'block';
        this.element.classList.remove('plugin-card-collapsed');
      }
    }
    
    if (collapseIcon) {
      collapseIcon.textContent = this.config.collapsed ? '⯈' : '⯆';
    }
    
    if (collapseBtn) {
      collapseBtn.setAttribute('aria-expanded', !this.config.collapsed);
      collapseBtn.setAttribute('aria-label', `${this.config.collapsed ? 'Expand' : 'Collapse'} card`);
    }
  }

  /**
   * Update card content
   * @param {Object} updates - Updates to apply
   */
  update(updates) {
    Object.assign(this.config, updates);
    this.element.className = this.buildCardClasses();
    this.render();
    this.setupEventListeners();
  }

  /**
   * Set card loading state
   * @param {Boolean} loading - Whether card is loading
   */
  setLoading(loading) {
    if (loading) {
      this.element.classList.add('plugin-card-loading');
      const loadingHtml = `
        <div class="plugin-card-loading-overlay">
          <div class="plugin-card-spinner"></div>
          <span class="sr-only">Loading...</span>
        </div>
      `;
      this.element.insertAdjacentHTML('beforeend', loadingHtml);
    } else {
      this.element.classList.remove('plugin-card-loading');
      const overlay = this.element.querySelector('.plugin-card-loading-overlay');
      if (overlay) {
        overlay.remove();
      }
    }
  }

  /**
   * Set card error state
   * @param {String} message - Error message
   */
  setError(message) {
    this.element.classList.add('plugin-card-error');
    const errorHtml = `
      <div class="plugin-card-error-overlay">
        <div class="plugin-card-error-content">
          <span class="error-icon" aria-hidden="true">⚠️</span>
          <p class="error-message">${message}</p>
          <button class="btn btn-sm btn-outline-secondary retry-btn">
            Retry
          </button>
        </div>
      </div>
    `;
    this.element.insertAdjacentHTML('beforeend', errorHtml);
    
    // Add retry handler
    const retryBtn = this.element.querySelector('.retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.clearError();
        if (this.config.onRetry) {
          this.config.onRetry(this);
        }
      });
    }
  }

  /**
   * Clear error state
   */
  clearError() {
    this.element.classList.remove('plugin-card-error');
    const overlay = this.element.querySelector('.plugin-card-error-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  /**
   * Get card data
   * @returns {Object} Card configuration and state
   */
  getData() {
    return {
      config: { ...this.config },
      collapsed: this.config.collapsed,
      loading: this.element.classList.contains('plugin-card-loading'),
      error: this.element.classList.contains('plugin-card-error')
    };
  }

  /**
   * Destroy the card and clean up
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

// Make available globally
window.PluginCard = PluginCard;

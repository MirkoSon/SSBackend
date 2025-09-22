/**
 * PluginModal - Modal dialog component for plugin UIs
 * Provides accessible modal dialogs with consistent styling
 */
class PluginModal {
  constructor(config) {
    this.config = this.validateConfig(config);
    this.element = null;
    this.backdrop = null;
    this.isVisible = false;
    
    this.init();
  }

  /**
   * Validate and set default configuration
   * @param {Object} config - Modal configuration
   * @returns {Object} Validated configuration
   */
  validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('PluginModal configuration is required');
    }

    return {
      // Modal content
      title: config.title || '',
      content: config.content || '',
      footer: config.footer || '',
      
      // Modal behavior
      size: config.size || 'medium', // small, medium, large, fullscreen
      closable: config.closable !== false,
      closeOnBackdrop: config.closeOnBackdrop !== false,
      closeOnEscape: config.closeOnEscape !== false,
      
      // Event handlers
      onShow: typeof config.onShow === 'function' ? config.onShow : () => {},
      onHide: typeof config.onHide === 'function' ? config.onHide : () => {},
      onClose: typeof config.onClose === 'function' ? config.onClose : () => {},
      
      // Actions
      actions: Array.isArray(config.actions) ? config.actions : [],
      primaryAction: config.primaryAction || null,
      
      // Styling
      className: config.className || '',
      variant: config.variant || 'default', // default, danger, warning, info
      
      // Accessibility
      ariaLabel: config.ariaLabel || config.title || 'Modal dialog',
      ariaDescribedBy: config.ariaDescribedBy || '',
      
      // Animation
      animate: config.animate !== false,
      animationDuration: config.animationDuration || 300,
      
      // Auto show
      autoShow: config.autoShow === true
    };
  }

  /**
   * Initialize the modal component
   */
  init() {
    this.createElement();
    this.createBackdrop();
    this.render();
    this.setupEventListeners();
    
    if (this.config.autoShow) {
      this.show();
    }
  }

  /**
   * Create the modal DOM element
   */
  createElement() {
    this.element = document.createElement('div');
    this.element.className = this.buildModalClasses();
    this.element.style.display = 'none';
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-label', this.config.ariaLabel);
    
    if (this.config.ariaDescribedBy) {
      this.element.setAttribute('aria-describedby', this.config.ariaDescribedBy);
    }
    
    // Make modal focusable
    this.element.setAttribute('tabindex', '-1');
  }

  /**
   * Create the backdrop element
   */
  createBackdrop() {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'plugin-modal-backdrop';
    this.backdrop.style.display = 'none';
    
    if (this.config.animate) {
      this.backdrop.style.transition = `opacity ${this.config.animationDuration}ms ease`;
    }
  }

  /**
   * Build CSS classes for the modal
   * @returns {String} CSS class string
   */
  buildModalClasses() {
    const classes = [
      'plugin-modal',
      `plugin-modal-${this.config.size}`,
      `plugin-modal-${this.config.variant}`
    ];
    
    if (this.config.animate) {
      classes.push('plugin-modal-animated');
    }
    
    if (this.config.className) {
      classes.push(this.config.className);
    }
    
    return classes.join(' ');
  }

  /**
   * Render the modal
   */
  render() {
    const html = `
      <div class="plugin-modal-dialog">
        <div class="plugin-modal-content">
          ${this.renderModalHeader()}
          ${this.renderModalBody()}
          ${this.renderModalFooter()}
        </div>
      </div>
    `;
    
    this.element.innerHTML = html;
    
    // Append to body
    document.body.appendChild(this.backdrop);
    document.body.appendChild(this.element);
  }

  /**
   * Render modal header
   * @returns {String} HTML for modal header
   */
  renderModalHeader() {
    if (!this.config.title && !this.config.closable) {
      return '';
    }

    return `
      <div class="plugin-modal-header">
        ${this.config.title ? `<h2 class="plugin-modal-title">${this.config.title}</h2>` : ''}
        ${this.config.closable ? this.renderCloseButton() : ''}
      </div>
    `;
  }

  /**
   * Render close button
   * @returns {String} HTML for close button
   */
  renderCloseButton() {
    return `
      <button 
        class="plugin-modal-close btn btn-close"
        aria-label="Close modal"
        title="Close"
      >
        <span aria-hidden="true">&times;</span>
      </button>
    `;
  }

  /**
   * Render modal body
   * @returns {String} HTML for modal body
   */
  renderModalBody() {
    return `
      <div class="plugin-modal-body">
        ${this.config.content}
      </div>
    `;
  }

  /**
   * Render modal footer
   * @returns {String} HTML for modal footer
   */
  renderModalFooter() {
    if (!this.config.footer && !this.config.actions.length && !this.config.primaryAction) {
      return '';
    }

    return `
      <div class="plugin-modal-footer">
        ${this.config.footer ? `<div class="plugin-modal-footer-content">${this.config.footer}</div>` : ''}
        ${this.renderModalActions()}
      </div>
    `;
  }

  /**
   * Render modal actions
   * @returns {String} HTML for modal actions
   */
  renderModalActions() {
    if (!this.config.actions.length && !this.config.primaryAction) {
      return '';
    }

    let actionsHtml = '';

    // Secondary actions (left-aligned)
    if (this.config.actions.length > 0) {
      const secondaryActions = this.config.actions.map((action, index) => `
        <button 
          class="btn ${action.variant ? `btn-${action.variant}` : 'btn-outline-secondary'} plugin-modal-action"
          data-action="${action.action || index}"
          ${action.disabled ? 'disabled' : ''}
        >
          ${action.icon ? `<span aria-hidden="true">${action.icon}</span> ` : ''}
          ${action.label}
        </button>
      `).join('');

      actionsHtml += `<div class="plugin-modal-secondary-actions">${secondaryActions}</div>`;
    }

    // Primary action (right-aligned)
    if (this.config.primaryAction) {
      actionsHtml += `
        <div class="plugin-modal-primary-actions">
          <button 
            class="btn btn-primary plugin-modal-primary-action"
            data-action="primary"
          >
            ${this.config.primaryAction.icon ? `<span aria-hidden="true">${this.config.primaryAction.icon}</span> ` : ''}
            ${this.config.primaryAction.label}
          </button>
        </div>
      `;
    }

    return `<div class="plugin-modal-actions">${actionsHtml}</div>`;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Close button
    if (this.config.closable) {
      const closeBtn = this.element.querySelector('.plugin-modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.hide();
        });
      }
    }

    // Backdrop click
    if (this.config.closeOnBackdrop) {
      this.backdrop.addEventListener('click', () => {
        this.hide();
      });

      // Don't close when clicking inside modal
      const modalDialog = this.element.querySelector('.plugin-modal-dialog');
      if (modalDialog) {
        modalDialog.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }
    }

    // Escape key
    if (this.config.closeOnEscape) {
      document.addEventListener('keydown', this.handleEscapeKey.bind(this));
    }

    // Action buttons
    this.element.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('.plugin-modal-action, .plugin-modal-primary-action');
      if (actionBtn) {
        const actionType = actionBtn.dataset.action;
        
        if (actionType === 'primary' && this.config.primaryAction) {
          if (this.config.primaryAction.handler) {
            const result = this.config.primaryAction.handler(e, this);
            // Auto-close unless handler returns false
            if (result !== false && this.config.primaryAction.autoClose !== false) {
              this.hide();
            }
          }
        } else {
          const action = this.config.actions.find(a => (a.action || this.config.actions.indexOf(a).toString()) === actionType);
          if (action && action.handler) {
            const result = action.handler(e, this);
            // Auto-close unless handler returns false
            if (result !== false && action.autoClose !== false) {
              this.hide();
            }
          }
        }
      }
    });

    // Focus trap
    this.element.addEventListener('keydown', this.handleFocusTrap.bind(this));
  }

  /**
   * Handle escape key press
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleEscapeKey(e) {
    if (e.key === 'Escape' && this.isVisible) {
      this.hide();
    }
  }

  /**
   * Handle focus trap within modal
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleFocusTrap(e) {
    if (e.key !== 'Tab') return;

    const focusableElements = this.element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }

  /**
   * Show the modal
   */
  show() {
    if (this.isVisible) return;

    // Store previously focused element
    this.previousActiveElement = document.activeElement;

    // Show backdrop and modal
    this.backdrop.style.display = 'block';
    this.element.style.display = 'flex';
    
    // Add body class to prevent scrolling
    document.body.classList.add('plugin-modal-open');

    if (this.config.animate) {
      // Trigger animation
      setTimeout(() => {
        this.backdrop.classList.add('show');
        this.element.classList.add('show');
      }, 10);
    } else {
      this.backdrop.classList.add('show');
      this.element.classList.add('show');
    }

    this.isVisible = true;

    // Focus modal
    setTimeout(() => {
      this.element.focus();
    }, this.config.animate ? this.config.animationDuration : 10);

    // Trigger show event
    this.config.onShow(this);
  }

  /**
   * Hide the modal
   */
  hide() {
    if (!this.isVisible) return;

    const performHide = () => {
      this.backdrop.style.display = 'none';
      this.element.style.display = 'none';
      this.backdrop.classList.remove('show');
      this.element.classList.remove('show');
      
      // Remove body class
      document.body.classList.remove('plugin-modal-open');

      this.isVisible = false;

      // Restore focus
      if (this.previousActiveElement && this.previousActiveElement.focus) {
        this.previousActiveElement.focus();
      }

      // Trigger hide event
      this.config.onHide(this);
    };

    if (this.config.animate) {
      this.backdrop.classList.remove('show');
      this.element.classList.remove('show');
      setTimeout(performHide, this.config.animationDuration);
    } else {
      performHide();
    }
  }

  /**
   * Toggle modal visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Update modal content
   * @param {Object} updates - Updates to apply
   */
  update(updates) {
    Object.assign(this.config, updates);
    this.element.className = this.buildModalClasses();
    this.render();
    this.setupEventListeners();
  }

  /**
   * Set modal loading state
   * @param {Boolean} loading - Whether modal is loading
   */
  setLoading(loading) {
    const body = this.element.querySelector('.plugin-modal-body');
    const actions = this.element.querySelector('.plugin-modal-actions');
    
    if (loading) {
      body.classList.add('loading');
      if (actions) actions.style.pointerEvents = 'none';
      
      const loadingHtml = `
        <div class="plugin-modal-loading-overlay">
          <div class="plugin-modal-spinner"></div>
          <span class="sr-only">Loading...</span>
        </div>
      `;
      body.insertAdjacentHTML('beforeend', loadingHtml);
    } else {
      body.classList.remove('loading');
      if (actions) actions.style.pointerEvents = '';
      
      const overlay = body.querySelector('.plugin-modal-loading-overlay');
      if (overlay) overlay.remove();
    }
  }

  /**
   * Check if modal is visible
   * @returns {Boolean} Visibility state
   */
  isOpen() {
    return this.isVisible;
  }

  /**
   * Destroy the modal and clean up
   */
  destroy() {
    // Remove event listeners
    document.removeEventListener('keydown', this.handleEscapeKey);
    
    // Hide modal first
    if (this.isVisible) {
      this.hide();
    }
    
    // Remove from DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    if (this.backdrop && this.backdrop.parentNode) {
      this.backdrop.parentNode.removeChild(this.backdrop);
    }
    
    // Trigger close event
    this.config.onClose(this);
    
    this.element = null;
    this.backdrop = null;
  }
}

// Static methods for common modal types
PluginModal.alert = function(message, title = 'Alert') {
  return new PluginModal({
    title,
    content: message,
    variant: 'info',
    primaryAction: {
      label: 'OK',
      handler: () => true // Auto-close
    },
    autoShow: true
  });
};

PluginModal.confirm = function(message, title = 'Confirm') {
  return new Promise((resolve) => {
    new PluginModal({
      title,
      content: message,
      variant: 'warning',
      actions: [
        {
          label: 'Cancel',
          variant: 'outline-secondary',
          handler: () => {
            resolve(false);
            return true; // Auto-close
          }
        }
      ],
      primaryAction: {
        label: 'OK',
        handler: () => {
          resolve(true);
          return true; // Auto-close
        }
      },
      autoShow: true
    });
  });
};

PluginModal.prompt = function(message, defaultValue = '', title = 'Input') {
  return new Promise((resolve) => {
    const inputId = 'modal-prompt-' + Date.now();
    new PluginModal({
      title,
      content: `
        <p>${message}</p>
        <input type="text" id="${inputId}" class="form-control" value="${defaultValue}" placeholder="Enter value...">
      `,
      actions: [
        {
          label: 'Cancel',
          variant: 'outline-secondary',
          handler: () => {
            resolve(null);
            return true; // Auto-close
          }
        }
      ],
      primaryAction: {
        label: 'OK',
        handler: () => {
          const input = document.getElementById(inputId);
          resolve(input ? input.value : '');
          return true; // Auto-close
        }
      },
      onShow: () => {
        // Focus input when modal is shown
        setTimeout(() => {
          const input = document.getElementById(inputId);
          if (input) {
            input.focus();
            input.select();
          }
        }, 100);
      },
      autoShow: true
    });
  });
};

// Make available globally
window.PluginModal = PluginModal;

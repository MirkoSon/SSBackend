    } else if (this.config.size === 'large') {
      classes.push('btn-lg');
    }
    
    // Block button
    if (this.config.block) {
      classes.push('btn-block');
    }
    
    // Toggle state
    if (this.config.toggle && this.config.active) {
      classes.push('active');
    }
    
    // Loading state
    if (this.config.loading) {
      classes.push('plugin-button-loading');
    }
    
    // Custom classes
    if (this.config.className) {
      classes.push(this.config.className);
    }
    
    return classes.join(' ');
  }

  /**
   * Render the button content
   */
  render() {
    this.element.innerHTML = this.renderButtonContent();
    
    // Add to container if specified
    if (this.config.container) {
      if (typeof this.config.container === 'string') {
        const container = document.querySelector(this.config.container);
        if (container) {
          container.appendChild(this.element);
        }
      } else if (this.config.container.appendChild) {
        this.config.container.appendChild(this.element);
      }
    }
  }

  /**
   * Render button content with icon and label
   * @returns {String} HTML for button content
   */
  renderButtonContent() {
    if (this.config.loading) {
      return this.renderLoadingContent();
    }
    
    const hasIcon = this.config.icon && this.config.iconPosition !== 'none';
    const hasLabel = this.config.label && this.config.iconPosition !== 'only';
    
    if (!hasIcon && !hasLabel) {
      return 'Button';
    }
    
    if (hasIcon && !hasLabel) {
      // Icon only
      return `<span class="button-icon" aria-hidden="true">${this.config.icon}</span>`;
    }
    
    if (!hasIcon && hasLabel) {
      // Label only
      return this.config.label;
    }
    
    // Icon and label
    const icon = `<span class="button-icon" aria-hidden="true">${this.config.icon}</span>`;
    const label = `<span class="button-label">${this.config.label}</span>`;
    
    if (this.config.iconPosition === 'right') {
      return `${label} ${icon}`;
    } else {
      return `${icon} ${label}`;
    }
  }

  /**
   * Render loading content
   * @returns {String} HTML for loading state
   */
  renderLoadingContent() {
    const spinner = '<span class="plugin-button-spinner" aria-hidden="true"></span>';
    const loadingText = '<span class="sr-only">Loading...</span>';
    
    if (this.config.iconPosition === 'only') {
      return `${spinner}${loadingText}`;
    }
    
    return `${spinner} <span class="button-label">Loading...</span>${loadingText}`;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.element.addEventListener('click', (e) => {
      if (this.config.disabled || this.config.loading) {
        e.preventDefault();
        return;
      }
      
      // Handle toggle behavior
      if (this.config.toggle) {
        this.toggle();
      }
      
      // Call onClick handler
      this.config.onClick(e, this);
    });
  }

  /**
   * Toggle button active state
   */
  toggle() {
    this.config.active = !this.config.active;
    this.element.setAttribute('aria-pressed', this.config.active.toString());
    
    if (this.config.active) {
      this.element.classList.add('active');
    } else {
      this.element.classList.remove('active');
    }
  }

  /**
   * Set button loading state
   * @param {Boolean} loading - Whether button is loading
   */
  setLoading(loading) {
    this.config.loading = loading;
    
    if (loading) {
      this.element.classList.add('plugin-button-loading');
      this.element.disabled = true;
    } else {
      this.element.classList.remove('plugin-button-loading');
      this.element.disabled = this.config.disabled;
    }
    
    this.render();
  }

  /**
   * Set button disabled state
   * @param {Boolean} disabled - Whether button is disabled
   */
  setDisabled(disabled) {
    this.config.disabled = disabled;
    this.element.disabled = disabled || this.config.loading;
    
    if (disabled) {
      this.element.classList.add('disabled');
    } else {
      this.element.classList.remove('disabled');
    }
  }

  /**
   * Set button active state (for toggle buttons)
   * @param {Boolean} active - Whether button is active
   */
  setActive(active) {
    if (this.config.toggle) {
      this.config.active = active;
      this.element.setAttribute('aria-pressed', active.toString());
      
      if (active) {
        this.element.classList.add('active');
      } else {
        this.element.classList.remove('active');
      }
    }
  }

  /**
   * Update button configuration
   * @param {Object} updates - Updates to apply
   */
  update(updates) {
    Object.assign(this.config, updates);
    this.element.className = this.buildButtonClasses();
    this.render();
  }

  /**
   * Focus the button
   */
  focus() {
    this.element.focus();
  }

  /**
   * Blur the button
   */
  blur() {
    this.element.blur();
  }

  /**
   * Get button state
   * @returns {Object} Button state
   */
  getState() {
    return {
      disabled: this.config.disabled,
      loading: this.config.loading,
      active: this.config.active,
      focused: document.activeElement === this.element
    };
  }

  /**
   * Destroy the button and clean up
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

// Make available globally
window.PluginButton = PluginButton;

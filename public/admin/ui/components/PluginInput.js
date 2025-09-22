/**
 * PluginInput - Standardized input component for plugin UIs
 * Provides consistent form controls with validation and accessibility
 */
class PluginInput {
  constructor(config) {
    this.config = this.validateConfig(config);
    this.element = null;
    this.wrapper = null;
    this.value = this.config.value;
    this.isValid = true;
    this.errors = [];
    
    this.init();
  }

  /**
   * Validate and set default configuration
   * @param {Object} config - Input configuration
   * @returns {Object} Validated configuration
   */
  validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('PluginInput configuration is required');
    }

    return {
      // Input properties
      type: config.type || 'text', // text, email, password, number, tel, url, search, date, etc.
      name: config.name || '',
      id: config.id || this.generateId(),
      value: config.value || '',
      placeholder: config.placeholder || '',
      
      // Labels and descriptions
      label: config.label || '',
      description: config.description || '',
      errorMessage: config.errorMessage || '',
      
      // Validation
      required: config.required === true,
      minLength: config.minLength || null,
      maxLength: config.maxLength || null,
      min: config.min || null,
      max: config.max || null,
      pattern: config.pattern || null,
      validators: Array.isArray(config.validators) ? config.validators : [],
      
      // Behavior
      disabled: config.disabled === true,
      readonly: config.readonly === true,
      autocomplete: config.autocomplete || '',
      
      // Event handlers
      onChange: typeof config.onChange === 'function' ? config.onChange : () => {},
      onInput: typeof config.onInput === 'function' ? config.onInput : () => {},
      onFocus: typeof config.onFocus === 'function' ? config.onFocus : () => {},
      onBlur: typeof config.onBlur === 'function' ? config.onBlur : () => {},
      
      // Styling
      size: config.size || 'medium', // small, medium, large
      className: config.className || '',
      variant: config.variant || 'default', // default, success, warning, danger
      
      // Container
      container: config.container || null,
      
      // Accessibility
      ariaLabel: config.ariaLabel || config.label,
      ariaDescribedBy: config.ariaDescribedBy || '',
      
      // Special input types
      options: Array.isArray(config.options) ? config.options : [], // For select inputs
      multiple: config.multiple === true, // For select inputs
      
      // Validation behavior
      validateOnChange: config.validateOnChange !== false,
      validateOnBlur: config.validateOnBlur !== false,
      
      // Icons and addons
      icon: config.icon || '',
      iconPosition: config.iconPosition || 'left', // left, right
      prefix: config.prefix || '',
      suffix: config.suffix || ''
    };
  }

  /**
   * Generate unique ID
   * @returns {String} Unique ID
   */
  generateId() {
    return 'plugin_input_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Initialize the input component
   */
  init() {
    this.createElement();
    this.render();
    this.setupEventListeners();
  }

  /**
   * Create the input wrapper and element
   */
  createElement() {
    this.wrapper = document.createElement('div');
    this.wrapper.className = this.buildWrapperClasses();
    
    // Create the appropriate input element
    this.element = this.createInputElement();
  }

  /**
   * Create the appropriate input element based on type
   * @returns {HTMLElement} Input element
   */
  createInputElement() {
    let element;
    
    if (this.config.type === 'select') {
      element = document.createElement('select');
    } else if (this.config.type === 'textarea') {
      element = document.createElement('textarea');
    } else {
      element = document.createElement('input');
      element.type = this.config.type;
    }
    
    // Set basic attributes
    element.className = this.buildInputClasses();
    element.id = this.config.id;
    element.name = this.config.name;
    element.value = this.config.value;
    
    if (this.config.placeholder) {
      element.placeholder = this.config.placeholder;
    }
    
    if (this.config.required) {
      element.required = true;
      element.setAttribute('aria-required', 'true');
    }
    
    if (this.config.disabled) {
      element.disabled = true;
    }
    
    if (this.config.readonly) {
      element.readOnly = true;
    }
    
    if (this.config.autocomplete) {
      element.autocomplete = this.config.autocomplete;
    }
    
    if (this.config.ariaLabel) {
      element.setAttribute('aria-label', this.config.ariaLabel);
    }
    
    // Validation attributes
    if (this.config.minLength !== null) {
      element.minLength = this.config.minLength;
    }
    
    if (this.config.maxLength !== null) {
      element.maxLength = this.config.maxLength;
    }
    
    if (this.config.min !== null) {
      element.min = this.config.min;
    }
    
    if (this.config.max !== null) {
      element.max = this.config.max;
    }
    
    if (this.config.pattern) {
      element.pattern = this.config.pattern;
    }
    
    // Special handling for select elements
    if (this.config.type === 'select') {
      if (this.config.multiple) {
        element.multiple = true;
      }
    }
    
    return element;
  }

  /**
   * Build CSS classes for wrapper
   * @returns {String} CSS class string
   */
  buildWrapperClasses() {
    const classes = [
      'plugin-input-wrapper',
      `plugin-input-${this.config.size}`,
      `plugin-input-${this.config.variant}`
    ];
    
    if (this.config.disabled) {
      classes.push('plugin-input-disabled');
    }
    
    if (this.config.readonly) {
      classes.push('plugin-input-readonly');
    }
    
    if (!this.isValid) {
      classes.push('plugin-input-invalid');
    }
    
    if (this.config.icon) {
      classes.push(`plugin-input-with-icon-${this.config.iconPosition}`);
    }
    
    if (this.config.prefix || this.config.suffix) {
      classes.push('plugin-input-with-addon');
    }
    
    if (this.config.className) {
      classes.push(this.config.className);
    }
    
    return classes.join(' ');
  }

  /**
   * Build CSS classes for input element
   * @returns {String} CSS class string
   */
  buildInputClasses() {
    const classes = ['form-control', 'plugin-input'];
    
    if (this.config.size === 'small') {
      classes.push('form-control-sm');
    } else if (this.config.size === 'large') {
      classes.push('form-control-lg');
    }
    
    return classes.join(' ');
  }

  /**
   * Render the input component
   */
  render() {
    const html = `
      ${this.renderLabel()}
      <div class="plugin-input-group">
        ${this.renderPrefix()}
        ${this.renderIcon()}
        ${this.renderInputElement()}
        ${this.renderSuffix()}
      </div>
      ${this.renderDescription()}
      ${this.renderErrors()}
    `;
    
    this.wrapper.innerHTML = html;
    
    // Replace placeholder input with actual element
    const placeholder = this.wrapper.querySelector('.plugin-input-placeholder');
    if (placeholder) {
      placeholder.parentNode.replaceChild(this.element, placeholder);
    }
    
    // Add to container if specified
    if (this.config.container) {
      if (typeof this.config.container === 'string') {
        const container = document.querySelector(this.config.container);
        if (container) {
          container.appendChild(this.wrapper);
        }
      } else if (this.config.container.appendChild) {
        this.config.container.appendChild(this.wrapper);
      }
    }
  }

  /**
   * Render label
   * @returns {String} HTML for label
   */
  renderLabel() {
    if (!this.config.label) {
      return '';
    }

    return `
      <label class="plugin-input-label" for="${this.config.id}">
        ${this.config.label}
        ${this.config.required ? '<span class="required-indicator" aria-label="required">*</span>' : ''}
      </label>
    `;
  }

  /**
   * Render input element placeholder (will be replaced with actual element)
   * @returns {String} HTML placeholder
   */
  renderInputElement() {
    if (this.config.type === 'select') {
      const options = this.config.options.map(option => {
        const value = typeof option === 'object' ? option.value : option;
        const label = typeof option === 'object' ? option.label : option;
        const selected = this.config.value === value ? 'selected' : '';
        const disabled = (typeof option === 'object' && option.disabled) ? 'disabled' : '';
        
        return `<option value="${value}" ${selected} ${disabled}>${label}</option>`;
      }).join('');
      
      return `<div class="plugin-input-placeholder">${options}</div>`;
    }
    
    return '<div class="plugin-input-placeholder"></div>';
  }

  /**
   * Render prefix addon
   * @returns {String} HTML for prefix
   */
  renderPrefix() {
    if (!this.config.prefix) {
      return '';
    }

    return `
      <div class="plugin-input-addon plugin-input-prefix">
        ${this.config.prefix}
      </div>
    `;
  }

  /**
   * Render suffix addon
   * @returns {String} HTML for suffix
   */
  renderSuffix() {
    if (!this.config.suffix) {
      return '';
    }

    return `
      <div class="plugin-input-addon plugin-input-suffix">
        ${this.config.suffix}
      </div>
    `;
  }

  /**
   * Render icon
   * @returns {String} HTML for icon
   */
  renderIcon() {
    if (!this.config.icon) {
      return '';
    }

    return `
      <span class="plugin-input-icon plugin-input-icon-${this.config.iconPosition}" aria-hidden="true">
        ${this.config.icon}
      </span>
    `;
  }

  /**
   * Render description
   * @returns {String} HTML for description
   */
  renderDescription() {
    if (!this.config.description) {
      return '';
    }

    const descId = `${this.config.id}_desc`;
    this.element.setAttribute('aria-describedby', descId);

    return `
      <div class="plugin-input-description" id="${descId}">
        ${this.config.description}
      </div>
    `;
  }

  /**
   * Render error messages
   * @returns {String} HTML for errors
   */
  renderErrors() {
    if (!this.errors.length) {
      return '';
    }

    const errorId = `${this.config.id}_error`;
    const currentDescribedBy = this.element.getAttribute('aria-describedby') || '';
    this.element.setAttribute('aria-describedby', `${currentDescribedBy} ${errorId}`.trim());

    const errorList = this.errors.map(error => `<li>${error}</li>`).join('');

    return `
      <div class="plugin-input-errors" id="${errorId}" role="alert">
        <ul class="error-list">
          ${errorList}
        </ul>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Input events
    this.element.addEventListener('input', (e) => {
      this.value = e.target.value;
      
      if (this.config.validateOnChange) {
        this.validate();
      }
      
      this.config.onInput(e, this);
    });

    this.element.addEventListener('change', (e) => {
      this.value = e.target.value;
      
      if (this.config.validateOnChange) {
        this.validate();
      }
      
      this.config.onChange(e, this);
    });

    this.element.addEventListener('focus', (e) => {
      this.wrapper.classList.add('plugin-input-focused');
      this.config.onFocus(e, this);
    });

    this.element.addEventListener('blur', (e) => {
      this.wrapper.classList.remove('plugin-input-focused');
      
      if (this.config.validateOnBlur) {
        this.validate();
      }
      
      this.config.onBlur(e, this);
    });
  }

  /**
   * Validate the input
   * @returns {Boolean} Whether input is valid
   */
  validate() {
    this.errors = [];
    this.isValid = true;

    const value = this.element.value;

    // Required validation
    if (this.config.required && !value.trim()) {
      this.errors.push('This field is required');
      this.isValid = false;
    }

    // Length validations
    if (value && this.config.minLength !== null && value.length < this.config.minLength) {
      this.errors.push(`Minimum length is ${this.config.minLength} characters`);
      this.isValid = false;
    }

    if (value && this.config.maxLength !== null && value.length > this.config.maxLength) {
      this.errors.push(`Maximum length is ${this.config.maxLength} characters`);
      this.isValid = false;
    }

    // Number validations
    if (this.config.type === 'number' && value) {
      const numValue = parseFloat(value);
      
      if (this.config.min !== null && numValue < this.config.min) {
        this.errors.push(`Minimum value is ${this.config.min}`);
        this.isValid = false;
      }
      
      if (this.config.max !== null && numValue > this.config.max) {
        this.errors.push(`Maximum value is ${this.config.max}`);
        this.isValid = false;
      }
    }

    // Pattern validation
    if (value && this.config.pattern) {
      const regex = new RegExp(this.config.pattern);
      if (!regex.test(value)) {
        this.errors.push('Invalid format');
        this.isValid = false;
      }
    }

    // Custom validators
    if (value && this.config.validators.length > 0) {
      for (const validator of this.config.validators) {
        const result = validator(value);
        if (result !== true) {
          this.errors.push(typeof result === 'string' ? result : 'Invalid value');
          this.isValid = false;
        }
      }
    }

    // Update UI
    this.updateValidationState();
    
    return this.isValid;
  }

  /**
   * Update validation state in UI
   */
  updateValidationState() {
    if (this.isValid) {
      this.wrapper.classList.remove('plugin-input-invalid');
      this.wrapper.classList.add('plugin-input-valid');
      this.element.removeAttribute('aria-invalid');
    } else {
      this.wrapper.classList.remove('plugin-input-valid');
      this.wrapper.classList.add('plugin-input-invalid');
      this.element.setAttribute('aria-invalid', 'true');
    }

    // Re-render to update error display
    const currentValue = this.element.value;
    this.render();
    this.element.value = currentValue; // Preserve value after re-render
  }

  /**
   * Get input value
   * @returns {String|Array} Input value
   */
  getValue() {
    if (this.config.type === 'select' && this.config.multiple) {
      return Array.from(this.element.selectedOptions).map(option => option.value);
    }
    return this.element.value;
  }

  /**
   * Set input value
   * @param {String|Array} value - Value to set
   */
  setValue(value) {
    if (this.config.type === 'select' && this.config.multiple && Array.isArray(value)) {
      Array.from(this.element.options).forEach(option => {
        option.selected = value.includes(option.value);
      });
    } else {
      this.element.value = value;
    }
    
    this.value = value;
    
    if (this.config.validateOnChange) {
      this.validate();
    }
  }

  /**
   * Set input disabled state
   * @param {Boolean} disabled - Whether input is disabled
   */
  setDisabled(disabled) {
    this.config.disabled = disabled;
    this.element.disabled = disabled;
    
    if (disabled) {
      this.wrapper.classList.add('plugin-input-disabled');
    } else {
      this.wrapper.classList.remove('plugin-input-disabled');
    }
  }

  /**
   * Set custom error message
   * @param {String|Array} message - Error message(s)
   */
  setError(message) {
    this.errors = Array.isArray(message) ? message : [message];
    this.isValid = false;
    this.updateValidationState();
  }

  /**
   * Clear errors
   */
  clearErrors() {
    this.errors = [];
    this.isValid = true;
    this.updateValidationState();
  }

  /**
   * Focus the input
   */
  focus() {
    this.element.focus();
  }

  /**
   * Blur the input
   */
  blur() {
    this.element.blur();
  }

  /**
   * Check if input is valid
   * @returns {Boolean} Validation state
   */
  isValidInput() {
    return this.isValid;
  }

  /**
   * Get validation errors
   * @returns {Array} Array of error messages
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Update input configuration
   * @param {Object} updates - Updates to apply
   */
  update(updates) {
    Object.assign(this.config, updates);
    this.wrapper.className = this.buildWrapperClasses();
    this.render();
    this.setupEventListeners();
  }

  /**
   * Destroy the input and clean up
   */
  destroy() {
    if (this.wrapper && this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
    this.wrapper = null;
    this.element = null;
  }
}

// Make available globally
window.PluginInput = PluginInput;

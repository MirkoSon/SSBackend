/**
 * PluginForm - Standardized form component for plugin UIs
 * Provides validation, consistent styling, and accessibility
 */
class PluginForm {
  constructor(config) {
    this.config = this.validateConfig(config);
    this.element = null;
    this.formData = {};
    this.errors = {};
    this.touched = {};
    
    this.init();
  }

  /**
   * Validate and set default configuration
   * @param {Object} config - Form configuration
   * @returns {Object} Validated configuration
   */
  validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('PluginForm configuration is required');
    }

    return {
      // Form fields configuration
      fields: Array.isArray(config.fields) ? config.fields : [],
      
      // Event handlers
      onSubmit: typeof config.onSubmit === 'function' ? config.onSubmit : () => {},
      onFieldChange: typeof config.onFieldChange === 'function' ? config.onFieldChange : () => {},
      onValidation: typeof config.onValidation === 'function' ? config.onValidation : null,
      
      // Form behavior
      validateOnChange: config.validateOnChange !== false,
      showRequiredIndicator: config.showRequiredIndicator !== false,
      
      // Initial data
      initialData: config.initialData || {},
      
      // Styling
      className: config.className || '',
      layout: config.layout || 'vertical', // vertical, horizontal, inline
      
      // Submit button configuration
      submitText: config.submitText || 'Submit',
      submitClass: config.submitClass || 'btn-primary',
      showSubmitButton: config.showSubmitButton !== false,
      
      // Accessibility
      ariaLabel: config.ariaLabel || 'Plugin form',
      
      // Container element
      container: config.container || document.body
    };
  }

  /**
   * Initialize the form component
   */
  init() {
    this.createElement();
    this.initializeFormData();
    this.render();
    this.setupEventListeners();
  }

  /**
   * Create the form DOM element
   */
  createElement() {
    this.element = document.createElement('form');
    this.element.className = `plugin-form plugin-form-${this.config.layout} ${this.config.className}`;
    this.element.setAttribute('aria-label', this.config.ariaLabel);
    this.element.setAttribute('novalidate', 'true'); // Use custom validation
  }

  /**
   * Initialize form data with default values
   */
  initializeFormData() {
    this.formData = { ...this.config.initialData };
    
    // Set default values from field configuration
    this.config.fields.forEach(field => {
      if (field.defaultValue !== undefined && this.formData[field.name] === undefined) {
        this.formData[field.name] = field.defaultValue;
      }
    });
  }

  /**
   * Render the complete form
   */
  render() {
    const fieldsHtml = this.config.fields.map(field => this.renderField(field)).join('');
    
    const html = `
      <div class="plugin-form-fields">
        ${fieldsHtml}
      </div>
      ${this.config.showSubmitButton ? this.renderSubmitSection() : ''}
    `;
    
    this.element.innerHTML = html;
    
    // Apply to container
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
   * Render a single form field
   * @param {Object} field - Field configuration
   * @returns {String} HTML for the field
   */
  renderField(field) {
    const fieldId = `field-${field.name}`;
    const value = this.formData[field.name] || '';
    const error = this.errors[field.name];
    const hasError = !!error;
    
    const fieldClasses = [
      'plugin-form-field',
      `field-type-${field.type}`,
      hasError ? 'has-error' : '',
      this.touched[field.name] ? 'touched' : ''
    ].filter(Boolean).join(' ');

    const labelHtml = field.label ? `
      <label for="${fieldId}" class="plugin-form-label">
        ${field.label}
        ${field.required && this.config.showRequiredIndicator ? '<span class="required-indicator">*</span>' : ''}
      </label>
    ` : '';

    const helpHtml = field.help ? `
      <div class="plugin-form-help" id="${fieldId}-help">
        ${field.help}
      </div>
    ` : '';

    const errorHtml = hasError ? `
      <div class="plugin-form-error" id="${fieldId}-error" role="alert">
        ${error}
      </div>
    ` : '';

    return `
      <div class="${fieldClasses}">
        ${labelHtml}
        ${this.renderFieldInput(field, fieldId, value)}
        ${helpHtml}
        ${errorHtml}
      </div>
    `;
  }

  /**
   * Render the input element for a field
   * @param {Object} field - Field configuration
   * @param {String} fieldId - Field ID
   * @param {*} value - Current value
   * @returns {String} HTML for the input
   */
  renderFieldInput(field, fieldId, value) {
    const commonAttrs = {
      id: fieldId,
      name: field.name,
      class: `plugin-form-input form-control ${field.className || ''}`,
      'aria-describedby': this.getAriaDescribedBy(field, fieldId),
      'aria-invalid': !!this.errors[field.name]
    };

    if (field.required) {
      commonAttrs['aria-required'] = 'true';
    }

    if (field.placeholder) {
      commonAttrs.placeholder = field.placeholder;
    }

    const attrsString = Object.entries(commonAttrs)
      .map(([key, val]) => `${key}="${val}"`)
      .join(' ');

    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'url':
      case 'tel':
        return `<input type="${field.type}" value="${this.escapeHtml(value)}" ${attrsString} />`;
      
      case 'number':
        const numberAttrs = [];
        if (field.min !== undefined) numberAttrs.push(`min="${field.min}"`);
        if (field.max !== undefined) numberAttrs.push(`max="${field.max}"`);
        if (field.step !== undefined) numberAttrs.push(`step="${field.step}"`);
        
        return `<input type="number" value="${value}" ${attrsString} ${numberAttrs.join(' ')} />`;
      
      case 'textarea':
        const rows = field.rows || 3;
        return `<textarea rows="${rows}" ${attrsString}>${this.escapeHtml(value)}</textarea>`;
      
      case 'select':
        return this.renderSelectField(field, fieldId, value, attrsString);
      
      case 'checkbox':
        return this.renderCheckboxField(field, fieldId, value, attrsString);
      
      case 'radio':
        return this.renderRadioField(field, fieldId, value);
      
      case 'file':
        const accept = field.accept ? `accept="${field.accept}"` : '';
        const multiple = field.multiple ? 'multiple' : '';
        return `<input type="file" ${attrsString} ${accept} ${multiple} />`;
      
      case 'date':
      case 'datetime-local':
      case 'time':
        return `<input type="${field.type}" value="${value}" ${attrsString} />`;
      
      default:
        console.warn(`Unknown field type: ${field.type}`);
        return `<input type="text" value="${this.escapeHtml(value)}" ${attrsString} />`;
    }
  }

  /**
   * Render select field
   * @param {Object} field - Field configuration
   * @param {String} fieldId - Field ID
   * @param {*} value - Current value
   * @param {String} attrsString - Common attributes
   * @returns {String} HTML for select field
   */
  renderSelectField(field, fieldId, value, attrsString) {
    const options = (field.options || []).map(option => {
      const optionValue = typeof option === 'object' ? option.value : option;
      const optionLabel = typeof option === 'object' ? option.label : option;
      const selected = optionValue == value ? 'selected' : '';
      
      return `<option value="${this.escapeHtml(optionValue)}" ${selected}>${this.escapeHtml(optionLabel)}</option>`;
    }).join('');

    const multiple = field.multiple ? 'multiple' : '';
    
    return `
      <select ${attrsString} ${multiple}>
        ${!field.required && !field.multiple ? '<option value="">-- Select an option --</option>' : ''}
        ${options}
      </select>
    `;
  }

  /**
   * Render checkbox field
   * @param {Object} field - Field configuration
   * @param {String} fieldId - Field ID
   * @param {*} value - Current value
   * @param {String} attrsString - Common attributes
   * @returns {String} HTML for checkbox field
   */
  renderCheckboxField(field, fieldId, value, attrsString) {
    const checked = value ? 'checked' : '';
    
    return `
      <div class="checkbox-wrapper">
        <input type="checkbox" ${attrsString} ${checked} />
        ${field.checkboxLabel ? `<label for="${fieldId}" class="checkbox-label">${field.checkboxLabel}</label>` : ''}
      </div>
    `;
  }

  /**
   * Render radio field group
   * @param {Object} field - Field configuration
   * @param {String} fieldId - Field ID
   * @param {*} value - Current value
   * @returns {String} HTML for radio field group
   */
  renderRadioField(field, fieldId, value) {
    const options = (field.options || []).map((option, index) => {
      const optionValue = typeof option === 'object' ? option.value : option;
      const optionLabel = typeof option === 'object' ? option.label : option;
      const radioId = `${fieldId}-${index}`;
      const checked = optionValue == value ? 'checked' : '';
      
      return `
        <div class="radio-option">
          <input 
            type="radio" 
            id="${radioId}" 
            name="${field.name}" 
            value="${this.escapeHtml(optionValue)}" 
            class="plugin-form-input radio-input"
            ${checked}
            ${field.required ? 'aria-required="true"' : ''}
          />
          <label for="${radioId}" class="radio-label">${this.escapeHtml(optionLabel)}</label>
        </div>
      `;
    }).join('');

    return `<div class="radio-group" role="radiogroup" aria-labelledby="${fieldId}-label">${options}</div>`;
  }

  /**
   * Render submit section
   * @returns {String} HTML for submit section
   */
  renderSubmitSection() {
    return `
      <div class="plugin-form-submit">
        <button type="submit" class="btn ${this.config.submitClass}">
          ${this.config.submitText}
        </button>
      </div>
    `;
  }

  /**
   * Get aria-describedby attribute value
   * @param {Object} field - Field configuration
   * @param {String} fieldId - Field ID
   * @returns {String} Aria-describedby value
   */
  getAriaDescribedBy(field, fieldId) {
    const parts = [];
    
    if (field.help) {
      parts.push(`${fieldId}-help`);
    }
    
    if (this.errors[field.name]) {
      parts.push(`${fieldId}-error`);
    }
    
    return parts.join(' ');
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Form submission
    this.element.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Field changes
    this.element.addEventListener('change', (e) => {
      if (e.target.matches('.plugin-form-input')) {
        this.handleFieldChange(e.target);
      }
    });

    // Input events for real-time validation
    this.element.addEventListener('input', (e) => {
      if (e.target.matches('.plugin-form-input')) {
        this.handleFieldInput(e.target);
      }
    });

    // Blur events to mark fields as touched
    this.element.addEventListener('blur', (e) => {
      if (e.target.matches('.plugin-form-input')) {
        this.markFieldTouched(e.target.name);
      }
    }, true);
  }

  /**
   * Handle form submission
   */
  async handleSubmit() {
    // Validate all fields
    const isValid = this.validateForm();
    
    if (!isValid) {
      // Focus first field with error
      const firstErrorField = this.element.querySelector('.has-error .plugin-form-input');
      if (firstErrorField) {
        firstErrorField.focus();
      }
      return;
    }

    try {
      await this.config.onSubmit(this.formData);
    } catch (error) {
      console.error('Form submission error:', error);
      
      // Show general error
      this.showFormError('An error occurred while submitting the form. Please try again.');
    }
  }

  /**
   * Handle field change
   * @param {HTMLElement} field - Field element
   */
  handleFieldChange(field) {
    this.updateFieldValue(field);
    
    if (this.config.validateOnChange) {
      this.validateField(field.name);
    }
    
    this.config.onFieldChange(field.name, this.formData[field.name], this.formData);
  }

  /**
   * Handle field input (real-time)
   * @param {HTMLElement} field - Field element
   */
  handleFieldInput(field) {
    this.updateFieldValue(field);
    
    // Clear error if field becomes valid
    if (this.errors[field.name] && this.config.validateOnChange) {
      const fieldConfig = this.config.fields.find(f => f.name === field.name);
      if (fieldConfig && this.validateSingleField(fieldConfig, this.formData[field.name])) {
        delete this.errors[field.name];
        this.updateFieldDisplay(field.name);
      }
    }
  }

  /**
   * Update field value in form data
   * @param {HTMLElement} field - Field element
   */
  updateFieldValue(field) {
    const fieldConfig = this.config.fields.find(f => f.name === field.name);
    
    if (!fieldConfig) return;

    switch (fieldConfig.type) {
      case 'checkbox':
        this.formData[field.name] = field.checked;
        break;
      
      case 'number':
        this.formData[field.name] = field.value === '' ? '' : Number(field.value);
        break;
      
      case 'select':
        if (fieldConfig.multiple) {
          this.formData[field.name] = Array.from(field.selectedOptions).map(opt => opt.value);
        } else {
          this.formData[field.name] = field.value;
        }
        break;
      
      case 'file':
        this.formData[field.name] = fieldConfig.multiple ? Array.from(field.files) : field.files[0];
        break;
      
      default:
        this.formData[field.name] = field.value;
    }
  }

  /**
   * Mark field as touched
   * @param {String} fieldName - Field name
   */
  markFieldTouched(fieldName) {
    this.touched[fieldName] = true;
    this.updateFieldDisplay(fieldName);
  }

  /**
   * Validate entire form
   * @returns {Boolean} True if form is valid
   */
  validateForm() {
    this.errors = {};
    let isValid = true;

    for (const field of this.config.fields) {
      if (!this.validateField(field.name)) {
        isValid = false;
      }
    }

    // Custom validation
    if (this.config.onValidation) {
      const customErrors = this.config.onValidation(this.formData);
      if (customErrors && typeof customErrors === 'object') {
        Object.assign(this.errors, customErrors);
        isValid = false;
      }
    }

    this.updateFormDisplay();
    return isValid;
  }

  /**
   * Validate a single field
   * @param {String} fieldName - Field name
   * @returns {Boolean} True if field is valid
   */
  validateField(fieldName) {
    const fieldConfig = this.config.fields.find(f => f.name === fieldName);
    if (!fieldConfig) return true;

    const value = this.formData[fieldName];
    const isValid = this.validateSingleField(fieldConfig, value);
    
    if (!isValid) {
      this.updateFieldDisplay(fieldName);
    } else {
      delete this.errors[fieldName];
      this.updateFieldDisplay(fieldName);
    }
    
    return isValid;
  }

  /**
   * Validate a single field value
   * @param {Object} fieldConfig - Field configuration
   * @param {*} value - Field value
   * @returns {Boolean} True if valid
   */
  validateSingleField(fieldConfig, value) {
    const fieldName = fieldConfig.name;

    // Required validation
    if (fieldConfig.required) {
      if (value === undefined || value === null || value === '' || 
          (Array.isArray(value) && value.length === 0)) {
        this.errors[fieldName] = `${fieldConfig.label || fieldName} is required`;
        return false;
      }
    }

    // Skip other validations if field is empty and not required
    if (!fieldConfig.required && (value === undefined || value === null || value === '')) {
      return true;
    }

    // Type-specific validation
    switch (fieldConfig.type) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          this.errors[fieldName] = 'Please enter a valid email address';
          return false;
        }
        break;
      
      case 'url':
        if (value && !/^https?:\/\/.+/.test(value)) {
          this.errors[fieldName] = 'Please enter a valid URL';
          return false;
        }
        break;
      
      case 'number':
        if (fieldConfig.min !== undefined && value < fieldConfig.min) {
          this.errors[fieldName] = `Value must be at least ${fieldConfig.min}`;
          return false;
        }
        if (fieldConfig.max !== undefined && value > fieldConfig.max) {
          this.errors[fieldName] = `Value must be no more than ${fieldConfig.max}`;
          return false;
        }
        break;
      
      case 'text':
      case 'textarea':
        if (fieldConfig.minLength && value.length < fieldConfig.minLength) {
          this.errors[fieldName] = `Must be at least ${fieldConfig.minLength} characters`;
          return false;
        }
        if (fieldConfig.maxLength && value.length > fieldConfig.maxLength) {
          this.errors[fieldName] = `Must be no more than ${fieldConfig.maxLength} characters`;
          return false;
        }
        break;
    }

    // Pattern validation
    if (fieldConfig.pattern && value) {
      const regex = new RegExp(fieldConfig.pattern);
      if (!regex.test(value)) {
        this.errors[fieldName] = fieldConfig.patternMessage || 'Invalid format';
        return false;
      }
    }

    // Custom validation
    if (fieldConfig.validate && typeof fieldConfig.validate === 'function') {
      const customError = fieldConfig.validate(value, this.formData);
      if (customError) {
        this.errors[fieldName] = customError;
        return false;
      }
    }

    return true;
  }

  /**
   * Update form display after validation
   */
  updateFormDisplay() {
    for (const fieldName of Object.keys(this.formData)) {
      this.updateFieldDisplay(fieldName);
    }
  }

  /**
   * Update field display based on validation state
   * @param {String} fieldName - Field name
   */
  updateFieldDisplay(fieldName) {
    const fieldElement = this.element.querySelector(`[name="${fieldName}"]`);
    if (!fieldElement) return;

    const fieldWrapper = fieldElement.closest('.plugin-form-field');
    if (!fieldWrapper) return;

    const hasError = !!this.errors[fieldName];
    const isTouched = this.touched[fieldName];

    // Update field wrapper classes
    fieldWrapper.classList.toggle('has-error', hasError);
    fieldWrapper.classList.toggle('touched', isTouched);

    // Update aria-invalid
    fieldElement.setAttribute('aria-invalid', hasError);

    // Update error message
    const errorElement = fieldWrapper.querySelector('.plugin-form-error');
    if (hasError) {
      if (errorElement) {
        errorElement.textContent = this.errors[fieldName];
      }
    } else if (errorElement) {
      errorElement.textContent = '';
    }
  }

  /**
   * Show general form error
   * @param {String} message - Error message
   */
  showFormError(message) {
    // Remove existing form error
    const existingError = this.element.querySelector('.plugin-form-general-error');
    if (existingError) {
      existingError.remove();
    }

    // Add new error
    const errorElement = document.createElement('div');
    errorElement.className = 'plugin-form-general-error alert alert-danger';
    errorElement.setAttribute('role', 'alert');
    errorElement.textContent = message;

    this.element.insertBefore(errorElement, this.element.firstChild);
  }

  /**
   * Clear form error
   */
  clearFormError() {
    const errorElement = this.element.querySelector('.plugin-form-general-error');
    if (errorElement) {
      errorElement.remove();
    }
  }

  /**
   * Escape HTML to prevent XSS
   * @param {String} text - Text to escape
   * @returns {String} Escaped text
   */
  escapeHtml(text) {
    if (typeof text !== 'string') return text;
    
    return text.replace(/[&<>"']/g, (char) => {
      const htmlEntities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return htmlEntities[char];
    });
  }

  /**
   * Get form data
   * @returns {Object} Current form data
   */
  getData() {
    return { ...this.formData };
  }

  /**
   * Set form data
   * @param {Object} data - New form data
   */
  setData(data) {
    this.formData = { ...data };
    this.render();
    this.setupEventListeners();
  }

  /**
   * Reset form to initial state
   */
  reset() {
    this.formData = { ...this.config.initialData };
    this.errors = {};
    this.touched = {};
    this.render();
    this.setupEventListeners();
    this.clearFormError();
  }

  /**
   * Get validation errors
   * @returns {Object} Current validation errors
   */
  getErrors() {
    return { ...this.errors };
  }

  /**
   * Set field value
   * @param {String} fieldName - Field name
   * @param {*} value - New value
   */
  setFieldValue(fieldName, value) {
    this.formData[fieldName] = value;
    
    const fieldElement = this.element.querySelector(`[name="${fieldName}"]`);
    if (fieldElement) {
      const fieldConfig = this.config.fields.find(f => f.name === fieldName);
      
      if (fieldConfig) {
        switch (fieldConfig.type) {
          case 'checkbox':
            fieldElement.checked = !!value;
            break;
          case 'select':
            if (fieldConfig.multiple && Array.isArray(value)) {
              Array.from(fieldElement.options).forEach(option => {
                option.selected = value.includes(option.value);
              });
            } else {
              fieldElement.value = value;
            }
            break;
          default:
            fieldElement.value = value;
        }
      }
    }
  }

  /**
   * Focus on a specific field
   * @param {String} fieldName - Field name
   */
  focusField(fieldName) {
    const fieldElement = this.element.querySelector(`[name="${fieldName}"]`);
    if (fieldElement) {
      fieldElement.focus();
    }
  }

  /**
   * Destroy the form and clean up
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

// Make available globally
window.PluginForm = PluginForm;
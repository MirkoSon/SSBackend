/**
 * Template Component
 * 
 * A reusable template component that demonstrates the standard structure
 * for SSBackend UI components. This serves as a reference implementation
 * showing best practices for component development.
 * 
 * @class TemplateComponent
 * @param {Object} options - Configuration options for the component
 * @param {string} [options.className='template-component'] - CSS class name
 * @param {string} [options.id] - Unique element ID
 * @param {string} [options.title='Template Component'] - Component title
 * @param {string} [options.content='This is a template component'] - Component content
 * @param {boolean} [options.showHeader=true] - Whether to show the header
 * @param {boolean} [options.showFooter=false] - Whether to show the footer
 * @param {Function} [options.onClick] - Click event handler
 * @param {Object} [options.data] - Additional data to pass to the component
 * 
 * @example
 * // Basic usage
 * const template = new TemplateComponent({
 *   title: 'My Component',
 *   content: 'This is my custom content'
 * });
 * document.body.appendChild(template.render());
 * 
 * @example
 * // Advanced usage with events and data
 * const template = new TemplateComponent({
 *   className: 'custom-template',
 *   title: 'Interactive Component',
 *   content: 'Click me!',
 *   showFooter: true,
 *   onClick: (event) => {
 *     console.log('Component clicked!', event);
 *   },
 *   data: { customProperty: 'value' }
 * });
 */
class TemplateComponent {
  constructor(options = {}) {
    // Merge default options with provided options
    this.options = {
      className: 'template-component',
      title: 'Template Component',
      content: 'This is a template component',
      showHeader: true,
      showFooter: false,
      onClick: null,
      data: {},
      ...options
    };
    
    // Initialize component state
    this.state = {
      isVisible: true,
      isExpanded: true,
      customData: { ...this.options.data }
    };
    
    // Create the main element
    this.element = this.createElement();
  }

  /**
   * Creates the main DOM element for the component
   * @private
   * @returns {HTMLElement} The main component element
   */
  createElement() {
    const element = document.createElement('div');
    element.className = this.options.className;
    
    if (this.options.id) {
      element.id = this.options.id;
    }

    // Build component structure
    if (this.options.showHeader) {
      element.appendChild(this.createHeader());
    }
    
    element.appendChild(this.createContent());
    
    if (this.options.showFooter) {
      element.appendChild(this.createFooter());
    }

    // Add event listeners
    this.attachEventListeners(element);

    return element;
  }

  /**
   * Creates the header element
   * @private
   * @returns {HTMLElement} Header element
   */
  createHeader() {
    const header = document.createElement('div');
    header.className = `${this.options.className}__header`;
    
    const title = document.createElement('h3');
    title.className = `${this.options.className}__title`;
    title.textContent = this.options.title;
    
    header.appendChild(title);
    
    return header;
  }

  /**
   * Creates the content element
   * @private
   * @returns {HTMLElement} Content element
   */
  createContent() {
    const content = document.createElement('div');
    content.className = `${this.options.className}__content`;
    
    if (typeof this.options.content === 'string') {
      content.textContent = this.options.content;
    } else if (this.options.content instanceof HTMLElement) {
      content.appendChild(this.options.content);
    } else {
      content.textContent = JSON.stringify(this.options.content);
    }
    
    return content;
  }

  /**
   * Creates the footer element
   * @private
   * @returns {HTMLElement} Footer element
   */
  createFooter() {
    const footer = document.createElement('div');
    footer.className = `${this.options.className}__footer`;
    
    const info = document.createElement('p');
    info.className = `${this.options.className}__info`;
    info.textContent = 'Template component footer';
    
    footer.appendChild(info);
    
    return footer;
  }

  /**
   * Attaches event listeners to the component
   * @private
   * @param {HTMLElement} element - The component element
   */
  attachEventListeners(element) {
    if (this.options.onClick) {
      element.addEventListener('click', (event) => {
        this.options.onClick(event, this);
      });
    }

    // Add hover effects
    element.addEventListener('mouseenter', () => {
      element.classList.add(`${this.options.className}--hover`);
    });

    element.addEventListener('mouseleave', () => {
      element.classList.remove(`${this.options.className}--hover`);
    });
  }

  /**
   * Updates the component content
   * @param {string|HTMLElement|Object} newContent - New content to display
   */
  updateContent(newContent) {
    this.options.content = newContent;
    const contentElement = this.element.querySelector(`.${this.options.className}__content`);
    if (contentElement) {
      contentElement.innerHTML = '';
      if (typeof newContent === 'string') {
        contentElement.textContent = newContent;
      } else if (newContent instanceof HTMLElement) {
        contentElement.appendChild(newContent);
      } else {
        contentElement.textContent = JSON.stringify(newContent);
      }
    }
  }

  /**
   * Updates the component title
   * @param {string} newTitle - New title to display
   */
  updateTitle(newTitle) {
    this.options.title = newTitle;
    const titleElement = this.element.querySelector(`.${this.options.className}__title`);
    if (titleElement) {
      titleElement.textContent = newTitle;
    }
  }

  /**
   * Shows the component
   */
  show() {
    this.state.isVisible = true;
    this.element.style.display = '';
  }

  /**
   * Hides the component
   */
  hide() {
    this.state.isVisible = false;
    this.element.style.display = 'none';
  }

  /**
   * Toggles component visibility
   */
  toggle() {
    if (this.state.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Gets the component's current state
   * @returns {Object} Current component state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Updates the component's state
   * @param {Object} newState - New state properties to merge
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Destroys the component and cleans up
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.options = null;
    this.state = null;
  }

  /**
   * Renders the component
   * @returns {HTMLElement} The component's DOM element
   */
  render() {
    return this.element;
  }
}

module.exports = TemplateComponent;
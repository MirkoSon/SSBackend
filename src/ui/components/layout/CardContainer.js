/**
 * CardContainer - Reusable card container for content grouping
 * 
 * @component
 * @example
 * const container = new CardContainer({
 *   title: 'User Management',
 *   subtitle: 'Manage and monitor user accounts',
 *   content: '<div>User content here</div>'
 * });
 * const html = container.render();
 * 
 * @param {Object} config - CardContainer configuration
 * @param {string} config.title - Card title text
 * @param {string} [config.subtitle] - Optional subtitle text
 * @param {string} config.content - HTML content for the card body
 * @param {Array} [config.actions] - Optional action buttons
 * @returns {string} HTML string for the card container
 */
class CardContainer {
  constructor(config) {
    this.config = {
      subtitle: '',
      actions: [],
      ...config,
    };
    this.element = null;
  }

  render() {
    const card = document.createElement('div');
    card.className = 'card-container';

    // Create header
    const header = document.createElement('div');
    header.className = 'card-container__header';
    header.innerHTML = `
      <h2 class="card-container__title">${this.config.title}</h2>
      ${this.config.subtitle ? `<p class="card-container__subtitle">${this.config.subtitle}</p>` : ''}
    `;

    // Create content container
    const contentDiv = document.createElement('div');
    contentDiv.className = 'card-container__content';

    // Handle content as either string or DOM element
    if (typeof this.config.content === 'string') {
      contentDiv.innerHTML = this.config.content;
    } else if (this.config.content instanceof HTMLElement) {
      contentDiv.appendChild(this.config.content);
    }

    // Append header and content
    card.appendChild(header);
    card.appendChild(contentDiv);

    // Add actions if provided
    if (this.config.actions) {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'card-container__actions';

      if (Array.isArray(this.config.actions)) {
        // Legacy array handling
        const actionsHtml = this.config.actions.map(action =>
          `<button class="card-container__action">${action.label}</button>`
        ).join('');
        actionsDiv.innerHTML = actionsHtml;
        card.appendChild(actionsDiv);
      } else if (this.config.actions instanceof HTMLElement) {
        // New HTMLElement handling
        actionsDiv.appendChild(this.config.actions);
        card.appendChild(actionsDiv);
      }
    }

    this.element = card;
    return this.element;
  }
}

export default CardContainer;

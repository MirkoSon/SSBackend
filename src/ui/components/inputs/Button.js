/**
 * Button - Reusable button component
 * 
 * @component
 * @example
 * const btn = new Button({
 *   label: 'Click Me',
 *   icon: 'check',
 *   variant: 'primary',
 *   onClick: () => console.log('Clicked')
 * });
 * parent.appendChild(btn.render());
 * 
 * @param {Object} config - Button configuration
 * @param {string} config.label - Button text
 * @param {string} [config.icon] - Optional icon name
 * @param {string} [config.variant='primary'] - Button style variant (primary, secondary, outline, danger)
 * @param {string} [config.size='medium'] - Button size (small, medium, large)
 * @param {Function} [config.onClick] - Click handler
 */
export default class Button {
    constructor(config) {
        this.config = {
            variant: 'primary',
            size: 'medium',
            type: 'button',
            disabled: false,
            ...config
        };
        this.element = null;
    }

    render() {
        const btn = document.createElement('button');
        btn.type = this.config.type;
        btn.className = `btn btn-${this.config.variant} btn-${this.config.size}`;
        
        if (this.config.disabled) {
            btn.disabled = true;
        }

        if (this.config.icon) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'btn-icon';
            iconSpan.textContent = this.getIconChar(this.config.icon);
            // Add margin if there is a label
            if (this.config.label) {
                iconSpan.style.marginRight = '0.5rem';
            }
            btn.appendChild(iconSpan);
        }

        if (this.config.label) {
            btn.appendChild(document.createTextNode(this.config.label));
        }
        
        if (this.config.onClick && !this.config.disabled) {
            btn.addEventListener('click', (e) => {
                // Prevent default if it's a link or form submit unless intended? 
                // Usually for custom buttons we might want to stop propagation.
                if (this.config.type !== 'submit') {
                    e.preventDefault();
                }
                this.config.onClick(e);
            });
        }
        
        this.element = btn;
        return btn;
    }

    getIconChar(name) {
        // Simple mapping for common icons used in the app
        const icons = {
            'refresh': '🔄',
            'download': '📥',
            'edit': '✏️',
            'history': '📜',
            'trash': '🗑️',
            'delete': '🗑️',
            'add': '➕', 
            'close': '❌',
            'check': '✅',
            'save': '💾',
            'search': '🔍',
            'filter': '⚡'
        };
        return icons[name] || name;
    }
}

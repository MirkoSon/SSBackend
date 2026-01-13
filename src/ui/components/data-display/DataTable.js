import ActionRegistry from '../ActionRegistry.js';

/**
 * DataTable - Reusable table component for displaying structured data
 * 
 * @component
 * @example
 * const table = new DataTable({
 *   columns: [
 *     { field: 'name', label: 'Name' },
 *     { field: 'email', label: 'Email' },
 *     { field: 'status', label: 'Status', formatter: (value) => value.toUpperCase() }
 *   ],
 *   data: [
 *     { name: 'John Doe', email: 'john@example.com', status: 'active' },
 *     { name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' }
 *   ],
 *   actions: [
 *     { label: 'Edit', handler: (row) => console.log('Edit', row) },
 *     { label: 'Delete', handler: (row) => console.log('Delete', row) }
 *   ]
 * });
 * const html = table.render();
 * 
 * @param {Object} config - DataTable configuration
 * @param {Array} config.columns - Column definitions
 * @param {string} config.columns[].field - Data field name
 * @param {string} config.columns[].label - Column header text
 * @param {Function} [config.columns[].formatter] - Optional value formatter
 * @param {Array} config.data - Array of data objects
 * @param {Array} [config.actions] - Optional row action buttons
 * @param {string} config.actions[].label - Button text
 * @param {Function} config.actions[].handler - Click handler function
 * @returns {string} HTML string for the data table
 */
class DataTable {
  constructor(config) {
    this.config = {
      columns: config.columns || [],
      data: config.data || [],
      actions: config.actions || [],
      emptyMessage: config.emptyMessage || 'No data available',
      ...config
    };
  }

  /**
   * Generate the complete HTML for the data table
   * @returns {string} HTML string
   */
  /**
   * Generate the complete HTML Element for the data table
   * @returns {HTMLElement} The data table element
   */
  render() {
    // Create container
    const container = document.createElement('div');
    container.className = 'data-table';
    this.element = container;

    const hasData = this.config.data && this.config.data.length > 0;

    if (hasData) {
      container.appendChild(this._createTableElement());
    } else {
      container.appendChild(this._createEmptyStateElement());
    }

    return container;
  }

  /**
   * Helper to create the table element
   * @returns {HTMLTableElement}
   */
  _createTableElement() {
    const table = document.createElement('table');
    table.className = 'data-table__table';

    const thead = document.createElement('thead');
    thead.className = 'data-table__header';
    thead.appendChild(this._createHeaderRow());
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.className = 'data-table__body';
    this._appendBodyRows(tbody);
    table.appendChild(tbody);

    return table;
  }

  /**
   * Helper to create the empty state element
   * @returns {HTMLElement}
   */
  _createEmptyStateElement() {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'data-table__empty';

    const p = document.createElement('p');
    p.className = 'data-table__empty-message';
    p.textContent = this.config.emptyMessage;

    emptyDiv.appendChild(p);
    return emptyDiv;
  }

  /**
   * Create header row
   * @returns {HTMLTableRowElement}
   */
  _createHeaderRow() {
    const tr = document.createElement('tr');

    this.config.columns.forEach(column => {
      const th = document.createElement('th');
      th.className = 'data-table__header-cell';
      th.textContent = column.label;
      if (column.width) {
        th.style.width = column.width;
      }
      // Add sort capabilities if needed
      if (this.config.onSort && column.sortable) {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
          // Simple toggle logic could be added here
          const direction = this.currentSortField === column.field && this.currentSortDirection === 'asc' ? 'desc' : 'asc';
          this.currentSortField = column.field;
          this.currentSortDirection = direction;
          this.config.onSort(column.field, direction);
        });
      }
      tr.appendChild(th);
    });

    // Actions header
    if (this.config.actions && this.config.actions.length > 0
      // Or if the columns definition handles actions separately, but here the config has a separate actions array
    ) {
      // Check if we have a direct actions column defined or if we append it
      // The original code appended an Actions header if config.actions existed
      const th = document.createElement('th');
      th.className = 'data-table__header-cell data-table__actions-header';
      th.textContent = 'Actions';
      tr.appendChild(th);
    }

    // Check if there are columns with custom formatter that returns actions? 
    // In BalanceManagerView, one column has field 'actions' and a formatter.
    // If that's the case, we don't need to append an extra "Actions" column if it's already in columns.
    // But the original code ALWAYS appended it if config.actions existed.
    // Let's stick to the original logic: if config.actions is present, add header.

    return tr;
  }

  /**
   * Append body rows to tbody
   * @param {HTMLTableSectionElement} tbody
   */
  _appendBodyRows(tbody) {
    this.config.data.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      tr.className = 'data-table__row';

      if (this.config.selectable) {
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', (e) => {
          // Prevent triggering select if clicking an interactive element
          if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
          if (this.config.onRowSelect) this.config.onRowSelect(row);
        });
      }

      this.config.columns.forEach(column => {
        const td = document.createElement('td');
        td.className = 'data-table__cell';

        let content = row[column.field];
        if (column.formatter) {
          const formatted = column.formatter(content, row);
          // Check if formatter returned a DOM node or string
          if (formatted instanceof HTMLElement) {
            td.appendChild(formatted);
          } else {
            // If string contains HTML (checking for <)
            if (typeof formatted === 'string' && formatted.trim().startsWith('<')) {
              td.innerHTML = formatted;
            } else {
              td.textContent = formatted !== undefined && formatted !== null ? formatted : '';
            }
          }
        } else {
          td.textContent = content !== undefined && content !== null ? content : '';
        }
        tr.appendChild(td);
      });

      // Append legacy actions column if config.actions exists
      if (this.config.actions && this.config.actions.length > 0) {
        const td = document.createElement('td');
        td.className = 'data-table__cell data-table__actions';
        this.renderActions(td, row, this.config.actions, rowIndex);
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    });
  }

  /**
   * Update the data in the table
   * @param {Array} newData - New data array
   */
  /**
   * Renders action buttons into a container element.
   * Useful for custom columns that need to include standard actions.
   */
  renderActions(container, row, actions, rowIndex = -1) {
    actions.forEach(actionOrId => {
      const action = ActionRegistry.resolve(actionOrId);
      const btn = document.createElement('button');
      btn.className = `data-table__action-btn ${action.className || ''}`;

      if (action.label) {
        btn.textContent = action.label;
      }

      if (action.title) {
        btn.title = action.title;
      }

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (action.handler) {
          action.handler(row, rowIndex);
        } else if (typeof actionOrId === 'object' && actionOrId.handler) {
          actionOrId.handler(row, rowIndex);
        }
      });
      container.appendChild(btn);
    });
  }

  updateData(newData) {
    this.config.data = newData;
    // content update logic
    if (this.element) {
      this.element.innerHTML = '';
      const hasData = this.config.data && this.config.data.length > 0;
      if (hasData) {
        this.element.appendChild(this._createTableElement());
      } else {
        this.element.appendChild(this._createEmptyStateElement());
      }
    }
  }

  showLoading() {
    if (!this.element) return;
    this.element.classList.add('loading');
    // Could add a spinner overlay here
  }

  hideLoading() {
    if (!this.element) return;
    this.element.classList.remove('loading');
  }

  // Legacy methods compatibility
  attachEventHandlers(container) {
    // No-op, events are attached during creation
  }

  /**
   * Get the current data
   * @returns {Array} Current data array
   */
  getData() {
    return this.config.data;
  }

  /**
   * Add a new row to the table
   * @param {Object} row - New row data
   */
  addRow(row) {
    this.config.data.push(row);
  }

  /**
   * Remove a row from the table
   * @param {number} rowIndex - Index of row to remove
   */
  removeRow(rowIndex) {
    if (rowIndex >= 0 && rowIndex < this.config.data.length) {
      this.config.data.splice(rowIndex, 1);
    }
  }

  /**
   * Clear all data from the table
   */
  clearData() {
    this.config.data = [];
  }
}

export default DataTable;
/**
 * PluginTable - Standardized data table component for plugin UIs
 * Provides sorting, filtering, pagination with consistent dashboard styling
 */
class PluginTable {
  constructor(config) {
    this.config = this.validateConfig(config);
    this.element = null;
    this.currentPage = 1;
    this.sortColumn = null;
    this.sortDirection = 'asc';
    this.filteredData = [];
    this.searchTerm = '';
    
    this.init();
  }

  /**
   * Validate and set default configuration
   * @param {Object} config - Table configuration
   * @returns {Object} Validated configuration
   */
  validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('PluginTable configuration is required');
    }

    return {
      // Data configuration
      data: Array.isArray(config.data) ? config.data : [],
      columns: Array.isArray(config.columns) ? config.columns : [],
      
      // Event handlers
      onRowAction: typeof config.onRowAction === 'function' ? config.onRowAction : () => {},
      onSelectionChange: typeof config.onSelectionChange === 'function' ? config.onSelectionChange : () => {},
      
      // Feature toggles
      pagination: config.pagination !== false,
      sorting: config.sorting !== false,
      filtering: config.filtering !== false,
      selection: config.selection === true,
      
      // Pagination settings
      pageSize: config.pageSize || 10,
      pageSizeOptions: config.pageSizeOptions || [5, 10, 25, 50],
      
      // Styling
      className: config.className || '',
      striped: config.striped !== false,
      hover: config.hover !== false,
      
      // Accessibility
      ariaLabel: config.ariaLabel || 'Data table',
      
      // Container element
      container: config.container || document.body
    };
  }

  /**
   * Initialize the table component
   */
  init() {
    this.createElement();
    this.filteredData = [...this.config.data];
    this.render();
    this.setupEventListeners();
  }

  /**
   * Create the table DOM element
   */
  createElement() {
    this.element = document.createElement('div');
    this.element.className = `plugin-table-wrapper ${this.config.className}`;
    this.element.setAttribute('role', 'region');
    this.element.setAttribute('aria-label', this.config.ariaLabel);
  }

  /**
   * Render the complete table with controls
   */
  render() {
    const html = `
      ${this.config.filtering ? this.renderTableControls() : ''}
      ${this.renderTable()}
      ${this.config.pagination ? this.renderPagination() : ''}
    `;
    
    this.element.innerHTML = html;
    
    // Apply data to container
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
   * Render table controls (search, filters)
   * @returns {String} HTML for table controls
   */
  renderTableControls() {
    return `
      <div class="plugin-table-controls">
        <div class="table-search">
          <input 
            type="text" 
            class="form-control search-input" 
            placeholder="Search..." 
            value="${this.searchTerm}"
            aria-label="Search table data"
          />
          <button class="btn btn-secondary clear-search" title="Clear search">
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div class="table-info">
          ${this.filteredData.length} ${this.filteredData.length === 1 ? 'item' : 'items'}
        </div>
      </div>
    `;
  }

  /**
   * Render the main table
   * @returns {String} HTML for table
   */
  renderTable() {
    const tableClasses = [
      'plugin-table',
      'admin-table',
      this.config.striped ? 'table-striped' : '',
      this.config.hover ? 'table-hover' : ''
    ].filter(Boolean).join(' ');

    return `
      <div class="table-responsive">
        <table class="${tableClasses}" role="table">
          ${this.renderTableHeader()}
          ${this.renderTableBody()}
        </table>
      </div>
    `;
  }

  /**
   * Render table header
   * @returns {String} HTML for table header
   */
  renderTableHeader() {
    if (!this.config.columns.length) {
      return '<thead><tr><th>No columns defined</th></tr></thead>';
    }

    const headerCells = this.config.columns.map(column => {
      const sortable = this.config.sorting && column.sortable !== false;
      const isCurrentSort = this.sortColumn === column.key;
      
      const sortIcon = isCurrentSort 
        ? (this.sortDirection === 'asc' ? '↑' : '↓')
        : (sortable ? '↕' : '');

      const cellClass = [
        sortable ? 'sortable' : '',
        isCurrentSort ? `sorted-${this.sortDirection}` : ''
      ].filter(Boolean).join(' ');

      return `
        <th 
          class="${cellClass}" 
          ${sortable ? `data-sort-key="${column.key}"` : ''}
          ${sortable ? 'role="button" tabindex="0"' : ''}
          ${sortable ? `aria-sort="${isCurrentSort ? this.sortDirection + 'ending' : 'none'}"` : ''}
          title="${sortable ? 'Click to sort' : ''}"
        >
          ${column.title || column.key}
          ${sortIcon ? `<span class="sort-icon" aria-hidden="true">${sortIcon}</span>` : ''}
        </th>
      `;
    }).join('');

    return `
      <thead>
        <tr>
          ${this.config.selection ? '<th class="select-column"><input type="checkbox" class="select-all" aria-label="Select all rows"></th>' : ''}
          ${headerCells}
          ${this.hasActions() ? '<th class="actions-column">Actions</th>' : ''}
        </tr>
      </thead>
    `;
  }

  /**
   * Render table body
   * @returns {String} HTML for table body
   */
  renderTableBody() {
    if (!this.filteredData.length) {
      const colSpan = this.config.columns.length + 
                    (this.config.selection ? 1 : 0) + 
                    (this.hasActions() ? 1 : 0);
      
      return `
        <tbody>
          <tr>
            <td colspan="${colSpan}" class="no-data">
              <div class="no-data-message">
                <span class="no-data-icon">📋</span>
                <p>No data available</p>
              </div>
            </td>
          </tr>
        </tbody>
      `;
    }

    const paginatedData = this.getPaginatedData();
    const rows = paginatedData.map((row, index) => this.renderTableRow(row, index)).join('');

    return `<tbody>${rows}</tbody>`;
  }

  /**
   * Render a single table row
   * @param {Object} row - Row data
   * @param {Number} index - Row index
   * @returns {String} HTML for table row
   */
  renderTableRow(row, index) {
    const rowId = row.id || index;
    const cells = this.config.columns.map(column => {
      const value = this.getCellValue(row, column);
      const formattedValue = this.formatCellValue(value, column);
      
      return `<td class="cell-${column.key}" data-label="${column.title || column.key}">${formattedValue}</td>`;
    }).join('');

    return `
      <tr data-row-id="${rowId}" ${this.config.selection ? 'class="selectable"' : ''}>
        ${this.config.selection ? `<td class="select-column"><input type="checkbox" class="row-select" value="${rowId}" aria-label="Select row"></td>` : ''}
        ${cells}
        ${this.hasActions() ? this.renderActionCell(row, index) : ''}
      </tr>
    `;
  }

  /**
   * Render action cell for a row
   * @param {Object} row - Row data
   * @param {Number} index - Row index
   * @returns {String} HTML for action cell
   */
  renderActionCell(row, index) {
    // Default actions - can be overridden by configuration
    const actions = [
      { label: 'View', action: 'view', icon: '👁', class: 'btn-primary' },
      { label: 'Edit', action: 'edit', icon: '✏️', class: 'btn-secondary' },
      { label: 'Delete', action: 'delete', icon: '🗑', class: 'btn-danger' }
    ];

    const actionButtons = actions.map(action => `
      <button 
        class="btn btn-sm ${action.class} action-btn" 
        data-action="${action.action}" 
        data-row-id="${row.id || index}"
        title="${action.label}"
        aria-label="${action.label} item"
      >
        <span aria-hidden="true">${action.icon}</span>
        <span class="sr-only">${action.label}</span>
      </button>
    `).join('');

    return `<td class="actions-column">${actionButtons}</td>`;
  }

  /**
   * Render pagination controls
   * @returns {String} HTML for pagination
   */
  renderPagination() {
    const totalPages = Math.ceil(this.filteredData.length / this.config.pageSize);
    
    if (totalPages <= 1) {
      return '';
    }

    const startItem = (this.currentPage - 1) * this.config.pageSize + 1;
    const endItem = Math.min(this.currentPage * this.config.pageSize, this.filteredData.length);

    return `
      <div class="plugin-table-pagination">
        <div class="pagination-info">
          Showing ${startItem}-${endItem} of ${this.filteredData.length} items
        </div>
        <div class="pagination-controls">
          ${this.renderPageSizeSelector()}
          ${this.renderPageNavigation(totalPages)}
        </div>
      </div>
    `;
  }

  /**
   * Render page size selector
   * @returns {String} HTML for page size selector
   */
  renderPageSizeSelector() {
    const options = this.config.pageSizeOptions.map(size => 
      `<option value="${size}" ${size === this.config.pageSize ? 'selected' : ''}>${size}</option>`
    ).join('');

    return `
      <div class="page-size-selector">
        <label for="page-size">Show:</label>
        <select id="page-size" class="form-control page-size-select">
          ${options}
        </select>
        <span>per page</span>
      </div>
    `;
  }

  /**
   * Render page navigation buttons
   * @param {Number} totalPages - Total number of pages
   * @returns {String} HTML for page navigation
   */
  renderPageNavigation(totalPages) {
    const prevDisabled = this.currentPage <= 1;
    const nextDisabled = this.currentPage >= totalPages;

    let pageButtons = '';
    
    // Calculate visible page range
    const maxVisible = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // Add page buttons
    for (let i = startPage; i <= endPage; i++) {
      pageButtons += `
        <button 
          class="btn btn-page ${i === this.currentPage ? 'btn-primary' : 'btn-outline-secondary'}"
          data-page="${i}"
          ${i === this.currentPage ? 'aria-current="page"' : ''}
        >
          ${i}
        </button>
      `;
    }

    return `
      <div class="page-navigation">
        <button 
          class="btn btn-outline-secondary" 
          data-page-action="prev"
          ${prevDisabled ? 'disabled' : ''}
          aria-label="Previous page"
        >
          ‹ Previous
        </button>
        ${pageButtons}
        <button 
          class="btn btn-outline-secondary" 
          data-page-action="next"
          ${nextDisabled ? 'disabled' : ''}
          aria-label="Next page"
        >
          Next ›
        </button>
      </div>
    `;
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Search functionality
    const searchInput = this.element.querySelector('.search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.handleSearch(e.target.value);
      });
    }

    // Clear search
    const clearSearch = this.element.querySelector('.clear-search');
    if (clearSearch) {
      clearSearch.addEventListener('click', () => {
        this.handleSearch('');
        const searchInput = this.element.querySelector('.search-input');
        if (searchInput) searchInput.value = '';
      });
    }

    // Column sorting
    if (this.config.sorting) {
      this.element.addEventListener('click', (e) => {
        const sortHeader = e.target.closest('[data-sort-key]');
        if (sortHeader) {
          this.handleSort(sortHeader.dataset.sortKey);
        }
      });

      this.element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const sortHeader = e.target.closest('[data-sort-key]');
          if (sortHeader) {
            e.preventDefault();
            this.handleSort(sortHeader.dataset.sortKey);
          }
        }
      });
    }

    // Row actions
    this.element.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('.action-btn');
      if (actionBtn) {
        const action = actionBtn.dataset.action;
        const rowId = actionBtn.dataset.rowId;
        const row = this.filteredData.find(r => (r.id || this.filteredData.indexOf(r)) == rowId);
        this.config.onRowAction(action, row, rowId);
      }
    });

    // Pagination
    this.element.addEventListener('click', (e) => {
      if (e.target.matches('[data-page]')) {
        this.goToPage(parseInt(e.target.dataset.page));
      } else if (e.target.matches('[data-page-action="prev"]')) {
        this.goToPage(this.currentPage - 1);
      } else if (e.target.matches('[data-page-action="next"]')) {
        this.goToPage(this.currentPage + 1);
      }
    });

    // Page size change
    const pageSizeSelect = this.element.querySelector('.page-size-select');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', (e) => {
        this.config.pageSize = parseInt(e.target.value);
        this.currentPage = 1;
        this.render();
        this.setupEventListeners();
      });
    }

    // Selection
    if (this.config.selection) {
      // Select all
      const selectAll = this.element.querySelector('.select-all');
      if (selectAll) {
        selectAll.addEventListener('change', (e) => {
          this.handleSelectAll(e.target.checked);
        });
      }

      // Individual row selection
      this.element.addEventListener('change', (e) => {
        if (e.target.matches('.row-select')) {
          this.handleRowSelection();
        }
      });
    }
  }

  /**
   * Handle search functionality
   * @param {String} searchTerm - Search term
   */
  handleSearch(searchTerm) {
    this.searchTerm = searchTerm.toLowerCase();
    this.filteredData = this.config.data.filter(row => {
      return this.config.columns.some(column => {
        const value = this.getCellValue(row, column);
        return String(value).toLowerCase().includes(this.searchTerm);
      });
    });
    
    this.currentPage = 1;
    this.render();
    this.setupEventListeners();
  }

  /**
   * Handle column sorting
   * @param {String} columnKey - Column key to sort by
   */
  handleSort(columnKey) {
    if (this.sortColumn === columnKey) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = columnKey;
      this.sortDirection = 'asc';
    }

    this.filteredData.sort((a, b) => {
      const valueA = this.getCellValue(a, { key: columnKey });
      const valueB = this.getCellValue(b, { key: columnKey });
      
      let comparison = 0;
      if (valueA > valueB) comparison = 1;
      if (valueA < valueB) comparison = -1;
      
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.render();
    this.setupEventListeners();
  }

  /**
   * Handle select all functionality
   * @param {Boolean} checked - Whether select all is checked
   */
  handleSelectAll(checked) {
    const rowSelects = this.element.querySelectorAll('.row-select');
    rowSelects.forEach(checkbox => {
      checkbox.checked = checked;
    });
    this.handleRowSelection();
  }

  /**
   * Handle row selection change
   */
  handleRowSelection() {
    const selectedRows = Array.from(this.element.querySelectorAll('.row-select:checked'))
      .map(checkbox => checkbox.value);
    
    this.config.onSelectionChange(selectedRows);
  }

  /**
   * Go to specific page
   * @param {Number} page - Page number
   */
  goToPage(page) {
    const totalPages = Math.ceil(this.filteredData.length / this.config.pageSize);
    
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
      this.render();
      this.setupEventListeners();
    }
  }

  /**
   * Get paginated data for current page
   * @returns {Array} Paginated data
   */
  getPaginatedData() {
    if (!this.config.pagination) {
      return this.filteredData;
    }

    const startIndex = (this.currentPage - 1) * this.config.pageSize;
    const endIndex = startIndex + this.config.pageSize;
    
    return this.filteredData.slice(startIndex, endIndex);
  }

  /**
   * Get cell value from row data
   * @param {Object} row - Row data
   * @param {Object} column - Column configuration
   * @returns {*} Cell value
   */
  getCellValue(row, column) {
    const key = column.key;
    
    // Support nested properties with dot notation
    if (key.includes('.')) {
      return key.split('.').reduce((obj, prop) => obj && obj[prop], row);
    }
    
    return row[key];
  }

  /**
   * Format cell value for display
   * @param {*} value - Raw cell value
   * @param {Object} column - Column configuration
   * @returns {String} Formatted value
   */
  formatCellValue(value, column) {
    if (value === null || value === undefined) {
      return '<span class="null-value">—</span>';
    }

    // Apply custom formatter if provided
    if (column.formatter && typeof column.formatter === 'function') {
      return column.formatter(value);
    }

    // Default formatting based on value type
    if (typeof value === 'boolean') {
      return `<span class="boolean-value ${value ? 'true' : 'false'}">${value ? '✓' : '✗'}</span>`;
    }

    if (typeof value === 'number') {
      return `<span class="number-value">${value.toLocaleString()}</span>`;
    }

    if (value instanceof Date) {
      return `<span class="date-value">${value.toLocaleDateString()}</span>`;
    }

    // Escape HTML for safety
    return String(value).replace(/[&<>"']/g, (char) => {
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
   * Check if table has action buttons
   * @returns {Boolean} True if actions are configured
   */
  hasActions() {
    return typeof this.config.onRowAction === 'function';
  }

  /**
   * Update table data
   * @param {Array} newData - New data array
   */
  updateData(newData) {
    this.config.data = Array.isArray(newData) ? newData : [];
    this.filteredData = [...this.config.data];
    this.currentPage = 1;
    this.render();
    this.setupEventListeners();
  }

  /**
   * Get selected row IDs
   * @returns {Array} Array of selected row IDs
   */
  getSelectedRows() {
    return Array.from(this.element.querySelectorAll('.row-select:checked'))
      .map(checkbox => checkbox.value);
  }

  /**
   * Clear all selections
   */
  clearSelection() {
    const checkboxes = this.element.querySelectorAll('.row-select, .select-all');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
  }

  /**
   * Destroy the table and clean up
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

// Make available globally
window.PluginTable = PluginTable;
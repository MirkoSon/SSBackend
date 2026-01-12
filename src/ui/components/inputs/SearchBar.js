
/**
 * SearchBar - Reusable search input component
 * 
 * @component
 * @example
 * const searchBar = new SearchBar({
 *   placeholder: 'Search users...',
 *   onSearch: (query) => console.log('Searching:', query),
 *   showFilter: true,
 *   onFilter: () => console.log('Filter clicked')
 * });
 * document.body.innerHTML = searchBar.render();
 * searchBar.addEventListeners();
 * 
 * @param {Object} config - SearchBar configuration
 * @param {string} [config.placeholder='Search...'] - Placeholder text for input
 * @param {Function} config.onSearch - Callback function for search input changes
 * @param {boolean} [config.showFilter=false] - Whether to show filter button
 * @param {Function} [config.onFilter] - Callback for filter button click
 * @param {number} [config.debounceMs=300] - Debounce delay in milliseconds
 */
class SearchBar {
  constructor(config) {
    this.config = {
      placeholder: 'Search...',
      showFilter: false,
      debounceMs: 300,
      ...config,
    };
    this.element = null;
    this.input = null;
    this.clearBtn = null;
    this.debouncedSearch = this.debounce(this.handleSearch.bind(this), this.config.debounceMs);
  }

  debounce(func, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  handleSearch(event) {
    const query = event.target.value;
    if (this.config.onSearch) {
      this.config.onSearch(query);
    }
    if (this.clearBtn) {
      this.clearBtn.style.display = query ? 'block' : 'none';
    }
  }

  clearSearch() {
    if (!this.input) return;
    this.input.value = '';
    this.input.focus();
    if (this.config.onSearch) {
      this.config.onSearch('');
    }
    if (this.clearBtn) {
      this.clearBtn.style.display = 'none';
    }
  }

  handleKeyDown(event) {
    if (event.key === 'Escape') {
      this.clearSearch();
    }
  }

  handleFilterClick() {
    if (this.config.onFilter) {
      this.config.onFilter();
    }
  }

  render() {
    const container = document.createElement('div');
    container.className = 'search-bar';
    container.innerHTML = `
      <div class="search-bar__input-container">
        <input type="text" class="search-bar__input" placeholder="${this.config.placeholder}">
        <div class="search-bar__icon">🔍</div>
<button class="search-bar__clear-btn" style="display:none;" aria-label="Clear search">&times;</button>
      </div>
      ${this.config.showFilter ? '<button class="search-bar__filter-btn">Filter</button>' : ''}
    `;
    this.element = container;
    this.input = this.element.querySelector('.search-bar__input');
    this.clearBtn = this.element.querySelector('.search-bar__clear-btn');
    this.addEventListeners();
    return this.element;
  }

  addEventListeners() {
    if (this.input) {
      this.input.addEventListener('input', this.debouncedSearch);
      this.input.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', this.clearSearch.bind(this));
    }

    if (this.config.showFilter) {
      const filterButton = this.element.querySelector('.search-bar__filter-btn');
      if (filterButton) {
        filterButton.addEventListener('click', this.handleFilterClick.bind(this));
      }
    }
  }
}

export default SearchBar;

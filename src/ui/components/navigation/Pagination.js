/**
 * Pagination - Reusable pagination component
 * 
 * @component
 * @example
 * const pagination = new Pagination({
 *   currentPage: 1,
 *   totalPages: 10,
 *   pageSize: 10,
 *   totalItems: 100,
 *   onPageChange: (page) => loadPage(page)
 * });
 * parent.appendChild(pagination.render());
 */
export default class Pagination {
    constructor(config) {
        this.config = {
            currentPage: 1,
            totalPages: 1,
            pageSize: 10,
            totalItems: 0,
            onPageSizeChange: null,
            ...config
        };
        this.element = null;
    }

    render() {
        const container = document.createElement('div');
        container.className = 'pagination-container';

        // Pagination Info (Showing X-Y of Z)
        const info = document.createElement('div');
        info.className = 'pagination-info';
        const start = Math.min((this.config.currentPage - 1) * this.config.pageSize + 1, this.config.totalItems);
        const end = Math.min(this.config.currentPage * this.config.pageSize, this.config.totalItems);
        info.textContent = `Showing ${start}-${end} of ${this.config.totalItems}`;

        // Controls
        const controls = document.createElement('div');
        controls.className = 'pagination-controls';

        // Previous Button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-outline btn-small';
        prevBtn.textContent = 'Previous';
        prevBtn.disabled = this.config.currentPage <= 1;
        prevBtn.addEventListener('click', () => {
            if (this.config.onPageChange && this.config.currentPage > 1) {
                this.config.onPageChange(this.config.currentPage - 1);
            }
        });

        // Page Indicator
        const pageInfo = document.createElement('span');
        pageInfo.className = 'pagination-pages';
        pageInfo.textContent = `Page ${this.config.currentPage} of ${this.config.totalPages}`;

        // Next Button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-outline btn-small';
        nextBtn.textContent = 'Next';
        nextBtn.disabled = this.config.currentPage >= this.config.totalPages;
        nextBtn.addEventListener('click', () => {
            if (this.config.onPageChange && this.config.currentPage < this.config.totalPages) {
                this.config.onPageChange(this.config.currentPage + 1);
            }
        });

        controls.appendChild(prevBtn);
        controls.appendChild(pageInfo);
        controls.appendChild(nextBtn);

        container.appendChild(info);
        container.appendChild(controls);

        // Page Size Selector (Optional)
        if (this.config.onPageSizeChange) {
            const sizeSelector = document.createElement('select');
            sizeSelector.className = 'pagination-size-select';
            [10, 25, 50, 100].forEach(size => {
                const option = document.createElement('option');
                option.value = size;
                option.textContent = `${size} / page`;
                if (size === this.config.pageSize) option.selected = true;
                sizeSelector.appendChild(option);
            });
            sizeSelector.addEventListener('change', (e) => {
                this.config.onPageSizeChange(parseInt(e.target.value));
            });
            container.appendChild(sizeSelector);
        }

        this.element = container;
        return container;
    }
}

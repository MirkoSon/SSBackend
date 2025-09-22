/**
 * PluginChart - Chart component for plugin analytics and data visualization
 * Provides standardized chart types with responsive design
 */
class PluginChart {
  constructor(config) {
    this.config = this.validateConfig(config);
    this.element = null;
    this.chart = null;
    
    this.init();
  }

  /**
   * Validate and set default configuration
   * @param {Object} config - Chart configuration
   * @returns {Object} Validated configuration
   */
  validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('PluginChart configuration is required');
    }

    return {
      // Chart type: 'bar', 'line', 'pie', 'doughnut', 'area'
      type: config.type || 'bar',
      
      // Chart data
      data: config.data || { labels: [], datasets: [] },
      
      // Chart options
      options: config.options || {},
      
      // Container
      container: config.container || document.body,
      
      // Dimensions
      width: config.width || '100%',
      height: config.height || '400px',
      
      // Styling
      className: config.className || '',
      
      // Accessibility
      title: config.title || 'Chart',
      description: config.description || '',
      
      // Events
      onClick: typeof config.onClick === 'function' ? config.onClick : null,
      onHover: typeof config.onHover === 'function' ? config.onHover : null,
      
      // Responsive behavior
      responsive: config.responsive !== false,
      maintainAspectRatio: config.maintainAspectRatio !== false
    };
  }

  /**
   * Initialize the chart component
   */
  init() {
    this.createElement();
    this.render();
    this.setupEventListeners();
  }

  /**
   * Create the chart DOM element
   */
  createElement() {
    this.element = document.createElement('div');
    this.element.className = `plugin-chart-wrapper ${this.config.className}`;
    this.element.style.width = this.config.width;
    this.element.style.height = this.config.height;
  }

  /**
   * Render the chart
   */
  render() {
    const html = `
      <div class="plugin-chart-container">
        ${this.config.title ? `<h3 class="chart-title">${this.config.title}</h3>` : ''}
        ${this.config.description ? `<p class="chart-description">${this.config.description}</p>` : ''}
        <div class="chart-canvas-container">
          <canvas 
            class="chart-canvas" 
            role="img" 
            aria-label="${this.config.title}"
            ${this.config.description ? `aria-describedby="chart-desc-${this.generateId()}"` : ''}
          ></canvas>
          ${this.config.description ? `<div id="chart-desc-${this.generateId()}" class="sr-only">${this.config.description}</div>` : ''}
        </div>
        <div class="chart-legend" id="chart-legend-${this.generateId()}"></div>
        ${this.renderChartControls()}
      </div>
    `;
    
    this.element.innerHTML = html;
    
    // Add to container
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

    // Initialize chart using simple Canvas API (Chart.js alternative)
    this.initializeChart();
  }

  /**
   * Render chart controls
   * @returns {String} HTML for chart controls
   */
  renderChartControls() {
    return `
      <div class="chart-controls">
        <div class="chart-actions">
          <button class="btn btn-sm btn-outline-secondary refresh-chart" title="Refresh chart">
            <span aria-hidden="true">🔄</span>
            <span class="sr-only">Refresh</span>
          </button>
          <button class="btn btn-sm btn-outline-secondary export-chart" title="Export chart">
            <span aria-hidden="true">📊</span>
            <span class="sr-only">Export</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Initialize chart using Canvas API
   */
  initializeChart() {
    const canvas = this.element.querySelector('.chart-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    
    // Set canvas size
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = (rect.height || 400) * window.devicePixelRatio;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = (rect.height || 400) + 'px';
    
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Draw chart based on type
    this.drawChart(ctx, canvas.style.width.replace('px', ''), canvas.style.height.replace('px', ''));
  }

  /**
   * Draw chart on canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Number} width - Canvas width
   * @param {Number} height - Canvas height
   */
  drawChart(ctx, width, height) {
    const w = parseInt(width);
    const h = parseInt(height);
    
    // Clear canvas
    ctx.clearRect(0, 0, w, h);
    
    // Set up chart area with padding
    const padding = 60;
    const chartWidth = w - (padding * 2);
    const chartHeight = h - (padding * 2);
    
    switch (this.config.type) {
      case 'bar':
        this.drawBarChart(ctx, padding, padding, chartWidth, chartHeight);
        break;
      case 'line':
        this.drawLineChart(ctx, padding, padding, chartWidth, chartHeight);
        break;
      case 'pie':
        this.drawPieChart(ctx, w / 2, h / 2, Math.min(chartWidth, chartHeight) / 2);
        break;
      case 'doughnut':
        this.drawDoughnutChart(ctx, w / 2, h / 2, Math.min(chartWidth, chartHeight) / 2);
        break;
      default:
        this.drawBarChart(ctx, padding, padding, chartWidth, chartHeight);
    }
  }

  /**
   * Draw bar chart
   */
  drawBarChart(ctx, x, y, width, height) {
    const data = this.config.data;
    if (!data.labels || !data.datasets || data.datasets.length === 0) {
      this.drawNoDataMessage(ctx, x, y, width, height);
      return;
    }

    const barCount = data.labels.length;
    const barWidth = width / barCount * 0.8;
    const barSpacing = width / barCount * 0.2;
    
    // Find max value for scaling
    const maxValue = Math.max(...data.datasets[0].data || [1]);
    
    // Draw axes
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.stroke();
    
    // Draw bars
    data.labels.forEach((label, index) => {
      const value = data.datasets[0].data[index] || 0;
      const barHeight = (value / maxValue) * height;
      const barX = x + (index * (barWidth + barSpacing)) + barSpacing / 2;
      const barY = y + height - barHeight;
      
      // Draw bar
      ctx.fillStyle = data.datasets[0].backgroundColor || '#007bff';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Draw label
      ctx.fillStyle = '#495057';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, barX + barWidth / 2, y + height + 20);
      
      // Draw value
      ctx.fillText(value.toString(), barX + barWidth / 2, barY - 5);
    });
  }

  /**
   * Draw line chart
   */
  drawLineChart(ctx, x, y, width, height) {
    const data = this.config.data;
    if (!data.labels || !data.datasets || data.datasets.length === 0) {
      this.drawNoDataMessage(ctx, x, y, width, height);
      return;
    }

    const pointCount = data.labels.length;
    const stepX = width / (pointCount - 1);
    
    // Find max value for scaling
    const maxValue = Math.max(...data.datasets[0].data || [1]);
    
    // Draw axes
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.stroke();
    
    // Draw line
    ctx.strokeStyle = data.datasets[0].borderColor || '#007bff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.datasets[0].data.forEach((value, index) => {
      const pointX = x + (index * stepX);
      const pointY = y + height - ((value / maxValue) * height);
      
      if (index === 0) {
        ctx.moveTo(pointX, pointY);
      } else {
        ctx.lineTo(pointX, pointY);
      }
    });
    
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = data.datasets[0].backgroundColor || '#007bff';
    data.datasets[0].data.forEach((value, index) => {
      const pointX = x + (index * stepX);
      const pointY = y + height - ((value / maxValue) * height);
      
      ctx.beginPath();
      ctx.arc(pointX, pointY, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    // Draw labels
    ctx.fillStyle = '#495057';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    data.labels.forEach((label, index) => {
      const pointX = x + (index * stepX);
      ctx.fillText(label, pointX, y + height + 20);
    });
  }

  /**
   * Draw pie chart
   */
  drawPieChart(ctx, centerX, centerY, radius) {
    const data = this.config.data;
    if (!data.labels || !data.datasets || data.datasets.length === 0) {
      this.drawNoDataMessage(ctx, centerX - radius, centerY - radius, radius * 2, radius * 2);
      return;
    }

    const values = data.datasets[0].data || [];
    const total = values.reduce((sum, value) => sum + value, 0);
    
    if (total === 0) {
      this.drawNoDataMessage(ctx, centerX - radius, centerY - radius, radius * 2, radius * 2);
      return;
    }
    
    let currentAngle = -Math.PI / 2; // Start at top
    
    values.forEach((value, index) => {
      const sliceAngle = (value / total) * 2 * Math.PI;
      
      // Draw slice
      ctx.fillStyle = this.getSliceColor(index);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();
      
      // Draw label
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelRadius = radius * 0.7;
      const labelX = centerX + Math.cos(labelAngle) * labelRadius;
      const labelY = centerY + Math.sin(labelAngle) * labelRadius;
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(data.labels[index], labelX, labelY);
      
      currentAngle += sliceAngle;
    });
  }

  /**
   * Draw doughnut chart
   */
  drawDoughnutChart(ctx, centerX, centerY, radius) {
    this.drawPieChart(ctx, centerX, centerY, radius);
    
    // Draw inner circle to create doughnut effect
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
    ctx.fill();
  }

  /**
   * Draw no data message
   */
  drawNoDataMessage(ctx, x, y, width, height) {
    ctx.fillStyle = '#6c757d';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data available', x + width / 2, y + height / 2);
  }

  /**
   * Get color for slice/bar
   */
  getSliceColor(index) {
    const colors = [
      '#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8',
      '#6f42c1', '#e83e8c', '#fd7e14', '#20c997', '#6c757d'
    ];
    return colors[index % colors.length];
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return 'chart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Refresh chart
    const refreshBtn = this.element.querySelector('.refresh-chart');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.refresh();
      });
    }

    // Export chart
    const exportBtn = this.element.querySelector('.export-chart');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportChart();
      });
    }

    // Canvas click events
    const canvas = this.element.querySelector('.chart-canvas');
    if (canvas && this.config.onClick) {
      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.config.onClick(x, y, this.getClickedElement(x, y));
      });
    }

    // Responsive handling
    if (this.config.responsive) {
      window.addEventListener('resize', () => {
        this.handleResize();
      });
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    // Debounce resize events
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.initializeChart();
    }, 250);
  }

  /**
   * Get clicked element (simplified)
   */
  getClickedElement(x, y) {
    // This is a simplified implementation
    // In a real chart library, this would determine which bar/slice/point was clicked
    return { x, y, data: null };
  }

  /**
   * Update chart data
   * @param {Object} newData - New chart data
   */
  updateData(newData) {
    this.config.data = newData;
    this.initializeChart();
  }

  /**
   * Refresh chart
   */
  refresh() {
    this.initializeChart();
  }

  /**
   * Export chart as image
   */
  exportChart() {
    const canvas = this.element.querySelector('.chart-canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${this.config.title || 'chart'}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  }

  /**
   * Destroy the chart and clean up
   */
  destroy() {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

// Make available globally
window.PluginChart = PluginChart;

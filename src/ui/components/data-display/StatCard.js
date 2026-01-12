/**
 * StatCard - Reusable metric display component
 * 
 * A card component for displaying key statistics and metrics with optional trend indicators.
 * Follows the Economy Dashboard mockup design with dark theme styling.
 * 
 * @component
 * @example
 * // Basic stat card
 * const statCard = new StatCard({
 *   label: 'Total Users',
 *   value: 1250,
 *   icon: '👥'
 * });
 * const html = statCard.render();
 * 
 * @example
 * // Stat card with trend indicator
 * const statCard = new StatCard({
 *   label: 'Active Sessions',
 *   value: 847,
 *   icon: '🔥',
 *   trend: { value: 12.5, direction: 'up' }
 * });
 * 
 * @example
 * // Stat card with negative trend
 * const statCard = new StatCard({
 *   label: 'Error Rate',
 *   value: '2.3%',
 *   icon: '⚠️',
 *   trend: { value: 3.2, direction: 'down' }
 * });
 * 
 * @param {Object} config - StatCard configuration
 * @param {string} config.label - Display label for the metric (e.g., "Total Users")
 * @param {string|number} config.value - The metric value to display (e.g., 1250 or "1,250")
 * @param {string} [config.icon] - Optional emoji or icon for the stat
 * @param {Object} [config.trend] - Optional trend data showing change over time
 * @param {number} config.trend.value - Percentage change value (e.g., 12.5 for 12.5%)
 * @param {'up'|'down'} config.trend.direction - Trend direction (up = positive, down = negative)
 * @returns {string} HTML string for the stat card
 */
class StatCard {
  constructor(config) {
    this.config = {
      label: '',
      value: '',
      icon: '',
      trend: null,
      ...config
    };
  }

  /**
   * Format the value for display (add commas for large numbers if needed)
   * @private
   */
  _formatValue(value) {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  }

  /**
   * Render the trend indicator HTML
   * @private
   */
  _renderTrend() {
    const { trend } = this.config;
    
    if (!trend || !trend.value || !trend.direction) {
      return '';
    }

    const trendClass = trend.direction === 'up' 
      ? 'stat-card__trend stat-card__trend--up' 
      : 'stat-card__trend stat-card__trend--down';
    
    const trendIcon = trend.direction === 'up' ? '↑' : '↓';
    const trendValue = Math.abs(trend.value).toFixed(1);

    return `
      <div class="${trendClass}">
        <span class="stat-card__trend-icon">${trendIcon}</span>
        <span class="stat-card__trend-value">${trendValue}%</span>
        <span class="stat-card__trend-label">vs last period</span>
      </div>
    `;
  }

  /**
   * Render the complete StatCard component
   * @returns {string} HTML string for the stat card
   */
  render() {
    const { label, value, icon } = this.config;
    const formattedValue = this._formatValue(value);
    const trendHtml = this._renderTrend();

    return `
      <div class="stat-card">
        ${icon ? `<div class="stat-card__icon">${icon}</div>` : ''}
        <div class="stat-card__content">
          <div class="stat-card__label">${label}</div>
          <div class="stat-card__value">${formattedValue}</div>
          ${trendHtml}
        </div>
      </div>
    `;
  }
}

export default StatCard;
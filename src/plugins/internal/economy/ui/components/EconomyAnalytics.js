/**
 * EconomyAnalytics - Refactored with Chart.js
 * Story 6.14: Refactor Economy Analytics with Chart.js Integration
 */

import { CardContainer } from '../../../../../../ui/components/layout/CardContainer.js';
import { StatCard } from '../../../../../../ui/components/data-display/StatCard.js';

class EconomyAnalytics {
    constructor(container) {
        this.container = container;
        this.analyticsData = {};
        this.charts = {};

        // Assume Chart.js is loaded globally via a script tag in index.html
        this.Chart = window.Chart;

        this.init();
    }

    async init() {
        if (!this.Chart) {
            this.container.innerHTML = `<div class="error-message">Chart.js library not loaded.</div>`;
            return;
        }
        try {
            await this.loadData();
            this.render();
            this.initializeCharts();
        } catch (error) {
            console.error('Failed to initialize Economy Analytics:', error);
            this.container.innerHTML = `<div class="error-message">Failed to load Economy Analytics.</div>`;
        }
    }

    async loadData() {
        // Mock data fetching
        this.analyticsData = this.getMockAnalyticsData();
    }

    render() {
        const summaryContent = this.renderSummaryStats();
        const chartsContent = this.renderChartContainers();

        const mainCard = new CardContainer({
            title: 'Economy Analytics',
            content: summaryContent + chartsContent,
        });

        this.container.innerHTML = '';
        this.container.appendChild(mainCard.render());
    }

    renderSummaryStats() {
        const stats = [
            new StatCard({ label: 'Total Volume', value: this.analyticsData.summary.totalVolume, icon: '💰' }).render(),
            new StatCard({ label: 'Total Transactions', value: this.analyticsData.summary.totalTransactions, icon: '📊' }).render(),
            new StatCard({ label: 'Active Users', value: this.analyticsData.summary.activeUsers, icon: '👥' }).render(),
        ];
        return `<div class="stat-card-row">${stats.join('')}</div>`;
    }

    renderChartContainers() {
        const charts = [
            { id: 'balance-distribution-chart', title: 'Balance Distribution' },
            { id: 'transaction-volume-chart', title: 'Transaction Volume' },
            { id: 'user-growth-chart', title: 'User Growth' },
        ];

        return charts.map(chart => {
            const card = new CardContainer({
                title: chart.title,
                content: `<canvas id="${chart.id}"></canvas>`,
            });
            // This is a bit of a hack since CardContainer returns a DOM element
            return card.render().outerHTML;
        }).join('');
    }

    initializeCharts() {
        this.initializeBalanceDistributionChart();
        this.initializeTransactionVolumeChart();
        this.initializeUserGrowthChart();
    }

    initializeBalanceDistributionChart() {
        const ctx = document.getElementById('balance-distribution-chart').getContext('2d');
        this.charts.balanceDistribution = new this.Chart(ctx, {
            type: 'pie',
            data: this.analyticsData.balanceDistribution,
            options: this.getChartOptions('Balance Distribution'),
        });
    }

    initializeTransactionVolumeChart() {
        const ctx = document.getElementById('transaction-volume-chart').getContext('2d');
        this.charts.transactionVolume = new this.Chart(ctx, {
            type: 'bar',
            data: this.analyticsData.transactionVolume,
            options: this.getChartOptions('Transaction Volume'),
        });
    }

    initializeUserGrowthChart() {
        const ctx = document.getElementById('user-growth-chart').getContext('2d');
        this.charts.userGrowth = new this.Chart(ctx, {
            type: 'line',
            data: this.analyticsData.userGrowth,
            options: this.getChartOptions('User Growth'),
        });
    }

    getChartOptions(title) {
        // In a real scenario, we would fetch these from the theme CSS variables
        const textColor = '#ffffff';
        const gridColor = 'rgba(255, 255, 255, 0.1)';

        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: title, color: textColor },
                legend: { labels: { color: textColor } },
            },
            scales: {
                x: { ticks: { color: textColor }, grid: { color: gridColor } },
                y: { ticks: { color: textColor }, grid: { color: gridColor } },
            },
        };
    }

    getMockAnalyticsData() {
        return {
            summary: { totalVolume: 152034, totalTransactions: 842, activeUsers: 120 },
            balanceDistribution: {
                labels: ['< 100', '100 - 1k', '1k - 10k', '> 10k'],
                datasets: [{
                    label: 'User Balances',
                    data: [50, 45, 20, 5],
                    backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545'],
                }],
            },
            transactionVolume: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Transactions',
                    data: [65, 59, 80, 81, 56, 55, 40],
                    backgroundColor: '#17a2b8',
                }],
            },
            userGrowth: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'New Users',
                    data: [10, 15, 12, 18, 22, 30],
                    borderColor: '#e83e8c',
                    tension: 0.1,
                }],
            },
        };
    }
}

// new EconomyAnalytics(document.getElementById('economy-analytics-container'));
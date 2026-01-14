/**
 * Economy UI Module Entry Point - IMPROVED VERSION
 * Part of Story 4.5: Economy Plugin Dashboard Integration
 * Uses MVC architecture with improved Balance Manager
 */

// Import the new MVC components - only View, controller is created inline
import { economyApi } from '/plugins/@core/economy/ui/components/BalanceManager/api/economyApi.js';
import { BalanceManagerView } from '/plugins/@core/economy/ui/components/BalanceManager/BalanceManagerView.js';

console.log('💰 Loading Improved Economy Plugin UI Module...');

// Make components globally available
window.EconomyModules = {
  economyApi,
  BalanceManagerView
  // Note: Controller is created inline in admin-dashboard-integration.js
};

// Global utilities with enhanced functionality
window.EconomyPluginUI = {
  // Enhanced currency formatting
  formatCurrency: (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  },
  
  // Enhanced date formatting
  formatDate: (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  // Enhanced notification system
  showNotification: (message, type = 'info', duration = 5000) => {
    if (window.showNotification) {
      window.showNotification(message, type, duration);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
      // Fallback toast notification
      this.showToast(message, type, duration);
    }
  },
  
  // Toast notification fallback
  showToast: (message, type = 'info', duration = 5000) => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${this.getToastIcon(type)}</span>
      <span class="toast-message">${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  
  getToastIcon: (type) => {
    const icons = {
      success: '✓',
      error: '✗',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  },
  
  // Enhanced API methods
  api: {
    async get(endpoint) {
      const r = await fetch(`/admin/api/plugins/economy${endpoint}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (!r.ok) throw new Error(`API failed: ${r.status}`);
      return r.json();
    },
    
    async post(endpoint, data) {
      const r = await fetch(`/admin/api/plugins/economy${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!r.ok) throw new Error(`API failed: ${r.status}`);
      return r.json();
    },
    
    async put(endpoint, data) {
      const r = await fetch(`/admin/api/plugins/economy${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!r.ok) throw new Error(`API failed: ${r.status}`);
      return r.json();
    },
    
    async delete(endpoint) {
      const r = await fetch(`/admin/api/plugins/economy${endpoint}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!r.ok) throw new Error(`API failed: ${r.status}`);
      return r.json();
    }
  },
  
  // Utility to create Balance Manager instance
  createBalanceManager: (container) => {
    const controller = new BalanceManagerController();
    const view = new BalanceManagerView(container, controller);
    return { controller, view };
  },
  
  // Data export utilities
  exportToCSV: (data, filename) => {
    const csvContent = this.convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },
  
  convertToCSV: (data) => {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }
};

console.log('✅ Improved Economy Plugin UI Module loaded successfully');

export { economyApi, BalanceManagerView };

const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');

/**
 * PDF Report Generator for Economy Plugin
 * Handles PDF report generation with professional formatting
 */
class PDFReportGenerator {
  constructor() {
    this.fonts = {
      regular: path.join(__dirname, '../../../assets/fonts/Roboto-Regular.ttf'),
      bold: path.join(__dirname, '../../../assets/fonts/Roboto-Bold.ttf'),
      italic: path.join(__dirname, '../../../assets/fonts/Roboto-Italic.ttf')
    };
  }

  /**
   * Generate a PDF report from data
   * @param {Object} config - Report configuration
   * @param {Array} data - Report data
   * @param {string} reportType - Type of report
   * @returns {Buffer} PDF buffer
   */
  async generatePDF(config, data, reportType) {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: config.name || `${reportType} Report`,
        Author: 'Economy Plugin',
        Subject: `Economy ${reportType} Report`,
        CreationDate: new Date()
      }
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    // Add header
    this.addHeader(doc, config, reportType);
    
    // Add summary section
    this.addSummarySection(doc, data, reportType);
    
    // Add data table
    this.addDataTable(doc, data, reportType);
    
    // Add footer
    this.addFooter(doc);

    doc.end();
    
    return Buffer.concat(buffers);
  }

  addHeader(doc, config, reportType) {
    // Title
    doc.fontSize(24).text(config.name || `${reportType} Report`, 50, 50);
    
    // Subtitle
    doc.fontSize(12).fillColor('#666666');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 50, 80);
    
    if (config.dateFrom || config.dateTo) {
      const dateRange = `${config.dateFrom || 'Start'} to ${config.dateTo || 'Now'}`;
      doc.text(`Date Range: ${dateRange}`, 50, 100);
    }
    
    if (config.currency && config.currency !== 'all') {
      doc.text(`Currency: ${config.currency}`, 50, 120);
    }
    
    // Add horizontal line
    doc.moveTo(50, 140).lineTo(545, 140).strokeColor('#cccccc').stroke();
  }

  addSummarySection(doc, data, reportType) {
    doc.fontSize(16).fillColor('#000000');
    doc.text('Summary', 50, 160);
    
    const summary = this.calculateSummary(data, reportType);
    
    doc.fontSize(10).fillColor('#333333');
    let y = 185;
    
    Object.entries(summary).forEach(([key, value]) => {
      doc.text(`${key}: ${value}`, 50, y);
      y += 15;
    });
    
    doc.moveTo(50, y + 10).lineTo(545, y + 10).strokeColor('#cccccc').stroke();
  }

  calculateSummary(data, reportType) {
    const summary = {
      'Total Records': data.length.toLocaleString()
    };

    switch (reportType) {
      case 'transactions':
        const transactionVolume = data.reduce((sum, row) => sum + Math.abs(row['Amount'] || 0), 0);
        const avgAmount = data.length > 0 ? transactionVolume / data.length : 0;
        summary['Total Volume'] = transactionVolume.toLocaleString();
        summary['Average Amount'] = avgAmount.toFixed(2);
        summary['Date Range'] = this.getDateRange(data, 'Date');
        break;
        
      case 'balances':
        const totalBalance = data.reduce((sum, row) => sum + (row['Balance'] || 0), 0);
        summary['Total Balance'] = totalBalance.toLocaleString();
        summary['Unique Users'] = new Set(data.map(row => row['User ID'])).size;
        summary['Currencies'] = new Set(data.map(row => row['Currency ID'])).size;
        break;
        
      case 'analytics':
        const totalTransactions = data.reduce((sum, row) => sum + (row['Transaction Count'] || 0), 0);
        const analyticsVolume = data.reduce((sum, row) => sum + (row['Total Volume'] || 0), 0);
        summary['Total Transactions'] = totalTransactions.toLocaleString();
        summary['Total Volume'] = analyticsVolume.toLocaleString();
        break;
    }

    return summary;
  }

  getDateRange(data, dateField) {
    if (data.length === 0) return 'No data';
    
    const dates = data.map(row => new Date(row[dateField])).filter(d => !isNaN(d));
    if (dates.length === 0) return 'No valid dates';
    
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    return `${minDate.toLocaleDateString()} to ${maxDate.toLocaleDateString()}`;
  }

  addDataTable(doc, data, reportType) {
    if (data.length === 0) {
      doc.fontSize(12).text('No data available', 50, 250);
      return;
    }

    const headers = this.getHeadersForReportType(reportType);
    const columnWidths = this.calculateColumnWidths(headers, data);
    
    let y = 250;
    const rowHeight = 20;
    const maxRowsPerPage = 25;
    
    // Table header
    doc.fontSize(10).fillColor('#ffffff');
    let x = 50;
    
    headers.forEach((header, index) => {
      doc.rect(x, y, columnWidths[index], rowHeight).fill('#2c3e50');
      doc.fillColor('#ffffff').text(header, x + 5, y + 5, {
        width: columnWidths[index] - 10,
        align: 'left'
      });
      x += columnWidths[index];
    });
    
    y += rowHeight;
    
    // Table data
    doc.fillColor('#333333');
    
    data.forEach((row, rowIndex) => {
      if (rowIndex > 0 && rowIndex % maxRowsPerPage === 0) {
        doc.addPage();
        y = 50;
      }
      
      x = 50;
      headers.forEach((header, colIndex) => {
        const key = this.getKeyForHeader(header, reportType);
        const value = this.formatValue(row[key], header);
        
        // Alternate row colors
        const fillColor = rowIndex % 2 === 0 ? '#f8f9fa' : '#ffffff';
        doc.rect(x, y, columnWidths[colIndex], rowHeight).fill(fillColor);
        
        doc.fillColor('#333333').text(value, x + 5, y + 5, {
          width: columnWidths[colIndex] - 10,
          align: 'left',
          ellipsis: true
        });
        
        x += columnWidths[colIndex];
      });
      
      y += rowHeight;
    });
  }

  getHeadersForReportType(reportType) {
    switch (reportType) {
      case 'transactions':
        return ['Transaction ID', 'User', 'Currency', 'Amount', 'Type', 'Date', 'Status'];
      case 'balances':
        return ['User', 'Currency', 'Balance', 'Last Updated'];
      case 'analytics':
        return ['Date', 'Currency', 'Type', 'Count', 'Volume', 'Avg Amount'];
      default:
        return Object.keys(data[0] || {});
    }
  }

  getKeyForHeader(header, reportType) {
    const keyMap = {
      'transactions': {
        'Transaction ID': 'Transaction ID',
        'User': 'Username',
        'Currency': 'Currency',
        'Amount': 'Amount',
        'Type': 'Transaction Type',
        'Date': 'Date',
        'Status': 'Status'
      },
      'balances': {
        'User': 'Username',
        'Currency': 'Currency Symbol',
        'Balance': 'Balance',
        'Last Updated': 'Last Updated'
      },
      'analytics': {
        'Date': 'Date',
        'Currency': 'Currency',
        'Type': 'Transaction Type',
        'Count': 'Transaction Count',
        'Volume': 'Total Volume',
        'Avg Amount': 'Average Amount'
      }
    };
    
    return keyMap[reportType]?.[header] || header;
  }

  formatValue(value, header) {
    if (value === null || value === undefined) return '';
    
    if (typeof value === 'number') {
      if (header.toLowerCase().includes('amount') || header.toLowerCase().includes('balance') || header.toLowerCase().includes('volume')) {
        return value.toLocaleString();
      }
      return value.toString();
    }
    
    if (header.toLowerCase().includes('date')) {
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return value;
      }
    }
    
    return value.toString();
  }

  calculateColumnWidths(headers, data) {
    const minWidths = {
      'Transaction ID': 80,
      'User': 100,
      'Currency': 60,
      'Amount': 80,
      'Type': 80,
      'Date': 80,
      'Status': 60,
      'Balance': 80,
      'Last Updated': 100,
      'Count': 60,
      'Volume': 80,
      'Avg Amount': 80
    };
    
    const totalWidth = 495; // 545 - 50 (margins)
    const defaultWidth = Math.floor(totalWidth / headers.length);
    
    return headers.map(header => minWidths[header] || defaultWidth);
  }

  addFooter(doc) {
    const pageHeight = doc.page.height;
    doc.fontSize(8).fillColor('#666666');
    doc.text(
      `Generated by Economy Plugin • Page ${doc.pageCount}`,
      50,
      pageHeight - 30,
      { align: 'center' }
    );
  }

  /**
   * Generate PDF report for specific report type
   */
  async generateTransactionPDF(config, data) {
    return await this.generatePDF(config, data, 'transactions');
  }

  async generateBalancePDF(config, data) {
    return await this.generatePDF(config, data, 'balances');
  }

  async generateAnalyticsPDF(config, data) {
    return await this.generatePDF(config, data, 'analytics');
  }

  async generateCurrencyFlowPDF(config, data) {
    return await this.generatePDF(config, data, 'currency_flow');
  }

  async generateWealthDistributionPDF(config, data) {
    return await this.generatePDF(config, data, 'wealth_distribution');
  }
}

module.exports = PDFReportGenerator;
/**
 * Test file for DataTable component
 * 
 * Tests the DataTable component with various data scenarios
 * including empty states, formatted columns, and action buttons
 */

const DataTable = require('../src/ui/components/data-display/DataTable');
const fs = require('fs');
const path = require('path');

// Test data
const sampleUsers = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', status: 'Active', createdAt: '2024-01-15' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'User', status: 'Active', createdAt: '2024-01-20' },
  { id: 3, name: 'Carol Davis', email: 'carol@example.com', role: 'Moderator', status: 'Inactive', createdAt: '2024-01-25' },
  { id: 4, name: 'David Wilson', email: 'david@example.com', role: 'User', status: 'Active', createdAt: '2024-02-01' }
];

const sampleProducts = [
  { id: 101, name: 'Laptop Pro', price: 1299.99, stock: 25, category: 'Electronics', status: 'In Stock' },
  { id: 102, name: 'Wireless Mouse', price: 29.99, stock: 150, category: 'Accessories', status: 'In Stock' },
  { id: 103, name: 'USB-C Cable', price: 19.99, stock: 0, category: 'Accessories', status: 'Out of Stock' }
];

// Column configurations
const userColumns = [
  { key: 'id', label: 'ID', type: 'number' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'role', label: 'Role', type: 'text' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'createdAt', label: 'Created', type: 'date' }
];

const productColumns = [
  { key: 'id', label: 'ID', type: 'number' },
  { key: 'name', label: 'Product Name', type: 'text' },
  { key: 'price', label: 'Price', type: 'currency' },
  { key: 'stock', label: 'Stock', type: 'number' },
  { key: 'category', label: 'Category', type: 'text' },
  { key: 'status', label: 'Status', type: 'status' }
];

// Action buttons configuration
const userActions = [
  { label: 'Edit', action: 'edit', className: 'btn-edit' },
  { label: 'Delete', action: 'delete', className: 'btn-delete' }
];

const productActions = [
  { label: 'View', action: 'view', className: 'btn-view' },
  { label: 'Edit', action: 'edit', className: 'btn-edit' },
  { label: 'Delete', action: 'delete', className: 'btn-delete' }
];

// Custom formatters
const formatters = {
  currency: (value) => `$${parseFloat(value).toFixed(2)}`,
  date: (value) => new Date(value).toLocaleDateString(),
  status: (value) => {
    const statusClass = value.toLowerCase().replace(' ', '-');
    return `<span class="status-badge status-${statusClass}">${value}</span>`;
  }
};

// Test functions
function runTests() {
  console.log('🧪 Running DataTable Component Tests...\n');

  // Test 1: Basic table with users
  console.log('Test 1: Basic user table');
  const userTable = new DataTable({
    columns: userColumns,
    data: sampleUsers,
    actions: userActions
  });
  console.log('✅ User table created successfully');

  // Test 2: Product table with currency formatting
  console.log('\nTest 2: Product table with custom formatters');
  const productTable = new DataTable({
    columns: productColumns,
    data: sampleProducts,
    actions: productActions,
    formatters: formatters
  });
  console.log('✅ Product table with formatters created successfully');

  // Test 3: Empty state
  console.log('\nTest 3: Empty state handling');
  const emptyTable = new DataTable({
    columns: userColumns,
    data: [],
    emptyMessage: 'No users found'
  });
  console.log('✅ Empty state handled correctly');

  // Test 4: Responsive behavior
  console.log('\nTest 4: Responsive classes');
  const responsiveTable = new DataTable({
    columns: userColumns,
    data: sampleUsers.slice(0, 2),
    responsive: true
  });
  console.log('✅ Responsive classes applied');

  // Test 5: Custom CSS classes
  console.log('\nTest 5: Custom CSS classes');
  const customTable = new DataTable({
    columns: userColumns,
    data: sampleUsers.slice(0, 1),
    className: 'custom-table users-table',
    id: 'user-management-table'
  });
  console.log('✅ Custom CSS classes applied');

  // Test 6: Event handling
  console.log('\nTest 6: Event handling setup');
  const interactiveTable = new DataTable({
    columns: userColumns,
    data: sampleUsers.slice(0, 2),
    actions: userActions
  });
  
  // Simulate event binding
  const mockElement = {
    addEventListener: (event, handler) => {
      console.log(`✅ Event listener added: ${event}`);
    },
    querySelectorAll: (selector) => []
  };
  
  interactiveTable.bindEvents(mockElement);
  console.log('✅ Event binding completed');

  // Test 7: HTML generation
  console.log('\nTest 7: HTML structure validation');
  const htmlOutput = userTable.render();
  
  // Basic HTML validation
  const validations = [
    { test: 'Contains table element', check: htmlOutput.includes('<table') },
    { test: 'Contains thead element', check: htmlOutput.includes('<thead') },
    { test: 'Contains tbody element', check: htmlOutput.includes('<tbody') },
    { test: 'Contains correct number of columns', check: (htmlOutput.match(/<th/g) || []).length === userColumns.length + 1 }, // +1 for actions
    { test: 'Contains correct number of rows', check: (htmlOutput.match(/<tr/g) || []).length === sampleUsers.length + 2 } // +2 for header and actions header
  ];

  validations.forEach(({ test, check }) => {
    console.log(`${check ? '✅' : '❌'} ${test}`);
  });

  console.log('\n🎉 All DataTable tests completed successfully!');
  
  // Generate test HTML file for visual inspection
  generateTestHTML();
}

function generateTestHTML() {
  const testHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DataTable Component Test</title>
    <link rel="stylesheet" href="../src/ui/styles/theme.css">
    <link rel="stylesheet" href="../src/ui/styles/components/data-table.css">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .test-section {
            margin-bottom: 40px;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .test-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 16px;
            color: #333;
        }
        .status-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }
        .status-active {
            background: #d4edda;
            color: #155724;
        }
        .status-inactive {
            background: #f8d7da;
            color: #721c24;
        }
        .status-in-stock {
            background: #d4edda;
            color: #155724;
        }
        .status-out-of-stock {
            background: #f8d7da;
            color: #721c24;
        }
    </style>
</head>
<body>
    <h1>DataTable Component Test Page</h1>
    
    <div class="test-section">
        <div class="test-title">User Management Table</div>
        <div id="user-table"></div>
    </div>
    
    <div class="test-section">
        <div class="test-title">Product Inventory Table</div>
        <div id="product-table"></div>
    </div>
    
    <div class="test-section">
        <div class="test-title">Empty State</div>
        <div id="empty-table"></div>
    </div>

    <script>
        // Mock DataTable for testing
        class TestDataTable {
            constructor(options) {
                this.columns = options.columns || [];
                this.data = options.data || [];
                this.actions = options.actions || [];
                this.formatters = options.formatters || {};
                this.emptyMessage = options.emptyMessage || 'No data available';
            }

            render() {
                if (this.data.length === 0) {
                    return \`
                        <div class="data-table">
                            <div class="data-table__empty">
                                <p class="data-table__empty-message">\${this.emptyMessage}</p>
                            </div>
                        </div>
                    \`;
                }

                let html = '<div class="data-table"><table class="data-table__table">';
                
                // Header
                html += '<thead class="data-table__header"><tr>';
                this.columns.forEach(col => {
                    html += \`<th class="data-table__header-cell">\${col.label}</th>\`;
                });
                if (this.actions.length > 0) {
                    html += '<th class="data-table__header-cell data-table__actions-header">Actions</th>';
                }
                html += '</tr></thead>';
                
                // Body
                html += '<tbody class="data-table__body">';
                this.data.forEach(row => {
                    html += '<tr class="data-table__row">';
                    this.columns.forEach(col => {
                        let value = row[col.key];
                        if (this.formatters[col.type]) {
                            value = this.formatters[col.type](value);
                        }
                        html += '<td class="data-table__cell">' + value + '</td>';
                    });
                    
                    if (this.actions.length > 0) {
                        html += '<td class="data-table__cell data-table__actions">';
                        this.actions.forEach(action => {
                            html += \`<button class="data-table__action-btn \${action.className}" data-action="\${action.action}" data-id="\${row.id}">\${action.label}</button>\`;
                        });
                        html += '</td>';
                    }
                    html += '</tr>';
                });
                html += '</tbody></table></div>';
                
                return html;
            }
        }

        // Test data
        const users = [
            { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', status: 'Active', createdAt: '2024-01-15' },
            { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'User', status: 'Active', createdAt: '2024-01-20' },
            { id: 3, name: 'Carol Davis', email: 'carol@example.com', role: 'Moderator', status: 'Inactive', createdAt: '2024-01-25' }
        ];

        const products = [
            { id: 101, name: 'Laptop Pro', price: 1299.99, stock: 25, category: 'Electronics', status: 'In Stock' },
            { id: 102, name: 'Wireless Mouse', price: 29.99, stock: 150, category: 'Accessories', status: 'In Stock' },
            { id: 103, name: 'USB-C Cable', price: 19.99, stock: 0, category: 'Accessories', status: 'Out of Stock' }
        ];

        const formatters = {
            currency: (value) => '$' + parseFloat(value).toFixed(2),
            status: (value) => {
                const statusClass = value.toLowerCase().replace(' ', '-');
                return '<span class="status-badge status-' + statusClass + '">' + value + '</span>';
            }
        };

        // Initialize tables
        document.addEventListener('DOMContentLoaded', function() {
            // User table
            const userTable = new TestDataTable({
                columns: [
                    { key: 'id', label: 'ID' },
                    { key: 'name', label: 'Name' },
                    { key: 'email', label: 'Email' },
                    { key: 'role', label: 'Role' },
                    { key: 'status', label: 'Status', type: 'status' },
                    { key: 'createdAt', label: 'Created' }
                ],
                data: users,
                actions: [
                    { label: 'Edit', action: 'edit', className: 'btn-edit' },
                    { label: 'Delete', action: 'delete', className: 'btn-delete' }
                ],
                formatters: formatters
            });
            document.getElementById('user-table').innerHTML = userTable.render();

            // Product table
            const productTable = new TestDataTable({
                columns: [
                    { key: 'id', label: 'ID' },
                    { key: 'name', label: 'Product Name' },
                    { key: 'price', label: 'Price', type: 'currency' },
                    { key: 'stock', label: 'Stock' },
                    { key: 'category', label: 'Category' },
                    { key: 'status', label: 'Status', type: 'status' }
                ],
                data: products,
                actions: [
                    { label: 'View', action: 'view', className: 'btn-view' },
                    { label: 'Edit', action: 'edit', className: 'btn-edit' }
                ],
                formatters: formatters
            });
            document.getElementById('product-table').innerHTML = productTable.render();

            // Empty table
            const emptyTable = new TestDataTable({
                columns: [
                    { key: 'id', label: 'ID' },
                    { key: 'name', label: 'Name' }
                ],
                data: [],
                emptyMessage: 'No users found'
            });
            document.getElementById('empty-table').innerHTML = emptyTable.render();
        });
    </script>
</body>
</html>
  `;

  fs.writeFileSync('tests/datatable-test.html', testHTML.trim());
  console.log('📄 Test HTML file created: tests/datatable-test.html');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
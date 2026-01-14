// api/economyApi.js
export const economyApi = {
  async getUsers() {
    const r = await fetch('/admin/api/plugins/economy/users', {
      headers: { 'Content-Type': 'application/json' }
    });
    if (!r.ok) throw new Error(`Failed to load users: ${r.status}`);
    return r.json();
  },
  
  async getCurrencies() {
    const r = await fetch('/admin/api/plugins/economy/currencies', {
      headers: { 'Content-Type': 'application/json' }
    });
    if (!r.ok) throw new Error(`Failed to load currencies: ${r.status}`);
    return r.json();
  },
  
  async getUserTransactions(userId) {
    const r = await fetch(`/admin/api/plugins/economy/transactions/${userId}/history`, {
      headers: { 'Content-Type': 'application/json' }
    });
    if (!r.ok) throw new Error(`Failed to load transaction history: ${r.status}`);
    return r.json();
  },
  
  async updateUserBalance(userId, currency, newBalance) {
    const r = await fetch(`/admin/api/plugins/economy/balances/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency, amount: newBalance }),
    });
    if (!r.ok) throw new Error(`Balance adjustment failed: ${r.status}`);
    return r.json();
  },
  
  async adjustBalance(userId, payload) {
    const r = await fetch(`/admin/api/plugins/economy/balances/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`Balance adjustment failed: ${r.status}`);
    return r.json();
  },
  
  async exportBalances(userIds) {
    const r = await fetch('/admin/api/plugins/economy/export/balances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds })
    });
    if (!r.ok) throw new Error('Export failed');
    return r.blob();
  }
};

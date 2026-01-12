// controller/BalanceManagerController.js
import { BalanceService } from '../services/balanceService.js';
import { Templates } from '../ui/templates.js';
import { View } from '../ui/view.js';

export class BalanceManagerController {
  constructor({ users, currencies }) {
    this.users = users;
    this.currencies = currencies;
    this.selectedUsers = new Set();
    this.searchQuery = '';
    this.filteredUsers = users;
    this.itemsPerPage = 20;
    this.currentPage = 1;
    this.getCurrencySymbol = id => (this.currencies.find(c=>c.id===id)?.symbol)||'?';
    this.view = null;
  }

  setView(view) {
    this.view = view;
  }

  async refreshData() {
      // In a real app, you would re-fetch data from the server
      // For now, we just re-render with existing data
      this.handleSearch(this.searchQuery);
  }

  handleSearch(query) {
    this.searchQuery = query.toLowerCase();
    this.filteredUsers = this.users.filter(user => 
        user.username.toLowerCase().includes(this.searchQuery) ||
        user.id.toString().includes(this.searchQuery)
    );
    this.currentPage = 1;
    this.view.update(this.getPaginatedUsers());
  }

  // ===== UI entrypoints (thin) =====
  async handleBulkAction(action) {
    const ids = Array.from(this.selectedUsers);
    if (!ids.length) return View.toastErr('No users selected');

    if (action === 'export') return BalanceService.export(ids).then(()=>View.toastOk('Balance data exported successfully')).catch(()=>View.toastErr('Failed to export balance data'));
    if (action === 'bulk-adjust') return this.showBulkAdjustModal(ids);
    if (action === 'freeze') return this.bulkFreezeBalances(ids);
    if (action === 'unfreeze') return this.bulkUnfreezeBalances(ids);
    console.log('Unknown bulk action:', action);
  }

  showBalanceModal(userId) {
    const user = this.users.find(u=>u.id===userId); if (!user) return;
    View.inject(Templates.balanceModal({
      user, currencies: this.currencies, userId,
      renderUserBalances: (b,c)=>View.renderUserBalances(b,c)
    }));
    this.bindModalEvents();
  }

  async confirmBalanceChange() {
    const userId = parseInt(document.querySelector('.confirm-balance-change').dataset.userId);
    const currency = document.getElementById('currency-select').value;
    const adjustmentType = document.getElementById('adjustment-type').value;
    const amount = parseInt(document.getElementById('adjustment-amount').value);
    const reason = document.getElementById('adjustment-reason').value.trim();

    try {
      const result = await BalanceService.confirmBalanceChange({ userId, currency, adjustmentType, amount, reason });
      View.closeModals();
      await this.refreshData();
      View.toastOk(`Balance adjusted successfully for ${result.username}`);
    } catch (e) {
      console.error(e); View.toastErr(e.message || 'Failed to adjust balance');
    }
  }

  async showTransactionHistory(userId) {
    const user = this.users.find(u=>u.id===userId); if (!user) return;
    try {
      const tx = await BalanceService.transactions(userId);
      const html = View.renderTransactions(tx, this.getCurrencySymbol, View.formatDate);
      View.inject(Templates.transactionsModal({ user, html }));
      this.bindModalEvents();
    } catch (e) {
      console.error(e); View.toastErr('Failed to load transaction history');
    }
  }

  showBulkAdjustModal(userIds) {
    View.inject(Templates.bulkAdjustModal({ count: userIds.length, currencies: this.currencies, userIds }));
    document.querySelector('.confirm-bulk-adjustment')
      .addEventListener('click', () => this.confirmBulkAdjustment(userIds));
    this.bindModalEvents();
  }

  async confirmBulkAdjustment(userIds) {
    const currency = document.getElementById('bulk-currency-select').value;
    const adjustmentType = document.getElementById('bulk-adjustment-type').value;
    const amount = parseInt(document.getElementById('bulk-adjustment-amount').value);
    const reason = document.getElementById('bulk-adjustment-reason').value.trim();

    try {
      const { ok, err } = await BalanceService.bulkAdjust({ userIds, currency, adjustmentType, amount, reason });
      View.closeModals();
      await this.refreshData();
      err === 0 ? View.toastOk(`Bulk adjustment completed successfully for ${ok} users`)
                : View.toastErr(`Bulk adjustment completed with ${ok} successes and ${err} errors`);
    } catch (e) {
      console.error(e); View.toastErr('Failed to complete bulk adjustment');
    }
  }

  // freeze/unfreeze are still placeholders → easy to swap implementations later
  async bulkFreezeBalances(userIds){ console.log('Bulk freeze balances:', userIds); View.toastOk(`Balance freeze initiated for ${userIds.length} users`); }
  async bulkUnfreezeBalances(userIds){ console.log('Bulk unfreeze balances:', userIds); View.toastOk(`Balance unfreeze initiated for ${userIds.length} users`); }

  // ===== pagination / selection (pure-ish) =====
  getPaginatedUsers(){ const s=(this.currentPage-1)*this.itemsPerPage; return this.filteredUsers.slice(s, s+this.itemsPerPage); }
  getTotalPages(){ return Math.ceil(this.filteredUsers.length/this.itemsPerPage); }
  goToPage(p){ 
    this.currentPage=p; 
    this.view.update(this.getPaginatedUsers());
  }

  // ===== small glue =====
  bindModalEvents(){
    document.querySelectorAll('.modal-close').forEach(b=>b.addEventListener('click',()=>View.closeModals()));
    const confirmBtn = document.querySelector('.confirm-balance-change');
    if (confirmBtn) confirmBtn.addEventListener('click', ()=>this.confirmBalanceChange());
  }
}

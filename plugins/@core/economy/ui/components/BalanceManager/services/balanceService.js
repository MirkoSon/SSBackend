// services/balanceService.js
import { EconomyAPI } from '../api/economyApi.js';

export const BalanceService = {
  async confirmBalanceChange({ userId, currency, adjustmentType, amount, reason }) {
    if (!currency || !amount || !reason) throw new Error('All fields are required');
    return EconomyAPI.adjustBalance(userId, { currency, adjustmentType, amount, reason });
  },

  async bulkAdjust({ userIds, currency, adjustmentType, amount, reason, batchSize = 10 }) {
    if (!currency || !amount || !reason) throw new Error('All fields are required');
    let ok = 0, err = 0;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(uid =>
          EconomyAPI.adjustBalance(uid, { currency, adjustmentType, amount, reason: `Bulk adjustment: ${reason}` })
            .then(() => 'ok')
            .catch(() => 'err')
        )
      );
      ok += results.filter(x => x === 'ok').length;
      err += results.filter(x => x === 'err').length;
    }
    return { ok, err };
  },

  async transactions(userId) {
    return EconomyAPI.getTransactions(userId);
  },

  async export(userIds) {
    const blob = await EconomyAPI.exportBalances(userIds);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(url);
  }
};

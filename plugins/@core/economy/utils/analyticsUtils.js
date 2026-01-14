/**
 * Calculate economy health based on various metrics
 * @param {Object} economyData - Complete economy data
 * @returns {Object} Economy health assessment
 */
function calculateEconomyHealth(economyData) {
  const { overview } = economyData;
  const indicators = [];
  let healthScore = 100;

  // Check currency diversity
  const activeCurrencies = Object.values(overview.currencyStats).filter(c => c.transactionCount > 0);
  if (activeCurrencies.length < 2) {
    indicators.push({ type: 'warning', message: 'Low currency diversity' });
    healthScore -= 20;
  }

  // Check user engagement
  const totalUsers = overview.totalUsers || 1;
  const activeUsers = overview.activeUsers || 0;
  const engagementRate = (activeUsers / totalUsers) * 100;
  
  if (engagementRate < 30) {
    indicators.push({ type: 'critical', message: 'Low user engagement' });
    healthScore -= 30;
  } else if (engagementRate < 60) {
    indicators.push({ type: 'warning', message: 'Moderate user engagement' });
    healthScore -= 15;
  }

  // Check transaction volume trends
  if (overview.totalTransactions < 100) {
    indicators.push({ type: 'info', message: 'Low transaction volume' });
    healthScore -= 10;
  }

  // Ensure score doesn't go below 0
  healthScore = Math.max(0, healthScore);

  return {
    score: Math.round(healthScore),
    rating: healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Poor',
    indicators
  };
}

/**
 * Calculate inflation rate for a currency
 * @param {Array} dailyData - Daily transaction data
 * @param {string} currencyId - Currency ID
 * @returns {number} Inflation rate percentage
 */
function calculateInflationRate(dailyData, currencyId) {
  if (dailyData.length < 2) return 0;

  const recent = dailyData.slice(0, 7); // Last 7 days
  const totalCredits = recent.reduce((sum, day) => sum + (day.credits || 0), 0);
  const totalDebits = recent.reduce((sum, day) => sum + (day.debits || 0), 0);
  
  if (totalDebits === 0) return 100; // Infinite inflation if no spending
  
  const inflationRate = ((totalCredits - totalDebits) / totalDebits) * 100;
  return Math.round(inflationRate * 100) / 100;
}

/**
 * Identify economic patterns and anomalies
 * @param {Object} analyticsData - Economic analytics data
 * @returns {Object} Pattern analysis results
 */
function identifyEconomicPatterns(analyticsData) {
  const patterns = [];
  const anomalies = [];

  // Analyze transaction patterns
  if (analyticsData.sourceAnalysis) {
    const sources = analyticsData.sourceAnalysis;
    
    // Find dominant sources
    const totalVolume = sources.reduce((sum, source) => sum + source.total_volume, 0);
    sources.forEach(source => {
      const percentage = (source.total_volume / totalVolume) * 100;
      if (percentage > 50) {
        anomalies.push(`${source.source} accounts for ${Math.round(percentage)}% of all transactions`);
      }
    });

    // Find unusual transaction sizes
    sources.forEach(source => {
      if (source.avg_transaction_size > 10000) {
        patterns.push(`Large average transactions from ${source.source}: ${source.avg_transaction_size}`);
      }
    });
  }

  return {
    patterns,
    anomalies,
    riskLevel: anomalies.length > 2 ? 'High' : anomalies.length > 0 ? 'Medium' : 'Low'
  };
}

/**
 * Generate economic recommendations
 * @param {Object} economyData - Complete economy data
 * @returns {Array} Array of recommendations
 */
function generateEconomicRecommendations(economyData) {
  const recommendations = [];
  const { overview } = economyData;

  // Check for inactive currencies
  Object.values(overview.currencyStats).forEach(currency => {
    if (currency.transactionCount === 0) {
      recommendations.push({
        type: 'inactive_currency',
        priority: 'Low',
        message: `Consider promoting ${currency.name} usage - no transactions recorded`,
        action: 'Create incentives or events using this currency'
      });
    }

    if (currency.holders < 5) {
      recommendations.push({
        type: 'low_adoption',
        priority: 'Medium',
        message: `${currency.name} has low adoption (${currency.holders} holders)`,
        action: 'Increase currency accessibility and utility'
      });
    }

    if (currency.averageBalance > currency.totalSupply * 0.8) {
      recommendations.push({
        type: 'hoarding_detected',
        priority: 'High',
        message: `Potential hoarding in ${currency.name}`,
        action: 'Implement spending incentives or decay mechanics'
      });
    }
  });

  return recommendations;
}

/**
 * Calculate user engagement metrics
 * @param {Object} userBehaviorData - User behavior analytics
 * @returns {Object} Engagement metrics
 */
function calculateUserEngagement(userBehaviorData) {
  const { mostActiveUsers, economicProfiles } = userBehaviorData;

  if (!mostActiveUsers || mostActiveUsers.length === 0) {
    return {
      averageTransactionsPerUser: 0,
      engagementScore: 0,
      activeUserPercentage: 0
    };
  }

  const totalTransactions = mostActiveUsers.reduce((sum, user) => sum + user.transaction_count, 0);
  const averageTransactions = totalTransactions / mostActiveUsers.length;

  // Calculate engagement score (0-100)
  let engagementScore = 0;
  if (averageTransactions > 50) engagementScore += 40;
  else if (averageTransactions > 20) engagementScore += 25;
  else if (averageTransactions > 10) engagementScore += 15;

  // Check currency diversity
  const avgCurrenciesUsed = mostActiveUsers.reduce((sum, user) => sum + user.currencies_used, 0) / mostActiveUsers.length;
  if (avgCurrenciesUsed > 2) engagementScore += 30;
  else if (avgCurrenciesUsed > 1) engagementScore += 20;
  else engagementScore += 10;

  // Check user retention (users with recent activity)
  const recentlyActive = mostActiveUsers.filter(user => {
    const lastActivity = new Date(user.last_transaction);
    const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceActivity <= 7;
  }).length;

  const retentionRate = (recentlyActive / mostActiveUsers.length) * 100;
  if (retentionRate > 80) engagementScore += 30;
  else if (retentionRate > 60) engagementScore += 20;
  else if (retentionRate > 40) engagementScore += 10;

  return {
    averageTransactionsPerUser: Math.round(averageTransactions * 100) / 100,
    engagementScore: Math.min(100, engagementScore),
    activeUserPercentage: Math.round(retentionRate * 100) / 100,
    totalActiveUsers: mostActiveUsers.length
  };
}

module.exports = {
  calculateEconomyHealth,
  calculateInflationRate,
  identifyEconomicPatterns,
  generateEconomicRecommendations,
  calculateUserEngagement
};
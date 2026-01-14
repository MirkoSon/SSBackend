/**
 * Analytics routes for the economy plugin
 */

const { 
  calculateEconomyHealth, 
  calculateInflationRate,
  identifyEconomicPatterns,
  generateEconomicRecommendations,
  calculateUserEngagement
} = require('../utils/analyticsUtils');

/**
 * Handle analytics-related requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleAnalyticsRequest(req, res) {
  const { method, params, query, user } = req;
  const { analyticsService } = req.pluginContext || {};

  if (!analyticsService) {
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Analytics service not available'
    });
  }

  // Analytics might contain sensitive data - require admin for most endpoints
  if (!user.isAdmin && !req.path.includes('/overview')) {
    return res.status(403).json({
      error: 'Admin access required for detailed analytics'
    });
  }

  try {
    switch (method) {
      case 'GET':
        if (req.path.includes('/overview')) {
          return await getEconomyOverview(analyticsService, res);
        } else if (req.path.includes('/currency/')) {
          return await getCurrencyAnalytics(analyticsService, params.currencyId, res);
        } else if (req.path.includes('/users')) {
          return await getUserBehaviorAnalytics(analyticsService, query, res);
        } else if (req.path.includes('/flow')) {
          return await getTransactionFlowAnalytics(analyticsService, query, res);
        }
        break;

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Analytics route error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
/**
 * Get economy overview with health metrics
 */
async function getEconomyOverview(analyticsService, res) {
  const economyData = await analyticsService.getEconomyOverview();
  
  // Calculate additional metrics
  const healthMetrics = calculateEconomyHealth(economyData);
  const recommendations = generateEconomicRecommendations(economyData);
  
  // Calculate inflation rates for each currency
  const inflationRates = {};
  Object.keys(economyData.overview.currencyStats).forEach(currencyId => {
    inflationRates[currencyId] = calculateInflationRate(economyData.trends.dailyData, currencyId);
  });

  return res.json({
    success: true,
    overview: economyData.overview,
    trends: economyData.trends,
    health: {
      score: healthMetrics.score,
      rating: healthMetrics.rating,
      indicators: healthMetrics.indicators
    },
    inflationRates,
    recommendations: recommendations.slice(0, 5), // Top 5 recommendations
    generatedAt: new Date().toISOString()
  });
}

/**
 * Get currency-specific analytics
 */
async function getCurrencyAnalytics(analyticsService, currencyId, res) {
  try {
    const analytics = await analyticsService.getCurrencyAnalytics(currencyId);
    const patterns = identifyEconomicPatterns({ sourceAnalysis: analytics.transactionPatterns });
    
    return res.json({
      success: true,
      currencyId,
      analytics: {
        currency: analytics.currency,
        balanceDistribution: analytics.balanceDistribution,
        transactionPatterns: analytics.transactionPatterns,
        topUsers: analytics.topUsers,
        patterns: patterns.patterns,
        anomalies: patterns.anomalies,
        riskLevel: patterns.riskLevel
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    if (error.message.includes('Currency not found')) {
      return res.status(404).json({
        error: 'Currency not found',
        currencyId
      });
    }
    throw error;
  }
}
/**
 * Get user behavior analytics
 */
async function getUserBehaviorAnalytics(analyticsService, query, res) {
  const { limit = 100 } = query;
  const options = {
    limit: Math.min(parseInt(limit) || 100, 500)
  };

  const behaviorData = await analyticsService.getUserBehaviorAnalytics(options);
  const engagement = calculateUserEngagement(behaviorData);
  
  return res.json({
    success: true,
    userBehavior: {
      mostActiveUsers: behaviorData.mostActiveUsers.slice(0, 20), // Top 20 for response size
      economicProfiles: behaviorData.economicProfiles.slice(0, 20),
      summary: behaviorData.summary,
      engagement: {
        averageTransactionsPerUser: engagement.averageTransactionsPerUser,
        engagementScore: engagement.engagementScore,
        activeUserPercentage: engagement.activeUserPercentage,
        totalActiveUsers: engagement.totalActiveUsers
      }
    },
    generatedAt: new Date().toISOString()
  });
}

/**
 * Get transaction flow analytics
 */
async function getTransactionFlowAnalytics(analyticsService, query, res) {
  const { days = 30 } = query;
  const options = {
    days: Math.min(parseInt(days) || 30, 365) // Max 1 year
  };

  const flowData = await analyticsService.getTransactionFlowAnalysis(options);
  const patterns = identifyEconomicPatterns(flowData);
  
  return res.json({
    success: true,
    transactionFlow: {
      period: flowData.period,
      dailyVolume: flowData.dailyVolume,
      sourceAnalysis: flowData.sourceAnalysis,
      summary: flowData.summary,
      patterns: patterns.patterns,
      anomalies: patterns.anomalies,
      riskLevel: patterns.riskLevel
    },
    generatedAt: new Date().toISOString()
  });
}

module.exports = handleAnalyticsRequest;
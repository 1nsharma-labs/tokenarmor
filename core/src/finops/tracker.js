import { calculateCost } from '../models/catalog.js';

/**
 * TokenArmor FinOps & Metrics Tracker
 * Records all transaction telemetry, tokens, costs, and cache savings
 */
export class FinOpsTracker {
  constructor() {
    this.totalRequests = 0;
    this.totalCacheHits = 0;
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.totalUpstreamCostUSD = 0;
    this.totalSavedCostUSD = 0;

    // Per-model statistics
    this.modelStats = {};

    // Sliding window of recent requests for dashboard
    this.recentRequests = [];
    this.maxRecentLogs = 100;
    this.startedAt = new Date().toISOString();
  }

  /**
   * Record a completed proxy transaction
   */
  record({
    model = 'gpt-4o-mini',
    inputTokens = 0,
    outputTokens = 0,
    latencyMs = 0,
    isCacheHit = false,
    apiKey = 'anonymous',
    status = 200
  }) {
    this.totalRequests++;
    
    const costDetails = calculateCost(model, inputTokens, outputTokens);
    const totalTokens = inputTokens + outputTokens;

    if (isCacheHit) {
      this.totalCacheHits++;
      this.totalSavedCostUSD += costDetails.totalCost;
    } else {
      this.totalInputTokens += inputTokens;
      this.totalOutputTokens += outputTokens;
      this.totalUpstreamCostUSD += costDetails.totalCost;
    }

    // Update model-level stats
    if (!this.modelStats[model]) {
      this.modelStats[model] = {
        requests: 0,
        cacheHits: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUSD: 0,
        savedCostUSD: 0
      };
    }

    const m = this.modelStats[model];
    m.requests++;
    if (isCacheHit) {
      m.cacheHits++;
      m.savedCostUSD += costDetails.totalCost;
    } else {
      m.inputTokens += inputTokens;
      m.outputTokens += outputTokens;
      m.costUSD += costDetails.totalCost;
    }

    // Add to recent request ledger
    const logEntry = {
      id: 'req_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      costUSD: Number(costDetails.totalCost.toFixed(6)),
      latencyMs,
      cacheStatus: isCacheHit ? 'HIT' : 'MISS',
      status
    };

    this.recentRequests.unshift(logEntry);
    if (this.recentRequests.length > this.maxRecentLogs) {
      this.recentRequests.pop();
    }

    return logEntry;
  }

  /**
   * Get comprehensive FinOps overview
   */
  getOverview() {
    const totalTokens = this.totalInputTokens + this.totalOutputTokens;
    const cacheHitRate = this.totalRequests > 0 
      ? ((this.totalCacheHits / this.totalRequests) * 100).toFixed(1) 
      : '0.0';

    return {
      uptimeSince: this.startedAt,
      totalRequests: this.totalRequests,
      cacheHits: this.totalCacheHits,
      cacheMisses: this.totalRequests - this.totalCacheHits,
      cacheHitRate: Number(cacheHitRate),
      tokens: {
        input: this.totalInputTokens,
        output: this.totalOutputTokens,
        total: totalTokens
      },
      financials: {
        upstreamSpendUSD: Number(this.totalUpstreamCostUSD.toFixed(4)),
        savedCostUSD: Number(this.totalSavedCostUSD.toFixed(4)),
        netCostUSD: Number(this.totalUpstreamCostUSD.toFixed(4))
      },
      modelBreakdown: this.modelStats,
      recentRequests: this.recentRequests.slice(0, 20)
    };
  }

  /**
   * Reset stats
   */
  reset() {
    this.totalRequests = 0;
    this.totalCacheHits = 0;
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.totalUpstreamCostUSD = 0;
    this.totalSavedCostUSD = 0;
    this.modelStats = {};
    this.recentRequests = [];
  }
}

export const globalTracker = new FinOpsTracker();

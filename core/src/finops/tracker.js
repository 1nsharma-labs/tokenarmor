import { calculateCost } from '../models/catalog.js';
import { globalStorage } from '../db/storage.js';

/**
 * TokenArmor FinOps & Metrics Tracker (Backed by Native SQLite)
 * Records all transaction telemetry, tokens, costs, and cache savings persistently.
 */
export class FinOpsTracker {
  constructor() {
    this.startedAt = new Date().toISOString();
  }

  /**
   * Record a completed proxy transaction (Memory + Persistent SQLite)
   */
  record({
    model = 'gpt-4o-mini',
    inputTokens = 0,
    outputTokens = 0,
    latencyMs = 0,
    isCacheHit = false,
    teamKey = 'default',
    status = 200
  }) {
    const costDetails = calculateCost(model, inputTokens, outputTokens);
    const txId = 'req_' + Math.random().toString(36).substring(2, 9);
    const timestamp = new Date().toISOString();

    // Persist immediately to SQLite
    globalStorage.recordTransaction({
      id: txId,
      timestamp,
      model,
      inputTokens,
      outputTokens,
      costUSD: costDetails.totalCost,
      latencyMs,
      cacheStatus: isCacheHit ? 'HIT' : 'MISS',
      teamKey
    });

    return {
      id: txId,
      timestamp,
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      costUSD: Number(costDetails.totalCost.toFixed(6)),
      latencyMs,
      cacheStatus: isCacheHit ? 'HIT' : 'MISS',
      status
    };
  }

  /**
   * Get comprehensive FinOps overview from persistent SQLite storage
   */
  getOverview() {
    const stats = globalStorage.getOverviewStats();
    const recent = globalStorage.getRecentTransactions(20);

    return {
      uptimeSince: this.startedAt,
      ...stats,
      recentRequests: recent
    };
  }

  get totalUpstreamCostUSD() {
    return globalStorage.getOverviewStats().financials.upstreamSpendUSD;
  }
}

export const globalTracker = new FinOpsTracker();

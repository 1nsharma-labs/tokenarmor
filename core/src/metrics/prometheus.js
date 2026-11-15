import { globalStorage } from '../db/storage.js';
import { globalCache } from '../cache/cache.js';

/**
 * TokenArmor Prometheus Exporter (Pure Zero-Dependency OpenMetrics format)
 * Implements Prometheus text exposition format (version 0.0.4)
 */
export function generatePrometheusMetrics() {
  const stats = globalStorage.getOverviewStats();
  const cacheStats = globalCache.getStats();
  const mem = process.memoryUsage();
  const uptime = process.uptime();

  const lines = [
    '# HELP tokenarmor_uptime_seconds Total runtime seconds of TokenArmor gateway',
    '# TYPE tokenarmor_uptime_seconds gauge',
    `tokenarmor_uptime_seconds ${uptime.toFixed(1)}`,
    '',
    '# HELP tokenarmor_requests_total Total number of AI proxy requests processed',
    '# TYPE tokenarmor_requests_total counter',
    `tokenarmor_requests_total ${stats.totalRequests}`,
    '',
    '# HELP tokenarmor_cache_hits_total Total number of requests served directly from cache ($0 cost)',
    '# TYPE tokenarmor_cache_hits_total counter',
    `tokenarmor_cache_hits_total ${stats.cacheHits}`,
    '',
    '# HELP tokenarmor_cache_misses_total Total number of cache misses requiring upstream LLM call',
    '# TYPE tokenarmor_cache_misses_total counter',
    `tokenarmor_cache_misses_total ${stats.cacheMisses}`,
    '',
    '# HELP tokenarmor_cache_hit_ratio Ratio of cache hits to total requests (0.0 to 1.0)',
    '# TYPE tokenarmor_cache_hit_ratio gauge',
    `tokenarmor_cache_hit_ratio ${(stats.totalRequests > 0 ? stats.cacheHits / stats.totalRequests : 0).toFixed(4)}`,
    '',
    '# HELP tokenarmor_tokens_total Cumulative count of tokens processed by type',
    '# TYPE tokenarmor_tokens_total counter',
    `tokenarmor_tokens_total{type="input"} ${stats.tokens.input}`,
    `tokenarmor_tokens_total{type="output"} ${stats.tokens.output}`,
    `tokenarmor_tokens_total{type="total"} ${stats.tokens.total}`,
    '',
    '# HELP tokenarmor_cost_spent_usd Cumulative cost spent on upstream LLM API providers in USD',
    '# TYPE tokenarmor_cost_spent_usd counter',
    `tokenarmor_cost_spent_usd ${stats.financials.upstreamSpendUSD.toFixed(6)}`,
    '',
    '# HELP tokenarmor_cost_saved_usd Cumulative money saved via TokenArmor prompt caching in USD',
    '# TYPE tokenarmor_cost_saved_usd counter',
    `tokenarmor_cost_saved_usd ${stats.financials.savedCostUSD.toFixed(6)}`,
    '',
    '# HELP tokenarmor_active_keys Total number of provisioned team virtual API keys',
    '# TYPE tokenarmor_active_keys gauge',
    `tokenarmor_active_keys ${globalStorage.getApiKeys().length}`,
    '',
    '# HELP tokenarmor_cache_entries_active Number of active prompt entries in RAM cache',
    '# TYPE tokenarmor_cache_entries_active gauge',
    `tokenarmor_cache_entries_active ${cacheStats.entries || 0}`,
    '',
    '# HELP tokenarmor_process_memory_bytes Process memory usage metrics',
    '# TYPE tokenarmor_process_memory_bytes gauge',
    `tokenarmor_process_memory_bytes{type="rss"} ${mem.rss}`,
    `tokenarmor_process_memory_bytes{type="heapTotal"} ${mem.heapTotal}`,
    `tokenarmor_process_memory_bytes{type="heapUsed"} ${mem.heapUsed}`,
    ''
  ];

  // Add per-model metrics if available
  if (stats.modelBreakdown && Object.keys(stats.modelBreakdown).length > 0) {
    lines.push('# HELP tokenarmor_model_requests_total Requests broken down by model');
    lines.push('# TYPE tokenarmor_model_requests_total counter');
    for (const [m, mdata] of Object.entries(stats.modelBreakdown)) {
      lines.push(`tokenarmor_model_requests_total{model="${m}"} ${mdata.requests}`);
    }
    lines.push('');
    lines.push('# HELP tokenarmor_model_cost_usd_total Cost broken down by model');
    lines.push('# TYPE tokenarmor_model_cost_usd_total counter');
    for (const [m, mdata] of Object.entries(stats.modelBreakdown)) {
      lines.push(`tokenarmor_model_cost_usd_total{model="${m}"} ${mdata.costUSD.toFixed(6)}`);
    }
    lines.push('');
  }

  return lines.join('\n') + '\n';
}

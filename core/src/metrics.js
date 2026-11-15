import client from 'prom-client';

const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register, prefix: 'tokenarmor_' });

// Custom Metrics
export const requestsTotal = new client.Counter({
  name: 'tokenarmor_requests_total',
  help: 'Total number of requests processed by TokenArmor',
  registers: [register]
});

export const cacheHitsTotal = new client.Counter({
  name: 'tokenarmor_cache_hits_total',
  help: 'Total number of requests served from cache',
  registers: [register]
});

export const upstreamErrorsTotal = new client.Counter({
  name: 'tokenarmor_upstream_errors_total',
  help: 'Total number of errors returned by upstream LLM providers',
  registers: [register]
});

export const estimatedCostUsd = new client.Counter({
  name: 'tokenarmor_estimated_cost_usd',
  help: 'Cumulative estimated cost in USD saved or spent',
  registers: [register]
});

export const tokensTotal = new client.Counter({
  name: 'tokenarmor_tokens_total',
  help: 'Total tokens processed by model and provider',
  labelNames: ['model', 'provider'],
  registers: [register]
});

export { register };

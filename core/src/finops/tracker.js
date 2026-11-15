import { estimatedCostUsd, tokensTotal } from '../metrics.js';

export const trackUsage = (model, provider, usage, cost) => {
  // usage is typically { prompt_tokens, completion_tokens, total_tokens }
  const totalTokens = usage.total_tokens || 0;
  
  // Increment Prometheus counters
  tokensTotal.inc({ model, provider }, totalTokens);
  estimatedCostUsd.inc(cost);

  // Existing tracking logic...
  console.log(`FinOps: ${model} via ${provider} consumed ${totalTokens} tokens. Est Cost: $${cost}`);
};

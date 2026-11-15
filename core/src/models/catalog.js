/**
 * TokenArmor Model & Pricing Catalog
 * Tracks standard market pricing (USD per 1 Million tokens)
 */

export const MODEL_PRICING = {
  // OpenAI Models
  'gpt-4o': {
    provider: 'openai',
    inputCostPer1M: 2.50,
    outputCostPer1M: 10.00,
    contextWindow: 128000
  },
  'gpt-4o-mini': {
    provider: 'openai',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    contextWindow: 128000
  },
  'gpt-4-turbo': {
    provider: 'openai',
    inputCostPer1M: 10.00,
    outputCostPer1M: 30.00,
    contextWindow: 128000
  },
  'o1': {
    provider: 'openai',
    inputCostPer1M: 15.00,
    outputCostPer1M: 60.00,
    contextWindow: 200000
  },
  'o1-mini': {
    provider: 'openai',
    inputCostPer1M: 3.00,
    outputCostPer1M: 12.00,
    contextWindow: 128000
  },

  // Anthropic Models
  'claude-3-5-sonnet-20241022': {
    provider: 'anthropic',
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    contextWindow: 200000
  },
  'claude-3-5-sonnet': {
    provider: 'anthropic',
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    contextWindow: 200000
  },
  'claude-3-haiku-20240307': {
    provider: 'anthropic',
    inputCostPer1M: 0.25,
    outputCostPer1M: 1.25,
    contextWindow: 200000
  },
  'claude-3-5-haiku': {
    provider: 'anthropic',
    inputCostPer1M: 0.80,
    outputCostPer1M: 4.00,
    contextWindow: 200000
  },

  // Google Gemini Models
  'gemini-1.5-pro': {
    provider: 'gemini',
    inputCostPer1M: 1.25,
    outputCostPer1M: 5.00,
    contextWindow: 2000000
  },
  'gemini-1.5-flash': {
    provider: 'gemini',
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.30,
    contextWindow: 1000000
  },
  'gemini-2.0-flash': {
    provider: 'gemini',
    inputCostPer1M: 0.10,
    outputCostPer1M: 0.40,
    contextWindow: 1000000
  }
};

/**
 * Calculate the exact USD cost for a given model and token count
 */
export function calculateCost(modelName, inputTokens = 0, outputTokens = 0) {
  // Normalize model name
  const model = MODEL_PRICING[modelName] || MODEL_PRICING['gpt-4o-mini'];
  
  const inputCost = (inputTokens / 1_000_000) * model.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * model.outputCostPer1M;
  const totalCost = inputCost + outputCost;

  return {
    inputCost: Number(inputCost.toFixed(6)),
    outputCost: Number(outputCost.toFixed(6)),
    totalCost: Number(totalCost.toFixed(6)),
    provider: model.provider
  };
}

/**
 * Fast token estimation fallback (1 token ≈ 4 characters in English)
 */
export function estimateTokens(text = '') {
  if (typeof text !== 'string') {
    text = JSON.stringify(text);
  }
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Detect provider from model name
 */
export function detectProvider(modelName = '') {
  const normalized = modelName.toLowerCase();
  if (normalized.startsWith('claude')) return 'anthropic';
  if (normalized.startsWith('gemini')) return 'gemini';
  return 'openai'; // default
}

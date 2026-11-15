import crypto from 'node:crypto';

/**
 * TokenArmor High-Performance Exact & Semantic Prompt Cache
 * Supports fast in-memory LRU with configurable TTL (default: 1 hour)
 */
export class PromptCache {
  constructor(options = {}) {
    this.maxEntries = options.maxEntries || 10000;
    this.defaultTTLMs = (options.ttlSeconds || 3600) * 1000;
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      totalTokensSaved: 0,
      totalCostSavedUSD: 0
    };
  }

  /**
   * Generates a stable SHA-256 key from model, messages, and temperature
   */
  generateKey(model, messages = [], temperature = 0.7) {
    const normalized = {
      model: String(model).trim().toLowerCase(),
      // Clean and normalize messages
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content.trim() : JSON.stringify(m.content)
      })),
      temperature: Number(temperature).toFixed(2)
    };
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex');
  }

  /**
   * Retrieves a cached response if valid and not expired
   */
  get(key) {
    if (!this.cache.has(key)) {
      this.stats.misses++;
      return null;
    }

    const entry = this.cache.get(key);
    const now = Date.now();

    // Check expiration
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Refresh entry position for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.stats.hits++;
    if (entry.usage && entry.usage.total_tokens) {
      this.stats.totalTokensSaved += entry.usage.total_tokens;
    }
    if (entry.cost) {
      this.stats.totalCostSavedUSD += entry.cost;
    }

    return entry.data;
  }

  /**
   * Stores a response in the cache with metadata
   */
  set(key, data, usage = {}, cost = 0, ttlMs = null) {
    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    const expiresAt = Date.now() + (ttlMs || this.defaultTTLMs);
    this.cache.set(key, {
      data,
      usage,
      cost,
      expiresAt,
      cachedAt: new Date().toISOString()
    });
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache metrics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    
    return {
      entries: this.cache.size,
      maxEntries: this.maxEntries,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Number(hitRate.toFixed(2)),
      totalTokensSaved: this.stats.totalTokensSaved,
      totalCostSavedUSD: Number(this.stats.totalCostSavedUSD.toFixed(4))
    };
  }
}

export const globalCache = new PromptCache();

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'tokenarmor.db');

export class PersistentStorage {
  constructor(dbPath = DB_PATH) {
    this.db = new DatabaseSync(dbPath);
    this.initTables();
  }

  initTables() {
    // 1. Transactions ledger table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        model TEXT NOT NULL,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        cost_usd REAL DEFAULT 0,
        latency_ms INTEGER DEFAULT 0,
        cache_status TEXT DEFAULT 'MISS',
        team_key TEXT DEFAULT 'default'
      );
      CREATE INDEX IF NOT EXISTS idx_transactions_time ON transactions(timestamp);
      CREATE INDEX IF NOT EXISTS idx_transactions_model ON transactions(model);
    `);

    // 2. Team Virtual API Keys table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        key TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        monthly_budget_usd REAL DEFAULT 100.0,
        current_spend_usd REAL DEFAULT 0.0,
        created_at TEXT NOT NULL,
        status TEXT DEFAULT 'active'
      );
    `);

    // Ensure a default master key exists
    const checkMaster = this.db.prepare('SELECT count(*) as count FROM api_keys').get();
    if (checkMaster.count === 0) {
      const defaultKey = 'tarm_live_' + crypto.randomBytes(16).toString('hex');
      this.db.prepare(`
        INSERT INTO api_keys (key, name, monthly_budget_usd, current_spend_usd, created_at, status)
        VALUES (?, 'Default Team', 500.0, 0.0, ?, 'active')
      `).run(defaultKey, new Date().toISOString());
    }
  }

  recordTransaction({
    id,
    timestamp,
    model,
    inputTokens = 0,
    outputTokens = 0,
    costUSD = 0,
    latencyMs = 0,
    cacheStatus = 'MISS',
    teamKey = 'default'
  }) {
    const txId = id || 'tx_' + crypto.randomUUID();
    const time = timestamp || new Date().toISOString();
    const totalTokens = inputTokens + outputTokens;

    const stmt = this.db.prepare(`
      INSERT INTO transactions (id, timestamp, model, input_tokens, output_tokens, total_tokens, cost_usd, latency_ms, cache_status, team_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(txId, time, model, inputTokens, outputTokens, totalTokens, costUSD, latencyMs, cacheStatus, teamKey);

    // Update API Key current spend if Cache Miss
    if (cacheStatus === 'MISS' && teamKey && teamKey !== 'default') {
      this.db.prepare(`
        UPDATE api_keys
        SET current_spend_usd = current_spend_usd + ?
        WHERE key = ?
      `).run(costUSD, teamKey);
    }

    return { id: txId, timestamp: time };
  }

  getOverviewStats() {
    // Total requests, hits, spend
    const general = this.db.prepare(`
      SELECT 
        COUNT(*) as totalRequests,
        SUM(CASE WHEN cache_status = 'HIT' THEN 1 ELSE 0 END) as cacheHits,
        SUM(input_tokens) as totalInputTokens,
        SUM(output_tokens) as totalOutputTokens,
        SUM(total_tokens) as totalTokens,
        SUM(CASE WHEN cache_status = 'MISS' THEN cost_usd ELSE 0 END) as upstreamSpendUSD,
        SUM(CASE WHEN cache_status = 'HIT' THEN cost_usd ELSE 0 END) as savedCostUSD
      FROM transactions
    `).get();

    // Model breakdown
    const modelRows = this.db.prepare(`
      SELECT 
        model,
        COUNT(*) as requests,
        SUM(CASE WHEN cache_status = 'HIT' THEN 1 ELSE 0 END) as cacheHits,
        SUM(input_tokens) as inputTokens,
        SUM(output_tokens) as outputTokens,
        SUM(CASE WHEN cache_status = 'MISS' THEN cost_usd ELSE 0 END) as costUSD,
        SUM(CASE WHEN cache_status = 'HIT' THEN cost_usd ELSE 0 END) as savedCostUSD
      FROM transactions
      GROUP BY model
    `).all();

    const modelBreakdown = {};
    for (const r of modelRows) {
      modelBreakdown[r.model] = {
        requests: r.requests,
        cacheHits: r.cacheHits,
        inputTokens: r.inputTokens || 0,
        outputTokens: r.outputTokens || 0,
        costUSD: Number((r.costUSD || 0).toFixed(4)),
        savedCostUSD: Number((r.savedCostUSD || 0).toFixed(4))
      };
    }

    const totalReqs = general.totalRequests || 0;
    const hits = general.cacheHits || 0;
    const hitRate = totalReqs > 0 ? Number(((hits / totalReqs) * 100).toFixed(1)) : 0;

    return {
      totalRequests: totalReqs,
      cacheHits: hits,
      cacheMisses: totalReqs - hits,
      cacheHitRate: hitRate,
      tokens: {
        input: general.totalInputTokens || 0,
        output: general.totalOutputTokens || 0,
        total: general.totalTokens || 0
      },
      financials: {
        upstreamSpendUSD: Number((general.upstreamSpendUSD || 0).toFixed(4)),
        savedCostUSD: Number((general.savedCostUSD || 0).toFixed(4)),
        netCostUSD: Number((general.upstreamSpendUSD || 0).toFixed(4))
      },
      modelBreakdown
    };
  }

  getRecentTransactions(limit = 25) {
    const rows = this.db.prepare(`
      SELECT id, timestamp, model, input_tokens as inputTokens, output_tokens as outputTokens, total_tokens as totalTokens, cost_usd as costUSD, latency_ms as latencyMs, cache_status as cacheStatus, team_key as teamKey
      FROM transactions
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit);

    return rows.map(r => ({
      ...r,
      costUSD: Number(r.costUSD.toFixed(6))
    }));
  }

  // Virtual Team Keys Management
  createApiKey(name, monthlyBudgetUSD = 100.0) {
    const key = 'tarm_live_' + crypto.randomBytes(16).toString('hex');
    const createdAt = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO api_keys (key, name, monthly_budget_usd, current_spend_usd, created_at, status)
      VALUES (?, ?, ?, 0.0, ?, 'active')
    `).run(key, name, monthlyBudgetUSD, createdAt);

    return { key, name, monthlyBudgetUSD, createdAt, status: 'active' };
  }

  getApiKeys() {
    return this.db.prepare(`
      SELECT key, name, monthly_budget_usd as monthlyBudgetUSD, current_spend_usd as currentSpendUSD, created_at as createdAt, status
      FROM api_keys
      ORDER BY created_at DESC
    `).all();
  }

  validateKey(key) {
    if (!key) return null;
    return this.db.prepare('SELECT * FROM api_keys WHERE key = ? AND status = "active"').get(key) || null;
  }
}

export const globalStorage = new PersistentStorage();

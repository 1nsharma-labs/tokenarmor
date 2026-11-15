import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { globalCache } from './cache/cache.js';
import { globalTracker } from './finops/tracker.js';
import { MODEL_PRICING, calculateCost } from './models/catalog.js';
import { forwardUpstream } from './proxy/router.js';

import { globalLicenseVerifier } from '../../ee/license/verifier.js';
import { globalBudgetLimiter } from '../../ee/quotas/budgetLimiter.js';
import { scrubMessages } from '../../ee/security/piiScrubber.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UI_DIR = path.resolve(__dirname, '../../ui');

// Auto-load .env if exists (Zero-dependency)
const envFile = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envFile)) {
  try {
    const lines = fs.readFileSync(envFile, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        const key = k.trim();
        const val = v.join('=').trim();
        if (!process.env[key] && val) {
          process.env[key] = val;
        }
      }
    }
  } catch {}
}

const DEFAULT_PORT = process.env.PORT || 8090;
const DEFAULT_HOST = process.env.HOST || '0.0.0.0';

/**
 * Standard CORS and JSON response helper
 */
function sendJSON(res, statusCode, data, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, X-TokenArmor-License',
    ...extraHeaders
  });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Main HTTP Request Handler
 */
export const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, X-TokenArmor-License'
    });
    res.end();
    return;
  }

  // 1. Healthcheck
  if (pathname === '/health' || pathname === '/api/health') {
    sendJSON(res, 200, {
      status: 'healthy',
      version: '1.0.0',
      service: 'TokenArmor AI Gateway & FinOps Firewall',
      edition: globalLicenseVerifier.getEnvironmentStatus().tier,
      uptime: process.uptime()
    });
    return;
  }

  // 2. Models Catalog endpoint (OpenAI Compatible)
  if (pathname === '/v1/models' && req.method === 'GET') {
    const modelsList = Object.entries(MODEL_PRICING).map(([id, info]) => ({
      id,
      object: 'model',
      created: 1700000000,
      owned_by: info.provider,
      pricing: {
        inputCostPer1M: info.inputCostPer1M,
        outputCostPer1M: info.outputCostPer1M,
        contextWindow: info.contextWindow
      }
    }));
    sendJSON(res, 200, { object: 'list', data: modelsList });
    return;
  }

  // 3. FinOps Stats API (For UI and Monitoring)
  if (pathname === '/api/stats' && req.method === 'GET') {
    const overview = globalTracker.getOverview();
    const cacheStats = globalCache.getStats();
    const licenseStatus = globalLicenseVerifier.getEnvironmentStatus();
    const budgetStatus = globalBudgetLimiter.canProceed(0);

    sendJSON(res, 200, {
      ...overview,
      cache: cacheStats,
      license: licenseStatus,
      budget: budgetStatus
    });
    return;
  }

  // 4. Enterprise License Verification & Status API
  if (pathname === '/api/license' && req.method === 'GET') {
    sendJSON(res, 200, globalLicenseVerifier.getEnvironmentStatus());
    return;
  }

  // 5. Test Key Minting Utility (Admin / Founder tool)
  if (pathname === '/api/license/generate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const org = payload.organization || 'AcmeCorp';
        const days = payload.days || 365;
        const tier = payload.tier || 'ENT';
        const generatedKey = globalLicenseVerifier.generateKey(org, days, tier);
        sendJSON(res, 200, {
          success: true,
          licenseKey: generatedKey,
          organization: org,
          validDays: days,
          tier: tier === 'ENT' ? 'ENTERPRISE' : 'PRO'
        });
      } catch (err) {
        sendJSON(res, 400, { error: err.message });
      }
    });
    return;
  }

  // 6. MAIN PROXY: Drop-in /v1/chat/completions (OpenAI Compatible)
  if (pathname === '/v1/chat/completions' && req.method === 'POST') {
    const startTime = Date.now();
    let body = '';

    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const model = payload.model || 'gpt-4o-mini';
        const messages = payload.messages || [];
        const temperature = payload.temperature ?? 0.7;

        // Enterprise Step A: PII Sanitization
        const { messages: sanitizedMessages, scrubbedCount } = scrubMessages(messages);
        payload.messages = sanitizedMessages;

        // Step B: Cache Lookup via Deterministic Hash
        const cacheKey = globalCache.generateKey(model, sanitizedMessages, temperature);
        const cachedResponse = globalCache.get(cacheKey);

        if (cachedResponse) {
          const latencyMs = Date.now() - startTime;
          const inputTokens = cachedResponse.usage?.prompt_tokens || 10;
          const outputTokens = cachedResponse.usage?.completion_tokens || 10;

          // Record Cache Hit (Free $0 savings)
          globalTracker.record({
            model,
            inputTokens,
            outputTokens,
            latencyMs,
            isCacheHit: true,
            status: 200
          });

          sendJSON(res, 200, cachedResponse, {
            'X-TokenArmor-Cache': 'HIT',
            'X-TokenArmor-Latency-Saved-Ms': String(latencyMs),
            'X-TokenArmor-PII-Redactions': String(scrubbedCount)
          });
          return;
        }

        // Enterprise Step C: Hard Budget Limit Check before spending upstream money
        const estimatedCost = calculateCost(model, 500, 500).totalCost;
        const budgetCheck = globalBudgetLimiter.canProceed(estimatedCost);
        
        if (!budgetCheck.allowed) {
          sendJSON(res, 429, {
            error: {
              message: budgetCheck.reason,
              type: 'tokenarmor_budget_limit_exceeded',
              code: 'budget_exceeded'
            }
          });
          return;
        }

        // Step D: Upstream Router Forwarding
        const upstreamResponse = await forwardUpstream(payload, req.headers);
        const latencyMs = Date.now() - startTime;

        const inputTokens = upstreamResponse.usage?.prompt_tokens || 0;
        const outputTokens = upstreamResponse.usage?.completion_tokens || 0;
        const costDetails = calculateCost(model, inputTokens, outputTokens);

        // Record Upstream Metrics
        globalTracker.record({
          model,
          inputTokens,
          outputTokens,
          latencyMs,
          isCacheHit: false,
          status: 200
        });

        // Store into Cache for future requests
        globalCache.set(cacheKey, upstreamResponse, upstreamResponse.usage, costDetails.totalCost);

        sendJSON(res, 200, upstreamResponse, {
          'X-TokenArmor-Cache': 'MISS',
          'X-TokenArmor-Cost-USD': String(costDetails.totalCost),
          'X-TokenArmor-Latency-Ms': String(latencyMs),
          'X-TokenArmor-PII-Redactions': String(scrubbedCount)
        });

      } catch (err) {
        console.error('[TokenArmor Proxy Error]', err);
        sendJSON(res, 500, {
          error: {
            message: err.message,
            type: 'tokenarmor_proxy_error'
          }
        });
      }
    });
    return;
  }

  // 7. Serve UI Dashboard Static Files
  if (req.method === 'GET' && (pathname === '/' || pathname === '/dashboard' || pathname.startsWith('/ui'))) {
    const filePath = path.join(UI_DIR, 'index.html');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
      return;
    }
  }

  // 404 Fallback
  sendJSON(res, 404, { error: 'Not Found', path: pathname });
});

export function startServer(port = DEFAULT_PORT, host = DEFAULT_HOST) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      console.log(`
  ==============================================================
    🛡️  TokenArmor AI Gateway & Token FinOps Firewall v1.0.0
    🏢  Organization: 1nsharma-labs
  ==============================================================
  🚀 Gateway Proxy: http://${host}:${port}/v1/chat/completions
  📊 FinOps UI:     http://${host}:${port}/
  📈 Metrics API:   http://${host}:${port}/api/stats
  🩺 Health Check:  http://${host}:${port}/api/health
  ==============================================================
      `);
      resolve(server);
    });
  });
}

// Auto start if run directly
const isDirectExecution = process.argv[1] && (
  process.argv[1].endsWith('server.js') || 
  process.argv[1].endsWith('server')
);

if (isDirectExecution) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default server;

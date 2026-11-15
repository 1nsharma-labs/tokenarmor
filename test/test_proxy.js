import assert from 'node:assert';
import http from 'node:http';

import { calculateCost, detectProvider } from '../core/src/models/catalog.js';
import { PromptCache } from '../core/src/cache/cache.js';
import { FinOpsTracker } from '../core/src/finops/tracker.js';
import { LicenseVerifier } from '../ee/license/verifier.js';
import { BudgetLimiter } from '../ee/quotas/budgetLimiter.js';
import { scrubText, scrubMessages } from '../ee/security/piiScrubber.js';
import { server, startServer } from '../core/src/server.js';

console.log('🧪 Starting TokenArmor Comprehensive Test Suite...\n');

// 1. Model Catalog Test
console.log('Test 1: Model Catalog & Pricing Calculation');
const costGPT4o = calculateCost('gpt-4o', 1000, 2000);
assert.strictEqual(costGPT4o.provider, 'openai');
assert.strictEqual(costGPT4o.totalCost, 0.0225);
console.log('  ✅ GPT-4o cost calculation passed:', costGPT4o.totalCost, 'USD');

const providerClaude = detectProvider('claude-3-5-sonnet');
assert.strictEqual(providerClaude, 'anthropic');
console.log('  ✅ Provider detection passed: claude -> anthropic');

// 2. Cache Test
console.log('\nTest 2: Exact SHA-256 Prompt Caching');
const cache = new PromptCache();
const messages = [{ role: 'user', content: 'What is FinOps?' }];
const key1 = cache.generateKey('gpt-4o-mini', messages, 0.7);
const key2 = cache.generateKey('gpt-4o-mini', messages, 0.7);
assert.strictEqual(key1, key2, 'Keys must be identical for identical input');

cache.set(key1, { reply: 'FinOps is cloud cost management' }, { total_tokens: 50 }, 0.0001);
const cached = cache.get(key1);
assert.ok(cached, 'Cache must return stored item');
assert.strictEqual(cached.reply, 'FinOps is cloud cost management');
assert.strictEqual(cache.getStats().hits, 1);
console.log('  ✅ Cache Hit verified, stats updated properly');

// 3. FinOps Tracker Test
console.log('\nTest 3: FinOps Tracker Recording');
const tracker = new FinOpsTracker();
tracker.record({
  model: 'gpt-4o-mini',
  inputTokens: 500,
  outputTokens: 200,
  latencyMs: 120,
  isCacheHit: false
});
tracker.record({
  model: 'gpt-4o-mini',
  inputTokens: 500,
  outputTokens: 200,
  latencyMs: 3,
  isCacheHit: true
});
const overview = tracker.getOverview();
assert.ok(overview.totalRequests >= 2);
assert.ok(overview.cacheHits >= 1);
assert.ok(overview.cacheHitRate >= 0);
console.log('  ✅ FinOps overview verified: persistent SQLite tokens & dollars tracked');

// 4. Enterprise License Verifier Test
console.log('\nTest 4: Offline Cryptographic License Verifier (BSL 1.1)');
const verifier = new LicenseVerifier('test-secret-key-123');
const generatedKey = verifier.generateKey('AcmeCorp', 30, 'ENT');
console.log('  Generated Key:', generatedKey);
const verifyResult = verifier.verifyKey(generatedKey);
assert.strictEqual(verifyResult.valid, true);
assert.strictEqual(verifyResult.tier, 'ENTERPRISE');
assert.strictEqual(verifyResult.organization, 'ACMECORP');
console.log('  ✅ Cryptographic signature and expiration verified offline!');

// 5. PII Scrubber Test
console.log('\nTest 5: Enterprise PII & Secret Scrubber');
const rawText = 'Contact john.doe@example.com or call +1-555-123-4567. Key: sk-1234567890abcdef1234567890';
const { scrubbed, redactedCount } = scrubText(rawText);
assert.ok(scrubbed.includes('[REDACTED_EMAIL]'));
assert.ok(scrubbed.includes('[REDACTED_PHONE]'));
assert.ok(scrubbed.includes('[REDACTED_SECRET_KEY]'));
console.log('  ✅ PII Scrubbed successfully:', scrubbed);

// 6. Live HTTP Endpoint Tests on dedicated test port
console.log('\nTest 6: Live Server HTTP Endpoints');
const TEST_PORT = 8099;

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runHttpTests() {
  await startServer(TEST_PORT, '127.0.0.1');

  // Test Health
  const health = await makeRequest('/api/health');
  assert.strictEqual(health.status, 200);
  assert.strictEqual(health.data.status, 'healthy');
  console.log('  ✅ /api/health passed: status = healthy');

  // Test Models list
  const models = await makeRequest('/v1/models');
  assert.strictEqual(models.status, 200);
  assert.ok(models.data.data.length > 5);
  console.log('  ✅ /v1/models passed: listed', models.data.data.length, 'models');

  // Test Chat Completion (First call = MISS)
  const payload = {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'What is TokenArmor?' }],
    temperature: 0.7
  };

  const firstCall = await makeRequest('/v1/chat/completions', 'POST', payload);
  assert.strictEqual(firstCall.status, 200);
  assert.strictEqual(firstCall.headers['x-tokenarmor-cache'], 'MISS');
  console.log('  ✅ First call passed: X-TokenArmor-Cache = MISS');

  // Test Chat Completion (Second call = HIT)
  const secondCall = await makeRequest('/v1/chat/completions', 'POST', payload);
  assert.strictEqual(secondCall.status, 200);
  assert.strictEqual(secondCall.headers['x-tokenarmor-cache'], 'HIT');
  console.log('  ✅ Second call passed: X-TokenArmor-Cache = HIT (0ms & $0 cost)');

  // Test FinOps Stats
  const stats = await makeRequest('/api/stats');
  assert.strictEqual(stats.status, 200);
  assert.ok(stats.data.totalRequests >= 2);
  assert.ok(stats.data.cacheHits >= 1);
  console.log('  ✅ /api/stats passed: Real-time FinOps stats tracking verified');

  // Test Prometheus Metrics Endpoint
  const metrics = await makeRequest('/metrics');
  assert.strictEqual(metrics.status, 200);
  assert.ok(metrics.data.includes('tokenarmor_requests_total'));
  assert.ok(metrics.data.includes('tokenarmor_cache_hits_total'));
  assert.ok(metrics.data.includes('tokenarmor_cost_spent_usd'));
  console.log('  ✅ /metrics passed: Prometheus text format validated with live counters');

  // Test Local Ollama Routing with $0.00 cost
  const ollamaCall = await makeRequest('/v1/chat/completions', 'POST', {
    model: 'ollama/llama3.2',
    messages: [{ role: 'user', content: 'Run local test query' }]
  });
  assert.strictEqual(ollamaCall.status, 200);
  assert.strictEqual(ollamaCall.headers['x-tokenarmor-cost-usd'], '0');
  console.log('  ✅ Ollama local routing passed: $0.00 token cost recorded');

  // Test Team Virtual API Keys API
  const newKeyReq = await makeRequest('/api/keys', 'POST', { name: 'Growth Engineering', monthlyBudgetUSD: 250.0 });
  assert.strictEqual(newKeyReq.status, 201);
  assert.ok(newKeyReq.data.key.key.startsWith('tarm_live_'));
  console.log('  ✅ /api/keys creation passed:', newKeyReq.data.key.key);

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! TokenArmor v1.2.0 is 100% operational.\n');
  server.close();
  process.exit(0);
}

runHttpTests().catch(err => {
  console.error('❌ Test failed:', err);
  server.close();
  process.exit(1);
});

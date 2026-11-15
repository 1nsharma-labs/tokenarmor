<p align="center">
  <img src="https://raw.githubusercontent.com/1nsharma-labs/tokenarmor/main/ui/logo.png" alt="TokenArmor Logo" width="120" onerror="this.style.display='none'"/>
</p>

<h1 align="center">🛡️ TokenArmor</h1>

<p align="center">
  <b>The Open-Source AI Gateway & Token FinOps Firewall</b><br>
  Slash your LLM API bills by up to 60% with exact prompt caching, real-time cost tracking, hard budget enforcement, and zero-trust PII sanitization.
</p>

<p align="center">
  <a href="https://github.com/1nsharma-labs/tokenarmor/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License"></a>
  <a href="https://github.com/1nsharma-labs/tokenarmor/blob/main/ee/LICENSE-EE"><img src="https://img.shields.io/badge/EE_License-BSL_1.1-purple.svg" alt="EE License"></a>
  <a href="https://github.com/sponsors/1nsharma"><img src="https://img.shields.io/badge/Sponsor-GitHub_Sponsors-pink.svg" alt="Sponsor"></a>
  <a href="https://tokenarmor.dev"><img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker"></a>
</p>

---

## ⚡ What is TokenArmor?

**TokenArmor** is a lightweight, ultra-low latency drop-in proxy for **OpenAI, Anthropic Claude, and Google Gemini APIs**. 

Instead of sending every LLM query directly upstream and racking up thousands of dollars in token bills, TokenArmor sits between your application and the model providers to:

1. **⚡ Exact & Semantic Prompt Caching:** Serves identical queries in `< 5ms` with **$0.00 token cost**.
2. **💰 Real-Time FinOps & Token Tracking:** Accurately counts input/output tokens and computes live dollar spend across all models.
3. **🛑 Hard Budget Firewall (Enterprise):** Enforces hard monthly/hourly dollar limits; blocks runaway spending before CFO sticker shock.
4. **🔒 PII & Secret Redaction (Enterprise):** Automatically masks emails, phones, credit cards, and API keys before sending prompts upstream.
5. **🔄 Universal Protocol Router:** Call Claude 3.5 Sonnet or Gemini 1.5 Flash using the standard OpenAI SDK format!

---

## 🏛️ Architecture

```
                      +-----------------------------+
                      |   Client Application / AI   |
                      |   (LangChain / OpenAI SDK)  |
                      +--------------+--------------+
                                     |
                                     v POST /v1/chat/completions
                      +-----------------------------+
                      |     TokenArmor Gateway      |
                      |     (Port 8080)             |
                      +--------------+--------------+
                                     |
                   +-----------------+-----------------+
                   |                                   |
         [Cache Hit: < 5ms]                  [Cache Miss: Router]
                   |                                   |
                   v                                   v
          +-----------------+                 +-----------------+
          | Return Response |                 | PII & Budget    |
          | ($0 Token Cost) |                 | Firewall Check  |
          +-----------------+                 +--------+--------+
                                                       |
                                      +----------------+----------------+
                                      |                |                |
                                      v                v                v
                                 +---------+      +---------+      +---------+
                                 | OpenAI  |      | Claude  |      | Gemini  |
                                 +---------+      +---------+      +---------+
```

---

## 🚀 Quick Start (60 Seconds)

### Option 1: Run with Docker Compose (Recommended)

```bash
git clone https://github.com/1nsharma-labs/tokenarmor.git
cd tokenarmor
docker compose up -d
```

### Option 2: Run with Node.js

```bash
git clone https://github.com/1nsharma-labs/tokenarmor.git
cd tokenarmor
npm start
```

Your gateway is now live:
* **Proxy Endpoint:** `http://localhost:8080/v1/chat/completions`
* **FinOps Dashboard UI:** `http://localhost:8080/`
* **Metrics API:** `http://localhost:8080/api/stats`

---

## 💻 1-Line Drop-in Integration

TokenArmor is 100% compatible with the official OpenAI SDK. You only need to change your `baseURL`:

### Python

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8080/v1",  # Point to TokenArmor
    api_key="your-openai-api-key"
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "What is TokenArmor?"}]
)

print(response.choices[0].message.content)
```

### TypeScript / Node.js

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:8080/v1', // Point to TokenArmor
  apiKey: process.env.OPENAI_API_KEY
});

const response = await openai.chat.completions.create({
  model: 'claude-3-5-sonnet', // Route directly to Claude with OpenAI SDK!
  messages: [{ role: 'user', content: 'Explain semantic caching' }]
});

console.log(response.choices[0].message.content);
```

### cURL

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello TokenArmor"}]
  }'
```

*Inspect the response headers:*
* `X-TokenArmor-Cache: HIT` (or `MISS`)
* `X-TokenArmor-Cost-USD: 0.000105`
* `X-TokenArmor-Latency-Ms: 4`

---

## 📊 Live FinOps Dashboard

Open `http://localhost:8080/` in your browser to view:
* **Live Dollar Savings:** Track exact money saved via prompt caching.
* **Cache Hit Rate:** Monitor your hit vs. miss efficiency percentage.
* **Model Telemetry:** Compare consumption across GPT-4o, Claude 3.5 Sonnet, and Gemini.
* **Transaction Ledger:** Live stream of token latency, costs, and request statuses.

---

## 💼 Dual Licensing & Open-Core Model

* **Core Gateway (`/core`):** Licensed under **Apache License 2.0**. 100% free for individual developers and production deployments.
* **Enterprise Edition (`/ee`):** Licensed under **Business Source License (BSL 1.1)**. Free for non-production testing and organizations under 100K monthly requests. Multi-user enterprise deployments require a commercial license key.

See [PRICING.md](PRICING.md) for full feature comparison.

---

## 🤝 Support TokenArmor & Community

TokenArmor is an open-source project created and maintained by **1nsharma-labs**.

If TokenArmor helps your team reduce LLM costs, improve caching, or govern AI traffic, consider supporting the project:

* **GitHub Sponsors:** [github.com/sponsors/1nsharma](https://github.com/sponsors/1nsharma)
* **Open Collective:** [opencollective.com/tokenarmor](https://opencollective.com/tokenarmor)
* **Polar.sh Feature Bounties:** [polar.sh/1nsharma-labs](https://polar.sh/1nsharma-labs)

Enterprise licensing, custom SLAs, and commercial governance are available separately:
* **Pricing & Enterprise Plans:** [PRICING.md](https://github.com/1nsharma-labs/tokenarmor/blob/main/PRICING.md)
* **Enterprise Inquiries:** `enterprise@1nsharma-labs.com`

---

## 🌐 The 1nsharma-labs Open-Source Suite

Explore our interconnected developer tools to slash costs and automate governance:
* 🛡️ [**TokenArmor**](https://github.com/1nsharma-labs/tokenarmor): AI Gateway & Token FinOps Firewall.
* 🍃 [**CloudPrune**](https://github.com/1nsharma-labs/cloudprune): AWS & GCP Cloud Waste & Zombie Resource Killer.
* 🔒 [**CompliGuard**](https://github.com/1nsharma-labs/compliguard): Continuous SOC 2 & ISO 27001 Evidence Engine.

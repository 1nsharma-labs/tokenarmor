# Viral X (Twitter) Launch Thread

**Post 1 (Hook):**
CFOs are furious about "Tokenmaxxing" LLM bills.

One accidental loop in your AI agent code can burn $5,000 on OpenAI before breakfast.

Today we're launching **TokenArmor**: The Open-Source AI Gateway & Token FinOps Firewall.

Slash your LLM bills by 50%+ with zero code changes. 🧵👇

---

**Post 2 (The Problem):**
Most teams send 100% of LLM queries directly to OpenAI / Anthropic APIs:
- 30%+ of calls are identical (wasted tokens)
- Zero centralized budget enforcement
- Sensitive PII & user emails leak into external provider logs

TokenArmor fixes this with a 1-line change: `baseURL="http://localhost:8080/v1"`.

---

**Post 3 (How it works):**
⚡ Exact Prompt Caching: Duplicate prompts return in < 5ms with $0.00 token cost.
💰 Real-time FinOps Dashboard: Live token & dollar cost tracking across GPT-4o, Claude 3.5, & Gemini.
🛑 Hard Budget Firewall: Hard monthly spending caps to stop runaway costs.
🔒 PII Scrubber: Auto-masks emails, phones, and API keys.

---

**Post 4 (Open-Core & Self-Hosted):**
100% self-hosted on your own infrastructure. No third-party data tracking.

Run it in 30 seconds:
```bash
git clone https://github.com/1nsharma-labs/tokenarmor.git
cd tokenarmor
docker compose up -d
```

Star the repo & let us know what you think! ⭐
🔗 https://github.com/1nsharma-labs/tokenarmor

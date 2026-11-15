# Show HN: TokenArmor – Open-source AI Gateway and FinOps Firewall to cut LLM bills

**Title:** Show HN: TokenArmor – Open-source AI Gateway and FinOps Firewall

**Link:** https://github.com/1nsharma-labs/tokenarmor

**Post Body:**

Hey HN,

I built **TokenArmor** (https://github.com/1nsharma-labs/tokenarmor) because our team got hit with an unexpected $14,000 monthly OpenAI bill after deploying LLM features to production. 

When we dug into the logs, we realized:
1. Over 35% of user queries were identical or nearly identical (e.g. repeated user onboarding prompts, health checks, common questions).
2. Different engineers were calling raw OpenAI, Anthropic, and Gemini endpoints without any centralized budget caps or token observability.
3. Proprietary prompts and user emails were leaking directly into upstream logs without sanitization.

Commercial tools like Portkey and Helicone exist, but our compliance team refused to route sensitive company prompts through third-party cloud servers.

So we built **TokenArmor**: a lightweight, self-hosted AI gateway that acts as a drop-in replacement for `api.openai.com`.

### What it does:
* **Exact Prompt Caching:** Hashes incoming model + messages deterministically (SHA-256). Repeated prompts return in `< 5ms` with **$0.00 token cost**.
* **FinOps Cost & Token Dashboard:** Tracks real-time dollar spend across OpenAI (GPT-4o, o1), Anthropic (Claude 3.5), and Gemini (1.5 Flash/Pro).
* **Hard Budget Firewall:** Set a monthly budget (e.g. $500). Once hit, non-cached upstream requests are blocked with HTTP 429 to prevent billing surprises.
* **PII Redaction:** Automatically scrubs emails, phone numbers, credit cards, and secret keys before forwarding upstream.
* **Universal SDK Translation:** Call Anthropic or Gemini using the standard OpenAI client SDK just by pointing `base_url="http://localhost:8080/v1"`.

The core proxy is 100% free under Apache 2.0. Advanced enterprise features (Hard budget quotas, PII scrubber) are licensed under BSL 1.1 (free for development & small teams).

You can run it in 30 seconds with Docker:
```bash
git clone https://github.com/1nsharma-labs/tokenarmor.git
cd tokenarmor
docker compose up -d
```

We'd love your feedback, feature requests, and bug reports!

GitHub: https://github.com/1nsharma-labs/tokenarmor

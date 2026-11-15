# TokenArmor Pricing & Editions

TokenArmor follows an **Open-Core** model. The core proxy, protocol routing, exact caching, and basic FinOps tracking are **100% Free and Open-Source under the Apache 2.0 license**.

For teams that need hard budget enforcement, enterprise security (PII redaction), SAML/Okta SSO, and priority SLA support, we offer commercial **Enterprise** licenses.

---

## Plan Comparison

| Feature | Community Edition (Free) | Pro / Team ($199/mo) | Enterprise ($799/mo) |
| :--- | :---: | :---: | :---: |
| **License** | Apache 2.0 | BSL 1.1 Commercial | BSL 1.1 Commercial |
| **Self-Hosted Deployment** | Unlimited | Unlimited | Unlimited |
| **Supported Models** | OpenAI, Anthropic, Gemini | OpenAI, Anthropic, Gemini | OpenAI, Anthropic, Gemini + Custom/Local (Ollama/vLLM) |
| **Exact SHA-256 Prompt Caching** | Included | Included | Included |
| **Redis Distributed Caching** | Included | Included | Included |
| **Semantic Vector Caching** | Basic | Advanced | Ultra-Fast In-Memory / pgvector |
| **FinOps Cost & Token Dashboard** | Included | Included | Included |
| **Team API Key Management** | Up to 5 keys | Up to 25 keys | Unlimited Keys |
| **Hard Budget Quota Enforcement** | - | Included (Hourly/Monthly) | Included + Slack/PagerDuty Webhooks |
| **PII & Prompt Sanitizer** | - | Basic Regex Scrubber | Comprehensive Regex + NLP Scrubber |
| **Single Sign-On (SAML/Okta/OIDC)** | - | - | Included |
| **Audit Logs (SOC 2 / HIPAA Ready)**| - | - | Continuous JSON / SIEM Export |
| **Support SLA** | GitHub Discussions | 24-hour Email SLA | 2-hour Dedicated Slack / Phone SLA |

---

## How to Purchase an Enterprise License

1. **Instant Checkout via LemonSqueezy / Stripe:**
   * Visit our billing portal: [billing.tokenarmor.dev](https://tokenarmor.dev/pricing)
   * Choose your tier (Pro or Enterprise).
   * Enter your corporate email and payment method (Cards, Bank Transfer, SEPA, UPI).
2. **Offline Cryptographic License Key:**
   * After checkout, you will receive a 64-character offline signed license key:
     ```
     TARM-ENT-XXXXXXXX-XXXXXXXX-XXXXXXXX
     ```
   * Set this key in your environment:
     ```bash
     TOKENARMOR_LICENSE_KEY="TARM-ENT-XXXXXXXX-XXXXXXXX-XXXXXXXX"
     ```
   * TokenArmor instantly unlocks all Enterprise Edition features with zero external phone-home network dependency!

---

## Custom Enterprise & Custom Invoicing

Need invoicing via Wire Transfer (ACH/SWIFT), custom MSA (Master Services Agreement), or compliance review?
* **Email:** `enterprise@1nsharma-labs.com` / `contact@1nsharma.com`
* **Response time:** Within 4 business hours.

---

## Sponsoring Open-Source Development
If you love TokenArmor and want to support our open-source core:
* Sponsor on GitHub: [github.com/sponsors/1nsharma](https://github.com/sponsors/1nsharma)
* Open Collective: [opencollective.com/tokenarmor](https://opencollective.com/tokenarmor)
* Polar.sh Feature Bounties: [polar.sh/1nsharma-labs](https://polar.sh/1nsharma-labs)

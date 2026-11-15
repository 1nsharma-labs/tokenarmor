# Reddit Launch Kit: r/selfhosted, r/LocalLLaMA, r/devops

## Subreddit: r/selfhosted

**Title:** I built TokenArmor: A self-hosted AI Gateway & FinOps proxy that cut our LLM bills by 50% (Open-Source)

**Body:**

Hey r/selfhosted!

If you're running AI agents, microservices, or developer tools that talk to OpenAI, Anthropic, or Google Gemini, you probably know how fast token costs add up. 

Most commercial LLM proxies want you to route your confidential prompts through *their* cloud. That didn't sit right with us, so we open-sourced **TokenArmor**.

**GitHub:** https://github.com/1nsharma-labs/tokenarmor

### Key Features:
1. **Drop-in OpenAI Compatible:** Just point `base_url="http://localhost:8080/v1"`. No code rewrites needed.
2. **Sub-5ms Prompt Cache:** SHA-256 prompt hashing serves duplicate queries instantly with zero token consumption.
3. **Multi-Provider Translation:** Send an OpenAI request payload to Claude 3.5 Sonnet or Gemini 1.5 Flash without installing custom SDKs.
4. **Built-in FinOps Dashboard:** Visual web UI showing exact dollars saved, model consumption breakdown, and latency metrics.
5. **Hard Budget Enforcement:** Never get an accidental surprise cloud bill.
6. **Self-Hosted First:** Runs on your own hardware via a single Docker container. Zero telemetry sent to external servers.

It's completely free and open-source (Apache 2.0). Check it out and let me know what features you'd like to see next!

---

## Subreddit: r/LocalLLaMA

**Title:** TokenArmor: An open-source unified AI Gateway with exact caching and cost tracking for OpenAI, Claude, and Gemini

**Body:**

Hey everyone,

We just released **TokenArmor** (https://github.com/1nsharma-labs/tokenarmor), an open-core AI gateway built for engineers managing multi-model workflows.

It acts as a local proxy that gives you:
* Exact SHA-256 prompt caching
* Real-time dollar and token tracking per model
* PII scrubbing for outgoing prompts
* Support for OpenAI, Claude 3.5, and Gemini under one OpenAI-compatible endpoint.

Check out the repo, star if you find it useful, and feel free to submit PRs!

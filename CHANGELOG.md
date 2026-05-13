# Changelog

A running log of the things developers should know about. For full release notes, see [docs.tinyfish.ai](https://docs.tinyfish.ai/).

---

## 2026

### May 2026

- **Search & Fetch are free for everyone** *(May 4)* — Same endpoints, same dashboard, generous rate limits, no credit card. Built on our own Chromium fleet so we can keep them free *and* fast.

### April 2026

- **Vault — agent-grade authentication** — Secure credential injection (1Password JIT), encrypted session persistence in S3, and human-in-the-loop hand-off for 2FA / CAPTCHA. Now wired into Python and TypeScript SDKs.
- **Major Platform Launch** *(Apr 14)* — Search, Fetch, and Browser APIs unified under a single API key alongside Agent.
- **Agent Skill** *(Apr ~7)* — One-line install Skill that teaches coding agents (Claude Code, Cursor, Codex, OpenClaw, OpenCode) when to use Search vs. Fetch vs. Agent. ~87% token reduction vs. raw MCP on equivalent tasks.
- **CLI launch** *(Apr 3)* — `npm install -g @tiny-fish/cli`. Search, Fetch, Browser, and Agent as first-class CLI commands; results stream to disk to keep them out of your model context window.
- **ByteDance co-launch** *(Apr 3)* — Shipped alongside ByteDance Doll Seed 2.0.
- **Python SDK v0.2.5 / TS SDK** — Full parity across Search, Fetch, Browser, Agent, Vault.
- **Zapier integration** — Drag-and-drop Search and Fetch steps in Zapier.

### March 2026

- **Search & Fetch private beta** — Locked behind allowlist with the search-arena partner before going public.
- **Vault settings UI** — Connect, manage, enable/disable credentials per workflow.

### February 2026

- **Mino &rarr; TinyFish brand migration** completed across docs, dashboard, and SDK.
- **RFC: Authenticated Workflows for EVA** — laid the groundwork for Vault: secure credential injection, session persistence, and human-in-the-loop bridging.

### January 2026

- **`tinyfish.ai` rebrand** from Mino — new domain, new fish (Mino is now the agent's name).

### Earlier

- **Cookbook open-sourced** — first wave of recipes published under [github.com/tinyfish-io/tinyfish-cookbook](https://github.com/tinyfish-io/tinyfish-cookbook).
- **Agent endpoint GA** — natural-language web automation with structured JSON output.
- **Browser endpoint** — fully managed cloud browsers with rotating proxies and stealth profiles.

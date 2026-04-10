# OSS Alternatives Finder — Claude Skill

**Find actively maintained open source alternatives to any paid SaaS tool or commercial API.**

Ask Claude things like:
- *"Is there an open source alternative to Datadog?"*
- *"I want to self-host something instead of paying for Auth0"*
- *"What can I use instead of Algolia for free?"*
- *"Find me an OSS replacement for Intercom"*

Claude will run parallel TinyFish agents across GitHub, awesome-selfhosted, and developer communities — check the real health of each candidate (last release, contributors, Docker support, feature parity) — and return a ranked list with a plain English gain/loss summary for each option.

## What it checks

| Signal | Why it matters |
|---|---|
| Last commit & release date | Is it actually maintained? |
| Contributor count | Will bugs get fixed? |
| Star count | Community validation |
| Docker availability | How hard is self-hosting? |
| Feature parity | What do you actually lose? |
| Community mentions | Are real devs using it? |

## Requirements

- TinyFish CLI installed: `npm install -g tinyfish`
- Authenticated: `tinyfish auth login`

## Install

**Option 1 — Claude.ai:**
Download `oss-alternatives.skill` from [Releases](../../releases) and upload to Claude.ai → Settings → Skills

**Option 2 — CLI:**
```bash
npx skills add tinyfish-io/tinyfish-cookbook --skill oss-alternatives
```

## Example output

```
## OSS Alternatives to Datadog

### #1 — Grafana + Prometheus ⭐ 62k
Last release: 2 weeks ago | Contributors: 1,400+ | Docker: yes | License: AGPL-3.0

✅ What you gain
- Full metrics, dashboards, and alerting with no per-host pricing
- Complete data ownership and retention control
- Massive plugin ecosystem

❌ What you lose
- No built-in APM / distributed tracing (need Tempo separately)
- Significant ops overhead — you run the infrastructure
- No phone/chat support

Bottom line: Best for teams comfortable with Kubernetes who want to escape per-seat pricing.
```

## Security notes

This skill scrapes live public data from GitHub and community forums. All content is treated as untrusted and synthesised by an LLM — never executed. See [Snyk audit](https://skills.sh) for full security report.

## Built with

- [TinyFish Web Agent](https://tinyfish.ai) — parallel web scraping
- Part of the [TinyFish Cookbook](https://github.com/tinyfish-io/tinyfish-cookbook)

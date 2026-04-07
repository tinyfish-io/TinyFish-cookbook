# dep-security — Claude Skill

**Real-time CVE scanning for your dependencies. Catches vulnerabilities in the 48-hour window that Snyk and Dependabot miss.**

Paste your `package.json` and ask Claude things like:
- *"Check my dependencies for new vulnerabilities"*
- *"Any CVEs in my package.json from the last 48 hours?"*
- *"Are my packages safe right now?"*

Claude batches your packages and fires parallel TinyFish agents across CVE MITRE, GitHub Security Advisories, and the npm security feed simultaneously — all filtered to the last 48 hours.

## Why 48 hours?

Snyk, Dependabot, and `npm audit` all use cached vulnerability databases that are typically 24–72 hours behind. This skill hits the live feeds directly, giving you same-day visibility on newly disclosed CVEs before your existing tools catch up.

## What you get

- Which of your dependencies have brand-new vulnerabilities
- Severity (Critical / High / Medium / Low)
- Plain English explanation of what the vulnerability does
- Whether your installed version is actually in the affected range
- Patched version if one exists
- Copy-paste `npm install` commands to fix everything

## Requirements

- TinyFish CLI: `npm install -g tinyfish`
- Authenticated: `tinyfish auth login`

## Install

**Claude.ai:** Download `dep-security.skill` from Releases → upload to Settings → Skills

**CLI:**
```bash
npx skills add KrishnaAgarwal7531/skills- --skill dep-security
```

## Security notes

Queries live public security databases (CVE MITRE, GitHub Advisories, npmjs.com). No code is executed, no files uploaded externally. All data is synthesised by an LLM only.

## Built with

- [TinyFish Web Agent](https://tinyfish.ai)
- Part of the [TinyFish Cookbook](https://github.com/tinyfish-io/tinyfish-cookbook)

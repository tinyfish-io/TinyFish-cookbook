# dev-pain-finder — Claude Skill

**Find real developer pain points for any keyword. Build what developers actually need.**

Enter any keyword or problem space — authentication, Kubernetes, ORMs, deployment pipelines — and Claude fires parallel TinyFish agents across Reddit, Hacker News, dev.to, and GitHub Discussions simultaneously. Complaints are grouped by theme, scored by frequency and upvote weight, and returned as a ranked opportunity map.

## What you get

- Ranked pain themes with frustration scores
- Exact complaint titles with upvote/reaction counts
- Pattern analysis — what the underlying problem actually is
- Opportunity signal — where frustration is high and solutions are thin
- Top 3 actionable build opportunities

## Why these sources

| Source | Why it's valuable |
|---|---|
| Reddit | Raw, unfiltered developer frustration at scale |
| Hacker News | Senior devs, high signal-to-noise, sorted by popularity |
| dev.to | Longer-form complaints with more context |
| GitHub Discussions | Closest to the actual tool — real users, real problems |

## Requirements

- TinyFish CLI: `npm install -g tinyfish`
- Authenticated: `tinyfish auth login`

## Install

**Claude.ai:** Download `dev-pain-finder.skill` from Releases → upload to Settings → Skills

**CLI:**
```bash
npx skills add KrishnaAgarwal7531/skills- --skill dev-pain-finder
```

## Example

```
find developer pain points around "authentication"
```

Returns themes like: "Session management complexity", "OAuth provider inconsistencies",
"JWT debugging is a nightmare", "Lack of good multi-tenant solutions" — each scored
and ranked with real quotes and opportunity signals.

## Built with

- [TinyFish Web Agent](https://tinyfish.ai)
- Part of the [TinyFish Cookbook](https://github.com/tinyfish-io/tinyfish-cookbook)

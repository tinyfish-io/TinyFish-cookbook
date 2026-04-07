# Tenders Finder — Claude Skill

**Find open Singapore government tenders for any sector in real time.**

Ask Claude things like:
- *"Find open IT tenders in Singapore"*
- *"What government construction contracts are open right now?"*
- *"Singapore healthcare tenders closing this week"*
- *"Find consulting tenders on GeBIZ"*

Claude fires parallel TinyFish agents across 5 Singapore tender portals simultaneously — GeBIZ, Tenders On Time, Bid Detail, Tenders Info, and Global Tenders — returning only open tenders with upcoming deadlines, sorted by closing date.

## Supported sectors

IT / Software · Construction · Healthcare · Consulting · Logistics · Education

## What you get

- Tender title, ID, and issuing agency
- Publication date and submission deadline
- Tender type (Open / Selective / Limited)
- Brief description and eligibility criteria
- Direct link to the official tender page
- Urgency flags for tenders closing within 7 days
- Summary table across all portals

## Requirements

- TinyFish CLI: `npm install -g tinyfish`
- Authenticated: `tinyfish auth login`

## Install

**Claude.ai:** Download `tenders-finder.skill` from Releases → upload to Settings → Skills

**CLI:**
```bash
npx skills add KrishnaAgarwal7531/skills- --skill tenders-finder
```

## Based on

The [Singapore Tender Scout web app](https://tender-scout-singapore.lovable.app) — this skill brings the same functionality directly into Claude without the web app.

## Built with

- [TinyFish Web Agent](https://tinyfish.ai)
- Part of the [TinyFish Cookbook](https://github.com/tinyfish-io/tinyfish-cookbook)

# Interview Prep Guide — Claude Skill

**Real interview questions and patterns for any company, scraped live.**

Ask Claude things like:
- *"Help me prepare for my Google SWE interview"*
- *"What questions does Stripe ask in interviews?"*
- *"What's the Citadel interview like for quant roles?"*
- *"I have a Meta system design round next week"*

Claude runs parallel TinyFish agents across Glassdoor, Blind, and Reddit — extracts real questions candidates reported, identifies the most frequent topics, and builds a ranked prep checklist based on what actually came up in the room.

## What you get

- Ranked topic frequency (what to study first)
- Real questions copied verbatim from candidate reports
- Actual difficulty level across multiple sources
- Round structure (phone screen, onsite, take-home, bar raiser)
- What candidates wish they had prepared
- A prioritised prep checklist

## Requirements

- TinyFish CLI: `npm install -g tinyfish`
- Authenticated: `tinyfish auth login`

## Install

**Claude.ai:** Download `interview-prep.skill` from Releases → upload to Settings → Skills

**CLI:**
```bash
npx skills add KrishnaAgarwal7531/skills- --skill interview-prep
```

## Security notes

Scrapes live public data from Glassdoor, Blind, and Reddit. All content is synthesised by an LLM — never executed.

## Built with

- [TinyFish Web Agent](https://tinyfish.ai)
- Part of the [TinyFish Cookbook](https://github.com/tinyfish-io/tinyfish-cookbook)

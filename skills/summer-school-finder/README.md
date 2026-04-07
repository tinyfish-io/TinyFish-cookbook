# Summer School Finder — Claude Skill

**Discover and compare summer school programs from universities worldwide. Scraped live from official program pages.**

Ask Claude things like:
- *"Find summer school programs for high school students interested in Computer Science in the USA"*
- *"What summer programs exist for STEM students in the UK?"*
- *"Compare summer schools in Singapore for Grade 10-12 students"*
- *"Find online summer programs in business for undergraduates"*

Claude fires parallel TinyFish agents across 7-8 real university program pages simultaneously — extracting dates, fees, deadlines, and eligibility from official sources in real time.

## What you get

- Program name, institution, location
- Exact dates and duration
- Tuition fees and application deadline
- Eligibility criteria and requirements
- Direct link to the official program page
- Quick comparison table across all programs
- Deadline countdown — which applications close soonest

## Requirements

- TinyFish CLI: `npm install -g tinyfish`
- Authenticated: `tinyfish auth login`

## Install

**Claude.ai:** Download `summer-school-finder.skill` from Releases → upload to Settings → Skills

**CLI:**
```bash
npx skills add KrishnaAgarwal7531/skills- --skill summer-school-finder
```

## Based on

The [Summer School Finder web app](https://tinyfishsummerschool.lovable.app) built with TinyFish — this skill brings the same functionality directly into Claude without needing the web app.

## Built with

- [TinyFish Web Agent](https://tinyfish.ai)
- Part of the [TinyFish Cookbook](https://github.com/tinyfish-io/tinyfish-cookbook)

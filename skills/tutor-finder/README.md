# Tutor Finder Skill for Claude
 
Find and compare exam tutors from across the web in real time — directly inside Claude.
 
## What it does
 
Ask Claude things like:
- *"Find me a GRE tutor in London"*
- *"Best online SAT tutors under $50/hr"*
- *"Compare GMAT tutors — I'm in Singapore"*
- *"Find JEE tutors in India"*
- *"Who are the top TOEFL tutors available online?"*
Claude will automatically scrape **Wyzant**, **Varsity Tutors**, **Preply**, **Kaplan**, **Princeton Review**, and location-specific platforms in real-time using TinyFish — then compare tutors by pricing, qualifications, experience, and past student results to give you the best options.
 
## Requirements
 
- TinyFish CLI installed: `npm install -g tinyfish`
- Authenticated: `tinyfish auth login`
## Install
 
### Option 1 — Skills CLI (recommended)
 
```bash
npx skills add KrishnaAgarwal7531/skills- --skill tutor-finder
```
 
### Option 2 — Manual
 
1. Clone or download this repository
2. Copy the `tutor-finder/` folder into your agent's skills directory:
   - Claude Code: `~/.claude/skills/`
   - Cursor: `.cursor/skills/` in your project
   - Global (all agents): `~/.agents/skills/`
3. The skill is picked up automatically — no restart needed
## How it works
 
The skill follows a 4-step pipeline:
 
1. **Discover** — picks the most relevant 7-10 platforms for your exam and location, including region-specific platforms (Vedantu/Unacademy for India, Snapask/SmileTutor for Singapore, MyTutor/TutorFair for UK)
2. **Scrape** — fires one TinyFish agent per platform simultaneously, extracting live tutor profiles with pricing, qualifications, and results
3. **Filter and rank** — keeps only tutors who teach your exam, deduplicates across platforms, ranks by price then experience
4. **Present** — returns a clean comparison with a top recommendation
Supported exams: **SAT · ACT · AP · GRE · GMAT · TOEFL/IELTS · JEE/NEET · Olympiads**
 
## Built with
 
- [TinyFish Web Agent](https://tinyfish.ai) — parallel web scraping

- 

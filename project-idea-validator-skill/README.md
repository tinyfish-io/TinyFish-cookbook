# IdeaProbe
 
> Validate your project idea before you write a single line of code.
 
IdeaProbe is a developer agent skill powered by [TinyFish](https://tinyfish.ai) that searches GitHub and Dev.to in parallel to surface what already exists in your problem space — then synthesizes findings into a structured gap analysis report.
 
Give it an idea in plain English. Get back a full picture: which projects already exist, how active they are, what's abandoned, what's overcrowded, and where the real opportunity still lives. No manual Googling, no tab-switching, no guesswork.
 
**Built for developers who want to build the right thing, not just any thing.**

 ---
 
## How It Works
 
IdeaProbe runs two TinyFish web agents simultaneously against GitHub and Dev.to, extracts structured JSON from each, then synthesizes everything into a gap analysis report with a clear verdict.
 
```
Your idea (plain English)
        │
        ▼
┌───────────────────────────────────┐
│         IdeaProbe Skill           │
│                                   │
│  ┌─────────────┐ ┌─────────────┐  │
│  │   GitHub    │ │   Dev.to    │  │  ← parallel
│  │  (repos)    │ │ (articles)  │  │
│  └──────┬──────┘ └──────┬──────┘  │
│         └───────┬────────┘        │
│                 ▼                 │
│         Gap Analysis Report       │
└───────────────────────────────────┘
        │
        ▼
  What exists · Maturity · Gaps · Verdict
```
 
### What you get
 
- Existing GitHub repos ranked by stars and last activity
- Dev.to article coverage showing community interest and awareness
- Maturity assessment: is the space active, abandoned, or fragmented?
- Specific gaps and differentiation angles you can actually act on
- A plain-English verdict: build, differentiate, or skip
 
---
 
## Requirements
 
| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | Required to install the TinyFish CLI |
| TinyFish CLI | latest | `npm install -g @tiny-fish/cli` |
| TinyFish API key | — | Free at [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys) — includes 500 free steps, no credit card |
| An agent runtime | — | Claude Code, Copilot, or any agent that reads SKILL.md files |
 
---

Install the Skill
 
Copy `SKILL.md` into your agent's skills directory:
 
**Claude Code:**
```bash
# Mac/Linux
cp SKILL.md ~/.claude/skills/project-idea-validator/SKILL.md
 
# Windows PowerShell
Copy-Item SKILL.md -Destination "$env:USERPROFILE\.claude\skills\project-idea-validator\SKILL.md" -Force
```
 
**Other agents:** Drop `SKILL.md` wherever your agent reads skill files from (e.g. `.agents/`, `skills/`, or your project root).
 
---

## Usage
 
Once the skill is installed and you're authenticated, just describe your idea to your agent:
 
```
Validate my project idea: a browser extension that summarises any GitHub PR in one click
```
 
```
Is there already something like a CLI tool that auto-generates changelogs from commit messages?
```
 
```
I want to build a Notion widget that shows live stock prices — has this been done?
```
 
The agent reads the skill, fires the TinyFish agents, and returns a report like this:
 
```
## Project Idea Validation: PR Summariser Browser Extension
 
### What Already Exists
- github-pr-summary (⭐ 1.2k) — Chrome extension using GPT-4 to summarise PRs, last active 3 months ago
- pr-digest (⭐ 340) — CLI tool, not a browser extension, abandoned 1 year ago
- Dev.to: 4 articles on AI-assisted code review, none covering browser extensions specifically
 
### Maturity Assessment
- GitHub: fragmented — a few attempts, none dominant or actively maintained
- Dev.to coverage: sparse — interest exists but no canonical solution has emerged
 
### Gaps & Opportunities
- No actively maintained browser extension exists
- Existing tools require CLI setup — a zero-config extension has clear UX advantage
- None support multiple AI providers or custom prompts
 
### Verdict
The space has been attempted but not solved. A polished, actively maintained browser
extension with a good UX could own this niche.
```
 
---

# Built With
 
- [TinyFish](https://tinyfish.ai) — web agent infrastructure
- [TinyFish CLI](https://www.npmjs.com/package/@tiny-fish/cli) — terminal interface for TinyFish agents

---
 
## License
 
MIT
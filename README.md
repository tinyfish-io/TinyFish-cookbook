# The TinyFish Cookbook

<img width="1920" height="1080" alt="Tinyfish Accelerator banner" src="https://github.com/user-attachments/assets/bc32bf8b-1a9e-41ea-b690-4bacf41ee132" />

---

<div align="center">

<table>
<tr>
<td align="center">

### ⛊ &nbsp;&nbsp; **The TinyFish Accelerator is now accepting applications**  &nbsp;&nbsp;  ⛊

*$2M investment seed pool💰* • *9-week program* • *Free credits* • *Engineering support* • *Business mentorship* 

### **[👉 Apply Now 👈](https://www.tinyfish.ai/accelerator)**

</td>
</tr>
</table>

</div>

---

[Website](https://tinyfish.ai/) | [Docs](https://docs.mino.ai/) | [Discord](https://discord.gg/tinyfish) | [License](LICENSE) | [X](https://x.com/Tiny_Fish) | [LinkedIn](https://www.linkedin.com/company/tinyfish-ai/) | [Threads](https://www.threads.com/@tinyfish_ai) | [Instagram](https://www.instagram.com/tinyfish_ai/)



## About This Repository

Welcome to the **TinyFish Cookbook!** This is a growing collection of recipes, demos, and automations built with TinyFish.

**🏆 Were SOTA!** — we just scored 90% on Mind2Web benchmark, outperforming Gemini by 21 points, OpenAI by 29, and Anthropic by 34. We ran all 300 tasks in parallel and published every single run publicly. [Read our benchmark results →](https://tinyfish.ai/blog/mind2web) | [View all runs →](https://docs.google.com/spreadsheets/d/1jgRESVlSYygPO4dKKqzPohGUX5b78Ay59422mM29CsU/edit?gid=436688783#gid=436688783)

## What is TinyFish?

**SOTA web agents in an API** that lets you treat real websites like programmable surfaces. Instead of juggling headless browsers, selectors, proxies, and weird edge cases, you call a single API with a goal and some URLs and get back clean JSON. It handles navigation, forms, filters, dynamic content, proxies, and multi-step flows across many sites at once.

The same infrastructure and agents used by big enterpises (like google, doordash and classpass), now for everyone!


## Why TinyFish?
- 🕸️ **Fully managed browser and agent infra in one API**
- 🌐 **Any website → API** — Turn sites without APIs into programmable data sources
- 💬 **Natural language goals** — Send a URL + plain English, get structured JSON back
- 🤖 **Real browser automation** — Multi-step flows, forms, filters, calendars, dynamic content
- 🥷 **Built-in stealth mode** — Rotating proxies + stealth profiles included (no extra cost)
- 📊 **Production-grade logs** — Full observability and debugging for every run
- 🔌 **Flexible integration** — HTTP API, visual Playground, or MCP server for Claude/Cursor

## The Recipes

Each folder in this repo is a standalone project. Dive in to see how to solve real-world problems.

| Recipe | Description |
|--------|-------------|
| [anime-watch-hub](./anime-watch-hub) | Helps you find sites to read/watch your favorite manga/anime for free |
| [bestbet](./bestbet) | Sports betting odds comparison tool |
| [competitor-analysis](./competitor-analysis) | Live competitive pricing intelligence dashboard |
| [fast-qa](./fast-qa) | No-code QA testing platform with parallel test execution and live browser previews |
| [loan-decision-copilot](./loan-decision-copilot) | AI-powered loan comparison tool across banks and regions |
| [logistics-sentry](./logistics-sentry) | Logistics intelligence platform for port congestion and carrier risk tracking |
| [Manga-Availability-Finder](./Manga-Availability-Finder) | Searches multiple reading platforms for manga/webtoon availability |
| [openbox-deals](./openbox-deals) | Real-time open-box and refurbished deal aggregator across 8 retailers |
| [research-sentry](./research-sentry) | Voice-first academic research co-pilot scanning ArXiv, PubMed, and more |
| [scholarship-finder](./scholarship-finder) | AI-powered scholarship discovery system pulling live data from official websites |
| [stay-scout-hub](./stay-scout-hub) | Searches across all sites for places to stay when traveling for conventions or events |
| [summer-school-finder](./summer-school-finder) | Discover and compare summer school programs from universities around the world |
| [tinyskills](./tinyskills) | Multi-source AI skill guide generator |

> More recipes added weekly!

## Getting Started with the API

You don't need to install heavy SDKs. TinyFish works with standard HTTP requests.

### 1. Get your API Key

Sign up on [tinyfish.ai](https://tinyfish.ai) and grab your API key.

### 2. Run a Command

Here is how to run a simple automation agent:

#### cURL

```bash
curl -N -X POST https://agent.tinyfish.ai/v1/automation/run-sse \
  -H "X-API-Key: $TINYFISH_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://agentql.com",
    "goal": "Find all AgentQL subscription plans and their prices. Return result in json format"
  }'
```

#### Python

```python
import json
import os
import requests

response = requests.post(
    "https://agent.tinyfish.ai/v1/automation/run-sse",
    headers={
        "X-API-Key": os.getenv("TINYFISH_API_KEY"),
        "Content-Type": "application/json",
    },
    json={
        "url": "https://agentql.com",
        "goal": "Find all AgentQL subscription plans and their prices. Return result in json format",
    },
    stream=True,
)

for line in response.iter_lines():
    if line:
        line_str = line.decode("utf-8")
        if line_str.startswith("data: "):
            event = json.loads(line_str[6:])
            print(event)
```

#### TypeScript

```typescript
const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
  method: "POST",
  headers: {
    "X-API-Key": process.env.TINYFISH_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: "https://agentql.com",
    goal: "Find all AgentQL subscription plans and their prices. Return result in json format",
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(decoder.decode(value));
}
```

> By the way! if you want to expose your project on localhost to your friends to show them a demo, you can now use the [tinyfi.sh](https://tinyfi.sh) by us! Completly free and easy to use!


## Star History

<p align="center">
  <a href="https://www.star-history.com/#tinyfish-io/tinyfish-cookbook&type=date">
    <img src="https://api.star-history.com/svg?repos=tinyfish-io/tinyfish-cookbook&type=date&legend=top-left" alt="Star History Chart">
  </a>
</p>

## Contributors

<a href="https://github.com/tinyfish-io/TinyFish-cookbook/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=tinyfish-io/TinyFish-cookbook" />
</a>

Got something cool you built with TinyFish? We want it in here! Check out our [Contributing Guide](CONTRIBUTING.md) for the full rundown on how to submit your project.


## Community & Support

- [Join us on Discord](https://discord.gg/tinyfish) — ask questions, share what you're building, hang out
- Learn more at [tinyfish.ai](https://tinyfish.ai)

## Legal Disclaimer

This repository is a community-driven space for sharing derivatives, code samples, and best practices related to Tiny Fish products. By using the materials in this repository, you acknowledge and agree to the following:
- **"As-Is" Basis**: All code, scripts, and documentation shared here are provided "AS IS" and "AS AVAILABLE." TinyFish makes no warranties of any kind, whether express or implied, regarding the accuracy, reliability, or security of community-contributed content.
- **No Obligation to Maintain**: Tiny Fish is under no obligation to monitor, update, or fix bugs, errors, or security vulnerabilities found in community-contributed derivatives.
- **User Responsibility**: You are solely responsible for vetting and testing any code before implementing it in a production environment. Use of these derivatives is at your own risk.
- **Limitation of Liability**: In no event shall Tiny Fish be held liable for any claim, damages, or other liability—including but not limited to system failures, data loss, or security breaches—arising from the use of or inability to use the contents of this repository.

> Note: Contributions from the community do not represent the official views or supported products of Tiny Fish.
---

<img src="https://github.com/user-attachments/assets/2cf004f0-0065-4f21-9835-12ac693964f1" width="100%" />




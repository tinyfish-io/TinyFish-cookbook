# The TinyFish Cookbook

<a href="https://www.tinyfish.ai">
  <img width="1034" height="407" alt="CKBOOK" src="https://github.com/user-attachments/assets/ce4fccb9-70b8-4023-8022-4e8e3b244fbe" />
</a>

<div align="center">

[![Website](https://img.shields.io/badge/Website-141414?style=for-the-badge&logo=googlechrome&logoColor=white)](https://tinyfish.ai/)
[![Docs](https://img.shields.io/badge/Docs-526CE5?style=for-the-badge&logo=readthedocs&logoColor=white)](https://docs.tinyfish.ai/)
[![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/tinyfish)
[![License](https://img.shields.io/badge/License-View-green?style=for-the-badge)](LICENSE)
[![X](https://img.shields.io/badge/X-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/Tiny_Fish)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/company/tinyfish-ai/)
[![Threads](https://img.shields.io/badge/Threads-000000?style=for-the-badge&logo=threads&logoColor=white)](https://www.threads.com/@tinyfish_ai)
[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/tinyfish_ai/)

</div>



## About This Repository

Welcome to the **TinyFish Cookbook!** This is a growing collection of recipes, demos, and automations built with TinyFish.

### Core Endpoints

TinyFish provides four distinct endpoints, each designed to tackle different layers of web interaction—from lightning-fast search to fully managed, hardcore browser automation.

| Endpoint | What It Does | Best For | Speed |
|----------|--------------|----------|-------|
| **Agent** | Provide a URL and a natural language goal. The agent navigates, acts, and returns clean JSON. | Multi-step flows, complex tasks, and data extraction. | ~10s to minutes |
| **Search** | Lightning-fast indexed search (like Google for your agent). Finds relevant online sources. | Quick discovery and gathering surface-level context. | < 1 second |
| **Fetch** | Give it a link, and it strips out the heavy HTML/CSS, returning the page content as clean Markdown. | Reading specific pages and feeding content to LLMs. | A few seconds |
| **Browser**| Rent a fully managed cloud browser from us. Connect and power your own Playwright or Selenium automations. | Hardcore developers running custom agents or scripts. | Real-time |

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

### Featured Recipes (Live Demos)

These recipes use the latest TinyFish SDK and are deployed with live demos you can try right now.

| Recipe | Description | Live Demo |
|--------|-------------|-----------|
| [viet-bike-scout](./viet-bike-scout) | Motorbike rental price comparison tool across Vietnamese cities using parallel browser agents | [Live Demo](https://cookbook-viet-bike-scout.vercel.app) |
| [tutor-finder](./tutor-finder) | AI-powered tutor discovery platform for competitive exams across multiple platforms | [Live Demo](https://cookbook-tutor-finder.vercel.app) |
| [openbox-deals](./openbox-deals) | Real-time open-box and refurbished deal aggregator across 8 retailers | [Live Demo](https://cookbook-openbox-deals.vercel.app) |
| [summer-school-finder](./summer-school-finder) | Discover and compare summer school programs from universities around the world | [Live Demo](https://cookbook-summer-school-finder.vercel.app) |

### More Recipes

| Recipe | Description |
|--------|-------------|
| [anime-watch-hub](./anime-watch-hub) | Helps you find sites to read/watch your favorite manga/anime for free |
| [bestbet](./bestbet) | Sports betting odds comparison tool |
| [code-reference-finder](./code-reference-finder) | AI-powered code snippet analyzer that finds real-world usage examples from GitHub and Stack Overflow |
| [competitor-analysis](./competitor-analysis) | Live competitive pricing intelligence dashboard |
| [competitor-scout-cli](./competitor-scout-cli) | Natural language CLI tool for researching competitor feature decisions across multiple websites |
| [concept-discovery-system](./concept-discovery-system) | Project idea validator that discovers similar existing projects across GitHub, Dev.to, and Stack Overflow |
| [fast-qa](./fast-qa) | No-code QA testing platform with parallel test execution and live browser previews |
| [game-buying-guide](./game-buying-guide) | Video game buying decision tool comparing pricing and deals across 10 gaming platforms in parallel |
| [lego-hunter](./lego-hunter) | Global inventory search tool finding rare Lego sets across 15+ retailers with price and availability analysis |
| [loan-decision-copilot](./loan-decision-copilot) | AI-powered loan comparison tool across banks and regions |
| [logistics-sentry](./logistics-sentry) | Logistics intelligence platform for port congestion and carrier risk tracking |
| [Manga-Availability-Finder](./Manga-Availability-Finder) | Searches multiple reading platforms for manga/webtoon availability |
| [research-sentry](./research-sentry) | Voice-first academic research co-pilot scanning ArXiv, PubMed, and more |
| [restaurant-comparison-tool](./restaurant-comparison-tool) | Pre-visit restaurant safety intelligence tool analyzing Google Maps reviews, menus, and allergen signals |
| [scholarship-finder](./scholarship-finder) | AI-powered scholarship discovery system pulling live data from official websites |
| [silicon-signal](./silicon-signal) | Semiconductor supply chain tracker for lifecycle, availability, and lead-time signals |
| [stay-scout-hub](./stay-scout-hub) | Searches across all sites for places to stay when traveling for conventions or events |
| [tenders-finder](./tenders-finder) | AI-powered Singapore government tender discovery tool scraping multiple tender portals in parallel |
| [tinyskills](./tinyskills) | Multi-source AI skill guide generator |
| [waifu-deal-sniper](./waifu-deal-sniper) | Discord bot for anime figure collectors finding discounted pre-owned figures from AmiAmi, Mercari, and Solaris Japan |
| [wing-command](./wing-command) | Chicken wing tracker using AI-powered scraping to find the best wings near you by flavor preference |
| Many more! | this list is updated quite often! |


### n8n Workflows

Pre-built n8n workflows using TinyFish — import the JSON and go.

| Workflow | Description |
|----------|-------------|
| [Competitor Scout](./N8N_WorkFlows/Competitor%20Scout%20CLI) | Research competitor feature decisions with OpenAI planning and TinyFish evidence collection |
| [Web Research Agent](./N8N_WorkFlows/Web%20Research%20Agent) | Chatbot that scrapes any website with TinyFish and saves summarized reports to Notion |
| [Daily Product Hunt Tracker](./N8N_WorkFlows/Daily%20Product%20Hunt%20Tracker) | Scheduled workflow delivering daily top 5 trending Product Hunt products to Telegram |

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

> By the way! If you want to expose your project on localhost to your friends to show them a demo, you can now use the [tinyfi.sh](https://tinyfi.sh) by us! Completely free and easy to use!


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




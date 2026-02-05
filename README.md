# The TinyFish Cookbook

<img width="1034" height="407" alt="CKBOOK" src="https://github.com/user-attachments/assets/ce4fccb9-70b8-4023-8022-4e8e3b244fbe" />

[Website](https://tinyfish.ai/) | [Docs](https://docs.mino.ai/) | [Discord](https://discord.gg/cv3JS4t4) | [License](LICENSE) | [X](https://x.com/Tiny_Fish) | [LinkedIn](https://www.linkedin.com/company/tinyfish-ai/) | [Threads](https://www.threads.com/@tinyfish_ai) | [Instagram](https://www.instagram.com/tinyfish_ai/)

---

## About This Repository

Welcome to the **TinyFish Cookbook!** This is a growing collection of recipes, demos, and automations built with TinyFish.

Think of this like a recipe book for the web. Whether you want to build an automated travel agent, a job application bot, or a market research tool, you can grab a recipe here, tweak the ingredients, and start cooking.

## What is TinyFish?

TinyFish is a **web agents API** that lets you treat real websites like programmable surfaces. Instead of juggling headless browsers, selectors, proxies, and weird edge cases, you call a single API with a goal and some URLs and get back clean JSON. It handles navigation, forms, filters, dynamic content, and multi-step flows across many sites at once, so you can focus on product logic instead of browser plumbing.

The same enterprise-grade infrastructure used in large production environments is now exposed directly to developers.

## Power Features in one API

- **Any website as an API** — Turn ordinary websites (including ones without official APIs) into programmable surfaces for your apps.
- **Natural language -> structured JSON** — Send a URL (or many) plus a natural language goal, get back clean JSON in the shape you specify.
- **Real browser automation** — Navigate real websites in real time. We handle complex flows like multi-step bookings, form filling, filters, calendars, and dynamic JavaScript content.
- **Built-in Stealth** — Every request runs in a stealth browser profile with rotating proxies to reduce the chance of triggering anti-bot defenses. (No extra charge for proxy data).
- **Production-grade Logs** — Every run comes with detailed observability so you can debug, monitor, and actually trust what the agents did.
- **Flexible Integration** — Use it as a direct HTTP API, through our visual Playground, or as an MCP server inside tools like Claude and Cursor.

## The Recipes

Each folder in this repo is a standalone project. Dive in to see how to solve real-world problems.

| Recipe | Description |
|--------|-------------|
| [anime-watch-hub](./anime-watch-hub) | Helps you find sites to read/watch your  favorite manga/anime for free |
| [bestbet](./bestbet) | Sports betting odds comparison tool |
| [tinyskills](./tinyskills) | Multi-source AI skill guide generator |
| [competitor-analysis](./competitor-analysis) | a Live Competitive Pricing Intelligence Dashboard |
| [stay-scout-hub](./stay-scout-hub) | Searches across all sites for places to stay when travel for conventions or events |
| [summer-school-finder](./summer-school-finder) | Discover and compare summer school programs from universities around the world |

> More recipes added weekly!

## Getting Started with the API

You don't need to install heavy SDKs. TinyFish works with standard HTTP requests.

### 1. Get your API Key

Sign up on [tinyfish.ai](https://tinyfish.ai) and grab your API key.

### 2. Run a Command

Here is how to run a simple automation agent:

#### cURL

```bash
curl -N -X POST https://mino.ai/v1/automation/run-sse \
  -H "X-API-Key: $MINO_API_KEY" \
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
    "https://mino.ai/v1/automation/run-sse",
    headers={
        "X-API-Key": os.getenv("MINO_API_KEY"),
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
const response = await fetch("https://mino.ai/v1/automation/run-sse", {
  method: "POST",
  headers: {
    "X-API-Key": process.env.MINO_API_KEY,
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

- [Join us on Discord](https://discord.gg/cv3JS4t4) — ask questions, share what you're building, hang out
- Learn more at [tinyfish.ai](https://tinyfish.ai)

---

<img src="https://github.com/user-attachments/assets/2cf004f0-0065-4f21-9835-12ac693964f1" width="100%" />




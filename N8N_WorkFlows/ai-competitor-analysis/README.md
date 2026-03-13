# AI Product Idea Generator

Reddit pain points → Product Hunt gap analysis → AI-powered product ideas.

This n8n workflow scrapes Reddit r/SaaS for real user frustrations, searches Product Hunt for existing solutions, then uses Google Gemini to identify unsolved problems and suggest specific products to build.

## How It Works

```
[Click to Run] → [TinyFish: Reddit Pain Points] → [TinyFish: Search Product Hunt] → [Gemini: Product Ideas]
```

1. **TinyFish scrapes Reddit r/SaaS** — extracts top 15 pain points with search keywords
2. **TinyFish searches Product Hunt** — uses those keywords to find which problems already have solutions and which are unsolved gaps
3. **Gemini analyzes everything** — outputs "Already Solved (skip)", "Market Gaps (build these)" with product name, pricing model, difficulty, and a "Top Pick" recommendation

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and a lightweight runtime like [Colima](https://github.com/abetterinternet/colima) (macOS)
- A [TinyFish API key](https://agent.tinyfish.ai/signup) (free, 500 steps included)
- A [Google Gemini API key](https://aistudio.google.com/apikey) (free tier available)

## Setup

### 1. Start n8n with Docker

```bash
# macOS without Docker Desktop — install Colima first
brew install colima
colima start --cpu 2 --memory 4

# Start n8n
mkdir -p ~/.n8n
docker run -d \
  --name n8n \
  --restart unless-stopped \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

Open http://localhost:5678 and create your owner account.

### 2. Install the TinyFish Community Node

The n8n Docker image doesn't include build tools, so we build the node in a separate container using the exact same Node.js version.

```bash
# Check the Node version inside the n8n image
docker run --rm --entrypoint /bin/sh n8nio/n8n -c "node --version"
# Example output: v24.13.1

# Build the community node using that exact version
docker run --rm -v ~/.n8n/nodes:/out node:24.13.1-alpine sh -c "
  apk add python3 make g++ &&
  cd /out &&
  npm init -y 2>/dev/null &&
  npm install n8n-nodes-tinyfish --ignore-scripts &&
  rm -rf node_modules/isolated-vm &&
  echo 'Done'
"

# Restart n8n to pick up the new node
docker restart n8n
```

> **Why `--ignore-scripts` and removing `isolated-vm`?**
> The `isolated-vm` native module is used by n8n's Code node sandbox, not by TinyFish itself. It causes segfaults in the hardened Alpine Docker image. Removing it has zero impact on the TinyFish node — all other nodes continue to work normally.

### 3. Import the Workflow

1. Open http://localhost:5678
2. Go to **Workflows → Import from File**
3. Select `ai-competitor-radar.json`

### 4. Add API Credentials

**TinyFish:**
1. Click on either TinyFish node → **Credential** → **Create New**
2. Name: `TinyFish Web Agent API`
3. Paste your API key from [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys)

**Google Gemini:**
1. Click on the Gemini node → **Credential** → **Create New**
2. Name: `Google Gemini (PaLM) API`
3. Paste your API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 5. Run It

Click **Test Workflow**. Click the Gemini node to see the output.

## Customization

- **Change the subreddit**: Edit the URL in the first TinyFish node (e.g., `r/startups`, `r/entrepreneur`, `r/webdev`)
- **Change the source**: Swap Reddit for Hacker News, Indie Hackers, or any other site
- **Add more sources**: Duplicate a TinyFish node, change the URL + goal, and wire it in
- **Switch AI model**: Change the model in the Gemini node dropdown (e.g., `gemini-2.5-pro` for deeper analysis)

## Stopping and Restarting

```bash
# Stop
docker stop n8n

# Start again
docker start n8n

# View logs
docker logs -f n8n

# Remove completely
docker stop n8n && docker rm n8n
```

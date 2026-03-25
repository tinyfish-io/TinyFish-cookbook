# Open-Box Deals Aggregator

Real-time open-box and refurbished deal aggregator with live browser streaming. Scrapes 8 major retailers simultaneously using TinyFish Agent API.
## Demo
![Open-Box Deals Demo]
https://github.com/user-attachments/assets/57def077-74e7-416b-967c-ed72e1dc0da0





## 🎯 What It Does

- Searches 8 retailers in parallel for open-box/refurbished deals
- Shows live browser streams as agents scrape each site
- Calculates savings and sorts by best deals
- Retro warehouse receipt themed UI

## 🏪 Supported Retailers

| Site | Deal Type |
|------|-----------|
| Amazon Warehouse | Renewed/Used |
| Best Buy Outlet | Open-Box |
| BackMarket | Refurbished |
| Swappa | Used Devices |
| Walmart Renewed | Refurbished |
| Newegg Open Box | Open-Box |
| Target Clearance | Clearance |
| Micro Center | Open-Box |

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd examples/openbox-deals
pip install -r requirements.txt
```

### 2. Set Environment Variable

```bash
export MINO_API_KEY=sk-mino-your-key
```

### 3. Run

```bash
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000

## 🔧 How It Works

### Architecture

```
┌─────────────────────────────────────────────────┐
│           User Interface (Vanilla JS)           │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│          FastAPI Backend (SSE Streaming)        │
└─────────────────────────────────────────────────┘
         │       │       │       │       │
         ▼       ▼       ▼       ▼       ▼
┌─────────────────────────────────────────────────┐
│         TinyFish Agent API (8 parallel)         │
│  • Stealth browser profiles                     │
│  • Live streaming URLs                          │
│  • Structured JSON extraction                   │
└─────────────────────────────────────────────────┘
```

### API Usage

```python
MINO_API_URL = "https://agent.tinyfish.ai/v1/automation/run-sse"

payload = {
    "url": "https://www.bestbuy.com/site/searchpage.jsp?st=iphone&qp=condition_facet%3DCondition~Open-Box",
    "goal": "Extract the first 5 Open-Box 'iphone' products. Return ONLY a JSON array: [{name, original_price, sale_price, condition, product_url}].",
    "browser_profile": "stealth"
}

async with session.post(MINO_API_URL, json=payload, headers=headers) as response:
    async for chunk in response.content.iter_any():
        # SSE events: streaming_url, status updates, result_json
        pass
```

### SSE Event Flow

```
data: {"streaming_url":"https://tf-xxx.lax1-tinyfish.unikraft.app/stream/0"}
data: {"type":"STATUS","message":"Navigating to Best Buy..."}
data: {"type":"STATUS","message":"Extracting Open-Box products..."}
data: {"type":"COMPLETE","result_json":[{"name":"iPhone 16","sale_price":"$604.99",...}]}
```

## 📁 Project Structure

```
openbox-deals/
├── app/
│   ├── __init__.py
│   └── main.py          # FastAPI backend with SSE streaming
├── static/
│   └── index.html       # Warehouse receipt themed UI
├── requirements.txt
├── railway.toml         # Railway deployment config
└── .env.example
```

## 🚢 Deploy to Railway

1. Push to GitHub
2. Connect repo to Railway
3. Add environment variable: `MINO_API_KEY`
4. Deploy!

## 🔑 Key Features

| Feature | Implementation |
|---------|----------------|
| **Parallel Scraping** | 8 concurrent TinyFish agents |
| **Live Browser Preview** | Embedded iframe streams |
| **Query-Aware Goals** | Dynamic `{query}` injection |
| **Rate Limiting** | 9 req/min per IP |
| **Price Normalization** | Consistent `$XX.XX` format |
| **Savings Calculator** | Auto-calculates % off |

## 📊 Sample Results

Search: "sony headphones" (Max: $300)

| Product | Site | Was | Now | Savings |
|---------|------|-----|-----|---------|
| Sony WH-CH520 | BackMarket | $96 | $33 | 66% OFF |
| Sony ULT WEAR 900N | Amazon | $229 | $106 | 54% OFF |
| Sony WH-1000XM5 | Amazon | $298 | $190 | 36% OFF |

## 🔗 Links

- **Live Demo**: https://openbox-deals-production.up.railway.app

## 📄 License

MIT

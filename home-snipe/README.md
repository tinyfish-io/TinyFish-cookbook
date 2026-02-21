# TinyFish - HDB Deal Sniper

**Live Demo:** https://home-snipe.vercel.app

Real-time Singapore HDB resale deal finder that uses the **Source → Extract → Present** pipeline pattern. Gemini generates property listing URLs, Mino browser agents scrape them in parallel, and Gemini analyzes results to identify underpriced deals.

**Status**: ✅ Working

---

## Demo

![HDB Deal Sniper Demo](demo.jpg)

---

## How Mino API is Used

The Mino API powers browser automation for this use case. See the code snippet below for implementation details.

### Code Snippet

```bash
npm install
export MINO_API_KEY=your_key
export GEMINI_API_KEY=your_key
npm run dev
```

---

## How to Run

### Prerequisites

- Node.js 18+
- Mino API key (get from [mino.ai](https://mino.ai))

### Setup

1. Clone the repository:
```bash
git clone https://github.com/tinyfish-io/TinyFish-cookbook
cd TinyFish-cookbook/home-snipe
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```bash
MINO_API_KEY=xxx      # Browser automation
GEMINI_API_KEY=xxx    # URL generation + deal analysis
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

---

## Architecture Diagram

```mermaid
flowchart TB
    subgraph Input[USER INPUT]
        Form[Town + Flat Type + Discount %]
    end
    subgraph Phase1[PHASE 1: URL GENERATION]
        Gemini1[Gemini AI]
        URLs[10 Property URLs]
    end
    subgraph Phase2[PHASE 2: PARALLEL SCRAPING]
        A1[Agent 1]
        A2[Agent 2]
        A3[Agent 3]
        A10[Agent 10...]
    end
    subgraph Phase3[PHASE 3: DEAL ANALYSIS]
        Gemini2[Gemini AI]
        Deals[Underpriced Deals]
    end
    subgraph Output[RESULTS]
        UI[Live Results Sidebar]
    end
    Form --> Gemini1
    Gemini1 --> URLs
    URLs --> A1
    URLs --> A2
    URLs --> A3
    URLs --> A10
    A1 --> Gemini2
    A2 --> Gemini2
    A3 --> Gemini2
    A10 --> Gemini2
    Gemini2 --> Deals
    Deals --> UI
    A1 -.-> UI
    A2 -.-> UI
    A3 -.-> UI
    A10 -.-> UI
```

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as API Route
    participant G as Gemini AI
    participant M as Mino Agents
    U->>FE: Select town, flat type, discount
    FE->>API: POST /api/search
    API->>G: Generate property URLs
    G-->>API: 10 URLs from property sites
    API->>M: Launch 10 parallel agents
    M-->>API: Stream live URLs
    API-->>FE: Forward streaming URLs
    FE-->>U: Show live agent grid
    M-->>API: Extract listings
    API-->>FE: Stream raw listings
    FE-->>U: Update results sidebar
    API->>G: Analyze for deals
    G-->>API: Underpriced listings
    API-->>FE: DEALS_FOUND
    FE-->>U: Highlight deals
```

```mermaid
classDiagram
    class RawListing {
        +string address
        +string block
        +string street
        +string town
        +string flatType
        +string floorLevel
        +string sqft
        +number askingPrice
        +string timePosted
        +string agentName
        +string agentPhone
        +string listingUrl
        +string source
    }
    class DealResult {
        +string address
        +string town
        +string flatType
        +number askingPrice
        +number marketValue
        +number discountPercent
        +string timePosted
        +string reasoning
    }
    class AgentStatus {
        +number id
        +string url
        +string status
        +string streamingUrl
        +string[] steps
    }
```



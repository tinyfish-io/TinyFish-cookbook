# TinyFish - Singapore Credit Card Aggregator

## Demo

![credit-aggregator Demo](./assets/e74cd381-8291-4a76-b23d-c5220cc33260.jpg)

**Live Demo:** https://credit-aggregator.vercel.app/

A real-time credit card comparison tool that aggregates data from 6 major Singapore financial comparison websites using parallel Mino browser agents. Users describe their requirements in natural language, and the system dispatches concurrent AI agents to scrape and consolidate matching credit cards.

**Status**: ✅ Working

---

## Demo

*[Demo video/screenshot to be added]*

---

## How Mino API is Used

The Mino API powers browser automation for this use case. See the code snippet below for implementation details.

### Code Snippet

```bash
npm install
export MINO_API_KEY=your_api_key
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
cd TinyFish-cookbook/credit-aggregator
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```bash
# Add your environment variables here
MINO_API_KEY=sk-mino-...
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
    subgraph UI[USER INTERFACE]
        Input[Natural Language Input]
        Progress[Site Progress Grid]
        Results[Results Display]
    end
    subgraph API[API LAYER]
        SSE[SSE Stream Handler]
        Orchestrator[Parallel Orchestrator]
    end
    subgraph Agents[MINO BROWSER AGENTS]
        A1[SingSaver]
        A2[MoneySmart]
        A3[Seedly]
        A4[MileLion]
        A5[SuiteSmile]
        A6[MainlyMiles]
    end
    subgraph Processing[RESULT PROCESSING]
        Parser[Result Parser]
        Dedup[Deduplication Engine]
    end
    Input --> SSE
    SSE --> Orchestrator
    Orchestrator --> A1
    Orchestrator --> A2
    Orchestrator --> A3
    Orchestrator --> A4
    Orchestrator --> A5
    Orchestrator --> A6
    A1 --> Parser
    A2 --> Parser
    A3 --> Parser
    A4 --> Parser
    A5 --> Parser
    A6 --> Parser
    Parser --> Dedup
    Dedup --> Results
    SSE -.-> Progress
```

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as API Route
    participant M as Mino Agents
    U->>FE: Enter requirements
    FE->>API: POST /api/compare-cards
    API->>M: Launch 6 parallel agents
    M-->>API: Stream site_step events
    API-->>FE: Forward SSE updates
    FE-->>U: Update progress UI
    M-->>API: site_complete with cards
    API->>API: Deduplicate and merge
    API-->>FE: Final results
    FE-->>U: Display cards
```

```mermaid
stateDiagram-v2
    [*] --> site_start
    site_start --> site_step
    site_step --> site_step
    site_step --> site_complete
    site_step --> site_error
    site_complete --> [*]
    site_error --> [*]
```

```mermaid
classDiagram
    class CreditCard {
        +string name
        +string issuer
        +string annualFee
        +string rewards
        +string signUpBonus
        +string apr
        +string[] highlights
        +string source
    }
    class SiteStatus {
        +string name
        +string status
        +string[] steps
        +string error
    }
```



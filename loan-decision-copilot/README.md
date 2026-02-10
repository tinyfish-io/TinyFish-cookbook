# 🔍 Loan Decision Copilot

**Live Demo:** [loandecision.lovable.app](https://loandecision.lovable.app/)

---

## What is this?

LoanLens is an AI-powered loan comparison tool that helps users analyze real bank loan offerings across different regions and loan types (education, personal, home, business).

It uses the TinyFish Web Agent API to automate real browser sessions on bank websites, extract loan details in real time, and stream live previews of each agent while the analysis is running.

---

## Demo

<!-- Replace with your demo gif/video -->

https://github.com/user-attachments/assets/1cfe4290-e769-424e-8ef6-4c23992712aa

---

## How TinyFish Web Agent is used

For each discovered bank:

- A TinyFish browser agent opens the bank’s loan page

- Navigates through the site if needed

- Extracts interest rates, tenure, eligibility, fees, benefits, and drawbacks

- Streams live browser previews back to the UI using SSE

- Returns structured JSON results for comparison

- Multiple agents run in parallel, one per bank.

## Code Snippet

```typescript

const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": TINYFISH_API_KEY,
  },
  body: JSON.stringify({
    url: bankUrl,
    goal: `
You are analyzing a bank's ${loanType} page.

STEP 1:
Navigate to the correct loan product page if needed.

STEP 2:
Extract interest rates, tenure, eligibility, fees, benefits, and drawbacks.

STEP 3:
Return structured JSON with your findings.
`,
    timeout: 300000,
  }),
});

```

---

## How to Run

### Prerequisites
- Node.js 18+

- Supabase / Lovable project

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TINYFISH_API_KEY` | TinyFish Web Agent [API key](https://mino.ai) | ✅ |
| `LOVABLE_API_KEY` | Lovable AI Gateway key | ✅ |

### Setup

```bash
git clone <your-fork-url>
cd loan-decision-copilot
npm install
npm run dev

```

Add secrets in your Supabase / Lovable dashboard before running.

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────┐
│                        React Frontend                      │
│                                                            │
│  LoanType + Location → useLoanSearch Hook → Agent Cards    │
│                               │                            │
└───────────────────────────────┼────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────┐
│                  Supabase Edge Functions                   │
│                                                            │
│  discover-banks  →  analyze-loan (x N parallel agents)     │
│                               │                            │
└───────────────────────────────┼────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────┐
│                External APIs                               │
│                                                            │
│  Gemini (Bank discovery)                                   │
│  TinyFish Web Agent API (Browser automation + SSE)         │
└────────────────────────────────────────────────────────────┘

```

### How it works

- User selects loan type and location

- AI discovery step finds 5–8 relevant bank URLs

- TinyFish Web Agent API launches one browser agent per bank

- SSE streaming provides live previews and progress updates

- Structured results are returned and rendered in the UI
---

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS

- **Backend**: Supabase Edge Functions (Deno)

- **Browser Automation**: TinyFish Web Agent API

- **AI Discovery**: Gemini (via Lovable AI Gateway)

- **Streaming**: Server-Sent Events (SSE)

---

## License

MIT

# LoanLens: Mino Browser Automation API Documentation

> **Developer Documentation for AI-Powered Bank Loan Comparison**

This document provides a complete technical overview of how LoanLens uses the Mino Browser Automation API to extract real-time loan information from bank websites.

---

## Table of Contents

1. [Product Architecture Overview](#product-architecture-overview)
2. [API Relationships](#api-relationships)
3. [Code Implementation](#code-implementation)
4. [Goal (Prompt) Specification](#goal-prompt-specification)
5. [Sample Output](#sample-output)
6. [Error Handling](#error-handling)

---

## Product Architecture Overview

LoanLens is a loan comparison application that automates the extraction of loan product details from real bank websites using browser automation agents.

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│                         (React + TypeScript)                                 │
│                                                                              │
│   ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────────┐   │
│   │  LoanTypeSelect │    │  LocationInput  │    │  AgentCard (x N)     │   │
│   │  - personal     │    │  - "New York"   │    │  - Live preview      │   │
│   │  - home         │    │  - "London"     │    │  - Status updates    │   │
│   │  - education    │    │  - "Singapore"  │    │  - Analysis results  │   │
│   │  - business     │    │                 │    │                      │   │
│   └────────┬────────┘    └────────┬────────┘    └──────────┬───────────┘   │
│            │                      │                        │                │
│            └──────────────────────┼────────────────────────┘                │
│                                   │                                         │
│                     ┌─────────────▼─────────────┐                           │
│                     │    useLoanSearch Hook     │                           │
│                     │  - Orchestrates flow      │                           │
│                     │  - Manages SSE streams    │                           │
│                     │  - Updates UI state       │                           │
│                     └─────────────┬─────────────┘                           │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE EDGE FUNCTIONS                             │
│                                                                              │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │                    STEP 1: discover-banks                              │ │
│   │                                                                        │ │
│   │   Input: { loanType: "education", location: "United States" }         │ │
│   │                                                                        │ │
│   │   ┌─────────────────────────────────────────────────────────────────┐ │ │
│   │   │               Lovable AI Gateway (Gemini)                       │ │ │
│   │   │   - Model: google/gemini-3-flash-preview                        │ │ │
│   │   │   - Returns: 5-8 bank URLs with loan product pages              │ │ │
│   │   └─────────────────────────────────────────────────────────────────┘ │ │
│   │                                                                        │ │
│   │   Output: { banks: [{ name: "...", url: "..." }, ...] }               │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    │ Triggers N parallel calls              │
│                                    ▼                                        │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │                 STEP 2: analyze-loan (x N banks)                       │ │
│   │                                                                        │ │
│   │   Input: { url: "...", bankName: "...", loanType: "..." }             │ │
│   │                                                                        │ │
│   │   ┌─────────────────────────────────────────────────────────────────┐ │ │
│   │   │                    MINO API (SSE Stream)                        │ │ │
│   │   │   - Endpoint: https://agent.tinyfish.ai/v1/automation/run-sse             │ │ │
│   │   │   - Browser agent navigates to URL                              │ │ │
│   │   │   - Extracts loan details (rates, terms, eligibility)           │ │ │
│   │   │   - Streams live preview URL + status updates                   │ │ │
│   │   │   - Returns structured JSON analysis                            │ │ │
│   │   └─────────────────────────────────────────────────────────────────┘ │ │
│   │                                                                        │ │
│   │   Output: SSE stream with { streamingUrl, STATUS, COMPLETE, DONE }    │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### API Call Summary

| API | Purpose | Called | Protocol |
|-----|---------|--------|----------|
| Lovable AI Gateway | Discover bank URLs | **1x** per search | REST (JSON) |
| Mino Browser Automation | Analyze bank loan pages | **N x** (one per bank, typically 5-8) | SSE (Streaming) |

---

## API Relationships

### Flow Sequence

```
User Search
    │
    ▼
┌──────────────────────┐
│   discover-banks     │  ─────► Lovable AI Gateway (Gemini)
│   Edge Function      │         Returns: 5-8 bank URLs
└──────────┬───────────┘
           │
           │ For each bank (parallel)
           ▼
┌──────────────────────┐
│    analyze-loan      │  ─────► Mino API (Browser Agent)
│   Edge Function (x5) │         Returns: SSE stream with analysis
└──────────┬───────────┘
           │
           │ Streams to frontend
           ▼
┌──────────────────────┐
│   React UI Updates   │
│   - Live preview     │
│   - Status messages  │
│   - Final results    │
└──────────────────────┘
```

### Orchestration Logic

The `useLoanSearch` hook orchestrates the entire flow:

1. **Discovery Phase**: Single call to `discover-banks` to get bank URLs
2. **Analysis Phase**: Parallel calls to `analyze-loan` for each discovered bank
3. **Streaming Updates**: Real-time UI updates via Server-Sent Events (SSE)

---

## Code Implementation

### 1. Edge Function: Bank Discovery (discover-banks)

**File:** `supabase/functions/discover-banks/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { loanType, location } = await req.json();

    if (!loanType || !location) {
      return new Response(
        JSON.stringify({ error: "loanType and location are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const loanTypeMap: Record<string, string> = {
      personal: "personal loan",
      home: "home loan / mortgage",
      education: "education loan / student loan",
      business: "business loan / SME loan"
    };

    const loanDescription = loanTypeMap[loanType] || loanType;

    const prompt = `You are a financial research assistant. Find 5-8 well-known, trusted banks...`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a helpful financial research assistant." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    // Parse and return banks...
    return new Response(
      JSON.stringify({ banks: validBanks }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Error handling...
  }
});
```

---

### 2. Edge Function: Loan Analysis with Mino (analyze-loan)

**File:** `supabase/functions/analyze-loan/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, bankName, loanType } = await req.json();

    if (!url || !bankName) {
      return new Response(
        JSON.stringify({ error: "url and bankName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const TINYFISH_API_KEY = Deno.env.get("TINYFISH_API_KEY");
    if (!TINYFISH_API_KEY) {
      throw new Error("TINYFISH_API_KEY is not configured");
    }

    // Dynamic goal based on loan type
    const goal = `You are analyzing a bank's ${loanDescription} page for comparison purposes...`;

    // Create SSE response stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          send({ type: "STATUS", message: "Connecting to browser agent..." });

          // Call Mino API with SSE streaming
          const minoResponse = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": TINYFISH_API_KEY,
            },
            body: JSON.stringify({ 
              url, 
              goal, 
              timeout: 300000  // 5 minute timeout
            }),
          });

          // Process SSE stream from Mino
          const reader = minoResponse.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = JSON.parse(line.slice(6).trim());
                
                // Forward streaming URL for live preview
                if (data.streamingUrl) {
                  send({ streamingUrl: data.streamingUrl });
                }

                // Forward status updates
                if (data.type === "STATUS") {
                  send({ type: "STATUS", message: data.message });
                }

                // Forward completion with parsed results
                if (data.type === "COMPLETE" && data.resultJson) {
                  send({ type: "COMPLETE", result: data.resultJson });
                }
              }
            }
          }

          send({ type: "DONE" });
          controller.close();
        } catch (error) {
          send({ type: "ERROR", message: error.message });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    // Error handling...
  }
});
```

---

### 3. Frontend Hook: Orchestration (useLoanSearch)

**File:** `src/hooks/useLoanSearch.ts`

```typescript
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useLoanSearch() {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [banks, setBanks] = useState<BankLoanInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const discoverBanks = useCallback(async (loanType: LoanType, location: string) => {
    setIsDiscovering(true);
    setBanks([]);

    // Step 1: Discover banks via AI
    const { data } = await supabase.functions.invoke('discover-banks', {
      body: { loanType, location }
    });

    const bankList = data.banks.map((bank, index) => ({
      id: `bank-${index}`,
      bankName: bank.name,
      url: bank.url,
      status: 'pending'
    }));

    setBanks(bankList);
    setIsDiscovering(false);

    // Step 2: Analyze each bank (parallel)
    for (const bank of bankList) {
      analyzeBank(bank, loanType);
    }
  }, []);

  const analyzeBank = useCallback(async (bank: BankLoanInfo, loanType: LoanType) => {
    setBanks(prev => prev.map(b => 
      b.id === bank.id ? { ...b, status: 'running' } : b
    ));

    // Connect to SSE stream
    const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-loan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({ url: bank.url, bankName: bank.bankName, loanType })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));

          // Handle live preview URL
          if (data.streamingUrl) {
            setBanks(prev => prev.map(b =>
              b.id === bank.id ? { ...b, streamingUrl: data.streamingUrl } : b
            ));
          }

          // Handle status updates
          if (data.type === 'STATUS') {
            setBanks(prev => prev.map(b =>
              b.id === bank.id ? { ...b, statusMessage: data.message } : b
            ));
          }

          // Handle completion
          if (data.type === 'COMPLETE') {
            setBanks(prev => prev.map(b =>
              b.id === bank.id ? { ...b, status: 'completed', result: data.result } : b
            ));
          }
        }
      }
    }
  }, []);

  return { isDiscovering, banks, error, discoverBanks, reset };
}
```

---

### 4. cURL Example

```bash
# Step 1: Discover banks
curl -X POST "https://your-project.supabase.co/functions/v1/discover-banks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "loanType": "education",
    "location": "United States"
  }'

# Step 2: Analyze a specific bank (SSE stream)
curl -N -X POST "https://your-project.supabase.co/functions/v1/analyze-loan" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "url": "https://www.citizensbank.com/student-loans",
    "bankName": "Citizens Bank",
    "loanType": "education"
  }'
```

---

## Goal (Prompt) Specification

The following natural language prompt is sent to the Mino API to guide the browser automation agent:

```
You are analyzing a bank's education loan / student loan page for comparison purposes.

STEP 1 - NAVIGATE:
If this is not the specific loan product page, look for links to education loan / student loan 
and navigate there.

STEP 2 - EXTRACT INFORMATION:
Carefully analyze the page and extract:
- Interest rate ranges (APR, fixed/variable rates)
- Loan tenure/repayment period options
- Eligibility requirements (income, credit score, etc.)
- Fees (processing, origination, prepayment, etc.)
- Key benefits highlighted by the bank
- Any drawbacks or limitations mentioned
- How clear and transparent the terms are

STEP 3 - RETURN ANALYSIS:
Return a JSON object with your analysis:
{
  "bankName": "Citizens Bank",
  "interestRateRange": "X% - Y% APR" or "Not specified",
  "tenure": "X to Y years" or "Not specified",
  "eligibility": ["requirement 1", "requirement 2"],
  "fees": ["fee 1", "fee 2"],
  "benefits": ["benefit 1", "benefit 2", "benefit 3"],
  "drawbacks": ["drawback 1", "drawback 2"],
  "clarity": "Clear/Moderate/Unclear",
  "description": "Brief 2-3 sentence summary of this loan offering",
  "score": 7 (rating from 1-10 based on overall value, transparency, and competitiveness)
}

Be objective and factual. If information is not available, indicate "Not specified".
```

---

## Sample Output

### SSE Stream Events (Mino API Response)

```
data: {"streamingUrl":"https://mino.ai/stream/abc123"}

data: {"type":"STATUS","message":"Connecting to browser agent..."}

data: {"type":"STATUS","message":"Navigating to https://www.citizensbank.com/student-loans"}

data: {"type":"STATUS","message":"Page loaded, analyzing content..."}

data: {"type":"STATUS","message":"Extracting loan details..."}

data: {"type":"COMPLETE","resultJson":{
  "bankName": "Citizens Bank",
  "interestRateRange": "3.24% - 13.96% APR (Fixed: 3.24% - 13.38% APR; Variable: 4.48% - 13.96% APR)",
  "tenure": "5, 10, or 15 years",
  "eligibility": [
    "Applicant must be a U.S. citizen, permanent resident, or eligible non-citizen with a creditworthy U.S. citizen or permanent resident co-signer.",
    "Co-signer required for applicants under the age of majority.",
    "Must be enrolled at a Citizens participating four-year, Title IV public or private institution.",
    "Subject to credit qualification and verification of application information."
  ],
  "fees": [
    "No origination, application, or disbursement fees.",
    "No prepayment penalty."
  ],
  "benefits": [
    "Multi-Year Approval (Allows subsequent drawdowns without a full re-application).",
    "Loyalty and Automatic Payment interest rate discounts.",
    "Covers up to 100% of school certified expenses.",
    "Co-signer release option is available (with full principal/interest payments).",
    "Easy rate quote in 2 minutes with no commitment or credit check."
  ],
  "drawbacks": [
    "Multi-Year Approval is not available for international students.",
    "Interest-only payments do not qualify for co-signer release.",
    "Full credit score and income requirements are not explicitly published.",
    "Finding full disclosures (tenure, eligibility) requires navigating to a separate 'disclosure hub' page."
  ],
  "clarity": "Moderate",
  "description": "Citizens Bank offers private student loans with flexible 5, 10, or 15-year repayment terms and competitive rates. The product is fee-free, covers up to 100% of costs, and features a useful multi-year approval benefit. Eligibility is tied to U.S. residency/citizenship and a creditworthy co-signer is highly recommended or required for certain applicants.",
  "score": 7
}}

data: {"type":"DONE"}
```

### Parsed Final Result (TypeScript Interface)

```typescript
interface LoanAnalysisResult {
  bankName: string;
  interestRateRange: string;
  tenure: string;
  eligibility: string[];
  fees: string[];
  benefits: string[];
  drawbacks: string[];
  clarity: "Clear" | "Moderate" | "Unclear";
  description: string;
  score: number;  // 1-10
}
```

---

## Error Handling

### Common Error Scenarios

| Error | Cause | Resolution |
|-------|-------|------------|
| `TINYFISH_API_KEY is not configured` | Missing API key in environment | Add secret via Lovable dashboard |
| `Mino API error: 429` | Rate limiting | Implement exponential backoff |
| `timeout` | Page took too long | Increase timeout (currently 5 min) |
| `Invalid response from bank discovery` | AI returned malformed JSON | Retry or adjust prompt |

### SSE Error Event

```
data: {"type":"ERROR","message":"Failed to load page: Connection timeout"}
```

---

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `TINYFISH_API_KEY` | API key for Mino browser automation |
| `LOVABLE_API_KEY` | Auto-configured for Lovable AI Gateway |

### Timeout Configuration

```typescript
// In analyze-loan edge function
body: JSON.stringify({ 
  url, 
  goal, 
  timeout: 300000  // 5 minutes (300,000 ms)
})
```

---

## Summary

LoanLens demonstrates a powerful pattern for browser automation:

1. **AI-Powered Discovery**: Use LLMs to intelligently find relevant URLs
2. **Browser Automation**: Deploy Mino agents to extract structured data from web pages
3. **Real-Time Streaming**: SSE enables live progress updates and preview windows
4. **Parallel Processing**: Analyze multiple banks simultaneously for fast results

This architecture can be adapted for any use case requiring automated web data extraction with AI analysis.

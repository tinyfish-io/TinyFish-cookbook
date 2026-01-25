# Mino API Feedback

## Project Context
**Use Case:** Competitive Pricing Intelligence Dashboard
**Scope:** Scraping 10-15 competitor pricing pages in parallel, extracting structured pricing data
**Tech Stack:** Next.js 16, React 19, TypeScript, SSE streaming

---

## What Worked Well

### 1. Natural Language Goal Definition
The ability to describe extraction tasks in plain English is incredibly powerful. Instead of writing brittle CSS selectors or XPath queries, we could describe what we wanted:

```typescript
goal: `Extract comprehensive pricing information from this page.
Return JSON with: company, pricingModel, primaryUnit, unitDefinition, tiers...`
```

This made it easy to iterate on extraction quality by simply refining the prompt.

### 2. SSE Streaming Architecture
The Server-Sent Events approach is excellent for real-time UX:
- Progress updates during extraction (`type: "STEP"`)
- Live browser preview via `streamingUrl`
- Clear completion signal (`type: "COMPLETE"`)

This enabled us to show users exactly what was happening during scraping.

### 3. Structured JSON Output
Getting `resultJson` back as structured data (not raw HTML) saved significant post-processing. The API understood our schema requests and returned parseable JSON.

### 4. Browser Profile Options
Having `lite` vs `stealth` profiles is useful for handling different site protections without code changes.

### 5. Parallel Execution
Running 10-15 scraping jobs concurrently worked smoothly with `Promise.allSettled()`. Each job maintained its own SSE stream without conflicts.

---

## Challenges & Pain Points

### 1. Inconsistent Data Structure
The extracted `resultJson` structure varies significantly between sites, even with the same goal prompt. For example:

```javascript
// Site A returned:
{ tiers: [{ name: "Pro", price: 99, period: "month" }] }

// Site B returned:
{ tiers: [{ name: "Pro", price: "$99/mo", billingPeriod: "monthly" }] }

// Site C returned:
{ plans: [{ tier: "Pro", cost: 99, billing: "per month" }] }
```

**Impact:** Required extensive normalization code on our end to handle variations.

**Suggestion:** Consider a "strict schema mode" where the API enforces a specific output structure, returning null for fields it can't confidently extract rather than inventing new field names.

### 2. No Confidence Scores
When extraction partially fails or data is ambiguous, there's no indication of confidence level. We received data that looked valid but was actually incorrect (e.g., extracting a promotional price instead of the regular price).

**Suggestion:** Add confidence scores per field:
```javascript
{
  price: { value: 99, confidence: 0.95 },
  period: { value: "month", confidence: 0.72 }
}
```

### 3. Error Messages Are Vague
When extraction fails, error messages like "Extraction failed" or "Unknown error" don't help with debugging.

**Suggestion:** More specific errors:
- "Could not locate pricing information on page"
- "Page requires authentication"
- "Timeout waiting for dynamic content"
- "Captcha detected, consider stealth mode"

### 4. No Partial Results on Timeout
If a complex extraction times out mid-way, we get nothing. For pricing pages with 5+ tiers, sometimes only 3 were extracted before timeout.

**Suggestion:** Return partial results with a flag:
```javascript
{
  status: "PARTIAL",
  resultJson: { /* what was extracted */ },
  message: "Timeout after extracting 3 of 5 detected tiers"
}
```

### 5. Rate Limiting Unclear
When running 15 parallel requests, occasionally some would fail without clear rate limit errors. Hard to know if we should throttle or if it was a different issue.

**Suggestion:** Clear rate limit headers or error codes:
```
X-RateLimit-Remaining: 5
X-RateLimit-Reset: 1699900000
```

### 6. streamingUrl Iframe Embedding Issues
The `streamingUrl` for live browser preview sometimes:
- Had CORS issues in iframes
- Showed "Session expired" after a few seconds
- Didn't load on mobile browsers

**Suggestion:**
- Ensure streamingUrl is embeddable with proper headers
- Extend session validity during active scraping
- Provide a thumbnail/screenshot fallback for mobile

### 7. No Retry Guidance
When a request fails, there's no guidance on whether retrying would help or if it's a permanent failure (e.g., page doesn't exist vs. temporary network issue).

**Suggestion:** Add `retryable: boolean` to error responses.

---

## Feature Requests

### 1. Schema Validation Mode
Allow passing a JSON schema that the API must conform to:
```javascript
{
  url: "...",
  goal: "Extract pricing",
  outputSchema: {
    type: "object",
    required: ["tiers"],
    properties: {
      tiers: {
        type: "array",
        items: {
          required: ["name", "price"],
          properties: {
            name: { type: "string" },
            price: { type: "number" }
          }
        }
      }
    }
  }
}
```

### 2. Batch Endpoint
For scraping multiple URLs with the same goal, a batch endpoint would reduce overhead:
```javascript
POST /v1/automation/batch
{
  urls: ["url1", "url2", "url3"],
  goal: "Extract pricing...",
  parallelism: 5
}
```

### 3. Caching/Deduplication
For the same URL + goal combination, optionally return cached results:
```javascript
{
  url: "...",
  goal: "...",
  cacheMaxAge: 3600 // Use cached result if < 1 hour old
}
```

### 4. Webhook Callback
For long-running jobs, allow webhook notification instead of holding SSE connection:
```javascript
{
  url: "...",
  goal: "...",
  webhookUrl: "https://myapp.com/webhook/mino"
}
```

### 5. Screenshot on Completion
Return a screenshot of the final page state along with extracted data for verification:
```javascript
{
  resultJson: {...},
  screenshot: "data:image/png;base64,..."
}
```

---

## API Documentation Feedback

### What's Good
- Clear endpoint structure
- Good code examples in multiple languages
- Browser profile explanations

### What Could Improve
- More examples of complex, multi-step goals
- Documentation of all possible event types in SSE stream
- Rate limit documentation
- Error code reference
- Best practices for goal prompts (what makes a good vs bad goal)

---

## Summary

**Overall Rating: 8/10**

The Mino API delivers on its core promise of natural language web automation. The SSE streaming and JSON extraction are excellent. The main areas for improvement are around **consistency** (output schemas), **observability** (confidence scores, better errors), and **reliability** (partial results, retry guidance).

For our pricing intelligence use case, Mino reduced what would have been weeks of custom scraper development to hours. The tradeoff is more normalization code to handle output variations.

**Would recommend for:**
- Rapid prototyping of scraping solutions
- Sites that change frequently (no selectors to maintain)
- Non-critical data extraction where some inconsistency is acceptable

**Might hesitate for:**
- Production systems requiring exact schema conformance
- High-volume scraping (unclear rate limits)
- Real-time applications (timeout handling)

---

## Contact
Feel free to reach out for clarification on any of this feedback.

*Generated during development of Competitive Pricing Intelligence Dashboard*

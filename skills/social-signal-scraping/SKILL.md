---
name: social-signal-scraping
description: Scrape social signals (Reddit, Twitter/X, Product Hunt) about any company, product, or topic using TinyFish. Returns structured JSON with sentiment analysis, pain points, positive feedback, and trending topics.
---

# Social Signal Scraping — Multi-Platform Sentiment & Insights via TinyFish

Extract discussions, opinions, and sentiment about any company, product, or topic from Reddit, Twitter/X, and Product Hunt. Returns unified structured JSON with aggregated insights.

---

## Step 0: Pre-flight Check (REQUIRED)

Run both checks before any TinyFish call. Do NOT proceed until both pass.

**1. CLI installed?**
```bash
which tinyfish && tinyfish --version || echo "TINYFISH_CLI_NOT_INSTALLED"
```

If missing, tell the user:
> Install the TinyFish CLI: `npm install -g @tiny-fish/cli`

**2. Authenticated?**
```bash
tinyfish auth status
```

If not authenticated, tell the user:
> Get an API key at https://agent.tinyfish.ai/api-keys, then run `tinyfish auth login` or set `TINYFISH_API_KEY` as an environment variable.

---

## Step 1: Parallel Platform Scraping

Launch all three TinyFish calls using `--async` so they run simultaneously. Each platform gets its own independent call. URL-encode the query.

### Reddit

```bash
tinyfish agent run --async --url "https://www.reddit.com/search/?q=<query>" \
  "Extract relevant discussions about '<query>' as a JSON array. For each discussion, capture: [{\"platform\": \"reddit\", \"title\": \"post title\", \"content\": \"post body or summary\", \"upvotes\": \"number as string\", \"subreddit\": \"subreddit name\", \"url\": \"post url\", \"timestamp\": \"date if available\", \"sentiment\": \"positive|negative|neutral\"}]. Focus on: complaints, comparisons to competitors, feature requests, and substantive discussions. Ignore memes, low-effort posts, and irrelevant results. Return up to 10 results, prioritizing posts with the most engagement. Return ONLY the JSON array, no other text."
```

### Twitter/X

```bash
tinyfish agent run --async --url "https://nitter.net/search?f=tweets&q=<query>" \
  "Extract tweets about '<query>' as a JSON array. For each tweet, capture: [{\"platform\": \"twitter\", \"content\": \"tweet text\", \"author\": \"@handle\", \"likes\": \"number as string\", \"retweets\": \"number as string\", \"timestamp\": \"date if available\", \"sentiment\": \"positive|negative|neutral\"}]. Ignore spam, ads, bot-like content, and promotional tweets. Prefer tweets with meaningful opinions, complaints, praise, or comparisons. Return up to 10 results, prioritizing tweets with the most engagement. Return ONLY the JSON array, no other text."
```

### Product Hunt

```bash
tinyfish agent run --async --url "https://www.google.com/search?q=site:producthunt.com+\"<query>\"+review" \
  "Open the search results and select the most relevant Product Hunt result about '<query>'. After opening the Product Hunt page, click the Reviews tab. Scroll down multiple times to load user reviews. If pagination or a load more button exists, trigger it. Scroll at least 3–5 times before extracting. Extract only individual user review cards. Do NOT extract the hero section. Do NOT extract the rating summary. Do NOT navigate away from the page. Do NOT open plugins or unrelated products. Do NOT perform additional searches. Remain on the reviews section and scroll. Capture complaints, comparisons, and negative feedback. Return up to 10 reviews as JSON array: [{\"platform\": \"producthunt\", \"product_name\": \"product name\", \"content\": \"review text\", \"upvotes\": \"number as string\", \"timestamp\": \"date if available\", \"sentiment\": \"positive|negative|neutral\"}]. Return ONLY JSON."
```

### Collect Results

Capture the run_id returned from each async TinyFish call (reddit, twitter, producthunt). Wait until each run reaches COMPLETED status. Retrieve results using the corresponding run_id for each platform. Do not proceed until all completed runs are collected. If a run fails, mark that platform as failed and continue.

### Retry & Failure

If a TinyFish call fails, retry it once. If it fails again, skip that platform and continue with partial results.

---

## Step 2: Parse & Normalize Results

1. Extract JSON from the `resultJson` field of the TinyFish COMPLETE event
2. Parse each platform's JSON array
3. Trim whitespace, remove excess newlines, clean encoding artifacts
4. Deduplicate near-identical content across platforms
5. Remove entries with empty content or fewer than 10 characters

---

## Step 3: Sentiment Classification

For each entry, read the content and classify sentiment from tone, intent, and context. Assign:

- `"sentiment"`: one of `"positive"`, `"negative"`, or `"neutral"`
- `"sentiment_score"`: a model-inferred float from `-1.0` (strongly negative) to `+1.0` (strongly positive), reflecting the strength and clarity of the sentiment

Every entry in the final output must include both fields.

---

## Step 4: Aggregation & Insight Synthesis

Combine all platform results into the final output.

- **pain_points**: Summarize the top 5–10 recurring complaints or issues from negative entries.
- **positive_feedback**: Summarize the top 5–10 recurring praises from positive entries.
- **trending_topics**: Identify the 5–10 most frequently mentioned keywords or phrases across all entries (excluding stop words).
- **overall_sentiment**: Determine by synthesizing tone, frequency, and strength across all entries — not by simple counting.

---

## Step 5: Final JSON Output

Return ONLY this JSON structure. No markdown, no logs, no extra text.

```json
{
  "query": "the original query string",
  "scraped_at": "ISO 8601 timestamp",
  "summary": {
    "overall_sentiment": "positive|negative|neutral",
    "sentiment_breakdown": {
      "positive": 12,
      "negative": 5,
      "neutral": 8
    },
    "total_mentions": 25,
    "platforms_scraped": ["reddit", "twitter", "producthunt"],
    "platforms_failed": []
  },
  "insights": {
    "pain_points": [
      "Users report frequent crashes on mobile",
      "Pricing is considered too high for small teams"
    ],
    "positive_feedback": [
      "Intuitive UI praised by multiple users",
      "Fast customer support response times"
    ],
    "trending_topics": [
      "pricing",
      "mobile app",
      "integrations",
      "customer support"
    ]
  },
  "data": [
    {
      "platform": "reddit",
      "title": "Post title",
      "content": "Post content or summary",
      "upvotes": "142",
      "subreddit": "technology",
      "url": "https://reddit.com/r/...",
      "timestamp": "2026-03-15",
      "sentiment": "negative",
      "sentiment_score": -0.7
    },
    {
      "platform": "twitter",
      "content": "Tweet text",
      "author": "@handle",
      "likes": "89",
      "retweets": "12",
      "timestamp": "2026-03-20",
      "sentiment": "positive",
      "sentiment_score": 0.8
    },
    {
      "platform": "producthunt",
      "product_name": "Product Name",
      "content": "Comment text",
      "upvotes": "5",
      "url": "https://producthunt.com/...",
      "timestamp": "2026-02-10",
      "sentiment": "neutral",
      "sentiment_score": 0.0
    }
  ]
}
```

---

## Key Rules

- One TinyFish call per platform — never combine.
- Always use `--async` and collect results via `tinyfish agent run get <run_id>`.
- If a platform fails, return partial results from the others.
- Return only valid JSON — no markdown, no logs.
- Cap at 10 entries per platform.
- Match the user's language.

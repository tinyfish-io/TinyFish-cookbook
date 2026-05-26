# tinyfish-social-listening — Hermes Skill

**Turn your AI agent into a social listening analyst that tracks brand mentions, competitor activity, and public sentiment across the live web.**

Ask your agent things like:
- *"What are people saying about Notion right now?"*
- *"Give me a sentiment report on our latest launch"*
- *"What's the Reddit/HN sentiment on {product}?"*
- *"Run social listening on Stripe"*

The agent uses TinyFish Search and Fetch to sweep forums, news, blogs, review sites, and developer communities, then synthesizes everything into a structured listening report with sentiment analysis and source attribution.

## What it does

1. Checks for TinyFish CLI or API key availability
2. Runs multi-angle searches across Reddit, Hacker News, news sites, blogs, and forums
3. Filters for relevance, recency, and source quality
4. Fetches and reads the best sources for full-context sentiment analysis
5. Classifies sentiment (positive/negative/neutral/mixed) from actual text
6. Delivers a structured report with quotes, themes, competitor comparison, and recommendations

## Example output

```
Overall Sentiment: 65% positive, 20% negative, 15% neutral

What People Love:
- Fast API response times (multiple Reddit threads)
- Developer docs are best-in-class (HN discussion)

What People Criticize:
- Pricing tier jump from free to paid is steep (r/SaaS)
- Mobile app lags behind web features (App Store reviews)

Emerging Themes:
- Growing interest from enterprise buyers (3 news articles)
- Community requesting self-hosted option (GitHub discussions)
```

## Use cases

- **Brand monitoring** — track what people are saying about your company or product
- **Launch reception** — gauge real-time sentiment after a product launch or announcement
- **Competitor intelligence** — compare share of voice and sentiment vs. competitors
- **Crisis detection** — spot emerging complaints or negative threads early
- **Market research** — understand pain points and praise patterns in a category
- **Recurring pulse** — set up weekly or daily monitoring via cron jobs

## Requirements

One of:
- **TinyFish CLI** (preferred): `npm install -g @tiny-fish/cli` then `tinyfish auth login`
- **API key**: Set `TINYFISH_API_KEY` in your environment. Get a key at https://agent.tinyfish.ai/api-keys

## Install

```bash
npx skills add github.com/tinyfish-io/tinyfish-cookbook --skill tinyfish-social-listening
```

## Built with

- [TinyFish Search](https://docs.tinyfish.ai/search-api)
- [TinyFish Fetch](https://docs.tinyfish.ai/fetch-api)
- Part of the [TinyFish Cookbook](https://github.com/tinyfish-io/tinyfish-cookbook)

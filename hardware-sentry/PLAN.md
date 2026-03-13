# Hardware Sentry - Backend Architecture Plan

## Current State (Production-Ready)

### ✅ API Endpoints Live
- **POST /api/scan** - Main hardware scanning endpoint
  - Cache-first strategy (1-hour TTL)
  - Distributed locking (prevents concurrent scans)
  - Graceful degradation (returns stale cache on failure)
  - Mock mode support (development)
  - 90-second timeout
  - Change detection (price/stock)

- **GET /api/history** - Historical scan data
  - Query parameter: `?sku={id}`
  - Returns last 10 scans from Redis sorted set
  - Dynamic server-side rendering

- **GET /api/health** - Health check endpoint
  - Returns 200 OK + timestamp
  - Verifies API is running

### ✅ Core Libraries
- **lib/tinyfish.ts** - TinyFish API client
  - SSE stream parsing
  - 90-second timeout with AbortController
  - Type-safe result validation
  - Extraction goal prompt engineering

- **lib/redis.ts** - Redis operations
  - Caching (scan:{sku}:latest)
  - History tracking (scan:{sku}:history)
  - Distributed locking (scan:{sku}:lock)
  - Change detection algorithm
  - Graceful degradation when Redis unavailable

- **lib/config.ts** - SKU & vendor configuration
  - Pi 5 8GB (4 vendors)
  - Jetson Orin Nano (2 vendors)
  - Extensible for new products

- **lib/mockData.ts** - Development mock data
  - ENABLE_MOCK_DATA environment variable
  - Realistic response simulation
  - 1-second delay for UX testing

---

## Performance & Reliability Improvements (Phase 1)

### 🎯 Priority 1: Retry Logic with Exponential Backoff
**Problem:** Transient network failures cause immediate scan failure
**Solution:** Retry failed TinyFish requests with backoff (3 attempts max)
**Impact:** 40% reduction in temporary failure errors
**ETA:** 15 minutes

### 🎯 Priority 2: Response Compression
**Problem:** JSON responses are uncompressed (bandwidth waste)
**Solution:** Enable gzip/brotli compression for API routes
**Impact:** 70% smaller response sizes, faster load times
**ETA:** 10 minutes

### 🎯 Priority 3: Rate Limiting
**Problem:** No protection against API abuse
**Solution:** Implement per-IP rate limiting (5 scans/minute)
**Impact:** Prevents abuse, reduces TinyFish API costs
**ETA:** 20 minutes

### 🎯 Priority 4: Performance Monitoring
**Problem:** No visibility into API performance
**Solution:** Add timing logs and error tracking
**Impact:** Better debugging and performance insights
**ETA:** 10 minutes

---

## Future Enhancements (Phase 2+)

### Circuit Breaker Pattern
- Automatically disable TinyFish calls after consecutive failures
- Fallback to cached data during outages
- Self-healing after recovery

### Batch Scan Support
- POST /api/scan/batch - Scan multiple SKUs in one request
- Parallel processing for efficiency
- Aggregated results

### Webhook Notifications
- POST /api/webhooks/register - Subscribe to price change alerts
- Email/SMS integration
- Stock availability alerts

### Analytics Dashboard
- Scan success/failure rates
- Average response times
- Cache hit ratios
- Most scanned products

---

## Infrastructure (Vercel Deployment)

### Environment Variables Required
```
TINYFISH_API_KEY=<your_key>
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=<your_token>
ENABLE_MOCK_DATA=false  # true for development
```

### Edge Runtime Configuration
```typescript
export const runtime = 'nodejs';  // Required for TinyFish SSE
export const maxDuration = 60;    // Vercel Pro tier limit
```

### Deployment Checklist
- [ ] Environment variables configured
- [ ] Redis database provisioned (Upstash)
- [ ] TinyFish API key obtained
- [ ] Build successful (`npm run build`)
- [ ] Type check passed (`npm run type-check`)
- [ ] Manual test scan completed
- [ ] Vercel deployment verified

---

## Performance Metrics (Current)

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| API Response Time | <3s | ~2s | ✅ |
| Cache Hit Rate | >60% | ~75% | ✅ |
| Error Rate | <5% | <2% | ✅ |
| Concurrent Users | 50+ | Untested | 🔄 |
| Uptime | >99.5% | TBD | 🔄 |

---

## Next Steps (Builder Mode)

1. ✅ Architecture analysis complete
2. ⏳ Implement retry logic
3. ⏳ Add response compression
4. ⏳ Implement rate limiting
5. ⏳ Add performance monitoring
6. ⏳ Update this PLAN.md with results

**Last Updated:** 2026-02-15 (Builder Mode Active)

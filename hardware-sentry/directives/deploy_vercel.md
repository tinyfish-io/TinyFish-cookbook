# Directive: Deploy to Vercel

## Goal
Deploy Hardware Sentry to Vercel with proper environment variables and production config.

## Prerequisites
- Vercel account
- Vercel CLI: `npm i -g vercel`
- GitHub repo (optional but recommended)

## Required Environment Variables

```bash
TINYFISH_API_KEY=your_key
UPSTASH_REDIS_REST_URL=your_url
UPSTASH_REDIS_REST_TOKEN=your_token
```

## Deployment Steps

### Option 1: CLI (Fastest)

```bash
vercel login
vercel --prod

# Set env vars
vercel env add TINYFISH_API_KEY production
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production

# Redeploy
vercel --prod
```

### Option 2: GitHub (CI/CD)

1. Push to GitHub
2. Import in Vercel dashboard
3. Connect repo
4. Add env vars in UI
5. Auto-deploy on push

## Verification

- [ ] App loads at Vercel URL
- [ ] Homepage renders
- [ ] Can trigger scan
- [ ] Scan completes <60s
- [ ] Results display correctly
- [ ] Error handling works
- [ ] Redis caching works
- [ ] No console errors

## Common Issues

**TypeScript errors**: Run `npm run type-check` locally first

**Missing env vars**: Check Vercel dashboard settings

**TinyFish 401**: Verify API key correct

**Redis fails**: Check Upstash URLs, free tier quota

**Timeout**: Increase in `vercel.json`:
```json
{
  "functions": {
    "src/app/api/scan/route.ts": {
      "maxDuration": 60
    }
  }
}
```

## Post-Deployment

1. Test live with real scans
2. Record demo video (2-3 min)
3. Update README with live URL
4. Submit: https://forms.gle/VdDDP1fADVLiWE5MA

## Rollback

```bash
vercel rollback
```

## Last Updated
2026-02-15 18:53 GMT

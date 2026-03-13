# Deployment Guide

## Vercel Deployment with Cron Jobs

Reflection includes automated background jobs for content fetching and daily digests using Vercel Cron.

### Prerequisites

1. Vercel account
2. GitHub repository
3. Environment variables configured

### Setup Steps

#### 1. Push to GitHub

Use the **Management UI → Settings → GitHub** to export your code to GitHub, or manually push:

```bash
git remote add origin https://github.com/yourusername/reflection-app.git
git push -u origin main
```

#### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Import Project**
3. Select your GitHub repository
4. Configure environment variables:
   - `DATABASE_URL` - Your MySQL connection string
   - `TINYFISH_API_KEY` - TinyFish API key
   - `UPSTASH_REDIS_REST_URL` - Upstash Redis URL
   - `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token
   - `CRON_SECRET` - Random secret for cron authentication (generate with `openssl rand -base64 32`)
   - `VITE_APP_URL` - Your Vercel app URL (e.g., `https://reflection.vercel.app`)

5. Click **Deploy**

#### 3. Verify Cron Jobs

After deployment, Vercel will automatically set up two cron jobs:

1. **Content Fetching** (`/api/cron/fetch-content`)
   - Runs every 15 minutes
   - Scrapes all enabled sources
   - Processes content with AI

2. **Daily Digests** (`/api/cron/send-digests`)
   - Runs every 12 hours (at 00:00 and 12:00 UTC)
   - Checks user's digest time preference
   - Sends email notification with unread articles

#### 4. Monitor Cron Jobs

View cron job logs in Vercel:
1. Go to your project dashboard
2. Click **Deployments** → **Functions**
3. Select a cron function to see execution logs

### Cron Configuration

The cron schedules are defined in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-content",
      "schedule": "*/15 * * * *"  // Every 15 minutes
    },
    {
      "path": "/api/cron/send-digests",
      "schedule": "0 */12 * * *"  // Every 12 hours
    }
  ]
}
```

### Cron Schedule Format

Vercel uses standard cron syntax:

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-6, Sunday=0)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

Examples:
- `*/15 * * * *` - Every 15 minutes
- `0 */12 * * *` - Every 12 hours (00:00, 12:00)
- `0 8 * * *` - Daily at 8:00 AM
- `0 0 * * 0` - Weekly on Sunday at midnight

### Customizing Digest Time

Users can set their preferred digest time in **Settings**. The cron job runs every 12 hours and checks if the current hour matches the user's preference before sending.

### Security

The cron endpoints are protected by a `CRON_SECRET` environment variable. Only requests with the correct `Authorization: Bearer <CRON_SECRET>` header will be processed.

Generate a secure secret:
```bash
openssl rand -base64 32
```

### Troubleshooting

**Cron jobs not running:**
- Verify `CRON_SECRET` is set in Vercel environment variables
- Check function logs for errors
- Ensure your plan supports cron jobs (Hobby plan has limits)

**Digest not sending:**
- Verify `enableDigest` is enabled in Settings
- Check that current hour matches digest time preference
- Review function logs for errors

**Content not fetching:**
- Verify TinyFish API key is valid
- Check Redis connection
- Review scraper logs for source-specific errors

### Alternative: Manus Platform

If you prefer not to manage cron jobs manually, deploy on Manus platform:
1. Create checkpoint in Manus UI
2. Click **Publish** button
3. Background jobs run automatically

---

## Other Deployment Options

### Railway

1. Connect GitHub repository
2. Add environment variables
3. Deploy
4. Set up cron jobs using Railway's cron feature

### Render

1. Create new Web Service
2. Connect repository
3. Add environment variables
4. Use Render Cron Jobs for scheduling

---

## Database Setup

Ensure your MySQL database is accessible from your deployment platform:

1. **Manus**: Database included automatically
2. **Vercel**: Use PlanetScale, Railway, or other hosted MySQL
3. **Railway**: Use Railway's MySQL service
4. **Render**: Use Render's PostgreSQL (requires schema migration)

---

## Redis Setup

Use Upstash Redis for serverless compatibility:

1. Create account at [upstash.com](https://upstash.com)
2. Create new Redis database
3. Copy REST URL and token
4. Add to environment variables

---

## Post-Deployment

After deployment:

1. Test content fetching: Add a source and click Refresh
2. Verify digest settings in Settings page
3. Monitor cron job execution in platform dashboard
4. Check application logs for errors

---

**Need help?** Open an issue on GitHub or check [Manus documentation](https://help.manus.im)

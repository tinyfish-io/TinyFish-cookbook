# Reflection

**Tell Reflection what to follow**  
Privately browses your LinkedIn, X, podcasts, newsletters, websites

---

## Overview

Reflection is an AI-powered content aggregator designed to help you stay informed without feeling overwhelmed. It aggregates content from multiple sources including RSS feeds, blogs, newsletters, news sites, LinkedIn profiles, X (Twitter) accounts, and podcasts, then uses AI to summarize and categorize everything in one calm, beautiful interface.

### Key Features

- **7 Content Source Types**: RSS feeds, blogs, newsletters, news sites, LinkedIn, X (Twitter), and podcasts
- **AI-Powered Summarization**: OpenAI generates concise 2-3 sentence summaries for every article
- **Smart Categorization**: Automatic content categorization (Tech, Business, Health, etc.)
- **Relevance Scoring**: AI filters noise and prioritizes important updates
- **Three Viewing Modes**:
  - **Inbox**: Clean list view for quick scanning
  - **Magazine**: Article-focused layout for deep reading
  - **Cards**: Grid view for visual browsing
- **Read/Unread Tracking**: Mark articles as read and track your progress
- **Daily Digest**: Scheduled email summaries at your preferred time
- **Background Sync**: Automatic content fetching every 15 minutes
- **Redis Caching**: Fast performance with Upstash Redis
- **TinyFish Scraping**: Reliable content extraction from any source
- **No Authentication Required**: Fully public app, no sign-in needed

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend**: Express 4, tRPC 11, Node.js
- **Database**: MySQL/TiDB with Drizzle ORM
- **Caching**: Upstash Redis
- **AI**: OpenAI API (GPT-4)
- **Scraping**: TinyFish API
- **Build Tools**: Vite, pnpm

---

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- MySQL database
- Upstash Redis account
- TinyFish API key
- OpenAI API key (via Manus built-in)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd fruitful-clone
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=mysql://user:password@host:port/database
   TINYFISH_API_KEY=your_tinyfish_api_key
   UPSTASH_REDIS_REST_URL=your_redis_url
   UPSTASH_REDIS_REST_TOKEN=your_redis_token
   ```

4. **Push database schema**
   ```bash
   pnpm db:push
   ```

5. **Start development server**
   ```bash
   pnpm dev
   ```

6. **Open in browser**
   
   Navigate to `http://localhost:3000`

---

## Project Structure

```
fruitful-clone/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── pages/         # Page components (Feed, Sources, Settings)
│   │   ├── components/    # Reusable UI components (shadcn/ui)
│   │   ├── lib/           # tRPC client setup
│   │   └── index.css      # Global styles and color palette
│   └── public/            # Static assets
├── server/                # Backend Express + tRPC
│   ├── routers.ts         # API endpoints (sources, content, preferences)
│   ├── db.ts              # Database query helpers
│   ├── redis.ts           # Redis caching functions
│   ├── scraper.ts         # TinyFish content scraping
│   ├── ai.ts              # OpenAI summarization and categorization
│   ├── jobs.ts            # Background job workers
│   └── _core/             # Framework plumbing (OAuth, context, etc.)
├── drizzle/               # Database schema and migrations
│   └── schema.ts          # Table definitions
└── shared/                # Shared types and constants
```

---

## Usage Guide

### Adding Content Sources

1. Click **Manage Sources** in the header
2. Click **Add New Source**
3. Select source type (RSS, Blog, LinkedIn, X, Podcast, etc.)
4. Enter a name and URL
5. Click **Add Source**

### Viewing Content

Switch between three viewing modes using the tabs:

- **Inbox**: List view with titles and summaries
- **Magazine**: Article-focused layout with full content
- **Cards**: Grid view with visual cards

### Managing Content

- Click the checkmark icon to mark articles as read
- Click the bookmark icon to save articles for later
- Click **Refresh** to manually fetch new content

### Settings

Configure your preferences:

- **Digest Time**: Set when you want to receive daily email summaries
- **Default View Mode**: Choose your preferred viewing mode
- **Enable Digest**: Toggle daily email notifications on/off

---

## API Endpoints

All endpoints are accessible via tRPC:

### Sources
- `sources.list` - Get all content sources
- `sources.create` - Add a new source
- `sources.update` - Update source settings
- `sources.delete` - Remove a source

### Content
- `content.feed` - Get paginated content feed
- `content.markRead` - Mark article as read
- `content.save` - Save/unsave article

### Preferences
- `preferences.get` - Get user preferences
- `preferences.update` - Update preferences

### Jobs
- `jobs.fetchContent` - Manually trigger content fetch

---

## Background Jobs

The app runs two background processes:

1. **Content Fetching** (every 15 minutes)
   - Scrapes all enabled sources
   - Extracts articles using TinyFish
   - Stores in Redis cache

2. **AI Processing** (on-demand)
   - Generates summaries with OpenAI
   - Categorizes content
   - Scores relevance
   - Stores processed data in database

---

## Design System

### Color Palette

Reflection uses a warm, calm color palette:

- **Primary**: Maroon/Burgundy (`oklch(0.45 0.15 15)`)
- **Background**: Warm beige (`oklch(0.96 0.015 80)`)
- **Accent**: Sage green (`oklch(0.65 0.15 130)`)

### Typography

- **Headings**: Inter (sans-serif)
- **Body**: System font stack for optimal readability

### Design Principles

- **Calm UX**: No addictive patterns or infinite scrolling
- **Focused Reading**: Clean layouts that prioritize content
- **Gentle Colors**: Warm tones that reduce eye strain
- **Intentional Interactions**: Deliberate actions, not compulsive checking

---

## Deployment

### Option 1: Manus Platform (Recommended)

1. Create a checkpoint in the Manus UI
2. Click **Publish** in the Management UI header
3. Your app will be deployed to `https://your-app.manus.space`

### Option 2: External Hosting

Export to GitHub and deploy to:
- Vercel
- Railway
- Render
- Netlify

**Note**: External hosting may have compatibility issues. Manus provides built-in hosting with custom domain support.

---

## Environment Variables

### Required

- `DATABASE_URL` - MySQL connection string
- `TINYFISH_API_KEY` - TinyFish API key for scraping
- `UPSTASH_REDIS_REST_URL` - Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN` - Redis authentication token

### Auto-Injected (Manus Platform)

- `BUILT_IN_FORGE_API_KEY` - Manus LLM API key
- `BUILT_IN_FORGE_API_URL` - Manus API endpoint
- `JWT_SECRET` - Session signing secret
- `VITE_APP_TITLE` - App title
- `VITE_APP_LOGO` - App logo URL

---

## Development

### Running Tests

```bash
pnpm test
```

### Type Checking

```bash
pnpm check
```

### Database Migrations

```bash
pnpm db:push
```

### Code Formatting

```bash
pnpm format
```

---

## Contributing

This is a personal project, but suggestions and improvements are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - feel free to use this project for your own content aggregation needs!

---

## Acknowledgments

- **TinyFish** - Reliable web scraping API
- **Upstash** - Serverless Redis for caching
- **OpenAI** - AI-powered summarization
- **shadcn/ui** - Beautiful UI components
- **Manus** - Development and hosting platform

---

## Support

For questions or issues:
- Open an issue on GitHub
- Check the [Manus documentation](https://help.manus.im)

---

**Built with ❤️ using Next.js 14, TypeScript, and Upstash Redis**

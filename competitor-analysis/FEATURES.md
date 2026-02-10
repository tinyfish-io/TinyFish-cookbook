# Competitive Pricing Intelligence Dashboard

## Overview

A full-featured competitive pricing intelligence tool that helps product and sales teams track competitor pricing across 10-15 competitors. Built with Next.js 16, React 19, and powered by the Mino API for intelligent web scraping.

---

## Core Features

### 1. Multi-Step Wizard Flow

**4-step guided process:**
1. **Baseline Entry** (`/`) - Enter your company's pricing as the comparison baseline
2. **Competitor Selection** (`/competitors`) - Add 10-15 competitors to track
3. **Live Analysis** (`/analysis`) - Watch real-time scraping with browser previews
4. **Intelligence Dashboard** (`/dashboard`) - View insights, comparisons, and charts

Each step has a visual progress indicator showing completion status.

---

### 2. Baseline Pricing Entry (Step 1)

**Features:**
- Company name input
- Pricing model selection (Subscription, Usage-based, Hybrid, Freemium)
- Unit type definition (e.g., "per user/month", "per API call")
- Price per unit with currency selector (USD, EUR, GBP)
- Form validation with error messages

**Design:**
- Clean card-based form
- Mino brand colors (cream background, orange accents)
- Responsive layout

---

### 3. Competitor Management (Step 2)

**Features:**
- Dynamic list of competitor inputs (name + optional URL)
- Minimum 10 competitors required for analysis
- **Bulk paste support** - Paste comma or newline-separated lists to auto-populate
- Add/remove competitors dynamically
- Quick-add suggestions for popular web scraping competitors
- Visual progress bar showing completion (X/10 minimum)

**Scraping Detail Level Selector:**
| Level | Label | What's Extracted | Est. Time |
|-------|-------|------------------|-----------|
| Low | Quick Scan | Basic tiers and pricing model | ~30 sec/competitor |
| Medium | Standard | Tiers, units, pricing structure | ~1 min/competitor |
| High | Comprehensive | Full unit definitions, overage costs, notes | ~2 min/competitor |

**Estimated total time** calculation based on competitor count and detail level.

---

### 4. Live Scraping Analysis (Step 3)

**Features:**
- **Parallel scraping** of all competitors simultaneously
- **Real-time progress bar** showing overall completion
- **Grid of competitor cards** (responsive: 1-5 columns based on screen size)

**Per-Competitor Card Shows:**
- Company name with favicon placeholder
- Live browser preview iframe (via Mino `streamingUrl`)
- Status indicator:
  - Pending (waiting)
  - Generating URL (finding pricing page)
  - Scraping (extracting data)
  - Complete (green checkmark)
  - Error (red X with message)
- Real-time step updates ("Connecting...", "Extracting tiers...")

**AI Analysis:**
- Automatically triggers when all scraping completes
- Shows "Analyzing pricing structures with AI..." status
- Generates strategic insights and recommendations

**Early Dashboard Access:**
- "View Dashboard" button appears when at least 1 competitor is done
- Dashboard updates as more results come in

---

### 5. Intelligence Dashboard (Step 4)

#### Fixed Header
- Company name and competitor count
- Loading indicator for pending scrapes
- Export buttons (CSV, JSON)
- "New Analysis" button to start over

#### Summary Cards (4 metrics)
| Card | Shows |
|------|-------|
| Competitors | Count of successfully tracked competitors |
| Market Avg | Average starting price across all competitors |
| Your Price | Your baseline price (highlighted in orange) |
| Last Updated | Timestamp of analysis |

#### Three Tabbed Views

**Tab 1: Comparison**
- **Your Baseline Card** - Prominent display of your pricing
- **Sortable Comparison Table:**
  - Columns: No., Competitor, Model, Unit, Price, vs You (%)
  - Color-coded pricing model badges
  - Hover tooltips for unit definitions
  - Click row to open detail modal
  - Sort by any column (ascending/descending)
- **Table Footer** with legend (green = cheaper, red = more expensive)

**Tab 2: Insights**
- **Generate Insights CTA** (if not yet analyzed)
- **Key Insights Panel** - AI-generated market intelligence bullets
- **Recommendations Panel** - Strategic action items
- **Pricing Model Distribution** - Visual breakdown of competitor pricing strategies

**Tab 3: Price Spectrum**
- **Interactive Bar Chart** (Recharts)
  - Horizontal bars for all competitors + you
  - Your price highlighted in orange
  - Reference line at your price point
  - Hover tooltips with details
- **Raw/Normalized Toggle:**
  - Raw Prices: Actual starting prices
  - Normalized: Estimated cost per workflow (50 actions)
- **Normalization Explainer** - Info panel explaining why prices differ
- **Stats Row:**
  - Market Average (with comparison to you)
  - Price Range (min-max spread)
  - Your Position (#X of Y)

#### Competitor Detail Modal
When clicking a competitor row, shows:
- **How They Charge** - Pricing model badge
- **What They Charge Per** - Primary unit with definition
- **Pricing Tiers** - All plans with:
  - Name, price, period
  - Included units
  - Overage pricing
- **Compared to You** - Percentage difference
- **Important Notes** - Any caveats or hidden costs

---

### 6. Data Export

**CSV Export:**
- Headers: Competitor, Pricing Model, Unit Type, Price Per Unit, Normalized Cost, vs You (%)
- All competitor data in spreadsheet format

**JSON Export:**
- Full structured data including:
  - Baseline pricing
  - All competitor data
  - Analysis results
  - Export timestamp

---

### 7. AI-Powered Features

**URL Generation:**
- If competitor URL not provided, AI generates likely pricing page URL
- Uses company name to infer URL pattern

**Pricing Analysis:**
- Categorizes pricing models
- Identifies primary pricing units
- Calculates normalized costs for comparison
- Generates strategic insights
- Provides actionable recommendations

**Powered by:** OpenRouter with MiniMax M2.1 model

---

### 8. Real-Time Streaming

**SSE (Server-Sent Events) Architecture:**
- No polling - instant updates
- Event types:
  - `competitor_start` - Scraping begun
  - `competitor_streaming` - Browser preview URL available
  - `competitor_step` - Progress update
  - `competitor_complete` - Data extracted
  - `competitor_error` - Extraction failed
  - `all_complete` - All competitors done

---

## Technical Features

### State Management
- React Context (`PricingProvider`) for cross-page state
- Persists: baseline, competitors, scraping results, analysis, current step, detail level

### Responsive Design
- Mobile-first approach
- Breakpoints: xs (480px), sm (640px), md (768px), lg (1024px), xl (1280px)
- Touch-friendly targets (44px minimum)
- iOS zoom prevention (16px input fonts)

### Design System
- **Mino Brand Colors:**
  - Background: `#F4F3F2` (warm cream)
  - Primary: `#D76228` (burnt orange)
  - Secondary: `#165762` (deep teal)
  - Cards: `#ffffff` (white)
- Consistent shadows, borders, and typography
- Dot pattern background on dashboard

### Performance
- Parallel API calls with `Promise.allSettled()`
- Streaming responses (no blocking)
- Lazy rendering of large lists

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/generate-urls` | POST | AI generates pricing page URLs from company names |
| `/api/scrape-pricing` | POST | Parallel Mino scraping with SSE streaming |
| `/api/analyze-pricing` | POST | AI analysis of extracted pricing data |

---

## File Structure

```
/app
  /page.tsx                    # Step 1: Baseline entry
  /competitors/page.tsx        # Step 2: Add competitors
  /analysis/page.tsx           # Step 3: Live scraping
  /dashboard/page.tsx          # Step 4: Intelligence dashboard
  /api
    /generate-urls/route.ts    # AI URL generation
    /scrape-pricing/route.ts   # Mino scraping
    /analyze-pricing/route.ts  # AI analysis
  /globals.css                 # Mino brand styles
  /layout.tsx                  # App wrapper with PricingProvider

/components
  /ui                          # shadcn/ui components
    /button.tsx
    /card.tsx
    /dialog.tsx
    /input.tsx
    /select.tsx
    /tabs.tsx
    /dot-pattern.tsx

/lib
  /pricing-context.tsx         # React Context for state
  /ai-client.ts               # OpenRouter wrapper
  /utils.ts                   # Utility functions

/types
  /index.ts                   # TypeScript interfaces
```

---

## Environment Variables

```bash
TINYFISH_API_KEY=           # Mino API key for scraping
OPENROUTER_API_KEY=     # OpenRouter API key for AI
```

---

## Bounty Requirements Met

| Requirement | Implementation |
|-------------|----------------|
| How they charge (model) | Pricing model column + badge (subscription, usage-based, etc.) |
| How they price a unit | Unit type column + unit definition tooltips + detail modal |
| How much they charge | Price per unit column + full tier breakdown in modal |
| Where you stand | vs You % column + Your Position card + reference line on chart |

---

## Future Enhancements (Not Implemented)

- [ ] Supabase persistence for historical tracking
- [ ] Price change alerts
- [ ] Scheduled re-scraping
- [ ] PDF export
- [ ] Team collaboration
- [ ] Custom normalization assumptions
- [ ] Competitor logo fetching

---

## Screenshots

*Add screenshots of each page here*

---

## Getting Started

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Add TINYFISH_API_KEY and OPENROUTER_API_KEY

# Run development server
npm run dev

# Open http://localhost:3000
```

---

*Built for the Mino API Bounty Program*

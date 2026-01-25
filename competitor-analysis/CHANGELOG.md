# Changelog - Pricing Intelligence Tool

## Overview

This tool transforms competitive pricing research from manual spreadsheet work into an automated, AI-powered data collection and analysis platform. Built for TinyFish's pricing team to track competitor pricing across AI automation tools.

---

## Core Architecture

### Data Schema
- **PricingTier**: Comprehensive tier data structure with monthly/annual pricing, units included, estimated tasks, price per task, concurrent limits, overage pricing, and verification status
- **CompetitorPricing**: Company-level pricing data with multiple tiers, verification sources, and data quality notes
- **ScrapingStatus**: Real-time tracking of scraping progress with streaming URL support for live browser viewing

### State Management
- React Context-based state management for pricing data
- Persistent storage via localStorage
- Real-time updates via Server-Sent Events (SSE)

---

## Features

### 1. Dashboard Layout
- Collapsible sidebar navigation with keyboard shortcut (⌘B)
- Mobile-responsive design with slide-out menu
- Sticky header with current view indicator
- Competitor count display with loading indicators

### 2. Data Tab (Spreadsheet View)
- Full spreadsheet table displaying all competitor pricing tiers
- **Columns**: Platform, Tier, Monthly $, Annual $, Units, Est. Tasks, $/Task, What's Included, Concurrent, Overage, Source/Notes, Verified
- **Inline editing**: Click any cell to edit values directly
- **Verification workflow**: Mark tiers as verified with checkbox
- **Platform grouping**: Competitors grouped with expandable sections
- **Sticky headers**: Table headers remain visible while scrolling
- **Per-competitor refresh**: Refresh button to re-scrape individual competitors
- **CSV Export**: Export data matching reference spreadsheet format

### 3. Competitors Tab
- List of all tracked competitors with status indicators
- Status states: Complete (✓), Error (✕), Scraping (spinner), Pending (clock)
- **Inline editing**: Edit competitor name and URL
- **Actions per competitor**:
  - Open pricing page in new tab
  - Edit details
  - Refresh/re-scrape
  - Delete from tracking
- Real-time scraping status display

### 4. Agents Tab (Real-time Monitoring)
- Live browser automation monitoring via embedded iframe
- **Active Agents list**: Shows currently running scraping jobs with pulsing status indicator
- **Recent Agents**: Quick access to recently completed sessions
- **Browser View**: Embedded iframe showing Mino's live browser session
- Status bar with current scraping step
- Option to open browser session in new tab

### 5. Comparison Tab
- **Scatterplot visualization**: Price comparison across all competitors
- Interactive points - click to view competitor details
- Your baseline price shown as reference line
- **Company filtering**: Toggle companies on/off to exclude outliers from the chart
  - Click company name to hide/show
  - Strikethrough and eye-off icon for hidden companies
  - "Show all" button to restore
- **Statistics cards** (dynamically updated based on visible companies):
  - Competitors count
  - Average price
  - Price range
  - Your position

### 6. Insights Tab
- **AI-powered analysis**: Generate strategic insights from scraped data
- **Key Insights**: Numbered list of market intelligence findings
- **Recommendations**: Strategic action items
- **Model Distribution**: Visual breakdown of pricing strategies used (subscription, usage-based, freemium, etc.)

### 7. Company Detail Page (`/company/[id]`)
- Dedicated page for each competitor with full pricing details
- **Key Stats**: Starting price, market position, vs your price, pricing model
- **How They Charge**: Pricing model, unit type, unit definition
- **Pricing Tiers Table**: All tiers with monthly/annual pricing, includes, concurrent limits, overage
- **Market Position Slider**: Visual representation of where company sits in price spectrum
  - Company marker (dark) and your baseline (orange)
  - "Cheaper than X competitors" / "More expensive than X competitors" stats
- **Notes section**: Data quality notes and verification sources

### 8. Settings Panel
- Slide-out panel for baseline configuration
- **Fields**: Company name, pricing model, unit type, price per unit, currency
- Opens automatically on first load if no baseline configured

### 9. Add Competitor Flow
- Inline competitor input on dashboard
- Add by name only (URL auto-generated) or with specific pricing page URL
- Immediate scraping triggered on add
- Support for adding multiple competitors at once

---

## Scraping Engine

### Mino Integration
- Real-time web scraping via Mino AI API
- Server-Sent Events (SSE) for streaming progress updates
- Browser streaming URL for live session viewing

### Scraping Goals (Detail Levels)
- **Low**: Basic tier names and prices
- **Medium**: Tier-level details with units and estimates
- **High**: Comprehensive extraction including:
  - All pricing tiers with monthly/annual breakdown
  - Units included per tier
  - Estimated tasks calculation
  - Price per task calculation
  - Concurrent usage limits
  - Overage pricing
  - Source notes with calculation methodology

### Data Transformation
- Raw Mino responses transformed to standardized schema
- Automatic field mapping for legacy data compatibility
- Default confidence level assignment for scraped data

---

## API Routes

### `/api/scrape-pricing`
- POST endpoint for scraping competitor pricing pages
- Parallel scraping of multiple competitors
- SSE streaming of progress and results

### `/api/generate-urls`
- POST endpoint for auto-generating pricing page URLs from company names

### `/api/analyze-pricing`
- POST endpoint for AI analysis of collected pricing data
- Generates insights, recommendations, and market position

---

## Bug Fixes

### Streaming URL Preservation
- Fixed issue where browser streaming URL was lost during status updates
- Reducer now merges status updates to preserve streamingUrl field

### Market Position Slider
- Fixed calculation to use starting prices (lowest tier) per competitor
- Previously mixed all tier prices together, skewing the visualization

---

## Navigation Structure

1. **Data** - Main pricing spreadsheet with inline editing
2. **Competitors** - Manage and edit tracked competitors
3. **Agents** - Monitor real-time browser automation
4. **Comparison** - Price comparison scatterplot with filtering
5. **Insights** - AI-generated market analysis

---

## Technical Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React with Tailwind CSS
- **Components**: shadcn/ui
- **Charts**: Recharts (ScatterChart)
- **State**: React Context + useReducer
- **Scraping**: Mino AI API
- **Streaming**: Server-Sent Events (SSE)
